import {heroGrowth} from './hero-rules.js?v=302';
import {attributeFamily} from './unit-attributes.js?v=298';
/** HP成長（被弾）と武器マスタリーの計算ヘルパー。毎フレーム割当なし。 */

export const MELEE_STYLES = ['sword', 'spear', 'hammer', 'axe', 'staff', 'wand'];
export const RANGED_STYLES = ['bow', 'crossbow', 'cannon'];
export const WEAPON_STYLES = [...MELEE_STYLES, ...RANGED_STYLES];
// v6.3.0: axes and hammers are separate weapon kinds (own favourite and mastery track).
// They still share the heavy combat profile (reach, sweet spot, knockback).
export const MASTERY_STYLES = [...WEAPON_STYLES];
export const weaponCategoryOf = value => {
  const style = typeof value === 'string' ? value : value?.weaponStyle;
  return style || 'sword';
};
/** Combat family: axes swing like hammers (shared reach / sweet spot), everything else is itself. */
export const combatFamilyOf = value => { const style = weaponCategoryOf(value); return style === 'axe' ? 'hammer' : style; };
export const isHeavyWeaponStyle = value => combatFamilyOf(value) === 'hammer';
// v7.0.15 removed the hidden damage multipliers (soldier x2.2, spear x1.15, hammer/axe x1.35, holy sword x1.8). v7.0.18 withdrew the
// provisional ATK compensation that v7.0.15 had put into the base coefficients. Weapon strength is carried by base weapon ATK DATA
// (WEAPON_BASE_ATK_COEF below), never by a factor buried in a damage formula. The v6.2.0 generation-time hammer x7 / axe x3 is no
// longer a formula step; it survives only as LEGACY data so that pre-v6.2 saves can still be converted exactly once.
export const HEAVY_ATTACK_VERSION = 2, LEGACY_HEAVY_ATTACK_MULT = 10;
export const legacyHeavyAttackMult = value => {
  const style = typeof value === 'string' ? value : value?.weaponStyle;
  return style === 'axe' ? 3 : style === 'hammer' ? 7 : 1;
};
/**
 * Base weapon ATK coefficient: stats.atk = floor(baseValue * tier.mult * (1 + 0.25*upgrade) * coef * rollMult).
 * This is DATA (no compensation): the same effective weapon ATK as v7.0.14, where hammer/axe carried x7/x3 as a generation-time step.
 *   sword 1.8  spear 1.6  hammer 17.15 (=2.45x7)  axe 7.35 (=2.45x3)  bow 1.05  crossbow 2.40  cannon 3.15  staff 0.35  wand 0.16
 * (Because hammer/axe are now one floor() instead of floor() then x7/x3, a fresh hammer/axe is up to 6/2 ATK higher than v7.0.14.)
 * The old x2.2 soldier physical multiplier, spear x1.15 and hammer/axe x1.35 no longer exist.
 *
 * WEAPON_BASE_ATK_VERSION (item.weaponBaseAtkVersion) says which data a stored weapon ATK was built with:
 *   undefined / <3  v7.0.14-or-older data  -> same as 4, only stamped (ATK is never raised or lowered)
 *   3 = WITHDRAWN_COMPENSATED_ATK_VERSION   v7.0.15-17 compensated data (sword 4.32 ...) -> converted back once
 *   4 = current     this table
 */
export const WEAPON_BASE_ATK_VERSION = 4, WITHDRAWN_COMPENSATED_ATK_VERSION = 3;
export const WEAPON_BASE_ATK_COEF = Object.freeze({
  sword: 1.8, spear: 1.6, hammer: 17.15, axe: 7.35,
  bow: 1.05, crossbow: 2.40, cannon: 3.15,
  staff: 0.35, wand: 0.16
});
export const weaponBaseAtkCoef = value => WEAPON_BASE_ATK_COEF[weaponCategoryOf(value)] ?? 1;
/** Revelation (hero-party) weapons are built from a flat 1600 recipe: the same DATA (v7.0.14 had sword x1.8, hammer x7, axe x3 here). */
export const HERO_WEAPON_BASE_ATK_COEF = Object.freeze({sword: 1.8, hammer: 7, axe: 3});
/** Withdrawn v7.0.15-17 compensation factors. Used ONLY to undo a version-3 weapon that cannot be rebuilt from its tier. */
export const WITHDRAWN_COMPENSATION_FACTOR = Object.freeze({sword: 2.4, spear: 2.7, hammer: 3.4, axe: 3.0, bow: 2.6, crossbow: 2.37, cannon: 2.33});

