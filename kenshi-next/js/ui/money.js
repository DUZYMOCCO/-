// 所持金の表示（21:0x 通貨の名前は cash に決定）。DOM を使わないので node のテストで読める。
export const CURRENCY = 'cash';
export function formatMoney(amount) {
  const n = Number(amount);
  return CURRENCY + ' ' + (Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0);
}
