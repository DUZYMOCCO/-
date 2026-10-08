import {GENERATION_COUNT} from './equipment-tiers.js?v=116';
/**
 * IRON SQUAD economy / roster reform (v1.23.0)
 * 国庫・共有装備ボックス・スカウト費用・財政報告の公式を集約
 */

import { saleValue, compareEquipment, equipmentScore, isGodRollProtected } from './equipment-rules.js';

/** 作戦期ごとの国庫歳入（徴税・兵站） */
export const TREASURY_INCOME_BASE = 3000;
export const TREASURY_INCOME_PER_PHASE = 18;
export const TREASURY_INCOME_PER_SOLDIER = 20;

/** 隊長への指揮手当（歳入から先に支払い） */
export const COMMANDER_STIPEND_BASE = 40;
export const COMMANDER_STIPEND_PER_PHASE = 6;

/** 共有ボックスへ自動吸収する装備の上限 Tier */
export const SHARED_BOX_MAX_TIER = GENERATION_COUNT*3;

/** 買い取り倍率（saleValue 基準の相当額） */
export const BUYOUT_MULT = 1.15;

/** スカウト基本費用（才能別） */
export const SCOUT_COST_BY_TALENT = {
  INFERIOR: { base: 60, perPhase: 8 },
  AVERAGE: { base: 100, perPhase: 12 },
  TALENTED: { base: 180, perPhase: 20 },
  ELITE: { base: 320, perPhase: 35 },
  GENIUS: { base: 600, perPhase: 55 }
};

/** 放逐時の返還率（スカウト想定額に対する割合） */
export const DISMISS_SCOUT_REFUND_RATE = 0.4;
/** 放逐時に兵士サイフから国庫へ還流する割合 */
export const DISMISS_GOLD_RETURN_RATE = 0.5;

export function emptyFiscalLedger(phase = 1, startBalance = 0) {
  return {
    phase,
    income: 0,
    salariesPaid: 0,
    salaryHeadcount: 0,
    salaryShortfall: 0,
    donations: 0,
    distributed: 0,
    distributeHeadcount: 0,
    buyouts: 0,
    buyoutCount: 0,
    equipmentProcurement: 0,
    equipmentIssued: 0,
    equipmentUpdated:0,
    sharedEquipmentIssued:0,
    publicForging:0,
    armamentResearch:0,
    surplusSales: 0,
    surplusCount: 0,
    developmentSpent: 0,
    defenseRewards: 0,
    treasuryReturns: 0,
    facilityRevenue: 0,
    commanderStipend: 0,
    scoutSpent: 0,
    dismissRefund: 0,
    startBalance: startBalance || 0,
    endBalance: startBalance || 0
  };
}

/** 国庫歳入総額（指揮手当控除前） */
export function calcTreasuryGrossIncome(phase, livingCount) {
  const p = Math.max(1, phase || 1);
  const n = Math.max(0, livingCount || 0);
  return Math.floor(TREASURY_INCOME_BASE + p * TREASURY_INCOME_PER_PHASE + n * TREASURY_INCOME_PER_SOLDIER + COMMANDER_STIPEND_BASE + p * COMMANDER_STIPEND_PER_PHASE);
}

export function calcCommanderStipend(phase, grossIncome) {
  const p = Math.max(1, phase || 1);
  const stipend = Math.floor(COMMANDER_STIPEND_BASE + p * COMMANDER_STIPEND_PER_PHASE);
  return Math.max(0, Math.min(grossIncome || 0, stipend));
}

/** 公正買い取り額 */
export function calcBuyoutGold(item) {
  if (!item) return 0;
  return Math.max(1, Math.floor(saleValue(item) * BUYOUT_MULT));
}

/**
 * プレイヤー拾得装備を共有ボックスへ吸収すべきか
 * Tier≤T3 かつ 隊長の同スロット現装備より弱い（または同等で空でない）
 */
