import {ensureAmmo,takeRangedShot} from './supply-rules.js?v=241';
import {attackBlocked} from './gate-rules.js?v=215';
export const CROSSBOW_RULES=Object.freeze({limit:3,falloff:.7,halfWidth:10});
export const SIDEARM_RULES=Object.freeze({reach:65,cooldown:.9,engage:90,hold:48});
const ranged=item=>['bow','crossbow','cannon'].includes(item?.weaponStyle);
const alive=u=>u&&!u.dead&&!u.isDown&&u.hp>0;
export const sidearmAttack=unit=>Math.max(1,Math.round(unit?._rangedSidearmAttack??Math.min(unit?.atk||1,25+(unit?.level||1)*2)));
/** Draw a short blade without replacing the actual weapon or its saved stats. */
export function rangedDrawPose(unit){
  const item=unit?.equipped?.weapon||unit?.weapon;
  if(!ranged(item)||ensureAmmo(unit)>0)return unit;
  const knife={...item,tier:1,weaponStyle:'sword',weaponTraits:{length:.55,swingSpeed:1,attackTempo:1,sweep:1}};
  return {...unit,equipped:{...unit.equipped,weapon:knife},weapon:knife};
}
export function rangedOutpostDamage(unit,outpost,damage){
  if(ensureAmmo(unit)>0)return null; // Caller consumes an actual shot only in loaded mode.
  if(Math.hypot(unit.x-outpost.x,unit.y-outpost.y)>(outpost.radius||0)+SIDEARM_RULES.reach)return 0;
  return Math.max(1,Math.round(damage*sidearmAttack(unit)/Math.max(1,unit.atk||1)));
}
/** Swept-segment hits in travel order. Snapshot before lethal hits mutate the live enemy list. */
export function updatePiercingBolt(game,bolt,dt){
  const step=Math.min(Math.max(0,bolt.life||0),dt),dx=bolt.vx*step,dy=bolt.vy*step,len2=dx*dx+dy*dy;
  if(!(len2>0))return true;
  const from={x:bolt.x,y:bolt.y},nx=from.x+dx,ny=from.y+dy;
  const touched=[...game.monsters].filter(m=>alive(m)&&!m.retreated&&!bolt.hitEnemies.includes(m)).map(m=>{
    const t=((m.x-from.x)*dx+(m.y-from.y)*dy)/len2,c=Math.max(0,Math.min(1,t));
    return {m,t,distance:Math.hypot(m.x-from.x-c*dx,m.y-from.y-c*dy)};
  }).filter(h=>h.t>=0&&h.t<=1&&h.distance<=CROSSBOW_RULES.halfWidth+(h.m.radius||8)).sort((a,b)=>a.t-b.t);
  for(const {m,t} of touched){
    if(attackBlocked(game,from,{x:from.x+dx*t,y:from.y+dy*t}))return true;
    if(attackBlocked(game,bolt.attacker||from,m))continue;
    const damage=Math.max(1,Math.round(bolt.damage*CROSSBOW_RULES.falloff**bolt.hitEnemies.length));
    bolt.hitEnemies.push(m);const before=m.hp;game.performAttack(bolt.attacker,m,!!bolt.isPlayer,damage,false);
    if(m.hp<before&&alive(m)&&bolt.knockback&&!m.isColossal){const angle=Math.atan2(bolt.vy,bolt.vx);m.x+=Math.cos(angle)*bolt.knockback;m.y+=Math.sin(angle)*bolt.knockback;}
    if(bolt.hitEnemies.length>=CROSSBOW_RULES.limit)return true;
  }
  bolt.x=nx;bolt.y=ny;bolt.life=Math.max(0,(bolt.life||0)-dt);
  return bolt.life<=0||attackBlocked(game,from,{x:nx,y:ny});
}
export const rangedCombatMethods={
  performRangedSidearm(unit,target,isPlayer=false,ignoreCooldown=false){
    if(!alive(unit)||!alive(target)||ensureAmmo(unit)>0||(!ignoreCooldown&&unit.atkCooldown>0)||Math.hypot(unit.x-target.x,unit.y-target.y)>SIDEARM_RULES.reach||attackBlocked(this,unit,target))return false;
    const aura=!isPlayer&&!unit.heroPartyId&&this.player?.isAdvanced?1.25:1;
    const base=sidearmAttack(unit)*(isPlayer||unit.heroPartyId?1:2.2)*aura;
    unit.atkCooldown=SIDEARM_RULES.cooldown/Math.max(.55,unit.atkSpeed||1);
    unit.atkAnim=1;unit.attackAngle=Math.atan2(target.y-unit.y,target.x-unit.x);unit.facingAngle=unit.attackAngle;
    if(isPlayer){unit.slashAngle=unit.attackAngle;unit.slashAnim=1;}
    this.performAttack(unit,target,isPlayer,Math.max(1,Math.round(base)),false,'sidearm');return true;
  },
  rangedOutpostAttack(unit,outpost,damage){
    if(attackBlocked(this,unit,outpost))return false;
    const fallback=rangedOutpostDamage(unit,outpost,damage);
    if(fallback===0)return false;
    const amount=fallback??takeRangedShot(unit,damage).damage;
    if(!(amount>0))return false;this.damageOutpost(outpost,amount,unit);return true;
  }
};
