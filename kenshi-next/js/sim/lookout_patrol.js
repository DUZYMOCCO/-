import { actorWorldY, houseRoofFloor } from './floors.js';
import { emitLookoutLine } from './narrative_text.js';
import { rand, randRange, chance } from './rng.js';

const TICK_SEC = 0.1;
const TAU = Math.PI * 2;

function isNight(state) {
  const hour = ((Number(state?.timeSec) || 0) / 3600) % 24;
  return hour >= 20 || hour < 6;
}

function localRng(state, actor) {
  if (!actor.lookoutRng) {
    const seed = ((state.seed | 0) ^ Math.imul(actor.id | 0, 0x45d9f3b)) | 0;
    actor.lookoutRng = { rngState: seed || 1 };
  }
  return actor.lookoutRng;
}

function roofPoint(house, x, z) {
  const floor = houseRoofFloor(house);
  return { x, z, floor, houseId: house.id, y: actorWorldY(house, floor, x, z) };
}

function roofWalk(house) {
  const x0 = house.x - house.w * 0.34;
  const x1 = house.x + house.w * 0.34;
  const z0 = house.z - house.d * 0.34;
  const z1 = house.z + house.d * 0.34;
  const xm = house.x;
  const zm = house.z;
  return [
    roofPoint(house, x0, z0), roofPoint(house, x1, z0),
    roofPoint(house, x1, z1), roofPoint(house, x0, z1),
    roofPoint(house, xm, z0 + (z1 - z0) * 0.28),
    roofPoint(house, x0 + (x1 - x0) * 0.72, zm),
    roofPoint(house, xm, z0 + (z1 - z0) * 0.72),
    roofPoint(house, x0 + (x1 - x0) * 0.28, zm),
  ];
}

function patrolRoute(state, actor) {
  const home = state.town?.houses?.find((house) => house.id === actor.home);
  if (!home?.roofGuard && !home?.stairs) return [];
  const route = roofWalk(home);
  const rng = localRng(state, actor);
  const links = (state.town.roofLinks || []).filter((link) => link.a === home.id || link.b === home.id);
  if (links.length && (state.lookoutDemoGuardId === actor.id || chance(rng, 0.42))) {
    const link = links[Math.floor(rand(rng) * links.length)];
    const neighborId = link.a === home.id ? link.b : link.a;
    const neighbor = state.town.houses.find((house) => house.id === neighborId);
    if (neighbor) {
      const from = link.a === home.id ? link.aPoint : link.bPoint;
      const to = link.a === home.id ? link.bPoint : link.aPoint;
      route.push(roofPoint(home, from.x, from.z), roofPoint(neighbor, to.x, to.z));
      route.push(...roofWalk(neighbor).slice(0, 4));
      route.push(roofPoint(neighbor, to.x, to.z), roofPoint(home, from.x, from.z));
    }
  }
  return route;
}

function prepare(state, actor) {
  if (actor.lookoutPatrol) return actor.lookoutPatrol;
  const route = patrolRoute(state, actor);
  if (!route.length) return null;
  const rng = localRng(state, actor);
  const home = state.town.houses.find((house) => house.id === actor.home);
  let nearest = 0;
  let best = Infinity;
  for (let i = 0; i < route.length; i += 1) {
    const d = Math.hypot(route[i].x - actor.x, route[i].z - actor.z);
    if (route[i].houseId === home.id && d < best) { best = d; nearest = i; }
  }
  return actor.lookoutPatrol = {
    route,
    index: nearest,
    phase: 'pause',
    nextLookTicks: Math.round(randRange(rng, 80, 150)),
    ticksSinceLook: 0,
    turnElapsed: 0,
    turnTicks: 0,
    turnStart: actor.rot || 0,
    turnDelta: 0,
    loop: 0,
  };
}

function activeThreat(state, actor) {
  if (actor.targetId != null || actor.waitTargetId != null || actor.state === 'fight' || actor.state === 'down' || actor.state === 'dead' || actor.state === 'getup') return true;
  if (state.law?.arrest?.guardId === actor.id && state.law.arrest.stage) return true;
  return false;
}

