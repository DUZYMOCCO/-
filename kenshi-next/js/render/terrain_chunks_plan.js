export const CHUNK_SIZE = 256;
export const VIEW_RADIUS = 5000;
export function planChunks(x, z) {
  const out = [], n = Math.ceil(VIEW_RADIUS / CHUNK_SIZE) + 1;
  const cx = Math.floor(x / CHUNK_SIZE), cz = Math.floor(z / CHUNK_SIZE);
  for (let dz = -n; dz <= n; dz++) for (let dx = -n; dx <= n; dx++) {
    const ix = cx + dx, iz = cz + dz;
    const x0 = ix * CHUNK_SIZE, z0 = iz * CHUNK_SIZE;
    const distance = Math.hypot(Math.max(0, x0-x, x-x0-CHUNK_SIZE), Math.max(0, z0-z, z-z0-CHUNK_SIZE));
    if (distance > VIEW_RADIUS) continue;
    // A chunk intersecting the local square has its central cells cut out by the builder.
    const lod = distance < 64 ? 'near' : distance < 1024 ? 'mid' : 'far';
    out.push({ix, iz, x: x0, z: z0, lod, distance, key: `${ix},${iz}`});
  }
  return out.sort((a,b) => a.distance-b.distance || a.iz-b.iz || a.ix-b.ix);
}
export function outsideLocal(x,z) { return Math.abs(x) >= 200 || Math.abs(z) >= 200; }


export function isLocalCell(x0,z0,x1,z1) { return Math.abs((x0+x1)/2)<200 && Math.abs((z0+z1)/2)<200; }

// Rock colour on steep or high ground. slope is the gradient magnitude (rise per metre),
// h the height in metres, n a 0..1 large-scale mottling value.
// Returns { rock: 0..1 share of rock colour, red: 0..1 share of red-brown inside the rock }.
export const ROCK_LOOK = { slopeLo: 0.32, slopeHi: 0.75, heightLo: 110, heightHi: 260, highFlat: 0.55 };
const smoothRange = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
export function rockMix(slope, h, n = 0.5) {
  const k = ROCK_LOOK, wobble = (n - 0.5) * 0.12;
  const bySlope = smoothRange(k.slopeLo, k.slopeHi, slope + wobble);
  const byHeight = smoothRange(k.heightLo, k.heightHi, h + (n - 0.5) * 40) * (k.highFlat + (1 - k.highFlat) * smoothRange(0.1, 0.3, slope));
  const rock = Math.max(bySlope, byHeight);
  // Lower and steeper faces lean red-brown; high crests lean grey-brown.
  const red = Math.max(0, Math.min(1, 0.55 + (n - 0.5) * 0.9 - smoothRange(150, 420, h) * 0.45 + smoothRange(0.8, 1.6, slope) * 0.15));
  return { rock, red };
}
export function rockNoise(x, z) {
  return 0.5 + 0.25 * Math.sin(x * 0.0123 + z * 0.0071 + 1.3) + 0.25 * Math.sin(z * 0.0109 - x * 0.0053 + 4.1) * Math.cos(x * 0.0031 + 0.7);
}
