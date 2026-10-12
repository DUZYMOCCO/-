import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {WORLD_SIZE} from '../js/world.js';
import {markSoldierDown,treatWounded,updateWounded,receiveTownCargo,attachWounded,revivalCooldownLeft,REVIVAL_COOLDOWN,nearestRevivalPotionTarget} from '../js/casualty-rules.js';
import {REVIVAL_POTION_COST} from '../js/supply-rules.js';
const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/'});Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js');
const g=Object.create(IronSquadGame),C=WORLD_SIZE/2;Object.assign(g,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:C,y:C},selectedSaleIds:new Set()});for(const key of ['startGameLoop','showToast','spawnDamageText','spawnSparks'])g[key]=noop;
g.setupUI();g.activeSlotId=saveSlots.create('Resurrection medicine / cooldown').id;g.startFreshGame(false);const initial=structuredClone(g.saveGame());
const fresh=()=>{g.resumeSavedGame(structuredClone(initial));g.closeStrategyModal();g.inBattle=true;g.restTimer=0;g.monsters=[];g.worldTime=0;g.player.x=C+1400;g.player.y=C;};
const patient=()=>{const target=g.squad[0];target.x=C+500;target.y=C;return target;};
const healer=target=>{const medic=g.squad.find(s=>s.soldierClass==='MEDIC');Object.assign(medic,{x:target.x,y:target.y,mana:100});return medic;};
try{
  assert.equal(REVIVAL_COOLDOWN,60);assert.equal(REVIVAL_POTION_COST,10000);assert.equal(g.revivalPotion,1);
  fresh();let target=patient(),medic=healer(target);markSoldierDown(g,target);assert.equal(treatWounded(g,medic,target,1),true);assert.equal(revivalCooldownLeft(g,target),60);
  markSoldierDown(g,target);const rescued=target.timesRescued,mana=medic.mana;
  for(let i=0;i<20;i++)assert.equal(treatWounded(g,medic,target,1),false);assert.equal(target.timesRescued,rescued);assert.equal(medic.mana,mana,'a blocked revive consumes no mana');assert.equal(target.rescueProgress,0);
  const replacement=g.squad[2];Object.assign(replacement,{soldierClass:'MEDIC',x:target.x,y:target.y,mana:100});assert.equal(treatWounded(g,replacement,target,1),false,'changing healers cannot bypass the patient cooldown');
  target.x=C;target.y=C;updateWounded(g,0);assert.equal(target.isDown,true,'HQ delivery cannot bypass the cooldown');
  Object.assign(g.player,{x:C,y:C});assert.equal(attachWounded(g,g.player,target),true);receiveTownCargo(g,{id:'test-town',name:'町'});assert.equal(target.isDown,true,'town arrival cannot bypass the cooldown');
  g.worldTime=59.99;Object.assign(medic,{x:target.x,y:target.y,mana:100});assert.equal(treatWounded(g,medic,target,1),false);g.worldTime=60;assert.equal(treatWounded(g,medic,target,1),true);assert.equal(revivalCooldownLeft(g,target),60);
  // Saving the world clock and the patient's deadline preserves the remaining interval.
  g.worldTime=85;const id=target.id,saved=structuredClone(g.saveGame());g.resumeSavedGame(saved);g.closeStrategyModal();target=g.squad.find(s=>s.id===id);assert.equal(revivalCooldownLeft(g,target),35);
  g.openStrategyModal(true);g.update(30);assert.equal(revivalCooldownLeft(g,target),35,'menus pause the game clock');g.closeStrategyModal();
  // The nearest friend is revived at full HP with one click even while on cooldown.
  markSoldierDown(g,target);Object.assign(g.player,{x:target.x,y:target.y});g.inBattle=true;g.revivalPotion=1;g.refreshSupplyUI();const button=document.getElementById('btn-pad-revive');assert.equal(button.disabled,false);
  button.click();assert.equal(target.isDown,false);assert.equal(target.hp,target.maxHp);assert.equal(g.revivalPotion,0);assert.equal(revivalCooldownLeft(g,target),60);button.click();assert.equal(g.revivalPotion,0);
  assert.equal(button.closest('.pad-supply-buttons'),document.getElementById('btn-pad-potion').closest('.pad-supply-buttons'));
  const merchant=g.merchants[0];Object.assign(g.player,{x:merchant.x,y:merchant.y});g.gold=9999;assert.equal(g.replenishRevivalPotion(merchant),false);assert.equal(g.gold,9999);g.gold=10000;assert.equal(g.replenishRevivalPotion(merchant),true);assert.equal(g.gold,0);assert.equal(g.replenishRevivalPotion(merchant),false);assert.equal(g.revivalPotion,1);
  const stockSave=structuredClone(g.saveGame());g.resumeSavedGame(stockSave);assert.equal(g.revivalPotion,1);const legacy=structuredClone(initial);delete legacy.revivalPotion;g.resumeSavedGame(legacy);assert.equal(g.revivalPotion,0,'older saves do not silently issue a medicine');
  // No target, own down, range, coordinate space, dying or dead cannot consume a dose.
  fresh();g.refreshSupplyUI();assert.equal(button.disabled,true);assert.equal(g.useRevivalPotion(),false);assert.equal(g.revivalPotion,1);
  target=patient();markSoldierDown(g,target);assert.equal(g.useRevivalPotion(),false,'far casualties are not targets');Object.assign(g.player,{x:target.x,y:target.y,hp:0,isDown:true});assert.equal(g.useRevivalPotion(),false);assert.equal(g.revivalPotion,1);
  Object.assign(g.player,{hp:g.player.maxHp,isDown:false});target.dying=true;assert.equal(nearestRevivalPotionTarget(g),null);delete target.dying;target.dead=true;assert.equal(nearestRevivalPotionTarget(g),null);target.dead=false;
  g.currentDungeon={id:'test-instance',kind:'dungeon'};target.isPersonalGuard=false;assert.equal(nearestRevivalPotionTarget(g),null,'field patients are excluded indoors');target.isPersonalGuard=true;assert.equal(nearestRevivalPotionTarget(g),target);assert.equal(g.useRevivalPotion(),true);assert.equal(g.revivalPotion,0);
  fresh();const capacity=g.deploymentCapacity();g.squad=g.squad.slice(0,capacity-1);const injured=g.createNewSoldier(),healthy=g.createNewSoldier();Object.assign(injured,{hp:0,isDown:true,downTimer:45,revivalCooldownUntil:60});g.reserves=[injured,healthy];assert.equal(g.deployReserves(),1);assert.ok(g.squad.includes(healthy));assert.ok(g.reserves.includes(injured));assert.equal(injured.isDown,true);assert.equal(injured.hp,0);
  // NPCs share the same persisted cooldown and cannot become a loophole.
  fresh();const guard=g.gateGuards[0];Object.assign(guard,{x:C+500,y:C});markSoldierDown(g,guard);assert.equal(treatWounded(g,healer(guard),guard,1),true);g.worldTime=20;g.resumeSavedGame(structuredClone(g.saveGame()));assert.equal(revivalCooldownLeft(g,g.gateGuards.find(s=>s.id===guard.id)),40);
  console.log('PASS: shared 60-second patient cooldown at 59.99/60s, no mana/bonus loop, medic/HQ/town/save/pause, one full-HP medicine bypass, no self/dead/dying/far/cross-space use, 10,000G one-item refill and saves, injured reserve exclusion and NPC cooldown');
}finally{g.destroy();dom.window.close();}
