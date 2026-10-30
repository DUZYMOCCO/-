// 追従／見回しの計算（three を使わない純粋関数。テストから直接読める）。

// 見回しで部隊の中心から離れられる距離（m）。超えると柔らかく押し戻す。
export const LOOK_RADIUS = 70;
// ドラッグ中に許す「はみ出し」の上限（半径の倍率）。
export const LOOK_OVERSHOOT = 1.15;
// 押し戻しの速さ（1/秒）。
export const LOOK_PULLBACK = 5;
// 二度押しとみなす間隔（ms）。
export const DOUBLE_TAP_MS = 320;

function isSquad(state, actor) {
  if (!actor) return false;
  if (Array.isArray(state.squadIds)) return state.squadIds.includes(actor.id);
  return actor.faction === 'player';
}

// 追従する相手: 選んでいる部隊員（死亡していない）がいればその人、いなければ操作キャラ。
export function pickFollowId(state, selectedId) {
  if (!state || !Array.isArray(state.actors)) return null;
  if (selectedId !== null && selectedId !== undefined) {
    for (const a of state.actors) {
      if (a.id === selectedId) {
        if (isSquad(state, a) && a.state !== 'dead') return a.id;
        break;
      }
    }
  }
  return state.playerId === undefined ? null : state.playerId;
}

// 部隊の中心（生きている部隊員の平均）。positions は [{x,z}]。空なら null。
export function squadCentre(positions) {
  let n = 0;
  let sx = 0;
  let sz = 0;
  for (const p of positions || []) {
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.z)) continue;
    sx += p.x;
    sz += p.z;
    n += 1;
  }
  if (n === 0) return null;
  return { x: sx / n, z: sz / n };
}

// 見回しの綱。注視点 (x,z) を中心 c から radius 以内へ。
// dragging 中は radius*LOOK_OVERSHOOT で止める（ゴムのような手応え）。
// 離している時は radius の縁へ指数的に戻す。戻り値は新しい {x,z}。
export function leash(x, z, c, dt, dragging, radius) {
  const r = Number.isFinite(radius) ? radius : LOOK_RADIUS;
  if (!c) return { x, z };
  const dx = x - c.x;
  const dz = z - c.z;
  const d = Math.hypot(dx, dz);
  if (d <= r || d === 0) return { x, z };
  let nd = d;
  if (dragging) {
    nd = Math.min(d, r * LOOK_OVERSHOOT);
  } else {
    const k = 1 - Math.exp(-Math.max(0, Number(dt) || 0) * LOOK_PULLBACK);
    nd = d - (d - r) * k;
    if (nd - r < 0.01) nd = r;
  }
  return { x: c.x + (dx / d) * nd, z: c.z + (dz / d) * nd };
}

// 抵抗つきのドラッグ: 半径の外では動きを弱める（1→0.25）。
export function dragResistance(x, z, c, radius) {
  const r = Number.isFinite(radius) ? radius : LOOK_RADIUS;
  if (!c) return 1;
  const d = Math.hypot(x - c.x, z - c.z);
  if (d <= r) return 1;
  return Math.max(0.25, 1 - (d - r) / (r * (LOOK_OVERSHOOT - 1)) * 0.75);
}

// キー入力から画面上の移動方向（x: 右+, y: 下+）。keys は押されているキー名の Set。
export function keyPanVector(keys) {
  let x = 0;
  let y = 0;
  if (!keys) return { x, y };
  if (keys.has('a') || keys.has('arrowleft')) x -= 1;
  if (keys.has('d') || keys.has('arrowright')) x += 1;
  if (keys.has('w') || keys.has('arrowup')) y -= 1;
  if (keys.has('s') || keys.has('arrowdown')) y += 1;
  if (x !== 0 && y !== 0) {
    x *= Math.SQRT1_2;
    y *= Math.SQRT1_2;
  }
  return { x, y };
}

// 画面端スクロール（マウスのみ）。端から margin px 以内で -1〜1。
export function edgePanVector(px, py, w, h, margin) {
  const m = margin || 14;
  let x = 0;
  let y = 0;
  if (!(w > 0) || !(h > 0) || !Number.isFinite(px) || !Number.isFinite(py)) return { x, y };
  if (px < 0 || py < 0 || px > w || py > h) return { x, y };
  if (px < m) x = -1;
  else if (px > w - m) x = 1;
  if (py < m) y = -1;
  else if (py > h - m) y = 1;
  return { x, y };
}

// 一回押し／二度押しの判定。tap(id, nowMs) が 'double' か 'single' を返す。
export function createTapDetector(windowMs) {
  const win = windowMs || DOUBLE_TAP_MS;
  let lastId = null;
  let lastT = -Infinity;
  return {
    tap(id, now) {
      const t = Number(now) || 0;
      if (id === lastId && t - lastT <= win) {
        lastId = null;
        lastT = -Infinity;
        return 'double';
      }
      lastId = id;
      lastT = t;
      return 'single';
    },
  };
}

// 顔カード用: 部隊員の血（全部位HPの合計比 0..1）と状態の短い文字。
export function memberCard(actor, partKeys) {
  let hp = 0;
  let max = 0;
  const keys = partKeys || (actor && actor.parts ? Object.keys(actor.parts) : []);
  for (const k of keys) {
    const p = actor && actor.parts ? actor.parts[k] : null;
    if (!p) continue;
    hp += Math.max(0, p.hp);
    max += p.max;
  }
  const ratio = max > 0 ? Math.max(0, Math.min(1, hp / max)) : 0;
  let tag = '';
  let kind = 'ok';
  if (actor.state === 'dead') {
    tag = '死亡';
    kind = 'dead';
  } else if (actor.bound) {
    tag = actor.meal ? '食われ中' : '縛られ';
    kind = 'dead';
  } else if (actor.carriedBy !== null && actor.carriedBy !== undefined) {
    tag = '担がれ';
    kind = 'down';
  } else if (actor.state === 'down' || actor.state === 'getup') {
    tag = '気絶';
    kind = 'down';
  } else if (typeof actor.hunger === 'number' && actor.hunger < 25) {
    tag = '空腹';
    kind = 'warn';
  }
  if (!tag && typeof actor.bleed === 'number' && actor.bleed > 0.3) {
    tag = '出血';
    kind = 'warn';
  }
  const blood = typeof actor.blood === 'number' ? Math.max(0, Math.round(actor.blood)) : 100;
  return { ratio, tag, kind, blood };
}
