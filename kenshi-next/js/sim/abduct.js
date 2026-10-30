// 人喰い・グールのさらいと食事、手当て、縄ほどき、助けた相手の仲間入り。
// research/abduction_recruit.md（§7 の決定）に沿った最初の形。乱数（state.rng）は使わず、
// id・日・刻みのハッシュで決めるので、同じ種なら同じ結果になる。★時間や割合は仮の値。
import { makeEvent, distBetween, FACTIONS } from './data.js';
import { kill, severLimb, isMissing, bloodOf } from './body.js';
import { pickup, drop } from './carry.js';
import { koLine } from './lines.js';
import {
  kitHolder, pickKit, medicSkill, healPerSec, bleedStopPerSec, kitDrainPerSec, drainKit,
  effectiveSkill, BLEED_UNIT, GUSH_UNIT, MEDIC_XP_PER_SEC, healRep, KIT_TIERS,
} from './medkit.js';
import { effMax } from './rest.js';

export const TICKS_PER_SEC = 10; // TICK_SEC = 0.1（実時間）
export const EAT_ORDER = ['lLeg', 'rLeg', 'lArm', 'rArm', 'chest', 'head'];
export const EAT_TICKS = { lLeg: 200, rLeg: 200, lArm: 200, rArm: 200, chest: 300, head: 300 }; // 手足20秒・胴と頭30秒
export const TREAT_TICKS = 50; // （古い名前。手当ては今は治りきるまで続く。medkit.js の速さで）
const TICK_SEC = 0.1;
// 手当ての順（Kenshi の包帯の順: 血、頭、胸・腹、左腕、右腕、左脚、右脚）
const TREAT_ORDER = ['head', 'chest', 'stomach', 'lArm', 'rArm', 'lLeg', 'rLeg'];

export function needsTreat(t) {
  if (!t) return false;
  if (t.bleed > 0 || t.gush > 0) return true;
  for (const key of TREAT_ORDER) {
    const p = t.parts[key];
    if (p && !(Array.isArray(t.missing) && t.missing.includes(key)) && p.hp < effMax(p) - 1e-6) return true;
  }
  return false;
}

// 手当て1刻。終わったら true
function treatTick(state, a, t, events) {
  if (!a.skills) a.skills = {};
  if (typeof a.skills.medic !== 'number') a.skills.medic = 1;
  const holder = kitHolder(state, a);
  const kit = pickKit(holder);
  const skill = medicSkill(a);
  if (t.gush > 0 || t.bleed > 0) {
    const stop = bleedStopPerSec(skill, kit) * TICK_SEC;
    if (t.gush > 0) t.gush = Math.max(0, t.gush - stop * GUSH_UNIT);
    if (t.bleed > 0) t.bleed = Math.max(0, t.bleed - stop * BLEED_UNIT);
    if (!(t.gush > 0) && !(t.bleed > 0) && !a.task.bleedSaid) {
      a.task.bleedSaid = true;
      events.push(makeEvent(state, 'treat', a.name + 'が' + t.name + 'の血を止めた'));
    }
  } else {
    let left = healPerSec(skill, kit) * TICK_SEC;
    for (const key of TREAT_ORDER) {
      if (left <= 0) break;
      const p = t.parts[key];
      if (!p || (Array.isArray(t.missing) && t.missing.includes(key))) continue;
      const room = effMax(p) - p.hp;
      if (room <= 0) continue;
      const d = Math.min(room, left);
      p.hp += d;
      left -= d;
    }
  }
  if (kit && drainKit(holder, kit, kitDrainPerSec(a.skills.medic) * TICK_SEC)) {
    events.push(makeEvent(state, 'treat', holder.name + 'の' + KIT_TIERS[kit.tier].label + 'を使い切った'));
  }
  const s = effectiveSkill(skill, kit);
  a.skills.medic = Math.min(100, a.skills.medic + MEDIC_XP_PER_SEC * (1 - Math.min(99, s) / 100) * TICK_SEC);
  a.task.rep = (a.task.rep || 0) + healRep(state, a, t, TICK_SEC, events);
  return !needsTreat(t);
}
export const UNTIE_TICKS = 40; // 縄をほどく 4秒
export const TASK_REACH = 1.6;
export const CLAIM_RANGE = 30; // 人喰いが倒れた者を拾いに行く距離
export const POLE_RADIUS = 4.5;
export const POLES_PER_CAMP = 4;
export const MEAL_MIN_BOUND = 600; // 縛ってから最低 60秒は食べない
export const MEAL_CHECK = 50; // 5秒ごとに「食事の時間か」を見る
export const DAY_TICKS = 28800; // 1日（86400 ゲーム秒 / 3）

