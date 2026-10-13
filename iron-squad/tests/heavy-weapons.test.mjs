import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {TIERS} from '../js/equipment-tiers.js';
import {weaponCombatProfile,meleeSweetSpotFor,equipmentIcon} from '../js/equipment-rules.js';
import {emptyMastery,normalizeMastery,gainWeaponMastery,masteryAtkMult,masteryReloadMult,favoriteWeaponBias,rollWeaponStyle,weaponStyleOf,splitHeavyFavorite,pickFavoriteWeapon} from '../js/growth-rules.js';
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
  assert.equal(a.stats.atk,oldHammer*3,'axe x3');assert.equal(h.stats.atk,oldHammer*7,'hammer x7');
  assert.equal(s.stats.atk,Math.floor((10+tier.powerRank*5)*tier.mult*(1+upgrade*.25)*1.8*quality),'sword attack uses v6.6 balance');
  assert.equal(a.stats.atkSpeed,h.stats.atkSpeed);assert.equal(requiredWeaponStrength(a),requiredWeaponStrength(h));
  assert.match(a.name,/斧/);assert.equal(weaponStyleOf(a),'axe');assert.equal(equipmentIcon(a),'🪓');
  const atk=a.stats.atk;applyUpgradeStats(a,upgrade);assert.equal(a.stats.atk,atk,'reforging does not repeat the multiplier');
}
const unique=gear('hammer');unique.dropOnly=true;unique.dropOnlyKey='WEAPON';applyUpgradeStats(unique,0);assert.equal(unique.stats.atk,Math.floor(36*1.12)*7,'exclusive bonus is included before x7');
assert.deepEqual({...weaponCombatProfile({weaponStyle:'axe'}),style:'hammer'},weaponCombatProfile({weaponStyle:'hammer'}));
assert.deepEqual(meleeSweetSpotFor('axe'),meleeSweetSpotFor('hammer'));
assert.equal(rollWeaponStyle('melee',()=>.3),'axe');assert.equal(rollWeaponStyle('melee',()=>.2),'hammer');
// v6.3.0: axe and hammer are separate kinds with their own mastery tracks and favourites.
const mastery={weaponMastery:emptyMastery()};gainWeaponMastery(mastery,'axe',12);assert.equal(mastery.weaponMastery.axe,12);assert.equal(mastery.weaponMastery.hammer,0);assert.equal(Object.keys(mastery.weaponMastery).length,9);
assert.ok(masteryAtkMult(mastery.weaponMastery,'axe')>masteryAtkMult(mastery.weaponMastery,'hammer'));assert.ok(masteryReloadMult(mastery.weaponMastery,'axe')<masteryReloadMult(mastery.weaponMastery,'hammer'));
assert.equal(favoriteWeaponBias(gear('axe'),'hammer'),0);assert.equal(favoriteWeaponBias(gear('hammer'),'axe'),0);assert.equal(favoriteWeaponBias(gear('axe'),'axe'),120);assert.equal(favoriteWeaponBias(gear('hammer'),'hammer'),120);
assert.deepEqual([normalizeMastery({hammer:8,axe:4}).hammer,normalizeMastery({hammer:8,axe:4}).axe],[8,4],'separate tracks are kept');assert.deepEqual(normalizeMastery(normalizeMastery({hammer:8,axe:4})),normalizeMastery({hammer:8,axe:4}));
assert.equal(normalizeMastery({sword:3,hammer:15}).axe,15,'pre-v6.3 saves (merged track, no axe key) start the axe track from the shared hammer value');assert.equal(normalizeMastery({hammer:15,axe:0}).axe,0);
const legacy={favoriteWeapon:'hammer',equipped:{weapon:gear('axe')}};splitHeavyFavorite(legacy);assert.equal(legacy.favoriteWeapon,'axe','old hammer-lovers holding an axe now favour axes');legacy.equipped.weapon=gear('hammer');legacy.favoriteWeapon='hammer';splitHeavyFavorite(legacy);assert.equal(legacy.favoriteWeapon,'hammer','the split runs only once');
const keeps={favoriteWeapon:'hammer',equipped:{weapon:gear('hammer')}};splitHeavyFavorite(keeps);assert.equal(keeps.favoriteWeapon,'hammer');
const picks=new Set();for(let i=0;i<200;i++)picks.add(pickFavoriteWeapon('HEAVY',()=>i/200));assert.ok(picks.has('axe')&&picks.has('hammer'),'soldiers can favour axes and hammers separately');
const old={...gear('hammer',9,2),id:'legacy-hammer'};old.stats.atk/=7;delete old.heavyAttackVersion;const expected=old.stats.atk*7,before={id:old.id,upgrade:old.upgrade,traits:structuredClone(old.weaponTraits)};
migrateHeavyWeaponAttack(old);migrateHeavyWeaponAttack(old);assert.equal(old.stats.atk,expected);assert.deepEqual({id:old.id,upgrade:old.upgrade,traits:old.weaponTraits},before);
// v6.1.x items carry the old x10 (heavyAttackVersion 1): converted once to x3 (axe) / x7 (hammer).
for(const [style,mult] of [['axe',3],['hammer',7]]){const fresh=gear(style,9,2),v1=structuredClone(fresh);v1.stats.atk=v1.stats.atk/mult*10;v1.heavyAttackVersion=1;migrateHeavyWeaponAttack(v1);migrateHeavyWeaponAttack(v1);assert.equal(v1.stats.atk,fresh.stats.atk,`${style} v1 x10 becomes x${mult}`);assert.equal(v1.heavyAttackVersion,2);}
for(const [style,mult] of [['axe',3],['hammer',7]]){
  const hero={type:'WEAPON',heroOnly:true,heroRole:'HEAVY',heroPower:1,weaponStyle:style,baseName:'勇者の武器'};applyHeroEquipmentUpgrade(hero,0);assert.equal(hero.stats.atk,1600*mult);applyHeroEquipmentUpgrade(hero,2);assert.equal(hero.stats.atk,2400*mult);applyHeroEquipmentUpgrade(hero,2);assert.equal(hero.stats.atk,2400*mult);
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
    game.monsters=[dummy()];game.player.powerAtkCooldown=0;game.triggerPowerAttack();assert.equal(1e8-game.monsters[0].hp,Math.round(Math.round(atk*(style==='axe'?3.4:6.6))*1.2),'axe spin / hammer single blow, without another weapon multiplier');
    game.monsters=[dummy(),{...dummy(),id:'behind',x:83000-60}];game.player.powerAtkCooldown=0;game.triggerPowerAttack();
    assert.equal(game.monsters.filter(m=>m.hp<1e8).length,style==='axe'?2:1,'axe spin hits all around, hammer hits one');
    const unit=game.createNewSoldier(null,{classKey:'HEAVY',talent:'AVERAGE'});unit.attributeProfile.innate.strength=150;unit.attributeProfile.innate.magic=1;unit.x=83000;unit.y=83000;unit.equipped={weapon:w};unit.weapon=w;game.recalcSoldierStats(unit);unit.crit=0;
    game.monsters=[dummy()];game.performAttack(unit,game.monsters[0],false,unit.atk,false,'physical');assert.equal(1e8-game.monsters[0].hp,unit.atk,'soldier hit has no hidden second x10');
    const legacy=structuredClone(w);delete legacy.heavyAttackVersion;legacy.stats.atk/=style==='axe'?3:7;const untouched=JSON.stringify(legacy);soldierEquipmentValue(game,unit,legacy,'weapon',SOLDIER_CLASSES);assert.equal(JSON.stringify(legacy),untouched,'evaluation remains pure even for an old weapon');
  }
}finally{Math.random=random;}
const held=game.equipped.weapon;game.inventory=[old];game.sharedEquipBox=[structuredClone(old)];game.saveGame();const saved=structuredClone(saveSlots.get(game.activeSlotId).data);
for(const item of [saved.equipped.weapon,saved.inventory[0],saved.sharedEquipBox[0]]){item.stats.atk/=item.weaponStyle==='axe'?3:7;delete item.heavyAttackVersion;}
for(let load=0;load<2;load++){
  game.resumeSavedGame(load?structuredClone(game.saveGame()):saved);
  assert.equal(game.equipped.weapon.stats.atk,held.stats.atk);assert.equal(game.inventory.find(i=>i.id===old.id).stats.atk,expected);assert.equal(game.sharedEquipBox[0].stats.atk,expected);
}
console.log('PASS: axes through T1-T28, exact x3 axe / x7 hammer normal/unique/hero attack, v1 x10 migration, axe spin area, separate axe/hammer mastery and favourites with legacy split, shared requirements, actual player/soldier damage, fast balanced sword, pure evaluation, upgrades and save migration');dom.window.close();
