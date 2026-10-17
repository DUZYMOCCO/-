import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {TIERS} from '../js/equipment-tiers.js';
import {weaponCombatProfile} from '../js/equipment-rules.js';
import {WEAPON_BASE_ATK_COEF,WEAPON_BASE_ATK_VERSION,WEAPON_REBALANCE_V3_FACTOR,HERO_WEAPON_BASE_ATK_COEF,weaponBaseAtkCoef} from '../js/growth-rules.js';
// v7.0.15 provisional weapon rebalance: hidden multipliers are gone; strength lives in base weapon ATK data.
const dom=new JSDOM('<div id="game"></div>',{url:'http://localhost/'});Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame,applyUpgradeStats,generateRandomDrop,migrateWeaponBaseAtk,migrateHeavyWeaponAttack,migrateMeleeWeaponBalance,migrateRangedWeaponBalance}=await import('../js/index.js');
const {saveSlots}=await import('../js/save-slots.js');
// 1. New base values (the table itself is the specification).
assert.deepEqual({...WEAPON_BASE_ATK_COEF},{sword:4.32,spear:4.32,hammer:58.31,axe:22.05,bow:2.73,crossbow:5.688,cannon:7.3395,staff:.35,wand:.16});
assert.deepEqual({...WEAPON_REBALANCE_V3_FACTOR},{sword:2.4,spear:2.7,hammer:3.4,axe:3.0,bow:2.6,crossbow:2.37,cannon:2.33});
assert.deepEqual({...HERO_WEAPON_BASE_ATK_COEF},{sword:4.32,hammer:23.8,axe:9,bow:2.6});
for(const style of Object.keys(WEAPON_BASE_ATK_COEF)){assert.equal(weaponBaseAtkCoef(style),WEAPON_BASE_ATK_COEF[style]);assert.equal(weaponCombatProfile({weaponStyle:style}).atkMult,WEAPON_BASE_ATK_COEF[style],`${style} profile reads the base ATK table`);}
// Each coefficient is exactly (v7.0.14 coefficient incl. baked-in x7/x3) x (approved provisional factor).
const oldCoef={sword:1.8,spear:1.6,hammer:2.45*7,axe:2.45*3,bow:1.05,crossbow:2.4,cannon:3.15};
for(const [style,factor] of Object.entries(WEAPON_REBALANCE_V3_FACTOR)){const f=style==='hammer'?3.4:style==='axe'?3:factor;assert.ok(Math.abs(WEAPON_BASE_ATK_COEF[style]-oldCoef[style]*factor)<1e-9,`${style}: ${WEAPON_BASE_ATK_COEF[style]} vs ${oldCoef[style]*factor}`);}
const traits={length:1,attackTempo:1,swingSpeed:1,sweep:1,sweetWidth:1,sweetPower:1,sweetShift:0,crit:0};
let seq=0;const gear=(style,tier=1,upgrade=0)=>{const i=generateRandomDrop(0,'normal',{type:'WEAPON',tier,upgrade,weaponStyle:style,quality:1,merchant:true,random:()=>.5});i.id=`rebalance-test-${++seq}`;i.weaponTraits={...traits};applyUpgradeStats(i,upgrade);return i;};
for(const tier of TIERS)for(const upgrade of [0,3]){
  const base=(10+tier.powerRank*5)*tier.mult*(1+upgrade*.25);
  for(const [style,coef] of Object.entries(WEAPON_BASE_ATK_COEF)){const w=gear(style,tier.tier,upgrade);assert.equal(w.stats.atk,Math.floor(base*coef),`${style} T${tier.tier}+${upgrade}`);assert.equal(w.weaponBaseAtkVersion,WEAPON_BASE_ATK_VERSION);const again=w.stats.atk;applyUpgradeStats(w,upgrade);assert.equal(w.stats.atk,again,'re-forging never repeats a multiplier');}
}
// 2. No hidden multiplier survives in the game code.
const jsDir=new URL('../js/',import.meta.url),read=f=>readFileSync(new URL(f,jsDir),'utf8');
const allJs=readdirSync(jsDir).filter(f=>f.endsWith('.js')).map(f=>[f,read(f)]);
for(const [f,src] of allJs){
  for(const name of ['SOLDIER_PHYS_DMG_MULT','SOLDIER_SPEAR_DMG_MULT','SOLDIER_HAMMER_DMG_MULT','heavyWeaponAttackMult','HERO_SWORD_ATK_MULT'])assert.ok(!src.includes(name),`${f} still mentions ${name}`);
  if(f!=='index.js'&&f!=='growth-rules.js')assert.ok(!src.includes('legacyHeavyAttackMult'),`${f}: the legacy x7/x3 converter is for save migration only`);
}
assert.ok(!/unit\.atk\*2\.2/.test(read('soldier-melee-skills.js')),'melee skill base has no literal 2.2');
assert.ok(!/2\.2/.test(read('ranged-combat.js')),'sidearm has no literal 2.2');
assert.ok(!/1\.15:isHeavyWeaponStyle\(profile\.style\)\?1\.35/.test(read('armament-rules.js')),'equipment valuation has no duplicate spear/hammer multiplier');
{const index=read('index.js');assert.ok(!/item\.stats\.atk\*=/.test(index),'weapon generation does not multiply ATK afterwards');assert.ok(!/legacyHeavyAttackMult/.test(index.split('export function migrateHeavyWeaponAttack')[0].replace(/legacyHeavyAttackMult, HEAVY_ATTACK_VERSION/,'')),'x7/x3 is not used before the legacy migration function');
  assert.ok(!/styleDmgMult|totalAtk \* 1\.\d/.test(index),'no per-style soldier damage multiplier');}
