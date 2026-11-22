import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  EXPLORE_WORLD as W,
  createExploreState,
  stepExplore,
  segHitBox,
  aimAngle,
  aimVector,
  foeEngaged,
  foeDeathView,
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

/* ============================================================
   v1.10.1: 銃を下へ向ける（地面の G06 の胴/甲殻の高さへ）／自然な撃破演出
   ============================================================ */
const A = W.AIM, G = W.GUN;
const muBase = W.GROUND_Y - G.muzzleUp;      // 従来の水平銃口の高さ（412.34）
const targetY = W.GROUND_Y - A.targetUp;     // 狙う胴/甲殻の高さ（486）

test('交戦可能の判定：休眠・引き返し・撃破済みは狙わない', () => {
  const st = createExploreState();
  for (const s of ['idle', 'return', 'dead']){ st.foe.state = s; assert.equal(foeEngaged(st.foe), false, s); }
  for (const s of ['alert', 'chase', 'wind', 'lunge', 'recover']){ st.foe.state = s; assert.equal(foeEngaged(st.foe), true, s); }
  st.foe.state = 'chase'; st.foe.alive = false;
  assert.equal(foeEngaged(st.foe), false, 'メッセージ: 撃破済みは交戦可能でない');
});

test('前方の活動中の G06 へ銃口が下がり、敵の見える形の高さで当たる', () => {
  const st = createExploreState();
  st.x = W.FOE.x - 300; st.facing = 1; st.foe.state = 'chase';
  const av = aimVector(st);
  assert.ok(av.theta > 0 && av.theta <= A.maxAngle, 'メッセージ: 下向き θ が上限内（' + av.theta + '）');
  assert.ok(av.y > muBase + 10, 'メッセージ: 銃口が従来より下がる（+' + (av.y - muBase).toFixed(1) + 'px）');
  assert.ok(av.dx > 0 && av.dy > 0, 'メッセージ: 前方かつ下向き');
  // 銃（支点からの狙い線）は敵の胴/甲殻の高さ targetUp を指す
  const px = st.x + A.pivotDx * st.facing, py = W.GROUND_Y - A.pivotUp;
  const tPivot = (W.FOE.x - px) / (st.facing * Math.cos(av.theta));
  const yPivot = py + tPivot * Math.sin(av.theta);
  assert.ok(Math.abs(yPivot - targetY) < 3, 'メッセージ: 胴の高さへ向いている（' + yPivot.toFixed(1) + ' vs ' + targetY + '）');
  // 実弾は見える銃口から出て、敵の見える形（活動絵の高さ 407〜564）の中で当たる
  const sB = (W.FOE.x - av.x) / av.dx;
  const yAtFoe = av.y + sB * av.dy;
  assert.ok(yAtFoe > 407 && yAtFoe < 564, 'メッセージ: 敵の見える形の高さの中で当たる（' + yAtFoe.toFixed(1) + '）');
});

test('実弾は見える銃口と同じ計算（aimVector）から出る', () => {
  const st = createExploreState();
  st.x = W.FOE.x - 300; st.facing = 1; st.foe.state = 'chase';
  const av = aimVector(st);                 // 発射される時点の銃口・狙い
  step(st, { move: 0, shoot: true }, 1 / 60);
  assert.equal(st.shots.length, 1);
  const b = st.shots[0];
  assert.ok(Math.abs(b.prevX - av.x) < 1e-6 && Math.abs(b.prevY - av.y) < 1e-6, 'メッセージ: 発生点＝見える銃口');
  assert.ok(Math.abs(b.vx - G.speed * av.dx) < 1e-6 && Math.abs(b.vy - G.speed * av.dy) < 1e-6,
    'メッセージ: 弾の向き＝閃光・曳光と同じ狙い');
  assert.ok(b.vy > 0, 'メッセージ: 下へ飛ぶ');
});

