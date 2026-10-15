import {levelGrowthSteps} from './level-growth.js?v=274';
import {heroGrowth} from './hero-rules.js';
import {syncEquipmentBarrier} from './defense-equipment.js?v=261';
import {isLateBloomer} from './talent-labels.js?v=247';
/** 個体の素質と、実際の行動から育つ能力。装備・職業・Lvの再計算では履歴を変更しない。 */
export const ATTRIBUTE_KEYS = ['strength','magic','magicDefense','quickness','evasion'];
export const ATTRIBUTE_LABELS = {strength:'筋力',magic:'魔力',magicDefense:'魔法防御',quickness:'速さ',evasion:'回避'};
export const ATTRIBUTE_RULES = {cap:255,softCapStart:100,levelStrength:2.5,casterLevelStrength:.005,casterMuscleChance:.002,casterMeleeUnlockStrength:18,levelMagic:2.5,levelMagicDefense:1.4,levelQuickness:1.1,levelEvasion:.18,travelScale:1500,carryStrength:40,carryMax:6,dodgeChanceMax:99};
export const ATTRIBUTE_BASES = {
  HEAVY:{strength:25,magic:12,magicDefense:8,quickness:15,evasion:2},
  LIGHT:{strength:20,magic:10,magicDefense:6,quickness:28,evasion:5},
  ARCHER:{strength:18,magic:12,magicDefense:7,quickness:24,evasion:4},
  MEDIC:{strength:12,magic:30,magicDefense:14,quickness:18,evasion:2},
  MAGE:{strength:10,magic:35,magicDefense:12,quickness:16,evasion:2},
  COMMANDER:{strength:50,magic:18,magicDefense:8,quickness:20,evasion:2}
};
const FAMILIES={PALADIN:'HEAVY',TEMPLAR:'HEAVY',IMMORTAL_AEGIS:'HEAVY',BLADEMASTER:'LIGHT',SWORD_EMPEROR:'LIGHT',SWORD_SAINT:'LIGHT',VOID_EDGE:'LIGHT',SNIPER:'ARCHER',STORM_BOW:'ARCHER',STORM_ARCHER:'ARCHER',STAR_HUNTER:'ARCHER',HIGH_PRIEST:'MEDIC',SAINT:'MEDIC',ARCHANGEL:'MEDIC',ARCHMAGE:'MAGE',ELEMENTAL_SAGE:'MAGE',ARCANE_SOVEREIGN:'MAGE'};
const CLASS_STRENGTH={PALADIN:20,TEMPLAR:35,IMMORTAL_AEGIS:60};
export const TALENT_GROWTH={INFERIOR:.85,AVERAGE:1,TALENTED:1.16,ELITE:1.35,GENIUS:2.4};
/** 大器晩成は死線経験＋Lv31から開花。Lv40以降は1.55で固定し、保存済み素質/鍛錬は書き換えない。 */
export const talentGrowth=unit=>isLateBloomer(unit)?(85+Math.min(10,Math.max(0,(Number(unit.level)||1)-30))*7)/100:TALENT_GROWTH[unit?.talent]||1;
/** 凡庸＝叩き上げ：実戦で伸びる分（practice）だけに掛かる追加倍率。Lv成長には掛けない。有望株（1.16）とちょうど並ぶ値。 */
export const TALENT_PRACTICE_BONUS={AVERAGE:TALENT_GROWTH.TALENTED};
/** 素質の振れ幅。凡庸は当たり外れが小さい（他は従来の.65〜1.35）。 */
export const APTITUDE_ROLL_RANGE={AVERAGE:{min:.8,span:.45}};
const DEFAULT_APTITUDE_ROLL={min:.65,span:.7};
export const practiceGrowth=unit=>talentGrowth(unit)*(TALENT_PRACTICE_BONUS[unit?.talent]||1);
const positive=(value,fallback=0)=>Number.isFinite(Number(value))?Math.max(0,Number(value)):fallback;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export const attributeFamily=unit=>unit?.isPlayer||unit?.isHero?'COMMANDER':FAMILIES[unit?.soldierClass]||(ATTRIBUTE_BASES[unit?.combatClass]?unit.combatClass:ATTRIBUTE_BASES[unit?.baseClassId]?unit.baseClassId:ATTRIBUTE_BASES[unit?.soldierClass]?unit.soldierClass:'HEAVY');
export const emptyAttributePractice=()=>({strength:0,magic:0,magicDefense:0,travel:0,evasion:0});
export function rollAttributeProfile(classKey='HEAVY',talent='AVERAGE',random=Math.random,balanced=false) {
  const family=FAMILIES[classKey]||(ATTRIBUTE_BASES[classKey]?classKey:'HEAVY'),base=ATTRIBUTE_BASES[family],aptitudes={},innate={},roll=APTITUDE_ROLL_RANGE[talent]||DEFAULT_APTITUDE_ROLL;
  for(const key of ATTRIBUTE_KEYS)aptitudes[key]=balanced?1:roll.min+clamp(random(),0,.999999)*roll.span;
  if(!balanced){
    const type=random(),primary=ATTRIBUTE_KEYS[Math.floor(clamp(random(),0,.999999)*ATTRIBUTE_KEYS.length)];
    if(type<.45){aptitudes[primary]*=1.8;for(const key of ATTRIBUTE_KEYS)if(key!==primary)aptitudes[key]*=.82;}
    else if(type<.7){aptitudes[primary]*=1.45;const secondary=ATTRIBUTE_KEYS[(ATTRIBUTE_KEYS.indexOf(primary)+1+Math.floor(clamp(random(),0,.999999)*4))%5];aptitudes[secondary]*=1.45;}
  }
  const gift=talent==='GENIUS'?1.2:talent==='ELITE'?1.08:1;
  for(const key of ATTRIBUTE_KEYS){aptitudes[key]=Math.round(clamp(aptitudes[key],.35,3)*100)/100;innate[key]=Math.round(base[key]*aptitudes[key]*gift*100)/100;}
  if(family==='MEDIC'||family==='MAGE'){
    // Most casters never reach even the lightest melee requirement through levels.
    aptitudes.strength=Math.min(1.2,aptitudes.strength);innate.strength=Math.min(14,innate.strength);
    if(!balanced&&random()<ATTRIBUTE_RULES.casterMuscleChance){
      innate.strength=Math.round((36+clamp(random(),0,.999999)*42)*gift);
      aptitudes.strength=Math.round((1.6+clamp(random(),0,.999999)*.8)*100)/100;
    }
  }
  return {version:1,family,innate,aptitudes,practice:emptyAttributePractice()};
}
function identityRandom(unit) {
  let seed=2166136261;for(const char of String(unit.id||unit.name||unit.soldierClass||'soldier'))seed=Math.imul(seed^char.charCodeAt(0),16777619);
  return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
}
export function ensureAttributeProfile(unit) {
  if(unit._attributesNormalized&&unit.attributeProfile)return unit.attributeProfile;
  const family=attributeFamily(unit),fallback=rollAttributeProfile(family,unit.talent,identityRandom(unit),family==='COMMANDER');
  const data=unit.attributeProfile;
  if(data?.version===1&&data.innate&&data.aptitudes&&data.practice){
    for(const key of ATTRIBUTE_KEYS){fallback.innate[key]=positive(data.innate[key],fallback.innate[key]);fallback.aptitudes[key]=clamp(positive(data.aptitudes[key],1),.35,3);}
    for(const key of Object.keys(fallback.practice))fallback.practice[key]=positive(data.practice[key]);
    fallback.family=ATTRIBUTE_BASES[data.family]?data.family:family;
  }
  unit.attributeProfile=fallback;unit._attributesNormalized=true;return fallback;
}
const trainingValue=(kind,value)=>kind==='travel'?2*Math.sqrt(value/ATTRIBUTE_RULES.travelScale):kind==='evasion'?.6*Math.sqrt(value):2*Math.sqrt(value);
function unassistedStrengthPotential(unit,profile) {
  const caster=['MEDIC','MAGE'].includes(attributeFamily(unit));
  const growth=profile.aptitudes.strength*talentGrowth(unit);
  return profile.innate.strength+levelGrowthSteps(unit.level)*(caster?ATTRIBUTE_RULES.casterLevelStrength:ATTRIBUTE_RULES.levelStrength)*growth
    +trainingValue('strength',profile.practice.strength)*profile.aptitudes.strength*practiceGrowth(unit)+(CLASS_STRENGTH[unit.soldierClass]||0);
}
/** The melee growth unlock also determines physique. Rendering only reads saved abilities. */
export function isMuscleCaster(unit) {
  if(!['MEDIC','MAGE'].includes(attributeFamily(unit)))return false;
  const profile=unit?.attributeProfile;
  return !!(profile?.version===1&&profile.innate&&profile.aptitudes&&profile.practice
    &&unassistedStrengthPotential(unit,profile)>=ATTRIBUTE_RULES.casterMeleeUnlockStrength);
}
/** Stored progress remains cumulative; the same additional effort yields less near 255. */
export function cappedAttributeValue(potential,precision=1,min=0) {
  const {cap,softCapStart}=ATTRIBUTE_RULES,span=cap-softCapStart;
  const value=potential<=softCapStart?potential:softCapStart+span*(-Math.expm1(-(potential-softCapStart)/span));
  return clamp(Math.round(value*precision)/precision,min,cap);
}
export const evasionChance=value=>Math.min(ATTRIBUTE_RULES.dodgeChanceMax,value*.36+7.2*Math.pow(value/ATTRIBUTE_RULES.cap,4));
/** Ordinary soldiers only. Commander and independent hero/NPC combat keep their existing clocks. */
export const usesSoldierTempo=unit=>!!(unit?.soldierClass||unit?.combatClass)&&!unit.isPlayer&&!unit.isCommander&&!unit.heroPartyId&&!unit.isGateGuard&&!unit.isMerchantEscort&&attributeFamily(unit)!=='COMMANDER';
export const soldierCombatTempo=unit=>usesSoldierTempo(unit)?clamp((15/Math.max(1,Number(unit.quickness)||15))**.35,.60,1):1;
export function attributeValues(unit) {
  const p=ensureAttributeProfile(unit),lv=levelGrowthSteps(unit.level),gift=talentGrowth(unit);
  const trained=(key,levelGain,kind=key)=>p.innate[key]+lv*levelGain*p.aptitudes[key]*gift+trainingValue(kind,p.practice[kind])*p.aptitudes[key]*practiceGrowth(unit);
  const caster=['MEDIC','MAGE'].includes(attributeFamily(unit));
  let strengthPotential=unassistedStrengthPotential(unit,p);
  const weapon=unit.equipped?.weapon||unit.weapon;
  if(caster&&isMuscleCaster(unit)&&['sword','spear','hammer','axe'].includes(weapon?.weaponStyle))strengthPotential+=lv*(ATTRIBUTE_RULES.levelStrength-ATTRIBUTE_RULES.casterLevelStrength)*p.aptitudes.strength*gift;
  const baseStrength=cappedAttributeValue(strengthPotential,1,1);
  const strength=Math.min(ATTRIBUTE_RULES.cap,baseStrength+(unit._casterStrengthTimer>0?unit._casterStrengthBonus||0:0));
  const magic=cappedAttributeValue(trained('magic',ATTRIBUTE_RULES.levelMagic),1,1);
  const magicDefense=cappedAttributeValue(trained('magicDefense',ATTRIBUTE_RULES.levelMagicDefense)+magic*.25);
  const quickness=cappedAttributeValue(trained('quickness',ATTRIBUTE_RULES.levelQuickness,'travel'),1,1);
  const evasion=cappedAttributeValue(trained('evasion',ATTRIBUTE_RULES.levelEvasion)+quickness*.09,10);
  return {strength,magic,magicDefense,quickness,evasion};
}
/** 再計算済みの装備・職業の実能力へ適用。毎回、元の計算結果を渡す。 */
export function attributeMultipliers(unit,values=attributeValues(unit)) {
  const family=attributeFamily(unit),base=ATTRIBUTE_BASES[family];
  // 術士の筋力は基準を超えた分を戦士と同じ割合で効かせる（基準10で割ると戦士の約2倍になっていた）。猛烈な一撃はMPを使う瞬間だけ
  const physical=['MEDIC','MAGE'].includes(family)&&values.strength>base.strength?1+(values.strength-base.strength)/CASTER_STRENGTH_SCALE:values.strength/base.strength;
  return {physical:Math.max(.1,physical),magic:Math.max(.03,values.magic/base.magic),movement:.8+.2*values.quickness/base.quickness};
}
export function applyAttributeStats(unit) {
  const values=attributeValues(unit),{physical,magic,movement}=attributeMultipliers(unit,values);
  const equipmentMagicDefense=Object.values(unit.equipped||{}).reduce((sum,item)=>sum+Math.max(0,Number(item?.stats?.magicDefense)||0),0);
  const equipment=Object.values(unit.equipped||{}).filter(Boolean);
  const bonus=key=>equipment.reduce((sum,item)=>sum+Math.max(0,Number(item.stats?.[key])||0),0);
  unit.equipmentMagicBonus=bonus('magicBonus');unit.equipmentHealBonus=bonus('healBonus');
  unit.strength=values.strength;unit.magicPower=values.magic;unit.magicDef=values.magicDefense+equipmentMagicDefense;unit.quickness=values.quickness;unit.evasion=values.evasion;
  unit.magicAttack=Math.max(1,Math.floor((unit._magicBaseAttack??unit.atk??1)*magic*(1+unit.equipmentMagicBonus/100)));
  unit.atk=Math.max(1,Math.floor((unit.atk||1)*physical));
  if(unit.healPower>0)unit.healPower=Math.max(1,Math.floor(unit.healPower*magic*(1+unit.equipmentHealBonus/100)));
  syncEquipmentBarrier(unit,bonus('barrier'));
  unit.speed=Math.max(40,Math.floor((unit.speed||100)*movement));
  const legacyDodge=clamp((unit.dodge||0)+(unit.soldierClass==='BLADEMASTER'?25:0),0,ATTRIBUTE_RULES.dodgeChanceMax);
  unit.dodge=Math.round((legacyDodge+(ATTRIBUTE_RULES.dodgeChanceMax-legacyDodge)*evasionChance(values.evasion)/ATTRIBUTE_RULES.dodgeChanceMax)*10)/10;
  unit._attributesDirty=false;
  return values;
}
export function practiceAttribute(unit,kind,amount=1) {
  if(!unit||unit.dead||unit.isDown||!(unit.hp>0)||!Number.isFinite(amount)||amount<=0)return false;
  const p=ensureAttributeProfile(unit);if(!(kind in p.practice))return false;
  const before=p.practice[kind],after=Math.min(Number.MAX_SAFE_INTEGER,before+amount*heroGrowth(unit));p.practice[kind]=after;
  const key=kind==='travel'?'quickness':kind,gift=practiceGrowth(unit),precision=kind==='evasion'?10:1;
  if(Math.floor(trainingValue(kind,before)*p.aptitudes[key]*gift*precision)!==Math.floor(trainingValue(kind,after)*p.aptitudes[key]*gift*precision))unit._attributesDirty=true;
  return true;
}
export function attributeCarryCapacity(unit) {
  if(!unit)return 1;
  return clamp(1+Math.floor(attributeValues(unit).strength/ATTRIBUTE_RULES.carryStrength),1,ATTRIBUTE_RULES.carryMax);
}
export function attributeSpecialties(unit) {
  const p=ensureAttributeProfile(unit);
  return ATTRIBUTE_KEYS.filter(key=>p.aptitudes[key]>=1.3).sort((a,b)=>p.aptitudes[b]-p.aptitudes[a]).slice(0,2).map(key=>`${ATTRIBUTE_LABELS[key]}特化`);
}
/** Off-type or extreme aptitudes worth a second look in recruitment (magic swordsman / magic shooter for archers, muscle mage...).
 *  Rare by design: about 3% of fighters, 0.2% of casters, plus aptitudes of 2.4 or more. */
