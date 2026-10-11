import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {TIERS} from '../js/equipment-tiers.js';
import {weaponCombatProfile,meleeSweetSpotFor,equipmentIcon} from '../js/equipment-rules.js';
import {emptyMastery,normalizeMastery,gainWeaponMastery,masteryAtkMult,masteryReloadMult,favoriteWeaponBias,rollWeaponStyle,weaponStyleOf} from '../js/growth-rules.js';
import {requiredWeaponStrength,canUseWeapon} from '../js/weapon-requirements.js';
import {applyHeroEquipmentUpgrade} from '../js/hero-equipment.js';
import {soldierEquipmentValue} from '../js/armament-rules.js';
import {attackAnimationRate} from '../js/weapon-motion.js';
const dom=new JSDOM('<div id="game"></div>',{url:'http://localhost/'});Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame,SOLDIER_CLASSES,applyUpgradeStats,generateRandomDrop,migrateHeavyWeaponAttack}=await import('../js/index.js');
const {saveSlots}=await import('../js/save-slots.js');
const traits={length:1,attackTempo:1,swingSpeed:1,sweep:1,sweetWidth:1,sweetPower:1,sweetShift:0,crit:0};
const gear=(style,tier=1,upgrade=0,quality=1)=>{const i=generateRandomDrop(0,'normal',{type:'WEAPON',tier,upgrade,weaponStyle:style,quality,merchant:true,random:()=>.5});i.weaponTraits={...traits};applyUpgradeStats(i,upgrade);return i;};
for(const tier of TIERS)for(const upgrade of [0,2,5])for(const quality of [.73,1,1.37]){
  const a=gear('axe',tier.tier,upgrade,quality),h=gear('hammer',tier.tier,upgrade,quality),s=gear('sword',tier.tier,upgrade,quality);
  const oldHammer=Math.floor((10+tier.powerRank*5)*tier.mult*(1+upgrade*.25)*2.45*quality);
  assert.equal(a.stats.atk,oldHammer*10);assert.equal(h.stats.atk,oldHammer*10);
  assert.equal(s.stats.atk,Math.floor((10+tier.powerRank*5)*tier.mult*(1+upgrade*.25)*quality),'sword attack is unchanged');
  assert.equal(a.stats.atkSpeed,h.stats.atkSpeed);assert.equal(requiredWeaponStrength(a),requiredWeaponStrength(h));
  assert.match(a.name,/斧/);assert.equal(weaponStyleOf(a),'axe');assert.equal(equipmentIcon(a),'🪓');
  const atk=a.stats.atk;applyUpgradeStats(a,upgrade);assert.equal(a.stats.atk,atk,'reforging does not repeat the x10');
}
const unique=gear('hammer');unique.dropOnly=true;unique.dropOnlyKey='WEAPON';applyUpgradeStats(unique,0);assert.equal(unique.stats.atk,Math.floor(36*1.12)*10,'exclusive bonus is included before x10');
assert.deepEqual({...weaponCombatProfile({weaponStyle:'axe'}),style:'hammer'},weaponCombatProfile({weaponStyle:'hammer'}));
assert.deepEqual(meleeSweetSpotFor('axe'),meleeSweetSpotFor('hammer'));
assert.equal(rollWeaponStyle('melee',()=>.3),'axe');assert.equal(rollWeaponStyle('melee',()=>.2),'hammer');
const mastery={weaponMastery:emptyMastery()};gainWeaponMastery(mastery,'axe',12);assert.equal(mastery.weaponMastery.hammer,12);assert.equal(Object.keys(mastery.weaponMastery).length,8);
assert.equal(masteryAtkMult(mastery.weaponMastery,'axe'),masteryAtkMult(mastery.weaponMastery,'hammer'));assert.equal(masteryReloadMult(mastery.weaponMastery,'axe'),masteryReloadMult(mastery.weaponMastery,'hammer'));
assert.equal(favoriteWeaponBias(gear('axe'),'hammer'),120);assert.equal(favoriteWeaponBias(gear('hammer'),'axe'),120);
assert.equal(normalizeMastery({hammer:8,axe:4}).hammer,12);assert.deepEqual(normalizeMastery(normalizeMastery({hammer:8,axe:4})),normalizeMastery({hammer:8,axe:4}));
const old={...gear('hammer',9,2),id:'legacy-hammer'};old.stats.atk/=10;delete old.heavyAttackVersion;const expected=old.stats.atk*10,before={id:old.id,upgrade:old.upgrade,traits:structuredClone(old.weaponTraits)};
migrateHeavyWeaponAttack(old);migrateHeavyWeaponAttack(old);assert.equal(old.stats.atk,expected);assert.deepEqual({id:old.id,upgrade:old.upgrade,traits:old.weaponTraits},before);
for(const style of ['axe','hammer']){
  const hero={type:'WEAPON',heroOnly:true,heroRole:'HEAVY',heroPower:1,weaponStyle:style,baseName:'勇者の武器'};applyHeroEquipmentUpgrade(hero,0);assert.equal(hero.stats.atk,16000);applyHeroEquipmentUpgrade(hero,2);assert.equal(hero.stats.atk,24000);applyHeroEquipmentUpgrade(hero,2);assert.equal(hero.stats.atk,24000);
}
for(const style of ['spear','hammer','axe']){assert.ok(weaponCombatProfile({weaponStyle:'sword'}).baseCooldown<weaponCombatProfile({weaponStyle:style}).baseCooldown);assert.ok(attackAnimationRate({weaponStyle:'sword'})>attackAnimationRate({weaponStyle:style}),'sword swings finish quickly');}
const game=Object.create(IronSquadGame);Object.assign(game,{container:document.getElementById('game'),width:390,height:664,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0,joystick:{active:false,dirX:0,dirY:0}});
for(const m of ['startGameLoop','showToast','spawnSparks','spawnDamageText'])game[m]=noop;
game.setupUI();game.activeSlotId=saveSlots.create('HEAVY WEAPONS TEST ONLY').id;game.startFreshGame(false);game.closeStrategyModal();game.squad=[];game.restTimer=0;game.outposts=[];
Object.assign(game.player,{x:83000,y:83000,magicAffinity:undefined});game.player.attributeProfile.innate.strength=150;game.player.attributeProfile.innate.magic=1;
const dummy=()=>({id:'heavy-target',type:'goblin',x:83000+52.8,y:83000,hp:1e8,maxHp:1e8,radius:12,atk:0,def:0});
const random=Math.random;try{
  Math.random=()=>.99;
  for(const style of ['hammer','axe']){
    const w=gear(style);game.equipped={weapon:w};game.recalcPlayerStats();game.player.crit=0;game.player.weaponMastery=emptyMastery();game.monsters=[dummy()];game.player.atkCooldown=0;
    assert.equal(canUseWeapon(game.player,w),true);const atk=game.player.atk;game.manualAttack();assert.equal(1e8-game.monsters[0].hp,Math.round(atk*1.2),'real normal hit contains weapon attack once');
    game.monsters=[dummy()];game.player.powerAtkCooldown=0;game.triggerPowerAttack();assert.equal(1e8-game.monsters[0].hp,Math.round(Math.round(atk*6.6)*1.2),'axe/hammer share the heavy skill, without another x10');
    const unit=game.createNewSoldier(null,{classKey:'HEAVY',talent:'AVERAGE'});unit.attributeProfile.innate.strength=150;unit.attributeProfile.innate.magic=1;unit.x=83000;unit.y=83000;unit.equipped={weapon:w};unit.weapon=w;game.recalcSoldierStats(unit);unit.crit=0;
    game.monsters=[dummy()];game.performAttack(unit,game.monsters[0],false,unit.atk,false,'physical');assert.equal(1e8-game.monsters[0].hp,unit.atk,'soldier hit has no hidden second x10');
    const legacy=structuredClone(w);delete legacy.heavyAttackVersion;legacy.stats.atk/=10;const untouched=JSON.stringify(legacy);soldierEquipmentValue(game,unit,legacy,'weapon',SOLDIER_CLASSES);assert.equal(JSON.stringify(legacy),untouched,'evaluation remains pure even for an old weapon');
  }
}finally{Math.random=random;}
const held=game.equipped.weapon;game.inventory=[old];game.sharedEquipBox=[structuredClone(old)];game.saveGame();const saved=structuredClone(saveSlots.get(game.activeSlotId).data);
for(const item of [saved.equipped.weapon,saved.inventory[0],saved.sharedEquipBox[0]]){item.stats.atk/=10;delete item.heavyAttackVersion;}
for(let load=0;load<2;load++){
  game.resumeSavedGame(load?structuredClone(game.saveGame()):saved);
  assert.equal(game.equipped.weapon.stats.atk,held.stats.atk);assert.equal(game.inventory.find(i=>i.id===old.id).stats.atk,expected);assert.equal(game.sharedEquipBox[0].stats.atk,expected);
}
console.log('PASS: axes through T1-T28, exact x10 normal/unique/hero attack, shared mastery/requirements/skills, actual player/soldier damage, fast unboosted sword, pure evaluation, upgrades and save migration');dom.window.close();
