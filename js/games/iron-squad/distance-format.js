/** 内部座標の単位は cm（100単位 = 1m）。画面へ出す距離・速さ・武器寸法は必ずここで換算する。内部値・判定は変更しない。 */
export const UNITS_PER_METER = 100;
const fixed = (value, digits) => (Math.round((Number(value) || 0) / UNITS_PER_METER * 10 ** digits) / 10 ** digits).toFixed(digits);
/** 距離: 整数メートル（例 48000 -> "480m"）。 */
export const formatDistance = units => `${Math.round((Number(units) || 0) / UNITS_PER_METER).toLocaleString('en-US')}m`;
/** 速さ: 小数1桁 m/秒（整数だと個体差が潰れるため）。 */
export const formatSpeed = unitsPerSecond => `${fixed(unitsPerSecond, 1)}m/秒`;
/** 武器の長さ・攻撃幅: 小数2桁 m（整数だと0.8mと1.45mが区別できないため）。 */
export const formatLength = units => `${fixed(units, 2)}m`;
/** 武器寸法の差分: 符号付き小数2桁 m。 */
export const formatLengthDelta = units => { const v = Math.round((Number(units) || 0)) / UNITS_PER_METER; return `${v > 0 ? '+' : ''}${v.toFixed(2)}m`; };
