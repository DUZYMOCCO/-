// DOM integration (v7.0.31): 観戦待ち button/chip, speed button, field spectate drawing (no commander/squad/fog), HUD hiding CSS. node iron-squad/tests/ui-v7031.test.mjs [jsdom dir]
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
const require = createRequire(resolve(process.argv[2] || '__pycache__/ui-tools', 'entry.cjs'));
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<div id="game" class="game-container iron-squad"><div id="tab-strat-hero"></div><div id="view-strat-hero"></div><div id="canvas-container"></div><div id="virtual-gamepad"></div><div id="battle-log-window"></div></div>', { url: 'http://localhost/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage });
const css = ['style','game-ui','iron-squad','iron-squad-interface'].map(name=>readFileSync(['style','game-ui'].includes(name)?`common/css/${name}.css`:`iron-squad/css/${name}.css`,'utf8')).join('\n');
const sheet = document.createElement('style'); sheet.textContent=css; document.head.append(sheet);
const noop = () => {};
const context = new Proxy({ measureText: () => ({width:40}), createLinearGradient: () => ({addColorStop:noop}), createRadialGradient: () => ({addColorStop:noop}) }, {get:(o,k)=>k in o?o[k]:noop});
dom.window.HTMLCanvasElement.prototype.getContext = () => context;
const { IronSquadGame, SOLDIER_CLASSES, TALENTS } = await import('../js/index.js');
const { saveSlots } = await import('../js/save-slots.js');
const { rollHeroRevelation, renderHeroJourney } = await import('../js/hero-party.js');
const sp = await import('../js/hero-spectate.js');
const { WORLD_SIZE } = await import('../js/world.js');
const game = Object.create(IronSquadGame); game.container = document.getElementById('game');
for (const m of ['updateStatsUI','updateQuestUI','startGameLoop','spawnSparks','spawnDamageText','renderStrategyUI','refreshSupplyUI','recalcPlayerStats']) game[m] = noop;
const toasts=[]; game.showToast = m => toasts.push(String(m)); let closed=0; game.closeStrategyModal = () => { closed++; };
game.width=800; game.height=450; game.zoom=1;
game.activeSlotId = saveSlots.create('UI TEST 7031').id; game.startFreshGame(false); game.restTimer = 0; game.monsters = []; game.inBattle = true;
const host = () => game.container.querySelector('#view-strat-hero');
const panel = () => game.container.querySelector('#hero-spectate');
const chip = () => game.container.querySelector('#hero-spectate-queue');
const find = text => [...host().querySelectorAll('button')].find(b => b.textContent === text);
const C = WORLD_SIZE / 2, camp = { x: game.player.x, y: game.player.y };

// ---- the hero record button toggles: 観戦する → 観戦待ち（取消）→ 観戦を終了 ----
game.phase = 10; assert.equal(rollHeroRevelation(game), true);
const p = game.heroJourney.party;
game.player.x = C + 1500; // away from the camp: not startable yet
renderHeroJourney(game, SOLDIER_CLASSES, TALENTS);
assert.ok(find('観戦する')); assert.equal(find('観戦する').disabled, false);
closed = 0; find('観戦する').click();
assert.ok(game.spectateQueued, 'queued instead of an error'); assert.equal(closed, 1, 'the record window closes so the game runs'); assert.ok(chip(), 'edge chip shown'); assert.equal(chip().textContent, '👁観戦待ち ✕');
assert.equal(game.container.querySelectorAll('#hero-spectate-queue').length, 1); assert.equal(game.spectating, null);
renderHeroJourney(game, SOLDIER_CLASSES, TALENTS);
assert.ok(find('観戦待ち（取消）')); assert.equal(find('観戦する'), undefined); assert.match(host().textContent, /観戦待ち：勇者は進軍中。隊長が本陣に戻ると観戦を始まります/);
find('観戦待ち（取消）').click(); assert.equal(game.spectateQueued, null); assert.equal(chip(), null, 'chip removed'); assert.ok(find('観戦する'), 'back to the first state');
// chip tap cancels
game.container.dispatchEvent(new dom.window.Event('x')); find('観戦する').click(); assert.ok(chip());
let leaked = 0; game.container.addEventListener('pointerdown', () => leaked++); chip().dispatchEvent(new dom.window.Event('pointerdown', { bubbles: true })); assert.equal(leaked, 0, 'taps on the chip do not reach the game');
chip().click(); assert.equal(game.spectateQueued, null); assert.equal(chip(), null);
// the chip announces the start and counts down (tap to stop)
find('観戦する').click(); game.player.x = camp.x; game.player.y = camp.y;
sp.updateSpectateQueue(game, .1); assert.match(chip().textContent, /^👁 3秒後に観戦開始（タップで中止） ✕$/); assert.equal(chip().dataset.state, 'counting');
sp.updateSpectateQueue(game, 1); assert.match(chip().textContent, /^👁 2秒後/);
chip().click(); assert.equal(game.spectateQueued, null); assert.equal(game.spectating, null, 'tap during the notice stops it');
// queue → auto start removes the chip and mounts the panel
find('観戦する').click(); for (let i = 0; i < 40 && !game.spectating; i++) sp.updateSpectateQueue(game, .1);
assert.ok(game.spectating && game.spectating.field); assert.equal(chip(), null); assert.ok(panel()); assert.ok(game.container.classList.contains('is-spectating'));

