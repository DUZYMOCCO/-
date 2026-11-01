// Large-scale relief for the whole map outside the start area.
// Deterministic pure function: integer-hash gradient noise, ridged multifractal
// for mountains, fbm for hills, biome parameters blurred over the region grid.
const GRID_SIZE = 64;
const BASE_WAVELENGTH = 1700;   // m, first octave of the relief noise
const WARP_WAVELENGTH = 2600;   // m, low-frequency warp of the biome lookup
const WARP_CELLS = 0.9;         // biome lookup warp amplitude in region cells
const OCTAVES = 4;
const BLUR_RADIUS = 2;          // cells, box blur passes on the parameter grid
const BLUR_PASSES = 2;
const SETTLEMENT_CELL_SIZE = 1600;

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function smoothstep(v) { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); }
function mix(a, b, t) { return a + (b - a) * t; }

// 256-entry permutation from an integer hash (fixed, no seed).
const PERM = new Uint8Array(512);
{
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  let s = 0x9e3779b9 | 0;
  for (let i = 255; i > 0; i--) {
    s = Math.imul(s ^ (s >>> 15), 0x2c1b3c6d);
    s = Math.imul(s ^ (s >>> 12), 0x297a2d39);
    s ^= s >>> 15;
    const j = (s >>> 0) % (i + 1);
    const t = p[i]; p[i] = p[j]; p[j] = t;
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
}
// 16 unit gradients.
const GX = new Float64Array(16), GZ = new Float64Array(16);
for (let i = 0; i < 16; i++) { const a = (i + 0.5) * Math.PI / 8; GX[i] = Math.cos(a); GZ[i] = Math.sin(a); }

// Gradient noise, quintic fade, result roughly in [-1, 1].
function gradNoise(x, z) {
  const fx = Math.floor(x), fz = Math.floor(z);
  const ix = fx & 255, iz = fz & 255;
  const tx = x - fx, tz = z - fz;
  const ux = tx * tx * tx * (tx * (tx * 6 - 15) + 10);
  const uz = tz * tz * tz * (tz * (tz * 6 - 15) + 10);
  const a = PERM[ix] + iz, b = PERM[ix + 1] + iz;
  const g00 = PERM[a] & 15, g01 = PERM[a + 1] & 15, g10 = PERM[b] & 15, g11 = PERM[b + 1] & 15;
  const n00 = GX[g00] * tx + GZ[g00] * tz;
  const n10 = GX[g10] * (tx - 1) + GZ[g10] * tz;
  const n01 = GX[g01] * tx + GZ[g01] * (tz - 1);
  const n11 = GX[g11] * (tx - 1) + GZ[g11] * (tz - 1);
  const nx0 = n00 + (n10 - n00) * ux, nx1 = n01 + (n11 - n01) * ux;
  return (nx0 + (nx1 - nx0) * uz) * 1.41;
}

// Per-octave rotation and offset so no octave shares the lattice axes.
const ROT_C = new Float64Array(OCTAVES), ROT_S = new Float64Array(OCTAVES);
const OFF_X = new Float64Array(OCTAVES), OFF_Z = new Float64Array(OCTAVES);
for (let o = 0; o < OCTAVES; o++) {
  const a = 0.61 + o * 1.13;
  ROT_C[o] = Math.cos(a); ROT_S[o] = Math.sin(a);
  OFF_X[o] = 37.17 * (o + 1); OFF_Z[o] = 91.43 * (o + 1);
}

// Rim (north highlands): along the 0.5 contour of the blurred `wall` parameter a
// rim rises WALL_HEIGHT over 2*WALL_HALF_BAND on the outer face (a cliff) and
// falls back to 0 over WALL_BACK m on the inner side. terrain.js adds it after
// the road relief and cuts it open along the roads, so the roads are the passes.
export const WALL_HEIGHT = 170;
export const WALL_HALF_BAND = 80;
export const WALL_BACK = 420;
const WALL_RES = 8;              // fine distance raster cells per region cell
const WALL_WARP = 0.15;          // region cells; small so the band keeps its slope
const OPEN_HILL_GAIN = 2;        // open ground (no ridges) gets livelier hills and swells
const SWELL_WAVELENGTH = 4200;   // m, broad swells on open ground
const WASH_WAVELENGTH = 1600;    // m, dry gully network
const WASH_HALF_WIDTH = 0.3;     // noise units either side of the gully line

const DEFAULTS = { base: 0, hills: 35, ridges: 0, canyon: 0, sharp: 0, swell: 0, wash: 0, terrace: 0, step: 20, wall: 0 };
const BY_REGION = {
  // A..Y region codes. hills: fbm, swell: broad rise, wash: gully depth,
  // terrace: plateau strength (0..1) with `step` m treads, wall: north cliff.
  A: { hills: 15, wash: 6, swell: 10 },
  B: { hills: 30, swell: 30, terrace: 0.5, step: 25 },
  C: { base: 50, hills: 10, ridges: 420, sharp: 1, wall: 1 },
  D: { hills: 25, terrace: 1, step: 20, wash: 10 },
  E: { hills: 30, swell: 40, wash: 8 },
  F: { base: 10, hills: 10, ridges: 300, sharp: 0.6, terrace: 0.4, step: 30 },
  G: { hills: 10, ridges: 260, canyon: 150, sharp: 0.6 },
  H: { hills: 30, swell: 25, wash: 12 },
  I: { hills: 15, swell: 20, wash: 6 },
  J: { hills: 35, swell: 20 },
  K: { hills: 26, swell: 35 },
  L: { base: -6, hills: 3, swell: 4 },
  M: { base: 10, hills: 10, ridges: 300, sharp: 0.6, terrace: 0.4, step: 30 },
  N: { hills: 10, ridges: 260, canyon: 150, sharp: 0.6, wash: 15 },
  O: { hills: 30, wash: 18, terrace: 0.8, step: 15 },
  P: { hills: 25, swell: 20 },
  Q: { hills: 25, terrace: 0.5, step: 10 },
  R: { hills: 4, swell: 8 },
  S: { hills: 30, terrace: 0.7, step: 30 },
  T: { base: -6, hills: 3, swell: 4 },
  U: { base: -6, hills: 3, swell: 4 },
  V: { base: -6, hills: 3, swell: 3 },
  W: { hills: 35, swell: 40, ridges: 80 },
  X: { hills: 10, swell: 15, wash: 6 },
  Y: { hills: 25, terrace: 0.5, step: 15 }
};

function parametersFor(biome, code) {
  if (code && BY_REGION[code]) {
    const q = { ...DEFAULTS, ...BY_REGION[code] };
    if (!q.ridges) { q.hills *= OPEN_HILL_GAIN; q.swell *= 1.3; }
    return q;
  }
  // Fallback by biome name for layouts with other region codes.
  if (/tundra/.test(biome)) return { ...DEFAULTS, base: 50, hills: 10, ridges: 380, sharp: 1, wall: 1 };
  if (/canyon/.test(biome)) return { ...DEFAULTS, hills: 10, ridges: 260, canyon: 150, sharp: 0.6 };
  if (/mountain|crags|highland/.test(biome)) return { ...DEFAULTS, base: 10, hills: 10, ridges: 300, sharp: 0.6 };
  if (/swamp|mangrove|delta|shallows|fog_basin/.test(biome)) return { ...DEFAULTS, base: -6, hills: 3 };
  if (/salt|dune|flats|desert/.test(biome)) return { ...DEFAULTS, hills: 12 };
  return { ...DEFAULTS };
}

// 1D squared distance transform (Felzenszwalb).
function edt1(f, n, d, v, zz) {
  let k = 0; v[0] = 0; zz[0] = -Infinity; zz[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let s;
    while (true) {
      const p = v[k];
      s = ((f[q] + q * q) - (f[p] + p * p)) / (2 * q - 2 * p);
      if (s <= zz[k]) { k--; if (k < 0) { k = 0; break; } } else break;
    }
    if (k === 0 && s <= zz[0]) { v[0] = q; zz[0] = -Infinity; zz[1] = Infinity; continue; }
    k++; v[k] = q; zz[k] = s; zz[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) { while (zz[k + 1] < q) k++; const p = v[k]; d[q] = (q - p) * (q - p) + f[p]; }
}
function distanceTo(mask, w, h) {   // distance (cells) from each cell to the nearest set cell
  const INF = 1e12, n = Math.max(w, h), out = new Float64Array(w * h), f = new Float64Array(n), d = new Float64Array(n);
  const v = new Int32Array(n), zz = new Float64Array(n + 1);
  for (let i = 0; i < w * h; i++) out[i] = mask[i] ? 0 : INF;
  for (let x = 0; x < w; x++) {
    for (let z = 0; z < h; z++) f[z] = out[z * w + x];
    edt1(f, h, d, v, zz);
    for (let z = 0; z < h; z++) out[z * w + x] = d[z];
  }
  for (let z = 0; z < h; z++) {
    for (let x = 0; x < w; x++) f[x] = out[z * w + x];
    edt1(f, w, d, v, zz);
    for (let x = 0; x < w; x++) out[z * w + x] = Math.sqrt(d[x]);
  }
  return out;
}

function distanceMask(distance, inner, outer, floor = 0) {
  if (distance <= inner) return floor;
  if (distance >= outer) return 1;
  return mix(floor, 1, smoothstep((distance - inner) / (outer - inner)));
}

function blurGrid(src) {
  let a = Float64Array.from(src), b = new Float64Array(src.length);
  const N = GRID_SIZE, r = BLUR_RADIUS, w = 1 / (2 * r + 1);
  for (let pass = 0; pass < BLUR_PASSES; pass++) {
    for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
      let s = 0;
      for (let k = -r; k <= r; k++) s += a[z * N + clamp(x + k, 0, N - 1)];
      b[z * N + x] = s * w;
    }
    for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
      let s = 0;
      for (let k = -r; k <= r; k++) s += b[clamp(z + k, 0, N - 1) * N + x];
      a[z * N + x] = s * w;
    }
  }
  return a;
}

