// DOM integration: node tests/interface.test.mjs <directory containing jsdom>
// Uses in-memory storage; no real player saves or browser automation.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
const require = createRequire(resolve(process.argv[2] || '__pycache__/ui-tools', 'entry.cjs'));
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<div id="game" class="game-container"></div>', { url: 'http://localhost/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage });
const css = ['style','game-ui','iron-squad','iron-squad-interface'].map(name=>readFileSync(`css/${name}.css`,'utf8')).join('\n');
const sheet = document.createElement('style'); sheet.textContent=css; document.head.append(sheet);
const noop = () => {};
const context = new Proxy({ measureText: () => ({width:40}), createLinearGradient: () => ({addColorStop:noop}), createRadialGradient: () => ({addColorStop:noop}) }, {get:(o,k)=>k in o?o[k]:noop});
dom.window.HTMLCanvasElement.prototype.getContext = () => context;
const { IronSquadGame, SLOT_INFO, generateRandomDrop } = await import('../js/games/iron-squad/index.js');
const { saveSlots } = await import('../js/games/iron-squad/save-slots.js');
const game = Object.create(IronSquadGame); game.container = document.getElementById('game');
for (const method of ['startGameLoop', 'showToast']) game[method] = noop;
Object.assign(game, { width:390, height:664, zoom:1, ctx:context, camera:{x:79360,y:79360}, selectedSaleIds:new Set(), commandActiveUntil:0 });
game.setupUI(); game.activeSlotId = saveSlots.create('UI TEST ONLY').id; game.startFreshGame(false);
game.gold = 100000; game.treasury = 20000; game.awakeningOrbs = 5;
game.rankIndex = 2; game.squad[0].isPersonalGuard = true;
game.squad[0].name = 'テスト兵士'; game.squad[0].hp = Math.floor(game.squad[0].maxHp / 2);
game.squad[1].isDown = true; game.squad[1].hp = 0;
const item = (id, type, stat, n) => ({id,type,name:`検証装備${id}`,tier:1,upgrade:0,stats:{[stat]:n},baseStats:{[stat]:n},color:'#e2dac4'});
const old = item('old','WEAPON','atk',10), better = item('better','WEAPON','atk',30), worse = item('worse','WEAPON','atk',2), helmet = item('helmet','HELMET','def',8);
game.equipped = {weapon:old}; game.inventory = [old,better,worse,helmet];
game.openStrategyModal(true);
const $ = id => document.getElementById(id);
// A tab's descendants must belong to it; testing only .hidden on the wrapper
// misses orphaned equipment that stays visible under every selected tab.
assert.equal($('view-strat-squad').parentElement, $('view-strat-troops'), 'roster belongs to the troops panel');
assert.equal($('view-strat-equip').parentElement, $('view-strat-troops'), 'bag belongs to the troops panel');
assert.equal($('view-econ-invest').closest('#view-strat-nation'), $('view-strat-nation'), 'donation belongs to the nation panel');
assert.equal($('view-econ-box').closest('#view-strat-nation'), $('view-strat-nation'), 'shared equipment belongs to the nation panel');
const tick = () => new Promise(resolve => setTimeout(resolve, 5));
const input = (id,value,type='input') => {$(id).value=value; $(id).dispatchEvent(new dom.window.Event(type,{bubbles:true}));};
const entries = () => [...document.querySelectorAll('.roster-entry')];
const shown = node => {
  for (let current=node; current; current=current.parentElement) {
    if (window.getComputedStyle(current).display === 'none') return false;
    if (current.parentElement?.tagName === 'DETAILS' && !current.parentElement.open && current.tagName !== 'SUMMARY') return false;
  }
  return true;
};
const assertTab = (tab, sub=game.rosterManageTab) => {
  assert.deepEqual([...document.querySelector('.dialog-body').children].map(node=>node.id), ['view-strat-overview','view-strat-nation','view-strat-troops'], 'the scrolling body contains only tab-owned panels');
  for (const key of ['overview','troops','nation']) {
    assert.equal(shown($(`view-strat-${key}`)), key===tab, `only ${tab} content is visible`);
    assert.equal($(`tab-strat-${key}`).getAttribute('aria-pressed'), String(key===tab));
  }
  for (const id of ['nation-quest-panel','nation-expedition-panel','view-econ-invest','nation-finances','nation-shared-box']) {
    assert.equal(shown($(id)), tab==='nation', `${id} follows the nation tab`);
  }
  for (const id of ['squad-roster-list','roster-tools','reserve-roster','roster-experience-note']) {
    assert.equal(shown($(id)), tab==='troops' && sub==='roster', `${id} follows the roster subtab`);
  }
  assert.equal(shown($('view-econ-scout')), tab==='troops' && sub==='scout' && !$('recruitment-dialog').classList.contains('hidden'));
  assert.equal(shown($('recruitment-launcher')),tab==='troops' && sub==='scout');
  assert.equal(shown($('view-strat-equip')), tab==='troops' && sub==='equip');
  assert.equal(shown($('commander-equipment')), tab==='troops' && sub==='equip');
};
// Reproduce the photo: retain each troops subtab while selecting nation, and
// redraw as real actions do. Returning must restore the selected troops view.
assertTab('overview');
for (const sub of ['roster','scout','equip']) {
  $('tab-strat-troops').click(); $(`tab-econ-${sub}`).click(); assertTab('troops',sub);
  $('tab-strat-nation').click(); assertTab('nation');
  game.renderStrategyUI(); assertTab('nation');
  $('tab-strat-overview').click(); assertTab('overview');
  $('tab-strat-troops').click(); assertTab('troops',sub);
}
$('tab-econ-roster').click();
assert.equal(entries().length,48);
assert.equal(entries().filter(e=>e.open).length,0,'roster initially gives an overview, not 48 full equipment sheets');
const ids = [...document.querySelectorAll('[id]')].map(e=>e.id); assert.equal(new Set(ids).size,ids.length,'moving panels must not duplicate live update IDs');
assert.equal($('strat-gold').textContent,'100,000'); assert.equal($('strat-treasury').textContent,'20,000');
$('tab-strat-troops').click(); assert.equal($('view-strat-troops').classList.contains('hidden'),false);
entries()[0].open = true; await tick();
assert.equal(entries()[0].querySelectorAll('.soldier-equip-slot-btn').length,Object.keys(SLOT_INFO).length,'every slot remains operable in an expanded soldier');
entries()[1].open = true; await tick(); assert.equal(entries().filter(e=>e.open).length,1,'one expanded soldier at a time');
const expandedId = game.uiExpandedSoldierId; game.renderStrategyUI(); await tick();
assert.equal(entries().filter(e=>e.open).length,1); assert.equal(game.uiExpandedSoldierId,expandedId,'selected soldier survives an action redraw');
input('roster-search','テスト兵士'); assert.equal(entries().filter(e=>!e.classList.contains('hidden')).length,1);
input('roster-search','いない兵士'); assert.equal($('roster-empty').classList.contains('hidden'),false);
input('roster-search',''); $('roster-wounded-only').checked=true; $('roster-wounded-only').dispatchEvent(new dom.window.Event('change'));
assert.ok(entries().filter(e=>!e.classList.contains('hidden')).length>=2);
$('tab-econ-scout').click(); assert.equal($('view-econ-scout').classList.contains('hidden'),false); assert.equal($('squad-roster-list').style.display,'none','hiring does not append the full army below candidates');
$('tab-econ-equip').click(); assert.equal($('view-strat-equip').classList.contains('hidden'),false);
input('inventory-slot-filter','weapon','change'); assert.equal(document.querySelectorAll('.inventory-card:not(.hidden)').length,3);
$('inventory-better-only').checked=true; $('inventory-better-only').dispatchEvent(new dom.window.Event('change'));
assert.equal(document.querySelectorAll('.inventory-card:not(.hidden)').length,1);
for (const row of document.querySelectorAll('.inventory-card.hidden')) assert.equal(window.getComputedStyle(row).display,'none','filters must hide cards through the final CSS cascade');
assert.equal(document.querySelector('.inventory-card:not(.hidden)').querySelector('.equip-btn').textContent,'装備');
document.querySelector('.inventory-card:not(.hidden) .equip-btn').click(); assert.equal(game.equipped.weapon.id,'better','reorganized bag still equips through the real handler');
$('inventory-better-only').checked=false; $('inventory-better-only').dispatchEvent(new dom.window.Event('change'));
const weakCard = [...document.querySelectorAll('.inventory-card')].find(e=>e.textContent.includes('検証装備worse'));
assert.equal(document.querySelectorAll('#inventory-list input[type=checkbox]').length,0,'sale selection is confined to the sale menu');
$('equipment-sale-toolbar').open=true;
const weakSale=()=>document.querySelector('#equipment-sale-toolbar [data-item-id="worse"] input');
assert.ok(weakSale());assert.equal(document.querySelector('#equipment-sale-toolbar [data-item-id="better"] input'),null,'equipped gear is excluded from sale choices');
weakSale().click(); assert.ok(game.selectedSaleIds.has('worse'));assert.equal($('equipment-sale-toolbar').open,true);assert.equal(document.activeElement,weakSale());
input('inventory-slot-filter','helmet','change'); assert.ok(game.selectedSaleIds.has('worse'),'hidden selections stay selected and the sell button counts all selected items');
const goldBefore = game.gold; document.querySelector('.sell-selected').click();
assert.ok(!game.inventory.some(i=>i.id==='worse')); assert.ok(game.gold>goldBefore);
input('inventory-slot-filter','','change');
// The real upgrade click must keep its place when it overtakes a stronger item.
document.querySelector('[data-inventory-group="weapon"]').click();
const keptInventory=game.inventory,keptEquipment=game.equipped;
const upgradeCandidate=generateRandomDrop(0,'normal',{id:'tap-upgrade',type:'WEAPON',tier:1,upgrade:0,quality:1,weaponStyle:'sword',merchant:true,random:()=>.5});
const initialLeader=structuredClone(upgradeCandidate);initialLeader.id='initial-leader';initialLeader.name='初期の首位';initialLeader.stats.atk+=1;
game.inventory=[initialLeader,upgradeCandidate];game.equipped={weapon:upgradeCandidate};game.renderStrategyUI();
const bagOrder=()=>[...document.querySelectorAll('#inventory-list > .inventory-card')].map(row=>row.dataset.itemId);
const upgradeButton=()=>document.querySelector('[data-item-id="tap-upgrade"] .btn-up-inv');
assert.deepEqual(bagOrder(),['initial-leader','tap-upgrade']);
const scrollBody=document.querySelector('.dialog-body');scrollBody.scrollTop=120;
const upgradeFunds=game.gold;let upgradeSpent=0;
for(let i=0;i<4;i++){
  upgradeSpent+=game.getUpgradeCost(upgradeCandidate);upgradeButton().focus();upgradeButton().click();
  assert.equal(upgradeCandidate.upgrade,i+1);assert.deepEqual(bagOrder(),['initial-leader','tap-upgrade']);
  assert.equal(document.activeElement,upgradeButton(),'keyboard focus stays on the upgraded item');assert.equal(scrollBody.scrollTop,120);
}
assert.ok(upgradeCandidate.stats.atk>initialLeader.stats.atk,'strength really crosses the sorting boundary');assert.equal(initialLeader.upgrade,0);assert.equal(game.gold,upgradeFunds-upgradeSpent);
game.renderStrategyUI();assert.deepEqual(bagOrder(),['initial-leader','tap-upgrade'],'other redraws do not interrupt the open upgrade session');
// The equipped-item upgrade uses the same stable ordering.
document.querySelector('.btn-up-equipped[data-slot="weapon"]').click();assert.equal(upgradeCandidate.upgrade,5);assert.deepEqual(bagOrder(),['initial-leader','tap-upgrade']);
game.closeStrategyModal();game.openStrategyModal(true);assert.deepEqual(bagOrder(),['tap-upgrade','initial-leader'],'reopening refreshes the real strength order');
game.inventory=keptInventory;game.equipped=keptEquipment;game.renderStrategyUI();
$('tab-econ-roster').click(); input('roster-search',''); $('roster-wounded-only').checked=false; $('roster-wounded-only').dispatchEvent(new dom.window.Event('change'));
const soldier = game.squad[0]; const row = entries().find(e=>e.dataset.soldierId===String(soldier.id));
row.open=true; await tick(); row.querySelector('.soldier-equip-slot-btn').click();
assert.equal($('equipment-transfer-popup').classList.contains('hidden'),false);
assert.equal(document.querySelectorAll('.transfer-slot-tab-btn').length,7);
assert.equal($('strategy-modal').inert,true,'transfer dialog blocks controls behind it');
document.querySelector('.transfer-popup-close-btn').dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
assert.equal($('equipment-transfer-popup').classList.contains('hidden'),true); assert.equal($('strategy-modal').inert,false);
row.querySelector('.btn-soldier-detail').click();
assert.equal(game.selectedSoldierDetailId,soldier.id);
const faceBefore=JSON.stringify(soldier.appearance);
assert.equal(document.querySelectorAll('#soldier-detail-host').length,1);
assert.equal(document.querySelectorAll('#soldier-detail-host .soldier-face-portrait').length,1);
assert.match(document.querySelector('.soldier-face-portrait').getAttribute('aria-label'),/素顔/);
game.openSoldierDetail(game.squad[1].id); assert.equal(document.querySelectorAll('#soldier-detail-host').length,1,'individual soldier windows reuse one host');
game.openSoldierDetail(soldier.id); assert.equal(JSON.stringify(soldier.appearance),faceBefore,'switching selected soldiers never rerolls the face');
assert.equal(document.querySelector('.dialog-body').inert,true);
document.querySelector('.btn-close-soldier-detail').dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
assert.equal(game.selectedSoldierDetailId,null); assert.equal(document.querySelector('.dialog-body').inert,false); assert.equal($('strategy-modal').classList.contains('hidden'),false);
$('tab-strat-nation').click(); assert.equal($('view-strat-nation').classList.contains('hidden'),false);
assertTab('nation');
const members = document.querySelector('.expedition-members'); members.open=true;
const pick = members.querySelector('.expedition-pick'); const pickedId=pick.dataset.sid, wasPicked=pick.checked; pick.click();
assert.equal(document.querySelector('.expedition-members').open,true,'member picker stays open while selecting soldiers');
assert.equal(game.getExpeditionPicks(Number(pick.dataset.pid)).map(String).includes(pickedId),!wasPicked);
assertTab('nation');
const nextTier = document.querySelector('.btn-danger-tier:not(.active)'); nextTier.click();
assert.equal(document.querySelector('.btn-danger-tier.active').getAttribute('aria-pressed'),'true');
assertTab('nation');
let donations=0; game.donateToTreasury=()=>donations++; $('btn-donate-treasury').click(); assert.equal(donations,1,'donation keeps its action after reparenting');
let heals=0; game.healAllSquad=()=>heals++; $('btn-heal-all').click(); assert.equal(heals,1);
const reserve=game.createNewSoldier();game.reserves.push(reserve);game.renderStrategyUI();
document.querySelector('#reserve-roster-list .mini-btn').click();assert.equal(game.selectedSoldierDetailId,reserve.id);
assert.match(document.querySelector('.soldier-detail-head').textContent,/予備兵/);game.closeSoldierDetail();
game.player.isAdvanced=true; game.player.advancedClass='WARLORD'; game.renderStrategyUI();
assert.match($('btn-promote-player').textContent,/帝皇/,'the existing second awakening stage must be reachable from the UI');
game.player.advancedClass='EMPEROR'; game.awakeningGems=0; game.renderStrategyUI();
assert.match($('btn-promote-player').textContent,/神話帝/); assert.equal($('btn-promote-player').disabled,true,'missing rare gems must be apparent before activating promotion');
game.awakeningGems=1; game.renderStrategyUI(); assert.equal($('btn-promote-player').disabled,false);
game.player.advancedClass='MYTHIC_EMPEROR'; game.renderStrategyUI(); assert.equal($('btn-promote-player'),null,'the final stage shows completion');
game.player.hp=1; game.restTimer=3; game.worldTime=300; game.updateStatsUI();
assert.equal($('player-hp').getAttribute('data-condition'),'critical');
assert.equal($('phase-timer-display').textContent,'待機 3秒'); assert.match($('day-night-badge').textContent,/夜/);
assert.equal(window.getComputedStyle($('player-hp')).color,'var(--ui-danger)','critical HP selects the warning rule rather than the healthy HP rule');
game.restTimer=0; game.player.hp=game.player.maxHp; game.updateStatsUI();
document.querySelector('.btn-expedition-send[data-pid="2"]').click();
assert.equal(game.platoons[2].mission,'expedition','nation screen still dispatches the real selected platoon');
game.saveGame(); const expeditionSave=saveSlots.get(game.activeSlotId).data;
game.resumeSavedGame(expeditionSave); assert.equal(game.platoons[2].mission,'expedition','mission restoration belongs to saved-game loading, not New Game');
game.openStrategyModal(true);
const faceSave=saveSlots.get(game.activeSlotId).data;
assert.ok(faceSave.squad.every(s=>s.appearance?.version===1));
// The current down-based deathline report is also shown during a manual opening.
game.restTimer=0;game.squad[0].phaseActivity={combatActions:1,healingDone:0,downs:10};game.completePhase();game.openStrategyModal(true);
assert.match($('strat-report').textContent,/個人で10回以上ダウン/);assert.doesNotMatch($('strat-report').textContent,/損耗率/);assert.ok(game.deathlineReport.awakenedList.length>0);
// Snapshot the actual generated DOM for static CSS review (not a browser screenshot).
if (process.env.UI_REVIEW_DIR) {
  const folder = resolve(process.env.UI_REVIEW_DIR); mkdirSync(folder,{recursive:true});
  for (const [name,tab,sub] of [['overview','overview',null],['roster','troops','roster'],['equipment','troops','equip'],['nation','nation',null]]) {
    if(sub) game.rosterManageTab=sub; game._selectStratTab(tab);
    if(name==='roster') for(const row of entries()) row.open=false;
    writeFileSync(resolve(folder,`${name}.html`),`<!doctype html><meta charset="utf-8"><style>${css}</style><div style="width:390px;height:844px;">${game.container.outerHTML}</div>`,'utf8');
  }
}
$('btn-start-next-wave').click(); assert.equal($('strategy-modal').classList.contains('hidden'),true); assert.equal(game.inBattle,true);
assert.equal(document.querySelector('.iron-squad').classList.contains('quiet-battlefield'), true);
assert.equal($('btn-strategy').parentElement.id, 'canvas-container');
assert.equal($('player-hp').closest('#battlefield-menu'), $('battlefield-menu'));
assert.equal($('merchant-prompt-banner').closest('#battle-menu-nearby'), $('battle-menu-nearby'));
assert.equal($('dungeon-prompt-banner').closest('#battle-menu-nearby'), $('battle-menu-nearby'));
assert.equal($('btn-world-map').closest('#battlefield-menu'), $('battlefield-menu'));
assert.equal($('btn-zoom-toggle').closest('#battlefield-menu'), $('battlefield-menu'));
assert.equal($('btn-pad-command').closest('#battlefield-menu'), $('battlefield-menu'));
assert.equal($('btn-pad-attack').closest('#virtual-gamepad'), $('virtual-gamepad'));
assert.equal($('btn-pad-potion').closest('#virtual-gamepad'), $('virtual-gamepad'));
assert.equal($('btn-pad-power').closest('#virtual-gamepad'), $('virtual-gamepad'));
assert.equal($('dpad-base').closest('#virtual-gamepad'), $('virtual-gamepad'));
assert.equal(window.getComputedStyle(document.querySelector('.game-header')).display, 'none');
assert.equal(window.getComputedStyle(document.querySelector('.battle-log-window')).display, 'none');
game.updateStatsUI();
const vitals=$('quiet-vitals');
assert.equal(window.getComputedStyle(vitals).display, 'flex');
assert.equal(window.getComputedStyle(vitals).visibility, 'visible');
assert.match(vitals.textContent, /HP \d+\/\d+/);
assert.match(vitals.textContent, /MP /);
assert.equal(vitals.querySelector('.qv-gold').textContent, $('current-gold').textContent);
assert.equal(vitals.querySelector('.qv-hp').getAttribute('data-condition'), $('player-hp').getAttribute('data-condition'));
const nav=document.querySelector('.navigation-overlay');
const navStyle=window.getComputedStyle(nav);
assert.notEqual(navStyle.left, '50%');
assert.equal(navStyle.transform, 'none');
assert.ok(Number(navStyle.opacity) < 0.8, 'the field map is translucent');
game.openStrategyModal(true);
const mapBtn=$('btn-world-map');
assert.equal(window.getComputedStyle(mapBtn).pointerEvents, 'auto');
assert.notEqual(window.getComputedStyle(mapBtn).visibility, 'hidden');
const awayFrom=game.player.x+6000;
game.player.x=awayFrom;
game.worldTerrain||={drawOverview(){}};
mapBtn.click();
assert.equal($('world-map-modal').classList.contains('hidden'), false);
assert.match($('fast-travel-list').textContent, /本陣/);
$('fast-travel-list').querySelector('button').click();
assert.notEqual(game.player.x, awayFrom);
assert.equal($('world-map-modal').classList.contains('hidden'), true);
for (const node of document.querySelectorAll('#battlefield-menu .phase-banner')) node.classList.add('hidden');
await Promise.resolve();
assert.equal(document.querySelector('.menu-attention').classList.contains('hidden'), true);
$('merchant-prompt-banner').classList.remove('hidden');
await Promise.resolve();
assert.equal(document.querySelector('.menu-attention').classList.contains('hidden'), false);
$('merchant-prompt-banner').classList.add('hidden');
await Promise.resolve();
assert.equal(document.querySelector('.menu-attention').classList.contains('hidden'), true);
game.openStrategyModal(true);
assert.equal($('canvas-container').inert, false, 'the field container stays active so the menu inside it can be tapped');
assert.equal($('game-canvas').inert, true);
assert.equal($('virtual-gamepad').inert, true);
assert.equal($('strategy-modal').classList.contains('game-overlay'), true);
assert.equal(Boolean($('strategy-modal').inert), false);
assert.equal(Boolean($('game-overlay').inert), false);
assert.equal(Boolean($('btn-start-next-wave').inert), false);
assert.equal($('btn-pad-attack').closest('#virtual-gamepad').inert, true);
$('btn-start-next-wave').click();
assert.equal($('strategy-modal').classList.contains('hidden'), true);
assert.equal($('game-canvas').inert, false);
assert.equal($('virtual-gamepad').inert, false);
game.player={x:79360,y:79360,facingAngle:0}; game.minimapCanvas=$('minimap-canvas'); game.minimapCtx=context;
assert.doesNotThrow(()=>game.renderMinimap());
console.log('PASS: live DOM navigation, compact army, search, expanded-state retention, seven transfer slots, equipment comparison filters, real equip/sale actions, donation, healing and return to battle, quiet field controls and menu map');
dom.window.close();
