import assert from 'node:assert/strict';
import {test} from 'node:test';
import {beginFollowerRecovery,noteFollowerIntent,suspendFollowerRecovery,finishFollowerRecovery,followerLanding,FOLLOW_RECOVERY} from '../js/follower-recovery.js?v=251';
import {WORLD_SIZE} from '../js/world.js';
import {wallBlocksAttack} from '../js/gate-rules.js';
import {headquartersBuildingBlocks} from '../js/hq-facilities.js';
import {dungeonBlocks} from '../js/dungeon.js';
import {explorationLayout} from '../js/dungeon-layout.js';
import {economicFieldBlocked} from '../js/regional-economy.js';
const C=WORLD_SIZE/2,DT=.05;
function fixture() {
 const player={id:'player',x:C,y:C,hp:100,maxHp:100},u={id:'guard',x:C+600,y:C,hp:60,maxHp:100,mana:23,ammo:7,speed:90,isPersonalGuard:true,atkCooldown:2,equipped:{weapon:{id:'keep-weapon'}}};
 return {followerWallBlocked(a,b){return wallBlocksAttack(this,a,b);},inBattle:true,player,squad:[u],reserves:[],civilians:[],gateGuards:[],u};
}
function frame(g,{intent=true,suspend=false,move=0,goal=g.player}={}) {
 beginFollowerRecovery(g);if(intent)noteFollowerIntent(g,g.u,goal);if(suspend)suspendFollowerRecovery(g,g.u);
 g.u.y+=move;return finishFollowerRecovery(g,DT);
}

test('8 seconds of stalled following returns a living guard without healing, resources or equipment changes',()=>{
 const g=fixture(),before=structuredClone(g.u);
 for(let i=0;i<159;i++)assert.equal(frame(g).length,0);assert.equal(g.u.x,before.x);
 assert.deepEqual(frame(g),[g.u]);assert.ok(Math.hypot(g.u.x-C,g.u.y-C)<=100);
 for(const key of ['hp','maxHp','mana','ammo','speed','atkCooldown','equipped'])assert.deepEqual(g.u[key],before[key]);
 assert.equal(g.u._openX,g.u.x);assert.equal(g.u._wallX,g.u.x);assert.equal(g.u.regrouping,false);
 for(let i=0;i<400;i++)assert.equal(frame(g).length,0,'no repeated warp after rejoining');
});

test('normal detours, intentional holds and unrelated soldiers never accumulate a recovery',()=>{
 const g=fixture();for(let i=0;i<400;i++)assert.equal(frame(g,{move:3}).length,0,'progress resets the timer even if walking away along a detour');
 for(const patch of [{isPersonalGuard:false},{heroPartyId:'hero-party'},{isDown:true,hp:0},{dead:true},{magicRecovering:true},{campPose:'sit'},{farmPose:'work'},{speed:0},{carrierId:'player'}]) {
  const h=fixture();Object.assign(h.u,patch);const xy=[h.u.x,h.u.y];for(let i=0;i<200;i++)assert.equal(frame(h).length,0);assert.deepEqual([h.u.x,h.u.y],xy);
 }
 for(const options of [{intent:false},{goal:{x:C+900,y:C}},{goal:null},{suspend:true}]) {
  const h=fixture();for(let i=0;i<200;i++)assert.equal(frame(h,options).length,0);
 }
 for(const field of ['isDown','dead']){const h=fixture();h.player[field]=true;for(let i=0;i<200;i++)assert.equal(frame(h).length,0);}
});

test('rescue, carrying, meditation and breaks discard stale blocked time; menu time does not count',()=>{
 for(const kind of ['rescue','carry','meditate','break']) {
  const g=fixture();for(let i=0;i<150;i++)frame(g);
  if(kind==='rescue')g._medicRescueAssign=new Map([[g.u.id,{isDown:true}]]);
  if(kind==='carry')g.civilians=[{id:'patient',carrierId:g.u.id,x:g.u.x,y:g.u.y,hp:1}];
  if(kind==='meditate')g.u.magicRecovering=true;
  frame(g,{intent:kind!=='break'});g._medicRescueAssign=null;g.civilians=[];g.u.magicRecovering=false;
  for(let i=0;i<159;i++)assert.equal(frame(g).length,0);assert.equal(frame(g).length,1);
 }
 const g=fixture();for(let i=0;i<100;i++)frame(g);g.inBattle=false;
 for(let i=0;i<1000;i++)assert.equal(finishFollowerRecovery(g,DT).length,0);
 g.inBattle=true;for(let i=0;i<59;i++)assert.equal(frame(g).length,0);assert.equal(frame(g).length,1);
});

