export const EQUIPMENT_TYPES = ['WEAPON','SHIELD','HELMET','ARMOR','GLOVES','LEGS','AMULET'];

export const saleValue = item => Math.floor(14 + Math.pow(item.tier || 1, 1.8)*12 + (item.upgrade || 0)*8);

export function equippedIds(playerEquipment, soldiers = []) {
  return new Set([playerEquipment,...soldiers.map(s=>s.equipped || {})]
    .flatMap(equipment=>Object.values(equipment || {}).filter(Boolean).map(item=>item.id)));
}

export function canSell(item, protectedIds) {
  return !!item && EQUIPMENT_TYPES.includes(item.type) && !item.favorite && !protectedIds.has(item.id);
}

const atLeastAsGood = (better, worse) => {
  const keys=new Set([...Object.keys(better.stats || {}),...Object.keys(worse.stats || {})]);
  return [...keys].every(key=>Number(better.stats?.[key] || 0)>=Number(worse.stats?.[key] || 0));
};

export function lowValueIds(inventory, playerEquipment, soldiers, maxTier=2) {
  const protectedIds=equippedIds(playerEquipment,soldiers);
  // Retain useful bag candidates for the commander even when a soldier owns a better piece.
  const all=[...Object.values(playerEquipment || {}),...inventory].filter(Boolean);
  const unique=[...new Map(all.map(item=>[item.id,item])).values()];
  return inventory.filter(item=>canSell(item,protectedIds) && (item.tier || 1)<=maxTier && !(item.upgrade>0))
    .filter(item=>unique.some(other=>other.id!==item.id && other.type===item.type && atLeastAsGood(other,item) &&
      // Keep one of identical unequipped copies; an equipped copy is already protected.
      (!atLeastAsGood(item,other) || protectedIds.has(other.id) || unique.indexOf(other)<unique.indexOf(item))))
    .map(item=>item.id);
}

export function lootWeights(distance, kind='normal') {
  const d=Math.max(0,distance || 0);
  if(kind==='dungeon_vault') {
    if(d<5000) return [0,0,65,35,0,0,0]; // 廃坑: Tier 3〜4確定
    if(d<8500) return [0,0,0,15,65,20,0]; // カタコンベ: Tier 5〜6確定
    return [0,0,0,0,0,45,55]; // 竜巌窟: Tier 6〜7神話級確定
  }
  let weights,maxTier,t;
  if(d<2400) {
    t=d/2400;weights=[96-22*t,4+22*t,0,0,0,0,0];maxTier=2;
  } else if(d<5500) {
    t=(d-2400)/3100;weights=[60-45*t,38+10*t,2+35*t,0,0,0,0];maxTier=3;
  } else if(d<9200) {
    t=(d-5500)/3700;weights=[0,45-35*t,45-15*t,10+50*t,0,0,0];maxTier=4;
  } else {
    t=Math.min(1,(d-9200)/5000);weights=[0,0,35-30*t,50-25*t,15+55*t,0,0];maxTier=5;
  }
  if(kind==='colossal') {
    if(d>=12000) return [0,0,0,0,0,60,40];
    if(d>=9200) return [0,0,0,0,20,70,10];
    return [0,0,0,30,60,10,0];
  }
  if(kind==='chest' || kind==='boss') weights[maxTier-1]+=8;
  if(kind==='elite' || kind==='boss') {
    const rareTier=d>=10000?6:(d>=7500?5:(d>=4500 && d<5500?4:0));
    if(rareTier) {weights[rareTier-1]+=(kind==='boss'?5:1.5);maxTier=Math.max(maxTier,rareTier);}
  }
  return weights;
}

export function chooseLootTier(distance,kind='normal',random=Math.random) {
  const weights=lootWeights(distance,kind),total=weights.reduce((a,b)=>a+b,0);
  let roll=Math.min(.999999999,Math.max(0,random()))*total;
  for(let i=0;i<weights.length;i++){roll-=weights[i];if(roll<0)return i+1;}
  for(let i=weights.length-1;i>=0;i--)if(weights[i]>0)return i+1;
  return 1;
}

const KNOTS = [
  [0,.65,.60,1.0,1.0], [1200,.90,.85,1.25,1.35], [2400,1.60,1.80,1.80,2.00],
  [5500,4.50,4.80,3.80,4.50], [9200,11.0,12.0,7.50,9.50], [15000,22.0,24.0,13.0,18.0]
];
export function distanceScaling(distance,phase=1) {
  const d=Math.max(0,Math.min(15000,distance || 0));
  let a=KNOTS[0],b=KNOTS[1];
  for(let i=1;i<KNOTS.length;i++){a=KNOTS[i-1];b=KNOTS[i];if(d<=b[0])break;}
  const t=(d-a[0])/(b[0]-a[0]);
  const phaseBonus=1+Math.min(.6,Math.max(0,(phase || 1)-1)*.025);
  const lerp=index=>a[index]+(b[index]-a[index])*t;
  return {hp:lerp(1)*phaseBonus,atk:lerp(2)*phaseBonus,exp:lerp(3)*phaseBonus,gold:lerp(4)*phaseBonus,phaseBonus};
}

export function shrineUpgradeCap(distance) {
  return distance<2400?2:(distance<5500?5:(distance<9200?8:12));
}

const STAT_LABELS={atk:'攻撃',def:'防御',hp:'HP',speed:'移動',atkSpeed:'攻速',crit:'会心',blockChance:'盾防',regen:'回復/秒',vampire:'吸血',lightning:'雷撃'};
export function compareEquipment(candidate,current) {
  const keys=new Set([...Object.keys(candidate?.stats||{}),...Object.keys(current?.stats||{})]);
  const changes=[...keys].map(key=>({key,label:STAT_LABELS[key]||key,delta:Number(candidate?.stats?.[key]||0)-Number(current?.stats?.[key]||0)})).filter(c=>c.delta!==0);
  const up=changes.some(c=>c.delta>0),down=changes.some(c=>c.delta<0);
  const label=up&&down?'一長一短':up?'強くなる':down?'弱くなる':'同等';
  const text=changes.map(c=>`${c.label} ${c.delta>0?'+':''}${Math.round(c.delta*(c.key==='vampire'?100:1)*100)/100}${['crit','blockChance','atkSpeed','vampire'].includes(c.key)?'%':''}`).join(' / ') || '能力差なし';
  return {label,text,changes,kind:up&&down?'mixed':up?'better':down?'worse':'equal'};
}

export function equipmentScore(item) {
  if (!item) return 0;
  const s = item.stats || {};
  let score = (item.tier || 1) * 1000 + (item.upgrade || 0) * 150;
  score += (s.atk || 0) * 15;
  score += (s.def || 0) * 15;
  score += (s.hp || 0) * 3;
  score += (s.crit || 0) * 25;
  score += (s.blockChance || 0) * 25;
  score += (s.atkSpeed || 0) * 20;
  score += (s.speed || 0) * 15;
  if (s.lightning) score += 800;
  if (s.regen) score += s.regen * 100;
  if (s.vampire) score += s.vampire * 1500;
  return score;
}

