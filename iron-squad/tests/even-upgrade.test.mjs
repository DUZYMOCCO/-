import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {planEvenUpgrades} from '../js/even-upgrade.js';
import {equipmentUpgradeCost} from '../js/payroll-rules.js';
// Compare the quote with literal one-at-a-time forging, including tier-dependent ties.
for(const budget of [0,19,20,70,500,5000,50000])for(const uneven of [false,true]){
 const equipped=Object.fromEntries(Array.from({length:7},(_,i)=>[i,{id:i,tier:1+i%3,upgrade:uneven?i:0}]));
 const before=structuredClone(equipped),copy=structuredClone(equipped);let gold=budget,count=0;
 while(true){const next=Object.values(copy).sort((a,b)=>a.upgrade-b.upgrade||equipmentUpgradeCost(a)-equipmentUpgradeCost(b))[0],cost=equipmentUpgradeCost(next);if(gold<cost)break;gold-=cost;next.upgrade++;count++;}
 const plan=planEvenUpgrades(equipped,budget);assert.deepEqual(equipped,before);assert.equal(plan.count,count);assert.equal(plan.spent,budget-gold);assert.equal(plan.remaining,gold);assert.deepEqual(plan.entries.map(e=>e.to),Object.values(copy).map(i=>i.upgrade));
 if(!uneven)assert.ok(Math.max(...plan.entries.map(e=>e.to))-Math.min(...plan.entries.map(e=>e.to))<=1);
}
assert.equal(planEvenUpgrades({},100).count,0);const same={tier:1,upgrade:0};assert.equal(planEvenUpgrades({a:same,b:same},20).count,1);
const tie=planEvenUpgrades({expensive:{tier:3,upgrade:0},cheap:{tier:1,upgrade:0}},20);assert.deepEqual(tie.entries.map(e=>e.to),[0,1]);
const dom=new JSDOM('<div id="game"></div>',{url:'http://localhost/'});Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js');
const g=Object.create(IronSquadGame);Object.assign(g,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),startGameLoop:noop,showToast:noop});
g.setupUI();g.activeSlotId=saveSlots.create('EVEN FORGING TEST').id;g.startFreshGame(false);g.openStrategyModal(true);g._commanderTab='equip';g._selectStratTab('commander'); // v7.1.11: commander gear lives in the commander window
for(const [slot,type]of Object.entries({weapon:'WEAPON',shield:'SHIELD',helmet:'HELMET',armor:'ARMOR',gloves:'GLOVES',legs:'LEGS',amulet:'AMULET'}))g.equipped[slot]=g.createSupplyEquipment(type,g.player,1);
g.gold=5000;g.recalcPlayerStats();g.renderStrategyUI();
const counts={};for(const method of ['recalcPlayerStats','saveGame','renderStrategyUI','updateStatsUI']){const original=g[method];g[method]=function(...args){counts[method]=(counts[method]||0)+1;return original.apply(this,args);};}
const click=()=>document.getElementById('btn-even-upgrade').click();
let before=structuredClone(g.equipped),gold=g.gold;click();click();assert.equal(document.querySelectorAll('#even-upgrade-confirm').length,1);document.querySelector('[data-even-upgrade="cancel"]').click();assert.deepEqual(g.equipped,before);assert.equal(g.gold,gold);assert.deepEqual(counts,{});
const quote=planEvenUpgrades(g.equipped,g.gold);click();const message=document.getElementById('even-upgrade-message').textContent;assert.ok(message.includes(quote.count.toLocaleString()));assert.ok(message.includes(quote.spent.toLocaleString()));
const accept=document.querySelector('[data-even-upgrade="accept"]');accept.click();accept.click();assert.equal(g.gold,gold-quote.spent);assert.deepEqual(Object.values(g.equipped).map(i=>i.upgrade),quote.entries.map(e=>e.to));assert.deepEqual(counts,{recalcPlayerStats:1,saveGame:1,renderStrategyUI:1,updateStatsUI:1});
assert.notEqual(saveSlots.get(g.activeSlotId).data.gold,g.gold,'ordinary forging waits for autosave');g.saveGame({auto:true});const saved=saveSlots.get(g.activeSlotId).data;assert.equal(saved.gold,g.gold);assert.deepEqual(Object.values(saved.equipped).map(i=>i.upgrade),Object.values(g.equipped).map(i=>i.upgrade));assert.equal(document.querySelectorAll('.btn-up-equipped[data-times="1"]').length,7,'single-item forging remains available');assert.equal(document.querySelectorAll('.btn-up-equipped').length,21,'+1 / +10 / +100 for each of the 7 slots');
// A stale confirmation never charges a changed wallet or changed equipment.
g.gold=5000;click();g.gold--;gold=g.gold;before=structuredClone(g.equipped);document.querySelector('[data-even-upgrade="accept"]').click();assert.equal(g.gold,gold);assert.deepEqual(g.equipped,before);assert.equal(counts.saveGame,2);
click();g.equipped.weapon={...g.equipped.weapon};document.querySelector('[data-even-upgrade="accept"]').click();assert.equal(counts.saveGame,2);
g.gold=0;click();assert.equal(document.querySelector('#even-upgrade-confirm'),null);assert.equal(counts.saveGame,2);
dom.window.close();console.log('PASS: exact tier/tie/budget quotes, balance, cancellation, one modal, single application/save/recalc/render, stale confirmation and retained single upgrades');
