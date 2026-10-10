import {equipmentVisualProfile} from './equipment-tiers.js?v=148';
import {isMuscleCaster} from './unit-attributes.js?v=148';
/** Stable personal looks, independent of talent, battle RNG and equipment. */
export const HAIR_LABELS = Object.freeze({
  barcode:'バーコード', bald:'丸ハゲ', mohawk:'モヒカン', sidebald:'サイドハゲ',
  horseshoe:'落ち武者ハゲ', buzz:'うっすら坊主', swept:'流し髪',
  short:'短髪', parted:'七三分け', tousled:'ラフな前髪', curly:'くせ毛', tied:'結び髪'
});
const SKINS=['#e0b899','#c99b79','#b88767','#d6aa88','#a87758'];
const HAIRS=['#342e2b','#514137','#6a5140','#85827b','#473b35','#824d36'];
const MEDIC_HAIRS=['#51372f','#332e32','#795442','#a77951','#6c5552'];
const MEDIC_STYLES={bob:'ボブ', ponytail:'ポニーテール', braid:'編み髪', short:'ショート',long:'ロング',waves:'ゆるいウェーブ',halfup:'ハーフアップ'};
export const APPEARANCE_RULES=Object.freeze({normalHairChance:.68,rareFemaleBeautyChance:.045});
const NORMAL_HAIR_STYLES=['short','parted','tousled','curly','tied'];
const EYE_COLORS=['#476b64','#665a83','#567385','#735843'];
export const GLASSES_LABELS=Object.freeze({none:'',round:'丸メガネ',square:'角メガネ',half:'ハーフリム'});
const FRAME_COLORS=['#454344','#6d5544','#927c61'];
const FACES={round:'丸顔', square:'角張った顔', long:'面長', angular:'すっきりした輪郭'};
const MEDICS=new Set(['MEDIC','HIGH_PRIEST','SAINT','ARCHANGEL']);
const ARCHERS=new Set(['ARCHER','SNIPER','STORM_BOW','STAR_HUNTER']);
const LIGHTS=new Set(['LIGHT','BLADEMASTER','SWORD_EMPEROR','VOID_EDGE']);
export const isMedicAppearance = key => MEDICS.has(key);
const MAGES=new Set(['MAGE','ARCHMAGE','ELEMENTAL_SAGE','ARCANE_SOVEREIGN']);
const LIMITED_FAMILIES={NINJA:'LIGHT',BEAST_WOLF:'LIGHT',BEAST_CAT:'LIGHT',BEAST_BEAR:'HEAVY',BEAST_FOX:'MAGE',BEAST_BIRD:'ARCHER'};
export const soldierAppearanceFamily = key => LIMITED_FAMILIES[key]||(MAGES.has(key)?'MAGE':MEDICS.has(key)?'MEDIC':ARCHERS.has(key)?'ARCHER':LIGHTS.has(key)?'LIGHT':'HEAVY');
const NORMAL_PHYSIQUE=Object.freeze({bodyWidth:1,armWidth:1,shadowWidth:1,portraitWidth:1});
const MUSCLE_PHYSIQUE=Object.freeze({bodyWidth:1.45,armWidth:1.55,shadowWidth:1.18,portraitWidth:1.28});
export const soldierPhysique = soldier => isMuscleCaster(soldier)?MUSCLE_PHYSIQUE:NORMAL_PHYSIQUE;

function seededIdentity(identity) {
  let n=2166136261;
  for(const char of String(identity)) {n^=char.charCodeAt(0);n=Math.imul(n,16777619);}
  return () => {n=(n+0x6D2B79F5)|0;let t=Math.imul(n^(n>>>15),1|n);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296;};
}

function createEyewear(identity) {
  const random=seededIdentity(`iron-glasses-v1:${identity}`),roll=random();
  return {glasses:roll<.65?'none':roll<.79?'round':roll<.93?'square':'half',glassesColor:FRAME_COLORS[Math.floor(random()*FRAME_COLORS.length)]};
}

