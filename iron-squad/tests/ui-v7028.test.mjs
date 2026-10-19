// DOM integration (v7.0.28): hero record spectate button, spectate panel (HUD), soldier detail pocket-potion line. node iron-squad/tests/ui-v7028.test.mjs [jsdom dir]
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
const { rollHeroRevelation, renderHeroJourney, updateHeroParty, ensureHeroCastle, initializeHeroJourney } = await import('../js/hero-party.js');
const sp = await import('../js/hero-spectate.js');
const { DUNGEON_DEFS } = await import('../js/dungeon.js');
const game = Object.create(IronSquadGame); game.container = document.getElementById('game');
for (const m of ['updateStatsUI','updateQuestUI','startGameLoop','spawnSparks','spawnDamageText','renderStrategyUI','refreshSupplyUI','recalcPlayerStats']) game[m] = noop;
const toasts=[]; game.showToast = m => toasts.push(String(m)); let closed=0; game.closeStrategyModal = () => { closed++; };
game.width=800; game.height=450; game.zoom=1;
game.activeSlotId = saveSlots.create('UI TEST ONLY').id; game.startFreshGame(false); game.restTimer = 0; game.monsters = []; game.inBattle = true;
const host = () => game.container.querySelector('#view-strat-hero');
const panel = () => game.container.querySelector('#hero-spectate');
const buttons = () => [...host().querySelectorAll('button')];
const find = text => buttons().find(b => b.textContent === text);
const d = DUNGEON_DEFS.find(x => x.id === 'dungeon_demon_castle');

// ---- hero record: marching in the field → the spectate button is disabled with the reason ----
game.phase = 10; assert.equal(rollHeroRevelation(game), true);
renderHeroJourney(game, SOLDIER_CLASSES, TALENTS);
assert.ok(find('勇者を追う'), 'follow button is kept'); assert.ok(find('観戦する'), 'spectate button next to it');
assert.equal(find('観戦する').disabled, false, 'v7.0.31: the march can be watched from the camp');
assert.match(host().textContent, /勇者の進軍を最初から見守ります/);
game.player.x += 5000; renderHeroJourney(game, SOLDIER_CLASSES, TALENTS);
assert.equal(find('観戦する').disabled, false, 'v7.0.32: far from the camp is still startable'); assert.match(host().textContent, /勇者の進軍を最初から見守ります/); game.player.x -= 5000;
game.restTimer = 8; renderHeroJourney(game, SOLDIER_CLASSES, TALENTS);
assert.equal(find('観戦する').disabled, false, 'not startable yet: the button still queues'); assert.match(host().textContent, /観戦：待機中です。待機が終わると観戦を始められます/); game.restTimer = 0;
renderHeroJourney(game, SOLDIER_CLASSES, TALENTS);
assert.equal(find('観戦する').parentElement, find('勇者を追う').parentElement, 'side by side');

// ---- party fights in the castle → enabled ----
const p = game.heroJourney.party;
p.x = d.entrance.x; p.y = d.entrance.y; p.destination = { ...d.entrance }; p.route = [{ ...d.entrance }]; p.routeIndex = 0; p.members.forEach(u => { u.x = p.x; u.y = p.y; });
updateHeroParty(game, .1, SOLDIER_CLASSES); const scene = ensureHeroCastle(game, d); scene.monsters.length = 0; p.route = [];
const king = { isDemonKing: true, isBoss: true, isColossal: true, name: '魔王', hp: 1e12, maxHp: 1e12, x: d.width - 350, y: d.height / 2, atk: 1, radius: 20, speed: 0, type: 'demon_king', skillCooldown: 1e9, skillTimer: 1e9, bossDef: { skillCooldown: 1e9 } };
scene.monsters.push(king);
for (let i = 0; i < 4; i++) scene.monsters.push({ hp: 5, maxHp: 5, x: d.width - 900 + i * 40, y: d.height / 2, atk: 1, radius: 10, type: 'slime', speed: 0 });
game.phase = 11; updateHeroParty(game, 1.1, SOLDIER_CLASSES);
renderHeroJourney(game, SOLDIER_CLASSES, TALENTS);
assert.equal(find('観戦する').disabled, false); assert.match(host().textContent, /隊長は姿を消して見守ります/);
game.restTimer = 8; renderHeroJourney(game, SOLDIER_CLASSES, TALENTS); assert.equal(find('観戦する').disabled, false); assert.match(host().textContent, /観戦：待機中です。待機が終わると観戦を始められます/); game.restTimer = 0;
game.baseRaidActive = true; renderHeroJourney(game, SOLDIER_CLASSES, TALENTS); assert.match(host().textContent, /襲撃中です。収まると観戦を始められます/); game.baseRaidActive = false;
renderHeroJourney(game, SOLDIER_CLASSES, TALENTS);

