import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  EXPLORE_WORLD as W,
  createExploreState,
  stepExplore,
  segHitBox,
} from '../js/explore-rules.js';

/* v1.9.0 試作: 遺跡内の地上敵 G06 一体との小さな戦闘。
   降艇直後は静か・安全、少し進むとライトに浮かび、分かりやすい予兆のあとに短い接近攻撃。
   既存の徒歩銃の実際の発射タイミング・銃口・弾道を使い、届いた弾だけ一度ダメージ。
   撃破は消える（alive=false）。再入場で勝手に復活しない（リスタートで戻る）。 */

const F = W.FOE;
const P = W.PLAYER;
const step = (st, input, dt) => stepExplore(st, input, dt, W);

test('降艇直後は静か・安全（初期位置では予兆も被弾もしない）', () => {
  const st = createExploreState();
  assert.equal(st.hp, P.hp);
  assert.equal(st.foe.alive, true);
  for (let i = 0; i < 60; i++) step(st, { move: 0, action: false }, 1 / 60);
  assert.equal(st.foe.state, 'idle', 'メッセージ: まだ気づかない');
  assert.equal(st.hp, P.hp, 'メッセージ: 降艇直後は無傷');
  assert.ok(Math.abs(st.x - W.SPAWN_X) < 1e-9);
});

test('少し進むと予兆（alert）に入り、予兆の間は動かない（撃つ・引く猶予）', () => {
  const st = createExploreState();
  st.x = F.x - F.triggerRange - 20;          // まだ遠い
  step(st, { move: 0 }, 1 / 60);
  assert.equal(st.foe.state, 'idle');

  st.x = F.x - F.triggerRange + 20;          // 予兆範囲に入る
  const x0 = st.foe.x;
  step(st, { move: 0 }, 1 / 60);
  assert.equal(st.foe.state, 'alert', 'メッセージ: 分かりやすい予兆に入る');

  step(st, { move: 0 }, F.alertT * 0.7);     // 予兆中
  assert.equal(st.foe.state, 'alert');
  assert.equal(st.foe.x, x0, 'メッセージ: 予兆中は近づいてこない');
});

test('予兆のあと近づいて短い踏み込みで一度だけ被弾する（無敵中は重複しない）', () => {
  const st = createExploreState();
  st.x = F.x - F.attackRange - 10;
  let hurt = 0, guard = 0;
  while (hurt === 0 && guard++ < 900) {
    const ev = step(st, { move: 0 }, 1 / 60);
    if (ev.hurt) hurt++;
  }
  assert.ok(hurt >= 1, 'メッセージ: 踏み込みで被弾する');
  assert.equal(st.hp, P.hp - F.dmg);
  const hp1 = st.hp;
  for (let i = 0; i < 3; i++) step(st, { move: 0 }, 1 / 60);
  assert.equal(st.hp, hp1, 'メッセージ: 連続フレームで重複被弾しない');
});

test('射撃は向きを尊重：敵と逆向きに撃つと当たらない', () => {
  const st = createExploreState();
  st.x = F.x - 300; st.facing = -1;          // 敵は右にいるのに左を向く
  step(st, { move: 0, shoot: true }, 1 / 60);
  for (let i = 0; i < 30; i++) step(st, { move: 0 }, 1 / 60);
  assert.equal(st.foe.hp, F.hp, 'メッセージ: 逆向きの弾は当たらない');
});

test('射撃は向きを尊重：敵の方を向いて撃てば当たる', () => {
  const st = createExploreState();
  st.x = F.x - 300; st.facing = 1;
  step(st, { move: 0, shoot: true }, 1 / 60);
  for (let i = 0; i < 30; i++) step(st, { move: 0 }, 1 / 60);
  assert.equal(st.foe.hp, F.hp - 1, 'メッセージ: 向きが合えば命中する');
});

test('届く弾だけ一度ダメージ（射程外は当たらない）', () => {
  const near = createExploreState();
  near.x = F.x - 300; near.facing = 1;
  step(near, { move: 0, shoot: true }, 1 / 60);
  for (let i = 0; i < 30; i++) step(near, { move: 0 }, 1 / 60);
  assert.equal(near.foe.hp, F.hp - 1);

  const far = createExploreState();
  far.x = F.x - 480; far.facing = 1;         // 弾の届かない距離
  step(far, { move: 0, shoot: true }, 1 / 60);
  for (let i = 0; i < 30; i++) step(far, { move: 0 }, 1 / 60);
  assert.equal(far.foe.hp, F.hp, 'メッセージ: 届かない弾はダメージを与えない');
});

test('弾は銃口から出て向きへ飛ぶ（既存の銃口・弾道を使う）', () => {
  const st = createExploreState();
  st.facing = 1;
  const ev = step(st, { move: 0, shoot: true }, 1 / 60);
  assert.equal(ev.shoot, true);
  assert.equal(st.shots.length, 1);
  const b = st.shots[0];
  assert.ok(b.x > st.x + 100, 'メッセージ: 銃口は前方');
  assert.ok(Math.abs(b.y - (W.GROUND_Y - W.GUN.muzzleUp)) < 1e-6, 'メッセージ: 銃口の高さは既存と同じ');
  assert.ok(b.vx > 0 && b.vy === 0, 'メッセージ: 向きの水平へ飛ぶ');
});

