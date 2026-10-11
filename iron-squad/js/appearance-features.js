/** Personal facial features and ornaments. Pure Canvas art; never affects stats. */
export const FACE_OUTLINES=Object.freeze({standard:'ふつう',round:'丸顔',square:'角ばった顔',long:'面長',angular:'細いりんかく',broad:'はば広の顔'});
export const EYE_SHAPES=Object.freeze({standard:'ふつう',stern:'目つきが悪い',narrow:'細目',wide:'丸い目',sleepy:'眠そう',deep:'ほりが深い',upturned:'つり目'});
export const NOSE_TYPES=Object.freeze({standard:'ふつう',high:'高いはな',hooked:'わしはな',broad:'大きいはな',upturned:'上向きのはな',flat:'低いはな'});
export const JAW_TYPES=Object.freeze({standard:'ふつう',forward:'出たあご',broad:'大きいあご',pointed:'とがったあご',square:'四角いあご',cleft:'割れたあご'});
export const ACCESSORY_LABELS=Object.freeze({none:'なし',clip:'ヘアピン',ribbon:'リボン',earring:'わの耳かざり',stud:'石の耳かざり',eyepatch:'眼帯',headband:'はちまき',flower:'花かざり',circlet:'ひたいかざり',comb:'髪どめ',feather:'羽かざり',bandage:'ほほのばんそうこう'});
const defaults=Object.freeze({faceOutline:'standard',eyeShape:'standard',nose:'standard',jaw:'standard',accessory:'none'});
const options={faceOutline:FACE_OUTLINES,eyeShape:EYE_SHAPES,nose:NOSE_TYPES,jaw:JAW_TYPES,accessory:ACCESSORY_LABELS};
const featureFields=Object.entries(options);

function identityRandom(identity){let n=2166136261;for(const ch of `iron-feature-v1:${identity}`)n=Math.imul(n^ch.charCodeAt(0),16777619);return()=>{n=(n+0x6D2B79F5)|0;let t=Math.imul(n^(n>>>15),1|n);t^=t+Math.imul(t^(t>>>7),61|t);return((t^(t>>>14))>>>0)/4294967296;};}
export function createAppearanceFeatures(identity){
  // The established default commander remains the same face.
  if(identity==='soldier:0')return {...defaults};
  const random=identityRandom(identity),pick=list=>list[Math.floor(random()*list.length)];
  return {faceOutline:pick(['standard','standard',...Object.keys(FACE_OUTLINES)]),
    eyeShape:pick(['standard','standard',...Object.keys(EYE_SHAPES)]),nose:pick(['standard','standard',...Object.keys(NOSE_TYPES)]),
    jaw:pick(['standard','standard','standard',...Object.keys(JAW_TYPES)]),
    accessory:pick([...Array(10).fill('none'),...Object.keys(ACCESSORY_LABELS).filter(k=>k!=='none')])};
}
/** Old looks gain neutral features; already chosen values are never rerolled. */
export function normalizeAppearanceFeatures(a,feminine=false){
  for(const [key,list]of featureFields)if(!Object.hasOwn(list,a[key])){
    a[key]=key==='accessory'&&feminine&&Object.hasOwn(ACCESSORY_LABELS,a.medicAccessory)?a.medicAccessory:defaults[key];
  }
  return a;
}
export function appearanceFeatureChoices(choices={}){
  return Object.fromEntries(Object.entries(options).map(([key,list])=>[key,Object.hasOwn(list,choices[key])?choices[key]:defaults[key]]));
}
const ellipse=(c,x,y,rx,ry,color)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();};
const polygon=(c,points,color)=>{c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();};
const line=(c,points,color,width=.4)=>{c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();};

