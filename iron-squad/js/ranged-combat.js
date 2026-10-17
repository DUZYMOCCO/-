import {ensureAmmo,takeRangedShot} from './supply-rules.js?v=295';
import {attackBlocked} from './gate-rules.js?v=295';
import {attackCooldown,soldierAttackCooldown} from './equipment-rules.js?v=295';
import {attributeFamily} from './unit-attributes.js?v=295';
import {inCurrentInstance} from './instance-rules.js?v=256';
import {sound} from '../../common/js/audio.js?v=151';
export const CROSSBOW_RULES=Object.freeze({limit:3,falloff:.7,halfWidth:10});
export const SIDEARM_RULES=Object.freeze({reach:65,cooldown:.9,engage:90,hold:48});
export const CANNON_BASH_RULES=Object.freeze({mult:1.6,cooldown:1.4,knockback:25});
export const FRONTLINE_SUPPORT_RULES=Object.freeze({radius:240,behind:18,beside:14});
const ranged=item=>['bow','crossbow','cannon'].includes(item?.weaponStyle);
const alive=u=>u&&!u.dead&&!u.isDown&&u.hp>0;
export const sidearmAttack=unit=>Math.max(1,Math.round(unit?._rangedSidearmAttack??Math.min(unit?.atk||1,25+(unit?.level||1)*2)));
export const cannonSidearm=unit=>(unit?.equipped?.weapon||unit?.weapon)?.weaponStyle==='cannon';
/** Follow an actual nearby melee front, never create a front out of another empty shooter. */
export function rangedFrontlinePosition(game,unit,target){
  if(!alive(target)||ensureAmmo(unit)>0)return null;
  let front=null,best=Infinity;
  for(const ally of game.squad||[]){
    if(ally===unit||!alive(ally)||!['HEAVY','LIGHT'].includes(attributeFamily(ally))||!['sword','spear','hammer','axe'].includes((ally.equipped?.weapon||ally.weapon)?.weaponStyle)||inCurrentInstance(game,ally)!==inCurrentInstance(game,unit))continue;
    const d=Math.hypot(ally.x-unit.x,ally.y-unit.y);if(d>FRONTLINE_SUPPORT_RULES.radius||d>=best||attackBlocked(game,unit,ally))continue;
    best=d;front=ally;
  }
  if(!front)return null;
  const dx=front.x-target.x,dy=front.y-target.y,d=Math.hypot(dx,dy)||1,ux=d>1?dx/d:-Math.cos(front.facingAngle||0),uy=d>1?dy/d:-Math.sin(front.facingAngle||0);
  const side=(unit._guardSlot||0)%2?-1:1;
  return {x:front.x+ux*FRONTLINE_SUPPORT_RULES.behind-uy*FRONTLINE_SUPPORT_RULES.beside*side,y:front.y+uy*FRONTLINE_SUPPORT_RULES.behind+ux*FRONTLINE_SUPPORT_RULES.beside*side};
}
/** Empty bows draw a short blade; cannons retain the barrel for their bash. */
export function rangedDrawPose(unit){
  const item=unit?.equipped?.weapon||unit?.weapon;
  if(!ranged(item)||ensureAmmo(unit)>0)return unit;
  if(item.weaponStyle==='cannon')return {...unit,_rangedBash:!!unit._cannonBashAttack};
  const knife={...item,tier:1,weaponStyle:'sword',weaponTraits:{length:.55,swingSpeed:1,attackTempo:1,sweep:1}};
  return {...unit,equipped:{...unit.equipped,weapon:knife},weapon:knife};
}
export function rangedOutpostDamage(unit,outpost,damage){
  if(ensureAmmo(unit)>0)return null; // Caller consumes an actual shot only in loaded mode.
  if(Math.hypot(unit.x-outpost.x,unit.y-outpost.y)>(outpost.radius||0)+SIDEARM_RULES.reach)return 0;
  return Math.max(1,Math.round(damage*sidearmAttack(unit)/Math.max(1,unit.atk||1)*(cannonSidearm(unit)?CANNON_BASH_RULES.mult:1)));
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
    const bash=cannonSidearm(unit),rule=bash?CANNON_BASH_RULES:SIDEARM_RULES;
    const base=sidearmAttack(unit)*aura*(bash?rule.mult:1);
    const cooldown=attackCooldown(unit.equipped?.weapon||unit.weapon,rule.cooldown,unit.atkSpeed,unit.warlordSpeedPct);
    unit.atkCooldown=isPlayer?cooldown:soldierAttackCooldown(unit,cooldown);unit._cannonBashAttack=bash;
    unit.atkAnim=1;unit.attackAngle=Math.atan2(target.y-unit.y,target.x-unit.x);unit.facingAngle=unit.attackAngle;
    if(isPlayer){unit.slashAngle=unit.attackAngle;unit.slashAnim=1;}
    const before=target.hp;this.performAttack(unit,target,isPlayer,Math.max(1,Math.round(base)),false,'sidearm');
    if(bash&&target.hp<before){
      sound.playWeapon('hammer',unit.x,unit.y);
      if(alive(target)&&!target.isColossal){const angle=unit.attackAngle,next={x:target.x+Math.cos(angle)*rule.knockback,y:target.y+Math.sin(angle)*rule.knockback};if(!attackBlocked(this,target,next)){target.x=next.x;target.y=next.y;}}
    }
    return true;
  },
  rangedOutpostAttack(unit,outpost,damage){
    if(attackBlocked(this,unit,outpost))return false;
    const fallback=rangedOutpostDamage(unit,outpost,damage);
    if(fallback===0)return false;
    const amount=fallback??takeRangedShot(unit,damage).damage;
    if(!(amount>0))return false;
    unit._cannonBashAttack=fallback!==null&&cannonSidearm(unit);
    this.damageOutpost(outpost,amount,unit);
    if(unit._cannonBashAttack)sound.playWeapon('hammer',unit.x,unit.y);
    return true;
  }
};
