import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';

const dom = new JSDOM('<div id="game"></div>', {url: 'http://localhost/'});
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  localStorage: dom.window.localStorage
});

const noop = () => {},
  ctx = new Proxy(
    {
      measureText: () => ({width: 40}),
      createLinearGradient: () => ({addColorStop: noop}),
      createRadialGradient: () => ({addColorStop: noop})
    },
    {get: (o, k) => (k in o ? o[k] : noop)}
  );
window.HTMLCanvasElement.prototype.getContext = () => ctx;

const {IronSquadGame} = await import('../js/index.js');
const {saveSlots} = await import('../js/save-slots.js');
const {AUTO_SAVE_INTERVAL_MS, startAutoSave, stopAutoSave} = await import('../js/auto-save.js');

assert.equal(AUTO_SAVE_INTERVAL_MS, 10000);

const g = Object.create(IronSquadGame);
Object.assign(g, {
  container: document.getElementById('game'),
  width: 390,
  height: 844,
  zoom: 1,
  ctx,
  camera: {x: 79360, y: 79360},
  selectedSaleIds: new Set(),
  commandActiveUntil: 0,
  startGameLoop: noop,
  showToast: noop
});

g.setupUI();
const slot = saveSlots.create('AUTO SAVE POLICY TEST');
g.activeSlotId = slot.id;
g.startFreshGame(false);
g.career.status = 'enlisted';
g.gold = 1000;

// 1. Regular saveGame() calls (without immediate or auto) are no-ops
let writeCount = 0;
const originalSetItem = window.Storage.prototype.setItem;
window.Storage.prototype.setItem = function(...args) {
  writeCount++;
  return originalSetItem.apply(this, args);
};

writeCount = 0;
g.gold = 2000;
const noopResult = g.saveGame();
assert.equal(noopResult, null, 'regular saveGame() should return null');
assert.equal(writeCount, 0, 'regular saveGame() must not write to localStorage');

const bgNoopResult = g.saveGame({background: true});
assert.equal(bgNoopResult, null, 'regular background saveGame() should return null without auto');
assert.equal(writeCount, 0, 'regular background saveGame() must not write to storage');

// Slot in storage still has initial data, not gold: 2000
const currentData = saveSlots.get(g.activeSlotId).data;
assert.notEqual(currentData.gold, 2000, 'storage data must remain unchanged by regular saveGame');

// 2. Immediate save (saveGame({immediate: true})) writes synchronously
writeCount = 0;
g.gold = 3000;
const immResult = g.saveGame({immediate: true});
assert.ok(immResult, 'immediate saveGame should return snapshot');
assert.equal(writeCount, 1, 'immediate saveGame writes synchronously to storage');
assert.equal(saveSlots.get(g.activeSlotId).data.gold, 3000, 'storage must have updated gold');

// 3. Auto-save timer mechanism
let timerCallback = null;
let intervalCleared = false;
const mockClock = {
  setInterval(cb, ms) {
    timerCallback = cb;
    return 12345;
  },
  clearInterval(id) {
    if (id === 12345) intervalCleared = true;
  }
};

startAutoSave(g, mockClock);
assert.ok(typeof timerCallback === 'function', 'auto-save timer callback registered');

// Trigger auto-save via mock clock
g.gold = 4000;
timerCallback();
// auto-save is background async, returns pending promise
assert.ok(g._pendingAutoSave instanceof Promise, 'auto-save dispatches background promise');
await g._pendingAutoSave;
assert.equal(saveSlots.get(g.activeSlotId).data.gold, 4000, 'auto-save commits current gold');

// stopAutoSave clears timer
stopAutoSave(g);
assert.equal(intervalCleared, true, 'stopAutoSave cleared interval');

// 4. Synchronous save scenes
// 4a. showSaveMenu()
g.gold = 5000;
g.showSaveMenu();
assert.equal(saveSlots.get(g.activeSlotId).data.gold, 5000, 'showSaveMenu saves immediately');

// 4b. gameOver()
g.gold = 6000;
g.gameOver();
assert.equal(saveSlots.get(g.activeSlotId).state, 'fallen', 'gameOver sets state to fallen');
assert.equal(g._saveFallen, true, '_saveFallen prevents overwriting fallen save');

// Restore game state
g._saveFallen = false;
saveSlots.update(g.activeSlotId, {state: 'active'});

// 5. Personnel lock toggle without rollback
const recruit = g.squad[0];
assert.ok(recruit, 'recruit exists');
assert.equal(recruit.personnelLocked, undefined);
const locked = g.toggleSoldierLock(recruit.id);
assert.equal(locked, true);
assert.equal(recruit.personnelLocked, true);
g.saveGame({immediate: true});
assert.equal(saveSlots.get(g.activeSlotId).data.squad[0].personnelLocked, true, 'lock state saved');

window.Storage.prototype.setItem = originalSetItem;
console.log('auto-save.test: PASS');
