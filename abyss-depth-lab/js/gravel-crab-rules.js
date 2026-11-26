/**
 * ABYSS DIVE — 礫鎧ガニ A/B/C: 隔離プレイアブル候補の共有ルール（DOM 非依存）
 *
 * 承認済みの全身原画（A=natural_710342 / B=final_02 / C=review_01）から
 * tools/split_gravel_crab_abc.py で解剖分割したパーツ（甲羅+眼 / 近側の太い鋏 /
 * 奥側の鋏 / 脚）を、共有リグで組み立てて動かす。
 *
 * - 別種は「色替え」ではなく、体格（幅・高さ）・歩行速度/歩調・鋏の間合い/威力で識別する。
 * - 横歩きは足裏を床に接地させる（e.y は床と脚の最下点で決定。脚は持ち上げ方向のみ）。
 * - 「警戒」で停止し鋏を構え、「近距離攻撃」= 見えている近側の鋏の一振りだけが当たる。
 * - 体の接触は無害（上・後ろを通過できる）。撃破は必須にしない。
 *
 * 描画（game.js の drawGravelCrab）と当たり（本ファイル）は同じ姿勢式・同じ関節座標を共有する。
 */
import { GRAVEL_CRAB_PARTS } from './gravel-crab-parts.js?v=2';

/* 種ごとの生態・体格・鋏（動き・体格・鋏で識別）。 */
export const GRAVEL_CRAB_SPECIES = Object.freeze({
  a: Object.freeze({          /* A: 丸いカニ。背が高く、歩みは遅い。単一の太い鋏の間合いが長い。 */
    name: '礫鎧ガニ・乙（丸）', bodyW: 980,
    walkSpeed: 22, stepHz: 1.7, patrol: 250, stepAmp: 7,
    detectR: 720, attackR: 440, tell: 0.95, swing: 0.38, recover: 1.05, idle: 1.5,
    clawWind: 0.55, clawSwing: -0.95, clawSpread: 0.20, clawGuard: 0.42,
    alertLift: 12, clawDmg: 18, hp: 240, armor: 2, clawR: 44, score: 0,
    guardChip: 0.03, chipLoose: 0.12, jointMul: 0.80, openMul: 1.00, guardHold: 1.3,
    pursueR: 620, pursueMax: 420, stalkSpeed: 30, stalkTime: 1.6,
    /* A は口元の泡（バブルショット）。近接の外〜視界内の帯でだけ、長い間隔で短い斉射。 */
    ranged: 'bubble', rangedMin: 540, rangedMax: 620, rangedCd: 3.2, chargeTime: 0.70,
    mouth: [0.20, 0.30],
    tint: '#c98a4a' }),
  b: Object.freeze({          /* B: 低く幅広い。速く横歩きし、両鋏を広く構える。 */
    name: '礫鎧ガニ・甲（幅広）', bodyW: 1180,
    walkSpeed: 42, stepHz: 2.8, patrol: 340, stepAmp: 6,
    detectR: 840, attackR: 470, tell: 0.78, swing: 0.32, recover: 0.88, idle: 1.1,
    clawWind: 0.62, clawSwing: -1.05, clawSpread: 0.30, clawGuard: 0.50,
    alertLift: 8, clawDmg: 14, hp: 200, armor: 1, clawR: 40, score: 0,
    guardChip: 0.03, chipLoose: 0.13, jointMul: 0.82, openMul: 1.00, guardHold: 1.1,
    pursueR: 700, pursueMax: 520, stalkSpeed: 52, stalkTime: 2.0,
    /* B は大鋏で岩を拾って投げる（岩石投げ）。弧を描く 1 個。 */
    ranged: 'rock', rangedMin: 560, rangedMax: 640, rangedCd: 3.8, chargeTime: 0.85,
    mouth: [0.20, 0.30],
    tint: '#d4623a' }),
  c: Object.freeze({          /* C: 青灰の異形鎧。重く、硬く、間合いが最も長い。 */
    name: '礫鎧ガニ・丙（異形鎧）', bodyW: 940,
    walkSpeed: 16, stepHz: 1.4, patrol: 200, stepAmp: 5,
    detectR: 820, attackR: 530, tell: 1.15, swing: 0.44, recover: 1.25, idle: 1.8,
    clawWind: 0.48, clawSwing: -0.85, clawSpread: 0.16, clawGuard: 0.34,
    alertLift: 14, clawDmg: 27, hp: 420, armor: 6, clawR: 46, score: 0,
    guardChip: 0.02, chipLoose: 0.08, jointMul: 0.74, openMul: 0.92, guardHold: 1.6,
    pursueR: 660, pursueMax: 380, stalkSpeed: 24, stalkTime: 1.4,
    /* C は役割を分ける: 遠距離は持たず、大鋏と短い追跡（既存）のまま。 */
    ranged: null, rangedMin: 0, rangedMax: 0, rangedCd: 0, chargeTime: 0,
    mouth: [0.20, 0.30],
    tint: '#7f8fa8' }),
});
export const GRAVEL_CRAB_KEYS = Object.freeze(['a', 'b', 'c']);

