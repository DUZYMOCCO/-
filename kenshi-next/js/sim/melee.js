// 近接の式（受け・攻撃の速さ・必要筋力・よろけ・KO点・成長の倍率）。
// Kenshi の式は kenshi.fandom.com で確かめたもの（research/combat_audit.md）。
// ★ = この世界で決めた仮の値（Kenshi に数値が無い、または独自ルール）。PROGRESS.md にも書く。

import { WEAPONS, TICK_SEC } from './data.js';

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

// ---- Kenshi の値（wiki で確認済み） ----
export const KENSHI = {
  blockBase: 70, // 同じ腕前なら 70% 受ける（Melee Attack）
  blockPerDefLevel: 1.2, // 防御が1上回るごとに +1.2%
  blockPerAtkLevel: 1.5, // 攻撃が1上回るごとに -1.5%
  blockMax: 95, // 防御が21上で 95%（Melee Defence）
  initiativePerLevel: 0.025, // 攻撃の差1ごとに「次に攻める」見込みが 2.5% 有利（Melee Attack）
  attackSpeedCap: 1.2, // Combat Speed
  blockSpeedCap: 4.0,
  strPenaltyPerLevel: 0.474 / 18, // 必要筋力に1足りないごとに約 -2.6%、18以上で -47.4%
  strPenaltyMaxLevels: 18,
  defXpHitMult: 8, // 受け損ない（当たった）は受け成功の8倍（Stronger Opponent Logic）
  atkXpBlockedMult: 0.5, // 攻撃が受けられたら当たりの半分（同上）
};

// ---- この世界の仮の値 ★ ----
export const TUNING = {
  swingBaseSec: 1.0, // ★攻撃1回の周期 = swingBaseSec × (1 + 0.5×topBalance) ÷ 攻撃速度。刀・腕前0で約1.5秒（動画 1.0–1.7秒）
  windupFrac: 0.34, // ★周期のうち振りかぶりの割合。刀・腕前0で約0.5秒（動画 DAE 9.17→9.67）
  blockBaseSec: 0.6, // ★受けたあと次を受けられるまで = blockBaseSec × (1 + topBalance) ÷ 受け速度
  blockSpeedFloor: 0.3, // Kenshi の不具合（受け速度がマイナスで後ろへ瞬間移動）の置き換え: 下限を設ける
  blockMin: 5, // ★受けの下限 %（wiki に無い）
  counterMinTicks: 5, // 受けてから反撃の振り始めまで 0.5–1.0秒（動画）
  counterMaxTicks: 10,
  flinchTicks: 3, // ひるみ 0.3秒
  flinchGuardTicks: 5, // ひるみが終わって 0.5秒は再ひるみしない（Kenshi の「隅でハメ」の置き換え）
  staggerTicks: 10, // よろけ 1秒（受けられない・振れない）
  staggerGuardTicks: 15, // よろけの後 1.5秒は再よろけしない（2人がかりの連続よろけ防止）
  staggerBase: 18, // ★よろける当たりの強さ = 18 + 打たれ強さ×0.3（wiki に数値なし。Gemini の 0.8×T は不採用）
  staggerPerTough: 0.3,
  impactBase: 0.5, // ★当たりの強さ = ダメージ × (0.5 + topBalance)
  guardBreakPerBalance: 0.6, // ★受け崩し（guardBreakChance の説明を参照）
  guardBreakPerStr: 0.003,
  guardBreakPerSkill: 0.005,
  guardBreakMax: 0.6,
  guardBreakDamage: 0.5, // ★崩されたら半分のダメージが通る
  heavyBlockCost: 1.0, // ★重い一撃を軽い武器で受けると構え直しが (1 + 差) 倍遅い
  comaRegenPerTick: 0.005, // ★回復昏睡中の急所の回復（手当てがまだ無いので、ゆっくり自然に戻る）
  getupTicks: 40, // 起き上がり 4秒（動画 9-2 で 3.5秒以上）
};

export function weaponOf(actor) {
  return WEAPONS[actor.weapon] || WEAPONS.fists;
}

// 必要筋力 = max(40 × 打撃ダメージ, 重さ)（wiki: Combat Speed / Strength）
export function requiredStrength(weapon) {
  return Math.max(40 * (weapon.blunt || 0), weapon.weight || 0);
}

// 筋力が足りない時の速さの倍率（1 = 足りている）
export function strengthFactor(actor) {
  const short = requiredStrength(weaponOf(actor)) - (actor.skills.strength || 0);
  if (short <= 0) return 1;
  return 1 - Math.min(KENSHI.strPenaltyMaxLevels, short) * KENSHI.strPenaltyPerLevel;
}

// 攻撃速度 = (0.8 + 0.4 × (0.6×器用 + 0.4×攻撃)/100) × 0.95 = 0.76 + 0.00152×攻撃 + 0.00228×器用、上限 1.2
export function attackSpeed(actor) {
  const s = actor.skills;
  const raw = (0.8 + (0.4 * (0.6 * s.dexterity + 0.4 * s.attack)) / 100) * 0.95;
  return Math.min(KENSHI.attackSpeedCap, raw * strengthFactor(actor));
}

