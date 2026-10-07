import assert from 'node:assert/strict';
import {EQUIPMENT_TYPES,lowValueIds,chooseLootTier,distanceScaling,compareEquipment,shrineUpgradeCap,equipmentScore} from '../js/games/iron-squad/equipment-rules.js';
globalThis.window={};globalThis.document={getElementById:()=>null};
const {IronSquadGame,applyUpgradeStats,generateRandomDrop,SLOT_INFO}=await import('../js/games/iron-squad/index.js');
const item=(id,type='WEAPON',tier=1,upgrade=0)=>{const i={id,type,tier,name:id,stats:{}};applyUpgradeStats(i,upgrade);return i;};
const game=Object.create(IronSquadGame);
for(const method of ['saveGame','renderStrategyUI','updateStatsUI','showToast','recalcPlayerStats','recalcSoldierStats'])game[method]=()=>{};
game.equipped={};game.inventory=[];game.reserves=[];game.squad=[{id:'soldier',name:'兵士',gold:0,equipped:{}}];
// Every slot can be transferred, and the item stops belonging to the hero.
for(const type of EQUIPMENT_TYPES){const i=item(type,type);const key=SLOT_INFO[type].key;game.equipped[key]=i;game.inventory.push(i);game.giveItemToSoldier('soldier',i);assert.equal(game.equipped[key],null);assert.equal(game.squad[0].equipped[key],i);assert.ok(!game.inventory.includes(i));}
const old=game.squad[0].equipped.weapon;applyUpgradeStats(old,3);
const better=item('better','WEAPON',2);game.inventory.push(better);game.giveItemToSoldier('soldier',better);
assert.equal(better.upgrade,3);assert.ok(game.inventory.includes(old));
assert.equal(game.giveItemToSoldier('soldier',item('ghost')),false);
const reserved=item('reserve');game.reserves=[{equipped:{weapon:reserved}}];game.inventory.push(reserved);
assert.equal(game.giveItemToSoldier('soldier',reserved),false);
const favorite=item('favorite');favorite.favorite=true;const junk=item('junk');const orb={id:'orb',type:'ORB',tier:5};
game.inventory.push(favorite,junk,junk,orb,better);game.gold=0;
assert.deepEqual(game.sellInventoryItems(game.inventory.map(i=>i.id)),{count:2,value:40});
assert.equal(game.gold,40);assert.ok(game.inventory.includes(favorite));assert.ok(game.inventory.includes(reserved));assert.ok(game.inventory.includes(orb));assert.ok(game.inventory.includes(better));
// Keep the best candidate per type, protected pieces, and enhanced items.
const best=item('best','HELMET',2),copy=item('copy','HELMET',2),weak=item('weak','HELMET'),enhanced=item('enhanced','HELMET',1,1);
assert.deepEqual(lowValueIds([best,copy,weak,enhanced],{},[],2),['copy','weak']);
assert.deepEqual(lowValueIds([best],{},[{equipped:{helmet:item('soldierBest','HELMET',3)}}],2),[]);
assert.equal(compareEquipment(best,weak).label,'強くなる');assert.equal(compareEquipment(weak,best).label,'弱くなる');
assert.equal(compareEquipment({stats:{atk:10,def:5}},{stats:{atk:5,def:10}}).label,'一長一短');
assert.equal(compareEquipment(best,best).label,'同等');
assert.ok(equipmentScore(best)>equipmentScore(weak),'stronger item has higher score');
assert.ok(equipmentScore(enhanced)>equipmentScore(weak),'enhanced item has higher score than base');
// Exhaust the random interval: local loot is capped regardless of enemy category.
for(const distance of [0,600,1199,1200,2300,2699,2700,3800,4399,4400,5199,5200,6000,7400]) {
 for(const kind of ['normal','chest','elite','boss','colossal']) {
  const max=distance<1200?2:distance<2300?3:distance<2700?(kind==='boss'||kind==='elite'?4:3):distance<3800?4:distance<4400?(kind==='boss'||kind==='elite'?5:4):distance<5200?(kind==='colossal'?6:5):distance<6000?6:(kind==='colossal'?7:6);
  for(let n=0;n<1000;n++)assert.ok(chooseLootTier(distance,kind,()=>n/1000)<=max,`${distance} ${kind}`);
 }
 const a=distanceScaling(distance,1),b=distanceScaling(distance,9999);assert.ok(b.hp<=a.hp*1.6+.00001);
}
for(const d of [600,1200,2700,4400])assert.ok(Math.abs(distanceScaling(d-.001).hp-distanceScaling(d+.001).hp)<.001);
assert.ok(distanceScaling(5000).atk>distanceScaling(500).atk*5);
for(let n=0;n<300;n++){const i=generateRandomDrop(400,'chest');assert.ok(i.tier<=2);assert.ok(i.rollMult!=null&&Number.isFinite(i.rollMult));const expected={id:'expected',type:i.type,tier:i.tier,name:i.baseName||i.name,baseName:i.baseName,weaponStyle:i.weaponStyle,rollMult:i.rollMult,powerSkip:i.powerSkip||0,forgeTag:i.forgeTag||null,stats:{}};applyUpgradeStats(expected,i.upgrade);assert.deepEqual(i.stats,expected.stats);const rm=i.rollMult;applyUpgradeStats(i,i.upgrade);assert.equal(i.rollMult,rm);}
// Spawn difficulty is spatial even at a late phase; rewards retain habitat.
game.monsters=[];game.phase=9999;game.spawnMonster(5800,5400);const near=game.monsters[0];assert.equal(near.lootDistance,400);assert.ok(near.atk<=20);
game.initOutposts();assert.ok(game.outposts[8].maxHp>game.outposts[0].maxHp*3);
assert.equal(shrineUpgradeCap(900),2);assert.equal(shrineUpgradeCap(3900),8);
game.spawnSparks=()=>{};game.currentQuest=null;
const shrine=game.outposts.find(o=>o.type==='SHRINE');const blessed=item('blessed');game.equipped={weapon:blessed};game.squad=[];
for(let n=0;n<10;n++)game.clearOutpost(shrine);assert.equal(blessed.upgrade,2);
applyUpgradeStats(blessed,7);game.clearOutpost(shrine);assert.equal(blessed.upgrade,7,'existing stronger gear is not downgraded');
game.dropsOnField=[];game.wave=9999;game.clearOutpost(game.outposts[0]);assert.equal(game.dropsOnField.length,3);assert.ok(game.dropsOnField.every(drop=>drop.item.tier<=2),'late-phase local fort still drops beginner gear');
console.log('PASS: all 7 transfers, ownership, protected bulk sale, surplus retention, equipment comparisons, spatial loot caps, bounded difficulty');
