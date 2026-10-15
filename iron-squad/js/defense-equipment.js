import {TIERS,materialTier,generation,powerRank} from './equipment-tiers.js?v=231';
import {isMage} from './magic-rules.js?v=277';
import {attributeFamily,isMuscleCaster} from './unit-attributes.js?v=274';

export const DEFENSE_TYPES=['SHIELD','HELMET','ARMOR','GLOVES','LEGS','AMULET'];
export const CASTER_GEAR={
  arcane:{name:'魔導',color:'#7f719b',magic:1,heal:0,barrier:.5},
  healing:{name:'治癒',color:'#d2c9ab',magic:.2,heal:1,barrier:.5},
  ward:{name:'結界',color:'#668d98',magic:0,heal:0,barrier:1}
};
const PIECES={SHIELD:'護符盾',HELMET:'頭巾',ARMOR:'ローブ',GLOVES:'手袋',LEGS:'脚衣',AMULET:'護符'};
const WEIGHTS={SHIELD:.6,HELMET:.4,ARMOR:1,GLOVES:.35,LEGS:.45,AMULET:.6};
const LIGHT_REQUIREMENTS={SHIELD:3,HELMET:1,ARMOR:3,GLOVES:1,LEGS:2,AMULET:0};
const HEAVY_REQUIREMENTS=[0,12,34,50,42,68,80];
const STRENGTH_WEIGHTS={SHIELD:.8,HELMET:.65,ARMOR:1,GLOVES:.45,LEGS:.55,AMULET:0};
export const isCasterGear=item=>!!CASTER_GEAR[item?.armorStyle]&&DEFENSE_TYPES.includes(item?.type);
export const casterGearName=(style,type,tier)=>`${CASTER_GEAR[style].name}の${PIECES[type]}・${TIERS[tier-1].mat}・${generation(tier)}型`;
/** Infer old armour requirements too; an old minStrength:0 cannot bypass a metal plate. */
export function requiredDefenseStrength(item) {
  // Revelation equipment already has its own party-only access rule and fixed stats.
  if(item?.heroOnly)return 0;
  if(!DEFENSE_TYPES.includes(item?.type))return 0;
  if(isCasterGear(item))return LIGHT_REQUIREMENTS[item.type];
  const base=HEAVY_REQUIREMENTS[materialTier(item.tier)-1];
  return Math.ceil((base+(base?2*(generation(item.tier)-1):0))*STRENGTH_WEIGHTS[item.type]);
}
/** Called once after each full regeneration of the ordinary equipment stats. */
export function applyDefenseEquipment(item) {
  if(!DEFENSE_TYPES.includes(item?.type)||item.heroOnly)return;
  item.minStrength=requiredDefenseStrength(item);
  if(!isCasterGear(item))return;
  const gear=CASTER_GEAR[item.armorStyle],s=item.stats,rank=powerRank(item.tier),weight=WEIGHTS[item.type];
  const quality=Math.max(.65,Math.min(1.5,Number(item.rollMult)||1));
  s.def=Math.floor((s.def||0)*.25);s.hp=Math.floor((s.hp||0)*.55);
  delete s.atk;delete s.blockChance;delete s.vampire;delete s.regen;
  delete s.magicBonus;delete s.healBonus;delete s.barrier;delete s.magicDefense;
  if(gear.magic)s.magicBonus=Math.round((8+rank*2)*weight*gear.magic*quality);
  if(gear.heal)s.healBonus=Math.round((10+rank*3)*weight*gear.heal*quality);
  s.magicDefense=Math.floor((6+rank*4)*TIERS[item.tier-1].mult*weight*quality);
  s.barrier=Math.max(1,Math.floor(40*TIERS[item.tier-1].mult*weight*gear.barrier*(1+(item.upgrade||0)*.25)*quality));
}
export function casterEquipmentSummary(item) {
  const s=item?.stats||{},parts=[];
  if(s.magicBonus)parts.push(`魔力補正+${s.magicBonus}%`);
  if(s.healBonus)parts.push(`回復補正+${s.healBonus}%`);
  if(s.magicDefense)parts.push(`魔法防御+${s.magicDefense}`);
  if(s.barrier)parts.push(`バリア+${s.barrier}（物理50%・魔法100%吸収／指揮官・魔法使い・衛生術師のみ有効、筋肉魔法使いは対象外）`);
  return parts.join(' · ');
}
export const BARRIER_RULES=Object.freeze({absorb:.5,magicAbsorb:1.0,rechargeDelay:8,rechargeRate:.06});
export const canUseEquipmentBarrier=unit=>attributeFamily(unit)==='COMMANDER'
  ||(isMage(unit)?!isMuscleCaster(unit):['MEDIC','HIGH_PRIEST','SAINT','ARCHANGEL'].includes(unit?.combatClass||unit?.soldierClass));
