import {recordHealing} from './phase-rules.js';
import {WORLD_SIZE} from './world.js';

export const RESCUE_TIMEOUT = 45; // 救助猶予時間（秒）広域マップ対応で45秒に延長
export const isMedic=unit=>['MEDIC','HIGH_PRIEST'].includes(unit?.soldierClass);
export const carryingCapacity=unit=>unit?.soldierClass==='PALADIN'?2:1;
export const carrierKey=(game,unit)=>unit===game.player?'player':unit?.id;
export const carriedSoldiers=(game,unit)=>!unit?[]:(game.squad||[]).filter(s=>s.isDown&&!s.dead&&s.carrierId===carrierKey(game,unit));
export const transportSpeedFactor=(game,unit)=>carriedSoldiers(game,unit).length>1?.55:carriedSoldiers(game,unit).length?.72:1;
export const carrierOf=(game,wounded)=>wounded.carrierId==='player'?game.player:(game.squad||[]).find(s=>s.id===wounded.carrierId);

export function aidStations(game) {
  return [{x:WORLD_SIZE/2,y:WORLD_SIZE/2,radius:150,name:'本陣'},...(game.outposts||[]).filter(o=>o.cleared).map(o=>({...o,radius:(o.radius||30)+24}))];
}
export function nearestAidStation(game,unit) {
  return aidStations(game).sort((a,b)=>Math.hypot(unit.x-a.x,unit.y-a.y)-Math.hypot(unit.x-b.x,unit.y-b.y))[0];
}
export function attachWounded(game,carrier,wounded) {
  if(!carrier||carrier.dead||carrier.isDown||carrier.hp<=0||!wounded?.isDown||wounded.dead||wounded===carrier||wounded.carrierId)return false;
  const distance=Math.hypot(carrier.x-wounded.x,carrier.y-wounded.y);
  if(wounded.releasedBy===carrierKey(game,carrier)) {if(distance<=65)return false;delete wounded.releasedBy;}
  if(distance>45||carriedSoldiers(game,carrier).length>=carryingCapacity(carrier))return false;
  delete wounded.releasedBy;wounded.carrierId=carrierKey(game,carrier);wounded.rescueProgress=0;delete wounded.rescueHealerId;
  return true;
}
export function releaseWounded(game,carrier) {
  for(const wounded of carriedSoldiers(game,carrier)){delete wounded.carrierId;wounded.releasedBy=carrierKey(game,carrier);}
}
export function sanitizeCarriers(game) {
  const counts=new Map();
  for(const wounded of game.squad||[]) {
    if(!wounded.carrierId)continue;
    const carrier=carrierOf(game,wounded),count=counts.get(wounded.carrierId)||0;
    if(!wounded.isDown||wounded.dead||!carrier||carrier.dead||carrier.isDown||carrier.hp<=0||count>=carryingCapacity(carrier))delete wounded.carrierId;
    else counts.set(wounded.carrierId,count+1);
  }
}
function revive(game,wounded,hp) {
  wounded.isDown=false;wounded.hp=Math.max(1,Math.floor(hp));wounded.rescueProgress=0;wounded.downTimer=0;
  delete wounded.carrierId;delete wounded.rescueHealerId;
  game.showToast?.(`${wounded.name}が復活しました`);
}
export function treatWounded(game,medic,wounded,dt) {
  if(!Number.isFinite(dt)||dt<=0||!isMedic(medic)||medic.dead||medic.isDown||medic.hp<=0||!wounded?.isDown||wounded.dead||Math.hypot(medic.x-wounded.x,medic.y-wounded.y)>40)return false;
  wounded.rescueProgress=(wounded.rescueProgress||0)+dt*(medic.soldierClass==='HIGH_PRIEST'?2.8:1.1);
  if(wounded.rescueProgress<1)return false;
  revive(game,wounded,wounded.maxHp*.35);recordHealing(medic,wounded.hp);return true;
}
export function updateWounded(game,dt) {
  sanitizeCarriers(game);
  if(game.player?.hp>0)for(const wounded of game.squad||[])attachWounded(game,game.player,wounded);
  for(const wounded of game.squad||[]) {
    if(!wounded.isDown||wounded.dead)continue;
    wounded.hp=0;
    const station=nearestAidStation(game,wounded);
    if(Math.hypot(wounded.x-station.x,wounded.y-station.y)<=station.radius) {revive(game,wounded,wounded.maxHp);continue;}
    if(wounded.carrierId)continue;
    wounded.downTimer=Math.max(0,(wounded.downTimer??RESCUE_TIMEOUT)-dt);
    if(wounded.downTimer<=0) {
      wounded.dead=true;wounded.isDown=false;wounded.rescueProgress=0;
      game.phaseCasualties=(game.phaseCasualties||0)+1;
      game.showToast?.(`${wounded.name}は力尽きました`);
    }
  }
}
export function handleTransportAI(game,soldier,dt) {
  if(soldier.dead||soldier.isDown)return false;
  const carried=carriedSoldiers(game,soldier);
  // Medics treat in place; everyone else collects nearby casualties and returns to aid.
  const candidate=!isMedic(soldier)&&carried.length<carryingCapacity(soldier)?(game.squad||[])
    .filter(s=>s!==soldier&&s.isDown&&!s.dead&&!s.carrierId&&Math.hypot(s.x-soldier.x,s.y-soldier.y)<(carried.length?160:240))
    .sort((a,b)=>Math.hypot(a.x-soldier.x,a.y-soldier.y)-Math.hypot(b.x-soldier.x,b.y-soldier.y))[0]:null;
  if(candidate&&attachWounded(game,soldier,candidate))return true;
  const destination=candidate || (carried.length?nearestAidStation(game,soldier):null);
  if(!destination)return false;
  const dx=destination.x-soldier.x,dy=destination.y-soldier.y,d=Math.hypot(dx,dy);
  if(d>1){const step=Math.min(d,(soldier.speed||80)*transportSpeedFactor(game,soldier)*dt);soldier.x+=dx/d*step;soldier.y+=dy/d*step;soldier.vx=dx/d;soldier.vy=dy/d;soldier.facingAngle=Math.atan2(dy,dx);}
  return true;
}
export function syncDragged(game,dt) {
  sanitizeCarriers(game);
  for(const carrier of [game.player,...(game.squad||[])].filter(Boolean)) {
    const list=carriedSoldiers(game,carrier);
    list.forEach((wounded,i)=>{
      const angle=(carrier.facingAngle||0)+Math.PI+(list.length>1?(i?-.4:.4):0);
      const x=carrier.x+Math.cos(angle)*38,y=carrier.y+Math.sin(angle)*38;
      const blend=Math.min(1,dt*8);
      wounded.x+=(x-wounded.x)*blend;wounded.y+=(y-wounded.y)*blend;wounded.vx=0;wounded.vy=0;
    });
  }
}

export function orbDropChance(monster,distance) {
  if(monster.isColossal)return distance>=4400?.45:0;
  if(distance<2700)return 0;
  return monster.isBoss?.12:monster.isElite?.02:0;
}
