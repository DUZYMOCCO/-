/**
 * ABYSS DIVE — 導入（冒頭ストーリー）の純粋ルールのテスト。
 *
 * 対象: js/intro-rules.js（DOM 非依存）。
 *  - 初回のみの視聴フラグ（独自キー。資源・装備・セーブには触れない）
 *  - タップで進む／スキップ／連打・hold 事故なし（ロック時間）
 *  - 完了時にフラグを立て、通常（タイトル）へ引き渡す
 *  - 原文ルールの順守（ブラックホール・火星・4万マイルの種明かし無し、父の生存を断定しない）
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  INTRO_KEY, INTRO_LOCK, INTRO_CLOSE_T,
  INTRO_STEPS, createIntroStore, createIntroState,
  introTotal, introView, advanceIntro, skipIntro, tickIntro, introFinished,
  INTRO_PORTRAITS, portraitFile,
} from '../js/intro-rules.js';

const here = dirname(fileURLToPath(import.meta.url));
const gameDir = resolve(here, '..');

test('INTRO_KEY は独自キーで、資源/装備/セーブのキーと別', () => {
  assert.equal(INTRO_KEY, 'abyss_intro');
  assert.notEqual(INTRO_KEY, 'abyss_resources');
  assert.notEqual(INTRO_KEY, 'abyss_upgrades');
  assert.notEqual(INTRO_KEY, 'abyss_ship');
  assert.notEqual(INTRO_KEY, 'abyss_arsenal');
  assert.notEqual(INTRO_KEY, 'abyss_advanced_weapons');
});

test('初回は未視聴、視聴後に seen、保存される', () => {
  let saved = null;
  const store = createIntroStore({ load: () => saved, save: (v) => { saved = v; } });
  assert.equal(store.seen(), false);
  store.markSeen();
  assert.equal(store.seen(), true);
  assert.ok(saved && saved.seen === true, 'markSeen は保存へ書く');
  /* 同じ保存を読み直しても視聴済みのまま（再入場でまた出ない） */
  const store2 = createIntroStore({ load: () => saved, save: () => {} });
  assert.equal(store2.seen(), true);
});

test('壊れた/無い保存は安全に未視聴として扱う', () => {
  assert.equal(createIntroStore({ load: () => null, save: () => {} }).seen(), false);
  assert.equal(createIntroStore({ load: () => undefined, save: () => {} }).seen(), false);
  assert.equal(createIntroStore({ load: () => ({}), save: () => {} }).seen(), false);
  assert.equal(createIntroStore({ load: () => 'garbage', save: () => {} }).seen(), false);
});

test('reset で未視聴へ戻せる（再視聴用。資源などには触れない）', () => {
  let saved = { seen: true };
  const store = createIntroStore({ load: () => saved, save: (v) => { saved = v; } });
  assert.equal(store.seen(), true);
  store.reset();
  assert.equal(saved, null);
  const store2 = createIntroStore({ load: () => saved, save: () => {} });
  assert.equal(store2.seen(), false);
});

test('呼び出しごとに load の戻りを閉じ込めない（壊れた保存でも落ちない）', () => {
  const store = createIntroStore({ load: () => ({ seen: true, v: 1 }), save: () => {} });
  assert.equal(store.seen(), true);
  assert.equal(typeof store.markSeen, 'function');
});

test('台本は十分な長さで、各ステップに説明文と場面がある', () => {
  assert.ok(INTRO_STEPS.length >= 8, '台本が短すぎる: ' + INTRO_STEPS.length);
  assert.equal(introTotal(), INTRO_STEPS.length);
  const scenes = new Set();
  for (const s of INTRO_STEPS) {
    assert.equal(typeof s.text, 'string');
    assert.ok(s.text.length > 0, '空の説明文がある');
    assert.equal(typeof s.scene, 'string');
    assert.ok(s.scene.length > 0);
    assert.equal(typeof s.speaker, 'string');
    scenes.add(s.scene);
  }
  /* 基地の生活 → 受信 → 出港、の流れを持つ */
  assert.ok(scenes.has('base'), '生活の場面がない');
  assert.ok(scenes.has('signal'), '受信の場面がない');
  assert.ok(scenes.has('depart'), '出港の場面がない');
});

test('台本に相棒 ponco MarkII が登場する', () => {
  const joined = INTRO_STEPS.map((s) => s.speaker).join('|');
  assert.match(joined, /ponco/i);
});

test('原文ルール順守: 種明かし（ブラックホール/火星/4万マイル）を含まない', () => {
  const all = INTRO_STEPS.map((s) => s.text + ' ' + s.speaker).join('\n');
  assert.ok(!/ブラックホール/.test(all), 'ブラックホールが漏れている');
  assert.ok(!/火星/.test(all), '火星が漏れている');
  assert.ok(!/4万マイル|40000|40,000/.test(all), '4万マイルの種明かしが漏れている');
  assert.ok(!/3920|3960/.test(all), '深度の種明かしが漏れている');
});

test('原文ルール順守: 父の生存を断定しない', () => {
  const all = INTRO_STEPS.map((s) => s.text).join('\n');
  assert.ok(!/生存/.test(all), '生存を断定している');
  assert.ok(!/生きている|生きてる|生きていた/.test(all), '父が生きている前提になっている');
});

test('状態機械: 1 タップで 1 ステップ進む', () => {
  const st = createIntroState();
  assert.equal(st.step, 0);
  assert.equal(st.done, false);
  const r = advanceIntro(st);
  assert.equal(r.advanced, true);
  assert.equal(st.step, 1);
  assert.equal(r.done, false);
});

