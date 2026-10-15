/**
 * カラー・アント アップグレード＆進行状況管理
 */

export const COLOR_UNLOCK_ORDER = [
  { group: 'green', name: 'みどりアリ', icon: '🟢', cost: 100 },
  { group: 'yellow', name: 'きいろアリ', icon: '🟡', cost: 300 },
  { group: 'blue', name: 'あおアリ', icon: '🔵', cost: 700 },
  { group: 'purple', name: 'むらさきアリ', icon: '🟣', cost: 1500 },
  { group: 'rainbow', name: 'にじいろアリ', icon: '🌈', cost: 3500 },
];

export const UPGRADE_DEFS = {
  count: {
    name: 'アリの数',
    icon: '🐜',
    baseCost: 20,
    costMult: 1.4,
    calcValue: (lvl) => 3 + (lvl - 1) * 2, // Lv1: 3匹, Lv2: 5匹...
    maxLevel: 30,
  },
  speed: {
    name: 'いどう速度',
    icon: '⚡',
    baseCost: 30,
    costMult: 1.35,
    calcValue: (lvl) => 70 + (lvl - 1) * 12, // px/sec
    maxLevel: 25,
  },
  power: {
    name: 'あごの力',
    icon: '🍽️',
    baseCost: 50,
    costMult: 1.5,
    calcValue: (lvl) => 1 + (lvl - 1) * 0.5, // 1咬みあたりの削り量
    maxLevel: 20,
  },
  giant: {
    name: 'ジャイアント',
    icon: '👑',
    baseCost: 250,
    costMult: 2.0,
    calcValue: (lvl) => (lvl === 0 ? 0 : 0.08 + (lvl - 1) * 0.04), // 巨大アリ出現確率
    maxLevel: 5,
  },
};

export function getUpgradeCost(key, level) {
  const def = UPGRADE_DEFS[key];
  if (!def || level >= def.maxLevel) return Infinity;
  return Math.floor(def.baseCost * Math.pow(def.costMult, level - 1));
}

export function defaultSaveData() {
  return {
    coins: 0,
    stageIndex: 0,
    upgrades: {
      count: 1,
      speed: 1,
      power: 1,
      giant: 0,
    },
    unlockedColors: ['red'],
  };
}

export function normalizeSave(data) {
  const def = defaultSaveData();
  if (!data || typeof data !== 'object') return def;
  return {
    coins: typeof data.coins === 'number' && data.coins >= 0 ? Math.floor(data.coins) : 0,
    stageIndex: typeof data.stageIndex === 'number' && data.stageIndex >= 0 ? data.stageIndex : 0,
    upgrades: {
      count: Math.min(UPGRADE_DEFS.count.maxLevel, Math.max(1, data.upgrades?.count || 1)),
      speed: Math.min(UPGRADE_DEFS.speed.maxLevel, Math.max(1, data.upgrades?.speed || 1)),
      power: Math.min(UPGRADE_DEFS.power.maxLevel, Math.max(1, data.upgrades?.power || 1)),
      giant: Math.min(UPGRADE_DEFS.giant.maxLevel, Math.max(0, data.upgrades?.giant || 0)),
    },
    unlockedColors: Array.isArray(data.unlockedColors) && data.unlockedColors.length > 0
      ? data.unlockedColors
      : ['red'],
  };
}
