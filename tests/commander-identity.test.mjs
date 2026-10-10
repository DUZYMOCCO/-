// v4.2.24: commander creation (name / gender / look) persists, おまかせ is valid, old saves keep their look, rescue line uses the chosen surname.
import assert from 'node:assert/strict';
import {saveSlots} from '../js/games/iron-squad/save-slots.js';
import {guardRescueLines} from '../js/games/iron-squad/soldier-dialogue.js';
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
globalThis.window={};globalThis.document={getElementById:()=>null};
const {IronSquadGame}=await import('../js/games/iron-squad/index.js');
const {buildCommanderAppearance,normalizeCommanderIdentity,randomCommanderIdentity,defaultCommanderAppearance,commanderFullName,MALE_HAIR_STYLES,FEMALE_HAIR_STYLES,HAIR_COLORS,SKIN_COLORS,isGender}=await import('../js/games/iron-squad/commander-identity.js');
const {ensureSoldierAppearance,drawSoldierPortrait}=await import('../js/games/iron-squad/soldier-appearance.js');
const {MALE_GIVEN_NAMES,FEMALE_GIVEN_NAMES,FAMILY_NAMES}=await import('../js/games/iron-squad/soldier-names.js');
const game=Object.create(IronSquadGame);
for(const m of ['recalcSoldierStats','recalcPlayerStats','updateStatsUI','updateQuestUI','startGameLoop','showToast','spawnSparks','spawnDamageText','renderStrategyUI','gainExp','refreshSupplyUI'])game[m]=()=>{};

// 1) creation persists through the slot, a new game, save and load
const mine={familyName:'ミラー',givenName:'エミリア',gender:'female',appearance:buildCommanderAppearance('female',{hairStyle:'long',hairColor:HAIR_COLORS[8],skin:SKIN_COLORS[1],beautiful:true,glasses:'round'})};
const slot=saveSlots.create('隊長づくり');assert.ok(saveSlots.update(slot.id,{commander:normalizeCommanderIdentity(mine)}));
game.activeSlotId=slot.id;game.startFreshGame(false);
const p=game.player;
assert.equal(p.familyName,'ミラー');assert.equal(p.givenName,'エミリア');assert.equal(p.gender,'female');
assert.equal(p.appearance.medicHair,'long');assert.equal(p.appearance.feminine,true);assert.equal(p.appearance.glasses,'round');assert.equal(p.appearance.beautiful,true);
assert.equal(commanderFullName(p),'エミリア・ミラー');
const data=structuredClone(game.saveGame());
assert.equal(data.player.familyName,'ミラー');assert.equal(data.player.gender,'female');
game.player.familyName='';game.player.gender='';game.resumeSavedGame(structuredClone(data));
assert.equal(game.player.familyName,'ミラー');assert.equal(game.player.givenName,'エミリア');assert.equal(game.player.gender,'female');
assert.deepEqual(game.player.appearance,p.appearance,'look survives save/load');
// the real renderer accepts the saved look unchanged (no silent regeneration)
const before=JSON.stringify(game.player.appearance);ensureSoldierAppearance({id:'commander',appearance:game.player.appearance});assert.equal(JSON.stringify(game.player.appearance),before);

// 2) gender decides hair-style family and the family-name rescue line
const line=pl=>guardRescueLines({family:pl.familyName,gender:pl.gender}).filter(l=>l.includes('家の'));
assert.deepEqual(line(game.player),['お前、ミラー家の娘か？']);
game.player.gender='male';game.player.familyName='ブラント';assert.deepEqual(line(game.player),['お前、ブラント家の息子か？']);

// 3) おまかせ always yields valid data, matching names to gender
let seed=7;const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
let sawMale=false,sawFemale=false;
for(let i=0;i<300;i++){
  const r=randomCommanderIdentity(null,rng);
  assert.ok(isGender(r.gender));assert.ok(FAMILY_NAMES.includes(r.familyName));
  assert.ok((r.gender==='female'?FEMALE_GIVEN_NAMES:MALE_GIVEN_NAMES).includes(r.givenName));
  const a=r.appearance;
  assert.ok(SKIN_COLORS.includes(a.skin));assert.ok(HAIR_COLORS.includes(a.hairColor));
  assert.equal(a.feminine,r.gender==='female');
  assert.ok(r.gender==='female'?FEMALE_HAIR_STYLES.includes(a.medicHair):MALE_HAIR_STYLES.includes(a.hairStyle));
  const copy=JSON.stringify(a);ensureSoldierAppearance({id:'commander',appearance:a});assert.equal(JSON.stringify(a),copy,'valid for the renderer');
  assert.deepEqual(normalizeCommanderIdentity(r).appearance,a,'normalizing a valid look is stable');
  if(r.gender==='female')sawFemale=true;else sawMale=true;
}
assert.ok(sawMale&&sawFemale);
for(const g of ['male','female']){const r=randomCommanderIdentity(g,rng);assert.equal(r.gender,g);}
// garbage input never breaks: empty/odd names, unknown gender, bogus colors
const junk=normalizeCommanderIdentity({familyName:'<b>'+'あ'.repeat(40),givenName:'  ',gender:'robot',appearance:{version:1,skin:'#000',hairColor:'red'}});
assert.equal(junk.gender,'');assert.equal(junk.givenName,'');assert.ok(junk.familyName.length<=12&&!junk.familyName.includes('<'));
assert.ok(SKIN_COLORS.includes(junk.appearance.skin));

// 4) zero-choice start: a slot without a commander record still starts (default look, no gender, no family line)
const plain=saveSlots.create('そのまま');game.activeSlotId=plain.id;game.startFreshGame(false);
assert.equal(game.player.gender,'');assert.deepEqual(game.player.appearance,defaultCommanderAppearance());
assert.deepEqual(guardRescueLines({family:game.player.familyName,gender:game.player.gender}).filter(l=>l.includes('家の')),[]);

// 5) old save (no identity fields): look unchanged = today's look; family line suppressed
const old=structuredClone(data);for(const k of ['familyName','givenName','gender','appearance'])delete old.player[k];
game.resumeSavedGame(old);
assert.equal(game.player.gender,'');assert.equal(game.player.familyName,'');
assert.deepEqual(game.player.appearance,defaultCommanderAppearance(),'same face as v4.2.16-v4.2.23');
assert.equal(game.player.appearance.hairStyle,'short');
assert.deepEqual(guardRescueLines({family:game.player.familyName,gender:game.player.gender}).filter(l=>l.includes('家の')),[]);

// 6) re-enlistment keeps the commander identity of the same expedition
game.resumeSavedGame(structuredClone(data));game.gameOver=IronSquadGame.gameOver;
const s2=saveSlots.create('再入隊');game.activeSlotId=s2.id;
saveSlots.update(s2.id,{state:'fallen',commander:normalizeCommanderIdentity(game.player),veterans:[],reserveSurvivors:[]});
game.startFreshGame(true);
assert.equal(game.player.familyName,data.player.familyName);assert.equal(game.player.gender,'female');assert.equal(game.player.level,1);

// 7) portraits draw with feminine looks without throwing (stub canvas)
const calls=[];const ctx=new Proxy({},{get:(t,k)=>k==='createRadialGradient'?()=>({addColorStop(){}}):(...a)=>{calls.push(k);},set:()=>true});
drawSoldierPortrait(ctx,{id:'commander',soldierClass:'COMMANDER',appearance:game.player.appearance},120,132);
assert.ok(calls.length>20);
console.log('commander identity ok');
