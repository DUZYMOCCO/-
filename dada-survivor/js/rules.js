/**
 * ダダサバイバーもどき ルールデータ（描画に依存しない純粋なデータと計算）
 */

export const STAGE_SECONDS = 300;      // 5分生き残ると大ボス登場
export const MINI_BOSS_SECONDS = 150;  // 2分30秒で中ボス
export const MAX_ENEMIES = 150;   // DOM描画のためiPhone SE2基準で控えめ
export const MAX_GEMS = 150;
export const MAX_LEVEL = 5;

export const DIFFICULTIES = {
  easy:   { id: 'easy',   label: 'やさしい',   enemyHp: 0.6, enemyDmg: 0.5, spawn: 0.7, coin: 1 },
  normal: { id: 'normal', label: 'ふつう',     enemyHp: 1.0, enemyDmg: 1.0, spawn: 1.0, coin: 1.5 },
  hard:   { id: 'hard',   label: 'むずかしい', enemyHp: 1.5, enemyDmg: 1.4, spawn: 1.3, coin: 2 },
};

// perk: キャラの とくちょう（hp:さいだいHP, dmg:ダメージ倍率+, spd:いどう+, pickup:ひろう範囲+, regen:まいびょう かいふく）
// unlock: そのステージを クリアすると なかまになる
export const CHARACTERS = [
  { id: 'cat',     name: 'ねこ',       weapon: 'kunai',   perk: { spd: 0.08 },             trait: 'すばやい' },
  { id: 'dog',     name: 'ソルジャー', weapon: 'gun',     perk: { hp: 30 },                trait: 'タフ' },
  { id: 'fox',     name: 'きつね',     weapon: 'thunder', perk: { dmg: 0.1 },              trait: 'つよい' },
  { id: 'panda',   name: 'パンダ',     weapon: 'bomb',    perk: { hp: 20, regen: 0.5 },    trait: 'かいふく' },
  { id: 'rabbit',  name: 'うさぎ',     weapon: 'aura',    perk: { spd: 0.2 },              trait: 'とっても はやい', unlock: 1 },
  { id: 'penguin', name: 'ペンギン',   weapon: 'gun',     perk: { pickup: 0.5, hp: 20 },   trait: 'ほうせき あつめ', unlock: 2 },
  { id: 'bear',    name: 'くま',       weapon: 'shotgun', perk: { hp: 70 },                trait: 'すごく タフ', unlock: 3 },
  { id: 'dino',    name: 'きょうりゅう', weapon: 'bazooka', perk: { dmg: 0.25 },           trait: 'すごく つよい', unlock: 4 },
  { id: 'unicorn', name: 'ユニコーン', weapon: 'thunder', perk: { dmg: 0.15, spd: 0.1, hp: 40, regen: 0.5 }, trait: 'ぜんぶ アップ', unlock: 5 },
];

// てきは ぜんぶ「わるものぐんだん」の へいたい（id は むかしの モンスターめいの まま。どの へいたいかは js/art.js の コメント）
export const ENEMY_TYPES = {
  zombie:   { hp: 10, speed: 42, dmg: 8,  xp: 1, r: 16, size: 34 },
  bat:      { hp: 6,  speed: 78, dmg: 5,  xp: 1, r: 13, size: 28 },
  ghost:    { hp: 20, speed: 55, dmg: 10, xp: 2, r: 16, size: 34 },
  skull:    { hp: 36, speed: 50, dmg: 12, xp: 3, r: 17, size: 36 },
  scorpion: { hp: 12, speed: 50, dmg: 8,  xp: 1, r: 15, size: 34 },
  mummy:    { hp: 26, speed: 40, dmg: 11, xp: 2, r: 16, size: 36 },
  snowman:  { hp: 30, speed: 34, dmg: 10, xp: 2, r: 17, size: 38 },
  wolf:     { hp: 16, speed: 92, dmg: 10, xp: 1, r: 15, size: 36 },
  pumpkin:  { hp: 22, speed: 50, dmg: 10, xp: 2, r: 16, size: 34 },
  // けんきゅうじょ（ステージ1）だけ：ばくだんなげへい（はなれて とまり、ばくだんを なげる。いちどに cap にんまで）
  thrower:  { hp: 16, speed: 48, dmg: 8,  xp: 2, r: 16, size: 36, ranged: true, cap: 4 },
  // ボトルから とびだす うちゅうじん（わるものぐんだん では ないので ワッペンなし）
  alien:    { hp: 14, speed: 74, dmg: 7,  xp: 4, r: 14, size: 34, noEmblem: true },
  // ボス（hp は ステージがわで きめる）
  ogre:     { speed: 40, dmg: 20, xp: 40, r: 38, size: 80,  name: 'おおぐんそう' },
  dragon:   { speed: 38, dmg: 25, xp: 40, r: 48, size: 104, name: 'せんしゃたいちょう' },
  snake:    { speed: 46, dmg: 26, xp: 40, r: 46, size: 100, name: 'メカアーマー' },
  icegiant: { speed: 36, dmg: 28, xp: 40, r: 50, size: 110, name: 'ゆきやまたいちょう' },
  witch:    { speed: 52, dmg: 28, xp: 40, r: 40, size: 96,  name: 'かげの たいちょう' },
  maou:     { speed: 40, dmg: 32, xp: 40, r: 52, size: 116, name: 'だいそうすい' },
};

