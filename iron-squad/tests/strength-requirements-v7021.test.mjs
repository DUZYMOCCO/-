import assert from 'node:assert/strict';
// v7.0.21: much stricter, strictly increasing strength requirements; strength cap 500; worn pieces are grandfathered; migration runs once.
{let s=20261017;Math.random=()=>((s=Math.imul(s^(s>>>15),2246822507)+0x9e3779b9|0)>>>0)/4294967296;}
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
globalThis.window={};globalThis.document={getElementById:()=>null};
const {IronSquadGame,generateRandomDrop,applyUpgradeStats}=await import('../js/index.js');
const {saveSlots}=await import('../js/save-slots.js');
const {requiredDefenseStrength,armorStrengthCurve,legacyDefenseStrength}=await import('../js/defense-equipment.js');
const {weaponStrengthByTier,requiredWeaponStrength,canUseEquipment,canUseWeapon,migrateStrengthRequirement,effectiveStrengthRequirement,equipmentRequirementText,usableSupplyTier,strengthShortfall}=await import('../js/weapon-requirements.js');
const {attributeValues,cappedAttributeValue,cappedStrengthValue,effectiveStrength,attributeMultipliers,ATTRIBUTE_RULES,evasionChance}=await import('../js/unit-attributes.js');
const {recalcAmmoCapacity}=await import('../js/supply-rules.js');
const DEFENSE=['ARMOR','SHIELD','HELMET','LEGS','GLOVES'];
const commander=(lv,practice=0)=>({isPlayer:true,level:lv,attributeProfile:{version:1,family:'COMMANDER',innate:{strength:50,magic:18,magicDefense:8,quickness:20,evasion:2},aptitudes:{strength:1,magic:1,magicDefense:1,quickness:1,evasion:1},practice:{strength:practice,magic:0,magicDefense:0,travel:0,evasion:0}}});

// --- table: monotonic, within the cap, spot values
for(const type of DEFENSE){
  for(let t=2;t<=28;t++)assert.ok(requiredDefenseStrength({type,tier:t})>=requiredDefenseStrength({type,tier:t-1}),`${type} T${t} must not drop`);
}
for(let t=6;t<=28;t++)assert.ok(requiredDefenseStrength({type:'ARMOR',tier:t})>requiredDefenseStrength({type:'ARMOR',tier:t-1}),'armour is strictly increasing from T5 (mithril no longer easier than steel)');
assert.ok(requiredDefenseStrength({type:'ARMOR',tier:17})>requiredDefenseStrength({type:'ARMOR',tier:16}),'the old mithril-below-steel inversion is gone');
assert.deepEqual([5,9,13,17,19,20,24,28].map(t=>requiredDefenseStrength({type:'ARMOR',tier:t})),[10,48,107,177,215,230,269,300]);
assert.deepEqual([1,2,3,4].map(t=>requiredDefenseStrength({type:'ARMOR',tier:t})),[0,0,0,0],'wood tiers stay free');
assert.deepEqual(['SHIELD','HELMET','LEGS','GLOVES','AMULET'].map(type=>requiredDefenseStrength({type,tier:28})),[240,195,165,135,0],'slot coefficients .8/.65/.55/.45/0 kept');
assert.equal(requiredDefenseStrength({type:'ARMOR',tier:28,armorStyle:'ward'}),3,'robe fixed values untouched');
assert.equal(requiredDefenseStrength({type:'ARMOR',tier:28,heroOnly:true}),0);
for(let t=1;t<=28;t++)for(const type of DEFENSE)assert.ok(requiredDefenseStrength({type,tier:t})<=ATTRIBUTE_RULES.strengthCap);
// weapons
for(const style of ['sword','spear','hammer','axe'])for(let t=2;t<=28;t++)assert.ok(weaponStrengthByTier(style,t)>=weaponStrengthByTier(style,t-1),`${style} T${t}`);
assert.deepEqual(['sword','spear','hammer','axe'].map(s=>weaponStrengthByTier(s,1)),[18,24,32,32],'never below the old T1 values');
assert.deepEqual(['sword','spear','hammer','axe'].map(s=>weaponStrengthByTier(s,28)),[240,270,300,300]);
for(const style of ['bow','crossbow','cannon','staff','wand'])assert.equal(weaponStrengthByTier(style,28),0,style+' needs no strength');
assert.equal(requiredWeaponStrength({type:'WEAPON',weaponStyle:'hammer',tier:19}),215);
// fresh items are rebuilt with the new minStrength and stamped
const hammer=generateRandomDrop(0,'normal',{type:'WEAPON',weaponStyle:'hammer',tier:15,upgrade:0,quality:1,merchant:true,random:()=>.5});
assert.equal(hammer.minStrength,141);assert.equal(hammer.strengthReqVersion,1);assert.equal(requiredWeaponStrength(hammer),141);

