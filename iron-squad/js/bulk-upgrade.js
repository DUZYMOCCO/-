import {equipmentUpgradeCost} from './payroll-rules.js?v=226';
import {SELF_UPGRADE_SAFETY_LIMIT} from './self-upgrade-rules.js?v=300';

// v7.0.24: +1 / +10 / +100 upgrade buttons. Price formula, +level strength and the save format are unchanged:
// a bulk upgrade is exactly N single upgrades in a row, limited by the purse (and the 5,000 safety limit).
export const BULK_UPGRADE_STEPS=Object.freeze([1,10,100]);
const fmt=n=>Math.max(0,Math.floor(Number(n)||0)).toLocaleString('ja-JP');

/** Plan up to `steps` upgrades of one item that `gold` can pay for. Does not touch the item. */
export function planBulkUpgrade(item,gold,steps,costOf=equipmentUpgradeCost) {
  const requested=Math.max(0,Math.min(SELF_UPGRADE_SAFETY_LIMIT,Math.floor(Number(steps))||0));
  let purse=Math.max(0,Math.floor(Number(gold)||0)),spent=0,count=0;
  const from=Math.max(0,Math.floor(Number(item?.upgrade)||0));
  while(count<requested){
    const cost=costOf({...item,upgrade:from+count});
    if(!Number.isSafeInteger(cost)||cost<=0||cost>purse)break;
    purse-=cost;spent+=cost;count++;
  }
  return {requested,count,spent,from,to:from+count,short:count<requested};
}

/** One toast / log line for a finished upgrade run. */
export const bulkUpgradeSummary=plan=>`強化+${plan.count.toLocaleString('ja-JP')}回（合計${fmt(plan.spent)}G）`;

/**
 * Button row markup. +1 keeps its old behaviour (always tappable; a short purse is reported when tapped).
 * +10 / +100 pay for as many levels as the purse allows and show the total for that many; zero affordable = disabled.
 */
export function bulkUpgradeButtonsHtml(item,gold,{className='',tone='',costOf=equipmentUpgradeCost,attrs=''}={}) {
  const buttons=BULK_UPGRADE_STEPS.map(steps=>{
    const plan=planBulkUpgrade(item,gold,steps,costOf);
    const single=steps===1,disabled=!single&&plan.count===0;
    const quote=single?costOf(item):plan.spent;
    const sub=plan.count===0?(single?`${fmt(quote)}G`:'所持金不足'):plan.short?`${plan.count}回・${fmt(plan.spent)}G`:`${fmt(plan.spent)}G`;
    const label=plan.count===0&&!single?`${steps}回強化（所持金不足）`:`${plan.count||1}回強化・合計${fmt(plan.count?plan.spent:quote)}G`;
    return `<button type="button" class="mini-btn upgrade-step ${tone} ${className}" ${attrs} data-times="${steps}" ${disabled?'disabled':''} aria-label="${label}${plan.short&&plan.count?`（${steps}回には足りません）`:''}"><span class="up-step-n">${single?'🔨 ':''}+${steps}</span><span class="up-step-g">${sub}</span></button>`;
  }).join('');
  return `<div class="upgrade-steps" role="group" aria-label="まとめて強化">${buttons}</div>`;
}