/**
 * 遠距離攻撃の弾（架空のゲーム内攻撃）。**追尾なし・短い斉射・長いクールダウン**。
 *   bubble: ゆっくり大きな泡。まっすぐ。寿命・地形で破裂。
 *   rock  : 弧を描く岩 1 個。初速決定後は追尾しない。床/壁で止まり砕ける。
 * 連続弾幕にしない（count は短い斉射、gap も短い）。岩越しに当たらない（game 側の遮蔽で発射自体を止める）。
 */
export const GRAVEL_CRAB_SHOTS = Object.freeze({
  bubble: Object.freeze({ r:27, speed:150, life:3.0, dmg:12, gravity:0, count:3, gap:0.16, spread:0.11 }),
  rock:   Object.freeze({ r:30, speed:520, life:4.5, dmg:22, gravity:900, count:1, gap:0,   spread:0 }),
});

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const d2 = (ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay; return dx * dx + dy * dy; };

/** 線分(ax,ay)-(bx,by) と点(px,py) の距離の二乗。 */
function segDist2(ax, ay, bx, by, px, py) {
  const vx = bx - ax, vy = by - ay;
  const l2 = vx * vx + vy * vy;
  let t = l2 > 0 ? ((px - ax) * vx + (py - ay) * vy) / l2 : 0;
  t = clamp01(t);
  return d2(ax + vx * t, ay + vy * t, px, py);
}

/* 種ごとの幾何（パーツ寸法・体原点・スケール・足元）。純粋・キャッシュ。 */
const _geomCache = {};
export function gravelCrabGeom(species) {
  if (_geomCache[species]) return _geomCache[species];
  const sp = GRAVEL_CRAB_SPECIES[species];
  const m = GRAVEL_CRAB_PARTS[species];
  if (!sp || !m) return null;
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  for (const name in m.parts) {
    const p = m.parts[name];
    minX = Math.min(minX, p.offset[0]); maxX = Math.max(maxX, p.offset[0] + p.w);
    minY = Math.min(minY, p.offset[1]); maxY = Math.max(maxY, p.offset[1] + p.h);
  }
  const bboxW = maxX - minX, bboxH = maxY - minY;
  const scale = sp.bodyW / bboxW;
  const g = {
    species, parts: m.parts, origin: m.origin, scale, bboxW, bboxH,
    bodyH: bboxH * scale, feetY: maxY * scale,          /* 体原点から脚の最下点まで */
    bodyR: sp.bodyW * 0.5,
  };
  _geomCache[species] = g;
  return g;
}