test('高速の弾でもすり抜けない（線分と箱の掃引判定）', () => {
  const box = { x: 80, y: 0, w: 40, h: 40 };     // x: 80..120
  assert.equal(segHitBox(0, 20, 200, 20, box), true, 'メッセージ: 箱をまたぐ線分は命中');
  assert.equal(segHitBox(200, 20, 0, 20, box), true, 'メッセージ: 逆向きでも命中');
  assert.equal(segHitBox(0, -50, 200, -50, box), false, 'メッセージ: 箱の上は外れ');
  assert.equal(segHitBox(0, 20, 60, 20, box), false, 'メッセージ: 手前で止まる線分は外れ');
  assert.equal(segHitBox(0, 20, 200, 20, box, 5), true, 'メッセージ: 半径ぶん太らせても判定する');
});

test('命中で hp が減り、撃破で敵が消える（alive=false・状態は dead）', () => {
  const st = createExploreState();
  st.x = F.x - 300; st.facing = 1;
  let guard = 0;
  while (st.foe.alive && guard++ < 1200) step(st, { move: 0, shootHold: true }, 1 / 60);
  assert.equal(st.foe.alive, false, 'メッセージ: 撃破で消える');
  assert.ok(st.foe.hp <= 0);
  assert.equal(st.foe.state, 'dead');
  assert.equal(st.hp, P.hp, 'メッセージ: 予兆〜撃破のあいだに被弾していない');
});

test('撃破は一潜航のあいだ保たれ（再入場で復活しない）、リスタートで戻る', () => {
  const st = createExploreState();
  st.foe.hp = 1;
  st.x = F.x - 300; st.facing = 1;
  step(st, { move: 0, shoot: true }, 1 / 60);
  for (let i = 0; i < 40; i++) step(st, { move: 0 }, 1 / 60);
  assert.equal(st.foe.alive, false);

  // 入口を出入りしても同じ state（探索側の再入場は状態を作り直さない）
  for (let i = 0; i < 180; i++) step(st, { move: 0, action: false }, 1 / 60);
  assert.equal(st.foe.alive, false, 'メッセージ: 再入場で勝手に復活しない');

  // リスタート（新しい潜航）では元に戻る
  const st2 = createExploreState();
  assert.equal(st2.foe.alive, true);
  assert.equal(st2.foe.hp, F.hp);
});

test('敗北でソフトロックせず、短い回復経路（撤退）へ入る', () => {
  const st = createExploreState();
  st.hp = F.dmg;                              // あと一撃
  st.x = F.x - F.attackRange - 5;
  let defeat = false, guard = 0;
  while (!defeat && guard++ < 1200) {
    const ev = step(st, { move: 0 }, 1 / 60);
    if (ev.defeat) defeat = true;
  }
  assert.equal(defeat, true, 'メッセージ: 倒れて撤退に入る');
  assert.equal(st.hp, 0);
  assert.equal(st.down, true);
  // 撤退後は入力を受け付けても動かない（ソフトロックしない）
  const x0 = st.x;
  step(st, { move: 1 }, 1 / 60);
  assert.equal(st.x, x0, 'メッセージ: 撤退中は操作を受けない');
  // 回復経路: リスタートで HP 全快
  const st2 = createExploreState();
  assert.equal(st2.hp, P.hp);
  assert.equal(st2.down, false);
});

test('戦闘中でも帰還でき、被弾で帰還がブロックされない', () => {
  const st = createExploreState();
  st.foe.state = 'chase';
  st.x = W.EXIT_X;
  const ev = step(st, { move: 0, action: true }, 0.016);
  assert.equal(ev.return, true, 'メッセージ: いつでも潜水艇へ帰還できる');
});

test('射撃のタイミングとサイトルは既存の徒歩銃のまま（1押下1発・サイクル連射）', () => {
  const st = createExploreState();
  let shots = 0;
  const ev1 = step(st, { move: 0, shoot: true, shootHold: true }, 1 / 60); if (ev1.shoot) shots++;
  const ev2 = step(st, { move: 0, shoot: false, shootHold: false }, 1 / 60); if (ev2.shoot) shots++;
  assert.equal(shots, 1, 'メッセージ: 短いタップは1発');
  // 既存サイクル（FIRE_T）で連射、それより速くは撃たない
  const st2 = createExploreState();
  let n = 0;
  for (let i = 0; i < 60; i++) if (step(st2, { move: 0, shootHold: true }, 1 / 60).shoot) n++;
  assert.ok(n >= 2 && n <= 4, 'メッセージ: ホールドは既存サイクルごと（' + n + '）');
});
