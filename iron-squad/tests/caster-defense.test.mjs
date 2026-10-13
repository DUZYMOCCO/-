import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {rollAttributeProfile} from '../js/unit-attributes.js';
import {canUseEquipment,equipmentRequirementText} from '../js/weapon-requirements.js';
import {requiredDefenseStrength,updateEquipmentBarrier} from '../js/defense-equipment.js';
import {craftRecipe} from '../js/crafting-rules.js';
import {normalizeNation} from '../js/nation-rules.js';
import {distributeSharedBoxToSoldiers} from '../js/economy-rules.js';
import {lowValueIds,compareEquipment} from '../js/equipment-rules.js';
import {healAmountFor,healByMedic} from '../js/phase-rules.js';
const dom=new JSDOM('<div id="game"></div>',{url:'http://localhost/',pretendToBeVisual:true});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame,generateRandomDrop,applyUpgradeStats}=await import('../js/index.js');
const {saveSlots}=await import('../js/save-slots.js');
const {sound}=await import('../../common/js/audio.js?v=151');
const {drawBarrierRing,barrierRingAlpha}=await import('../js/defense-equipment.js');
const game=Object.create(IronSquadGame);
Object.assign(game,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:83000,y:83000},selectedSaleIds:new Set(),commandActiveUntil:0});
for(const method of ['startGameLoop','showToast','spawnSparks','spawnDamageText'])game[method]=noop;
game.setupUI();game.activeSlotId=saveSlots.create('CASTER DEFENSE TEST').id;game.startFreshGame(false);game.career.status='enlisted';game.closeStrategyModal();
game.monsters=[];game.reserves=[];game.sharedEquipBox=[];
const gear=(id,type='ARMOR',tier=9,armorStyle=null)=>generateRandomDrop(0,'normal',{id,type,tier,armorStyle,upgrade:0,quality:1,merchant:true,random:()=>.5});
const unit=classKey=>{
  const u=game.createNewSoldier(null,{classKey,talent:'AVERAGE',attributeProfile:rollAttributeProfile(classKey,'AVERAGE',()=>.5,true)});
  u.attributeProfile=rollAttributeProfile(classKey,'AVERAGE',()=>.5,true);u._attributesNormalized=false;
  u.equipped={};u.weapon=null;game.recalcSoldierStats(u);u.hp=u.maxHp;return u;
};
const mage=unit('MAGE'),medic=unit('MEDIC'),fighter=unit('HEAVY');game.squad=[mage,medic,fighter];
const plate=gear('plate'),robe=gear('arcane','ARMOR',9,'arcane'),healer=gear('healing','ARMOR',9,'healing'),ward=gear('ward','ARMOR',9,'ward');
assert.equal(requiredDefenseStrength(plate),34);assert.equal(requiredDefenseStrength(gear('steel','ARMOR',13)),50);
assert.equal(requiredDefenseStrength(robe),3);assert.ok(!canUseEquipment(mage,plate)&&!canUseEquipment(medic,plate));
assert.equal(canUseEquipment(mage,{...plate,minStrength:0}),false,'legacy/falsely zero requirements cannot bypass plate strength');
assert.match(equipmentRequirementText(mage,plate),/必要筋力34.*筋力不足/);
mage._casterStrengthTimer=8;mage._casterStrengthBonus=100;
assert.equal(canUseEquipment(mage,plate),false,'temporary buffs cannot unlock heavy armour');mage._casterStrengthTimer=0;
fighter.attributeProfile.innate.strength=80;game.recalcSoldierStats(fighter);assert.equal(canUseEquipment(fighter,plate),true);
mage.attributeProfile.innate.strength=80;game.recalcSoldierStats(mage);assert.equal(canUseEquipment(mage,plate),true,'muscle casters can meet the actual requirement');
mage.attributeProfile.innate.strength=10;game.recalcSoldierStats(mage);
for(const type of ['ARMOR','SHIELD','HELMET','GLOVES','LEGS']){
  assert.equal(canUseEquipment(mage,gear('heavy-'+type,type,25)),false);
  for(const style of ['arcane','healing','ward'])assert.equal(canUseEquipment(mage,gear(style+type,type,28,style)),true);
}
// A transfer cannot change ownership or funds on failure.
game.inventory=[plate];const gold=medic.gold;assert.equal(game.giveItemToSoldier(medic.id,plate),false);
assert.equal(medic.equipped.armor,undefined);assert.equal(medic.gold,gold);assert.ok(game.inventory.includes(plate));
assert.equal(distributeSharedBoxToSoldiers([plate],[mage,medic],noop).equippedCount,0,'even the default distributor enforces strength');
assert.equal(distributeSharedBoxToSoldiers([plate],[fighter],s=>game.recalcSoldierStats(s)).equippedCount,1);
// All six defensive slots have three factory recipes with preserved identity and bonuses.
for(const type of ['ARMOR','SHIELD','HELMET','GLOVES','LEGS','AMULET'])for(const style of ['arcane','healing','ward']){
  const item=game.makeWorkshopItem(craftRecipe(`${style}-${type.toLowerCase()}`),17);
  assert.equal(item.armorStyle,style);assert.ok(item.stats.barrier>0);assert.equal(canUseEquipment(mage,item),true);
}
const magicBefore=mage.magicAttack,healBefore=medic.healPower;
mage.equipped.armor=robe;medic.equipped.armor=healer;game.recalcSoldierStats(mage);game.recalcSoldierStats(medic);
assert.ok(mage.magicAttack>magicBefore);assert.ok(medic.healPower>healBefore);
assert.ok(robe.stats.def<plate.stats.def*.3);assert.ok(robe.stats.hp<plate.stats.hp*.6);
const attack=mage.magicAttack,healing=medic.healPower;
for(let i=0;i<8;i++){game.recalcSoldierStats(mage);game.recalcSoldierStats(medic);}
assert.equal(mage.magicAttack,attack);assert.equal(medic.healPower,healing,'bonuses never compound on recalculation');
const patient={hp:1,maxHp:10000};assert.ok(healAmountFor(medic,patient)>healAmountFor({healPower:healBefore},patient));
assert.equal(healByMedic(medic,patient,healAmountFor(medic,patient)),Math.floor(healAmountFor(medic,patient)));
const comparison=compareEquipment(robe,plate);assert.match(comparison.text,/魔力補正.*%/);assert.match(comparison.text,/バリア/);
assert.deepEqual(lowValueIds([robe],{armor:plate},[],28),[],'high defense plate cannot auto-sell a low-strength robe');
// Actual damage consumes a finite barrier, of both physical and magical hits. Swaps do not refill it.
mage.equipped.armor=ward;game.recalcSoldierStats(mage);updateEquipmentBarrier(mage,30);const max=mage.equipmentBarrierMax;
mage.hp=mage.maxHp;mage.dodge=0;mage.lethalGuardCooldown=999;mage.hitGrowthHp=0;
const random=Math.random;Math.random=()=>.99;
try{
  const hp=mage.hp;game.damageTarget(mage,30,{environmental:true});assert.ok(mage.hp<hp&&mage.equipmentBarrier<max);
  const remaining=mage.equipmentBarrier,hpBeforeMagic=mage.hp;
  game.damageTarget(mage,30,{damageKind:'magic'});
  assert.equal(mage.hp,hpBeforeMagic,'barrier absorbs 100% of magical damage while capacity remains');
  assert.ok(mage.equipmentBarrier<remaining);
  mage.equipmentBarrier=1;game.damageTarget(mage,30,{environmental:true});assert.equal(mage.equipmentBarrier,0);
  const hpEmpty=mage.hp;game.damageTarget(mage,30,{environmental:true});assert.ok(mage.hp<hpEmpty);
  // v6.5.2: a fully absorbed hit shows only the barrier text (no red 0, no hurt sound); a partial one still does.
  const texts=[];let hurts=0;game.spawnDamageText=(x,y,text,color)=>texts.push({text,color});const hurt=sound.playHurt;sound.playHurt=()=>{hurts++;};
  try{
    medic.hp=medic.maxHp;medic.equipmentBarrier=1000;medic.equipmentBarrierMax=1000;medic.dodge=0;medic.lethalGuardCooldown=999;
    const full=medic.hp;game.damageTarget(medic,30,{damageKind:'magic'});
    assert.equal(medic.hp,full);assert.ok(texts.some(t=>/結界/.test(t.text)));assert.ok(!texts.some(t=>t.color==='#ff3344'),'no red number when fully absorbed');assert.equal(hurts,0,'no hurt sound when fully absorbed');
    texts.length=0;medic.equipmentBarrier=3;game.damageTarget(medic,300,{environmental:true});
    assert.ok(medic.hp<full);assert.ok(texts.some(t=>t.color==='#ff3344'&&t.text>0),'partial absorb still shows the red number');assert.equal(hurts,1);
  }finally{sound.playHurt=hurt;game.spawnDamageText=noop;}
}finally{Math.random=random;}
// Barrier ring: only while barrier remains and the unit is up; alpha scales with the fill within 0.12-0.45.
{
  const u={x:5,y:6,hp:10,equipmentBarrierMax:100,equipmentBarrier:100};
  const calls=[];const c=new Proxy({},{get:(o,k)=>(...a)=>{calls.push(k);}});
  assert.ok(barrierRingAlpha(u,0)<=.45&&barrierRingAlpha(u,0)>=.38);u.equipmentBarrier=1;assert.ok(barrierRingAlpha(u,0)>=.1&&barrierRingAlpha(u,0)<.2);
  assert.equal(drawBarrierRing(c,u,0),true);assert.ok(calls.includes('ellipse')&&calls.includes('stroke'));
  u.equipmentBarrier=0;assert.equal(drawBarrierRing(c,u,0),false);u.equipmentBarrier=50;u.isDown=true;assert.equal(drawBarrierRing(c,u,0),false);
  assert.equal(drawBarrierRing(c,{x:0,y:0,hp:5},0),false,'units without a barrier draw nothing');
}
const delay=mage.equipmentBarrierDelay;updateEquipmentBarrier(mage,delay-1);assert.equal(mage.equipmentBarrier,0);
updateEquipmentBarrier(mage,2);assert.ok(Math.abs(mage.equipmentBarrier-max*.06)<1e-8);
const partial=mage.equipmentBarrier;for(let i=0;i<5;i++)game.recalcSoldierStats(mage);assert.equal(mage.equipmentBarrier,partial);
mage.equipped.armor=robe;game.recalcSoldierStats(mage);mage.equipped.armor=ward;game.recalcSoldierStats(mage);assert.ok(mage.equipmentBarrier<=partial,'swapping gear cannot restore capacity');
const oldStats=structuredClone(ward.stats);applyUpgradeStats(ward,0);assert.deepEqual(ward.stats,oldStats);
applyUpgradeStats(ward,3);assert.ok(ward.stats.barrier>oldStats.barrier);const upgraded=structuredClone(ward.stats);applyUpgradeStats(ward,3);assert.deepEqual(ward.stats,upgraded);
// Recalc and save/load return legacy illegal equipment to storage without deleting it.
mage.equipped.armor=plate;game.recalcSoldierStats(mage);assert.equal(mage.equipped.armor,null);assert.ok(game.sharedEquipBox.includes(plate));
mage.equipped.armor=ward;game.recalcSoldierStats(mage);mage.equipmentBarrier=7;mage.equipmentBarrierDelay=5;
game.equipped.armor=gear('player-ward','ARMOR',1,'ward');game.recalcPlayerStats();game.player.equipmentBarrier=3;game.player.equipmentBarrierDelay=4;
const saved=game.saveGame();assert.ok(saved);saved.squad.find(s=>s.id===medic.id).equipped.armor=gear('legacy-medic-plate','ARMOR',25);
game.resumeSavedGame(structuredClone(saved));game.closeStrategyModal();
assert.equal(game.player.equipmentBarrier,3);assert.equal(game.player.equipmentBarrierDelay,4);
const restored=game.squad.find(s=>s.id===mage.id);assert.equal(restored.equipmentBarrier,7);assert.equal(restored.equipmentBarrierDelay,5);
assert.ok(game.sharedEquipBox.some(item=>item.id==='legacy-medic-plate'));
// The real paid procurement chooses class-appropriate gear and respects a personal wallet.
game.squad=[unit('MAGE'),unit('MEDIC')];game.sharedEquipBox=[];game.reserves=[];game.phase=2;game.treasury=0;game.nation=normalizeNation({investment:6000});
for(const u of game.squad)u.gold=100000;
const bought=game.supplyMissingEquipment();assert.ok(bought.spent>0);assert.equal(game.treasury,0);
for(const u of game.squad){assert.equal(u.equipped.armor.armorStyle,u.soldierClass==='MAGE'?'arcane':'healing');assert.ok(Object.values(u.equipped).every(item=>canUseEquipment(u,item)));assert.ok(u.gold>=6);}
console.log('PASS: strength across all defensive slots, storage preservation, gifts/distribution/procurement, 18 recipes, actual magic/healing, finite barrier/recharge, save/load and enhancement');
game.destroy();dom.window.close();
