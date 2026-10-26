// 高さ（v0.4.7-dev）の続き: 敵の群れが追う相手・怒って追う相手を「届くか」（canHit）で選ぶ（js/sim/targeting.js と sim.js の AI）。
// 小さい場面で、届かない相手を追わない・届く相手を選ぶ・通れないマスへ向かわない・今のミッションの結果が変わらないことを確かめる。
import test from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../js/sim/sim.js?v=27';
import { ALT_TEST_UNITS, BAND, unitBand } from '../js/sim/altitude.js?v=1';
import { reaches, groupReaches } from '../js/sim/targeting.js?v=2';
import { ALT_DEMO_SETUP, ALT_DEMO_POND, altDemoMapEdit } from '../js/sim/altitude-demo.js?v=2';
import * as M from '../js/sim/mission.js?v=10';
import { passable, tileAt, toTile, tileCenter, T } from '../js/sim/map.js?v=6';

const AIR = ALT_TEST_UNITS.air, UNDER = ALT_TEST_UNITS.underwater;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
/** 動かない・壊れない味方を1機置いた小さな場面。enemy は敵の群れの定義 */
function scene(ally, enemy, { seed = 1, mapEdit = null } = {}) {
  const sim = S.createSim({ seed, setup: { ally, enemy }, mapEdit });
  for (const u of sim.units) if (u.side === 'ally') { u.speed = 0; u.hp = u.maxHp = 1e6; u.atk = 0; }
  return sim;
}
const allyOf = (sim, name) => sim.units.find(u => u.side === 'ally' && u.label === name);
const alienOf = sim => sim.units.find(u => u.side === 'enemy');
const lastWp = u => u.order?.waypoints[u.order.waypoints.length - 1] || null;
/** n tick 進めながら、敵と味方の一番近づいた距離を返す */
function minDist(sim, a, e, n) { let m = Infinity; for (let i = 0; i < n; i++) { S.stepSim(sim); if (e.hp > 0) m = Math.min(m, dist(a, e)); } return m; }

test('届くかの小さな関数: 両方地上なら武器を調べずに true・空には近接が届かない・群れは誰か1体届けばよい', () => {
  let called = 0;
  const row = () => { called++; return { id: 'x', type: 'melee' }; };
  const G = { z: 0, x: 0, y: 0 }, A = { z: 40, x: 0, y: 0 };
  assert.equal(reaches(G, G, row), true); assert.equal(called, 0, '両方地上なら早道（武器を調べない）');
  assert.equal(reaches(G, A, row), false, '地上の近接は空に届かない'); assert.equal(called, 1);
  assert.equal(reaches(G, A, () => ({ id: 'x', type: 'shoot' })), true);
  assert.equal(groupReaches([], A, row), false, '空の群れは届かない');
  const rows = new Map([[G, { id: 'm', type: 'melee' }], [A, { id: 's', type: 'shoot' }]]);
  const m1 = { z: 0 }, m2 = { z: 0 }; rows.set(m1, { id: 'm', type: 'melee' }); rows.set(m2, { id: 's', type: 'shoot' });
  assert.equal(groupReaches([m1], A, u => rows.get(u)), false);
  assert.equal(groupReaches([m1, m2], A, u => rows.get(u)), true, '射撃できる1体がいれば群れは届く');
});

test('巡回でない敵: 地上の近接の群れは、空の機体しか近くにいなくても追わない（地上の機体なら追う）', () => {
  const run = ally => {
    const sim = scene([{ kind: 'ponco', tx: 12, ty: 33, ...ally, name: 'T' }], [{ name: '赤', kind: 'alien', tx: 12, ty: 30, role: 'guard', count: 1 }]);
    return minDist(sim, allyOf(sim, 'T'), alienOf(sim), 30 * 30);
  };
  const ground = run({}), air = run(AIR);
  assert.ok(ground < 60, `地上の相手には寄っていく（${ground.toFixed(0)}px）`);
  assert.ok(air > 60, `空の相手の下へは行かない（${air.toFixed(0)}px）`);
});

