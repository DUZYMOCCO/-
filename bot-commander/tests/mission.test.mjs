// v0.2.x ミッション（資材集め・巡回・脱出）のシミュレーションのテスト（v0.2.1: 制限時間なし・掘り出し物）
// v0.4.0-dev: 部隊なし。味方は1機ずつ・人間は別枠（捕まる・助ける）
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, runSim, stepSim, issueOrder, hashSim, missionStatus, groupUnits, groupSees, unitById, fieldCount, KINDS, TICK, FIELD_CAP } from '../js/sim/sim.js?v=30';
import { MISSION_1, ALERT, FIND, CAPTURE } from '../js/sim/mission.js?v=10';
import { reachable, tileAt, T, tileCenter } from '../js/sim/map.js?v=6';

const sec = s => Math.round(s / TICK);
const base = over => ({ id: 't', title: 't', target: 30, salvage: [{ tx: 20, ty: 50, amount: 40 }], extraction: { tx: 20, ty: 40 }, ally: [{ name: 'S', kind: 'scav', tx: 20, ty: 53, count: 4 }], aliens: [], ...over });
const allies = (sim, kind) => sim.units.filter(u => u.side === 'ally' && (!kind || u.kind === kind));
const robots = sim => sim.units.filter(u => u.side === 'ally' && !u.human);
const idsOf = us => us.map(u => u.id);
const cargo = us => us.reduce((a, u) => a + u.cargo, 0);
const patrol = sim => sim.groups.find(g => g.role === 'patrol');
const place = (sim, us, tx, ty) => us.forEach((u, i) => { u.x = tileCenter(tx) + (i % 2) * 10; u.y = tileCenter(ty) + (i >> 1) * 10; });
// 異星生物の巡回点 (20,40) から3タイルほど離れた平地（森だと見つかりにくくなるため）
const plainNear = sim => [[20, 43], [21, 43], [19, 43], [22, 43], [18, 43], [20, 42], [21, 42], [19, 42]].map(([tx, ty]) => ({ tx, ty })).find(p => tileAt(sim.map, p.tx, p.ty) === T.PLAIN);
function runUntil(sim, pred, maxSec) { for (let i = 0; i < sec(maxSec) && !pred(); i++) stepSim(sim); return pred(); }

test('ミッション1: 回収ポイント・脱出口・巡回路が、スタート地点から全部歩いて行ける・12機＋人間2人', () => {
  const sim = createSim({ seed: 1, mission: MISSION_1 });
  const c = allies(sim, 'scav')[0], m = sim.map;
  const seen = reachable(m, Math.floor(c.x / 32), Math.floor(c.y / 32));
  const ok = p => seen[p.ty * m.w + p.tx] === 1;
  assert.equal(sim.mission.salvage.length, 4);
  for (const p of sim.mission.salvage) assert.ok(ok(p), `回収ポイント ${p.tx},${p.ty}`);
  assert.ok(ok(sim.mission.extraction), '脱出口');
  assert.ok(sim.mission.nest && ok(sim.mission.nest), '異星生物の巣（人間を運ぶ先）も歩いて行ける');
  const patrols = sim.groups.filter(g => g.role === 'patrol');
  assert.equal(patrols.length, 3);
  for (const g of patrols) for (const w of g.route) assert.ok(ok(w), `巡回路 ${g.name}`);
  for (const u of allies(sim)) assert.ok(seen[Math.floor(u.y / 32) * m.w + Math.floor(u.x / 32)] === 1, `${u.label} も同じ陸`);
  const fc = fieldCount(sim);
  assert.equal(fc.robots, FIELD_CAP.robots, 'ロボット12機');
  assert.equal(fc.humans, 2, '人間2人（別枠）');
  assert.equal(allies(sim, 'scav').length, 4); assert.equal(allies(sim, 'ponco').length, 8);
  assert.ok(allies(sim, 'boy').length === 1 && allies(sim, 'girl').length === 1);
  assert.equal(new Set(allies(sim).map(u => u.label)).size, 14, '名前は1機ずつ別');
  assert.ok(!('squads' in sim), '部隊はもうない');
  assert.ok(KINDS.scav.atk * 10 <= KINDS.ponco.atk, 'ツギハギ号の攻撃力はおよそ1/10');
});

