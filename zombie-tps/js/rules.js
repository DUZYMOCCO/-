// ゾンビストライク — ゲームの きまり（DOM / three.js に いぞんしない。node のテストから よめる）
// ぶき・ダメージ・ウェーブ・あたりはんてい（レイ×はこ）・いどうの ぶつかり・ゾンビの みちさがし（フローフィールド）

export const VERSION = '0.8.0';

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
  // ミニガン: おもい。うつまえに 0.5びょう まわして から、ものすごい はやさで うつ。うっている あいだは あるくのが おそい
  minigun: {
    id: 'minigun', name: 'ミニガン', short: 'ミニガン', slot: 5,
    dmg: 17, head: 2, pellets: 1, rpm: 1050, auto: true,
    mag: 150, reserve: 300, reload: 3.4,
    spread: 0.028, spreadMove: 0.045, spreadAim: 0.018, bloom: 0.0012, bloomMax: 0.02,
    recoilPitch: 0.0035, recoilYaw: 0.005, shake: 0.035, range: 80, falloff: [22, 65, 0.7], knock: 0.8,
    spinUp: 0.5, spinDown: 0.9, moveMul: 0.55, carryMul: 0.9,
  },
  // v0.8.0: スナイパーライフル（かくうの デザイン）。1ぱつ ずつ ガチャッ（ボルト）。ふつうの ゾンビは 1ぱつ・2たいまで つらぬく
  // ねらう と スコープ（この ぶき だけ）
  sniper: {
    id: 'sniper', name: 'スナイパーライフル', short: 'スナイパー', slot: 6,
    dmg: 110, head: 2.5, pellets: 1, rpm: 46, auto: false,
    mag: 5, reserve: 30, reload: 2.8,
    spread: 0.03, spreadMove: 0.05, spreadAim: 0.0004, bloom: 0, bloomMax: 0,
    recoilPitch: 0.05, recoilYaw: 0.008, shake: 0.12, range: 160, falloff: [70, 150, 0.85], knock: 1.3,
    pierce: 2, pierceMul: 0.8, bolt: 0.9, scope: true,
  },
};
export const WEAPON_ORDER = ['rifle', 'pistol', 'shotgun', 'rocket', 'minigun', 'sniper'];

// ---- v0.8.0: スコープ（スナイパーだけ）----
// fov: ズーム・sens: うごかす はやさの ばいりつ・sway: ゆれ（ラジアン。7さいでも ねらえる くらい ちいさく）
export const SCOPE = { fov: 22, sens: 0.35, sway: 0.0035, swayMove: 1.8, hz: 0.33, on: 0.8 };
export const AIM_FOV = { hip: 70, aim: 46 };
export const hasScope = (id) => !!(WEAPONS[id] && WEAPONS[id].scope);
export const isScoped = (id, aim) => hasScope(id) && aim >= SCOPE.on;
export function aimFov(id, aim) {
  const to = hasScope(id) ? SCOPE.fov : AIM_FOV.aim;
  return AIM_FOV.hip + (to - AIM_FOV.hip) * Math.max(0, Math.min(1, aim));
}
export function aimSensMul(id, aim) { return hasScope(id) ? 1 - (1 - SCOPE.sens) * Math.max(0, Math.min(1, aim)) : 1; }
// ゆっくり まるく ゆれる（うごくと すこし おおきく）
export function scopeSway(t, aim, moving = false) {
  if (!isScoped('sniper', aim)) return { x: 0, y: 0 };
  const a = SCOPE.sway * (moving ? SCOPE.swayMove : 1), w = t * Math.PI * 2 * SCOPE.hz;
  return { x: Math.sin(w) * a, y: Math.sin(w * 2) * a * 0.5 };
}
export const DEFAULT_WEAPON = 'rifle';

export function fireInterval(w) { return 60 / w.rpm; }

// ウェーブの はじめに よびだんを ほじゅう（へっていたら もとの かずまで）
// ロケットは ほじゅう しない（ゾンビが おとす たまを ひろう）
export function refillReserve(g) {
  const w = gunStats(g);
  if (w.noRefill) return;
  if (w.reserve !== Infinity) g.reserve = Math.max(g.reserve, w.reserve);
}

// ---- ロケットだんの ドロップ ----
export const DROP_CHANCE = { walker: 0.06, runner: 0.08, brute: 0.25, boss: 1,
  guard: 0.07, crawler: 0.07, soldier: 0.12, spitter: 0.09, burning: 0.08, riot: 0.14, bloater: 0.1, screamer: 0.12,
  firefighter: 0.14, electric: 0.1, mutant: 0.16, charger: 0.25 };
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

