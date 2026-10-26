// story3-view.js — 第 3 章（?storych=3）の見た目: 3-1 の門の張り紙を調べる輪、3-2 のビルの「ここ」印。絵の素材はまだ無いので、すべてコードで描く（仮）。
// sim.story3 が無い時は何もしない（ふつうのミッションの見た目は変わらない）。g は Graphics（毎フレーム clear される）。
import { TILE, tileCenter } from '../sim/map.js?v=6';
import { STORY3 } from '../sim/story3-sim.js?v=1';

export function drawStory3(g, sim, cam, now) {
  const S = sim.story3; if (!S) return;
  const ink = 1 / Math.max(1, cam.zoom);
  // 3-1: 門の張り紙（青い輪と進み具合の弧。敵が近い時は赤。1 章の設計図のありかと同じ形）
  const gate = S.gate;
  if (gate && !gate.done && sim.fog.isSeen(gate.tx, gate.ty)) {
    const sx = tileCenter(gate.tx), sy = tileCenter(gate.ty), col = gate.blocked ? 0xef4444 : 0x7dd3fc, R = STORY3.surveyRadius * TILE, p = 1 - gate.amount / gate.max;
    g.circle(sx, sy, R).fill({ color: col, alpha: 0.08 }).stroke({ width: 2.5 * ink, color: col, alpha: 0.75 });
    if (p > 0) { g.moveTo(sx, sy - R - 6 * ink); g.arc(sx, sy, R + 6 * ink, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p); g.stroke({ width: 4 * ink, color: 0x7dd3fc, alpha: 0.95 }); }
    const k = (now * 0.6) % 1;
    g.circle(sx, sy, R * (0.35 + 0.65 * k)).stroke({ width: 1.5 * ink, color: col, alpha: 0.5 * (1 - k) });
    g.moveTo(sx, sy - 10).lineTo(sx + 7, sy).lineTo(sx, sy + 10).lineTo(sx - 7, sy).closePath().fill({ color: col, alpha: 0.9 }).stroke({ width: 1.5 * ink, color: 0x121418 });
  }
  // 3-2: ミントが見つかるまで、ビルのそばに桃色の「ここ」印（入口の敵がいなくなったら強く光る）
  const M = S.mint;
  if (M && M.phase === 'guard' && sim.fog.isSeen(M.tower.tx, M.tower.ty)) {
    const sx = tileCenter(M.tower.tx), sy = tileCenter(M.tower.ty), R = STORY3.towerNearTiles * TILE, k = (now * 0.7) % 1;
    const open = !sim.units.some(u => u.side === 'enemy' && u.hp > 0 && u.label === M.guard);
    const col = 0xf9a8d4;
    g.circle(sx, sy, R).stroke({ width: 2 * ink, color: col, alpha: open ? 0.8 : 0.35 });
    g.circle(sx, sy, R * (0.3 + 0.7 * k)).stroke({ width: 1.5 * ink, color: col, alpha: 0.5 * (1 - k) });
    g.moveTo(sx, sy - 11).lineTo(sx + 8, sy).lineTo(sx, sy + 11).lineTo(sx - 8, sy).closePath().fill({ color: col, alpha: 0.9 }).stroke({ width: 1.5 * ink, color: 0x121418 });
  }
}
