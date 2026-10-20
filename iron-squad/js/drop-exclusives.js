export const DROP_EXCLUSIVES={
  WEAPON:{name:'戦王の遺武器',label:'攻撃+12%・会心+8%',mult:{atk:1.12},add:{crit:8}},
  SHIELD:{name:'救国の誓盾',label:'HP+12%・被ダメ軽減+2%',mult:{hp:1.12},add:{blockChance:8}},
  HELMET:{name:'不屈の軍帽',label:'HP+15%・防御+7',mult:{hp:1.15},add:{def:7}},
  ARMOR:{name:'古参の戦鎧',label:'HP+15%・防御+10%',mult:{hp:1.15,def:1.1},add:{}},
  GLOVES:{name:'疾風の籠手',label:'攻速+7%',mult:{},add:{atkSpeed:7}},
  LEGS:{name:'遠征隊の遺脚具',label:'移動+8',mult:{},add:{speed:8}},
  AMULET:{name:'戦友の形見',label:'攻速+8%',mult:{},add:{atkSpeed:8}}
};
// v7.2.16 方角の遺宝：封印の守護者（北西・北・北東）と南西の黄昏の霊廟の主だけが遺す、種類の決まった限定装備。
export const DIRECTION_RELICS=Object.freeze({
  RELIC_NORTHWEST:{source:'seal_northwest',dir:'北西',type:'AMULET',name:'霧翼の遺飾',label:'攻速+10%・移動+8',mult:{},add:{atkSpeed:10,speed:8}},
  RELIC_NORTH:{source:'seal_north',dir:'北',type:'ARMOR',name:'凍岩の遺鎧',label:'HP+20%・防御+15%',mult:{hp:1.2,def:1.15},add:{}},
  RELIC_NORTHEAST:{source:'seal_northeast',dir:'北東',type:'WEAPON',name:'雷角の遺武器',label:'攻撃+15%・会心+10%',mult:{atk:1.15},add:{crit:10}},
  RELIC_SOUTHWEST:{source:'dungeon_twilight_sepulcher',dir:'南西',type:'LEGS',name:'黄昏の遺脚具',label:'HP+10%・移動+10',mult:{hp:1.1},add:{speed:10}}
});
export const relicKeyFor=source=>Object.keys(DIRECTION_RELICS).find(k=>DIRECTION_RELICS[k].source===source)||null;
const exclusiveDef=key=>DROP_EXCLUSIVES[key]||DIRECTION_RELICS[key];
/** 遺宝の印をつける（生成の途中、品質と強化の前に呼ぶ）。 */
export function markDirectionRelic(item,key) {
  const def=DIRECTION_RELICS[key];if(!def||item?.type!==def.type)return false;
  item.dropOnly=true;item.dropOnlyKey=key;item.baseName=`${def.name}・${item.baseName||item.name}`;item.name=item.baseName;return true;
}
export function rollDropExclusive(item,kind='normal',random=Math.random) {
  const chance={normal:.006,elite:.025,boss:.05,chest:.03,colossal:.08,dungeon_vault:.08}[kind]||.006;
  const def=DROP_EXCLUSIVES[item?.type];if(!def||random()>=chance)return false;
  item.dropOnly=true;item.dropOnlyKey=item.type;item.baseName=`${def.name}・${item.baseName||item.name}`;item.name=item.baseName;return true;
}
export function applyDropExclusive(item) {
  if(!item?.dropOnly)return;
  const def=exclusiveDef(item.dropOnlyKey||item.type);if(!def)return;
  for(const [key,mult] of Object.entries(def.mult))item.stats[key]=Math.floor((item.stats[key]||0)*mult);
  for(const [key,add] of Object.entries(def.add))item.stats[key]=(item.stats[key]||0)+add;
}
export const dropExclusiveLabel=item=>item?.dropOnly?exclusiveDef(item.dropOnlyKey||item.type)?.label||'限定補正':'';
