// v1.0.2 物語のミサイル（js/sim/strike.js）と、その見た目（js/render/strike-view.js・fx-events.js）の小さな確かめ
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createSim, runSim, stepSim, hashSim, KINDS, TICK } from '../js/sim/sim.js?v=30';
import { MISSION_1 } from '../js/sim/mission.js?v=10';
import { TILE } from '../js/sim/map.js?v=6';
import { STORY_1 } from '../js/story/story-mission.js?v=3';
import { STRIKE, SURVEY, STRIKE_COMMANDS, STRIKE_MESSAGES, canHitch, canStrike, issueStrike, issueUnhitch, launcherOf, nejiOf, strikeStatus, strikeHashValues } from '../js/sim/strike.js?v=2';
import { strikeCountdown, missilePos } from '../js/render/strike-view.js?v=2';
import { spawnFxEvents, STRIKE_BURSTS } from '../js/render/fx-events.js?v=17';

const dug = () => { const sim = createSim({ seed: 2, mission: STORY_1 }); sim.mission.salvage[sim.strike.pile].amount = 0; stepSim(sim); return sim; };

test('ミサイルの数: 射程 12 マス・準備 4 秒・飛ぶ 3 秒・爆発の半径 3 マス・ひっぱると 0.75 倍の速さ・敵が 5 マス以内だと調べられない', () => {
  assert.equal(STRIKE.rangeTiles, 12); assert.equal(STRIKE.setupSec, 4); assert.equal(STRIKE.flightSec, 3);
  assert.equal(STRIKE.radius, 3 * TILE); assert.equal(STRIKE.towMul, 0.75); assert.equal(SURVEY.blockTiles, 5);
  assert.deepEqual([...STRIKE_COMMANDS], ['hitch', 'unhitch', 'strike']);
  for (const k of ['notReady', 'noNeji', 'far', 'range', 'towing', 'notTowing']) assert.ok(STRIKE_MESSAGES[k], k);
});

test('発射台: 掘り出す前はつなげない・撃てない。掘り出すと物（object）として出て、選べない・ロボの数に入らない', () => {
  const sim = createSim({ seed: 2, mission: STORY_1 });
  assert.equal(canHitch(sim).reason, 'notReady'); assert.equal(canStrike(sim, 0, 0).reason, 'notReady');
  assert.equal(issueUnhitch(sim).ok, false);
  assert.equal(KINDS.launcher.object, true);
  sim.mission.salvage[sim.strike.pile].amount = 0; stepSim(sim);
  const l = launcherOf(sim);
  assert.equal(sim.strike.phase, 'ready'); assert.equal(l.side, 'ally'); assert.equal(l.object, true);
  assert.ok(sim.fx.some(f => f.type === 'missileFound'));
  assert.equal(canStrike(sim, l.x + (STRIKE.rangeTiles + 0.5) * TILE, l.y).reason, 'range', '射程の外');
  assert.equal(canStrike(sim, l.x + (STRIKE.rangeTiles - 0.5) * TILE, l.y).ok, true);
});

test('撃つ: 準備（発射台は止まる）→ 飛ぶ（発射台は消える）→ 落ちる。強さは真ん中 600・はしで 200、範囲の外は無傷', () => {
  const sim = dug(), l = launcherOf(sim);
  sim.units = sim.units.filter(u => u.side !== 'enemy' || u.label === '見張り');
  const [a, b, c] = sim.units.filter(u => u.label === '見張り');
  const tx = l.x + 6 * TILE, ty = l.y;
  for (const [u, dx] of [[a, 0], [b, STRIKE.radius - 1], [c, STRIKE.radius + 10]]) { u.x = tx + dx; u.y = ty; u.hp = u.maxHp = 5000; u.atk = 0; u.order = null; }
  for (const g of sim.groups) g.route = g.route.slice(0, 1);
  assert.equal(issueStrike(sim, tx, ty).ok, true);
  stepSim(sim);
  assert.equal(sim.strike.phase, 'arming');
  assert.ok(Math.abs(strikeCountdown(sim.strike) - 1) < 0.02);
  runSim(sim, Math.ceil(STRIKE.setupSec / TICK));
  assert.equal(sim.strike.phase, 'flying'); assert.equal(launcherOf(sim), null, '飛び立ったら発射台は消える');
  assert.ok(sim.fx.some(f => f.type === 'strikeLaunch'));
  const hp = [a, b, c].map(u => u.hp);
  const pin = [[a, 0], [b, STRIKE.radius - 1], [c, STRIKE.radius + 10]]; // 敵が歩いて行かないよう、毎ステップ元の場所へ戻す
  for (let i = 0; i < 200 && sim.strike.phase !== 'spent'; i++) { for (const [u, dx] of pin) { u.x = tx + dx; u.y = ty; } stepSim(sim); }
  assert.equal(sim.strike.phase, 'spent');
  const lost = [a, b, c].map((u, i) => hp[i] - u.hp);
  assert.ok(lost[0] >= 400 && lost[0] <= STRIKE.dmgMax, `真ん中 ${lost[0]}`); // 地形の守りで少し減ることがある
  assert.ok(lost[1] >= 100 && lost[1] <= STRIKE.dmgMin + 5, `はし ${lost[1]}`);
  assert.ok(lost[2] < 50, `範囲の外 ${lost[2]}`);
  assert.equal(strikeCountdown(sim.strike), null);
  const hit = sim.fx.find(f => f.type === 'strikeHit'); assert.equal(hit.r, STRIKE.radius);
  assert.equal(strikeStatus(sim).phase, 'spent');
});

