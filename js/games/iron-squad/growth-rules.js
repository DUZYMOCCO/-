import {heroGrowth} from './hero-rules.js';
/** HP成長（被弾）と武器マスタリーの計算ヘルパー。毎フレーム割当なし。 */

export const MELEE_STYLES = ['sword', 'spear', 'hammer', 'staff', 'wand'];
export const RANGED_STYLES = ['bow', 'crossbow', 'cannon'];
export const WEAPON_STYLES = [...MELEE_STYLES, ...RANGED_STYLES];

export const WEAPON_STYLE_LABELS = {
  sword: '剣', spear: '槍', hammer: '鎚',
  bow: '弓', crossbow: 'クロスボウ', cannon: '火砲',staff:'杖',wand:'ワンド'
};
export const WEAPON_STYLE_ICONS = {
  sword: '🗡️', spear: '🔱', hammer: '🔨',
  bow: '🏹', crossbow: '🎯', cannon: '💣',staff:'🪄',wand:'🔮'
};

/** 被弾HP成長: 最大+40%。重い一撃ほど伸びやすい。ソフト減衰。 */
export const HIT_GROWTH_SOFT_CAP = 0.40;
const HIT_GROWTH_BASE = 0.0052;

/** 武器マスタリー: ATK最大+35%。剣/槍/鎚=ATK+攻撃速度、弓/石弓=ATK+リロード、火砲=爆発半径+リロード。 */
export const MASTERY_SOFT_CAP = 0.35;
const MASTERY_XP_SCALE = 48;
export const MASTERY_GAIN_PER_HIT = 0.85;
/**
 * 武器別熟練度獲得倍率（攻撃速度差の補正）。
 * 剣は速撃で溜まりやすいので抑えめ、火砲・石弓は遅射なので厚め。
 * 効果（近接=ATK+攻撃速度 / 弓石弓=ATK+リロード / 火砲=爆発+リロード）は据え置き。
 */
export const MASTERY_GAIN_MULT = {
  sword: 0.72,
  spear: 1.15,
  hammer: 1.35,
  bow: 1.70,
  crossbow: 2.35,
  cannon: 3.10,staff:1,wand:1
};

/** スタイル別1ヒットあたりの熟練度XP */
export function masteryGainForStyle(style, base = MASTERY_GAIN_PER_HIT) {
  const mult = MASTERY_GAIN_MULT[style] ?? 1;
  return (Number(base) || MASTERY_GAIN_PER_HIT) * mult;
}


export function emptyMastery() {
  return Object.fromEntries(WEAPON_STYLES.map(style=>[style,0]));
}

export function normalizeMastery(map) {
  const m = emptyMastery();
  if (!map || typeof map !== 'object') return m;
  for (const style of WEAPON_STYLES) {
    const v = Number(map[style]);
    m[style] = Number.isFinite(v) && v > 0 ? v : 0;
  }
  return m;
}

export function isRangedStyle(style) {
  return RANGED_STYLES.includes(style);
}

export function isMeleeStyle(style) {
  return MELEE_STYLES.includes(style);
}

export function hitGrowthMult(unit) {
  const pct = Math.max(0, Math.min(HIT_GROWTH_SOFT_CAP, Number(unit?.hitGrowthPct) || 0));
  return 1 + pct;
}

/**
 * 被弾時に maxHP% を成長させる。
 * @returns {{gain:number, crossed:number|null}} crossed = 新たに跨いだ5%刻み（なければnull）
 */
export function applyHitGrowth(unit, dmg) {
  if (!unit || !(dmg > 0)) return { gain: 0, crossed: null };
  const maxHp = Math.max(1, unit.maxHp || 1);
  const severity = Math.max(0.05, Math.min(1, dmg / maxHp));
  const absFactor = 0.62 + Math.min(2.0, dmg / 32) * 0.38;
  const before = Math.max(0, Math.min(HIT_GROWTH_SOFT_CAP, Number(unit.hitGrowthPct) || 0));
  const room = Math.max(0, 1 - before / HIT_GROWTH_SOFT_CAP);
  const gain = HIT_GROWTH_BASE * severity * absFactor * room * heroGrowth(unit);
  if (gain <= 0) return { gain: 0, crossed: null };
  const after = Math.min(HIT_GROWTH_SOFT_CAP, before + gain);
  unit.hitGrowthPct = after;
  const beforeStep = Math.floor(before * 20);
  const afterStep = Math.floor(after * 20);
  const crossed = afterStep > beforeStep ? afterStep * 5 : null;
  return { gain, crossed };
}

