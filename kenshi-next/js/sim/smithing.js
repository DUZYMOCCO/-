// 鍛冶システム（smith1）: 純粋な計算式とシミュレーション関数
// ルール: 決定性、シード乱数、外部環境非依存API禁止

import { ITEMS, qualityOf, QUALITY_RANKS } from './items.js';
import { SMITH_MATERIALS } from '../data/smith_materials.js';
import { makeEvent } from './data.js';

export const FORGE_BENCH_REACH = 2.8;
export const STRIKES_PER_FORGE = 5;

// スキル（0〜100）に応じたヒット判定の窓幅（0〜1の正規化幅）
// スキルが高いほど会心（perfect）および成功（good）の判定幅が広がる
export function hitWindowWidth(skill) {
  const s = Math.max(0, Math.min(100, Number(skill) || 0));
  // perfect: 中心からの半幅 0.04 (スキル0) 〜 0.10 (スキル100) -> 全幅 0.08 〜 0.20
  const perfectHalf = 0.04 + (s / 100) * 0.06;
  // good: 中心からの半幅 0.12 (スキル0) 〜 0.24 (スキル100) -> 全幅 0.24 〜 0.48
  const goodHalf = 0.12 + (s / 100) * 0.12;
  return {
    perfect: perfectHalf * 2,
    good: goodHalf * 2,
    perfectHalf,
    goodHalf,
  };
}

// 1打の打撃判定
export function evaluateStrike(markerPos, targetCenter = 0.5, skill = 0) {
  const dist = Math.abs(Number(markerPos) - Number(targetCenter));
  const { perfectHalf, goodHalf } = hitWindowWidth(skill);
  if (dist <= perfectHalf) return 'perfect';
  if (dist <= goodHalf) return 'good';
  return 'poor';
}

// 5打の合計結果判定
// 会心(perfect): 会心3回以上かつ失敗なし、または会心4回以上
// 不首尾(poor): 失敗3回以上
// それ以外: 通常(normal)
export function aggregateTiming(strikes) {
  if (!Array.isArray(strikes) || strikes.length === 0) return 'normal';
  let perfect = 0;
  let good = 0;
  let poor = 0;
  for (const s of strikes) {
    if (s === 'perfect') perfect += 1;
    else if (s === 'good') good += 1;
    else if (s === 'poor') poor += 1;
  }
  if ((perfect >= 3 && poor === 0) || perfect >= 4) return 'perfect';
  if (poor >= 3) return 'poor';
  return 'normal';
}

// 想定品質スコアの計算式:
// expected quality score = skill*0.5 + benchTier*10 + materialRank*5
export function calcQualityScore(skill, benchTier = 1, materialRank = 1) {
  const s = Math.max(0, Math.min(100, Number(skill) || 0));
  const b = Math.max(1, Number(benchTier) || 1);
  const m = Math.max(1, Math.min(10, Number(materialRank) || 1));
  return s * 0.5 + b * 10 + m * 5;
}

// スコアから品質ランク（1〜10）への対応付け
export function scoreToQualityRank(score) {
  const num = Number(score) || 0;
  return Math.max(1, Math.min(QUALITY_RANKS.length, Math.floor(num / 10)));
}

// タイミング結果による品質ランクの±1シフトとクランプ [1, 10]
// perfect: +1, poor: -1, normal: 0
export function applyTimingShift(rank, timingResult) {
  const r = Math.max(1, Math.min(QUALITY_RANKS.length, Math.round(Number(rank) || 1)));
  const shift = timingResult === 'perfect' ? 1 : (timingResult === 'poor' ? -1 : 0);
  return Math.max(1, Math.min(QUALITY_RANKS.length, r + shift));
}

// 総合最終品質ランクの計算
export function calcFinalQualityRank(skill, benchTier, materialRank, timingResult) {
  const score = calcQualityScore(skill, benchTier, materialRank);
  const baseRank = scoreToQualityRank(score);
  return applyTimingShift(baseRank, timingResult);
}

// 既存武器の強化時のランク決定（強化後のランク）
export function upgradeQualityRank(currentRank, finalScoreRank, timingResult) {
  const cur = Math.max(1, Math.min(QUALITY_RANKS.length, Number(currentRank) || 1));
  const target = Math.max(1, Math.min(QUALITY_RANKS.length, Number(finalScoreRank) || 1));
  if (timingResult === 'perfect') {
    return Math.max(1, Math.min(QUALITY_RANKS.length, Math.max(cur + 1, target)));
  }
  if (timingResult === 'poor') {
    return Math.max(1, Math.min(QUALITY_RANKS.length, target > cur ? target : cur - 1));
  }
  return Math.max(1, Math.min(QUALITY_RANKS.length, Math.max(cur, target)));
}

// 鍛冶スキルの獲得XP計算
export function calcSmithingXp(currentSkill, materialRank = 1, timingResult = 'normal') {
  const s = Math.max(0, Math.min(100, Number(currentSkill) || 0));
  const m = Math.max(1, Math.min(10, Number(materialRank) || 1));
  const base = 1.0 + m * 0.4;
  const mult = timingResult === 'perfect' ? 1.5 : (timingResult === 'poor' ? 0.5 : 1.0);
  const diminish = Math.max(0.08, 1 - s / 105);
  return Math.round(base * mult * diminish * 100) / 100;
}