test('左右の斜め弾道（向きで左右対称に下がる）', () => {
  const R = createExploreState(); R.x = W.FOE.x - 300; R.facing = 1; R.foe.state = 'chase';
  const L = createExploreState(); L.x = W.FOE.x + 300; L.facing = -1; L.foe.state = 'chase';
  const r = aimVector(R), l = aimVector(L);
  assert.ok(r.dx > 0 && r.dy > 0, 'メッセージ: 右向きは右下へ');
  assert.ok(l.dx < 0 && l.dy > 0, 'メッセージ: 左向きは左下へ');
  assert.ok(Math.abs(r.theta - l.theta) < 1e-9, 'メッセージ: 角度は左右対称');
  assert.ok(Math.abs(Math.abs(r.dx) - Math.abs(l.dx)) < 1e-9 && Math.abs(r.dy - l.dy) < 1e-9,
    'メッセージ: 向きの大きさも左右対称');
  assert.ok(l.y > muBase + 10 && Math.abs(r.y - l.y) < 1e-9, 'メッセージ: 左向きでも銃口は同じ高さへ下がる');
});

test('射線外（背後の敵へは銃を向けない・勝手に背後へ撃たない）', () => {
  const st = createExploreState();
  st.x = W.FOE.x + 300; st.facing = 1; st.foe.state = 'chase';   // 敵は左（背後）なのに右を向く
  assert.equal(aimAngle(st), 0, 'メッセージ: 背後の敵へは向けない');
  const ev = step(st, { move: 0, shoot: true }, 1 / 60);
  assert.equal(ev.shoot, true);
  assert.ok(Math.abs(st.shots[0].vy) < 1e-9 && st.shots[0].vx > 0, 'メッセージ: 水平へ撃つ（背後へ曲げない）');
  for (let i = 0; i < 40; i++) step(st, { move: 0 }, 1 / 60);
  assert.equal(st.foe.alive, true, 'メッセージ: 背後の敵は生きている');
  assert.equal(st.foe.hp, W.FOE.hp, 'メッセージ: 背後の敵には当たらない');
});

test('交戦前（休眠）と遠すぎる敵は自然な水平姿勢のまま', () => {
  const st = createExploreState();
  st.x = W.FOE.x - 300; st.facing = 1; st.foe.state = 'idle';
  assert.equal(aimAngle(st), 0, 'メッセージ: 休眠中は狙わない');
  step(st, { move: 0, shoot: true }, 1 / 60);
  const b = st.shots[0];
  assert.ok(Math.abs(b.y - muBase) < 1e-6 && Math.abs(b.vy) < 1e-9, 'メッセージ: 従来の水平銃口のまま');

  const far = createExploreState();
  far.x = W.FOE.x - A.maxRange - 80; far.facing = 1; far.foe.state = 'chase';
  assert.equal(aimAngle(far), 0, 'メッセージ: 遠すぎたら狙わない');
});

test('銃を下へ向ける角度は近いほど大きいが上限を超えない（手触り維持）', () => {
  const mk = (d) => { const s = createExploreState(); s.facing = 1; s.foe.state = 'chase'; s.x = W.FOE.x - d; return s; };
  const far = aimAngle(mk(500)), near = aimAngle(mk(250)), close = aimAngle(mk(120));
  assert.ok(far > 0 && near > far, 'メッセージ: 近いほど下向き（' + far + ' < ' + near + '）');
  assert.ok(close <= A.maxAngle + 1e-9, 'メッセージ: 上限を超えない（' + close + '）');
  assert.ok(Math.abs(close - A.maxAngle) < 1e-9, 'メッセージ: 近距離では上限で頭打ち');
});

test('撃破は直ちに無害・撃てない（演出中は攻撃してこない）', () => {
  const st = createExploreState();
  st.foe.hp = 1; st.x = W.FOE.x - 300; st.facing = 1;
  step(st, { move: 0, shoot: true }, 1 / 60);
  for (let i = 0; i < 60 && st.foe.alive; i++) step(st, { move: 0 }, 1 / 60);
  assert.equal(st.foe.alive, false, 'メッセージ: 撃破できる');
  st.x = W.FOE.x - 40;      // 演出中に至近へ
  let hurt = false;
  for (let i = 0; i < 120; i++){ const ev = step(st, { move: 0 }, 1 / 60); if (ev.hurt) hurt = true; }
  assert.equal(hurt, false, 'メッセージ: 撃破後は攻撃してこない（無害）');
  assert.equal(st.hp, P.hp, 'メッセージ: 被弾しない');
});

