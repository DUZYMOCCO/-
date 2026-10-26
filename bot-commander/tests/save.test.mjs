// セーブ（js/save/save.js・records-view.js）: 読み書き・記録の足し方・解放・こわれたデータ・localStorage がない時・消す。画面は使わない（偽の入れ物を渡す）。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SAVE_KEY, BROKEN_KEY, START_UNLOCKED, emptySave, sanitizeSave, parseSave, isBetterBest, applyMissionResult, createSaveStore, shouldRecord,
  cleanOwned, ownedSummary, planLegacyMove, OWNED_KEY_READONLY, ARMORY_KEY_READONLY, LEGACY_TUTORIAL_KEY,
} from '../js/save/save.js?v=5';
import { recordsHtml, fmtClock } from '../js/save/records-view.js?v=5';
import { WEAPONS } from '../js/sim/weapons.js?v=7';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** 偽の localStorage。文字列だけを持つ */
function fakeIo(init = {}, opts = {}) {
  const m = new Map(Object.entries(init));
  return {
    m,
    get(k) { if (opts.throwOnGet) throw new Error('no storage'); return m.has(k) ? m.get(k) : null; },
    set(k, t) { if (opts.throwOnSet) throw new Error('quota'); m.set(k, t); return true; },
    remove(k) { m.delete(k); return true; },
  };
}
const win = (o = {}) => ({ id: 'm1', win: true, time: 412.34, delivered: 120, lost: 1, now: '2026-10-25T10:00:00.000Z', ...o });

test('はじめて: 空のセーブが返り、まだ何も書かない', () => {
  const io = fakeIo(); const s = createSaveStore(io);
  assert.deepEqual(s.load(), emptySave());
  assert.equal(io.m.size, 0);
});

test('勝ちを記録: plays・wins・cleared・best・firstClearAt が入り、保存される', () => {
  const io = fakeIo(); const s = createSaveStore(io);
  const r = s.recordMissionResult(win());
  assert.equal(r.firstClear, true); assert.equal(r.newBest, true);
  assert.deepEqual(s.getMissionRecord('m1'), { cleared: true, plays: 1, wins: 1, best: { time: 412.3, delivered: 120, lost: 1 }, firstClearAt: '2026-10-25T10:00:00.000Z' });
  assert.deepEqual(JSON.parse(io.m.get(SAVE_KEY)).missions.m1.best, { time: 412.3, delivered: 120, lost: 1 });
  assert.equal(createSaveStore(io).getMissionRecord('m1').wins, 1, '読み直しても同じ');
});

test('負けは回数だけ。クリアも best も変わらない', () => {
  const s = createSaveStore(fakeIo());
  const r = s.recordMissionResult(win({ win: false, time: 100 }));
  assert.equal(r.firstClear, false); assert.equal(r.newBest, false);
  assert.deepEqual(s.getMissionRecord('m1'), { cleared: false, plays: 1, wins: 0, best: null, firstClearAt: null });
  s.recordMissionResult(win()); s.recordMissionResult(win({ win: false }));
  const m = s.getMissionRecord('m1');
  assert.equal(m.plays, 3); assert.equal(m.wins, 1); assert.equal(m.cleared, true);
  assert.equal(m.best.time, 412.3, '負けは best を壊さない');
});

test('一番よい記録: 早いほうが勝ち。同じ早さなら資材が多い・失ったロボが少ない。firstClearAt は最初のまま', () => {
  const s = createSaveStore(fakeIo());
  s.recordMissionResult(win({ time: 300 }));
  assert.equal(s.recordMissionResult(win({ time: 400, now: '2026-11-01T00:00:00Z' })).newBest, false);
  assert.equal(s.recordMissionResult(win({ time: 250, delivered: 100, lost: 3 })).newBest, true);
  assert.deepEqual(s.getMissionRecord('m1').best, { time: 250, delivered: 100, lost: 3 });
  assert.equal(s.getMissionRecord('m1').firstClearAt, '2026-10-25T10:00:00.000Z');
  assert.equal(isBetterBest({ time: 250, delivered: 110, lost: 3 }, { time: 250, delivered: 100, lost: 3 }), true);
  assert.equal(isBetterBest({ time: 250, delivered: 100, lost: 2 }, { time: 250, delivered: 100, lost: 3 }), true);
  assert.equal(isBetterBest({ time: 250, delivered: 100, lost: 3 }, { time: 250, delivered: 100, lost: 3 }), false);
});

