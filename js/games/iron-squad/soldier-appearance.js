/** Stable personal looks, independent of talent, battle RNG and equipment. */
export const HAIR_LABELS = Object.freeze({
  barcode:'バーコード', bald:'丸ハゲ', mohawk:'モヒカン', sidebald:'サイドハゲ',
  horseshoe:'落ち武者ハゲ', buzz:'うっすら坊主', swept:'流し髪'
});
const SKINS=['#e0b899','#c99b79','#b88767','#d6aa88','#a87758'];
const HAIRS=['#342e2b','#514137','#6a5140','#85827b','#473b35','#824d36'];
const MEDIC_HAIRS=['#51372f','#332e32','#795442','#a77951','#6c5552'];
const MEDIC_STYLES={bob:'ボブ', ponytail:'ポニーテール', braid:'編み髪', short:'ショート'};
export const GLASSES_LABELS=Object.freeze({none:'',round:'丸メガネ',square:'角メガネ',half:'ハーフリム'});
const FRAME_COLORS=['#454344','#6d5544','#927c61'];
const FACES={round:'丸顔', square:'角張った顔', long:'面長', angular:'すっきりした輪郭'};
const MEDICS=new Set(['MEDIC','HIGH_PRIEST','SAINT','ARCHANGEL']);
const ARCHERS=new Set(['ARCHER','SNIPER','STORM_BOW','STAR_HUNTER']);
const LIGHTS=new Set(['LIGHT','BLADEMASTER','SWORD_EMPEROR','VOID_EDGE']);
export const isMedicAppearance = key => MEDICS.has(key);
const MAGES=new Set(['MAGE','ARCHMAGE','ELEMENTAL_SAGE','ARCANE_SOVEREIGN']);
export const soldierAppearanceFamily = key => MAGES.has(key)?'MAGE':MEDICS.has(key)?'MEDIC':ARCHERS.has(key)?'ARCHER':LIGHTS.has(key)?'LIGHT':'HEAVY';

function seededIdentity(identity) {
  let n=2166136261;
  for(const char of String(identity)) {n^=char.charCodeAt(0);n=Math.imul(n,16777619);}
  return () => {n=(n+0x6D2B79F5)|0;let t=Math.imul(n^(n>>>15),1|n);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296;};
}

function createEyewear(identity) {
  const random=seededIdentity(`iron-glasses-v1:${identity}`),roll=random();
  return {glasses:roll<.65?'none':roll<.79?'round':roll<.93?'square':'half',glassesColor:FRAME_COLORS[Math.floor(random()*FRAME_COLORS.length)]};
}

export function createSoldierAppearance(identity) {
  const random=seededIdentity(`iron-face-v1:${identity}`),pick=values=>values[Math.floor(random()*values.length)];
  const handsome=random()<.06,roll=random();
  const hairStyle=handsome?'swept':roll<.27?'barcode':roll<.52?'bald':roll<.69?'mohawk':roll<.84?'sidebald':roll<.94?'horseshoe':'buzz';
  return {
    version:1,handsome,hairStyle,skin:pick(SKINS),hairColor:pick(HAIRS),
    faceShape:handsome?'angular':pick(['round','square','long']),
    eyes:handsome?'sharp':pick(['flat','droopy','sharp']),brow:Math.floor(random()*3),
    facialHair:handsome?'none':pick(['none','none','stubble','mustache','chin']),
    scar:!handsome&&random()<.22,smile:random()<.45,
    medicHair:pick(['bob','bob','ponytail','ponytail','braid','short']),
    medicHairColor:pick(MEDIC_HAIRS),medicAccessory:pick(['clip','ribbon','none']),
    ...createEyewear(identity)
  };
}

export function ensureSoldierAppearance(soldier) {
  const a=soldier.appearance;
  if(a?.version===1 && HAIR_LABELS[a.hairStyle] && SKINS.includes(a.skin) && HAIRS.includes(a.hairColor) && MEDIC_STYLES[a.medicHair] && MEDIC_HAIRS.includes(a.medicHairColor)) {
    if(!(a.glasses in GLASSES_LABELS) || !FRAME_COLORS.includes(a.glassesColor))Object.assign(a,createEyewear(soldier.id || `${soldier.name || 'soldier'}:${soldier.platoonId || 0}`));
    return a;
  }
  soldier.appearance=createSoldierAppearance(soldier.id || `${soldier.name || 'soldier'}:${soldier.platoonId || 0}`);
  return soldier.appearance;
}

