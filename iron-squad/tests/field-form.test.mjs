import assert from 'node:assert/strict';
import { contactSpread, contactShadow, drawFieldBoss, drawFieldSoldier, drawFieldCommander } from '../js/visuals.js';

const idle = contactSpread(10, 4, 0);
const planted = contactSpread(10, 4, 1);
assert.ok(planted.rx > idle.rx, 'a planted foot widens the shadow');
assert.ok(planted.ry < idle.ry, 'a planted foot flattens the shadow');
assert.deepEqual(contactSpread(10, 4, 5).rx, planted.rx);

let depth = 0;
let arcs = 0;
let marks = 0;
const ellipses = [];
const context = new Proxy({
  save() { depth++; },
  restore() { depth--; },
  ellipse(x, y, rx) { ellipses.push(rx); },
  arc() { arcs++; },
  beginPath() { marks++; },
  measureText() { return { width: 40 }; }
}, { get: (target, key) => (key in target ? target[key] : () => {}) });

const before = ellipses.length;
contactShadow(context, 0, 0, 12, 4, 1);
assert.equal(ellipses.length, before + 2);
assert.equal(depth, 0);

for (const type of ['dragon', 'colossal_dragon', 'behemoth_king', 'colossal_titan']) {
  assert.equal(drawFieldBoss(context, { type, x: 4, hitPulse: 0, isColossal: type !== 'dragon' }, 500), true);
  assert.equal(depth, 0, type);
}
assert.equal(drawFieldBoss(context, { type: 'slime', x: 1 }, 0), false);
assert.equal(drawFieldBoss(context, { type: 'colossal_dragon', x: 2, hitPulse: 1, isColossal: true }, 900), true);

const cls = { isAdvanced: false, name: '重装兵' };
const body = { x: 0, y: 0, hp: 10, maxHp: 10, soldierClass: 'HEAVY', facingAngle: 0, equipped: { weapon: { color: '#d7dee2' } } };
const arcsAtRest = arcs;
drawFieldSoldier(context, { ...body, vx: 0, vy: 0, atkAnim: 0 }, 0, cls, '#829cae');
assert.equal(arcs, arcsAtRest, 'a still blade draws no arc');
assert.equal(depth, 0);
drawFieldSoldier(context, { ...body, vx: 1, vy: 0, atkAnim: 1 }, 200, cls, '#829cae');
assert.equal(arcs, arcsAtRest, 'preparation has no detached slash effect');
drawFieldSoldier(context, { ...body, vx: 1, vy: 0, atkAnim: .57 }, 200, cls, '#829cae');
assert.equal(arcs, arcsAtRest + 1, 'the striking blade draws only one narrow trace');
assert.equal(depth, 0);
drawFieldSoldier(context, { ...body, soldierClass: 'ARCHER', vx: 1, vy: 0, atkAnim: 1 }, 200, cls, '#829cae');
assert.equal(arcs, arcsAtRest + 1, 'bows keep the arc off the string');
drawFieldCommander(context, { x: 0, y: 0, hp: 20, maxHp: 20, level: 3, facingAngle: 0, slashAnim: .57 }, { weapon: { color: '#e6d7a8' } }, 200, 2, '軍曹', true, false);
assert.equal(arcs, arcsAtRest + 2, 'the commander carries the same restrained blade trace');
assert.equal(depth, 0);
const quietSoldier = marks;
drawFieldSoldier(context, { ...body, vx: 0, vy: 0, atkAnim: 0 }, 0, cls, '#829cae');
const soldierPaths = marks - quietSoldier;
drawFieldSoldier(context, { ...body, vx: 0, vy: 0, atkAnim: 0, _levelMark: 2 }, 0, cls, '#829cae');
assert.ok(marks - quietSoldier - soldierPaths > soldierPaths, 'a level-up mark is drawn above the soldier');
const quietCommander = marks;
drawFieldCommander(context, { x: 30, y: 40, hp: 20, maxHp: 20, level: 3, facingAngle: 0, slashAnim: 0 }, { weapon: { color: '#e6d7a8' } }, 0, 2, '軍曹', false, false);
const commanderPaths = marks - quietCommander;
drawFieldCommander(context, { x: 30, y: 40, hp: 20, maxHp: 20, level: 4, _levelMark: 2, facingAngle: 0, slashAnim: 0 }, { weapon: { color: '#e6d7a8' } }, 0, 2, '軍曹', false, false);
assert.ok(marks - quietCommander - commanderPaths > commanderPaths, 'the commander carries the level-up mark');
assert.equal(arcs, arcsAtRest + 2);
assert.equal(depth, 0);

console.log('PASS: boss bodies, planted contact shadow, blade-only slash arc');
