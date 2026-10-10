import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {RESCUE_REWARDS,grantPermanentRescueReward,rollRescueReward,emptyRescueBonuses} from '../js/rescue-rewards.js';
import {grantCivilianRescueBonus,grantRescueBonus} from '../js/casualty-rules.js';
import {merchantHealWavesLeft,useMerchantHealing,merchantHealingStatus,serializeMerchants,finishEscortPhase} from '../js/merchant-rules.js';
import {masteryReloadMult} from '../js/growth-rules.js';
import {drawFieldCivilian} from '../js/civilian-visuals.js';
const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
dom.window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame}=await import('../js/index.js');const {saveSlots}=await import('../js/save-slots.js');
const game=Object.create(IronSquadGame);game.container=document.getElementById('game');
Object.assign(game,{width:390,height:664,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0});
for(const key of ['startGameLoop','showToast','spawnSparks','spawnDamageText'])game[key]=noop;
game.setupUI();game.activeSlotId=saveSlots.create('RESCUE GROWTH TEST ONLY').id;game.startFreshGame(false);
game.equipped.armor={id:'def-gear',type:'ARMOR',stats:{def:100}};game.equipped.weapon={id:'atk-gear',type:'WEAPON',weaponStyle:'sword',stats:{atk:100}};game.recalcPlayerStats();
const original={hp:game.player.maxHp,atk:game.player.atk,def:game.player.def,speed:game.player.speed,atkSpeed:game.player.atkSpeed};
for(const [i,roll] of [.1,.4,.7,.9,.99].entries()) {
  const npc={id:`reward-test-${i}`,name:'検証NPC'};
  const reward=grantPermanentRescueReward(game,npc,()=>roll);assert.equal(reward.key,RESCUE_REWARDS[i].key);
  assert.equal(grantPermanentRescueReward(game,npc,()=>.99),null,'one person cannot grant a second permanent reward');
}
assert.equal(rollRescueReward(()=>.86).jackpot,true);assert.equal(rollRescueReward(()=>.84).jackpot,undefined);assert.equal(rollRescueReward(()=>.95).jackpot,true);
assert.equal(game.player.maxHp,Math.floor(original.hp*1.01));assert.equal(game.player.atk,Math.floor(original.atk*1.01));assert.equal(game.player.def,Math.floor(original.def*1.01));assert.equal(game.player.speed,Math.floor(original.speed*1.01));assert.equal(game.player.atkSpeed,original.atkSpeed*1.01);
const bonuses=structuredClone(game.rescueBonuses);game.recalcPlayerStats();game.recalcPlayerStats();assert.equal(game.player.atkSpeed,original.atkSpeed*1.01,'recalculation does not compound the reward');
game.equipped.weapon={id:'speed-gear',type:'WEAPON',weaponStyle:'sword',stats:{atkSpeed:20}};game.recalcPlayerStats();assert.equal(game.player.atkSpeed,1.2*1.01);
game.equipped.weapon=null;game.recalcPlayerStats();assert.equal(game.player.atkSpeed,1.01,'changing equipment preserves the permanent percentage');
game.saveGame();game.resumeSavedGame(saveSlots.get(game.activeSlotId).data);assert.deepEqual(game.rescueBonuses,bonuses);
assert.equal(grantPermanentRescueReward(game,{id:'reward-test-0'},()=>.99),null,'the saved identity ledger blocks duplicates even with a reconstructed NPC');
game.saveGame();game.startFreshGame(true);assert.deepEqual(game.rescueBonuses,bonuses,'reenlistment in this expedition retains permanent rewards');
game.activeSlotId=saveSlots.create('SEPARATE EXPEDITION').id;game.startFreshGame(false);assert.deepEqual(game.rescueBonuses,emptyRescueBonuses(),'a different new expedition starts separately');
const oldRandom=Math.random;
try {
  Math.random=()=>.99;const money=game.gold,xp=game.exp;
  for(const kind of ['child','woman','elder']){const civ={id:`rescued-${kind}`,kind,name:kind,carrierId:'player'};grantCivilianRescueBonus(game,civ,{name:'本陣'});grantCivilianRescueBonus(game,civ,{name:'本陣'});}
  const merchant=game.merchants[0],escort=merchant.escorts[0];
  grantRescueBonus(game,merchant,{method:'BASE',carrier:game.player});grantRescueBonus(game,escort,{method:'BASE',carrier:game.player});
  assert.equal(game.rescueBonuses.atkSpeedPct,5,'all five NPC groups grant the new reward');assert.equal(game.gold,money);assert.equal(game.exp,xp,'NPC rewards replace the old money/XP reward');
  assert.equal(escort.exp,0,'being rescued does not grant a kill level to the guard');
} finally {Math.random=oldRandom;}
// Full price, countdown, phase-boundary refresh and save/load of the deadline.
const merchant=game.merchants[0];game.player.x=merchant.x;game.player.y=merchant.y;game.player.hp=1;game.gold=1000;game.openMerchantShop(merchant);
document.querySelector('.merchant-heal-button').click();assert.equal(merchantHealWavesLeft(game,merchant),2);assert.match(document.querySelector('.merchant-heal-countdown').textContent,/あと2ウェーブ/);
game.player.hp=1;const paidGold=game.gold;assert.equal(useMerchantHealing(game,merchant).reason,'cooldown');assert.equal(game.gold,paidGold);
game.completePhase();assert.equal(merchantHealWavesLeft(game,merchant),1);assert.match(document.querySelector('.merchant-heal-countdown').textContent,/あと1ウェーブ/);
game.saveGame();const waiting=saveSlots.get(game.activeSlotId).data;assert.equal(waiting.merchants.find(m=>m.id===merchant.id).healReadyPhase,3);
document.querySelector('.btn-close-merchant').click();game.resumeSavedGame(waiting);let restored=game.merchants[0];assert.equal(merchantHealWavesLeft(game,restored),1);
game.restTimer=0;game.player.hp=1;game.openMerchantShop(restored);game.completePhase();game.player.hp=1;game._merchantShopRefresh();
assert.equal(merchantHealWavesLeft(game,restored),0);assert.equal(merchantHealingStatus(game,restored),'available');assert.equal(document.querySelector('.merchant-heal-button').disabled,false);
const beforeGold=game.gold;document.querySelector('.merchant-heal-button').click();assert.equal(game.gold,beforeGold-150);assert.equal(merchantHealWavesLeft(game,restored),2);
document.querySelector('.btn-close-merchant').click();
// Actual attack, kill, hit-growth and end-of-phase pathways for escorts.
game.restTimer=0;game.squad=[];const guard=game.merchants[0].escorts[0],starting={hp:guard.maxHp,atk:guard.atk};
for(let i=0;i<12;i++) {
 const monster={x:guard.x+40,y:guard.y,type:'goblin',hp:1,maxHp:1,radius:12,speed:0,atk:1};game.monsters=[monster];
 game.performAttack(guard,monster,false,guard.atk,false);
}
assert.ok(guard.level>1,'real kills level up the guard');assert.ok(guard.minionKills>=12);assert.ok(guard.weaponMastery.spear>0);assert.ok(guard.atk>starting.atk);assert.ok(guard.maxHp>starting.hp);assert.ok(masteryReloadMult(guard.weaponMastery,'spear')<1);
const hitRandom=Math.random;Math.random=()=>.99;
const hpBeforeHits=guard.maxHp;for(let i=0;i<16;i++){guard.hp=guard.maxHp;game.damageTarget(guard,60);}
Math.random=hitRandom;
assert.ok(guard.hitGrowthPct>0);assert.equal(guard.hitGrowthEvents,16);assert.ok(guard.maxHp>hpBeforeHits,'real damage adds permanent tank growth');
const phases=guard.survivedWaves;finishEscortPhase(game);assert.equal(guard.survivedWaves,phases+1);finishEscortPhase(game);assert.equal(guard.survivedWaves,phases+1,'an idle guard does not gain combat experience');
game.saveGame();const guardSave=structuredClone(serializeMerchants(game.merchants)[0].escorts[0]);game.resumeSavedGame(saveSlots.get(game.activeSlotId).data);
const guardAfter=game.merchants[0].escorts[0];for(const key of ['level','exp','maxHp','atk','hitGrowthPct','hitGrowthEvents','survivedWaves'])assert.equal(guardAfter[key],guardSave[key],`saved guard ${key}`);
assert.deepEqual(guardAfter.weaponMastery,guardSave.weaponMastery);
assert.deepEqual(guardAfter.attributeProfile,guardSave.attributeProfile,'escort aptitude and practice survive save/resume');
const {createCanvas}=createRequire(resolve('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules','entry.cjs'))('@napi-rs/canvas');
const frames=[];for(const kind of ['child','woman','elder']) {
 const canvas=createCanvas(180,180),c=canvas.getContext('2d'),person={id:`visual-${kind}`,kind,x:90,y:125};drawFieldCivilian(c,person);
 const before=JSON.stringify(person.appearance);drawFieldCivilian(c,person,100);assert.equal(JSON.stringify(person.appearance),before,'civilian appearance does not reroll');
 const area=c.getImageData(84,91,12,20).data;assert.ok(area.some((v,i)=>i%4===3&&v>0),'a head and body rise above the old icon circle');frames.push(canvas.toBuffer('image/png'));
}
assert.notDeepEqual(frames[0],frames[1]);assert.notDeepEqual(frames[1],frames[2]);
console.log('PASS: all random rewards/jackpot, no duplicate/farming, real NPC rewards replace gold/XP, permanent stats through equip/reload/reenlistment, live 2→1→0 wave countdown, 150G reuse, guard kill/mastery/level/hit/wave growth and saves, civilian human figures');
dom.window.close();