test('巡回でない敵: 届く相手と届かない相手が両方いるときは、届く相手（遠いほう）を選ぶ', () => {
  const sim = scene([
    { kind: 'ponco', tx: 12, ty: 32, ...AIR, name: '空' },        // 近いが届かない
    { kind: 'ponco', name: '地', tx: 15, ty: 33 },                  // 少し遠いが届く
  ], [{ name: '赤', kind: 'alien', tx: 12, ty: 30, role: 'guard', count: 1 }]);
  const e = alienOf(sim), g = allyOf(sim, '地'), a = allyOf(sim, '空');
  assert.ok(dist(e, a) < dist(e, g), 'はじめは空の機体のほうが近い');
  S.stepSim(sim);
  const w = lastWp(e);
  assert.ok(w, '動き出した');
  assert.deepEqual({ tx: w.tx, ty: w.ty }, { tx: toTile(g.x), ty: toTile(g.y) }, '行き先は届くほうの機体のマス');
});

test('巡回でない敵: 地上だけの敵は、水中の機体（深い水の中）を追わない', () => {
  const { tx, ty } = ALT_DEMO_POND;
  const sim = scene([{ kind: 'ponco', tx, ty, ...UNDER, name: '水' }], [{ name: '赤', kind: 'alien', tx: tx - 3, ty: ty - 6, role: 'guard', count: 1 }], { mapEdit: altDemoMapEdit });
  const w = allyOf(sim, '水'), e = alienOf(sim);
  assert.equal(unitBand(w), BAND.UNDERWATER, '深い水で潜っている');
  S.stepSim(sim);
  const w0 = lastWp(e);
  assert.ok(!w0 || Math.hypot(w0.tx - tx, w0.ty - ty) > 8, '池のふちへ向かう命令は出ない');
  const m = minDist(sim, w, e, 30 * 30);
  assert.ok(m > 90, `水の中の機体へは近づかない（${m.toFixed(0)}px）`);
});

test('追う先が深い水の中: 地上の機体の行き先・足場は深い水にならない。水陸両用機は深い水へも向かえる', () => {
  const { tx, ty } = ALT_DEMO_POND;
  const make = enemyDef => scene([{ kind: 'ponco', tx, ty, ...AIR, name: '空' }], [{ name: '赤', kind: 'gunner', tx: tx - 2, ty: ty - 6, role: 'guard', count: 1, ...enemyDef }], { mapEdit: altDemoMapEdit });
  // 地上の射撃型（空へは届く）: 空の機体は池の真上。行き先は池のふちの通れるマス
  const g = make({}), eg = alienOf(g);
  assert.equal(tileAt(g.map, tx, ty), T.WATER);
  let sawOrder = false;
  for (let i = 0; i < 30 * 40; i++) {
    S.stepSim(g);
    const w = lastWp(eg);
    if (w) { sawOrder = true; assert.ok(passable(g.map, w.tx, w.ty, eg.moves), `行き先 (${w.tx},${w.ty}) は地上で通れる`); }
    assert.ok(passable(g.map, toTile(eg.x), toTile(eg.y), eg.moves), '深い水の中に立たない');
  }
  assert.ok(sawOrder, '地上の射撃型は空の機体へ向かおうとした（届くので）');
  // 水陸両用の射撃型: 最初の行き先が、池の真ん中（深い水）でもよい
  const a = make({ moves: UNDER.moves }), ea = alienOf(a);
  S.stepSim(a);
  const w = lastWp(ea);
  assert.ok(w, '水陸両用機も追う');
  assert.deepEqual({ tx: w.tx, ty: w.ty }, { tx, ty }, '深い水の真上の相手へ、そのマスを目的地にできる');
});

test('巡回する敵: 空の機体は見えても気づかない（ゲージが上がらない）・地上の機体なら気づいて追う', () => {
  const m = ally => ({ id: 't', title: 't', target: 30, salvage: [{ tx: 20, ty: 50, amount: 40 }], extraction: { tx: 20, ty: 40 },
    ally: [{ kind: 'ponco', tx: 20, ty: 33, ...ally, name: 'T' }], aliens: [{ name: '赤', kind: 'alien', count: 1, route: [{ tx: 20, ty: 30 }, { tx: 21, ty: 30 }] }] });
  const run = ally => {
    const sim = S.createSim({ seed: 1, mission: m(ally) });
    const t = sim.units.find(u => u.label === 'T'); t.hp = t.maxHp = 1e6;
    let maxAlert = 0, chased = false;
    for (let i = 0; i < 30 * 12; i++) { S.stepSim(sim); const g = sim.groups[0]; maxAlert = Math.max(maxAlert, g.alert); if (g.ai === 'chase') chased = true; }
    return { maxAlert, chased };
  };
  const ground = run({}), air = run(AIR);
  assert.ok(ground.chased, '地上の相手には気づいて追う');
  assert.equal(air.maxAlert, 0, '空の相手では気づきのゲージが上がらない');
  assert.equal(air.chased, false);
});

