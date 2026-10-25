// バトル アクション の きまり（DOM なし・node で テストできる）
export const VERSION = '0.10.0';
export const H = 375;              // ろんり の たかさ
export const GROUND = 318;         // じめん（あしの y）
export const GRAV = 2000;
export const PHYS = {
  speed: 240, accel: 2400, airAccel: 1500, friction: 2600,
  jumpV: 760, jump2V: 650, maxFall: 1100, coyote: 0.1, jumpBuffer: 0.12,
};

// ---- ぶき ----
export const WEAPONS = {
  pistol:  { id: 'pistol',  name: 'ハンドガン',      short: 'ハンド', rate: 0.2,  dmg: 9,  pellets: 1, spread: 0.02, speed: 1100, life: 0.5,  knock: 90,  ammo: Infinity, color: '#cfd3da', accent: '#555' },
  smg:     { id: 'smg',     name: 'サブマシンガン',  short: 'サブマシ', rate: 0.065, dmg: 5,  pellets: 1, spread: 0.09, speed: 1100, life: 0.42, knock: 45,  ammo: 180, color: '#b8352d', accent: '#8a9096' },
  rifle:   { id: 'rifle',   name: 'アサルトライフル', short: 'ライフル', rate: 0.1,  dmg: 9,  pellets: 1, spread: 0.035, speed: 1300, life: 0.6,  knock: 80,  ammo: 150, color: '#6b6f76', accent: '#c9a24a' },
  shotgun: { id: 'shotgun', name: 'ショットガン',    short: 'ショット', rate: 0.55, dmg: 7,  pellets: 6, spread: 0.2,  speed: 1000, life: 0.24, knock: 210, ammo: 36,  color: '#7a4a2a', accent: '#3a3a3a' },
  bazooka: { id: 'bazooka', name: 'バズーカ',        short: 'バズーカ', rate: 0.85, dmg: 40, pellets: 1, spread: 0,    speed: 620,  life: 1.2,  knock: 0,   ammo: 8,   color: '#4f6b3a', accent: '#d8c04a', blast: { r: 95, dmg: 55, knock: 640 } },
  // v0.6：ミニガン（6ほんの つつが まわる。0.5びょう まわしてから うつ・うってる あいだ おそく あるく）
  minigun: { id: 'minigun', name: 'ミニガン',        short: 'ミニガン', rate: 0.04, dmg: 6,  pellets: 1, spread: 0.075, speed: 1250, life: 0.5, knock: 30,  ammo: 300, color: '#5a5e64', accent: '#c9a24a', spin: 0.5, slow: 0.45, tracer: 3 },
  // v0.6：ビームブラスター（うつ を おしっぱなし＝ちいさい エネルギーだんを れんしゃ。ためる ボタン＝ためて はなすと ふとい ビーム）
  beam:    { id: 'beam',    name: 'ビームブラスター', short: 'ビーム', rate: 0.11, dmg: 7, pellets: 1, spread: 0.03, speed: 950, life: 0.65, knock: 50, ammo: 60, color: '#3a4656', accent: '#6af0ff', charge: 0.6, beamCost: 8, beam: { dmg: 60, len: 620, h: 30, knock: 260 } },
  // v0.7：カタナ（うつ＝きる。おしっぱなしで 3れんぞく きり。たまは いらない）
  katana:  { id: 'katana',  name: 'カタナ',          short: 'カタナ', rate: 0, dmg: 0, pellets: 0, spread: 0, speed: 0, life: 0, knock: 0, ammo: Infinity, color: '#d8dde2', accent: '#2a2a30', melee: true },
  // v0.10：あたらしい 4つ（gear.js が うごかす。gear=しゅるい）
  // かえんほうしゃき：ちかくを もやす。ねんりょうは うたないと もどる。もえた てきは すこし ずつ へる
  flame:   { id: 'flame',   name: 'かえんほうしゃき', short: 'かえん', rate: 0.1, dmg: 4, pellets: 0, spread: 0, speed: 0, life: 0, knock: 25, ammo: Infinity, color: '#8a3a22', accent: '#e8a23a', gear: 'flame',
    flame: { fuel: 100, use: 26, regen: 22, regenDelay: 0.6, restart: 30, range: 150, tick: 0.1, burn: 2.2, burnDps: 7 } },
  // じげんばくだん：あしもとに おく。てきが ふむか 8びょうで ドカーン（じぶんと なかまは へいき）
  tbomb:   { id: 'tbomb',   name: 'じげんばくだん',   short: 'ばくだん', rate: 0.35, dmg: 0, pellets: 0, spread: 0, speed: 0, life: 0, knock: 0, ammo: 5, color: '#3c4a36', accent: '#ff3a3a', gear: 'tbomb',
    bomb: { fuse: 8, arm: 0.5, max: 3, trig: 20, blast: { r: 110, dmg: 75, knock: 640 } } },
  // スモークグレネード：なげると けむりが 6びょう。なかの てきは こちらが みえない
  smoke:   { id: 'smoke',   name: 'スモークグレネード', short: 'スモーク', rate: 0.8, dmg: 0, pellets: 0, spread: 0, speed: 0, life: 0, knock: 0, ammo: 4, color: '#6e7680', accent: '#d8dde2', gear: 'smoke',
    smoke: { dur: 6, r: 108, max: 2, vx: 330, vy: -430 } },
  // レーザーガン：いっしゅんで とどく ひかり。4たい まで つらぬく。うちすぎると あつくなって すこし やすみ
  laser:   { id: 'laser',   name: 'レーザーガン',     short: 'レーザー', rate: 0.24, dmg: 16, pellets: 0, spread: 0, speed: 0, life: 0, knock: 110, ammo: Infinity, color: '#e9e6f0', accent: '#ff3ad2', gear: 'laser',
    laser: { len: 640, pierce: 4, heat: 17, cool: 38, unlock: 35 } },
};
// じゅうの かたち（つかむ て = 0,0 から）：mx,my=じゅうこう、ex,ey=やっきょう が でる ところ、kick=[うしろ, はねあがり]
export const GUN_GEOM = {
  pistol:  { mx: 25, my: -7.5, ex: 8,  ey: -9,  kick: [4, 0.32], flash: 'pistol',  shell: [2.6, '#c9a14a'] },
  smg:     { mx: 35, my: -7, ex: 6,  ey: -9,  kick: [3, 0.08], flash: 'smg',     shell: [2.4, '#c9a14a'] },
  rifle:   { mx: 49, my: -8.4, ex: -16, ey: -9,  kick: [5, 0.06], flash: 'rifle',   shell: [3.4, '#d0a848'] },
  shotgun: { mx: 52, my: -9.6, ex: 7,  ey: -9,  kick: [8, 0.22], flash: 'shotgun', shell: [4.2, '#2f4f86'] },
  bazooka: { mx: 46, my: -9,   ex: 0,  ey: 0,   kick: [9, 0.1],  flash: 'bazooka', shell: null },
  beam:    { mx: 46, my: -8,   ex: 0,  ey: 0,   kick: [7, 0.07], flash: 'beam',   shell: null },
  minigun: { mx: 52, my: -6.5, ex: 2,  ey: 2,   kick: [3, 0.035], flash: 'rifle',  shell: [3.2, '#d6ae4c'] },
  dark:    { mx: 33, my: -7, ex: 6,  ey: -9,  kick: [3, 0.1],  flash: 'smg',     shell: null },
  flame:   { mx: 50, my: -6,   ex: 0,  ey: 0,   kick: [1.5, 0.02], flash: 'flame', shell: null },
  laser:   { mx: 44, my: -8,   ex: 0,  ey: 0,   kick: [4, 0.05], flash: 'laser',  shell: null },
  tbomb:   { mx: 14, my: -6,   ex: 0,  ey: 0,   kick: [1, 0.02], flash: 'none',   shell: null },
  smoke:   { mx: 12, my: -8,   ex: 0,  ey: 0,   kick: [1, 0.02], flash: 'none',   shell: null },
};
export const WEAPON_ORDER = ['katana', 'pistol', 'smg', 'rifle', 'shotgun', 'minigun', 'beam', 'laser', 'flame', 'bazooka', 'tbomb', 'smoke'];
export const AMMO_PICK = { smg: 90, rifle: 75, shotgun: 18, bazooka: 4, minigun: 60, beam: 16, tbomb: 3, smoke: 2 };
export const AMMO_MAX = { smg: 360, rifle: 300, shotgun: 72, bazooka: 16, minigun: 500, beam: 120, tbomb: 9, smoke: 8 };
// ぶきの なかみ（かえん＝ねんりょう、レーザー＝ねつ）
function gunState(id) {
  const W = WEAPONS[id], g = { ammo: W.ammo };
  if (W.flame) { g.fuel = W.flame.fuel; g.idle = 0; g.out = false; }
  if (W.laser) { g.heat = 0; g.over = false; }
  return g;
}

