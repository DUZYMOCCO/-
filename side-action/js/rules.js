// バトル アクション の きまり（DOM なし・node で テストできる）
export const VERSION = '0.3.0';
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
};
export const WEAPON_ORDER = ['pistol', 'smg', 'rifle', 'shotgun', 'bazooka'];
export const AMMO_PICK = { smg: 90, rifle: 75, shotgun: 18, bazooka: 4 };
export const AMMO_MAX = { smg: 360, rifle: 300, shotgun: 72, bazooka: 16 };

export function createArsenal(owned = ['pistol']) {
  const a = { cur: owned[0], cool: 0, guns: {} };
  for (const id of owned) a.guns[id] = { ammo: WEAPONS[id].ammo };
  return a;
}
export function giveWeapon(a, id) {
  const fresh = !a.guns[id];
  if (fresh) a.guns[id] = { ammo: WEAPONS[id].ammo };
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
// まいフレーム。うてたら ぶきの スペックを かえす
export function tickGun(a, dt, held) {
  a.cool = Math.max(0, a.cool - dt);
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
};
export const COMBO_WINDOW = 1.3;   // この あいだに あてれば コンボが つづく
export const CHAIN_GRACE = 0.28;   // わざの あと つぎを うけつける じかん

// どの わざが でるか。step = いまの つなぎ（0,1,2）
export function pickMove(kind, { air = false, step = 0, running = false, down = false } = {}) {
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
};
export const BOSSES = {
  agent: { name: 'くろよろい エージェント', hp: 1400, w: 74, h: 148, speed: 110, weight: 4, dmg: 18, score: 5000, blood: 'purple', armor: 0.7 },
  hydra: { name: 'ねじれ ばけもの',         hp: 1700, w: 110, h: 170, speed: 0, weight: 99, dmg: 16, score: 8000, blood: 'purple', armor: 1 },
};

// ---- ステージ ----
// arenas: カメラが とまって てきが でる ばしょ。waves は じゅんばん（まえの が へったら つぎ）
export const STAGES = [
  {
    id: 1, name: 'ステージ 1', sub: 'ほろびた けんきゅうじょ', theme: 'lab', length: 4300,
    platforms: [[620, 236, 150], [1180, 220, 170], [1500, 170, 120], [2300, 232, 160], [2960, 210, 150], [3290, 236, 130]],
    crates: [[480], [1060], [1880], [2600], [3420]],
    pickups: [[820, 'smg'], [1550, 'heal', 140], [2380, 'shotgun', 222], [3050, 'ammo'], [3560, 'heal']],
    arenas: [
      { x: 700,  waves: [['grunt', 'grunt', 'crawler'], ['grunt', 'gunner', 'grunt']] },
      { x: 1560, waves: [['grunt', 'crawler', 'grunt', 'crawler'], ['gunner', 'shield', 'grunt']] },
      { x: 2450, waves: [['shield', 'grunt', 'crawler', 'grunt'], ['brute', 'crawler'], ['gunner', 'gunner', 'crawler', 'crawler']] },
      { x: 3300, waves: [['grunt', 'grunt', 'gunner', 'crawler'], ['crawler', 'crawler', 'shield', 'grunt', 'brute']] },
    ],
    boss: { x: 3900, id: 'agent' },
  },
  {
    id: 2, name: 'ステージ 2', sub: 'あかい そらの おやしき', theme: 'manor', length: 4700,
    platforms: [[560, 226, 160], [1000, 200, 140], [1700, 230, 170], [2050, 180, 140], [2760, 224, 160], [3380, 200, 170], [3800, 236, 130]],
    crates: [[430], [1350], [2200], [3100]],
    pickups: [[700, 'rifle', 212], [1450, 'heal'], [2120, 'bazooka', 166], [2900, 'ammo'], [3500, 'heal', 186], [3900, 'ammo']],
    arenas: [
      { x: 650,  waves: [['crawler', 'crawler', 'grunt', 'grunt'], ['gunner', 'grunt', 'grunt', 'crawler']] },
      { x: 1500, waves: [['shield', 'shield', 'gunner', 'crawler'], ['crawler', 'crawler', 'crawler', 'crawler']] },
      { x: 2350, waves: [['brute', 'grunt', 'crawler'], ['gunner', 'gunner', 'shield', 'grunt'], ['crawler', 'grunt', 'crawler', 'grunt', 'crawler']] },
      { x: 3200, waves: [['brute', 'gunner', 'grunt'], ['shield', 'crawler', 'crawler', 'gunner', 'grunt']] },
      { x: 3950, waves: [['grunt', 'grunt', 'grunt', 'crawler', 'crawler'], ['brute', 'brute', 'crawler']] },
    ],
    boss: { x: 4300, id: 'hydra' },
  },
];

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
  const d = { cleared: [], best: {}, allies: true, shake: true };
  if (!s || typeof s !== 'object') return d;
  return {
    cleared: Array.isArray(s.cleared) ? s.cleared.filter((n) => Number.isInteger(n)) : [],
    best: s.best && typeof s.best === 'object' ? s.best : {},
    allies: s.allies !== false, shake: s.shake !== false,
  };
}
