// Road relief: deterministic, precomputed vertical profiles for the road network.
// No imports from terrain.js (terrain passes the base height in) so there is no cycle.

export const ROAD_RELIEF = Object.freeze({
  sampleStep: 20,          // m between profile samples
  roadWidth: 5,            // flat half-width of the road
  shoulder: 20,            // preserve the centreline profile through the shoulder
  wideFlat: 400,           // minimum flat-land return distance to the terrain
  wideMountain: 300,       // minimum mountain return distance to the terrain
  gradeFlat: 0.16,
  gradeMountain: 0.28,
  slopeFlat: 0.5,
  slopeMountain: 0.9,
  startHalf: 200,
  startClear: 500,
  startFadeDistance: 300,
  smoothHalf: 75,          // half width of the ~150 m moving average
  kMin: 0.5,
  kMax: 1.35,
  kWave: 3000,
  clampPasses: 6,
  clampExtra: 24,          // extra passes only if the hard grade limit is still exceeded
  gradeHard: 0.30,
  maxReach: 900,
  cellSize: 128,
  nearCell: 32,            // fine grid for roadDistance near the road
  nearReach: 24,
  alignmentCell: 128,
  alignmentDistance: 50,
  alignmentParallel: 0.85,
  crossDistance: 30,       // m, crossing roads share heights within this distance
  centerBlendWidth: 120,
  centerDominanceWidth: 40,
  weightEps: 1,            // m^2 added to d^2 in the per-segment blend weight
  reachFade: 80,
  padRamp: 100,            // m, settlement pad ramp width (matches terrain.js)
  nearestSoft: 4,          // m, soft pick between roads at nearly equal distance
});

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
function lerp(a, b, t) { return a + (b - a) * t; }

function cellKey(ix, iz) {
  return (ix + 50000) * 100000 + (iz + 50000);
}

// Resample a polyline at roughly `step` metres. Every original vertex is kept
// so the resampled line never cuts a corner (the centreline must stay exact).
function resamplePolyline(points, step) {
  const out = [{ x: points[0][0], z: points[0][1], s: 0, vertex: true }];
  let s = 0, carry = 0;
  for (let i = 1; i < points.length; i++) {
    const ax = points[i - 1][0], az = points[i - 1][1];
    const bx = points[i][0], bz = points[i][1];
    const dx = bx - ax, dz = bz - az;
    const len = Math.sqrt(dx * dx + dz * dz);
    if (len < 1e-9) continue;
    let d = step - carry;
    while (d < len - 1e-9) {
      const t = d / len;
      out.push({ x: ax + dx * t, z: az + dz * t, s: s + d, vertex: false });
      d += step;
    }
    const tail = out[out.length - 1];
    const vs = s + len;
    if (vs - tail.s <= 1e-6) {
      // The vertex is already represented by the tail sample.
    } else if (vs - tail.s < step * 0.5 && !tail.vertex) {
      tail.x = bx; tail.z = bz; tail.s = vs; tail.vertex = true;
    } else {
      out.push({ x: bx, z: bz, s: vs, vertex: true });
    }
    carry = 0;
    s = vs;
  }
  return out;
}

function clampProfile(profile, cfg) {
  const { n, s, gm, r, fixed, fixedHeight } = profile;
  const gseg = new Float64Array(n);
  for (let i = 1; i < n; i++) gseg[i] = 0.5 * (gm[i - 1] + gm[i]);

  function forwardPass() {
    for (let i = 1; i < n; i++) {
      if (fixed[i]) { r[i] = fixedHeight[i]; continue; }
      const lim = gseg[i] * Math.max(1e-9, s[i] - s[i - 1]);
      const lo = r[i - 1] - lim, hi = r[i - 1] + lim;
      if (r[i] < lo) r[i] = lo; else if (r[i] > hi) r[i] = hi;
    }
  }
  function backwardPass() {
    for (let i = n - 2; i >= 0; i--) {
      if (fixed[i]) { r[i] = fixedHeight[i]; continue; }
      const lim = gseg[i + 1] * Math.max(1e-9, s[i + 1] - s[i]);
      const lo = r[i + 1] - lim, hi = r[i + 1] + lim;
      if (r[i] < lo) r[i] = lo; else if (r[i] > hi) r[i] = hi;
    }
  }
  function gradeNow() {
    let mg = 0;
    for (let i = 1; i < n; i++) {
      const ds = s[i] - s[i - 1];
      if (ds > 1e-9) mg = Math.max(mg, Math.abs(r[i] - r[i - 1]) / ds);
    }
    return mg;
  }

  for (let pass = 0; pass < cfg.clampPasses; pass++) { forwardPass(); backwardPass(); }
  forwardPass();
  for (let extra = 0; extra < cfg.clampExtra && gradeNow() > cfg.gradeHard; extra++) {
    backwardPass();
    forwardPass();
  }
  for (let i = 0; i < n; i++) if (fixed[i]) r[i] = fixedHeight[i];
  return gradeNow();
}