export const WEAPON_STYLE_LABELS = {
  sword: '剣', spear: '槍', hammer: '鎚', axe: '斧',
  bow: '弓', crossbow: 'クロスボウ', cannon: '火砲',staff:'杖',wand:'ワンド'
};
export const WEAPON_STYLE_ICONS = {
  sword: '🗡️', spear: '🔱', hammer: '🔨', axe: '🪓',
  bow: '🏹', crossbow: '🎯', cannon: '💣',staff:'🪄',wand:'🔮'
};

/** 被弾鍛錬は割合ではなく絶対値。受けた攻撃の強さ（防御・軽減・結界で減らす前のダメージ）×係数だけ最大HP（重装はDEFも）が上限なしで増える。 */
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
  axe: 1.35,
  bow: 1.70,
  crossbow: 2.35,
  cannon: 3.10,staff:1,wand:1
};

/** スタイル別1ヒットあたりの熟練度XP */
export function masteryGainForStyle(style, base = MASTERY_GAIN_PER_HIT) {
  const mult = MASTERY_GAIN_MULT[weaponCategoryOf(style)] ?? 1;
  return (Number(base) || MASTERY_GAIN_PER_HIT) * mult;
}


export function emptyMastery() {
  return Object.fromEntries(MASTERY_STYLES.map(style=>[style,0]));
}

export function normalizeMastery(map) {
  const m = emptyMastery();
  if (!map || typeof map !== 'object') return m;
  for (const style of MASTERY_STYLES) {
    const v = Number(map[style]);
    m[style] = Number.isFinite(v) && v > 0 ? v : 0;
  }
  // Saves from v5.3-v6.2 merged axe practice into the hammer track and stored no axe key:
  // the axe track starts from that shared value, so nobody loses progress.
  if (!Object.prototype.hasOwnProperty.call(map, 'axe')) m.axe = m.hammer;
  return m;
}

export function isRangedStyle(style) {
  return RANGED_STYLES.includes(style);
}

export function isMeleeStyle(style) {
  return MELEE_STYLES.includes(style);
}

/** 被弾鍛錬（絶対値・上限なし・逓減なし）。敵の攻撃が奥ほど強いので成長量も自然に増える。
 *  基準は「防御で減らす前の攻撃の強さ」（敵ATK・スキル倍率は反映済み／受け手のDEF・軽減・結界・肩代わりは未反映）。
 *  防御が高くても成長は鈍らず、自分の最大HP・現在HPでも頭打ちにしない。
 *  HP: 攻撃の強さ × 0.003。DEF（重装のみ）: 攻撃の強さ × 0.0105（ユーザー判断で当初案の30倍）。小数で保持し、反映は切り捨て。
 *  v7.0.5: 基準を「失ったHP」から「防御前の攻撃の強さ」へ変更し、係数も付け直した（旧 HP 0.006 / DEF 0.0015 は失ったHP基準）。 */
export const HIT_HP_PER_DAMAGE = 0.003;
export const HIT_DEF_PER_DAMAGE = 0.0105;
/** v7.1.10: DEF from hits grows for every class. The one table of per-class factors (× HIT_DEF_PER_DAMAGE).
 *  Heavy keeps 1.0 (0.0105). Front-line melee (light infantry, commander, hero) ~0.55,
 *  shooters 0.3, healers and mages 0.25. Families come from unit-attributes (advanced and limited classes map to these). */
export const HIT_DEF_CLASS_FACTORS = Object.freeze({ HEAVY: 1, LIGHT: 0.55, COMMANDER: 0.55, ARCHER: 0.3, MEDIC: 0.25, MAGE: 0.25 });
export const hitDefGrowthFactor = unit => HIT_DEF_CLASS_FACTORS[attributeFamily(unit)] ?? HIT_DEF_CLASS_FACTORS.LIGHT;
/** セーブ全体の印。2 未満（無い）セーブは読込時に一度だけ旧係数ぶんの積み上げを換算する。保存時は必ず 2 を書く。 */
export const HIT_GROWTH_SCALE = 2;
export const HIT_GROWTH_LEGACY_HP_MULT = 3.5;
export const HIT_GROWTH_LEGACY_DEF_MULT = 50;
export const hitGrowthHpOf = unit => Math.max(0, Number(unit?.hitGrowthHp) || 0);
export const hitGrowthDefOf = unit => Math.max(0, Number(unit?.hitGrowthDef) || 0);
export const hitGrowthHpBonus = unit => Math.floor(hitGrowthHpOf(unit));
export const hitGrowthDefBonus = unit => Math.floor(hitGrowthDefOf(unit));
const HIT_DEF_LEGACY_RATIO = 0.375;

