import assert from 'node:assert/strict';
import { passesWalls } from '../js/class-up-rules.js';
import { attackBlocked, resolveWallMovement, wallGeometry } from '../js/gate-rules.js';
import { fieldBlocks, WORLD_SIZE } from '../js/world.js';
import { dungeonBlocks } from '../js/dungeon.js';
import { IronSquadGame } from '../js/index.js';

assert.equal(passesWalls({ isAdvanced: false }), false);
assert.equal(passesWalls({ isAdvanced: true, advancedClass: 'WARLORD' }), true);
assert.equal(passesWalls({ advancedClass: 'EMPEROR' }), true);
assert.equal(passesWalls({ soldierClass: 'HEAVY' }, { isAdvanced: false }), false);
assert.equal(passesWalls({ soldierClass: 'PALADIN' }, { isAdvanced: true }), true);
assert.equal(passesWalls({ soldierClass: 'HEAVY' }), false);
assert.equal(passesWalls({ x: 1, y: 1 }), false);

const center = WORLD_SIZE / 2;
// The cliff faces are gone, so the open field never stops a strike, classed-up or not.
const face = { x: center + 2500, y: center + 5024 };
assert.equal(fieldBlocks(face.x, face.y), false, 'the former cliff line is open ground');
const west = { x: face.x - 60, y: face.y }, east = { x: face.x + 60, y: face.y };
const field = { currentDungeon: null, _economicWorks: [] };
const allow = { ...field, passesWalls: (unit) => passesWalls(unit, unit?.soldierClass === 'PALADIN' ? { isAdvanced: true } : null) };
assert.equal(attackBlocked(field, west, east), false, 'a basic strike crosses the former cliff line');
assert.equal(attackBlocked(allow, { ...west, soldierClass: 'HEAVY' }, east), false);

const dungeon = { kind: 'dungeon', width: 2200, height: 900 };
const indoors = { currentDungeon: dungeon, passesWalls: allow.passesWalls };
assert.equal(attackBlocked({ currentDungeon: dungeon }, { x: 200, y: 40 }, { x: 500, y: 40 }), true);
assert.equal(attackBlocked(indoors, { x: 200, y: 40, isAdvanced: true, advancedClass: 'WARLORD' }, { x: 500, y: 40 }), false);

const w = wallGeometry({ currentDungeon: null });
const hero = { x: w.right + 40, y: w.top + 120, isAdvanced: true, advancedClass: 'WARLORD', radius: 10 };
const hq = { currentDungeon: null, player: hero, passesWalls: (unit) => unit === hero };
assert.equal(resolveWallMovement(hq, hero, w.right - 40, hero.y), false);
assert.equal(hero.x, w.right + 40, 'a classed-up commander keeps the position past the fortification');
const basic = { x: w.right + 40, y: w.top + 120, radius: 10 };
assert.equal(resolveWallMovement({ currentDungeon: null, player: basic }, basic, w.right - 40, basic.y), true);
assert.ok(basic.x < w.right, 'a basic walker is still stopped by the fortification');

const game = Object.create(IronSquadGame);
game.currentDungeon = null;
game.player = { x: face.x, y: face.y, isAdvanced: true, advancedClass: 'WARLORD' };
game.squad = [
  { x: face.x, y: face.y, soldierClass: 'HEAVY' },
  { x: face.x, y: face.y, soldierClass: 'BLADEMASTER' }
];
game.monsters = [{ x: face.x, y: face.y }];
game.platoons = [];
game.civilians = [];
game.merchants = [];
game.settleTerrain();
assert.equal(game.player.x, face.x, 'the commander is not moved at the former cliff line');
assert.equal(game.player.y, face.y);
assert.equal(game.squad[0].x, face.x, 'a basic soldier is not pushed off open ground');
assert.equal(game.squad[1].x, face.x);
assert.equal(game.monsters[0].x, face.x, 'an enemy is not pushed off open ground');

game.currentDungeon = dungeon;
game.player = { x: 360, y: 40, isAdvanced: true, advancedClass: 'EMPEROR' };
game.squad = [
  { id: 1, x: 360, y: 40, soldierClass: 'HEAVY', carrierId: 'player', isPersonalGuard: true },
  { id: 2, x: 360, y: 40, soldierClass: 'HEAVY', isPersonalGuard: true },
  { id: 3, x: 360, y: 40, soldierClass: 'BLADEMASTER', isPersonalGuard: true }
];
game.monsters = [];
game.settleTerrain();
assert.equal(game.player.x, 360, 'the classed-up commander stays inside a dungeon plug');
assert.equal(dungeonBlocks(dungeon, 360, 40), true);
assert.equal(game.squad[0].x, 360, 'cargo dragged by a classed-up commander stays with them');
assert.equal(dungeonBlocks(dungeon, game.squad[1].x, game.squad[1].y), false, 'a basic soldier is pushed out of the dungeon wall');
assert.equal(game.squad[2].x, 360, 'a classed-up soldier stays inside the dungeon wall');
console.log('PASS: class-up passes dungeon and fortification walls; basic units still stop there; no field cliff');
