import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {TIERS} from '../js/equipment-tiers.js';
import {weaponCombatProfile} from '../js/equipment-rules.js';
import {WEAPON_BASE_ATK_COEF,WEAPON_BASE_ATK_VERSION,WITHDRAWN_COMPENSATED_ATK_VERSION,WITHDRAWN_COMPENSATION_FACTOR,HERO_WEAPON_BASE_ATK_COEF,weaponBaseAtkCoef,legacyHeavyAttackMult} from '../js/growth-rules.js';
// v7.0.18: hidden multipliers stay removed (v7.0.15) but the provisional ATK compensation of v7.0.15-17 is WITHDRAWN:
// a fresh weapon has the same effective ATK as v7.0.14, and saves are converted exactly once without double conversion.
const dom=new JSDOM('<div id="game"></div>',{url:'http://localhost/'});Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame,applyUpgradeStats,generateRandomDrop,migrateWeaponBaseAtk,migrateHeavyWeaponAttack,migrateMeleeWeaponBalance,migrateRangedWeaponBalance}=await import('../js/index.js');
const {applyHeroEquipmentUpgrade}=await import('../js/hero-equipment.js');
const {saveSlots}=await import('../js/save-slots.js');
// 1. The coefficient table is the specification: v7.0.14 values, no compensation. Hammer/axe carry their old x7/x3 as DATA (2.45x7, 2.45x3).
assert.deepEqual({...WEAPON_BASE_ATK_COEF},{sword:1.8,spear:1.6,hammer:17.15,axe:7.35,bow:1.05,crossbow:2.4,cannon:3.15,staff:.35,wand:.16});
assert.ok(Math.abs(WEAPON_BASE_ATK_COEF.hammer-2.45*7)<1e-9&&Math.abs(WEAPON_BASE_ATK_COEF.axe-2.45*3)<1e-9);
assert.deepEqual({...HERO_WEAPON_BASE_ATK_COEF},{sword:1.8,hammer:7,axe:3});
assert.deepEqual({...WITHDRAWN_COMPENSATION_FACTOR},{sword:2.4,spear:2.7,hammer:3.4,axe:3.0,bow:2.6,crossbow:2.37,cannon:2.33});
assert.equal(WEAPON_BASE_ATK_VERSION,4);assert.equal(WITHDRAWN_COMPENSATED_ATK_VERSION,3);
for(const style of Object.keys(WEAPON_BASE_ATK_COEF)){assert.equal(weaponBaseAtkCoef(style),WEAPON_BASE_ATK_COEF[style]);assert.equal(weaponCombatProfile({weaponStyle:style}).atkMult,WEAPON_BASE_ATK_COEF[style],`${style} profile reads the base ATK table`);}
assert.ok(WEAPON_BASE_ATK_COEF.hammer>WEAPON_BASE_ATK_COEF.axe,'single-target hammer stays above the area axe (as in v7.0.14)');
const traits={length:1,attackTempo:1,swingSpeed:1,sweep:1,sweetWidth:1,sweetPower:1,sweetShift:0,crit:0};
let seq=0;const gear=(style,tier=1,upgrade=0,quality=1)=>{const i=generateRandomDrop(0,'normal',{type:'WEAPON',tier,upgrade,weaponStyle:style,quality,merchant:true,random:()=>.5});i.id=`rebalance-test-${++seq}`;i.weaponTraits={...traits};applyUpgradeStats(i,upgrade);return i;};
// 2. A freshly generated weapon equals the v7.0.14 effective ATK (old formula re-computed here: floor(...x coefficient), then x7/x3 for hammer/axe).
const v7014Coef={sword:1.8,spear:1.6,hammer:2.45,axe:2.45,bow:1.05,crossbow:2.4,cannon:3.15,staff:.35,wand:.16},v7014Heavy={hammer:7,axe:3};
for(const tier of TIERS)for(const upgrade of [0,3])for(const quality of [.73,1,1.37]){
  const base=(10+tier.powerRank*5)*tier.mult*(1+upgrade*.25);
  for(const style of Object.keys(WEAPON_BASE_ATK_COEF)){
    const w=gear(style,tier.tier,upgrade,quality),mult=v7014Heavy[style]||1,old=Math.floor(base*v7014Coef[style]*quality)*mult;
    assert.equal(w.stats.atk,Math.floor(base*WEAPON_BASE_ATK_COEF[style]*quality),`${style} T${tier.tier}+${upgrade}: table`);
    if(mult===1)assert.equal(w.stats.atk,old,`${style} T${tier.tier}+${upgrade}: identical to v7.0.14`);
    else{assert.ok(w.stats.atk>=old&&w.stats.atk-old<mult,`${style} T${tier.tier}+${upgrade}: ${w.stats.atk} vs v7.0.14 ${old} (one floor instead of floor-then-x${mult})`);}
    assert.equal(w.weaponBaseAtkVersion,WEAPON_BASE_ATK_VERSION);const again=w.stats.atk;applyUpgradeStats(w,upgrade);assert.equal(w.stats.atk,again,'re-forging never repeats a multiplier');
  }
}
// Hero (revelation) weapons: identical to v7.0.14 (sword x1.8, hammer x7, axe x3 on the flat 1600 recipe; bow/staff/wand unchanged).
for(const [style,role,expect] of [['sword','LIGHT',1.8],['hammer','HEAVY',7],['axe','HEAVY',3],['bow','ARCHER',1],['spear','LIGHT',1]])for(const up of [0,2]){
  const h={type:'WEAPON',heroOnly:true,heroRole:role,heroPower:1,weaponStyle:style,baseName:'hero test'};applyHeroEquipmentUpgrade(h,up);
  assert.equal(h.stats.atk,Math.floor(1600*(1+up*.25)*expect),`hero ${style}+${up}`);assert.equal(h.weaponBaseAtkVersion,WEAPON_BASE_ATK_VERSION);
}
// 3. No hidden multiplier survives in the game code (v7.0.15 removal is kept).
const jsDir=new URL('../js/',import.meta.url),read=f=>readFileSync(new URL(f,jsDir),'utf8');
const allJs=readdirSync(jsDir).filter(f=>f.endsWith('.js')).map(f=>[f,read(f)]);
for(const [f,src] of allJs){
  for(const name of ['SOLDIER_PHYS_DMG_MULT','SOLDIER_SPEAR_DMG_MULT','SOLDIER_HAMMER_DMG_MULT','heavyWeaponAttackMult','HERO_SWORD_ATK_MULT','WEAPON_REBALANCE_V3_FACTOR'])assert.ok(!src.includes(name),`${f} still mentions ${name}`);
  if(f!=='index.js'&&f!=='growth-rules.js')assert.ok(!src.includes('legacyHeavyAttackMult'),`${f}: the legacy x7/x3 converter is for save migration only`);
}
assert.ok(!/unit\.atk\*2\.2/.test(read('soldier-melee-skills.js')),'melee skill base has no literal 2.2');
assert.ok(!/2\.2/.test(read('ranged-combat.js')),'sidearm has no literal 2.2');
assert.ok(!/1\.15:isHeavyWeaponStyle\(profile\.style\)\?1\.35/.test(read('armament-rules.js')),'equipment valuation has no duplicate spear/hammer multiplier');
{const index=read('index.js');assert.ok(!/item\.stats\.atk\*=/.test(index),'weapon generation does not multiply ATK afterwards');assert.ok(!/legacyHeavyAttackMult/.test(index.split('export function migrateHeavyWeaponAttack')[0].replace(/legacyHeavyAttackMult, HEAVY_ATTACK_VERSION/,'')),'x7/x3 is not used before the legacy migration function');
  assert.ok(!/styleDmgMult|totalAtk \* 1\.\d/.test(index),'no per-style soldier damage multiplier');}
