// 罠と罠作業。ゲーム時間は既存ルールに合わせて tick（0.1秒）で管理する。
import { isHostile, makeEvent } from './data.js';
import { chance } from './rng.js';
import { applyDamage } from './body.js';
import { growSkill } from './combat.js';
import { canSee, lightAt, viewFactor } from './stealth.js';
import { ITEMS } from './items.js';
import { heightAt } from './terrain.js';
import { BUILD_SLOPE_LIMIT } from './build.js';
import { WORLD_LAYOUT } from '../data/world_layout.js';
import { makeActor } from './world.js';
import { streamDist, STREAM_W } from '../render/green_plan.js';

const SPEC = Object.freeze({
  bear: { type: 'bear_trap', radius: .6, work: 60, time: 200, item: 'bear_trap', label: 'トラバサミ' },
  net: { type: 'net_trap', radius: .6, work: 40, time: 100, item: 'net_trap', label: '網' },
  pit: { type: 'pit', radius: .9, work: 0, time: 0, item: null, label: '落とし穴' },
});
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const tickSec = (seconds) => Math.max(1, Math.round(seconds * 10));

export function ensureTraps(state) {
  if (!Array.isArray(state.traps)) state.traps = [];
  if (!Number.isFinite(state.nextTrapId)) state.nextTrapId = state.traps.reduce((n, t) => Math.max(n, Number(t?.id) || 0), 0) + 1;
  return state.traps;
}

export function setTrapSkill(state, level, actorId = state?.playerId) {
  const actor = state?.actors?.find((a) => a.id === actorId);
  if (!actor) return false;
  actor.skills ||= {};
  actor.skills.trap = clamp(Number(level) || 0, 0, 255);
  return actor.skills.trap;
}

export function trapLevel(actor) { return Math.min(150, Math.max(0, Number(actor?.skills?.trap) || 0)); }

function hasItem(actor, id, count = 1) { return (actor?.inv || []).reduce((n, x) => n + (x?.id === id ? Number(x.n) || 1 : 0), 0) >= count; }
function takeItem(actor, id, count = 1) {
  for (let i = 0; i < (actor.inv || []).length && count > 0;) {
    const item = actor.inv[i];
    if (item.id !== id) { i++; continue; }
    const n = Math.max(1, Number(item.n) || 1), used = Math.min(n, count);
    item.n = n - used; count -= used;
    if (item.n <= 0) actor.inv.splice(i, 1); else i++;
  }
  return count === 0;
}
function factionStock(state, good) { const c = state.trade?.cargo?.[good]; return Math.max(0, Number(c?.n) || 0); }
function takeFactionStock(state, good, count) {
  const c = state.trade?.cargo?.[good]; if (!c || c.n < count) return false;
  c.n -= count; if (c.n <= 0) delete state.trade.cargo[good]; return true;
}
function materialSource(state, actor, itemId, count) {
  const map = { iron_plate: 'iron', scrap_iron: 'scrap', cloth: 'cloth' };
  if (hasItem(actor, itemId, count)) return 'inventory';
  const good = map[itemId];
  return good && factionStock(state, good) >= count ? 'cargo' : null;
}
function consumeMaterial(state, actor, itemId, count) {
  const from = materialSource(state, actor, itemId, count);
  if (from === 'inventory') takeItem(actor, itemId, count);
  else if (from === 'cargo') takeFactionStock(state, ({ iron_plate: 'iron', scrap_iron: 'scrap', cloth: 'cloth' })[itemId], count);
  return from;
}

function forgeNear(state, actor) {
  if ((state.forgeBenches || []).some((b) => Math.hypot(b.x - actor.x, b.z - actor.z) <= 3)) return true;
  return (state.outposts?.pieces || []).some((p) => p.type === 'forge' && p.state === 'done' && Math.hypot(p.x - actor.x, p.z - actor.z) <= 3);
}
function townNear(x, z) {
  return [...(WORLD_LAYOUT.towns || []), ...(WORLD_LAYOUT.banditBases || [])]
    .some((t) => Math.hypot(x - t.x, z - t.z) <= t.radius + 10);
}
function inCombat(state, actor) {
  if (actor.targetId != null || actor.state === 'fight') return true;
  return (state.actors || []).some((other) => other.id !== actor.id && other.state !== 'dead' && isHostile(state, other, actor) && distance(actor, other) <= 10);
}