// enemies: [しゅるい, でてくる びょう, でやすさ]
export const STAGES = [
  { id: 1, name: 'けんきゅうじょ', ground: 'lab', decor: 'lab', hpMul: 1.0, spawnMul: 1.0, dmgMul: 1.0,
    enemies: [['zombie', 0, 10], ['bat', 30, 6], ['thrower', 45, 3], ['ghost', 90, 5], ['skull', 180, 4]],
    mini: { type: 'ogre', hp: 900 }, boss: { type: 'dragon', hp: 3000 },
    // ばくだんの ひが ひろがった ところに ばくはへい（mummy）が あつまる・ボトルは こわせる
    fire: true, bottles: true,
    // けんきゅうしゃ：at びょうで あらわれ、さわると gift の ぶきを くれる（いまは ステージ1だけ）
    // container: けんきゅうしゃは コンテナの なか（なかまと いっしょ）。at びょうで コンテナが みつかる
    researcher: { at: 90, gift: 'supermissile', container: true } },
  { id: 2, name: 'さばく', ground: 'desert', hpMul: 1.6, spawnMul: 1.1, dmgMul: 1.15,
    enemies: [['scorpion', 0, 10], ['bat', 30, 5], ['mummy', 90, 6], ['skull', 180, 4]],
    mini: { type: 'mummy', hp: 1600, big: 2.4, name: 'でかばくはへい' }, boss: { type: 'snake', hp: 5000 } },
  { id: 3, name: 'ゆきやま', ground: 'snow', hpMul: 2.4, spawnMul: 1.2, dmgMul: 1.3,
    enemies: [['snowman', 0, 10], ['wolf', 30, 6], ['bat', 90, 4], ['skull', 180, 4]],
    mini: { type: 'wolf', hp: 2600, big: 2.4, name: 'ボスぐんようけん' }, boss: { type: 'icegiant', hp: 7500 } },
  { id: 4, name: 'おばけのもり', ground: 'forest', hpMul: 3.4, spawnMul: 1.3, dmgMul: 1.45,
    enemies: [['pumpkin', 0, 10], ['ghost', 30, 7], ['bat', 90, 5], ['skull', 180, 5]],
    mini: { type: 'pumpkin', hp: 3600, big: 2.6, name: 'でかかえんへい' }, boss: { type: 'witch', hp: 10500 } },
  { id: 5, name: 'まおうじょう', ground: 'castle', hpMul: 4.6, spawnMul: 1.4, dmgMul: 1.6,
    enemies: [['zombie', 0, 8], ['skull', 0, 4], ['wolf', 30, 5], ['mummy', 60, 5], ['pumpkin', 120, 5], ['snowman', 180, 4]],
    mini: { type: 'dragon', hp: 6000 }, boss: { type: 'maou', hp: 15000 } },
];

export function stageById(id) { return STAGES.find(s => s.id === id) || STAGES[0]; }

/** ステージの ボス／中ボスの データ（ENEMY_TYPES に ステージの うわがきを かさねる） */
export function bossType(def, difficulty = DIFFICULTIES.normal) {
  const T = ENEMY_TYPES[def.type], big = def.big || 1;
  return {
    ...T, boss: true,
    hp: def.hp * difficulty.enemyHp,
    name: def.name || T.name,
    r: def.big ? T.r * big * 0.9 : T.r,
    size: T.size * big,
    dmg: def.big ? T.dmg * 2 : T.dmg,
    speed: def.big ? T.speed * 0.8 : T.speed,
    xp: 40,
  };
}