assert.equal(legacyHeavyAttackMult('axe'),3);assert.equal(legacyHeavyAttackMult({weaponStyle:'hammer'}),7);assert.equal(legacyHeavyAttackMult('sword'),1);
// 4a. Saves from v7.0.14 or older (no weaponBaseAtkVersion): ATK stays exactly as stored -- never raised, never lowered -- and gets stamped once.
for(const style of Object.keys(WEAPON_BASE_ATK_COEF))for(const tier of [1,10,28]){
  const stored=gear(style,tier,2),old=structuredClone(stored);delete old.weaponBaseAtkVersion;
  for(let i=0;i<3;i++){migrateHeavyWeaponAttack(old);migrateMeleeWeaponBalance(old);migrateRangedWeaponBalance(old);migrateWeaponBaseAtk(old);}
  assert.equal(old.stats.atk,stored.stats.atk,`${style} T${tier}: v7.0.14 save keeps its ATK`);assert.equal(old.weaponBaseAtkVersion,WEAPON_BASE_ATK_VERSION);assert.equal(old.id,stored.id);assert.deepEqual(old.weaponTraits,stored.weaponTraits);
}
// A plain stored v7.0.14 weapon with an arbitrary value (not rebuildable from the formula) is stamped and untouched, too.
{const w={type:'WEAPON',weaponStyle:'hammer',heavyAttackVersion:2,stats:{atk:12345}};migrateWeaponBaseAtk(w);migrateWeaponBaseAtk(w);assert.equal(w.stats.atk,12345);assert.equal(w.weaponBaseAtkVersion,4);}
// Pre-v6.2 hammer/axe (x10 era, heavyAttackVersion 1 or none) still reach the v7.0.14 value through the legacy converter, then are only stamped.
for(const [style,mult] of [['axe',3],['hammer',7]]){const fresh=gear(style,9,2),v1=structuredClone(fresh);v1.stats.atk=v1.stats.atk/mult*10;v1.heavyAttackVersion=1;delete v1.weaponBaseAtkVersion;
  const expected=Math.round(v1.stats.atk/10*mult);for(let i=0;i<2;i++){migrateHeavyWeaponAttack(v1);migrateWeaponBaseAtk(v1);}assert.equal(v1.stats.atk,expected);assert.equal(v1.heavyAttackVersion,2);assert.equal(v1.weaponBaseAtkVersion,4);}
