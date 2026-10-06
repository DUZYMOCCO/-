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
  const bag = inventory || [];
  // Dominance pool = 隊長の現装備 + バッグ。過去に装備したことがあるかは一切見ない。
  // 除外は「いま装備中」(protectedIds) と「☆保護」(favorite) のみ。
  const refs = [];
  const seen = new Set();
  for (const it of [...Object.values(playerEquipment || {}), ...bag]) {
    if (!it || !it.id || seen.has(it.id)) continue;
    seen.add(it.id);
    refs.push(it);
  }
  return bag.filter((item, bagIndex) => {
    if (!canSell(item, protectedIds)) return false;
    if ((item.tier || 1) > maxTier) return false;
    if (item.upgrade > 0) return false;
    return refs.some(other => {
      if (!other || other.id === item.id || other.type !== item.type) return false;
      if (!atLeastAsGood(other, item)) return false;
      // 厳密に上位、または other が現装備中、またはバッグ内で先に出現する同等品
      if (!atLeastAsGood(item, other)) return true;
      if (protectedIds.has(other.id)) return true;
      const otherBagIndex = bag.findIndex(i => i && i.id === other.id);
      if (otherBagIndex < 0) return true; // other は隊長装備のみ（バッグ外）→ 余剰側を売ってよい
      return otherBagIndex < bagIndex;
    });
  }).map(item => item.id);
}

export function lootWeights(distance, kind='normal') {
  const d=Math.max(0,distance || 0);
  // Tier 7（神話・オリハルコン）はダンジョン最奥宝箱 (dungeon_vault / 竜巌窟) のみ
  if(kind==='dungeon_vault') {
    if(d<5000) return [0,0,65,35,0,0,0]; // 廃坑: Tier 3〜4確定
    if(d<8500) return [0,0,0,15,65,20,0]; // カタコンベ: Tier 5〜6確定
    return [0,0,0,0,0,45,55]; // 竜巌窟最奥: Tier 6〜7神話級確定（T7唯一の正規入手）
  }
  let weights,maxTier,t;
  // ゾーン距離を長距離マップ向けに伸長（0 / 8000 / 22000 / 48000）
  if(d<8000) {
    t=d/8000;weights=[96-22*t,4+22*t,0,0,0,0,0];maxTier=2;
  } else if(d<22000) {
    t=(d-8000)/14000;weights=[60-45*t,38+10*t,2+35*t,0,0,0,0];maxTier=3;
  } else if(d<48000) {
    t=(d-22000)/26000;weights=[0,45-35*t,45-15*t,10+50*t,0,0,0];maxTier=4;
  } else {
    t=Math.min(1,(d-48000)/22000);weights=[0,0,35-30*t,50-25*t,15+55*t,0,0];maxTier=5;
  }
  if(kind==='colossal') {
    // 超巨頭: 高Tierは T5〜T6 まで（T7は最奥宝箱専用）
    if(d>=60000) return [0,0,0,0,25,75,0];
    if(d>=48000) return [0,0,0,10,40,50,0];
    return [0,0,0,30,60,10,0];
  }
  if(kind==='chest' || kind==='boss') weights[maxTier-1]+=8;
  if(kind==='elite' || kind==='boss') {
    // rareTier 上限は T6（T7は出さない）
    const rareTier=d>=52000?6:(d>=36000?5:(d>=14000 && d<22000?4:0));
    if(rareTier) {weights[rareTier-1]+=(kind==='boss'?5:1.5);maxTier=Math.max(maxTier,rareTier);}
  }
  // ハードキャップ: 非 vault 経路では Tier 7 ウェイトを常に 0
  if(weights.length>=7) weights[6]=0;
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
  [0, 1.0, 1.0, 1.0, 1.0],
  [7999, 1.25, 1.25, 1.35, 1.35],
  [8000, 6.0, 6.0, 2.8, 2.5],
  [21999, 8.5, 8.5, 4.0, 3.5],
  [22000, 35.0, 32.0, 7.5, 6.0],
  [47999, 45.0, 42.0, 9.5, 8.0],
  [48000, 180.0, 160.0, 16.0, 13.0],
  [70000, 280.0, 240.0, 26.0, 22.0]
];
export function distanceScaling(distance,phase=1) {
  const d=Math.max(0,Math.min(70000,distance || 0));
  let a=KNOTS[0],b=KNOTS[1];
  for(let i=1;i<KNOTS.length;i++){a=KNOTS[i-1];b=KNOTS[i];if(d<=b[0])break;}
  const t=(d-a[0])/(b[0]-a[0]);
  const phaseBonus=1+Math.min(.6,Math.max(0,(phase || 1)-1)*.025);
  const lerp=index=>a[index]+(b[index]-a[index])*t;
  return {hp:lerp(1)*phaseBonus,atk:lerp(2)*phaseBonus,exp:lerp(3)*phaseBonus,gold:lerp(4)*phaseBonus,phaseBonus};
}