test('回収: 止まった機体が資材を集め、ポイントは減って空になる（量は保存される・1機ずつ運ぶ）', () => {
  const sim = createSim({ seed: 2, mission: base() });
  const us = allies(sim);
  issueOrder(sim, idsOf(us), [{ tx: 20, ty: 50 }]);
  assert.ok(runUntil(sim, () => cargo(us) > 0, 60), '集め始める');
  assert.ok(us.some(u => u.gathering === 0));
  const p = sim.mission.salvage[0];
  const bonus = () => sim.mission.finds.length * FIND.bonus;
  assert.ok(Math.abs(p.amount + p.gathered - 40) < 1e-6, '減った分だけ集めた');
  assert.ok(Math.abs(cargo(us) - p.gathered - bonus()) < 1e-6, '運んでいる＝集めた分＋掘り出し物');
  assert.ok(runUntil(sim, () => p.amount === 0, 120), '空になる');
  assert.ok(Math.abs(cargo(us) - 40 - bonus()) < 1e-6);
  assert.ok(us.filter(u => u.cargo > 0).length >= 2, '何機かで分けて持つ');
  const c1 = cargo(us); runSim(sim, sec(5));
  assert.equal(cargo(us), c1, '空のポイントからはもう増えない');
  assert.ok(us.every(u => u.gathering === null));
});

test('回収: 移動中は集めない・ツギハギ号は PONCO02 より速く集める', () => {
  const mk = kind => { const sim = createSim({ seed: 2, mission: base({ ally: [{ kind, tx: 20, ty: 50, count: 4 }] }) }); runSim(sim, sec(10)); return cargo(allies(sim)); };
  const scav = mk('scav'), ponco = mk('ponco');
  assert.ok(scav > ponco * 3, `ツギハギ号 ${scav.toFixed(1)} > PONCO02 ${ponco.toFixed(1)} ×3`);
  const sim = createSim({ seed: 2, mission: base({ ally: [{ kind: 'scav', tx: 20, ty: 50, count: 4 }] }) });
  issueOrder(sim, idsOf(allies(sim)), [{ tx: 20, ty: 30 }]);
  runSim(sim, sec(1));
  const c0 = cargo(allies(sim)); runSim(sim, sec(3));
  assert.equal(cargo(allies(sim)), c0, '移動中は増えない');
});

test('脱出: 資材を脱出口に届けて目標に届くと勝ち（届けるのは入った機体の分だけ）', () => {
  const sim = createSim({ seed: 3, mission: base() });
  const us = allies(sim);
  issueOrder(sim, idsOf(us), [{ tx: 20, ty: 50 }]);
  assert.ok(runUntil(sim, () => cargo(us) >= 30, 120));
  issueOrder(sim, us[0].id, [{ tx: 20, ty: 40 }]);
  const c0 = us[0].cargo, total = cargo(us);
  assert.ok(runUntil(sim, () => sim.mission.delivered > 0, 120));
  assert.ok(Math.abs(sim.mission.delivered - c0) < 1e-6 && sim.result === null, '1機分だけ届く');
  issueOrder(sim, idsOf(us.slice(1)), [{ tx: 20, ty: 40 }]);
  assert.ok(runUntil(sim, () => sim.result, 120), '終わる');
  assert.equal(sim.result, 'win'); assert.equal(sim.resultReason, 'extracted');
  const st = missionStatus(sim);
  assert.ok(st.delivered >= 30 && st.carrying === 0 && total >= 30);
});

test('制限時間なし: 何もしないで長い時間がたっても負けない（負けは全滅だけ）', () => {
  const a = createSim({ seed: 4, mission: MISSION_1 });
  runSim(a, sec(1800));
  assert.equal(a.result, null, '30分たっても終わらない');
  assert.ok(a.units.some(u => u.side === 'ally'));
  assert.ok(!('timeLimit' in MISSION_1) && !('timeLimit' in a.mission), '制限時間の設定そのものがない');
  assert.ok(!('remaining' in missionStatus(a)) && Math.abs(missionStatus(a).elapsed - a.time) < 1e-9, 'HUD 用は経過時間だけ');
});

