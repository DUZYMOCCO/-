// 筋肉探偵の試合基盤: 直接操作、自動移動しないこと、技カテゴリの3すくみ。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, applyDamage } from '../js/sim/index.js';
import { resolveCombat } from '../js/sim/combat.js';
import { categoryBeats, moveCategory } from '../js/sim/martial.js';
import { setMuscleInput, queueMuscleAction } from '../js/sim/muscle.js';

function match() {
  const state = createWorld(7, { spawn: false, town: false, match: true });
  const tank = state.actors.find((a) => a.id === state.muscle.playerId);
  const bobby = state.actors.find((a) => a.id === state.muscle.enemyId);
  return { state, tank, bobby };
}

test('筋肉探偵の3すくみ分類と循環相性を扱う', () => {
  assert.equal(moveCategory({ id: 'palm', clips: ['Cross Punch'] }), 'strike');
  assert.equal(moveCategory({ id: 'pile_driver', clips: ['Pile Driver A'], throw: true, pair: true }), 'grapple');
  assert.equal(moveCategory({ id: 'armbar', clips: ['Armbar A'], throw: true, pair: true }), 'submission');
  assert.equal(moveCategory({ id: 'kimura', clips: ['Kimura B'], throw: true, pair: true }), 'submission');

  assert.equal(categoryBeats('submission', 'strike'), true);
  assert.equal(categoryBeats('strike', 'grapple'), true);
  assert.equal(categoryBeats('grapple', 'submission'), true);
  assert.equal(categoryBeats('strike', 'submission'), false);
  assert.equal(categoryBeats('grapple', 'strike'), false);
  assert.equal(categoryBeats('submission', 'grapple'), false);
});

test('タンクは入力が無い間は自動で移動しない', () => {
  const { state, tank } = match();
  const x = tank.x;
  const z = tank.z;
  for (let i = 0; i < 20; i += 1) step(state);
  assert.equal(Math.hypot(tank.x - x, tank.z - z) < 0.01, true);
  assert.equal(tank.targetId, null);
  assert.equal(tank.moveTo, null);
});

test('方向入力でタンクが直接動く', () => {
  const { state, tank } = match();
  const x = tank.x;
  const z = tank.z;
  setMuscleInput(state, { x: 1, z: 0, run: false });
  step(state);
  assert.equal(tank.x > x, true);
  assert.equal(Math.abs(tank.z - z) < 0.1, true);
  assert.equal(tank.state, 'move');

  setMuscleInput(state, { x: 0, z: 0, run: false });
  step(state);
  assert.equal(tank.moveTo, null);
  assert.equal(tank.state, 'idle');
});

test('技の押し込みは範囲内でのみ受け付け、範囲外では出ない', () => {
  const { state, tank } = match();
  assert.equal(queueMuscleAction(state, 'grapple'), true);
  step(state);
  assert.equal(state.muscle.lastAction.accepted, false);
  assert.equal(state.muscle.lastAction.reason, 'range');
  assert.equal(Boolean(tank.swing || tank.martialPair), false);
});

test('組技ボタンは範囲内でパイルドライバーを出す', () => {
  const { state, tank, bobby } = match();
  tank.x = bobby.x - 1.3;
  tank.z = bobby.z;
  tank.x = Math.round(tank.x * 100) / 100;
  tank.z = Math.round(tank.z * 100) / 100;
  tank.attackCd = 0;
  assert.equal(queueMuscleAction(state, 'grapple'), true);
  let started = false;
  for (let i = 0; i < 30 && !started; i += 1) {
    step(state);
    started = Boolean(tank.swing || tank.martialPair);
  }
  assert.equal(state.muscle.lastAction.accepted, true);
  assert.equal(state.muscle.lastAction.moveId, 'pile_driver');
  assert.equal(Boolean(tank.swing || tank.martialPair), true);
});

test('打撃は関節技のモーションに対して自動ブロックされる', () => {
  const { state, tank, bobby } = match();
  tank.x = 0;
  tank.z = 0;
  bobby.x = 1;
  bobby.z = 0;
  tank.swing = {
    targetId: bobby.id,
    startTick: state.tick,
    impactTick: state.tick,
    ma: { id: 'palm', clip: 'Cross Punch', powers: [100], range: 1.6, hitTicks: [state.tick], pair: false, throw: false },
  };
  bobby.swing = {
    targetId: tank.id,
    startTick: state.tick,
    impactTick: state.tick + 10,
    ma: { id: 'armbar', clip: 'Armbar A', powers: [120], range: 1.4, hitTicks: [state.tick + 12], pair: true, throw: true },
  };
  const before = JSON.stringify(bobby.parts);
  const beforeBlocks = state.meleeStats?.blocks || 0;

  resolveCombat(state, []);

  assert.equal(JSON.stringify(bobby.parts), before);
  assert.equal((state.meleeStats?.blocks || 0) > beforeBlocks, true);
  assert.equal(bobby.blockUntil > state.tick, true);
});

test('関節技のペアは終了し、受け手は拘束され続けない', () => {
  const { state, tank, bobby } = match();
  tank.x = bobby.x - 1.3;
  tank.z = bobby.z;
  tank.x = Math.round(tank.x * 100) / 100;
  tank.z = Math.round(tank.z * 100) / 100;
  tank.attackCd = 0;
  assert.equal(queueMuscleAction(state, 'submission'), true);
  for (let i = 0; i < 100; i += 1) step(state);
  assert.equal(tank.martialPair, null);
  assert.equal(bobby.martialPair, null);
  // 受け手は倒れたままではなく、回復して立つまで進む。
  assert.equal(bobby.state !== 'down' || bobby.knocked === true, true);
});

test('筋肉探偵の試合では体力が減らない', () => {
  const { state, tank, bobby } = match();
  assert.equal(tank.muscleInfinite, true);
  assert.equal(bobby.muscleInfinite, true);
  const beforeTank = JSON.stringify(tank.parts);
  const beforeBobby = JSON.stringify(bobby.parts);
  applyDamage(state, tank, 'head', 500, [], 1, 200);
  applyDamage(state, bobby, 'rArm', 500, [], 1, 200);
  assert.equal(JSON.stringify(tank.parts), beforeTank);
  assert.equal(JSON.stringify(bobby.parts), beforeBobby);
  assert.equal(tank.blood, 100);
  assert.equal(bobby.blood, 100);
  for (let i = 0; i < 20; i += 1) step(state);
  assert.equal(tank.blood, 100);
  assert.equal(bobby.blood, 100);
  assert.equal(tank.state, 'idle');
  assert.equal(bobby.state !== 'dead' && bobby.state !== 'down' && bobby.state !== 'getup', true);
});
