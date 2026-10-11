import {grantHealingExp} from './experience-rules.js';

export const PHASE_DURATION = 120;
export const REST_DURATION = 8;
export const DEATHLINE_DOWN_THRESHOLD = 10;
/** Legacy name denotes the minimum basic pay; quotes include growth and maintenance. */
export {SOLDIER_SALARY} from './payroll-rules.js?v=182';
export const MIN_REINFORCEMENTS = 5;
export const emptyActivity = () => ({combatActions: 0, healingDone: 0, downs:0});

export function advancePhase(game, dt) {
  if (!game.inBattle || game.restTimer > 0 || !Number.isFinite(dt) || dt <= 0) return false;
  game.phaseTimer = Math.max(0, (game.phaseTimer ?? PHASE_DURATION) - dt);
  if (game.phaseTimer > 0.000001) return false;
  game.completePhase();
  return true;
}

export function advanceRest(game, dt) {
  if (!game.inBattle || !(game.restTimer > 0) || !Number.isFinite(dt) || dt <= 0) return false;
  const elapsed = Math.min(dt, game.restTimer);
  game.restTimer = Math.max(0, game.restTimer - elapsed);
  game.restUpgradeClock = (game.restUpgradeClock || 0) + elapsed;
  while (game.restUpgradeClock >= 0.999999) {
    game.restUpgradeClock = Math.max(0, game.restUpgradeClock - 1);
    game.processRestSecond();
  }
  if (game.restTimer <= 0.000001) game.finishRest();
  return true;
}

export function personalDownCount(unit) {
  const count=Number(unit?.phaseActivity?.downs);
  return Number.isFinite(count)?Math.max(0,Math.floor(count)):0;
}
export const deathlineEligible = unit => !!unit && !unit.dead && personalDownCount(unit)>=DEATHLINE_DOWN_THRESHOLD;
/** Only fresh down events of a deployed soldier count toward that person's wave. */
export function recordDown(game, unit) {
  if(!game || !unit || unit.dead || game.restTimer>0 || !game.squad?.includes(unit))return false;
  unit.phaseActivity ||= emptyActivity();
  unit.phaseActivity.downs=personalDownCount(unit)+1;
  return true;
}

export function recordCombat(unit) {
  if (!unit || unit.dead || unit.isDown || unit.hp <= 0) return;
  unit.phaseActivity ||= emptyActivity();
  unit.phaseActivity.combatActions++;
}

export function recordHealing(healer, amount) {
  if (!healer || healer.dead || healer.isDown || healer.hp <= 0 || !(amount > 0)) return;
  healer.phaseActivity ||= emptyActivity();
  healer.phaseActivity.healingDone += amount;
}

/**
 * Healer-dependent heal strength. One shared curve for medic heals, medic revival
 * and commander on-the-spot revival (the target's max HP share restored).
 * healPower already folds in level, waves, kills, weapon/upgrade/tier, class tier,
 * talent, honors and the healer's magic (魔力) multiplier (index.js recalcSoldierStats).
 *   fraction = clamp(HEAL_BASE_FRACTION * (healPower / HEAL_REF_POWER) ^ HEAL_EXPONENT, HEAL_MIN_FRACTION, HEAL_MAX_FRACTION)
 *   healPower   50 (fresh level-1 medic, real value 53) -> 10%  | 15 (ポンコツ) -> ~4%
 *   healPower  100 (mid)  -> ~17%  | 200 -> ~32%
 *   healPower  300 (late) -> ~44%  | 400 -> ~56% | ~700+ (best) -> 65% cap
 */
export const HEAL_REF_POWER = 50;
export const HEAL_BASE_FRACTION = 0.10;
export const HEAL_EXPONENT = 0.8;
export const HEAL_MIN_FRACTION = 0.02;
export const HEAL_MAX_FRACTION = 0.65;
export function healerPower(healer) {
  const hp = Number(healer?.healPower);
  if (hp > 0) return hp;
  const atk = Number(healer?.atk);
  return 26 + Math.floor((atk > 0 ? atk : 12) * 1.5);
}
export function healFraction(healer) {
  const f = HEAL_BASE_FRACTION * Math.pow(healerPower(healer) / HEAL_REF_POWER, HEAL_EXPONENT);
  return Math.max(HEAL_MIN_FRACTION, Math.min(HEAL_MAX_FRACTION, f));
}
export function healAmountFor(healer, target) {
  return Math.max(1, Math.round((Number(target?.maxHp) || 0) * healFraction(healer)));
}

export function healByMedic(healer, target, amount, game = null) {
  if (!target || target.dead || target.isDown || target.hp <= 0 || !Number.isFinite(amount) || amount <= 0) return 0;
  const restored = Math.max(0, Math.min(target.maxHp - target.hp, amount));
  target.hp += restored;
  recordHealing(healer, restored);
  grantHealingExp(game, healer, restored);
  return restored;
}

export function participated(unit) {
  return (unit?.phaseActivity?.combatActions || 0) > 0 || (unit?.phaseActivity?.healingDone || 0) > 0;
}

export function finishExperience(unit) {
  const earned = !!unit && !unit.dead && participated(unit);
  if (earned) unit.survivedWaves = (unit.survivedWaves || 0) + 1;
  if (unit) unit.phaseActivity = emptyActivity();
  return earned;
}
