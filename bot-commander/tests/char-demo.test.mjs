// ?chardemo=1 の「にせのユニット」の動き（画面を使わない部分）。全部の状態で、3人とも正しい動きの絵が出る
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { TICK } from '../js/sim/sim.js?v=28';

globalThis.navigator ??= { userAgent: 'node' }; // Pixi を読むため（Node 20 には navigator がない）
const { DEMO_STATES, makeFigure, enterState, stepFigure } = await import('../js/render/char-demo.js?v=11');
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DEFS = Object.fromEntries([['boy', 'BOY_OBL'], ['girl', 'GIRL_OBL'], ['wolf', 'WOLF_OBL']].map(([k, d]) => [k, JSON.parse(readFileSync(join(ROOT, 'assets/chars', d, 'frames.json'), 'utf8'))]));
const run = (kind, state, sec, opt, flip = 1) => {
  const f = enterState(makeFigure(kind, flip), state, opt), seen = [];
  for (let t = 0; t < sec; t += TICK) seen.push(stepFigure(DEFS[kind], f));
  return seen;
};

test('お試し: 全部の状態を 3 人とも出せて、出る動きと絵のコマが絵の中にある', () => {
  const want = { idle: 'idle', run: 'run', walk: 'walk', dead: 'knockdown', wave: 'wave', sit: 'sit', carried: 'hurt' };
  for (const kind of Object.keys(DEFS)) for (const s of DEMO_STATES) for (const flip of [1, -1]) {
    const seen = run(kind, s.key, 4, {}, flip);
    for (const st of seen) {
      assert.ok(DEFS[kind].motions[st.motion], `${kind} ${s.key}`);
      assert.ok(st.frame >= 0 && st.frame < DEFS[kind].motions[st.motion].frames, `${kind} ${s.key} frame`);
      assert.equal(st.flip, flip, '左向きは flip -1');
    }
    if (want[s.key]) assert.equal(seen.at(-1).motion, want[s.key], `${kind} ${s.key}`);
  }
});

test('お試し: 少女の倒れる→起きる。ゲームの速さは反応のあとも起き上がりを流し、絵の速さは絵のとおりの長さ', () => {
  const g = run('girl', 'down', 9, {}), motions = g.map(s => s.motion);
  assert.ok(motions.includes('knockdown') && motions.includes('getup') && motions.at(-1) === 'idle');
  const gameEnd = motions.indexOf('idle') * TICK;
  const n = run('girl', 'down', 10, { native: true }), nm = n.map(s => s.motion), nativeEnd = nm.indexOf('idle') * TICK;
  assert.ok(Math.abs(nativeEnd - 8.7) < 0.15, `絵の速さは約 8.7 秒（${nativeEnd}）`);
  assert.ok(gameEnd < nativeEnd * 0.7 && gameEnd > 3, `ゲームの速さは短いが早送りしすぎない（${gameEnd}）`);
});

test('お試し: 横から見た獣人（WOLF。斜めでない時）も全部の状態を出せる', () => {
  const W = JSON.parse(readFileSync(join(ROOT, 'assets/chars/WOLF/frames.json'), 'utf8'));
  for (const s of DEMO_STATES) {
    const f = enterState(makeFigure('wolf', 1), s.key, {});
    for (let t = 0; t < 3; t += TICK) { const st = stepFigure(W, f); assert.ok(W.motions[st.motion], s.key); assert.ok(st.frame >= 0 && st.frame < W.motions[st.motion].frames, s.key); }
  }
});
