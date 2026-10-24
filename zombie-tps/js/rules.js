// ゾンビストライク — ゲームの きまり（DOM / three.js に いぞんしない。node のテストから よめる）
// ぶき・ダメージ・ウェーブ・あたりはんてい（レイ×はこ）・いどうの ぶつかり・ゾンビの みちさがし（フローフィールド）

export const VERSION = '0.4.0';

// ---- ぶき ----
// rpm: 1ぷんかんの はっしゃかず / mag: マガジン / reserve: よびだん / reload: びょう
// spread: ばらつき（ラジアン）/ head: ヘッドショット ばいりつ / falloff: [ちかい m, とおい m, とおいときの ばいりつ]
export const WEAPONS = {
  rifle: {
    id: 'rifle', name: 'アサルトライフル', short: 'ライフル', slot: 1,
    dmg: 24, head: 2.5, pellets: 1, rpm: 640, auto: true,
    mag: 30, reserve: 210, reload: 1.9,
    spread: 0.010, spreadMove: 0.028, spreadAim: 0.003, bloom: 0.0045, bloomMax: 0.035,
    recoilPitch: 0.012, recoilYaw: 0.006, shake: 0.06, range: 90, falloff: [25, 70, 0.7], knock: 0.7,
  },
  pistol: {
    id: 'pistol', name: 'ハンドガン', short: 'ハンドガン', slot: 2,
    dmg: 34, head: 2.5, pellets: 1, rpm: 330, auto: false,
    mag: 12, reserve: Infinity, reload: 1.25,
    spread: 0.008, spreadMove: 0.02, spreadAim: 0.002, bloom: 0.012, bloomMax: 0.04,
    recoilPitch: 0.03, recoilYaw: 0.006, shake: 0.05, range: 60, falloff: [15, 45, 0.6], knock: 1.0,
  },
  shotgun: {
    id: 'shotgun', name: 'ショットガン', short: 'ショットガン', slot: 3,
    dmg: 16, head: 1.8, pellets: 8, rpm: 75, auto: false,
    mag: 6, reserve: 36, reload: 2.3,
    spread: 0.075, spreadMove: 0.09, spreadAim: 0.055, bloom: 0, bloomMax: 0,
    recoilPitch: 0.07, recoilYaw: 0.01, shake: 0.18, range: 35, falloff: [6, 22, 0.35], knock: 1.1,
  },
  // ロケットランチャー: たまは とんでいく（projectile）。ばくはつで まわりに ダメージ＋ふっとばし
  rocket: {
    id: 'rocket', name: 'ロケットランチャー', short: 'ロケット', slot: 4,
    dmg: 260, head: 1, pellets: 1, rpm: 50, auto: false,
    mag: 1, reserve: 3, reload: 2.6,
    spread: 0.004, spreadMove: 0.012, spreadAim: 0.002, bloom: 0, bloomMax: 0,
    recoilPitch: 0.085, recoilYaw: 0.012, shake: 0.4, range: 90, falloff: [0, 1, 1], knock: 0,
    projectile: true, speed: 34, blast: 4.5, power: 13, life: 3, noRefill: true,
  },
};
export const WEAPON_ORDER = ['rifle', 'pistol', 'shotgun', 'rocket'];
export const DEFAULT_WEAPON = 'rifle';

export function fireInterval(w) { return 60 / w.rpm; }

// ウェーブの はじめに よびだんを ほじゅう（へっていたら もとの かずまで）
// ロケットは ほじゅう しない（ゾンビが おとす たまを ひろう）
export function refillReserve(g) {
  const w = WEAPONS[g.id];
  if (w.noRefill) return;
  if (w.reserve !== Infinity) g.reserve = Math.max(g.reserve, w.reserve);
}

