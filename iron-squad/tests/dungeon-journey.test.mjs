// Runtime journeys use the real update loop and temporary in-memory save slots.
// No browser storage, image artifacts, timers or exported gameplay stubs.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {WORLD_SIZE} from '../js/world.js';
import {explorationLayout,dungeonSteeringTarget} from '../js/dungeon-layout.js';
import {dungeonBlocks} from '../js/dungeon.js';
import {dungeonSideChests} from '../js/dungeon-exploration.js';
import {inCurrentInstance} from '../js/instance-rules.js';
import {saveSlots} from '../js/save-slots.js';

const memory=new Map(),noop=()=>{};
globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
globalThis.window={};
globalThis.document={getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[]};
const {IronSquadGame}=await import('../js/index.js');
const DT=.05,BASE_CLASSES=['HEAVY','LIGHT','ARCHER','MEDIC','MAGE'];

function fresh() {
 const game=Object.create(IronSquadGame);
 Object.assign(game,{width:375,height:640,zoom:1,joystick:{active:false,dirX:0,dirY:0},selectedSaleIds:new Set(),commandActiveUntil:0});
 // Only visual/UI scheduling is suppressed. Movement, physics, combat, rescue,
 // inventory, save serialization and instance participation remain real methods.
 for(const name of ['startGameLoop','updateStatsUI','updateQuestUI','renderStrategyUI','showToast','spawnSparks','spawnDamageText','refreshSupplyUI','refreshMagicUI','refreshInvasionUI'])game[name]=noop;
 game.activeSlotId=saveSlots.create('DUNGEON JOURNEY TEST ONLY').id;
 game.startFreshGame(false);
 game.updateSpawns=noop;game.monsters=[];game.squad=[];game.reserves=[];game.civilians=[];game.merchants=[];game.gateGuards=[];
 game.outposts=[];game.currentQuest=null;game.phaseTimer=100000;game.restTimer=0;game.rankIndex=8;game.commandActiveUntil=0;
 game.recalcPlayerStats();game.player.hp=game.player.maxHp;
 Object.assign(game.player,{isAdvanced:false,advancedClass:null,atkCooldown:100000,powerAtkCooldown:100000,isDown:false});
 return game;
}
function soldier(game,classKey,slot=0) {
 const s=game.createNewSoldier(null,{classKey,talent:'AVERAGE'});
 Object.assign(s,{isPersonalGuard:true,_guardSlot:slot,atkCooldown:100000,hp:s.maxHp,mana:s.maxMana,magicRecovering:false});
 assert.equal(game.passesWalls(s),false,'the journey checks basic soldiers, not wall-passing classes');
 return s;
}
function enterQuiet(game) {
 const original=game.dungeons.find(d=>d.id==='dungeon_goblin_mines');
 const dungeon={...original,boss:null,guardian:null,mobCount:0,eliteCount:0};
 game.enterDungeon(dungeon);game.camera={x:game.player.x,y:game.player.y};
 return dungeon;
}
function tick(game,units=[]) {
 game.camera={x:game.player.x,y:game.player.y};game.update(DT);
 assert.ok(game.currentDungeon,'the commander must remain inside for the journey');
 assert.ok(!dungeonBlocks(game.currentDungeon,game.player.x,game.player.y),'commander remains on walkable floor');
 for(const u of units)assert.ok(!dungeonBlocks(game.currentDungeon,u.x,u.y),`${u.soldierClass||u.type} stays on walkable floor`);
}
function walkCommander(game,target,guards=[]) {
 let frames=0;
 while(Math.hypot(game.player.x-target.x,game.player.y-target.y)>5&&frames++<2000){
  const goal=dungeonSteeringTarget(game.currentDungeon,game.player,target),dx=goal.x-game.player.x,dy=goal.y-game.player.y,d=Math.hypot(dx,dy);
  assert.ok(d>0,'commander waypoints advance toward the chosen room');
  const input=Math.min(1,d/(Math.max(1,game.player.speed)*DT));
  game.joystick={active:true,dirX:dx/d*input,dirY:dy/d*input};tick(game,guards);
 }
 game.joystick={active:false,dirX:0,dirY:0};
 assert.ok(frames<2000,'commander reaches the destination using actual joystick movement');
 // Heavy soldiers may lag behind a running commander. Let their own AI catch up.
 for(let i=0;i<500&&guards.some(s=>Math.hypot(s.x-game.player.x,s.y-game.player.y)>125);i++)tick(game,guards);
 for(const s of guards)assert.ok(Math.hypot(s.x-game.player.x,s.y-game.player.y)<=125,`${s.soldierClass} follows through the room portals`);
}

