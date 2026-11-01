import { WORLD_LAYOUT } from '../data/world_layout.js';
import { heightAt, roadDistance } from './terrain.js';

export const WALK = Object.freeze({
  maxSlope: 0.9,
  roadMargin: 3,
  roadHalfWidth: 5,
  roadQueryDistance: 9,
  sampleStep: 1,
  startHalfExtent: 200,
});

const FLAT_ZONES = [...WORLD_LAYOUT.towns, ...WORLD_LAYOUT.banditBases];

function zoneKey(x, z) {
  return Math.floor(x / 512) + ',' + Math.floor(z / 512);
}

function makeZoneBuckets(zones) {
  const buckets = new Map();
  for (const zone of zones) {
    if (!zone || !Number.isFinite(zone.x) || !Number.isFinite(zone.z)) continue;
    const radius = Number.isFinite(zone.radius) ? zone.radius : 60;
    const minX = Math.floor((zone.x - radius) / 512);
    const maxX = Math.floor((zone.x + radius) / 512);
    const minZ = Math.floor((zone.z - radius) / 512);
    const maxZ = Math.floor((zone.z + radius) / 512);
    for (let ix = minX; ix <= maxX; ix += 1) {
      for (let iz = minZ; iz <= maxZ; iz += 1) {
        const key = ix + ',' + iz;
        let list = buckets.get(key);
        if (!list) {
          list = [];
          buckets.set(key, list);
        }
        list.push({ x: zone.x, z: zone.z, radius });
      }
    }
  }
  return buckets;
}

export function createWalkable({
  heightAt: getHeight = heightAt,
  roadDistance: getRoadDistance = roadDistance,
  flatZones = FLAT_ZONES,
  maxSlope = WALK.maxSlope,
} = {}) {
  const zones = Array.isArray(flatZones)
    ? flatZones.map((zone) => ({
        x: zone?.x,
        z: zone?.z,
        radius: (zone?.radius || 60) + 40 + 100,
      }))
    : [];
  const zoneBuckets = makeZoneBuckets(zones);
  const slopeLimit = Number.isFinite(maxSlope) ? maxSlope : WALK.maxSlope;
  const roadLimit = WALK.roadHalfWidth + WALK.roadMargin;

  function slopeAt(x, z) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return Infinity;
    const step = WALK.sampleStep;
    const dx = (getHeight(x + step, z) - getHeight(x - step, z)) / (2 * step);
    const dz = (getHeight(x, z + step) - getHeight(x, z - step)) / (2 * step);
    return Math.hypot(dx, dz);
  }

  function walkableAt(x, z) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
    const startExtent = WALK.startHalfExtent;
    if (Math.abs(x) < startExtent && Math.abs(z) < startExtent) return true;

    const zonesHere = zoneBuckets.get(zoneKey(x, z));
    if (zonesHere) {
      for (const zone of zonesHere) {
        const dx = x - zone.x;
        const dz = z - zone.z;
        if (dx * dx + dz * dz <= zone.radius * zone.radius) return true;
      }
    }

    if (typeof getRoadDistance === 'function') {
      const distance = getRoadDistance(x, z, WALK.roadQueryDistance);
      if (Number.isFinite(distance) && distance <= roadLimit) return true;
    }
    return slopeAt(x, z) <= slopeLimit;
  }

  return { slopeAt, walkableAt };
}

const defaultWalkable = createWalkable();
let testWalkable = null;
let testSlope = null;

export function setWalkableForTest(walkableFn, slopeFn = null) {
  testWalkable = typeof walkableFn === 'function' ? walkableFn : null;
  testSlope = typeof slopeFn === 'function' ? slopeFn : null;
  searchMemo.clear();
}

// Route searches ask about the same grid points again and again, so their
// answers are kept here. The terrain never changes, so a kept answer stays true.
const SEARCH_MEMO_LIMIT = 300000;
const MEMO_HALF = 33554432;
const MEMO_SPAN = 67108864;
const searchMemo = new Map();

export function cachedWalkableAt(x, z) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
  const key = (Math.round(x * 1000) + MEMO_HALF) * MEMO_SPAN + (Math.round(z * 1000) + MEMO_HALF);
  const known = searchMemo.get(key);
  if (known !== undefined) return known;
  const value = walkableAt(x, z);
  if (searchMemo.size >= SEARCH_MEMO_LIMIT) searchMemo.clear();
  searchMemo.set(key, value);
  return value;
}

export const walkableAt = (x, z) =>
  testWalkable ? !!testWalkable(x, z) : defaultWalkable.walkableAt(x, z);

export const slopeAt = (x, z) =>
  testSlope ? testSlope(x, z) : defaultWalkable.slopeAt(x, z);
