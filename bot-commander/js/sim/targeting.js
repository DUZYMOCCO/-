// 狙う相手・追いかける相手を「届くか」（altitude.js の canHit）に合わせる小さな関数（v0.4.7-dev）。
// データと計算だけ（DOM・Pixi・乱数なし）。sim.js の敵の群れの AI（updateEnemyAI・groupSees・updatePatrols）から呼ぶ。
// 両方とも地上の帯なら必ず true を先に返す（今のミッションは全員が地上なので、答えも速さも今までと同じ）。
import { BAND, unitBand, canHit } from './altitude.js?v=1';

/** a が、その武器（weaponRowOf(a) で得る武器の行）で target に届くか。両方地上なら武器を調べずに true */
export function reaches(a, target, weaponRowOf) {
  if (unitBand(a) === BAND.SURFACE && unitBand(target) === BAND.SURFACE) return true;
  return canHit(a, target, weaponRowOf(a));
}

/** 群れ（members＝機体の並び）の誰か 1 体でも target に届くか。群れが空なら false */
export function groupReaches(members, target, weaponRowOf) {
  for (const a of members) if (reaches(a, target, weaponRowOf)) return true;
  return false;
}

/**
 * v1.0.0: 「届かない」印のための判定（画面の印だけに使う。sim は読むだけ・何も書かない・乱数なし）。
 * 敵 e の見える範囲（sight マス）に、e が届かない帯（空・水中）の味方のロボがいて、いま狙っている相手がいない時、その味方を返す。なければ null。
 * 両方地上のミッション（今の本編）では、reaches が必ず true なので、いつも null。
 */
export function unreachableTarget(sim, e, weaponRowOf, tilePx = 32) {
  if (!e || e.side !== 'enemy' || e.hp <= 0 || e.captured != null || e.carrying != null || !(e.atk > 0)) return null;
  if (e.targetId != null) return null;
  const r = (e.sight || 0) * tilePx;
  let best = null, bd = Infinity;
  for (const a of sim.units) {
    if (a.side !== 'ally' || a.human || a.hp <= 0) continue;
    const d = Math.hypot(a.x - e.x, a.y - e.y);
    if (d > r || d >= bd) continue;
    if (reaches(e, a, weaponRowOf)) return null; // 届く相手が近くにいる → 印は出さない
    bd = d; best = a;
  }
  return best;
}
