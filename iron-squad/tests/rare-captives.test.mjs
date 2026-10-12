import assert from 'node:assert/strict';
import {DUNGEON_DEFS} from '../js/dungeon.js';
import {CAPTIVE_SPAWN_CHANCE,CAPTIVE_CLASSES,LIMITED_SETTLEMENTS,initializeLimitedAllies,prepareLimitedEncounter,serializeLimitedAllies} from '../js/limited-allies.js';

let sequence=0;
const makeGame=()=>({phase:1,createNewSoldier(_index,{classKey}){
  return {id:`captive-test-${++sequence}`,soldierClass:classKey,gender:'male',maxHp:100,attributeProfile:{innate:{strength:20},aptitudes:{quickness:1,magic:1}},equipped:{weapon:{weaponStyle:'sword',stats:{atk:14}}}};
},recalcSoldierStats(){},applyEquipmentUpgrade(){}});
const places=DUNGEON_DEFS.filter(d=>d.kind==='dungeon'||d.kind==='ruin');
assert.equal(CAPTIVE_SPAWN_CHANCE,.1);assert.equal(CAPTIVE_CLASSES.length,5);
const noDraw=()=>{throw new Error('a saved result must not draw again');};

// A miss is recorded without creating a person, and survives entry, phase changes and save/load.
const empty=makeGame(),before=sequence,nearby=places.find(d=>d.id==='dungeon_goblin_mines');
assert.equal(prepareLimitedEncounter(empty,nearby,()=>.1),null,'the boundary is outside the 10% chance');
assert.equal(sequence,before);assert.deepEqual(empty.limitedAllies.captiveChecks,[nearby.id]);
for(let i=0;i<100;i++)assert.equal(prepareLimitedEncounter(empty,nearby,noDraw),null);
empty.phase=99;assert.equal(prepareLimitedEncounter(empty,nearby,noDraw),null);
const savedEmpty=structuredClone(serializeLimitedAllies(empty)),restoredEmpty=makeGame();initializeLimitedAllies(restoredEmpty,savedEmpty);
assert.equal(prepareLimitedEncounter(restoredEmpty,nearby,noDraw),null);assert.equal(restoredEmpty.limitedAllies.encounters.length,0);
assert.notEqual(restoredEmpty.limitedAllies.captiveChecks,savedEmpty.captiveChecks,'restoring does not share the saved check array');

// Both nearby locations can independently draw any of the five peoples.
for(const place of places.filter(d=>['place_north_fort','dungeon_goblin_mines'].includes(d.id)))for(const [i,classId]of CAPTIVE_CLASSES.entries()){
  const game=makeGame(),draws=[.099999,(i+.5)/CAPTIVE_CLASSES.length];
  const captive=prepareLimitedEncounter(game,place,()=>draws.shift());assert.ok(captive);
  assert.equal(captive.unit.soldierClass,classId);assert.equal(draws.length,0,'spawn and species use independent draws');
  assert.equal(prepareLimitedEncounter(game,place,noDraw),captive,'unrescued identities persist');
  const saved=structuredClone(serializeLimitedAllies(game)),loaded=makeGame();initializeLimitedAllies(loaded,saved);
  assert.deepEqual(prepareLimitedEncounter(loaded,place,noDraw).unit,captive.unit,'saving preserves species and actual equipment');
  captive.joined=true;assert.equal(prepareLimitedEncounter(game,place,noDraw),captive,'rescued allies are never generated again');
}

// Settlement volunteers are not part of the rare dungeon roll.
for(const place of LIMITED_SETTLEMENTS){const game=makeGame(),person=prepareLimitedEncounter(game,place,noDraw);assert.equal(person.kind,'volunteer');assert.equal(person.unit.soldierClass,place.limitedClass);assert.deepEqual(game.limitedAllies.captiveChecks,[]);}
const town=makeGame();assert.equal(prepareLimitedEncounter(town,{id:'town',kind:'town'},noDraw),null);assert.deepEqual(town.limitedAllies.captiveChecks,[]);

// Deterministic sample across the real eight dungeon/ruin definitions checks the joint distribution.
let seed=0x72617265;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const counts=Object.fromEntries(CAPTIVE_CLASSES.map(id=>[id,0])),byPlace=Object.fromEntries(places.map(d=>[d.id,Object.fromEntries(CAPTIVE_CLASSES.map(id=>[id,0]))]));
let attempts=0,hits=0;
for(let expedition=0;expedition<2500;expedition++){
  const game=makeGame();
  for(const place of places){attempts++;const captive=prepareLimitedEncounter(game,place,random);if(captive){hits++;counts[captive.unit.soldierClass]++;byPlace[place.id][captive.unit.soldierClass]++;}}
}
assert.ok(Math.abs(hits/attempts-.1)<.005,`rare encounters: ${hits}/${attempts}`);
for(const classId of CAPTIVE_CLASSES)assert.ok(Math.abs(counts[classId]/hits-.2)<.03,`${classId} stays near one fifth of captives`);
for(const counts of Object.values(byPlace))assert.ok(Object.values(counts).every(n=>n>0),'every real dungeon can draw every species, including foxes');
console.log(JSON.stringify({attempts,hits,rate:hits/attempts,species:counts,byPlace}));
console.log('PASS: rare captives, saved empty results, no entry/load rerolls, independent balanced species, fixed settlement volunteers');
