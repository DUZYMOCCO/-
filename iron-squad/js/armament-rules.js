import {weaponCombatProfile,meleeSweetSpotFor,soldierAttackCooldown} from './equipment-rules.js?v=292';
import {masteryReloadMult,applyMasteryToCombatProfile,isHeavyWeaponStyle} from './growth-rules.js?v=292';
import {MAX_EQUIPMENT_TIER,GENERATION_COUNT,tierNumber,powerRank,tierDescription} from './equipment-tiers.js?v=231';
import {canUseEquipment} from './weapon-requirements.js?v=291';
import {prefersCasterMelee} from './unit-attributes.js?v=291';

export const ARMAMENT_POLICIES={
  balanced:{name:'均衡',research:.25,development:.25,budget:1500,perLevel:250,maintenanceShare:.3},
  military:{name:'軍備優先',research:.4,development:.15,budget:2200,perLevel:400,maintenanceShare:.4},
  development:{name:'発展優先',research:.15,development:.4,budget:850,perLevel:150,maintenanceShare:.15}
};
export const RESERVE_ARMAMENT_COUNT=8;
export const ARMAMENT_LIMITS={improvementsPerWave:8,replacementMinGain:.08,forgeMinGain:.002,studyCreditPerTier:150};
export const researchCost=t=>Math.round(500+powerRank(t)*350+Math.pow(tierNumber(t)-1,1.5)*25);
export const standardEquipmentCost=item=>Math.max(52,Math.ceil((14+Math.pow(powerRank(item.tier),1.8)*12)*2));
/** Each soldier keeps the same six-gold buffer used by their own rest maintenance. */
export const personalEquipmentBudget=soldier=>Number.isFinite(Number(soldier?.gold))?Math.max(0,Math.floor(Number(soldier.gold))-6):0;
/** Scoped to one synchronous operation. Reuse the exact trial score, never an approximation. */
export function createEquipmentValueCache(evaluate) {
  const cache=new WeakMap(),keys=['weapon','armor','shield','helmet','legs','gloves','amulet'];
  const value=(unit,item,key)=>{
    const gear=keys.flatMap(slot=>{const item=unit.equipped?.[slot];return [item,item?.upgrade,item?.stats];});gear.push(unit.weapon,unit.weapon?.upgrade,unit.weapon?.stats);
    let entry=cache.get(unit);
    if(!entry||gear.some((it,i)=>it!==entry.gear[i])){entry={gear,scores:new Map()};cache.set(unit,entry);}
    let scores=entry.scores.get(key);if(!scores){scores=new Map();entry.scores.set(key,scores);}
    if(!scores.has(item))scores.set(item,evaluate(unit,item,key));
    return scores.get(item);
  };
  value.invalidate=unit=>cache.delete(unit);
  return value;
}
export function normalizeArmament(data={}) {
  return {techTier:tierNumber(data.techTier),research:Math.max(0,Math.floor(Number(data.research)||0)),
    observedTier:tierNumber(data.observedTier),policy:ARMAMENT_POLICIES[data.policy]?data.policy:'balanced',
    researchPhase:Math.max(0,Math.floor(data.researchPhase||0)),supplyPhase:Math.max(0,Math.floor(data.supplyPhase||0)),
    last:data.last?{...data.last}:null};
}
export function observeEquipment(game,item) {
  if(!item||item.nationalIssue||item.craftOnly||!item.type||item.isOrb||item.isGem)return;
  const n=game.nation;if(!n)return;
  n.armament=normalizeArmament(n.armament);
  // Studying a new generation happens once; selling/reloading it cannot repeat the credit.
  if(item.tier>n.armament.observedTier){n.armament.research+=(tierNumber(item.tier)-n.armament.observedTier)*ARMAMENT_LIMITS.studyCreditPerTier;n.armament.observedTier=tierNumber(item.tier);}
}
export function advanceResearch(game,available) {
  const a=game.nation.armament=normalizeArmament(game.nation.armament),phase=game.phase-1;
  if(a.researchPhase>=phase)return 0;
  a.researchPhase=phase;
  const cap=Math.min(MAX_EQUIPMENT_TIER,Math.max(GENERATION_COUNT*(game.nation.level+1),a.observedTier));
  if(a.techTier>=cap)return 0;
  const cost=researchCost(a.techTier+1),spent=Math.min(Math.floor(available*ARMAMENT_POLICIES[a.policy].research),Math.max(0,cost-a.research));
  a.research+=spent;
  if(a.research>=cost){a.research-=cost;a.techTier++;game.showToast?.(`工房の製造技術：${tierDescription(a.techTier)}を開発。軍への更新を開始します`);}
  return spent;
}

