// 資源は元の荷と同じ出所ロットで管理し、店の在庫にも印を残す。
import { distBetween, isHostile, makeEvent } from './data.js';
import { TRADE_REACH } from './medkit.js';
import { shopClosed } from './town.js';
import { GOODS, MARKETS, ensureTrade, prices, partyMoney, spendPartyMoney } from './trade.js';
import { activeStolenLots, addStolenLot, consumeStolenLot } from './stolen_goods.js';
import { reportStolenTrade } from './gear_trade.js';

export function canTradeBlackmarket(state, actor, merchant) {
  const standing = a => a && !['dead','down','getup'].includes(a.state) && !a.bound && a.carriedBy == null && !a.resting;
  return !!state && !!merchant?.blackmarket && actor?.faction === 'player' &&
    state.actors?.includes(actor) && state.actors?.includes(merchant) && standing(actor) && standing(merchant) &&
    !shopClosed(state) && !merchant.foughtPlayer && !isHostile(state, actor, merchant) &&
    !!MARKETS[merchant.townId] && distBetween(actor,merchant) <= TRADE_REACH;
}

export function blackmarketPrices(state, merchant, good) {
  if (!GOODS[good] || !MARKETS[merchant?.townId]) return { buy:0, sell:0 };
  const p = prices(state, merchant.townId, good);
  return { buy:Math.max(1,Math.round(p.buy*1.5)), sell:Math.max(1,Math.round(p.sell*0.9)) };
}

export function sellBlackmarketGood(state, actor, merchant, good, events) {
  if (!canTradeBlackmarket(state,actor,merchant) || !GOODS[good]) return false;
  const trade = ensureTrade(state), cargo = trade.cargo[good];
  const lot = activeStolenLots(cargo,state.timeSec)[0];
  const price = blackmarketPrices(state,merchant,good).sell;
  if (!cargo || cargo.n < 1 || !lot || (Number(merchant.money)||0) < price) return false;
  merchant.blackmarketCargo ||= {};
  const stock = merchant.blackmarketCargo[good] ||= { n:0, stolenLots:[] };
  stock.stolenLots = activeStolenLots(stock,state.timeSec);
  addStolenLot(stock,lot,1); stock.n += 1;
  consumeStolenLot(cargo,lot,1); cargo.n -= 1;
  if (cargo.n <= 0) delete trade.cargo[good];
  merchant.money -= price; actor.money = (actor.money||0) + price;
  events?.push(makeEvent(state,'shop',`${GOODS[good].name}（盗品）を${price} キャッシュで売った`));
  reportStolenTrade(state,actor,merchant,events);
  return true;
}

export function buyBlackmarketGood(state, actor, merchant, good, events) {
  if (!canTradeBlackmarket(state,actor,merchant) || !GOODS[good]) return false;
  const stock = merchant.blackmarketCargo?.[good], price = blackmarketPrices(state,merchant,good).buy;
  if (!stock || stock.n < 1 || partyMoney(state) < price) return false;
  stock.stolenLots = activeStolenLots(stock,state.timeSec);
  const lot = activeStolenLots(stock,state.timeSec)[0];
  if (!spendPartyMoney(state,price)) return false;
  const trade = ensureTrade(state), cargo = trade.cargo[good] ||= { n:0, cost:0 };
  cargo.cost = ((Number(cargo.cost)||0)*cargo.n + price)/(cargo.n+1);
  cargo.n += 1;
  if (lot) { addStolenLot(cargo,lot,1); consumeStolenLot(stock,lot,1); }
  stock.n -= 1; if (stock.n <= 0) delete merchant.blackmarketCargo[good];
  merchant.money = (merchant.money||0)+price;
  events?.push(makeEvent(state,'shop',`${GOODS[good].name}${lot?'（盗品）':''}を${price} キャッシュで買った`));
  if (lot) reportStolenTrade(state,actor,merchant,events);
  return true;
}
