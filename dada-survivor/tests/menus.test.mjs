import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeSave, stageUnlocked, STAGES } from '../js/rules.js';

const css = readFileSync(new URL('../css/dada-survivor.css', import.meta.url), 'utf8');
const stageJs = readFileSync(new URL('../js/stage.js', import.meta.url), 'utf8');
const ui = readFileSync(new URL('../js/menus.js', import.meta.url), 'utf8') + readFileSync(new URL('../js/index.js', import.meta.url), 'utf8');

// v1.10.0 の バグ：クエストの やじるし（stage.js）が ステージえらびの ◀▶ と おなじ `.ds-arrow` を つかい、
// ◀▶ が はば0・pointer-events:none に なって ほかの ステージに いけなく なった
test('stage-select arrows stay tappable (no class shared with in-game sprites)', () => {
  const stageCls = new Set([...stageJs.matchAll(/el\('(ds-[\w-]+)'/g)].map(m => m[1]));
  const uiCls = new Set([...ui.matchAll(/class="([^"$]*)/g)].flatMap(m => m[1].split(/\s+/)).filter(c => c.startsWith('ds-')));
  for (const c of stageCls) assert.ok(!uiCls.has(c), `${c} は stage.js と メニューの りょうほうで つかわれている`);
  for (const m of css.matchAll(/(^|\n)\.ds-arrow\s*\{([^}]*)\}/g)) {
    assert.ok(!/pointer-events:\s*none/.test(m[2]) && !/width:\s*0/.test(m[2]), '.ds-arrow（◀▶）は おせる おおきさ');
  }
  assert.ok(ui.includes('class="ds-arrow" data-stage='));
});

test('each top-level class selector is defined once in the css', () => {
  const seen = new Map();
  for (const m of css.matchAll(/(?:^|\n)(\.[\w-]+)\s*\{/g)) {
    assert.ok(!seen.has(m[1]), `${m[1]} が 2かい ていぎ されている`); seen.set(m[1], true);
  }
});

test('a save with cleared stages keeps every unlocked stage selectable', () => {
  const s = normalizeSave({ stage: 2, stageClears: { 1: 3, 2: 1 }, coins: 50 });
  assert.equal(s.stage, 2);
  for (const st of STAGES.slice(0, 3)) assert.ok(stageUnlocked(s, st.id), `stage ${st.id}`);
  assert.equal(stageUnlocked(s, 4), false);
});