// ---- じかん（ウェーブごとに ひる → ゆうやけ → よる → ひる …。v0.6.1: ぜんぶ くらい → v0.7.1: ひるは くもりの あかるさに もどる）----
export const TOD_ORDER = ['day', 'sunset', 'night'];
export function timeOfDay(wave, start = 'day') {
  const s = Math.max(0, TOD_ORDER.indexOf(start));
  return TOD_ORDER[(Math.max(1, wave) - 1 + s) % 3];
}
// いろ・あかるさ（sky: そらの グラデーション 4いろ、うえ→した）
export const TOD = {
  // v0.6.1: いつも くらい（むらさきの ゆうぐれ・ちいろの ゆうがた・みどりの よる）。とおくの もえる まちが みえる
  // v0.7.1: ひるは ちゃんと あかるく（くもりの はいいろの そら・うすい たいよう・ほしと つきは なし・ライトも けす）。でも まちは もえていて うすぐらい
  day: { fog: 0x5a6068, near: 14, far: 80, hemiSky: 0xc8d0dc, hemiGround: 0x4a4640, hemiI: 1.25, sun: 0xfff0d8, sunI: 1.5, off: [14, 26, 9],
    sky: [0x2e3644, 0x4a5464, 0x6a7280, 0x5a6068], night: 0, moon: 0, lamps: 0.1, disk: 0.3, boost: 1.1 },
  sunset: { fog: 0x2e1822, near: 8, far: 48, hemiSky: 0xc0909a, hemiGround: 0x281a28, hemiI: 0.95, sun: 0xff7a48, sunI: 0.95, off: [-24, 9, -14],
    sky: [0x0a0614, 0x2a1030, 0x5a1e2c, 0x2e1822], night: 0.65, moon: 0.75, lamps: 0.85, disk: 0.45, boost: 2 },
  night: { fog: 0x0a1612, near: 7, far: 44, hemiSky: 0x88b0b0, hemiGround: 0x1e2a2a, hemiI: 0.95, sun: 0x9ad0c0, sunI: 0.7, off: [-12, 24, -16],
    sky: [0x010304, 0x04100e, 0x0c201c, 0x0a1612], night: 1, moon: 1, lamps: 1, disk: 0, boost: 2.6 },
};
export function mixColor(a, b, k) {
  const r = ((a >> 16) & 255) + ((((b >> 16) & 255) - ((a >> 16) & 255)) * k);
  const g = ((a >> 8) & 255) + ((((b >> 8) & 255) - ((a >> 8) & 255)) * k);
  const bl = (a & 255) + (((b & 255) - (a & 255)) * k);
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl);
}
// p（いまの いろ）から q へ k だけ まぜる。ゲームの じかんの うつりかわりも これを つかう
export function blendTod(A, B, k) {
  const o = {};
  for (const key in B) {
    const a = A[key] ?? B[key], b = B[key];
    if (key === 'sky') o.sky = a.map((c, i) => mixColor(c, b[i], k));
    else if (key === 'off') o.off = a.map((v, i) => v + (b[i] - v) * k);
    else if (['fog', 'hemiSky', 'hemiGround', 'sun'].includes(key)) o[key] = mixColor(a, b, k);
    else o[key] = a + (b - a) * k;
  }
  return o;
}
export function mixTod(from, to, k) {
  return blendTod(TOD[from] || TOD.day, TOD[to] || TOD.day, k);
}
// みための あかるさ（テスト・チェック よう）: そら・きりの あかるさ、ひかりの つよさ、ほし・ライト
export function todLook(p) {
  const lum = (c) => 0.299 * ((c >> 16) & 255) + 0.587 * ((c >> 8) & 255) + 0.114 * (c & 255);
  return { sky: p.sky.reduce((a, c) => a + lum(c), 0) / p.sky.length, fog: lum(p.fog), light: p.hemiI + p.sunI,
    far: p.far, stars: p.night, moon: p.moon, flashlight: p.night > 0.5 };
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
export function createGun(id, lv = 1) {
  const w = upgradedWeapon(id, lv);
  return { id, lv: w.lv, w, ammo: w.mag, reserve: w.reserve, cooldown: 0, reloading: 0, bloom: 0, triggerHeld: false, lastTrigger: false, spin: 0 };
}
// その じゅうの いまの つよさ（つよく した ぶん こみ）
export const gunStats = (g) => g.w || WEAPONS[g.id];
// レベルを かえる（たまは へらさない。マガジンが ふえたら その ぶん いれる）
export function setGunLevel(g, lv) {
  const old = gunStats(g), w = upgradedWeapon(g.id, lv);
  g.w = w; g.lv = w.lv;
  if (w.mag > old.mag && g.reloading === 0) g.ammo = Math.min(w.mag, g.ammo + (w.mag - old.mag));
  return g;
}

// ---- v0.8.0: ぶきを つよく する（スコアを つかう）----
// レベル 1〜max。1レベル ごとに いりょく +10%・はやさ +5%・たま +10%（ロケットは Lv5 から 2はつ）
// ねだん: base × 1.5^(レベル−1)（10の くらい で まるめ）
export const UPGRADE = { max: 8, grow: 1.5, dmg: 0.10, rate: 0.05, mag: 0.10,
  base: { rifle: 400, pistol: 250, shotgun: 400, rocket: 600, minigun: 600, sniper: 500 } };
export const clampLv = (lv) => Math.max(1, Math.min(UPGRADE.max, Number.isFinite(lv) ? Math.floor(lv) : 1));
export function upgradeCost(id, lv) {
  const L = clampLv(lv);
  if (L >= UPGRADE.max || !UPGRADE.base[id]) return Infinity;
  return Math.round(UPGRADE.base[id] * Math.pow(UPGRADE.grow, L - 1) / 10) * 10;
}
export function upgradedWeapon(id, lv = 1) {
  const b = WEAPONS[id], L = clampLv(lv), k = L - 1;
  return { ...b, lv: L, dmg: Math.round(b.dmg * (1 + UPGRADE.dmg * k)), rpm: Math.round(b.rpm * (1 + UPGRADE.rate * k)),
    mag: Math.round(b.mag * (1 + UPGRADE.mag * k)) };
}
export const weaponLevel = (save, id) => clampLv(save && save.wlv ? save.wlv[id] : 1);
// かう: つかえる スコア（bank）から ひく。さいこう スコア（bestScore）は かわらない
export function buyUpgrade(save, id) {
  const lv = weaponLevel(save, id), cost = upgradeCost(id, lv);
  if (cost === Infinity) return { ok: false, max: true, lv };
  if ((save.bank | 0) < cost) return { ok: false, short: cost - (save.bank | 0), lv, cost };
  save.bank -= cost; save.wlv = { ...(save.wlv || {}), [id]: lv + 1 };
  return { ok: true, lv: lv + 1, cost };
}
export const BANK_MAX = 9999999;
export function earnBank(save, n) {
  if (!(n > 0)) return save.bank | 0;
  save.bank = Math.min(BANK_MAX, (save.bank | 0) + Math.floor(n));
  return save.bank;
}

// ミニガンの かいてん（0..1）。おしている あいだ spinUp びょうで 1 に なる。はなすと spinDown びょうで 0
// リロードちゅうは とまっていく。もどりは いまの spin
export function spinGun(g, held, dt) {
  const w = gunStats(g);
  if (!w.spinUp) return 0;
  const want = held && g.reloading === 0;
  g.spin = want ? Math.min(1, (g.spin || 0) + dt / w.spinUp) : Math.max(0, (g.spin || 0) - dt / w.spinDown);
  return g.spin;
}
// いどうの はやさの ばいりつ（ミニガンは もつだけで すこし おそく、まわすと もっと おそい）
export function weaponMoveMul(g) {
  const w = gunStats(g);
  if (!w.moveMul) return w.id === 'rocket' ? 0.92 : 1;
  const s = g.spin || 0;
  return (w.carryMul || 1) * (1 + (w.moveMul - 1) * s);
}

// dt すすめる。リロードが おわったら たまを うつす
export function updateGun(g, dt) {
  const w = gunStats(g);
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
  const w = gunStats(g);
  return g.reloading === 0 && g.ammo < w.mag && g.reserve > 0;
}

export function startReload(g) {
  if (!canReload(g)) return false;
  g.reloading = gunStats(g).reload;
  return true;
}

export function cancelReload(g) { g.reloading = 0; }

// ひきがね。held=おしている。うてたら true（オートでない ぶきは おしなおしが ひつよう）
// れんだ しても fireInterval より はやくは うてない
export function tryFire(g, held) {
  const w = gunStats(g);
  const pressedNow = held && !g.lastTrigger;
  g.lastTrigger = held;
  if (!held) return 'none';
  if (g.reloading > 0) return 'none';
  if (g.cooldown > 0) return 'none';
  if (!w.auto && !pressedNow) return 'none';
  if (w.spinUp && (g.spin || 0) < 1 && g.ammo > 0) return 'spin'; // まだ まわりきって いない
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
  walker: { id: 'walker', hp: 70, speed: 1.8, dmg: 10, atkRate: 1.0, scale: 1.0, score: 100, name: 'ふつう' },
  runner: { id: 'runner', hp: 45, speed: 3.9, dmg: 8, atkRate: 0.8, scale: 0.95, score: 150, name: 'はやい' },
  brute: { id: 'brute', hp: 260, speed: 1.2, dmg: 22, atkRate: 1.4, scale: 1.35, score: 400, name: 'でかい' },
  // ボス: 3ウェーブごと。ちょっと でかい・かたい・ためてから ドスン！／とっしん
  boss: { id: 'boss', hp: 1500, speed: 1.35, dmg: 20, atkRate: 1.6, scale: 1.75, score: 2000, name: 'ボスゾンビ' },
  // ---- v0.6.0: あたらしい ゾンビ（ぜんぶ かくうの みため・マークなし）----
  // けいびいん: ぼうし。すこし はやくて かたい
  guard: { id: 'guard', hp: 90, speed: 2.05, dmg: 10, atkRate: 1.0, scale: 1.0, score: 130, name: 'けいびいん' },
  // はいはい: ひくくて あてにくい
  crawler: { id: 'crawler', hp: 40, speed: 2.3, dmg: 7, atkRate: 0.8, scale: 1.0, score: 160, name: 'はいはい', low: true },
  // へいたい: ヘルメットと ベスト → からだは かたい（あたまを ねらおう）
  soldier: { id: 'soldier', hp: 120, speed: 1.9, dmg: 12, atkRate: 1.0, scale: 1.05, score: 180, name: 'へいたい', armor: 0.6 },
  // はきだし: とおくから みどりの つばを とばす（よけられる）
  spitter: { id: 'spitter', hp: 65, speed: 1.7, dmg: 8, atkRate: 1.2, scale: 1.0, score: 200, name: 'はきだし',
    spit: { min: 5, max: 14, keep: 8, cd: 3.2, dmg: 9, speed: 11, puddle: 2.5 } },
  // もえる: ほのおを まとう・はやい。さわると あちち・たおすと ボッ
  burning: { id: 'burning', hp: 55, speed: 2.7, dmg: 7, atkRate: 0.9, scale: 1.0, score: 180, name: 'もえる',
    burn: { dps: 4, time: 2.5 }, pop: { r: 2.4, dmg: 10 } },
  // たて: まえからの たまを たてで ふせぐ（よこ・うしろ・あたま・ばくはつは きく）
  riot: { id: 'riot', hp: 110, speed: 1.5, dmg: 12, atkRate: 1.1, scale: 1.05, score: 250, name: 'たて', shield: 0.12 },
  // ぶくぶく: ちかづくか たおすと みどりの ガスが ひろがる
  bloater: { id: 'bloater', hp: 90, speed: 1.25, dmg: 4, atkRate: 1.0, scale: 1.15, score: 220, name: 'ぶくぶく',
    gas: { r: 3.6, dps: 7, time: 4, fuse: 1.6 } },
  // さけび: とおくで さけぶ → まわりの ゾンビが はやく なる・なかまを よぶ
  screamer: { id: 'screamer', hp: 60, speed: 2.0, dmg: 6, atkRate: 1.0, scale: 1.0, score: 260, name: 'さけび',
    scream: { cd: 7, r: 12, buff: 1.35, time: 4, keep: 9, summon: 2 } },
  // しょうぼうし: ぶあつい ふく → ばくはつ・ほのおに つよい
  firefighter: { id: 'firefighter', hp: 150, speed: 1.7, dmg: 13, atkRate: 1.1, scale: 1.05, score: 260, name: 'しょうぼうし', blastMul: 0.5, fireproof: true },
  // でんき: ちかくに いると ビリッ（すこし おそく なる）
  electric: { id: 'electric', hp: 80, speed: 2.1, dmg: 9, atkRate: 1.0, scale: 1.0, score: 240, name: 'でんき',
    zap: { r: 3.4, cd: 2.6, dmg: 6, slow: 0.6, time: 1.3 } },
  // へんい: こぶが いっぱい・とびかかる
  mutant: { id: 'mutant', hp: 150, speed: 2.2, dmg: 15, atkRate: 1.1, scale: 1.12, score: 300, name: 'へんい',
    leap: { min: 2.6, max: 6.5, cd: 3.6, speed: 8, vy: 5 } },
  // とっしん: おおきな うで・まっすぐ とっしん（ボスより みじかい）
  charger: { id: 'charger', hp: 320, speed: 1.4, dmg: 18, atkRate: 1.3, scale: 1.3, score: 450, name: 'とっしん',
    charge: { min: 5, max: 16, wind: 0.75, speed: 8.5, time: 1.0, dmg: 16, cd: 5 } },
};
// v0.6.0: あたらしい ゾンビが でてくる ウェーブ（すこしずつ ふえる）
export const SPECIAL_UNLOCK = [
  ['guard', 2], ['crawler', 3], ['soldier', 4], ['spitter', 5], ['burning', 5], ['riot', 6],
  ['bloater', 7], ['screamer', 7], ['firefighter', 8], ['electric', 8], ['mutant', 9], ['charger', 10],
];
export const SPECIAL_IDS = SPECIAL_UNLOCK.map((u) => u[0]);
export const unlockedSpecials = (n) => SPECIAL_UNLOCK.filter((u) => u[1] <= n).map((u) => u[0]);
// まえから うたれたか（たてを もつ ゾンビ）: ゾンビの まえ = (-sin yaw, -cos yaw)。たまの むき dir が まえと はんたい なら まえから
export function frontHit(yaw, dx, dz) {
  const l = Math.hypot(dx, dz) || 1;
  return (-Math.sin(yaw)) * (dx / l) + (-Math.cos(yaw)) * (dz / l) < -0.35;
}
// しゅるいごとの ダメージの かかりかた（たて・ベスト・しょうぼうしの ふく）
export function damageMul(kind, { head = false, blast = false, front = false } = {}) {
  const d = ZOMBIES[kind] || {};
  if (blast) return d.blastMul || 1;
  if (head) return 1;
  let m = 1;
  if (d.shield && front) m *= d.shield;
  if (d.armor) m *= d.armor;
  return m;
}
// ノックバックと よろけの おもさ
export function heavyOf(kind) {
  return { boss: 0.12, brute: 0.4, charger: 0.35, firefighter: 0.7, riot: 0.6, mutant: 0.7, bloater: 0.8 }[kind] ?? 1;
}
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
  let walkers = total - runners - bruteCount;
  // v0.6.0: あたらしい ゾンビ（ふつうの ゾンビの ぶんから すこしずつ）
  const specials = {};
  const un = unlockedSpecials(n);
  if (un.length) {
    const share = Math.min(0.2 + (n - 2) * 0.05, 0.6);
    let cnt = Math.min(walkers - 3, Math.max(1, Math.round(walkers * share)));
    // はじめて でる しゅるいは 1〜2たい だけ（ためしに）
    const fresh = un.filter((k) => SPECIAL_UNLOCK.find((u) => u[0] === k)[1] === n);
    const old = un.filter((k) => !fresh.includes(k));
    for (const k of fresh) if (cnt > 0) { specials[k] = 1; cnt--; }
    for (let i = 0; cnt > 0 && old.length; i++, cnt--) { const k = old[(n + i) % old.length]; specials[k] = (specials[k] || 0) + 1; }
    for (let i = 0; cnt > 0 && fresh.length && i < fresh.length; i++, cnt--) specials[fresh[i]]++;
  }
  const sp = Object.values(specials).reduce((a, b) => a + b, 0);
  walkers -= sp;
  const hpMul = 1 + Math.max(0, n - 5) * 0.08;
  return { n, total: total + (isBossWave(n) ? 1 : 0), walkers, runners, brutes: bruteCount, boss: isBossWave(n) ? 1 : 0,
    specials, specialCount: sp, maxAlive: Math.min(6 + n * 2, 16), spawnGap: Math.max(0.5, 1.8 - n * 0.12), hpMul };
}

