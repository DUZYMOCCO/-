import assert from 'node:assert/strict';
import {JSDOM} from '../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {WORLD_SIZE} from '../js/games/iron-squad/world.js';
import {updateMagic,HQ_DEFENSE_MANA_REGEN,isDefenseBattle} from '../js/games/iron-squad/magic-rules.js';
import {rollAttributeProfile} from '../js/games/iron-squad/unit-attributes.js';
import {supplyLocation} from '../js/games/iron-squad/supply-rules.js';
const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame,SOLDIER_CLASSES,SOLDIER_PHYS_DMG_MULT,SOLDIER_SPEAR_DMG_MULT,SOLDIER_HAMMER_DMG_MULT}=await import('../js/games/iron-squad/index.js');
const {saveSlots}=await import('../js/games/iron-squad/save-slots.js');
const c=WORLD_SIZE/2,F=83000,game=Object.create(IronSquadGame);game.container=document.getElementById('game');
Object.assign(game,{width:390,height:664,zoom:1,ctx,camera:{x:c,y:c},selectedSaleIds:new Set(),commandActiveUntil:0,joystick:{active:false,dirX:0,dirY:0}});
for(const k of ['startGameLoop','showToast','spawnSparks','spawnDamageText'])game[k]=noop;
game.setupUI();game.activeSlotId=saveSlots.create('CLASS BALANCE TEST ONLY').id;game.startFreshGame(false);
const original=structuredClone(game.saveGame());
const tpl=cls=>structuredClone(original.squad.find(s=>s.soldierClass===cls));
// Class numbers.
assert.equal(SOLDIER_CLASSES.HEAVY.bonusHp,120);assert.equal(SOLDIER_CLASSES.HEAVY.bonusDef,60);assert.equal(SOLDIER_SPEAR_DMG_MULT,1.15);assert.equal(SOLDIER_HAMMER_DMG_MULT,1.35);
function field(){game.resumeSavedGame(structuredClone(original));game.closeStrategyModal();Object.assign(game.player,{x:F,y:F,atkCooldown:100,speed:0,isAdvanced:false});game.camera={x:F,y:F};game.squad=[];game.reserves=[];game.monsters=[];game.outposts=[];game.merchants=[];game.dungeons=[];game.civilians=[];game.projectiles=[];game.dropsOnField=[];game.magicBursts=[];game.magicReserve=0;game.updateSpawns=noop;game.currentQuest=null;game.restTimer=0;game.rankIndex=2;game.recalcPlayerStats();game.joystick={active:false,dirX:0,dirY:0};game._hazardClock=0;game.worldTerrain={tiles:new Map()};game.currentDungeon=null;game.invasions.stage='idle';game.baseRaidActive=false;}
const dummy=(x,y)=>({type:'goblin',x,y,hp:1e9,maxHp:1e9,atk:0,def:0,radius:12,speed:0,atkTimer:100});
function recordedAttack(cls,style,traits){
  field();const u={...tpl(cls),x:F,y:F,isPersonalGuard:true,speed:0,atkCooldown:0,_pgTick:3};
  u.equipped.weapon={...u.equipped.weapon,weaponStyle:style,weaponTraits:traits};u.weapon=u.equipped.weapon;game.recalcSoldierStats(u);u.hp=u.maxHp;
  game.squad=[u];game.monsters=[dummy(u.x+25,u.y)];const calls=[];game.performAttack=(a,m,p,atk)=>calls.push(atk);
  for(let i=0;i<3&&!calls.length;i++)game.update(.1);delete game.performAttack;return {u,atk:calls[0]};
}
const comp=(u,k)=>Math.round(Math.round(u.atk*SOLDIER_PHYS_DMG_MULT)*k);
// 1. Weapon ATK is counted once (soldier.atk already contains it).
{const {u,atk}=recordedAttack('LIGHT','sword');assert.ok(u.equipped.weapon.stats.atk>0);assert.equal(atk,Math.round(u.atk*SOLDIER_PHYS_DMG_MULT),'no second weapon ATK add');}
// 2. Slow weapons get compensation on both soldier paths.
{const {u,atk}=recordedAttack('HEAVY','spear');assert.equal(atk,comp(u,1.15));}
{const {u,atk}=recordedAttack('HEAVY','hammer');assert.equal(atk,comp(u,1.35));}
{const {u,atk}=recordedAttack('HEAVY','hammer',{length:1,attackTempo:1,crit:0});assert.equal(atk,comp(u,1.35),'new-weapon path uses the same compensation');}
// 3. Soldier crit: s.crit applies once; mage spells do not crit.
function hit(u){game.monsters=[dummy(F+25,F)];const m=game.monsters[0];game.performAttack(u,m,false,100,false);return 1e9-m.hp;}
{field();const light={...tpl('LIGHT'),x:F,y:F};game.recalcSoldierStats(light);
 light.crit=100;assert.equal(hit(light),220);light.crit=0;assert.equal(hit(light),100);
 game.recalcSoldierStats(light);const expectCrit=light.crit;assert.ok(expectCrit>=35);let crits=0;const N=4000,real=Math.random;let s=7;Math.random=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};for(let i=0;i<N;i++)if(hit(light)>100)crits++;Math.random=real;assert.ok(Math.abs(crits/N-expectCrit/100)<.03,'crit chance equals s.crit (equipment crit not double-counted)');
 const mageU={...tpl('MAGE'),x:F,y:F,crit:100};assert.equal(hit(mageU),100,'mage spells never gain soldier crit');
 const l=tpl('LIGHT'),h=tpl('HEAVY');l.talent=h.talent='AVERAGE';game.recalcSoldierStats(l);game.recalcSoldierStats(h);assert.equal(l.crit-h.crit,SOLDIER_CLASSES.LIGHT.bonusCrit,'class bonusCrit reaches s.crit');}
