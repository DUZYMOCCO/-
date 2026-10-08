import { MELEE_SWEET_SPOT, weaponCombatProfile } from './equipment-rules.js?v=103';

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
export function meleePose(style, anim=0, aim=0) {
  aim=Number.isFinite(aim)?aim:0;
  const active=anim>0, p=1-clamp(anim);
  const spear=style==='spear', hammer=style==='hammer'||style==='axe';
  const rest=hammer?-1.02:spear?-.12:-.68;
  const offset=active ? keys(p, spear
    ? [[0,rest],[.18,-.18],[.43,0],[.64,.04],[1,rest]]
    : hammer
      ? [[0,rest],[.2,-1.48],[.46,0],[.68,.65],[1,rest]]
      : [[0,rest],[.18,-1.08],[.43,0],[.66,.88],[1,rest]]) : rest;
  const extension=spear&&active?keys(p,[[0,0],[.18,-3],[.43,10],[.64,6],[1,0]]):0;
  const angle=aim+offset, dx=Math.cos(angle), dy=Math.sin(angle);
  const side=Math.cos(aim)<-.15?-1:1;
  const grip={x:side*3+dx*(9+extension), y:-16+dy*(7+extension*.6)};
  const offGrip=spear?{x:grip.x-dx*13,y:grip.y-dy*13}
    : hammer?{x:grip.x-dx*5,y:grip.y-dy*5}
    : {x:-side*8,y:-14};
  return {active,progress:p,angle,aim,grip,offGrip,side,
    length:spear?66:hammer?27:35,
    trail:active&&p>.22&&p<.66?Math.sin((p-.22)/.44*Math.PI):0};
}

export function attackAnimationRate(item,attackSpeed=1) {
  const style=item?.weaponStyle||'sword';
  const duration=style==='spear'?.30:(style==='hammer'||style==='axe')?.34:.24;
  return Math.max(1, Math.min(2, Number(attackSpeed)||1))/duration;
}

function arm(c, shoulder, hand, cloth, glove, bend, simple) {
  const dx=hand.x-shoulder.x,dy=hand.y-shoulder.y,d=Math.max(1,Math.hypot(dx,dy));
  const elbowLift=Math.sqrt(Math.max(3,Math.max(10,d*.54)**2-d*d*.25));
  const elbow={x:(hand.x+shoulder.x)*.5-dy/d*elbowLift*bend,
    y:(hand.y+shoulder.y)*.5+dx/d*elbowLift*bend};
  segment(c,[[shoulder.x,shoulder.y],[elbow.x,elbow.y],[hand.x,hand.y]],'#283031',simple?3:4.4);
  segment(c,[[shoulder.x,shoulder.y],[elbow.x,elbow.y],[hand.x,hand.y]],cloth,simple?2:3);
  if(!simple) { c.fillStyle=glove; c.beginPath();c.ellipse(hand.x,hand.y,2.2,2.3,0,0,TAU);c.fill(); }
}

export function drawMeleeWeapon(c, actor, style, colors, simple=false) {
  const anim=actor.atkAnim||0;
  const aim=anim>0&&Number.isFinite(actor.attackAngle)?actor.attackAngle:(actor.facingAngle||0);
  const pose=meleePose(style,anim,aim), {grip,offGrip,side}=pose;
  const {cloth,gloves,blade,board}=colors;
  c.save(); c.lineCap='round'; c.lineJoin='round';
  const twoHanded=style==='spear'||style==='hammer'||style==='axe';
  if(twoHanded||actor.soldierClass==='BLADEMASTER') arm(c,{x:-side*6,y:-21},offGrip,cloth,gloves,-side,simple);
  arm(c,{x:side*6,y:-21},grip,cloth,gloves,side,simple);
  if(!twoHanded&&actor.soldierClass!=='BLADEMASTER'&&!simple) {
    // The shield follows the supporting hand rather than covering the weapon grip.
    const x=offGrip.x,y=offGrip.y;
    polygon(c,[[x-5,y-9],[x+4,y-9],[x+4,y+3],[x,y+8],[x-5,y+3]],board);
    segment(c,[[x,y-6],[x,y+3]],'#b8b39b',1.2);
    c.fillStyle=gloves;c.fillRect(x-1.5,y-1.5,3,3);
  }
  c.translate(grip.x,grip.y); c.rotate(pose.angle);
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
    if(style==='hammer'||style==='axe') segment(c,[[pose.length,-4],[pose.length,4]],blade,4);
  } else if(style==='spear') {
    segment(c,[[-30,0],[pose.length-10,0]],'#806747',2.4);
    segment(c,[[-29,-.4],[pose.length-12,-.4]],'#b6a582',.7);
    polygon(c,[[pose.length-12,-3],[pose.length,0],[pose.length-12,3],[pose.length-9,0]],blade);
    segment(c,[[pose.length-9,0],[pose.length-1,0]],'#e7e6da',.7);
  } else if(style==='axe') {
    segment(c,[[-7,0],[pose.length,0]],'#806747',3.1);
    polygon(c,[[pose.length-6,-3],[pose.length+3,-7],[pose.length+7,-2],[pose.length+7,6],[pose.length+2,9],[pose.length-4,5]],blade);
    segment(c,[[pose.length+6,-2],[pose.length+6,5],[pose.length+2,8]],'#e7e6da',1);
  } else if(style==='hammer') {
    segment(c,[[-7,0],[pose.length,0]],'#806747',3.3);
    polygon(c,[[pose.length-6,-6],[pose.length+4,-6],[pose.length+5,6],[pose.length-6,6]],blade);
    segment(c,[[pose.length-4,-4],[pose.length+2,-4]],'#e7e6da',1.1);
    segment(c,[[pose.length-1,-5],[pose.length-1,5]],'#525b5a',1);
  } else {
    polygon(c,[[5,-2.3],[pose.length-5,-2],[pose.length,0],[pose.length-5,2],[5,2.3]],blade);
    segment(c,[[7,0],[pose.length-2,0]],'#e7e6da',.8);
    segment(c,[[4,-5],[4,5]],'#b5a075',2);
    segment(c,[[-5,0],[3,0]],'#65513c',3.2);
    segment(c,[[-6,-1.5],[-6,1.5]],'#b5a075',2);
  }
  // Paint the fingers over the shaft/hilt, never over the blade or guard.
  if(!simple) {
    c.fillStyle=gloves;c.fillRect(-2,-2,4,4);
    if(twoHanded) c.fillRect(style==='spear'?-15:-7,-2,4,4);
  }
  c.restore();
  if(actor.soldierClass==='BLADEMASTER'&&style==='sword'&&!simple) {
    c.save();c.translate(offGrip.x,offGrip.y);c.rotate(aim-.9);
    segment(c,[[-3,0],[15,0]],blade,2);segment(c,[[1,-3],[1,3]],'#b5a075',1.5);c.restore();
  }
  return pose;
}

/** Quiet ground marks use the SAME distance bands as the damage calculation.
 * Only the player gets these marks; crowds retain their weapon motion without
 * dozens of overlapping range circles. The sprite remains an illustration.
 */
export function drawMeleeRangeCue(c,x,y,angle,reach,style,anim=0) {
  const cfg=MELEE_SWEET_SPOT[style];
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
  return advanced?profile.reachWarlord:profile.reach;
}
