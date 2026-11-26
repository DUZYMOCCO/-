/**
 * ABYSS DIVE — 礫鎧ガニ A/B/C（隔離プレイアブル候補）のテスト
 *
 * 担保する振る舞い（純ロジック）:
 *   1. 3 別種は「色替え」でなく、体格・歩行速度/歩調・鋏の間合い/威力で区別される。
 *   2. 各別種は解剖パーツ（甲羅+眼 / 近側の鋏 / 奥側の鋏 / 脚）を持ち、素材が実在する。
 *   3. 横歩きは足裏が床に接地する（脚は持ち上げ方向のみ動く）。
 *   4. 警戒で止まり鋏を構え、近距離で wind→swing→recover の一振りをする。
 *   5. 予告（wind）は無害。振り（swing）中だけ、見えている近側の鋏が当たる。
 *   6. 体の接触は無害（上・後ろを通過できる）。
 *   7. 殻は硬い＝序盤装備は極小、強化装備は明確に通る（0 にはしない）。
 *
 * 実ゲーム経路（DOM スタブ）:
 *   8. 3 別種が合流広間の深床へ、同一点に密集せず出現し、実床に立つ。
 *   9. 実弾経路で 1 体を撃破できる（崩壊を見せてから消える／追加報酬なし）。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import {
  GRAVEL_CRAB_SPECIES, GRAVEL_CRAB_KEYS, gravelCrabGeom, createGravelCrab,
  stepGravelCrab, gravelCrabPose, gravelCrabClaw, gravelCrabClawTouch,
  gravelCrabBodyHit, gravelCrabDamage, gravelCrabHitZone,
  GRAVEL_CRAB_SHOTS, gravelCrabShot, gravelCrabShotOrigin, stepGravelShot,
} from '../js/gravel-crab-rules.js';
import { GRAVEL_CRAB_PARTS } from '../js/gravel-crab-parts.js';
import { bootGame, tick, shootAt, stopGame } from './_headless-dom.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const gameDir = resolve(here, '..');
const FLOOR = 6900;
const P = (x, y) => ({ x, y, r: 24, alive: true });

function advanceTo(e, target, player, maxSteps = 6000) {
  for (let i = 0; i < maxSteps; i++) {
    stepGravelCrab(e, 1 / 60, player);
    if (e.state === target) return true;
  }
  return false;
}

test('1. 3 別種は色替えでなく、体格・歩行・鋏の違いで識別できる', () => {
  assert.deepEqual([...GRAVEL_CRAB_KEYS], ['a', 'b', 'c']);
  const a = GRAVEL_CRAB_SPECIES.a, b = GRAVEL_CRAB_SPECIES.b, c = GRAVEL_CRAB_SPECIES.c;
  // 体格（体幅）が三者三様
  assert.equal(new Set([a.bodyW, b.bodyW, c.bodyW]).size, 3, '体幅が別');
  // 歩行の速さ: B（低く幅広い）> A（丸）> C（重い異形鎧）
  assert.ok(b.walkSpeed > a.walkSpeed && a.walkSpeed > c.walkSpeed, '歩行速度が順序づく');
  assert.ok(b.stepHz > a.stepHz && a.stepHz > c.stepHz, '歩調も別');
  // 鋏の威力: C（異形鎧）> A > B
  assert.ok(c.clawDmg > a.clawDmg && a.clawDmg > b.clawDmg, '鋏の威力が別');
  // 体格の縦横比: B は最も低く幅広い（A=丸 / C=異形鎧 は B より背が高い）
  const ga = gravelCrabGeom('a'), gb = gravelCrabGeom('b'), gc = gravelCrabGeom('c');
  const arA = ga.bodyH / a.bodyW, arB = gb.bodyH / b.bodyW, arC = gc.bodyH / c.bodyW;
  assert.ok(arB < arA && arB < arC, 'B が最も低く幅広い（比が最小）');
  // A と C は同程度の背でも、歩行・鋏・甲羅の意匠（素材）で別種
  assert.notEqual(GRAVEL_CRAB_PARTS.a.parts.carapace.file, GRAVEL_CRAB_PARTS.c.parts.carapace.file);
  assert.notEqual(a.walkSpeed, c.walkSpeed);
  assert.notEqual(a.clawDmg, c.clawDmg);
});

test('2. 各別種が解剖パーツ（甲羅/近鋏/奥鋏/脚）を持ち、素材が実在する', () => {
  for (const key of GRAVEL_CRAB_KEYS) {
    const gm = gravelCrabGeom(key);
    assert.ok(gm, key + ' geom');
    for (const name of ['carapace', 'clawNear', 'clawFar', 'legs']) {
      assert.ok(gm.parts[name], `${key} に ${name}`);
      const f = gm.parts[name].file;
      assert.ok(existsSync(resolve(gameDir, 'assets', f)), `missing asset ${f}`);
    }
    // 脚・甲羅・鋏のピボットと体原点が記録されている
    assert.ok(Array.isArray(GRAVEL_CRAB_PARTS[key].origin), key + ' origin');
    assert.equal(gm.parts.carapace.file, `gravel-crab-${key}-carapace.webp`);
  }
});

test('3. 横歩きの足裏は床に接地する（脚は持ち上げ方向のみ）', () => {
  for (const key of GRAVEL_CRAB_KEYS) {
    const e = createGravelCrab(key, 4000, FLOOR);
    const gm = gravelCrabGeom(key);
    // 体原点は「床 − 足元」に置かれる＝最下点が床に接する
    assert.ok(Math.abs((e.y + gm.feetY) - FLOOR) < 1e-6, `${key}: 足裏が床`);
    let minDy = 0, moved = false;
    const x0 = e.x;
    for (let i = 0; i < 240; i++) {
      stepGravelCrab(e, 1 / 60, null);
      const pose = gravelCrabPose(e);
      minDy = Math.min(minDy, pose.legs.dy);
      assert.ok(pose.legs.dy <= 0.0001, `${key}: 脚は持ち上げ方向のみ（足裏が床から離れない）`);
      assert.ok(Math.abs((e.y + gm.feetY) - FLOOR) < 1e-6, `${key}: 歩行中も足裏は床`);
    }
    moved = e.x !== x0;
    assert.ok(moved, `${key}: 横歩きで前進する`);
    assert.ok(minDy < -1e-6, `${key}: 脚が歩行で上下する（歩調が動く）`);
  }
});

test('4. 警戒で止まって鋏を構え、近距離で wind→swing→recover の一振りをする', () => {
  for (const key of GRAVEL_CRAB_KEYS) {
    const sp = GRAVEL_CRAB_SPECIES[key];
    const e = createGravelCrab(key, 4000, FLOOR);
    const near = P(e.x + sp.attackR * 0.5, e.y);
    assert.ok(advanceTo(e, 'alert', near), `${key}: 近づくと警戒`);
    const pa = gravelCrabPose(e);
    assert.ok(pa.clawNear.rot !== 0, `${key}: 警戒で鋏を構える`);
    assert.notEqual(e.x, 4000 + 0, 'x は数値');   // 型
    assert.ok(advanceTo(e, 'wind', near), `${key}: 予告（wind）`);
    assert.ok(advanceTo(e, 'swing', near), `${key}: 振り（swing）`);
    assert.ok(advanceTo(e, 'recover', near), `${key}: 復帰（recover）`);
  }
});

test('5. 予告（wind）は無害。振り（swing）中だけ見えている近側の鋏が当たる', () => {
  const sp = GRAVEL_CRAB_SPECIES.b;
  const e = createGravelCrab('b', 4000, FLOOR);
  const near = P(e.x + sp.attackR * 0.5, e.y);
  advanceTo(e, 'wind', near);
  const cw = gravelCrabClaw(e);
  assert.equal(gravelCrabClawTouch(e, cw.tip.x, cw.tip.y, 24), false, '予告中は当たらない');
  advanceTo(e, 'swing', near);
  const cs = gravelCrabClaw(e);
  assert.equal(gravelCrabClawTouch(e, cs.tip.x, cs.tip.y, 24), true, '振り中は鋏に当たる');
  // 体の後ろ（進行方向の逆）は振り中でも当たらない＝通過できる
  assert.equal(gravelCrabClawTouch(e, e.x - e.dir * 1400, e.y, 24), false, '後ろは当たらない');
});

test('5b. 変換の左右バグ回帰: 大鋏は「向き（プレイヤーのいる側）」へ出る（描画と同じ式を共有）', () => {
  for (const key of GRAVEL_CRAB_KEYS) {
    const R = createGravelCrab(key, 0, FLOOR, { dir: 1 });  R.frozen = true; R.state = 'swing'; R.st = 0;
    const L = createGravelCrab(key, 0, FLOOR, { dir: -1 }); L.frozen = true; L.state = 'swing'; L.st = 0;
    const cr = gravelCrabClaw(R), cl = gravelCrabClaw(L);
    assert.ok((cr.tip.x - R.x) > 1, key + ': 右向きでは鋏先は体より +x（プレイヤーの側）');
    assert.ok((cl.tip.x - L.x) < -1, key + ': 左向きでは鋏先は体より -x（プレイヤーの側）');
    assert.ok((cr.shoulder.x - R.x) > 0, key + ': 肩もプレイヤーの側');
    assert.ok((cl.shoulder.x - L.x) < 0, key + ': 肩もプレイヤーの側（左）');
    /* 左右で完全にミラー（同じ式を共有＝描画と一致） */
    assert.ok(Math.abs((cr.tip.x - R.x) + (cl.tip.x - L.x)) < 1e-6, key + ': 鋏先は左右対称');
    assert.ok(Math.abs((cr.shoulder.x - R.x) + (cl.shoulder.x - L.x)) < 1e-6, key + ': 肩も左右対称');
    assert.equal(cr.shoulder.y, cl.shoulder.y, key + ': 肩の高さは同じ');
    /* 振り上げ（wind）でも同じ側に居る＝予告と当たりが同じ側 */
    R.state = 'wind'; R.st = 1; L.state = 'wind'; L.st = 1;
    const wr = gravelCrabClaw(R), wl = gravelCrabClaw(L);
    assert.ok((wr.tip.x - R.x) > 0, key + ': 構え中もプレイヤーの側');
    assert.ok((wl.tip.x - L.x) < 0, key + ': 構え中もプレイヤーの側（左）');
  }
});

