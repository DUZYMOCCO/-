// Pure phase simulation stubs strategy-panel rendering; interface.test.mjs independently exercises its real DOM.
import assert from 'node:assert/strict';
import {storage} from '../js/storage.js';
import {saveSlots} from '../js/games/iron-squad/save-slots.js';
import {PHASE_DURATION,emptyActivity,advancePhase,advanceRest,recordCombat,healByMedic,participated,finishExperience} from '../js/games/iron-squad/phase-rules.js';

const memory=new Map();
globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
globalThis.window={};globalThis.document={getElementById:()=>null};
const {IronSquadGame,DEPLOYMENT_CAPACITY}=await import('../js/games/iron-squad/index.js');
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
game.performAttack(fighter,{x:0,y:0,hp:100,color:'#fff'},false,1);
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
// Heavy losses only awaken survivors who actually participated.
for(const unit of [fighter,defender,medic])recordCombat(unit);
for(const soldier of game.squad.slice(-8))soldier.dead=true;
game.phaseCasualties=8; // Eight actual losses meet the current absolute four-loss deathline condition.
game.phaseInitialSquadCount=DEPLOYMENT_CAPACITY;
advanceRest(game,10);game.completePhase();
assert.equal(fighter.survivedDeathlines,1);assert.equal(idle.survivedDeathlines,0);
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
console.log('PASS: 120-second cycle, actual combat/healing credit, idle exclusion, deathline eligibility, periodic reserves, casualty deployment, persistent participation');
