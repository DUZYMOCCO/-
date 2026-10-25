// v0.8.0：ステージ 17「よあけの こうや」の はいけい
// さいしょは まっくら → ひので の オレンジ → ボスの まえで あおぞら。
// そら・たいよう・ほし・くも は まいフレーム えがく。とおくの いわ・ちかくの もの・じめん は
// 「よる／あさやけ／ひる」の 3まいを つくって すすみぐあい で なめらかに まぜる。
import { H, GROUND } from './rules.js?v=8';

const TAU = Math.PI * 2;
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hash(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
const each = (cam, vw, step, off, fn) => { for (let i = Math.floor((cam - step - off) / step); i < (cam + vw + step) / step; i++) fn(i, i * step + off - cam); };
const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const mix = (a, b, u) => a.map((v, i) => Math.round(v + (b[i] - v) * u));
// p（0〜1）で 3つの いろ を まぜる（よる・あさやけ・ひる）
const mix3 = (A, B, C, p) => (p < 0.5 ? mix(A, B, p * 2) : mix(B, C, (p - 0.5) * 2));

// よる・あさやけ・ひる の いろ
export const DAWN_PALS = [
  { haze: '#1c2142', far: '#141830', rock: '#10132a', edge: '#262a4c', cactus: '#0b0e1a', wood: '#15131e', ground: '#24222e', top: '#363246', dark: '#16141e', pebble: '#3a3648', line: '#07070c' },
  { haze: '#a2647c', far: '#6c3c54', rock: '#4c2a36', edge: '#ff9a5a', cactus: '#2a1a22', wood: '#3c2622', ground: '#8a5a46', top: '#c88a5c', dark: '#5a3a32', pebble: '#a8745c', line: '#1a0e12' },
  { haze: '#b4c6de', far: '#c69270', rock: '#b0724c', edge: '#ffdca6', cactus: '#3c6a3c', wood: '#7a5636', ground: '#d6a66c', top: '#ecc48a', dark: '#b07e4e', pebble: '#c49a6a', line: '#2a1a12' },
];

// ---- そら（まいフレーム）----
export function dawnSky(ctx, vw, D, t, cam) {
  const hy = GROUND - 30;
  const g = ctx.createLinearGradient(0, 0, 0, hy);
  g.addColorStop(0, rgb(D.top)); g.addColorStop(0.55, rgb(mix(D.top, D.hor, 0.45))); g.addColorStop(1, rgb(D.hor));
  ctx.fillStyle = g; ctx.fillRect(0, 0, vw, hy + 40);
  // ほし（だんだん きえる）
  if (D.stars > 0.01) {
    for (let i = 0; i < 90; i++) {
      const x = ((hash(i) * 1400 - cam * 0.02) % 1400 + 1400) % 1400 - 200, y = hash(i + 33) * 200;
      if (x < -2 || x > vw + 2) continue;
      const tw = 0.6 + 0.4 * Math.sin(t * (1.5 + hash(i + 7) * 3) + i);
      ctx.fillStyle = `rgba(230,234,255,${D.stars * tw * (0.35 + hash(i + 5) * 0.6) * (1 - y / 260)})`;
      const s = hash(i + 9) < 0.12 ? 2 : 1.2; ctx.fillRect(x, y, s, s);
    }
    // しずむ つき（ひだり うえ）
    const mx = vw * 0.16, my = 60 + (1 - D.stars) * 120;
    ctx.globalAlpha = D.stars;
    const mg = ctx.createRadialGradient(mx, my, 6, mx, my, 70); mg.addColorStop(0, 'rgba(200,210,255,0.35)'); mg.addColorStop(1, 'rgba(200,210,255,0)');
    ctx.fillStyle = mg; ctx.fillRect(mx - 70, my - 70, 140, 140);
    ctx.fillStyle = '#e8ecff'; ctx.beginPath(); ctx.arc(mx, my, 13, 0, TAU); ctx.fill();
    ctx.fillStyle = rgb(D.top); ctx.beginPath(); ctx.arc(mx + 6, my - 3, 11, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }
  // たいよう（ちへいせん の したから のぼる）
  const sx = vw * 0.7 - cam * 0.01 % 40, sy = D.sunY, p = D.p;
  const core = mix3([255, 90, 50], [255, 170, 70], [255, 250, 225], p), glowA = Math.max(0, Math.min(1, (p - 0.12) * 3)) * (1 - Math.max(0, p - 0.7) * 1.6);
  if (sy < hy + 40) {
    const R = 180 + glowA * 120, gg = ctx.createRadialGradient(sx, sy, 10, sx, sy, R);
    gg.addColorStop(0, rgb(core, 0.75 * Math.max(glowA, 0.3))); gg.addColorStop(0.35, rgb(mix(core, [255, 120, 60], 0.5), 0.3 * Math.max(glowA, 0.25))); gg.addColorStop(1, rgb(core, 0));
    ctx.fillStyle = gg; ctx.fillRect(sx - R, Math.max(0, sy - R), R * 2, Math.min(hy + 40, sy + R) - Math.max(0, sy - R));
    // ひかりの すじ（あさやけ の ときだけ）
    if (glowA > 0.05) {
      ctx.save(); ctx.globalAlpha = 0.12 * glowA; ctx.fillStyle = rgb(core); ctx.translate(sx, sy);
      for (let i = 0; i < 9; i++) { const a = -Math.PI * (0.08 + i * 0.105) + Math.sin(t * 0.3 + i) * 0.02; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a - 0.03) * 420, Math.sin(a - 0.03) * 420); ctx.lineTo(Math.cos(a + 0.03) * 420, Math.sin(a + 0.03) * 420); ctx.fill(); }
      ctx.restore();
    }
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, vw, hy + 6); ctx.clip();
    ctx.fillStyle = rgb(core); ctx.beginPath(); ctx.arc(sx, sy, 24, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,240,0.6)'; ctx.beginPath(); ctx.arc(sx, sy, 15, 0, TAU); ctx.fill();
    ctx.restore();
  }
  // くも（したがわ が ひかる）
  const cBody = mix3([34, 38, 66], [120, 70, 110], [246, 248, 255], p), cLit = mix3([60, 64, 100], [255, 160, 110], [255, 255, 255], p);
  for (let i = 0; i < 7; i++) {
    const w = 120 + hash(i + 70) * 160, x = ((hash(i + 60) * 1500 - cam * 0.05 - t * (2 + i)) % 1500 + 1500) % 1500 - 250, y = 34 + hash(i + 80) * 110;
    if (x > vw + 20 || x + w < -20) continue;
    ctx.fillStyle = rgb(cBody, 0.85); ctx.beginPath(); ctx.ellipse(x + w / 2, y, w / 2, 9 + hash(i) * 5, 0, 0, TAU); ctx.ellipse(x + w * 0.35, y - 6, w * 0.22, 9, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = rgb(cLit, 0.8); ctx.beginPath(); ctx.ellipse(x + w / 2 + 6, y + 5, w / 2 - 10, 3.5, 0, 0, TAU); ctx.fill();
  }
}

