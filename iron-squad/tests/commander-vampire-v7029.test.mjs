import assert from 'node:assert/strict';
// v7.0.29: the commander's lifesteal obeys the soldiers' cap (1.5% of max HP per hit, once per 0.25 s); the warlord bonus is +5% (was +5 = 500%).
{let s=20261019;Math.random=()=>((s=Math.imul(s^(s>>>15),2246822507)+0x9e3779b9|0)>>>0)/4294967296;}
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
globalThis.window={};globalThis.document={getElementById:()=>null};
const {IronSquadGame}=await import('../js/index.js');
const {saveSlots}=await import('../js/save-slots.js');
const fx=await import('../js/equipment-effects.js');
const F=83000,noop=()=>{};
const game=Object.create(IronSquadGame);
for(const m of ['updateStatsUI','updateQuestUI','startGameLoop','showToast','spawnDamageText','spawnSparks','renderStrategyUI','refreshSupplyUI'])game[m]=noop;
game.activeSlotId=saveSlots.create('COMMANDER VAMPIRE').id;game.startFreshGame(false);
const p=()=>game.player;

// ---- constants / pure function
assert.deepEqual({...fx.COMMANDER_VAMPIRE},{maxRate:.25,perHitMaxHpShare:.015,minInterval:.25,warlordBonus:.05},'same per-hit share and interval as soldiers; rate cap 25% so 20%+5% both count');
assert.equal(fx.SOLDIER_VAMPIRE.maxRate,.2,'soldiers stay at 20%');
{const u={hp:500000,maxHp:1000000,vampire:.2};
  assert.equal(fx.commanderVampireHeal(u,1e9,1),15000,'per-hit heal capped at 1.5% of max HP');
  assert.equal(u.hp,515000);
  assert.equal(fx.commanderVampireHeal(u,1e9,1.1),0,'at most one heal per 0.25 s');
  assert.equal(fx.commanderVampireHeal(u,1e9,1.26),15000,'heals again after 0.25 s');
  assert.equal(fx.commanderVampireHeal({hp:1,maxHp:1e6,vampire:.2},100,0),20,'below the cap the rate applies: ceil(100 x 20%)');
  assert.equal(fx.commanderVampireHeal({hp:1,maxHp:1e6,vampire:.25},100,0),25,'warlord 25% is not clamped back to 20%');
  assert.equal(fx.commanderVampireHeal({hp:1,maxHp:1e6,vampire:5},100,0),25,'the old +5 (500%) would now clamp to 25%');
  assert.equal(fx.commanderVampireHeal({hp:1e6,maxHp:1e6,vampire:.2},100,0),0,'full HP');
  assert.equal(fx.commanderVampireHeal({hp:0,maxHp:1e6,vampire:.2},100,0),0,'down');
  const reload={hp:1,maxHp:1e6,vampire:.2,_vampireReadyAt:9999};
  assert.equal(fx.commanderVampireHeal(reload,100,5),20,'a ready time far in the future (clock reset by a load) does not block healing');
  // soldiers are unchanged
  assert.equal(fx.soldierVampireHeal({hp:500,maxHp:1000,vampire:5},60,0),12,'soldier rate still capped at 20%');}

// ---- commander stats: amulet 20%, warlord +5%
const amulet=vamp=>({id:'cv1',type:'AMULET',tier:20,stats:{vampire:vamp,speed:10,atkSpeed:10},upgrade:0,equipHpVersion:1,strengthReqVersion:1});
const setup=(warlord,vamp)=>{game.rankIndex=5;Object.assign(p(),{level:30,survivedWaves:15,minionKills:3000,bossKills:3,isAdvanced:warlord});p().attributeProfile.practice.strength=1e7;game.equipped={weapon:game.equipped.weapon,amulet:vamp?amulet(vamp):undefined};if(!vamp)delete game.equipped.amulet;game.recalcPlayerStats();};
setup(false,.2);assert.equal(p().vampire,.2,'non-warlord with the T19+ amulet: 20%');
setup(true,.2);assert.ok(Math.abs(p().vampire-.25)<1e-9,'warlord: 20% + 5% = 25% (was 520%)');
setup(true,0);assert.ok(Math.abs(p().vampire-.05)<1e-9,'warlord without an amulet: 5% (was 500%)');
setup(false,0);assert.equal(p().vampire,0,'non-warlord without an amulet: 0');
setup(true,.9);assert.equal(p().vampire,.25,'total capped at 25%');
assert.ok(p().vampire-0.2>0&&setup(false,.2)===undefined&&p().vampire<.25,'warlord is stronger than a non-warlord by 5 points');

// ---- in a real attack (normal hit, crit, and the magic follow-up that comes right after)
const dummy=()=>({type:'goblin',x:F+25,y:F,hp:1e12,maxHp:1e12,atk:0,def:0,radius:12,speed:0,atkTimer:1000});
const hit=(roll,warlord)=>{setup(warlord,.2);Object.assign(game,{monsters:[],projectiles:[],worldTime:100+Math.random()});Object.assign(p(),{x:F,y:F,atkCooldown:1000,hp:Math.floor(p().maxHp*.3),_vampireReadyAt:0});
  const before=p().hp,saved=Math.random;Math.random=()=>roll;game.performAttack(p(),dummy(),true,1e9,false);Math.random=saved;return {gain:p().hp-before,max:p().maxHp,atk:p().atk};};
for(const roll of [.99,.0001])for(const warlord of [false,true]){
  const r=hit(roll,warlord);
  assert.ok(r.gain>0,'a commander hit heals (roll '+roll+')');
  assert.ok(r.gain<=Math.ceil(r.max*.015),'a hit (crit or not) heals at most 1.5% of max HP: '+r.gain+' / '+r.max);}
{const r=hit(.99,true);assert.ok(r.gain===Math.ceil(r.max*.015),'with a huge hit the heal is exactly the cap ('+r.gain+')');}
// second hit inside 0.25 s heals nothing; after 0.25 s it heals again
{setup(true,.2);Object.assign(game,{monsters:[],projectiles:[],worldTime:500});Object.assign(p(),{x:F,y:F,atkCooldown:1000,hp:Math.floor(p().maxHp*.3),_vampireReadyAt:0});
  const saved=Math.random;Math.random=()=>.99;
  let b=p().hp;game.performAttack(p(),dummy(),true,1e9,false);const first=p().hp-b;
  b=p().hp;game.worldTime=500.1;game.performAttack(p(),dummy(),true,1e9,false);const second=p().hp-b;
  b=p().hp;game.worldTime=500.3;game.performAttack(p(),dummy(),true,1e9,false);const third=p().hp-b;Math.random=saved;
  assert.ok(first>0&&second===0&&third>0,`0.25 s interval: ${first} / ${second} / ${third}`);}

console.log('commander-vampire v7.0.29 ok');