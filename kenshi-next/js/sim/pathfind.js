export const PATHFIND = Object.freeze({
  cell: 8,
  maxNodes: 4000,
  lineSampleStep: 2,
  searchSampleStep: 4,
  tickNodeBudget: 32,
  tickTotalNodeBudget: 128,
});

const DIRECTIONS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
  [1, -1],
  [1, 1],
  [-1, 1],
  [-1, -1],
];

// Grid keys are plain numbers so the maps stay cheap during long searches.
const KEY_SPAN = 2097152;
const KEY_HALF = 1048576;
const POINT_SPAN = 67108864;
const POINT_HALF = 33554432;

function keyOf(ix, iz) {
  return (ix + KEY_HALF) * KEY_SPAN + (iz + KEY_HALF);
}

function pointKey(x, z) {
  return (Math.round(x * 1000) + POINT_HALF) * POINT_SPAN + (Math.round(z * 1000) + POINT_HALF);
}

function directionIndex(dx, dz) {
  return (dx + 1) * 3 + (dz + 1);
}

function compareNodes(a, b) {
  if (a.f !== b.f) return a.f - b.f;
  if (a.h !== b.h) return a.h - b.h;
  if (a.iz !== b.iz) return a.iz - b.iz;
  if (a.ix !== b.ix) return a.ix - b.ix;
  return a.order - b.order;
}

function makeHeap() {
  const items = [];
  return {
    get size() {
      return items.length;
    },
    push(value) {
      items.push(value);
      let i = items.length - 1;
      while (i > 0) {
        const parent = (i - 1) >> 1;
        if (compareNodes(items[parent], value) <= 0) break;
        items[i] = items[parent];
        i = parent;
      }
      items[i] = value;
    },
    pop() {
      if (items.length === 0) return null;
      const root = items[0];
      const last = items.pop();
      if (items.length > 0) {
        let i = 0;
        while (true) {
          const left = i * 2 + 1;
          const right = left + 1;
          if (left >= items.length) break;
          let child = left;
          if (right < items.length && compareNodes(items[right], items[left]) < 0) child = right;
          if (compareNodes(last, items[child]) <= 0) break;
          items[i] = items[child];
          i = child;
        }
        items[i] = last;
      }
      return root;
    },
  };
}

function finiteOption(value, fallback, min, max) {
  return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
}

