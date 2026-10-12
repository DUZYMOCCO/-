import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {HEADQUARTERS_FACILITIES,nearHeadquartersFacility,updateHeadquartersFacilityPrompt,headquartersBuildingBlocks} from '../js/hq-facilities.js';
import {fieldBlocks,WORLD_SIZE,WorldTerrain} from '../js/world.js';
import {wallGeometry,gatePositions} from '../js/gate-rules.js';
import {normalizeNation} from '../js/nation-rules.js';
const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js');
const g=Object.create(IronSquadGame);Object.assign(g,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set()});
for(const method of ['startGameLoop','showToast','spawnDamageText','spawnSparks'])g[method]=noop;
g.setupUI();g.activeSlotId=saveSlots.create('HQ FACILITY TEST').id;g.startFreshGame(false);
const C=WORLD_SIZE/2,walkTo=id=>{const p=HEADQUARTERS_FACILITIES.find(p=>p.id===id);Object.assign(g.player,{x:p.x,y:p.y+24});g.restTimer=0;g.currentDungeon=null;g.inBattle=true;updateHeadquartersFacilityPrompt(g);return p;};
const walls=wallGeometry(g);
for(const p of HEADQUARTERS_FACILITIES) {
  assert.ok(p.x-p.w/2>walls.left&&p.x+p.w/2<walls.right&&p.y<walls.bottom&&p.y-p.h-35>walls.top,'shops stay inside HQ');
  assert.equal(headquartersBuildingBlocks(p.x,p.y-20),true,'the commander cannot walk through the facade');
  assert.equal(fieldBlocks(p.x,p.y-20),false,'army movement and attack lanes keep their established rules');
  assert.equal(fieldBlocks(p.x,p.y+24),false,'the entrance remains accessible');
}
const {messPoint,CAMP_X,CAMP_Y,YARD_SEAT_COUNT}=await import('../js/camp-leisure.js?v=198'),{hqFacilityPlotContains}=await import('../js/hq-facility-layout.js?v=198');
for(let i=0;i<YARD_SEAT_COUNT;i++){const s=messPoint(i,'sit');assert.equal(hqFacilityPlotContains(s.x-CAMP_X,s.y-CAMP_Y,0),false,`resting soldier seat ${i} stays clear of the HQ buildings`);}
for(const gate of gatePositions(walls))for(let t=0;t<=1;t+=.05) {
  const x=C+(gate.x-C)*t,y=C+(gate.y-C)*t;
  assert.equal(fieldBlocks(x,y)||headquartersBuildingBlocks(x,y),false,'the commander can follow the central aisle to every gate');
}
walkTo('smith');assert.equal(nearHeadquartersFacility(g)?.id,'smith');
assert.equal(g.openHeadquartersFacility('casino'),false,'a remote facility cannot open');
assert.equal(g.openHeadquartersFacility('smith'),true);assert.equal(g.inBattle,false);
const pausedTime=g.worldTime;g.update(.1);assert.equal(g.worldTime,pausedTime,'time pauses inside the shop');
assert.equal(document.getElementById('btn-workshop-buy').disabled,true,'unopened workshop cannot charge');
assert.equal(g.buyWorkshopEquipment('weapon-sword',1),false);
g.closeHeadquartersFacility();assert.equal(g.inBattle,true);assert.equal(g.container.classList.contains('dialog-open'),false);
g.nation=normalizeNation({investment:90000});g.gold=100000;
walkTo('smith');g.openHeadquartersFacility('smith');
const before=g.gold,items=g.inventory.length;document.getElementById('btn-workshop-buy').click();
assert.ok(g.gold<before);assert.equal(g.inventory.length,items+1);assert.equal(document.querySelectorAll('#workshop-tier').length,1);
assert.ok(document.querySelector('.facility-intro').textContent.includes(g.gold.toLocaleString()),'shop shows the transaction result');
const saved=structuredClone(g.saveGame());g.resumeSavedGame(saved);assert.equal(document.getElementById('hq-facility-dialog'),null,'loading closes transient shop UI');
walkTo('guild');g.openHeadquartersFacility('guild');document.querySelector('[data-guild-accept="slime"]').click();
assert.equal(g.nation.guild.active.length,1);assert.equal(document.querySelector('[data-guild-claim="slime"]').disabled,true);
const contract=g.nation.guild.active[0];for(let i=0;i<contract.target;i++)g.onNationKill({type:'slime'});g.renderStrategyUI();const gold=g.gold,reward=contract.reward;
document.querySelector('[data-guild-claim="slime"]').click();assert.equal(g.gold,gold+reward);assert.equal(g.nation.guild.active.length,0);
g.closeHeadquartersFacility();walkTo('casino');g.openHeadquartersFacility('casino');
assert.equal(g.buyWorkshopEquipment('weapon-sword',1),false,'casino proximity cannot authorize workshop purchases');
const stake=g.nation.casino.bet,casinoGold=g.gold;document.getElementById('btn-casino-poker').click();assert.equal(g.gold,casinoGold-stake);
assert.equal(g.nation.casino.poker.status,'draw');g.closeHeadquartersFacility();
g.player.x=C;g.player.y=C;const remoteGold=g.gold;assert.equal(g.spinCasinoSlot(),false);assert.equal(g.gold,remoteGold);
g.renderStrategyUI();assert.equal(document.querySelector('#nation-facilities .workshop-panel'),null,'the menu points to actual buildings');
const terrain=new WorldTerrain();const p=HEADQUARTERS_FACILITIES[0],tile=terrain.get(Math.floor(p.x/512),Math.floor(p.y/512));
assert.ok(!tile.objects.some(o=>Math.abs(o.x-p.x)<p.w/2+20&&o.y>p.y-p.h-36&&o.y<p.y+56),'natural scenery leaves the plot clear');terrain.clear();
console.log('PASS: three HQ buildings, solid footprints and five open gate aisles, local entry, locked/remote guards, paused clock, live shop transactions and UI, guild payment, casino stakes, reload cleanup and cleared scenery');
dom.window.close();
