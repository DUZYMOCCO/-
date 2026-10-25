// v0.7.0：ステージ 6〜16 の はいけい（くらくて こわい いろいろな ばしょ）
// render.js から よばれる。lights(ctx, t, cam, vw, thunder, LIGHTS, GLOWS)
import { H, GROUND } from './rules.js?v=9';

const TAU = Math.PI * 2;
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hash(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
function flicker(t, i, bad) { const b = Math.sin(t * 23 + i * 7) * Math.sin(t * 3.1 + i) ; return bad ? (b > 0.35 ? 0.15 : b > 0.2 ? 0.6 : 1) : 0.85 + Math.sin(t * 9 + i) * 0.08; }
const each = (cam, vw, step, off, fn) => { for (let i = Math.floor((cam - step - off) / step); i < (cam + vw + step) / step; i++) fn(i, i * step + off - cam); };

// ---- きょうつうの ぶひん ----
function sky(x, w, top, bot, R, stars = 0) {
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, top); g.addColorStop(1, bot); x.fillStyle = g; x.fillRect(0, 0, w, H);
  x.fillStyle = 'rgba(220,220,240,0.5)'; for (let i = 0; i < stars; i++) x.fillRect(R() * w, R() * 160, 1.2, 1.2);
}
function moon(x, cx, cy, r, col) { const g = x.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 3); g.addColorStop(0, col); g.addColorStop(0.3, 'rgba(120,140,160,0.12)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(cx - r * 3, cy - r * 3, r * 6, r * 6); x.fillStyle = col; x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill(); }
function grime(x, R, w, y0, y1, n, col = 'rgba(0,0,0,0.35)') { for (let i = 0; i < n; i++) { const gx = R() * w, gy = y0 + R() * (y1 - y0); x.fillStyle = col; x.beginPath(); x.ellipse(gx, gy, 6 + R() * 26, 3 + R() * 14, 0, 0, TAU); x.fill(); } }
function drips(x, R, w, y0, n, col) { x.fillStyle = col; for (let i = 0; i < n; i++) { const dx = R() * w; x.fillRect(dx, y0, 2 + R() * 2, 10 + R() * 40); } }
function cable(x, x0, y0, x1, y1, sag, wdt = 2.2, col = '#070708') { x.strokeStyle = col; x.lineWidth = wdt; x.beginPath(); x.moveTo(x0, y0); x.quadraticCurveTo((x0 + x1) / 2, Math.max(y0, y1) + sag, x1, y1); x.stroke(); }
function floorBase(x, w, R, base, line, dark, seams = 40) {
  x.fillStyle = base; x.fillRect(0, GROUND - 4, w, H - GROUND + 4);
  x.fillStyle = line; x.fillRect(0, GROUND, w, 2); x.fillStyle = dark; x.fillRect(0, GROUND + 2, w, 2);
  if (seams) { x.fillStyle = dark; for (let i = 0; i < w; i += seams) x.fillRect(i, GROUND + 4, 2, H - GROUND); }
  for (let i = 0; i < 14; i++) { x.fillStyle = `rgba(0,0,0,${0.25 + R() * 0.3})`; x.beginPath(); x.ellipse(R() * w, GROUND + 8 + R() * 40, 10 + R() * 30, 2 + R() * 4, 0, 0, TAU); x.fill(); }
}
function kana(x, txt, px, py, size, a = 0.14, col = '200,200,190') { x.font = `900 ${size}px system-ui, sans-serif`; x.fillStyle = `rgba(${col},${a})`; x.fillText(txt, px, py); }
function hangLamp(ctx, x, y, len, on, col, L, G, key, sway = 0) {
  const lx = x + sway;
  ctx.strokeStyle = '#08080a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(lx, y); ctx.stroke();
  ctx.fillStyle = '#121214'; ctx.beginPath(); ctx.moveTo(lx - 12, y + 9); ctx.lineTo(lx + 12, y + 9); ctx.lineTo(lx + 5, y); ctx.lineTo(lx - 5, y); ctx.fill();
  ctx.fillStyle = on > 0.3 ? col : '#2a2a2a'; ctx.fillRect(lx - 5, y + 9, 10, 3);
  if (on > 0.05) { ctx.globalAlpha = 0.06 * on; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(lx - 10, y + 12); ctx.lineTo(lx + 10, y + 12); ctx.lineTo(lx + 70, GROUND); ctx.lineTo(lx - 70, GROUND); ctx.fill(); ctx.globalAlpha = 1; L.push(lx, y + 70, len, 0.65 * on); G.push(lx, y + 11, 50, 0.6 * on, key, 0); }
}

// ================= 6 びょういん =================
function hospitalFar(x, w) { const R = rng(61); sky(x, w, '#07090a', '#14100e', R, 20); moon(x, 640, 70, 16, '#b8c4b0');
  x.fillStyle = '#050606'; for (let i = 0; i < w; i += 70 + R() * 50) { const h = 120 + R() * 140; x.fillRect(i, H - h, 50 + R() * 40, h); }
  x.fillStyle = 'rgba(160,190,140,0.2)'; for (let i = 0; i < 40; i++) x.fillRect(R() * w, H - 60 - R() * 180, 4, 5); }
function hospitalMid(x, w) { const R = rng(62);
  x.fillStyle = '#0c0f0e'; x.fillRect(0, 0, w, 40);
  x.fillStyle = '#1f2624'; x.fillRect(0, 40, w, GROUND - 40);
  // タイル
  x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 1; for (let yy = 170; yy < GROUND; yy += 18) { x.beginPath(); x.moveTo(0, yy); x.lineTo(w, yy); x.stroke(); } for (let xx = 0; xx < w; xx += 18) { x.beginPath(); x.moveTo(xx, 170); x.lineTo(xx, GROUND); x.stroke(); }
  x.fillStyle = '#2b3431'; x.fillRect(0, 166, w, 6);
  // とびら と まど
  for (const dx of [60, 380]) { x.fillStyle = '#121615'; x.fillRect(dx, 150, 90, GROUND - 150); x.fillStyle = '#26302c'; x.fillRect(dx + 6, 158, 36, 50); x.fillRect(dx + 48, 158, 36, 50); x.fillStyle = 'rgba(140,180,150,0.12)'; x.fillRect(dx + 9, 161, 30, 44); }
  // カーテン と ベッド
  x.fillStyle = '#2a3330'; for (let i = 0; i < 9; i++) x.fillRect(200 + i * 14, 120, 10, 150 + (i % 3) * 8);
  x.fillStyle = '#0f1211'; x.fillRect(196, 116, 140, 5);
  x.fillStyle = '#3a403c'; x.fillRect(500, 262, 110, 18); x.fillStyle = '#5a605a'; x.fillRect(500, 256, 34, 8); x.fillStyle = '#121414'; x.fillRect(504, 280, 4, 30); x.fillRect(600, 280, 4, 30);
  kana(x, 'びょういん 3かい', 40, 110, 16); kana(x, 'しずかに', 470, 130, 14);
  grime(x, R, w, 40, GROUND, 30, 'rgba(10,20,10,0.35)'); drips(x, R, w, 172, 10, 'rgba(70,120,60,0.35)');
}
function hospitalFloor(x, w) { const R = rng(63); floorBase(x, w, R, '#141917', '#3a4440', '#070908', 30);
  x.fillStyle = 'rgba(80,160,70,0.18)'; for (let i = 0; i < 4; i++) { x.beginPath(); x.ellipse(R() * w, GROUND + 14 + R() * 20, 30, 5, 0, 0, TAU); x.fill(); } }
function hospitalFore(x) { cable(x, 0, -4, 260, -4, 50, 3, '#040505'); x.fillStyle = '#040505'; for (const cx of [420, 860]) { x.fillRect(cx, -4, 3, 60); x.fillRect(cx - 14, 56, 30, 4); x.beginPath(); x.ellipse(cx + 1, 72, 9, 14, 0, 0, TAU); x.fill(); } }
function hospitalLights(ctx, t, cam, vw, th, L, G) {
  each(cam, vw, 260, 120, (i, x) => { const v = flicker(t * 1.2, i + 2, i % 3 !== 0); ctx.fillStyle = '#0d0f0e'; ctx.fillRect(x - 30, 40, 60, 6); ctx.fillStyle = v > 0.3 ? '#dff4e4' : '#2f3a33'; ctx.fillRect(x - 26, 46, 52, 3); if (v > 0.05) { ctx.globalAlpha = 0.05 * v; ctx.fillStyle = '#d6ffe0'; ctx.beginPath(); ctx.moveTo(x - 26, 49); ctx.lineTo(x + 26, 49); ctx.lineTo(x + 90, GROUND); ctx.lineTo(x - 90, GROUND); ctx.fill(); ctx.globalAlpha = 1; L.push(x, 120, 180, 0.6 * v); G.push(x, 48, 60, 0.45 * v, 'green', 0); } });
  each(cam, vw, 520, 330, (i, x) => { const v = 0.6 + 0.4 * Math.sin(t * 2 + i); ctx.fillStyle = '#1a3a1c'; ctx.fillRect(x - 16, 96, 32, 12); ctx.fillStyle = `rgba(110,255,120,${0.4 + 0.5 * v})`; ctx.font = '900 9px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('でぐち', x, 105); ctx.textAlign = 'left'; G.push(x, 102, 40, 0.5 * v, 'green', 0); L.push(x, 102, 60, 0.3); });
}

// ================= 7 きち =================
function baseFar(x, w) { const R = rng(71); sky(x, w, '#0a0a08', '#1c140c', R, 30);
  x.fillStyle = '#060605'; x.beginPath(); x.moveTo(0, H); for (let i = 0; i <= w; i += 30) x.lineTo(i, 250 - Math.sin(i * 0.01) * 30 - R() * 20); x.lineTo(w, H); x.fill();
  // みはりの とう
  for (const tx of [150, 600]) { x.fillStyle = '#050504'; x.fillRect(tx, 150, 6, 140); x.fillRect(tx + 34, 150, 6, 140); x.fillRect(tx - 6, 136, 52, 18); x.strokeStyle = '#050504'; x.lineWidth = 2; x.beginPath(); for (let y = 160; y < 290; y += 26) { x.moveTo(tx, y); x.lineTo(tx + 40, y + 26); x.moveTo(tx + 40, y); x.lineTo(tx, y + 26); } x.stroke(); }
}
function baseMid(x, w) { const R = rng(72);
  x.fillStyle = '#16170f'; x.fillRect(0, 70, w, GROUND - 70);
  x.fillStyle = '#20211a'; for (let i = 0; i < w; i += 32) x.fillRect(i, 70, 16, GROUND - 70);
  x.fillStyle = '#0b0c08'; x.fillRect(0, 62, w, 10);
  // シャッター
  x.fillStyle = '#1b1c16'; x.fillRect(220, 120, 200, GROUND - 120); x.fillStyle = '#121310'; for (let y = 124; y < GROUND; y += 8) x.fillRect(220, y, 200, 2);
  x.fillStyle = '#3d3420'; for (let i = 0; i < 200; i += 20) { x.beginPath(); x.moveTo(220 + i, 120); x.lineTo(232 + i, 120); x.lineTo(222 + i, 132); x.lineTo(210 + i, 132); x.fill(); }
  // つちのう
  for (let r = 0; r < 3; r++) for (let i = 0; i < 6 - r; i++) { x.fillStyle = r % 2 ? '#3a3527' : '#332f22'; x.beginPath(); x.ellipse(40 + i * 26 + r * 13, GROUND - 10 - r * 14, 14, 8, 0, 0, TAU); x.fill(); }
  // ドラムかん
  for (const bx of [480, 512]) { x.fillStyle = '#2c3324'; x.fillRect(bx, GROUND - 46, 28, 46); x.fillStyle = '#1c2116'; x.fillRect(bx, GROUND - 34, 28, 3); x.fillRect(bx, GROUND - 16, 28, 3); }
  kana(x, 'たちいり きんし', 250, 110, 16, 0.18); kana(x, 'こ 7', 560, 120, 26, 0.12);
  grime(x, R, w, 70, GROUND, 26);
}
function baseFloor(x, w) { const R = rng(73); floorBase(x, w, R, '#14140f', '#35352a', '#070705', 0); x.fillStyle = 'rgba(200,170,60,0.25)'; for (let i = 0; i < w; i += 80) x.fillRect(i, GROUND + 20, 40, 4); }
function baseFore(x) { x.strokeStyle = '#040403'; x.lineWidth = 1.5; for (let i = 0; i < 420; i += 10) { x.beginPath(); x.moveTo(i, 70); x.lineTo(i + 10, 80); x.moveTo(i + 10, 70); x.lineTo(i, 80); x.stroke(); } x.lineWidth = 3; x.beginPath(); x.moveTo(0, 68); x.lineTo(420, 68); x.stroke(); x.fillStyle = '#040403'; x.fillRect(0, 68, 5, 30); x.fillRect(200, 68, 5, 30); x.fillRect(415, 68, 5, 30); }
function baseLights(ctx, t, cam, vw, th, L, G) {
  // サーチライト
  each(cam * 0.6, vw, 700, 300, (i, x) => { const a = Math.sin(t * 0.6 + i * 2) * 0.6; const ex = x + Math.sin(a) * 300, ey = GROUND; ctx.globalAlpha = 0.07; ctx.fillStyle = '#fff2c0'; ctx.beginPath(); ctx.moveTo(x, 70); ctx.lineTo(ex - 50, ey); ctx.lineTo(ex + 50, ey); ctx.fill(); ctx.globalAlpha = 1; L.push(ex, GROUND - 40, 130, 0.55); G.push(x, 70, 40, 0.8, 'warm', 0); });
  each(cam, vw, 420, 210, (i, x) => { const v = (Math.sin(t * 6 + i) > 0) ? 1 : 0.2; ctx.fillStyle = v > 0.5 ? '#ff6a2a' : '#3a1a0c'; ctx.fillRect(x - 4, 80, 8, 8); G.push(x, 84, 40, 0.8 * v, 'ember', 0); L.push(x, 100, 80, 0.4 * v); });
}

// ================= 8 もり =================
function forestFar(x, w) { const R = rng(81); sky(x, w, '#050807', '#0e1410', R, 50); moon(x, 260, 60, 20, '#d8e0c8');
  for (let layer = 0; layer < 2; layer++) { x.fillStyle = layer ? '#050806' : '#0a100c'; for (let i = -20; i < w + 20; i += 22 + R() * 20) { const h = 160 + R() * 120 - layer * 30, bx = i; x.beginPath(); x.moveTo(bx - 18, H); x.lineTo(bx, H - h); x.lineTo(bx + 18, H); x.fill(); } }
}
function forestMid(x, w) { const R = rng(82);
  for (let i = 0; i < w; i += 90 + R() * 60) { const tw = 18 + R() * 16; x.fillStyle = '#0c0f0b'; x.fillRect(i, 0, tw, GROUND); x.fillStyle = '#141a12'; x.fillRect(i + 3, 0, 3, GROUND);
    x.strokeStyle = '#0c0f0b'; x.lineWidth = 5; x.beginPath(); x.moveTo(i + tw / 2, 80 + R() * 60); x.lineTo(i + tw / 2 + (R() - 0.5) * 120, 30 + R() * 40); x.stroke();
    x.fillStyle = '#0c0f0b'; x.beginPath(); x.moveTo(i - 14, GROUND); x.quadraticCurveTo(i, GROUND - 26, i + 4, GROUND - 40); x.lineTo(i + tw - 4, GROUND - 40); x.quadraticCurveTo(i + tw, GROUND - 26, i + tw + 14, GROUND); x.fill(); }
  x.fillStyle = 'rgba(20,30,18,0.8)'; for (let i = 0; i < 20; i++) { x.beginPath(); x.ellipse(R() * w, GROUND - 6, 20 + R() * 30, 10 + R() * 12, 0, Math.PI, TAU); x.fill(); }
  // こや
  x.fillStyle = '#100d0a'; x.fillRect(420, 220, 110, GROUND - 220); x.beginPath(); x.moveTo(410, 222); x.lineTo(475, 180); x.lineTo(540, 222); x.fill(); x.fillStyle = '#2a1e10'; x.fillRect(440, 240, 22, 18);
}
function forestFloor(x, w) { const R = rng(83); floorBase(x, w, R, '#0d110c', '#1f281a', '#050705', 0); x.strokeStyle = '#1a2214'; x.lineWidth = 1; for (let i = 0; i < 120; i++) { const gx = R() * w; x.beginPath(); x.moveTo(gx, GROUND + 1); x.lineTo(gx + (R() - 0.5) * 6, GROUND - 4 - R() * 6); x.stroke(); } }
function forestFore(x) { x.fillStyle = '#030403'; for (const [cx, s] of [[80, 1], [520, 1.3], [900, 0.8]]) { x.beginPath(); x.moveTo(cx - 60 * s, -4); x.quadraticCurveTo(cx, 50 * s, cx + 70 * s, -4); x.fill(); x.fillRect(cx - 2, -4, 4, 70 * s); } }
function forestLights(ctx, t, cam, vw, th, L, G) {
  each(cam, vw, 380, 470, (i, x) => { const v = 0.6 + 0.3 * Math.sin(t * 3 + i * 5) + 0.1 * Math.sin(t * 17 + i); ctx.fillStyle = '#ffb860'; ctx.fillRect(x - 3, 242, 6, 8); L.push(x, 246, 140 * v, 0.6); G.push(x, 246, 60 * v, 0.7, 'warm', 0); });
  for (let i = 0; i < 14; i++) { const x = ((hash(i + 11) * 900 - cam * 0.9 + Math.sin(t * 0.8 + i) * 40) % 900 + 900) % 900 - 100, y = 160 + hash(i + 40) * 150 + Math.sin(t * 1.3 + i * 2) * 20, a = Math.max(0, Math.sin(t * 2.2 + i * 3)); if (a < 0.1) continue; ctx.fillStyle = `rgba(190,255,120,${a})`; ctx.fillRect(x, y, 2.5, 2.5); G.push(x, y, 16, a * 0.8, 'green', 0); }
}

// ================= 9 こうじょう =================
function factoryFar(x, w) { const R = rng(91); sky(x, w, '#0a0706', '#24120a', R, 0);
  x.fillStyle = '#070505'; for (let i = 0; i < w; i += 90) { const h = 150 + R() * 100; x.fillRect(i, H - h, 70, h); if (R() < 0.6) { x.fillRect(i + 20, H - h - 80, 16, 80); for (let k = 0; k < 6; k++) { x.fillStyle = `rgba(30,18,14,${0.4 - k * 0.05})`; x.beginPath(); x.arc(i + 28 + k * 10, H - h - 90 - k * 10, 10 + k * 4, 0, TAU); x.fill(); } x.fillStyle = '#070505'; } } }
function factoryMid(x, w) { const R = rng(92);
  x.fillStyle = '#18140f'; x.fillRect(0, 30, w, GROUND - 30);
  // てっこつ
  x.fillStyle = '#0d0b09'; for (let i = 0; i < w; i += 160) { x.fillRect(i, 30, 14, GROUND - 30); } x.fillRect(0, 30, w, 14); x.fillRect(0, 150, w, 8);
  x.strokeStyle = '#0d0b09'; x.lineWidth = 4; for (let i = 0; i < w; i += 160) { x.beginPath(); x.moveTo(i + 14, 44); x.lineTo(i + 160, 150); x.moveTo(i + 160, 44); x.lineTo(i + 14, 150); x.stroke(); }
  // はぐるま
  const gear = (cx, cy, r) => { x.fillStyle = '#120f0c'; x.beginPath(); for (let k = 0; k < 24; k++) { const a = k / 24 * TAU, rr = k % 2 ? r : r * 1.18; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.fill(); x.fillStyle = '#1f1a14'; x.beginPath(); x.arc(cx, cy, r * 0.35, 0, TAU); x.fill(); };
  gear(260, 230, 46); gear(330, 196, 26); gear(560, 250, 34);
  x.fillStyle = 'rgba(255,120,40,0.12)'; x.fillRect(0, 280, w, 30);
  kana(x, 'あぶない', 420, 120, 18, 0.16, '230,190,90');
  grime(x, R, w, 40, GROUND, 30);
}
function factoryFloor(x, w) { const R = rng(93); floorBase(x, w, R, '#15120f', '#3a332a', '#070605', 0); for (let i = 0; i < w; i += 22) { x.fillStyle = (i / 22) % 2 ? '#3d3420' : '#111'; x.beginPath(); x.moveTo(i, GROUND + 6); x.lineTo(i + 22, GROUND + 6); x.lineTo(i + 12, GROUND + 14); x.lineTo(i - 10, GROUND + 14); x.fill(); } }
function factoryFore(x) { x.fillStyle = '#040303'; x.fillRect(0, -4, 1100, 10); for (const cx of [160, 640]) { x.fillRect(cx, 6, 3, 50); x.beginPath(); x.moveTo(cx - 10, 56); x.lineTo(cx + 13, 56); x.lineTo(cx + 13, 66); x.lineTo(cx + 4, 74); x.lineTo(cx - 1, 66); x.fill(); } }
function factoryLights(ctx, t, cam, vw, th, L, G) {
  each(cam, vw, 320, 160, (i, x) => hangLamp(ctx, x, 60, 190, flicker(t, i + 7, i % 4 === 1), '#ffd9a0', L, G, 'warm', Math.sin(t * 1.5 + i) * 4));
  each(cam * 0.6, vw, 640, 100, (i, x) => { const v = 0.7 + 0.3 * Math.sin(t * 4 + i); G.push(x, 290, 140, 0.35 * v, 'ember', 0); L.push(x, 290, 200, 0.3 * v); });
}

// ================= 10 はし =================
function bridgeFar(x, w) { const R = rng(101); sky(x, w, '#06070b', '#160e10', R, 60); moon(x, 720, 80, 14, '#c8c0b0');
  x.fillStyle = '#050508'; for (let i = 0; i < w; i += 40 + R() * 30) { const h = 60 + R() * 120; x.fillRect(i, 280 - h, 30, h); }
  x.fillStyle = 'rgba(220,180,120,0.2)'; for (let i = 0; i < 50; i++) x.fillRect(R() * w, 170 + R() * 100, 2, 3);
  x.fillStyle = '#0a0a10'; x.fillRect(0, 280, w, H - 280); x.fillStyle = 'rgba(160,160,190,0.08)'; for (let i = 0; i < 40; i++) x.fillRect(R() * w, 290 + R() * 60, 20 + R() * 40, 1); }
function bridgeMid(x, w) { const R = rng(102);
  // とう と ワイヤー
  x.fillStyle = '#121216'; x.fillRect(300, 20, 26, GROUND - 20); x.fillRect(380, 20, 26, GROUND - 20); x.fillRect(296, 60, 114, 12); x.fillRect(296, 160, 114, 10);
  x.strokeStyle = '#0d0d10'; x.lineWidth = 4; x.beginPath(); x.moveTo(0, 150); x.quadraticCurveTo(160, 230, 310, 30); x.quadraticCurveTo(460, 230, 640, 150); x.stroke();
  x.lineWidth = 1.5; for (let i = 10; i < w; i += 24) { const yy = i < 310 ? 150 + Math.sin(i / 310 * Math.PI) * 50 : 150 + Math.sin((i - 310) / 330 * Math.PI) * 50; x.beginPath(); x.moveTo(i, yy - 30); x.lineTo(i, GROUND - 40); x.stroke(); }
  // てすり
  x.fillStyle = '#16161a'; x.fillRect(0, GROUND - 42, w, 5); for (let i = 0; i < w; i += 20) x.fillRect(i, GROUND - 42, 3, 42);
  // こわれた くるま
  x.fillStyle = '#1a1414'; x.beginPath(); x.moveTo(470, GROUND); x.lineTo(470, GROUND - 26); x.lineTo(500, GROUND - 46); x.lineTo(560, GROUND - 46); x.lineTo(590, GROUND - 26); x.lineTo(600, GROUND); x.fill(); x.fillStyle = '#060606'; x.beginPath(); x.arc(492, GROUND, 12, 0, TAU); x.arc(578, GROUND, 12, 0, TAU); x.fill();
  grime(x, R, w, 40, GROUND, 14);
}
function bridgeFloor(x, w) { const R = rng(103); floorBase(x, w, R, '#131316', '#33333a', '#060607', 0); x.fillStyle = 'rgba(220,200,120,0.3)'; for (let i = 0; i < w; i += 70) x.fillRect(i, GROUND + 22, 34, 3); x.fillStyle = '#050506'; for (let i = 0; i < 5; i++) { const cx = R() * w; x.beginPath(); x.moveTo(cx, GROUND + 4); x.lineTo(cx + 20, GROUND + 30); x.lineTo(cx - 6, GROUND + 50); x.stroke(); } }
function bridgeFore(x) { cable(x, 0, -4, 1100, -4, 30, 5, '#030304'); x.strokeStyle = '#030304'; x.lineWidth = 2; for (let i = 40; i < 1100; i += 60) { x.beginPath(); x.moveTo(i, 10); x.lineTo(i, 96); x.stroke(); } }
function bridgeLights(ctx, t, cam, vw, th, L, G) {
  each(cam, vw, 300, 60, (i, x) => { const v = flicker(t, i + 13, i % 3 === 2); ctx.fillStyle = '#0b0b0e'; ctx.fillRect(x - 2, 110, 4, GROUND - 152); ctx.fillRect(x - 2, 108, 22, 4); ctx.fillStyle = v > 0.3 ? '#ffd890' : '#3a3020'; ctx.fillRect(x + 12, 112, 12, 4); if (v > 0.05) { ctx.globalAlpha = 0.07 * v; ctx.fillStyle = '#ffd890'; ctx.beginPath(); ctx.moveTo(x + 12, 116); ctx.lineTo(x + 24, 116); ctx.lineTo(x + 80, GROUND); ctx.lineTo(x - 40, GROUND); ctx.fill(); ctx.globalAlpha = 1; L.push(x + 18, 200, 170, 0.6 * v); G.push(x + 18, 114, 46, 0.7 * v, 'warm', 0); } });
}

// ================= 11 ふね =================
function shipFar(x, w) { const R = rng(111); sky(x, w, '#04060a', '#0a1018', R, 40); x.fillStyle = '#060a12'; x.fillRect(0, 230, w, H - 230); x.strokeStyle = 'rgba(120,150,190,0.12)'; x.lineWidth = 1; for (let i = 0; i < 30; i++) { const yy = 240 + R() * 100, xx = R() * w; x.beginPath(); x.moveTo(xx, yy); x.quadraticCurveTo(xx + 20, yy - 4, xx + 40, yy); x.stroke(); } }
function shipMid(x, w) { const R = rng(112);
  x.fillStyle = '#141820'; x.fillRect(0, 50, w, GROUND - 50);
  x.fillStyle = '#0c0f14'; for (let i = 0; i < w; i += 64) x.fillRect(i, 50, 6, GROUND - 50); x.fillRect(0, 50, w, 12);
  x.fillStyle = '#2a3038'; for (let i = 0; i < w; i += 64) for (let y = 70; y < GROUND; y += 22) x.fillRect(i + 10, y, 3, 3);
  // まるまど
  for (const cx of [100, 260, 420, 580]) { x.fillStyle = '#0a0c10'; x.beginPath(); x.arc(cx, 150, 22, 0, TAU); x.fill(); x.fillStyle = '#26303c'; x.beginPath(); x.arc(cx, 150, 16, 0, TAU); x.fill(); x.fillStyle = 'rgba(120,160,200,0.15)'; x.beginPath(); x.arc(cx - 4, 146, 6, 0, TAU); x.fill(); }
  // くさり と うきわ
  x.strokeStyle = '#0a0c10'; x.lineWidth = 3; for (let y = 60; y < 250; y += 9) { x.beginPath(); x.ellipse(340, y, 3, 5, 0, 0, TAU); x.stroke(); }
  x.strokeStyle = '#4a2a20'; x.lineWidth = 7; x.beginPath(); x.arc(500, 240, 18, 0, TAU); x.stroke();
  x.fillStyle = 'rgba(40,70,60,0.4)'; x.fillRect(0, GROUND - 30, w, 30);
  kana(x, 'デッキ B', 30, 110, 16);
  grime(x, R, w, 60, GROUND, 24, 'rgba(60,40,20,0.3)'); drips(x, R, w, 62, 16, 'rgba(90,60,30,0.3)');
}
function shipFloor(x, w) { const R = rng(113); floorBase(x, w, R, '#151310', '#3a3228', '#060504', 26); x.fillStyle = 'rgba(80,140,160,0.12)'; for (let i = 0; i < 6; i++) { x.beginPath(); x.ellipse(R() * w, GROUND + 10 + R() * 30, 40, 4, 0, 0, TAU); x.fill(); } }
function shipFore(x) { x.strokeStyle = '#030405'; x.lineWidth = 4; x.beginPath(); x.moveTo(0, 30); x.quadraticCurveTo(300, 80, 600, 20); x.stroke(); x.lineWidth = 2; for (let y = -4; y < 90; y += 9) { x.beginPath(); x.ellipse(820, y, 3, 5, 0, 0, TAU); x.stroke(); } }
function shipLights(ctx, t, cam, vw, th, L, G) {
  each(cam, vw, 360, 180, (i, x) => hangLamp(ctx, x, 70, 180, flicker(t, i + 21, i % 3 === 1), '#ffe2a8', L, G, 'warm', Math.sin(t * 0.48 * Math.PI + i) * 14));
  each(cam, vw, 540, 420, (i, x) => { const v = Math.sin(t * 3 + i) > 0.3 ? 1 : 0.1; ctx.fillStyle = v > 0.5 ? '#ff4030' : '#301010'; ctx.fillRect(x - 5, 110, 10, 6); G.push(x, 113, 40, 0.8 * v, 'red', 0); });
}

// ================= 12 ゆきやま =================
function snowFar(x, w) { const R = rng(121); sky(x, w, '#070a10', '#1a2030', R, 40);
  x.fillStyle = '#0c1018'; x.beginPath(); x.moveTo(0, H); for (let i = 0; i <= w; i += 60) x.lineTo(i, 150 + Math.abs(Math.sin(i * 0.007)) * 60 + R() * 40); x.lineTo(w, H); x.fill();
  x.fillStyle = 'rgba(200,215,235,0.25)'; for (let i = 0; i < w; i += 60) { const y = 150 + Math.abs(Math.sin(i * 0.007)) * 60; x.beginPath(); x.moveTo(i - 20, y + 20); x.lineTo(i, y); x.lineTo(i + 24, y + 22); x.fill(); } }
function snowMid(x, w) { const R = rng(122);
  x.fillStyle = '#1a2028'; x.fillRect(0, 90, w, GROUND - 90); x.fillStyle = '#d6e0ea'; x.globalAlpha = 0.5; x.beginPath(); x.moveTo(0, 92); for (let i = 0; i <= w; i += 16) x.lineTo(i, 86 + R() * 10); x.lineTo(w, 96); x.lineTo(0, 96); x.fill(); x.globalAlpha = 1;
  x.fillStyle = '#121820'; for (let i = 0; i < w; i += 128) x.fillRect(i, 90, 8, GROUND - 90);
  // まど（こおってる）
  for (const cx of [60, 220, 380, 520]) { x.fillStyle = '#0c1016'; x.fillRect(cx, 140, 70, 50); x.fillStyle = 'rgba(150,200,240,0.14)'; x.fillRect(cx + 4, 144, 62, 42); x.fillStyle = 'rgba(230,240,255,0.35)'; x.fillRect(cx + 4, 176, 62, 10); }
  // つらら
  x.fillStyle = 'rgba(200,225,250,0.45)'; for (let i = 0; i < w; i += 14 + R() * 20) { const l = 6 + R() * 22; x.beginPath(); x.moveTo(i, 96); x.lineTo(i + 5, 96); x.lineTo(i + 2.5, 96 + l); x.fill(); }
  kana(x, 'けんきゅうとう Y', 300, 124, 14, 0.18, '190,220,255');
  x.fillStyle = 'rgba(220,230,245,0.35)'; for (let i = 0; i < 12; i++) { x.beginPath(); x.ellipse(R() * w, GROUND - 2, 30 + R() * 40, 10, 0, Math.PI, TAU); x.fill(); }
}
function snowFloor(x, w) { const R = rng(123); floorBase(x, w, R, '#1c222c', '#c8d4e2', '#0a0d12', 0); x.fillStyle = 'rgba(210,225,240,0.25)'; for (let i = 0; i < 20; i++) { x.beginPath(); x.ellipse(R() * w, GROUND + 6 + R() * 40, 20 + R() * 40, 3, 0, 0, TAU); x.fill(); } }
function snowFore(x) { x.fillStyle = 'rgba(200,225,250,0.5)'; for (let i = 0; i < 1100; i += 30) { const l = 10 + hash(i) * 40; x.beginPath(); x.moveTo(i, -4); x.lineTo(i + 8, -4); x.lineTo(i + 4, l); x.fill(); } }
function snowLights(ctx, t, cam, vw, th, L, G) {
  each(cam, vw, 300, 150, (i, x) => { const v = flicker(t, i + 31, i % 4 === 3); ctx.fillStyle = '#0c1016'; ctx.fillRect(x - 14, 100, 28, 8); ctx.fillStyle = v > 0.3 ? '#bfe6ff' : '#203040'; ctx.fillRect(x - 10, 108, 20, 4); if (v > 0.05) { L.push(x, 170, 170, 0.6 * v); G.push(x, 110, 60, 0.6 * v, 'cold', 0); } });
}

// ================= 13 むしの す =================
function hiveFar(x, w) { const R = rng(131); sky(x, w, '#08040a', '#160a14', R, 0); x.fillStyle = '#0c0610'; for (let i = 0; i < w; i += 50) { x.beginPath(); x.moveTo(i, 0); x.quadraticCurveTo(i + 20, 60 + R() * 60, i + 50, 0); x.fill(); x.beginPath(); x.moveTo(i, H); x.quadraticCurveTo(i + 25, 220 + R() * 60, i + 50, H); x.fill(); } }
function hiveMid(x, w) { const R = rng(132);
  x.fillStyle = '#1a0f1a'; x.fillRect(0, 0, w, GROUND);
  // ハチの す もよう
  x.strokeStyle = 'rgba(60,30,60,0.6)'; x.lineWidth = 2; const s = 22; for (let r = 0; r < 16; r++) for (let c = 0; c < w / (s * 1.5) + 1; c++) { const cx = c * s * 1.5, cy = r * s * 0.87 * 2 + (c % 2) * s * 0.87; x.beginPath(); for (let k = 0; k < 6; k++) x.lineTo(cx + Math.cos(k / 6 * TAU) * s * 0.5, cy + Math.sin(k / 6 * TAU) * s * 0.5); x.closePath(); x.stroke(); }
  // ねばねば の いと
  x.strokeStyle = 'rgba(150,110,160,0.25)'; x.lineWidth = 1.5; for (let i = 0; i < 18; i++) { const a = R() * w; x.beginPath(); x.moveTo(a, 0); x.quadraticCurveTo(a + (R() - 0.5) * 60, 80 + R() * 80, a + (R() - 0.5) * 30, 200 + R() * 100); x.stroke(); }
  // たまご
  for (let i = 0; i < 7; i++) { const ex = 40 + R() * (w - 80), ey = GROUND - 14 - R() * 6; x.fillStyle = '#2a1830'; x.beginPath(); x.ellipse(ex, ey, 12, 18, 0, 0, TAU); x.fill(); x.fillStyle = 'rgba(190,90,255,0.25)'; x.beginPath(); x.ellipse(ex - 3, ey - 5, 4, 7, 0, 0, TAU); x.fill(); }
  drips(x, R, w, 0, 26, 'rgba(120,60,140,0.35)');
}
function hiveFloor(x, w) { const R = rng(133); floorBase(x, w, R, '#140c14', '#3a2440', '#070407', 0); x.fillStyle = 'rgba(150,60,200,0.15)'; for (let i = 0; i < 10; i++) { x.beginPath(); x.ellipse(R() * w, GROUND + 6 + R() * 30, 20 + R() * 30, 3, 0, 0, TAU); x.fill(); } }
function hiveFore(x) { x.fillStyle = '#060307'; for (let i = 0; i < 1100; i += 70) { x.beginPath(); x.moveTo(i, -4); x.quadraticCurveTo(i + 20, 40 + hash(i) * 50, i + 35, -4); x.fill(); } x.strokeStyle = 'rgba(140,100,150,0.3)'; x.lineWidth = 1; for (let i = 0; i < 1100; i += 140) { x.beginPath(); x.moveTo(i, -4); x.lineTo(i + 10, 90); x.stroke(); } }
function hiveLights(ctx, t, cam, vw, th, L, G) {
  each(cam, vw, 260, 90, (i, x) => { const v = 0.55 + 0.45 * Math.sin(t * 2.4 + i * 1.7); const y = 60 + (i % 3) * 40; ctx.fillStyle = `rgba(200,110,255,${0.4 + v * 0.5})`; ctx.beginPath(); ctx.ellipse(x, y, 7, 10, 0, 0, TAU); ctx.fill(); G.push(x, y, 70 * v + 20, 0.8, 'purple', 0); L.push(x, y + 40, 140, 0.45 * v + 0.15); });
}

// ================= 14 ひこうじょう =================
function airFar(x, w) { const R = rng(141); sky(x, w, '#06070a', '#14141c', R, 0);
  x.fillStyle = 'rgba(40,40,52,0.7)'; for (let i = 0; i < 12; i++) { x.beginPath(); x.ellipse(R() * w, 40 + R() * 90, 80 + R() * 80, 20 + R() * 20, 0, 0, TAU); x.fill(); }
  x.fillStyle = '#050507'; x.fillRect(0, 270, w, H - 270); x.fillRect(560, 200, 20, 70); x.fillRect(540, 184, 60, 20); }
function airMid(x, w) { const R = rng(142);
  // かくのうこ
  x.fillStyle = '#16171c'; x.beginPath(); x.moveTo(0, GROUND); x.lineTo(0, 110); x.quadraticCurveTo(160, 40, 320, 110); x.lineTo(320, GROUND); x.fill();
  x.fillStyle = '#0d0e12'; x.fillRect(40, 150, 240, GROUND - 150); x.fillStyle = '#1e2026'; for (let y = 156; y < GROUND; y += 10) x.fillRect(40, y, 240, 2);
  kana(x, 'かくのうこ 2', 90, 140, 16, 0.18);
  // ふるい ひこうき
  x.fillStyle = '#121318'; x.beginPath(); x.ellipse(500, GROUND - 40, 110, 20, 0, 0, TAU); x.fill(); x.beginPath(); x.moveTo(470, GROUND - 46); x.lineTo(540, GROUND - 46); x.lineTo(500, GROUND - 120); x.fill(); x.fillRect(380, GROUND - 76, 20, 40);
  x.fillStyle = '#060608'; x.beginPath(); x.arc(470, GROUND - 6, 8, 0, TAU); x.arc(540, GROUND - 6, 8, 0, TAU); x.fill();
  grime(x, R, w, 100, GROUND, 14);
}
function airFloor(x, w) { const R = rng(143); floorBase(x, w, R, '#111114', '#2c2c32', '#060607', 0); x.fillStyle = 'rgba(230,230,230,0.25)'; for (let i = 0; i < w; i += 64) x.fillRect(i, GROUND + 26, 40, 5); }
function airFore(x) { cable(x, 0, -4, 500, -4, 40, 3, '#030304'); x.fillStyle = '#030304'; x.fillRect(760, -4, 6, 80); x.beginPath(); x.moveTo(740, 76); x.lineTo(790, 76); x.lineTo(780, 96); x.lineTo(750, 96); x.fill(); }
function airLights(ctx, t, cam, vw, th, L, G) {
  each(cam, vw, 120, 40, (i, x) => { const on = ((t * 4 - i * 0.35) % 3 + 3) % 3 < 0.4; ctx.fillStyle = on ? '#bfe0ff' : '#1a2430'; ctx.fillRect(x - 3, GROUND + 14, 6, 3); if (on) { G.push(x, GROUND + 15, 26, 0.9, 'cold', 0); L.push(x, GROUND, 60, 0.4); } });
  each(cam * 0.6, vw, 640, 590, (i, x) => { const v = Math.sin(t * 2.5 + i) > 0.6 ? 1 : 0; G.push(x, 186, 60, 0.9 * v, 'red', 0); });
  each(cam, vw, 400, 240, (i, x) => { const v = flicker(t, i + 41, i % 2 === 1); ctx.fillStyle = '#0b0b0e'; ctx.fillRect(x - 2, 120, 4, GROUND - 120); ctx.fillStyle = v > 0.3 ? '#fff2d0' : '#30302a'; ctx.fillRect(x - 10, 116, 20, 5); if (v > 0.05) { L.push(x, 200, 170, 0.55 * v); G.push(x, 118, 46, 0.6 * v, 'warm', 0); } });
}

// ================= 15 さいごの けんきゅうじょ =================
function coreFar(x, w) { const R = rng(151); sky(x, w, '#07040a', '#120818', R, 0); x.fillStyle = '#0a0610'; for (let i = 0; i < w; i += 30) x.fillRect(i, 0, 14, H); x.fillStyle = 'rgba(160,60,255,0.08)'; x.fillRect(0, 120, w, 120); }
function coreMid(x, w) { const R = rng(152);
  x.fillStyle = '#120e18'; x.fillRect(0, 30, w, GROUND - 30); x.fillStyle = '#0a080e'; x.fillRect(0, 30, w, 14);
  // カプセル
  for (const cx of [80, 240, 400, 560]) { x.fillStyle = '#0a0a0e'; x.fillRect(cx - 30, 100, 60, 190); x.fillStyle = 'rgba(80,220,255,0.12)'; x.fillRect(cx - 24, 110, 48, 170); x.fillStyle = 'rgba(20,40,40,0.8)'; x.beginPath(); x.ellipse(cx, 200, 12, 30, 0, 0, TAU); x.fill(); x.fillStyle = '#1e1a26'; x.fillRect(cx - 34, 96, 68, 10); x.fillRect(cx - 34, 284, 68, 12); for (let k = 0; k < 5; k++) { x.fillStyle = 'rgba(180,240,255,0.3)'; x.fillRect(cx - 18 + R() * 36, 130 + R() * 140, 2, 2); } }
  x.fillStyle = '#1a1622'; x.fillRect(0, 60, w, 8); x.fillRect(0, 76, w, 5);
  kana(x, 'コア ちく', 280, 60, 14, 0.2, '200,170,255');
  grime(x, R, w, 40, GROUND, 18);
}
function coreFloor(x, w) { const R = rng(153); floorBase(x, w, R, '#0f0c14', '#3a2e48', '#060408', 32); x.fillStyle = 'rgba(120,80,255,0.2)'; for (let i = 0; i < w; i += 64) x.fillRect(i, GROUND + 3, 30, 1); }
function coreFore(x) { x.fillStyle = '#040306'; x.fillRect(0, -4, 1100, 8); for (let i = 60; i < 1100; i += 240) { x.fillRect(i, 4, 10, 50); x.fillRect(i - 6, 50, 22, 6); } }
function coreLights(ctx, t, cam, vw, th, L, G) {
  each(cam * 0.6, vw, 160, 80, (i, x) => { const v = 0.6 + 0.4 * Math.sin(t * 1.8 + i); G.push(x, 200, 60, 0.35 * v, 'cold', 0); L.push(x, 200, 100, 0.3 * v); });
  each(cam, vw, 440, 220, (i, x) => { const v = 0.5 + 0.5 * Math.sin(t * 5 + i); ctx.fillStyle = `rgba(190,120,255,${0.5 + 0.5 * v})`; ctx.fillRect(x - 12, 46, 24, 4); G.push(x, 48, 70, 0.7 * v, 'purple', 0); L.push(x, 110, 170, 0.45 + 0.2 * v); });
}

// ================= 16 いせきの どうくつ（あおじろい いしの いせき・ふとい りんかくせん） =================
const RU = { line: '#232a3a', stone: '#a6b6d2', stone2: '#93a5c6', hi: '#d2dcee', shade: '#7486a8', deep: '#46516c', gap: '#37405a', floor: '#8b97ae', floor2: '#76829b' };
function ruBlock(x, bx, by, bw, bh, R, col = RU.stone) {
  x.fillStyle = RU.line; x.fillRect(bx - 1.5, by - 1.5, bw + 3, bh + 3);
  x.fillStyle = col; x.fillRect(bx, by, bw, bh);
  x.fillStyle = RU.hi; x.fillRect(bx, by, bw, 2.5);
  x.fillStyle = 'rgba(60,70,95,0.28)'; x.fillRect(bx, by + bh - 4, bw, 4); x.fillRect(bx + bw - 3, by, 3, bh);
  if (R() < 0.45) { x.strokeStyle = 'rgba(38,43,54,0.7)'; x.lineWidth = 1; x.beginPath(); const cx = bx + R() * bw; x.moveTo(cx, by); x.lineTo(cx + (R() - 0.5) * 10, by + bh * 0.5); x.lineTo(cx + (R() - 0.5) * 14, by + bh); x.stroke(); }
  if (R() < 0.3) { x.fillStyle = 'rgba(70,80,100,0.35)'; x.beginPath(); x.ellipse(bx + R() * bw, by + R() * bh, 3 + R() * 5, 2 + R() * 3, 0, 0, TAU); x.fill(); }
}
function ruWall(x, x0, x1, y0, y1, R, bw = 46, bh = 26, col) {
  for (let yy = y0, row = 0; yy < y1; yy += bh, row++) {
    const off = row % 2 ? -bw / 2 : 0;
    for (let xx = x0 + off; xx < x1; xx += bw) {
      const a = Math.max(xx, x0), b = Math.min(xx + bw, x1) - 2, h = Math.min(bh, y1 - yy) - 2;
      if (b - a > 3 && h > 3) ruBlock(x, a + 1, yy + 1, b - a, h, R, col || (R() < 0.3 ? RU.stone2 : RU.stone));
    }
  }
}
function ruBoulder(x, cx, cy, r, R, col = RU.stone) {
  const n = 7 + Math.floor(R() * 3), pts = [];
  for (let i = 0; i < n; i++) { const a = Math.PI + (i / (n - 1)) * Math.PI, rr = r * (0.75 + R() * 0.35); pts.push([cx + Math.cos(a) * rr * 1.25, cy + Math.sin(a) * rr * 0.9]); }
  x.beginPath(); x.moveTo(cx - r * 1.3, cy + r * 0.25); for (const [px, py] of pts) x.lineTo(px, py); x.lineTo(cx + r * 1.3, cy + r * 0.25); x.closePath();
  x.lineWidth = 3; x.strokeStyle = RU.line; x.lineJoin = 'round'; x.stroke(); x.fillStyle = col; x.fill();
  // かげ（したがわ）と ハイライト（うえ）
  x.save(); x.clip();
  x.fillStyle = RU.shade; x.beginPath(); x.ellipse(cx + r * 0.3, cy + r * 0.2, r * 1.2, r * 0.55, -0.1, 0, TAU); x.fill();
  x.fillStyle = RU.hi; x.beginPath(); x.ellipse(cx - r * 0.35, cy - r * 0.65, r * 0.55, r * 0.18, -0.25, 0, TAU); x.fill();
  x.restore();
  x.strokeStyle = RU.line; x.lineWidth = 1.6; x.beginPath(); x.moveTo(cx - r * 0.2, cy - r * 0.8); x.lineTo(cx + r * 0.1, cy - r * 0.2); x.lineTo(cx + r * 0.6, cy - r * 0.05); x.stroke();
}
function ruinsFar(x, w) { const R = rng(161);
  // おくの あかるい どうくつ（あおしろ）
  const gg = x.createLinearGradient(0, 0, 0, H); gg.addColorStop(0, '#b4c3dc'); gg.addColorStop(0.7, '#d4ddec'); gg.addColorStop(1, '#c0cbdf'); x.fillStyle = gg; x.fillRect(0, 0, w, H);
  // てんじょうの いわ
  x.fillStyle = '#8796b3'; x.beginPath(); x.moveTo(0, 0); for (let i = 0; i <= w; i += 30) x.lineTo(i, 26 + R() * 34); x.lineTo(w, 0); x.fill();
  x.strokeStyle = RU.line; x.lineWidth = 1.5; x.stroke();
  // とおくの はしら と いしがき（うすい）
  for (let i = 0; i < w; i += 150 + R() * 80) { const bw = 40 + R() * 40, top = 70 + R() * 50; x.fillStyle = '#a1b0cb'; x.fillRect(i, top, bw, H - top); x.strokeStyle = 'rgba(38,43,54,0.5)'; x.lineWidth = 1.2; x.strokeRect(i, top, bw, H - top); for (let yy = top + 18; yy < H; yy += 18) { x.beginPath(); x.moveTo(i, yy); x.lineTo(i + bw, yy); x.stroke(); } }
}
function ruinsMid(x, w) { const R = rng(162);
  // おおきな いしの かべ（ひだり）と アーチ の くらい いりぐち
  ruWall(x, 0, 250, 20, GROUND, R, 44, 25);
  // くらい いりぐち
  x.fillStyle = RU.line; x.beginPath(); x.moveTo(52, GROUND); x.lineTo(52, 120); x.quadraticCurveTo(52, 70, 130, 64); x.quadraticCurveTo(208, 70, 208, 120); x.lineTo(208, GROUND); x.fill();
  const dg = x.createLinearGradient(0, 70, 0, GROUND); dg.addColorStop(0, '#2c3344'); dg.addColorStop(1, '#4b5468'); x.fillStyle = dg;
  x.beginPath(); x.moveTo(57, GROUND); x.lineTo(57, 121); x.quadraticCurveTo(58, 75, 130, 69); x.quadraticCurveTo(203, 75, 203, 121); x.lineTo(203, GROUND); x.fill();
  // なかの ひかり（おくの へや）と ななめの かげ
  x.fillStyle = 'rgba(160,172,196,0.35)'; x.beginPath(); x.moveTo(120, GROUND); x.lineTo(150, 110); x.lineTo(203, 118); x.lineTo(203, GROUND); x.fill();
  x.strokeStyle = 'rgba(20,24,34,0.6)'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(70, 100); x.lineTo(120, 150); x.moveTo(150, 90); x.lineTo(110, 200); x.stroke();
  // アーチの いし
  for (let i = 0; i <= 8; i++) { const a = Math.PI + (i / 8) * Math.PI, cx = 130 + Math.cos(a) * 86, cy = 118 + Math.sin(a) * 58; x.save(); x.translate(cx, cy); x.rotate(a + Math.PI / 2); ruBlock(x, -11, -9, 22, 16, R, RU.stone2); x.restore(); }
  // かべの ランプ（ぼう と ちいさな かんばん）
  x.fillStyle = RU.line; x.fillRect(228, 118, 7, 96); x.fillStyle = '#5a6680'; x.fillRect(229.5, 118, 4, 96);
  x.fillStyle = RU.line; x.beginPath(); x.moveTo(221, 118); x.lineTo(242, 118); x.lineTo(239, 98); x.lineTo(224, 98); x.fill();
  x.fillStyle = '#eef2f8'; x.fillRect(227, 102, 9, 12);
  x.fillStyle = RU.line; x.fillRect(221, 93, 21, 6); x.beginPath(); x.moveTo(226, 93); x.lineTo(231.5, 86); x.lineTo(237, 93); x.fill();
  // ちいさな かんばん（やじるし だけ）
  x.fillStyle = RU.line; x.fillRect(213, 150, 22, 20); x.fillStyle = '#d8e0ec'; x.fillRect(215, 152, 18, 16);
  x.strokeStyle = RU.line; x.lineWidth = 2; x.beginPath(); x.moveTo(219, 163); x.lineTo(228, 163); x.lineTo(228, 156); x.moveTo(225, 159); x.lineTo(228, 156); x.lineTo(231, 159); x.stroke();
  // みぎの いしがき（こわれた かべ）
  ruWall(x, 470, 640, 90, GROUND, R, 40, 24);
  x.fillStyle = RU.line; x.fillRect(468, 90, 3, GROUND - 90);
  // まんなかの いわの やま（がれき）
  const pile = [[300, 286, 34], [352, 278, 40], [404, 288, 30], [330, 238, 30], [384, 236, 34], [440, 268, 36], [470, 228, 30], [420, 196, 28], [500, 278, 32], [358, 196, 22], [540, 236, 26], [600, 270, 30]];
  for (const [cx, cy, r] of pile) ruBoulder(x, cx, cy, r, R, R() < 0.4 ? RU.stone2 : RU.stone);
  // ちいさな いし
  for (let i = 0; i < 16; i++) ruBoulder(x, 270 + R() * 360, GROUND - 2 - R() * 6, 4 + R() * 6, R);
  // こけ のような しみ（うすい あお）
  grime(x, R, w, 30, GROUND, 14, 'rgba(60,70,95,0.12)');
}
function ruinsFloor(x, w) { const R = rng(163);
  const fg = x.createLinearGradient(0, GROUND - 4, 0, H); fg.addColorStop(0, '#9ca8be'); fg.addColorStop(1, '#7b87a0'); x.fillStyle = fg; x.fillRect(0, GROUND - 4, w, H - GROUND + 4);
  x.fillStyle = RU.line; x.fillRect(0, GROUND - 1, w, 2.5);
  // うすい ひびわれ
  x.strokeStyle = 'rgba(40,46,60,0.45)'; x.lineWidth = 1; for (let i = 0; i < 10; i++) { const cx = R() * w, cy = GROUND + 8 + R() * 40; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + 20 + R() * 30, cy + (R() - 0.5) * 8); x.lineTo(cx + 40 + R() * 40, cy + (R() - 0.5) * 12); x.stroke(); }
  // いしの かけら（しろっぽい ちいさな いし）
  for (let i = 0; i < 26; i++) {
    const cx = R() * w, cy = GROUND + 5 + R() * 46, r = 2.5 + R() * 6;
    x.fillStyle = RU.line; x.beginPath(); x.moveTo(cx - r - 1, cy + 1.5); x.lineTo(cx - r * 0.4, cy - r * 0.7 - 1); x.lineTo(cx + r * 0.7, cy - r * 0.5 - 1); x.lineTo(cx + r + 1, cy + 1.5); x.closePath(); x.fill();
    x.fillStyle = R() < 0.5 ? '#ccd6e6' : '#adbad0'; x.beginPath(); x.moveTo(cx - r, cy + 0.5); x.lineTo(cx - r * 0.4, cy - r * 0.7); x.lineTo(cx + r * 0.7, cy - r * 0.5); x.lineTo(cx + r, cy + 0.5); x.closePath(); x.fill();
  }
}
function ruinsFore(x) {
  // てまえの つりさがる いわ（うえ）
  x.fillStyle = '#6f7a8e'; x.strokeStyle = RU.line; x.lineWidth = 2.5;
  for (const [cx, s] of [[120, 1], [560, 1.3], [930, 0.8]]) { x.beginPath(); x.moveTo(cx - 70 * s, -4); x.lineTo(cx - 40 * s, 22 * s); x.lineTo(cx - 10 * s, 14 * s); x.lineTo(cx + 8 * s, 40 * s); x.lineTo(cx + 30 * s, 18 * s); x.lineTo(cx + 66 * s, 26 * s); x.lineTo(cx + 90 * s, -4); x.closePath(); x.fill(); x.stroke(); }
}
function ruinsLights(ctx, t, cam, vw, th, L, G) {
  // ひろく あかるい（あおじろい ひかり）
  each(cam * 0.6, vw, 320, 160, (i, x) => { L.push(x, 160, 260, 0.75); });
  each(cam * 0.6, vw, 640, 232, (i, x) => { const v = 0.85 + 0.15 * Math.sin(t * 7 + i * 3) * Math.sin(t * 2.3); L.push(x, 108, 90, 0.6 * v); G.push(x, 108, 24, 0.45 * v, 'white', 0); });
}

export const THEMES2 = {
  hospital: { far: hospitalFar, mid: hospitalMid, floor: hospitalFloor, fore: hospitalFore, lights: hospitalLights, wstep: 0, dark: 0.66, atmos: 'dust', plat: ['#262c2a', '#46504b'] },
  base:     { far: baseFar, mid: baseMid, floor: baseFloor, fore: baseFore, lights: baseLights, wstep: 0, dark: 0.64, atmos: 'dust', plat: ['#2c2c22', '#4a4a3a'] },
  forest:   { far: forestFar, mid: forestMid, floor: forestFloor, fore: forestFore, lights: forestLights, wstep: 0, dark: 0.7, atmos: 'spores', fog: 0.7, plat: ['#1f2418', '#36402a'] },
  factory:  { far: factoryFar, mid: factoryMid, floor: factoryFloor, fore: factoryFore, lights: factoryLights, wstep: 0, dark: 0.62, atmos: 'embers', plat: ['#2c2620', '#4a4034'] },
  bridge:   { far: bridgeFar, mid: bridgeMid, floor: bridgeFloor, fore: bridgeFore, lights: bridgeLights, wstep: 0, dark: 0.62, atmos: 'rain', plat: ['#26262c', '#44444c'] },
  ship:     { far: shipFar, mid: shipMid, floor: shipFloor, fore: shipFore, lights: shipLights, wstep: 0, dark: 0.66, atmos: 'drip', plat: ['#2a2620', '#4a4236'] },
  snow:     { far: snowFar, mid: snowMid, floor: snowFloor, fore: snowFore, lights: snowLights, wstep: 0, dark: 0.58, atmos: 'snow', plat: ['#2a323c', '#c8d4e2'] },
  hive:     { far: hiveFar, mid: hiveMid, floor: hiveFloor, fore: hiveFore, lights: hiveLights, wstep: 0, dark: 0.7, atmos: 'spores', plat: ['#2a1a2c', '#4a3050'] },
  airfield: { far: airFar, mid: airMid, floor: airFloor, fore: airFore, lights: airLights, wstep: 0, dark: 0.64, atmos: 'rain', thunder: true, plat: ['#24242a', '#40404a'] },
  ruins:    { far: ruinsFar, mid: ruinsMid, floor: ruinsFloor, fore: ruinsFore, lights: ruinsLights, wstep: 0, dark: 0.26, atmos: 'dust', plat: ['#7c879b', '#c9d1dd'] },
  core:     { far: coreFar, mid: coreMid, floor: coreFloor, fore: coreFore, lights: coreLights, wstep: 0, dark: 0.66, atmos: 'sparks', plat: ['#221c2c', '#3e3250'] },
};