/** 新しい礫鎧ガニを作る。y は床（floorY）基準で足裏が接地する高さに置く。 */
export function createGravelCrab(species, x, floorY, opts = {}) {
  const sp = GRAVEL_CRAB_SPECIES[species];
  const gm = gravelCrabGeom(species);
  if (!sp || !gm) throw new Error('unknown gravel crab species: ' + species);
  const o = opts || {};
  const dir = (o.dir === 1 || o.dir === -1) ? o.dir : -1;
  return {
    kind: 'gravel_crab', species,
    x, y: floorY - gm.feetY, floorY,
    homeX: x,
    dir,
    state: 'patrol', st: 0, legPhase: 0,
    guardT: 0,
    rangedT: 0, volley: 0, volleyT: 0, chargeT: 0, aimX: 0, aimY: 0,
    hp: (o.hp != null) ? o.hp : sp.hp, maxHp: (o.hp != null) ? o.hp : sp.hp,
    dead: false, deadT: 0, swingHit: false, t: 0, flash: 0,
    feetY: gm.feetY, bodyW: sp.bodyW, bodyH: gm.bodyH,
    r: gm.bodyR,
  };
}

/** 種ごとの共通設定（テスト・UI 用）。 */
export function gravelCrabSpec(species) { return GRAVEL_CRAB_SPECIES[species] || null; }

/**
 * 1 フレーム進める。返り値はイベント配列（音・予告用）。
 * env（省略可・純粋性のため注入）:
 *   env.losBlocked(x0,y0,x1,y1) … 岩越しの発射を止める（遮蔽があれば true）
 *   env.onScreen(e)             … 画面外からの狙撃を止める
 */
