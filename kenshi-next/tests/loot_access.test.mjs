import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, makeActor } from '../js/sim/world.js';
import { applyCommand } from '../js/sim/commands.js';
import { transferLootItem, takeAllLoot } from '../js/sim/loot.js';
import { CARRY_RANGE } from '../js/sim/data.js';

function fixture() {
  const state = createWorld(42, { spawn: false });
  const actor = state.actors.find(a => a.id === state.playerId);
  const body = makeActor(state, 'bandit', actor.x + CARRY_RANGE + .3, actor.z, null, false);
  state.actors = [actor, body]; state.squadIds = [actor.id];
  body.state = 'down'; body.carriedBy = null;
  body.equip.weapon[0] = { id: 'machete', rank: 1, n: 1 };
  actor.inv = [];
  actor.skills.strength = 150;
  return { state, actor, body, source: { kind: 'equip', slot: 'weapon', index: 0 } };
}

test('out of range reports distance rather than capacity and leaves the item intact', () => {
  const { state, actor, body, source } = fixture();
  const result = applyCommand(state, { type: 'lootTransfer', actorId: actor.id, targetId: body.id, source, withReason: true });
  assert.deepEqual(result, { ok: false, reason: '遠すぎて取れない' });
  assert.equal(body.equip.weapon[0].id, 'machete');
  assert.equal(takeAllLoot(state, actor.id, body.id).reason, '対象に近づいてください');
});

test('in-range equipment transfers into available inventory and legacy command still returns boolean', () => {
  const { state, actor, body, source } = fixture();
  body.x = actor.x + 1;
  assert.equal(applyCommand(state, { type: 'lootTransfer', actorId: actor.id, targetId: body.id, source }), true);
  assert.equal(body.equip.weapon[0], null);
  assert.ok(actor.inv.some(item => item.id === 'machete'));
});

// main 側で「重すぎる」の事前チェックが外れた（1b8c5914 売値/買値と持ち物更新の修正）。
// いまは重さが移動を止めず、入る場所があるかどうかだけで決まる。その現在の振る舞いを固定する。
test('overweight loot is allowed: weight no longer blocks a transfer', () => {
  const { state, actor, body, source } = fixture();
  body.x = actor.x + 1;
  actor.skills.strength = 0;
  actor.inv = [{ id: 'iron_plate', rank: 1, n: 100000 }];
  const result = transferLootItem(state, actor.id, body.id, source);
  assert.equal(result.ok, true);
  assert.equal(body.equip.weapon[0], null);
});