/** 1体ぶんの積み上げ（hitGrowthHp / hitGrowthDef）を旧係数→新係数へ換算する。印の管理は呼び出し側。 */
export function scaleUnitHitGrowth(unit) {
  if (!unit || typeof unit !== 'object') return unit;
  if (Number(unit.hitGrowthHp) > 0) unit.hitGrowthHp = unit.hitGrowthHp * HIT_GROWTH_LEGACY_HP_MULT;
  if (Number(unit.hitGrowthDef) > 0) unit.hitGrowthDef = unit.hitGrowthDef * HIT_GROWTH_LEGACY_DEF_MULT;
  return unit;
}

/** 酒場の待機兵・名簿（未加入）の積み上げを換算。 */
export function scaleTavernHitGrowth(taverns) {
  if (!taverns) return taverns;
  for (const u of taverns.waiting || []) scaleUnitHitGrowth(u);
  for (const p of taverns.roster?.people || []) if (!p?.joined) scaleUnitHitGrowth(p?.unit);
  return taverns;
}

/**
 * セーブデータ全体の被弾成長を換算する（読込の入口で1回）。印 hitGrowthScale が 2 以上なら何もしない。
 * 換算したら saved.hitGrowthScale = 2 にする（同じオブジェクトを再度渡しても二重に掛からない）。
 * 対象: 隊長 / 本隊・直属 / 予備 / スカウト候補 / 勇者パーティ / 商人の護衛 / 門衛 / 酒場 / 限定仲間の候補。
 * @returns {boolean} 換算した
 */
export function migrateSaveHitGrowth(saved) {
  if (!saved || typeof saved !== 'object' || Number(saved.hitGrowthScale) >= HIT_GROWTH_SCALE) return false;
  scaleUnitHitGrowth(saved.player);
  for (const u of saved.squad || []) scaleUnitHitGrowth(u);
  for (const u of saved.reserves || []) scaleUnitHitGrowth(u);
  for (const c of saved.scoutCandidates || []) scaleUnitHitGrowth(c?.soldier);
  for (const u of saved.heroJourney?.party?.members || []) scaleUnitHitGrowth(u);
  for (const m of saved.merchants || []) for (const e of m?.escorts || []) scaleUnitHitGrowth(e);
  for (const g of saved.gateGuards || []) scaleUnitHitGrowth(g);
  scaleTavernHitGrowth(saved.taverns);
  for (const e of saved.limitedAllies?.encounters || []) if (!e?.joined) scaleUnitHitGrowth(e?.unit);
  saved.hitGrowthScale = HIT_GROWTH_SCALE;
  return true;
}

/** 旧セーブ（割合 hitGrowthPct）を一度だけ絶対値へ。hpBase/defBase = 旧式が掛けていた被弾前の値。 */
export function migrateHitGrowth(unit, hpBase, defBase = 0, heavy = false) {
  if (!unit) return unit;
  const pct = Math.max(0, Number(unit.hitGrowthPct) || 0);
  if (pct > 0 && !(hitGrowthHpOf(unit) > 0)) {
    unit.hitGrowthHp = Math.round(pct * Math.max(0, Number(hpBase) || 0));
    if (heavy && !(hitGrowthDefOf(unit) > 0)) unit.hitGrowthDef = Math.round(pct * HIT_DEF_LEGACY_RATIO * Math.max(0, Number(defBase) || 0));
  }
  if (unit.hitGrowthPct != null) delete unit.hitGrowthPct;
  if (unit.hitGrowthHp == null) unit.hitGrowthHp = 0;
  if (unit.hitGrowthDef == null) unit.hitGrowthDef = 0;
  return unit;
}

/** 通知の節目: HP+100刻み（1000以上は1000刻み、10000以上は10000刻み）。 */
const hitMilestone = value => value < 1000 ? 100 : value < 10000 ? 1000 : 10000;

/**
 * 被弾時の「防御で減らす前の攻撃の強さ」(strength)に応じて最大HP（heavy=trueならDEFも）を絶対値で増やす。
 * @returns {{gain:number, defGain:number, changed:boolean, crossed:number|null}}
 *   changed = 反映値（切り捨て後）が変わった / crossed = 新たに跨いだHP成長の節目
 */
