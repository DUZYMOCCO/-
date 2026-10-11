/** Field loot art — v177. Material and manufacturing stage come from the real equipment tier. */
import { materialTier, generation, tierNumber } from './equipment-tiers.js?v=177';

const PALETTES = [
  { body:'#795538', dark:'#463326', lid:'#a17c51', edge:'#392b24', trim:'#bb9871', light:'#d5b68b' },
  { body:'#6d5140', dark:'#42382d', lid:'#8d7051', edge:'#342c24', trim:'#ae8b54', light:'#d6b97d' },
  { body:'#525b60', dark:'#323b40', lid:'#8c999f', edge:'#293338', trim:'#a5acaa', light:'#d0d5cf' },
  { body:'#627780', dark:'#36464e', lid:'#a8bac2', edge:'#293940', trim:'#becbd0', light:'#e5e8dc' },
  { body:'#58878b', dark:'#2e515b', lid:'#a7c4c7', edge:'#294650', trim:'#d0d5ba', light:'#edf0dd' },
  { body:'#43474c', dark:'#272d33', lid:'#6b7277', edge:'#20292e', trim:'#b39161', light:'#dec797' },
  { body:'#bbae80', dark:'#605a47', lid:'#e4ddbb', edge:'#635844', trim:'#cfa653', light:'#fff2cc' }
];

function polygon(c, points, fill, stroke, width=.75) {
  c.beginPath();c.moveTo(points[0][0],points[0][1]);
  for(let i=1;i<points.length;i++)c.lineTo(points[i][0],points[i][1]);
  c.closePath();if(fill){c.fillStyle=fill;c.fill();}
  if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}
}
function line(c, points, color, width=.7) {
  c.beginPath();c.moveTo(points[0][0],points[0][1]);
  for(let i=1;i<points.length;i++)c.lineTo(points[i][0],points[i][1]);
  c.strokeStyle=color;c.lineWidth=width;c.stroke();
}
function dot(c,x,y,r,color) {c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}
function shadow(c,w=11) {c.fillStyle='rgba(15,20,22,.34)';c.beginPath();c.ellipse(0,7.7,w,2.5,0,0,Math.PI*2);c.fill();}

function jewel(c,x,y,r,color,light='#e9efe3') {
  polygon(c,[[x,y-r],[x+r*.7,y],[x,y+r],[x-r*.7,y]],color,'#344e55',.5);
  polygon(c,[[x,y-r],[x,y+r*.2],[x-r*.7,y]],light);
  line(c,[[x,y-r],[x+r*.7,y],[x,y+r]],color,.6);
}
function bossSeal(c,y,p) {
  polygon(c,[[-3,y-2.5],[0,y-3.8],[3,y-2.5],[2.6,y+1],[0,y+3],[-2.6,y+1]],p.trim,p.edge,.6);
  polygon(c,[[-1.8,y-.2],[-2,y-1.7],[-.7,y-.8],[0,y-2],[.7,y-.8],[2,y-1.7],[1.8,y-.2]],p.light);
  line(c,[[-1.4,y+1],[1.4,y+1]],p.dark,.65);
}