// しゅるいの ならびを つくる（rng: 0..1）
export function waveQueue(spec, rng = Math.random) {
  const q = [];
  for (let i = 0; i < spec.walkers; i++) q.push('walker');
  for (let i = 0; i < spec.runners; i++) q.push('runner');
  for (let i = 0; i < spec.brutes; i++) q.push('brute');
  for (const [k, c] of Object.entries(spec.specials || {})) for (let i = 0; i < c; i++) q.push(k);
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
  let tmin = 0, tmax = maxT, t1, t2, t;
  if (dx > -1e-9 && dx < 1e-9) { if (ox < b.minX || ox > b.maxX) return -1; }
  else { t1 = (b.minX - ox) / dx; t2 = (b.maxX - ox) / dx; if (t1 > t2) { t = t1; t1 = t2; t2 = t; } if (t1 > tmin) tmin = t1; if (t2 < tmax) tmax = t2; if (tmin > tmax) return -1; }
  if (dy > -1e-9 && dy < 1e-9) { if (oy < b.minY || oy > b.maxY) return -1; }
  else { t1 = (b.minY - oy) / dy; t2 = (b.maxY - oy) / dy; if (t1 > t2) { t = t1; t1 = t2; t2 = t; } if (t1 > tmin) tmin = t1; if (t2 < tmax) tmax = t2; if (tmin > tmax) return -1; }
  if (dz > -1e-9 && dz < 1e-9) { if (oz < b.minZ || oz > b.maxZ) return -1; }
  else { t1 = (b.minZ - oz) / dz; t2 = (b.maxZ - oz) / dz; if (t1 > t2) { t = t1; t1 = t2; t2 = t; } if (t1 > tmin) tmin = t1; if (t2 < tmax) tmax = t2; if (tmin > tmax) return -1; }
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
  if (z.kind && ZOMBIES[z.kind] && ZOMBIES[z.kind].low) { // はいはい: ひくい・あたまは まえ
    const fx = -Math.sin(z.yaw || 0) * 0.5 * s, fz = -Math.cos(z.yaw || 0) * 0.5 * s, hh = 0.24 * s;
    return {
      head: { minX: z.x + fx - hh, maxX: z.x + fx + hh, minY: y0 + 0.22 * s, maxY: y0 + 0.7 * s, minZ: z.z + fz - hh, maxZ: z.z + fz + hh },
      body: { minX: z.x - 0.4 * s, maxX: z.x + 0.4 * s, minY: y0, maxY: y0 + 0.55 * s, minZ: z.z - 0.4 * s, maxZ: z.z + 0.4 * s },
    };
  }
  const hw = 0.3 * s, headH = 0.5 * s, bodyTop = 1.45 * s;
  return {
    head: { minX: z.x - hw, maxX: z.x + hw, minY: y0 + bodyTop, maxY: y0 + bodyTop + headH, minZ: z.z - hw, maxZ: z.z + hw },
    body: { minX: z.x - 0.36 * s, maxX: z.x + 0.36 * s, minY: y0, maxY: y0 + bodyTop, minZ: z.z - 0.36 * s, maxZ: z.z + 0.36 * s },
  };
}