test('5c. 攻撃中（wind/swing/recover）は向きが固定される（後ろへ回られても振り切らない）', () => {
  for (const key of GRAVEL_CRAB_KEYS) {
    const sp = GRAVEL_CRAB_SPECIES[key];
    const e = createGravelCrab(key, 4000, FLOOR, { dir: 1 });
    const front = P(e.x + sp.attackR * 0.5, e.y);
    assert.ok(advanceTo(e, 'wind', front), key + ': 予告まで');
    const dir0 = e.dir;
    const behind = P(e.x - sp.attackR * 3, e.y);   // 攻撃中に真後ろへ回る
    const seen = { wind: 0, swing: 0, recover: 0 };
    for (let i = 0; i < 4000 && !(seen.wind && seen.swing && seen.recover); i++) {
      stepGravelCrab(e, 1 / 60, behind);
      if (seen[e.state] != null) { seen[e.state]++; assert.equal(e.dir, dir0, key + ': 攻撃中は向き固定'); }
    }
    assert.ok(seen.wind && seen.swing && seen.recover, key + ': 一連の攻撃を通した');
  }
});

test('5d. 命中部位: 正面=guard / 横・背後=joint / 振り直後=open / 撃破後=null', () => {
  const e = createGravelCrab('b', 0, FLOOR, { dir: 1 });
  e.state = 'alert';
  assert.equal(gravelCrabHitZone(e, e.x + 300, e.y), 'guard', '正面（向き側）は guard');
  assert.equal(gravelCrabHitZone(e, e.x - 300, e.y), 'joint', '横・背後は joint');
  const e2 = createGravelCrab('b', 0, FLOOR, { dir: -1 });
  e2.state = 'alert';
  assert.equal(gravelCrabHitZone(e2, e2.x - 300, e2.y), 'guard', '左向きでは -x 側が正面');
  e.state = 'recover';
  assert.equal(gravelCrabHitZone(e, e.x + 300, e.y), 'open', '振り直後は open');
  e.dead = true;
  assert.equal(gravelCrabHitZone(e, e.x, e.y), null, '撃破後は null');
});

