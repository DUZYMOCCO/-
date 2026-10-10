// d99cea4: commander/paladin carry two, ordinary soldiers one. Aid coordinates use the expanded world center.
import {healAmountFor} from '../js/games/iron-squad/phase-rules.js';
import assert from 'node:assert/strict';
import {WORLD_SIZE} from '../js/games/iron-squad/world.js';
import {RESCUE_TIMEOUT,carryingCapacity,aidStations,carriedSoldiers,attachWounded,updateWounded,handleTransportAI,syncDragged,treatWounded,sanitizeCarriers,releaseWounded,orbDropChance} from '../js/games/iron-squad/casualty-rules.js';
import {saveSlots} from '../js/games/iron-squad/save-slots.js';
import {participated} from '../js/games/iron-squad/phase-rules.js';
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
globalThis.window={};globalThis.document={getElementById:()=>null};
const {IronSquadGame}=await import('../js/games/iron-squad/index.js');
const game=Object.create(IronSquadGame);
for(const method of ['recalcSoldierStats','recalcPlayerStats','updateStatsUI','updateQuestUI','startGameLoop','showToast','spawnSparks','spawnDamageText','renderStrategyUI','gainExp'])game[method]=()=>{};
game.activeSlotId=saveSlots.create('搬送検証').id;game.startFreshGame(false);const center=WORLD_SIZE/2;game.player.x=center+600;game.player.y=center;
const wounded=(id,x=center+620,y=center)=>({id,name:id,x,y,isDown:true,hp:0,maxHp:100,downTimer:RESCUE_TIMEOUT,rescueProgress:0});
const a=wounded('a'),b=wounded('b'),overflow=wounded('overflow');game.squad=[a,b,overflow];
assert.equal(carryingCapacity(game.player),2);assert.equal(attachWounded(game,game.player,a),true);assert.equal(attachWounded(game,game.player,b),true);assert.equal(attachWounded(game,game.player,overflow),false);
updateWounded(game,5);assert.equal(a.downTimer,RESCUE_TIMEOUT);assert.equal(b.downTimer,RESCUE_TIMEOUT);assert.equal(a.isDown,true);assert.equal(a.hp,0);assert.equal(overflow.downTimer,RESCUE_TIMEOUT-5);

