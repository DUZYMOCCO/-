import assert from 'node:assert/strict';
import { attackBlocked, wallGeometry } from '../js/gate-rules.js';
import { fieldBlocks, WORLD_SIZE } from '../js/world.js';
import { dungeonBlocks } from '../js/dungeon.js';

const center = WORLD_SIZE / 2;
// The old cliff faces are gone: nothing on the open field stops a hit at the former cliff lines.
const field = {currentDungeon: null, _economicWorks: []};
for (const [x, y] of [[center + 2500, center + 5024], [center + 2500, center + 5030], [center, center - 8020], [center + 6000, center + 24030]]) {
  assert.equal(fieldBlocks(x, y), false, 'a former cliff line is open ground');
  assert.equal(attackBlocked(field, {x: x - 60, y}, {x: x + 60, y}), false, 'a hit crosses the former cliff line');
  assert.equal(attackBlocked(field, {x, y: y - 60}, {x, y: y + 60}), false);
}
assert.equal(fieldBlocks(83200, 83000), false);
assert.equal(attackBlocked(field, {x: 83200, y: 83000}, {x: 83000, y: 83000}), false, 'the open ranged-test lane stays clear');

const dungeon = {kind: 'dungeon', width: 2200, height: 900};
const indoors = {currentDungeon: dungeon};
assert.equal(dungeonBlocks(dungeon, 360, 40), true);
assert.equal(attackBlocked(indoors, {x: 200, y: 40}, {x: 500, y: 40}), true, 'dungeon wall stops the hit');
assert.equal(attackBlocked(indoors, {x: 200, y: 450}, {x: 500, y: 450}), false, 'the corridor gap stays open');
assert.equal(attackBlocked(indoors, {x: 220, y: 450}, {x: 250, y: 450}), false, 'both fighters on the near side');

const hq = {currentDungeon: null};
const w = wallGeometry(hq);
assert.equal(attackBlocked(hq, {x: w.right - 40, y: w.top + 120}, {x: w.right + 40, y: w.top + 120}), true, 'fortification wall blocks');
assert.equal(attackBlocked(hq, {x: w.cx - 30, y: w.cy}, {x: w.cx + 30, y: w.cy}), false, 'inside the camp stays open');
const gate = {x: w.right - 40, y: w.cy};
assert.equal(attackBlocked(hq, gate, {x: w.right + 40, y: w.cy}), false, 'the gate opening does not block an attack');
console.log('PASS: no cliff cover on the field; attacks still stop at dungeon walls and fortifications');
