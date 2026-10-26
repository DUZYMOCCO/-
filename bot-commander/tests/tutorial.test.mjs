import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  TUTORIAL_AUTOSTART, TUTORIAL_MARK_KEY, makeMark, isMarked, loadMark, saveMark, wantsTutorial, createFlow, createWatcher, allowedOps, opOfElement, ALL_OPS,
} from '../js/tutorial/tutorial-flow.js?v=2';
import { STEPS, TUTORIAL_MISSION, TUTORIAL_ALIEN_HP, createTutorialSim, aheadPoint } from '../js/tutorial/tutorial-steps.js?v=8';
import { createSim, runSim, hashSim } from '../js/sim/sim.js?v=28';
import { MISSION_1 } from '../js/sim/mission.js?v=10';
const read = rel => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
const fakeStore = () => { const m = new Map(); return { get: (k, d = null) => (m.has(k) ? JSON.parse(m.get(k)) : d), set: (k, v) => { m.set(k, JSON.stringify(v)); return true; }, raw: m }; };

test('段の並び: 選ぶ→動かす→攻撃→画面→一時停止とメニュー→速さ→シールドとキット→目的', () => {
  const ids = STEPS.map(s => s.id);
  assert.deepEqual(ids, ['select', 'group', 'move', 'mode', 'attack', 'pan', 'zoom', 'pause', 'resume', 'menu', 'speed', 'menuClose', 'shield', 'kit', 'goal']);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(STEPS.filter(s => s.last).length, 1);
  assert.equal(STEPS.at(-1).last, true);
  for (const s of STEPS) {
    assert.ok(s.text.length > 0 && s.text.length <= 60, `${s.id}: 文は短く（${s.text.length} 字）`);
    assert.ok(!s.until || typeof s.until.type === 'string');
  }
  // 速さの段は 2x を、速さのボタンの名前と合わせて光らせる
  assert.equal(STEPS.find(s => s.id === 'speed').target.css, '[data-speed="2"]');
});

test('進み方: 待っている操作が起きたら次へ・ちがう操作や条件に合わない操作では進まない', () => {
  const f = createFlow(STEPS);
  assert.equal(f.step.id, 'select');
  assert.equal(f.feed({ type: 'order' }), false);
  assert.equal(f.feed({ type: 'select', ids: [] }), false); // 外しただけでは進まない
  assert.equal(f.feed({ type: 'select', ids: [3] }), true);
  assert.equal(f.step.id, 'group');
  assert.equal(f.feed({ type: 'select', ids: [3] }), false); // 2機以上
  assert.equal(f.feed({ type: 'select', ids: [3, 4] }), true);
  assert.equal(f.step.id, 'move');
  assert.equal(f.feed({ type: 'order' }), true);
  assert.equal(f.feed({ type: 'mode', mode: 'rush' }), true);
  assert.equal(f.step.id, 'attack');
  assert.equal(f.feed({ type: 'attack' }), true);
  assert.equal(f.feed({ type: 'pan' }), true);
  assert.equal(f.feed({ type: 'zoom' }), true);
  assert.equal(f.step.id, 'pause');
  assert.equal(f.feed({ type: 'pause', paused: false }), false);
  assert.equal(f.feed({ type: 'pause', paused: true }), true);
  assert.equal(f.step.id, 'resume');
  assert.equal(f.feed({ type: 'pause', paused: false }), true);
  assert.equal(f.feed({ type: 'menu', open: true }), true);
  assert.equal(f.feed({ type: 'speed', speed: 0.5 }), false);
  assert.equal(f.feed({ type: 'speed', speed: 2 }), true);
  assert.equal(f.feed({ type: 'menu', open: false }), true);
  assert.equal(f.step.id, 'shield');
  assert.equal(f.feed({ type: 'order' }), false); // 操作を待たない段は「つぎへ」だけ
  assert.equal(f.next(), true); assert.equal(f.next(), true);
  assert.equal(f.step.id, 'goal'); assert.equal(f.finished, false);
  assert.equal(f.next(), true);
  assert.equal(f.finished, true); assert.equal(f.result, 'done'); assert.equal(f.step, null);
  assert.equal(f.next(), false); assert.equal(f.skip(), false); assert.equal(f.result, 'done');
});

