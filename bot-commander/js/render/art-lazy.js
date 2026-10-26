// v1.0.4 磨き: 最初に読む絵から、いま要らない物を外す（見た目・sim は変えない。Pixi を使わない）。
// 飛ぶ機体・水陸両用機の体の絵（合わせて約 0.4MB・描画の絵 約 2MB）は、その機体がミッションにいる時だけ最初に読む。
// 途中で出てきた時は renderer.js の loadAltBody が読む（読めるまでは仮の絵）。
import { ALT_UNIT_LOOK } from '../sim/alt-units.js?v=3';

export const ALT_BODY_KEYS = Object.freeze(['flyer_ally', 'amph_ally']);

/** sources（絵の元の一覧）の写しから、sim.units にいない機体の体の絵を外して返す（sources は変えない） */
export function initialArtSources(sources, sim) {
  const out = { ...sources };
  for (const k of ALT_BODY_KEYS) if (!sim.units.some(u => `${ALT_UNIT_LOOK[u.kind]?.art ?? u.kind}_${u.side}` === k)) delete out[k];
  return out;
}
