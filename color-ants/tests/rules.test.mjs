import test from 'node:test';
import assert from 'node:assert/strict';
import { STAGES, buildPixelGrid, COLOR_GROUPS } from '../js/stages.js';
import {
  UPGRADE_DEFS,
  COLOR_UNLOCK_ORDER,
  getUpgradeCost,
  defaultSaveData,
  normalizeSave,
} from '../js/upgrades.js';
import { AntSimulation } from '../js/ants.js';

test('buildPixelGrid generates valid pixel list for apple stage', () => {
  const stage = STAGES[0];
  assert.equal(stage.id, 'apple');
  const pixels = buildPixelGrid(stage);
  assert.ok(pixels.length > 0, 'pixels should not be empty');

  // 全てのピクセルが正しいプロパティを持つこと
  for (const p of pixels) {
    assert.ok(p.id.includes('_'));
    assert.ok(p.gx >= 0 && p.gx < stage.size);
    assert.ok(p.gy >= 0 && p.gy < stage.size);
    assert.ok(typeof p.hex === 'string');
    assert.ok(typeof p.group === 'string');
    assert.equal(p.eaten, false);
    assert.ok(p.hp > 0);
  }
});

test('upgrade cost increases with level and handles max level', () => {
  const cost1 = getUpgradeCost('count', 1);
  const cost2 = getUpgradeCost('count', 2);
  const cost3 = getUpgradeCost('count', 3);

  assert.ok(cost1 < cost2, 'cost should increase');
  assert.ok(cost2 < cost3, 'cost should increase further');

  const maxLvl = UPGRADE_DEFS.count.maxLevel;
  const costMax = getUpgradeCost('count', maxLvl);
  assert.equal(costMax, Infinity, 'max level should return Infinity cost');
});

test('normalizeSave handles empty or corrupt save data safely', () => {
  const def = defaultSaveData();
  const normalizedEmpty = normalizeSave(null);
  assert.deepEqual(normalizedEmpty, def);

  const corrupted = {
    coins: -999,
    stageIndex: 'invalid',
    upgrades: { count: 999, speed: -5 },
    unlockedColors: [],
  };
  const normalizedCorrupted = normalizeSave(corrupted);
  assert.equal(normalizedCorrupted.coins, 0);
  assert.equal(normalizedCorrupted.stageIndex, 0);
  assert.equal(normalizedCorrupted.upgrades.count, UPGRADE_DEFS.count.maxLevel);
  assert.equal(normalizedCorrupted.upgrades.speed, 1);
  assert.deepEqual(normalizedCorrupted.unlockedColors, ['red']);
});

test('ant simulation correctly targets matching colors', () => {
  const sim = new AntSimulation(300, 500);
  const stage = STAGES[0]; // apple (red and green)
  const pixels = buildPixelGrid(stage);
  const gridInfo = { startX: 10, startY: 10, cellSize: 20 };

  // 赤アリ
  const redAnt = sim.createAnt('red');
  const target = sim.findBestTarget(redAnt, pixels, gridInfo);
  assert.ok(target, 'red ant should find a target');
  assert.equal(target.group, 'red', 'red ant must target red pixel');

  // にじいろアリ
  const rainbowAnt = sim.createAnt('rainbow');
  const rainbowTarget = sim.findBestTarget(rainbowAnt, pixels, gridInfo);
  assert.ok(rainbowTarget, 'rainbow ant should find any available target');
});
