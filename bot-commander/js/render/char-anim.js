// char-anim.js — 紙芝居式（コマ送り）キャラの「どのモーションの何コマ目を、どちら向きに出すか」。
// Pixi・DOM を使わない（tests/char-anim.test.mjs から直接呼ぶ）。絵の読み込みは textures.js の loadCharSheets。
//
// 動いている間は命令に関係なく run（10/23 決定。速さ30のまま）。walk は run を持たないキャラ用の予備。
// コマはすべて frames.json の fps と再生順（sequence_intro → sequence）で、時間で進める（走りも。足は少しすべってよい）。
// LOCO_BY_DISTANCE = true にすると、walk / run だけ「進んだ距離」で進める（足がすべらない。歩きだと回りが速すぎた）：
//   1周の距離（ワールド座標）= cycle_distance_L × 表示の高さ ÷ L の立ち姿の高さ。どちらでも sim の速さ（バランス）は変えない。
// 倒れる → 起き上がるは、被弾の反応（react.js の REACT.down）の時間の中に収める（起き上がりの終わり＝反応の終わり）。
import { REACT } from '../fx/react.js?v=2';

/** 種類 → assets/chars/<フォルダ>/。新しいキャラは tools/pack-chars.mjs で写してから、ここに1行足すだけ */
export const CHAR_FRAMES = Object.freeze({
  boy: 'BOY',
  girl: 'GIRL',
  wolf: 'WOLF',     // 狼の獣人。今のミッションには出ない（設計 5-4）。出す時のために登録だけ
});
/** ?human=oblique（お試し）で置き換える絵。置き換えの表はここ1か所。
 *  獣人の WOLF_OBL は v1.0.0 で Codex gfx3 の清書に入れ替え済み（frames.json の数字は gfx2 の仮の版と同じ） */
export const CHAR_FRAMES_OBLIQUE = Object.freeze({ ...CHAR_FRAMES, boy: 'BOY_OBL', girl: 'GIRL_OBL', wolf: 'WOLF_OBL' });
/** true: walk / run を進んだ距離で送る（足がすべらない）。false: 時間で（frames.json の fps）。10/23 に false に決定 */
export const LOCO_BY_DISTANCE = false;
export const CHAR_H = 24;          // 立ち姿の高さ（ワールド座標。ロボは 40px 前後）。少年が基準
// キャラごとの背丈（設定画の3人並びに合わせる: 女の子は少年より少し小さく、狼の獣人は大人で大きい）
// 獣人は少女の約 1.35 倍（10/25 決定。22 × 1.35 ≒ 30）。横の WOLF と斜めの WOLF_OBL で同じ
const CHAR_H_BY = Object.freeze({ BOY: CHAR_H, GIRL: 22, WOLF: 30 });
export const heightOf = def => CHAR_H_BY[def?.character] || CHAR_H;
export const SIT_AFTER = 3;        // 脱出口の輪の中で、これだけ止まっていたら座る（秒）
export const WAVE_SEC = 2.4;       // 助けられた時に手を振る長さ（秒）。選んだ時は1回だけ振る
export const CORPSE_SEC = 8;       // 倒れたまま残る時間（秒）。そのあと薄くなって消える

export const hasFrames = (kind, sheets) => !!(CHAR_FRAMES[kind] && sheets?.[kind]);

/** 画面上の実際の大きさ（デバイス px）に合う絵。足りなければ大きい方 */
export function pickSize(def, devicePx) {
  const sizes = Object.entries(def.motions.idle.sizes).sort((a, b) => a[1].standing_height - b[1].standing_height);
  for (const [k, z] of sizes) if (z.standing_height >= devicePx * 0.95) return k;
  return sizes[sizes.length - 1][0]; // .at(-1) は Safari 15.4 より前にないので使わない
}

/** 1周の距離（ワールド座標） */
export const strideOf = (def, motion, h = heightOf(def)) => (def.motions[motion].cycle_distance_L || 0) * h / (def.standing_height_L || 300);