export function masteryAtkMult(masteryMap, style) {
  const key = WEAPON_STYLES.includes(style) ? style : 'sword';
  const xp = Math.max(0, Number(normalizeMastery(masteryMap)[key]) || 0);
  return 1 + MASTERY_SOFT_CAP * (1 - 1 / (1 + xp / MASTERY_XP_SCALE));
}

/** マスタリー進行度 0..MASTERY_SOFT_CAP（二次軸用） */
export function masteryAxis(masteryMap, style) {
  return Math.max(0, masteryAtkMult(masteryMap, style) - 1);
}

/**
 * クールダウン短縮（攻撃速度／リロード倍率）。
 * 剣/槍/鎚=攻撃速度、弓/クロスボウ/火砲=リロード。同ソフトカーブ。
 * 熟練MAXで baseCooldown × (1 - SOFT_CAP) = ×0.65（約35%短縮）。下限0.55。
 */
export function masteryReloadMult(masteryMap, style) {
  if (!WEAPON_STYLES.includes(style)) return 1;
  return Math.max(0.55, 1 - masteryAxis(masteryMap, style));
}

/**
 * 火砲: 爆発半径拡大。熟練MAXで splash × (1 + SOFT_CAP) = ×1.35。
 */
export function masterySplashMult(masteryMap, style) {
  if (style !== 'cannon') return 1;
  return 1 + masteryAxis(masteryMap, style);
}

/** 戦闘プロファイルへ攻撃速度・リロード/爆発半径マスタリーを適用（ATKは unit.atk 側）。 */
export function applyMasteryToCombatProfile(profile, masteryMap) {
  if (!profile) return profile;
  const out = { ...profile };
  const style = out.style || 'sword';
  // 全スタイル: CD短縮（近接=攻撃速度、遠隔=リロード）。火砲は加えて splash。
  if (WEAPON_STYLES.includes(style)) {
    out.baseCooldown = (Number(out.baseCooldown) || 1) * masteryReloadMult(masteryMap, style);
  }
  if (style === 'cannon') {
    out.splash = (Number(out.splash) || 52) * masterySplashMult(masteryMap, style);
  }
  return out;
}

export function masteryPctDisplay(masteryMap, style) {
  return Math.round((masteryAtkMult(masteryMap, style) - 1) * 1000) / 10;
}

/** @returns {number} 増加後のXP */
export function gainWeaponMastery(unit, style, amount = null) {
  if (!unit || !WEAPON_STYLES.includes(style)) return 0;
  const add = amount == null ? masteryGainForStyle(style) : amount;
  if (!unit.weaponMastery) unit.weaponMastery = emptyMastery();
  else unit.weaponMastery = normalizeMastery(unit.weaponMastery);
  const before = unit.weaponMastery[style] || 0;
  unit.weaponMastery[style] = before + add * heroGrowth(unit);
  return unit.weaponMastery[style];
}

const FAVORITE_WEIGHTS = {
  HEAVY: { sword: 28, spear: 24, hammer: 48 },
  PALADIN: { sword: 32, spear: 22, hammer: 46 },
  LIGHT: { sword: 52, spear: 32, hammer: 16 },
  BLADEMASTER: { sword: 68, spear: 22, hammer: 10 },
  ARCHER: { bow: 52, crossbow: 33, cannon: 15 },
  SNIPER: { bow: 28, crossbow: 47, cannon: 25 },
  MEDIC: { staff:65,wand:35 },HIGH_PRIEST: { staff:65,wand:35 },
  SAINT:{staff:65,wand:35},ARCHANGEL:{staff:65,wand:35},
  MAGE:{staff:35,wand:65},ARCHMAGE:{staff:35,wand:65},ELEMENTAL_SAGE:{staff:35,wand:65},ARCANE_SOVEREIGN:{staff:35,wand:65},
  COMMANDER: { sword: 34, spear: 22, hammer: 22, bow: 12, crossbow: 6, cannon: 4 },
  WARLORD: { sword: 30, spear: 20, hammer: 28, bow: 10, crossbow: 7, cannon: 5 }
};

