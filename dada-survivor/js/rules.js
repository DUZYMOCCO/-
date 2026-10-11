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

export const CHARACTERS = [
  { id: 'cat',   name: 'ねこ',   icon: '🐱', weapon: 'kunai' },
  { id: 'dog',   name: 'いぬ',   icon: '🐶', weapon: 'orbit' },
  { id: 'fox',   name: 'きつね', icon: '🦊', weapon: 'thunder' },
  { id: 'panda', name: 'パンダ', icon: '🐼', weapon: 'bomb' },
];

export const ENEMY_TYPES = {
  zombie:   { icon: '🧟', hp: 10,   speed: 42, dmg: 8,  xp: 1, r: 16, size: 34 },
  bat:      { icon: '🦇', hp: 6,    speed: 78, dmg: 5,  xp: 1, r: 13, size: 28 },
  ghost:    { icon: '👻', hp: 20,   speed: 55, dmg: 10, xp: 2, r: 16, size: 34 },
  skull:    { icon: '💀', hp: 36,   speed: 50, dmg: 12, xp: 3, r: 17, size: 36 },
  ogre:     { icon: '👹', hp: 900,  speed: 40, dmg: 20, xp: 40, r: 38, size: 80, boss: true, name: 'おに' },
  dragon:   { icon: '🐲', hp: 3000, speed: 38, dmg: 25, xp: 0,  r: 48, size: 104, boss: true, final: true, name: 'ドラゴン' },
};

// レベル1〜5の性能。index = level-1
export const WEAPONS = {
  kunai: {
    name: 'クナイ', icon: '🗡️', desc: 'ちかくのてきに とんでいく',
    cooldown: [0.9, 0.8, 0.7, 0.6, 0.5], damage: [10, 13, 16, 19, 23], count: [1, 2, 2, 3, 4],
  },
  orbit: {
    name: 'まわるほし', icon: '⭐', desc: 'まわりを ぐるぐる まもる',
    damage: [11, 13, 15, 18, 22], count: [2, 3, 3, 4, 5], radius: [70, 75, 82, 88, 95],
  },
  thunder: {
    name: 'かみなり', icon: '⚡', desc: 'てきに かみなりを おとす',
    cooldown: [2.2, 2.0, 1.7, 1.5, 1.2], damage: [25, 32, 40, 50, 60], count: [1, 2, 2, 3, 4],
  },
  bomb: {
    name: 'ばくだん', icon: '💣', desc: 'なげると どかーん！',
    cooldown: [2.5, 2.3, 2.0, 1.8, 1.5], damage: [30, 38, 46, 58, 70], radius: [60, 70, 80, 90, 100],
  },
  aura: {
    name: 'バリア', icon: '🔵', desc: 'ちかよる てきに ダメージ',
    damage: [4, 5, 7, 9, 12], radius: [60, 70, 82, 95, 110],
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
export function playerStats(passives = {}, shop = {}) {
  const p = k => passives[k] || 0, s = k => shop[k] || 0;
  return {
    maxHp: 100 + p('heart') * 20 + s('hp') * 10,
    damage: (1 + p('power') * 0.15) * (1 + s('atk') * 0.05),
    speed: 150 * (1 + p('boots') * 0.1) * (1 + s('spd') * 0.04),
    pickup: 90 * (1 + p('magnet') * 0.3),
    cooldown: Math.max(0.5, 1 - p('clock') * 0.08),
  };
}

/** 経過時間に応じた湧き方 */
export function spawnPlan(t, difficulty = DIFFICULTIES.normal) {
  const weights = { zombie: 10, bat: t > 30 ? 6 : 0, ghost: t > 90 ? 5 : 0, skull: t > 180 ? 4 : 0 };
  const interval = Math.max(0.22, 1.0 - t * 0.0026) / difficulty.spawn;
  const batch = 1 + Math.floor(t / 100);
  const hpScale = (1 + t / 200) * difficulty.enemyHp;
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

export function defaultSave() {
  return { coins: 0, shop: { hp: 0, atk: 0, spd: 0 }, character: 'cat', difficulty: 'easy', bestKills: 0, clears: 0 };
}

export function normalizeSave(raw) {
  const base = defaultSave();
  if (!raw || typeof raw !== 'object') return base;
  return {
    ...base, ...raw,
    coins: Math.max(0, Math.floor(Number(raw.coins) || 0)),
    shop: { ...base.shop, ...(raw.shop || {}) },
    character: CHARACTERS.some(c => c.id === raw.character) ? raw.character : base.character,
    difficulty: DIFFICULTIES[raw.difficulty] ? raw.difficulty : base.difficulty,
  };
}
