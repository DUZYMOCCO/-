import { TOWN1 } from './world.js';
import { blockedAt } from './collide.js';
import { CROSSBOW, allyInLine, friendlyAvoid, boltStats } from './crossbow.js';
import { rangedHitChance } from './light.js';
import { chance, rand, randRange } from './rng.js';
import { isStanding } from './body.js';
import { isHostile, TICK_SEC } from './data.js';

export function turretSeat(turret) {
  return { x: turret.x - 1.52 * Math.sin(turret.rot), z: turret.z - 1.52 * Math.cos(turret.rot) };
}

export function turretReloadTicks(actor) {
  return Math.round((8 - 6 * Math.max(0, Math.min  (100, actor.skills?.turret || 0)) / 100) / TICK_SEC);
}

export function ensureTurret(state, placeOperator = false) {
  if (Array.isArray(state.turrets)) return;
  let pos = null;
  for (const radius of [18, 20, 22, 24]) {
    for (let i = 0; i < 64; i++) {
      const angle = i * Math.PI * 2 / 64;
      const x = TOWN1.x + Math.cos(angle) * radius, z = TOWN1.z + Math.sin(angle) * radius;
      if (!blockedAt(state, x, z, 3.1)) { pos = { x, z }; break; }
    }
    if (pos) break;
  }
  if (!pos) { state.turrets = []; return; }
  const guards = (state.actors || []).filter(a => a.faction === 'guard' && (a.squadId === 'guard1' || a.squadId === 'guard2'));
  guards.sort((a,b) => Math.hypot(a.x-pos.x,a.z-pos.z)-Math.hypot(b.x-pos.x,b.z-pos.z) || String(a.id).localeCompare(String(b.id), undefined, {numeric:true}));
  const operator = guards[0];
  const turret = { id: 'turret1', ...pos, rot: 0, loaded: true, reload: 0, aim: 0, operatorId: operator?.id ?? null };
  if (operator) {
    operator.turretId = turret.id;
    if (placeOperator) Object.assign(operator, turretSeat(turret));
  }
  state.turrets = [turret];
}

export function leaveTurret(state, actor) {
  const turret = (state.turrets || []).find(t => t.id === actor.turretId && t.operatorId === actor.id);
  if (turret) { turret.operatorId = null; turret.aim = 0; }
  actor.turretId = null;
}

export function updateTurrets(state, events, byId) {
  for (const t of state.turrets || []) {
    const a = byId.get(t.operatorId);
    if (!a || !isStanding(a) || a.carriedBy != null || a.carryingId != null) { if (a) leaveTurret(state, a); else { t.operatorId = null; t.aim = 0; } continue; }
    if (!t.loaded && t.reload > 0 && --t.reload <= 0) t.loaded = true;
    const target = byId.get(a.targetId);
    const seat = turretSeat(t);
    const near = Math.hypot(a.x-seat.x,a.z-seat.z) <= 1.1;
    if (!near || a.movedThisTick || !target || !isStanding(target) || target.carriedBy != null || !isHostile(state,a,target) || Math.hypot(target.x-t.x,target.z-t.z) > 35 || Math.hypot(target.x-a.x,target.z-a.z) <= CROSSBOW.meleeSwitch || !t.loaded) { t.aim = 0; continue; }
    t.rot = Math.atan2(target.x-t.x,target.z-t.z);
    t.aim++;
    for (const key of ['turret','perception']) a.skills[key] = Math.min(100, (a.skills[key] || 0) + 0.0015);
    if (t.aim < 4) continue;
    const origin = { ...a, x:t.x, z:t.z };
    if (allyInLine(state, origin, target) && chance(state, friendlyAvoid(origin,state,target,true))) { t.aim = 3; continue; }
    const hit = chance(state, rangedHitChance(state, origin, target, 'turret'));
    let ang = t.rot;
    if (!hit) { const dev = randRange(state,3,6)*Math.PI/180; ang += rand(state)<0.5 ? -dev : dev; }
    state.projectiles ||= [];
    state.nextBoltId = (state.nextBoltId || 1) + 1;
    state.projectiles.push({id:state.nextBoltId, shooterId:a.id, turret:true, targetId:target.id, homing:hit, x:t.x+Math.sin(ang)*0.5, z:t.z+Math.cos(ang)*0.5, px:t.x, pz:t.z, dirX:Math.sin(ang), dirZ:Math.cos(ang), left:35*1.25, born:state.tick});
    boltStats(state).shots++;
    t.loaded = false; t.reload = turretReloadTicks(a); t.aim = 0; a.lastShotTick = state.tick;
  }
}