/* ---------- そうび ---------- */
export const RARITIES = [
  { name: 'ふつう',   color: '#e5e7eb', weight: 55 },
  { name: 'いいもの', color: '#4ade80', weight: 28 },
  { name: 'レア',     color: '#60a5fa', weight: 12 },
  { name: 'すごい',   color: '#c084fc', weight: 4 },
  { name: 'でんせつ', color: '#facc15', weight: 1 },
];
export const GEAR_SLOTS = {
  weapon: { name: 'けん',     stat: 'dmg',   values: [0.1, 0.2, 0.35, 0.55, 0.8] },
  armor:  { name: 'よろい',   stat: 'hp',    values: [20, 40, 70, 110, 160] },
  boots:  { name: 'くつ',     stat: 'spd',   values: [0.05, 0.1, 0.15, 0.22, 0.3] },
  charm:  { name: 'おまもり', stat: 'regen', values: [0.5, 1, 1.8, 2.8, 4] },
};
export const CHEST_COST = 80;

export function gearLabel(slot, rarity) {
  const g = GEAR_SLOTS[slot], v = g.values[rarity];
  if (g.stat === 'dmg') return `こうげき +${Math.round(v * 100)}%`;
  if (g.stat === 'hp') return `たいりょく +${v}`;
  if (g.stat === 'spd') return `はやさ +${Math.round(v * 100)}%`;
  return `まいびょう ${v} かいふく`;
}

export function rollGear(rnd = Math.random) {
  const slots = Object.keys(GEAR_SLOTS);
  const slot = slots[Math.floor(rnd() * slots.length)];
  const rarity = +pickWeighted(Object.fromEntries(RARITIES.map((r, i) => [i, r.weight])), rnd);
  return { slot, rarity };
}

export function addGear(save, { slot, rarity }) { save.gear.inv[slot][rarity]++; }

export function equipGear(save, slot, rarity) {
  const g = save.gear;
  if (!(g.inv[slot][rarity] > 0)) return false;
  g.inv[slot][rarity]--;
  if (g.equip[slot] >= 0) g.inv[slot][g.equip[slot]]++;
  g.equip[slot] = rarity;
  return true;
}

export function unequipGear(save, slot) {
  const g = save.gear;
  if (g.equip[slot] < 0) return false;
  g.inv[slot][g.equip[slot]]++;
  g.equip[slot] = -1;
  return true;
}

/** おなじ ぶい・おなじ レアど 3つ → ひとつ うえの レアど 1つ */
export function mergeGear(save, slot, rarity) {
  const inv = save.gear.inv[slot];
  if (rarity >= RARITIES.length - 1 || inv[rarity] < 3) return false;
  inv[rarity] -= 3; inv[rarity + 1]++;
  return true;
}

/** そうび と キャラの とくちょうを ひとつの ボーナスに まとめる */
export function bonusFor(save, charId) {
  const b = { hp: 0, dmg: 0, spd: 0, pickup: 0, regen: 0 };
  const ch = CHARACTERS.find(c => c.id === charId);
  for (const [k, v] of Object.entries(ch?.perk || {})) b[k] += v;
  for (const [slot, r] of Object.entries(save.gear?.equip || {})) {
    if (r >= 0) b[GEAR_SLOTS[slot].stat] += GEAR_SLOTS[slot].values[r];
  }
  return b;
}

/* ---------- すすみぐあい ---------- */
export function stageUnlocked(save, id) { return id === 1 || (save.stageClears[id - 1] || 0) > 0; }
export function charUnlocked(save, ch) { return !ch.unlock || (save.stageClears[ch.unlock] || 0) > 0; }

/** クリア ほうしゅう：はじめては たからばこ 2こ、2かいめからは 1こ（むずかしいは +1） */
export function clearRewards(save, stageId, difficultyId) {
  const first = !(save.stageClears[stageId] > 0);
  return { chests: (first ? 2 : 1) + (difficultyId === 'hard' ? 1 : 0), first };
}