test('5e. 面ごとの効き: 正面（かばわれる）≪ 横背後 < 振り直後の隙。どの面も 0 にはしない', () => {
  const late = 60, early = 1.5;
  const eG = createGravelCrab('a', 0, FLOOR, { dir: 1 });
  gravelCrabDamage(eG, late, 'guard');                 // 1 発目でかばいに入る
  const g = gravelCrabDamage(eG, late, 'guard');       // かばっている間の正面
  assert.ok(g > 0, '正面でも 0 にはしない（わずかに削れる）');
  assert.ok(g < late * 0.05, 'かばっている正面はごくわずか');
  const j = gravelCrabDamage(createGravelCrab('a', 0, FLOOR), late, 'joint');
  const o = gravelCrabDamage(createGravelCrab('a', 0, FLOOR), late, 'open');
  assert.ok(j > g * 10, '横・背後は正面より明確に有効');
  assert.ok(o >= j, '振り直後の隙はさらに有効');
  assert.ok(gravelCrabDamage(createGravelCrab('a', 0, FLOOR), early, 'guard') > 0, '序盤装備でも 0 にはならない');
  assert.ok(gravelCrabDamage(createGravelCrab('a', 0, FLOOR), early, 'joint') > 0);
});

test('5f. 正面から撃たれ続けると鋏でかばう（guardT・姿勢）＝効きがさらに下がる', () => {
  const sp = GRAVEL_CRAB_SPECIES.b;
  const e = createGravelCrab('b', 0, FLOOR, { dir: 1 });
  e.state = 'alert';
  assert.equal(e.guardT, 0);
  const first = gravelCrabDamage(e, 60, 'guard');
  assert.ok(e.guardT > 0, '撃たれたら鋏でかばう');
  assert.ok(Math.abs(gravelCrabPose(e).clawNear.rot - sp.clawGuard) < 1e-9, 'かばう姿勢＝鋏を前に構える');
  const second = gravelCrabDamage(e, 60, 'guard');
  assert.ok(second < first, 'かばうと正面の効きがさらに落ちる');
  for (let i = 0; i < Math.ceil(sp.guardHold * 60) + 10; i++) stepGravelCrab(e, 1 / 60, null);
  assert.equal(e.guardT, 0, '一定時間でかばうのをやめる');
});

test('5g. 短い追跡: 遠いが視界内なら数歩詰め、pursueMax を超えない（退路確保）', () => {
  for (const key of GRAVEL_CRAB_KEYS) {
    const sp = GRAVEL_CRAB_SPECIES[key];
    const gm = gravelCrabGeom(key);
    const e = createGravelCrab(key, 4000, FLOOR, { dir: 1 });
    const far = P(e.x + sp.attackR + 60, e.y);        // 間合い外・追跡範囲内
    let stalked = false, maxOff = 0;
    for (let i = 0; i < 3000; i++) {
      stepGravelCrab(e, 1 / 60, far);
      if (e.state === 'stalk') stalked = true;
      maxOff = Math.max(maxOff, Math.abs(e.x - e.homeX));
      assert.ok(Math.abs((e.y + gm.feetY) - FLOOR) < 1e-6, key + ': 追跡中も足裏は床');
      assert.ok(maxOff <= sp.pursueMax + 4, key + ': 追跡は pursueMax を超えない（退路確保）');
    }
    assert.ok(stalked, key + ': 遠いと数歩詰める（stalk）');
    const away = P(e.x + sp.detectR * 3, e.y);        // 遠くへ逃げる
    for (let i = 0; i < 4000; i++) stepGravelCrab(e, 1 / 60, away);
    assert.equal(e.state, 'patrol', key + ': 逃げられると警戒を解く');
    assert.ok(Math.abs(e.x - e.homeX) <= sp.patrol + 4, key + ': 定位置の見張り範囲へ戻る');
  }
});

