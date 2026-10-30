// 手当ての道具（救急箱）。数は「残りの使える回数」で持つ。1箱 = MEDKIT_USES 回。
// 商人が売り（1隊に数箱）、護衛や頭目も持っている。手当て1回で1つ減る。
import { makeEvent, distBetween, isHostile } from './data.js';

export const MEDKIT_USES = 5; // ★1箱で手当て5回
export const MEDKIT_PRICE = 80; // ★1箱 cash 80
export const MERCHANT_STOCK = 3; // ★商人が売る箱の数
export const TRADE_REACH = 6; // m（隊商は歩き続けるので少し広め）

function standingOk(a) {
  return !!a && a.state !== 'dead' && a.state !== 'down' && a.state !== 'getup' && !a.bound;
}

// 手当てに使う道具を誰が出すか: 本人、無ければ同じ部隊の立っている者（手渡しとみなす）
export function kitHolder(state, actor) {
  if (!actor) return null;
  if ((actor.medkit || 0) > 0) return actor;
  if (actor.faction !== 'player') return null;
  for (const a of state.actors) {
    if (a !== actor && a.faction === 'player' && standingOk(a) && (a.medkit || 0) > 0) return a;
  }
  return null;
}

export function partyKits(state) {
  let n = 0;
  for (const a of state.actors) if (a.faction === 'player' && a.state !== 'dead') n += a.medkit || 0;
  return n;
}

export function useKit(state, actor) {
  const h = kitHolder(state, actor);
  if (!h) return false;
  h.medkit -= 1;
  return true;
}

export function canBuyKit(state, buyer, merchant) {
  if (!standingOk(buyer) || !standingOk(merchant)) return false;
  if (merchant.role !== 'merchant' || !((merchant.medkitStock || 0) > 0)) return false;
  if (isHostile(state, buyer.faction, merchant.faction) || merchant.foughtPlayer) return false;
  if (distBetween(buyer, merchant) > TRADE_REACH) return false;
  return partyMoney(state) >= MEDKIT_PRICE;
}

function partyMoney(state) {
  let n = 0;
  for (const a of state.actors) if (a.faction === 'player' && a.state !== 'dead') n += a.money || 0;
  return n;
}

export function buyKit(state, buyer, merchant, events) {
  if (!canBuyKit(state, buyer, merchant)) return false;
  let left = MEDKIT_PRICE;
  const payers = [buyer, ...state.actors.filter((a) => a !== buyer && a.faction === 'player' && a.state !== 'dead')];
  for (const p of payers) {
    const take = Math.min(left, p.money || 0);
    p.money -= take;
    left -= take;
    if (left <= 0) break;
  }
  merchant.money = (merchant.money || 0) + MEDKIT_PRICE;
  merchant.medkitStock -= 1;
  buyer.medkit = (buyer.medkit || 0) + MEDKIT_USES;
  if (events) events.push(makeEvent(state, 'trade', buyer.name + 'が' + merchant.name + 'から手当ての道具を買った（cash ' + MEDKIT_PRICE + '）'));
  return true;
}