export function shouldAbsorbToSharedBox(item, playerEquipped, slotKey) {
  if (!item || item.type === 'ORB' || item.isOrb) return false;
  if (isGodRollProtected(item) || item.favorite) return false; // 異質/神鍛: keep personal inventory, never shared-box buyout
  if ((item.tier || 1) > SHARED_BOX_MAX_TIER) return false;
  if (!slotKey) return false;
  const current = playerEquipped?.[slotKey] || null;
  if (!current) return false; // 空きスロットなら隊長が取る（collectDrop側で即装備）
  const cmp = compareEquipment(item, current);
  return cmp.kind === 'worse' || cmp.kind === 'equal';
}

/** スカウト費用（才能・作戦期・レベル補正） */
export function calcScoutCost(phase, talentKey = 'AVERAGE', level = 1) {
  const p = Math.max(1, phase || 1);
  const table = SCOUT_COST_BY_TALENT[talentKey] || SCOUT_COST_BY_TALENT.AVERAGE;
  const lv = Math.max(1, level || 1);
  return Math.floor(table.base + p * table.perPhase + (lv - 1) * 25);
}

/** 既存兵士の想定スカウト額（放逐返還の基準） */
export function estimateSoldierScoutValue(soldier, phase) {
  if (!soldier) return calcScoutCost(phase, 'AVERAGE', 1);
  const talent = soldier.talent || 'AVERAGE';
  const level = soldier.level || 1;
  let cost = calcScoutCost(phase, talent, level);
  cost += (soldier.survivedDeathlines || 0) * 40;
  cost += (soldier.bossKills || 0) * 30;
  cost += Math.floor((soldier.survivedWaves || 0) * 8);
  if (soldier.isNamed) cost = Math.floor(cost * 1.25);
  // 装備スコアの一部を価値に加算
  const eq = soldier.equipped || {};
  let eqScore = 0;
  for (const it of Object.values(eq)) {
    if (it) eqScore += equipmentScore(it);
  }
  cost += Math.floor(eqScore / 80);
  return cost;
}

/** 放逐時返還（隊長へ）と国庫還流の内訳 */
export function calcDismissSettlement(soldier, phase) {
  const scoutVal = estimateSoldierScoutValue(soldier, phase);
  const refundToPlayer = Math.floor(scoutVal * DISMISS_SCOUT_REFUND_RATE);
  const goldReturn = Math.floor((soldier?.gold || 0) * DISMISS_GOLD_RETURN_RATE);
  let gearSell = 0;
  const gearToBox = [];
  const gearToPlayer = [];
  for (const it of Object.values(soldier?.equipped || {})) {
    if (!it) continue;
    // 異質/神鍛: never auto-sell or deposit to 国庫共有 — return to commander inventory
    if (isGodRollProtected(it)) {
      gearToPlayer.push(it);
      continue;
    }
    if ((it.tier || 1) <= SHARED_BOX_MAX_TIER) {
      gearToBox.push(it);
    } else {
      gearSell += saleValue(it);
    }
  }
  return {
    scoutVal,
    refundToPlayer,
    goldReturnToTreasury: goldReturn,
    gearSellToTreasury: gearSell,
    gearToBox,
    gearToPlayer
  };
}

/** 国家の財政報告（簡潔日本語） */
export function formatFiscalReportJa(ledger) {
  if (!ledger) return '財政報告なし';
  const lines = [
    `📜【国家の財政報告】第${ledger.phase}期`,
    `歳入 +${(ledger.income || 0).toLocaleString()}G`,
    `指揮手当 ${ (ledger.commanderStipend || 0).toLocaleString()}G`,
    `給与支払 −${(ledger.salariesPaid || 0).toLocaleString()}G（${ledger.salaryHeadcount || 0}名）${ledger.salaryShortfall ? ` / 不足${ledger.salaryShortfall.toLocaleString()}G` : ''}`,
    `寄付 ${(ledger.donations || 0).toLocaleString()}G → 全国配分 ${(ledger.distributed || 0).toLocaleString()}G（${ledger.distributeHeadcount || 0}名）`,
    `装備買取 −${(ledger.buyouts || 0).toLocaleString()}G（${ledger.buyoutCount || 0}件）`,
    `不足装備補給 −${((ledger.equipmentProcurement || 0)+(ledger.publicForging||0)).toLocaleString()}G（${ledger.equipmentIssued || 0}部位）`,
    `外販 +${(ledger.surplusSales || 0).toLocaleString()}G（${ledger.surplusCount || 0}件）`,
    `開発 −${(ledger.developmentSpent || 0).toLocaleString()}G`,
    `国庫残高 ${(ledger.startBalance || 0).toLocaleString()}G → ${(ledger.endBalance || 0).toLocaleString()}G`
  ];
  return lines.join(' · ');
}