test('回収のお楽しみ: 1つごとに +1 の fx、掘り出し物は seed で決まり、おまけが運搬量に足される', () => {
  const run = seed => {
    const sim = createSim({ seed, mission: base({ ally: [{ kind: 'scav', tx: 20, ty: 50, count: 4 }] }) });
    const seen = new Set();
    for (let i = 0; i < sec(40); i++) { stepSim(sim); for (const f of sim.fx) if (f.type === 'gain') seen.add(f); }
    return { sim, gains: seen.size };
  };
  const { sim, gains } = run(11);
  const p = sim.mission.salvage[0];
  assert.equal(p.amount, 0);
  assert.equal(gains, 40, '40集めたら +1 が40回');
  assert.ok(sim.mission.finds.length <= FIND.at.length);
  assert.ok(Math.abs(cargo(allies(sim)) - 40 - sim.mission.finds.length * FIND.bonus) < 1e-6);
  for (const f of sim.mission.finds) { assert.ok(FIND.names.includes(f.name)); assert.ok(unitById(sim, f.unitId), '見つけた機体'); }
  assert.deepEqual(run(11).sim.mission.finds, sim.mission.finds, '同じ seed なら同じ掘り出し物');
  let total = 0; for (let seed = 1; seed <= 12; seed++) total += run(seed).sim.mission.finds.length;
  assert.ok(total > 0 && total < 12 * FIND.at.length, `いくつかの seed で見つかり、毎回全部ではない（${total}）`);
});

test('負け: 全滅・倒れた機体の資材はその機体の分だけ失う', () => {
  const b = createSim({ seed: 4, mission: base() });
  const us = allies(b); us[0].cargo = 5; us[1].cargo = 3;
  us[0].hp = 0; stepSim(b);
  assert.equal(b.mission.lost, 5); assert.equal(us[1].cargo, 3);
  for (const u of b.units) if (u.side === 'ally') u.hp = 0;
  stepSim(b);
  assert.equal(b.result, 'lose'); assert.equal(b.resultReason, 'wiped');
});

const alienMission = over => base({ ally: [{ kind: 'scav', tx: 20, ty: 52, count: 4 }], aliens: [{ name: 'E', kind: 'alien', count: 2, route: [{ tx: 20, ty: 40 }, { tx: 21, ty: 40 }] }], ...over });

test('巡回: 見えていなければ気づかない。近くで見えるとゲージが上がり、満タンで追跡', () => {
  const sim = createSim({ seed: 5, mission: alienMission() });
  const e = patrol(sim);
  runSim(sim, sec(5));
  assert.equal(e.alert, 0); assert.equal(e.ai, 'patrol');
  const pn = plainNear(sim); assert.ok(pn);
  place(sim, allies(sim), pn.tx, pn.ty);
  runSim(sim, sec(1));
  assert.ok(e.alert > 0 && e.alert < 1, `ゲージは少しずつ上がる (${e.alert.toFixed(2)})`);
  assert.ok(runUntil(sim, () => e.ai === 'chase', 6), '追跡に変わる');
  assert.equal(e.speedMul, ALERT.chaseMul);
  assert.ok(groupUnits(sim, e).every(u => u.speedMul === ALERT.chaseMul), '群れの全員が速くなる');
});

test('巡回: 見失ってしばらくすると、あきらめて巡回路へ戻る', () => {
  const sim = createSim({ seed: 6, mission: alienMission() });
  const e = patrol(sim), us = allies(sim), pn = plainNear(sim);
  place(sim, us, pn.tx, pn.ty);
  assert.ok(runUntil(sim, () => e.ai === 'chase', 8));
  place(sim, us, 5, 57); // 遠くへ
  runSim(sim, sec(ALERT.giveUp - 2));
  assert.equal(e.ai, 'chase', 'すぐにはあきらめない');
  assert.ok(runUntil(sim, () => e.ai !== 'chase', 8), 'あきらめる');
  assert.ok(e.alert <= 0.5);
  assert.ok(runUntil(sim, () => e.ai === 'patrol', 60), '巡回に戻る');
  runSim(sim, sec(15));
  assert.ok(e.alert < 0.1, 'ゲージは下がっていく');
});