function createHairStyle(identity,handsome) {
  if(handsome)return 'swept';
  const random=seededIdentity(`iron-hair-v2:${identity}`),roll=random();
  if(roll<APPEARANCE_RULES.normalHairChance)return NORMAL_HAIR_STYLES[Math.floor(random()*NORMAL_HAIR_STYLES.length)];
  const old=random();return old<.27?'barcode':old<.52?'bald':old<.69?'mohawk':old<.84?'sidebald':old<.94?'horseshoe':'buzz';
}
function createFemaleBeauty(identity) {
  const random=seededIdentity(`iron-female-beauty-v1:${identity}`);
  return {beautiful:random()<APPEARANCE_RULES.rareFemaleBeautyChance,eyeColor:EYE_COLORS[Math.floor(random()*EYE_COLORS.length)]};
}

export function createSoldierAppearance(identity) {
  const random=seededIdentity(`iron-face-v1:${identity}`),pick=values=>values[Math.floor(random()*values.length)];
  const handsome=random()<.06;random(); // Preserve the v1 draw positions for the existing face and colors.
  const hairStyle=createHairStyle(identity,handsome);
  return {
    version:1,handsome,hairStyle,skin:pick(SKINS),hairColor:pick(HAIRS),
    faceShape:handsome?'angular':pick(['round','square','long']),
    eyes:handsome?'sharp':pick(['flat','droopy','sharp']),brow:Math.floor(random()*3),
    facialHair:handsome?'none':pick(['none','none','stubble','mustache','chin']),
    scar:!handsome&&random()<.22,smile:random()<.45,
    medicHair:pick(['bob','ponytail','braid','short','long','waves','halfup']),
    medicHairColor:pick(MEDIC_HAIRS),medicAccessory:pick(['clip','ribbon','none']),
    ...createEyewear(identity),...createFemaleBeauty(identity)
  };
}

export function ensureSoldierAppearance(soldier) {
  const a=soldier.appearance;
  if(a?.version===1 && HAIR_LABELS[a.hairStyle] && SKINS.includes(a.skin) && HAIRS.includes(a.hairColor) && MEDIC_STYLES[a.medicHair] && MEDIC_HAIRS.includes(a.medicHairColor)) {
    if(!(a.glasses in GLASSES_LABELS) || !FRAME_COLORS.includes(a.glassesColor))Object.assign(a,createEyewear(soldier.id || `${soldier.name || 'soldier'}:${soldier.platoonId || 0}`));
    // Already assigned people retain their face, hair and styling across updates.
    if(typeof a.beautiful!=='boolean')a.beautiful=false;
    if(!EYE_COLORS.includes(a.eyeColor))a.eyeColor=EYE_COLORS[3];
    return a;
  }
  soldier.appearance=createSoldierAppearance(soldier.id || `${soldier.name || 'soldier'}:${soldier.platoonId || 0}`);
  return soldier.appearance;
}

export function describeSoldierAppearance(soldier) {
  const a=ensureSoldierAppearance(soldier);
  if(isMedicAppearance(soldier.soldierClass))return [MEDIC_STYLES[a.medicHair],a.beautiful?'華やかな顔立ち':'やわらかな表情',GLASSES_LABELS[a.glasses]].filter(Boolean).join(' · ');
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
  } else if(['long','waves','halfup'].includes(a.medicHair)) {
    polygon(c,[[-5,-5],[-6.1,-1],[-6.3,5],[-5.5,11],[-3.8,13],[-3.4,5],[3.4,5],[4.1,13],[6.1,10],[6.4,3],[5.8,-2],[3.5,-5]],hair);
    if(a.medicHair==='waves'){
      ellipse(c,-5.2,5,1.5,2.5,hair);ellipse(c,5.2,7,1.5,2.5,hair);
      stroke(c,[[-5,1],[-4.7,5],[-5.2,9]],'rgba(220,184,144,.2)',.45);
      stroke(c,[[5,2],[4.7,6],[5.2,10]],'rgba(220,184,144,.2)',.45);
    } else if(a.medicHair==='halfup')ellipse(c,4.9,-3.7,2.2,2.2,hair);
  } else polygon(c,[[-5,-4],[-6,0],[-5,3],[5,3],[6,-2],[3,-5]],hair);
}

