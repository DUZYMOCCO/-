import assert from 'node:assert/strict';
import {WORLD_SIZE} from '../js/games/iron-squad/world.js';
import {relocatePeaceMonster, peaceContainment} from '../js/games/iron-squad/peace-zones.js';
import {configureRangedEnemy} from '../js/games/iron-squad/enemy-ranged.js';
import {drawFieldMob} from '../js/games/iron-squad/visuals.js';
import {
  BRUTE_DRAW_SCALE, BRUTE_RADIUS, rollFieldBrute, countFieldBrutes,
  warbandSpawnOrigin, makeDemonWarband, formationStep, stepDemonWarbandGroup,
  advanceDemonWarband, WARBAND_SPAWN_DIST, WARBAND_FIRST_DELAY
} from '../js/games/iron-squad/field-hosts.js';

assert.equal(rollFieldBrute([], 'ZONE_PEACE', () => 0), null);
assert.equal(rollFieldBrute([], 'ZONE_CHAOS', () => 0), null);
assert.equal(rollFieldBrute([], 'ZONE_ABYSS', () => 0), null);
const brute = rollFieldBrute([], 'ZONE_WILD', () => 0);
assert.ok(brute);
assert.equal(brute.type, 'brute');
assert.equal(brute.name, '岩鬼');
assert.equal(brute.radius, BRUTE_RADIUS);
assert.ok(brute.radius >= 11 * 3 && brute.radius <= 11 * 4);
assert.ok(BRUTE_DRAW_SCALE >= 3 && BRUTE_DRAW_SCALE <= 4);
assert.equal(BRUTE_DRAW_SCALE, 3.6);
assert.equal(brute.dropCount, 3);
assert.equal(brute.sureDrop, true);
assert.equal(brute.lootKind, 'elite');
assert.equal(brute.isBoss, false);
assert.equal(brute.fixedKind, true);
assert.ok(brute.speed >= 34 && brute.speed <= 38);
assert.ok(brute.attackReach >= 56 && brute.attackReach <= 70);
assert.equal(rollFieldBrute([], 'ZONE_WILD', () => 0.5), null);
assert.equal(countFieldBrutes([{type:'brute', hp:1}, {type:'brute', hp:1}]), 2);
assert.equal(rollFieldBrute([{type:'brute', hp:1}, {type:'brute', hp:1}], 'ZONE_WILD', () => 0), null);
assert.equal(rollFieldBrute([{type:'brute', hp:0}, {type:'brute', hp:0}], 'ZONE_WILD', () => 0)?.type, 'brute');

const fixed = {type:'brute', name:'岩鬼', fixedKind:true};
configureRangedEnemy(fixed, {random:() => 0});
assert.equal(fixed.type, 'brute');
const goblin = {type:'goblin', name:'g'};
configureRangedEnemy(goblin, {random:() => 0});
assert.notEqual(goblin.type, 'goblin');

const origin = warbandSpawnOrigin({x:0, y:0});
const originDist = Math.hypot(origin.x, origin.y);
assert.ok(Math.abs(originDist - WARBAND_SPAWN_DIST) < 1);
assert.ok(originDist > 1200 && originDist < 8000);

const camp = {x:0, y:0};
const band = makeDemonWarband(camp, 'band');
assert.equal(band.length, 5);
assert.equal(band.filter(m => m.type === 'demon_front').length, 3);
assert.equal(band.filter(m => m.type === 'demon_rear').length, 2);
assert.ok(band.every(m => m.isDemonWarband && m.fixedKind && m.isElite && !m.isBoss && !m.isRaidMob && !m.isDemonInvasion));
assert.ok(band.every(m => m.lootDistance === 16000 && m.sureDrop && m.dropCount === 1 && m.lootKind === 'elite'));
const campDist = m => Math.hypot(m.x - camp.x, m.y - camp.y);
const before = band.reduce((sum, m) => sum + campDist(m), 0) / band.length;
for (let n = 0; n < 8; n++) formationStep(band, 0.5, camp, []);
const after = band.reduce((sum, m) => sum + campDist(m), 0) / band.length;
assert.ok(after < before - 20, 'the line marches toward camp');
const fronts = band.filter(m => m.formationRole === 'front');
const rears = band.filter(m => m.formationRole === 'rear');
const nearestRear = Math.min(...rears.map(campDist));
const farthestFront = Math.max(...fronts.map(campDist));
assert.ok(nearestRear > farthestFront, 'the rear rank stays behind the front');

const marchGame = {monsters:band.map(m => ({...m})), player:{x:9000, y:9000, hp:0}, squad:[], projectiles:[], spawnDamageText(){}};
const marchBefore = marchGame.monsters.reduce((sum, m) => sum + campDist(m), 0) / marchGame.monsters.length;
stepDemonWarbandGroup(marchGame, 1, camp);
const marchAfter = marchGame.monsters.reduce((sum, m) => sum + campDist(m), 0) / marchGame.monsters.length;
assert.ok(marchAfter < marchBefore);
assert.equal(marchGame.projectiles.length, 0, 'a rear line does not shoot with nobody in range');