test('撃破演出は短く一度だけ（のけぞり→沈む→消える）。完了後は再生しない', () => {
  const st = createExploreState();
  st.foe.hp = 1; st.x = W.FOE.x - 300; st.facing = 1;
  step(st, { move: 0, shoot: true }, 1 / 60);
  for (let i = 0; i < 60 && st.foe.alive; i++) step(st, { move: 0 }, 1 / 60);
  assert.equal(st.foe.alive, false);
  const v0 = foeDeathView(st.foe);
  assert.equal(v0.done, false, 'メッセージ: 撃破直後は演出中');
  assert.equal(v0.phase, 'lean', 'メッセージ: まず少しのけぞる');
  assert.ok(v0.lean > 0 && v0.alpha > 0.9, 'メッセージ: まだ消えず、のけぞる');
  const phases = new Set([v0.phase]);
  let guard = 0;
  while (!foeDeathView(st.foe).done && guard++ < 400){ step(st, { move: 0 }, 1 / 60); phases.add(foeDeathView(st.foe).phase); }
  assert.equal(foeDeathView(st.foe).done, true, 'メッセージ: 短時間で完了する');
  assert.ok(phases.has('sink'), 'メッセージ: 沈む段階がある');
  assert.ok(phases.has('fade'), 'メッセージ: 消える段階がある');
  assert.ok(W.FOE.deathT <= 1.2, 'メッセージ: 演出は短い');
  assert.equal(foeDeathView(st.foe).alpha, 0, 'メッセージ: 最後は消える');
  // 完了後は進まない＝再生しない（再入場でも deathT は保たれる）
  const before = st.foe.deathT;
  for (let i = 0; i < 60; i++) step(st, { move: 0 }, 1 / 60);
  assert.equal(st.foe.deathT, before, 'メッセージ: 演出は繰り返さない');
});

test('撃破の資源イベントは一度きり（killFoe は 1 回だけ）', () => {
  const st = createExploreState();
  st.foe.hp = 1; st.x = W.FOE.x - 300; st.facing = 1;
  let kills = 0;
  for (let i = 0; i < 200; i++){ if (step(st, { move: 0, shootHold: i < 8 }, 1 / 60).killFoe) kills++; }
  assert.equal(kills, 1, 'メッセージ: 撃破イベントは一度だけ');
  assert.equal(st.foe.hp, 0, 'メッセージ: 二重に減らない');
  assert.equal(st.foe.alive, false);
});

test('長押し連射の回帰：各発が狙いの銃口から出て、サイクルごとに連射する', () => {
  const st = createExploreState();
  st.x = W.FOE.x - 400; st.facing = 1; st.foe.state = 'chase';
  let n = 0, aimed = 0;
  for (let i = 0; i < 60; i++){
    const av = aimVector(st);               // 発射される時点の狙い
    const ev = step(st, { move: 0, shootHold: true }, 1 / 60);
    if (ev.shoot){
      n++;
      const b = st.shots[st.shots.length - 1];
      if (b && Math.abs(b.vx - G.speed * av.dx) < 1e-6 && Math.abs(b.vy - G.speed * av.dy) < 1e-6 && b.vy > 0) aimed++;
    }
  }
  assert.ok(n >= 2 && n <= 4, 'メッセージ: 既存サイクルで連射（' + n + '）');
  assert.equal(aimed, n, 'メッセージ: 連射の各発も銃口・狙いが同じ計算');
});

test('撃破後も潜水艇へ帰還できる（回帰）', () => {
  const st = createExploreState();
  st.foe.alive = false; st.foe.deathT = 0; st.x = W.EXIT_X;
  const ev = step(st, { move: 0, action: true }, 0.016);
  assert.equal(ev.return, true, 'メッセージ: 演出中〜後も帰還できる');
});
