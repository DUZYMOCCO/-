// powersuit-view.js — パワードスーツ（?powersuit=1 の試作）の見た目。新しい絵は作らず、今の人間の絵（紙芝居）に色をかけ、殻の輪郭・閉じた仮面・脱いだ殻の残骸をコードで描く（仮。絵は Codex が描く: out/CODEX_ART.md）。
// renderer.js の syncFramed から、sim.powersuit がある時だけ呼ばれる。sim の state を読むだけ（何も書かない）。
//   コックピット・顔は見せない（決定 5）: 着ている間は顔を仮面（円＋細い光るスリット）で隠す。
//   着る・脱ぐ途中は殻がうすく出る／消える。脱げて 1.5 秒の間（捕まらない間）は人がちらつく。壊れた殻は持ち主の足元に小さな残骸。
import { Graphics } from '../../vendor/pixi-8.22.0.min.mjs?v=7';
import { POWERSUIT, suitOf } from '../sim/powersuit.js?v=1';

/** 着ている人の色（胸のワッペン）。少年＝黄・少女＝桃・ロウ＝灰青（POWERSUIT.md 5-1） */
export const SUIT_BADGE = Object.freeze({ boy: 0xffd166, girl: 0xff8fb8, wolf: 0x8fb4d9 });
export const SUIT_TINT = 0xa9b8c8;     // 着ている間、人の絵にかける色
const STEEL = 0x8a9aa8, DARK = 0x1c2733, MASK = 0x56687a, EYE = 0x7df9ff;

/** 殻の輪郭と仮面（足元が (0,0)、頭の上が y≈-24。少年の大きさ）。a: 0..1 の濃さ */
function drawShell(g, badge, a) {
  g.clear();
  // 足・すねの装甲
  g.roundRect(-5.5, -7, 4.6, 7, 1).fill({ color: STEEL, alpha: a }).stroke({ width: 0.8, color: DARK, alpha: a });
  g.roundRect(0.9, -7, 4.6, 7, 1).fill({ color: STEEL, alpha: a }).stroke({ width: 0.8, color: DARK, alpha: a });
  // 胴の殻（少し大きめ）
  g.roundRect(-7, -17.5, 14, 11.5, 2.4).fill({ color: STEEL, alpha: a }).stroke({ width: 0.9, color: DARK, alpha: a });
  g.rect(-5, -12, 10, 1.4).fill({ color: DARK, alpha: 0.55 * a });                 // 胴の分かれ目
  g.roundRect(-2.2, -16, 4.4, 3.2, 0.8).fill({ color: badge, alpha: a });          // 胸のワッペン
  // 肩
  g.circle(-8, -16, 3.3).fill({ color: STEEL, alpha: a }).stroke({ width: 0.8, color: DARK, alpha: a });
  g.circle(8, -16, 3.3).fill({ color: STEEL, alpha: a }).stroke({ width: 0.8, color: DARK, alpha: a });
  // 閉じた仮面（顔は見せない）
  g.circle(0, -21.5, 5.6).fill({ color: MASK, alpha: a }).stroke({ width: 0.9, color: DARK, alpha: a });
  g.roundRect(-3.6, -22.6, 7.2, 1.7, 0.8).fill({ color: DARK, alpha: a });          // スリットの縁
  g.roundRect(-3, -22.3, 6, 1, 0.5).fill({ color: EYE, alpha: a });                 // 光る目のスリット
}
/** 壊れた殻の残骸（持ち主の足元の横）。小さな破片 3 つ */
function drawDebris(g) {
  g.clear();
  g.poly([7, -1.2, 11, -2.6, 12.5, 0, 8, 0.4]).fill({ color: 0x6b7280 }).stroke({ width: 0.7, color: DARK });
  g.poly([10, 1.2, 14, 0.6, 13.2, 2.6, 10.4, 2.8]).fill({ color: 0x8a6a4a }).stroke({ width: 0.6, color: DARK });
  g.circle(6.2, 1.6, 1.3).fill({ color: 0x4b5563 });
}

/**
 * 人間 u の絵に、スーツの見た目を重ねる。v は renderer の unitView（v.c＝入れ物、v.body＝人の絵）。
 * sim.powersuit がない時は呼ばれない。持ち主でも着ている人でもない人は何もしない（v.suitG があれば消す）。
 */
export function syncSuitView(v, u, sim, now) {
  const suit = suitOf(sim);
  const mine = !!suit && suit.ownerId === u.id && !suit.lost;
  if (!mine && !v.suitG && !v.suitFlick) return;
  if (!v.suitG) {
    v.suitG = new Graphics(); v.suitD = new Graphics();
    v.c.addChildAt(v.suitG, Math.max(0, v.c.getChildIndex(v.body)) + 1);
    v.c.addChildAt(v.suitD, 0); // 残骸は人の後ろ（足元の影の下）
    v.suitKey = '';
  }
  // 殻の濃さ: 着ている間 1。着る途中は 0→1、脱ぐ途中は 1→0
  let a = 0;
  if (mine) {
    if (suit.phase === 'on') a = 1;
    else if (suit.phase === 'donning') a = Math.min(1, suit.t / POWERSUIT.donSec);
    else if (suit.phase === 'doffing') a = Math.max(0, 1 - suit.t / POWERSUIT.doffSec);
  }
  const shown = a > 0, badge = SUIT_BADGE[u.kind] ?? SUIT_BADGE.boy;
  const key = `${Math.round(a * 20)}|${badge}`;
  if (key !== v.suitKey) { v.suitKey = key; if (shown) drawShell(v.suitG, badge, 0.35 + 0.65 * a); else v.suitG.clear(); }
  v.suitG.visible = shown;
  if (shown) {
    v.body.tint = v.body.tint === 0xffffff ? SUIT_TINT : v.body.tint; // 被弾のちらつき色は残す
    v.suitG.y = v.body.y; v.suitG.x = v.body.x;
  }
  // 壊れた殻を持ち歩いている: 足元の横に小さな残骸
  const debris = mine && suit.broken && suit.phase === 'off';
  if (debris !== !!v.suitDebris) { v.suitDebris = debris; if (debris) drawDebris(v.suitD); else v.suitD.clear(); }
  // 脱げて 1.5 秒（捕まらない間）: ちらつく
  const grace = (u.suitGrace ?? -1) > sim.time;
  if (grace) { v.c.alpha = 0.55 + 0.45 * Math.abs(Math.sin(now * 14)); v.suitFlick = true; }
  else if (v.suitFlick) { v.c.alpha = 1; v.suitFlick = false; }
}
