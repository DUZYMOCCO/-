import {attributeFamily,soldierCombatTempo} from './unit-attributes.js?v=298';
import {canUseEquipment} from './weapon-requirements.js?v=298';
import {masteryReloadMult} from './growth-rules.js?v=295';
import {attackBlocked} from './gate-rules.js?v=295';

export const MELEE_BALANCE=Object.freeze({swordSoldierTempo:.55,spearReach:.82,spearHold:.74});
export const SOLDIER_MELEE_SKILLS=Object.freeze({
  sword:{name:'ダブルスラッシュ',cooldown:6,mult:2,followup:.18},
  spear:{name:'ファンスラスト',cooldown:8,mult:2.4},
  hammer:{name:'クラッシュブロー',cooldown:9,mult:3.2},
  axe:{name:'スピンアタック',cooldown:8.2,mult:2.6}
});
const alive=u=>u&&!u.dead&&!u.isDown&&u.hp>0;
const weapon=u=>u?.equipped?.weapon||u?.weapon;
const context=game=>game.currentDungeon?.id||'field';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const soldierMeleeReload=(unit,rule=soldierMeleeSkill(unit))=>rule?rule.cooldown*masteryReloadMult(unit.weaponMastery,weapon(unit)?.weaponStyle)*soldierCombatTempo(unit)/(1+Math.max(0,unit.deathlineAtkSpeed||0)/100):0;
export function soldierMeleeSkill(unit){
  if(!['HEAVY','LIGHT'].includes(attributeFamily(unit))||unit.soldierClass==='NINJA')return null;
  return SOLDIER_MELEE_SKILLS[weapon(unit)?.weaponStyle]||null;
}
export function soldierMeleeReach(cls,profile,item){
  const length=item?.weaponTraits?.length||1;
  if(profile.style==='spear')return Math.max(cls.range,profile.reach*MELEE_BALANCE.spearReach);
  if(profile.style==='sword')return Math.max(cls.range,profile.reach*.72);
  return ['hammer','axe'].includes(profile.style)?Math.max(cls.range,52)*length:cls.range*length;
}
export function soldierMeleePosition(unit,target,profile){
  if(!target||!['sword','spear'].includes(profile.style))return null;
  const d=distance(unit,target),reach=profile.reach||85;
  const desired=profile.style==='spear'?reach*MELEE_BALANCE.spearHold:reach*.5,band=profile.style==='spear'?8:5;
  if(Math.abs(d-desired)<=band)return {x:unit.x,y:unit.y};
  const dx=d>0?(unit.x-target.x)/d:-Math.cos(unit.facingAngle||0),dy=d>0?(unit.y-target.y)/d:-Math.sin(unit.facingAngle||0);
  return {x:target.x+dx*desired,y:target.y+dy*desired};
}
function valid(game,unit,target,reach){return alive(target)&&game.monsters.includes(target)&&distance(unit,target)<=reach&&alive(unit)&&!attackBlocked(game,unit,target);}
function knock(game,unit,target,base,stun,damage){
  if(!alive(target)||target.isColossal)return;
  game.launchMonster(target,unit,false,base,damage);
  target.magicStunTimer=Math.max(target.magicStunTimer||0,stun*(target.isBoss?.5:1));
}
function swordHit(game,unit,target,damage,profile){
  if(!valid(game,unit,target,Math.max(80,profile.reach)))return;
  game.performMeleeSweep(unit,target,false,damage,profile,Math.max(80,profile.reach));
  unit.atkAnim=1;unit.attackAngle=Math.atan2(target.y-unit.y,target.x-unit.x);
}
export function tickSoldierMeleeSkill(game,unit,dt){
  if(!alive(unit)){delete unit.weaponSkillPending;unit.weaponSpinTime=0;return;}
  unit.weaponSpinTime=Math.max(0,(unit.weaponSpinTime||0)-dt);
  const rule=soldierMeleeSkill(unit);
  if(!rule){delete unit.weaponSkillPending;return;}
  if(!Number.isFinite(unit.weaponSkillCooldown))unit.weaponSkillCooldown=soldierMeleeReload(unit,rule)*.5;
  unit.weaponSkillCooldown=Math.max(0,unit.weaponSkillCooldown-dt);
  const pending=unit.weaponSkillPending;
  if(!pending)return;
  if(pending.context!==context(game)||pending.weaponId!==weapon(unit)?.id||pending.style!==weapon(unit)?.weaponStyle){delete unit.weaponSkillPending;return;}
  pending.delay-=dt;if(pending.delay>0)return;
  delete unit.weaponSkillPending;
  const profile=game.combatProfileFor(unit,weapon(unit),false),reach=Math.max(80,profile.reach);
  const target=game.monsters.find(m=>m.id===pending.targetId&&valid(game,unit,m,reach))||game.getNearestMonster(unit.x,unit.y,m=>valid(game,unit,m,reach));
  if(target&&canUseEquipment(unit,weapon(unit)))swordHit(game,unit,target,pending.damage,profile);
}
export function soldierMeleeSkillText(unit){const rule=soldierMeleeSkill(unit);return rule?`${rule.name} · 自動 · CT${soldierMeleeReload(unit,rule).toFixed(1)}秒`:'';}
export function soldierMeleeDrawPose(unit){return unit.weaponSpinTime>0?{...unit,atkAnim:.9,attackAngle:(unit.weaponSpinAngle||0)+(1-unit.weaponSpinTime/.42)*Math.PI*2}:unit;}
export const soldierMeleeMethods={
  trySoldierMeleeSkill(unit,target){
    const rule=soldierMeleeSkill(unit),item=weapon(unit);
    if(!rule||!alive(unit)||!alive(target)||!Number.isFinite(unit.weaponSkillCooldown)||unit.weaponSkillCooldown>0||!canUseEquipment(unit,item))return false;
    const profile=this.combatProfileFor(unit,item,false),style=profile.style;
    const reach=style==='spear'?Math.max(140,profile.reach*1.15):style==='axe'?120:style==='hammer'?110:Math.max(80,profile.reach);
    if(!valid(this,unit,target,reach))return false;
    const base=Math.round(unit.atk*(this.player.isAdvanced?1.25:1)),damage=Math.round(base*rule.mult),angle=Math.atan2(target.y-unit.y,target.x-unit.x);
    unit.weaponSkillCooldown=soldierMeleeReload(unit,rule);unit.atkAnim=1;unit.attackAngle=angle;unit.facingAngle=angle;
    if(style==='sword'){
      swordHit(this,unit,target,damage,profile);
      unit.weaponSkillPending={style,weaponId:item.id,context:context(this),targetId:target.id,delay:rule.followup,damage};
    }else if(style==='hammer'){
      const before=target.hp;this.performAttack(unit,target,false,damage);if(target.hp<before)knock(this,unit,target,170,1,damage);
      this.pushShockwave(target.x,target.y,40,'#c4ac89','#e5d5bc',.25,2);
    }else{
      // Snapshot before damage: killMonster removes entries from this.monsters.
      const targets=this.monsters.filter(m=>{
        if(!alive(m)||attackBlocked(this,unit,m))return false;
        const d=distance(unit,m);if(d>reach+(style==='axe'?(m.radius||12):0))return false;
        if(style==='axe')return true;
        const delta=Math.atan2(Math.sin(Math.atan2(m.y-unit.y,m.x-unit.x)-angle),Math.cos(Math.atan2(m.y-unit.y,m.x-unit.x)-angle));
        return Math.abs(delta)<=.5;
      });
      for(const m of targets){const before=m.hp;this.performAttack(unit,m,false,damage);if(m.hp<before)knock(this,unit,m,style==='axe'?100:25,style==='axe'?.6:.25,damage);}
      if(style==='axe'){unit.weaponSpinTime=.42;unit.weaponSpinAngle=angle;}
      this.pushShockwave(unit.x,unit.y,style==='axe'?reach:55,style==='axe'?'#c4ac89':'#a4baad','#dce2d2',.25,2);
    }
    this.spawnDamageText(unit.x,unit.y-24,rule.name,'#d5d8cd');return true;
  }
};
