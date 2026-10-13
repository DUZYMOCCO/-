import {TIERS,GENERATION_COUNT,MAX_EQUIPMENT_TIER,tierNumber,materialTier,generation} from './equipment-tiers.js?v=231';
import {chooseLootTier} from './equipment-rules.js?v=231';
import {CASTER_GEAR,DEFENSE_TYPES} from './defense-equipment.js?v=237';

export const CRAFT_MATERIALS={
  wood:{name:'堅木材',color:'#b19165'},bronze:{name:'青銅片',color:'#ba9261'},
  iron:{name:'鉄鉱石',color:'#a3b0b5'},steel:{name:'精鋼片',color:'#c6d2d5'},
  mithril:{name:'ミスリル鉱',color:'#90c9d1'},dragon:{name:'竜鱗',color:'#aa8782'},
  orichalcum:{name:'神話鉱',color:'#e2c981'},fabric:{name:'布革',color:'#c4b69b'},
  essence:{name:'魔力粉',color:'#bfa4d2'},core:{name:'魔力コア',color:'#d29b83'}
};
export const TIER_MATERIALS=['wood','bronze','iron','steel','mithril','dragon','orichalcum'];
const count=n=>Number.isFinite(Number(n))?Math.max(0,Math.min(999999999,Math.floor(Number(n)))):0;
export function normalizeMaterials(data) {
  return Object.fromEntries(Object.keys(CRAFT_MATERIALS).map(id=>[id,count(data?.[id])]));
}
export function addMaterials(game,bundle) {
  game.materials=normalizeMaterials(game.materials);
  const received=[];
  for(const [id,n] of Object.entries(bundle||{}))if(CRAFT_MATERIALS[id]&&count(n)){
    const before=game.materials[id];game.materials[id]=count(before+count(n));
    if(game.materials[id]>before)received.push(`${CRAFT_MATERIALS[id].name}×${game.materials[id]-before}`);
  }
  return received.join('・');
}
// Development opens the next material family; funded research refines its four generations.
export const workshopFloorTier=level=>tierNumber(Math.min(6,Math.max(0,Math.floor(Number(level)||0)))*GENERATION_COUNT+1);
export const workshopTier=game=>tierNumber(Math.max(workshopFloorTier(game.nation?.level),game.nation?.armament?.techTier||1));
export const workshopLevel=game=>materialTier(workshopTier(game));

export function equipmentDropChance(distance,kind='normal') {
  return {elite:.18,boss:.5,colossal:.6,chest:.25,dungeon_vault:.65}[kind]??(.035+Math.min(.015,Math.max(0,distance||0)/70000*.015));
}
export const materialDropChance=kind=>kind==='normal'?.4:1;
export function rollMaterialDrop(distance,kind='normal',random=Math.random) {
  const tier=chooseLootTier(distance,kind,random),id=TIER_MATERIALS[materialTier(tier)-1];
  const size={normal:1,elite:3,boss:6,colossal:12,chest:4,dungeon_vault:12}[kind]||1;
  const materials={[id]:size+Math.floor(random()*Math.max(1,Math.ceil(size/2)))};
  materials[random()<.5?'fabric':'essence']=Math.max(1,Math.ceil(size/2));
  if(['boss','colossal','dungeon_vault'].includes(kind))materials.core=kind==='boss'?1:3;
  return {type:'MATERIAL',tier,name:`${CRAFT_MATERIALS[id].name}などの素材`,materials,color:CRAFT_MATERIALS[id].color};
}
/** Every treasure contains materials; completed equipment becomes an occasional extra. */
export function rollTreasureLoot(distance,kind,createItem,random=Math.random) {
  const items=[rollMaterialDrop(distance,kind,random)];
  if(random()<equipmentDropChance(distance,kind))items.push(createItem(distance,kind));
  return items;
}

const weaponNames={sword:'無隙の匠剣',spear:'遠征隊の穿槍',hammer:'破城のハンマー',axe:'巨木断ちの戦斧',
  bow:'フクロウの長弓',crossbow:'鷹眼の機弩',cannon:'城塞砕きの重砲',staff:'星紡ぎの長杖',wand:'月灯りのワンド'};