export function stepGravelCrab(e, dt, player, env) {
  const ev = [];
  const sp = GRAVEL_CRAB_SPECIES[e.species];
  const gm = gravelCrabGeom(e.species);
  e.t += dt;
  if (e.flash > 0) e.flash -= dt;
  if (e.guardT > 0) e.guardT = Math.max(0, e.guardT - dt);
  if (e.rangedT > 0) e.rangedT = Math.max(0, e.rangedT - dt);
  if (e.dead) { e.deadT = Math.max(0, (e.deadT || 0) - dt); e.legPhase = (e.legPhase + dt * sp.stepHz) % 1; return ev; }
  /* 検証用: 立ち姿（中立/警戒）を固定して撮るための凍結（通常プレイでは使わない）。 */
  if (e.frozen) { e.legPhase = (e.legPhase + dt * sp.stepHz) % 1; e.y = e.floorY - gm.feetY; return ev; }
  const p = player;
  const dx = p ? (p.x - e.x) : Infinity;
  const dist = p ? Math.hypot(dx, p.y - e.y) : Infinity;
  e.legPhase = (e.legPhase + dt * sp.stepHz) % 1;

  switch (e.state) {
    case 'patrol': {
      /* 横歩き（足裏は床に接地。脚は持ち上げ方向のみ動く）。 */
      e.x += e.dir * sp.walkSpeed * dt;
      if (((e.x - e.homeX) * e.dir) > sp.patrol) e.dir *= -1;
      if (p && p.alive && dist < sp.detectR) { e.state = 'alert'; e.st = sp.idle; e.dir = (dx >= 0) ? 1 : -1; ev.push('alert'); }
      break;
    }
    case 'alert': {
      if (p) e.dir = (dx >= 0) ? 1 : -1;
      e.st -= dt;
      if (e.st <= 0) {
        const inFront = p && ((p.x - e.x) * e.dir) > -sp.bodyW * 0.15;
        if (p && p.alive && dist < sp.attackR && inFront) { e.state = 'wind'; e.st = sp.tell; ev.push('tell'); }
        else if (!p || !p.alive || dist > sp.detectR * 1.18) { e.state = 'return'; ev.push('calm'); }
        /* 近接の外〜視界内の帯に、遮蔽なく、画面内にいるときだけ遠距離攻撃（長い間隔）。 */
        else if (sp.ranged && e.rangedT <= 0 && dist >= sp.rangedMin && dist <= sp.rangedMax && inFront
                 && rangedClear(e, p, env)) {
          const spec = GRAVEL_CRAB_SHOTS[sp.ranged];
          e.state = 'charge'; e.st = sp.chargeTime; e.chargeT = 0;
          e.volley = spec.count; e.volleyT = 0;
          e.aimX = p.x; e.aimY = p.y;      /* 照準は開始時に固定＝予告の間に動けば避けられる */
          ev.push('chargeStart');
        }
        /* 遠い（間合い外）が視界内なら、数歩だけ詰める（homeX から離れすぎない）。 */
        else if (dist <= sp.pursueR && Math.abs(e.x - e.homeX) < sp.pursueMax) { e.state = 'stalk'; e.st = sp.stalkTime; ev.push('stalk'); }
        else { e.st = sp.idle; }
      }
      break;
    }
    case 'charge': {
      /* 無害な予備動作（口元に泡が溜まる／大鋏で岩を拾う）。当たり判定は出さない。 */
      e.chargeT += dt;
      e.st -= dt;
      if (e.st <= 0) { e.state = 'release'; e.volleyT = 0; ev.push('release'); }
      break;
    }
    case 'release': {
      /* 短い斉射（bubble=3 / rock=1）。1 発ずつ gap ごと。連続弾幕にしない。 */
      const spec = GRAVEL_CRAB_SHOTS[sp.ranged];
      e.volleyT -= dt;
      if (e.volley > 0 && e.volleyT <= 0) {
        const shot = gravelCrabShot(e, e.volley);
        if (shot) ev.push({ t: 'shot', s: shot });
        e.volley -= 1;
        e.volleyT = spec.gap;
      }
      if (e.volley <= 0) {
        e.state = 'alert'; e.st = sp.idle; e.rangedT = sp.rangedCd; ev.push('rangedDone');
      }
      break;
    }
    case 'stalk': {
      /* 短い追跡: 数歩だけ詰める。pursueMax を超えない＝退路を残す。時間切れで戻る。 */
      if (p) e.dir = (dx >= 0) ? 1 : -1;
      e.st -= dt;
      if (Math.abs(e.x + e.dir - e.homeX) <= sp.pursueMax) e.x += e.dir * sp.stalkSpeed * dt;
      if (p && p.alive && dist <= sp.attackR) { e.state = 'alert'; e.st = sp.idle; }
      else if (!p || !p.alive || dist > sp.detectR * 1.18) { e.state = 'return'; ev.push('calm'); }
      else if (e.st <= 0) { e.state = 'return'; }
      break;
    }
    case 'return': {
      /* 定位置（homeX）へ戻る。追跡を止める＝退路を確保。 */
      const hd = e.homeX - e.x;
      if (p && p.alive && dist < sp.detectR * 0.6) { e.state = 'alert'; e.st = sp.idle; break; }
      if (Math.abs(hd) < 24) { e.state = 'patrol'; break; }
      e.dir = (hd >= 0) ? 1 : -1;
      e.x += e.dir * sp.walkSpeed * dt;
      break;
    }
    case 'wind':
      e.st -= dt;
      if (e.st <= 0) { e.state = 'swing'; e.st = sp.swing; e.swingHit = false; ev.push('swingStart'); }
      break;
    case 'swing':
      e.st -= dt;
      if (e.st <= 0) { e.state = 'recover'; e.st = sp.recover; ev.push('swingEnd'); }
      break;
    case 'recover':
      e.st -= dt;
      if (e.st <= 0) { e.state = 'alert'; e.st = sp.idle; }
      break;
  }
  /* 床に張り付く（泳がせない）。体の接触では傷つかない。 */
  e.y = e.floorY - gm.feetY;
  e.vx = 0; e.vy = 0;
  return ev;
}

/* 遠距離攻撃を始めてよいか（遮蔽・画面内）。env 省略時は「遮蔽なし・画面内」＝テスト用。 */
function rangedClear(e, p, env) {
  if (!env) return true;
  const m = gravelCrabShotOrigin(e);
  if (env.losBlocked && env.losBlocked(m.x, m.y, p.x, p.y)) return false;
  if (env.onScreen && !env.onScreen(e)) return false;
  return true;
}