test('6. 体の接触は無害（上・後ろを通過できる）＝本体は弾だけに反応', () => {
  const e = createGravelCrab('a', 4000, FLOOR);
  // 通常（非攻撃）状態では鋏の当たりは無い
  assert.equal(gravelCrabClawTouch(e, e.x, e.y, 24), false, '通常姿勢では攻撃判定なし');
  // 体（殻）は弾の当たりとして存在する（描いた甲羅の楕円）
  const gm = gravelCrabGeom('a');
  assert.equal(gravelCrabBodyHit(e, e.x + e.dir * (gm.parts.carapace.offset[0] + gm.parts.carapace.w * 0.5) * gm.scale,
    e.y + (gm.parts.carapace.offset[1] + gm.parts.carapace.h * 0.5) * gm.scale, 0), true, '殻に当たる');
  assert.equal(gravelCrabBodyHit(e, e.x, e.y - 4000, 0), false, '殻の外は当たらない');
});

test('7. 殻は硬い: 序盤装備は極小、強化装備は明確に通る（0 にはしない）', () => {
  const e = createGravelCrab('c', 4000, FLOOR);   // C が最も硬い
  const early = gravelCrabDamage(e, 1.5, 'body');
  const late = gravelCrabDamage(e, 60, 'body');
  assert.ok(early > 0 && early < 0.5, '序盤は弾かれて極小（0 ではない）');
  assert.ok(late > 20, '強化装備は装甲を明確に通す');
  assert.ok(late > early * 40, '強化の効きが明確に差になる');
  e.dead = true;
  assert.equal(gravelCrabDamage(e, 100, 'body'), 0, '撃破後はダメージ 0');
});

/* ---- 実ゲーム経路（DOM スタブ） ---- */

async function bootHall() {
  const g = await bootGame();
  await tick(g, 3);
  g.G.bossKills = 1;
  const t = g.trench();
  g.G.player.x = t.sites.confluenceHall.x;
  g.G.player.y = t.deepFloorY - 120;
  await tick(g, 4);
  return { g, t };
}

test('8. 実ゲーム: 3 別種が合流広間の深床へ、同一点に密集せず出現し、実床に立つ', async () => {
  const { g, t } = await bootHall();
  try {
    const cs = g.G.enemies.filter(e => e.kind === 'gravel_crab');
    assert.equal(cs.length, 3, '3 別種が出る');
    assert.deepEqual(cs.map(e => e.species).sort(), ['a', 'b', 'c']);
    assert.equal(new Set(cs.map(e => Math.round(e.x))).size, 3, '同一点に密集しない');
    for (const e of cs) {
      assert.equal(Math.round(e.floorY), Math.round(t.deepFloorY), '実床に立つ');
      assert.ok(Math.abs((e.y + e.feetY) - e.floorY) < 1e-6, e.species + ': 足裏が床');
    }
    // 既存の巨蟹（geo_crab）は中央のまま不変
    assert.ok(g.G.enemies.filter(e => e.kind === 'geo_crab').length <= 1, '既存巨蟹は増えない');
    assert.equal(g.errors.length, 0, 'no JS errors: ' + JSON.stringify(g.errors));
  } finally { stopGame(g); }
});

test('9. 実ゲーム: 実弾経路で 1 体を撃破できる（崩壊を見せてから消える）', async () => {
  const { g } = await bootHall();
  try {
    const e = g.G.enemies.find(x => x.kind === 'gravel_crab');
    assert.ok(e, 'a gravel crab exists');
    const n0 = g.G.enemies.filter(x => x.kind === 'gravel_crab').length;
    for (let i = 0; i < 80 && !e.dead; i++) { shootAt(g, e, 9999); await tick(g, 1); }
    assert.equal(e.dead, true, 'real bullet path defeats it');
    assert.ok(e.deadT > 0, '崩壊を見せる時間が残る');
    await tick(g, 2);
    const n1 = g.G.enemies.filter(x => x.kind === 'gravel_crab' && !x.dead).length;
    assert.equal(n1, n0 - 1, '撃破後は生存 1 体ぶん減る');
    assert.equal(g.errors.length, 0, 'no JS errors: ' + JSON.stringify(g.errors));
  } finally { stopGame(g); }
});

