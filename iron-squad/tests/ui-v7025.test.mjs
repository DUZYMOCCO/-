// DOM integration (v7.0.25): hero record header and the hero revelation scene. node iron-squad/tests/ui-v7025.test.mjs [jsdom dir]
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
const require = createRequire(resolve(process.argv[2] || '__pycache__/ui-tools', 'entry.cjs'));
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<div id="game" class="game-container iron-squad"><div id="tab-strat-hero"></div><div id="view-strat-hero"></div></div>', { url: 'http://localhost/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage });
const css = ['style','game-ui','iron-squad','iron-squad-interface'].map(name=>readFileSync(['style','game-ui'].includes(name)?`common/css/${name}.css`:`iron-squad/css/${name}.css`,'utf8')).join('\n');
const sheet = document.createElement('style'); sheet.textContent=css; document.head.append(sheet);
const noop = () => {};
const context = new Proxy({ measureText: () => ({width:40}), createLinearGradient: () => ({addColorStop:noop}), createRadialGradient: () => ({addColorStop:noop}) }, {get:(o,k)=>k in o?o[k]:noop});
dom.window.HTMLCanvasElement.prototype.getContext = () => context;
const { IronSquadGame, SOLDIER_CLASSES, TALENTS } = await import('../js/index.js');
const { saveSlots } = await import('../js/save-slots.js');
const { rollHeroRevelation, renderHeroJourney, updateHeroParty, ensureHeroCastle } = await import('../js/hero-party.js');
const { showHeroRevelationScene, REVELATION_SCENE_MS } = await import('../js/hero-revelation-scene.js');
const { DUNGEON_DEFS } = await import('../js/dungeon.js');
const game = Object.create(IronSquadGame); game.container = document.getElementById('game');
for (const m of ['updateStatsUI','updateQuestUI','startGameLoop','spawnSparks','spawnDamageText','renderStrategyUI','refreshSupplyUI']) game[m] = noop;
const toasts=[]; game.showToast = m => toasts.push(String(m)); game.closeStrategyModal = noop;
game.activeSlotId = saveSlots.create('UI TEST ONLY').id; game.startFreshGame(false);for(const id of ['seal_northwest','seal_north','seal_northeast'])game.sealKeys.broken[id]={by:'commander',phase:1}; /* v7.2.15 封印は解けた状態から（巡礼は hero-pilgrimage-v7215） */ game.restTimer = 0; game.monsters = [];
const overlays = () => game.container.querySelectorAll('.hero-revelation');
const host = () => game.container.querySelector('#view-strat-hero');
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---- revelation scene: stars, "勇者が啓示を受けた", the hero's name; tap to skip ----
game.phase = 10; assert.equal(rollHeroRevelation(game), true);
const hero = game.heroJourney.party.members[0];
assert.equal(overlays().length, 1, 'the scene appears when the hero is born');
const scene = overlays()[0];
assert.equal(scene.querySelectorAll('.hero-star').length, 14);
assert.equal(scene.querySelector('h2').textContent, '勇者が啓示を受けた');
assert.equal(scene.querySelector('.rev-name').textContent, hero.name);
assert.ok(toasts.some(t => t.includes('天啓')), 'the existing toast is kept');
assert.equal(REVELATION_SCENE_MS, 3000);
scene.click(); assert.equal(overlays().length, 0, 'tap skips');
assert.equal(game._heroRevelationScene, null);
showHeroRevelationScene(game, 'ア'.repeat(40), { ms: 60 }); showHeroRevelationScene(game, '二人目', { ms: 60 });
assert.equal(overlays().length, 1, 'a second scene replaces the first'); assert.equal(overlays()[0].querySelector('.rev-name').textContent, '二人目');
await sleep(120); assert.equal(overlays().length, 0, 'ends by itself');
assert.equal(showHeroRevelationScene({}, 'x'), null, 'no container: nothing happens');
const rules = css.slice(css.indexOf('.hero-revelation {'));
assert.match(rules, /position: fixed; inset: 0; z-index: 1400/); assert.match(rules, /overflow-wrap: anywhere/); assert.match(rules, /clamp\(22px, 7vw, 32px\)/); assert.match(rules, /prefers-reduced-motion/);

// ---- hero record header ----
const classes = SOLDIER_CLASSES, text = () => host().textContent;
renderHeroJourney(game, classes, TALENTS);
assert.ok(!text().includes('経験値・実戦練習は20倍'), 'the x20 sentence is gone'); assert.ok(!text().includes('各期2%'), 'the outdated 2% text is gone');
assert.doesNotMatch(text(), /天啓は第10期から5期ごと/); assert.doesNotMatch(text(), /前の勇者パーティが生きている間は見送り/); assert.doesNotMatch(text(), /魔王城で4期進展が止まると撤退します/); assert.match(text(), /魔王城へ進軍中/);
const p = game.heroJourney.party, d = DUNGEON_DEFS.find(x => x.id === 'dungeon_demon_castle');
p.x = d.entrance.x; p.y = d.entrance.y; p.destination = { ...d.entrance }; p.route = [{ ...d.entrance }]; p.routeIndex = 0; p.members.forEach(u => { u.x = p.x; u.y = p.y; });
updateHeroParty(game, .1, SOLDIER_CLASSES); const scn = ensureHeroCastle(game, d); p.route = [];
game.phase = 11; updateHeroParty(game, 1.1, SOLDIER_CLASSES);
renderHeroJourney(game, classes, TALENTS);
assert.match(text(), /魔王城で交戦中/); assert.match(text(), /城内の敵 残り\d+体 · 魔王HP 100\.0%/); assert.match(text(), /進展あり/);
assert.ok(host().querySelector('.hero-status')); assert.ok([...host().querySelectorAll('button')].some(b => b.textContent === '勇者を追う'));
// stagnation shows the idle phases and the withdrawal limit (kill the near enemies' effect: nothing changes)
scn.monsters.length = 0; scn.monsters.push({ isDemonKing: true, name: '魔王', hp: 1e9, maxHp: 1e9, x: p.x + 5000, y: p.y, atk: 1, radius: 20, type: 'demon_king' });
game.phase = 11; p.watch.sincePhase = 11; p.watch.mobs = 0; p.watch.boss = 1e9; p.watch.kills = 99; p.watch.levels = 99;
game.phase = 13; updateHeroParty(game, 1.1, SOLDIER_CLASSES); renderHeroJourney(game, classes, TALENTS);
assert.match(text(), /魔王城で停滞中（2期）/); assert.match(text(), /最後の進展から2期（4期で撤退）/); assert.match(text(), /魔王HP 100\.0%/);
for (const b of host().querySelectorAll('.hero-status p')) assert.ok(b.textContent.length < 40, 'short lines for 360px');
// withdrawn: no roster, no follow button, next hero shown, result label in the history
game.phase = 15; updateHeroParty(game, 1.1, SOLDIER_CLASSES); rollHeroRevelation(game);
const q = game.heroJourney.party; assert.notEqual(q.id, p.id);
game.heroJourney.party.status = 'withdrawn'; // same party shape as after a withdrawal
renderHeroJourney(game, classes, TALENTS);
assert.match(text(), /撤退（魔王城から引き上げた）/); assert.match(text(), /次の勇者：第20期に天啓/); assert.ok(![...host().querySelectorAll('button')].some(b => b.textContent === '勇者を追う'));
assert.ok([...host().querySelectorAll('summary')].some(s => s.textContent.includes('撤退')), 'history label 撤退');
console.log('ui-v7025: revelation scene, record header (status, stagnation, withdrawn), removed texts passed');