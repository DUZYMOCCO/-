/**
 * pose-debris.js — 敵汎用の「表示ポーズ → 撃破破片」共有モジュール（純粋ロジック／DOM 非依存）。
 *
 * ねらい:
 *  - 通常描画と撃破が *同じ* ローカル部位姿勢を読む（描いた物が、そのまま割れる）。
 *  - 撃破は「実際に表示したポーズ」のワールド変換をスナップショットして切る。
 *    切離し 0 フレームは表示と同じ位置・大きさ・向き。乱数は"その後の"速度と回転だけ。
 *  - 入れ子（親子）・左右反転・非ゼロ角度・固定（アンカー）部位・画像欠落・数の上限を扱う。
 *  - 対象外の敵（1枚絵・クラゲ等）には使わせない。使う側が def を渡した時だけ動く。
 *
 * 部位定義（ローカル BOX 座標・+x が前）:
 *   { id, img, crop:[sx,sy,sw,sh], at:[cx,cy], scale=1, rot=0, flipX=1,
 *     depth=0, mass=1, spin=1, fixed=false, parent=null, perFrame=[{crop,at,scale,rot}...] }
 * def:
 *   { box: 150, origin:[-75,-149], parts:[...] }
 * anchor:
 *   { x, y, flip }   // flip<0 で左右反転（描画の scale(dir,1) と同じ基準）
 */

/** 演出パラメータ（破片そのものの上限・寿命・落下・空気抵抗） */
export const DEBRIS = {
  budget: 320,          // 画面に同時に残す破片の上限（古い方から落とす）
  life: [1.05, 1.75],   // 寿命（秒）
  grav: 210,            // 重力（px/s^2）
  drag: 0.42,           // 1/60s あたりの速度減衰
  impulse: 260,         // 基準の初速（質量で割る＝重い物は遅い）
};

/** 角度ユーティリティ（純粋・テスト可能） */
const clampFrames = (frame, frames) => {
  const n = Math.max(1, frames | 0 || 1);
  const f = (frame | 0) % n;
  return f < 0 ? f + n : f;
};

/**
 * 入れ子の局所変換を親から合成し、depth 昇順（奥→手前）で返す。
 * 反転した親は子の回転方向も反転させる（2D の標準的な鏡映合成）。
 */
export function resolve(parts) {
  const byId = new Map();
  for (const p of parts) if (p && p.id != null) byId.set(p.id, p);
  const done = new Map();
  const visit = (p) => {
    if (done.has(p.id)) return done.get(p.id);
    let base = { at: [0, 0], rot: 0, flipX: 1, scale: 1 };
    if (p.parent != null && byId.has(p.parent)) base = visit(byId.get(p.parent));
    const at = p.at || [0, 0];
    const ox = at[0] * base.flipX;
    const oy = at[1];
    const c = Math.cos(base.rot);
    const s = Math.sin(base.rot);
    const r = {
      ...p,
      at: [base.at[0] + (ox * c - oy * s), base.at[1] + (ox * s + oy * c)],
      rot: base.rot + (p.rot || 0) * base.flipX,
      flipX: base.flipX * (p.flipX == null ? 1 : p.flipX),
      scale: base.scale * (p.scale == null ? 1 : p.scale),
      depth: p.depth == null ? 0 : p.depth,
      mass: p.mass == null ? 1 : p.mass,
      spin: p.spin == null ? 1 : p.spin,
      fixed: !!p.fixed,
    };
    done.set(p.id, r);
    return r;
  };
  return parts.map(visit).sort((a, b) => a.depth - b.depth);
}

/** 1 ポーズ分の部位（フレーム差し替えがあれば適用）。描画も撃破もこれを通す。 */
export function poseFrame(def, ctx = {}) {
  const frames = ctx.frames || def.frames || 1;
  const f = clampFrames(ctx.frame || 0, frames);
  const src = def.parts || [];
  return src.map((p) => {
    const o = { ...p };
    if (Array.isArray(p.perFrame) && p.perFrame[f]) Object.assign(o, p.perFrame[f]);
    return o;
  });
}

/**
 * 表示ポーズのワールド変換（描画と同一）。
 * 反転は anchor.flip に集約するので、向きが変わっても破片は正しい側で割れる。
 */
