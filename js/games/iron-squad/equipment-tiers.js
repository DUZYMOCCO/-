// Seven material families, four manufacturing generations each.
export const MATERIALS = [
  { tier: 1, visualColor:'#806b50', mat: '木/布', color: '#94a3b8', mult: 1.0,
    weapon: '木の剣', spear: '木の槍', hammer: '木の戦鎚',
    bow: '木の短弓', crossbow: '木の石弓', cannon: '木造の手砲',
    shield: '木の丸盾', helmet: '布の帽子', armor: '布の服', gloves: '布の手袋', legs: '布のズボン', amulet: '木彫りの指輪' },
  { tier: 2, visualColor:'#947e58', mat: '青銅/革', color: '#38bdf8', mult: 2.2,
    weapon: '青銅の剣', spear: '青銅の槍', hammer: '青銅の戦鎚',
    bow: '青銅の弓', crossbow: '青銅の石弓', cannon: '青銅の手砲',
    shield: '青銅の盾', helmet: '革の兜', armor: '革の鎧', gloves: '革の手袋', legs: '革の脚絆', amulet: '銅の指輪' },
  { tier: 3, visualColor:'#7d8a8e', mat: '鉄', color: '#34d399', mult: 4.2,
    weapon: '鉄の剣', spear: '鉄の槍', hammer: '鉄の戦鎚',
    bow: '鉄枠の長弓', crossbow: '鉄のクロスボウ', cannon: '鉄の軽砲',
    shield: '鉄の盾', helmet: '鉄の兜', armor: '鉄の鎧', gloves: '鉄の籠手', legs: '鉄の脛当', amulet: '鉄の首飾り' },
  { tier: 4, visualColor:'#acb9c2', mat: '鋼鉄', color: '#a855f7', mult: 8.0,
    weapon: '鋼鉄の大剣', spear: '鋼鉄の長槍', hammer: '鋼鉄の大鎚',
    bow: '鋼鉄の戦弓', crossbow: '鋼鉄の弩', cannon: '鋼鉄の野戦砲',
    shield: '鋼鉄の大盾', helmet: '鋼鉄の兜', armor: '鋼鉄の甲冑', gloves: '鋼鉄のガントレット', legs: '鋼鉄のグリーブ', amulet: '鋼鉄の紋章' },
  { tier: 5, visualColor:'#99bdc3', mat: 'ミスリル', color: '#ffaa00', mult: 15.0,
    weapon: 'ミスリルの剣', spear: 'ミスリルの槍', hammer: 'ミスリルの戦鎚',
    bow: 'ミスリルの霊弓', crossbow: 'ミスリルの弩', cannon: 'ミスリルの魔導砲',
    shield: 'ミスリル盾', helmet: 'ミスリルの兜', armor: 'ミスリル鎧', gloves: 'ミスリルの籠手', legs: 'ミスリルの脚絆', amulet: '黄金の首飾り' },
  { tier: 6, visualColor:'#5c6970', mat: '竜鱗/黒金', color: '#ef4444', mult: 28.0,
    weapon: '竜牙の大剣', spear: '竜牙の長槍', hammer: '竜骨の戦鎚',
    bow: '竜翼の長弓', crossbow: '竜骨の石弓', cannon: '竜息の破城砲',
    shield: '竜鱗の大盾', helmet: '竜鱗の兜', armor: '竜鱗の鎧', gloves: '竜鱗の籠手', legs: '竜鱗の脛当', amulet: '竜の護符' },
  { tier: 7, visualColor:'#beac72', mat: '神話・オリハルコン', color: '#ff007f', mult: 55.0,
    weapon: '神剣オリハルコン', spear: '神槍ゲイボルグ', hammer: '神鎚ミョルニル',
    bow: '神弓アルテミス', crossbow: '神弩バリスタ', cannon: '神砲ラグナロク',
    shield: '神聖のイージス', helmet: '神聖の宝冠', armor: '神聖の鎧', gloves: '神聖の小手', legs: '神聖の具足', amulet: '神々の紋章' }
];

export const GENERATIONS=[
 {name:'初期型',prefix:'',dropWeight:.52}, {name:'制式型',prefix:'制式・',dropWeight:.28},
 {name:'改良型',prefix:'改良・',dropWeight:.14}, {name:'完成型',prefix:'精鍛・',dropWeight:.06}
];
export const GENERATION_COUNT=GENERATIONS.length;
export const GENERATION_NAMES=GENERATIONS.map(g=>g.name);
export const MAX_EQUIPMENT_TIER=MATERIALS.length*GENERATION_COUNT;
export const MAX_POWER_RANK=MATERIALS.length;
export const POWER_RANK_STEP=(MAX_POWER_RANK-1)/(MAX_EQUIPMENT_TIER-1);
export const TRADE_MAX_TIER=MAX_EQUIPMENT_TIER-GENERATION_COUNT;
export const tierNumber=t=>Math.max(1,Math.min(MAX_EQUIPMENT_TIER,Math.floor(Number(t)||1)));
export const powerRank=t=>1+(tierNumber(t)-1)*POWER_RANK_STEP;
export const materialTier=t=>Math.ceil(tierNumber(t)/GENERATION_COUNT);
export const generation=t=>(tierNumber(t)-1)%GENERATION_COUNT+1;
export const TIERS=Array.from({length:MAX_EQUIPMENT_TIER},(_,i)=>{
 const tier=i+1,rank=powerRank(tier),lo=Math.floor(rank),hi=Math.min(MAX_POWER_RANK,lo+1),t=rank-lo;
 const material=MATERIALS[materialTier(tier)-1];
 const result={...material,tier,powerRank:rank,generation:generation(tier),mult:MATERIALS[lo-1].mult**(1-t)*MATERIALS[hi-1].mult**t};
 for(const key of ['weapon','spear','hammer','bow','crossbow','cannon','shield','helmet','armor','gloves','legs','amulet'])result[key]=GENERATIONS[result.generation-1].prefix+material[key];
 return result;
});
export const tierDescription=t=>`T${tierNumber(t)}・${MATERIALS[materialTier(t)-1].mat}・${GENERATION_NAMES[generation(t)-1]}`;
/** Body coverage comes from each equipped piece, independently of character level. */
const EMPTY_VISUAL=Object.freeze({coverage:0,detail:0,generation:0,material:0,rough:false});
const VISUAL_PROFILES=TIERS.map(({tier})=>{
 const progress=(tier-1)/(MAX_EQUIPMENT_TIER-1);
 return Object.freeze({coverage:.18+progress*.82,detail:Math.min(3,Math.floor(progress*4)),generation:generation(tier),material:materialTier(tier),color:MATERIALS[materialTier(tier)-1].visualColor,rough:tier<=GENERATION_COUNT&&generation(tier)<3});
});
export const equipmentVisualProfile=item=>item?VISUAL_PROFILES[tierNumber(item.tier)-1]:EMPTY_VISUAL;