export function createMacroRelief({ layout, settlements = [], lake = null }) {
  const N = GRID_SIZE;
  const keys = ['base', 'hills', 'ridges', 'canyon', 'sharp', 'swell', 'wash', 'terrace', 'step'];
  const K = keys.length;
  const regionParams = layout.regions.map((r, i) => parametersFor(r.biome, String.fromCharCode(65 + i)));
  // Interleaved blurred parameter grid: K values per cell.
  const P = new Float64Array(N * N * K);
  for (let k = 0; k < keys.length; k++) {
    const raw = new Float64Array(N * N);
    for (let z = 0; z < N; z++) {
      const row = layout.regionGrid[z];
      for (let x = 0; x < N; x++) raw[z * N + x] = regionParams[row.charCodeAt(x) - 65][keys[k]];
    }
    const bl = blurGrid(raw);
    for (let i = 0; i < N * N; i++) P[i * K + k] = bl[i];
  }

  // Signed distance (m, positive inside) to the 0.5 contour of the blurred wall
  // parameter, on a fine raster, so the cliff band has an even slope all round.
  // The raster only covers the wall cells plus a margin wide enough for the blur
  // and the rim band; everywhere else counts as far outside.
  const fineM = layout.cellM / WALL_RES;
  let wallSd = null, FX0 = 0, FZ0 = 0, FW = 1, FH = 1;
  {
    const raw = new Float64Array(N * N);
    let bx0 = N, bx1 = -1, bz0 = N, bz1 = -1;
    for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
      raw[z * N + x] = regionParams[layout.regionGrid[z].charCodeAt(x) - 65].wall;
      if (raw[z * N + x] > 0) { bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x); bz0 = Math.min(bz0, z); bz1 = Math.max(bz1, z); }
    }
    if (bx1 >= 0) {
      const margin = BLUR_RADIUS * BLUR_PASSES + 1 + Math.ceil((WALL_HALF_BAND + WALL_BACK) / layout.cellM) + 2;
      bx0 = Math.max(0, bx0 - margin); bz0 = Math.max(0, bz0 - margin);
      bx1 = Math.min(N - 1, bx1 + margin); bz1 = Math.min(N - 1, bz1 + margin);
      FX0 = bx0 * WALL_RES; FZ0 = bz0 * WALL_RES;
      FW = (bx1 - bx0 + 1) * WALL_RES; FH = (bz1 - bz0 + 1) * WALL_RES;
      const bl = blurGrid(raw);
      const inside = new Uint8Array(FW * FH), outside = new Uint8Array(FW * FH);
      for (let lz = 0; lz < FH; lz++) for (let lx = 0; lx < FW; lx++) {
        const gx = (lx + FX0 + 0.5) / WALL_RES - 0.5, gz = (lz + FZ0 + 0.5) / WALL_RES - 0.5;
        const ix = Math.floor(gx), iz = Math.floor(gz);
        const tx = smoothstep(gx - ix), tz = smoothstep(gz - iz);
        const x0 = clamp(ix, 0, N - 1), x1 = clamp(ix + 1, 0, N - 1), z0 = clamp(iz, 0, N - 1), z1 = clamp(iz + 1, 0, N - 1);
        const v = (bl[z0 * N + x0] * (1 - tx) + bl[z0 * N + x1] * tx) * (1 - tz) + (bl[z1 * N + x0] * (1 - tx) + bl[z1 * N + x1] * tx) * tz;
        if (v >= 0.5) inside[lz * FW + lx] = 1; else outside[lz * FW + lx] = 1;
      }
      const dOut = distanceTo(outside, FW, FH), dIn = distanceTo(inside, FW, FH);
      const sd = new Float64Array(FW * FH);
      for (let i = 0; i < FW * FH; i++) sd[i] = (inside[i] ? dOut[i] - 0.5 : 0.5 - dIn[i]) * fineM;
      // light smoothing of the raster steps
      const tmp = new Float64Array(FW * FH);
      for (let pass = 0; pass < 2; pass++) {
        for (let z = 0; z < FH; z++) for (let x = 0; x < FW; x++) {
          tmp[z * FW + x] = (sd[z * FW + clamp(x - 1, 0, FW - 1)] + sd[z * FW + x] + sd[z * FW + clamp(x + 1, 0, FW - 1)]) / 3;
        }
        for (let z = 0; z < FH; z++) for (let x = 0; x < FW; x++) {
          sd[z * FW + x] = (tmp[clamp(z - 1, 0, FH - 1) * FW + x] + tmp[z * FW + x] + tmp[clamp(z + 1, 0, FH - 1) * FW + x]) / 3;
        }
      }
      wallSd = new Float32Array(sd);
    }
  }
  const FAR_OUTSIDE = -1e4;
  function wallDistance(fx, fz) {
    fx -= FX0; fz -= FZ0;
    if (fx < 0 || fz < 0 || fx > FW - 1 || fz > FH - 1) {
      // Off the raster: clamp to the map edge where the raster touches it, else far outside.
      const atEdgeX = (fx < 0 && FX0 === 0) || (fx > FW - 1 && FX0 + FW === N * WALL_RES);
      const atEdgeZ = (fz < 0 && FZ0 === 0) || (fz > FH - 1 && FZ0 + FH === N * WALL_RES);
      if ((fx < 0 || fx > FW - 1) && !atEdgeX) return FAR_OUTSIDE;
      if ((fz < 0 || fz > FH - 1) && !atEdgeZ) return FAR_OUTSIDE;
    }
    fx = clamp(fx, 0, FW - 1.001); fz = clamp(fz, 0, FH - 1.001);
    const ix = Math.floor(fx), iz = Math.floor(fz), tx = fx - ix, tz = fz - iz;
    const i = iz * FW + ix;
    return (wallSd[i] * (1 - tx) + wallSd[i + 1] * tx) * (1 - tz) + (wallSd[i + FW] * (1 - tx) + wallSd[i + FW + 1] * tx) * tz;
  }

  const townMasks = settlements.map(p => ({
    x: p.x, z: p.z,
    inner: (p.radius || 60) + 40 + 250,
    outer: (p.radius || 60) + 40 + 250 + 900,
    // The pad and its 100 m ramp get no macro relief at all, so a town never
    // sits on a slope; the 0.15 floor starts beyond that.
    core: (p.radius || 60) + 40 + 100
  }));
  const townGrid = new Map();
  let townCellReach = 0;
  for (const p of townMasks) {
    const key = (Math.floor(p.x / SETTLEMENT_CELL_SIZE) + 50000) * 100000 + (Math.floor(p.z / SETTLEMENT_CELL_SIZE) + 50000);
    let list = townGrid.get(key);
    if (!list) townGrid.set(key, list = []);
    list.push(p);
    townCellReach = Math.max(townCellReach, Math.ceil(p.outer / SETTLEMENT_CELL_SIZE));
  }
  const lakeMask = lake ? { x: lake.x, z: lake.z, inner: lake.radius + 300, outer: lake.radius + 300 + 800 } : null;

  const invCell = 1 / layout.cellM, ox = layout.originCell[0] - 0.5, oz = layout.originCell[1] - 0.5;

  function height(x, z) {
    let mask = distanceMask(Math.max(Math.abs(x), Math.abs(z)), 1400, 3500);
    if (mask === 0) return 0;
    const tcx = Math.floor(x / SETTLEMENT_CELL_SIZE), tcz = Math.floor(z / SETTLEMENT_CELL_SIZE);
    for (let ix = tcx - townCellReach; ix <= tcx + townCellReach; ix++) {
      for (let iz = tcz - townCellReach; iz <= tcz + townCellReach; iz++) {
        const list = townGrid.get((ix + 50000) * 100000 + (iz + 50000));
        if (!list) continue;
        for (let i = 0; i < list.length; i++) {
          const p = list[i];
          const dx = x - p.x, dz = z - p.z;
          const d = Math.sqrt(dx * dx + dz * dz);
          let m = distanceMask(d, p.inner, p.outer, 0.15);
          if (d < p.inner) m *= distanceMask(d, p.core, p.inner);
          if (m < mask) mask = m;
        }
      }
    }
    if (lakeMask) {
      const dx = x - lakeMask.x, dz = z - lakeMask.z;
      const m = distanceMask(Math.sqrt(dx * dx + dz * dz), lakeMask.inner, lakeMask.outer);
      if (m < mask) mask = m;
    }
    if (mask === 0) return 0;

    // Warped lookup into the blurred biome parameters (2 noise calls).
    const wx = x / WARP_WAVELENGTH, wz = z / WARP_WAVELENGTH;
    const warpX = gradNoise(wx + 13.7, wz - 4.1), warpZ = gradNoise(wx - 21.3, wz + 9.9);
    const gx = x * invCell + ox + WARP_CELLS * warpX;
    const gz = z * invCell + oz + WARP_CELLS * warpZ;
    const ix = Math.floor(gx), iz = Math.floor(gz);
    const tx = smoothstep(gx - ix), tz = smoothstep(gz - iz);
    const x0 = clamp(ix, 0, N - 1) , x1 = clamp(ix + 1, 0, N - 1);
    const z0 = clamp(iz, 0, N - 1), z1 = clamp(iz + 1, 0, N - 1);
    const a = (z0 * N + x0) * K, b = (z0 * N + x1) * K, c = (z1 * N + x0) * K, d = (z1 * N + x1) * K;
    const w00 = (1 - tx) * (1 - tz), w10 = tx * (1 - tz), w01 = (1 - tx) * tz, w11 = tx * tz;
    const pv = k => P[a + k] * w00 + P[b + k] * w10 + P[c + k] * w01 + P[d + k] * w11;
    const base = pv(0), hills = pv(1), ridges = pv(2), canyon = pv(3), sharp = pv(4);
    const swell = pv(5), wash = pv(6), terrace = pv(7), step = pv(8);

    // fbm and ridged multifractal from the same 4 octaves (4 noise calls).
    const nx = x / BASE_WAVELENGTH, nz = z / BASE_WAVELENGTH;
    const useRidges = ridges > 0 || canyon > 0;   // no threshold: a cut-off would leave a small step
    let fbm = 0, ridged = 0, weight = 1, amp = 1, freq = 1;
    for (let o = 0; o < OCTAVES; o++) {
      const px = nx * freq + OFF_X[o], pz = nz * freq + OFF_Z[o];
      const n = gradNoise(px * ROT_C[o] - pz * ROT_S[o], px * ROT_S[o] + pz * ROT_C[o]);
      fbm += n * amp;
      if (useRidges) {
        let r = 1 - Math.abs(n);
        r *= r;
        r *= weight;
        weight = r * 2 > 1 ? 1 : r * 2;
        ridged += r * amp;
      }
      amp *= 0.5; freq *= 2.03;
    }
    fbm *= 1 / 1.875;
    // Rolling ground: fbm hills on a broad swell (1 noise call), stepped into
    // plateaus where `terrace` is set.
    let rolling = hills * fbm;
    if (swell > 0) rolling += swell * (0.5 + 0.5 * gradNoise(x / SWELL_WAVELENGTH + 71.3, z / SWELL_WAVELENGTH - 33.9));
    if (terrace > 0 && step > 1) {
      const t = rolling / step, fl = Math.floor(t), fr = t - fl;
      const fr2 = fr * fr;
      rolling = mix(rolling, (fl + fr2 * fr2) * step, terrace);
    }
    let h = base + rolling;
    // Dry gullies along the zero lines of one noise field (1 noise call).
    if (wash > 0) {
      const n = Math.abs(gradNoise(x / WASH_WAVELENGTH - 52.1, z / WASH_WAVELENGTH + 18.4));
      if (n < WASH_HALF_WIDTH) h -= wash * (1 - smoothstep(n / WASH_HALF_WIDTH));
    }
    if (useRidges) {
      let r = ridged * (1 / 1.4);          // ~0..1
      if (r > 1) r = 1;
      // sharpen peaks where `sharp` is high, keep broad shoulders elsewhere
      r = r * (1 - sharp) + r * r * sharp;
      h += ridges * r - canyon * (1 - r) * (1 - r);
    }
    return h * mask;
  }
  function wallSignedDistance(x, z) {
    if (!wallSd) return -Infinity;
    const wx = x / WARP_WAVELENGTH, wz = z / WARP_WAVELENGTH;
    return wallDistance(
      (x * invCell + ox + WALL_WARP * gradNoise(wx + 13.7, wz - 4.1) + 0.5) * WALL_RES - 0.5,
      (z * invCell + oz + WALL_WARP * gradNoise(wx - 21.3, wz + 9.9) + 0.5) * WALL_RES - 0.5);
  }

  const stats = {
    regions: layout.regions.map((region, i) => ({
      code: String.fromCharCode(65 + i), id: region.id, biome: region.biome, ...regionParams[i]
    })),
    octaveCount: OCTAVES,
    maxNoiseCallsPerHeight: OCTAVES + 4
  };
  // Rim height (m) at x,z; 0 away from the contour, near towns and the start.
  function rim(x, z) {
    if (!wallSd) return 0;
    // Quick reject on the unwarped raster: the warp moves the lookup by at
    // most WALL_WARP * 1.41 cells.
    const quick = wallDistance((x * invCell + ox + 0.5) * WALL_RES - 0.5, (z * invCell + oz + 0.5) * WALL_RES - 0.5);
    const slack = WALL_WARP * 1.5 * layout.cellM;
    if (quick <= -WALL_HALF_BAND - slack || quick >= WALL_HALF_BAND + WALL_BACK + slack) return 0;
    const sd = wallSignedDistance(x, z);
    if (sd <= -WALL_HALF_BAND || sd >= WALL_HALF_BAND + WALL_BACK) return 0;
    let m = distanceMask(Math.max(Math.abs(x), Math.abs(z)), 1400, 3500);
    for (const p of townMasks) {
      const dx = x - p.x, dz = z - p.z;
      if (Math.abs(dx) > p.core + 150 || Math.abs(dz) > p.core + 150) continue;
      m = Math.min(m, distanceMask(Math.sqrt(dx * dx + dz * dz), p.core, p.core + 150));
    }
    if (lakeMask) m = Math.min(m, distanceMask(Math.hypot(x - lakeMask.x, z - lakeMask.z), lakeMask.inner, lakeMask.outer));
    if (m === 0) return 0;
    const v = sd < WALL_HALF_BAND
      ? smoothstep((sd + WALL_HALF_BAND) / (2 * WALL_HALF_BAND))
      : 1 - smoothstep((sd - WALL_HALF_BAND) / WALL_BACK);
    return m * WALL_HEIGHT * v;
  }
  return { height, rim, wallSignedDistance, stats };
}