const clock = {monsters:[], restTimer:0, currentDungeon:null, baseRaidActive:false, invasions:{stage:'idle'}};
advanceDemonWarband(clock, 10, camp, 40);
assert.equal(clock.monsters.length, 0);
assert.ok(clock.demonWarbandTimer > WARBAND_FIRST_DELAY - 11);
advanceDemonWarband(clock, 200, camp, 40);
assert.equal(clock.monsters.filter(m => m.isDemonWarband).length, 5);
const parked = clock.monsters.length;
advanceDemonWarband(clock, 500, camp, 40);
assert.equal(clock.monsters.length, parked, 'one warband at a time');
const full = {monsters:Array.from({length:38}, () => ({hp:1})), demonWarbandTimer:0, restTimer:0, invasions:{stage:'idle'}};
assert.equal(advanceDemonWarband(full, 1, camp, 40), false);
assert.equal(full.demonWarbandTimer, 20);
assert.ok(!full.monsters.some(m => m.isDemonWarband));
const raid = {monsters:[], demonWarbandTimer:0, restTimer:0, baseRaidActive:true, invasions:{stage:'idle'}};
advanceDemonWarband(raid, 5, camp, 40);
assert.equal(raid.monsters.length, 0);
assert.equal(raid.demonWarbandTimer, 0);

const center = WORLD_SIZE / 2;
const visitor = {hp:10, x:center, y:center, isDemonWarband:true, type:'demon_front'};
assert.equal(relocatePeaceMonster(visitor), false);
assert.equal(visitor.x, center);
assert.ok(peaceContainment(visitor.x, visitor.y));
const slime = {hp:10, x:center, y:center, type:'slime'};
assert.equal(relocatePeaceMonster(slime), true);
assert.ok(!peaceContainment(slime.x, slime.y));

let depth = 0;
const canvas = new Proxy({save(){ depth++; }, restore(){ depth--; }}, {get:(target, key) => key in target ? target[key] : () => {}});
for (const type of ['brute', 'demon_front', 'demon_rear']) {
  assert.equal(drawFieldMob(canvas, {type, x:1, hitPulse:0}, 20), true);
  assert.equal(depth, 0, type);
}
assert.equal(drawFieldMob(canvas, {type:'slime', x:1, hitPulse:0, isBoss:false}, 20), true);

const memory = new Map();
globalThis.localStorage = {getItem:k => memory.get(k) ?? null, setItem:(k, v) => memory.set(k, v), removeItem:k => memory.delete(k)};
globalThis.window = {};
globalThis.document = {getElementById:() => null};
const {IronSquadGame} = await import('../js/games/iron-squad/index.js');
const {saveSlots} = await import('../js/games/iron-squad/save-slots.js');
const game = Object.create(IronSquadGame);
for (const method of ['recalcSoldierStats','recalcPlayerStats','updateStatsUI','updateQuestUI','startGameLoop','showToast','spawnSparks','renderStrategyUI']) game[method] = () => {};
game.spawnDamageText = () => {};
game.activeSlotId = saveSlots.create('宿主検証').id;
game.startFreshGame(false);
game.monsters = [];
game.restTimer = 0;
game.currentDungeon = null;
game.colossalBossRespawnTimer = 999;
game.spawnTimer = 0;
game.demonWarbandTimer = null;
game.player.x = center;
game.player.y = center;
game.updateSpawns(2);
assert.ok(!game.monsters.some(m => m.isDemonWarband));
assert.equal(game.monsters.length, 0);
const random = Math.random;
try {
  Math.random = () => 0.05;
  game.spawnMonster(center + 12000, center);
} finally { Math.random = random; }
const spawned = game.monsters[0];
assert.equal(spawned.type, 'brute');
assert.equal(spawned.fixedKind, true);
assert.equal(spawned.dropCount, 3);
assert.equal(spawned.radius, 40);
assert.equal(spawned.isBoss, false);
assert.equal(spawned.activePeriod, null);
assert.ok(spawned.maxHp > 4000, 'a wild brute keeps the same distance scaling as the orcs beside it');
game.dropsOnField = [];
game.killMonster(spawned, game.player, true);
const gear = game.dropsOnField.filter(d => d.item && !d.isAmmo && !d.isMagicStone && !d.isOrb && d.item.type !== 'ORB' && d.item.type !== 'GEM');
assert.equal(gear.length, 3);
assert.ok(gear.every(d => d.item.tier <= 12 && !d.isBoss));
const demon = makeDemonWarband({x:center, y:center}, 'drop')[0];
game.monsters = [demon];
game.dropsOnField = [];
game.killMonster(demon, game.player, true);
const demonGear = game.dropsOnField.filter(d => d.item && !d.isAmmo && !d.isMagicStone && !d.isOrb && d.item.type !== 'ORB');
assert.equal(demonGear.length, 1);
assert.ok(demonGear[0].item.tier <= 16);
assert.ok(demonGear[0].item.tier <= 24);

console.log('PASS: wild brutes, demon formation, peace exemption, vault-safe field drops');