// ---- start from the button ----
closed = 0; find('観戦する').click();
assert.ok(game.spectating, 'started'); assert.equal(closed, 1, 'the record window closes'); assert.equal(game.currentDungeon.id, d.id);
const box = panel(); assert.ok(box, 'panel exists'); assert.equal(game.container.querySelectorAll('#hero-spectate').length, 1);
assert.ok(game.container.classList.contains('is-spectating'));
assert.equal(box.parentElement.id, 'canvas-container');
assert.equal(box.querySelector('.spectate-badge').textContent, '👁 観戦中');
const chips = () => [...box.querySelectorAll('.spectate-chip')];
assert.equal(chips().length, 7, 'six members and the king'); assert.equal(chips()[0].textContent.startsWith('勇者'), true); assert.equal(chips().at(-1).textContent.startsWith('魔王'), true);
assert.equal(chips()[0].classList.contains('active'), true);
assert.match(box.querySelector('.spectate-name').textContent, /^勇者 .+ · Lv\.1$/);
assert.match(box.querySelector('.spectate-hp').textContent, /^HP [\d,]+ \/ [\d,]+$/);
assert.equal(box.querySelector('.spectate-hpbar i').style.width, '100%');
assert.match(box.querySelector('.spectate-party').textContent, /^生存6\/6（健在6）$/);
assert.match(box.querySelector('.spectate-castle').textContent, /^城内の敵 残り4体 · 魔王HP 100\.0%$/);
// next / previous / chip / king
box.querySelector('.spectate-next').click(); assert.equal(game.spectating.viewer, p.members[1]); assert.equal(chips()[1].classList.contains('active'), true);
assert.match(box.querySelector('.spectate-name').textContent, new RegExp(`^${SOLDIER_CLASSES[p.members[1].soldierClass].name} `));
box.querySelector('.spectate-prev').click(); assert.equal(game.spectating.viewer, p.members[0]);
chips()[3].click(); assert.equal(game.spectating.viewer, p.members[3]); assert.equal(chips().filter(c => c.classList.contains('active')).length, 1);
chips().at(-1).click(); assert.equal(game.spectating.viewer, king); assert.match(box.querySelector('.spectate-name').textContent, /^魔王/);
// live numbers follow the fight
p.members[3].hp = p.members[3].maxHp * .1; scene.monsters.splice(scene.monsters.findIndex(m => !m.isDemonKing), 1); king.hp = king.maxHp * .5;
sp.updateSpectateHud(game, true);
assert.match(box.querySelector('.spectate-party').textContent, /瀕死1/); assert.match(box.querySelector('.spectate-castle').textContent, /残り3体 · 魔王HP 50\.0%/);
assert.equal(chips()[3].classList.contains('low'), true);
// panel taps never reach the game (pointer events are stopped)
let leaked = 0; game.container.addEventListener('pointerdown', () => leaked++); box.dispatchEvent(new dom.window.Event('pointerdown', { bubbles: true })); assert.equal(leaked, 0);
// drawing: the observer is not drawn, the party is; the lantern/sight follow the watched unit
{ game.ctx = context; game.canvas ||= document.createElement('canvas'); let players = 0, soldiers = 0; const drawPlayer = game.drawPlayer, drawSoldier = game.drawSoldier;
  game.drawPlayer = () => players++; game.drawSoldier = () => soldiers++; sp.selectSpectateTarget(game, p.members[0].id);
  p.members.forEach((u, i) => { u.x = 1500 + i * 20; u.y = d.height / 2; u.hp = u.maxHp; u.isDown = false; }); game.camera.x = 1500; game.camera.y = d.height / 2;
  assert.doesNotThrow(() => game.render(), 'rendering while spectating'); assert.equal(players, 0, 'the observer commander is invisible'); assert.ok(soldiers >= 6, 'hero party members are drawn');
  const { sceneLightSources } = await import('../js/scene-lighting.js'); const lantern = sceneLightSources(game, 0, null).find(l => l.id === 'player-lantern');
  assert.ok(lantern && Math.abs(lantern.x - game.spectating.viewer.x) < 1, 'the carried light is on the watched unit, not the observer');
    game.drawPlayer = drawPlayer; game.drawSoldier = drawSoldier; }
// the on-screen controls are hidden while watching (CSS rule) and the panel is styled
assert.match(css, /\.is-spectating #virtual-gamepad[^{]*\{ display: none !important; \}/); assert.match(css, /\.hero-spectate \{ position: absolute;/); assert.match(css, /\.hero-spectate \.spectate-end/);
// the record window while watching offers to stop, and "follow" is off
renderHeroJourney(game, SOLDIER_CLASSES, TALENTS); assert.ok(find('観戦を終了')); assert.equal(find('観戦する'), undefined); assert.equal(find('勇者を追う').disabled, true);
// end from the panel
toasts.length = 0; box.querySelector('.spectate-end').click();
assert.equal(game.spectating, null); assert.equal(panel(), null, 'panel removed'); assert.equal(game.container.classList.contains('is-spectating'), false);
assert.equal(game.currentDungeon, null); assert.ok(toasts.some(t => t.includes('観戦を終えて')));
renderHeroJourney(game, SOLDIER_CLASSES, TALENTS); assert.ok(find('観戦する'));
// auto end removes the panel too
assert.equal(sp.startSpectate(game, SOLDIER_CLASSES), true); assert.ok(panel());
game.baseRaidActive = true; game.update(.1); game.baseRaidActive = false; assert.equal(panel(), null); assert.equal(game.spectating, null); assert.equal(game.currentDungeon, null);
// loading a game wipes a leftover panel
p.status = 'castle'; assert.equal(sp.startSpectate(game, SOLDIER_CLASSES), true); assert.ok(panel()); sp.clearSpectate(game); assert.equal(panel(), null); game.currentDungeon = null;

// ---- soldier detail: the pocket-potion line ----
const soldier = game.squad.find(s => !s.isPersonalGuard && !s.heroPartyId);
const html = game.buildSoldierDetailHtml(soldier);
assert.match(html, /手当て 30%・1ウェーブ3回（残り3回）・8G/);
soldier.pocketPotion = { phase: game.phase, used: 2 };
assert.match(game.buildSoldierDetailHtml(soldier), /（残り1回）/);
const heroUnit = p.members[0]; assert.ok(!game.buildSoldierDetailHtml(heroUnit).includes('手当て 30%'), 'hero party members have their own rules');
console.log('ui-v7028: spectate button, panel, switching, live numbers, end paths and the pocket-potion line passed');