export function createPathSearch(walkableAt, sx, sz, gx, gz, opts = {}) {
  const cell = finiteOption(opts.cell, PATHFIND.cell, 2, 64);
  const maxNodes = Math.floor(finiteOption(opts.maxNodes, PATHFIND.maxNodes, 1, 1000000));
  const sampleStep = finiteOption(opts.lineSampleStep, PATHFIND.lineSampleStep, 0.5, 2);
  const searchSampleStep = finiteOption(
    opts.searchSampleStep,
    cell > 16 ? 8 : PATHFIND.searchSampleStep,
    0.5,
    16
  );
  const heuristicWeight = finiteOption(opts.heuristicWeight, 1.35, 1, 2);
  const canWalk = typeof walkableAt === 'function' ? walkableAt : () => false;
  const records = new Map();
  const closed = new Set();
  const heap = makeHeap();
  const lineCache = new Map();
  const edgeCache = new Map();
  const maxCacheEntries = Math.max(2048, Math.min(30000, Math.floor(maxNodes * 1.5)));
  let order = 0;
  let expanded = 0;
  let done = false;
  let goalFound = false;
  let nearestKey = null;
  let nearestH = Infinity;
  let nearestG = Infinity;
  let startKey = null;
  let goalKeys = new Set();
  let goalPoints = [];
  let goalX = gx;
  let goalZ = gz;
  let exactGoal = false;
  let startConnect = false;
  let validInput = [sx, sz, gx, gz].every(Number.isFinite);

  function isWalkable(x, z) {
    const cacheKey = pointKey(x, z);
    if (lineCache.has(cacheKey)) return lineCache.get(cacheKey);
    const value = !!canWalk(x, z);
    lineCache.set(cacheKey, value);
    // Dropping the whole memo is cheaper than trimming the oldest entry one by one.
    if (lineCache.size > maxCacheEntries) lineCache.clear();
    return value;
  }

  function lineWalkable(ax, az, bx, bz) {
    const length = Math.hypot(bx - ax, bz - az);
    const count = Math.max(1, Math.ceil(length / sampleStep));
    for (let i = 0; i <= count; i += 1) {
      const t = i / count;
      if (!isWalkable(ax + (bx - ax) * t, az + (bz - az) * t)) return false;
    }
    return true;
  }

  function edgeWalkable(ax, az, bx, bz) {
    const length = Math.hypot(bx - ax, bz - az);
    const count = Math.max(1, Math.ceil(length / searchSampleStep));
    for (let i = 0; i <= count; i += 1) {
      const t = i / count;
      if (!isWalkable(ax + (bx - ax) * t, az + (bz - az) * t)) return false;
    }
    return true;
  }

  function boundaryPenalty(x, z) {
    const probe = Math.min(2, cell / 4);
    let blocked = 0;
    if (!isWalkable(x + probe, z)) blocked += 1;
    if (!isWalkable(x - probe, z)) blocked += 1;
    if (!isWalkable(x, z + probe)) blocked += 1;
    if (!isWalkable(x, z - probe)) blocked += 1;
    return blocked * cell * 0.8;
  }

  function nearestGridPoints(x, z, radius, limit, requireConnector) {
    const cx = Math.round(x / cell);
    const cz = Math.round(z / cell);
    const points = [];
    for (let r = 0; r <= radius; r += 1) {
      for (let ix = cx - r; ix <= cx + r; ix += 1) {
        for (let iz = cz - r; iz <= cz + r; iz += 1) {
          if (r > 0 && Math.max(Math.abs(ix - cx), Math.abs(iz - cz)) !== r) continue;
          const px = ix * cell;
          const pz = iz * cell;
          if (!isWalkable(px, pz)) continue;
          points.push({ ix, iz, x: px, z: pz, distance: Math.hypot(px - x, pz - z) });
        }
      }
    }
    points.sort((a, b) =>
      a.distance - b.distance || a.iz - b.iz || a.ix - b.ix
    );
    if (!requireConnector) return points.slice(0, limit);
    const connected = [];
    for (const point of points) {
      if (!lineWalkable(x, z, point.x, point.z)) continue;
      connected.push(point);
      if (connected.length >= limit) break;
    }
    return connected;
  }

  function heuristic(ix, iz) {
    const x = ix * cell;
    const z = iz * cell;
    let best = Infinity;
    for (const point of goalPoints) {
      const d = Math.hypot(x - point.x, z - point.z);
      if (d < best) best = d;
    }
    if (!Number.isFinite(best)) return Math.hypot(x - goalX, z - goalZ);
    return best;
  }

  function rememberBest(record) {
    const h = record.h;
    if (
      h < nearestH ||
      (h === nearestH && record.g < nearestG) ||
      (h === nearestH && record.g === nearestG && (record.iz < records.get(nearestKey)?.iz ||
        (record.iz === records.get(nearestKey)?.iz && record.ix < records.get(nearestKey)?.ix)))
    ) {
      nearestKey = record.key;
      nearestH = h;
      nearestG = record.g;
    }
  }

  function pushRecord(ix, iz, g, parent) {
    const key = keyOf(ix, iz);
    const old = records.get(key);
    if (old && old.g <= g) return;
    const h = heuristic(ix, iz);
    const record = {
      key, ix, iz, x: ix * cell, z: iz * cell, g, h, f: g + h * heuristicWeight, parent, order: order++,
    };
    records.set(key, record);
    heap.push(record);
    rememberBest(record);
  }

  if (validInput) {
    const startIsWalkable = isWalkable(sx, sz);
    const startCandidates = nearestGridPoints(sx, sz, 5, 24, startIsWalkable);
    const goalIsWalkable = isWalkable(gx, gz);
    const goalCandidates = nearestGridPoints(gx, gz, 5, 12, false);
    if (startCandidates.length > 0) {
      const start = startCandidates[0];
      startKey = keyOf(start.ix, start.iz);
      startConnect = startIsWalkable && lineWalkable(sx, sz, start.x, start.z);
      goalX = gx;
      goalZ = gz;
      const connectedGoals = [];
      if (goalIsWalkable) {
        for (const point of goalCandidates) {
          if (!lineWalkable(point.x, point.z, gx, gz)) continue;
          connectedGoals.push(point);
          if (connectedGoals.length >= 4) break;
        }
      }
      exactGoal = connectedGoals.length > 0;
      if (exactGoal) {
        goalKeys = new Set(connectedGoals.map((point) => keyOf(point.ix, point.iz)));
        goalPoints = connectedGoals.map((point) => ({ x: point.x, z: point.z }));
      } else if (goalCandidates.length > 0) {
        const nearestGoal = goalCandidates[0];
        goalX = nearestGoal.x;
        goalZ = nearestGoal.z;
        const selectedGoals = goalCandidates.slice(0, 12);
        goalKeys = new Set(selectedGoals.map((point) => keyOf(point.ix, point.iz)));
        goalPoints = selectedGoals.map((point) => ({ x: point.x, z: point.z }));
      }
      records.set(startKey, {
        key: startKey,
        ix: start.ix,
        iz: start.iz,
        x: start.x,
        z: start.z,
        g: 0,
        h: 0,
        f: 0,
        parent: null,
        order: order++,
      });
      const startRecord = records.get(startKey);
      startRecord.h = heuristic(start.ix, start.iz);
      startRecord.f = startRecord.h * heuristicWeight;
      heap.push(startRecord);
      rememberBest(startRecord);
    } else {
      validInput = false;
      done = true;
    }
  } else {
    done = true;
  }

  function relaxNeighbors(current) {
    for (const [dx, dz] of DIRECTIONS) {
      const ix = current.ix + dx;
      const iz = current.iz + dz;
      const x = ix * cell;
      const z = iz * cell;
      if (!isWalkable(x, z)) continue;
      if (dx !== 0 && dz !== 0) {
        if (!isWalkable((current.ix + dx) * cell, current.iz * cell)) continue;
        if (!isWalkable(current.ix * cell, (current.iz + dz) * cell)) continue;
      }
      const nextKey = keyOf(ix, iz);
      const edgeKey = current.key < nextKey
        ? current.key * 9 + directionIndex(dx, dz)
        : nextKey * 9 + directionIndex(-dx, -dz);
      let edgeOk = edgeCache.get(edgeKey);
      if (edgeOk === undefined) {
        edgeOk = edgeWalkable(current.x, current.z, x, z);
        edgeCache.set(edgeKey, edgeOk);
        if (edgeCache.size > maxCacheEntries) edgeCache.clear();
      }
      if (!edgeOk) continue;
      const stepCost = cell * (dx !== 0 && dz !== 0 ? Math.SQRT2 : 1);
      pushRecord(ix, iz, current.g + stepCost + (cell <= 32 ? boundaryPenalty(x, z) : 0), current.key);
    }
  }

  function advance(nodeBudget = PATHFIND.tickNodeBudget) {
    if (done) return 0;
    const budget = Math.floor(finiteOption(nodeBudget, PATHFIND.tickNodeBudget, 1, 1000000));
    let used = 0;
    while (heap.size > 0 && used < budget && expanded < maxNodes) {
      const current = heap.pop();
      if (!current || records.get(current.key) !== current || closed.has(current.key)) continue;
      closed.add(current.key);
      expanded += 1;
      used += 1;
      if (goalKeys.has(current.key)) {
        goalFound = true;
        nearestKey = current.key;
        done = true;
        break;
      }
      relaxNeighbors(current);
    }
    if (heap.size === 0 || expanded >= maxNodes) done = true;
    return used;
  }

  function makeResult() {
    const endKey = nearestKey || startKey;
    if (!endKey || !records.has(endKey)) {
      return { ok: false, points: [], reachedGoal: false, expanded };
    }
    const chain = [];
    let current = records.get(endKey);
    while (current) {
      chain.push({ x: current.x, z: current.z });
      current = current.parent ? records.get(current.parent) : null;
    }
    chain.reverse();

    const anchors = [];
    if (startConnect && chain.length > 0 && lineWalkable(sx, sz, chain[0].x, chain[0].z)) {
      anchors.push({ x: sx, z: sz });
    }
    for (const point of chain) {
      const previous = anchors[anchors.length - 1];
      if (!previous || Math.hypot(point.x - previous.x, point.z - previous.z) > 0.001) anchors.push(point);
    }
    if (goalFound && exactGoal && isWalkable(gx, gz)) {
      const last = anchors[anchors.length - 1];
      if (!last || Math.hypot(gx - last.x, gz - last.z) > 0.001) anchors.push({ x: gx, z: gz });
    }

    const points = [];
    if (anchors.length > 0) {
      points.push(anchors[0]);
      let index = 0;
      while (index < anchors.length - 1) {
      // Keep coarse-route legs short enough for actor collision radii to follow
      // the same safe corridor that the centre-line samples validated.
      let next = Math.min(anchors.length - 1, index + 8);
        while (next > index + 1 && !lineWalkable(
          anchors[index].x,
          anchors[index].z,
          anchors[next].x,
          anchors[next].z
        )) next -= 1;
        points.push(anchors[next]);
        index = next;
      }
    }
    const safePoints = [];
    if (points.length > 0) {
      safePoints.push(points[0]);
      for (let i = 1; i < points.length; i += 1) {
        if (!lineWalkable(
          safePoints[safePoints.length - 1].x,
          safePoints[safePoints.length - 1].z,
          points[i].x,
          points[i].z
        )) break;
        safePoints.push(points[i]);
      }
    }
    return {
      ok: safePoints.length > 0,
      points: safePoints,
      reachedGoal: goalFound && safePoints.length === points.length,
      expanded,
    };
  }

  return {
    advance,
    get done() {
      return done;
    },
    get expanded() {
      return expanded;
    },
    result: makeResult,
  };
}

export function findPath(walkableAt, sx, sz, gx, gz, opts = {}) {
  const search = createPathSearch(walkableAt, sx, sz, gx, gz, opts);
  while (!search.done) search.advance(Math.min(4096, opts.maxNodes || PATHFIND.maxNodes));
  return search.result();
}
