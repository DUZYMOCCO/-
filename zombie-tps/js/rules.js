// ゾンビストライク — ゲームの きまり（DOM / three.js に いぞんしない。node のテストから よめる）
// ぶき・ダメージ・ウェーブ・あたりはんてい（レイ×はこ）・いどうの ぶつかり・ゾンビの みちさがし（フローフィールド）

export const VERSION = '0.1.0';

// ---- ぶき ----
// rpm: 1ぷんかんの はっしゃかず / mag: マガジン / reserve: よびだん / reload: びょう
// spread: ばらつき（ラジアン）/ head: ヘッドショット ばいりつ / falloff: [ちかい m, とおい m, とおいときの ばいりつ]
export const WEAPONS = {
  rifle: {
    id: 'rifle', name: 'アサルトライフル', short: 'ライフル', slot: 1,
    dmg: 24, head: 2.5, pellets: 1, rpm: 640, auto: true,
    mag: 30, reserve: 210, reload: 1.9,
    spread: 0.010, spreadMove: 0.028, spreadAim: 0.003, bloom: 0.0045, bloomMax: 0.035,
    recoilPitch: 0.012, recoilYaw: 0.006, shake: 0.06, range: 90, falloff: [25, 70, 0.7],
  },
  pistol: {
    id: 'pistol', name: 'ハンドガン', short: 'ハンドガン', slot: 2,
    dmg: 34, head: 2.5, pellets: 1, rpm: 330, auto: false,
    mag: 12, reserve: Infinity, reload: 1.25,
    spread: 0.008, spreadMove: 0.02, spreadAim: 0.002, bloom: 0.012, bloomMax: 0.04,
    recoilPitch: 0.03, recoilYaw: 0.006, shake: 0.05, range: 60, falloff: [15, 45, 0.6],
  },
  shotgun: {
    id: 'shotgun', name: 'ショットガン', short: 'ショットガン', slot: 3,
    dmg: 16, head: 1.8, pellets: 8, rpm: 75, auto: false,
    mag: 6, reserve: 36, reload: 2.3,
    spread: 0.075, spreadMove: 0.09, spreadAim: 0.055, bloom: 0, bloomMax: 0,
    recoilPitch: 0.07, recoilYaw: 0.01, shake: 0.18, range: 35, falloff: [6, 22, 0.35],
  },
};
export const WEAPON_ORDER = ['rifle', 'pistol', 'shotgun'];
export const DEFAULT_WEAPON = 'rifle';

export function fireInterval(w) { return 60 / w.rpm; }

// きょりで へる ダメージ（ちかいほど つよい）
export function damageAt(w, dist, isHead) {
  const [near, far, minMul] = w.falloff;
  let mul = 1;
  if (dist > near) mul = dist >= far ? minMul : 1 - (1 - minMul) * (dist - near) / (far - near);
  return Math.round(w.dmg * mul * (isHead ? w.head : 1));
}

export function currentSpread(w, { moving = false, aiming = false, airborne = false, bloom = 0 } = {}) {
  let s = aiming ? w.spreadAim : (moving ? w.spreadMove : w.spread);
  if (airborne) s *= 1.8;
  return s + Math.min(bloom, w.bloomMax);
}

// ---- ぶきの じょうたい（たま・リロード・れんしゃ） ----
export function createGun(id) {
  const w = WEAPONS[id];
  return { id, ammo: w.mag, reserve: w.reserve, cooldown: 0, reloading: 0, bloom: 0, triggerHeld: false, lastTrigger: false };
}

// dt すすめる。リロードが おわったら たまを うつす
export function updateGun(g, dt) {
  const w = WEAPONS[g.id];
  g.cooldown = Math.max(0, g.cooldown - dt);
  g.bloom = Math.max(0, g.bloom - dt * (w.bloomMax * 4 + 0.02));
  if (g.reloading > 0) {
    g.reloading -= dt;
    if (g.reloading <= 0) {
      g.reloading = 0;
      const need = w.mag - g.ammo;
      const take = Math.min(need, g.reserve);
      g.ammo += take;
      if (g.reserve !== Infinity) g.reserve -= take;
      return 'reloaded';
    }
  }
  return null;
}

export function canReload(g) {
  const w = WEAPONS[g.id];
  return g.reloading === 0 && g.ammo < w.mag && g.reserve > 0;
}

export function startReload(g) {
  if (!canReload(g)) return false;
  g.reloading = WEAPONS[g.id].reload;
  return true;
}

export function cancelReload(g) { g.reloading = 0; }