game.player.x=center+560;syncDragged(game,.2);assert.ok(a.x<center+620);
assert.equal(treatWounded(game,game.player,a,2),false,'normal carrier cannot revive in place');
releaseWounded(game,game.player);assert.equal(attachWounded(game,game.player,a),false,'release does not immediately reattach');
const ordinary={id:'ordinary',soldierClass:'HEAVY',hp:100,x:center+600,y:center};a.x=b.x=center+620;game.squad=[ordinary,a,b];
assert.equal(carryingCapacity(ordinary),1);assert.equal(attachWounded(game,ordinary,a),true);assert.equal(attachWounded(game,ordinary,b),false);releaseWounded(game,ordinary);
const paladin={id:'paladin',name:'聖騎士',soldierClass:'PALADIN',hp:100,x:center+600,y:center,speed:100};
a.x=b.x=center+620;game.squad=[paladin,a,b];assert.equal(carryingCapacity(paladin),2);
assert.equal(attachWounded(game,paladin,a),true);assert.equal(attachWounded(game,paladin,b),true);
const aidDistance=unit=>Math.min(...aidStations(game,unit).filter(p=>p.kind!=='medical'||p.discovered).map(p=>Math.hypot(unit.x-p.x,unit.y-p.y)));
assert.equal(carriedSoldiers(game,paladin).length,2);const before=aidDistance(paladin);handleTransportAI(game,paladin,1);assert.ok(aidDistance(paladin)<before,'carriers approach the nearest available aid facility, which may be a town');
paladin.isDown=true;sanitizeCarriers(game);assert.equal(a.carrierId,undefined);assert.equal(b.carrierId,undefined);paladin.isDown=false;
// Full restoration happens at a friendly station; transport alone is not combat experience.
a.x=center;a.y=center;updateWounded(game,.1);assert.equal(a.isDown,false);assert.equal(a.hp,100);assert.equal(participated(paladin),false);
game.outposts=[{type:'FORT',id:'test-fort',hp:0,maxHp:100,cleared:true,x:center+1600,y:center,radius:30,name:'制圧砦'}];b.x=center+1600;updateWounded(game,.1);assert.equal(b.isDown,false);
const c=wounded('c');game.squad=[c];game.player.x=center+1100;
const medic={id:'medic',soldierClass:'MEDIC',hp:100,x:center+620,y:center};assert.equal(treatWounded(game,medic,c,.5),false);assert.equal(treatWounded(game,medic,c,.5),true);
assert.equal(c.hp,Math.floor(healAmountFor(medic,c)),'medic revival follows the healer formula (was flat 35%)');assert.equal(participated(medic),true);
const expired=wounded('expired');expired.downTimer=.1;game.squad=[expired];const casualties=game.phaseCasualties||0;
updateWounded(game,1);updateWounded(game,1);assert.equal(expired.dead,true);assert.equal(game.phaseCasualties,casualties+1);
assert.equal(game.remains.length,1);assert.equal(game.remains[0].x,expired.x);game.ageRemains(26);assert.equal(game.remains.length,0);
const carried=wounded('saved');game.squad=[carried];game.player.x=center+600;assert.equal(attachWounded(game,game.player,carried),true);
game.saveGame();game.resumeSavedGame(saveSlots.get(game.activeSlotId).data);assert.equal(game.squad[0].carrierId,'player');assert.equal(game.squad[0].hp,0);
game.gold=100;game.healAllSquad();assert.equal(game.squad[0].hp,0);
game.clearOutpost({type:'SUPPLY',x:center+600,y:center});assert.equal(game.squad[0].hp,0);
game.completePhase();assert.equal(game.squad[0].hp,0,'salary/treatment does not remotely revive a casualty');
assert.equal(orbDropChance({isColossal:true},6000),.45);assert.equal(orbDropChance({isBoss:true},3000),.12);assert.equal(orbDropChance({isElite:true},3000),.02);assert.equal(orbDropChance({isBoss:true},600),0);
// Exercise the real loot path at both ends of the random interval. Maximum one orb.
const random=Math.random;
try {
 for(const roll of [.001,.999])for(const type of ['elite','boss','colossal']) {
  Math.random=()=>roll;game.restTimer=0;game.dropsOnField=[];game.particles=[];
  const monster={x:center+600,y:center,lootDistance:6000,isElite:type==='elite',isBoss:type!=='elite',isColossal:type==='colossal',hp:0};game.monsters=[monster];
  game.killMonster(monster,game.player,true);
  assert.equal(game.dropsOnField.filter(d=>d.item?.type==='ORB'&&d.item.isOrb).length,roll<.1?1:0);
  assert.equal(game.dropsOnField.filter(d=>d.item?.type==='GEM').length,type==='colossal'&&roll<.35?1:0,'a separate awakening gem is not a second hero orb');
 }
} finally {Math.random=random;}
// Actual update loop: an ordinary soldier secures a nearby casualty and heads to the nearest aid facility.
const node={classList:{add(){},remove(){},toggle(){}},style:{}};globalThis.document={getElementById:()=>node};
game.restTimer=0;game.player.x=center+1100;game.player.y=center;game.joystick={active:false,dirX:0,dirY:0};game.width=390;game.height=700;game.zoom=1;
const escort=game.createNewSoldier();Object.assign(escort,{x:center+600,y:center,soldierClass:'HEAVY',hp:100});
const patient=wounded('ai-patient');game.squad=[escort,patient];game.monsters=[];game.updateSpawns=()=>{};
game.update(.1);assert.equal(patient.carrierId,escort.id);const startDistance=aidDistance(escort);
game.update(.1);assert.ok(aidDistance(escort)<startDistance);assert.equal(patient.isDown,true);
console.log('PASS: 2-person commander/paladin and 1-person ordinary towing, wounded safety/release/death, aid-station revival, medic-only field revival, save/resume, no remote revival, rare single-orb loot');
