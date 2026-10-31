import { ensureOutposts } from './outposts.js';

const WALLS = ['wood_fence', 'stone_wall', 'wood_gate'];

// 道の判定に使う壁: 建った壁と、これから建つ壁の現場（門は通れる）
function wallPieces(state, outpostId) {
  return ensureOutposts(state).pieces.filter((p) => p.outpostId === outpostId && (p.state === 'done' || p.state === 'site') && WALLS.includes(p.type));
}

function inWall(p, x, z, radius = 0) {
  const len = p.length || p.size?.[0] || 1;
  const horizontal = Math.abs(Math.sin(p.rot || 0)) < 0.5;
  const hx = horizontal ? len / 2 : 0.25;
  const hz = horizontal ? 0.25 : len / 2;
  return Math.abs(x - p.x) < hx + radius && Math.abs(z - p.z) < hz + radius;
}

function blockers(state, outpostId) {
  return wallPieces(state, outpostId).filter((p) => p.type !== 'wood_gate');
}

function pointFree(walls, x, z, radius = 0.25) { return !walls.some((p) => inWall(p, x, z, radius)); }

// 2点の間を 0.5m ごとに調べる（壁の帯は 1m 幅なので跨ぎ越しは起きない）
function segmentFree(walls, ax, az, bx, bz, radius = 0.25) {
  const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 0.5));
  for (let i = 1; i <= n; i += 1) {
    const t = i / n;
    if (!pointFree(walls, ax + (bx - ax) * t, az + (bz - az) * t, radius)) return false;
  }
  return true;
}

export function buildCellWalkable(state, outpostId, x, z, radius = 0.25) {
  return pointFree(blockers(state, outpostId), x, z, radius);
}

// start から歩いて届く格子点の集合（決定的: 4近傍の幅優先、範囲 bounds の中だけ）
function flood(walls, start, step, maxCells, bounds) {
  const key = (x, z) => `${Math.round(x / step)},${Math.round(z / step)}`;
  const sx = Math.round(start.x / step) * step, sz = Math.round(start.z / step) * step;
  const seen = new Set();
  if (!pointFree(walls, sx, sz) || !segmentFree(walls, start.x, start.z, sx, sz, 0)) return { seen, key };
  const queue = [{ x: sx, z: sz }]; seen.add(key(sx, sz));
  const offsets = [[step, 0], [-step, 0], [0, step], [0, -step]];
  for (let head = 0; head < queue.length && seen.size < maxCells; head += 1) {
    const p = queue[head];
    for (const [dx, dz] of offsets) {
      const x = p.x + dx, z = p.z + dz, k = key(x, z);
      if (seen.has(k)) continue;
      if (bounds && (x < bounds.x0 || x > bounds.x1 || z < bounds.z0 || z > bounds.z1)) continue;
      if (!segmentFree(walls, p.x, p.z, x, z)) continue;
      seen.add(k); queue.push({ x, z });
    }
  }
  return { seen, key };
}

// 点 q がその集合に入っているか（すぐ隣の格子点から壁を跨がずに行けるなら届く）
function reaches(walls, reach, q, step) {
  const bx = Math.round(q.x / step) * step, bz = Math.round(q.z / step) * step;
  for (const [dx, dz] of [[0, 0], [step, 0], [-step, 0], [0, step], [0, -step], [step, step], [-step, step], [step, -step], [-step, -step]]) {
    const x = bx + dx, z = bz + dz;
    if (reach.seen.has(reach.key(x, z)) && segmentFree(walls, x, z, q.x, q.z, 0)) return true;
  }
  return false;
}

export function buildPathExists(state, outpostId, start, goal, options = {}) {
  const step = Number.isFinite(options.step) ? options.step : 1;
  const maxCells = Number.isFinite(options.maxCells) ? options.maxCells : 6000;
  const walls = blockers(state, outpostId);
  if (!pointFree(walls, goal.x, goal.z)) return false;
  return reaches(walls, flood(walls, start, step, maxCells, options.bounds || null), goal, step);
}

export function gatePathExists(state, outpostId, exterior, interior) {
  const gates = wallPieces(state, outpostId).filter((p) => p.type === 'wood_gate');
  if (!gates.length) return false;
  return buildPathExists(state, outpostId, exterior, interior);
}

// 拠点の外（旗から radius+3 の所）から targets の各点へ歩いて行けるか。外へ一度だけ塗りつぶす
export function outsideReach(state, outpostId, outpost, targets, step = 1) {
  const walls = blockers(state, outpostId);
  const r = (outpost.radius || 30) + 4;
  const bounds = { x0: outpost.x - r, x1: outpost.x + r, z0: outpost.z - r, z1: outpost.z + r };
  const exterior = { x: outpost.x + r - 1, z: outpost.z };
  const reach = flood(walls, exterior, step, 20000, bounds);
  return targets.map((q) => {
    if (q.x < bounds.x0 + 1 || q.x > bounds.x1 - 1 || q.z < bounds.z0 + 1 || q.z > bounds.z1 - 1) return true; // 拠点の外にいる
    return reaches(walls, reach, q, step);
  });
}
