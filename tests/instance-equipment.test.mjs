import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {JSDOM} from '../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {WORLD_SIZE} from '../js/games/iron-squad/world.js';
import {activeSquad,inCurrentInstance} from '../js/games/iron-squad/instance-rules.js';
import {supplyLocation} from '../js/games/iron-squad/supply-rules.js';
import {attachWounded,markSoldierDown,syncDragged} from '../js/games/iron-squad/casualty-rules.js';
import {gateGuardVisible} from '../js/games/iron-squad/gate-rules.js';
import {distributeSharedBoxToSoldiers} from '../js/games/iron-squad/economy-rules.js';
import {compareEquipmentStrength} from '../js/games/iron-squad/equipment-rules.js';
import {fiscalTotals} from '../js/games/iron-squad/nation-rules.js';
const dom=new JSDOM('<div id="game" class="game-container iron-squad"></div>',{url:'http://localhost/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,screen:{},confirm:()=>true,alert:()=>{}});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame,generateRandomDrop,SLOT_INFO}=await import('../js/games/iron-squad/index.js');
const {saveSlots}=await import('../js/games/iron-squad/save-slots.js');
const game=Object.create(IronSquadGame),center=WORLD_SIZE/2;
Object.assign(game,{container:document.getElementById('game'),width:390,height:664,zoom:1,ctx,camera:{x:center,y:center},selectedSaleIds:new Set(),commandActiveUntil:0,joystick:{active:false,dirX:0,dirY:0}});
for(const method of ['startGameLoop','showToast','spawnDamageText','spawnSparks'])game[method]=noop;
game.setupUI();game.activeSlotId=saveSlots.create('INSTANCE EQUIPMENT TEST ONLY').id;game.startFreshGame(false);
const initial=structuredClone(game.saveGame()),fresh=()=>{game._merchantShopClose?.();game.resumeSavedGame(structuredClone(initial));game.closeStrategyModal();game.monsters=[];game.restTimer=0;game.currentQuest=null;game.updateSpawns=noop;};
const savePreview=name=>{
  if(!process.env.EQUIPMENT_REVIEW_DIR)return;
  mkdirSync(process.env.EQUIPMENT_REVIEW_DIR,{recursive:true});
  const html=`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>装備画面の表示確認</title>${['style','game-ui','iron-squad','iron-squad-interface'].map(n=>`<link rel="stylesheet" href="/css/${n}.css?v=114">`).join('')}</head><body>${game.container.outerHTML}</body></html>`;
  writeFileSync(resolve(process.env.EQUIPMENT_REVIEW_DIR,name+'.html'),html);
};
const gear=(id,type='WEAPON',tier=1,upgrade=0)=>generateRandomDrop(0,'normal',{id,type,tier,upgrade,quality:1,merchant:true,random:()=>.5});

// All instance kinds exclude the field army from movement, targeting, pickup, draw and save conversion.
for(const kind of ['dungeon','ruin','town']){
  fresh();game.rankIndex=2;game.player.atkCooldown=100;
  const companions=[game.squad[0],game.squad[3]];for(const s of companions)s.isPersonalGuard=true;
  const def={...game.dungeons.find(d=>d.kind===kind),mobCount:0,eliteCount:0,boss:null,guardian:null};
  const main=game.squad.filter(s=>!s.isPersonalGuard);
  // Deliberately overlap coordinates: distance alone must not make field troops local.
  Object.assign(main[0],{x:245,y:def.height/2});
  const positions=new Map(main.map(s=>[s.id,{x:s.x,y:s.y,hp:s.hp}])),platoons=game.platoons.map(p=>[p.x,p.y]);
  game.projectiles=[{x:center,y:center}];game.enterDungeon(def);
  assert.equal(game.projectiles.length,0);assert.deepEqual(activeSquad(game).map(s=>s.id),companions.map(s=>s.id));
  assert.equal(game.assignToPersonalSquad(main[0].id),false);assert.equal(game.returnToMainForce(companions[0].id),false,'roster changes wait for field coordinates');
  assert.equal(inCurrentInstance(game,main[0]),false);assert.equal(supplyLocation(game,main[0]),null);
  for(const s of main)assert.deepEqual({x:s.x,y:s.y,hp:s.hp},positions.get(s.id));
  const newcomer=game.createNewSoldier();game.squad.push(newcomer);const newPos=[newcomer.x,newcomer.y];
  if(kind!=='town'){
    const s=companions[0];Object.assign(s,{_pgTick:3,atkCooldown:0});
    game.monsters=[{type:'goblin',x:s.x+25,y:s.y,hp:1e6,maxHp:1e6,atk:10,speed:0,radius:12,atkTimer:0}];
    game.dropsOnField=[{x:main[0].x,y:main[0].y,item:gear('outside-only-loot','HELMET')}];
    for(let i=0;i<10;i++)game.update(.05);
    assert.ok(companions.some(s=>(s.phaseActivity?.combatActions||0)>0),'companions still fight');
  } else game.update(.1);
  for(const s of main)assert.deepEqual({x:s.x,y:s.y,hp:s.hp},positions.get(s.id),'field army cannot act in the room');
  assert.deepEqual(game.platoons.map(p=>[p.x,p.y]),platoons);
  const drawn=[],draw=game.drawSoldier;game.drawSoldier=(c,s)=>drawn.push(s.id);game.render();game.drawSoldier=draw;
  assert.ok(drawn.includes(companions[0].id),'the real renderer still draws the personal squad');
  assert.ok(drawn.every(id=>companions.some(s=>s.id===id)),'field soldiers are absent even at overlapping room coordinates');
  const snapshot=game.saveGame();assert.ok(snapshot);
  for(const s of main){const saved=snapshot.squad.find(u=>u.id===s.id);assert.deepEqual([saved.x,saved.y],[positions.get(s.id).x,positions.get(s.id).y]);}
  game.exitDungeon();for(const s of main)assert.deepEqual([s.x,s.y],[positions.get(s.id).x,positions.get(s.id).y]);
  assert.deepEqual([newcomer.x,newcomer.y],newPos,'recruits arriving outside also stay outside on exit');
  assert.ok(companions.every(s=>Math.hypot(s.x-game.player.x,s.y-game.player.y)<50));
}
// Carried non-guard casualties remain local, without transporting other main troops.
fresh();game.enterDungeon({...game.dungeons.find(d=>d.kind==='dungeon'),mobCount:0,eliteCount:0,boss:null});game.update(.01);
assert.equal(activeSquad(game).length,0);assert.doesNotMatch(document.getElementById('squad-proximity-badge').textContent,/全滅/);assert.match(document.getElementById('squad-proximity-badge').textContent,/48名野外待機/);game.exitDungeon();
fresh();const patient=game.squad[1];Object.assign(patient,{x:game.player.x+10,y:game.player.y});markSoldierDown(game,patient);assert.equal(attachWounded(game,game.player,patient),true);
game.enterDungeon({...game.dungeons.find(d=>d.kind==='dungeon'),mobCount:0,eliteCount:0,boss:null});
assert.equal(inCurrentInstance(game,patient),true);assert.equal(activeSquad(game).length,1);assert.equal(patient.carrierId,'player');game.exitDungeon();assert.equal(patient.carrierId,'player');
for(const kind of ['merchant','gate']){
  fresh();const npc=kind==='merchant'?game.merchants[0]:game.gateGuards.find(g=>g.gateSpace==='field');
  Object.assign(npc,{x:game.player.x+10,y:game.player.y});markSoldierDown(game,npc);assert.equal(attachWounded(game,game.player,npc),true);const origin={x:game.player.x,y:game.player.y};
  game.enterDungeon({...game.dungeons.find(d=>d.kind==='dungeon'),mobCount:0,eliteCount:0,boss:null});syncDragged(game,1);assert.equal(inCurrentInstance(game,npc),true);
  if(kind==='gate')assert.equal(gateGuardVisible(game,npc),true);
  const data=game.saveGame(),saved=(kind==='merchant'?data.merchants:data.gateGuards).find(u=>u.id===npc.id);
  assert.ok(Math.hypot(saved.x-origin.x,saved.y-origin.y)<50,'carried NPC saves return to field coordinates');
  game.exitDungeon();assert.ok(Math.hypot(npc.x-origin.x,npc.y-origin.y)<50);assert.equal(npc.carrierId,'player');
}

// Empty slots receive stock before upgrades; downed units receive gear without revival.
const empty={id:'empty',hp:100,equipped:{weapon:gear('great-weapon','WEAPON',5)}},weak={id:'weak',hp:100,equipped:{shield:gear('weak-shield')}};
const shield=gear('stock-shield','SHIELD',2);distributeSharedBoxToSoldiers([shield],[weak,empty],noop);assert.equal(empty.equipped.shield,shield);assert.equal(weak.equipped.shield.id,'weak-shield');
empty.equipped.helmet=gear('owner-helmet','HELMET',2);
const down={id:'down',hp:0,isDown:true,equipped:{}},helmet=gear('down-helmet','HELMET');distributeSharedBoxToSoldiers([helmet,shield],[empty,down],noop);
assert.equal(down.equipped.helmet,helmet);assert.equal(down.equipped.shield,undefined,'already-equipped stock cannot be assigned to a second owner');assert.equal(down.hp,0);assert.equal(down.isDown,true);

// Real field pickup shares unneeded gear instead of selling it while a teammate is bare.
fresh();const collector=game.squad[0],mate=game.squad[1];game.squad=[collector,mate];game.reserves=[];
Object.assign(game.player,{x:center+1800,y:center+1800,atkCooldown:100});Object.assign(collector,{x:center+700,y:center,speed:0});Object.assign(mate,{x:center+850,y:center,speed:0});
collector.equipped.helmet=gear('collector-good','HELMET',3);mate.equipped.helmet=null;
const spare=gear('shared-helmet','HELMET');game.dropsOnField=[{x:collector.x,y:collector.y,item:spare}];game.update(.01);
assert.ok(game.sharedEquipBox.some(i=>i.id===spare.id));game.processSharedEquipmentBox();assert.equal(mate.equipped.helmet.id,spare.id);

// Live thirty-wave supply fills all deployed slots without replacing upgrades or using payroll reserves.
fresh();const downForSupply=game.squad[1];Object.assign(downForSupply,{hp:0,isDown:true});game.treasury=10000;game.supplyMissingEquipment();
assert.ok(downForSupply.equipped.shield);assert.equal(downForSupply.hp,0);assert.equal(downForSupply.isDown,true,'actual procurement and stat recalculation do not revive casualties');
fresh();const originalIds=game.squad.map(s=>s.id),upgraded=gear('retain-upgraded','ARMOR',3,25);game.squad[0].equipped.armor=upgraded;game.recalcSoldierStats(game.squad[0]);
let totalProcurement=0;
for(let i=0;i<30;i++){
  game.completePhase();const l=game.lastFiscalReport,t=fiscalTotals(l);totalProcurement+=l.equipmentProcurement||0;
  assert.equal(l.salaryShortfall,0);assert.equal(l.endBalance-l.startBalance,t.net);assert.ok(game.treasury>=Math.max(6000,(game.squad.length+game.reserves.length)*40));game.finishRest();
}
assert.ok(game.squad.filter(s=>originalIds.includes(s.id)).every(s=>Object.values(SLOT_INFO).every(({key})=>s.equipped[key])),'all seven slots are filled after thirty waves without loot');
assert.equal(game.squad[0].equipped.armor.id,upgraded.id);assert.equal(upgraded.upgrade,25);assert.ok(totalProcurement>0);
game.saveGame();game.resumeSavedGame(saveSlots.get(game.activeSlotId).data);assert.equal(game.squad[0].equipped.armor.id,upgraded.id);
game.phase++;game.treasury=0;game.squad[0].equipped.shield=null;assert.deepEqual(game.supplyMissingEquipment(),{phase:game.phase-1,issued:0,spent:0,updated:0,forged:0,budget:0});assert.equal(game.treasury,0);assert.equal(game.squad[0].equipped.shield,null);

// Sorted shop cards keep original stock indices; purchase replaces the correct slot and retains old gear.
fresh();const merchant=game.merchants[0],old=gear('old-equipped','WEAPON',1,3);game.equipped.weapon=old;game.inventory=[old];game.gold=10000;
const cheap=gear('cheap'),armor=gear('buy-armor','ARMOR',2),strong=gear('strong','WEAPON',1,20);
for(const [item,price] of [[cheap,52],[armor,150],[strong,400]])item._merchantPrice=price;
Object.assign(merchant,{stock:[cheap,armor,strong],catalogVersion:2,stockPhase:1,stockTier:2});game.openMerchantShop(merchant);
const popup=document.getElementById('merchant-shop-popup');assert.equal(popup.querySelector('.merchant-stock-card').dataset.idx,'2');assert.equal(popup.querySelectorAll('.merchant-stock-card').length,2);
savePreview('merchant-weapons-v2.7.1');
assert.match(popup.querySelector('[data-buy]').textContent,/購入して装備/);const gold=game.gold;popup.querySelector('[data-buy="2"]').click();
assert.equal(game.equipped.weapon.id,strong.id);assert.equal(game.gold,gold-400);assert.ok(game.inventory.some(i=>i.id===old.id));assert.equal(old.upgrade,3);assert.ok(merchant.stock.some(i=>i.id===cheap.id));
popup.querySelector('[data-shop-group="armor"]').click();assert.equal(popup.querySelectorAll('.merchant-stock-card').length,1);savePreview('merchant-armor-v2.7.1');popup.querySelector('[data-buy]').click();assert.equal(game.equipped.armor.id,armor.id);
popup.querySelector('[data-shop-group="weapon"]').click();popup.querySelector('[data-buy]').click();assert.equal(game.equipped.weapon.id,cheap.id,'explicitly buying weaker gear also equips it');assert.ok(game.inventory.some(i=>i.id===strong.id));
assert.equal(saveSlots.get(game.activeSlotId).data.equipped.weapon.id,cheap.id);game._merchantShopClose();
// Separate bag panels retain selected sale IDs and sort by real bonuses rather than tier alone.
game.inventory=[cheap,armor,strong,gear('weak-helmet','HELMET',2),gear('strong-helmet','HELMET',1,20)];game.selectedSaleIds=new Set([strong.id]);game.renderStrategyUI();
document.querySelector('[data-inventory-group="weapon"]').click();
assert.equal(document.querySelector('.inventory-card:not(.hidden)').dataset.itemId,strong.id);
assert.ok([...document.querySelectorAll('.inventory-card:not(.hidden)')].every(r=>r.dataset.slot==='weapon'));
document.querySelector('[data-inventory-group="armor"]').click();const armorRows=[...document.querySelectorAll('.inventory-card:not(.hidden)')];
assert.ok(armorRows.every(r=>r.dataset.slot!=='weapon'));assert.ok(game.selectedSaleIds.has(strong.id));
const visible=armorRows.map(r=>game.inventory.find(i=>i.id===r.dataset.itemId));for(let i=1;i<visible.length;i++)assert.ok(compareEquipmentStrength(visible[i-1],visible[i])<=0);
assert.ok(compareEquipmentStrength(strong,cheap)<0);
game.openStrategyModal();game._selectStratTab('troops');game._syncTroopsSubView('equip');savePreview('bag-armor-v2.7.1');
if(process.env.EQUIPMENT_REVIEW_DIR){
  fresh();game.gold=7021;game.equipped.weapon=gear('preview-current','WEAPON',1,3);game.equipped.armor=gear('preview-current-armor','ARMOR',1,2);game.recalcPlayerStats();
  const actualMerchant=game.merchants.find(m=>m.stock?.some(i=>i.type==='WEAPON'))||game.merchants[0];game.openMerchantShop(actualMerchant);savePreview('merchant-weapons-v2.7.1');
  document.querySelector('[data-shop-group="armor"]').click();savePreview('merchant-armor-v2.7.1');
}
console.log('PASS: dungeon/ruin/town personal-only combat/render/save/exit and carried casualties; shared empty-slot priority and field pickup; thirty-wave seven-slot procurement/payroll/ledger/save; sorted separate shop/bag panels, correct stock purchase/immediate equip/old gear retention');
dom.window.close();
