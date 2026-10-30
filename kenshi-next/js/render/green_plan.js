// 翠緑の盆地: 場所・地面の緑の重み・小川・小道・草や木の置き場所（THREE を使わない純粋な関数）。
// 見た目だけ（当たり判定は無い）。sim の乱数は使わず、座標のハッシュで決める。

export const GREEN = { id: 'green', name: '翠緑の盆地', x: -150, z: 150, r: 52 };
export const GREEN_DIR = 'assets/green/';
export const GREEN_GRASS = ['grass_clump_a', 'grass_clump_b', 'grass_clump_c', 'flowers_yellow', 'flowers_white', 'flowers_purple'];
export const GREEN_BIG = ['tree_broadleaf', 'tree_birch', 'tree_poplar', 'bush_a', 'bush_b', 'mossy_rock_a', 'mossy_rock_b', 'mossy_rock_c', 'reed_clump'];
export const GREEN_NAMES = [...GREEN_GRASS, ...GREEN_BIG, 'footbridge', 'pasture_fence'];
export const PALETTE = { lush: '#4BA13E', dry: '#8CA342', path: '#8B5E34', water: '#3E7486' };
// 草のかたまりを分ける升目（m）。升ごとに1つのメッシュにして、遠い升は描かない。
export const CHUNK = 24;
export const CULL_DIST = 95;
// 町から盆地の中へ続く土の小道
export const GREEN_PATH = [
  { x: -112, z: 66 }, { x: -118, z: 88 }, { x: -126, z: 108 }, { x: -136, z: 128 },
  { x: -142, z: 146 }, { x: -150, z: 162 }, { x: -164, z: 176 },
];

