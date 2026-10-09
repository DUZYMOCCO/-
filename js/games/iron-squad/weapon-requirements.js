import {powerRank} from './equipment-tiers.js';
import {attributeValues,attributeFamily,ATTRIBUTE_BASES} from './unit-attributes.js';
export const MAGIC_WEAPON_STYLES=['staff','wand'];
export const WEAPON_STRENGTH_RULES={sword:{base:18,perRank:4},spear:{base:24,perRank:6},hammer:{base:32,perRank:10}};
export const isMagicWeapon=item=>MAGIC_WEAPON_STYLES.includes(item?.weaponStyle);
export function requiredWeaponStrength(item) {
  if(!item||item.type!=='WEAPON')return 0;
  if(Number.isFinite(item.minStrength))return Math.max(0,item.minStrength);
  const rule=WEAPON_STRENGTH_RULES[item.weaponStyle||'sword'];
  return rule?Math.ceil(rule.base+Math.max(0,powerRank(item.tier||1)-1)*rule.perRank):0;
}
export const canUseWeapon=(unit,item)=>!item||item.type!=='WEAPON'||attributeValues({...unit,equipped:{...unit?.equipped,weapon:item},weapon:item}).strength>=requiredWeaponStrength(item);
export function preferredWeaponStyle(unit,tier=1,preferred=unit.favoriteWeapon) {
  const family=attributeFamily(unit),values=attributeValues(unit),base=ATTRIBUTE_BASES[family];
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
  const required=requiredWeaponStrength(item);if(!required)return isMagicWeapon(item)?'必要筋力なし':'';
  const current=attributeValues(unit).strength;
  return `必要筋力${required} · ${canUseWeapon(unit,item)?'装備可':`筋力不足（現在${current}）`}`;
};
