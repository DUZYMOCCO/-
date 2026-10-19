import {attributeFamily,prefersCasterMelee} from './unit-attributes.js?v=334';
import {guardSpeedMult} from './guard-leash.js?v=266';

export const GUARD_FORMATION=Object.freeze({dashStart:60,dashStop:20,engage:360});
// These headings, targets and catch-up flags are frame state, never save data.
const sessions=new WeakMap();
const rear=unit=>!prefersCasterMelee(unit)&&(['MAGE','MEDIC','ARCHER'].includes(attributeFamily(unit))
  ||['bow','crossbow','cannon','staff','wand'].includes((unit.equipped?.weapon||unit.weapon)?.weaponStyle));
export const guardFormationRole=unit=>rear(unit)?'rear':'front';
const heading=game=>{
  const j=game.joystick;
  return j?.active&&Math.hypot(j.dirX||0,j.dirY||0)>.05?Math.atan2(j.dirY,j.dirX):Number.isFinite(game.player?.facingAngle)?game.player.facingAngle:0;
};
function sessionFor(game){
  let session=sessions.get(game);const space=game.currentDungeon?.id||game.currentDungeon||'field';
  if(!session||session.player!==game.player||session.space!==space){session={player:game.player,space,tick:0,dt:0,angle:heading(game),units:new WeakMap(),slots:new Map()};sessions.set(game,session);}
  return session;
}
/** Called once after commander movement, before any guard AI. */
export function beginGuardFormation(game,dt){
  const s=sessionFor(game);s.tick++;s.dt=Math.min(.1,Math.max(0,dt||0));s.angle=heading(game);s.slots.clear();
  for(const role of ['front','rear']){
    const units=(game.squad||[]).filter(u=>u?.isPersonalGuard&&!u.dead&&!u.isDown&&!u.heroPartyId&&guardFormationRole(u)===role)
      .sort((a,b)=>(a._guardSlot??0)-(b._guardSlot??0));
    units.forEach((unit,rank)=>s.slots.set(unit,{rank,count:units.length,role}));
  }
}
function entryFor(s,unit){let entry=s.units.get(unit);if(!entry){entry={tick:-1,catchingUp:false};s.units.set(unit,entry);}return entry;}
/** Straight offset interpolation avoids a rotating ring. Rear goals never point forward. */
export function guardFormationTarget(game,unit){
  const s=sessionFor(game),entry=entryFor(s,unit),p=game.player;
  if(entry.tick===s.tick&&entry.goal)return entry.goal;
  const {rank,count,role}=s.slots.get(unit)||{rank:0,count:1,role:guardFormationRole(unit)};
  const columns=count>6?4:Math.min(3,count),row=Math.floor(rank/columns),rowSize=Math.min(columns,count-row*columns);
  const forward=role==='front',long=(count>6?24+row*23:count>3?38+row*24:forward?68:54)*(forward?1:-1);
  const side=(rank%columns-(rowSize-1)/2)*(count>6?24:28),dx=Math.cos(s.angle),dy=Math.sin(s.angle);
  const desired={x:dx*long-dy*side,y:dy*long+dx*side};
  if(!entry.offset)entry.offset=desired;
  const blend=1-Math.exp(-s.dt*(6+(Math.max(0,unit._guardSlot||0)%3)));
  let ox=entry.offset.x+(desired.x-entry.offset.x)*blend,oy=entry.offset.y+(desired.y-entry.offset.y)*blend;
  const projection=ox*dx+oy*dy;
  if(!forward&&projection>-6){ox-=dx*(projection+6);oy-=dy*(projection+6);}
  if(forward&&projection<6){ox+=dx*(6-projection);oy+=dy*(6-projection);}
  // After a reversal, use a short side passage, rather than a semicircle ahead.
  if(!forward){
    const ahead=(unit.x-p.x)*dx+(unit.y-p.y)*dy;
    if(ahead>12&&!entry.passing){entry.passing=true;entry.side=Math.sign(-(unit.x-p.x)*dy+(unit.y-p.y)*dx)||Math.sign(side)||(rank%2?1:-1);}
    if(entry.passing&&ahead<=0)entry.passing=false;
    if(entry.passing){const lane=22+(rank%3)*24;ox=-dx*8-dy*entry.side*lane;oy=-dy*8+dx*entry.side*lane;}
  }
  entry.offset={x:ox,y:oy};entry.tick=s.tick;entry.goal={x:p.x+ox,y:p.y+oy};return entry.goal;
}
/** Separate hysteresis from combat regrouping; a battle never gets formation acceleration. */
export function guardFormationSpeedMult(game,unit,goal,engaged=false){
  if(!unit.isPersonalGuard){const old=sessions.get(game)?.units.get(unit);if(old)old.catchingUp=false;return guardSpeedMult(unit);}
  const s=sessionFor(game),entry=entryFor(s,unit);
  if(!unit.isPersonalGuard||engaged||unit.carrierId||unit.isDown||unit.dead)entry.catchingUp=false;
  else{
    const distance=Math.hypot(unit.x-goal.x,unit.y-goal.y);
    if(distance<=GUARD_FORMATION.dashStop)entry.catchingUp=false;
    else if(distance>GUARD_FORMATION.dashStart)entry.catchingUp=true;
  }
  return guardSpeedMult(unit,entry.catchingUp);
}