test('連打・hold 事故なし: ロック中は進まない', () => {
  const st = createIntroState();
  advanceIntro(st);                 // step 0 -> 1, lock が立つ
  assert.ok(st.lock > 0, '進んだ直後はロックが立つ');
  const r = advanceIntro(st);       // すぐもう一度（連打相当）
  assert.equal(r.advanced, false, 'ロック中は進まない');
  assert.equal(st.step, 1, '連打でスキップし過ぎない');
  /* ロックが明ければまた進める */
  tickIntro(st, INTRO_LOCK + 0.001);
  assert.equal(st.lock, 0);
  const r2 = advanceIntro(st);
  assert.equal(r2.advanced, true);
  assert.equal(st.step, 2);
});

test('最後まで進むと done になり、以降は進まない', () => {
  const st = createIntroState();
  for (let i = 0; i < introTotal() + 5; i++) {
    tickIntro(st, INTRO_LOCK + 0.001);
    advanceIntro(st);
  }
  assert.equal(st.done, true);
  assert.equal(st.step, introTotal() - 1, '最後のコマで止まる');
  tickIntro(st, INTRO_LOCK + 0.001);
  const r = advanceIntro(st);
  assert.equal(r.advanced, false);
  assert.equal(r.done, true);
});

test('スキップで即 done（既存プレイヤーも飛ばせる）', () => {
  const st = createIntroState();
  const r = skipIntro(st);
  assert.equal(r.done, true);
  assert.equal(st.done, true);
  assert.equal(st.skipped, true);
  /* スキップ後はタップでも進まない */
  tickIntro(st, INTRO_LOCK + 0.001);
  assert.equal(advanceIntro(st).advanced, false);
});

test('完了しただけでは終わらない（短いロックの後で通常へ引き渡す）', () => {
  const st = createIntroState();
  skipIntro(st);
  assert.equal(introFinished(st), false, '直後はまだ終わり扱いにしない（連打で通常画面へ抜けない）');
  tickIntro(st, INTRO_CLOSE_T);
  assert.equal(introFinished(st), true);
});

test('view は現在の話者・文・進行度・登場演出(0..1)と立ち絵キーを返す', () => {
  const st = createIntroState();
  const v0 = introView(st);
  assert.equal(v0.step, 0);
  assert.equal(v0.total, introTotal());
  assert.equal(v0.text, INTRO_STEPS[0].text);
  assert.equal(v0.portrait, INTRO_STEPS[0].portrait);
  assert.equal(v0.done, false);
  assert.ok(v0.appear >= 0 && v0.appear <= 1, 'appear は 0..1');
  advanceIntro(st);
  tickIntro(st, 0.3);
  const v1 = introView(st);
  assert.equal(v1.step, 1);
  assert.equal(v1.text, INTRO_STEPS[1].text);
  assert.equal(v1.portrait, INTRO_STEPS[1].portrait, 'view が立ち絵キーを運ぶ');
  assert.ok(v1.appear > 0, '時間経過で登場する');
});

test('tickIntro は経過時間を進め、ロックと終了待ちを減らす', () => {
  const st = createIntroState();
  advanceIntro(st);
  const lock0 = st.lock;
  tickIntro(st, 0.05);
  assert.ok(st.t > 0);
  assert.ok(st.lock < lock0);
});

/* --- 会話用ポートレート（話者を立ち絵＋話者名で明示） --------------------- */

test('発話コマは立ち絵キーを持ち、ナレーションは持たない', () => {
  for (const s of INTRO_STEPS) {
    if (s.speaker && s.speaker.length) {
      assert.ok(s.portrait, '発話コマに portrait が無い: ' + s.text);
      assert.ok(INTRO_PORTRAITS[s.portrait], '未知の立ち絵キー: ' + s.portrait);
    } else {
      assert.ok(s.portrait == null, 'ナレーションに立ち絵を持たせない: ' + s.text);
    }
  }
});

test('エリーは girl、ポンコは ponco の立ち絵を使う', () => {
  for (const s of INTRO_STEPS) {
    if (!s.speaker) continue;
    if (/ponco/i.test(s.speaker)) assert.match(s.portrait, /^ponco:/, 'ポンコは ponco 立ち絵: ' + s.text);
    else assert.match(s.portrait, /^girl:/, 'エリーは girl 立ち絵: ' + s.text);
  }
});

test('日常はエリーのニュートラル/スマグ、受信は驚き/悲しみの立ち絵を使う', () => {
  const used = new Set(INTRO_STEPS.map((s) => s.portrait).filter(Boolean));
  assert.ok(used.has('girl:neutral'));
  assert.ok(used.has('girl:smug'));
  assert.ok(used.has('girl:surprised'));
  assert.ok(used.has('girl:sad'));
  assert.ok(used.has('ponco:neutral'));
  assert.ok(used.has('ponco:alert'));
});

test('INTRO_PORTRAITS の実ファイルが assets/ に存在する（SW 登録は sw-assets 側）', () => {
  const files = Object.values(INTRO_PORTRAITS);
  assert.ok(files.length >= 5, '立ち絵が少なすぎる');
  for (const f of files) {
    assert.ok(existsSync(resolve(gameDir, 'assets', f)), '見つからない立ち絵: assets/' + f);
  }
});

test('portraitFile はキーから実ファイル名を返す（未知は null）', () => {
  assert.equal(portraitFile('girl:neutral'), INTRO_PORTRAITS['girl:neutral']);
  assert.equal(portraitFile('ponco:alert'), INTRO_PORTRAITS['ponco:alert']);
  assert.equal(portraitFile('nope'), null);
  assert.equal(portraitFile(null), null);
});