export function createArsenal(owned = ['pistol']) {
  const a = { cur: owned[0], cool: 0, guns: {} };
  for (const id of owned) a.guns[id] = gunState(id);
  return a;
}
export function giveWeapon(a, id) {
  const fresh = !a.guns[id];
  if (fresh) a.guns[id] = gunState(id);
  else if (id === 'flame') { a.guns.flame.fuel = WEAPONS.flame.flame.fuel; a.guns.flame.out = false; }
  else if (id === 'laser') { a.guns.laser.heat = 0; a.guns.laser.over = false; }
  else a.guns[id].ammo = Math.min(AMMO_MAX[id] ?? Infinity, a.guns[id].ammo + (AMMO_PICK[id] || 0));
  if (fresh) a.cur = id;
  return fresh;
}
export function addAmmo(a) { // いま もってる ぶき ぜんぶに すこし
  let any = false;
  for (const id of Object.keys(a.guns)) if (AMMO_PICK[id]) { a.guns[id].ammo = Math.min(AMMO_MAX[id], a.guns[id].ammo + AMMO_PICK[id]); any = true; }
  return any;
}
export function ownedOrder(a) { return WEAPON_ORDER.filter((id) => a.guns[id]); }
export function nextWeapon(a) {
  const o = ownedOrder(a).filter((id) => id === a.cur || a.guns[id].ammo > 0);
  a.cur = o[(o.indexOf(a.cur) + 1) % o.length];
  return a.cur;
}
// ビームブラスター：shoot＝れんしゃ（'bolt'）。charge を おしてる あいだ ためて、はなした とき いっぱいなら 'beam'
export function tickBeam(a, dt, shoot, charge) {
  const W = WEAPONS.beam, g = a.guns.beam;
  a.cool = Math.max(0, a.cool - dt);
  if (!g) return null;
  let out = null;
  if (charge && g.ammo >= W.beamCost) { a.charge = Math.min(W.charge, (a.charge || 0) + dt); return null; }
  if (a.charge > 0) {
    const full = a.charge >= W.charge; a.charge = 0;
    if (full && g.ammo >= W.beamCost) { g.ammo -= W.beamCost; a.cool = 0.25; out = 'beam'; }
  } else if (shoot && a.cool <= 0 && g.ammo > 0) { g.ammo -= 1; a.cool = W.rate; out = 'bolt'; }
  if (g.ammo <= 0) { g.ammo = 0; a.cur = 'pistol'; }
  return out;
}
// ---- v0.10：あたらしい ぶきの なかみ（DOM なし・テスト できる） ----
// まいフレーム：かえんの ねんりょうが もどる・レーザーが さめる（えらんで なくても）
export function tickGear(a, dt) {
  const f = a.guns.flame, F = WEAPONS.flame.flame;
  if (f) {
    f.idle += dt;
    if (f.idle >= F.regenDelay) f.fuel = Math.min(F.fuel, f.fuel + F.regen * dt);
    if (f.out && f.fuel >= F.restart) f.out = false;
  }
  const l = a.guns.laser, L = WEAPONS.laser.laser;
  if (l) {
    l.heat = Math.max(0, l.heat - L.cool * dt);
    if (l.over && l.heat <= L.unlock) l.over = false;
  }
}
// かえん：おしてる あいだ もえる（true）。からっぽ に なったら 'out'
export function tickFlame(a, dt, held) {
  const g = a.guns.flame, F = WEAPONS.flame.flame;
  if (!g || !held || g.out) return false;
  g.idle = 0;
  g.fuel -= F.use * dt;
  if (g.fuel <= 0) { g.fuel = 0; g.out = true; return 'out'; }
  return true;
}
// レーザー：うてたら true、あつすぎたら 'over'
export function tickLaser(a, dt, held) {
  a.cool = Math.max(0, a.cool - dt);
  const g = a.guns.laser, W = WEAPONS.laser;
  if (!g || !held || g.over || a.cool > 0) return false;
  a.cool = W.rate;
  g.heat += W.laser.heat;
  if (g.heat >= 100) { g.heat = 100; g.over = true; return 'over'; }
  return true;
}
// なげる・おく ぶき（ばくだん・スモーク）：can=おける かどうか。つかえたら true、いっぱいなら 'full'
export function tickToss(a, dt, held, can = true) {
  a.cool = Math.max(0, a.cool - dt);
  const id = a.cur, g = a.guns[id], W = WEAPONS[id];
  if (!g || !held || a.cool > 0) return false;
  if (g.ammo <= 0) { a.cur = 'pistol'; return false; }
  if (!can) { a.cool = 0.6; return 'full'; }
  g.ammo -= 1; a.cool = W.rate;
  if (g.ammo <= 0) { g.ammo = 0; a.cur = 'pistol'; }
  return true;
}
// レーザーの まっすぐな せん と はこ：あたった きょり（なければ -1）
export function rayBox(x, y, dx, dy, b, len) {
  let t0 = 0, t1 = len;
  for (const [o, d, lo, hi] of [[x, dx, b.x, b.x + b.w], [y, dy, b.y, b.y + b.h]]) {
    if (Math.abs(d) < 1e-9) { if (o < lo || o > hi) return -1; continue; }
    let a = (lo - o) / d, c = (hi - o) / d; if (a > c) [a, c] = [c, a];
    t0 = Math.max(t0, a); t1 = Math.min(t1, c); if (t0 > t1) return -1;
  }
  return t0;
}
// かえんの とどく ところ（まえ むき・ちかいほど ほそい）
export function inFlame(gx, gy, face, b, range) {
  const near = face > 0 ? b.x - gx : gx - (b.x + b.w), far = face > 0 ? b.x + b.w - gx : gx - b.x;
  if (far < -6 || near > range) return false;
  const d = Math.max(0, near), half = 16 + d * 0.32;
  return b.y <= gy + half && b.y + b.h >= gy - half;
}
// スモーク：けむりの なか？（でてすぐ ふくらむ・きえる まえは うすい）
export function inSmoke(clouds, x, y) {
  for (const c of clouds) {
    if (c.t > c.dur - 0.4) continue;
    const k = Math.min(1, 0.35 + c.t / 0.5), rx = c.r * k, ry = c.r * 0.62 * k, cy = c.y - ry * 0.85;
    const u = (x - c.x) / rx, v = (y - cy) / ry;
    if (u * u + v * v <= 1) return true;
  }
  return false;
}

// まいフレーム。うてたら ぶきの スペックを かえす
export function tickGun(a, dt, held) {
  a.cool = Math.max(0, a.cool - dt);
  const SW = WEAPONS[a.cur];
  if (SW.spin) { // ミニガン：おしてる あいだ つつが まわる（spin が たまるまで うてない）
    const g0 = a.guns[a.cur];
    a.spin = held && g0.ammo > 0 ? Math.min(SW.spin, (a.spin || 0) + dt) : Math.max(0, (a.spin || 0) - dt * 1.5);
    a.spinPh = (a.spinPh || 0) + dt * 40 * (a.spin / SW.spin);
    if (a.spin < SW.spin) return null;
  } else a.spin = 0;
  if (!held || a.cool > 0) return null;
  const g = a.guns[a.cur];
  if (g.ammo <= 0) { a.cur = 'pistol'; return null; }
  const W = WEAPONS[a.cur];
  a.cool = W.rate;
  if (g.ammo !== Infinity) g.ammo--;
  if (g.ammo <= 0 && a.cur !== 'pistol') { const w = W; a.cur = 'pistol'; return w; }
  return W;
}

