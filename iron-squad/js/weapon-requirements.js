import {powerRank} from './equipment-tiers.js?v=231';
import {attributeValues,attributeFamily,ATTRIBUTE_BASES} from './unit-attributes.js?v=334';
import {heroEquipmentAllowed} from './hero-equipment.js?v=295';
import {limitedClassOf} from './limited-lines.js?v=338';
import {requiredDefenseStrength,legacyDefenseStrength,armorStrengthCurve,DEFENSE_TYPES} from './defense-equipment.js?v=298';
export const MAGIC_WEAPON_STYLES=['staff','wand'];
/** v7.0.21: weapon requirement = max(old T1 value, coef x the armour-slot curve at that tier). Bows, crossbows, cannons and staves still need none. */
export const WEAPON_STRENGTH_RULES={sword:{floor:18,coef:.8},spear:{floor:24,coef:.9},hammer:{floor:32,coef:1},axe:{floor:32,coef:1}};
const LEGACY_WEAPON_STRENGTH_RULES={sword:{base:18,perRank:4},spear:{base:24,perRank:6},hammer:{base:32,perRank:10},axe:{base:32,perRank:10}};
export const weaponStrengthByTier=(style,tier)=>{const rule=WEAPON_STRENGTH_RULES[style||'sword'];return rule?Math.ceil(Math.max(rule.floor,rule.coef*armorStrengthCurve(tier))-1e-9):0;};
export function legacyWeaponStrength(item) {
  const rule=LEGACY_WEAPON_STRENGTH_RULES[item?.weaponStyle||'sword'];
  return rule?Math.ceil(rule.base+Math.max(0,powerRank(item.tier||1)-1)*rule.perRank):0;
}
export const isMagicWeapon=item=>MAGIC_WEAPON_STYLES.includes(item?.weaponStyle);
export function requiredWeaponStrength(item) {
  if(!item||item.type!=='WEAPON')return 0;
  if(Number.isFinite(item.minStrength))return Math.max(0,item.minStrength);
  return weaponStrengthByTier(item.weaponStyle,item.tier||1);
}
const holds=(unit,item)=>item?.id!=null&&(Object.values(unit?.equipped||{}).some(held=>held?.id===item.id)||unit?.weapon?.id===item.id);
/** Requirement as seen by one unit: a piece worn before v7.0.21 keeps its old (lower) requirement only while that unit still wears it. */
export function effectiveStrengthRequirement(unit,item) {
  const base=item?.type==='WEAPON'?requiredWeaponStrength(item):requiredDefenseStrength(item),legacy=Number(item?.legacyStrength);
  return Number.isFinite(legacy)&&legacy<base&&holds(unit,item)?legacy:base;
}
export const STRENGTH_REQUIREMENT_VERSION=1;
/** Once per item (strengthReqVersion): weapons get minStrength from the new table, equipped pieces whose requirement rose are grandfathered.
 *  held=true for items a unit wears right now; others never keep the old requirement. Must run BEFORE any applyUpgradeStats rebuild. */
