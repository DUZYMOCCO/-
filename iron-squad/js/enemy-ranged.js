import {inCurrentInstance} from './instance-rules.js?v=151';
import {recordCombat} from './phase-rules.js';

export const RANGED_ENEMIES=Object.freeze({
  goblin_archer:{name:'ゴブリン弓兵',base:'goblin',kind:'physical',range:300,interval:2.2,speed:310,color:'#b5a078'},
  bandit_crossbow:{name:'山賊石弓兵',base:'goblin',kind:'physical',range:370,interval:3,speed:430,color:'#c4baa0'},
  flame_imp:{name:'火炎小鬼',base:'goblin',kind:'elemental',element:'fire',range:260,interval:2.8,speed:240,color:'#bd7755',splash:42},
  frost_spirit:{name:'氷霊',base:'slime',kind:'elemental',element:'ice',range:280,interval:2.8,speed:250,color:'#95b8c2'},
  storm_wisp:{name:'雷精',base:'slime',kind:'elemental',element:'lightning',range:290,interval:3.2,speed:360,color:'#c0ac68'},
  dark_mage:{name:'黒衣の魔術師',base:'orc',kind:'magic',element:'arcane',range:340,interval:3.4,speed:220,color:'#9c89ad',splash:50}
});
export const DEFENSE_RULES=Object.freeze({duration:3,cooldown:9,halfWidth:58,watchRange:360,capacityHp:.5,capacityDef:2,projectileCap:64});
const living=u=>u&&!u.dead&&!u.isDown&&u.hp>0;
const local=(game,u)=>u?.isGateGuard?(game.currentDungeon?inCurrentInstance(game,u):u.gateSpace==='field'):!game.currentDungeon||inCurrentInstance(game,u);
export const isDefenseUnit=u=>['HEAVY','PALADIN','TEMPLAR','IMMORTAL_AEGIS'].includes(u?.combatClass||u?.soldierClass)&&!!u.equipped?.shield;
export const isHostileShot=p=>p?.type==='ENEMY_BOLT'||p?.type==='BREATH_FLAME'||p?.type==='TITAN_BEAM';
export function configureRangedEnemy(unit,{random=Math.random,forceType=null}={}) {
  if(!unit||unit.isBoss||unit.isColossal||unit.isDungeonBoss||unit.fixedKind)return unit;
  const kind=forceType||(random()<.28?Object.keys(RANGED_ENEMIES)[Math.min(5,Math.floor(random()*6))]:null);
  const def=RANGED_ENEMIES[kind];if(!def)return unit;
  unit.type=kind;unit.name=def.name;unit.color=def.color;unit.rangedKind=kind;
  unit.atkTimer=Math.max(.6,unit.atkTimer||0);return unit;
}
export function updateRangedEnemy(game,unit,target,dt) {
  const def=RANGED_ENEMIES[unit.rangedKind||unit.type];if(!def)return false;
  const dx=target.x-unit.x,dy=target.y-unit.y,d=Math.hypot(dx,dy)||1;
  unit.facingAngle=Math.atan2(dy,dx);unit.atkTimer=Math.max(0,(unit.atkTimer||0)-dt);
  if(d>def.range||game.wallBlocksEnemyAttack?.(unit,target)) {
    const goal=game.dungeonMoveTarget?.(unit,target)||target,mx=goal.x-unit.x,my=goal.y-unit.y,md=Math.hypot(mx,my)||1;
    const step=Math.min(md,unit.speed*(unit.magicSlowTimer>0?.55:1)*dt);unit.x+=mx/md*step;unit.y+=my/md*step;
  } else if(unit.atkTimer<=0) {
    game.projectiles||=[];
    if(game.projectiles.filter(isHostileShot).length<DEFENSE_RULES.projectileCap){
      game.projectiles.push({type:'ENEMY_BOLT',target,x:unit.x,y:unit.y,vx:dx/d*def.speed,vy:dy/d*def.speed,life:2.3,damage:unit.atk,damageKind:def.kind,element:def.element,splash:def.splash||0,color:def.color,sourceX:unit.x,sourceY:unit.y});
    }
    unit.atkTimer=def.interval;unit.atkAnim=1;
  }
  return true;
}
export function updateDefenseWalls(game,dt) {
  const shots=(game.projectiles||[]).filter(isHostileShot);
  const threats=(game.monsters||[]).filter(m=>living(m)&&RANGED_ENEMIES[m.rangedKind||m.type]);
  for(const unit of game.squad||[]) {
    unit.defenseCooldown=Math.max(0,(unit.defenseCooldown||0)-dt);unit.defenseTimer=Math.max(0,(unit.defenseTimer||0)-dt);unit.defenseHit=Math.max(0,(unit.defenseHit||0)-dt*3);
    if(!living(unit)||!local(game,unit)||!isDefenseUnit(unit)){unit.defenseTimer=0;continue;}
    if(unit.defenseTimer>0||unit.defenseCooldown>0)continue;
    const incoming=shots.find(p=>Math.hypot(p.x-unit.x,p.y-unit.y)<=DEFENSE_RULES.watchRange&&p.vx*(unit.x-p.x)+p.vy*(unit.y-p.y)>0);
    const enemy=incoming||threats.find(m=>Math.hypot(m.x-unit.x,m.y-unit.y)<=DEFENSE_RULES.watchRange);
    if(!enemy)continue;
    unit.defenseAngle=Math.atan2(enemy.y-unit.y,enemy.x-unit.x);
    unit.defenseTimer=DEFENSE_RULES.duration;unit.defenseCooldown=DEFENSE_RULES.cooldown;
    unit.defenseCapacity=Math.max(1,Math.round(unit.maxHp*DEFENSE_RULES.capacityHp+(unit.def||0)*DEFENSE_RULES.capacityDef));
  }
}
/** A finite front-facing segment catches the actual traveled path, including fast shots. */
export function interceptHostileShot(game,shot,from,to) {
  if(!isHostileShot(shot))return false;
  const dx=to.x-from.x,dy=to.y-from.y,candidates=[];
  for(const guard of game.squad||[]) {
    if(!living(guard)||!local(game,guard)||!isDefenseUnit(guard)||!(guard.defenseTimer>0)||!(guard.defenseCapacity>0))continue;
    const nx=Math.cos(guard.defenseAngle),ny=Math.sin(guard.defenseAngle),gx=guard.x+nx*24,gy=guard.y+ny*24;
    const a=(from.x-gx)*nx+(from.y-gy)*ny,b=(to.x-gx)*nx+(to.y-gy)*ny;
    if(a<0||b>0||a<=b)continue;
    const t=a/(a-b),x=from.x+dx*t,y=from.y+dy*t;
    if(Math.abs((x-gx)*-ny+(y-gy)*nx)<=DEFENSE_RULES.halfWidth)candidates.push({guard,t});
  }
  candidates.sort((a,b)=>a.t-b.t);
  for(const {guard} of candidates){
    const absorbed=Math.min(shot.damage,guard.defenseCapacity);guard.defenseCapacity-=absorbed;shot.damage-=absorbed;
    guard.defenseBlocked=(guard.defenseBlocked||0)+absorbed;guard.defenseHit=1;recordCombat(guard);
    if(!guard.defenseCapacity)guard.defenseTimer=0;
    if(shot.damage<=0)return true;
  }
  return false;
}
const segmentDistance=(p,a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return {t,d:Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t)};};
export function updateHostileBolt(game,shot,dt) {
  const from={x:shot.x,y:shot.y},to={x:shot.x+shot.vx*dt,y:shot.y+shot.vy*dt};shot.life-=dt;
  if(game.attackBlocked?.(from,to))return true;
  const targets=[...new Set([game.player,...(game.squad||[]),...(game.gateGuards||[]),shot.target])].filter(u=>living(u)&&local(game,u));
  const hits=targets.map(u=>({u,...segmentDistance(u,from,to)})).filter(h=>h.d<=(h.u===game.player?22:16)).sort((a,b)=>a.t-b.t);
  const first=hits[0];const end=first?{x:from.x+(to.x-from.x)*first.t,y:from.y+(to.y-from.y)*first.t}:to;
  if(interceptHostileShot(game,shot,from,end))return true;
  if(first){
    const origin=Number.isFinite(shot.sourceX)?{x:shot.sourceX,y:shot.sourceY}:from;
    const affected=shot.splash?targets.filter(u=>Math.hypot(u.x-end.x,u.y-end.y)<=shot.splash):[first.u];
    for(const unit of affected){
      if(game.attackBlocked?.(origin,unit))continue;
      game.damageTarget(unit,shot.damage,{damageKind:shot.damageKind,element:shot.element,ranged:true,attacker:origin});
    }
    return true;
  }
  shot.x=to.x;shot.y=to.y;return shot.life<=0;
}
export function drawDefenseWalls(c,game) {
  for(const s of game.squad||[])if(living(s)&&local(game,s)&&s.defenseTimer>0&&s.defenseCapacity>0){
    c.save();c.translate(s.x,s.y);c.rotate(s.defenseAngle);c.strokeStyle=s.defenseHit>0?'#e1d1a1':'#98aeb3';c.lineWidth=s.defenseHit>0?4:2;
    c.beginPath();c.moveTo(24,-DEFENSE_RULES.halfWidth);c.lineTo(31,0);c.lineTo(24,DEFENSE_RULES.halfWidth);c.stroke();c.restore();
  }
}