/** 時間 t（秒）で、何コマ目か。sequence_intro → sequence（loop）、loop:false は最後で止める */
export function frameAt(m, t) {
  const intro = m.sequence_intro || [], seq = m.sequence || [...Array(m.frames).keys()];
  let k = Math.max(0, Math.floor(t * m.fps + 1e-6));
  if (k < intro.length) return intro[k];
  k -= intro.length;
  return m.loop ? seq[k % seq.length] : seq[Math.min(k, seq.length - 1)];
}
/** loop:false のモーションが流し終わったか */
export const finished = (m, t) => !m.loop && t * m.fps >= (m.sequence_intro?.length || 0) + m.sequence.length;
/** 1回流す長さ（秒。intro＋sequence 1周） */
export const durOf = m => ((m.sequence_intro?.length || 0) + m.sequence.length) / m.fps;

const DN = REACT.down, DOWN_SEC = DN.fall + DN.lie + DN.getup;
// 長い絵（倒れる＋起きるが反応の時間 1.85 秒の 1.5 倍より長い。例: 少女の斜めの絵 2.5 秒＋6.2 秒）は、
// 1.85 秒に押し込むと 4〜5 倍の早送りになる。そこで倒れるはほぼそのまま、起きるは少し速め、
// 起き上がりの最初の寝ているコマは飛ばして流す。反応が終わっても止まっていれば起き上がりを最後まで流す
// （動き出したら run に替わって打ち切る）。短い絵（横から見た絵）は今までどおり反応の時間に収める。
export const DOWN_LONG = Object.freeze({ over: 1.5, kdSpeed: 1.5, gdSpeed: 2, gdSkip: 6 });
export const isLongDown = M => !!M.getup && durOf(M.knockdown) + durOf(M.getup) > DOWN_SEC * DOWN_LONG.over;
/**
 * 倒れてから T 秒の絵。getup があれば、反応の終わりにちょうど立ち終わるように起き上がりを始める
 * （長すぎる時は寝ている＋起きる時間に縮める）。knockdown はその前に終わるように（足りなければ縮める）。
 * getup が無いキャラは、倒れるコマの逆再生で起きる。返り値 { motion, frame, t（そのモーションの中の時間）, rate（t の進む速さ）}
 */
export function downFrame(M, T) {
  if (M.getup && isLongDown(M)) {
    const L = DOWN_LONG, kd = durOf(M.knockdown), sk = Math.max(L.kdSpeed, kd / (DOWN_SEC - 0.1)), tk = kd / sk;
    if (T < tk) { const t = T * sk; return { motion: 'knockdown', frame: frameAt(M.knockdown, t), t, rate: sk }; }
    const t = L.gdSkip / M.getup.fps + (T - tk) * L.gdSpeed;
    return { motion: 'getup', frame: frameAt(M.getup, t), t, rate: L.gdSpeed };
  }
  if (M.getup) {
    const gd = durOf(M.getup), g = Math.min(gd, DN.lie + DN.getup), g0 = DOWN_SEC - g;
    if (T >= g0) { const t = (T - g0) * gd / g; return { motion: 'getup', frame: frameAt(M.getup, t), t, rate: 1 }; }
    const rate = Math.max(1, durOf(M.knockdown) / g0), t = T * rate;
    return { motion: 'knockdown', frame: frameAt(M.knockdown, t), t, rate };
  }
  const seq = M.knockdown.sequence, up = DN.fall + DN.lie;
  if (T < up) { const rate = Math.max(1, durOf(M.knockdown) / up), t = T * rate; return { motion: 'knockdown', frame: frameAt(M.knockdown, t), t, rate }; }
  const g = Math.min(1, (T - up) / DN.getup);
  return { motion: 'knockdown', frame: seq[Math.max(0, seq.length - 1 - Math.floor(g * seq.length))], t: T, rate: 1 };
}
/** 運ばれている間の絵: 被弾の一番のけぞったコマ（sequence のまん中） */
export const carriedFrame = m => m.sequence[Math.floor((m.sequence.length - 1) / 2)];

export const newAnim = () => ({ motion: 'idle', t: 0, dist: 0, lx: null, ly: null, still: 0, wave: 0, dead: false, deadT: 0, face: 1, rate: 1 });


/**
 * 1回分すすめる。a: newAnim() の状態（ビューごとに持つ）、u: sim のユニット、dt: sim の時間でどれだけ進んだか（止まっている間は 0）。
 * ctx: { atExit: 脱出口の輪の中か, wave: 手を振り始める秒数（助けられた・選ばれた）, dead: 倒れた（もう sim にいない） }
 * 返り値: { motion, frame, flip（1＝右向き、-1＝左向き）}
 */