test('怒った時（撃たれた時）: 届かない相手は追わない・届く相手は追う', () => {
  const m = ally => ({ id: 't', title: 't', target: 30, salvage: [{ tx: 20, ty: 50, amount: 40 }], extraction: { tx: 20, ty: 40 },
    ally: [{ kind: 'ponco', tx: 20, ty: 45, ...ally, name: 'T' }], aliens: [{ name: '赤', kind: 'alien', count: 1, route: [{ tx: 20, ty: 30 }, { tx: 21, ty: 30 }] }] });
  const run = ally => {
    const sim = S.createSim({ seed: 1, mission: m(ally) });
    const t = sim.units.find(u => u.label === 'T'), g = sim.groups[0];
    g.provokedBy = t.id;
    S.stepSim(sim);
    return { ai: g.ai, targetId: g.targetId, alert: g.alert, id: t.id };
  };
  const ground = run({}), air = run(AIR);
  assert.equal(ground.ai, 'chase'); assert.equal(ground.targetId, ground.id);
  assert.equal(air.ai, 'patrol', '空の相手を撃たれても追跡にはならない（巡回のまま）');
  assert.equal(air.targetId, null);
  assert.equal(air.alert, 0);
});

test('巡回する敵: 追っていた相手が届かなくなったら、見失った時と同じ流れで巡回へもどる', () => {
  const sim = S.createSim({ seed: 1, mission: { id: 't', title: 't', target: 30, salvage: [{ tx: 20, ty: 50, amount: 40 }], extraction: { tx: 20, ty: 40 },
    ally: [{ name: 'T', kind: 'ponco', tx: 20, ty: 33 }], aliens: [{ name: '赤', kind: 'alien', count: 1, route: [{ tx: 20, ty: 30 }, { tx: 21, ty: 30 }] }] } });
  const t = sim.units.find(u => u.label === 'T'), g = sim.groups[0];
  t.hp = t.maxHp = 1e6; t.speed = 0;
  for (let i = 0; i < 30 * 8 && g.ai !== 'chase'; i++) S.stepSim(sim);
  assert.equal(g.ai, 'chase', 'まず追っている');
  Object.assign(t, AIR); // 追われている機体が空へ上がった（届かなくなる）
  for (let i = 0; i < 30 * 12; i++) S.stepSim(sim);
  assert.notEqual(g.ai, 'chase', 'あきらめて巡回へもどった');
  assert.equal(g.targetId, null);
});

test('?altdemo=1 の場面: 異星生物は空テスト機・水中テスト機の下で立ち止まり続けない（seed 固定・900 tick）', () => {
  const sim = S.createSim({ seed: 1, mapSeed: 7, setup: ALT_DEMO_SETUP, mapEdit: altDemoMapEdit });
  const air = allyOf(sim, '空テスト機'), under = allyOf(sim, '水中テスト機');
  assert.ok(air && under);
  let nearest = Infinity;
  for (let i = 0; i < 900; i++) {
    S.stepSim(sim);
    for (const e of sim.units) if (e.side === 'enemy' && e.hp > 0) nearest = Math.min(nearest, dist(e, air), dist(e, under));
  }
  assert.ok(nearest > 40, `異星生物は空・水中の機体の真下まで寄らない（いちばん近づいた距離 ${nearest.toFixed(0)}px）`);
});

// v0.4.12-dev: 機体ごとの盾と体の表（js/sim/shield-table.js）で値が変わった。前の表（SHIELD_TABLE_V0411）で e1420fb6 … に戻ることは tests/shield-table.test.mjs が確かめる
test('主局面（MISSION_1）を 300 tick 進めたハッシュは、今の表の値（seed 1〜5）', () => {
  const want = { 1: '6cc93eb6', 2: '2a60b985', 3: '24994a28', 4: '5558d677', 5: '6e46d4aa' };
  for (const seed of [1, 2, 3, 4, 5]) {
    const sim = S.createSim({ seed, mission: M.MISSION_1 }); S.runSim(sim, 300);
    assert.equal(S.hashSim(sim), want[seed], `seed ${seed}`);
  }
});
