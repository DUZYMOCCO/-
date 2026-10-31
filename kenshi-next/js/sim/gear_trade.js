import { ITEMS } from './items.js';
import { distBetween, isHostile } from './data.js';
import { TRADE_REACH } from './medkit.js';
import { shopClosed } from './town.js';
export function canBuyGear(state, buyer, merchant) {
  const obj=merchant?.gearStock?.[0], def=ITEMS[obj?.id];
  const standing = a => a && !['dead','down','getup'].includes(a.state) && !a.bound && a.carriedBy == null;
  return !!def && standing(buyer) && standing(merchant) && (merchant.role === 'merchant' || merchant.job === 'shopkeeper' && !shopClosed(state)) && !merchant.foughtPlayer && !isHostile(state,buyer,merchant) && distBetween(buyer,merchant)<=TRADE_REACH && state.actors.filter(a=>a.faction==='player' && a.state!=='dead').reduce((n,a)=>n+(a.money||0),0)>=def.value;
}
export function buyGear(state,buyer,merchant) {
  if (!canBuyGear(state,buyer,merchant)) return false;
  const obj=merchant.gearStock.shift(), price=ITEMS[obj.id].value;
  let left=price;
  for (const payer of [buyer,...state.actors.filter(a=>a!==buyer && a.faction==='player' && a.state!=='dead')]) { const take=Math.min(left,payer.money||0); payer.money-=take; left-=take; if(!left) break; }
  merchant.money=(merchant.money||0)+price; (buyer.inv ||= []).push(obj); return true;
}