/** Equipment swaps and recalculation never refill an existing barrier. */
export function syncEquipmentBarrier(unit,maximum) {
  const first=!Number.isFinite(unit.equipmentBarrier),cap=canUseEquipmentBarrier(unit)?Math.max(0,Math.floor(maximum)):0;
  unit.equipmentBarrierMax=cap;
  unit.equipmentBarrier=first?cap:Math.max(0,Math.min(cap,unit.equipmentBarrier));
  unit.equipmentBarrierDelay=Math.max(0,Math.min(BARRIER_RULES.rechargeDelay,Number(unit.equipmentBarrierDelay)||0));
}
export function absorbEquipmentBarrier(unit,damage,magical=false) {
  if(!canUseEquipmentBarrier(unit))return {damage,absorbed:0};
  const rate=magical?(BARRIER_RULES.magicAbsorb||1.0):BARRIER_RULES.absorb;
  const absorbed=Math.min(Math.floor(Math.max(0,unit.equipmentBarrier||0)),Math.floor(damage*rate));
  if(unit.equipmentBarrierMax>0)unit.equipmentBarrierDelay=BARRIER_RULES.rechargeDelay;
  unit.equipmentBarrier=Math.max(0,(unit.equipmentBarrier||0)-absorbed);
  return {damage:damage-absorbed,absorbed};
}
export function updateEquipmentBarrier(unit,dt) {
  if(!unit||unit.dead||unit.isDown||!(unit.hp>0)||!(dt>0)||!unit.equipmentBarrierMax||!canUseEquipmentBarrier(unit))return;
  const delay=unit.equipmentBarrierDelay||0;
  unit.equipmentBarrierDelay=Math.max(0,delay-dt);
  const charging=Math.max(0,dt-delay);
  unit.equipmentBarrier=Math.min(unit.equipmentBarrierMax,(unit.equipmentBarrier||0)+unit.equipmentBarrierMax*BARRIER_RULES.rechargeRate*charging);
}

/** Thin ward-coloured ring around a unit that still holds barrier. World coordinates; no allocation, one stroke. */
export function barrierRingAlpha(unit,now=0) {
  const max=unit?.equipmentBarrierMax||0;
  if(!(max>0)||unit.dead||unit.isDown||unit.dying||!(unit.hp>0)||!canUseEquipmentBarrier(unit))return 0;
  const ratio=Math.max(0,Math.min(1,(unit.equipmentBarrier||0)/max));
  if(!(ratio>0))return 0;
  return (.12+.33*ratio)*(.88+.12*Math.sin(now*.002));
}
export function drawBarrierRing(c,unit,now=0) {
  const alpha=barrierRingAlpha(unit,now);
  if(!(alpha>0))return false;
  c.save();
  c.globalAlpha=alpha;c.strokeStyle='#90b9c5';c.lineWidth=1.5;
  c.beginPath();c.ellipse(unit.x,unit.y-12,17,23,0,0,Math.PI*2);c.stroke();
  c.restore();
  return true;
}
