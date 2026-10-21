// 指でなぞった線 → 経由点（最大4）。DOM に依存しない。
import { toTile, nearestPassable } from './map.js?v=1';

function rdp(points, eps) {
  if (points.length < 3) return points.slice();
  const a = points[0], b = points[points.length - 1];
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
  let best = -1, idx = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i];
    const d = len > 1e-6 ? Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / len : Math.hypot(p.x - a.x, p.y - a.y);
    if (d > best) { best = d; idx = i; }
  }
  if (best <= eps) return [a, b];
  return [...rdp(points.slice(0, idx + 1), eps).slice(0, -1), ...rdp(points.slice(idx), eps)];
}

/**
 * points: ワールド座標の点列（先頭は部隊の位置付近）。返り値: タイル座標の経由点 [{tx,ty}]（1〜max 個、最後が目的地）
 * 曲がり角を残して間引き（Ramer–Douglas–Peucker）、多すぎたら「曲がりの大きい順」に残す。
 */
export function strokeToWaypoints(map, points, { max = 4, eps = 28, minStep = 1.5 } = {}) {
  if (!points?.length) return [];
  let simple = rdp(points, eps).slice(1); // 先頭（出発点）は経由点にしない
  if (!simple.length) simple = [points[points.length - 1]];
  while (simple.length > max) {
    // 終点は残し、前後とのなす角が一番ゆるい点を消す
    let worst = -1, wi = 0;
    for (let i = 0; i < simple.length - 1; i++) {
      const p0 = i === 0 ? points[0] : simple[i - 1], p = simple[i], p1 = simple[i + 1];
      const a1 = Math.atan2(p.y - p0.y, p.x - p0.x), a2 = Math.atan2(p1.y - p.y, p1.x - p.x);
      const turn = Math.abs(Math.atan2(Math.sin(a2 - a1), Math.cos(a2 - a1)));
      const straight = Math.PI - turn;
      if (straight > worst) { worst = straight; wi = i; }
    }
    simple.splice(wi, 1);
  }
  const out = [];
  for (const p of simple) {
    const t = nearestPassable(map, toTile(p.x), toTile(p.y));
    if (!t) continue;
    const last = out[out.length - 1];
    if (last && Math.hypot(last.tx - t.tx, last.ty - t.ty) < minStep) { out[out.length - 1] = t; continue; }
    out.push(t);
  }
  return out.slice(-max);
}