export function snapshot(parts, anchor) {
  const flip = anchor.flip < 0 ? -1 : 1;
  const flat = resolve(parts);
  return {
    anchor: { x: anchor.x, y: anchor.y, flip },
    parts: flat.map((p) => ({
      id: p.id, img: p.img, crop: p.crop, depth: p.depth, mass: p.mass,
      fixed: p.fixed, spin: p.spin,
      at: [anchor.x + flip * p.at[0], anchor.y + p.at[1]],
      scale: p.scale,
      rot: flip * p.rot,
      flip: flip * p.flipX,
    })),
  };
}

/**
 * スナップショットから破片を起こす。
 * - pose0 は表示ポーズそのもの（x/y/rot/scale/flip）。t=0 では動かない。
 * - 乱数は速度・回転（演出）だけに使う。重い部位は遅く・回りにくい。
 * - 画像が欠けている部位があれば { ok:false } を返す（呼び出し側は従来演出に戻せる）。
 */
export function spawn(snap, opts = {}) {
  const rng = opts.rng || Math.random;
  const impulse = opts.impulse == null ? DEBRIS.impulse : opts.impulse;
  const spread = opts.spread == null ? 1 : opts.spread;
  const side = snap.anchor.flip;
  const parts = [];
  for (const p of snap.parts) {
    if (opts.missing && opts.missing(p.id)) return { ok: false, reason: 'missing', id: p.id };
    const m = p.mass > 0 ? p.mass : 1;
    const life = DEBRIS.life[0] + (DEBRIS.life[1] - DEBRIS.life[0]) * rng();
    const d = {
      id: p.id, img: p.img, crop: p.crop, depth: p.depth, mass: m,
      x: p.at[0], y: p.at[1], scale: p.scale, rot: p.rot, flip: p.flip,
      pose0: { x: p.at[0], y: p.at[1], rot: p.rot, scale: p.scale, flip: p.flip },
      vx: 0, vy: 0, vr: 0, t: 0, life, max: life,
      drag: DEBRIS.drag, grav: DEBRIS.grav, fixed: !!p.fixed,
    };
    if (!d.fixed) {
      /* 前方（向き）と上へ散る。角度のゆらぎと回転は演出。 */
      const a = (-Math.PI / 2) + side * spread * (-0.55 + rng() * 1.1);
      const spd = impulse / m;
      d.vx = Math.cos(a) * spd;
      d.vy = Math.sin(a) * spd - 34 / m;
      d.vr = side * p.spin * (0.55 + rng() * 1.25) * (2 / (1 + m));
    }
    parts.push(d);
  }
  return { ok: true, parts };
}

/** 破片の積分。固定部位は動かない。寿命切れを落とし、予算で古い方から切る。 */
export function step(list, dt, o = {}) {
  const budget = o.budget == null ? DEBRIS.budget : o.budget;
  const grav = o.grav == null ? DEBRIS.grav : o.grav;
  if (dt > 0) {
    for (const d of list) {
      d.t += dt;
      d.life -= dt;
      if (d.fixed || d.life <= 0) continue;
      d.vy += (d.grav == null ? grav : d.grav) * dt;
      const dr = Math.pow(d.drag == null ? DEBRIS.drag : d.drag, dt * 60);
      d.vx *= dr; d.vy *= dr; d.vr *= dr;
      d.x += d.vx * dt; d.y += d.vy * dt; d.rot += d.vr * dt;
    }
  }
  let out = list.filter(d => d.life > 0);
  if (out.length > budget) out = out.slice(out.length - budget);
  list.length = 0;
  for (const d of out) list.push(d);
  return list;
}

/** 描画用の最終変換（スプライト source crop・位置・大きさ・向き・奥行き）。 */
export function debrisTransform(d) {
  const cr = d.crop || [0, 0, 1, 1];
  return {
    img: d.img, crop: cr, x: d.x, y: d.y,
    w: cr[2] * d.scale, h: cr[3] * d.scale,
    rot: d.rot, flip: d.flip, depth: d.depth, alpha: Math.max(0, Math.min(1, d.life / Math.max(0.001, d.max))),
  };
}