test('five basic guards follow the commander down the main aisle and both treasure spurs; the outdoor army stays outside',()=>{
 const game=fresh(),guards=BASE_CLASSES.map((k,i)=>soldier(game,k,i));
 const outdoor=soldier(game,'HEAVY');outdoor.isPersonalGuard=false;
 Object.assign(outdoor,{x:WORLD_SIZE/2+430,y:WORLD_SIZE/2-310});
 const fieldPosition={x:outdoor.x,y:outdoor.y};game.squad=[...guards,outdoor];
 const dungeon=enterQuiet(game),layout=explorationLayout(dungeon);
 assert.equal(game.passesWalls(game.player),false);
 assert.equal(inCurrentInstance(game,outdoor),false);
 assert.deepEqual({x:outdoor.x,y:outdoor.y},fieldPosition,'entry does not teleport the outdoor main force');
 for(const target of [{x:dungeon.width-450,y:dungeon.height/2},layout.branches[0],layout.branches[1],{x:300,y:dungeon.height/2}])walkCommander(game,target,guards);
 assert.deepEqual({x:outdoor.x,y:outdoor.y},fieldPosition,'real dungeon updates do not move the outdoor main force');
 game.exitDungeon();assert.equal(game.currentDungeon,null);
 assert.deepEqual({x:outdoor.x,y:outdoor.y},fieldPosition,'exit preserves its outdoor position');
 assert.ok(guards.every(s=>Math.hypot(s.x-game.player.x,s.y-game.player.y)<80),'only the actual companions return beside the commander');
});

test('side-chest opening is saved by the real slot serializer and cannot reward a second time after resume and reentry',()=>{
 const game=fresh(),dungeon=enterQuiet(game),layout=explorationLayout(dungeon),received=[];
 const realCollect=game.collectDrop;
 game.collectDrop=function(item,...args){received.push(item.id);return realCollect.call(this,item,...args);};
 Object.assign(game.player,layout.branches[0]);tick(game);
 assert.equal(received.length,1,'one real update delivers the northern chest reward');
 assert.equal(dungeonSideChests(game)[0].opened,true);
 tick(game);assert.equal(received.length,1);
 const persisted=saveSlots.get(game.activeSlotId).data;
 assert.deepEqual(persisted.dungeonExploration[dungeon.id].opened,['north']);
 assert.ok(persisted.inventory.some(item=>item.id===received[0])||persisted.sharedEquipBox.some(item=>item.id===received[0]),'the actual reward is saved, not only its opened flag');
 const snapshot=JSON.parse(JSON.stringify(persisted));
 game.resumeSavedGame(snapshot);
 assert.equal(game.currentDungeon,null,'an instance save safely resumes outdoors');
 assert.deepEqual(game.dungeonExploration[dungeon.id].opened,['north']);
 enterQuiet(game);Object.assign(game.player,layout.branches[0]);tick(game);
 assert.equal(received.length,1,'the northern box cannot reroll or pay twice after a real reload');
 Object.assign(game.player,layout.branches[1]);tick(game);
 assert.equal(received.length,2,'the independent southern box remains available');
 assert.deepEqual(new Set(game.dungeonExploration[dungeon.id].opened),new Set(['north','south']));
 tick(game);assert.equal(received.length,2);
});

