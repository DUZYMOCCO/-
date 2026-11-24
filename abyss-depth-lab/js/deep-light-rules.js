/**
 * ABYSS DIVE — 「光を当てて初めて見える」代表の深い区間の純粋ルール。
 *
 * 通常海域（浅い）は原則これまでどおり。深い区間だけ、弱い光（薄いシルエット）を残し、
 * 艇灯／照明弾が実際に当たった側だけディテール（肉・腕）を読ませる。
 * 予告（砲口のチャージ）と通路の縁は消さない。
 *
 * 描画＝Canvas2D のマスク（低コスト）は game.js 側。ここは区間の判定と明るさだけ。
 */

import { FLARE } from './flare-rules.js';

export const LIT_WATCH = {
  MIN_Y: 1750,          // これより深い（y が大きい）区間を対象にする（漸深層〜超深海）
  SILHOUETTE_ALPHA: 0.22, // ライト外の「薄いシルエット」の濃度（消さずに残す）
  DETAIL_ALPHA: 1,        // ライトが当たった側のディテールの上限
  GAIN: 1.35,             // 当たった側を読ませるためのわずかな持ち上げ（一律の全体発光ではない）
};

/** 深い区間か（通常海域＝浅い側は false＝対象外）。 */
export function inLitWatch(y) {
  return y >= LIT_WATCH.MIN_Y;
}

/** 照明弾の光が点 (x,y) に届くか（照らす半径内か）。 */
export function flareCovers(f, x, y) {
  const dx = x - f.x, dy = y - f.y;
  return dx * dx + dy * dy <= FLARE.LIGHT_R * FLARE.LIGHT_R;
}