export function formatFiscalReportHtml(ledger) {
  if(!ledger)return '<p>まだウェーブが完了していません。最初の収支は終了時に記録されます。</p>';
  const rows=[['定期歳入・発展税収',ledger.income,0],['寄付',ledger.donations,0],['装備の外販',ledger.surplusSales,0],['兵士資金の還流',ledger.treasuryReturns,0],['施設納税',ledger.facilityRevenue,0],['魔王軍撃退報奨',ledger.defenseRewards,0],['兵士給与',0,ledger.salariesPaid],['隊長の指揮手当',0,ledger.commanderStipend],['寄付から兵士へ配分',0,ledger.distributed],['装備の買取',0,ledger.buyouts],['軍備の調達・換装',0,ledger.equipmentProcurement],['公費の装備強化',0,ledger.publicForging],['製造技術の開発',0,ledger.armamentResearch],['本陣・町の開発',0,ledger.developmentSpent]];
  const receipts=rows.reduce((n,r)=>n+(r[1]||0),0),expenses=rows.reduce((n,r)=>n+(r[2]||0),0),balance=(ledger.endBalance||0)-(ledger.startBalance||0),calc=receipts-expenses;
  const f=n=>Math.floor(n||0).toLocaleString()+'G';
  return `<section class="fiscal-report-box"><h4>直近ウェーブの収支 · 第${ledger.phase}期</h4><div class="fiscal-net ${balance>=0?'positive':'negative'}">${balance>=0?'黒字 +':'赤字 '}${f(balance)}</div><div class="fiscal-table"><table><thead><tr><th>項目</th><th>収入</th><th>支出</th></tr></thead><tbody>${rows.map(r=>`<tr><th>${r[0]}</th><td>${r[1]?'+ '+f(r[1]):'—'}</td><td>${r[2]?'− '+f(r[2]):'—'}</td></tr>`).join('')}<tr class="fiscal-total"><th>合計</th><td>+ ${f(receipts)}</td><td>− ${f(expenses)}</td></tr></tbody></table></div><p>期首 ${f(ledger.startBalance)} → 期末 ${f(ledger.endBalance)}</p>${ledger.salaryShortfall?`<p class="negative">給与不足 ${f(ledger.salaryShortfall)}</p>`:''}${Math.abs(balance-calc)>1?'<p>旧版の記録は一部の取引内訳が不足しています。残高差を実際の収支として表示しています。</p>':''}</section>`;
}

/**
 * 共有ボックスから兵士へ自動装備（弱い余剰は呼び出し側で換金）
 * @returns {{ equippedCount: number, remaining: array }}
 */
const sharedScore=item=>item?equipmentScore({...item,tier:1,upgrade:0})-1000:0;
export const EQUIPMENT_SLOTS={WEAPON:'weapon',ARMOR:'armor',SHIELD:'shield',HELMET:'helmet',LEGS:'legs',GLOVES:'gloves',AMULET:'amulet'};

