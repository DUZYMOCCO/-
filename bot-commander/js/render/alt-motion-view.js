// v1.0.1 Codex gfx4 SKY_VIS・ALT_MOTION: 飛ぶ機体・水陸両用機の見た目の動き（見た目だけ。sim の state を読むだけで、何も書きかえない）。
// Pixi・DOM を使わない（tests/gfx4.test.mjs から直接呼ぶ）。renderer.js が毎フレーム呼び、返ってきた絵のキーで体・影・しぶきを出す。
//   飛ぶ機体: 空にいる間は足元に影の絵（flyer_shadow）。燃料が切れてためている間は、地面なら flyer_charge_ground・水面なら flyer_charge_water
//   水陸両用機: 深い水に入って潜る（z が 0 以上 → 0 未満）と潜る 4 コマ（6 コマ／秒）→ 潜っている間は体をうすくして水中の影（amph_underwater）。
//     浮かぶ（z が 0 未満 → 0 以上）と、潜る 4 コマを逆に流し、水しぶき（amph_splash）を重ねる
import { isRefueling } from '../sim/fuel.js?v=1';

export const DIVE_FPS = 6, DIVE_FRAMES = 4;
export const AIR_SHADOW_FROM_Z = 24;
// 潜っている間: 水中の影の絵の上に、体をうすく残す（影だけだと暗い水の上で見えないため。前の青く透けた見た目＋影）
export const UNDERWATER_BODY_ALPHA = 0.45; // renderer.js の AIR_FROM_Z と同じ（空の帯）

/**
 * st: 機体ごとの覚え書き（renderer の View に持たせる。最初は {}）。now は秒（見た目の時計）。
 * 返り値: null（いつもの絵のまま）か { body: 体の絵のキー | null（いつもの絵）, faint: 体を薄く（0..1。潜っている間）, shadow: 足元の影の絵のキー, overlay: 体に重ねる絵のキー, overlayAlpha }
 */
export function altMotion(st, u, now) {
  if (!u) return null;
  const z = u.z || 0;
  if (u.kind === 'flyer') {
    if (isRefueling(u)) return { body: u.fuelFloat ? 'flyer_charge_water' : 'flyer_charge_ground' };
    if (z >= AIR_SHADOW_FROM_Z) return { shadow: 'flyer_shadow' };
    return null;
  }
  if (u.kind !== 'amph') return null;
  const sub = z < 0;
  if (st.sub === undefined) st.sub = sub; // 初めて見た時は、そのままの状態（潜る動きは出さない）
  else if (st.sub !== sub) { st.sub = sub; st.anim = sub ? 'dive' : 'surface'; st.t0 = now; }
  if (st.anim) {
    const f = Math.floor((now - st.t0) * DIVE_FPS);
    if (f >= DIVE_FRAMES || f < 0) st.anim = null;
    else if (st.anim === 'dive') return { body: `amph_dive_${f}` };
    else return { body: f === DIVE_FRAMES - 1 ? null : `amph_dive_${DIVE_FRAMES - 1 - f}`, overlay: 'amph_splash', overlayAlpha: 1 - f / DIVE_FRAMES * 0.5 };
  }
  if (sub) return { faint: UNDERWATER_BODY_ALPHA, shadow: 'amph_underwater' };
  return null;
}

/** 魚雷（W3-12）の進む速さ（ワールド px／秒）と、1 本の時間（秒）。見た目だけ（ダメージは sim がもう入れている） */
export const TORPEDO_SPEED = 240;
export const torpedoDuration = (x0, y0, x1, y1) => Math.max(0.25, Math.min(1.6, Math.hypot(x1 - x0, y1 - y0) / TORPEDO_SPEED));
