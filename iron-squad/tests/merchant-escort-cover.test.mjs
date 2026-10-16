import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {merchantEscortCover,noteEscortDamage,updateEscortRegen,updateMerchants,npcSave,applyNpcSave,ESCORT_COVER,ESCORT_REGEN} from '../js/merchant-rules.js?v=286';
const escort=(x=10100)=>({id:'escort',name:'護衛',isMerchantEscort:true,soldierClass:'HEAVY',x,y:10000,hp:200,maxHp:200,def:0,dmgReduction:0,radius:0,speed:78});
const merchant=()=>({id:'merchant',name:'ルカ',isMerchant:true,x:10000,y:10000,hp:200,maxHp:200,stockPhase:1,escorts:[escort()]});
const enemy={x:10000,y:10000,hp:1000,atk:100,radius:1};let m=merchant(),g={merchants:[m],player:{x:10000,y:10000},monsters:[],phase:1};
assert.deepEqual(ESCORT_COVER,{radius:180,share:.5,minHp:.2});assert.deepEqual(ESCORT_REGEN,{delay:3,perSecond:.01});
const near=escort(10050);near.id='near';m.escorts.push(near);assert.equal(merchantEscortCover(g,m,100,{attacker:enemy}).guardian,near);
assert.equal(merchantEscortCover(g,m,100,{attacker:enemy}).share,50);
for(const options of [{environmental:true},{cover:true},{noCover:true}])assert.equal(merchantEscortCover(g,m,100,{attacker:enemy,...options}),null);
assert.equal(merchantEscortCover(g,m,100),null);assert.equal(merchantEscortCover(g,m,0,{attacker:enemy}),null);
near.hp=40;m.escorts[0].hp=40;assert.equal(merchantEscortCover(g,m,100,{attacker:enemy}),null,'20 percent is excluded');near.hp=41;assert.equal(merchantEscortCover(g,m,100,{attacker:enemy}).guardian,near);
near.x=10181;assert.equal(merchantEscortCover(g,m,100,{attacker:enemy}),null);near.x=10180;assert.equal(merchantEscortCover(g,m,100,{attacker:enemy}).guardian,near);
for(const state of [{isDown:true},{dead:true},{hp:0}]){const old={...near};Object.assign(near,state);assert.equal(merchantEscortCover(g,m,100,{attacker:enemy}),null);Object.assign(near,old);}
// Contact damage uses the same split even without a runtime hook; guardian defense still applies.
m=merchant();m.escorts[0].def=100;g={merchants:[m],player:{x:10000,y:10000},monsters:[{...enemy}],phase:1};updateMerchants(g,.01);
assert.equal(m.hp,182.5,'existing guarded-merchant raw 35 splits into two 17.5 shares');assert.equal(m.escorts[0].hp,192,'escort defense reduces its share');assert.equal(m.escorts[0].escortRegenWait,3);
// Exact delay and fractional dt accounting; far LOD cannot freeze or accelerate healing.
let e=escort();e.hp=100;noteEscortDamage(e,10);updateEscortRegen(e,3);assert.equal(e.hp,100);updateEscortRegen(e,1);assert.equal(e.hp,102);noteEscortDamage(e,1);updateEscortRegen(e,2);assert.equal(e.hp,102);updateEscortRegen(e,2);assert.equal(e.hp,104);
const saved=npcSave(e),loaded=escort();applyNpcSave(loaded,saved);assert.equal(loaded.escortRegenWait,e.escortRegenWait);
for(const distant of [false,true]){m=merchant();e=m.escorts[0];e.hp=100;noteEscortDamage(e,10);g={merchants:[m],player:{x:distant?20000:10000,y:10000},camera:{x:20000,y:20000},monsters:[],phase:1};for(let i=0;i<10;i++)updateMerchants(g,1);assert.equal(e.hp,114);}
e.hp=199;e.escortRegenWait=0;updateEscortRegen(e,100);assert.equal(e.hp,200);
for(const state of [{isDown:true},{dead:true},{hp:0},{isGateGuard:true}]){e={...escort(),hp:100,...state};const before=e.hp;updateEscortRegen(e,100);assert.equal(e.hp,before);}
// Actual damageTarget: no nested cover, reduced merchant loss, normal guardian armor and feedback.
const dom=new JSDOM('<div id="game"></div>',{url:'http://localhost/'});Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js?v=269');const game=Object.create(IronSquadGame);Object.assign(game,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:10000,y:10000},selectedSaleIds:new Set(),startGameLoop:noop,showToast:noop});game.setupUI();game.activeSlotId=saveSlots.create('ESCORT COVER TEST').id;game.startFreshGame(false);game.squad=[];game.reserves=[];game.gateGuards=[];game.recalcSoldierStats=noop;
const feedback=[];game.spawnDamageText=(x,y,text)=>feedback.push({x,y,text});m=merchant();game.merchants=[m];e=m.escorts[0];game.damageTarget(m,100,{attacker:enemy});assert.equal(m.hp,150);assert.equal(e.hp,150);assert.equal(e.escortRegenWait,3);assert.ok(feedback.some(f=>String(f.text).includes('みがわり')&&f.x===e.x));
e.hp=40;m.hp=200;game.damageTarget(m,100,{attacker:enemy});assert.equal(m.hp,100);assert.equal(e.hp,40);
for(const options of [{environmental:true},{cover:true},{noCover:true}]){m.hp=200;e.hp=200;game.damageTarget(m,100,{attacker:enemy,...options});assert.equal(e.hp,200);}
e.hp=200;m.hp=200;game.damageTarget(m,10000,{attacker:enemy});assert.ok(e.hp>=1,'cover itself never downs the guardian, matching heavy cover');
dom.window.close();console.log('PASS: own nearest escort, radius/HP/exclusions, contact and generic splits, guardian armor/feedback/no chain, exact regen delay/rate/cap/LOD/save and no gate regen');

