// 盗賊の物取りと人さらい。

import {
  CARRY_RANGE,
  LOOT_TICKS,
  LOOT_SAFE_DIST,
  isHostile,
  distBetween,
  indexActors,
  makeEvent,
} from './data.js';
import { CAMP } from './world.js';
import { chance } from './rng.js';
import { noteTheft } from './spawning.js';
import { drop, pickup } from './carry.js';

function isStanding(actor) {
  return actor.state === 'idle' || actor.state === 'move' || actor.state === 'fight';
}

function hostileNear(state, actor, radius) {
  for (const other of state.actors) {
    if (other.id === actor.id) continue;
    if (!isStanding(other)) continue;
    if (!isHostile(state, actor.faction, other.faction)) continue;
    if (distBetween(actor, other) <= radius) return true;
  }
  return false;
}

function clearLoot(actor) {
  actor.lootTargetId = null;
  actor.lootTicks = 0;
}

// 盗賊（ランダム出現のこそ泥）は食料も盗む。カニさんの決め: 食料→（装飾品→武器→その他、はまだ無い）→cash の順。
function isThief(actor) {
  return !!actor && actor.spawnKind === 'thieves';
}

function lootableVictim(other, actor) {
  if (other.faction !== 'player') return false;
  if (other.state !== 'down') return false;
  if (other.carriedBy !== null) return false;
  if (other.bound || other.abducted) return false;
  if (!Array.isArray(other.lootedBy)) other.lootedBy = [];
  if (other.lootedBy.length > 0) return false;
  if ((other.money || 0) <= 0 && !(isThief(actor) && (other.food || 0) > 0)) return false;
  return true;
}

export function updateLootGoals(state) {
  for (const actor of state.actors) {
    if (actor.faction !== 'bandit') continue;
    if (actor.spawnKind === 'cannibals') continue; // 人喰いは奪わず、杭へ運ぶ（abduct.js）
    if (actor.isPlayer) continue;
    if (actor.state === 'dead' || actor.state === 'down' || actor.state === 'getup') {
      clearLoot(actor);
      continue;
    }
    if (actor.carryingId !== null || actor.carryHome) continue;
    if (actor.targetId !== null) {
      clearLoot(actor);
      continue;
    }
    if ((actor.fleeUntil || 0) > state.tick) {
      clearLoot(actor);
      continue;
    }

    if (actor.lootTargetId !== null) {
      const current = state.actors.find((other) => other.id === actor.lootTargetId);
      if (!current || !lootableVictim(current, actor)) clearLoot(actor);
      else continue;
    }

    if (hostileNear(state, actor, LOOT_SAFE_DIST)) continue;

    let best = null;
    let bestDist = Infinity;
    for (const other of state.actors) {
      if (other.id === actor.id) continue;
      if (!lootableVictim(other, actor)) continue;
      const d = distBetween(actor, other);
      if (d > 50) continue;
      if (d < bestDist || (d === bestDist && best && other.id < best.id)) {
        best = other;
        bestDist = d;
      }
    }
    if (best) {
      actor.lootTargetId = best.id;
      actor.lootTicks = 0;
    }
  }
}

export function updateLoot(state, events) {
  const byId = indexActors(state);
  for (const actor of state.actors) {
    if (actor.faction !== 'bandit') continue;
    if (actor.spawnKind === 'cannibals') continue; // 人喰いは奪わず、杭へ運ぶ（abduct.js）
    if (actor.state === 'dead' || actor.state === 'down' || actor.state === 'getup') {
      clearLoot(actor);
      continue;
    }

    if (actor.carryingId !== null) {
      if (!actor.carryHome) continue;
      const target = byId.get(actor.carryingId);
      if (!target || target.carriedBy !== actor.id) {
        actor.carryHome = false;
        clearLoot(actor);
        continue;
      }
      const home = actor.spawnHome || CAMP;
      const d = Math.hypot(home.x - actor.x, home.z - actor.z);
      if (d <= 4) {
        drop(state, actor, events);
        actor.carryHome = false;
        clearLoot(actor);
      }
      continue;
    }

    if (actor.lootTargetId === null) continue;
    const target = byId.get(actor.lootTargetId);
    if (!target || !lootableVictim(target, actor)) {
      clearLoot(actor);
      continue;
    }
    if (hostileNear(state, actor, 10)) {
      clearLoot(actor);
      continue;
    }
    const d = distBetween(actor, target);
    if (d > CARRY_RANGE) {
      actor.lootTicks = 0;
      continue;
    }

    actor.lootTicks += 1;
    if (actor.lootTicks < LOOT_TICKS) continue;

    let food = 0;
    if (isThief(actor)) {
      food = target.food || 0;
      target.food = 0;
      actor.food = (actor.food || 0) + food;
    }
    const amount = target.money || 0;
    target.money = 0;
    // 手当ての道具も持っていく（売り物の箱は商人の荷として残す）
    const kits = target.medkit || 0;
    if (kits > 0) {
      target.medkit = 0;
      actor.medkit = (actor.medkit || 0) + kits;
    }
    if (!Array.isArray(target.lootedBy)) target.lootedBy = [];
    target.lootedBy.push(actor.id);
    if (!Array.isArray(actor.lootedBy)) actor.lootedBy = [];
    actor.lootedBy.push(target.id);
    actor.money = (actor.money || 0) + amount;
    if (isThief(actor)) {
      const what = [food > 0 ? '食料' + food + 'つ' : '', amount > 0 ? 'cash ' + amount : ''].filter(Boolean).join('と');
      events.push(makeEvent(state, 'loot', actor.name + 'が' + target.name + 'から' + (what || '何か') + 'を盗んだ'));
      clearLoot(actor);
      noteTheft(state, actor); // 盗んだら一団で逃げる（人さらいはしない）
      continue;
    }
    if (amount > 0) {
      events.push(makeEvent(state, 'loot', actor.name + 'が' + target.name + 'の所持金を奪った'));
    }
    clearLoot(actor);

    if (target.state === 'down' && chance(state, 0.3)) {
      if (pickup(state, actor, target, events)) {
        actor.carryHome = true;
        events.push(makeEvent(state, 'kidnap', actor.name + 'が' + target.name + 'をさらった'));
      }
    }
  }
}
