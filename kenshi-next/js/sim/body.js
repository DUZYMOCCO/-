// 部位HP、出血、気絶・起き上がり・死。

import { PART_KEYS, PART_MAX, PART_LABEL, VITALS, setAnim, beastRules, makeEvent, BLEED_PER_DAMAGE } from './data.js';
import { drop } from './carry.js';
import { koLine } from './lines.js';
import { koPoint, TUNING } from './melee.js';
import { addWound, effMax, restPlace, stopRest } from './rest.js';
import { raceOf } from './races.js';
import { MARTIAL_GET_UPS } from '../data/martial_moves.js';
import { armUsable, reconcileGrip } from './grip.js';
import { martialGetUpClip, martialGetUpRate, martialRecoveryLevel, martialRecoveryTicks } from './martial_recovery.js';
import { removeDeadSquadMember } from './squads.js';

// 気絶の長さ（Kenshi の式。kenshi.zone/en/knockout-death「Knockout time」）。秒 → 刻は ×10 × KO_TIME_SCALE。
// M = 3.0 + (0.75 − 3.0) × 打たれ強さ/100
// 秒 = 20 + Σ急所 (最大 − 体力)/最大×100 × M × 0.25 + Σ負の部位 |体力|/最大×100 × M × 係数（頭2・胸腹1・手足0.5）
//      + (最大の血 − 血)/最大の血×100 × M × 0.25 × 2
export const KO_TIME_SCALE = 0.3; // ★この世界の戦いは Kenshi より短いので 3割に縮める
export const FESTER_TIME_SCALE = 1 / KO_TIME_SCALE;
const TICK_SEC = 0.1;
const KO_PART_FACTOR = { head: 2, chest: 1, stomach: 1, lArm: 0.5, rArm: 0.5, lLeg: 0.5, rLeg: 0.5 };
export function koSeconds(actor) {
  const t = Math.max(0, Math.min(100, (actor.skills && actor.skills.toughness) || 0));
  const m = 3.0 + (0.75 - 3.0) * t / 100;
  let sec = 20;
  for (const key of VITALS) {
    const p = actor.parts[key];
    const max = p.max > 0 ? p.max : PART_MAX[key];
    const hp = p.hp - (Number(p.stun) || 0);
    sec += Math.max(0, (max - hp) / max * 100) * m * 0.25;
  }
  for (const key of PART_KEYS) {
    const p = actor.parts[key];
    const hp = p ? p.hp - (Number(p.stun) || 0) : 0;
    if (!p || hp >= 0 || isMissing(actor, key)) continue;
    const max = p.max > 0 ? p.max : PART_MAX[key];
    sec += Math.min(-hp, max) / max * 100 * m * KO_PART_FACTOR[key];
  }
  sec += Math.max(0, (BLOOD_MAX - bloodOf(actor)) / BLOOD_MAX * 100) * m * 0.25 * 2;
  return sec;
}
export function koTicks(actor) {
  return Math.round(koSeconds(actor) * 10 * KO_TIME_SCALE);
}

// 血の量（0〜100）。出血1あたり毎刻 BLOOD_PER_BLEED 減る。★仮の値（research/abduction_recruit.md §6・§7）
export const BLOOD_MAX = 100;
export const BLOOD_PER_BLEED = 0.015;
export const BLOOD_KO = 30;
export const BLOOD_REKO = 0;
export const BLOOD_WAKE = 0;
export const BLOOD_DEATH = 0;
export const BLOOD_REGEN = 0.01; // 出血がほぼ止まっている時の戻り（毎刻）
export const LIMB_LOSS_BLEED = 0.5; // 手足を失った時に普通の出血にも足す分
// 大出血（gush）: 手足を失うと +1。毎刻 gush*GUSH_BLOOD の血を失い、×GUSH_DECAY で弱まる。
// 手当てしなければ1本で最大120ほど血を失い、即時損失と合わせて人は死に至る。
export const LIMB_LOSS_GUSH = 1;
export const GUSH_BLOOD = 0.12;
export const GUSH_DECAY = 0.999;
export const LIMB_KEYS = ['lArm', 'rArm', 'lLeg', 'rLeg'];

export function bloodOf(actor) {
  return typeof actor.blood === 'number' ? actor.blood : BLOOD_MAX;
}

