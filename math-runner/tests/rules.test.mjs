import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GATE_TYPES,
  applyGate,
  getGateText,
  isGoodGate,
  UPGRADES,
  getUpgradeCost,
  defaultSaveData,
  normalizeSave,
  generateStageCourse,
} from '../js/rules.js';

test('applyGate computes correct math operations with boundaries', () => {
  // 加算
  assert.equal(applyGate(5, { type: GATE_TYPES.ADD, val: 5 }), 10);
  // 減算（最低1を保証）
  assert.equal(applyGate(5, { type: GATE_TYPES.SUB, val: 3 }), 2);
  assert.equal(applyGate(3, { type: GATE_TYPES.SUB, val: 10 }), 1);
  // 乗算
  assert.equal(applyGate(4, { type: GATE_TYPES.MUL, val: 3 }), 12);
  // 除算（最低1を保証）
  assert.equal(applyGate(9, { type: GATE_TYPES.DIV, val: 2 }), 4);
  assert.equal(applyGate(1, { type: GATE_TYPES.DIV, val: 5 }), 1);
  // 上限999
  assert.equal(applyGate(500, { type: GATE_TYPES.MUL, val: 10 }), 999);
});

test('getGateText and isGoodGate return correct representations', () => {
  const addGate = { type: GATE_TYPES.ADD, val: 7 };
  assert.equal(getGateText(addGate), '+7');
  assert.equal(isGoodGate(addGate), true);

  const subGate = { type: GATE_TYPES.SUB, val: 4 };
  assert.equal(getGateText(subGate), '-4');
  assert.equal(isGoodGate(subGate), false);

  const mulGate = { type: GATE_TYPES.MUL, val: 2 };
  assert.equal(getGateText(mulGate), '×2');
  assert.equal(isGoodGate(mulGate), true);

  const divGate = { type: GATE_TYPES.DIV, val: 2 };
  assert.equal(getGateText(divGate), '÷2');
  assert.equal(isGoodGate(divGate), false);
});

test('generateStageCourse generates playable track with gates and walls', () => {
  const course = generateStageCourse(1);
  assert.ok(course.length > 2000);
  assert.ok(course.finishY > 1500);

  const gates = course.elements.filter(e => e.type === 'GATE_PAIR');
  const blocks = course.elements.filter(e => e.type === 'BLOCK');

  assert.ok(gates.length >= 3, 'should have multiple gates');
  assert.ok(blocks.length >= 3, 'should have blocks');
  assert.ok(course.walls.length >= 5, 'should have multiplier walls');

  // 壁の倍率が昇順であること
  for (let i = 1; i < course.walls.length; i++) {
    assert.ok(course.walls[i].mult > course.walls[i - 1].mult);
  }
});

test('upgrades cost and normalization behave safely', () => {
  const cost1 = getUpgradeCost('startCount', 1);
  const cost2 = getUpgradeCost('startCount', 2);
  assert.ok(cost1 < cost2);

  const maxLvl = UPGRADES.startCount.maxLevel;
  assert.equal(getUpgradeCost('startCount', maxLvl), Infinity);

  const norm = normalizeSave({ coins: -50, upgrades: { startCount: 999 } });
  assert.equal(norm.coins, 0);
  assert.equal(norm.upgrades.startCount, maxLvl);
});