export function describeSoldierAppearance(soldier) {
  const a=ensureSoldierAppearance(soldier);
  if(isMedicAppearance(soldier.soldierClass))return [MEDIC_STYLES[a.medicHair],'やわらかな表情',GLASSES_LABELS[a.glasses]].filter(Boolean).join(' · ');
  const beard={none:'',stubble:'無精ひげ',mustache:'口ひげ',chin:'あごひげ'}[a.facialHair];
  return [HAIR_LABELS[a.hairStyle],a.handsome?'端正な顔立ち':FACES[a.faceShape],beard,GLASSES_LABELS[a.glasses]].filter(Boolean).join(' · ');
}

const ellipse=(c,x,y,rx,ry,color)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();};
const polygon=(c,points,color)=>{c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();};
const stroke=(c,points,color,width=1)=>{c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();};

function medicBackHair(c,a) {
  const hair=a.medicHairColor;
  if(a.medicHair==='ponytail') {
    polygon(c,[[4,-4],[8,-2],[8,4],[6,9],[5,3],[4,1]],hair);
    ellipse(c,6,-2,1.2,1.2,'#9a7663');
  } else if(a.medicHair==='braid') {
    for(let i=0;i<4;i++)ellipse(c,5.7+(i%2)*.4,2+i*1.8,1.1,1.35,hair);
  } else if(a.medicHair==='bob') {
    polygon(c,[[-5,-4],[-6,1],[-6,6],[-3,7],[4,6],[6,5],[6,-2],[4,-5]],hair);
  } else polygon(c,[[-5,-4],[-6,0],[-5,3],[5,3],[6,-2],[3,-5]],hair);
}

function scalpHair(c,a,medic,small) {
  const hair=medic?a.medicHairColor:a.hairColor;
  if(medic) {
    polygon(c,[[-5,1],[-5,-4],[-3,-6],[2,-6],[5,-3],[5,2],[3,-1],[1,-3],[-1,-1],[-2,-3],[-4,0]],hair);
    if(a.medicAccessory==='clip')stroke(c,[[3,-2],[4.5,-1]],'#cbb78b',.7);
    if(a.medicAccessory==='ribbon') {
      polygon(c,[[5,-2],[7,-4],[7,-.4],[5,-1],[3,-3],[3,-.5]],'#a66c69');
    }
    return;
  }
  if(a.hairStyle==='barcode') {
    polygon(c,[[-5,3],[-5,-1],[-4,-4],[-3,-2],[-4,3]],hair);
    c.strokeStyle=hair;c.lineWidth=small?.45:.24;
    for(let i=0;i<(small?2:4);i++){const step=small?1.5:.75;c.beginPath();c.moveTo(-4.3,-3+i*step);c.quadraticCurveTo(-.8,-7.5+i*step,4.4,-2+i*step);c.stroke();}
  } else if(a.hairStyle==='mohawk') {
    polygon(c,[[-1.7,-4],[-1.8,-8],[-.8,-10],[.2,-8],[1.4,-9],[2,-6],[1.2,-3]],hair);
    if(!small)stroke(c,[[-.8,-8],[.2,-5]],'#b09a78',.4);
  } else if(a.hairStyle==='sidebald') {
    polygon(c,[[-2.5,-4],[-2,-6],[0,-7],[4,-6.5],[3.8,-3.4],[1.1,-4.6],[-1,-3.8]],hair);
    if(!small)stroke(c,[[.5,-6],[3,-5]],'#ab947a',.4);
  } else if(a.hairStyle==='horseshoe') {
    polygon(c,[[-4,-4],[-5.8,-2],[-6,4],[-5,7],[-3.7,4],[-4.3,0]],hair);
    polygon(c,[[4,-4],[5.7,-2],[6.2,4],[5,7],[3.7,4],[4.2,0]],hair);
  } else if(a.hairStyle==='buzz') {
    ellipse(c,0,-3,4.7,2.8,'rgba(55,49,43,.22)');
    if(!small)for(const [x,y] of [[-3,-4],[-1,-5],[1,-5],[3,-4],[-3,-2],[1,-3]])ellipse(c,x,y,.18,.18,hair);
  } else if(a.hairStyle==='swept') {
    polygon(c,[[-5,-1],[-5,-4],[-3,-6],[0,-7],[5,-5],[5,-1],[3,-2],[1,-4],[-2,-2]],hair);
    stroke(c,[[-3,-4],[1,-5],[3,-4]],'#a58c6b',small?.5:.35);
  }
}

function eyewear(c,a,y,small) {
  if(a.glasses==='none')return;
  c.strokeStyle=a.glassesColor;c.lineWidth=small?.45:.3;c.beginPath();
  if(a.glasses==='round') {
    c.ellipse(-2.2,y,1.5,1.5,0,0,Math.PI*2);c.moveTo(3.7,y);c.ellipse(2.2,y,1.5,1.5,0,0,Math.PI*2);
  } else if(a.glasses==='square') {
    c.rect(-3.8,y-1.2,3.1,2.4);c.rect(.7,y-1.2,3.1,2.4);
  } else {
    c.moveTo(-3.8,y+.6);c.lineTo(-3.8,y-1);c.lineTo(-.7,y-1);c.lineTo(-.7,y+.6);
    c.moveTo(.7,y+.6);c.lineTo(.7,y-1);c.lineTo(3.8,y-1);c.lineTo(3.8,y+.6);
  }
  c.moveTo(-.7,y-.2);c.lineTo(.7,y-.2);
  c.moveTo(-3.8,y);c.lineTo(-4.7,y-.4);c.moveTo(3.8,y);c.lineTo(4.7,y-.4);c.stroke();
}