export function standoutAptitude(unit) {
  const p=ensureAttributeProfile(unit),a=p.aptitudes;
  // 弓兵は剣でなく魔法の矢を撃つので「マジックシューター」と呼ぶ
  if(['HEAVY','LIGHT','ARCHER'].includes(p.family)&&a.magic>=2&&a.magic>=a.strength*2)return `${p.family==='ARCHER'?'マジックシューター':'魔法剣士'}の素質（魔力が突出）`;
  if(['MAGE','MEDIC'].includes(p.family)&&a.strength>=1.6)return '筋肉魔術師の素質（筋力が突出）';
  const top=ATTRIBUTE_KEYS.reduce((best,key)=>a[key]>a[best]?key:best,ATTRIBUTE_KEYS[0]);
  return a[top]>=2.4?`${ATTRIBUTE_LABELS[top]}が突出`:null;
}
export const aptitudeGrade=value=>value>=1.7?'S':value>=1.3?'A':value>=1?'B':value>=.75?'C':'D';
export const prefersCasterMelee=unit=>['MEDIC','MAGE'].includes(attributeFamily(unit))&&['sword','spear','hammer','axe'].includes((unit.equipped?.weapon||unit.weapon)?.weaponStyle)&&(unit.atk||0)>(unit.magicAttack||unit.atk||1)*1.4;
export const magicAbilityMultiplier=unit=>attributeMultipliers(unit).magic;
const CASTER_STRENGTH_SCALE=20;
/** ムキムキ術士の近接：MPを使った一撃だけ強化。倍率は2倍から筋力＋魔力で伸び、上限5倍 */
export const CASTER_STRIKE_COST=55;
export const casterStrikeMultiplier=unit=>{const v=attributeValues(unit);return Math.min(5,Math.round((2+(v.strength+v.magic)/120)*10)/10);};
export const CHANNEL_WEAPON_STYLES=['sword','spear','hammer','axe','bow'];
export function canChannelWeaponMagic(unit) {
  if(!unit||!['HEAVY','LIGHT','ARCHER'].includes(attributeFamily(unit)))return false;
  if(!CHANNEL_WEAPON_STYLES.includes((unit.equipped?.weapon||unit.weapon)?.weaponStyle))return false;
  const v=attributeValues(unit),base=ATTRIBUTE_BASES[attributeFamily(unit)];
  return v.magic>=30&&v.magic/base.magic>v.strength/base.strength*1.4;
}

function forEachFieldUnit(game,visit) {
  if(game.player)visit(game.player);
  for(const unit of game.squad||[])visit(unit);
  for(const merchant of game.merchants||[])for(const unit of merchant.escorts||[])visit(unit);
  for(const unit of game.gateGuards||[])visit(unit);
}
export function beginAttributeMovement(game) {
  forEachFieldUnit(game,unit=>{unit._attributeStartX=unit.x;unit._attributeStartY=unit.y;});
}
export function finishAttributeMovement(game,dt) {
  forEachFieldUnit(game,unit=>{
    const distance=Math.hypot(unit.x-unit._attributeStartX,unit.y-unit._attributeStartY);
    // Fast travel/entering another map is a coordinate change, not walking.
    if(Number.isFinite(distance)&&distance>0&&distance<=Math.max(1,unit.speed||100)*dt*3+10)practiceAttribute(unit,'travel',distance);
    if(unit._attributesDirty){if(unit===game.player)game.recalcPlayerStats();else game.recalcSoldierStats(unit);}
  });
}