export function koStatusText(actor) {
  if (!actor || !['down', 'getup'].includes(actor.state)) return '';
  if (actor.injuryDying) return '瀕死';
  if (actor.injuryCritical) return '危篤';
  if (actor.coma) return '回復昏睡';
  if (bloodOf(actor) < BLOOD_WAKE) return '気絶';
  if (actor.state === 'getup') return '起き上がり中';
  return `気絶 ${Math.ceil(Math.max(0, Number(actor.downTicks) || 0) / 10)}秒`;
}

export function isMissing(actor, key) {
  return Array.isArray(actor.missing) && actor.missing.includes(key);
}

// 手足を失う（戻らない）。大出血が始まる。右腕なら武器が持てない。
export function severLimb(state, actor, key, events, how) {
  if (!LIMB_KEYS.includes(key) || isMissing(actor, key)) return false;
  if (!Array.isArray(actor.missing)) actor.missing = [];
  actor.missing.push(key);
  const part = actor.parts[key];
  part.hp = -part.max;
  actor.bleed = (actor.bleed || 0) + LIMB_LOSS_BLEED;
  actor.gush = (actor.gush || 0) + LIMB_LOSS_GUSH;
  actor.stumpBleed = (actor.stumpBleed || 0) + LIMB_LOSS_BLEED;
  actor.blood = Math.max(BLOOD_DEATH, bloodOf(actor) - 12);
  actor.limbLossBleed ||= {};
  actor.limbLossGush ||= {};
  actor.limbLossBleed[key] = (actor.limbLossBleed[key] || 0) + LIMB_LOSS_BLEED;
  actor.limbLossGush[key] = (actor.limbLossGush[key] || 0) + LIMB_LOSS_GUSH;
  if (key === 'lArm' || key === 'rArm') reconcileGrip(state, actor, events);
  if ((key === 'lLeg' || key === 'rLeg') && !hasProstheticLeg(actor) && !['dead', 'down', 'getup'].includes(actor.state)) {
    actor.crawling = true;
    actor.crawlStartedTick = state.tick;
    actor.moveTo = null;
    actor.targetId = null;
    actor.state = 'idle';
    actor.anim = 'Crawl';
    actor.animTick = state.tick;
  }
  if (events) {
    events.push(makeEvent(state, 'limb', actor.name + 'の' + PART_LABEL[key] + (how || 'がちぎれた')));
  }
  return true;
}

function hasProstheticLeg(actor) {
  return !!(actor.prostheticLeg || actor.prosthetics?.leg || actor.equipment?.prostheticLeg ||
    ['prosthetic_leg', 'iron_prosthetic_leg'].includes(actor.equip?.prosthetic));
}

export function armsLeft(actor) {
  return Number(armUsable(actor, 'left')) + Number(armUsable(actor, 'right'));
}

export function isStanding(actor) {
  return !actor.crawling && (actor.state === 'idle' || actor.state === 'move' || actor.state === 'fight');
}

