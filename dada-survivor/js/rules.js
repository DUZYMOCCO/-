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
  { id: 'dog',     name: 'いぬ',       weapon: 'orbit',   perk: { hp: 30 },                trait: 'タフ' },
  { id: 'fox',     name: 'きつね',     weapon: 'thunder', perk: { dmg: 0.1 },              trait: 'つよい' },
  { id: 'panda',   name: 'パンダ',     weapon: 'bomb',    perk: { hp: 20, regen: 0.5 },    trait: 'かいふく' },
  { id: 'rabbit',  name: 'うさぎ',     weapon: 'aura',    perk: { spd: 0.2 },              trait: 'とっても はやい', unlock: 1 },
  { id: 'penguin', name: 'ペンギン',   weapon: 'kunai',   perk: { pickup: 0.5, hp: 20 },   trait: 'ほうせき あつめ', unlock: 2 },
  { id: 'bear',    name: 'くま',       weapon: 'orbit',   perk: { hp: 70 },                trait: 'すごく タフ', unlock: 3 },
  { id: 'dino',    name: 'きょうりゅう', weapon: 'bomb',  perk: { dmg: 0.25 },             trait: 'すごく つよい', unlock: 4 },
  { id: 'unicorn', name: 'ユニコーン', weapon: 'thunder', perk: { dmg: 0.15, spd: 0.1, hp: 40, regen: 0.5 }, trait: 'ぜんぶ アップ', unlock: 5 },
];

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
  // ボス（hp は ステージがわで きめる）
  ogre:     { speed: 40, dmg: 20, xp: 40, r: 38, size: 80,  name: 'おに' },
  dragon:   { speed: 38, dmg: 25, xp: 40, r: 48, size: 104, name: 'ドラゴン' },
  snake:    { speed: 46, dmg: 26, xp: 40, r: 46, size: 100, name: 'だいじゃ' },
  icegiant: { speed: 36, dmg: 28, xp: 40, r: 50, size: 110, name: 'こおりの きょじん' },
  witch:    { speed: 52, dmg: 28, xp: 40, r: 40, size: 96,  name: 'まじょ' },
  maou:     { speed: 40, dmg: 32, xp: 40, r: 52, size: 116, name: 'まおう' },
};

// enemies: [しゅるい, でてくる びょう, でやすさ]
export const STAGES = [
  { id: 1, name: 'くさはら', ground: 'grass', hpMul: 1.0, spawnMul: 1.0, dmgMul: 1.0,
    enemies: [['zombie', 0, 10], ['bat', 30, 6], ['ghost', 90, 5], ['skull', 180, 4]],
    mini: { type: 'ogre', hp: 900 }, boss: { type: 'dragon', hp: 3000 } },
  { id: 2, name: 'さばく', ground: 'desert', hpMul: 1.6, spawnMul: 1.1, dmgMul: 1.15,
    enemies: [['scorpion', 0, 10], ['bat', 30, 5], ['mummy', 90, 6], ['skull', 180, 4]],
    mini: { type: 'mummy', hp: 1600, big: 2.4, name: 'でかミイラ' }, boss: { type: 'snake', hp: 5000 } },
  { id: 3, name: 'ゆきやま', ground: 'snow', hpMul: 2.4, spawnMul: 1.2, dmgMul: 1.3,
    enemies: [['snowman', 0, 10], ['wolf', 30, 6], ['bat', 90, 4], ['skull', 180, 4]],
    mini: { type: 'wolf', hp: 2600, big: 2.4, name: 'ボスオオカミ' }, boss: { type: 'icegiant', hp: 7500 } },
  { id: 4, name: 'おばけのもり', ground: 'forest', hpMul: 3.4, spawnMul: 1.3, dmgMul: 1.45,
    enemies: [['pumpkin', 0, 10], ['ghost', 30, 7], ['bat', 90, 5], ['skull', 180, 5]],
    mini: { type: 'pumpkin', hp: 3600, big: 2.6, name: 'でかかぼちゃ' }, boss: { type: 'witch', hp: 10500 } },
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
};

export const PASSIVES = {
  power:  { name: 'ちから',   icon: '💪', desc: 'こうげき アップ' },
  boots:  { name: 'くつ',     icon: '👟', desc: 'はやく うごける' },
  magnet: { name: 'じしゃく', icon: '🧲', desc: 'ほうせきを とおくから あつめる' },
  heart:  { name: 'ハート',   icon: '❤️', desc: 'たいりょく アップ ＆ かいふく' },
  clock:  { name: 'とけい',   icon: '⏰', desc: 'こうげきが はやくなる' },
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
    damage: (1 + p('power') * 0.15) * (1 + s('atk') * 0.05) * (1 + b('dmg')),
    speed: Math.min(260, 150 * (1 + p('boots') * 0.1) * (1 + s('spd') * 0.04) * (1 + b('spd'))),
    pickup: 90 * (1 + p('magnet') * 0.3) * (1 + b('pickup')),
    cooldown: Math.max(0.5, 1 - p('clock') * 0.08),
    regen: b('regen'),
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

/** レベルアップ時の3択（まだ上げられるものから） */
export function upgradeChoices(weapons, passives, rnd = Math.random, count = 3) {
  const pool = [];
  for (const id of Object.keys(WEAPONS)) {
    const lv = weapons[id] || 0;
    if (lv < MAX_LEVEL) pool.push({ kind: 'weapon', id, level: lv + 1 });
  }
  for (const id of Object.keys(PASSIVES)) {
    const lv = passives[id] || 0;
    if (lv < MAX_LEVEL) pool.push({ kind: 'passive', id, level: lv + 1 });
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const picks = pool.slice(0, count);
  if (picks.length < count) picks.push({ kind: 'food', id: 'meat', level: 0 });
  if (picks.length < count) picks.push({ kind: 'coin', id: 'coin', level: 0 });
  return picks;
}

const emptyGear = () => ({
  inv: Object.fromEntries(Object.keys(GEAR_SLOTS).map(k => [k, RARITIES.map(() => 0)])),
  equip: Object.fromEntries(Object.keys(GEAR_SLOTS).map(k => [k, -1])),
});

export function defaultSave() {
  return {
    coins: 0, shop: { hp: 0, atk: 0, spd: 0 }, character: 'cat', difficulty: 'easy', stage: 1,
    bestKills: 0, clears: 0, stageClears: {}, pendingChests: 0, gear: emptyGear(),
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
