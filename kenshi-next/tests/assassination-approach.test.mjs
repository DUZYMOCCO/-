import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, makeActor } from '../js/sim/world.js';
import { moveActors } from '../js/sim/ai.js';
import { updateAssassination } from '../js/sim/stealth.js';
import { applyCommand, applyQueuedCommands } from '../js/sim/commands.js';

for (const [name, x, z] of [['front', 0, 3], ['left', -3, 0], ['right', 3, 0], ['behind', 0, -3]]) {
test(`assassin approaches from the ${name} and resolves the attempt`, () => {
  const state = createWorld(1);
  state.actors = [];
  state.squads = [];
  state.town = null;
  state.rocks = [];
  state.props = [];
  state.buildings = [];
  const actor = makeActor(state, 'player', 0, 3, null, true);
  const target = makeActor(state, 'guard', 0, 0, null, false);
  actor.x = 500 + x; actor.z = 500 + z;
  target.x = 500; target.z = 500; target.rot = 0;
  actor.sneaking = true;
  state.playerId = actor.id;
  state.squadIds = [actor.id];
  applyCommand(state, { type: 'assassinate', targetId: target.id });
  applyQueuedCommands(state, []);
  assert.equal(actor.assassinTargetId, target.id);
  const events = [];
  for (let i = 0; i < 200 && actor.assassinTargetId != null; i++) {
    moveActors(state);
    updateAssassination(state, events);
    state.tick++;
  }
  assert.ok(events.some(event => event.type === 'assassinate'), 'assassination never resolved');
});
}