// ---- パンチ・キック（コンボ） ----
// t0..t1 が あたる じかん。box は まえ むき 0 から の はんい（x: まえ、y: あしから うえ）
export const MOVES = {
  jab:     { name: 'パンチ',          dur: 0.2,  t0: 0.04, t1: 0.11, box: [8, 40, 46, 22],  dmg: 7,  kx: 140, ky: -60,  stop: 0.035, chain: 0.13, limb: 'hand' },
  jab2:    { name: 'パンチ',          dur: 0.2,  t0: 0.04, t1: 0.11, box: [8, 40, 48, 22],  dmg: 8,  kx: 160, ky: -60,  stop: 0.035, chain: 0.13, limb: 'hand2' },
  upper:   { name: 'アッパー',        dur: 0.34, t0: 0.06, t1: 0.16, box: [4, 30, 46, 60],  dmg: 14, kx: 120, ky: -720, stop: 0.07,  chain: 0.22, limb: 'hand', launch: true },
  kick:    { name: 'まえげり',        dur: 0.26, t0: 0.06, t1: 0.14, box: [8, 18, 60, 26],  dmg: 11, kx: 340, ky: -160, stop: 0.05,  chain: 0.16, limb: 'foot' },
  spin:    { name: 'かいてんげり',    dur: 0.36, t0: 0.07, t1: 0.22, box: [-62, 14, 124, 34], dmg: 13, kx: 400, ky: -260, stop: 0.06, chain: 0.24, limb: 'spin', both: true },
  high:    { name: 'まわしげり',      dur: 0.42, t0: 0.1,  t1: 0.2,  box: [6, 30, 72, 36],  dmg: 22, kx: 720, ky: -380, stop: 0.1,   chain: 0.34, limb: 'foot', big: true },
  flykick: { name: 'とびげり',        dur: 0.55, t0: 0.0,  t1: 0.55, box: [0, 6, 54, 34],   dmg: 17, kx: 560, ky: -240, stop: 0.07,  chain: 0.55, limb: 'fly', air: true },
  airjab:  { name: 'くうちゅうパンチ', dur: 0.22, t0: 0.04, t1: 0.12, box: [6, 30, 48, 26], dmg: 8,  kx: 150, ky: -200, stop: 0.04,  chain: 0.14, limb: 'hand', air: true },
  slide:   { name: 'スライディング',   dur: 0.42, t0: 0.02, t1: 0.36, box: [0, 0, 58, 20],  dmg: 12, kx: 140, ky: -620, stop: 0.05,  chain: 0.36, limb: 'slide', launch: true },
  // v0.7 カタナ の きり（3れんぞく：よこぎり → かえし → ふりおろし）
  slash1:  { name: 'よこぎり',        dur: 0.24, t0: 0.05, t1: 0.13, box: [-4, 14, 74, 62], dmg: 13, kx: 170, ky: -80,  stop: 0.045, chain: 0.14, limb: 'blade', blade: 1 },
  slash2:  { name: 'かえしぎり',      dur: 0.26, t0: 0.05, t1: 0.14, box: [-4, 10, 76, 66], dmg: 14, kx: 190, ky: -120, stop: 0.05,  chain: 0.15, limb: 'blade', blade: 2 },
  slash3:  { name: 'ふりおろし',      dur: 0.4,  t0: 0.1,  t1: 0.2,  box: [-6, 0, 84, 86],  dmg: 24, kx: 560, ky: -320, stop: 0.1,   chain: 0.3,  limb: 'blade', blade: 3, big: true },
  airslash:{ name: 'くうちゅうぎり',  dur: 0.28, t0: 0.04, t1: 0.16, box: [-8, 0, 76, 70], dmg: 13, kx: 200, ky: -220, stop: 0.045, chain: 0.16, limb: 'blade', blade: 4, air: true },
};
export const COMBO_WINDOW = 1.3;   // この あいだに あてれば コンボが つづく
export const CHAIN_GRACE = 0.28;   // わざの あと つぎを うけつける じかん

// どの わざが でるか。step = いまの つなぎ（0,1,2）
export function pickMove(kind, { air = false, step = 0, running = false, down = false } = {}) {
  if (kind === 'slash') return air ? 'airslash' : ['slash1', 'slash2', 'slash3'][Math.min(2, step)];
  if (air) return kind === 'kick' ? 'flykick' : 'airjab';
  if (kind === 'kick' && (down || running && step === 0 && running > 0.35)) return 'slide';
  const s = Math.min(2, step);
  if (kind === 'punch') return ['jab', 'jab2', 'upper'][s];
  return ['kick', 'spin', 'high'][s];
}
// わざの あたりはんい（せかい ざひょう）
export function moveBox(move, x, y, face) {
  const [bx, by, bw, bh] = move.box;
  const x0 = face > 0 ? x + bx : x - bx - bw;
  return { x: x0, y: y - by - bh, w: bw, h: bh };
}
export function overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
export function comboMult(n) { return n >= 30 ? 3 : n >= 15 ? 2 : n >= 6 ? 1.5 : 1; }
export function comboWord(n) {
  if (n >= 30) return 'すごすぎ！';
  if (n >= 20) return 'さいきょう！';
  if (n >= 12) return 'すごい！';
  if (n >= 6) return 'ナイス！';
  return '';
}
// ふっとび（おもい てき ほど とばない）
export function knockOf(move, weight = 1, face = 1, armor = 0) {
  const k = Math.max(0.15, (1 - armor)) / weight;
  return { vx: move.kx * k * face, vy: move.ky * Math.max(0.35, k) };
}