test('別のミッションは別に数える。id や時間が変な結果は足さない／best にしない', () => {
  const s = createSaveStore(fakeIo());
  s.recordMissionResult(win()); s.recordMissionResult(win({ id: 'story_1', win: false }));
  assert.equal(s.getMissionRecord('story_1').plays, 1); assert.equal(s.getMissionRecord('m1').plays, 1);
  const before = JSON.stringify(s.load());
  for (const id of [undefined, '', 5, '__proto__', 'x'.repeat(65)]) s.recordMissionResult(win({ id }));
  assert.equal(JSON.stringify(s.load()), before);
  const r = s.recordMissionResult(win({ time: NaN }));
  assert.equal(r.newBest, false); assert.equal(s.getMissionRecord('m1').wins, 2, '勝ち自体は数える');
});

test('applyMissionResult は元のセーブを書きかえない', () => {
  const a = emptySave(); const snap = JSON.stringify(a);
  applyMissionResult(a, win());
  assert.equal(JSON.stringify(a), snap);
});

test('解放: 今は最初から全部使える。解放の入口は新しい物だけ true', () => {
  const s = createSaveStore(fakeIo());
  for (const k of ['scav', 'ponco', 'boy', 'girl']) assert.equal(s.isUnitUnlocked(k), true);
  assert.equal(s.isWeaponUnlocked(WEAPONS[0].id), true);
  assert.equal(START_UNLOCKED.weapons.length, WEAPONS.length);
  assert.equal(s.isUnitUnlocked('flyer_x'), false);
  assert.equal(s.unlockUnit('flyer_x'), true); assert.equal(s.unlockUnit('flyer_x'), false);
  assert.equal(s.isUnitUnlocked('flyer_x'), true); assert.equal(s.isUnlocked('unit', 'flyer_x'), true);
  assert.equal(s.unlockWeapon('W9-99'), true); assert.equal(s.isWeaponUnlocked('W9-99'), true);
  assert.equal(s.unlockUnit('scav'), false, 'もう使える物は足さない');
  assert.equal(s.unlockUnit(''), false); assert.equal(s.unlockWeapon(null), false);
  assert.equal(s.isUnlocked('nothing', 'scav'), false);
  assert.ok(s.unlockedLists().units.includes('flyer_x'));
  assert.deepEqual(s.load().unlocked, { units: ['flyer_x'], weapons: ['W9-99'] }, '保存には最初から使える物は入れない');
});

test('物語の場所: chapter と flags。flags は混ぜる・null で消す・変な値は捨てる', () => {
  const io = fakeIo(); const s = createSaveStore(io);
  assert.deepEqual(s.getStoryState(), { chapter: 0, flags: {} });
  s.setStoryState({ chapter: 2, flags: { metBoy: true, name: 'ミント' } });
  s.setStoryState({ flags: { n: 3, metBoy: null } });
  assert.deepEqual(s.getStoryState(), { chapter: 2, flags: { name: 'ミント', n: 3 } });
  s.setStoryState({ chapter: -5, flags: { bad: { a: 1 }, __proto__x: 1 } });
  assert.equal(s.getStoryState().chapter, 0); assert.equal(s.getStoryState().flags.bad, undefined);
  const copy = s.getStoryState(); copy.flags.zzz = 1;
  assert.equal(s.getStoryState().flags.zzz, undefined, '返り値を直しても中身は変わらない');
  assert.deepEqual(createSaveStore(io).getStoryState(), s.getStoryState());
});

