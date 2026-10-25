// v0.8.0：ステージ 17「よあけの こうや」（すすむ ほど あかるく なる）
import test from 'node:test';
import assert from 'node:assert/strict';
import { STAGES, ENEMIES, BOSSES, DAWN_KEYS, dawnAt, stageProgress } from '../js/rules.js';
import { Game, botInput } from '../js/game.js';

const I = STAGES.findIndex((s) => s.theme === 'dawn'), S = STAGES[I];
test('ステージ17：よあけ・すぐ あそべる', () => {
  assert.ok(STAGES.length >= 17); assert.equal(I, 16);
  assert.equal(S.id, 17); assert.equal(S.free, true); assert.equal(S.boss.id, 'sunscorp');
  assert.equal(BOSSES.sunscorp.kit, 'scorpion'); assert.equal(BOSSES.sunscorp.blood, 'green');
});
test('あかるさ：はじめ < まんなか < おわり', () => {
  const a = dawnAt(0), b = dawnAt(0.5), c = dawnAt(1);
  assert.ok(a.light < b.light && b.light < c.light, `${a.light} ${b.light} ${c.light}`);
  assert.ok(a.dark >= 0.5 && c.dark < 0.05);
  assert.ok(a.sunY > b.sunY && b.sunY > c.sunY, 'たいようが のぼる');
  let prev = -1; for (let p = 0; p <= 1.0001; p += 0.02) { const L = dawnAt(p).light; assert.ok(L >= prev - 1e-9); prev = L; }
  assert.ok(DAWN_KEYS.length >= 3);
});
test('すすみぐあい：スタート 0・ボス 1', () => {
  assert.equal(stageProgress(S, 0), 0); assert.equal(stageProgress(S, S.boss.x), 1);
  assert.ok(Math.abs(stageProgress(S, (300 + S.boss.x) / 2) - 0.5) < 1e-9);
});
test('こうやの てき 4しゅるい（かな・みどりの ち）', () => {
  for (const id of ['nomad', 'outlaw', 'scorp', 'rockz']) {
    const e = ENEMIES[id]; assert.ok(e, id); assert.equal(e.blood, 'green', id);
    assert.doesNotMatch(e.name, /[\u4e00-\u9fff]/); assert.match(e.name, /[\u3040-\u30ff]/);
  }
  for (const n of [S.sub, BOSSES.sunscorp.name]) { assert.doesNotMatch(n, /[\u4e00-\u9fff]/); assert.match(n, /[\u3040-\u30ff]/); }
  for (const a of S.arenas) for (const w of a.waves) for (const id of w) assert.ok(ENEMIES[id], id);
});
test('プレイ中に だんだん あかるく なって クリア', () => {
  const g = new Game(I, { viewW: 667, seed: 5, allies: true }); const mem = {};
  assert.ok(g.dawn); const L0 = g.dawn.light;
  let Lmid = null, Lboss = null;
  for (let i = 0; i < 60 * 900 && g.state !== 'clear'; i++) {
    g.update(1 / 60, botInput(g, mem)); g.drainEvents();
    if (Lmid == null && g.player.x > (300 + S.boss.x) / 2) Lmid = g.dawn.light;
    if (g.boss && Lboss == null) Lboss = g.dawn.light;
    if (g.state === 'over') g.continueGame();
  }
  assert.equal(g.state, 'clear');
  assert.ok(L0 < Lmid && Lmid < Lboss, `${L0} ${Lmid} ${Lboss}`);
  assert.ok(Lboss > 0.85);
});