// --- strength cap 500: unchanged below the join, never runaway
for(const p of [0,50,100,150,220,260,300])assert.equal(cappedStrengthValue(p,1,0),cappedAttributeValue(p,1,0),'values reached before v7.0.21 stay exactly the same: '+p);
assert.equal(attributeValues(commander(28,1800)).strength,183,'commander Lv28 + training is still 183');
assert.ok(cappedStrengthValue(1000)>cappedAttributeValue(1000)&&cappedStrengthValue(1000)>255,'beyond the join it keeps growing past 255');
let prev=0;for(const p of [300,320,400,600,1000,5000,1e6,1e12]){const v=cappedStrengthValue(p);assert.ok(v>=prev&&v<=500);prev=v;}
assert.equal(cappedStrengthValue(1e12),500);
const maxed=commander(100000,1e12);const maxedValues=attributeValues(maxed);
assert.equal(maxedValues.strength,500);for(const key of ['magic','magicDefense','quickness','evasion'])assert.equal(maxedValues[key],255,key+' keeps the 255 cap');
assert.equal(evasionChance(100),Math.min(99,100*.36+7.2*(100/255)**4),'dodge formula still scales against 255');
// no runaway: damage / knockback / ammo only count a share of strength above 255
assert.equal(effectiveStrength(255),255);assert.equal(effectiveStrength(100),100);assert.equal(effectiveStrength(500),255+245*.3);
const m255=attributeMultipliers({...commander(1),isPlayer:true},{strength:255}).physical,m500=attributeMultipliers({...commander(1),isPlayer:true},{strength:500}).physical;
assert.ok(m500>m255&&m500<m255*1.35,'ATK multiplier at 500 is only ~29% above 255 (not x2)');
{const archer={soldierClass:'ARCHER',equipped:{weapon:{weaponStyle:'bow'}},strength:500,level:1};const cap500=recalcAmmoCapacity(archer);archer.strength=255;const cap255=recalcAmmoCapacity(archer);assert.ok(cap500>=cap255);}

// --- who can wear what (commander Lv28 + normal training = 183)
const maxTier=(strength,type)=>{let best=0;for(let t=1;t<=28;t++)if(requiredDefenseStrength({type,tier:t})<=strength)best=t;return best;};
assert.equal(maxTier(183,'ARMOR'),17,'Lv28 commander with 183 cannot wear T18+ armour');
assert.ok(requiredDefenseStrength({type:'ARMOR',tier:19})>183);
assert.equal(maxTier(attributeValues(commander(28,10000)).strength,'ARMOR'),19,'training unlocks T19');
assert.equal(maxTier(attributeValues(commander(60,40000)).strength,'ARMOR'),28,'top level + heavy training reaches T28 armour');
assert.equal(maxTier(attributeValues(commander(100,0)).strength,'ARMOR'),28);
assert.ok(attributeValues(commander(100,0)).strength>=Math.max(...DEFENSE.map(type=>requiredDefenseStrength({type,tier:28}))),'every T28 piece is reachable');

