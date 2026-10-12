// Warm local illumination over a reusable darkness mask. Never changes exploration or saves.
import {daylightAt} from './day-night.js?v=208';
import {explorationLayout,dungeonSegmentOpen} from './dungeon-layout.js?v=182';
import {explorationLamps} from './dungeon-interior-visuals.js?v=208';
import {nightlifeLightSources} from './nightlife-visuals.js?v=208';
import {viewport,circleInView} from './render-support.js';

export const CAVE_DARKNESS=.992;
export const LANTERN_RADIUS=215;
const TAU=Math.PI*2,GRID=40,VISIBILITY=new WeakMap();
const isCave=game=>game.currentDungeon?.kind==='dungeon';
const onFloor=(l,x,y)=>x>=0&&y>=0&&x<l.width&&y<l.height&&!!l.floor[Math.floor(y/GRID)*l.cols+Math.floor(x/GRID)];

/** Exact grid-boundary ray traversal; a narrow wall-face margin never reveals the next cell. */
function rayDistance(l,x,y,angle,radius){
  const dx=Math.cos(angle),dy=Math.sin(angle);
  if(!onFloor(l,x,y))return 0;
  let cx=Math.floor(x/GRID),cy=Math.floor(y/GRID),distance=0;
  const sx=dx>=0?1:-1,sy=dy>=0?1:-1,stepX=Math.abs(GRID/dx),stepY=Math.abs(GRID/dy);
  let tx=Math.abs(((sx>0?(cx+1)*GRID:cx*GRID)-x)/dx),ty=Math.abs(((sy>0?(cy+1)*GRID:cy*GRID)-y)/dy);
  while(distance<radius){
    if(tx<ty){distance=tx;tx+=stepX;cx+=sx;}else{distance=ty;ty+=stepY;cy+=sy;}
    if(distance>=radius)return radius;
    if(cx<0||cy<0||cx>=l.cols||cy>=l.rows||!l.floor[cy*l.cols+cx])return Math.min(radius,distance+24);
  }
  return radius;
}

/** Fixed-angle rays plus nearby wall corners. Cache one position per emitter, not a movement trail. */
export function lightVisibilityPolygon(layout,source,radius=source.radius){
  if(!layout||!onFloor(layout,source.x,source.y))return [];
  let cache=VISIBILITY.get(layout);if(!cache){cache=new Map();VISIBILITY.set(layout,cache);}
  const id=source.id||'viewer',old=cache.get(id),x=source.x,y=source.y;
  if(old&&old.x===x&&old.y===y&&old.radius===radius)return old.points;
  const angles=Array.from({length:96},(_,i)=>i*TAU/96);
  for(const r of layout.solids)if(r.x<=x+radius&&r.x+r.w>=x-radius&&r.y<=y+radius&&r.y+r.h>=y-radius){
    for(const [px,py]of [[r.x,r.y],[r.x+r.w,r.y],[r.x,r.y+r.h],[r.x+r.w,r.y+r.h]]){
      if(Math.hypot(px-x,py-y)>radius+GRID)continue;
      const a=Math.atan2(py-y,px-x);angles.push((a-.0001+TAU)%TAU,(a+TAU)%TAU,(a+.0001+TAU)%TAU);
    }
  }
  angles.sort((a,b)=>a-b);
  const points=angles.map(a=>{const d=rayDistance(layout,x,y,a,radius);return {x:x+Math.cos(a)*d,y:y+Math.sin(a)*d};});
  cache.set(id,{x,y,radius,points});return points;
}

function clipPolygon(c,points){
  if(points.length<3)return false;
  c.beginPath();c.moveTo(points[0].x,points[0].y);for(let i=1;i<points.length;i++)c.lineTo(points[i].x,points[i].y);c.closePath();c.clip();return true;
}

export function sceneLightSources(game,now=0,view=null){
  const cave=isCave(game),strength=cave?1:daylightAt(game.worldTime).nightLight;
  if(strength<=0)return [];
  const lights=[],player=game.player,layout=cave?explorationLayout(game.currentDungeon):null;
  if(player&&Number.isFinite(player.x)&&Number.isFinite(player.y))lights.push({id:'player-lantern',x:player.x,y:player.y,radius:cave?LANTERN_RADIUS:170,power:.94*strength,rgb:'255,181,84',fixture:true,carried:true});
  if(cave){
    const lamps=explorationLamps(game.currentDungeon,layout).filter(l=>(!view||circleInView(l.x,l.y,l.radius,view))&&(!player||dungeonSegmentOpen(game.currentDungeon,player,l)));
    if(player)lamps.sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y));
    for(const l of lamps.slice(0,8))lights.push({...l,power:l.power*(.97+.03*Math.sin(now*.003+l.phase)),rgb:'255,184,91',fixture:true});
  }else{
    for(const [i,o]of (game.worldObjs||[]).entries())if(o.type==='torch'||o.type==='fire')lights.push({id:`fire-${i}`,x:o.x,y:o.y-12,radius:(o.type==='fire'?180:145)*(o.s||1),power:.86*strength,rgb:'255,184,91'});
    lights.push(...nightlifeLightSources(game,strength));
  }
  return view?lights.filter(l=>circleInView(l.x,l.y,l.radius,view)):lights;
}

