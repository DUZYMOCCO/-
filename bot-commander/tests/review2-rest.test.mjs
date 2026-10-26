// 点検の残り（review2_rest）の直しの試験。R-xx ごとに足していく。
import test from 'node:test';
import assert from 'node:assert/strict';
// Node 20 には navigator が無く、pixi が読み込み時に止まるので、先に仮のものを置いてから読む
if (typeof globalThis.navigator === 'undefined') globalThis.navigator = { userAgent: 'node' };
const { default: Game } = await import('../js/index.js');
import * as S from '../js/sim/sim.js?v=28';
import { ALT_UNITS_SETUP, altUnitsMapEdit } from '../js/sim/alt-units-demo.js?v=3';
import { ALT_DEMO_SETUP, altDemoMapEdit } from '../js/sim/altitude-demo.js?v=2';
import { createRideDemoSim } from '../js/sim/ride-demo.js?v=8';
import { demoResultView } from '../js/ui/demo-result.js?v=1';

// ---- ALTUNITS-RESULT: ミッションのないお試しの結果の画面 ----
const fakeEl = () => { const mk = () => ({ hidden: true, textContent: '', innerHTML: '', classList: { toggle() {}, remove() {} } }); return { result: mk(), resultBanner: mk(), resultTitle: mk(), resultText: mk() }; };
const demos = {
  altunits: () => S.createSim({ seed: 1, mapSeed: 7, setup: ALT_UNITS_SETUP, mapEdit: altUnitsMapEdit }),
  altdemo: () => S.createSim({ seed: 1, mapSeed: 7, setup: ALT_DEMO_SETUP, mapEdit: altDemoMapEdit }),
  ridedemo: () => createRideDemoSim({ seed: 1, mapSeed: 7 }),
};
for (const [name, make] of Object.entries(demos)) {
  for (const outcome of ['win', 'lose']) {
    test(`ALTUNITS-RESULT: ?${name}=1 で ${outcome} の結果の画面が例外なく出る`, () => {
      const sim = make();
      assert.equal(S.missionStatus(sim), null, 'お試しにはミッションがない');
      if (outcome === 'win') sim.units = sim.units.filter(u => u.side !== 'enemy'); else sim.units = sim.units.filter(u => u.side !== 'ally');
      S.stepSim(sim);
      assert.equal(sim.result, outcome);
      const self = { sim, el: fakeEl(), recordResult() { throw new Error('お試しは記録に足さない'); } };
      self.showDemoResult = Game.showDemoResult;
      Game.showResult.call(self);
      assert.equal(self.el.result.hidden, false);
      assert.ok(self.el.resultTitle.textContent.length > 0);
      assert.match(self.el.resultText.innerHTML, /かかった時間/);
      assert.doesNotMatch(self.el.resultText.innerHTML, /届けた資材/);
    });
  }
}
test('ALTUNITS-RESULT: demoResultView は勝ち・負けで文が変わり、人数を数える', () => {
  const sim = demos.altunits();
  const a = demoResultView({ ...sim, result: 'win', time: 61 }), b = demoResultView({ ...sim, result: 'lose', time: 5 });
  assert.equal(a.win, true); assert.equal(b.win, false); assert.notEqual(a.title, b.title);
  assert.match(a.html, /1:01/); assert.match(a.html, /残ったロボ \d+機/);
});

// ---- R-07: 保存できなかった時に知らせる ----
import { createSaveStore, SAVE_FAIL_TEXT } from '../js/save/save.js?v=5';
const winRes = (o = {}) => ({ id: 'm1', win: true, time: 100, delivered: 10, lost: 0, survivors: 3, now: '2026-10-26T00:00:00Z', ...o });
const memIo = (failSet) => { const m = new Map(); return { m, get: k => m.get(k) ?? null, set: (k, t) => { if (failSet) return false; m.set(k, t); return true; }, remove: k => m.delete(k) }; };

