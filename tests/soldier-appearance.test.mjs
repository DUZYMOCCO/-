import assert from 'node:assert/strict';
import {createSoldierAppearance,ensureSoldierAppearance,describeSoldierAppearance,isMedicAppearance,drawSoldierHead,drawSoldierPortrait,HAIR_LABELS,GLASSES_LABELS} from '../js/games/iron-squad/soldier-appearance.js';
import {persistentUnit} from '../js/games/iron-squad/render-support.js';

const profile=createSoldierAppearance('stable-soldier');
assert.deepEqual(profile,createSoldierAppearance('stable-soldier'),'the identity seed is repeatable');
assert.notDeepEqual(profile,createSoldierAppearance('different-soldier'));
const soldier={id:'stable-soldier',soldierClass:'HEAVY',hp:99,maxHp:100,atk:18,def:12,level:3,talent:'INFERIOR',equipped:{},_cachedTarget:{}};
assert.deepEqual(ensureSoldierAppearance(soldier),profile,'an old save gains a stable appearance');
const appearanceRef=soldier.appearance; soldier.level=20;soldier.isNamed=true;soldier.soldierClass='PALADIN';
assert.equal(ensureSoldierAppearance(soldier),appearanceRef,'level, title and promotion must not reroll the face');
const saved=JSON.parse(JSON.stringify(persistentUnit(soldier)));assert.equal(saved._cachedTarget,undefined);
assert.deepEqual(ensureSoldierAppearance(saved),profile,'appearance survives the same serialization used by real saves');
const oldAppearance={...profile}; delete oldAppearance.glasses; delete oldAppearance.glassesColor;
const oldCopy={...oldAppearance},oldUnit={id:'stable-soldier',appearance:oldAppearance,soldierClass:'MEDIC'};
ensureSoldierAppearance(oldUnit);
for(const key of Object.keys(oldCopy))assert.deepEqual(oldUnit.appearance[key],oldCopy[key],'adding glasses preserves an already assigned face');
assert.equal(oldUnit.appearance.glasses,profile.glasses);

let handsome=0;const styles=new Set(),skins=new Set(),faces=new Set(),glasses=new Set();
for(let i=0;i<10000;i++){const a=createSoldierAppearance(`recruit-${i}`);handsome+=Number(a.handsome);styles.add(a.hairStyle);skins.add(a.skin);faces.add(a.faceShape);glasses.add(a.glasses);assert.ok(a.handsome||a.hairStyle!=='swept');}
assert.ok(handsome>=400&&handsome<=800,`handsome faces are a small minority: ${handsome}/10000`);
assert.equal(styles.size,Object.keys(HAIR_LABELS).length);assert.equal(skins.size,5);assert.equal(faces.size,4);
assert.equal(glasses.size,Object.keys(GLASSES_LABELS).length);
assert.equal(isMedicAppearance('HEAVY'),false);
for(const key of ['MEDIC','HIGH_PRIEST','SAINT','ARCHANGEL']){
 soldier.soldierClass=key;
 assert.equal(isMedicAppearance(key),true); assert.match(describeSoldierAppearance(soldier),/やわらかな表情/);
 assert.equal(ensureSoldierAppearance(soldier),appearanceRef,'all medical promotions use the same identity');
}
// Appearance rendering never consumes gameplay randomness or changes combat stats.
let depth=0;const noop=()=>{};
const context=new Proxy({save(){depth++;},restore(){depth--;},createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
const random=Math.random;Math.random=()=>{throw new Error('appearance consumed gameplay RNG');};
try {
 for(const key of ['HEAVY','MEDIC','PALADIN','SAINT','ARCHANGEL']) {
  soldier.soldierClass=key;
  const stats=JSON.stringify({hp:soldier.hp,maxHp:soldier.maxHp,atk:soldier.atk,def:soldier.def,level:soldier.level,talent:soldier.talent,equipped:soldier.equipped});
  for(const style of Object.keys(HAIR_LABELS)) {
   soldier.appearance={...profile,hairStyle:style};
   for(const glasses of Object.keys(GLASSES_LABELS)) {
    soldier.appearance.glasses=glasses;
    drawSoldierHead(context,soldier,{small:true});drawSoldierHead(context,soldier,{helmet:'#aaa'});drawSoldierPortrait(context,soldier,240,260);
   }
   assert.equal(depth,0,'every drawing path restores its Canvas state');
  }
  assert.equal(JSON.stringify({hp:soldier.hp,maxHp:soldier.maxHp,atk:soldier.atk,def:soldier.def,level:soldier.level,talent:soldier.talent,equipped:soldier.equipped}),stats);
 }
} finally {Math.random=random;}
console.log(`PASS: stable faces, old-save migration, save roundtrip, all bald variants, ${handsome}/10000 handsome, medical promotions, gameplay RNG/stat isolation and balanced Canvas state`);