test('とばす: いつでも skipped で終わり、あとは進まない', () => {
  const f = createFlow(STEPS);
  f.feed({ type: 'select', ids: [1] });
  assert.equal(f.skip(), true);
  assert.equal(f.finished, true); assert.equal(f.result, 'skipped'); assert.equal(f.step, null);
  assert.equal(f.feed({ type: 'select', ids: [1, 2] }), false);
});

test('終わった印: 置く・読む・形が違えば印なし', () => {
  const st = fakeStore();
  assert.equal(loadMark(st), null); assert.equal(isMarked(loadMark(st)), false);
  saveMark(st, 'skipped');
  assert.deepEqual(loadMark(st), makeMark('skipped')); assert.equal(isMarked(loadMark(st)), true);
  saveMark(st, 'done'); assert.equal(loadMark(st).state, 'done');
  assert.ok(st.raw.has(TUTORIAL_MARK_KEY));
  assert.equal(isMarked({ state: 'x' }), false); assert.equal(isMarked(null), false);
  assert.equal(loadMark({ get() { throw new Error('壊れた'); } }), null); // 読めなくても落ちない
});

test('自動で始める判断: フラグ false なら始めない・true で印なしなら始める・印ありなら始めない', () => {
  assert.equal(TUTORIAL_AUTOSTART, false); // 今は止めたまま
  assert.equal(wantsTutorial({}), false);
  assert.equal(wantsTutorial({ mark: null }), false);
  assert.equal(wantsTutorial({ autostart: false, mark: null }), false);
  assert.equal(wantsTutorial({ autostart: true, mark: null }), true);
  assert.equal(wantsTutorial({ autostart: true, mark: makeMark('done') }), false);
  assert.equal(wantsTutorial({ autostart: true, mark: makeMark('skipped') }), false);
  // ?tutorial=1 かメニューのボタン（on）なら、フラグも印も関係なく始める
  assert.equal(wantsTutorial({ on: true }), true);
  assert.equal(wantsTutorial({ on: true, mark: makeMark('done'), autostart: false }), true);
  // ほかのお試しの画面では自動で始めない
  for (const q of ['?altdemo=1', '?chardemo=1', '?armory=1', '?dialogdemo=1']) assert.equal(wantsTutorial({ autostart: true, search: q }), false, q);
  assert.equal(wantsTutorial({ autostart: true, search: '?fx=low' }), true);
});

test('見張り: 選ぶ・命令・攻撃・戦闘移動・一時停止・メニュー・速さ・画面の移動とズームを見つける', () => {
  const s = { selected: [], mark: null, mode: 'fight', cam: { x: 100, y: 100, zoom: 1 }, paused: false, menuOpen: false, speed: 1 };
  const w = createWatcher(() => ({ ...s, cam: { ...s.cam }, selected: [...s.selected] }));
  w.reset();
  assert.deepEqual(w.poll(), []);
  s.selected = [1, 2]; assert.deepEqual(w.poll(), [{ type: 'select', ids: [1, 2] }]);
  assert.deepEqual(w.poll(), []);
  s.mark = { x: 1, y: 2 }; assert.deepEqual(w.poll(), [{ type: 'order' }]);
  s.mark = { x: 1, y: 2, attack: true }; assert.deepEqual(w.poll(), [{ type: 'attack' }]);
  s.mode = 'rush'; assert.deepEqual(w.poll(), [{ type: 'mode', mode: 'rush' }]);
  s.paused = true; s.menuOpen = true; s.speed = 2;
  assert.deepEqual(w.poll().map(e => e.type), ['pause', 'menu', 'speed']);
  s.cam.x += 5; assert.deepEqual(w.poll(), []); // ちょっと揺れただけ
  s.cam.x += 40; assert.deepEqual(w.poll(), [{ type: 'pan' }]);
  assert.deepEqual(w.poll(), []);
  s.cam.zoom = 1.5; assert.deepEqual(w.poll(), [{ type: 'zoom' }]);
  // reset のあとは、これまでの変化を知らせない
  s.selected = [9]; w.reset(); assert.deepEqual(w.poll(), []);
});

