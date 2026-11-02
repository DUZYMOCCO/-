import { panels } from './panels.js';
import { WORLD_LAYOUT as world } from '../data/world_layout.js';
import { clampZoom, worldToMap, mapToWorld, reveal, hitTest, drawMap, explored, movementLinePoints, isMapTap, movementDrawParams } from './map_draw.js';
import { mapTapWorldPoint, resolveMapDestination } from './map_move.js';

export function createMapPanel(getState, all=false, options={}) {
 const panelManager=options.panels||panels;
 const mask=new Uint8Array(4096); if(all) mask.fill(1);
 const root=document.createElement('div'); root.className='map-overlay'; root.hidden=true;
 root.innerHTML='<section class="map-panel" aria-label="地図"><header><button class="map-close" aria-label="戻る">戻る</button><strong>地図</strong><button class="map-centre">現在地</button></header><canvas aria-label="地図。ドラッグで移動、ピンチまたはホイールで拡大縮小"></canvas><details class="map-legend"><summary>凡例</summary><div></div></details><div class="map-card" hidden></div><div class="map-status" role="status" aria-live="polite" hidden></div><div class="map-hint">ドラッグで移動 · ピンチ / ホイールで拡大縮小</div></section>';
 document.body.append(root); const canvas=root.querySelector('canvas'),ctx=canvas.getContext('2d'),card=root.querySelector('.map-card'),status=root.querySelector('.map-status');
 const button=document.createElement('button');button.type='button';button.className='opt-toggle';button.textContent='地図';
 const legend=root.querySelector('.map-legend div'); for(const id of new Set(world.regions.map(r=>r.owner))){const f=world.factions[id];if(!f)continue;const row=document.createElement('div'),dot=document.createElement('i');dot.style.background=f.color;row.append(dot,document.createTextNode(f.name));legend.append(row);}
 const view={x:0,z:0,span:6000,width:1,height:1}; let timer=null,statusTimer=null,lastX=Infinity,lastZ=Infinity,lastMove=null; const lastMoveTargets=new Map(); const pointers=new Map(); let gesture=null,lastTap=0,lastTapPos=null;
 const player=()=>{const s=getState();return s.actors.find(a=>a.id===s.playerId);};
 function dynamicPlaces(s) {
  const places=[];
  if(s.blackmarketDiscovered){const h=(s.town?.houses||[]).find(h=>h.blackmarket);if(h)places.push({...h,name:h.name,sizeJa:'闇市',mapKind:'blackmarket',owner:'不明'});}
  for(const outpost of s.outposts?.items||[])if(explored(mask,outpost.x,outpost.z))places.push({...outpost,name:outpost.name||'自分の拠点',sizeJa:'拠点',owner:'player',mapKind:'outpost'});
  for(const house of s.town?.houses||[])if(house.owner==='player'&&explored(mask,house.x,house.z))places.push({...house,name:house.name||house.townId||'町の建物',sizeJa:'町の建物',owner:'player',mapKind:'house'});
  return places;
 }
 function updateFog(force=false){const p=player();if(!p)return false;if(!force&&Math.hypot(p.x-lastX,p.z-lastZ)<100)return false;lastX=p.x;lastZ=p.z;return reveal(mask,p.x,p.z);}
 function drawPlaceExtras(s) {
  if(s.blackmarketDiscovered){const h=(s.town?.houses||[]).find(h=>h.blackmarket);if(h){const q=worldToMap(h.x,h.z,view);ctx.fillStyle='#e6a860';ctx.strokeStyle='#201b15';ctx.beginPath();ctx.arc(q.x,q.y,5,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillText(h.name,q.x,q.y-8);}}
  for(const outpost of s.outposts?.items||[]){if(!explored(mask,outpost.x,outpost.z))continue;const q=worldToMap(outpost.x,outpost.z,view);ctx.fillStyle='#e8c35f';ctx.strokeStyle='#201b15';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(q.x,q.y-6);ctx.lineTo(q.x+5,q.y);ctx.lineTo(q.x,q.y+6);ctx.lineTo(q.x-5,q.y);ctx.closePath();ctx.fill();ctx.stroke();}
  for(const house of s.town?.houses||[]){if(house.owner!=='player'||!explored(mask,house.x,house.z))continue;const q=worldToMap(house.x,house.z,view);ctx.fillStyle='#86d7cb';ctx.strokeStyle='#163b39';ctx.fillRect(q.x-4,q.y-4,8,8);ctx.strokeRect(q.x-4,q.y-4,8,8);}
 }
 function drawMove(s) {
  if(!lastMove)return;
  const actors=(lastMove.actorIds||[]).map(id=>s.actors.find(a=>a.id===id)).filter(a=>a&&a.state!=='dead');
  if(!actors.length){lastMove=null;lastMoveTargets.clear();return;}
  let allArrived=true;
  for(const actor of actors){
   if(actor.moveTo&&Number.isFinite(actor.moveTo.x)&&Number.isFinite(actor.moveTo.z)){
    const previous=lastMoveTargets.get(actor.id);
    if(previous&&Math.hypot(previous.x-actor.moveTo.x,previous.z-actor.moveTo.z)>.05){lastMove=null;lastMoveTargets.clear();return;}
    lastMoveTargets.set(actor.id,{x:actor.moveTo.x,z:actor.moveTo.z});allArrived=false;
   }else{
    const target=lastMoveTargets.get(actor.id);
    if(!target){allArrived=false;continue;}
    if(Math.hypot(target.x-actor.x,target.z-actor.z)>3.5){
     if(actor.targetId!=null||actor.state==='fight'||actor.state==='down'||actor.state==='getup'||actor.task||actor.townTask){lastMove=null;lastMoveTargets.clear();return;}
     allArrived=false;
    }
   }
  }
  if(allArrived){lastMove=null;lastMoveTargets.clear();return;}
  const {routeLineWidth,destinationRadius,labelFontSize}=movementDrawParams(view.width,view.height,window.devicePixelRatio||1);
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  for(const actor of actors){const remembered=lastMoveTargets.get(actor.id),lineActor=actor.moveTo?actor:{...actor,moveTo:remembered||{x:lastMove.x,z:lastMove.z}},points=movementLinePoints(lineActor,actor.moveTo?options.getRoute?.(actor):null),screen=points.map(p=>worldToMap(p.x,p.z,view));if(screen.length<2)continue;ctx.beginPath();ctx.moveTo(screen[0].x,screen[0].y);for(const p of screen.slice(1))ctx.lineTo(p.x,p.y);ctx.lineWidth=routeLineWidth+4;ctx.strokeStyle='#101820';ctx.setLineDash([]);ctx.stroke();ctx.lineWidth=routeLineWidth;ctx.strokeStyle='#48efff';ctx.setLineDash([10,7]);ctx.stroke();}
  ctx.setLineDash([]);const target=worldToMap(lastMove.x,lastMove.z,view);ctx.fillStyle='#ffd447';ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(target.x,target.y,destinationRadius,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#18313b';ctx.beginPath();ctx.arc(target.x,target.y,Math.max(3,destinationRadius*.22),0,Math.PI*2);ctx.fill();
  const label=lastMove.placeName||'指定地点',labelY=target.y+destinationRadius+5;ctx.font=`700 ${labelFontSize}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='top';ctx.lineJoin='round';ctx.lineWidth=4;ctx.strokeStyle='#101820';ctx.strokeText(label,target.x,labelY);ctx.fillStyle='#fff8dc';ctx.fillText(label,target.x,labelY);ctx.restore();
 }
 function render(){
  if(root.hidden)return;
  const rect=canvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1;view.width=rect.width;view.height=rect.height;if(!view.width||!view.height)return;
  canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
  const s=getState(),p=player(),ids=new Set((s.playerSquads||[]).flatMap(sq=>sq.memberIds||[]));
  drawMap(ctx,view,mask,p,s.actors.filter(a=>ids.has(a.id)&&a.id!==p?.id));drawPlaceExtras(s);drawMove(s);
 }
 function centre(){const p=player();if(p){view.x=p.x;view.z=p.z;}card.hidden=true;render();}
 function announce(message){clearTimeout(statusTimer);status.textContent=message;status.hidden=!message;if(message)statusTimer=setTimeout(()=>{status.hidden=true;status.textContent='';},2600);}
 function issueMove(point,place=null){
  const destination=resolveMapDestination(point,place,options.canWalk);
  if(!destination.ok){announce(destination.reason);return destination;}
  if(typeof options.onMove!=='function'){const result={ok:false,reason:'移動命令を利用できません'};announce(result.reason);return result;}
  const result=options.onMove(destination.x,destination.z,place);
  if(result===false||result?.ok===false){const denied={ok:false,reason:result?.reason||result?.message||'移動命令を出せませんでした'};announce(denied.reason);return denied;}
  const actorIds=result?.actorIds||[];
  lastMoveTargets.clear();
  lastMove=actorIds.length?{x:Number.isFinite(result.x)?result.x:destination.x,z:Number.isFinite(result.z)?result.z:destination.z,actorIds:[...actorIds],placeName:place?.name||'指定地点'}:null;
  if(lastMove)announce(`${place?.name||'指定地点'}へ向かう（${actorIds.length}人）`);
  render();
  return result;
 }
 function fitMovement(){
  const s=getState(),actors=(lastMove?.actorIds||[]).map(id=>s.actors.find(a=>a.id===id)).filter(a=>a&&a.state!=='dead');
  const points=actors.flatMap(actor=>{const target=actor.moveTo||lastMoveTargets.get(actor.id)||{x:lastMove.x,z:lastMove.z};return movementLinePoints(actor.moveTo?actor:{...actor,moveTo:target},actor.moveTo?options.getRoute?.(actor):null);});
  if(lastMove)points.push({x:lastMove.x,z:lastMove.z});
  if(!points.length)return {...view};
  const rect=canvas.getBoundingClientRect(),width=rect.width||view.width,height=rect.height||view.height;
  if(!width||!height)return {...view};
  let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
  for(const point of points){minX=Math.min(minX,point.x);maxX=Math.max(maxX,point.x);minZ=Math.min(minZ,point.z);maxZ=Math.max(maxZ,point.z);}
  const padding=40;
  view.width=width;view.height=height;view.x=(minX+maxX)/2;view.z=(minZ+maxZ)/2;
  view.span=clampZoom(Math.max((maxX-minX)*width/Math.max(1,width-padding*2),(maxZ-minZ)*width/Math.max(1,height-padding*2),500));
  render();return {...view};
 }
 function open(){updateFog(true);panelManager.open('map');root.hidden=false;centre();clearInterval(timer);let previous='';timer=setInterval(()=>{const s=getState(),ids=new Set((s.playerSquads||[]).flatMap(sq=>sq.memberIds||[]));const signature=s.actors.filter(a=>a.id===s.playerId||ids.has(a.id)).map(a=>[a.id,a.x,a.z,a.rot,a.moveTo?.x,a.moveTo?.z,a.state].join(':')).join('|')+':'+(s.outposts?.rev||0)+':'+(s.town?.houses||[]).filter(h=>h.owner==='player').map(h=>h.id).join(',')+':'+!!s.blackmarketDiscovered;if(signature!==previous||lastMove){previous=signature;render();}},500);}
 function close(){panelManager.close('map');}
 function toggle(){if(root.hidden)open();else close();}
 panelManager.register('map',{nonModal:true,contains:t=>root.querySelector('.map-panel').contains(t),close:()=>{root.hidden=true;clearInterval(timer);timer=null;clearTimeout(statusTimer);statusTimer=null;pointers.clear();gesture=null;}});
 root.querySelector('.map-close').onclick=close;root.querySelector('.map-centre').onclick=centre;button.onclick=toggle;
 window.addEventListener('resize',render);
 const pos=e=>{const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};};
 function zoomAt(x,y,span){const before=mapToWorld(x,y,view);view.span=clampZoom(span);const after=mapToWorld(x,y,view);view.x+=before.x-after.x;view.z+=before.z-after.z;render();}
 canvas.addEventListener('wheel',e=>{e.preventDefault();lastTap=0;lastTapPos=null;const p=pos(e);zoomAt(p.x,p.y,view.span*Math.exp(e.deltaY*.001));},{passive:false});
 canvas.addEventListener('contextmenu',e=>e.preventDefault());
 canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;canvas.setPointerCapture(e.pointerId);const p=pos(e);pointers.set(e.pointerId,p);if(pointers.size===1)gesture={start:p,last:p,moved:false,multitouch:false};else{const [a,b]=[...pointers.values()];gesture={start:null,last:null,moved:true,multitouch:true,distance:pointers.size===2?Math.hypot(a.x-b.x,a.y-b.y):0,span:view.span};lastTap=0;lastTapPos=null;}});
 canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;const p=pos(e);pointers.set(e.pointerId,p);if(pointers.size===1&&gesture?.last){const dx=p.x-gesture.last.x,dy=p.y-gesture.last.y;view.x-=dx*view.span/view.width;view.z-=dy*view.span/view.width;gesture.moved ||= !isMapTap(gesture.start,p,false);gesture.last=p;render();}else if(pointers.size===2){const [a,b]=[...pointers.values()],d=Math.hypot(a.x-b.x,a.y-b.y);if(d>0&&gesture?.distance)zoomAt((a.x+b.x)/2,(a.y+b.y)/2,gesture.span*gesture.distance/d);else if(d>0){gesture={multitouch:true,moved:true,distance:d,span:view.span};}}});
 canvas.addEventListener('pointerup',e=>{const p=pos(e),active=gesture;if(active?.start&&!isMapTap(active.start,p,active.multitouch))active.moved=true;
  if(pointers.size===1&&active&&!active.moved&&isMapTap(active.start,p,active.multitouch)){
   const now=Date.now(),isDouble=lastTap>0&&now-lastTap<350&&lastTapPos&&Math.hypot(p.x-lastTapPos.x,p.y-lastTapPos.y)<=12;
   if(isDouble){centre();lastTap=0;lastTapPos=null;}
   else{lastTap=now;lastTapPos=p;const s=getState(),extras=dynamicPlaces(s),place=hitTest(p.x,p.y,view,mask,extras),playerActor=player(),point=mapTapWorldPoint(e.clientX,e.clientY,canvas.getBoundingClientRect(),view);
    if(place){const owner=world.factions[place.owner]?.name||(place.owner==='player'?'自陣営':place.owner||'不明'),distance=playerActor?`${(Math.hypot(place.x-playerActor.x,place.z-playerActor.z)/1000).toFixed(1)} km`:'不明';card.replaceChildren();for(const line of [place.name,`規模: ${place.sizeJa||'拠点'}`,`所属: ${owner}`,place.note||place.sign||'',place.sign&&place.note?`「${place.sign}」`:'',`距離: ${distance}`])if(line){const div=document.createElement('div');div.textContent=line;card.append(div);}}
    else card.hidden=true;
    issueMove(point,place);
   }
  }else if(active?.moved||active?.multitouch){lastTap=0;lastTapPos=null;}
  pointers.delete(e.pointerId);gesture=null;
 });
 canvas.addEventListener('pointercancel',()=>{pointers.clear();gesture=null;lastTap=0;lastTapPos=null;});
 return {button,open,close,updateFog,revealAll(){mask.fill(1);render();},moveTo(x,z,place=null){return issueMove({x,z},place);},fitMovement,getView:()=>({...view}),getMovement:()=>lastMove?{...lastMove,actorIds:[...lastMove.actorIds]}:null};
}
