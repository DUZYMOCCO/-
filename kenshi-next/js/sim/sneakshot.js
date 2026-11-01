import { TICK_SEC } from './data.js';
import { clampToWorld } from './world_bounds.js';
import { mixHash } from './hitreact.js';

export const SNEAKSHOT = Object.freeze({
  baseFrac: 0.30,
  baseM: 8,
  stealthGain: 0.5,
  darkMul: 1.6,
  sameSpotM: 3,
  repeatShrink: 0.6,
  minRadiusM: 2,
  searchSec: 45,
  searchRadiusM: 18,
  arriveM: 2.2,
  alertGainMul: 2,
  alertRangeMul: 1.3,
  goMaxSec: 90,
});

function numericId(id) {
  if (typeof id === 'number') return id | 0;
  let h = 0;
  for (const ch of String(id)) h = (Math.imul(h, 31) + ch.charCodeAt(0)) | 0;
  return h;
}

function hash01(a, b, c, d) {
  return mixHash(numericId(a) ^ numericId(b), numericId(c), numericId(d)) / 4294967296;
}

export function prepareSneakShot(state, shooter, distance, stealth, light) {
  if (!shooter?.sneaking) return null;
  const records = state.sneakshotRecords || (state.sneakshotRecords = {});
  const key = String(shooter.id);
  const old = records[key];
  const moved = !old || Math.hypot(shooter.x - old.x, shooter.z - old.z) > SNEAKSHOT.sameSpotM;
  const count = moved ? 1 : old.count + 1;
  records[key] = { x: shooter.x, z: shooter.z, count };
  const repeat = moved ? 1 : Math.pow(SNEAKSHOT.repeatShrink, count - 1);
  const dark = 1 + (1 - Math.max(0, Math.min(1, light))) * (SNEAKSHOT.darkMul - 1);
  const radius = Math.max(SNEAKSHOT.minRadiusM,
    (SNEAKSHOT.baseFrac * distance + SNEAKSHOT.baseM) * (1 + SNEAKSHOT.stealthGain * stealth / 100) * dark * repeat);
  return { shooterId: shooter.id, x: shooter.x, z: shooter.z, radius, count, seed: state.seed ?? state.rngState ?? 0 };
}

export function estimateShotPosition(state, report, observerId, victim) {
  const dx = report.x - victim.x;
  const dz = report.z - victim.z;
  const len = Math.hypot(dx, dz) || 1;
  const ux = dx / len;
  const uz = dz / len;
  const sideX = uz;
  const sideZ = -ux;
  const seed = hash01(report.seed, report.shooterId, observerId, state.tick + report.count * 7919);
  const along = (seed * 2 - 1) * report.radius * 0.92;
  const side = (hash01(observerId, report.shooterId, report.count, state.tick + 104729) * 2 - 1) * report.radius * 0.28;
  return clampToWorld(report.x + ux * along + sideX * side, report.z + uz * along + sideZ * side);
}

export function setInvestigation(state, observer, report, victim) {
  if (!observer || observer.state === 'dead' || observer.state === 'down' || observer.state === 'getup') return false;
  // すでに誰かと戦っている者は、戦いをやめて調べには行かない。
  if (observer.targetId != null) return false;
  const estimated = estimateShotPosition(state, report, observer.id, victim);
  const previous = observer.sneakshotInvestigation;
  observer.sneakshotInvestigation = {
    x: estimated.x,
    z: estimated.z,
    r: report.radius,
    untilTick: state.tick + Math.ceil(SNEAKSHOT.searchSec / TICK_SEC),
    goUntilTick: state.tick + Math.ceil(SNEAKSHOT.goMaxSec / TICK_SEC),
    shooterId: report.shooterId,
    phase: 'go',
    searchUntilTick: 0,
    nextWanderTick: 0,
    previous: previous ? { x: previous.x, z: previous.z, r: previous.r } : null,
  };
  observer.targetId = null;
  observer.waitTargetId = null;
  observer.lastAttackerId = null;
  observer.state = 'move';
  return true;
}

export function updateInvestigations(state, events = []) {
  if (!Array.isArray(state?.actors)) return;
  for (const actor of state.actors) {
    const inv = actor.sneakshotInvestigation;
    if (!inv) continue;
    if (['dead', 'down', 'getup'].includes(actor.state) || actor.targetId != null || actor.faction === 'beast') {
      actor.sneakshotInvestigation = null;
      continue;
    }
    // 推定位置へたどり着けない（壁などで詰まる）ときも、goMaxSec でその場の捜索に切り替える。
    if (inv.phase === 'go' && (Math.hypot(actor.x - inv.x, actor.z - inv.z) <= SNEAKSHOT.arriveM ||
        state.tick >= (inv.goUntilTick ?? Infinity))) {
      inv.phase = 'search';
      inv.searchUntilTick = state.tick + Math.ceil(SNEAKSHOT.searchSec / TICK_SEC);
      inv.nextWanderTick = state.tick;
    } else if (inv.phase === 'search' && state.tick >= inv.searchUntilTick) {
      actor.sneakshotInvestigation = null;
      if (actor.state === 'move') actor.state = 'idle';
    }
  }
}

export function investigationTarget(state, actor) {
  const inv = actor?.sneakshotInvestigation;
  if (!inv) return null;
  if (inv.phase === 'go') return { x: inv.x, z: inv.z };
  if (state.tick >= (inv.nextWanderTick || 0)) {
    const n = Math.floor(state.tick / 18) + numericId(actor.id);
    const angle = hash01(state.seed ?? state.rngState, actor.id, n, 17) * Math.PI * 2;
    const radius = Math.sqrt(hash01(actor.id, n, state.seed ?? 0, 31)) * Math.min(SNEAKSHOT.searchRadiusM, inv.r * 0.9);
    const point = clampToWorld(inv.x + Math.sin(angle) * radius, inv.z + Math.cos(angle) * radius);
    inv.wanderX = point.x;
    inv.wanderZ = point.z;
    inv.nextWanderTick = state.tick + 18;
  }
  return { x: inv.wanderX ?? inv.x, z: inv.wanderZ ?? inv.z };
}