// ---- ロケットだんの ドロップ ----
export const DROP_CHANCE = { walker: 0.06, runner: 0.08, brute: 0.25, boss: 1 };
export const ROCKET_RESERVE_MAX = 6;   // よびは 6はつまで
export const PICKUP_LIFE = 20;         // 20びょうで きえる
export const PICKUP_BLINK = 5;         // さいごの 5びょうは ちかちか
export const MAX_PICKUPS = 4;
// たおした ときに おとす かず（rnd: 0..1）
export function rollRocketDrop(kind, rnd = Math.random()) {
  if (kind === 'boss') return 2;
  return rnd < (DROP_CHANCE[kind] || 0) ? 1 : 0;
}
// ひろう: はいった かずを かえす（いっぱいなら 0）
export function addRocketAmmo(g, n = 1) {
  const room = Math.max(0, ROCKET_RESERVE_MAX - g.reserve);
  const k = Math.min(room, n);
  g.reserve += k;
  return k;
}
export function pickupVisible(age) {
  const left = PICKUP_LIFE - age;
  if (left <= 0) return false;
  if (left > PICKUP_BLINK) return true;
  return Math.floor(age * (left < 2 ? 10 : 5)) % 2 === 0;
}

// ---- じかん（ウェーブごとに ひる → ゆうがた → よる）----
export const TOD_ORDER = ['day', 'sunset', 'night'];
export function timeOfDay(wave, start = 'day') {
  const s = Math.max(0, TOD_ORDER.indexOf(start));
  return TOD_ORDER[(Math.max(1, wave) - 1 + s) % 3];
}
// いろ・あかるさ（sky: そらの グラデーション 4いろ、うえ→した）
export const TOD = {
  day: { fog: 0xe9d6b4, near: 22, far: 70, hemiSky: 0xd4e6ff, hemiGround: 0x6b5a3c, hemiI: 1.5, sun: 0xfff0d0, sunI: 2.4, off: [14, 26, 9],
    sky: [0x5d8fd6, 0xa9c7e6, 0xf2d9b0, 0xe8c79a], night: 0, moon: 0, lamps: 0, disk: 0, boost: 1 },
  sunset: { fog: 0xd99a78, near: 18, far: 64, hemiSky: 0xffc8a0, hemiGround: 0x55405a, hemiI: 1.3, sun: 0xffa060, sunI: 1.9, off: [-24, 9, -14],
    sky: [0x34407e, 0xb4647a, 0xf2955a, 0xf6c07a], night: 0.15, moon: 0.25, lamps: 0.7, disk: 1, boost: 1.5 },
  night: { fog: 0x1d2a4e, near: 13, far: 56, hemiSky: 0x9fb3ee, hemiGround: 0x34344e, hemiI: 1.25, sun: 0xb4c8ff, sunI: 1.0, off: [-12, 24, -16],
    sky: [0x0a1430, 0x1b2d5c, 0x34497e, 0x2a3a63], night: 1, moon: 1, lamps: 1, disk: 0, boost: 2.4 },
};
export function mixColor(a, b, k) {
  const r = ((a >> 16) & 255) + ((((b >> 16) & 255) - ((a >> 16) & 255)) * k);
  const g = ((a >> 8) & 255) + ((((b >> 8) & 255) - ((a >> 8) & 255)) * k);
  const bl = (a & 255) + (((b & 255) - (a & 255)) * k);
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl);
}
export function mixTod(from, to, k) {
  const A = TOD[from] || TOD.day, B = TOD[to] || TOD.day, o = {};
  for (const key in A) {
    const a = A[key], b = B[key];
    if (key === 'sky') o.sky = a.map((c, i) => mixColor(c, b[i], k));
    else if (key === 'off') o.off = a.map((v, i) => v + (b[i] - v) * k);
    else if (['fog', 'hemiSky', 'hemiGround', 'sun'].includes(key)) o[key] = mixColor(a, b, k);
    else o[key] = a + (b - a) * k;
  }
  return o;
}

