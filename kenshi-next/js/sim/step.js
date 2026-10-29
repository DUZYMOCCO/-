// 1tick の進行。命令 → AI → 移動 → 戦闘 → 部位更新 → 補充 → 時刻。

import { GAME_SEC_PER_TICK, indexActors } from './data.js';
import { updateCrossbows, updateProjectiles } from './crossbow.js';
import { applyQueuedCommands } from './commands.js';
import { updateAI, moveActors, updateSpawns } from './ai.js';
import { resolveCombat, trimAttackSlots, resetAssists } from './combat.js';
import { updateBody } from './body.js';
import { updateNeeds } from './needs.js';
import { updateCarry, syncCarried } from './carry.js';
import { updateLoot } from './loot.js';
import { updateStealth, updateAssassination } from './stealth.js';
import { updateSpawnDirector } from './spawning.js';

function appendLog(state, events) {
  if (events.length === 0) return;
  for (const event of events) {
    state.log.push(event);
  }
  if (state.log.length > 50) {
    state.log.splice(0, state.log.length - 50);
  }
}

export function step(state) {
  const events = [];
  if (!state || !Array.isArray(state.actors)) return events;

  applyQueuedCommands(state, events);
  updateStealth(state, events);
  updateAI(state, events);
  moveActors(state);
  updateAssassination(state, events);
  {
    const byId = indexActors(state);
    updateProjectiles(state, events, byId);
    updateCrossbows(state, events, byId);
  }
  resolveCombat(state, events);
  trimAttackSlots(state);
  resetAssists(state);
  updateBody(state, events);
  updateNeeds(state, events);
  updateCarry(state, events);
  updateLoot(state, events);
  updateSpawns(state, events);
  updateSpawnDirector(state, events); // ランダム出現（state.spawn がある時だけ。別の乱数の流れ）
  syncCarried(state);

  state.tick += 1;
  state.timeSec += GAME_SEC_PER_TICK;

  appendLog(state, events);
  return events;
}
