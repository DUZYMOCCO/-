import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {meleePose,drawMeleeWeapon,drawMeleeRangeCue,meleeDrawReach,attackAnimationRate} from '../js/games/iron-squad/weapon-motion.js';
import {MELEE_SWEET_SPOT,evaluateMeleeSweetSpot} from '../js/games/iron-squad/equipment-rules.js';
const packages='C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {createCanvas}=createRequire(resolve(packages,'entry.cjs'))('@napi-rs/canvas');
const colors={cloth:'#71858a',gloves:'#9f876c',blade:'#c8d1c9',board:'#566b7c'};
const visibleAt=(c,x,y)=>c.getImageData(Math.round(x)-2,Math.round(y)-2,5,5).data.some((v,i)=>i%4===3&&v>0);
for(const style of ['sword','spear','hammer']) {
  const contactAnim=style==='hammer'?.54:.57;
  for(let dir=0;dir<8;dir++) {
    const angle=dir*Math.PI/4;
    const canvas=createCanvas(240,240),c=canvas.getContext('2d');c.translate(120,130);
    const actor={soldierClass:'HEAVY',atkAnim:contactAnim,facingAngle:angle+Math.PI,attackAngle:angle};
    const before=JSON.stringify(actor),matrix=c.getTransform();c.globalAlpha=.8;
    const pose=drawMeleeWeapon(c,actor,style,colors);
    assert.equal(JSON.stringify(actor),before,'rendering never changes the unit or combat state');
    assert.ok(Math.abs(pose.angle-angle)<1e-8,`${style} contact aims at the target in direction ${dir}`);
    assert.deepEqual(c.getTransform(),matrix);assert.equal(c.globalAlpha,.8,'drawing restores canvas state');
    const hitX=120+pose.grip.x+Math.cos(angle)*(pose.length-3);
    const hitY=130+pose.grip.y+Math.sin(angle)*(pose.length-3);
    assert.ok(visibleAt(canvas.getContext('2d'),hitX,hitY),`${style} striking edge actually paints in direction ${dir}`);
    assert.ok(visibleAt(canvas.getContext('2d'),120+pose.grip.x,130+pose.grip.y),'a visible hand grips the hilt/shaft');
    if(style!=='sword') {
      const dx=pose.offGrip.x-pose.grip.x,dy=pose.offGrip.y-pose.grip.y;
      assert.ok(Math.abs(dx*Math.sin(angle)-dy*Math.cos(angle))<1e-8,'both hands remain on the shaft');
    }
    const rest=meleePose(style,0,angle),end=meleePose(style,1e-7,angle);
    assert.ok(Math.hypot(rest.grip.x-end.grip.x,rest.grip.y-end.grip.y)<1e-5,'returning to rest has no hand snap');
    assert.ok(Math.abs(rest.angle-end.angle)<1e-5,'returning to rest has no weapon snap');
  }
  const canvas=createCanvas(240,240),c=canvas.getContext('2d');c.translate(120,130);
  const draw=anim=>{c.clearRect(-120,-130,240,240);drawMeleeWeapon(c,{soldierClass:'HEAVY',atkAnim:anim,facingAngle:0},style,colors);return canvas.toBuffer('image/png');};
  assert.notDeepEqual(draw(.82),draw(contactAnim),'preparation and contact have visibly different geometry');
  assert.notDeepEqual(draw(contactAnim),draw(.34),'follow-through has visibly different geometry');
  const radius=meleeDrawReach({weaponStyle:style});let arcs=[];let lines=[];let depth=0;
  const trace=new Proxy({save(){depth++;},restore(){depth--;},arc(...args){arcs.push(args);},moveTo(...args){lines.push(args);}},{get:(o,k)=>k in o?o[k]:()=>{}});
  drawMeleeRangeCue(trace,0,0,0,radius,style,0);assert.equal(arcs.length,0,'no permanent range effects at rest');
  drawMeleeRangeCue(trace,0,0,0,radius,style,contactAnim);
  assert.equal(depth,0);assert.equal(arcs.length,1,'range cue is one short arc, not a filled circle');
  assert.equal(arcs[0][2],radius*MELEE_SWEET_SPOT[style].peak);
  assert.equal(lines[0][0],radius*MELEE_SWEET_SPOT[style].sweetMin);
  assert.equal(evaluateMeleeSweetSpot(style,arcs[0][2],radius).inSweet,true,'visual peak uses the actual damage band');
  assert.ok(attackAnimationRate({weaponStyle:style},2)>attackAnimationRate({weaponStyle:style},1),'fast weapons also animate faster');
}
console.log('PASS: visible striking geometry in 8 directions, latched aim, two-hand grips, continuous recovery, Canvas state isolation, real sweet spot distances and no idle range effects');
