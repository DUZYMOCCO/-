import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { EnemyGrid, nearestN } from '../js/grid.js';
import { adaptQuality, newQuality, QUALITY } from '../js/rules.js';

// きまった らんすう
function rng(seed) { let a = seed; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function crowd(R, n) {
  return Array.from({ length: n }, () => ({ x: (R() - 0.5) * 1600, y: (R() - 0.5) * 1600, T: { r: R() < 0.05 ? 60 : 10 + R() * 14 } }));
}

test('EnemyGrid.query: ぜんぶ しらべた ときと おなじ てきが おなじ じゅんばんで あたる', () => {
  const R = rng(3), g = new EnemyGrid();
  for (let round = 0; round < 30; round++) {
    const list = crowd(R, 150);
    g.build(list);
    for (let q = 0; q < 40; q++) {
      const x = (R() - 0.5) * 1800, y = (R() - 0.5) * 1800, rad = R() * 260;
      const brute = list.filter(e => (e.x - x) ** 2 + (e.y - y) ** 2 <= (rad + e.T.r) ** 2);
      const fast = g.query(x, y, rad, []).filter(e => (e.x - x) ** 2 + (e.y - y) ** 2 <= (rad + e.T.r) ** 2);
      assert.deepEqual(fast, brute);
      assert.equal(new Set(g.query(x, y, rad, [])).size, g.query(x, y, rad, []).length, 'おなじ てきが 2かい でない');
    }
  }
});

test('EnemyGrid: マイナスの ばしょ・とおくの ばしょ でも だいじょうぶ、build で まえの けっかが のこらない', () => {
  const g = new EnemyGrid();
  g.build([{ x: -100000, y: 99999, T: { r: 10 } }]);
  assert.equal(g.query(-100000, 99999, 5, []).length, 1);
  g.build([]);
  assert.equal(g.query(-100000, 99999, 5, []).length, 0);
});

test('nearestN: むかしの map/filter/sort と おなじ けっか', () => {
  const R = rng(9);
  const old = (list, p, n, lim) => list.map(e => [e, (e.x - p.x) ** 2 + (e.y - p.y) ** 2]).filter(([, d]) => d < lim)
    .sort((a, b) => a[1] - b[1]).slice(0, n).map(([e]) => e);
  for (let round = 0; round < 200; round++) {
    const list = crowd(R, Math.floor(R() * 160));
    // おなじ きょりの てきも まぜる
    if (list.length > 4) { list[3].x = list[1].x; list[3].y = list[1].y; }
    const p = { x: (R() - 0.5) * 400, y: (R() - 0.5) * 400 }, n = 1 + Math.floor(R() * 12), lim = (200 + R() * 600) ** 2;
    assert.deepEqual(nearestN(list, p, n, lim), old(list, p, n, lim));
  }
  assert.deepEqual(nearestN([{ x: 0, y: 0 }], { x: 0, y: 0 }, 0, 1), []);
});

test('adaptQuality: おもい ときだけ かるい モード、もどるのは しばらく かるく なってから', () => {
  const q = newQuality();
  for (let i = 0; i < 300; i++) adaptQuality(q, 16.7);
  assert.equal(q.lite, false, '60fps は ふつう');
  for (let i = 0; i < 300; i++) adaptQuality(q, 33.3);
  assert.equal(q.lite, true, '30fps が つづくと かるい モード');
  adaptQuality(q, 1000); assert.equal(q.lite, true, 'タブを もどした ときの ながい フレームは むし');
  let t = 0;
  while (q.lite && t < 60) { adaptQuality(q, 16.7); t += 0.0167; }
  assert.equal(q.lite, false);
  assert.ok(t >= QUALITY.hold, 'すぐには もどらない');
  // また おもく なったら、つぎは もっと ながく まつ
  for (let i = 0; i < 300; i++) adaptQuality(q, 40);
  assert.equal(q.lite, true);
  assert.equal(q.hold, QUALITY.hold * 2);
  for (let k = 0; k < 10; k++) { for (let i = 0; i < 2000 && q.lite; i++) adaptQuality(q, 10); for (let i = 0; i < 300; i++) adaptQuality(q, 40); }
  assert.ok(q.hold <= QUALITY.maxHold);
});

test('stage.js は ゲームの らんすうを つかわない・shots の filter を まいフレーム しない', () => {
  const src = fs.readFileSync(new URL('../js/stage.js', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
  assert.equal(/Math\.random/.test(src), false);
  assert.equal(/shots\.filter/.test(src), false);
  assert.equal(/getAnimations/.test(src.split('shake(')[1] || ''), false, 'shake で getAnimations を よばない');
});

test('sw-assets に grid.js が はいっている', () => {
  const src = fs.readFileSync(new URL('../sw-assets.js', import.meta.url), 'utf8');
  assert.match(src, /js\/grid\.js/);
});
