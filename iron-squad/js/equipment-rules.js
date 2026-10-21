import {campaignScaling,southEastAbyss} from './campaign-scaling.js?v=353';
import {soldierCombatTempo,usesSoldierTempo,attributeFamily,canChannelWeaponMagic} from './unit-attributes.js?v=334';
import {requiredDefenseStrength,canUseEquipmentBarrier} from './defense-equipment.js?v=298';
import {isMagicUser} from './magic-rules.js?v=334';
import {isMagicWeapon} from './weapon-requirements.js?v=338';
import {shieldReductionPct} from './equipment-effects.js?v=306';
import {powerRank,MAX_EQUIPMENT_TIER,GENERATIONS} from './equipment-tiers.js?v=231';
import {formatDistance,formatSpeed,formatLength,formatLengthDelta} from './distance-format.js?v=182';
import {WEAPON_STYLE_ICONS,weaponStyleOf,isHeavyWeaponStyle,combatFamilyOf,weaponBaseAtkCoef} from './growth-rules.js?v=329';
export const EQUIPMENT_TYPES = ['WEAPON','SHIELD','HELMET','ARMOR','GLOVES','LEGS','AMULET'];

const GEAR_ICONS = {
  SHIELD: '🛡️', HELMET: '🪖', ARMOR: '🥋',
  GLOVES: '🧤', LEGS: '🥾', AMULET: '📿',
};

/** 画面表示だけ。保存される name は変えない。 */
export function equipmentIcon(item) {
  if (!item) return '';
  if (item.type === 'WEAPON') return WEAPON_STYLE_ICONS[weaponStyleOf(item)] || WEAPON_STYLE_ICONS.sword;
  return GEAR_ICONS[item.type] || '';
}

export function equipmentName(item) {
  if (!item) return '';
  const name = item.name || item.baseName || '装備';
  const icon = equipmentIcon(item);
  return icon ? `${icon} ${name}` : name;
}

export const saleValue = item => Math.floor(14 + Math.pow(powerRank(item.tier), 1.8)*12 + (item.upgrade || 0)*8);


/** 異質/神鍛 (god-roll) — auto-sell / shared-box deposit must never touch these. Manual sell still OK via canSell. */
export function isGodRollProtected(item) {
  if (!item) return false;
  if (item.isGodRoll || item.dropOnly || item.craftOnly) return true;
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
  return !!item && !item.heroOnly && EQUIPMENT_TYPES.includes(item.type) && !item.favorite && !protectedIds.has(item.id);
}

const statValue=(item,key)=>Number(item?.stats?.[key]||0);
/** Every stat of `better` is at least that of `worse` (requirements are not looked at). */
const dominates=(better,worse)=>[...new Set([...Object.keys(better.stats||{}),...Object.keys(worse.stats||{})])].every(key=>statValue(better,key)>=statValue(worse,key));
const CASTER_ONLY_STATS=['barrier','magicBonus','healBonus','magicAttack'];
/**
 * v7.0.26: 「弱い余剰」= 同じ部位に、装備画面と同じ判定で「強くなる」品があり、その品を誰か（隊長・隊員・予備兵）が装備できるときの下位品。
 * - 比較は強化値込みの実効値（item.stats）。強化+1/+2の下位品も対象。装備中・☆保護・ヒーロー専用・異質/神鍛/ドロップ/クラフト限定は対象外（ティア上限は従来どおり）。
 * - options.canUse(unit,item) と options.commander を渡すと、上位品を装備できる人の兵種で比較する（効かない項目は判定に入れない）。
 *   渡さない場合は個体の数値だけで比べ、上位品の必要筋力が下位品より高ければ基準にしない。
 * - 魔力補正・回復補正・バリア・魔法攻撃が下位品のほうが高く、それが効く兵種の人が下位品を使えるなら残す（ローブを重鎧の理由で売らない）。
 * - 弱い順に処理し、すでに選んだ品は基準にしない。同等品は装備中・隊長装備・バッグ内で先に出る品を残す。部位が空になることはない。
 */
