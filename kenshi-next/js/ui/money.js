// 所持金の表示（21:0x 通貨の名前は cash → trade1 で 錆貨）。DOM を使わないので node のテストで読める。
export const CURRENCY = '錆貨'; // trade1: Kenshi の cats と別の名前（research/trade_economy.md）
export function formatMoney(amount) {
  const n = Number(amount);
  return CURRENCY + ' ' + (Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0);
}
