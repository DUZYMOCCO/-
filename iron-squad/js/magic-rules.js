import {sound} from '../../common/js/audio.js?v=151';
import {WORLD_SIZE} from './world.js?v=151';
import {inCurrentInstance} from './instance-rules.js?v=151';
import {recordCombat} from './phase-rules.js';
import {isSoldierOnExpedition} from './expedition-rules.js';
import {practiceAttribute,prefersCasterMelee,attributeValues,canChannelWeaponMagic} from './unit-attributes.js';
import {isMagicWeapon} from './weapon-requirements.js';

export const MAGE_IDS=['MAGE','ARCHMAGE','ELEMENTAL_SAGE','ARCANE_SOVEREIGN'];
const MEDIC_IDS=['MEDIC','HIGH_PRIEST','SAINT','ARCHANGEL'];
export const isMage=u=>MAGE_IDS.includes(u?.combatClass||u?.soldierClass);
// The commander casts through the held weapon, without joining soldier job/AI rules.
export const isPlayerCaster=u=>!!(u?.isHero||u?.isPlayer)&&isMagicWeapon(u.equipped?.weapon||u.weapon||{weaponStyle:u.weaponStyle});
export const isSpellcaster=u=>isMage(u)||isPlayerCaster(u);
export const isMagicUser=u=>isSpellcaster(u)||MEDIC_IDS.includes(u?.soldierClass);
export const PLAYER_MAGIC_RULES=Object.freeze({mana:100,range:260,powerCost:36,powerCooldown:8,powerDamage:1.8,powerRadius:1.5});
const active=u=>u&&!u.dead&&!u.isDown&&u.hp>0;
export const MAGIC_AFFINITIES=Object.freeze({
  fire:{name:'炎',color:'#be8264',damage:3.6,radius:56,cost:18,cooldown:2.1},
  ice:{name:'氷',color:'#90b9c5',damage:2.8,radius:66,cost:18,cooldown:2.2},
  lightning:{name:'雷',color:'#c6b575',damage:4.6,radius:48,cost:22,cooldown:2.3},
  explosion:{name:'爆発',color:'#ab8175',damage:4.2,radius:84,cost:26,cooldown:2.7}
});
export const MAGIC_CLASSES={
  MAGE:{id:'MAGE',classTier:0,name:'魔法使い',icon:'🔮',color:'#ab9ac5',range:260,speed:92,atkCooldown:2.1,bonusHp:-25,bonusAtk:18,advancedClassId:'ARCHMAGE',desc:'高威力の範囲魔法。脆く、MP不足時は動けず瞑想する。得意属性は各自異なる'},
  ARCHMAGE:{id:'ARCHMAGE',classTier:1,baseClassId:'MAGE',isAdvanced:true,name:'大魔導士',icon:'🔮',color:'#a592c5',range:290,speed:98,atkCooldown:1.9,bonusHp:10,bonusAtk:40,atkMultBonus:.35,advancedClassId:'ELEMENTAL_SAGE',tag:'大魔導士',desc:'魔力上限と魔法の威力・範囲が成長。装甲は薄い'},
  ELEMENTAL_SAGE:{id:'ELEMENTAL_SAGE',classTier:2,baseClassId:'MAGE',isAdvanced:true,isMaster:true,name:'元素賢者',icon:'🔮',color:'#9b8aba',range:320,speed:102,atkCooldown:1.8,bonusHp:50,bonusAtk:65,atkMultBonus:.6,advancedClassId:'ARCANE_SOVEREIGN',tag:'元素賢者',desc:'得意属性を磨いた極職。魔力消耗と脆さは残る'},
  ARCANE_SOVEREIGN:{id:'ARCANE_SOVEREIGN',classTier:3,baseClassId:'MAGE',isAdvanced:true,isLegendary:true,name:'秘術王',icon:'🔮',color:'#b5a6d0',range:350,speed:108,atkCooldown:1.6,bonusHp:90,bonusAtk:100,atkMultBonus:.9,tag:'秘術王',desc:'広範囲を制圧する伝説の術者。MP切れでは無防備'}
};
export function magicTier(u) {return Math.max(0,isMage(u)?MAGE_IDS.indexOf(u.combatClass||u.soldierClass):MEDIC_IDS.indexOf(u?.soldierClass));}
export function manaCapacity(u) {return isPlayerCaster(u)?PLAYER_MAGIC_RULES.mana:isMagicUser(u)?100+magicTier(u)*40:canChannelWeaponMagic(u)?60:0;}
export const weaponMagicDamage=u=>Math.max(1,Math.round((u.magicAttack||1)*.7));
export function ensureMana(u) {
  if(!manaCapacity(u)){if(u)u.maxMana=0;return 0;}
  u.maxMana=manaCapacity(u);
  if(!Number.isFinite(u.mana))u.mana=Number.isFinite(u.medicStamina)?u.medicStamina:u.maxMana;
  delete u.medicStamina;
  u.mana=Math.max(0,Math.min(u.maxMana,u.mana));
  if(isPlayerCaster(u)&&!MAGIC_AFFINITIES[u.magicAffinity])u.magicAffinity='fire';
  if(isMage(u)&&!MAGIC_AFFINITIES[u.magicAffinity]){
    let h=2166136261;for(const char of String(u.id||u.name||'mage'))h=Math.imul(h^char.charCodeAt(0),16777619);
    u.magicAffinity=Object.keys(MAGIC_AFFINITIES)[(h>>>0)%4];
  }
  return u.mana;
}
export function spendMana(u,cost) {if(!manaCapacity(u)||!(cost>0)||ensureMana(u)<cost)return false;u.mana-=cost;practiceAttribute(u,'magic',cost/18);return true;}
export function regenerateMana(u,dt) {
  if(!active(u)||!manaCapacity(u)||!(dt>0))return 0;
  ensureMana(u);u.mana=Math.min(u.maxMana,u.mana+(isMage(u)?(u.magicRecovering?4:.5):.6)*dt);return u.mana;
}
const units=game=>[game.player,...(game.squad||[]),...(game.reserves||[])].filter(Boolean);
export function distributeMagicStones(game,amount=0) {
  game.magicReserve=Math.max(0,Number(game.magicReserve)||0)+Math.max(0,Math.floor(Number(amount)||0));
  if(game.magicReserve<=0)return 0;
  const recipients=units(game).filter(u=>active(u)&&manaCapacity(u));let delivered=0;
  while(game.magicReserve>0){let changed=false;for(const u of recipients){ensureMana(u);const need=u.maxMana-u.mana;if(need<=0)continue;const fill=Math.min(1,need,game.magicReserve);u.mana+=fill;game.magicReserve-=fill;delivered+=fill;changed=true;if(!game.magicReserve)break;}if(!changed)break;}
  return delivered;
}
export function initializeMagic(game,saved=null) {
  game.magicReserve=Math.max(0,Math.floor(Number(saved?.magicReserve)||0));game.magicBursts=[];game._manaSupplyClock=0;
  for(const u of units(game))if(manaCapacity(u)){ensureMana(u);if(!saved){u.mana=u.maxMana;u.magicRecovering=false;}}
}
// 防衛戦（定期侵攻・本格侵攻の戦闘中、およびランダム強襲）の本陣での魔導兵の魔力回復量（毎秒）。
export const HQ_DEFENSE_MANA_REGEN=3;
export const isDefenseBattle=game=>game?.invasions?.stage==='battle'||!!game?.baseRaidActive;
export function updateMagic(game,dt,supplyLocation) {
  game._manaSupplyClock=(game._manaSupplyClock||0)+dt;const supplyDue=game._manaSupplyClock>=.25,supplyElapsed=game._manaSupplyClock;if(supplyDue)game._manaSupplyClock=0;
  const defending=isDefenseBattle(game);
  for(const u of units(game)){
    const strengthWasActive=u._casterStrengthTimer>0;
    u._casterStrengthTimer=Math.max(0,(u._casterStrengthTimer||0)-dt);
    u._casterStrengthCooldown=Math.max(0,(u._casterStrengthCooldown||0)-dt);
    if(strengthWasActive&&!u._casterStrengthTimer){u._casterStrengthBonus=0;game.recalcSoldierStats(u);}
    u.magicAttackTimer=Math.max(0,(u.magicAttackTimer||0)-dt);u.magicWardTimer=Math.max(0,(u.magicWardTimer||0)-dt);
    if(!u.magicAttackTimer)u.magicAttackBonus=0;if(!u.magicWardTimer)u.magicWardBonus=0;
    if(!manaCapacity(u)||!active(u))continue;
    regenerateMana(u,dt);u.magicBuffCooldown=Math.max(0,(u.magicBuffCooldown||0)-dt);
    if(supplyDue){const place=supplyLocation(game,u);if(place){
      // 防衛戦の本陣では魔導兵と魔法装備の隊長は自然回復。他の補給地点は全回復。
      if(defending&&isSpellcaster(u)&&place.kind==='base'){u.mana=Math.min(u.maxMana,u.mana+HQ_DEFENSE_MANA_REGEN*supplyElapsed);}
      else{u.mana=u.maxMana;u.magicRecovering=false;}
    }}
  }
  for(const m of game.monsters||[]){m.magicSlowTimer=Math.max(0,(m.magicSlowTimer||0)-dt);m.magicStunTimer=Math.max(0,(m.magicStunTimer||0)-dt);}
  for(const b of game.magicBursts||[])b.life-=dt;
  game.magicBursts=(game.magicBursts||[]).filter(b=>b.life>0);
  if(supplyDue)distributeMagicStones(game);
}
export function castCasterStrength(game,medic) {
  if(!active(medic)||!MEDIC_IDS.includes(medic.soldierClass)||!prefersCasterMelee(medic)||medic._casterStrengthTimer>0||medic._casterStrengthCooldown>0)return false;
  if(!spendMana(medic,8))return false;
  medic._casterStrengthBonus=Math.max(3,Math.round(attributeValues(medic).strength*.2));
  medic._casterStrengthTimer=8;medic._casterStrengthCooldown=16;
  game.recalcSoldierStats(medic);recordCombat(medic);return true;
}
export function castMedicBuff(game,medic) {
  if(!active(medic)||!MEDIC_IDS.includes(medic.soldierClass)||magicTier(medic)<1||medic.magicBuffCooldown>0||ensureMana(medic)<40)return false;
  if(!(game.monsters||[]).some(m=>m.hp>0&&Math.hypot(m.x-medic.x,m.y-medic.y)<300))return false;
  const targets=units(game).filter(u=>active(u)&&(!game.currentDungeon||inCurrentInstance(game,u))&&Math.hypot(u.x-medic.x,u.y-medic.y)<=170);
  if(!targets.some(u=>!(u.magicAttackTimer>2)))return false;
  if(!spendMana(medic,24))return false;
  const tier=magicTier(medic);for(const u of targets){u.magicAttackTimer=8+tier;u.magicAttackBonus=Math.max(u.magicAttackBonus||0,.1+tier*.05);u.magicWardTimer=8+tier;u.magicWardBonus=Math.max(u.magicWardBonus||0,.08+tier*.04);}
  sound.playHeal(medic.x,medic.y);medic.magicBuffCooldown=18;recordCombat(medic);game.spawnDamageText?.(medic.x,medic.y-38,'攻撃・守護の加護','#c8c3a3');return true;
}
function releaseSpell(game,caster,target,{power=false,outpost=null}={}) {
  ensureMana(caster);const spell=MAGIC_AFFINITIES[caster.magicAffinity];
  const isPlayer=caster===game.player,charged=isPlayer&&power;
  if(!spendMana(caster,charged?PLAYER_MAGIC_RULES.powerCost:spell.cost))return false;
  const tier=magicTier(caster),radius=spell.radius*(1+tier*.12)*(charged?PLAYER_MAGIC_RULES.powerRadius:1);
  const damage=Math.round((caster.magicAttack||caster.atk)*spell.damage*(charged?PLAYER_MAGIC_RULES.powerDamage:1));
  sound.playMagic(caster.magicAffinity,caster.x,caster.y);
  const x=target.x,y=target.y,cd=spell.cooldown/(isPlayer?(caster.atkSpeed||1):1+tier*.1);
  caster.atkCooldown=charged?Math.max(caster.atkCooldown||0,cd):cd;
  caster.atkAnim=1;caster.attackAngle=caster.facingAngle=Math.atan2(y-caster.y,x-caster.x);
  if(isPlayer){caster.slashAnim=charged?1.6:1;caster.slashAngle=caster.attackAngle;}
  // Sparse marks show the hit area without particles or screen flashes.
  game.magicBursts||=[];if(game.magicBursts.length>=12)game.magicBursts.shift();game.magicBursts.push({x,y,radius,color:spell.color,affinity:caster.magicAffinity,life:.3});
  for(const m of [...(game.monsters||[])])if(active(m)&&!m.retreated&&Math.hypot(m.x-x,m.y-y)<=radius){
    if(caster.magicAffinity==='ice')m.magicSlowTimer=3;
    if(caster.magicAffinity==='lightning'&&!m.isColossal)m.magicStunTimer=.6;
    game.performAttack(caster,m,isPlayer,damage,false,'magic');
  }
  if(outpost)game.damageOutpost(outpost,damage);
  recordCombat(caster);return true;
}
export function castMageSpell(game,mage,target) {
  if(!active(mage)||!active(target)||!isMage(mage))return false;
  return releaseSpell(game,mage,target);
}
export function castPlayerSpell(game,{power=false,target,outpost}={}) {
  const player=game.player;
  if(!game.inBattle||game.restTimer>0||!active(player)||!isPlayerCaster(player))return false;
  if((power?player.powerAtkCooldown:player.atkCooldown)>0)return false;
  const range=PLAYER_MAGIC_RULES.range;
  if(target===undefined)target=game.getNearestMonster(player.x,player.y);
  if(outpost===undefined)outpost=game.getNearestUnclearedOutpost(player.x,player.y);
  const inRange=active(target)&&!target.retreated&&Math.hypot(target.x-player.x,target.y-player.y)<=range;
  const hitOutpost=!inRange&&outpost&&!outpost.cleared&&Math.hypot(outpost.x-player.x,outpost.y-player.y)<=range+(outpost.radius||0);
  if(!inRange&&!hitOutpost)return false;
  if(!releaseSpell(game,player,inRange?target:outpost,{power,outpost:hitOutpost?outpost:null}))return false;
  if(power){player.powerAtkCooldown=PLAYER_MAGIC_RULES.powerCooldown;game.updatePowerAtkButtonUI();}
  return true;
}
export function updateMageAI(game,mage,dt,platoon,cls) {
  ensureMana(mage);const spell=MAGIC_AFFINITIES[mage.magicAffinity];mage.atkCooldown=Math.max(0,(mage.atkCooldown||0)-dt);mage.atkAnim=Math.max(0,(mage.atkAnim||0)-dt*4);
  const melee=prefersCasterMelee(mage);
  if(melee)mage.magicRecovering=false;
  else if(mage.mana<spell.cost)mage.magicRecovering=true;
  if(mage.magicRecovering){if(mage.mana<40){mage.vx=mage.vy=0;return;}mage.magicRecovering=false;}
  const away=isSoldierOnExpedition(platoon,mage),free=mage.isPersonalGuard||game.currentDungeon||away;
  mage._magicSearchClock=(mage._magicSearchClock||0)+dt;
  if(mage._magicSearchClock>=.2||!active(mage._magicEnemy)){mage._magicSearchClock=0;mage._magicEnemy=free?game.getNearestMonster(mage.x,mage.y):game.getNearestFromList(mage.x,mage.y,game._baseThreatList);}
  const target=mage._magicEnemy,dist=target?Math.hypot(target.x-mage.x,target.y-mage.y):Infinity;
  const anchor=mage.isPersonalGuard?game.player:(away?platoon:{x:WORLD_SIZE/2+(platoon.id-1)*70,y:WORLD_SIZE/2});
  const angle=(mage._guardSlot||0)*1.25+(mage.platoonId||0)*1.1;let tx=anchor.x+Math.cos(angle)*55,ty=anchor.y+Math.sin(angle)*55;
  if(target&&dist<400){if(melee){tx=target.x;ty=target.y;}else if(dist<100){tx=mage.x-(target.x-mage.x);ty=mage.y-(target.y-mage.y);}else if(dist<=cls.range){tx=mage.x;ty=mage.y;}}
  const goal=game.dungeonMoveTarget?.(mage,{x:tx,y:ty})||{x:tx,y:ty};
  const dx=goal.x-mage.x,dy=goal.y-mage.y,d=Math.hypot(dx,dy),step=Math.min(d,(mage.speed||90)*dt);mage.vx=d>4?dx/d:0;mage.vy=d>4?dy/d:0;
  if(d>4){mage.x+=dx/d*step;mage.y+=dy/d*step;mage.facingAngle=Math.atan2(dy,dx);}
  if(target&&mage.atkCooldown<=0){if(melee)game.performCasterMelee(mage,target);else if(dist<=cls.range)castMageSpell(game,mage,target);}
}
export function drawMagicBursts(ctx,game) {
  for(const b of game.magicBursts||[]){ctx.save();ctx.globalAlpha=Math.max(0,b.life/.3)*.42;ctx.strokeStyle=b.color;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(b.x,b.y,b.radius,0,Math.PI*2);ctx.stroke();ctx.fillStyle=b.color;ctx.beginPath();ctx.arc(b.x,b.y,5,0,Math.PI*2);ctx.fill();ctx.restore();}
}
export const magicMethods={
  refreshMagicUI() {
    if(!this.player)return;
    const casters=units(this).filter(u=>u!==this.player&&active(u)&&isMagicUser(u));let badge=document.getElementById('magic-status-badge');const host=document.querySelector('.field-status');
    let playerBadge=document.getElementById('player-magic-status');
    if(!playerBadge&&host){playerBadge=document.createElement('div');playerBadge.id='player-magic-status';playerBadge.className='supply-status-badge magic-status-badge';host.prepend(playerBadge);}
    if(playerBadge){playerBadge.classList.toggle('hidden',!isPlayerCaster(this.player));playerBadge.textContent=isPlayerCaster(this.player)?`隊長 ${this.magicUnitDescription(this.player)}`:'';}
    if(!badge&&host){badge=document.createElement('div');badge.id='magic-status-badge';badge.className='supply-status-badge magic-status-badge';host.append(badge);}
    if(badge){const text=`MP ${Math.floor(casters.reduce((n,u)=>n+ensureMana(u),0))}/${casters.reduce((n,u)=>n+u.maxMana,0)} · 不足${casters.filter(u=>u.mana<(isMage(u)?MAGIC_AFFINITIES[u.magicAffinity].cost:16)).length}名 / 瞑想${casters.filter(u=>u.magicRecovering).length}名 · 予備 ${Math.floor(this.magicReserve||0)}MP`;this._magicStatusChanged=badge.textContent!==text;badge.textContent=text;badge.classList.toggle('hidden',!casters.length);}
  },
  magicUnitDescription(u) {
    if(!isMagicUser(u))return '';ensureMana(u);
    if(isPlayerCaster(u))return `MP ${Math.floor(u.mana)}/${u.maxMana} · ${MAGIC_AFFINITIES[u.magicAffinity].name}魔法${u.mana<MAGIC_AFFINITIES[u.magicAffinity].cost?' · MP不足（回復待ち）':''}`;
    const affinity=isMage(u)?` · 得意魔法：${MAGIC_AFFINITIES[u.magicAffinity].name}${u.magicRecovering?' · 瞑想中（移動不可）':''}`:(magicTier(u)>0?' · 攻撃・守護バフ使用可':' · クラスアップでバフ解放');
    return `MP ${Math.floor(u.mana)}/${u.maxMana}${affinity}${!isMage(u)&&u.mana<16?' · MP不足（回復待ち）':''}`;
  }
};