// ---- ばくはつ ----
// ばくしんちから d の ところの つよさ 0..1（まんなか 35% は フル、ふちで 0.25、そとは 0）
export function blastFalloff(d, radius) {
  if (d >= radius) return 0;
  const core = radius * 0.35;
  if (d <= core) return 1;
  return 1 - 0.75 * (d - core) / (radius - core);
}
// ばくはつの ダメージ
export function blastDamage(w, d) { return Math.round(w.dmg * blastFalloff(d, w.blast)); }
// ふっとぶ はやさ（たかく まいあがる）。dx,dz: ばくしん→ゾンビ
export function launchVelocity(dx, dz, d, radius, power, rnd = 0.5) {
  const f = blastFalloff(d, radius);
  const l = Math.hypot(dx, dz) || 1, ux = d < 0.05 ? 0 : dx / l, uz = d < 0.05 ? 0 : dz / l;
  const hs = power * (0.45 + 0.55 * f);
  return { vx: ux * hs * 0.7, vy: 6 + power * 0.55 * f + rnd * 2, vz: uz * hs * 0.7, spin: 6 + f * 10 + rnd * 4 };
}
// うたれた ときの ノックバック（m/s）。ちかいほど つよい
export function knockAt(w, dist) {
  const [near, far] = w.falloff;
  const k = dist <= near ? 1 : dist >= far ? 0.25 : 1 - 0.75 * (dist - near) / (far - near);
  return (w.knock || 0) * k;
}
// これより つよい ノックバックで たおすと ふっとぶ
export const FLY_KNOCK = 4.5;
// いちどに そらを とぶ ゾンビの かず（かるさの ため）
export const MAX_AIR = 6;

// ---- いどう（なめらか）----
// スティック: あそび（デッドゾーン）＋ ゆるやかな カーブ。もどりは おおきさ 0..1 の ベクトル
export function stickCurve(x, y, dead = 0.12, expo = 1.5) {
  const l = Math.hypot(x, y);
  if (l <= dead) return { x: 0, y: 0 };
  const lc = Math.min(1, l);
  const m = Math.pow((lc - dead) / (1 - dead), expo);
  return { x: x / l * m, y: y / l * m };
}
// いまの はやさ v を ねらいの はやさ t へ ちかづける（かそく・げんそく。フレームレートに よらない）
export function approach(v, t, rate, dt) { return t + (v - t) * Math.exp(-rate * dt); }

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
  // ボス: 3ウェーブごと。ちょっと でかい・かたい・ためてから ドスン！／とっしん
  boss: { id: 'boss', hp: 1500, speed: 1.35, dmg: 20, atkRate: 1.6, scale: 1.75, score: 2000, name: 'ボスゾンビ' },
};
export const isBossWave = (n) => n > 0 && n % 3 === 0;
// ボスの HP（ウェーブが すすむと かたく なる）
export function bossHp(n) { return Math.round(ZOMBIES.boss.hp * (1 + Math.max(0, n / 3 - 1) * 0.4)); }
// ボスの こうげき
export const BOSS = {
  slamRange: 3.0, slamWind: 0.9, slamRadius: 3.2, slamDmg: 24, slamCd: 2.2,
  chargeMin: 6, chargeMax: 18, chargeWind: 1.0, chargeSpeed: 9.5, chargeTime: 1.2, chargeDmg: 22, chargeCd: 5,
};
export const HEADSHOT_BONUS = 50;
export const ATTACK_RANGE = 1.25;
export const PLAYER_MAX_HP = 100;

