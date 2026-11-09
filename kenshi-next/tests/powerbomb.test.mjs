// パワーボム（clutch_fold_v1）の発動と終了
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step } from '../js/sim/index.js';
import { queueMuscleAction } from '../js/sim/muscle.js';

test('パワーボムは直接操作で発動し、ペアが終わると両者とも空く', () => {
  const state = createWorld(7, { spawn: false, town: false, match: true });
  const tank = state.actors.find((a) => a.id === state.muscle.playerId);
  const bobby = state.actors.find((a) => a.id === state.muscle.enemyId);
  tank.x = bobby.x - 1.3;
  tank.z = bobby.z;
  tank.x = Math.round(tank.x * 100) / 100;
  tank.z = Math.round(tank.z * 100) / 100;
  tank.attackCd = 0;
  assert.equal(queueMuscleAction(state, 'powerbomb'), true);
  let started = false;
  for (let i = 0; i < 30 && !started; i += 1) {
    step(state);
    started = Boolean(tank.swing || tank.martialPair);
  }
  assert.equal(state.muscle.lastAction.accepted, true);
  assert.equal(state.muscle.lastAction.moveId, 'powerbomb');
  assert.equal(started, true);
  assert.equal(tank.martialPair?.clip || tank.swing?.ma?.clip, 'Powerbomb_A');
  for (let i = 0; i < 80 && tank.martialPair; i += 1) step(state);
  assert.equal(tank.martialPair, null);
  assert.equal(bobby.martialPair, null);
});
