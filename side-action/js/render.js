// えがく（Canvas 2D）。けいさんは game.js、ここは みためだけ
import { H, GROUND, WEAPONS } from './rules.js';

const OUT = '#111';
const TAU = Math.PI * 2;

export class Renderer {
  constructor(canvas) {
    this.cv = canvas; this.ctx = canvas.getContext('2d', { alpha: false });
    this.layers = {}; this.dpr = 1; this.scale = 1; this.viewW = 667;
  }
  resize(cssW, cssH, dpr) {
    this.dpr = dpr; this.cv.width = Math.round(cssW * dpr); this.cv.height = Math.round(cssH * dpr);
    this.scale = cssH / H; this.viewW = cssW / this.scale; this.layers = {}; this.vig = null;
    return this.viewW;
  }
  // ---------- はいけい（さきに えがいて おく） ----------
  layer(theme, name, w, draw) {
    const key = theme + name;
    if (this.layers[key]) return this.layers[key];
    const c = document.createElement('canvas'), k = this.dpr * this.scale;
    c.width = Math.ceil(w * k); c.height = Math.ceil(H * k);
    const x = c.getContext('2d'); x.scale(k, k); draw(x, w);
    return (this.layers[key] = { c, w });
  }
  drawBg(ctx, g) {
    const th = g.stage.theme, cam = g.camX, vw = this.viewW;
    const far = this.layer(th, 'far', 900, th === 'lab' ? labFar : manorFar);
    const mid = this.layer(th, 'mid', 640, th === 'lab' ? labMid : manorMid);
    blitLoop(ctx, far, cam * 0.25, vw);
    blitLoop(ctx, mid, cam * 0.6, vw);
    // うごく ライト
    const t = g.time;
    if (th === 'lab') {
      for (let i = Math.floor(cam / 380); i < (cam + vw) / 380 + 1; i++) {
        const x = i * 380 + 160 - cam, on = Math.sin(t * 3 + i * 1.7) > -0.3;
        ctx.fillStyle = on ? 'rgba(255,40,40,0.9)' : 'rgba(90,20,20,0.9)';
        ctx.fillRect(x - 8, 34, 16, 6);
        if (on) { const gr = ctx.createRadialGradient(x, 40, 2, x, 40, 70); gr.addColorStop(0, 'rgba(255,40,40,0.28)'); gr.addColorStop(1, 'rgba(255,40,40,0)'); ctx.fillStyle = gr; ctx.fillRect(x - 70, 0, 140, 110); }
      }
    } else {
      for (let i = Math.floor(cam / 300); i < (cam + vw) / 300 + 1; i++) {
        const x = i * 300 + 120 - cam, f = 0.75 + Math.sin(t * 9 + i * 3) * 0.12 + Math.sin(t * 23 + i) * 0.06;
        const gr = ctx.createRadialGradient(x, 196, 2, x, 196, 60 * f); gr.addColorStop(0, 'rgba(255,190,90,0.35)'); gr.addColorStop(1, 'rgba(255,160,60,0)');
        ctx.fillStyle = gr; ctx.fillRect(x - 60, 136, 120, 120);
        ctx.fillStyle = '#d9d2bf'; ctx.fillRect(x - 3, 200, 6, 14); ctx.fillStyle = '#ffcf6a'; ctx.beginPath(); ctx.ellipse(x, 195 - f * 2, 2.6, 5 * f, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#3a3140'; ctx.fillRect(x - 9, 213, 18, 4);
      }
    }
    // ゆか
    ctx.fillStyle = th === 'lab' ? '#2b2e35' : '#2a1f22'; ctx.fillRect(0, GROUND, vw, H - GROUND);
    ctx.fillStyle = th === 'lab' ? '#565c66' : '#4a3438'; ctx.fillRect(0, GROUND, vw, 4);
    ctx.fillStyle = th === 'lab' ? '#1c1e23' : '#1c1416';
    const step = th === 'lab' ? 80 : 46;
    for (let x = -((cam) % step); x < vw; x += step) ctx.fillRect(x, GROUND + 4, 3, H - GROUND);
    if (th === 'lab') { ctx.fillStyle = '#c9a63a'; for (let x = -((cam) % 60); x < vw; x += 60) { ctx.beginPath(); ctx.moveTo(x, GROUND + 4); ctx.lineTo(x + 20, GROUND + 4); ctx.lineTo(x + 8, GROUND + 14); ctx.lineTo(x - 12, GROUND + 14); ctx.fill(); } }
  }
  drawPlatforms(ctx, g) {
    const lab = g.stage.theme === 'lab';
    for (const p of g.platforms) {
      const x = p.x - g.camX; if (x > this.viewW || x + p.w < 0) continue;
      ctx.fillStyle = OUT; ctx.fillRect(x - 2, p.y - 2, p.w + 4, 16);
      ctx.fillStyle = lab ? '#59606b' : '#5a4a4e'; ctx.fillRect(x, p.y, p.w, 12);
      ctx.fillStyle = lab ? '#8a929e' : '#7d6a6c'; ctx.fillRect(x, p.y, p.w, 3);
      // ささえ（金具）
      ctx.fillStyle = lab ? '#3a3f47' : '#3a2e30';
      for (const bx of [x + 12, x + p.w - 22]) {
        ctx.fillRect(bx, p.y + 12, 10, GROUND - p.y - 12);
        ctx.beginPath(); ctx.moveTo(bx, p.y + 12); ctx.lineTo(bx + (bx < x + p.w / 2 ? 30 : -20), p.y + 12); ctx.lineTo(bx + (bx < x + p.w / 2 ? 0 : 10), p.y + 40); ctx.fill();
      }
      ctx.fillStyle = '#9aa1ab'; for (let i = 8; i < p.w; i += 24) { ctx.beginPath(); ctx.arc(x + i, p.y + 8, 1.6, 0, TAU); ctx.fill(); }
    }
  }

  // ---------- まいフレーム ----------
  draw(g, opts = {}) {
    const ctx = this.ctx, k = this.dpr * this.scale;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    let sx = 0, sy = 0;
    if (g.shake > 0 && opts.shake !== false) { sx = (Math.random() - 0.5) * g.shake; sy = (Math.random() - 0.5) * g.shake; }
    ctx.save(); ctx.translate(sx, sy);
    this.drawBg(ctx, g);
    ctx.translate(-g.camX, 0);
    const cam = g.camX, vw = this.viewW;
    const vis = (x, m = 120) => x > cam - m && x < cam + vw + m;
    this.drawPlatforms(ctx, { ...g, camX: 0, platforms: g.platforms.filter((p) => p.x + p.w > cam - 20 && p.x < cam + vw + 20) });
    for (const s of g.splats) if (vis(s.x)) drawSplat(ctx, s);
    for (const c of g.crates) if (c.hp > 0 && vis(c.x)) drawCrate(ctx, c);
    for (const k2 of g.pickups) if (vis(k2.x)) drawPickup(ctx, k2, g.time);
    for (const h of g.hazards) drawHazard(ctx, h, g);
    if (g.boss) drawBoss(ctx, g.boss, g);
    for (const e of g.enemies) if (vis(e.x)) drawEnemy(ctx, e, g);
    for (const a of g.allies) if (vis(a.x)) drawFighter(ctx, a, g, a.def.color);
    drawFighter(ctx, g.player, g, '#ff4d3a');
    for (const b of g.bullets) drawBullet(ctx, b);
    for (const q of g.parts) drawPart(ctx, q);
    for (const t of g.texts) drawText(ctx, t);
    ctx.restore();
    ctx.setTransform(k, 0, 0, k, 0, 0);
    // ふんいき（くらい ふち）
    if (!this.vig || this.vigW !== vw) {
      const c = document.createElement('canvas'); c.width = Math.ceil(vw * k / 2); c.height = Math.ceil(H * k / 2);
      const x = c.getContext('2d'); x.scale(k / 2, k / 2);
      const gr = x.createRadialGradient(vw / 2, H * 0.55, H * 0.35, vw / 2, H * 0.55, vw * 0.62);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.6)'); x.fillStyle = gr; x.fillRect(0, 0, vw, H);
      this.vig = c; this.vigW = vw;
    }
    ctx.drawImage(this.vig, 0, 0, vw, H);
    if (g.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${Math.min(0.45, g.flash * 3)})`; ctx.fillRect(0, 0, vw, H); }
    if (g.player.hp > 0 && g.player.hp < 30) { ctx.strokeStyle = `rgba(160,60,255,${0.25 + Math.sin(g.time * 6) * 0.15})`; ctx.lineWidth = 14; ctx.strokeRect(0, 0, vw, H); }
    this.drawOverlayUi(ctx, g);
  }
  drawOverlayUi(ctx, g) {
    const vw = this.viewW;
    // コンボ
    if (g.combo >= 2) {
      const a = Math.min(1, g.comboT / 0.4);
      ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'right'; ctx.lineJoin = 'round';
      ctx.font = '900 30px system-ui, sans-serif'; ctx.lineWidth = 6; ctx.strokeStyle = OUT; ctx.strokeText(`${g.combo}`, vw - 16, 104); ctx.fillStyle = '#ffe14a'; ctx.fillText(`${g.combo}`, vw - 16, 104);
      ctx.font = '900 13px system-ui, sans-serif'; ctx.lineWidth = 4; ctx.strokeText('コンボ', vw - 16, 120); ctx.fillStyle = '#fff'; ctx.fillText('コンボ', vw - 16, 120);
      ctx.restore();
    }
    // ボスの たいりょく
    const b = g.boss;
    if (b && b.state !== 'intro' && !b.poofed) {
      const w = Math.min(360, vw - 200), x = (vw - w) / 2, y = H - 30;
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(x - 4, y - 16, w + 8, 26);
      ctx.fillStyle = '#3a2350'; ctx.fillRect(x, y, w, 7);
      ctx.fillStyle = '#b04aff'; ctx.fillRect(x, y, w * Math.max(0, b.hp / b.maxHp), 7);
      ctx.font = '800 11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#e8d8ff'; ctx.fillText(b.def.name, vw / 2, y - 4);
    }
    // すすめ
    if (g.go > 0 && Math.sin(g.time * 10) > -0.2) {
      ctx.save(); ctx.font = '900 34px system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.lineWidth = 7; ctx.strokeStyle = OUT; ctx.lineJoin = 'round';
      ctx.strokeText('GO →', vw - 20, 160); ctx.fillStyle = '#ffe14a'; ctx.fillText('GO →', vw - 20, 160); ctx.restore();
    }
    if (g.banner) {
      const a = Math.min(1, g.banner.t * 2);
      ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.lineJoin = 'round';
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 118, vw, g.banner.small ? 76 : 56);
      ctx.font = '900 34px system-ui, sans-serif'; ctx.lineWidth = 7; ctx.strokeStyle = OUT; ctx.strokeText(g.banner.big, vw / 2, 160);
      ctx.fillStyle = '#fff'; ctx.fillText(g.banner.big, vw / 2, 160);
      if (g.banner.small) { ctx.font = '800 16px system-ui, sans-serif'; ctx.fillStyle = '#ff8a8a'; ctx.fillText(g.banner.small, vw / 2, 184); }
      ctx.restore();
    }
  }
}

function blitLoop(ctx, L, off, vw) {
  const w = L.w; let x = -((off % w) + w) % w;
  for (; x < vw; x += w) ctx.drawImage(L.c, x, 0, w, H);
}

// ---------- はいけい の え ----------
function labFar(x, w) {
  const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0d0e12'); gr.addColorStop(1, '#1c1e24');
  x.fillStyle = gr; x.fillRect(0, 0, w, H);
  // おおきな パイプ と タンク
  x.fillStyle = '#16181d';
  for (let i = 0; i < 4; i++) { const tx = 40 + i * 230; x.fillRect(tx, 90, 90, 230); x.beginPath(); x.ellipse(tx + 45, 90, 45, 18, 0, 0, TAU); x.fill(); }
  x.fillStyle = '#20232a'; x.fillRect(0, 70, w, 10); x.fillRect(0, 140, w, 6);
  x.fillStyle = 'rgba(255,40,40,0.5)'; x.fillRect(0, 54, w, 2);
  x.fillStyle = '#121317'; for (let i = 0; i < w; i += 60) x.fillRect(i, 0, 4, 70);
}
function labMid(x, w) {
  // かべ パネル（金具つき）
  x.fillStyle = '#262930'; x.fillRect(0, 96, w, GROUND - 96);
  x.strokeStyle = '#181a1f'; x.lineWidth = 3;
  for (let i = 0; i < w; i += 160) { x.strokeRect(i + 4, 104, 152, 90); x.strokeRect(i + 4, 200, 152, 112); }
  x.fillStyle = '#7d848f';
  for (let i = 0; i < w; i += 160) for (const [bx, by] of [[12, 112], [148, 112], [12, 304], [148, 304]]) { x.beginPath(); x.arc(i + bx, by, 2.4, 0, TAU); x.fill(); }
  // L がたの かなぐ
  for (let i = 0; i < w; i += 320) {
    x.fillStyle = '#4a4f58'; x.fillRect(i + 60, 150, 70, 10); x.fillRect(i + 60, 150, 10, 44);
    x.fillStyle = '#9aa1ab'; x.beginPath(); x.arc(i + 66, 155, 2, 0, TAU); x.arc(i + 120, 155, 2, 0, TAU); x.fill();
  }
  // けいこく しま
  for (let i = 0; i < w; i += 22) { x.fillStyle = (i / 22) % 2 ? '#c9a63a' : '#1b1b1b'; x.beginPath(); x.moveTo(i, 290); x.lineTo(i + 22, 290); x.lineTo(i + 12, 300); x.lineTo(i - 10, 300); x.fill(); }
  x.fillStyle = 'rgba(255,40,40,0.55)'; x.fillRect(0, 98, w, 2);
  // パイプ
  x.fillStyle = '#353942'; x.fillRect(0, 230, w, 9); x.fillStyle = '#4b505a'; x.fillRect(0, 230, w, 3);
  x.fillStyle = '#2f333b'; for (let i = 100; i < w; i += 320) { x.fillRect(i, 226, 12, 17); }
}
function manorFar(x, w) {
  const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0b0814'); gr.addColorStop(1, '#1b1426');
  x.fillStyle = gr; x.fillRect(0, 0, w, H);
  // つき
  x.fillStyle = 'rgba(220,210,255,0.08)'; x.beginPath(); x.arc(640, 70, 60, 0, TAU); x.fill();
  x.fillStyle = '#d8d2ef'; x.beginPath(); x.arc(640, 70, 26, 0, TAU); x.fill();
  x.fillStyle = '#0b0814'; x.beginPath(); x.arc(652, 62, 24, 0, TAU); x.fill();
  // とおくの とう
  x.fillStyle = '#120d1c';
  for (const [tx, tw, th] of [[60, 70, 210], [210, 50, 260], [430, 90, 190], [760, 60, 240]]) { x.fillRect(tx, H - th, tw, th); x.beginPath(); x.moveTo(tx - 6, H - th); x.lineTo(tx + tw / 2, H - th - 50); x.lineTo(tx + tw + 6, H - th); x.fill(); }
  x.fillStyle = 'rgba(255,200,90,0.35)'; for (const [wx, wy] of [[230, 150], [455, 210], [785, 170]]) x.fillRect(wx, wy, 6, 10);
}
function manorMid(x, w) {
  x.fillStyle = '#1f1828'; x.fillRect(0, 60, w, GROUND - 60);
  for (let i = 0; i < w; i += 320) {
    // ゴシックの まど
    const cx = i + 160;
    x.fillStyle = '#0e0a16'; x.beginPath(); x.moveTo(cx - 44, 250); x.lineTo(cx - 44, 130); x.quadraticCurveTo(cx - 44, 86, cx, 70); x.quadraticCurveTo(cx + 44, 86, cx + 44, 130); x.lineTo(cx + 44, 250); x.fill();
    x.fillStyle = 'rgba(150,130,220,0.18)'; x.beginPath(); x.moveTo(cx - 36, 246); x.lineTo(cx - 36, 132); x.quadraticCurveTo(cx - 36, 94, cx, 80); x.quadraticCurveTo(cx + 36, 94, cx + 36, 132); x.lineTo(cx + 36, 246); x.fill();
    x.strokeStyle = '#2d2338'; x.lineWidth = 4; x.beginPath(); x.moveTo(cx, 80); x.lineTo(cx, 246); x.moveTo(cx - 36, 170); x.lineTo(cx + 36, 170); x.stroke();
    // はしら
    x.fillStyle = '#2b2235'; x.fillRect(i, 60, 26, GROUND - 60); x.fillStyle = '#382d44'; x.fillRect(i, 60, 6, GROUND - 60);
    // くものす
    x.strokeStyle = 'rgba(200,200,220,0.18)'; x.lineWidth = 1;
    x.beginPath(); for (let r = 10; r < 40; r += 9) x.arc(i + 26, 60, r, 0, Math.PI / 2); for (let a = 0; a <= 3; a++) { x.moveTo(i + 26, 60); x.lineTo(i + 26 + Math.cos(a * 0.52) * 40, 60 + Math.sin(a * 0.52) * 40); } x.stroke();
  }
  x.fillStyle = '#140f1c'; x.fillRect(0, 56, w, 8);
  x.fillStyle = '#2a1f2e'; x.fillRect(0, 262, w, GROUND - 262);
  x.strokeStyle = '#1a121e'; x.lineWidth = 2; for (let i = 0; i < w; i += 40) x.strokeRect(i, 262, 40, GROUND - 262);
}

// ---------- もの ----------
function drawCrate(ctx, c) {
  const x = c.x - 20 + (c.hit > 0 ? (Math.random() - 0.5) * 4 : 0), y = c.y - 40;
  ctx.fillStyle = OUT; ctx.fillRect(x - 2, y - 2, 44, 44);
  ctx.fillStyle = c.hit > 0 ? '#e0b070' : '#8b5a2b'; ctx.fillRect(x, y, 40, 40);
  ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 3; ctx.strokeRect(x + 4, y + 4, 32, 32);
  ctx.beginPath(); ctx.moveTo(x + 4, y + 4); ctx.lineTo(x + 36, y + 36); ctx.stroke();
}
function drawPickup(ctx, k, t) {
  const y = k.y - 22 + Math.sin(t * 4 + k.t) * 4, x = k.x;
  const gr = ctx.createRadialGradient(x, y, 2, x, y, 30); gr.addColorStop(0, 'rgba(255,255,200,0.45)'); gr.addColorStop(1, 'rgba(255,255,200,0)');
  ctx.fillStyle = gr; ctx.fillRect(x - 30, y - 30, 60, 60);
  if (k.kind === 'heal') {
    ctx.fillStyle = OUT; ctx.fillRect(x - 13, y - 11, 26, 22); ctx.fillStyle = '#f4f4f4'; ctx.fillRect(x - 11, y - 9, 22, 18);
    ctx.fillStyle = '#2fbf4a'; ctx.fillRect(x - 3, y - 7, 6, 14); ctx.fillRect(x - 7, y - 3, 14, 6);
  } else if (k.kind === 'ammo') {
    ctx.fillStyle = OUT; ctx.fillRect(x - 13, y - 10, 26, 20); ctx.fillStyle = '#5c6b3a'; ctx.fillRect(x - 11, y - 8, 22, 16);
    ctx.fillStyle = '#e4b84a'; for (let i = -7; i <= 5; i += 6) ctx.fillRect(x + i, y - 13, 3, 9);
  } else drawGun(ctx, k.kind, x - 14, y, 0, 1, 1.1);
}
// ぶき（みぎむき、もちて が 0,0）
export function drawGun(ctx, id, x, y, ang, face, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(face * s, s); ctx.rotate(ang);
  ctx.lineWidth = 1.6; ctx.strokeStyle = OUT; ctx.lineJoin = 'round';
  const R = (c, rx, ry, rw, rh) => { ctx.fillStyle = c; ctx.fillRect(rx, ry, rw, rh); ctx.strokeRect(rx, ry, rw, rh); };
  if (id === 'pistol') { R('#9aa0a8', -2, -7, 20, 6); R('#3a3d42', -2, -2, 6, 9); R('#c8ccd2', 0, -7, 16, 2); }
  else if (id === 'smg') { R('#7f868e', -14, -6, 10, 4); R('#b8352d', -4, -8, 22, 8); R('#5b6067', 18, -6, 9, 3); R('#3a3d42', 6, 0, 5, 12); R('#3a3d42', -3, 0, 5, 8); R('#d6d9de', 0, -8, 14, 2); }
  else if (id === 'rifle') { R('#4a4d52', -18, -7, 14, 8); R('#6b6f76', -4, -8, 30, 7); R('#3a3d42', 26, -6, 14, 3); R('#2e3034', 8, -1, 6, 11); R('#3a3d42', -2, -1, 5, 8); R('#c9a24a', 4, -13, 12, 4); R('#222', 40, -7, 3, 5); }
  else if (id === 'shotgun') { R('#7a4a2a', -18, -6, 16, 7); R('#4a4d52', -2, -8, 36, 4); R('#4a4d52', -2, -4, 36, 4); R('#8a5a32', 12, -1, 14, 5); R('#3a3d42', -3, -1, 5, 8); }
  else if (id === 'bazooka') { R('#4f6b3a', -22, -12, 52, 11); R('#3a4a2a', 26, -14, 8, 15); R('#d8c04a', -24, -11, 5, 9); R('#3a3d42', 0, -2, 5, 9); R('#3a3d42', -12, -2, 5, 7); }
  else if (id === 'dark') { R('#2a2a30', -14, -6, 34, 6); R('#1a1a1e', 4, 0, 6, 10); R('#ff3b3b', 16, -5, 3, 2); }
  ctx.restore();
}

// ---------- しろい ヒーロー ----------
function limb(ctx, pts, w = 7, col = '#fff') {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.strokeStyle = OUT; ctx.lineWidth = w + 3.5; ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke();
}
function glove(ctx, x, y, col = '#fff', r = 5.5) { ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(x, y, r + 1.7, 0, TAU); ctx.fill(); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(x - r * 0.6, y + r * 0.2, r * 1.2, 1.4); }

function drawFighter(ctx, f, g, band) {
  const dead = f.hp <= 0 || f.down > 0;
  if (f.inv > 0 && !dead && Math.floor(g.time * 20) % 2 === 0) ctx.globalAlpha = 0.45;
  ctx.save();
  ctx.translate(f.x, f.y);
  // かげ
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(0, (f.onGround ? 0 : GROUND - f.y), 16, 4, 0, 0, TAU); ctx.fill();
  ctx.scale(f.face, 1);
  const id = f.moveId, mt = f.moveT || 0;
  let rot = 0, bob = 0;
  const run = f.onGround && Math.abs(f.vx) > 30 && !f.move;
  const ph = f.anim * 13;
  if (dead) rot = -1.45;
  else if (f.hurtT > 0) rot = -0.3;
  else if (id === 'spin') rot = -(mt / 0.36) * TAU * 0;
  else if (id === 'flykick') rot = 0.5;
  else if (id === 'slide') rot = -0.9;
  else if (!f.onGround) rot = 0.08;
  else if (run) { rot = 0.12; bob = Math.abs(Math.sin(ph)) * -3; }
  else bob = Math.sin(f.anim * 3) * 1.2;
  ctx.translate(0, bob);
  if (dead) ctx.translate(-20, -6);
  ctx.rotate(rot);
  // あし
  let L1, L2;
  const hip = [0, -20];
  if (id === 'kick' || id === 'high' || id === 'spin') {
    const ext = Math.min(1, mt / 0.07) * (mt < (f.move?.t1 ?? 0) + 0.05 ? 1 : 0.4);
    const ang = id === 'high' ? -0.85 : id === 'spin' ? -0.25 : -0.05;
    const flip = id === 'spin' && mt > 0.15 ? -1 : 1;
    L1 = [0, -20, flip * (8 + 30 * ext * Math.cos(ang)), -20 + 30 * ext * Math.sin(ang) + (1 - ext) * 18, flip * (12 + 40 * ext * Math.cos(ang)), -20 + 40 * ext * Math.sin(ang) + (1 - ext) * 20];
    L2 = [0, -20, -6, -10, -4, 0];
  } else if (id === 'flykick') { L1 = [0, -20, 18, -12, 38, -4]; L2 = [0, -20, -10, -14, -8, -2]; }
  else if (id === 'slide') { L1 = [0, -20, 20, -18, 40, -14]; L2 = [0, -20, 8, -6, 18, -4]; }
  else if (!f.onGround) { L1 = [0, -20, 9, -12, 4, -3]; L2 = [0, -20, -6, -12, -10, -4]; }
  else if (run) { const a = Math.sin(ph) * 14, b2 = Math.cos(ph) * 5; L1 = [0, -20, a * 0.6, -10, a, -b2 > 0 ? -b2 : 0]; L2 = [0, -20, -a * 0.6, -10, -a, b2 > 0 ? -b2 : 0]; }
  else { L1 = [0, -20, 5, -10, 7, 0]; L2 = [0, -20, -5, -10, -7, 0]; }
  limb(ctx, L2, 7, '#e9ecef'); ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(L2[4] + 2, L2[5], 6, 3.5, 0, 0, TAU); ctx.fill();
  // からだ（しろい しかく）
  ctx.fillStyle = OUT; roundRect(ctx, -12, -50, 24, 34, 5); ctx.fill();
  ctx.fillStyle = f.hurtT > 0 ? '#ffd6d6' : '#fafafa'; roundRect(ctx, -10, -48, 20, 30, 4); ctx.fill();
  ctx.fillStyle = '#d6dade'; ctx.fillRect(-10, -22, 20, 4);
  ctx.fillStyle = band; ctx.fillRect(-10, -26, 20, 3);
  limb(ctx, L1, 7); ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(L1[4] + 3, L1[5], 6.5, 4, id === 'high' ? -0.6 : 0, 0, TAU); ctx.fill();
  // あたま（おおきな まる）
  const hx = 1, hy = -64;
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(hx, hy, 16.5, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(hx, hy, 14.5, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.beginPath(); ctx.arc(hx - 3, hy + 3, 12, 0, TAU); ctx.fill();
  // はちまき
  ctx.fillStyle = band; ctx.fillRect(hx - 15, hy - 8, 30, 5);
  const fl = Math.sin(g.time * 14 + f.x * 0.01) * 3;
  ctx.beginPath(); ctx.moveTo(hx - 13, hy - 7); ctx.lineTo(hx - 27, hy - 10 + fl); ctx.lineTo(hx - 25, hy - 3 + fl); ctx.closePath(); ctx.fill();
  // かお（シンプル）
  ctx.fillStyle = OUT;
  if (dead) { ctx.lineWidth = 2; ctx.strokeStyle = OUT; for (const ex of [4, 10]) { ctx.beginPath(); ctx.moveTo(hx + ex - 2, hy - 1); ctx.lineTo(hx + ex + 2, hy + 3); ctx.moveTo(hx + ex + 2, hy - 1); ctx.lineTo(hx + ex - 2, hy + 3); ctx.stroke(); } }
  else if (f.move || f.hurtT > 0) { ctx.fillRect(hx + 2, hy, 5, 2.5); ctx.fillRect(hx + 9, hy, 5, 2.5); ctx.fillRect(hx + 6, hy + 7, 5, 2); }
  else { ctx.beginPath(); ctx.ellipse(hx + 4.5, hy + 1, 1.8, 3, 0, 0, TAU); ctx.ellipse(hx + 10.5, hy + 1, 1.8, 3, 0, 0, TAU); ctx.fill(); }
  // て と ぶき
  const W = f.ars ? f.ars.cur : 'pistol';
  const rc = f.recoil || 0;
  if (dead) { glove(ctx, 14, -30); glove(ctx, -12, -34); }
  else if (id && (id === 'jab' || id === 'jab2' || id === 'upper' || id === 'airjab')) {
    const ext = Math.min(1, mt / 0.05) * (mt < f.move.t1 + 0.04 ? 1 : 0.3);
    const px = 10 + ext * 30, py = id === 'upper' ? -40 - ext * 34 : -44;
    glove(ctx, px, py, '#fff', 7.5);
    if (ext > 0.6) { ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px - 26, py - 4); ctx.lineTo(px - 10, py - 4); ctx.moveTo(px - 24, py + 4); ctx.lineTo(px - 10, py + 4); ctx.stroke(); }
    drawGun(ctx, W, -14, -36, 1.1, 1, 0.8); glove(ctx, -12, -34);
  } else if (id) {
    glove(ctx, -16, -44); glove(ctx, 14, -48);
  } else {
    const gx = 16 - rc * 5, gy = -44;
    drawGun(ctx, W, gx, gy, -rc * 0.12, 1, 1);
    glove(ctx, gx + 1, gy + 1);
    const two = W === 'rifle' || W === 'shotgun' || W === 'smg' || W === 'bazooka';
    glove(ctx, two ? gx + 15 : gx - 18, two ? gy - 1 : gy + 8);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  if (f.kind === 'ally' && !dead) {
    ctx.font = '800 10px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = f.def.color; ctx.fillText(f.def.name, f.x, f.y - 88);
    ctx.fillStyle = '#000a'; ctx.fillRect(f.x - 14, f.y - 85, 28, 3); ctx.fillStyle = '#9dff6a'; ctx.fillRect(f.x - 14, f.y - 85, 28 * f.hp / f.maxHp, 3);
  } else if (f.kind === 'ally' && f.down > 0) {
    ctx.font = '800 10px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(`${Math.ceil(f.down)}`, f.x, f.y - 40);
  }
  if (f.kind === 'player' && !dead) { ctx.fillStyle = '#ffe14a'; ctx.beginPath(); ctx.moveTo(f.x - 5, f.y - 92); ctx.lineTo(f.x + 5, f.y - 92); ctx.lineTo(f.x, f.y - 86); ctx.fill(); }
}
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

// ---------- こわい てき ----------
function eyesGlow(ctx, pts, col, r, glow) {
  if (glow) { for (const [x, y] of pts) { const gr = ctx.createRadialGradient(x, y, 0, x, y, r * 4); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gr; ctx.fillRect(x - r * 4, y - r * 4, r * 8, r * 8); } }
  ctx.fillStyle = col; for (const [x, y] of pts) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
}
function drawEnemy(ctx, e, g) {
  const d = e.def;
  ctx.save(); ctx.translate(e.x, e.y);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(0, Math.min(0, GROUND - e.y) * 0 + (GROUND - e.y > 0 && !e.onGround ? GROUND - e.y : 0), e.w * 0.6, 4, 0, 0, TAU); ctx.fill();
  if (e.spawnT > 0) ctx.globalAlpha = 0.5;
  ctx.scale(e.face, 1);
  const air = e.state === 'air', down = e.state === 'down';
  const wind = e.state === 'wind', atk = e.state === 'attack';
  const flash = e.flashT > 0;
  const ph = e.anim * 10, walk = e.onGround && Math.abs(e.vx) > 20 && e.state === 'walk';
  if (air) ctx.rotate(e.dead ? -0.4 - (e.deadT || 0) * 8 : -0.5);
  if (down) { ctx.translate(-10, 0); ctx.rotate(-1.35); }
  if (e.state === 'hurt') ctx.rotate(-0.22);
  const shake = wind ? Math.sin(e.anim * 60) * 1.2 : 0;
  ctx.translate(shake, 0);
  if (e.type === 'crawler') drawCrawler(ctx, e, ph, wind || e.state === 'leap', flash);
  else {
    const S = e.type === 'brute' ? 1.45 : 1;
    ctx.scale(S, S);
    const body = flash ? '#fff' : e.type === 'brute' ? '#4b4452' : e.type === 'shield' ? '#3d4450' : e.type === 'gunner' ? '#2b2c33' : '#55525e';
    const sw = walk ? Math.sin(ph) * 12 : 0;
    limb(ctx, [0, -20, -sw * 0.6, -10, -sw, 0], 7, flash ? '#fff' : '#3a3742');
    ctx.fillStyle = OUT; roundRect(ctx, -12, -50, 24, 34, 4); ctx.fill();
    ctx.fillStyle = body; roundRect(ctx, -10, -48, 20, 30, 3); ctx.fill();
    // ぬいめ
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, -46); ctx.lineTo(0, -20); for (let y = -44; y < -20; y += 6) { ctx.moveTo(-3, y); ctx.lineTo(3, y + 2); } ctx.stroke();
    limb(ctx, [0, -20, sw * 0.6, -10, sw, 0], 7, flash ? '#fff' : '#3a3742');
    // あたま
    const hy = -64;
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(1, hy, 16.5, 0, TAU); ctx.fill();
    ctx.fillStyle = flash ? '#fff' : e.type === 'gunner' ? '#1d1d22' : '#8d8a96'; ctx.beginPath(); ctx.arc(1, hy, 14.5, 0, TAU); ctx.fill();
    if (e.type === 'gunner') {
      // フードと バイザー
      ctx.fillStyle = '#0f0f12'; ctx.beginPath(); ctx.arc(1, hy - 2, 16, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
      ctx.fillStyle = '#000'; ctx.fillRect(-2, hy - 3, 17, 7);
      eyesGlow(ctx, [[8, hy]], wind ? '#ff2a2a' : '#c41e1e', 2.4, true); ctx.fillStyle = wind ? '#ff5a5a' : '#c41e1e'; ctx.fillRect(1, hy - 1, 13, 2);
    } else {
      // しろい マスク（あなの め・ぬった くち）
      ctx.fillStyle = flash ? '#fff' : '#e9e4d8'; ctx.beginPath(); ctx.ellipse(6, hy + 1, 9.5, 12, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#6a6458'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-1, hy - 8); ctx.lineTo(3, hy - 4); ctx.stroke();
      ctx.fillStyle = '#0b0b0b'; ctx.beginPath(); ctx.ellipse(3, hy - 2, 2.8, 3.8, 0.2, 0, TAU); ctx.ellipse(11, hy - 2, 2.8, 3.8, -0.2, 0, TAU); ctx.fill();
      eyesGlow(ctx, [[3, hy - 2], [11, hy - 2]], wind || atk ? '#ff2a2a' : '#b51d1d', wind ? 1.5 : 1.1, wind || atk || e.type === 'brute');
      ctx.strokeStyle = '#222'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(1, hy + 7); ctx.lineTo(12, hy + 7); for (let x = 2; x <= 11; x += 3) { ctx.moveTo(x, hy + 5); ctx.lineTo(x, hy + 9); } ctx.stroke();
      if (e.type === 'shield' || e.type === 'brute') { ctx.fillStyle = flash ? '#fff' : '#4a525e'; ctx.beginPath(); ctx.arc(1, hy - 3, 16, Math.PI * 1.02, Math.PI * 1.98); ctx.fill(); ctx.fillStyle = '#2b2f36'; ctx.fillRect(-15, hy - 5, 32, 3); }
    }
    // て
    const hc = flash ? '#fff' : '#bdb8c4';
    if (e.type === 'gunner') { drawGun(ctx, 'dark', 16, -44, wind ? -0.05 : 0.15, 1, 1); glove(ctx, 17, -43, hc); glove(ctx, 30, -45, hc); }
    else if (e.type === 'shield' && e.shieldHp > 0) {
      glove(ctx, 10, -40, hc);
      ctx.fillStyle = OUT; ctx.fillRect(16, -78, 12, 74); ctx.fillStyle = flash ? '#fff' : '#6f7a88'; ctx.fillRect(18, -76, 8, 70);
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(19, -74, 2, 66); ctx.fillStyle = '#ffd23a'; ctx.fillRect(18, -50, 8, 5);
      const cr = 1 - e.shieldHp / d.shieldHp; if (cr > 0.3) { ctx.strokeStyle = '#222'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(18, -66); ctx.lineTo(24, -58); ctx.lineTo(20, -48); if (cr > 0.6) { ctx.moveTo(26, -30); ctx.lineTo(20, -22); } ctx.stroke(); }
    } else {
      const reach = atk ? 26 : wind ? -6 : 8 + Math.sin(e.anim * 4) * 2;
      glove(ctx, reach + 8, -42, hc, e.type === 'brute' ? 7 : 5.5);
      glove(ctx, -12, -40 + Math.sin(e.anim * 4) * 2, hc);
      if (e.type === 'brute' || e.type === 'grunt') { ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.beginPath(); for (let i = -1; i <= 1; i++) { ctx.moveTo(reach + 13, -42 + i * 3); ctx.lineTo(reach + 18, -42 + i * 3.5); } ctx.stroke(); }
      if (atk) { ctx.strokeStyle = 'rgba(255,80,80,0.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(10, -42, 28, -0.8, 0.8); ctx.stroke(); }
    }
  }
  ctx.restore();
  if (wind && !e.dead) { ctx.font = '900 16px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = OUT; const yy = e.y - e.h - 12; ctx.strokeText('！', e.x, yy); ctx.fillStyle = '#ff3b3b'; ctx.fillText('！', e.x, yy); }
  if (!e.dead && e.hp < e.maxHp) { ctx.fillStyle = '#000a'; ctx.fillRect(e.x - 15, e.y - e.h - 6, 30, 3); ctx.fillStyle = e.def.blood === 'purple' ? '#b04aff' : '#63e64b'; ctx.fillRect(e.x - 15, e.y - e.h - 6, 30 * Math.max(0, e.hp / e.maxHp), 3); }
}
function drawCrawler(ctx, e, ph, mad, flash) {
  // くろい かげの いきもの：ほそい あし と にやにや くち
  ctx.strokeStyle = flash ? '#fff' : '#0a0a0c'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const bx = -14 + i * 9, sw = Math.sin(ph * 1.6 + i * 1.7) * 6;
    ctx.beginPath(); ctx.moveTo(bx, -16); ctx.lineTo(bx + 4 + sw, -26); ctx.lineTo(bx + 8 + sw * 1.5, 0); ctx.stroke();
  }
  const pulse = 1 + Math.sin(ph * 0.7) * 0.05;
  ctx.fillStyle = flash ? '#fff' : '#120e18'; ctx.beginPath(); ctx.ellipse(0, -20, 22 * pulse, 13, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = flash ? '#fff' : '#1d1626';
  for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * 6 - 3, -30); ctx.lineTo(i * 6, -38 - Math.abs(Math.sin(ph + i)) * 4); ctx.lineTo(i * 6 + 3, -30); ctx.fill(); }
  eyesGlow(ctx, [[10, -25], [17, -24]], mad ? '#ffffff' : '#e6e0ff', 2.6, true);
  ctx.fillStyle = '#000'; ctx.fillRect(9.5, -26, 1, 2); ctx.fillRect(16.5, -25, 1, 2);
  // にやり
  ctx.fillStyle = '#e8e2d0'; ctx.beginPath(); ctx.moveTo(2, -17); ctx.quadraticCurveTo(12, mad ? -6 : -11, 22, -18); ctx.quadraticCurveTo(12, -14, 2, -17); ctx.fill();
  ctx.strokeStyle = '#120e18'; ctx.lineWidth = 1; ctx.beginPath(); for (let x = 5; x < 21; x += 3) { ctx.moveTo(x, -17); ctx.lineTo(x, -12); } ctx.stroke();
}

// ---------- ボス ----------
function drawBoss(ctx, b, g) {
  if (b.poofed) return;
  if (b.id === 'agent') return drawAgent(ctx, b, g);
  return drawHydra(ctx, b, g);
}
function drawAgent(ctx, b, g) {
  const flash = b.flashT > 0, t = g.time;
  ctx.save(); ctx.translate(b.x, b.y);
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(0, GROUND - b.y, 50, 7, 0, 0, TAU); ctx.fill();
  if (b.dead) { ctx.globalAlpha = Math.max(0, 1 - b.t / 2); ctx.rotate(-Math.min(1.4, b.t)); }
  ctx.scale(b.face * 2, 2);
  const st = b.state, wind = st.endsWith('Wind'), dazed = st === 'dazed' || st === 'down';
  if (st === 'charge') ctx.rotate(0.25);
  if (dazed) ctx.rotate(-0.15);
  const arm = flash ? '#fff' : '#1b1c21', trim = '#e0b62f';
  const sw = Math.abs(b.vx) > 20 && b.onGround ? Math.sin(b.anim * 9) * 9 : 0;
  limb(ctx, [0, -20, -sw * 0.5, -10, -sw, 0], 9, arm);
  ctx.fillStyle = OUT; roundRect(ctx, -16, -54, 32, 38, 5); ctx.fill();
  ctx.fillStyle = arm; roundRect(ctx, -14, -52, 28, 34, 4); ctx.fill();
  ctx.fillStyle = trim; ctx.fillRect(-14, -40, 28, 3); ctx.fillRect(-3, -52, 3, 34);
  ctx.fillStyle = '#34363e'; ctx.fillRect(-18, -54, 10, 9); ctx.fillRect(8, -54, 10, 9);
  limb(ctx, [0, -20, sw * 0.5, -10, sw, 0], 9, arm);
  // ヘルメット
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(1, -68, 16, 0, TAU); ctx.fill();
  ctx.fillStyle = arm; ctx.beginPath(); ctx.arc(1, -68, 14, 0, TAU); ctx.fill();
  ctx.fillStyle = trim; ctx.fillRect(-13, -77, 4, 12);
  ctx.fillStyle = '#000'; ctx.fillRect(-1, -71, 16, 7);
  const ec = wind ? '#ff2a2a' : dazed ? '#666' : '#c81e1e';
  eyesGlow(ctx, [[9, -68]], ec, 2.2, !dazed); ctx.fillStyle = ec; ctx.fillRect(1, -69, 13, 2);
  // うで の ほう
  const aim = st === 'burst' || st === 'burstWind';
  if (aim) { ctx.fillStyle = OUT; ctx.fillRect(10, -50, 30, 11); ctx.fillStyle = '#3b3e46'; ctx.fillRect(12, -48, 28, 7); ctx.fillStyle = trim; ctx.fillRect(14, -48, 4, 7); if (st === 'burst' && Math.sin(t * 60) > 0) { ctx.fillStyle = '#ffe9a0'; ctx.beginPath(); ctx.arc(43, -45, 5, 0, TAU); ctx.fill(); } }
  else { const px = st === 'punch' ? 34 : st === 'punchWind' ? -4 : 14; glove(ctx, px, -42, flash ? '#fff' : '#3b3e46', st === 'punch' ? 9 : 7); }
  glove(ctx, -14, -40, flash ? '#fff' : '#3b3e46', 6);
  ctx.restore();
  if (dazed) { ctx.fillStyle = '#ffe14a'; for (let i = 0; i < 3; i++) { const a = t * 5 + i * 2.1; ctx.font = '900 14px system-ui'; ctx.textAlign = 'center'; ctx.fillText('★', b.x + Math.cos(a) * 26, b.y - 160 + Math.sin(a) * 6); } }
  if (st.endsWith('Wind') && Math.sin(t * 20) > 0) { ctx.font = '900 22px system-ui'; ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.strokeStyle = OUT; ctx.strokeText('！', b.x, b.y - 165); ctx.fillStyle = '#ff3b3b'; ctx.fillText('！', b.x, b.y - 165); }
}
function drawHydra(ctx, b, g) {
  const t = g.time, flash = b.flashT > 0, rise = b.rise;
  ctx.save(); ctx.translate(b.x, GROUND);
  if (b.dead) { ctx.globalAlpha = Math.max(0, 1 - b.t / 2); ctx.translate(0, b.t * 40); }
  ctx.translate(0, (1 - rise) * 200);
  const skin = flash ? '#fff' : '#2a1838', dark = flash ? '#fff' : '#170c22';
  // うしろの しょくしゅ
  for (let i = 0; i < 5; i++) {
    const bx = -10 + i * 22, sw = Math.sin(t * 2 + i * 1.3) * 18;
    ctx.strokeStyle = OUT; ctx.lineWidth = 15 - i; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(bx, -40); ctx.quadraticCurveTo(bx + sw, -150 - i * 10, bx - 30 + sw * 1.4, -230 + i * 12); ctx.stroke();
    ctx.strokeStyle = i % 2 ? skin : '#3b2350'; ctx.lineWidth = 11 - i; ctx.stroke();
  }
  // からだ
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(10, -60, 82, 72, 0, Math.PI, TAU); ctx.lineTo(92, 0); ctx.lineTo(-72, 0); ctx.fill();
  ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(10, -60, 78, 68, 0, Math.PI, TAU); ctx.lineTo(88, 0); ctx.lineTo(-68, 0); ctx.fill();
  ctx.fillStyle = 'rgba(176,74,255,0.25)'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(-40 + i * 22, -30 - (i % 3) * 18, 6 + (i % 2) * 4, 0, TAU); ctx.fill(); }
  // あたま
  const hy = b.lowered ? -50 : -150 + Math.sin(t * 1.6) * 6, hx = b.lowered ? -60 : -40;
  ctx.strokeStyle = OUT; ctx.lineWidth = 30; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(10, -70); ctx.quadraticCurveTo(-10, -120, hx + 10, hy); ctx.stroke();
  ctx.strokeStyle = skin; ctx.lineWidth = 25; ctx.stroke();
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(hx, hy, 40, 32, -0.15, 0, TAU); ctx.fill();
  ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(hx, hy, 37, 29, -0.15, 0, TAU); ctx.fill();
  // ひとつめ
  const open = b.lowered ? 1 : 0.55 + Math.sin(t * 3) * 0.15;
  ctx.fillStyle = '#f2ead8'; ctx.beginPath(); ctx.ellipse(hx - 4, hy - 8, 15, 13 * open, 0, 0, TAU); ctx.fill();
  const px = clamp((g.player.x - b.x) / 40, -6, 2);
  eyesGlow(ctx, [[hx - 4 + px, hy - 8]], b.lowered ? '#ffe14a' : '#d81e1e', 5, true);
  ctx.fillStyle = '#000'; ctx.fillRect(hx - 5 + px, hy - 14, 2, 12);
  // ギザギザ くち
  ctx.fillStyle = '#0a0410'; ctx.beginPath(); ctx.ellipse(hx - 8, hy + 14, 22, 8 + (b.state === 'spit' ? 6 : 0), 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#e8e2d0';
  for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(hx - 8 + i * 6 - 3, hy + 8); ctx.lineTo(hx - 8 + i * 6, hy + 15); ctx.lineTo(hx - 8 + i * 6 + 3, hy + 8); ctx.fill(); }
  ctx.restore();
  if (b.lowered && !b.dead && Math.sin(t * 8) > 0) { ctx.font = '900 18px system-ui'; ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.strokeStyle = OUT; ctx.strokeText('チャンス！', b.x - 60, GROUND - 120); ctx.fillStyle = '#ffe14a'; ctx.fillText('チャンス！', b.x - 60, GROUND - 120); }
}
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

function drawHazard(ctx, h, g) {
  const t = g.time;
  if (h.kind === 'wave') {
    ctx.fillStyle = 'rgba(176,74,255,0.75)'; ctx.beginPath(); ctx.moveTo(h.x, GROUND); ctx.quadraticCurveTo(h.x + h.w / 2, GROUND - h.h * 2, h.x + h.w, GROUND); ctx.fill();
    ctx.fillStyle = '#e8c8ff'; ctx.beginPath(); ctx.moveTo(h.x + 6, GROUND); ctx.quadraticCurveTo(h.x + h.w / 2, GROUND - h.h, h.x + h.w - 6, GROUND); ctx.fill();
  } else if (h.kind === 'sweepWarn') {
    if (Math.sin(t * 24) > 0) { ctx.fillStyle = 'rgba(255,40,40,0.25)'; ctx.fillRect(h.x, h.y, h.w, h.h); ctx.font = '900 16px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#ff6a6a'; ctx.fillText('ジャンプ！', h.x + h.w / 2, h.y - 8); }
  } else if (h.kind === 'sweep') {
    ctx.strokeStyle = OUT; ctx.lineWidth = 24; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(g.boss ? g.boss.x - 60 : h.x + 300, GROUND - 14); ctx.lineTo(h.x, GROUND - 14); ctx.stroke();
    ctx.strokeStyle = '#3b2350'; ctx.lineWidth = 18; ctx.stroke();
    ctx.fillStyle = '#b04aff'; for (let x = h.x + 10; x < (g.boss ? g.boss.x - 60 : h.x + 300); x += 26) { ctx.beginPath(); ctx.arc(x, GROUND - 10, 3, 0, TAU); ctx.fill(); }
  } else if (h.kind === 'spike') {
    if (h.warn > 0) {
      const a = 0.4 + Math.sin(t * 30) * 0.3; ctx.fillStyle = `rgba(176,74,255,${a})`; ctx.beginPath(); ctx.ellipse(h.x + h.w / 2, GROUND - 2, h.w / 2 + 6, 6, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#e0b0ff'; ctx.font = '900 14px system-ui'; ctx.textAlign = 'center'; ctx.fillText('！', h.x + h.w / 2, GROUND - 14);
    } else {
      const k = Math.min(1, (1.45 - 0.85 - h.life) * -1 + 1); const up = Math.min(1, (0.6 - h.life) * 8 + 0.2), hh = h.h * Math.max(0.2, Math.min(1, h.life * 3)) * up;
      ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(h.x, GROUND); ctx.lineTo(h.x + h.w * 0.3, GROUND - hh * 0.7); ctx.lineTo(h.x + h.w * 0.5, GROUND - hh); ctx.lineTo(h.x + h.w * 0.7, GROUND - hh * 0.75); ctx.lineTo(h.x + h.w, GROUND); ctx.fill();
      ctx.fillStyle = '#3b2350'; ctx.beginPath(); ctx.moveTo(h.x + 5, GROUND); ctx.lineTo(h.x + h.w * 0.5, GROUND - hh + 6); ctx.lineTo(h.x + h.w - 5, GROUND); ctx.fill();
      void k;
    }
  }
}
function drawBullet(ctx, b) {
  if (b.owner === 'e') {
    const col = b.w === 'blob' ? '#9b3cff' : '#d040ff';
    const gr = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r * 2.6); gr.addColorStop(0, '#fff'); gr.addColorStop(0.35, col); gr.addColorStop(1, 'rgba(120,0,200,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 2.6, 0, TAU); ctx.fill();
    return;
  }
  if (b.w === 'bazooka') { ctx.fillStyle = OUT; ctx.fillRect(b.x - 9, b.y - 4, 18, 8); ctx.fillStyle = '#d8c04a'; ctx.fillRect(b.x - 7, b.y - 2, 14, 4); ctx.fillStyle = 'rgba(255,170,60,0.8)'; ctx.beginPath(); ctx.arc(b.x - Math.sign(b.vx) * 12, b.y, 4 + Math.random() * 3, 0, TAU); ctx.fill(); return; }
  const len = b.w === 'shotgun' ? 0.012 : 0.02;
  ctx.strokeStyle = b.owner === 'a' ? 'rgba(170,220,255,0.9)' : 'rgba(255,240,170,0.95)'; ctx.lineWidth = b.w === 'rifle' ? 3 : 2.2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(b.x - b.vx * len, b.y - b.vy * len); ctx.lineTo(b.x, b.y); ctx.stroke();
}
function drawPart(ctx, q) {
  const a = Math.max(0, q.life / q.max);
  switch (q.kind) {
    case 'blood': ctx.fillStyle = q.color; ctx.beginPath(); ctx.arc(q.x, q.y, q.size * (0.6 + a * 0.4), 0, TAU); ctx.fill(); break;
    case 'smoke': ctx.globalAlpha = a * 0.8; ctx.fillStyle = q.color; ctx.beginPath(); ctx.arc(q.x, q.y, q.size, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; break;
    case 'fire': ctx.globalAlpha = a; ctx.fillStyle = q.color; ctx.beginPath(); ctx.arc(q.x, q.y, q.size * a, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; break;
    case 'spark': ctx.strokeStyle = q.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - q.vx * 0.03, q.y - q.vy * 0.03); ctx.stroke(); break;
    case 'shell': ctx.fillStyle = q.color; ctx.fillRect(q.x - 2, q.y - 1, 4, 2); break;
    case 'chunk': ctx.fillStyle = q.color; ctx.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size); break;
    case 'dust': ctx.globalAlpha = a * 0.6; ctx.fillStyle = q.color; ctx.beginPath(); ctx.arc(q.x, q.y, q.size * (1.5 - a * 0.5), 0, TAU); ctx.fill(); ctx.globalAlpha = 1; break;
    case 'ring': ctx.globalAlpha = a; ctx.strokeStyle = q.color; ctx.lineWidth = 3 * a + 1; ctx.beginPath(); ctx.arc(q.x, q.y, q.size * (1.2 - a * 0.8), 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; break;
    case 'star': ctx.fillStyle = q.color; ctx.font = `900 ${Math.round(q.size * 2)}px system-ui`; ctx.textAlign = 'center'; ctx.fillText('★', q.x, q.y); break;
    case 'muzzle': {
      ctx.fillStyle = q.color; ctx.beginPath(); const s = q.size;
      ctx.moveTo(q.x - q.face * 4, q.y - s * 0.4); ctx.lineTo(q.x + q.face * s, q.y); ctx.lineTo(q.x - q.face * 4, q.y + s * 0.4); ctx.fill();
      ctx.beginPath(); ctx.arc(q.x, q.y, s * 0.4, 0, TAU); ctx.fill(); break;
    }
  }
}
function drawSplat(ctx, s) {
  const a = Math.min(1, s.life / 2);
  ctx.globalAlpha = a * 0.9; ctx.fillStyle = s.color;
  if (s.wall) { ctx.beginPath(); ctx.ellipse(s.x, s.y, 6, s.r, 0, 0, TAU); ctx.fill(); ctx.fillRect(s.x - 2, s.y, 4, s.r * 1.8); }
  else {
    ctx.beginPath(); ctx.ellipse(s.x, s.y + 1, s.r, s.r * 0.22, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(s.x + s.r * (s.seed - 0.5) * 2.4, s.y + 1, 2.5, 0, TAU); ctx.arc(s.x - s.r * 1.1, s.y + 2, 1.8, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
function drawText(ctx, t) {
  const a = Math.min(1, t.life / (t.max * 0.4));
  const sc = t.pop ? 1 + Math.max(0, (t.life - t.max * 0.7)) * 4 : 1;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(t.x, t.y); ctx.scale(sc, sc); if (t.pop) ctx.rotate(-0.08);
  ctx.font = `900 ${t.size}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, t.size / 4.5); ctx.strokeStyle = OUT; ctx.strokeText(t.text, 0, 0); ctx.fillStyle = t.color; ctx.fillText(t.text, 0, 0);
  ctx.restore();
}
export { WEAPONS };
