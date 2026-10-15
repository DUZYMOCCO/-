// Ordinary enemies (including pack/formation members) never spawn inside camp or settlement peace zones.
import assert from 'node:assert/strict';
import {saveSlots} from '../js/save-slots.js';
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
globalThis.window={};globalThis.document={getElementById:()=>null};
const {IronSquadGame,ENEMY_LIMIT}=await import('../js/index.js');
const {peaceContainment,peaceBubbles}=await import('../js/peace-zones.js');
const game=Object.create(IronSquadGame);
for(const method of ['recalcSoldierStats','recalcPlayerStats','updateStatsUI','updateQuestUI','startGameLoop','showToast'])game[method]=()=>{};
game.activeSlotId=saveSlots.create('平和区域検証').id;
const bad=m=>!(m.isRaidMob||m.isBoss||m.isColossal)&&peaceContainment(m.x,m.y);
for(let i=0;i<150;i++){
  game.startFreshGame(false);
  assert.deepEqual(game.monsters.filter(bad).map(m=>[m.type,Math.round(m.x),Math.round(m.y)]),[],'initial crowd #'+i);
}
// Forced spawns just outside each settlement ring exercise pack and formation members near peace zones.
for(const b of peaceBubbles()){
  for(let i=0;i<60;i++){
    game.monsters=[];
    const ang=Math.random()*Math.PI*2,d=b.r+30+Math.random()*250,x=b.x+Math.cos(ang)*d,y=b.y+Math.sin(ang)*d;
    if(peaceContainment(x,y))continue; // overlapping neighbour bubble: callers never spawn there
    game.spawnMonster(x,y);
    assert.deepEqual(game.monsters.filter(bad).map(m=>[m.type,Math.round(m.x),Math.round(m.y)]),[],'spawn near '+b.id);
  }
}
// Respawn loop with the player wandering near settlements.
for(let i=0;i<300;i++){
  const b=peaceBubbles()[1+i%(peaceBubbles().length-1)],ang=Math.random()*Math.PI*2;
  game.player.x=b.x+Math.cos(ang)*(b.r+400);game.player.y=b.y+Math.sin(ang)*(b.r+400);
  game.monsters=game.monsters.slice(0,Math.floor(ENEMY_LIMIT/2));game.spawnTimer=99;game.updateSpawns(.1);
  assert.deepEqual(game.monsters.filter(bad).map(m=>[m.type,Math.round(m.x),Math.round(m.y)]),[],'respawn #'+i);
}
