// 記録と再生（js/sim/replay.js）。同じ seed・同じ命令（動いている時・一時停止中）を記録 → 再生で、毎 marks と end の hashSim・hashSimDeep が同じ。
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, stepSim, hashSim, hashSimDeep, issueOrder, issueAttack, issueStance, issueStop, issueRetreat, applyCommandsNow } from '../js/sim/sim.js?v=30';
import { MISSION_1 } from '../js/sim/mission.js?v=10';
import {
  createRecorder, openReplay, parseReplay, stringifyReplay, makeStart, packCommand, unpackCommand, deviceRecord, compareRecords,
  REPLAY_VERSION, MARK_EVERY,
} from '../js/sim/replay.js?v=19';

const robots = sim => sim.units.filter(u => u.side === 'ally' && !u.human).map(u => u.id);
const enemies = sim => sim.units.filter(u => u.side === 'enemy').map(u => u.id);

/** 決まった遊び方。動いている時の命令と、一時停止中の命令（0 個の呼び出しも）を混ぜる。record=false なら記録なしで同じことをする */
function play(seed, ticks, { record = true } = {}) {
  const start = makeStart({ seed, mapSeed: 7, mission: MISSION_1 });
  const sim = createSim({ seed, mapSeed: 7, mission: MISSION_1 });
  const rec = record ? createRecorder(sim, start) : null;
  const step = () => (rec ? rec.step() : stepSim(sim));
  const now = () => (rec ? rec.applyNow() : applyCommandsNow(sim));
  const all = robots(sim), some = all.slice(0, 4), gun = all.slice(4, 9);
  const script = {
    10: () => issueOrder(sim, some, [{ tx: 20, ty: 40 }]),
    45: () => issueOrder(sim, gun, [{ tx: 15, ty: 45 }, { tx: 25, ty: 38 }], { mode: 'rush' }),
    90: () => { issueStance(sim, gun, 'free'); issueOrder(sim, some, [{ tx: 30, ty: 36 }]); },
    // 一時停止中（時間は進まない）。命令 1 つ・命令なし・続けて 2 回
    120: () => { issueOrder(sim, gun, [{ tx: 12, ty: 30 }]); now(); now(); },
    121: () => { issueStop(sim, some.slice(0, 1)); now(); },
    200: () => { issueRetreat(sim, some.slice(1, 3)); },
    260: () => { issueAttack(sim, gun, enemies(sim)[0]); now(); issueStance(sim, gun, 'hold'); now(); },
    420: () => { issueOrder(sim, some, [{ tx: 8, ty: 42 }]); issueOrder(sim, gun, [{ tx: 32, ty: 38 }]); }, // 動いている時に 2 つ同時
  };
  for (let t = 0; t < ticks; t++) { script[t]?.(); step(); }
  return { sim, rec };
}

test('記録しても、しなくても、結果は同じ（記録はシムを変えない）', () => {
  for (const seed of [1, 2, 3]) {
    const a = play(seed, 700, { record: true }).sim, b = play(seed, 700, { record: false }).sim;
    assert.equal(hashSim(a), hashSim(b), `seed ${seed}`);
    assert.equal(hashSimDeep(a), hashSimDeep(b), `seed ${seed} deep`);
  }
});

test('記録 → 再生: 毎 marks と end の hashSim・hashSimDeep が同じ（seed 1〜4・動いている時と一時停止中を含む）', () => {
  for (const seed of [1, 2, 3, 4]) {
    const { sim, rec } = play(seed, 1000);
    const snap = rec.snapshot();
    assert.equal(snap.marks.length, Math.floor(1000 / MARK_EVERY));
    assert.ok(snap.cmds.some(c => c[1] === 1) && snap.cmds.some(c => c[1] === 0), '両方の命令が記録に入っている');
    const o = openReplay(JSON.parse(JSON.stringify(snap)));
    assert.ok(o.ok, o.reason);
    const rep = o.player.runAll();
    assert.equal(rep.match, true, JSON.stringify(rep.first));
    assert.equal(rep.first, null);
    assert.equal(rep.marksChecked, snap.marks.length);
    assert.deepEqual(rep.marks, snap.marks);
    assert.equal(hashSim(o.sim), hashSim(sim));
    assert.equal(hashSimDeep(o.sim), hashSimDeep(sim));
    assert.equal(rep.end.hash, snap.end.hash); assert.equal(rep.end.deep, snap.end.deep);
  }
});