export function migrateStrengthRequirement(item,held=false) {
  const weapon=item?.type==='WEAPON',defense=DEFENSE_TYPES.includes(item?.type);
  if(!item||item.heroOnly||(!weapon&&!defense))return item;
  if(!(item.strengthReqVersion>=STRENGTH_REQUIREMENT_VERSION)){
    if(Number.isFinite(item.tier)){
      const oldRequirement=weapon?(Number.isFinite(item.minStrength)?Math.max(0,item.minStrength):legacyWeaponStrength(item)):legacyDefenseStrength(item);
      let newRequirement=oldRequirement;
      if(weapon&&WEAPON_STRENGTH_RULES[item.weaponStyle||'sword'])item.minStrength=newRequirement=weaponStrengthByTier(item.weaponStyle,item.tier);
      else if(defense)item.minStrength=newRequirement=requiredDefenseStrength(item);
      if(held&&newRequirement>oldRequirement)item.legacyStrength=oldRequirement;
    }
    item.strengthReqVersion=STRENGTH_REQUIREMENT_VERSION;
  }
  if(!held)delete item.legacyStrength;
  return item;
}
/** Highest tier (<= the wanted one) a unit can really wear/wield as an ordinary issue, so supply never degrades into ward robes or staves. */
export function usableSupplyTier(unit,type,tier) {
  const family=attributeFamily(unit);
  if(family==='MAGE'||family==='MEDIC')return tier;
  const usable=t=>{
    if(type==='WEAPON'){const style=preferredWeaponStyle(unit,t);return !MAGIC_WEAPON_STYLES.includes(style)&&canUseWeapon(unit,{type:'WEAPON',weaponStyle:style,tier:t});}
    return !DEFENSE_TYPES.includes(type)||canUseEquipment(unit,{type,tier:t});
  };
  let t=Math.max(1,Math.floor(tier||1));
  while(t>1&&!usable(t))t--;
  return t;
}
/** v7.2.4 系列ごとに持てる武器の種類（忍者の系列は剣のみ）。一覧のない兵種・隊長・勇者は従来どおり。 */
export const allowedWeaponStylesFor=unit=>unit&&!unit.isPlayer&&!unit.isHero?limitedClassOf(unit)?.allowedWeaponStyles||null:null;
export const weaponStyleAllowed=(unit,item)=>{if(!item||item.type!=='WEAPON'||item.heroOnly)return true;const list=allowedWeaponStylesFor(unit);return !list||list.includes(item.weaponStyle||'sword');};
export const WEAPON_STYLE_LIMIT_TEXT='忍びは刀のみを携える';
export const canUseWeapon=(unit,item)=>heroEquipmentAllowed(unit,item)&&weaponStyleAllowed(unit,item)&&(!item||item.type!=='WEAPON'||attributeValues({...unit,equipped:{...unit?.equipped,weapon:item},weapon:item}).strength>=effectiveStrengthRequirement(unit,item));
export const canUseEquipment=(unit,item)=>canUseWeapon(unit,item)&&(!DEFENSE_TYPES.includes(item?.type)||attributeValues({...unit,_casterStrengthTimer:0,_casterStrengthBonus:0}).strength>=effectiveStrengthRequirement(unit,item));
export function equipmentRequirementText(unit,item) {
  if(item?.type==='WEAPON'||item?.heroOnly)return weaponRequirementText(unit,item);
  const required=effectiveStrengthRequirement(unit,item);
  const current=attributeValues({...unit,_casterStrengthTimer:0,_casterStrengthBonus:0}).strength;
  return `必要筋力${required} · ${canUseEquipment(unit,item)?'装備可':`筋力不足（必要${required}／現在${current}）`}`;
}
export const strengthShortfall=(unit,item)=>{
  if(!item||item.heroOnly||!(item.type==='WEAPON'||DEFENSE_TYPES.includes(item.type)))return null;
  const required=effectiveStrengthRequirement(unit,item);if(!required)return null;
  const current=attributeValues(item.type==='WEAPON'?unit:{...unit,_casterStrengthTimer:0,_casterStrengthBonus:0}).strength;
  return current>=required?null:{required,current};
};
/** Same wording as equipmentRequirementText, with the shortage in red (UI cards only). */
export function equipmentRequirementHtml(unit,item) {
  const text=equipmentRequirementText(unit,item),short=strengthShortfall(unit,item);
  return short||!weaponStyleAllowed(unit,item)||/筋力不足/.test(text)?`<span class="req-short">${text}</span>`:text;
}
export function preferredWeaponStyle(unit,tier=1,preferred=unit.favoriteWeapon) {
  const family=attributeFamily(unit),values=attributeValues(unit),base=ATTRIBUTE_BASES[family];
  const allowed=allowedWeaponStylesFor(unit);if(allowed)return allowed.includes(preferred)?preferred:allowed[0];
  const usable=style=>canUseWeapon(unit,{type:'WEAPON',weaponStyle:style,tier});
  if(family==='MEDIC'||family==='MAGE'){
    if(values.strength/base.strength>values.magic/base.magic*1.4){for(const style of ['hammer','spear','sword'])if(usable(style))return style;}
    return MAGIC_WEAPON_STYLES.includes(preferred)?preferred:family==='MEDIC'?'staff':'wand';
  }
  if(family==='ARCHER')return ['bow','crossbow','cannon'].includes(preferred)?preferred:'bow';
  for(const style of [preferred,'sword','spear','staff'])if(style&&usable(style))return style;
  return 'staff';
}
export const weaponRequirementText=(unit,item)=>{
  if(item?.heroOnly)return heroEquipmentAllowed(unit,item)?'勇者パーティ専用':'勇者パーティ専用（装備不可）';
  if(!weaponStyleAllowed(unit,item))return WEAPON_STYLE_LIMIT_TEXT;
  const required=effectiveStrengthRequirement(unit,item);if(!required)return isMagicWeapon(item)?'必要筋力なし':'';
  const current=attributeValues(unit).strength;
  return `必要筋力${required} · ${canUseWeapon(unit,item)?'装備可':`筋力不足（必要${required}／現在${current}）`}`;
};