// レベル1〜5の性能。index = level-1
// fire: bullet=まっすぐ弾 / spread=ひろがる弾 / rocket=とんでばくはつ。evolved はしんか後、gift は けんきゅうしゃの おくりもの。どちらも ふつうの候補には出さない。
export const GUNS = ['gun', 'shotgun', 'bazooka'];
export const EVOLUTIONS = {
  gun:     { need: 'ammo',  into: 'dual' },
  shotgun: { need: 'ammo',  into: 'gatling' },
  bazooka: { need: 'blast', into: 'mega' },
};

export const WEAPONS = {
  kunai: {
    name: 'クナイ', icon: '🗡️', desc: 'ちかくのてきに とんでいく',
    cooldown: [0.8, 0.72, 0.64, 0.56, 0.48], damage: [12, 15, 18, 22, 27], count: [1, 2, 2, 3, 4],
  },
  orbit: {
    name: 'まわるほし', icon: '⭐', desc: 'まわりを ぐるぐる まもる',
    damage: [11, 13, 15, 18, 22], count: [2, 3, 3, 4, 5], radius: [70, 75, 82, 88, 95],
  },
  thunder: {
    name: 'かみなり', icon: '⚡', desc: 'てきに かみなりを おとす',
    cooldown: [1.8, 1.6, 1.4, 1.2, 1.0], damage: [25, 32, 40, 50, 60], count: [1, 2, 2, 3, 4],
  },
  bomb: {
    name: 'ばくだん', icon: '💣', desc: 'なげると どかーん！',
    cooldown: [2.0, 1.8, 1.6, 1.4, 1.2], damage: [30, 38, 46, 58, 70], radius: [60, 70, 80, 90, 100],
  },
  aura: {
    name: 'バリア', icon: '🔵', desc: 'ちかよる てきに ダメージ',
    damage: [8, 10, 13, 16, 20], radius: [85, 95, 105, 115, 128],
  },
  gun: {
    name: 'じゅう', icon: '🔫', desc: 'まっすぐ たまを うつ',
    fire: 'bullet', shot: 'bullet', size: 22, speed: 720, spread: 0, kb: 0.1,
    cooldown: [0.85, 0.72, 0.6, 0.5, 0.42],
    damage: [18, 26, 34, 44, 56],
    count: [1, 1, 1, 1, 1],
    pierce: [1, 1, 1, 1, 1],
    life: [0.62, 0.62, 0.64, 0.66, 0.68],
    splash: [0, 0, 0, 0, 40],
  },
  shotgun: {
    name: 'ショットガン', icon: '🔫', desc: 'ひろがって とぶ たま',
    fire: 'spread', shot: 'pellet', size: 16, speed: 520, spread: 1.05, kb: 0.22,
    cooldown: [1.1, 1.0, 0.92, 0.84, 0.76],
    damage: [7, 8, 8, 9, 10],
    count: [4, 6, 8, 10, 12],
    pierce: [1, 1, 1, 1, 6],
    life: [0.28, 0.32, 0.4, 0.48, 0.58],
  },
  bazooka: {
    name: 'バズーカ', icon: '🚀', desc: 'ロケットが とんで ばくはつ',
    fire: 'rocket', shot: 'rocket', size: 36, speed: 250, turn: 3.4,
    cooldown: [2.3, 2.1, 1.9, 1.75, 1.6],
    damage: [34, 62, 62, 88, 88],
    count: [1, 1, 2, 2, 3],
    radius: [68, 74, 74, 88, 96],
  },
  dual: {
    name: 'にちょう', icon: '🔫', desc: 'たまが ふたつ とんでいく',
    evolved: true, fire: 'bullet', shot: 'bullet', size: 22, speed: 740, spread: 0.28, kb: 0.12,
    cooldown: [0.34, 0.34, 0.34, 0.34, 0.34],
    damage: [32, 32, 32, 32, 32],
    count: [2, 2, 2, 2, 2],
    pierce: [1, 1, 1, 1, 1],
    life: [0.6, 0.6, 0.6, 0.6, 0.6],
    splash: [34, 34, 34, 34, 34],
  },
  gatling: {
    name: 'ガトリング', icon: '🔫', desc: 'まっすぐ どんどん うつ',
    evolved: true, fire: 'bullet', shot: 'bullet', size: 18, speed: 820, spread: 0, kb: 0.08,
    cooldown: [0.1, 0.1, 0.1, 0.1, 0.1],
    damage: [15, 15, 15, 15, 15],
    count: [1, 1, 1, 1, 1],
    pierce: [10, 10, 10, 10, 10],
    life: [0.75, 0.75, 0.75, 0.75, 0.75],
  },
  // gift: レベルアップの カードには でない。けんきゅうしゃから もらう ぶき（もらったら さいだいレベル）
  supermissile: {
    name: 'スーパーミサイル', icon: '🚀', desc: 'けんきゅうしゃの いちばん つよい ミサイル',
    gift: true, fire: 'rocket', shot: 'smissile', size: 64, speed: 210, turn: 3.6,
    cooldown: [3.2, 3.2, 3.2, 3.2, 3.2],
    damage: [380, 380, 380, 380, 380],
    count: [1, 1, 1, 1, 1],
    radius: [155, 155, 155, 155, 155],
  },
  mega: {
    name: 'でかロケット', icon: '🚀', desc: 'おおきな ロケットが ばくはつ',
    evolved: true, fire: 'rocket', shot: 'mega', size: 52, speed: 230, turn: 2.8,
    cooldown: [1.45, 1.45, 1.45, 1.45, 1.45],
    damage: [120, 120, 120, 120, 120],
    count: [2, 2, 2, 2, 2],
    radius: [130, 130, 130, 130, 130],
  },
};

