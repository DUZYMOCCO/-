import {ECONOMIC_REGIONS} from './regional-economy.js?v=182';

const ellipse=(c,x,y,rx,ry,color)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();};
const shape=(c,p,color,edge=null)=>{c.fillStyle=color;c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();if(edge){c.strokeStyle=edge;c.lineWidth=.8;c.stroke();}};
const line=(c,p,color,width=1)=>{c.strokeStyle=color;c.lineWidth=width;c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();};
const wash=(c,x,y,w,h,top,bottom)=>{const g=c.createLinearGradient(x,y,x+w*.3,y+h);g.addColorStop(0,top);g.addColorStop(1,bottom);return g;};
function stonework(c,x,y,w,h,light,dark,seed=0){
  c.fillStyle=wash(c,x,y,w,h,light,dark);c.fillRect(x,y,w,h);
  c.save();c.beginPath();c.rect(x,y,w,h);c.clip();
  for(let row=0;row<h/8;row++){
    const yy=y+row*8;line(c,[[x,yy],[x+w,yy]],'#53584a70',.65);
    for(let col=0;col<w/13+1;col++){
      const xx=x+col*13-(row%2)*6;
      line(c,[[xx,yy],[xx,yy+8]],'#56594c80',.6);
      if((row*7+col*3+seed)%5===0){c.fillStyle='#ddd6b728';c.fillRect(xx+1,yy+1,11,5);}
      line(c,[[xx+1,yy+1],[xx+10,yy+1]],'#e0d7ba40',.6);
    }
  }c.restore();
}
function windowPane(c,x,y,w=8,h=11,stone=false){
  c.fillStyle='#343e35';c.fillRect(x-1,y-1,w+2,h+2);
  c.fillStyle=wash(c,x,y,w,h,'#788b82','#283d38');c.fillRect(x,y,w,h);
  line(c,[[x,y+h*.5],[x+w,y+h*.5],[x+w*.5,y+h*.5],[x+w*.5,y]],'#c1b58f',.7);
  line(c,[[x-1,y-1],[x+w+1,y-1],[x+w+1,y+h+1]],stone?'#ded3b3':'#b79969',1.1);
  c.fillStyle=stone?'#c5bba1':'#8f704b';c.fillRect(x-2,y+h+1,w+4,1.7);
}
function doorway(c,x,y,w,h,stone=false){
  c.fillStyle=stone?'#b8ad92':'#a28a63';c.fillRect(x-2,y-2,w+4,h+2);
  c.fillStyle='#27362e';c.fillRect(x,y,w,h);
  c.fillStyle=wash(c,x,y,w,h,'#716044','#3c3c2d');c.fillRect(x+1,y+1,w-2,h-1);
  for(let i=3;i<w;i+=3)line(c,[[x+i,y+2],[x+i,y+h]],'#aa906b55',.6);
  line(c,[[x+1,y+h*.3],[x+w-1,y+h*.3],[x+w-1,y+h*.78],[x+1,y+h*.78]],'#453d2c',1);
  ellipse(c,x+w-3,y+h*.55,.7,.7,'#cab680');
}
function roof(c,w,rh,color,seed=0){
  const warm=parseInt(color.slice(1,3),16)>parseInt(color.slice(3,5),16)+8;
  const points=[[-w/2-5,2],[0,-rh],[w/2+5,2]];
  shape(c,[[0,-rh],[10,-rh-6],[w/2+15,-4],[w/2+5,2]],warm?'#66543c':'#374c4a','#353e36');
  shape(c,points,wash(c,-w/2,-rh,w,rh,color,warm?'#62543e':'#414940'),'#363e34');
  c.save();c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.clip();
  for(let row=0;row<rh/4+1;row++){
    const yy=-rh+row*4;
    line(c,[[-w/2-4,yy],[w/2+4,yy]],row%2?(warm?'#51402d70':'#1e322e70'):'#c9ba9538',.8);
    for(let col=0;col<w/7;col++)if((row+col+seed)%3!==0){const xx=-w/2+col*7+(row%2)*3;line(c,[[xx,yy],[xx,yy+3.2]],warm?'#493e2d60':'#192f2c60',.6);}
  }c.restore();
  line(c,[[-w/2-5,2],[0,-rh],[w/2+5,2]],'#cfbea073',1.1);
  line(c,[[-w/2-5,3],[w/2+5,3]],'#3a4134',2.3);
  line(c,[[0,-rh],[10,-rh-6]],'#bdb798',1.4);
}
function tent(c,w,h,color){
  ellipse(c,4,h+2,w*.72,5,'#0f211b55');
  shape(c,[[-w/2,h],[0,-8],[w/2,h]],wash(c,-w/2,-8,w,h,color,'#4b5443'),'#343e32');
  shape(c,[[0,-8],[10,-13],[w/2+12,h-5],[w/2,h]],'#606b55','#354436');
  shape(c,[[-7,h],[0,1],[7,h]],'#273b2f');
  shape(c,[[-6,h],[-1,1],[-1,h]],'#a79c76');
  line(c,[[-w/2+3,h-1],[-2,-5],[w/2-3,h-1]],'#d0c29c88',.9);
  for(const side of [-1,1]){line(c,[[side*w*.3,h*.52],[side*(w*.6+8),h+4]],'#c7b893',.8);line(c,[[side*(w*.6+8),h+1],[side*(w*.6+8),h+7]],'#655340',1.6);}
  line(c,[[0,-13],[0,-8]],'#b19a71',1.4);
}
export function drawCampTent(c,color='#919476'){
  const fabric=color==='#1e3a8a'?'#7b8895':color==='#7c2d12'?'#9e7d60':color==='#14532d'?'#798969':color;
  c.save();c.translate(0,-32);tent(c,64,34,fabric);flag(c,0,-12,'#bea56d');c.restore();
}
function house(c,w,h,stage,seed,shop=false){
  const stone=stage>=2,royal=stage>=4;
  ellipse(c,8,h+4,w*.7,5,'#10211b55');
  shape(c,[[w/2,0],[w/2+10,-6],[w/2+10,h-6],[w/2,h]],stone?'#757f6c':'#514b39','#364235');
  if(stone)stonework(c,-w/2,0,w,h,royal?'#c6c6ad':'#acac91','#7a806b',seed);
  else{c.fillStyle=wash(c,-w/2,0,w,h,'#b49e74','#6b674b');c.fillRect(-w/2,0,w,h);for(let yy=4;yy<h;yy+=5)line(c,[[-w/2,yy],[w/2,yy]],'#54493266',.7);}
  c.fillStyle='#5c604e';c.fillRect(-w/2-2,h-2,w+14,4);line(c,[[-w/2-2,h-2],[w/2+10,h-2]],'#bab196',.8);
  if(stage<3){
    for(const xx of [-w/2+2,w/2-3,-2]){c.fillStyle='#64533a';c.fillRect(xx,0,2.3,h-1);}
    line(c,[[-w/2+3,1],[-3,h*.5],[-w/2+3,h-3]],'#786345',1.7);
    line(c,[[0,h*.5],[w/2-3,1]],'#786345',1.5);
  }
  const rh=14+stage*2+(seed%3)*2;
  if(stage>=3){c.fillStyle='#596657';c.fillRect(w/2-10,-rh-6,5,19);c.fillStyle='#b4b49b';c.fillRect(w/2-11,-rh-7,7,3);}
  const roofs=royal?['#658c86','#507977','#678c8c']:['#9c785a','#827455','#9b6d57'];
  roof(c,w,rh,roofs[seed%3],seed);
  doorway(c,4,h-19,10,19,stone);windowPane(c,-w/2+6,8,8,10,stone);
  if(stage>=3){windowPane(c,4,7,9,9,true);line(c,[[-w/2+2,21],[w/2-2,21]],'#d0c4a6',1.2);}
  if(shop){
    shape(c,[[-w/2-4,h-17],[w/2+2,h-17],[w/2+7,h-10],[-w/2-8,h-10]],seed%2?'#8b6154':'#a09062','#4d5140');
    for(let i=0;i<w/9;i++)shape(c,[[-w/2-3+i*9,h-16],[-w/2+1+i*9,h-16],[-w/2+2+i*9,h-10],[-w/2-5+i*9,h-10]],'#d7c59a66');
    c.fillStyle='#433f2c';c.fillRect(-w/2-7,h-10,w+12,2);
    line(c,[[-w/2-6,h-10],[-w/2-6,h+2]],'#7f6946',1.5);
    line(c,[[w/2+5,h-10],[w/2+5,h+2]],'#7f6946',1.5);
    c.fillStyle='#95774f';c.fillRect(-w/2,h-6,w*.42,6);
    for(let i=0;i<4;i++)ellipse(c,-w/2+3+i*4,h-7,1.8,1.6,i%2?'#a4ae76':'#c4a46f');
  }else if(stage>=4){c.fillStyle='#69817a';c.fillRect(-w/2+3,11,2,13);line(c,[[-w/2+2,10],[-w/2+6,10]],'#d8caaa',1);}
}
function flag(c,x,y,color,royal=false){
  line(c,[[x,y+24],[x,y-10]],'#a6a48b',1.3);ellipse(c,x,y-11,1.2,1.2,'#c9b779');
  shape(c,[[x+1,y-8],[x+17,y-6],[x+13,y+1],[x+1,y]],color);
  line(c,[[x+3,y-6],[x+3,y-1]],'#e4d5aa',1);
  if(royal){c.fillStyle='#d5bd77';c.fillRect(x+7,y-5,2,4);c.fillRect(x+5,y-3,6,1.4);}
}
function keep(c,level,urban){
  if(level===0){c.save();c.translate(0,-3);tent(c,56,26,'#b3a57b');flag(c,8,-21,'#917854');c.restore();return;}
  const royal=level>=4,w=royal?120:level>=3?84:level>=2?72:52,h=royal?74:level>=3?52:40;
  c.save();c.translate(0,-h/2);
  ellipse(c,7,h+5,w*.8,7,'#12221b66');
  if(royal){
    for(const side of [-1,1]){
      c.save();c.translate(side*(w/2+13),-28);stonework(c,-13,0,26,h+28,'#c5cbb5','#7c8877',side+level);
      shape(c,[[13,0],[20,-5],[20,h+23],[13,h+28]],'#687969');
      roof(c,28,level>=5?33:25,'#658a87');
      windowPane(c,-4,11,7,15,true);windowPane(c,-4,39,7,12,true);
      line(c,[[-14,h+25],[19,h+25]],'#d6cdb1',2);
      if(level>=5)flag(c,0,-38,'#547d81',true);c.restore();
    }
  }
  if(level>=5){
    c.save();c.translate(0,-73);stonework(c,-16,0,32,60,'#d1d1b8','#869b89');
    shape(c,[[16,0],[25,-6],[25,54],[16,60]],'#658273');roof(c,34,38,'#6e9492');
    windowPane(c,-4,9,8,15,true);line(c,[[-17,31],[24,31]],'#d9d3b5',2);
    ellipse(c,0,42,7,7,'#425e51');ellipse(c,0,42,5.5,5.5,'#c2c3a3');line(c,[[0,38],[0,42],[3,44]],'#496858',1);
    flag(c,0,-48,'#6b8d91',true);c.restore();
  }
  if(level>=2)stonework(c,-w/2,0,w,h,'#c3c2a8','#89957e',level);
  else{c.fillStyle=wash(c,-w/2,0,w,h,'#aa9063','#68664a');c.fillRect(-w/2,0,w,h);for(let y=5;y<h;y+=6)line(c,[[-w/2,y],[w/2,y]],'#554b3366',.8);for(const x of [-w/2+3,-9,9,w/2-5]){c.fillStyle='#63513a';c.fillRect(x,0,3,h);}}
  shape(c,[[w/2,0],[w/2+10,-6],[w/2+10,h-6],[w/2,h]],'#627462');
  roof(c,w,royal?38:level>=3?31:23,level>=3?'#658783':'#9a7953',level);
  if(level>=3&&level<5){
    c.save();c.translate(0,-26);stonework(c,-13,0,26,23,'#c7c9af','#82917c');roof(c,28,19,'#62857f');
    ellipse(c,0,12,6,6,'#444f40');ellipse(c,0,12,4.7,4.7,'#b8b89b');line(c,[[0,8],[0,12],[3,14]],'#405344',.8);c.restore();
  }
  doorway(c,-8,h-25,16,25,level>=2);
  for(const x of [-w/2+10,w/2-19]){windowPane(c,x,12,9,14,level>=2);if(royal){c.fillStyle='#648580';c.fillRect(x+1,29,7,15);shape(c,[[x+1,44],[x+8,44],[x+4.5,48]],'#648580');line(c,[[x+4.5,30],[x+4.5,40]],'#d9c69b',1);}}
  for(let i=0;i<3;i++){c.fillStyle=i%2?'#a6ad95':'#c3c5ac';c.fillRect(-13-i*4,h+i*2,26+i*8,2);}
  line(c,[[-w/2-1,h-1],[w/2+10,h-1]],'#d5cdb0',2);
  if(level<5&&urban>=4)flag(c,0,-58,'#6c8991',true);else if(level===1)flag(c,0,-32,'#9a7d52');
  c.restore();
}
function paving(c,x,y,w,h,stage){
  c.fillStyle=stage>=2?'#666e57':'#625f45';c.fillRect(x-3,y-3,w+6,h+6);
  c.fillStyle=wash(c,x,y,w,h,stage>=2?'#aaab91':'#867856',stage>=2?'#858e74':'#646349');c.fillRect(x,y,w,h);
  c.save();c.beginPath();c.rect(x,y,w,h);c.clip();
  for(let row=0;row<h/9;row++)for(let col=0;col<w/14+1;col++){
    const xx=x+col*14-(row%2)*7,yy=y+row*9;
    if(stage>=2){c.strokeStyle='#596a5960';c.lineWidth=.7;c.strokeRect(xx+.5,yy+.5,13,8);if((row+col*3)%5===0){c.fillStyle='#d1cbae30';c.fillRect(xx+1,yy+1,11,6);}}
    else if((row*3+col)%5===0){ellipse(c,xx+5,yy+4,1.3,.8,'#aea07a55');line(c,[[xx,yy+6],[xx+7,yy+6]],'#bba77722',.8);}
  }c.restore();
  line(c,[[x,y],[x+w,y]],'#d1c6a360',1);line(c,[[x,y+h],[x+w,y+h]],'#45554177',1);
}
function market(c,x,y,stage){
  c.save();c.translate(x,y);ellipse(c,6,21,49,7,'#10211b55');
  if(stage>=3){c.save();c.translate(0,-22);house(c,72,32,stage,6,true);c.restore();}
  else{
    c.fillStyle='#927348';c.fillRect(-36,1,72,16);shape(c,[[36,1],[43,-3],[43,13],[36,17]],'#655334');
    for(let i=0;i<8;i++)line(c,[[-35+i*9,2],[-35+i*9,15]],'#c5a47455',.8);
    for(const xx of [-36,36])line(c,[[xx,17],[xx,-19]],'#68583d',2);
    shape(c,[[-40,-12],[0,-23],[40,-12],[43,-5],[-43,-5]],'#a78f5d','#48523b');
    for(let i=0;i<8;i++)shape(c,[[-38+i*10,-12],[-32+i*10,-14],[-29+i*10,-5],[-36+i*10,-5]],'#d5c7a366');
    line(c,[[-43,-5],[43,-5]],'#dac99a',1.2);
    for(let i=0;i<6;i++){ellipse(c,-28+i*10,-1,4,3,i%2?'#a2ad77':'#c4a36b');ellipse(c,-27+i*10,-2,2,1,'#ddd0a255');}
  }
  for(const xx of [-46,46]){c.fillStyle='#796345';c.fillRect(xx-5,10,10,11);line(c,[[xx-5,12],[xx+5,12],[xx-5,19],[xx+5,19]],'#bd9c6c',.8);}
  c.restore();
}
function workshop(c,x,y,stage,production){
  c.save();c.translate(x,y);house(c,48,32,Math.max(1,stage),2);
  stonework(c,4,14,15,18,'#929983','#556a58',1);shape(c,[[7,32],[7,22],[10,18],[14,18],[17,22],[17,32]],'#293b31');
  c.fillStyle=production>=3?'#8aa9a9':'#b38952';c.fillRect(10,25,5,6);c.fillStyle='#d5bb82';c.fillRect(11,28,2,3);
  line(c,[[-11,31],[-11,20]],'#494e3b',2);shape(c,[[-19,19],[-4,19],[-7,23],[-15,23]],'#a4a891');
  if(production>=1){ellipse(c,-30,20,13,13,'#3e4d39');ellipse(c,-30,20,11,11,'#9a8056');ellipse(c,-30,20,8,8,'#455940');for(let i=0;i<8;i++){const a=i*Math.PI/4;line(c,[[-30,20],[-30+Math.cos(a)*10,20+Math.sin(a)*10]],'#bd9e6c',1.2);}ellipse(c,-30,20,2,2,'#5b6148');}
  if(production>=2){stonework(c,26,-30,12,61,'#a8b197','#6f806c');c.fillStyle='#4b5f4d';c.fillRect(24,-33,16,4);line(c,[[25,-33],[39,-33]],'#c7cbb0',1);}
  for(let i=0;i<3;i++){c.fillStyle='#777856';c.fillRect(-20+i*7,36,5,3);line(c,[[-19+i*7,36],[-16+i*7,36]],'#c5ba8b',.8);}c.restore();
}
function industry(c,radius,kind,stage){
  if(kind==='farm')for(let plot=0;plot<3;plot++){
    const x=radius+60,y=-70+plot*54;c.fillStyle='#4b4932';c.fillRect(x-2,y-2,104,44);c.fillStyle=wash(c,x,y,100,40,'#716447','#504b32');c.fillRect(x,y,100,40);
    for(let row=0;row<4;row++){line(c,[[x+3,y+6+row*9],[x+97,y+6+row*9]],'#b7976755',1);for(let col=0;col<11;col++){const xx=x+6+col*8,yy=y+6+row*9;line(c,[[xx,yy+3],[xx,yy-2]],stage>=2?'#c5b177':'#8b9e69',1);line(c,[[xx-2,yy-1],[xx,yy+1],[xx+2,yy-2]],'#a5ae78',.8);}}
  }
  if(kind==='mine'){
    const x=-radius-72,y=-36;ellipse(c,x,y+5,47,30,'#5d715d');shape(c,[[x-26,y+30],[x-27,y],[x-12,y-18],[x+15,y-17],[x+29,y],[x+28,y+30]],'#384e40','#72816a');
    shape(c,[[x-17,y+28],[x-17,y+3],[x-8,y-7],[x+9,y-7],[x+18,y+3],[x+18,y+28]],'#1d342b');
    for(const xx of [-20,19])line(c,[[x+xx,y+29],[x+xx,y]],'#aa8d5e',3);line(c,[[x-22,y],[x+22,y]],'#c2a26b',3);
    for(const xx of [-9,9])line(c,[[x+xx,y+12],[x+xx*2,y+46]],'#a9aaa0',1);for(let i=0;i<4;i++)line(c,[[x-13-i,y+16+i*7],[x+13+i,y+16+i*7]],'#785f43',1.5);
    for(let i=0;i<5;i++)shape(c,[[x-47+i*11,y+35],[x-43+i*11,y+28],[x-38+i*11,y+32],[x-36+i*11,y+39]],i%2?'#a6b6a3':'#81977e','#526d58');
  }
}
function paintQuarter(c,{stage,level,urban,production,kind,hq,interior,building}){
  c.lineCap='round';c.lineJoin='round';
  const count=Math.min(22,4+stage*3),radius=interior?220:140+stage*16;
  if(stage>=1||urban>=1){paving(c,-radius-80,-22,radius*2+160,44,stage);paving(c,-22,-radius-70,44,radius*2+140,stage);}
  if(stage>=3){ellipse(c,0,0,72,43,'#78886e');ellipse(c,0,-2,67,39,'#a1ab90');for(let i=0;i<8;i++)line(c,[[-58+i*16,-25],[-58+i*16,25]],'#74846b66',.7);}
  const buildings=[];
  for(let i=0;i<count;i++){const a=i/count*Math.PI*2,rr=radius*(stage>=2?.9+(i%3)*.05:1);buildings.push({i,x:Math.cos(a)*rr,y:Math.sin(a)*rr});}
  if(stage>=4)for(const side of [-1,1])for(const row of [-1,1])buildings.push({i:20+side+row,x:side*radius*.6,y:row*radius*.39});
  buildings.sort((a,b)=>a.y-b.y);
  for(const {i,x,y} of buildings){c.save();c.translate(x,y);if(stage===0&&hq)tent(c,36,24,i%2?'#8c9575':'#aa9f77');else house(c,stage>=3?46+i%3*4:36,24+stage*4+(stage>=3?i%3*4:0),stage,i,stage>=3&&i%4===1);c.restore();}
  if(stage>=1)market(c,-radius*.6,radius*.7,stage);
  workshop(c,radius*.75,-radius*.7,stage,production);industry(c,radius,kind,stage);
  if(stage>=3||urban>=3){
    const yy=radius*.65;ellipse(c,0,yy+3,24,12,'#526b59');ellipse(c,0,yy,23,11,'#bfc3a5');ellipse(c,0,yy-1,17,7,'#435f58');ellipse(c,0,yy-2,14,5,'#7b9b98');
    line(c,[[-11,yy-3],[-2,yy-4],[8,yy-3]],'#bfd0c255',.9);stonework(c,-3,yy-16,6,11,'#c7c7ab','#859783');ellipse(c,0,yy-16,8,3,'#bbc4ac');
    for(const xx of [-radius*.85,radius*.85]){line(c,[[xx,20],[xx,-13]],'#53644e',2);c.fillStyle='#b5b898';c.fillRect(xx-4,-15,8,10);c.fillStyle='#c9b987';c.fillRect(xx-2,-13,4,6);shape(c,[[xx-6,-15],[xx,-20],[xx+6,-15]],'#576f60');}
  }
  if(building){
    const x=-radius*.8,y=-radius*.75;c.save();c.translate(x,y);c.fillStyle='#6c6a4b';c.fillRect(-22,0,44,25);
    for(const xx of [-24,0,24])line(c,[[xx,28],[xx,-20]],'#c0a272',2);for(const yy of [-18,4,27])line(c,[[-25,yy],[25,yy]],'#ac8b5f',2);line(c,[[-24,-18],[24,27],[24,-18],[-24,27]],'#6b6145',1.3);
    for(let i=0;i<4;i++){c.fillStyle=i%2?'#b79b6b':'#8c754e';c.fillRect(-35,30+i*2,27,1.5);}c.restore();
  }
  if(hq)keep(c,Math.min(5,level),urban);
}

