import assert from 'node:assert/strict';
import {JSDOM} from '../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {healFraction, healByMedic, finishExperience} from '../js/games/iron-squad/phase-rules.js';
import {rollAttributeProfile} from '../js/games/iron-squad/unit-attributes.js';
import {grantPersonalExp} from '../js/games/iron-squad/experience-rules.js';
import {treatWounded,grantRescueBonus,markSoldierDown} from '../js/games/iron-squad/casualty-rules.js';
import {WORLD_SIZE} from '../js/games/iron-squad/world.js';

const dom = new JSDOM('<div id="game" class="game-container"></div>', {url:'http://localhost/'});
Object.assign(globalThis, {window:dom.window, document:dom.window.document, localStorage:dom.window.localStorage});
const noop = () => {};
const ctx = new Proxy({measureText:()=>({width:40}), createLinearGradient:()=>({addColorStop:noop}), createRadialGradient:()=>({addColorStop:noop})}, {get:(o,k)=>k in o?o[k]:noop});
window.HTMLCanvasElement.prototype.getContext = () => ctx;
const {IronSquadGame} = await import('../js/games/iron-squad/index.js');
const {saveSlots} = await import('../js/games/iron-squad/save-slots.js');
const game = Object.create(IronSquadGame), center = WORLD_SIZE / 2, field = center + 3600;
Object.assign(game, {container:document.getElementById('game'), width:390, height:664, zoom:1, ctx, camera:{x:center,y:center}, selectedSaleIds:new Set(), commandActiveUntil:0, joystick:{active:false,dirX:0,dirY:0}});
const toasts = [], revivalCases = [];
for (const method of ['startGameLoop','spawnSparks','spawnDamageText']) game[method] = noop;
game.showToast = text => toasts.push(text);
game.setupUI();
game.activeSlotId = saveSlots.create('MEDIC GROWTH TEST ONLY').id;
game.startFreshGame(false);
const initial = structuredClone(game.saveGame());
const template = key => structuredClone(initial.squad.find(s => s.soldierClass === key));
function soldier(key, overrides = {}) {
  const unit = {...template(key === 'HIGH_PRIEST' ? 'MEDIC' : key), soldierClass:key, talent:'AVERAGE', x:field, y:field, speed:0, atkCooldown:1000, ...overrides};
  unit.attributeProfile=rollAttributeProfile(key==='HIGH_PRIEST'?'MEDIC':key,'AVERAGE',()=>.5,true);unit._attributesNormalized=false;game.recalcSoldierStats(unit); unit.hp = unit.maxHp; return unit;
}
function freshField() {
  game.resumeSavedGame(structuredClone(initial)); game.closeStrategyModal();
  Object.assign(game.player, {x:field+1000,y:field,atkCooldown:1000,speed:0});
  Object.assign(game, {camera:{x:field,y:field}, squad:[], reserves:[], monsters:[], outposts:[], merchants:[], dungeons:[], civilians:[], projectiles:[], dropsOnField:[], magicReserve:0, currentQuest:null, restTimer:0, currentDungeon:null, updateSpawns:noop});
  game.invasions.stage = 'idle'; game.baseRaidActive = false;
}

// A real heal projectile must award its caster, immediately level them, and recalculate heal power.
freshField();
const medic = soldier('MEDIC'), patient = soldier('HEAVY', {id:'patient'});
game.squad = [medic, patient];
const oldHealPower = medic.healPower;
for (let i=0; i<3; i++) {
  patient.hp = patient.maxHp-30;
  game.projectiles = [{type:'HEAL', healer:medic, target:patient, amount:30, x:patient.x,y:patient.y,speed:280}];
  game.update(.01);
  assert.equal(patient.hp, patient.maxHp);
}
assert.equal(medic.healingHp,90); assert.equal(medic.healingExp,18);
assert.equal(medic.level,2); assert.equal(medic.exp,4);
assert.ok(medic.healPower > oldHealPower); assert.ok(medic._levelMark > 0, 'a heal that levels the medic raises the mark above them');
assert.equal(patient.exp,0, 'the recipient does not get the caster\'s healing reward');