/** 発射物の起点（世界座標）。bubble=口元 / rock=近側の鋏先。 */
export function gravelCrabShotOrigin(e) {
  const sp = GRAVEL_CRAB_SPECIES[e.species];
  const gm = gravelCrabGeom(e.species);
  const dir = (e.dir < 0) ? -1 : 1;
  if (sp.ranged === 'rock') { const c = gravelCrabClaw(e); return { x: c.tip.x, y: c.tip.y }; }
  return { x: e.x + dir * sp.mouth[0] * sp.bodyW, y: e.y + sp.mouth[1] * gm.bodyH };
}

/**
 * 発射物 1 個の仕様。**初速は発射時に固定＝以後の追尾なし**。
 *   照準は charge 開始時に固定した aim（予告の間に動けば避けられる）。
 *   rock は放物線（重力 g）。bubble は直進（g=0）。
 */
export function gravelCrabShot(e, index = 0) {
  const sp = GRAVEL_CRAB_SPECIES[e.species];
  if (!sp || !sp.ranged) return null;
  const spec = GRAVEL_CRAB_SHOTS[sp.ranged];
  const o = gravelCrabShotOrigin(e);
  const dir = (e.dir < 0) ? -1 : 1;
  const tx = (e.aimX != null && e.aimX !== 0) ? e.aimX : (e.x + dir * 600);
  const ty = (e.aimY != null && e.aimY !== 0) ? e.aimY : e.y;
  if (sp.ranged === 'bubble') {
    const base = Math.atan2(ty - o.y, tx - o.x);
    const a = base + (index - (spec.count - 1) / 2) * spec.spread;   /* 短い斉射は少し上下に散らす */
    return { kind: 'bubble', x: o.x, y: o.y, vx: Math.cos(a) * spec.speed, vy: Math.sin(a) * spec.speed,
             r: spec.r, dmg: spec.dmg, life: spec.life, gravity: 0, a };
  }
  /* rock: 弧を描いて照準点の高さに落ちる初速（固定）。 */
  const g = spec.gravity;
  const dxr = tx - o.x;
  const tf = Math.min(2.2, Math.max(0.45, Math.abs(dxr) / spec.speed));
  const vx = dxr / tf;
  const vy = (ty - o.y - 0.5 * g * tf * tf) / tf;
  return { kind: 'rock', x: o.x, y: o.y, vx, vy, r: spec.r, dmg: spec.dmg, life: spec.life,
           gravity: g, a: Math.atan2(vy, vx) };
}

/**
 * 遠距離弾の 1 フレーム（純粋）。返り値はイベント（'burst'/'shatter'/'expire'/'settled'）。
 *   bubble: 寿命切れ か 地形接触 で破裂して消える。
 *   rock  : 地形接触 で止まり、明瞭に砕けて消える（shatter → settled）。
 * 追尾はしない（vx/vy は発射時のまま。重力だけ足す）。
 */
export function stepGravelShot(s, dt, env) {
  const ev = [];
  if (s.dead) return ev;
  if (s.stopped) {
    s.stopT = (s.stopT || 0) - dt;
    if (s.stopT <= 0) { s.dead = true; ev.push('settled'); }
    return ev;
  }
  s.life -= dt;
  if (s.life <= 0) { s.dead = true; ev.push('expire'); return ev; }
  s.vy = (s.vy || 0) + (s.gravity || 0) * dt;
  s.prevX = s.x; s.prevY = s.y;
  s.x += s.vx * dt; s.y += s.vy * dt;
  if (s.y > s.floorY) { s.y = s.floorY; }
  const blocked = env && env.blocked ? env.blocked : null;
  let hit = false;
  if (blocked) {
    /* 速い弾のトンネルを避けるため中間点も見る。 */
    const mxp = (s.prevX + s.x) * 0.5, myp = (s.prevY + s.y) * 0.5;
    hit = blocked(s.x, s.y, s.r) || blocked(mxp, myp, s.r);
  }
  if (hit || (s.floorY != null && s.y >= s.floorY - 0.001)) {
    if (s.kind === 'rock') { s.stopped = true; s.stopT = 0.30; s.vx = 0; s.vy = 0; ev.push('shatter'); }
    else { s.dead = true; ev.push('burst'); }
  }
  return ev;
}

