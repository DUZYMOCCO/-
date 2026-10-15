// Daylight leaves the fixtures visible; the night pass adds their emitted light.
import {WORLD_SIZE,TAVERN_SITE} from './world.js?v=281';
import {HQ_FACILITY_LAYOUT} from './hq-facility-layout.js?v=201';
import {TAVERN_TABLES,GARDEN_TABLES} from './camp-leisure.js?v=277';
import {circleInView} from './render-support.js';

const TAU=Math.PI*2;
/** Light on architecture and ground; the visible neon tubes still draw in the night pass. */
export function nightlifeLightSources(game,strength){
  if(strength<=0||game.currentDungeon)return [];
  const C=WORLD_SIZE/2,p=HQ_FACILITY_LAYOUT.find(p=>p.id==='casino'),t=TAVERN_SITE;
  const lights=[
    {id:'casino-front',x:C+p.x,y:C+p.y-45,radius:145,power:.82*strength},
    {id:'tavern-west',x:t.x-85,y:t.y-65,radius:130,power:.78*strength},
    {id:'tavern-east',x:t.x+108,y:t.y-65,radius:130,power:.78*strength},
    {id:'tavern-door',x:t.x,y:t.y-10,radius:105,power:.7*strength},
  ];
  for(const [i,s]of [...TAVERN_TABLES,...GARDEN_TABLES].entries())lights.push({id:`tavern-candle-${i}`,x:s.x,y:s.y-10,radius:48,power:.62*strength});
  return lights;
}

const glow=(c,x,y,r,rgb,alpha)=>{
  const g=c.createRadialGradient(x,y,0,x,y,r);
  g.addColorStop(0,`rgba(${rgb},${alpha})`);
  g.addColorStop(.4,`rgba(${rgb},${alpha*.35})`);
  g.addColorStop(1,`rgba(${rgb},0)`);
  c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);
};
const tube=(c,color,width,blur,draw)=>{
  c.strokeStyle=color;c.fillStyle=color;c.lineWidth=width;
  c.shadowColor=color;c.shadowBlur=blur;draw();c.shadowBlur=0;
};
const dot=(c,x,y,r,color,blur=0)=>{
  c.fillStyle=color;c.shadowColor=color;c.shadowBlur=blur;
  c.beginPath();c.arc(x,y,r,0,TAU);c.fill();c.shadowBlur=0;
};

/** Building-local coordinates. lightPass restores the neon after atmosphere shading. */
export function drawCasinoSign(c,w,h,now=0,strength=0,lightPass=false){
  if(lightPass&&strength<=0)return;
  c.save();
  try{
    const alpha=c.globalAlpha,top=-h+5,left=-w/2+1,bw=w-2,bh=46,lit=lightPass;
    if(lit)c.globalAlpha=alpha*strength;
    if(!lit){
      c.fillStyle='#211c32';c.fillRect(left-3,top-3,bw+6,bh+6);
      c.fillStyle='#0e1727';c.fillRect(left,top,bw,bh);
      c.strokeStyle='#806752';c.lineWidth=2;c.strokeRect(left-3,top-3,bw+6,bh+6);
    }
    tube(c,lit?'#58f6ff':'#33838c',1.8,lit?9:0,()=>c.strokeRect(left+5,top+5,bw-10,bh-10));
    // The word stays steady while the perimeter highlight travels slowly.
    c.font='900 24px sans-serif';c.textAlign='center';c.textBaseline='middle';
    tube(c,lit?'#ff72d7':'#d36da9',1,lit?13:0,()=>c.fillText('CASINO',0,top+19));
    if(lit){c.fillStyle='#ffe5f7';c.fillText('CASINO',0,top+19);}
    c.font='bold 8px sans-serif';c.fillStyle=lit?'#ffe5a2':'#b7a179';c.fillText('POKER  •  SLOTS',0,top+35);
    const chase=now*.0025;
    for(let i=0;i<26;i++){
      const horizontal=i<20,j=horizontal?i%10:i%3;
      const x=horizontal?left+9+j*(bw-18)/9:(i<23?left+1:left+bw-1);
      const y=horizontal?(i<10?top+1:top+bh-1):top+12+j*11;
      if(lit)c.globalAlpha=alpha*strength*(.65+.35*Math.sin(chase-i*.65));
      dot(c,x,y,lit?1.9:1.4,lit?'#ffdc75':'#9b804a',lit?6:0);
    }
    if(lit)c.globalAlpha=alpha*strength;
    tube(c,lit?'#61f5ff':'#3f777e',2,lit?8:0,()=>{
      c.beginPath();c.moveTo(-w/2-8,-h+1);c.lineTo(0,-h-32);c.lineTo(w/2+8,-h+1);c.stroke();
    });
    tube(c,lit?'#ff82d3':'#955c83',1.8,lit?7:0,()=>{
      for(const x of [-w/2+5,w/2-6]){c.beginPath();c.moveTo(x,-52);c.lineTo(x,-8);c.stroke();}
    });
    c.font='bold 9px sans-serif';c.fillStyle=lit?'#81ffdf':'#559482';
    c.shadowColor='#55ffd8';c.shadowBlur=lit?7:0;c.fillText('OPEN',0,-39);
  }finally{c.restore();}
}

