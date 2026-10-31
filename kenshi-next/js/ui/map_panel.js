import { panels } from './panels.js';
import { WORLD_LAYOUT as world } from '../data/world_layout.js';
import { clampZoom, worldToMap, mapToWorld, reveal, hitTest, drawMap, explored } from './map_draw.js';

export function createMapPanel(getState, all=false) {
 const mask=new Uint8Array(4096); if(all) mask.fill(1);
 const root=document.createElement('div'); root.className='map-overlay'; root.hidden=true;
 root.innerHTML='<section class="map-panel" aria-label="地図"><header><button class="map-close" aria-label="戻る">戻る</button><strong>地図</strong><button class="map-centre">現在地</button></header><canvas aria-label="地図。ドラッグで移動、ピンチまたはホイールで拡大縮小"></canvas><details class="map-legend"><summary>凡例</summary><div></div></details><div class="map-card" hidden></div><div class="map-hint">ドラッグで移動 · ピンチ / ホイールで拡大縮小</div></section>';
 document.body.append(root); const canvas=root.querySelector('canvas'),ctx=canvas.getContext('2d'), card=root.querySelector('.map-card');
 const button=document.createElement('button');button.type='button';button.className='opt-toggle';button.textContent='地図';
 const legend=root.querySelector('.map-legend div'); for(const id of new Set(world.regions.map(r=>r.owner))){const f=world.factions[id];if(!f)continue;const row=document.createElement('div'),dot=document.createElement('i');dot.style.background=f.color;row.append(dot,document.createTextNode(f.name));legend.append(row);}
 const view={x:0,z:0,span:6000,width:1,height:1}; let timer=null,lastX=Infinity,lastZ=Infinity; const pointers=new Map(); let gesture=null;
 const player=()=>{const s=getState();return s.actors.find(a=>a.id===s.playerId);};
 function updateFog(force=false){const p=player();if(!p)return false;if(!force&&Math.hypot(p.x-lastX,p.z-lastZ)<100)return false;lastX=p.x;lastZ=p.z;return reveal(mask,p.x,p.z);}
 function render(){
  if(root.hidden)return;
  const rect=canvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1;view.width=rect.width;view.height=rect.height;if(!view.width||!view.height)return;
  canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
  const s=getState(), p=player(), ids=new Set((s.playerSquads||[]).flatMap(sq=>sq.memberIds||[]));
  drawMap(ctx,view,mask,p,s.actors.filter(a=>ids.has(a.id)&&a.id!==p?.id));
  for(const outpost of s.outposts?.items||[]){if(!explored(mask,outpost.x,outpost.z))continue;const q=worldToMap(outpost.x,outpost.z,view);ctx.fillStyle='#e8c35f';ctx.strokeStyle='#201b15';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(q.x,q.y-6);ctx.lineTo(q.x+5,q.y);ctx.lineTo(q.x,q.y+6);ctx.lineTo(q.x-5,q.y);ctx.closePath();ctx.fill();ctx.stroke();}
  for(const house of s.town?.houses||[]){if(house.owner!=='player'||!explored(mask,house.x,house.z))continue;const q=worldToMap(house.x,house.z,view);ctx.fillStyle='#86d7cb';ctx.strokeStyle='#163b39';ctx.fillRect(q.x-4,q.y-4,8,8);ctx.strokeRect(q.x-4,q.y-4,8,8);}
 }
 function centre(){const p=player();if(p){view.x=p.x;view.z=p.z;}card.hidden=true;render();}
 function open(){updateFog(true);panels.open('map');root.hidden=false;centre();clearInterval(timer);let previous='';timer=setInterval(()=>{const s=getState();const ids=new Set((s.playerSquads||[]).flatMap(sq=>sq.memberIds||[]));const signature=s.actors.filter(a=>a.id===s.playerId||ids.has(a.id)).map(a=>[a.id,a.x,a.z,a.rot].join(':')).join('|')+':'+(s.outposts?.rev||0)+':'+(s.town?.houses||[]).filter(h=>h.owner==='player').map(h=>h.id).join(',');if(signature!==previous){previous=signature;render();}},500);}
 function close(){panels.close('map');}
 panels.register('map',{contains:t=>root.querySelector('.map-panel').contains(t),close:()=>{root.hidden=true;clearInterval(timer);timer=null;pointers.clear();}});
 root.querySelector('.map-close').onclick=close;root.querySelector('.map-centre').onclick=centre;button.onclick=open;
 window.addEventListener('resize',render);
 const pos=e=>{const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};};
 function zoomAt(x,y,span){const before=mapToWorld(x,y,view);view.span=clampZoom(span);const after=mapToWorld(x,y,view);view.x+=before.x-after.x;view.z+=before.z-after.z;render();}
 canvas.addEventListener('wheel',e=>{e.preventDefault();const p=pos(e);zoomAt(p.x,p.y,view.span*Math.exp(e.deltaY*.001));},{passive:false});
 canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);const p=pos(e);pointers.set(e.pointerId,p);if(pointers.size===1)gesture={start:p,last:p,moved:false};else if(pointers.size===2){const [a,b]=[...pointers.values()];gesture={distance:Math.hypot(a.x-b.x,a.y-b.y),span:view.span,moved:true};}});
 canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;const p=pos(e);pointers.set(e.pointerId,p);if(pointers.size===1&&gesture?.last){const dx=p.x-gesture.last.x,dy=p.y-gesture.last.y;view.x-=dx*view.span/view.width;view.z-=dy*view.span/view.width;gesture.moved ||= Math.hypot(p.x-gesture.start.x,p.y-gesture.start.y)>6;gesture.last=p;render();}else if(pointers.size===2&&gesture?.distance){const [a,b]=[...pointers.values()],d=Math.hypot(a.x-b.x,a.y-b.y);if(d>0)zoomAt((a.x+b.x)/2,(a.y+b.y)/2,gesture.span*gesture.distance/d);}});
 let lastTap=0;canvas.addEventListener('pointerup',e=>{const p=pos(e);if(pointers.size===1&&gesture&&!gesture.moved){const now=Date.now();if(now-lastTap<350){centre();lastTap=0;}else{lastTap=now;const place=hitTest(p.x,p.y,view,mask), pl=player();card.hidden=!place;if(place){const owner=world.factions[place.owner]?.name||place.owner||'不明',distance=pl?`${(Math.hypot(place.x-pl.x,place.z-pl.z)/1000).toFixed(1)} km`:'不明';card.replaceChildren();for(const line of [place.name,`規模: ${place.sizeJa||'拠点'}`,`所属: ${owner}`,place.note||place.sign||'',place.sign&&place.note?`「${place.sign}」`:'',`距離: ${distance}`])if(line){const div=document.createElement('div');div.textContent=line;card.append(div);}}}}pointers.delete(e.pointerId);gesture=null;});canvas.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);gesture=null;});
 return {button,open,close,updateFog,revealAll(){mask.fill(1);render();}};
}
