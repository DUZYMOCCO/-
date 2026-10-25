// 会話の立ち絵をどこに・どの大きさで出すか（DOM なし。テストから呼ぶ）。
// キャラごとの数字（切り抜き・目の位置・大きさ）は assets/portraits/portraits.json。ここは画面全体の決まりだけ。
// 決まり（PORTRAIT_PLAN.md 3章）: 文字の枠は下に画面の高さの約22%。立ち絵（原本のキャンバス全体）の高さは画面の約48%。
//   2人の目の高さをそろえる。下の端は文字の枠の後ろに隠す。胸像の下の切れ目が枠より上に出てしまうときは、下をぼかして消す。

export const DIALOG_LAYOUT = Object.freeze({
  boxH: 0.22,        // 文字の枠の高さ（画面の高さに対して）
  portraitH: 0.48,   // 立ち絵（原本のキャンバス全体を scale 1 で出したとき）の高さ（画面の高さに対して）
  eyeLine: 0.5,      // 目の高さ（画面の上から。画面の高さに対して）
  faceGap: 0.24,     // 顔の中心と画面のまん中の間（画面の幅に対して）
  faceGapMaxH: 0.42, // 横に広い画面では、立ち絵の高さに対してこれより離さない（2人が遠くなりすぎないように）
  fadeLen: 0.1,      // 切れ目を消すぼかしの長さ（立ち絵の高さに対して）
  boxMaxW: 760,      // 文字の枠の幅の上限（px）
});

/**
 * 1人分の立ち絵の置き場所（画面の px）。p は portraits.json の chars の1人分、side は 'left' | 'right'。
 * 返り値: { x, y, w, h（体の絵）, k（原本 1px → 画面の px）, eyeY（目の高さ）, boxTop,
 *   fade（下をぼかす長さ px。0 ならぼかさない）, fadeTo（絵の上から何 px で消えきるか＝切れ目の位置） }
 */
export function portraitRect(p, side, view, L = DIALOG_LAYOUT) {
  const H = view.h * L.portraitH;
  const k = H / CANVAS_H(p) * (p.scale || 1);
  const [nx = 0, ny = 0] = p.nudge || [];
  const gap = Math.min(view.w * L.faceGap, H * L.faceGapMaxH);
  const faceX = view.w / 2 + (side === 'left' ? -gap : gap) + nx * H;
  const eyeY = view.h * L.eyeLine + ny * H;
  const [x0, y0, x1, y1] = p.crop;
  const x = faceX - ((p.face_x ?? p.eye[0]) - x0) * k, y = eyeY - (p.eye[1] - y0) * k;
  const w = (x1 - x0) * k, h = (y1 - y0) * k;
  const boxTop = view.h * (1 - L.boxH);
  let fade = 0, fadeTo = h;
  if (p.cut != null) {
    const cutY = y + (p.cut - y0) * k;
    fadeTo = cutY - y;
    // 切れ目が枠の上の線より上（または近く）にあるときだけ。切れ目から上の、見えている長さより長くはしない
    if (cutY < boxTop + 6) fade = Math.min(fadeTo, Math.max(L.fadeLen * H, boxTop + 6 - cutY + 0.04 * H));
  }
  return { x, y, w, h, k, eyeY, fade: Math.max(0, fade), fadeTo, boxTop };
}

/** 目の光のレイヤーの置き場所（体の絵の左上からの px）。rect は portraits.json の eyes_rect */
export function eyesRect(p, rect, k) {
  const [x0, y0] = p.crop;
  return { x: (rect[0] - x0) * k, y: (rect[1] - y0) * k, w: (rect[2] - rect[0]) * k, h: (rect[3] - rect[1]) * k };
}

/** 文字の枠の置き場所（画面の px） */
export function boxRect(view, L = DIALOG_LAYOUT) {
  const h = view.h * L.boxH, w = Math.min(view.w, L.boxMaxW);
  return { x: (view.w - w) / 2, y: view.h - h, w, h };
}

/** 目の光の色: 表情ごとの色があればそれ、なければロボの色 */
export function eyeColor(p, face) {
  return p.eye_color_by_face?.[face] || p.eye_color || '#7df9ff';
}

const CANVAS_H = p => p.canvasH || 1536;