export function canPlaceTrap(state, actor, kind, x, z, opts = {}) {
  const spec = SPEC[kind] || Object.values(SPEC).find((s) => s.type === kind);
  if (!spec || !Number.isFinite(x) || !Number.isFinite(z)) return { ok: false, reason: '場所を選べません' };
  const lv = trapLevel(actor), quick = !!opts.quick;
  if (townNear(x, z)) return { ok: false, reason: '町の近くには仕掛けられません' };
  if (streamDist(x, z) <= STREAM_W / 2) return { ok: false, reason: '水の中には仕掛けられません' };
  if (Math.abs(heightAt(x + .6, z) - heightAt(x - .6, z)) > BUILD_SLOPE_LIMIT || Math.abs(heightAt(x, z + .6) - heightAt(x, z - .6)) > BUILD_SLOPE_LIMIT) return { ok: false, reason: '坂が急すぎます' };
  if ((state.traps || []).some((t) => t.state !== 'removed' && Math.hypot(t.x - x, t.z - z) < 1.2)) return { ok: false, reason: '別の罠に近すぎます' };
  if ((state.buildings || []).some((b) => Math.hypot(b.x - x, b.z - z) < Math.max(b.w || 0, b.d || 0) / 2 + .6) || (state.outposts?.pieces || []).some((p) => p.state === 'done' && Math.hypot(p.x - x, p.z - z) < 1.2)) return { ok: false, reason: '建物や壁に重なります' };
  if (quick) {
    if (lv < 150 || spec.type === 'pit' || distance(actor, { x, z }) > .8) return { ok: false, reason: '足元に即置きできません' };
  } else if (inCombat(state, actor)) return { ok: false, reason: '戦闘中は仕掛けられません' };
  if (opts.deep && lv < 100) return { ok: false, reason: '深い穴は罠Lv100から掘れます' };
  if (spec.item && !hasItem(actor, spec.item)) return { ok: false, reason: '持ち物に罠がありません' };
  return { ok: true, reason: '', color: 'green', spec };
}

function addTrap(state, actor, kind, x, z, opts = {}) {
  ensureTraps(state);
  const spec = SPEC[kind] || Object.values(SPEC).find((s) => s.type === kind);
  const trap = { id: state.nextTrapId++, type: spec.type, x, z, ownerId: actor.id, ownerFaction: actor.faction || 'player', trapLv: trapLevel(actor), state: spec.type === 'pit' ? 'digging' : 'armed', deep: !!opts.deep, knownBy: {}, victimId: null, until: 0, pitDepth: 0, progress: 0, demo: !!opts.demo };
  state.traps.push(trap);
  return trap;
}

export function beginTrapPlacement(state, actorId, kind, x, z, opts = {}) {
  const actor = state.actors?.find((a) => a.id === actorId);
  if (!actor) return { ok: false, reason: '作業する人がいません' };
  const check = canPlaceTrap(state, actor, kind, x, z, opts);
  if (!check.ok) return check;
  const spec = check.spec, lv = trapLevel(actor);
  const time = opts.quick ? 5 : spec.work * (lv >= 50 ? .6 : 1);
  const trap = addTrap(state, actor, kind, x, z, opts);
  if (spec.type !== 'pit') takeItem(actor, spec.item, 1);
  if (opts.quick) {
    trap.state = 'setting';
    actor.trapTask = { kind: 'set', quick: true, trapId: trap.id, x, z, totalTicks: 5, progress: 0, lastX: actor.x, lastZ: actor.z, startedTick: state.tick };
    actor.work = true;
    return { ok: true, trap };
  }
  trap.state = spec.type === 'pit' ? 'digging' : 'setting';
  actor.trapTask = { kind: spec.type === 'pit' ? 'dig' : 'set', trapId: trap.id, x, z, totalTicks: spec.type === 'pit' ? digTicks(actor, !!opts.deep) : Math.max(1, Math.ceil(time)), progress: 0, lastX: actor.x, lastZ: actor.z, item: spec.item, startedTick: state.tick };
  actor.moveTo = { x, z }; actor.work = true;
  return { ok: true, trap };
}

