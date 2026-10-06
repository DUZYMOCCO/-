export const PHASE_DURATION = 120;
export const REST_DURATION = 10;
export const SOLDIER_SALARY = 20;
export const MIN_REINFORCEMENTS = 5;
export const emptyActivity = () => ({combatActions: 0, healingDone: 0});

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

export function healByMedic(healer, target, amount) {
  if (!target || target.dead || target.isDown || target.hp <= 0 || !Number.isFinite(amount) || amount <= 0) return 0;
  const restored = Math.max(0, Math.min(target.maxHp - target.hp, amount));
  target.hp += restored;
  recordHealing(healer, restored);
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
