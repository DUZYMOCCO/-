import {drawEquipmentShield} from './equipment-art.js?v=188';
import { MELEE_SWEET_SPOT, meleeSweetSpotFor, weaponCombatProfile } from './equipment-rules.js?v=217';
import {isHeavyWeaponStyle} from './growth-rules.js?v=213';

const TAU = Math.PI * 2;
const clamp = n => Math.max(0, Math.min(1, n));
const ease = n => { n = clamp(n); return n * n * (3 - 2 * n); };
const keys = (p, values) => {
  for (let i=1; i<values.length; i++) {
    if (p <= values[i][0]) {
      const [a,x]=values[i-1], [b,y]=values[i];
      return x+(y-x)*ease((p-a)/(b-a));
    }
  }
  return values.at(-1)[1];
};
const segment = (c, points, color, width) => {
  c.strokeStyle=color; c.lineWidth=width; c.beginPath();
  points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y)); c.stroke();
};
const polygon = (c, points, fill) => {
  c.fillStyle=fill; c.strokeStyle='#303637'; c.lineWidth=.8; c.beginPath();
  points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y)); c.closePath(); c.fill(); c.stroke();
};

/** atkAnim counts DOWN. Both weapon geometry and hands use this single pose.
 * Screen/world aim is retained in all eight directions, independent of body mirroring.
 * Returning to the resting pose is continuous; no weapon snaps at anim=0.
 */
/** Weapons are carried to the body's left or right, never along the stick direction. */
export const weaponRestAim = actor => Math.cos(actor?.facingAngle||0) < -.15 ? Math.PI : 0;
export const weaponAim = actor => (actor?.atkAnim||0)>0&&Number.isFinite(actor.attackAngle)?actor.attackAngle:weaponRestAim(actor);
const armLength = physique => 8.5*(1+((physique?.bodyWidth||1)-1)*.35);
/** Move a rigid pair of grips into the reach of both shoulders. */
function fitGrips(pose,physique) {
  const shoulder=6*(physique?.bodyWidth||1),reach=armLength(physique)*1.99;
  const anchors=[{x:pose.side*shoulder,y:-21}];
  if(pose.twoHanded)anchors.push({x:-pose.side*shoulder,y:-21});
  for(let pass=0;pass<12;pass++){
    let moved=false;
    for(let i=0;i<anchors.length;i++){
      const hand=i?pose.offGrip:pose.grip,a=anchors[i],dx=hand.x-a.x,dy=hand.y-a.y,d=Math.hypot(dx,dy);
      if(d>reach){const x=dx*(reach/d-1),y=dy*(reach/d-1);pose.grip.x+=x;pose.grip.y+=y;pose.offGrip.x+=x;pose.offGrip.y+=y;moved=true;}
    }
    if(!moved)break;
  }
  return pose;
}
export function meleePose(style, anim=0, aim=0, physique=null) {
  aim=Number.isFinite(aim)?aim:0;
  const active=anim>0, p=1-clamp(anim);
  const spear=style==='spear', hammer=isHeavyWeaponStyle(style),staff=style==='staff';
  const rest=hammer?-1.02:spear?-.12:-.68;
  // Facing left mirrors the swing: right-facing swings clockwise, left-facing counter-clockwise.
  const side=Math.cos(aim)<-.15?-1:1;
  const offset=side*(active ? keys(p, spear
    ? [[0,rest],[.18,-.18],[.43,0],[.64,.04],[1,rest]]
    : hammer
      ? [[0,rest],[.2,-1.48],[.46,0],[.68,.65],[1,rest]]
      : [[0,rest],[.18,-1.08],[.43,0],[.66,.88],[1,rest]]) : rest);
  const extension=spear&&active?keys(p,[[0,0],[.18,-3],[.43,10],[.64,6],[1,0]]):0;
  const angle=aim+offset, dx=Math.cos(angle), dy=Math.sin(angle);
  // Spears rest below the chin. When thrusting upwards, carry the shaft beside
  // the head rather than through the face; both grips move with that same axis.
  const shoulder=6*(physique?.bodyWidth||1),spacing=spear?13:6;
  const grip={x:side*4+dx*(9+extension*.6),y:-15+dy*(6+extension*.25)};
  // Raised shafts pass beside the face, with elbows below the shoulders.
  const clearance=clamp((-dy-.25)/.55);
  grip.x+=side*Math.max(0,9-Math.abs(grip.x))*clearance;
  const twoHanded=spear||hammer||staff;
  const offGrip=twoHanded?{x:grip.x-dx*spacing,y:grip.y-dy*spacing}
    : {x:-side*(shoulder+1.5),y:-10.5};
  return fitGrips({active,progress:p,angle,aim,grip,offGrip,side,twoHanded,spacing,
    length:spear?66:hammer?27:style==='staff'?48:style==='wand'?19:35,
    trail:active&&p>.22&&p<.66?Math.sin((p-.22)/.44*Math.PI):0},physique);
}

