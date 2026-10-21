// v0.2.0 ミッション（資材集め・巡回・脱出）のシミュレーションのテスト
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, runSim, stepSim, issueOrder, hashSim, missionStatus, squadUnits, squadCommander, groupSees, KINDS, TICK } from '../js/sim/sim.js?v=4';
import { MISSION_1, ALERT } from '../js/sim/mission.js?v=4';
import { reachable, tileAt, T, tileCenter } from '../js/sim/map.js?v=4';

const sec = s => Math.round(s / TICK);
const base = over => ({ id: 't', title: 't', timeLimit: 600, target: 30, salvage: [{ tx: 20, ty: 50, amount: 40 }], extraction: { tx: 20, ty: 40 }, ally: [{ name: 'S', kind: 'scav', tx: 20, ty: 53, count: 4 }], aliens: [], ...over });
const ally = (sim, i = 0) => sim.squads.filter(s => s.side === 'ally')[i];
const patrol = sim => sim.squads.find(s => s.role === 'patrol');
const place = (sim, squad, tx, ty) => squadUnits(sim, squad).forEach((u, i) => { u.x = tileCenter(tx) + (i % 2) * 10; u.y = tileCenter(ty) + (i >> 1) * 10; });
// 異星生物の巡回点 (20,40) から3タイルほど離れた平地（森だと見つかりにくくなるため）
const plainNear = sim => [[20, 43], [21, 43], [19, 43], [22, 43], [18, 43], [20, 42], [21, 42], [19, 42]].map(([tx, ty]) => ({ tx, ty })).find(p => tileAt(sim.map, p.tx, p.ty) === T.PLAIN);
function runUntil(sim, pred, maxSec) { for (let i = 0; i < sec(maxSec) && !pred(); i++) stepSim(sim); return pred(); }

test('ミッション1: 回収ポイント・脱出口・巡回路が、スタート地点から全部歩いて行ける', () => {
  const sim = createSim({ seed: 1, mission: MISSION_1 });
  const c = squadCommander(sim, ally(sim)), m = sim.map;
  const seen = reachable(m, Math.floor(c.x / 32), Math.floor(c.y / 32));
  const ok = p => seen[p.ty * m.w + p.tx] === 1;
  assert.equal(sim.mission.salvage.length, 4);
  for (const p of sim.mission.salvage) assert.ok(ok(p), `回収ポイント ${p.tx},${p.ty}`);
  assert.ok(ok(sim.mission.extraction), '脱出口');
  const patrols = sim.squads.filter(s => s.role === 'patrol');
  assert.equal(patrols.length, 3);
  for (const s of patrols) for (const w of s.route) assert.ok(ok(w), `巡回路 ${s.name}`);
  assert.equal(sim.squads.filter(s => s.side === 'ally').length, 3);
  assert.equal(ally(sim).kind, 'scav');
  assert.ok(KINDS.scav.atk * 10 <= KINDS.ponco.atk, 'ツギハギ号の攻撃力はおよそ1/10');
});

test('回収: 止まった部隊が資材を集め、ポイントは減って空になる（量は保存される）', () => {
  const sim = createSim({ seed: 2, mission: base() });
  const s = ally(sim);
  issueOrder(sim, s.id, [{ tx: 20, ty: 50 }]);
  assert.ok(runUntil(sim, () => s.cargo > 0, 60), '集め始める');
  assert.equal(s.gathering, 0);
  const p = sim.mission.salvage[0];
  assert.ok(Math.abs(p.amount + s.cargo - 40) < 1e-6, '減った分だけ運んでいる');
  assert.ok(runUntil(sim, () => p.amount === 0, 120), '空になる');
  assert.ok(Math.abs(s.cargo - 40) < 1e-6);
  runSim(sim, sec(5));
  assert.ok(Math.abs(s.cargo - 40) < 1e-6, '空のポイントからはもう増えない');
  assert.equal(s.gathering, null);
});

test('回収: 移動中は集めない・ツギハギ号は PONCO02 より速く集める', () => {
  const mk = kind => { const sim = createSim({ seed: 2, mission: base({ ally: [{ name: 'X', kind, tx: 20, ty: 50, count: 4 }] }) }); runSim(sim, sec(10)); return ally(sim).cargo; };
  const scav = mk('scav'), ponco = mk('ponco');
  assert.ok(scav > ponco * 3, `ツギハギ号 ${scav.toFixed(1)} > PONCO02 ${ponco.toFixed(1)} ×3`);
  const sim = createSim({ seed: 2, mission: base({ ally: [{ name: 'X', kind: 'scav', tx: 20, ty: 50, count: 4 }] }) });
  issueOrder(sim, ally(sim).id, [{ tx: 20, ty: 30 }]);
  runSim(sim, sec(1));
  const c0 = ally(sim).cargo; runSim(sim, sec(3));
  assert.equal(ally(sim).cargo, c0, '移動中は増えない');
});

test('脱出: 資材を脱出口に届けて目標に届くと勝ち', () => {
  const sim = createSim({ seed: 3, mission: base() });
  const s = ally(sim);
  issueOrder(sim, s.id, [{ tx: 20, ty: 50 }]);
  assert.ok(runUntil(sim, () => s.cargo >= 30, 120));
  issueOrder(sim, s.id, [{ tx: 20, ty: 40 }]);
  assert.ok(runUntil(sim, () => sim.result, 120), '終わる');
  assert.equal(sim.result, 'win'); assert.equal(sim.resultReason, 'extracted');
  const st = missionStatus(sim);
  assert.ok(st.delivered >= 30 && st.carrying === 0);
});