export const PASSIVES = {
  power:  { name: 'ちから',   icon: '💪', desc: 'こうげき アップ' },
  boots:  { name: 'くつ',     icon: '👟', desc: 'はやく うごける' },
  magnet: { name: 'じしゃく', icon: '🧲', desc: 'ほうせきを とおくから あつめる' },
  heart:  { name: 'ハート',   icon: '❤️', desc: 'たいりょく アップ ＆ かいふく' },
  clock:  { name: 'とけい',   icon: '⏰', desc: 'こうげきが はやくなる' },
  ammo:   { name: 'つよいたま', icon: '🔶', desc: 'こうげきアップ。たまの ぶきが しんか' },
  blast:  { name: 'ばくやく',   icon: '💥', desc: 'ばくはつアップ。バズーカが しんか' },
};

// ショップ（ずっと残る強化）
export const SHOP_ITEMS = {
  hp:  { name: 'たいりょく', icon: '❤️', desc: 'さいだいHP +10', max: 10 },
  atk: { name: 'こうげき',   icon: '⚔️', desc: 'ダメージ +5%',   max: 10 },
  spd: { name: 'はやさ',     icon: '👟', desc: 'いどう +4%',     max: 10 },
};

export function shopCost(level) { return 30 * (level + 1); }

export function weaponStat(id, key, level) {
  const list = WEAPONS[id][key];
  return list[Math.max(0, Math.min(MAX_LEVEL, level) - 1)];
}

export function xpToNext(level) { return 4 + (level - 1) * 3; }

/** パッシブとショップ強化から最終ステータスを計算 */
export function playerStats(passives = {}, shop = {}, bonus = {}) {
  const p = k => passives[k] || 0, s = k => shop[k] || 0, b = k => bonus[k] || 0;
  return {
    maxHp: 100 + p('heart') * 20 + s('hp') * 10 + b('hp'),
    damage: (1 + p('power') * 0.15) * (1 + p('ammo') * 0.1) * (1 + s('atk') * 0.05) * (1 + b('dmg')),
    speed: Math.min(260, 150 * (1 + p('boots') * 0.1) * (1 + s('spd') * 0.04) * (1 + b('spd'))),
    pickup: 90 * (1 + p('magnet') * 0.3) * (1 + b('pickup')),
    cooldown: Math.max(0.5, 1 - p('clock') * 0.08),
    regen: b('regen'),
    boom: 1 + p('blast') * 0.12,
  };
}

