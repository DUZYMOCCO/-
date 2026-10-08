import {MAGIC_AFFINITIES,ensureMana} from './magic-rules.js?v=104';
import { drawMeleeWeapon, drawMeleeRangeCue } from './weapon-motion.js?v=104';
import { drawSoldierHead, isMedicAppearance, soldierAppearanceFamily } from './soldier-appearance.js?v=104';

// Live field illustrations. Equipment colors are read every frame.
// Hands and the weapon share one pose; only the striking edge gets a short trace.
const ellipse = (c, x, y, rx, ry, color) => {
  c.fillStyle = color; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill();
};
export function contactSpread(rx, ry, plant = 0) {
  const spread = Math.max(0, Math.min(1, plant));
  return { rx: rx * (1 + 0.46 * spread), ry: ry * (1 - 0.18 * spread) };
}
export function contactShadow(c, x, y, rx, ry, plant = 0) {
  const spread = contactSpread(rx, ry, plant);
  c.fillStyle = 'rgba(0,0,0,0.16)';
  c.beginPath(); c.ellipse(x, y + 1.2, spread.rx * 1.28, spread.ry * 1.35, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(0,0,0,0.36)';
  c.beginPath(); c.ellipse(x, y, spread.rx, Math.max(1.15, spread.ry * 0.62), 0, 0, Math.PI * 2); c.fill();
}
/** Compatibility entry for existing spear callers; the cue now shows its useful band. */
export function drawSpearReachCue(c,x,y,angle,reach,anim=0) {
  drawMeleeRangeCue(c,x,y,angle,reach,'spear',anim);
}
const shape = (c, points, color, edge = '#20282a') => {
  c.fillStyle = color; c.strokeStyle = edge; c.lineWidth = 0.9;
  c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
  c.closePath(); c.fill(); c.stroke();
};
const line = (c, points, color, width = 1) => {
  c.strokeStyle = color; c.lineWidth = width; c.beginPath();
  points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke();
};
function fieldTone(hex, dust = 0.65) {
  if (typeof hex !== 'string' || hex[0] !== '#' || hex.length < 7) return hex;
  const n = Number.parseInt(hex.slice(1, 7), 16);
  if (!Number.isFinite(n)) return hex;
  const mix = Math.max(0, Math.min(1, dust));
  const ch = (v, target) => Math.round(v * (1 - mix) + target * mix).toString(16).padStart(2, '0');
  return `#${ch((n >> 16) & 255, 96)}${ch((n >> 8) & 255, 88)}${ch(n & 255, 74)}`;
}
const CLOTH = {
  HEAVY: '#687e91', LIGHT: '#a38b60', ARCHER: '#607b60', MEDIC: '#c2bda2', MAGE:'#71627e',
  PALADIN: '#ccd0c3', BLADEMASTER: '#555c69', SNIPER: '#426557', HIGH_PRIEST: '#d1c5ab',
  COMMANDER: '#71858a', WARLORD: '#a29270'
};

export function drawFieldSoldier(c, s, now, cls, platoonColor, simpleLod, displayEquipment=null) {
  const key = s.soldierClass || 'HEAVY', eq = displayEquipment || s.equipped || {};
  const medic = isMedicAppearance(key);
  const family = cls.baseClassId || soldierAppearanceFamily(key);
  const mage=family==='MAGE';if(mage)ensureMana(s);
  const spellColor=mage?MAGIC_AFFINITIES[s.magicAffinity].color:null;
  const advanced = !!cls.isAdvanced;
  const cloth = fieldTone(eq.armor?.color || CLOTH[key] || CLOTH[family] || CLOTH.HEAVY, 0.82);
  const steel = fieldTone(eq.helmet?.color || (advanced ? '#d1c4a3' : '#9daab0'), 0.62);
  const legs = fieldTone(eq.legs?.color || '#5c564c', 0.74);
  const gloves = fieldTone(eq.gloves?.color || '#a09080', 0.7);
  const board = fieldTone(eq.shield?.color || '#566b7c', 0.8);
  const blade = fieldTone((eq.weapon || s.weapon)?.color || '#c3cbca', 0.34);
  const moving = Math.hypot(s.vx || 0, s.vy || 0) > 0.05;
  const stride = moving ? Math.sin(now * 0.016 + (s.animOffset || 0)) * 2.8 : 0;
  const bob = moving ? Math.abs(stride) * 0.25 : 0;
  const archer = family === 'ARCHER';
  const light = family === 'LIGHT';
  const wStyle = (eq.weapon || s.weapon)?.weaponStyle || 'sword';
  const melee = !archer && !medic && !mage && ['sword','spear','hammer','axe'].includes(wStyle);
  const weaponColors = {cloth,gloves,blade,board};
  c.save(); c.translate(s.x, s.y);
  const plant = s.isDown ? 1 : (moving ? Math.abs(stride) / 2.8 : 0.22);
  contactShadow(c, 2, 3, s.isDown ? 16 : 11, s.isDown ? 4.2 : 3.5, plant);
  // Perf v1.24.2: far/edge soldiers = silhouette only (skip gear/weapon strokes).
  if (simpleLod && !s.isDown) {
    c.fillStyle = cloth;
    c.beginPath(); c.ellipse(0, -14, 6, 10, 0, 0, Math.PI * 2); c.fill();
    c.fillRect(-8,-20,2.5,11);c.fillRect(5.5,-20,2.5,11);
    c.fillStyle='#2a2624';c.fillRect(-5,-5,4,7);c.fillRect(2,-5,4,7);
    drawSoldierHead(c,s,{y:-26,scale:.8,small:true,silhouette:true,helmet:eq.helmet?steel:null,mitre:medic&&advanced,cap:medic&&!advanced});
    if(medic) {
      c.fillStyle='#d2cfb9';c.fillRect(-2,-18,4,8);
      c.fillStyle='#95574f';c.fillRect(-.5,-16,1,4);c.fillRect(-2,-14.5,4,1);
    }
    if(mage){shape(c,[[-6,-19],[-8,0],[7,0],[6,-19]],'#65566f');line(c,[[12,0],[12,-29]],'#857053',1.5);ellipse(c,12,-30,2,3,s.mana>0?spellColor:'#6d6674');shape(c,[[-7,-31],[1,-39],[7,-31]],'#5d5269');}
    c.fillStyle = platoonColor; c.fillRect(-2, 4, 4, 2);
    if (s.isPersonalGuard) { c.fillStyle = '#c8b278'; c.fillRect(4, 4, 3, 2); }
    if (s.maxHp > 0 && s.hp < s.maxHp * 0.55) {
      const healthY=medic&&advanced?-44:-39;
      c.fillStyle = '#283132'; c.fillRect(-12, healthY, 24, 3);
      c.fillStyle = '#c4b48a'; c.fillRect(-12, healthY, 24 * Math.max(0, Math.min(1, s.hp / s.maxHp)), 3);
    }
    if (melee && s.atkAnim > 0) drawMeleeWeapon(c,s,wStyle,weaponColors,true);
    c.restore(); return;
  }
  if (s.isDown) {
    shape(c,[[-18,-3],[16,-7],[20,3],[-14,6]],cloth);
    if(medic){c.fillStyle='#ded8be';c.fillRect(-2,-4,7,6);c.fillStyle='#95574f';c.fillRect(1,-3,1.2,4);c.fillRect(-.5,-1.5,4,1.2);}
    c.save();c.translate(-20,-1);c.rotate(-Math.PI/2);
    drawSoldierHead(c,s,{scale:.9,small:true,silhouette:true,helmet:eq.helmet?steel:null,mitre:medic&&advanced,cap:medic&&!advanced});c.restore();
    line(c,[[10,-2],[22,2],[18,6]],'#3c4038',2.5);
    c.fillStyle = '#e6d7b8'; c.textAlign = 'center'; c.font = 'bold 10px sans-serif';
    c.fillText(s.carrierId?'搬送中':`救助 ${Math.ceil(s.downTimer || 0)}秒`, 0, -16);
    c.fillStyle = '#242c30'; c.fillRect(-16, -12, 32, 3);
    c.fillStyle = '#d7b56a'; c.fillRect(-16, -12, 32 * Math.min(1, Math.max(0, s.rescueProgress || 0)), 3);
    c.restore(); return;
  }
  const bodyFacing=s.atkAnim>0&&Number.isFinite(s.attackAngle)?s.attackAngle:(s.facingAngle||0);
  c.save(); if (Math.cos(bodyFacing) < -0.15) c.scale(-1, 1);
  c.translate(0, -bob);
  // Cloak, boots and an articulated torso give every class a distinct silhouette.
  if (advanced || s.isNamed || archer) {
    shape(c, [[-4,-23],[-11,-17],[-14,-1],[-5,-5],[4,-17]], s.isCommander ? (advanced?'#794e41':'#3e5863') : (archer ? '#3d5148' : '#795d51'));
    line(c, [[-7,-17],[-10,-4]], '#b59a72');
  }
  c.fillStyle = legs;
  c.fillRect(-5 + stride,-8,4,9); c.fillRect(2 - stride,-8,4,9);
  c.fillStyle = '#2a2624'; c.fillRect(-6 + stride,0,6,3); c.fillRect(1 - stride,0,6,3);
  shape(c, [[-6,-23],[5,-23],[8,-11],[5,-6],[-6,-7],[-8,-15]], cloth);
  shape(c, [[-6,-22],[-1,-21],[-1,-9],[-6,-10]], 'rgba(255,255,255,.13)', 'transparent');
  shape(c, [[3,-22],[6,-20],[7,-10],[3,-8]], 'rgba(0,0,0,.2)', 'transparent');
  c.fillStyle = '#64503c'; c.fillRect(-7,-10,14,2);
  c.fillStyle = '#d2b783'; c.fillRect(0,-10,2,2);
  c.fillStyle = platoonColor; c.fillRect(-6,-21,3,4);
  if (medic && advanced) {
    shape(c,[[-6,-17],[-9,1],[7,1],[5,-17]],'#c6bc9c');
    line(c,[[-3,-14],[-5,-1],[3,-14],[4,-1]],'#eee3c2',1.3);
    c.fillStyle='#a18765'; c.fillRect(-2,-19,3,19);
  }
  if(mage){shape(c,[[-6,-19],[-9,1],[8,1],[5,-19]],'#685875');line(c,[[-4,-18],[-5,-2],[5,-18],[6,-2]],spellColor,1.1);c.fillStyle='#b1a389';c.fillRect(-6,-10,12,2);}
  if (light) {
    line(c,[[-5,-21],[4,-9]],'#c8b797',2);
    line(c,[[-5,-19],[3,-10]],'#5c4633',.7);
    c.fillStyle='#624d38'; c.fillRect(-7,-12,3,5);
  }
  if (medic) {
    c.fillStyle = '#e1d9bf'; c.fillRect(-3,-21,5,11);
    c.fillStyle = '#95574f'; c.fillRect(-1,-18,1.5,5); c.fillRect(-3,-16,5,1.5);
  } else if (!archer && !light && !mage) {
    line(c, [[-5,-18],[5,-18],[-4,-15],[5,-15]], '#adb7bb', .8);
    ellipse(c,-7,-21,3.5,2.5,steel); ellipse(c,6,-21,3.5,2.5,steel);
    for (const x of [-5,4]) {
      ellipse(c,x,-18,.65,.65,'#d4c3a2'); ellipse(c,x,-12,.65,.65,'#d4c3a2');
    }
    if (key === 'PALADIN') {
      shape(c,[[-8,-24],[-11,-20],[-5,-18],[-3,-22]],'#bfad7d');
      shape(c,[[5,-24],[10,-21],[7,-18],[3,-21]],'#bfad7d');
      c.fillStyle='#d4c39a'; c.fillRect(-1,-22,2,9); c.fillRect(-3,-19,6,2);
    }
    if(s.isCommander) {
      // Officer sash, layered pauldrons and rank marks; metal stays matte.
      line(c,[[-5,-22],[4,-10]],advanced?'#d2bb83':'#b7bda8',2.5);
      shape(c,[[-9,-24],[-11,-19],[-6,-18],[-4,-22]],steel);
      shape(c,[[6,-24],[10,-21],[8,-18],[4,-21]],steel);
      for(let i=0;i<Math.min(3,s.rankIndex || 0);i++)line(c,[[-6,-16+i*2],[-4,-14+i*2],[-2,-16+i*2]],'#d5c296',.8);
    }
  }
  // Hands, face and headwear, with a restrained highlight on the upper edge.
  if (!melee) ellipse(c, 6,-15,2.3,3.5,gloves);
  if (!s.isCommander) {
    drawSoldierHead(c,s,{y:-28,small:true,helmet:eq.helmet?steel:null,
      mitre:medic&&advanced,cap:medic&&!advanced});
  } else {
  ellipse(c, 0,-27,5.1,5.3,'#c1a083');
  if (key === 'BLADEMASTER') {
    shape(c,[[-6,-24],[-6,-31],[-2,-35],[4,-33],[6,-28],[0,-30]],'#373c40');
    line(c,[[-5,-30],[5,-30]],'#c1a878',1.5);
    shape(c,[[-5,-30],[-13,-27],[-15,-30],[-6,-32]],'#a48d69');
  } else if (key === 'HIGH_PRIEST') {
    shape(c,[[-5,-28],[-4,-37],[0,-42],[5,-37],[6,-28]],'#d9ceb1');
    line(c,[[0,-39],[0,-29]],'#9d8159',1.5);
    line(c,[[-4,-31],[5,-31]],'#9d8159');
  } else if (archer || medic || light) {
    shape(c,[[-6,-27],[-4,-34],[2,-35],[6,-30],[5,-26],[2,-30],[-1,-31],[-4,-27]],cloth);
    line(c,[[-4,-32],[0,-34],[3,-33]],'#b4b9aa');
  } else {
    ellipse(c,0,-29,6,5.5,steel);
    c.fillStyle = '#313b42'; c.fillRect(0,-29,5,2);
    c.fillStyle = '#c5d0cf'; c.fillRect(-3,-33,4,1);
    c.fillStyle = '#647077'; c.fillRect(-5,-28,2,5);
    if (advanced || s.isNamed) shape(c,[[-2,-34],[-3,-40],[1,-38],[2,-33]],'#ab765b');
    if(key==='WARLORD') {
      shape(c,[[-5,-33],[-5,-37],[-2,-35],[0,-39],[2,-35],[5,-37],[5,-33]],'#c9b481');
      c.fillStyle='#708180';c.fillRect(-4,-32,8,1);
    }
  }
  c.fillStyle = '#302b28'; c.fillRect(2,-27,1.3,1);
  }
  if(mage){
    if(!eq.helmet){shape(c,[[-8,-32],[0,-44],[7,-32]],'#62536e');line(c,[[-9,-32],[9,-32]],'#9f8caa',2);}
    const recovering=!!s.magicRecovering;line(c,[[13,-1],[13,recovering?-22:-34]],'#96805b',2.2);shape(c,[[13,recovering?-29:-41],[17,recovering?-24:-36],[13,recovering?-19:-31],[9,recovering?-24:-36]],s.mana>0?spellColor:'#747078');shape(c,[[-9,-16],[-4,-15],[-4,-7],[-10,-8]],'#a2957a');
    c.fillStyle='#282535';c.fillRect(-13,-49,26,2);c.fillStyle=spellColor;c.fillRect(-13,-49,26*s.mana/s.maxMana,2);
    if(recovering){c.fillStyle='#c1b6d1';c.font='10px sans-serif';c.textAlign='center';c.fillText('瞑想',0,-53);}
  } else if (archer) {
    const rw = (eq.weapon && eq.weapon.weaponStyle) || 'bow';
    // 矢筒は共通
    shape(c,[[-8,-24],[-12,-25],[-13,-10],[-9,-9]],'#6b503b');
    line(c,[[-11,-23],[-12,-31]],'#baa889');
    line(c,[[-10,-29],[-13,-31],[-11,-32]],'#c9c6ad',2);
    if (rw === 'cannon') {
      // 小型火砲: 太い砲身＋口
      c.save(); c.translate(8,-14); c.rotate(-0.15);
      shape(c,[[0,-4],[18,-6],[19,2],[0,4]],blade);
      shape(c,[[16,-7],[22,-5],[22,1],[16,3]],'#302b28');
      ellipse(c,3,0,3,3,'#6a4c38');
      c.restore();
    } else if (rw === 'crossbow') {
      // クロスボウ: 水平アーム＋太いストック
      line(c,[[4,-16],[20,-16]],blade,2.4);
      line(c,[[6,-22],[6,-10]],blade,2.2);
      line(c,[[4,-22],[8,-22]],'#c5b790',1.5);
      line(c,[[4,-10],[8,-10]],'#c5b790',1.5);
      shape(c,[[8,-18],[14,-18],[15,-14],[8,-14]],'#6a4c38');
    } else {
      // 弓: カーブ＋弦
      c.strokeStyle = blade; c.lineWidth = 2;
      c.beginPath(); c.moveTo(9,-28); c.quadraticCurveTo(22,-16,9,-3); c.stroke();
      line(c,[[9,-28],[11,-15],[9,-3]],'#d6ccae',.7);
      line(c,[[5,-16],[19,-16]],'#c5b790');
    }
  } else if (medic) {
    ensureMana(s);if(s.mana<16){c.fillStyle='#c1b6d1';c.font='10px sans-serif';c.textAlign='center';c.fillText('MP不足',0,-48);}
    line(c,[[13,-2],[13,-30]],blade,2.5);
    ellipse(c,13,-31,3,3,advanced ? '#bba987' : '#abbfa4');
    if (advanced) {
      c.strokeStyle='#c6b38a'; c.lineWidth=2;
      c.beginPath(); c.arc(15,-33,4,Math.PI*.5,Math.PI*2); c.stroke();
    }
    shape(c,[[-9,-14],[-4,-13],[-5,-6],[-10,-7]],'#b2a386');
  } else {
    if (wStyle === 'bow') {
      c.strokeStyle = blade; c.lineWidth = 2.2;
      c.beginPath(); c.moveTo(8,-30); c.quadraticCurveTo(24,-16,8,-2); c.stroke();
      line(c,[[8,-30],[10,-16],[8,-2]],'#d6ccae',.8);
      line(c,[[4,-16],[20,-16]],'#c5b790');
    } else if (wStyle === 'crossbow') {
      line(c,[[4,-16],[22,-16]],blade,2.6);
      line(c,[[7,-24],[7,-8]],blade,2.3);
      shape(c,[[9,-18],[16,-18],[17,-13],[9,-13]],'#6a4c38');
    } else if (wStyle === 'cannon') {
      c.save(); c.translate(7,-14); c.rotate(-0.12);
      shape(c,[[0,-5],[20,-7],[21,3],[0,5]],blade);
      shape(c,[[17,-8],[24,-5],[24,2],[17,4]],'#302b28');
      c.restore();
    } else {
      // Melee weapons are drawn outside the mirrored torso transform below.
    }
  }
  c.restore();
  if (melee) {
    c.save(); c.translate(0,-bob);
    drawMeleeWeapon(c,s,wStyle,weaponColors); c.restore();
  }
  // Compact labels and one squad marker instead of stacked luminous rings.
  c.fillStyle = platoonColor; c.fillRect(-2,4,4,2);
  if (s.isPersonalGuard || s.talent === 'GENIUS') {
    c.fillStyle = '#c8b278'; c.fillRect(4,4,3,2);
  }
  if (!s.portrait) {
    const headClearance=medic&&advanced?8:0;
    const distinguished = !s.isMerchantEscort && (s.isNamed || advanced || s.isPersonalGuard || s.talent === 'GENIUS');
    const hurting = s.maxHp > 0 && s.hp < s.maxHp * 0.55;
    if (distinguished) {
      c.textAlign = 'center'; c.font = '9px sans-serif';
      const label = `${s.isPersonalGuard ? '◆ ' : ''}${s.name || cls.name} · ${s.level || 1}`;
      c.fillStyle = 'rgba(18,24,25,.82)';
      const labelWidth = c.measureText(label).width + 8;
      c.fillRect(-labelWidth/2,-53-headClearance,labelWidth,12);
      c.fillStyle = s.isNamed ? '#dfc893' : '#e0e3db'; c.fillText(label,0,-44-headClearance);
    }
    if (distinguished || hurting) {
      c.fillStyle = '#283132'; c.fillRect(-12,-39-headClearance,24,3);
      c.fillStyle = '#c4b48a'; c.fillRect(-12,-39-headClearance,24*Math.max(0,Math.min(1,s.hp/s.maxHp)),3);
    }
  }
  c.restore();
}

export function drawFieldCommander(c,p,equipped,now,rankIndex,rankTitle,moving,portrait=false) {
  c.save();c.translate(p.x,p.y);c.scale(1.18,1.18);
  drawFieldSoldier(c,{x:0,y:0,hp:p.hp,maxHp:p.maxHp,
    soldierClass:p.isAdvanced?'WARLORD':'COMMANDER',isCommander:true,isNamed:true,rankIndex,
    equipped,portrait:true,atkAnim:p.slashAnim || 0,
    facingAngle:p.facingAngle,attackAngle:p.slashAngle,vx:moving?1:0,vy:0},now,
    {isAdvanced:!!p.isAdvanced,name:'隊長'},'#b7c6b6');
  if(!portrait) {
    // A quiet ground pointer and a stable nameplate keep the player identifiable.
    shape(c,[[0,8],[-3,12],[3,12]],'#d8ceb0');
    c.textAlign='center';c.font='bold 9px sans-serif';
    const name=`あなた · Lv.${p.level || 1}${p.isAdvanced?' 覇王':''}`;
    const width=c.measureText(name).width+10;
    c.fillStyle='rgba(17,27,28,.9)';c.fillRect(-width/2,-62,width,12);
    c.fillStyle='#dfd8bb';c.fillText(name,0,-53);
    c.fillStyle='#253337';c.fillRect(-16,-49,32,4);
    c.fillStyle=p.isAdvanced?'#c4aa78':'#91b6bd';
    c.fillRect(-16,-49,32*Math.max(0,Math.min(1,p.hp/p.maxHp)),4);
  }
  c.restore();
}

function drawPeriodMob(c,m,now) {
  if(!['wild_boar','cave_bat','shade_wolf','bone_warrior','sun_bandit','sun_guard'].includes(m.type))return false;
  const step=Math.sin(now*.014+m.x)*1.5;
  c.save();
  if(m.type==='wild_boar') {
    line(c,[[-8,-7],[-10,2],[-3,-7],[-2,2],[6,-7],[7,2],[10,-6],[12,1]],'#453f35',3);
    ellipse(c,0,-10,14,9,'#735f49');shape(c,[[-12,-12],[-21,-15],[-16,-7]],'#594f3d');
    shape(c,[[-8,-16],[-2,-21],[7,-16],[10,-6]],'#8a7758');
    ellipse(c,12,-10,8,7,'#927b5c');ellipse(c,18,-7,4,3,'#b29a7c');
    shape(c,[[9,-16],[8,-23],[14,-18]],'#6b5b47');
    shape(c,[[15,-7],[18,-2],[20,-7]],'#ded2ad');c.fillStyle='#e0b15a';c.fillRect(13,-13,2,2);
  } else if(m.type==='cave_bat') {
    const wing=Math.sin(now*.018+m.x)*3;
    shape(c,[[-3,-11],[-18,-22-wing],[-23,-8],[-16,-11],[-11,-5]],'#666173');
    shape(c,[[3,-11],[18,-22-wing],[23,-8],[16,-11],[11,-5]],'#767083');
    ellipse(c,0,-9,4,7,'#43434f');shape(c,[[-4,-14],[-4,-21],[0,-17],[4,-21],[4,-14]],'#858093');
    line(c,[[-19,-20-wing],[-13,-10],[-5,-10],[19,-20-wing],[13,-10],[5,-10]],'#a39aa4');
    c.fillStyle='#d1bb80';c.fillRect(-2,-15,1,1);c.fillRect(1,-15,1,1);
  } else if(m.type==='shade_wolf') {
    drawFieldMob(c,{...m,type:'wolf'},now);
    shape(c,[[-12,-12],[-8,-20],[-4,-16],[0,-21],[5,-14]],'#3e4554');
    line(c,[[-12,-12],[-7,-14],[0,-15]],'#9494a1',1.5);
  } else if(m.type==='bone_warrior') {
    line(c,[[-4,-10],[-6+step,0],[3,-10],[5-step,0]],'#c7c0a8',3);
    line(c,[[0,-26],[0,-9],[-7,-22],[-9,-11],[7,-22],[10,-12]],'#b9b7a5',2.5);
    for(let y=-22;y<=-13;y+=3)line(c,[[-5,y],[0,y+2],[5,y]],'#d2ccb5',1.5);
    ellipse(c,0,-31,6,6,'#d4ceb7');c.fillStyle='#343a3b';c.fillRect(-4,-33,3,2);c.fillRect(1,-33,3,2);c.fillRect(-1,-29,2,2);
    shape(c,[[-7,-35],[-4,-40],[5,-39],[7,-35]],'#6a7473');
    line(c,[[9,-12],[17,-32]],'#a5acaa',3);line(c,[[10,-16],[16,-14]],'#7b827c',2);
    shape(c,[[-8,-21],[-15,-20],[-16,-10],[-10,-7],[-5,-14]],'#656756');
  } else if(m.type==='sun_bandit'||m.type==='sun_guard') {
    const guard=m.type==='sun_guard';
    line(c,[[-4,-8],[-5+step,1],[4,-8],[5-step,1]],'#48463c',4);
    shape(c,[[-7,-23],[6,-23],[9,-7],[-8,-7]],guard?'#8e917d':'#9d885d');
    line(c,[[-5,-22],[5,-8]],'#c4b18b',2);ellipse(c,0,-30,6,6,'#c5ac87');
    shape(c,[[-7,-33],[-5,-38],[4,-38],[8,-32]],guard?'#9b9b83':'#84704e');
    c.fillStyle='#e0b15a';c.fillRect(1,-31,4,1.5);
    if(guard) {
      line(c,[[0,-38],[0,-45]],'#a78861',3);
      shape(c,[[-9,-24],[-18,-22],[-17,-8],[-11,-3],[-5,-9]],'#9d9477');
      line(c,[[8,-14],[13,-37]],'#c1c5b8',3);
    } else {
      c.fillStyle='#585a4b';c.fillRect(-5,-28,10,3);
      line(c,[[8,-15],[19,-22]],'#c1c5b8',3);
      shape(c,[[-8,-23],[-12,-22],[-15,-8],[-7,-12]],'#675f45');
    }
  } else {c.restore();return false;}
  c.restore();return true;
}

export function drawFieldMob(c, m, now) {
  if(drawPeriodMob(c,m,now))return true;
  if (!['slime','goblin','wolf','orc','wyvern'].includes(m.type) || m.isBoss) return false;
  const bob = Math.sin(now*.009 + m.x)*.65;
  const step = Math.sin(now*.017 + m.x)*2;
  c.save(); c.translate(0,bob);
  if (m.type === 'slime') {
    ellipse(c,0,-6,11,7,'#477c63');
    ellipse(c,-2,-8,8,5,m.hitPulse > 0 ? '#bac8b9' : '#739b7e');
    line(c,[[-7,-10],[-3,-12],[1,-11]],'#c2d4af',1.5);
    ellipse(c,3,-7,1.3,1.8,'#e0b15a'); ellipse(c,7,-7,1.3,1.8,'#e0b15a');
    ellipse(c,-6,-4,2,1,'#45674f');
  } else if (m.type === 'wolf') {
    line(c,[[-8,-6],[-10+step,1],[-5,-5],[-3-step,2],[5,-6],[6+step,1],[10,-7],[12-step,1]],'#313b3c',3);
    shape(c,[[-10,-10],[-22,-16],[-15,-6],[-8,-5]],'#4c5555');
    ellipse(c,0,-11,13,7,m.hitPulse > 0 ? '#bbc4c0' : '#596566');
    shape(c,[[4,-14],[8,-21],[11,-16],[14,-20],[17,-12],[23,-9],[19,-5],[10,-7]],'#697578');
    line(c,[[-9,-13],[-5,-15],[0,-14],[4,-16]],'#9aaba4',1.5);
    c.fillStyle = '#c0ab75'; c.fillRect(15,-13,2,1.5);
    c.fillStyle = '#e0b15a'; c.fillRect(21,-9,3,2);
    shape(c,[[18,-6],[17,-3],[16,-6]],'#d7d1b6');
  } else if (m.type === 'wyvern') {
    shape(c,[[-5,-16],[-23,-34],[-26,-17],[-18,-20],[-13,-12]],'#77766b');
    shape(c,[[3,-15],[17,-33],[24,-15],[16,-19],[11,-8]],'#857b68');
    line(c,[[-5,-16],[-23,-34],[-18,-20]],'#bbb099');
    ellipse(c,1,-12,8,10,'#5e6a5d');
    shape(c,[[2,-20],[6,-29],[13,-27],[17,-22],[10,-21],[9,-16]],'#82907b');
    shape(c,[[-5,-7],[-14,0],[-24,-3],[-15,3],[0,-3]],'#5e6a5d');
    c.fillStyle = '#d4ba77'; c.fillRect(10,-26,2,1.5);
    line(c,[[2,-17],[3,-11],[1,-6]],'#b0b18e',2);
    line(c,[[-3,-5],[-6,2],[3,-4],[7,2]],'#4a5147',2);
  } else {
    const orc = m.type === 'orc', scale = orc ? 1.3 : 1;
    c.scale(scale,scale);
    c.fillStyle = '#3c3931'; c.fillRect(-5+step,-6,4,8); c.fillRect(2-step,-6,4,8);
    shape(c,[[-7,-19],[5,-20],[8,-7],[-7,-6]],orc ? '#77735d' : '#797056');
    shape(c,[[-8,-19],[-3,-22],[1,-19],[-4,-13],[-8,-14]],'#51595a');
    line(c,[[-4,-19],[4,-10]],'#baa383',2);
    ellipse(c,1,-25,6.5,6,m.hitPulse > 0 ? '#b8c0a5' : (orc ? '#8a9470' : '#7e9972'));
    shape(c,[[-4,-27],[-12,-31],[-7,-23]],'#7c916b');
    c.fillStyle = '#e0b15a'; c.fillRect(2,-27,4,1.5);
    c.fillStyle = '#d6ceab'; c.fillRect(4,-22,1.5,3);
    line(c,[[7,-12],[16,-27]],'#785d40',3);
    if (orc) shape(c,[[12,-27],[20,-30],[23,-23],[16,-23]],'#9ba3a0');
    else { ellipse(c,16,-27,4,5,'#685c4b'); line(c,[[14,-30],[16,-33]],'#b8b5a1',2); }
    c.fillStyle = '#4b4235'; c.fillRect(-6,-9,13,3);
  }
  c.restore(); return true;
}

function drawAncientDragon(c, now, flash, scale) {
  const flap = Math.sin(now * (scale < 1 ? 0.008 : 0.005)) * (scale < 1 ? 8 : 14);
  const hide = flash ? '#d9d3cc' : '#7a342c';
  const hideDark = flash ? '#c8c2ba' : '#4a241e';
  const wing = flash ? '#b7b2aa' : '#3a2422';
  const membrane = flash ? '#ddd8d0' : '#5c3a34';
  const horn = flash ? '#2c3234' : '#1a1e22';
  c.save();
  c.scale(scale, scale);
  shape(c, [[-6,-28],[-46,-58 + flap * 0.2],[-50,-36],[-28,-30],[-12,-18]], wing);
  line(c, [[-8,-26],[-38,-50 + flap * 0.16],[-44,-38]], membrane, 1.2);
  shape(c, [[-8,-16],[-30,-8],[-36,2],[-22,-2],[-6,-8]], hideDark);
  shape(c, [[-16,-8],[-10,-8],[-13,6],[-20,6]], hideDark);
  shape(c, [[6,-8],[13,-8],[15,6],[5,6]], hideDark);
  shape(c, [[-20,4],[-11,4],[-12,8],[-22,7]], '#241c18');
  shape(c, [[4,4],[15,4],[16,8],[3,7]], '#241c18');
  shape(c, [[-18,-34],[8,-38],[22,-22],[16,-6],[-14,-8],[-22,-20]], hide);
  shape(c, [[-14,-32],[2,-34],[6,-18],[-12,-16]], 'rgba(255,255,255,.13)', 'transparent');
  shape(c, [[6,-34],[18,-28],[16,-12],[4,-14]], 'rgba(0,0,0,.22)', 'transparent');
  line(c, [[-8,-28],[-6,-12]], '#c4a090', 1.2);
  line(c, [[-2,-30],[0,-12]], '#c4a090', 1);
  shape(c, [[4,-30],[48,-56 + flap], [52,-28],[28,-20],[8,-14]], wing);
  shape(c, [[10,-28],[40,-48 + flap * 0.85],[44,-30],[16,-20]], membrane, wing);
  line(c, [[12,-26],[34,-44 + flap * 0.7],[42,-32]], '#1a1412', 1.3);
  line(c, [[14,-24],[30,-36]], '#cbb8a4', 0.9);
  shape(c, [[10,-28],[24,-38],[28,-24],[14,-16]], hide);
  shape(c, [[16,-40],[34,-46],[42,-32],[36,-22],[22,-24],[18,-34]], hide);
  shape(c, [[24,-42],[34,-44],[36,-34],[26,-32]], 'rgba(255,255,255,.14)', 'transparent');
  shape(c, [[18,-42],[12,-62],[22,-54],[26,-42]], horn, '#8d8478');
  line(c, [[15,-56],[23,-44]], '#d9d0c2', 1.15);
  shape(c, [[28,-44],[34,-60],[42,-50],[36,-40]], horn, '#8d8478');
  line(c, [[33,-54],[37,-44]], '#d9d0c2', 1);
  ellipse(c, 31, -35, 3.3, 2.5, '#1a120e');
  ellipse(c, 31.5, -35.2, 1.8, 1.45, flash ? '#fff6e8' : '#e2b15a');
  c.fillStyle = '#2a1c10'; c.fillRect(30.8, -36.3, 1.5, 2.3);
  shape(c, [[36,-28],[41,-26],[39,-22],[34,-24]], '#e6e0d4', '#6a6258');
  shape(c, [[32,-25],[36,-23],[34,-20],[31,-22]], '#e6e0d4', '#6a6258');
  c.restore();
}

function drawBehemoth(c, now, flash) {
  const step = Math.sin(now * 0.008) * 3.2;
  const hide = flash ? '#d8d2c8' : '#6e5338';
  const dark = flash ? '#c8c2b8' : '#3e2e22';
  const plate = flash ? '#eee8de' : '#8a6844';
  const horn = flash ? '#f4f1ea' : '#e4d8c2';
  for (const [x, s] of [[-24, step], [-8, -step], [8, step], [22, -step]]) {
    shape(c, [[x, -6],[x + 10, -8],[x + 11 + s * 0.15, 10],[x + 2, 10]], dark);
    shape(c, [[x + 1, -4],[x + 6, -6],[x + 7, 2],[x + 2, 2]], hide);
    shape(c, [[x + 1, 8],[x + 13, 8],[x + 14, 12],[x, 11]], '#241c16');
  }
  shape(c, [[-30,-18],[28,-22],[36,-4],[24,6],[-26,6],[-34,-4]], hide);
  shape(c, [[-24,-16],[8,-18],[12,-4],[-22,-2]], 'rgba(255,255,255,.13)', 'transparent');
  shape(c, [[8,-18],[30,-16],[28,0],[10,-2]], 'rgba(0,0,0,.22)', 'transparent');
  shape(c, [[-18,-28],[-4,-36],[12,-30],[8,-16],[-16,-16]], plate);
  shape(c, [[-4,-30],[12,-38],[26,-26],[16,-14],[0,-16]], dark);
  line(c, [[-14,-26],[8,-33],[22,-24]], '#d9c7a4', 1.3);
  shape(c, [[16,-16],[42,-22],[50,-6],[36,4],[18,2]], hide);
  shape(c, [[28,-18],[44,-20],[46,-8],[30,-6]], 'rgba(255,255,255,.12)', 'transparent');
  shape(c, [[22,-20],[14,-44],[26,-38],[30,-18]], horn, '#6a5c48');
  line(c, [[18,-40],[27,-22]], '#f7f1e4', 1.2);
  shape(c, [[30,-22],[32,-46],[42,-38],[38,-18]], horn, '#6a5c48');
  line(c, [[34,-42],[38,-22]], '#f7f1e4', 1.1);
  shape(c, [[20,-16],[12,-28],[20,-26],[24,-14]], '#d5cbb8', '#6a5c48');
  shape(c, [[34,-16],[42,-30],[48,-24],[40,-14]], '#d5cbb8', '#6a5c48');
  ellipse(c, 38, -11, 3.4, 2.6, '#1a120e');
  ellipse(c, 38.6, -11.2, 1.7, 1.35, flash ? '#fff' : '#c4492e');
  c.fillStyle = '#1a100c'; c.fillRect(38, -12.4, 1.45, 2.5);
  shape(c, [[44,-4],[50,2],[47,8],[41,1]], '#f3efe4', '#6a6256');
}

function drawTitan(c, now, flash) {
  const step = Math.sin(now * 0.007) * 2.6;
  const stone = flash ? '#d5d8dc' : '#3d4a52';
  const dark = flash ? '#c5c8cc' : '#232c32';
  const lite = flash ? '#eef1f2' : '#7d8c94';
  const core = flash ? '#ffffff' : '#7fd0d4';
  shape(c, [[-18 + step, -8],[-6 + step, -10],[-4 + step, 12],[-20 + step, 12]], dark);
  shape(c, [[-16 + step, -6],[-10 + step, -8],[-9 + step, 4],[-15 + step, 4]], stone);
  shape(c, [[8 - step, -8],[20 - step, -10],[22 - step, 12],[6 - step, 12]], dark);
  shape(c, [[10 - step, -6],[16 - step, -8],[17 - step, 4],[11 - step, 4]], stone);
  shape(c, [[-26,-48],[22,-50],[28,-12],[-24,-10]], stone);
  shape(c, [[-22,-46],[4,-48],[2,-16],[-20,-14]], lite, 'transparent');
  shape(c, [[6,-46],[24,-44],[22,-14],[8,-16]], 'rgba(0,0,0,.28)', 'transparent');
  line(c, [[-18,-40],[16,-42]], '#141c20', 1.5);
  line(c, [[-16,-28],[18,-26]], '#141c20', 1.2);
  shape(c, [[-30,-46],[-16,-52],[-10,-38],[-26,-34]], dark);
  shape(c, [[16,-50],[30,-44],[26,-32],[12,-36]], lite);
  shape(c, [[-8,-36],[0,-44],[8,-36],[0,-26]], dark);
  shape(c, [[-5,-35],[0,-41],[5,-35],[0,-29]], core, '#16383c');
  shape(c, [[-2,-37],[0,-40],[2,-34],[0,-32]], '#f4fffe', 'transparent');
  line(c, [[-10,-24],[-2,-16],[6,-24],[12,-15]], core, 1.15);
  shape(c, [[-14,-66],[14,-68],[16,-50],[-16,-48]], stone);
  shape(c, [[-12,-64],[2,-66],[0,-52],[-12,-50]], lite, 'transparent');
  shape(c, [[-16,-60],[-4,-70],[6,-64],[2,-56]], dark);
  shape(c, [[-8,-60],[-2,-60],[-2,-55],[-8,-55]], '#12181c');
  shape(c, [[3,-60],[9,-60],[9,-55],[3,-55]], '#12181c');
  ellipse(c, -5, -57.6, 1.35, 1.05, core);
  ellipse(c, 6, -57.6, 1.35, 1.05, core);
}

const BOSS_BODIES = new Set(['dragon', 'colossal_dragon', 'behemoth_king', 'colossal_titan']);

export function drawFieldBoss(c, m, now) {
  if (!BOSS_BODIES.has(m.type)) return false;
  const flash = m.hitPulse > 0;
  const bob = Math.sin(now * 0.014 + ((m.x || 0) % 10)) * (m.isColossal ? 2.2 : 1.2);
  c.save();
  c.translate(0, bob);
  if (m.type === 'behemoth_king') drawBehemoth(c, now, flash);
  else if (m.type === 'colossal_titan') drawTitan(c, now, flash);
  else drawAncientDragon(c, now, flash, m.type === 'dragon' ? 0.58 : 1);
  c.restore();
  return true;
}

export function drawRemains(c, r) {
  const life = Math.max(0, Math.min(1, r.life ?? 1));
  c.save();
  c.translate(r.x, r.y);
  c.globalAlpha = life > 0.35 ? 0.92 : life / 0.35;
  contactShadow(c, 1, 3, 16, 4.5, 1);
  shape(c, [[-16,-2],[14,-6],[18,3],[-12,5]], fieldTone(r.cloth || '#6a6258', 0.82));
  ellipse(c, -18, -1, 5, 4, fieldTone(r.steel || '#8d8680', 0.48));
  line(c, [[8,0],[20,3],[16,6]], '#3a3834', 2);
  c.restore();
}