// ---- てき（こわめ・でも ちは みどり／むらさき） ----
export const ENEMIES = {
  grunt:   { name: 'マスクへい',   hp: 34,  w: 30, h: 70, speed: 132, weight: 1,   dmg: 8,  reach: 46, wind: 0.45, cool: 1.02, score: 100, blood: 'green' },
  gunner:  { name: 'ガンへい',     hp: 30,  w: 30, h: 70, speed: 110, weight: 1,   dmg: 7,  reach: 0,  wind: 0.55, cool: 1.61, score: 150, blood: 'green', range: [190, 330], shotSpeed: 330 },
  shield:  { name: 'タテへい',     hp: 50,  w: 34, h: 74, speed: 88,  weight: 1.4, dmg: 10, reach: 50, wind: 0.6,  cool: 1.36, score: 200, blood: 'green', shieldHp: 26 },
  crawler: { name: 'カゲモドキ',   hp: 22,  w: 42, h: 30, speed: 253, weight: 0.8, dmg: 7,  reach: 40, wind: 0.3,  cool: 0.85, score: 120, blood: 'purple', jumper: true },
  brute:   { name: 'デカマスク',   hp: 140, w: 52, h: 104, speed: 82, weight: 2.4, dmg: 16, reach: 64, wind: 0.75, cool: 1.53, score: 500, blood: 'green', armor: 0.45 },
  // v0.3 の あたらしい てき（ai = うごきかた の もと、look = みため）
  raider:  { name: 'ガスマスク',   hp: 38,  w: 30, h: 70, speed: 150, weight: 1,   dmg: 8,  reach: 46, wind: 0.42, cool: 0.95, score: 130, blood: 'green', ai: 'grunt', look: 'raider' },
  sniper:  { name: 'ねらいへい',   hp: 30,  w: 30, h: 70, speed: 90,  weight: 1,   dmg: 9,  reach: 0,  wind: 1.0,  cool: 2.3,  score: 200, blood: 'green', ai: 'gunner', look: 'sniper', range: [250, 420], shotSpeed: 560, laser: true },
  swarm:   { name: 'チビカゲ',     hp: 10,  w: 26, h: 20, speed: 230, weight: 0.6, dmg: 5,  reach: 32, wind: 0.32, cool: 0.9,  score: 60,  blood: 'purple', ai: 'crawler', look: 'swarm', jumper: true, emerge: true, small: true },
  bloater: { name: 'ふくれマスク', hp: 70,  w: 40, h: 80, speed: 70,  weight: 1.8, dmg: 10, reach: 50, wind: 0.6,  cool: 1.5,  score: 260, blood: 'purple', ai: 'grunt', look: 'bloater', burst: true },
  knight:  { name: 'くろきし',     hp: 70,  w: 34, h: 78, speed: 96,  weight: 1.6, dmg: 12, reach: 54, wind: 0.6,  cool: 1.3,  score: 300, blood: 'green', ai: 'shield', look: 'knight', shieldHp: 40 },
  // v0.5 ゾンビ たち（ちは みどり／むらさき）
  zombie:   { name: 'ふつうの ゾンビ',   hp: 36,  w: 30, h: 72, speed: 78,  weight: 1,   dmg: 8,  reach: 44, wind: 0.5,  cool: 1.1,  score: 100, blood: 'green',  ai: 'grunt' },
  labz:     { name: 'はくい ゾンビ',     hp: 32,  w: 30, h: 72, speed: 92,  weight: 1,   dmg: 8,  reach: 44, wind: 0.46, cool: 1.0,  score: 110, blood: 'green',  ai: 'grunt' },
  guard:    { name: 'けいびいん ゾンビ', hp: 60,  w: 32, h: 74, speed: 96,  weight: 1.3, dmg: 11, reach: 52, wind: 0.55, cool: 1.2,  score: 220, blood: 'green',  ai: 'grunt', armor: 0.2 },
  soldierz: { name: 'ぐんじん ゾンビ',   hp: 44,  w: 30, h: 72, speed: 92,  weight: 1.1, dmg: 6,  reach: 0,  wind: 0.6,  cool: 1.9,  score: 260, blood: 'green',  ai: 'gunner', range: [160, 320], shotSpeed: 520, inacc: 0.22, volley: 3, helmetHp: 24 },
  bloatz:   { name: 'ふくれ ゾンビ',     hp: 80,  w: 42, h: 80, speed: 60,  weight: 1.9, dmg: 10, reach: 50, wind: 0.65, cool: 1.5,  score: 280, blood: 'purple', ai: 'grunt', burst: true },
  leaper:   { name: 'てなが ゾンビ',     hp: 30,  w: 34, h: 56, speed: 170, weight: 0.9, dmg: 8,  reach: 54, wind: 0.34, cool: 0.95, score: 180, blood: 'purple', ai: 'crawler', jumper: true, emerge: false },
  hulk:     { name: 'きょだい ゾンビ',   hp: 170, w: 54, h: 108, speed: 70, weight: 2.6, dmg: 17, reach: 66, wind: 0.8,  cool: 1.6,  score: 600, blood: 'purple', ai: 'grunt', armor: 0.45 },
  spitter:  { name: 'はきだし ゾンビ',   hp: 34,  w: 30, h: 72, speed: 84,  weight: 1,   dmg: 8,  reach: 0,  wind: 0.7,  cool: 2.0,  score: 240, blood: 'purple', ai: 'gunner', range: [170, 300], shotSpeed: 300, spit: true },
  // v0.6 あたらしい ゾンビ と ちゅうボス（mini）
  patient:  { name: 'かんじゃ ゾンビ',   hp: 30,  w: 30, h: 72, speed: 104, weight: 0.9, dmg: 8,  reach: 44, wind: 0.42, cool: 1.0,  score: 110, blood: 'green',  ai: 'grunt' },
  hound:    { name: 'ゾンビ いぬ',       hp: 26,  w: 46, h: 34, speed: 270, weight: 0.8, dmg: 7,  reach: 44, wind: 0.28, cool: 0.85, score: 140, blood: 'green',  ai: 'crawler', jumper: true, emerge: false },
  worker:   { name: 'さぎょういん ゾンビ', hp: 44, w: 30, h: 72, speed: 88,  weight: 1.2, dmg: 10, reach: 48, wind: 0.5,  cool: 1.15, score: 170, blood: 'green',  ai: 'grunt', helmetHp: 16 },
  sailor:   { name: 'ふなのり ゾンビ',   hp: 38,  w: 30, h: 72, speed: 98,  weight: 1,   dmg: 9,  reach: 46, wind: 0.45, cool: 1.0,  score: 140, blood: 'green',  ai: 'grunt' },
  frozen:   { name: 'こおり ゾンビ',     hp: 56,  w: 32, h: 74, speed: 66,  weight: 1.4, dmg: 11, reach: 50, wind: 0.6,  cool: 1.3,  score: 220, blood: 'purple', ai: 'grunt', armor: 0.25 },
  sergeant: { name: 'ぐんそう ゾンビ',   hp: 320, w: 40, h: 90, speed: 72,  weight: 2.6, dmg: 7,  reach: 0,  wind: 0.7,  cool: 1.6,  score: 2000, blood: 'green', ai: 'gunner', range: [150, 300], shotSpeed: 540, inacc: 0.16, volley: 8, helmetHp: 50, armor: 0.35, mini: true },
  patch:    { name: 'つぎはぎ ゾンビ',   hp: 380, w: 64, h: 124, speed: 76, weight: 3.2, dmg: 18, reach: 74, wind: 0.75, cool: 1.4,  score: 2200, blood: 'purple', ai: 'grunt', armor: 0.55, mini: true },
  // v0.7 いせきの グール（ほねと あばらが みえる。ちは みどり）
  ghoul:    { name: 'グール',            hp: 46,  w: 34, h: 58,  speed: 124, weight: 1.1, dmg: 9,  reach: 50, wind: 0.42, cool: 1.0,  score: 160, blood: 'green', ai: 'grunt', look: 'ghoul', lunge: 320 },
  ghoulet:  { name: 'ちびグール',        hp: 22,  w: 32, h: 36,  speed: 230, weight: 0.8, dmg: 6,  reach: 40, wind: 0.3,  cool: 0.9,  score: 90,  blood: 'green', ai: 'crawler', look: 'ghoul', jumper: true, emerge: true, small: true },
  bigghoul: { name: 'おおグール',        hp: 360, w: 58, h: 96,  speed: 92,  weight: 2.8, dmg: 16, reach: 70, wind: 0.6,  cool: 1.3,  score: 2200, blood: 'green', ai: 'grunt', look: 'ghoul', armor: 0.45, mini: true, lunge: 420 },
  // v0.8 よあけの こうや（ポンチョ・ならずもの・すなさそり。ちは みどり）
  nomad:    { name: 'こうやの ゾンビ',   hp: 40,  w: 30, h: 72, speed: 100, weight: 1.05, dmg: 9, reach: 46, wind: 0.46, cool: 1.05, score: 130, blood: 'green', ai: 'grunt', look: 'nomad' },
  outlaw:   { name: 'ならずもの ゾンビ', hp: 38,  w: 30, h: 72, speed: 96,  weight: 1,   dmg: 6,  reach: 0,  wind: 0.55, cool: 1.8,  score: 240, blood: 'green', ai: 'gunner', look: 'outlaw', range: [160, 310], shotSpeed: 540, inacc: 0.2, volley: 2, helmetHp: 14 },
  scorp:    { name: 'すなさそり',        hp: 20,  w: 42, h: 26,  speed: 230, weight: 0.7, dmg: 6,  reach: 40, wind: 0.3,  cool: 0.9,  score: 90,  blood: 'green', ai: 'crawler', look: 'scorp', jumper: true, emerge: true, small: true },
  rockz:    { name: 'いわおとこ ゾンビ', hp: 380, w: 62, h: 118, speed: 74, weight: 3.2, dmg: 17, reach: 72, wind: 0.75, cool: 1.4,  score: 2300, blood: 'green', ai: 'grunt', look: 'rockz', armor: 0.5, mini: true },
  // v0.9 そうこの くろスーツ たち（ちは みどり。ドアから どんどん でてくる）
  suit:     { name: 'くろスーツ',         hp: 20,  w: 30, h: 72, speed: 150, weight: 0.9, dmg: 7,  reach: 44, wind: 0.42, cool: 1.0,  score: 60,  blood: 'green', ai: 'grunt', look: 'suit', gear: 'fist' },
  suitk:    { name: 'ナイフの スーツ',     hp: 18,  w: 30, h: 72, speed: 175, weight: 0.85, dmg: 9, reach: 48, wind: 0.36, cool: 0.95, score: 80,  blood: 'green', ai: 'grunt', look: 'suit', gear: 'knife', lunge: 300 },
  suitp:    { name: 'ピストルの スーツ',   hp: 18,  w: 30, h: 72, speed: 120, weight: 0.9, dmg: 6,  reach: 0,  wind: 0.6,  cool: 1.7,  score: 90,  blood: 'green', ai: 'gunner', look: 'suit', gear: 'pistol', range: [170, 320], shotSpeed: 340 },
  suitsg:   { name: 'ショットガンの スーツ', hp: 24, w: 30, h: 72, speed: 110, weight: 1,  dmg: 5,  reach: 0,  wind: 0.75, cool: 2.1,  score: 130, blood: 'green', ai: 'gunner', look: 'suit', gear: 'shotgun', range: [110, 220], shotSpeed: 360, pellets: 4 },
  heavy:    { name: 'おおがら スーツ',     hp: 110, w: 40, h: 86, speed: 92,  weight: 2.2, dmg: 13, reach: 56, wind: 0.6,  cool: 1.3,  score: 450, blood: 'green', ai: 'grunt', look: 'suit', gear: 'fist', armor: 0.35, scale: 1.2 },
  wraith:  { name: 'ゆらぎ',       hp: 30,  w: 40, h: 40, speed: 240, weight: 0.8, dmg: 9,  reach: 40, wind: 0.32, cool: 0.9,  score: 180, blood: 'purple', ai: 'crawler', look: 'wraith', jumper: true, emerge: true },
};
for (const [k, d] of Object.entries(ENEMIES)) { d.ai = d.ai || k; d.look = d.look || k; if (d.emerge === undefined) d.emerge = k === 'crawler'; }
export const BOSSES = {
  agent: { name: 'くろよろい エージェント', hp: 1400, w: 74, h: 148, speed: 110, weight: 4, dmg: 18, score: 5000, blood: 'purple', armor: 0.7 },
  hydra: { name: 'ねじれ ばけもの',         hp: 1700, w: 110, h: 170, speed: 0, weight: 99, dmg: 16, score: 8000, blood: 'purple', armor: 1, ai: 'hydra' },
  // v0.3：agent と おなじ「にんげんがた」の うごき＋ それぞれの わざ
  giant:  { name: 'てっかめん の きょじん',  hp: 1600, w: 96, h: 170, speed: 92,  weight: 6, dmg: 18, score: 9000,  blood: 'green',  armor: 0.8, kit: 'giant', scale: 2.4 },
  mutant: { name: 'どろどろ ミュータント',    hp: 1700, w: 104, h: 130, speed: 120, weight: 5, dmg: 16, score: 10000, blood: 'purple', armor: 0.8, kit: 'mutant' },
  king:   { name: 'あかい め の おう',        hp: 2400, w: 80, h: 160, speed: 120, weight: 5, dmg: 18, score: 15000, blood: 'purple', armor: 0.8, kit: 'king' },
  // v0.6：ステージ 6〜15 の ボス
  surgeon: { name: 'メスの せんせい',        hp: 1900, w: 70, h: 150, speed: 135, weight: 4, dmg: 16, score: 11000, blood: 'green',  armor: 0.7, kit: 'surgeon' },
  tank:    { name: 'ぼうそう せんしゃ',      hp: 2150, w: 170, h: 110, speed: 95, weight: 99, dmg: 18, score: 12000, blood: 'green', armor: 0.85, kit: 'tank' },
  beast:   { name: 'もりの ぬし',            hp: 2250, w: 100, h: 150, speed: 125, weight: 6, dmg: 17, score: 12000, blood: 'green',  armor: 0.8, kit: 'beast' },
  welder:  { name: 'ようせつ ゾンビ',        hp: 2350, w: 80, h: 156, speed: 110, weight: 5, dmg: 17, score: 13000, blood: 'green',  armor: 0.8, kit: 'welder' },
  wreck:   { name: 'がれきの きょじん',      hp: 2450, w: 96, h: 170, speed: 92,  weight: 6, dmg: 18, score: 13000, blood: 'green',  armor: 0.8, kit: 'giant', scale: 2.4 },
  kraken:  { name: 'うみの ばけもの',        hp: 2300, w: 110, h: 170, speed: 0, weight: 99, dmg: 16, score: 13000, blood: 'purple', armor: 1, ai: 'hydra' },
  yeti:    { name: 'こおりの きょじん',      hp: 2550, w: 104, h: 130, speed: 120, weight: 5, dmg: 17, score: 14000, blood: 'purple', armor: 0.8, kit: 'yeti' },
  queen:   { name: 'むしの じょおう',        hp: 2600, w: 104, h: 130, speed: 115, weight: 5, dmg: 16, score: 14000, blood: 'purple', armor: 0.8, kit: 'queen' },
  heli:    { name: 'ゾンビ ヘリ',            hp: 2400, w: 150, h: 70,  speed: 150, weight: 99, dmg: 14, score: 15000, blood: 'green', armor: 0.85, kit: 'heli' },
  ghoulking: { name: 'いせきの グール',      hp: 3000, w: 100, h: 132, speed: 130, weight: 5, dmg: 17, score: 16000, blood: 'green',  armor: 0.75, kit: 'ghoul' },
  sunscorp:  { name: 'よあけの おおさそり', hp: 3100, w: 170, h: 96, speed: 150, weight: 6, dmg: 17, score: 17000, blood: 'green', armor: 0.78, kit: 'scorpion' },
  doorboss:  { name: 'サングラスの ボス',   hp: 2600, w: 80, h: 156, speed: 120, weight: 5, dmg: 17, score: 18000, blood: 'green', armor: 0.72, kit: 'doors' },
  final:   { name: 'はじまりの ミュータント', hp: 3000, w: 74, h: 150, speed: 125, weight: 6, dmg: 18, score: 30000, blood: 'purple', armor: 0.8, kit: 'final' },
};
// ズーム（がめんの ちかさ）。ゲームの ひろさは かわらない
export const ZOOMS = [
  { name: 'ふつう', z: 1 },
  { name: 'ちかい', z: 1.4 },
  { name: 'もっとちかい', z: 1.7 },
];
export const ZOOM_DEFAULT = 1;

