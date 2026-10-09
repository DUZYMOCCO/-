import {ECONOMIC_REGIONS,PUBLIC_WORKS,ECONOMIC_RULES} from './regional-economy.js?v=132';
const visible=(game,x,y,r=250)=>Math.abs(x-game.camera.x)<game.width/(2*(game.zoom||1))+r&&Math.abs(y-game.camera.y)<game.height/(2*(game.zoom||1))+r;
const ellipse=(c,x,y,rx,ry,color)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();};
function drawCivicKeep(ctx,level,urban) {
  if(level===0){ctx.fillStyle='#9b9275';ctx.beginPath();ctx.moveTo(-26,22);ctx.lineTo(0,-22);ctx.lineTo(26,22);ctx.closePath();ctx.fill();ctx.fillStyle='#343c2c';ctx.fillRect(-5,4,10,18);return;}
  const royal=level>=4,w=royal?94:level>=2?72:52,h=royal?58:40;
  ctx.fillStyle=level>=2?'#bbb39a':'#79674b';ctx.fillRect(-w/2,-h/2,w,h);
  ctx.fillStyle=royal?'#52757c':'#6c5a43';ctx.beginPath();ctx.moveTo(-w/2-6,-h/2);ctx.lineTo(0,-h/2-24);ctx.lineTo(w/2+6,-h/2);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#8c8d79';ctx.lineWidth=1;if(level>=2)for(let y=-h/2+8;y<h/2;y+=9){ctx.beginPath();ctx.moveTo(-w/2,y);ctx.lineTo(w/2,y);ctx.stroke();}
  if(royal)for(const x of [-w/2-12,w/2+12]){ctx.fillStyle='#c2bca3';ctx.fillRect(x-12,-h/2-19,24,h+19);ctx.fillStyle='#466b72';ctx.beginPath();ctx.moveTo(x-16,-h/2-19);ctx.lineTo(x,-h/2-40);ctx.lineTo(x+16,-h/2-19);ctx.closePath();ctx.fill();}
  ctx.fillStyle='#25372f';ctx.fillRect(-8,h/2-25,16,25);ctx.fillStyle='#d8c98d';ctx.fillRect(-w/2+11,-3,7,10);ctx.fillRect(w/2-18,-3,7,10);
  if(level>=5||urban>=4){ctx.strokeStyle='#acb9a0';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-h/2-24);ctx.lineTo(0,-h/2-55);ctx.stroke();ctx.fillStyle='#c4aa63';ctx.fillRect(0,-h/2-55,22,12);}
}