// 4b. Weapons made/converted under v7.0.15-17 (weaponBaseAtkVersion 3, compensated ATK) are reverted once to the same value as a fresh weapon.
const compensated=item=>{const w=structuredClone(item),f=WITHDRAWN_COMPENSATION_FACTOR[item.weaponStyle];if(f){w.stats.atk=Math.round(item.stats.atk*f);}w.weaponBaseAtkVersion=WITHDRAWN_COMPENSATED_ATK_VERSION;return w;};
for(const style of Object.keys(WITHDRAWN_COMPENSATION_FACTOR))for(const tier of [1,10,28])for(const up of [0,2]){
  const fresh=gear(style,tier,up),v3=compensated(fresh);assert.ok(v3.stats.atk>fresh.stats.atk,'the withdrawn data was higher');
  for(let i=0;i<3;i++){migrateHeavyWeaponAttack(v3);migrateMeleeWeaponBalance(v3);migrateRangedWeaponBalance(v3);migrateWeaponBaseAtk(v3);}
  assert.equal(v3.stats.atk,fresh.stats.atk,`${style} T${tier}+${up}: v7.0.15-17 weapon reverted exactly once to ${fresh.stats.atk}`);assert.equal(v3.weaponBaseAtkVersion,WEAPON_BASE_ATK_VERSION);assert.equal(v3.id,fresh.id);assert.deepEqual(v3.weaponTraits,fresh.weaponTraits);assert.equal(v3.upgrade,fresh.upgrade);assert.equal(v3.name,fresh.name);
  // fallback for a version-3 weapon that has no tier/name to rebuild from: divide by the withdrawn factor (once)
  const bare={type:'WEAPON',weaponStyle:style,heavyAttackVersion:2,weaponBaseAtkVersion:3,stats:{atk:Math.round(fresh.stats.atk*WITHDRAWN_COMPENSATION_FACTOR[style])}};
  migrateWeaponBaseAtk(bare);migrateWeaponBaseAtk(bare);assert.ok(Math.abs(bare.stats.atk-fresh.stats.atk)<=Math.ceil(WITHDRAWN_COMPENSATION_FACTOR[style]),`${style}: fallback ${bare.stats.atk} ~ ${fresh.stats.atk}`);assert.equal(bare.weaponBaseAtkVersion,4);
}
for(const style of ['staff','wand']){const w=gear(style,5),atk=w.stats.atk,magic=w.stats.magicAttack;const v3=structuredClone(w);v3.weaponBaseAtkVersion=3;migrateWeaponBaseAtk(v3);assert.equal(v3.stats.atk,atk,`${style} ATK unchanged`);assert.equal(v3.stats.magicAttack,magic);assert.equal(v3.weaponBaseAtkVersion,4);}
// Hero weapon made under v7.0.15-17 (sword 4.32 / hammer 23.8 / axe 9) goes back to the v7.0.14 recipe once.
for(const [style,role,old] of [['sword','LIGHT',4.32],['hammer','HEAVY',23.8],['axe','HEAVY',9]])for(const up of [0,2]){
  const h={type:'WEAPON',heroOnly:true,heroRole:role,heroPower:1,weaponStyle:style,baseName:'hero test'};applyHeroEquipmentUpgrade(h,up);const fresh=h.stats.atk;
  h.stats.atk=Math.floor(1600*(1+up*.25)*old);h.weaponBaseAtkVersion=3;h.meleeBalanceVersion=1;
  for(let i=0;i<3;i++){migrateMeleeWeaponBalance(h);migrateWeaponBaseAtk(h);}assert.equal(h.stats.atk,fresh,`hero ${style}+${up}`);assert.equal(h.weaponBaseAtkVersion,4);}