/** Returns false for the legacy outline, allowing the original face path to paint it. */
export function drawVariantFace(c,a,feminine,small){
  if(a.faceOutline==='standard'&&a.jaw==='standard')return false;
  const outline=a.faceOutline==='standard'?(feminine?'round':a.faceShape):a.faceOutline;
  const w={round:5.1,square:5.5,long:4.5,angular:4.8,broad:5.9}[outline]||5.1;
  const h=outline==='long'?6.9:outline==='broad'?5.8:6.2;
  if(a.jaw==='standard'&&outline!=='angular'&&outline!=='square'){
    // Lengthen the lower face while keeping the scalp under the hairline.
    ellipse(c,0,outline==='long'?.65:.15,w,outline==='long'?6.4:outline==='broad'?5.6:6,a.skin);return true;
  }
  const bottom=a.jaw==='forward'?8.2:a.jaw==='pointed'?7.8:a.jaw==='broad'?7.1:a.jaw==='cleft'?7:Math.max(6.3,h);
  const chinWidth=a.jaw==='broad'?.82:a.jaw==='square'?.64:a.jaw==='forward'?.55:a.jaw==='pointed'?.15:.4;
  ellipse(c,0,-2.2,w,3.6,a.skin);
  if(a.jaw==='square')polygon(c,[[-w,-2],[w,-2],[w*.97,2.7],[w*.8,bottom-1.7],[w*chinWidth,bottom-.25],[0,bottom],[-w*chinWidth,bottom-.25],[-w*.8,bottom-1.7],[-w*.97,2.7]],a.skin);
  else{
    // A cheek shape must not silently turn a normal jaw into a polygon.
    c.fillStyle=a.skin;c.beginPath();c.moveTo(-w,-2);c.lineTo(w,-2);
    c.quadraticCurveTo(w,2.7,w*.8,bottom-1.7);
    c.bezierCurveTo(w*.63,bottom-.3,w*chinWidth,bottom,0,bottom);
    c.bezierCurveTo(-w*chinWidth,bottom,-w*.63,bottom-.3,-w*.8,bottom-1.7);
    c.quadraticCurveTo(-w,2.7,-w,-2);c.closePath();c.fill();
  }
  if(a.jaw==='forward'){
    polygon(c,[[-2,5.8],[1.3,5.5],[2.5,6.4],[1.7,7.2],[-1.4,7.4]],'rgba(255,241,213,.22)');
    line(c,[[-2.4,7.3],[0,7.8],[2.2,7.2]],'rgba(101,63,43,.3)',small?.38:.28);
  }else if(a.jaw==='cleft')line(c,[[-.45,5.5],[0,6.2],[.45,5.5]],'rgba(101,63,43,.55)',small?.5:.4);
  return true;
}

/** Non-standard eyes are common to both genders; the original eyes remain the default. */
export function drawVariantEyes(c,a,feminine,small){
  if(a.eyeShape==='standard')return;
  const hair=feminine?a.medicHairColor:a.hairColor,ink='#332c2a',iris=a.eyeColor||ink;
  for(const side of [-1,1]){
    const x=side*2.25,shape=a.eyeShape;
    if(shape==='wide'){
      ellipse(c,x,1,small?.88:1.05,small?.88:1.2,'#eee6d8');ellipse(c,x+.05,1.15,small?.49:.63,small?.66:.9,iris);
      if(!small)ellipse(c,x-.2,.65,.22,.26,'#fffaf0');line(c,[[x-1,-.8],[x,-1.05],[x+1,-.8]],hair,small?.4:.35);
    }else if(shape==='narrow'){
      line(c,[[x-1.1,1.2],[x,1.05],[x+1.1,1.2]],ink,small?.58:.52);
      line(c,[[x-1.1,-.45],[x+1.1,-.6]],hair,small?.55:.6);
    }else if(shape==='sleepy'){
      ellipse(c,x,1.4,.92,.48,'#eee6d8');ellipse(c,x,1.5,.48,.36,iris);
      line(c,[[x-1,1],[x,1.15],[x+1,1]],hair,small?.62:.5);
      line(c,[[x-.9,2.35],[x+.6,2.45]],'rgba(101,63,43,.45)',.35);
      line(c,[[x-1,-.35],[x,-.1],[x+1,-.35]],hair,.4);
    }else if(shape==='deep'){
      ellipse(c,x,.9,1.4,1,'rgba(78,49,38,.24)');ellipse(c,x,1.2,.72,.43,iris);
      line(c,[[x-1.25,-.5],[x,-.75],[x+1.15,-.5]],hair,small?.8:.9);
      line(c,[[x-1.1,2],[x+.85,2]],'rgba(101,63,43,.45)',.4);
    }else{
      const stern=shape==='stern';
      polygon(c,[[x-side*1.1,1.1],[x+side*.95,stern?.7:.2],[x+side*.75,1.5],[x-side*.9,1.65]],'#eee6d8');
      ellipse(c,x+(stern?-side*.13:side*.12),1.3,.48,.4,iris);
      line(c,[[x+side*1.2,stern?-1.25:-.65],[x-side*.9,stern?.25:-1]],hair,small?.85:.95);
      if(stern&&!small)line(c,[[side*.65,-1],[side*.5,.25]],'rgba(101,63,43,.6)',.35);
    }
  }
}

