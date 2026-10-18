// DOM integration (v7.0.24): comparison cards judged on the inherited +level, +1/+10/+100 upgrade buttons. node iron-squad/tests/ui-v7024.test.mjs [jsdom dir]
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
const require = createRequire(resolve(process.argv[2] || '__pycache__/ui-tools', 'entry.cjs'));
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<div id="game" class="game-container"></div>', { url: 'http://localhost/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage });
globalThis.alert=message=>alerts.push(String(message));const alerts=[];
const css = ['style','game-ui','iron-squad','iron-squad-interface'].map(name=>readFileSync(['style','game-ui'].includes(name)?`common/css/${name}.css`:`iron-squad/css/${name}.css`,'utf8')).join('\n');
const sheet = document.createElement('style'); sheet.textContent=css; document.head.append(sheet);
const noop = () => {};
const context = new Proxy({ measureText: () => ({width:40}), createLinearGradient: () => ({addColorStop:noop}), createRadialGradient: () => ({addColorStop:noop}) }, {get:(o,k)=>k in o?o[k]:noop});
dom.window.HTMLCanvasElement.prototype.getContext = () => context;
const { IronSquadGame, SLOT_INFO, generateRandomDrop, applyUpgradeStats } = await import('../js/index.js');
const { saveSlots } = await import('../js/save-slots.js');
const { equipmentUpgradeCost } = await import('../js/payroll-rules.js');
const game = Object.create(IronSquadGame); game.container = document.getElementById('game');
const toasts=[];
game.startGameLoop=noop;game.showToast=message=>toasts.push(String(message));
Object.assign(game, { width:390, height:664, zoom:1, ctx:context, camera:{x:79360,y:79360}, selectedSaleIds:new Set(), commandActiveUntil:0 });
game.setupUI(); game.activeSlotId = saveSlots.create('UI TEST ONLY').id; game.startFreshGame(false);game.career.status='enlisted';
game.gold = 50_000_000;game.treasury=20000;
const drop=(id,type,tier,upgrade,quality=1)=>generateRandomDrop(0,'normal',{tier,type,quality,upgrade,id,merchant:true,random:()=>.5});
const costOf=item=>game.getUpgradeCost(item);
const sumCost=(item,n)=>Array.from({length:n},(_,i)=>equipmentUpgradeCost({...item,upgrade:(item.upgrade||0)+i})).reduce((a,b)=>a+b,0);

// ---- bag card: the headline judges the item carrying the +level; the as-is verdict is small ----
const current=drop('cur-legs','LEGS',1,60),candidate=drop('cand-legs','LEGS',6,0);
game.equipped={...game.equipped,legs:current};game.inventory=[current,candidate];game.recalcPlayerStats();game.openStrategyModal(true);
document.getElementById('tab-strat-troops').click();document.getElementById('tab-econ-equip').click();
const card=()=>document.querySelector('#inventory-list [data-item-id="cand-legs"]');
assert.ok(card().querySelector('.cmp-card'),'new card markup');
const headline=card().querySelector('.cmp-label'),plainRow=card().querySelector('.cmp-plain');
assert.ok(headline&&plainRow&&card().querySelector('details.cmp-details'),'verdict, as-is line and folded details');
assert.match(card().querySelector('.cmp-basis').textContent,/\+60引継後/);
const inheritedPreview=structuredClone(candidate);applyUpgradeStats(inheritedPreview,60);
const expectInherited=game.equipmentComparisonFor(game.player,candidate,current,{inherit:true});
assert.equal(headline.textContent,expectInherited.primary.label);assert.equal(expectInherited.primary.kind,'better','the +60 carried item beats the +60 old piece');
assert.match(plainRow.textContent,/そのまま替えた場合/);assert.equal(plainRow.querySelector('strong').textContent,expectInherited.plain.label);
assert.equal(card().querySelector('.cmp-reason').textContent.length>0,true);
assert.equal(card().dataset.improves,'true');
assert.ok(card().querySelector('.equip-cmp-head').textContent.includes('隊長の現装備比'));
assert.equal(card().querySelectorAll('.cmp-card').length,1,'one comparison per card (the separate inherit block is gone)');

