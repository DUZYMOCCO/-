import assert from 'node:assert/strict';
import {rollAttributeProfile} from '../js/unit-attributes.js';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {mkdirSync,writeFileSync} from 'node:fs';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {isMage,isMagicUser,ensureMana,initializeMagic,spendMana,regenerateMana,distributeMagicStones,MAGIC_AFFINITIES,castMageSpell,castMedicBuff,updateMageAI,updateMagic} from '../js/magic-rules.js';
import {fieldsNear,updateHazards,drawHazards} from '../js/hazard-fields.js';
import {medicHasStamina,treatWounded} from '../js/casualty-rules.js';
import {supplyLocation} from '../js/supply-rules.js';
import {drawFieldSoldier} from '../js/visuals.js';
const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame,SOLDIER_CLASSES,DEPLOYMENT_CAPACITY,ENEMY_LIMIT}=await import('../js/index.js');
const {saveSlots}=await import('../js/save-slots.js');
const game=Object.create(IronSquadGame);game.container=document.getElementById('game');
Object.assign(game,{width:390,height:664,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0});
for(const k of ['startGameLoop','showToast','spawnSparks','spawnDamageText'])game[k]=noop;
game.setupUI();game.activeSlotId=saveSlots.create('MAGIC HAZARD TEST ONLY').id;game.startFreshGame(false);
assert.equal(game.squad.length,DEPLOYMENT_CAPACITY);assert.equal(game.monsters.length,ENEMY_LIMIT);
assert.equal(new Set(game.squad.map(s=>s.soldierClass)).size,5);assert.ok(game.squad.some(isMage));
const original=structuredClone(game.saveGame()),casterTemplate=original.squad.find(isMage),medicTemplate=original.squad.find(s=>s.soldierClass==='MEDIC');
assert.ok(casterTemplate.maxHp<original.squad.find(s=>s.soldierClass==='HEAVY').maxHp,'new mages are fragile compared with infantry');
function field(){game.resumeSavedGame(structuredClone(original));game.closeStrategyModal();Object.assign(game.player,{x:83000,y:83000,atkCooldown:100,speed:0});game.camera={x:83000,y:83000};game.squad=[];game.reserves=[];game.monsters=[];game.outposts=[];game.merchants=[];game.dungeons=[];game.civilians=[];game.projectiles=[];game.dropsOnField=[];game.magicBursts=[];game.magicReserve=0;game.updateSpawns=noop;game.currentQuest=null;game.restTimer=0;game.rankIndex=2;game.recalcPlayerStats();game.joystick={active:false,dirX:0,dirY:0};game._hazardClock=0;game.worldTerrain={tiles:new Map()};}
const mob=(x=83140,y=83000)=>({type:'goblin',x,y,hp:10000,maxHp:10000,atk:1,radius:12,speed:0,atkTimer:100});
const mage=affinity=>({...structuredClone(casterTemplate),x:83000,y:83000,isPersonalGuard:true,magicAffinity:affinity,mana:100,magicRecovering:false,atk:40,magicAttack:40,attributeProfile:rollAttributeProfile('MAGE','AVERAGE',()=>.5,true),_attributesNormalized:false,atkCooldown:0,reqExp:1e9});
const medic=()=>({...structuredClone(medicTemplate),x:83000,y:83000,isPersonalGuard:true,mana:100,atkCooldown:0,speed:0,_pgTick:3});
// Old stamina saves migrate once; natural recovery is deliberately slow.
const old={id:'old-medical',soldierClass:'MEDIC',hp:100,maxHp:100,medicStamina:23};assert.equal(ensureMana(old),23);assert.equal(old.medicStamina,undefined);assert.equal(medicHasStamina(old,24),false);regenerateMana(old,10);assert.ok(Math.abs(old.mana-29)<1e-8);assert.equal(spendMana(old,30),false);assert.equal(old.mana,29);
const affinities=new Set();for(let i=0;i<40;i++){const u={id:`trait-${i}`,soldierClass:'MAGE',hp:30,maxHp:30};ensureMana(u);affinities.add(u.magicAffinity);const fixed=u.magicAffinity;ensureMana(u);assert.equal(u.magicAffinity,fixed);}assert.equal(affinities.size,4);
for(const affinity of Object.keys(MAGIC_AFFINITIES)){
 field();const u=mage(affinity),target=mob(),neighbor=mob(target.x+20,target.y),outside=mob(target.x+130,target.y);game.squad=[u];game.monsters=[target,neighbor,outside];
 assert.equal(castMageSpell(game,u,target),true);assert.equal(u.mana,100-MAGIC_AFFINITIES[affinity].cost);assert.ok(target.hp<10000&&neighbor.hp<10000);assert.equal(outside.hp,10000,'range damage stays bounded');assert.ok(u.phaseActivity.combatActions>0);
 if(affinity==='ice'){assert.equal(neighbor.magicSlowTimer,3);target.speed=100;const x=target.x;game.update(.1);assert.ok(Math.abs((x-target.x)-5.5)<.01,'ice slows real hostile movement');}
 if(affinity==='lightning'){assert.equal(neighbor.magicStunTimer,.6);target.speed=100;const x=target.x;game.update(.1);assert.equal(target.x,x,'lightning suspends real hostile movement');}
 u.mana=0;const before=target.hp;assert.equal(castMageSpell(game,u,target),false);assert.equal(target.hp,before);
}
// Actual full game AI must stop an exhausted mage, channel, then move/cast again.
field();const tired=mage('fire');tired.mana=0;game.squad=[tired];game.monsters=[mob()];const position={x:tired.x,y:tired.y};game.update(.1);assert.equal(tired.magicRecovering,true);assert.deepEqual({x:tired.x,y:tired.y},position);assert.equal(game.magicBursts.length,0);
for(let i=0;i<100;i++){tired.hp=tired.maxHp;game._hazardClock=0;game.update(.1);}assert.ok(tired.phaseActivity.combatActions>0);assert.ok(game.monsters[0].hp<10000,'recovered mana enables a real spell');
// Field medicine spends mana, cannot heal when empty; downed treatment is also charged.
field();const healer=medic();healer.x-=100;game.squad=[healer];game.player.hp=Math.floor(game.player.maxHp*.2);game.update(.01);assert.equal(healer.mana,84);assert.ok(game.projectiles.some(p=>p.type==='HEAL'));
healer.mana=0;healer.atkCooldown=0;game.projectiles=[];game.update(.01);assert.equal(game.projectiles.length,0);
const down={id:'wounded-fixture',x:healer.x,y:healer.y,hp:0,maxHp:100,isDown:true,downTimer:45};healer.mana=0;assert.equal(treatWounded(game,healer,down,.1),false);assert.equal(down.rescueProgress,undefined);healer.mana=50;assert.equal(treatWounded(game,healer,down,.1),false);assert.ok(healer.mana<50&&down.rescueProgress>0);
// Class-up unlocks a real, non-stacking attack/ward buff that expires.
field();const support=medic();game.squad=[support];game.monsters=[mob()];assert.equal(castMedicBuff(game,support),false);game.awakeningOrbs=20;assert.equal(game.promoteSoldier(support.id),true);assert.equal(support.soldierClass,'HIGH_PRIEST');assert.equal(support.maxMana,140);support.mana=140;assert.equal(castMedicBuff(game,support),true);assert.equal(support.mana,116);assert.ok(game.player.magicAttackTimer>0);assert.equal(castMedicBuff(game,support),false);
game.equipped.weapon=null;game.player.crit=0;game.player.atk=100;const victim=mob(game.player.x+35,game.player.y);game.monsters=[victim];const buffRandom=Math.random;try{Math.random=()=>.05;game.performAttack(game.player,victim,true,100,false);}finally{Math.random=buffRandom;}assert.equal(10000-victim.hp,115,'zero crit remains zero and the real spell buff adds exactly 15%');
const hp=game.player.hp;game.damageTarget(game.player,20,{environmental:true});assert.ok(hp-game.player.hp<20,'ward reduces actual incoming damage');updateMagic(game,12,()=>null);assert.equal(game.player.magicAttackTimer,0);assert.equal(game.player.magicAttackBonus,0);
field();const advancing=mage('lightning');game.squad=[advancing];game.awakeningOrbs=20;game.awakeningGems=1;for(const [id,capacity] of [['ARCHMAGE',140],['ELEMENTAL_SAGE',180],['ARCANE_SOVEREIGN',220]]){assert.equal(game.promoteSoldier(advancing.id),true);assert.equal(advancing.soldierClass,id);assert.equal(advancing.maxMana,capacity);assert.equal(advancing.magicAffinity,'lightning');}
// Mana supply at HQ, merchants, empty camps, town entrance and town interiors; no local/world coordinate leak.
field();const supplier=mage('fire');supplier.mana=0;game.squad=[supplier];Object.assign(supplier,{x:79360,y:79360});updateMagic(game,.25,supplyLocation);assert.equal(supplier.mana,100);
supplier.x=83000;supplier.y=83000;supplier.mana=0;game.merchants=[{id:'vendor',x:83020,y:83000,hp:10,maxHp:10}];updateMagic(game,.25,supplyLocation);assert.equal(supplier.mana,100);game.merchants=[];
supplier.mana=0;game.worldTerrain.tiles.set('camp',{camps:[{id:'camp_1_1',x:83000,y:83000}]});updateMagic(game,.25,supplyLocation);assert.equal(supplier.mana,100);game.worldTerrain.tiles.clear();
supplier.mana=0;game.dungeons=[{id:'town',kind:'town',name:'MP町',entrance:{x:83000,y:83000},height:600}];updateMagic(game,.25,supplyLocation);assert.equal(supplier.mana,100);
game.currentDungeon=game.dungeons[0];Object.assign(supplier,{x:180,y:300,mana:0});updateMagic(game,.25,supplyLocation);assert.equal(supplier.mana,100);game.currentDungeon={kind:'ruin'};supplier.mana=0;updateMagic(game,.25,supplyLocation);assert.ok(supplier.mana<1);game.currentDungeon=null;
// Any collector routes stones to all magic users; equipment bags remain unchanged.
field();const receiver=mage('ice');receiver.x=85000;receiver.y=85000;receiver.mana=0;const receiver2=medic();receiver2.x=85100;receiver2.y=85000;receiver2.mana=0;game.squad=[receiver,receiver2];game.dropsOnField=[{x:game.player.x,y:game.player.y,isMagicStone:true,mana:20}];const bag=game.inventory.length;game.update(.01);assert.ok(receiver.mana>=10&&receiver2.mana>=10);assert.equal(game.dropsOnField.length,0);assert.equal(game.inventory.length,bag);
receiver.mana=100;receiver2.mana=100;distributeMagicStones(game,12);assert.equal(game.magicReserve,12);receiver.mana=95;receiver.magicRecovering=false;updateMagic(game,.25,()=>null);assert.equal(receiver.mana,100);assert.ok(game.magicReserve>7&&game.magicReserve<8);
field();const collector=structuredClone(original.squad.find(s=>s.soldierClass==='HEAVY'));Object.assign(collector,{x:83000,y:83000,isPersonalGuard:true,speed:0,atkCooldown:100});const remoteMage=mage('fire');remoteMage.x=85000;remoteMage.y=85000;remoteMage.mana=0;game.squad=[collector,remoteMage];game.dropsOnField=[{x:83000,y:83000,isMagicStone:true,mana:20}];game.update(.01);assert.ok(remoteMage.mana>=20);assert.equal(game.dropsOnField.length,0);
const random=Math.random;try{Math.random=()=>.1;const dead=mob();dead.hp=0;game.monsters=[dead];game.killMonster(dead,game.player,true);assert.ok(game.dropsOnField.some(d=>d.isMagicStone&&d.mana>=18));assert.ok(game.dropsOnField.some(d=>d.isAmmo));}finally{Math.random=random;}
// Potions restore magic too, but cannot resurrect exhausted casualties.
receiver.mana=0;receiver.magicRecovering=true;receiver.hp=1;game.squad=[receiver,{...medic(),id:'down-caster',hp:0,isDown:true,mana:0}];game.squadPotion=1;assert.equal(game.useSquadPotion(),true);assert.equal(receiver.mana,100);assert.equal(receiver.magicRecovering,false);assert.equal(game.squad[1].mana,0);
// Hazard damage is real, trains health, stops outside the boundary and never operates in towns/rest.
field();const hazard=fieldsNear(79360+740,79360+420).find(f=>f.id==='hazard-borderland');Object.assign(game.player,{x:hazard.x,y:hazard.y,def:100000});game.player.hp=game.player.maxHp;const trained=game.player.hitGrowthPct;const health=game.player.hp;updateHazards(game,.5);assert.ok(game.player.hp<health-5,'armor does not neutralize dangerous terrain');assert.ok(game.player.hitGrowthPct>trained);assert.equal(game.player.phaseActivity.combatActions,0,'standing in terrain trains HP without granting combat participation');const after=game.player.hp;game.player.x=hazard.x+hazard.radius+30;updateHazards(game,.5);assert.equal(game.player.hp,after);
Object.assign(game.player,{x:hazard.x,y:hazard.y});game.restTimer=1;updateHazards(game,1);assert.equal(game.player.hp,after);game.restTimer=0;game.currentDungeon={kind:'town'};updateHazards(game,1);assert.equal(game.player.hp,after);game.currentDungeon=null;game.refreshHazardUI();assert.equal(document.getElementById('hazard-warning').classList.contains('hidden'),false);
const neutral=mob(hazard.x,hazard.y);neutral.hp=5;game.monsters=[neutral];const xp=game.exp;updateHazards(game,.5);assert.equal(game.monsters.length,0);assert.equal(game.exp,xp,'untouched creatures do not farm terrain XP');
// Living soldier magic, personality, recovery and shared bank persist through actual saves.
field();const retained=mage('explosion');retained.mana=7;retained.magicRecovering=true;game.squad=[retained];game.magicReserve=13;game.player.magicAttackTimer=4;game.player.magicAttackBonus=.15;game.saveGame();const saved=saveSlots.get(game.activeSlotId).data;game.resumeSavedGame(saved);const loaded=game.squad.find(s=>s.id===retained.id);assert.equal(loaded.mana,7);assert.equal(loaded.magicAffinity,'explosion');assert.equal(loaded.magicRecovering,true);assert.equal(game.magicReserve,13);assert.equal(game.player.magicAttackTimer,4);
game.inventory.push({id:'roll-label',name:'補正検証装備',type:'SHIELD',tier:1,rollMult:1.04,stats:{def:2},color:'#cbd5e1'});game.renderStrategyUI();assert.match(document.getElementById('inventory-list').textContent,/ドロップランダム補正×1.04/);assert.doesNotMatch(document.getElementById('inventory-list').textContent,/個体×/);game.openSoldierDetail(loaded.id);assert.match(document.querySelector('.soldier-detail-panel').textContent,/MP.*7\/100.*爆発/);
game.closeSoldierDetail();game.startFreshGame(false);game.updateSpawns=noop;for(let i=0;i<30;i++)game.update(1/60);assert.equal(game.squad.length,DEPLOYMENT_CAPACITY);assert.ok(game.monsters.length<=ENEMY_LIMIT);assert.ok(game.squad.filter(isMagicUser).every(s=>Number.isFinite(s.mana)));
// Native code visuals: distinct human mage silhouettes, all four attributes and terrain.
const {createCanvas}=createRequire(resolve('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules','entry.cjs'))('@napi-rs/canvas');
const preview=createCanvas(760,320),native=preview.getContext('2d');native.fillStyle='#18232a';native.fillRect(0,0,760,320);
const rendered=[];for(const [i,affinity] of Object.keys(MAGIC_AFFINITIES).entries()){
 const canvas=createCanvas(130,160),c=canvas.getContext('2d'),person={...mage(affinity),x:65,y:110};drawFieldSoldier(c,person,0,SOLDIER_CLASSES.MAGE,'#998868',false);const pixels=c.getImageData(54,68,22,40).data;assert.ok(pixels.some((v,j)=>j%4===3&&v>0));rendered.push(canvas.toBuffer('image/png'));native.save();native.translate(i*185+100,235);native.scale(3,3);const actor={...mage(affinity),x:0,y:0,name:['Fire','Ice','Lightning','Blast'][i]};drawFieldSoldier(native,actor,0,{...SOLDIER_CLASSES.MAGE,name:'Mage'},'#998868',false);native.restore();
}assert.notDeepEqual(rendered[0],rendered[1]);assert.notDeepEqual(rendered[2],rendered[3]);
const terrain=createCanvas(260,260),t=terrain.getContext('2d');const viewGame={camera:{x:hazard.x,y:hazard.y},player:{x:hazard.x,y:hazard.y,hp:100}};t.translate(130-hazard.x,130-hazard.y);drawHazards(t,viewGame,{left:hazard.x-130,right:hazard.x+130,top:hazard.y-130,bottom:hazard.y+130});assert.ok(t.getImageData(125,125,10,10).data.some((v,i)=>i%4===3&&v>0));
mkdirSync('iron-squad/docs/previews',{recursive:true});writeFileSync('iron-squad/docs/previews/magic-users.png',preview.toBuffer('image/png'));writeFileSync('iron-squad/docs/previews/damage-field.png',terrain.toBuffer('image/png'));
console.log('PASS: five base classes, fragile mage, medical mana costs/slow regeneration/migration, four area spells/statuses, empty immobility/meditation recovery, real class-up buffs/expiry, HQ/camp/town/merchant supply, all collectors/stone bank/independent drops, potions/no revival, damaging/training fields/safe rest/towns/no idle XP, saved mana/personality/buffs, drop correction label and native human/terrain visuals');
dom.window.close();