export function applyHitGrowth(unit, strength, defFactor = 0) {
  if (!unit || !(strength > 0)) return { gain: 0, defGain: 0, changed: false, crossed: null };
  const factor = heroGrowth(unit);
  // defFactor: per-class factor from HIT_DEF_CLASS_FACTORS (true = 1, the heavy rate; false/omitted = no DEF).
  const defMult = defFactor === true ? 1 : Math.max(0, Number(defFactor) || 0);
  const beforeHp = hitGrowthHpOf(unit), beforeDef = hitGrowthDefOf(unit);
  const gain = strength * HIT_HP_PER_DAMAGE * factor;
  const defGain = defMult > 0 ? strength * HIT_DEF_PER_DAMAGE * defMult * factor : 0;
  if (gain <= 0) return { gain: 0, defGain: 0, changed: false, crossed: null };
  const afterHp = beforeHp + gain, afterDef = beforeDef + defGain;
  unit.hitGrowthHp = afterHp;
  if (defGain > 0) unit.hitGrowthDef = afterDef;
  const step = hitMilestone(beforeHp);
  const crossed = Math.floor(afterHp / step) > Math.floor(beforeHp / step) ? Math.floor(afterHp / step) * step : null;
  const changed = Math.floor(afterHp) !== Math.floor(beforeHp) || Math.floor(afterDef) !== Math.floor(beforeDef);
  return { gain, defGain, changed, crossed };
}

export function masteryAtkMult(masteryMap, style) {
  const key = WEAPON_STYLES.includes(style) ? weaponCategoryOf(style) : 'sword';
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
    out.splash = (Number(out.splash) || 62) * masterySplashMult(masteryMap, style);
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
  style=weaponCategoryOf(style);
  if (!unit.weaponMastery) unit.weaponMastery = emptyMastery();
  else unit.weaponMastery = normalizeMastery(unit.weaponMastery);
  const before = unit.weaponMastery[style] || 0;
  unit.weaponMastery[style] = before + add * heroGrowth(unit);
  return unit.weaponMastery[style];
}

// v6.3.0: the former hammer share is split between hammer and axe.
const FAVORITE_WEIGHTS = {
  HEAVY: { sword: 28, spear: 24, hammer: 26, axe: 22 },
  PALADIN: { sword: 32, spear: 22, hammer: 26, axe: 20 },
  LIGHT: { sword: 52, spear: 32, hammer: 8, axe: 8 },
  BLADEMASTER: { sword: 68, spear: 22, hammer: 5, axe: 5 },
  ARCHER: { bow: 52, crossbow: 33, cannon: 15 },
  SNIPER: { bow: 28, crossbow: 47, cannon: 25 },
  MEDIC: { staff:65,wand:35 },HIGH_PRIEST: { staff:65,wand:35 },
  SAINT:{staff:65,wand:35},ARCHANGEL:{staff:65,wand:35},
  MAGE:{staff:35,wand:65},ARCHMAGE:{staff:35,wand:65},ELEMENTAL_SAGE:{staff:35,wand:65},ARCANE_SOVEREIGN:{staff:35,wand:65},
  COMMANDER: { sword: 34, spear: 22, hammer: 12, axe: 10, bow: 12, crossbow: 6, cannon: 4 },
  WARLORD: { sword: 30, spear: 20, hammer: 15, axe: 13, bow: 10, crossbow: 7, cannon: 5 }
};

/** One-time split for soldiers from before v6.3.0, whose "hammer" favourite also meant axes:
 * those holding an axe now favour the axe. New soldiers are created with the flag set. */
export const FAVORITE_SPLIT_VERSION = 1;
export function splitHeavyFavorite(unit) {
  if (!unit || unit.favoriteSplit >= FAVORITE_SPLIT_VERSION) return unit;
  if (unit.favoriteWeapon === 'hammer' && weaponStyleOf(unit.equipped?.weapon || unit.weapon) === 'axe') unit.favoriteWeapon = 'axe';
  unit.favoriteSplit = FAVORITE_SPLIT_VERSION;
  return unit;
}

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
  if (r < 0.24) return 'hammer';
  if (r < 0.36) return 'axe';
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
  return weaponCategoryOf(item) === weaponCategoryOf(favorite) ? 120 : 0;
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
  if (style && WEAPON_STYLES.includes(style) && !(style === 'sword' && /弓|クロスボウ|石弓|火砲|大砲|砲|杖|ワンド|斧/.test(name))) {
    return item;
  }
  if (/ワンド/.test(name)) item.weaponStyle='wand';
  else if (/杖/.test(name))item.weaponStyle='staff';
  else if (/火砲|大砲|砲|カノン/.test(name)) item.weaponStyle = 'cannon';
  else if (/クロスボウ|石弓/.test(name)) item.weaponStyle = 'crossbow';
  else if (/弓/.test(name)) item.weaponStyle = 'bow';
  else if (/槍|矛|鉾/.test(name)) item.weaponStyle = 'spear';
  else if (/斧|アックス/.test(name)) item.weaponStyle = 'axe';
  else if (/鎚|ハンマー|戦鎚|大鎚/.test(name)) item.weaponStyle = 'hammer';
  else if (!style || !WEAPON_STYLES.includes(style)) item.weaponStyle = 'sword';
  return item;
}