/** Draw a chest centered on world x/y. Drawing never alters loot or equipment data. */
export function drawTreasureChest(c,x,y,tier,now,{boss=false,opened=false,locked=false}={}) {
  const t=tierNumber(tier),m=materialTier(t),g=generation(t),p=PALETTES[m-1];
  const w=8.5+(m-1)*.4,top=-8.3-Math.min(2,(m-1)*.35);
  c.save();c.translate(x,y);c.shadowBlur=0;c.lineJoin='round';c.lineCap='round';
  shadow(c,w+1.5);

  // Feet evolve from wooden blocks into broad metal shoes, dragon claws and a stepped plinth.
  c.fillStyle=p.dark;c.fillRect(-w+.5,5.1,3,2.2);c.fillRect(w-3.5,5.1,3,2.2);
  if(m>=4){
    polygon(c,[[-w-.6,5],[-w+3.7,5],[-w+3,7.8],[-w-.8,7.8]],p.trim,p.edge,.5);
    polygon(c,[[w-3.7,5],[w+.6,5],[w+.8,7.8],[w-3,7.8]],p.trim,p.edge,.5);
  }
  if(m===6){for(const sign of [-1,1])polygon(c,[[sign*(w-2),5.4],[sign*(w+1),6.7],[sign*w,8],[sign*(w-3),7]],p.trim,p.edge,.5);}
  if(m===7)polygon(c,[[-w-1,5],[w+1,5],[w+1.5,7],[-w-1.5,7]],p.trim,p.edge,.6);

  // Front, narrow right face and inset floor make the box readable without a glowing outline.
  polygon(c,[[-w,-2.5],[w,-2.5],[w,5.7],[-w,5.7]],p.body,p.edge,.85);
  polygon(c,[[w,-2.5],[w+2,-5.4],[w+2,3.6],[w,5.7]],p.dark,p.edge,.65);
  if(m<=2){
    for(const yLine of [0,2.7])line(c,[[-w+.8,yLine],[w-.8,yLine+.2]],p.dark,.6);
    if(m===1){line(c,[[-w+1.4,1.6],[-w+4.5,1.4],[-w+5.6,1.8]],p.lid,.55);line(c,[[3,4],[6.2,3.8]],p.lid,.55);}
    else line(c,[[-w+1,-1.2],[-w+1,4.5],[w-1,4.5],[w-1,-1.2]],'#ad9470',.6);
  } else {
    polygon(c,[[-w+2,-1],[w-2,-1],[w-2,4.3],[-w+2,4.3]],m===7?'#ddd3af':p.dark,p.trim,.45);
    if(m===4)line(c,[[-w+3,3.3],[w-3,3.3]],p.body,.8);
    if(m===5)for(const sign of [-1,1])line(c,[[sign*3,3.7],[sign*6,1],[sign*4.6,-.2]],p.light,.55);
    if(m===6)for(const row of [0,2.2])for(const xx of [-6,-2,2,6])polygon(c,[[xx-1.7,row],[xx+1.7,row],[xx,row+2]],p.lid,p.trim,.4);
    if(m===7)for(const sign of [-1,1])line(c,[[sign*3.5,3.3],[sign*6.5,3.3],[sign*7.5,1],[sign*5,-.4]],p.trim,.7);
  }

  // The material determines the lid silhouette, while opened chests retain their own material.
  if(opened){
    polygon(c,[[-w,-2.6],[-w+2,-5.7],[w+2,-5.7],[w,-2.6]],'#202a2b',p.trim,.7);
    polygon(c,[[-w+1,-6],[-w+1,top-5],[w+1,top-5],[w+1,-6]],p.lid,p.edge,.8);
    line(c,[[-w+2,top-4],[w,top-4]],p.light,.7);
    for(const xx of [-4,-1,2,5])dot(c,xx,-3.7,1.1,m>=5?'#d9d8b2':'#bd9c5f');
    if(m>=5)jewel(c,0,-5,2,'#79b9bb');
  } else {
    const ridge=m<=2?[[w,top+1.8],[w-2,top],[-w+2,top],[-w,top+1.8]]:
      m===6?[[w,top+1],[w-2,top-1],[3,top],[0,top-1.6],[-3,top],[-w+2,top-1],[-w,top+1]]:
      [[w,top+1.2],[w-1.7,top],[-w+1.7,top],[-w,top+1.2]];
    polygon(c,[[-w,-2.6],[w,-2.6],...ridge],p.lid,p.edge,.85);
    polygon(c,[[w,-2.6],[w+2,-5.4],[w+2,top-1],[w,top+1.2]],p.body,p.edge,.6);
    line(c,[[-w+1,top+2],[w-1,top+2]],p.light,.65);
    if(m===1)for(const xx of [-4.5,1.7])line(c,[[xx,top+.5],[xx,-3]],p.dark,.65);
    if(m===2)for(const xx of [-6,-2,2,6])line(c,[[xx,top+3],[xx+.8,top+2.4]],p.dark,.5);
  }

  // Bronze straps, iron bands, steel corner braces and inlaid high-material caps.
  if(m>=2)for(const sign of [-1,1]){
    const bx=sign*(w-3);
    polygon(c,[[bx-1,opened?-6:top+.7],[bx+1,opened?-6:top+.7],[bx+1,5.2],[bx-1,5.2]],p.trim,p.edge,.4);
    line(c,[[bx-.5,opened?-5:top+1.3],[bx-.5,4.6]],p.light,.5);
  }
  if(m>=4)for(const sign of [-1,1]){
    polygon(c,[[sign*w,-2.2],[sign*(w-3.2),-2.2],[sign*(w-3.2),-.8],[sign*(w-1.2),-.8],[sign*(w-1.2),2],[sign*w,2]],p.trim,p.edge,.45);
    if(m>=5)jewel(c,sign*(w-1.2),-1.4,1.2,m===6?'#a6674d':'#6ca9b1',p.light);
  }

  // Every manufacturing generation adds physical work rather than only changing a color.
  if(g>=2)for(const xx of [-w+1.4,w-1.4])for(const yy of [-1.2,4.5]){dot(c,xx,yy,.7,p.dark);dot(c,xx-.15,yy-.2,.38,p.light);}
  if(g>=3){
    line(c,[[-w,-.8],[-w+2.4,-.8],[-w+2.4,2.8]],p.trim,1.2);
    line(c,[[w,-.8],[w-2.4,-.8],[w-2.4,2.8]],p.trim,1.2);
    line(c,[[-w+1,5],[w-1,5]],p.light,.65);
  }
  if(g===4){
    polygon(c,[[-w-.3,4.3],[w+.3,4.3],[w+.3,5.8],[-w-.3,5.8]],p.trim,p.edge,.4);
    for(const xx of [-4.5,4.5])line(c,[[xx,-.3],[xx-1,1],[xx,2.3],[xx+1,1],[xx,-.3]],p.light,.65);
    if(!opened)line(c,[[-4,top+2.6],[0,top+1.6],[4,top+2.6]],p.trim,.8);
  }

  if(boss)bossSeal(c,1,p);
  else if(!opened){
    polygon(c,[[-1.8,-3.4],[1.8,-3.4],[2.2,.3],[0,2],[-2.2,.3]],p.trim,p.edge,.6);
    if(m>=5)jewel(c,0,-1,1.5,m===6?'#b58053':'#74b4b8',p.light);
    else{dot(c,0,-.6,.7,p.dark);c.fillStyle=p.dark;c.fillRect(-.35,-.2,.7,1.3);}
  }
  if(locked&&!opened){
    c.strokeStyle=p.light;c.lineWidth=.85;c.beginPath();c.arc(0,-2.8,1.6,Math.PI,0);c.stroke();
    polygon(c,[[-2.1,-2.6],[2.1,-2.6],[2.1,1],[-2.1,1]],p.trim,p.edge,.7);dot(c,0,-1,.55,p.dark);
  }
  if(boss)for(const sign of [-1,1])line(c,[[sign*(w-1),top+1],[sign*(w+1.2),top-.8],[sign*(w+1.2),top+2]],p.trim,1);
  if(m===7&&!opened){
    const yy=top+.4;
    polygon(c,[[-4.8,yy],[-5.4,yy-3.6],[-2.8,yy-1.8],[0,yy-5],[2.8,yy-1.8],[5.4,yy-3.6],[4.8,yy]],p.trim,p.edge,.65);
    line(c,[[-4.3,yy-.7],[4.3,yy-.7]],p.light,.6);jewel(c,0,yy-2,1.1,'#82b5bb',p.light);
    if(g>=3)for(const xx of [-4,4])dot(c,xx,yy-2.1,.65,p.light);
  }
  c.restore();
}