/** Head centered on (x,y); field version intentionally has few small primitives. */
export function drawSoldierHead(c,soldier,{x=0,y=0,scale=1,small=false,silhouette=false,helmet=null,mitre=false,cap=false}={}) {
  const a=ensureSoldierAppearance(soldier),medic=isMedicAppearance(soldier.soldierClass);
  const hair=medic?a.medicHairColor:a.hairColor;
  c.save();c.translate(x,y);c.scale(scale,scale);
  if(medic)medicBackHair(c,a);
  if(!small){ellipse(c,-5,1,1,1.7,a.skin);ellipse(c,5,1,1,1.7,a.skin);}
  if(small)ellipse(c,0,0,a.faceShape==='long'?4.5:a.faceShape==='square'?5.5:5.1,medic?5.8:6,a.skin);
  else if(medic||a.faceShape==='round')ellipse(c,0,0,5.1,6,a.skin);
  else if(a.faceShape==='long')ellipse(c,0,0,4.5,6.7,a.skin);
  else {
    ellipse(c,0,-2.5,5.1,3.8,a.skin);
    polygon(c,[[-5,-2],[5,-2],[4.5,3.2],[a.handsome?2.5:4,5.3],[0,6.2],[-(a.handsome?2.5:4),5.3],[-4.5,3.2]],a.skin);
  }
  if(!small)ellipse(c,-1.5,-3.5,1.9,.65,'rgba(255,241,213,.28)');
  else if(a.hairStyle==='bald'){c.fillStyle='rgba(255,241,213,.28)';c.fillRect(-2,-4,2,.7);}
  if(!helmet&&!mitre)scalpHair(c,a,medic,small);
  else if(!medic&&a.hairStyle==='horseshoe') {
    c.fillStyle=hair;c.fillRect(-5,0,1.3,5);c.fillRect(3.7,0,1.3,5);
  }
  const eyesY=a.eyes==='droopy'&&!medic?1.7:1;
  if(silhouette) {
    if(!medic&&a.facialHair!=='none') {c.fillStyle=hair;c.fillRect(-1.5,a.facialHair==='mustache'?3.5:5,3,.75);}
    if(a.glasses!=='none'){c.fillStyle=a.glassesColor;c.fillRect(-3.5,.65,7,.8);}
  } else if(small) {
    c.fillStyle='#302a26';c.fillRect(-2.7,1,1,.8);c.fillRect(1.7,1,1,.8);
    if(!medic) {
      c.fillStyle=hair;c.fillRect(-3.3,-.7,2,.6+a.brow*.15);c.fillRect(1.3,-.7,2,.6+a.brow*.15);
      if(a.facialHair==='mustache')c.fillRect(-2,3.5,4,.75);
      else if(a.facialHair==='chin')c.fillRect(-1,5.3,2,.8);
      else if(a.facialHair==='stubble'){c.fillStyle='rgba(52,44,36,.18)';c.fillRect(-2,4,4,1.7);}
    }
    c.fillStyle=medic?'#995f56':'#825b48';c.fillRect(-.8,4,.9,.45);
  } else if(medic) {
    ellipse(c,-2.3,eyesY,.65,small?.65:.9,'#3b2f2d');ellipse(c,2.3,eyesY,.65,small?.65:.9,'#3b2f2d');
    if(!small){ellipse(c,-2.5,.75,.18,.23,'#fff7e8');ellipse(c,2.1,.75,.18,.23,'#fff7e8');stroke(c,[[-3.2,.6],[-2.7,.3]],hair,.3);stroke(c,[[2.7,.3],[3.2,.6]],hair,.3);}
    ellipse(c,-3.4,2.6,1,.5,'rgba(186,97,91,.28)');ellipse(c,3.4,2.6,1,.5,'rgba(186,97,91,.28)');
    stroke(c,[[-1,4],[0,4.4],[1,4]],'#995f56',.35);
  } else {
    const browY=a.eyes==='sharp'?-.3:-.6,thick=a.handsome?.45:.55+a.brow*.18;
    stroke(c,[[-3.3,browY],[a.eyes==='sharp'?-1.2:-1.4,a.eyes==='sharp'?.1:browY+.3]],hair,thick);
    stroke(c,[[1.4,a.eyes==='sharp'?.1:browY+.3],[3.3,browY]],hair,thick);
    ellipse(c,-2.2,eyesY,.5,.45,'#302a26');ellipse(c,2.2,eyesY,.5,.45,'#302a26');
    stroke(c,[[-1.2,4],[0,a.smile?4.6:4.1],[1.2,4]],'#825b48',.4);
    if(a.facialHair==='mustache')polygon(c,[[-2.1,3.6],[-.4,3.3],[0,3.7],[.4,3.3],[2.1,3.6],[1.4,4.2],[-1.4,4.2]],hair);
    if(a.facialHair==='chin')polygon(c,[[-1.8,5],[-1.4,6.1],[0,6.7],[1.4,6.1],[1.8,5]],hair);
    if(a.facialHair==='stubble') {
      ellipse(c,0,4.8,3.1,1.2,'rgba(52,44,36,.18)');
      if(!small)for(const [px,py] of [[-2,4.6],[-1,5.5],[0,5],[1.6,4.8]])stroke(c,[[px,py],[px+.2,py+.5]],hair,.25);
    }
    if(a.scar&&!small)stroke(c,[[3,-.3],[3.6,2.4]],'#a07159',.3);
  }
  if(!small)stroke(c,[[.2,1.6],[.6,2.8],[-.2,3]],'#a4775c',.35);
  if(!silhouette)eyewear(c,a,small?1:eyesY,small);
  if(helmet) {
    polygon(c,[[-6,-2],[-5,-5],[-2,-7],[2,-7],[5,-5],[6,-2],[4,-1],[3,-3],[-3,-3],[-4,-1]],helmet);
    stroke(c,[[-3,-5],[2,-6],[4,-4]],'#c4c5b5',.65);
  } else if(mitre) {
    polygon(c,[[-5,-3],[-4,-10],[0,-15],[4,-10],[5,-3]],'#d8ceb4');
    stroke(c,[[0,-12],[0,-4]],'#aa8d62',.8);stroke(c,[[-3,-6],[3,-6]],'#aa8d62',.8);
  } else if(cap&&medic) {
    polygon(c,[[-4,-4],[-3.5,-6.5],[3.5,-6.5],[4,-4]],'#dedac9');
    c.fillStyle='#a4645c';c.fillRect(-.35,-6, .7,1.6);c.fillRect(-1,-5.5,2,.6);
  }
  c.restore();
}