// うった たまが なにに あたるか。zombies: [{x,z,scale,alive}], walls: AABB[]
export function castShot(ox, oy, oz, dx, dy, dz, zombies, walls, range, skip = null) {
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
    if (!z.alive || (skip && skip.has(i))) continue;
    const bx = zombieBoxes(z);
    const th = rayAABB(ox, oy, oz, dx, dy, dz, bx.head, best.t);
    if (th >= 0 && th < best.t) best = { t: th, kind: 'zombie', index: i, head: true };
    const tb = rayAABB(ox, oy, oz, dx, dy, dz, bx.body, best.t);
    if (tb >= 0 && tb < best.t) best = { t: tb, kind: 'zombie', index: i, head: false };
  }
  best.x = ox + dx * best.t; best.y = oy + dy * best.t; best.z = oz + dz * best.t;
  return best;
}

// v0.8.0: つらぬく たま。pierce たい まで ぬける（かべで とまる）。hits: [{ index, head, t, x, y, z, mul }]・end: さいごの あたり
export function castPierce(ox, oy, oz, dx, dy, dz, zombies, walls, range, pierce = 0, mulStep = 0.8) {
  const hits = [], skip = new Set();
  let mul = 1, end;
  for (;;) {
    end = castShot(ox, oy, oz, dx, dy, dz, zombies, walls, range, skip);
    if (end.kind !== 'zombie') break;
    hits.push({ index: end.index, head: end.head, t: end.t, x: end.x, y: end.y, z: end.z, mul });
    if (hits.length > pierce) break;
    skip.add(end.index); mul *= mulStep;
  }
  return { hits, end };
}