export function stepAnim(def, a, u, dt, ctx = {}) {
  const M = def.motions, hr = u._hr?.out, R = u._hr;
  const moved = a.lx == null ? 0 : Math.hypot(u.x - a.lx, u.y - a.ly);
  a.lx = u.x; a.ly = u.y;
  if (ctx.wave) a.wave = Math.max(a.wave, ctx.wave);
  // sim が進んでいない描画フレーム（60Hz 描画・30Hz sim）では前と同じ絵。進んでいない＝止まった、と見て待機がちらつかないように
  if (dt <= 0 && a.last && !(ctx.dead && !a.dead)) return a.last;
  if (ctx.dead && !a.dead) { a.dead = true; a.deadT = a.motion === 'knockdown' ? a.t : 0; }
  let motion, frame, face = u.facing < 0 ? -1 : 1;
  const set = m => { if (a.motion !== m) { a.motion = m; a.t = 0; a.rate = 1; } else a.t += dt; };

  if (a.dead) {                                    // やられ: 倒れて、そのまま
    a.deadT += dt; motion = 'knockdown'; frame = frameAt(M.knockdown, a.deadT); a.motion = motion; face = a.face;
  } else if (hr?.down) {                           // 重い一撃: 倒れる → 起き上がる（反応の時間に合わせる）
    if (R?.hitX) face = -R.hitX;                   // 押された向きと逆（撃った方）を向いて、後ろへ倒れる
    else face = a.face;
    const T = hr.anim === 'getup' ? DN.fall + DN.lie + hr.animT * DN.getup : hr.animT, d = downFrame(M, T);
    motion = d.motion; frame = d.frame; a.motion = motion; a.t = d.t; a.rate = d.rate;
  } else if (hr?.anim === 'hurt') {                // 中くらい以上の一撃: のけぞる（反応が終わっても最後まで流す）
    if (R?.hitX) face = -R.hitX;
    motion = 'hurt'; a.motion = motion; a.t = hr.animT; frame = frameAt(M.hurt, a.t);
  } else if (typeof u.captured === 'number') {     // 運ばれている: のけぞったまま
    set('hurt'); motion = 'hurt'; frame = carriedFrame(M.hurt); face = a.face; a.t = durOf(M.hurt);
  } else if (u.moving && moved > 0) {              // 動いている: どの命令でも走る（walk は run のない絵のときだけ）
    motion = M.run ? 'run' : 'walk';
    if (a.motion !== motion) { a.motion = motion; a.t = 0; }
    a.dist += moved; a.t += dt; a.still = 0; a.wave = 0;
    const m = M[motion], seq = m.sequence;
    frame = (ctx.byDistance ?? LOCO_BY_DISTANCE) ? seq[Math.floor((a.dist / (strideOf(def, motion) || 1)) * seq.length + 1e-6) % seq.length]
      : frameAt(m, a.t);                           // 時間で（frames.json の fps。速さ30でも絵の速さのまま）
  } else if ((a.motion === 'hurt' || a.motion === 'getup') && M[a.motion] && !finished(M[a.motion], a.t + dt * (a.motion === 'getup' ? a.rate || 1 : 1))) {
    a.t += dt * (a.motion === 'getup' ? a.rate || 1 : 1); motion = a.motion; frame = frameAt(M[motion], a.t); face = a.face;   // 流し終わるまで（then: idle。長い絵の起き上がりは少し速め）
  } else if (a.wave > 0) {
    set('wave'); motion = 'wave'; frame = frameAt(M.wave, a.t); a.wave -= dt;
  } else if (ctx.atExit && M.sit && (a.still += dt) >= SIT_AFTER) {
    set('sit'); motion = 'sit'; frame = frameAt(M.sit, a.t);
  } else {
    if (!ctx.atExit) a.still = 0;
    set('idle'); motion = 'idle'; frame = frameAt(M.idle, a.t);
  }
  if (!u.moving) a.dist = 0;
  a.face = face;
  return (a.last = { motion, frame, flip: face });
}