function scalpHair(c,a,medic,small) {
  const hair=medic?a.medicHairColor:a.hairColor;
  if(medic) {
    if(['long','waves','halfup'].includes(a.medicHair)){
      polygon(c,[[-5.1,2],[-5.4,-3],[-3.8,-6],[0,-6.8],[3.7,-6],[5.5,-3],[5.1,3],[3.6,-1],[1.3,-3.4],[-1,-2.6],[-2.9,-1],[-4.3,3]],hair);
      if(!small)stroke(c,[[-3.8,-4],[0,-5.4],[3.2,-4]],'rgba(224,187,148,.28)',.45);
    } else polygon(c,[[-5,1],[-5,-4],[-3,-6],[2,-6],[5,-3],[5,2],[3,-1],[1,-3],[-1,-1],[-2,-3],[-4,0]],hair);
    if(a.beautiful&&!small){stroke(c,[[-3.5,-4.4],[-1.2,-5.2],[1,-5.4]],'rgba(244,215,181,.36)',.45);stroke(c,[[3.8,-2.5],[4.5,-.6]],'rgba(244,215,181,.23)',.35);}
    if(a.medicAccessory==='clip')stroke(c,[[3,-2],[4.5,-1]],'#cbb78b',.7);
    if(a.medicAccessory==='ribbon') {
      polygon(c,[[5,-2],[7,-4],[7,-.4],[5,-1],[3,-3],[3,-.5]],'#a66c69');
    }
    return;
  }
  if(a.hairStyle==='short') {
    polygon(c,[[-5,-.6],[-5.3,-3.9],[-3.8,-6],[.2,-6.8],[4,-5.4],[5.1,-2.6],[4.5,.2],[3,-2.4],[1.5,-1.8],[0,-3],[-1.7,-1.8],[-3.6,-2.6]],hair);
  } else if(a.hairStyle==='parted') {
    polygon(c,[[-5.3,1],[-5.2,-4],[-2.8,-6.2],[1.2,-6.6],[4.7,-4.8],[5.1,.2],[3.8,-2],[2.5,-4],[.3,-3.3],[-3.4,-.6]],hair);
    stroke(c,[[1.1,-6],[.8,-4.6],[.2,-3.5]],'rgba(223,190,148,.5)',small?.45:.35);
  } else if(a.hairStyle==='tousled') {
    polygon(c,[[-5.5,-1],[-5.2,-4.4],[-3.7,-6],[-2.6,-5.6],[-1,-7.2],[.7,-6.2],[2.9,-7],[4.1,-5],[5.5,-3.4],[4.7,.5],[3.3,-1.9],[1.3,-.5],[.3,-2.5],[-1.5,-1.1],[-2.4,-2.8],[-4,-.1]],hair);
  } else if(a.hairStyle==='curly') {
    polygon(c,[[-5,-1],[-5,-4],[0,-6.8],[5,-4],[5,.1],[3,-1.2],[1,-2],[-1.8,-1.3],[-3.7,-.4]],hair);
    for(const [x,y] of [[-4,-4],[-2.2,-5.6],[.2,-6],[2.7,-5.6],[4.4,-3.7]])ellipse(c,x,y,1.7,1.6,hair);
    if(!small)stroke(c,[[-2.8,-5.7],[-1.6,-6],[0,-5.4]],'rgba(217,181,141,.25)',.35);
  } else if(a.hairStyle==='tied') {
    polygon(c,[[-5,-.6],[-5,-4],[-3,-6],[1,-6.8],[4.7,-4.3],[5,-.5],[3,-2.2],[.5,-3.3],[-2.7,-2.6]],hair);
    if(!small)stroke(c,[[-3,-4.5],[.8,-5.4],[3,-4.1]],'rgba(217,181,141,.28)',.35);
  } else if(a.hairStyle==='barcode') {
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

// Near-field heads are static art. A bounded cache avoids repeating their
// hair, glasses, skin and helmet paths for every visible soldier, every frame.
// 64 surfaces at 96x120 RGBA = at most 2.82 MiB; eviction releases pixels.
const FIELD_HEADS=new Map();
export function drawSoldierHead(c,soldier,options={}) {
  const {x=0,y=0,scale=1,small=false,silhouette=false,helmet=null,helmetTier=1,mitre=false,cap=false}=options;
  if(!small||silhouette||typeof c.canvas?.width!=='number'||(typeof document==='undefined'||typeof document.createElement!=='function'))return paintSoldierHead(c,soldier,options);
  const a=ensureSoldierAppearance(soldier);
  const key=JSON.stringify([a,isMedicAppearance(soldier.soldierClass),soldier.species,soldier.soldierClass==='NINJA',helmet,helmetTier,mitre,cap]);
  let art=FIELD_HEADS.get(key);
  try{if(art?.getContext?.('2d')?.isContextLost?.()){art.width=art.height=1;FIELD_HEADS.delete(key);art=null;}}catch{art=null;}
  if(!art){
    if(FIELD_HEADS.size>=64){const oldest=FIELD_HEADS.keys().next().value,retired=FIELD_HEADS.get(oldest);retired.width=retired.height=1;FIELD_HEADS.delete(oldest);}
    art=document.createElement('canvas');art.width=96;art.height=120;const b=art.getContext('2d');
    if(!b){art.width=art.height=1;return paintSoldierHead(c,soldier,options);}
    b.scale(3,3);b.translate(16,20);paintSoldierHead(b,soldier,{small,helmet,helmetTier,mitre,cap});FIELD_HEADS.set(key,art);
  }else{FIELD_HEADS.delete(key);FIELD_HEADS.set(key,art);}
  c.save();c.translate(x,y);c.scale(scale,scale);
  try{c.drawImage(art,-16,-20,32,40);}catch{c.restore();return paintSoldierHead(c,soldier,options);}
  c.restore();
}

/** Head centered on (x,y); far silhouettes remain direct, cheap primitives. */
function paintSoldierHead(c,soldier,{x=0,y=0,scale=1,small=false,silhouette=false,helmet=null,helmetTier=1,mitre=false,cap=false}={}) {
  const a=ensureSoldierAppearance(soldier),medic=isMedicAppearance(soldier.soldierClass);
  if(soldier.species||soldier.soldierClass==='NINJA'){
    c.save();c.translate(x,y);c.scale(scale,scale);
    const fur={wolf:'#899a9d',bear:'#8e7255',cat:'#b79b82',fox:'#c78d55',bird:'#99a99d'}[soldier.species]||'#333b4c';
    ellipse(c,0,0,5.5,6,fur);
    if(soldier.soldierClass==='NINJA'){c.fillStyle='#222b38';c.fillRect(-5.4,1,10.8,4.2);c.fillRect(-5.4,-5,10.8,3);stroke(c,[[4,-2],[9,-4],[8,0]],'#4c596e',1.4);}
    else if(soldier.species==='bear'){ellipse(c,-4.5,-5,2.3,2.5,fur);ellipse(c,4.5,-5,2.3,2.5,fur);ellipse(c,0,3,3.2,2.2,'#c0a58b');}
    else if(soldier.species==='bird'){polygon(c,[[-1,1],[3,2],[0,4],[-2,2]],'#c2aa6c');polygon(c,[[-4,-4],[-2,-8],[1,-5],[3,-8],[5,-3]],fur);}
    else{polygon(c,[[-5,-1],[-6,-9],[-1,-5],[1,-5],[6,-9],[5,-1]],fur);ellipse(c,0,3,3.4,2.4,'#d9c7ac');}
    c.fillStyle='#242c2c';c.fillRect(-3,-1,1.7,1);c.fillRect(1.5,-1,1.7,1);
    if(soldier.species&&soldier.species!=='bird')ellipse(c,0,2.7,.9,.7,'#352c27');
    if(helmet){c.fillStyle=helmet;c.fillRect(-5.5,-5,11,1.8);}
    c.restore();return;
  }
  const hair=medic?a.medicHairColor:a.hairColor;
  c.save();c.translate(x,y);c.scale(scale,scale);
  if(medic)medicBackHair(c,a);
  else if(a.hairStyle==='tied'){ellipse(c,4.9,-4.2,2.2,2,hair);polygon(c,[[5.2,-3],[7.2,-1.5],[7,3.5],[5.5,1]],hair);}
  if(!small){ellipse(c,-5,1,1,1.7,a.skin);ellipse(c,5,1,1,1.7,a.skin);}
  if(small)ellipse(c,0,0,a.faceShape==='long'?4.5:a.faceShape==='square'?5.5:5.1,medic?5.8:6,a.skin);
  else if(medic&&a.beautiful){ellipse(c,0,-2.1,4.9,3.7,a.skin);polygon(c,[[-4.8,-2],[4.8,-2],[4.1,2.6],[2.4,5.1],[0,6],[-2.4,5.1],[-4.1,2.6]],a.skin);}
  else if(medic||a.faceShape==='round')ellipse(c,0,0,5.1,6,a.skin);
  else if(a.faceShape==='long')ellipse(c,0,0,4.5,6.7,a.skin);
  else {
    ellipse(c,0,-2.5,5.1,3.8,a.skin);
    polygon(c,[[-5,-2],[5,-2],[4.5,3.2],[a.handsome?2.5:4,5.3],[0,6.2],[-(a.handsome?2.5:4),5.3],[-4.5,3.2]],a.skin);
  }
  if(!silhouette){
    // The same fixed light direction for field heads and portrait faces.
    polygon(c,[[2.8,-4.5],[4.5,-2],[4.5,2.8],[2.4,5.3],[1,5.8],[2.5,1]],'rgba(81,47,34,.18)');
    ellipse(c,-2.1,-2.5,1.8,2.6,'rgba(255,241,213,.18)');
    if(small)stroke(c,[[.2,1.5],[.7,2.8],[-.3,3]],'rgba(101,63,43,.5)',.45);
  }
  if(!small)ellipse(c,-1.5,-3.5,1.9,.65,'rgba(255,241,213,.28)');
  else if(a.hairStyle==='bald'&&!helmet&&!mitre){c.fillStyle='rgba(255,241,213,.28)';c.fillRect(-2,-4,2,.7);}
  if(!helmet&&!mitre)scalpHair(c,a,medic,small);
  else if(!medic&&a.hairStyle==='horseshoe') {
    c.fillStyle=hair;c.fillRect(-5,0,1.3,5);c.fillRect(3.7,0,1.3,5);
  }
  const eyesY=a.eyes==='droopy'&&!medic?1.7:1;
  if(silhouette) {
    if(!medic&&a.facialHair!=='none') {c.fillStyle=hair;c.fillRect(-1.5,a.facialHair==='mustache'?3.5:5,3,.75);}
    if(a.glasses!=='none'){c.fillStyle=a.glassesColor;c.fillRect(-3.5,.65,7,.8);}
  } else if(small) {
    c.fillStyle=medic&&a.beautiful?a.eyeColor:'#302a26';c.fillRect(-2.7,1,1,.8);c.fillRect(1.7,1,1,.8);
    if(!medic) {
      c.fillStyle=hair;c.fillRect(-3.3,-.7,2,.6+a.brow*.15);c.fillRect(1.3,-.7,2,.6+a.brow*.15);
      if(a.facialHair==='mustache')c.fillRect(-2,3.5,4,.75);
      else if(a.facialHair==='chin')c.fillRect(-1,5.3,2,.8);
      else if(a.facialHair==='stubble'){c.fillStyle='rgba(52,44,36,.18)';c.fillRect(-2,4,4,1.7);}
    }
    c.fillStyle=medic?'#995f56':'#825b48';c.fillRect(-.8,4,.9,.45);
  } else if(medic) {
    if(a.beautiful){
      for(const x of [-2.2,2.2]){
        ellipse(c,x,eyesY,.95,1.08,'#f5ede5');ellipse(c,x,eyesY+.1,.63,.91,a.eyeColor);ellipse(c,x,eyesY+.2,.3,.68,'#29252d');
        ellipse(c,x-.23,eyesY-.35,.23,.27,'#fffdf4');ellipse(c,x+.2,eyesY+.65,.12,.13,'#e6eee5');
      }
      stroke(c,[[-3.25,.65],[-2.8,.1],[-2.1,-.05],[-1.35,.4]],hair,.35);stroke(c,[[1.35,.4],[2.1,-.05],[2.8,.1],[3.25,.65]],hair,.35);
      stroke(c,[[-3.15,.3],[-3.6,-.2]],hair,.25);stroke(c,[[3.15,.3],[3.6,-.2]],hair,.25);
      stroke(c,[[-3.2,-1.4],[-2.3,-1.65],[-1.3,-1.4]],hair,.28);stroke(c,[[1.3,-1.4],[2.3,-1.65],[3.2,-1.4]],hair,.28);
      ellipse(c,-3.2,2.5,.85,.45,'rgba(199,112,116,.2)');ellipse(c,3.2,2.5,.85,.45,'rgba(199,112,116,.2)');
      stroke(c,[[-.85,4],[0,4.28],[.85,4]],'#a56365',.3);
    }else{
      ellipse(c,-2.3,eyesY,.65,.9,'#3b2f2d');ellipse(c,2.3,eyesY,.65,.9,'#3b2f2d');
      ellipse(c,-2.5,.75,.18,.23,'#fff7e8');ellipse(c,2.1,.75,.18,.23,'#fff7e8');stroke(c,[[-3.2,.6],[-2.7,.3]],hair,.3);stroke(c,[[2.7,.3],[3.2,.6]],hair,.3);
      ellipse(c,-3.4,2.6,1,.5,'rgba(186,97,91,.28)');ellipse(c,3.4,2.6,1,.5,'rgba(186,97,91,.28)');
      stroke(c,[[-1,4],[0,4.4],[1,4]],'#995f56',.35);
    }
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
    const p=equipmentVisualProfile({tier:helmetTier});
    if(p.rough){polygon(c,[[-4,-3.8],[-3.2,-6],[-.5,-6.8],[3.4,-5.8],[4.5,-3]],helmet);stroke(c,[[-3,-4.4],[3.2,-3.8]],'#a99472',1);}
    else{polygon(c,[[-6,-2],[-5,-5],[-2,-7],[2,-7],[5,-5],[6,-2],[4,-1],[3,-3],[-3,-3],[-4,-1]],helmet);
      if(!silhouette){polygon(c,[[0,-6.5],[4,-4.8],[5.5,-2.2],[3.8,-1.6],[2,-4.8]],'rgba(19,29,28,.28)');}
      stroke(c,[[-3,-5],[2,-6],[4,-4]],'#c4c5b5',.65);
      if(p.coverage>.55){polygon(c,[[-5,-1],[-3.7,0],[-3.5,3.4],[-5.5,2.5]],helmet);polygon(c,[[3.7,0],[5,-1],[5.5,2.5],[3.5,3.4]],helmet);}
      if(p.detail>=2){stroke(c,[[-5,-2],[5,-2]],'#d0bd92',.6);c.fillStyle='#c6b48e';c.fillRect(-.5,-6,1,1);}
    }
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
  const physique=soldierPhysique(soldier),muscular=physique.bodyWidth>1;
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
  c.save();c.scale(physique.portraitWidth,1);
  polygon(c,muscular?[[-11,15],[-9,9],[-5,7],[-2.5,6],[2.5,6],[5,7],[9,9],[11,15],[11,21],[-11,21]]
    :[[-10,15],[-8,10],[-3.5,7],[3.5,7],[8,10],[10,15],[11,21],[-11,21]],uniform);
  if(muscular) {
    polygon(c,[[-8,10],[-3,9],[-1,13],[-2,16],[-8.5,15]],'rgba(255,255,255,.1)');
    polygon(c,[[2,10],[8,10],[9,15],[2,16]],'rgba(0,0,0,.15)');
    stroke(c,[[-9,10],[-7,14],[-7.5,18]],'rgba(30,40,42,.35)',.65);
    stroke(c,[[9,10],[7,14],[7.5,18]],'rgba(30,40,42,.35)',.65);
  }
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
  c.restore();
  drawSoldierHead(c,soldier,{cap:medic});
  c.restore();
}