/** Logical screen coordinates. One low-resolution surface reused across frames and rotations. */
export function drawSceneDarkness(c,game,now=0,shakeX=0,shakeY=0){
  const {width:W,height:H}=game;if(!(W>0&&H>0))return;
  const cave=isCave(game),clock=daylightAt(game.worldTime),alpha=cave?CAVE_DARKNESS:clock.darkness;
  if(!cave&&clock.nightLight<=0){c.fillStyle=`rgba(8,14,35,${alpha})`;c.fillRect(0,0,W,H);return;}
  let canvas=game._lightingMask;
  if(!canvas||canvas.getContext('2d')?.isContextLost?.()===true){if(canvas){canvas.width=canvas.height=1;}canvas=document.createElement('canvas');game._lightingMask=canvas;}
  const scale=Math.min(.75,900/Math.max(W,H)),mw=Math.max(1,Math.ceil(W*scale)),mh=Math.max(1,Math.ceil(H*scale));
  if(canvas.width!==mw||canvas.height!==mh){canvas.width=mw;canvas.height=mh;}
  const m=canvas.getContext('2d');if(!m)throw new Error('照明Canvasを確保できません');
  m.setTransform(mw/W,0,0,mh/H,0,0);m.globalAlpha=1;m.globalCompositeOperation='source-over';m.clearRect(0,0,W,H);
  m.fillStyle=cave?`rgba(1,2,3,${alpha})`:`rgba(3,7,17,${alpha})`;m.fillRect(0,0,W,H);
  const z=game.zoom||1,view=viewport(game.camera,W,H,z),lights=sceneLightSources(game,now,view),layout=cave?explorationLayout(game.currentDungeon):null;
  m.save();
  try{
    m.translate(W/2+shakeX,H/2+shakeY);m.scale(z,z);m.translate(-game.camera.x,-game.camera.y);
    if(cave&&game.player)clipPolygon(m,lightVisibilityPolygon(layout,{...game.player,id:'viewer'},Math.hypot(W,H)/z));
    m.globalCompositeOperation='destination-out';
    for(const l of lights){
      m.save();
      try{
        if(cave&&!clipPolygon(m,lightVisibilityPolygon(layout,l)))continue;
        const g=m.createRadialGradient(l.x,l.y,0,l.x,l.y,l.radius);
        g.addColorStop(0,`rgba(0,0,0,${l.power})`);g.addColorStop(.22,`rgba(0,0,0,${l.power*.94})`);
        g.addColorStop(.5,`rgba(0,0,0,${l.power*.64})`);g.addColorStop(.78,`rgba(0,0,0,${l.power*.18})`);g.addColorStop(1,'rgba(0,0,0,0)');
        m.fillStyle=g;m.fillRect(l.x-l.radius,l.y-l.radius,l.radius*2,l.radius*2);
      }finally{m.restore();}
    }
  }finally{m.restore();}
  c.save();c.globalCompositeOperation='source-over';c.drawImage(canvas,0,0,W,H);c.restore();
}

/** Warm reflected light, a small hot glass core and restrained dust close to the lantern. */
export function drawLanternLights(c,game,now,view){
  const cave=isCave(game),layout=cave?explorationLayout(game.currentDungeon):null;
  const lights=sceneLightSources(game,now,view).filter(l=>l.fixture);
  c.save();
  try{
    if(cave&&game.player)clipPolygon(c,lightVisibilityPolygon(layout,{...game.player,id:'viewer'},Math.hypot(game.width,game.height)/(game.zoom||1)));
    for(const l of lights){
      c.save();
      try{
        if(cave&&!clipPolygon(c,lightVisibilityPolygon(layout,l)))continue;
        const g=c.createRadialGradient(l.x,l.y-10,0,l.x,l.y-10,l.radius*.86);
        g.addColorStop(0,`rgba(${l.rgb},${.22*l.power})`);g.addColorStop(.3,`rgba(${l.rgb},${.13*l.power})`);g.addColorStop(.7,`rgba(${l.rgb},${.025*l.power})`);g.addColorStop(1,`rgba(${l.rgb},0)`);
        c.fillStyle=g;c.fillRect(l.x-l.radius,l.y-l.radius,l.radius*2,l.radius*2);
        if(cave)for(let i=0;i<5;i++){
          const phase=now*.00025+i*2.4,x=l.x+Math.sin(phase)*43,y=l.y-20+Math.cos(phase*.83+i)*35;
          c.fillStyle=`rgba(255,221,161,${.09*l.power})`;c.beginPath();c.arc(x,y,.7,0,TAU);c.fill();
        }
      }finally{c.restore();}
    }
  }finally{c.restore();}
  // Sources themselves sit above the wall faces; their ground positions were visibility-checked.
  for(const l of lights){
    const x=l.drawX??l.x+(l.carried?13:0),y=l.drawY??l.y-(l.carried?(game.player?.isDown?6:22):24);
    c.save();c.globalAlpha*=l.power;c.globalCompositeOperation='source-over';
    if(l.fixtureKind==='candle'||l.fixtureKind==='offering'){
      c.shadowColor='#ffc075';c.shadowBlur=8;c.fillStyle='#ffe3ad';
      for(const dx of l.fixtureKind==='candle'?[-9,0,9]:[0]){c.beginPath();c.ellipse(x+dx,y,1.7,4,0,0,TAU);c.fill();}
      c.restore();continue;
    }
    c.strokeStyle='#aa8c50';c.lineWidth=1;c.beginPath();c.arc(x,y-7,3,Math.PI,TAU);c.stroke();
    c.fillStyle='#302b22';c.fillRect(x-5,y-6,10,14);
    c.shadowColor='#ffbd68';c.shadowBlur=11;c.fillStyle='#ffe2a1';c.fillRect(x-3,y-4,6,9);
    c.shadowBlur=0;c.fillStyle='#fff6dc';c.fillRect(x-1,y-3,2,6);c.fillStyle='#8e7648';c.fillRect(x-5,y-7,10,2);c.fillRect(x-5,y+6,10,2);c.restore();
  }
}
