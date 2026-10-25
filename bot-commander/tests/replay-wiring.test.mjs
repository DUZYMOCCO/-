// 記録と再生のつなぎこみ（index.js・☰ メニュー・sw-assets.js）。画面そのものは Node で動かせないので、書き方を確かめる。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(join(ROOT, p), 'utf8');
const index = read('js/index.js');

test('index.js: シムの 1 step は記録・再生をはさむ関数を通る（生の stepSim は記録なしのお試しだけ）', () => {
  assert.match(index, /const step = this\.player \? \(\) => this\.player\.step\(\) : this\.rec \? \(\) => this\.rec\.step\(\) : \(\) => stepSim\(sim\)/);
  assert.match(index, /while \(st\.acc >= TICK && n < 10\) \{ step\(\)/);
  assert.equal((index.match(/stepSim\(sim\)/g) || []).length, 1, 'stepSim(sim) は step の定義の 1 か所だけ');
});

test('index.js: 一時停止中の命令は applyNow（記録つき）を通り、applyCommandsNow を直接呼ぶのはそこだけ', () => {
  assert.equal((index.match(/applyCommandsNow\(sim\)/g) || []).length, 1);
  assert.equal((index.match(/this\.applyNow\(sim\)/g) || []).length, 2); // onOrder と onAction
  assert.match(index, /applyNow\(sim\) \{ if \(this\.player\) return; if \(this\.rec\) this\.rec\.applyNow\(\); else applyCommandsNow\(sim\); \}/);
});

test('☰ メニュー: 記録のボタンは 2 つ（1 行）、結果の画面は 1 つ。地図の上には足さない', () => {
  const menu = index.slice(index.indexOf('class="bc-menu"'), index.indexOf('class="bc-confirm"'));
  assert.equal((menu.match(/class="bc-menu-rec"/g) || []).length, 1);
  assert.equal((menu.match(/bc-menu-recsave/g) || []).length, 1);
  assert.equal((menu.match(/bc-menu-recload/g) || []).length, 1);
  const result = index.slice(index.indexOf('class="bc-result"'), index.indexOf('class="bc-menu"'));
  assert.equal((result.match(/bc-result-rec"/g) || []).length, 1);
});

test('再生中は命令を受けない（onOrder で捨てる）・?replay= の入口がある・お試しの画面では記録しない', () => {
  assert.match(index, /if \(this\.player\) \{ sim\.commands\.length = 0; return; \}/);
  assert.match(index, /params\.get\('replay'\)/);
  assert.match(index, /this\.rec = this\.player \|\| (?:altDemo|demoSetup)(?: \|\| tutMod)? \? null : createRecorder\(/);
});

test('sw-assets.js: 新しいファイルが載っている・版は変えていない', () => {
  const sw = read('sw-assets.js');
  for (const f of ['css/replay.css', 'js/sim/replay.js', 'js/replay/replay-view.js', 'assets/replays/sample.json']) assert.ok(sw.includes(`'${f}'`), f);
});

test('replay.js は sim.js を書きかえない・描画を import しない（sim.js に記録のつなぎこみは入っていない）', () => {
  assert.doesNotMatch(read('js/sim/sim.js'), /recorder|replay/i);
  assert.doesNotMatch(read('js/sim/replay.js').replace(/\/\/.*$/gm, ''), /from ['"][^'"]*(render|vendor|pixi|ui)[^'"]*['"]/);
});