test('巡回: 森の中の機体は、近づかれないと見つからない', () => {
  const sim = createSim({ seed: 7, mission: alienMission() });
  const e = patrol(sim), us = allies(sim), m = sim.map;
  let ft = null;
  for (let y = 5; y < m.h - 5 && !ft; y++) for (let x = 5; x < m.w - 5 && !ft; x++) if ([0, 1, 2, 3].every(d => tileAt(m, x + d, y) === T.FOREST)) ft = { x, y };
  assert.ok(ft, '森がある');
  const a = groupUnits(sim, e)[0];
  a.x = tileCenter(ft.x) - 3 * 32; a.y = tileCenter(ft.y); // 森の端から3タイル（見える距離は4）
  for (const u of groupUnits(sim, e)) if (u !== a) { u.x = a.x; u.y = a.y; }
  for (const u of us) { u.x = tileCenter(ft.x); u.y = tileCenter(ft.y); }
  assert.equal(groupSees(sim, e), null, '森の中は3タイルでは見えない');
  for (const u of us) { u.x = a.x + 3 * 32; u.y = a.y - 0.5 * 32; }
  if (tileAt(m, Math.floor((a.x + 96) / 32), Math.floor((a.y - 16) / 32)) !== T.FOREST) assert.ok(groupSees(sim, e), '森の外なら見える');
});

test('異星生物: 撃たれるとすぐ追跡・攻撃されなければ少しずつ再生する', () => {
  const sim = createSim({ seed: 8, mission: alienMission({ ally: [{ kind: 'ponco', tx: 20, ty: 56, count: 1 }] }) });
  const e = patrol(sim), a = groupUnits(sim, e)[0];
  a.hp = a.maxHp * 0.5; a.lastHit = sim.time;
  runSim(sim, sec(ALERT.regenDelay - 1));
  assert.equal(a.hp, a.maxHp * 0.5, '撃たれた直後は再生しない');
  runSim(sim, sec(5));
  assert.ok(a.hp > a.maxHp * 0.5 && a.hp <= a.maxHp, '再生する');
  const p = allies(sim)[0];
  p.x = a.x; p.y = a.y + 100;
  assert.ok(runUntil(sim, () => e.ai === 'chase', 3), '撃たれると追跡');
});

test('ツギハギ号: 移動命令中は撃ち合いで止まらない（逃げられる）', () => {
  const sim = createSim({ seed: 9, mission: alienMission() });
  const us = allies(sim);
  place(sim, us, 20, 41);
  runSim(sim, sec(0.5));
  issueOrder(sim, idsOf(us), [{ tx: 20, ty: 56 }]);
  const y0 = us[0].y;
  runSim(sim, sec(3));
  assert.ok(us.every(u => !u.engaged), '交戦扱いにならない');
  assert.ok(us[0].y > y0 + 30, '下がっている');
});

// ---- 人間（別枠） ----
const humanMission = over => alienMission({ ally: [{ kind: 'ponco', tx: 20, ty: 56, count: 2 }, { kind: 'boy', tx: 20, ty: 52 }, { kind: 'girl', tx: 22, ty: 52 }], ...over });

// 巣（捕まえた人間を運ぶ先）。川の北の平地。巡回点 (20,40) からは川を渡って遠い
const NEST = { tx: 30, ty: 22 };
const nestMission = over => humanMission({ nest: NEST, extraction: { tx: 4, ty: 56 }, ...over }); // 脱出口は巡回点から離す（資材がそこで届かないように）
const nestXY = sim => ({ x: tileCenter(sim.mission.nest.tx), y: tileCenter(sim.mission.nest.ty) });
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function catchBoy(sim) {
  const e = patrol(sim), [a] = groupUnits(sim, e), boy = allies(sim, 'boy')[0];
  boy.x = a.x; boy.y = a.y + 8; stepSim(sim);
  assert.ok(boy.captured != null, '捕まる');
  return { boy, captor: unitById(sim, boy.captured) };
}