export function pickFavoriteWeapon(soldierClass, random = Math.random) {
  const weights = FAVORITE_WEIGHTS[soldierClass] || FAVORITE_WEIGHTS.HEAVY;
  const styles = WEAPON_STYLES.filter(s => (weights[s] || 0) > 0);
  const pool = styles.length ? styles : MELEE_STYLES;
  const total = pool.reduce((a, s) => a + (weights[s] || 0), 0);
  let roll = Math.min(0.999999, Math.max(0, random())) * total;
  for (const style of pool) {
    roll -= weights[style] || 0;
    if (roll < 0) return style;
  }
  return pool[0];
}

/** ドロップ用。kind: 'melee' | 'ranged' | 'any'（any=近接70%/遠隔30%） */
export function rollWeaponStyle(kind = 'any', random = Math.random) {
  if(kind==='magic')return random()<.5?'staff':'wand';
  let poolKind = kind;
  if (kind === 'any') poolKind = random() < 0.30 ? 'ranged' : 'melee';
  if (poolKind === 'ranged') {
    const r = random();
    if (r < 0.22) return 'cannon';
    if (r < 0.55) return 'crossbow';
    return 'bow';
  }
  const r = random();
  if (r < 0.12) return random()<.5?'staff':'wand';
  if (r < 0.36) return 'hammer';
  if (r < 0.68) return 'spear';
  return 'sword';
}

export function weaponStyleOf(item) {
  const style = item?.weaponStyle || 'sword';
  return WEAPON_STYLES.includes(style) ? style : 'sword';
}

/** 兵士の好み武器を優先した比較スコア補正 */
export function favoriteWeaponBias(item, favorite) {
  if (!item || item.type !== 'WEAPON') return 0;
  return weaponStyleOf(item) === favorite ? 120 : 0;
}

/** 旧セーブの弓兵が近接favoriteを持っていた場合の補正 */
export function migrateFavoriteForClass(soldierClass, favorite) {
  const rangedClass = soldierClass === 'ARCHER' || soldierClass === 'SNIPER';
  if (rangedClass && (!favorite || isMeleeStyle(favorite))) {
    return pickFavoriteWeapon(soldierClass);
  }
  if (!rangedClass && favorite && isRangedStyle(favorite)
      && soldierClass !== 'COMMANDER' && soldierClass !== 'WARLORD') {
    return pickFavoriteWeapon(soldierClass);
  }
  if (favorite && WEAPON_STYLES.includes(favorite)) return favorite;
  return pickFavoriteWeapon(soldierClass || 'HEAVY');
}

/** 名称だけ弓だった旧プレースホルダ武器を実スタイルへ */
export function migrateWeaponStyleFromName(item) {
  if (!item || item.type !== 'WEAPON') return item;
  const name = `${item.baseName || ''} ${item.name || ''}`;
  const style = item.weaponStyle;
  if (style && WEAPON_STYLES.includes(style) && !(style === 'sword' && /弓|クロスボウ|石弓|火砲|大砲|砲|杖|ワンド/.test(name))) {
    return item;
  }
  if (/ワンド/.test(name)) item.weaponStyle='wand';
  else if (/杖/.test(name))item.weaponStyle='staff';
  else if (/火砲|大砲|砲|カノン/.test(name)) item.weaponStyle = 'cannon';
  else if (/クロスボウ|石弓/.test(name)) item.weaponStyle = 'crossbow';
  else if (/弓/.test(name)) item.weaponStyle = 'bow';
  else if (/槍|矛|鉾/.test(name)) item.weaponStyle = 'spear';
  else if (/鎚|ハンマー|戦鎚|大鎚/.test(name)) item.weaponStyle = 'hammer';
  else if (!style || !WEAPON_STYLES.includes(style)) item.weaponStyle = 'sword';
  return item;
}