// ウェーブの なかみ（ぜんぶで なんたい・どのしゅるい・いちどに なんたいまで）
export function waveSpec(n) {
  const total = Math.min(6 + (n - 1) * 4, 60);
  const runnerShare = n < 2 ? 0 : Math.min(0.15 + (n - 2) * 0.07, 0.45);
  const bruteCount = n < 4 ? 0 : Math.min(1 + Math.floor((n - 4) / 2), 6);
  // はやい ゾンビ（のぼれる のは この こだけ）は ウェーブ1から かならず 1たい いじょう
  const runners = Math.max(1, Math.round((total - bruteCount) * runnerShare));
  const walkers = total - runners - bruteCount;
  const hpMul = 1 + Math.max(0, n - 5) * 0.08;
  return { n, total: total + (isBossWave(n) ? 1 : 0), walkers, runners, brutes: bruteCount, boss: isBossWave(n) ? 1 : 0,
    maxAlive: Math.min(6 + n * 2, 16), spawnGap: Math.max(0.5, 1.8 - n * 0.12), hpMul };
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
  // ボスは まんなかぐらいで とうじょう
  if (spec.boss) q.splice(Math.floor(q.length * 0.4), 0, 'boss');
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

// ---- よじのぼり（くるま・はこ・ひくい かべ）----
export const MAX_CLIMB = 4.5;          // これより たかい だんさは のぼれない（マップには ない）
export const JUMP_H = 7.2 * 7.2 / (2 * 20); // プレイヤーの ジャンプの たかさ ≈ 1.3m
// のぼる じかん（くるま 1.1m で ≈1.2びょう。でかい ゾンビは おそい）
// のぼれる のは はやい ゾンビ だけ。ほかは まわりに あつまる（でかいのは ドスン！で おとす）
export const CLIMBERS = ['runner'];
export const canClimb = (kind) => CLIMBERS.includes(kind);
// たかい ところに ずっと いると、のぼれる ゾンビが おいかけて くる
export const PERCH = { time: 4.5, cooldown: 7 };
export function perchRunnerNeeded(perchT, climbersAlive, cd) {
  return perchT >= PERCH.time && climbersAlive === 0 && cd <= 0;
}
export function climbTime(h, kind = 'walker') {
  const base = Math.max(0.8, Math.min(3.2, 0.55 + h * 0.6));
  return base * (kind === 'brute' || kind === 'boss' ? 1.35 : kind === 'runner' ? 0.85 : 1);
}
// XZ の えんと はこの すきま
export function boxGap(x, z, b) {
  const dx = Math.max(b.minX - x, 0, x - b.maxX), dz = Math.max(b.minZ - z, 0, z - b.maxZ);
  return Math.hypot(dx, dz);
}
// ゾンビ（x,z,あしもと zy, はんけい r）が さわっている はこで、のぼる さきを えらぶ。
// targetY = プレイヤーの ゆかの たかさ。それより たかい はこには のぼらない。
export function climbTarget(x, z, r, zy, targetY, boxes, reach = 0.15) {
  let best = null;
  for (const b of boxes) {
    if (b.maxY <= zy + 0.3 || b.maxY > targetY + 0.05) continue;
    if (b.maxY - zy > MAX_CLIMB) continue;
    if (b.minY > zy + 0.6) continue; // うかんだ はこ（のりもの の まど など）は べつの はこから
    if (boxGap(x, z, b) > r + reach) continue;
    if (!best || b.maxY > best.maxY) best = b;
  }
  // のぼった さきが うえの はこ（くるまの やね など）で ふさがって せまい → そのまま うえの はこへ
  for (let k = 0; best && k < 3; k++) {
    const land = climbLanding(x, z, best, r);
    let up = null;
    for (const s of boxes) {
      if (s === best || Math.abs(s.minY - best.maxY) > 0.08 || s.maxY > targetY + 0.05 || s.maxY - zy > MAX_CLIMB) continue;
      if (land.x > s.minX - r && land.x < s.maxX + r && land.z > s.minZ - r && land.z < s.maxZ + r) { up = s; break; }
    }
    if (!up) break;
    best = up;
  }
  return best;
}
// ゾンビが のぼりきって たつ ばしょ（はこの うえ・ふちから すこし うちがわ）
export function climbLanding(x, z, b, inset = 0.35) {
  const ix = Math.min(inset, (b.maxX - b.minX) / 2), iz = Math.min(inset, (b.maxZ - b.minZ) / 2);
  return { x: Math.max(b.minX + ix, Math.min(b.maxX - ix, x)), z: Math.max(b.minZ + iz, Math.min(b.maxZ - iz, z)), y: b.maxY };
}
// いま たっている はこ（あしもとの ゆか）
export function supportBox(x, z, r, y, boxes) {
  let best = null;
  for (const b of boxes) {
    if (x + r * 0.7 < b.minX || x - r * 0.7 > b.maxX || z + r * 0.7 < b.minZ || z - r * 0.7 > b.maxZ) continue;
    if (Math.abs(b.maxY - y) < 0.06 && (!best || b.maxY > best.maxY)) best = b;
  }
  return best;
}
// プレイヤーが のれる はこの うえ（じめんから ジャンプ・となりへ ジャンプで いける ところ）を ぜんぶ さがす
export function playerReachableTops(boxes, { jump = JUMP_H, step = 0.3, gap = 2.2 } = {}) {
  const reach = new Set(), q = [];
  boxes.forEach((b, i) => { if (b.maxY - step <= jump) { reach.add(i); q.push(i); } });
  while (q.length) {
    const a = boxes[q.shift()];
    boxes.forEach((b, j) => {
      if (reach.has(j)) return;
      const dx = Math.max(b.minX - a.maxX, 0, a.minX - b.maxX), dz = Math.max(b.minZ - a.maxZ, 0, a.minZ - b.maxZ);
      if (Math.hypot(dx, dz) > gap) return;
      if (b.maxY - step > a.maxY + jump) return;
      reach.add(j); q.push(j);
    });
  }
  return [...reach].map((i) => boxes[i]);
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
    stage: ['day', 'night'].includes(o.stage) ? o.stage : 'day',
    flashlight: o.flashlight === undefined ? true : !!o.flashlight,
    ...normalizeOutfits(o),
    gear: normalizeGear(o.gear),
  };
}