test('一時停止中の印を落とすと、ずれる（印が効いている）。ずれた最初の所が分かる', () => {
  const { rec } = play(2, 900);
  const snap = rec.snapshot();
  const wrong = JSON.parse(JSON.stringify(snap));
  // 一時停止の命令を「動いている時」の命令にして、命令のない呼び出しは捨てる
  wrong.cmds = wrong.cmds.map(c => (c[1] === 1 && c[2].length ? [c[0], 0, c[2]] : c)).filter(c => c[1] === 0);
  const o = openReplay(wrong); assert.ok(o.ok, o.reason);
  const rep = o.player.runAll();
  assert.equal(rep.match, false);
  assert.ok(rep.first && ['mark', 'end'].includes(rep.first.where));
  assert.ok(rep.first.tick >= 120);
  assert.ok(rep.first.since < rep.first.tick);
});

test('途中のハッシュを1つ書きかえると、その tick が最初にずれた所として出る', () => {
  const snap = play(3, 1000).rec.snapshot();
  const t = JSON.parse(JSON.stringify(snap)); t.marks[1][1] = t.marks[1][1] === 'deadbeef' ? 'cafebabe' : 'deadbeef';
  const rep = openReplay(t).player.runAll();
  assert.equal(rep.match, false);
  assert.deepEqual([rep.first.where, rep.first.tick, rep.first.field, rep.first.since], ['mark', t.marks[1][0], 'hash', t.marks[0][0]]);
  const d = JSON.parse(JSON.stringify(snap)); d.marks[0][2] = '0';
  assert.equal(openReplay(d).player.runAll().first.field, 'deep');
});

test('終わりまで遊んだ記録（結果つき）と、途中で書き出した記録の両方を再生できる', () => {
  // 結果が出るまで流す代わりに、結果を直接つける（終わりの形の確かめ）
  const { sim, rec } = play(1, 400);
  sim.result = 'win'; sim.resultReason = 'extracted';
  rec.step(); // 結果が付いた step で閉じる
  const closed = rec.snapshot();
  assert.equal(closed.end.result, 'win');
  const before = closed.end.tick;
  rec.applyNow(); rec.step();
  assert.equal(rec.snapshot().end.tick, before, '終わったあとの命令・step は記録に入らない');
  const mid = play(1, 500).rec.snapshot();
  assert.equal(mid.end.result, null); assert.equal(mid.end.tick, 500);
  const rep = openReplay(mid).player.runAll();
  assert.equal(rep.match, true, JSON.stringify(rep.first));
});

test('書き出し → 読み込みで同じ記録になる（文字にして、もう一度文字にしても同じ）', () => {
  const snap = play(5, 800).rec.snapshot();
  const text = stringifyReplay(snap);
  const p = parseReplay(text);
  assert.ok(p.ok, p.reason);
  assert.deepEqual(p.rec, snap);
  assert.equal(stringifyReplay(p.rec), text);
  assert.ok(text.length < 8000, `小さい: ${text.length} 文字`);
  assert.equal(openReplay(text).player.runAll().match, true);
});

test('命令の短い形は元に戻る（知らない種類の命令もそのまま）', () => {
  const cmds = [
    { type: 'move', unitIds: [1, 2], waypoints: [{ tx: 3, ty: 4 }, { tx: 5, ty: 6 }], mode: 'rush' },
    { type: 'move', unitIds: [7], waypoints: [{ tx: 9, ty: 9 }], mode: 'fight' },
    { type: 'attack', unitIds: [1], targetId: 30 }, { type: 'stance', unitIds: [2], stance: 'free' }, { type: 'stance', unitIds: [2], stance: 'hold' },
    { type: 'stop', unitIds: [3] }, { type: 'retreat', unitIds: [4, 5] }, { type: 'board', unitIds: [1], humanId: 20 },
  ];
  for (const c of cmds) assert.deepEqual(unpackCommand(JSON.parse(JSON.stringify(packCommand(c)))), c);
});