// ---- ステージ ----
// arenas: カメラが とまって てきが でる ばしょ。waves は じゅんばん（まえの が へったら つぎ）
export const STAGES = [
  {
    id: 1, name: 'ステージ 1', sub: 'ほろびた けんきゅうじょ', theme: 'lab', length: 4300,
    platforms: [[620, 236, 150], [1180, 220, 170], [1500, 170, 120], [2300, 232, 160], [2960, 210, 150], [3290, 236, 130]],
    crates: [[480], [1060], [1880], [2600], [3420]],
    pickups: [[820, 'smg'], [1250, 'flame'], [1550, 'heal', 140], [2380, 'shotgun', 222], [3050, 'ammo'], [3560, 'heal']],
    arenas: [
      { x: 700,  waves: [['zombie', 'labz', 'zombie'], ['guard', 'labz', 'crawler']] },
      { x: 1560, waves: [['labz', 'zombie', 'crawler', 'labz'], ['guard', 'gunner', 'zombie']] },
      { x: 2450, waves: [['guard', 'zombie', 'crawler', 'labz'], ['hulk', 'labz'], ['gunner', 'guard', 'crawler', 'zombie']] },
      { x: 3300, waves: [['zombie', 'zombie', 'guard', 'labz'], ['crawler', 'bloatz', 'guard', 'zombie', 'hulk']] },
    ],
    boss: { x: 3900, id: 'agent' },
  },
  {
    id: 2, name: 'ステージ 2', sub: 'あかい そらの おやしき', theme: 'manor', length: 4700,
    platforms: [[560, 226, 160], [1000, 200, 140], [1700, 230, 170], [2050, 180, 140], [2760, 224, 160], [3380, 200, 170], [3800, 236, 130]],
    crates: [[430], [1350], [2200], [3100]],
    pickups: [[700, 'rifle', 212], [1450, 'heal'], [1700, 'tbomb'], [2120, 'bazooka', 166], [2900, 'ammo'], [3500, 'heal', 186], [3900, 'ammo']],
    arenas: [
      { x: 650,  waves: [['zombie', 'zombie', 'crawler'], ['leaper', 'zombie', 'grunt']] },
      { x: 1500, waves: [['shield', 'guard', 'zombie', 'crawler'], ['leaper', 'leaper', 'crawler', 'zombie']] },
      { x: 2350, waves: [['hulk', 'zombie', 'crawler'], ['gunner', 'guard', 'shield', 'zombie'], ['leaper', 'zombie', 'crawler', 'labz', 'leaper']] },
      { x: 3200, waves: [['brute', 'gunner', 'zombie'], ['shield', 'leaper', 'crawler', 'guard', 'zombie']] },
      { x: 3950, waves: [['zombie', 'zombie', 'guard', 'leaper', 'crawler'], ['hulk', 'brute', 'crawler']] },
    ],
    boss: { x: 4300, id: 'hydra' },
  },
  {
    id: 3, name: 'ステージ 3', sub: 'あめの はいきょとし', theme: 'city', length: 4900,
    platforms: [[520, 230, 150], [900, 196, 130], [1300, 226, 170], [1640, 176, 150], [2150, 220, 160], [2500, 182, 140], [3050, 228, 170], [3500, 196, 150], [3900, 232, 140]],
    crates: [[420], [1180], [1980], [2860], [3700]],
    pickups: [[640, 'rifle', 222], [1100, 'smoke'], [1380, 'heal', 218], [1700, 'smg', 168], [2580, 'shotgun', 174], [3120, 'ammo', 220], [3560, 'heal', 188], [4050, 'bazooka']],
    arenas: [
      { x: 700,  waves: [['zombie', 'soldierz', 'zombie'], ['raider', 'zombie', 'soldierz']] },
      { x: 1550, waves: [['zombie', 'zombie', 'guard', 'soldierz'], ['sniper', 'soldierz', 'zombie']] },
      { x: 2400, waves: [['guard', 'soldierz', 'sniper'], ['hulk', 'zombie'], ['leaper', 'zombie', 'soldierz', 'raider']] },
      { x: 3300, waves: [['soldierz', 'soldierz', 'sniper', 'zombie'], ['hulk', 'soldierz', 'zombie', 'guard']] },
    ],
    boss: { x: 4400, id: 'giant' },
  },
  {
    id: 4, name: 'ステージ 4', sub: 'くらやみの ちかてつ', theme: 'subway', length: 5000,
    train: { every: 15, first: 9 },
    platforms: [[480, 226, 170], [820, 230, 160], [1180, 222, 180], [1560, 228, 170], [1880, 216, 160], [2260, 226, 180], [2640, 220, 170], [3000, 228, 170], [3360, 222, 170], [3720, 226, 180], [4100, 220, 160]],
    crates: [[400], [1100], [2050], [2950], [3800]],
    pickups: [[560, 'shotgun', 216], [1250, 'heal', 212], [1600, 'laser'], [1950, 'ammo', 206], [2700, 'heal', 210], [3080, 'rifle', 218], [3800, 'ammo', 216], [4150, 'heal', 210]],
    arenas: [
      { x: 700,  waves: [['zombie', 'swarm', 'swarm', 'zombie'], ['bloatz', 'spitter']] },
      { x: 1600, waves: [['leaper', 'swarm', 'swarm', 'zombie'], ['bloatz', 'spitter', 'swarm']] },
      { x: 2500, waves: [['leaper', 'bloatz', 'swarm', 'swarm'], ['spitter', 'spitter', 'zombie', 'soldierz'], ['swarm', 'swarm', 'leaper', 'leaper', 'swarm']] },
      { x: 3450, waves: [['bloatz', 'bloatz', 'spitter'], ['hulk', 'leaper', 'swarm', 'spitter']] },
    ],
    boss: { x: 4500, id: 'mutant' },
  },
  {
    id: 5, name: 'ステージ 5', sub: 'あかい そらの とう', theme: 'tower', length: 5300,
    platforms: [[460, 232, 140], [700, 196, 130], [940, 160, 130], [1400, 226, 160], [1720, 190, 150], [2200, 230, 170], [2520, 186, 150], [2840, 150, 130], [3300, 226, 160], [3700, 200, 150], [4100, 232, 150], [4400, 196, 140]],
    crates: [[380], [1250], [2080], [3150], [4000]],
    pickups: [[720, 'rifle', 186], [960, 'heal', 150], [1500, 'shotgun', 216], [2560, 'bazooka', 176], [2880, 'heal', 140], [3400, 'ammo', 216], [4150, 'heal', 222], [4450, 'ammo', 186]],
    arenas: [
      { x: 650,  waves: [['soldierz', 'knight', 'leaper'], ['sniper', 'soldierz', 'wraith']] },
      { x: 1600, waves: [['leaper', 'leaper', 'spitter', 'zombie'], ['hulk', 'sniper', 'wraith']] },
      { x: 2650, waves: [['knight', 'soldierz', 'spitter'], ['bloatz', 'sniper', 'soldierz'], ['wraith', 'leaper', 'leaper', 'swarm', 'swarm']] },
      { x: 3550, waves: [['knight', 'spitter', 'soldierz', 'wraith'], ['hulk', 'knight', 'leaper']] },
      { x: 4300, waves: [['soldierz', 'soldierz', 'leaper', 'spitter', 'sniper'], ['hulk', 'hulk', 'swarm', 'swarm']] },
    ],
    boss: { x: 4850, id: 'king' },
  },
];

