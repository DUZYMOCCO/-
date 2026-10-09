// Price contract: 87427d5 (v1.17.9). Spatial bands: d99cea4. Unlimited forging: 29c4095 (v1.20.3).
import assert from 'node:assert/strict';
import {WORLD_SIZE} from '../js/games/iron-squad/world.js';
import {EQUIPMENT_TYPES,lowValueIds,chooseLootTier,distanceScaling,compareEquipment,shrineUpgradeCap,equipmentScore,saleValue} from '../js/games/iron-squad/equipment-rules.js';
import {rollAttributeProfile} from '../js/games/iron-squad/unit-attributes.js';
globalThis.window={};globalThis.document={getElementById:()=>null};
const {IronSquadGame,applyUpgradeStats,generateRandomDrop,SLOT_INFO}=await import('../js/games/iron-squad/index.js');
const item=(id,type='WEAPON',tier=1,upgrade=0)=>{const i={id,type,tier,name:id,stats:{}};applyUpgradeStats(i,upgrade);return i;};
const game=Object.create(IronSquadGame);
for(const method of ['saveGame','renderStrategyUI','updateStatsUI','showToast','recalcPlayerStats','recalcSoldierStats'])game[method]=()=>{};
game.equipped={};game.inventory=[];game.reserves=[];game.squad=[{id:'soldier',name:'兵士',gold:0,equipped:{},attributeProfile:rollAttributeProfile('HEAVY','AVERAGE',()=>.5,true)}];
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
assert.equal(saleValue(junk),26);assert.equal(saleValue(old),50,'T1+3 returned weapon is also selected for sale');
assert.deepEqual(game.sellInventoryItems(game.inventory.map(i=>i.id)),{count:2,value:76});
assert.equal(game.gold,76);assert.ok(game.inventory.includes(favorite));assert.ok(game.inventory.includes(reserved));assert.ok(game.inventory.includes(orb));assert.ok(game.inventory.includes(better));
// Keep the best candidate per type, protected pieces, and enhanced items.
const best=item('best','HELMET',2),copy=item('copy','HELMET',2),weak=item('weak','HELMET'),enhanced=item('enhanced','HELMET',1,1);
assert.deepEqual(lowValueIds([best,copy,weak,enhanced],{},[],2),['copy','weak']);
assert.deepEqual(lowValueIds([best],{},[{equipped:{helmet:item('soldierBest','HELMET',3)}}],2),[]);
assert.equal(compareEquipment(best,weak).label,'強くなる');assert.equal(compareEquipment(weak,best).label,'弱くなる');
assert.equal(compareEquipment({stats:{atk:10,def:5}},{stats:{atk:5,def:10}}).label,'一長一短');
assert.equal(compareEquipment(best,best).label,'同等');
assert.ok(equipmentScore(best)>equipmentScore(weak),'stronger item has higher score');
assert.ok(equipmentScore(enhanced)>equipmentScore(weak),'enhanced item has higher score than base');
// Current 158,720m world: regular loot bands use 8k/22k/48k distances. T7 is vault-only.
const capFor=(distance,kind)=>{
  if(kind==='dungeon_vault')return distance<5000?4:distance<8500?6:7;
  if(kind==='colossal')return 6;
  const rare=kind==='boss'||kind==='elite';
  if(distance<8000)return 2;
  if(distance<22000)return rare&&distance>=14000?4:3;
  if(distance<48000)return rare&&distance>=36000?5:4;
  return rare&&distance>=52000?6:5;
};
for(const distance of [0,400,7999,8000,13999,14000,21999,22000,35999,36000,47999,48000,51999,52000,70000]) {
 for(const kind of ['normal','chest','elite','boss','colossal','dungeon_vault']) {
  const tiers=new Set();for(let n=0;n<1000;n++){const tier=chooseLootTier(distance,kind,()=>n/1000);assert.ok(tier<=capFor(distance,kind)*4,`${distance} ${kind}`);tiers.add(tier);}
  tiers.add(chooseLootTier(distance,kind,()=>.999999999));
  assert.ok(tiers.has(capFor(distance,kind)*4),`the top allowed tier is reachable at ${distance} ${kind}`);
  if(kind!=='dungeon_vault')assert.ok([...tiers].every(t=>t<=24),'T25-28 are unavailable outside authored vaults');
 }
 const a=distanceScaling(distance,1),b=distanceScaling(distance,9999);assert.ok(b.hp<=a.hp*1.6+.00001);
}
for(const d of [600,1200,2700,4400,12000,36000,60000])assert.ok(Math.abs(distanceScaling(d-.001).hp-distanceScaling(d+.001).hp)/distanceScaling(d).hp<1e-5,'difficulty is continuous within each ring at every world scale');
for(const d of [8000,22000,48000]){const ratio=distanceScaling(d+.001).hp/distanceScaling(d-.001).hp;assert.ok(ratio>9.9&&ratio<10.1,'crossing a danger ring is an authored tenfold jump');}
assert.ok(distanceScaling(12000).atk>distanceScaling(400).atk*5);
for(let n=0;n<300;n++){
 const i=generateRandomDrop(400,'chest');assert.ok(i.tier<=8);assert.ok(i.rollMult!=null&&Number.isFinite(i.rollMult));
 const expected={id:'expected',type:i.type,tier:i.tier,name:i.baseName||i.name,baseName:i.baseName,weaponStyle:i.weaponStyle,weaponTraits:i.weaponTraits,dropOnly:i.dropOnly,dropOnlyKey:i.dropOnlyKey,rollMult:i.rollMult,powerSkip:i.powerSkip||0,forgeTag:i.forgeTag||null,stats:{}};
 applyUpgradeStats(expected,i.upgrade);assert.deepEqual(i.stats,expected.stats);const rm=i.rollMult;applyUpgradeStats(i,i.upgrade);assert.equal(i.rollMult,rm);
}
// Spawn difficulty is spatial even at a late phase; rewards retain habitat.
game.monsters=[];game.phase=9999;const center=WORLD_SIZE/2;game.spawnMonster(center+400,center);const near=game.monsters[0];assert.equal(near.lootDistance,400);assert.ok(near.atk<=25);
game.spawnMonster(center+30000,center);const far=game.monsters[1];assert.ok(far.maxHp>near.maxHp*10,'real distant encounters retain spatial danger');
game.initOutposts();
const forts=game.outposts.filter(o=>o.type==='FORT').sort((a,b)=>Math.hypot(a.x-center,a.y-center)-Math.hypot(b.x-center,b.y-center));
assert.equal(forts.length,3);assert.ok(forts.every(o=>Math.hypot(o.x-center,o.y-center)<8000),'authored outposts remain in the broad headquarters region');
assert.ok(forts.at(-1).maxHp>forts[0].maxHp,'outer local forts are stronger without crossing a tenfold danger ring');
assert.equal(shrineUpgradeCap(900),Infinity);assert.equal(shrineUpgradeCap(3900),Infinity);
game.spawnSparks=()=>{};game.currentQuest=null;
const shrine=game.outposts.find(o=>o.type==='SHRINE');const blessed=item('blessed');game.equipped={weapon:blessed};game.squad=[];
for(let n=0;n<10;n++){shrine.cleared=false;shrine.hp=shrine.maxHp;game.clearOutpost(shrine);}assert.equal(blessed.upgrade,10);
applyUpgradeStats(blessed,37);shrine.cleared=false;shrine.hp=shrine.maxHp;game.clearOutpost(shrine);assert.equal(blessed.upgrade,38,'stronger gear continues upgrading beyond the retired +30 cap');
game.dropsOnField=[];game.wave=9999;game.clearOutpost(game.outposts[0]);assert.equal(game.dropsOnField.length,3);assert.ok(game.dropsOnField.every(drop=>drop.item.tier<=8),'late-phase local fort still drops beginner gear');
console.log('PASS: all 7 transfers, ownership, protected bulk sale, surplus retention, equipment comparisons, spatial loot caps, bounded difficulty');
