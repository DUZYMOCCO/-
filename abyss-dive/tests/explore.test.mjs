import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  EXPLORE_WORLD as W,
  createExploreState,
  stepExplore,
  nearestInteractable,
} from '../js/explore-rules.js';

const step = (st, input, dt) => stepExplore(st, input, dt);

test('入力が無ければ動かない（待機）', () => {
  const st = createExploreState();
  const x0 = st.x;
  step(st, { move: 0, action: false }, 0.5);
  assert.equal(st.x, x0);
  assert.equal(st.moving, false);
  assert.equal(st.frame, 0);
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

test('歩行アニメは 1 と 2 を交互に行き来し、止まると 0 に戻る', () => {
  const st = createExploreState();
  step(st, { move: 1, action: false }, W.WALK_FRAME + 0.001);
  assert.equal(st.frame, 1);
  step(st, { move: 1, action: false }, W.WALK_FRAME + 0.001);
  assert.equal(st.frame, 2);
  step(st, { move: 0, action: false }, 0.1);
  assert.equal(st.frame, 0);
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

  // インタラクト CD を空けてからもう一度
  step(st, { move: 0, action: false }, 0.5);
  const ev2 = step(st, { move: 0, action: true }, 0.016);
  assert.equal(ev2.survey, null, 'メッセージ: 二度目の調査報酬は出てはいけない');
  assert.equal(ev2.blocked, 'relic');
  assert.equal(st.surveyedCount, 1);
});

test('入口の近くでのみ帰還でき、遠いと帰還しない', () => {
  const st = createExploreState();
  st.x = W.SPAWN_X;                       // 入口から離れた立ち位置
  assert.equal(nearestInteractable(st), null);
  const ev0 = step(st, { move: 0, action: true }, 0.016);
  assert.equal(ev0.return, false);

  st.x = W.EXIT_X;                        // 入口の近く
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
  st.x = W.RELICS[0].x;                          // 射程内
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