export function digTicks(actor, deep = false) {
  const lv = trapLevel(actor), labor = Math.max(Number(actor.skills?.strength) || 0, Number(actor.skills?.build) || 0);
  const shovel = hasItem(actor, 'shovel');
  const sec = 40 / (1 + labor / 50) * (shovel ? 1 : 3) * (deep ? 1.5 : 1) * (lv >= 50 ? .6 : 1);
  return tickSec(sec);
}

export function beginTrapCraft(state, actorId, kind) {
  const actor = state.actors?.find((a) => a.id === actorId);
  if (!actor) return { ok: false, reason: '作業する人がいません' };
  const recipe = kind === 'bear' ? { out: 'bear_trap', time: 200, materials: [['iron_plate', 1], ['scrap_iron', 3]], forge: true }
    : kind === 'net' ? { out: 'net_trap', time: 100, materials: [['cloth', 1]], forge: false }
      : kind === 'shovel' ? { out: 'shovel', time: 150, materials: [['scrap_iron', 2]], forge: true } : null;
  if (!recipe) return { ok: false, reason: '作れない道具です' };
  if (recipe.forge && !forgeNear(state, actor)) return { ok: false, reason: '鍛冶台の近くで作ります' };
  let choice = null;
  if (kind === 'bear') choice = recipe.materials.find(([id, n]) => materialSource(state, actor, id, n));
  else choice = recipe.materials[0];
  if (!choice || !materialSource(state, actor, choice[0], choice[1])) return { ok: false, reason: '材料が足りません' };
  const from = consumeMaterial(state, actor, choice[0], choice[1]);
  actor.trapTask = { kind: 'craft', out: recipe.out, refund: { id: choice[0], n: choice[1], from }, totalTicks: recipe.time, progress: 0, lastX: actor.x, lastZ: actor.z, startedTick: state.tick };
  actor.moveTo = null; actor.work = true;
  return { ok: true, task: actor.trapTask };
}

// 回収・撤去・蓋の張り直し・掘りかけの再開。罠の所まで歩いてから作業する
export function recoverTrap(state, actorId, trapId, opts = {}) {
  const actor = state.actors?.find((a) => a.id === actorId), trap = (state.traps || []).find((t) => t.id === trapId);
  if (!actor || !trap) return { ok: false, reason: '罠がありません' };
  if (trap.victimId != null) return { ok: false, reason: 'かかっている最中は触れません' };
  if (trap.state === 'setting' || trap.state === 'covering' || state.actors.some((a) => a.trapTask?.trapId === trapId)) return { ok: false, reason: '作業中の罠です' };
  let task;
  if (trap.type === 'pit' && trap.state === 'digging' && opts.resume) {
    const total = digTicks(actor, !!trap.deep);
    task = { kind: 'dig', totalTicks: total, progress: Math.min(total - 1, Math.round((trap.progress || 0) * total)) };
  } else if (trap.type === 'pit' && trap.state === 'open') {
    trap.state = 'covering';
    task = { kind: 'cover', totalTicks: 50, progress: 0 };
  } else task = { kind: 'recover', totalTicks: trap.type === 'pit' ? 30 : 10, progress: 0 };
  actor.trapTask = { ...task, trapId, x: trap.x, z: trap.z, lastX: actor.x, lastZ: actor.z, startedTick: state.tick };
  actor.moveTo = distance(actor, trap) > .8 ? { x: trap.x, z: trap.z } : null; actor.work = true;
  return { ok: true, task: actor.trapTask };
}

