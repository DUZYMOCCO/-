// 差分（予算つき）A*。
// 元: Iron Squad js/hero-navigation.js の advanceHeroRoute（2026-10 版, rep v7.2.25）。
//   ・二分ヒープの push/pop と「1回の呼び出しで決まった数のノードだけ調べ、続きは次のフレーム」という作りを流用。
//   ・変更: 256px 格子＋壁判定 → タイル格子＋地形コスト（森・山は高い、水は通れない）。
//           キーを文字列から数値インデックスに、ノードを型付き配列に。斜めは角の水を抜けない。
import { passable, costAt } from './map.js?v=2';

const SQ2 = Math.SQRT2;
const DIRS = [[1, 0, 1], [0, 1, 1], [-1, 0, 1], [0, -1, 1], [1, 1, SQ2], [1, -1, SQ2], [-1, 1, SQ2], [-1, -1, SQ2]];

function push(heap, node) { heap.push(node); let i = heap.length - 1; while (i) { const p = (i - 1) >> 1; if (heap[p].f <= node.f) break; heap[i] = heap[p]; i = p; } heap[i] = node; }
function pop(heap) { const out = heap[0], last = heap.pop(); if (heap.length) { let i = 0; while (i * 2 + 1 < heap.length) { let c = i * 2 + 1; if (c + 1 < heap.length && heap[c + 1].f < heap[c].f) c++; if (heap[c].f >= last.f) break; heap[i] = heap[c]; i = c; } heap[i] = last; } return out; }

// 八方向距離（最小コスト1なので過大評価しない）
const octile = (dx, dy) => { dx = Math.abs(dx); dy = Math.abs(dy); return Math.max(dx, dy) + (SQ2 - 1) * Math.min(dx, dy); };

export function createSearch(map, sx, sy, gx, gy) {
  const n = map.w * map.h;
  const s = { map, sx, sy, gx, gy, g: new Float64Array(n).fill(Infinity), parent: new Int32Array(n).fill(-1), closed: new Uint8Array(n), heap: [], expanded: 0, status: 'running', path: null };
  if (!passable(map, sx, sy) || !passable(map, gx, gy)) { s.status = 'fail'; return s; }
  const i = sy * map.w + sx; s.g[i] = 0; push(s.heap, { i, f: octile(gx - sx, gy - sy) });
  return s;
}

/** budget 個までノードを広げる。'running' | 'found' | 'fail' を返す。見つかったら s.path = [{tx,ty}...] */
export function stepSearch(s, budget = 200) {
  if (s.status !== 'running') return s.status;
  const { map, gx, gy } = s, w = map.w, goal = gy * w + gx;
  while (s.heap.length && budget-- > 0) {
    const { i } = pop(s.heap);
    if (s.closed[i]) continue;
    s.closed[i] = 1; s.expanded++;
    if (i === goal) {
      const path = []; for (let k = i; k !== -1; k = s.parent[k]) path.push({ tx: k % w, ty: (k / w) | 0 });
      s.path = path.reverse(); s.status = 'found'; s.heap.length = 0; return s.status;
    }
    const x = i % w, y = (i / w) | 0;
    for (const [dx, dy, len] of DIRS) {
      const nx = x + dx, ny = y + dy;
      if (!passable(map, nx, ny)) continue;
      if (dx && dy && (!passable(map, x + dx, y) || !passable(map, x, y + dy))) continue; // 角の水は抜けない
      const ni = ny * w + nx; if (s.closed[ni]) continue;
      const g = s.g[i] + len * costAt(map, nx, ny);
      if (g < s.g[ni]) { s.g[ni] = g; s.parent[ni] = i; push(s.heap, { i: ni, f: g + octile(gx - nx, gy - ny) }); }
    }
  }
  if (!s.heap.length) s.status = 'fail';
  return s.status;
}

/** 一度に最後まで探す（テスト・初期配置用） */
export function findPath(map, sx, sy, gx, gy) {
  const s = createSearch(map, sx, sy, gx, gy);
  while (stepSearch(s, 1e9) === 'running');
  return s.status === 'found' ? s.path : null;
}

export function pathCost(map, path) {
  let c = 0;
  for (let k = 1; k < path.length; k++) c += Math.hypot(path[k].tx - path[k - 1].tx, path[k].ty - path[k - 1].ty) * costAt(map, path[k].tx, path[k].ty);
  return c;
}
