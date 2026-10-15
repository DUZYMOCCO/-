import assert from 'node:assert/strict';
import * as world from '../js/world.js';
import { NAVIGATION_RULES } from '../js/navigation-map.js?v=277';

// Cliff walls and their minimap guide lines no longer exist.
assert.equal(world.blockingGuides, undefined, 'the cliff guide lines are removed from the field map');
assert.equal(world.isNearRiverCrossing, undefined, 'river-crossing cliff gaps are removed');
assert.equal(world.fieldBlocks(world.WORLD_SIZE / 2 + 2500, world.WORLD_SIZE / 2 + 5024), false, 'former cliff line is open');
assert.equal(NAVIGATION_RULES.fieldSpan, 12000);
assert.ok(NAVIGATION_RULES.terrainAlpha <= 0.2);
console.log(`PASS: no cliff guides on the field map span=${NAVIGATION_RULES.fieldSpan}`);
