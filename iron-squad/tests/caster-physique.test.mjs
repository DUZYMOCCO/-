import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createSoldierAppearance,drawSoldierPortrait,soldierPhysique} from '../js/soldier-appearance.js';
import {isMuscleCaster,rollAttributeProfile,attributeValues} from '../js/unit-attributes.js';
import {drawFieldSoldier} from '../js/visuals.js';
import {drawMeleeWeapon,meleePose} from '../js/weapon-motion.js';
import {persistentUnit} from '../js/render-support.js';
const {createCanvas}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('@napi-rs/canvas');

const actor=(soldierClass,muscular=false)=>{
  const attributeProfile=rollAttributeProfile(soldierClass,'AVERAGE',()=>.5,true);
  if(muscular){attributeProfile.innate.strength=60;attributeProfile.aptitudes.strength=2;}
  return {id:`physique-${soldierClass}`,soldierClass,attributeProfile,level:1,talent:'AVERAGE',
    appearance:createSoldierAppearance(`physique-${soldierClass}`),x:0,y:0,hp:100,maxHp:100,mana:100,maxMana:100,
    magicAffinity:'fire',equipped:{weapon:{type:'WEAPON',tier:1,weaponStyle:'wand',color:'#aeb8c6'}},
    facingAngle:Math.PI/2,portrait:true,vx:0,vy:0};
};
for(const role of ['MEDIC','HIGH_PRIEST','SAINT','ARCHANGEL','MAGE','ARCHMAGE','ELEMENTAL_SAGE','ARCANE_SOVEREIGN']){
  const normal=actor(role),muscular=actor(role,true);
  assert.equal(isMuscleCaster(normal),false,`${role}: ordinary casters keep their build`);
  assert.equal(isMuscleCaster(muscular),true,`${role}: promotions share the muscle qualification`);
  for(const style of ['staff','wand','sword','spear','hammer']){
    muscular.equipped.weapon.weaponStyle=style;
    assert.equal(isMuscleCaster(muscular),true,'physique follows the individual even when changing weapons');
  }
  const saved=JSON.parse(JSON.stringify(persistentUnit(muscular)));
  assert.deepEqual(soldierPhysique(saved),soldierPhysique(muscular),'saved ability history reproduces the build without a new appearance flag');
}
for(const role of ['HEAVY','LIGHT','ARCHER'])assert.equal(isMuscleCaster(actor(role,true)),false,'physical classes are outside this visual change');
const weak=actor('MEDIC');weak.strength=255;weak._casterStrengthTimer=8;weak._casterStrengthBonus=100;weak.equipped.weapon.weaponStyle='hammer';
assert.equal(isMuscleCaster(weak),false,'a cached stat, temporary buff or weapon alone cannot create a muscular individual');
assert.equal(isMuscleCaster({soldierClass:'MAGE'}),false,'drawing an uninitialized unit neither rolls abilities nor invents qualification');
const grown=actor('MAGE');grown.attributeProfile.innate.strength=17;grown.attributeProfile.practice.strength=.25;
assert.equal(attributeValues(grown).strength,18);
assert.equal(isMuscleCaster(grown),true,'real strength training unlocks both melee growth and physique');

const frame=(unit,{far=false,down=false}={})=>{
  const canvas=createCanvas(240,240),c=canvas.getContext('2d');c.translate(120,175);c.scale(3,3);
  drawFieldSoldier(c,{...unit,isDown:down,downTimer:10},0,{baseClassId:unit.soldierClass},'#829cae',far);
  return canvas;
};
const portrait=unit=>{const canvas=createCanvas(240,260);drawSoldierPortrait(canvas.getContext('2d'),unit);return canvas;};
const sameRegion=(a,b,x,y,w,h)=>assert.deepEqual(a.getContext('2d').getImageData(x,y,w,h).data,b.getContext('2d').getImageData(x,y,w,h).data,'the same face and head size survive body widening');
for(const role of ['MAGE','MEDIC']){
  const normal=actor(role),muscular=actor(role,true),before=JSON.stringify(muscular);
  const closeNormal=frame(normal),closeMuscle=frame(muscular);
  assert.notDeepEqual(closeNormal.toBuffer('image/png'),closeMuscle.toBuffer('image/png'),'close field drawing visibly distinguishes the build');
  sameRegion(closeNormal,closeMuscle,99,37,42,61);
  for(const mode of [{far:true},{down:true}])assert.notDeepEqual(frame(normal,mode).toBuffer('image/png'),frame(muscular,mode).toBuffer('image/png'),'far and downed bodies retain the individual build');
  const normalPortrait=portrait(normal),musclePortrait=portrait(muscular);
  assert.notDeepEqual(normalPortrait.toBuffer('image/png'),musclePortrait.toBuffer('image/png'),'recruitment and personal portraits reveal the qualified individual');
  sameRegion(normalPortrait,musclePortrait,0,0,240,155);
  assert.equal(JSON.stringify(muscular),before,'rendering does not mutate abilities, stats, equipment or saved appearance');
}
// Wider shoulders and arms keep the original grip, striking edge and combat reach.
const muscular=actor('MAGE',true),physique=soldierPhysique(muscular);
for(const style of ['sword','spear','hammer'])for(let dir=0;dir<8;dir++){
  const aim=dir*Math.PI/4,anim=style==='hammer'?.54:.57;
  const unit={...muscular,atkAnim:anim,attackAngle:aim};
  const canvas=createCanvas(240,240),c=canvas.getContext('2d');c.translate(120,130);
  const pose=drawMeleeWeapon(c,unit,style,{cloth:'#71627e',blade:'#c8d1c9',gloves:'#9f876c',physique});
  assert.deepEqual(pose,meleePose(style,anim,aim),'body size never changes weapon reach or attack pose');
  const visible=point=>canvas.getContext('2d').getImageData(Math.round(120+point.x)-2,Math.round(130+point.y)-2,5,5).data.some((v,i)=>i%4===3&&v>0);
  assert.ok(visible(pose.grip),'the hand still grips the weapon in each direction');
  if(style!=='sword')assert.ok(visible(pose.offGrip),'both enlarged arms stay connected to the same shaft');
}
console.log('PASS: qualified caster physique only, all promotions, persistent identity, equipment/buff independence, real training, unchanged heads, near/far/down/portraits and 8-direction grips');