test('人間: 異星生物は撃たずに、触れたら捕まえる。捕まえた個体は群れを離れ、その場に残らず巣へ運ぶ', () => {
  const sim = createSim({ seed: 12, mission: nestMission() });
  const e = patrol(sim), [a] = groupUnits(sim, e), boy = allies(sim, 'boy')[0];
  boy.x = a.x; boy.y = a.y + 60; // 射程(44)の外・見える距離の中
  boy.cargo = 5;
  let shotAtHuman = false;
  for (let i = 0; i < sec(20) && boy.captured == null; i++) {
    stepSim(sim);
    if (sim.units.some(u => u.side === 'enemy' && u.targetId === boy.id)) shotAtHuman = true;
  }
  assert.equal(shotAtHuman, false, '人間は撃たない');
  assert.ok(typeof boy.captured === 'number', '捕まる（運ばれている）');
  assert.equal(boy.cargo, 0, '運んでいた資材は失う'); assert.ok(sim.mission.lost >= 5);
  const captor = unitById(sim, boy.captured);
  assert.equal(captor.carrying, boy.id); assert.equal(captor.groupId, null, '群れを離れる');
  assert.ok(!(patrol(sim)?.unitIds || []).includes(captor.id));
  assert.equal(captor.order?.mode, 'carry', '巣へ運ぶ命令');
  const p = { x: captor.x, y: captor.y }, n = nestXY(sim), d0 = dist(captor, n);
  runSim(sim, sec(10));
  assert.ok(dist(captor, p) > 40, '見張りにならず、その場を離れる');
  assert.ok(dist(captor, n) < d0 - 40, '巣へ近づいている');
  assert.ok(dist(boy, captor) < 16, '人間は運ぶ個体にくっついて動く');
  assert.ok(missionStatus(sim).boyCaptured); assert.equal(missionStatus(sim).carried, 1);
  // 捕まっている人間には命令が効かない
  issueOrder(sim, boy.id, [{ tx: 20, ty: 56 }]); runSim(sim, 2);
  assert.equal(boy.order, null);
});

test('人間: 運んでいる間は遅い（CAPTURE.carryMul）・撃たない', () => {
  const sim = createSim({ seed: 15, mission: nestMission() });
  const { captor } = catchBoy(sim);
  runSim(sim, sec(1));
  let moved = 0, prev = { x: captor.x, y: captor.y }, shots = 0;
  for (let i = 0; i < sec(4); i++) {
    stepSim(sim); moved += dist(captor, prev); prev = { x: captor.x, y: captor.y };
    if (sim.fx.some(f => f.type === 'shot' && f.side === 'enemy' && f.t === sim.time - TICK)) shots++;
  }
  assert.ok(CAPTURE.carryMul < 1);
  assert.ok(moved <= KINDS.alien.speed * CAPTURE.carryMul * 4 + 2, `遅い（4秒で ${moved.toFixed(1)}）`);
  assert.ok(moved > KINDS.alien.speed * CAPTURE.carryMul * 4 * 0.3, '止まってはいない');
  assert.equal(captor.engaged, false, '運んでいる間は撃ち合わない');
});

test('人間: 運ぶ途中で倒すと、その場に落ちて助かる。少年が捕まったままでは脱出しても勝ちにならない', () => {
  const sim = createSim({ seed: 13, mission: nestMission() });
  const { boy, captor } = catchBoy(sim);
  const start = { x: boy.x, y: boy.y };
  sim.mission.delivered = sim.mission.target; stepSim(sim);
  assert.equal(sim.result, null, '少年が捕まったままでは勝てない');
  runSim(sim, sec(8));
  const drop = { x: captor.x, y: captor.y };
  captor.hp = 0; stepSim(sim);
  assert.equal(boy.captured, null, '助かった');
  assert.ok(dist(boy, start) > 30 && dist(boy, drop) < 24, '運ばれた途中の場所に落ちる');
  assert.ok(sim.fx.some(f => f.type === 'rescue'));
  assert.equal(sim.result, 'win', '助けたら勝ち');
});

