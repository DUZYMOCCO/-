import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CHAPTERS, stageForStory, chapterFlag, chaptersRequested, loadUnlocked, unlockAfter, CHAPTER_SAVE_KEY } from '../js/story/chapters.js?v=2';
import { newStoryState } from '../js/story/story-1.js?v=3';
import { newStory2State } from '../js/story/story-2.js?v=2';
import { newChapterStory } from '../js/story/chapters.js?v=2';
import { createSim } from '../js/sim/sim.js?v=29';
import { createRecorder, makeStart, openReplay, registerMission, createSimFromStart } from '../js/sim/replay.js?v=12';
import { issueAlight, issueBoard, RIDE_MODE } from '../js/sim/ride.js?v=3';

for (const c of Object.values(CHAPTERS)) for (const st of Object.values(c.stages)) registerMission(st.mission);
const store = (initial = null) => { let v = initial; return { getItem: k => k === CHAPTER_SAVE_KEY ? v : null, setItem: (k, x) => { assert.equal(k, CHAPTER_SAVE_KEY); v = x; } }; };
test('全章は同じ段・会話・ミッション・HUDと結果の形、旧入口は同じミッション', () => {
  for (const c of Object.values(CHAPTERS)) { assert.equal(typeof c.hud, 'function'); assert.equal(typeof c.resultText, 'function'); for (const name of c.order) { const st = c.stages[name]; assert.ok(st.mission.id); assert.equal(typeof st.scriptUrl, 'function'); assert.equal(typeof st.midScene, 'function'); } }
  assert.equal(stageForStory(newStoryState()).mission, CHAPTERS[1].stages['1-1'].mission);
  assert.equal(stageForStory(newStory2State()).mission, CHAPTERS[2].stages['2-1'].mission);
  assert.equal(stageForStory(newChapterStory(3)).mission, CHAPTERS[3].stages['3-1'].mission);
  assert.equal(chapterFlag('?storych=2'), 2); assert.equal(chapterFlag('?storych=3'), 3);
  assert.equal(chaptersRequested(''), false); assert.equal(chaptersRequested('?story=1'), true); assert.equal(chaptersRequested('?chapters=1'), true);
});
test('開放は保存し不正値や保存不可でも安全', () => {
  const s = store(); assert.equal(loadUnlocked(s), 1); assert.equal(unlockAfter(1, s), 2); assert.equal(loadUnlocked(s), 2); assert.equal(unlockAfter(2, s), 3); assert.equal(unlockAfter(1, s), 3);
  for (const v of ['{', '{}', '{"unlocked":4}', '{"unlocked":"3"}', 'null']) assert.equal(loadUnlocked(store(v)), 1);
  assert.equal(unlockAfter(1, { getItem: () => { throw Error(); }, setItem: () => { throw Error(); } }), 2);
});
for (const ch of Object.values(CHAPTERS)) for (const name of ch.order) test(`${name} の記録が再生で一致`, () => {
  const mission = ch.stages[name].mission, start = makeStart({ seed: 1, mapSeed: 7, mission, chapter: ch.id }), sim = createSimFromStart(start); // v1.0.8: 遊ぶ時と同じ条件（第 3 章は新しい敵）で作る
  const rec = createRecorder(sim, start);
  const boy = sim.units.find(u => u.kind === 'boy'), robot = sim.units.find(u => u.kind === 'scav');
  if (boy?.ride) issueAlight(sim, [boy.id]);
  for (let i = 0; i < 100; i++) rec.step();
  if (boy && robot && !boy.ride) issueBoard(sim, boy.id, robot.id, RIDE_MODE.BACK);
  for (let i = 0; i < 250 && !sim.result; i++) rec.step();
  const data = rec.snapshot(); assert.equal(data.start.chapter, ch.id);
  const replay = openReplay(JSON.stringify(data)); assert.ok(replay.ok, replay.reason); assert.equal(replay.player.runAll().match, true, JSON.stringify(replay.player.report().first));
});
test('v1.0.8: 第 3 章は遊ぶ時もリプレイも新しい敵（実敵）で作り、1・2 章と通常は変えない', () => {
  for (const c of Object.values(CHAPTERS)) for (const name of c.order) {
    const mission = c.stages[name].mission, sim = createSimFromStart(makeStart({ seed: 1, mapSeed: 7, mission, chapter: c.id }));
    const kinds = [...new Set(sim.units.filter(u => u.side !== 'ally').map(u => u.kind))].sort().join(',');
    if (c.id === 3) { assert.ok(sim.neKinds, name); assert.equal(kinds, name === '3-1' ? 'G01,G02,G08' : 'G01,G08,G09', name); }
    else if (c.id === 1) assert.equal(sim.neKinds, undefined, name);
  }
  const src = readFileSync(new URL('../js/index.js', import.meta.url), 'utf8');
  assert.match(src, /const chapterNE = !!chapterMission\?\.story3/);
  assert.match(src, /newEnemies: newEnemies \|\| chapterNE/);
  assert.match(src, /if \(newEnemies\) this\.rec = null/);
});
