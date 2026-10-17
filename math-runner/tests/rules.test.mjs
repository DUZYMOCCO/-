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

// ---- v1.1.0 ゆっくり モード・けしき ----
import { SPEEDS, DEFAULT_SPEED, START_DELAY, THEMES, stageTheme } from '../js/rules.js';
import { RunnerEngine } from '../js/engine.js';

test('speeds: slow is default and much slower than the old 260px/s; gates farther apart', () => {
  assert.equal(DEFAULT_SPEED, 'slow');
  assert.ok(SPEEDS.slow.speed <= 130 && SPEEDS.slow.speed < SPEEDS.normal.speed && SPEEDS.normal.speed < SPEEDS.fast.speed);
  assert.equal(SPEEDS.fast.speed, 260); assert.equal(SPEEDS.fast.gateGap, 400); // むかしの はやさ
  // ゲートの かんかくを よむ じかん（びょう）
  const secs = k => SPEEDS[k].gateGap / SPEEDS[k].speed;
  assert.ok(secs('slow') >= 3.5 && secs('slow') > secs('normal') && secs('normal') > secs('fast'));
  for (const k of Object.keys(SPEEDS)) {
    const c = generateStageCourse(3, k);
    const gates = c.elements.filter(e => e.type === 'GATE_PAIR');
    assert.ok(gates.length >= 3, k);
    for (let i = 1; i < gates.length; i++) assert.equal(gates[i].y - gates[i - 1].y, SPEEDS[k].gateGap);
    assert.equal(c.hpMul, SPEEDS[k].hpMul);
  }
  // ゆっくりでも むずかしさは ほぼ おなじ（ブロックHPが ふえる）
  const hpOf = k => { let t = 0, n = 0; for (let i = 0; i < 40; i++) for (const e of generateStageCourse(2, k).elements) if (e.type === 'BLOCK') { t += e.maxHp; n++; } return t / n; };
  assert.ok(hpOf('slow') > hpOf('fast') * 1.6);
});

test('engine uses the chosen speed and waits briefly at the start', () => {
  const mk = speed => new RunnerEngine(generateStageCourse(1, speed), { ...normalizeSave({ speed }) });
  const e = mk('slow'); assert.equal(e.speed, SPEEDS.slow.speed);
  e.update(0.5); assert.equal(e.dist, 0);                       // まだ とまって いる
  for (let i = 0; i < 20; i++) e.update(0.1);
  assert.ok(e.dist > 0 && e.dist < SPEEDS.slow.speed * (2.5 - START_DELAY) + 1);
  assert.equal(mk('fast').speed, 260);
  // ゆっくり でも コインは おなじ くらい（HP ぶん あたいを わる）
  assert.equal(new RunnerEngine(generateStageCourse(1), normalizeSave(null)).course.hpMul, 2);
});

test('save: speed defaults to slow, bad values fall back, old saves keep coins/upgrades', () => {
  assert.equal(defaultSaveData().speed, 'slow');
  assert.equal(normalizeSave({ coins: 12, upgrades: { power: 3 } }).speed, 'slow');
  assert.equal(normalizeSave({ speed: 'fast' }).speed, 'fast');
  assert.equal(normalizeSave({ speed: 'warp' }).speed, 'slow');
  const o = normalizeSave({ coins: 12, stage: 4, upgrades: { power: 3 } });
  assert.deepEqual([o.coins, o.stage, o.upgrades.power], [12, 4, 3]);
});

test('scenery themes cycle meadow/desert/space and ride on the course', () => {
  assert.deepEqual(THEMES, ['meadow', 'desert', 'space']);
  assert.deepEqual([1, 2, 3, 4, 5].map(stageTheme), ['meadow', 'desert', 'space', 'meadow', 'desert']);
  assert.equal(generateStageCourse(3).theme, 'space');
});
