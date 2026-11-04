import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, makeActor } from '../js/sim/world.js';
import { applyCommand } from '../js/sim/commands.js';
import { step } from '../js/sim/step.js';
import { availableActions } from '../js/sim/actions.js';
import { issuePersonContextAction } from '../js/ui/person_context.js';
import { needsTreat } from '../js/sim/abduct.js';

test('context treatment targets the selected downed enemy, even when its squadmate is more injured', () => {
  const state = createWorld(23, { spawn: false });
  const medic = state.actors.find(a => a.id === state.playerId);
  const enemy = makeActor(state, 'bandit', medic.x + 2, medic.z, null, false);
  const other = makeActor(state, 'bandit', medic.x + 3, medic.z, null, false);
  state.actors = [medic, enemy, other]; state.squadIds = [medic.id];
  enemy.state = other.state = 'down'; enemy.downTicks = other.downTicks = 1000;
  enemy.bleed = 0.01; other.bleed = 5;
  enemy.squadId = other.squadId = 'hostiles';
  state.squads.push({ id: 'hostiles', faction: 'bandit', memberIds: [enemy.id, other.id] });
  assert.ok(needsTreat(enemy));
  assert.ok(availableActions(state, [medic.id], enemy).includes('treat'));
  issuePersonContextAction(state, 'treat', enemy, [medic.id], (s, cmd) => applyCommand(s, cmd));
  assert.equal(state.commandQueue.at(-1).targetId, enemy.id);
  state.squads = state.squads.filter(s => s.id !== 'hostiles');
  for (let i = 0; i < 150; i++) step(state);
  assert.equal(enemy.bleed, 0);
  assert.ok(other.bleed > 0);
  assert.equal(enemy.state, 'down');
});
