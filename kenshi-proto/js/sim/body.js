// 部位HP、出血、気絶・起き上がり・死。

import { PART_KEYS, PART_LABEL, VITALS, setAnim, makeEvent } from './data.js';

export function isStanding(actor) {
  return actor.state === 'idle' || actor.state === 'move' || actor.state === 'fight';
}

export function isVitalZero(actor) {
  for (const key of VITALS) {
    if (actor.parts[key].hp <= 0) return true;
  }
  return false;
}

function kill(state, actor, events) {
  if (actor.state === 'dead') return;
  actor.state = 'dead';
  actor.anim = 'Fall';
  actor.animTick = state.tick;
  actor.targetId = null;
  actor.moveTo = null;
  actor.assistDepth = null;
  actor.bleed = 0;
  events.push(makeEvent(state, 'dead', actor.name + 'は死んだ'));
  if (actor.isPlayer) {
    state.gameOver = true;
    events.push(makeEvent(state, 'player_dead', '流れ者は死んだ'));
  }
}

export function checkCondition(state, actor, events) {
  if (actor.state === 'dead') return;
  let dead = false;
  for (const key of VITALS) {
    const part = actor.parts[key];
    if (part.hp <= -part.max) dead = true;
  }
  if (dead) {
    kill(state, actor, events);
    return;
  }
  if (isVitalZero(actor) && actor.state !== 'down') {
    actor.state = 'down';
    actor.downTicks = Math.max(80, Math.round(200 - actor.skills.toughness));
    actor.anim = 'Fall';
    actor.animTick = state.tick;
    actor.targetId = null;
    actor.moveTo = null;
    events.push(makeEvent(state, 'down', actor.name + 'は気絶した'));
  }
}

export function applyDamage(state, victim, partKey, dmg, events) {
  if (victim.state === 'dead') return;
  const part = victim.parts[partKey];
  const before = part.hp;
  part.hp = before - dmg;
  victim.bleed += dmg * 0.03;
  if (
    before > 0 &&
    part.hp <= 0 &&
    (partKey === 'lArm' || partKey === 'rArm' || partKey === 'lLeg' || partKey === 'rLeg')
  ) {
    events.push(
      makeEvent(state, 'limb', victim.name + 'の' + PART_LABEL[partKey] + 'が使えなくなった')
    );
  }
  checkCondition(state, victim, events);
}

export function updateBody(state, events) {
  for (const actor of state.actors) {
    if (actor.state === 'dead') continue;

    if (actor.bleed > 0) {
      const b = actor.bleed;
      actor.parts.chest.hp -= b * 0.02;
      actor.parts.stomach.hp -= b * 0.02;
      actor.bleed = b * 0.997;
      if (actor.bleed < 0.0005) actor.bleed = 0;
    }

    let dead = false;
    for (const key of VITALS) {
      const part = actor.parts[key];
      if (part.hp <= -part.max) dead = true;
    }
    if (dead) {
      kill(state, actor, events);
      continue;
    }

    if (actor.state === 'down') {
      if (actor.downTicks > 0) actor.downTicks -= 1;
      for (const key of VITALS) {
        if (actor.parts[key].hp <= 0) actor.parts[key].hp += 0.05;
      }
      if (
        actor.downTicks <= 0 &&
        actor.parts.head.hp > 0 &&
        actor.parts.chest.hp > 0 &&
        actor.parts.stomach.hp > 0
      ) {
        actor.state = 'getup';
        actor.getupTicks = 20;
        setAnim(actor, 'GetUp', state.tick);
      }
    } else if (actor.state === 'getup') {
      actor.getupTicks -= 1;
      if (actor.getupTicks <= 0) {
        actor.state = 'idle';
        setAnim(actor, 'Idle', state.tick);
        events.push(makeEvent(state, 'getup', actor.name + 'は起き上がった'));
      }
    } else if (actor.targetId === null) {
      for (const key of PART_KEYS) {
        const part = actor.parts[key];
        if (part.hp < part.max) {
          part.hp = Math.min(part.max, part.hp + 0.01);
        }
      }
    }
  }
}
