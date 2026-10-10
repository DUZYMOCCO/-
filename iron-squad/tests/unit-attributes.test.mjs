import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {rollAttributeProfile,attributeValues,attributeCarryCapacity,attributeSpecialties,prefersCasterMelee,cappedAttributeValue,ATTRIBUTE_KEYS,canChannelWeaponMagic,attributeFamily} from '../js/unit-attributes.js';
import {spendMana,updateMagic} from '../js/magic-rules.js';
import {collectAllSoldiers,computeRankings} from '../js/troop-rankings.js';
const dom=new JSDOM('<div id="game"></div>',{url:'http://localhost/',pretendToBeVisual:true});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame,generateRandomDrop,applyUpgradeStats}=await import('../js/index.js');
const {saveSlots}=await import('../js/save-slots.js');
const game=Object.create(IronSquadGame),F=83000;
Object.assign(game,{container:document.getElementById('game'),width:390,height:664,zoom:1,ctx,camera:{x:F,y:F},selectedSaleIds:new Set(),commandActiveUntil:0,joystick:{active:false,dirX:0,dirY:0}});
for(const method of ['startGameLoop','showToast','spawnSparks','spawnDamageText'])game[method]=noop;
game.setupUI();game.activeSlotId=saveSlots.create('ATTRIBUTES TEST ONLY').id;game.startFreshGame(false);
const initial=structuredClone(game.saveGame());
function field(){game.resumeSavedGame(structuredClone(initial));game.closeStrategyModal();Object.assign(game.player,{x:F+1000,y:F,atkCooldown:1000});Object.assign(game,{squad:[],reserves:[],monsters:[],outposts:[],merchants:[],dungeons:[],civilians:[],projectiles:[],dropsOnField:[],magicReserve:0,currentQuest:null,restTimer:0,currentDungeon:null,updateSpawns:noop,worldTerrain:{tiles:new Map()}});game.invasions.stage='idle';game.baseRaidActive=false;game.joystick={active:false,dirX:0,dirY:0};game._hazardClock=0;}
function unit(classKey='HEAVY',overrides={}){const u=game.createNewSoldier(null,{classKey,talent:'AVERAGE',attributeProfile:rollAttributeProfile(classKey,'AVERAGE',()=>.5,true)});u.attributeProfile=rollAttributeProfile(classKey,'AVERAGE',()=>.5,true);u._attributesNormalized=false;Object.assign(u,{x:F,y:F,isPersonalGuard:true,atkCooldown:1000,speed:0},overrides);game.recalcSoldierStats(u);u.hp=u.maxHp;return u;}
const dummy=()=>({type:'goblin',x:F+25,y:F,hp:1e8,maxHp:1e8,atk:0,def:0,radius:12,speed:0,atkTimer:1000});
const originalRandom=Math.random;
try {
 field();const melee=unit(),ranged=unit();ranged.equipped.weapon.weaponStyle='bow';
 Math.random=()=>.99;
 for(let i=0;i<100;i++){game.performAttack(melee,dummy(),false,1,false);game.performAttack(ranged,dummy(),false,1,false);}
 game.recalcSoldierStats(melee);game.recalcSoldierStats(ranged);
 assert.ok(melee.strength>ranged.strength&&ranged.strength>25,'both physical paths grow; close combat grows faster');
 assert.ok(melee.atk>unit().atk);
 assert.equal(attributeCarryCapacity(melee),2,'strength unlocks a second transported person');
 const beforeProfile=JSON.stringify(melee.attributeProfile),beforeAtk=melee.atk;
 for(let i=0;i<10;i++)game.recalcSoldierStats(melee);
 assert.equal(melee.atk,beforeAtk);assert.equal(JSON.stringify(melee.attributeProfile),beforeProfile,'recalculation does not itself train or reroll');
 const mage=unit('MAGE'),magicBefore=mage.magicPower;
 assert.equal(spendMana(mage,36),true);game.recalcSoldierStats(mage);
 assert.ok(mage.magicPower>magicBefore);assert.equal(mage.attributeProfile.practice.magic,2);
 const afterUse=structuredClone(mage.attributeProfile.practice);assert.equal(spendMana(mage,200),false);assert.deepEqual(mage.attributeProfile.practice,afterUse);

 // Physical armour does not protect from magic; magical resistance does, and being hit trains that resistance.
 field();const soft=unit(),resistant=unit();soft.attributeProfile.innate.magicDefense=0;resistant.attributeProfile.innate.magicDefense=200;
 game.recalcSoldierStats(soft);game.recalcSoldierStats(resistant);soft.hp=soft.maxHp;resistant.hp=resistant.maxHp;
 const softHp=soft.hp,hardHp=resistant.hp;game.damageTarget(soft,50,{damageKind:'magic'});game.damageTarget(resistant,50,{damageKind:'magic'});
 assert.ok(softHp-soft.hp>hardHp-resistant.hp);assert.ok(soft.attributeProfile.practice.magicDefense>0);
 const physical=unit(),defBefore=physical.magicDef;game.damageTarget(physical,10);
 assert.equal(physical.attributeProfile.practice.magicDefense,0);assert.equal(physical.magicDef,defBefore);
 const dodge=unit('LIGHT'),dodgeBefore=dodge.dodge,hpBefore=dodge.hp;Math.random=()=>0;
 for(const options of [{},{damageKind:'magic'},{damageKind:'elemental',element:'fire'}])game.damageTarget(dodge,10,options);
 assert.equal(dodge.hp,hpBefore);assert.equal(dodge.attributeProfile.practice.evasion,3);assert.ok(dodge.dodge>dodgeBefore);
 const evades=dodge.attributeProfile.practice.evasion;game.damageTarget(dodge,10,{environmental:true,damageKind:'elemental',element:'fire'});
 assert.equal(dodge.attributeProfile.practice.evasion,evades,'standing in damaging terrain cannot be dodged');

 // Actual displacement is recorded; standing still and changing maps cannot award walking distance.
 Math.random=()=>.99;field();game.player.x=F;game.player.y=F;game.player.hp=game.player.maxHp;
 game.joystick={active:true,dirX:1,dirY:0};const startX=game.player.x;game.update(.1);
 const walking=game.player.attributeProfile.practice.travel;assert.ok(walking>0&&Math.abs(walking-(game.player.x-startX))<.01);
 game.joystick.active=false;game.update(.1);assert.equal(game.player.attributeProfile.practice.travel,walking);
 game.player.x+=10000;game.update(.1);assert.equal(game.player.attributeProfile.practice.travel,walking);

 // A low-magic, strong mage actually attacks in melee with no MP and gains physical practice.
 field();const brawler=unit('MAGE',{atkCooldown:0,_pgTick:3});brawler.attributeProfile.innate.strength=80;brawler.attributeProfile.innate.magic=1;brawler.equipped.weapon=generateRandomDrop(0,'normal',{type:'WEAPON',tier:1,weaponStyle:'hammer',random:()=>.5});brawler.weapon=brawler.equipped.weapon;game.recalcSoldierStats(brawler);brawler.hp=brawler.maxHp;brawler.mana=0;
 assert.ok(prefersCasterMelee(brawler));const enemy=dummy();game.squad=[brawler];game.monsters=[enemy];game.update(.1);
 assert.ok(enemy.hp<enemy.maxHp);assert.equal(brawler.magicRecovering,false);assert.ok(brawler.attributeProfile.practice.strength>0);assert.equal(brawler.attributeProfile.practice.magic,0);
 // A physical healer still treats a wounded ally before attacking.
 field();const cleric=unit('MEDIC',{atkCooldown:0,_pgTick:3});cleric.attributeProfile.innate.strength=80;cleric.attributeProfile.innate.magic=1;cleric.equipped.weapon=generateRandomDrop(0,'normal',{type:'WEAPON',tier:1,weaponStyle:'spear',random:()=>.5});cleric.weapon=cleric.equipped.weapon;game.recalcSoldierStats(cleric);cleric.hp=cleric.maxHp;
 const patient=unit();patient.x=F+30;patient.hp=patient.maxHp*.3;game.squad=[cleric,patient];game.monsters=[dummy()];game.update(.01);
 assert.ok(game.projectiles.some(p=>p.type==='HEAL'),'care has priority even for a brawler');
 assert.equal(cleric.attributeProfile.practice.strength,0);assert.ok(cleric.attributeProfile.practice.magic>0);

 // A staff or wand hit never trains strength, even with an artificially strong bearer.
 for(const style of ['staff','wand']){const caster=unit('MAGE');caster.equipped.weapon.weaponStyle=style;game.performAttack(caster,dummy(),false,1,false,'physical');assert.equal(caster.attributeProfile.practice.strength,0);}
 for(const [classKey,family] of [['SWORD_EMPEROR','LIGHT'],['STORM_BOW','ARCHER'],['ARCANE_SOVEREIGN','MAGE']])assert.equal(attributeFamily({soldierClass:classKey}),family);
 const normalCaster=unit('MAGE');const youngStrength=normalCaster.strength;normalCaster.level=100;game.recalcSoldierStats(normalCaster);assert.ok(normalCaster.strength-youngStrength<=1);
 // A melee weapon compensates the caster's level growth; switching to a wand removes only that equipment bonus.
 brawler.level=30;game.recalcSoldierStats(brawler);const meleeStrength=brawler.strength;brawler.equipped.weapon.weaponStyle='wand';game.recalcSoldierStats(brawler);assert.ok(meleeStrength>brawler.strength+30);brawler.equipped.weapon.weaponStyle='hammer';game.recalcSoldierStats(brawler);
 // Hidden melee magic actually spends MP and trains magic. A healer's strength buff expires without compounding.
 field();brawler.atkCooldown=0;brawler.mana=100;brawler.hp=brawler.maxHp;game.squad=[brawler];const infusedEnemy=dummy();assert.equal(game.performCasterMelee(brawler,infusedEnemy),true);assert.equal(brawler.mana,94);assert.ok(brawler.attributeProfile.practice.magic>0);
 field();cleric.atkCooldown=0;cleric.mana=100;game.squad=[cleric];const naturalStrength=cleric.strength;assert.equal(game.performCasterMelee(cleric,dummy()),true);assert.ok(cleric.strength>naturalStrength);game.recalcSoldierStats(cleric);const boosted=cleric.strength;for(let i=0;i<3;i++)game.recalcSoldierStats(cleric);assert.equal(cleric.strength,boosted);updateMagic(game,9,()=>null);assert.ok(cleric.strength<=naturalStrength+2);assert.equal(cleric._casterStrengthTimer,0);
 // Rare magical warriors and archers infuse their ordinary weapons without changing profession.
 field();const spellBlade=unit('LIGHT');spellBlade.attributeProfile.innate.magic=100;spellBlade.attributeProfile.innate.strength=25;game.recalcSoldierStats(spellBlade);spellBlade.mana=60;assert.ok(canChannelWeaponMagic(spellBlade));const bladeEnemy=dummy();game.performAttack(spellBlade,bladeEnemy,false,1,false);assert.equal(spellBlade.mana,54);assert.ok(spellBlade.attributeProfile.practice.magic>0);assert.ok(bladeEnemy.maxHp-bladeEnemy.hp>1);
 const magicArcher=unit('ARCHER');magicArcher.attributeProfile.innate.magic=100;magicArcher.equipped.weapon.weaponStyle='bow';game.recalcSoldierStats(magicArcher);magicArcher.mana=60;magicArcher.ammo=10;game.squad=[magicArcher];const arrowEnemy=dummy();game.monsters=[arrowEnemy];game.spawnRangedProjectile(magicArcher,arrowEnemy,1,{style:'bow',projSpeed:360},false);assert.equal(magicArcher.mana,54);assert.ok(game.projectiles[0].magicDamage>0);game.update(.1);game.update(.1);assert.ok(arrowEnemy.maxHp-arrowEnemy.hp>1);
 // Endgame attributes cap at 255, incremental growth shrinks, while equipment remains uncapped.
 assert.ok(cappedAttributeValue(110)-cappedAttributeValue(100)>cappedAttributeValue(510)-cappedAttributeValue(500));
 const limit=unit('HEAVY');limit.level=100000;limit.attributeProfile.practice.evasion=1e12;game.recalcSoldierStats(limit);for(const key of ATTRIBUTE_KEYS)assert.equal(attributeValues(limit)[key],255,key);assert.equal(limit.dodge,99);assert.ok(limit.maxHp>255&&limit.atk>255);
 const beforeGear=limit.atk;applyUpgradeStats(limit.equipped.weapon,10000);game.recalcSoldierStats(limit);assert.ok(limit.atk>beforeGear);assert.equal(limit.equipped.weapon.upgrade,10000);assert.equal(limit.strength,255);

 // Attribute multipliers preserve individuality even as equipment enhancement grows without a limit.
 const ordinaryWarrior=unit('HEAVY'),giftedWarrior=unit('HEAVY');giftedWarrior.attributeProfile.innate.strength=50;giftedWarrior.equipped=structuredClone(ordinaryWarrior.equipped);giftedWarrior.weapon=giftedWarrior.equipped.weapon;game.recalcSoldierStats(giftedWarrior);const earlyGap=giftedWarrior.atk-ordinaryWarrior.atk;
 for(const bearer of [ordinaryWarrior,giftedWarrior]){applyUpgradeStats(bearer.equipped.weapon,10000);game.recalcSoldierStats(bearer);}
 assert.ok(giftedWarrior.atk>=ordinaryWarrior.atk*1.99);assert.ok(giftedWarrior.atk-ordinaryWarrior.atk>earlyGap*20);

 // Each melee style is viable for a muscle caster, and a strong healer actually closes to attack.
 for(const style of ['sword','spear','hammer']){field();const muscle=unit('MAGE');muscle.attributeProfile.innate.strength=80;muscle.attributeProfile.innate.magic=1;muscle.equipped.weapon=generateRandomDrop(0,'normal',{type:'WEAPON',tier:1,weaponStyle:style,random:()=>.5});muscle.weapon=muscle.equipped.weapon;game.recalcSoldierStats(muscle);muscle.atkCooldown=0;muscle.mana=0;assert.ok(prefersCasterMelee(muscle));assert.equal(game.performCasterMelee(muscle,dummy()),true,style);}
 field();cleric.x=F;cleric.y=F;cleric._pgTick=3;cleric.atkCooldown=0;cleric.mana=100;const distantEnemy=dummy();distantEnemy.x=F+100;game.squad=[cleric];game.monsters=[distantEnemy];game.update(.1);assert.ok(cleric.x>F,'a melee healer approaches an enemy when no treatment is needed');assert.ok(!game.projectiles.some(p=>p.type==='SMITE'));

 // Innate outliers can cross professions, and old units acquire a stable profile without global random draws.
 let seed=17;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};let mismatches=0;
 for(let i=0;i<10000;i++){const candidate={id:`sample-${i}`,soldierClass:'MEDIC',level:1,talent:'AVERAGE',attributeProfile:rollAttributeProfile('MEDIC','AVERAGE',random)};const values=attributeValues(candidate);if(values.strength>values.magic)mismatches++;}
 assert.ok(mismatches>0&&mismatches<100,'muscular casters remain exceptionally rare');
 Math.random=()=>{throw new Error('legacy profile must not draw global randomness');};
 const legacy={id:'older-unit',soldierClass:'LIGHT',level:10,talent:'TALENTED'};const first=attributeValues(legacy);
 const reloaded=JSON.parse(JSON.stringify(legacy));assert.deepEqual(attributeValues(reloaded),first);
 assert.deepEqual(attributeSpecialties(reloaded),attributeSpecialties(legacy));
 Math.random=()=>.99;
 game.recalcSoldierStats(brawler);game.recalcSoldierStats(melee);game.squad=[brawler];game.reserves=[melee];const data=structuredClone(game.saveGame());game.resumeSavedGame(data);
 const savedBrawler=[...game.squad,...game.reserves].find(u=>u.id===brawler.id);assert.deepEqual(savedBrawler.attributeProfile.practice,brawler.attributeProfile.practice);
 assert.equal(savedBrawler.strength,brawler.strength);assert.equal(savedBrawler.magicPower,brawler.magicPower);
 const all=collectAllSoldiers(game);assert.ok(all.some(entry=>entry.soldier.id===melee.id),'reserve soldiers participate in rankings');
 const evadeList=computeRankings([{soldier:{id:'natural',evasion:80,dodge:29},platoon:'本隊'},{soldier:{id:'gifted',evasion:40,dodge:35},platoon:'本隊'}],'evasion');assert.equal(evadeList[0].soldier.id,'gifted','evasion ranking uses actual chance including talent');
 const strengthList=computeRankings(all,'strength');assert.equal(strengthList[0].soldier.id,brawler.id);
 const html=game.buildSoldierDetailHtml(savedBrawler);for(const label of ['筋力','魔力','魔法防御','速さ','回避','歩いた距離'])assert.ok(html.includes(label),label);
 assert.ok(!html.includes('殴り術師'),'hidden combat abilities are not announced');
 console.log(JSON.stringify({meleeStrength:melee.strength,rangedStrength:ranged.strength,brawlerAttack:brawler.atk,brawlerMagicAttack:brawler.magicAttack,oppositeTalentExamples:mismatches}));
} finally {Math.random=originalRandom;dom.window.close();}
console.log('PASS: individual aptitudes, melee/ranged/spell training, resistance and all attack dodges, actual walking/no teleport credit, caster melee and healer priority, stable legacy/save/reserve/attribute rankings and UI');