// --- game: grandfathering and one-time migration
const game=Object.create(IronSquadGame);
for(const m of ['updateStatsUI','updateQuestUI','startGameLoop','showToast','spawnDamageText','spawnSparks','renderStrategyUI','refreshSupplyUI'])game[m]=()=>{};
game.activeSlotId=saveSlots.create('STRENGTH REQ').id;game.startFreshGame(false);
const p=game.player;p.level=28;p.attributeProfile.practice.strength=1800;game.recalcPlayerStats();
assert.equal(p.strength,183);
const legacyArmor=()=>{const item=generateRandomDrop(0,'normal',{type:'ARMOR',tier:19,upgrade:0,quality:1,armorStyle:null,merchant:true,random:()=>.5,id:'old-armor'});
  delete item.strengthReqVersion;delete item.legacyStrength;item.equipHpVersion=1;item.minStrength=legacyDefenseStrength(item);return item;};
const oldArmor=legacyArmor();assert.equal(legacyDefenseStrength(oldArmor),46);
assert.equal(canUseEquipment(p,oldArmor),false,'a fresh T19 armour is out of reach at 183');
// a piece worn before the update stays on
game.equipped.armor=oldArmor;game.recalcPlayerStats();
assert.equal(game.equipped.armor,oldArmor,'worn T19 armour is not taken off');
assert.equal(oldArmor.legacyStrength,46);assert.equal(oldArmor.strengthReqVersion,1);assert.equal(requiredDefenseStrength(oldArmor),215);
assert.equal(effectiveStrengthRequirement(p,oldArmor),46);assert.equal(canUseEquipment(p,oldArmor),true);
assert.match(equipmentRequirementText(p,oldArmor),/必要筋力46.*装備可/);
// take it off: the new table applies
game.equipped.armor=null;
assert.equal(effectiveStrengthRequirement(p,oldArmor),215);assert.equal(canUseEquipment(p,oldArmor),false);
assert.equal(game.equipItem(oldArmor),false,'cannot put it back on');
assert.deepEqual(strengthShortfall(p,oldArmor),{required:215,current:183});
assert.match(equipmentRequirementText(p,oldArmor),/筋力不足（必要215／現在183）/);
// bag items never keep the old requirement
{const bag=legacyArmor();migrateStrengthRequirement(bag,false);assert.equal(bag.legacyStrength,undefined);assert.equal(bag.strengthReqVersion,1);}
// weapon migration: once, no double application
{const old=generateRandomDrop(0,'normal',{type:'WEAPON',weaponStyle:'hammer',tier:15,upgrade:0,quality:1,merchant:true,random:()=>.5,id:'old-hammer'});
  delete old.strengthReqVersion;old.minStrength=Math.ceil(32+(old.tier>1?(1+(old.tier-1)*6/27-1)*10:0));const before=old.minStrength;
  migrateStrengthRequirement(old,true);assert.equal(old.minStrength,141);assert.equal(old.legacyStrength,before);assert.ok(before<141);
  const snapshot=JSON.stringify(old);migrateStrengthRequirement(old,true);migrateStrengthRequirement(old,true);assert.equal(JSON.stringify(old),snapshot,'a second run changes nothing');
  assert.equal(effectiveStrengthRequirement({id:'x',equipped:{weapon:old}},old),before,'only the wielder keeps the old value');
  assert.equal(effectiveStrengthRequirement({id:'y',equipped:{}},old),141);}
// worn weapon and soldier keep working after the update
{const hammerOld=generateRandomDrop(0,'normal',{type:'WEAPON',weaponStyle:'hammer',tier:15,upgrade:0,quality:1,merchant:true,random:()=>.5,id:'worn-hammer'});
  delete hammerOld.strengthReqVersion;hammerOld.minStrength=60;game.equipped.weapon=hammerOld;game.recalcPlayerStats();
  assert.equal(game.equipped.weapon,hammerOld);assert.equal(hammerOld.minStrength,141);assert.equal(hammerOld.legacyStrength,60);assert.equal(canUseEquipment(p,hammerOld),true);
  const soldier=game.squad[0];soldier.attributeProfile.practice.strength=1e7;
  const armor=legacyArmor();armor.id='soldier-old-armor';soldier.equipped.armor=armor;game.recalcSoldierStats(soldier);game.recalcSoldierStats(soldier);
  assert.equal(soldier.equipped.armor,armor,'soldier keeps the worn piece through repeated recalculations');}
