import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, botInput, BLOOD } from '../js/game.js';

function hue(hex) {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (!d) return -1;
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

test('ちの いろは みどり／むらさき だけ', () => {
  assert.deepEqual(Object.keys(BLOOD).sort(), ['green', 'purple']);
  for (const c of BLOOD.green) { const h = hue(c); assert.ok(h > 80 && h < 160, c); }
  for (const c of BLOOD.purple) { const h = hue(c); assert.ok(h > 260 && h < 300, c); }
});

function play(stage, allies, seed) {
  const g = new Game(stage, { viewW: 667, seed, allies }); const mem = {};
  let bossSeen = false, maxParts = 0;
  for (let i = 0; i < 60 * 900 && g.state !== 'clear'; i++) {
    g.update(1 / 60, botInput(g, mem));
    for (const e of g.drainEvents()) assert.ok(e && e.type, 'event');
    if (g.boss) bossSeen = true;
    maxParts = Math.max(maxParts, g.parts.length);
    if (g.state === 'over') g.continueGame();
  }
  return { g, bossSeen, maxParts };
}

for (let stage = 0; stage < 16; stage++) for (const allies of [true, false]) {
  test(`じどう プレイで ステージ${stage + 1} を クリア（なかま ${allies ? 'あり' : 'なし'}）`, () => {
    const { g, bossSeen, maxParts } = play(stage, allies, 11 + stage);
    assert.ok(bossSeen, 'ボスが でた');
    assert.equal(g.state, 'clear');
    assert.ok(g.result.score > 0 && g.result.kills > 5);
    assert.ok(maxParts <= 260, 'パーティクル じょうげん');
    assert.ok(g.bullets.length < 400 && g.enemies.length < 40, 'じょうげん');
  });
}

test('ちいさい がめん はば でも うごく', () => {
  const g = new Game(0, { viewW: 480, seed: 3, allies: true }); const mem = {};
  for (let i = 0; i < 60 * 30; i++) { g.update(1 / 60, botInput(g, mem)); g.drainEvents(); }
  assert.ok(g.player.x > 200);
});
