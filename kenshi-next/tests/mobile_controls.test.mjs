import test from 'node:test';
import assert from 'node:assert/strict';
import { createSelection } from '../js/ui/selection.js';
import { nearbyLootTarget } from '../js/ui/quick_nearby.js';

test('touch attack requires a selected squad and a standing hostile', () => {
  const state = { playerId: 1, squadIds: [1], actors: [
    { id: 1, faction: 'player', state: 'idle', x: 0, z: 0 },
    { id: 2, faction: 'bandit', state: 'idle', x: 1, z: 0 },
    { id: 3, faction: 'guard', state: 'idle', x: 2, z: 0 },
    { id: 4, faction: 'bandit', state: 'down', x: 3, z: 0 },
  ] };
  assert.equal(createSelection([1]).onTapActor(state, 2, { quickAttack: true }).action, 'attack');
  assert.equal(createSelection().onTapActor(state, 2, { quickAttack: true }).action, 'select');
  assert.equal(createSelection([1]).onTapActor(state, 2).action, 'select');
  assert.equal(createSelection([1]).onTapActor(state, 3, { quickAttack: true }).action, 'select');
  assert.equal(createSelection([1]).onTapActor(state, 4, { quickAttack: true }).action, 'select');
});

test('nearby loot chooses a reachable kind and ignores locked and distant targets', () => {
  const actor = { id: 1, faction: 'player', state: 'idle', x: 0, z: 0 };
  const body = { id: 2, faction: 'bandit', state: 'dead', x: 5, z: 0 };
  const state = { actors: [actor, body], town: { boxes: [{ id: 'locked', x: 1, z: 0, locked: true }, { id: 'open', x: 3, z: 0 }] }, groundItems: [] };
  assert.equal(nearbyLootTarget(state, actor).item.id, 'open');
  state.town.boxes[1].locked = true;
  assert.equal(nearbyLootTarget(state, actor).item.id, 2);
  body.x = 11;
  assert.equal(nearbyLootTarget(state, actor), null);
  actor.state = 'down'; body.x = 1;
  assert.equal(nearbyLootTarget(state, actor), null);
});