// save round trip keeps the grandfathered state and does not re-migrate
{const saved=JSON.parse(JSON.stringify(game.saveGame({immediate:true})));game.resumeSavedGame(saved);
  assert.equal(game.equipped.weapon.minStrength,141);assert.equal(game.equipped.weapon.legacyStrength,60);assert.equal(game.equipped.weapon.strengthReqVersion,1);}

// --- supply never degrades into ward robes: the best wearable tier is issued
{const rookie=game.squad.find(s=>s.soldierClass==='HEAVY')||game.squad[0];rookie.soldierClass='HEAVY';rookie.level=1;rookie.attributeProfile.practice.strength=0;game.recalcSoldierStats(rookie);
  const strength=attributeValues(rookie).strength;
  for(const type of ['ARMOR','SHIELD','HELMET','LEGS','GLOVES']){
    const tier=usableSupplyTier(rookie,type,20);assert.ok(tier>=1&&tier<20);assert.equal(canUseEquipment(rookie,{type,tier}),true);
    if(tier<28)assert.equal(canUseEquipment(rookie,{type,tier:tier+1}),false,type+' next tier is out of reach');
    const item=game.createSupplyEquipment(type,rookie,tier);assert.equal(item.armorStyle,undefined,'no ward robe for a fighter ('+type+')');assert.ok(canUseEquipment(rookie,item));
    assert.ok(requiredDefenseStrength(item)<=strength);
  }
  const weapon=game.createSupplyEquipment('WEAPON',rookie,usableSupplyTier(rookie,'WEAPON',20));assert.ok(!['staff','wand'].includes(weapon.weaponStyle),'no staff for a fighter');assert.equal(canUseEquipment(rookie,weapon),true);
  const mage=game.createNewSoldier(null,{classKey:'MAGE'});assert.equal(usableSupplyTier(mage,'ARMOR',20),20,'casters keep their robes at any tier');}

// --- one log line / toast when pieces come off for lack of strength
{const logs=[],toasts=[];game.recordBattleLog=t=>logs.push(t);game.showToast=t=>toasts.push(t);
  const weak=game.squad[1];weak.equipped.armor=null;weak.equipped.helmet=null;
  const a=generateRandomDrop(0,'normal',{type:'ARMOR',tier:26,upgrade:0,quality:1,armorStyle:null,merchant:true,random:()=>.5,id:'big-armor'}),h=generateRandomDrop(0,'normal',{type:'HELMET',tier:26,upgrade:0,quality:1,armorStyle:null,merchant:true,random:()=>.5,id:'big-helmet'});
  const bag=[];weak.attributeProfile.practice.strength=0;weak.level=1;
  const equipment={armor:a,helmet:h,weapon:weak.equipped.weapon};
  game._strengthToastAt=0;game.returnUnusableDefense(weak,equipment,bag);
  assert.equal(bag.length,2);assert.equal(equipment.armor,null);assert.equal(equipment.helmet,null);
  assert.equal(logs.length,1,'one summary line, not one per piece');assert.match(logs[0],/筋力不足で2点（.+・.+）を共有箱へ戻しました/);
  assert.equal(toasts.length,1);assert.match(toasts[0],/筋力不足で2点を共有箱へ戻しました/);
  const bag2=[];const own={armor:generateRandomDrop(0,'normal',{type:'ARMOR',tier:26,upgrade:0,quality:1,armorStyle:null,merchant:true,random:()=>.5,id:'big-armor2'})};
  game.player.level=1;game.player.attributeProfile.practice.strength=0;game.returnUnusableDefense(game.player,own,bag2);assert.equal(logs.length,2);assert.match(logs[1],/隊長は筋力不足で1点.+バッグへ戻しました/);assert.equal(toasts.length,2);}
console.log('strength-requirements-v7021 ok');
