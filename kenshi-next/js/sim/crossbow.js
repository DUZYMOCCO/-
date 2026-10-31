import { mixHash } from './hitreact.js';
import { growSkill } from './combat.js';
import { WEAPONS, beastRules } from './data.js';
import { giveInitialQuiver } from './inventory.js';
import { armorDamage } from './armor.js';
import { ITEMS } from './items.js';
import THROWN_WEAPONS from '../data/thrown_weapons.js';
// クロスボウ（射撃）。装填・矢の数・飛ぶ矢・味方への誤射。
// 数値の出典と仮の値は research/crossbow.md。★=仮。

import { TICK_SEC, PART_KEYS, PART_WEIGHTS, isHostile, distBetween, makeEvent, setAnim, CROSSBOW_BLEED } from './data.js';
import { rand, randRange, chance } from './rng.js';
import { applyDamage, isStanding } from './body.js';
import { blockedAt } from './collide.js';
import { rangedHitChance, lightAtActor, darknessOf, DARK_RANGED_PENALTY } from './light.js';

export const CROSSBOW = {
  name: 'クロスボウ',
  range: 30, // ★ m（Kenshi のジャンクボウ 30〜40m。この世界の視界は 14〜20m）
  meleeSwitch: 3.5, // ★ これより近いと近接に持ち替える
  keepDist: 8, // ★ これより近いと下がって距離を取る（近接に切り替わるまで）
  reloadSlow: 40, // tick = 4.0秒（ジャンクボウの遅い側 4.0s、技能0）
  reloadFast: 20, // tick = 2.0秒（ジャンクボウの速い側 2.0s）
  aimTicks: 4, // ★ 構えてから撃つまで 0.4秒
  min: 12, // 傷（ジャンクボウ 12〜30）
  max: 30,
  speed: 45, // ★ m/s。本物は 82〜102m/s だが、見えるように遅くした
  missDeg: [6, 12], // 外れの時のずれ（ジャンクボウの散り 6〜12°）
  hitRadius: 0.38,
  boltY: 1.3,
};

export const START_BOLTS = { guard: 20, bandit: 12, player: 24 };
export const CROSSBOW_SKILL = { guard: 25, bandit: 12, player: 15, beast: 0 };

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function giveCrossbow(actor, bolts) {
  if (actor.equip) { const w = actor.equip.weapon; if (w[0]?.id !== 'crossbow') { w[1] = w[0]; w[0] = {id:'crossbow',rank:3,n:1}; } }
  actor.crossbow = { bolts: Math.max(0, Math.floor(bolts)), loaded: true, reload: 0, aim: 0 };
  if (actor.equip && !actor.equip.quiver) giveInitialQuiver(actor);
  else if (actor.equip?.quiver) {
    const held = Math.min(ITEMS[actor.equip.quiver.id].ammoCap, actor.crossbow.bolts);
    if (actor.crossbow.bolts > held) actor.inv.push({ id: 'bolts', rank: 3, n: actor.crossbow.bolts - held });
    actor.equip.quiver.ammo = held ? { id: 'bolts', rank: 3, n: held } : null;
    actor.crossbow.bolts = held;
  }
  if (!actor.skills) actor.skills = {};
  if (typeof actor.skills.crossbow !== 'number') actor.skills.crossbow = CROSSBOW_SKILL[actor.faction] || 10;
  return actor;
}

// 装填にかかる tick。技能と器用（どちらも100まで）の合計 / 200 で遅い→速いへ（Kenshi どおり）。
export function crossbowRange(actor) { return CROSSBOW.range * (1 + 0.25 * effectivePerception(actor) / 100); }

const thrownById = new Map(THROWN_WEAPONS.map(item => [item.id, item]));
function itemName(id) { return thrownById.get(id)?.kind === 'shuriken' ? '手裏剣' : '投げナイフ'; }
function headVision(actor) { return Math.max(0, Math.min(.2, ITEMS[actor?.equip?.head?.id]?.vision || 0)); }
function effectivePerception(actor) { return clamp(actor?.skills?.perception || 0, 0, 100) * (1 - headVision(actor)); }
export function thrownRange(actor, itemId) {
  const item = thrownById.get(itemId);
  return item ? item.range_m * (1 + .25 * effectivePerception(actor) / 100) : 0;
}
export function canThrow(actor) { return (actor?.inv || []).some(x => thrownById.has(x.id) && (x.n || 0) > 0); }
export function thrownMode(actor, d) {
  const item = (actor?.inv || []).find(x => thrownById.has(x.id) && (x.n || 0) > 0);
  return !!item && d > 2.2 && d <= thrownRange(actor, item.id);
}