/** 姿勢（パーツごとの局所変換。dx/dy は原画 px、rot は rad）。描画と当たりが共有する。 */
export function gravelCrabPose(e) {
  const sp = GRAVEL_CRAB_SPECIES[e.species];
  const P = {
    carapace: { dx: 0, dy: 0, rot: 0 },
    clawNear: { dx: 0, dy: 0, rot: 0 },
    clawFar:  { dx: 0, dy: 0, rot: 0 },
    legs:     { dx: 0, dy: 0, rot: 0 },
  };
  if (e.dead) {
    P.carapace.dy = 10; P.legs.dy = 6; P.clawNear.rot = sp.clawSwing * 0.5;
    return P;
  }
  if (e.state === 'patrol') {
    const s = Math.sin((e.legPhase || 0) * Math.PI * 2);
    P.legs.dy = -Math.abs(s) * sp.stepAmp;      /* 持ち上げ方向のみ＝足裏は床から離れない */
    P.legs.rot = s * 0.03;
    P.carapace.dy = Math.abs(Math.sin((e.legPhase || 0) * Math.PI * 4)) * 2.0;
  } else {
    const moving = (e.state === 'stalk' || e.state === 'return');
    const s = Math.sin((e.legPhase || 0) * Math.PI * 2);
    P.legs.dy = moving ? -Math.abs(s) * sp.stepAmp : -2;
    P.legs.rot = moving ? s * 0.03 : 0;
    P.carapace.dy = -sp.alertLift;
    /* 撃たれて正面をかばっている間は、鋏を高く前に構える（guard）。 */
    P.clawNear.rot = (e.guardT > 0) ? sp.clawGuard : sp.clawSpread;
    P.clawFar.rot = -sp.clawSpread * 0.55;
  }
  if (e.state === 'wind')      { const t = 1 - clamp01(e.st / sp.tell);    P.clawNear.rot = lerp(sp.clawSpread, sp.clawWind, t); }
  else if (e.state === 'swing'){ const t = 1 - clamp01(e.st / sp.swing);   P.clawNear.rot = lerp(sp.clawWind, sp.clawSwing, t); }
  else if (e.state === 'recover') { const t = 1 - clamp01(e.st / sp.recover); P.clawNear.rot = lerp(sp.clawSwing, sp.clawSpread, t); }
  return P;
}

/** 近側の鋏の関節（世界座標）。描画と当たりが同じ式を共有する。 */
export function gravelCrabClaw(e) {
  const sp = GRAVEL_CRAB_SPECIES[e.species];
  const gm = gravelCrabGeom(e.species);
  const m = gm.parts.clawNear;
  const pose = e.dead ? { clawNear: { rot: sp.clawSwing * 0.5 } } : gravelCrabPose(e);
  const rot = pose.clawNear.rot;
  /* 原画は正面（手前）向き。近い側の大鋏は画像の左にあるので、
     dir > 0（プレイヤーが右）のときだけ左右反転する＝描画と同じ S(flip)。 */
  const flip = (e.dir > 0) ? -1 : 1;
  /* 局所（原画 px）: ピボット位置と、そこから鋏先までのベクトル。 */
  const px = m.offset[0] + m.pivot[0], py = m.offset[1] + m.pivot[1];
  const tipX = m.offset[0] + m.pivot[0], tipY = m.offset[1] + m.h * 0.90;
  const rvx = (tipX - px) * gm.scale, rvy = (tipY - py) * gm.scale;
  const c = Math.cos(rot), s = Math.sin(rot);
  /* R(rot) を局所（flip 未適用）で掛け、最後に S(flip) で左右反転する（描画と同じ順序）。 */
  const rotvx = rvx * c - rvy * s, rotvy = rvx * s + rvy * c;
  const shx = e.x + flip * px * gm.scale, shy = e.y + py * gm.scale;
  const tx = shx + flip * rotvx, ty = shy + rotvy;
  return {
    shoulder: { x: shx, y: shy }, tip: { x: tx, y: ty },
    r: sp.clawR, active: e.state === 'swing', lifted: e.state === 'wind' || e.state === 'swing' || e.state === 'recover',
  };
}

