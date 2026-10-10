import assert from 'node:assert/strict';
import {FIELD_DROP_LIFETIME,addFieldDrop,ageFieldDrops} from '../js/field-drops.js';
import {WORLD_SIZE} from '../js/world.js';
import {saveSlots} from '../js/save-slots.js';

const memory=new Map(),noop=()=>{};
globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
globalThis.window={};globalThis.document={getElementById:()=>null};
const {IronSquadGame,applyUpgradeStats}=await import('../js/index.js');
const gear=id=>{const item={id,name:id,type:'HELMET',tier:1,stats:{}};applyUpgradeStats(item,0);return item;};

// All ground-loot kinds expire together, including rare boss rewards.
const state={dropsOnField:[]},kinds=[{item:gear('gear')},{isBoss:true,item:gear('boss')},
  {isOrb:true,item:{id:'orb',type:'ORB'}},{isOrb:true,item:{id:'gem',type:'GEM'}},
  {isAmmo:true,ammo:3},{isMagicStone:true,mana:20}];
for(const drop of kinds)addFieldDrop(state,drop);
const original=state.dropsOnField;
ageFieldDrops(state,59);assert.equal(original.length,6);assert.ok(original.every(d=>d.remainingLife===1));
ageFieldDrops(state,1);assert.equal(original.length,0);assert.equal(state.dropsOnField,original);

// Staggered arrivals keep their own remaining time and pickup order.
addFieldDrop(state,{item:gear('old')});ageFieldDrops(state,30);
const young=addFieldDrop(state,{item:gear('young')});ageFieldDrops(state,30);
assert.deepEqual(state.dropsOnField,[young]);assert.equal(young.remainingLife,30);
for(const dt of [0,-1,NaN,Infinity])ageFieldDrops(state,dt);
assert.equal(young.remainingLife,30);
state.savedFieldDrops=state.dropsOnField;ageFieldDrops(state,1);assert.equal(young.remainingLife,29,'aliased field lists do not age twice');

// A large abandoned field is removed in place without disturbing fresh loot.
state.savedFieldDrops=null;state.dropsOnField=Array.from({length:5000},(_,i)=>({item:gear(`old-${i}`),remainingLife:1}));
const fresh=addFieldDrop(state,{item:gear('fresh')});const large=state.dropsOnField;
ageFieldDrops(state,1);assert.equal(state.dropsOnField,large);assert.deepEqual(large,[fresh]);

const game=Object.create(IronSquadGame);
game.joystick={active:false,dirX:0,dirY:0};game.width=390;game.height=664;game.zoom=1;
for(const method of ['updateStatsUI','updateQuestUI','startGameLoop','showToast','spawnSparks','spawnDamageText','renderStrategyUI'])game[method]=noop;
game.activeSlotId=saveSlots.create('drop lifetime').id;
const reset=()=>{
  game.startFreshGame(false);game.updateSpawns=noop;game.monsters=[];game.squad=[];game.reserves=[];
  game.civilians=[];game.merchants=[];game.gateGuards=[];game.gold=0;
};
reset();
const center=WORLD_SIZE/2;

// Use the actual update: expired loot disappears before player pickup.
const expired=gear('expired'),expiredDrop=addFieldDrop(game,{x:game.player.x,y:game.player.y,item:expired});
expiredDrop.remainingLife=.25;const before=game.inventory.length;
game.update(.25);assert.equal(game.dropsOnField.length,0);assert.equal(game.inventory.length,before);
const collectible=gear('collectible');addFieldDrop(game,{x:game.player.x,y:game.player.y,item:collectible});
game.update(.25);assert.ok(game.inventory.some(i=>i.id===collectible.id));assert.equal(game.dropsOnField.length,0);
game.update(60);assert.ok(game.inventory.some(i=>i.id===collectible.id),'picked-up items do not expire');

// Pause freezes the timer; active rest advances it despite the early return.
reset();const pauseDrop=addFieldDrop(game,{x:center+2000,y:center,item:gear('paused')});
game.inBattle=false;game.update(120);assert.equal(pauseDrop.remainingLife,FIELD_DROP_LIFETIME);
game.inBattle=true;game.restTimer=8;game.restUpgradeClock=0;
pauseDrop.remainingLife=1;game.update(1);assert.equal(game.restTimer,7);assert.equal(game.dropsOnField.length,0);

// Outdoor loot ages while the commander is in a dungeon and stays gone on exit.
reset();const outside=addFieldDrop(game,{x:center+2000,y:center,item:gear('outside')});
game.enterDungeon({...game.dungeons.find(d=>d.kind==='dungeon'),mobCount:0,eliteCount:0,boss:null});
assert.equal(game.savedFieldDrops[0],outside);
const inside=addFieldDrop(game,{x:1000,y:800,item:gear('inside')});
outside.remainingLife=1;inside.remainingLife=2;game.restTimer=8;game.restUpgradeClock=0;
game.update(1);assert.equal(game.savedFieldDrops.length,0);assert.equal(inside.remainingLife,1);
game.exitDungeon();assert.equal(game.dropsOnField.length,0);

// Real producers stamp the lifetime immediately, before any update occurs.
reset();game.clearOutpost(game.outposts.find(o=>o.type==='FORT'));
assert.equal(game.dropsOnField.length,3);assert.ok(game.dropsOnField.every(d=>d.remainingLife===60));
game.dropsOnField=[];game.baseRaidActive=true;game.completeBaseRaid(true);
assert.equal(game.dropsOnField.length,2);assert.ok(game.dropsOnField.every(d=>d.remainingLife===60));
reset();const random=Math.random;
try{
  Math.random=()=>.1;
  game.killMonster({x:center+100,y:center,hp:0,maxHp:100,atk:1,type:'dragon',isBoss:true,color:'#fff',lootDistance:100},game.player,true);
}finally{Math.random=random;}
assert.ok(game.dropsOnField.some(d=>d.item));assert.ok(game.dropsOnField.some(d=>d.isAmmo));
assert.ok(game.dropsOnField.some(d=>d.isMagicStone));assert.ok(game.dropsOnField.every(d=>d.remainingLife===60));

console.log('PASS: 60-second ground loot, all types, staggered drops, in-place mass expiry, pickup boundary, pause/rest, hidden outdoor field, actual loot producers');
