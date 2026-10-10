import {ECONOMIC_REGIONS,PUBLIC_WORKS,ECONOMIC_RULES} from './regional-economy.js?v=151';
const visible=(game,x,y,r=250)=>Math.abs(x-game.camera.x)<game.width/(2*(game.zoom||1))+r&&Math.abs(y-game.camera.y)<game.height/(2*(game.zoom||1))+r;
const ellipse=(c,x,y,rx,ry,color)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();};
import {drawSettlementQuarter} from './settlement-visuals.js?v=162';
export {drawSettlementQuarter};
export {drawCampTent} from './settlement-visuals.js?v=162';
export {drawCommerceActor,drawCommerceWreck} from './commerce-visuals.js?v=162';

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
export function drawEconomicMinimap(ctx,game,px,py,inside) {
  const e=game.nation?.economy;if(!e||game.currentDungeon)return;
  ctx.strokeStyle='#a69f71';ctx.lineWidth=1;
  for(const r of e.routes)for(let i=1;i<r.points.length;i++){const a=r.points[i-1],b=r.points[i];if(!inside(...a)&&!inside(...b))continue;ctx.beginPath();ctx.moveTo(px(a[0]),py(a[1]));ctx.lineTo(px(b[0]),py(b[1]));ctx.stroke();}
  for(const d of ECONOMIC_REGIONS){if(!e.regions[d.id].discovered||!inside(d.x,d.y))continue;ctx.fillStyle=e.routes.some(r=>r.to===d.id)?'#a8c194':'#c0af87';ctx.fillRect(px(d.x)-1.7,py(d.y)-1.7,3.4,3.4);}
  for(const a of e.traffic){if(!inside(a.x,a.y))continue;ctx.fillStyle=a.role==='guard'?'#9fb6b0':'#d0b57d';ctx.fillRect(px(a.x)-.8,py(a.y)-.8,1.6,1.6);}
}