/** 見えている近側の鋏の範囲に当たっているか（振り中のみ）。 */
export function gravelCrabClawTouch(e, px, py, pr) {
  if (e.dead || e.state !== 'swing') return false;
  const c = gravelCrabClaw(e);
  const rr = c.r + pr;
  return segDist2(c.shoulder.x, c.shoulder.y, c.tip.x, c.tip.y, px, py) < rr * rr;
}

/** 体（殻）の当たり。弾はここ（殻）に当たる。楕円（描いた甲羅の輪郭に沿う）。 */
export function gravelCrabBodyHit(e, x, y, r = 0) {
  if (e.dead) return false;
  const gm = gravelCrabGeom(e.species);
  const m = gm.parts.carapace;
  /* 描画と同じ左右反転（原画は正面向き・近い鋏が画像の左）。 */
  const flip = ((e.dir || 1) > 0) ? -1 : 1;
  const cx = e.x + flip * (m.offset[0] + m.w * 0.5) * gm.scale;
  const cy = e.y + (m.offset[1] + m.h * 0.5) * gm.scale;
  const rx = m.w * 0.5 * gm.scale + r, ry = m.h * 0.5 * gm.scale + r;
  const nx = (x - cx) / rx, ny = (y - cy) / ry;
  return nx * nx + ny * ny <= 1;
}

/**
 * 命中部位（弾がどの面に当たったか）。描画と同じ向き（dir）で判定する。
 *   'guard' = 正面（甲羅・構えた鋏がかばう面）… わずかしか削れない
 *   'joint' = 横・背後（露出した関節）… 有効
 *   'open'  = 一振り直後（recover）の隙 … 最も有効
 *   null    = 死んでいる
 */
export function gravelCrabHitZone(e, x, y) {
  if (e.dead) return null;
  const sp = GRAVEL_CRAB_SPECIES[e.species];
  if (e.state === 'recover') return 'open';
  const dir = (e.dir < 0) ? -1 : 1;
  const front = (x - e.x) * dir >= -sp.bodyW * 0.05;
  return front ? 'guard' : 'joint';
}

/**
 * 面ごとの実ダメージ。**一律の距離無効や硬さ盛りはしない**（弾は必ず当たる。0 にはしない）。
 *   guard  正面: d*chip（装甲ぶん差し引く）＝ごくわずか。撃たれたら鋏でかばう（guardT を立てる）。
 *   joint  横・背後: d から装甲を引く／最低 d*jointMul ＝ 有効。
 *   open   一振り後の隙: 装甲をほぼ無視して d*openMul ＝ 最も有効。
 */
export function gravelCrabDamage(e, dmg, zone = 'body') {
  if (e.dead) return 0;
  const sp = GRAVEL_CRAB_SPECIES[e.species];
  const d = Math.max(0, Number(dmg) || 0);
  if (d <= 0) return 0;
  if (zone === 'guard') {
    const guarding = (e.guardT > 0);
    const mul = guarding ? sp.guardChip : sp.chipLoose;
    e.guardT = sp.guardHold;                 /* 撃たれた面をかばう（姿勢に反映） */
    return Math.max(d * mul - sp.armor, d * mul * 0.5);
  }
  if (zone === 'joint') return Math.max(d - sp.armor, d * sp.jointMul);
  if (zone === 'open') return Math.max(d - sp.armor * 0.25, d * sp.openMul);
  const soft = zone === 'soft';              /* 後方互換（露出関節） */
  if (soft) return Math.max(d - 1, d * 0.40);
  return Math.max(d - sp.armor, d * 0.06);   /* 'body' など不明（範囲爆発） */
}
