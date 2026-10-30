// 障害物との当たり判定。8m 格子の索引を state ごとに WeakMap で持つ。

export const CELL_SIZE = 8;

const HUMAN_RADIUS = 0.4;
const BEAST_RADIUS = 0.6;

const INDEX_CACHE = new WeakMap();

export function actorRadius(actor) {
  if (actor && actor.faction === 'beast' && !actor.swordsman) return BEAST_RADIUS;
  return HUMAN_RADIUS;
}

function collectObstacles(state) {
  const out = [];
  if (!state || typeof state !== 'object') return out;
  if (Array.isArray(state.rocks)) {
    for (const rock of state.rocks) {
      out.push({ shape: 'circle', x: rock.x, z: rock.z, r: rock.r * 0.9 });
    }
  }
  if (Array.isArray(state.props)) {
    for (const prop of state.props) {
      if (prop.kind === 'tree') {
        out.push({ shape: 'circle', x: prop.x, z: prop.z, r: prop.r });
      } else {
        out.push({
          shape: 'box',
          x: prop.x,
          z: prop.z,
          hw: prop.w / 2,
          hd: prop.d / 2,
        });
      }
    }
  }
  if (Array.isArray(state.buildings)) {
    for (const item of state.buildings) {
      out.push({
        shape: 'box',
        x: item.x,
        z: item.z,
        hw: item.w / 2,
        hd: item.d / 2,
      });
    }
  }
  return out;
}

function buildIndex(state) {
  const obstacles = collectObstacles(state);
  const grid = new Map();
  for (let i = 0; i < obstacles.length; i += 1) {
    const o = obstacles[i];
    let minX;
    let maxX;
    let minZ;
    let maxZ;
    if (o.shape === 'circle') {
      minX = o.x - o.r;
      maxX = o.x + o.r;
      minZ = o.z - o.r;
      maxZ = o.z + o.r;
    } else {
      minX = o.x - o.hw;
      maxX = o.x + o.hw;
      minZ = o.z - o.hd;
      maxZ = o.z + o.hd;
    }
    const cx0 = Math.floor(minX / CELL_SIZE);
    const cx1 = Math.floor(maxX / CELL_SIZE);
    const cz0 = Math.floor(minZ / CELL_SIZE);
    const cz1 = Math.floor(maxZ / CELL_SIZE);
    for (let cx = cx0; cx <= cx1; cx += 1) {
      for (let cz = cz0; cz <= cz1; cz += 1) {
        const key = cx + ',' + cz;
        let bucket = grid.get(key);
        if (!bucket) {
          bucket = [];
          grid.set(key, bucket);
        }
        bucket.push(i);
      }
    }
  }
  return { obstacles, grid };
}

function indexOf(state) {
  let index = INDEX_CACHE.get(state);
  if (!index) {
    index = buildIndex(state);
    INDEX_CACHE.set(state, index);
  }
  return index;
}

function gather(index, x, z, radius) {
  const grid = index.grid;
  const cx0 = Math.floor((x - radius) / CELL_SIZE);
  const cx1 = Math.floor((x + radius) / CELL_SIZE);
  const cz0 = Math.floor((z - radius) / CELL_SIZE);
  const cz1 = Math.floor((z + radius) / CELL_SIZE);
  const seen = new Set();
  const list = [];
  for (let cx = cx0; cx <= cx1; cx += 1) {
    for (let cz = cz0; cz <= cz1; cz += 1) {
      const bucket = grid.get(cx + ',' + cz);
      if (!bucket) continue;
      for (const i of bucket) {
        if (seen.has(i)) continue;
        seen.add(i);
        list.push(index.obstacles[i]);
      }
    }
  }
  return list;
}

function pushCircle(o, px, pz, radius) {
  const dx = px - o.x;
  const dz = pz - o.z;
  const minD = o.r + radius;
  const d2 = dx * dx + dz * dz;
  if (d2 >= minD * minD - 1e-12) return null;
  if (d2 < 1e-12) return { x: o.x + minD, z: o.z };
  const d = Math.sqrt(d2);
  return { x: o.x + (dx / d) * minD, z: o.z + (dz / d) * minD };
}

function pushBox(o, px, pz, radius) {
  const hw = o.hw + radius;
  const hd = o.hd + radius;
  const dx = px - o.x;
  const dz = pz - o.z;
  if (Math.abs(dx) >= hw || Math.abs(dz) >= hd) return null;
  const penX = hw - Math.abs(dx);
  const penZ = hd - Math.abs(dz);
  if (penX <= penZ) {
    return { x: o.x + (dx >= 0 ? hw : -hw), z: pz };
  }
  return { x: px, z: o.z + (dz >= 0 ? hd : -hd) };
}

export function resolveCircle(state, x, z, radius) {
  let px = Number(x);
  let pz = Number(z);
  let rad = Number(radius);
  if (!Number.isFinite(px) || !Number.isFinite(pz)) return { x: px, z: pz };
  if (!Number.isFinite(rad) || rad < 0) rad = 0;
  if (!state || typeof state !== 'object') return { x: px, z: pz };
  const index = indexOf(state);
  for (let pass = 0; pass < 6; pass += 1) {
    const candidates = gather(index, px, pz, rad);
    let moved = false;
    for (const o of candidates) {
      const next = o.shape === 'circle' ? pushCircle(o, px, pz, rad) : pushBox(o, px, pz, rad);
      if (!next) continue;
      px = next.x;
      pz = next.z;
      moved = true;
    }
    if (!moved) break;
  }
  return { x: px, z: pz };
}

export function blockedAt(state, x, z, radius) {
  const px = Number(x);
  const pz = Number(z);
  let rad = Number(radius);
  if (!Number.isFinite(px) || !Number.isFinite(pz)) return false;
  if (!Number.isFinite(rad) || rad < 0) rad = 0;
  if (!state || typeof state !== 'object') return false;
  const index = indexOf(state);
  for (const o of gather(index, px, pz, rad)) {
    if (o.shape === 'circle') {
      const dx = px - o.x;
      const dz = pz - o.z;
      const minD = o.r + rad;
      if (dx * dx + dz * dz < minD * minD - 1e-12) return true;
    } else if (Math.abs(px - o.x) < o.hw + rad && Math.abs(pz - o.z) < o.hd + rad) {
      return true;
    }
  }
  return false;
}