// ---- ふく（みための きがえ。つよさは かわらない）----
export const OUTFITS = [
  { id: 'normal', name: 'ふつう' },
  { id: 'camo', name: 'めいさいふく' },
  { id: 'ninja', name: 'にんじゃ' },
  { id: 'kaito', name: 'かいとう' },
  { id: 'space', name: 'うちゅうふく' },
  { id: 'gold', name: 'ゴールド' },
  { id: 'robot', name: 'ロボット' },
];
export const OUTFIT_IDS = OUTFITS.map((o) => o.id);
export function outfitName(id) { const o = OUTFITS.find((x) => x.id === id); return o ? o.name : 'ふつう'; }
export function normalizeOutfits(o) {
  const got = new Set(['normal']);
  if (Array.isArray(o.outfits)) for (const id of o.outfits) if (OUTFIT_IDS.includes(id)) got.add(id);
  const outfits = OUTFIT_IDS.filter((id) => got.has(id));
  return { outfits, outfit: outfits.includes(o.outfit) ? o.outfit : 'normal' };
}
// まだ もっていない ふくを 1つ（ぜんぶ もっていたら null）
export function nextOutfit(owned, r = Math.random()) {
  const left = OUTFIT_IDS.filter((id) => id !== 'normal' && !owned.includes(id));
  return left.length ? left[Math.min(left.length - 1, Math.floor(r * left.length))] : null;
}
export function unlockOutfit(save, id) {
  if (!OUTFIT_IDS.includes(id)) return false;
  const had = save.outfits.includes(id);
  if (!had) save.outfits = OUTFIT_IDS.filter((x) => x === id || save.outfits.includes(x));
  save.outfit = id;
  return !had;
}

