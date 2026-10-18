/**
 * さんすうシューター レンダラー
 * 爽快なレーン、ゲート、ブロック、弾幕、マズルフラッシュの描画
 */

import { getGateText, isGoodGate } from './rules.js?v=8';

export const LANE_FRAC = 0.8;

/** どんな ときも おなじ かたち（けしきが ちらつかない）になる かんたんな ハッシュ */
function hash(n) {
  n = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b);
  n ^= n >>> 13;
  n = Math.imul(n, 0xc2b2ae35);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

const THEME_STYLE = {
  meadow: {
    groundTop: '#8fdc7a', groundBottom: '#4fae4c', groundStripe: 'rgba(255,255,255,0.05)',
    road: '#59606e', roadEdge: '#454b57', roadTile: 'rgba(255,255,255,0.045)', dash: 'rgba(255,255,255,0.35)',
    curbA: '#f8fafc', curbB: '#ef4444', cloud: 'rgba(20,60,30,0.13)', haze: 'rgba(224,242,254,0.55)',
    density: 0.72, decor: ['tree', 'tree', 'bush', 'flowers', 'rock', 'bush'],
  },
  desert: {
    groundTop: '#f6d58d', groundBottom: '#e2b563', groundStripe: 'rgba(160,100,30,0.07)',
    road: '#7b6a58', roadEdge: '#625445', roadTile: 'rgba(255,255,255,0.05)', dash: 'rgba(255,248,220,0.4)',
    curbA: '#fff7ed', curbB: '#f97316', cloud: 'rgba(120,60,10,0.12)', haze: 'rgba(255,237,190,0.6)',
    density: 0.7, decor: ['cactus', 'cactus', 'dune', 'rockSand', 'dune', 'cactus'],
  },
  space: {
    groundTop: '#0a0d2e', groundBottom: '#241b5e', groundStripe: 'rgba(120,100,255,0.05)',
    road: '#262a63', roadEdge: '#1b1e4a', roadTile: 'rgba(130,150,255,0.07)', dash: 'rgba(125,240,255,0.5)',
    grid: 'rgba(125,240,255,0.14)', curbA: '#22d3ee', curbB: '#d946ef', cloud: '', haze: 'rgba(10,13,46,0.7)',
    density: 0.62, decor: ['planet', 'crystal', 'asteroid', 'crystal', 'planet', 'asteroid'],
  },
};

const FLOWER_COLORS = ['#fb7185', '#fde047', '#f9a8d4', '#fff', '#fdba74'];
const shadow = (ctx, x, y, rx, ry) => { ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.beginPath(); ctx.ellipse(x + 3, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); };
const circle = (ctx, x, y, r, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };

