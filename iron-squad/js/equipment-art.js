import {equipmentVisualProfile} from './equipment-tiers.js?v=187';
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
 const material=profile.material||1,round=material<=2,w=4+profile.coverage*3.5,h=round?w*1.04:6+profile.coverage*4.5;
 const rim=material===1?'#b69a70':material>=5?'#d3bd86':'#c0c9bd';
 c.save();c.translate(x,y);c.fillStyle=color;c.strokeStyle='#26312d';c.lineWidth=simple?.9:1.3;c.beginPath();
 if(round)c.ellipse(0,0,w,h,0,0,Math.PI*2);
 else{c.moveTo(-w,-h);c.lineTo(w,-h);c.lineTo(w,h*.28);c.quadraticCurveTo(w*.7,h*.65,0,h);c.quadraticCurveTo(-w*.7,h*.65,-w,h*.28);c.closePath();}
 c.fill();c.stroke();
 if(!simple){
   c.save();c.clip();
   plane(c,[[-w,-h],[0,-h],[0,h],[-w,h]],'rgba(235,228,196,.2)');
   plane(c,[[w,-h],[w,h],[1,h],[1,-h]],'rgba(18,29,28,.22)');
   if(material===1)for(const px of [-w*.45,0,w*.45])line(c,[[px,-h],[px,h]],'#5a4735',.65);
   c.restore();
   c.strokeStyle=rim;c.lineWidth=profile.detail>=2?1.15:.8;c.beginPath();
   if(round)c.ellipse(0,0,w-.8,h-.8,0,0,Math.PI*2);
   else{c.moveTo(-w+1,-h+1);c.lineTo(w-1,-h+1);c.lineTo(w-1,h*.25);c.quadraticCurveTo(w*.5,h*.6,0,h-1.2);c.quadraticCurveTo(-w*.5,h*.6,-w+1,h*.25);c.closePath();}
   c.stroke();
 }
 // The central boss reads as a shield even at the first tier and distant size.
 c.fillStyle=rim;c.beginPath();c.ellipse(0,0,simple?1.2:1.7,simple?1.2:1.7,0,0,Math.PI*2);c.fill();
 if(!simple){
   if(material>=3)line(c,[[0,-h+2.5],[0,h-2.5]],rim,.7);
   if(profile.detail>=2){polygon(c,[[0,-4],[3,-1],[0,3],[-3,-1]],rim);polygon(c,[[0,-2.7],[1.5,-1],[0,1],[-1.5,-1]],material>=5?'#56796c':'#647b87');}
   if(profile.detail>=3)for(const px of [-w+2,w-2]){c.fillStyle=rim;c.fillRect(px-.5,-h+2,.9,.9);c.fillRect(px-.5,1,.9,.9);}
 }
 c.restore();
}
