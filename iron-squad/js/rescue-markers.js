// 画面端の救助マーカーを重ならないようにまとめる純関数。
// 入力: [{ex,ey,dist,carried,...}]（ex,ey は画面端へクランプ済みの描画位置、dist は隊長からの距離）
// 近い順に並べ、既存マーカーの GAP_X × GAP_Y 内に入るものは1つにまとめる（代表は最も近い1体）。
// out を渡せば配列とクラスタオブジェクトを使い回すので、毎フレームの確保は増えない。
export const RESCUE_GAP_X = 80;
export const RESCUE_GAP_Y = 44;

export function clusterRescueMarkers(points, count, out = [], gapX = RESCUE_GAP_X, gapY = RESCUE_GAP_Y) {
  const n = Math.min(count, points.length);
  if (n > 1) {
    // 先頭 n 個だけを近い順に（points が n より長くても残りは触らない）
    if (n === points.length) points.sort(byDist);
    else { const head = points.slice(0, n).sort(byDist); for (let i = 0; i < n; i++) points[i] = head[i]; }
  }
  let k = 0;
  for (let i = 0; i < n; i++) {
    const p = points[i];
    let hit = null;
    for (let j = 0; j < k; j++) {
      const c = out[j];
      if (Math.abs(c.ex - p.ex) < gapX && Math.abs(c.ey - p.ey) < gapY) { hit = c; break; }
    }
    if (hit) {
      hit.count++;
      if (!p.carried) hit.carried = false;
      continue;
    }
    let c = out[k];
    if (!c) c = out[k] = { ex: 0, ey: 0, angle: 0, dist: 0, carried: false, count: 0 };
    c.ex = p.ex; c.ey = p.ey; c.angle = p.angle; c.dist = p.dist; c.carried = !!p.carried; c.count = 1;
    k++;
  }
  out.length = k;
  return out;
}

function byDist(a, b) { return a.dist - b.dist; }