// ひきがね。held=おしている。うてたら true（オートでない ぶきは おしなおしが ひつよう）
// れんだ しても fireInterval より はやくは うてない
export function tryFire(g, held) {
  const w = WEAPONS[g.id];
  const pressedNow = held && !g.lastTrigger;
  g.lastTrigger = held;
  if (!held) return 'none';
  if (g.reloading > 0) return 'none';
  if (g.cooldown > 0) return 'none';
  if (!w.auto && !pressedNow) return 'none';
  if (g.ammo <= 0) {
    if (startReload(g)) return 'reload';
    return pressedNow ? 'empty' : 'none';
  }
  g.ammo -= 1;
  g.cooldown = fireInterval(w);
  g.bloom = Math.min(w.bloomMax, g.bloom + w.bloom);
  return 'fire';
}

// ---- ゾンビ ----
export const ZOMBIES = {
  walker: { id: 'walker', hp: 70, speed: 1.8, dmg: 10, atkRate: 1.0, scale: 1.0, score: 100 },
  runner: { id: 'runner', hp: 45, speed: 3.9, dmg: 8, atkRate: 0.8, scale: 0.95, score: 150 },
  brute: { id: 'brute', hp: 260, speed: 1.2, dmg: 22, atkRate: 1.4, scale: 1.35, score: 400 },
};
export const HEADSHOT_BONUS = 50;
export const ATTACK_RANGE = 1.25;
export const PLAYER_MAX_HP = 100;

// ウェーブの なかみ（ぜんぶで なんたい・どのしゅるい・いちどに なんたいまで）
export function waveSpec(n) {
  const total = Math.min(6 + (n - 1) * 4, 60);
  const runnerShare = n < 2 ? 0 : Math.min(0.15 + (n - 2) * 0.07, 0.45);
  const bruteCount = n < 4 ? 0 : Math.min(1 + Math.floor((n - 4) / 2), 6);
  const runners = Math.round((total - bruteCount) * runnerShare);
  const walkers = total - runners - bruteCount;
  const hpMul = 1 + Math.max(0, n - 5) * 0.08;
  return { n, total, walkers, runners, brutes: bruteCount, maxAlive: Math.min(6 + n * 2, 16), spawnGap: Math.max(0.5, 1.8 - n * 0.12), hpMul };
}

// しゅるいの ならびを つくる（rng: 0..1）
export function waveQueue(spec, rng = Math.random) {
  const q = [];
  for (let i = 0; i < spec.walkers; i++) q.push('walker');
  for (let i = 0; i < spec.runners; i++) q.push('runner');
  for (let i = 0; i < spec.brutes; i++) q.push('brute');
  for (let i = q.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [q[i], q[j]] = [q[j], q[i]]; }
  // さいしょの 3たいは あるく ゾンビに（いきなり はしってこない）
  for (let i = 0; i < Math.min(3, q.length); i++) {
    if (q[i] !== 'walker') { const k = q.indexOf('walker', 3); if (k >= 0) [q[i], q[k]] = [q[k], q[i]]; }
  }
  return q;
}

export function killScore(type, isHead) { return ZOMBIES[type].score + (isHead ? HEADSHOT_BONUS : 0); }

// ---- レイ × はこ（AABB）。あたれば きょり t、なければ -1 ----
export function rayAABB(ox, oy, oz, dx, dy, dz, b, maxT = Infinity) {
  let tmin = 0, tmax = maxT;
  const o = [ox, oy, oz], d = [dx, dy, dz], lo = [b.minX, b.minY, b.minZ], hi = [b.maxX, b.maxY, b.maxZ];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-9) {
      if (o[i] < lo[i] || o[i] > hi[i]) return -1;
    } else {
      let t1 = (lo[i] - o[i]) / d[i], t2 = (hi[i] - o[i]) / d[i];
      if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
      if (t1 > tmin) tmin = t1;
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return -1;
    }
  }
  return tmin;
}

// あたった めんの むき（AABB の どの めんか）
export function aabbNormal(px, py, pz, b) {
  const ds = [
    [Math.abs(px - b.minX), -1, 0, 0], [Math.abs(px - b.maxX), 1, 0, 0],
    [Math.abs(py - b.minY), 0, -1, 0], [Math.abs(py - b.maxY), 0, 1, 0],
    [Math.abs(pz - b.minZ), 0, 0, -1], [Math.abs(pz - b.maxZ), 0, 0, 1],
  ];
  ds.sort((a, c) => a[0] - c[0]);
  return { x: ds[0][1], y: ds[0][2], z: ds[0][3] };
}