// 4. Base medics: weak self-defence only when nobody needs healing, never at the cost of healing mana.
function medicRun(setup){field();const m={...game.createNewSoldier(null,{classKey:'MEDIC',talent:'AVERAGE',attributeProfile:rollAttributeProfile('MEDIC','AVERAGE',()=>.5,true)}),x:F,y:F,isPersonalGuard:true,speed:0,atkCooldown:0,_pgTick:3};m.attributeProfile=rollAttributeProfile('MEDIC','AVERAGE',()=>.5,true);m._attributesNormalized=false;game.recalcSoldierStats(m);m.hp=m.maxHp;const allies=setup(m)||[];game.squad=[m,...allies];game.monsters=[dummy(m.x+60,m.y)];game.projectiles=[];game.update(.05);return {m,smite:game.projectiles.find(p=>p.type==='SMITE'),heal:game.projectiles.find(p=>p.type==='HEAL')};}
{let castPower;const {m,smite}=medicRun(m=>{m.mana=100;castPower=m.magicAttack;});assert.ok(smite,'idle medic fires a self-defence bolt');assert.equal(smite.damage,castPower);assert.equal(smite.noSplash,true);assert.equal(Math.round(m.mana),90);}
{const {smite,m}=medicRun(m=>{m.mana=30;});assert.ok(!smite&&m.mana>=30,'reserve mana kept for healing');}
{const {smite,heal}=medicRun(m=>{m.mana=100;const ally={...tpl('HEAVY'),x:m.x+20,y:m.y,isPersonalGuard:true,speed:0,atkCooldown:100,_pgTick:3};game.recalcSoldierStats(ally);ally.hp=Math.floor(ally.maxHp*.3);return [ally];});assert.ok(heal&&!smite,'healing stays the priority');}
// 5. HQ mana: full refill normally; reduced regen only during defence battles at HQ (regular + major invasions + random raids).
function manaAfter(cls,place,flags){field();Object.assign(game,flags.game||{});if(flags.stage)game.invasions.stage=flags.stage;const u={...tpl(cls),x:place.x,y:place.y,isPersonalGuard:true,speed:0};game.recalcSoldierStats(u);u.mana=10;u.magicRecovering=false;game.squad=[u];game._manaSupplyClock=0;
  for(let i=0;i<10;i++)updateMagic(game,.05,supplyLocation);return u;}
assert.equal(HQ_DEFENSE_MANA_REGEN,3);
{const u=manaAfter('MAGE',{x:c,y:c},{});assert.equal(u.mana,u.maxMana,'normal play: full refill unchanged');}
{const u=manaAfter('MAGE',{x:c,y:c},{stage:'marching'});assert.equal(u.mana,u.maxMana,'marching is not yet a battle');}
for(const [name,flags] of [['invasion battle (regular/major)',{stage:'battle'}],['random raid',{game:{baseRaidActive:true}}]]){
  const u=manaAfter('MAGE',{x:c,y:c},flags);assert.ok(u.mana<u.maxMana*.5,`${name}: no instant refill (${u.mana})`);assert.ok(u.mana>10,`${name}: but regeneration near HQ is strong (${u.mana})`);
  const md=manaAfter('MEDIC',{x:c,y:c},flags);assert.equal(md.mana,md.maxMana,`${name}: medics keep full refill`);
  assert.ok(manaAfter('MAGE',{x:F,y:F},flags).mana<20,'away from supply nothing changes');
}
assert.equal(isDefenseBattle({invasions:{stage:'idle'},baseRaidActive:false}),false);
console.log('PASS: weapon ATK single-counted, spear/hammer compensation on both paths, soldier crit, base medic self-defence priority, defence-only HQ mana regen');
dom.window.close();
