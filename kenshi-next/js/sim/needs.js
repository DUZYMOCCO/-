// 使って伸びる能力、空腹、食料、獣の肉。

import { dist2, makeEvent } from './data.js';
import { isStanding } from './body.js';

export const HUNGER_START = 80;
export const HUNGER_MAX = 100;
export const HUNGER_PER_TICK = 100 / 43200;
export const HUNGER_EAT_BELOW = 40;
export const HUNGER_EAT_GAIN = 40;
export const HUNGER_WEAK_BELOW = 25;
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

function updateHunger(state, events) {
  for (const actor of state.actors) {
    const before = typeof actor.hunger === 'number' ? actor.hunger : HUNGER_START;
    let hunger = before - HUNGER_PER_TICK;
    if (hunger < 0) hunger = 0;
    if (hunger > HUNGER_MAX) hunger = HUNGER_MAX;

    const food = typeof actor.food === 'number' ? actor.food : 0;
    const canEat = actor.state !== 'down' && actor.state !== 'dead';
    if (canEat && hunger < HUNGER_EAT_BELOW && food > 0) {
      actor.food = food - 1;
      hunger = Math.min(HUNGER_MAX, hunger + HUNGER_EAT_GAIN);
      events.push(makeEvent(state, 'eat', actor.name + 'は食事をした'));
    }
    actor.hunger = hunger;

    if (actor.state === 'dead') continue;
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
