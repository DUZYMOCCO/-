/**
 * ABYSS DIVE — 潜水艇の見た目の動き（ピッチ／バンク）。純粋（DOM 非依存）。
 *
 * v1.19.0: 「今は固定の傾き」だった艇の見た目に、進行方向に沿った動きを足す。
 *   - pitch : 進行の上下成分で船首を上下。速度が小さくなるほど水平へ戻る（減速で自然に水平）。
 *   - twist : 水平方向の切り返し（急な方向転換）で短く入る「ひねり」。前フレームとの vx 差から作る過渡。
 *   - bodyTransform : pitch と twist を、描画で使いやすい 1 つの姿勢（回転角＋横の縮み）にまとめる。
 *     横の縮みは「遠近が少し見える」ための控えめな変形で、必ず SQUASH_MIN 以上に留める
 *     （艦体が紙のようにゼロ幅にならない）。
 *
 * ここは数値と状態機械だけ。描画（game.js）は呼び出し側。
 * 物理（速度・慣性・当たり・照準・発射・バリア）には一切関与しない。
 * 描画側は船体と付属物（ライト・発射口・各取付物）に同じ変換を掛けることで、
 * 艇と付属物のズレを起こさない。
 */

export const MOTION = Object.freeze({
  PITCH_MAX: 0.40,          // 船首上下の上限（rad）≈23°
  LEVEL_SPEED: 55,          // これ以下の速度では水平へ向かう（px/s）
  PITCH_FULL_SPEED: 230,    // この速度で傾きが上限へ近づく
  PITCH_RATE: 7.0,          // 追従の速さ（/s）。大きいほど機敏、小さいほど滑らか
  TWIST_GAIN: 0.020,        // 水平加速度 → ひねりの強さ
  TWIST_DECAY: 5.4,         // ひねりの減衰（/s）＝短いこと
  TWIST_MAX: 1.0,           // ひねりの上限（正規化）
  LEAN_MAX: 0.18,           // ひねりぶんの船首の振れ（rad）＝バンク。見て分かる程度に
  SQUASH_MIN: 0.78,         // 遠近（横の縮み）の下限。0（紙）にしない（78%まで）
});

function clamp(v, lo, hi){ return v < lo ? lo : (v > hi ? hi : v); }

/**
 * 速度から決まる船首の上下（目標角）。
 *   vx の符号に依らず上下成分（vy）と速度の大きさだけで決まるので、vx=0 を跨いでも連続
 *   （＝斜めや往復の急反転で跳ねない）。速度が小さいほど 0 に寄る（＝減速で水平）。
 */
export function pitchTarget(vx, vy, cfg){
  cfg = cfg || MOTION;
  const sp = Math.hypot(vx, vy);
  const solid = clamp((sp - cfg.LEVEL_SPEED) / (cfg.PITCH_FULL_SPEED - cfg.LEVEL_SPEED), 0, 1);
  const h = Math.atan2(vy, Math.abs(vx));      // |vx| なので vx=0 でも ±π/2（連続）
  return clamp(h, -cfg.PITCH_MAX, cfg.PITCH_MAX) * solid;
}

/** ピッチを目標へ指数追従（時間ベース＝フレームレート非依存）。 */
export function pitchStep(pitch, target, dt, cfg){
  cfg = cfg || MOTION;
  if (!(dt > 0)) return pitch;
  return pitch + (target - pitch) * (1 - Math.exp(-cfg.PITCH_RATE * dt));
}

/**
 * 水平の切り返しで入る短いひねり（正規化・符号つき）。
 *   前フレームとの vx 差（水平加速度）を積み、常に TWIST_DECAY で減衰させる。
 *   一定速では ax≈0 なので 0 に戻る（＝短い）。急反転では大きく振れてすぐ戻る。
 */
export function twistStep(twist, prevVx, vx, dt, cfg){
  cfg = cfg || MOTION;
  if (!(dt > 0)) return twist;
  const d = clamp(dt, 0, 0.05);                // ポーズ・復帰の大 dt で跳ねない
  const ax = (vx - prevVx) / d;
  const t = twist * Math.exp(-cfg.TWIST_DECAY * d) + ax * cfg.TWIST_GAIN * d;
  return clamp(t, -cfg.TWIST_MAX, cfg.TWIST_MAX);
}

/**
 * 見た目の姿勢。pitch と twist から、回転角 rotate と横の縮み squash を作る。
 *   twist=0 のとき rotate=pitch・squash=1（＝従来の傾きと同じ）。
 *   squash は [SQUASH_MIN, 1] に収める（紙のようにならない）。
 */
export function bodyTransform(pitch, twist, cfg){
  cfg = cfg || MOTION;
  const t = clamp(Number(twist) || 0, -1, 1);
  const lean = t * cfg.LEAN_MAX;
  const squash = 1 - Math.abs(t) * (1 - cfg.SQUASH_MIN);
  return { rotate: (Number(pitch) || 0) + lean, lean, squash: clamp(squash, cfg.SQUASH_MIN, 1) };
}

/**
 * 局所座標 (lx, ly)（+x=船首、原点=艇中心）を、見た目の姿勢を当てた画面座標へ写す。
 *   canvas の translate(ox,oy) → rotate(rotate) → scale(squash,1) と厳密に同じ式。
 *   船体も付属物（ライト・発射口）もこの 1 つの写像だけを使えば、艇と付属物がズレない。
 */
export function localToWorld(pitch, twist, ox, oy, lx, ly, cfg){
  const t = bodyTransform(pitch, twist, cfg);
  const cs = Math.cos(t.rotate), sn = Math.sin(t.rotate);
  const sx = lx * t.squash;
  return { x: ox + cs * sx - sn * ly, y: oy + sn * sx + cs * ly };
}
