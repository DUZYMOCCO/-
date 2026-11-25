/**
 * 実ゲーム経路のヘッドレス検証（DOM スタブで game.js を起動）。
 *  - hermitB は深部（海溝下）を開いて分岐帯へ入ると 1 体だけ出て、実床に立つ
 *  - v3.7.0 視認性: range 内でも「見える歩行」を続けてから警戒へ。至近の近接遭遇は即警戒。
 *    退路（range 外）で発見がリセットされる
 *  - 撃破は「演出のみ」＝破片は G.parts、敵配列は汚さない。報酬は一度きり
 *  - 切離し 0 フレームは「実際に表示したポーズ」と一致（歩行中・警戒中／左右どちらの向きでも）
 *  - 既存の戦車擬態型ヤドカリは壊れていない（回帰）
 *  - 素材欠落（フォールバック）でも安全に従来演出へ戻る
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bootGame, tick, shootAt, stopGame, imageState } from './_headless-dom.mjs';

/** 深部（海溝下）を開き、プレイヤーを分岐帯へ入れて hermitB を出す。 */
async function bootDeep(){
  const g = await bootGame();
  await tick(g, 3);
  g.G.bossKills = 1;
  const t = g.trench();
  const bx = Math.round((t.caveX0 + t.caveX1) / 2);
  g.G.player.x = bx; g.G.player.y = 5200;
  await tick(g, 3);
  const e = g.G.enemies.find(x => x.kind === 'hermitB');
  return { g, t, bx, e };
}

/** 敵を「プレイヤーから dist だけ離れた位置」に置き、床に立たせて 1 フレーム進める。 */
async function stage(g, e, dist, mode = 'walk', noticeT = 0){
  e.state = mode; e.noticeT = noticeT; e.dir = -1; e.walkT = 0.45;
  if (mode === 'alert') e.st = 1.2;
  g.G.player.x = e.x - dist; g.G.player.y = e.floorY - 60;
  g.G.camX = g.G.player.x - 430; g.G.camY = g.G.player.y - 360;
  await tick(g, 1);
}

test('実ゲーム: hermitB は深部で 1 体だけ出て、実床に立つ', async () => {
  const { g, t, e } = await bootDeep();
  try {
    assert.ok(e, 'hermitB must spawn after the deep area opens');
    assert.equal(Math.round(e.floorY), t.deepFloorY, 'the crab must stand on the real deep floor');
    assert.equal(e.r, 52, 'hitbox radius matches the body');
    assert.equal(g.G.enemies.filter(x => x.kind === 'hermitB').length, 1, 'exactly one encounter');
    assert.equal(g.errors.length, 0, 'no JS errors: ' + JSON.stringify(g.errors));
  } finally { stopGame(g); }
});

test('実ゲーム: v3.7.0 接近時は range 内でも「見える歩行」を続けてから警戒に入る', async () => {
  const { g, e } = await bootDeep();
  try {
    assert.ok(e, 'hermitB must exist');
    /* 距離 460 = range(520) 内・close(300) 外。notice 未満では歩行のまま（歩行アニメが見える）。 */
    await stage(g, e, 460, 'walk', 0);
    assert.equal(e.state, 'walk', 'range 内でも notice 未満は歩行のまま（見える）');
    assert.ok(e.noticeT > 0, 'notice must accumulate while walking in range');
    const x0 = e.x;
    await tick(g, 3);
    assert.equal(e.state, 'walk', '数フレームはまだ歩行（歩行アニメが見える）');
    assert.ok(e.noticeT < 0.9, 'the notice window is not yet full');
    assert.notEqual(e.x, x0, 'the crab keeps walking (its position advances)');
    assert.equal(g.errors.length, 0, 'no JS errors: ' + JSON.stringify(g.errors));
  } finally { stopGame(g); }
});

test('実ゲーム: 見える歩行ののち notice 満了で警戒→砲撃（予告を消さない）', async () => {
  const { g, e } = await bootDeep();
  try {
    await stage(g, e, 460, 'walk', 0.95);            // 閾値の直前
    assert.equal(e.state, 'alert', 'notice 満了で歩行から警戒へ');
    const eb0 = g.G.ebullets.length;
    e.st = 0.05;                                     // チャージ終端
    await tick(g, 4);
    assert.ok(g.G.ebullets.length > eb0, '警戒後は距離内で砲撃する');
    assert.equal(g.errors.length, 0, 'no JS errors: ' + JSON.stringify(g.errors));
  } finally { stopGame(g); }
});