/** 経過時間に応じた湧き方 */
export function spawnPlan(t, difficulty = DIFFICULTIES.normal, stage = STAGES[0]) {
  const weights = {};
  for (const [type, from, w] of stage.enemies) if (t >= from) weights[type] = (weights[type] || 0) + w;
  const interval = Math.max(0.22, 1.0 - t * 0.0026) / difficulty.spawn / (stage.spawnMul || 1);
  const batch = 1 + Math.floor(t / 100);
  // ステージの かたさは さいしょ 4わり → 2ふん24びょうで ぜんぶ（レベル1の じょばんで つまらないように）
  const stageHp = 1 + (stage.hpMul - 1) * Math.min(1, 0.4 + t / 240);
  const hpScale = (1 + t / 200) * difficulty.enemyHp * stageHp;
  return { weights, interval, batch, hpScale };
}

export function pickWeighted(weights, rnd = Math.random) {
  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rnd() * total;
  for (const [k, w] of entries) { if ((r -= w) < 0) return k; }
  return entries[entries.length - 1][0];
}

function choiceWeight(item, weapons) {
  return item.kind === 'weapon' && !(weapons[item.id] > 0) ? 3 : 1;
}

/** レベルアップ時の3択。
 *  じゅう系をまだ持っていない最初の1回は、じゅう・ショットガン・バズーカだけ出す。
 *  進化できるときはそのカードを必ず1枚混ぜる。持っていない武器は出やすい。
 */
export function upgradeChoices(weapons, passives, rnd = Math.random, count = 3) {
  const ownsGun = GUNS.some(id => weapons[id] > 0)
    || Object.values(EVOLUTIONS).some(e => weapons[e.into] > 0);
  if (!ownsGun) return GUNS.slice(0, count).map(id => ({ kind: 'weapon', id, level: 1 }));

  const evos = [];
  for (const [from, evo] of Object.entries(EVOLUTIONS)) {
    if ((weapons[from] || 0) >= MAX_LEVEL && (passives[evo.need] || 0) >= 1 && !(weapons[evo.into] > 0)) {
      evos.push({ kind: 'evolve', id: evo.into, from, level: MAX_LEVEL });
    }
  }
  const pool = [];
  for (const id of Object.keys(WEAPONS)) {
    if (WEAPONS[id].evolved || WEAPONS[id].gift) continue;
    const lv = weapons[id] || 0;
    if (lv < MAX_LEVEL) pool.push({ kind: 'weapon', id, level: lv + 1 });
  }
  for (const id of Object.keys(PASSIVES)) {
    const lv = passives[id] || 0;
    if (lv < MAX_LEVEL) pool.push({ kind: 'passive', id, level: lv + 1 });
  }

  const picks = [];
  if (evos.length) picks.push(evos[Math.floor(rnd() * evos.length)]);
  const left = [...pool];
  while (picks.length < count && left.length) {
    const total = left.reduce((s, item) => s + choiceWeight(item, weapons), 0);
    let r = rnd() * total, idx = left.length - 1;
    for (let i = 0; i < left.length; i++) {
      r -= choiceWeight(left[i], weapons);
      if (r < 0) { idx = i; break; }
    }
    picks.push(left.splice(idx, 1)[0]);
  }
  if (picks.length < count) picks.push({ kind: 'food', id: 'meat', level: 0 });
  if (picks.length < count) picks.push({ kind: 'coin', id: 'coin', level: 0 });
  return picks;
}

const emptyGear = () => ({
  inv: Object.fromEntries(Object.keys(GEAR_SLOTS).map(k => [k, RARITIES.map(() => 0)])),
  equip: Object.fromEntries(Object.keys(GEAR_SLOTS).map(k => [k, -1])),
});

// カメラの ズーム（2ほんゆびで ピンチ／PCは ホイール）。ちいさいほど ひろく みえる
export const ZOOM_MIN = 0.6, ZOOM_MAX = 1.4;
export function clampZoom(z) {
  z = Number(z);
  if (!Number.isFinite(z) || z <= 0) return 1;
  return Math.round(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z)) * 1000) / 1000;
}
/** ピンチ：はじめの ズームに ゆびの きょりの ひを かける */
export function pinchZoom(startZoom, startDist, dist) {
  if (!(startDist > 0) || !(dist > 0)) return clampZoom(startZoom);
  return clampZoom(startZoom * dist / startDist);
}
/** ホイール：したに まわすと ひろく（ズームアウト） */
export function wheelZoom(z, deltaY) {
  return clampZoom(clampZoom(z) * Math.exp(-(Number(deltaY) || 0) * 0.0015));
}