// ゾンビの あたりばこ（あたま・からだ）。z は { x, z, scale, y?, crouch? }
export function zombieBoxes(z) {
  const s = z.scale || 1, y0 = z.y || 0;
  const hw = 0.3 * s, headH = 0.5 * s, bodyTop = 1.45 * s;
  return {
    head: { minX: z.x - hw, maxX: z.x + hw, minY: y0 + bodyTop, maxY: y0 + bodyTop + headH, minZ: z.z - hw, maxZ: z.z + hw },
    body: { minX: z.x - 0.36 * s, maxX: z.x + 0.36 * s, minY: y0, maxY: y0 + bodyTop, minZ: z.z - 0.36 * s, maxZ: z.z + 0.36 * s },
  };
}

// うった たまが なにに あたるか。zombies: [{x,z,scale,alive}], walls: AABB[]
export function castShot(ox, oy, oz, dx, dy, dz, zombies, walls, range) {
  let best = { t: range, kind: 'none', index: -1, head: false };
  for (let i = 0; i < walls.length; i++) {
    const t = rayAABB(ox, oy, oz, dx, dy, dz, walls[i], best.t);
    if (t >= 0 && t < best.t) best = { t, kind: 'wall', index: i, head: false };
  }
  if (oy + dy * best.t < 0 && dy < 0) { // じめん
    const t = -oy / dy;
    if (t < best.t) best = { t, kind: 'ground', index: -1, head: false };
  }
  for (let i = 0; i < zombies.length; i++) {
    const z = zombies[i];
    if (!z.alive) continue;
    const bx = zombieBoxes(z);
    const th = rayAABB(ox, oy, oz, dx, dy, dz, bx.head, best.t);
    if (th >= 0 && th < best.t) best = { t: th, kind: 'zombie', index: i, head: true };
    const tb = rayAABB(ox, oy, oz, dx, dy, dz, bx.body, best.t);
    if (tb >= 0 && tb < best.t) best = { t: tb, kind: 'zombie', index: i, head: false };
  }
  best.x = ox + dx * best.t; best.y = oy + dy * best.t; best.z = oz + dz * best.t;
  return best;
}

// ---- いどうの ぶつかり（XZ の えん × はこ）----
// たかさを みる: あしもと y が はこの うえ(top-step)より たかければ のれる＝かべに ならない
export function collideCircle(px, pz, r, y, boxes, step = 0.3) {
  let x = px, z = pz;
  for (let pass = 0; pass < 2; pass++) {
    for (const b of boxes) {
      if (y >= b.maxY - step) continue;
      if (y + 1.6 < b.minY) continue;
      const cx = Math.max(b.minX, Math.min(x, b.maxX));
      const cz = Math.max(b.minZ, Math.min(z, b.maxZ));
      let dx = x - cx, dz = z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-10) {
        const d = Math.sqrt(d2), push = r - d;
        x += dx / d * push; z += dz / d * push;
      } else { // なかに はいった: いちばん ちかい めんへ
        const opts = [[x - b.minX + r, -1, 0], [b.maxX - x + r, 1, 0], [z - b.minZ + r, 0, -1], [b.maxZ - z + r, 0, 1]];
        opts.sort((a, c) => a[0] - c[0]);
        x += opts[0][1] * opts[0][0]; z += opts[0][2] * opts[0][0];
      }
    }
  }
  return { x, z };
}

// あしもとの ゆかの たかさ（のれる はこの うえ。なければ 0）
export function groundHeight(x, z, r, y, boxes, step = 0.3) {
  let g = 0;
  for (const b of boxes) {
    if (x + r * 0.7 < b.minX || x - r * 0.7 > b.maxX || z + r * 0.7 < b.minZ || z - r * 0.7 > b.maxZ) continue;
    if (y >= b.maxY - step && b.maxY > g) g = b.maxY;
  }
  return g;
}

// カメラが かべに めりこまない きょり
export function cameraDistance(px, py, pz, dx, dy, dz, want, boxes, pad = 0.25) {
  let t = want;
  for (const b of boxes) {
    const h = rayAABB(px, py, pz, dx, dy, dz, b, t);
    if (h >= 0 && h < t) t = h;
  }
  return Math.max(0.3, t === want ? want : t - pad);
}

