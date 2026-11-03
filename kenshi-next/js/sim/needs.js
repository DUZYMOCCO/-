// 使って伸びる能力、空腹、食料、獣の肉。

import { dist2, makeEvent } from './data.js';
import { isStanding, kill } from './body.js';
import { DISHES } from './cooking.js';
import { eatFromTownLarder } from './town.js';
import { stopRest } from './rest.js';
import { ITEMS } from './items.js';

export const HUNGER_START = 80;
export const HUNGER_MAX = 100;
export const HUNGER_PER_TICK = 100 / 43200;
export const HUNGER_EAT_BELOW = HUNGER_MAX * 5 / 6;
export const HUNGER_EAT_GAIN = 40;
export const HUNGER_WEAK_BELOW = HUNGER_MAX * 2 / 3;
export const HUNGER_STARVE_BELOW = HUNGER_MAX / 3;
export const HUNGER_STARVE_DAMAGE = 0.02;
export const HUNGER_WARN_TICKS = 1200;

const ATHLETICS_BASE = 0.0004;
const STRENGTH_BASE = 0.0008;

export function growUse(actor, key, base) {
  const own = actor.skills[key];
  if (typeof own !== 'number') return;
  const next = Math.min(100, own + base * (1 - own / 100));
  if (next > own) actor.skills[key] = next;
}

function updateGrowth(actor) {
  if (actor.movedRun) growUse(actor, 'athletics', ATHLETICS_BASE);
  if (actor.movedCarry) growUse(actor, 'strength', STRENGTH_BASE);
  actor.movedRun = false;
  actor.movedCarry = false;
}

function updateMeat(state, events) {
  for (const beast of state.actors) {
    if (beast.faction !== 'beast') continue;
    if (beast.machine) continue; // 古代の機械は肉にならない
    if (beast.state !== 'dead') continue;
    if (beast.butchered) continue;
    let eater = null;
    for (const actor of state.actors) {
      if (actor.faction !== 'player') continue;
      if (!isStanding(actor)) continue;
      if (dist2(actor.x, actor.z, beast.x, beast.z) > 4) continue;
      eater = actor;
      break;
    }
    if (!eater) continue;
    eater.food = (typeof eater.food === 'number' ? eater.food : 0) + 2;
    beast.butchered = true;
    events.push(makeEvent(state, 'meat', eater.name + 'は獣の肉を手に入れた'));
  }
}

export function hungerStage(hunger, max = HUNGER_MAX) {
  const value = Math.max(0, Number.isFinite(Number(hunger)) ? Number(hunger) : HUNGER_START);
  if (value >= max * 5 / 6) return '満腹';
  if (value >= max * 2 / 3) return '空腹';
  if (value >= max / 3) return '栄養不足';
  return '飢餓';
}

export function hungerStrengthMultiplier(actorOrHunger) {
  const hunger = typeof actorOrHunger === 'object' ? actorOrHunger?.hunger : actorOrHunger;
  const value = Number(hunger);
  const ratio = Math.max(0, Math.min(1, (Number.isFinite(value) ? value : HUNGER_START) / HUNGER_MAX));
  if (ratio >= 2 / 3) return 1;
  return Math.max(0.35, 1 - 0.65 * (2 / 3 - ratio) / (2 / 3));
}

export function effectiveStrength(actor) {
  const strength = Number(actor?.skills?.strength);
  return (Number.isFinite(strength) ? strength : 0) * hungerStrengthMultiplier(actor);
}

function foodNutrition(item) {
  if (Number.isFinite(item?.nutrition)) return Math.max(1, item.nutrition);
  return DISHES[item?.id]?.nutrition || ITEMS[item?.id]?.nutrition || 0;
}

function eatInventoryFood(actor) {
  const candidates = [];
  const visited = new Set();
  const collect = (items) => {
    if (!Array.isArray(items)) return;
    items.forEach((item, index) => {
      if (!item || typeof item !== 'object' || visited.has(item)) return;
      visited.add(item);
      candidates.push({ item, index, container: items, nutrition: foodNutrition(item) });
      collect(item.contents);
    });
  };
  collect(actor.inv);
  collect(actor.equip?.backpack?.contents);
  const chosen = candidates.filter((entry) => entry.nutrition > 0 && Number(entry.item.n) > 0)
    .sort((a, b) => a.nutrition - b.nutrition || a.index - b.index)[0];
  if (!chosen) return 0;
  chosen.item.n -= 1;
  if (chosen.item.n <= 0) chosen.container.splice(chosen.index, 1);
  return chosen.nutrition;
}

function updateHunger(state, events) {
  for (const actor of state.actors) {
    const before = typeof actor.hunger === 'number' ? actor.hunger : HUNGER_START;
    const restingOrDown = !!actor.resting || actor.state === 'down' || actor.state === 'getup';
    let hunger = before - HUNGER_PER_TICK * (restingOrDown ? 1 / 3 : 1);
    if (hunger > HUNGER_MAX) hunger = HUNGER_MAX;

    const food = typeof actor.food === 'number' ? actor.food : 0;
    const canEat = actor.state !== 'down' && actor.state !== 'getup' && actor.state !== 'dead';
    if (canEat && hunger < HUNGER_EAT_BELOW) {
      let nutrition = eatInventoryFood(actor);
      // 町の者（住人・衛兵）と町の中にいる者は、町の食料庫から食べる（updateTownFood が買って補充する）
      if (!nutrition && actor.faction !== 'player') nutrition = eatFromTownLarder(state, actor);
      // 古いセーブの数値食料は従来の40未満で食べる。品物は5/6で先に食べる。
      if (!nutrition && hunger < HUNGER_EAT_GAIN && food > 0) {
        actor.food = food - 1;
        nutrition = HUNGER_EAT_GAIN;
      }
      if (nutrition > 0) {
        hunger = Math.min(HUNGER_MAX, hunger + nutrition);
        events.push(makeEvent(state, 'eat', actor.name + 'は食事をした'));
      }
    }
    if (hunger < 0) {
      actor.hunger = 0;
      kill(state, actor, events, 'は飢えて死んだ');
      continue;
    }
    actor.hunger = hunger;

    if (actor.state === 'dead') continue;
    if (hunger < HUNGER_STARVE_BELOW && isStanding(actor) && ((state.tick + Number(actor.id || 0) * 131) % 2400 === 0)) {
      actor.state = 'down';
      actor.downTicks = Math.max(Number(actor.downTicks) || 0, 80);
      actor.targetId = null;
      actor.moveTo = null;
      stopRest(actor);
      events.push(makeEvent(state, 'down', actor.name + 'は飢えで気を失った'));
    }
    if (hunger > 0) continue;

    actor.parts.chest.hp = Math.max(0, actor.parts.chest.hp - HUNGER_STARVE_DAMAGE);
    actor.parts.stomach.hp = Math.max(0, actor.parts.stomach.hp - HUNGER_STARVE_DAMAGE);
    const last = typeof actor.hungerLogTick === 'number' ? actor.hungerLogTick : -HUNGER_WARN_TICKS;
    if (state.tick - last >= HUNGER_WARN_TICKS) {
      actor.hungerLogTick = state.tick;
      events.push(makeEvent(state, 'starve', actor.name + 'は飢えている'));
    }
  }
}

export function updateNeeds(state, events) {
  if (!state || !Array.isArray(state.actors)) return;
  const list = events || [];
  for (const actor of state.actors) updateGrowth(actor);
  updateMeat(state, list);
  updateHunger(state, list);
}