// Overheal, full health, invalid amounts, and inactive casters must not inflate the reward.
const before = [medic.exp, medic.healingHp, medic.healingExp];
assert.equal(healByMedic(medic,patient,10000,game),0);
assert.equal(healByMedic(medic,patient,NaN,game),0);
assert.equal(healByMedic(medic,patient,Infinity,game),0);
assert.deepEqual([medic.exp,medic.healingHp,medic.healingExp],before);
patient.hp = patient.maxHp-2;
assert.equal(healByMedic(medic,patient,10000,game),2);
assert.equal(medic.healingHp,92); assert.equal(medic.healingExp,18);
for (const flag of [{dead:true},{isDown:true},{hp:0}]) {
  const inactive = {...medic,...flag}; patient.hp = patient.maxHp-10;
  healByMedic(inactive,patient,10,game);
  assert.equal(inactive.exp,medic.exp); assert.equal(inactive.healingExp,medic.healingExp);
}
const downed = {...patient,hp:0,isDown:true};
assert.equal(healByMedic(medic,downed,100,game),0);

// Sub-HP pulses accumulate fairly; splitting one heal into many ticks cannot change its XP.
const whole = soldier('MEDIC',{reqExp:1e9}), split = soldier('MEDIC',{reqExp:1e9});
const wholeTarget = {hp:10,maxHp:100}, splitTarget = {hp:10,maxHp:100};
healByMedic(whole,wholeTarget,5,game);
for (let i=0;i<50;i++) healByMedic(split,splitTarget,.1,game);
assert.equal(whole.exp,1); assert.equal(split.exp,whole.exp);
assert.ok(split.healingExpRemainder < 1e-8);

// The real HIGH_PRIEST aura pays for restored HP across targets, including small final pulses.
freshField();
const priest = soldier('HIGH_PRIEST',{reqExp:1e9,regenTimer:1,_mbTick:2});
const auraPatient = soldier('HEAVY',{id:'aura-patient',x:field+40});
auraPatient.hp = auraPatient.maxHp-5; game.squad=[priest,auraPatient];
game.update(.01);
assert.equal(priest.healingHp,3); assert.equal(priest.exp,0);
priest.regenTimer=1; priest._mbTick=2; game.update(.01);
assert.equal(auraPatient.hp,auraPatient.maxHp);
assert.equal(priest.healingHp,5); assert.equal(priest.exp,1);
priest.regenTimer=1; priest._mbTick=2; game.update(.01);
assert.equal(priest.exp,1,'an aura over healthy allies earns nothing');
for (const soldierClass of ['MEDIC','HIGH_PRIEST','SAINT','ARCHANGEL']) {
  const caster = soldier('MEDIC',{soldierClass,reqExp:1e9});
  assert.equal(healByMedic(caster,{hp:1,maxHp:31},30,game),30);
  assert.equal(caster.exp,6,`${soldierClass} gets healing XP`);
}

// Field resuscitation scales directly with the recipient's full HP, with no ordinary-heal conversion.
freshField();
const rescuer = soldier('MEDIC',{reqExp:1e9});
const wounded = {...soldier('HEAVY',{id:'revive-patient',reqExp:1e9}),hp:0,maxHp:100,isDown:true,downTimer:45};
game.squad=[rescuer,wounded];
assert.equal(treatWounded(game,rescuer,wounded,1),true);
assert.equal(wounded.hp,Math.round(100*healFraction(rescuer))); assert.ok(wounded.hp>=8&&wounded.hp<=12,"fresh medic revives ~10% of max HP (was flat 35%)"); assert.equal(rescuer.exp,300); assert.equal(rescuer.revivalExp,300);
assert.equal(rescuer.healingExp,0); assert.equal(rescuer.healingHp,0);
assert.equal(treatWounded(game,rescuer,wounded,1),false); assert.equal(rescuer.exp,300);
grantRescueBonus(game,wounded,{method:'MEDIC',medic:rescuer}); assert.equal(rescuer.exp,300,'one reward per down event');
const expBeforePotion = rescuer.exp;
rescuer.isPersonalGuard=true; game.squadPotion=1; wounded.hp=1;
assert.equal(game.useSquadPotion(),true);
assert.equal(rescuer.exp,expBeforePotion, 'a potion is not attributed to a medic');

