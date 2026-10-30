// 担ぐ・下ろす・相棒の付き添いと担ぎ上げ。

import {
  CARRY_RANGE,
  WORLD_HALF,
  VISION,
  isHostile,
  distBetween,
  indexActors,
  makeEvent,
} from './data.js';
import { resolveCircle } from './collide.js';

function clampWorld(v) {
  if (v < -WORLD_HALF + 1) return -WORLD_HALF + 1;
  if (v > WORLD_HALF - 1) return WORLD_HALF - 1;
  return v;
}

function isCarriable(actor) {
  return !!actor && (actor.state === 'down' || actor.state === 'dead');
}

function findById(state, id) {
  for (const actor of state.actors) {
    if (actor.id === id) return actor;
  }
  return null;
}

function placeBeside(state, target, x, z, rot) {
  const sideX = Math.cos(rot);
  const sideZ = -Math.sin(rot);
  const safe = resolveCircle(state, x + sideX, z + sideZ, 0.4);
  target.x = clampWorld(safe.x);
  target.z = clampWorld(safe.z);
}

export function pickup(state, carrier, target, events) {
  if (!carrier || !target) return false;
  if (carrier === target) return false;
  if (carrier.carryingId !== null) return false;
  if (target.carriedBy !== null) return false;
  if (carrier.state === 'dead' || carrier.state === 'down' || carrier.state === 'getup') {
    return false;
  }
  if (!isCarriable(target)) return false;
  if (target.bound) return false; // 杭に縛られている者は、先に縄を解く
  if (distBetween(carrier, target) > CARRY_RANGE + 0.1) return false;

  carrier.carryingId = target.id;
  carrier.carryTargetId = null;
  carrier.carryHome = false;
  carrier.targetId = null;
  carrier.moveTo = null;
  target.carriedBy = carrier.id;
  target.targetId = null;
  target.moveTo = null;
  target.x = carrier.x;
  target.z = carrier.z;

  if (events) {
    events.push(makeEvent(state, 'carry', carrier.name + 'は' + target.name + 'を担いだ'));
  }
  return true;
}

export function drop(state, carrier, events) {
  if (!carrier || carrier.carryingId === null) return false;
  const target = findById(state, carrier.carryingId);
  carrier.carryingId = null;
  carrier.carryTargetId = null;
  carrier.carryHome = false;
  if (!target) return false;
  if (target.carriedBy !== carrier.id) return false;
  target.carriedBy = null;
  placeBeside(state, target, carrier.x, carrier.z, carrier.rot || 0);
  if (events) {
    events.push(makeEvent(state, 'drop', carrier.name + 'は' + target.name + 'を下ろした'));
  }
  return true;
}

export function syncCarried(state) {
  const byId = indexActors(state);
  for (const actor of state.actors) {
    if (actor.carriedBy === null) continue;
    const carrier = byId.get(actor.carriedBy);
    if (!carrier) {
      actor.carriedBy = null;
      continue;
    }
    actor.x = carrier.x;
    actor.z = carrier.z;
  }
}

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

function companionOf(state) {
  if (!state.squadIds || state.squadIds.length < 2) return null;
  return findById(state, state.squadIds[1]);
}

export function updateCompanionCarry(state) {
  const companion = companionOf(state);
  if (!companion) return;
  if (companion.isPlayer) return;
  if (companion.state === 'dead' || companion.state === 'down' || companion.state === 'getup') {
    companion.carryTargetId = null;
    return;
  }
  if (companion.carryingId !== null) {
    companion.carryTargetId = null;
    return;
  }
  if (companion.targetId !== null || (companion.fleeUntil || 0) > state.tick) {
    companion.carryTargetId = null;
    return;
  }
  if (hostileNear(state, companion, VISION[companion.faction] || VISION.player)) {
    companion.carryTargetId = null;
    return;
  }

  if (companion.carryTargetId !== null) {
    const current = findById(state, companion.carryTargetId);
    if (
      !current ||
      current.id === companion.id ||
      current.faction !== 'player' ||
      current.state !== 'down' ||
      current.carriedBy !== null
    ) {
      companion.carryTargetId = null;
    } else {
      return;
    }
  }

  let best = null;
  let bestDist = Infinity;
  for (const other of state.actors) {
    if (other.id === companion.id) continue;
    if (other.faction !== 'player') continue;
    if (other.state !== 'down') continue;
    if (other.carriedBy !== null) continue;
    const d = distBetween(companion, other);
    if (d > 30) continue;
    if (d < bestDist || (d === bestDist && best && other.id < best.id)) {
      best = other;
      bestDist = d;
    }
  }
  if (best) companion.carryTargetId = best.id;
}

export function updateCarry(state, events) {
  const byId = indexActors(state);

  for (const actor of state.actors) {
    if (actor.carryingId === null) continue;
    const target = byId.get(actor.carryingId);
    if (!target || target.carriedBy !== actor.id) {
      actor.carryingId = null;
      actor.carryHome = false;
      continue;
    }
    if (actor.state === 'dead' || actor.state === 'down' || actor.state === 'getup') {
      drop(state, actor, events);
      continue;
    }
    if (!isCarriable(target)) {
      drop(state, actor, events);
      continue;
    }
    target.x = actor.x;
    target.z = actor.z;
  }

  for (const actor of state.actors) {
    if (actor.carryTargetId === null) continue;
    if (actor.state === 'dead' || actor.state === 'down' || actor.state === 'getup') {
      actor.carryTargetId = null;
      continue;
    }
    if (actor.carryingId !== null) {
      actor.carryTargetId = null;
      continue;
    }
    const target = byId.get(actor.carryTargetId);
    if (!target || target.id === actor.id || !isCarriable(target)) {
      actor.carryTargetId = null;
      continue;
    }
    if (target.carriedBy !== null && target.carriedBy !== actor.id) {
      actor.carryTargetId = null;
      continue;
    }
    if (distBetween(actor, target) <= CARRY_RANGE) {
      pickup(state, actor, target, events);
    }
  }

  syncCarried(state);
}