export function attackAnimationRate(item,attackSpeed=1) {
  const style=item?.weaponStyle||'sword';
  const duration=style==='spear'?.30:(style==='hammer'||style==='axe')?.44:style==='sword'?.18:.24;
  return Math.max(1, Math.min(2, Number(attackSpeed)||1))*(weaponCombatProfile(item).swingSpeed||1)/duration;
}

/** Equal, fixed bone lengths; choose the lower elbow instead of crossing the face. */
export function solveWeaponArm(shoulder,hand,physique=null) {
  const dx=hand.x-shoulder.x,dy=hand.y-shoulder.y,d=Math.max(.001,Math.hypot(dx,dy)),length=armLength(physique);
  const lift=Math.sqrt(Math.max(0,length*length-d*d*.25)),mx=(hand.x+shoulder.x)/2,my=(hand.y+shoulder.y)/2;
  const a={x:mx-dy/d*lift,y:my+dx/d*lift},b={x:mx+dy/d*lift,y:my-dx/d*lift};
  const resting=shoulder.x*hand.x>0&&Math.abs(hand.x-shoulder.x)<4&&hand.y>shoulder.y+5;
  const elbow=resting?(Math.abs(a.x)>Math.abs(b.x)?a:b):a.y>b.y+.001?a:b.y>a.y+.001?b:Math.abs(a.x)>Math.abs(b.x)?a:b;
  return {shoulder,elbow,hand,length};
}
function arm(c,shoulder,hand,colors,simple) {
  const {cloth,gloves,gloveProfile,physique}=colors,width=physique?.armWidth||1,skin=colors.hand||'#c1a083';
  const {elbow}=solveWeaponArm(shoulder,hand,physique),coverage=gloveProfile?.coverage||0;
  const upper=[[shoulder.x,shoulder.y],[elbow.x,elbow.y]],lower=[[elbow.x,elbow.y],[hand.x,hand.y]];
  segment(c,upper,'#283031',(simple?3:4.8)*width);segment(c,upper,cloth,(simple?2:3.6)*width);
  segment(c,lower,'#283031',(simple?3:4)*width);segment(c,lower,cloth,(simple?2:2.8)*width);
  if(!simple){
    const ratio=coverage>.05?.12+coverage*.68:.16;
    segment(c,[[hand.x,hand.y],[hand.x+(elbow.x-hand.x)*ratio,hand.y+(elbow.y-hand.y)*ratio]],coverage>.05?gloves:skin,2.8*width);
    segment(c,[[shoulder.x-.4,shoulder.y],[elbow.x-.4,elbow.y]],'#e5e1ca38',.6*width);
  }
}
function gripHand(c,x,y,angle,colors,simple=false) {
  const skin=(colors.gloveProfile?.coverage||0)>.5?colors.gloves:colors.hand||colors.gloves||'#c1a083';
  c.save();c.translate(x,y);c.rotate(angle);c.fillStyle=skin;c.strokeStyle='#303637';c.lineWidth=.55;
  c.beginPath();c.ellipse(0,0,simple?1.5:2.1,simple?1.7:2.4,0,0,TAU);c.fill();if(!simple){c.stroke();
    segment(c,[[-1.1,-1.4],[.9,-1.4]],'#f0dfba55',.65);
    segment(c,[[-.8,.6],[1.1,.6],[1,1.6]],'#30363780',.55);
    segment(c,[[1.2,-1.2],[-.7,-.3]],skin,1.5);
  }c.restore();
}
/** A shield is strapped to the supporting forearm when both hands are occupied. */
export function shieldMountFor(actor,pose,physique=null) {
  if(!pose.twoHanded&&actor.soldierClass!=='BLADEMASTER')return {x:pose.offGrip.x,y:pose.offGrip.y};
  const shoulder={x:-pose.side*6*(physique?.bodyWidth||1),y:-21};
  const {elbow}=solveWeaponArm(shoulder,pose.offGrip,physique);
  return {x:(elbow.x+pose.offGrip.x)/2-pose.side*3,y:(elbow.y+pose.offGrip.y)/2+3.5};
}
export function drawWeaponArms(c,actor,pose,colors,simple=false) {
  const shoulder=6*(colors.physique?.bodyWidth||1),{grip,offGrip,side,twoHanded}=pose;
  c.save();c.lineCap='round';c.lineJoin='round';
  if(colors.shieldProfile?.coverage){
    const mount=shieldMountFor(actor,pose,colors.physique);
    drawEquipmentShield(c,mount.x,mount.y,colors.board,colors.shieldProfile,simple);
  }
  arm(c,{x:-side*shoulder,y:-21},offGrip,colors,simple);
  arm(c,{x:side*shoulder,y:-21},grip,colors,simple);
  if(!twoHanded){
    gripHand(c,offGrip.x,offGrip.y,pose.angle,colors,simple);
  }
  c.restore();
}