export function defaultSave() {
  return {
    coins: 0, shop: { hp: 0, atk: 0, spd: 0 }, character: 'cat', difficulty: 'easy', stage: 1,
    bestKills: 0, clears: 0, stageClears: {}, pendingChests: 0, gear: emptyGear(), zoom: 1,
  };
}

export function normalizeSave(raw) {
  const base = defaultSave();
  if (!raw || typeof raw !== 'object') return base;
  const s = {
    ...base, ...raw,
    coins: Math.max(0, Math.floor(Number(raw.coins) || 0)),
    pendingChests: Math.max(0, Math.floor(Number(raw.pendingChests) || 0)),
    shop: { ...base.shop, ...(raw.shop || {}) },
    stageClears: { ...(raw.stageClears || {}) },
    gear: emptyGear(),
    zoom: clampZoom(raw.zoom ?? 1),
  };
  // まえの バージョン（ステージ1しか なかった）で クリアしていたら ステージ1 クリアあつかい
  if (!raw.stageClears && raw.clears > 0) s.stageClears[1] = raw.clears;
  for (const slot of Object.keys(GEAR_SLOTS)) {
    const inv = raw.gear?.inv?.[slot];
    if (Array.isArray(inv)) s.gear.inv[slot] = RARITIES.map((_, i) => Math.max(0, Math.floor(inv[i] || 0)));
    const e = raw.gear?.equip?.[slot];
    s.gear.equip[slot] = Number.isInteger(e) && e >= 0 && e < RARITIES.length ? e : -1;
  }
  const ch = CHARACTERS.find(c => c.id === raw.character);
  s.character = ch && charUnlocked(s, ch) ? ch.id : base.character;
  s.difficulty = DIFFICULTIES[raw.difficulty] ? raw.difficulty : base.difficulty;
  s.stage = STAGES.some(st => st.id === raw.stage) && stageUnlocked(s, raw.stage) ? raw.stage : 1;
  return s;
}

/** けんきゅうしゃに さわった とき：おくりものの ぶきを さいだいレベルで もらう。もらった ぶきの id を かえす */
export function receiveGift(weapons, stageDef) {
  const id = stageDef?.researcher?.gift;
  if (!id || !WEAPONS[id]) return null;
  weapons[id] = MAX_LEVEL;
  return id;
}

/* ---------- かるい モード（じどう がしつ） ----------
 * 1フレームの じかん（ms）を なめらかに して、おもい（24ms こえ ≒ 40fps いか）が つづいたら lite に する。
 * もどすのは かるい（19ms みまん）が hold びょう つづいた とき。もどって また おもく なったら hold を 2ばいに（いったり きたり しない）。
 * 250ms いじょうの フレーム（タブを もどした とき など）は かぞえない。 */
export const QUALITY = { enterMs: 24, exitMs: 19, hold: 3, maxHold: 24 };
export function newQuality() { return { ema: 16.7, lite: false, calm: 0, hold: QUALITY.hold, enters: 0 }; }
export function adaptQuality(q, ms) {
  if (!(ms > 0) || ms > 250) return q;
  q.ema += (ms - q.ema) * 0.1;
  if (!q.lite) {
    if (q.ema > QUALITY.enterMs) {
      q.lite = true; q.calm = 0;
      if (q.enters++ > 0) q.hold = Math.min(QUALITY.maxHold, q.hold * 2);
    }
  } else if (q.ema < QUALITY.exitMs) {
    q.calm += ms / 1000;
    if (q.calm >= q.hold) { q.lite = false; q.calm = 0; }
  } else q.calm = 0;
  return q;
}

/* ---------- けんきゅうじょの ばくだん と ひ ----------
 * ばくだんなげへいは keep の きょりで とまり、range いないなら cd びょうごとに なげる（flight びょうで おちる。おちる ばしょに しるし）。
 * ばくはつ（blast）に いたら dmg。おちた ところに ひ（life びょう）。ひは r0 → r1 に ひろがり、なかに いると まいびょう dps。
 * ひが できると gatherChance で ばくはへいが gatherMin〜gatherMax にん あつまる（ひの あつまりで できた ばくはへいは gatherCap にんまで）。 */