// ---- おそわれている おじさん（たすけると ふくを くれる）----
export const OJISAN = {
  hp: 100,
  dmgMul: 0.35,     // ゾンビの こうげきは よわめに きく（たすけに いく じかんが ある）
  firstWave: 2,
  delay: [3, 9],    // ウェーブが はじまってから でてくるまで（びょう）
  dist: [14, 30],   // プレイヤーからの きょり
  thankTime: 3.5, fleeTime: 3.2,
  runSpeed: 4.2, sideSpeed: 0.7,
  bonus: 300, bonusAll: 500,
};
// こんかいの ウェーブに でるか（2〜3ウェーブに 1かい・ボスの ウェーブは でない）
export function shouldSpawnOjisan(wave, lastWave, r = Math.random()) {
  if (wave < OJISAN.firstWave || isBossWave(wave)) return false;
  const gap = wave - (lastWave || 0);
  if (gap >= 3) return true;
  if (gap === 2) return r < 0.5;
  return false;
}
export function ojisanAttackers(wave) { return Math.min(5, 2 + Math.ceil(wave / 3)); }
// おじさんの ばしょ: あるける マス（cells: [[x,z],...]）から きょりで えらぶ
export function pickOjisanSpot(cells, px, pz, r = Math.random(), [minD, maxD] = OJISAN.dist) {
  const ok = cells.filter(([x, z]) => { const d = Math.hypot(x - px, z - pz); return d >= minD && d <= maxD; });
  if (ok.length) return ok[Math.min(ok.length - 1, Math.floor(r * ok.length))];
  let best = null, bd = -1;
  for (const c of cells) { const d = Math.hypot(c[0] - px, c[1] - pz); if (d > bd) { bd = d; best = c; } }
  return best;
}
// がめんの そとに いる とき、やじるしを がめんの ふちに おく（ndc: -1〜1、behind: カメラの うしろ）
export function edgeArrow(nx, ny, behind, margin = 0.86) {
  let x = nx, y = ny;
  if (behind) { x = -x; y = -y; if (Math.abs(x) < 1e-3 && Math.abs(y) < 1e-3) y = -1; }
  const k = margin / Math.max(Math.abs(x), Math.abs(y), 1e-6);
  const onScreen = !behind && Math.abs(nx) <= 1 && Math.abs(ny) <= 1;
  return { onScreen, x: onScreen ? nx : x * k, y: onScreen ? ny : y * k, ang: Math.atan2(-y, x) };
}
export const SENS = { low: 0.6, mid: 1.0, high: 1.5 };
// プレイヤーから あるいて いける ひろい マス（まわり 8マスも あいている）
export function openCells(grid, limit = grid.half - 3) {
  const { n, half, cell, blocked, dist } = grid, out = [];
  for (let gz = 1; gz < n - 1; gz++) for (let gx = 1; gx < n - 1; gx++) {
    const i = gz * n + gx;
    if (blocked[i] || dist[i] < 0) continue;
    let ok = true;
    for (let dz = -1; dz <= 1 && ok; dz++) for (let dx = -1; dx <= 1; dx++) if (blocked[i + dz * n + dx]) { ok = false; break; }
    if (!ok) continue;
    const x = -half + (gx + 0.5) * cell, z = -half + (gz + 0.5) * cell;
    if (Math.abs(x) > limit || Math.abs(z) > limit) continue;
    out.push([x, z]);
  }
  return out;
}