test('landing stays off buildings and walls, on dungeon floor, and does not overlap another recovered guard',()=>{
 const g=fixture();g.player={...g.player,x:C+285,y:C-155};const a=followerLanding(g,g.u);assert.ok(a);assert.equal(headquartersBuildingBlocks(a.x,a.y),false);assert.equal(economicFieldBlocked(g,a.x,a.y),false);assert.equal(wallBlocksAttack(g,g.player,a),false);
 const other={...g.u,id:'other',...a};g.squad.push(other);const b=followerLanding(g,g.u);assert.ok(b);assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>=22);
 g.currentDungeon={id:'floor-test',kind:'dungeon',width:2600,height:1500};Object.assign(g.player,explorationLayout(g.currentDungeon).branches[0]);
 const floor=followerLanding(g,g.u);assert.ok(floor);assert.equal(dungeonBlocks(g.currentDungeon,floor.x,floor.y),false);
 g.currentDungeon={id:'tiny',kind:'town',width:20,height:20};Object.assign(g.player,{x:10,y:10});assert.equal(followerLanding(g,g.u),null);
 const xy=[g.u.x,g.u.y];for(let i=0;i<200;i++)assert.equal(frame(g).length,0);assert.deepEqual([g.u.x,g.u.y],xy,'no unsafe fallback to a wall or the commander coordinate');
});

test('map changes and a replaced commander reset timers; two games never share a timer',()=>{
 const g=fixture();for(let i=0;i<150;i++)frame(g);g.player={...g.player};
 for(let i=0;i<159;i++)assert.equal(frame(g).length,0);assert.equal(frame(g).length,1);
 const h=fixture();for(let i=0;i<150;i++)frame(h);h.currentDungeon={id:'room',kind:'town',width:2000,height:1500};Object.assign(h.player,{x:500,y:600});Object.assign(h.u,{x:1200,y:600});
 for(let i=0;i<159;i++)assert.equal(frame(h).length,0);assert.equal(frame(h).length,1);
 const first=fixture(),second=fixture();for(let i=0;i<150;i++)frame(first);for(let i=0;i<159;i++)assert.equal(frame(second).length,0);assert.equal(frame(second).length,1);
 assert.equal(FOLLOW_RECOVERY.seconds,8);
});

test('the real ninja AI repeatedly blocked by the guild returns via the real update loop, without warp training or reviving casualties',async()=>{
 const memory=new Map(),noop=()=>{};globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
 globalThis.window={};globalThis.document={getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[]};
 const {IronSquadGame}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js');
 const g=Object.create(IronSquadGame);Object.assign(g,{width:390,height:844,zoom:1,joystick:{active:true,dirX:0,dirY:0},selectedSaleIds:new Set(),commandActiveUntil:0});
 for(const name of ['startGameLoop','updateStatsUI','updateQuestUI','renderStrategyUI','showToast','spawnSparks','spawnDamageText','refreshSupplyUI','refreshMagicUI','refreshInvasionUI'])g[name]=noop;
 g.activeSlotId=saveSlots.create('FOLLOWER RECOVERY TEST ONLY').id;g.startFreshGame(false);g.updateSpawns=noop;g.phaseTimer=100000;
 g.monsters=[];g.reserves=[];g.civilians=[];g.gateGuards=[];g.merchants=[];g.dropsOnField=[];g.currentQuest=null;
 const {createLimitedAlly}=await import('../js/limited-allies.js?v=251');const ninja=createLimitedAlly(g,'NINJA','recovery-test');
 Object.assign(ninja,{isPersonalGuard:true,x:C+95,y:C-130,atkCooldown:100000,_guardSlot:0});g.squad=[ninja];
 Object.assign(g.player,{x:C+285,y:C-155,atkCooldown:100000,powerAtkCooldown:100000});g.camera={x:g.player.x,y:g.player.y};g.joystick={active:true,dirX:0,dirY:0};
 assert.equal(g.passesWalls(ninja),false);let largest=0,warpedAt=null,walkBeforeWarp=0;const trace=[];
 for(let i=0;i<240;i++) {
  const old={x:ninja.x,y:ninja.y,travel:ninja.attributeProfile.practice.travel||0};g.update(DT);const moved=Math.hypot(ninja.x-old.x,ninja.y-old.y);if(i%20===0)trace.push([i,ninja.x-C,ninja.y-C,ninja.soldierClass,ninja.campPose,g.inBattle,g.player.x-C,g.player.y-C]);largest=Math.max(largest,moved);
  assert.equal(headquartersBuildingBlocks(ninja.x,ninja.y),false);
  if(moved>100){warpedAt=(i+1)*DT;walkBeforeWarp=old.travel;assert.equal(ninja.attributeProfile.practice.travel||0,walkBeforeWarp,'teleport is not walking practice');break;}
 }
 assert.ok(warpedAt>=8&&warpedAt<10,`actual collision must lead to recovery: ${warpedAt}; ${JSON.stringify(trace)}`);assert.ok(largest>100);assert.ok(Math.hypot(ninja.x-g.player.x,ninja.y-g.player.y)<=100);
 const saved=structuredClone(g.saveGame());assert.ok(!Object.keys(saved.squad[0]).some(k=>/follow|recover/i.test(k)),'tracking is not persisted');
 g.resumeSavedGame(saved);assert.equal(g.squad[0].hp,ninja.hp);assert.deepEqual(g.squad[0].equipped,ninja.equipped);
});