for(const kind of ['goblin','goblin_archer'])test(`${kind} follows a player in a side room through the actual enemy movement loop`,()=>{
 const game=fresh(),dungeon=enterQuiet(game),layout=explorationLayout(dungeon);
 Object.assign(game.player,layout.branches[0]);game.player.hp=game.player.maxHp=100000;
 const enemy={id:`journey-${kind}`,type:kind,x:300,y:dungeon.height/2,hp:100000,maxHp:100000,atk:1,def:0,radius:12,speed:100,atkTimer:0,attackReach:24};
 if(kind==='goblin_archer')enemy.rangedKind=kind;
 game.monsters=[enemy];let hits=0,shot=false;
 const realDamage=game.damageTarget;
 game.damageTarget=function(target,...args){if(target===this.player)hits++;return realDamage.call(this,target,...args);};
 for(let i=0;i<700&&!hits;i++){tick(game,[enemy]);shot ||=game.projectiles.some(p=>p.type==='ENEMY_BOLT');}
 assert.ok(enemy.x>400,'the enemy travels through the connected front hall');
 assert.ok(hits>0,'the enemy reaches an unobstructed attack position and actually attacks');
 assert.equal(game.wallBlocksEnemyAttack(enemy,game.player),false,'the successful attack comes from the same accessible room/doorway');
 if(kind==='goblin_archer')assert.ok(shot,'the ranged enemy fires its actual projectile');
});

test('a basic medic reaches and revives a casualty across a hall and northern spur instead of stopping at the first portal',()=>{
 const game=fresh(),medic=soldier(game,'MEDIC'),wounded=soldier(game,'LIGHT',1);game.squad=[medic,wounded];
 const dungeon=enterQuiet(game),layout=explorationLayout(dungeon);
 Object.assign(game.player,{x:300,y:dungeon.height/2});Object.assign(medic,{x:300,y:dungeon.height/2});
 Object.assign(wounded,{...layout.branches[0],hp:0,isDown:true,downTimer:45,rescueProgress:0,downedInAid:false});
 for(let i=0;i<700&&wounded.isDown&&!wounded.dead;i++)tick(game,[medic,wounded]);
 assert.equal(wounded.dead,false,'the casualty is reached before rescue time expires');
 assert.equal(wounded.isDown,false,'the medic completes real in-place treatment');
 assert.ok(wounded.hp>0);assert.ok(medic.rescues>=1,'the actual healer receives rescue credit');
});

test('a guard carries the downed commander from a side room toward a medic through the hall portals',()=>{
 const game=fresh(),carrier=soldier(game,'HEAVY'),medic=soldier(game,'MEDIC',1);game.squad=[carrier,medic];
 const dungeon=enterQuiet(game),layout=explorationLayout(dungeon);
 Object.assign(game.player,layout.branches[0]);Object.assign(carrier,{x:game.player.x+18,y:game.player.y});Object.assign(medic,layout.branches[1]);
 const start={x:carrier.x,y:carrier.y};
 game.player.lethalGuardCooldown=100000;game.damageTarget(game.player,game.player.maxHp*5);
 assert.equal(game.player.isDown,true,'the real lethal damage transition creates a downed commander');
 let pickedUp=false;
 for(let i=0;i<900&&game.player.isDown;i++){tick(game,[carrier,medic]);pickedUp ||=game.player.carrierId===carrier.id;}
 assert.equal(pickedUp,true,'the guard actually attaches and carries the commander');
 assert.ok(Math.hypot(carrier.x-start.x,carrier.y-start.y)>100,'transport moves out of the side room toward the healer');
 assert.equal(game.player.isDown,false,'the carried commander meets the medic and is revived');
 assert.ok(game.player.hp>0);assert.ok(medic.rescues>=1);
 assert.equal(game.player.carrierId,undefined,'successful treatment releases the rope');
});
