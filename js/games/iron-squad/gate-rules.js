import {WORLD_SIZE} from './world.js?v=106';
import {makeEscort,recalcEscortStats,updateEscortPatrol,npcSave,applyNpcSave} from './merchant-rules.js?v=106';
import {rebuildMerchantCasualties,carrierOf,sanitizeCarriers} from './casualty-rules.js?v=106';
const center=WORLD_SIZE/2;
export const GATE_HALF_WIDTH=80,HQ_WALL_HALF_SIZE=300;
export function wallGeometry(game) {
  if(game.currentDungeon?.kind==='town'){const d=game.currentDungeon;return {left:52,right:d.width-52,top:52,bottom:d.height-52,cx:d.width/2,cy:d.height/2,town:true};}
  if(game.currentDungeon)return null;
  return {left:center-HQ_WALL_HALF_SIZE,right:center+HQ_WALL_HALF_SIZE,top:center-HQ_WALL_HALF_SIZE,bottom:center+HQ_WALL_HALF_SIZE,cx:center,cy:center,town:false};
}
export function townExitReached(game) {
  if(game.currentDungeon?.kind!=='town')return false;
  const w=wallGeometry(game),u=game.player;
  return gatePositions(w).some(g=>g.side==='west'?u.x<w.left-4&&Math.abs(u.y-g.y)<GATE_HALF_WIDTH-10:g.side==='east'?u.x>w.right+4&&Math.abs(u.y-g.y)<GATE_HALF_WIDTH-10:g.side==='north'?u.y<w.top-4&&Math.abs(u.x-g.x)<GATE_HALF_WIDTH-10:u.y>w.bottom+4&&Math.abs(u.x-g.x)<GATE_HALF_WIDTH-10);
}
export function gatePositions(w) {
  return [{side:'north',x:w.cx,y:w.top},{side:'east',x:w.right,y:w.cy},{side:'south',x:w.cx,y:w.bottom},{side:'west',x:w.left,y:w.cy},...(!w.town?[{side:'east',x:w.right,y:w.cy+200}]:[])];
}
function blockingCrossing(w,from,to,radius=10) {
  const hits=[];
  for(const [side,value,vertical] of [['west',w.left,true],['east',w.right,true],['north',w.top,false],['south',w.bottom,false]]){
    const a=vertical?from.x:from.y,b=vertical?to.x:to.y;if(a===b||(a-value)*(b-value)>0)continue;
    const t=(value-a)/(b-a);if(t<0||t>1)continue;
    const along=(vertical?from.y:from.x)+((vertical?to.y:to.x)-(vertical?from.y:from.x))*t;
    const low=vertical?w.top:w.left,high=vertical?w.bottom:w.right;if(along<low||along>high)continue;
    if(gatePositions(w).some(g=>g.side===side&&Math.abs(along-(vertical?g.y:g.x))<GATE_HALF_WIDTH-Math.min(24,radius)))continue;
    hits.push({t,side,vertical,value,along});
  }
  return hits.sort((a,b)=>a.t-b.t)[0];
}
export function resolveWallMovement(game,actor,fromX,fromY,dt=1/60) {
  const w=wallGeometry(game);if(!w||actor.isDown||actor.carrierId)return false;
  const from={x:fromX,y:fromY},hit=blockingCrossing(w,from,actor,actor.radius||10);if(!hit)return false;
  if(actor===game.player){const fraction=Math.max(0,hit.t-.005);actor.x=fromX+(actor.x-fromX)*fraction;actor.y=fromY+(actor.y-fromY)*fraction;return true;}
  // AI takes a short detour to the nearest opening instead of piling up at a wall.
  const gates=gatePositions(w).filter(g=>g.side===hit.side).sort((a,b)=>Math.hypot(a.x-fromX,a.y-fromY)-Math.hypot(b.x-fromX,b.y-fromY));
  const waypoint={...gates[0]},vertical=hit.vertical,origin=vertical?fromX:fromY,sign=origin<hit.value?-1:1;
  if(vertical)waypoint.x+=sign*28;else waypoint.y+=sign*28;
  const dx=waypoint.x-fromX,dy=waypoint.y-fromY,d=Math.hypot(dx,dy),step=Math.min(d,(actor.speed||70)*dt);
  actor.x=fromX+(d?dx/d*step:0);actor.y=fromY+(d?dy/d*step:0);return true;
}
export function applyFortifications(game,dt) {
  const actors=[game.player,...(game.squad||[]).filter(s=>!game.currentDungeon||s.isPersonalGuard),...(game.monsters||[]),...(game.gateGuards||[]).filter(g=>gateGuardVisible(game,g)),...(game.merchants||[]).flatMap(m=>!game.currentDungeon?[m,...(m.escorts||[])]:[])];
  for(const u of actors){if(!u||u.dead)continue;const space=game.currentDungeon?.id||'field';
    if(u._wallSpace===space&&Number.isFinite(u._wallX)&&Math.hypot(u.x-u._wallX,u.y-u._wallY)<Math.max(180,(u.speed||100)*dt*3))resolveWallMovement(game,u,u._wallX,u._wallY,dt);
    u._wallSpace=space;u._wallX=u.x;u._wallY=u.y;
  }
}
export const gateGuardVisible=(game,g)=>!g.dead&&(g.gateSpace==='field'?!game.currentDungeon:g.gateSpace===game.currentDungeon?.id);
function buildGuard(game,id,name,x,y,space,distance=1200,index=0) {
  const owner={id,x,y,distance};const guard=makeEscort(owner,index%2,1);
  Object.assign(guard,{id,isGateGuard:true,name,title:'',gateSpace:space,gateOrigin:space,x,y,homeX:x,homeY:y});
  guard.escortBaseStats.hp=Math.round(guard.escortBaseStats.hp*1.3);guard.escortBaseStats.atk=Math.round(guard.escortBaseStats.atk*1.2);guard.hp=guard.maxHp=guard.escortBaseStats.hp;recalcEscortStats(guard);return guard;
}
export function initializeGateGuards(game,saved={}) {
  game.gateGuards=[];const w={left:center-300,right:center+300,top:center-300,bottom:center+300,cx:center,cy:center,town:false};
  for(const [i,g] of gatePositions(w).entries())game.gateGuards.push(buildGuard(game,`hq_gate_${i}`,`本陣門番・${['北門','東門','南門','西門','城下町門'][i]}`,g.x,g.y,'field',1200,i));
  for(const d of game.dungeons||[])if(d.kind==='town')for(let i=0;i<2;i++)game.gateGuards.push(buildGuard(game,`${d.id}_outer_guard_${i}`,`${d.name}・門番`,d.entrance.x+(i?52:-52),d.entrance.y+24,'field',Math.min(22000,d.distance||1200),i));
  for(const data of saved.gateGuards||[]){let guard=game.gateGuards.find(g=>g.id===data.id);
    if(!guard&&data.gateOrigin&&data.gateOrigin!=='field'){const town=(game.dungeons||[]).find(d=>d.id===data.gateOrigin&&d.kind==='town');if(town){ensureTownGuards(game,town);guard=game.gateGuards.find(g=>g.id===data.id);}}
    if(guard){applyNpcSave(guard,data);guard.gateSpace=data.gateSpace||guard.gateSpace;recalcEscortStats(guard);}
  }
  rebuildMerchantCasualties(game);sanitizeCarriers(game);applyFortifications(game,0);
}
export function ensureTownGuards(game,town) {
  const w={left:52,right:town.width-52,top:52,bottom:town.height-52,cx:town.width/2,cy:town.height/2,town:true};
  for(const [i,g] of gatePositions(w).entries()){const id=`${town.id}_inner_guard_${i}`;if(!game.gateGuards.some(s=>s.id===id))game.gateGuards.push(buildGuard(game,id,`${town.name}・${['北','東','南','西'][i]}門番`,g.x+(g.side==='east'?-18:g.side==='west'?18:0),g.y+(g.side==='north'?18:g.side==='south'?-18:0),town.id,Math.min(22000,town.distance||1200),i));}
}
export function serializeGateGuards(game) {return (game.gateGuards||[]).map(g=>{
  const data={id:g.id,gateSpace:g.gateSpace,gateOrigin:g.gateOrigin,...npcSave(g)};
  if(game.currentDungeon&&g.gateSpace===game.currentDungeon.id&&g.carrierId&&game.savedFieldPos){data.gateSpace='field';data.x=game.savedFieldPos.x-12;data.y=game.savedFieldPos.y+10;data.homeX=center;data.homeY=center;}
  return data;
});}
export function exitGateTown(game,townId) {
  for(const g of game.gateGuards||[])if(g.gateSpace===townId&&g.isDown&&g.carrierId){const carrier=carrierOf(game,g);if(carrier){g.gateSpace='field';g.x=carrier.x-12;g.y=carrier.y+10;g.homeX=center;g.homeY=center;}}
}
export function updateGateGuards(game,dt) {
  if(!(dt>0)||game.restTimer>0)return;
  const monsters=game.monsters||[];
  for(const guard of game.gateGuards||[]){if(!gateGuardVisible(game,guard)||guard.isDown)continue;
    const home={x:guard.homeX,y:guard.homeY,escorts:[guard]},near=game.player&&Math.hypot(guard.x-game.player.x,guard.y-game.player.y)<850;
    if(!near&&!guard.returningToBase&&!monsters.some(m=>m.hp>0&&Math.hypot(m.x-home.x,m.y-home.y)<380))continue;
    updateEscortPatrol(game,home,dt,monsters,{damageMonster:(unit,m,damage)=>{if(m.hp>0)game.performAttack(unit,m,false,damage);}});
    for(const m of monsters)if(m.hp>0&&Math.hypot(m.x-guard.x,m.y-guard.y)<(m.radius||14)+guard.radius){m._gateAtk=(m._gateAtk||0)-dt;if(m._gateAtk<=0){m._gateAtk=1;game.damageTarget(guard,m.atk||10);}}
  }
}
export function drawFortification(ctx,game) {
  const w=wallGeometry(game);if(!w)return;const gates=gatePositions(w),level=game.nation?.level||0;
  ctx.save();ctx.strokeStyle=level>=3?'#b2aa96':'#777d73';ctx.lineWidth=12;ctx.lineCap='butt';
  for(const [side,start,end,fixed,vertical] of [['north',w.left,w.right,w.top,false],['south',w.left,w.right,w.bottom,false],['west',w.top,w.bottom,w.left,true],['east',w.top,w.bottom,w.right,true]]){
    const openings=gates.filter(g=>g.side===side).map(g=>vertical?g.y:g.x).sort((a,b)=>a-b);let cursor=start;
    for(const middle of [...openings,end+GATE_HALF_WIDTH]){ctx.beginPath();if(vertical){ctx.moveTo(fixed,cursor);ctx.lineTo(fixed,Math.min(end,middle-GATE_HALF_WIDTH));}else{ctx.moveTo(cursor,fixed);ctx.lineTo(Math.min(end,middle-GATE_HALF_WIDTH),fixed);}ctx.stroke();cursor=middle+GATE_HALF_WIDTH;}
  }
  ctx.fillStyle='#656e69';for(const x of [w.left,w.right])for(const y of [w.top,w.bottom]){ctx.fillRect(x-13,y-13,26,26);ctx.fillStyle='#aaa793';ctx.fillRect(x-15,y-15,30,6);ctx.fillStyle='#656e69';}
  for(const g of gates){const vertical=g.side==='east'||g.side==='west';ctx.fillStyle='#9a917b';for(const sign of [-1,1])ctx.fillRect(g.x+(vertical?-10:sign*GATE_HALF_WIDTH-10),g.y+(vertical?sign*GATE_HALF_WIDTH-10:-10),20,20);if(w.town){ctx.font='10px sans-serif';ctx.textAlign='center';ctx.fillStyle='#e0d1ae';ctx.fillText('外へ',g.x,g.y-16);}}
  ctx.restore();
}