// ---- panel in the field: speed button, summary line ----
const box = panel();
assert.equal(box.querySelector('.spectate-speed').textContent, '⏩ ×1');
box.querySelector('.spectate-speed').click(); assert.equal(game.spectating.speed, 2); assert.equal(box.querySelector('.spectate-speed').textContent, '⏩ ×2'); assert.equal(box.querySelector('.spectate-speed').classList.contains('fast'), true);
box.querySelector('.spectate-speed').click(); assert.equal(box.querySelector('.spectate-speed').textContent, '⏩ ×4');
box.querySelector('.spectate-speed').click(); assert.equal(box.querySelector('.spectate-speed').textContent, '⏩ ×1'); assert.equal(box.querySelector('.spectate-speed').classList.contains('fast'), false);
box.querySelector('.spectate-speed').click(); game.restTimer = 8; sp.updateSpectate(game, .3); assert.equal(box.querySelector('.spectate-speed').textContent, '⏩ ×1', 'rest → back to ×1'); game.restTimer = 0;
assert.match(box.querySelector('.spectate-castle').textContent, /^野外を進軍中 · 魔王城まで約[\d,]+m$/); assert.match(box.querySelector('.spectate-party').textContent, /^生存6\/6/);
assert.equal(box.querySelectorAll('.spectate-chip').length, 6, 'no king chip in the field');
renderHeroJourney(game, SOLDIER_CLASSES, TALENTS); assert.ok(find('観戦を終了')); assert.match(host().textContent, /観戦中です（勇者の進軍を追っています）/);

// ---- drawing: no commander, no squad, no fog; the hero party and the lantern follow the hero ----
{ game.ctx = context; game.canvas ||= document.createElement('canvas'); let players = 0, soldiers = 0, fog = 0; const { drawPlayer, drawSoldier } = game;
  game.drawPlayer = () => players++; game.drawSoldier = () => soldiers++;
  const fogGrid = game.ensureFog(), drawOverlay = fogGrid.drawFieldOverlay; fogGrid.drawFieldOverlay = () => fog++;
  const far = { x: C + 2600, y: C + 300 }; p.members.forEach((u, i) => { u.x = far.x + i * 18; u.y = far.y; u.hp = u.maxHp; u.isDown = false; }); game.camera.x = far.x; game.camera.y = far.y;
  sp.selectSpectateTarget(game, p.members[0].id);
  assert.doesNotThrow(() => game.render(), 'rendering the watched march');
  assert.equal(players, 0, 'the commander is not drawn'); assert.ok(soldiers >= 6, 'the hero party is drawn'); assert.equal(fog, 0, 'no fog over the watched march');
  const { sceneLightSources } = await import('../js/scene-lighting.js'); const prev = game.worldTime; game.worldTime = 360; // night
  const lights = sceneLightSources(game, 0, null); game.worldTime = prev;
  const lantern = lights.find(l => l.id === 'player-lantern'); assert.ok(lantern); assert.ok(Math.abs(lantern.x - game.spectating.viewer.x) < 1 && Math.abs(lantern.y - game.spectating.viewer.y) < 1, 'night light is on the hero, not the commander');
  sp.endSpectate(game); players = 0; soldiers = 0; fog = 0; game.camera.x = camp.x; game.camera.y = camp.y;
  assert.doesNotThrow(() => game.render()); assert.equal(players, 1, 'the commander is drawn again'); assert.ok(soldiers > 6, 'the squad is drawn again'); assert.ok(fog >= 1, 'the fog is back');
  game.drawPlayer = drawPlayer; game.drawSoldier = drawSoldier; fogGrid.drawFieldOverlay = drawOverlay; }
assert.equal(game.spectating, null); assert.equal(panel(), null); assert.equal(game.container.classList.contains('is-spectating'), false);

// ---- styles: hide the commander HP/skills HUD, speed button, chip, fade ----
assert.match(css, /\.is-spectating \.stat-box:has\(#player-hp\)[^{]*\{ visibility: hidden !important;/);
assert.match(css, /\.hero-spectate \.spectate-speed/); assert.match(css, /\.hero-spectate-queue \{ position: absolute;/); assert.match(css, /\.spectate-fade \{ position: absolute;/); assert.match(css, /\.is-spectating #virtual-gamepad[^{]*\{ display: none !important; \}/);
console.log('ui-v7031: queue button/chip, notice, speed button, field drawing (no commander/squad/fog), HUD styles passed');