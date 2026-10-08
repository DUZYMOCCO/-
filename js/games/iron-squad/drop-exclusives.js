export const DROP_EXCLUSIVES={
  WEAPON:{name:'戦王の遺武器',label:'攻撃+12%・会心+8%',mult:{atk:1.12},add:{crit:8}},
  SHIELD:{name:'救国の誓盾',label:'HP+12%・盾防+8%',mult:{hp:1.12},add:{blockChance:8}},
  HELMET:{name:'不屈の軍帽',label:'HP+15%・防御+7',mult:{hp:1.15},add:{def:7}},
  ARMOR:{name:'古参の戦鎧',label:'HP+15%・防御+10%',mult:{hp:1.15,def:1.1},add:{}},
  GLOVES:{name:'疾風の籠手',label:'攻速+7%',mult:{},add:{atkSpeed:7}},
  LEGS:{name:'遠征隊の遺脚具',label:'移動+8',mult:{},add:{speed:8}},
  AMULET:{name:'戦友の形見',label:'攻速+8%',mult:{},add:{atkSpeed:8}}
};
export function rollDropExclusive(item,kind='normal',random=Math.random) {
  const chance={normal:.006,elite:.025,boss:.05,chest:.03,colossal:.08,dungeon_vault:.08}[kind]||.006;
  const def=DROP_EXCLUSIVES[item?.type];if(!def||random()>=chance)return false;
  item.dropOnly=true;item.dropOnlyKey=item.type;item.baseName=`${def.name}・${item.baseName||item.name}`;item.name=item.baseName;return true;
}
export function applyDropExclusive(item) {
  if(!item?.dropOnly)return;
  const def=DROP_EXCLUSIVES[item.dropOnlyKey||item.type];if(!def)return;
  for(const [key,mult] of Object.entries(def.mult))item.stats[key]=Math.floor((item.stats[key]||0)*mult);
  for(const [key,add] of Object.entries(def.add))item.stats[key]=(item.stats[key]||0)+add;
}
export const dropExclusiveLabel=item=>item?.dropOnly?DROP_EXCLUSIVES[item.dropOnlyKey||item.type]?.label||'限定補正':'';
