// Deployment/crowd contract: d7c6da8 (v1.24.2), 48 active soldiers and 40 enemies; overflow remains saved.
import assert from 'node:assert/strict';
import {saveSlots} from '../js/games/iron-squad/save-slots.js';
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
globalThis.window={};globalThis.document={getElementById:()=>null};
const {IronSquadGame,RANKS,DEPLOYMENT_CAPACITY,ENEMY_LIMIT,ENEMY_SPAWN_INTERVAL}=await import('../js/games/iron-squad/index.js');
const game=Object.create(IronSquadGame);
for(const method of ['recalcSoldierStats','recalcPlayerStats','updateStatsUI','updateQuestUI','startGameLoop','showToast'])game[method]=()=>{};
game.activeSlotId=saveSlots.create('人数検証').id;game.startFreshGame(false);
assert.equal(DEPLOYMENT_CAPACITY,48);assert.ok(RANKS.every(rank=>rank.maxSquad===DEPLOYMENT_CAPACITY));
assert.equal(game.squad.length,DEPLOYMENT_CAPACITY);assert.equal(ENEMY_LIMIT,40);assert.equal(game.monsters.length,ENEMY_LIMIT);
assert.ok(game.monsters.some(m=>m.zoneId==='ZONE_PEACE'),'new games populate nearby encounters');
assert.ok(game.monsters.every(m=>m.hp>0&&m.zoneId),'initial crowd contains actual regional enemies');
// A formerly larger detachment is preserved as active plus reserve members.
while(game.squad.length<DEPLOYMENT_CAPACITY+15)game.squad.push(game.createNewSoldier());game.rankIndex=8;
const ids=new Set(game.squad.map(s=>s.id));game.saveGame();game.resumeSavedGame(saveSlots.get(game.activeSlotId).data);
assert.equal(game.squad.length,DEPLOYMENT_CAPACITY);assert.equal(game.reserves.length,15);
assert.deepEqual(new Set([...game.squad,...game.reserves].map(s=>s.id)),ids);
// Existing under-capacity saves deploy their waiting soldiers, without resetting progress.
game.reserves=game.squad.splice(DEPLOYMENT_CAPACITY-4,4).concat(game.reserves.slice(0,2));game.phaseTimer=53;game.saveGame();
game.resumeSavedGame(saveSlots.get(game.activeSlotId).data);assert.equal(game.squad.length,DEPLOYMENT_CAPACITY);assert.equal(game.reserves.length,2);assert.equal(game.phaseTimer,53);
game.monsters=[];game.colossalBossRespawnTimer=999;game.spawnTimer=0;
game.updateSpawns(ENEMY_SPAWN_INTERVAL-.01);assert.equal(game.monsters.length,0);
game.updateSpawns(.02);assert.equal(game.monsters.length,1);
// The cap includes bosses, and a pending boss waits until there is room.
game.monsters=Array.from({length:ENEMY_LIMIT},()=>({x:game.player.x,y:game.player.y,hp:10,isBoss:false}));game.colossalBossRespawnTimer=0;
game.updateSpawns(1);assert.equal(game.monsters.length,ENEMY_LIMIT);assert.ok(game.monsters.every(m=>!m.isColossal));
game.spawnMonster(game.player.x+50,game.player.y);game.spawnColossalBoss();assert.equal(game.monsters.length,ENEMY_LIMIT);
game.monsters.pop();game.updateSpawns(.01);assert.equal(game.monsters.length,ENEMY_LIMIT);assert.ok(game.monsters.some(m=>m.isColossal));
game.restTimer=10;game.monsters=[];game.updateSpawns(100);assert.equal(game.monsters.length,0);
console.log('PASS: fixed 48-person deployment, preserved overflow and save progress, 40 initial enemies, faster repopulation, 40-enemy cap including bosses, safe rest');