test('R-07: recordMissionResult は保存できたら saved: true、書けなければ false（記録そのものは今の回だけ覚える）', () => {
  const ok = createSaveStore(memIo(false)).recordMissionResult(winRes());
  assert.equal(ok.saved, true); assert.equal(ok.firstClear, true);
  const s = createSaveStore(memIo(true)); const bad = s.recordMissionResult(winRes());
  assert.equal(bad.saved, false); assert.equal(bad.firstClear, true); assert.equal(s.getMissionRecord('m1').wins, 1);
  assert.equal(s.lastSaveOk, false);
  const thr = createSaveStore({ get: () => null, set() { throw new Error('QuotaExceededError'); }, remove() {} });
  assert.equal(thr.recordMissionResult(winRes()).saved, false);
});
test('R-07: 結果のカードに「記録を残せません」が出る（保存できた時は出ない）', () => {
  const mk = () => ({ el: { resultText: { innerHTML: 'ほんぶん' } } });
  const a = mk(); Game.noteSaveFailure.call(a, { saved: true }); assert.equal(a.el.resultText.innerHTML, 'ほんぶん');
  const b = mk(); Game.noteSaveFailure.call(b, { saved: false }); assert.ok(b.el.resultText.innerHTML.endsWith(SAVE_FAIL_TEXT));
  assert.doesNotThrow(() => Game.noteSaveFailure.call(mk(), undefined));
});

// ---- R-05: リプレイも withAltUnits を通す ----
import * as R from '../js/sim/replay.js?v=11';
import { MISSION_1 } from '../js/sim/mission.js?v=10';
import { withAltUnits, ALT_MISSION_ROWS, ALT_IN_MISSIONS } from '../js/sim/alt-units.js?v=3';

test('R-05: スイッチが全部 false の今は、再生のミッションも start も前と同じ', () => {
  assert.deepEqual({ ...ALT_IN_MISSIONS }, { flyer: false, amph: false });
  assert.deepEqual(R.makeStart({ seed: 3 }), { seed: 3, mapSeed: 7, mission: MISSION_1.id, loadout: null });
  const sim = R.createSimFromStart(R.makeStart({ seed: 3 }));
  const direct = S.createSim({ seed: 3, mapSeed: 7, mission: MISSION_1, loadout: null });
  assert.equal(S.hashSim(sim), S.hashSim(direct)); assert.equal(sim.units.length, direct.units.length);
});
test('R-05: 本編と同じ通し方（withAltUnits）で作った sim と、再生用の関数で作った sim は、スイッチが入っていても同じ', () => {
  // ALT_IN_MISSIONS は凍結されているので、通し方そのものを同じ引数で比べる（スイッチ = 入）
  const on = { flyer: true, amph: true };
  const play = withAltUnits(MISSION_1, ALT_MISSION_ROWS, on);
  assert.equal(play.ally.length, MISSION_1.ally.length + 2);
  assert.equal(withAltUnits(MISSION_1, ALT_MISSION_ROWS, { flyer: false, amph: false }), MISSION_1);
});
test('R-05: 記録の start.alt とスイッチが食い違う記録は、読めるが notes で知らせる', () => {
  const sim = S.createSim({ seed: 1, mapSeed: 7, mission: MISSION_1 });
  const rec = R.createRecorder(sim, R.makeStart({ seed: 1 })); for (let i = 0; i < 40; i++) rec.step();
  const snap = rec.snapshot();
  assert.equal(R.parseReplay(snap).notes.length, 0);
  const alt = JSON.parse(JSON.stringify(snap)); alt.start.alt = { flyer: true, amph: false };
  const p = R.parseReplay(alt); assert.equal(p.ok, true); assert.ok(p.notes.some(n => /飛ぶ機体/.test(n)));
});

// ---- R-08: 記録の長さの上限 ----
test('R-08: 命令が MAX_REPLAY_CMDS を超える遊びも、「ここまでの記録」として閉じて、自分で読み込める', () => {
  const sim = S.createSim({ seed: 1, mapSeed: 7, mission: MISSION_1 });
  const rec = R.createRecorder(sim, R.makeStart({ seed: 1 }));
  const id = sim.units.find(u => u.side === 'ally').id;
  for (let i = 0; i < R.MAX_REPLAY_CMDS + 200 && !sim.result; i++) { sim.commands.push({ type: 'stop', unitIds: [id] }); rec.step(); }
  assert.equal(sim.result, null, '試験の途中で終わっていない');
  assert.equal(rec.done, true, '上限で閉じた');
  const snap = rec.snapshot();
  assert.equal(snap.cmds.length, R.MAX_REPLAY_CMDS);
  assert.ok(snap.end.tick <= R.MAX_REPLAY_TICKS);
  const text = R.stringifyReplay(snap);
  assert.ok(text.length < R.MAX_REPLAY_BYTES, '4MB より小さい');
  const p = R.parseReplay(text); assert.equal(p.ok, true, p.reason);
  const rep = R.openReplay(text); assert.equal(rep.ok, true);
  assert.equal(rep.player.runAll().match, true, '閉じた所までは再生が同じ');
});
test('R-08: 長さが MAX_REPLAY_TICKS を超える遊び（放置）も、上限で閉じて読み込める。遊びそのものは続く', () => {
  const sim = S.createSim({ seed: 1, mapSeed: 7, mission: MISSION_1 });
  const rec = R.createRecorder(sim, R.makeStart({ seed: 1 }));
  for (let i = 0; i < R.MAX_REPLAY_TICKS + 300 && !sim.result; i++) rec.step();
  assert.equal(sim.result, null);
  assert.ok(sim.tick > R.MAX_REPLAY_TICKS, '閉じたあとも遊びは進む');
  const snap = rec.snapshot();
  assert.equal(snap.end.tick, R.MAX_REPLAY_TICKS);
  assert.equal(R.parseReplay(R.stringifyReplay(snap)).ok, true);
});

