// DOM integration (v7.0.35): the spectate HUD says a raid is held, the outcome note after a wipe, hero member row (搬送中 / ダウン). node iron-squad/tests/ui-v7035.test.mjs [jsdom dir]
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
const { markSoldierDown } = await import('../js/casualty-rules.js');
const sp = await import('../js/hero-spectate.js');
const game = Object.create(IronSquadGame); game.container = document.getElementById('game');
for (const m of ['updateStatsUI','updateQuestUI','startGameLoop','spawnSparks','spawnDamageText','renderStrategyUI','refreshSupplyUI','recalcPlayerStats']) game[m] = noop;
const toasts=[]; game.showToast = m => toasts.push(String(m)); game.closeStrategyModal = noop;
game.width=800; game.height=450; game.zoom=1;
game.activeSlotId = saveSlots.create('UI TEST 7035').id; game.startFreshGame(false); game.restTimer = 0; game.monsters = []; game.inBattle = true;
const host = () => game.container.querySelector('#view-strat-hero');
const panel = () => game.container.querySelector('#hero-spectate');
game.phase = 20; assert.equal(rollHeroRevelation(game), true);
const p = game.heroJourney.party;
game.phaseDuration = 120; game.phaseTimer = 100; game.invasions.stage = 'idle'; game.invasions.nextPhase = 999;

// ---- HUD: the raid note shows only while something is held ----
assert.equal(sp.startSpectate(game, SOLDIER_CLASSES), true);
let note = panel().querySelector('.spectate-raid'); assert.ok(note, 'the note element exists'); assert.equal(note.hidden, true, 'nothing held: hidden'); assert.equal(note.textContent, '');
game.invasions.nextPhase = 20; sp.updateSpectateHud(game, true);
assert.equal(note.hidden, false); assert.match(note.textContent, /襲撃は保留中（観戦を終えると始まる）/); assert.equal(note.dataset.kind, 'invasion');
assert.notEqual(dom.window.getComputedStyle(note).display, 'none', 'visible by CSS');
game.invasions.nextPhase = 999; sp.updateSpectateHud(game, true); assert.equal(note.hidden, true, 'gone when nothing is waiting');
assert.match(css, /\.hero-spectate \.spectate-raid\[hidden\] \{ display: none; \}/); assert.match(css, /\.hero-spectate \.spectate-outcome\[hidden\] \{ display: none; \}/);

// ---- the outcome note after a wipe; the spectate carries on ----
const out = () => panel().querySelector('.spectate-outcome'); assert.equal(out().hidden, true);
p.members.forEach(u => { u.dead = true; }); p.status = 'fallen'; sp.updateSpectate(game, .1);
assert.ok(game.spectating && panel(), 'the panel stays'); assert.equal(out().hidden, false); assert.match(out().textContent, /^勇者パーティが全滅しました（観戦を終了で戻ります）$/);
assert.equal(panel().querySelector('.spectate-speed').textContent, '⏩ ×1'); assert.doesNotThrow(() => sp.updateSpectateHud(game, true));
panel().querySelector('.spectate-end').click(); assert.equal(game.spectating, null); assert.equal(panel(), null);

// ---- hero member rows: 搬送中（隊長/隊員）vs ダウン（残り◯秒） ----
{
  p.members.forEach(u => { u.dead = false; u.hp = u.maxHp; u.isDown = false; }); p.status = 'marching';
  const [h0, h1, h2] = p.members; for (const u of [h0, h1, h2]) markSoldierDown(game, u);
  for (const u of [h0, h1, h2]) delete u.carrierId;
  h0.carrierId = 'player'; h1.carrierId = game.squad.find(s => !s.isPersonalGuard && !s.dead).id; h2.downTimer = 42;
  renderHeroJourney(game, SOLDIER_CLASSES, TALENTS);
  const rows = [...host().querySelectorAll('p')].map(e => e.textContent);
  const rowOf = u => rows.find(t => t.includes(u.name) && t.includes('Lv.'));
  assert.match(rowOf(h0), /搬送中（隊長）/); assert.doesNotMatch(rowOf(h0), /ダウン（残り/);
  assert.match(rowOf(h1), /搬送中（隊員）/);
  assert.match(rowOf(h2), /ダウン（残り42秒）/); assert.doesNotMatch(rowOf(h2), /搬送中/);
  delete h0.carrierId; renderHeroJourney(game, SOLDIER_CLASSES, TALENTS);
  assert.match([...host().querySelectorAll('p')].map(e => e.textContent).find(t => t.includes(h0.name) && t.includes('Lv.')), /ダウン（残り/);
}
console.log('ui-v7035: raid hold note, outcome note, hero row (carried vs down) passed');