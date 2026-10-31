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
