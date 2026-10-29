// 1tick の進行。命令 → AI → 移動 → 戦闘 → 部位更新 → 補充 → 時刻。

import { GAME_SEC_PER_TICK } from './data.js';
import { applyQueuedCommands } from './commands.js';
import { updateAI, moveActors, updateSpawns } from './ai.js';
import { resolveCombat, trimAttackSlots, resetAssists } from './combat.js';
import { updateBody } from './body.js';

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
  updateAI(state, events);
  moveActors(state);
  resolveCombat(state, events);
  trimAttackSlots(state);
  resetAssists(state);
  updateBody(state, events);
  updateSpawns(state, events);

  state.tick += 1;
  state.timeSec += GAME_SEC_PER_TICK;

  appendLog(state, events);
  return events;
}
