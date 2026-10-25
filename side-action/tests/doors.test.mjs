// v0.9.0：ステージ 18「とびらの そうこ」（ドアから てきが どんどん でてくる）
import test from 'node:test';
import assert from 'node:assert/strict';
import { STAGES, ENEMIES, BOSSES, VERSION } from '../js/rules.js';
import { Game, botInput, BLOOD } from '../js/game.js';
import { DOOR_KINDS } from '../js/horde.js';

const I = STAGES.findIndex((s) => s.theme === 'doors'), S = STAGES[I];
const types = () => [...new Set([...S.rooms.flatMap((r) => [...r.mix, ...(r.tough || [])]), ...S.bossMix])];

test('ステージ18：すぐ あそべる・てきの かず', () => {
  assert.equal(VERSION, '0.10.0');
  assert.equal(I, 17); assert.equal(S.id, 18); assert.equal(S.free, true); assert.equal(S.boss.id, 'doorboss');
  const total = S.rooms.reduce((s, r) => s + r.quota, 0) + S.bossCalls;
  assert.ok(total >= 150 && total <= 250, `total ${total}`);
  assert.ok(S.cap >= 15 && S.cap <= 25);
  for (const r of S.rooms) { assert.ok(r.doors.length >= 2); for (const [, k] of r.doors) assert.ok(DOOR_KINDS[k], k); }
  assert.ok(S.pickups.filter(([, k]) => k === 'shotgun').length >= 3, 'ショットガンが おちている');
});

test('ちは みどり だけ（あかい ち なし）', () => {
  for (const id of types()) { assert.ok(ENEMIES[id], id); assert.equal(ENEMIES[id].blood, 'green', id); }
  assert.equal(BOSSES.doorboss.blood, 'green');
  const g = new Game(I, { viewW: 667, seed: 4, allies: false }); const mem = {};
  for (let i = 0; i < 60 * 70; i++) { g.update(1 / 60, botInput(g, mem)); g.drainEvents(); if (g.state === 'over') g.continueGame(); }
  assert.ok(g.splats.length > 20);
  for (const s of g.splats) assert.ok(BLOOD.green.includes(s.color), s.color);
});

function run(seed, allies) {
  const g = new Game(I, { viewW: 667, seed, allies }); const mem = {};
  let calls = 0, maxAlive = 0, maxParts = 0, maxSplat = 0, bossSeen = false, summons = 0;
  const sp = g.spawnEnemy.bind(g); g.spawnEnemy = (...a) => { calls++; return sp(...a); };
  const unlock = [];
  for (let i = 0; i < 60 * 900 && g.state !== 'clear'; i++) {
    g.update(1 / 60, botInput(g, mem));
    for (const e of g.drainEvents()) if (e.type === 'snap') summons++;
    let a = 0; for (const e of g.enemies) if (!e.dead) a++;
    maxAlive = Math.max(maxAlive, a); maxParts = Math.max(maxParts, g.parts.length); maxSplat = Math.max(maxSplat, g.splats.length);
    if (g.boss) bossSeen = true;
    for (const R of g.horde.rooms) if (R.state === 'done' && !unlock.includes(R.i)) unlock.push(R.i);
    if (g.state === 'over') g.continueGame();
  }
  return { g, calls, maxAlive, maxParts, maxSplat, bossSeen, summons, unlock };
}

test('ドアから でて・じょうげん まで・ぜんぶ でて・クリア', () => {
  const r = run(11, false), H = r.g.horde;
  assert.equal(r.g.state, 'clear');
  assert.equal(r.calls, H.spawned, 'てきは ドア からだけ');
  assert.equal(H.spawned, H.total, 'ぜんぶ でた');
  assert.ok(H.total >= 150 && H.total <= 250);
  assert.ok(r.maxAlive >= 15 && r.maxAlive <= S.cap, `maxAlive ${r.maxAlive}`);
  assert.ok(r.bossSeen && r.summons >= 2, 'ボスが よぶ');
  assert.ok(r.g.reused > 100, 'つかいまわし');
  assert.ok(r.maxParts <= 260 && r.maxSplat <= 150, 'iPhone SE2 じょうげん');
});

test('へやを かたづけると つぎが ひらく（じゅんばん）', () => {
  const r = run(28, true), H = r.g.horde;
  assert.equal(r.g.state, 'clear');
  assert.deepEqual(r.unlock, S.rooms.map((_, i) => i));
  for (const R of H.rooms) if (R.gateR) assert.ok(R.gateR.open > 0.9);
  assert.ok(r.maxAlive <= S.cap);
});

test('ドアは まえに すすむまで ひらかない', () => {
  const g = new Game(I, { viewW: 667, seed: 3, allies: false });
  for (let i = 0; i < 60 * 3; i++) { g.update(1 / 60, {}); g.drainEvents(); }
  assert.equal(g.horde.spawned, 0);
  assert.ok(g.horde.doors.every((d) => d.st === 'shut'));
});

test('けりで ドミノ', () => {
  const g = new Game(I, { viewW: 667, seed: 3, allies: false });
  g.enemies.length = 0;
  const x0 = g.player.x + 120, es = [0, 1, 2].map((k) => { const e = g.spawnEnemy('suit', 1, 0); e.spawnT = 0; e.doorIn = 0; e.x = x0 + k * 20; e.y = g.player.y; e.onGround = true; return e; });
  es[0].state = 'air'; es[0].vx = 520; es[0].vy = -150; es[0].onGround = false; es[0].y -= 20;
  for (let i = 0; i < 20; i++) { g.update(1 / 60, {}); g.drainEvents(); }
  assert.ok(es[1].hp < es[1].maxHp || es[1].dead, 'となりも たおれる');
});
