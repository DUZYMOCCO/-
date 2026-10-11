import assert from 'node:assert/strict';
import {DUNGEON_DEFS} from '../js/dungeon.js';
import {
  DUNGEON_RESET_PHASES,normalizeDungeonExploration,dungeonSideChests,updateDungeonSideChests,
  updateDungeonRespawns,dungeonCoolingDown,recordDungeonClear
} from '../js/dungeon-exploration.js';

const mine=DUNGEON_DEFS.find(d=>d.id==='dungeon_goblin_mines');
const ruin=DUNGEON_DEFS.find(d=>d.kind==='ruin');
const town=DUNGEON_DEFS.find(d=>d.kind==='town');
const castle=DUNGEON_DEFS.find(d=>d.id==='dungeon_demon_castle');
assert.equal(DUNGEON_RESET_PHASES,2);

function fixture(phase=10,defs=[mine]) {
  const game={phase,dungeons:defs.map(d=>({...d,cleared:false,clearedWave:0})),dungeonExploration:normalizeDungeonExploration(null),
    currentDungeon:null,player:{x:0,y:0,hp:100},items:[],saved:null,
    collectDrop(item){this.items.push(item);},
    saveGame(){this.saved=JSON.parse(JSON.stringify({phase:this.phase,dungeons:this.dungeons,dungeonExploration:this.dungeonExploration,items:this.items}));}};
  return game;
}
let sequence=0;
const createItem=()=>({id:`probe-loot-${++sequence}`,type:'HELMET',tier:1});
function openSide(game,index=0) {
  const chest=dungeonSideChests(game)[index];
  Object.assign(game.player,{x:chest.x,y:chest.y});updateDungeonSideChests(game,createItem);
}
function restore(game) {
  const data=JSON.parse(JSON.stringify(game.saved));
  const loaded=fixture(data.phase,data.dungeons);
  loaded.dungeons=data.dungeons;loaded.dungeonExploration=normalizeDungeonExploration(data.dungeonExploration);loaded.items=data.items;
  return loaded;
}

// Partial exploration starts its clock with the first actual opening, and immediately gives the item.
{
  const game=fixture();game.currentDungeon=game.dungeons[0];
  dungeonSideChests(game);assert.equal(game.dungeonExploration[mine.id].resetAt,0,'rendering/listing cannot start a timer');
  openSide(game);assert.equal(game.items.length,1);assert.deepEqual(game.dungeonExploration[mine.id],{opened:['north'],resetAt:12});
  openSide(game);assert.equal(game.items.length,1,'same visit cannot reopen a chest');
  game.phase=11;openSide(game,1);assert.equal(game.items.length,2);
  assert.equal(game.dungeonExploration[mine.id].resetAt,12,'second opening does not move the first deadline');
  game.currentDungeon=null;assert.equal(updateDungeonRespawns(game),0,'one phase is too early');
  assert.deepEqual(game.dungeonExploration[mine.id].opened,['north','south']);
  game.phase=12;assert.equal(updateDungeonRespawns(game),1,'exactly two phases expires partial chests');
  assert.deepEqual(game.dungeonExploration[mine.id],{opened:[],resetAt:0});
  assert.equal(game.dungeons[0].cleared,false,'partial exploration cannot mark a boss cleared');
  game.currentDungeon=game.dungeons[0];openSide(game);assert.equal(game.items.length,3);
  assert.equal(game.dungeonExploration[mine.id].resetAt,14,'next exploration gets its own timer');
}

// A saved partial opening survives reload and reentry, including its original deadline and item.
{
  const game=fixture(20);game.currentDungeon=game.dungeons[0];openSide(game);
  const loaded=restore(game);loaded.phase=21;loaded.currentDungeon=loaded.dungeons[0];
  openSide(loaded);assert.equal(loaded.items.length,1,'saved loot is never rerolled by immediate reentry');
  assert.equal(loaded.dungeonExploration[mine.id].resetAt,22);
  loaded.phase=22;assert.equal(updateDungeonRespawns(loaded),0,'deadline is deferred during exploration');
  assert.deepEqual(loaded.dungeonExploration[mine.id].opened,['north']);
  loaded.currentDungeon=null;assert.equal(updateDungeonRespawns(loaded),1,'the deferred reset applies after exit');
  loaded.currentDungeon=loaded.dungeons[0];openSide(loaded);assert.equal(loaded.items.length,2);
}