// 3. One-time conversion of weapons saved under the v7.0.14 balance.
for(const style of Object.keys(WEAPON_REBALANCE_V3_FACTOR))for(const tier of [1,10,28]){
  const fresh=gear(style,tier,2),old=structuredClone(fresh);delete old.weaponBaseAtkVersion;
  // what a v7.0.14 save held: the new value divided back by the factor (heavy weapons carried x7/x3 inside, so the same shape).
  old.stats.atk=Math.floor(fresh.stats.atk/WEAPON_REBALANCE_V3_FACTOR[style]);
  const stored=old.stats.atk;
  for(let i=0;i<3;i++){migrateHeavyWeaponAttack(old);migrateMeleeWeaponBalance(old);migrateRangedWeaponBalance(old);migrateWeaponBaseAtk(old);}
  assert.equal(old.stats.atk,Math.round(stored*WEAPON_REBALANCE_V3_FACTOR[style]),`${style} T${tier} converted exactly once`);
  assert.equal(old.weaponBaseAtkVersion,WEAPON_BASE_ATK_VERSION);assert.equal(old.id,fresh.id);assert.deepEqual(old.weaponTraits,fresh.weaponTraits);
  assert.ok(Math.abs(old.stats.atk-fresh.stats.atk)<=fresh.stats.atk*.03+2,`${style} T${tier}: migrated ${old.stats.atk} stays within rounding of a freshly built weapon ${fresh.stats.atk}`);
}
for(const style of ['staff','wand']){const w=gear(style,5);const atk=w.stats.atk,magic=w.stats.magicAttack;delete w.weaponBaseAtkVersion;migrateWeaponBaseAtk(w);assert.equal(w.stats.atk,atk,`${style} ATK unchanged`);assert.equal(w.stats.magicAttack,magic);}
// 4. Real save -> load: owned weapons (inventory, shared box, equipped by captain and soldier) are converted once.
const game=Object.create(IronSquadGame);Object.assign(game,{container:document.getElementById('game'),width:390,height:664,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0,joystick:{active:false,dirX:0,dirY:0}});
for(const m of ['startGameLoop','showToast','spawnSparks','spawnDamageText'])game[m]=noop;
game.setupUI();game.activeSlotId=saveSlots.create('WEAPON REBALANCE V7015 TEST ONLY').id;game.startFreshGame(false);game.closeStrategyModal();game.squad=[];game.restTimer=0;game.outposts=[];
Object.assign(game.player,{x:83000,y:83000,magicAffinity:undefined});game.player.attributeProfile.innate.strength=150;game.player.attributeProfile.innate.magic=1;
const unit=game.createNewSoldier(null,{classKey:'HEAVY',talent:'AVERAGE'});unit.attributeProfile.innate.strength=150;unit.attributeProfile.innate.magic=1;const sw=gear('hammer',9,2);unit.equipped={weapon:sw};unit.weapon=sw;game.squad=[unit];
const cap=gear('axe',9,1),inv=gear('spear',9,0),box=gear('bow',9,0);game.equipped={weapon:cap};game.inventory=[inv];game.sharedEquipBox=[box];
game.saveGame({immediate:true});const saved=structuredClone(saveSlots.get(game.activeSlotId).data);
const expected={};
const downgrade=item=>{const key=item.id;const f=WEAPON_REBALANCE_V3_FACTOR[item.weaponStyle];item.stats.atk=Math.floor(item.stats.atk/f);expected[key]=Math.round(item.stats.atk*f);delete item.weaponBaseAtkVersion;};
downgrade(saved.equipped.weapon);downgrade(saved.inventory[0]);downgrade(saved.sharedEquipBox[0]);
const sold=(saved.squad[0].equipped||{}).weapon||saved.squad[0].weapon;downgrade(sold);
if(saved.squad[0].weapon&&saved.squad[0].equipped?.weapon)saved.squad[0].weapon=structuredClone(saved.squad[0].equipped.weapon);
for(let load=0;load<2;load++){
  game.resumeSavedGame(load?structuredClone(game.saveGame({immediate:true})):structuredClone(saved));
  assert.equal(game.equipped.weapon.stats.atk,expected[cap.id],'captain axe');
  assert.equal(game.inventory.find(i=>i.id===inv.id).stats.atk,expected[inv.id],'inventory spear');
  assert.equal(game.sharedEquipBox.find(i=>i.id===box.id).stats.atk,expected[box.id],'shared-box bow');
  assert.equal(game.squad[0].equipped.weapon.stats.atk,expected[sw.id],'soldier hammer');
}
console.log('PASS: base weapon ATK table (new base values), no hidden multipliers in code, one-time idempotent save conversion for every weapon style and every owned-weapon location');
dom.window.close();