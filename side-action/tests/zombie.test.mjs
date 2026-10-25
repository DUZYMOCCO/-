import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../js/game.js';
import { ENEMIES, STAGES, VERSION } from '../js/rules.js';

const Z = ['zombie', 'labz', 'guard', 'soldierz', 'bloatz', 'leaper', 'hulk', 'spitter'];

test('v0.8.0：ゾンビ 8しゅるい（かな の なまえ・みどり／むらさき の ち）', () => {
  assert.equal(VERSION, '0.9.0');
  for (const k of Z) {
    const d = ENEMIES[k];
    assert.ok(d, k);
    assert.ok(/^[ぁ-んァ-ヶー 　]+$/.test(d.name), d.name);
    assert.ok(['green', 'purple'].includes(d.blood), k);
    assert.ok(['grunt', 'gunner', 'crawler'].includes(d.ai), k);
  }
  assert.ok(ENEMIES.soldierz.helmetHp > 0 && ENEMIES.soldierz.volley > 1);
  assert.ok(ENEMIES.spitter.spit && ENEMIES.guard.hp > ENEMIES.zombie.hp && ENEMIES.hulk.armor > 0);
});

test('ゾンビは 5つの ステージ ぜんぶに でる', () => {
  for (const s of STAGES) {
    const ids = s.arenas.flatMap((a) => a.waves.flat());
    for (const id of ids) assert.ok(ENEMIES[id], id);
    if (!s.horde) assert.ok(ids.some((id) => Z.includes(id)), s.name); // v0.9：とびらの そうこ は スーツの てき
  }
  const ids = (n) => STAGES[n].arenas.flatMap((a) => a.waves.flat());
  assert.ok(ids(0).includes('guard') && ids(0).includes('labz'));
  assert.ok(ids(2).includes('zombie') && ids(2).includes('soldierz'));
  assert.ok(['bloatz', 'leaper', 'spitter'].every((k) => ids(3).includes(k)));
});

function setup(type) {
  const g = new Game(2, { viewW: 667, seed: 3, allies: false });
  g.enemies.length = 0;
  const e = g.spawnEnemy(type, 1, 0);
  e.spawnT = 0; e.x = g.player.x + 240; e.y = g.player.y; e.onGround = true;
  return { g, e };
}

test('ぐんじん ゾンビ：ヘルメットが たまを ふせぐ、こわれる', () => {
  const { g, e } = setup('soldierz');
  const M = { knock: 60 };
  g.damage(e, 10, M, -1, 'p', false);
  assert.ok(Math.abs(e.hp - (44 - 3)) < 1e-6, 'たまは 7わり ふせぐ');
  assert.ok(e.helmetHp < 24);
  for (let i = 0; i < 4; i++) g.damage(e, 10, M, -1, 'p', false);
  assert.equal(e.helmetHp, 0);
  const hp = e.hp; g.damage(e, 10, M, -1, 'p', false);
  assert.ok(Math.abs(hp - e.hp - 10) < 1e-6, 'こわれたら ぜんぶ あたる');
});

test('ぐんじん ゾンビ：ねらいの あまい れんしゃ（3ぱつ）', () => {
  const { g, e } = setup('soldierz');
  e.cool = 0; e.tgt = g.player; let shots = 0;
  for (let i = 0; i < 180; i++) { g.updateEnemy(e, 1 / 60); shots = Math.max(shots, g.bullets.filter((b) => b.owner === 'e' && b.w === 'tracer').length); if (e.state === 'walk' && shots) break; }
  assert.equal(shots, 3);
});

test('はきだし ゾンビ：むらさきの さん が じめんに のこる', () => {
  const { g, e } = setup('spitter');
  e.cool = 0; e.tgt = g.player;
  g.player.invT = 99; g.player.inv = 99;
  let acid = false;
  for (let i = 0; i < 240 && !acid; i++) { g.update(1 / 60, {}); acid = g.hazards.some((h) => h.kind === 'acid'); }
  assert.ok(acid);
});