// ---- はこの さがしやすい ならび（ひろい マップでも かるい）----
// cell m ごとの マスに、ちかくの はこ（pad m の よゆう つき）を いれておく。near(x,z) で その マスの はこ
export function makeBoxIndex(boxes, half, cell = 4, pad = 2) {
  const lo = -half - 8, n = Math.ceil((half * 2 + 16) / cell), cells = [];
  for (let i = 0; i < n * n; i++) cells.push([]);
  for (const b of boxes) {
    const x0 = Math.max(0, Math.floor((b.minX - pad - lo) / cell)), x1 = Math.min(n - 1, Math.floor((b.maxX + pad - lo) / cell));
    const z0 = Math.max(0, Math.floor((b.minZ - pad - lo) / cell)), z1 = Math.min(n - 1, Math.floor((b.maxZ + pad - lo) / cell));
    for (let gz = z0; gz <= z1; gz++) for (let gx = x0; gx <= x1; gx++) cells[gz * n + gx].push(b);
  }
  return {
    boxes, n, cell,
    near(x, z) {
      const gx = Math.min(n - 1, Math.max(0, Math.floor((x - lo) / cell))), gz = Math.min(n - 1, Math.max(0, Math.floor((z - lo) / cell)));
      return cells[gz * n + gx];
    },
  };
}