function crystal(c,x,y,w,h,color,light,dark) {
  polygon(c,[[x,y-h],[x+w,y-h*.53],[x+w*.7,y+h*.36],[x-w*.65,y+h*.4],[x-w,y-h*.48]],color,'#524b65',.65);
  polygon(c,[[x,y-h],[x,y+h*.31],[x-w*.65,y+h*.4],[x-w,y-h*.48]],dark);
  polygon(c,[[x,y-h],[x+w,y-h*.53],[x,y-h*.3]],light);
  line(c,[[x,y-h],[x,y+h*.31],[x+w*.7,y+h*.36]],light,.6);
}
function magicStones(c,now) {
  shadow(c,11);const bob=Math.sin(now*.003)*.6;
  crystal(c,-6,1,3.3,9,'#8b80a6','#d9d5e8','#625b7f');
  crystal(c,6,2,3.7,10,'#998bb4','#e5dced','#716385');
  crystal(c,0,-1+bob,4.3,13,'#ac9bc5','#f0e7f4','#80708f');
  polygon(c,[[-7.5,5.7],[-5,4.5],[-4.7,7.3],[-7.5,7.3]],'#b4a7ca','#6b627f',.5);
  line(c,[[-1.3,-6+bob],[0,-7.4+bob],[1.3,-6+bob],[0,-4.7+bob],[-1.3,-6+bob]],'#f2e9f3',.75);
  line(c,[[0,-9+bob],[0,-10.3+bob]],'#e4d8ec',.75);
}
function ammunition(c) {
  shadow(c,11);
  polygon(c,[[-9,-6],[-7,-11],[10,-11],[9,-6]],'#797652','#3d4032',.8);
  line(c,[[-6,-9.6],[8,-9.6]],'#b1a47c',.7);
  polygon(c,[[-9,-4],[9,-4],[11,-7],[-7,-7]],'#363c32','#aa9b73',.6);
  for(const [xx,tip] of [[-5,-14],[-1.5,-12],[2,-15]]){
    line(c,[[xx,-3],[xx,tip]],'#bfa979',.85);
    polygon(c,[[xx,tip-1],[xx-1.4,tip+1.9],[xx+1.4,tip+1.9]],'#b7c7c5','#465854',.45);
    line(c,[[xx-1,-4.8],[xx+1,-5.9]],'#ddd0a4',.7);
  }
  for(const xx of [5.1,7.6]){
    c.fillStyle='#a78b56';c.fillRect(xx-1,-8.6,2,5);dot(c,xx,-8.6,1,'#d0b67d');
    line(c,[[xx-.6,-7.5],[xx-.6,-4.5]],'#dec899',.45);
  }
  polygon(c,[[-9,-3.5],[9,-3.5],[9,6],[-9,6]],'#777651','#3d4234',.85);
  polygon(c,[[9,-3.5],[11,-6.6],[11,3.5],[9,6]],'#555d42','#3d4234',.6);
  for(const yy of [-.6,2.3])line(c,[[-8,yy],[8,yy]],'#4f5940',.6);
  for(const xx of [-6.2,6.2]){c.fillStyle='#ad9e73';c.fillRect(xx-.7,-3.5,1.4,9);dot(c,xx,-2,.55,'#e0cca0');}
  line(c,[[10,-2.5],[12,-2.5],[12,1.3],[10,1.3]],'#c1b48a',1);
  polygon(c,[[-2.7,.2],[-1.2,-1.1],[1.2,-1.1],[2.7,.2],[1.7,3],[-1.7,3]],'#c8b68a','#424735',.55);
  dot(c,0,.9,1,'#505b49');
}
function awakeningOrb(c,now) {
  shadow(c,9);const bob=Math.sin(now*.004)*1.3,yy=-4+bob;
  c.strokeStyle='#b59a5c';c.lineWidth=.9;c.beginPath();c.ellipse(0,yy,9.3,8.5,-.35,0,Math.PI*2);c.stroke();
  const light=c.createRadialGradient(-2.4,yy-2.8,.2,0,yy,6.6);
  light.addColorStop(0,'#fff7d7');light.addColorStop(.35,'#efd18b');light.addColorStop(1,'#a77c35');
  dot(c,0,yy,6.6,light);line(c,[[-1.8,yy+3],[-1.8,yy-2],[0,yy-4],[1.8,yy-2],[1.8,yy+3]],'#8e7038',.6);
  line(c,[[-3,yy+.6],[0,yy+2.3],[3,yy+.6]],'#fff3ca',.65);
  for(const sign of [-1,1])polygon(c,[[sign*7.5,yy+6],[sign*10,yy+3],[sign*8.5,yy+2.6]],'#ccb16e');
}
function awakeningGem(c,now) {
  shadow(c,10);const yy=-4+Math.sin(now*.003)*.7;
  polygon(c,[[-5,6],[5,6],[3.5,8],[-3.5,8]],'#b49a62','#655638',.6);
  line(c,[[-6,4],[-8,yy],[-5,yy-7],[0,yy-10],[5,yy-7],[8,yy],[6,4]],'#c4ac72',1);
  polygon(c,[[0,yy-8],[5.8,yy-3],[4.6,yy+4],[0,yy+7],[-4.6,yy+4],[-5.8,yy-3]],'#79aeb9','#436571',.75);
  polygon(c,[[0,yy-8],[0,yy],[5.8,yy-3]],'#eff6ee');
  polygon(c,[[0,yy-8],[-5.8,yy-3],[0,yy]],'#b7d7d7');
  polygon(c,[[0,yy],[-4.6,yy+4],[0,yy+7]],'#547c94');
  line(c,[[-5.8,yy-3],[0,yy],[5.8,yy-3]],'#d9e9df',.65);
  line(c,[[0,yy-8],[0,yy+7]],'#cee1d7',.65);dot(c,0,yy-10,1,'#ead4a2');
}

/** Existing drawChest-compatible world coordinates, with resource-specific silhouettes. */
export function drawLootDrop(c,drop,now=0) {
  if(!c||!drop)return;
  const x=Number(drop.x)||0,y=Number(drop.y)||0,time=Number.isFinite(now)?now:0,item=drop.item;
  if(!drop.isMagicStone&&!drop.isAmmo&&!drop.isOrb&&!drop.isGem&&item?.type!=='GEM'&&!item?.isGem){
    drawTreasureChest(c,x,y,item?.tier||1,time,{boss:!!drop.isBoss});return;
  }
  c.save();c.translate(x,y);c.shadowBlur=0;c.lineJoin='round';c.lineCap='round';
  if(drop.isMagicStone)magicStones(c,time);
  else if(drop.isAmmo)ammunition(c);
  else if(drop.isGem||item?.type==='GEM'||item?.isGem)awakeningGem(c,time);
  else awakeningOrb(c,time);
  c.restore();
}
