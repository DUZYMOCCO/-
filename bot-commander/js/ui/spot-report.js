// 敵を見つけた群れの判定（DOM なし・テスト用）。
import { toTile } from '../sim/map.js?v=6';

/**
 * 視界に入った新しい敵の群れを探す。
 * sim: シミュレーション状態, seenSet: 既に発見済みの groupId/id の Set
 * 返り値: [{ enemy, spotter, groupId }, ...]
 */
export function newSpots(sim, seenSet = new Set()) {
  if (!sim?.units) return [];
  const allies = sim.units.filter(u => u.side === 'ally' && u.hp > 0 && !u.object);
  const out = [];

  for (const e of sim.units) {
    if (e.side !== 'enemy' || !(e.hp > 0)) continue;
    const isVis = sim.fog?.isVisible ? sim.fog.isVisible(toTile(e.x), toTile(e.y)) : true;
    if (!isVis) continue;

    const gId = e.groupId != null ? e.groupId : e.id;
    const key = (e.groupId != null ? 'g' : 'u') + gId; // 群れの番号と機体の番号が重ならないように分ける
    if (seenSet.has(key)) continue;

    seenSet.add(key);

    // 一番近い生きている味方
    let spotter = null, minD = Infinity;
    for (const a of allies) {
      const d = Math.hypot(a.x - e.x, a.y - e.y);
      if (d < minD) { minD = d; spotter = a; }
    }

    out.push({ enemy: e, spotter, groupId: gId });
  }

  return out;
}