test('こわれたデータ: 読めない JSON は元の文字列を別のキーに残し、ふつうの値で始まる', () => {
  for (const bad of ['{not json', '[1,2]', '"x"', '123', 'null', '']) {
    const io = fakeIo({ [SAVE_KEY]: bad }); const s = createSaveStore(io);
    assert.deepEqual(s.load(), emptySave(), bad);
    if (bad !== '') assert.equal(io.m.get(BROKEN_KEY), bad, `${bad} を残した`);
    assert.doesNotThrow(() => s.recordMissionResult(win()));
  }
});

test('こわれたデータ: 元の文字列を残すのは 1 つだけ（2 回目は上書きしない）', () => {
  const io = fakeIo({ [SAVE_KEY]: '{bad1' }); createSaveStore(io).load();
  io.m.set(SAVE_KEY, '{bad2'); createSaveStore(io).load();
  assert.equal(io.m.get(BROKEN_KEY), '{bad1');
});

test('こわれたデータ: 形がちがう所だけ捨て、無事な所は残す', () => {
  const io = fakeIo({ [SAVE_KEY]: JSON.stringify({
    v: 1,
    missions: { m1: { cleared: true, plays: 'many', wins: 2, best: { time: 'fast', delivered: 5 }, firstClearAt: 'いつか' }, m2: 'x', m3: { plays: -4, wins: 1e99 } },
    unlocked: { units: ['scav', 7, 'scav', null], weapons: 'all' }, story: { chapter: 'two', flags: { a: 1, b: [1], c: null } },
  }) });
  const s = createSaveStore(io); const d = s.load();
  assert.deepEqual(d.missions.m1, { cleared: true, plays: 2, wins: 2, best: null, firstClearAt: null });
  assert.equal(d.missions.m2, undefined);
  assert.equal(d.missions.m3.wins, 1e9);
  assert.deepEqual(d.unlocked, { units: ['scav'], weapons: [] });
  assert.deepEqual(d.story, { chapter: 0, flags: { a: 1 } });
  assert.ok(io.m.has(BROKEN_KEY), '元の文字列を残した');
  assert.deepEqual(JSON.parse(io.m.get(SAVE_KEY)), d, '直した形で書き戻した');
});

test('知らない版・v がない: 直せる所は使い、元の文字列を残す', () => {
  for (const v of [undefined, 0, 2, '1', null]) {
    const io = fakeIo({ [SAVE_KEY]: JSON.stringify({ v, missions: { m1: { cleared: true, plays: 4, wins: 2, best: { time: 99, delivered: 100, lost: 0 }, firstClearAt: '2026-10-25T00:00:00Z' } } }) });
    const s = createSaveStore(io);
    assert.equal(s.getMissionRecord('m1').plays, 4, `v=${v}`);
    assert.ok(io.m.has(BROKEN_KEY), `v=${v} を残した`);
    assert.equal(JSON.parse(io.m.get(SAVE_KEY)).v, 1);
  }
});

test('きれいなデータは「こわれた」と見なさない（元の文字列を残さない）', () => {
  const io = fakeIo(); const s = createSaveStore(io);
  s.recordMissionResult(win()); s.unlockUnit('x1'); s.setStoryState({ chapter: 1, flags: { a: true } });
  const io2 = fakeIo({ [SAVE_KEY]: io.m.get(SAVE_KEY) }); createSaveStore(io2).load();
  assert.equal(io2.m.has(BROKEN_KEY), false);
  assert.equal(parseSave(io.m.get(SAVE_KEY)).broken, false);
  assert.equal(parseSave(null).broken, false);
});

test('__proto__ などの名前は捨てる（prototype 汚染なし）', () => {
  const t = '{"v":1,"missions":{"__proto__":{"plays":3},"ok":{"plays":1}},"story":{"chapter":0,"flags":{"__proto__":1}}}';
  const { save } = parseSave(t);
  assert.deepEqual(Object.keys(save.missions), ['ok']);
  assert.equal({}.plays, undefined);
  assert.equal(sanitizeSave(JSON.parse(t)).missions.plays, undefined);
});