test('15. 実ゲーム: 同じ装備（同じ弾）で「正面からの定点撃ち」より「横・背後へ回って関節へ当てる」方が速く削れる', async () => {
  const { g } = await bootHall();
  try {
    const a = g.G.enemies.find(x => x.kind === 'gravel_crab' && x.species === 'a');
    assert.ok(a, 'a specimen exists');
    /* 弾を「指定位置」に 1 発置く（当たり・部位判定・ダメージは本物のコードが走る）。 */
    const shootAtPos = (e2, x, y, dmg) => {
      g.G.bullets.push({ kind: 'shot', prevX: x - 3, prevY: y, x: x + 3, y, vx: 0, vy: 0, r: 40, a: 0, dmg, life: 0.25, aoe: 8, style: 'shot' });
    };
    const D = 20;
    a.frozen = true; a.state = 'alert'; a.hp = 100000; a.maxHp = 100000;
    /* 正面（向いている側）＝甲羅と、撃たれて構えた鋏がかばう面 */
    a.guardT = 0;
    shootAtPos(a, a.x + a.dir * 300, a.y, D);
    await tick(g, 2);
    const frontLoss = 100000 - a.hp;
    const guarded = a.guardT > 0;
    /* 横・背後（露出した関節） */
    a.guardT = 0; a.hp = 100000;
    shootAtPos(a, a.x - a.dir * 300, a.y, D);
    await tick(g, 2);
    const backLoss = 100000 - a.hp;
    assert.ok(frontLoss > 0, '正面でもわずかは削れる（弾を無効化しない）');
    assert.ok(guarded, '正面から撃たれると鋏でかばう（guardT）');
    assert.ok(backLoss > frontLoss * 5,
      `同じ弾でも背後へ回ると明確に有効（正面 ${frontLoss.toFixed(2)} / 背後 ${backLoss.toFixed(2)}）`);
    assert.equal(g.errors.length, 0, 'no JS errors: ' + JSON.stringify(g.errors));
  } finally { stopGame(g); }
});

test('16. 実ゲーム: 車座の深床（歩ける範囲）で数歩だけ詰め、pursueMax を超えない＝退路が残る', async () => {
  const { g, t } = await bootHall();
  try {
    const b = g.G.enemies.find(x => x.kind === 'gravel_crab' && x.species === 'b');
    const sp = g.gravelSpecies().b;
    assert.ok(b, 'b specimen exists');
    assert.equal(Math.round(b.floorY), Math.round(t.deepFloorY), '実床に立つ');
    /* 間合い外・追跡範囲内に置いて、実際の更新ループを回す（地形の上を歩けるか）。 */
    b.homeX = b.x;
    g.G.player.x = b.x + sp.attackR + 60;      // 近接の外・遠距離の下限より内（＝追跡でしか届かない）
    g.G.player.y = b.y;                       /* 同じ高さ（水平の追跡を見る） */
    let maxOff = 0, sawStalk = false;
    for (let i = 0; i < 240; i++) {
      await tick(g, 1);
      g.G.player.x = b.x + sp.attackR + 60;   // 定点に留まる（追跡させる）
      g.G.player.y = b.y;
      if (b.state === 'stalk') sawStalk = true;
      maxOff = Math.max(maxOff, Math.abs(b.x - b.homeX));
      assert.equal(Math.round(b.floorY), Math.round(t.deepFloorY), '歩いても床は同じ');
      assert.ok(Math.abs((b.y + b.feetY) - b.floorY) < 1e-6, '足裏は床');
      assert.ok(maxOff <= sp.pursueMax + 8, 'pursueMax を超えない（退路確保）: ' + maxOff.toFixed(0));
    }
    assert.ok(sawStalk, '遠いと数歩だけ詰める');
    assert.equal(g.errors.length, 0, 'no JS errors: ' + JSON.stringify(g.errors));
  } finally { stopGame(g); }
});

/* ------------------------------------------------------------------ *
 * v3.9.4: 遠距離攻撃（架空のゲーム内攻撃）
 *   A=バブルショット / B=岩石投げ / C=大鋏と短い追跡のまま（役割分担）
 * ------------------------------------------------------------------ */

/** env 付きで状態まで進める。 */
function driveTo(e, target, player, env, maxSteps = 6000) {
  for (let i = 0; i < maxSteps; i++) {
    stepGravelCrab(e, 1 / 60, player, env);
    if (e.state === target) return true;
  }
  return false;
}
/** 間合いの帯（近接の外）に立つプレイヤー。 */
function bandPlayer(e, sp, off = 40) {
  return P(e.x + e.dir * (sp.rangedMin + off), e.y);
}

test('20. A=バブルショット: 予備動作は無害、泡は直進・低速・有限寿命（追尾なし）', () => {
  const sp = GRAVEL_CRAB_SPECIES.a, spec = GRAVEL_CRAB_SHOTS.bubble;
  const e = createGravelCrab('a', 4000, FLOOR, { dir: 1 });
  const p = bandPlayer(e, sp);
  assert.ok(driveTo(e, 'charge', p), 'A は間合いの帯で予備動作に入る');
  assert.ok(e.chargeT >= 0 && e.st > 0, '予備動作の時間がある');
  /* 無害: 予備動作中は鋏の一振りが無い */
  assert.equal(gravelCrabClawTouch(e, e.x + 40, e.y, 26), false, '予備動作中は当たらない');
  const shots = [];
  let guard = 0;
  while (shots.length < spec.count && guard++ < 900) {
    const ev = stepGravelCrab(e, 1 / 60, p);
    for (const t of ev) if (t && t.t === 'shot') shots.push(t.s);
  }
  assert.equal(shots.length, spec.count, '短い斉射（3 発）');
  for (const s of shots) {
    assert.equal(s.kind, 'bubble');
    assert.equal(s.gravity, 0, '泡は直進（重力なし）');
    assert.ok(Math.hypot(s.vx, s.vy) <= spec.speed + 1e-6, 'ゆっくり進む');
    assert.ok(s.life > 0 && s.life <= spec.life, '寿命がある');
    assert.ok(s.dmg > 0, '当たればダメージ');
  }
});

