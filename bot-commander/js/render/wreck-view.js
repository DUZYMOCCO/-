// v1.0.3 Codex gfx5 ALLY_WRECK: 機体の傷んだ姿と、やられた後に地図に残る残骸（見た目だけ。sim は変えない。ハッシュに入らない）。Pixi を使わない（tests/gfx5.test.mjs）
//   傷んだ姿: 味方のポンコ・ツギハギ号が HP の半分以下（体の絵を同じ枠の傷んだ絵に入れ替える）
//   残骸: 味方のポンコ・ツギハギ号・飛ぶ機体・水陸両用機は倒れた残骸、異星生物は休眠体（「敵は倒しても起き上がらず、休眠体が残る」）。
//   残骸は機体より下に描き、WRECK_SEC（ゲームの時間）たったら WRECK_FADE 秒で消える。同時に WRECK_MAX 個まで（多い時は古い物から消す）
import { neWreckArt } from '../sim/new-enemies.js?v=2'; // 新しい敵（?newenemies=1）の倒れた後の絵
export const DAMAGED_AT = 0.5;
export const WRECK_SEC = 45, WRECK_FADE = 3, WRECK_IN = 0.25, WRECK_MAX = 14;
const DAMAGED_KINDS = new Set(['ponco', 'scav']);
const ALLY_WRECK_KINDS = new Set(['ponco', 'scav', 'flyer', 'amph']);

/** 傷んだ姿の絵のキー（なければ null）。u は sim の機体 */
export function damagedKey(u) {
  if (!u || u.side !== 'ally' || !DAMAGED_KINDS.has(u.kind) || !(u.maxHp > 0) || u.hp <= 0) return null;
  return u.hp / u.maxHp <= DAMAGED_AT ? `dmg_${u.kind}` : null;
}
/** やられた後に残る絵のキー（なければ null） */
export function wreckKey(u) {
  if (!u) return null;
  if (u.side === 'ally' && ALLY_WRECK_KINDS.has(u.kind)) return `wreck_${u.kind}`;
  if (u.side === 'enemy' && u.kind === 'alien') return 'wreck_alien';
  if (u.side === 'enemy') return neWreckArt(u.kind); // 新しい敵: 休眠体（G01〜G12）・落ちた姿（空の敵）。ほかは null
  return null;
}
/** 残ってから t 秒（ゲームの時間）の濃さ。0 になったら捨てる */
export function wreckAlpha(t) {
  if (t < WRECK_IN) return Math.max(0, t / WRECK_IN);
  if (t < WRECK_SEC) return 1;
  return Math.max(0, 1 - (t - WRECK_SEC) / WRECK_FADE);
}
/** 残骸の並び（古い順）が多すぎる時、古い物を消え始めさせる（t を WRECK_SEC に進める）。並びはそのまま */
export function trimWrecks(list, max = WRECK_MAX) {
  let live = list.filter(w => w.t < WRECK_SEC).length;
  for (const w of list) { if (live <= max) break; if (w.t < WRECK_SEC) { w.t = WRECK_SEC; live--; } }
  return list;
}
