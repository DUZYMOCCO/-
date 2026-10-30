// 部位HP、出血、気絶・起き上がり・死。

import { PART_KEYS, PART_MAX, PART_LABEL, VITALS, setAnim, beastRules, makeEvent, BLEED_PER_DAMAGE } from './data.js';
import { drop } from './carry.js';
import { koLine } from './lines.js';
import { koPoint, TUNING } from './melee.js';
import { addWound, effMax, restPlace, PLACE_MULT, stopRest } from './rest.js';

// 気絶の長さ（Kenshi の式。kenshi.zone/en/knockout-death「Knockout time」）。秒 → 刻は ×10 × KO_TIME_SCALE。
// M = 3.0 + (0.75 − 3.0) × 打たれ強さ/100
// 秒 = 20 + Σ急所 (最大 − 体力)/最大×100 × M × 0.25 + Σ負の部位 |体力|/最大×100 × M × 係数（頭2・胸腹1・手足0.5）
//      + (最大の血 − 血)/最大の血×100 × M × 0.25 × 2
export const KO_TIME_SCALE = 0.3; // ★この世界の戦いは Kenshi より短いので 3割に縮める
const KO_PART_FACTOR = { head: 2, chest: 1, stomach: 1, lArm: 0.5, rArm: 0.5, lLeg: 0.5, rLeg: 0.5 };
export function koSeconds(actor) {
  const t = Math.max(0, Math.min(100, (actor.skills && actor.skills.toughness) || 0));
  const m = 3.0 + (0.75 - 3.0) * t / 100;
  let sec = 20;
  for (const key of VITALS) {
    const p = actor.parts[key];
    const max = p.max > 0 ? p.max : PART_MAX[key];
    sec += Math.max(0, (max - p.hp) / max * 100) * m * 0.25;
  }
  for (const key of PART_KEYS) {
    const p = actor.parts[key];
    if (!p || p.hp >= 0 || isMissing(actor, key)) continue;
    const max = p.max > 0 ? p.max : PART_MAX[key];
    sec += Math.min(-p.hp, max) / max * 100 * m * KO_PART_FACTOR[key];
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
export const BLOOD_KO = 30; // これを下回ると気絶し、BLOOD_WAKE まで戻るまで起きられない
export const BLOOD_WAKE = 35;
export const BLOOD_REGEN = 0.01; // 出血がほぼ止まっている時の戻り（毎刻）
export const LIMB_LOSS_BLEED = 0.5; // 手足を失った時に普通の出血にも足す分
// 大出血（gush）: 手足を失うと +1。毎刻 gush*GUSH_BLOOD の血を失い、×GUSH_DECAY で弱まる。
// 手当てしなければ1本でおよそ 67 の血を失う（2本なら死ぬ）。
export const LIMB_LOSS_GUSH = 1;
export const GUSH_BLOOD = 0.1;
export const GUSH_DECAY = 0.9985;
export const LIMB_KEYS = ['lArm', 'rArm', 'lLeg', 'rLeg'];

export function bloodOf(actor) {
  return typeof actor.blood === 'number' ? actor.blood : BLOOD_MAX;
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
  if (key === 'rArm' && actor.weapon !== 'fists' && actor.weapon !== 'bite') {
    actor.weaponLost = actor.weapon;
    if (actor.equip?.weapon) actor.equip.weapon[0] = null;
    actor.crossbow = null;
    actor.weapon = 'fists';
  }
  if (events) {
    events.push(makeEvent(state, 'limb', actor.name + 'の' + PART_LABEL[key] + (how || 'がちぎれた')));
  }
  return true;
}

export function armsLeft(actor) {
  let n = 0;
  if (!isMissing(actor, 'lArm')) n += 1;
  if (!isMissing(actor, 'rArm')) n += 1;
  return n;
}

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

export function kill(state, actor, events, why) {
  if (actor.state === 'dead') return;
  const wasPlayer = actor.isPlayer;
  actor.state = 'dead';
  actor.anim = 'Fall';
  actor.animTick = state.tick;
  actor.targetId = null;
  actor.moveTo = null;
  actor.assistDepth = null;
  actor.bleed = 0;
  events.push(makeEvent(state, 'dead', actor.name + (why || 'は死んだ')));
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
  if (isVitalZero(actor) && actor.state !== 'down') knockOut(state, actor, events);
}

function knockOut(state, actor, events, why) {
  {
    actor.state = 'down';
    actor.downTicks = koTicks(actor);
    stopRest(actor);
    actor.anim = 'Fall';
    actor.animTick = state.tick;
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

export function applyDamage(state, victim, partKey, dmg, events, bleedMult = 1) {
  if (victim.state === 'dead') return;
  const part = victim.parts[partKey];
  const before = part.hp;
  part.hp = before - dmg;
  addWound(victim, part, dmg); // 傷の半分は休まないと治らない（rest.js）
  if (victim.resting) stopRest(victim);
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
  if (part.hp <= -part.max && LIMB_KEYS.includes(partKey) && victim.faction !== 'beast') {
    severLimb(state, victim, partKey, events);
  }
  checkCondition(state, victim, events);
}

export function updateBody(state, events) {
  for (const actor of state.actors) {
    if (actor.state === 'dead') continue;

    if (actor.bleed > 0) {
      const b = actor.bleed;
      // Kenshi の出血は血だけを減らす（部位の体力は削らない。前は胸・腹も削っていた）
      actor.bleed = b * 0.997;
      if (actor.bleed < 0.0005) actor.bleed = 0;
      actor.blood = bloodOf(actor) - b * BLOOD_PER_BLEED;
    } else if (bloodOf(actor) < BLOOD_MAX && actor.state !== 'down' && !(actor.gush > 0)) {
      // 寝床では血の戻りが2倍（Kenshi）
      const bedBlood = restPlace(state, actor) === 'ground' ? 1 : 2;
      actor.blood = Math.min(BLOOD_MAX, bloodOf(actor) + BLOOD_REGEN * bedBlood);
    }
    if (actor.gush > 0) {
      actor.blood = bloodOf(actor) - actor.gush * GUSH_BLOOD;
      actor.gush *= GUSH_DECAY;
      if (actor.gush < 0.01) actor.gush = 0;
    }
    if (actor.bleed > 0 && actor.bleed < 0.02 && !(actor.gush > 0) && bloodOf(actor) < BLOOD_MAX) {
      actor.blood = Math.min(BLOOD_MAX, bloodOf(actor) + BLOOD_REGEN * 0.5);
    }
    if (bloodOf(actor) <= 0) {
      actor.blood = 0;
      kill(state, actor, events, 'は血を失って死んだ');
      continue;
    }
    if (bloodOf(actor) < 15 && !actor.dyingSaid) {
      actor.dyingSaid = true;
      koLine(state, actor, events, 'dying');
    } else if (bloodOf(actor) > 40 && actor.dyingSaid) actor.dyingSaid = false;
    if (bloodOf(actor) < BLOOD_KO && isStanding(actor)) {
      knockOut(state, actor, events, 'は血を失って倒れた');
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
          part.hp = Math.min(effMax(part), part.hp + regen);
        }
      }
      if (
        !actor.coma &&
        !actor.bound &&
        !actor.abducted &&
        bloodOf(actor) >= BLOOD_WAKE &&
        actor.downTicks <= 0 &&
        crucialAtLeast(actor, 0.2)
      ) {
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
          if (actor.faction === 'player') koLine(state, actor, events, 'wake');
        }
      }
    } else {
      checkFlee(state, actor, events);
      if (actor.targetId === null && (actor.hunger === undefined || actor.hunger >= 25)) {
        // ★自然な戻り（Kenshi は手当てしないと切り傷は戻らない）。寝袋の上では寝床の倍率（4倍）
        const mult = PLACE_MULT[restPlace(state, actor)] || 1;
        for (const key of PART_KEYS) {
          const part = actor.parts[key];
          const cap = effMax(part);
          if (part.hp < cap && !isMissing(actor, key)) {
            part.hp = Math.min(cap, part.hp + 0.01 * mult);
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
