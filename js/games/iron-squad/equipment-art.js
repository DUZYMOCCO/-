import {equipmentVisualProfile} from './equipment-tiers.js?v=148';
const polygon=(c,points,color)=>{c.fillStyle=color;c.strokeStyle='#34332e';c.lineWidth=.7;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();c.stroke();};
const line=(c,points,color,width=.7)=>{c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();};
const plane=(c,points,color)=>{c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();};

/** Clothing remains underneath every piece. Coverage and workmanship belong to the item. */
function paintArmor(c,armor,{armorColor,role='HEAVY',simple=false}) {
 const caster=role==='MEDIC'||role==='MAGE',light=role==='LIGHT'||role==='ARCHER';
 if(armor.coverage){
   const cover=armor.coverage,w=3+cover*(light?3:caster?2:5),top=-20-cover*4,bottom=-16+cover*(caster?17:11);
   c.fillStyle=armorColor;c.strokeStyle='#34332e';c.lineWidth=.7;c.beginPath();
   c.moveTo(-w,top+1);c.quadraticCurveTo(-w*.4,top-1,0,top+.7);c.quadraticCurveTo(w*.4,top-1,w,top+1);
   c.lineTo(w+.5,bottom-1);c.quadraticCurveTo(0,bottom+2,-w,bottom);c.closePath();c.fill();c.stroke();
   if(cover>.4){const shoulder=light?1.2:caster?1.5:2.8;c.fillStyle=armorColor;c.fillRect(-w-shoulder,top,shoulder+1,2+cover*3);c.fillRect(w-.7,top,shoulder+1,2+cover*3);}
   if(cover>.72&&!light&&!caster){polygon(c,[[-7,-10],[-10,-3],[-4,-4],[-3,-10]],armorColor);polygon(c,[[4,-10],[9,-9],[10,-3],[4,-4]],armorColor);}
   if(!simple){
     // Broad light planes stay readable at phone size, without per-frame gradients.
     plane(c,[[-w+.6,top+1],[-.7,top+1.2],[-w*.25,bottom-.8],[-w+.8,bottom-1]],armor.rough?'rgba(235,214,164,.16)':'rgba(237,245,235,.28)');
     plane(c,[[w*.5,top+1],[w,top+1],[w+.2,bottom-1],[0,bottom+.5]],'rgba(18,29,28,.27)');
     if(armor.rough){line(c,[[-w,top+1],[w-1,top+2]],'#9e8b68',1.4);line(c,[[-w+1,top],[w-2,bottom]],'#65513b',1.4);for(let i=0;i<3;i++)line(c,[[-w+.7+i*2,top+1],[-w+1+i*2,top+2.5]],'#d0bea0');}
     else{line(c,[[-w+.5,top+1],[-1,top+2],[w-.5,top+1]],'#d1cbb6');line(c,[[0,top+2],[-.6,bottom-2],[0,bottom-.5]],'#655e50');
       if(armor.detail>=1){for(const x of [-w+1,w-1]){c.fillStyle='#c6b58b';c.fillRect(x,top+3,.9,.9);c.fillRect(x,bottom-2,.9,.9);}}
       if(armor.detail>=2){line(c,[[-w,-14],[w,-14]],'#c2b9a1');polygon(c,[[-1.8,-19],[1.8,-19],[1.3,-16],[0,-15],[-1.3,-16]],'#b09a66');}
       if(armor.detail>=3){line(c,[[-w+1,top+2],[-w+1,bottom-1]],'#d7cda7');line(c,[[w-1,top+2],[w-1,bottom-1]],'#d7cda7');}
     }
   }
 }
}

// Only the static breastplate is cached. Moving legs, hands and weapons keep
// their live poses. 48 plates at 64x72 RGBA stay below 0.85 MiB.
const ARMOR_ART=new Map();
export function drawBodyEquipment(c,eq,{armorColor,legColor,role='HEAVY',stride=0,simple=false}) {
 const armor=equipmentVisualProfile(eq.armor),legs=equipmentVisualProfile(eq.legs);
 if(eq.armor){
  if(!simple&&typeof c.canvas?.width==='number'&&typeof document!=='undefined'&&typeof document.createElement==='function'){
   const family=role==='MEDIC'||role==='MAGE'?'MAGE':role==='LIGHT'||role==='ARCHER'?'LIGHT':'HEAVY';
   const key=JSON.stringify([armor,armorColor,family]);let art=ARMOR_ART.get(key);
   try{if(art?.getContext?.('2d')?.isContextLost?.()){art.width=art.height=1;ARMOR_ART.delete(key);art=null;}}catch{art=null;}
   if(!art){
    if(ARMOR_ART.size>=48){const oldest=ARMOR_ART.keys().next().value,retired=ARMOR_ART.get(oldest);retired.width=retired.height=1;ARMOR_ART.delete(oldest);}
    art=document.createElement('canvas');art.width=64;art.height=72;const b=art.getContext('2d');
    if(b){b.scale(2,2);b.translate(16,30);paintArmor(b,armor,{armorColor,role:family});ARMOR_ART.set(key,art);}
    else{art.width=art.height=1;art=null;}
   }else{ARMOR_ART.delete(key);ARMOR_ART.set(key,art);}
   if(art){
    try{c.drawImage(art,-16,-30,32,36);}catch{paintArmor(c,armor,{armorColor,role,simple});}
   }else paintArmor(c,armor,{armorColor,role,simple});
  }else paintArmor(c,armor,{armorColor,role,simple});
 }
 if(eq.legs){
   const cover=legs.coverage;
   for(const x of [-5+stride,2-stride]){const top=-2-cover*6;c.fillStyle=legColor;c.fillRect(x+.3,top,3.4,2+cover*6);
     if(!simple){if(legs.rough){line(c,[[x,top+1],[x+3.5,top+1]],'#9c8664',1.1);}else{line(c,[[x+.5,top],[x+.5,0]],'#c4c0ac');if(legs.detail>=2){c.fillStyle='#d1c3a1';c.fillRect(x+.7,top,2.3,1.8);}}}
   }
 }
}

export function drawEquipmentShield(c,x,y,color,profile,simple=false) {
 if(!profile?.coverage)return;
 const w=2.5+profile.coverage*4,h=4+profile.coverage*5;
 const points=profile.rough?[[x-w,y-h],[x+w-.7,y-h+1],[x+w,y+h-1],[x-w+.8,y+h]]:[[x-w,y-h],[x+w,y-h],[x+w,y+h*.5],[x,y+h+2],[x-w,y+h*.5]];
 polygon(c,points,color);
 if(simple)return;
 plane(c,[[x-w+.5,y-h+.8],[x,y-h+1],[x-1,y+h*.5],[x-w+.8,y+h*.3]],'rgba(235,228,196,.24)');
 plane(c,[[x+w-1,y-h+1],[x+w,y+h*.5],[x,y+h+1],[x+1,y]],'rgba(18,29,28,.27)');
 if(profile.rough){line(c,[[x-1,y-h],[x-1,y+h]],'#66543c',1);line(c,[[x-w,y-1],[x+w,y-.2]],'#b99f75',1.2);}
 else{line(c,[[x,y-h+2],[x,y+h]],'#c6b994',1.2);if(profile.detail>=2){line(c,[[x-w+1,y-h+1],[x+w-1,y-h+1]],'#ded4b8');c.fillStyle='#b8a174';c.fillRect(x-1.5,y-2,3,3);}}
}
