import {equipmentVisualProfile} from './equipment-tiers.js?v=132';
const polygon=(c,points,color)=>{c.fillStyle=color;c.strokeStyle='#34332e';c.lineWidth=.7;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();c.stroke();};
const line=(c,points,color,width=.7)=>{c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();};

/** Clothing remains underneath every piece. Coverage and workmanship belong to the item. */
export function drawBodyEquipment(c,eq,{armorColor,legColor,role='HEAVY',stride=0,simple=false}) {
 const armor=equipmentVisualProfile(eq.armor),legs=equipmentVisualProfile(eq.legs);
 const caster=role==='MEDIC'||role==='MAGE',light=role==='LIGHT'||role==='ARCHER';
 if(eq.armor){
   const cover=armor.coverage,w=3+cover*(light?3:caster?2:5),top=-20-cover*4,bottom=-16+cover*(caster?17:11);
   polygon(c,[[-w,top],[w,top+.5],[w+.5,bottom-1],[0,bottom+1],[-w,bottom]],armorColor);
   if(cover>.4){const shoulder=light?1.2:caster?1.5:2.8;c.fillStyle=armorColor;c.fillRect(-w-shoulder,top,shoulder+1,2+cover*3);c.fillRect(w-.7,top,shoulder+1,2+cover*3);}
   if(cover>.72&&!light&&!caster){polygon(c,[[-7,-10],[-10,-3],[-4,-4],[-3,-10]],armorColor);polygon(c,[[4,-10],[9,-9],[10,-3],[4,-4]],armorColor);}
   if(!simple){
     if(armor.rough){line(c,[[-w,top+1],[w-1,top+2]],'#9e8b68',1.4);line(c,[[-w+1,top],[w-2,bottom]],'#65513b',1.4);for(let i=0;i<3;i++)line(c,[[-w+.7+i*2,top+1],[-w+1+i*2,top+2.5]],'#d0bea0');}
     else{line(c,[[-w+.5,top+1],[w-.5,top+1]],'#d1cbb6');line(c,[[0,top+2],[0,bottom-.5]],'#655e50');
       if(armor.detail>=1){for(const x of [-w+1,w-1]){c.fillStyle='#c6b58b';c.fillRect(x,top+3,.9,.9);c.fillRect(x,bottom-2,.9,.9);}}
       if(armor.detail>=2){line(c,[[-w,-14],[w,-14]],'#c2b9a1');polygon(c,[[-1.8,-19],[1.8,-19],[1.3,-16],[0,-15],[-1.3,-16]],'#b09a66');}
       if(armor.detail>=3){line(c,[[-w+1,top+2],[-w+1,bottom-1]],'#d7cda7');line(c,[[w-1,top+2],[w-1,bottom-1]],'#d7cda7');}
     }
   }
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
 if(profile.rough){line(c,[[x-1,y-h],[x-1,y+h]],'#66543c',1);line(c,[[x-w,y-1],[x+w,y-.2]],'#b99f75',1.2);}
 else{line(c,[[x,y-h+2],[x,y+h]],'#c6b994',1.2);if(profile.detail>=2){line(c,[[x-w+1,y-h+1],[x+w-1,y-h+1]],'#ded4b8');c.fillStyle='#b8a174';c.fillRect(x-1.5,y-2,3,3);}}
}