// ---- R-06: 物語の台本の背景は先読み（sw-assets.js）に入っている ----
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BG_FILES } from '../js/dialog/dialog-bg.js?v=2';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
test('R-06: assets/story の台本が使う会話の背景は、全部 sw-assets.js の先読みに入っている', () => {
  const sw = readFileSync(join(ROOT, 'sw-assets.js'), 'utf8');
  const used = new Set();
  for (const f of readdirSync(join(ROOT, 'assets/story')).filter(f => f.endsWith('.json'))) {
    const s = JSON.parse(readFileSync(join(ROOT, 'assets/story', f), 'utf8'));
    if (s.bg) used.add(s.bg);
    for (const l of s.lines || []) if (l.bg) used.add(l.bg);
  }
  assert.ok(used.size >= 1);
  for (const n of used) assert.ok(BG_FILES[n], `${n} は表にある`), assert.ok(sw.includes(`'${BG_FILES[n]}'`), `物語の背景 ${n} が先読みにない`);
});

// ---- R-12: チュートリアルの読み込み失敗を知らせる ----
test('R-12: ☰ のチュートリアルのボタンは、import が失敗しても toast で知らせる（黙って何も起きない、をやめる）', () => {
  const src = readFileSync(join(ROOT, 'js/index.js'), 'utf8');
  const i = src.indexOf("$('.bc-menu-tutorial').addEventListener");
  const block = src.slice(i, src.indexOf("// 「物語（試作）」", i));
  assert.match(block, /try \{ m = await import\('\.\/tutorial\/tutorial\.js\?v=\d+'\); \}/);
  assert.match(block, /catch \(err\)[\s\S]*this\.toast\('チュートリアルを開けませんでした/);
  assert.match(block, /m\.pressMenuButton\(btn,/);
});

// ---- R-13: 試験・文書の小さな穴 ----
import { RESULT_BANNER } from '../js/render/raster-art.js?v=14';
test('R-13 ①: index.js の結果の絵の URL（RESULT_BANNER_URL）と raster-art.js の RESULT_BANNER は同じ場所を指す', () => {
  const src = readFileSync(join(ROOT, 'js/index.js'), 'utf8');
  const m = src.match(/const RESULT_BANNER_URL = \{ win: new URL\('([^']+)'[^}]*lose: new URL\('([^']+)'/);
  assert.ok(m, 'index.js に RESULT_BANNER_URL がある');
  const idx = { win: new URL(m[1], new URL('../js/index.js', import.meta.url)).href, lose: new URL(m[2], new URL('../js/index.js', import.meta.url)).href };
  assert.equal(idx.win, RESULT_BANNER.win); assert.equal(idx.lose, RESULT_BANNER.lose);
});
test('R-13 ③: README の冒頭の版が、sw-assets.js の gameVersion・キャッシュの版と合っている', () => {
  const sw = readFileSync(join(ROOT, 'sw-assets.js'), 'utf8');
  const ver = sw.match(/version: '(v\d+)'/)[1], gv = sw.match(/gameVersion: '([\d.]+)'/)[1];
  const head = readFileSync(join(ROOT, 'README.md'), 'utf8').split('\n').slice(0, 4).join('\n');
  assert.ok(head.includes(`v${gv} / ゲームキャッシュ ${ver}`), `README 冒頭が v${gv}・${ver} と合っていない`);
});
