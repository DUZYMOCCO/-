/** Ceremonial class dress. Pure drawing data: no abilities, equipment or save changes. */
const STAGES={
 HEAVY:['PALADIN','TEMPLAR','IMMORTAL_AEGIS'],
 LIGHT:['BLADEMASTER','SWORD_EMPEROR','VOID_EDGE'],
 ARCHER:['SNIPER','STORM_BOW','STAR_HUNTER'],
 MEDIC:['HIGH_PRIEST','SAINT','ARCHANGEL'],
 MAGE:['ARCHMAGE','ELEMENTAL_SAGE','ARCANE_SOVEREIGN'],
 COMMANDER:['WARLORD','EMPEROR','MYTHIC_EMPEROR']
};
const PALETTES={
 HEAVY:[['#b4c2c9','#35596b'],['#d2d6cb','#304c64'],['#e1dfcd','#283f57']],
 LIGHT:[['#505865','#514653'],['#48475e','#39344e'],['#373d51','#293247']],
 ARCHER:[['#486a59','#334c40'],['#648276','#2c4f46'],['#8b9f91','#264a45']],
 MEDIC:[['#d5cbb3','#866e73'],['#e2d8c2','#795e70'],['#ede5d2','#695b78']],
 MAGE:[['#7c6a90','#51435e'],['#72628e','#3d3b60'],['#9587af','#34365b']],
 COMMANDER:[['#a29374','#754b43'],['#c2b390','#6c3944'],['#dacdae','#51415b']]
};
const NAMES={WARLORD:'覇王',EMPEROR:'帝皇',MYTHIC_EMPEROR:'神話帝'};
export const CLASS_REGALIA=Object.freeze(Object.fromEntries(Object.entries(STAGES).flatMap(([family,ids])=>ids.map((id,i)=>[id,Object.freeze({id,family,tier:i+1,cloth:PALETTES[family][i][0],mantle:PALETTES[family][i][1],metal:i?'#c6aa65':'#b8ad86',light:i===2?'#efe0ad':'#dbcfab',gem:{HEAVY:'#6b9dad',LIGHT:'#9b83ad',ARCHER:'#7aa088',MEDIC:'#c39da9',MAGE:'#aaa0c7',COMMANDER:'#b66b63'}[family],name:NAMES[id]||id})]))));
export function classRegaliaFor(unit,commander=false) {
 if(!unit)return null;
 const key=commander||unit.isCommander?unit.advancedClass|| (unit.isAdvanced?'WARLORD':null):unit.soldierClass;
 return CLASS_REGALIA[key]||null;
}
const polygon=(c,p,color)=>{c.fillStyle=color;c.strokeStyle='#34352f';c.lineWidth=.65;c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();c.stroke();};
const line=(c,p,color,width=.8)=>{c.strokeStyle=color;c.lineWidth=width;c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();};
const jewel=(c,x,y,r,color)=>polygon(c,[[x,y-r],[x+r*.7,y],[x,y+r],[x-r*.7,y]],color);

// Fixed class silhouettes are shared across every soldier. Two 96×112 layers
// for each of the 18 upper classes use at most 1.48 MiB; far views stay direct.
const REGALIA_ART=new Map();
function drawLayer(c,r,kind,paint,{simple=false}={}) {
 if(!r)return;
 if(simple||typeof c.canvas?.width!=='number'||typeof document==='undefined'||typeof document.createElement!=='function')return paint(c,r,{simple});
 const key=`${r.id}:${kind}`;let art=REGALIA_ART.get(key);
 try{if(art?.getContext?.('2d')?.isContextLost?.()){art.width=art.height=1;REGALIA_ART.delete(key);art=null;}}catch{art=null;}
 if(!art){
  if(REGALIA_ART.size>=36){const first=REGALIA_ART.keys().next().value,old=REGALIA_ART.get(first);old.width=old.height=1;REGALIA_ART.delete(first);}
  art=document.createElement('canvas');art.width=96;art.height=112;const ctx=art.getContext('2d');
  if(!ctx){art.width=art.height=1;return paint(c,r,{simple});}
  ctx.scale(2,2);ctx.translate(24,36);paint(ctx,r,{simple:false});REGALIA_ART.set(key,art);
 }
 try{c.drawImage(art,-24,-36,48,56);}catch{paint(c,r,{simple});}
}
export function drawClassMantle(c,r,options={}){drawLayer(c,r,'mantle',paintClassMantle,options);}
export function drawClassRegalia(c,r,options={}){drawLayer(c,r,'dress',paintClassRegalia,options);}

