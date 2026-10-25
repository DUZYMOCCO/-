import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { mergeWarn, warnWho } from '../js/ui/toast-merge.js?v=1';
const read = rel => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
const W = 2;

test('最初の知らせは 1 件目のまとめになる', () => {
  const k = mergeWarn(null, { t: 10, label: 'ロボA' }, W);
  assert.deepEqual(k, { t: 10, names: ['ロボA'], n: 1 });
  assert.equal(warnWho(k), 'ロボA');
});

test('2 秒以内に続いたら 1 つにまとめる（ちがう名前は「ほか」、同じ名前は「×回数」）', () => {
  let k = mergeWarn(null, { t: 10, label: 'ロボA' }, W);
  k = mergeWarn(k, { t: 11, label: 'ロボB' }, W);
  assert.deepEqual(k, { t: 10, names: ['ロボA', 'ロボB'], n: 2 });
  assert.equal(warnWho(k), 'ロボA ほか1機');
  k = mergeWarn(k, { t: 11.9, label: 'ロボC' }, W);
  assert.equal(warnWho(k), 'ロボA ほか2機');
  const same = mergeWarn(mergeWarn(null, { t: 5, label: 'ロボA' }, W), { t: 6, label: 'ロボA' }, W);
  assert.equal(warnWho(same), 'ロボA×2');
});

test('2 秒をこえたら新しいまとめになる（ちょうど 2 秒も新しい）', () => {
  const a = mergeWarn(null, { t: 10, label: 'ロボA' }, W);
  assert.deepEqual(mergeWarn(a, { t: 12, label: 'ロボB' }, W), { t: 12, names: ['ロボB'], n: 1 });
  assert.deepEqual(mergeWarn(a, { t: 40, label: 'ロボB' }, W), { t: 40, names: ['ロボB'], n: 1 });
});

test('時間が戻ったら（「もう一度」でゲーム内の時間が 0 に戻る）新しいまとめになる', () => {
  const old = mergeWarn(null, { t: 200, label: 'ロボA' }, W);
  const k = mergeWarn(old, { t: 3, label: 'ロボB' }, W);
  assert.deepEqual(k, { t: 3, names: ['ロボB'], n: 1 });
  assert.equal(warnWho(k), 'ロボB');
});

test('前のまとめを書きかえない（純粋）', () => {
  const a = Object.freeze({ t: 1, names: Object.freeze(['ロボA']), n: 1 });
  assert.doesNotThrow(() => mergeWarn(a, { t: 2, label: 'ロボB' }, W));
  assert.deepEqual(a, { t: 1, names: ['ロボA'], n: 1 });
});

test('index.js は入り直しで前回の状態を捨て、作り直しの失敗を受ける', () => {
  const src = read('../js/index.js');
  assert.match(src, /init\(container, onBackToHub\)[\s\S]{0,900}this\.lastPicks = null; this\.kitSig = null; this\.kitWarn = null; this\.shieldWarn = null; this\.menuOpen = false/);
  assert.match(src, /this\.armoryDone = false/);
  assert.match(src, /async startOrShowFailure\(\)/);
  assert.match(src, /作り直せませんでした/);
  assert.doesNotMatch(src, /^\s*await this\.start\(\);/m, '作り直し・武器庫からの出撃は startOrShowFailure を通す');
  assert.match(src, /destroy\(\) \{\s*this\.alive = false;\s*try \{ window\.__dialog\?\.skip\(\)/);
});