export function reloadTicks(actor) {
  const s = actor.skills || {};
  const sum = Math.min(100, s.crossbow || 0) + Math.min(100, s.dexterity || 0);
  return Math.round(CROSSBOW.reloadSlow - (CROSSBOW.reloadSlow - CROSSBOW.reloadFast) * (sum / 200));
}

// まだ撃てるか（装填済み、または装填中で矢が残っている）。
export function canShoot(actor) {
  const c = actor && actor.crossbow;
  if (!c) return false;
  return c.loaded || c.bolts > 0;
}

// 射撃で戦う距離か。近すぎる・矢が無い時は近接（rangedOnly 時は矢がある限り射撃を維持）。
export function rangedMode(actor, d) {
  if (actor.rangedOnly && canShoot(actor)) return true;
  return canShoot(actor) && d > CROSSBOW.meleeSwitch;
}

function pickPart(state) {
  let total = 0;
  for (const key of PART_KEYS) total += PART_WEIGHTS[key];
  let r = rand(state) * total;
  for (const key of PART_KEYS) {
    r -= PART_WEIGHTS[key];
    if (r <= 0) return key;
  }
  return 'chest';
}

function grow(actor, amount) {
  if (!actor.skills) return;
  actor.skills.crossbow = Math.min(100, (actor.skills.crossbow || 0) + amount);
}

// 線分 a→b から点 p までの距離と、線分上の位置 t（0..1）。
function segDist(ax, az, bx, bz, px, pz) {
  const dx = bx - ax;
  const dz = bz - az;
  const L2 = dx * dx + dz * dz;
  let t = L2 > 0 ? ((px - ax) * dx + (pz - az) * dz) / L2 : 0;
  t = clamp(t, 0, 1);
  const qx = ax + dx * t;
  const qz = az + dz * t;
  return { d: Math.hypot(px - qx, pz - qz), t };
}

// 射線の上に味方（敵ではない人）がいるか。的より手前だけ。
export function allyInLine(state, shooter, target) {
  for (const o of state.actors) {
    if (o.id === shooter.id || o.id === target.id) continue;
    if (!isStanding(o) || o.carriedBy !== null) continue;
    if (isHostile(state, shooter, o)) continue;
    const s = segDist(shooter.x, shooter.z, target.x, target.z, o.x, o.z);
    if (s.t > 0.02 && s.t < 0.98 && s.d < 0.8) return o;
    // 的と組み合っている味方（外れた矢が当たりやすい）
    if (Math.hypot(o.x - target.x, o.z - target.z) < 1.8) return o;
  }
  return null;
}

// 誤射を避ける確率（誤射回避1あたり 1.5%、約67で100%）
export function friendlyAvoid(actor, state, target, turret = false) {
  const skills = actor.skills || {};
  const base = turret ? Math.max((skills.turret || 0) * 0.02, (skills.precision || 0) * 0.015) : (skills.precision || 0) * 0.015;
  const dark = state ? darknessOf(Math.max(lightAtActor(state, actor), lightAtActor(state, target || actor))) : 0;
  const head = actor.parts?.head;
  const ratio = head && head.max > 0 ? clamp(head.hp / head.max, 0, 1) : 1;
  return clamp(base, 0, 1) * (1 - DARK_RANGED_PENALTY * dark) * (0.5 + 0.5 * ratio);
}

// 数えるだけ（テストと調整用）。
export function boltStats(state) {
  if (!state.boltStats) state.boltStats = { shots: 0, hits: 0, friendly: 0, parried: 0, dodged: 0 };
  return state.boltStats;
}

function inSquad(state, actor) {
  return Array.isArray(state.squadIds) && state.squadIds.includes(actor.id);
}

