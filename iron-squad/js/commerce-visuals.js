import {createSoldierAppearance,drawSoldierHead} from './soldier-appearance.js?v=151';
import {drawFieldSoldier} from './visuals.js?v=181';

const looks=new WeakMap();
const ellipse=(c,x,y,rx,ry,color)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();};
const shape=(c,p,color)=>{c.fillStyle=color;c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();};
const line=(c,p,color,width=1)=>{c.strokeStyle=color;c.lineWidth=width;c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();};
function identity(id){let n=2166136261;for(const ch of String(id)){n=Math.imul(n^ch.charCodeAt(0),16777619);}return n>>>0;}
function appearance(actor){
  let look=looks.get(actor);if(look)return look;
  const n=identity(actor.id||`${actor.role}:${actor.name||''}`),female=actor.role==='traveler'&&n%3===0;
  const face={id:`trade:${actor.id||actor.role}`,soldierClass:female?'MEDIC':'LIGHT',appearance:createSoldierAppearance(`trade:${actor.id||actor.role}`)};
  const colors=['#8a7353','#637b71','#787184','#896956'];
  look={n,female,face,cloth:colors[n%colors.length],guard:{...face,soldierClass:'HEAVY',equipped:{
    weapon:{tier:9,weaponStyle:'spear'},helmet:{tier:9},armor:{tier:9},shield:{tier:9},legs:{tier:6},gloves:{tier:6}
  },hp:1,maxHp:1,animOffset:n%23}};
  looks.set(actor,look);return look;
}
// Use the party's own saved path; a newly discovered shortcut cannot flip it.
function heading(actor){
  const points=actor.points;if(!points?.length||points.length<2)return actor.outbound?Math.PI:0;
  let remaining=actor.outbound?Math.max(0,(actor.routeLength||0)-(actor.progress||0)):actor.progress||0;
  for(let i=1;i<points.length;i++){
    const dx=points[i][0]-points[i-1][0],dy=points[i][1]-points[i-1][1],length=Math.hypot(dx,dy);
    if(remaining<=length||i===points.length-1)return Math.atan2(dy,dx)+(actor.outbound?Math.PI:0);
    remaining-=length;
  }
  return 0;
}
function crate(c,x,y,w,h){
  shape(c,[[x,y],[x+w,y],[x+w,y+h],[x,y+h]],'#95754b');
  shape(c,[[x,y],[x+5,y-3],[x+w+5,y-3],[x+w,y]],'#bea171');
  shape(c,[[x+w,y],[x+w+5,y-3],[x+w+5,y+h-3],[x+w,y+h]],'#675036');
  line(c,[[x+2,y+2],[x+w-2,y+h-2],[x+w-2,y+2],[x+2,y+h-2]],'#ccb184',1.1);
  line(c,[[x,y+2],[x+w,y+2],[x+w,y+h],[x,y+h],[x,y]],'#493e2e',.8);
}
function wheel(c,x,y,phase){
  ellipse(c,x,y,6,6.3,'#292e29');ellipse(c,x,y,4.7,5,'#977449');
  for(let i=0;i<6;i++){const a=phase+i*Math.PI/3;line(c,[[x,y],[x+Math.cos(a)*4.6,y+Math.sin(a)*4.9]],'#c5a575',.7);}
  ellipse(c,x,y,1.5,1.5,'#4c493b');
  line(c,[[x-3,y-4],[x,y-5],[x+3,y-4]],'#b7b3a0',.6);
}
function cart(c,progress,n){
  ellipse(c,2,4,25,5,'#101c1766');
  wheel(c,10,-1,progress*.12);
  shape(c,[[-19,-12],[14,-12],[21,-17],[-12,-17]],'#a18458');
  shape(c,[[14,-12],[21,-17],[21,0],[14,5]],'#5f4b33');
  c.fillStyle='#84613e';c.fillRect(-19,-12,33,17);
  for(let row=0;row<3;row++)line(c,[[-19,-9+row*5],[14,-9+row*5]],row%2?'#aa8859':'#5e4832',.9);
  for(const x of [-17,12]){c.fillStyle='#4a4939';c.fillRect(x,-13,2,19);ellipse(c,x+1,-8,.6,.6,'#b4af94');}
  crate(c,-14,-24,12,12);
  ellipse(c,6,-18,7,6,n%2?'#778568':'#b49c70');
  line(c,[[3,-22],[5,-19],[5,-15]],'#c8b896',.9);
  shape(c,[[1,-27],[12,-27],[15,-22],[0,-22]],'#8d7963');
  line(c,[[2,-25],[11,-25]],'#bda783');
  line(c,[[-14,-24],[-12,-4],[13,-4],[11,-26]],'#d0bc8c',1);
  line(c,[[-19,-4],[-33,-8],[-37,-8]],'#a68a60',2.1);
  wheel(c,-10,5,progress*.12);wheel(c,14,5,progress*.12);
}
function person(c,actor,look,merchant){
  const {face,cloth,n,female}=look,stride=Math.sin((actor.progress||0)*.11+n%19)*2.4,bob=Math.abs(stride)*.18;
  ellipse(c,0,3,10,3.5,'#111c1866');
  c.save();c.translate(0,-bob);c.lineCap='round';c.lineJoin='round';
  // Cloak and pack sit behind the shoulders, with the same foot scale as soldiers.
  shape(c,[[-5,-25],[-10,-21],[-12,-3],[-4,-6],[4,-20]],merchant?'#655344':'#495e56');
  line(c,[[-8,-20],[-10,-7]],'#9b9776',.8);
  if(!merchant){
    shape(c,[[-10,-25],[-6,-27],[-4,-13],[-10,-11],[-13,-15]],'#8b6b4d');
    line(c,[[-11,-24],[-9,-12]],'#b79b71',1.2);
    shape(c,[[-12,-26],[-5,-27],[-4,-23],[-12,-22]],'#b8a88a');
    line(c,[[-10,-27],[-10,-22],[-6,-27],[-6,-23]],'#68583d',.9);
  }
  c.fillStyle='#565249';c.fillRect(-5+stride,-11,4,12);c.fillRect(2-stride,-11,4,12);
  shape(c,[[-6+stride,-1],[-2+stride,-1],[1+stride,2],[-6+stride,3]],'#302f29');
  shape(c,[[1-stride,-1],[5-stride,-1],[8-stride,2],[1-stride,3]],'#302f29');
  line(c,[[-5+stride,0],[-2+stride,0]],'#9b8a6f',.6);line(c,[[2-stride,0],[5-stride,0]],'#9b8a6f',.6);
  const fabric=c.createLinearGradient(-6,-26,8,-7);fabric.addColorStop(0,'#c0af91');fabric.addColorStop(.26,cloth);fabric.addColorStop(1,'#47463e');
  shape(c,[[-6,-25],[5,-25],[8,-17],[6,-6],[-7,-6],[-8,-18]],fabric);
  if(female)shape(c,[[-5,-16],[5,-16],[8,-1],[-8,-1]],fabric);
  line(c,[[-6,-24],[-3,-19],[-4,-9]],'#cfbd98',.7);line(c,[[3,-22],[4,-10]],'#343c35',.8);
  shape(c,[[-4,-25],[0,-22],[4,-25],[2,-18],[-2,-18]],merchant?'#d5c49a':'#b8b7a0');
  c.fillStyle='#584733';c.fillRect(-6,-11,12,2);c.fillStyle='#bba77a';c.fillRect(-.5,-11.2,2,2.3);
  line(c,[[-5,-24],[7,-12]],'#c9b48c',1.7);
  shape(c,[[4,-13],[10,-13],[11,-6],[4,-5]],'#8c603e');line(c,[[4,-12],[10,-12]],'#c09865',.8);
  c.fillStyle='#bd9e66';c.fillRect(7,-10,1.3,1.6);
  const arm=merchant?[[5,-22],[10,-17],[13,-12]]:[[5,-22],[9,-17-stride*.4],[8,-11-stride*.4]];
  line(c,arm,'#484b40',4);line(c,arm,cloth,2.7);ellipse(c,...arm.at(-1),1.8,2.2,face.appearance.skin);
  if(!merchant){line(c,[[12,-20],[14,3]],'#a18b63',1.7);line(c,[[12,-20],[14,-18]],'#d2bd94',.7);}
  drawSoldierHead(c,face,{y:-31,small:true});
  if(merchant){
    shape(c,[[-6,-35],[-5,-40],[3,-41],[6,-35]],'#7f7253');
    shape(c,[[0,-40],[3,-41],[6,-35],[2,-35]],'#5e5842');
    line(c,[[-8,-34],[8,-34]],'#514b3b',2.4);line(c,[[-5,-35],[5,-35]],'#d0b78c',1.1);
  }else if(n%2){shape(c,[[-6,-34],[-4,-38],[3,-38],[6,-34]],cloth);line(c,[[-6,-34],[6,-34]],'#c4b497',.8);}
  c.restore();
}
export function drawCommerceActor(ctx,actor,time=0){
  if(!actor||actor.dead)return;
  const look=appearance(actor),angle=heading(actor);
  if(actor.role==='guard'){
    const proxy=look.guard;
    Object.assign(proxy,{x:actor.x,y:actor.y,vx:Math.cos(angle),vy:Math.sin(angle),facingAngle:angle,attackAngle:angle,atkAnim:Math.max(0,((actor.attackClock||0)-.72)/.28)*.55});
    // Gear is a visual proxy only; no soldier stats or saved equipment are added.
    drawFieldSoldier(ctx,proxy,(actor.progress||0)*1.4,{baseClassId:'HEAVY'},'#8c9e86',false);
  }else{
    ctx.save();ctx.translate(actor.x,actor.y);if(Math.cos(angle)<-.15)ctx.scale(-1,1);
    if(actor.role==='merchant'){cart(ctx,actor.progress||0,look.n);ctx.translate(-32,0);}
    person(ctx,actor,look,actor.role==='merchant');ctx.restore();
  }
  if(actor.hp<actor.maxHp){
    ctx.save();ctx.translate(actor.x,actor.y);ctx.fillStyle='#343a30';ctx.fillRect(-14,-49,28,3);
    ctx.fillStyle='#c7ab7c';ctx.fillRect(-14,-49,28*Math.max(0,Math.min(1,actor.hp/actor.maxHp)),3);ctx.restore();
  }
}
export function drawCommerceWreck(c,remains){
  c.save();c.globalAlpha*=Math.max(0,Math.min(1,remains.life));c.translate(remains.x,remains.y);c.rotate(.18);
  ellipse(c,0,8,25,5,'#14201877');shape(c,[[-17,-6],[15,-5],[13,6],[-15,7]],'#715738');
  for(let i=0;i<3;i++)line(c,[[-17,-5+i*4],[15,-4+i*4]],'#b79867',1);
  line(c,[[-21,-10],[16,8],[-1,-4],[-9,8]],'#c0a372',1.5);wheel(c,-18,6,.4);wheel(c,20,-6,1.2);
  crate(c,15,10,8,6);shape(c,[[-9,10],[2,12],[4,17],[-6,17]],'#97a078');c.restore();
}
