import { updateSettlementPeople } from './settlement_people.js';
import { keepEvent } from '../ui/event_log.js';
// 1tick の進行。命令 → AI → 移動 → 戦闘 → 部位更新 → 補充 → 時刻。

import { GAME_SEC_PER_TICK, indexActors } from './data.js';
import { updateTurrets } from './turret.js';
import { updateCrossbows, updateProjectiles } from './crossbow.js';
import { applyQueuedCommands } from './commands.js';
import { updateAI, moveActors, updateSpawns } from './ai.js';
import { resolveCombat, trimAttackSlots, resetAssists } from './combat.js';
import { updateBody } from './body.js';
import { updateNeeds } from './needs.js';
import { updateCarry, syncCarried } from './carry.js';
import { updateAbduct } from './abduct.js';
import { updateLoot, updatePlayerLoot } from './loot.js';
import { updateStealth, updateAssassination } from './stealth.js';
import { updateSpawnDirector } from './spawning.js';
import { updateRest, updateBedRescue } from './rest.js';
import { updateTrade } from './trade.js';
import { updateTown, updateTownFood } from './town.js';
import { updateLaw } from './law.js';
import { updateDialogue } from './dialogue_system.js';
import { updateBuild } from './build.js';
import { updateShopCounters } from './house_buy.js';
import { updateCooking } from './cooking.js';
import { advanceMartialPairs } from './martial_pair.js';
import { updateTraps } from './traps.js';
import { updateInvestigations } from './sneakshot.js';
import { updateLookoutPatrols } from './lookout_patrol.js';
import { updateStolenGoods } from './stolen_goods.js';

function appendLog(state, events) {
  if (events.length === 0) return;
  for (const event of events) {
    if (keepEvent(event)) state.log.push(event);
  }
  if (state.log.length > 300) {
    state.log.splice(0, state.log.length - 300);
  }
}

export function step(state) {
  const events = [];
  if (!state || !Array.isArray(state.actors)) return events;

  updateSettlementPeople(state);
  applyQueuedCommands(state, events);
  updateInvestigations(state, events);
  updateStealth(state, events);
  updateDialogue(state, events); // 会話タイマーは実時間基準（1tick=0.1秒）。条件のhour/repeatはゲーム時刻。
  updateTraps(state, events);
  advanceMartialPairs(state);
  updateAI(state, events);
  updateLookoutPatrols(state);
  moveActors(state);
  if (state.town) {
    updateTown(state, events); // 扉が閉まる・昼夜の鍵（bldg1）
    updateTownFood(state, events); // 町が食料を買って補充する（1日1回）
    updateBuild(state);
    updateCooking(state);
    updateShopCounters(state, events);
    updateLaw(state, events); // 錠前破り・盗み・目撃・賞金・逮捕
  } else {
    updateBuild(state);
  }
  updateAssassination(state, events);
  {
    const byId = indexActors(state);
    updateProjectiles(state, events, byId);
    updateCrossbows(state, events, byId);
    updateTurrets(state, events, byId);
  }
  resolveCombat(state, events);
  trimAttackSlots(state);
  resetAssists(state);
  updateBody(state, events);
  updateRest(state, events);
  updateNeeds(state, events);
  updateCarry(state, events);
  updateBedRescue(state, events);
  updateAbduct(state, events);
  updateLoot(state, events);
  updatePlayerLoot(state, events); // 仲間の「あさる」命令
  updateSpawns(state, events);
  updateTrade(state, events); // 交易: 相場メモと高騰の噂（乱数の流れは使わない）
  updateSpawnDirector(state, events); // ランダム出現（state.spawn がある時だけ。別の乱数の流れ）
  syncCarried(state);

  state.tick += 1;
  state.timeSec += GAME_SEC_PER_TICK;
  if (state.tick % 50 === 0) updateStolenGoods(state);

  appendLog(state, events);
  return events;
}