test('21. 短い斉射と長いクールダウン: 一度撃つと間隔が空く（連続弾幕にしない）', () => {
  const sp = GRAVEL_CRAB_SPECIES.a, spec = GRAVEL_CRAB_SHOTS.bubble;
  const e = createGravelCrab('a', 4000, FLOOR, { dir: 1 });
  const p = bandPlayer(e, sp);
  let shots = 0, guard = 0;
  while (shots < spec.count && guard++ < 900) {
    for (const t of stepGravelCrab(e, 1 / 60, p)) if (t && t.t === 'shot') shots++;
  }
  assert.ok(e.rangedT > 0, '撃った直後はクールダウンが入る');
  const cd0 = e.rangedT;
  assert.ok(cd0 > 2.0, 'クールダウンは長い（秒）');
  /* クールダウン中は予備動作に入らない */
  for (let i = 0; i < 30; i++) stepGravelCrab(e, 1 / 60, p);
  assert.notEqual(e.state, 'charge', 'クールダウン中は次を撃たない');
});

test('22. B=岩石投げ: 予備動作は無害、岩は 1 個・弧を描く（重力）・発射後は追尾なし', () => {
  const sp = GRAVEL_CRAB_SPECIES.b, spec = GRAVEL_CRAB_SHOTS.rock;
  const e = createGravelCrab('b', 4000, FLOOR, { dir: 1 });
  const p = bandPlayer(e, sp);
  assert.ok(driveTo(e, 'charge', p), 'B は予備動作に入る');
  const shots = [];
  let guard = 0;
  while (shots.length < 1 && guard++ < 900) {
    const ev = stepGravelCrab(e, 1 / 60, p);
    for (const t of ev) if (t && t.t === 'shot') shots.push(t.s);
  }
  assert.equal(shots.length, 1, '岩は 1 個');
  const s = shots[0];
  assert.equal(s.kind, 'rock');
  assert.equal(s.gravity, spec.gravity, '放物線（重力あり）');
  assert.ok(s.vy < 0, '上向きに投げ上げる＝弧を描く');
  assert.ok(Math.abs(s.vx) > 0, '進行方向へ飛ぶ');
  /* 発射後は追尾しない: vx は不変、vy は重力ぶんだけ */
  const v0x = s.vx, v0y = s.vy;
  stepGravelShot(s, 1 / 60, null);
  assert.equal(s.vx, v0x);
  assert.ok(Math.abs((s.vy - v0y) - spec.gravity / 60) < 1e-6, 'vy は重力ぶんだけ');
});

test('23. C=役割を分ける: 遠距離は持たず、大鋏と短い追跡のまま', () => {
  const sp = GRAVEL_CRAB_SPECIES.c;
  assert.equal(sp.ranged, null, 'C に遠距離は無い');
  const e = createGravelCrab('c', 4000, FLOOR, { dir: 1 });
  const p = bandPlayer(e, { rangedMin: 600, rangedMax: 900 });
  for (let i = 0; i < 3000; i++) {
    stepGravelCrab(e, 1 / 60, p);
    assert.notEqual(e.state, 'charge', 'C は予備動作に入らない');
    assert.notEqual(e.state, 'release', 'C は発射しない');
  }
  assert.equal(gravelCrabShot(e, 0), null, 'C は弾を持たない');
});

test('24. 制限（間合い・視界）: 近すぎ／遠すぎ／後ろからは撃たない', () => {
  const sp = GRAVEL_CRAB_SPECIES.a;
  const mk = () => createGravelCrab('a', 4000, FLOOR, { dir: 1 });
  /* 近すぎ（近接の間合い）→ 予備動作ではなく近接 */
  const e1 = mk(); const near = P(e1.x + sp.attackR * 0.5, e1.y);
  driveTo(e1, 'wind', near);
  assert.ok(e1.state === 'wind' || e1.state === 'swing' || e1.state === 'recover', '近いと近接（既存の一振りが残る）');
  /* 遠すぎ（視界外） */
  const e2 = mk(); const far = P(e2.x + sp.rangedMax + 400, e2.y);
  for (let i = 0; i < 900; i++) { stepGravelCrab(e2, 1 / 60, far); assert.notEqual(e2.state, 'charge'); }
  /* 後ろに立っても、撃つ前に必ず向き直る＝後ろ向きには撃たない（視界＝向きの制約） */
  const e3 = mk(); const behind = P(e3.x - (sp.rangedMin + 40), e3.y);
  let sawCharge = false, fired = false;
  for (let i = 0; i < 900; i++) {
    const ev = stepGravelCrab(e3, 1 / 60, behind);
    if (e3.state === 'charge') sawCharge = true;
    for (const t of ev) if (t && t.t === 'shot') {
      assert.ok(t.s.vx * e3.dir > 0, '撃つときは必ず向いている側へ飛ぶ（後ろ向きに撃たない）');
      fired = true;
    }
  }
  assert.ok(sawCharge && fired, '向き直ってから撃つ（後ろ向きの狙撃はしない）');
});

