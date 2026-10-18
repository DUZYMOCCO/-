import {formatCompact} from './number-format.js?v=282';
// v7.0.21: equipment effects that were stored but never used (regen / vampire / lightning), the real shield effect, armour HP growth and the equip preview.

/** Armour / helmet / shield max HP = baseValue x coef x rank^power x (+X) x quality. Version 1 = v7.0.21 (was 3.0 / 2.0 / 1.5 x rank^1.3). */
export const EQUIPMENT_HP_RULES=Object.freeze({version:1,power:1.5,coef:Object.freeze({ARMOR:5,HELMET:3.3,SHIELD:2.5})});
export const equipmentHpFormula=(type,baseValue,rank,plusMult,rollMult)=>Math.floor(baseValue*EQUIPMENT_HP_RULES.coef[type]*Math.pow(rank,EQUIPMENT_HP_RULES.power)*plusMult*rollMult);

/** Shield "blockChance" is not a chance: the unit's damage reduction rises by floor(blockChance x 0.3) percent. Shown that way everywhere. */
export const SHIELD_BLOCK_TO_REDUCTION=.3;
export const shieldReductionPct=blockChance=>Math.floor((Number(blockChance)||0)*SHIELD_BLOCK_TO_REDUCTION);

/** regen is stored in tenths of a percent of max HP per second (armour T17+: 4-6, crafted amulet 2). Total capped at 0.8%/s. */
export const EQUIPMENT_REGEN_CAP=8;
export const equipmentRegenOf=equipped=>Math.min(EQUIPMENT_REGEN_CAP,Object.values(equipped||{}).reduce((sum,item)=>sum+Math.max(0,Number(item?.stats?.regen)||0),0));
export const regenText=value=>`回復 毎秒最大HPの${Math.round(value)/10}%`;
const alive=unit=>!!unit&&!unit.dead&&!unit.isDown&&!unit.dying&&(unit.hp||0)>0;
export function tickEquipmentRegen(unit,dt) {
  const permille=unit?.equipmentRegen;
  if(!(permille>0)||!(dt>0)||!alive(unit)||!(unit.hp<unit.maxHp))return 0;
  const heal=Math.min(unit.maxHp-unit.hp,unit.maxHp*permille/1000*dt);
  unit.hp+=heal;return heal;
}

/** Soldiers / hero party use the commander's 20% lifesteal, but each hit heals at most 1.5% of max HP and a unit heals at most every 0.25 s. */
export const SOLDIER_VAMPIRE=Object.freeze({maxRate:.2,perHitMaxHpShare:.015,minInterval:.25});
export function soldierVampireHeal(unit,damage,now=0) {
  const rate=Math.min(SOLDIER_VAMPIRE.maxRate,Number(unit?.vampire)||0);
  if(!(rate>0)||!(damage>0)||!alive(unit)||!(unit.hp<unit.maxHp)||now<(unit._vampireReadyAt||0))return 0;
  unit._vampireReadyAt=now+SOLDIER_VAMPIRE.minInterval;
  const heal=Math.min(Math.ceil(damage*rate),Math.ceil(unit.maxHp*SOLDIER_VAMPIRE.perHitMaxHpShare));
  unit.hp=Math.min(unit.maxHp,unit.hp+heal);return heal;
}

/** Weapon "lightning" (rank 6+): a physical hit arcs to the nearest enemies for a share of the hit. One arc per attacker per second. */
export const LIGHTNING_RULES=Object.freeze({cooldown:1,radius:150,shares:Object.freeze([.4,.25]),color:'#e9d36a'});
export const lightningReady=(attacker,now=0)=>now>=(attacker?._lightningReadyAt||0);
export function pickLightningTargets(monsters,origin,rules=LIGHTNING_RULES) {
  return (monsters||[]).filter(m=>m&&m!==origin&&m.hp>0&&!m.retreated&&Math.hypot(m.x-origin.x,m.y-origin.y)<=rules.radius)
    .sort((a,b)=>Math.hypot(a.x-origin.x,a.y-origin.y)-Math.hypot(b.x-origin.x,b.y-origin.y)).slice(0,rules.shares.length);
}
export const lightningDamage=(hit,index,magicDef=0)=>Math.max(1,Math.round(hit*LIGHTNING_RULES.shares[index]*100/(100+Math.max(0,magicDef)*1.2)));

/** Card text for the effects that used to be invisible (and the shield's real value). */
export function equipmentEffectParts(stats) {
  const s=stats||{},parts=[];
  if(s.blockChance)parts.push(`被ダメ軽減${shieldReductionPct(s.blockChance)}%`);
  if(s.regen)parts.push(regenText(s.regen));
  if(s.vampire)parts.push(`吸血${Math.round(s.vampire*100)}%`);
  if(s.lightning)parts.push('連鎖雷');
  return parts;
}

/** "If equipped" preview. before/after: {maxHp,def,atk}. */
export const EFFECT_PREVIEW_STATS=Object.freeze([['maxHp','最大HP'],['def','防御'],['atk','攻撃']]);
export function equipmentEffectText(before,after) {
  return '装備すると '+EFFECT_PREVIEW_STATS.map(([key,label])=>`${label} ${formatCompact(before[key])}→${formatCompact(after[key])}`).join(' / ');
}
export function equipmentEffectHtml(before,after,label='装備すると') {
  const cells=EFFECT_PREVIEW_STATS.map(([key,label])=>{
    const delta=Math.round(after[key])-Math.round(before[key]),cls=delta>0?'stat-delta-up':delta<0?'stat-delta-down':'';
    return `<span class="${cls}">${label} ${formatCompact(before[key])}→${formatCompact(after[key])}${delta?`（${delta>0?'+':''}${formatCompact(delta)}）`:''}</span>`;
  });
  return `<div class="equip-effect"><b>${label}</b> ${cells.join(' / ')}</div>`;
}