export function lowValueIds(inventory, playerEquipment, soldiers, maxTier=2, options={}) {
  const protectedIds=equippedIds(playerEquipment,soldiers);
  const bag = inventory || [];
  const canUse=typeof options?.canUse==='function'?options.canUse:null;
  const units=canUse?[options.commander,...(soldiers||[])].filter(Boolean):[];
  // 比較の基準 = 隊長の現装備 + バッグ。過去に装備したことがあるかは一切見ない。
  const refs = [];
  const seen = new Set();
  for (const it of [...Object.values(playerEquipment || {}), ...bag]) {
    if (!it || !it.id || seen.has(it.id)) continue;
    seen.add(it.id);
    refs.push(it);
  }
  const usable=new Map();
  const canUseBy=(unit,item)=>{const key=units.indexOf(unit)+'|'+item.id;if(!usable.has(key))usable.set(key,!!canUse(unit,item));return usable.get(key);};
  const bagIndexOf=id=>bag.findIndex(i=>i&&i.id===id);
  const survivesTie=(other,item,itemIndex)=>{
    if(protectedIds.has(other.id))return true;
    const otherIndex=bagIndexOf(other.id);
    return otherIndex<0||otherIndex<itemIndex;
  };
  const candidates=bag.map((item,index)=>({item,index})).filter(({item})=>canSell(item,protectedIds)&&!isGodRollProtected(item)&&(item.tier||1)<=maxTier)
    .sort((x,y)=>compareEquipmentStrength(y.item,x.item)); // 弱い順
  const selected=new Set();
  for(const {item,index} of candidates){
    if(selected.has(item.id))continue;
    // 下位品を使える人にとって、残すべき特化性能（バリア・魔力・回復）が上位品に無い
    const keepsCasterEdge=other=>CASTER_ONLY_STATS.some(key=>statValue(item,key)>statValue(other,key)&&(canUse
      ?units.some(unit=>canUseBy(unit,item)&&!ineffectiveStatKeys(unit,item,other).has(key))
      :true));
    const beaten=other=>{
      if(!other||other.id===item.id||other.type!==item.type||other.heroOnly||selected.has(other.id))return false;
      if(item.type==='WEAPON'&&weaponStyleOf(other)!==weaponStyleOf(item))return false;
      if(keepsCasterEdge(other))return false;
      const holders=canUse?units.filter(unit=>canUseBy(unit,other)):[null];
      if(!holders.length)return false;
      if(!canUse&&requiredDefenseStrength(other)>requiredDefenseStrength(item))return false;
      return holders.some(unit=>{
        const options=unit?{unit,verdictOnly:true}:{verdictOnly:true};
        const forward=compareEquipment(other,item,options).kind,back=compareEquipment(item,other,options).kind;
        if(forward==='better')return back!=='better'||survivesTie(other,item,index);
        if(forward==='equal'&&back==='equal'&&dominates(other,item))return !dominates(item,other)||survivesTie(other,item,index);
        return false;
      });
    };
    if(refs.some(beaten))selected.add(item.id);
  }
  return bag.filter(item=>selected.has(item.id)).map(item=>item.id);
}

