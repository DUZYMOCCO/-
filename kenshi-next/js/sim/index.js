// ルール層の公開窓口。

export {
  TICK_SEC,
  GAME_SEC_PER_TICK,
  START_TIME_SEC,
  DAY_SEC,
  FACTIONS,
  FACTION_ORDER,
  WEAPONS,
  CROSSBOW_BLEED,
  CROSSBOWS,
  CROSSBOW_KIND,
  BLEED_PER_DAMAGE,
  weaponBleed,
  PART_KEYS,
  PART_MAX,
  PART_LABEL,
  VISION,
  ACTOR_LIMIT,
  CARRY_RANGE,
  CARRY_SPEED_FACTOR,
  LOOT_TICKS,
  isHostile,
  makeEvent,
  ATTACK_SLOT_LIMIT,
  PART_WEIGHTS,
  FEMALE_SHARE,
  sexFor,
  sexOf,
  DOWNED_HARM,
  canHarmDowned,
  downedHarmKind,
} from './data.js';
export * from './melee.js';

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
export { applyDamage, updateBody, isStanding, checkCondition, koSeconds, koTicks, koStatusText, KO_TIME_SCALE, FESTER_TIME_SCALE } from './body.js';
export { resolveCombat, trimAttackSlots, resetAssists, requestAssist } from './combat.js';
export { CLEAVE, CLEAVE_DEMO_LAYOUT, cleaveCandidates, isBluntCleaveWeapon } from './cleave.js';
export {
  SURROUND,
  attackSlotsFor,
  assignedWaitAngle,
  compareActorIds,
  meleeSlotHolders,
  rangedForTarget,
  waitRingRadius,
} from './surround.js';
export { updateAI, updateSpawns, moveActors, updateSquadGoals } from './ai.js';
export { runSpeed, walkSpeed } from './ai.js';
export { DEFAULT_RACE, raceOf, raceDef, raceBase, factionRaceAttitude, assignRace, racePartMax, raceStrength, raceDexterity, squadHasRace, factionChecksSquad } from './races.js';
export { applyCommand, applyQueuedCommands } from './commands.js';
export {
  pickup,
  drop,
  updateCarry,
  updateCompanionCarry,
  syncCarried,
} from './carry.js';
export { updateLoot, updateLootGoals } from './loot.js';
export {
  ambientLight,
  darknessOf,
  fixedLights,
  lightAtPoint,
  lightAtActor,
  carriesLight,
  rangedHitChance,
  LANTERN,
  CAMPFIRE,
  LAMP,
  DARK_RANGED_PENALTY,
} from './light.js';
export { updateNeeds, growUse, hungerStage, hungerStrengthMultiplier, effectiveStrength } from './needs.js';
export { DISHES, cookingMultiplier, updateCooking } from './cooking.js';
export {
  lightAt,
  canSee,
  effectiveStealth,
  updateStealth,
  updateAssassination,
  assassinationTargetExists,
} from './stealth.js';
export { resolveCircle, blockedAt, actorRadius, CELL_SIZE } from './collide.js';
export { step } from './step.js';
export { updateLookoutPatrols, lookoutPatrolSnapshot, normalizeLookoutAngle } from './lookout_patrol.js';
export { SAVE_VERSION, MAX_SAVE_BYTES, serialize, deserialize } from './save.js';
export {
  STOLEN_GOODS_DAYS, STOLEN_GOODS_TTL_SEC, STOLEN_GOODS_BUYBACK,
  activeStolenMark, activeStolenLots, addStolenLot, stolenLotCount,
  makeStolenMark, sameStolenFaction, stolenTownName, updateStolenGoods,
  sameStolenFactionId,
} from './stolen_goods.js';

export function formatClock(timeSec) {
  const t = Math.max(0, Math.floor(Number(timeSec) || 0));
  const day = Math.floor(t / 86400) + 1;
  const rest = t % 86400;
  const hh = Math.floor(rest / 3600);
  const mm = Math.floor((rest % 3600) / 60);
  return day + '日目 ' + String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
}
export * from './crossbow.js';
export * from './sneakshot.js';
export {
  initSpawn,
  updateSpawnDirector,
  updateLeash,
  answerDemand,
  forceSquad,
  forceSite,
  spawnSummary,
  spawnSeed,
  REGIONS,
  regionAt,
  SQUAD_TYPES,
  ROLES,
  SITE_TYPES,
  SPAWN,
} from './spawning.js';
export * from './abduct.js';
export { KO_LINES, WAKE_LINES, EATEN_LINES, lineFor, speakerOf } from './lines.js';
export { BLOOD_MAX, BLOOD_KO, BLOOD_REKO, BLOOD_WAKE, BLOOD_DEATH, BLOOD_PER_BLEED, LIMB_LOSS_BLEED, severLimb, bloodOf, isMissing } from './body.js';
export { bodyFluid } from './body_fluid.js';
export * from './hitreact.js';
export * from './medkit.js';
export * from './rest.js';

export * from './trade.js';
export * from './town.js';
export * from './locks.js';
export * from './law.js';

export * from './items.js';
export * from './inventory.js';
export * from './armor.js';
export * from './smithing.js';
export * from './actions.js';
export * from './squads.js';
export * from './build.js';
export * from './outposts.js';
export * from './house_buy.js';
export { ensureTraps, setTrapSkill, trapLevel, canPlaceTrap, beginTrapPlacement, beginTrapCraft, digTicks, recoverTrap, updateTraps, trapSnapshot, trapDemo, TRAP_TYPES } from './traps.js';
export * from './shops.js';
export * from './gear_trade.js';
export * from './cooking.js';

