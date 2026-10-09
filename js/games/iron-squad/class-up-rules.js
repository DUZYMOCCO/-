/**
 * Multi-stage class-up (覚醒昇格) — v1.25.8
 * Tier0 基本職 → Tier1 上位職 → Tier2 極職 → Tier3 伝説職
 * Costs escalate; top tier needs rare 神話宝玉 (awakeningGems).
 */

/** @typedef {{ orbs: number, gems: number }} ClassUpCost */

export const CLASS_UP_COSTS = Object.freeze({
  1: { orbs: 1, gems: 0 },  // → 上位職
  2: { orbs: 3, gems: 0 },  // → 極職
  3: { orbs: 5, gems: 1 }   // → 伝説職（宝珠＋神話宝玉）
});

export const CLASS_TIER_LABELS = Object.freeze({
  0: '基本職',
  1: '上位職',
  2: '極職',
  3: '伝説職'
});

export function classTierOf(cls) {
  if (!cls) return 0;
  if (typeof cls.classTier === 'number') return cls.classTier;
  if (cls.isLegendary) return 3;
  if (cls.isMaster) return 2;
  if (cls.isAdvanced) return 1;
  return 0;
}

export function nextClassId(cls) {
  return cls?.advancedClassId || null;
}

/** 有望株＝出世頭：宝珠の消費が約3割減（四捨五入・最低1個）。神話宝玉は変えない。 */
export const TALENTED_ORB_DISCOUNT = 0.7;

export function classUpCostForNext(cls, talent = null) {
  const nextTier = classTierOf(cls) + 1;
  const base = CLASS_UP_COSTS[nextTier] || null;
  if (!base || talent !== 'TALENTED' || !(base.orbs > 0)) return base;
  return { ...base, orbs: Math.max(1, Math.round(base.orbs * TALENTED_ORB_DISCOUNT)) };
}

export function canAffordClassUp(orbs, gems, cost) {
  if (!cost) return false;
  return (orbs || 0) >= (cost.orbs || 0) && (gems || 0) >= (gemsNeeded(cost));
}

function gemsNeeded(cost) {
  return cost.gems || 0;
}

export function formatClassUpCostJa(cost) {
  if (!cost) return '';
  const parts = [];
  if (cost.orbs > 0) parts.push(`覚醒宝珠💎×${cost.orbs}`);
  if (cost.gems > 0) parts.push(`神話宝玉💠×${cost.gems}`);
  return parts.join(' ＋ ') || '無料';
}

export function classUpShortageJa(orbs, gems, cost) {
  if (!cost) return 'これ以上の覚醒段階はありません';
  const lack = [];
  if ((orbs || 0) < cost.orbs) lack.push(`覚醒宝珠があと${cost.orbs - (orbs || 0)}個`);
  if ((gems || 0) < (cost.gems || 0)) lack.push(`神話宝玉があと${(cost.gems || 0) - (gems || 0)}個`);
  return lack.length
    ? `クラスアップには ${formatClassUpCostJa(cost)} が必要です！\n（不足: ${lack.join('、')}）\n遠方ボス・超巨頭から入手できます`
    : '';
}

/** Player commander stages: 隊長 → 覇王 → 帝皇 → 神話帝 */
export const PLAYER_CLASS_STAGES = Object.freeze([
  { id: null, name: '隊長', tier: 0 },
  { id: 'WARLORD', name: '覇王ウォーロード', tier: 1, icon: '👑🔥',
    bonusHp: 280, bonusAtk: 50, bonusDef: 36,
    hpMultBonus: 0.45, atkMultBonus: 0.50, defMultBonus: 0.55, squadAtkBonus: 0.25,
    desc: '戦場を支配する軍神！HP+45%, ATK+50%, DEF+55%乗算、全方位覇気スラッシュ＆部隊全員ATK+25%' },
  { id: 'EMPEROR', name: '帝皇カイザー', tier: 2, icon: '⚜️👑',
    bonusHp: 520, bonusAtk: 95, bonusDef: 70,
    hpMultBonus: 0.75, atkMultBonus: 0.85, defMultBonus: 0.80, squadAtkBonus: 0.40,
    desc: '国家を統べる帝皇！HP+75%, ATK+85%, DEF+80%、部隊ATK+40%、覇気範囲拡大' },
  { id: 'MYTHIC_EMPEROR', name: '神話帝ミトラス', tier: 3, icon: '🌌👑',
    bonusHp: 900, bonusAtk: 160, bonusDef: 120,
    hpMultBonus: 1.20, atkMultBonus: 1.35, defMultBonus: 1.25, squadAtkBonus: 0.60,
    desc: '伝説の神話帝！全能力が桁違い。部隊ATK+60%、戦場全体に覇気の加護' }
]);

export function playerClassTier(player) {
  if (!player) return 0;
  if (player.advancedClass === 'MYTHIC_EMPEROR') return 3;
  if (player.advancedClass === 'EMPEROR') return 2;
  if (player.isAdvanced || player.advancedClass === 'WARLORD') return 1;
  return 0;
}

export function nextPlayerStage(player) {
  const t = playerClassTier(player);
  return PLAYER_CLASS_STAGES[t + 1] || null;
}

export function playerStageById(id) {
  return PLAYER_CLASS_STAGES.find(s => s.id === id) || PLAYER_CLASS_STAGES[0];
}