for (const maxHp of [1000,10000]) {
  const medical = soldier('MEDIC',{id:`medic-${maxHp}`,reqExp:1e9});
  const casualty = {...soldier('HEAVY',{id:`wounded-${maxHp}`,reqExp:1e9}),hp:0,maxHp,isDown:true,downTimer:45};
  game.squad=[medical,casualty];
  assert.equal(treatWounded(game,medical,casualty,1),true);
  assert.equal(medical.exp,maxHp*3); assert.equal(medical.revivalExp,maxHp*3);
  revivalCases.push({maxHp,exp:medical.exp});
  assert.equal(casualty.hp,Math.round(maxHp*healFraction(medical)),"revival HP follows the healer formula (was flat 35%)"); assert.ok(casualty.hp/maxHp<.15); assert.equal(casualty.exp,30,'recipient keeps their separate survival reward');
  assert.ok(toasts.at(-1).includes(`+${(maxHp*3).toLocaleString()}EXP`));
  markSoldierDown(game,casualty);
  assert.equal(treatWounded(game,medical,casualty,1),true);
  assert.equal(medical.exp,maxHp*6,'a later real down event earns a new rescue reward');
}
// A medic who also carries the patient gets the full revival reward once, with immediate growth.
const carryingMedic = soldier('MEDIC',{id:'carrying-medic'}), healBeforeRevival=carryingMedic.healPower;
const carriedPatient = {...soldier('HEAVY',{id:'carried-patient',reqExp:1e9}),hp:0,maxHp:1000,isDown:true,downTimer:45,carrierId:carryingMedic.id};
game.squad=[carryingMedic,carriedPatient];
assert.equal(treatWounded(game,carryingMedic,carriedPatient,1),true);
assert.equal(carryingMedic.revivalExp,3000); assert.ok(carryingMedic.level>2); assert.ok(carryingMedic.healPower>healBeforeRevival);
let spent=0,threshold=14; for(let level=1;level<carryingMedic.level;level++){spent+=threshold;threshold=Math.floor(threshold*1.5+8);}
assert.equal(spent+carryingMedic.exp,3000,'a carrying medic is not paid twice');
// A separate carrier retains transport credit; the actual reviver still earns the full revival XP.
const assistedMedic = soldier('MEDIC',{id:'assisted-medic',reqExp:1e9});
const carrier = soldier('HEAVY',{id:'carrier',reqExp:1e9});
const assistedPatient = {...soldier('HEAVY',{id:'assisted-patient',reqExp:1e9}),hp:0,maxHp:1000,isDown:true,downTimer:45,carrierId:carrier.id};
game.squad=[assistedMedic,carrier,assistedPatient];
assert.equal(treatWounded(game,assistedMedic,assistedPatient,1),true);
assert.equal(assistedMedic.exp,3000); assert.equal(carrier.exp,20);
assert.ok(toasts.at(-1).includes(`${assistedMedic.name}+3,000EXP`), 'the notification attributes the revival XP to the medic');
assert.ok(toasts.at(-1).includes(`${carrier.name}+20EXP`), 'the notification distinguishes transport credit');
// Reward uses the pre-reward max HP even when the revived recipient also levels up immediately.
const fixedMedic = soldier('MEDIC',{id:'fixed-medic',reqExp:1e9});
const growingPatient = {...soldier('HEAVY',{id:'growing-patient'}),hp:0,isDown:true,downTimer:45};
const originalMaxHp = growingPatient.maxHp; game.squad=[fixedMedic,growingPatient];
assert.equal(treatWounded(game,fixedMedic,growingPatient,1),true);
assert.ok(growingPatient.maxHp>originalMaxHp); assert.equal(fixedMedic.exp,originalMaxHp*3);