test('ミサイルの飛ぶ道: 発射台から出て、目標に落ちる（真ん中は高い）', () => {
  const S = { from: { x: 0, y: 0 }, target: { x: 300, y: 0 } };
  assert.deepEqual([missilePos(S, 0).x, Math.round(missilePos(S, 0).y)], [0, 0]);
  assert.ok(Math.abs(missilePos(S, 1).x - 300) < 1e-9 && Math.abs(missilePos(S, 1).y) < 1e-6);
  assert.ok(missilePos(S, 0.5).y < -100);
});

test('ハッシュ: 物語の仕掛けがある時だけ混ぜる。MISSION_1（seed 1〜5）は 300 tick 後も今の値のまま', () => {
  const want = ['6cc93eb6', '2a60b985', '24994a28', '5558d677', '6e46d4aa'];
  for (let seed = 1; seed <= 5; seed++) { const s = createSim({ seed, mission: MISSION_1 }); runSim(s, 300); assert.equal(s.strike, undefined); assert.equal(hashSim(s), want[seed - 1], `seed ${seed}`); }
  const a = dug(), b = dug();
  assert.equal(hashSim(a), hashSim(b));
  assert.ok(strikeHashValues(a).length > 0);
  launcherOf(b).x += 1; assert.notEqual(hashSim(a), hashSim(b), '発射台の位置もハッシュに入る');
});

test('演出: 撃った・落ちた・壊された の合図で爆発を出す（落ちた時は重ねて STRIKE_BURSTS 個）。発射台の boom はロボの倒れる演出にしない', () => {
  const calls = [], fake = { after: (t, f) => { calls.push(['after', t]); f(); }, hit: (k, x, y, o) => calls.push(['hit', k, o.w]) };
  const view = { onScreen: () => 1, visible: () => true, px: () => 40 };
  spawnFxEvents(fake, { fx: [{ type: 'strikeHit', x: 100, y: 100, r: 96, side: 'ally' }] }, new WeakSet(), view);
  assert.equal(calls.filter(c => c[0] === 'hit').length, 1 + STRIKE_BURSTS);
  assert.equal(calls[0][1], 'explosion');
  calls.length = 0;
  spawnFxEvents(fake, { fx: [{ type: 'strikeLaunch', x: 0, y: 0, side: 'ally' }, { type: 'launcherLost', x: 0, y: 0, side: 'ally' }] }, new WeakSet(), view);
  assert.equal(calls.filter(c => c[0] === 'hit').length, 2);
  calls.length = 0;
  spawnFxEvents(fake, { fx: [{ type: 'boom', x: 0, y: 0, side: 'ally', kind: 'launcher' }] }, new WeakSet(), view);
  assert.equal(calls.length, 0);
});

test('描画: 発射台の絵はコードで描く（renderer が strike-view を読む）・コックピットの中の絵は使わない', () => {
  const src = readFileSync(fileURLToPath(new URL('../js/render/renderer.js?v=47', import.meta.url)), 'utf8');
  assert.match(src, /strike-view\.js\?v=\d+/);
  assert.match(src, /launcher: LAUNCHER_PX/);
  assert.match(src, /drawStrike\(/);
  const ops = readFileSync(fileURLToPath(new URL('../js/story/story-ops.js', import.meta.url)), 'utf8');
  assert.doesNotMatch(ops, /cockpit/i);
});


test('第1章の着弾の与ダメージと撃破をネジの成績に数える', async () => {
  const { createUnitStats } = await import('../js/stats/unit-stats.js?v=4');
  const sim = dug(), neji = nejiOf(sim);
  const e = sim.units.find(u => u.side === 'enemy');
  e.atk = 0; e.hp = 1; e.x = neji.x + 150; e.y = neji.y;
  sim.strike.phase = 'flying'; sim.strike.target = {x: e.x, y: e.y}; sim.strike.flightT = STRIKE.flightSec - TICK / 2;
  const stats = createUnitStats(); stats.observe(sim); stepSim(sim); stats.observe(sim); stats.observe(sim);
  const row = stats.summary().rows.find(r => r.id === neji.id);
  assert.ok(row.dealt > 0); assert.ok(row.kills >= 1);
});