function fire(state, shooter, target, events) {
  const c = shooter.crossbow;
  const p = rangedHitChance(state, shooter, target);
  const hit = chance(state, p);
  const dx = target.x - shooter.x;
  const dz = target.z - shooter.z;
  let ang = Math.atan2(dx, dz);
  if (!hit) {
    const dev = randRange(state, CROSSBOW.missDeg[0], CROSSBOW.missDeg[1]) * (Math.PI / 180);
    ang += rand(state) < 0.5 ? -dev : dev;
  }
  if (!Array.isArray(state.projectiles)) state.projectiles = [];
  state.nextBoltId = (state.nextBoltId || 1) + 1;
  state.projectiles.push({
    id: state.nextBoltId,
    shooterId: shooter.id,
    targetId: target.id,
    homing: hit,
    x: shooter.x + Math.sin(ang) * 0.5,
    z: shooter.z + Math.cos(ang) * 0.5,
    px: shooter.x,
    pz: shooter.z,
    dirX: Math.sin(ang),
    dirZ: Math.cos(ang),
    left: crossbowRange(shooter) * 1.25,
    born: state.tick,
  });
  boltStats(state).shots += 1;
  c.loaded = false;
  c.aim = 0;
  c.reload = c.bolts > 0 ? reloadTicks(shooter) : 0;
  shooter.lastShotTick = state.tick;
  shooter.rot = Math.atan2(dx, dz);
  grow(shooter, 0.005);
  if (c.bolts === 0 && inSquad(state, shooter)) {
    events.push(makeEvent(state, 'ammo', shooter.name + 'の矢が尽きた'));
  }
}

function fireThrown(state, shooter, target, stack, item, events) {
  const p = rangedHitChance(state, shooter, target, 'throwing');
  const hit = chance(state, p);
  const dx = target.x - shooter.x;
  const dz = target.z - shooter.z;
  let ang = Math.atan2(dx, dz);
  if (!hit) {
    const dev = randRange(state, 3, item.kind === 'shuriken' ? 9 : 7) * Math.PI / 180;
    ang += rand(state) < .5 ? -dev : dev;
  }
  stack.n -= 1;
  if (stack.n <= 0) shooter.inv.splice(shooter.inv.indexOf(stack), 1);
  state.projectiles ||= [];
  state.nextBoltId = (state.nextBoltId || 0) + 1;
  const perception = effectivePerception(shooter);
  state.projectiles.push({
    id: state.nextBoltId, kind: 'thrown', itemId: item.id, shooterId: shooter.id, targetId: target.id,
    homing: hit, x: shooter.x + Math.sin(ang) * .5, z: shooter.z + Math.cos(ang) * .5,
    px: shooter.x, pz: shooter.z, dirX: Math.sin(ang), dirZ: Math.cos(ang),
    left: thrownRange(shooter, item.id), speed: item.kind === 'shuriken' ? 36 : 25,
    hitRadius: item.kind === 'shuriken' ? .24 : .30,
    damageCut: item.damage_cut, damageBlunt: item.damage_blunt, bleed: item.bleed,
    reflectableByParry: item.reflectable_by_parry, born: state.tick, reflected: 0,
  });
  shooter.lastThrowTick = state.tick;
  shooter.rot = Math.atan2(dx, dz);
  growSkill(shooter, 'throwing', .005, (target.skills?.defense || 0));
  setAnim(shooter, 'Idle', state.tick);
  if (shooter.isPlayer) events.push(makeEvent(state, 'throw', shooter.name + 'は' + item.name + 'を投げた'));
}

