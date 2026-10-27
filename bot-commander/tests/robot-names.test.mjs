import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, deployUnit, runSim, hashSim, hashSimDeep } from '../js/sim/sim.js?v=29';
import { MISSION_1 } from '../js/sim/mission.js?v=10';
import { createRecorder, makeStart, openReplay } from '../js/sim/replay.js?v=12';
import { ROBOT_NAMES, NAME_LETTERS, registerRobotName, robotNameOf, robotEventName, splitRobotName, robotNameHtml, robotTextHtml } from '../js/names/robot-names.js?v=1';
import { createUnitStats, statsHtml } from '../js/stats/unit-stats.js?v=3';
const empty = seed => createSim({ seed, setup: { ally: [], enemy: [] } });
const add = (sim, opts = {}) => deployUnit(sim, 'gunner', { tx: 20, ty: 50 }, { aiAlly: true, ...opts });
const names = sim => sim.units.filter(u => u.side === 'ally').map(u => robotNameOf(sim, u));

test('名前は固定42語・I/Oを除く24文字と1〜99の型番', () => {
  assert.equal(ROBOT_NAMES.length, 42); assert.equal(new Set(ROBOT_NAMES).size, 42);
  assert.equal(NAME_LETTERS.length, 24); assert.doesNotMatch(NAME_LETTERS, /[IO]/);
  const sim = empty(9);
  for (let i = 0; i < 1000; i++) {
    const n = robotNameOf(sim, add(sim)); const p = splitRobotName(n);
    assert.ok(p); assert.ok(ROBOT_NAMES.includes(p.common)); assert.match(p.code, /^[A-HJ-NP-Z]{2}-[1-9][0-9]?$/);
  }
  assert.equal(new Set(names(sim)).size, 1000);
});
test('初めの42機は一般名称も重複せず、43機目以降だけ重なれる', () => {
  const sim = empty(11);
  for (let i = 0; i < 42; i++) add(sim);
  assert.equal(new Set(names(sim).map(n => splitRobotName(n).common)).size, 42);
  add(sim); assert.equal(new Set(names(sim)).size, 43);
});
test('名前専用乱数はsim.rngとMath.randomを呼ばず、入力も変更しない', () => {
  const sim = Object.freeze({ seed: 5, mission: Object.freeze({ id: 'frozen' }), get rng() { throw Error('rng access'); } });
  const u = Object.freeze({ id: 1, side: 'ally', kind: 'ponco', label: 'PONCO1' });
  const old = Math.random; Math.random = () => { throw Error('Math.random'); };
  try { registerRobotName(sim, u); assert.ok(splitRobotName(robotNameOf(sim, u))); } finally { Math.random = old; }
  assert.equal(u.label, 'PONCO1');
});
test('同じseed・同じミッションなら同じ名前、表示を読む順と頻度には依存しない', () => {
  const a = createSim({ seed: 12, mission: MISSION_1 }), b = createSim({ seed: 12, mission: MISSION_1 });
  for (const u of [...b.units].reverse()) { robotNameOf(b, u); robotNameOf(b, u); }
  assert.deepEqual(names(a), names(b));
  assert.notDeepEqual(names(a), names(createSim({ seed: 13, mission: MISSION_1 })));
  const c = empty(12); add(c); assert.notEqual(robotNameOf(c, c.units[0]), names(a)[0]);
});
test('増援、戦没、機体の状態変化でも名前を保持し、再利用しない', () => {
  const sim = empty(3), first = add(sim), name = robotNameOf(sim, first);
  first.kind = 'heavy'; first.cls = 'repairer'; first.hp = 1; assert.equal(robotNameOf(sim, first), name);
  sim.units.length = 0;
  assert.equal(robotEventName(sim, first.id), name);
  const later = add(sim); assert.notEqual(robotNameOf(sim, later), name);
  for (let i = 0; i < 100; i++) add(sim);
  assert.equal(robotEventName(sim, first.id), name);
});
test('人間・明示labelの物語キャラ・発射台・敵は元のlabel、labelが自動名に似ても保持', () => {
  const sim = empty(6);
  for (const [kind, label] of [['boy', null], ['girl', 'ミント'], ['gunner', 'ネジ'], ['gunner', '射撃1'], ['wolf', 'ロウ'], ['launcher', null]]) {
    if (kind === 'wolf') { // ロウの種類はstory2の登録に依存せず資格判定を直接確認
      const u = { id: 999, side: 'ally', kind, label }; registerRobotName(sim, u, label); assert.equal(robotNameOf(sim, u), label); continue;
    }
    const u = deployUnit(sim, kind, { tx: 20, ty: 50 }, { label, aiAlly: true });
    assert.equal(robotNameOf(sim, u), u.label);
  }
  const enemy = { id: 777, side: 'enemy', kind: 'gunner', label: '敵' };
  registerRobotName(sim, enemy); assert.equal(robotNameOf(sim, enemy), '敵');
  assert.ok(splitRobotName(robotNameOf(sim, add(sim))));
});
test('リプレイの実際の記録・再生で全機の名前とハッシュが同じ', () => {
  const sim = createSim({ seed: 7, mission: MISSION_1 });
  const rec = createRecorder(sim, makeStart({ seed: 7, mission: MISSION_1 }));
  const initial = names(sim); for (let i = 0; i < 350; i++) rec.step();
  const replay = openReplay(JSON.parse(JSON.stringify(rec.snapshot()))); assert.ok(replay.ok, replay.reason);
  assert.deepEqual(names(replay.sim), initial); assert.equal(replay.player.runAll().match, true);
  assert.deepEqual(names(replay.sim), names(sim)); assert.equal(hashSimDeep(replay.sim), hashSimDeep(sim));
});
test('表示名を何度読んでもseed1〜5の300tickハッシュは指定値のまま', () => {
  const expected = ['6cc93eb6', '2a60b985', '24994a28', '5558d677', '6e46d4aa'];
  for (let seed = 1; seed <= 5; seed++) {
    const sim = createSim({ seed, mission: MISSION_1 }); const rng = sim.rng.state(); names(sim); assert.equal(sim.rng.state(), rng);
    runSim(sim, 300); names(sim); assert.equal(hashSim(sim), expected[seed - 1]);
  }
});
test('長い名前は一般名称と型番を分け、型番の全桁とHTMLエスケープを保持', () => {
  assert.deepEqual(splitRobotName('アンゼンダイイチRK-3'), { common: 'アンゼンダイイチ', code: 'RK-3', long: true });
  assert.equal(splitRobotName('偽名IO-0'), null);
  assert.match(robotNameHtml('アンゼンダイイチRK-3'), /bc-robot-name long/);
  assert.match(robotNameHtml('アンゼンダイイチRK-3'), /bc-robot-code">RK-3<\/span>/);
  assert.match(robotTextHtml('アンゼンダイイチRK-3：敵を発見！'), /bc-robot-code">RK-3/);
  assert.equal(robotTextHtml('<img onerror="bad">'), '&lt;img onerror=&quot;bad&quot;&gt;');
});
test('現在・結果の成績とMVPには同一の表示名、長い名前は分割マークアップ', () => {
  const sim = empty(1), u = add(sim); const stats = createUnitStats({ nameOf: x => robotNameOf(sim, x) });
  stats.observe(sim); sim.fx.push({ type: 'shot', from: u.id, to: 99, toSide: 'enemy', dmg: 20, kill: true }); stats.observe(sim);
  const sum = stats.summary(); assert.equal(sum.rows[0].name, robotNameOf(sim, u)); assert.equal(sum.mvp.kills.name, robotNameOf(sim, u));
  sum.rows[0].name = 'アンゼンダイイチRK-3'; sum.mvp.kills.name = 'アンゼンダイイチRK-3';
  const html = statsHtml(sum); assert.ok(html.split('bc-robot-code">RK-3').length >= 3);
});

// 装備キーと表示名を分けても、出撃前後で同じ機体を指すことを確認。
test('武器庫の旧labelキーは保持され、プレビューと実出撃の名前が一致', async () => {
  const { buildRoster } = await import('../js/armory/loadout.js?v=6');
  const { KINDS } = await import('../js/sim/sim.js?v=29');
  const roster = buildRoster(MISSION_1, KINDS);
  const preview = createSim({ seed: 19, mapSeed: 7, mission: MISSION_1 });
  const real = createSim({ seed: 19, mapSeed: 7, mission: MISSION_1, loadout: {} });
  for (const row of roster) {
    const a = preview.units.find(u => u.side === 'ally' && u.label === row.label);
    const b = real.units.find(u => u.side === 'ally' && u.label === row.label);
    assert.ok(a && b); assert.equal(robotNameOf(preview, a), robotNameOf(real, b));
    assert.equal(a.label, row.label); assert.ok(splitRobotName(robotNameOf(real, b)));
  }
});
test('物語1〜3章の実ミッションで指定labelと物語処理を保持、再生の名前も一致', async () => {
  const { STORY_1 } = await import('../js/story/story-mission.js?v=3');
  const { STORY_2_1, STORY_2_2 } = await import('../js/story/story2-missions.js?v=2');
  const { CHAPTERS } = await import('../js/story/chapters.js?v=1');
  const { registerMission } = await import('../js/sim/replay.js?v=12');
  const missions = [STORY_1, STORY_2_1, STORY_2_2, ...Object.values(CHAPTERS[3].stages).map(s => s.mission)];
  for (const mission of missions) {
    registerMission(mission);
    const sim = createSim({ seed: 5, mission, newEnemies: !!mission.story3 });
    for (const def of mission.ally.filter(d => d.name && (d.count ?? 1) === 1)) {
      const u = sim.units.find(u => u.side === 'ally' && u.label === def.name);
      assert.ok(u, def.name); assert.equal(robotNameOf(sim, u), def.name);
    }
    const rec = createRecorder(sim, makeStart({ seed: 5, mission }));
    for (let i = 0; i < 40; i++) rec.step();
    const o = openReplay(rec.snapshot()); assert.ok(o.ok, o.reason);
    assert.equal(o.player.runAll().match, true); assert.deepEqual(names(o.sim), names(sim));
  }
});
