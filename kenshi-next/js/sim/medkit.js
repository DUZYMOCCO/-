// 救急箱（耐久で減る）と手当ての速さ。Kenshi の数式に合わせる（research/health_spec.md §6）。
//   実効の腕 s = min(手当ての腕, 箱の質)。治す速さ/秒 = 3 × (1 + 14 × s/100)
//   血止め/秒 = 3 × 2 × (0.0005 + 0.0295 × s/100)（Kenshi の「傷1つ」あたり。この世界の出血の桁へは ×BLEED_UNIT）
//   箱の減り/秒 = 2.0 + (0.1 − 2.0) × 腕/100（腕は箱の質で頭打ちにしない。治した量には関係ない）
//   箱が無くても手当てはできる（治す速さは 1/秒 固定、血止めは腕5相当）
// 道具は本人の分、無ければ同じ部隊の立っている者の分（手渡し）。箱は残りの少ない物から使う。
import { actorOwner, factionName } from './faction_relations.js';
import { makeEvent, distBetween, isHostile } from './data.js';

export const KIT_TIERS = {
  basic: { quality: 5, dur: 150, price: 80, label: '簡易救急箱' },
  standard: { quality: 40, dur: 400, price: 150, label: '救急箱' },
  advanced: { quality: 100, dur: 1000, price: 265, label: '上等な救急箱' },
};
export const MEDKIT_PRICE = KIT_TIERS.basic.price; // 一番安い箱の値（前の名前を残す）
export const MERCHANT_STOCK = 3; // ★商人が売る簡易救急箱の数
export const MERCHANT_STOCK_STANDARD = 1; // ★商人が売る救急箱（質40）の数
export const TRADE_REACH = 6; // m（隊商は歩き続けるので少し広め）
export const BLEED_UNIT = 30; // この世界の出血 = ダメージ×0.03、Kenshi の傷 = 切り×0.001 なので 30倍
export const GUSH_UNIT = 5; // 手足を失った大出血1 = Kenshi のちぎれた傷 0.2 の 5倍
export const MEDIC_XP_PER_SEC = 0.02; // ★手当てしている1秒ごとの腕の伸び（腕が高いほど伸びにくい）

export function makeKit(tier = 'basic') {
  const t = KIT_TIERS[tier] || KIT_TIERS.basic;
  return { tier: KIT_TIERS[tier] ? tier : 'basic', dur: t.dur };
}

// 古いセーブ（medkit = 残り回数。1箱5回）を箱の並びに直す
export function normalizeKits(actor) {
  if (!actor) return [];
  if (!Array.isArray(actor.kits)) {
    const n = typeof actor.medkit === 'number' && Number.isFinite(actor.medkit) ? Math.max(0, actor.medkit) : 0;
    actor.kits = [];
    let left = n;
    while (left > 0) {
      const k = makeKit('basic');
      k.dur = KIT_TIERS.basic.dur * Math.min(5, left) / 5;
      actor.kits.push(k);
      left -= 5;
    }
  }
  actor.kits = actor.kits.filter((k) => k && KIT_TIERS[k.tier] && k.dur > 0);
  delete actor.medkit;
  return actor.kits;
}

function kitsOf(actor) {
  return Array.isArray(actor.kits) ? actor.kits : normalizeKits(actor);
}

function hasKit(actor) {
  return kitsOf(actor).some((k) => k.dur > 0);
}

function standingOk(a) {
  return !!a && a.state !== 'dead' && a.state !== 'down' && a.state !== 'getup' && !a.bound;
}

// 手当てに使う道具を誰が出すか: 本人、無ければ同じ部隊の立っている者（手渡しとみなす）
export function kitHolder(state, actor) {
  if (!actor) return null;
  if (hasKit(actor)) return actor;
  if (actor.faction !== 'player') return null;
  for (const a of state.actors) {
    if (a !== actor && a.faction === 'player' && standingOk(a) && hasKit(a)) return a;
  }
  return null;
}

// 使う箱: 残りの少ない物から（kenshi.zone/en/medical）
export function pickKit(holder) {
  if (!holder) return null;
  let best = null;
  for (const k of kitsOf(holder)) if (k.dur > 0 && (!best || k.dur < best.dur)) best = k;
  return best;
}

export function partyKits(state) {
  let n = 0;
  for (const a of state.actors) if (a.faction === 'player' && a.state !== 'dead') n += kitsOf(a).length;
  return n;
}

// 部隊の箱の残り（耐久の合計と満タンの合計）
export function partyKitDur(state) {
  let dur = 0;
  let full = 0;
  for (const a of state.actors) {
    if (a.faction !== 'player' || a.state === 'dead') continue;
    for (const k of kitsOf(a)) {
      dur += k.dur;
      full += KIT_TIERS[k.tier].dur;
    }
  }
  return { dur, full };
}

// 手当ての腕（頭の傷で下がる: 頭の残りの割合、下限0.4。全体の下限0.25）
export function medicSkill(actor) {
  const raw = actor && actor.skills && typeof actor.skills.medic === 'number' ? actor.skills.medic : 1;
  const head = actor && actor.parts && actor.parts.head;
  const ratio = head && head.max > 0 ? Math.max(0.4, Math.min(1, head.hp / head.max)) : 1;
  return Math.max(raw * 0.25, raw * ratio);
}