export function shrineUpgradeCap(distance) {
  return Infinity; // 無限強化解禁！
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
  if (item.weaponStyle === 'spear') score += 40;
  if (item.weaponStyle === 'hammer') score += 55;
  if (item.weaponStyle === 'bow') score += 35;
  if (item.weaponStyle === 'crossbow') score += 50;
  if (item.weaponStyle === 'cannon') score += 70;
  return score;
}

/** 武器スタイル戦闘プロファイル
 * 近接: 剣=基準DPS / 槍=中距離貫通 / 鎚=高威力ノックバック
 * 遠隔: 弓=連射低威力 / クロスボウ=中速高威力 / 火砲=最遅最大火力（スプラッシュ）
 */
export function weaponCombatProfile(item) {
  const style = item?.weaponStyle || 'sword';
  if (style === 'spear') {
    return {
      style: 'spear', ranged: false,
      reach: 145, reachWarlord: 175,
      baseCooldown: 0.78, pierce: true, pierceHalfWidth: 26,
      atkMult: 1.5, knockback: 0, knockbackWarlord: 0,
      projSpeed: 0, splash: 0, projType: null
    };
  }
  if (style === 'hammer') {
    return {
      style: 'hammer', ranged: false,
      reach: 80, reachWarlord: 105,
      baseCooldown: 0.98, pierce: false, pierceHalfWidth: 0,
      atkMult: 2.45, knockback: 62, knockbackWarlord: 78,
      projSpeed: 0, splash: 0, projType: null
    };
  }
  if (style === 'bow') {
    return {
      style: 'bow', ranged: true,
      reach: 250, reachWarlord: 280,
      baseCooldown: 0.95, pierce: false, pierceHalfWidth: 0,
      atkMult: 1.05, knockback: 0, knockbackWarlord: 0,
      projSpeed: 380, splash: 0, projType: 'ARROW', color: '#e2e8f0'
    };
  }
  if (style === 'crossbow') {
    return {
      style: 'crossbow', ranged: true,
      reach: 285, reachWarlord: 320,
      baseCooldown: 1.45, pierce: false, pierceHalfWidth: 0,
      // 弓より遅射・高威力（理論DPSは弓と同程度〜やや上、実戦は隙が目立つ）
      atkMult: 1.85, knockback: 12, knockbackWarlord: 18,
      projSpeed: 460, splash: 0, projType: 'BOLT', color: '#94a3b8'
    };
  }
  if (style === 'cannon') {
    return {
      style: 'cannon', ranged: true,
      reach: 310, reachWarlord: 360,
      baseCooldown: 2.15, pierce: false, pierceHalfWidth: 0,
      // 最遅・最大火力。スプラッシュで複数ヒット前提の厚め威力
      atkMult: 3.15, knockback: 48, knockbackWarlord: 60,
      projSpeed: 320, splash: 52, projType: 'CANNONBALL', color: '#f59e0b'
    };
  }
  return {
    style: 'sword', ranged: false,
    reach: 85, reachWarlord: 110,
    baseCooldown: 0.52, pierce: false, pierceHalfWidth: 0,
    atkMult: 1.0, knockback: 0, knockbackWarlord: 0,
    projSpeed: 0, splash: 0, projType: null
  };
}