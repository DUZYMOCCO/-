import { WORLD_LAYOUT } from '../data/world_layout.js';
import { LAKE } from '../render/giants_plan.js';
// 地面の高さ。シードを使わない固定式で、決定的な純関数。

function baseHeight(x, z) {
  return (
    Math.sin(x * 0.008) * 4.2 +
    Math.cos(z * 0.011) * 3.4 +
    Math.sin((x - z) * 0.0062) * 2.4 +
    Math.sin(x * 0.031) * 1.4 +
    Math.cos(z * 0.027) * 1.2 +
    Math.sin((x + z) * 0.019) * 0.8 +
    Math.cos((x - z) * 0.043) * 0.5 +
    Math.sin(x * 0.11 + z * 0.07) * 0.95
  );
}

function flatten(h, x, z, cx, cz, r) {
  const dx = x - cx;
  const dz = z - cz;
  const d = Math.sqrt(dx * dx + dz * dz);
  if (d >= r) return h;
  const t = 1 - d / r;
  const k = Math.min(1, t * 1.7);
  const flat = baseHeight(cx, cz) * 0.6;
  return h * (1 - k) + flat * k;
}

function localHeight(x, z) {
  let h = baseHeight(x, z);
  h = flatten(h, x, z, -110, 60, 34);
  h = flatten(h, x, z, 120, 110, 26);
  h = flatten(h, x, z, 100, -90, 22);
  h = flatten(h, x, z, -60, -120, 18);
  return Math.round(h * 1000) / 1000;
}

// Grid samples are interpolated at cell centres to avoid biome boundary steps.
const relief = WORLD_LAYOUT.regions.map(r => {
  const b = r.biome;
  if (/mountain|canyon|crags|highland|tundra/.test(b)) return 34;
  if (/swamp|mangrove|delta|shallows/.test(b)) return -8;
  if (/salt|dune/.test(b)) return 3;
  return 14;
});
const smooth = t => t * t * (3 - 2 * t);
function regionValue(ix, iz) {
  ix = Math.max(0, Math.min(63, ix)); iz = Math.max(0, Math.min(63, iz));
  return relief[WORLD_LAYOUT.regionGrid[iz].charCodeAt(ix) - 65] || 0;
}
function rawOutside(x, z) {
  const gx = x / WORLD_LAYOUT.cellM + WORLD_LAYOUT.originCell[0] - 0.5;
  const gz = z / WORLD_LAYOUT.cellM + WORLD_LAYOUT.originCell[1] - 0.5;
  const ix = Math.floor(gx), iz = Math.floor(gz), tx = smooth(gx - ix), tz = smooth(gz - iz);
  const a = regionValue(ix, iz) * (1 - tx) + regionValue(ix + 1, iz) * tx;
  const b = regionValue(ix, iz + 1) * (1 - tx) + regionValue(ix + 1, iz + 1) * tx;
  const amplitude = a * (1 - tz) + b * tz;
  const macro = (0.5 + 0.25 * Math.sin(x * 0.0011) + 0.25 * Math.cos(z * 0.0013)) * amplitude;
  const t = smooth(Math.max(0, Math.min(1, (Math.max(Math.abs(x), Math.abs(z)) - 200) / 2200)));
  return localHeight(x, z) + macro * t;
}
const pads = [...WORLD_LAYOUT.towns.filter(p => !p.start), ...WORLD_LAYOUT.banditBases].map(p => ({
  x: p.x, z: p.z, r: (p.radius || 60) + 40, h: rawOutside(p.x, p.z)
}));
export function heightAt(x, z) {
  if (Math.abs(x) <= 200 && Math.abs(z) <= 200) return localHeight(x, z);
  let h = rawOutside(x, z);
  for (const p of pads) {
    if (Math.abs(x - p.x) > p.r + 100 || Math.abs(z - p.z) > p.r + 100) continue;
    const d = Math.hypot(x - p.x, z - p.z);
    const t = smooth(Math.max(0, Math.min(1, (d - p.r) / 100)));
    h = p.h * (1 - t) + h * t;
  }
  const lakeDistance = Math.hypot(x - LAKE.x, z - LAKE.z);
  if (lakeDistance < LAKE.radius) {
    const t = smooth(Math.max(0, Math.min(1, (LAKE.radius - lakeDistance) / 40)));
    h = h * (1 - t) + LAKE.bottom * t;
  }
  return Math.round(h * 1000) / 1000;
}
