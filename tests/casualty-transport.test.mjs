import assert from 'node:assert/strict';
import {carryingCapacity,carriedSoldiers,attachWounded,updateWounded,handleTransportAI,syncDragged,treatWounded,sanitizeCarriers,releaseWounded,orbDropChance} from '../js/games/iron-squad/casualty-rules.js';
import {saveSlots} from '../js/games/iron-squad/save-slots.js';
import {participated} from '../js/games/iron-squad/phase-rules.js';
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
globalThis.window={};globalThis.document={getElementById:()=>null};
const {IronSquadGame}=await import('../js/games/iron-squad/index.js');
const game=Object.create(IronSquadGame);
for(const method of ['recalcSoldierStats','recalcPlayerStats','updateStatsUI','updateQuestUI','startGameLoop','showToast','spawnSparks','spawnDamageText','renderStrategyUI','gainExp'])game[method]=()=>{};
game.activeSlotId=saveSlots.create('搬送検証').id;game.startFreshGame(false);game.player.x=6000;game.player.y=5400;
const wounded=(id,x=6020,y=5400)=>({id,name:id,x,y,isDown:true,hp:0,maxHp:100,downTimer:14,rescueProgress:0});
const a=wounded('a'),b=wounded('b');game.squad=[a,b];
assert.equal(attachWounded(game,game.player,a),true);assert.equal(attachWounded(game,game.player,b),false);
updateWounded(game,5);assert.equal(a.downTimer,14);assert.equal(a.isDown,true);assert.equal(a.hp,0);assert.equal(b.downTimer,9);
game.player.x=5960;syncDragged(game,.2);assert.ok(a.x<6020);
assert.equal(treatWounded(game,game.player,a,2),false,'normal carrier cannot revive in place');
releaseWounded(game,game.player);assert.equal(attachWounded(game,game.player,a),false,'release does not immediately reattach');
const paladin={id:'paladin',name:'聖騎士',soldierClass:'PALADIN',hp:100,x:6000,y:5400,speed:100};
a.x=b.x=6020;game.squad=[paladin,a,b];assert.equal(carryingCapacity(paladin),2);
assert.equal(attachWounded(game,paladin,a),true);assert.equal(attachWounded(game,paladin,b),true);
assert.equal(carriedSoldiers(game,paladin).length,2);const before=paladin.x;handleTransportAI(game,paladin,1);assert.ok(paladin.x<before);
paladin.isDown=true;sanitizeCarriers(game);assert.equal(a.carrierId,undefined);assert.equal(b.carrierId,undefined);paladin.isDown=false;
// Full restoration happens at a friendly station; transport alone is not combat experience.
a.x=5400;a.y=5400;updateWounded(game,.1);assert.equal(a.isDown,false);assert.equal(a.hp,100);assert.equal(participated(paladin),false);
game.outposts=[{type:'FORT',id:'test-fort',hp:0,maxHp:100,cleared:true,x:7000,y:5400,radius:30,name:'制圧砦'}];b.x=7000;updateWounded(game,.1);assert.equal(b.isDown,false);
const c=wounded('c');game.squad=[c];game.player.x=6500;
const medic={id:'medic',soldierClass:'MEDIC',hp:100,x:6020,y:5400};assert.equal(treatWounded(game,medic,c,.5),false);assert.equal(treatWounded(game,medic,c,.5),true);
assert.equal(c.hp,35);assert.equal(participated(medic),true);
const expired=wounded('expired');expired.downTimer=.1;game.squad=[expired];const casualties=game.phaseCasualties||0;
updateWounded(game,1);updateWounded(game,1);assert.equal(expired.dead,true);assert.equal(game.phaseCasualties,casualties+1);
const carried=wounded('saved');game.squad=[carried];game.player.x=6000;assert.equal(attachWounded(game,game.player,carried),true);
game.saveGame();game.resumeSavedGame(saveSlots.get(game.activeSlotId).data);assert.equal(game.squad[0].carrierId,'player');assert.equal(game.squad[0].hp,0);
game.gold=100;game.healAllSquad();assert.equal(game.squad[0].hp,0);
game.clearOutpost({type:'SUPPLY',x:6000,y:5400});assert.equal(game.squad[0].hp,0);
game.completePhase();assert.equal(game.squad[0].hp,0,'salary/treatment does not remotely revive a casualty');
assert.equal(orbDropChance({isColossal:true},6000),.45);assert.equal(orbDropChance({isBoss:true},3000),.12);assert.equal(orbDropChance({isElite:true},3000),.02);assert.equal(orbDropChance({isBoss:true},600),0);
// Exercise the real loot path at both ends of the random interval. Maximum one orb.
const random=Math.random;
try {
 for(const roll of [.001,.999])for(const type of ['elite','boss','colossal']) {
  Math.random=()=>roll;game.restTimer=0;game.dropsOnField=[];game.particles=[];
  const monster={x:6000,y:5400,lootDistance:6000,isElite:type==='elite',isBoss:type!=='elite',isColossal:type==='colossal',hp:0};game.monsters=[monster];
  game.killMonster(monster,game.player,true);
  assert.equal(game.dropsOnField.filter(d=>d.isOrb).length,roll<.1?1:0);
 }
} finally {Math.random=random;}
// Actual update loop: an ordinary soldier secures a nearby casualty and returns to base.
const node={classList:{add(){},remove(){},toggle(){}},style:{}};globalThis.document={getElementById:()=>node};
game.restTimer=0;game.player.x=6500;game.player.y=5400;game.joystick={active:false,dirX:0,dirY:0};game.width=390;game.height=700;game.zoom=1;
const escort=game.createNewSoldier();Object.assign(escort,{x:6000,y:5400,soldierClass:'HEAVY',hp:100});
const patient=wounded('ai-patient');game.squad=[escort,patient];game.monsters=[];game.updateSpawns=()=>{};
game.update(.1);assert.equal(patient.carrierId,escort.id);const startX=escort.x;
game.update(.1);assert.ok(escort.x<startX);assert.equal(patient.isDown,true);
console.log('PASS: 1/2-person towing, wounded safety/release/death, aid-station revival, medic-only field revival, save/resume, no remote revival, rare single-orb loot');