export function drawMeleeWeapon(c, actor, style, colors, simple=false,withArms=true,heldPose=null) {
  const anim=actor.atkAnim||0;
  const aim=weaponAim(actor);
  const pose={...(heldPose||meleePose(style,anim,aim,colors.physique))}, {grip,offGrip}=pose;
  pose.length*=actor.equipped?.weapon?.weaponTraits?.length||1;
  const {cloth,gloves,blade,board,gloveProfile,shieldProfile,weaponProfile,hand,physique}=colors;
  c.save(); c.lineCap='round'; c.lineJoin='round';
  const twoHanded=pose.twoHanded;
  if(withArms)drawWeaponArms(c,actor,pose,colors,simple);
  c.translate(grip.x,grip.y); c.rotate(pose.angle);
  // The leading edge (axe blade, swing trace) faces the swing direction on both sides.
  if(pose.side<0)c.scale(1,-1);
  if(pose.trail>.01&&!simple) {
    // A narrow trace follows the striking edge. No filled wedge or glowing ring.
    c.globalAlpha=.24*pose.trail;
    if(style==='spear') segment(c,[[pose.length-14,0],[pose.length+5,0]],'#e9e2cc',1.1);
    else {
      c.strokeStyle='#e9e2cc';c.lineWidth=1.1;c.beginPath();
      c.arc(0,0,pose.length, -.36,0);c.stroke();
    }
    c.globalAlpha=1;
  }
  if(simple) {
    segment(c,[[style==='spear'?-24:-5,0],[pose.length,0]],blade,1.8);
    if(style==='hammer') segment(c,[[pose.length,-4],[pose.length,4]],blade,4);
    else if(style==='axe')polygon(c,[[pose.length-3,-2],[pose.length+3,1],[pose.length+4,8],[pose.length-6,7]],blade);
  } else if(style==='staff'||style==='wand') {
    segment(c,[[style==='staff'?-12:-5,0],[pose.length-3,0]],'#806747',style==='staff'?2.7:1.8);
    segment(c,[[1,-.5],[pose.length-5,-.5]],'#b6a582',.7);
    const tip=style==='staff'?4:2.7;
    polygon(c,[[pose.length-tip,-tip],[pose.length+tip,0],[pose.length-tip,tip],[pose.length-tip*2,0]],blade);
    if(weaponProfile?.detail>=1)segment(c,[[pose.length-9,-2],[pose.length-9,2]],'#cdb893',1.3);
  } else if(style==='spear') {
    segment(c,[[-30,0],[pose.length-10,0]],'#806747',2.4);
    segment(c,[[-29,-.4],[pose.length-12,-.4]],'#b6a582',.7);
    polygon(c,[[pose.length-12,-3],[pose.length,0],[pose.length-12,3],[pose.length-9,0]],blade);
    segment(c,[[pose.length-9,0],[pose.length-1,0]],weaponProfile?.rough?'#a98b61':'#e7e6da',.7);
  } else if(style==='axe') {
    const tip=pose.length;
    segment(c,[[-10,0],[tip+1,0]],'#806747',3.1);
    segment(c,[[-9,-.5],[tip-3,-.5]],'#c1a77d',.7);
    // A flared, bearded blade with a curved cutting edge and a separate eye.
    c.fillStyle=blade;c.strokeStyle='#303637';c.lineWidth=.8;c.beginPath();
    c.moveTo(tip-3,-2);c.lineTo(tip+2,-2);c.lineTo(tip+3,3);
    c.quadraticCurveTo(tip+8,6,tip+8,12);
    c.quadraticCurveTo(tip-1,18,tip-11,11);
    c.lineTo(tip-5,7);c.lineTo(tip-3,2);c.closePath();c.fill();c.stroke();
    c.fillStyle='#e4e5d2';c.beginPath();c.moveTo(tip+8,12);
    c.quadraticCurveTo(tip-1,18,tip-11,11);c.lineTo(tip-8,10);
    c.quadraticCurveTo(tip,14,tip+6,10);c.closePath();c.fill();
    polygon(c,[[tip-4,-3],[tip+1,-3],[tip+1,4],[tip-4,4]],'#66716b');
    segment(c,[[tip-3,-2],[tip-3,3]],'#c4cbb7',.8);
    if(weaponProfile?.detail>=1)segment(c,[[tip,5],[tip+4,8],[tip-4,11]],'#d2bd88',.7);
  } else if(style==='hammer') {
    segment(c,[[-10,0],[pose.length,0]],'#806747',3.3);
    polygon(c,[[pose.length-6,-6],[pose.length+4,-6],[pose.length+5,6],[pose.length-6,6]],blade);
    segment(c,[[pose.length-4,-4],[pose.length+2,-4]],weaponProfile?.rough?'#a98b61':'#e7e6da',1.1);
    segment(c,[[pose.length-1,-5],[pose.length-1,5]],'#525b5a',1);
  } else {
    polygon(c,[[5,-2.3],[pose.length-5,-2],[pose.length,0],[pose.length-5,2],[5,2.3]],blade);
    segment(c,[[7,0],[pose.length-2,0]],weaponProfile?.rough?'#a98b61':'#e7e6da',.8);
    segment(c,[[4,-5],[4,5]],'#b5a075',2);
    segment(c,[[-5,0],[3,0]],'#65513c',3.2);
    segment(c,[[-6,-1.5],[-6,1.5]],'#b5a075',2);
  }
  if(!simple&&weaponProfile){if(weaponProfile.rough){segment(c,[[-3,-1],[0,1],[2,-1]],'#ba9e72',1.2);segment(c,[[pose.length*.55,-1],[pose.length*.62,0]],'#62564a',.8);}else if(weaponProfile.detail>=1){segment(c,[[4,-3],[4,3]],'#d1c198',1.2);if(weaponProfile.detail>=2)segment(c,[[9,-.7],[pose.length-7,-.7]],'#dbd2b8',.6);}}
  gripHand(c,0,0,0,colors,simple);
  if(twoHanded)gripHand(c,-pose.spacing,0,0,colors,simple);
  c.restore();
  if(actor.soldierClass==='BLADEMASTER'&&style==='sword'&&!simple) {
    c.save();c.translate(offGrip.x,offGrip.y);c.rotate(aim-.9);
    segment(c,[[-3,0],[15,0]],blade,2);segment(c,[[1,-3],[1,3]],'#b5a075',1.5);gripHand(c,0,0,0,colors);c.restore();
  }
  return pose;
}