export const THROW = {
  keep: 210, range: 330, cd: 4.2, firstCd: 2.2, flight: 1.15, blast: 44, dmg: 10,
  fireLife: 4.5, fireR0: 24, fireR1: 54, fireGrow: 1.2, fireDps: 6, maxFires: 6, maxBombs: 6,
  gatherChance: 0.45, gatherMin: 2, gatherMax: 3, gatherCap: 9, gatherType: 'mummy',
};
/** ひの おおきさ（age びょう めの はんけい。さいごの 0.6びょうで ちいさく なる） */
export function fireRadius(age, T = THROW) {
  if (age < 0 || age >= T.fireLife) return 0;
  const grow = Math.min(1, age / T.fireGrow);
  const r = T.fireR0 + (T.fireR1 - T.fireR0) * (1 - (1 - grow) ** 2);
  const fade = Math.min(1, (T.fireLife - age) / 0.6);
  return r * (0.6 + 0.4 * fade);
}
/** cap の ある てき（ばくだんなげへい）が もう いっぱい なら、ステージの さいしょの てきに かえる */
export function capType(type, counts, stage = STAGES[0]) {
  const cap = ENEMY_TYPES[type]?.cap;
  if (!cap || (counts[type] || 0) < cap) return type;
  return stage.enemies[0][0];
}
/** ひから あつまる ばくはへいの かず（いまの あつまり にんずう alive。cap を こえない） */
export function gatherCount(alive, rnd = Math.random, T = THROW) {
  if (rnd() >= T.gatherChance) return 0;
  const n = T.gatherMin + Math.floor(rnd() * (T.gatherMax - T.gatherMin + 1));
  return Math.max(0, Math.min(n, T.gatherCap - alive));
}

/* ---------- こわせる ボトル ----------
 * hp かいで われる（たま・ばくはつ・ほし・バリア。てきの ばくだんでは われない）。
 * うちゅうじん いりは alien が とびだす。からっぽは ほうせき（gem）。 */
export const BOTTLE = { hp: 3, r: 20, cy: -30, emptyGem: 2, aimRange: 340, orbitGap: 0.45 };
export function bottleOutcome(kind) {
  if (kind === 'alien') return { alien: true, gem: 0 };
  if (kind === 'capsule') return { alien: false, gem: BOTTLE.emptyGem };
  return null; // わられた ボトル・はた は こわせない
}

/* ---------- けんきゅうじょの コンテナと なかま ----------
 * コンテナ：at びょうで プレイヤーから dist0〜dist1 はなれた ところに 1つ。さわると ひらく（openR）。
 * なかから けんきゅうしゃ（スーパーミサイルを くれて、コンテナの そばに のこる）・ちりょうたい 1・ぶたいの なかま 3。
 * なかまは むてき（たおれない・てきを ふさがない）。じぶんの まわりに ならんで、ちかくの てきを うつ。
 * ちりょうたいは うしろに ついて くる。ふえ（ボタン／F キー）で はしって きて、healTime びょうで さいだいHP の healPct かいふく。 */
export const SQUAD = {
  dist0: 650, dist1: 900, openR: 62,
  soldiers: 3, slotDist: 58, slotAngles: [125, -125, 180], medicDist: 104,
  speed: 230, range: 340, cd: 0.9, dmg: 7, bulletSpeed: 520, life: 0.75,
  medicRun: 340, healTime: 2, healPct: 0.4, whistleCd: 24,
};
/** なかまの だんがんの ダメージ（じかんで すこし つよく。プレイヤーの こうげき ばいりつも のる） */
export function allyDamage(t, playerDamage = 1, S = SQUAD) { return S.dmg * (1 + t / 240) * playerDamage; }
/** ならぶ ばしょ（すすむ むき heading の うしろ に ひろがる）。i < soldiers は へいたい、i === soldiers は ちりょうたい */
export function squadSlot(i, heading, S = SQUAD) {
  const medic = i >= S.soldiers;
  const a = heading + (medic ? Math.PI : S.slotAngles[i] * Math.PI / 180);
  const d = medic ? S.medicDist : S.slotDist;
  return { x: Math.cos(a) * d, y: Math.sin(a) * d };
}
/** ふえ：ちりょうたいが いて、クールダウンが おわって いれば ふける */
export function canWhistle(medic, cd) { return !!medic && cd <= 0; }
/** ちりょうの かいふくりょう（dt びょうぶん） */
export function healAmount(maxHp, dt, S = SQUAD) { return maxHp * S.healPct / S.healTime * dt; }