function finishRecover(state, actor, trap) {
  if (trap.type === 'bear_trap') (actor.inv ||= []).push({ id: 'bear_trap', n: 1 });
  if (trap.type === 'net_trap' && trap.state !== 'sprung') (actor.inv ||= []).push({ id: 'net_trap', n: 1 });
  state.traps = state.traps.filter((t) => t.id !== trap.id);
}

// 作業が途中で止まったときの後始末（置きかけの罠は持ち物へ、素材は戻す、穴は掘った分を残す）
function abortTask(state, actor) {
  const task = actor.trapTask, trap = (state.traps || []).find((t) => t.id === task.trapId);
  if (task.kind === 'craft' && task.refund) {
    const r = task.refund;
    if (r.from === 'inventory') (actor.inv ||= []).push({ id: r.id, n: r.n });
    else if (r.from === 'cargo') {
      const good = ({ iron_plate: 'iron', scrap_iron: 'scrap', cloth: 'cloth' })[r.id];
      state.trade ||= {}; state.trade.cargo ||= {};
      const c = state.trade.cargo[good] ||= { n: 0, cost: 0 }; c.n += r.n;
    }
  } else if (task.kind === 'set' && trap && trap.state === 'setting') {
    (actor.inv ||= []).push({ id: SPEC[trap.type === 'bear_trap' ? 'bear' : 'net'].item, n: 1 });
    state.traps = state.traps.filter((t) => t.id !== trap.id);
  } else if (task.kind === 'dig' && trap && trap.state === 'digging') {
    trap.progress = clamp(task.progress / task.totalTicks, 0, .99);
  } else if (task.kind === 'cover' && trap && trap.state === 'covering') trap.state = 'open';
  actor.trapTask = null; actor.work = false;
}

function releaseTrap(state, trap, victim) {
  if (!victim) return;
  victim.trapRootUntil = 0; victim.trapDisableUntil = 0; victim.trapNoDefendUntil = 0;
  victim.trapStatus = null; victim.pitDepth = 0;
  victim.targetId = victim.targetId ?? trap.ownerId;
  if (trap.type === 'pit') { victim.x = trap.x + 1.35; victim.z = trap.z; }
  trap.victimId = null;
  trap.state = trap.type === 'pit' ? 'open' : trap.type === 'bear_trap' ? 'sprung' : 'removed';
}

function springTrap(state, trap, victim, events) {
  const lv = trap.trapLv, duration = trap.type === 'pit' ? (trap.deep ? 120 : 80) : trap.type === 'bear_trap' ? (lv >= 100 ? 60 : 40) : (lv >= 100 ? 50 : 30);
  trap.state = 'sprung'; trap.victimId = victim.id; trap.until = state.tick + duration;
  victim.trapRootUntil = trap.until; victim.trapStatus = trap.type; victim.swing = null;
  victim.moveTo = null; victim.trapNoDefendUntil = lv >= 150 || trap.type !== 'bear_trap' ? trap.until : 0;
  victim.trapDisableUntil = trap.type === 'net_trap' ? trap.until : 0;
  if (trap.type === 'pit') { victim.pitDepth = trap.deep ? 2.2 : 1.5; victim.trapNoDefendUntil = trap.until; }
  // 罠Lv150: かかった瞬間に必ずよろめく（1.5秒は受けも振りもできない）
  if (lv >= 150) { victim.staggerUntil = Math.max(victim.staggerUntil || 0, state.tick + 15); victim.flinchUntil = victim.staggerUntil; victim.blockUntil = 0; victim.hitReact = { kind: 'heavy_front', tick: state.tick, until: victim.staggerUntil }; victim.anim = 'Stagger'; victim.animTick = state.tick; }
  const damage = trap.type === 'bear_trap' ? 15 + lv * .15 : trap.type === 'pit' && trap.deep ? 10 + lv * .1 : 0;
  if (damage) {
    const parts = trap.type === 'pit' ? ['lLeg','rLeg'] : [victim.id % 2 ? 'lLeg' : 'rLeg'];
    for (const part of parts) applyDamage(state, victim, part, damage, events, 0);
  }
  events.push(makeEvent(state, 'trap', victim.name + (trap.type === 'pit' ? 'が落とし穴に落ちた' : trap.type === 'net_trap' ? 'が網にかかった' : 'がトラバサミにかかった')));
  const owner = state.actors.find((a) => a.id === trap.ownerId);
  if (owner) growSkill(owner, 'trap', 1.5, Math.max(victim.skills?.attack || 0, victim.skills?.perception || 0));
  if (trap.type === 'net_trap') trap.state = 'sprung';
}

