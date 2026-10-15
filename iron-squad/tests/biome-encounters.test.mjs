import assert from 'node:assert/strict';
import {BIOME_ENEMY_PROFILES,ENCOUNTER_TABLES,selectBiomeEncounter,biomeEnemyStats,encounterSlots,castleEncounterChance,updateBiomeCharge} from '../js/biome-encounters.js';
import {ENEMY_ROSTER} from '../js/enemy-art.js';
import {updateRangedEnemy} from '../js/enemy-ranged.js';
import {campaignScaling as distanceScaling} from '../js/campaign-scaling.js';
const C=79360,seen=new Set();let seed=8147;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
assert.equal(Object.keys(BIOME_ENEMY_PROFILES).length,22);
for(let band=0;band<4;band++)for(const [region,dx,dy] of [['east',1,0],['south',0,1],['north',0,-1],['west',-1,0]])for(const [period,time] of [['day',80],['night',320]]){
 const distance=[5000,12000,30000,65000][band],table=ENCOUNTER_TABLES[band][region][period];assert.ok(table.length>=7);
 for(let i=0;i<2000;i++){
  const e=selectBiomeEncounter(C+dx*distance,C+dy*distance,time,random),s=biomeEnemyStats(e,['ZONE_PEACE','ZONE_WILD','ZONE_CHAOS','ZONE_ABYSS'][band]);seen.add(e.type);
  assert.equal(e.region,region);assert.equal(e.band,band);assert.ok(s.rawHp>0&&s.rawAtk>0&&s.speed>0);
  if(period==='day')assert.ok(!['wraith','vampire_bat'].includes(e.type));
  if(e.activePeriod)assert.equal(e.activePeriod,period);
 }
}
for(let i=0;i<5000;i++)seen.add(selectBiomeEncounter(C+42000,C+42000,80,random).type);
for(const e of ENEMY_ROSTER)assert.ok(seen.has(e.id),e.id);
assert.ok(seen.has('demon_front')&&seen.has('demon_rear'));
for(const id of ['slime','goblin','wolf','orc','wyvern','dragon','bone_warrior','shade_wolf','sun_bandit','wild_boar'])assert.ok(seen.has(id),id);
assert.ok(castleEncounterChance(C+42000,C+42000)>castleEncounterChance(C+30000,C+30000));assert.equal(castleEncounterChance(C,C),0);
for(const id of ['wild_dog','snow_wolf','bog_slime','imp','road_archer','lizard_spearman','demon_lancer'])for(let room=1;room<=40;room++){
 const slots=encounterSlots(BIOME_ENEMY_PROFILES[id],room,random);assert.ok(slots.length<=room);if(room>=3)assert.ok(slots.length>=3&&slots.length<=6);
 if(id==='road_archer'&&room>=3){assert.ok(slots.some(s=>s.type==='sun_bandit'&&s.dx>0));assert.ok(slots.some(s=>s.type==='road_archer'&&s.dx<0));}
}
const bull={charge:true,x:0,y:0,speed:66,chargeCooldown:0},chargeGame={wallBlocksEnemyAttack:()=>false};assert.equal(updateBiomeCharge(chargeGame,bull,{x:150,y:0},.1),true);updateBiomeCharge(chargeGame,bull,{x:150,y:0},.1);assert.ok(bull.x>6.6);assert.ok(bull.chargeCooldown>3);
assert.equal(BIOME_ENEMY_PROFILES.harpy.flying,true);assert.equal(BIOME_ENEMY_PROFILES.demon_mage.rangedKind,'demon_mage');
for(const d of [8000,22000,48000])assert.ok(distanceScaling(d).hp>distanceScaling(d-1).hp,'existing boundary jumps remain');
console.log('PASS: 4 distances × 4 biomes × day/night, all 22 new and 10 old types, castle gradient, bounded 3–6 packs/front-rear formations, charge/flying/ranged roles, original strength jumps');

// Drive the real producer: groups must share the global 40-enemy budget.
const {IronSquadGame}=await import('../js/index.js');
const game=Object.create(IronSquadGame);Object.assign(game,{monsters:[],squad:[],player:{x:C,y:C,hp:100,maxHp:100,atk:10,def:0},phase:1,worldTime:80,restTimer:0});
const original=Math.random;try{
 Math.random=random;
 for(let i=0;i<200;i++)game.spawnMonster(C+12000,C);
 assert.equal(game.monsters.length,40);assert.ok(game.monsters.some(m=>m.encounterGroup));
 assert.ok(game.monsters.every(m=>m.hp>0&&m.maxHp===m.hp&&Number.isFinite(m.atk)));
 const had=game.monsters.length;game.spawnMonster(C+12000,C);assert.equal(game.monsters.length,had);
 for(const period of [80,320]){
  game.monsters=[];game.worldTime=period;
  for(let i=0;i<80;i++){game.monsters=[];const m=game.spawnMonster(C-30000,C+2000);if(m?.activePeriod)assert.equal(m.activePeriod,period===80?'day':'night');}
 }
}finally{Math.random=original;}
assert.equal(game.passesWalls({flying:true}),true);
console.log('PASS: real producer caps groups at 40, retains scaled finite stats/period tags and allows new flying enemies');

try{Math.random=()=>.5;game.monsters=[];delete game.player;game.spawnMonster(C+30000,C);assert.equal(game.monsters.length,5,'bare producer can orient a pack toward HQ before a player is attached');}finally{Math.random=original;}
const flightTarget={x:100,y:0,hp:100},flightEnemy={type:'marsh_wisp',flying:true,x:0,y:0,speed:80,atk:5,atkTimer:0};
const flightGame={player:flightTarget,squad:[],projectiles:[],wallBlocksEnemyAttack:()=>false,attackBlocked:from=>from.x<20,dungeonMoveTarget:(u,t)=>t};
updateRangedEnemy(flightGame,flightEnemy,flightTarget,.1);assert.equal(flightGame.projectiles.length,0,'a flying caster moves out of blocked projectile cover before firing');assert.ok(flightEnemy.x>0);
flightEnemy.x=30;updateRangedEnemy(flightGame,flightEnemy,flightTarget,.1);assert.equal(flightGame.projectiles.length,1,'it fires after the projectile line clears');