// 受け速度 = (0.6 + 3.4 × (0.6×器用 + 0.4×防御)/100) × 0.95、上限 4.0
export function blockSpeed(actor) {
  const s = actor.skills;
  const raw = (0.6 + (3.4 * (0.6 * s.dexterity + 0.4 * s.defense)) / 100) * 0.95;
  return clamp(raw * strengthFactor(actor), TUNING.blockSpeedFloor, KENSHI.blockSpeedCap);
}

export function cycleTicks(actor) {
  const w = weaponOf(actor);
  const sec = (TUNING.swingBaseSec * (1 + 0.5 * w.topBalance)) / attackSpeed(actor);
  return Math.max(6, Math.round(sec / TICK_SEC));
}

export function windupTicks(actor) {
  return Math.max(2, Math.round(cycleTicks(actor) * TUNING.windupFrac));
}

// 受け終わって次の攻撃を受けられるまでの tick（重い一撃を軽い武器で受けると長い）
export function blockRecoveryTicks(defender, attackerWeapon) {
  const dw = weaponOf(defender);
  const heavier = Math.max(0, (attackerWeapon ? attackerWeapon.topBalance : 0) - dw.topBalance);
  const sec =
    ((TUNING.blockBaseSec * (1 + dw.topBalance)) / blockSpeed(defender)) *
    (1 + TUNING.heavyBlockCost * heavier);
  return Math.max(1, Math.round(sec / TICK_SEC));
}

export function attackLevel(actor) {
  return actor.skills.attack + weaponOf(actor).atk;
}

export function defenseLevel(actor) {
  return actor.skills.defense + weaponOf(actor).def;
}

// 受ける確率 (0..1)。同じ腕前で 0.70。
export function blockChance(defLevel, atkLevel) {
  const diff = defLevel - atkLevel;
  const p =
    KENSHI.blockBase + diff * (diff >= 0 ? KENSHI.blockPerDefLevel : KENSHI.blockPerAtkLevel);
  return clamp(p, TUNING.blockMin, KENSHI.blockMax) / 100;
}

// a が b より先に「次の番」を取る確率。差d で見込み (1 + 0.025d):1。
export function initiativeChance(a, b) {
  const d = attackLevel(a) - attackLevel(b);
  const r = 1 + Math.abs(d) * KENSHI.initiativePerLevel;
  return d >= 0 ? r / (1 + r) : 1 / (1 + r);
}

// 受け崩しの確率 ★（独自ルール）
//   = 0.6 × (攻め手の topBalance − 受け手の topBalance) + 0.003 × 筋力の差 − 0.005 × (受け手の防御 − 攻め手の攻撃)、0〜60%
//   重心が先にある重い武器ほど軽い武器の受けを崩す（同じか軽い武器なら0）。腕の差があれば崩されにくい。
export function guardBreakChance(attacker, defender) {
  const balance = weaponOf(attacker).topBalance - weaponOf(defender).topBalance;
  if (balance <= 0) return 0; // 同じか軽い武器では崩れない
  const str = (attacker.skills.strength || 0) - (defender.skills.strength || 0);
  const skill = defenseLevel(defender) - attackLevel(attacker);
  return clamp(
    TUNING.guardBreakPerBalance * balance + TUNING.guardBreakPerStr * str - TUNING.guardBreakPerSkill * skill,
    0,
    TUNING.guardBreakMax
  );
}

export function impactOf(damage, weapon) {
  return damage * (TUNING.impactBase + weapon.topBalance);
}

export function staggerThreshold(actor) {
  return TUNING.staggerBase + TUNING.staggerPerTough * (actor.skills.toughness || 0);
}

// 打たれ強さのダメージ倍率: 軽減率 = -65% + 1.3%×T（0で1.65倍、50で等倍、100で0.35倍）
export function toughnessMult(toughness) {
  const resist = clamp(-65 + 1.3 * toughness, -65, 65);
  return 1 - resist / 100;
}

// KO点 = -10 - 0.75×T（Kenshi の部位体力100あたり）。この世界の部位は最大値が違うので割合で使う。
export function koPoint(toughness) {
  return -10 - 0.75 * toughness;
}

// 格上・格下の経験の倍率（Stronger Opponent Logic）: 格上1ごとに +10%（最大6倍）、格下1ごとに -3%（最低0.25倍）
export function solMult(own, opponent) {
  const diff = opponent - own;
  if (diff >= 0) return Math.min(6, 1 + 0.1 * diff);
  return Math.max(0.25, 1 + 0.03 * diff);
}

// 打たれ強さの経験: 受けたダメージが「打たれ強さ−25」以下で0.25倍、+10で2倍、+50で6倍（wiki: Toughness）
export function toughnessXpMult(damage, toughness) {
  const over = damage - toughness;
  if (over <= -25) return 0.25;
  if (over <= 10) return 0.25 + ((over + 25) / 35) * 1.75;
  return Math.min(6, 2 + ((over - 10) / 40) * 4);
}
