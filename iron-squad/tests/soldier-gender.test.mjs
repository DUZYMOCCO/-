import assert from 'node:assert/strict';
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
globalThis.window={};globalThis.document={getElementById:()=>null};
const {MALE_GIVEN_NAMES,FEMALE_GIVEN_NAMES,NINJA_NAMES_BY_GENDER,BEAST_NAMES_BY_GENDER,generateSoldierName,rollGenderByKey}=await import('../js/soldier-names.js');
const {IronSquadGame}=await import('../js/index.js');
const {saveSlots}=await import('../js/save-slots.js');
const {createLimitedAlly}=await import('../js/limited-allies.js');
const {rollScoutCandidate}=await import('../js/recruitment.js');
const {rollHeroRevelation}=await import('../js/hero-party.js');
const {ensureSoldierAppearance,isFeminineLook,createSoldierAppearance}=await import('../js/soldier-appearance.js');

// Name lists never overlap between the sexes.
const disjoint=(a,b,label)=>assert.deepEqual(a.filter(n=>b.includes(n)),[],`${label} lists must not share names`);
disjoint(MALE_GIVEN_NAMES,FEMALE_GIVEN_NAMES,'given');
disjoint(NINJA_NAMES_BY_GENDER.male,NINJA_NAMES_BY_GENDER.female,'ninja');
for(const [k,v] of Object.entries(BEAST_NAMES_BY_GENDER))disjoint(v.male,v.female,`beast ${k}`);
assert.equal(new Set([...MALE_GIVEN_NAMES,...FEMALE_GIVEN_NAMES]).size,MALE_GIVEN_NAMES.length+FEMALE_GIVEN_NAMES.length);

const given=s=>s.name.split('・')[0];
function assertConsistent(s,label){
  assert.ok(s.gender==='male'||s.gender==='female',`${label}: explicit gender ${s.name}`);
  const f=s.gender==='female';
  if(s.soldierClass==='NINJA')assert.ok(NINJA_NAMES_BY_GENDER[s.gender].includes(s.name),`${label}: ninja ${s.name}`);
  else if(s.species){
    const pools=Object.values(BEAST_NAMES_BY_GENDER).map(v=>v[s.gender]);
    assert.ok(pools.some(p=>p.includes(s.name)),`${label}: beast ${s.name}`);
  }else assert.ok((f?FEMALE_GIVEN_NAMES:MALE_GIVEN_NAMES).includes(given(s)),`${label}: ${s.gender} soldier has ${s.name}`);
  const a=ensureSoldierAppearance(s);
  assert.equal(a.feminine,f,`${label}: appearance.feminine follows gender`);
  assert.equal(isFeminineLook(s,a),f,`${label}: look follows gender`);
  if(f)assert.equal(a.facialHair,'none',`${label}: no beard on women`);
  else assert.equal(a.beautiful,false,`${label}: male is never drawn as the female beauty`);
}

const game=Object.create(IronSquadGame);
for(const m of ['updateStatsUI','updateQuestUI','startGameLoop','showToast','spawnDamageText','spawnSparks','renderStrategyUI','refreshSupplyUI'])game[m]=()=>{};
game.activeSlotId=saveSlots.create('性別検証').id;game.startFreshGame(false);
for(const s of [...game.squad,...(game.reserves||[])])assertConsistent(s,'initial army');

const seen={male:0,female:0},medics={male:0,female:0};
const classes=['HEAVY','LIGHT','ARCHER','MEDIC','MAGE'];
for(let i=0;i<2000;i++){
  const s=game.createNewSoldier(null,{classKey:classes[i%5]});
  assertConsistent(s,'createNewSoldier');seen[s.gender]++;if(s.soldierClass==='MEDIC')medics[s.gender]++;
  if(i%7===0)game.squad.push(s);
}
assert.ok(seen.male>500&&seen.female>500,'both sexes appear');
assert.ok(medics.male>20,'male medics exist (and look male)');
assert.ok(medics.female>medics.male,'medics lean female');

for(let i=0;i<300;i++)assertConsistent(rollScoutCandidate(game).soldier,'recruitment');
for(const id of ['NINJA','BEAST_WOLF','BEAST_BEAR','BEAST_CAT','BEAST_FOX','BEAST_BIRD'])for(let i=0;i<40;i++)assertConsistent(createLimitedAlly(game,id,{type:'test'}),`limited ${id}`);
game.phase=10;rollHeroRevelation(game,()=>0);
for(const m of game.heroJourney.party.members)assertConsistent(m,'hero party');
const before=game.reserves.length;game.supplyReinforcements?.();
for(const s of game.reserves)assertConsistent(s,'reinforcement');

// Name generation honours an explicit gender for every kind of soldier.
for(let i=0;i<500;i++){
  const g=i%2?'female':'male';
  assert.ok((g==='female'?FEMALE_GIVEN_NAMES:MALE_GIVEN_NAMES).includes(generateSoldierName({soldierClass:'HEAVY',gender:g,seed:i}).split('・')[0]));
  assert.ok(NINJA_NAMES_BY_GENDER[g].includes(generateSoldierName({soldierClass:'NINJA',gender:g})));
  assert.ok(BEAST_NAMES_BY_GENDER.fox[g].includes(generateSoldierName({species:'fox',gender:g})));
}
const f=rollGenderByKey('HEAVY','x');assert.equal(f,rollGenderByKey('HEAVY','x'),'keyed roll is deterministic');
// Without a gender stored, the face still follows the old medic fallback instead of crashing.
assert.equal(isFeminineLook({soldierClass:'MEDIC'}),true);
assert.equal(createSoldierAppearance('x','female').feminine,true);
console.log('soldier gender ok');