test('こわれた記録・版のちがう記録は、止まらずに理由をつけて断る', () => {
  const good = play(1, 400).rec.snapshot();
  const clone = () => JSON.parse(JSON.stringify(good));
  const cases = [
    ['', '空'], ['{', 'JSON'], ['[]', '形'], ['null', '形'], ['123', '形'],
    [JSON.stringify({ ...clone(), v: 2 }), '版'], [JSON.stringify({ ...clone(), game: 'iron-squad' }), 'ゲーム'],
    [JSON.stringify({ ...clone(), start: null }), '始まり'], [JSON.stringify({ ...clone(), start: { ...good.start, mission: 'zzz' } }), 'ミッション'],
    [JSON.stringify({ ...clone(), start: { ...good.start, seed: 'x' } }), 'seed'],
    [JSON.stringify({ ...clone(), end: { ...good.end, tick: -1 } }), 'tick'], [JSON.stringify({ ...clone(), end: { ...good.end, hash: 'xyz' } }), 'ハッシュ'],
    [JSON.stringify({ ...clone(), cmds: 5 }), '命令'], [JSON.stringify({ ...clone(), cmds: [[5, 0, [['q', [1]]]]] }), '命令'],
    [JSON.stringify({ ...clone(), cmds: [[5, 0, [['o', [1], 'f', [1]]]]] }), '行き先'],
    [JSON.stringify({ ...clone(), cmds: [[50, 0, [['x', [1]]]], [40, 0, [['x', [1]]]]] }), '戻って'],
    [JSON.stringify({ ...clone(), cmds: [[9999, 0, [['x', [1]]]]] }), '後'],
    [JSON.stringify({ ...clone(), marks: 'x' }), 'marks'], [JSON.stringify({ ...clone(), marks: [[300, 'zz', 'zz']] }), 'marks'],
  ];
  for (const [text, word] of cases) {
    let r; assert.doesNotThrow(() => { r = parseReplay(text); }, text.slice(0, 40));
    assert.equal(r.ok, false, text.slice(0, 60));
    assert.ok(r.reason.includes(word), `${r.reason} に「${word}」`);
    assert.equal(openReplay(text).ok, false);
  }
  assert.equal(parseReplay('x'.repeat(5 * 1024 * 1024)).ok, false);
  // 命令の機体の番号がでたらめでも、止まらずに再生が終わる
  const wild = clone(); wild.cmds = [[20, 0, [['o', [99999, -3], 'f', [5, 5]]]], [30, 0, [['a', [1], 99999]]]];
  const rep = openReplay(wild).player.runAll(); assert.ok(rep.done);
  // 版（gameVersion）が違うだけなら読める（知らせだけ）
  const old = clone(); old.gameVersion = '0.0.1';
  const p = parseReplay(old); assert.ok(p.ok); assert.equal(p.notes.length, 1);
});

test('再生中は、プレイヤーの命令を受けない（見るだけ）', () => {
  const snap = play(2, 700).rec.snapshot();
  const o = openReplay(snap);
  const ids = robots(o.sim);
  for (let n = 0; n < 700; n++) { issueOrder(o.sim, ids, [{ tx: 3, ty: 3 }]); issueRetreat(o.sim, ids); o.player.step(); }
  assert.equal(o.player.report().match, true);
});

test('2 つの記録のハッシュを比べる（同じなら同じ・ずれたら最初の tick）', () => {
  const snap = play(4, 1000).rec.snapshot();
  const rep = openReplay(snap).player.runAll();
  const dev = deviceRecord(snap, rep, 'テスト');
  assert.deepEqual(compareRecords(snap, dev), { same: true, startSame: true, first: null, compared: snap.marks.length + 1 });
  assert.equal(dev.meta.replayedOn, 'テスト');
  const other = JSON.parse(JSON.stringify(dev)); other.marks[2][2] = 'ffffffff';
  const c = compareRecords(snap, other);
  assert.equal(c.same, false); assert.deepEqual([c.first.tick, c.first.field, c.first.since], [snap.marks[2][0], 'deep', snap.marks[1][0]]);
  const e = JSON.parse(JSON.stringify(dev)); e.end.hash = '1';
  assert.deepEqual([compareRecords(snap, e).first.field, compareRecords(snap, e).first.tick], ['hash', 1000]);
});

test('主局面（MISSION_1・seed 1〜5・300 tick）は、記録して再生しても hashSim が今までの値のまま', () => {
  const want = ['6cc93eb6', '2a60b985', '24994a28', '5558d677', '6e46d4aa']; // v0.4.13: 機体ごとの盾の表（shield-table.js）で新しい値に。前の表で前の値に戻ることは shield-table.test.mjs
  for (let seed = 1; seed <= 5; seed++) {
    const sim = createSim({ seed, mission: MISSION_1 });
    const rec = createRecorder(sim, makeStart({ seed }));
    for (let i = 0; i < 300; i++) rec.step();
    assert.equal(hashSim(sim), want[seed - 1]);
    const o = openReplay(rec.snapshot()); assert.equal(o.player.runAll().match, true);
    assert.equal(hashSim(o.sim), want[seed - 1]);
  }
});

test('記録の形の版は 1', () => assert.equal(REPLAY_VERSION, 1));
