import assert from 'node:assert/strict';
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
globalThis.window={};globalThis.document={getElementById:()=>null};globalThis.alert=()=>{};
const {IronSquadGame,SOLDIER_CLASSES}=await import('../js/index.js');
const {classTierOf,classTierLabel,numberedClassName,numberClassDefinitions,nextClassId,playerClassTier,nextPlayerStage,PLAYER_CLASS_STAGES}=await import('../js/class-up-rules.js');
const {isFeminineLook}=await import('../js/soldier-appearance.js');
const {saveSlots}=await import('../js/save-slots.js');
const game=Object.create(IronSquadGame);
for(const key of ['updateStatsUI','updateQuestUI','startGameLoop','showToast','spawnDamageText','spawnSparks','renderStrategyUI','refreshSupplyUI'])game[key]=()=>{};
game.activeSlotId=saveSlots.create('番号付き昇格').id;game.startFreshGame(false);
const promoted=[];
for(const family of ['HEAVY','LIGHT','ARCHER','MEDIC','MAGE'])for(const gender of ['male','female']){
  const s=game.createNewSoldier(null,{classKey:family,gender,talent:'AVERAGE'});game.squad.push(s);
  const appearance=s.appearance,face=JSON.stringify(s.appearance),name=s.name;
  game.awakeningOrbs=9;game.awakeningGems=1;
  for(let tier=1;tier<=3;tier++){
    assert.equal(game.promoteSoldier(s.id),true,`${family}/${gender} can promote to class ${tier}`);
    assert.equal(SOLDIER_CLASSES[s.soldierClass].name,numberedClassName(family,tier));
    assert.equal(s.classTier,tier);assert.equal(s.baseClassId,family);assert.equal(s.gender,gender);
    assert.equal(s.name,name);assert.equal(s.appearance,appearance);assert.equal(JSON.stringify(s.appearance),face);
    assert.equal(isFeminineLook(s),gender==='female');
  }
  assert.equal(game.awakeningOrbs,0);assert.equal(game.awakeningGems,0);assert.equal(game.promoteSoldier(s.id),false);
  promoted.push({id:s.id,gender,family,tier:s.classTier,classId:s.soldierClass});
}
for(const gender of ['male','female']){
  Object.assign(game.player,{gender,isAdvanced:false,advancedClass:null});game.awakeningOrbs=9;game.awakeningGems=1;
  for(let tier=1;tier<=3;tier++){
    assert.equal(nextPlayerStage(game.player).name,`隊長 クラス${tier}`);assert.equal(game.promotePlayer(),true);
    assert.equal(playerClassTier(game.player),tier);assert.equal(game.player.gender,gender);
  }
  assert.equal(game.promotePlayer(),false);assert.equal(game.awakeningOrbs,0);assert.equal(game.awakeningGems,0);
}
const saved=structuredClone(game.saveGame());game.resumeSavedGame(saved);
for(const before of promoted){
  const s=[...game.squad,...game.reserves].find(s=>s.id===before.id);assert.ok(s);
  assert.equal(s.soldierClass,before.classId);assert.equal(s.classTier,3);assert.equal(s.baseClassId,before.family);assert.equal(s.gender,before.gender);
}
// Extending the definitions never needs a new set of gendered titles or a tier-label switch.
const future=numberClassDefinitions({MEDIC_4:{id:'MEDIC_4',baseClassId:'MEDIC',classTier:4,advancedClassId:'MEDIC_5',isAdvanced:true,name:'unused legacy title'}});
assert.equal(future.MEDIC_4.name,'衛生術師 クラス4');assert.equal(classTierOf(future.MEDIC_4),4);assert.equal(nextClassId(future.MEDIC_4),'MEDIC_5');assert.equal(classTierLabel(12),'クラス12');
assert.deepEqual(PLAYER_CLASS_STAGES.map(s=>s.tier),[0,1,2,3]);
console.log('PASS: both genders in all five families and commanders promote through classes 1–3 with identical costs, stable identity/appearance, legacy IDs and saved numeric metadata; future class labels have no fixed upper limit');