// ---- そうび（ランダムで おちる。のうりょく つき）----
export const GEAR_SLOTS = [
  { id: 'head', name: 'ヘルメット', icon: '⛑' },
  { id: 'body', name: 'ベスト', icon: '🦺' },
  { id: 'feet', name: 'くつ', icon: '👟' },
  { id: 'arm', name: 'うでわ', icon: '💍' },
];
export const GEAR_SLOT_IDS = GEAR_SLOTS.map((s) => s.id);
export const RARITIES = [
  { id: 'n', name: 'ふつう', color: '#e4e4e4', w: 64, mult: 1, stats: 1 },
  { id: 'r', name: 'レア', color: '#4aa8ff', w: 26, mult: 1.4, stats: 2 },
  { id: 'sr', name: 'すごいレア', color: '#c070ff', w: 8, mult: 1.8, stats: 2 },
  { id: 'l', name: 'でんせつ', color: '#ffc83a', w: 2, mult: 2.3, stats: 3 },
];
export const RARITY_IDS = RARITIES.map((r) => r.id);
export const rarityOf = (id) => RARITIES.find((r) => r.id === id) || RARITIES[0];
// のうりょく: [1こ あたりの さいしょう, さいだい（ふつう）]・ぜんぶ あわせた うえげん
export const GEAR_STATS = {
  def: { name: 'ぼうぎょ', unit: '%', range: [2, 5], cap: 30 },   // うける ダメージ −%
  hp: { name: 'さいだいHP', unit: '', range: [5, 12], cap: 50 },   // HP +
  spd: { name: 'はやさ', unit: '%', range: [2, 4], cap: 15 },      // あるく はやさ +%
  rel: { name: 'リロード', unit: '%', range: [3, 7], cap: 25 },    // リロード じかん −%
};
export const GEAR_STAT_IDS = Object.keys(GEAR_STATS);
// ぶいごとに つきやすい のうりょく（さいしょが メイン）
export const SLOT_STATS = { head: ['def', 'hp', 'rel'], body: ['def', 'hp', 'spd'], feet: ['spd', 'def', 'hp'], arm: ['rel', 'hp', 'spd'] };
// 1この そうびの うえげん（でんせつの さいだい）
export const statItemMax = (k) => Math.ceil(GEAR_STATS[k].range[1] * RARITIES[RARITIES.length - 1].mult);
export const GEAR_COLORS = [
  { id: 'red', name: 'あか', hex: 0xe04a3a }, { id: 'blue', name: 'あお', hex: 0x3a6fe0 }, { id: 'green', name: 'みどり', hex: 0x3ab84a },
  { id: 'yellow', name: 'きいろ', hex: 0xf0c830 }, { id: 'purple', name: 'むらさき', hex: 0x9a4ad8 }, { id: 'white', name: 'しろ', hex: 0xf0f0f0 },
  { id: 'black', name: 'くろ', hex: 0x2a2a30 }, { id: 'pink', name: 'ピンク', hex: 0xff7ab8 }, { id: 'orange', name: 'オレンジ', hex: 0xff8a1f },
  { id: 'sky', name: 'みずいろ', hex: 0x6ad8ff },
];
export const GEAR_COLOR_IDS = GEAR_COLORS.map((c) => c.id);
export const gearColor = (id) => GEAR_COLORS.find((c) => c.id === id) || GEAR_COLORS[0];
export const GEAR_DROP = { walker: 0.03, runner: 0.04, brute: 0.2, boss: 1 };
export const GEAR_FLOOR = { boss: 'sr', ojisan: 'r' };   // ボスは すごいレア いじょう、おじさんは レア いじょう
export const INV_CAP = 20;
export const GEAR_LIFE = 25;