test('25. 制限（岩越し・画面外）: 遮蔽がある／画面外のときは発射しない', () => {
  const sp = GRAVEL_CRAB_SPECIES.a;
  const blocked = { losBlocked: () => true, onScreen: () => true };
  const e1 = createGravelCrab('a', 4000, FLOOR, { dir: 1 });
  const p1 = bandPlayer(e1, sp);
  for (let i = 0; i < 900; i++) { stepGravelCrab(e1, 1 / 60, p1, blocked); assert.notEqual(e1.state, 'charge', '岩越しは撃たない'); }
  const off = { losBlocked: () => false, onScreen: () => false };
  const e2 = createGravelCrab('a', 4000, FLOOR, { dir: 1 });
  const p2 = bandPlayer(e2, sp);
  for (let i = 0; i < 900; i++) { stepGravelCrab(e2, 1 / 60, p2, off); assert.notEqual(e2.state, 'charge', '画面外からは狙撃しない'); }
  /* 遮蔽も画面外も無ければ撃つ */
  const ok = { losBlocked: () => false, onScreen: () => true };
  const e3 = createGravelCrab('a', 4000, FLOOR, { dir: 1 });
  const p3 = bandPlayer(e3, sp);
  assert.ok(driveTo(e3, 'charge', p3, ok), '条件が揃えば撃つ');
});

test('26. 弾は左右に向きが出る（起点が向き側）', () => {
  for (const key of ['a', 'b']) {
    const sp = GRAVEL_CRAB_SPECIES[key];
    const R = createGravelCrab(key, 0, FLOOR, { dir: 1 }); R.aimX = 2000; R.aimY = R.y;
    const L = createGravelCrab(key, 0, FLOOR, { dir: -1 }); L.aimX = -2000; L.aimY = L.y;
    const sr = gravelCrabShot(R, 1), sl = gravelCrabShot(L, 1);
    assert.ok(sr.vx > 0, key + ': 右向きは +x へ飛ぶ');
    assert.ok(sl.vx < 0, key + ': 左向きは -x へ飛ぶ');
    const or = gravelCrabShotOrigin(R), ol = gravelCrabShotOrigin(L);
    /* 起点は左右で対称（同じ式）。かつ必ずプレイヤーのいる側に出る。 */
    assert.ok(Math.abs((or.x - R.x) + (ol.x - L.x)) < 1e-6, key + ': 起点は左右で対称');
    assert.equal(or.y, ol.y, key + ': 起点の高さは同じ');
    assert.ok(or.x > R.x, key + ': 右向きの起点は +x 側（プレイヤーの側）');
    assert.ok(ol.x < L.x, key + ': 左向きの起点は -x 側（プレイヤーの側）');
  }
});

test('27. 弾の終わり: 泡は寿命/地形で破裂、岩は床/壁で止まり砕けて消える', () => {
  const mk = (over) => Object.assign({ x: 0, y: 0, vx: 0, vy: 0, r: 20, life: 1, gravity: 0, kind: 'bubble' }, over);
  const b1 = mk({ life: 0.005 });
  assert.ok(stepGravelShot(b1, 1 / 60, null).includes('expire') && b1.dead, '泡は寿命で破裂');
  const b2 = mk({ vx: 300, life: 5 });
  assert.ok(stepGravelShot(b2, 1 / 60, { blocked: (x) => x > 1 }).includes('burst') && b2.dead, '泡は地形で破裂');
  const r1 = mk({ kind: 'rock', gravity: 900, vy: 200, life: 5 });
  const ev3 = stepGravelShot(r1, 1 / 60, { blocked: (x, y) => y > 0.5 });
  assert.ok(ev3.includes('shatter') && r1.stopped && !r1.dead, '岩は止まり砕ける（演出の間は残る）');
  assert.ok(stepGravelShot(r1, 0.4, null).includes('settled') && r1.dead, '砕けたあと消える');
});

test('28. 既存の近接は残る（A/B も近距離では鋏の一振り）', () => {
  for (const key of ['a', 'b', 'c']) {
    const sp = GRAVEL_CRAB_SPECIES[key];
    const e = createGravelCrab(key, 4000, FLOOR, { dir: 1 });
    const p = P(e.x + sp.attackR * 0.5, e.y);
    assert.ok(driveTo(e, 'swing', p), key + ': 近距離では鋏の一振りが出る');
    const claw = gravelCrabClaw(e);
    assert.equal(gravelCrabClawTouch(e, claw.tip.x, claw.tip.y, 24), true, key + ': 振り中は当たる');
    assert.ok((claw.tip.x - e.x) * e.dir > 0, key + ': 大鋏はプレイヤーのいる側へ振る');
  }
});