test('実ゲーム: 至近まで詰めた近接遭遇は歩行を挟まず即警戒（予告を遅らせない）', async () => {
  const { g, e } = await bootDeep();
  try {
    await stage(g, e, 280, 'walk', 0);               // close(300) 以内・range 内
    assert.equal(e.state, 'alert', '至近では即警戒（歩行を挟まない）');
    assert.equal(g.errors.length, 0, 'no JS errors: ' + JSON.stringify(g.errors));
  } finally { stopGame(g); }
});

test('実ゲーム: 退路（range 外）で発見がリセットされ、警戒に入らない', async () => {
  const { g, e } = await bootDeep();
  try {
    await stage(g, e, 460, 'walk', 0.5);
    assert.ok(e.noticeT >= 0.5, 'notice が進行中');
    /* 敵は巡回範囲に残し、プレイヤーを深部のまま退避させる。 */
    g.G.player.x = e.x - 700;
    g.G.camX = g.G.player.x - 430;
    const t0 = e.t;
    for (let i = 0; i < 6 && e.t === t0; i++) await tick(g, 1);
    assert.ok(e.t > t0, '退避後に敵の更新が実行された');
    assert.equal(e.noticeT, 0, 'range 外で発見リセット（退路）');
    assert.equal(e.state, 'walk', 'not alerted while outside the range');
    assert.equal(g.errors.length, 0, 'no JS errors: ' + JSON.stringify(g.errors));
  } finally { stopGame(g); }
});

test('実ゲーム: hermitB 撃破は破片だけを出し、報酬は一度きり', async () => {
  const { g, e } = await bootDeep();
  try {
    assert.ok(e, 'hermitB must spawn');
    const k0 = g.G.kills, res0 = g.G.resource;
    e.hp = 1; shootAt(g, e);
    await tick(g, 5);

    assert.equal(e.dead, true, 'the enemy must die through the real projectile path');
    assert.equal(g.G.kills, k0 + 1, 'kill counted exactly once');
    assert.ok(g.G.resource > res0, 'defeat pays its reward');
    assert.ok(!g.G.enemies.includes(e), 'defeated enemy leaves the enemy list');
    const husks = g.G.parts.filter(q => q.kind === 'husk');
    assert.ok(husks.length >= 5, 'the creature must split into its parts (got ' + husks.length + ')');
    assert.deepEqual(husks.map(h => h.id).sort(), ['clawL', 'clawR', 'eyes', 'legs', 'shell', 'torso'], 'all six parts');
    assert.ok(!g.G.enemies.some(x => x.kind === 'husk'), 'debris must never become an enemy');

    const res1 = g.G.resource;
    shootAt(g, e);                                  // 死体にもう一度当てても二重報酬にしない
    await tick(g, 3);
    assert.equal(g.G.kills, k0 + 1, 'no second kill');
    assert.equal(g.G.resource, res1, 'no second reward');
    assert.equal(g.errors.length, 0, 'no JS errors: ' + JSON.stringify(g.errors));
  } finally { stopGame(g); }
});

test('実ゲーム: 撃破は同じ潜航の再入（船内⇄潜航）で復活しない', async () => {
  const { g, e } = await bootDeep();
  try {
    e.hp = 1; shootAt(g, e); await tick(g, 4);
    assert.equal(e.dead, true, 'defeated');
    g.enterBase(0); await tick(g, 2); g.exitBase(); await tick(g, 3);
    assert.ok(!g.G.enemies.some(x => x.kind === 'hermitB' && !x.dead), 'defeated encounter must not respawn on re-entry');
    assert.equal(g.G.hermitBSeeded, true, 'the one-time seed stays spent for the outing');
    assert.equal(g.errors.length, 0, 'no JS errors: ' + JSON.stringify(g.errors));
  } finally { stopGame(g); }
});

test('実ゲーム: 部位素材が読めない時は従来演出へ安全に戻す（フォールバック）', async () => {
  const { g, e } = await bootDeep();
  try {
    e.hp = 1;
    imageState.ready = false;                       // 部位素材の欠落をシミュレート
    shootAt(g, e);
    await tick(g, 4);
    assert.equal(e.dead, true, 'the enemy still dies');
    assert.equal(g.G.parts.filter(q => q.kind === 'husk').length, 0, 'no husk parts when the art is missing');
    assert.equal(g.errors.length, 0, 'no JS errors: ' + JSON.stringify(g.errors));
  } finally { imageState.ready = true; stopGame(g); }
});

