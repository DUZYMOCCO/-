import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  EXPLORE_WORLD as W,
  createExploreState,
  stepExplore,
  nearestInteractable,
  walkFrameOf,
  animView,
  firePhase,
} from '../js/explore-rules.js';

const step = (st, input, dt) => stepExplore(st, input, dt);

test('入力が無ければ動かない（待機）', () => {
  const st = createExploreState();
  const x0 = st.x;
  step(st, { move: 0, action: false, shoot: false }, 0.5);
  assert.equal(st.x, x0);
  assert.equal(st.moving, false);
  assert.equal(st.anim, 'idle');
  assert.deepEqual(animView(st), { kind: 'idle', frame: 0 });
});

test('前進・後退して向きが変わる', () => {
  const st = createExploreState();
  step(st, { move: 1, action: false }, 0.2);
  assert.ok(st.x > W.SPAWN_X, 'メッセージ: 右で前進するはず');
  assert.equal(st.facing, 1);
  const x1 = st.x;
  step(st, { move: -1, action: false }, 0.2);
  assert.ok(st.x < x1, 'メッセージ: 左で後退するはず');
  assert.equal(st.facing, -1);
});

test('歩行アニメは 8 コマを順に回り、止まると待機へ戻る', () => {
  const st = createExploreState();
  // 開始モーションを抜けてから、位相を少しずつ進める
  step(st, { move: 1, action: false, shoot: false }, W.START_T + 0.001);
  assert.equal(st.anim, 'walk');
  const seen = new Set();
  for (let i = 0; i < 16; i++){
    // 1 コマぶん（周期時間 / 8）ずつ歩く
    step(st, { move: 1 }, W.WALK_CYCLE_T / W.WALK_FRAMES);
    seen.add(animView(st).frame);
  }
  assert.equal(seen.size, W.WALK_FRAMES, 'メッセージ: 8 コマすべてが出るはず');
  step(st, { move: 0 }, 0.016);          // まず停止モーションへ
  assert.equal(st.anim, 'stop');
  step(st, { move: 0 }, W.STOP_T + 0.01);
  assert.equal(st.anim, 'idle');
});

test('コマ送りは時間ベース（満速と半倒しで同じ時間なら同じ歩行位相、移動距離は異なる）', () => {
  // 歩調は時間だけで決まり、移動速度・距離・スティック量は位相に効かない
  const full = createExploreState();
  const half = createExploreState();
  const T = 0.37;
  step(full, { move: 1 }, T);
  step(half, { move: 0.5 }, T);
  assert.ok(Math.abs(full.walkPhase - half.walkPhase) < 1e-9,
    'メッセージ: 同じ時間なら同じ歩行位相（' + full.walkPhase + ' vs ' + half.walkPhase + '）');
  const dFull = full.x - W.SPAWN_X;
  const dHalf = half.x - W.SPAWN_X;
  assert.ok(dHalf > 0, 'メッセージ: 半倒しでも前へ進む');
  assert.ok(dHalf < dFull,
    'メッセージ: 移動距離は倒し込みで変わる（満速 ' + dFull + ' / 半 ' + dHalf + '）');
});

test('ちょうど 1 周期ぶん歩くと位相が先頭に戻る', () => {
  const st = createExploreState();
  step(st, { move: 1 }, W.WALK_CYCLE_T);
  assert.ok(Math.abs(st.walkPhase) < 1e-9 || Math.abs(st.walkPhase - 1) < 1e-9,
    'メッセージ: 1 周期で位相 0 に戻る（' + st.walkPhase + '）');
});

test('壁に当たって動けないときは足踏みしない（待機のまま）', () => {
  const st = createExploreState();
  st.x = W.MAX_X;                                   // 右端に立っている
  step(st, { move: 1 }, W.START_T + 0.001);
  assert.equal(st.moving, false, 'メッセージ: 右端で右を押しても動かない');
  assert.equal(st.anim, 'idle', 'メッセージ: 足踏みせず待機のまま');
  const p0 = st.walkPhase;
  step(st, { move: 1 }, 0.5);
  assert.equal(st.walkPhase, p0, 'メッセージ: 位相は進まない（足踏みしない）');
});

test('歩き出し→歩行→停止 の状態が切り替わる', () => {
  const st = createExploreState();
  step(st, { move: 1 }, 0.02);
  assert.equal(st.anim, 'start');
  assert.equal(animView(st).kind, 'start');
  step(st, { move: 1 }, W.START_T + 0.01);
  assert.equal(st.anim, 'walk');
  step(st, { move: 0 }, 0.01);
  assert.equal(st.anim, 'stop');
  step(st, { move: 0 }, W.STOP_T + 0.01);
  assert.equal(st.anim, 'idle');
});

test('左右の端でクランプされる', () => {
  const st = createExploreState();
  for (let i = 0; i < 400; i++) step(st, { move: -1, action: false }, 0.1);
  assert.equal(st.x, W.MIN_X);
  for (let i = 0; i < 400; i++) step(st, { move: 1, action: false }, 0.1);
  assert.equal(st.x, W.MAX_X);
});

test('遺物は一度だけ調査でき、二度目は調査済みになる', () => {
  const st = createExploreState();
  st.x = W.RELICS[0].x;
  const ev1 = step(st, { move: 0, action: true }, 0.016);
  assert.equal(ev1.survey, 0);
  assert.equal(st.relicDone[0], true);
  assert.equal(st.surveyedCount, 1);

  step(st, { move: 0, action: false }, 0.5);
  const ev2 = step(st, { move: 0, action: true }, 0.016);
  assert.equal(ev2.survey, null, 'メッセージ: 二度目の調査報酬は出てはいけない');
  assert.equal(ev2.blocked, 'relic');
  assert.equal(st.surveyedCount, 1);
});