export function rangedPose(style,anim=0,aim=0,physique=null) {
  aim=Number.isFinite(aim)?aim:0;
  const active=anim>0,p=1-clamp(anim),dx=Math.cos(aim),dy=Math.sin(aim),nx=-dy,ny=dx,side=dx<-.15?-1:1;
  const draw=style==='bow'?(active?keys(p,[[0,5],[.2,11],[.43,3],[.65,4],[1,5]]):5):0;
  const recoil=active&&style!=='bow'?keys(p,[[0,0],[.2,0],[.43,2],[.7,0],[1,0]]):0;
  const grip={x:side*4+dx*(style==='bow'?10:4-recoil),y:-15+dy*(style==='bow'?5:3-recoil)};
  if(dy<-.35){
    // The width of a raised bow/stock/barrel also needs to clear the face.
    const clearance=style==='bow'?15:style==='cannon'?15:13;
    grip.x+=side*Math.max(0,clearance-Math.abs(grip.x))*clamp((-dy-.35)/.4);
  }
  const offGrip=style==='bow'?{x:grip.x-dx*draw+nx,y:grip.y-dy*draw+ny}
    :{x:grip.x+dx*11-nx*3,y:grip.y+dy*11-ny*3};
  return fitGrips({active,progress:p,angle:aim,aim,side,grip,offGrip,twoHanded:true,draw,recoil},physique);
}
export function drawRangedWeapon(c,actor,style,colors,simple=false,withArms=true,heldPose=null) {
  const anim=actor.atkAnim||0,aim=weaponAim(actor);
  const pose=heldPose||rangedPose(style,anim,aim,colors.physique),{grip,offGrip}=pose,{blade,weaponProfile}=colors;
  c.save();c.lineCap='round';c.lineJoin='round';
  if(withArms)drawWeaponArms(c,actor,pose,colors,simple);
  c.translate(grip.x,grip.y);c.rotate(pose.angle);
  if(style==='bow'){
    c.strokeStyle=blade;c.lineWidth=simple?1.5:2.4;c.beginPath();c.moveTo(0,-15);c.bezierCurveTo(7,-11,7,-4,0,0);c.bezierCurveTo(7,4,7,11,0,15);c.stroke();
    segment(c,[[0,-15],[-pose.draw,1],[0,15]],'#d4c4a0',.7);
    segment(c,[[-pose.draw-3,1],[21,1]],'#bca887',1);
    if(!simple){polygon(c,[[21,-1],[25,1],[21,3]],blade);segment(c,[[-pose.draw-2,-1],[-pose.draw+1,1],[-pose.draw-2,3]],'#d1cab0',1.2);}
  }else if(style==='crossbow'){
    segment(c,[[-5,0],[23,-3]],'#725737',4);
    segment(c,[[3,-3],[24,-3]],blade,2.2);
    segment(c,[[16,-13],[19,-3],[16,7]],blade,2.2);
    segment(c,[[16,-13],[9,-3],[16,7]],'#d4c4a0',.7);
    segment(c,[[9,-3],[27,-3]],'#bca887',.9);
    if(!simple)segment(c,[[1,0],[3,3],[6,1]],'#41463f',1.1);
  }else{
    // Large-bore shoulder gun: separate walnut stock, receiver, pump and open muzzle.
    polygon(c,[[-19,-3],[-12,-6],[-4,-4],[0,-1],[-6,3],[-18,5]],'#76563d');
    polygon(c,[[-20,-3],[-17,-3],[-16,5],[-20,5]],'#30332f');
    polygon(c,[[-6,-7],[7,-7],[9,-2],[4,2],[-5,2]],blade);
    polygon(c,[[-2,1],[3,1],[2,7],[-1,8],[-4,6]],'#634b36');
    polygon(c,[[6,-7],[30,-7.5],[31,-2],[6,-2]],blade);
    polygon(c,[[8,-1],[25,-1],[25,2],[8,2]],'#514b40');
    polygon(c,[[9,-2],[19,-2],[19,3],[9,3]],'#896443');
    polygon(c,[[29,-8],[33,-7],[33,0],[29,1]],'#737d7b');
    c.fillStyle='#131b1b';c.beginPath();c.ellipse(32,-3.5,1.8,3.1,0,0,TAU);c.fill();
    segment(c,[[29,-7.5],[32,-7]],'#d6dfd9',.9);
    if(!simple){
      segment(c,[[6,-6.5],[28,-6.8]],'#e1e6d9',.85);
      segment(c,[[27,-8.5],[29,-8.5]],'#242e2e',1.6); // front sight
      segment(c,[[5,-8.5],[24,-8.5]],'#465353',1); // rib over barrel
      for(const x of [11,14,17])segment(c,[[x,-1],[x,2]],'#4c3729',.65);
      segment(c,[[-15,-2],[-8,0]],'#b49468',.85);
      segment(c,[[1,2],[6,2],[6,5],[3,6]],'#2d3532',1); // trigger guard
      c.fillStyle='#313b38';c.fillRect(1,-5,4,2); // ejection port
    }
  }
  if(!simple&&weaponProfile?.detail>=1)segment(c,[[6,-4],[9,-4]],'#ccba8f',1.3);
  c.restore();
  gripHand(c,grip.x,grip.y,pose.angle,colors,simple);gripHand(c,offGrip.x,offGrip.y,pose.angle,colors,simple);
  return pose;
}

