// 飛ぶ機体と水陸両用機（v0.4.12-dev、?altunits=1 のお試しだけ。本編のミッション MISSION_1 には出さない）。
// 高さの決まり（altitude.js）を使う 2 つの機体の「種類」を、新しいファイルに分けて持つ（KINDS は sim.js が数行で足し込む）。
// データだけ（DOM・Pixi・乱数なし）。数値は PONCO02（hp 120・atk 10・射程 112・速さ 20）を基準にした【仮】。
// どの機体が誰を撃てるかは altitude.js の canHit の表のまま（ここでは何も決めない）。
import { ALT, MOVE } from './altitude.js?v=1';

/** 機体の種類（sim.js の KINDS に足す）。z・moves は makeUnit がそのまま読む */
export const ALT_KINDS = Object.freeze({
  // 飛ぶ機体: 空の帯（z 40）・動き方は空だけ。深い水・山・森の上も地形の影響を受けずに通れる。少しもろく・速い【仮】
  flyer: Object.freeze({ name: 'スカイポンコ（仮）', short: '飛行', hp: 90, atk: 8, range: 112, cooldown: 0.9, speed: 26, sight: 5, gather: 0,
    z: ALT.demoAirZ, moves: Object.freeze([MOVE.AIR]) }),
  // 水陸両用機: 陸・浅瀬・深い水のどこでも動ける。深い水にいる間は潜る（z<0＝水中の帯）。少し硬く・遅い【仮】
  amph: Object.freeze({ name: 'アビスポンコ（仮）', short: '水陸', hp: 140, atk: 10, range: 96, cooldown: 1.0, speed: 18, sight: 4.5, gather: 0,
    z: 0, moves: Object.freeze([MOVE.GROUND, MOVE.UNDERWATER]) }),
});
/** 持っている武器（weapons.js の KIND_WEAPON に足す）。どちらも PONCO02 と同じ制式ライフル【仮】 */
export const ALT_KIND_WEAPON = Object.freeze({ flyer: 'W2-01', amph: 'W2-01' });
/** v1.0.0: 潜っている間（z<0）に持ちかえる武器。水陸両用機は鼻先魚雷管（W3-12・torpedo）で、水中の相手を撃てる */
export const ALT_SUBMERGED_WEAPON = Object.freeze({ amph: 'W3-12' });
/**
 * v1.0.0: 本編のミッションに出すかのスイッチ（絵が届いたら true にする。今は false＝出さない）。
 * true にした種類は、mission.js のミッションの ally に { kind: 'flyer', tx, ty } のように書けば出る（sim.js の KINDS には入っている）。
 * withAltUnits(mission, extra) は、スイッチが入っている種類の行だけをミッションの味方の先頭に足した写しを返す（入っていなければ、元のまま）。
 * 先頭に足すので、出撃枠（FIELD_CAP）を超えた分は、うしろの機体が控え（benched）に回る。
 */
export const ALT_IN_MISSIONS = Object.freeze({ flyer: false, amph: false });
/** スイッチを入れた時に MISSION_1 の味方へ足す行（本陣のそば。場所は【仮】） */
export const ALT_MISSION_ROWS = Object.freeze([
  Object.freeze({ kind: 'flyer', tx: 18, ty: 55 }),
  Object.freeze({ kind: 'amph', tx: 22, ty: 55 }),
]);
export function withAltUnits(mission, extra = [], on = ALT_IN_MISSIONS) {
  const rows = extra.filter(r => on[r.kind]);
  return rows.length ? { ...mission, ally: [...rows, ...mission.ally] } : mission;
}
/** 絵（v1.0.0 Codex gfx3 F_ALT_UNITS）: art＝絵の種類（raster-art.js の flyer_ally・amph_ally）、tint＝色（白＝そのまま）、px＝大きさ。
 *  名前は（仮）: 飛ぶ機体＝スカイポンコ（2.4m・背中に1人）、水陸両用機＝アビスポンコ（4.8m・閉じた操縦席）。前の版はポンコの絵を色づけした仮の絵だった */
export const ALT_UNIT_LOOK = Object.freeze({
  flyer: Object.freeze({ art: 'flyer', tint: 0xffffff, px: 42, name: 'スカイポンコ（仮）' }),
  amph: Object.freeze({ art: 'amph', tint: 0xffffff, px: 60, name: 'アビスポンコ（仮）' }),
});