test('localStorage が使えない時: 例外が出ても止まらず、その回の間だけ覚える', () => {
  const s = createSaveStore(fakeIo({}, { throwOnGet: true, throwOnSet: true }));
  assert.doesNotThrow(() => s.load());
  assert.doesNotThrow(() => s.recordMissionResult(win()));
  assert.equal(s.getMissionRecord('m1').plays, 1);
  assert.equal(s.saveNow(), false);
  assert.doesNotThrow(() => { s.unlockUnit('q'); s.setStoryState({ chapter: 1 }); s.resetSave(); s.readOwnedWeapons(); });
  // 入れ物が空っぽ（localStorage がない環境）でも
  const none = createSaveStore({ get: () => null, set: () => false, remove: () => false });
  assert.doesNotThrow(() => none.recordMissionResult(win()));
  assert.equal(none.getMissionRecord('m1').wins, 1);
});

test('記録を消す（v1.0.0）: bc-save-v1・武器庫の選び・拾った武器・古いチュートリアルの印が消える。こわれた物の控えは残る', () => {
  const io = fakeIo({ [ARMORY_KEY_READONLY]: '{"v":1,"loadout":{}}', [OWNED_KEY_READONLY]: '{"W1-01":2}', [BROKEN_KEY]: 'old' });
  const s = createSaveStore(io);
  s.recordMissionResult(win()); s.unlockUnit('x1'); s.setTutorialMark('done');
  assert.ok(io.m.has(SAVE_KEY));
  io.m.set(LEGACY_TUTORIAL_KEY, '{"v":1,"state":"skipped"}'); // 移したあとに古い印がまた置かれていても
  s.resetSave();
  assert.equal(io.m.has(SAVE_KEY), false);
  assert.deepEqual(s.load(), emptySave());
  assert.equal(s.getTutorialMark(), null, 'チュートリアルの印も消える');
  assert.equal(io.m.has(ARMORY_KEY_READONLY), false, '武器庫の選び');
  assert.equal(io.m.has(OWNED_KEY_READONLY), false, '拾った武器');
  assert.equal(io.m.has(LEGACY_TUTORIAL_KEY), false);
  assert.deepEqual(s.readOwnedWeapons(), {});
  assert.equal(io.m.get(BROKEN_KEY), 'old');
  assert.ok(START_UNLOCKED.units.every(k => s.isUnitUnlocked(k)), '消しても全部使える');
  s.recordMissionResult(win()); assert.equal(s.getMissionRecord('m1').plays, 1, '消したあとも記録できる');
});

test('拾った武器・武器庫は読むだけ: 書きかえない・形が変でも止まらない', () => {
  const io = fakeIo({ [OWNED_KEY_READONLY]: '{"W1-01":2,"W1-02":1.9,"bad":"x","neg":-1}', [ARMORY_KEY_READONLY]: '{"v":1,"loadout":{"a":1}}' });
  const s = createSaveStore(io);
  assert.deepEqual(s.readOwnedWeapons(), { 'W1-01': 2, 'W1-02': 1 });
  s.recordMissionResult(win()); s.unlockWeapon('Z');
  assert.equal(io.m.get(OWNED_KEY_READONLY), '{"W1-01":2,"W1-02":1.9,"bad":"x","neg":-1}', '書きかえていない');
  assert.equal(io.m.get(ARMORY_KEY_READONLY), '{"v":1,"loadout":{"a":1}}');
  assert.deepEqual(createSaveStore(fakeIo({ [OWNED_KEY_READONLY]: '{oops' })).readOwnedWeapons(), {});
  assert.deepEqual(ownedSummary({ a: 2, b: 3 }), { kinds: 2, total: 5 });
  assert.deepEqual(ownedSummary(null), { kinds: 0, total: 0 });
  assert.deepEqual(cleanOwned([1]), {});
});

