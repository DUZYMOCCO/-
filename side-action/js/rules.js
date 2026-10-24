// バトル アクション の きまり（DOM なし・node で テストできる）
export const VERSION = '0.4.0';
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
// じゅうの かたち（つかむ て = 0,0 から）：mx,my=じゅうこう、ex,ey=やっきょう が でる ところ、kick=[うしろ, はねあがり]
export const GUN_GEOM = {
  pistol:  { mx: 25, my: -7.5, ex: 8,  ey: -9,  kick: [4, 0.32], flash: 'pistol',  shell: [2.6, '#c9a14a'] },
  smg:     { mx: 35, my: -7, ex: 6,  ey: -9,  kick: [3, 0.08], flash: 'smg',     shell: [2.4, '#c9a14a'] },
  rifle:   { mx: 49, my: -8.4, ex: -16, ey: -9,  kick: [5, 0.06], flash: 'rifle',   shell: [3.4, '#d0a848'] },
  shotgun: { mx: 52, my: -9.6, ex: 7,  ey: -9,  kick: [8, 0.22], flash: 'shotgun', shell: [4.2, '#2f4f86'] },
  bazooka: { mx: 46, my: -9,   ex: 0,  ey: 0,   kick: [9, 0.1],  flash: 'bazooka', shell: null },
  dark:    { mx: 33, my: -7, ex: 6,  ey: -9,  kick: [3, 0.1],  flash: 'smg',     shell: null },
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
  // v0.3 の あたらしい てき（ai = うごきかた の もと、look = みため）
  raider:  { name: 'ガスマスク',   hp: 38,  w: 30, h: 70, speed: 150, weight: 1,   dmg: 8,  reach: 46, wind: 0.42, cool: 0.95, score: 130, blood: 'green', ai: 'grunt', look: 'raider' },
  sniper:  { name: 'ねらいへい',   hp: 30,  w: 30, h: 70, speed: 90,  weight: 1,   dmg: 9,  reach: 0,  wind: 1.0,  cool: 2.3,  score: 200, blood: 'green', ai: 'gunner', look: 'sniper', range: [250, 420], shotSpeed: 560, laser: true },
  swarm:   { name: 'チビカゲ',     hp: 10,  w: 26, h: 20, speed: 230, weight: 0.6, dmg: 5,  reach: 32, wind: 0.32, cool: 0.9,  score: 60,  blood: 'purple', ai: 'crawler', look: 'swarm', jumper: true, emerge: true, small: true },
  bloater: { name: 'ふくれマスク', hp: 70,  w: 40, h: 80, speed: 70,  weight: 1.8, dmg: 10, reach: 50, wind: 0.6,  cool: 1.5,  score: 260, blood: 'purple', ai: 'grunt', look: 'bloater', burst: true },
  knight:  { name: 'くろきし',     hp: 70,  w: 34, h: 78, speed: 96,  weight: 1.6, dmg: 12, reach: 54, wind: 0.6,  cool: 1.3,  score: 300, blood: 'green', ai: 'shield', look: 'knight', shieldHp: 40 },
  wraith:  { name: 'ゆらぎ',       hp: 30,  w: 40, h: 40, speed: 240, weight: 0.8, dmg: 9,  reach: 40, wind: 0.32, cool: 0.9,  score: 180, blood: 'purple', ai: 'crawler', look: 'wraith', jumper: true, emerge: true },
};
for (const [k, d] of Object.entries(ENEMIES)) { d.ai = d.ai || k; d.look = d.look || k; if (d.emerge === undefined) d.emerge = k === 'crawler'; }
export const BOSSES = {
  agent: { name: 'くろよろい エージェント', hp: 1400, w: 74, h: 148, speed: 110, weight: 4, dmg: 18, score: 5000, blood: 'purple', armor: 0.7 },
  hydra: { name: 'ねじれ ばけもの',         hp: 1700, w: 110, h: 170, speed: 0, weight: 99, dmg: 16, score: 8000, blood: 'purple', armor: 1 },
  // v0.3：agent と おなじ「にんげんがた」の うごき＋ それぞれの わざ
  giant:  { name: 'てっかめん の きょじん',  hp: 1600, w: 96, h: 170, speed: 92,  weight: 6, dmg: 18, score: 9000,  blood: 'green',  armor: 0.8, kit: 'giant', scale: 2.4 },
  mutant: { name: 'どろどろ ミュータント',    hp: 1700, w: 104, h: 130, speed: 120, weight: 5, dmg: 16, score: 10000, blood: 'purple', armor: 0.8, kit: 'mutant' },
  king:   { name: 'あかい め の おう',        hp: 2400, w: 80, h: 160, speed: 120, weight: 5, dmg: 18, score: 15000, blood: 'purple', armor: 0.8, kit: 'king' },
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
  {
    id: 3, name: 'ステージ 3', sub: 'あめの はいきょとし', theme: 'city', length: 4900,
    platforms: [[520, 230, 150], [900, 196, 130], [1300, 226, 170], [1640, 176, 150], [2150, 220, 160], [2500, 182, 140], [3050, 228, 170], [3500, 196, 150], [3900, 232, 140]],
    crates: [[420], [1180], [1980], [2860], [3700]],
    pickups: [[640, 'rifle', 222], [1380, 'heal', 218], [1700, 'smg', 168], [2580, 'shotgun', 174], [3120, 'ammo', 220], [3560, 'heal', 188], [4050, 'bazooka']],
    arenas: [
      { x: 700,  waves: [['raider', 'grunt', 'raider'], ['gunner', 'raider', 'grunt']] },
      { x: 1550, waves: [['raider', 'raider', 'crawler'], ['sniper', 'grunt', 'raider']] },
      { x: 2400, waves: [['shield', 'raider', 'sniper'], ['brute', 'raider'], ['crawler', 'crawler', 'raider', 'gunner']] },
      { x: 3300, waves: [['raider', 'raider', 'sniper', 'grunt'], ['brute', 'sniper', 'raider']] },
    ],
    boss: { x: 4400, id: 'giant' },
  },
  {
    id: 4, name: 'ステージ 4', sub: 'くらやみの ちかてつ', theme: 'subway', length: 5000,
    train: { every: 15, first: 9 },
    platforms: [[480, 226, 170], [820, 230, 160], [1180, 222, 180], [1560, 228, 170], [1880, 216, 160], [2260, 226, 180], [2640, 220, 170], [3000, 228, 170], [3360, 222, 170], [3720, 226, 180], [4100, 220, 160]],
    crates: [[400], [1100], [2050], [2950], [3800]],
    pickups: [[560, 'shotgun', 216], [1250, 'heal', 212], [1950, 'ammo', 206], [2700, 'heal', 210], [3080, 'rifle', 218], [3800, 'ammo', 216], [4150, 'heal', 210]],
    arenas: [
      { x: 700,  waves: [['swarm', 'swarm', 'grunt', 'swarm'], ['bloater', 'raider']] },
      { x: 1600, waves: [['swarm', 'swarm', 'swarm', 'crawler'], ['bloater', 'gunner', 'swarm']] },
      { x: 2500, waves: [['raider', 'bloater', 'swarm', 'swarm'], ['shield', 'sniper', 'swarm'], ['swarm', 'swarm', 'swarm', 'swarm', 'crawler']] },
      { x: 3450, waves: [['bloater', 'bloater', 'swarm'], ['brute', 'swarm', 'swarm', 'gunner']] },
    ],
    boss: { x: 4500, id: 'mutant' },
  },
  {
    id: 5, name: 'ステージ 5', sub: 'あかい そらの とう', theme: 'tower', length: 5300,
    platforms: [[460, 232, 140], [700, 196, 130], [940, 160, 130], [1400, 226, 160], [1720, 190, 150], [2200, 230, 170], [2520, 186, 150], [2840, 150, 130], [3300, 226, 160], [3700, 200, 150], [4100, 232, 150], [4400, 196, 140]],
    crates: [[380], [1250], [2080], [3150], [4000]],
    pickups: [[720, 'rifle', 186], [960, 'heal', 150], [1500, 'shotgun', 216], [2560, 'bazooka', 176], [2880, 'heal', 140], [3400, 'ammo', 216], [4150, 'heal', 222], [4450, 'ammo', 186]],
    arenas: [
      { x: 650,  waves: [['knight', 'raider', 'wraith'], ['sniper', 'knight', 'wraith']] },
      { x: 1600, waves: [['wraith', 'wraith', 'raider', 'raider'], ['brute', 'sniper', 'wraith']] },
      { x: 2650, waves: [['knight', 'knight', 'wraith'], ['bloater', 'sniper', 'raider'], ['wraith', 'wraith', 'wraith', 'swarm', 'swarm']] },
      { x: 3550, waves: [['knight', 'sniper', 'raider', 'wraith'], ['brute', 'knight', 'wraith']] },
      { x: 4300, waves: [['raider', 'raider', 'wraith', 'wraith', 'sniper'], ['brute', 'brute', 'swarm', 'swarm']] },
    ],
    boss: { x: 4850, id: 'king' },
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
  const d = { cleared: [], best: {}, allies: true, shake: true, zoom: ZOOM_DEFAULT };
  if (!s || typeof s !== 'object') return d;
  return {
    cleared: Array.isArray(s.cleared) ? s.cleared.filter((n) => Number.isInteger(n)) : [],
    best: s.best && typeof s.best === 'object' ? s.best : {},
    allies: s.allies !== false, shake: s.shake !== false,
    zoom: Number.isInteger(s.zoom) && s.zoom >= 0 && s.zoom < ZOOMS.length ? s.zoom : ZOOM_DEFAULT,
  };
}