export function updateLookoutPatrols(state) {
  if (!state?.town) return;
  for (const actor of state.actors || []) {
    if (!actor.roofGuard || actor.state === 'dead') continue;
    const patrol = prepare(state, actor);
    if (!patrol) continue;
    if (activeThreat(state, actor)) {
      patrol.phase = 'alert';
      actor.lookoutPatrolMode = 'alert';
      actor.moveTo = null;
      if (!patrol.alertLineSent) {
        patrol.alertLineSent = true;
        emitLookoutLine(state, actor, 'spotted_by_lookout');
      }
      continue;
    }
    if (actor.id === state.lookoutDemoGuardId && patrol.phase === 'demo-finished') {
      actor.lookoutPatrolMode = 'pause';
      actor.moveTo = null;
      continue;
    }
    if (patrol.phase === 'alert') {
      patrol.phase = 'patrol';
      patrol.ticksSinceLook = 0;
      if (patrol.alertLineSent) {
        patrol.alertLineSent = false;
        emitLookoutLine(state, actor, 'lost_them');
      }
      const home = state.town.houses.find((house) => house.id === actor.home);
      if (home && actor.floor !== houseRoofFloor(home)) {
        actor.lookoutReturnHome = true;
        patrol.returnPoint = roofPoint(home, home.roofEntry.x, home.roofEntry.z);
      }
    }
    if (actor.lookoutReturnHome) {
      const point = patrol.returnPoint;
      actor.lookoutPatrolMode = 'patrol';
      actor.moveTo = { x: point.x, z: point.z, floor: point.floor };
      if (Math.hypot(point.x - actor.x, point.z - actor.z) < 0.6 && actor.floor === point.floor) {
        actor.lookoutReturnHome = false;
        actor.moveTo = null;
      }
      continue;
    }
    if (patrol.phase === 'pause') {
      patrol.ticksSinceLook += 1;
      actor.lookoutPatrolMode = 'pause';
      actor.moveTo = null;
      if (patrol.ticksSinceLook >= patrol.nextLookTicks) {
        const rng = localRng(state, actor);
        patrol.phase = 'turn';
        patrol.turnElapsed = 0;
        patrol.turnTicks = Math.round(randRange(rng, 20, 40));
        patrol.turnStart = actor.rot || 0;
        patrol.turnDelta = (chance(rng, 0.5) ? 1 : -1) * randRange(rng, Math.PI / 2, Math.PI);
        actor.lookoutPatrolMode = 'turn';
        emitLookoutLine(state, actor, 'lookout_spots');
      }
      if (isNight(state)) emitLookoutLine(state, actor, 'rooftop_sneak');
      continue;
    }
    if (patrol.phase === 'turn') {
      patrol.turnElapsed += 1;
      const t = Math.min(1, patrol.turnElapsed / patrol.turnTicks);
      const smooth = t * t * (3 - 2 * t);
      actor.rot = patrol.turnStart + patrol.turnDelta * smooth;
      actor.lookoutPatrolMode = 'turn';
      actor.moveTo = null;
      if (t >= 1) {
        patrol.phase = 'patrol';
        patrol.ticksSinceLook = 0;
        patrol.nextLookTicks = Math.round(randRange(localRng(state, actor), 80, 150));
      }
      continue;
    }
    const current = patrol.route[patrol.index];
    if (current && Math.hypot(current.x - actor.x, current.z - actor.z) < 0.68 && actor.floor === current.floor) {
      patrol.index += 1;
      if (patrol.index >= patrol.route.length) {
        patrol.index = 0;
        patrol.loop += 1;
        if (actor.id === state.lookoutDemoGuardId && patrol.loop >= (state.lookoutDemoLoopTarget || Infinity)) {
          patrol.phase = 'demo-finished';
          actor.lookoutPatrolMode = 'pause';
          actor.moveTo = null;
          continue;
        }
      }
    }
    patrol.ticksSinceLook += 1;
    if (patrol.ticksSinceLook >= patrol.nextLookTicks) {
      const rng = localRng(state, actor);
      patrol.phase = 'turn';
      patrol.turnElapsed = 0;
      patrol.turnTicks = Math.round(randRange(rng, 20, 40));
      patrol.turnStart = actor.rot || 0;
      const angle = randRange(rng, Math.PI / 2, Math.PI);
      patrol.turnDelta = (chance(rng, 0.5) ? 1 : -1) * angle;
      actor.lookoutPatrolMode = 'turn';
      actor.moveTo = null;
      emitLookoutLine(state, actor, 'lookout_spots');
      continue;
    }
    const goal = patrol.route[patrol.index];
    if (goal) {
      actor.lookoutPatrolMode = 'patrol';
      actor.moveTo = { x: goal.x, z: goal.z, floor: goal.floor };
    }
    if (isNight(state)) emitLookoutLine(state, actor, 'rooftop_sneak');
  }
}

export function lookoutPatrolSnapshot(actor) {
  const patrol = actor?.lookoutPatrol;
  if (!patrol) return null;
  return {
    route: patrol.route.map((point) => ({ ...point })),
    index: patrol.index,
    phase: patrol.phase,
    loop: patrol.loop,
    ticksSinceLook: patrol.ticksSinceLook,
    nextLookTicks: patrol.nextLookTicks,
    turnTicks: patrol.turnTicks,
    turnElapsed: patrol.turnElapsed,
    turnDelta: patrol.turnDelta,
  };
}

export function normalizeLookoutAngle(angle) {
  let value = angle % TAU;
  if (value > Math.PI) value -= TAU;
  if (value < -Math.PI) value += TAU;
  return value;
}
