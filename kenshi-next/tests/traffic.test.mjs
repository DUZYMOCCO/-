// パンプアップ・シティの交通（車・列車・通行人・床の硬さ）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step } from '../js/sim/index.js';
import { floorHardnessAt, floorAt } from '../js/world/pumpu_city.js';
import { updateTraffic } from '../js/sim/traffic.js';

test('床の硬さは店先広場＝コンクリート、公園＝芝で変わる', () => {
  assert.equal(floorHardnessAt(280.8, 27.5), 1.35); // 店先広場
  assert.equal(floorHardnessAt(259, 35.5), 0.55); // 公園の芝（園路から外れた位置）
  assert.equal(floorAt(259, 35.5).name, '公園の芝');
  assert.equal(floorHardnessAt(0, 0), 1); // 市から外は通常
});

test('通常世界では車・列車・通行人が立つ', () => {
  const state = createWorld(7, { spawn: false, town: false });
  assert.equal(Boolean(state.traffic), true);
  assert.equal(state.traffic.cars.length, 4);
  assert.equal(Boolean(state.traffic.train), true);
  const people = state.actors.filter((a) => a.cityPedestrian);
  assert.equal(people.length, 4);
  assert.equal(people.every((a) => a.faction === 'civil'), true);
});

test('車に当たった通行人は倒れて負傷する', () => {
  const state = createWorld(7, { spawn: false, town: false });
  const person = state.actors.find((a) => a.cityPedestrian);
  const car = state.traffic.cars[0];
  car.x = person.x;
  car.z = person.z;
  const events = [];
  updateTraffic(state, events);
  assert.equal(person.state, 'down');
  assert.equal(events.some((e) => e.text.includes('撥ねられた')), true);
  assert.equal(person.parts.lLeg.hp < person.parts.lLeg.max, true);
});

test('試合モードでは交通は初期化されず、?city=1 でのみ有効', () => {
  const solo = createWorld(7, { spawn: false, town: false, match: true });
  assert.equal(solo.traffic, null);
  assert.equal(solo.actors.filter((a) => a.cityPedestrian).length, 0);
  const busy = createWorld(7, { spawn: false, town: false, match: true, city: true });
  assert.equal(Boolean(busy.traffic), true);
  assert.equal(busy.actors.filter((a) => a.cityPedestrian).length, 4);
});
