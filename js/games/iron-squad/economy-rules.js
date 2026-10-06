/**
 * IRON SQUAD economy / roster reform (v1.23.0)
 * 国庫・共有装備ボックス・スカウト費用・財政報告の公式を集約
 */

import { saleValue, compareEquipment, equipmentScore } from './equipment-rules.js';

/** 作戦期ごとの国庫歳入（徴税・兵站） */
export const TREASURY_INCOME_BASE = 80;
export const TREASURY_INCOME_PER_PHASE = 18;
export const TREASURY_INCOME_PER_SOLDIER = 8;

/** 隊長への指揮手当（歳入から先に支払い） */
export const COMMANDER_STIPEND_BASE = 40;
export const COMMANDER_STIPEND_PER_PHASE = 6;

/** 共有ボックスへ自動吸収する装備の上限 Tier */
export const SHARED_BOX_MAX_TIER = 3;

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
    surplusSales: 0,
    surplusCount: 0,
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
  return Math.floor(TREASURY_INCOME_BASE + p * TREASURY_INCOME_PER_PHASE + n * TREASURY_INCOME_PER_SOLDIER);
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
  for (const it of Object.values(soldier?.equipped || {})) {
    if (!it) continue;
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
    gearToBox
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
    `余剰換金 +${(ledger.surplusSales || 0).toLocaleString()}G（${ledger.surplusCount || 0}件）`,
    `国庫残高 ${(ledger.startBalance || 0).toLocaleString()}G → ${(ledger.endBalance || 0).toLocaleString()}G`
  ];
  return lines.join(' · ');
}

export function formatFiscalReportHtml(ledger) {
  if (!ledger) return '';
  const short = ledger.salaryShortfall
    ? ` <span style="color:#f59e0b;">(不足 ${(ledger.salaryShortfall || 0).toLocaleString()}G)</span>`
    : '';
  return `
    <div class="fiscal-report-box" style="background:linear-gradient(135deg,rgba(14,116,144,0.22),rgba(15,23,42,0.95));border:1px solid #0e7490;border-radius:8px;padding:8px 10px;margin-bottom:8px;font-size:11px;line-height:1.55;color:#cbd5e1;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
        <strong style="color:#67e8f9;font-size:12px;">📜 国家の財政報告 · 第${ledger.phase}期</strong>
        <span style="color:#fde047;font-weight:bold;">国庫 ${(ledger.endBalance || 0).toLocaleString()}G</span>
      </div>
      <div>歳入 <strong style="color:#86efac;">+${(ledger.income || 0).toLocaleString()}G</strong>
        · 指揮手当 <strong style="color:#fde047;">${(ledger.commanderStipend || 0).toLocaleString()}G</strong></div>
      <div>給与 <strong style="color:#fca5a5;">−${(ledger.salariesPaid || 0).toLocaleString()}G</strong>（${ledger.salaryHeadcount || 0}名）${short}</div>
      <div>寄付 ${(ledger.donations || 0).toLocaleString()}G → 全国配分 ${(ledger.distributed || 0).toLocaleString()}G（${ledger.distributeHeadcount || 0}名）</div>
      <div>装備買取 −${(ledger.buyouts || 0).toLocaleString()}G（${ledger.buyoutCount || 0}件）
        · 余剰換金 <strong style="color:#86efac;">+${(ledger.surplusSales || 0).toLocaleString()}G</strong>（${ledger.surplusCount || 0}件）</div>
      <div style="color:#94a3b8;margin-top:2px;">期首 ${(ledger.startBalance || 0).toLocaleString()}G → 期末 <strong style="color:#67e8f9;">${(ledger.endBalance || 0).toLocaleString()}G</strong></div>
    </div>
  `;
}

/**
 * 共有ボックスから兵士へ自動装備（弱い余剰は呼び出し側で換金）
 * @returns {{ equippedCount: number, remaining: array }}
 */
export function distributeSharedBoxToSoldiers(box, soldiers, recalcFn) {
  const remaining = [...(box || [])];
  let equippedCount = 0;
  const slotKeys = ['weapon', 'armor', 'shield', 'helmet', 'legs', 'gloves', 'amulet'];
  const typeToKey = {
    WEAPON: 'weapon', SHIELD: 'shield', HELMET: 'helmet', ARMOR: 'armor',
    GLOVES: 'gloves', LEGS: 'legs', AMULET: 'amulet'
  };

  const alive = (soldiers || []).filter(s => s && !s.dead && !s.isDown);
  // 装備スコアが低い兵士から優先
  alive.sort((a, b) => {
    const sa = slotKeys.reduce((sum, k) => sum + equipmentScore(a.equipped?.[k]), 0);
    const sb = slotKeys.reduce((sum, k) => sum + equipmentScore(b.equipped?.[k]), 0);
    return sa - sb;
  });

  for (const soldier of alive) {
    if (!soldier.equipped) soldier.equipped = {};
    for (let i = remaining.length - 1; i >= 0; i--) {
      const item = remaining[i];
      const key = typeToKey[item?.type];
      if (!key) continue;
      const cur = soldier.equipped[key];
      const fav = soldier.favoriteWeapon || 'sword';
      // 簡易: equipmentScore のみ（好み補正は呼び出し側でも可）
      const curScore = cur ? equipmentScore(cur) : 0;
      const newScore = equipmentScore(item);
      if (!cur || newScore > curScore + 5) {
        soldier.equipped[key] = item;
        if (key === 'weapon') soldier.weapon = item;
        remaining.splice(i, 1);
        equippedCount++;
        if (typeof recalcFn === 'function') recalcFn(soldier);
      }
    }
  }
  return { equippedCount, remaining };
}

/**
 * ボックス内の弱余剰を換金（国庫へ）
 * maxTier 以下かつ誰の現装備より明らかに弱い同等スロット品を売却
 */
export function sellWeakSurplusFromBox(box, soldiers, maxTier = 2) {
  const remaining = [];
  let soldGold = 0;
  let soldCount = 0;
  const typeToKey = {
    WEAPON: 'weapon', SHIELD: 'shield', HELMET: 'helmet', ARMOR: 'armor',
    GLOVES: 'gloves', LEGS: 'legs', AMULET: 'amulet'
  };
  const bestBySlot = {};
  for (const s of soldiers || []) {
    if (!s || s.dead) continue;
    for (const [type, key] of Object.entries(typeToKey)) {
      const it = s.equipped?.[key];
      if (!it) continue;
      const sc = equipmentScore(it);
      if (!bestBySlot[type] || sc > bestBySlot[type]) bestBySlot[type] = sc;
    }
  }

  for (const item of box || []) {
    if (!item) continue;
    const tier = item.tier || 1;
    const sc = equipmentScore(item);
    const best = bestBySlot[item.type] || 0;
    if (tier <= maxTier && sc + 40 < best) {
      soldGold += saleValue(item);
      soldCount++;
    } else {
      remaining.push(item);
    }
  }
  return { remaining, soldGold, soldCount };
}