/** Quiet ground marks use the SAME distance bands as the damage calculation.
 * Only the player gets these marks; crowds retain their weapon motion without
 * dozens of overlapping range circles. The sprite remains an illustration.
 */
export function drawMeleeRangeCue(c,x,y,angle,reach,style,anim=0,item=null) {
  const cfg=meleeSweetSpotFor(item||style);
  if(!cfg||!(reach>0)||!(anim>0))return;
  const pose=meleePose(style,anim,angle), opacity=.16+.15*pose.trail;
  const dx=Math.cos(pose.aim),dy=Math.sin(pose.aim),nx=-dy,ny=dx;
  c.save();c.lineCap='round';c.lineWidth=1;c.strokeStyle='#a9aea0';c.globalAlpha=opacity;
  for(const radius of [cfg.sweetMin*reach,Math.min(1,cfg.sweetMax)*reach]) {
    segment(c,[[x+dx*radius-nx*3,y+dy*radius-ny*3],[x+dx*radius+nx*3,y+dy*radius+ny*3]],'#a9aea0',1);
  }
  c.strokeStyle='#d4c6a0';c.globalAlpha=opacity+.12;c.beginPath();
  c.arc(x,y,reach*cfg.peak,pose.aim-.12,pose.aim+.12);c.stroke();c.restore();
}

export function meleeDrawReach(item,advanced=false) {
  const profile=weaponCombatProfile(item);
  return advanced?profile.reachWarlord:profile.playerReach||profile.reach;
}