test('練習の場面: 別のミッション（MISSION_1 は変えない）・味方と弱い敵・歩ける所に置かれる', () => {
  const sim = createTutorialSim({ seed: 1 });
  assert.equal(sim.mission.id, 'tutorial'); assert.equal(sim.mission.target, TUTORIAL_MISSION.target);
  const allies = sim.units.filter(u => u.side === 'ally'), enemies = sim.units.filter(u => u.side === 'enemy');
  assert.equal(allies.filter(u => u.kind === 'ponco').length, 3);
  assert.equal(allies.filter(u => u.kind === 'scav').length, 2);
  assert.ok(allies.some(u => u.kind === 'boy'));
  assert.equal(enemies.length, 1);
  assert.equal(enemies[0].hp, TUTORIAL_ALIEN_HP); assert.equal(sim.benched.length, 0);
  assert.ok(sim.units.every(u => u.hp > 0));
  const p = aheadPoint(sim); assert.ok(p.x > 0 && p.y > 0);
  // MISSION_1 のデータは変わっていない（4つの山・巡回3組）
  assert.equal(MISSION_1.salvage.length, 4); assert.equal(MISSION_1.aliens.length, 3); assert.equal(MISSION_1.target, 100);
});

test('練習の場面は同じ seed なら同じ結果（再現できる）・動かしても落ちない', () => {
  const a = createTutorialSim({ seed: 3 }), b = createTutorialSim({ seed: 3 });
  runSim(a, 600); runSim(b, 600);
  assert.equal(hashSim(a), hashSim(b));
});

test('ふつうの始まり（MISSION_1）は、チュートリアルを足しても変わらない', () => {
  // もとは写しの外の refs/baseline_300.json を読んでいた。取り込みで、hash300 の値をここに置いた（シムが変わったらここも直す）
  const base = { m1_seed1_300: '6cc93eb6', m1_seed2_300: '2a60b985', m1_seed3_300: '24994a28', m1_seed4_300: '5558d677', m1_seed5_300: '6e46d4aa' }; // v0.4.13: 機体ごとの盾の表（shield-table.js）で新しい値に。前の表で前の値に戻ることは shield-table.test.mjs
  for (const seed of [1, 2, 3, 4, 5]) {
    const sim = createSim({ seed, mission: MISSION_1 }); runSim(sim, 300);
    assert.equal(hashSim(sim), base[`m1_seed${seed}_300`], `seed ${seed}`);
  }
});

