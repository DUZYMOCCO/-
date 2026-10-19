import {attributeFamily,soldierCombatTempo} from './unit-attributes.js?v=334';
import {limitedLineOf} from './limited-lines.js?v=334';
import {canUseEquipment} from './weapon-requirements.js?v=298';
import {masteryReloadMult} from './growth-rules.js?v=329';
import {attackBlocked} from './gate-rules.js?v=322';

export const MELEE_BALANCE=Object.freeze({swordSoldierTempo:.55,spearReach:.82,spearHold:.74});
export const SOLDIER_MELEE_SKILLS=Object.freeze({
  sword:{name:'ダブルスラッシュ',cooldown:6,mult:2,followup:.18},
  spear:{name:'ファンスラスト',cooldown:8,mult:2.4},
  hammer:{name:'クラッシュブロー',cooldown:9,mult:3.2},
  axe:{name:'スピンアタック',cooldown:8.2,mult:2.6}
});
// v7.1.5 Second automatic skill for ordinary heavy/light melee soldiers (not the commander, heroes or ninjas).
// Damage is the displayed ATK times the multiplier written here and in the skill text; no hidden multiplier.
export const SOLDIER_MELEE_SKILLS2=Object.freeze({
  sword:Object.freeze({name:'ラピッドラッシュ',cooldown:7,mult:1,finisherMult:1.3,finisherMax:3,steps:Object.freeze([0,.12,.26])}),
  spear:Object.freeze({name:'チャージスラスト',cooldown:9,mult:2.2,max:4,minLine:2,halfWidth:16}),
  hammer:Object.freeze({name:'脳天割り',cooldown:11,mult:5.5,stun:1.2,windup:.28}),
  axe:Object.freeze({name:'大薙ぎ',cooldown:7.5,mult:2.4,max:5,minTargets:2,hold:3})
});
// Minimum spacing between the two skills of one soldier so they never land on the same frame.
export const SOLDIER_SKILL_GAP=.45;
const alive=u=>u&&!u.dead&&!u.isDown&&u.hp>0;
const weapon=u=>u?.equipped?.weapon||u?.weapon;
const context=game=>game.currentDungeon?.id||'field';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const soldierMeleeReload=(unit,rule=soldierMeleeSkill(unit))=>rule?rule.cooldown*masteryReloadMult(unit.weaponMastery,weapon(unit)?.weaponStyle)*soldierCombatTempo(unit)/(1+Math.max(0,unit.deathlineAtkSpeed||0)/100):0;
export function soldierMeleeSkill(unit){
  if(!['HEAVY','LIGHT'].includes(attributeFamily(unit))||limitedLineOf(unit)==='NINJA')return null;
  return SOLDIER_MELEE_SKILLS[weapon(unit)?.weaponStyle]||null;
}
export function soldierMeleeSkill2(unit){
  if(!unit||unit.isPlayer||unit.isHero||unit.heroPartyId||unit.isCommander||limitedLineOf(unit)==='NINJA'||unit.combatClass==='NINJA')return null;
  if(!['HEAVY','LIGHT'].includes(attributeFamily(unit)))return null;
  return SOLDIER_MELEE_SKILLS2[weapon(unit)?.weaponStyle]||null;
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
  if(!alive(unit)){delete unit.weaponSkillPending;delete unit.weaponSkill2Pending;unit.weaponSpinTime=0;unit.weaponLungeTime=0;return;}
  unit.weaponSpinTime=Math.max(0,(unit.weaponSpinTime||0)-dt);
  unit.weaponLungeTime=Math.max(0,(unit.weaponLungeTime||0)-dt);
  unit.weaponSkillGap=Math.max(0,(unit.weaponSkillGap||0)-dt);
  tickSoldierMeleeSkill2(game,unit,dt);
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
// ---- v7.1.5 skill 2 ----
const resolveTarget=(game,unit,p)=>game.monsters.find(m=>m.id===p.targetId&&valid(game,unit,m,p.reach))||game.getNearestMonster(unit.x,unit.y,m=>valid(game,unit,m,p.reach));
const angleTo=(unit,m)=>Math.atan2(m.y-unit.y,m.x-unit.x);
const angleGap=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
export const reducedMotion=()=>!!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
export function pushSoldierSkillFx(game,fx){
  if(!game.soldierSkillFx)game.soldierSkillFx=[];
  if(game.soldierSkillFx.length>=64)game.soldierSkillFx.shift();
  game.soldierSkillFx.push({...fx,context:context(game),maxLife:fx.life});
}
export function updateSoldierSkillFx(game,dt){
  const list=game.soldierSkillFx;if(!list)return;
  for(let i=list.length-1;i>=0;i--){list[i].life-=dt;if(list[i].life<=0||list[i].context!==context(game))list.splice(i,1);}
}
function swordStep(game,unit,p,step){
  const target=resolveTarget(game,unit,p);if(!target)return;
  const angle=angleTo(unit,target);unit.atkAnim=1;unit.attackAngle=angle;unit.facingAngle=angle;p.targetId=target.id;
  const victims=[target];
  if(step.max>1)victims.push(...game.monsters.filter(m=>m!==target&&valid(game,unit,m,p.reach)).sort((a,b)=>distance(unit,a)-distance(unit,b)).slice(0,step.max-1));
  for(const m of victims){game.performAttack(unit,m,false,step.damage);pushSoldierSkillFx(game,{kind:'slash',x:m.x,y:m.y,angle:angle+(step.index===0?-.6:step.index===1?.6:0),len:step.index===2?44:34,width:step.index===2?4:3,life:.32});}
}
function hammerStep(game,unit,p,step){
  const target=resolveTarget(game,unit,p);if(!target)return;
  const angle=angleTo(unit,target);unit.atkAnim=1;unit.attackAngle=angle;unit.facingAngle=angle;
  const before=target.hp;game.performAttack(unit,target,false,step.damage);if(target.hp<before)knock(game,unit,target,170,step.stun,step.damage);
  pushSoldierSkillFx(game,{kind:'crack',x:target.x,y:target.y,angle,len:46,seed:(unit.id?.length||3)+Math.round(target.x)%7,life:.6});
  game.pushShockwave(target.x,target.y,52,'#c49a5a','#f1dfbd',.3,3);
}
export function tickSoldierMeleeSkill2(game,unit,dt){
  const rule=soldierMeleeSkill2(unit);
  if(!rule){delete unit.weaponSkill2Pending;unit.weaponSkill2Ready=0;return;}
  if(!Number.isFinite(unit.weaponSkill2Cooldown)||unit.weaponSkill2Cooldown<0)unit.weaponSkill2Cooldown=soldierMeleeReload(unit,rule)*.5;
  unit.weaponSkill2Cooldown=Math.max(0,unit.weaponSkill2Cooldown-dt);
  unit.weaponSkill2Ready=unit.weaponSkill2Cooldown>0?0:(unit.weaponSkill2Ready||0)+dt;
  const p=unit.weaponSkill2Pending;if(!p)return;
  const item=weapon(unit);
  if(p.context!==context(game)||p.weaponId!==item?.id||p.style!==item?.weaponStyle||!Array.isArray(p.steps)||!canUseEquipment(unit,item)){delete unit.weaponSkill2Pending;return;}
  p.elapsed=(Number(p.elapsed)||0)+dt;
  while(p.steps.length&&p.elapsed>=p.steps[0].at){
    const step=p.steps.shift();
    if(p.style==='sword')swordStep(game,unit,p,step);else if(p.style==='hammer')hammerStep(game,unit,p,step);
  }
  if(!p.steps.length)delete unit.weaponSkill2Pending;
}
const fmt=n=>Math.round(n).toLocaleString('ja-JP');
const m1=n=>`ATK×${n.toFixed(1)}`;
function skill1Desc(style,r,a){
  if(style==='sword')return `${m1(r.mult)}を2回（各${fmt(a*r.mult)}）`;
  if(style==='spear')return `前方扇の敵全員に${m1(r.mult)}（${fmt(a*r.mult)}）`;
  if(style==='hammer')return `単体に${m1(r.mult)}＋気絶1秒（${fmt(a*r.mult)}）`;
  return `周囲の敵全員に${m1(r.mult)}（${fmt(a*r.mult)}）`;
}
function skill2Desc(style,r,a){
  if(style==='sword')return `主目標に${m1(r.mult)}を2回→周囲最大${r.finisherMax}体に${m1(r.finisherMult)}（${fmt(a*r.mult)}／${fmt(a*r.finisherMult)}）`;
  if(style==='spear')return `直線上の最大${r.max}体を貫通 ${m1(r.mult)}（${fmt(a*r.mult)}）`;
  if(style==='hammer')return `HP最大・エリート優先の単体に${m1(r.mult)}＋気絶${r.stun}秒（${fmt(a*r.mult)}）`;
  return `前方半円の最大${r.max}体に${m1(r.mult)}（${fmt(a*r.mult)}）`;
}
// Two lines: skill 1 and skill 2. Numbers are the displayed ATK times the stated multiplier.
export function soldierMeleeSkillLines(unit){
  const style=weapon(unit)?.weaponStyle,a=Math.max(0,Number(unit?.atk)||0),out=[];
  const r1=soldierMeleeSkill(unit),r2=soldierMeleeSkill2(unit);
  if(r1)out.push(`スキル1 ${r1.name}：${skill1Desc(style,r1,a)} · 自動 · CT${soldierMeleeReload(unit,r1).toFixed(1)}秒`);
  if(r2)out.push(`スキル2 ${r2.name}：${skill2Desc(style,r2,a)} · 自動 · CT${soldierMeleeReload(unit,r2).toFixed(1)}秒`);
  return out;
}
export function soldierMeleeSkillText(unit){return soldierMeleeSkillLines(unit).join('\n');}
export function soldierMeleeDrawPose(unit){
  let pose=unit;
  if(unit.weaponSpinTime>0)pose={...unit,atkAnim:.9,attackAngle:(unit.weaponSpinAngle||0)+(1-unit.weaponSpinTime/.42)*Math.PI*2};
  if(unit.weaponLungeTime>0&&!reducedMotion()){const k=Math.sin((1-unit.weaponLungeTime/.22)*Math.PI)*12,a=unit.weaponLungeAngle||0;pose={...pose,x:pose.x+Math.cos(a)*k,y:pose.y+Math.sin(a)*k};}
  return pose;
}
// Effects: three slash lines / thrust beam / wind-up glow + ground cracks / half-circle trail.
// With prefers-reduced-motion the shapes are drawn at full size and only fade (no growth, sweep or lunge).
export function drawSoldierSkillFx(ctx,game){
  const list=game.soldierSkillFx;if(!list||!list.length)return;
  const still=reducedMotion(),here=context(game);
  for(const fx of list){
    if(fx.context!==here)continue;
    const t=Math.max(0,Math.min(1,1-fx.life/fx.maxLife)),alpha=Math.max(0,fx.life/fx.maxLife),grow=still?1:Math.min(1,t*3);
    ctx.save();ctx.lineCap='round';
    if(fx.kind==='slash'){
      const h=fx.len/2*grow,c=Math.cos(fx.angle+Math.PI/2),s=Math.sin(fx.angle+Math.PI/2);
      ctx.globalAlpha=alpha;ctx.strokeStyle='#f5f1e3';ctx.lineWidth=fx.width;
      ctx.beginPath();ctx.moveTo(fx.x-c*h,fx.y-s*h);ctx.lineTo(fx.x+c*h,fx.y+s*h);ctx.stroke();
    }else if(fx.kind==='thrust'){
      const len=fx.len*grow,ex=fx.x+Math.cos(fx.angle)*len,ey=fx.y+Math.sin(fx.angle)*len;
      ctx.globalAlpha=alpha*.85;ctx.strokeStyle='#e9e2b8';ctx.lineWidth=7*(1-t*.6);
      ctx.beginPath();ctx.moveTo(fx.x,fx.y);ctx.lineTo(ex,ey);ctx.stroke();
      ctx.globalAlpha=alpha;ctx.strokeStyle='#ffffff';ctx.lineWidth=2;ctx.stroke();
      for(const h of fx.hits||[]){ctx.globalAlpha=alpha*.7;ctx.fillStyle='#fff6cf';ctx.beginPath();ctx.arc(h.x,h.y,still?9:6+t*8,0,Math.PI*2);ctx.fill();}
    }else if(fx.kind==='charge'){
      const r=still?20:30-t*18;
      ctx.globalAlpha=.35+alpha*.4;ctx.strokeStyle='#e0a84f';ctx.lineWidth=3;
      ctx.beginPath();ctx.arc(fx.x,fx.y,r,0,Math.PI*2);ctx.stroke();
    }else if(fx.kind==='crack'){
      ctx.globalAlpha=alpha;ctx.strokeStyle='#5b4632';ctx.lineWidth=2.5;
      for(let i=0;i<6;i++){
        const a=fx.angle+i*Math.PI/3+((fx.seed*(i+1))%5-2)*.12,l=fx.len*(.6+((fx.seed+i)%3)*.2)*grow;
        const mx=fx.x+Math.cos(a)*l*.5+Math.cos(a+1.4)*4,my=fx.y+Math.sin(a)*l*.5+Math.sin(a+1.4)*4;
        ctx.beginPath();ctx.moveTo(fx.x,fx.y);ctx.lineTo(mx,my);ctx.lineTo(fx.x+Math.cos(a)*l,fx.y+Math.sin(a)*l);ctx.stroke();
      }
    }else if(fx.kind==='arc'){
      const from=fx.angle-Math.PI/2,to=from+Math.PI*grow;
      ctx.globalAlpha=alpha*.8;ctx.strokeStyle='#d8c39a';ctx.lineWidth=6*(1-t*.5);
      ctx.beginPath();ctx.arc(fx.x,fx.y,fx.len,from,to);ctx.stroke();
      ctx.globalAlpha=alpha*.5;ctx.strokeStyle='#fff3d6';ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(fx.x,fx.y,fx.len*.78,from,to);ctx.stroke();
    }
    ctx.restore();
  }
}
export const soldierMeleeMethods={
  trySoldierMeleeSkill(unit,target){
    const rule=soldierMeleeSkill(unit),item=weapon(unit);
    if(!rule||!alive(unit)||!alive(target)||!Number.isFinite(unit.weaponSkillCooldown)||unit.weaponSkillCooldown>0||(unit.weaponSkillGap||0)>0||unit.weaponSkill2Pending||!canUseEquipment(unit,item))return false;
    const profile=this.combatProfileFor(unit,item,false),style=profile.style;
    const reach=style==='spear'?Math.max(140,profile.reach*1.15):style==='axe'?120:style==='hammer'?110:Math.max(80,profile.reach);
    if(!valid(this,unit,target,reach))return false;
    const base=Math.round(unit.atk*(this.player.isAdvanced?1.25:1)),damage=Math.round(base*rule.mult),angle=Math.atan2(target.y-unit.y,target.x-unit.x);
    unit.weaponSkillCooldown=soldierMeleeReload(unit,rule);unit.weaponSkillGap=SOLDIER_SKILL_GAP;unit.atkAnim=1;unit.attackAngle=angle;unit.facingAngle=angle;
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
  },
  // v7.1.5 Second skill. Called by the ordinary soldier AI right after the first skill; the shared gap keeps them apart.
  trySoldierMeleeSkill2(unit,target){
    const rule=soldierMeleeSkill2(unit),item=weapon(unit);
    if(!rule||!alive(unit)||!alive(target)||!Number.isFinite(unit.weaponSkill2Cooldown)||unit.weaponSkill2Cooldown>0||(unit.weaponSkillGap||0)>0||unit.weaponSkillPending||unit.weaponSkill2Pending||!canUseEquipment(unit,item))return false;
    const profile=this.combatProfileFor(unit,item,false),style=item.weaponStyle;
    const base=Math.round(unit.atk*(this.player.isAdvanced?1.25:1)),damage=Math.round(base*rule.mult);
    const fire=(angle,gap=SOLDIER_SKILL_GAP)=>{
      unit.weaponSkill2Cooldown=soldierMeleeReload(unit,rule);unit.weaponSkill2Ready=0;unit.weaponSkillGap=Math.max(SOLDIER_SKILL_GAP,gap);
      unit.atkAnim=1;unit.attackAngle=angle;unit.facingAngle=angle;this.spawnDamageText(unit.x,unit.y-24,rule.name,'#e8d9a8');
    };
    if(style==='sword'){
      const reach=Math.max(80,profile.reach);if(!valid(this,unit,target,reach))return false;
      const angle=angleTo(unit,target),finisher=Math.round(base*rule.finisherMult),last=rule.steps[rule.steps.length-1];
      fire(angle,last+.15);
      const p={style,weaponId:item.id,context:context(this),targetId:target.id,reach,elapsed:0,
        steps:rule.steps.slice(1).map((at,i)=>({at,index:i+1,damage:i+1===rule.steps.length-1?finisher:damage,max:i+1===rule.steps.length-1?rule.finisherMax:1}))};
      swordStep(this,unit,p,{index:0,damage,max:1});
      if(p.steps.length)unit.weaponSkill2Pending=p;
      return true;
    }
    if(style==='spear'){
      const reach=Math.max(160,profile.reach*1.3);if(!valid(this,unit,target,reach))return false;
      const angle=angleTo(unit,target),cos=Math.cos(angle),sin=Math.sin(angle);
      const line=[];
      for(const m of this.monsters){
        if(!alive(m)||attackBlocked(this,unit,m))continue;
        const dx=m.x-unit.x,dy=m.y-unit.y,along=dx*cos+dy*sin;if(along<-6||along>reach)continue;
        if(Math.abs(-dy*cos+dx*sin)<=rule.halfWidth+(m.radius||12))line.push({m,along});
      }
      line.sort((a,b)=>a.along-b.along);
      // Charge when enemies are lined up, or when the first skill cannot be used right now.
      if(line.length<rule.minLine&&!((unit.weaponSkillCooldown||0)>0))return false;
      const hits=line.slice(0,rule.max).map(e=>e.m);
      fire(angle);unit.weaponLungeTime=.22;unit.weaponLungeAngle=angle;
      for(const m of hits){const before=m.hp;this.performAttack(unit,m,false,damage);if(m.hp<before)knock(this,unit,m,40,.3,damage);}
      pushSoldierSkillFx(this,{kind:'thrust',x:unit.x,y:unit.y,angle,len:reach,hits:hits.map(m=>({x:m.x,y:m.y})),life:.34});
      return true;
    }
    if(style==='hammer'){
      const reach=120;
      const pool=this.monsters.filter(m=>valid(this,unit,m,reach));
      if(!pool.length)return false;
      const rank=m=>(m.isBoss||m.isElite||m.isDungeonBoss?1:0);
      pool.sort((a,b)=>rank(b)-rank(a)||b.hp-a.hp||distance(unit,a)-distance(unit,b));
      const chosen=pool[0],angle=angleTo(unit,chosen);
      fire(angle,rule.windup+.15);
      unit.weaponSkill2Pending={style,weaponId:item.id,context:context(this),targetId:chosen.id,reach:reach+20,elapsed:0,steps:[{at:rule.windup,damage,stun:rule.stun}]};
      pushSoldierSkillFx(this,{kind:'charge',x:unit.x,y:unit.y,angle,life:rule.windup});
      return true;
    }
    if(style==='axe'){
      const reach=125;if(!valid(this,unit,target,reach+(target.radius||12)))return false;
      const angle=angleTo(unit,target);
      const arc=this.monsters.filter(m=>{
        if(!alive(m)||attackBlocked(this,unit,m))return false;
        const d=distance(unit,m);if(d>reach+(m.radius||12))return false;
        return d<=(m.radius||12)+8||angleGap(angleTo(unit,m),angle)<=Math.PI/2;
      }).sort((a,b)=>distance(unit,a)-distance(unit,b));
      // Wait for a second enemy, but never longer than rule.hold seconds after the skill became ready.
      if(arc.length<rule.minTargets&&(unit.weaponSkill2Ready||0)<rule.hold)return false;
      const hits=arc.slice(0,rule.max);
      fire(angle);
      for(const m of hits){const before=m.hp;this.performAttack(unit,m,false,damage);if(m.hp<before)knock(this,unit,m,80,.4,damage);}
      pushSoldierSkillFx(this,{kind:'arc',x:unit.x,y:unit.y,angle,len:reach,life:.36});
      return true;
    }
    return false;
  }
};
