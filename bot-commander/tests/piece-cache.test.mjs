import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createPieceCache, releaseSharedListeners } from '../js/render/piece-cache.js?v=1';
const read = rel => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

test('同じ key は作り直さず使い回し、drop で全部を 1 回ずつ dispose に渡して空にする', () => {
  const disposed = [];
  const c = createPieceCache(v => disposed.push(v));
  const a = c.get('a', () => ({ id: 'a' })), a2 = c.get('a', () => { throw new Error('作り直した'); });
  c.get('b', () => ({ id: 'b' }));
  assert.equal(a, a2);
  assert.equal(c.size, 2);
  c.drop();
  assert.deepEqual(disposed.map(v => v.id), ['a', 'b']);
  assert.equal(c.size, 0);
  c.drop(); // 空のまま drop しても何も起きない（二重に捨てない）
  assert.equal(disposed.length, 2);
  assert.deepEqual(c.stats(), { made: 2, dropped: 2, peak: 2, live: 0 });
});

// ?smooth=0 の焼き込みの流れ: かたまり（8x8 マス）ごとに、境界の絵を作って、焼いて、捨てる
function bake(chunks, dropPerChunk) {
  const live = new Set(); let maxLive = 0, canvases = 0;
  const c = createPieceCache(v => { assert.ok(live.delete(v), '捨てた物が生きていない（二重に捨てた）'); });
  for (const keys of chunks) {
    for (const k of keys) c.get(k, () => { const v = { k }; live.add(v); canvases++; maxLive = Math.max(maxLive, live.size); return v; });
    if (dropPerChunk) c.drop(); // 焼いた直後（renderer.js の layer.destroy のあと）
  }
  c.drop(); // 最後の捨て（焼き終わったあと）
  assert.equal(live.size, 0, '焼き終わったら 1 つも残らない');
  return { maxLive, canvases, stats: c.stats() };
}

test('かたまりごとに捨てると、同時に生きる絵は 1 かたまりぶんだけ（全部ではない）', () => {
  const chunks = [['a', 'b', 'c'], ['c', 'd', 'e', 'f'], ['a', 'f'], ['g', 'h', 'i']];
  const all = bake(chunks, false), per = bake(chunks, true);
  assert.equal(all.maxLive, 9, '捨てない時は、全部（重ならない 9 種類）が同時に生きる');
  assert.equal(per.maxLive, 4, '捨てる時は、いちばん大きいかたまり（4 種類）まで');
  assert.ok(per.canvases >= all.canvases, 'かたまりをまたぐ使い回しは減る（作り直す）');
  assert.equal(per.stats.made, per.stats.dropped);
});

test('releaseSharedListeners: 待ちを全部外し、外した数を返す。絵がなくても、外せなくても落ちない', () => {
  const mk = n => { const o = { n, removed: [], listenerCount: () => o.n, removeAllListeners(ev) { o.removed.push(ev); o.n = 0; } }; return o; };
  const w = mk(5), e = mk(33);
  const throwing = { listenerCount() { throw new Error('捨てた物'); }, removeAllListeners() {} };
  assert.equal(releaseSharedListeners([w, null, undefined, {}, e, throwing]), 38);
  assert.deepEqual(w.removed, ['change']);
  assert.equal(w.n, 0); assert.equal(e.n, 0);
  assert.equal(releaseSharedListeners([]), 0);
  const other = mk(2); releaseSharedListeners([other], 'update');
  assert.deepEqual(other.removed, ['update']);
});

test('renderer.js のつなぎ: 焼いたかたまりごとに edgeCache.drop()、描画を捨てたあとに共通の絵の待ちを外す', () => {
  const src = read('../js/render/renderer.js');
  // ?smooth=0 の焼き込み: 描画 → ミップマップ → タイルを捨てる → 境界の絵を捨てる → 焼いた Sprite の順
  const i1 = src.indexOf('app.renderer.render({ container: layer'), i2 = src.indexOf('layer.destroy({ children: true })'), i3 = src.indexOf('edgeCache.drop(); // v0.4.12'), i4 = src.lastIndexOf('const baked = new Sprite(rt); baked.position.set(cx * TILE');
  assert.ok(i1 > 0 && i1 < i2 && i2 < i3 && i3 < i4, '描画のあとに捨てる（描画の前に捨てると絵が出ない）');
  // 一時の canvas はすぐ 0 にする
  assert.match(src, /const drawTemp = \(g, make\) => \{ const t = make\(\); g\.drawImage\(t, 0, 0\); t\.width = t\.height = 0; \};/);
  assert.equal((src.match(/drawTemp\(g,/g) || []).length, 4, '切り抜き・色づけの 4 か所すべてで使う');
  assert.doesNotMatch(src, /g\.drawImage\(cutOut\(|g\.drawImage\(tinted\(/, '一時の canvas を直接 drawImage に渡さない（捨てられない）');
  // destroy: app.destroy のあとに共通の絵の待ちを外す。作りかけの失敗の後始末も同じ
  const d = src.slice(src.indexOf('function destroy()'));
  assert.ok(d.indexOf('clearSharedPool()') > 0 && d.indexOf('clearSharedPool()') < d.indexOf('app.destroy('), 'TexturePool は描画が生きているうちに空にする（GPU の絵を正しく外すため）');
  assert.ok(d.indexOf('app.destroy(') > 0 && d.indexOf('app.destroy(') < d.indexOf('releaseSharedTextures()'));
  const f = src.slice(src.indexOf('export async function createRenderer'), src.indexOf('async function buildRenderer'));
  assert.ok(f.indexOf('clearSharedPool()') < f.indexOf('made.app.destroy(') && f.indexOf('made.app.destroy(') < f.indexOf('releaseSharedTextures()'));
  // なめらかな作り（SMOOTH_GROUND）の焼き込みには手を入れていない
  const smooth = src.slice(src.indexOf('if (SMOOTH_GROUND) {'), src.indexOf('} else for (let cy'));
  assert.doesNotMatch(smooth, /edgeCache|drawTemp/);
});
