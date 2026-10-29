// ルール層の公開窓口。

export {
  TICK_SEC,
  GAME_SEC_PER_TICK,
  START_TIME_SEC,
  DAY_SEC,
  FACTIONS,
  FACTION_ORDER,
  WEAPONS,
  PART_KEYS,
  PART_MAX,
  PART_LABEL,
  VISION,
  ACTOR_LIMIT,
  isHostile,
  makeEvent,
} from './data.js';

export { mulberry32, rand, randInt, randRange, pick, chance } from './rng.js';
export { heightAt } from './terrain.js';
export {
  createWorld,
  spawnSquadMembers,
  makeActor,
  groundHeight,
  TOWN1,
  TOWN2,
  CAMP,
  NEST,
} from './world.js';
export { applyDamage, updateBody, isStanding, checkCondition } from './body.js';
export { resolveCombat, trimAttackSlots, resetAssists, requestAssist } from './combat.js';
export { updateAI, updateSpawns, moveActors, updateSquadGoals } from './ai.js';
export { applyCommand, applyQueuedCommands } from './commands.js';
export { step } from './step.js';

export function formatClock(timeSec) {
  const t = Math.max(0, Math.floor(Number(timeSec) || 0));
  const day = Math.floor(t / 86400) + 1;
  const rest = t % 86400;
  const hh = Math.floor(rest / 3600);
  const mm = Math.floor((rest % 3600) / 60);
  return day + '日目 ' + String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
}