// 装填を進め、射撃の距離にいる者は撃つ。resolveCombat の前に呼ぶ。
export function updateCrossbows(state, events, byId) {
  for (const a of state.actors) {
    const c = a.crossbow;
    if (a.turretId) continue;
    if (a.state === 'dead') continue;
    if (a.state === 'down' || a.state === 'getup' || a.carryingId != null || a.carriedBy != null || (a.dazeUntil || 0) > state.tick) continue;
    const stack = (a.inv || []).find(x => thrownById.has(x.id) && (x.n || 0) > 0);
    const thrown = stack && thrownById.get(stack.id);
    const tTarget = byId.get(a.targetId);
    if (thrown && tTarget && isStanding(tTarget) && isHostile(state, a, tTarget) && (a.fleeUntil || 0) <= state.tick) {
      const d = distBetween(a, tTarget);
      const interval = Math.max(1, Math.round(thrown.throw_interval_sec * 10 * (1 - .3 * clamp(a.skills?.throwing || 0, 0, 100) / 100)));
      if (d > 2.2 && d <= thrownRange(a, thrown.id) && state.tick - (a.lastThrowTick ?? -10000) >= interval && !a.movedThisTick) {
        fireThrown(state, a, tTarget, stack, thrown, events);
        continue;
      }
    }
    if (!c) continue;
    const busy = a.state === 'down' || a.state === 'getup' || a.carryingId !== null || a.carriedBy !== null;
    if (!c.loaded && c.reload > 0 && !busy) {
      c.reload -= 1;
      if (c.reload <= 0 && c.bolts > 0) {
        c.bolts -= 1;
        if (a.equip?.quiver?.ammo) a.equip.quiver.ammo.n = c.bolts;
        c.loaded = true;
      }
    }
    if (busy || a.targetId === null) {
      c.aim = 0;
      a.aiming = false;
      continue;
    }
    if ((a.fleeUntil || 0) > state.tick) {
      a.aiming = false;
      continue;
    }
    const t = byId.get(a.targetId);
    if (!t || t.state === 'dead') {
      a.aiming = false;
      continue;
    }
    const d = distBetween(a, t);
    a.aiming = rangedMode(a, d) && d <= crossbowRange(a);
    if (!a.aiming || !c.loaded) {
      c.aim = 0;
      continue;
    }
    if (a.movedThisTick) {
      c.aim = 0;
      continue;
    }
    c.aim += 1;
    a.skills.perception = Math.min(100, (a.skills.perception || 0) + 0.0015);
    if (c.aim < CROSSBOW.aimTicks) continue;
    const ally = allyInLine(state, a, t);
    if (ally && chance(state, friendlyAvoid(a, state, t))) {
      c.aim = CROSSBOW.aimTicks - 1;
      continue;
    }
    fire(state, a, t, events);
    setAnim(a, 'Idle', state.tick);
  }
}

function numericId(id) {
  if (typeof id === 'number') return id;
  let h = 0;
  for (const ch of String(id)) h = (Math.imul(h, 31) + ch.charCodeAt(0)) | 0;
  return h;
}

// 防御確率。方向による補正は判定側で掛ける。
export function boltGuardChance(bolt, victim, shooter) {
  const weapon = WEAPONS[victim.weapon];
  const armed = !!weapon?.armed;
  if (!armed && victim.weapon !== 'fists') return 0;
  const perception = effectivePerception(victim);
  const skill = bolt.kind === 'thrown' ? 'throwing' : (bolt.turret ? 'turret' : 'crossbow');
  const shot = ((shooter.skills?.[skill] || 0) + effectivePerception(shooter)) / 2;
  const guard = ((victim.skills?.[armed ? 'defense' : 'dodge'] || 0) + perception) / 2;
  const diff = guard - shot;
  const chance = armed
    ? clamp(0.42 + diff * 0.007 + 0.08 - weapon.weight * 0.008 + weapon.def * 0.01, 0.03, 0.70)
    : clamp(0.05 + diff * 0.0035, 0.02, 0.35);
  return chance;
}

// 昼・20m・正面・刀の比較表（調整用）。
export function boltTable() {
  const state = { timeSec: 43200 };
  return [10, 40, 80].flatMap(shot => [10, 40, 80].map(guard => {
    const shooter = { x: 0, z: 0, skills: { crossbow: shot, perception: shot } };
    const victim = { x: 0, z: 20, weapon: 'sword', skills: { defense: guard, perception: guard } };
    const hit = rangedHitChance(state, shooter, victim);
    const parry = boltGuardChance({}, victim, shooter);
    return { shot, guard, hit, parry, through: hit * (1 - parry) };
  }));
}

