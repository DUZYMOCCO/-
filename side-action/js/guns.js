// リアルな じゅう（ぜんぶ オリジナルの かくうの モデル）。たかい かいぞうどの スプライトを いちど だけ つくって つかう
// もちて（グリップ）が 0,0、みぎむき。じゅうこうの いち は rules.js の GUN_GEOM と おなじ
import { GUN_GEOM } from './rules.js?v=4';

const OUT = '#0a0a0b';
const BX = -32, BY = -28, BW = 96, BH = 48, RES = 7;
const cache = {};
const hasDoc = typeof document !== 'undefined';

function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---- かく ための どうぐ ----
function P(x, pts) { x.beginPath(); x.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) x.lineTo(pts[i], pts[i + 1]); x.closePath(); }
function grad(x, y0, y1, stops) { const g = x.createLinearGradient(0, y0, 0, y1); stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c)); return g; }
const STEEL = ['#b9bec6', '#7d838c', '#454a52', '#2a2d33'];
const GUNMETAL = ['#6c7179', '#43474e', '#26292e', '#17191c'];
const POLY = ['#4a4c50', '#2f3134', '#1d1e21'];
const RUST = ['#b2593a', '#8a3b24', '#5e2617', '#3c170e'];
const WOOD = ['#9a6a3e', '#74492a', '#4e2f1b'];
const OLIVE = ['#7b8456', '#5a6240', '#3c422b', '#272b1c'];
function part(x, pts, stops, lw = 0.9) {
  let y0 = Infinity, y1 = -Infinity; for (let i = 1; i < pts.length; i += 2) { y0 = Math.min(y0, pts[i]); y1 = Math.max(y1, pts[i]); }
  P(x, pts); x.fillStyle = grad(x, y0, y1, stops); x.fill(); x.lineWidth = lw; x.strokeStyle = OUT; x.stroke();
}
function rect(x, rx, ry, rw, rh, stops, lw = 0.9) { part(x, [rx, ry, rx + rw, ry, rx + rw, ry + rh, rx, ry + rh], stops, lw); }
function edge(x, x0, y, x1, a = 0.55) { x.strokeStyle = `rgba(255,255,255,${a})`; x.lineWidth = 0.45; x.beginPath(); x.moveTo(x0, y); x.lineTo(x1, y); x.stroke(); }
function wear(x, R, x0, y0, w, h, n, col = 'rgba(225,225,215,0.45)') {
  x.strokeStyle = col; x.lineWidth = 0.35;
  for (let i = 0; i < n; i++) { const px = x0 + R() * w, py = y0 + R() * h, l = 0.5 + R() * 2.2; x.beginPath(); x.moveTo(px, py); x.lineTo(px + l, py + (R() - 0.5) * 0.6); x.stroke(); }
}
function bolts(x, pts, r = 0.45) { for (let i = 0; i < pts.length; i += 2) { x.fillStyle = '#15171a'; x.beginPath(); x.arc(pts[i], pts[i + 1], r, 0, Math.PI * 2); x.fill(); x.fillStyle = 'rgba(255,255,255,0.35)'; x.fillRect(pts[i] - r * 0.6, pts[i + 1] - r * 0.7, r * 0.7, r * 0.4); } }
function slots(x, x0, y, x1, step, h, col = '#0d0e10') { x.fillStyle = col; for (let px = x0; px < x1; px += step) x.fillRect(px, y, step * 0.5, h); }
function rail(x, x0, y, x1) { rect(x, x0, y, x1 - x0, 1.6, GUNMETAL, 0.6); x.fillStyle = '#121316'; for (let px = x0 + 0.6; px < x1 - 0.6; px += 1.5) x.fillRect(px, y - 0.4, 0.7, 0.6); }
function trigger(x, cx, y) { x.strokeStyle = OUT; x.lineWidth = 0.8; x.beginPath(); x.moveTo(cx - 3.2, y); x.quadraticCurveTo(cx - 3, y + 4.2, cx + 1.5, y + 4.2); x.lineTo(cx + 3.5, y); x.stroke(); x.strokeStyle = '#2b2d31'; x.lineWidth = 0.7; x.beginPath(); x.moveTo(cx, y); x.quadraticCurveTo(cx + 0.6, y + 1.8, cx - 0.4, y + 2.6); x.stroke(); }
function optic(x, cx, y, len, col = GUNMETAL, glass = '#3a6f8f') {
  rect(x, cx - 2, y - 1.4, 4, 1.4, GUNMETAL, 0.6);
  part(x, [cx - len / 2, y - 6.2, cx + len / 2, y - 6.6, cx + len / 2, y - 1.4, cx - len / 2, y - 1.6], col);
  rect(x, cx + len / 2 - 0.5, y - 7.3, 1.8, 6.6, GUNMETAL, 0.6);
  rect(x, cx - len / 2 - 1.3, y - 7, 1.8, 6.2, GUNMETAL, 0.6);
  x.fillStyle = grad(x, y - 6.6, y - 1.4, [glass, '#0b1820']); x.fillRect(cx + len / 2 + 0.6, y - 6.6, 0.8, 5.2);
  x.fillStyle = 'rgba(200,240,255,0.7)'; x.fillRect(cx + len / 2 + 0.7, y - 6.2, 0.5, 1.4);
}

