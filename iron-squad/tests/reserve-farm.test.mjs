import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fieldBlocks } from '../js/world.js';
import { drawFieldSoldier } from '../js/visuals.js';
import {
  RESERVE_CAP, FARM_X, FARM_Y, farmPosts, farmOverlaps, reinforcementCount,
  reserveRosterLine, reserveRosterTitle
} from '../js/reserve-farm.js';

const packages = process.argv[2] || 'C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const { createCanvas } = createRequire(resolve(packages, 'entry.cjs'))('@napi-rs/canvas');

assert.equal(reinforcementCount(48, 0, 48), 5);
assert.equal(reinforcementCount(10, 0, 48), 38);
assert.equal(reinforcementCount(48, 46, 48), 2);
assert.equal(reinforcementCount(48, 48, 48), 0);
assert.equal(reinforcementCount(48, 120, 48), 0);
assert.equal(reinforcementCount(40, 50, 48), 0);
assert.equal(reinforcementCount(48, 47, 48, 5), 1);

const memory = new Map();
globalThis.localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v), removeItem: k => memory.delete(k) };
globalThis.window = {};
globalThis.document = { getElementById: () => null };
const { IronSquadGame, DEPLOYMENT_CAPACITY } = await import('../js/index.js');
const game = Object.create(IronSquadGame);
for (const name of ['recalcSoldierStats', 'recalcPlayerStats', 'updateStatsUI', 'updateQuestUI', 'startGameLoop', 'showToast', 'spawnSparks', 'spawnDamageText', 'renderStrategyUI']) game[name] = () => {};
const { saveSlots } = await import('../js/save-slots.js');
game.activeSlotId = saveSlots.create('予備兵の畑').id;
game.startFreshGame(false);
assert.equal(game.squad.filter(s => !s.dead).length, DEPLOYMENT_CAPACITY);
game.reserves = [];
for (let i = 0; i < RESERVE_CAP - 2; i++) game.reserves.push(game.createNewSoldier());
assert.equal(game.supplyReinforcements().received, 2);
assert.equal(game.reserves.length, RESERVE_CAP);
assert.equal(game.supplyReinforcements().received, 0);
assert.equal(game.reserves.length, RESERVE_CAP);
game.reserves.push(game.createNewSoldier());
assert.equal(game.supplyReinforcements().received, 0);
assert.equal(game.reserves.length, RESERVE_CAP + 1);

const kept = [];
for (let i = 0; i < 120; i++) {
  const soldier = game.createNewSoldier();
  soldier.id = `farm-${String(i).padStart(3, '0')}`;
  kept.push(soldier);
}
kept.push({ id: 'gone', dead: true });
game.reserves = kept;
const ids = kept.map(s => s.id);
assert.equal(game.supplyReinforcements().received, 0);
assert.deepEqual(game.reserves.map(s => s.id), ids);
assert.equal(game.squad.length, DEPLOYMENT_CAPACITY);

const posts = farmPosts(game.reserves);
assert.equal(posts.length, 120);
assert.equal(new Set(posts.map(p => `${p.x}|${p.y}`)).size, 120);
for (const post of posts) {
  assert.equal(fieldBlocks(post.x, post.y), false);
  assert.ok(post.x >= FARM_X + 250);
  assert.ok(post.y >= FARM_Y - 70);
  assert.ok(['hoe', 'basket', 'tend'].includes(post.pose));
}
const shuffled = farmPosts([...game.reserves].reverse());
assert.deepEqual(shuffled.map(p => [p.soldier.id, p.x, p.y]), posts.map(p => [p.soldier.id, p.x, p.y]));
assert.equal(farmOverlaps(120, FARM_X, FARM_Y, 360, 420), true);
assert.equal(farmOverlaps(120, FARM_X - 3400, FARM_Y - 2400, 400, 500), false);
assert.equal(reserveRosterLine(48, 48, 120, 120, { received: 0, deployed: 0 }).includes('最低'), false);
assert.match(reserveRosterLine(48, 48, 120, 120, { received: 0, deployed: 0 }), /120\/48/);
assert.match(reserveRosterLine(48, 48, 120, 120, null), /川辺の農村/);
assert.match(reserveRosterLine(48, 48, 10, 10, null), /川辺の農村/);
assert.match(reserveRosterLine(48, 48, 0, 0, null), /自動補充/);
assert.equal(reserveRosterTitle(0), '本陣の予備兵 0名（欠員時に合流）');
assert.match(reserveRosterTitle(120), /川辺の農村の予備兵 120名/);

function near(data, rgb, limit = 12) {
  let best = Infinity;
  let count = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue;
    const dist = Math.hypot(data[i] - rgb[0], data[i + 1] - rgb[1], data[i + 2] - rgb[2]);
    if (dist < best) best = dist;
    if (dist <= limit) count++;
  }
  return { hit: best <= limit, count };
}

function paint(pose, simple, armorTier) {
  const canvas = createCanvas(240, 240);
  const c = canvas.getContext('2d');
  c.translate(120, 150);
  c.scale(4, 4);
  drawFieldSoldier(c, {
    id: 'paint', x: 0, y: 0, hp: 40, maxHp: 40, soldierClass: 'HEAVY', facingAngle: 0.2,
    farmPose: pose, animOffset: 0, vx: 0, vy: 0,
    equipped: armorTier ? { armor: { tier: armorTier }, helmet: { tier: armorTier } } : {}
  }, 0, { isAdvanced: false, name: '重装兵' }, '#829cae', simple);
  return c.getImageData(0, 0, 240, 240).data;
}

for (const simple of [false, true]) {
  const hoe = paint('hoe', simple, 1);
  const basket = paint('basket', simple, 1);
  assert.ok(near(hoe, [127, 150, 97]).hit, 'farmers stand in a crop row');
  assert.ok(near(hoe, [106, 83, 64]).hit, 'a hoe is wooden');
  assert.ok(near(basket, [141, 104, 68]).hit, 'a basket is carried');
  assert.ok(near(paint('tend', simple, 1), [127, 150, 97]).hit, 'tending still reads as a field');
}
const standing = paint(null, false, 1);
const farmSoil = near(paint('hoe', false, 1), [92, 78, 50], 8);
assert.ok(farmSoil.count > near(standing, [92, 78, 50], 8).count + 40, 'the furrow is soil, not boot leather');

function chest(tier) {
  const canvas = createCanvas(80, 80);
  const c = canvas.getContext('2d');
  c.translate(40, 58);
  c.scale(2, 2);
  drawFieldSoldier(c, {
    id: 'armor', x: 0, y: 0, hp: 40, maxHp: 40, soldierClass: 'HEAVY', facingAngle: 0.2,
    farmPose: 'hoe', animOffset: 0, equipped: { armor: { tier } }
  }, 0, { isAdvanced: false }, '#829cae', false);
  const data = c.getImageData(28, 18, 20, 14).data;
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue;
    r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
  }
  return [r / n, g / n, b / n];
}
const wood = chest(1);
const steel = chest(17);
assert.ok(Math.hypot(wood[0] - steel[0], wood[1] - steel[1], wood[2] - steel[2]) > 8, 'farm armor keeps the equipped color');

console.log('PASS: reserve cap, farm posts, hoe basket tend');