// Full completion gets two phases from the vault opening, even if the side-chest clock began earlier.
for(const def of [mine,ruin]) {
  const game=fixture(30,[def]);game.currentDungeon=game.dungeons[0];openSide(game);
  game.phase=31;const stale={...game.dungeons[0],cleared:false};recordDungeonClear(game,stale);
  assert.equal(game.dungeons[0].clearedPhase,31);assert.equal(game.dungeons[0].clearedWave,31);
  assert.equal(game.dungeonExploration[def.id].resetAt,33);
  assert.equal(dungeonCoolingDown(game,{...stale,cleared:false}),true,'the ID record wins over a stale entry definition');
  game.currentDungeon=null;game.phase=32;assert.equal(updateDungeonRespawns(game),0);
  assert.equal(dungeonCoolingDown(game,stale),true,'no boss regeneration in the next phase');
  game.saveGame();const loaded=restore(game);loaded.phase=33;loaded.currentDungeon=loaded.dungeons[0];
  assert.equal(updateDungeonRespawns(loaded),0,'a cleared room does not repopulate around its occupants');
  assert.equal(dungeonCoolingDown(loaded,stale),true);
  loaded.currentDungeon=null;assert.equal(updateDungeonRespawns(loaded),1);
  assert.equal(dungeonCoolingDown(loaded,stale),false,'the ID record also wins after expiry');
  assert.deepEqual(loaded.dungeonExploration[def.id],{opened:[],resetAt:0});
  assert.equal(updateDungeonRespawns(loaded),0,'an expired room resets only once');
}

// Legacy clearedWave saves work, while a newer clearedPhase takes precedence over stale wave metadata.
{
  const game=fixture(41);game.dungeons[0].cleared=true;game.dungeons[0].clearedWave=40;
  assert.equal(updateDungeonRespawns(game),0);game.phase=42;assert.equal(updateDungeonRespawns(game),1);
  Object.assign(game.dungeons[0],{cleared:true,clearedWave:1,clearedPhase:50});game.phase=51;
  assert.equal(updateDungeonRespawns(game),0);game.phase=52;assert.equal(updateDungeonRespawns(game),1);
  game.phase=undefined;game.wave=60;recordDungeonClear(game,game.dungeons[0]);
  assert.equal(game.dungeonExploration[mine.id].resetAt,62,'legacy wave-only callers use the same interval');
}

// Occupying one room postpones only that room, not other expired rooms.
{
  const game=fixture(72,[mine,ruin]);
  for(const d of game.dungeons){Object.assign(d,{cleared:true,clearedPhase:70});game.dungeonExploration[d.id]={opened:['north'],resetAt:72};}
  game.currentDungeon=game.dungeons[0];assert.equal(updateDungeonRespawns(game),1);
  assert.equal(game.dungeons[0].cleared,true);assert.equal(game.dungeons[1].cleared,false);
  game.currentDungeon=null;assert.equal(updateDungeonRespawns(game),1);assert.equal(game.dungeons[0].cleared,false);
}

// The demon castle never schedules a reset; both its completion and partial chest history are permanent.
{
  const game=fixture(80,[castle,town]);game.currentDungeon=game.dungeons[0];openSide(game);
  assert.equal(game.dungeonExploration[castle.id].resetAt,0);
  recordDungeonClear(game,game.dungeons[0]);game.saveGame();const loaded=restore(game);
  loaded.phase=1000;loaded.currentDungeon=null;
  // A legacy/future record with a timer still cannot bypass the explicit castle exception.
  loaded.dungeonExploration[castle.id].resetAt=82;
  Object.assign(loaded.dungeons[1],{cleared:true,clearedWave:1});
  loaded.dungeonExploration[town.id]={opened:['south'],resetAt:2};
  assert.equal(updateDungeonRespawns(loaded),0);
  assert.equal(loaded.dungeons[0].cleared,true);assert.equal(dungeonCoolingDown(loaded,castle),true);
  assert.deepEqual(loaded.dungeonExploration[castle.id].opened,['north']);
  assert.equal(loaded.dungeons[1].cleared,true);assert.deepEqual(loaded.dungeonExploration[town.id].opened,['south']);
  assert.equal(dungeonCoolingDown(loaded,town),false,'town visits do not use combat-room cooling');
  loaded.dungeons[0].cleared=false;assert.equal(updateDungeonRespawns(loaded),0,'partial castle loot also never resets');
  loaded.currentDungeon=loaded.dungeons[0];openSide(loaded);assert.equal(loaded.items.length,1);
}

// New timers survive normalization without mutating the source; older timerless saves remain valid.
{
  const raw={room:{opened:['north','north','invalid','south'],resetAt:'12.9'},old:{opened:['south']},bad:{opened:[],resetAt:Infinity},negative:{resetAt:-2}};
  const normalized=normalizeDungeonExploration(raw);
  assert.deepEqual(normalized.room,{opened:['north','south'],resetAt:12});
  assert.deepEqual(normalized.old,{opened:['south'],resetAt:0});
  assert.equal(normalized.bad.resetAt,0);assert.equal(normalized.negative.resetAt,0);
  assert.deepEqual(raw.room.opened,['north','north','invalid','south']);
  assert.equal(raw.room.resetAt,'12.9');assert.ok(Object.values(normalized).every(r=>Number.isInteger(r.resetAt)));
}

console.log('PASS: two-phase dungeon/ruin reset boundaries, saved partial/completed visits, delayed occupied rooms, legacy waves, id-authoritative cooling, permanent demon castle, immediate chest rewards');