export function rollGearDrop(kind, r = Math.random()) { return kind === 'boss' || r < (GEAR_DROP[kind] || 0); }
export function rollRarity(r = Math.random(), floor = 'n') {
  const fi = Math.max(0, RARITY_IDS.indexOf(floor));
  const list = RARITIES.slice(fi), tot = list.reduce((a, x) => a + x.w, 0);
  let t = r * tot;
  for (const x of list) { if (t < x.w) return x.id; t -= x.w; }
  return list[list.length - 1].id;
}
// rnd: () => 0..1
export function rollGear(rnd = Math.random, { slot = null, floor = 'n' } = {}) {
  const sl = slot && GEAR_SLOT_IDS.includes(slot) ? slot : GEAR_SLOT_IDS[Math.min(3, Math.floor(rnd() * 4))];
  const rar = rarityOf(rollRarity(rnd(), floor));
  const pool = SLOT_STATS[sl].slice(), stats = {};
  for (let i = 0; i < rar.stats && pool.length; i++) {
    const k = i === 0 ? pool.shift() : pool.splice(Math.min(pool.length - 1, Math.floor(rnd() * pool.length)), 1)[0];
    const [a, b] = GEAR_STATS[k].range;
    stats[k] = Math.max(1, Math.min(statItemMax(k), Math.round((a + rnd() * (b - a)) * rar.mult)));
  }
  const color = GEAR_COLOR_IDS[Math.min(GEAR_COLOR_IDS.length - 1, Math.floor(rnd() * GEAR_COLOR_IDS.length))];
  const id = 'g' + Math.floor(rnd() * 2176782336).toString(36) + Date.now().toString(36).slice(-4);
  return { id, slot: sl, rarity: rar.id, color, stats };
}
export function gearName(g) {
  const s = GEAR_SLOTS.find((x) => x.id === g.slot);
  return `${gearColor(g.color).name}の ${s ? s.name : ''}`;
}
// くらべる ための てんすう（ぼうぎょ・はやさ は すこし おもく）
export function gearScore(g) {
  if (!g) return 0;
  const w = { def: 1.6, hp: 0.6, spd: 1.6, rel: 1 };
  let t = 0; for (const [k, v] of Object.entries(g.stats || {})) t += (w[k] || 0) * v;
  return Math.round(t * 10) / 10;
}
// そうびの ごうけい（うえげん つき）
export function gearTotals(items) {
  const t = { def: 0, hp: 0, spd: 0, rel: 0 };
  for (const g of items) if (g) for (const k of GEAR_STAT_IDS) t[k] += g.stats[k] || 0;
  for (const k of GEAR_STAT_IDS) t[k] = Math.min(GEAR_STATS[k].cap, t[k]);
  return t;
}
export function equippedItems(gear) { return GEAR_SLOT_IDS.map((s) => gear.inv.find((g) => g.id === gear.eq[s]) || null); }
export function gearEffects(gear) {
  const t = gearTotals(equippedItems(gear));
  return { maxHp: 100 + t.hp, dmgMul: 1 - t.def / 100, speedMul: 1 + t.spd / 100, reloadMul: 1 / (1 - t.rel / 100), totals: t };
}
function cleanGear(g) {
  if (!g || typeof g !== 'object' || typeof g.id !== 'string' || !g.id || g.id.length > 40) return null;
  if (!GEAR_SLOT_IDS.includes(g.slot)) return null;
  const rarity = RARITY_IDS.includes(g.rarity) ? g.rarity : 'n';
  const color = GEAR_COLOR_IDS.includes(g.color) ? g.color : 'white';
  const stats = {};
  const src = g.stats && typeof g.stats === 'object' ? g.stats : {};
  for (const k of GEAR_STAT_IDS) if (Number.isFinite(src[k]) && src[k] > 0) stats[k] = Math.min(statItemMax(k), Math.round(src[k]));
  return { id: g.id, slot: g.slot, rarity, color, stats };
}
export function normalizeGear(x) {
  const o = x && typeof x === 'object' ? x : {};
  const inv = [], seen = new Set();
  for (const g of Array.isArray(o.inv) ? o.inv : []) {
    const c = cleanGear(g); if (!c || seen.has(c.id)) continue;
    seen.add(c.id); inv.push(c); if (inv.length >= INV_CAP) break;
  }
  const eq = {}, e0 = o.eq && typeof o.eq === 'object' ? o.eq : {};
  for (const s of GEAR_SLOT_IDS) { const g = inv.find((i) => i.id === e0[s] && i.slot === s); eq[s] = g ? g.id : null; }
  return { inv, eq };
}
// ひろった そうびを どうするか
// 'equip': つける（かばんが いっぱいなら まえの そうびと いれかえ）/ 'keep': かばんへ / 'drop': すてる
export function gearAction(gear, item, act) {
  const inInv = gear.inv.some((g) => g.id === item.id);
  if (act === 'drop') {
    gear.inv = gear.inv.filter((g) => g.id !== item.id);
    for (const s of GEAR_SLOT_IDS) if (gear.eq[s] === item.id) gear.eq[s] = null;
    return { ok: true };
  }
  if (act === 'keep') {
    if (inInv) return { ok: true };
    if (gear.inv.length >= INV_CAP) return { ok: false, full: true };
    gear.inv.push(item); return { ok: true };
  }
  if (act === 'equip') {
    let replaced = null;
    if (!inInv) {
      if (gear.inv.length >= INV_CAP) {
        const old = gear.inv.find((g) => g.id === gear.eq[item.slot]);
        if (!old) return { ok: false, full: true };
        gear.inv = gear.inv.filter((g) => g.id !== old.id); replaced = old;
      }
      gear.inv.push(item);
    }
    gear.eq[item.slot] = item.id;
    return { ok: true, replaced };
  }
  if (act === 'unequip') { if (gear.eq[item.slot] === item.id) gear.eq[item.slot] = null; return { ok: true }; }
  return { ok: false };
}