const DECOR = {
  tree(ctx, x, y, s) {
    shadow(ctx, x, y + 14 * s, 17 * s, 7 * s);
    ctx.fillStyle = '#7c4a21'; ctx.fillRect(x - 3 * s, y, 6 * s, 15 * s);
    circle(ctx, x, y - 4 * s, 18 * s, '#2f8f46');
    circle(ctx, x - 6 * s, y - 10 * s, 13 * s, '#3fae57');
    circle(ctx, x + 7 * s, y - 6 * s, 11 * s, '#46b95e');
    circle(ctx, x - 8 * s, y - 14 * s, 5 * s, '#86e08a');
  },
  bush(ctx, x, y, s) {
    shadow(ctx, x, y + 8 * s, 15 * s, 5 * s);
    circle(ctx, x - 7 * s, y + 1 * s, 10 * s, '#2f8f46');
    circle(ctx, x + 7 * s, y + 2 * s, 9 * s, '#3fae57');
    circle(ctx, x, y - 4 * s, 10 * s, '#46b95e');
    circle(ctx, x - 3 * s, y - 7 * s, 3.5 * s, '#9aea9a');
  },
  flowers(ctx, x, y, s, r) {
    for (let i = 0; i < 5; i++) {
      const fx = x + (hash(i + r * 99) - 0.5) * 26, fy = y + (hash(i + 7 + r * 99) - 0.5) * 26;
      ctx.fillStyle = '#2f8f46'; ctx.fillRect(fx - 0.8, fy, 1.6, 6);
      circle(ctx, fx, fy, 4 * s, FLOWER_COLORS[(i + Math.floor(r * 10)) % FLOWER_COLORS.length]);
      circle(ctx, fx, fy, 1.6 * s, '#f59e0b');
    }
  },
  rock(ctx, x, y, s) {
    shadow(ctx, x, y + 8 * s, 15 * s, 5 * s);
    ctx.fillStyle = '#8b94a3'; ctx.beginPath(); ctx.ellipse(x, y, 14 * s, 10 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#b4bcc9'; ctx.beginPath(); ctx.ellipse(x - 3 * s, y - 3 * s, 8 * s, 5 * s, -0.3, 0, Math.PI * 2); ctx.fill();
  },
  cactus(ctx, x, y, s) {
    shadow(ctx, x, y + 16 * s, 14 * s, 5 * s);
    ctx.fillStyle = '#3d9a52'; ctx.strokeStyle = '#2a7a3e'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(x - 5 * s, y - 20 * s, 10 * s, 36 * s, 5 * s); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(x - 15 * s, y - 8 * s, 8 * s, 18 * s, 4 * s); ctx.fill(); ctx.stroke();
    ctx.fillRect(x - 12 * s, y + 4 * s, 9 * s, 5 * s);
    ctx.beginPath(); ctx.roundRect(x + 7 * s, y - 14 * s, 8 * s, 16 * s, 4 * s); ctx.fill(); ctx.stroke();
    ctx.fillRect(x + 3 * s, y - 2 * s, 8 * s, 5 * s);
    ctx.fillStyle = '#86d79a'; ctx.fillRect(x - 2 * s, y - 16 * s, 2 * s, 26 * s);
    circle(ctx, x, y - 21 * s, 2.5 * s, '#f472b6');
  },
  dune(ctx, x, y, s) {
    ctx.fillStyle = 'rgba(190,130,50,0.35)'; ctx.beginPath(); ctx.ellipse(x, y + 4, 26 * s, 10 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,200,0.55)'; ctx.beginPath(); ctx.ellipse(x - 3, y, 22 * s, 7 * s, 0, Math.PI, 0); ctx.fill();
  },
  rockSand(ctx, x, y, s) {
    shadow(ctx, x, y + 8 * s, 15 * s, 5 * s);
    ctx.fillStyle = '#b07a4a'; ctx.beginPath(); ctx.ellipse(x, y, 14 * s, 10 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d6a672'; ctx.beginPath(); ctx.ellipse(x - 3 * s, y - 3 * s, 8 * s, 5 * s, -0.3, 0, Math.PI * 2); ctx.fill();
  },
  planet(ctx, x, y, s, r) {
    const R = 15 * s, hue = Math.floor(r * 360);
    const g = ctx.createRadialGradient(x - R * 0.4, y - R * 0.4, R * 0.1, x, y, R);
    g.addColorStop(0, `hsl(${hue},85%,75%)`); g.addColorStop(1, `hsl(${(hue + 40) % 360},70%,38%)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, y, R * 1.6, R * 0.4, -0.4, 0, Math.PI * 2); ctx.stroke();
  },
  crystal(ctx, x, y, s) {
    ctx.fillStyle = 'rgba(34,211,238,0.25)'; ctx.beginPath(); ctx.ellipse(x, y + 12 * s, 14 * s, 5 * s, 0, 0, Math.PI * 2); ctx.fill();
    for (const [dx, hh, c] of [[-7, 20, '#67e8f9'], [0, 30, '#a5f3fc'], [7, 17, '#22d3ee']]) {
      ctx.fillStyle = c; ctx.beginPath();
      ctx.moveTo(x + dx * s - 5 * s, y + 12 * s); ctx.lineTo(x + dx * s, y + 12 * s - hh * s); ctx.lineTo(x + dx * s + 5 * s, y + 12 * s); ctx.closePath(); ctx.fill();
    }
  },
  asteroid(ctx, x, y, s) {
    ctx.fillStyle = '#6b6f9c'; ctx.beginPath(); ctx.ellipse(x, y, 13 * s, 10 * s, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#9498c4'; ctx.beginPath(); ctx.ellipse(x - 3 * s, y - 3 * s, 7 * s, 4 * s, 0.1, 0, Math.PI * 2); ctx.fill();
    circle(ctx, x + 4 * s, y + 2 * s, 2 * s, '#4c4f7a');
  },
};

// ---- モンスターの ずかん（ティア0=よわい 1=ふつう 2=つよい） ----
const MONSTER_POOL = [['slime', 'bat', 'slime'], ['zombie', 'cyclops', 'zombie'], ['cyclops', 'zombie', 'cyclops']];
const MONSTER_PAL = {
  slime: [['#86efac', '#22c55e'], ['#7dd3fc', '#0ea5e9'], ['#fda4af', '#f43f5e']],
  bat: [['#a78bfa', '#6d28d9'], ['#94a3b8', '#475569']],
  zombie: [['#bef264', '#65a30d', '#60a5fa'], ['#86efac', '#16a34a', '#f472b6'], ['#d9f99d', '#84cc16', '#fbbf24']],
  cyclops: [['#fdba74', '#ea580c'], ['#c4b5fd', '#7c3aed'], ['#5eead4', '#0d9488']],
};
function strHash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0); }
/** ブロックの しゅるい（kind）と いろ（pal）。id が おなじなら いつも おなじ */
export function monsterOf(block) {
  const tier = block.maxHp < 40 ? 0 : block.maxHp < 120 ? 1 : 2;
  const h = strHash(block.id || 'x');
  const kind = MONSTER_POOL[tier][h % MONSTER_POOL[tier].length];
  return { tier, h, kind, pal: MONSTER_PAL[kind][(h >>> 3) % MONSTER_PAL[kind].length] };
}
export const MONSTER_KINDS = Object.keys(MONSTER_PAL);
export { strHash, MONSTER_POOL };
export function fmtHp(hp) {
  const n = Math.max(0, Math.ceil(hp));
  if (n < 1000) return String(n);
  if (n < 10000) return (Math.ceil(n / 100) / 10).toFixed(1) + 'k';
  if (n < 1000000) return Math.ceil(n / 1000) + 'k';
  return (Math.ceil(n / 100000) / 10).toFixed(1) + 'M';
}
function bodyFill(ctx, hit, c1, c2, y0, y1) {
  if (hit) { ctx.fillStyle = '#fffbe6'; return; }
  const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, c1); g.addColorStop(1, c2); ctx.fillStyle = g;
}
function eye(ctx, x, y, r, hit, pr = 0.5) {
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 2.5; ctx.stroke();
  ctx.fillStyle = '#1f1b2e'; ctx.beginPath(); ctx.arc(x + 0.5, y + 1, r * pr, 0, Math.PI * 2); ctx.fill();
}
function brow(ctx, x, y, dir, len = 9) { ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(x - dir * len * 0.5, y - 2); ctx.lineTo(x + dir * len * 0.6, y + 3); ctx.stroke(); }
function horn(ctx, x, y, dir, big, hit) {
  ctx.fillStyle = hit ? '#fff' : '#fff7ed'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x - dir * 5, y + 4); ctx.lineTo(x + dir * 3, y - (big ? 14 : 9)); ctx.lineTo(x + dir * 8, y + 5); ctx.closePath(); ctx.fill(); ctx.stroke();
}
const MONSTER_DRAW = {
  slime(ctx, [c1, c2], tier, hit) {
    ctx.beginPath();
    ctx.moveTo(-32, 24); ctx.bezierCurveTo(-37, 4, -24, -27, 0, -27); ctx.bezierCurveTo(24, -27, 37, 4, 32, 24); ctx.quadraticCurveTo(0, 31, -32, 24); ctx.closePath();
    bodyFill(ctx, hit, c1, c2, -27, 28); ctx.fill(); ctx.stroke();
    if (!hit) { ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.ellipse(-17, -15, 7, 4, -0.6, 0, Math.PI * 2); ctx.fill(); }
    eye(ctx, -10, -13, 6, hit); eye(ctx, 10, -13, 6, hit);
    if (tier >= 1) { brow(ctx, -10, -22, -1); brow(ctx, 10, -22, 1); }
    if (tier >= 2) { horn(ctx, -17, -23, -1, false, hit); horn(ctx, 17, -23, 1, false, hit); }
  },
  bat(ctx, [c1, c2], tier, hit, t) {
    const fl = Math.sin(t * 11) * 6;
    for (const sx of [-1, 1]) { // はね（ぱたぱた）
      ctx.beginPath();
      ctx.moveTo(sx * 14, -6); ctx.lineTo(sx * 40, -20 + fl); ctx.quadraticCurveTo(sx * 34, -8 + fl, sx * 42, 0 + fl);
      ctx.quadraticCurveTo(sx * 32, 0 + fl * 0.6, sx * 35, 12 + fl * 0.4); ctx.quadraticCurveTo(sx * 24, 6, sx * 14, 12); ctx.closePath();
      ctx.fillStyle = hit ? '#fffbe6' : c2; ctx.fill(); ctx.stroke();
    }
    ctx.beginPath(); ctx.ellipse(0, 2, 22, 25, 0, 0, Math.PI * 2);
    bodyFill(ctx, hit, c1, c2, -23, 27); ctx.fill(); ctx.stroke();
    for (const sx of [-1, 1]) { // みみ
      ctx.fillStyle = hit ? '#fff' : c1; ctx.beginPath(); ctx.moveTo(sx * 6, -20); ctx.lineTo(sx * 15, -34); ctx.lineTo(sx * 19, -15); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    eye(ctx, -8, -10, 5.5, hit); eye(ctx, 8, -10, 5.5, hit);
    ctx.fillStyle = '#fff'; ctx.lineWidth = 2;
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx * 6 - 2.5, -1); ctx.lineTo(sx * 6, 5); ctx.lineTo(sx * 6 + 2.5, -1); ctx.closePath(); ctx.fill(); }
    if (tier >= 1) { brow(ctx, -8, -19, -1, 8); brow(ctx, 8, -19, 1, 8); }
  },
  zombie(ctx, [c1, c2, shirt], tier, hit) {
    // うで（まえに ならえ）
    for (const sx of [-1, 1]) { ctx.fillStyle = hit ? '#fffbe6' : c2; ctx.beginPath(); ctx.roundRect(sx > 0 ? 25 : -39, -2, 14, 11, 5); ctx.fill(); ctx.stroke(); }
    // シャツ（やぶれた すそ）
    ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(26, 0); ctx.lineTo(27, 22);
    for (let i = 0; i < 5; i++) ctx.lineTo(27 - (i + 1) * 10.8, i % 2 ? 22 : 28);
    ctx.lineTo(-27, 22); ctx.closePath(); ctx.fillStyle = hit ? '#fffbe6' : shirt; ctx.fill(); ctx.stroke();
    // あたま
    ctx.beginPath(); ctx.roundRect(-27, -28, 54, 31, 11);
    bodyFill(ctx, hit, c1, c2, -28, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = hit ? '#fff' : '#3f3f46'; ctx.lineWidth = 2.5; // かみの け
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 12 - 6, -27); ctx.lineTo(i * 12 - 1, -37 + Math.abs(i) * 3); ctx.lineTo(i * 12 + 6, -27); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    eye(ctx, -10, -15, 6.5, hit, 0.4); eye(ctx, 11, -14, 4.5, hit, 0.5);
    if (tier >= 1) { brow(ctx, -10, -24, -1); brow(ctx, 11, -22, 1, 7); }
    // わらい くち（ギザギザ）と ぬい め
    ctx.fillStyle = '#fff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-10, -5); ctx.lineTo(10, -5); ctx.lineTo(8, -1); ctx.lineTo(4, -4); ctx.lineTo(0, -1); ctx.lineTo(-4, -4); ctx.lineTo(-8, -1); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(17, -24); ctx.lineTo(23, -19); ctx.moveTo(21, -25); ctx.lineTo(19, -17); ctx.stroke();
    if (tier >= 2) { ctx.fillStyle = hit ? '#fff' : '#94a3b8'; ctx.beginPath(); ctx.roundRect(-20, -34, 40, 9, 4); ctx.fill(); ctx.lineWidth = 2.5; ctx.stroke(); } // ヘルメット
  },
  cyclops(ctx, [c1, c2], tier, hit) {
    if (tier >= 1) { horn(ctx, -18, -20, -1, tier >= 2, hit); horn(ctx, 18, -20, 1, tier >= 2, hit); }
    ctx.beginPath(); ctx.roundRect(-31, -25, 62, 53, 23);
    bodyFill(ctx, hit, c1, c2, -25, 28); ctx.fill(); ctx.stroke();
    // おおきな ひとつめ
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -12, 11, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = hit ? '#f59e0b' : '#16a34a'; ctx.beginPath(); ctx.arc(1, -11, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1f1b2e'; ctx.beginPath(); ctx.arc(1.5, -10.5, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-1, -13.5, 1.6, 0, Math.PI * 2); ctx.fill();
    if (tier >= 1) { ctx.strokeStyle = '#1f1b2e'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(-10, -26); ctx.lineTo(0, -22); ctx.lineTo(10, -26); ctx.stroke(); }
    // はを みせて にこっ
    ctx.fillStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-5, 3); ctx.lineTo(5, 3); ctx.lineTo(3, 8); ctx.lineTo(0, 5); ctx.lineTo(-3, 8); ctx.closePath(); ctx.fill(); ctx.stroke();
  },
};

export class RunnerRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  render(engine, logicalWidth, logicalHeight) {
    const ctx = this.ctx;
    const dpr = window.devicePixelRatio || 1;
    const w = logicalWidth || (this.canvas.width / dpr);
    const h = logicalHeight || (this.canvas.height / dpr);

    this.time = engine.time;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // コース背景（未来感のあるクリーンなストライプレーザー）
    this.drawTrack(w, h, engine.dist, engine.course.theme, engine.time);

    // コース要素（奥から手前へ描画）
    this.drawCourseElements(w, h, engine);

    // 弾丸の描画
    this.drawBullets(w, h, engine);

    // ゲートの かず（たまの うえ。よみやすく）
    this.drawGateLabels();

    // プレイヤー（銃）の描画
    this.drawPlayer(w, h, engine);

    // パーティクルの描画
    this.drawParticles(w, h, engine);

    // ゲート通過エフェクト
    this.drawGateEffects(w, h, engine);

    ctx.restore();
  }

  drawTrack(w, h, dist, theme = 'meadow', time = 0) {
    const ctx = this.ctx;
    const T = THEME_STYLE[theme] || THEME_STYLE.meadow;
    const laneWidth = w * LANE_FRAC;
    const leftX = (w - laneWidth) / 2;
    const rightX = leftX + laneWidth;
    const py = h * 0.82; // プレイヤーの がめん いち
    const toY = wy => py - (wy - dist);

    // ① じめん（グラデーション＋ながれる しましま）
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, T.groundTop);
    bg.addColorStop(1, T.groundBottom);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    const band = 140, k0 = Math.floor((dist - (h - py) - 20) / band), k1 = Math.ceil((dist + py + 20) / band);
    ctx.fillStyle = T.groundStripe;
    for (let k = k0; k <= k1; k++) if (k % 2 === 0) ctx.fillRect(0, toY((k + 1) * band), w, band);

    // ② かざり（みぎ・ひだりの はし。みちの うしろに かくれる）
    this.drawDecor(ctx, w, h, dist, theme, T, leftX, rightX, toY);

    // ③ みち
    const road = ctx.createLinearGradient(leftX, 0, rightX, 0);
    road.addColorStop(0, T.roadEdge);
    road.addColorStop(0.5, T.road);
    road.addColorStop(1, T.roadEdge);
    ctx.fillStyle = road;
    ctx.fillRect(leftX, 0, laneWidth, h);
    // タイルの おびが ながれる
    const tile = 90, t0 = Math.floor((dist - (h - py) - 20) / tile), t1 = Math.ceil((dist + py + 20) / tile);
    ctx.fillStyle = T.roadTile;
    for (let k = t0; k <= t1; k++) if (k % 2 === 0) ctx.fillRect(leftX, toY((k + 1) * tile), laneWidth, tile);
    if (T.grid) { // うちゅうは ネオンの あみめ
      ctx.strokeStyle = T.grid; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let k = t0; k <= t1 + 1; k++) { const y = toY(k * tile); ctx.moveTo(leftX, y); ctx.lineTo(rightX, y); }
      for (let i = 1; i < 4; i++) { const x = leftX + laneWidth * i / 4; ctx.moveTo(x, 0); ctx.lineTo(x, h); }
      ctx.stroke();
    }
    // まんなかの てんせん
    ctx.strokeStyle = T.dash; ctx.lineWidth = 3;
    ctx.setLineDash([22, 20]); ctx.lineDashOffset = ((dist % 42) + 42) % 42;
    ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke();
    ctx.setLineDash([]);

    // ④ ふち（あか・しろの ブロックが ながれる）
    const cw = 9, cl = 36, c0 = Math.floor((dist - (h - py) - 20) / cl), c1 = Math.ceil((dist + py + 20) / cl);
    for (let k = c0; k <= c1; k++) {
      const y = toY((k + 1) * cl);
      ctx.fillStyle = k % 2 === 0 ? T.curbA : T.curbB;
      ctx.fillRect(leftX - cw, y, cw, cl); ctx.fillRect(rightX, y, cw, cl);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(leftX - 1, 0, 1.5, h); ctx.fillRect(rightX - 0.5, 0, 1.5, h);
    // みちの はしの かげ
    const sh = ctx.createLinearGradient(leftX, 0, leftX + 16, 0);
    sh.addColorStop(0, 'rgba(0,0,0,0.28)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sh; ctx.fillRect(leftX, 0, 16, h);
    const sh2 = ctx.createLinearGradient(rightX, 0, rightX - 16, 0);
    sh2.addColorStop(0, 'rgba(0,0,0,0.28)'); sh2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sh2; ctx.fillRect(rightX - 16, 0, 16, h);

    // ⑤ くもの かげ／ほし（ゆっくり ながれる）
    this.drawAtmosphere(ctx, w, h, dist, theme, T, time);

    // ⑥ とおくが かすむ（おくゆき）
    const haze = ctx.createLinearGradient(0, 0, 0, h * 0.4);
    haze.addColorStop(0, T.haze);
    haze.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, w, h * 0.4);
  }

  drawDecor(ctx, w, h, dist, theme, T, leftX, rightX, toY) {
    const cell = 64;
    const k0 = Math.floor((dist - (h * 0.18) - 80) / cell), k1 = Math.ceil((dist + h * 0.82 + 80) / cell);
    const margin = leftX - 9; // みちの そとの はば
    for (let k = k0; k <= k1; k++) {
      for (let side = 0; side < 2; side++) {
        const r = hash(k * 2 + side + 17);
        if (r > T.density) continue;
        const kind = Math.floor(hash(k * 7 + side * 13 + 3) * T.decor.length);
        const size = 0.75 + hash(k * 5 + side * 11 + 9) * 0.55;
        const dx = (hash(k * 3 + side * 29 + 5) - 0.5) * margin * 0.5;
        const cx = side === 0 ? margin * 0.5 + dx : w - margin * 0.5 + dx;
        const cy = toY((k + hash(k * 11 + side + 1)) * cell);
        DECOR[T.decor[kind]](ctx, cx, cy, size, hash(k * 19 + side), margin, theme);
      }
    }
  }

  drawAtmosphere(ctx, w, h, dist, theme, T, time) {
    if (theme === 'space') {
      // ちいさな ほしが ちかちか（ゆっくり ながれる）
      for (let i = 0; i < 26; i++) {
        const sx = hash(i * 3 + 1) * w;
        const sy = ((hash(i * 3 + 2) * h * 1.2 + dist * (0.12 + hash(i) * 0.25)) % (h * 1.2));
        const tw = 0.45 + 0.55 * Math.abs(Math.sin(time * 2 + i));
        ctx.fillStyle = `rgba(255,255,255,${(0.25 + 0.55 * hash(i + 40)) * tw})`;
        const sz = 1 + hash(i + 80) * 1.6;
        ctx.fillRect(sx, h * 1.2 - sy - h * 0.1, sz, sz);
      }
      return;
    }
    // くもの かげ
    ctx.fillStyle = T.cloud;
    for (let i = 0; i < 4; i++) {
      const cy = ((hash(i + 5) * h * 1.6 + dist * 0.45) % (h * 1.6));
      const cx = (hash(i + 9) * w * 1.4 + time * 6 * (1 + i * 0.2)) % (w * 1.4) - w * 0.2;
      ctx.beginPath();
      ctx.ellipse(cx, h * 1.6 - cy - h * 0.3, 52 + hash(i) * 30, 22 + hash(i + 2) * 12, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 34, h * 1.6 - cy - h * 0.3 + 6, 36, 17, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  worldToScreen(w, h, normX, worldY, playerDist) {
    const laneWidth = w * LANE_FRAC;
    const screenX = w / 2 + normX * (laneWidth / 2);
    // プレイヤーの位置を画面下部 (h * 0.82) に配置
    const playerScreenY = h * 0.82;
    const screenY = playerScreenY - (worldY - playerDist);
    return { x: screenX, y: screenY };
  }

  drawCourseElements(w, h, engine) {
    const ctx = this.ctx;
    const laneWidth = w * LANE_FRAC;

    // ゲートとブロック
    for (const el of engine.course.elements) {
      if (el.type === 'GATE_PAIR') {
        const p = this.worldToScreen(w, h, 0, el.y, engine.dist);
        if (p.y > -80 && p.y < h + 80) {
          this.drawGatePair(ctx, w, p.y, el, laneWidth);
        }
      } else if (el.type === 'BLOCK' && !el.destroyed) {
        const p = this.worldToScreen(w, h, el.laneNorm, el.y, engine.dist);
        if (p.y > -60 && p.y < h + 60) {
          this.drawBlock(ctx, p.x, p.y, el);
        }
      }
    }

    // ゴールライン
    const finishPos = this.worldToScreen(w, h, 0, engine.course.finishY, engine.dist);
    if (finishPos.y > -50 && finishPos.y < h + 50) {
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect((w - laneWidth) / 2, finishPos.y - 8, laneWidth, 16);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🏁 GOAL 🏁', w / 2, finishPos.y + 4);
    }

    // 倍率ウォール
    for (const wall of engine.course.walls) {
      if (!wall.destroyed) {
        const p = this.worldToScreen(w, h, 0, wall.y, engine.dist);
        if (p.y > -80 && p.y < h + 80) {
          this.drawWall(ctx, w / 2, p.y, wall, laneWidth);
        }
      }
    }
  }

  drawGatePair(ctx, w, y, gatePair, laneWidth) {
    const half = laneWidth / 2;
    const gateW = half - 6;
    const gateH = 58;

    // 左ゲート
    const lx = w / 2 - half + 3;
    this.drawSingleGate(ctx, lx, y - gateH / 2, gateW, gateH, gatePair.left);

    // 右ゲート
    const rx = w / 2 + 3;
    this.drawSingleGate(ctx, rx, y - gateH / 2, gateW, gateH, gatePair.right);
  }

  drawSingleGate(ctx, x, y, w, h, gate) {
    const isGood = isGoodGate(gate);
    const mainColor = isGood ? '#3b82f6' : '#ef4444';
    const bgGrad = ctx.createLinearGradient(x, y, x, y + h);
    bgGrad.addColorStop(0, isGood ? 'rgba(59, 130, 246, 0.85)' : 'rgba(239, 68, 68, 0.85)');
    bgGrad.addColorStop(1, isGood ? 'rgba(29, 78, 216, 0.95)' : 'rgba(185, 28, 28, 0.95)');

    ctx.save();
    ctx.shadowColor = mainColor;
    ctx.shadowBlur = 10;
    ctx.fillStyle = bgGrad;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // ゲート文字は たまの うえに かく（drawGateLabels）
    (this.gateLabels || (this.gateLabels = [])).push({ x: x + w / 2, y: y + h / 2, gate });
  }

  /** ゲートの かず：おおきく・ふち つき。たまが あたると ぷるんと おおきくなる */
  drawGateLabels() {
    const ctx = this.ctx, list = this.gateLabels || [];
    for (const L of list) {
      const k = 1 + Math.max(0, L.gate.pulse || 0) * 1.1;
      ctx.save();
      ctx.translate(L.x, L.y);
      ctx.scale(k, k);
      ctx.font = '900 34px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 6;
      ctx.strokeStyle = isGoodGate(L.gate) ? '#0b2a6b' : '#5b0f0f';
      ctx.strokeText(getGateText(L.gate), 0, 1);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(getGateText(L.gate), 0, 1);
      ctx.restore();
    }
    list.length = 0;
  }

  // ---- v1.4.0 モンスターの まと（ゾンビ・スライム・ひとつめ・こうもり。かわいい・こわくない・ちは でない） ----
  // しゅるいは ブロックごとに きまる（id の ハッシュ）。HPの おおきさ（ティア）で なかまが かわり、つよい ほど つの・まゆ が つく。
  drawBlock(ctx, x, y, block) {
    const bw = 66, bh = 56;
    const ratio = block.hp / Math.max(1, block.maxHp);
    const { tier, h, kind, pal } = monsterOf(block);
    const hit = block.flash > 0;
    const k = hit ? 1.1 : 1;
    const t = this.time || 0;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(k, k);
    // じめんの かげ（shadowBlur は つかわない：スマホで かるく）
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath(); ctx.ellipse(0, bh / 2 - 1, 29, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#1f1b2e';
    MONSTER_DRAW[kind](ctx, pal, tier, hit, t + (h % 7));
    // HPバー
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(-bw / 2 + 6, bh / 2 - 6, bw - 12, 5);
    ctx.fillStyle = ratio > 0.5 ? '#86efac' : ratio > 0.25 ? '#fde047' : '#fca5a5';
    ctx.fillRect(-bw / 2 + 6, bh / 2 - 6, (bw - 12) * Math.max(0, ratio), 5);
    // HPの かず（おおきく・ふち つき）
    ctx.font = '900 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = '#1f1b2e';
    const tx = String(Math.max(1, Math.ceil(block.hp)));
    ctx.strokeText(tx, 0, 10);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(tx, 0, 10);
    ctx.restore();
  }

  /** さいごの かべ：おおきな ボスもんすた（つの・おおきな め・きば）。×と HPの もじは そのまま よみやすく */
  drawWall(ctx, cx, y, wall, laneWidth) {
    const ww = laneWidth - 20;
    const wh = 62;
    const colors = [['#fbbf24', '#d97706'], ['#34d399', '#059669'], ['#60a5fa', '#2563eb'], ['#a78bfa', '#6d28d9'], ['#f472b6', '#be185d']];
    const [c1, c2] = colors[Math.floor(wall.mult) % colors.length];
    const hit = wall.flash > 0;
    const k = hit ? 1.03 : 1;

    ctx.save();
    ctx.translate(cx, y);
    ctx.scale(k, k);
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#1f1b2e';
    // つの
    ctx.fillStyle = hit ? '#ffffff' : '#fff7ed';
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx * ww * 0.22, -wh / 2 + 3); ctx.lineTo(sx * ww * 0.34, -wh / 2 - 17); ctx.lineTo(sx * ww * 0.40, -wh / 2 + 5);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    if (wall.mult >= 15) { // さいごの かべは かんむり
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.moveTo(-18, -wh / 2 + 2); ctx.lineTo(-20, -wh / 2 - 13); ctx.lineTo(-9, -wh / 2 - 5); ctx.lineTo(0, -wh / 2 - 16); ctx.lineTo(9, -wh / 2 - 5); ctx.lineTo(20, -wh / 2 - 13); ctx.lineTo(18, -wh / 2 + 2);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    // からだ
    const g = ctx.createLinearGradient(0, -wh / 2, 0, wh / 2);
    g.addColorStop(0, hit ? '#ffffff' : c1);
    g.addColorStop(1, hit ? '#fde68a' : c2);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.roundRect(-ww / 2, -wh / 2, ww, wh, 20); ctx.fill(); ctx.stroke();
    // おおきな め（にらむ けど かわいい）
    for (const sx of [-1, 1]) {
      const ex = sx * ww * 0.17, ey = -wh / 2 + 17;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(ex, ey, 10, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#1f1b2e';
      ctx.beginPath(); ctx.arc(ex - sx * 1.5, ey + 2, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(ex - sx * 12, ey - 12 - 2); ctx.lineTo(ex + sx * 10, ey - 8 + 2 * 0); ctx.stroke();
    }
    // きば（したから）
    ctx.fillStyle = '#fff';
    ctx.lineWidth = 2.5;
    const n = Math.max(5, Math.round(ww / 34));
    for (let i = 0; i < n; i++) {
      const fx = -ww / 2 + 16 + (ww - 32) * (i + 0.5) / n;
      ctx.beginPath(); ctx.moveTo(fx - 5, wh / 2 - 2); ctx.lineTo(fx, wh / 2 - 11); ctx.lineTo(fx + 5, wh / 2 - 2); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    // ×と HP
    ctx.font = '900 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 5;
    const lab = `×${wall.mult}  [${fmtHp(wall.hp)}]`;
    ctx.strokeStyle = '#1f1b2e';
    ctx.strokeText(lab, 0, 9);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(lab, 0, 9);
    ctx.restore();
  }

  drawBullets(w, h, engine) {
    const ctx = this.ctx;
    ctx.save();
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 4;
    for (const b of engine.bullets) {
      const p = this.worldToScreen(w, h, b.laneNorm, b.y, engine.dist);
      if (p.y > -20 && p.y < h) {
        // ほそい たま（よこ 3px・たて 16px）。まんなかは しろく
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(p.x - 1.6, p.y - 8, 3.2, 16);
        ctx.fillStyle = '#fffbeb';
        ctx.fillRect(p.x - 0.6, p.y - 8, 1.2, 12);
      }
    }
    ctx.restore();
  }

  drawPlayer(w, h, engine) {
    const ctx = this.ctx;
    const p = this.worldToScreen(w, h, engine.playerX, engine.dist, engine.dist);

    ctx.save();
    ctx.translate(p.x, p.y);

    // 銃の描画（コミカルなブラスターキャノン）
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;

    // 銃身
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-8, -26, 16, 20);
    // マズル
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(-10, -32, 20, 8);
    // 本体
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(-16, -10, 32, 24, 6);
    ctx.fill();

    // 弾数バッジ（頭上に大きく表示）
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 4;
    ctx.font = '900 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`x${engine.bulletCount}`, 0, -42);

    ctx.restore();
  }

  drawParticles(w, h, engine) {
    const ctx = this.ctx;
    for (const p of engine.particles) {
      const sp = this.worldToScreen(w, h, p.x, p.y, engine.dist);
      ctx.save();
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawGateEffects(w, h, engine) {
    const ctx = this.ctx;
    for (const g of engine.gateEffects) {
      const sp = this.worldToScreen(w, h, 0, g.y, engine.dist);
      ctx.save();
      ctx.font = '900 24px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = g.isGood ? '#60a5fa' : '#f87171';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 6;
      ctx.globalAlpha = g.life / 0.6;
      ctx.fillText(g.text, w / 2, sp.y - 30);
      ctx.restore();
    }
  }
}
