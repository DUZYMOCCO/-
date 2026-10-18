import {equipmentUpgradeCost} from './payroll-rules.js?v=226';

// v7.0.23: soldiers' self-funded upgrades are limited by money, not by a tiny per-action count.
// Price (equipmentUpgradeCost), +level strength and the +level itself are unchanged; only the number of upgrades a soldier can chain is relaxed.
/** Hard stop for one funding / donation action per soldier. It only guards against runaway loops; gold is the real limit. */
export const SELF_UPGRADE_SAFETY_LIMIT=5000;
/** Rest maintenance: at most this many upgrades per soldier per period (rest), spread over the rest seconds. */
export const REST_UPGRADES_PER_PHASE_MAX=200;
/** Rest maintenance: at most this many upgrades per soldier per rest second (200 / 8 s), so many soldiers never stall one frame. */
export const REST_UPGRADES_PER_TICK_MAX=25;

/**
 * Plan consecutive upgrades for one soldier without touching the items.
 * Rule is the same as the old one-at-a-time loops: always the lowest +level piece the soldier can still afford (cost + reserve).
 * Returns {count, spent, gold, limited, steps:[{item, gained, from, to}]}; callers apply `to` with applyUpgradeStats.
 */
export function planSelfUpgrades(items,gold,{reserve=0,maxCount=SELF_UPGRADE_SAFETY_LIMIT}={}) {
  const pieces=[],seen=new Set();
  for(const item of items||[]){if(!item||seen.has(item))continue;seen.add(item);pieces.push({item,from:Math.max(0,Math.floor(Number(item.upgrade)||0)),up:0,tier:item.tier});}
  let purse=Math.max(0,Number(gold)||0),spent=0,count=0;
  const limit=Math.max(0,Math.min(SELF_UPGRADE_SAFETY_LIMIT,Math.floor(Number(maxCount))||0)),keep=Math.max(0,Number(reserve)||0);
  let limited=false;
  while(pieces.length){
    if(count>=limit){limited=true;break;}
    let best=null,bestCost=0;
    for(const piece of pieces){
      const level=piece.from+piece.up;
      if(best&&level>=best.from+best.up)continue;
      const cost=equipmentUpgradeCost({upgrade:level,tier:piece.tier});
      if(purse>=cost+keep){best=piece;bestCost=cost;}
    }
    if(!best)break;
    purse-=bestCost;spent+=bestCost;best.up++;count++;
  }
  return {count,spent,gold:purse,limited,steps:pieces.filter(p=>p.up>0).map(p=>({item:p.item,gained:p.up,from:p.from,to:p.from+p.up}))};
}/** Apply a plan from planSelfUpgrades: one stat recalculation per piece, however many levels it gained. */
export function applySelfUpgradePlan(plan,applyUpgradeStats) {
  for(const step of plan.steps)applyUpgradeStats(step.item,step.to);
  return plan.count;
}
