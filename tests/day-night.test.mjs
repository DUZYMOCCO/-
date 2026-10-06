import assert from 'node:assert/strict';
import {daylightAt,advanceWorldClock,periodEnemy,PERIOD_ENEMIES,enemyAvailable} from '../js/games/iron-squad/day-night.js';
import {saveSlots} from '../js/games/iron-squad/save-slots.js';
import {drawFieldMob} from '../js/games/iron-squad/visuals.js';
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
globalThis.window={};globalThis.document={getElementById:()=>null};
const {IronSquadGame}=await import('../js/games/iron-squad/index.js');
assert.equal(daylightAt(0).clock,'06:00');assert.equal(daylightAt(239.99).period,'day');
assert.equal(daylightAt(240).period,'night');assert.equal(daylightAt(240).clock,'18:00');
assert.equal(daylightAt(480).period,'day');assert.equal(daylightAt(480).day,2);
assert.equal(daylightAt(230).label,'夕暮れ');assert.equal(daylightAt(470).label,'夜明け');
assert.ok(Math.abs(daylightAt(239.999).darkness-daylightAt(240).darkness)<.001);
assert.ok(Math.abs(daylightAt(479.999).darkness-daylightAt(480).darkness)<.001);
assert.ok(daylightAt(300).darkness<=.3,'night remains readable');
const clock={inBattle:true,worldTime:239};assert.equal(advanceWorldClock(clock,1),true);
clock.inBattle=false;advanceWorldClock(clock,999);assert.equal(clock.worldTime,240);
clock.inBattle=true;assert.equal(advanceWorldClock(clock,NaN),false);
const game=Object.create(IronSquadGame);
for(const method of ['recalcSoldierStats','recalcPlayerStats','updateStatsUI','updateQuestUI','startGameLoop','showToast','spawnSparks','spawnDamageText','renderStrategyUI'])game[method]=()=>{};
game.activeSlotId=saveSlots.create('昼夜検証').id;game.startFreshGame(false);assert.equal(game.worldTime,0);
const random=Math.random;
try {
 Math.random=()=>.1;
 for(const period of ['day','night'])for(const [zoneId,def] of Object.entries(PERIOD_ENEMIES[period])) {
  game.worldTime=period==='day'?0:240;game.monsters=[];
  const distance={ZONE_PEACE:400,ZONE_WILD:1500,ZONE_CHAOS:3000,ZONE_ABYSS:5000}[zoneId];
  game.spawnMonster(5400+distance,5400);
  assert.equal(game.monsters[0].type,def.type);assert.equal(game.monsters[0].activePeriod,period);
  assert.equal(game.monsters[0].lootDistance,distance);
  assert.ok(!enemyAvailable(game.monsters[0],period==='day'?'night':'day'));
 }
} finally {Math.random=random;}
assert.equal(periodEnemy('ZONE_PEACE',0,()=>.9),null,'common enemies remain available');
const day={hp:55,type:'wild_boar',activePeriod:'day'},common={hp:123,type:'dragon',isBoss:true},night={hp:88,type:'shade_wolf',activePeriod:'night'};
game.worldTime=240;game.monsters=[day,common];game.restMonsters=[day,common,night];game.projectiles=[{target:day},{target:common}];
const gold=game.gold,exp=game.exp;game.changeTimePeriod();
assert.deepEqual(game.monsters,[common]);assert.deepEqual(game.restMonsters,[common,night]);assert.equal(game.projectiles.length,1);
game.killMonster(day,game.player,true);assert.equal(game.gold,gold);assert.equal(game.exp,exp,'retreat awards no kill rewards');
game.restTimer=5;game.restUpgradeClock=0;game.update(.5);assert.equal(game.worldTime,240.5,'clock advances during active rest');
game.saveGame();const saved=saveSlots.get(game.activeSlotId).data;game.resumeSavedGame(saved);
assert.equal(game.worldTime,240.5);assert.equal(game.restTimer,4.5);assert.equal(game.monsters.length,0);
assert.ok(game.restMonsters.every(m=>m.activePeriod!=='day'));
game.restTimer=0;game.worldTime=300;game.saveGame();game.resumeSavedGame(saveSlots.get(game.activeSlotId).data);
assert.equal(daylightAt(game.worldTime).period,'night');assert.ok(game.monsters.every(m=>m.activePeriod!=='day'));
// All six distinct silhouettes render with balanced canvas state.
let depth=0,draws=0;const context=new Proxy({save(){depth++;},restore(){depth--;}},{get:(o,k)=>k in o?o[k]:(()=>{draws++;})});
for(const def of [...Object.values(PERIOD_ENEMIES.day),...Object.values(PERIOD_ENEMIES.night)]) {
 assert.equal(drawFieldMob(context,{...def,x:1,hitPulse:0},100),true);assert.equal(depth,0);
}
assert.ok(draws>50);
console.log('PASS: 4-minute day/night, smooth twilight, period-specific regional enemies, no retreat rewards, rest/meeting clocks, save/resume, six silhouettes');