function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
function smoothstep(a, b, v) { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); }
export function hash01(x, z, salt) {
  const s = Math.sin(x * 127.1 + z * 311.7 + salt * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

// 小川: 盆地を西から東へ流れる（z = 中心 + うねり）
export function streamZ(x) {
  return GREEN.z - 4 + Math.sin((x - GREEN.x) * 0.07) * 6 + Math.sin((x - GREEN.x) * 0.023 + 1.2) * 4;
}
export const STREAM_X0 = GREEN.x - 62;
export const STREAM_X1 = GREEN.x + 50;
export const STREAM_W = 3.2;
export function streamDist(x, z) {
  if (x < STREAM_X0 || x > STREAM_X1) return Infinity;
  return Math.abs(z - streamZ(x)) * 0.92; // 斜めのぶん少し縮める
}

function segDist(px, pz, a, b) {
  const vx = b.x - a.x, vz = b.z - a.z;
  const l2 = vx * vx + vz * vz;
  let t = l2 > 0 ? ((px - a.x) * vx + (pz - a.z) * vz) / l2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(px - (a.x + vx * t), pz - (a.z + vz * t));
}
export function pathDist(x, z) {
  let best = Infinity;
  for (let i = 0; i < GREEN_PATH.length - 1; i += 1) best = Math.min(best, segDist(x, z, GREEN_PATH[i], GREEN_PATH[i + 1]));
  return best;
}

// 地面の緑の重み 0..1（砂漠から柔らかく移る。縁はまだらに崩す）
export function greenK(x, z) {
  const d = Math.hypot(x - GREEN.x, z - GREEN.z);
  const n = Math.sin(x * 0.11 + z * 0.07) * 6 + Math.sin(x * 0.043 - z * 0.09 + 2) * 5;
  // 小川ぞいは少し外まで緑
  const s = streamDist(x, z);
  const along = Number.isFinite(s) ? (1 - smoothstep(4, 18, s)) * 0.5 : 0;
  return Math.max(1 - smoothstep(GREEN.r * 0.62, GREEN.r * 1.12, d + n), along * (1 - smoothstep(GREEN.r, GREEN.r * 1.4, d)));
}

// 小川に小道が交わる所（橋の位置と向き）
export function bridgeSpot() {
  let best = null;
  for (let i = 0; i < GREEN_PATH.length - 1; i += 1) {
    const a = GREEN_PATH[i], b = GREEN_PATH[i + 1];
    for (let k = 0; k <= 40; k += 1) {
      const t = k / 40;
      const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
      const d = Math.abs(z - streamZ(x));
      if (!best || d < best.d) best = { d, x, z, rot: Math.atan2(b.x - a.x, b.z - a.z) };
    }
  }
  return { x: best.x, z: streamZ(best.x), rot: best.rot };
}

// 牧場の柵: 盆地の西の小さな囲い（3m の板を並べる。入口を1つ空ける）
export function planPasture() {
  const cx = GREEN.x - 24, cz = GREEN.z + 22, w = 18, d = 12;
  const out = [];
  const seg = 3;
  const sides = [
    { x0: cx - w / 2, z0: cz - d / 2, dx: 1, dz: 0, len: w },
    { x0: cx + w / 2, z0: cz - d / 2, dx: 0, dz: 1, len: d },
    { x0: cx + w / 2, z0: cz + d / 2, dx: -1, dz: 0, len: w },
    { x0: cx - w / 2, z0: cz + d / 2, dx: 0, dz: -1, len: d },
  ];
  sides.forEach((s, si) => {
    const n = Math.round(s.len / seg);
    for (let i = 0; i < n; i += 1) {
      if (si === 0 && i === 2) continue; // 入口
      const t = (i + 0.5) * seg;
      out.push({ x: s.x0 + s.dx * t, z: s.z0 + s.dz * t, rot: Math.atan2(s.dz, s.dx) * -1 });
    }
  });
  return { cx, cz, w, d, pieces: out };
}

function inPasture(p, x, z, pad) {
  return Math.abs(x - p.cx) < p.w / 2 + pad && Math.abs(z - p.cz) < p.d / 2 + pad;
}

// 置き場所。density 1 = 標準、0.5 = 軽い。戻り値 { grass:[...], big:[...], bridge, fences }
export function planGreen(density) {
  const dens = Number.isFinite(density) ? Math.max(0.1, Math.min(2, density)) : 1;
  const pasture = planPasture();
  const grass = [];
  const big = [];
  const R = GREEN.r * 1.15;
  // 草: 1.6m 格子を揺らして置き、緑の重みで間引く
  const step = 1.6 / Math.sqrt(dens);
  for (let x = GREEN.x - R; x <= GREEN.x + R; x += step) {
    for (let z = GREEN.z - R; z <= GREEN.z + R; z += step) {
      const jx = x + (hash01(x, z, 1) - 0.5) * step;
      const jz = z + (hash01(x, z, 2) - 0.5) * step;
      const g = greenK(jx, jz);
      if (g < 0.25 || hash01(jx, jz, 3) > g * 0.9) continue;
      if (pathDist(jx, jz) < 1.6 || streamDist(jx, jz) < STREAM_W * 0.6) continue;
      const r = hash01(jx, jz, 4);
      // 花は花畑のまだらに固まる
      const field = Math.sin(jx * 0.13 + 1) * Math.sin(jz * 0.11 - 0.5);
      let kind;
      if (field > 0.35 && r < 0.6) kind = 3 + Math.floor(hash01(jx, jz, 5) * 3);
      else if (r < 0.04) kind = 3 + Math.floor(hash01(jx, jz, 5) * 3);
      else kind = Math.floor(hash01(jx, jz, 6) * 3);
      const s = 0.8 + hash01(jx, jz, 7) * 0.6;
      grass.push({ kind, x: r2(jx), z: r2(jz), rot: r2(hash01(jx, jz, 8) * 6.283), s: r2(s) });
    }
  }
  // 木・茂み・苔岩: 7m 格子
  const bstep = 7 / Math.sqrt(Math.min(Math.max(dens, 0.9), 1.2)); // 木や岩は軽い設定でもあまり減らさない（三角形の大半は草）
  for (let x = GREEN.x - R; x <= GREEN.x + R; x += bstep) {
    for (let z = GREEN.z - R; z <= GREEN.z + R; z += bstep) {
      const jx = x + (hash01(x, z, 11) - 0.5) * bstep * 0.9;
      const jz = z + (hash01(x, z, 12) - 0.5) * bstep * 0.9;
      const g = greenK(jx, jz);
      const r = hash01(jx, jz, 13);
      if (g < 0.5 || r > 0.55 * g) continue;
      const pd = pathDist(jx, jz);
      const sd = streamDist(jx, jz);
      if (pd < 4 || sd < STREAM_W + 1) continue;
      if (inPasture(pasture, jx, jz, 3)) continue;
      const k = hash01(jx, jz, 14);
      let kind;
      if (k < 0.18) kind = 0; else if (k < 0.32) kind = 1; else if (k < 0.42) kind = 2;
      else if (k < 0.62) kind = 3; else if (k < 0.78) kind = 4; else kind = 5 + Math.floor(hash01(jx, jz, 15) * 3);
      const s = kind <= 2 ? 0.8 + hash01(jx, jz, 16) * 0.45 : 0.7 + hash01(jx, jz, 16) * 0.6;
      big.push({ kind, x: r2(jx), z: r2(jz), rot: r2(hash01(jx, jz, 17) * 6.283), s: r2(s) });
    }
  }
  // 葦: 小川の両岸
  for (let x = STREAM_X0 + 4; x < STREAM_X1 - 2; x += 3.5) {
    if (hash01(x, 0, 21) < 0.35) continue;
    const side = hash01(x, 1, 22) < 0.5 ? -1 : 1;
    const z = streamZ(x) + side * (STREAM_W * 0.5 + 0.6 + hash01(x, 2, 23) * 0.8);
    if (pathDist(x, z) < 3) continue;
    big.push({ kind: 8, x: r2(x), z: r2(z), rot: r2(hash01(x, 3, 24) * 6.283), s: r2(0.8 + hash01(x, 4, 25) * 0.5) });
  }
  return { grass, big, bridge: bridgeSpot(), fences: pasture.pieces };
}

// 升目のキー
export function chunkKey(x, z) {
  return Math.floor(x / CHUNK) + ',' + Math.floor(z / CHUNK);
}
export function groupByChunk(list) {
  const m = new Map();
  for (const it of list) {
    const k = chunkKey(it.x, it.z);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(it);
  }
  return m;
}
// 升目を描くか（注視点からの距離）
export function chunkVisible(cx, cz, tx, tz, dist) {
  const d = Number.isFinite(dist) ? dist : CULL_DIST;
  const mx = (cx + 0.5) * CHUNK, mz = (cz + 0.5) * CHUNK;
  return Math.hypot(mx - tx, mz - tz) < d + CHUNK * 0.71;
}
// 小川の帯の中心線（2m ごと）
export function streamLine() {
  const out = [];
  for (let x = STREAM_X0; x <= STREAM_X1; x += 2) out.push({ x, z: streamZ(x) });
  return out;
}
// テレポート先（盆地の入口の小道の上）
export function greenEntry() {
  return { x: GREEN_PATH[3].x, z: GREEN_PATH[3].z };
}
function r2(v) { return Math.round(v * 100) / 100; }
