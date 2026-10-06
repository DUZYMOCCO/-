// Quiet, equipment-aware field illustrations. No particles or additional effects.
const ellipse = (c, x, y, rx, ry, color) => {
  c.fillStyle = color; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill();
};
const shape = (c, points, color, edge = '#20282a') => {
  c.fillStyle = color; c.strokeStyle = edge; c.lineWidth = 0.9;
  c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
  c.closePath(); c.fill(); c.stroke();
};
const line = (c, points, color, width = 1) => {
  c.strokeStyle = color; c.lineWidth = width; c.beginPath();
  points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke();
};
const CLOTH = {
  HEAVY: '#687e91', LIGHT: '#a38b60', ARCHER: '#607b60', MEDIC: '#c2bda2',
  PALADIN: '#ccd0c3', BLADEMASTER: '#555c69', SNIPER: '#426557', HIGH_PRIEST: '#d1c5ab',
  COMMANDER: '#71858a', WARLORD: '#a29270'
};

export function drawFieldSoldier(c, s, now, cls, platoonColor) {
  const key = s.soldierClass || 'HEAVY', eq = s.equipped || {};
  const advanced = !!cls.isAdvanced;
  const cloth = eq.armor?.color || CLOTH[key] || CLOTH.HEAVY;
  const steel = eq.helmet?.color || (advanced ? '#d1c4a3' : '#9daab0');
  const moving = Math.hypot(s.vx || 0, s.vy || 0) > 0.05;
  const stride = moving ? Math.sin(now * 0.016 + (s.animOffset || 0)) * 2.8 : 0;
  const bob = moving ? Math.abs(stride) * 0.25 : 0;
  const archer = key === 'ARCHER' || key === 'SNIPER';
  const medic = key === 'MEDIC' || key === 'HIGH_PRIEST';
  const light = key === 'LIGHT' || key === 'BLADEMASTER';
  c.save(); c.translate(s.x, s.y);
  ellipse(c, 3, 3, 12, 4, 'rgba(0,0,0,.35)');
  if (s.isDown) {
    ellipse(c, 2, -1, 10, 5, cloth); ellipse(c, -9, -2, 5, 4, steel);
    c.fillStyle = '#efb3a2'; c.textAlign = 'center'; c.font = 'bold 10px sans-serif';
    c.fillText(`救助 ${Math.ceil(s.downTimer || 0)}秒`, 0, -19);
    c.fillStyle = '#242c30'; c.fillRect(-13, -14, 26, 3);
    c.fillStyle = '#8ab99b'; c.fillRect(-13, -14, 26 * Math.min(1, Math.max(0, s.rescueProgress || 0)), 3);
    c.restore(); return;
  }
  c.save(); if (Math.cos(s.facingAngle || 0) < -0.15) c.scale(-1, 1);
  c.translate(0, -bob);
  // Cloak, boots and an articulated torso give every class a distinct silhouette.
  if (advanced || s.isNamed || archer) {
    shape(c, [[-4,-23],[-11,-17],[-14,-1],[-5,-5],[4,-17]], s.isCommander ? (advanced?'#794e41':'#3e5863') : (archer ? '#3d5148' : '#795d51'));
    line(c, [[-7,-17],[-10,-4]], '#b59a72');
  }
  c.fillStyle = eq.legs?.color || '#475159';
  c.fillRect(-5 + stride,-8,4,9); c.fillRect(2 - stride,-8,4,9);
  c.fillStyle = '#2a2624'; c.fillRect(-6 + stride,0,6,3); c.fillRect(1 - stride,0,6,3);
  shape(c, [[-6,-23],[5,-23],[8,-11],[5,-6],[-6,-7],[-8,-15]], cloth);
  shape(c, [[-6,-22],[-1,-21],[-1,-9],[-6,-10]], 'rgba(255,255,255,.13)', 'transparent');
  shape(c, [[3,-22],[6,-20],[7,-10],[3,-8]], 'rgba(0,0,0,.2)', 'transparent');
  c.fillStyle = '#64503c'; c.fillRect(-7,-10,14,2);
  c.fillStyle = '#d2b783'; c.fillRect(0,-10,2,2);
  c.fillStyle = platoonColor; c.fillRect(-6,-21,3,4);
  if (key === 'HIGH_PRIEST') {
    shape(c,[[-6,-17],[-9,1],[7,1],[5,-17]],'#c6bc9c');
    line(c,[[-3,-14],[-5,-1],[3,-14],[4,-1]],'#eee3c2',1.3);
    c.fillStyle='#a18765'; c.fillRect(-2,-19,3,19);
  }
  if (light) {
    line(c,[[-5,-21],[4,-9]],'#c8b797',2);
    line(c,[[-5,-19],[3,-10]],'#5c4633',.7);
    c.fillStyle='#624d38'; c.fillRect(-7,-12,3,5);
  }
  if (medic) {
    c.fillStyle = '#e1d9bf'; c.fillRect(-3,-21,5,11);
    c.fillStyle = '#95574f'; c.fillRect(-1,-18,1.5,5); c.fillRect(-3,-16,5,1.5);
  } else if (!archer && !light) {
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
  ellipse(c, 6,-15,2.3,3.5,eq.gloves?.color || '#a78b72');
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
  if (archer) {
    // Quiver with visible fletching, curved bow and drawn string.
    shape(c,[[-8,-24],[-12,-25],[-13,-10],[-9,-9]],'#6b503b');
    line(c,[[-11,-23],[-12,-31]],'#baa889');
    line(c,[[-10,-29],[-13,-31],[-11,-32]],'#c9c6ad',2);
    c.strokeStyle = eq.weapon?.color || '#b19869'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(9,-28); c.quadraticCurveTo(22,-16,9,-3); c.stroke();
    line(c,[[9,-28],[11,-15],[9,-3]],'#d6ccae',.7);
    line(c,[[5,-16],[19,-16]],'#c5b790');
  } else if (medic) {
    line(c,[[13,-2],[13,-30]],eq.weapon?.color || '#a68c60',2.5);
    ellipse(c,13,-31,3,3,advanced ? '#bba987' : '#abbfa4');
    if (advanced) {
      c.strokeStyle='#c6b38a'; c.lineWidth=2;
      c.beginPath(); c.arc(15,-33,4,Math.PI*.5,Math.PI*2); c.stroke();
    }
    shape(c,[[-9,-14],[-4,-13],[-5,-6],[-10,-7]],'#b2a386');
  } else {
    const heavy = key === 'HEAVY' || key === 'PALADIN';
    if (key !== 'BLADEMASTER') {
      const shieldBottom = key === 'PALADIN' ? 0 : (heavy ? -4 : -9);
      shape(c,[[-12,-23],[-3,-22],[-3,-10],[-7,shieldBottom],[-13,-10]],eq.shield?.color || '#566b7c');
      line(c,[[-9,-21],[-9,-9]],'#c3b48d',1.5); ellipse(c,-8,-14,1.8,1.8,'#b6aea0');
      if (key === 'PALADIN') {
        line(c,[[-8,-21],[-8,-6]],'#d4c39a',2); line(c,[[-11,-17],[-5,-17]],'#d4c39a',2);
      } else {
        line(c,[[-11,-19],[-11,-12],[-5,-19],[-5,-12]],'#879797',.6);
      }
    }
    c.save(); c.translate(7,-14); c.rotate(s.isCommander ? (-.6+Math.max(0,s.atkAnim || 0)*1.6) : (s.atkAnim > 0 ? -.55 : -.12));
    shape(c,[[0,1],[2,-15],[4,-18],[5,-15],[3,1]],eq.weapon?.color || '#c3cbca');
    line(c,[[3,-14],[2,0]],'#f1ead8',.7);
    line(c,[[-2,1],[6,2]],'#aa9168',2); line(c,[[2,2],[1,6]],'#6a4c38',2.5);
    c.restore();
    if (key === 'BLADEMASTER') line(c,[[-13,-13],[-20,-24]],'#c3cbca',2);
  }
  c.restore();
  // Compact labels and one squad marker instead of stacked luminous rings.
  c.fillStyle = platoonColor; c.fillRect(-2,4,4,2);
  if (s.isPersonalGuard || s.talent === 'GENIUS') {
    c.fillStyle = '#c8b278'; c.fillRect(4,4,3,2);
  }
  if (!s.portrait) {
    const distinguished = s.isNamed || advanced || s.isPersonalGuard || s.talent === 'GENIUS';
    if (distinguished) {
      c.textAlign = 'center'; c.font = '9px sans-serif';
      const label = `${s.isPersonalGuard ? '◆ ' : ''}${s.name || cls.name} · ${s.level || 1}`;
      c.fillStyle = 'rgba(18,24,25,.82)';
      const labelWidth = c.measureText(label).width + 8;
      c.fillRect(-labelWidth/2,-53,labelWidth,12);
      c.fillStyle = s.isNamed ? '#dfc893' : '#e0e3db'; c.fillText(label,0,-44);
    }
    if (distinguished || s.hp < s.maxHp) {
      c.fillStyle = '#283132'; c.fillRect(-12,-39,24,3);
      c.fillStyle = '#92b9a0'; c.fillRect(-12,-39,24*Math.max(0,Math.min(1,s.hp/s.maxHp)),3);
    }
  }
  c.restore();
}

export function drawFieldCommander(c,p,equipped,now,rankIndex,rankTitle,moving,portrait=false) {
  c.save();c.translate(p.x,p.y);c.scale(1.18,1.18);
  drawFieldSoldier(c,{x:0,y:0,hp:p.hp,maxHp:p.maxHp,
    soldierClass:p.isAdvanced?'WARLORD':'COMMANDER',isCommander:true,isNamed:true,rankIndex,
    equipped,portrait:true,atkAnim:p.slashAnim || 0,
    facingAngle:p.slashAnim>0?p.slashAngle:p.facingAngle,vx:moving?1:0,vy:0},now,
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

export function drawFieldMob(c, m, now) {
  if (!['slime','goblin','wolf','orc','wyvern'].includes(m.type) || m.isBoss) return false;
  const bob = Math.sin(now*.009 + m.x)*.65;
  const step = Math.sin(now*.017 + m.x)*2;
  c.save(); c.translate(0,bob);
  if (m.type === 'slime') {
    ellipse(c,0,-6,11,7,'#477c63');
    ellipse(c,-2,-8,8,5,m.hitPulse > 0 ? '#bac8b9' : '#739b7e');
    line(c,[[-7,-10],[-3,-12],[1,-11]],'#c2d4af',1.5);
    ellipse(c,3,-7,1.3,1.8,'#253b32'); ellipse(c,7,-7,1.3,1.8,'#253b32');
    ellipse(c,-6,-4,2,1,'#45674f');
  } else if (m.type === 'wolf') {
    line(c,[[-8,-6],[-10+step,1],[-5,-5],[-3-step,2],[5,-6],[6+step,1],[10,-7],[12-step,1]],'#313b3c',3);
    shape(c,[[-10,-10],[-22,-16],[-15,-6],[-8,-5]],'#4c5555');
    ellipse(c,0,-11,13,7,m.hitPulse > 0 ? '#bbc4c0' : '#596566');
    shape(c,[[4,-14],[8,-21],[11,-16],[14,-20],[17,-12],[23,-9],[19,-5],[10,-7]],'#697578');
    line(c,[[-9,-13],[-5,-15],[0,-14],[4,-16]],'#9aaba4',1.5);
    c.fillStyle = '#c0ab75'; c.fillRect(15,-13,2,1.5);
    c.fillStyle = '#292e2d'; c.fillRect(21,-9,3,2);
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
    c.fillStyle = '#2e392d'; c.fillRect(2,-27,4,1.5);
    c.fillStyle = '#d6ceab'; c.fillRect(4,-22,1.5,3);
    line(c,[[7,-12],[16,-27]],'#785d40',3);
    if (orc) shape(c,[[12,-27],[20,-30],[23,-23],[16,-23]],'#9ba3a0');
    else { ellipse(c,16,-27,4,5,'#685c4b'); line(c,[[14,-30],[16,-33]],'#b8b5a1',2); }
    c.fillStyle = '#4b4235'; c.fillRect(-6,-9,13,3);
  }
  c.restore(); return true;
}
