// Equipment granted by revelation, outside the nation's manufacturing/loot tiers.
export const HERO_EQUIPMENT_RULES=Object.freeze({version:1,tier:24,power:1});
const caster=role=>role==='MEDIC'||role==='MAGE';
const SLOT_TYPES={weapon:'WEAPON',shield:'SHIELD',helmet:'HELMET',armor:'ARMOR',gloves:'GLOVES',legs:'LEGS',amulet:'AMULET'};
const NAMES={sword:'勇者の聖剣',hammer:'勇者の守護鎚',bow:'勇者の誓い弓',staff:'勇者の救い杖',wand:'勇者の天啓ワンド',
  shield:'勇者の守護盾',helmet:'勇者の銀冠',armor:'勇者の旅鎧',gloves:'勇者の小手',legs:'勇者の旅靴',amulet:'勇者の祈りの護符'};
const RECIPES={
  SHIELD:{def:2200,hp:1800,blockChance:35},HELMET:{def:1000,hp:1200},ARMOR:{def:3200,hp:4000},
  GLOVES:{def:700,atk:150},LEGS:{def:900,hp:500,speed:12},AMULET:{def:400,hp:1800,magicDefense:4000}
};
export const heroEquipmentAllowed=(unit,item)=>!item?.heroOnly||!!unit?.heroPartyId;
export function applyHeroEquipmentUpgrade(item,upgrade=0){
  if(!item?.heroOnly)return false;
  item.upgrade=Math.max(0,Math.floor(upgrade||0));const role=item.heroRole||'LIGHT',scale=(item.heroPower||HERO_EQUIPMENT_RULES.power)*(1+item.upgrade*.25);
  const base=item.type==='WEAPON'?(role==='MAGE'?{atk:180,magicAttack:1800}:role==='MEDIC'?{atk:180,magicAttack:650}:{atk:1600}):RECIPES[item.type];
  item.stats={};for(const [key,value] of Object.entries(base||{}))item.stats[key]=['speed','blockChance'].includes(key)?value:Math.floor(value*scale);
  if(item.type==='GLOVES'&&caster(role)){delete item.stats.atk;item.stats.magicAttack=Math.floor(150*scale);}
  if(role==='HEAVY'){if(item.stats.hp)item.stats.hp=Math.floor(item.stats.hp*1.2);if(item.stats.def)item.stats.def=Math.floor(item.stats.def*1.3);}
  if(item.type==='WEAPON')item.minStrength=0;
  item.name=item.upgrade?`${item.baseName}+${item.upgrade}`:item.baseName;
  return true;
}
export function grantHeroEquipment(game,unit){
  if(!unit?.heroPartyId||unit.dead||unit.heroEquipmentVersion>=HERO_EQUIPMENT_RULES.version)return false;
  const role=unit.soldierClass,style=unit.isChosenHero?'sword':role==='HEAVY'?'hammer':role==='ARCHER'?'bow':role==='MEDIC'?'staff':role==='MAGE'?'wand':'sword';
  const previous=Object.values(unit.equipped||{}).filter(Boolean);unit.heroRetiredEquipment=(unit.heroRetiredEquipment||[]).concat(previous);
  unit.equipped={};
  for(const [slot,type] of Object.entries(SLOT_TYPES)){
    if(slot==='shield'&&caster(role)||slot==='shield'&&role==='ARCHER'){unit.equipped[slot]=null;continue;}
    const name=NAMES[slot==='weapon'?style:slot],item={id:`${unit.id}-hero-${slot}`,name,baseName:name,type,tier:HERO_EQUIPMENT_RULES.tier,
      heroOnly:true,heroRole:role,heroPower:HERO_EQUIPMENT_RULES.power,heroEquipmentVersion:HERO_EQUIPMENT_RULES.version,
      mat:'天啓の銀と金',color:'#c9b478',favorite:true,dropOnly:true,notForSale:true,upgrade:0,weaponStyle:slot==='weapon'?style:undefined};
    applyHeroEquipmentUpgrade(item);unit.equipped[slot]=item;
  }
  unit.weapon=unit.equipped.weapon;unit.favoriteWeapon=style;unit.heroEquipmentVersion=HERO_EQUIPMENT_RULES.version;
  game.recalcSoldierStats(unit);return true;
}
export function heroEquipmentSummary(unit){return Object.values(unit?.equipped||{}).filter(item=>item?.heroOnly).map(item=>item.name);}