/** Draw behind the real armor. Tier changes add width, length and split/layered hems. */
function paintClassMantle(c,r,{simple=false}={}) {
 if(!r)return;
 const {tier:t,family:f}=r,w=8+t*2,bottom=t===1?-1:t===2?2:5;
 const light=f==='LIGHT',caster=f==='MAGE'||f==='MEDIC';
 polygon(c,light?[[-4,-24],[-w,-18],[-w-2,bottom],[-7,bottom-3],[-2,-11]]
  :[[-4,-25],[-w,-20],[-w-1,bottom],[-4,bottom-2],[0,bottom-5],[4,bottom-2],[w+1,bottom],[w,-20],[4,-25]],r.mantle);
 line(c,[[-w,-18],[-w-1,bottom],[-4,bottom-2]],r.metal,simple?1:1.2);
 if(!light)line(c,[[w,-18],[w+1,bottom],[4,bottom-2]],r.metal,simple?1:1.2);
 if(t>=2){
  const hem=caster?bottom+1:bottom-1;
  polygon(c,[[-w+2,-19],[-w+1,hem],[-7,hem-3],[-4,-18]],r.cloth);
  if(!light)polygon(c,[[w-2,-19],[w-1,hem],[7,hem-3],[4,-18]],r.cloth);
 }
 if(t===3){
  for(const side of [-1,1]){
   polygon(c,[[side*8,-20],[side*(w+3),-17],[side*(w+2),bottom-3],[side*11,bottom-6]],r.mantle);
   line(c,[[side*(w+2),-15],[side*(w+1),bottom-4]],r.light,1.1);
  }
 }
 if(simple)return;
 if(f==='ARCHER')for(const side of [-1,1])for(let i=0;i<t;i++)polygon(c,[[side*(w-.5),-13+i*4],[side*(w+2),-10+i*4],[side*(w-2),-8+i*4]],r.light);
 if(f==='MAGE')for(const side of [-1,1])line(c,[[side*(w-2),-16],[side*(w-4),-9],[side*(w-1),-4]],r.metal);
 if(f==='COMMANDER'&&t>=2)for(const side of [-1,1])line(c,[[side*(w-2),-15],[side*(w-4),-10],[side*(w-2),-6]],r.light,1.1);
}

/** Ceremonial shoulder pieces and insignia sit around/on the equipped breastplate. */
function paintClassRegalia(c,r,{simple=false}={}) {
 if(!r)return;
 const {tier:t,family:f}=r,w=7+t*1.5;
 for(const side of [-1,1]){
  const x=side*w;
  if(f==='LIGHT')polygon(c,[[side*5,-24],[x,-27],[side*(w+3),-19],[side*7,-20]],r.metal);
  else if(f==='MAGE')polygon(c,[[side*4,-23],[x,-29-t],[side*(w+1),-20],[side*6,-17]],r.mantle);
  else if(f==='MEDIC')polygon(c,[[side*3,-24],[x,-23],[side*(w+1),-16],[side*5,-18]],r.cloth);
  else polygon(c,[[side*4,-24],[x,-26],[side*(w+2),-23],[side*(w+1),-18],[side*5,-20]],r.metal);
  if(t>=2)line(c,[[side*5,-22],[x,-23],[side*(w+1),-20]],r.light,1.2);
  if(t===3){
   if(f==='MEDIC'||f==='ARCHER'){
    for(let i=0;i<3;i++)polygon(c,[[x,-23+i*1.6],[side*(w+6-i),-26+i*3],[side*(w+3-i),-18+i*1.4]],r.light);
   }else polygon(c,[[x,-24],[side*(w+4),-29],[side*(w+3),-20],[x,-18]],r.light);
  }
 }
 // The chest mark leaves the plate's sides, material and workmanship visible.
 if(f==='MEDIC'){
  for(const side of [-1,1]){polygon(c,[[side*2,-23],[side*5,-22],[side*6,1],[side*2,-1]],r.cloth);line(c,[[side*3.5,-20],[side*4,-2]],r.metal,1);}
  line(c,[[-2,-17],[2,-17]],r.metal,1.5);line(c,[[0,-19],[0,-14]],r.metal,1.5);
 }else if(f==='MAGE'){
  line(c,[[-4,-21],[0,-15],[4,-21],[-4,-21]],r.metal,1);
  jewel(c,0,-18,1.5,r.gem);
 }else if(f==='ARCHER'){
  line(c,[[-3,-20],[-5,-17],[-3,-14]],r.light,1);line(c,[[-3,-20],[-3,-14]],r.metal,.7);line(c,[[-5,-17],[2,-17]],r.metal,1);
 }else if(f==='LIGHT'){
  line(c,[[-3,-21],[3,-15]],r.light,1.1);line(c,[[3,-21],[-3,-15]],r.metal,1.1);
 }else{
  polygon(c,[[-3,-21],[3,-21],[3,-17],[0,-14],[-3,-17]],r.metal);jewel(c,0,-18,1.4,r.gem);
 }
 if(simple)return;
 line(c,[[-5,-11],[5,-11]],r.metal,t===3?1.5:1);
 if(t>=2)for(const x of [-4,4])jewel(c,x,-12,1,r.gem);
 if(t===3){line(c,[[-5,-8],[0,-6],[5,-8]],r.light,1);jewel(c,0,-9,1.2,r.gem);}
}

