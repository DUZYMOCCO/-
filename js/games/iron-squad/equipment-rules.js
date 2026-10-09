import {powerRank,MAX_EQUIPMENT_TIER,GENERATIONS} from './equipment-tiers.js?v=138';
import {formatDistance,formatSpeed,formatLength,formatLengthDelta} from './distance-format.js?v=138';
export const EQUIPMENT_TYPES = ['WEAPON','SHIELD','HELMET','ARMOR','GLOVES','LEGS','AMULET'];

export const saleValue = item => Math.floor(14 + Math.pow(powerRank(item.tier), 1.8)*12 + (item.upgrade || 0)*8);


/** 異質/神鍛 (god-roll) — auto-sell / shared-box deposit must never touch these. Manual sell still OK via canSell. */
export function isGodRollProtected(item) {
  if (!item) return false;
  if (item.isGodRoll || item.dropOnly) return true;
  if ((item.powerSkip || 0) > 0) return true;
  const tag = item.forgeTag;
  if (tag === '異質' || tag === '神鍛') return true;
  const name = String(item.baseName || item.name || '');
  return /【(?:異質|神鍛)】/.test(name);
}


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
    if (isGodRollProtected(item)) return false; // 異質/神鍛: never auto-select for bulk sell
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

function materialLootWeights(distance, kind='normal') {
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

export function lootWeights(distance,kind='normal') {
 const families=materialLootWeights(distance,kind);
 const generationWeights=GENERATIONS.map(g=>g.dropWeight);
 return families.flatMap(weight=>generationWeights.map(part=>weight*part));
}

export function chooseLootTier(distance,kind='normal',random=Math.random) {
  const weights=lootWeights(distance,kind),total=weights.reduce((a,b)=>a+b,0);
  let roll=Math.min(.999999999,Math.max(0,random()))*total;
  for(let i=0;i<weights.length;i++){roll-=weights[i];if(roll<0)return i+1;}
  for(let i=weights.length-1;i>=0;i--)if(weights[i]>0)return i+1;
  return 1;
}

/** v1.25.8: ×10 / ring beyond 本陣防衛圏 (safe), soft-cap → ~1,000,000× at outermost. No world expand. */
export const ZONE_SAFE_DIST = 8000;
export const ZONE_POWER_SOFTCAP = 1000000;
export const ZONE_EDGE_DIST = 79360; // ≈ WORLD_SIZE/2

/**
 * Enemy combat power vs distance from base.
 * - 本陣防衛圏 (<8000): ×1
 * - 警戒辺境 ring1: ×10
 * - 魔境深部 ring2: ×100
 * - 最果て ring3+: ×1000 … easing toward soft-cap 1e6 at map rim
 */
export function zoneRingPower(distance) {
  const d = Math.max(0, Number(distance) || 0);
  if (d < ZONE_SAFE_DIST) return 1;
  let rings;
  if (d < 22000) rings = 1;
  else if (d < 48000) rings = 2;
  else {
    const t = Math.min(1, (d - 48000) / Math.max(1, ZONE_EDGE_DIST - 48000));
    const s = t * t * (3 - 2 * t);
    rings = 3 + s * 3;
  }
  const raw = Math.pow(10, rings);
  const cap = ZONE_POWER_SOFTCAP;
  // Soft approach: mostly raw, gently compress near cap so outermost ~1e6
  return Math.min(cap, raw / (1 + raw / (cap * 20)));
}

export function zoneRingLabelJa(distance) {
  const d = Math.max(0, Number(distance) || 0);
  const p = zoneRingPower(d);
  const rounded = Math.round(p);
  if (d < 8000) return { ring: 0, mult: p, name: '本陣防衛圏', tip: '安全圏（敵倍率×1）' };
  if (d < 22000) return { ring: 1, mult: p, name: '警戒辺境', tip: `危険リング1（敵倍率×${rounded}）` };
  if (d < 48000) return { ring: 2, mult: p, name: '魔境深部', tip: `危険リング2（敵倍率×${rounded}）` };
  return { ring: 3, mult: p, name: '最果ての死地', tip: `危険リング3+（敵倍率×${rounded.toLocaleString('ja-JP')}）` };
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
  const dRaw=Math.max(0,distance || 0);
  const d=Math.max(0,Math.min(70000,dRaw));
  let a=KNOTS[0],b=KNOTS[1];
  for(let i=1;i<KNOTS.length;i++){a=KNOTS[i-1];b=KNOTS[i];if(d<=b[0])break;}
  const t=(d-a[0])/Math.max(1e-9,(b[0]-a[0]));
  const phaseBonus=1+Math.min(.6,Math.max(0,(phase || 1)-1)*.025);
  const lerp=index=>a[index]+(b[index]-a[index])*t;
  // v1.25.8: ring power ×10/ring beyond safe (soft-cap ~1e6). Rewards scale gentler (sqrt).
  const ring=zoneRingPower(dRaw);
  const rewardRing=Math.sqrt(ring);
  return {
    hp:lerp(1)*phaseBonus*ring,
    atk:lerp(2)*phaseBonus*ring,
    exp:lerp(3)*phaseBonus*rewardRing,
    gold:lerp(4)*phaseBonus*rewardRing,
    phaseBonus,
    ringPower:ring
  };
}

export function shrineUpgradeCap(distance) {
  return Infinity; // 無限強化解禁！
}

const STAT_LABELS={atk:'攻撃',magicAttack:'魔法攻撃',def:'防御',hp:'HP',speed:'移動',atkSpeed:'攻速',crit:'会心',blockChance:'盾防',regen:'回復/秒',vampire:'吸血',lightning:'雷撃',reach:'長さ/射程',attackWidth:'攻撃幅',swingSpeed:'振り抜き',attackRate:'攻撃速度',sweetWidth:'スイート幅',sweetPower:'芯の威力補正'};
const CRITICAL_STATS=new Set(['atk','def','hp']);
const PCT_STATS=new Set(['crit','blockChance','atkSpeed','vampire','swingSpeed','sweetWidth','sweetPower']);
const STAT_ORDER=['atk','def','hp','speed','atkSpeed','crit','blockChance','regen','vampire','lightning'];

function formatStatDisplay(key, value) {
  const n=Number(value)||0;
  if(['reach','attackWidth'].includes(key))return formatLength(n);
  if(key==='attackRate')return `${n.toFixed(2)}回/秒`;
  if(key==='lightning') return n?'あり':'なし';
  if(key==='vampire') return `${Math.round(n*10000)/100}%`;
  if(PCT_STATS.has(key)) return `${Math.round(n*100)/100}%`;
  return `${Math.round(n)}`;
}

function formatDeltaDisplay(key, delta) {
  if(key==='lightning') return delta>0?'+獲得':'−喪失';
  const scale=key==='vampire'?100:1;
  if(['reach','attackWidth'].includes(key))return formatLengthDelta(delta);
  const v=Math.round(delta*scale*100)/100;
  const suffix=PCT_STATS.has(key)?'%':key==='attackRate'?'回/秒':'';
  return `${v>0?'+':''}${v}${suffix}`;
}

/** 装備乗り換え時の性能差。label/kind は既存互換。text=プレーン、html=色付き↑↓ */
export function compareEquipment(candidate,current) {
  const axes=candidate?.type==='WEAPON'||current?.type==='WEAPON';
  const afterStats={...(candidate?.stats||{}),...(axes?weaponAxisValues(candidate):{})},beforeStats={...(current?.stats||{}),...(axes?weaponAxisValues(current):{})};
  const keys=new Set([...Object.keys(afterStats),...Object.keys(beforeStats)]);
  const ordered=[...keys].sort((a,b)=>{
    const ia=STAT_ORDER.indexOf(a), ib=STAT_ORDER.indexOf(b);
    return (ia<0?99:ia)-(ib<0?99:ib);
  });
  const changes=ordered.map(key=>{
    const before=Number(beforeStats[key]||0);
    const after=Number(afterStats[key]||0);
    return {
      key,
      label:STAT_LABELS[key]||key,
      delta:after-before,
      before,
      after,
      critical:CRITICAL_STATS.has(key)
    };
  }).filter(c=>c.delta!==0);
  const up=changes.some(c=>c.delta>0), down=changes.some(c=>c.delta<0);
  const label=up&&down?'一長一短':up?'強くなる':down?'弱くなる':'同等';
  const text=changes.map(c=>{
    const arrow=c.delta>0?'↑':'↓';
    return `${c.label} ${arrow} ${formatDeltaDisplay(c.key,c.delta)} (${formatStatDisplay(c.key,c.before)}→${formatStatDisplay(c.key,c.after)})`;
  }).join(' · ') || '能力差なし';
  const html=changes.length
    ? changes.map(c=>{
        const cls=c.delta>0?'stat-delta-up':'stat-delta-down';
        const arrow=c.delta>0?'↑':'↓';
        const crit=c.critical?' stat-delta-crit':'';
        return `<span class="stat-delta-line ${cls}${crit}">${c.label} ${arrow} <strong>${formatDeltaDisplay(c.key,c.delta)}</strong> <span class="stat-delta-range">(${formatStatDisplay(c.key,c.before)}→${formatStatDisplay(c.key,c.after)})</span></span>`;
      }).join('')
    : '<span class="stat-delta-equal">能力差なし</span>';
  return {label,text,html,changes,kind:up&&down?'mixed':up?'better':down?'worse':'equal'};
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
  score += (s.magicAttack || 0) * 30;
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

// Rank by actual bonuses: an enhanced low-tier item can outrank poor high-tier gear.
export function compareEquipmentStrength(a,b) {
  const strength=item=>equipmentScore({...item,tier:1,upgrade:0});
  return strength(b)-strength(a)||(b.tier||1)-(a.tier||1)||(b.upgrade||0)-(a.upgrade||0)||String(a.name||'').localeCompare(String(b.name||''),'ja');
}

/** 武器スタイル戦闘プロファイル
 * 近接: 剣=基準DPS / 槍=中距離貫通 / 鎚=高威力ノックバック
 * 遠隔: 弓=連射低威力 / クロスボウ=中速高威力 / 火砲=最遅最大火力（スプラッシュ）
 */
function baseWeaponCombatProfile(item) {
  const style = item?.weaponStyle || 'sword';
  if(style==='staff'||style==='wand')return {style,ranged:false,magical:true,reach:style==='staff'?70:34,reachWarlord:style==='staff'?85:44,baseCooldown:style==='staff'?.95:.65,atkMult:style==='staff'?.35:.16,magicMult:style==='staff'?1.15:1.05,pierce:false,pierceHalfWidth:0,knockback:0,knockbackWarlord:0,projSpeed:0,splash:0,projType:null};
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
      baseCooldown: 1.25, pierce: false, pierceHalfWidth: 0,
      // 弓より遅射・高威力（理論DPSは弓と同程度〜やや上、実戦は隙が目立つ）
      atkMult: 1.85, knockback: 12, knockbackWarlord: 18,
      projSpeed: 460, splash: 0, projType: 'BOLT', color: '#94a3b8'
    };
  }
  if (style === 'cannon') {
    return {
      style: 'cannon', ranged: true,
      reach: 310, reachWarlord: 360,
      baseCooldown: 1.85, pierce: false, pierceHalfWidth: 0,
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


export function rollWeaponTraits(item,random=Math.random) {
  if(item?.type!=='WEAPON'||item.weaponTraits)return item;
  const roll=(lo,span)=>Math.round((lo+random()*span)*1000)/1000;
  item.weaponTraits={length:roll(.85,.35),attackTempo:roll(.85,.3),swingSpeed:roll(.85,.35),sweep:roll(.8,.4),sweetWidth:roll(.8,.4),sweetPower:roll(.85,.45),sweetShift:roll(-.06,.12),crit:Math.floor(random()*9)};
  return item;
}
const trait=(item,key,fallback=1)=>Number.isFinite(item?.weaponTraits?.[key])?Math.max(.5,Math.min(1.5,item.weaponTraits[key])):fallback;
export function weaponCombatProfile(item) {
  const p=baseWeaponCombatProfile(item),length=trait(item,'length'),sweep=trait(item,'sweep');
  return {...p,reach:p.reach*length,reachWarlord:p.reachWarlord*length,playerReach:Math.max(110,p.reach)*length,
    baseCooldown:p.baseCooldown/trait(item,'attackTempo'),pierceHalfWidth:p.pierceHalfWidth*sweep,splash:p.splash*sweep,
    sweepArc:!p.ranged&&!p.pierce&&item?.weaponTraits?(p.style==='hammer'?1.8:1.2)*sweep:0,
    swingSpeed:trait(item,'swingSpeed')};
}
export function meleeSweetSpotFor(item) {
  const style=typeof item==='string'?item:item?.weaponStyle||'sword',base=MELEE_SWEET_SPOT[style];if(!base)return null;
  if(typeof item==='string'||!item?.weaponTraits)return base;
  const peak=Math.max(.12,Math.min(.94,base.peak+(item.weaponTraits.sweetShift||0))),width=trait(item,'sweetWidth');
  return {...base,peak,sweetMin:Math.max(.04,peak-(base.peak-base.sweetMin)*width),sweetMax:Math.min(1.05,peak+(base.sweetMax-base.peak)*width),sweetDmg:1+(base.sweetDmg-1)*trait(item,'sweetPower')};
}
export function weaponAxisValues(item) {
  if(!item)return {reach:0,attackWidth:0,swingSpeed:0,attackRate:0,sweetWidth:0,sweetPower:0};
  const p=weaponCombatProfile(item),sweet=p.ranged?null:meleeSweetSpotFor(item),arc=p.sweepArc||(p.style==='hammer'?1.8:1.2);
  return {reach:p.ranged?p.reach:p.playerReach,attackWidth:p.pierce?p.pierceHalfWidth*2:p.ranged?p.splash*2:2*p.playerReach*Math.sin(arc/2),
    swingSpeed:p.swingSpeed*100,attackRate:Math.max(.05,1+(item.stats?.atkSpeed||0)/100)/p.baseCooldown,
    sweetWidth:sweet?(sweet.sweetMax-sweet.sweetMin)*100:0,sweetPower:sweet?(sweet.sweetDmg-1)*100:0};
}


/** 近接スイングのスイートスポット（hitDist / reach の正規化距離帯）
 * - sword: かなり広い（大半のリーチでボーナス）
 * - spear: 先端寄り。近すぎると威力・クリ低下（突き感）
 * - hammer: 中庸のピーク帯
 * 飛び道具は evaluateMeleeSweetSpot が fixed(倍率1) を返す
 */
export const MELEE_SWEET_SPOT = {
  sword: {
    sweetMin: 0.14, sweetMax: 0.96, peak: 0.52,
    sweetDmg: 1.16, outDmg: 0.84,
    sweetCritBonus: 10, outCritBonus: -3
  },
  spear: {
    nearMax: 0.36, nearDmg: 0.60, nearCritBonus: -12,
    sweetMin: 0.50, sweetMax: 1.05, peak: 0.86,
    sweetDmg: 1.24, outDmg: 0.78,
    sweetCritBonus: 14, outCritBonus: -5
  },
  hammer: {
    sweetMin: 0.28, sweetMax: 0.72, peak: 0.48,
    sweetDmg: 1.20, outDmg: 0.76,
    sweetCritBonus: 11, outCritBonus: -6
  }
};

/**
 * @param {string} style weaponStyle
 * @param {number} hitDist 攻撃者〜対象の距離（槍は along でも可）
 * @param {number} reach 武器リーチ
 * @returns {{ dmgMult: number, critBonus: number, inSweet: boolean, band: string, t: number, quality: number }}
 */
export function evaluateMeleeSweetSpot(style, hitDist, reach) {
  const t = Math.max(0, Number(hitDist) || 0) / Math.max(1, Number(reach) || 1);
  const cfg = meleeSweetSpotFor(style);
  if (!cfg) {
    return { dmgMult: 1, critBonus: 0, inSweet: false, band: 'fixed', t, quality: 0 };
  }

  // 槍: 近すぎ弱体帯
  if (cfg.nearMax != null && t < cfg.nearMax) {
    const u = t / Math.max(0.001, cfg.nearMax); // 0=密着 → 1=nearMax直前
    const dmgMult = cfg.nearDmg + (cfg.outDmg - cfg.nearDmg) * u;
    const critBonus = cfg.nearCritBonus + (cfg.outCritBonus - cfg.nearCritBonus) * u;
    return { dmgMult, critBonus, inSweet: false, band: 'near', t, quality: 0 };
  }

  if (t >= cfg.sweetMin && t <= cfg.sweetMax) {
    const halfW = Math.max(0.04, Math.max(cfg.peak - cfg.sweetMin, cfg.sweetMax - cfg.peak));
    const quality = 1 - Math.min(1, Math.abs(t - cfg.peak) / halfW); // 1=ピーク
    // エッジでもわずかにボーナス、ピークで sweetDmg
    const dmgMult = 1 + (cfg.sweetDmg - 1) * (0.55 + 0.45 * quality);
    const critBonus = cfg.sweetCritBonus * (0.45 + 0.55 * quality);
    return { dmgMult, critBonus, inSweet: true, band: 'sweet', t, quality };
  }

  return {
    dmgMult: cfg.outDmg,
    critBonus: cfg.outCritBonus,
    inSweet: false,
    band: 'out',
    t,
    quality: 0
  };
}