test('移しかえの案 planLegacyMove: 古い 2 つのキーの行き先を作るだけ（入れ物は触らない）', () => {
  assert.deepEqual(planLegacyMove({ 'W1-01': 2, bad: 'x' }, { v: 1, loadout: { scav: 1 } }), { inventory: { weapons: { 'W1-01': 2 } }, loadout: { scav: 1 } });
  assert.deepEqual(planLegacyMove(null, 5), { inventory: { weapons: {} }, loadout: {} });
});

test('記録するのは本番の始まり方だけ: お試しの URL では記録しない', () => {
  for (const q of ['', '?', '?fx=low', '?ground=oblique&human=oblique']) assert.equal(shouldRecord(q), true, q);
  for (const q of ['?altdemo=1', '?dialogdemo=1', '?chardemo=1', '?armory=1', '?seed=3', '?map=2', '?story=1', '?fx=low&tutorial=1']) assert.equal(shouldRecord(q), false, q);
});

test('記録の画面の中身: クリア・回数・一番よい・解放・拾った武器が出る。名前は HTML として安全', () => {
  const save = sanitizeSave({ v: 1, missions: { m1: { cleared: true, plays: 3, wins: 1, best: { time: 412.3, delivered: 120, lost: 1 }, firstClearAt: '2026-10-25T00:00:00Z' } } });
  const html = recordsHtml(save, { m1: '資材集め', m2: '<b>x</b>' }, { 'W1-01': 2, 'W1-02': 1 }, { units: ['a', 'b'], weapons: ['c'] });
  assert.match(html, /資材集め/); assert.match(html, /クリア/); assert.match(html, /3回あそんだ・1回かった/);
  assert.match(html, /6:52/); assert.match(html, /資材 120/); assert.match(html, /失った 1機/); assert.match(html, /2種・3個/);
  assert.match(html, /&lt;b&gt;x&lt;\/b&gt;/); assert.match(html, /まだ/);
  assert.equal(fmtClock(412.3), '6:52'); assert.equal(fmtClock(-1), '0:00');
});

test('つなぎこみ: sim は記録を知らない。index.js は結果の時に 1 回だけ記録し、メニューに「記録」を足す', () => {
  const sim = readFileSync(join(ROOT, 'js/sim/sim.js'), 'utf8');
  assert.doesNotMatch(sim, /bc-save|js\/save|recordMissionResult/);
  const idx = readFileSync(join(ROOT, 'js/index.js'), 'utf8');
  assert.match(idx, /import \{ recordMissionResult, shouldRecord, tutorialMarkStore, SAVE_FAIL_TEXT \} from '\.\/save\/save\.js\?v=\d+'/);
  assert.match(idx, /class="bc-menu-records">記録</);
  assert.match(idx, /this\.recordedSim === sim/);
  const sw = readFileSync(join(ROOT, 'sw-assets.js'), 'utf8');
  for (const f of ['js/save/save.js', 'js/save/records-view.js', 'css/save.css']) assert.ok(sw.includes(`'${f}'`), `${f} が sw-assets.js にある`);
});