// This check does not consume the simulation RNG, including when it fails.
export function tryParry(state, bolt, victim, shooter, events = []) {
  if (state.noParry || !shooter || beastRules(victim) || ['dead', 'down', 'getup'].includes(victim.state) ||
      victim.carryingId != null || victim.carriedBy != null || (victim.hitReact?.until || 0) > state.tick ||
      (victim.staggerUntil || 0) > state.tick || (victim.flinchUntil || 0) > state.tick ||
      (victim.parryReadyTick || 0) > state.tick) return false;
  const facing = Math.sin(victim.rot || 0) * -bolt.dirX + Math.cos(victim.rot || 0) * -bolt.dirZ;
  const perception = effectivePerception(victim);
  const half = (60 + 120 * perception / 100) * Math.PI / 180;
  if (facing < Math.cos(half) - 1e-12) return false;
  const weapon = WEAPONS[victim.weapon];
  const armed = !!weapon?.armed;
  if (!armed && victim.weapon !== 'fists') return false;
  const skill = bolt.kind === 'thrown' ? 'throwing' : (bolt.turret ? 'turret' : 'crossbow');
  const shot = ((shooter.skills?.[skill] || 0) + effectivePerception(shooter)) / 2;
  const p = boltGuardChance(bolt, victim, shooter) * (facing < 0.5 - 1e-12 ? 0.5 : 1) * ((victim.dazeUntil || 0) > state.tick ? .5 : 1);
  if (mixHash(numericId(bolt.id ?? bolt.born) ^ numericId(shooter.id), numericId(victim.id), state.tick) / 4294967296 >= p) return false;
  victim.parryReadyTick = state.tick + 2;
  growSkill(victim, armed ? 'defense' : 'dodge', armed ? 0.005 : 0.004, shot);
  const stats = boltStats(state);
  const key = armed ? 'parried' : 'dodged';
  stats[key] = (stats[key] || 0) + 1;
  if (isHostile(state, shooter, victim)) {
    victim.lastAttackerId = shooter.id;
    if (shooter.faction === 'player') victim.foughtPlayer = true;
    if (victim.faction === 'player') shooter.foughtPlayer = true;
    if (isStanding(victim) && victim.targetId === null && (victim.isPlayer || victim.faction === 'player' ? victim.moveTo == null : true)) {
      victim.targetId = shooter.id; victim.state = 'fight';
    }
  }
  state.combatFx ||= [];
  state.combatFx.push({ type: armed ? 'parry' : 'evade', tick: state.tick, x: victim.x, z: victim.z, attackerId: shooter.id, defenderId: victim.id });
  if (bolt.kind === 'thrown' && armed && !bolt.reflected && (victim.skills?.defense || 0) >= (bolt.reflectableByParry || 101)) {
    const dx = shooter.x - victim.x, dz = shooter.z - victim.z, len = Math.hypot(dx, dz) || 1;
    state.nextBoltId = (state.nextBoltId || 0) + 1;
    state.projectiles.push({ ...bolt, id: state.nextBoltId, shooterId: victim.id, targetId: shooter.id,
      x: victim.x, z: victim.z, px: victim.x, pz: victim.z, dirX: dx / len, dirZ: dz / len,
      left: len + 2, born: state.tick, homing: true, reflected: 1 });
    state.combatFx[state.combatFx.length - 1] = { type: 'reflect', tick: state.tick, x: victim.x, z: victim.z, attackerId: victim.id, defenderId: shooter.id };
    if (Array.isArray(events)) events.push(makeEvent(state, 'reflect', victim.name + 'が' + (itemName(bolt.itemId)) + 'を打ち返した'));
  }
  if (state.combatFx.length > 24) state.combatFx.splice(0, state.combatFx.length - 24);
  return true;
}