// ---- いどうの ぶつかり（XZ の えん × はこ）----
// たかさを みる: あしもと y が はこの うえ(top-step)より たかければ のれる＝かべに ならない
export function collideCircle(px, pz, r, y, boxes, step = 0.3) {
  if (boxes.near) boxes = boxes.near(px, pz);
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
  if (boxes.near) boxes = boxes.near(x, z);
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
  if (boxes.near) boxes = boxes.near(x, z);
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
  if (boxes.near) boxes = boxes.near(x, z);
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

// ---- マップ（えらべる。'rotate' は あそぶ たびに つぎの マップ）----
export const MAP_IDS = ['city', 'mall', 'base', 'hospital', 'camp', 'harbor', 'rooftop', 'office'];
export const MAP_CHOICES = ['rotate', ...MAP_IDS];
// こんかい あそぶ マップ
export function pickMapId(choice, next = 0) {
  if (MAP_IDS.includes(choice)) return choice;
  return MAP_IDS[((next | 0) % MAP_IDS.length + MAP_IDS.length) % MAP_IDS.length];
}
// ゾンビが でてくる ばしょ: プレイヤーから band[0]〜band[1] m の ゲートを えらぶ（ひろい マップでも まちくたびれない）
// とおすぎる ゲートは つかわない。ちかすぎる（14m いない）ゲートは つかわない
export function pickSpawnPoint(spawns, px, pz, r = Math.random(), band = [16, 34], py = 0) {
  const list = spawns.map((s) => ({ s, d: Math.hypot(s.x - px, s.z - pz, ((s.y || 0) - py) * 1.5) })).filter((o) => o.d > 14);
  if (!list.length) return spawns[Math.min(spawns.length - 1, Math.floor(r * spawns.length))];
  list.sort((a, b) => a.d - b.d);
  let ok = list.filter((o) => o.d >= band[0] && o.d <= band[1]);
  if (ok.length < 2) ok = list.slice(0, 3);
  return ok[Math.min(ok.length - 1, Math.floor(r * ok.length))].s;
}
// とおくの ゾンビは すこし いそぐ（ひろい マップで まちくたびれない）
export const HURRY = { from: 24, to: 40, max: 1.6 };
export function hurryMul(dist) {
  if (dist <= HURRY.from) return 1;
  return 1 + (HURRY.max - 1) * Math.min(1, (dist - HURRY.from) / (HURRY.to - HURRY.from));
}

// ---- セーブ ----
export const BANK_START_MAX = 2000;
export function normalizeLevels(x) {
  const o = x && typeof x === 'object' ? x : {}, r = {};
  for (const id of WEAPON_ORDER) r[id] = clampLv(o[id]);
  return r;
}
export function normalizeSave(s) {
  const o = s && typeof s === 'object' ? s : {};
  return {
    bestWave: Number.isFinite(o.bestWave) ? Math.max(0, o.bestWave | 0) : 0,
    bestScore: Number.isFinite(o.bestScore) ? Math.max(0, o.bestScore | 0) : 0,
    // v0.8.0: つかえる スコア（あそんだ スコアが たまる。つよく する／すてる で ふえる・へる）。はじめての ときは さいこう スコアから すこし おまけ
    bank: Number.isFinite(o.bank) ? Math.max(0, Math.min(BANK_MAX, Math.floor(o.bank))) : Math.min(BANK_START_MAX, Number.isFinite(o.bestScore) ? Math.max(0, o.bestScore | 0) : 0),
    wlv: normalizeLevels(o.wlv),
    slv: normalizeSlotLevels(o.slv),
    hlv: lvIn(o.hlv, HP_UP.max),
    autoFire: !!o.autoFire,
    sens: ['low', 'mid', 'high'].includes(o.sens) ? o.sens : 'mid',
    quality: ['auto', 'low', 'high'].includes(o.quality) ? o.quality : 'auto',
    stage: ['day', 'night'].includes(o.stage) ? o.stage : 'day',
    flashlight: o.flashlight === undefined ? true : !!o.flashlight,
    autoEquip: o.autoEquip === undefined ? true : !!o.autoEquip,
    map: MAP_CHOICES.includes(o.map) ? o.map : 'rotate',
    mapNext: Number.isFinite(o.mapNext) ? Math.max(0, o.mapNext | 0) % MAP_IDS.length : 0,
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
  dmgMul: 0.065,     // v0.7.0: ゾンビの こうげきは とても よわく きく（たすけに いく じかんが たっぷり）
  slack: 1.4,        // みつもり よう: よこに にげる おじさんを おいかけ なおすと はやく たたく ぶん（じっそくで やく 1.4ばい）
  maxBiters: 2,     // いちどに おじさんを たたける ゾンビは 2たいまで（ほかは まわりで まつ）
  waitR: 2.1,       // まっている ゾンビの きょり
  ring: [5, 7],     // おそう ゾンビが でてくる きょり（おじさんから）
  minSurvive: 50,   // テストで まもる「すくなくとも これだけ いきのびる」びょう
  firstWave: 2,
  delay: [3, 9],    // ウェーブが はじまってから でてくるまで（びょう）
  dist: [9, 18],    // プレイヤーからの きょり（v0.7.0: ちかく した・でも すぐ となりでは ない）
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
// おじさんが たおれるまでの じかん（びょう）の みつもり。kinds: おそう ゾンビの しゅるい、zs: ZOMBIES
// いちばん ちかい ring から あるいて きて、maxBiters たいだけ たたく（はやい ゾンビから さきに つく）
export function ojisanSurvivalTime(kinds, zs = ZOMBIES, ringD = OJISAN.ring[0]) {
  const arr = kinds.map((k) => zs[k]).map((d) => ({ t: Math.max(0, ringD - ATTACK_RANGE) / d.speed, dps: d.dmg / d.atkRate * OJISAN.dmgMul * (OJISAN.slack || 1) }))
    .sort((p, q) => p.t - q.t || q.dps - p.dps);
  const bite = arr.slice(0, OJISAN.maxBiters);
  let hp = OJISAN.hp, t = 0, dps = 0;
  for (let i = 0; i < bite.length; i++) {
    const next = i + 1 < bite.length ? bite[i + 1].t : Infinity;
    if (bite[i].t > t) t = bite[i].t;
    dps += bite[i].dps;
    const span = next - t;
    if (hp <= dps * span) return t + hp / dps;
    hp -= dps * span; t = next;
  }
  return t + hp / dps;
}
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
  { id: 'head', name: 'ヘルメット', icon: '🪖' },
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
export const GEAR_DROP = { walker: 0.03, runner: 0.04, brute: 0.2, boss: 1,
  guard: 0.035, crawler: 0.035, soldier: 0.07, spitter: 0.05, burning: 0.045, riot: 0.08, bloater: 0.05, screamer: 0.07,
  firefighter: 0.08, electric: 0.06, mutant: 0.1, charger: 0.2 };
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
// ---- じどう そうび ----
// つよさの きめかた（ぶいごと）:
//   のうりょくの おもさ  ぼうぎょ 1.6 / さいだいHP 0.6 / はやさ 1.6 / リロード 1.0（gearScore と おなじ）
//   ＋ レアの ボーナス   ふつう 0 / レア 0.5 / すごいレア 1 / でんせつ 1.5（おなじ つよさ なら レアが うえ）
//   ぜんぶ あわせる ときは うえげん（ぼうぎょ 30%・HP +50・はやさ 15%・リロード 25%）を こえた ぶんは 0 てん
export const GEAR_WEIGHT = { def: 1.6, hp: 0.6, spd: 1.6, rel: 1 };
export const RARITY_BONUS = { n: 0, r: 0.5, sr: 1, l: 1.5 };
export function gearPower(g) {
  if (!g) return 0;
  return Math.round((gearScore(g) + (RARITY_BONUS[g.rarity] || 0)) * 10) / 10;
}
// そうび 4つ ぶんの つよさ（うえげん つき）
export function loadoutValue(items) {
  const t = gearTotals(items);
  let v = 0;
  for (const k of GEAR_STAT_IDS) v += GEAR_WEIGHT[k] * t[k];
  for (const g of items) if (g) v += RARITY_BONUS[g.rarity] || 0;
  return Math.round(v * 100) / 100;
}
// かばんの なかで いちばん つよい くみあわせ（ぶいごとに 1こ）。{ slot: id|null }
export function bestLoadout(gear) {
  const per = GEAR_SLOT_IDS.map((s) => {
    const list = gear.inv.filter((g) => g.slot === s);
    // いまの そうびを さきに（おなじ つよさ なら つけかえない）
    list.sort((a, b) => (b.id === gear.eq[s]) - (a.id === gear.eq[s]) || gearPower(b) - gearPower(a));
    return [...list, null];
  });
  let best = null, bestV = -1;
  const cur = [null, null, null, null];
  const rec = (i) => {
    if (i === per.length) { const v = loadoutValue(cur); if (v > bestV + 1e-9) { bestV = v; best = cur.slice(); } return; }
    for (const g of per[i]) { cur[i] = g; rec(i + 1); }
  };
  rec(0);
  const eq = {};
  GEAR_SLOT_IDS.forEach((s, i) => { eq[s] = best[i] ? best[i].id : null; });
  return { eq, value: bestV };
}
// 「つよいのを ぜんぶ そうび」: かえた ぶいの かず を かえす
export function autoEquipBest(gear) {
  const { eq } = bestLoadout(gear);
  const changed = [];
  for (const s of GEAR_SLOT_IDS) if (gear.eq[s] !== eq[s] && eq[s]) { gear.eq[s] = eq[s]; changed.push(s); }
  return changed;
}
// その そうびを つけると どれだけ つよく なるか（うえげん つき・ほかの ぶいは そのまま）
export function equipGain(gear, item) {
  const now = equippedItems(gear);
  const i = GEAR_SLOT_IDS.indexOf(item.slot);
  const next = now.slice(); next[i] = item;
  return Math.round((loadoutValue(next) - loadoutValue(now)) * 100) / 100;
}
export function shouldAutoEquip(gear, item) { return equipGain(gear, item) > 0.05; }
// ひろった そうびを じどうで つける。かばんが いっぱい なら、いちばん よわい（つけていない）そうびを すてて ばしょを つくる
// もどり: { ok, replaced: まえの そうび, dropped: すてた そうび }
export function autoPickup(gear, item) {
  if (!shouldAutoEquip(gear, item)) return { ok: false };
  const prev = gear.inv.find((g) => g.id === gear.eq[item.slot]) || null;
  let dropped = null;
  if (!gear.inv.some((g) => g.id === item.id) && gear.inv.length >= INV_CAP) {
    const eqIds = new Set(Object.values(gear.eq));
    const loose = gear.inv.filter((g) => !eqIds.has(g.id)).sort((a, b) => gearPower(a) - gearPower(b));
    if (!loose.length) return { ok: false }; // つけている ものは ぜったい すてない
    dropped = loose[0]; gear.inv = gear.inv.filter((g) => g.id !== dropped.id);
  }
  const r = gearAction(gear, item, 'equip');
  return { ok: r.ok, replaced: prev, dropped };
}

// そうびの ごうけい（うえげん つき）
export function gearTotals(items) {
  const t = { def: 0, hp: 0, spd: 0, rel: 0 };
  for (const g of items) if (g) for (const k of GEAR_STAT_IDS) t[k] += g.stats[k] || 0;
  for (const k of GEAR_STAT_IDS) t[k] = Math.min(GEAR_STATS[k].cap, t[k]);
  return t;
}
export function equippedItems(gear) { return GEAR_SLOT_IDS.map((s) => gear.inv.find((g) => g.id === gear.eq[s]) || null); }
// v0.8.0: ぶいの レベル（あたま Lv3 など）と たいりょく レベルは セーブに のこる（そうびを かえても すてても へらない）
// ぶいの レベル: その ぶいに なにか つけて いれば、レベル 1つ ごとに ボーナス（そうびの うえげんとは べつに たす）
export const SLOT_UP = { max: 5, grow: 1.5, base: { head: 200, body: 250, feet: 200, arm: 200 },
  per: { head: { def: 1, rel: 1 }, body: { def: 2 }, feet: { spd: 1 }, arm: { rel: 2 } } };
// たいりょく: さいしょの HP 100 に +12% ずつ（そうびの HP には かけない）
export const HP_UP = { max: 6, grow: 1.6, base: 300, pct: 0.12 };
const lvIn = (v, max) => (Number.isInteger(v) ? Math.max(1, Math.min(max, v)) : 1);
export const slotLevel = (save, slot) => lvIn(save && save.slv ? save.slv[slot] : 1, SLOT_UP.max);
export const hpLevel = (save) => lvIn(save ? save.hlv : 1, HP_UP.max);
const r10 = (n) => Math.round(n / 10) * 10;
export const slotUpCost = (slot, lv) => (lv >= SLOT_UP.max ? Infinity : r10((SLOT_UP.base[slot] || 200) * SLOT_UP.grow ** (lv - 1)));
export const hpUpCost = (lv) => (lv >= HP_UP.max ? Infinity : r10(HP_UP.base * HP_UP.grow ** (lv - 1)));
export const baseHpAt = (lv) => Math.round(100 * (1 + HP_UP.pct * (lvIn(lv, HP_UP.max) - 1)));
export function slotBonus(slot, lv) {
  const o = {}; for (const [k, v] of Object.entries(SLOT_UP.per[slot] || {})) o[k] = v * (lvIn(lv, SLOT_UP.max) - 1);
  return o;
}
function spend(save, cost, apply) {
  const bank = save.bank || 0;
  if (bank < cost) return { ok: false, short: cost - bank, cost };
  save.bank = bank - cost; apply(); return { ok: true, cost };
}
export function buySlotUpgrade(save, slot) {
  if (!GEAR_SLOT_IDS.includes(slot)) return { ok: false };
  const lv = slotLevel(save, slot);
  if (lv >= SLOT_UP.max) return { ok: false, max: true, lv };
  const r = spend(save, slotUpCost(slot, lv), () => { save.slv = { ...(save.slv || {}), [slot]: lv + 1 }; });
  return { ...r, lv: r.ok ? lv + 1 : lv };
}
export function buyHpUpgrade(save) {
  const lv = hpLevel(save);
  if (lv >= HP_UP.max) return { ok: false, max: true, lv };
  const r = spend(save, hpUpCost(lv), () => { save.hlv = lv + 1; });
  return { ...r, lv: r.ok ? lv + 1 : lv };
}
export function normalizeSlotLevels(x) {
  const o = x && typeof x === 'object' ? x : {}, r = {};
  for (const s of GEAR_SLOT_IDS) r[s] = lvIn(o[s], SLOT_UP.max);
  return r;
}
// save: { slv, hlv }（なければ ぜんぶ Lv1）
export function gearEffects(gear, save = null) {
  const eqs = equippedItems(gear), t = gearTotals(eqs), bonus = { def: 0, hp: 0, spd: 0, rel: 0 };
  GEAR_SLOT_IDS.forEach((s, i) => { if (eqs[i]) for (const [k, v] of Object.entries(slotBonus(s, slotLevel(save, s)))) bonus[k] += v; });
  const all = {}; for (const k of GEAR_STAT_IDS) all[k] = t[k] + bonus[k];
  const base = baseHpAt(hpLevel(save));
  return { maxHp: base + all.hp, baseHp: base, dmgMul: 1 - all.def / 100, speedMul: 1 + all.spd / 100, reloadMul: 1 / (1 - all.rel / 100), totals: all, gearTotals: t, bonus };
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
// ---- v0.8.0: すてると スコアが もどる ----
// もどる スコア = レアの きほん ＋ つよさ（gearPower）× 5（10の くらいで まるめ）。つよく した レベルは ぶいに つくので すてても へらない
export const REFUND = { n: 30, r: 80, sr: 200, l: 500, per: 5 };
export function gearRefund(g) {
  if (!g) return 0;
  return Math.round(((REFUND[g.rarity] ?? REFUND.n) + gearPower(g) * REFUND.per) / 10) * 10;
}
export const isWorn = (gear, item) => !!item && GEAR_SLOT_IDS.some((s) => gear.eq[s] === item.id);
export const needsDropConfirm = (item) => !!item && item.rarity === 'l';
// すてる（つけている ものは すてられない）。もどった スコアは bank へ
export function discardGear(save, item) {
  const gear = save.gear;
  if (!item) return { ok: false };
  if (isWorn(gear, item)) return { ok: false, worn: true };
  gearAction(gear, item, 'drop');
  const refund = gearRefund(item);
  earnBank(save, refund);
  return { ok: true, refund };
}
// かばんが いっぱい の とき: いちばん よわい（つけていない）ものを すてて ばしょを あける
export function weakestLoose(gear, except = null) {
  const eqIds = new Set(Object.values(gear.eq));
  return gear.inv.filter((g) => !eqIds.has(g.id) && g !== except && g.id !== (except && except.id)).sort((a, b) => gearPower(a) - gearPower(b))[0] || null;
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

// ---- v0.7.0: けいさつロボ（なかまに なって ライフルで たすけてくれる）----
// みため は かくう（しろ と こん・あおい ライト・ほしの マーク）。ほんものの マークや もじは なし
export const ROBOT = {
  hp: 240,
  dmgMul: 0.5,        // ゾンビの こうげきは はんぶん きく
  dmg: 10, fireRate: 0.5, range: 17, spread: 0.035, // ライフル（プレイヤーより ずっと よわい）
  back: 0.3, side: 1.5, // プレイヤーの ひだり うしろに つく（カメラの じゃまに ならない）
  speed: 4.9, runSpeed: 6.8, near: 0.45,
  touchR: 1.35,        // さわると なかまに なる
  spot: [10, 22],      // スタートからの きょり（みつけやすい けど スタートでは ない）
  teleport: 13, teleportDy: 2.6, stuckTime: 2.5,
  scale: 0.86,         // みためは すこし ちいさめ（カメラの じゃまを へらす）
  aggroR: 3.2,         // ゾンビが ロボを ねらう きょり
  behindW: 0.75,       // うしろ・よこの ゾンビを どれだけ ゆうせん するか
};
// プレイヤーの まえ (-sin yaw, -cos yaw) / みぎ (cos yaw, -sin yaw)
export function robotFollowPoint(px, pz, yaw, back = ROBOT.back, side = ROBOT.side) {
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
  return { x: px - fx * back - rx * side, z: pz - fz * back - rz * side };
}
// 0 = プレイヤーの まっすぐ まえ、0.5 = まよこ、1 = まうしろ
export function blindness(px, pz, yaw, x, z) {
  const dx = x - px, dz = z - pz, d = Math.hypot(dx, dz);
  if (d < 1e-6) return 0.5;
  const c = (dx * -Math.sin(yaw) + dz * -Math.cos(yaw)) / d;
  return (1 - c) / 2;
}
// ちいさい ほど ねらう。プレイヤーに ちかい・うしろ・よこ ほど さきに うつ
export function robotTargetScore(dPlayer, blind) {
  return dPlayer * (1 - ROBOT.behindW * blind);
}
// zs: [{x,z,y,alive}], canSee(z): みえるか（なければ ぜんぶ みえる）
export function pickRobotTarget(zs, px, pz, yaw, rx, rz, canSee, range = ROBOT.range) {
  let best = -1, bs = Infinity;
  for (let i = 0; i < zs.length; i++) {
    const z = zs[i];
    if (!z.alive || z.demo) continue;
    if (Math.hypot(z.x - rx, z.z - rz) > range) continue;
    const s = robotTargetScore(Math.hypot(z.x - px, z.z - pz), blindness(px, pz, yaw, z.x, z.z));
    if (s >= bs) continue;
    if (canSee && !canSee(z)) continue;
    bs = s; best = i;
  }
  return best;
}
// ロボの ばしょ: スタートから 10〜22m の ひろい マス（なければ いちばん ちかい ほう）
export function pickRobotSpot(cells, sx, sz, r = Math.random(), [minD, maxD] = ROBOT.spot) {
  const ok = cells.filter(([x, z]) => { const d = Math.hypot(x - sx, z - sz); return d >= minD && d <= maxD; });
  if (ok.length) return ok[Math.min(ok.length - 1, Math.floor(r * ok.length))];
  let best = null, bd = Infinity;
  for (const c of cells) { const d = Math.abs(Math.hypot(c[0] - sx, c[1] - sz) - minD); if (d < bd) { bd = d; best = c; } }
  return best;
}
export function robotTouched(dx, dz, dy) { return Math.hypot(dx, dz) < ROBOT.touchR && Math.abs(dy) < 1.3; }
// とおすぎる／べつの かい／うごけない → みえない ときに プレイヤーの そばへ ワープ
export function shouldTeleportRobot(dist, dy, onScreen, stuckT) {
  if (onScreen) return false;
  return dist > ROBOT.teleport || Math.abs(dy) > ROBOT.teleportDy || stuckT > ROBOT.stuckTime;
}
// ゾンビが プレイヤー より ロボを ねらうか
export function zombieTargetsRobot(distPlayer, distRobot, dy = 0) {
  return Math.abs(dy) < 0.9 && distRobot < ROBOT.aggroR && distRobot < distPlayer * 0.7;
}
// ロボの HP（0 で こわれる）
export function damageRobot(r, d) {
  if (!r || r.state !== 'on') return false;
  r.hp = Math.max(0, r.hp - d * ROBOT.dmgMul);
  if (r.hp <= 0) { r.state = 'broken'; return true; }
  return false;
}
// ぶき ボタン（v0.7.0: ちいさく。でも ゆびで おせる 40px いじょう）
export const WEAPON_BAR = { slotW: 40, slotH: 40, chipW: 34, chipH: 26, gap: 0 };