function detectTrap(state, trap, actor, events) {
  if (trap.state !== 'armed' || trap.knownBy?.[actor.faction]) return;
  const fake = { id: -trap.id, x: trap.x, z: trap.z, sneaking: false };
  if (distance(actor, fake) > 5 || !canSee(state, actor, fake)) return;
  const spot = (Number(actor.skills?.perception) || 0) + 10;
  const hide = trap.trapLv * .8 + (trap.trapLv >= 50 ? 15 : 0);
  let p = clamp(.05 + (spot - hide) / 100, .01, .8);
  p *= viewFactor(actor, fake, distance(actor, fake));
  p *= lightAt(state) < .35 ? .5 : 1;
  if (actor.movedRunThisTick || actor.targetId != null || actor.state === 'fight') p *= .3;
  if (chance(state, p)) {
    trap.knownBy ||= {}; trap.knownBy[actor.faction] = true;
    events.push(makeEvent(state, 'trap_spotted', actor.name + 'が罠に気付いた'));
  }
}

function actorIsEnemy(state, trap, actor) { return actor.id !== trap.ownerId && actor.state !== 'dead' && isHostile(state, trap.ownerFaction, actor); }
function taskInterrupted(actor) {
  const task = actor.trapTask;
  // 罠Lv150の足元即置きは戦闘中の0.5秒の動作。殴られても動き回っても置き終える
  if (task.quick) return false;
  if (Math.max(actor.lastAttackedTick ?? -1, actor.lastAttackerTick ?? -1) >= (task.startedTick ?? Infinity)) return true;
  if (Math.hypot(actor.x - task.lastX, actor.z - task.lastZ) > .35 && actor.moveTo == null) return true;
  // 別の場所へ歩かせた（作り中なら歩かせただけで）中断
  if (actor.moveTo && (task.kind === 'craft' || !Number.isFinite(task.x) || Math.hypot(actor.moveTo.x - task.x, actor.moveTo.z - task.z) > .6)) return true;
  return false;
}
function updateTasks(state, events) {
  for (const actor of state.actors || []) {
    const task = actor.trapTask;
    if (!task) continue;
    if (actor.state === 'down' || actor.state === 'dead' || taskInterrupted(actor)) { abortTask(state, actor); continue; }
    task.lastX = actor.x; task.lastZ = actor.z;
    if (task.kind !== 'craft' && !task.quick && distance(actor, task) > 1) continue;
    task.progress += 1;
    if (task.progress < task.totalTicks) continue;
    if (task.kind === 'craft') (actor.inv ||= []).push({ id: task.out, n: 1 });
    else if (task.kind === 'recover') { const trap = state.traps.find((t) => t.id === task.trapId); if (trap) finishRecover(state, actor, trap); }
    else {
      const trap = state.traps.find((t) => t.id === task.trapId);
      if (trap) {
        trap.state = task.kind === 'dig' ? 'armed' : task.kind === 'cover' ? 'armed' : 'armed';
        trap.until = 0; trap.progress = 0;
      }
      if (task.kind === 'set') growSkill(actor, 'trap', .6, 0);
      if (task.kind === 'cover' && trap) trap.state = 'armed';
    }
    actor.trapTask = null; actor.work = false;
  }
}

