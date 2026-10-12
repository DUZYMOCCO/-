import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {WEAPON_STYLES,isRangedStyle} from '../js/growth-rules.js';
import {meleePose,rangedPose,solveWeaponArm,drawMeleeWeapon,drawRangedWeapon} from '../js/weapon-motion.js';
const {createCanvas}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('@napi-rs/canvas');
const colors={cloth:'#71858a',gloves:'#987c64',blade:'#c8d1c9',board:'#566b7c',hand:'#c6a17d',gloveProfile:{coverage:.3}};
for(const physique of [{bodyWidth:1,armWidth:1},{bodyWidth:1.45,armWidth:1.55}])for(const style of WEAPON_STYLES)for(let dir=0;dir<8;dir++)for(let frame=0;frame<=20;frame++){
  const aim=dir*Math.PI/4,anim=frame/20,poseFn=isRangedStyle(style)?rangedPose:meleePose,pose=poseFn(style,anim,aim,physique),shoulder=6*physique.bodyWidth;
  for(const [hand,x] of [[pose.grip,pose.side*shoulder],[pose.offGrip,-pose.side*shoulder]]){
    const arm=solveWeaponArm({x,y:-21},hand,physique),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
    assert.ok(Math.abs(distance(arm.shoulder,arm.elbow)-arm.length)<1e-6,`${style} upper arm stays its length, ${dir}/${frame}`);
    assert.ok(Math.abs(distance(arm.elbow,arm.hand)-arm.length)<1e-6,`${style} forearm stays its length, ${dir}/${frame}`);
  }
  if(pose.twoHanded&&!isRangedStyle(style)){
    const dx=pose.offGrip.x-pose.grip.x,dy=pose.offGrip.y-pose.grip.y;
    assert.ok(Math.abs(dx*Math.sin(pose.angle)-dy*Math.cos(pose.angle))<1e-8,`${style}: supporting hand is on the shaft`);
    assert.ok(Math.abs(Math.hypot(dx,dy)-pose.spacing)<1e-8,'hands keep separate grips');
  }
  const rest=poseFn(style,0,aim,physique),end=poseFn(style,1e-8,aim,physique);
  assert.ok(Math.hypot(rest.grip.x-end.grip.x,rest.grip.y-end.grip.y)<1e-5);
  assert.ok(Math.hypot(rest.offGrip.x-end.offGrip.x,rest.offGrip.y-end.offGrip.y)<1e-5);
}
for(const style of WEAPON_STYLES){
  const canvas=createCanvas(200,200),c=canvas.getContext('2d'),actor={soldierClass:'HEAVY',atkAnim:.6,facingAngle:Math.PI,attackAngle:0,equipped:{weapon:{weaponStyle:style,weaponTraits:{length:1.1}}}};
  c.translate(100,130);c.globalAlpha=.7;const alpha=c.globalAlpha,matrix=c.getTransform(),before=JSON.stringify(actor),draw=isRangedStyle(style)?drawRangedWeapon:drawMeleeWeapon;
  draw(c,actor,style,colors);assert.deepEqual(c.getTransform(),matrix);assert.equal(c.globalAlpha,alpha);assert.equal(JSON.stringify(actor),before);
  assert.ok(c.getImageData(0,0,200,200).data.some((v,i)=>i%4===3&&v>0));
  if(isRangedStyle(style)){
    const prep=rangedPose(style,.82,0),contact=rangedPose(style,.57,0);
    assert.notDeepEqual(prep.offGrip,contact.offGrip,`${style}: pull/recoil connects to moving hands`);
  }
}
const cv=createCanvas(200,200),c=cv.getContext('2d');c.translate(80,130);
const render=style=>{c.clearRect(-80,-130,200,200);drawMeleeWeapon(c,{facingAngle:0},style,colors);return cv.toBuffer('image/png');};
assert.notDeepEqual(render('hammer'),render('axe'),'axe has a blade silhouette, not a hammer head');
console.log('PASS: all 9 weapons / 8 directions / 21 frames / 2 physiques: fixed arm lengths, connected grips, recovery, ranged draw/recoil, Canvas isolation and axe silhouette');
// The pistol grip hangs below the barrel in BOTH horizontal directions (rotation alone flips it).
for(const aim of [0,Math.PI]){
  const canvas=createCanvas(160,160),c=canvas.getContext('2d');c.translate(80,80);c.scale(3,3);
  const pose=drawRangedWeapon(c,{facingAngle:aim},'cannon',colors,false,false);
  const x=80+(pose.grip.x-pose.side)*3,y=80+(pose.grip.y+5)*3;
  const pixel=c.getImageData(Math.floor(x),Math.floor(y),1,1).data;
  assert.deepEqual([...pixel.slice(0,3)],[99,75,54],`cannon pistol grip stays below the barrel when ${aim?'left':'right'} facing`);
  assert.ok(pose.offGrip.y<pose.grip.y,'the front hand stays on the upper fore-end, including left-facing poses');
}