export function createRoadRelief({ roads, baseHeight, settlements = [], lake = null, mountainFactor = () => 0 }) {
  const cfg = ROAD_RELIEF;
  const roadCount = roads.length;
  const padZones = settlements.map(p => {
    const r = (p.radius || 60) + 40 + cfg.padRamp;
    return { x: p.x, z: p.z, r2: r * r };
  });

  // Pass 1: resample each road while retaining every original vertex.
  const roadSamples = roads.map((road, roadIndex) => ({
    road,
    roadIndex,
    pts: resamplePolyline(road.points, cfg.sampleStep)
  }));

  const tangents = roadSamples.map(rs => {
    const out = new Float64Array(rs.pts.length * 2);
    for (let i = 0; i < rs.pts.length; i++) {
      const a = rs.pts[Math.max(0, i - 1)], b = rs.pts[Math.min(rs.pts.length - 1, i + 1)];
      const dx = b.x - a.x, dz = b.z - a.z;
      const len = Math.hypot(dx, dz) || 1;
      out[i * 2] = dx / len;
      out[i * 2 + 1] = dz / len;
    }
    return out;
  });
  const alignmentGrid = new Map();
  for (const rs of roadSamples) {
    for (let pi = 0; pi < rs.pts.length; pi++) {
      const p = rs.pts[pi];
      const cx = Math.floor(p.x / cfg.alignmentCell), cz = Math.floor(p.z / cfg.alignmentCell);
      const key = cellKey(cx, cz);
      let list = alignmentGrid.get(key);
      if (!list) alignmentGrid.set(key, list = []);
      list.push(rs.roadIndex, pi, p.x, p.z);
    }
  }
  const alignmentPairs = [];
  const crossPairs = [];
  const alignmentDistance2 = cfg.alignmentDistance * cfg.alignmentDistance;
  const crossDistance2 = cfg.crossDistance * cfg.crossDistance;
  for (const rs of roadSamples) {
    const ta = tangents[rs.roadIndex];
    for (let pi = 0; pi < rs.pts.length; pi++) {
      const p = rs.pts[pi];
      const cx = Math.floor(p.x / cfg.alignmentCell), cz = Math.floor(p.z / cfg.alignmentCell);
      for (let ix = cx - 1; ix <= cx + 1; ix++) {
        for (let iz = cz - 1; iz <= cz + 1; iz++) {
          const list = alignmentGrid.get(cellKey(ix, iz));
          if (!list) continue;
          for (let j = 0; j < list.length; j += 4) {
            const otherRoad = list[j];
            if (otherRoad >= rs.roadIndex) continue;
            const dx = p.x - list[j + 2], dz = p.z - list[j + 3];
            if (dx * dx + dz * dz > alignmentDistance2) continue;
            const otherIndex = list[j + 1], tb = tangents[otherRoad];
            const dot = ta[pi * 2] * tb[otherIndex * 2] + ta[pi * 2 + 1] * tb[otherIndex * 2 + 1];
            if (Math.abs(dot) < cfg.alignmentParallel) {
              // Crossing roads are pinned to one shared height right at the crossing.
              if (dx * dx + dz * dz <= crossDistance2) crossPairs.push({ a: otherRoad, ai: otherIndex, b: rs.roadIndex, bi: pi });
              continue;
            }
            alignmentPairs.push({ a: otherRoad, ai: otherIndex, b: rs.roadIndex, bi: pi });
          }
        }
      }
    }
  }

  // Pass 2: build each road's vertical profile.
  const profiles = roadSamples.map(rs => {
    const pts = rs.pts;
    const n = pts.length;
    const x = new Float64Array(n), z = new Float64Array(n), s = new Float64Array(n);
    const g = new Float64Array(n), m = new Float64Array(n);
    const t = new Float64Array(n), r = new Float64Array(n);
    const gm = new Float64Array(n);

    for (let i = 0; i < n; i++) {
      const p = pts[i];
      x[i] = p.x; z[i] = p.z; s[i] = p.s;
      g[i] = baseHeight(p.x, p.z);
      m[i] = clamp(mountainFactor(p.x, p.z), 0, 1);
    }
    for (let i = 0; i < n; i++) {
      gm[i] = lerp(cfg.gradeFlat, cfg.gradeMountain, m[i]);
    }

    // Target, then a ~150 m moving average (read from the unmodified target).
    const target = new Float64Array(n);
    for (let i = 0; i < n; i++) target[i] = g[i];
    const half = Math.max(1, Math.round(cfg.smoothHalf / cfg.sampleStep));
    for (let i = 0; i < n; i++) {
      const lo = Math.max(0, i - half), hi = Math.min(n - 1, i + half);
      let sum = 0;
      for (let j = lo; j <= hi; j++) sum += target[j];
      t[i] = sum / (hi - lo + 1);
    }

    // Keep the start area and road ends attached to the surrounding terrain.
    const fixed = new Uint8Array(n);
    const fixedHeight = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const sx = Math.max(Math.abs(x[i]) - cfg.startHalf, 0);
      const sz = Math.max(Math.abs(z[i]) - cfg.startHalf, 0);
      if (sx * sx + sz * sz < cfg.startClear * cfg.startClear) {
        fixed[i] = 1;
        fixedHeight[i] = g[i];
      }
    }
    // Inside a settlement pad and its ramp the road lies on the padded ground,
    // so it leaves town on the ramp instead of climbing inside the pad.
    for (let i = 0; i < n; i++) {
      for (const p of padZones) {
        const dx = x[i] - p.x, dz = z[i] - p.z;
        if (dx * dx + dz * dz < p.r2) { fixed[i] = 1; fixedHeight[i] = g[i]; break; }
      }
    }
    fixed[0] = 1; fixed[n - 1] = 1;
    fixedHeight[0] = g[0]; fixedHeight[n - 1] = g[n - 1];
    for (let i = 0; i < n; i++) r[i] = fixed[i] ? fixedHeight[i] : t[i];

    const maxGrade = clampProfile({ n, s, gm, r, fixed, fixedHeight }, cfg);

    // Reach and stats.
    let maxWide = 0, maxDiffOverSlope = 0;
    for (let i = 0; i < n; i++) {
      const wide = lerp(cfg.wideFlat, cfg.wideMountain, m[i]);
      if (wide > maxWide) maxWide = wide;
      const sl = lerp(cfg.slopeFlat, cfg.slopeMountain, m[i]);
      const baseDiff = Math.abs(g[i] - r[i]);
      const reach = baseDiff / Math.max(0.05, sl);
      if (reach > maxDiffOverSlope) maxDiffOverSlope = reach;
    }
    const returnStart = cfg.roadWidth + cfg.shoulder;
    const R = Math.min(cfg.maxReach, Math.max(
      returnStart + cfg.reachFade + maxWide,
      returnStart + cfg.reachFade + maxDiffOverSlope * 1.5
    ));

    let minH = Infinity, maxH = -Infinity, mountainSamples = 0;
    for (let i = 0; i < n; i++) {
      if (r[i] < minH) minH = r[i];
      if (r[i] > maxH) maxH = r[i];
      if (m[i] >= 0.5) mountainSamples++;
    }
    return {
      roadIndex: rs.roadIndex,
      road: rs.road,
      n, x, z, s, g, m, gm, t, r, fixed, fixedHeight, R,
      length: s[n - 1],
      minH, maxH,
      rise: maxH - minH,
      maxGrade,
      mountainShare: n ? mountainSamples / n : 0
    };
  });

  const alignmentSums = profiles.map(p => new Float64Array(p.n));
  const alignmentCounts = profiles.map(p => new Uint16Array(p.n));
  for (const pair of alignmentPairs) {
    const a = profiles[pair.a], b = profiles[pair.b];
    const shared = a.fixed[pair.ai] ? a.fixedHeight[pair.ai]
      : b.fixed[pair.bi] ? b.fixedHeight[pair.bi]
        : 0.5 * (a.r[pair.ai] + b.r[pair.bi]);
    if (!a.fixed[pair.ai]) {
      alignmentSums[pair.a][pair.ai] += shared;
      alignmentCounts[pair.a][pair.ai]++;
    }
    if (!b.fixed[pair.bi]) {
      alignmentSums[pair.b][pair.bi] += shared;
      alignmentCounts[pair.b][pair.bi]++;
    }
  }

  const crossSums = profiles.map(p => new Float64Array(p.n));
  const crossCounts = profiles.map(p => new Uint16Array(p.n));
  for (const pair of crossPairs) {
    const a = profiles[pair.a], b = profiles[pair.b];
    const shared = a.fixed[pair.ai] ? a.fixedHeight[pair.ai]
      : b.fixed[pair.bi] ? b.fixedHeight[pair.bi]
        : 0.5 * (a.r[pair.ai] + b.r[pair.bi]);
    crossSums[pair.a][pair.ai] += shared; crossCounts[pair.a][pair.ai]++;
    crossSums[pair.b][pair.bi] += shared; crossCounts[pair.b][pair.bi]++;
  }
  for (let roadIndex = 0; roadIndex < profiles.length; roadIndex++) {
    const prof = profiles[roadIndex];
    for (let i = 0; i < prof.n; i++) {
      if (!prof.fixed[i] && crossCounts[roadIndex][i]) {
        prof.fixed[i] = 1;
        prof.fixedHeight[i] = crossSums[roadIndex][i] / crossCounts[roadIndex][i];
      }
    }
  }

  for (let roadIndex = 0; roadIndex < profiles.length; roadIndex++) {
    const prof = profiles[roadIndex];
    for (let i = 0; i < prof.n; i++) {
      if (prof.fixed[i]) prof.r[i] = prof.fixedHeight[i];
      else if (alignmentCounts[roadIndex][i]) {
        prof.t[i] = alignmentSums[roadIndex][i] / alignmentCounts[roadIndex][i];
        prof.r[i] = prof.t[i];
      } else prof.r[i] = prof.t[i];
    }
    prof.maxGrade = clampProfile(prof, cfg);
    let minH = Infinity, maxH = -Infinity, mountainSamples = 0;
    let maxWide = 0, maxDiffOverSlope = 0;
    for (let i = 0; i < prof.n; i++) {
      if (prof.r[i] < minH) minH = prof.r[i];
      if (prof.r[i] > maxH) maxH = prof.r[i];
      if (prof.m[i] >= 0.5) mountainSamples++;
      const wide = lerp(cfg.wideFlat, cfg.wideMountain, prof.m[i]);
      if (wide > maxWide) maxWide = wide;
      const slope = lerp(cfg.slopeFlat, cfg.slopeMountain, prof.m[i]);
      const reach = Math.abs(prof.g[i] - prof.r[i]) / Math.max(0.05, slope);
      if (reach > maxDiffOverSlope) maxDiffOverSlope = reach;
    }
    const returnStart = cfg.roadWidth + cfg.shoulder;
    prof.R = Math.min(cfg.maxReach, Math.max(
      returnStart + cfg.reachFade + maxWide,
      returnStart + cfg.reachFade + maxDiffOverSlope * 1.5
    ));
    prof.minH = minH;
    prof.maxH = maxH;
    prof.rise = maxH - minH;
    prof.mountainShare = prof.n ? mountainSamples / prof.n : 0;
  }

  // Segment index, struct-of-arrays in typed arrays for a tight query loop.
  // Per segment (stride SS): ax, az, dx, dz, invLen2, r0, dr, R.
  const SS = 8;
  let segCount = 0;
  for (const prof of profiles) segCount += prof.n - 1;
  const SEG = new Float64Array(segCount * SS);
  const SEG_ROAD = new Int32Array(segCount);
  segCount = 0;
  for (const prof of profiles) {
    for (let i = 1; i < prof.n; i++) {
      const ax = prof.x[i - 1], az = prof.z[i - 1];
      const dx = prof.x[i] - ax, dz = prof.z[i] - az;
      const len2 = dx * dx + dz * dz;
      if (len2 < 1e-9) continue;
      const o = segCount * SS;
      SEG[o] = ax; SEG[o + 1] = az; SEG[o + 2] = dx; SEG[o + 3] = dz;
      SEG[o + 4] = 1 / len2;
      SEG[o + 5] = prof.r[i - 1]; SEG[o + 6] = prof.r[i] - prof.r[i - 1];
      SEG[o + 7] = prof.R;
      SEG_ROAD[segCount] = prof.roadIndex;
      segCount++;
    }
  }

  // Distance from point to segment (used at build time only).
  function segDist(si, x, z) {
    const o = si * SS;
    const px = x - SEG[o], pz = z - SEG[o + 1];
    let u = (px * SEG[o + 2] + pz * SEG[o + 3]) * SEG[o + 4];
    if (u < 0) u = 0; else if (u > 1) u = 1;
    const ex = px - u * SEG[o + 2], ez = pz - u * SEG[o + 3];
    return Math.sqrt(ex * ex + ez * ez);
  }

  // Flat grid: a cell lists the segments that can be within `margin(seg)` of
  // some point in the cell (centre distance minus half the cell diagonal).
  function buildGrid(size, margin) {
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (let si = 0; si < segCount; si++) {
      const o = si * SS, mg = margin(si);
      const ax = SEG[o], az = SEG[o + 1], bx = ax + SEG[o + 2], bz = az + SEG[o + 3];
      x0 = Math.min(x0, ax - mg, bx - mg); x1 = Math.max(x1, ax + mg, bx + mg);
      z0 = Math.min(z0, az - mg, bz - mg); z1 = Math.max(z1, az + mg, bz + mg);
    }
    const gx0 = Math.floor(x0 / size), gz0 = Math.floor(z0 / size);
    const nx = Math.floor(x1 / size) - gx0 + 1, nz = Math.floor(z1 / size) - gz0 + 1;
    const lists = new Array(nx * nz);
    const half = size * Math.SQRT1_2;
    for (let si = 0; si < segCount; si++) {
      const o = si * SS, mg = margin(si);
      const ax = SEG[o], az = SEG[o + 1], bx = ax + SEG[o + 2], bz = az + SEG[o + 3];
      const ix0 = Math.floor((Math.min(ax, bx) - mg) / size) - gx0;
      const ix1 = Math.floor((Math.max(ax, bx) + mg) / size) - gx0;
      const iz0 = Math.floor((Math.min(az, bz) - mg) / size) - gz0;
      const iz1 = Math.floor((Math.max(az, bz) + mg) / size) - gz0;
      for (let ix = ix0; ix <= ix1; ix++) {
        for (let iz = iz0; iz <= iz1; iz++) {
          const cx = (ix + gx0 + 0.5) * size, cz = (iz + gz0 + 0.5) * size;
          if (segDist(si, cx, cz) - half > mg) continue;
          const c = iz * nx + ix;
          (lists[c] || (lists[c] = [])).push(si);
        }
      }
    }
    const start = new Int32Array(nx * nz + 1);
    let total = 0;
    for (let c = 0; c < nx * nz; c++) { start[c] = total; total += lists[c] ? lists[c].length : 0; }
    start[nx * nz] = total;
    const items = new Int32Array(total);
    for (let c = 0; c < nx * nz; c++) if (lists[c]) items.set(lists[c], start[c]);
    let used = 0;
    for (let c = 0; c < nx * nz; c++) if (lists[c]) used++;
    return { size, inv: 1 / size, gx0, gz0, nx, nz, start, items, used };
  }
  const grid = buildGrid(cfg.cellSize, si => SEG[si * SS + 7]);
  // Fine grid for the short road-distance query used by the road colouring.
  const near = buildGrid(cfg.nearCell, () => cfg.nearReach);

  // Query scratch. heightAt is synchronous, so these can be reused.
  // Per road we keep the true minimum distance plus a soft blend of the profile
  // over its candidate segments (weight (d2+eps)^-4, i.e. ~d^-8). A hard
  // nearest-segment pick steps on the inside of bends, where two far-apart
  // parts of the same road are equally near; the blend removes that step.
  const minD2 = new Float64Array(roadCount);
  const sw = new Float64Array(roadCount);
  const sr = new Float64Array(roadCount);
  const segR = new Float64Array(roadCount);
  const touched = new Int32Array(roadCount);
  minD2.fill(Infinity);

  function apply(x, z, h) {
    const ix = Math.floor(x * grid.inv) - grid.gx0, iz = Math.floor(z * grid.inv) - grid.gz0;
    if (ix < 0 || iz < 0 || ix >= grid.nx || iz >= grid.nz) return h;
    const c = iz * grid.nx + ix;
    const c0 = grid.start[c], c1 = grid.start[c + 1];
    if (c0 === c1) return h;
    const sx = Math.max(Math.abs(x) - cfg.startHalf, 0);
    const sz = Math.max(Math.abs(z) - cfg.startHalf, 0);
    const startDistance = Math.sqrt(sx * sx + sz * sz);
    const startFade = smooth(startDistance / cfg.startFadeDistance);
    if (startFade === 0) return h;
    const items = grid.items;

    let touchedCount = 0;
    for (let ci = c0; ci < c1; ci++) {
      const si = items[ci];
      const o = si * SS;
      const px = x - SEG[o], pz = z - SEG[o + 1];
      const dx = SEG[o + 2], dz = SEG[o + 3];
      let u = (px * dx + pz * dz) * SEG[o + 4];
      if (u < 0) u = 0; else if (u > 1) u = 1;
      const ex = px - u * dx, ez = pz - u * dz;
      const d2 = ex * ex + ez * ez;
      const R = SEG[o + 7];
      if (d2 > R * R) continue;
      const ri = SEG_ROAD[si];
      if (minD2[ri] === Infinity) {
        touched[touchedCount++] = ri;
        sw[ri] = 0; sr[ri] = 0;
        segR[ri] = R;
      }
      if (d2 < minD2[ri]) minD2[ri] = d2;
      let q = 1 / (d2 + cfg.weightEps);
      q *= q; q *= q;
      sw[ri] += q;
      sr[ri] += q * (SEG[o + 5] + SEG[o + 6] * u);
    }

    if (touchedCount === 0) return h;

    const w = cfg.roadWidth;
    let nearestRoadD = Infinity;
    for (let j = 0; j < touchedCount; j++) {
      const d = Math.sqrt(minD2[touched[j]]);
      if (d < nearestRoadD) nearestRoadD = d;
    }
    // The "nearest road" value is a soft pick: roads within a few metres of the
    // nearest distance share it, so switching between two roads makes no step.
    let sumW = 0, sumH = 0;
    let nearW = 0, nearH = 0;
    for (let j = 0; j < touchedCount; j++) {
      const ri = touched[j];
      const d = Math.sqrt(minD2[ri]);
      minD2[ri] = Infinity;
      const R = segR[ri];
      const iw = 1 / sw[ri];
      const r = sr[ri] * iw;
      let value;
      const returnStart = w + cfg.shoulder;
      const edge = R - cfg.reachFade;
      if (d <= returnStart) {
        value = r;
      } else {
        const width = Math.max(1, edge - returnStart);
        const blend = smooth((d - returnStart) / width);
        value = r + (h - r) * blend;
      }
      // Fade to h near the reach edge (always: the side clamp can still be
      // active at R where h differs from the centreline), and fade the blend
      // weight to 0 there too, so a road dropping out never makes a step.
      let fw = 1;
      if (d > edge) {
        const fade = smooth((d - edge) / cfg.reachFade);
        value += (h - value) * fade;
        fw = 1 - fade;
      }
      const nw = Math.exp((nearestRoadD - d) / cfg.nearestSoft);
      nearW += nw;
      nearH += nw * (value - h);
      const dd = d + 0.5;
      const wgt = fw / (dd * dd);
      sumW += wgt;
      sumH += (value - h) * wgt;
    }
    const nearestRoadValue = h + (nearH / nearW) * startFade;
    // Weighted mean of the per-road offsets; each offset is 0 at its own R.
    const networkValue = sumW > 0 ? h + (sumH / sumW) * startFade : h;
    const centerDelta = networkValue - nearestRoadValue;
    const centerWidth = Math.max(cfg.centerBlendWidth, Math.abs(centerDelta) * 1.5);
    const distanceMix = smooth((nearestRoadD - w) / centerWidth);
    const dominance = 1 - smooth((nearestRoadD - w) / cfg.centerDominanceWidth);
    const centerMix = 1 - dominance * (1 - distanceMix);
    return nearestRoadValue + (networkValue - nearestRoadValue) * centerMix;
  }

  function nearestIn(g, x, z) {
    const ix = Math.floor(x * g.inv) - g.gx0, iz = Math.floor(z * g.inv) - g.gz0;
    if (ix < 0 || iz < 0 || ix >= g.nx || iz >= g.nz) return -1;
    const c = iz * g.nx + ix;
    let best = Infinity, bestSeg = -1;
    for (let ci = g.start[c], c1 = g.start[c + 1]; ci < c1; ci++) {
      const si = g.items[ci], o = si * SS;
      const px = x - SEG[o], pz = z - SEG[o + 1];
      const dx = SEG[o + 2], dz = SEG[o + 3];
      let u = (px * dx + pz * dz) * SEG[o + 4];
      if (u < 0) u = 0; else if (u > 1) u = 1;
      const ex = px - u * dx, ez = pz - u * dz;
      const d2 = ex * ex + ez * ez;
      if (d2 < best) { best = d2; bestSeg = si; }
    }
    nearestD2 = best;
    return bestSeg;
  }
  let nearestD2 = Infinity;

  // Distance to the nearest road centreline, or Infinity beyond that road's
  // reach. The fine grid answers the common short-range case quickly.
  // With maxD <= nearReach the caller only cares about short distances, so a
  // miss in the fine grid returns Infinity without the coarse search.
  function roadDistance(x, z, maxD = Infinity) {
    if (nearestIn(near, x, z) >= 0 && nearestD2 <= cfg.nearReach * cfg.nearReach) {
      return Math.sqrt(nearestD2);
    }
    if (maxD <= cfg.nearReach) return Infinity;
    const si = nearestIn(grid, x, z);
    if (si < 0) return Infinity;
    const R = SEG[si * SS + 7];
    if (nearestD2 > R * R) return Infinity;
    return Math.sqrt(nearestD2);
  }

  const perRoad = profiles.map(p => ({
    from: p.road.from,
    to: p.road.to,
    length: p.length,
    minH: p.minH,
    maxH: p.maxH,
    rise: p.rise,
    maxGrade: p.maxGrade,
    mountainShare: p.mountainShare,
    reach: p.R
  }));

  let totalLength = 0, maxGrade = 0, maxRise = 0, maxReach = 0, mountainRoads = 0;
  for (const p of perRoad) {
    totalLength += p.length;
    if (p.maxGrade > maxGrade) maxGrade = p.maxGrade;
    if (p.rise > maxRise) maxRise = p.rise;
    if (p.reach > maxReach) maxReach = p.reach;
    if (p.mountainShare > 0.25) mountainRoads++;
  }

  const stats = {
    roads: perRoad,
    roadCount: perRoad.length,
    totalLength,
    maxGrade,
    maxRise,
    maxReach,
    mountainRoads,
    sampleStep: cfg.sampleStep,
    cellCount: grid.used,
    segmentCount: segCount
  };

  return { apply, roadDistance, stats };
}
