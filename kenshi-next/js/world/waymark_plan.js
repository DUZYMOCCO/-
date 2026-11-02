import { WORLD_LAYOUT } from '../data/world_layout.js';

export const WAYMARK_PLAN = Object.freeze({
  spacing: 250,
  roadOffsetMin: 11,
  roadOffsetMax: 19,
  keepApart: 125,
  viewRadius: 440,
  visibleMax: 8,
  bucketSize: 512,
});

function hash(seed, ...parts) {
  let h = (2166136261 ^ (Number(seed) | 0)) >>> 0;
  for (const part of parts) {
    const s = String(part);
    for (let i = 0; i < s.length; i += 1) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    h ^= 47;
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

function pointSegmentDistance(x, z, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], length2 = dx * dx + dz * dz;
  const t = length2 ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / length2)) : 0;
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}

function worldRoads() {
  const out = [];
  for (const road of WORLD_LAYOUT.roads || []) {
    const points = road.points || [];
    for (let i = 1; i < points.length; i += 1) out.push([points[i - 1], points[i]]);
  }
  return out;
}

const ROAD_SEGMENTS = worldRoads();
const TOWNS = [...(WORLD_LAYOUT.towns || []), ...(WORLD_LAYOUT.banditBases || [])];

function closeToReservedArea(x, z, state) {
  for (const town of TOWNS) {
    const radius = town.radius || town.r || 0;
    if (Math.hypot(x - town.x, z - town.z) < radius + 18) return true;
  }
  for (const landmark of WORLD_LAYOUT.landmarks || []) {
    if (Math.hypot(x - landmark.x, z - landmark.z) < 22) return true;
  }
  for (const b of state?.buildings || []) {
    if (Math.abs(x - b.x) < (b.w || 0) / 2 + 3 && Math.abs(z - b.z) < (b.d || 0) / 2 + 3) return true;
  }
  for (const prop of state?.props || []) {
    const radius = prop.kind === 'tree' ? (prop.r || 1) + 3 : Math.max(prop.w || 2, prop.d || 2) / 2 + 3;
    if (Math.hypot(x - prop.x, z - prop.z) < radius) return true;
  }
  return false;
}

function roadDistance(x, z) {
  let best = Infinity;
  for (const [a, b] of ROAD_SEGMENTS) best = Math.min(best, pointSegmentDistance(x, z, a, b));
  return best;
}

function markerKind(value) {
  if (value < 0.42) return 'sign';
  if (value < 0.62) return 'ruin';
  if (value < 0.82) return 'bones';
  return 'roots';
}

export function planWaymarks(seed = 0, state = null) {
  const bounds = WORLD_LAYOUT.bounds;
  const out = [];
  let ordinal = 0;
  for (let roadIndex = 0; roadIndex < (WORLD_LAYOUT.roads || []).length; roadIndex += 1) {
    const points = WORLD_LAYOUT.roads[roadIndex].points || [];
    let traveled = 0;
    let nextAt = 105 + hash(seed, roadIndex, 'offset') * 80;
    for (let segment = 1; segment < points.length; segment += 1) {
      const a = points[segment - 1], b = points[segment];
      const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
      if (length < 1) continue;
      while (nextAt < traveled + length) {
        const t = Math.max(0.08, Math.min(0.92, (nextAt - traveled) / length));
        const sx = a[0] + dx * t, sz = a[1] + dz * t;
        const nx = -dz / length, nz = dx / length;
        const station = ordinal++;
        let accepted = null;
        for (let sideTry = 0; sideTry < 4 && !accepted; sideTry += 1) {
          const side = ((hash(seed, roadIndex, station, sideTry, 'side') < 0.5) ? -1 : 1) * (sideTry < 2 ? 1 : -1);
          const offset = WAYMARK_PLAN.roadOffsetMin + hash(seed, roadIndex, station, sideTry, 'distance') * (WAYMARK_PLAN.roadOffsetMax - WAYMARK_PLAN.roadOffsetMin);
          const x = sx + nx * side * offset, z = sz + nz * side * offset;
          if (x < bounds.minX + 12 || x > bounds.maxX - 12 || z < bounds.minZ + 12 || z > bounds.maxZ - 12) continue;
          if (closeToReservedArea(x, z, state) || roadDistance(x, z) < 8) continue;
          if (out.some((item) => Math.hypot(x - item.x, z - item.z) < WAYMARK_PLAN.keepApart)) continue;
          const kind = markerKind(hash(seed, roadIndex, station, 'kind'));
          accepted = {
            id: `${roadIndex}:${station}`,
            kind,
            x,
            z,
            scale: 0.82 + hash(seed, roadIndex, station, 'scale') * 0.38,
            rot: hash(seed, roadIndex, station, 'rot') * Math.PI * 2,
          };
        }
        if (accepted) out.push(accepted);
        nextAt += WAYMARK_PLAN.spacing + hash(seed, roadIndex, station, 'spacing') * 90;
      }
      traveled += length;
    }
  }
  return out;
}

export function indexWaymarks(waymarks, cellSize = WAYMARK_PLAN.bucketSize) {
  const buckets = new Map();
  for (const item of waymarks || []) {
    const x = Math.floor(item.x / cellSize), z = Math.floor(item.z / cellSize), key = `${x},${z}`;
    let bucket = buckets.get(key);
    if (!bucket) { bucket = []; buckets.set(key, bucket); }
    bucket.push(item);
  }
  return { buckets, cellSize };
}

export function nearbyWaymarks(index, x, z, radius = WAYMARK_PLAN.viewRadius, maximum = WAYMARK_PLAN.visibleMax) {
  if (!index || !index.buckets || !Number.isFinite(x) || !Number.isFinite(z)) return [];
  const size = index.cellSize || WAYMARK_PLAN.bucketSize;
  const minX = Math.floor((x - radius) / size), maxX = Math.floor((x + radius) / size);
  const minZ = Math.floor((z - radius) / size), maxZ = Math.floor((z + radius) / size);
  const limit2 = radius * radius, nearby = [];
  for (let cx = minX; cx <= maxX; cx += 1) for (let cz = minZ; cz <= maxZ; cz += 1) {
    for (const item of index.buckets.get(`${cx},${cz}`) || []) {
      const dx = item.x - x, dz = item.z - z, distance2 = dx * dx + dz * dz;
      if (distance2 <= limit2) nearby.push({ item, distance2 });
    }
  }
  nearby.sort((a, b) => a.distance2 - b.distance2 || a.item.id.localeCompare(b.item.id));
  return nearby.slice(0, Math.max(0, maximum)).map((entry) => entry.item);
}
