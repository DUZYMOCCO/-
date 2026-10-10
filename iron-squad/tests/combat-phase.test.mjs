// Pure phase simulation stubs strategy-panel rendering; interface.test.mjs independently exercises its real DOM.
import assert from 'node:assert/strict';
import {storage} from '../../js/storage.js';
import {markSoldierDown,treatWounded} from '../js/casualty-rules.js';
import {saveSlots} from '../js/save-slots.js';
import {DEATHLINE_DOWN_THRESHOLD,personalDownCount,deathlineEligible,PHASE_DURATION,emptyActivity,advancePhase,advanceRest,recordCombat,healByMedic,participated,finishExperience} from '../js/phase-rules.js';

const memory=new Map();
globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
globalThis.window={};globalThis.document={getElementById:()=>null};
const {IronSquadGame,DEPLOYMENT_CAPACITY}=await import('../js/index.js');
const noop=()=>{};
const clock={inBattle:true,phase:1,phaseTimer:120,completePhase(){this.phase++;this.phaseTimer=120;}};
for(let i=0;i<750;i++)advancePhase(clock,.1);
assert.equal(clock.phase,1);assert.ok(Math.abs(clock.phaseTimer-45)<.000001);
for(let i=0;i<450;i++)advancePhase(clock,.1);
assert.equal(clock.phase,2);assert.equal(clock.phaseTimer,120);
clock.inBattle=false;advancePhase(clock,50);assert.equal(clock.phaseTimer,120);
const game=Object.create(IronSquadGame);
for(const name of ['recalcSoldierStats','recalcPlayerStats','updateStatsUI','updateQuestUI','startGameLoop','showToast','spawnSparks','spawnDamageText','renderStrategyUI'])game[name]=noop;
game.activeSlotId=saveSlots.create('戦線検証').id;
game.startFreshGame(false);
assert.equal(PHASE_DURATION,120);assert.equal(game.phaseTimer,120);
const [fighter,defender,idle]=game.squad;
const medic=game.squad.find(s=>s.soldierClass==='MEDIC');
// Credit the attacker and the defended soldier, but not a heal's recipient.
game.performAttack(fighter,{x:fighter.x+10,y:fighter.y,hp:100,color:'#fff'},false,1);
game.damageTarget(defender,1);
idle.hp=30;
assert.equal(healByMedic(medic,idle,20),20);
assert.equal(participated(idle),false);
const waitingMedic=game.squad.filter(s=>s.soldierClass==='MEDIC')[1];
assert.equal(healByMedic(waitingMedic,{hp:100,maxHp:100},20),0);
assert.equal(participated(waitingMedic),false,'full-health healing earns no credit');
advanceRest(game,10);game.completePhase();
for(const unit of [fighter,defender,medic])assert.equal(unit.survivedWaves,1);
assert.equal(idle.survivedWaves,0);assert.equal(waitingMedic.survivedWaves,0);
assert.equal(game.player.survivedWaves,0);
assert.equal(game.lastReinforcements.experienced,3);
assert.equal(game.lastReinforcements.received,5);assert.equal(game.lastReinforcements.deployed,0);
assert.equal(game.reserves.length,5);assert.equal(game.squad.length,DEPLOYMENT_CAPACITY);
assert.ok(game.reserves.every(s=>!participated(s)&&s.survivedWaves===0));
assert.equal(game.phaseTimer,120);
// An inactive following cycle cannot award the same experience twice.
advanceRest(game,10);game.completePhase();assert.equal(fighter.survivedWaves,1);assert.equal(game.reserves.length,10);
assert.equal(game.lastReinforcements.experienced,0);
// Reserves fill a confirmed casualty and cannot exceed active capacity.
game.squad[19].dead=true;
assert.equal(game.deployReserves(),1);assert.equal(game.squad.length,DEPLOYMENT_CAPACITY);assert.equal(game.reserves.length,9);
assert.equal(new Set([...game.squad,...game.reserves].map(s=>s.name)).size,DEPLOYMENT_CAPACITY+9);
// Ten downs spread across the army do not awaken anyone without ten personal downs.
advanceRest(game,10);
for(const unit of [fighter,defender,medic])recordCombat(unit);
for(const soldier of game.squad.slice(-8)){markSoldierDown(game,soldier);soldier.dead=true;}
for(let i=0;i<2;i++){markSoldierDown(game,fighter);fighter.isDown=false;fighter.hp=fighter.maxHp;}
assert.equal(personalDownCount(fighter),2);
game.phaseCasualties=8;
game.phaseInitialSquadCount=DEPLOYMENT_CAPACITY;
game.completePhase();
assert.equal(fighter.survivedDeathlines,0);assert.equal(idle.survivedDeathlines,0);
assert.equal(game.squad.length,DEPLOYMENT_CAPACITY);assert.equal(game.lastReinforcements.received,5);
assert.equal(game.lastReinforcements.deployed,8);assert.equal(game.reserves.length,6);
assert.ok(game.squad.every(s=>!participated(s)));
// In-progress combat/healing and reserve pools survive saving and loading.
recordCombat(game.player);healByMedic(medic,{hp:10,maxHp:100},7);
game.phaseTimer=87;game.saveGame();
const saved=saveSlots.get(game.activeSlotId).data;
game.resumeSavedGame(saved);
assert.equal(game.phaseTimer,87);assert.equal(game.phaseDuration,120);
assert.equal(game.player.phaseActivity.combatActions,1);assert.equal(game.reserves.length,6);
assert.equal(game.squad.find(s=>s.id===medic.id).phaseActivity.healingDone,7);
game.currentQuest=null;
game.clearOutpost({type:'CAGE',x:5400,y:5400});
assert.equal(game.squad.length,DEPLOYMENT_CAPACITY);assert.equal(game.reserves.length,8);
assert.equal(new Set([...game.squad,...game.reserves].map(s=>s.name)).size,DEPLOYMENT_CAPACITY+8);
game.squad.push(game.createNewSoldier(),game.createNewSoldier());
game.normalizeDeployment();
assert.equal(game.squad.length,DEPLOYMENT_CAPACITY);assert.equal(game.reserves.length,10);
assert.ok(storage.get('ironsquad_rules_version')===4);
const lonely={hp:100,survivedWaves:0,phaseActivity:emptyActivity()};
assert.equal(finishExperience(lonely),false);recordCombat(lonely);
assert.equal(finishExperience(lonely),true);assert.equal(finishExperience(lonely),false);
assert.equal(lonely.survivedWaves,1);
// The new trigger works with zero deaths and repeated real medic revivals.
game.startFreshGame(false);assert.equal(DEATHLINE_DOWN_THRESHOLD,10);
let target=game.squad[0],healer=game.squad.find(s=>s.soldierClass==='MEDIC');
recordCombat(target);healer.x=target.x;healer.y=target.y;
const knockAndRevive=()=>{
 assert.equal(markSoldierDown(game,target),true);const n=personalDownCount(target);
 assert.equal(markSoldierDown(game,target),false);assert.equal(personalDownCount(target),n,'a still-downed unit is counted once');
 healer.mana=100;assert.equal(treatWounded(game,healer,target,1),true,'the production medic revival returns the same soldier to action');
};
for(let i=0;i<9;i++)knockAndRevive();
assert.equal(personalDownCount(target),9);assert.equal(game.phaseCasualties,0);
const beforeSave=structuredClone(game.saveGame());game.resumeSavedGame(beforeSave);assert.equal(personalDownCount(game.squad.find(s=>s.id===target.id)),9);
target=game.squad.find(s=>s.id===target.id);healer=game.squad.find(s=>s.id===healer.id);healer.x=target.x;healer.y=target.y;
knockAndRevive();assert.equal(personalDownCount(target),10);game.completePhase();
assert.equal(target.survivedDeathlines,1);assert.equal(healer.survivedDeathlines,0);assert.equal(game.deathlineReport.qualifiedCount,1);assert.equal(game.deathlineReport.awakenedList[0].id,target.id);assert.equal(game.deathlineReport.awakenedList[0].downCount,10);assert.equal(game.deathlineReport.deadCount,0);assert.equal(personalDownCount(target),0);
assert.ok(game.squad.filter(s=>s!==target&&s!==healer).every(s=>s.survivedDeathlines===0));
const heldSkill=target.deathlineSkills.length;game.completePhase();assert.equal(target.deathlineSkills.length,heldSkill,'rest cannot duplicate the same wave awakening');
const reportSave=structuredClone(game.saveGame());game.resumeSavedGame(reportSave);assert.equal(game.deathlineReport.awakenedList[0].downCount,10);assert.equal(personalDownCount(game.squad.find(s=>s.id===target.id)),0);
advanceRest(game,10);game.completePhase();assert.equal(game.deathlineReport.occurred,false,'the next wave starts a fresh count');
// Nine downs and many deaths cannot satisfy the new ten-down condition.
game.startFreshGame(false);target=game.squad[0];healer=game.squad.find(s=>s.soldierClass==='MEDIC');healer.x=target.x;healer.y=target.y;recordCombat(target);
for(let i=0;i<9;i++)knockAndRevive();game.phaseCasualties=8;game.completePhase();assert.equal(target.survivedDeathlines,0);assert.equal(game.deathlineReport.occurred,false);
advanceRest(game,10);knockAndRevive();assert.equal(personalDownCount(target),1);game.completePhase();assert.equal(target.survivedDeathlines,0,'nine downs in one wave and one in the next are not ten');
// Merchant and gate-guard downs are outside the army trigger; rest downs do not leak into the next wave.
game.startFreshGame(false);const npc={id:'npc-down',name:'NPC',isGateGuard:true,x:0,y:0,hp:100,maxHp:100};markSoldierDown(game,npc);assert.equal(personalDownCount(npc),0);
game.restTimer=8;markSoldierDown(game,game.squad[0]);assert.equal(personalDownCount(game.squad[0]),0);
const legacy=structuredClone(game.saveGame());delete legacy.squad[0].phaseActivity.downs;legacy.squad[0].timesDown=999;game.resumeSavedGame(legacy);assert.equal(personalDownCount(game.squad[0]),0,'lifetime downs in old saves are not this-wave events');
// Per-person counts cannot carry across waves or award other participating soldiers.
assert.equal(deathlineEligible({dead:true,phaseActivity:{downs:10}}),false);
assert.equal(deathlineEligible({dead:false,phaseActivity:{downs:9}}),false);
assert.equal(deathlineEligible({dead:false,phaseActivity:{downs:10}}),true);
// A weak soldier really changes strength after personally reaching the threshold.
game.startFreshGame(false);game.recalcSoldierStats=IronSquadGame.recalcSoldierStats.bind(game);
const inferior=game.squad.find(s=>s.soldierClass==='HEAVY');inferior.talent='INFERIOR';game.recalcSoldierStats(inferior);
const hpBefore=inferior.maxHp,defBefore=inferior.def;inferior.phaseActivity={combatActions:1,healingDone:0,downs:10};game.completePhase();
assert.equal(inferior.talent,'INFERIOR');assert.ok(inferior.deathlineSkills.includes('IRON_RESOLVE'));const awakenedHp=inferior.maxHp,awakenedDef=inferior.def,skills=inferior.deathlineSkills;
inferior.deathlineSkills=[];game.recalcSoldierStats(inferior);assert.ok(awakenedHp>inferior.maxHp);assert.ok(awakenedDef>inferior.def);
inferior.deathlineSkills=skills;game.recalcSoldierStats(inferior);
assert.ok(game.squad.filter(s=>s!==inferior).every(s=>!s.deathlineSkills.length),'the support team does not receive his awakening');
console.log('PASS: personal ten-down threshold, army-total rejection, repeated medic revivals, nine-down rejection, only recipient, zero deaths, NPC/rest exclusion, save/report roundtrip and no duplicate awakening');
