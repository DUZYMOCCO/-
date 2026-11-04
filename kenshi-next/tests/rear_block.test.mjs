import test from 'node:test';
import assert from 'node:assert/strict';
import { BLOCK_POSES, chooseBlock, poseFor, weaponClass } from '../js/render/block_types.js';
import { WEAPONS } from '../js/sim/data.js';

test('rear blocks raise the wrist above the shoulder and point the weapon down the back', () => {
  const heavy = Object.keys(WEAPONS).find(id => weaponClass(id) === 'heavy');
  const light = Object.keys(WEAPONS).find(id => weaponClass(id) === 'light');
  assert.ok(heavy && light);
  for (const type of ['E1', 'E2']) for (const weapon of [light, heavy]) {
    const p = poseFor(type, weapon);
    const unit = v => v.map(n => n / Math.hypot(...v));
    const upper = unit(p.uar), lower = unit(p.lar), blade = unit(p.blade);
    // Both male and female GLBs have roughly equal upper and lower arm lengths.
    assert.ok(upper[2] * .24 + lower[2] * .24 > .32, `${type}: wrist above shoulder`);
    assert.ok(upper[0] * .24 + lower[0] * .24 < -.08, `${type}: wrist behind shoulder`);
    assert.ok(blade[0] < -.4 && blade[2] < -.6, `${type}: blade behind and down`);
    assert.equal(p.twoHand, weapon === heavy);
  }
});

test('automatic rear guard still uses rear types and frontal poses are unchanged', () => {
  const defender = { id: 1, x: 0, z: 0, rot: 0, weapon: 'katana' };
  for (const x of [-2, 0, 2]) {
    const result = chooseBlock(defender, { id: 2, x, z: -5, weapon: 'katana' }, 50);
    assert.equal(result.back, true);
    assert.ok(['E1', 'E2'].includes(result.type));
  }
  assert.deepEqual(BLOCK_POSES.A.blade, [0.2, -1, 0.1]);
});