// 5. Real save -> load: owned weapons (captain, inventory, shared box, soldier) follow rules 4a (kept) and 4b (reverted), once, also across a second save/load.
const game=Object.create(IronSquadGame);Object.assign(game,{container:document.getElementById('game'),width:390,height:664,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0,joystick:{active:false,dirX:0,dirY:0}});
for(const m of ['startGameLoop','showToast','spawnSparks','spawnDamageText'])game[m]=noop;
game.setupUI();game.activeSlotId=saveSlots.create('WEAPON REBALANCE V7018 TEST ONLY').id;game.startFreshGame(false);game.closeStrategyModal();game.squad=[];game.restTimer=0;game.outposts=[];
Object.assign(game.player,{x:83000,y:83000,magicAffinity:undefined});game.player.attributeProfile.innate.strength=150;game.player.attributeProfile.innate.magic=1;
const unit=game.createNewSoldier(null,{classKey:'HEAVY',talent:'AVERAGE'});unit.attributeProfile.innate.strength=150;unit.attributeProfile.innate.magic=1;const sw=gear('hammer',9,2);unit.equipped={weapon:sw};unit.weapon=sw;game.squad=[unit];
const cap=gear('axe',9,1),inv=gear('spear',9,0),box=gear('bow',9,0);game.equipped={weapon:cap};game.inventory=[inv];game.sharedEquipBox=[box];
game.saveGame({immediate:true});const base=structuredClone(saveSlots.get(game.activeSlotId).data);
const fresh={[cap.id]:cap.stats.atk,[inv.id]:inv.stats.atk,[box.id]:box.stats.atk,[sw.id]:sw.stats.atk};
const weaponsOf=data=>{const list=[data.equipped.weapon,data.inventory[0],data.sharedEquipBox[0]],s=data.squad[0];list.push((s.equipped||{}).weapon||s.weapon);if(s.weapon&&s.equipped?.weapon)s.weapon=structuredClone(s.equipped.weapon),list[3]=s.equipped.weapon;return list;};
function check(mode){
  const saved=structuredClone(base),list=weaponsOf(saved),expected={};
  for(const item of list){
    if(mode==='v7014'){delete item.weaponBaseAtkVersion;expected[item.id]=item.stats.atk;}
    else{item.stats.atk=Math.round(item.stats.atk*WITHDRAWN_COMPENSATION_FACTOR[item.weaponStyle]);item.weaponBaseAtkVersion=3;expected[item.id]=fresh[item.id];}
  }
  for(let load=0;load<2;load++){
    game.resumeSavedGame(load?structuredClone(game.saveGame({immediate:true})):structuredClone(saved));
    assert.equal(game.equipped.weapon.stats.atk,expected[cap.id],`${mode}: captain axe (load ${load})`);
    assert.equal(game.inventory.find(i=>i.id===inv.id).stats.atk,expected[inv.id],`${mode}: inventory spear`);
    assert.equal(game.sharedEquipBox.find(i=>i.id===box.id).stats.atk,expected[box.id],`${mode}: shared-box bow`);
    assert.equal(game.squad[0].equipped.weapon.stats.atk,expected[sw.id],`${mode}: soldier hammer`);
    assert.equal(game.equipped.weapon.weaponBaseAtkVersion,WEAPON_BASE_ATK_VERSION);
  }
}
check('v7014');check('v7015-17');
console.log('PASS: no ATK compensation (same weapon ATK as v7.0.14), hidden multipliers stay removed, v7.0.14-or-older saves keep their ATK, v7.0.15-17 saves are reverted exactly once, no double conversion');
dom.window.close();