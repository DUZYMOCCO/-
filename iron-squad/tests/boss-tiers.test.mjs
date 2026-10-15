import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {enemyTier,rollBossTreasure,upperBoss,bossCriticalBonus,finalCriticalChance} from '../js/enemy-tier.js';
import {levelGrowthSteps,levelDefenseGrowth} from '../js/level-growth.js';
import {majorReference,majorInvasionStrength,regularInvasionStrength,invasionMethods} from '../js/invasion-rules.js';
const dom=new JSDOM('<div id="game"></div>',{url:'http://localhost/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame,applyUpgradeStats}=await import('../js/index.js');
const {saveSlots}=await import('../js/save-slots.js');
const g=Object.create(IronSquadGame);Object.assign(g,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0});
for(const key of ['startGameLoop','showToast','spawnDamageText','spawnSparks'])g[key]=noop;
g.setupUI();g.activeSlotId=saveSlots.create('BOSS TIERS TEST ONLY').id;g.startFreshGame(false);g.closeStrategyModal();g.currentQuest=null;
for(const m of [{type:'dragon',isBoss:true},{type:'colossal_dragon',isColossal:true},{isBoss:true,isInvasionCommander:true}]){
 assert.equal(enemyTier(m),'midboss');assert.deepEqual(rollBossTreasure(g,m,()=>0),{orbs:0,gems:0,first:false});
 for(const player of [true,false]){
  const u=player?g.player:g.createNewSoldier(null,{classKey:'LIGHT',talent:'AVERAGE'});u.reqExp=1e30;
  const before={boss:u.bossKills||0,minion:u.minionKills||0,mid:u.midbossKills||0};
  const monster={...m,x:80000,y:80000,lootDistance:6000,hp:0,maxHp:100,atk:1};g.monsters=[monster];g.dropsOnField=[];g.killMonster(monster,u,player);
  assert.equal(u.bossKills||0,before.boss);assert.equal(u.minionKills||0,before.minion);assert.equal(u.midbossKills,before.mid+1);
  assert.ok(g.dropsOnField.every(d=>!['ORB','GEM'].includes(d.item?.type)));
 }
}
const def=g.dungeons.find(d=>d.id==='dungeon_catacombs'),boss=g.createDungeonBoss(def.boss,200,200,def);
assert.equal(enemyTier(boss),'boss');assert.equal(upperBoss(boss),true);
g.monsters=[boss];g.dropsOnField=[];const kills=g.player.bossKills||0;g.killMonster(boss,g.player,true);
assert.equal(g.player.bossKills,kills+1);assert.equal(g.dropsOnField.filter(d=>d.item?.type==='ORB').length,1);assert.equal(g.dropsOnField.filter(d=>d.item?.type==='GEM').length,1);
assert.deepEqual(rollBossTreasure(g,boss,()=>0),{orbs:0,gems:0,first:false});
assert.deepEqual(rollBossTreasure(g,g.createDungeonBoss(def.boss,200,200,def),()=>.999),{orbs:0,gems:0,first:false});
g.resumeSavedGame(structuredClone(g.saveGame({persist:false})));assert.equal(g.dungeons.find(d=>d.id===def.id).bossDefeats,2,'first guarantees survive save and room reset');
assert.equal(enemyTier({isDungeonBoss:true,isBoss:false,isElite:true}),'boss','unique ruin guardian keeps its old visual flags');
assert.equal(bossCriticalBonus(10000),30);assert.equal(finalCriticalChance(90,14),75);assert.equal(finalCriticalChance(40,14),54);
for(const tier of [1,4,13,20,28]){
 const w={type:'WEAPON',tier,name:'検証',weaponStyle:'sword',rollMult:1.35,weaponTraits:{crit:8},stats:{}};applyUpgradeStats(w,50);assert.ok((w.stats.crit||0)<=30);
}
assert.equal(levelGrowthSteps(10),9);assert.equal(levelGrowthSteps(30),37.4);assert.equal(levelDefenseGrowth(10),0);
assert.ok(levelGrowthSteps(80)-levelGrowthSteps(79)>levelGrowthSteps(50)-levelGrowthSteps(49));
// Compare real generated armies at the same stage, including flanking troops.
for(const level of [8,18,100]){
 const raw={hp:1000*level,atk:100*level,def:30,level,heroHp:1000,heroDef:100};
 const spawn=kind=>{const game={monsters:[],invasions:{stage:'marching',kind,sequence:1,strength:kind==='major'?majorInvasionStrength(majorReference(raw)):regularInvasionStrength(raw)},showToast:noop,refreshInvasionUI:noop,saveGame:noop};invasionMethods.arriveDemonInvasion.call(game);return game.monsters;};
 const regular=spawn('regular'),major=spawn('major');assert.equal(regular.length,28);assert.equal(major.length,36);
 assert.ok(major[1].maxHp>=regular[1].maxHp*1.5);assert.ok(major[1].atk>=regular[1].atk*1.5);
 assert.ok(major[4].maxHp>=regular[4].maxHp*1.5);assert.ok(major[4].atk>=regular[4].atk*1.5);
 assert.ok(major[0].maxHp>major[1].maxHp&&major[6].atk>major[1].atk);
}
// Exercise the actual hit roll after a sweet-spot bonus, on both commander and soldier.
const savedRandom=Math.random;g.restTimer=0;g.equipped={};g.player.crit=100;
try{for(const player of [true,false]){
 const u=player?g.player:g.createNewSoldier(null,{classKey:'LIGHT',talent:'AVERAGE'});u.crit=100;u.equipped={};u.weapon=null;u.x=80000;u.y=80000;
 for(const [roll,expected] of [[.8,116],[.7,255]]){
  const m={type:'goblin',x:80010,y:80000,hp:10000,maxHp:10000,def:0,atk:1,radius:10};g.monsters=[m];Math.random=()=>roll;g.performAttack(u,m,player,100,44.2);assert.equal(10000-m.hp,expected,'final 75% ceiling is active in real damage');
 }
}}finally{Math.random=savedRandom;}
console.log('PASS: shared enemy tier, field rewards excluded, guaranteed first treasures/saved repeat history, crit caps, fixed growth and stronger dynamic major invasion');
g.destroy();dom.window.close();
