// 部位HP、出血、気絶・起き上がり・死。

import { PART_KEYS, PART_MAX, PART_LABEL, VITALS, setAnim, makeEvent, BLEED_PER_DAMAGE } from './data.js';
import { drop } from './carry.js';
import { koPoint, TUNING } from './melee.js';

export function isStanding(actor) {
  return actor.state === 'idle' || actor.state === 'move' || actor.state === 'fight';
}

export function isVitalZero(actor) {
  for (const key of VITALS) {
    if (actor.parts[key].hp <= 0) return true;
  }
  return false;
}

function chooseSuccessor(state, deadActor) {
  const living = (current) =>
    current &&
    current.faction === 'player' &&
    current.state !== 'dead' &&
    current.id !== deadActor.id;
  const ids = Array.isArray(state.squadIds) && state.squadIds.length > 0 ? state.squadIds : [];
  const at = ids.indexOf(deadActor.id);
  for (let step = 1; step <= ids.length; step += 1) {
    const id = ids[(at + step + ids.length) % ids.length];
    const actor = state.actors.find((entry) => entry.id === id);
    if (living(actor)) return actor;
  }
  for (const actor of state.actors) {
    if (living(actor)) return actor;
  }
  return null;
}

function handleSquadDeath(state, actor, events) {
  const wasPlayer = actor.isPlayer;
  const living = state.actors.filter(
    (other) => other.faction === 'player' && other.state !== 'dead'
  );
  if (living.length === 0) {
    state.gameOver = true;
    events.push(makeEvent(state, 'wipe', '部隊は全滅した'));
    return;
  }
  if (!wasPlayer && actor.id !== state.playerId) return;
  const next = chooseSuccessor(state, actor);
  if (!next) return;
  actor.isPlayer = false;
  next.isPlayer = true;
  state.playerId = next.id;
  events.push(makeEvent(state, 'transfer', '操作を' + next.name + 'に移した'));
}

function kill(state, actor, events) {
  if (actor.state === 'dead') return;
  const wasPlayer = actor.isPlayer;
  actor.state = 'dead';
  actor.anim = 'Fall';
  actor.animTick = state.tick;
  actor.targetId = null;
  actor.moveTo = null;
  actor.assistDepth = null;
  actor.bleed = 0;
  events.push(makeEvent(state, 'dead', actor.name + 'は死んだ'));
  if (actor.faction === 'player') handleSquadDeath(state, actor, events);
  else if (wasPlayer) actor.isPlayer = false;
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
    actor.downTicks = Math.max(150, Math.round(400 - actor.skills.toughness * 3));
    actor.anim = 'Fall';
    actor.animTick = state.tick;
    actor.targetId = null;
    actor.moveTo = null;
    events.push(makeEvent(state, 'down', actor.name + 'は気絶した'));
  }
}

// KO点（Kenshi: -10 - 0.75×打たれ強さ、部位体力100あたり）を下回った急所があると「回復昏睡」。
// 急所がすべて0を超えるまで起き上がれない。
function belowKoPoint(actor) {
  const ko = koPoint(actor.skills.toughness || 0) / 100;
  for (const key of VITALS) {
    const part = actor.parts[key];
    if (part.hp < part.max * ko) return true;
  }
  return false;
}

function allVitalsPositive(actor) {
  for (const key of VITALS) if (actor.parts[key].hp <= 0) return false;
  return true;
}

function crucialAtLeast(actor, ratio) {
  for (const key of VITALS) {
    const part = actor.parts[key];
    const max = part.max > 0 ? part.max : PART_MAX[key];
    if (part.hp < max * ratio) return false;
  }
  return true;
}

function lowestVitalRatio(actor) {
  let low = Infinity;
  for (const key of VITALS) {
    const part = actor.parts[key];
    const max = part.max > 0 ? part.max : PART_MAX[key];
    const ratio = max > 0 ? part.hp / max : 1;
    if (ratio < low) low = ratio;
  }
  return low;
}

function checkFlee(state, actor, events) {
  if ((actor.fleeUntil || 0) > state.tick) return;
  const ratio = lowestVitalRatio(actor);
  let ticks = 0;
  if (actor.faction === 'beast' && ratio < 0.5) ticks = 300;
  else if (actor.faction === 'bandit' && ratio < 0.25) ticks = 200;
  if (ticks <= 0) return;
  actor.fleeUntil = state.tick + ticks;
  actor.targetId = null;
  actor.assistDepth = null;
  if (!actor.fleeLogged) {
    actor.fleeLogged = true;
    events.push(makeEvent(state, 'flee', actor.name + 'は逃げ出した'));
  }
}

export function applyDamage(state, victim, partKey, dmg, events, bleedMult = 1) {
  if (victim.state === 'dead') return;
  const part = victim.parts[partKey];
  const before = part.hp;
  part.hp = before - dmg;
  victim.bleed += dmg * BLEED_PER_DAMAGE * bleedMult;
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
      if (!actor.coma && belowKoPoint(actor)) actor.coma = true;
      if (actor.coma && allVitalsPositive(actor)) actor.coma = false;
      const regen = actor.coma ? TUNING.comaRegenPerTick : 0.05;
      for (const key of VITALS) {
        const part = actor.parts[key];
        if (part.hp < part.max * 0.2) {
          part.hp = Math.min(part.max, part.hp + regen);
        }
      }
      if (!actor.coma && actor.downTicks <= 0 && crucialAtLeast(actor, 0.2)) {
        actor.state = 'getup';
        actor.getupTicks = TUNING.getupTicks;
        setAnim(actor, 'GetUp', state.tick);
      }
    } else if (actor.state === 'getup') {
      actor.getupTicks -= 1;
      if (actor.getupTicks <= 0) {
        actor.state = 'idle';
        setAnim(actor, 'Idle', state.tick);
        actor.recoverUntil = state.tick + 200;
        // ログが埋まらないよう、自分の部隊か近く（40m以内）の起き上がりだけ記録する。
        if (getupNearPlayer(state, actor)) {
          events.push(makeEvent(state, 'getup', actor.name + 'は起き上がった'));
        }
      }
    } else {
      checkFlee(state, actor, events);
      if (actor.targetId === null && (actor.hunger === undefined || actor.hunger >= 25)) {
        for (const key of PART_KEYS) {
          const part = actor.parts[key];
          if (part.hp < part.max) {
            part.hp = Math.min(part.max, part.hp + 0.01);
          }
        }
      }
    }
  }
}

function getupNearPlayer(state, actor) {
  if (actor.faction === 'player') return true;
  let player = null;
  for (const entry of state.actors) {
    if (entry.id === state.playerId) {
      player = entry;
      break;
    }
  }
  if (!player) return true;
  const dx = actor.x - player.x;
  const dz = actor.z - player.z;
  return dx * dx + dz * dz <= 1600;
}