export function drawVariantNose(c,a,small){
  const shadow='rgba(112,68,47,.55)',light='rgba(255,237,207,.48)';
  if(a.nose==='standard'){
    line(c,[[.2,small?1.5:1.6],[small?.7:.6,2.8],[small?-.3:-.2,3]],small?'rgba(101,63,43,.5)':'#a4775c',small?.45:.35);return;
  }
  if(a.nose==='high'||a.nose==='hooked'){
    const hooked=a.nose==='hooked';
    polygon(c,[[-.45,-.7],[.45,-.9],[1.15,2.2],[hooked?1.85:1.5,3],[hooked?.45:.1,hooked?3.8:3.3],[-.4,2.75]],light);
    polygon(c,[[.45,-.9],[1.15,2.2],[hooked?1.85:1.5,3],[hooked?.45:.1,hooked?3.8:3.3],[.3,2.7]],shadow);
    line(c,[[hooked?.5:.1,hooked?3.8:3.3],[-.5,3.25]],'#94634d',small?.5:.35);
  }else if(a.nose==='broad'){
    ellipse(c,.2,2.5,1.45,1.05,shadow);ellipse(c,-.15,2.15,1,.62,light);
    ellipse(c,-.7,3,.33,.22,'#825a46');ellipse(c,1,3,.33,.22,'#825a46');
  }else if(a.nose==='upturned'){
    ellipse(c,.1,2.6,1.1,.8,light);line(c,[[-.9,2.45],[.1,2.2],[1.1,2.45]],shadow,.4);
    ellipse(c,-.4,2.9,.26,.24,'#94634d');ellipse(c,.65,2.9,.26,.24,'#94634d');
  }else line(c,[[-.7,2.8],[.3,3],[1.1,2.7]],shadow,small?.55:.4);
}

export function drawPersonalAccessory(c,a,{small=false,hairCovered=false}={}){
  const k=a.accessory;if(!k||k==='none')return;
  const metal='#c6ac75',gem='#709b8c';
  if(k==='eyepatch'){
    line(c,[[-5.1,-1],[4.8,2.1]],'#534b44',small?.7:.55);polygon(c,[[1.2,.1],[3.3,-.1],[3.9,1.6],[2.8,2.35],[1.2,1.7]],'#2d3439');
    line(c,[[1.6,.35],[3.1,.2]],'#69747a',.3);
  }else if(k==='earring'){
    c.strokeStyle=metal;c.lineWidth=small?.6:.45;c.beginPath();c.ellipse(5.45,3.4,1.1,1.65,0,0,Math.PI*2);c.stroke();
  }else if(k==='stud'){
    ellipse(c,5.2,2.1,small?.8:.7,small?.9:.8,metal);polygon(c,[[5.2,1.4],[5.7,2.1],[5.2,2.8],[4.7,2.1]],gem);
  }else if(k==='bandage'){
    polygon(c,[[2.7,2.3],[4.7,3.4],[4.2,4.4],[2.3,3.4]],'#d9ccb0');line(c,[[3.2,3],[3.8,3.4]],'#b79979',.45);
  }else if(!hairCovered){
    if(k==='clip')line(c,[[3,-2],[4.5,-1]],metal,.7);
    else if(k==='ribbon')polygon(c,[[5,-2],[7,-4],[7,-.4],[5,-1],[3,-3],[3,-.5]],'#a66c69');
    else if(k==='headband'){polygon(c,[[-5.1,-3.9],[5.1,-3.9],[5.1,-2.7],[-5.1,-2.7]],'#9b7564');line(c,[[4.7,-3],[8,-1.5],[9,1]],'#9b7564',1);}
    else if(k==='flower'){
      for(const [x,y]of [[4.4,-4.4],[6.5,-4.4],[4.1,-2.3],[6.8,-2.3],[5.5,-1.7]])ellipse(c,x,y,1,1.15,'#ba8791');ellipse(c,5.5,-3, .85,.85,'#ceb57c');
    }else if(k==='circlet'){line(c,[[-5,-4],[0,-4.6],[5,-4]],metal,.75);polygon(c,[[0,-5.5],[.8,-4.4],[0,-3.2],[-.8,-4.4]],gem);}
    else if(k==='comb'){polygon(c,[[3.3,-5.6],[6.7,-3.7],[6.3,-2.9],[2.9,-4.8]],metal);for(let i=0;i<3;i++)line(c,[[3.4+i,-4.9+i*.55],[2.7+i,-3.8+i*.55]],metal,.45);}
    else if(k==='feather'){line(c,[[4,-1.6],[6,-10]],metal,.45);polygon(c,[[4.7,-3],[4.1,-8],[5.9,-11],[7.1,-8],[6.2,-4]],'#bec8b6');line(c,[[4.7,-3],[6,-9.8]],'#65786c',.4);}
  }
}