// ---- それぞれの じゅう ----
const BODY = {
  // 「ヤマネコ」ハンドガン：ポリマー フレーム＋ はがねの スライド（スライドは べつ パーツ）
  pistol(x, R) {
    part(x, [-1.5, -4.5, 5.2, -4.5, 3.6, 8.6, 3, 9.6, -3.6, 9.6, -4.2, 8.2], POLY);
    x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 0.35; for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(-2.8 + i * 0.3, -1 + i * 1.6); x.lineTo(3.2 + i * 0.05, -1 + i * 1.6); x.stroke(); }
    rect(x, -4.4, 9.2, 7.6, 1.4, GUNMETAL, 0.6);
    part(x, [-3, -5.2, 22.5, -5.2, 22.5, -3.4, 12, -3.4, 10.5, -1.6, 5, -1.6, 4, -3.4, -3, -3.4], POLY);
    trigger(x, 7, -2.2);
    rect(x, 13, -4.6, 7.5, 0.9, GUNMETAL, 0.4);
    x.fillStyle = '#121316'; x.fillRect(22.4, -8.3, 2.6, 1.6);
  },
  pistolSlide(x, R) {
    part(x, [-4.5, -10.6, 23.5, -10.6, 24.6, -9.6, 24.6, -5.4, -4.5, -5.4], STEEL);
    x.strokeStyle = 'rgba(0,0,0,0.65)'; x.lineWidth = 0.4; for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(-3.6 + i * 0.9, -10.2); x.lineTo(-3.9 + i * 0.9, -5.8); x.stroke(); }
    x.fillStyle = '#121316'; x.fillRect(7, -10.4, 5.5, 2);
    x.fillStyle = '#c9a14a'; x.fillRect(8, -10, 2.2, 1.1);
    rect(x, -3.8, -12, 2.6, 1.4, GUNMETAL, 0.5); rect(x, 21.5, -11.8, 1.4, 1.2, GUNMETAL, 0.5);
    x.fillStyle = '#e8f0ff'; x.fillRect(22, -11.6, 0.5, 0.5);
    edge(x, -4, -10.2, 23.5, 0.7); wear(x, R, -4, -10.5, 28, 1.2, 14); wear(x, R, 14, -7, 10, 1.4, 6);
  },
  // 「ハチドリ」サブマシンガン：おりたたみ ストック・まっすぐな マガジン・レール・ドットサイト
  smg(x, R) {
    x.strokeStyle = OUT; x.lineWidth = 2.2; x.lineJoin = 'round'; x.beginPath(); x.moveTo(-6, -9); x.lineTo(-22, -8.4); x.lineTo(-22.6, -1); x.lineTo(-6, -4); x.stroke();
    x.strokeStyle = '#3d4046'; x.lineWidth = 1.2; x.stroke();
    rect(x, -25.2, -9.6, 3, 10, POLY, 0.7);
    part(x, [9, -3.4, 13.6, -3.4, 15.4, 13.6, 10.6, 14.2], GUNMETAL);
    x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 0.35; for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(10 + i * 0.4, 1 + i * 3); x.lineTo(14 + i * 0.4, 1 + i * 3); x.stroke(); }
    part(x, [-0.5, -3.6, 4.6, -3.6, 3.4, 8.8, -2.6, 8.8, -3.4, 7.4], POLY);
    part(x, [-7, -11.4, 24, -11.4, 24, -3.2, 5, -3.2, 4, -2.2, -7, -3.6], GUNMETAL);
    trigger(x, 6.8, -2.4);
    x.fillStyle = '#101113'; x.fillRect(3, -9.4, 7, 2.2); x.fillStyle = '#c9a14a'; x.fillRect(4.4, -9, 2, 1);
    edge(x, -6.5, -10.9, 23.5, 0.5);
    rect(x, 24, -10.2, 9.4, 5.8, GUNMETAL, 0.8); slots(x, 25, -8.4, 33, 2, 2);
    rect(x, 33.2, -8.6, 2.6, 3, STEEL, 0.6);
    rail(x, -4, -13, 22);
    optic(x, 9, -13, 7.5, GUNMETAL, '#7a2020');
    x.fillStyle = '#ff3b2b'; x.beginPath(); x.arc(5.6, -16.6, 0.45, 0, 7); x.fill();
    rect(x, -6, -10.8, 2, 1.2, STEEL, 0.4);
    bolts(x, [-4, -5.5, 19, -5.5, 19, -9.5]);
    wear(x, R, -6, -11.2, 30, 1.4, 16); wear(x, R, 24, -10, 9, 5, 6); wear(x, R, 9.5, 2, 4, 10, 5);
  },
  // 「サビイヌ」ブルパップ ライフル：さびいろの ストック・スコープ・ハンドガードの あな・フラッシュハイダー
  rifle(x, R) {
    part(x, [-22, -12.6, 8, -12.6, 10, -11, 10, -2.6, 2, -2.6, 1, 0.6, -4.6, 0.6, -8, 3.4, -21, 3.4, -23, 1, -23, -10.4], RUST);
    rect(x, -25, -12.6, 3, 16.2, POLY, 0.7);
    part(x, [-14, 0.6, -9, 0.6, -10.4, 12.6, -15.4, 12.2], GUNMETAL);
    x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 0.35; for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(-14.4 - i * 0.2, 3 + i * 2.4); x.lineTo(-9.6 - i * 0.2, 3 + i * 2.4); x.stroke(); }
    part(x, [-0.6, -2.8, 4.6, -2.8, 3.4, 9, -2.8, 9, -3.4, 7.6], POLY);
    trigger(x, 7, -2.2);
    part(x, [10, -11.4, 33, -11.4, 33, -3.4, 10, -3.4], RUST);
    slots(x, 13, -8.2, 31, 3.2, 2.4, '#1a0d08');
    x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(10, -5.4, 23, 2);
    rect(x, 33, -9.4, 11, 2.6, STEEL, 0.6);
    part(x, [44, -10.6, 49.6, -10.6, 49.6, -6.6, 44, -6.6], GUNMETAL, 0.7); slots(x, 45, -10, 49, 1.4, 2.8, '#0b0c0e');
    rect(x, 30, -14.6, 1.4, 3.2, GUNMETAL, 0.5);
    rail(x, -14, -14.2, 9);
    optic(x, -3, -14.2, 13, GUNMETAL, '#3a6f8f');
    rect(x, -8.4, -23.4, 2.6, 2.4, GUNMETAL, 0.5);
    x.fillStyle = '#0d0e10'; x.fillRect(-19, -9.6, 7, 2.4); x.fillStyle = '#d0a848'; x.fillRect(-17.6, -9.2, 2.6, 1.1);
    bolts(x, [-19, -4, -4, -4, 8, -10, 15, -4.6, 28, -4.6], 0.5);
    edge(x, -22, -12, 32.5, 0.45);
    wear(x, R, -22, -12.4, 54, 2, 30, 'rgba(240,200,170,0.45)'); wear(x, R, -21, -6, 30, 8, 18, 'rgba(240,200,170,0.3)'); wear(x, R, 33, -9, 16, 2, 6);
  },
  // 「クマデ」ポンプ ショットガン：き の ストック・チューブ マガジン・ポンプ（べつ パーツ）
  shotgun(x, R) {
    part(x, [-27, -9.6, -10, -9, -4, -10.6, -2, -3, -5, -2, -11, 1, -27, 4.4, -28, -0.6], WOOD);
    x.strokeStyle = 'rgba(40,20,8,0.5)'; x.lineWidth = 0.35; for (let i = 0; i < 5; i++) { x.beginPath(); x.moveTo(-26, -7 + i * 2); x.quadraticCurveTo(-16, -8 + i * 2.2, -6, -8 + i * 1.6); x.stroke(); }
    rect(x, -29.4, -10, 2.6, 14.8, POLY, 0.7);
    part(x, [-4.4, -11.6, 20, -11.6, 20, -4, 5, -4, 4, -2, -4.4, -2], GUNMETAL);
    x.fillStyle = '#0d0e10'; x.fillRect(4, -10, 7, 3); x.fillStyle = '#2f4f86'; x.fillRect(5, -9.6, 3, 2.2); x.fillStyle = '#c9a14a'; x.fillRect(8, -9.6, 1, 2.2);
    trigger(x, 2.4, -2.4);
    rect(x, 20, -11.2, 33, 3.2, STEEL, 0.7);
    rect(x, 20, -7.4, 29, 2.8, GUNMETAL, 0.7);
    rect(x, 48, -7.8, 2, 3.6, STEEL, 0.5);
    rect(x, 51.4, -12.4, 1.2, 1.4, STEEL, 0.4); x.fillStyle = '#ffd36a'; x.fillRect(51.6, -12.2, 0.7, 0.6);
    edge(x, 20, -10.7, 52.6, 0.7); edge(x, -4, -11, 19.5, 0.4);
    wear(x, R, 20, -11, 33, 1.4, 14); wear(x, R, -26, -9, 22, 10, 14, 'rgba(230,200,160,0.35)');
  },
  shotgunPump(x, R) {
    part(x, [24, -8.4, 38, -8.4, 38.6, -2.8, 23.4, -2.8], WOOD);
    x.strokeStyle = 'rgba(30,15,5,0.7)'; x.lineWidth = 0.45; for (let px = 25.5; px < 37; px += 1.6) { x.beginPath(); x.moveTo(px, -7.8); x.lineTo(px, -3.4); x.stroke(); }
    wear(x, R, 24, -8, 14, 4, 6, 'rgba(230,200,160,0.35)');
  },
  // 「ツチノコ」ロケット ランチャー：オリーブの つつ・うしろの ふきだし・サイト・だんとう
  bazooka(x, R) {
    part(x, [-30, -16, -24, -14.6, -24, -4.6, -30, -3.2], GUNMETAL);
    rect(x, -24, -14.6, 64, 10, OLIVE, 0.9);
    x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(-24, -7.6, 64, 3);
    for (const bx of [-12, 14, 30]) rect(x, bx, -15.2, 2.6, 11.2, GUNMETAL, 0.6);
    rect(x, 40, -15.4, 3.4, 11.6, GUNMETAL, 0.8);
    part(x, [43.4, -13, 47, -11.6, 50, -9.6, 47, -7.6, 43.4, -6.2], ['#8a7a4a', '#5c4f2c', '#3a3119']);
    x.fillStyle = '#c9b06a'; x.fillRect(44.4, -12.2, 1.2, 5.2);
    part(x, [-0.6, -4.6, 4.4, -4.6, 3.2, 7.6, -2.8, 7.6, -3.4, 6.4], POLY);
    part(x, [-14.6, -4.6, -10.4, -4.6, -11, 5, -15, 5], POLY);
    trigger(x, 6.2, -4.2);
    optic(x, 6, -14.6, 9, OLIVE, '#4b7a52');
    x.fillStyle = '#e9e0b0'; x.font = '900 3px sans-serif'; x.fillText('ちゅうい', 16, -8.2);
    edge(x, -23.5, -14, 39.5, 0.45);
    wear(x, R, -24, -14.6, 64, 3, 30, 'rgba(230,230,190,0.45)'); wear(x, R, -24, -10, 64, 5, 16, 'rgba(230,230,190,0.25)');
  },
  // てき の じゅう：くろい サブマシンガン（あかい ランプ）
  dark(x, R) {
    x.strokeStyle = OUT; x.lineWidth = 2; x.beginPath(); x.moveTo(-6, -9); x.lineTo(-18, -8); x.lineTo(-18.6, -2); x.lineTo(-6, -4); x.stroke(); x.strokeStyle = '#26262a'; x.lineWidth = 1; x.stroke();
    part(x, [9, -3.4, 13.6, -3.4, 16, 12.8, 11, 13.4], ['#2a2a2e', '#141416', '#0a0a0b']);
    part(x, [-0.5, -3.6, 4.6, -3.6, 3.4, 8.8, -2.6, 8.8, -3.4, 7.4], ['#26262a', '#141416', '#0a0a0b']);
    part(x, [-7, -11.4, 24, -11.4, 24, -3.2, 5, -3.2, 4, -2.2, -7, -3.6], ['#34343a', '#1c1c20', '#0e0e10']);
    trigger(x, 6.8, -2.4);
    rect(x, 24, -9.8, 8, 5, ['#2a2a2e', '#141416'], 0.7); slots(x, 25, -8, 31.5, 2, 1.6, '#000');
    rect(x, 31.8, -8.2, 2.4, 2.6, GUNMETAL, 0.5);
    x.fillStyle = '#ff2a1a'; x.fillRect(20, -10, 2, 1.4);
    wear(x, R, -6, -11, 30, 1.4, 10, 'rgba(200,200,210,0.3)');
  },
};

function sprite(name) {
  if (cache[name]) return cache[name];
  if (!hasDoc) return null;
  const c = document.createElement('canvas'); c.width = BW * RES; c.height = BH * RES;
  const x = c.getContext('2d'); x.scale(RES, RES); x.translate(-BX, -BY); x.lineJoin = 'round'; x.lineCap = 'round';
  BODY[name](x, rng(name.length * 97 + name.charCodeAt(0)));
  return (cache[name] = c);
}

// rc = はんどう（0〜1）
export function drawGun(ctx, id, x, y, ang, face, s = 1, rc = 0) {
  if (!BODY[id]) id = 'pistol';
  ctx.save(); ctx.translate(x, y); ctx.scale(face * s, s); ctx.rotate(ang);
  const im = sprite(id);
  if (im) {
    ctx.drawImage(im, BX, BY, BW, BH);
    if (id === 'pistol') ctx.drawImage(sprite('pistolSlide'), BX - rc * 4.5, BY, BW, BH);
    if (id === 'shotgun') ctx.drawImage(sprite('shotgunPump'), BX - Math.sin(Math.min(1, rc) * Math.PI) * 7, BY, BW, BH);
  }
  ctx.restore();
}
export const GUN_IDS = Object.keys(GUN_GEOM);