export function updateTraps(state, events = []) {
  ensureTraps(state);
  updateTasks(state, events);
  for (const trap of [...state.traps]) {
    if (trap.state === 'sprung' && trap.victimId != null && state.tick >= trap.until) {
      const victim = state.actors.find((a) => a.id === trap.victimId);
      releaseTrap(state, trap, victim);
      if (trap.state === 'removed') state.traps = state.traps.filter((t) => t.id !== trap.id);
      continue;
    }
    if (trap.state !== 'armed') continue;
    if (state.tick % 10 === 0 && !trap.demo) for (const actor of state.actors) if (actorIsEnemy(state, trap, actor)) detectTrap(state, trap, actor, events);
    for (const actor of state.actors) {
      if (!actorIsEnemy(state, trap, actor) || actor.carriedBy != null || (actor.trapRootUntil || 0) > state.tick) continue;
      const known = !!trap.knownBy?.[actor.faction];
      if (known) continue;
      if (distance(actor, trap) <= (SPEC[trap.type === 'bear_trap' ? 'bear' : trap.type === 'net_trap' ? 'net' : 'pit'].radius)) { springTrap(state, trap, actor, events); break; }
    }
  }
  return events;
}

export function trapSnapshot(state) {
  return (state.traps || []).map((t) => ({ id: t.id, type: t.type, state: t.state, x: t.x, z: t.z, victimId: t.victimId, remainingSec: Math.max(0, (t.until - state.tick) / 10) }));
}

export function trapDemo(state, kind, opts = {}) {
  const actor = state.actors.find((a) => a.id === state.playerId);
  if (!actor) return null;
  const fx = Math.sin(actor.rot), fz = Math.cos(actor.rot), x = actor.x + fx * 6, z = actor.z + fz * 6;
  const trap = addTrap(state, actor, kind, x, z, { ...opts, demo: true });
  trap.state = 'armed';
  trap.trapLv = clamp(Number(opts.level ?? trap.trapLv) || 0, 0, 150);
  const rngBefore = state.rngState;
  const enemy = makeActor(state, 'bandit', actor.x + fx * 20, actor.z + fz * 20, null, false);
  state.rngState = rngBefore;
  enemy.name = '盗賊'; enemy.targetId = actor.id; enemy.state = 'fight';
  return { trapId: trap.id, enemyId: enemy?.id ?? null };
}

export function avoidKnownTrapStep(state, actor, tx, tz) {
  let waypoint = actor.trapAvoidWaypoint;
  if (waypoint && Math.hypot(actor.x - waypoint.x, actor.z - waypoint.z) > .45) return waypoint;
  actor.trapAvoidWaypoint = null;
  const vx = tx - actor.x, vz = tz - actor.z, len2 = vx*vx + vz*vz;
  if (len2 < .01) return { x: tx, z: tz };
  for (const trap of state.traps || []) {
    if (trap.state !== 'open' && (trap.state !== 'armed' || !trap.knownBy?.[actor.faction])) continue;
    const dx = trap.x - actor.x, dz = trap.z - actor.z;
    const t = clamp((dx*vx + dz*vz) / len2, 0, 1);
    const d = Math.hypot(actor.x + vx*t - trap.x, actor.z + vz*t - trap.z);
    const radius = trap.type === 'pit' ? .9 : .6;
    if (d >= radius + .5 || Math.hypot(dx,dz) < radius + .5) continue;
    const side = (Number(actor.id) + Number(trap.id)) % 2 ? 1 : -1;
    const len = Math.sqrt(len2);
    waypoint = { x: trap.x + (-vz/len) * (radius + .85) * side, z: trap.z + (vx/len) * (radius + .85) * side };
    actor.trapAvoidWaypoint = waypoint;
    return waypoint;
  }
  return { x: tx, z: tz };
}

export const TRAP_TYPES = Object.freeze(Object.fromEntries(Object.entries(SPEC).map(([k, v]) => [k, v.type])));