// ---- v0.6：ステージ 6〜15（あしば・はこ・アイテムは きまった たね から つくる）----
function seeded(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function mkStage(o) {
  const R = seeded(o.id * 7919 + 13);
  const platforms = [], crates = [], pickups = [];
  const end = o.boss.x - 380;
  let i = 0;
  for (let x = 460; x < end; x += 300 + Math.floor(R() * 140), i++) {
    const tier = i % 3 === 1 ? 196 : i % 3 === 2 && R() < 0.5 ? 168 : 230;
    platforms.push([x, tier + Math.floor(R() * 10), 130 + Math.floor(R() * 50)]);
  }
  for (let x = 400 + Math.floor(R() * 80); x < end; x += 780 + Math.floor(R() * 260)) crates.push([x]);
  for (const [x, kind] of o.weapons) pickups.push([x, kind]);
  for (let x = 1150; x < end + 200; x += 1050) pickups.push([x + Math.floor(R() * 120), 'heal']);
  for (let x = 1500; x < end + 200; x += 1250) pickups.push([x + Math.floor(R() * 120), 'ammo']);
  pickups.sort((a, b) => a[0] - b[0]);
  return {
    id: o.id, name: `ステージ ${o.id}`, sub: o.sub, theme: o.theme, length: o.length, hpMul: o.hpMul,
    gimmick: o.gimmick || null, presses: o.presses, conveyors: o.conveyors, goo: o.goo,
    free: !!o.free, start: o.start || null, heroLook: o.heroLook || null,
    platforms, crates, pickups,
    arenas: o.rooms ? o.rooms.map((r) => ({ x: r.x, waves: [r.mix.slice(0, 3)] })) : o.arenas.map(([x, ...waves]) => ({ x, waves })),
    boss: o.boss,
    rooms: o.rooms || null, horde: o.horde || null, cap: o.cap || null,
    bossDoors: o.bossDoors || null, bossMix: o.bossMix || null, bossCalls: o.bossCalls || 0,
  };
}
const MORE = [
  { id: 6, sub: 'すてられた びょういん', theme: 'hospital', length: 5200, hpMul: 1.12, gimmick: { type: 'blackout', every: 13, first: 8, dur: 3.2 },
    weapons: [[820, 'smg'], [1400, 'tbomb'], [2000, 'shotgun'], [3050, 'rifle']],
    arenas: [
      [700, ['patient', 'patient', 'labz'], ['guard', 'patient', 'zombie', 'crawler']],
      [1600, ['labz', 'labz', 'spitter', 'patient'], ['guard', 'guard', 'leaper']],
      [2550, ['patient', 'patient', 'patient', 'zombie'], ['hulk', 'labz'], ['spitter', 'guard', 'leaper', 'patient']],
      [3500, ['guard', 'labz', 'crawler', 'crawler'], ['bloatz', 'patient', 'spitter', 'guard']],
    ], boss: { x: 4750, id: 'surgeon' } },
  { id: 7, sub: 'のっとられた きち', theme: 'base', length: 5400, hpMul: 1.18, gimmick: { type: 'turret', every: 9, first: 7 },
    weapons: [[650, 'rifle'], [1700, 'laser'], [2700, 'minigun'], [3700, 'bazooka']],
    arenas: [
      [700, ['soldierz', 'zombie', 'guard'], ['soldierz', 'soldierz', 'zombie']],
      [1650, ['sniper', 'soldierz', 'guard', 'zombie'], ['hulk', 'soldierz']],
      [2600, ['guard', 'guard', 'soldierz', 'leaper'], ['sniper', 'sniper', 'zombie', 'zombie'], ['soldierz', 'hulk', 'guard']],
      [3650, ['soldierz', 'zombie', 'zombie'], ['sergeant']],
    ], boss: { x: 4950, id: 'tank' } },
  { id: 8, sub: 'きりの もり', theme: 'forest', length: 5400, hpMul: 1.22, gimmick: { type: 'fog' },
    weapons: [[800, 'shotgun'], [1900, 'smg'], [2400, 'smoke'], [3000, 'rifle']],
    arenas: [
      [700, ['hound', 'zombie', 'hound'], ['leaper', 'zombie', 'hound']],
      [1650, ['wraith', 'hound', 'zombie', 'zombie'], ['leaper', 'leaper', 'hound']],
      [2600, ['hound', 'hound', 'crawler', 'zombie'], ['hulk', 'hound'], ['wraith', 'leaper', 'zombie', 'hound']],
      [3600, ['zombie', 'zombie', 'hound', 'hound', 'leaper'], ['hulk', 'wraith', 'hound']],
    ], boss: { x: 4950, id: 'beast' } },
  { id: 9, sub: 'うごく こうじょう', theme: 'factory', length: 5600, hpMul: 1.27, gimmick: { type: 'factory' },
    presses: [[1020, 3.6, 0], [1260, 3.6, 1.8], [2230, 3.4, 0.6], [2480, 3.4, 2.3], [3240, 3.2, 1], [4250, 3.2, 0.3], [4500, 3.2, 1.9]],
    conveyors: [[1480, 300, 1], [2900, 320, -1], [4380, 280, 1]],
    weapons: [[650, 'smg'], [1200, 'flame'], [1800, 'shotgun'], [2500, 'rifle'], [3300, 'bazooka']],
    arenas: [
      [700, ['worker', 'worker', 'zombie'], ['worker', 'soldierz', 'zombie']],
      [1700, ['bloatz', 'worker', 'worker'], ['soldierz', 'worker', 'leaper', 'zombie']],
      [2700, ['worker', 'hulk', 'worker'], ['spitter', 'soldierz', 'worker', 'bloatz']],
      [3700, ['worker', 'worker', 'zombie', 'soldierz'], ['patch']],
    ], boss: { x: 5150, id: 'welder' } },
  { id: 10, sub: 'くずれる はし', theme: 'bridge', length: 5800, hpMul: 1.32, gimmick: { type: 'debris', every: 3.6, first: 4 },
    weapons: [[700, 'rifle'], [1500, 'tbomb'], [2000, 'minigun'], [3000, 'shotgun'], [3600, 'smoke'], [4200, 'bazooka']],
    arenas: [
      [700, ['zombie', 'zombie', 'soldierz'], ['leaper', 'zombie', 'spitter', 'soldierz']],
      [1700, ['soldierz', 'soldierz', 'zombie', 'guard'], ['hulk', 'leaper', 'zombie']],
      [2750, ['spitter', 'spitter', 'zombie', 'leaper'], ['soldierz', 'sniper', 'zombie', 'zombie'], ['hulk', 'hulk']],
      [3800, ['leaper', 'leaper', 'soldierz', 'zombie'], ['sergeant', 'zombie']],
    ], boss: { x: 5300, id: 'wreck' } },
  { id: 11, sub: 'しずむ ふね', theme: 'ship', length: 5600, hpMul: 1.36, gimmick: { type: 'tilt', period: 13 },
    weapons: [[700, 'smg'], [1900, 'shotgun'], [2500, 'laser'], [3000, 'rifle'], [4000, 'bazooka']],
    arenas: [
      [700, ['sailor', 'sailor', 'zombie'], ['sailor', 'spitter', 'swarm', 'swarm']],
      [1700, ['bloatz', 'sailor', 'sailor'], ['leaper', 'sailor', 'spitter', 'zombie']],
      [2700, ['sailor', 'sailor', 'swarm', 'swarm', 'leaper'], ['hulk', 'sailor', 'spitter']],
      [3700, ['bloatz', 'bloatz', 'sailor'], ['leaper', 'leaper', 'sailor', 'sailor', 'swarm']],
    ], boss: { x: 5150, id: 'kraken' } },
  { id: 12, sub: 'ゆきやまの けんきゅうきち', theme: 'snow', length: 5600, hpMul: 1.4, gimmick: { type: 'blizzard', every: 11, first: 6, dur: 3.5 },
    weapons: [[700, 'rifle'], [1900, 'beam'], [2400, 'flame'], [2900, 'smg'], [4000, 'bazooka']],
    arenas: [
      [700, ['frozen', 'frozen', 'hound'], ['soldierz', 'frozen', 'hound']],
      [1700, ['sniper', 'frozen', 'frozen', 'soldierz'], ['hulk', 'hound', 'hound']],
      [2700, ['frozen', 'frozen', 'leaper', 'soldierz'], ['sniper', 'sniper', 'frozen'], ['hound', 'hound', 'hound', 'frozen']],
      [3700, ['frozen', 'soldierz', 'soldierz', 'hound'], ['patch', 'frozen']],
    ], boss: { x: 5150, id: 'yeti' } },
  { id: 13, sub: 'ちかの むしの す', theme: 'hive', length: 5600, hpMul: 1.44, gimmick: { type: 'goo' },
    goo: [[1100, 180], [2020, 160], [3120, 200], [4300, 180]],
    weapons: [[700, 'shotgun'], [1700, 'smg'], [2300, 'smoke'], [2800, 'rifle'], [3900, 'bazooka']],
    arenas: [
      [700, ['swarm', 'swarm', 'crawler', 'swarm'], ['spitter', 'leaper', 'swarm']],
      [1700, ['bloatz', 'crawler', 'crawler'], ['wraith', 'swarm', 'swarm', 'leaper', 'spitter']],
      [2700, ['leaper', 'leaper', 'crawler', 'swarm', 'swarm'], ['hulk', 'spitter', 'bloatz'], ['wraith', 'wraith', 'swarm', 'swarm']],
      [3700, ['bloatz', 'bloatz', 'spitter', 'spitter'], ['hulk', 'leaper', 'leaper', 'swarm', 'swarm']],
    ], boss: { x: 5150, id: 'queen' } },
  { id: 14, sub: 'あらしの ひこうじょう', theme: 'airfield', length: 5800, hpMul: 1.48, gimmick: { type: 'lightning', every: 6, first: 5 },
    weapons: [[650, 'rifle'], [1900, 'minigun'], [2500, 'laser'], [3000, 'bazooka'], [3500, 'tbomb'], [4000, 'shotgun']],
    arenas: [
      [700, ['soldierz', 'soldierz', 'zombie', 'hound'], ['sniper', 'soldierz', 'guard']],
      [1700, ['hound', 'hound', 'soldierz', 'zombie'], ['sergeant']],
      [2750, ['soldierz', 'sniper', 'hulk'], ['hound', 'leaper', 'soldierz', 'soldierz'], ['guard', 'guard', 'zombie', 'zombie', 'hound']],
      [3800, ['sniper', 'sniper', 'soldierz', 'soldierz'], ['hulk', 'soldierz', 'hound']],
    ], boss: { x: 5300, id: 'heli' } },
  { id: 15, sub: 'さいごの けんきゅうじょ', theme: 'core', length: 6200, hpMul: 1.45, gimmick: { type: 'vents', every: 8, first: 6 },
    weapons: [[650, 'beam'], [1600, 'shotgun'], [2100, 'flame'], [2600, 'minigun'], [3500, 'bazooka'], [4000, 'smoke'], [4500, 'rifle']],
    arenas: [
      [700, ['labz', 'labz', 'guard', 'patient'], ['spitter', 'leaper', 'labz']],
      [1700, ['soldierz', 'soldierz', 'hound', 'frozen'], ['bloatz', 'sailor', 'worker']],
      [2700, ['wraith', 'leaper', 'leaper', 'swarm', 'swarm'], ['hulk', 'spitter', 'guard'], ['sniper', 'soldierz', 'hound', 'hound']],
      [3700, ['patch'], ['leaper', 'leaper', 'spitter', 'crawler']],
      [4600, ['hulk', 'hulk', 'swarm', 'swarm'], ['sergeant', 'labz', 'labz']],
    ], boss: { x: 5700, id: 'final' } },
  // v0.7：いせきの どうくつ（さいしょから えらべる。カタナ で たたかう）
  { id: 16, sub: 'いせきの どうくつ', theme: 'ruins', length: 5400, hpMul: 1.45, free: true, start: ['katana', 'pistol'], heroLook: 'plain',
    gimmick: { type: 'debris', every: 6.5, first: 6, rock: true },
    weapons: [],
    arenas: [
      [700, ['ghoul', 'ghoulet', 'ghoul'], ['ghoulet', 'ghoulet', 'ghoul']],
      [1650, ['ghoul', 'ghoul', 'ghoulet', 'ghoulet'], ['ghoul', 'leaper', 'ghoulet']],
      [2600, ['ghoulet', 'ghoulet', 'ghoulet', 'ghoul'], ['ghoul', 'ghoul', 'leaper'], ['ghoul', 'ghoulet', 'ghoulet', 'ghoul']],
      [3600, ['ghoul', 'ghoul', 'ghoulet'], ['bigghoul', 'ghoulet']],
    ], boss: { x: 4950, id: 'ghoulking' } },
  // v0.8：よあけの こうや（さいしょは まっくら → あさやけ → あおぞら。すすむ ほど あかるく なる）
  { id: 17, sub: 'よあけの こうや', theme: 'dawn', length: 5600, hpMul: 1.45, free: true, start: ['katana', 'pistol'], heroLook: 'plain',
    weapons: [[900, 'shotgun'], [1500, 'flame'], [2100, 'rifle'], [2700, 'tbomb'], [3300, 'smg'], [3800, 'smoke'], [4300, 'bazooka'], [4800, 'laser']],
    arenas: [
      [700, ['nomad', 'nomad', 'scorp'], ['nomad', 'scorp', 'scorp']],
      [1700, ['outlaw', 'nomad', 'zombie'], ['scorp', 'scorp', 'scorp', 'nomad']],
      [2700, ['nomad', 'outlaw', 'outlaw', 'scorp'], ['hound', 'hound', 'nomad'], ['outlaw', 'nomad', 'scorp', 'scorp']],
      [3800, ['nomad', 'nomad', 'scorp'], ['rockz', 'scorp', 'scorp']],
    ], boss: { x: 5150, id: 'sunscorp' } },
  // v0.9：とびらの そうこ（ドア・シャッターが バーン！と ひらいて くろスーツが どっと でてくる。ちは みどり）
  { id: 18, sub: 'とびらの そうこ', theme: 'doors', length: 6600, hpMul: 1.3, free: true, start: ['shotgun', 'pistol'], heroLook: 'plain', cap: 18,
    weapons: [[420, 'shotgun'], [600, 'smoke'], [1250, 'shotgun'], [1350, 'tbomb'], [2300, 'smg'], [2450, 'laser'], [3350, 'shotgun'], [3500, 'flame'], [4400, 'rifle'], [5450, 'shotgun']],
    // へや：x（まんなか）・でてくる かず・ドア（へやの まんなか から の ずれ と しゅるい）・まぜかた
    horde: { total: [150, 250] },
    rooms: [
      { x: 700,  quota: 26, doors: [[-170, 'door'], [130, 'door']], mix: ['suit', 'suit', 'suit', 'suitk', 'suitp'] },
      { x: 1750, quota: 36, doors: [[-200, 'door'], [-20, 'shutter'], [190, 'door']], mix: ['suit', 'suit', 'suitk', 'suitk', 'suitp', 'suitp', 'suitsg'] },
      { x: 2800, quota: 40, doors: [[-205, 'shutter'], [0, 'steel'], [200, 'shutter']], mix: ['suit', 'suit', 'suit', 'suitk', 'suitp', 'suitsg'], tough: ['heavy', 'suitsg'] },
      { x: 3850, quota: 44, doors: [[-215, 'door'], [-85, 'door'], [65, 'shutter'], [205, 'door']], mix: ['suit', 'suit', 'suitk', 'suitk', 'suitp', 'suitp', 'suitsg'] },
      { x: 4900, quota: 50, doors: [[-210, 'steel'], [-60, 'shutter'], [90, 'door'], [215, 'shutter']], mix: ['suit', 'suit', 'suitk', 'suitp', 'suitsg', 'suitsg'], tough: ['heavy', 'heavy', 'suitsg'] },
    ],
    bossDoors: [[-220, 'shutter'], [0, 'steel'], [215, 'shutter']], bossMix: ['suit', 'suit', 'suitk', 'suitp', 'suitsg'], bossCalls: 36,
    boss: { x: 5950, id: 'doorboss' } },
];
for (const o of MORE) STAGES.push(mkStage(o));

// ---- v0.8：よあけ の あかるさ（p = すすみぐあい 0〜1 → そら・たいよう・くらさ・きり・いろみ を なめらかに）----
// キー：まよなか → よあけまえ（むらさき）→ ひので（オレンジ）→ あさ → あおぞら
export const DAWN_KEYS = [
  { p: 0.00, top: [6, 8, 22],    hor: [24, 28, 58],    dark: 0.6,  vig: 0.9,  fog: 0.65, tint: [120, 132, 200], stars: 1 },
  { p: 0.28, top: [22, 20, 58],  hor: [112, 58, 96],   dark: 0.46, vig: 0.85, fog: 0.6,  tint: [150, 120, 180], stars: 0.6 },
  { p: 0.52, top: [64, 72, 140], hor: [255, 140, 70],  dark: 0.3,  vig: 0.7,  fog: 0.7,  tint: [255, 190, 150], stars: 0.1 },
  { p: 0.76, top: [80, 150, 220], hor: [255, 214, 150], dark: 0.12, vig: 0.45, fog: 0.45, tint: [255, 238, 214], stars: 0 },
  { p: 1.00, top: [52, 138, 232], hor: [190, 228, 255], dark: 0.0,  vig: 0.28, fog: 0.28, tint: [255, 255, 255], stars: 0 },
];
const smooth = (u) => u * u * (3 - 2 * u);
const mixA = (a, b, u) => a.map((v, i) => Math.round(v + (b[i] - v) * u));
export function dawnAt(p) {
  p = Math.max(0, Math.min(1, +p || 0));
  let i = 0; while (i < DAWN_KEYS.length - 2 && p > DAWN_KEYS[i + 1].p) i++;
  const A = DAWN_KEYS[i], B = DAWN_KEYS[i + 1], u = smooth((p - A.p) / (B.p - A.p));
  const m = (k) => A[k] + (B[k] - A[k]) * u;
  const dark = m('dark');
  return {
    p, dark, vig: m('vig'), fog: m('fog'), stars: m('stars'),
    top: mixA(A.top, B.top, u), hor: mixA(A.hor, B.hor, u), tint: mixA(A.tint, B.tint, u),
    sunY: 300 - 230 * smooth(Math.min(1, p / 0.95)), // ちへいせん の した → たかい ところ
    light: 1 - dark / DAWN_KEYS[0].dark,
  };
}
// ステージの どこまで すすんだか（スタート 0 → ボス 1）
export function stageProgress(stage, x) { return Math.max(0, Math.min(1, (x - 300) / Math.max(1, stage.boss.x - 300))); }

// ---- なかま ----
export const ALLIES = [
  { id: 'ao',   name: 'アオ', color: '#6f9fd8', weapon: 'rifle', hp: 90, gunDmg: 0.42, kickDmg: 0.8, offset: -70 },
  { id: 'momo', name: 'モモ', color: '#c97a9a', weapon: 'smg',   hp: 80, gunDmg: 0.38, kickDmg: 1.0, offset: -120 },
];
export const ALLY_DOWN_TIME = 7;
// なかまの きめごと（なにを する か）
export function allyDecide(ally, target, leader) {
  if (ally.down > 0) return 'down';
  if (leader && Math.abs(leader.x - ally.x) > 560) return 'warp';
  if (!target) return 'follow';
  const dx = target.x - ally.x, dy = (target.y - target.h / 2) - (ally.y - 40);
  if (Math.abs(dx) < 62 && Math.abs(dy) < 70) return 'kick';
  if (Math.abs(dx) < 420 && Math.abs(dy) < 160) return 'shoot';
  return 'follow';
}

// ---- じゅうりょく・あしば ----
// うえから おちて きたときだけ のれる（したからは とおりぬけ）
export function landOn(platforms, x, prevY, y, halfW = 12) {
  let best = null;
  if (y >= GROUND) best = GROUND;
  for (const p of platforms) {
    if (x + halfW < p.x || x - halfW > p.x + p.w) continue;
    if (prevY <= p.y + 0.5 && y >= p.y && (best === null || p.y < best)) best = p.y;
  }
  return best;
}
export function makePlatforms(stage) { return stage.platforms.map(([x, y, w]) => ({ x, y, w })); }

export function scoreFor(base, combo) { return Math.round(base * comboMult(combo)); }
export function rankOf(r) { // クリア ランク
  const s = (r.hpLeft >= 0.6 ? 1 : 0) + (r.time < 240 ? 1 : 0) + (r.maxCombo >= 15 ? 1 : 0);
  return ['★', '★★', '★★★', '★★★'][s];
}

export function normalizeSave(s) {
  const d = { cleared: [], best: {}, allies: true, shake: true, zoom: ZOOM_DEFAULT };
  if (!s || typeof s !== 'object') return d;
  return {
    cleared: Array.isArray(s.cleared) ? s.cleared.filter((n) => Number.isInteger(n)) : [],
    best: s.best && typeof s.best === 'object' ? s.best : {},
    allies: s.allies !== false, shake: s.shake !== false,
    zoom: Number.isInteger(s.zoom) && s.zoom >= 0 && s.zoom < ZOOMS.length ? s.zoom : ZOOM_DEFAULT,
  };
}