test('つなぎこみ: メニューのボタン1つ・?tutorial=1 の入口はない（☰ だけ）・ふだんは読み込まない・sw-assets に載っている', () => {
  const src = read('../js/index.js');
  assert.equal((src.match(/class="bc-menu-tutorial"/g) || []).length, 1);
  assert.doesNotMatch(src, /get\('tutorial'\) === '1'/);
  assert.match(src, /this\.tutorialOn = false;/);
  assert.match(src, /allow: op => !this\.tutorial \|\| this\.tutorial\.allows\(op\)/);
  assert.match(src, /loadMark\(tutorialMarkStore\)/);
  assert.match(src, /wantsTutorial\(\{ on: this\.tutorialOn/);
  assert.match(src, /\? await import\('\.\/tutorial\/tutorial\.js\?v=\d+'\) : null/); // 始める時だけ本体を読む
  assert.match(src, /tutMod \? tutMod\.createTutorialSim/);
  assert.match(src, /this\.tutorial\?\.destroy\(\)/);
  const assets = read('../sw-assets.js');
  for (const f of ['css/tutorial.css', 'js/tutorial/tutorial-flow.js', 'js/tutorial/tutorial-steps.js', 'js/tutorial/tutorial.js']) assert.ok(assets.includes(`'${f}'`), f);
  // 自動で始めるフラグは止めたまま・シムは画面側の物を読まない
  assert.match(read('../js/tutorial/tutorial-flow.js'), /export const TUTORIAL_AUTOSTART = false;/);
  assert.doesNotMatch(read('../js/sim/sim.js'), /tutorial/i);
});

test('画面側は pointer-events なしの重ね（ふつうの操作を止めない）・吹き出しのボタンだけ押せる', () => {
  const css = read('../css/tutorial.css');
  assert.match(css, /\.bc-root \.bc-tut \{[^}]*pointer-events: none/);
  assert.match(css, /\.bc-tut-bubble \{[^}]*pointer-events: auto/);
});

test('操作のしめし（v1.0.0）: 教える段まで、その操作はできない。最後の段で全部', () => {
  const at = id => allowedOps(STEPS, STEPS.findIndex(s => s.id === id));
  assert.deepEqual([...at('select')], ['select']);
  assert.equal(at('select').has('order'), false); assert.equal(at('select').has('pan'), false);
  assert.ok(at('move').has('order') && !at('move').has('attack') && !at('move').has('mode'));
  assert.ok(at('attack').has('attack') && !at('attack').has('pan'));
  assert.ok(at('pan').has('pan') && !at('pan').has('zoom'));
  assert.ok(at('zoom').has('zoom') && !at('zoom').has('pause'));
  assert.ok(at('pause').has('pause') && !at('pause').has('menu'));
  assert.ok(at('menu').has('menu') && !at('menu').has('speed'));
  assert.ok(at('speed').has('speed') && !at('speed').has('other'));
  assert.deepEqual([...at('goal')].sort(), [...ALL_OPS].sort());
  assert.deepEqual([...allowedOps(STEPS, STEPS.length)].sort(), [...ALL_OPS].sort());
  // 前の段で教えた操作は、先の段でも使える
  for (let i = 1; i < STEPS.length; i++) for (const op of allowedOps(STEPS, i - 1)) assert.ok(allowedOps(STEPS, i).has(op), `${STEPS[i].id} ${op}`);
  // 画面の部品 → 操作（closest のまねだけの偽の要素）
  const el = sel => ({ closest: q => (q === sel ? {} : null) });
  assert.equal(opOfElement(el('.bc-pause')), 'pause');
  assert.equal(opOfElement(el('.bc-menu-btn')), 'menu');
  assert.equal(opOfElement(el('[data-speed]')), 'speed');
  assert.equal(opOfElement(el('.bc-picks')), 'group');
  assert.equal(opOfElement(el('.bc-act [data-act="mode"]')), 'mode');
  assert.equal(opOfElement(el('.bc-groups')), 'other');
  assert.equal(opOfElement(el('.bc-tut')), null, '吹き出しのボタンは止めない');
  assert.equal(opOfElement(el('.bc-menu-close')), null);
  assert.equal(opOfElement(null), null);
});

test('操作のしめし: input.js は allow が false の操作をしない（ふつうは allow なし＝全部できる）', () => {
  const src = read('../js/render/input.js');
  for (const op of ['select', 'group', 'order', 'attack', 'pan', 'zoom']) assert.match(src, new RegExp(`ok\\('${op}'\\)`), op);
  const tut = read('../js/tutorial/tutorial.js');
  assert.match(tut, /allowedOps\(STEPS, flow\.index\)/);
  assert.match(tut, /addEventListener\(t, blockUi, true\)/);
  assert.match(tut, /saveMark\(tutorialMarkStore/);
});

test('印はセーブの入れ物（getTutorialMark/setTutorialMark）にも置ける', () => {
  let v = null; const box = { getTutorialMark: () => (v ? { v: 1, state: v } : null), setTutorialMark: s => { v = s; return true; } };
  assert.equal(loadMark(box), null);
  saveMark(box, 'skipped'); assert.equal(isMarked(loadMark(box)), true); assert.equal(v, 'skipped');
});