// Two static quarters at 2x resolution: at most 17.5 MiB. Release evicted
// pixels immediately, matching the terrain/head caches on mobile browsers.
const QUARTERS=new Map(),WIDTH=840,HEIGHT=680,LIMIT=2;
export function clearSettlementArt(){for(const art of QUARTERS.values())art.width=art.height=1;QUARTERS.clear();}
export function drawSettlementQuarter(c,game,x,y,id='hq',interior=false){
  const e=game.nation?.economy,r=e?.regions?.[id],level=Math.max(r?.level||0,id==='hq'?game.nation?.level||0:0);
  const urban=Math.min(10,e?.technology?.urban?.level||0),production=Math.min(3,e?.technology?.production?.level||0);
  const options={stage:Math.min(5,level+Math.floor(urban/2)),level:Math.min(5,level),urban,production,kind:ECONOMIC_REGIONS.find(d=>d.id===id)?.industry,hq:id==='hq',interior,building:!!r?.investment};
  c.save();c.translate(x,y);
  if(typeof c.canvas?.width!=='number'||typeof document==='undefined'||!document.createElement){paintQuarter(c,options);c.restore();return;}
  const density=(game.zoom||1)*Math.min(2,typeof window==='undefined'?1:window.devicePixelRatio||1);
  const resolution=density>1.6?2:density>1.1?1.5:1;
  const key=JSON.stringify([options,resolution]);let art=QUARTERS.get(key);
  try{if(art?.getContext('2d')?.isContextLost?.()){art.width=art.height=1;QUARTERS.delete(key);art=null;}}catch{if(art){art.width=art.height=1;QUARTERS.delete(key);}art=null;}
  if(!art){
    art=document.createElement('canvas');art.width=WIDTH*resolution;art.height=HEIGHT*resolution;const b=art.getContext('2d');
    if(!b||typeof b.canvas?.width!=='number'){art.width=art.height=1;paintQuarter(c,options);c.restore();return;}
    b.scale(resolution,resolution);b.translate(WIDTH/2,HEIGHT/2);paintQuarter(b,options);
    if(QUARTERS.size>=LIMIT){const oldest=QUARTERS.keys().next().value,retired=QUARTERS.get(oldest);retired.width=retired.height=1;QUARTERS.delete(oldest);}
    QUARTERS.set(key,art);
  }else{QUARTERS.delete(key);QUARTERS.set(key,art);}
  try{c.drawImage(art,-WIDTH/2,-HEIGHT/2,WIDTH,HEIGHT);}catch{art.width=art.height=1;QUARTERS.delete(key);paintQuarter(c,options);}
  c.restore();
}
