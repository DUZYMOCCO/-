import {drawEquipmentShield} from './equipment-art.js?v=182';
import { MELEE_SWEET_SPOT, meleeSweetSpotFor, weaponCombatProfile } from './equipment-rules.js?v=182';

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
  // Spears rest below the chin. When thrusting upwards, carry the shaft beside
  // the head rather than through the face; both grips move with that same axis.
  const headClearance=spear?clamp((-dy-.35)/.65)*6:0;
  const grip={x:side*(3+headClearance)+dx*(9+extension), y:(spear?-14:-16)+dy*(7+extension*.6)};
  const offGrip=spear?{x:grip.x-dx*13,y:grip.y-dy*13}
    : hammer?{x:grip.x-dx*5,y:grip.y-dy*5}
    : {x:-side*8,y:-14};
  return {active,progress:p,angle,aim,grip,offGrip,side,
    length:spear?66:hammer?27:style==='staff'?48:style==='wand'?19:35,
    trail:active&&p>.22&&p<.66?Math.sin((p-.22)/.44*Math.PI):0};
}

export function attackAnimationRate(item,attackSpeed=1) {
  const style=item?.weaponStyle||'sword';
  const duration=style==='spear'?.30:(style==='hammer'||style==='axe')?.34:.24;
  return Math.max(1, Math.min(2, Number(attackSpeed)||1))*(weaponCombatProfile(item).swingSpeed||1)/duration;
}

function arm(c, shoulder, hand, cloth, glove, bend, simple,coverage=0,skin='#c1a083',width=1,lowElbow=false) {
  const dx=hand.x-shoulder.x,dy=hand.y-shoulder.y,d=Math.max(1,Math.hypot(dx,dy));
  const elbowLift=Math.sqrt(Math.max(3,Math.max(10,d*.54)**2-d*d*.25));
  const elbow={x:(hand.x+shoulder.x)*.5-dy/d*elbowLift*bend,
    y:(hand.y+shoulder.y)*.5+dx/d*elbowLift*bend};
  if(lowElbow){
    const other={x:(hand.x+shoulder.x)*.5+dy/d*elbowLift*bend,y:(hand.y+shoulder.y)*.5-dx/d*elbowLift*bend};
    if(other.y>elbow.y){elbow.x=other.x;elbow.y=other.y;}
  }
  // Thick arms carry a resting weapon from below, leaving the face visible.
  if(width>1&&hand.y>-26)elbow.y=Math.max(elbow.y,shoulder.y+3);
  segment(c,[[shoulder.x,shoulder.y],[elbow.x,elbow.y],[hand.x,hand.y]],'#283031',(simple?3:4.4)*width);
  segment(c,[[shoulder.x,shoulder.y],[elbow.x,elbow.y],[hand.x,hand.y]],cloth,(simple?2:3)*width);
  if(coverage>0&&!simple){const ratio=.15+coverage*.75;segment(c,[[hand.x,hand.y],[hand.x+(elbow.x-hand.x)*ratio,hand.y+(elbow.y-hand.y)*ratio]],glove,3.5*width);}
  if(!simple) { c.fillStyle=coverage>.5?glove:skin; c.beginPath();c.ellipse(hand.x,hand.y,2.2,2.3,0,0,TAU);c.fill(); }
}

export function drawMeleeWeapon(c, actor, style, colors, simple=false) {
  const anim=actor.atkAnim||0;
  const aim=anim>0&&Number.isFinite(actor.attackAngle)?actor.attackAngle:(actor.facingAngle||0);
  const pose=meleePose(style,anim,aim), {grip,offGrip,side}=pose;pose.length*=actor.equipped?.weapon?.weaponTraits?.length||1;
  const {cloth,gloves,blade,board,gloveProfile,shieldProfile,weaponProfile,hand,physique}=colors;
  const shoulder=6*(physique?.bodyWidth||1),armWidth=physique?.armWidth||1;
  c.save(); c.lineCap='round'; c.lineJoin='round';
  const twoHanded=style==='spear'||style==='hammer'||style==='axe'||style==='staff';
  if(twoHanded||actor.soldierClass==='BLADEMASTER') arm(c,{x:-side*shoulder,y:-21},offGrip,cloth,gloves,-side,simple,gloveProfile?.coverage||0,hand,armWidth,style==='spear');
  arm(c,{x:side*shoulder,y:-21},grip,cloth,gloves,side,simple,gloveProfile?.coverage||0,hand,armWidth,style==='spear');
  if(!twoHanded&&actor.soldierClass!=='BLADEMASTER'&&!simple&&shieldProfile?.coverage) {
    // The shield follows the supporting hand rather than covering the weapon grip.
    const x=offGrip.x,y=offGrip.y;
    drawEquipmentShield(c,x,y,board,shieldProfile,simple);
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
  } else if(style==='staff'||style==='wand') {
    segment(c,[[-5,0],[pose.length-3,0]],'#806747',style==='staff'?2.7:1.8);
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
    segment(c,[[-7,0],[pose.length,0]],'#806747',3.1);
    polygon(c,[[pose.length-6,-3],[pose.length+3,-7],[pose.length+7,-2],[pose.length+7,6],[pose.length+2,9],[pose.length-4,5]],blade);
    segment(c,[[pose.length+6,-2],[pose.length+6,5],[pose.length+2,8]],weaponProfile?.rough?'#a98b61':'#e7e6da',1);
  } else if(style==='hammer') {
    segment(c,[[-7,0],[pose.length,0]],'#806747',3.3);
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
  // Paint the fingers over the shaft/hilt, never over the blade or guard.
  if(!simple) {
    const skin=(gloveProfile?.coverage||0)>.5?gloves:(hand||gloves);
    if(style==='spear'){
      // Curled fingers and a thumb wrap the shaft instead of square blocks.
      for(const x of [0,-13]){
        polygon(c,[[x-2,-1.6],[x-1.2,-2.6],[x+1,-2.5],[x+2.2,-1.3],[x+2,1.7],[x+.8,2.4],[x-1.5,1.9],[x-2.2,.5]],skin);
        segment(c,[[x-1,-1.7],[x+.8,-1.7]],'#eee0c266',.6);
        segment(c,[[x-.6,.5],[x+1.3,.5],[x+1.3,1.5]],'#3f473b80',.55);
        segment(c,[[x+1.3,-1.1],[x-.6,-.3]],skin,1.5);
      }
    }else{
      c.fillStyle=skin;c.fillRect(-2,-2,4,4);
      if(twoHanded)c.fillRect(-7,-2,4,4);
    }
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