test('31. 左右バグ修正: 描画と同じ変換で、大鋏・当たり・発射起点が常にプレイヤーの側（A/B/C）', () => {
  for (const key of ['a', 'b', 'c']) {
    const sp = GRAVEL_CRAB_SPECIES[key];
    for (const dir of [1, -1]) {
      const e = createGravelCrab(key, 0, FLOOR, { dir });
      const claw = gravelCrabClaw(e);
      assert.ok((claw.shoulder.x - e.x) * dir > 0, `${key} dir=${dir}: 肩がプレイヤーの側`);
      assert.ok((claw.tip.x - e.x) * dir > 0, `${key} dir=${dir}: 鋏先がプレイヤーの側`);
      /* 左右で起点がミラー（同じ式を使っている） */
      const m = createGravelCrab(key, 0, FLOOR, { dir: -dir });
      const mc = gravelCrabClaw(m);
      assert.ok(Math.abs((claw.tip.x - e.x) + (mc.tip.x - m.x)) < 1e-6, `${key}: 左右ミラー`);
      /* 正面（guard）はプレイヤーの側、背後は joint（同じ dir を使う） */
      assert.equal(gravelCrabHitZone(e, e.x + dir * sp.bodyW * 0.5, e.y), 'guard', `${key} dir=${dir}: 正面=guard`);
      assert.equal(gravelCrabHitZone(e, e.x - dir * sp.bodyW * 0.5, e.y), 'joint', `${key} dir=${dir}: 背後=joint`);
      /* 攻撃中は向き固定（回り込んでも振り切るまで同じ側） */
      const w = createGravelCrab(key, 0, FLOOR, { dir });
      w.state = 'wind'; w.st = sp.tell; w.dir = dir;
      stepGravelCrab(w, 1 / 60, P(w.x - dir * 300, w.y));    /* 真後ろへ回る */
      assert.equal(w.dir, dir, `${key} dir=${dir}: 攻撃中は向きが固定`);
    }
  }
});

test('29. 実ゲーム: 間合いの帯に立つと予備動作→発射（本物の ebullets）→当たれば HP が減る', async () => {
  const { g } = await bootHall();
  try {
    g.G.rocks.length = 0;                       // LOS を確実に空ける（検証用）
    g.G.enemies = g.G.enemies.filter(x => x.kind === 'gravel_crab');
    g.G.ebullets.length = 0;
    const b = g.G.enemies.find(x => x.kind === 'gravel_crab' && x.species === 'b');
    const sp = g.gravelSpecies().b;
    assert.ok(b, 'b specimen exists');
    b.homeX = b.x;
    b.x = 12100; b.homeX = b.x;   /* 広間右寄り・左右とも開けた位置へ置く（岩越しにしない検証条件） */
    /* この個体が画面内に収まるよう、プレイヤーは固定位置（カメラが落ち着く）。 */
    const standX = b.x - (sp.rangedMin + 40);
    const stand = () => { g.G.player.x = standX; g.G.player.y = b.y; g.G.player.alive = true; };
    stand();
    g.G.camX = b.x - 640;
    const hp0 = g.G.player.hp;
    let charged = false, shot = null;
    for (let i = 0; i < 500 && !shot; i++) {
      await tick(g, 1);
      stand();                                   // 立ったまま（撃たせる）
      if (b.state === 'charge') charged = true;
      shot = g.G.ebullets.find(x => x.kind === 'rock' || x.kind === 'bubble') || null;
    }
    assert.ok(charged, '間合いの帯で予備動作に入る');
    assert.ok(shot, '岩石投げ/バブルショットが本物の ebullets に出る');
    for (let i = 0; i < 400; i++) { await tick(g, 1); stand(); }
    assert.ok(g.G.player.hp < hp0, `当たれば HP が減る（${hp0} → ${g.G.player.hp}）`);
    assert.equal(g.errors.length, 0, 'no JS errors: ' + JSON.stringify(g.errors));
  } finally { stopGame(g); }
});

test('30. 実ゲーム: 画面外（カメラ外）では狙撃しない', async () => {
  const { g } = await bootHall();
  try {
    g.G.rocks.length = 0;
    g.G.enemies = g.G.enemies.filter(x => x.kind === 'gravel_crab');
    g.G.ebullets.length = 0;
    const a = g.G.enemies.find(x => x.kind === 'gravel_crab' && x.species === 'a');
    const sp = g.gravelSpecies().a;
    a.homeX = a.x;
    const stand = () => { g.G.player.x = a.x + a.dir * (sp.rangedMin + 40); g.G.player.y = a.y; g.G.player.alive = true; };
    stand();
    g.G.camX = a.x + 4000;                        // カメラを遠くへ（この個体は画面外）
    for (let i = 0; i < 300; i++) {
      await tick(g, 1);
      stand();
      g.G.camX = a.x + 4000;                      // 画面外のまま
      assert.notEqual(a.state, 'charge', '画面外では予備動作に入らない');
    }
    assert.equal(g.G.ebullets.filter(x => x.kind === 'bubble' || x.kind === 'rock').length, 0, '画面外からは撃たない');
    assert.equal(g.errors.length, 0, 'no JS errors: ' + JSON.stringify(g.errors));
  } finally { stopGame(g); }
});
