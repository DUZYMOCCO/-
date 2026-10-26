import test from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../js/sim/sim.js?v=28';
import { MISSION_1 } from '../js/sim/mission.js?v=10';
import { stepNewEnemies } from '../js/sim/new-enemies.js?v=2';
import { cannotBeCaptured } from '../js/sim/ride.js?v=3';

const api = { cannotBeCaptured, autoRepair() {}, removeDead() {}, isStunned: () => false };

test('追加の範囲攻撃は別の帯と乗車中の人を巻き込まない', () => {
  const t = { id: 1, side: 'ally', hp: 120, x: 600, y: 600, z: 0 };
  const diver = { ...t, id: 2, z: -14 };
  const rider = { ...t, id: 3, human: true, ride: { phase: 'on', host: 1, mode: 'back' } };
  const sim = { time: 1, units: [t, diver, rider], ne: { splashed: 0, mines: [] }, fx: [{ type: 'shot', t: 1, kind: 'G04', side: 'enemy', toSide: 'ally', to: 1, dmg: 20 }] };
  stepNewEnemies(sim, 1 / 30, api);
  assert.equal(diver.hp, 120); assert.equal(rider.hp, 120);
  const bomb = { ...t, id: 4, side: 'enemy', kind: 'G06' };
  sim.units = [diver, rider, bomb]; sim.fx = []; sim.ne.exploded = 0;
  stepNewEnemies(sim, 1 / 30, api);
  assert.equal(sim.ne.exploded, 0, '潜った相手や乗車中の人だけでは自爆しない');
  sim.units.push(t);
  stepNewEnemies(sim, 1 / 30, api);
  assert.equal(sim.ne.exploded, 1); assert.equal(t.hp, 80);
  assert.equal(diver.hp, 120); assert.equal(rider.hp, 120);
});

test('猟兵: 水中の好物を選ばず、追跡中に潜った相手への命令もやめる', () => {
  for (const [kind, targetKind] of [['G08', 'boy'], ['G11', 'scav']]) {
    const sim = S.createSim({ seed: 1, mission: MISSION_1, newEnemies: true });
    const e = sim.units.find(u => u.kind === kind);
    const target = sim.units.find(u => u.kind === targetKind);
    sim.units = [e, target]; sim.groups = [];
    Object.assign(e, { x: 600, y: 600, groupId: null, order: null, stance: 'hold' });
    Object.assign(target, { x: 700, y: 600, z: -14, order: null, atk: 0 });
    S.runSim(sim, 20);
    assert.equal(e.neHunt ?? null, null);
    assert.equal(e.order, null);
    assert.equal(e.x, 600);
    target.z = 0;
    S.runSim(sim, 20);
    assert.equal(e.neHunt, target.id);
    target.z = -14;
    S.runSim(sim, 20);
    assert.equal(e.neHunt, null);
    assert.equal(e.order, null);
    assert.equal(e.speedMul, 1);
  }
});