/** A crest above the hair/helmet; the personal face remains unobstructed. */
export function drawClassHeadpiece(c,r,{x=0,y=0,scale=1,simple=false,helmet=false}={}) {
 if(!r)return;
 const {tier:t,family:f}=r;
 c.save();c.translate(x,y);c.scale(scale,scale);
 if(f==='MEDIC'){
  if(helmet){
   for(const side of [-1,1])polygon(c,[[side*5,-5],[side*6,-11],[side*3,-12-t],[side*3,-8]],r.cloth);
   line(c,[[0,-8],[0,-14-t]],r.metal,1.2);
  }else{
   polygon(c,[[-5,-5],[-4,-10-t],[0,-14-t],[4,-10-t],[5,-5]],r.cloth);
   line(c,[[-4,-6],[0,-8],[4,-6]],r.metal,1);line(c,[[0,-12-t],[0,-7]],r.metal,1);
  }
  if(t>=2)for(const side of [-1,1])polygon(c,[[side*4,-8],[side*(6+t),-12],[side*7,-5]],r.metal);
 }else if(f==='ARCHER'){
  line(c,[[-5,-5],[5,-5]],r.metal,1.5);
  for(let i=0;i<t;i++)polygon(c,[[4+i*.5,-5],[7+i,-10-i*2],[8+i,-7],[6+i,-3]],i%2?r.metal:r.light);
 }else if(f==='MAGE'){
  line(c,[[-6,-5],[-4,-8],[4,-8],[6,-5]],r.metal,1.2);
  jewel(c,0,-9-t,1.6+t*.3,r.gem);
  if(t>=2)for(const side of [-1,1])polygon(c,[[side*4,-7],[side*(6+t),-12-t],[side*7,-6]],r.metal);
  if(t===3)line(c,[[-3,-12],[0,-16],[3,-12]],r.light,1);
 }else if(f==='LIGHT'){
  line(c,[[-5,-5],[5,-5]],r.metal,1.3);
  for(let i=0;i<t;i++)polygon(c,[[-4-i,-5],[-7-i,-10-i*2],[-3-i,-8]],r.light);
 }else{
  const points=[[-6,-5],[-6,-8],[-4,-7],[-3,-10-t],[-1,-7],[0,-11-t],[1,-7],[3,-10-t],[4,-7],[6,-8],[6,-5]];
  polygon(c,points,f==='HEAVY'&&t===1?r.light:r.metal);
  if(t>=2)for(const side of [-1,1])polygon(c,[[side*5,-6],[side*(7+t),-9-t],[side*7,-4]],r.light);
 }
 if(!simple){jewel(c,0,f==='MEDIC'?-8:f==='MAGE'?-6:-5.5,1.1,r.gem);if(t===3)line(c,[[-4,-4],[4,-4]],r.light,.6);}
 c.restore();
}

/** Same dress on the close portrait; only the shoulders are widened with physique. */
export function drawClassPortraitDress(c,r) {
 if(!r)return;
 c.save();c.translate(0,31);c.scale(.55,1);
 drawClassMantle(c,r);drawClassRegalia(c,r);
 c.restore();
}