export function drawSettlementQuarter(ctx,game,x,y,id='hq',interior=false) {
  const e=game.nation?.economy,r=e?.regions?.[id];
  const level=Math.max(r?.level||0,id==='hq'?game.nation?.level||0:0),urban=e?.technology?.urban?.level||0,production=e?.technology?.production?.level||0;
  const stage=Math.min(5,level+Math.floor(urban/2)),count=Math.min(22,4+stage*3),radius=interior?220:140+stage*16;
  ctx.save();ctx.translate(x,y);
  if(stage>=1||urban>=1){
    ctx.fillStyle=stage>=2?'#999580':'#625f4c';ctx.fillRect(-radius-80,-22,radius*2+160,44);ctx.fillRect(-22,-radius-70,44,radius*2+140);
    if(stage>=2){ctx.strokeStyle='#777c72';ctx.lineWidth=1;for(let i=-radius-70;i<radius+70;i+=22){ctx.beginPath();ctx.moveTo(i,-22);ctx.lineTo(i,22);ctx.moveTo(-22,i);ctx.lineTo(22,i);ctx.stroke();}}
  }
  for(let i=0;i<count;i++){
    const a=i/count*Math.PI*2,bx=Math.cos(a)*radius,by=Math.sin(a)*radius,w=stage>=3?50:36,h=24+stage*4;
    ellipse(ctx,bx,by+h+2,w*.65,6,'#0a100c66');
    if(stage===0&&id==='hq'){ctx.fillStyle='#7f7962';ctx.beginPath();ctx.moveTo(bx-w/2,by+h);ctx.lineTo(bx,by-5);ctx.lineTo(bx+w/2,by+h);ctx.fill();ctx.fillStyle='#353a2c';ctx.fillRect(bx-4,by+h-16,8,16);continue;}
    ctx.fillStyle=stage>=3?'#b6af97':stage>=2?'#918974':'#655b44';ctx.fillRect(bx-w/2,by,w,h);
    ctx.fillStyle=stage>=4?'#446a70':stage>=2?'#725848':'#514936';ctx.beginPath();ctx.moveTo(bx-w/2-5,by+3);ctx.lineTo(bx,by-14-stage*2);ctx.lineTo(bx+w/2+5,by+3);ctx.fill();
    ctx.fillStyle='#28332b';ctx.fillRect(bx+3,by+h-15,9,15);ctx.fillStyle='#c7b989';ctx.fillRect(bx-w/2+7,by+8,7,7);
    if(stage>=3){ctx.strokeStyle='#898879';ctx.lineWidth=1;for(let row=by+8;row<by+h;row+=9){ctx.beginPath();ctx.moveTo(bx-w/2,row);ctx.lineTo(bx+w/2,row);ctx.stroke();}}
    if(stage>=4){ctx.fillStyle='#343d34';ctx.fillRect(bx-7,by-23-stage*2,5,15);}
  }
  // A market grows from stalls into a tiled permanent market and warehouse.
  if(stage>=1){const mx=-radius*.6,my=radius*.7;ctx.fillStyle='#785f3d';ctx.fillRect(mx-36,my,72,16);ctx.fillStyle=stage>=3?'#8f4c42':'#a58d5c';ctx.fillRect(mx-40,my-12,80,12);
    for(let i=0;i<4+stage;i++){ctx.fillStyle=i%2?'#8a9b62':'#bd9860';ctx.fillRect(mx-31+i*9,my+3,7,7);}}
  // Technology is visible in the workshop: hand forge, waterwheel, then arcane furnace.
  const fx=radius*.75,fy=-radius*.7;ctx.fillStyle='#706859';ctx.fillRect(fx-24,fy,48,32);ctx.fillStyle='#343e36';ctx.fillRect(fx-28,fy-10,56,12);
  ctx.fillStyle=production>=3?'#88bfd0':'#c58a4a';ctx.fillRect(fx+5,fy+15,10,13);
  if(production>=1){ellipse(ctx,fx-28,fy+20,13,13,'#8c7954');ctx.strokeStyle='#3d4a40';ctx.lineWidth=2;for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.beginPath();ctx.moveTo(fx-28,fy+20);ctx.lineTo(fx-28+Math.cos(a)*12,fy+20+Math.sin(a)*12);ctx.stroke();}}
  if(production>=2){ctx.fillStyle='#939486';ctx.fillRect(fx+27,fy-30,12,52);ctx.fillStyle='#282f2a';ctx.fillRect(fx+25,fy-33,16,5);}
  const industry=ECONOMIC_REGIONS.find(d=>d.id===id)?.industry;
  if(industry==='farm')for(let plot=0;plot<3;plot++){const bx=radius+60,by=-70+plot*54;ctx.fillStyle='#524731';ctx.fillRect(bx,by,100,40);ctx.fillStyle=stage>=2?'#b8a16b':'#7f9661';for(let i=0;i<9;i++)ctx.fillRect(bx+8+i*10,by+6,3,29);}
  if(industry==='mine'){ctx.fillStyle='#424f45';ctx.fillRect(-radius-105,-60,75,45);ctx.fillStyle='#1a2821';ctx.fillRect(-radius-88,-45,40,30);for(let i=0;i<4;i++)ellipse(ctx,-radius-115+i*16,0,9,7,i%2?'#b2b49e':'#87917f');}
  if(stage>=3||urban>=3){ellipse(ctx,0,radius*.65,21,11,'#b3ad92');ellipse(ctx,0,radius*.65,15,7,'#587b83');
    for(const sx of [-radius*.85,radius*.85]){ctx.fillStyle='#636d60';ctx.fillRect(sx,-8,3,31);ctx.fillStyle='#d0be81';ctx.fillRect(sx-4,-15,11,9);}}
  if(r&&r.investment>0){const cx=-radius*.8,cy=-radius*.75;ctx.fillStyle='#645b43';ctx.fillRect(cx-22,cy,44,25);ctx.strokeStyle='#bba679';ctx.lineWidth=2;ctx.strokeRect(cx-24,cy-18,48,46);ctx.beginPath();ctx.moveTo(cx-24,cy-18);ctx.lineTo(cx+24,cy+28);ctx.moveTo(cx+24,cy-18);ctx.lineTo(cx-24,cy+28);ctx.stroke();ctx.fillStyle='#947c4f';ctx.fillRect(cx-35,cy+30,27,8);}
  if(id==='hq')drawCivicKeep(ctx,Math.min(5,level),urban);
  ctx.restore();
}
export function drawEconomicLandscape(ctx,game) {
  if(game.currentDungeon)return;
  const e=game.nation?.economy;if(!e)return;
  for(const route of e.routes){
    const paved=e.technology.transport.level>=2||e.regions[route.to]?.level>=2,gravel=e.technology.transport.level>=1||e.regions[route.to]?.level>=1;
    ctx.strokeStyle=paved?'#92907b':gravel?'#797661':'#655d43';ctx.lineWidth=paved?22:gravel?17:12;ctx.globalAlpha=paved?.8:.5;
    for(let i=1;i<route.points.length;i++){const a=route.points[i-1],b=route.points[i];
      const cx=(a[0]+b[0])/2,cy=(a[1]+b[1])/2,r=Math.hypot(b[0]-a[0],b[1]-a[1])/2+40;if(!visible(game,cx,cy,r))continue;
      ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();
    }
  }
  ctx.globalAlpha=1;
  for(const d of PUBLIC_WORKS){if(!visible(game,d.x,d.y,Math.max(d.w,d.h)))continue;const p=e.projects[d.id];
    ctx.save();ctx.translate(d.x,d.y);ctx.rotate(d.angle||0);
    if(!p.done&&(d.kind==='bridge'||d.kind==='landfill')){ctx.fillStyle='#0a1110';ctx.fillRect(-d.w/2,-d.h/2,d.w,d.h);ctx.strokeStyle='#646e5e';ctx.lineWidth=7;ctx.strokeRect(-d.w/2,-d.h/2,d.w,d.h);}
    if(p.done){ctx.fillStyle=d.kind==='bridge'?(e.technology.transport.level>=2?'#a39c83':'#8d7956'):d.kind==='landfill'?'#706e50':'#9a9681';ctx.fillRect(-d.w/2,-d.h/2,d.w,d.h);
      ctx.strokeStyle=d.kind==='bridge'?'#504c38':'#777c6c';ctx.lineWidth=2;for(let i=-d.w/2;i<d.w/2;i+=25){ctx.beginPath();ctx.moveTo(i,-d.h/2);ctx.lineTo(i,d.h/2);ctx.stroke();}
      if(d.kind==='bridge'){ctx.strokeStyle='#bab08a';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-d.w/2,-d.h/2+8);ctx.lineTo(d.w/2,-d.h/2+8);ctx.moveTo(-d.w/2,d.h/2-8);ctx.lineTo(d.w/2,d.h/2-8);ctx.stroke();}
      if(d.kind==='landfill'){ctx.fillStyle='#5b5141';ctx.fillRect(-34,-24,68,44);ctx.fillStyle='#a49061';ctx.fillRect(-40,-30,80,12);}
    }else if(p.funded>0){ctx.strokeStyle='#b19b6b';ctx.lineWidth=3;ctx.strokeRect(-d.w/2-10,-d.h/2-10,d.w+20,d.h+20);ctx.fillStyle='#967f54';ctx.fillRect(-d.w/2,-d.h/2-26,48,12);}
    ctx.restore();
    if(p.discovered){ctx.font='10px Meiryo, sans-serif';ctx.textAlign='center';ctx.fillStyle=p.done?'#c5d6b8':'#d2bd8b';ctx.fillText(p.done?`${d.name} · 完成`:p.funded>=d.cost?`${d.name} · 工事中 ${Math.floor(p.work/ECONOMIC_RULES.constructionSeconds*100)}%`:d.name,d.x,d.y-Math.max(80,d.h));}
  }
  for(const d of ECONOMIC_REGIONS){if(d.id==='hq'||!e.regions[d.id]?.discovered||!visible(game,d.x,d.y,450))continue;
    const r=e.regions[d.id];if(r.liberated&&(d.kind!=='ruin'||r.level>0))drawSettlementQuarter(ctx,game,d.x,d.y,d.id);
    ctx.font='11px Meiryo, sans-serif';ctx.textAlign='center';ctx.fillStyle='#d1c5a4';ctx.fillText(`${d.name} · ${r.liberated?`人口${Math.floor(r.population)}`:'未解放'}`,d.x,d.y-240);
  }
}
export function drawCommerceActor(ctx,actor,time=0) {
  ctx.save();ctx.translate(actor.x,actor.y);ellipse(ctx,0,8,actor.role==='merchant'?22:9,4,'#09110d77');
  if(actor.hp<actor.maxHp){ctx.fillStyle='#3b3026';ctx.fillRect(-14,-29,28,3);ctx.fillStyle='#b79969';ctx.fillRect(-14,-29,28*Math.max(0,actor.hp/actor.maxHp),3);}
  if(actor.role==='merchant'){
    ctx.fillStyle='#725b3b';ctx.fillRect(-17,-8,34,18);ctx.strokeStyle='#bdab7d';ctx.lineWidth=2;ctx.strokeRect(-17,-8,34,18);
    ctx.fillStyle='#b89c61';ctx.fillRect(-13,-17,12,12);ctx.fillStyle='#81956c';ctx.fillRect(2,-14,12,8);
    ellipse(ctx,-12,9,5,5,'#252f25');ellipse(ctx,12,9,5,5,'#252f25');
    ctx.translate(-25,-2);
  }
  const walk=Math.sin(time*7+actor.progress*.025)*2;
  ctx.strokeStyle='#414735';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-3,4);ctx.lineTo(-4+walk,11);ctx.moveTo(3,4);ctx.lineTo(4-walk,11);ctx.stroke();
  ctx.fillStyle=actor.role==='guard'?'#667768':actor.role==='merchant'?'#9b7b51':'#79755c';ctx.fillRect(-6,-10,12,16);
  ellipse(ctx,0,-14,5,5,'#c5ad87');ctx.fillStyle=actor.role==='guard'?'#afb4a1':'#655744';ctx.fillRect(-6,-20,12,5);
  if(actor.role==='guard'){ctx.strokeStyle='#b9b8a3';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(9,-17);ctx.lineTo(9,8);ctx.stroke();ctx.fillStyle='#556955';ctx.fillRect(-11,-6,5,10);}
  else{ctx.fillStyle='#524b37';ctx.fillRect(6,-7,5,10);}
  ctx.restore();
}
export function drawCommerceWreck(ctx,remains) {
  ctx.save();ctx.globalAlpha=Math.max(0,Math.min(1,remains.life));ctx.translate(remains.x,remains.y);
  ctx.rotate(.18);ctx.fillStyle='#65533b';ctx.fillRect(-15,-5,26,11);ctx.strokeStyle='#a28b5b';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-17,-8);ctx.lineTo(16,7);ctx.moveTo(-9,-9);ctx.lineTo(-12,9);ctx.stroke();
  ellipse(ctx,-18,7,5,5,'#28382a');ellipse(ctx,19,-7,5,5,'#28382a');ctx.fillStyle='#927e51';ctx.fillRect(18,11,7,5);ctx.fillRect(-7,14,8,5);ctx.restore();
}
export function drawEconomicMinimap(ctx,game,px,py,inside) {
  const e=game.nation?.economy;if(!e||game.currentDungeon)return;
  ctx.strokeStyle='#a69f71';ctx.lineWidth=1;
  for(const r of e.routes)for(let i=1;i<r.points.length;i++){const a=r.points[i-1],b=r.points[i];if(!inside(...a)&&!inside(...b))continue;ctx.beginPath();ctx.moveTo(px(a[0]),py(a[1]));ctx.lineTo(px(b[0]),py(b[1]));ctx.stroke();}
  for(const d of ECONOMIC_REGIONS){if(!e.regions[d.id].discovered||!inside(d.x,d.y))continue;ctx.fillStyle=e.routes.some(r=>r.to===d.id)?'#a8c194':'#c0af87';ctx.fillRect(px(d.x)-1.7,py(d.y)-1.7,3.4,3.4);}
  for(const a of e.traffic){if(!inside(a.x,a.y))continue;ctx.fillStyle=a.role==='guard'?'#9fb6b0':'#d0b57d';ctx.fillRect(px(a.x)-.8,py(a.y)-.8,1.6,1.6);}
}
