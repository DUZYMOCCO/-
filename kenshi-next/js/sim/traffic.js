// パンプアップ・シティの交通（車・高架列車・通行人）。
// 車は表通りの2レーンを走り、通行人は歩道と横断歩道の固定ルートを歩く。
// 車に当たった通行人は倒れて負傷する（コメディ寄りの事故）。
import { makeEvent } from './data.js';
import { applyDamage } from './body.js';
import { floorHardnessAt } from '../world/pumpu_city.js';

const TICK_SEC = 0.1;
const ROAD_MIN_X = 250;
const ROAD_MAX_X = 310;

export function initTraffic(state) {
  state.traffic = {
    cars: [
      { id: 1, x: 256, z: 31.35, dir: 1, speed: 5.2, w: 3.6, d: 1.7, color: '#586876' },
      { id: 2, x: 292, z: 31.35, dir: 1, speed: 4.4, w: 3.6, d: 1.7, color: '#7a5a40' },
      { id: 3, x: 304, z: 35.35, dir: -1, speed: 5.6, w: 3.6, d: 1.7, color: '#49606a' },
      { id: 4, x: 268, z: 35.35, dir: -1, speed: 4.8, w: 3.6, d: 1.7, color: '#8a4f43' },
    ],
    train: { x: 246, z: 25.8, dir: 1, speed: 8, w: 48, d: 2.2 },
    hitTick: {},
  };
}

function wrapRoad(car) {
  if (car.dir > 0 && car.x > ROAD_MAX_X) car.x = ROAD_MIN_X;
  if (car.dir < 0 && car.x < ROAD_MIN_X) car.x = ROAD_MAX_X;
}

function overlap(car, actor) {
  return Math.abs(car.x - actor.x) < car.w / 2 + 0.4 && Math.abs(car.z - actor.z) < car.d / 2 + 0.4;
}

function hitActor(state, car, actor, events) {
  if (!actor || actor.state === 'dead' || actor.state === 'down' || actor.state === 'getup') return;
  if (actor.carriedBy != null || actor.muscleInfinite) return;
  const key = `${car.id}:${actor.id}`;
  if (state.traffic.hitTick[key] && state.tick - state.traffic.hitTick[key] < 40) return;
  state.traffic.hitTick[key] = state.tick;
  const hardness = floorHardnessAt(actor.x, actor.z, 1);
  const dmg = Math.round(150 * hardness);
  const blunt = Math.round(130 * hardness);
  applyDamage(state, actor, 'lLeg', dmg, events, 0.5, blunt);
  actor.state = 'down';
  actor.knocked = true;
  actor.downTicks = Math.max(actor.downTicks || 0, 80);
  actor.downPose = 'supine';
  actor.anim = 'Fall';
  actor.animTick = state.tick;
  actor.targetId = null;
  actor.moveTo = null;
  actor.x = Math.round((actor.x + car.dir * 1.4) * 100) / 100;
  events.push(makeEvent(state, 'traffic', actor.name + 'は車に撥ねられた'));
}

function moveCityPeople(state) {
  for (const actor of state.actors) {
    if (!actor.cityRoute || actor.state === 'dead' || actor.state === 'down' || actor.state === 'getup') continue;
    if (actor.carriedBy != null) continue;
    const route = actor.cityRoute;
    const target = route.points[route.i % route.points.length];
    const dx = target.x - actor.x;
    const dz = target.z - actor.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.15) {
      route.i += 1;
      continue;
    }
    const step = Math.min(dist, route.speed * TICK_SEC);
    actor.x = Math.round((actor.x + (dx / dist) * step) * 100) / 100;
    actor.z = Math.round((actor.z + (dz / dist) * step) * 100) / 100;
    actor.rot = Math.atan2(dx, dz);
    actor.state = 'move';
    actor.anim = 'Run';
    actor.moveTo = { x: target.x, z: target.z };
  }
}

export function updateTraffic(state, events = []) {
  const traffic = state.traffic;
  if (!traffic) return;
  for (const car of traffic.cars) {
    car.x += car.dir * car.speed * TICK_SEC;
    wrapRoad(car);
    for (const actor of state.actors) {
      if (!actor.cityPedestrian) continue;
      if (!overlap(car, actor)) continue;
      hitActor(state, car, actor, events);
    }
  }
  traffic.train.x += traffic.train.dir * traffic.train.speed * TICK_SEC;
  if (traffic.train.x > ROAD_MAX_X + 30) traffic.train.x = ROAD_MIN_X - 30;
  moveCityPeople(state);
}
