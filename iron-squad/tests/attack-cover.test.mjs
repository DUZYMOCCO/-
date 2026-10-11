import assert from 'node:assert/strict';
import { attackBlocked, wallGeometry } from '../js/gate-rules.js';
import { fieldBlocks, WORLD_SIZE } from '../js/world.js';
import { dungeonBlocks } from '../js/dungeon.js';

const center = WORLD_SIZE / 2;
let face = null;
for (let y = center + 4700; y < center + 5600 && !face; y += 4) {
  const x = center + 2500;
  if (fieldBlocks(x, y)) face = {x, y};
}
assert.ok(face, 'a cliff face exists to test against');
const openBeside = (dx) => {
  for (let i = 1; i < 40; i++) {
    const x = face.x + dx * i * 6;
    if (!fieldBlocks(x, face.y)) return {x, y: face.y};
  }
  return null;
};
const west = openBeside(-1), east = openBeside(1);
assert.ok(west && east, 'open ground sits on both sides of the face');
const field = {currentDungeon: null, _economicWorks: []};
assert.equal(attackBlocked(field, west, east), true, 'a spear or sword cannot hit across a cliff face');
assert.equal(attackBlocked(field, west, {x: west.x - 40, y: west.y}), false, 'same-side swings stay open');
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
console.log('PASS: attacks stop at cliff faces, dungeon walls, and fortifications');