/** A pure trial of the real stat calculation. No HP, mana, appearance or caches on the actor are mutated. */
export function soldierEquipmentValue(game,soldier,item,key,classes) {
  if(!canUseEquipment(soldier,item))return -Infinity;
  const cls=classes[soldier.soldierClass]||classes.HEAVY,family=cls.baseClassId||soldier.soldierClass;
  const archer=family==='ARCHER',medic=['MEDIC','HIGH_PRIEST','SAINT','ARCHANGEL'].includes(soldier.soldierClass),mage=family==='MAGE';
  if(key==='weapon'&&item&&!medic&&!mage){const ranged=weaponCombatProfile(item).ranged;if(archer!==ranged)return -Infinity;}
  const trial={...soldier,_equipmentTrial:true,equipped:{...soldier.equipped,[key]:item},weapon:key==='weapon'?item:soldier.weapon,
    appearance:soldier.appearance?{...soldier.appearance}:undefined,weaponMastery:{...soldier.weaponMastery},deathlineSkills:[...(soldier.deathlineSkills||[])]};
  const copyGear=gear=>gear?{...gear,stats:{...gear.stats},weaponTraits:gear.weaponTraits?{...gear.weaponTraits}:undefined}:gear;
  trial.equipped=Object.fromEntries(Object.entries(trial.equipped).map(([slot,gear])=>[slot,copyGear(gear)]));
  trial.weapon=key==='weapon'?trial.equipped.weapon:copyGear(soldier.weapon);
  game.recalcSoldierStats(trial);
  const weapon=trial.equipped.weapon,profile=applyMasteryToCombatProfile(weaponCombatProfile(weapon),trial.weaponMastery);
  const sweet=meleeSweetSpotFor(weapon);
  let cooldown=archer?profile.baseCooldown:(cls.atkCooldown||1)*(profile.style==='spear'?1.5:isHeavyWeaponStyle(profile.style)?1.85:1)*masteryReloadMult(trial.weaponMastery,profile.style);
  if(weapon?.weaponTraits)cooldown/=Math.max(.55,(trial.atkSpeed||1)*(weapon.weaponTraits.attackTempo||1));
  const crit=Math.max(0,Math.min(75,trial.crit||0))/100;
  cooldown=soldierAttackCooldown(trial,cooldown);
  let dps=Math.max(1,trial.atk||1)*(1+crit*1.2)/Math.max(.15,cooldown);
  if(!archer&&!mage&&!medic){if(weapon?.weaponTraits&&sweet)dps*=sweet.sweetDmg;}
  const durability=(Math.max(1,trial.maxHp||1)+(trial.equipmentBarrierMax||0))*(1+Math.max(0,trial.def||0)/120)/Math.max(.35,1-(trial.dmgReduction||0)/100);
  const stats=Object.values(trial.equipped).filter(Boolean).map(i=>i.stats||{});
  const recovery=stats.reduce((v,s)=>v+(s.regen||0)*.2+(s.vampire||0),0);
  const attack=medic?Math.max(1,trial.healPower||1,prefersCasterMelee(trial)?dps:0):mage?Math.max(1,trial.magicAttack||1,prefersCasterMelee(trial)?dps:0):dps;
  const attackWeight=family==='HEAVY'?.35:medic?.7:mage||archer?.75:.65;
  const reach=archer?Math.max(1,profile.reach||250):Math.max(1,profile.reach||45);
  return Math.exp(Math.log(attack)*attackWeight+Math.log(durability)*(1-attackWeight)+Math.log(Math.max(50,trial.speed||100)/100)*.12+Math.log(reach/(archer?250:45))*.08+Math.log(1+recovery)*.08);
}