// ---- とおくの メサ（ひらたい いわやま）----
function dawnFar(x, w, P) { const R = rng(171);
  // いちばん とおく（かすむ）
  x.fillStyle = P.haze; x.beginPath(); x.moveTo(0, GROUND); let y = 210;
  for (let i = 0; i <= w; i += 20) { y = Math.max(170, Math.min(240, y + (R() - 0.5) * 22)); x.lineTo(i, y); } x.lineTo(w, GROUND); x.fill();
  // メサ（たいらな うえ・まっすぐな がけ）
  for (let i = 0; i < w; i += 170 + R() * 120) {
    const bw = 90 + R() * 130, top = 150 + R() * 50, sl = 14 + R() * 10;
    x.fillStyle = P.far; x.beginPath(); x.moveTo(i - sl, GROUND); x.lineTo(i, top + 8); x.lineTo(i + 6, top); x.lineTo(i + bw - 6, top); x.lineTo(i + bw, top + 8); x.lineTo(i + bw + sl, GROUND); x.fill();
    x.fillStyle = P.edge; x.globalAlpha = 0.35; x.fillRect(i + 6, top, bw - 12, 2); x.globalAlpha = 1;
    x.strokeStyle = 'rgba(0,0,0,0.12)'; x.lineWidth = 1; x.beginPath(); for (let k = 1; k < 4; k++) { x.moveTo(i + 2, top + k * 14); x.lineTo(i + bw - 2, top + k * 14 + (R() - 0.5) * 4); } x.stroke();
  }
  x.fillStyle = P.far; x.fillRect(0, 262, w, GROUND - 262);
}
// ---- ちかくの いわ・サボテン・ふうしゃ・でんちゅう ----
function cactus(x, cx, by, h, col, line) {
  x.fillStyle = line; x.lineJoin = 'round';
  const arm = (dx, ay, up) => { x.fillRect(cx + (dx > 0 ? 6 : dx - 6), ay, Math.abs(dx) + 1, 8); x.fillRect(cx + dx + (dx > 0 ? 0 : -8), ay - up, 8, up + 8); };
  for (const pass of [0, 1]) {
    x.fillStyle = pass ? col : line; const o = pass ? 0 : 2;
    x.beginPath(); x.roundRect ? x.roundRect(cx - 7 - o, by - h - o, 14 + o * 2, h + o, 7) : x.rect(cx - 7 - o, by - h - o, 14 + o * 2, h + o); x.fill();
    x.beginPath(); x.roundRect ? x.roundRect(cx + 6 - o, by - h * 0.55 - o, 14 + o * 2, 8 + o * 2, 4) : x.rect(cx + 6, by - h * 0.55, 14, 8); x.fill();
    x.beginPath(); x.roundRect ? x.roundRect(cx + 14 - o, by - h * 0.85 - o, 8 + o * 2, h * 0.32 + o * 2, 4) : x.rect(cx + 14, by - h * 0.85, 8, h * 0.32); x.fill();
    x.beginPath(); x.roundRect ? x.roundRect(cx - 20 - o, by - h * 0.42 - o, 14 + o * 2, 8 + o * 2, 4) : x.rect(cx - 20, by - h * 0.42, 14, 8); x.fill();
    x.beginPath(); x.roundRect ? x.roundRect(cx - 21 - o, by - h * 0.66 - o, 8 + o * 2, h * 0.26 + o * 2, 4) : x.rect(cx - 21, by - h * 0.66, 8, h * 0.26); x.fill();
  }
  x.strokeStyle = 'rgba(0,0,0,0.25)'; x.lineWidth = 1; x.beginPath(); x.moveTo(cx - 2, by - h + 6); x.lineTo(cx - 2, by - 2); x.moveTo(cx + 2, by - h + 6); x.lineTo(cx + 2, by - 2); x.stroke();
}
function dawnMid(x, w, P) { const R = rng(172);
  // いわの とう（ちかい）
  for (let i = 40; i < w; i += 260 + R() * 120) {
    const bw = 40 + R() * 50, top = 110 + R() * 70;
    x.fillStyle = P.line; x.beginPath(); x.moveTo(i - 4, GROUND); x.lineTo(i + 4, top + 20); x.lineTo(i + 10, top - 2); x.lineTo(i + bw - 6, top - 2); x.lineTo(i + bw + 2, top + 26); x.lineTo(i + bw + 10, GROUND); x.fill();
    x.fillStyle = P.rock; x.beginPath(); x.moveTo(i, GROUND); x.lineTo(i + 7, top + 20); x.lineTo(i + 12, top); x.lineTo(i + bw - 8, top); x.lineTo(i + bw - 1, top + 26); x.lineTo(i + bw + 6, GROUND); x.fill();
    // ひが あたる がわ（みぎ）
    x.fillStyle = P.edge; x.globalAlpha = 0.45; x.beginPath(); x.moveTo(i + bw - 8, top); x.lineTo(i + bw - 1, top + 26); x.lineTo(i + bw + 6, GROUND); x.lineTo(i + bw - 6, GROUND); x.lineTo(i + bw - 12, top + 20); x.fill(); x.globalAlpha = 1;
    x.strokeStyle = 'rgba(0,0,0,0.22)'; x.lineWidth = 1.2; x.beginPath(); for (let k = 1; k < 6; k++) { const yy = top + k * (GROUND - top) / 6; x.moveTo(i + 6, yy); x.lineTo(i + bw - 2, yy + (R() - 0.5) * 6); } x.stroke();
  }
  // でんちゅう と でんせん（かんばん なし）
  const poles = []; for (let i = 0; i < w; i += 210) poles.push(i + 30);
  x.strokeStyle = P.line; x.lineWidth = 1.2;
  for (let k = 0; k < poles.length - 1; k++) { const a = poles[k], b = poles[k + 1]; for (const yy of [96, 104]) { x.beginPath(); x.moveTo(a, yy); x.quadraticCurveTo((a + b) / 2, yy + 16, b, yy); x.stroke(); } }
  for (const px of poles) { x.fillStyle = P.line; x.fillRect(px - 3, 90, 6, GROUND - 90); x.fillRect(px - 16, 94, 32, 4); x.fillStyle = P.wood; x.fillRect(px - 1.5, 92, 3, GROUND - 94); }
  // ふうしゃ の ポンプ（さびた かざぐるま）
  for (let i = 300; i < w; i += 640) {
    x.strokeStyle = P.line; x.lineWidth = 3; x.beginPath(); x.moveTo(i - 26, GROUND); x.lineTo(i - 4, 120); x.moveTo(i + 26, GROUND); x.lineTo(i + 4, 120); x.moveTo(i - 20, 260); x.lineTo(i + 20, 220); x.moveTo(i + 20, 260); x.lineTo(i - 20, 220); x.moveTo(i - 14, 200); x.lineTo(i + 14, 170); x.stroke();
    x.fillStyle = P.line; x.beginPath(); x.arc(i, 112, 4, 0, TAU); x.fill();
    for (let b = 0; b < 12; b++) { const a = b / 12 * TAU; x.save(); x.translate(i, 112); x.rotate(a); x.fillStyle = P.line; x.fillRect(4, -3, 26, 6); x.fillStyle = P.wood; x.fillRect(6, -2, 22, 4); x.restore(); }
    x.fillStyle = P.line; x.beginPath(); x.moveTo(i + 2, 108); x.lineTo(i + 40, 104); x.lineTo(i + 40, 120); x.lineTo(i + 2, 116); x.fill();
  }
  // こわれた こや（いた の かべ）
  for (let i = 520; i < w; i += 640) {
    x.fillStyle = P.line; x.fillRect(i - 2, 228, 74, GROUND - 228); x.beginPath(); x.moveTo(i - 8, 230); x.lineTo(i + 34, 204); x.lineTo(i + 78, 232); x.fill();
    x.fillStyle = P.wood; x.fillRect(i, 232, 70, GROUND - 232);
    x.fillStyle = 'rgba(0,0,0,0.25)'; for (let k = 0; k < 70; k += 9) x.fillRect(i + k, 232, 1.5, GROUND - 232);
    x.fillStyle = P.line; x.fillRect(i + 26, 262, 18, GROUND - 262); x.fillRect(i + 8, 246, 12, 10);
  }
  // サボテン
  for (let i = 150; i < w; i += 200 + R() * 140) cactus(x, i, GROUND, 50 + R() * 40, P.cactus, P.line);
  // さく（いた）
  for (let i = 0; i < w; i += 24) { x.fillStyle = P.line; x.fillRect(i, GROUND - 26 - (i % 48 ? 0 : 4), 4, 26 + (i % 48 ? 0 : 4)); }
  x.fillStyle = P.line; x.fillRect(0, GROUND - 22, w, 3); x.fillRect(0, GROUND - 12, w, 3);
}
// ---- じめん（すな と いし）----
function dawnFloor(x, w, P) { const R = rng(173);
  x.fillStyle = P.ground; x.fillRect(0, GROUND - 4, w, H - GROUND + 4);
  x.fillStyle = P.top; x.fillRect(0, GROUND - 4, w, 5); x.fillStyle = P.line; x.fillRect(0, GROUND, w, 1.5);
  x.fillStyle = P.dark; for (let i = 0; i < 22; i++) { x.beginPath(); x.ellipse(R() * w, GROUND + 12 + R() * 44, 14 + R() * 40, 2 + R() * 3, 0, 0, TAU); x.fill(); }
  // わだち
  x.strokeStyle = P.dark; x.lineWidth = 2; x.beginPath(); x.moveTo(0, GROUND + 22); x.lineTo(w, GROUND + 22); x.moveTo(0, GROUND + 34); x.lineTo(w, GROUND + 34); x.stroke();
  // ひび と いし
  x.strokeStyle = 'rgba(0,0,0,0.25)'; x.lineWidth = 1; x.beginPath(); for (let i = 0; i < 10; i++) { const cx = R() * w, cy = GROUND + 8 + R() * 40; x.moveTo(cx, cy); x.lineTo(cx + 8, cy + 3); x.lineTo(cx + 14, cy - 1); } x.stroke();
  for (let i = 0; i < 40; i++) { x.fillStyle = i % 3 ? P.pebble : P.line; x.beginPath(); x.ellipse(R() * w, GROUND + 4 + R() * 52, 1.5 + R() * 3, 1 + R() * 2, 0, 0, TAU); x.fill(); }
  // ほね（どうぶつ の ほね・ちいさく）
  for (let i = 180; i < w; i += 330) { x.fillStyle = 'rgba(230,220,200,0.55)'; x.fillRect(i, GROUND + 14, 16, 2.4); x.beginPath(); x.arc(i, GROUND + 15, 2.4, 0, TAU); x.arc(i + 16, GROUND + 15, 2.4, 0, TAU); x.fill(); }
}
// ---- てまえ（うえ から かれた えだ が すこし）----
function dawnFore(x, w, P) { const R = rng(174);
  for (let i = 80; i < w; i += 360 + R() * 200) {
    x.strokeStyle = P.line; x.lineCap = 'round';
    x.lineWidth = 7; x.beginPath(); x.moveTo(i, -4); x.quadraticCurveTo(i + 20, 20, i + 10, 46); x.stroke();
    x.lineWidth = 3; x.beginPath(); x.moveTo(i + 14, 22); x.lineTo(i + 40, 34); x.moveTo(i + 12, 34); x.lineTo(i - 8, 56); x.moveTo(i + 10, 46); x.lineTo(i + 22, 64); x.stroke();
  }
}
// ---- ひかり（よるの ランタン と たきび。あかるく なると きえる）----
let CUR = null;
export function setDawn(D) { CUR = D; }
function dawnLights(ctx, t, cam, vw, thunder, LIGHTS, GLOWS) {
  const D = CUR, on = D ? Math.max(0, 1 - D.p * 1.7) : 1;
  each(cam, vw, 760, 260, (i, x) => {
    // たきび（じめん）
    ctx.fillStyle = '#1a120c'; ctx.save(); ctx.translate(x, GROUND - 2);
    ctx.rotate(0.3); ctx.fillRect(-14, -3, 28, 5); ctx.rotate(-0.6); ctx.fillRect(-14, -3, 28, 5); ctx.restore();
    if (on > 0.02) {
      const f = 0.85 + Math.sin(t * 13 + i) * 0.1 + Math.sin(t * 7.3 + i * 2) * 0.08;
      ctx.fillStyle = `rgba(255,150,40,${0.9 * on})`; ctx.beginPath(); ctx.moveTo(x - 9, GROUND - 4); ctx.quadraticCurveTo(x - 6, GROUND - 22 * f, x, GROUND - 30 * f); ctx.quadraticCurveTo(x + 7, GROUND - 18 * f, x + 9, GROUND - 4); ctx.fill();
      ctx.fillStyle = `rgba(255,236,150,${0.9 * on})`; ctx.beginPath(); ctx.moveTo(x - 4, GROUND - 4); ctx.quadraticCurveTo(x, GROUND - 18 * f, x + 4, GROUND - 4); ctx.fill();
      LIGHTS.push(x, GROUND - 20, 150 * f, 0.9 * on); GLOWS.push(x, GROUND - 14, 90 * f, 0.6 * on, 'ember', 0);
    } else { ctx.fillStyle = 'rgba(120,120,120,0.35)'; for (let k = 0; k < 3; k++) { const yy = (t * 14 + k * 12) % 36; ctx.beginPath(); ctx.arc(x + Math.sin(t + k) * 4, GROUND - 8 - yy, 3 + yy * 0.12, 0, TAU); ctx.fill(); } }
  });
  // ランタン（でんちゅう に つるす。mid と おなじ うごき）
  for (let i = Math.floor((cam * 0.6 - 300) / 420); i < (cam * 0.6 + vw + 300) / 420; i++) {
    const x = i * 420 + 30 - cam * 0.6, y = 130;
    ctx.fillStyle = '#0a0806'; ctx.fillRect(x + 6, y - 6, 1.5, 8); ctx.fillRect(x + 1, y + 2, 12, 14);
    if (on > 0.02) { ctx.fillStyle = `rgba(255,200,110,${0.95 * on})`; ctx.fillRect(x + 3, y + 4, 8, 10); LIGHTS.push(x + 7, y + 9, 90, 0.5 * on); GLOWS.push(x + 7, y + 9, 50, 0.5 * on, 'warm', 0); }
  }
}

export const DAWN_THEME = { dyn: true, sky: dawnSky, pals: DAWN_PALS, far: dawnFar, mid: dawnMid, floor: dawnFloor, fore: dawnFore, lights: dawnLights, wstep: 0, dark: 0.7, atmos: 'dust', fog: 1, plat: ['#5a3e2c', '#a8845a'] };