export function hitActor(state, bolt, victim, shooter, events) {
  if (bolt.kind === 'thrown') {
    const item = thrownById.get(bolt.itemId);
    const raw = (bolt.damageCut || 0) + (bolt.damageBlunt || 0);
    const cutShare = raw > 0 ? (bolt.damageCut || 0) / raw : 0;
    const partKey = pickPart(state);
    const armor = armorDamage(victim, shooter, state.tick, partKey, raw, { cutShare, topBalance: item?.kind === 'shuriken' ? .1 : .4 });
    const dmg = (armor.layers.length ? armor.total : raw) * (1 - ((victim.skills?.toughness || 0) * .004));
    applyDamage(state, victim, partKey, dmg, events, (bolt.bleed || 0) * (armor.layers.length ? armor.bleedFactor : 1));
    if (shooter && isHostile(state, shooter, victim)) {
      growSkill(shooter, 'throwing', .02, victim.skills?.defense || 0);
      victim.lastAttackerId = shooter.id;
      if (shooter.faction === 'player') victim.foughtPlayer = true;
      if (victim.faction === 'player') shooter.foughtPlayer = true;
      if (isStanding(victim) && victim.targetId == null && (victim.isPlayer || victim.faction === 'player' ? victim.moveTo == null : true)) { victim.targetId = shooter.id; victim.state = 'fight'; }
    }
    state.combatFx ||= [];
    state.combatFx.push({ type: 'hit', tick: state.tick, x: victim.x, z: victim.z, attackerId: shooter?.id, defenderId: victim.id });
    return;
  }
  const raw = randRange(state, CROSSBOW.min, CROSSBOW.max);
  const tough = (victim.skills && victim.skills.toughness) || 0;
  const partKey = pickPart(state);
  const armor = armorDamage(victim, shooter, state.tick, partKey, raw, {cutShare:0.85,topBalance:0});
  const dmg = (armor.layers.length ? armor.total : raw) * (1 - tough * 0.004); // 矢の打たれ強さは従来どおり（一度だけ）
  state.lastArmor = {victimId:victim.id,part:partKey,raw,final:dmg,layers:armor.layers,blocked:raw-armor.total};
  applyDamage(state, victim, partKey, dmg, events, CROSSBOW_BLEED * (armor.layers.length ? armor.bleedFactor : 1));
  const hostile = shooter && isHostile(state, shooter, victim);
  if (shooter && !hostile && shooter.skills) shooter.skills.precision = Math.min(100, (shooter.skills.precision || 0) + 0.3);
  if (shooter && hostile) {
    grow(shooter, 0.02);
    victim.lastAttackerId = shooter.id;
    if (shooter.faction === 'player') victim.foughtPlayer = true;
    if (victim.faction === 'player') shooter.foughtPlayer = true;
    if (isStanding(victim) && victim.targetId === null && (victim.isPlayer || victim.faction === 'player' ? victim.moveTo == null : true)) {
      victim.targetId = shooter.id;
      victim.state = 'fight';
    }
  } else if (shooter && (inSquad(state, shooter) || inSquad(state, victim))) {
    events.push(makeEvent(state, 'friendly', shooter.name + 'の矢が' + victim.name + 'に当たった'));
  }
  bolt.hitId = victim.id;
  const st = boltStats(state);
  if (hostile) st.hits += 1;
  else st.friendly += 1;
}

// 飛んでいる矢を進める。当たり・建物・飛びきりで消す。
export function updateProjectiles(state, events, byId) {
  const list = state.projectiles;
  if (!Array.isArray(list) || list.length === 0) return;
  const original = [...list];
  const stepLen = CROSSBOW.speed * TICK_SEC;
  const keep = [];
  for (const b of original) {
    b.px = b.x;
    b.pz = b.z;
    const shooter = byId.get(b.shooterId) || null;
    if (b.homing) {
      const t = byId.get(b.targetId);
      if (t && t.state !== 'dead') {
        const dx = t.x - b.x;
        const dz = t.z - b.z;
        const L = Math.hypot(dx, dz);
        if (L > 0.01) {
          b.dirX = dx / L;
          b.dirZ = dz / L;
        }
      } else {
        b.homing = false;
      }
    }
    const len = Math.min(b.speed ? b.speed * TICK_SEC : stepLen, b.left);
    const nx = b.x + b.dirX * len;
    const nz = b.z + b.dirZ * len;
    let best = null;
    let bestT = 2;
    for (const o of state.actors) {
      if (o.id === b.shooterId) continue;
      if (o.state === 'dead' || o.carriedBy !== null) continue;
      if (!isStanding(o) && o.id !== b.targetId) continue;
      const r = (b.hitRadius || CROSSBOW.hitRadius) * (o.renderScale || 1);
      const s = segDist(b.x, b.z, nx, nz, o.x, o.z);
      if (s.d < r && s.t < bestT) {
        bestT = s.t;
        best = o;
      }
    }
    // 狙った矢は、的の手前にいる者がいなければ的に当たる。
    if (best) {
      b.x = b.x + (nx - b.x) * bestT;
      b.z = b.z + (nz - b.z) * bestT;
      if (!tryParry(state, b, best, shooter, events)) hitActor(state, b, best, shooter, events);
      if (!beastRules(best) && best.skills) best.skills.perception = Math.min(100, (best.skills.perception || 0) + 0.003);
      continue;
    }
    if (blockedAt(state, nx, nz, 0.02)) continue;
    b.x = nx;
    b.z = nz;
    b.left -= len;
    if (b.left <= 0.001) continue;
    keep.push(b);
  }
  const oldIds = new Set(original.map(p => p.id));
  const reflected = state.projectiles.filter(p => !oldIds.has(p.id));
  state.projectiles = [...keep, ...reflected];
}
