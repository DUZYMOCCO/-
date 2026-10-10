import assert from 'node:assert/strict';
import { blockingGuides, fieldBlocks, HOME_SANCTUARY_RADIUS, WORLD_SIZE } from '../js/games/iron-squad/world.js';

const center = WORLD_SIZE / 2;
const lines = blockingGuides();
assert.ok(lines.length >= 5, 'each cliff run is available to the field map');
let blocked = 0, inside = 0, open = 0;
for (const line of lines) {
  assert.ok(line.length > 1);
  for (const [x, y] of line) {
    if (Math.hypot(x - center, y - center) <= HOME_SANCTUARY_RADIUS) inside++;
    else if (fieldBlocks(x, y)) blocked++;
    else open++;
  }
}
assert.equal(inside, 0, 'cliff guides stay outside the home sanctuary');
assert.ok(blocked > 40, 'the guides follow ground that stops walking');
assert.ok(open > 0, 'roads and landmark openings break the cliff lines');
console.log(`PASS: blocking guides lines=${lines.length} blocked=${blocked} openings=${open}`);