// 鍛冶スキルのXP加算
export function gainSmithingXp(actor, materialRank = 1, timingResult = 'normal') {
  if (!actor || typeof actor !== 'object') return { xp: 0, newSkill: 0 };
  if (!actor.skills) actor.skills = {};
  const cur = typeof actor.skills.smithing === 'number' ? actor.skills.smithing : 1;
  const xp = calcSmithingXp(cur, materialRank, timingResult);
  const next = Math.min(100, Math.round((cur + xp) * 100) / 100);
  actor.skills.smithing = next;
  return { xp, newSkill: next };
}

// 武器強化（品質ランク・性能値の上昇）
export function upgradeWeapon(weaponItem, material, timingResult = 'normal', options = {}) {
  const benchTier = options.benchTier || 1;
  const skill = options.skill || 0;
  const materialRank = material?.materialRank || 1;

  const finalScoreRank = calcFinalQualityRank(skill, benchTier, materialRank, timingResult);
  const curRank = weaponItem.rank || 1;
  const newRank = upgradeQualityRank(curRank, finalScoreRank, timingResult);

  // 武器の追加能力値
  if (!weaponItem.stats || typeof weaponItem.stats !== 'object') {
    weaponItem.stats = { atkBonus: 0, defBonus: 0, dmgBonus: 0, weightMod: 0 };
  }
  const matStats = material?.stats || {};
  weaponItem.stats.atkBonus += (matStats.atkBonus || 0);
  weaponItem.stats.defBonus += (matStats.defBonus || 0);
  weaponItem.stats.dmgBonus = Math.round(((weaponItem.stats.dmgBonus || 0) + (matStats.dmgBonus || 0)) * 100) / 100;
  weaponItem.stats.weightMod = Math.round(((weaponItem.stats.weightMod || 0) + (matStats.weightMod || 0)) * 10) / 10;

  weaponItem.rank = newRank;
  if (!Array.isArray(weaponItem.upgrades)) weaponItem.upgrades = [];
  if (material?.id) weaponItem.upgrades.push(material.id);

  return weaponItem;
}

// 鍛冶可能かの判定
export function canForge(actor, weaponItem, materialItem) {
  if (!actor || actor.state === 'dead' || actor.jail) {
    return { ok: false, reason: '行動できません' };
  }
  if (!weaponItem || typeof weaponItem !== 'object') {
    return { ok: false, reason: '強化対象の武器が選択されていません' };
  }
  const defW = ITEMS[weaponItem.id];
  if (!defW || defW.slot !== 'weapon') {
    return { ok: false, reason: '武器以外は強化できません' };
  }
  if (!materialItem || typeof materialItem !== 'object') {
    return { ok: false, reason: '素材が選択されていません' };
  }
  const defM = SMITH_MATERIALS[materialItem.id] || ITEMS[materialItem.id];
  if (!defM || defM.slot !== 'mat') {
    return { ok: false, reason: '鍛冶素材ではありません' };
  }
  return { ok: true, reason: '' };
}

// 鍛冶・強化の実行
export function executeForge(state, actor, weaponInvIndex, materialInvIndex, bench, timingResult = 'normal', events = null) {
  if (!actor || !Array.isArray(actor.inv)) return { ok: false, reason: '所持品がありません' };
  const weapon = actor.inv[weaponInvIndex];
  const material = actor.inv[materialInvIndex];

  const check = canForge(actor, weapon, material);
  if (!check.ok) return check;

  const matDef = SMITH_MATERIALS[material.id] || ITEMS[material.id];
  const isStackable = !!(matDef?.stackable || material.stackable);

  // 素材を1つ消費
  if (isStackable && (material.n || 1) > 1) {
    material.n -= 1;
  } else {
    actor.inv.splice(materialInvIndex, 1);
  }

  // 武器を強化
  const skill = actor.skills?.smithing || 0;
  const benchTier = bench?.tier || 1;
  const oldRank = weapon.rank || 1;
  upgradeWeapon(weapon, matDef, timingResult, { benchTier, skill });

  // XP獲得
  const { xp, newSkill } = gainSmithingXp(actor, matDef.materialRank || 1, timingResult);

  if (events && Array.isArray(events)) {
    const wName = ITEMS[weapon.id]?.name || weapon.id;
    const mName = matDef?.name || material.id;
    events.push(makeEvent(state, 'smith', `${actor.name}は${mName}で${wName}を鍛錬した（R${oldRank} → R${weapon.rank}）`));
  }

  return {
    ok: true,
    weapon,
    oldRank,
    newRank: weapon.rank,
    xp,
    newSkill,
  };
}

// 近くにある鍛冶台を検索
export function benchNear(state, x, z, reach = FORGE_BENCH_REACH) {
  if (!state || !Array.isArray(state.forgeBenches)) return null;
  let best = null;
  let bestDist = reach;
  for (const b of state.forgeBenches) {
    const d = Math.hypot(b.x - x, b.z - z);
    if (d <= bestDist) {
      bestDist = d;
      best = b;
    }
  }
  return best;
}

// state に鍛冶台を初期化・配備
export function ensureForgeBenches(state, opts = {}) {
  if (Array.isArray(state.forgeBenches) && state.forgeBenches.length > 0) return;
  state.forgeBenches = [];

  // 第1の町 (town1) に鍛冶台を配備
  // TOWN1 座標付近、または町施設内
  const defaultBench = {
    id: 'forge_bench_town1',
    name: '鍛冶台',
    town: 'town1',
    x: 6.0,
    z: 8.5,
    rot: 0,
    tier: opts.benchTier || 1,
  };
  state.forgeBenches.push(defaultBench);
}