/** Bust portrait, drawn only when constructing UI. Always shows the unhelmeted face. */
export function drawSoldierPortrait(c,soldier,width=240,height=260,{compact=false}={}) {
  const a=ensureSoldierAppearance(soldier),medic=isMedicAppearance(soldier.soldierClass);
  const key=soldier.soldierClass || 'HEAVY';
  const family=soldierAppearanceFamily(key);
  const uniform=medic?'#b8c1b4':family==='LIGHT'?'#8a785c':family==='ARCHER'?'#536d5e':'#697981';
  c.save();c.clearRect(0,0,width,height);
  c.beginPath();c.rect(0,0,width,height);c.clip();
  c.fillStyle='#17242c';c.fillRect(0,0,width,height);
  const light=c.createRadialGradient(width*.46,height*.32,0,width*.5,height*.44,width*.7);
  light.addColorStop(0,'#38484a');light.addColorStop(1,'#111b24');c.fillStyle=light;c.fillRect(0,0,width,height);
  c.translate(width/2,height*.42);const scale=width/(compact?21:25);c.scale(scale,scale);
  // Clothing stays practical: broad uniform shoulders, collar, medical bib.
  polygon(c,[[-10,15],[-8,10],[-3.5,7],[3.5,7],[8,10],[10,15],[11,21],[-11,21]],uniform);
  polygon(c,[[-2.2,5],[-2,9],[0,10],[2,9],[2.2,5]],a.skin);
  polygon(c,[[-5,8],[-2,9],[0,12],[-3,10]],'#b5b5a2');polygon(c,[[5,8],[2,9],[0,12],[3,10]],'#d0c7ab');
  if(medic) {
    polygon(c,[[-4,9],[-3.7,20],[3.7,20],[4,9],[0,12]],'#e0dfcc');
    c.fillStyle='#a8675b';c.fillRect(-.7,13,1.4,5);c.fillRect(-2.5,14.8,5,1.4);
  } else {
    polygon(c,[[-9,10],[-6,8],[-4,11],[-5,14],[-10,13]],'#879399');
    polygon(c,[[9,10],[6,8],[4,11],[5,14],[10,13]],'#596872');
    stroke(c,[[-2,12],[3,20]],'#b1a080',1.2);c.fillStyle='#c2af86';c.fillRect(-6,12,1.2,2.7);
  }
  drawSoldierHead(c,soldier,{cap:medic});
  c.restore();
}
