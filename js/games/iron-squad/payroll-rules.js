import {powerRank} from './equipment-tiers.js?v=129';

export const SOLDIER_SALARY=20;
export const PAYROLL_RULES={perLevel:6,perClassGrade:40,perDevelopmentLevel:20,maintenanceRate:.6,weaponWeight:2,operatingMargin:.25,reserveCycles:2.5,commanderMaintenanceRate:.3};
const GRADES={PALADIN:1,BLADEMASTER:1,SNIPER:1,HIGH_PRIEST:1,ARCHMAGE:1,TEMPLAR:2,SWORD_EMPEROR:2,SWORD_SAINT:2,STORM_BOW:2,STORM_ARCHER:2,SAINT:2,ELEMENTAL_SAGE:2,IMMORTAL_AEGIS:3,VOID_EDGE:3,STAR_HUNTER:3,ARCHANGEL:3,ARCANE_SOVEREIGN:3};
const amount=n=>Math.max(0,Math.floor(Number(n)||0));

/** Same unlimited forging price for every buyer and every payroll estimate. */
export function equipmentUpgradeCost(item) {
  const up=amount(item?.upgrade),tierFactor=Math.max(1,powerRank(item?.tier)*.8);
  return Math.floor((20+up*18+Math.pow(up,1.4)*6)*tierFactor);
}
export function salaryQuote(soldier,game={}) {
  const basic=SOLDIER_SALARY+Math.max(0,amount(soldier?.level||1)-1)*PAYROLL_RULES.perLevel
    +(GRADES[soldier?.soldierClass]||0)*PAYROLL_RULES.perClassGrade
    +amount(game.nation?.level)*PAYROLL_RULES.perDevelopmentLevel;
  const slots=Object.entries(soldier?.equipped||{});
  if(!soldier?.equipped?.weapon&&soldier?.weapon)slots.push(['weapon',soldier.weapon]);
  const seen=new Set();let weightedCost=0,weight=0;
  for(const [slot,item] of slots){
    if(!item||seen.has(item.id||item))continue;seen.add(item.id||item);
    const w=slot==='weapon'?PAYROLL_RULES.weaponWeight:1;
    weightedCost+=equipmentUpgradeCost(item)*w;weight+=w;
  }
  const benchmark=weight?weightedCost/weight:0;
  const maintenance=Math.ceil(benchmark*PAYROLL_RULES.maintenanceRate);
  return {basic,maintenance,total:basic+maintenance,benchmark};
}
export function commanderStipendQuote(game={},phase=1) {
  const weapon=game.equipped?.weapon;
  return 40+Math.max(1,amount(phase))*6+(weapon?Math.ceil(equipmentUpgradeCost(weapon)*PAYROLL_RULES.commanderMaintenanceRate):0);
}
export function createPayrollPlan(game,bonuses=new Map()) {
  const seen=new Set(),entries=[];
  for(const soldier of [...(game.squad||[]),...(game.reserves||[])]){
    if(!soldier||soldier.dead||seen.has(soldier.id||soldier))continue;seen.add(soldier.id||soldier);
    const quote=salaryQuote(soldier,game),ranker=amount(bonuses.get(soldier.id)?.totalBonus);
    entries.push({soldier,...quote,ranker,expected:quote.total+ranker});
  }
  return {entries,regular:entries.reduce((n,e)=>n+e.total,0),ranker:entries.reduce((n,e)=>n+e.ranker,0),total:entries.reduce((n,e)=>n+e.expected,0)};
}
// Proportional shortages, including the final single gold, are deterministic.
function allocate(entries,key,budget) {
  const needed=entries.reduce((n,e)=>n+e[key],0);
  if(budget>=needed)return entries.map(e=>e[key]);
  if(!needed||!budget)return entries.map(()=>0);
  const values=entries.map(e=>Math.floor(e[key]*budget/needed));
  const order=entries.map((e,i)=>({i,fraction:e[key]*budget/needed-values[i]})).sort((a,b)=>b.fraction-a.fraction||a.i-b.i);
  let left=budget-values.reduce((n,v)=>n+v,0);
  for(const {i} of order){if(!left)break;values[i]++;left--;}
  return values;
}
/** Actual gold transfers: regular pay first, then honors, both from the treasury. */
export function paySoldiers(game,plan,phase) {
  const available=amount(game.treasury),regularBudget=Math.min(available,plan.regular);
  const regular=allocate(plan.entries,'total',regularBudget),rankerBudget=Math.min(available-regularBudget,plan.ranker);
  const ranker=allocate(plan.entries,'ranker',rankerBudget);
  let basicPaid=0,maintenancePaid=0,rankerCount=0;
  plan.entries.forEach((entry,i)=>{
    const paid=regular[i]+ranker[i];entry.soldier.gold=(entry.soldier.gold||0)+paid;
    basicPaid+=Math.min(regular[i],entry.basic);maintenancePaid+=Math.max(0,regular[i]-entry.basic);
    if(ranker[i])rankerCount++;
    entry.soldier.lastMaintenance={phase,count:0,spent:0,salaryExpected:entry.expected,salaryPaid:paid,
      basicPay:Math.min(regular[i],entry.basic),maintenanceAllowance:Math.max(0,regular[i]-entry.basic),rankerBonus:ranker[i],
      status:paid<entry.expected?'給与不足・開始前整備予定':'次ラウンド開始前に整備予定'};
  });
  const paid=regularBudget+rankerBudget,shortfall=plan.total-paid;game.treasury=available-paid;
  if(game.phaseFiscal){
    const l=game.phaseFiscal;l.salariesPaid=(l.salariesPaid||0)+paid;l.salaryHeadcount=plan.entries.length;l.salaryShortfall=(l.salaryShortfall||0)+shortfall;
    l.basicSalariesPaid=(l.basicSalariesPaid||0)+basicPaid;l.maintenanceAllowancesPaid=(l.maintenanceAllowancesPaid||0)+maintenancePaid;l.rankerBonusesPaid=(l.rankerBonusesPaid||0)+rankerBudget;
  }
  return {paid,shortfall,regularPaid:regularBudget,rankerPaid:rankerBudget,rankerCount,
    min:regular.length?regular.reduce((n,v)=>Math.min(n,v),Infinity):0,max:regular.reduce((n,v)=>Math.max(n,v),0)};
}