// ---- ゾンビの みちさがし（グリッド BFS フローフィールド）----
export function buildGrid(boxes, half, cell = 1, inflate = 0.35) {
  const n = Math.ceil((half * 2) / cell);
  const blocked = new Uint8Array(n * n);
  for (const b of boxes) {
    if (b.maxY < 0.5) continue; // ひくい ものは またげる
    const x0 = Math.max(0, Math.floor((b.minX - inflate + half) / cell));
    const x1 = Math.min(n - 1, Math.floor((b.maxX + inflate + half) / cell));
    const z0 = Math.max(0, Math.floor((b.minZ - inflate + half) / cell));
    const z1 = Math.min(n - 1, Math.floor((b.maxZ + inflate + half) / cell));
    for (let gz = z0; gz <= z1; gz++) for (let gx = x0; gx <= x1; gx++) {
      const cx = -half + (gx + 0.5) * cell, cz = -half + (gz + 0.5) * cell;
      if (cx > b.minX - inflate && cx < b.maxX + inflate && cz > b.minZ - inflate && cz < b.maxZ + inflate) blocked[gz * n + gx] = 1;
    }
  }
  return { n, half, cell, blocked, dist: new Int32Array(n * n).fill(-1), queue: new Int32Array(n * n) };
}

export function cellOf(grid, x, z) {
  const gx = Math.min(grid.n - 1, Math.max(0, Math.floor((x + grid.half) / grid.cell)));
  const gz = Math.min(grid.n - 1, Math.max(0, Math.floor((z + grid.half) / grid.cell)));
  return gz * grid.n + gx;
}

// target から の きょり（8ほうこう。かどは すりぬけない）
export function updateFlow(grid, tx, tz) {
  const { n, blocked, dist, queue } = grid;
  dist.fill(-1);
  let start = cellOf(grid, tx, tz);
  if (blocked[start]) { // めりこみ: いちばん ちかい あいた マス
    let bestI = -1, bestD = Infinity;
    for (let i = 0; i < n * n; i++) if (!blocked[i]) {
      const dx = (i % n) - (start % n), dz = Math.floor(i / n) - Math.floor(start / n);
      const d = dx * dx + dz * dz; if (d < bestD) { bestD = d; bestI = i; }
    }
    start = bestI;
  }
  let head = 0, tail = 0;
  dist[start] = 0; queue[tail++] = start;
  while (head < tail) {
    const i = queue[head++], gx = i % n, gz = (i / n) | 0, d = dist[i] + 1;
    for (let oz = -1; oz <= 1; oz++) for (let ox = -1; ox <= 1; ox++) {
      if (!ox && !oz) continue;
      const nx = gx + ox, nz = gz + oz;
      if (nx < 0 || nz < 0 || nx >= n || nz >= n) continue;
      const j = nz * n + nx;
      if (blocked[j] || dist[j] >= 0) continue;
      if (ox && oz && (blocked[gz * n + nx] || blocked[nz * n + gx])) continue;
      dist[j] = d; queue[tail++] = j;
    }
  }
}

// いまの いちから すすむ ほうこう（たんい ベクトル）
export function flowDir(grid, x, z) {
  const { n, dist, cell, half } = grid;
  const i = cellOf(grid, x, z), gx = i % n, gz = (i / n) | 0;
  let best = dist[i] < 0 ? Infinity : dist[i], bx = 0, bz = 0;
  for (let oz = -1; oz <= 1; oz++) for (let ox = -1; ox <= 1; ox++) {
    if (!ox && !oz) continue;
    const nx = gx + ox, nz = gz + oz;
    if (nx < 0 || nz < 0 || nx >= n || nz >= n) continue;
    const d = dist[nz * n + nx];
    if (d >= 0 && d < best) { best = d; bx = ox; bz = oz; }
  }
  if (!bx && !bz) return null;
  const tx = -half + (gx + bx + 0.5) * cell - x, tz = -half + (gz + bz + 0.5) * cell - z;
  const l = Math.hypot(tx, tz) || 1;
  return { x: tx / l, z: tz / l };
}

// みとおし（グリッドで まっすぐ いけるか）
export function gridLineClear(grid, x0, z0, x1, z1) {
  const steps = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / (grid.cell * 0.5));
  for (let s = 1; s < steps; s++) {
    const t = s / steps;
    if (grid.blocked[cellOf(grid, x0 + (x1 - x0) * t, z0 + (z1 - z0) * t)]) return false;
  }
  return true;
}

// ---- セーブ ----
export function normalizeSave(s) {
  const o = s && typeof s === 'object' ? s : {};
  return {
    bestWave: Number.isFinite(o.bestWave) ? Math.max(0, o.bestWave | 0) : 0,
    bestScore: Number.isFinite(o.bestScore) ? Math.max(0, o.bestScore | 0) : 0,
    autoFire: !!o.autoFire,
    sens: ['low', 'mid', 'high'].includes(o.sens) ? o.sens : 'mid',
    quality: ['auto', 'low', 'high'].includes(o.quality) ? o.quality : 'auto',
  };
}
export const SENS = { low: 0.6, mid: 1.0, high: 1.5 };
