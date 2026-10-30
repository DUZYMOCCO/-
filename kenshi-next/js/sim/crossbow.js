// クロスボウ（射撃）。装填・矢の数・飛ぶ矢・味方への誤射。
// 数値の出典と仮の値は research/crossbow.md。★=仮。

import { TICK_SEC, PART_KEYS, PART_WEIGHTS, isHostile, distBetween, makeEvent, setAnim, CROSSBOW_BLEED } from './data.js';
import { rand, randRange, chance } from './rng.js';
import { applyDamage, isStanding } from './body.js';
import { blockedAt } from './collide.js';
import { rangedHitChance } from './light.js';

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
  actor.crossbow = { bolts: Math.max(0, Math.floor(bolts)), loaded: true, reload: 0, aim: 0 };
  if (!actor.skills) actor.skills = {};
  if (typeof actor.skills.crossbow !== 'number') actor.skills.crossbow = CROSSBOW_SKILL[actor.faction] || 10;
  return actor;
}

// 装填にかかる tick。技能と器用（どちらも100まで）の合計 / 200 で遅い→速いへ（Kenshi どおり）。
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

// 射撃で戦う距離か。近すぎる・矢が無い時は近接。
export function rangedMode(actor, d) {
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
    if (isHostile(state, shooter.faction, o.faction)) continue;
    const s = segDist(shooter.x, shooter.z, target.x, target.z, o.x, o.z);
    if (s.t > 0.02 && s.t < 0.98 && s.d < 0.8) return o;
    // 的と組み合っている味方（外れた矢が当たりやすい）
    if (Math.hypot(o.x - target.x, o.z - target.z) < 1.8) return o;
  }
  return null;
}

// 誤射を避ける確率（Kenshi: 精密射撃1あたり 1.5%、約67で100%）。ここでは技能で代用。
export function friendlyAvoid(actor) {
  const s = (actor.skills && actor.skills.crossbow) || 0;
  return clamp(s * 0.015, 0, 1);
}

// 数えるだけ（テストと調整用）。
export function boltStats(state) {
  if (!state.boltStats) state.boltStats = { shots: 0, hits: 0, friendly: 0 };
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
    left: CROSSBOW.range * 1.25,
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

// 装填を進め、射撃の距離にいる者は撃つ。resolveCombat の前に呼ぶ。
export function updateCrossbows(state, events, byId) {
  for (const a of state.actors) {
    const c = a.crossbow;
    if (!c) continue;
    if (a.state === 'dead') continue;
    const busy = a.state === 'down' || a.state === 'getup' || a.carryingId !== null || a.carriedBy !== null;
    if (!c.loaded && c.reload > 0 && !busy) {
      c.reload -= 1;
      if (c.reload <= 0 && c.bolts > 0) {
        c.bolts -= 1;
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
    a.aiming = rangedMode(a, d) && d <= CROSSBOW.range;
    if (!a.aiming || !c.loaded) {
      c.aim = 0;
      continue;
    }
    if (a.movedThisTick) {
      c.aim = 0;
      continue;
    }
    c.aim += 1;
    if (c.aim < CROSSBOW.aimTicks) continue;
    const ally = allyInLine(state, a, t);
    if (ally && chance(state, friendlyAvoid(a))) {
      c.aim = CROSSBOW.aimTicks - 1;
      continue;
    }
    fire(state, a, t, events);
    setAnim(a, 'Idle', state.tick);
  }
}

function hitActor(state, bolt, victim, shooter, events) {
  const raw = randRange(state, CROSSBOW.min, CROSSBOW.max);
  const tough = (victim.skills && victim.skills.toughness) || 0;
  const dmg = raw * (1 - tough * 0.004);
  const partKey = pickPart(state);
  applyDamage(state, victim, partKey, dmg, events, CROSSBOW_BLEED);
  const hostile = shooter && isHostile(state, shooter.faction, victim.faction);
  if (shooter && hostile) {
    grow(shooter, 0.02);
    victim.lastAttackerId = shooter.id;
    if (shooter.faction === 'player') victim.foughtPlayer = true;
    if (victim.faction === 'player') shooter.foughtPlayer = true;
    if (isStanding(victim) && victim.targetId === null && (victim.isPlayer ? victim.moveTo === null : true)) {
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
  const stepLen = CROSSBOW.speed * TICK_SEC;
  const keep = [];
  for (const b of list) {
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
    const len = Math.min(stepLen, b.left);
    const nx = b.x + b.dirX * len;
    const nz = b.z + b.dirZ * len;
    let best = null;
    let bestT = 2;
    for (const o of state.actors) {
      if (o.id === b.shooterId) continue;
      if (o.state === 'dead' || o.carriedBy !== null) continue;
      if (!isStanding(o) && o.id !== b.targetId) continue;
      const r = CROSSBOW.hitRadius * (o.renderScale || 1);
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
      hitActor(state, b, best, shooter, events);
      continue;
    }
    if (blockedAt(state, nx, nz, 0.02)) continue;
    b.x = nx;
    b.z = nz;
    b.left -= len;
    if (b.left <= 0.001) continue;
    keep.push(b);
  }
  state.projectiles = keep;
}
