// 攻撃判定、攻撃枠（同時3人まで）、加勢、成長。

import {
  WEAPONS,
  PART_KEYS,
  PART_WEIGHTS,
  ATTACK_SLOT_LIMIT,
  isHostile,
  distBetween,
  indexActors,
  countTargeters,
  setAnim,
  makeEvent,
} from './data.js';
import { rand, randRange, chance } from './rng.js';
import { applyDamage, isStanding } from './body.js';

function clamp(v, lo, hi) {
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}

function pickPart(state, weights) {
  const total = weights.total;
  let r = rand(state) * total;
  for (const key of PART_KEYS) {
    r -= weights[key];
    if (r <= 0) return key;
  }
  return 'chest';
}

function growSkill(actor, key, base, opponentValue) {
  const own = actor.skills[key];
  let mult = 1;
  if (opponentValue > own) {
    mult = Math.min(4, 1 + (opponentValue - own) / 20);
  }
  actor.skills[key] = Math.min(100, own + base * mult);
}

export function requestAssist(state, victim, attacker, events) {
  if (victim.assistDepth === null) victim.assistDepth = 0;
  if (victim.assistDepth >= 2) return;
  const wave = victim.assistDepth + 1;
  const joined = [];
  for (const ally of state.actors) {
    if (ally.id === victim.id) continue;
    if (ally.faction !== victim.faction) continue;
    if (!isStanding(ally)) continue;
    if (ally.assistDepth !== null) continue;
    if (distBetween(ally, victim) > 25) continue;
    ally.assistDepth = wave;
    if (countTargeters(state, attacker.id, ally.id) < ATTACK_SLOT_LIMIT) {
      ally.targetId = attacker.id;
      ally.state = 'fight';
    }
    joined.push(ally);
  }
  if (joined.length > 0) notifyAssist(state, joined, events);
  if (wave === 1) {
    for (const ally of joined) {
      if (ally.assistDepth !== 1) continue;
      assistWave2(state, ally, attacker, events);
    }
  }
}

function assistWave2(state, center, attacker, events) {
  const joined = [];
  for (const ally of state.actors) {
    if (ally.id === center.id) continue;
    if (ally.faction !== center.faction) continue;
    if (!isStanding(ally)) continue;
    if (ally.assistDepth !== null) continue;
    if (distBetween(ally, center) > 25) continue;
    ally.assistDepth = 2;
    if (countTargeters(state, attacker.id, ally.id) < ATTACK_SLOT_LIMIT) {
      ally.targetId = attacker.id;
      ally.state = 'fight';
    }
    joined.push(ally);
  }
  if (joined.length > 0) notifyAssist(state, joined, events);
}

function notifyAssist(state, joined, events) {
  const seen = {};
  for (const actor of joined) {
    if (!actor.squadId) continue;
    if (seen[actor.squadId]) continue;
    seen[actor.squadId] = true;
    let squad = null;
    for (const sq of state.squads) {
      if (sq.id === actor.squadId) squad = sq;
    }
    if (!squad || squad.assistNotified) continue;
    squad.assistNotified = true;
    events.push(makeEvent(state, 'assist', actor.name + 'たちが加勢した'));
  }
}

export function resetAssists(state) {
  const active = {};
  for (const actor of state.actors) {
    if (actor.assistDepth === null) continue;
    if (actor.state === 'dead' || actor.state === 'down' || actor.targetId === null) {
      actor.assistDepth = null;
      continue;
    }
    if (actor.squadId) active[actor.squadId] = true;
  }
  for (const sq of state.squads) {
    if (!active[sq.id]) sq.assistNotified = false;
  }
}

export function trimAttackSlots(state) {
  const counts = new Map();
  for (const actor of state.actors) {
    if (actor.state === 'dead') {
      actor.targetId = null;
      continue;
    }
    if (actor.targetId === null) continue;
    const n = counts.get(actor.targetId) || 0;
    if (n >= ATTACK_SLOT_LIMIT) {
      actor.targetId = null;
      if (actor.state === 'fight') actor.state = 'idle';
      if (actor.assistDepth !== null) actor.assistDepth = null;
      continue;
    }
    counts.set(actor.targetId, n + 1);
  }
}

function doAttack(state, attacker, target, events) {
  const weapon = WEAPONS[attacker.weapon];
  let min = weapon.min;
  let max = weapon.max;
  if (attacker.weapon === 'fists') {
    if (attacker.parts.lArm.hp <= 0 && attacker.parts.rArm.hp <= 0) {
      min *= 0.5;
      max *= 0.5;
    }
  } else if (attacker.weapon === 'sword' || attacker.weapon === 'machete') {
    if (attacker.parts.rArm.hp <= 0) {
      min *= 0.5;
      max *= 0.5;
    }
  }

  attacker.attackCd = Math.round(16 - attacker.skills.dexterity * 0.05);
  setAnim(
    attacker,
    attacker.weapon === 'fists' || attacker.weapon === 'bite' ? 'Punch' : 'Attack',
    state.tick
  );
  attacker.state = 'fight';

  if (
    target.isPlayer &&
    isStanding(target) &&
    target.targetId === null &&
    target.moveTo === null
  ) {
    target.targetId = attacker.id;
    target.state = 'fight';
  }

  if (target.assistDepth === null) target.assistDepth = 0;
  requestAssist(state, target, attacker, events);

  const hitRate = clamp(
    0.6 + (attacker.skills.attack - target.skills.defense) * 0.01,
    0.1,
    0.95
  );
  if (!chance(state, hitRate)) {
    growSkill(target, 'defense', 0.01, attacker.skills.attack);
    return;
  }

  const partKey = pickPart(state, PART_WEIGHTS);
  const raw = randRange(state, min, max);
  const dmg =
    raw *
    (1 + attacker.skills.strength * 0.004) *
    (1 - target.skills.toughness * 0.004);
  applyDamage(state, target, partKey, dmg, events);
  growSkill(attacker, 'attack', 0.01, target.skills.defense);
  growSkill(target, 'toughness', 0.02, attacker.skills.attack);
  target.lastAttackerId = attacker.id;
}

export function resolveCombat(state, events) {
  const byId = indexActors(state);
  for (const actor of state.actors) {
    if (actor.state === 'dead') continue;
    if (actor.attackCd > 0) actor.attackCd -= 1;
    if (actor.state === 'down' || actor.state === 'getup') continue;
    if (actor.targetId === null) continue;

    const target = byId.get(actor.targetId);
    if (!target) {
      actor.targetId = null;
      actor.state = 'idle';
      continue;
    }
    if (target.state === 'dead') {
      actor.targetId = null;
      actor.state = 'idle';
      continue;
    }
    if (
      (target.state === 'down' || target.state === 'getup') &&
      actor.faction !== 'beast' &&
      !actor.isPlayer
    ) {
      actor.targetId = null;
      actor.state = 'idle';
      continue;
    }
    const d = distBetween(actor, target);
    if (d > 30 && !actor.isPlayer) {
      actor.targetId = null;
      actor.state = 'idle';
      continue;
    }
    const range = WEAPONS[actor.weapon].range;
    if (d > range) continue;
    if (actor.attackCd > 0) continue;
    if (countTargeters(state, target.id, actor.id) >= ATTACK_SLOT_LIMIT) continue;
    doAttack(state, actor, target, events);
  }
}