export function distributeSharedBoxToSoldiers(box, soldiers, recalcFn, valueFor=(unit,item)=>sharedScore(item)) {
  const held=new Set((soldiers||[]).flatMap(s=>Object.values(s?.equipped||{}).filter(Boolean).map(i=>i.id)));
  const remaining=[...new Map((box||[]).filter(i=>i&&!held.has(i.id)).map(i=>[i.id,i])).values()];let equippedCount=0;
  const alive=(soldiers||[]).filter(s=>s&&!s.dead),changed=new Set();
  for(const [type,key] of Object.entries(EQUIPMENT_SLOTS)){
    // Fill empty slots before upgrading existing equipment, including wounded soldiers.
    const recipients=[...alive].sort((a,b)=>Number(!!a.equipped?.[key])-Number(!!b.equipped?.[key])||valueFor(a,a.equipped?.[key],key)-valueFor(b,b.equipped?.[key],key));
    for(const soldier of recipients){soldier.equipped||={};
      const cur=soldier.equipped[key],score=cur?valueFor(soldier,cur,key):0;if(cur?.favorite||isGodRollProtected(cur))continue;
      const candidates=remaining.filter(i=>i.type===type&&!i.favorite&&!isGodRollProtected(i)&&Number.isFinite(valueFor(soldier,i,key))&&(!cur||valueFor(soldier,i,key)>score+1e-6)).sort((a,b)=>valueFor(soldier,b,key)-valueFor(soldier,a,key));
      const item=candidates[0];if(!item)continue;
      remaining.splice(remaining.indexOf(item),1);soldier.equipped[key]=item;if(key==='weapon')soldier.weapon=item;
      if(cur&&!remaining.some(i=>i.id===cur.id))remaining.push(cur);equippedCount++;changed.add(soldier);
    }
  }
  if(typeof recalcFn==='function')for(const soldier of changed)recalcFn(soldier);
  return {equippedCount,remaining};
}

/**
 * ボックス内の弱余剰を換金（国庫へ）
 * 生存兵・ダウン者・予備兵の誰にも不要な装備を外販（通常売値の1.6倍）
 */
export function sellWeakSurplusFromBox(box, soldiers, valueFor=(unit,item)=>sharedScore(item), stock={}) {
  const remaining=[];let soldGold=0,soldCount=0;
  const slots={WEAPON:'weapon',ARMOR:'armor',SHIELD:'shield',HELMET:'helmet',LEGS:'legs',GLOVES:'gloves',AMULET:'amulet'};
  const living=(soldiers||[]).filter(s=>s&&!s.dead),held=new Set(living.flatMap(s=>Object.values(s.equipped||{}).filter(Boolean).map(i=>i.id)));
  const stored={};
  for(const item of [...new Map((box||[]).filter(Boolean).map(i=>[i.id,i])).values()].sort((a,b)=>sharedScore(b)-sharedScore(a))){
    const key=slots[item.type];
    if(held.has(item.id))continue;
    if(!key||item.favorite||isGodRollProtected(item)||!living.length||living.some(s=>!s.equipped?.[key]||(!s.equipped[key].favorite&&!isGodRollProtected(s.equipped[key])&&valueFor(s,item,key)>valueFor(s,s.equipped[key],key)+1e-6))){remaining.push(item);continue;}
    if(stock.keep?.(item)&&(stored[key]||0)<(stock.perSlot||0)){remaining.push(item);stored[key]=(stored[key]||0)+1;continue;}
    soldGold+=Math.floor(saleValue(item)*1.6);soldCount++;
  }
  return {remaining,soldGold,soldCount};
}

/** 国庫寄付の既定額：所持軍資金に応じてスケール（早期は少額） */
export function defaultDonateAmount(gold) {
  const g = Math.max(0, Math.floor(Number(gold) || 0));
  if (g <= 0) return 100;
  return Math.min(g, Math.max(100, Math.round(g * 0.1)));
}

/** 寄付UI用プリセット（所持金に応じた候補＋固定段階。max は呼び出し側で） */
export function donatePresetAmounts(gold) {
  const g = Math.max(0, Math.floor(Number(gold) || 0));
  const suggested = defaultDonateAmount(g);
  const fixed = [100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000];
  const scaled = [suggested, Math.round(g * 0.25), Math.round(g * 0.5), g].map(n => Math.max(100, Math.floor(n || 0)));
  const set = new Set();
  for (const n of [...scaled, ...fixed]) {
    if (!Number.isFinite(n) || n <= 0) continue;
    set.add(n);
  }
  return [...set].sort((a, b) => a - b);
}

