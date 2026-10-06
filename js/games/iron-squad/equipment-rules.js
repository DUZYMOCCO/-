export const EQUIPMENT_TYPES = ['WEAPON','SHIELD','HELMET','ARMOR','GLOVES','LEGS','AMULET'];

export const saleValue = item => Math.floor(8 + (item.tier || 1)*6 + (item.upgrade || 0)*4);

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
  let weights,maxTier,t;
  if(d<1200) {
    t=d/1200;weights=[96-22*t,4+22*t,0,0,0,0,0];maxTier=2;
  } else if(d<2700) {
    t=(d-1200)/1500;weights=[60-45*t,38+10*t,2+35*t,0,0,0,0];maxTier=3;
  } else if(d<4400) {
    t=(d-2700)/1700;weights=[0,45-35*t,45-15*t,10+50*t,0,0,0];maxTier=4;
  } else {
    t=Math.min(1,(d-4400)/3000);weights=[0,0,35-30*t,50-25*t,15+55*t,0,0];maxTier=5;
  }
  if(kind==='colossal' && d>=4400) return d>=6000 ? [0,0,0,0,0,80,20] : [0,0,0,0,20,80,0];
  if(kind==='chest' || kind==='boss') weights[maxTier-1]+=8;
  if(kind==='elite' || kind==='boss') {
    const rareTier=d>=5200?6:(d>=3800?5:(d>=2300 && d<2700?4:0));
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
  [0,.65,.60,.75,.75], [600,.90,.85,.90,.90], [1200,1.35,1.20,1.10,1.10],
  [2700,3.20,2.70,1.80,1.70], [4400,6.80,5.10,2.60,2.40], [7400,10,7.50,3.60,3.20]
];
export function distanceScaling(distance,phase=1) {
  const d=Math.max(0,Math.min(7400,distance || 0));
  let a=KNOTS[0],b=KNOTS[1];
  for(let i=1;i<KNOTS.length;i++){a=KNOTS[i-1];b=KNOTS[i];if(d<=b[0])break;}
  const t=(d-a[0])/(b[0]-a[0]);
  const phaseBonus=1+Math.min(.6,Math.max(0,(phase || 1)-1)*.025);
  const lerp=index=>a[index]+(b[index]-a[index])*t;
  return {hp:lerp(1)*phaseBonus,atk:lerp(2)*phaseBonus,exp:lerp(3),gold:lerp(4),phaseBonus};
}

export function shrineUpgradeCap(distance) {
  return distance<1200?2:(distance<2700?5:(distance<4400?8:12));
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