// 仲間入りの基本の割合（§7）。旅人＝隊商の護衛、盗賊＝盗人・荒らし
export const JOIN_BASE = {
  merchant: 30,
  trader: 30,
  caravan_guard: 40,
  traveller: 40,
  thief: 15,
  raider: 15,
  raider_boss: 15,
  bandit: 15,
  slave: 50,
};
export const JOIN_FOUGHT = -20;
export const JOIN_MID_MEAL = 15;
export const JOIN_NEAR_DEATH = 10;
export const JOIN_CAP = 90;

export function hash32(a, b, c) {
  let h = Math.imul((a | 0) ^ 0x2545f491, 0x9e3779b1);
  h = Math.imul(h ^ ((b | 0) + 0x632be5ab), 0x85ebca77);
  h = Math.imul(h ^ ((c | 0) + 0x27d4eb2f), 0xc2b2ae3d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  return (h ^ (h >>> 13)) >>> 0;
}

function numId(id) {
  if (typeof id === 'number') return id;
  let h = 0;
  for (const ch of String(id)) h = (Math.imul(h, 31) + ch.charCodeAt(0)) | 0;
  return h;
}

export function dayOf(state) {
  return Math.floor((state.timeSec || 0) / 86400);
}

function standing(a) {
  return a.state === 'idle' || a.state === 'move' || a.state === 'fight';
}

export function isCannibal(a) {
  return !!a && a.spawnKind === 'cannibals';
}

function sitesOf(state) {
  return (state.spawn && state.spawn.sites) || [];
}

export function makePoles(x, z, seed) {
  const poles = [];
  const base = ((seed || 0) % 360) * (Math.PI / 180);
  for (let i = 0; i < POLES_PER_CAMP; i += 1) {
    const ang = base + (i * Math.PI * 2) / POLES_PER_CAMP + 0.4;
    poles.push({ x: Math.round((x + Math.cos(ang) * POLE_RADIUS) * 100) / 100, z: Math.round((z + Math.sin(ang) * POLE_RADIUS) * 100) / 100 });
  }
  return poles;
}

export function polesOf(site) {
  if (!site || site.type !== 'cannibal_camp') return [];
  if (!Array.isArray(site.poles)) site.poles = makePoles(site.x, site.z, site.seedId);
  return site.poles;
}

function siteOfActor(state, a) {
  const squad = state.squads && state.squads.find((s) => s.id === a.squadId);
  const sid = squad && squad.siteId;
  if (!sid) return null;
  return sitesOf(state).find((s) => s.id === sid) || null;
}

function poleTaken(state, siteId, idx) {
  for (const o of state.actors) {
    if (o.state === 'dead') continue;
    if (o.bound && o.bound.siteId === siteId && o.bound.pole === idx) return true;
    if (o.abduct && o.abduct.siteId === siteId && o.abduct.pole === idx) return true;
  }
  return false;
}

export function freePole(state, site) {
  const poles = polesOf(site);
  for (let i = 0; i < poles.length; i += 1) if (!poleTaken(state, site.id, i)) return i;
  return -1;
}

function validVictim(v, taker) {
  if (!v || v.id === taker.id) return false;
  if (v.state !== 'down') return false; // 死体は持っていかない（最初の形）
  if (v.carriedBy !== null || v.bound) return false;
  if (v.faction === 'beast' || isCannibal(v)) return false;
  return true;
}

function clearAbduct(a) {
  a.abduct = null;
}

// ai.js の moveActor から呼ばれる: 行き先（{x,z,reach}）か null
export function abductGoal(state, actor, byId) {
  if (actor.task) {
    const t = byId.get(actor.task.targetId);
    if (t) return { x: t.x, z: t.z, reach: TASK_REACH * 0.8, task: true };
  }
  if (actor.eatingId != null) {
    const v = byId.get(actor.eatingId);
    if (v) return { x: v.x + 0.9, z: v.z, reach: 0.6 };
  }
  if (actor.abduct) {
    if (actor.carryingId !== null) return { x: actor.abduct.x, z: actor.abduct.z, reach: 1.0 };
    const v = byId.get(actor.abduct.victimId);
    if (v) return { x: v.x, z: v.z, reach: 1.2 };
  }
  return null;
}

function bindAt(state, victim, abd, events) {
  victim.bound = { siteId: abd.siteId, pole: abd.pole, since: state.tick, x: abd.x, z: abd.z };
  victim.x = abd.x;
  victim.z = abd.z + 0.5;
  victim.abducted = true;
  events.push(makeEvent(state, 'bound', victim.name + 'は杭に縛りつけられた'));
}

function updateTakers(state, byId, events) {
  for (const a of state.actors) {
    if (!isCannibal(a)) continue;
    if (!standing(a)) {
      if (a.abduct && a.carryingId === null) clearAbduct(a);
      continue;
    }
    if (a.abduct) {
      const abd = a.abduct;
      if (a.carryingId !== null) {
        const v = byId.get(a.carryingId);
        if (!v) {
          clearAbduct(a);
          continue;
        }
        if (Math.hypot(a.x - abd.x, a.z - abd.z) <= 1.2) {
          drop(state, a, events);
          bindAt(state, v, abd, events);
          clearAbduct(a);
        }
        continue;
      }
      if (a.targetId !== null) continue; // 戦い中は持っていない限り後回し（abduct は残す）
      const v = byId.get(abd.victimId);
      if (!validVictim(v, a)) {
        clearAbduct(a);
        continue;
      }
      if (distBetween(a, v) <= 1.5 && pickup(state, a, v, events)) {
        v.abducted = true;
        v.downTicks = Math.max(v.downTicks || 0, 50);
        events.push(makeEvent(state, 'kidnap', a.name + 'が' + v.name + 'を野営地へ運んでいく'));
      }
      continue;
    }
    if (a.targetId !== null || a.carryingId !== null || a.eatingId != null || a.returning) continue;
    if ((state.tick + a.id) % 10 !== 0) continue;
    const site = siteOfActor(state, a);
    if (!site || site.state !== 'active') continue;
    const pole = freePole(state, site);
    if (pole < 0) continue;
    let best = null;
    let bestD = Infinity;
    for (const v of state.actors) {
      if (!validVictim(v, a)) continue;
      if (state.actors.some((o) => o.abduct && o.abduct.victimId === v.id)) continue;
      const d = distBetween(a, v);
      if (d > CLAIM_RANGE) continue;
      if (a.leash && Math.hypot(v.x - a.leash.x, v.z - a.leash.z) > a.leash.r) continue;
      if (d < bestD || (d === bestD && best && v.id < best.id)) {
        best = v;
        bestD = d;
      }
    }
    if (!best) continue;
    const p = polesOf(site)[pole];
    a.abduct = { victimId: best.id, siteId: site.id, pole, x: p.x, z: p.z };
  }
}

// 食事の時間: 日ごと・野営地ごとに一度、時刻をハッシュで決める（昼 8時〜20時のどこか）
export function mealTickOfDay(siteId, day) {
  const frac = 8 / 24 + ((hash32(numId(siteId), day, 77) % 1000) / 1000) * (12 / 24);
  return Math.floor(frac * DAY_TICKS);
}

function eaterFor(state, victim) {
  let best = null;
  let bestD = Infinity;
  for (const a of state.actors) {
    if (!isCannibal(a) || !standing(a)) continue;
    if (a.targetId !== null || a.carryingId !== null || a.eatingId != null) continue;
    const site = siteOfActor(state, a);
    if (!site || site.id !== victim.bound.siteId) continue;
    const d = distBetween(a, victim);
    if (d < bestD || (d === bestD && best && a.id < best.id)) {
      best = a;
      bestD = d;
    }
  }
  return best;
}

export function startMeal(state, victim, eater, events) {
  if (!victim || !victim.bound || !eater || victim.state === 'dead') return false;
  eater.eatingId = victim.id;
  eater.lastAttackerId = null;
  eater.targetId = null;
  victim.meal = { eaterId: eater.id, stage: nextStage(victim), ticks: 0, startedAt: state.tick };
  victim.mealStarted = true;
  events.push(makeEvent(state, 'meal', eater.name + 'が' + victim.name + 'を食べはじめた'));
  return true;
}

function nextStage(victim) {
  for (let i = 0; i < EAT_ORDER.length; i += 1) {
    const k = EAT_ORDER[i];
    if (i < 4 && isMissing(victim, k)) continue;
    return i;
  }
  return EAT_ORDER.length;
}

function stopMeal(state, victim, eater) {
  if (victim) victim.meal = null;
  if (eater) eater.eatingId = null;
}

function updateMeals(state, byId, events) {
  for (const v of state.actors) {
    if (!v.bound) continue;
    if (v.state === 'dead' && (!v.meal || v.eaten)) continue; // 死んでも食事中なら食べ続ける
    v.abducted = true;
    if (v.state !== 'down' && v.state !== 'dead') {
      // 縛られている間は起き上がれない
      v.state = 'down';
      v.anim = 'Fall';
    }
    v.x = v.bound.x;
    v.z = v.bound.z + 0.5;
    if (!v.meal) {
      if ((state.tick + numId(v.bound.siteId)) % MEAL_CHECK !== 0) continue;
      if (state.tick - v.bound.since < MEAL_MIN_BOUND) continue;
      const t = Math.floor(((state.timeSec || 0) % 86400) / 3);
      const at = mealTickOfDay(v.bound.siteId, dayOf(state));
      if (t < at || t > at + DAY_TICKS / 6) continue;
      const e = eaterFor(state, v);
      if (e) startMeal(state, v, e, events);
      continue;
    }
    const eater = byId.get(v.meal.eaterId);
    if (!eater || !standing(eater) || eater.eatingId !== v.id) {
      stopMeal(state, v, eater && eater.eatingId === v.id ? eater : null);
      continue;
    }
    // 食べている者は殴られたら手を止める（それまでは手当てや縄ほどきも無視）
    if (eater.lastAttackerId !== null && eater.lastAttackerId !== undefined) {
      const atk = byId.get(eater.lastAttackerId);
      stopMeal(state, v, eater);
      if (atk && atk.state !== 'dead') {
        eater.targetId = atk.id;
        eater.state = 'fight';
      }
      events.push(makeEvent(state, 'meal', eater.name + 'は食事を止めて振り向いた'));
      continue;
    }
    if (distBetween(eater, v) > 2.2) continue; // まだ横に着いていない
    eater.state = 'idle';
    eater.anim = 'Attack';
    v.meal.ticks += 1;
    const key = EAT_ORDER[v.meal.stage];
    if (v.meal.ticks % 60 === 1 && v.state !== 'dead') koLine(state, v, events, 'eaten');
    if (v.meal.ticks < EAT_TICKS[key]) continue;
    v.meal.ticks = 0;
    if (v.meal.stage < 4) {
      severLimb(state, v, key, events, 'を食われた');
      v.meal.stage = nextStage(v);
    } else if (key === 'chest') {
      v.parts.chest.hp = Math.min(v.parts.chest.hp, -v.parts.chest.max * 0.9);
      v.parts.stomach.hp = Math.min(v.parts.stomach.hp, -v.parts.stomach.max * 0.9);
      v.gush = (v.gush || 0) + 2;
      v.meal.stage = 5;
      events.push(makeEvent(state, 'limb', v.name + 'の腹が裂かれた'));
    } else {
      v.eaten = true;
      stopMeal(state, v, eater);
      if (v.state === 'dead') events.push(makeEvent(state, 'meal', v.name + 'は食い尽くされた'));
      else kill(state, v, events, 'は食い尽くされた');
    }
  }
}

// 手当てと縄ほどき（自分の部隊の者だけ。食べている者は気にしない）
export function startTask(state, actor, type, target) {
  if (!actor || !target || actor === target) return false;
  if (!standing(actor)) return false;
  if (type === 'treat' && !needsTreat(target)) return false; // 道具が無くても素手で手当てはできる（遅い）
  if (type === 'free' && !target.bound) return false;
  if (target.state === 'dead') return false;
  actor.task = { type, targetId: target.id, ticks: 0 };
  actor.targetId = null;
  actor.moveTo = null;
  actor.waitTargetId = null;
  return true;
}

function updateTasks(state, byId, events) {
  for (const a of state.actors) {
    if (!a.task) continue;
    const t = byId.get(a.task.targetId);
    if (!standing(a) || a.targetId !== null || a.moveTo || !t || t.state === 'dead') {
      a.task = null;
      continue;
    }
    if (a.task.type === 'free' && !t.bound) {
      a.task = null;
      continue;
    }
    if (distBetween(a, t) > TASK_REACH) continue;
    a.task.ticks += 1;
    a.anim = 'Idle';
    if (a.task.type === 'treat') {
      if (!treatTick(state, a, t, events)) continue;
      const gain = a.task.rep || 0;
      const rel = gain > 0.05 ? '（' + factionName(t.faction) + 'との仲 +' + gain.toFixed(1) + '）' : '';
      events.push(makeEvent(state, 'treat', a.name + 'が' + t.name + 'の手当てを終えた' + rel));
      a.task = null;
      continue;
    }
    if (a.task.ticks < UNTIE_TICKS) continue;
    freeCaptive(state, a, t, events);
    a.task = null;
  }
}

function factionName(f) {
  return (FACTIONS[f] && FACTIONS[f].name) || f;
}

export function joinChance(victim) {
  const role = victim.role || (victim.faction === 'caravan' ? 'merchant' : victim.faction);
  if (!(role in JOIN_BASE)) return 0;
  let p = JOIN_BASE[role];
  if (victim.foughtPlayer) p += JOIN_FOUGHT;
  if (victim.meal || victim.mealStarted) p += JOIN_MID_MEAL;
  if ((victim.missing && victim.missing.length) || bloodOf(victim) < 40) p += JOIN_NEAR_DEATH;
  return Math.max(0, Math.min(JOIN_CAP, p));
}

export function joinRoll(state, victim) {
  return hash32(numId(victim.id), dayOf(state), 913) % 100;
}

export function freeCaptive(state, rescuer, v, events) {
  const midMeal = !!v.meal;
  const eater = v.meal ? byIdOf(state, v.meal.eaterId) : null;
  const chanceP = v.faction === 'player' ? 100 : joinChance(v);
  if (v.meal) stopMeal(state, v, eater);
  v.bound = null;
  v.abducted = false;
  v.rescuedMidMeal = midMeal;
  events.push(makeEvent(state, 'free', rescuer.name + 'が' + v.name + 'の縄をほどいた'));
  koLine(state, v, events, 'rescue');
  if (v.faction === 'player') return 'ally';
  const roll = joinRoll(state, v);
  v.joinChance = chanceP;
  v.joinRoll = roll;
  if (roll < chanceP) {
    recruit(state, v, events);
    return 'joined';
  }
  // 仲間にならない者は、この先しばらく手を出さず去る
  v.holdFire = true;
  v.grateful = true;
  events.push(makeEvent(state, 'free', v.name + 'は礼を言わずに去るつもりらしい'));
  return 'left';
}

function byIdOf(state, id) {
  return state.actors.find((a) => a.id === id) || null;
}

export function recruit(state, v, events) {
  const old = state.squads && state.squads.find((s) => s.id === v.squadId);
  if (old && Array.isArray(old.memberIds)) old.memberIds = old.memberIds.filter((id) => id !== v.id);
  v.faction = 'player';
  v.squadId = null;
  v.spawned = false;
  v.leash = null;
  v.returning = false;
  v.holdFire = false;
  v.targetId = null;
  if (!Array.isArray(state.squadIds)) state.squadIds = [];
  if (!state.squadIds.includes(v.id)) state.squadIds.push(v.id);
  events.push(makeEvent(state, 'join', v.name + 'が仲間に加わった'));
}

export function updateAbduct(state, events) {
  const byId = new Map(state.actors.map((a) => [a.id, a]));
  updateTasks(state, byId, events);
  updateTakers(state, byId, events);
  updateMeals(state, byId, events);
}
