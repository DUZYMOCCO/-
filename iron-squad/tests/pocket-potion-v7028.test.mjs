// v7.0.28: soldier pocket potion ("手当て") — 30% of max HP, 3 uses per wave (phase), 8G each, 4 s apart; old saves start with 3 left.
import assert from 'node:assert/strict';
import {POCKET_POTION,pocketPotionLeft,pocketPotionLabel,tickPocketPotion} from '../js/pocket-potion.js';
assert.deepEqual({...POCKET_POTION},{cost:8,healPct:.3,usesPerWave:3,triggerBelow:.45,cooldown:4});
const unit=(extra={})=>({hp:100,maxHp:1000,gold:100,medCooldown:0,...extra});
{ // 30% heal, 8G, only below 45%, cooldown 4 s
  const u=unit({hp:450});assert.equal(tickPocketPotion(u,.1,5),false,'45% exactly is not below the trigger');
  u.hp=449;assert.equal(tickPocketPotion(u,.1,5),true);assert.equal(u.hp,449+300);assert.equal(u.gold,92);assert.equal(u.medCooldown,4);assert.deepEqual(u.pocketPotion,{phase:5,used:1});
  u.hp=100;assert.equal(tickPocketPotion(u,3.9,5),false,'cooling down');assert.equal(u.hp,100);
  assert.equal(tickPocketPotion(u,.2,5),true,'4 s later');assert.equal(u.hp,400);assert.equal(u.gold,84);
}
{ // three uses per wave, then none until the next wave
  const u=unit();let used=0;
  for(let i=0;i<20;i++){u.hp=100;if(tickPocketPotion(u,4.1,7))used++;}
  assert.equal(used,3);assert.equal(pocketPotionLeft(u,7),0);assert.equal(u.gold,100-24);
  u.hp=100;assert.equal(tickPocketPotion(u,10,7),false,'no 4th use in the same wave');
  assert.equal(pocketPotionLeft(u,8),3,'a new wave refills');
  u.hp=100;assert.equal(tickPocketPotion(u,4.1,8),true);assert.deepEqual(u.pocketPotion,{phase:8,used:1},'the counter restarts');
  assert.equal(pocketPotionLeft(u,8),2);
}
{ // capped by max HP; needs the 8G; poor soldiers keep their uses
  const u=unit({hp:440,maxHp:1000});u.hp=440;tickPocketPotion(u,0,1);assert.equal(u.hp,740);
  const rich=unit({hp:440,maxHp:100});rich.hp=44;tickPocketPotion(rich,0,1);assert.equal(rich.hp,74);
  const nearFull=unit({hp:440,maxHp:1000,gold:7});assert.equal(tickPocketPotion(nearFull,0,1),false);assert.equal(pocketPotionLeft(nearFull,1),3,'no gold: nothing consumed');
  nearFull.gold=8;assert.equal(tickPocketPotion(nearFull,0,1),true);assert.equal(nearFull.gold,0);
}
{ // old saves: no record = full 3; a record from another wave = full 3; garbage is tolerated
  assert.equal(pocketPotionLeft({},3),3);assert.equal(pocketPotionLeft({pocketPotion:{phase:2,used:3}},3),3);
  assert.equal(pocketPotionLeft({pocketPotion:{phase:3,used:2}},3),1);assert.equal(pocketPotionLeft({pocketPotion:{phase:3,used:'x'}},3),3);assert.equal(pocketPotionLeft({pocketPotion:{phase:3,used:99}},3),0);
  assert.equal(pocketPotionLeft(null,1),3);
  assert.equal(pocketPotionLabel({pocketPotion:{phase:3,used:1}},3),'手当て 30%・1作戦期3回（残り2回）');
}
// ---------- full game: the real update loop, save and reload ----------
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
globalThis.window={};globalThis.document={getElementById:()=>null};
const {IronSquadGame}=await import('../js/index.js');
const {saveSlots}=await import('../js/save-slots.js');
const game=Object.create(IronSquadGame);
for(const m of ['updateStatsUI','updateQuestUI','startGameLoop','spawnSparks','spawnDamageText','renderStrategyUI','refreshSupplyUI','recalcPlayerStats'])game[m]=()=>{};
game.showToast=()=>{};game.width=800;game.height=450;game.zoom=1;
game.activeSlotId=saveSlots.create('手当て検証').id;game.startFreshGame(false);game.restTimer=0;game.monsters=[];game.inBattle=true;
const soldier=game.squad.find(s=>!s.isPersonalGuard&&!s.dead&&!s.heroPartyId)||game.squad[0];
soldier.gold=500;soldier.hp=soldier.maxHp*.2;soldier.medCooldown=0;delete soldier.pocketPotion;
let fired=0,lastGold=soldier.gold;
for(let i=0;i<1200&&fired<3;i++){game.monsters=[];game.update(.05);if(soldier.gold<lastGold){fired++;lastGold=soldier.gold;}}
assert.ok(fired>=1,'the real loop uses the potion on a hurt soldier');
// force repeated danger: the loop can use it at most 3 times in this phase
const usesBefore=soldier.pocketPotion?.used||0;assert.ok(usesBefore>=1&&usesBefore<=3);
for(let i=0;i<400;i++){soldier.hp=soldier.maxHp*.1;soldier.isDown=false;game.monsters=[];game.update(.05);if((soldier.pocketPotion?.used||0)>=3)break;}
const goldAfter3=soldier.gold;assert.equal(soldier.pocketPotion.used,3);
for(let i=0;i<400;i++){soldier.hp=soldier.maxHp*.1;game.monsters=[];game.update(.05);}
assert.equal(soldier.pocketPotion.used,3,'never more than 3 in one wave');
// saving keeps the counter; loading keeps it; the next wave refills
const snapshot=JSON.parse(JSON.stringify(game.saveGame({immediate:true})));
const saved=snapshot.squad.find(s=>s.id===soldier.id);const wave=game.phase;assert.deepEqual(saved.pocketPotion,{phase:wave,used:3});
game.resumeSavedGame(snapshot);const again=game.squad.find(s=>s.id===soldier.id);assert.equal(pocketPotionLeft(again,game.phase),0,'still empty after loading');
game.phase=wave+1;assert.equal(pocketPotionLeft(again,game.phase),3,'next wave: 3 again');
// an old save (no field at all) starts with 3
delete snapshot.squad.find(s=>s.id===soldier.id).pocketPotion;game.resumeSavedGame(snapshot);assert.equal(pocketPotionLeft(game.squad.find(s=>s.id===soldier.id),game.phase),3);
console.log('pocket-potion v7.0.28: 30% / 3 per wave / 8G / old saves passed');