export function effectiveSkill(skill, kit) {
  if (!kit) return 5;
  return Math.min(skill, KIT_TIERS[kit.tier].quality);
}
export function healPerSec(skill, kit) {
  if (!kit) return 1;
  return 3 * (1 + 14 * effectiveSkill(skill, kit) / 100);
}
export function bleedStopPerSec(skill, kit) {
  const s = effectiveSkill(skill, kit);
  return 3 * 2 * (0.0005 + 0.0295 * s / 100);
}
export function kitDrainPerSec(skill) {
  const s = Math.max(0, Math.min(100, skill));
  return 2.0 + (0.1 - 2.0) * s / 100;
}

// 1刻ぶん箱を減らす。尽きたら外して true
export function drainKit(holder, kit, amount) {
  if (!holder || !kit) return false;
  kit.dur -= amount;
  if (kit.dur > 0) return false;
  holder.kits = kitsOf(holder).filter((k) => k !== kit);
  return true;
}

export function giveKit(actor, tier = 'basic') {
  kitsOf(actor).push(makeKit(tier));
}

function stockKey(tier) {
  return tier === 'standard' ? 'medkitStockStd' : 'medkitStock';
}

export function canBuyKit(state, buyer, merchant, tier = 'basic') {
  if (!standingOk(buyer) || !standingOk(merchant)) return false;
  if (merchant.role !== 'merchant' || !((merchant[stockKey(tier)] || 0) > 0)) return false;
  if (isHostile(state, buyer, merchant) || merchant.foughtPlayer) return false;
  if (distBetween(buyer, merchant) > TRADE_REACH) return false;
  return partyMoney(state) >= KIT_TIERS[tier].price;
}

function partyMoney(state) {
  let n = 0;
  for (const a of state.actors) if (a.faction === 'player' && a.state !== 'dead') n += a.money || 0;
  return n;
}

export function buyKit(state, buyer, merchant, events, tier = 'basic') {
  if (!KIT_TIERS[tier]) tier = 'basic';
  if (!canBuyKit(state, buyer, merchant, tier)) return false;
  const price = KIT_TIERS[tier].price;
  let left = price;
  const payers = [buyer, ...state.actors.filter((a) => a !== buyer && a.faction === 'player' && a.state !== 'dead')];
  for (const p of payers) {
    const take = Math.min(left, p.money || 0);
    p.money -= take;
    left -= take;
    if (left <= 0) break;
  }
  merchant.money = (merchant.money || 0) + price;
  merchant[stockKey(tier)] -= 1;
  giveKit(buyer, tier);
  if (events) events.push(makeEvent(state, 'trade', buyer.name + 'が' + merchant.name + 'から' + KIT_TIERS[tier].label + 'を買った（キャッシュ ' + price + '）'));
  return true;
}

// ── 手当てで仲が良くなる（Kenshi: 倒れている相手を手当てしている間、1秒ごとに +0.15 × 重み。手当てでは +5 まで）
export const HEAL_REP_PER_SEC = 0.15;
export const HEAL_REP_CAP = 5;
export const HOSTILE_REP = -30; // これより下は見たら襲う
export const GUARD_ATTACKED_REP = -40; // ★衛兵に手を出した時の仲（Kenshi は殴打・気絶・殺しで下がる。この世界では一度に）
const NOT_REAL = new Set(['beast', 'player']);
// ★重み: 頭目・商人は 10、ほかは 1（Kenshi は人ごとに 0〜100、町の外では ×0.025。この世界は場所を見ない）
export function factionImportance(actor) {
  const r = actor && actor.role;
  if (r === 'raider_boss' || r === 'cannibal_chief' || r === 'merchant') return 10;
  return 1;
}

export function repOf(state, faction) {
  if (!state.rep || typeof state.rep !== 'object') state.rep = {};
  if (typeof state.rep[faction] !== 'number') state.rep[faction] = 0;
  return state.rep[faction];
}

// 手当て1刻ぶんの仲の上がり。上がった量を返す
export function healRep(state, medic, patient, dtSec, events) {
  if (!medic || medic.faction !== 'player' || !patient) return 0;
  const f = patient.faction === 'guard' ? actorOwner(patient) : patient.faction;
  if (!f || NOT_REAL.has(f) || patient.machine) return 0;
  if (patient.state !== 'down') return 0; // Kenshi: 倒れて（気を失って）いる相手だけ
  const cur = repOf(state, f);
  if (cur >= HEAL_REP_CAP) return 0;
  const next = Math.min(HEAL_REP_CAP, cur + HEAL_REP_PER_SEC * factionImportance(patient) * dtSec);
  state.rep[f] = next;
  if (state.factionHostile?.[f] && next >= HOSTILE_REP) {
    delete state.factionHostile[f];
    if (events) events.push(makeEvent(state, 'hostile', factionName(f) + 'の敵意が解けた（手当てのおかげ）'));
  }
  return next - cur;
}
