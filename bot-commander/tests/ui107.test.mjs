import test from 'node:test';
import assert from 'node:assert/strict';
import { SPEEDS, normalizeSpeed, advance } from '../js/ui/speed.js?v=2';
import { newSpots } from '../js/ui/spot-report.js?v=1';
import { isRead, markRead, DIALOG_READ_KEY } from '../js/dialog/dialog-read.js?v=1';
import { fireButtonState } from '../js/ui/fire-button.js?v=2';
import { TICK } from '../js/sim/sim.js?v=30';

// 1. speed.js: SPEEDS に 3 があり normalizeSpeed(3)===3、advance が 3x で正しく刻む
test('speed.js: SPEEDS に 3 があり normalizeSpeed(3)===3、advance が 3x で正しく刻む', () => {
  assert.ok(SPEEDS.includes(3), 'SPEEDS contains 3');
  assert.equal(normalizeSpeed(3), 3);

  // 1x で 60 フレーム進めた刻み数
  let acc1 = 0, steps1 = 0;
  for (let f = 0; f < 60; f++) {
    const r = advance(acc1, 1 / 60, 1, TICK);
    acc1 = r.acc;
    steps1 += r.steps;
  }

  // 3x で 60 フレーム進めた刻み数
  let acc3 = 0, steps3 = 0;
  for (let f = 0; f < 60; f++) {
    const r = advance(acc3, 1 / 60, 3, TICK);
    acc3 = r.acc;
    steps3 += r.steps;
  }

  assert.ok(Math.abs(steps3 - steps1 * 3) <= 1, `steps3 (${steps3}) is approx 3x steps1 (${steps1})`);
});

// 2. 発見の判定: newSpots(sim, seenSet)
test('spot-report.js: newSpots が新しく見つけた群れと報告するユニットを返す、同じ群れは2回目に返さない、見えていない敵は返さない', () => {
  const visibleTiles = new Set(['1,1', '2,2']);
  const sim = {
    fog: {
      isVisible: (tx, ty) => visibleTiles.has(`${tx},${ty}`),
    },
    units: [
      { id: 1, side: 'ally', hp: 100, x: 32, y: 32 }, // tile 1,1
      { id: 2, side: 'ally', hp: 100, x: 200, y: 200 }, // tile 6,6
      { id: 10, side: 'enemy', hp: 50, x: 32, y: 32, groupId: 'g1' }, // tile 1,1 (visible)
      { id: 11, side: 'enemy', hp: 50, x: 32, y: 32, groupId: 'g1' }, // tile 1,1 (visible, same group)
      { id: 12, side: 'enemy', hp: 50, x: 64, y: 64, groupId: 'g2' }, // tile 2,2 (visible, group 2)
      { id: 13, side: 'enemy', hp: 50, x: 320, y: 320, groupId: 'g3' }, // tile 10,10 (fog hidden)
      { id: 14, side: 'enemy', hp: 0, x: 32, y: 32, groupId: 'g4' }, // dead enemy (should not spot)
    ],
  };

  const seen = new Set();
  const spots = newSpots(sim, seen);

  // g1 と g2 だけが新しく見つかるはず（g3 は見えない、g4 は死亡）
  assert.equal(spots.length, 2);
  assert.equal(spots[0].groupId, 'g1');
  assert.equal(spots[0].spotter.id, 1); // 味方1のほうが敵に近い
  assert.equal(spots[1].groupId, 'g2');

  // seenSet に入っているので、2回目は何も返さないこと
  const spots2 = newSpots(sim, seen);
  assert.equal(spots2.length, 0);

  // 見えていない敵（g3）のタイルが見えるようになったら返ること
  visibleTiles.add('10,10');
  const spots3 = newSpots(sim, seen);
  assert.equal(spots3.length, 1);
  assert.equal(spots3[0].groupId, 'g3');
});

// 3. 既読判定: markRead → isRead が true、別の id は false、壊れた JSON でも落ちない
test('dialog-read.js: markRead → isRead が true、別の id は false、壊れた JSON でも落ちない', () => {
  const store = {};

  assert.equal(isRead('intro_1', store), false);
  assert.equal(markRead('intro_1', store), true);
  assert.equal(isRead('intro_1', store), true);
  assert.equal(isRead('intro_2', store), false);

  // 壊れた JSON でも落ちずに false を返し、その後の markRead で回復すること
  store[DIALOG_READ_KEY] = '{invalid: json...';
  assert.equal(isRead('intro_1', store), false);
  assert.equal(markRead('intro_3', store), true);
  assert.equal(isRead('intro_3', store), true);
});

// 4. 発射ボタンの出す条件: fireButtonState(sim, selectedIds)
test('fire-button.js: 発射台なし→出さない、引いている時→出す、構え中→出さない、物語準備完了ネジ選択→出す', () => {
  // 発射台なし
  const emptySim = { units: [{ id: 1, side: 'ally', hp: 100 }] };
  assert.deepEqual(fireButtonState(emptySim, [1]), { visible: false, kind: null });
  assert.deepEqual(fireButtonState(null, []), { visible: false, kind: null });

  // ?launcher=1
  const launcherSim = {
    launcher: { builds: [], shots: [] },
    units: [
      { id: 1, side: 'ally', hp: 100, tow: 10 },
      { id: 2, side: 'ally', hp: 100, tow: null },
      { id: 10, side: 'ally', object: true, hp: 150, launch: { phase: null } },
    ],
  };

  // 発射台を引いていないユニットを選んでいる場合
  assert.equal(fireButtonState(launcherSim, [2]).visible, false);

  // 発射台を引いているユニットを選んでいる場合
  const resLaunch = fireButtonState(launcherSim, [1]);
  assert.equal(resLaunch.visible, true);
  assert.equal(resLaunch.kind, 'launcher');

  // 発射台が構え中（aim phase）のときは出さない
  launcherSim.units[2].launch.phase = 'aim';
  assert.equal(fireButtonState(launcherSim, [1]).visible, false);

  // 物語ミッション1（sim.strike）
  const storySim = {
    strike: { phase: 'ready', nejiId: 5, launcherId: 20 },
    units: [
      { id: 5, side: 'ally', hp: 200, kind: 'scav', label: 'ネジ' },
      { id: 6, side: 'ally', hp: 50, kind: 'boy', label: '少年' },
      { id: 20, side: 'ally', object: true, hp: 150 },
    ],
  };

  // ネジを選んでいない場合
  assert.equal(fireButtonState(storySim, [6]).visible, false);

  // ネジを選んでいる場合
  const resStory = fireButtonState(storySim, [5]);
  assert.equal(resStory.visible, true);
  assert.equal(resStory.kind, 'story');

  // strike phase が ready でない場合（例: buried や arming）
  storySim.strike.phase = 'buried';
  assert.equal(fireButtonState(storySim, [5]).visible, false);
});
