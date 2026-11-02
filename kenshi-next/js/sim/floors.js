import { heightAt } from './terrain.js';

export const FLOOR_RISE = 2.55;
export const ROOF_STAIR_RATIO = 0.82;
export const SECOND_FLOOR_RATIO = 0.35;

const WALL_T = 0.52;

function floorHash(...parts) {
  let h = 2166136261 >>> 0;
  for (const part of parts) {
    const value = String(part);
    for (let i = 0; i < value.length; i += 1) {
      h ^= value.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    h ^= 0x2f;
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

export function houseBaseY(house) {
  if (!house) return 0;
  return Math.min(
    heightAt(house.x - house.w / 2, house.z - house.d / 2),
    heightAt(house.x + house.w / 2, house.z - house.d / 2),
    heightAt(house.x - house.w / 2, house.z + house.d / 2),
    heightAt(house.x + house.w / 2, house.z + house.d / 2),
    heightAt(house.x, house.z),
  ) - 0.08;
}

// Keep the ground floor above the highest terrain sample under the footprint.
// Houses are placed over imperfect terrain; anchoring an indoor deck to the
// lowest wall corner can bury it under the ground in the middle of the room.
export function houseFloorY(house) {
  if (!house) return 0;
  const samples = [
    heightAt(house.x - house.w / 2 + 0.22, house.z - house.d / 2 + 0.22),
    heightAt(house.x + house.w / 2 - 0.22, house.z - house.d / 2 + 0.22),
    heightAt(house.x - house.w / 2 + 0.22, house.z + house.d / 2 - 0.22),
    heightAt(house.x + house.w / 2 - 0.22, house.z + house.d / 2 - 0.22),
    heightAt(house.x, house.z),
  ];
  return Math.max(...samples) + 0.035;
}

export function actorWorldY(house, floor, x, z) {
  if (!Number.isInteger(floor) || floor <= 0) return heightAt(x, z);
  return houseBaseY(house) + floorHeightOffset(house, floor);
}

function localToWorld(h, a, v) {
  const off = h.depth / 2 - WALL_T - v;
  return {
    x: Math.round((h.x + h.ux * a + h.nx * off) * 1000) / 1000,
    z: Math.round((h.z + h.uz * a + h.nz * off) * 1000) / 1000,
  };
}

function partitionBoxes(h, v, floor = 0, openingCenters = [h.a || 0]) {
  const edge = h.len / 2 - 0.42;
  const minGap = Math.min(0.82, Math.max(0.62, h.len * 0.09));
  const openings = (Array.isArray(openingCenters) ? openingCenters : [openingCenters])
    .map((entry) => {
      const halfGap = Math.max(minGap, Number(entry?.halfGap) || minGap);
      const center = Math.max(-edge + halfGap, Math.min(edge - halfGap, Number(entry?.center ?? entry) || 0));
      return { center, halfGap };
    })
    .filter((entry, index, all) => all.findIndex((item) => Math.abs(item.center - entry.center) < 0.01) === index)
    .sort((a, b) => a.center - b.center);
  const parts = [];
  let cursor = -edge;
  const intervals = [];
  for (const opening of openings) {
    const lo = Math.max(-edge, opening.center - opening.halfGap);
    const hi = Math.min(edge, opening.center + opening.halfGap);
    if (lo > cursor + 0.01) intervals.push([cursor, lo]);
    cursor = Math.max(cursor, hi);
  }
  if (edge > cursor + 0.01) intervals.push([cursor, edge]);
  for (const [lo, hi] of intervals) {
    if (hi - lo < 0.25) continue;
    const p = localToWorld(h, (lo + hi) / 2, v);
    const alongX = Math.abs(h.ux) > 0.5;
    parts.push(alongX
      ? { x: p.x, z: p.z, hw: (hi - lo) / 2, hd: 0.11, floor, height: 2.45 }
      : { x: p.x, z: p.z, hw: 0.11, hd: (hi - lo) / 2, floor, height: 2.45 });
  }
  return parts;
}

function configureHouse(h, levels, roofStairs) {
  h.levels = levels;
  h.floorRise = FLOOR_RISE;
  h.roofFloor = levels + 1;
  // The upper floor has a normal ceiling and the roof edge steps down gently to nearby single-story roofs.
  h.roofHeight = levels ? 4.55 : 3.15;
  const partitionV = Math.max(1.7, Math.min(h.depth - 1.25, h.depth * 0.52));
  const stairA = -h.len / 2 + 0.72;
  const doorA = h.a || 0;
  const openings = roofStairs
    ? [{ center: doorA, halfGap: 1.25 }, { center: (doorA + stairA) / 2, halfGap: 0.68 }, { center: stairA, halfGap: 0.62 }]
    : [{ center: doorA, halfGap: 1.25 }];
  h.partitions = [...partitionBoxes(h, partitionV, 0, openings), ...(levels ? partitionBoxes(h, partitionV, 1, openings) : [])];
  h.partitionNav = {
    v: partitionV,
    plane: h.depth / 2 - WALL_T - partitionV,
    openings: [...openings],
    halfGap: 1.25,
  };
  const hide = localToWorld(h, h.len * 0.27, h.depth * 0.72);
  const lowV = 0.78;
  const roofV = Math.max(lowV + 1.7, Math.min(h.depth - 0.82, 4.25));
  const stairPoints = [];
  if (roofStairs) {
    const lower = localToWorld(h, stairA, lowV);
    stairPoints.push({ ...lower, floor: 0, y: 0 });
    if (levels) {
      const midV = lowV + (roofV - lowV) * 0.54;
      stairPoints.push({ ...localToWorld(h, stairA, midV), floor: 1, y: FLOOR_RISE });
    }
    stairPoints.push({ ...localToWorld(h, stairA, roofV), floor: h.roofFloor, y: h.roofHeight });
    h.stairs = {
      wall: 'inside-left',
      wallDistance: 0.72,
      parallel: true,
      width: 0.74,
      points: stairPoints,
    };
    h.stairEntry = stairPoints[0];
    h.roofEntry = stairPoints[stairPoints.length - 1];
  } else {
    h.stairs = null;
    h.stairEntry = null;
    h.roofEntry = null;
  }
  h.hideZones = [
    { ...hide, hw: 0.8, hd: 0.7, floor: 0, kind: 'partition' },
    ...(h.stairEntry ? [{ ...h.stairEntry, hw: 0.62, hd: 0.7, floor: 0, kind: 'stairs' }] : []),
    ...(levels ? [{ ...localToWorld(h, h.len * 0.27, h.depth * 0.73), hw: 0.8, hd: 0.72, floor: 1, kind: 'upper-room' }] : []),
  ];
  h.roofGuard = false;
  h.guardPoint = h.roofEntry ? localToWorld(h, 0.12, Math.min(h.depth - 0.75, Math.max(1.35, h.depth * 0.57))) : null;
  return h;
}

export function configureTownFloors(houses) {
  const list = Array.isArray(houses) ? houses : [];
  if (!list.length) return list;
  const eligible = list.filter((h) => h.w >= 5.8 && h.d >= 5.8);
  const storyCount = Math.min(eligible.length, Math.max(1, Math.round(list.length * SECOND_FLOOR_RATIO)));
  const edgeGap = (a, b) => Math.hypot(
    Math.max(0, Math.abs(a.x - b.x) - (a.w + b.w) / 2),
    Math.max(0, Math.abs(a.z - b.z) - (a.d + b.d) / 2),
  );
  const pair = [];
  const pairHouses = list.filter((h) => h.w >= 5.5 && h.d >= 5.5);
  for (let i = 0; i < pairHouses.length; i += 1) {
    for (let j = i + 1; j < pairHouses.length; j += 1) {
      const gap = edgeGap(pairHouses[i], pairHouses[j]);
      if (gap <= 2.5) pair.push({ a: pairHouses[i], b: pairHouses[j], gap });
    }
  }
  pair.sort((a, b) => a.gap - b.gap || a.a.id.localeCompare(b.a.id) || a.b.id.localeCompare(b.b.id));
  const stories = new Set();
  const ranked = eligible.slice().sort((a, b) => floorHash('story', a.id) - floorHash('story', b.id) || a.id.localeCompare(b.id));
  if (pair.length && storyCount >= 1) {
    const adjacent = pair[0];
    const first = ranked.find((house) => house.id === adjacent.a.id || house.id === adjacent.b.id);
    if (first) stories.add(first.id);
    if (storyCount >= 2) {
      const second = ranked.find((house) => house.id !== first?.id && (house.id === adjacent.a.id || house.id === adjacent.b.id));
      if (second) stories.add(second.id);
    }
  }
  for (const h of ranked) {
    if (stories.size >= storyCount) break;
    stories.add(h.id);
  }

  const stairCount = Math.min(list.length, Math.max(1, Math.ceil(list.length * 0.7), Math.round(list.length * ROOF_STAIR_RATIO)));
  const stairs = new Set([...stories]);
  if (pair.length) {
    stairs.add(pair[0].a.id);
    stairs.add(pair[0].b.id);
  }
  const stairRank = list.slice().sort((a, b) => floorHash('roof-stairs', a.id) - floorHash('roof-stairs', b.id) || a.id.localeCompare(b.id));
  for (const h of stairRank) {
    if (stairs.size >= stairCount) break;
    stairs.add(h.id);
  }
  for (const h of list) configureHouse(h, stories.has(h.id) ? 1 : 0, stairs.has(h.id));

  const guards = list.filter((h) => h.stairs).slice().sort((a, b) => floorHash('roof-guard', a.id) - floorHash('roof-guard', b.id) || a.id.localeCompare(b.id));
  const guardCount = Math.min(guards.length, Math.max(2, Math.round(list.length * 0.3)));
  for (const h of guards.slice(0, guardCount)) h.roofGuard = true;
  return list;
}

export function configureOwnedHouse(house) {
  return configureHouse(house, 0, true);
}

export function actorFloor(actor) {
  return Number.isInteger(actor?.floor) && actor.floor >= 0 ? actor.floor : 0;
}

export function houseRoofFloor(house) {
  return Number.isInteger(house?.roofFloor) ? house.roofFloor : Math.max(1, Number(house?.levels) + 1 || 1);
}

export function floorHeightOffset(house, floor) {
  const level = Math.max(0, Number.isFinite(floor) ? Math.floor(floor) : 0);
  const roofFloor = houseRoofFloor(house);
  if (level >= roofFloor) return Number.isFinite(house?.roofHeight) ? house.roofHeight : FLOOR_RISE * roofFloor;
  return level * (Number.isFinite(house?.floorRise) ? house.floorRise : FLOOR_RISE);
}

export function isSameFloor(a, b) {
  return actorFloor(a) === actorFloor(b);
}

export function coverAt(house, actor) {
  const floor = actorFloor(actor);
  for (const zone of house?.hideZones || []) {
    if (zone.floor !== floor) continue;
    if (Math.abs(actor.x - zone.x) <= zone.hw && Math.abs(actor.z - zone.z) <= zone.hd) return zone.kind;
  }
  return null;
}

export function hiddenFloorIndices(house, viewFloor) {
  if (!house || !Number.isInteger(viewFloor)) return [];
  const roofFloor = houseRoofFloor(house);
  const hidden = [];
  for (let floor = viewFloor + 1; floor <= roofFloor; floor += 1) hidden.push(floor);
  return hidden;
}

export function resolveViewFloor({ manualFloor = null, trackedFloor = null, insideHouse = false } = {}) {
  if (!insideHouse) return null;
  if (Number.isInteger(manualFloor) && manualFloor >= 0) return manualFloor;
  return Number.isInteger(trackedFloor) && trackedFloor >= 0 ? trackedFloor : 0;
}

export function clampViewFloor(house, requested) {
  return Math.max(0, Math.min(houseRoofFloor(house), Math.floor(Number(requested) || 0)));
}