// ---- upgrade buttons: +1 / +10 / +100 on the bag, on equipped gear ----
const weapon=drop('up-weapon','WEAPON',1,0);game.equipped.weapon=weapon;game.inventory=[weapon,current,candidate];game.recalcPlayerStats();game.renderStrategyUI();
const bagButtons=()=>[...document.querySelectorAll('#inventory-list [data-item-id="up-weapon"] .btn-up-inv')];
const equipButtons=()=>[...document.querySelectorAll('.btn-up-equipped[data-slot="weapon"]')];
assert.deepEqual(bagButtons().map(b=>b.dataset.times),['1','10','100']);assert.deepEqual(equipButtons().map(b=>b.dataset.times),['1','10','100']);
assert.ok(bagButtons()[1].textContent.includes(sumCost(weapon,10).toLocaleString('ja-JP')+'G'),'+10 shows its total');
assert.ok(bagButtons()[2].textContent.includes(sumCost(weapon,100).toLocaleString('ja-JP')+'G'),'+100 shows its total');
const g0=game.gold,expected10=sumCost(weapon,10);toasts.length=0;
bagButtons()[1].click();
assert.equal(weapon.upgrade,10);assert.equal(game.gold,g0-expected10);assert.equal(toasts.length,1,'one toast for the whole run');assert.match(toasts[0],new RegExp(`強化\\+10回（合計${expected10.toLocaleString('ja-JP')}G）`));
const g1=game.gold,expected100=sumCost(weapon,100);toasts.length=0;
equipButtons()[2].click();
assert.equal(weapon.upgrade,110);assert.equal(game.gold,g1-expected100);assert.equal(toasts.length,1);assert.match(toasts[0],/強化\+100回/);
// a short purse: +100 buys what it can pay for
game.gold=sumCost(weapon,7)+equipmentUpgradeCost({...weapon,upgrade:weapon.upgrade+7})-1;game.renderStrategyUI();
assert.ok(!bagButtons()[1].disabled,'+10 still pays for 7');assert.match(bagButtons()[1].textContent,/7回/);
toasts.length=0;const before=weapon.upgrade,expected7=sumCost(weapon,7),goldBefore=game.gold;bagButtons()[2].click();
assert.equal(weapon.upgrade,before+7);assert.equal(game.gold,goldBefore-expected7);assert.match(toasts[0],/強化\+7回/);
assert.ok(game.gold<equipmentUpgradeCost(weapon),'nothing is left to buy another level');
game.renderStrategyUI();assert.equal(bagButtons()[1].disabled,true);assert.equal(bagButtons()[2].disabled,true);assert.match(bagButtons()[2].textContent,/所持金不足/);assert.equal(bagButtons()[0].disabled,false,'+1 still reports the short purse itself');
alerts.length=0;const stuck=weapon.upgrade;bagButtons()[0].click();assert.equal(weapon.upgrade,stuck);assert.equal(alerts.length,1);
game.gold=1e12;game.renderStrategyUI();
// +1 behaves exactly as before
const one=sumCost(weapon,1),keep=game.gold;bagButtons()[0].click();assert.equal(game.gold,keep-one);assert.equal(weapon.upgrade,stuck+1);
// focus stays on the pressed step (+10) after the redraw
bagButtons()[1].focus();bagButtons()[1].click();assert.equal(document.activeElement.dataset.times,'10');assert.ok(document.activeElement.classList.contains('btn-up-inv'));

// ---- soldiers: 武器自費強化 +1 / +10 / +100 pay from the soldier's own gold ----
const soldier=game.squad[0];soldier.isPersonalGuard=true;
const sw=drop('soldier-weapon','WEAPON',1,0);soldier.equipped={...soldier.equipped,weapon:sw};soldier.weapon=sw;soldier.gold=1e9;game.recalcSoldierStats(soldier);game.renderStrategyUI();
const soldierButtons=()=>[...document.querySelectorAll(`.roster-entry[data-soldier-id="${soldier.id}"] .btn-soldier-up`)];
assert.deepEqual(soldierButtons().map(b=>b.dataset.times),['1','10','100']);
const own=game.gold,spent10=sumCost(sw,10),sg=soldier.gold;toasts.length=0;soldierButtons()[1].click();
assert.equal(sw.upgrade,10);assert.equal(soldier.gold,sg-spent10);assert.equal(game.gold,own,'the commander pays nothing');assert.equal(toasts.length,1);assert.match(toasts[0],/強化\+10回/);
soldier.gold=sumCost(sw,3)+1;game.renderStrategyUI();assert.match(soldierButtons()[1].textContent,/3回/);
const sBefore=sw.upgrade;soldierButtons()[2].click();assert.equal(sw.upgrade,sBefore+3);
game.renderStrategyUI();assert.equal(soldierButtons()[1].disabled,true);

// ---- workshop / transfer share the same card ----
game.gold=1e9;game.openEquipmentTransferPopup(soldier,'legs');
const badge=document.querySelector('.transfer-item-card .transfer-comp-badge'),transferCard=document.querySelector('.transfer-item-card .cmp-card');
assert.ok(badge&&transferCard,'transfer popup uses the new card');assert.equal(badge.textContent,transferCard.querySelector('.cmp-label').textContent,'badge and headline agree');
console.log('PASS: inherited-level headline, one card per item, +1/+10/+100 on bag / equipped / soldier, short purse, focus');