test('負け: 時間切れ・全滅', () => {
  const a = createSim({ seed: 4, mission: base({ timeLimit: 5 }) });
  runSim(a, sec(6));
  assert.equal(a.result, 'lose'); assert.equal(a.resultReason, 'time');
  const b = createSim({ seed: 4, mission: base() });
  for (const u of b.units) if (u.side === 'ally') u.hp = 0;
  stepSim(b);
  assert.equal(b.result, 'lose'); assert.equal(b.resultReason, 'wiped');
});

const alienMission = over => base({ ally: [{ name: 'S', kind: 'scav', tx: 20, ty: 52, count: 4 }], aliens: [{ name: 'E', kind: 'alien', count: 2, route: [{ tx: 20, ty: 40 }, { tx: 21, ty: 40 }] }], ...over });

test('巡回: 見えていなければ気づかない。近くで見えるとゲージが上がり、満タンで追跡', () => {
  const sim = createSim({ seed: 5, mission: alienMission() });
  const e = patrol(sim);
  runSim(sim, sec(5));
  assert.equal(e.alert, 0); assert.equal(e.ai, 'patrol');
  const pn = plainNear(sim); assert.ok(pn);
  place(sim, ally(sim), pn.tx, pn.ty);
  runSim(sim, sec(1));
  assert.ok(e.alert > 0 && e.alert < 1, `ゲージは少しずつ上がる (${e.alert.toFixed(2)})`);
  assert.ok(runUntil(sim, () => e.ai === 'chase', 6), '追跡に変わる');
  assert.equal(e.speedMul, ALERT.chaseMul);
});

test('巡回: 見失ってしばらくすると、あきらめて巡回路へ戻る', () => {
  const sim = createSim({ seed: 6, mission: alienMission() });
  const e = patrol(sim), s = ally(sim), pn = plainNear(sim);
  place(sim, s, pn.tx, pn.ty);
  assert.ok(runUntil(sim, () => e.ai === 'chase', 8));
  place(sim, s, 5, 57); // 遠くへ
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
  const e = patrol(sim), s = ally(sim), m = sim.map;
  let ft = null;
  for (let y = 5; y < m.h - 5 && !ft; y++) for (let x = 5; x < m.w - 5 && !ft; x++) if ([0, 1, 2, 3].every(d => tileAt(m, x + d, y) === T.FOREST)) ft = { x, y };
  assert.ok(ft, '森がある');
  const a = squadCommander(sim, e);
  a.x = tileCenter(ft.x) - 3 * 32; a.y = tileCenter(ft.y); // 森の端から3タイル（見える距離は4）
  for (const u of squadUnits(sim, e)) if (u !== a) { u.x = a.x; u.y = a.y; }
  for (const u of squadUnits(sim, s)) { u.x = tileCenter(ft.x); u.y = tileCenter(ft.y); }
  assert.equal(groupSees(sim, e), null, '森の中は3タイルでは見えない');
  for (const u of squadUnits(sim, s)) { u.x = a.x + 3 * 32; u.y = a.y - 0.5 * 32; }
  if (tileAt(m, Math.floor((a.x + 96) / 32), Math.floor((a.y - 16) / 32)) !== T.FOREST) assert.ok(groupSees(sim, e), '森の外なら見える');
});

test('異星生物: 撃たれるとすぐ追跡・攻撃されなければ少しずつ再生する', () => {
  const sim = createSim({ seed: 8, mission: alienMission({ ally: [{ name: 'P', kind: 'ponco', tx: 20, ty: 56, count: 1 }] }) });
  const e = patrol(sim), a = squadCommander(sim, e);
  a.hp = a.maxHp * 0.5; a.lastHit = sim.time;
  runSim(sim, sec(ALERT.regenDelay - 1));
  assert.equal(a.hp, a.maxHp * 0.5, '撃たれた直後は再生しない');
  runSim(sim, sec(5));
  assert.ok(a.hp > a.maxHp * 0.5 && a.hp <= a.maxHp, '再生する');
  // PONCO02 を射程内（遠くて見えない位置ではない）に置いて撃たせる
  const p = squadCommander(sim, ally(sim));
  p.x = a.x; p.y = a.y + 100;
  assert.ok(runUntil(sim, () => e.ai === 'chase', 3), '撃たれると追跡');
});

test('ツギハギ号: 移動命令中は撃ち合いで止まらない（逃げられる）', () => {
  const sim = createSim({ seed: 9, mission: alienMission() });
  const s = ally(sim);
  place(sim, s, 20, 41);
  runSim(sim, sec(0.5));
  issueOrder(sim, s.id, [{ tx: 20, ty: 56 }]);
  const c = squadCommander(sim, s), y0 = c.y;
  runSim(sim, sec(3));
  assert.ok(!s.engaged, '交戦扱いにならない');
  assert.ok(squadCommander(sim, s).y > y0 + 30, '下がっている');
});

test('再現性: ミッションも同じ seed・同じ命令なら同じ結果', () => {
  const play = seed => {
    const sim = createSim({ seed, mission: MISSION_1 });
    issueOrder(sim, 'a1', [{ tx: 8, ty: 42 }]); issueOrder(sim, 'a2', [{ tx: 12, ty: 44 }]);
    runSim(sim, sec(60));
    issueOrder(sim, 'a1', [{ tx: 20, ty: 4 }]);
    runSim(sim, sec(60));
    return sim;
  };
  const a = play(11), b = play(11);
  assert.equal(hashSim(a), hashSim(b));
  assert.equal(missionStatus(a).delivered, missionStatus(b).delivered);
});