test('人間: 巣まで運ばれると巣に置かれる。巣の敵を倒してロボが巣に入ると助かる', () => {
  const sim = createSim({ seed: 16, mission: nestMission() });
  const { boy, captor } = catchBoy(sim);
  const n = nestXY(sim);
  assert.ok(runUntil(sim, () => boy.captured === 'nest', 240), '巣に着く');
  assert.ok(dist(boy, n) < 24, '人間は巣にいる'); assert.equal(boy.heldAt.nest, true);
  assert.equal(captor.carrying, null, '運び終わった');
  assert.ok(dist(captor, n) < 2.5 * 32, '運んだ個体は巣のそばに残る（仮）');
  assert.equal(missionStatus(sim).atNest, 1);
  sim.mission.delivered = sim.mission.target; stepSim(sim);
  assert.equal(sim.result, null, '巣にいる間も脱出にならない');
  // ロボが巣に来ても、巣に敵がいるうちは助からない
  const [r] = robots(sim);
  r.x = boy.x + 20; r.y = boy.y; r.order = null; stepSim(sim);
  assert.equal(boy.captured, 'nest', '敵がいるうちはまだ');
  // 巣の敵を倒すと助かる（ロボがそばにいる）
  captor.hp = 0; stepSim(sim);
  r.x = boy.x + 20; r.y = boy.y; stepSim(sim);
  assert.equal(boy.captured, null, '助かった');
  assert.equal(sim.result, 'win');
});

test('人間: 巣のない地図では、運ぶ個体の出てきた場所へ運ぶ', () => {
  const sim = createSim({ seed: 17, mission: humanMission() });
  assert.equal(sim.mission.nest, null);
  const e = patrol(sim), [a] = groupUnits(sim, e), boy = allies(sim, 'boy')[0];
  a.x = tileCenter(20); a.y = tileCenter(47); boy.x = a.x; boy.y = a.y + 8; stepSim(sim);
  assert.equal(boy.captured, a.id);
  const last = a.order.waypoints[a.order.waypoints.length - 1];
  assert.ok(Math.abs(last.tx - a.home.tx) <= 1 && Math.abs(last.ty - a.home.ty) <= 1, '出てきた場所へ');
  assert.ok(a.home.ty < 45, '出てきた場所は巡回の始まり（20,40）のあたり');
  assert.ok(runUntil(sim, () => boy.captured === 'nest', 60), '着いたらそこに置かれる');
});

test('人間: ロボットが全滅しても人間が逃げていれば続く。少年が捕まってロボットもいなければ負け', () => {
  const sim = createSim({ seed: 14, mission: humanMission() });
  for (const u of robots(sim)) u.hp = 0;
  stepSim(sim);
  assert.equal(sim.result, null, '人間が残っていれば続く');
  const e = patrol(sim), [a] = groupUnits(sim, e), boy = allies(sim, 'boy')[0];
  boy.x = a.x; boy.y = a.y + 8; stepSim(sim);
  assert.equal(sim.result, 'lose'); assert.equal(sim.resultReason, 'boyCaptured');
});

test('再現性: ミッションも同じ seed・同じ命令なら同じ結果', () => {
  const play = seed => {
    const sim = createSim({ seed, mission: MISSION_1 });
    const sc = idsOf(allies(sim, 'scav')), pc = idsOf(allies(sim, 'ponco'));
    issueOrder(sim, sc, [{ tx: 8, ty: 42 }]); issueOrder(sim, pc.slice(0, 4), [{ tx: 12, ty: 44 }]);
    runSim(sim, sec(60));
    issueOrder(sim, sc, [{ tx: 20, ty: 4 }]);
    runSim(sim, sec(60));
    return sim;
  };
  const a = play(11), b = play(11);
  assert.equal(hashSim(a), hashSim(b));
  assert.equal(missionStatus(a).delivered, missionStatus(b).delivered);
});
