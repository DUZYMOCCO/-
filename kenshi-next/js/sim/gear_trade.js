import { ITEMS, qualityOf } from './items.js';
import { distBetween, isHostile, makeEvent } from './data.js';
import { TRADE_REACH } from './medkit.js';
import { shopClosed } from './town.js';
import { canonicalFaction } from './faction_relations.js';
import { activeStolenMark, sameStolenFaction, sameStolenFactionId, STOLEN_GOODS_BUYBACK } from './stolen_goods.js';
import { startCrime, witness } from './law.js';
import { canSee } from './stealth.js';
export function gearBuyPrice(merchant, item) { return Math.round((ITEMS[item?.id]?.value || 0) * qualityOf(item?.rank || 1).value * (merchant?.blackmarket ? 1.5 : 1)); }
export function reportStolenTrade(state, actor, merchant, events) {
  if (!merchant.blackmarket) return;
  const guard = (state.actors || []).find(g => g.faction === 'guard' && !g.civil && !['dead','down','getup'].includes(g.state) && !g.resting && !g.jail && Math.hypot(g.x-actor.x,g.z-actor.z) <= 30 && canSee(state,g,actor));
  if (guard) { startCrime(state, actor, 'theft'); witness(state, actor, guard, events); }
}
export function canBuyGear(state, buyer, merchant) {
  const obj=merchant?.gearStock?.[0], def=ITEMS[obj?.id];
  const standing = a => a && !['dead','down','getup'].includes(a.state) && !a.bound && a.carriedBy == null;
  return !!def && standing(buyer) && standing(merchant) && (merchant.role === 'merchant' || merchant.job === 'shopkeeper' && !shopClosed(state)) && !merchant.foughtPlayer && !isHostile(state,buyer,merchant) && distBetween(buyer,merchant)<=TRADE_REACH && state.actors.filter(a=>a.faction==='player' && a.state!=='dead').reduce((n,a)=>n+(a.money||0),0)>=gearBuyPrice(merchant,obj);
}
export function buyGear(state,buyer,merchant,events) {
  if (!canBuyGear(state,buyer,merchant)) return false;
  const obj=merchant.gearStock.shift(), price=gearBuyPrice(merchant,obj);
  let left=price;
  for (const payer of [buyer,...state.actors.filter(a=>a!==buyer && a.faction==='player' && a.state!=='dead')]) { const take=Math.min(left,payer.money||0); payer.money-=take; left-=take; if(!left) break; }
  merchant.money=(merchant.money||0)+price; (buyer.inv ||= []).push(obj); if (activeStolenMark(obj.stolen,state.timeSec)) reportStolenTrade(state,buyer,merchant,events); return true;
}

function merchantFaction(merchant) {
  return canonicalFaction(merchant?.ownerFaction || merchant?.faction);
}

function refusesStolen(state, merchant, mark) {
  if (merchant?.blackmarket) return false;
  return merchant?.townId
    ? sameStolenFaction(state, mark, merchant.townId)
    : sameStolenFactionId(state, mark, merchantFaction(merchant));
}

export function sellGearPrice(state, seller, merchant, item) {
  const def = ITEMS[item?.id];
  if (!def) return 0;
  const mark = activeStolenMark(item.stolen, state?.timeSec);
  if (mark && refusesStolen(state, merchant, mark)) return 0;
  const value = Math.round(gearBuyPrice(merchant, item) * 0.3);
  return Math.max(1, Math.round(value * (mark ? (merchant.blackmarket ? 0.9 : STOLEN_GOODS_BUYBACK) : 1)));
}

export function canSellGear(state, seller, merchant, invIndex) {
  const item = seller?.inv?.[invIndex];
  const def = ITEMS[item?.id];
  const standing = (actor) => actor && !['dead', 'down', 'getup'].includes(actor.state) && !actor.bound && actor.carriedBy == null;
  return !!def && standing(seller) && seller.faction === 'player' && standing(merchant) &&
    (merchant.role === 'merchant' || merchant.job === 'shopkeeper' && !shopClosed(state)) &&
    !merchant.foughtPlayer && !isHostile(state, seller, merchant) && distBetween(seller, merchant) <= TRADE_REACH &&
    (Number(merchant.money) || 0) >= 1;
}

export function sellGear(state, seller, merchant, invIndex, events) {
  const item = seller?.inv?.[invIndex];
  if (!canSellGear(state, seller, merchant, invIndex)) return false;
  const mark = activeStolenMark(item.stolen, state.timeSec);
  if (mark && refusesStolen(state, merchant, mark)) {
    events?.push(makeEvent(state, 'shop', '同じ勢力の店は盗品を買い取りません'));
    return false;
  }
  const price = sellGearPrice(state, seller, merchant, item);
  if ((Number(merchant.money) || 0) < price) {
    events?.push(makeEvent(state, 'shop', '店には買い取るキャッシュがありません'));
    return false;
  }
  const sold = { ...item, n: 1 };
  delete sold.grid;
  if (!mark) delete sold.stolen;
  item.n = Math.max(1, Number(item.n) || 1) - 1;
  if (item.n <= 0) seller.inv.splice(invIndex, 1);
  merchant.money -= price;
  seller.money = (seller.money || 0) + price;
  merchant.gearStock ||= [];
  merchant.gearStock.push(sold);
  const name = ITEMS[item.id]?.name || item.id;
  events?.push(makeEvent(state, 'shop', `${name}${mark ? '（盗品）' : ''}を${price} キャッシュで売った`));
  if (mark) reportStolenTrade(state, seller, merchant, events);
  return true;
}