test('調査は非ループの姿勢変化で、終わると待機へ戻る', () => {
  const st = createExploreState();
  st.x = W.RELICS[0].x;
  step(st, { move: 0, action: true }, 0.016);
  assert.equal(st.anim, 'survey');
  assert.equal(animView(st).kind, 'survey');
  const mid = animView(st).frame;
  step(st, { move: 0, action: false }, W.SURVEY_T * 0.5);
  assert.equal(st.anim, 'survey');
  assert.ok(animView(st).frame >= mid, 'メッセージ: 調査コマは進む');
  step(st, { move: 0, action: false }, W.SURVEY_T);
  assert.equal(st.anim, 'idle', 'メッセージ: 調査は繰り返さず待機へ戻る');
});

test('調査中でも移動すると姿勢変化はキャンセルされる', () => {
  const st = createExploreState();
  st.x = W.RELICS[0].x;
  step(st, { move: 0, action: true }, 0.016);
  assert.equal(st.anim, 'survey');
  step(st, { move: 1, action: false }, 0.016);
  assert.notEqual(st.anim, 'survey');
});

test('入口の近くでのみ帰還でき、遠いと帰還しない', () => {
  const st = createExploreState();
  st.x = W.SPAWN_X;
  assert.equal(nearestInteractable(st), null);
  const ev0 = step(st, { move: 0, action: true }, 0.016);
  assert.equal(ev0.return, false);

  st.x = W.EXIT_X;
  assert.equal(nearestInteractable(st).kind, 'exit');
  const ev1 = step(st, { move: 0, action: true }, 0.016);
  assert.equal(ev1.return, true);
});

test('入口と遺物が同じ位置なら入口を優先する', () => {
  const world = { ...W, EXIT_X: 250, RELICS: [{ x: 250 }, { x: 2010 }] };
  const st = createExploreState();
  st.x = 250;
  assert.equal(nearestInteractable(st, world).kind, 'exit');
});

test('射程外の遺物には反応しない', () => {
  const st = createExploreState();
  st.x = W.RELICS[0].x - W.INTERACT_RANGE - 1;
  assert.equal(nearestInteractable(st), null);
  st.x = W.RELICS[0].x;
  assert.equal(nearestInteractable(st).kind, 'relic');
});

test('アナログ入力（スティック）でも速さが変わる', () => {
  const st = createExploreState();
  step(st, { move: 1, action: false }, 0.2);
  const fast = st.x - W.SPAWN_X;
  const st2 = createExploreState();
  step(st2, { move: 0.5, action: false }, 0.2);
  const slow = st2.x - W.SPAWN_X;
  assert.ok(slow > 0, 'メッセージ: 半倒しでも前へは進む');
  assert.ok(slow < fast, 'メッセージ: 倒し込みが浅いと遅い');
});

/* --- v1.8.0 射撃 --- */

test('射撃は 1 押下 1 発。発射アニメ中は次の 1 発を受けない', () => {
  const st = createExploreState();
  const ev1 = step(st, { move: 0, shoot: true }, 0.016);
  assert.equal(ev1.shoot, true);
  assert.equal(firePhase(st), 'aim');
  const ev2 = step(st, { move: 0, shoot: true }, 0.016);
  assert.equal(ev2.shoot, false, 'メッセージ: 連射してはいけない');
  // 発射アニメが終わると、また 1 発撃てる
  step(st, { move: 0, shoot: false }, W.FIRE_T + 0.02);
  assert.equal(firePhase(st), null);
  const ev3 = step(st, { move: 0, shoot: true }, 0.016);
  assert.equal(ev3.shoot, true);
});

test('射撃は移動と同時に入力できる', () => {
  const st = createExploreState();
  const ev = step(st, { move: 1, shoot: true }, 0.016);
  assert.equal(ev.shoot, true);
  assert.equal(ev.moved, true);
  assert.equal(st.moving, true);
});

test('射撃アニメは 構え→発射→反動 の順に進む', () => {
  const st = createExploreState();
  step(st, { move: 0, shoot: true }, 0.001);
  assert.equal(firePhase(st), 'aim');
  step(st, { move: 0, shoot: false }, W.FIRE_AIM_T + 0.01);
  assert.equal(firePhase(st), 'fire');
  step(st, { move: 0, shoot: false }, 0.12);
  assert.equal(firePhase(st), 'recoil');
  step(st, { move: 0, shoot: false }, W.FIRE_RECOIL_T + 0.05);
  assert.equal(firePhase(st), null);
});

test('射撃しても遺物の調査報酬は増えない（別系統）', () => {
  const st = createExploreState();
  st.x = W.RELICS[0].x;
  step(st, { move: 0, shoot: true }, 0.016);
  assert.equal(st.surveyedCount, 0);
  assert.equal(st.relicDone[0], false);
});

test('歩行コマ関数: 位相→コマ番号の対応', () => {
  assert.equal(walkFrameOf(0), 0);
  assert.equal(walkFrameOf(0.99), 7);
  assert.equal(walkFrameOf(1), 0);
  assert.equal(walkFrameOf(0.5), 4);
});