const strings=[{y:-132,sag:12,half:168,count:23},{y:-43,sag:18,half:190,count:23}];
/** Eaves, terrace bulbs and door lanterns in tavern-local coordinates. */
export function drawTavernFixtures(c,now=0,strength=0,lightPass=false){
  if(lightPass&&strength<=0)return;
  c.save();
  try{
    const alpha=c.globalAlpha;
    if(lightPass)c.globalAlpha=alpha*strength;
    if(!lightPass){
      c.fillStyle='#5b4931';for(const x of [-190,190])c.fillRect(x-2,-51,4,115);
      c.strokeStyle='#3d3328';c.lineWidth=1.3;
      for(const s of strings){c.beginPath();c.moveTo(-s.half,s.y);c.quadraticCurveTo(0,s.y+s.sag*2,s.half,s.y);c.stroke();}
    }
    for(const [row,s]of strings.entries())for(let i=0;i<s.count;i++){
      const t=i/(s.count-1),x=(t*2-1)*s.half,y=s.y+4*s.sag*t*(1-t);
      const color=i%7===2?'#ffac77':i%7===5?'#aee9cd':'#ffe6aa';
      if(!lightPass){c.fillStyle='#4a3825';c.fillRect(x-1.5,y-1,3,5);}
      else c.globalAlpha=alpha*strength*(.88+.12*Math.sin(now*.0018+i*.7+row));
      dot(c,x,y+5,lightPass?2.7:2,lightPass?color:'#b29565',lightPass?8:0);
    }
    if(lightPass)c.globalAlpha=alpha*strength;
    for(const x of [-40,40]){
      if(!lightPass){
        c.strokeStyle='#362c20';c.lineWidth=2;c.beginPath();c.moveTo(x,-82);c.lineTo(x,-65);c.stroke();
        c.fillStyle='#3c3021';c.fillRect(x-8,-66,16,24);
      }
      tube(c,lightPass?'#ffce77':'#a08a57',1,lightPass?12:0,()=>c.fillRect(x-5,-62,10,16));
      if(!lightPass){c.fillStyle='#5c4529';c.fillRect(x-8,-67,16,3);c.fillRect(x-8,-44,16,3);}
    }
    if(lightPass){
      for(const wx of [-120,-75,95,130]){
        tube(c,'#ffd593',1,10,()=>c.fillRect(wx-10,-108,20,24));
      }
      tube(c,'#ffe0a1',1.5,8,()=>c.strokeRect(-68,-176,136,26));
      c.font='bold 18px sans-serif';c.textAlign='center';c.textBaseline='middle';
      tube(c,'#ffe7b5',1,6,()=>c.fillText('大酒場',0,-163));
    }
  }finally{c.restore();}
}

export function drawTavernCandles(c){
  c.save();c.fillStyle='#e6c992';
  for(const t of [...TAVERN_TABLES,...GARDEN_TABLES]){
    c.fillRect(t.x-2,t.y-18,4,7);c.fillStyle='#9a7d4b';c.fillRect(t.x-4,t.y-11,8,2);c.fillStyle='#e6c992';
  }
  c.restore();
}

/** Within the screen-blended night pass, before unexplored fog; only visible fixtures draw. */
export function drawNightlifeLights(c,game,now,strength,view){
  if(strength<=0||game.currentDungeon)return;
  const center=WORLD_SIZE/2,p=HQ_FACILITY_LAYOUT.find(p=>p.id==='casino'),x=center+p.x,y=center+p.y;
  if((game.nation?.level||0)>=p.level&&circleInView(x,y-65,210,view)){
    c.save();
    try{
      c.translate(x,y);
      glow(c,-35,-80,125,'255,65,181',.21*strength);
      glow(c,46,-64,110,'52,203,255',.18*strength);
      c.save();c.scale(1,.35);glow(c,0,45,125,'213,112,225',.19*strength);c.restore();
      drawCasinoSign(c,p.w,p.h,now,strength,true);
    }finally{c.restore();}
  }
  const t=TAVERN_SITE;
  if(circleInView(t.x,t.y-30,330,view)){
    c.save();
    try{
      c.translate(t.x,t.y);
      glow(c,-85,-89,125,'255,175,77',.22*strength);
      glow(c,108,-89,125,'255,186,91',.22*strength);
      glow(c,0,-30,95,'255,180,74',.19*strength);
      drawTavernFixtures(c,now,strength,true);
    }finally{c.restore();}
  }
  for(const [i,table]of [...TAVERN_TABLES,...GARDEN_TABLES].entries()){
    if(!circleInView(table.x,table.y,46,view))continue;
    const pulse=.9+.1*Math.sin(now*.004+i*2);
    glow(c,table.x,table.y-10,43,'255,186,91',.14*strength*pulse);
    c.save();c.globalAlpha*=strength;
    dot(c,table.x,table.y-19,1.6,'#fff1bd',7);c.restore();
  }
}