export const CRAFT_RECIPES=[
  ...Object.entries(weaponNames).map(([weaponStyle,name])=>({id:`weapon-${weaponStyle}`,type:'WEAPON',weaponStyle,name})),
  {id:'shield',type:'SHIELD',name:'誓約の大盾'},{id:'helmet',type:'HELMET',name:'不屈の匠兜'},
  {id:'armor',type:'ARMOR',name:'守護騎士の鎧'},{id:'gloves',type:'GLOVES',name:'名工の籠手'},
  {id:'legs',type:'LEGS',name:'踏破の脚具'},{id:'amulet',type:'AMULET',name:'導きの護符'},
  ...Object.keys(CASTER_GEAR).flatMap(armorStyle=>DEFENSE_TYPES.map(type=>({id:`${armorStyle}-${type.toLowerCase()}`,type,armorStyle,
    name:`${CASTER_GEAR[armorStyle].name}の${{SHIELD:'護符盾',HELMET:'頭巾',ARMOR:'ローブ',GLOVES:'手袋',LEGS:'脚衣',AMULET:'護符'}[type]}`})))
];
export const craftRecipe=id=>CRAFT_RECIPES.find(recipe=>recipe.id===id);
export function recipeMaterials(recipe,tier) {
  if(!recipe)return {};
  const t=tierNumber(tier),family=materialTier(t),g=generation(t),magic=!!recipe.armorStyle||['AMULET'].includes(recipe.type)||['staff','wand'].includes(recipe.weaponStyle);
  const materials={[TIER_MATERIALS[family-1]]:8+g*2,essence:magic?6+g:2+g};
  if(recipe.type!=='WEAPON'||['bow','crossbow','staff','wand'].includes(recipe.weaponStyle))materials.fabric=4+g;
  if(family>=3)materials.core=Math.ceil((family-2)/2);
  return materials;
}
export const canAffordMaterials=(stock,needed)=>Object.entries(needed).every(([id,n])=>count(stock?.[id])>=n);
export const craftExclusiveLabel=item=>item?.craftOnly?{
  WEAPON:'会心+6%（杖は魔攻+10%）',SHIELD:'HP+10%・盾防+8%',HELMET:'HP+20%',
  ARMOR:'HP+18%・防御+10%',GLOVES:'攻速+8%',LEGS:'移動+8',AMULET:'攻速+8%・再生+2'
}[item.type]||'専用補正':'';
/** Called after the base stats are regenerated, so enhancement never stacks the bonus twice. */
export function applyCraftExclusive(item) {
  if(!item?.craftOnly||!craftRecipe(item.craftRecipeId))return;
  const s=item.stats;
  if(item.type==='WEAPON'){
    s.crit=(s.crit||0)+6;
    if(['staff','wand'].includes(item.weaponStyle)&&s.magicAttack)s.magicAttack=Math.floor(s.magicAttack*1.1);
  }else if(item.type==='SHIELD'){s.hp=Math.floor(s.hp*1.1);s.blockChance=(s.blockChance||0)+8;}
  else if(item.type==='HELMET')s.hp=Math.floor(s.hp*1.2);
  else if(item.type==='ARMOR'){s.hp=Math.floor(s.hp*1.18);s.def=Math.floor(s.def*1.1);}
  else if(item.type==='GLOVES')s.atkSpeed=(s.atkSpeed||0)+8;
  else if(item.type==='LEGS')s.speed=(s.speed||0)+8;
  else if(item.type==='AMULET'){s.atkSpeed=(s.atkSpeed||0)+8;s.regen=2;}
}
export function stampCraftedItem(item,recipe) {
  const def=TIERS[item.tier-1];
  Object.assign(item,{craftOnly:true,craftRecipeId:recipe.id,rollMult:1.2,qualityLabel:'工房製作・品質120%',favorite:true,
    baseName:`${recipe.name}・${def.mat}・${def.generation}型`});
  item.name=item.baseName;delete item.dropOnly;delete item.dropOnlyKey;delete item.weaponTraits;
  return item;
}