function materialLootWeights(distance, kind='normal') {
  const d=Math.max(0,distance || 0);
  // Tier 7（神話・オリハルコン）は遠方のダンジョン最奥宝箱 (魔王城) のみ
  if(kind==='dungeon_vault') {
    // 配列は素材帯（木・青銅・鉄・鋼・ミスリル・竜鱗・神話）。表示ティアは帯×4。
    // v6.2.0: 近場の宝箱は「その地域の通常ドロップ＋1〜2帯」まで（竜巌窟でT21〜28が出ていた）。
    if(d<5000) return [0,58,42,0,0,0,0]; // 廃坑: 青銅〜鉄（表示T5〜T12）
    if(d<8500) return [0,30,55,15,0,0,0]; // カタコンベ: 青銅〜鋼（表示T5〜T16）
    if(d<22000) return [0,0,30,55,15,0,0]; // 竜巌窟: 鉄〜ミスリル（表示T9〜T20）
    if(d<48000) return [0,0,0,30,50,20,0]; // 遠方: 鋼〜竜鱗（表示T13〜T24）
    return [0,0,0,0,0,45,55]; // 魔王城: 竜鱗〜神話（表示T21〜T28）
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
    // 超巨頭: その地域の通常ドロップ＋1〜2帯。高Tierは T6 まで（T7は最奥宝箱専用）
    if(d>=60000) return [0,0,0,0,25,75,0];
    if(d>=48000) return [0,0,0,10,40,50,0];
    if(d>=22000) return [0,0,0,30,60,10,0];
    if(d>=8000) return [0,0,30,50,20,0,0]; // 表示T9〜T20
    return [0,30,50,20,0,0,0]; // 本陣防衛圏: 表示T5〜T16
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

/** v6.7.1: authored border walls; labels show the actual HP/ATK multipliers. */
export const ZONE_SAFE_DIST=8000,ZONE_POWER_SOFTCAP=1_000_000,ZONE_EDGE_DIST=79360;
export const zoneRingPower=distance=>campaignScaling(distance,1).hp;
/** dx,dy (offsets from headquarters, optional): v7.2.19 south-east abyss multiplier is included in mult / tip / abyss. */
export function zoneRingLabelJa(distance,dx,dy){
  const d=Math.max(0,Number(distance)||0),c=campaignScaling(d,1),ab=dx==null||dy==null?1:southEastAbyss(dx,dy),p={hp:c.hp*ab,atk:c.atk*ab},ring=d<8000?0:d<22000?1:d<48000?2:3;
  const fmt=v=>v<10?v.toFixed(1):Math.round(v).toLocaleString('ja-JP');
  const boundary=[0,8000,22000,48000][ring],before=ring?campaignScaling(boundary-1,1):null,after=ring?campaignScaling(boundary,1):null;
  const wall=ring?{hp:after.hp/before.hp,atk:after.atk/before.atk}:null;
  return {ring,mult:p.hp,name:['本陣防衛圏','警戒辺境','魔境深部','最果ての死地'][ring],tip:`HP×${fmt(p.hp)}・攻撃×${fmt(p.atk)}`+(ab>1.005?`（南東のおく ×${ab<9.95?ab.toFixed(1):'10'}をふくむ）`:''),abyss:ab,wallTip:wall?`敵のHP約${Math.round(wall.hp)}倍・攻撃約${Math.round(wall.atk)}倍`:'',wall};
}
export const distanceScaling=campaignScaling;

export function shrineUpgradeCap(distance) {
  return Infinity; // 無限強化解禁！
}

const STAT_LABELS={atk:'攻撃',magicAttack:'魔法攻撃',magicDefense:'魔法防御',magicBonus:'魔力補正',healBonus:'回復補正',barrier:'バリア',def:'防御',hp:'HP',speed:'移動',atkSpeed:'攻速',crit:'会心',blockChance:'盾の被ダメ軽減',regen:'回復/秒',vampire:'吸血',lightning:'連鎖雷',reach:'長さ/射程',attackWidth:'攻撃幅',swingSpeed:'振り抜き',attackRate:'攻撃速度',sweetWidth:'スイート幅',sweetPower:'芯の威力補正'};
const CRITICAL_STATS=new Set(['atk','def','hp']);
const PCT_STATS=new Set(['crit','blockChance','atkSpeed','vampire','swingSpeed','sweetWidth','sweetPower','magicBonus','healBonus']);
const STAT_ORDER=['atk','magicAttack','def','hp','speed','atkSpeed','crit','blockChance','regen','vampire','lightning'];

function formatStatDisplay(key, value) {
  const n=key==='atkSpeed'?Math.min(60,Number(value)||0):Number(value)||0;
  if(['reach','attackWidth'].includes(key))return formatLength(n);
  if(key==='attackRate')return `${n.toFixed(2)}回/秒`;
  if(key==='lightning') return n?'あり':'なし';
  if(key==='regen') return `毎秒${Math.round(n)/10}%`;
  if(key==='vampire') return `${Math.round(n*10000)/100}%`;
  if(PCT_STATS.has(key)) return `${Math.round(n*100)/100}%${key==='atkSpeed'&&n>=60?'（上限）':''}`;
  return `${Math.round(n)}`;
}

function formatDeltaDisplay(key, delta) {
  if(key==='lightning') return delta>0?'+獲得':'−喪失';
  if(key==='regen')return `${delta>0?'+':''}${Math.round(delta)/10}%`;
  const scale=key==='vampire'?100:1;
  if(['reach','attackWidth'].includes(key))return formatLengthDelta(delta);
  const v=Math.round(delta*scale*100)/100;
  const suffix=PCT_STATS.has(key)?'%':key==='attackRate'?'回/秒':'';
  return `${v>0?'+':''}${v}${suffix}`;
}

/**
 * v7.0.24: how the equipment comparison is judged.
 * - Each changed stat becomes a rate of change. Attack / defense / HP / speed use the unit's real totals "after equipping" when the caller
 *   passes them (options.totals = {before,after} of {maxHp,def,atk,speed}); otherwise the item's own numbers are used.
 * - A change under 2% is "ほぼ変わらず": it counts neither as up nor as down.
 * - Weighted score: attack / magic attack / defense / HP x1, speed x0.5, everything else x0.3 (each rate capped at +-100%).
 * - net score within +-3% = 一長一短. Beyond that the side with the larger score must be more than twice the other, otherwise it stays 一長一短.
 */
export const EQUIPMENT_JUDGE=Object.freeze({ignoreBelow:.02,balance:.03,dominance:2,rateCap:1,speedBase:150,lightningRate:.1,
  weights:Object.freeze({atk:1,magicAttack:1,def:1,hp:1,speed:.5,other:.3})});
const MAJOR_STATS=new Set(['atk','magicAttack','def','hp']);
const TOTAL_KEY={atk:'atk',def:'def',hp:'maxHp',speed:'speed'};
const PERCENT_POINT_STATS=new Set(['crit','atkSpeed','blockChance','healBonus','magicBonus','sweetWidth','sweetPower']);
const clampRate=rate=>Math.max(-EQUIPMENT_JUDGE.rateCap,Math.min(EQUIPMENT_JUDGE.rateCap,rate));
const relativeChange=(before,after)=>before>0?(after-before)/before:after>0?1:after<0?-1:0;
function pctText(raw) {
  const p=raw*100,abs=Math.abs(p),text=abs>=100?Math.round(abs).toLocaleString('ja-JP'):String(Math.round(abs*10)/10);
  return `${p>0?'+':p<0?'-':''}${text}%`;
}
/** One changed stat -> {rate (capped), raw (uncapped %), text, weight, major, significant}. */
function judgeAxis(change,totals) {
  const {key,before,after,delta}=change,tk=TOTAL_KEY[key];
  const hasTotals=!!tk&&Number.isFinite(totals?.before?.[tk])&&Number.isFinite(totals?.after?.[tk]);
  let raw,text;
  if(hasTotals){
    raw=relativeChange(totals.before[tk],totals.after[tk]);
    text=MAJOR_STATS.has(key)?pctText(raw):formatDeltaDisplay(key,delta);
  } else if(key==='lightning'){
    raw=delta>0?EQUIPMENT_JUDGE.lightningRate:-EQUIPMENT_JUDGE.lightningRate;text=formatDeltaDisplay(key,delta);
  } else if(key==='speed'){
    raw=delta/EQUIPMENT_JUDGE.speedBase;text=formatDeltaDisplay(key,delta);
  } else if(PERCENT_POINT_STATS.has(key)){
    raw=delta/100;text=formatDeltaDisplay(key,delta);
  } else if(key==='vampire'){
    raw=delta;text=formatDeltaDisplay(key,delta);
  } else if(key==='regen'){
    raw=delta/20;text=formatDeltaDisplay(key,delta);
  } else {
    raw=relativeChange(before,after);text=MAJOR_STATS.has(key)?pctText(raw):formatDeltaDisplay(key,delta);
  }
  const weights=EQUIPMENT_JUDGE.weights,weight=weights[key]??weights.other,rate=clampRate(raw);
  return {key,label:change.label,delta,raw,rate,weight,score:rate*weight,text,major:MAJOR_STATS.has(key),significant:Math.abs(rate)>=EQUIPMENT_JUDGE.ignoreBelow};
}
const MEDIC_CLASSES=['MEDIC','HIGH_PRIEST','SAINT','ARCHANGEL'];
/**
 * v7.0.26: stats that do nothing for this unit (shown dimmed as 「(効果なし)」, left out of the judgement and the headline reasons).
 * - barrier: only commander / mage (not muscle mage) / medic lines (canUseEquipmentBarrier).
 * - magicAttack / magicBonus: only for units that cast or channel magic. The commander casts only while holding a staff or wand
 *   (when a weapon is being compared, the weapon on either side of the swap counts).
 * - healBonus: only for units with healing power.
 */
export function ineffectiveStatKeys(unit,candidate=null,current=null) {
  const out=new Set();
  if(!unit)return out;
  if(!canUseEquipmentBarrier(unit))out.add('barrier');
  const commander=!!(unit.isPlayer||unit.isHero)||attributeFamily(unit)==='COMMANDER';
  let magic;
  if(commander){
    const weapons=candidate?.type==='WEAPON'||current?.type==='WEAPON'?[candidate,current].filter(i=>i?.type==='WEAPON'):[unit.equipped?.weapon||unit.weapon];
    magic=weapons.some(isMagicWeapon);
  } else magic=isMagicUser(unit)||MEDIC_CLASSES.includes(unit.combatClass||unit.soldierClass)||canChannelWeaponMagic(unit);
  if(!magic){out.add('magicAttack');out.add('magicBonus');}
  if(!(Number(unit.healPower)>0)&&!MEDIC_CLASSES.includes(unit.combatClass||unit.soldierClass))out.add('healBonus');
  return out;
}
/** 装備乗り換え時の性能差。label/kind は既存互換（kind: better/worse/mixed/equal）。options.totals で「装備した後の合計値」を渡すと総合値で判定する。options.unit を渡すと、その兵士に効かない項目（バリア・魔力補正など）は表示だけ残して判定から外す。options.verdictOnly は判定だけ返す（売却の一括判定用）。 */
export function compareEquipment(candidate,current,options={}) {
  const axes=candidate?.type==='WEAPON'||current?.type==='WEAPON';
  const cappedStats=item=>({...item?.stats,...(item?.type!=='WEAPON'&&item?.stats?.atkSpeed!=null?{atkSpeed:Math.min(60,item.stats.atkSpeed)}:{}),...(item?.stats?.blockChance!=null?{blockChance:shieldReductionPct(item.stats.blockChance)}:{})});
  const afterStats={...cappedStats(candidate),...(axes?weaponAxisValues(candidate):{})},beforeStats={...cappedStats(current),...(axes?weaponAxisValues(current):{})};
  const keys=new Set([...Object.keys(afterStats),...Object.keys(beforeStats)]);
  const ordered=[...keys].sort((a,b)=>{
    const ia=STAT_ORDER.indexOf(a), ib=STAT_ORDER.indexOf(b);
    return (ia<0?99:ia)-(ib<0?99:ib);
  });
  const ignored=options?.unit?ineffectiveStatKeys(options.unit,candidate,current):new Set();
  const changes=ordered.map(key=>{
    const before=Number(beforeStats[key]||0);
    const after=Number(afterStats[key]||0);
    return {
      key,
      ineffective:ignored.has(key),
      label:STAT_LABELS[key]||key,
      delta:after-before,
      before,
      after,
      critical:CRITICAL_STATS.has(key)
    };
  }).filter(c=>c.delta!==0&&c.key!=='swingSpeed'); // Animation tempo is not combat performance.
  const totals=options?.totals&&options.totals.before&&options.totals.after?options.totals:null;
  const live=changes.filter(c=>!c.ineffective),judged=live.map(c=>judgeAxis(c,totals));
  judged.forEach((j,i)=>{live[i].significant=j.significant;live[i].rate=j.rate;});
  changes.filter(c=>c.ineffective).forEach(c=>{c.significant=false;c.rate=0;});
  const ups=judged.filter(j=>j.significant&&j.score>0),downs=judged.filter(j=>j.significant&&j.score<0);
  const gain=ups.reduce((s,j)=>s+j.score,0),loss=-downs.reduce((s,j)=>s+j.score,0),net=gain-loss,D=EQUIPMENT_JUDGE;
  let kind;
  if(!ups.length&&!downs.length)kind='equal';
  else if(!downs.length)kind='better';
  else if(!ups.length)kind='worse';
  else if(Math.abs(net)<=D.balance)kind='mixed';
  else if(net>0)kind=gain>loss*D.dominance?'better':'mixed';
  else kind=loss>gain*D.dominance?'worse':'mixed';
  const label={better:'強くなる',worse:'弱くなる',mixed:'一長一短',equal:'ほぼ同じ'}[kind];
  const rawUp=live.some(c=>c.delta>0),rawDown=live.some(c=>c.delta<0);
  const legacyKind=rawUp&&rawDown?'mixed':rawUp?'better':rawDown?'worse':'equal';
  if(options?.verdictOnly)return {label,kind,legacyKind,changes,score:net,gain,loss};
  // Old rule (any single up and any single down = mixed): kept only for the shared-box absorption, which must not change.
  const text=changes.map(c=>{
    const arrow=c.delta>0?'↑':'↓';
    return `${c.label} ${arrow} ${formatDeltaDisplay(c.key,c.delta)} (${formatStatDisplay(c.key,c.before)}→${formatStatDisplay(c.key,c.after)})${c.ineffective?' (効果なし)':''}`;
  }).join(' · ') || '能力差なし';
  const html=changes.length
    ? changes.map(c=>{
        const cls=c.delta>0?'stat-delta-up':'stat-delta-down';
        const arrow=c.delta>0?'↑':'↓';
        const crit=c.critical?' stat-delta-crit':'';
        const minor=c.significant?'':' stat-delta-minor';
        return `<span class="stat-delta-line ${cls}${crit}${minor}">${c.label} ${arrow} <strong>${formatDeltaDisplay(c.key,c.delta)}</strong> <span class="stat-delta-range">(${formatStatDisplay(c.key,c.before)}→${formatStatDisplay(c.key,c.after)})</span>${c.ineffective?' <span class="stat-delta-range">(効果なし)</span>':c.significant?'':' <span class="stat-delta-range">ほぼ変わらず</span>'}</span>`;
      }).join('')
    : '<span class="stat-delta-equal">能力差なし</span>';
  // Headline reasons: attack / defense / HP first, then by size. At most three.
  const reasons=[...ups,...downs].sort((a,b)=>(b.major-a.major)||Math.abs(b.score)-Math.abs(a.score)).slice(0,3);
  const reasonText=reasons.length?reasons.map(r=>`${r.label} ${r.text}`).join('・'):!changes.length?'能力差なし':live.length?'どの項目も変化は小さめ':'この兵士に効く項目の差はなし';
  const reasonHtml=reasons.length?reasons.map(r=>`<span class="${r.score>0?'stat-delta-up':'stat-delta-down'}">${r.label} <strong>${r.text}</strong></span>`).join('<span class="cmp-sep">・</span>'):`<span class="stat-delta-equal">${reasonText}</span>`;
  const shortText=[...ups,...downs].sort((a,b)=>(b.major-a.major)||Math.abs(b.score)-Math.abs(a.score)).slice(0,3).map(r=>`${r.label}${r.score>0?'↑':'↓'}`).join(' ');
  return {label,text,html,changes,kind,legacyKind,ineffectiveKeys:changes.filter(c=>c.ineffective).map(c=>c.key),score:net,gain,loss,basis:totals?'total':'item',reasons:reasons.map(r=>({key:r.key,label:r.label,text:r.text,up:r.score>0})),reasonText,reasonHtml,shortText};
}

/** Comparison card: verdict on one big line, the main reasons on one line, every stat folded, the "swap as-is" result small underneath. */
export function equipmentComparisonHtml(primary,{plain=null,basis='',warning='',title='',currentName=''}={}) {
  const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const note=primary.basis==='total'?'判定：装備した後の合計値（攻撃・防御・HP・移動）と、各項目の変化率。2%未満の差は数えません。':'判定：この装備の数値の変化率。2%未満の差は数えません。';
  const dimmed=primary.ineffectiveKeys?.length?'「(効果なし)」はこの兵士に効かない項目で、判定に入れていません。':'';
  const plainRow=plain?`<div class="cmp-plain">そのまま替えた場合：<strong class="cmp-${plain.kind}">${plain.label}</strong><span class="cmp-plain-reason"> ${esc(plain.shortText||plain.reasonText)}</span></div>`:'';
  return `<div class="equipment-comparison cmp-card ${primary.kind}">${title?`<div class="cmp-title equip-cmp-head">${esc(title)}</div>`:''}<div class="cmp-verdict"><strong class="cmp-label cmp-${primary.kind}">${primary.label}</strong>${basis?`<span class="cmp-basis">${basis}</span>`:''}${warning?`<span class="cmp-warning">${warning}</span>`:''}</div>`
    +(currentName?`<div class="cmp-current">現在：${esc(currentName)}</div>`:'')
    +`<div class="cmp-reason">${primary.reasonHtml}</div><details class="cmp-details"><summary>全項目の差</summary><div class="stat-delta-block">${primary.html}</div><small class="cmp-note">${note}${dimmed}</small></details>${plainRow}</div>`;
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
  score += (s.magicBonus||0)*100+(s.healBonus||0)*100+(s.barrier||0)*4+(s.magicDefense||0)*6;
  if (s.regen) score += s.regen * 200; // v7.0.21: regen is now tenths of a percent (was a flat 10-14)
  if (s.vampire) score += s.vampire * 1500;
  if (item.weaponStyle === 'spear') score += 40;
  if (isHeavyWeaponStyle(item)) score += 55;
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
  if(style==='staff'||style==='wand')return {style,ranged:false,magical:true,reach:style==='staff'?70:34,reachWarlord:style==='staff'?85:44,baseCooldown:style==='staff'?.95:.65,atkMult:weaponBaseAtkCoef(style),magicMult:style==='staff'?1.15:1.05,pierce:false,pierceHalfWidth:0,knockback:0,knockbackWarlord:0,projSpeed:0,splash:0,projType:null};
  if (style === 'spear') {
    return {
      style: 'spear', ranged: false,
      reach: 145, reachWarlord: 175,
      baseCooldown: 0.78, pierce: true, pierceHalfWidth: 26,
      atkMult: weaponBaseAtkCoef('spear'), knockback: 0, knockbackWarlord: 0,
      projSpeed: 0, splash: 0, projType: null
    };
  }
  if (isHeavyWeaponStyle(style)) {
    return {
      style, ranged: false,
      reach: 80, reachWarlord: 105,
      // v6.2.0: slower swings and a big, visible launch on every hit.
      baseCooldown: 1.22, pierce: false, pierceHalfWidth: 0,
      atkMult: weaponBaseAtkCoef(style), knockback: 170, knockbackWarlord: 230,
      projSpeed: 0, splash: 0, projType: null
    };
  }
  if (style === 'bow') {
    return {
      style: 'bow', ranged: true,
      reach: 250, reachWarlord: 280,
      baseCooldown: 0.60, pierce: false, pierceHalfWidth: 0,
      atkMult: weaponBaseAtkCoef('bow'), knockback: 0, knockbackWarlord: 0,
      projSpeed: 380, splash: 0, projType: 'ARROW', color: '#e2e8f0'
    };
  }
  if (style === 'crossbow') {
    return {
      style: 'crossbow', ranged: true,
      reach: 285, reachWarlord: 320,
      baseCooldown: 1.25, pierce: false, pierceHalfWidth: 0,
      // 重い一撃と直線3体貫通。単体の手数は弓、密集の範囲は火砲が優位。
      atkMult: weaponBaseAtkCoef('crossbow'), knockback: 12, knockbackWarlord: 18,
      projSpeed: 460, splash: 0, projType: 'BOLT', color: '#94a3b8'
    };
  }
  if (style === 'cannon') {
    return {
      style: 'cannon', ranged: true,
      reach: 310, reachWarlord: 360,
      baseCooldown: 1.85, pierce: false, pierceHalfWidth: 0,
      // 最遅・最大火力。スプラッシュで複数ヒット前提の厚め威力
      atkMult: weaponBaseAtkCoef('cannon'), knockback: 48, knockbackWarlord: 60,
      // v6.3.0: blast radius x1.2 (was 52); shell damage x2 is applied at firing (CANNON_RULES).
      projSpeed: 320, splash: 62, projType: 'CANNONBALL', color: '#f59e0b'
    };
  }
  return {
    style: 'sword', ranged: false,
    // v6.6.0: fast, reliable damage without ammunition or heavy-weapon launches.
    reach: 85, reachWarlord: 110,
    baseCooldown: 0.32, pierce: false, pierceHalfWidth: 0,
    atkMult: weaponBaseAtkCoef('sword'), knockback: 0, knockbackWarlord: 0,
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
    sweepArc:!p.ranged&&!p.pierce&&item?.weaponTraits?(isHeavyWeaponStyle(p.style)?1.8:1.2)*sweep:0,
    swingSpeed:trait(item,'swingSpeed')};
}
/** Non-weapon sources share one additive budget; weapon penalties retain their identity. */
export const ATTACK_SPEED_BONUS_CAP=60,ATTACK_COOLDOWN_FLOOR=.6;
export function attackSpeedState(equipped={},extraPct=0,warlordPct=0) {
  const weapon=equipped?.weapon;
  const raw=Object.entries(equipped||{}).reduce((v,[slot,item])=>v+(slot==='weapon'?0:Number(item?.stats?.atkSpeed)||0),Number(extraPct)||0);
  const bonus=Math.min(ATTACK_SPEED_BONUS_CAP,raw);
  return {atkSpeed:Math.max(.55,1+(Number(weapon?.stats?.atkSpeed)||0)/100+bonus/100+warlordPct/100),attackSpeedBonusPct:bonus,attackSpeedAtCap:raw>=ATTACK_SPEED_BONUS_CAP,warlordSpeedPct:warlordPct};
}
export function attackCooldown(item,requestedBase,attackSpeed=1,warlordPct=0) {
  return Math.max(weaponCombatProfile(item).baseCooldown*ATTACK_COOLDOWN_FLOOR/(1+warlordPct/100),requestedBase/Math.max(.55,Number(attackSpeed)||1));
}
export const attackSpeedLabel=unit=>`攻速補正 +${Math.round(unit?.attackSpeedBonusPct||0)}%${unit?.attackSpeedAtCap?'（上限）':''}${unit?.warlordSpeedPct?` · 覇王 +${unit.warlordSpeedPct}%（上限外）`:``} · 武器ごとの最短間隔${unit?.warlordSpeedPct?46.2:60}%`;
/** Actual actors include quickness and Phantom in the shared budget at stat recalculation. */
export const soldierAttackCooldown=(unit,cooldown)=>!usesSoldierTempo(unit)?cooldown:Math.max(.12,weaponCombatProfile(unit?.equipped?.weapon||unit?.weapon).baseCooldown*ATTACK_COOLDOWN_FLOOR,
  cooldown*(Number.isFinite(unit?.attackSpeedBonusPct)?1:soldierCombatTempo(unit))*(Number.isFinite(unit?.attackSpeedBonusPct)?1:1+Math.max(0,unit?.deathlineAtkSpeed||0)/100));
export function meleeSweetSpotFor(item) {
  const base=MELEE_SWEET_SPOT[combatFamilyOf(item)];if(!base)return null;
  if(typeof item==='string'||!item?.weaponTraits)return base;
  const peak=Math.max(.12,Math.min(.94,base.peak+(item.weaponTraits.sweetShift||0))),width=trait(item,'sweetWidth');
  return {...base,peak,sweetMin:Math.max(.04,peak-(base.peak-base.sweetMin)*width),sweetMax:Math.min(1.05,peak+(base.sweetMax-base.peak)*width),sweetDmg:1+(base.sweetDmg-1)*trait(item,'sweetPower')};
}
export function weaponAxisValues(item) {
  if(!item)return {reach:0,attackWidth:0,swingSpeed:0,attackRate:0,sweetWidth:0,sweetPower:0};
  const p=weaponCombatProfile(item),sweet=p.ranged?null:meleeSweetSpotFor(item),arc=p.sweepArc||(isHeavyWeaponStyle(p.style)?1.8:1.2);
  return {reach:p.ranged?p.reach:p.playerReach,attackWidth:p.pierce?p.pierceHalfWidth*2:p.ranged?p.splash*2:2*p.playerReach*Math.sin(arc/2),
    swingSpeed:p.swingSpeed*100,attackRate:1/attackCooldown(item,p.baseCooldown,1+(item.stats?.atkSpeed||0)/100),
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