test('実ゲーム: 切離し 0 フレームは表示ポーズと一致（歩行中／左右の向き）', async () => {
  for (const dir of [1, -1]) {
    const { g, e } = await bootDeep();
    try {
      assert.ok(e, 'hermitB must exist');
      await stage(g, e, 600, 'walk', 0);            // range 外＝歩行のまま
      e.x = e.x0;                                  // 反転点ではなく巡回の中央から開始
      e.dir = dir;
      for (let i = 0; i < 6 && e._snap?.snap.anchor.flip !== dir; i++) await tick(g, 1);
      assert.equal(e.state, 'walk', 'the crab must keep walking out of range');
      const snap = e._snap && e._snap.snap;
      assert.ok(snap, 'the displayed pose must be snapshotted while drawing');
      assert.equal(e._snap.which, 'walk', 'the drawn pose must be the walk pose');
      assert.equal(snap.anchor.flip, dir, 'snapshot must use the drawn facing');
      assert.ok(e._snap.frame > 0, 'the walk frame must advance (not the neutral cell)');

      e.hp = 1; shootAt(g, e); await tick(g, 3);
      const husks = g.G.parts.filter(q => q.kind === 'husk');
      assert.ok(husks.length >= 5, 'parts must split');
      for (const h of husks) {
        const s = snap.parts.find(p => p.id === h.id);
        assert.ok(s, 'every debris piece must come from the shared pose (' + h.id + ')');
        assert.equal(h.pose0.x, s.at[0], 'frame-0 x must equal the drawn pose');
        assert.equal(h.pose0.y, s.at[1], 'frame-0 y must equal the drawn pose');
        assert.equal(h.pose0.rot, s.rot, 'frame-0 rotation must equal the drawn pose (no random start angle)');
      }
      const eyes = husks.find(h => h.id === 'eyes' || h.id === 'clawL');
      if (eyes && eyes.pose0.x !== e.x) {
        assert.equal(Math.sign(eyes.pose0.x - e.x), dir, 'parts must land on the side they were drawn');
      }
      assert.equal(g.errors.length, 0, 'no JS errors: ' + JSON.stringify(g.errors));
    } finally { stopGame(g); }
  }
});

test('実ゲーム: 警戒（alert）中に倒しても、警戒ポーズのまま割れる', async () => {
  const { g, e } = await bootDeep();
  try {
    await stage(g, e, 460, 'alert', 0);
    assert.equal(e.state, 'alert', 'the crab must stop and alert within range');
    const snap = e._snap && e._snap.snap;
    assert.ok(snap, 'the alert pose must be snapshotted');
    assert.equal(e._snap.which, 'alert', 'the drawn pose must be the alert pose');
    e.hp = 1; shootAt(g, e); await tick(g, 3);
    const husks = g.G.parts.filter(q => q.kind === 'husk');
    assert.ok(husks.length >= 5, 'parts must split from the alert pose');
    for (const h of husks) {
      const s = snap.parts.find(p => p.id === h.id);
      assert.ok(s, 'every piece must come from the alert pose (' + h.id + ')');
      assert.equal(h.pose0.y, s.at[1], 'frame-0 y equals the drawn alert pose');
      assert.equal(h.pose0.scale, s.scale, 'frame-0 scale equals the drawn alert pose');
    }
    assert.equal(g.errors.length, 0, 'no JS errors: ' + JSON.stringify(g.errors));
  } finally { stopGame(g); }
});

test('実ゲーム: 既存の戦車擬態型ヤドカリは残り、通常どおり撃破できる（回帰）', async () => {
  const g = await bootGame();
  try {
    await tick(g, 3);
    const t = g.G.enemies.find(x => x.kind === 'hermit');
    assert.ok(t, 'the tank-mimic hermit must still exist');
    t.hp = 1;
    const k0 = g.G.kills;
    shootAt(g, t, 9999);
    await tick(g, 4);
    assert.equal(t.dead, true, 'the tank hermit must still be killable');
    assert.equal(g.G.kills, k0 + 1, 'its reward still fires once');
    assert.ok(!g.G.parts.some(q => q.kind === 'husk'), 'a non-part enemy must not use the debris path');
    assert.equal(g.errors.length, 0, 'no JS errors: ' + JSON.stringify(g.errors));
  } finally { stopGame(g); }
});
