import {drawStoneFortification} from './fortification-visuals.js?v=132';
import {WORLD_SIZE} from './world.js?v=132';
import {inCurrentInstance} from './instance-rules.js?v=132';
import {makeEscort,recalcEscortStats,updateEscortPatrol,npcSave,applyNpcSave} from './merchant-rules.js?v=132';
import {rebuildMerchantCasualties,carrierOf,sanitizeCarriers} from './casualty-rules.js?v=132';
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
export function wallBlocksAttack(game,attacker,target) {const w=wallGeometry(game);return !!w&&!!blockingCrossing(w,attacker,target,1);}
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
export const gateGuardVisible=(game,g)=>!g.dead&&(game.currentDungeon?inCurrentInstance(game,g):g.gateSpace==='field');
function buildGuard(game,id,name,x,y,space,distance=1200,index=0) {
  const owner={id,x,y,distance};const guard=makeEscort(owner,index%2,1);
  Object.assign(guard,{id,isGateGuard:true,name,title:'',gateSpace:space,gateOrigin:space,x,y,homeX:x,homeY:y});
  guard.escortBaseStats.hp=Math.round(guard.escortBaseStats.hp*1.3);guard.escortBaseStats.atk=Math.round(guard.escortBaseStats.atk*1.2);guard.hp=guard.maxHp=guard.escortBaseStats.hp;recalcEscortStats(guard);return guard;
}
export const GATE_REFILL_WAVES=2;
function registerPost(game,def) {
  const known=game.gatePosts.find(p=>p.id===def.id);if(known)return known;
  const post={...def,serial:0,refillAtPhase:0};game.gatePosts.push(post);return post;
}
function townInteriorPosts(game,town) {
  const w={left:52,right:town.width-52,top:52,bottom:town.height-52,cx:town.width/2,cy:town.height/2,town:true};
  return gatePositions(w).map((g,i)=>registerPost(game,{id:`${town.id}_inner_guard_${i}`,name:`${town.name}・${['北','東','南','西'][i]}門番`,x:g.x+(g.side==='east'?-18:g.side==='west'?18:0),y:g.y+(g.side==='north'?18:g.side==='south'?-18:0),space:town.id,townId:town.id,distance:Math.min(22000,town.distance||1200),index:i}));
}
function guardAtPost(game,post) {
  return game.gateGuards.some(g=>g.gatePostId===post.id&&!g.dead&&!g.rescuedToBase&&g.gateSpace===post.space);
}
function newGuardAtPost(game,post,id=null) {
  id ||= post.serial?`${post.id}_replacement_${post.serial}`:post.id;
  const guard=buildGuard(game,id,post.name,post.x,post.y,post.space,post.distance,post.index);
  guard.gatePostId=post.id;guard.gateTownId=post.townId||null;game.gateGuards.push(guard);return guard;
}
export function initializeGateGuards(game,saved={}) {
  game.gateGuards=[];game.gatePosts=[];game._gateRefillPhase=0;
  const w={left:center-300,right:center+300,top:center-300,bottom:center+300,cx:center,cy:center,town:false};
  for(const [i,g] of gatePositions(w).entries())registerPost(game,{id:`hq_gate_${i}`,name:`本陣門番・${['北門','東門','南門','西門','城下町門'][i]}`,x:g.x,y:g.y,space:'field',townId:null,distance:1200,index:i});
  for(const d of game.dungeons||[])if(d.kind==='town'){
    for(let i=0;i<2;i++)registerPost(game,{id:`${d.id}_outer_guard_${i}`,name:`${d.name}・門番`,x:d.entrance.x+(i?52:-52),y:d.entrance.y+24,space:'field',townId:d.id,distance:Math.min(22000,d.distance||1200),index:i});
    if((saved.gateGuards||[]).some(g=>g.gateOrigin===d.id)||(saved.gatePosts||[]).some(p=>p.space===d.id))townInteriorPosts(game,d);
  }
  for(const old of saved.gatePosts||[]){const post=game.gatePosts.find(p=>p.id===old.id);if(post){post.serial=Math.max(0,Math.floor(old.serial||0));post.refillAtPhase=Math.max(0,Math.floor(old.refillAtPhase||0));}}
  for(const data of saved.gateGuards||[]){const post=game.gatePosts.find(p=>p.id===(data.gatePostId||data.id)||data.id?.startsWith(`${p.id}_replacement_`));if(!post)continue;
    const guard=newGuardAtPost(game,post,data.id);applyNpcSave(guard,data);guard.gateSpace=data.gateSpace||guard.gateSpace;recalcEscortStats(guard);
    const serial=Number(data.id?.split('_replacement_')[1])||0;post.serial=Math.max(post.serial,serial);
  }
  for(const post of game.gatePosts)if(!game.gateGuards.some(g=>g.gatePostId===post.id)&&!post.refillAtPhase)newGuardAtPost(game,post);
  replenishTownGateGuards(game);rebuildMerchantCasualties(game);sanitizeCarriers(game);applyFortifications(game,0);
}
export function ensureTownGuards(game,town) {
  game.gatePosts ||= [];game.gateGuards ||= [];
  for(const post of townInteriorPosts(game,town))if(!game.gateGuards.some(g=>g.gatePostId===post.id)&&!post.refillAtPhase)newGuardAtPost(game,post);
  replenishTownGateGuards(game);
}
export function replenishTownGateGuards(game) {
  const phase=game.phase||1;let count=0;
  for(const post of game.gatePosts||[]){if(!post.townId)continue;
    if(guardAtPost(game,post)){post.refillAtPhase=0;continue;}
    if(!post.refillAtPhase){post.refillAtPhase=phase+GATE_REFILL_WAVES;continue;}
    if(phase<post.refillAtPhase)continue;
    post.serial++;newGuardAtPost(game,post);post.refillAtPhase=0;count++;
  }
  if(count)game.showToast?.(`町の門番${count}名が新任として着任。救助した門番は本陣に残ります`);
  return count;
}
export const gateMethods={
  onGateGuardRelocated(guard) {
    const post=(this.gatePosts||[]).find(p=>p.id===guard?.gatePostId);
    if(post?.townId&&!guardAtPost(this,post)&&!post.refillAtPhase)post.refillAtPhase=(this.phase||1)+GATE_REFILL_WAVES;
  }
};
export const serializeGatePosts=game=>(game.gatePosts||[]).map(p=>({...p}));
export function serializeGateGuards(game) {return (game.gateGuards||[]).map(g=>{
  const data={id:g.id,gateSpace:g.gateSpace,gateOrigin:g.gateOrigin,gatePostId:g.gatePostId,gateTownId:g.gateTownId,...npcSave(g)};
  if(game.currentDungeon&&inCurrentInstance(game,g)&&g.carrierId&&game.savedFieldPos){data.gateSpace='field';data.x=game.savedFieldPos.x-12;data.y=game.savedFieldPos.y+10;data.homeX=center;data.homeY=center;}
  return data;
});}
export function exitGateTown(game,townId) {
  for(const g of game.gateGuards||[])if(g.gateSpace===townId&&g.isDown&&g.carrierId){const carrier=carrierOf(game,g);if(carrier){g.gateSpace='field';g.x=carrier.x-12;g.y=carrier.y+10;g.homeX=center;g.homeY=center;}}
}
export function updateGateGuards(game,dt) {
  if(!(dt>0)||game.restTimer>0)return;
  if(game._gateRefillPhase!==(game.phase||1)){game._gateRefillPhase=game.phase||1;replenishTownGateGuards(game);}
  const monsters=game.monsters||[];
  for(const guard of game.gateGuards||[]){if(!gateGuardVisible(game,guard)||guard.isDown)continue;
    const home={x:guard.homeX,y:guard.homeY,escorts:[guard]},near=game.player&&Math.hypot(guard.x-game.player.x,guard.y-game.player.y)<850;
    if(!near&&!guard.returningToBase&&!monsters.some(m=>m.hp>0&&Math.hypot(m.x-home.x,m.y-home.y)<380))continue;
    updateEscortPatrol(game,home,dt,monsters,{damageMonster:(unit,m,damage)=>{if(m.hp>0)game.performAttack(unit,m,false,damage);}});
    for(const m of monsters)if(m.hp>0&&Math.hypot(m.x-guard.x,m.y-guard.y)<(m.radius||14)+guard.radius){m._gateAtk=(m._gateAtk||0)-dt;if(m._gateAtk<=0){m._gateAtk=1;game.damageTarget(guard,m.atk||10);}}
  }
}
export function drawFortification(ctx,game) {
  const wall=wallGeometry(game);if(!wall)return;
  drawStoneFortification(ctx,game,wall,gatePositions(wall),GATE_HALF_WIDTH);
}
