import {WORLD_SIZE,biomeAt,eastWestRoadY,northSouthRoadX,riverCenterY,blockingGuides} from './world.js?v=151';
import {dungeonSolids} from './dungeon.js?v=151';
import {inCurrentInstance} from './instance-rules.js?v=151';
import {ECONOMIC_REGIONS,economicState,economicFieldBlocked} from './regional-economy.js?v=151';

export const NAVIGATION_RULES=Object.freeze({fieldSpan:10000,maxSize:168,terrainAlpha:.34,roadAlpha:.72,iconAlpha:1});
const center=WORLD_SIZE/2;
export function drawNavigationIcon(ctx,kind,x,y,label='',size=9) {
 ctx.save();ctx.translate(x,y);ctx.globalAlpha=NAVIGATION_RULES.iconAlpha;ctx.lineWidth=1.5;ctx.strokeStyle='#171f23';ctx.fillStyle=kind==='medical'?'#b9d6c4':kind==='cage'?'#c5b0cf':'#e0d3ad';
 ctx.beginPath();
 if(kind==='town'){ctx.moveTo(-size,-1);ctx.lineTo(0,-size);ctx.lineTo(size,-1);ctx.lineTo(size*.7,-1);ctx.lineTo(size*.7,size);ctx.lineTo(-size*.7,size);ctx.lineTo(-size*.7,-1);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#28383c';ctx.fillRect(-2,2,4,size-2);}
 else if(kind==='medical'){ctx.rect(-size*.32,-size,size*.64,size*2);ctx.rect(-size,-size*.32,size*2,size*.64);ctx.fill();ctx.stroke();}
 else if(kind==='base'){ctx.moveTo(-size,size);ctx.lineTo(-size,-size);ctx.lineTo(-size*.4,-size);ctx.lineTo(-size*.4,-size*.5);ctx.lineTo(size*.4,-size*.5);ctx.lineTo(size*.4,-size);ctx.lineTo(size,-size);ctx.lineTo(size,size);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#28383c';ctx.fillRect(-2,1,4,size-1);}
 else if(kind==='cage'){ctx.rect(-size,-size,size*2,size*2);ctx.fill();ctx.stroke();ctx.strokeStyle='#35404a';for(const dx of [-size*.5,0,size*.5]){ctx.beginPath();ctx.moveTo(dx,-size);ctx.lineTo(dx,size);ctx.stroke();}}
 else if(kind==='ruin'){ctx.moveTo(-size,size);ctx.lineTo(-size,-size*.6);ctx.lineTo(-size*.3,-size);ctx.lineTo(-size*.2,-size*.3);ctx.lineTo(size*.3,-size*.5);ctx.lineTo(size,size);ctx.closePath();ctx.fill();ctx.stroke();}
 else {ctx.arc(0,0,size,Math.PI,0);ctx.lineTo(size,size);ctx.lineTo(-size,size);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#28383c';ctx.beginPath();ctx.arc(0,1,size*.5,Math.PI,0);ctx.lineTo(size*.5,size);ctx.lineTo(-size*.5,size);ctx.fill();}
 if(label){ctx.font='11px "Yu Gothic",sans-serif';ctx.textAlign='center';ctx.textBaseline='top';ctx.strokeStyle='#142125';ctx.lineWidth=3;ctx.strokeText(label,0,size+4);ctx.fillStyle='#ece4cf';ctx.fillText(label,0,size+4);}
 ctx.restore();
}
function drawBlockingMarks(ctx, px, py, known, blocked, game) {
  if (game.player) blocked(game.player.x, game.player.y);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const line of blockingGuides()) {
    let drawing = false, marked = false;
    ctx.beginPath();
    for (const [x, y] of line) {
      if (!known(x, y) || !blocked(x, y)) { drawing = false; continue; }
      const sx = px(x), sy = py(y);
      if (!drawing) { ctx.moveTo(sx, sy); drawing = true; }
      else { ctx.lineTo(sx, sy); marked = true; }
    }
    if (!marked) continue;
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#6e5844';
    ctx.lineWidth = 3.2;
    ctx.stroke();
    ctx.strokeStyle = '#e6d3a8';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  for (const work of game._economicWorks || []) {
    if (work.done || (work.kind !== 'bridge' && work.kind !== 'landfill') || !known(work.x, work.y)) continue;
    ctx.save();
    ctx.translate(px(work.x), py(work.y));
    ctx.rotate(work.angle || 0);
    const w = Math.max(2, work.w * (px(work.x + 1) - px(work.x))), h = Math.max(2, work.h * (py(work.y + 1) - py(work.y)));
    ctx.globalAlpha = .92;
    ctx.fillStyle = '#e6d3a8';
    ctx.strokeStyle = '#6e5844';
    ctx.lineWidth = 1;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.restore();
  }
  ctx.restore();
}
export function renderNavigationMap(game) {
 const canvas=game.minimapCanvas,ctx=game.minimapCtx;if(!canvas||!ctx||!game.player)return;
 const size=Math.max(112,Math.min(NAVIGATION_RULES.maxSize,(game.width||390)*.42,(game.height||664)*.28)),dpr=Math.min(2,window.devicePixelRatio||1);
 const pixels=Math.round(size*dpr);if(canvas.width!==pixels||canvas.height!==pixels){canvas.width=canvas.height=pixels;}canvas.style.width=canvas.style.height=`${size}px`;
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,size,size);
 const dungeon=game.currentDungeon,span=dungeon?Math.max(1000,dungeon.width,dungeon.height)*1.15:NAVIGATION_RULES.fieldSpan,cx=dungeon?dungeon.width/2:game.player.x,cy=dungeon?dungeon.height/2:game.player.y;
 const originX=cx-span/2,originY=cy-span/2,scale=size/span,px=x=>(x-originX)*scale,py=y=>(y-originY)*scale,inside=(x,y)=>px(x)>16&&py(y)>16&&px(x)<size-16&&py(y)<size-28;
 ctx.save();ctx.beginPath();ctx.rect(0,0,size,size);ctx.clip();
 if(!dungeon){
  const fog=game.ensureFog(),known=(x,y)=>fog.isExploredWorld(x,y);
  ctx.globalAlpha=NAVIGATION_RULES.terrainAlpha;for(let y=0;y<24;y++)for(let x=0;x<24;x++){const wx=originX+(x+.5)*span/24,wy=originY+(y+.5)*span/24;if(!known(wx,wy))continue;ctx.fillStyle=biomeAt(wx,wy).ground;ctx.fillRect(x*size/24,y*size/24,size/24+1,size/24+1);}
  ctx.globalAlpha=NAVIGATION_RULES.roadAlpha;for(let i=0;i<80;i++){const x=originX+(i+.5)*span/80,y=originY+(i+.5)*span/80;for(const [wx,wy,color] of [[x,eastWestRoadY(x),'#d2c09c'],[northSouthRoadX(y),y,'#d2c09c'],[x,riverCenterY(x),'#82aeb9']]){if(!known(wx,wy))continue;ctx.fillStyle=color;ctx.fillRect(px(wx)-1.2,py(wy)-1.2,2.4,2.4);}}
  drawBlockingMarks(ctx,px,py,known,(x,y)=>economicFieldBlocked(game,x,y),game);
  ctx.globalAlpha=1;
  if(inside(center,center)&&known(center,center))drawNavigationIcon(ctx,'base',px(center),py(center),'本陣',10);
  for(const d of game.dungeons||[]){const e=d.entrance;if(!e||!inside(e.x,e.y)||!known(e.x,e.y))continue;drawNavigationIcon(ctx,d.kind==='town'?'town':d.kind==='ruin'?'ruin':'dungeon',px(e.x),py(e.y),d.name,8);}
  for(const p of game.medicalPosts||[])if(p.discovered&&inside(p.x,p.y)&&known(p.x,p.y))drawNavigationIcon(ctx,'medical',px(p.x),py(p.y),'診療所',9);
  const economy=game.nation?economicState(game):null;
  for(const region of ECONOMIC_REGIONS)if(region.kind==='village'&&economy?.regions?.[region.id]?.discovered&&inside(region.x,region.y)&&known(region.x,region.y))drawNavigationIcon(ctx,'town',px(region.x),py(region.y),region.name,8);
  for(const p of game.outposts||[])if(inside(p.x,p.y)&&known(p.x,p.y))drawNavigationIcon(ctx,p.type==='CAGE'?'cage':p.type==='FORT'?'base':'ruin',px(p.x),py(p.y),p.type==='CAGE'?'捕虜':p.type==='FORT'?'砦':'',6);
  if(!inside(center,center)){const a=Math.atan2(center-cy,center-cx),r=size/2-20;drawNavigationIcon(ctx,'base',size/2+Math.cos(a)*r,size/2+Math.sin(a)*r,'本陣',7);}
 }else{
  ctx.globalAlpha=.22;ctx.fillStyle='#b4c4c2';ctx.strokeStyle='#d0d9d4';ctx.lineWidth=1;ctx.strokeRect(px(0),py(0),dungeon.width*scale,dungeon.height*scale);
  ctx.globalAlpha=.92;ctx.fillStyle='#e6d3a8';ctx.strokeStyle='#6e5844';ctx.lineWidth=1;
  for(const wall of dungeonSolids(dungeon)){const x=px(wall.x),y=py(wall.y),w=Math.max(2,wall.w*scale),h=Math.max(2,wall.h*scale);ctx.fillRect(x,y,w,h);ctx.strokeRect(x,y,w,h);}
  ctx.globalAlpha=1;
  drawNavigationIcon(ctx,'dungeon',px(180),py(dungeon.height/2),'出口',8);if(dungeon.kind==='town')drawNavigationIcon(ctx,'medical',px(230),py(dungeon.height/2),'診療所',8);
  for(const e of game.limitedAllies?.encounters||[])if(e.dungeonId===dungeon.id&&!e.joined)drawNavigationIcon(ctx,e.kind==='cage'?'cage':'town',px(e.x),py(e.y),e.kind==='cage'?'救助':'志願者',8);
 }
 for(const s of game.squad||[]){if(s.dead||(dungeon&&!inCurrentInstance(game,s))||!inside(s.x,s.y))continue;ctx.globalAlpha=.55;ctx.fillStyle=s.isDown?'#d19481':'#a5c5b6';ctx.beginPath();ctx.arc(px(s.x),py(s.y),s.isDown?2.5:1.3,0,Math.PI*2);ctx.fill();}
 ctx.globalAlpha=.95;ctx.save();ctx.translate(px(game.player.x),py(game.player.y));ctx.rotate(game.player.facingAngle||0);ctx.fillStyle='#f2e6b9';ctx.strokeStyle='#243238';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(7,0);ctx.lineTo(-4,-4);ctx.lineTo(-2,0);ctx.lineTo(-4,4);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();ctx.restore();
}