test('一番よい記録（v1.0.0）: 残った数が多いほうが勝ち。同じなら早いほう。残った数のない古い記録は 0 として比べる', () => {
  assert.equal(isBetterBest({ time: 500, delivered: 100, lost: 0, survivors: 9 }, { time: 300, delivered: 100, lost: 0, survivors: 8 }), true, '遅くても多く残った');
  assert.equal(isBetterBest({ time: 200, delivered: 100, lost: 0, survivors: 7 }, { time: 300, delivered: 100, lost: 0, survivors: 8 }), false, '早くても少ない');
  assert.equal(isBetterBest({ time: 250, delivered: 100, lost: 0, survivors: 8 }, { time: 300, delivered: 100, lost: 0, survivors: 8 }), true, '同じ数なら早いほう');
  assert.equal(isBetterBest({ time: 999, delivered: 100, lost: 0, survivors: 1 }, { time: 100, delivered: 100, lost: 0 }), true, '古い記録（数なし）');
  const s = createSaveStore(fakeIo());
  s.recordMissionResult(win({ time: 300, survivors: 6 }));
  s.recordMissionResult(win({ time: 200, survivors: 5 }));
  assert.equal(s.getMissionRecord('m1').best.survivors, 6);
  assert.equal(s.getMissionRecord('m1').best.time, 300);
  s.recordMissionResult(win({ time: 400, survivors: 7 }));
  assert.deepEqual([s.getMissionRecord('m1').best.survivors, s.getMissionRecord('m1').best.time], [7, 400]);
  // 古い版の記録（survivors なし）はこわれた扱いにならない
  const old = JSON.stringify({ ...emptySave(), missions: { m1: { cleared: true, plays: 1, wins: 1, best: { time: 99, delivered: 100, lost: 0 }, firstClearAt: '2026-10-25T00:00:00.000Z' } } });
  const io = fakeIo({ [SAVE_KEY]: old }); createSaveStore(io).load();
  assert.equal(io.m.has(BROKEN_KEY), false);
  assert.equal(recordsHtml(createSaveStore(fakeIo({ [SAVE_KEY]: JSON.stringify(s.load()) })).load(), { m1: 'M1' }, {}, { units: [], weapons: [] }).includes('残った 7'), true);
});

test('チュートリアルの印（v1.0.0）: 古いキーから bc-save-v1 へ 1 回だけ移し、古いキーを消す', () => {
  const io = fakeIo({ [LEGACY_TUTORIAL_KEY]: JSON.stringify({ v: 1, state: 'skipped' }) });
  const s = createSaveStore(io);
  assert.deepEqual(s.getTutorialMark(), { v: 1, state: 'skipped' });
  assert.equal(io.m.has(LEGACY_TUTORIAL_KEY), false, '古いキーは消える');
  assert.equal(JSON.parse(io.m.get(SAVE_KEY)).tutorial, 'skipped');
  assert.equal(io.m.has(BROKEN_KEY), false);
  // 読み直しても同じ（もう移さない）
  assert.deepEqual(createSaveStore(io).getTutorialMark(), { v: 1, state: 'skipped' });
  // すでにセーブに印がある時は、セーブのほうを残す（古いキーは消すだけ）
  const io2 = fakeIo({ [SAVE_KEY]: JSON.stringify({ ...emptySave(), tutorial: 'done' }), [LEGACY_TUTORIAL_KEY]: '{"v":1,"state":"skipped"}' });
  assert.equal(createSaveStore(io2).getTutorialMark().state, 'done'); assert.equal(io2.m.has(LEGACY_TUTORIAL_KEY), false);
  // 読めない古い値は消すだけ
  const io3 = fakeIo({ [LEGACY_TUTORIAL_KEY]: '{bad' }); const s3 = createSaveStore(io3);
  assert.equal(s3.getTutorialMark(), null); assert.equal(io3.m.has(LEGACY_TUTORIAL_KEY), false);
  // 書けない時は古いキーを残す（次にもう一度）
  const io4 = fakeIo({ [LEGACY_TUTORIAL_KEY]: '{"v":1,"state":"done"}' }, { throwOnSet: true }); createSaveStore(io4).load();
  assert.equal(io4.m.has(LEGACY_TUTORIAL_KEY), true);
  // 置く・消す・変な値
  const s5 = createSaveStore(fakeIo());
  assert.equal(s5.getTutorialMark(), null);
  assert.equal(s5.setTutorialMark('done'), true); assert.equal(s5.getTutorialMark().state, 'done');
  assert.equal(s5.setTutorialMark('weird'), false); assert.equal(s5.getTutorialMark().state, 'done');
  s5.setTutorialMark(null); assert.equal(s5.getTutorialMark(), null);
  assert.equal(sanitizeSave({ ...emptySave(), tutorial: 'x' }).tutorial, undefined);
});