// 480 actual HP restored and 16 ordinary near-base kills produce the same individual level progress.
freshField();
const supporter = soldier('MEDIC'), attacker = soldier('HEAVY');
const patientFixture = {hp:1,maxHp:100}; game.squad=[supporter,attacker];
const originalRandom = Math.random; Math.random=()=>.99;
try {
  for (let i=0;i<16;i++) {
    patientFixture.hp=1; healByMedic(supporter,patientFixture,30,game);
    const enemy={x:center+30,y:center,hp:0,maxHp:30,atk:1,def:0,type:'goblin',lootDistance:0};
    game.monsters=[enemy]; game.killMonster(enemy,attacker,false);
  }
} finally {Math.random=originalRandom;}
assert.equal(supporter.healingExp,96);
assert.equal(supporter.level,4); assert.equal(attacker.level,supporter.level);
assert.equal(attacker.exp,supporter.exp); assert.equal(attacker.reqExp,supporter.reqExp);
assert.equal(supporter.kills,0);

// Save/reload preserves both lifetime credit and fractions, including a reserve medic and a phase boundary.
healByMedic(supporter,{hp:1,maxHp:3},2,game);
const reserve = soldier('MEDIC',{id:'reserve-medic',reqExp:1e9});
healByMedic(reserve,{hp:1,maxHp:5},4,game); game.reserves=[reserve];
grantRescueBonus(game,{...soldier('HEAVY',{id:'reserve-patient',reqExp:1e9}),maxHp:1000},{method:'MEDIC',medic:reserve});
finishExperience(supporter);
const supporterId = supporter.id, saved = structuredClone(game.saveGame());
game.resumeSavedGame(saved);
const restored = game.squad.find(s=>s.id===supporterId);
const restoredReserve = [...game.squad,...game.reserves].find(s=>s.id==='reserve-medic');
assert.equal(restored.healingHp,482); assert.equal(restored.healingExp,96); assert.equal(restored.healingExpRemainder,2);
healByMedic(restored,{hp:1,maxHp:4},3,game);
assert.equal(restored.healingExp,97); assert.equal(restored.healingExpRemainder,0);
assert.equal(restoredReserve.healingExpRemainder,4);
assert.equal(restoredReserve.revivalExp,3000,'revival lifetime XP survives saving');
healByMedic(restoredReserve,{hp:1,maxHp:2},1,game);
assert.equal(restoredReserve.healingExp,1); assert.equal(restoredReserve.healingExpRemainder,0);
const detail = document.createElement('div'); detail.innerHTML=game.buildSoldierDetailHtml(restored);
assert.match(detail.textContent,/実回復 💚 485HP/); assert.match(detail.textContent,/回復EXP 97/);
assert.match(detail.textContent,/実回復5HPで1EXP/);
assert.match(detail.textContent,/蘇生は対象の最大HPの300%をEXPで獲得/);

// The common helper retains the established rescue/player level thresholds.
const captain={isPlayer:true,level:1,exp:0,reqExp:20};
assert.equal(grantPersonalExp(null,captain,30),true);
assert.equal(captain.level,2); assert.equal(captain.exp,10); assert.equal(captain.reqExp,39);
const levelNotes=[];
const marked={player:captain,squad:[],showToast:text=>levelNotes.push(text),spawnDamageText:()=>levelNotes.push('float'),sound:{playHighScore(){}}};
assert.equal(grantPersonalExp(marked,captain,100),true);
assert.ok(captain._levelMark>2); assert.equal(levelNotes.length,0,'a level-up stays off the battle log');
console.log(JSON.stringify({healingHp:480,healingExp:96,ordinaryKills:16,medicLevel:supporter.level,attackerLevel:attacker.level,revivalCases}));
console.log('PASS: actual projectiles/aura, immediate medic growth, real-HP-only credit, fractions, all medic classes, max-HP revival scaling, distinct/shared carriers, once-per-down/potion separation, kill-growth parity, phase/save/reserve persistence and detail UI');
dom.window.close();