export function isVitalZero(actor) {
  for (const key of VITALS) {
    if (actor.parts[key].hp - (Number(actor.parts[key].stun) || 0) <= 0) return true;
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

export function kill(state, actor, events, why) {
  if (actor.state === 'dead') return;
  const wasPlayer = actor.isPlayer;
  actor.state = 'dead';
  stopRest(actor);
  actor.anim = 'Fall';
  actor.animTick = state.tick;
  actor.targetId = null;
  actor.moveTo = null;
  actor.martialPair = null;
  actor.assistDepth = null;
  actor.bleed = 0;
  actor.stumpBleed = 0;
  events.push(makeEvent(state, 'dead', actor.name + (why || 'は死んだ')));
  if (actor.faction === 'player') handleSquadDeath(state, actor, events);
  else if (wasPlayer) actor.isPlayer = false;
  if (actor.faction === 'player') removeDeadSquadMember(state, actor.id);
}

export function checkCondition(state, actor, events) {
  if (actor.state === 'dead') return;
  let dead = false;
  for (const key of VITALS) {
    const part = actor.parts[key];
    if (part.hp - (Number(part.stun) || 0) <= -part.max) dead = true;
  }
  if (dead) {
    kill(state, actor, events);
    return;
  }
  if (isVitalZero(actor) && actor.state !== 'down') knockOut(state, actor, events);
}

function knockOut(state, actor, events, why) {
  {
    actor.state = 'down';
    actor.downTicks = koTicks(actor);
    stopRest(actor);
    actor.anim = 'Fall';
    actor.animTick = state.tick;
    actor.downPose = 'prone';
    actor.maDownClip = 'Knocked Out';
    actor.maDownPlayFrom = 0;
    actor.martialRecovery = false;
    actor.maGetUpRate = 1;
    actor.maGetUpPlayFrom = 0;
    actor.targetId = null;
    actor.moveTo = null;
    events.push(makeEvent(state, 'down', actor.name + (why || 'は気絶した')));
    koLine(state, actor, events, 'ko');
  }
}

// KO点（Kenshi: -10 - 0.75×打たれ強さ、部位体力100あたり）を下回った急所があると「回復昏睡」。
// 急所がすべて0を超えるまで起き上がれない。
function belowKoPoint(actor) {
  const ko = koPoint(actor.skills.toughness || 0) / 100;
  for (const key of VITALS) {
    const part = actor.parts[key];
    if (part.hp - (Number(part.stun) || 0) < part.max * ko) return true;
  }
  return false;
}

function allVitalsPositive(actor) {
  for (const key of VITALS) if (actor.parts[key].hp - (Number(actor.parts[key].stun) || 0) <= 0) return false;
  return true;
}

function lowestVitalRatio(actor) {
  let low = Infinity;
  for (const key of VITALS) {
    const part = actor.parts[key];
    const max = part.max > 0 ? part.max : PART_MAX[key];
    const ratio = max > 0 ? (part.hp - (Number(part.stun) || 0)) / max : 1;
    if (ratio < low) low = ratio;
  }
  return low;
}

function checkFlee(state, actor, events) {
  if ((actor.fleeUntil || 0) > state.tick) return;
  const ratio = lowestVitalRatio(actor);
  let ticks = 0;
  if (beastRules(actor) && !actor.machine && ratio < 0.5) ticks = 300; // 機械は逃げない
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

export function applyDamage(state, victim, partKey, dmg, events, bleedMult = 1, stunDamage = 0) {
  if (victim.state === 'dead') return;
  if (isMissing(victim, partKey)) return;
  if ((victim.martialThrowShieldUntil || 0) >= state.tick && (victim.martialThrowShieldLevel || 0) >= 50) return;
  const part = victim.parts[partKey];
  const blunt = Math.max(0, Math.min(dmg, Number(stunDamage) || 0));
  const cut = dmg - blunt;
  const before = part.hp;
  part.hp = before - cut;
  if (blunt > 0) part.stun = Math.max(0, Number(part.stun) || 0) + blunt;
  addWound(victim, part, cut); // 傷の半分は休まないと治らない（rest.js）
  if (victim.resting) stopRest(victim);
  victim.bleed += dmg * BLEED_PER_DAMAGE * bleedMult * (raceOf(victim)?.bleed ?? 1);
  if (
    before > 0 && cut > 0 &&
    part.hp <= 0 &&
    (partKey === 'lArm' || partKey === 'rArm' || partKey === 'lLeg' || partKey === 'rLeg')
  ) {
    events.push(
      makeEvent(state, 'limb', victim.name + 'の' + PART_LABEL[partKey] + 'が使えなくなった')
    );
  }
  if (part.hp <= -part.max && LIMB_KEYS.includes(partKey) && victim.faction !== 'beast') {
    severLimb(state, victim, partKey, events);
  }
  if (partKey === 'lArm' || partKey === 'rArm') reconcileGrip(state, victim, events);
  checkCondition(state, victim, events);
}

export function updateBody(state, events) {
  for (const actor of state.actors) {
    if (actor.state === 'dead') continue;

    for (const part of Object.values(actor.parts || {})) {
      if (!Number.isFinite(part.stun)) part.stun = 0;
      if (!Number.isFinite(part.treated)) part.treated = 0;
    }

    if (actor.bleed > 0 || actor.stumpBleed > 0) {
      const b = actor.bleed + (actor.stumpBleed || 0);
      // Kenshi の出血は血だけを減らす（部位の体力は削らない。前は胸・腹も削っていた）
      actor.bleed *= 0.997;
      if (actor.limbLossBleed) for (const key of Object.keys(actor.limbLossBleed)) actor.limbLossBleed[key] *= 0.997;
      if (actor.bleed < 0.0005) actor.bleed = 0;
      actor.blood = bloodOf(actor) - b * BLOOD_PER_BLEED;
    } else if (bloodOf(actor) < BLOOD_MAX && actor.state !== 'down' && !(actor.gush > 0) && !(actor.stumpBleed > 0)) {
      // 寝床では血の戻りが2倍（Kenshi）
      const bedBlood = restPlace(state, actor) === 'ground' ? 1 : 2;
      actor.blood = Math.min(BLOOD_MAX, bloodOf(actor) + BLOOD_REGEN * bedBlood);
    }
    if (actor.gush > 0) {
      actor.blood = bloodOf(actor) - actor.gush * GUSH_BLOOD;
      actor.gush *= GUSH_DECAY;
      if (actor.limbLossGush) for (const key of Object.keys(actor.limbLossGush)) actor.limbLossGush[key] *= GUSH_DECAY;
      if (actor.gush < 0.01) actor.gush = 0;
    }
    if (bloodOf(actor) <= BLOOD_DEATH) {
      actor.blood = BLOOD_DEATH;
      kill(state, actor, events, 'は血を失って死んだ');
      continue;
    }
    if (actor.state === 'down' && bloodOf(actor) <= BLOOD_KO) actor.bloodKnockedOut = true;
    if (bloodOf(actor) < 15 && !actor.dyingSaid) {
      actor.dyingSaid = true;
      koLine(state, actor, events, 'dying');
    } else if (bloodOf(actor) > 40 && actor.dyingSaid) actor.dyingSaid = false;
    const bloodKoLine = actor.bloodKnockedOut ? BLOOD_REKO : BLOOD_KO;
    if (bloodOf(actor) <= bloodKoLine && isStanding(actor)) {
      actor.bloodKnockedOut = true;
      knockOut(state, actor, events, 'は血を失って倒れた');
    }

    let dead = false;
    for (const key of VITALS) {
      const part = actor.parts[key];
      if (part.hp - (Number(part.stun) || 0) <= -part.max) dead = true;
    }
    if (dead) {
      kill(state, actor, events);
      continue;
    }

    if (actor.state === 'down') {
      if (actor.downTicks > 0) actor.downTicks -= 1;
      convertRecoverableDamage(state, actor);
      if (!isInBed(state, actor)) festerActor(state, actor, events);
      if (!actor.coma && belowKoPoint(actor)) actor.coma = true;
      if (actor.coma && allVitalsPositive(actor)) actor.coma = false;
      if (
        !actor.coma &&
        !actor.bound &&
        !actor.abducted &&
        bloodOf(actor) >= BLOOD_WAKE &&
        actor.downTicks <= 0
      ) {
        actor.state = 'getup';
        const recoveryLevel = martialRecoveryLevel(actor);
        const getup = MARTIAL_GET_UPS.find((entry) => entry.startPose === (actor.downPose || 'prone'));
        actor.maGetUpClip = actor.martialRecovery
          ? martialGetUpClip(actor.downPose || 'prone', recoveryLevel, true)
          : getup?.clip || null;
        actor.getupTicks = actor.martialRecovery
          ? martialRecoveryTicks(TUNING.getupTicks, recoveryLevel)
          : TUNING.getupTicks;
        actor.maGetUpRate = actor.martialRecovery
          ? martialGetUpRate(actor.maGetUpClip, actor.getupTicks, true, recoveryLevel)
          : 1;
        actor.maGetUpPlayFrom = 0;
        setAnim(actor, 'GetUp', state.tick);
      }
    } else if (actor.state === 'getup') {
      actor.getupTicks -= 1;
      if (actor.getupTicks <= 0) {
        actor.state = 'idle';
        if (!actor.crawling && !hasProstheticLeg(actor) && (isMissing(actor, 'lLeg') || isMissing(actor, 'rLeg'))) {
          actor.crawling = true;
          actor.crawlStartedTick = state.tick;
        }
        setAnim(actor, actor.crawling ? 'Crawl' : 'Idle', state.tick);
        actor.maGetUpClip = null;
        actor.maDownClip = null;
        actor.maGetUpRate = 1;
        actor.maGetUpPlayFrom = 0;
        actor.martialRecovery = false;
        actor.downPose = null;
        actor.recoverUntil = state.tick + 20;
        // ログが埋まらないよう、自分の部隊か近く（40m以内）の起き上がりだけ記録する。
        if (getupNearPlayer(state, actor)) {
          events.push(makeEvent(state, 'getup', actor.name + 'は起き上がった'));
          if (actor.faction === 'player') koLine(state, actor, events, 'wake');
        }
      }
    } else {
      checkFlee(state, actor, events);
      if (actor.targetId === null && (actor.hunger === undefined || actor.hunger >= 25)) convertRecoverableDamage(state, actor);
      festerActor(state, actor, events);
    }
    refreshInjuryStatus(state, actor);
  }
}

function isInBed(state, actor) {
  return restPlace(state, actor) !== 'ground';
}

function convertRecoverableDamage(state, actor) {
  if (Number(actor.hunger) < 25) return;
  const heal = raceOf(actor)?.heal ?? 1;
  for (const key of PART_KEYS) {
    const part = actor.parts[key];
    if (!part || isMissing(actor, key)) continue;
    const cap = effMax(part);
    const room = Math.max(0, cap - part.hp);
    // A bandage transfers its pending amount on the next body tick.
    const treated = Math.min(room, Math.max(0, part.treated || 0));
    if (treated > 0) {
      part.hp += treated;
      part.treated -= treated;
    }
    const stunPerTick = 0.05 * 0.25 * (part.max / 100) * heal * TICK_SEC;
    part.stun = Math.max(0, (part.stun || 0) - stunPerTick);
  }
}

function festerAmount(actor, part) {
  if (!part || part.max <= 0) return 0;
  const treated = Math.max(0, Number(part.treated) || 0);
  const missingPercent = (part.max - part.hp - treated) / part.max * 100;
  const severity = Math.max(0, Math.min(1, (missingPercent - 20) / 70));
  if (severity <= 0) return 0;
  const scaled = part.hp + treated > 0 ? severity * 0.25 : severity;
  const toughness = Math.max(0, Math.min(100, Number(actor.skills?.toughness) || 0));
  const toughnessRate = 1.7 + (0.03 - 1.7) * toughness / 100;
  const raceRate = raceOf(actor)?.fester ?? actor.festerMult ?? 1;
  return 0.09 * toughnessRate * scaled * raceRate * TICK_SEC * FESTER_TIME_SCALE;
}

function festerActor(state, actor, events) {
  if (actor.state !== 'down' || isInBed(state, actor)) return;
  const frequent = state.frequentInjuries === true || state.injuryFrequency === 'frequent' || state.options?.frequentInjuries === true;
  for (const key of PART_KEYS) {
    const part = actor.parts[key];
    if (!part || isMissing(actor, key) || (actor.machine && !VITALS.includes(key))) continue;
    const amount = festerAmount(actor, part);
    if (amount <= 0) continue;
    part.hp = Math.max(-part.max, part.hp - amount);
    if (frequent && LIMB_KEYS.includes(key) && part.hp <= -part.max && actor.faction !== 'beast') {
      severLimb(state, actor, key, events, 'が傷から壊死した');
    }
  }
}

function refreshInjuryStatus(state, actor) {
  actor.injuryCritical = false;
  actor.injuryDying = false;
  if (actor.state !== 'down' && actor.state !== 'getup') return;
  const bed = isInBed(state, actor);
  let critical = (actor.bleed || 0) + (actor.stumpBleed || 0) > 0 || (actor.gush || 0) > 0;
  const bloodLossPerSec = (((actor.bleed || 0) + (actor.stumpBleed || 0)) * BLOOD_PER_BLEED + (actor.gush || 0) * GUSH_BLOOD) / TICK_SEC;
  if (bloodLossPerSec > 0 && (bloodOf(actor) - BLOOD_DEATH) / bloodLossPerSec <= 30) actor.injuryDying = true;
  if (!bed && actor.state === 'down') {
    for (const key of VITALS) {
      const part = actor.parts[key];
      const festerPerSec = festerAmount(actor, part) / TICK_SEC;
      if (festerPerSec > 0) critical = true;
      if (festerPerSec > 0 && (part.hp - (Number(part.stun) || 0) + part.max) / festerPerSec <= 30) actor.injuryDying = true;
    }
  }
  actor.injuryCritical = critical;
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
