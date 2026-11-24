/**
 * ABYSS DIVE — 潜航カメラの「見た目の縮尺（ズーム）」の純粋ルール。
 *
 * これは **描画だけ** の縮尺。シミュレーション（カメラ camX/camY・敵AI・生成・
 * 交戦・武器の射程/ダメージ/当たり）には一切触れない。描画側（game.js）が
 * ここで決めた倍率をワールド描画の投影にだけ掛ける。
 *
 * 既存は等倍（1.0）を初期値にする。控えめに引く（1.0 → 0.8 → 0.65）＝
 * 狭い横持ちでも操作を奪わず、地形を見渡せる。等倍へ滑らかに戻れる。
 */

/** 選べる縮尺（大きいほど寄り＝1.0 が等倍）。狭幅で自然な控えめの 3 段。 */
export const ZOOM_LEVELS = Object.freeze([1.0, 0.8, 0.65]);

/** 最短の縮尺（一番引いた状態）。 */
export const ZOOM_MIN = 1.0;                 // 等倍より寄せない（既存を初期値に）
export const ZOOM_MAX = 0.65;                // ここまで引く
export const ZOOM_RATE = 7.0;                // 1 秒あたりの収束（指数）。滑らかな引き/寄り
export const ZOOM_MAX_DELTA = 0.9;           // 1 フレームで動かす最大量（大 dt でも飛ばない）

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/** 倍率を [ZOOM_MAX, ZOOM_MIN]（=0.65..1.0）へ収める。 */
export function clampZoom(z){
  const v = Number(z);
  return clamp(Number.isFinite(v) ? v : 1.0, ZOOM_MAX, ZOOM_MIN);
}

/** 現在の倍率に最も近い段（levels 内）。 */
export function nearestLevel(z, levels){
  const lv = levels || ZOOM_LEVELS;
  let best = lv[0], bd = Infinity;
  for (const l of lv){ const d = Math.abs(l - clampZoom(z)); if (d < bd){ bd = d; best = l; } }
  return best;
}

/**
 * 縮尺切替ボタンの次の目標。1.0 → 0.8 → 0.65 → 1.0 … と巡回する。
 * 現在値が段の中間（ピンチ後）でも、最も近い段の次へ進む。
 */
export function cycleZoom(current, levels){
  const lv = levels || ZOOM_LEVELS;
  const idx = lv.indexOf(nearestLevel(current, lv));
  return lv[(idx + 1) % lv.length];
}

/** ピンチ等の連続入力。delta>0 で引く（倍率を下げる）。段にはスナップしない。 */
export function nudgeZoom(current, delta){
  return clampZoom(clampZoom(current) - delta);
}

/**
 * 目標へ滑らかに寄せる（1 フレーム）。指数収束＋最大変化量クランプ。
 * 等倍（1.0）への復帰も同じ式で自然に戻る。
 */
export function zoomStep(current, target, dt, rate){
  const c = clampZoom(current);
  const t = clampZoom(target);
  const k = Number.isFinite(rate) ? rate : ZOOM_RATE;
  const d = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  let next = c + (t - c) * (1 - Math.exp(-k * d));
  if (Math.abs(next - c) > ZOOM_MAX_DELTA) next = c + Math.sign(next - c) * ZOOM_MAX_DELTA;
  return clampZoom(next);
}

/** 等倍からの見え方の比（描画倍率の基準）。1.0 で等倍。 */
export function zoomFactor(z){ return clampZoom(z); }

/** 画面倍率 z のとき、ある画面アンカー c を中心に、画面幅 VW が映す世界幅。 */
export function visibleWorldWidth(z, VW){ return VW / clampZoom(z); }
