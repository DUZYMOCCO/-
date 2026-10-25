// えがく（Canvas 2D）。けいさんは game.js、ここは みためだけ
// v0.2.0: くらくて こわい せかい（あかい ひじょうとう・きり・ちり・ひかりの あな）
import { H, GROUND, WEAPONS, GUN_GEOM, dawnAt } from './rules.js?v=8';
import { drawGun } from './guns.js?v=8';
import { THEMES2 } from './bg2.js?v=8';
import { DAWN_THEME, setDawn } from './dawn.js?v=8';
import { pressState } from './game.js?v=8';
// v0.8.0: ステージ 17「よあけの こうや」（すすむ ほど あかるく なる そら・こうやの ゾンビ・おおさそり）
// v0.6.0: ステージ 6〜15・ミニガン・ビームブラスター・しかけ（ていでん・かたむき・ふぶき・プレス）
// v0.4.0: ズーム カメラ・あたらしい ステージ 3〜5・リアルな じゅう・じゅうじの かお

const OUT = '#0a0a0b';
const TAU = Math.PI * 2;
// ひかり（スクリーン ざひょう）と いろつき グロー
const LIGHTS = [], GLOWS = [];
let GK = 1; // いまの k（eyes の へんかん よう）
function glowAt(ctx, x, y, r, key, a = 1) {
  const m = ctx.getTransform();
  GLOWS.push(x * m.a + y * m.c + m.e, x * m.b + y * m.d + m.f, r * Math.hypot(m.a, m.b), a, key, 1);
}
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hash(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
// ちらつく ライト（0〜1）
function flicker(t, i, bad) {
  if (bad) { const a = Math.sin(t * 31 + i * 7) + Math.sin(t * 17.3 + i) * 0.8; return a > 0.6 ? 0 : Math.sin(t * 2.1 + i * 3) > 0.55 ? 0.15 : 0.85 + Math.sin(t * 60) * 0.1; }
  return Math.sin(t * 0.9 + i * 2.3) > 0.93 ? 0.1 : 0.72 + Math.sin(t * 3.4 + i) * 0.22;
}
const GLOW_COL = { red: [255, 40, 28], warm: [255, 170, 90], purple: [180, 70, 255], cold: [140, 185, 255], white: [235, 235, 255], green: [110, 255, 120], ember: [255, 90, 40] };

export class Renderer {
  constructor(canvas) {
    this.cv = canvas; this.ctx = canvas.getContext('2d', { alpha: false });
    this.layers = {}; this.dpr = 1; this.scale = 1; this.viewW = 667; this.frame = 0;
    // ひかりの スプライト（いちど だけ つくる）
    const mk = (fn) => { const c = document.createElement('canvas'); c.width = c.height = 128; fn(c.getContext('2d')); return c; };
    this.hole = mk((x) => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.45, 'rgba(0,0,0,0.6)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); });
    this.glow = {};
    for (const k in GLOW_COL) {
      const [r, g2, b] = GLOW_COL[k];
      this.glow[k] = mk((x) => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, `rgba(${r},${g2},${b},0.9)`); g.addColorStop(0.18, `rgba(${r},${g2},${b},0.45)`); g.addColorStop(1, `rgba(${r},${g2},${b},0)`); x.fillStyle = g; x.fillRect(0, 0, 128, 128); });
    }
    // きり（よこに ながい もや）
    this.fog = (() => {
      const c = document.createElement('canvas'); c.width = 512; c.height = 120; const x = c.getContext('2d'); const R = rng(7);
      for (let i = 0; i < 40; i++) { const px = R() * 512, py = 40 + R() * 70, r = 30 + R() * 60; for (const ox of [-512, 0, 512]) { const g = x.createRadialGradient(px + ox, py, 0, px + ox, py, r); g.addColorStop(0, 'rgba(120,112,114,0.2)'); g.addColorStop(1, 'rgba(120,112,114,0)'); x.fillStyle = g; x.fillRect(px + ox - r, py - r, r * 2, r * 2); } }
      return c;
    })();
    // ざらざら（フィルムの つぶ）
    this.grain = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const im = x.createImageData(128, 128); const R = rng(3);
      for (let i = 0; i < im.data.length; i += 4) { const v = R() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = R() < 0.5 ? 255 : 0; }
      x.putImageData(im, 0, 0); return c;
    })();
  }
  resize(cssW, cssH, dpr) {
    this.dpr = dpr; this.cv.width = Math.round(cssW * dpr); this.cv.height = Math.round(cssH * dpr);
    this.scale = cssH / H; this.viewW = cssW / this.scale; this.layers = {}; this.vig = null; this.dark = null; this.grainPat = null;
    return this.viewW;
  }
  // ---------- はいけい（さきに えがいて おく） ----------
  layer(theme, name, w, draw, y0 = 0, h = H) {
    const key = theme + name;
    if (this.layers[key]) return this.layers[key];
    const c = document.createElement('canvas'), k = Math.min(2.8, this.dpr * this.scale * (this.zk || 1));
    c.width = Math.ceil(w * k); c.height = Math.ceil(h * k);
    const x = c.getContext('2d'); x.scale(k, k); x.translate(0, -y0); draw(x, w);
    return (this.layers[key] = { c, w, y0, h });
  }
  // v0.8：3まい（よる・あさやけ・ひる）の レイヤー を すすみぐあい で まぜて えがく
  blendLayer(ctx, th, T, name, w, off, vw, p, y0 = 0, h = H) {
    const n = T.pals.length, f = Math.max(0, Math.min(1, p)) * (n - 1), i0 = Math.min(n - 2, Math.floor(f)), u = f - i0;
    const L = (k) => this.layer(th, name + k, w, (x, ww) => T[name](x, ww, T.pals[k]), y0, h);
    if (u < 0.997) blitLoop(ctx, L(i0), off, vw);
    if (u > 0.003) { ctx.globalAlpha = u; blitLoop(ctx, L(i0 + 1), off, vw); ctx.globalAlpha = 1; }
  }
  drawDyn(ctx, g, th, T, cam, vw) {
    const D = g.dawn || dawnAt(0), t = g.time; setDawn(D);
    T.sky(ctx, vw, D, t, cam);
    this.blendLayer(ctx, th, T, 'far', 900, cam * 0.15, vw, D.p, 140, GROUND - 136);
    this.blendLayer(ctx, th, T, 'mid', 640, cam * 0.6, vw, D.p, 80, GROUND - 76);
    T.lights(ctx, t, cam, vw, 0, LIGHTS, GLOWS);
    this.blendLayer(ctx, th, T, 'floor', 640, cam, vw, D.p, GROUND - 4, H - GROUND + 4);
  }
  drawBg(ctx, g, cam, vw) {
    const th = THEMES[g.stage.theme] ? g.stage.theme : 'lab', T = THEMES[th], t = g.time, lab = th === 'lab';
    if (T.dyn) return this.drawDyn(ctx, g, th, T, cam, vw);
    const far = this.layer(th, 'far', 900, T.far);
    const mid = this.layer(th, 'mid', 640, T.mid);
    blitLoop(ctx, far, cam * 0.15, vw);
    // あかい そらの ちらつき（かみなり）
    const thOn = T.atmos ? (th === 'airfield' || th === 'bridge') : th !== 'subway', blueT = th === 'city' || th === 'airfield' || th === 'bridge';
    const thunder = Math.max(0, Math.sin(t * 0.7) * Math.sin(t * 13.1) - 0.85) * 4 * (thOn ? 1 : 0);
    if (thunder > 0) { ctx.fillStyle = blueT ? `rgba(200,210,255,${thunder * 0.3})` : `rgba(255,90,70,${thunder * 0.25})`; ctx.fillRect(0, 0, vw, GROUND); }
    if (th === 'subway') drawBgTrain(ctx, t, cam, vw);
    blitLoop(ctx, mid, cam * 0.6, vw);
    // まどの ひかり（mid と おなじ うごき）
    if (T.wstep) for (let i = Math.floor((cam * 0.6 - 200) / T.wstep); i < (cam * 0.6 + vw + 200) / T.wstep; i++) {
      const x = i * T.wstep + T.wx0 - cam * 0.6;
      LIGHTS.push(x, T.wy, 150, 0.35 + thunder * 0.4);
      GLOWS.push(x, T.wy, 110, 0.18 + thunder * 0.3, T.wkey || 'red', 0);
    }
    T.lights(ctx, t, cam, vw, thunder, LIGHTS, GLOWS);
    // ゆか
    const floor = this.layer(th, 'floor', 640, T.floor, GROUND - 4, H - GROUND + 4);
    blitLoop(ctx, floor, cam, vw);
    if (th === 'city') { // ぬれた ゆかに ネオンが うつる
      for (let i = Math.floor((cam * 0.6 - 200) / 320); i < (cam * 0.6 + vw + 200) / 320; i++) {
        const x = i * 320 + 120 - cam * 0.6, c = NEON[((i % 3) + 3) % 3], v = neonV(t, i);
        if (v < 0.2) continue;
        ctx.globalAlpha = 0.12 * v; ctx.fillStyle = c; ctx.fillRect(x - 30, GROUND + 4, 60, 3); ctx.fillRect(x - 20, GROUND + 12, 40, 2); ctx.fillRect(x - 12, GROUND + 22, 24, 2); ctx.globalAlpha = 1;
      }
    }
  }
  drawPlatforms(ctx, g, cam, vw) {
    const lab = g.stage.theme !== 'manor', PC = (THEMES[g.stage.theme] || {}).plat;
    for (const p of g.platforms) {
      const x = p.x; if (x - cam > vw + 20 || x + p.w - cam < -20) continue;
      ctx.fillStyle = OUT; ctx.fillRect(x - 2, p.y - 2, p.w + 4, 16);
      ctx.fillStyle = PC ? PC[0] : lab ? '#2c2e32' : '#2a2527'; ctx.fillRect(x, p.y, p.w, 12);
      ctx.fillStyle = PC ? PC[1] : lab ? '#4a4d52' : '#433a3c'; ctx.fillRect(x, p.y, p.w, 2);
      ctx.fillStyle = 'rgba(90,50,30,0.35)'; for (let i = 6; i < p.w; i += 37) ctx.fillRect(x + i, p.y + 6, 9, 6);
      ctx.fillStyle = lab ? '#1b1c1f' : '#1c1718';
      for (const bx of [x + 12, x + p.w - 22]) {
        ctx.fillRect(bx, p.y + 12, 10, GROUND - p.y - 12);
        ctx.beginPath(); ctx.moveTo(bx, p.y + 12); ctx.lineTo(bx + (bx < x + p.w / 2 ? 30 : -20), p.y + 12); ctx.lineTo(bx + (bx < x + p.w / 2 ? 0 : 10), p.y + 40); ctx.fill();
      }
      ctx.fillStyle = '#5a5d62'; for (let i = 8; i < p.w; i += 24) ctx.fillRect(x + i - 1, p.y + 7, 2, 2);
    }
  }

  // ---------- まいフレーム ----------
  draw(g, opts = {}) {
    const ctx = this.ctx, k = this.dpr * this.scale, vw = this.viewW, t = g.time, th = g.stage.theme, lab = th === 'lab' || th === 'subway';
    const Z = g.zoom || 1, cam = g.vx ?? g.camX, vy = Z > 1 ? (g.vy || 0) : 0, wvw = vw / Z;
    if (this.zk !== Z) { this.zk = Z; this.layers = {}; }
    this.Z = Z; this.cam = cam; this.vy = vy;
    GK = k; LIGHTS.length = 0; GLOWS.length = 0; this.frame++;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    let sx = 0, sy = 0;
    if (g.shake > 0 && opts.shake !== false) { sx = (Math.random() - 0.5) * g.shake * 1.2; sy = (Math.random() - 0.5) * g.shake * 1.2; }
    ctx.save(); ctx.translate(sx, sy);
    if (g.tilt) { const ts = 1 + Math.abs(g.tilt) * 0.06; ctx.translate(vw / 2, H / 2); ctx.rotate(g.tilt * 0.05); ctx.scale(ts, ts); ctx.translate(-vw / 2, -H / 2); }
    ctx.scale(Z, Z); ctx.translate(0, -vy);
    this.drawBg(ctx, g, cam, wvw);
    ctx.translate(-cam, 0);
    const vis = (x, m = 120) => x > cam - m && x < cam + wvw + m;
    this.drawPlatforms(ctx, g, cam, wvw);
    drawGoo(ctx, g); drawConveyors(ctx, g);
    for (const s of g.splats) if (vis(s.x)) drawSplat(ctx, s);
    for (const c of g.crates) if (c.hp > 0 && vis(c.x)) drawCrate(ctx, c);
    for (const k2 of g.pickups) if (vis(k2.x)) { drawPickup(ctx, k2, t); LIGHTS.push(k2.x - cam, k2.y - 22, 70, 0.7); }
    for (const h of g.hazards) drawHazard(ctx, h, g);
    if (g.boss) drawBoss(ctx, g.boss, g);
    for (const e of g.enemies) if (vis(e.x)) { drawEnemy(ctx, e, g); if (e.state === 'wind' && e.aimX !== undefined && e.def.laser && !e.dead) drawLaser(ctx, e, t); }
    for (const a of g.allies) if (vis(a.x)) { drawFighter(ctx, a, g, STYLES[a.def.id] || STYLES.ao); LIGHTS.push(a.x - cam, a.y - 45, 110, 0.55); }
    const P = g.player;
    drawFighter(ctx, P, g, g.stage.heroLook === 'plain' ? STYLES.plain : STYLES.me);
    LIGHTS.push(P.x - cam, P.y - 45, 160, 0.8);
    drawChargeFx(ctx, P, g, cam);
    drawPresses(ctx, g, cam);
    for (const b of g.bullets) { if (!vis(b.x, 40)) continue; drawBullet(ctx, b); if (b.owner === 'e') LIGHTS.push(b.x - cam, b.y, 60, 0.7); else if (b.w === 'bazooka') LIGHTS.push(b.x - cam, b.y, 70, 0.8); else if (b.w === 'beam') LIGHTS.push(b.x - cam, b.y, 80, 0.7); else if (b.tr) LIGHTS.push(b.x - cam, b.y, 90, 0.75); }
    if (g.beams && g.beams.length) drawBeams(ctx, g, cam);
    for (const q of g.parts) {
      drawPart(ctx, q);
      if (q.kind === 'muzzle') { const s = q.size / 10; LIGHTS.push(q.x - cam, q.y, 150 * s, 1); GLOWS.push(q.x - cam, q.y, 70 * s, 0.9, q.color === '#e9a0ff' ? 'purple' : q.style === 'beam' ? 'cold' : 'warm', 0); }
      else if (q.kind === 'fire') { const a = q.life / q.max; LIGHTS.push(q.x - cam, q.y, q.size * 5, 0.8 * a); GLOWS.push(q.x - cam, q.y, q.size * 3, 0.5 * a, 'ember', 0); }
      else if (q.kind === 'spark' && (this.frame & 1)) GLOWS.push(q.x - cam, q.y, 14, 0.6, 'warm', 0);
    }
    // てまえの ケーブル（すこし はやく うごく）
    const T = THEMES[th] || THEMES.lab;
    ctx.translate(cam, 0);
    if (T.dyn) this.blendLayer(ctx, th, T, 'fore', 1100, cam * 1.25, wvw, (g.dawn || dawnAt(0)).p, 0, 96);
    else blitLoop(ctx, this.layer(th, 'fore', 1100, T.fore, 0, 96), cam * 1.25, wvw);
    ctx.restore();
    // v0.8：あさの いろみ（よるは あおく・ひのでは オレンジ・ひるは そのまま）
    const DW = T.dyn ? (g.dawn || dawnAt(0)) : null;
    if (DW && DW.p < 0.995) { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = `rgb(${DW.tint[0]},${DW.tint[1]},${DW.tint[2]})`; ctx.fillRect(0, 0, vw, H); ctx.globalCompositeOperation = 'source-over'; }
    ctx.setTransform(k, 0, 0, k, 0, 0);
    // ---- くらやみ と ひかりの あな ----
    const hw = Math.ceil(vw * k / 2), hh = Math.ceil(H * k / 2);
    if (!this.dark || this.dark.width !== hw) { this.dark = document.createElement('canvas'); this.dark.width = hw; this.dark.height = hh; this.dctx = this.dark.getContext('2d'); }
    const dc = this.dctx; dc.setTransform(k / 2, 0, 0, k / 2, 0, 0);
    dc.globalCompositeOperation = 'source-over'; dc.globalAlpha = 1;
    dc.clearRect(-50, -50, vw + 100, H + 100);
    const darkA = DW ? Math.max(0, DW.dark - g.flash * 2.5) : Math.min(0.93, Math.max(0.25, (T.dark || 0.64) - g.flash * 2.5) + (g.blackout > 0 ? Math.min(1, g.blackout * 2) * 0.24 : 0));
    dc.fillStyle = `rgba(3,2,4,${darkA})`; dc.fillRect(-50, -50, vw + 100, H + 100);
    dc.setTransform(k / 2 * Z, 0, 0, k / 2 * Z, sx * k / 2, (sy - vy * Z) * k / 2);
    dc.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < LIGHTS.length; i += 4) { const r = LIGHTS[i + 2]; if (LIGHTS[i] + r < -10 || LIGHTS[i] - r > wvw + 10) continue; dc.globalAlpha = Math.min(1, LIGHTS[i + 3]); dc.drawImage(this.hole, LIGHTS[i] - r, LIGHTS[i + 1] - r, r * 2, r * 2); }
    dc.globalAlpha = 1; dc.globalCompositeOperation = 'source-over';
    if (!DW || darkA > 0.01) ctx.drawImage(this.dark, 0, 0, vw, H);
    // ---- いろつきの ひかり（め・ひじょうとう・マズル） ----
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < GLOWS.length; i += 6) {
      let x = GLOWS[i], y = GLOWS[i + 1], r = GLOWS[i + 2];
      if (GLOWS[i + 5]) { x /= k; y /= k; r /= k; } else { x = x * Z + sx; y = (y - vy) * Z + sy; r *= Z; }
      if (x + r < 0 || x - r > vw) continue;
      ctx.globalAlpha = Math.min(1, GLOWS[i + 3]); ctx.drawImage(this.glow[GLOWS[i + 4]] || this.glow.red, x - r, y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    // ---- きり・はい・あめ・ちり（ズームの なか） と もじ ----
    ctx.save(); ctx.translate(sx, sy); ctx.scale(Z, Z); ctx.translate(0, -vy);
    this.drawAtmos(ctx, g, th, cam, wvw);
    ctx.translate(-cam, 0);
    for (const tx of g.texts) if (vis(tx.x, 200)) drawText(ctx, tx);
    ctx.restore();
    // ---- ふち（つよい ビネット） ----
    if (!this.vig || this.vigW !== vw) {
      const c = document.createElement('canvas'); c.width = Math.ceil(vw * k / 2); c.height = Math.ceil(H * k / 2);
      const x = c.getContext('2d'); x.scale(k / 2, k / 2);
      const gr = x.createRadialGradient(vw / 2, H * 0.52, H * 0.22, vw / 2, H * 0.52, vw * 0.6);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.3)'); gr.addColorStop(1, 'rgba(0,0,0,0.88)'); x.fillStyle = gr; x.fillRect(0, 0, vw, H);
      const tb = x.createLinearGradient(0, 0, 0, H); tb.addColorStop(0, 'rgba(0,0,0,0.55)'); tb.addColorStop(0.18, 'rgba(0,0,0,0)'); tb.addColorStop(0.85, 'rgba(0,0,0,0)'); tb.addColorStop(1, 'rgba(0,0,0,0.5)'); x.fillStyle = tb; x.fillRect(0, 0, vw, H);
      this.vig = c; this.vigW = vw;
    }
    ctx.globalAlpha = DW ? DW.vig : 1; ctx.drawImage(this.vig, 0, 0, vw, H); ctx.globalAlpha = 1;
    // ざらざら
    if (!this.grainPat) this.grainPat = ctx.createPattern(this.grain, 'repeat');
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 0.055; const ox = (hash(this.frame >> 1) * 128) | 0, oy = (hash((this.frame >> 1) + 7) * 128) | 0;
    ctx.translate(-ox, -oy); ctx.fillStyle = this.grainPat; ctx.fillRect(ox, oy, this.cv.width, this.cv.height); ctx.restore();
    if (g.flash > 0) { ctx.fillStyle = `rgba(255,235,210,${Math.min(0.4, g.flash * 3)})`; ctx.fillRect(0, 0, vw, H); }
    if (g.player.hp > 0 && g.player.hp < 30) { ctx.strokeStyle = `rgba(150,50,230,${0.3 + Math.sin(t * 6) * 0.15})`; ctx.lineWidth = 16; ctx.strokeRect(0, 0, vw, H); }
    this.drawEdges(ctx, g, cam, vy, Z);
    this.drawOverlayUi(ctx, g);
  }
  // がめんの そとの てき を しらせる やじるし（HUD・ズームしない）
  drawEdges(ctx, g, cam, vy, Z) {
    const vw = this.viewW, t = g.time;
    const mark = (wx, wy, big, col, hot) => {
      const x = (wx - cam) * Z, y = clamp((wy - vy) * Z, 70, H - 70);
      if (x > -4 && x < vw + 4) return;
      const right = x > vw, ex = right ? vw - 8 : 8, s = big ? 13 : 9, d = right ? 1 : -1;
      ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(ex + d * 3, y); ctx.lineTo(ex - d * (s + 3), y - s - 2); ctx.lineTo(ex - d * (s + 3), y + s + 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(ex, y); ctx.lineTo(ex - d * s, y - s); ctx.lineTo(ex - d * s, y + s); ctx.closePath(); ctx.fill();
      if (hot && Math.sin(t * 20) > 0) { ctx.font = '900 15px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = OUT; ctx.strokeText('！', ex - d * (s + 10), y + 5); ctx.fillStyle = '#ff4a3a'; ctx.fillText('！', ex - d * (s + 10), y + 5); }
    };
    ctx.save(); ctx.globalAlpha = 0.85;
    for (const e of g.enemies) { if (e.dead || e.spawnT > 0 || Math.abs(e.x - g.player.x) > 760) continue; mark(e.x, e.y - e.h * 0.5, false, e.def.blood === 'purple' ? '#b45cff' : '#e2533e', e.state === 'wind'); }
    const b = g.boss; if (b && !b.dead && !b.poofed && b.state !== 'intro') mark(b.x, b.y - 80, true, '#d23cff', b.state.endsWith('Wind'));
    ctx.globalAlpha = 1;
    for (const h of g.hazards) if (h.kind === 'trolley' && h.warn > 0 && Math.sin(t * 14) > -0.3) {
      const y = (GROUND - 30 - vy) * Z, x = vw - 70;
      ctx.font = '900 22px system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.lineWidth = 6; ctx.strokeStyle = OUT; ctx.lineJoin = 'round';
      ctx.strokeText('◀◀ トロッコ！', x + 50, clamp(y, 90, H - 60)); ctx.fillStyle = '#ffcf3a'; ctx.fillText('◀◀ トロッコ！', x + 50, clamp(y, 90, H - 60));
    }
    ctx.restore();
  }
  drawAtmos(ctx, g, th, cam, vw) {
    const t = g.time;
    // ゆかの きり
    const fw = 512;
    const AT = (THEMES[th] || {}).atmos;
    ctx.globalAlpha = th === 'subway' ? 0.5 : AT ? Math.min(0.8, 0.34 * (THEMES[th].fog || 0.4) / 0.4) : 0.42;
    if (g.dawn) ctx.globalAlpha = 0.5 * g.dawn.fog; // よあけ：きりは だんだん はれる
    for (const [sp, par, y] of [[9, 0.8, GROUND - 92], [-6, 1.15, GROUND - 70]]) {
      let x = -(((cam * par + t * sp) % fw) + fw) % fw;
      for (; x < vw; x += fw) ctx.drawImage(this.fog, x, y, fw, 120);
    }
    ctx.globalAlpha = g.dawn ? 0.18 * g.dawn.fog : 0.18; ctx.drawImage(this.fog, -((cam * 0.3 + t * 4) % fw), 10, fw * 2, 160);
    ctx.globalAlpha = 1;
    if (AT) drawAtmos2(ctx, g, AT, cam, vw);
    else if (th === 'manor' || th === 'city') {
      // あめ（まちは つよい あめ）
      const n = th === 'city' ? 120 : 70;
      ctx.strokeStyle = th === 'city' ? 'rgba(170,180,205,0.28)' : 'rgba(160,150,165,0.22)'; ctx.lineWidth = 1; ctx.beginPath();
      for (let i = 0; i < n; i++) { const x = ((hash(i) * 900 - cam * 1.1 - t * 160) % 900 + 900) % 900 - 100, y = ((hash(i + 50) * 400 + t * 760) % 400) - 20; ctx.moveTo(x, y); ctx.lineTo(x - 6, y + 18); }
      ctx.stroke();
      if (th === 'city') { ctx.strokeStyle = 'rgba(190,200,225,0.3)'; ctx.beginPath(); for (let i = 0; i < 14; i++) { const x = ((hash(i + 400) * 800 - cam) % 800 + 800) % 800 - 60, p = (t * 2.2 + hash(i + 9)) % 1; ctx.ellipse(x, GROUND + 6 + hash(i + 3) * 30, 2 + p * 9, 0.6 + p * 2, 0, 0, TAU); } ctx.stroke(); }
    } else if (th === 'tower') {
      // ひのこ（したから うえへ）
      for (let i = 0; i < 30; i++) { const x = ((hash(i + 90) * 800 - cam * 0.9 + Math.sin(t + i) * 30) % 800 + 800) % 800 - 60, y = (((hash(i + 70) * 400 - t * (40 + (i % 7) * 9)) % 400) + 400) % 400; const a = 0.35 + 0.45 * Math.sin(t * 5 + i); ctx.fillStyle = `rgba(255,${70 + (i % 5) * 20},40,${a})`; ctx.fillRect(x, y, 2, 2); }
    } else {
      ctx.fillStyle = 'rgba(150,145,140,0.45)';
      for (let i = 0; i < 34; i++) { const x = ((hash(i) * 800 - cam * 0.9 + Math.sin(t * 0.7 + i) * 20 - t * 14) % 800 + 800) % 800 - 60, y = ((hash(i + 30) * 400 + t * (18 + hash(i + 3) * 26)) % 400) - 20; ctx.fillRect(x, y, 2, 1.4); }
      if (th === 'lab') for (let i = 0; i < 8; i++) { const x = ((hash(i + 90) * 800 - cam * 0.9 + t * 20) % 800 + 800) % 800 - 60, y = (((hash(i + 70) * 400 - t * (30 + i * 4)) % 400) + 400) % 400; const a = 0.4 + 0.4 * Math.sin(t * 5 + i); ctx.fillStyle = `rgba(255,${80 + i * 8},40,${a})`; ctx.fillRect(x, y, 2, 2); }
    }
    // ただよう ちり
    ctx.fillStyle = 'rgba(210,200,190,0.22)';
    for (let i = 0; i < 26; i++) { const x = ((hash(i + 200) * 760 + Math.sin(t * 0.3 + i) * 30 - cam * 0.5) % 760 + 760) % 760 - 40, y = 40 + ((hash(i + 300) * 300 + Math.sin(t * 0.5 + i * 2) * 14 - t * 3) % 300 + 300) % 300; ctx.fillRect(x, y, 1.5, 1.5); }
  }
  drawOverlayUi(ctx, g) {
    const vw = this.viewW;
    if (g.combo >= 2) {
      const a = Math.min(1, g.comboT / 0.4);
      ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'right'; ctx.lineJoin = 'round';
      ctx.font = '900 30px system-ui, sans-serif'; ctx.lineWidth = 6; ctx.strokeStyle = OUT; ctx.strokeText(`${g.combo}`, vw - 16, 104); ctx.fillStyle = '#e8d8b0'; ctx.fillText(`${g.combo}`, vw - 16, 104);
      ctx.font = '900 13px system-ui, sans-serif'; ctx.lineWidth = 4; ctx.strokeText('コンボ', vw - 16, 120); ctx.fillStyle = '#d04a3a'; ctx.fillText('コンボ', vw - 16, 120);
      ctx.restore();
    }
    const b = g.boss;
    if (b && b.state !== 'intro' && !b.poofed) {
      const w = Math.min(360, vw - 200), x = (vw - w) / 2, y = H - 30;
      ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(x - 4, y - 16, w + 8, 26);
      ctx.strokeStyle = '#4a1414'; ctx.lineWidth = 1; ctx.strokeRect(x - 4, y - 16, w + 8, 26);
      ctx.fillStyle = '#24141c'; ctx.fillRect(x, y, w, 7);
      ctx.fillStyle = '#8a2ad0'; ctx.fillRect(x, y, w * Math.max(0, b.hp / b.maxHp), 7);
      ctx.font = '800 11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#d8c8c8'; ctx.fillText(b.def.name, vw / 2, y - 4);
    }
    const m = g.mini;
    if (m && !m.dead && m.hp > 0 && g.enemies.includes(m) && !(m.spawnT > 0)) {
      const w = 170, x = vw - w - 16, y = 64;
      ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(x - 3, y - 13, w + 6, 21);
      ctx.fillStyle = '#1c2418'; ctx.fillRect(x, y, w, 5);
      ctx.fillStyle = m.def.blood === 'purple' ? '#9a4ad8' : '#4ab83a'; ctx.fillRect(x, y, w * Math.max(0, m.hp / m.def.hp), 5);
      ctx.font = '800 10px system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.fillStyle = '#e0d8c8'; ctx.fillText('つよい てき ' + m.def.name, x + w, y - 3);
    }
    if (g.go > 0 && Math.sin(g.time * 10) > -0.2) {
      ctx.save(); ctx.font = '900 30px system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.lineWidth = 7; ctx.strokeStyle = OUT; ctx.lineJoin = 'round';
      ctx.strokeText('すすめ ▶', vw - 20, 160); ctx.fillStyle = '#e04a36'; ctx.fillText('すすめ ▶', vw - 20, 160); ctx.restore();
    }
    if (g.banner) {
      const a = Math.min(1, g.banner.t * 2);
      ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.lineJoin = 'round';
      const bh = g.banner.small ? 76 : 56;
      ctx.fillStyle = 'rgba(0,0,0,0.78)'; ctx.fillRect(0, 118, vw, bh);
      ctx.fillStyle = '#7a1a14'; ctx.fillRect(0, 118, vw, 2); ctx.fillRect(0, 118 + bh - 2, vw, 2);
      ctx.font = '900 34px system-ui, sans-serif'; ctx.lineWidth = 7; ctx.strokeStyle = OUT; ctx.strokeText(g.banner.big, vw / 2, 160);
      ctx.fillStyle = '#e6e0d6'; ctx.fillText(g.banner.big, vw / 2, 160);
      if (g.banner.small) { ctx.font = '800 16px system-ui, sans-serif'; ctx.fillStyle = '#d04a3a'; ctx.fillText(g.banner.small, vw / 2, 184); }
      ctx.restore();
    }
  }
}

function blitLoop(ctx, L, off, vw) {
  const w = L.w, y0 = L.y0 || 0, h = L.h || H; let x = -((off % w) + w) % w;
  for (; x < vw; x += w) ctx.drawImage(L.c, x, y0, w, h);
}

// ---------- テーマ（はいけい と うごく ひかり） ----------
function labLights(ctx, t, cam, vw) {
      // ひじょうとう（あかい まわる ライト）
      for (let i = Math.floor(cam / 380); i < (cam + vw) / 380 + 1; i++) {
        const x = i * 380 + 160 - cam, v = flicker(t, i, i % 3 === 1) * (0.55 + 0.45 * Math.max(0, Math.sin(t * 4 + i)));
        ctx.fillStyle = '#121214'; ctx.fillRect(x - 11, 30, 22, 8);
        ctx.fillStyle = v > 0.3 ? '#ff3a2a' : '#3a1210'; ctx.fillRect(x - 8, 38, 16, 6);
        if (v > 0.05) { LIGHTS.push(x, 70, 200, 0.75 * v); GLOWS.push(x, 44, 120, v, 'red', 0); }
      }
      // こわれかけの けいこうとう
      for (let i = Math.floor((cam - 300) / 520); i < (cam + vw) / 520 + 1; i++) {
        const x = i * 520 + 300 - cam, v = flicker(t * 1.3, i + 9, true);
        ctx.strokeStyle = '#0d0d0e'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 20, 0); ctx.lineTo(x - 20, 62); ctx.moveTo(x + 20, 0); ctx.lineTo(x + 24 + Math.sin(t + i) * 2, 70); ctx.stroke();
        ctx.save(); ctx.translate(x, 64); ctx.rotate(0.12 + Math.sin(t * 0.8 + i) * 0.03);
        ctx.fillStyle = '#18191b'; ctx.fillRect(-30, -4, 60, 6); ctx.fillStyle = v > 0.3 ? '#e8ecf0' : '#4a4d52'; ctx.fillRect(-27, 2, 54, 3); ctx.restore();
        if (v > 0.05) { LIGHTS.push(x, 110, 190, 0.6 * v); GLOWS.push(x, 68, 70, 0.5 * v, 'white', 0); }
      }
}
function manorLights(ctx, t, cam, vw) {
      // ろうそく（よわい ひ）
      for (let i = Math.floor(cam / 300); i < (cam + vw) / 300 + 1; i++) {
        const x = i * 300 + 120 - cam, f = 0.7 + Math.sin(t * 9 + i * 3) * 0.15 + Math.sin(t * 23 + i) * 0.08;
        ctx.fillStyle = '#5a5248'; ctx.fillRect(x - 3, 200, 6, 14); ctx.fillStyle = '#ffb060'; ctx.beginPath(); ctx.ellipse(x, 195 - f * 2, 2.4, 4.6 * f, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#141216'; ctx.fillRect(x - 9, 213, 18, 4);
        LIGHTS.push(x, 196, 120 * f, 0.55); GLOWS.push(x, 194, 50 * f, 0.6, 'warm', 0);
      }
    }
const NEON = ['#ff4fa8', '#3ae0ff', '#c8ff3a'], NEON_TXT = ['ホテル', 'くすり', 'ゲーム'], NEON_KEY = ['red', 'cold', 'green'];
function neonV(t, i) { return i % 4 === 1 ? flicker(t * 1.4, i, true) : 0.85 + Math.sin(t * 7 + i) * 0.1; }
function cityLights(ctx, t, cam, vw) {
  // ネオン かんばん（mid と おなじ うごき）
  const m = cam * 0.6;
  for (let i = Math.floor((m - 200) / 320); i < (m + vw + 200) / 320; i++) {
    const x = i * 320 + 120 - m, j = ((i % 3) + 3) % 3, v = neonV(t, i), c = NEON[j];
    ctx.fillStyle = '#0b0b10'; ctx.fillRect(x - 34, 92, 68, 30); ctx.strokeStyle = '#1c1c24'; ctx.lineWidth = 2; ctx.strokeRect(x - 34, 92, 68, 30);
    ctx.font = '900 17px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = v > 0.3 ? c : '#2a2a30'; ctx.fillText(NEON_TXT[j], x, 114);
    if (v > 0.3) { ctx.globalAlpha = 0.35 * v; ctx.fillRect(x - 32, 120, 64, 1.5); ctx.globalAlpha = 1; LIGHTS.push(x, 110, 130, 0.5 * v); GLOWS.push(x, 107, 70, 0.55 * v, NEON_KEY[j], 0); }
  }
  // がいとう（あおじろい ひかり）
  for (let i = Math.floor((cam - 300) / 460); i < (cam + vw) / 460 + 1; i++) {
    const x = i * 460 + 230 - cam, v = flicker(t, i + 3, i % 5 === 2);
    ctx.fillStyle = '#0c0c10'; ctx.fillRect(x - 2, 70, 4, GROUND - 70); ctx.fillRect(x - 2, 68, 26, 4);
    ctx.fillStyle = v > 0.3 ? '#dfe8ff' : '#3a3e48'; ctx.fillRect(x + 12, 72, 14, 3);
    if (v > 0.05) { ctx.globalAlpha = 0.07 * v; ctx.fillStyle = '#cfe0ff'; ctx.beginPath(); ctx.moveTo(x + 12, 75); ctx.lineTo(x + 26, 75); ctx.lineTo(x + 70, GROUND); ctx.lineTo(x - 30, GROUND); ctx.fill(); ctx.globalAlpha = 1; LIGHTS.push(x + 19, 150, 170, 0.6 * v); GLOWS.push(x + 19, 74, 50, 0.6 * v, 'cold', 0); }
  }
}
function subwayLights(ctx, t, cam, vw) {
  for (let i = Math.floor((cam - 300) / 300); i < (cam + vw) / 300 + 1; i++) {
    const x = i * 300 + 150 - cam, bad = i % 3 === 2, v = flicker(t * 1.2, i + 5, bad);
    ctx.fillStyle = '#101114'; ctx.fillRect(x - 26, 40, 52, 6);
    ctx.fillStyle = v > 0.3 ? '#f0f4e8' : '#3a3d40'; ctx.fillRect(x - 22, 46, 44, 3);
    if (v > 0.05) { LIGHTS.push(x, 90, 170, 0.62 * v); GLOWS.push(x, 48, 60, 0.5 * v, 'white', 0); }
    if (i % 4 === 0) { const r = 0.5 + 0.5 * Math.sin(t * 5 + i); ctx.fillStyle = r > 0.5 ? '#ff3a2a' : '#3a1210'; ctx.fillRect(x + 110, 120, 8, 8); GLOWS.push(x + 114, 124, 40, r * 0.8, 'red', 0); LIGHTS.push(x + 114, 124, 70, r * 0.4); }
  }
}
function towerLights(ctx, t, cam, vw) {
  for (let i = Math.floor((cam - 300) / 360); i < (cam + vw) / 360 + 1; i++) {
    const x = i * 360 + 180 - cam, f = 0.75 + Math.sin(t * 11 + i * 3) * 0.12 + Math.sin(t * 27 + i) * 0.08;
    ctx.fillStyle = '#141014'; ctx.fillRect(x - 3, GROUND - 70, 6, 70); ctx.beginPath(); ctx.moveTo(x - 16, GROUND - 76); ctx.lineTo(x + 16, GROUND - 76); ctx.lineTo(x + 9, GROUND - 64); ctx.lineTo(x - 9, GROUND - 64); ctx.fill();
    ctx.fillStyle = '#ff7a2a'; ctx.beginPath(); ctx.moveTo(x - 12, GROUND - 76); ctx.quadraticCurveTo(x - 6, GROUND - 92 - f * 8, x + Math.sin(t * 9 + i) * 3, GROUND - 100 - f * 12); ctx.quadraticCurveTo(x + 6, GROUND - 90 - f * 8, x + 12, GROUND - 76); ctx.fill();
    ctx.fillStyle = '#ffd36a'; ctx.beginPath(); ctx.ellipse(x, GROUND - 82, 5, 7 * f, 0, 0, TAU); ctx.fill();
    LIGHTS.push(x, GROUND - 86, 190 * f, 0.75); GLOWS.push(x, GROUND - 86, 80 * f, 0.7, 'ember', 0);
  }
}
// とおくを はしる でんしゃ（まどが ひかる）
function drawBgTrain(ctx, t, cam, vw) {
  const per = 13, p = (t % per) / per, len = 900, x = vw + 200 - p * (vw + len + 1400) + 0;
  if (x > vw + 50 || x + len < -50) return;
  ctx.fillStyle = '#16171b'; ctx.fillRect(x, 150, len, 90);
  ctx.fillStyle = '#26282d'; ctx.fillRect(x, 150, len, 4);
  for (let w = x + 20; w < x + len - 30; w += 46) { const on = hash(Math.floor(w - x) + 3) > 0.25; ctx.fillStyle = on ? '#d8d2a0' : '#2a2a26'; ctx.fillRect(w, 168, 30, 24); if (on && w > -40 && w < vw + 40) { LIGHTS.push(w + 15, 180, 60, 0.4); } }
  for (let c = x + 296; c < x + len; c += 300) { ctx.fillStyle = '#060607'; ctx.fillRect(c, 150, 8, 90); }
  ctx.fillStyle = '#fff6c0'; ctx.fillRect(x - 4, 200, 6, 8); GLOWS.push(x - 2, 204, 70, 0.9, 'warm', 0); LIGHTS.push(x - 30, 204, 140, 0.7);
}

function cityFar(x, w) {
  const R = rng(41);
  const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#05040a'); gr.addColorStop(0.4, '#1a0f22'); gr.addColorStop(0.7, '#3a1420'); gr.addColorStop(1, '#0c0608');
  x.fillStyle = gr; x.fillRect(0, 0, w, H);
  for (let i = 0; i < 30; i++) { x.fillStyle = `rgba(6,4,10,${0.35 + R() * 0.4})`; x.beginPath(); x.ellipse(R() * w, 10 + R() * 120, 80 + R() * 140, 8 + R() * 12, 0, 0, TAU); x.fill(); }
  let px = -10;
  while (px < w + 10) {
    const bw = 40 + R() * 60, bh = 110 + R() * 170, top = 320 - bh;
    x.fillStyle = '#0b0910'; x.fillRect(px, top, bw, bh + 60);
    if (R() < 0.35) x.fillRect(px + bw * 0.45, top - 30, 3, 30);
    for (let wy = top + 8; wy < 310; wy += 11) for (let wx = px + 5; wx < px + bw - 6; wx += 9) if (R() < 0.12) { x.fillStyle = R() < 0.5 ? 'rgba(230,190,120,0.55)' : 'rgba(150,200,255,0.4)'; x.fillRect(wx, wy, 4, 5); }
    px += bw + 4 + R() * 12;
  }
  x.fillStyle = '#07060a'; x.fillRect(0, 316, w, H - 316);
}
function cityMid(x, w) {
  const R = rng(43);
  x.fillStyle = '#141318'; x.fillRect(0, 60, w, GROUND - 60);
  x.fillStyle = '#0c0b0f'; x.fillRect(0, 50, w, 12);
  // ビルの かべ（コンクリート）と まど
  for (let i = 0; i < w; i += 320) {
    x.fillStyle = '#18161c'; x.fillRect(i + 4, 62, 150, GROUND - 62);
    x.strokeStyle = '#0d0c10'; x.lineWidth = 2; for (let y = 140; y < GROUND; y += 60) { x.beginPath(); x.moveTo(i + 4, y); x.lineTo(i + 154, y); x.stroke(); }
    for (let wy = 150; wy < 260; wy += 56) for (let wx = i + 176; wx < i + 300; wx += 44) { x.fillStyle = '#0a090c'; x.fillRect(wx, wy, 30, 36); x.fillStyle = 'rgba(80,90,120,0.18)'; x.fillRect(wx + 2, wy + 2, 12, 32); x.strokeStyle = '#0a090c'; x.beginPath(); x.moveTo(wx + 15, wy); x.lineTo(wx + 15, wy + 36); x.stroke(); }
    // シャッター
    x.fillStyle = '#26252b'; x.fillRect(i + 20, 250, 110, GROUND - 250); x.strokeStyle = '#1a191e'; x.lineWidth = 1.5; for (let y = 254; y < GROUND; y += 5) { x.beginPath(); x.moveTo(i + 20, y); x.lineTo(i + 130, y); x.stroke(); }
    x.font = '900 14px system-ui, sans-serif'; x.fillStyle = 'rgba(200,60,80,0.25)'; x.fillText('ここから にげろ', i + 26, 280);
    // ひじょうかいだん
    x.strokeStyle = '#0a090c'; x.lineWidth = 2; for (let y = 150; y < 270; y += 56) { x.strokeRect(i + 164, y + 38, 140, 2); x.beginPath(); x.moveTo(i + 170, y + 40); x.lineTo(i + 210, y - 16); x.stroke(); }
    x.fillStyle = '#0d0c10'; x.fillRect(i + 154, 62, 10, GROUND - 62);
  }
  grime(x, R, w, 62, GROUND, 24);
  for (let i = 0; i < 10; i++) crack(x, R, R() * w, 80 + R() * 200, 30 + R() * 60);
  cable(x, 0, 64, 320, 70, 40, 1.5); cable(x, 300, 66, 640, 62, 30, 1.5);
}
function cityFloor(x, w) {
  const R = rng(47);
  x.fillStyle = '#0f0f13'; x.fillRect(0, GROUND - 4, w, H - GROUND + 4);
  x.fillStyle = '#34343c'; x.fillRect(0, GROUND, w, 2);
  x.fillStyle = '#050507'; x.fillRect(0, GROUND + 2, w, 2);
  x.fillStyle = '#1b1b21'; x.fillRect(0, GROUND + 4, w, 8);
  for (let i = 0; i < w; i += 120) { x.fillStyle = 'rgba(200,190,120,0.22)'; x.fillRect(i + 20, GROUND + 34, 50, 3); }
  for (let i = 0; i < 12; i++) { const px = R() * w, py = GROUND + 16 + R() * 40, rw = 20 + R() * 50; const gr = x.createLinearGradient(0, py - 3, 0, py + 3); gr.addColorStop(0, 'rgba(120,130,170,0.14)'); gr.addColorStop(1, 'rgba(40,40,60,0.05)'); x.fillStyle = gr; x.beginPath(); x.ellipse(px, py, rw, 3 + R() * 3, 0, 0, TAU); x.fill(); }
  x.fillStyle = '#18181d'; x.beginPath(); x.ellipse(330, GROUND + 26, 22, 5, 0, 0, TAU); x.fill(); x.strokeStyle = '#0a0a0c'; x.lineWidth = 1; x.stroke();
  for (let i = 0; i < 5; i++) crack(x, R, R() * w, GROUND + 14 + R() * 30, 20 + R() * 30);
}
function cityFore(x, w) {
  cable(x, 0, -4, 360, -4, 60, 3, '#040405'); cable(x, 420, -4, 760, -4, 80, 4, '#040405'); cable(x, 800, -4, 1100, -4, 50, 3, '#040405');
  x.fillStyle = '#040405'; x.fillRect(560, -4, 10, 40); x.fillRect(548, 30, 34, 6);
}
function subwayFar(x, w) {
  const R = rng(51);
  const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#040405'); gr.addColorStop(0.5, '#0d0e10'); gr.addColorStop(1, '#060607'); x.fillStyle = gr; x.fillRect(0, 0, w, H);
  // トンネルの アーチ
  x.strokeStyle = '#141519'; x.lineWidth = 8; for (let i = 0; i < w; i += 150) { x.beginPath(); x.moveTo(i, 260); x.lineTo(i, 110); x.quadraticCurveTo(i + 75, 40, i + 150, 110); x.stroke(); }
  x.fillStyle = '#0a0b0d'; x.fillRect(0, 240, w, 40); x.fillStyle = '#1e1f23'; x.fillRect(0, 244, w, 2);
  for (let i = 0; i < 20; i++) { x.fillStyle = `rgba(0,0,0,${0.2 + R() * 0.3})`; x.fillRect(R() * w, 60 + R() * 160, 4 + R() * 20, 30 + R() * 80); }
}
function subwayMid(x, w) {
  const R = rng(53);
  // てんじょう
  x.fillStyle = '#0d0e10'; x.fillRect(0, 0, w, 40); x.fillStyle = '#17181b'; for (let i = 0; i < w; i += 64) x.fillRect(i, 30, 64, 4);
  // はしら（あいだから トンネルが みえる）
  for (let i = 0; i < w; i += 160) {
    x.fillStyle = '#1d1f22'; x.fillRect(i + 60, 34, 40, GROUND - 34);
    x.fillStyle = '#2a2d31'; x.fillRect(i + 60, 34, 6, GROUND - 34);
    x.fillStyle = '#c9b25a'; x.fillRect(i + 60, 180, 40, 4); x.fillStyle = '#16171a'; x.fillRect(i + 60, 184, 40, 3);
    for (let y = 40; y < GROUND; y += 12) { x.strokeStyle = '#141518'; x.lineWidth = 1; x.beginPath(); x.moveTo(i + 60, y); x.lineTo(i + 100, y); x.stroke(); }
    x.font = '900 12px system-ui, sans-serif'; x.fillStyle = 'rgba(220,220,200,0.22)'; x.fillText(i % 320 ? 'でぐち' : 'ちか 2', i + 63, 160);
  }
  // ひくい かべ（タイル）
  x.fillStyle = '#25282b'; x.fillRect(0, 262, w, GROUND - 262);
  x.strokeStyle = '#1a1c1f'; x.lineWidth = 1; for (let y = 262; y < GROUND; y += 10) { x.beginPath(); x.moveTo(0, y); x.lineTo(w, y); x.stroke(); } for (let i = 0; i < w; i += 14) { x.beginPath(); x.moveTo(i, 262); x.lineTo(i, GROUND); x.stroke(); }
  x.fillStyle = '#4a3f22'; x.fillRect(0, 262, w, 3);
  grime(x, R, w, 40, GROUND, 18);
  for (let i = 0; i < 8; i++) crack(x, R, R() * w, 270 + R() * 30, 20 + R() * 40);
  cable(x, 0, 36, 320, 40, 26, 2); cable(x, 300, 38, 640, 36, 34, 2.5);
}
function subwayFloor(x, w) {
  const R = rng(57);
  x.fillStyle = '#121214'; x.fillRect(0, GROUND - 4, w, H - GROUND + 4);
  for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(${60 + R() * 40},${55 + R() * 30},${50 + R() * 30},0.5)`; x.fillRect(R() * w, GROUND + 4 + R() * 60, 2 + R() * 2, 1.5 + R()); }
  for (let i = 0; i < w; i += 32) { x.fillStyle = '#2a211a'; x.fillRect(i, GROUND + 10, 18, 26); x.fillStyle = '#1a140f'; x.fillRect(i, GROUND + 32, 18, 4); }
  for (const ry of [GROUND + 12, GROUND + 30]) { x.fillStyle = '#5a5e64'; x.fillRect(0, ry, w, 3); x.fillStyle = '#9aa0a8'; x.fillRect(0, ry, w, 1); x.fillStyle = '#26282c'; x.fillRect(0, ry + 3, w, 2); }
  x.fillStyle = '#34363b'; x.fillRect(0, GROUND, w, 2); x.fillStyle = '#060607'; x.fillRect(0, GROUND + 2, w, 2);
}
function subwayFore(x, w) {
  x.fillStyle = '#040405'; x.fillRect(0, -4, w, 10);
  for (const px of [100, 520, 900]) { x.fillRect(px, 6, 6, 30); x.fillRect(px - 20, 34, 46, 12); }
  cable(x, 200, 4, 480, 4, 50, 4, '#040405'); cable(x, 640, 4, 1000, 4, 70, 5, '#040405');
}
function towerFar(x, w) {
  const R = rng(61);
  const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#120203'); gr.addColorStop(0.45, '#4a0909'); gr.addColorStop(0.75, '#7a160c'); gr.addColorStop(1, '#1a0405');
  x.fillStyle = gr; x.fillRect(0, 0, w, H);
  const mg = x.createRadialGradient(300, 110, 20, 300, 110, 180); mg.addColorStop(0, 'rgba(255,120,90,0.4)'); mg.addColorStop(1, 'rgba(255,60,40,0)'); x.fillStyle = mg; x.fillRect(100, 0, 400, 300);
  x.fillStyle = '#e0a090'; x.beginPath(); x.arc(300, 110, 56, 0, TAU); x.fill();
  x.fillStyle = 'rgba(150,50,40,0.45)'; for (let i = 0; i < 7; i++) { x.beginPath(); x.arc(280 + R() * 50, 90 + R() * 40, 5 + R() * 9, 0, TAU); x.fill(); }
  for (let i = 0; i < 20; i++) { x.fillStyle = `rgba(20,2,3,${0.4 + R() * 0.4})`; x.beginPath(); x.ellipse(R() * w, 30 + R() * 160, 70 + R() * 120, 5 + R() * 8, 0, 0, TAU); x.fill(); }
  // うかぶ いわ と とがった とう
  x.fillStyle = '#0d0203';
  for (const [cx, cy, r] of [[120, 170, 26], [560, 130, 18], [760, 190, 30]]) { x.beginPath(); x.moveTo(cx - r * 1.4, cy); x.lineTo(cx + r * 1.4, cy); x.lineTo(cx + r * 0.3, cy + r * 1.6); x.lineTo(cx - r * 0.4, cy + r * 1.1); x.fill(); }
  for (let i = 0; i < 9; i++) { const cx = R() * w, bh = 120 + R() * 150; x.beginPath(); x.moveTo(cx - 18, H); x.lineTo(cx - 10, H - bh); x.lineTo(cx, H - bh - 40); x.lineTo(cx + 10, H - bh); x.lineTo(cx + 18, H); x.fill(); }
  x.fillRect(0, 300, w, H - 300);
}
function towerMid(x, w) {
  const R = rng(63);
  x.fillStyle = '#160d10'; x.fillRect(0, 0, w, GROUND);
  x.strokeStyle = '#0d0709'; x.lineWidth = 1.5;
  for (let y = 0, r = 0; y < GROUND; y += 26, r++) { x.beginPath(); x.moveTo(0, y); x.lineTo(w, y); x.stroke(); for (let bx = (r % 2) * 30; bx < w; bx += 60) { x.beginPath(); x.moveTo(bx, y); x.lineTo(bx, y + 26); x.stroke(); } }
  grime(x, R, w, 0, GROUND, 24);
  for (let i = 0; i < w; i += 320) {
    const cx = i + 160;
    // とがった アーチの まど（そとの あかい そら）
    x.save(); x.globalCompositeOperation = 'destination-out';
    x.beginPath(); x.moveTo(cx - 50, 270); x.lineTo(cx - 50, 130); x.quadraticCurveTo(cx - 48, 70, cx, 40); x.quadraticCurveTo(cx + 48, 70, cx + 50, 130); x.lineTo(cx + 50, 270); x.fill(); x.restore();
    x.strokeStyle = '#0a0506'; x.lineWidth = 7; x.beginPath(); x.moveTo(cx - 50, 270); x.lineTo(cx - 50, 130); x.quadraticCurveTo(cx - 48, 70, cx, 40); x.quadraticCurveTo(cx + 48, 70, cx + 50, 130); x.lineTo(cx + 50, 270); x.stroke();
    x.lineWidth = 3; x.beginPath(); x.moveTo(cx, 40); x.lineTo(cx, 270); x.moveTo(cx - 50, 160); x.lineTo(cx + 50, 160); x.stroke();
    // くさり
    x.strokeStyle = '#0a0607'; x.lineWidth = 2; for (let y = 0; y < 120; y += 8) { x.beginPath(); x.ellipse(i + 10, y, 2.5, 4, 0, 0, TAU); x.stroke(); }
    // ぬのの たれまく（もようなし）
    x.fillStyle = '#3a0c10'; x.beginPath(); x.moveTo(i + 268, 50); x.lineTo(i + 304, 50); x.lineTo(i + 304, 200); x.lineTo(i + 286, 186); x.lineTo(i + 268, 200); x.fill();
    x.fillStyle = '#1e0608'; x.fillRect(i + 268, 50, 36, 4);
    x.fillStyle = '#0c0708'; x.fillRect(i + 220, 0, 30, GROUND);
  }
  for (let i = 0; i < 10; i++) crack(x, R, R() * w, 40 + R() * 240, 30 + R() * 60);
}
function towerFloor(x, w) {
  x.fillStyle = '#0c0809'; x.fillRect(0, GROUND - 4, w, H - GROUND + 4);
  // てつの こうし（したが ぼんやり あかい）
  const gr = x.createLinearGradient(0, GROUND, 0, H); gr.addColorStop(0, 'rgba(160,30,10,0.35)'); gr.addColorStop(1, 'rgba(60,8,4,0.1)'); x.fillStyle = gr; x.fillRect(0, GROUND + 4, w, H - GROUND);
  x.strokeStyle = '#1a1214'; x.lineWidth = 3; for (let i = 0; i < w; i += 14) { x.beginPath(); x.moveTo(i, GROUND + 4); x.lineTo(i, H); x.stroke(); }
  for (let y = GROUND + 18; y < H; y += 16) { x.beginPath(); x.moveTo(0, y); x.lineTo(w, y); x.stroke(); }
  x.fillStyle = '#3a2c2e'; x.fillRect(0, GROUND, w, 2); x.fillStyle = '#050304'; x.fillRect(0, GROUND + 2, w, 2);
}
function towerFore(x, w) {
  x.strokeStyle = '#040203'; x.lineWidth = 2.5;
  for (const cx of [200, 640, 980]) for (let y = -4; y < 90; y += 9) { x.beginPath(); x.ellipse(cx, y, 3, 5, 0, 0, TAU); x.stroke(); }
  x.fillStyle = '#040203'; x.beginPath(); x.moveTo(380, -4); x.lineTo(470, -4); x.lineTo(450, 30); x.lineTo(430, 18); x.lineTo(410, 44); x.fill();
}

// ---------- はいけい の え ----------
function redSky(x, w, R) {
  const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#070304'); gr.addColorStop(0.35, '#2a0808'); gr.addColorStop(0.62, '#5e140e'); gr.addColorStop(0.8, '#3a0c09'); gr.addColorStop(1, '#120506');
  x.fillStyle = gr; x.fillRect(0, 0, w, H);
  // あかい たいよう（ぶきみ）
  const sg = x.createRadialGradient(620, 120, 10, 620, 120, 150); sg.addColorStop(0, 'rgba(200,50,30,0.55)'); sg.addColorStop(1, 'rgba(120,20,10,0)'); x.fillStyle = sg; x.fillRect(470, 0, 300, 280);
  x.fillStyle = '#8a2216'; x.beginPath(); x.arc(620, 120, 34, 0, TAU); x.fill();
  x.fillStyle = 'rgba(20,4,4,0.5)'; x.beginPath(); x.arc(632, 112, 30, 0, TAU); x.fill();
  // くろい くも
  for (let i = 0; i < 26; i++) { x.fillStyle = `rgba(8,3,4,${0.35 + R() * 0.4})`; x.beginPath(); x.ellipse(R() * w, 20 + R() * 150, 60 + R() * 120, 5 + R() * 9, 0, 0, TAU); x.fill(); }
}
function ruinsSkyline(x, w, R, base) {
  x.fillStyle = '#0a0506';
  let px = -10;
  while (px < w + 10) {
    const bw = 30 + R() * 70, bh = 60 + R() * 140, top = base - bh;
    x.beginPath(); x.moveTo(px, base); x.lineTo(px, top + R() * 20);
    for (let s = 0; s < 4; s++) x.lineTo(px + (bw * (s + 1)) / 5, top + R() * 30);
    x.lineTo(px + bw, top + R() * 25); x.lineTo(px + bw, base); x.fill();
    if (R() < 0.4) x.fillRect(px + bw * 0.3, top - 40, 6, 44);
    if (R() < 0.3) { x.fillStyle = 'rgba(255,60,30,0.5)'; x.fillRect(px + R() * bw, top + 20 + R() * 50, 2, 3); x.fillStyle = '#0a0506'; }
    px += bw + R() * 10;
  }
  x.fillRect(0, base, w, H - base);
}
function labFar(x, w) {
  const R = rng(11); redSky(x, w, R);
  // えんとつ と けむり
  for (const cx of [120, 520]) {
    x.fillStyle = '#0c0607'; x.fillRect(cx, 90, 18, 200);
    for (let i = 0; i < 9; i++) { x.fillStyle = `rgba(20,10,10,${0.5 - i * 0.04})`; x.beginPath(); x.arc(cx + 9 + i * 14, 80 - i * 9, 10 + i * 4, 0, TAU); x.fill(); }
  }
  ruinsSkyline(x, w, R, 300);
}
function manorFar(x, w) {
  const R = rng(23); redSky(x, w, R);
  ruinsSkyline(x, w, R, 320);
  x.fillStyle = '#080405';
  for (const [tx, tw, th] of [[60, 70, 230], [300, 50, 270], [700, 60, 250]]) { x.fillRect(tx, H - th, tw, th); x.beginPath(); x.moveTo(tx - 6, H - th); x.lineTo(tx + tw / 2, H - th - 60); x.lineTo(tx + tw + 6, H - th); x.fill(); }
  // かれき の き
  x.strokeStyle = '#070304'; x.lineWidth = 3;
  for (const bx of [200, 470, 820]) { x.beginPath(); x.moveTo(bx, 300); x.lineTo(bx + 4, 210); x.lineTo(bx - 20, 170); x.moveTo(bx + 3, 230); x.lineTo(bx + 30, 190); x.lineTo(bx + 44, 196); x.stroke(); }
}
function crack(x, R, cx, cy, len) {
  x.beginPath(); x.moveTo(cx, cy); let a = R() * TAU, px = cx, py = cy;
  for (let i = 0; i < 6; i++) { a += (R() - 0.5) * 1.4; px += Math.cos(a) * len / 6; py += Math.sin(a) * len / 6; x.lineTo(px, py); if (R() < 0.3) { x.moveTo(px, py); x.lineTo(px + (R() - 0.5) * 14, py + (R() - 0.5) * 14); x.moveTo(px, py); } }
  x.strokeStyle = 'rgba(0,0,0,0.75)'; x.lineWidth = 1.3; x.stroke();
}
function grime(x, R, w, y0, y1, n) {
  for (let i = 0; i < n; i++) {
    const gx = R() * w, gy = y0 + R() * (y1 - y0) * 0.5, gh = 30 + R() * 120, gw = 4 + R() * 26;
    const gr = x.createLinearGradient(0, gy, 0, gy + gh); gr.addColorStop(0, `rgba(0,0,0,${0.25 + R() * 0.3})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gr; x.fillRect(gx, gy, gw, gh);
  }
  for (let i = 0; i < n; i++) { x.fillStyle = `rgba(${40 + R() * 30},${30 + R() * 15},${20},${0.12 + R() * 0.15})`; x.beginPath(); x.ellipse(R() * w, y0 + R() * (y1 - y0), 8 + R() * 30, 4 + R() * 14, 0, 0, TAU); x.fill(); }
}
function cable(x, x0, y0, x1, y1, sag, wdt = 2.2, col = '#070708') { x.strokeStyle = col; x.lineWidth = wdt; x.beginPath(); x.moveTo(x0, y0); x.quadraticCurveTo((x0 + x1) / 2, Math.max(y0, y1) + sag, x1, y1); x.stroke(); }
function labMid(x, w) {
  const R = rng(5);
  // てんじょう
  x.fillStyle = '#0e0e10'; x.fillRect(0, 0, w, 44);
  x.fillStyle = '#18191b'; for (let i = 0; i < w; i += 80) x.fillRect(i, 0, 10, 50);
  // かべ
  x.fillStyle = '#1d1e21'; x.fillRect(0, 44, w, GROUND - 44);
  x.strokeStyle = '#121315'; x.lineWidth = 3;
  for (let i = 0; i < w; i += 160) { x.strokeRect(i + 4, 56, 152, 120); x.strokeRect(i + 4, 182, 152, 130); }
  x.fillStyle = '#3a3c40'; for (let i = 0; i < w; i += 160) for (const [bx, by] of [[12, 64], [148, 64], [12, 304], [148, 304]]) x.fillRect(i + bx - 1, by - 1, 3, 3);
  // はがれた パネル
  x.fillStyle = '#141517'; x.beginPath(); x.moveTo(190, 182); x.lineTo(290, 182); x.lineTo(270, 230); x.lineTo(230, 214); x.lineTo(200, 250); x.fill();
  x.strokeStyle = '#0a0a0b'; x.lineWidth = 1; for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(200 + i * 14, 186); x.lineTo(206 + i * 13, 240); x.stroke(); }
  // すすけた けいこく しま
  for (let i = 0; i < w; i += 22) { x.fillStyle = (i / 22) % 2 ? '#3d3420' : '#121212'; x.beginPath(); x.moveTo(i, 288); x.lineTo(i + 22, 288); x.lineTo(i + 12, 298); x.lineTo(i - 10, 298); x.fill(); }
  // パイプ
  x.fillStyle = '#25272a'; x.fillRect(0, 240, w, 9); x.fillStyle = '#34363a'; x.fillRect(0, 240, w, 2);
  x.fillStyle = '#1a1b1d'; for (let i = 100; i < w; i += 320) x.fillRect(i, 236, 12, 17);
  x.fillStyle = 'rgba(70,40,20,0.5)'; x.fillRect(330, 249, 4, 30);
  // ふるい もじ（かすれた カナ）
  x.font = '900 18px system-ui, sans-serif'; x.fillStyle = 'rgba(150,140,130,0.13)'; x.fillText('きけん', 40, 150); x.fillText('ちか 3', 540, 270);
  grime(x, R, w, 44, GROUND, 26);
  for (let i = 0; i < 14; i++) crack(x, R, R() * w, 60 + R() * 220, 30 + R() * 60);
  // おおきな あな（そとの あかい そらが みえる）
  x.save(); x.globalCompositeOperation = 'destination-out';
  x.beginPath(); const hx = 450, hy = 150; for (let i = 0; i < 18; i++) { const a = (i / 18) * TAU, r = 58 + R() * 28; x.lineTo(hx + Math.cos(a) * r * 1.3, hy + Math.sin(a) * r * 0.85); } x.closePath(); x.fill(); x.restore();
  x.strokeStyle = '#2a1a14'; x.lineWidth = 2;
  for (let i = 0; i < 9; i++) { const a = R() * TAU; x.beginPath(); x.moveTo(hx + Math.cos(a) * 80, hy + Math.sin(a) * 52); x.lineTo(hx + Math.cos(a) * 60 + (R() - 0.5) * 20, hy + Math.sin(a) * 38 + (R() - 0.5) * 10); x.stroke(); }
  // ケーブル
  cable(x, 0, 48, 210, 60, 40); cable(x, 120, 46, 400, 52, 70, 3); cable(x, 380, 50, 640, 46, 36); cable(x, 500, 46, 600, 120, 10, 2);
  x.strokeStyle = '#070708'; x.lineWidth = 2; x.beginPath(); x.moveTo(250, 50); x.bezierCurveTo(255, 110, 240, 150, 252, 180); x.stroke();
}
function manorMid(x, w) {
  const R = rng(9);
  x.fillStyle = '#0c0b0d'; x.fillRect(0, 0, w, 60);
  x.fillStyle = '#19171a'; x.fillRect(0, 60, w, GROUND - 60);
  // いしの ブロック
  x.strokeStyle = '#100f11'; x.lineWidth = 1.5;
  for (let y = 60, r = 0; y < GROUND; y += 22, r++) { x.beginPath(); x.moveTo(0, y); x.lineTo(w, y); x.stroke(); for (let bx = (r % 2) * 24; bx < w; bx += 48) { x.beginPath(); x.moveTo(bx, y); x.lineTo(bx, y + 22); x.stroke(); } }
  grime(x, R, w, 60, GROUND, 22);
  for (let i = 0; i < 12; i++) crack(x, R, R() * w, 70 + R() * 200, 30 + R() * 70);
  for (let i = 0; i < w; i += 320) {
    const cx = i + 160;
    // まどわく
    x.fillStyle = '#0a090b'; x.beginPath(); x.moveTo(cx - 46, 252); x.lineTo(cx - 46, 130); x.quadraticCurveTo(cx - 46, 84, cx, 68); x.quadraticCurveTo(cx + 46, 84, cx + 46, 130); x.lineTo(cx + 46, 252); x.fill();
    // ガラスが われて そとが みえる
    x.save(); x.globalCompositeOperation = 'destination-out';
    x.beginPath(); x.moveTo(cx - 37, 246); x.lineTo(cx - 37, 132); x.quadraticCurveTo(cx - 37, 94, cx, 80); x.quadraticCurveTo(cx + 37, 94, cx + 37, 132); x.lineTo(cx + 37, 246); x.fill(); x.restore();
    x.fillStyle = 'rgba(40,30,34,0.85)'; for (const [a, b2, c] of [[-37, 246, 30], [37, 246, -24], [-37, 140, 20]]) { x.beginPath(); x.moveTo(cx + a, b2); x.lineTo(cx + a + c, b2 - 12 - R() * 30); x.lineTo(cx + a, b2 - 40); x.fill(); }
    x.strokeStyle = '#0a090b'; x.lineWidth = 4; x.beginPath(); x.moveTo(cx, 80); x.lineTo(cx, 246); x.moveTo(cx - 37, 172); x.lineTo(cx + 37, 172); x.stroke();
    // やぶれた カーテン
    x.fillStyle = '#231417'; x.beginPath(); x.moveTo(cx - 52, 70); x.lineTo(cx - 30, 70); x.lineTo(cx - 34, 200); x.lineTo(cx - 40, 186); x.lineTo(cx - 46, 230); x.lineTo(cx - 54, 210); x.fill();
    // はしら
    x.fillStyle = '#141215'; x.fillRect(i, 56, 26, GROUND - 56); x.fillStyle = '#211e22'; x.fillRect(i, 56, 5, GROUND - 56);
    // くさり
    x.strokeStyle = '#0b0a0c'; x.lineWidth = 2; for (let y = 60; y < 150; y += 8) { x.beginPath(); x.ellipse(i + 260, y, 2.5, 4, 0, 0, TAU); x.stroke(); }
  }
  x.fillStyle = '#121013'; x.fillRect(0, 262, w, GROUND - 262);
  x.strokeStyle = '#0b0a0c'; x.lineWidth = 2; for (let i = 0; i < w; i += 40) x.strokeRect(i, 262, 40, GROUND - 262);
  cable(x, 0, 62, 320, 70, 30, 1.5, '#0b0a0c');
}
function labFloor(x, w) {
  const R = rng(31);
  x.fillStyle = '#111214'; x.fillRect(0, GROUND - 4, w, H - GROUND + 4);
  x.fillStyle = '#2e3034'; x.fillRect(0, GROUND, w, 2);
  x.fillStyle = '#060607'; x.fillRect(0, GROUND + 2, w, 2);
  x.fillStyle = '#0a0a0b'; for (let i = 0; i < w; i += 40) x.fillRect(i, GROUND + 4, 2, H - GROUND);
  x.fillRect(0, GROUND + 26, w, 2);
  for (let i = 0; i < w; i += 160) { x.fillStyle = 'rgba(80,66,30,0.35)'; for (let s = 0; s < 4; s++) { x.beginPath(); x.moveTo(i + s * 20, GROUND + 6); x.lineTo(i + s * 20 + 10, GROUND + 6); x.lineTo(i + s * 20, GROUND + 16); x.lineTo(i + s * 20 - 10, GROUND + 16); x.fill(); } }
  for (let i = 0; i < 18; i++) { x.fillStyle = `rgba(0,0,0,${0.3 + R() * 0.3})`; x.beginPath(); x.ellipse(R() * w, GROUND + 6 + R() * 40, 10 + R() * 30, 2 + R() * 4, 0, 0, TAU); x.fill(); }
  for (let i = 0; i < 6; i++) crack(x, R, R() * w, GROUND + 8 + R() * 30, 20 + R() * 30);
  x.fillStyle = '#26272a'; for (let i = 0; i < 20; i++) x.fillRect(R() * w, GROUND - 2 - R() * 2, 2 + R() * 4, 2);
}
function manorFloor(x, w) {
  const R = rng(37);
  x.fillStyle = '#121013'; x.fillRect(0, GROUND - 4, w, H - GROUND + 4);
  x.fillStyle = '#2a2528'; x.fillRect(0, GROUND, w, 2);
  x.fillStyle = '#070607'; x.fillRect(0, GROUND + 2, w, 2);
  x.strokeStyle = '#080708'; x.lineWidth = 1.5; for (let i = 0; i < w; i += 46) { x.beginPath(); x.moveTo(i, GROUND + 4); x.lineTo(i - 10, H); x.stroke(); }
  x.fillStyle = 'rgba(40,16,20,0.5)'; x.fillRect(80, GROUND + 10, 260, 30);
  for (let i = 0; i < 14; i++) { x.fillStyle = `rgba(0,0,0,${0.3 + R() * 0.3})`; x.beginPath(); x.ellipse(R() * w, GROUND + 6 + R() * 40, 10 + R() * 30, 2 + R() * 4, 0, 0, TAU); x.fill(); }
  for (let i = 0; i < 6; i++) crack(x, R, R() * w, GROUND + 8 + R() * 30, 20 + R() * 30);
}
function labFore(x, w) {
  cable(x, 0, -4, 300, -4, 70, 4, '#040405'); cable(x, 240, -4, 520, -4, 46, 3, '#040405');
  cable(x, 700, -4, 1000, -4, 80, 5, '#040405');
  x.strokeStyle = '#040405'; x.lineWidth = 3; x.beginPath(); x.moveTo(610, -4); x.bezierCurveTo(615, 30, 600, 60, 612, 88); x.stroke();
  x.fillStyle = '#040405'; x.fillRect(606, 86, 10, 6);
}
function manorFore(x, w) {
  x.strokeStyle = '#040304'; x.lineWidth = 2.5;
  for (const cx of [140, 760]) for (let y = -4; y < 80; y += 9) { x.beginPath(); x.ellipse(cx, y, 3, 5, 0, 0, TAU); x.stroke(); }
  cable(x, 300, -4, 640, -4, 50, 3, '#040304');
  x.fillStyle = '#040304'; x.beginPath(); x.moveTo(900, -4); x.lineTo(1000, -4); x.lineTo(980, 40); x.lineTo(960, 26); x.lineTo(940, 60); x.lineTo(920, 30); x.fill();
}

// ---------- もの ----------
function drawCrate(ctx, c) {
  const x = c.x - 20 + (c.hit > 0 ? (Math.random() - 0.5) * 4 : 0), y = c.y - 40;
  ctx.fillStyle = OUT; ctx.fillRect(x - 2, y - 2, 44, 44);
  ctx.fillStyle = c.hit > 0 ? '#8a7a66' : '#3b3128'; ctx.fillRect(x, y, 40, 40);
  ctx.strokeStyle = '#211a14'; ctx.lineWidth = 3; ctx.strokeRect(x + 4, y + 4, 32, 32);
  ctx.beginPath(); ctx.moveTo(x + 4, y + 4); ctx.lineTo(x + 36, y + 36); ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x, y + 28, 40, 12);
}
function drawPickup(ctx, k, t) {
  const y = k.y - 22 + Math.sin(t * 4 + k.t) * 4, x = k.x;
  glowAt(ctx, x, y, 34, k.kind === 'heal' ? 'green' : 'warm', 0.45 + Math.sin(t * 5) * 0.15);
  if (k.kind === 'heal') {
    ctx.fillStyle = OUT; ctx.fillRect(x - 13, y - 11, 26, 22); ctx.fillStyle = '#cfcbc2'; ctx.fillRect(x - 11, y - 9, 22, 18);
    ctx.fillStyle = '#2fbf4a'; ctx.fillRect(x - 3, y - 7, 6, 14); ctx.fillRect(x - 7, y - 3, 14, 6);
  } else if (k.kind === 'ammo') {
    ctx.fillStyle = OUT; ctx.fillRect(x - 13, y - 10, 26, 20); ctx.fillStyle = '#3d4530'; ctx.fillRect(x - 11, y - 8, 22, 16);
    ctx.fillStyle = '#b89a52'; for (let i = -7; i <= 5; i += 6) ctx.fillRect(x + i, y - 13, 3, 9);
  } else drawGun(ctx, k.kind, x - 14, y, 0, 1, 1.1);
}
// ---------- ヒーロー（コンバットスーツの ぶたい：くに の しるし なし） ----------
// base=めいさい の じいろ、b1/b2=もよう、far=おくの てあし、acc=うでわ・ヘルメットの いろ（みわけ よう）
const STYLES = {
  plain: { plain: true, acc: '#ffd84a' },
  me:   { base: '#2e302d', b1: '#3e413b', b2: '#1c1e1c', far: '#212321', vest: '#3a3c35', vestHi: '#5a5d52', pouch: '#2a2c27', helm: '#33362f', acc: '#d8913a', boot: '#141414', glove: '#1f201f', pad: '#3c3f3b' },
  ao:   { base: '#4a5236', b1: '#606a46', b2: '#323824', far: '#353b27', vest: '#59633f', vestHi: '#77825a', pouch: '#444c32', helm: '#475035', acc: '#6fa8e8', boot: '#1e1a15', glove: '#2a2b24', pad: '#2c3126' },
  momo: { base: '#5a5d61', b1: '#72767a', b2: '#3d4044', far: '#404347', vest: '#34373b', vestHi: '#5c6065', pouch: '#26282b', helm: '#4e5155', acc: '#e88cb4', boot: '#18181a', glove: '#27282a', pad: '#2f3134' },
};
function limb(ctx, pts, w = 7, col = '#fff') {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.strokeStyle = OUT; ctx.lineWidth = w + 3.5; ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke();
}
function glove(ctx, x, y, col = '#3c3d42', r = 5.5) { ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(x, y, r + 1.7, 0, TAU); ctx.fill(); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x - r * 0.5, y - r * 0.6, r, 1.4); }
const GLOVE = '#3a3b40';
const SKIN = '#d6d2ca';
const CAMO = [[-6, -52, 5, 3, 0.4, 1], [4, -47, 6, 2.6, -0.3, 2], [-3, -40, 4.5, 2.4, 0.8, 1], [6, -55, 3, 2, 0, 2], [-8, -45, 3, 2.2, 0, 2], [2, -36, 5, 2, 0.2, 1]];
// 2せつ の うで・あし（とどかない ときは まっすぐ のばす）
function ik(ax, ay, bx, by, l1, l2, bend) {
  const dx = bx - ax, dy = by - ay, d0 = Math.hypot(dx, dy) || 0.01;
  const d = clamp(d0, Math.abs(l1 - l2) + 0.01, l1 + l2 - 0.01);
  const a = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  const ang = Math.atan2(dy, dx) + bend * a;
  const jx = ax + Math.cos(ang) * l1, jy = ay + Math.sin(ang) * l1;
  const ex = bx - jx, ey = by - jy, el = Math.hypot(ex, ey) || 1;
  return [jx, jy, jx + ex / el * l2, jy + ey / el * l2];
}
function boot(ctx, x, y, a, col, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a - Math.PI / 2); ctx.scale(s, s);
  ctx.beginPath(); ctx.moveTo(-5, -7); ctx.lineTo(5, -7); ctx.lineTo(5.5, -1.5); ctx.quadraticCurveTo(12.5, -1.5, 12.5, 2); ctx.lineTo(12.5, 4); ctx.lineTo(-6, 4); ctx.closePath();
  ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.stroke(); ctx.fillStyle = col; ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fillRect(-6, 2.6, 18.5, 1.4); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(-5, -3, 10, 1.2);
  ctx.restore();
}
function heroLeg(ctx, hx, hy, fx, fy, P, far) {
  const [kx, ky, ax, ay] = ik(hx, hy, fx, fy, 18, 18, -1);
  limb(ctx, [hx, hy, kx, ky, ax, ay], 8.5, far ? P.far : P.base);
  // ひざあて
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(kx + 1.6, ky, 4.4, 5, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = far ? '#1c1d1c' : P.pad; ctx.beginPath(); ctx.ellipse(kx + 1.6, ky, 3.1, 3.7, 0, 0, TAU); ctx.fill();
  boot(ctx, ax, ay, Math.atan2(ay - ky, ax - kx), P.boot);
}
function heroArm(ctx, sx, sy, hx, hy, col, P, band) {
  const [ex, ey, wx, wy] = ik(sx, sy, hx, hy, 15, 15, 1);
  limb(ctx, [sx, sy, ex, ey, wx, wy], 6.5, col);
  if (band) { ctx.strokeStyle = band; ctx.lineWidth = 6.6; ctx.lineCap = 'butt'; ctx.beginPath(); ctx.moveTo(sx + (ex - sx) * 0.42, sy + (ey - sy) * 0.42); ctx.lineTo(sx + (ex - sx) * 0.66, sy + (ey - sy) * 0.66); ctx.stroke(); ctx.lineCap = 'round'; }
  glove(ctx, wx, wy, P.glove, 4.3);
  return [wx, wy];
}
function heroTorso(ctx, P, hurt, t, run) {
  // せなかの むせんき（アンテナ）
  const sway = Math.sin(t * 9) * (run ? 3 : 1);
  ctx.strokeStyle = '#0d0d0e'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(-13, -54); ctx.quadraticCurveTo(-14 - sway * 0.3, -64, -16 - sway, -73); ctx.stroke();
  ctx.fillStyle = OUT; roundRect(ctx, -17, -57, 8, 15, 2); ctx.fill(); ctx.fillStyle = '#26282a'; roundRect(ctx, -15.8, -55.8, 5.6, 12.6, 1.5); ctx.fill(); ctx.fillStyle = '#4a4e52'; ctx.fillRect(-14.8, -53, 3.4, 1.2);
  // めいさいふく
  ctx.fillStyle = OUT; roundRect(ctx, -11, -59, 22, 28, 6); ctx.fill();
  ctx.save(); roundRect(ctx, -9.5, -57.5, 19, 25, 5); ctx.fillStyle = hurt ? '#77737c' : P.base; ctx.fill(); ctx.clip();
  for (const [x, y, rx, ry, r, k] of CAMO) { ctx.fillStyle = k === 1 ? P.b1 : P.b2; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, r, 0, TAU); ctx.fill(); }
  ctx.restore();
  // プレートキャリア（ベスト）
  ctx.fillStyle = OUT; roundRect(ctx, -11.5, -57, 24, 19, 4); ctx.fill();
  ctx.fillStyle = P.vest; roundRect(ctx, -10, -55.5, 21, 16, 3); ctx.fill();
  ctx.fillStyle = P.vestHi; ctx.fillRect(-9, -55.5, 19, 2);
  ctx.fillStyle = OUT; ctx.fillRect(3, -60, 5, 6); ctx.fillStyle = P.vest; ctx.fillRect(4, -59.5, 3, 5); // かたひも
  ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(-10, -55.5, 6, 16);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.8; ctx.beginPath(); for (let y = -51; y < -41; y += 3) { ctx.moveTo(-3, y); ctx.lineTo(10, y); } ctx.stroke();
  // ポーチ（まえ に 3つ）
  for (let i = 0; i < 3; i++) {
    const px = -2 + i * 5;
    ctx.fillStyle = OUT; ctx.fillRect(px - 0.8, -46.8, 6, 9.6); ctx.fillStyle = P.pouch; ctx.fillRect(px, -46, 4.4, 8);
    ctx.fillStyle = P.vestHi; ctx.fillRect(px, -46, 4.4, 2);
  }
  // ベルト
  ctx.fillStyle = OUT; ctx.fillRect(-10.5, -36.5, 21, 5); ctx.fillStyle = '#1c1d1e'; ctx.fillRect(-9.5, -35.5, 19, 3);
  ctx.fillStyle = P.pouch; ctx.fillRect(-9, -40, 5, 6);
}
function heroHead(ctx, P, hx, hy) {
  ctx.fillStyle = '#9d988f'; ctx.fillRect(hx - 3.5, hy + 7, 7, 7);
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(hx, hy, 12.2, 0, TAU); ctx.fill();
  ctx.fillStyle = SKIN; ctx.beginPath(); ctx.arc(hx, hy, 10.6, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.17)'; ctx.beginPath(); ctx.arc(hx - 3.5, hy + 3, 8.6, 0, TAU); ctx.fill();
  // かお：うすい じゅうじ だけ
  ctx.strokeStyle = '#1a1a1c'; ctx.lineWidth = 1.1; ctx.lineCap = 'butt'; ctx.beginPath();
  ctx.moveTo(hx + 0.5, hy + 4.6); ctx.lineTo(hx + 9.6, hy + 4.6); ctx.moveTo(hx + 5, hy + 0.4); ctx.lineTo(hx + 5, hy + 9.2); ctx.stroke(); ctx.lineCap = 'round';
  // ヘッドセット
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(hx - 2.5, hy + 1.5, 4.6, 0, TAU); ctx.fill();
  ctx.fillStyle = '#202122'; ctx.beginPath(); ctx.arc(hx - 2.5, hy + 1.5, 3.3, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#0e0e0f'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(hx - 1, hy + 4); ctx.quadraticCurveTo(hx + 1, hy + 11.5, hx + 7.5, hy + 11.2); ctx.stroke();
  ctx.fillStyle = '#0e0e0f'; ctx.beginPath(); ctx.arc(hx + 7.8, hy + 11.1, 1.5, 0, TAU); ctx.fill();
  // ヘルメット
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(hx - 0.5, hy - 1, 14, Math.PI * 0.96, Math.PI * 2.04); ctx.closePath(); ctx.fill();
  ctx.fillStyle = P.helm; ctx.beginPath(); ctx.arc(hx - 0.5, hy - 1, 12.5, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(hx - 0.5, hy - 1, 12.5, Math.PI, Math.PI * 2); ctx.clip();
  ctx.fillStyle = P.b2; ctx.beginPath(); ctx.ellipse(hx - 5, hy - 8, 4.5, 2.4, 0.3, 0, TAU); ctx.ellipse(hx + 5, hy - 5, 3.5, 2, -0.4, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(hx - 13.5, hy - 2.4, 27, 2.6);
  ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(hx - 0.5, hy - 1, 9.5, Math.PI * 1.25, Math.PI * 1.62); ctx.stroke();
  ctx.fillStyle = '#121313'; ctx.fillRect(hx + 7, hy - 9.5, 4, 5.5); ctx.fillRect(hx - 6, hy - 6.5, 8, 2);
  ctx.fillStyle = P.acc; ctx.fillRect(hx - 12.5, hy - 7, 3, 4.5);
}
const FRONT = { pistol: [3, 3], smg: [27, -5], rifle: [20, -4], shotgun: [31, -4], bazooka: [-12, 2], dark: [27, -5], minigun: [30, -3], beam: [26, -4] };

function drawFighter(ctx, f, g, S) {
  const dead = f.hp <= 0 || f.down > 0;
  if (f.inv > 0 && !dead && Math.floor(g.time * 20) % 2 === 0) ctx.globalAlpha = 0.45;
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.ellipse(0, (f.onGround ? 0 : GROUND - f.y), 16, 4, 0, 0, TAU); ctx.fill();
  ctx.scale(f.face, 1);
  const id = f.moveId, mt = f.moveT || 0;
  const spd = Math.abs(f.vx), run = f.onGround && spd > 30 && !f.move;
  const ph = f.anim * (spd > 170 ? 13 : 10);
  const rc = f.recoil || 0, hurt = f.hurtT > 0;
  let rot = 0, bob = 0, lean = 0;
  if (dead) rot = -1.45;
  else if (id === 'flykick') rot = 0.45;
  else if (id === 'slide') rot = -0.85;
  else if (run) { bob = -Math.abs(Math.cos(ph)) * 3 + 1; lean = spd > 170 ? 0.14 : 0.07; }
  else if (f.onGround) bob = Math.sin(f.anim * 3) * 0.8;
  if (hurt && !dead) lean = -0.32 * (f.hurtT / 0.3) - 0.05;
  if (rc > 0 && !id) lean -= rc * 0.07;
  ctx.translate(0, bob);
  if (dead) ctx.translate(-22, -8);
  ctx.rotate(rot);
  // あし（あしもと の めあて）
  let F1, F2;
  if (id === 'kick' || id === 'high' || id === 'spin') {
    const ext = Math.min(1, mt / 0.07) * (mt < (f.move?.t1 ?? 0) + 0.05 ? 1 : 0.4);
    const ang = id === 'high' ? -0.85 : id === 'spin' ? -0.25 : 0.25;
    const flip = id === 'spin' && mt > 0.15 ? -1 : 1;
    F1 = [flip * (6 + 36 * ext * Math.cos(ang)), -34 + 36 * ext * Math.sin(ang) + (1 - ext) * 26];
    F2 = [-6, 0]; lean -= id === 'high' ? 0.3 * ext : 0.12 * ext;
  } else if (id === 'flykick') { F1 = [34, -16]; F2 = [-8, -14]; }
  else if (id === 'slide') { F1 = [36, -26]; F2 = [14, -10]; }
  else if (dead) { F1 = [8, 0]; F2 = [-4, 0]; }
  else if (!f.onGround) { F1 = [12, -12]; F2 = [-8, -5]; }
  else if (run) {
    const A = spd > 170 ? 15 : 10, lift = spd > 170 ? 10 : 6;
    F1 = [Math.sin(ph) * A + 2, -Math.max(0, Math.cos(ph)) * lift];
    F2 = [-Math.sin(ph) * A + 2, -Math.max(0, -Math.cos(ph)) * lift];
  } else { F1 = [7, 0]; F2 = [-6, 0]; }
  const HX = 0, HY = -34;
  if (S.plain) {
    drawPlainFighter(ctx, f, g, { id, mt, F1, F2, HX, HY, lean, hurt, dead, run, W: f.ars ? f.ars.cur : 'pistol' });
    ctx.restore(); ctx.globalAlpha = 1;
    if (f.kind === 'player' && !dead) { ctx.fillStyle = S.acc; ctx.beginPath(); ctx.moveTo(f.x - 5, f.y - 98); ctx.lineTo(f.x + 5, f.y - 98); ctx.lineTo(f.x, f.y - 92); ctx.fill(); }
    return;
  }
  heroLeg(ctx, HX - 2, HY, F2[0], F2[1], S, true);
  heroLeg(ctx, HX + 1, HY, F1[0], F1[1], S, false);
  // うえ はんしん（まえかがみ・のけぞり）
  ctx.save(); ctx.translate(HX, HY); ctx.rotate(lean); ctx.translate(-HX, -HY);
  const W = f.ars ? f.ars.cur : 'pistol', GG = GUN_GEOM[W] || GUN_GEOM.pistol;
  const SF = [5, -53], SN = [0, -53]; // おくの かた・てまえの かた
  const punch = id === 'jab' || id === 'jab2' || id === 'upper' || id === 'airjab';
  let gunAt = null, nearT, farT;
  if (dead) { farT = [12, -30]; nearT = [16, -34]; }
  else if (punch) {
    const ext = Math.min(1, mt / 0.05) * (mt < f.move.t1 + 0.04 ? 1 : 0.3);
    nearT = [8 + ext * 30, id === 'upper' ? -42 - ext * 32 : -48]; farT = [-4, -38];
    gunAt = [-5, -37, 1.15, 0.85];
  } else if (id) { nearT = [14, -50]; farT = [6, -55]; gunAt = [-10, -34, 1.25, 0.85]; }
  else {
    const gx = 16 - rc * GG.kick[0], gy = -44, ga = -rc * GG.kick[1];
    const fr = FRONT[W] || FRONT.pistol, pump = W === 'shotgun' ? -Math.sin(Math.min(1, rc) * Math.PI) * 7 : 0;
    gunAt = [gx, gy, ga, 1];
    nearT = [gx + 1, gy + 1];
    farT = [gx + (fr[0] + pump) * Math.cos(ga) - fr[1] * Math.sin(ga), gy + (fr[0] + pump) * Math.sin(ga) + fr[1] * Math.cos(ga)];
  }
  const gfx = W === 'minigun' ? (f.ars?.spinPh || 0) : W === 'beam' ? Math.min(1, (f.ars?.charge || 0) / 0.6) : 0;
  if (id && !punch && gunAt) drawGun(ctx, W, gunAt[0], gunAt[1], gunAt[2], 1, gunAt[3], 0, gfx);
  heroArm(ctx, SF[0], SF[1], farT[0], farT[1], S.far, S, null);
  heroTorso(ctx, S, hurt, g.time + f.x * 0.01, run);
  // あたま（ひっくり かえる ときは すこし うしろへ）
  const hTilt = hurt ? -0.25 : run ? 0.05 : 0;
  ctx.save(); ctx.translate(2, -57); ctx.rotate(hTilt); heroHead(ctx, S, 2, -10); ctx.restore();
  if (gunAt && (!id || punch)) drawGun(ctx, W, gunAt[0], gunAt[1], gunAt[2], 1, gunAt[3], id ? 0 : rc, gfx);
  const [nx, ny] = heroArm(ctx, SN[0], SN[1], nearT[0], nearT[1], S.base, S, S.acc);
  if (punch && f.move && mt < f.move.t1 + 0.04 && mt > 0.03) { ctx.strokeStyle = 'rgba(220,210,200,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(nx - 24, ny - 4); ctx.lineTo(nx - 9, ny - 4); ctx.moveTo(nx - 22, ny + 4); ctx.lineTo(nx - 9, ny + 4); ctx.stroke(); }
  ctx.restore();
  ctx.restore();
  ctx.globalAlpha = 1;
  if (f.kind === 'ally' && !dead) {
    ctx.font = '800 10px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.strokeText(f.def.name, f.x, f.y - 92); ctx.fillStyle = S.acc; ctx.fillText(f.def.name, f.x, f.y - 92);
    ctx.fillStyle = '#000c'; ctx.fillRect(f.x - 14, f.y - 89, 28, 3); ctx.fillStyle = '#5fcf4a'; ctx.fillRect(f.x - 14, f.y - 89, 28 * f.hp / f.maxHp, 3);
  } else if (f.kind === 'ally' && f.down > 0) {
    ctx.font = '800 10px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ddd'; ctx.fillText(`${Math.ceil(f.down)}`, f.x, f.y - 40);
  }
  if (f.kind === 'player' && !dead) { ctx.fillStyle = S.acc; ctx.beginPath(); ctx.moveTo(f.x - 5, f.y - 96); ctx.lineTo(f.x + 5, f.y - 96); ctx.lineTo(f.x, f.y - 90); ctx.fill(); }
}
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

// ---------- こわい てき ----------
function eyesGlow(ctx, pts, col, r, key) {
  ctx.fillStyle = col; for (const [x, y] of pts) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); if (key) glowAt(ctx, x, y, r * 6, key, 0.85); }
}
function xMouth(ctx, x0, x1, y, h = 2.5) {
  ctx.strokeStyle = '#1a1614'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y);
  for (let x = x0 + 1.5; x < x1; x += 3.2) { ctx.moveTo(x - 1.3, y - h); ctx.lineTo(x + 1.3, y + h); ctx.moveTo(x + 1.3, y - h); ctx.lineTo(x - 1.3, y + h); }
  ctx.stroke();
}
// ---------- ゾンビ たち（ちは みどり／むらさき・バラバラ なし） ----------
const ZLOOK = new Set(['zombie', 'labz', 'guard', 'soldierz', 'bloatz', 'leaper', 'hulk', 'spitter', 'patient', 'worker', 'sailor', 'frozen', 'nomad', 'outlaw']);
const ZSHIRT = ['#3d4858', '#55473a', '#4a3f4c', '#3f4a3c', '#5a5246'];
const ZSKIN = { zombie: '#7b8771', labz: '#848c7c', guard: '#76826d', soldierz: '#717c68', bloatz: '#83788a', leaper: '#857a8c', hulk: '#6f6878', spitter: '#7f7488', patient: '#8f9a86', worker: '#7a8670', sailor: '#78846e', frozen: '#9fb6c4', nomad: '#808a6c', outlaw: '#76826a' };
function zHand(ctx, x, y, col, r = 3.8) {
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(x, y, r + 1.6, 0, TAU); ctx.fill();
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = OUT; ctx.lineWidth = 1.2; ctx.beginPath(); for (let i = -1; i <= 1; i++) { ctx.moveTo(x + r * 0.6, y + i * r * 0.5); ctx.lineTo(x + r * 1.6, y + i * r * 0.75 + 0.8); } ctx.stroke();
}
function zLeg(ctx, hx, hy, fx, fy, col, shoe, w = 7.5, L = 18) {
  const [kx, ky, ax, ay] = ik(hx, hy, fx, fy, L, L, -1);
  limb(ctx, [hx, hy, kx, ky, ax, ay], w, col);
  boot(ctx, ax, ay, Math.atan2(ay - ky, ax - kx), shoe, w / 8);
}
function zArm(ctx, sx, sy, hx, hy, sleeve, skin, w = 5.5, L = 15, hr = 3.8, bend = 1) {
  const [ex, ey, wx, wy] = ik(sx, sy, hx, hy, L, L, bend);
  limb(ctx, [sx, sy, ex, ey], w + 0.6, sleeve);
  limb(ctx, [ex, ey, wx, wy], w, skin);
  zHand(ctx, wx, wy, skin, hr);
  return [wx, wy];
}
// やぶれた ふく（すそ が ギザギザ）
function zShirt(ctx, col, x0, x1, top, bot, seed, flash) {
  ctx.beginPath(); ctx.moveTo(x0 + 2, top); ctx.lineTo(x1 - 2, top); ctx.quadraticCurveTo(x1 + 1, top, x1, top + 6); ctx.lineTo(x1 - 1, bot);
  const n = 5; for (let i = 1; i <= n; i++) { const x = x1 - 1 - (x1 - x0 - 2) * i / n; ctx.lineTo(x, bot + (i % 2 ? 3 + hash(seed + i) * 4 : -1)); }
  ctx.lineTo(x0, top + 6); ctx.closePath();
  ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.stroke(); ctx.fillStyle = flash ? '#fff' : col; ctx.fill();
}
function zStains(ctx, seed, x0, x1, y0, y1, n, col = 'rgba(70,140,50,0.55)') {
  ctx.fillStyle = col;
  for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.ellipse(x0 + (x1 - x0) * hash(seed * 3 + i), y0 + (y1 - y0) * hash(seed * 7 + i + 2), 1.6 + hash(seed + i * 5) * 2.6, 1.2 + hash(seed + i) * 1.8, hash(i) * 3, 0, TAU); ctx.fill(); }
}
function zHead(ctx, L, hx, hy, skin, flash, hot, e, t) {
  const mut = L === 'bloatz' || L === 'leaper' || L === 'hulk' || L === 'spitter';
  const r = L === 'hulk' ? 9 : 10;
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(hx, hy, r + 1.7, 0, TAU); ctx.fill();
  ctx.fillStyle = flash ? '#fff' : skin; ctx.beginPath(); ctx.arc(hx, hy, r, 0, TAU); ctx.fill();
  if (!flash) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.arc(hx - 3, hy + 3, r * 0.8, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(40,50,35,0.5)'; ctx.beginPath(); ctx.ellipse(hx - 3, hy - 4, 3, 2, 0.4, 0, TAU); ctx.fill();
    if (mut) { ctx.strokeStyle = '#7a3aa8'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(hx - 6, hy - 7); ctx.quadraticCurveTo(hx - 1, hy - 3, hx - 5, hy + 3); ctx.moveTo(hx + 2, hy - 9); ctx.lineTo(hx + 5, hy - 4); ctx.stroke(); }
  }
  // くぼんだ め（ひかる）
  ctx.fillStyle = '#141414'; ctx.beginPath(); ctx.ellipse(hx + 3, hy - 2, 2.6, 2.2, 0, 0, TAU); ctx.ellipse(hx + 8.6, hy - 1.6, 2, 2, 0, 0, TAU); ctx.fill();
  eyesGlow(ctx, [[hx + 3.4, hy - 2], [hx + 8.8, hy - 1.6]], L === 'frozen' ? '#bfeaff' : mut ? (hot ? '#f0d0ff' : '#c58cff') : (hot ? '#fbffc8' : '#d9e48a'), hot ? 1.3 : 1, L === 'frozen' ? 'cold' : mut ? 'purple' : null);
  // くち（あいた くち と は）
  const open = hot ? 4.5 : 2.4 + Math.sin(t * 5 + e.x) * 0.8;
  ctx.fillStyle = '#100c0e'; ctx.beginPath(); ctx.ellipse(hx + 5.5, hy + 5, 3.4, open * 0.6 + 0.6, 0.1, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#c9c2a6'; ctx.lineWidth = 0.8; ctx.beginPath(); for (let i = 0; i < 3; i++) { ctx.moveTo(hx + 3.4 + i * 1.8, hy + 5 - open * 0.5); ctx.lineTo(hx + 3.4 + i * 1.8, hy + 5.6 - open * 0.2); } ctx.stroke();
  if (L === 'spitter' && !flash) { ctx.fillStyle = '#b46ae8'; ctx.beginPath(); ctx.ellipse(hx + 6, hy + 8 + (hot ? 2 : 0), 1.3, 2.4 + (hot ? 2 : 0), 0, 0, TAU); ctx.fill(); }
  // かみ・ぼうし・ヘルメット
  if (L === 'guard') {
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(hx, hy - 2, r + 2.4, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); ctx.fill();
    ctx.fillStyle = flash ? '#fff' : '#1f2738'; ctx.beginPath(); ctx.arc(hx, hy - 2, r + 1, Math.PI * 1.04, Math.PI * 1.96); ctx.closePath(); ctx.fill();
    ctx.fillStyle = flash ? '#fff' : '#161c28'; ctx.beginPath(); ctx.moveTo(hx + 4, hy - 3.5); ctx.lineTo(hx + 17, hy - 1.5); ctx.lineTo(hx + 4, hy - 0.5); ctx.fill();
    ctx.fillStyle = '#9a9a86'; ctx.fillRect(hx + 2, hy - 9, 3, 3);
  } else if (L === 'soldierz' && e.helmetHp > 0) {
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(hx - 0.5, hy - 1.5, r + 3.4, Math.PI * 0.96, Math.PI * 2.04); ctx.closePath(); ctx.fill();
    ctx.fillStyle = flash ? '#fff' : e.type === 'sergeant' ? '#2c3426' : '#454a36'; ctx.beginPath(); ctx.arc(hx - 0.5, hy - 1.5, r + 2, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(hx - 13, hy - 3.5, 25, 2.2);
    const dmg = 1 - e.helmetHp / (e.def.helmetHp || 1);
    if (dmg > 0.3) { ctx.strokeStyle = '#1a1a14'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(hx - 3, hy - 13); ctx.lineTo(hx, hy - 8); ctx.lineTo(hx - 2, hy - 5); ctx.stroke(); }
    ctx.strokeStyle = '#141410'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(hx - 6, hy - 1); ctx.lineTo(hx - 2, hy + 9); ctx.stroke();
  } else if (L === 'worker' && e.helmetHp > 0) {
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(hx - 0.5, hy - 2, r + 3.2, Math.PI * 0.98, Math.PI * 2.02); ctx.closePath(); ctx.fill();
    ctx.fillStyle = flash ? '#fff' : '#d0a42a'; ctx.beginPath(); ctx.arc(hx - 0.5, hy - 2, r + 1.8, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = flash ? '#fff' : '#b08a1e'; ctx.fillRect(hx - 14, hy - 3.6, 28, 2.6); ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(hx - 4, hy - 13, 6, 2);
  } else if (L === 'sailor') {
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(hx - 1, hy - 3, r + 2.6, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); ctx.fill();
    ctx.fillStyle = flash ? '#fff' : '#1e2a44'; ctx.beginPath(); ctx.arc(hx - 1, hy - 3, r + 1.4, Math.PI * 1.04, Math.PI * 1.96); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#2a3858'; ctx.fillRect(hx - 11, hy - 5, 20, 2.4);
  } else if (L === 'patient') {
    ctx.fillStyle = flash ? '#fff' : '#d8d4c4'; ctx.fillRect(hx - 10, hy - 8, 20, 4); ctx.fillStyle = 'rgba(70,140,50,0.6)'; ctx.fillRect(hx - 2, hy - 8, 3, 4);
  } else if (L === 'frozen') {
    ctx.fillStyle = '#d8f2ff'; for (const [x, y, hh, a] of [[-6, -8, 7, -0.5], [0, -10, 8, 0], [6, -8, 6, 0.5]]) { ctx.save(); ctx.translate(hx + x, hy + y); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(0, -hh); ctx.lineTo(2, 0); ctx.fill(); ctx.restore(); }
  } else if (L === 'labz') {
    ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hx - 6, hy - 8); ctx.quadraticCurveTo(hx - 12, hy - 4, hx - 9, hy + 2); ctx.stroke();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(hx + 3.5, hy - 2, 3, 0, TAU); ctx.moveTo(hx + 6.5, hy - 2); ctx.lineTo(hx + 7, hy - 2); ctx.arc(hx + 9, hy - 1.7, 2.3, Math.PI, Math.PI * 3); ctx.moveTo(hx + 1.5, hy - 4); ctx.lineTo(hx + 5, hy); ctx.stroke();
  } else if ((L === 'nomad' || L === 'outlaw') && (L === 'nomad' || e.helmetHp > 0)) { // つばの ひろい ぼうし
    const hc = flash ? '#fff' : L === 'nomad' ? '#c8a86a' : '#4a3426', hb = flash ? '#fff' : L === 'nomad' ? '#a8884a' : '#2e2018';
    const bw = L === 'nomad' ? 19 : 16;
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(hx, hy - 7, bw + 1.6, 4.4, -0.06, 0, TAU); ctx.fill();
    ctx.fillStyle = hb; ctx.beginPath(); ctx.ellipse(hx, hy - 7, bw, 3, -0.06, 0, TAU); ctx.fill();
    ctx.fillStyle = OUT; roundRect(ctx, hx - 9, hy - 19, 18, 13, 5); ctx.fill();
    ctx.fillStyle = hc; roundRect(ctx, hx - 7.6, hy - 17.6, 15.2, 11, 4); ctx.fill();
    ctx.fillStyle = L === 'nomad' ? '#6a4a2a' : '#8a6a3a'; ctx.fillRect(hx - 7.6, hy - 9.6, 15.2, 2.2);
    if (L === 'outlaw') { const dmg = 1 - e.helmetHp / (e.def.helmetHp || 1); if (dmg > 0.3) { ctx.fillStyle = '#1a120c'; ctx.beginPath(); ctx.arc(hx + 2, hy - 13, 1.6, 0, TAU); ctx.fill(); } }
    if (L === 'outlaw' && !flash) { ctx.fillStyle = '#6a2a24'; ctx.beginPath(); ctx.moveTo(hx - 4, hy + 6); ctx.lineTo(hx + 11, hy + 5); ctx.lineTo(hx + 4, hy + 12); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.arc(hx + 4, hy + 7.5, 0.8, 0, TAU); ctx.arc(hx + 7, hy + 7, 0.8, 0, TAU); ctx.fill(); }
  } else if (L === 'zombie' || L === 'soldierz') {
    ctx.strokeStyle = '#1e1c1a'; ctx.lineWidth = 1.4; ctx.beginPath(); for (let i = 0; i < 5; i++) { const a = Math.PI * (1.05 + i * 0.16); ctx.moveTo(hx + Math.cos(a) * r, hy + Math.sin(a) * r); ctx.lineTo(hx + Math.cos(a) * (r + 3.5) - 2, hy + Math.sin(a) * (r + 3) + 1 + hash(e.seed + i) * 2); } ctx.stroke();
  }
}

function drawZombie(ctx, e, g, L, flash, walk, ph, wind, atk) {
  const t = g.time, seed = e.seed || 1, skin = flash ? '#fff' : ZSKIN[L];
  const hurt = e.state === 'hurt', hot = wind || atk, air = e.state === 'air';
  if (L === 'leaper') return drawLeaper(ctx, e, g, flash, ph, hot || e.state === 'leap', skin);
  const zp = ph * 0.75;
  let lean = 0.2 + Math.sin(zp * 0.5) * 0.05;
  if (L === 'hulk') lean = 0.28;
  if (L === 'soldierz' || L === 'spitter' || L === 'outlaw') lean = 0.08;
  if (wind) lean = L === 'guard' ? -0.12 : L === 'spitter' ? -0.25 : -0.05;
  if (atk) lean = 0.42;
  if (hurt) lean = -0.32;
  let F1, F2;
  if (air) { F1 = [9, -9]; F2 = [-6, -4]; }
  else if (walk) { F1 = [Math.sin(zp) * 10 + 2, -Math.max(0, Math.cos(zp)) * 5]; F2 = [-Math.sin(zp) * 10 + 2, -Math.max(0, -Math.cos(zp)) * 1.5]; }
  else if (atk) { F1 = [12, 0]; F2 = [-8, 0]; }
  else { F1 = [6, 0]; F2 = [-6, 0]; }
  const big = L === 'hulk', fat = L === 'bloatz';
  if (big) ctx.scale(1.45, 1.45); else if (fat) ctx.scale(1.12, 1.12);
  const pants = flash ? '#fff' : L === 'nomad' ? '#5a4632' : L === 'outlaw' ? '#2e2a30' : L === 'patient' ? '#7d8676' : L === 'worker' ? '#2e3440' : L === 'sailor' ? '#22283a' : L === 'frozen' ? '#3c4a58' : L === 'guard' ? '#1b2232' : L === 'soldierz' ? '#3e3d2c' : L === 'labz' ? '#34363a' : big ? '#2c2a30' : '#2b2d31';
  const shoe = flash ? '#fff' : L === 'guard' || L === 'soldierz' ? '#121212' : L === 'outlaw' || L === 'nomad' ? '#4a2e1c' : '#2a2520';
  const lw = big ? 9.5 : fat ? 8.5 : 7;
  zLeg(ctx, -2, -34, F2[0], F2[1], flash ? '#fff' : shade(pants), shoe, lw);
  zLeg(ctx, 1, -34, F1[0], F1[1], pants, shoe, lw);
  ctx.save(); ctx.translate(0, -34); ctx.rotate(lean); ctx.translate(0, 34);
  const shirt = L === 'nomad' ? '#a8683a' : L === 'outlaw' ? '#7a6248' : L === 'patient' ? '#8fb0aa' : L === 'worker' ? '#b8661c' : L === 'sailor' ? '#c8c8c0' : L === 'frozen' ? '#52687a' : L === 'guard' ? '#26324a' : L === 'labz' ? '#b9bcb4' : L === 'soldierz' ? '#4b4a35' : big ? '#3a3440' : fat ? '#4a4050' : L === 'spitter' ? '#3c3644' : ZSHIRT[seed % ZSHIRT.length];
  const sleeve = flash ? '#fff' : L === 'hulk' || L === 'spitter' ? skin : shirt;
  // うで の めあて
  const sway = Math.sin(t * 2.4 + seed) * 3, sway2 = Math.cos(t * 2.1 + seed) * 3;
  let far = [24 + sway, -50 + sway2 * 0.5], near = [28 + sway2, -47 + sway * 0.5];
  if (atk) { far = [36, -50]; near = [40, -45]; }
  else if (wind) { far = [12, -64]; near = [16, -62]; }
  if (hurt) { far = [-4, -60]; near = [2, -62]; }
  if (L === 'spitter' && !hurt) { far = [8, -30]; near = [12, -31]; }
  if (L === 'soldierz' && !hurt) { const ga = wind || e.state === 'burst' ? 0 : 0.35 + Math.sin(t * 2 + seed) * 0.08; far = [14 + 22 * Math.cos(ga), -44 + 22 * Math.sin(ga) - 3]; near = [15, -43]; e._ga = ga; }
  if (L === 'outlaw' && !hurt) { const ga = wind || e.state === 'burst' ? 0 : 0.5 + Math.sin(t * 2 + seed) * 0.1; far = [14 + 22 * Math.cos(ga), -44 + 22 * Math.sin(ga) - 3]; near = [6, -36]; e._ga = ga; }
  if (L === 'guard' && !hurt) { far = [18 + sway * 0.4, -47]; near = atk ? [32, -42] : wind ? [-2, -70] : [16, -40]; }
  const aw = big ? 9 : 5.2, al = big ? 17 : fat ? 14 : 15, hr = big ? 6.5 : 3.8;
  const [fx, fy] = zArm(ctx, 4, -53, far[0], far[1], flash ? '#fff' : shade(sleeve), flash ? '#fff' : shade(ZSKIN[L]), aw, al, hr);
  if (L === 'guard' && !hurt) { // かいちゅうでんとう
    ctx.fillStyle = OUT; ctx.fillRect(fx - 2, fy - 3.5, 11, 7); ctx.fillStyle = '#2e2f33'; ctx.fillRect(fx - 1, fy - 2.5, 9, 5); ctx.fillStyle = '#f4f0c8'; ctx.fillRect(fx + 7, fy - 2.5, 1.6, 5);
    const fl = 0.16 + 0.08 * flicker(t, seed, true);
    ctx.fillStyle = `rgba(255,246,200,${fl})`; ctx.beginPath(); ctx.moveTo(fx + 8, fy - 2); ctx.lineTo(fx + 110, fy - 26); ctx.lineTo(fx + 110, fy + 30); ctx.lineTo(fx + 8, fy + 2); ctx.fill();
    glowAt(ctx, fx + 9, fy, 18, 'warm', 0.9);
  }
  // どう
  if (fat) {
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(3, -42, 17, 18, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = flash ? '#fff' : shirt; ctx.beginPath(); ctx.ellipse(3, -42, 15.4, 16.4, 0, 0, TAU); ctx.fill();
    if (!flash) {
      ctx.fillStyle = ZSKIN.bloatz; ctx.beginPath(); ctx.ellipse(8, -38, 10, 12, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#7a3aa8'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(2, -48); ctx.quadraticCurveTo(8, -40, 3, -28); ctx.moveTo(12, -46); ctx.quadraticCurveTo(16, -36, 9, -28); ctx.stroke();
      const pu = 0.6 + 0.4 * Math.sin(t * 6 + e.x);
      for (const [px, py, r] of [[10, -42, 3], [5, -33, 2.4], [14, -32, 2]]) { ctx.fillStyle = '#b46ae8'; ctx.beginPath(); ctx.arc(px, py, r * (0.8 + pu * 0.3), 0, TAU); ctx.fill(); glowAt(ctx, px, py, r * 4, 'purple', 0.5 * pu); }
    }
  } else if (big) {
    ctx.fillStyle = OUT; roundRect(ctx, -13, -64, 28, 34, 9); ctx.fill();
    ctx.fillStyle = skin; roundRect(ctx, -11.5, -62.5, 25, 31, 8); ctx.fill();
    if (!flash) {
      ctx.fillStyle = 'rgba(0,0,0,0.2)'; roundRect(ctx, -11.5, -62.5, 9, 31, 6); ctx.fill();
      ctx.fillStyle = shirt; ctx.beginPath(); ctx.moveTo(-11.5, -42); ctx.lineTo(13.5, -46); ctx.lineTo(13.5, -31); ctx.lineTo(-11.5, -31); ctx.fill();
      ctx.strokeStyle = '#7a3aa8'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(4, -60); ctx.quadraticCurveTo(10, -54, 6, -48); ctx.moveTo(-5, -58); ctx.lineTo(-2, -50); ctx.stroke();
      ctx.fillStyle = '#9a5ad0'; ctx.beginPath(); ctx.arc(-6, -56, 2.6, 0, TAU); ctx.arc(9, -52, 2, 0, TAU); ctx.fill();
      if (e.def.look === 'rockz') rockPlates(ctx, [[-8, -60, 8, 5, -0.3], [7, -61, 7, 5, 0.3], [2, -45, 9, 6, 0.1], [-9, -44, 5, 6, 0.2]]);
    }
  } else {
    const bot = L === 'labz' ? -14 : L === 'patient' ? -18 : -31;
    zShirt(ctx, shirt, -10, 10, -58, bot, seed, flash);
    if (!flash) {
      ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(-9, -56, 6, bot + 52);
      ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(3 + hash(seed) * 4, -44, 2.4, 3.4, 0.4, 0, TAU); ctx.fill();
      zStains(ctx, seed, -7, 8, -55, bot - 2, L === 'labz' ? 6 : 3);
      if (L === 'labz') { ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(7, -56); ctx.lineTo(7, bot); ctx.stroke(); ctx.fillStyle = '#3a4a5c'; ctx.fillRect(4, -57, 4, 10); ctx.fillStyle = '#9aa0a8'; ctx.fillRect(-3, -50, 5, 4); }
      if (L === 'worker') { ctx.fillStyle = '#d8d8a0'; ctx.fillRect(-9, -50, 18, 2.4); ctx.fillRect(-9, -40, 18, 2.4); ctx.fillStyle = '#2a2a2e'; ctx.fillRect(-10, -34, 20, 3); }
      if (L === 'sailor') { ctx.fillStyle = '#26345a'; for (let i = 0; i < 4; i++) ctx.fillRect(-9, -54 + i * 6, 18, 2.6); }
      if (L === 'patient') { ctx.strokeStyle = 'rgba(40,60,60,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-2, -56); ctx.lineTo(-2, -20); ctx.stroke(); ctx.fillStyle = '#5a7a76'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-6 + i * 6, -44 + (i % 2) * 10, 1.3, 0, TAU); ctx.fill(); } }
      if (L === 'frozen') { ctx.fillStyle = 'rgba(220,240,255,0.6)'; ctx.beginPath(); ctx.ellipse(-4, -52, 6, 3, 0.3, 0, TAU); ctx.ellipse(5, -38, 5, 2.4, -0.3, 0, TAU); ctx.fill(); ctx.fillStyle = '#bfe8ff'; for (const [x, y, hh] of [[-8, -58, 9], [-2, -59, 7], [6, -58, 10]]) { ctx.beginPath(); ctx.moveTo(x - 2.5, y); ctx.lineTo(x, y - hh); ctx.lineTo(x + 2.5, y); ctx.fill(); } }
      if (L === 'guard') { ctx.fillStyle = '#1a2233'; ctx.fillRect(-10, -36, 20, 4); ctx.fillStyle = '#a8a690'; ctx.beginPath(); ctx.moveTo(4, -52); ctx.lineTo(8, -52); ctx.lineTo(8, -48); ctx.lineTo(6, -46); ctx.lineTo(4, -48); ctx.fill(); ctx.fillStyle = '#2b2c30'; ctx.fillRect(-8, -38, 5, 7); }
      if (L === 'soldierz') {
        ctx.fillStyle = '#3a3928'; ctx.beginPath(); ctx.ellipse(-4, -50, 4, 2.4, 0.4, 0, TAU); ctx.ellipse(5, -40, 4.4, 2, -0.3, 0, TAU); ctx.fill();
        ctx.fillStyle = OUT; roundRect(ctx, -10.5, -57, 22, 18, 3); ctx.fill(); ctx.fillStyle = '#34352a'; roundRect(ctx, -9, -55.5, 19, 15, 2); ctx.fill();
        ctx.fillStyle = '#26271f'; for (let i = 0; i < 2; i++) ctx.fillRect(1 + i * 5, -47, 4.2, 7);
        ctx.fillStyle = 'rgba(70,140,50,0.5)'; ctx.beginPath(); ctx.ellipse(2, -51, 3, 2, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = OUT; ctx.fillRect(-10, -36, 20, 4);
      }
      if (L === 'nomad') { // ぼろぼろの ポンチョ（しまもよう）
        ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(-13, -40); ctx.lineTo(-6, -60); ctx.lineTo(8, -60); ctx.lineTo(15, -40); ctx.lineTo(10, -36); ctx.lineTo(4, -41); ctx.lineTo(-2, -35); ctx.lineTo(-8, -40); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#9a5e34'; ctx.beginPath(); ctx.moveTo(-11.5, -41); ctx.lineTo(-5, -58.5); ctx.lineTo(7, -58.5); ctx.lineTo(13.5, -41); ctx.lineTo(10, -38); ctx.lineTo(4, -43); ctx.lineTo(-2, -37); ctx.lineTo(-8, -42); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#d8b878'; ctx.fillRect(-9, -50, 20, 2); ctx.fillStyle = '#5a7a6a'; ctx.fillRect(-10, -46, 22, 2); ctx.fillStyle = '#d8b878'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-8 + i * 4.4, -53); ctx.lineTo(-6 + i * 4.4, -55.6); ctx.lineTo(-4 + i * 4.4, -53); ctx.fill(); }
        zStains(ctx, seed + 3, -8, 10, -56, -42, 2);
      }
      if (L === 'outlaw') { // かわの ベスト と ベルト
        ctx.fillStyle = '#3a2a20'; ctx.beginPath(); ctx.moveTo(-10, -57); ctx.lineTo(-1, -57); ctx.lineTo(-3, -33); ctx.lineTo(-10, -33); ctx.fill(); ctx.beginPath(); ctx.moveTo(4, -57); ctx.lineTo(10, -57); ctx.lineTo(10, -33); ctx.lineTo(2, -33); ctx.fill();
        ctx.fillStyle = '#c8b070'; ctx.beginPath(); ctx.arc(-6, -50, 1, 0, TAU); ctx.arc(-6, -44, 1, 0, TAU); ctx.fill();
        ctx.fillStyle = OUT; ctx.fillRect(-10, -35, 20, 4); ctx.fillStyle = '#5a3a24'; ctx.fillRect(-10, -34.4, 20, 2.6); ctx.fillStyle = '#b8a060'; ctx.fillRect(-1.5, -35, 4, 4);
        ctx.fillStyle = '#5a3a24'; ctx.fillRect(-12, -34, 6, 9); ctx.fillStyle = OUT; ctx.fillRect(-12, -26, 6, 1.2);
      }
      if (L === 'spitter') { // のどの ふくろ
        const pu = 0.7 + 0.3 * Math.sin(t * 7 + seed) + (wind ? 0.4 : 0);
        ctx.fillStyle = '#9a5ad0'; ctx.beginPath(); ctx.ellipse(7, -57, 5 * pu, 4 * pu, 0, 0, TAU); ctx.fill(); glowAt(ctx, 7, -57, 16 * pu, 'purple', 0.6);
      }
    }
  }
  // あたま（まえ に つきだす）
  const hTilt = hurt ? -0.35 : wind && L === 'spitter' ? -0.4 : 0.15 + Math.sin(t * 1.7 + seed) * 0.1;
  ctx.save(); ctx.translate(3, -58); ctx.rotate(hTilt); zHead(ctx, L, big ? 5 : 4, -9, ZSKIN[L], flash, hot, e, t); if (!flash && e.def.look === 'rockz') rockPlates(ctx, [[3, -17, 9, 4.6, -0.1]]); ctx.restore();
  if (L === 'soldierz' && !hurt) drawGun(ctx, 'dark', 15, -44, e._ga || 0, 1, 1);
  if (L === 'outlaw' && !hurt) drawGun(ctx, 'revolver', 15, -44, e._ga || 0, 1, 1);
  const [nx, ny] = zArm(ctx, 0, -53, near[0], near[1], sleeve, skin, aw, al, hr);
  if (L === 'guard' && !hurt) { // けいぼう
    const ba = atk ? 0.3 : wind ? -2.4 : -0.9;
    ctx.save(); ctx.translate(nx, ny); ctx.rotate(ba); ctx.fillStyle = OUT; ctx.fillRect(-2, -2.6, 26, 5.2); ctx.fillStyle = flash ? '#fff' : '#1c1c1e'; ctx.fillRect(-1, -1.5, 24, 3); ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(4, -1.5, 18, 1); ctx.restore();
    zHand(ctx, nx, ny, skin, 3.8);
  }
  if (atk && L !== 'guard') { ctx.strokeStyle = 'rgba(200,255,180,0.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(14, -46, 26, -0.8, 0.8); ctx.stroke(); }
  if (atk && L === 'guard') { ctx.strokeStyle = 'rgba(230,230,255,0.4)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(8, -50, 32, -1.6, 0.4); ctx.stroke(); }
  ctx.restore();
}
function shade(c) { const n = parseInt(c.slice(1), 16); const f = (v) => Math.round(v * 0.72); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; }
// てなが ゾンビ：ひくく かまえて とびかかる
function drawLeaper(ctx, e, g, flash, ph, mad, skin) {
  const t = g.time, air = !e.onGround, leap = e.state === 'leap';
  const sk2 = flash ? '#fff' : shade(ZSKIN.leaper), pants = flash ? '#fff' : '#26222a';
  const cr = Math.sin(ph * 1.2) * 2;
  zLeg(ctx, -8, -24 + cr, air ? -16 : -14, air ? -6 : 0, flash ? '#fff' : '#1c1a1f', sk2, 6, 15);
  zLeg(ctx, -5, -24 + cr, air ? 4 : 2, air ? -12 : 0, pants, skin, 6, 15);
  // ながい うで（じめん に つく）
  const s1 = Math.sin(ph * 1.6) * 8;
  const farH = leap ? [38, -32] : mad ? [30, -18] : [22 + s1, 0], nearH = leap ? [42, -26] : mad ? [34, -14] : [26 - s1, 0];
  zArm(ctx, 8, -36 + cr, farH[0], farH[1], sk2, sk2, 4.5, 21, 3.6, -1);
  // からだ（まえ に たおれる）
  ctx.save(); ctx.translate(-6, -26 + cr); ctx.rotate(-1.05);
  zShirt(ctx, '#3a3340', -8, 8, -4, 22, e.seed || 3, flash);
  if (!flash) {
    ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(2, 10, 2.4, 4, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#7a3aa8'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-5, 4); ctx.quadraticCurveTo(0, 10, -4, 18); ctx.stroke();
    ctx.fillStyle = '#6a5a74'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(-9, 2 + i * 5, 1.6, 0, TAU); ctx.fill(); }
  }
  ctx.restore();
  ctx.save(); ctx.translate(16, -36 + cr); ctx.rotate(mad ? -0.2 : 0.2); zHead(ctx, 'leaper', 2, -2, ZSKIN.leaper, flash, mad, e, t); ctx.restore();
  zArm(ctx, 10, -34 + cr, nearH[0], nearH[1], skin, skin, 4.5, 21, 3.6, -1);
}
function drawEnemy(ctx, e, g) {
  const d = e.def, L = d.look || e.type, A = d.ai || e.type;
  if (e.spawnT > 0) return drawEmerge(ctx, e, g);
  ctx.save(); ctx.translate(e.x, e.y);
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.ellipse(0, (GROUND - e.y > 0 && !e.onGround ? GROUND - e.y : 0), e.w * 0.6, 4, 0, 0, TAU); ctx.fill();
  ctx.scale(e.face, 1);
  const air = e.state === 'air', down = e.state === 'down';
  const wind = e.state === 'wind', atk = e.state === 'attack';
  const flash = e.flashT > 0;
  const ph = e.anim * 10, walk = e.onGround && Math.abs(e.vx) > 20 && e.state === 'walk';
  if (air) ctx.rotate(e.dead ? -0.4 - (e.deadT || 0) * 8 : -0.5);
  if (down) { ctx.translate(-10, 0); ctx.rotate(-1.35); }
  if (e.state === 'hurt') ctx.rotate(-0.22);
  const shake = wind ? Math.sin(e.anim * 60) * 1.4 : 0;
  ctx.translate(shake, 0);
  if (L === 'ghoul') drawGhoul(ctx, e.h / 58, ghoulPoseEnemy(e, g));
  else if (L === 'sergeant') { ctx.scale(1.25, 1.25); drawZombie(ctx, e, g, 'soldierz', flash, walk, ph, wind, atk); }
  else if (L === 'patch') { ctx.scale(1.12, 1.12); drawZombie(ctx, e, g, 'hulk', flash, walk, ph, wind, atk); if (!flash) { ctx.strokeStyle = '#2a2024'; ctx.lineWidth = 1.6; ctx.beginPath(); for (const [x0, y0, x1, y1] of [[-14, -80, 14, -70], [-10, -60, 16, -64], [-16, -74, -6, -50]]) { ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); for (let k = 0; k <= 4; k++) { const x = x0 + (x1 - x0) * k / 4, y = y0 + (y1 - y0) * k / 4; ctx.moveTo(x - 2, y - 3); ctx.lineTo(x + 2, y + 3); } } ctx.stroke(); } }
  else if (L === 'rockz') { ctx.scale(1.18, 1.18); drawZombie(ctx, e, g, 'hulk', flash, walk, ph, wind, atk); }
  else if (ZLOOK.has(L)) drawZombie(ctx, e, g, L, flash, walk, ph, wind, atk);
  else if (L === 'hound') drawHound(ctx, e, ph, wind || e.state === 'leap', flash, g.time);
  else if (A === 'crawler') {
    if (L === 'swarm') { ctx.scale(0.62, 0.62); drawCrawler(ctx, e, ph * 1.3, wind || e.state === 'leap', flash); }
    else if (L === 'scorp') drawScorp(ctx, ph, wind || e.state === 'leap', flash, 1);
    else if (L === 'wraith') drawWraith(ctx, e, ph, wind || e.state === 'leap', flash, g.time);
    else drawCrawler(ctx, e, ph, wind || e.state === 'leap', flash);
  } else {
    const brute = L === 'brute', fat = L === 'bloater', knight = L === 'knight';
    const S = brute ? 1.5 : fat ? 1.25 : knight ? 1.1 : 1;
    ctx.scale(S, S);
    if (!air && !down && (brute || A === 'grunt')) ctx.rotate(brute ? 0.14 : 0.07);
    const body = flash ? '#fff' : ({ brute: '#2a2628', shield: '#25282c', gunner: '#161518', sniper: '#1a1c18', raider: '#2e2b22', bloater: '#2e2430', knight: '#1d1e22' })[L] || '#2c2a27';
    const leg = flash ? '#fff' : '#1c1b1d';
    const sw = walk ? Math.sin(ph) * 12 : 0, bw = brute ? 15 : fat ? 15 : A === 'grunt' ? 8 : 10;
    limb(ctx, [0, -20, -sw * 0.6, -10, -sw, 0], brute || fat ? 8 : 5, leg);
    if (fat) {
      // ふくれた からだ（むらさきの すじ）
      ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(2, -36, 19, 22, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(2, -36, 17, 20, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = flash ? '#fff' : '#7a3aa8'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-8, -50); ctx.quadraticCurveTo(-2, -40, -9, -26); ctx.moveTo(6, -52); ctx.quadraticCurveTo(12, -38, 4, -22); ctx.moveTo(-2, -40); ctx.lineTo(6, -36); ctx.stroke();
      const pu = 0.6 + 0.4 * Math.sin(g.time * 6 + e.x);
      for (const [px, py, r] of [[8, -40, 3.2], [-6, -30, 2.6], [12, -28, 2.2]]) { ctx.fillStyle = '#b46ae8'; ctx.beginPath(); ctx.arc(px, py, r * (0.8 + pu * 0.3), 0, TAU); ctx.fill(); glowAt(ctx, px, py, r * 4, 'purple', 0.5 * pu); }
    } else {
      ctx.fillStyle = OUT; roundRect(ctx, -bw - 2, -52, bw * 2 + 4, 36, 4); ctx.fill();
      ctx.fillStyle = body; roundRect(ctx, -bw, -50, bw * 2, 32, 3); ctx.fill();
      ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(-bw, -20); for (let i = 0; i <= 4; i++) ctx.lineTo(-bw + (bw * 2 * i) / 4, -20 + (i % 2 ? 6 : 1)); ctx.lineTo(bw, -20); ctx.fill();
      if (A === 'gunner') { ctx.fillStyle = flash ? '#fff' : L === 'sniper' ? '#151712' : '#121114'; ctx.beginPath(); ctx.moveTo(-bw - 1, -48); ctx.lineTo(-bw - 4, -8); ctx.lineTo(bw + 2, -10); ctx.lineTo(bw, -48); ctx.fill(); }
      if (knight) { ctx.fillStyle = flash ? '#fff' : '#33363c'; ctx.fillRect(-bw, -50, bw * 2, 12); ctx.fillStyle = '#4a4e56'; ctx.fillRect(-bw, -50, bw * 2, 2); ctx.fillStyle = '#121316'; ctx.fillRect(-bw - 4, -52, 8, 8); ctx.fillRect(bw - 4, -52, 8, 8); }
      else if (L === 'raider') { ctx.fillStyle = '#1a1814'; ctx.fillRect(-bw, -40, bw * 2, 3); ctx.fillStyle = '#4a4232'; ctx.fillRect(-6, -36, 5, 7); ctx.fillRect(1, -36, 5, 7); }
      else { ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -48); ctx.lineTo(0, -22); for (let y = -45; y < -22; y += 6) { ctx.moveTo(-2.5, y - 2); ctx.lineTo(2.5, y + 2); ctx.moveTo(2.5, y - 2); ctx.lineTo(-2.5, y + 2); } ctx.stroke(); }
      if (brute) { ctx.strokeStyle = '#3a3638'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-14, -48); ctx.lineTo(14, -24); ctx.stroke(); }
    }
    limb(ctx, [0, -20, sw * 0.6, -10, sw, 0], brute || fat ? 8 : 5, leg);
    // あたま
    const hy = fat ? -62 : -65;
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(1, hy, 16.5, 0, TAU); ctx.fill();
    ctx.fillStyle = flash ? '#fff' : '#262427'; ctx.beginPath(); ctx.arc(1, hy, 14.5, 0, TAU); ctx.fill();
    const hot = wind || atk;
    if (A === 'gunner') {
      ctx.fillStyle = L === 'sniper' ? '#0c0e0a' : '#0a090b'; ctx.beginPath(); ctx.arc(1, hy - 1, 17, Math.PI * 0.95, Math.PI * 2.05); ctx.lineTo(16, hy + 10); ctx.lineTo(-14, hy + 12); ctx.fill();
      ctx.fillStyle = '#000'; ctx.fillRect(0, hy - 3, 16, 7);
      if (L === 'sniper') { ctx.fillStyle = '#1c1e22'; ctx.fillRect(6, hy - 5, 10, 9); ctx.fillStyle = hot ? '#ff3a2a' : '#b51d1d'; ctx.beginPath(); ctx.arc(14, hy - 0.5, 2.6, 0, TAU); ctx.fill(); glowAt(ctx, 14, hy, hot ? 18 : 12, 'red', 0.95); }
      else { ctx.fillStyle = hot ? '#ff3a2a' : '#b51d1d'; ctx.fillRect(2, hy - 1, 13, 2); glowAt(ctx, 9, hy, hot ? 16 : 11, 'red', 0.9); }
    } else if (L === 'raider') {
      // ガスマスク（まるい フィルター と レンズ）
      ctx.fillStyle = flash ? '#fff' : '#3a372e'; ctx.beginPath(); ctx.ellipse(6, hy + 1, 11, 13, 0.05, 0, TAU); ctx.fill();
      ctx.fillStyle = '#0a0a0a'; ctx.beginPath(); ctx.arc(4, hy - 3, 3.6, 0, TAU); ctx.arc(12, hy - 3, 3.6, 0, TAU); ctx.fill();
      eyesGlow(ctx, [[4, hy - 3], [12, hy - 3]], hot ? '#ff4030' : '#c8281c', hot ? 1.8 : 1.3, 'red');
      ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(12, hy + 8, 5.4, 0, TAU); ctx.fill(); ctx.fillStyle = flash ? '#fff' : '#5a5648'; ctx.beginPath(); ctx.arc(12, hy + 8, 4.2, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#1a1814'; ctx.lineWidth = 0.8; ctx.beginPath(); for (let i = -2; i <= 2; i++) { ctx.moveTo(9, hy + 8 + i * 1.5); ctx.lineTo(15, hy + 8 + i * 1.5); } ctx.stroke();
      ctx.fillStyle = '#1a1814'; ctx.fillRect(-15, hy - 4, 8, 3);
    } else if (knight) {
      // てつの かぶと（ほそい すきま から あかい め）
      ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(1, hy - 1, 18, 0, TAU); ctx.fill();
      const hg = ctx.createLinearGradient(0, hy - 18, 0, hy + 16); hg.addColorStop(0, flash ? '#fff' : '#6a6e78'); hg.addColorStop(0.5, flash ? '#fff' : '#3a3d44'); hg.addColorStop(1, flash ? '#fff' : '#1c1d22');
      ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(1, hy - 1, 16, 0, TAU); ctx.fill();
      ctx.fillStyle = '#050505'; ctx.fillRect(0, hy - 4, 17, 3.4);
      eyesGlow(ctx, [[6, hy - 2.4], [12, hy - 2.4]], hot ? '#ff4030' : '#d42a1e', 1.3, 'red');
      ctx.fillStyle = '#16171b'; ctx.fillRect(-1, hy - 17, 3, 14); ctx.fillStyle = '#0a0a0c'; for (let i = 0; i < 3; i++) ctx.fillRect(8 + i * 3, hy + 3, 1.4, 6);
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(-8, hy - 12, 6, 2);
    } else {
      // ほそながい マスク
      ctx.fillStyle = flash ? '#fff' : fat ? '#b8a8b4' : '#bfb8a8'; ctx.beginPath(); ctx.ellipse(6, hy + 1, fat ? 12 : 10, 14, 0.05, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(3, hy + 5, 6, 9, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = fat ? '#7a3aa8' : '#3a352e'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, hy - 10); ctx.lineTo(4, hy - 5); ctx.lineTo(2, hy - 1); if (fat) { ctx.moveTo(14, hy - 8); ctx.lineTo(10, hy + 2); ctx.lineTo(15, hy + 8); } ctx.stroke();
      ctx.fillStyle = '#050505'; ctx.beginPath(); ctx.ellipse(3, hy - 3, 3, 4.2, 0.25, 0, TAU); ctx.ellipse(11, hy - 3, 3, 4.2, -0.25, 0, TAU); ctx.fill();
      eyesGlow(ctx, [[3, hy - 3], [11, hy - 3]], fat ? '#c070ff' : hot ? '#ff4030' : '#d42a1e', hot ? 1.6 : 1.2, fat ? 'purple' : 'red');
      xMouth(ctx, 0, 13, hy + 8, brute ? 3 : 2.5);
      if (brute) { ctx.fillStyle = '#141214'; ctx.fillRect(-15, hy - 9, 32, 3); ctx.fillRect(-15, hy + 3, 32, 2); }
      if (L === 'shield') { ctx.fillStyle = flash ? '#fff' : '#2a2d32'; ctx.beginPath(); ctx.arc(1, hy - 3, 16, Math.PI * 1.02, Math.PI * 1.98); ctx.fill(); ctx.fillStyle = '#18191c'; ctx.fillRect(-15, hy - 5, 32, 3); }
    }
    const hc = flash ? '#fff' : '#77726a';
    if (A === 'gunner') {
      if (L === 'sniper') { drawGun(ctx, 'dark', 14, -46, wind ? 0 : 0.18, 1, 1.15); ctx.fillStyle = OUT; ctx.fillRect(48, -54, 20, 3); ctx.fillStyle = '#2a2c30'; ctx.fillRect(48, -53.4, 20, 1.8); ctx.fillStyle = '#1c1e22'; ctx.fillRect(18, -62, 16, 5); glove(ctx, 15, -45, hc, 4.5); glove(ctx, 36, -48, hc, 4.5); }
      else { drawGun(ctx, 'dark', 16, -44, wind ? -0.05 : 0.15, 1, 1); glove(ctx, 17, -43, hc, 4.5); glove(ctx, 42, -50, hc, 4.5); }
      if (wind) glowAt(ctx, L === 'sniper' ? 66 : 50, -51, 12, L === 'sniper' ? 'red' : 'purple', 0.6);
    } else if (A === 'shield' && e.shieldHp > 0) {
      glove(ctx, 10, -40, hc, 4.5);
      if (knight) {
        // おおきな てつの たて（びょう つき）
        ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(14, -82); ctx.lineTo(32, -82); ctx.lineTo(32, -20); ctx.lineTo(23, -4); ctx.lineTo(14, -20); ctx.fill();
        const sg = ctx.createLinearGradient(16, 0, 30, 0); sg.addColorStop(0, flash ? '#fff' : '#5a5e66'); sg.addColorStop(1, flash ? '#fff' : '#26282e');
        ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(16, -80); ctx.lineTo(30, -80); ctx.lineTo(30, -21); ctx.lineTo(23, -7); ctx.lineTo(16, -21); ctx.fill();
        ctx.fillStyle = '#121316'; for (const [bx, by] of [[18, -77], [28, -77], [18, -24], [28, -24], [23, -50]]) { ctx.beginPath(); ctx.arc(bx, by, 1.3, 0, TAU); ctx.fill(); }
        ctx.fillStyle = 'rgba(90,60,30,0.5)'; ctx.fillRect(17, -44, 12, 9);
      } else {
        ctx.fillStyle = OUT; ctx.fillRect(16, -78, 12, 74); ctx.fillStyle = flash ? '#fff' : '#3c4046'; ctx.fillRect(18, -76, 8, 70);
        ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(19, -74, 2, 66); ctx.fillStyle = 'rgba(80,50,30,0.5)'; ctx.fillRect(18, -30, 8, 12); ctx.fillStyle = '#0a0a0b'; ctx.fillRect(19, -64, 6, 2);
      }
      const cr = 1 - e.shieldHp / d.shieldHp; if (cr > 0.3) { ctx.strokeStyle = '#0a0a0b'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(18, -66); ctx.lineTo(24, -58); ctx.lineTo(20, -48); if (cr > 0.6) { ctx.moveTo(26, -30); ctx.lineTo(20, -22); } ctx.stroke(); }
    } else {
      const reach = atk ? 26 : wind ? -6 : 8 + Math.sin(e.anim * 4) * 2;
      limb(ctx, [4, -46, (reach + 8) * 0.5, -40, reach + 8, -42], brute ? 6 : 3.5, flash ? '#fff' : body);
      glove(ctx, reach + 8, -42, hc, brute ? 7 : 4.5);
      glove(ctx, -12, -40 + Math.sin(e.anim * 4) * 2, hc, brute ? 6 : 4.5);
      ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.beginPath(); for (let i = -1; i <= 1; i++) { ctx.moveTo(reach + 12, -42 + i * 3); ctx.lineTo(reach + 18, -42 + i * 4); } ctx.stroke();
      if (atk) { ctx.strokeStyle = 'rgba(220,60,40,0.5)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(10, -42, 28, -0.8, 0.8); ctx.stroke(); }
    }
  }
  ctx.restore();
  if (wind && !e.dead) { ctx.font = '900 16px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = OUT; const yy = e.y - e.h - 12; ctx.strokeText('！', e.x, yy); ctx.fillStyle = '#e0332a'; ctx.fillText('！', e.x, yy); }
  if (!e.dead && e.hp < e.maxHp) { ctx.fillStyle = '#000c'; ctx.fillRect(e.x - 15, e.y - e.h - 6, 30, 3); ctx.fillStyle = e.def.blood === 'purple' ? '#9a3ae0' : '#4fc63a'; ctx.fillRect(e.x - 15, e.y - e.h - 6, 30 * Math.max(0, e.hp / e.maxHp), 3); }
}
// ねらいへい の レーザー（ためている あいだ）
function drawLaser(ctx, e, t) {
  const sx = e.x + e.face * 66, sy = e.y - 52, a = 0.35 + Math.sin(t * 30) * 0.2;
  ctx.strokeStyle = `rgba(255,40,30,${a})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(e.aimX, e.aimY); ctx.stroke();
  ctx.fillStyle = `rgba(255,60,40,${a + 0.3})`; ctx.beginPath(); ctx.arc(e.aimX, e.aimY, 2.4, 0, TAU); ctx.fill(); glowAt(ctx, e.aimX, e.aimY, 14, 'red', 0.8);
}
// ゆらぎ：うかぶ くろい かげ（フード と ながい て）
function drawWraith(ctx, e, ph, mad, flash, t) {
  const fy = -24 + Math.sin(ph * 0.6) * 4, ink = flash ? '#fff' : '#08060c';
  ctx.globalAlpha *= 0.92;
  ctx.fillStyle = 'rgba(40,20,60,0.35)'; ctx.beginPath(); ctx.ellipse(0, fy + 6, 30, 26, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = ink; ctx.beginPath(); ctx.moveTo(-14, fy - 18); ctx.quadraticCurveTo(0, fy - 34, 14, fy - 16);
  for (let i = 0; i <= 6; i++) { const x = 16 - i * 6, y = fy + 18 + Math.sin(ph * 2 + i) * 5 + (i % 2) * 6; ctx.lineTo(x, y); }
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = ink; ctx.lineWidth = 2; const r = mad ? 18 : 8 + Math.sin(ph) * 3;
  ctx.beginPath(); ctx.moveTo(8, fy - 4); ctx.quadraticCurveTo(18 + r * 0.5, fy - 14, 22 + r, fy + 2); ctx.stroke();
  ctx.lineWidth = 1; ctx.beginPath(); for (let i = -1; i <= 1; i++) { ctx.moveTo(22 + r, fy + 2); ctx.lineTo(27 + r, fy + 4 + i * 3); } ctx.stroke();
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(6, fy - 14, 7, 8, 0, 0, TAU); ctx.fill();
  eyesGlow(ctx, [[4, fy - 15], [9, fy - 15]], mad ? '#ffffff' : '#c8b0ff', 1.5, 'purple');
  ctx.globalAlpha = 1;
}
// かべの しみから はいでる カゲモドキ
function drawEmerge(ctx, e, g) {
  if (e.def.look === 'ghoul') return drawGhoulEmerge(ctx, e, g);
  if (e.def.look === 'scorp') return drawSandEmerge(ctx, e, g);
  const p = 1 - e.spawnT / (e.spawnMax || 0.9), wy = e.wallY || GROUND - 90;
  ctx.save(); ctx.translate(e.x, wy);
  ctx.fillStyle = 'rgba(4,2,6,0.92)'; ctx.beginPath(); ctx.ellipse(0, 0, 8 + 26 * Math.min(1, p * 2), 12 + 16 * Math.min(1, p * 2), 0, 0, TAU); ctx.fill();
  for (let i = -2; i <= 2; i++) ctx.fillRect(i * 7 - 1.5, 4, 3, 10 + p * 30 * hash(i + 4));
  if (p < 0.5) eyesGlow(ctx, [[-5, -3], [5, -3]], '#e6d8ff', 1.6 + p * 2, 'purple');
  ctx.restore();
  if (p >= 0.35) {
    const q = (p - 0.35) / 0.65, y = wy + (GROUND - wy) * q * q;
    ctx.save(); ctx.globalAlpha = 0.4 + 0.6 * q; ctx.translate(e.x, y); ctx.scale(e.face, 1); ctx.rotate((1 - q) * -1.3);
    const L = e.def.look; if (L === 'swarm') ctx.scale(0.62, 0.62); if (L === 'wraith') drawWraith(ctx, e, e.anim * 10, true, false, 0); else drawCrawler(ctx, e, e.anim * 10, true, false); ctx.restore(); ctx.globalAlpha = 1;
  }
}
// v0.8 すなさそり（くろい こうら・みどりに ひかる め・まがった しっぽ）
function drawScorp(ctx, ph, mad, flash, k) {
  const shell = flash ? '#fff' : '#3a2a1e', hi = flash ? '#fff' : '#8a6a44', dk = flash ? '#fff' : '#22160e';
  ctx.lineCap = 'round';
  // あし
  ctx.strokeStyle = OUT; ctx.lineWidth = 3.2;
  for (let i = 0; i < 4; i++) { const bx = -12 + i * 7, sw = Math.sin(ph * 1.8 + i * 1.4) * 4; ctx.beginPath(); ctx.moveTo(bx, -10); ctx.lineTo(bx - 4 + sw, -16); ctx.lineTo(bx - 7 + sw * 1.3, 0); ctx.stroke(); }
  ctx.strokeStyle = dk; ctx.lineWidth = 1.6;
  for (let i = 0; i < 4; i++) { const bx = -12 + i * 7, sw = Math.sin(ph * 1.8 + i * 1.4) * 4; ctx.beginPath(); ctx.moveTo(bx, -10); ctx.lineTo(bx - 4 + sw, -16); ctx.lineTo(bx - 7 + sw * 1.3, 0); ctx.stroke(); }
  // しっぽ（せなかの うえに まがる）
  const curl = mad ? 0.5 : Math.sin(ph * 0.6) * 0.12;
  let x = -16, y = -12, a = -2.2 - curl;
  const segs = [];
  for (let i = 0; i < 5; i++) { segs.push([x, y, 5.2 - i * 0.5]); x += Math.cos(a) * 7; y += Math.sin(a) * 7; a += 0.55 + curl * 0.4; }
  for (const [sx, sy, r] of segs) { ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(sx, sy, r + 1.4, 0, TAU); ctx.fill(); }
  for (const [sx, sy, r] of segs) { ctx.fillStyle = shell; ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU); ctx.fill(); ctx.fillStyle = hi; ctx.beginPath(); ctx.arc(sx - r * 0.3, sy - r * 0.4, r * 0.35, 0, TAU); ctx.fill(); }
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(x - 3, y - 2); ctx.quadraticCurveTo(x + 8, y - 2, x + 6, y + 8); ctx.quadraticCurveTo(x + 3, y + 2, x - 3, y + 3); ctx.fill();
  ctx.fillStyle = flash ? '#fff' : '#9ad060'; ctx.beginPath(); ctx.moveTo(x - 1.5, y - 0.6); ctx.quadraticCurveTo(x + 6, y - 0.6, x + 5, y + 5.4); ctx.quadraticCurveTo(x + 2.4, y + 1.6, x - 1.5, y + 1.8); ctx.fill();
  if (!flash) glowAt(ctx, x + 3, y + 2, 10, 'green', 0.5);
  // からだ
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(-2, -9, 17, 8.4, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = shell; ctx.beginPath(); ctx.ellipse(-2, -9, 15.4, 6.8, 0, 0, TAU); ctx.fill();
  if (!flash) { ctx.strokeStyle = dk; ctx.lineWidth = 1; ctx.beginPath(); for (let i = -2; i <= 2; i++) { ctx.moveTo(-2 + i * 5, -15); ctx.lineTo(-2 + i * 5, -4); } ctx.stroke(); ctx.fillStyle = hi; ctx.beginPath(); ctx.ellipse(-4, -13, 8, 1.6, 0, 0, TAU); ctx.fill(); }
  // ハサミ
  const op = mad ? 0.6 : 0.25 + Math.sin(ph) * 0.12, rx = mad ? 8 : 0;
  for (const [yy, s2] of [[-6, 1], [-11, 0.85]]) {
    ctx.strokeStyle = OUT; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(10, -9); ctx.lineTo(18 + rx * 0.5, yy - 4); ctx.lineTo(24 + rx, yy); ctx.stroke();
    ctx.strokeStyle = shell; ctx.lineWidth = 2.2; ctx.stroke();
    ctx.save(); ctx.translate(26 + rx, yy); ctx.scale(s2, s2);
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(0, 0, 6.4, 4.4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = shell; ctx.beginPath(); ctx.ellipse(0, 0, 5, 3.2, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(4, -1); ctx.lineTo(10, -2 - op * 6); ctx.moveTo(4, 1); ctx.lineTo(10, 2 + op * 4); ctx.stroke();
    ctx.strokeStyle = hi; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.restore();
  }
  eyesGlow(ctx, [[11, -12], [8, -13]], mad ? '#f4ffd0' : '#b8f070', 1.3, 'green');
}
function drawSandEmerge(ctx, e, g) {
  const p = 1 - e.spawnT / (e.spawnMax || 0.9);
  ctx.save(); ctx.translate(e.x, GROUND);
  const r = 8 + 20 * Math.min(1, p * 2);
  ctx.fillStyle = '#6a4a2e'; ctx.beginPath(); ctx.ellipse(0, 0, r + 3, 5 + r * 0.1, 0, Math.PI, TAU); ctx.fill();
  ctx.fillStyle = '#b08a5a'; ctx.beginPath(); ctx.ellipse(0, 0, r, 3.4 + r * 0.12, 0, Math.PI, TAU); ctx.fill();
  for (let i = 0; i < 5; i++) { const k = (g.time * 2.4 + i * 0.2) % 1; ctx.fillStyle = 'rgba(190,150,100,0.8)'; ctx.beginPath(); ctx.arc((i - 2) * r * 0.4 + Math.sin(i * 3) * 4, -k * 18, 2.2 * (1 - k) + 0.6, 0, TAU); ctx.fill(); }
  if (p > 0.3) {
    const q = (p - 0.3) / 0.7;
    ctx.beginPath(); ctx.rect(-80, -120, 160, 119); ctx.clip();
    ctx.translate(0, (1 - q) * 26); ctx.scale(e.face, 1); ctx.rotate(-(1 - q) * 0.4);
    drawScorp(ctx, e.anim * 10, true, false, 1);
  }
  ctx.restore();
}
// いわおとこ：かたと むね と あたまに いわの よろい
function rockPlates(ctx, R) {
  for (const [x, y, w, h, a] of R) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(-w - 1.5, 1); ctx.lineTo(-w * 0.5, -h - 1.5); ctx.lineTo(w * 0.6, -h - 1); ctx.lineTo(w + 1.5, 0); ctx.lineTo(w * 0.5, h + 1.5); ctx.lineTo(-w * 0.6, h + 1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#9a7a58'; ctx.beginPath(); ctx.moveTo(-w, 1); ctx.lineTo(-w * 0.5, -h); ctx.lineTo(w * 0.6, -h + 0.5); ctx.lineTo(w, 0); ctx.lineTo(w * 0.5, h); ctx.lineTo(-w * 0.6, h - 0.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c4a47a'; ctx.beginPath(); ctx.moveTo(-w * 0.8, 0); ctx.lineTo(-w * 0.45, -h * 0.8); ctx.lineTo(w * 0.3, -h * 0.75); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#5a4430'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-w * 0.2, -h * 0.5); ctx.lineTo(w * 0.1, h * 0.2); ctx.lineTo(w * 0.5, h * 0.4); ctx.stroke();
    ctx.restore();
  }
}
function drawCrawler(ctx, e, ph, mad, flash) {
  // くろい かげの いきもの：ほそながい て と にやにや くち
  const ink = flash ? '#fff' : '#060508';
  ctx.fillStyle = 'rgba(6,4,8,0.45)';
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-24 - i * 9 + Math.sin(ph + i) * 2, -18 - Math.sin(ph * 0.7 + i) * 4, 9 - i * 2.5, 0, TAU); ctx.fill(); }
  ctx.strokeStyle = ink; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const bx = -14 + i * 9, sw = Math.sin(ph * 1.6 + i * 1.7) * 6;
    ctx.beginPath(); ctx.moveTo(bx, -16); ctx.lineTo(bx + 5 + sw, -30); ctx.lineTo(bx + 10 + sw * 1.5, 0); ctx.stroke();
  }
  // ながい うで（まえに のびる）
  const reach = mad ? 16 : 6 + Math.sin(ph) * 3;
  ctx.beginPath(); ctx.moveTo(12, -22); ctx.lineTo(24 + reach * 0.5, -34); ctx.lineTo(30 + reach, -6); ctx.stroke();
  ctx.lineWidth = 1.2; ctx.beginPath(); for (let i = -1; i <= 1; i++) { ctx.moveTo(30 + reach, -6); ctx.lineTo(35 + reach, -4 + i * 3); } ctx.stroke();
  const pulse = 1 + Math.sin(ph * 0.7) * 0.06;
  ctx.fillStyle = ink; ctx.beginPath(); ctx.ellipse(0, -20, 22 * pulse, 13, 0, 0, TAU); ctx.fill();
  for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * 6 - 3, -30); ctx.lineTo(i * 6 - 2, -40 - Math.abs(Math.sin(ph + i)) * 5); ctx.lineTo(i * 6 + 3, -30); ctx.fill(); }
  eyesGlow(ctx, [[9, -25], [16, -24], [13, -29]], mad ? '#ffffff' : '#dcd0ff', 1.8, 'purple');
  ctx.fillStyle = '#cfc6b4'; ctx.beginPath(); ctx.moveTo(2, -17); ctx.quadraticCurveTo(12, mad ? -6 : -11, 22, -18); ctx.quadraticCurveTo(12, -14, 2, -17); ctx.fill();
  ctx.strokeStyle = '#060508'; ctx.lineWidth = 1; ctx.beginPath(); for (let x = 5; x < 21; x += 3) { ctx.moveTo(x, -17); ctx.lineTo(x, -12); } ctx.stroke();
}

// ---------- ボス ----------
function drawBoss(ctx, b, g) {
  if (b.poofed) return;
  if (b.id === 'hydra') return drawHydra(ctx, b, g);
  if (b.id === 'mutant') return drawMutant(ctx, b, g);
  const kit = b.def.kit;
  if (kit === 'surgeon' || kit === 'welder') return drawMan(ctx, b, g, kit);
  if (kit === 'beast' || kit === 'yeti' || kit === 'queen') return drawBeast(ctx, b, g, kit);
  if (kit === 'tank') return drawTank(ctx, b, g);
  if (kit === 'ghoul') return drawGhoulBoss(ctx, b, g);
  if (kit === 'scorpion') return drawScorpBoss(ctx, b, g);
  if (kit === 'heli') return drawHeli(ctx, b, g);
  if (kit === 'final') return (b.phase || 1) === 2 ? drawBeast(ctx, b, g, 'final') : drawMan(ctx, b, g, 'final');
  return drawAgent(ctx, b, g);
}
function drawAgent(ctx, b, g) {
  const flash = b.flashT > 0.06, t = g.time, kit = b.def.kit || 'agent', SC = kit === 'giant' ? 2.4 : kit === 'king' ? 2.1 : 2;
  const giant = kit === 'giant', king = kit === 'king';
  if (king && (b.state === 'float' || b.state === 'phase')) { const a = 0.5 + 0.3 * Math.sin(t * 8); glowAt(ctx, b.x, b.y - 80, 120, 'red', a); ctx.strokeStyle = `rgba(255,60,90,${a * 0.6})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(b.x, b.y - 80, 70 + Math.sin(t * 6) * 6, 0, TAU); ctx.stroke(); }
  ctx.save(); ctx.translate(b.x, b.y);
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.ellipse(0, GROUND - b.y, 25 * SC, 7, 0, 0, TAU); ctx.fill();
  if (b.dead) { ctx.globalAlpha = Math.max(0, 1 - b.t / 2); ctx.rotate(-Math.min(1.4, b.t)); }
  ctx.scale(b.face * SC, SC);
  if (king) {
    // マント（うしろで なびく）
    ctx.fillStyle = flash ? '#fff' : '#2a0610'; ctx.beginPath(); ctx.moveTo(-10, -54); ctx.quadraticCurveTo(-30 - Math.sin(t * 3) * 4, -30, -26 - Math.sin(t * 4) * 5, 0); ctx.lineTo(4, 0); ctx.lineTo(8, -54); ctx.fill();
    ctx.fillStyle = '#4a0c18'; ctx.fillRect(-12, -56, 22, 3);
  }
  const st = b.state, wind = st.endsWith('Wind'), dazed = st === 'dazed' || st === 'down';
  if (st === 'charge') ctx.rotate(0.25);
  if (dazed) ctx.rotate(-0.15);
  const wreck = b.id === 'wreck', arm = flash ? '#fff' : wreck ? '#3a3632' : giant ? '#2a2724' : king ? '#160a10' : '#121316', trim = wreck ? '#8a6a3a' : giant ? '#6a5236' : king ? '#a8823a' : '#5a4e36';
  const sw = Math.abs(b.vx) > 20 && b.onGround ? Math.sin(b.anim * 9) * 9 : 0;
  // ながい コート
  ctx.fillStyle = flash ? '#fff' : '#0d0e10'; ctx.beginPath(); ctx.moveTo(-15, -40); ctx.lineTo(-20 - Math.sin(t * 4) * 2, -4); ctx.lineTo(16, -6); ctx.lineTo(14, -40); ctx.fill();
  limb(ctx, [0, -20, -sw * 0.5, -10, -sw, 0], 9, arm);
  ctx.fillStyle = OUT; roundRect(ctx, -16, -54, 32, 38, 5); ctx.fill();
  ctx.fillStyle = arm; roundRect(ctx, -14, -52, 28, 34, 4); ctx.fill();
  ctx.fillStyle = trim; ctx.fillRect(-14, -40, 28, 2); ctx.fillRect(-3, -52, 2, 34);
  ctx.fillStyle = '#202226'; ctx.fillRect(-18, -54, 10, 9); ctx.fillRect(8, -54, 10, 9);
  limb(ctx, [0, -20, sw * 0.5, -10, sw, 0], 9, arm);
  if (king) { ctx.fillStyle = flash ? '#fff' : '#160a10'; ctx.beginPath(); ctx.moveTo(-15, -40); ctx.lineTo(-18, 0); ctx.lineTo(18, 0); ctx.lineTo(14, -40); ctx.fill(); ctx.fillStyle = trim; ctx.fillRect(-17, -3, 35, 2); }
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(1, -68, 16, 0, TAU); ctx.fill();
  ctx.fillStyle = arm; ctx.beginPath(); ctx.arc(1, -68, 14, 0, TAU); ctx.fill();
  const ec = wind ? '#ff3a2a' : dazed ? '#444' : '#c81e1e';
  if (giant) {
    // てっかめん（びょう と のぞきあな）
    const mg = ctx.createLinearGradient(0, -84, 0, -52); mg.addColorStop(0, flash ? '#fff' : '#7a7e86'); mg.addColorStop(1, flash ? '#fff' : '#33363c');
    ctx.fillStyle = OUT; roundRect(ctx, -12, -85, 30, 34, 6); ctx.fill(); ctx.fillStyle = mg; roundRect(ctx, -10, -83, 26, 30, 5); ctx.fill();
    ctx.fillStyle = '#5a3a26'; ctx.globalAlpha *= 0.5; ctx.fillRect(-6, -62, 8, 6); ctx.globalAlpha = b.dead ? Math.max(0, 1 - b.t / 2) : 1;
    ctx.fillStyle = '#050505'; ctx.fillRect(2, -73, 5, 4); ctx.fillRect(9, -73, 5, 4);
    ctx.fillStyle = ec; ctx.fillRect(3, -72, 3, 2); ctx.fillRect(10, -72, 3, 2); if (!dazed) glowAt(ctx, 8, -71, wind ? 14 : 9, 'red', 1);
    ctx.fillStyle = '#1a1b1e'; for (const [rx, ry] of [[-7, -80], [13, -80], [-7, -57], [13, -57]]) { ctx.beginPath(); ctx.arc(rx, ry, 1.2, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = '#1a1b1e'; ctx.lineWidth = 0.8; ctx.beginPath(); for (let i = 0; i < 4; i++) { ctx.moveTo(4 + i * 3, -64); ctx.lineTo(4 + i * 3, -58); } ctx.stroke();
  } else {
    ctx.fillStyle = '#000'; ctx.fillRect(-1, -71, 16, 7);
    ctx.fillStyle = ec; ctx.fillRect(1, -69, 13, 2.4); if (!dazed) glowAt(ctx, 8, -68, wind ? 14 : 10, 'red', 1);
  }
  if (king) {
    // てつの かんむり（とげ）
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(-14, -78); for (let i = 0; i <= 5; i++) { const x = -14 + i * 6; ctx.lineTo(x, i % 2 ? -88 : -96); ctx.lineTo(x + 3, -80); } ctx.lineTo(18, -78); ctx.fill();
    ctx.fillStyle = flash ? '#fff' : '#8a6a2a'; ctx.beginPath(); ctx.moveTo(-12, -79); for (let i = 0; i <= 5; i++) { const x = -12 + i * 5.4; ctx.lineTo(x, i % 2 ? -87 : -94); ctx.lineTo(x + 2.7, -81); } ctx.lineTo(16, -79); ctx.fill();
    ctx.fillStyle = '#ff2a3a'; ctx.beginPath(); ctx.arc(2, -82, 1.8, 0, TAU); ctx.fill(); glowAt(ctx, 2, -82, 8, 'red', 0.8);
  }
  if (wreck) { ctx.strokeStyle = '#6a3a22'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10, -54); ctx.lineTo(-18, -70); ctx.moveTo(10, -52); ctx.lineTo(20, -66); ctx.moveTo(-4, -86); ctx.lineTo(-8, -98); ctx.stroke(); ctx.fillStyle = '#5a5450'; ctx.beginPath(); ctx.arc(-12, -48, 6, 0, TAU); ctx.arc(10, -24, 5, 0, TAU); ctx.fill(); }
  const aim = st === 'burst' || st === 'burstWind';
  if (aim) { ctx.fillStyle = OUT; ctx.fillRect(10, -50, 30, 11); ctx.fillStyle = '#26282d'; ctx.fillRect(12, -48, 28, 7); ctx.fillStyle = trim; ctx.fillRect(14, -48, 4, 7); if (st === 'burst' && Math.sin(t * 60) > 0) { ctx.fillStyle = '#ffe9a0'; ctx.beginPath(); ctx.arc(43, -45, 5, 0, TAU); ctx.fill(); glowAt(ctx, 43, -45, 30, 'warm', 1); } }
  else if (giant && st === 'throwWind') { glove(ctx, -6, -92, flash ? '#fff' : '#3a3634', 8); ctx.fillStyle = '#4a4440'; ctx.beginPath(); ctx.arc(-6, -104, 11, 0, TAU); ctx.fill(); ctx.fillStyle = '#5e5852'; ctx.beginPath(); ctx.arc(-9, -107, 5, 0, TAU); ctx.fill(); }
  else { const px = st === 'punch' ? 34 : st === 'punchWind' ? -4 : 14; glove(ctx, px, -42, flash ? '#fff' : giant ? '#3a3634' : '#26282d', st === 'punch' ? 9 : 7); }
  glove(ctx, -14, -40, flash ? '#fff' : '#26282d', 6);
  ctx.restore();
  if (dazed) { ctx.fillStyle = '#d8c48a'; for (let i = 0; i < 3; i++) { const a = t * 5 + i * 2.1; ctx.font = '900 14px system-ui'; ctx.textAlign = 'center'; ctx.fillText('★', b.x + Math.cos(a) * 26, b.y - 80 * SC + Math.sin(a) * 6); } }
  if (st.endsWith('Wind') && Math.sin(t * 20) > 0) { ctx.font = '900 22px system-ui'; ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.strokeStyle = OUT; ctx.strokeText('！', b.x, b.y - 83 * SC); ctx.fillStyle = '#e0332a'; ctx.fillText('！', b.x, b.y - 83 * SC); }
}
// どろどろ ミュータント：ふくれた むらさきの かたまり
function drawMutant(ctx, b, g) {
  const flash = b.flashT > 0.06, t = g.time, st = b.state, wind = st.endsWith('Wind'), dazed = st === 'dazed' || st === 'down';
  ctx.save(); ctx.translate(b.x, b.y);
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.ellipse(0, GROUND - b.y, 62, 8, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(120,60,200,0.35)'; ctx.beginPath(); ctx.ellipse(0, GROUND - b.y - 1, 54, 5, 0, 0, TAU); ctx.fill();
  if (b.dead) { ctx.globalAlpha = Math.max(0, 1 - b.t / 2); ctx.scale(1 + b.t * 0.2, 1 - b.t * 0.3); }
  ctx.scale(b.face, 1);
  const br = 1 + Math.sin(t * 3) * 0.03 + (wind ? Math.sin(t * 40) * 0.02 : 0), sq = st === 'slamWind' ? 0.85 : 1;
  const skin = flash ? '#fff' : '#3a2a40', dark = flash ? '#fff' : '#22182a';
  const sw = Math.abs(b.vx) > 20 && b.onGround ? Math.sin(b.anim * 8) * 8 : 0;
  limb(ctx, [-20, -30, -22 - sw * 0.4, -14, -24 - sw, 0], 14, dark); limb(ctx, [20, -30, 22 + sw * 0.4, -14, 24 + sw, 0], 14, dark);
  ctx.save(); ctx.scale(br, br * sq);
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(0, -74, 56, 58, 0, 0, TAU); ctx.fill();
  const bg = ctx.createRadialGradient(-14, -96, 8, 0, -70, 60); bg.addColorStop(0, flash ? '#fff' : '#5a4266'); bg.addColorStop(1, skin);
  ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(0, -74, 53, 55, 0, 0, TAU); ctx.fill();
  // こぶ
  for (const [x, y, r] of [[-34, -110, 16], [30, -116, 13], [-44, -64, 12], [8, -124, 11]]) { ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(x, y, r + 2, 0, TAU); ctx.fill(); ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
  ctx.strokeStyle = flash ? '#fff' : '#8a4ac8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-30, -100); ctx.quadraticCurveTo(-10, -80, -26, -50); ctx.moveTo(20, -110); ctx.quadraticCurveTo(36, -84, 22, -48); ctx.moveTo(-10, -60); ctx.lineTo(4, -54); ctx.stroke();
  // たくさんの め
  const ec = dazed ? '#555' : wind ? '#ffffff' : '#d8b0ff';
  for (const [x, y, r] of [[18, -92, 5], [32, -80, 3.6], [8, -104, 3.2], [36, -98, 2.6], [-30, -112, 2.6]]) { ctx.fillStyle = '#0a060c'; ctx.beginPath(); ctx.arc(x, y, r + 1.5, 0, TAU); ctx.fill(); ctx.fillStyle = ec; ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, TAU); ctx.fill(); if (!dazed) glowAt(ctx, x, y, r * 4, 'purple', 0.9); }
  // くち（ギザギザ）
  const open = st === 'spitWind' ? 14 : st === 'punch' || st === 'slam' ? 8 : 3 + Math.sin(t * 2) * 1.5;
  ctx.fillStyle = '#0a050c'; ctx.beginPath(); ctx.ellipse(22, -60, 22, open, -0.1, 0, TAU); ctx.fill();
  ctx.fillStyle = '#cfc6b8'; for (let i = 0; i < 6; i++) { const x = 4 + i * 7; ctx.beginPath(); ctx.moveTo(x, -60 - open * 0.8); ctx.lineTo(x + 3, -60 - open * 0.8 + 5); ctx.lineTo(x + 6, -60 - open * 0.8); ctx.fill(); }
  // むらさきの よだれ
  const dl = 6 + ((t * 20) % 18);
  ctx.fillStyle = '#9b5bff'; ctx.fillRect(30, -58 + open * 0.6, 3, dl); ctx.beginPath(); ctx.arc(31.5, -58 + open * 0.6 + dl, 3, 0, TAU); ctx.fill();
  ctx.restore();
  // うで
  const px = st === 'punch' ? 74 : st === 'punchWind' ? 10 : 46, py = st === 'punch' ? -64 : -54;
  limb(ctx, [30, -78, (px + 30) / 2, py + 6, px, py], 12, skin);
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(px, py, 15, 0, TAU); ctx.fill(); ctx.fillStyle = dark; ctx.beginPath(); ctx.arc(px, py, 13, 0, TAU); ctx.fill();
  ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.beginPath(); for (let i = -1; i <= 1; i++) { ctx.moveTo(px + 10, py + i * 6); ctx.lineTo(px + 20, py + i * 8); } ctx.stroke();
  limb(ctx, [-30, -78, -46, -56, -40, -36], 11, dark);
  ctx.restore();
  if (dazed) { ctx.fillStyle = '#d8c48a'; for (let i = 0; i < 3; i++) { const a = t * 5 + i * 2.1; ctx.font = '900 14px system-ui'; ctx.textAlign = 'center'; ctx.fillText('★', b.x + Math.cos(a) * 30, b.y - 150 + Math.sin(a) * 6); } }
  if (wind && Math.sin(t * 20) > 0) { ctx.font = '900 22px system-ui'; ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.strokeStyle = OUT; ctx.strokeText('！', b.x, b.y - 150); ctx.fillStyle = '#e0332a'; ctx.fillText('！', b.x, b.y - 150); }
}
function drawHydra(ctx, b, g) {
  const t = g.time, flash = b.flashT > 0.06, rise = b.rise;
  ctx.save(); ctx.translate(b.x, GROUND);
  if (b.dead) { ctx.globalAlpha = Math.max(0, 1 - b.t / 2); ctx.translate(0, b.t * 40); }
  ctx.translate(0, (1 - rise) * 200);
  const kr = b.id === 'kraken', skin = flash ? '#fff' : kr ? '#1a2c2e' : '#211a26', dark = flash ? '#fff' : kr ? '#0a1416' : '#0c0a10';
  // しょくしゅ（たくさん）
  for (let i = 0; i < 7; i++) {
    const bx = -40 + i * 20, sw = Math.sin(t * 2 + i * 1.3) * 20, top = -200 - (i % 3) * 30;
    ctx.strokeStyle = OUT; ctx.lineWidth = 15 - i * 0.8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(bx, -40); ctx.quadraticCurveTo(bx + sw, -140 - i * 8, bx - 30 + sw * 1.5, top + i * 10); ctx.stroke();
    ctx.strokeStyle = i % 2 ? skin : kr ? '#24383a' : '#2a1e33'; ctx.lineWidth = 11 - i * 0.8; ctx.stroke();
    ctx.fillStyle = 'rgba(160,120,170,0.35)'; for (let s = 0.3; s < 0.9; s += 0.2) { const u = 1 - s; const px = u * u * bx + 2 * u * s * (bx + sw) + s * s * (bx - 30 + sw * 1.5), py = u * u * -40 + 2 * u * s * (-140 - i * 8) + s * s * (top + i * 10); ctx.beginPath(); ctx.arc(px + 3, py, 1.6, 0, TAU); ctx.fill(); }
  }
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(10, -60, 82, 72, 0, Math.PI, TAU); ctx.lineTo(92, 0); ctx.lineTo(-72, 0); ctx.fill();
  ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(10, -60, 78, 68, 0, Math.PI, TAU); ctx.lineTo(88, 0); ctx.lineTo(-68, 0); ctx.fill();
  // からだの たくさんの め
  for (let i = 0; i < 7; i++) { const ex = -40 + i * 19, ey = -24 - ((i * 37) % 5) * 12, open = Math.max(0, Math.sin(t * 1.5 + i * 2.2)); if (open < 0.15) continue; ctx.fillStyle = '#d8d0c0'; ctx.beginPath(); ctx.ellipse(ex, ey, 5, 3.6 * open, 0, 0, TAU); ctx.fill(); eyesGlow(ctx, [[ex + 1, ey]], '#d42a1e', 1.6 * open, 'red'); }
  const hy = b.lowered ? -50 : -150 + Math.sin(t * 1.6) * 6, hx = b.lowered ? -60 : -40;
  ctx.strokeStyle = OUT; ctx.lineWidth = 30; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(10, -70); ctx.quadraticCurveTo(-10, -120, hx + 10, hy); ctx.stroke();
  ctx.strokeStyle = skin; ctx.lineWidth = 25; ctx.stroke();
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(hx, hy, 40, 32, -0.15, 0, TAU); ctx.fill();
  ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(hx, hy, 37, 29, -0.15, 0, TAU); ctx.fill();
  const open = b.lowered ? 1 : 0.55 + Math.sin(t * 3) * 0.15;
  ctx.fillStyle = '#d8d0bc'; ctx.beginPath(); ctx.ellipse(hx - 4, hy - 8, 15, 13 * open, 0, 0, TAU); ctx.fill();
  const px = clamp((g.player.x - b.x) / 40, -6, 2);
  eyesGlow(ctx, [[hx - 4 + px, hy - 8]], b.lowered ? '#e8c65a' : '#c81e1e', 5, b.lowered ? 'warm' : 'red');
  ctx.fillStyle = '#000'; ctx.fillRect(hx - 5 + px, hy - 14, 2, 12);
  ctx.fillStyle = '#050307'; ctx.beginPath(); ctx.ellipse(hx - 8, hy + 14, 22, 8 + (b.state === 'spit' ? 6 : 0), 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#cfc8b4';
  for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(hx - 8 + i * 6 - 3, hy + 8); ctx.lineTo(hx - 8 + i * 6, hy + 15); ctx.lineTo(hx - 8 + i * 6 + 3, hy + 8); ctx.fill(); }
  ctx.restore();
  if (b.lowered && !b.dead && Math.sin(t * 8) > 0) { ctx.font = '900 18px system-ui'; ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.strokeStyle = OUT; ctx.strokeText('チャンス！', b.x - 60, GROUND - 120); ctx.fillStyle = '#e8c65a'; ctx.fillText('チャンス！', b.x - 60, GROUND - 120); }
}
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

function drawHazard(ctx, h, g) {
  const t = g.time;
  if (h.kind === 'turret') {
    // かべの きじゅう：あかい ねらいの せん（みどりの ちゅうい）
    const L = g.lock ? g.lock.l : g.camX, R = g.lock ? g.lock.r : g.camX + 667, wx = h.side > 0 ? R - 6 : L + 6, d = h.side > 0 ? -1 : 1;
    ctx.fillStyle = OUT; ctx.fillRect(wx - 10, h.gy - 12, 20, 24); ctx.fillStyle = '#3a3e44'; ctx.fillRect(wx - 8, h.gy - 10, 16, 20);
    ctx.fillStyle = OUT; ctx.fillRect(Math.min(wx, wx + d * 26), h.gy - 4, 26, 8); ctx.fillStyle = '#2a2c30'; ctx.fillRect(Math.min(wx, wx + d * 24), h.gy - 2.5, 24, 5);
    if (h.warn > 0) {
      const a = 0.35 + Math.sin(t * 30) * 0.3;
      ctx.strokeStyle = `rgba(255,220,80,${a})`; ctx.lineWidth = 1.5; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.moveTo(wx, h.gy); ctx.lineTo(wx + d * 900, h.gy); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = `rgba(255,220,80,${a * 0.18})`; ctx.fillRect(h.x, h.gy - 14, h.w, 28);
      ctx.font = '900 14px system-ui'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = OUT; const lab = h.gy > GROUND - 30 ? 'ジャンプ！' : 'しゃがめ！';
      ctx.strokeText(lab, wx + d * 70, h.gy - 18); ctx.fillStyle = '#ffd84a'; ctx.fillText(lab, wx + d * 70, h.gy - 18);
    }
    glowAt(ctx, wx + d * 26, h.gy, 14, h.warn > 0 ? 'warm' : 'red', 0.9);
    return;
  }
  if (h.kind === 'rubble') {
    const cx = h.x + h.w / 2;
    if (h.warn > 0) {
      const a = 0.3 + Math.sin(t * 26) * 0.2, k = 1 - h.warn;
      ctx.fillStyle = `rgba(0,0,0,${0.3 + k * 0.4})`; ctx.beginPath(); ctx.ellipse(cx, GROUND - 2, 20 + k * 20, 5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = `rgba(160,150,140,${a})`; for (let i = 0; i < 4; i++) ctx.fillRect(cx - 20 + ((i * 13 + t * 40) % 40), ((t * 260 + i * 70) % (GROUND - 20)), 2, 3);
      ctx.font = '900 14px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd84a'; ctx.fillText('！', cx, GROUND - 16);
    } else {
      const pf = Math.min(1, Math.max(0, 0.3 - h.life) / 0.1), y = -40 + pf * (GROUND - 30 + 40);
      for (const [ox, oy, r] of [[-14, -10, 14], [10, -8, 12], [0, -24, 11], [18, -20, 8]]) { ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(cx + ox, y + oy + 18, r + 2, 0, TAU); ctx.fill(); ctx.fillStyle = '#5a5450'; ctx.beginPath(); ctx.arc(cx + ox, y + oy + 18, r, 0, TAU); ctx.fill(); }
      ctx.strokeStyle = '#7a6a5a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 20, y - 6); ctx.lineTo(cx + 24, y + 6); ctx.stroke();
      if (pf >= 1) { ctx.fillStyle = 'rgba(160,150,140,0.4)'; ctx.beginPath(); ctx.ellipse(cx, GROUND - 4, 46, 9, 0, 0, TAU); ctx.fill(); }
    }
    return;
  }
  if (h.kind === 'bolt') {
    const cx = h.x + h.w / 2;
    if (h.warn > 0) {
      const a = 0.3 + Math.sin(t * 34) * 0.25;
      ctx.strokeStyle = `rgba(170,210,255,${a})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, GROUND - 2, 26, 6, 0, 0, TAU); ctx.stroke();
      ctx.fillStyle = `rgba(170,210,255,${a * 0.25})`; ctx.fillRect(h.x, 0, h.w, GROUND);
      ctx.font = '900 14px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#cfe4ff'; ctx.fillText('！', cx, GROUND - 14);
      glowAt(ctx, cx, GROUND - 4, 30, 'cold', a);
    } else {
      const a = Math.min(1, h.life * 4);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const [w, c] of [[9, `rgba(140,185,255,${0.5 * a})`], [3, `rgba(255,255,255,${a})`]]) {
        ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); let x = cx + (hash(Math.floor(t * 20)) - 0.5) * 30; ctx.moveTo(x, -10);
        for (let y = 20; y <= GROUND; y += 28) { x = cx + (hash(Math.floor(t * 20) + y) - 0.5) * 34; ctx.lineTo(x, Math.min(GROUND, y)); }
        ctx.stroke();
      }
      const cam = g.vx ?? g.camX; for (let y = 60; y < GROUND; y += 90) LIGHTS.push(cx - cam, y, 160, a);
      glowAt(ctx, cx, GROUND - 6, 60, 'cold', a);
    }
    return;
  }
  if (h.kind === 'blast') {
    const a = Math.max(0, h.life / 0.25), cx = h.x + h.w / 2, cy = GROUND - 30;
    ctx.fillStyle = `rgba(255,170,60,${0.7 * a})`; ctx.beginPath(); ctx.arc(cx, cy, 30 + (1 - a) * 30, 0, TAU); ctx.fill();
    ctx.fillStyle = `rgba(255,240,180,${a})`; ctx.beginPath(); ctx.arc(cx, cy, 16 + (1 - a) * 12, 0, TAU); ctx.fill();
    glowAt(ctx, cx, cy, 90, 'ember', a); LIGHTS.push(cx - (g.vx ?? g.camX), cy, 200, a);
    return;
  }
  if (h.kind === 'flame') {
    const a = Math.min(1, h.life * 3), d = h.face || 1, x0 = d > 0 ? h.x : h.x + h.w, cy = h.y + h.h / 2;
    for (let i = 0; i < 9; i++) { const k = ((t * 3 + i / 9) % 1), x = x0 + d * k * h.w, r = 8 + k * 22; ctx.fillStyle = `rgba(255,${200 - k * 130},${80 - k * 60},${(1 - k) * 0.85 * a})`; ctx.beginPath(); ctx.arc(x, cy + Math.sin(i * 2 + t * 20) * k * 10, r, 0, TAU); ctx.fill(); }
    ctx.fillStyle = `rgba(255,250,220,${a})`; ctx.beginPath(); ctx.ellipse(x0 + d * 16, cy, 18, 6, 0, 0, TAU); ctx.fill();
    glowAt(ctx, x0 + d * h.w / 2, cy, 90, 'ember', a); LIGHTS.push(x0 + d * h.w / 2 - (g.vx ?? g.camX), cy, 180, a);
    return;
  }
  if (h.kind === 'mark') {
    const k = Math.max(0, h.warn), cx = h.x + h.w / 2, a = 0.5 + Math.sin(t * 24) * 0.3;
    ctx.strokeStyle = `rgba(255,200,80,${a})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, GROUND - 2, 16 + k * 30, 5 + k * 4, 0, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 10, GROUND - 2); ctx.lineTo(cx + 10, GROUND - 2); ctx.stroke();
    return;
  }
  if (h.kind === 'gas') {
    // むらさきの ガス（もくもく）
    const w = h.warn > 0, a = w ? 0.25 + Math.sin(t * 30) * 0.15 : Math.min(1, h.life * 1.5) * 0.55;
    for (let i = 0; i < 7; i++) { const px = h.x + 10 + (i * 37) % (h.w - 20), py = GROUND - 14 - ((i * 23) % 36) - Math.sin(t * 2 + i) * 4, r = (w ? 10 : 20) + Math.sin(t * 3 + i * 2) * 4; ctx.fillStyle = `rgba(150,90,200,${a})`; ctx.beginPath(); ctx.arc(px, py, r, 0, TAU); ctx.fill(); }
    glowAt(ctx, h.x + h.w / 2, GROUND - 24, 60, 'purple', a * 0.8);
    return;
  }
  if (h.kind === 'acid') {
    const a = h.warn > 0 ? 0.4 : Math.min(1, h.life * 2);
    ctx.globalAlpha = a; ctx.fillStyle = '#5a2a8a'; ctx.beginPath(); ctx.ellipse(h.x + h.w / 2, GROUND - 2, h.w / 2, 5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#9b5bff'; ctx.beginPath(); ctx.ellipse(h.x + h.w / 2, GROUND - 3, h.w / 2 - 6, 3, 0, 0, TAU); ctx.fill();
    for (let i = 0; i < 4; i++) { const ph = (t * 1.5 + i * 0.27) % 1; ctx.strokeStyle = '#d8b0ff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(h.x + 10 + i * (h.w - 20) / 3, GROUND - 4 - ph * 6, 2 + ph * 2, 0, TAU); ctx.stroke(); }
    glowAt(ctx, h.x + h.w / 2, GROUND - 4, h.w * 0.6, 'purple', 0.5 * a); ctx.globalAlpha = 1;
    return;
  }
  if (h.kind === 'trolley') {
    if (h.warn > 0) return;
    // さびた トロッコ ×3（まえに あかり）
    for (let c = 0; c < 3; c++) {
      const x = h.x + c * 140, y = GROUND - 44;
      ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(x - 2, y - 2); ctx.lineTo(x + 132, y - 2); ctx.lineTo(x + 124, y + 34); ctx.lineTo(x + 6, y + 34); ctx.fill();
      const tg = ctx.createLinearGradient(0, y, 0, y + 32); tg.addColorStop(0, '#6a4a32'); tg.addColorStop(1, '#3a281c'); ctx.fillStyle = tg;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 130, y); ctx.lineTo(x + 122, y + 32); ctx.lineTo(x + 8, y + 32); ctx.fill();
      ctx.fillStyle = '#2a1c14'; for (let r = x + 16; r < x + 120; r += 26) ctx.fillRect(r, y + 2, 3, 28);
      ctx.fillStyle = '#8a6a4a'; ctx.fillRect(x, y, 130, 3);
      ctx.fillStyle = '#1a1310'; ctx.fillRect(x + 10, y - 10, 110, 10); ctx.fillStyle = '#2a2420'; for (let r = 0; r < 5; r++) { ctx.beginPath(); ctx.arc(x + 22 + r * 22, y - 6, 7, Math.PI, 0); ctx.fill(); }
      for (const wx of [x + 28, x + 102]) { const ra = -t * 30; ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(wx, GROUND - 8, 9, 0, TAU); ctx.fill(); ctx.fillStyle = '#4a4e56'; ctx.beginPath(); ctx.arc(wx, GROUND - 8, 7, 0, TAU); ctx.fill(); ctx.strokeStyle = '#1a1b1e'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(wx + Math.cos(ra) * 7, GROUND - 8 + Math.sin(ra) * 7); ctx.lineTo(wx - Math.cos(ra) * 7, GROUND - 8 - Math.sin(ra) * 7); ctx.stroke(); if (Math.random() < 0.5) { ctx.fillStyle = '#ffd38a'; ctx.fillRect(wx + 4, GROUND - 2, 6, 1.5); } }
      if (c < 2) { ctx.fillStyle = OUT; ctx.fillRect(x + 128, y + 22, 14, 4); }
    }
    ctx.fillStyle = '#fff6c0'; ctx.beginPath(); ctx.arc(h.x + 2, GROUND - 30, 5, 0, TAU); ctx.fill(); glowAt(ctx, h.x - 8, GROUND - 30, 80, 'warm', 1); LIGHTS.push(h.x - 40 - (g.vx ?? g.camX), GROUND - 30, 180, 0.9);
    return;
  }
  if (h.kind === 'wave') {
    const wc = h.color || '#c06bff';
    ctx.globalAlpha = 0.8; ctx.fillStyle = wc; ctx.beginPath(); ctx.moveTo(h.x, GROUND); ctx.quadraticCurveTo(h.x + h.w / 2, GROUND - h.h * 2, h.x + h.w, GROUND); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(110,40,150,0.0)'; ctx.beginPath(); ctx.moveTo(h.x, GROUND); ctx.quadraticCurveTo(h.x + h.w / 2, GROUND - h.h * 2, h.x + h.w, GROUND); ctx.fill();
    ctx.fillStyle = '#f0dcf4'; ctx.beginPath(); ctx.moveTo(h.x + 6, GROUND); ctx.quadraticCurveTo(h.x + h.w / 2, GROUND - h.h, h.x + h.w - 6, GROUND); ctx.fill();
    glowAt(ctx, h.x + h.w / 2, GROUND - h.h * 0.6, 40, wc === '#ff4a6a' ? 'red' : 'purple', 0.7);
  } else if (h.kind === 'sweepWarn') {
    if (Math.sin(t * 24) > 0) { ctx.fillStyle = 'rgba(220,30,30,0.22)'; ctx.fillRect(h.x, h.y, h.w, h.h); ctx.font = '900 16px system-ui'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = OUT; ctx.strokeText('ジャンプ！', h.x + h.w / 2, h.y - 8); ctx.fillStyle = '#ff6a5a'; ctx.fillText('ジャンプ！', h.x + h.w / 2, h.y - 8); }
  } else if (h.kind === 'sweep') {
    const ex = g.boss ? g.boss.x - 60 : h.x + 300;
    ctx.strokeStyle = OUT; ctx.lineWidth = 24; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ex, GROUND - 14); ctx.lineTo(h.x, GROUND - 14); ctx.stroke();
    ctx.strokeStyle = '#2a1e33'; ctx.lineWidth = 18; ctx.stroke();
    ctx.fillStyle = 'rgba(160,120,170,0.5)'; for (let x = h.x + 10; x < ex; x += 26) { ctx.beginPath(); ctx.arc(x, GROUND - 10, 3, 0, TAU); ctx.fill(); }
  } else if (h.kind === 'spike') {
    if (h.warn > 0) {
      const a = 0.4 + Math.sin(t * 30) * 0.3; ctx.fillStyle = h.look === 'ice' ? `rgba(150,210,255,${a})` : h.look === 'root' ? `rgba(120,160,60,${a})` : h.look === 'sand' ? `rgba(200,160,100,${a})` : `rgba(150,60,210,${a})`; ctx.beginPath(); ctx.ellipse(h.x + h.w / 2, GROUND - 2, h.w / 2 + 6, 6, 0, 0, TAU); ctx.fill();
      glowAt(ctx, h.x + h.w / 2, GROUND - 4, 30, h.look === 'sand' ? 'warm' : 'purple', a);
      ctx.fillStyle = '#e0b0ff'; ctx.font = '900 14px system-ui'; ctx.textAlign = 'center'; ctx.fillText('！', h.x + h.w / 2, GROUND - 14);
    } else {
      const up = Math.min(1, (0.6 - h.life) * 8 + 0.2), hh = h.h * Math.max(0.2, Math.min(1, h.life * 3)) * up;
      ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(h.x, GROUND); ctx.lineTo(h.x + h.w * 0.3, GROUND - hh * 0.7); ctx.lineTo(h.x + h.w * 0.5, GROUND - hh); ctx.lineTo(h.x + h.w * 0.7, GROUND - hh * 0.75); ctx.lineTo(h.x + h.w, GROUND); ctx.fill();
      ctx.fillStyle = h.look === 'ice' ? '#a8d8f0' : h.look === 'root' ? '#4a3a28' : h.look === 'sand' ? '#3c2c22' : '#2a1e33'; ctx.beginPath(); ctx.moveTo(h.x + 5, GROUND); ctx.lineTo(h.x + h.w * 0.5, GROUND - hh + 6); ctx.lineTo(h.x + h.w - 5, GROUND); ctx.fill();
      if (h.look === 'sand') { ctx.fillStyle = '#9ad060'; ctx.beginPath(); ctx.moveTo(h.x + h.w * 0.42, GROUND - hh + 12); ctx.lineTo(h.x + h.w * 0.5, GROUND - hh - 4); ctx.lineTo(h.x + h.w * 0.58, GROUND - hh + 12); ctx.fill(); ctx.fillStyle = 'rgba(176,138,90,0.9)'; ctx.beginPath(); ctx.ellipse(h.x + h.w / 2, GROUND - 1, h.w / 2 + 8, 5, 0, Math.PI, TAU); ctx.fill(); }
    }
  }
}
function drawBullet(ctx, b) {
  if (b.w === 'ice' || b.w === 'car') {
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate((b.rot || 0) + b.x * 0.03);
    if (b.w === 'ice') { ctx.fillStyle = OUT; ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU, r = b.r * (i % 2 ? 0.8 : 1.15) + 2; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.fill(); ctx.fillStyle = '#a8d8f0'; ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU, r = b.r * (i % 2 ? 0.8 : 1.15); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.fill(); ctx.fillStyle = '#eaf8ff'; ctx.beginPath(); ctx.arc(-3, -4, b.r * 0.35, 0, TAU); ctx.fill(); ctx.restore(); glowAt(ctx, b.x, b.y, 30, 'cold', 0.6); return; }
    // こわれた くるま（マークなし）
    ctx.fillStyle = OUT; roundRect(ctx, -24, -11, 48, 22, 6); ctx.fill(); ctx.fillStyle = '#4a5a6a'; roundRect(ctx, -22, -9, 44, 18, 5); ctx.fill();
    ctx.fillStyle = '#1c2a30'; ctx.fillRect(-12, -8, 10, 6); ctx.fillRect(2, -8, 10, 6); ctx.fillStyle = 'rgba(90,50,30,0.6)'; ctx.fillRect(-18, 2, 14, 4);
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(-13, 10, 5, 0, TAU); ctx.arc(13, 10, 5, 0, TAU); ctx.fill();
    ctx.restore(); return;
  }
  if (b.owner === 'e' && b.w === 'knife') {
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.vy, b.vx));
    ctx.fillStyle = '#d8dce0'; ctx.beginPath(); ctx.moveTo(-6, -1.6); ctx.lineTo(8, 0); ctx.lineTo(-6, 1.6); ctx.fill(); ctx.fillStyle = '#4a4e54'; ctx.fillRect(-12, -1.4, 6, 2.8);
    ctx.strokeStyle = 'rgba(220,230,240,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(-12, 0); ctx.stroke();
    ctx.restore(); glowAt(ctx, b.x, b.y, 10, 'white', 0.5); return;
  }
  if (b.owner === 'e' && (b.w === 'shell' || b.w === 'bomb')) {
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.vy, b.vx));
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(0, 0, b.r * 1.4, b.r * 0.85, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = b.w === 'bomb' ? '#3e4636' : '#5a5e52'; ctx.beginPath(); ctx.ellipse(0, 0, b.r * 1.2, b.r * 0.65, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#e8c03a'; ctx.fillRect(-b.r * 0.2, -b.r * 0.65, 2, b.r * 1.3);
    ctx.restore();
    if (Math.sin(b.x * 0.3) > 0) { ctx.fillStyle = 'rgba(255,170,60,0.8)'; ctx.beginPath(); ctx.arc(b.x - b.vx * 0.02, b.y - b.vy * 0.02, 3, 0, TAU); ctx.fill(); }
    glowAt(ctx, b.x, b.y, 22, 'ember', 0.6); return;
  }
  if (b.w === 'beam') {
    // エネルギー の たま（あおじろい）
    ctx.strokeStyle = 'rgba(110,220,255,0.55)'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(b.x - b.vx * 0.022, b.y - b.vy * 0.022); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.strokeStyle = '#eaffff'; ctx.lineWidth = 2.4; ctx.stroke();
    glowAt(ctx, b.x, b.y, 22, 'cold', 0.9); return;
  }
  if (b.w === 'minigun') {
    if (b.tr) { ctx.strokeStyle = 'rgba(255,200,110,0.95)'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(b.x - b.vx * 0.04, b.y - b.vy * 0.04); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.strokeStyle = '#fff6d0'; ctx.lineWidth = 1.2; ctx.stroke(); glowAt(ctx, b.x, b.y, 16, 'warm', 0.8); return; }
    ctx.strokeStyle = 'rgba(255,236,170,0.8)'; ctx.lineWidth = 1.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(b.x - b.vx * 0.014, b.y - b.vy * 0.014); ctx.lineTo(b.x, b.y); ctx.stroke(); return;
  }
  if (b.w === 'rock') {
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate((b.rot || 0) + b.x * 0.03);
    ctx.fillStyle = OUT; ctx.beginPath(); for (let i = 0; i < 7; i++) { const a = i / 7 * TAU, r = b.r * (0.85 + hash(i + 7) * 0.3) + 2; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.fill();
    ctx.fillStyle = '#4a4440'; ctx.beginPath(); for (let i = 0; i < 7; i++) { const a = i / 7 * TAU, r = b.r * (0.85 + hash(i + 7) * 0.3); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.fill();
    ctx.fillStyle = '#6a625a'; ctx.beginPath(); ctx.arc(-3, -4, b.r * 0.4, 0, TAU); ctx.fill(); ctx.strokeStyle = '#2a2624'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-6, 2); ctx.lineTo(2, 5); ctx.lineTo(6, -2); ctx.stroke();
    ctx.restore(); return;
  }
  if (b.owner === 'e' && b.acid) {
    ctx.fillStyle = '#5a2a8a'; ctx.beginPath(); ctx.ellipse(b.x, b.y, b.r * 1.4, b.r * 1.1, Math.atan2(b.vy, b.vx), 0, TAU); ctx.fill();
    ctx.fillStyle = '#b07aff'; ctx.beginPath(); ctx.arc(b.x - 2, b.y - 2, b.r * 0.6, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(155,91,255,0.6)'; ctx.beginPath(); ctx.arc(b.x - b.vx * 0.02, b.y - b.vy * 0.02, b.r * 0.6, 0, TAU); ctx.fill();
    glowAt(ctx, b.x, b.y, b.r * 4, 'purple', 0.8); return;
  }
  if (b.owner === 'e' && b.w === 'tracer') {
    ctx.strokeStyle = 'rgba(255,226,140,0.95)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(b.x - b.vx * 0.03, b.y - b.vy * 0.03); ctx.lineTo(b.x, b.y); ctx.stroke();
    glowAt(ctx, b.x, b.y, 10, 'warm', 0.7); return;
  }
  if (b.owner === 'e') {
    ctx.fillStyle = b.w === 'blob' ? '#8a3ad8' : '#c050f0'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 1.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f4e8ff'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.7, 0, TAU); ctx.fill();
    glowAt(ctx, b.x, b.y, b.r * 5, 'purple', 0.9);
    return;
  }
  if (b.w === 'bazooka') { ctx.fillStyle = OUT; ctx.fillRect(b.x - 9, b.y - 4, 18, 8); ctx.fillStyle = '#8a8060'; ctx.fillRect(b.x - 7, b.y - 2, 14, 4); ctx.fillStyle = 'rgba(255,150,50,0.85)'; ctx.beginPath(); ctx.arc(b.x - Math.sign(b.vx) * 12, b.y, 4 + Math.random() * 3, 0, TAU); ctx.fill(); glowAt(ctx, b.x - Math.sign(b.vx) * 12, b.y, 30, 'ember', 0.8); return; }
  const len = b.w === 'shotgun' ? 0.012 : 0.022;
  ctx.strokeStyle = b.owner === 'a' ? 'rgba(170,200,230,0.9)' : 'rgba(255,236,170,0.95)'; ctx.lineWidth = b.w === 'rifle' ? 2.6 : 1.8; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(b.x - b.vx * len, b.y - b.vy * len); ctx.lineTo(b.x, b.y); ctx.stroke();
}
function drawPart(ctx, q) {
  const a = Math.max(0, q.life / q.max);
  switch (q.kind) {
    case 'blood': ctx.fillStyle = q.color; ctx.beginPath(); ctx.arc(q.x, q.y, q.size * (0.6 + a * 0.4), 0, TAU); ctx.fill(); break;
    case 'smoke': ctx.globalAlpha = a * 0.8; ctx.fillStyle = q.color; ctx.beginPath(); ctx.arc(q.x, q.y, q.size, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; break;
    case 'fire': ctx.globalAlpha = a; ctx.fillStyle = q.color; ctx.beginPath(); ctx.arc(q.x, q.y, q.size * a, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; break;
    case 'spark': ctx.strokeStyle = q.color; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - q.vx * 0.03, q.y - q.vy * 0.03); ctx.stroke(); break;
    case 'shell': {
      // やっきょう：きんぞくの つや と くろい くち（ショットガンは あおい からだ）
      const L = q.size || 5, sg = q.w === 'shotgun';
      ctx.save(); ctx.translate(q.x, q.y); ctx.rotate((q.rot || 0) + (q.max - q.life) * (q.spin || 14)); ctx.globalAlpha = Math.min(1, a * 3);
      if (sg) { ctx.fillStyle = '#2f4f86'; ctx.fillRect(-L / 2, -1.8, L * 0.72, 3.6); ctx.fillStyle = '#c8a24a'; ctx.fillRect(L * 0.22, -1.8, L * 0.28, 3.6); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-L / 2, -1.8, L, 0.8); }
      else { ctx.fillStyle = q.color || '#c8a24a'; ctx.fillRect(-L / 2, -1.1, L, 2.2); ctx.fillStyle = '#fff2b0'; ctx.fillRect(-L / 2, -1.1, L, 0.7); ctx.fillStyle = '#3a2a10'; ctx.fillRect(L / 2 - 0.8, -1.1, 0.8, 2.2); }
      ctx.restore(); ctx.globalAlpha = 1; break;
    }
    case 'chunk': ctx.fillStyle = q.color; ctx.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size); break;
    case 'dust': ctx.globalAlpha = a * 0.5; ctx.fillStyle = q.color; ctx.beginPath(); ctx.arc(q.x, q.y, q.size * (1.5 - a * 0.5), 0, TAU); ctx.fill(); ctx.globalAlpha = 1; break;
    case 'ring': ctx.globalAlpha = a; ctx.strokeStyle = q.color; ctx.lineWidth = 3 * a + 1; ctx.beginPath(); ctx.arc(q.x, q.y, q.size * (1.2 - a * 0.8), 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; break;
    case 'star': ctx.fillStyle = q.color; ctx.font = `900 ${Math.round(q.size * 2)}px system-ui`; ctx.textAlign = 'center'; ctx.fillText('★', q.x, q.y); break;
    case 'muzzle': {
      const s = q.size, f = q.face, sd = q.seed || 0.5, st = q.style;
      if (st) {
        ctx.save(); ctx.translate(q.x, q.y); ctx.scale(f, 1);
        glowAt(ctx, 0, 0, s * (st === 'shotgun' || st === 'bazooka' ? 5 : 3.5), st === 'beam' ? 'cold' : 'warm', a);
        ctx.globalAlpha = Math.min(1, a * 1.4);
        if (st === 'beam') {
          ctx.fillStyle = '#9ff0ff'; ctx.beginPath(); ctx.arc(s * 0.4, 0, s * 0.8, 0, TAU); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(s * 0.4, 0, s * 0.35, 0, TAU); ctx.fill();
          ctx.strokeStyle = 'rgba(160,240,255,0.8)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(s * 0.4, 0, s * 0.4, s * 1.1, 0, 0, TAU); ctx.stroke();
        } else if (st === 'rifle') {
          // フラッシュハイダー：ほしがた に ひろがる
          ctx.fillStyle = '#ffd27a'; for (let i = 0; i < 4; i++) { const an = (i - 1.5) * 0.5 + (sd - 0.5) * 0.2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(an - 0.12) * s * 1.6, Math.sin(an - 0.12) * s * 1.6); ctx.lineTo(Math.cos(an + 0.12) * s * 1.6, Math.sin(an + 0.12) * s * 1.6); ctx.fill(); }
          ctx.fillStyle = '#fff6d0'; ctx.beginPath(); ctx.ellipse(s * 0.5, 0, s * 0.7, s * 0.22, 0, 0, TAU); ctx.fill();
        } else if (st === 'shotgun') {
          ctx.fillStyle = '#ffb04a'; ctx.beginPath(); ctx.moveTo(-2, -s * 0.5); ctx.quadraticCurveTo(s * 1.4, -s * 0.9, s * 2.2, 0); ctx.quadraticCurveTo(s * 1.4, s * 0.9, -2, s * 0.5); ctx.fill();
          ctx.fillStyle = '#fff3a0'; ctx.beginPath(); ctx.ellipse(s * 0.8, 0, s * 0.9, s * 0.35, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(160,150,140,0.5)'; ctx.beginPath(); ctx.arc(s * 2.2, -3, s * 0.5 * (1.5 - a), 0, TAU); ctx.fill();
        } else if (st === 'bazooka' || st === 'back') {
          ctx.fillStyle = st === 'back' ? '#ffd27a' : '#ff9a3a'; ctx.beginPath(); ctx.arc(s * 0.6, 0, s * 0.9, 0, TAU); ctx.fill();
          ctx.fillStyle = '#fff3a0'; ctx.beginPath(); ctx.arc(s * 0.4, 0, s * 0.45, 0, TAU); ctx.fill();
        } else {
          // ピストル / SMG：ちいさい ほのお（ランダムに かたち が かわる）
          const k = st === 'smg' ? 1.2 : 1;
          ctx.fillStyle = '#ffc860'; ctx.beginPath(); ctx.moveTo(-2, -s * 0.35); ctx.lineTo(s * (1 + sd * 0.6) * k, -s * 0.1); ctx.lineTo(s * 1.4 * k, 0); ctx.lineTo(s * (1 + (1 - sd) * 0.6) * k, s * 0.1); ctx.lineTo(-2, s * 0.35); ctx.fill();
          ctx.beginPath(); ctx.moveTo(s * 0.2, -s * 0.7); ctx.lineTo(s * 0.5, 0); ctx.lineTo(s * 0.2, s * 0.7); ctx.fill();
          ctx.fillStyle = '#fff8d8'; ctx.beginPath(); ctx.arc(s * 0.2, 0, s * 0.3, 0, TAU); ctx.fill();
        }
        ctx.restore(); ctx.globalAlpha = 1; break;
      }
      ctx.fillStyle = q.color; ctx.beginPath();
      ctx.moveTo(q.x - q.face * 4, q.y - s * 0.45); ctx.lineTo(q.x + q.face * s * 1.3, q.y); ctx.lineTo(q.x - q.face * 4, q.y + s * 0.45); ctx.fill();
      ctx.beginPath(); ctx.moveTo(q.x, q.y - s * 0.8); ctx.lineTo(q.x + q.face * s * 0.5, q.y); ctx.lineTo(q.x, q.y + s * 0.8); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(q.x, q.y, s * 0.3, 0, TAU); ctx.fill(); break;
    }
  }
}
function drawSplat(ctx, s) {
  const a = Math.min(1, s.life / 2);
  ctx.globalAlpha = a * 0.85; ctx.fillStyle = s.color;
  if (s.wall) {
    ctx.beginPath(); ctx.ellipse(s.x, s.y, 5 + s.r * 0.4, s.r, 0, 0, TAU); ctx.fill();
    const drip = Math.min(1, (30 - s.life) * 0.5 + 0.3);
    ctx.fillRect(s.x - 1.5, s.y, 3, s.r * 2.6 * drip); ctx.fillRect(s.x + s.r * 0.4 * (s.seed - 0.3), s.y, 2, s.r * 1.6 * drip);
    ctx.beginPath(); ctx.arc(s.x + (s.seed - 0.5) * 18, s.y - 6, 2, 0, TAU); ctx.arc(s.x - 9, s.y + 4, 1.5, 0, TAU); ctx.fill();
  } else {
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
  ctx.lineWidth = Math.max(3, t.size / 4.5); ctx.strokeStyle = '#000'; ctx.strokeText(t.text, 0, 0); ctx.fillStyle = t.color; ctx.fillText(t.text, 0, 0);
  ctx.restore();
}

// ---------- v0.6.0：あたらしい しかけ・ビーム・ボス ----------
function drawConveyors(ctx, g) {
  const C = g.stage.conveyors; if (!C) return;
  const t = g.time;
  for (const [x, w, dir] of C) {
    const y = GROUND - 2;
    ctx.fillStyle = OUT; ctx.fillRect(x - 3, y - 3, w + 6, 12);
    ctx.fillStyle = '#26282c'; ctx.fillRect(x, y - 1, w, 8);
    ctx.fillStyle = '#3c3f44'; const off = ((t * 90 * dir) % 18 + 18) % 18;
    for (let i = -18; i < w; i += 18) { const px = x + i + off; if (px < x || px > x + w - 6) continue; ctx.fillRect(px, y - 1, 6, 8); }
    ctx.fillStyle = '#b89a3a'; for (let i = 20; i < w - 10; i += 60) { const ax = x + i; ctx.beginPath(); ctx.moveTo(ax + dir * 7, y + 3); ctx.lineTo(ax - dir * 3, y - 0.5); ctx.lineTo(ax - dir * 3, y + 6.5); ctx.fill(); }
    for (const rx of [x + 4, x + w - 4]) { ctx.fillStyle = '#4a4d52'; ctx.beginPath(); ctx.arc(rx, y + 3, 5, 0, TAU); ctx.fill(); }
  }
}
function drawGoo(ctx, g) {
  const G = g.stage.goo; if (!G) return;
  const t = g.time;
  for (const [x, w] of G) {
    ctx.fillStyle = '#3a1a5a'; ctx.beginPath(); ctx.ellipse(x + w / 2, GROUND + 1, w / 2 + 6, 7, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#6a2fa8'; ctx.beginPath(); ctx.ellipse(x + w / 2, GROUND, w / 2, 4.5, 0, 0, TAU); ctx.fill();
    for (let i = 0; i < 5; i++) { const ph = (t * 0.9 + i * 0.37) % 1, bx = x + 12 + ((i * 53) % Math.max(20, w - 24)); ctx.strokeStyle = `rgba(210,160,255,${0.7 * (1 - ph)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(bx, GROUND - 1 - ph * 5, 1.5 + ph * 3, 0, TAU); ctx.stroke(); }
    glowAt(ctx, x + w / 2, GROUND, w * 0.55, 'purple', 0.35);
  }
}
function drawPresses(ctx, g, cam) {
  const Pz = g.stage.presses; if (!Pz) return;
  for (const pr of Pz) {
    const x = pr[0]; if (x < cam - 120 || x > cam + 900) continue;
    const s = pressState(pr, g.time), top = GROUND - 110 - 150, bot = top + 150 * s.down + 30;
    ctx.fillStyle = '#17181b'; ctx.fillRect(x - 10, -10, 20, bot - 30 + 10);
    ctx.fillStyle = '#2c2f34'; ctx.fillRect(x - 6, -10, 4, bot - 30 + 10);
    ctx.fillStyle = OUT; ctx.fillRect(x - 38, bot - 34, 76, 48);
    const pg = ctx.createLinearGradient(0, bot - 32, 0, bot + 12); pg.addColorStop(0, '#5a5e64'); pg.addColorStop(1, '#2a2c30'); ctx.fillStyle = pg; ctx.fillRect(x - 36, bot - 32, 72, 44);
    ctx.fillStyle = s.warn && Math.sin(g.time * 30) > 0 ? '#e8c03a' : '#7a6420';
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(x - 36 + i * 12, bot + 12); ctx.lineTo(x - 30 + i * 12, bot + 12); ctx.lineTo(x - 36 + i * 12 + 12, bot + 2); ctx.lineTo(x - 36 + i * 12 + 6, bot + 2); ctx.fill(); }
    if (s.warn) {
      const a = 0.35 + Math.sin(g.time * 30) * 0.25;
      ctx.fillStyle = `rgba(232,192,58,${a * 0.35})`; ctx.fillRect(x - 36, bot + 12, 72, GROUND - bot - 12);
      ctx.fillStyle = `rgba(232,192,58,${a})`; ctx.fillRect(x - 36, GROUND - 3, 72, 3);
      ctx.font = '900 16px system-ui'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = OUT; ctx.strokeText('！', x, GROUND - 20); ctx.fillStyle = '#ffd84a'; ctx.fillText('！', x, GROUND - 20);
      glowAt(ctx, x, bot + 8, 30, 'warm', a);
    }
    if (s.hit) { ctx.fillStyle = 'rgba(200,190,170,0.4)'; ctx.beginPath(); ctx.ellipse(x, GROUND - 3, 60, 8, 0, 0, TAU); ctx.fill(); }
  }
}
function drawBeams(ctx, g, cam) {
  for (const bm of g.beams) {
    const a = Math.max(0, bm.life / bm.max), y = bm.y, x0 = bm.x0, x1 = bm.x1, w = 30 * (0.4 + a * 0.6);
    ctx.lineCap = 'round';
    ctx.strokeStyle = `rgba(90,200,255,${0.35 * a})`; ctx.lineWidth = w * 1.6; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
    ctx.strokeStyle = `rgba(140,235,255,${0.85 * a})`; ctx.lineWidth = w * 0.8; ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = w * 0.3; ctx.stroke();
    // うねる ふち
    ctx.strokeStyle = `rgba(200,250,255,${0.7 * a})`; ctx.lineWidth = 1.5; ctx.beginPath();
    const dir = Math.sign(x1 - x0) || 1, len = Math.abs(x1 - x0);
    for (let s = 0; s <= len; s += 14) { const yy = y + Math.sin(s * 0.08 + g.time * 40) * w * 0.45; if (s === 0) ctx.moveTo(x0, yy); else ctx.lineTo(x0 + dir * s, yy); }
    ctx.stroke();
    ctx.fillStyle = `rgba(220,250,255,${a})`; ctx.beginPath(); ctx.arc(x0, y, w * 0.7, 0, TAU); ctx.fill();
    for (let s = 0; s <= len; s += 110) { LIGHTS.push(x0 + dir * s - cam, y, 170, a); GLOWS.push(x0 + dir * s - cam, y, 90, 0.8 * a, 'cold', 0); }
  }
}
function drawChargeFx(ctx, f, g, cam) {
  if (!f.ars || f.ars.cur !== 'beam' || !(f.ars.charge > 0)) return;
  const c = Math.min(1, f.ars.charge / 0.6), mx = f.x + f.face * 62, my = f.y - 52, t = g.time;
  for (let i = 0; i < 6; i++) { const an = i * 1.047 + t * 5, r = 34 * (1 - ((t * 2.5 + i / 6) % 1)) + 4; ctx.fillStyle = `rgba(170,240,255,${0.4 + c * 0.5})`; ctx.fillRect(mx + Math.cos(an) * r - 1, my + Math.sin(an) * r - 1, 2.4, 2.4); }
  glowAt(ctx, mx, my, 16 + 40 * c, 'cold', 0.4 + 0.6 * c);
  LIGHTS.push(mx - cam, my, 70 + 110 * c, 0.4 + 0.6 * c);
  if (c >= 1 && Math.sin(t * 24) > 0) { ctx.strokeStyle = 'rgba(200,250,255,0.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(mx, my, 14, 0, TAU); ctx.stroke(); }
}
// あたらしい ゾンビ いぬ
function drawHound(ctx, e, ph, mad, flash, t) {
  const fur = flash ? '#fff' : '#4a4038', dark = flash ? '#fff' : '#2a241f', skin = flash ? '#fff' : '#7b8771';
  const run = Math.abs(e.vx) > 20, sp = run ? ph * 1.6 : 0;
  const legs = [[-16, 0], [-10, 1.3], [12, 2.1], [18, 3.4]];
  for (const [lx, o] of legs) { const sw = Math.sin(sp + o * 1.5) * (run ? 9 : 0); limb(ctx, [lx, -20, lx + sw * 0.5, -10, lx + sw, 0], 4.4, o > 2 ? fur : dark); }
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(0, -24, 25, 11, 0.04, 0, TAU); ctx.fill();
  ctx.fillStyle = fur; ctx.beginPath(); ctx.ellipse(0, -24, 23, 9.4, 0.04, 0, TAU); ctx.fill();
  if (!flash) {
    ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(-2, -21, 9, 5, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#3a4234'; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i < 4; i++) { ctx.moveTo(-8 + i * 4, -25); ctx.lineTo(-7 + i * 4, -18); } ctx.stroke();
    ctx.strokeStyle = dark; ctx.lineWidth = 1.6; ctx.beginPath(); for (let i = 0; i < 5; i++) { ctx.moveTo(-16 + i * 7, -33); ctx.lineTo(-14 + i * 7, -37 - (i % 2) * 2); } ctx.stroke();
  }
  ctx.strokeStyle = OUT; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-22, -27); ctx.quadraticCurveTo(-32, -32 + Math.sin(t * 9) * 3, -36, -26); ctx.stroke();
  ctx.strokeStyle = fur; ctx.lineWidth = 2.6; ctx.stroke();
  const hx = 24, hy = mad ? -26 : -30;
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(hx, hy, 11, 8.5, 0.2, 0, TAU); ctx.fill();
  ctx.fillStyle = fur; ctx.beginPath(); ctx.ellipse(hx, hy, 9.4, 7, 0.2, 0, TAU); ctx.fill();
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(hx - 6, hy - 5); ctx.lineTo(hx - 3, hy - 14); ctx.lineTo(hx + 1, hy - 5); ctx.fill();
  const open = mad ? 6 : 2 + Math.sin(t * 6) * 1;
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(hx + 4, hy - 2); ctx.lineTo(hx + 17, hy + 1); ctx.lineTo(hx + 16, hy + 4); ctx.lineTo(hx + 4, hy + 4); ctx.fill();
  ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(hx + 4, hy - 1); ctx.lineTo(hx + 15, hy + 1.6); ctx.lineTo(hx + 14, hy + 3); ctx.lineTo(hx + 4, hy + 3); ctx.fill();
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(hx + 3, hy + 4); ctx.lineTo(hx + 15, hy + 4 + open); ctx.lineTo(hx + 3, hy + 7 + open * 0.5); ctx.fill();
  ctx.fillStyle = '#d8d0b8'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(hx + 7 + i * 3, hy + 3.5); ctx.lineTo(hx + 8.5 + i * 3, hy + 6); ctx.lineTo(hx + 10 + i * 3, hy + 3.5); ctx.fill(); }
  eyesGlow(ctx, [[hx + 3, hy - 2]], mad ? '#fbffc8' : '#d9e48a', 1.7, null);
}
// ---- あたらしい ボス ----
// v0.7 しろい ひと（いせき ステージ）：まるい しろい あたま に ＋ の かお、しろい からだ。カタナと さや
const PLAIN = { base: '#f1f1ec', far: '#c9ccc9', shade: '#d4d6d2', line: '#1a1a1c', sheath: '#2a2a30', sheath2: '#4a4a52', acc: '#ffd84a' };
function plainLeg(ctx, hx, hy, fx, fy, far) {
  const [kx, ky, ax, ay] = ik(hx, hy, fx, fy, 18, 18, -1);
  limb(ctx, [hx, hy, kx, ky, ax, ay], 8, far ? PLAIN.far : PLAIN.base);
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(ax + 3, ay - 1, 7.2, 4.4, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = far ? PLAIN.far : PLAIN.base; ctx.beginPath(); ctx.ellipse(ax + 3, ay - 1.4, 5.6, 2.9, 0, 0, TAU); ctx.fill();
}
function plainArm(ctx, sx, sy, hx, hy, far) {
  const [ex, ey, wx, wy] = ik(sx, sy, hx, hy, 15, 15, 1);
  limb(ctx, [sx, sy, ex, ey, wx, wy], 6.5, far ? PLAIN.far : PLAIN.base);
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(wx, wy, 5.4, 0, TAU); ctx.fill();
  ctx.fillStyle = far ? PLAIN.far : PLAIN.base; ctx.beginPath(); ctx.arc(wx, wy, 3.9, 0, TAU); ctx.fill();
  return [wx, wy];
}
function plainTorso(ctx, hurt) {
  ctx.fillStyle = OUT; roundRect(ctx, -11.5, -60, 23, 30, 9); ctx.fill();
  ctx.fillStyle = hurt ? '#d9d0d4' : PLAIN.base; roundRect(ctx, -9.8, -58.3, 19.6, 26.6, 7.5); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.13)'; roundRect(ctx, -9.8, -58.3, 6, 26.6, 4); ctx.fill();
  // こしひも
  ctx.fillStyle = OUT; ctx.fillRect(-10.5, -37.5, 21, 4); ctx.fillStyle = '#3a3a40'; ctx.fillRect(-9.8, -36.8, 19.6, 2.4);
}
function plainSheath(ctx, empty) {
  // こしの さや（うしろ ななめ）
  ctx.save(); ctx.translate(-2, -36); ctx.rotate(2.72);
  ctx.fillStyle = OUT; roundRect(ctx, -2, -4.2, 44, 8.4, 3.5); ctx.fill();
  ctx.fillStyle = PLAIN.sheath; roundRect(ctx, -0.6, -2.8, 41.2, 5.6, 2.6); ctx.fill();
  ctx.fillStyle = PLAIN.sheath2; ctx.fillRect(2, -2.2, 36, 1.2);
  ctx.fillStyle = '#b89a4a'; ctx.fillRect(4, -2.8, 2.4, 5.6); ctx.fillRect(36, -2.8, 2.4, 5.6);
  if (!empty) { ctx.fillStyle = OUT; ctx.fillRect(-12, -3.6, 12, 7.2); ctx.fillStyle = '#26262c'; ctx.fillRect(-11, -2.4, 10, 4.8); }
  ctx.restore();
}
function plainHead(ctx, hx, hy) {
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(hx, hy, 14.4, 0, TAU); ctx.fill();
  ctx.fillStyle = PLAIN.base; ctx.beginPath(); ctx.arc(hx, hy, 12.6, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.beginPath(); ctx.arc(hx - 4.5, hy + 3.5, 10.5, 0, TAU); ctx.fill();
  ctx.fillStyle = PLAIN.base; ctx.beginPath(); ctx.arc(hx + 1.6, hy - 1.4, 10.4, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.ellipse(hx - 2, hy - 7.5, 4, 2, -0.4, 0, TAU); ctx.fill();
  // かお：＋ だけ
  ctx.strokeStyle = PLAIN.line; ctx.lineWidth = 1.7; ctx.lineCap = 'butt'; ctx.beginPath();
  ctx.moveTo(hx + 1.5, hy + 1.6); ctx.lineTo(hx + 12.6, hy + 1.6); ctx.moveTo(hx + 7, hy - 4.4); ctx.lineTo(hx + 7, hy + 8.4); ctx.stroke(); ctx.lineCap = 'round';
}
// カタナ：つか（くろ）・つば・ややそった は。blood=みどりの ちが つく わりあい
function drawKatana(ctx, x, y, ang, blood, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
  // つか
  ctx.fillStyle = OUT; roundRect(ctx, -12, -2.9, 15, 5.8, 2); ctx.fill();
  ctx.fillStyle = '#25252b'; roundRect(ctx, -11, -1.9, 13, 3.8, 1.5); ctx.fill();
  ctx.strokeStyle = '#6a6a74'; ctx.lineWidth = 0.8; ctx.beginPath(); for (let i = -9; i < 2; i += 3) { ctx.moveTo(i, -1.9); ctx.lineTo(i + 1.6, 1.9); } ctx.stroke();
  // つば
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(3.6, 0, 2.6, 5.6, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#b89a4a'; ctx.beginPath(); ctx.ellipse(3.6, 0, 1.4, 4.3, 0, 0, TAU); ctx.fill();
  // は
  const L = 50;
  ctx.beginPath(); ctx.moveTo(5.5, -2.4); ctx.quadraticCurveTo(L * 0.6, -4.4, L + 6, -4.6); ctx.lineTo(L + 1, 1.0); ctx.quadraticCurveTo(L * 0.6, 1.4, 5.5, 2.2); ctx.closePath();
  ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.stroke(); ctx.fillStyle = '#dfe5ea'; ctx.fill();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(7, -1.6); ctx.quadraticCurveTo(L * 0.6, -3.4, L + 3, -3.8); ctx.stroke();
  ctx.strokeStyle = '#9aa4ae'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(7, 0.6); ctx.quadraticCurveTo(L * 0.6, 0, L, -0.6); ctx.stroke();
  if (blood > 0.02) { // みどりの ち（さきの ほうから）
    const b0 = L + 4 - blood * (L - 6);
    ctx.save(); ctx.beginPath(); ctx.moveTo(5.5, -2.4); ctx.quadraticCurveTo(L * 0.6, -4.4, L + 6, -4.6); ctx.lineTo(L + 1, 1.0); ctx.quadraticCurveTo(L * 0.6, 1.4, 5.5, 2.2); ctx.closePath(); ctx.clip();
    ctx.fillStyle = 'rgba(76,214,40,0.92)'; ctx.fillRect(b0, -6, L + 8 - b0, 10);
    ctx.fillStyle = 'rgba(40,140,24,0.9)'; for (let i = 0; i < 4; i++) { const px = b0 + (L - b0) * (i / 4) + 3; ctx.beginPath(); ctx.ellipse(px, -0.5 + (i % 2), 2.6, 1.4, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
    ctx.fillStyle = '#4cd628'; for (let i = 0; i < 3; i++) { const px = b0 + 4 + i * (L - b0) / 3; ctx.beginPath(); ctx.ellipse(px, 2.5 + i % 2 * 1.5, 1.2, 2 + blood * 2.2, 0, 0, TAU); ctx.fill(); }
  }
  ctx.restore();
}
// きりの かたち：[はじめの かくど, おわりの かくど]
const SLASH_ARC = { 1: [-2.3, 0.75], 2: [0.75, -1.9], 3: [-2.9, 1.05], 4: [-2.6, 1.4] };
function slashPose(f) {
  const M = f.move, mt = f.moveT || 0, A = SLASH_ARC[M.blade];
  const k = clamp((mt - M.t0 * 0.6) / (M.t1 - M.t0 * 0.6 + 0.03), 0, 1), e = 1 - Math.pow(1 - k, 3);
  const ang = A[0] + (A[1] - A[0]) * e;
  const r = 15;
  return { ang, hand: [7 + Math.cos(ang) * r * 0.7, -50 + Math.sin(ang) * r], k, A, active: mt >= M.t0 * 0.6 && mt <= M.t1 + 0.06 };
}
function drawSlashTrail(ctx, f, P, blood) {
  if (!P.active) return;
  const a0 = P.A[0], a1 = P.A[0] + (P.A[1] - P.A[0]) * (1 - Math.pow(1 - P.k, 3));
  const cx = 7, cy = -50, R = 58, ccw = a1 < a0;
  const fade = 1 - clamp(((f.moveT || 0) - f.move.t1) / 0.06, 0, 1);
  ctx.save(); ctx.globalAlpha = 0.85 * fade; ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = f.move.big ? 9 : 6; ctx.beginPath(); ctx.arc(cx, cy, R, a0 + (a1 - a0) * 0.25, a1, ccw); ctx.stroke();
  ctx.strokeStyle = blood > 0.3 ? 'rgba(120,255,80,0.8)' : 'rgba(190,230,255,0.85)'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(cx, cy, R + 3, a0 + (a1 - a0) * 0.1, a1, ccw); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cx, cy, R - 9, a0 + (a1 - a0) * 0.4, a1, ccw); ctx.stroke();
  ctx.restore();
}
function drawPlainFighter(ctx, f, g, ctx2) {
  const { id, mt, F1, F2, HX, HY, lean, hurt, dead, run, W } = ctx2;
  plainLeg(ctx, HX - 2, HY, F2[0], F2[1], true);
  plainLeg(ctx, HX + 1, HY, F1[0], F1[1], false);
  ctx.save(); ctx.translate(HX, HY); ctx.rotate(lean); ctx.translate(-HX, -HY);
  const hasK = !!f.ars?.guns?.katana, kat = W === 'katana', blood = f.bladeBlood || 0;
  const punch = id === 'jab' || id === 'jab2' || id === 'upper' || id === 'airjab';
  let nearT, farT, kAng = null, kHand = null, gunAt = null, SP = null;
  if (dead) { farT = [12, -30]; nearT = [16, -34]; }
  else if (kat && f.move?.blade) { SP = slashPose(f); kHand = SP.hand; kAng = SP.ang; nearT = kHand; farT = [kHand[0] - 4, kHand[1] + 3]; }
  else if (punch) { const ext = Math.min(1, mt / 0.05) * (mt < f.move.t1 + 0.04 ? 1 : 0.3); nearT = [8 + ext * 30, id === 'upper' ? -42 - ext * 32 : -48]; farT = [-2, -44]; if (kat) { kHand = farT; kAng = -1.75; } }
  else if (id) { nearT = [14, -50]; farT = [6, -55]; if (kat) { kHand = [4, -56]; kAng = -1.9; } }
  else if (kat) { // かまえ：かたなを たかく かかげる
    const br = Math.sin(f.anim * 3) * 0.04;
    kHand = run ? [14, -48] : [13, -60]; kAng = run ? -0.55 : -1.2 + br; nearT = kHand; farT = [kHand[0] - 5, kHand[1] + 5];
  } else {
    const GG = GUN_GEOM[W] || GUN_GEOM.pistol, rc = f.recoil || 0;
    const gx = 16 - rc * GG.kick[0], gy = -44, ga = -rc * GG.kick[1];
    const fr = FRONT[W] || FRONT.pistol;
    gunAt = [gx, gy, ga, 1]; nearT = [gx + 1, gy + 1]; farT = [gx + fr[0] * Math.cos(ga) - fr[1] * Math.sin(ga), gy + fr[0] * Math.sin(ga) + fr[1] * Math.cos(ga)];
  }
  plainArm(ctx, 5, -53, farT[0], farT[1], true);
  if (hasK) plainSheath(ctx, kat);
  plainTorso(ctx, hurt);
  const hTilt = hurt ? -0.25 : run ? 0.05 : 0;
  ctx.save(); ctx.translate(2, -58); ctx.rotate(hTilt); plainHead(ctx, 2, -11); ctx.restore();
  if (SP) drawSlashTrail(ctx, f, SP, blood);
  if (kHand) drawKatana(ctx, kHand[0], kHand[1], kAng, blood);
  if (gunAt) drawGun(ctx, W, gunAt[0], gunAt[1], gunAt[2], 1, 1, id ? 0 : f.recoil || 0, 0);
  plainArm(ctx, 0, -53, nearT[0], nearT[1], false);
  ctx.restore();
}

// v0.7 いせきの グール：かわの ない からだ。ずがいこつ・あばら・せぼね が みえる。ちは みどり
const GH = { flesh: '#b8607f', flesh2: '#7e3658', hi: '#e48eaa', sick: '#9aae6a', bone: '#ece3cb', bone2: '#b3a688', cav: '#2c0e1e', blood: '#5fe03a', blood2: '#2c9a22', eye: '#c6ff6a' };
function ghLimb(ctx, pts, w, col, boneCol) {
  limb(ctx, pts, w, col);
  if (boneCol) { ctx.strokeStyle = boneCol; ctx.lineWidth = Math.max(1, w * 0.28); ctx.beginPath(); ctx.moveTo(pts[2], pts[3]); ctx.lineTo(pts[4] * 0.7 + pts[2] * 0.3, pts[5] * 0.7 + pts[3] * 0.3); ctx.stroke(); }
}
function ghClaw(ctx, x, y, ang, col, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(0, 0, 4.6 * s, 0, TAU); ctx.fill();
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, 3.2 * s, 0, TAU); ctx.fill();
  for (let i = -1; i <= 1; i++) {
    ctx.save(); ctx.rotate(i * 0.42);
    ctx.beginPath(); ctx.moveTo(2 * s, -1.6 * s); ctx.quadraticCurveTo(9 * s, -2.5 * s, 12 * s, 2.4 * s); ctx.lineTo(3 * s, 1.6 * s); ctx.closePath();
    ctx.lineWidth = 2.2; ctx.strokeStyle = OUT; ctx.stroke(); ctx.fillStyle = GH.bone; ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}
// pose: { ph, walk, rear(0-1), claw(-1 うしろ〜1 まえ), open(0-1), flash, dazed, t, seed }
function drawGhoul(ctx, sc, P) {
  const fl = (c) => (P.flash ? '#fff' : c);
  ctx.save(); ctx.scale(sc, sc);
  const sw = P.walk ? Math.sin(P.ph) : 0, sw2 = P.walk ? Math.cos(P.ph) : 0;
  const rear = P.rear, cl = P.claw;
  const hip = [-15, -25 - rear * 4 + Math.abs(sw2) * 1.5], sh = [8 - rear * 5, -38 - rear * 15 + Math.abs(sw) * 2];
  const head = [sh[0] + 13 - rear * 3 + (P.dazed ? 2 : 0), sh[1] + 3 - rear * 3 + (P.dazed ? 8 : 0)];
  // て の めあて
  const crawl = (o) => [sh[0] + 12 + o * 9, -Math.max(0, o) * 5];
  const lerp = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  let hN = crawl(sw), hF = crawl(-sw);
  if (cl < 0) { const up = [sh[0] - 6, sh[1] - 14]; hN = lerp(hN, up, -cl); hF = lerp(hF, [sh[0] - 2, sh[1] - 8], -cl); }
  if (cl > 0) { const fw = [sh[0] + 32, sh[1] + 2]; hN = lerp(hN, fw, cl); hF = lerp(hF, [sh[0] + 26, sh[1] + 10], cl * 0.8); }
  // おくの あし・て
  ghLimb(ctx, [hip[0] + 4, hip[1], ...ik(hip[0] + 4, hip[1], -6 - sw * 8, 0, 14, 15, 1).slice(0, 2), -6 - sw * 8, 0], 6, fl(GH.flesh2), null);
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(-4 - sw * 8, -1.5, 6, 3, 0, 0, TAU); ctx.fill();
  const [efx, efy] = ik(sh[0] - 2, sh[1] + 4, hF[0], hF[1], 13, 14, -1);
  ghLimb(ctx, [sh[0] - 2, sh[1] + 4, efx, efy, hF[0], hF[1]], 4.6, fl(GH.flesh2), null);
  ghClaw(ctx, hF[0], hF[1], cl > 0.3 ? 0 : 0.5, fl(GH.flesh2), 0.95);
  // からだ（こし→かた の ななめ だえん）
  const cx = (hip[0] + sh[0]) / 2, cy = (hip[1] + sh[1]) / 2, ang = Math.atan2(sh[1] - hip[1], sh[0] - hip[0]);
  const len = Math.hypot(sh[0] - hip[0], sh[1] - hip[1]) / 2 + 9, th = 12.5;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(0, 0, len + 2.2, th + 2.2, 0, 0, TAU); ctx.fill();
  const bg = ctx.createLinearGradient(0, -th, 0, th); bg.addColorStop(0, fl(GH.hi)); bg.addColorStop(0.45, fl(GH.flesh)); bg.addColorStop(1, fl(GH.flesh2));
  ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(0, 0, len, th, 0, 0, TAU); ctx.fill();
  if (!P.flash) {
    // きずの すじ（きんにく）
    ctx.strokeStyle = 'rgba(90,20,50,0.55)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = -3; i <= 3; i++) { ctx.moveTo(i * 4.5 - 2, -th * 0.7); ctx.quadraticCurveTo(i * 4.5 + 1, -th * 0.2, i * 4.5 - 1, th * 0.1); } ctx.stroke();
    ctx.fillStyle = 'rgba(154,174,106,0.45)'; ctx.beginPath(); ctx.ellipse(-len * 0.5, th * 0.3, 6, 4, 0.3, 0, TAU); ctx.ellipse(len * 0.35, -th * 0.4, 4, 2.6, 0, 0, TAU); ctx.fill();
    // あばら（おなか がわ）
    ctx.fillStyle = GH.cav; ctx.beginPath(); ctx.ellipse(len * 0.2, th * 0.25, len * 0.5, th * 0.62, 0, 0, TAU); ctx.fill();
    for (let i = 0; i < 5; i++) {
      const x = len * 0.2 + (i - 2) * len * 0.19;
      ctx.beginPath(); ctx.moveTo(x - 1, -th * 0.45); ctx.quadraticCurveTo(x + 5, th * 0.2, x - 1.5, th * 0.86);
      ctx.strokeStyle = OUT; ctx.lineWidth = 3.6; ctx.stroke(); ctx.strokeStyle = GH.bone; ctx.lineWidth = 2; ctx.stroke();
    }
    // むねの ほね
    ctx.strokeStyle = OUT; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(len * 0.2 - len * 0.45, th * 0.82); ctx.lineTo(len * 0.2 + len * 0.42, th * 0.78); ctx.stroke();
    ctx.strokeStyle = GH.bone2; ctx.lineWidth = 1.8; ctx.stroke();
  }
  // せぼね（せなかの うえ）
  ctx.strokeStyle = fl(GH.hi); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-len + 2, -th * 0.55); ctx.quadraticCurveTo(0, -th - 3, len - 2, -th * 0.5); ctx.stroke();
  for (let i = 0; i < 9; i++) {
    const k = i / 8, x = -len + 4 + k * (len * 2 - 8), y = -th * 0.55 + (-th - 3 + th * 0.55) * 2 * k * (1 - k) * 2 * 0.5 - 1.5;
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(x, y, 3.4, 2.8, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = fl(GH.bone); ctx.beginPath(); ctx.ellipse(x, y, 2.3, 1.8, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(x - 1.6, y - 1.5); ctx.lineTo(x - 0.8, y - 5.5); ctx.lineTo(x + 1.4, y - 1.5); ctx.fill();
    ctx.fillStyle = fl(GH.bone); ctx.beginPath(); ctx.moveTo(x - 0.9, y - 1.5); ctx.lineTo(x - 0.6, y - 4.2); ctx.lineTo(x + 0.7, y - 1.5); ctx.fill();
  }
  ctx.restore();
  // ぶらさがる にくの きれはし
  if (!P.flash) for (let i = 0; i < 4; i++) {
    const k = 0.18 + i * 0.2, bx = hip[0] + (sh[0] - hip[0]) * k + Math.sin(ang) * -th * 0.9, by = hip[1] + (sh[1] - hip[1]) * k + Math.cos(ang) * th * 0.9;
    const L = 7 + ((i * 37 + (P.seed | 0)) % 5) * 1.6, swy = Math.sin(P.t * 5 + i * 1.7) * 2.4 + (P.walk ? sw * 2 : 0);
    ctx.beginPath(); ctx.moveTo(bx - 1.8, by - 1); ctx.quadraticCurveTo(bx + swy * 0.5, by + L * 0.6, bx + swy, by + L); ctx.quadraticCurveTo(bx + swy * 0.4 + 2, by + L * 0.5, bx + 2.4, by - 1); ctx.closePath();
    ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.stroke(); ctx.fillStyle = i % 2 ? GH.flesh2 : GH.flesh; ctx.fill();
    if (i % 2 === 0) { ctx.fillStyle = GH.blood; ctx.beginPath(); ctx.arc(bx + swy, by + L + 1.4, 1.3, 0, TAU); ctx.fill(); }
  }
  // くび
  limb(ctx, [sh[0], sh[1], (sh[0] + head[0]) / 2, (sh[1] + head[1]) / 2 - 2, head[0] - 4, head[1] + 1], 5, fl(GH.flesh));
  // てまえの あし
  const [kx, ky] = ik(hip[0], hip[1], -12 + sw * 8, 0, 14, 15, 1);
  ghLimb(ctx, [hip[0], hip[1], kx, ky, -12 + sw * 8, 0], 7, fl(GH.flesh), P.flash ? null : GH.bone2);
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(-9 + sw * 8, -1.6, 7, 3.4, 0, 0, TAU); ctx.fill(); ctx.fillStyle = fl(GH.flesh2); ctx.beginPath(); ctx.ellipse(-9 + sw * 8, -1.9, 5.4, 2, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(hip[0] + 1, hip[1] + 1, 8, 7, 0, 0, TAU); ctx.fill(); ctx.fillStyle = fl(GH.flesh); ctx.beginPath(); ctx.ellipse(hip[0] + 1, hip[1] + 1, 6.4, 5.4, 0, 0, TAU); ctx.fill();
  // ずがいこつ
  const [hx, hy] = head, op = P.open;
  ctx.save(); ctx.translate(hx, hy); if (P.dazed) ctx.rotate(0.35);
  // した あご（ひらく）
  ctx.save(); ctx.translate(-3, 3.5); ctx.rotate(op * 0.65);
  ctx.beginPath(); ctx.moveTo(-1, -1); ctx.lineTo(12, 0.5); ctx.quadraticCurveTo(13, 4.5, 9, 5.5); ctx.lineTo(1, 5); ctx.closePath();
  ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.stroke(); ctx.fillStyle = fl(GH.bone2); ctx.fill();
  ctx.fillStyle = fl(GH.bone); for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(2.5 + i * 2.6, 0.6); ctx.lineTo(3.7 + i * 2.6, -2.4); ctx.lineTo(4.9 + i * 2.6, 0.8); ctx.fill(); }
  ctx.restore();
  if (op > 0.15 && !P.flash) { ctx.fillStyle = GH.cav; ctx.beginPath(); ctx.moveTo(-1, 3); ctx.lineTo(12, 4); ctx.lineTo(10, 4 + op * 7); ctx.lineTo(0, 5 + op * 4); ctx.fill(); }
  // あたま の ほね
  ctx.beginPath(); ctx.arc(0, -2, 9, Math.PI * 0.62, Math.PI * 2.08); ctx.quadraticCurveTo(12.5, 1, 11.5, 4.4); ctx.lineTo(1, 4.4); ctx.closePath();
  ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.stroke(); ctx.fillStyle = fl(GH.bone); ctx.fill();
  if (!P.flash) {
    ctx.fillStyle = 'rgba(120,100,70,0.35)'; ctx.beginPath(); ctx.arc(-2.5, 0, 6.5, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.ellipse(-1, -8, 3.5, 1.6, -0.2, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(60,40,30,0.6)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-4, -9); ctx.lineTo(-1.5, -5); ctx.lineTo(-3, -2); ctx.stroke();
    ctx.fillStyle = GH.cav; ctx.beginPath(); ctx.ellipse(5, -2.4, 3.3, 3, 0.2, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(9.5, 0.5); ctx.lineTo(11.4, 2.4); ctx.lineTo(9.2, 2.6); ctx.fill();
    if (!P.dazed) { ctx.fillStyle = GH.eye; ctx.beginPath(); ctx.arc(5.6, -2.2, 1.2, 0, TAU); ctx.fill(); glowAt(ctx, 5.6, -2.2, 7, 'green', 0.9); }
    // うえの は
    ctx.fillStyle = GH.bone; ctx.strokeStyle = OUT; ctx.lineWidth = 0.9;
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(1.4 + i * 2.2, 4); ctx.lineTo(2.5 + i * 2.2, 7.4); ctx.lineTo(3.6 + i * 2.2, 4); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    // みどりの よだれ
    const dr = (Math.sin(P.t * 2.3 + (P.seed | 0)) + 1) * 2;
    ctx.fillStyle = GH.blood; ctx.beginPath(); ctx.ellipse(8, 8 + op * 6 + dr, 1.1, 1.8 + dr * 0.4, 0, 0, TAU); ctx.fill();
  }
  ctx.restore();
  // てまえの うで
  const [enx, eny] = ik(sh[0] + 2, sh[1] + 3, hN[0], hN[1], 13, 14, -1);
  ghLimb(ctx, [sh[0] + 2, sh[1] + 3, enx, eny, hN[0], hN[1]], 5.6, fl(GH.flesh), P.flash ? null : GH.bone);
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(sh[0] + 2, sh[1] + 3, 6, 0, TAU); ctx.fill(); ctx.fillStyle = fl(GH.flesh); ctx.beginPath(); ctx.arc(sh[0] + 2, sh[1] + 3, 4.5, 0, TAU); ctx.fill();
  ghClaw(ctx, hN[0], hN[1], cl > 0.3 ? -0.1 : cl < -0.3 ? -1.4 : 0.55, fl(GH.flesh), 1.1);
  if (cl > 0.5 && !P.flash) { ctx.strokeStyle = 'rgba(200,255,170,0.6)'; ctx.lineWidth = 1.6; ctx.beginPath(); for (let i = -1; i <= 1; i++) { ctx.moveTo(hN[0] - 2, hN[1] - 14 + i * 5); ctx.quadraticCurveTo(hN[0] + 14, hN[1] - 6 + i * 5, hN[0] + 10, hN[1] + 10 + i * 5); } ctx.stroke(); }
  ctx.restore();
}
function ghoulPoseEnemy(e, g) {
  const st = e.state, ph = e.anim * (e.def.small ? 16 : 11);
  return { ph, walk: e.onGround && Math.abs(e.vx) > 20 && st === 'walk', rear: st === 'wind' ? 0.75 : st === 'leap' ? 0.3 : 0, claw: st === 'wind' ? -1 : st === 'attack' || st === 'leap' ? 1 : 0,
    open: st === 'wind' || st === 'attack' || st === 'leap' ? 1 : 0.15 + Math.sin(g.time * 3 + e.x) * 0.1, flash: e.flashT > 0, dazed: st === 'down', t: g.time, seed: (e.x * 7) % 97 };
}
function drawGhoulBoss(ctx, b, g) {
  const st = b.state, t = g.time, sc = b.h / 60;
  ctx.save(); ctx.translate(b.x, b.y);
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.ellipse(0, GROUND - b.y, 30 * sc, 7, 0, 0, TAU); ctx.fill();
  deadFade(ctx, b);
  ctx.scale(b.face, 1);
  if (b.emerge && st === 'intro') { // みどりの ちだまりから はいあがる
    const rise = clamp((2.2 - b.t) / 1.7, 0, 1);
    ctx.beginPath(); ctx.rect(-200, -400, 400, 400); ctx.clip();
    ctx.translate(0, (1 - rise) * 62 * sc);
    ctx.rotate(-(1 - rise) * 0.35);
  }
  if (st === 'charge') ctx.rotate(0.12);
  const P = {
    ph: b.anim * 8, walk: b.onGround && Math.abs(b.vx) > 20 && (st === 'walk' || st === 'charge'), t, seed: 11, flash: b.flashT > 0.06, dazed: st === 'dazed' || st === 'down',
    rear: st === 'punchWind' ? 0.55 : st === 'slamWind' ? 1 : st === 'summon' ? 0.85 : st === 'intro' ? 0.6 : st === 'chargeWind' ? 0.1 : 0,
    claw: st === 'punchWind' || st === 'slamWind' ? -1 : st === 'punch' || st === 'slam' || st === 'charge' ? 1 : st === 'intro' ? -0.6 : 0,
    open: st === 'summon' || st === 'intro' || st === 'punch' || st === 'charge' || st.endsWith('Wind') ? 1 : 0.2 + Math.sin(t * 2.4) * 0.12,
  };
  if (st === 'chargeWind') ctx.translate(Math.sin(t * 50) * 1.5, 0);
  drawGhoul(ctx, sc, P);
  ctx.restore();
  bossFx(ctx, b, g, b.y - 66 * sc);
}

// v0.8 よあけの おおさそり（ゾンビ化した おおきな さそり・かおに じゅうじの ぬいあと）
function drawScorpBoss(ctx, b, g) {
  const st = b.state, t = g.time, flash = b.flashT > 0.06, rage = b.hp < b.maxHp * 0.5;
  const shell = flash ? '#fff' : rage ? '#4a2a22' : '#3c2c22', hi = flash ? '#fff' : '#9a7a52', dk = flash ? '#fff' : '#20140e', vein = rage ? '#9cff5a' : '#6ad040';
  ctx.save(); ctx.translate(b.x, b.y);
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.ellipse(0, GROUND - b.y, 96, 9, 0, 0, TAU); ctx.fill();
  deadFade(ctx, b);
  ctx.scale(b.face, 1);
  if (b.emerge && st === 'intro') {
    const rise = clamp((2.2 - b.t) / 1.7, 0, 1);
    ctx.fillStyle = '#6a4a2e'; ctx.beginPath(); ctx.ellipse(0, 0, 110, 12, 0, Math.PI, TAU); ctx.fill();
    ctx.beginPath(); ctx.rect(-300, -400, 600, 400); ctx.clip();
    ctx.translate(0, (1 - rise) * 110); ctx.rotate(-(1 - rise) * 0.18);
  }
  const walk = b.onGround && Math.abs(b.vx) > 20, ph = b.anim * 9;
  const dazed = st === 'dazed' || st === 'down';
  if (st === 'chargeWind') ctx.translate(Math.sin(t * 50) * 2, 0);
  if (st === 'charge') ctx.rotate(0.06);
  if (dazed) ctx.rotate(-0.08 + Math.sin(t * 3) * 0.04);
  const bob = walk ? Math.abs(Math.sin(ph)) * 3 : Math.sin(t * 2) * 1.5;
  ctx.translate(0, -bob);
  // あし（4つい）
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let pass = 0; pass < 2; pass++) for (let i = 0; i < 4; i++) {
    const bx = -40 + i * 22, sw = walk ? Math.sin(ph + i * 1.3 + pass * Math.PI) * 12 : 0, back = pass === 0;
    const kx = bx - 14 + sw * 0.4, ky = -64 - (back ? 4 : 0), fx = bx - 26 + sw, fy = back ? -2 : 0;
    ctx.strokeStyle = OUT; ctx.lineWidth = back ? 9 : 11; ctx.beginPath(); ctx.moveTo(bx, -36); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
    ctx.strokeStyle = back ? dk : shell; ctx.lineWidth = back ? 5 : 7; ctx.stroke();
    if (pass === 1) { ctx.fillStyle = hi; ctx.beginPath(); ctx.arc(kx, ky, 2.4, 0, TAU); ctx.fill(); }
  }
  // しっぽ
  const tailUp = st === 'spitWind' || st === 'summon' ? 1 : st === 'spit' ? 0.6 : 0;
  const stab = st === 'slam' || st === 'slamWind' ? 1 : 0;
  let x = -62, y = -46, a = -2.5 - tailUp * 0.15 + Math.sin(t * 1.6) * 0.05;
  const segs = [];
  for (let i = 0; i < 7; i++) { const r = 15 - i * 1.3; segs.push([x, y, r]); x += Math.cos(a) * (r * 1.45); y += Math.sin(a) * (r * 1.45); a += 0.36 + stab * 0.12 - tailUp * 0.04; }
  for (const [sx, sy, r] of segs) { ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(sx, sy, r + 2.5, 0, TAU); ctx.fill(); }
  for (const [sx, sy, r] of segs) {
    ctx.fillStyle = shell; ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU); ctx.fill();
    if (!flash) { ctx.fillStyle = hi; ctx.beginPath(); ctx.ellipse(sx - r * 0.25, sy - r * 0.45, r * 0.5, r * 0.22, -0.4, 0, TAU); ctx.fill(); ctx.strokeStyle = vein; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(sx - r * 0.4, sy + r * 0.3); ctx.lineTo(sx + r * 0.3, sy + r * 0.1); ctx.stroke(); }
  }
  // どくばり
  const ang = a + 0.6;
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(0, 0, 12, 9, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(6, -6); ctx.quadraticCurveTo(28, -2, 30, 14); ctx.quadraticCurveTo(20, 4, 6, 6); ctx.fill();
  ctx.fillStyle = flash ? '#fff' : '#6aa040'; ctx.beginPath(); ctx.ellipse(0, 0, 9.5, 7, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = flash ? '#fff' : '#d8e8a0'; ctx.beginPath(); ctx.moveTo(7, -3.6); ctx.quadraticCurveTo(24, -1, 27, 10); ctx.quadraticCurveTo(18, 3, 7, 3.6); ctx.fill();
  ctx.restore();
  if (!flash) glowAt(ctx, x, y, 30 + tailUp * 20, 'green', 0.6 + tailUp * 0.3);
  if (st === 'spitWind' && !flash) { ctx.fillStyle = '#9cff5a'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x + Math.sin(t * 20 + i) * 4, y + 6 + ((t * 30 + i * 5) % 14), 2.4, 0, TAU); ctx.fill(); } }
  // こうら（どう）
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(-6, -46, 64, 27, -0.04, 0, TAU); ctx.fill();
  ctx.fillStyle = shell; ctx.beginPath(); ctx.ellipse(-6, -46, 61, 24, -0.04, 0, TAU); ctx.fill();
  if (!flash) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(-6, -36, 58, 12, 0, 0, Math.PI); ctx.fill();
    ctx.strokeStyle = dk; ctx.lineWidth = 2; ctx.beginPath(); for (let i = -3; i <= 3; i++) { ctx.moveTo(-6 + i * 15, -69); ctx.quadraticCurveTo(-4 + i * 15, -46, -6 + i * 15, -24); } ctx.stroke();
    ctx.fillStyle = hi; ctx.beginPath(); ctx.ellipse(-12, -62, 40, 5, -0.05, 0, TAU); ctx.fill();
    ctx.strokeStyle = vein; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-40, -48); ctx.quadraticCurveTo(-24, -40, -14, -52); ctx.moveTo(6, -44); ctx.quadraticCurveTo(18, -36, 28, -48); ctx.stroke();
    const pu = 0.6 + 0.4 * Math.sin(t * 5);
    for (const [px, py, r] of [[-30, -44, 3.4], [16, -50, 2.8], [-4, -38, 2.4]]) { ctx.fillStyle = vein; ctx.beginPath(); ctx.arc(px, py, r * (0.8 + pu * 0.3), 0, TAU); ctx.fill(); glowAt(ctx, px, py, r * 5, 'green', 0.5 * pu); }
  }
  // ハサミ（2ほん）
  const pinch = st === 'punch' || st === 'charge' ? 1 : st === 'punchWind' ? -1 : 0;
  const op = st === 'punchWind' || st === 'intro' || st === 'summon' ? 1 : st === 'punch' ? 0.1 : 0.35 + Math.sin(t * 3) * 0.15;
  for (const [oy, sc, col] of [[-8, 0.9, dk], [8, 1, shell]]) {
    const sx = 46, sy = -50 + oy * 0.4, ex = 74 + pinch * 18, ey = -64 + oy + (pinch < 0 ? -26 : pinch > 0 ? 14 : 0), hx = 100 + pinch * 34, hy = -50 + oy + (pinch < 0 ? -40 : pinch > 0 ? 10 : 0);
    ctx.strokeStyle = OUT; ctx.lineWidth = 14 * sc; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = 9 * sc; ctx.stroke();
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(pinch < 0 ? -0.5 : 0.1); ctx.scale(sc, sc);
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(6, 0, 20, 14, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(6, 0, 17, 11.5, 0, 0, TAU); ctx.fill();
    if (!flash) { ctx.fillStyle = hi; ctx.beginPath(); ctx.ellipse(2, -5, 10, 3, -0.1, 0, TAU); ctx.fill(); }
    ctx.save(); ctx.translate(20, -4); ctx.rotate(-op * 0.5);
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(0, -6); ctx.quadraticCurveTo(22, -10, 28, 4); ctx.quadraticCurveTo(14, 0, 0, 4); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(1, -3.6); ctx.quadraticCurveTo(19, -7, 24, 2.4); ctx.quadraticCurveTo(13, -0.6, 1, 2); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.translate(20, 6); ctx.rotate(op * 0.4);
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(0, -4); ctx.quadraticCurveTo(18, -2, 22, 8); ctx.quadraticCurveTo(10, 6, 0, 5); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(1, -2); ctx.quadraticCurveTo(15, -0.6, 18.6, 5.6); ctx.quadraticCurveTo(9, 4, 1, 3); ctx.fill();
    ctx.restore();
    ctx.restore();
  }
  // あたま（じゅうじの ぬいあと と みどりの め）
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(50, -46, 22, 19, 0.1, 0, TAU); ctx.fill();
  ctx.fillStyle = shell; ctx.beginPath(); ctx.ellipse(50, -46, 19.4, 16.4, 0.1, 0, TAU); ctx.fill();
  if (!flash) {
    ctx.strokeStyle = '#d8c8a0'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(42, -58); ctx.lineTo(58, -36); ctx.moveTo(58, -58); ctx.lineTo(42, -36); ctx.stroke();
    ctx.strokeStyle = OUT; ctx.lineWidth = 1; ctx.beginPath(); for (const [px, py] of [[45, -54], [55, -40], [55, -54], [45, -40]]) { ctx.moveTo(px - 2.4, py - 2.4); ctx.lineTo(px + 2.4, py + 2.4); } ctx.stroke();
  }
  const eye = dazed ? '#8a9a70' : rage ? '#f4ffb0' : '#b8f070';
  eyesGlow(ctx, [[62, -54], [66, -48], [60, -46]], eye, dazed ? 1.6 : 2.6, dazed ? null : 'green');
  // くち（きば）
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(66, -34, 7, 4 + (op > 0.6 ? 3 : 0), 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#d8d0b0'; for (const dx of [-3, 2]) { ctx.beginPath(); ctx.moveTo(64 + dx, -36); ctx.lineTo(66 + dx, -28); ctx.lineTo(68 + dx, -36); ctx.fill(); }
  if (dazed) { for (let i = 0; i < 3; i++) { const aa = t * 4 + i * 2.1; ctx.fillStyle = '#ffe680'; ctx.font = '900 14px system-ui'; ctx.fillText('★', 50 + Math.cos(aa) * 22, -80 + Math.sin(aa) * 6); } }
  if (st === 'charge' && !flash) { ctx.fillStyle = 'rgba(190,150,100,0.6)'; for (let i = 0; i < 6; i++) { const k = (t * 3 + i * 0.17) % 1; ctx.beginPath(); ctx.arc(-80 - k * 60, -6 - k * 14, 6 * (1 - k) + 2, 0, TAU); ctx.fill(); } }
  ctx.restore();
  bossFx(ctx, b, g, b.y - 110);
}

// みどりの ちだまり から はいあがる ちびグール
function drawGhoulEmerge(ctx, e, g) {
  const p = 1 - e.spawnT / (e.spawnMax || 0.9);
  ctx.save(); ctx.translate(e.x, GROUND);
  const r = 10 + 24 * Math.min(1, p * 2);
  ctx.fillStyle = '#1f7a1a'; ctx.beginPath(); ctx.ellipse(0, -1, r + 3, 5 + r * 0.12, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#5fe03a'; ctx.beginPath(); ctx.ellipse(0, -1.5, r, 3.5 + r * 0.1, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(220,255,200,0.6)'; ctx.beginPath(); ctx.ellipse(-r * 0.3, -3, r * 0.3, 1.2, 0, 0, TAU); ctx.fill();
  if (p > 0.25) {
    const q = (p - 0.25) / 0.75;
    ctx.save(); ctx.beginPath(); ctx.rect(-80, -200, 160, 199); ctx.clip();
    ctx.translate(0, (1 - q) * 40 * e.h / 58); ctx.scale(e.face, 1); ctx.rotate(-(1 - q) * 0.5);
    drawGhoul(ctx, e.h / 58, { ph: 0, walk: false, rear: 0.7 * (1 - q), claw: -0.6 * (1 - q), open: 1, flash: false, dazed: false, t: g.time, seed: e.x % 31 });
    ctx.restore();
    for (let i = 0; i < 4; i++) { const a = g.time * 6 + i * 1.6, k = (g.time * 2 + i * 0.25) % 1; ctx.fillStyle = '#5fe03a'; ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.7, -2 - Math.sin(k * Math.PI) * 14, 2, 0, TAU); ctx.fill(); }
  }
  ctx.restore();
}
function bossFx(ctx, b, g, topY) {
  const t = g.time, st = b.state, dazed = st === 'dazed' || st === 'down';
  if (dazed) { ctx.fillStyle = '#d8c48a'; ctx.font = '900 14px system-ui'; ctx.textAlign = 'center'; for (let i = 0; i < 3; i++) { const a = t * 5 + i * 2.1; ctx.fillText('★', b.x + Math.cos(a) * 30, topY + Math.sin(a) * 6); } }
  if (st.endsWith('Wind') && Math.sin(t * 20) > 0) { ctx.font = '900 22px system-ui'; ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.strokeStyle = OUT; ctx.strokeText('！', b.x, topY - 6); ctx.fillStyle = '#ffd84a'; ctx.fillText('！', b.x, topY - 6); }
}
function deadFade(ctx, b) { if (b.dead) { ctx.globalAlpha = Math.max(0, 1 - b.t / 2); ctx.rotate(-Math.min(1.2, b.t * 0.8)); } }
// ひとがた ボス（メスの せんせい・ようせつ ゾンビ・はじまりの ミュータント）
const MAN = {
  surgeon: { sc: 2, coat: '#8a948c', coat2: '#6c766e', body: '#3a4a52', skin: '#8a9480', eye: '#d9e48a', ek: 'green' },
  welder: { sc: 2.15, coat: '#5a3e28', coat2: '#46301e', body: '#2c2a2a', skin: '#7b8771', eye: '#ffb04a', ek: 'ember' },
  final: { sc: 2, coat: '#c8c8c0', coat2: '#9a9a92', body: '#2a2030', skin: '#8a7a96', eye: '#d8b0ff', ek: 'purple' },
};
function drawMan(ctx, b, g, kit) {
  const P = MAN[kit], flash = b.flashT > 0.06, t = g.time, st = b.state, SC = P.sc;
  const wind = st.endsWith('Wind'), dazed = st === 'dazed' || st === 'down';
  const fl = (c) => (flash ? '#fff' : c);
  if (kit === 'final' && (st === 'float' || st === 'phase')) { const a = 0.5 + 0.3 * Math.sin(t * 8); glowAt(ctx, b.x, b.y - 80, 130, 'purple', a); ctx.strokeStyle = `rgba(190,110,255,${a * 0.6})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(b.x, b.y - 80, 74 + Math.sin(t * 6) * 6, 0, TAU); ctx.stroke(); }
  ctx.save(); ctx.translate(b.x, b.y);
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.ellipse(0, GROUND - b.y, 25 * SC, 7, 0, 0, TAU); ctx.fill();
  deadFade(ctx, b);
  ctx.scale(b.face * SC, SC);
  if (st === 'charge') ctx.rotate(0.25); if (dazed) ctx.rotate(-0.15);
  const sw = Math.abs(b.vx) > 20 && b.onGround ? Math.sin(b.anim * 9) * 9 : 0;
  // ながい はくい / かわの エプロン
  ctx.fillStyle = fl(P.coat2); ctx.beginPath(); ctx.moveTo(-14, -50); ctx.lineTo(-19 - Math.sin(t * 4) * 2, -6); ctx.lineTo(15, -8); ctx.lineTo(13, -50); ctx.fill();
  limb(ctx, [0, -20, -sw * 0.5, -10, -sw, 0], 8, fl('#1e1e22'));
  ctx.fillStyle = OUT; roundRect(ctx, -15, -55, 30, 40, 5); ctx.fill();
  ctx.fillStyle = fl(P.coat); roundRect(ctx, -13, -53, 26, 36, 4); ctx.fill();
  if (!flash) {
    ctx.fillStyle = P.body; ctx.beginPath(); ctx.moveTo(-3, -53); ctx.lineTo(5, -53); ctx.lineTo(1, -40); ctx.fill();
    ctx.fillStyle = 'rgba(70,140,50,0.5)'; ctx.beginPath(); ctx.ellipse(6, -34, 5, 3, 0.4, 0, TAU); ctx.ellipse(-6, -24, 3, 4, 0, 0, TAU); ctx.fill();
    if (kit === 'welder') { ctx.fillStyle = '#3a2818'; ctx.fillRect(-13, -30, 26, 3); ctx.fillStyle = '#6a6a70'; for (let i = 0; i < 3; i++) ctx.fillRect(-10 + i * 7, -29, 4, 6); }
    if (kit === 'surgeon') { ctx.fillStyle = '#c8ccc4'; ctx.fillRect(6, -50, 5, 8); ctx.fillStyle = '#2a2c30'; ctx.fillRect(7, -51, 1, 6); ctx.fillRect(9, -51, 1, 6); }
    if (kit === 'final') { ctx.strokeStyle = '#9a4ad8'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-8, -50); ctx.quadraticCurveTo(-2, -38, -9, -22); ctx.moveTo(4, -48); ctx.lineTo(8, -32); ctx.stroke(); const pu = 0.6 + 0.4 * Math.sin(t * 5); ctx.fillStyle = '#c58cff'; ctx.beginPath(); ctx.arc(-4, -38, 2.5 * pu + 1, 0, TAU); ctx.fill(); glowAt(ctx, -4, -38, 14, 'purple', pu); }
  }
  limb(ctx, [0, -20, sw * 0.5, -10, sw, 0], 8, fl('#26262a'));
  // あたま
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(2, -66, 13.5, 0, TAU); ctx.fill();
  ctx.fillStyle = fl(P.skin); ctx.beginPath(); ctx.arc(2, -66, 12, 0, TAU); ctx.fill();
  const ec = dazed ? '#555' : wind ? '#ffffff' : P.eye;
  if (kit === 'welder') {
    // ようせつ めん（くらい まど が ひかる）
    ctx.fillStyle = OUT; roundRect(ctx, -6, -80, 22, 26, 5); ctx.fill(); ctx.fillStyle = fl('#2e3034'); roundRect(ctx, -4.5, -78.5, 19, 23, 4); ctx.fill();
    ctx.fillStyle = '#0a0a0c'; ctx.fillRect(1, -72, 12, 5); ctx.fillStyle = ec; ctx.fillRect(2, -71, 10, 2.5); if (!dazed) glowAt(ctx, 8, -70, wind ? 18 : 11, 'ember', 1);
    ctx.fillStyle = fl('#4a4c52'); ctx.fillRect(-8, -77, 4, 16);
  } else {
    if (kit === 'surgeon') {
      ctx.fillStyle = fl('#9fb8b0'); ctx.beginPath(); ctx.moveTo(1, -64); ctx.lineTo(15, -63); ctx.lineTo(13, -55); ctx.lineTo(2, -55); ctx.fill(); // マスク
      ctx.strokeStyle = '#6a807a'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(3, -61); ctx.lineTo(13, -60); ctx.moveTo(3, -58); ctx.lineTo(12, -57.5); ctx.stroke();
      ctx.fillStyle = fl('#7a8a84'); ctx.beginPath(); ctx.arc(2, -70, 12.5, Math.PI * 1.05, Math.PI * 1.95); ctx.fill(); // ぼうし
      // ヘッドライト
      ctx.fillStyle = '#2a2c30'; ctx.fillRect(4, -79, 8, 5); ctx.fillStyle = '#fff6d0'; ctx.fillRect(11, -78, 2, 3);
      ctx.fillStyle = 'rgba(255,246,200,0.13)'; ctx.beginPath(); ctx.moveTo(13, -77); ctx.lineTo(90, -40); ctx.lineTo(70, -10); ctx.closePath(); ctx.fill(); glowAt(ctx, 13, -77, 14, 'warm', 0.9);
    }
    ctx.fillStyle = '#0c0c0e'; ctx.beginPath(); ctx.ellipse(6, -68, 2.6, 2.2, 0, 0, TAU); ctx.ellipse(11, -67.5, 2, 2, 0, 0, TAU); ctx.fill();
    eyesGlow(ctx, [[6.3, -68], [11.2, -67.5]], ec, 1.3, dazed ? null : P.ek);
    if (kit === 'final') { ctx.fillStyle = fl('#3a3040'); ctx.beginPath(); ctx.arc(2, -70, 12.5, Math.PI * 1.1, Math.PI * 1.9); ctx.fill(); ctx.strokeStyle = '#9a4ad8'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-6, -64); ctx.lineTo(-2, -58); ctx.stroke(); }
  }
  // て
  const px = st === 'punch' ? 34 : st === 'punchWind' ? -4 : st.startsWith('knife') ? -6 : 16, py = st === 'knifeWind' ? -72 : -42;
  limb(ctx, [6, -50, (px + 6) / 2, (py - 50) / 2 + 2, px, py], 6.5, fl(P.coat));
  glove(ctx, px, py, fl(kit === 'welder' ? '#3a2a1c' : P.skin), st === 'punch' ? 7.5 : 5.5);
  if (kit === 'surgeon' && !dazed) { ctx.save(); ctx.translate(px, py); ctx.rotate(-0.6); ctx.fillStyle = '#d0d4d8'; ctx.beginPath(); ctx.moveTo(4, -1.5); ctx.lineTo(18, 0); ctx.lineTo(4, 1.5); ctx.fill(); ctx.restore(); }
  if (kit === 'welder' && !dazed) { // トーチ
    ctx.fillStyle = OUT; ctx.fillRect(px - 2, py - 3.5, 22, 7); ctx.fillStyle = '#6a6c72'; ctx.fillRect(px, py - 2, 19, 4);
    const on = st === 'flame' || st === 'flameWind'; const fr = on ? 10 + Math.random() * 4 : 3 + Math.random() * 2;
    ctx.fillStyle = on ? '#ffd27a' : '#8ad8ff'; ctx.beginPath(); ctx.ellipse(px + 21 + fr / 2, py, fr / 2 + 1, 2.4, 0, 0, TAU); ctx.fill(); glowAt(ctx, px + 22, py, on ? 30 : 12, on ? 'ember' : 'cold', 1);
  }
  ctx.restore();
  bossFx(ctx, b, g, b.y - 82 * SC);
}
// ずんぐり ボス（もりの ぬし・こおりの きょじん・むしの じょおう・はじまりの ミュータント だい2）
const BEAST = {
  beast: { skin: '#3a3a26', dark: '#22241a', vein: '#6a8a3a', eye: '#d9e48a', ek: 'green', horns: 'branch' },
  yeti: { skin: '#b8c4cc', dark: '#7a8894', vein: '#6aa0c8', eye: '#9fe4ff', ek: 'cold', horns: 'ice' },
  queen: { skin: '#3a2448', dark: '#22142c', vein: '#b06aff', eye: '#e8b0ff', ek: 'purple', horns: 'wing' },
  final: { skin: '#2c2234', dark: '#170f1c', vein: '#c06bff', eye: '#ffffff', ek: 'purple', horns: 'spike' },
};
function drawBeast(ctx, b, g, kit) {
  const P = BEAST[kit], flash = b.flashT > 0.06, t = g.time, st = b.state, wind = st.endsWith('Wind'), dazed = st === 'dazed' || st === 'down';
  const fl = (c) => (flash ? '#fff' : c);
  ctx.save(); ctx.translate(b.x, b.y);
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.ellipse(0, GROUND - b.y, 62, 8, 0, 0, TAU); ctx.fill();
  if (b.dead) { ctx.globalAlpha = Math.max(0, 1 - b.t / 2); ctx.scale(1 + b.t * 0.2, 1 - b.t * 0.3); }
  ctx.scale(b.face, 1);
  if (P.horns === 'wing') { // すけた はね
    const fw = Math.sin(t * 30) * 0.25;
    for (const s of [-1, 1]) { ctx.save(); ctx.translate(-10, -110); ctx.rotate(-0.6 + s * 0.35 + fw * s); ctx.fillStyle = 'rgba(190,160,230,0.35)'; ctx.beginPath(); ctx.ellipse(-46, 0, 50, 16, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(220,200,255,0.5)'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore(); }
  }
  const sw = Math.abs(b.vx) > 20 && b.onGround ? Math.sin(b.anim * 8) * 8 : 0;
  limb(ctx, [-20, -30, -22 - sw * 0.4, -14, -24 - sw, 0], 15, fl(P.dark)); limb(ctx, [20, -30, 22 + sw * 0.4, -14, 24 + sw, 0], 15, fl(P.dark));
  const br = 1 + Math.sin(t * 3) * 0.03, sq = st === 'slamWind' ? 0.86 : 1;
  ctx.save(); ctx.scale(br, br * sq);
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(0, -72, 52, 54, 0, 0, TAU); ctx.fill();
  const bg = ctx.createRadialGradient(-14, -96, 8, 0, -70, 56); bg.addColorStop(0, fl(kit === 'yeti' ? '#e4ecf0' : '#5a4a50')); bg.addColorStop(1, fl(P.skin));
  ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(0, -72, 49, 51, 0, 0, TAU); ctx.fill();
  if (!flash) {
    if (kit === 'yeti') { ctx.strokeStyle = '#8a98a4'; ctx.lineWidth = 1.4; ctx.beginPath(); for (let i = 0; i < 16; i++) { const a = i * 0.39, r = 44; ctx.moveTo(Math.cos(a) * r, -72 + Math.sin(a) * r); ctx.lineTo(Math.cos(a) * (r + 7), -72 + Math.sin(a) * (r + 7)); } ctx.stroke(); }
    else if (kit === 'beast') { ctx.fillStyle = '#4a6a2a'; for (const [x, y, r] of [[-30, -100, 10], [-36, -70, 8], [14, -112, 9], [-10, -116, 7]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); } }
    else if (kit === 'queen') { ctx.strokeStyle = '#5a3a6a'; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i < 4; i++) { ctx.moveTo(-44 + i * 6, -40 - i * 18); ctx.quadraticCurveTo(0, -36 - i * 18, 40 - i * 4, -44 - i * 18); } ctx.stroke(); const pu = 0.6 + 0.4 * Math.sin(t * 4); ctx.fillStyle = '#b06aff'; ctx.beginPath(); ctx.ellipse(-20, -40, 12 * pu, 8 * pu, 0, 0, TAU); ctx.fill(); glowAt(ctx, -20, -40, 30, 'purple', pu); }
    ctx.strokeStyle = P.vein; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-28, -98); ctx.quadraticCurveTo(-10, -80, -24, -50); ctx.moveTo(18, -108); ctx.quadraticCurveTo(34, -84, 20, -50); ctx.stroke();
  }
  // つの・えだ・こおり
  ctx.lineCap = 'round';
  if (P.horns === 'branch') { ctx.strokeStyle = OUT; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-6, -118); ctx.lineTo(-18, -150); ctx.lineTo(-30, -160); ctx.moveTo(-18, -150); ctx.lineTo(-10, -166); ctx.moveTo(14, -116); ctx.lineTo(26, -146); ctx.lineTo(40, -152); ctx.moveTo(26, -146); ctx.lineTo(22, -164); ctx.stroke(); ctx.strokeStyle = fl('#4a3a28'); ctx.lineWidth = 4; ctx.stroke(); }
  if (P.horns === 'ice' || P.horns === 'spike') { const c = P.horns === 'ice' ? '#bfe8ff' : '#7a4aa8'; for (const [x, y, h, a] of [[-26, -112, 22, -0.5], [-6, -122, 26, -0.15], [16, -118, 22, 0.25], [34, -100, 16, 0.6]]) { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(-7, 2); ctx.lineTo(0, -h - 2); ctx.lineTo(7, 2); ctx.fill(); ctx.fillStyle = fl(c); ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(0, -h); ctx.lineTo(5, 0); ctx.fill(); ctx.restore(); } if (P.horns === 'ice') glowAt(ctx, 0, -126, 40, 'cold', 0.5); }
  if (P.horns === 'wing') { ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(10, -118); ctx.quadraticCurveTo(20, -150, 40, -152); ctx.moveTo(22, -114); ctx.quadraticCurveTo(40, -136, 56, -132); ctx.stroke(); ctx.fillStyle = '#b06aff'; ctx.beginPath(); ctx.arc(40, -152, 3, 0, TAU); ctx.arc(56, -132, 3, 0, TAU); ctx.fill(); }
  // め
  const ec = dazed ? '#555' : wind ? '#ffffff' : P.eye;
  const eyes = kit === 'queen' || kit === 'final' ? [[18, -90, 5], [32, -80, 3.6], [8, -102, 3.2], [36, -96, 2.6]] : [[16, -88, 4.6], [32, -84, 4]];
  for (const [x, y, r] of eyes) { ctx.fillStyle = '#0a060c'; ctx.beginPath(); ctx.arc(x, y, r + 1.5, 0, TAU); ctx.fill(); ctx.fillStyle = ec; ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, TAU); ctx.fill(); if (!dazed) glowAt(ctx, x, y, r * 4, P.ek, 0.9); }
  // くち
  const open = st === 'spitWind' || st === 'rainWind' ? 13 : st === 'punch' || st === 'slam' ? 8 : 3 + Math.sin(t * 2) * 1.5;
  ctx.fillStyle = '#0a050c'; ctx.beginPath(); ctx.ellipse(22, -60, 20, open, -0.1, 0, TAU); ctx.fill();
  ctx.fillStyle = kit === 'yeti' ? '#e8f4ff' : '#cfc6b8'; for (let i = 0; i < 5; i++) { const x = 6 + i * 7; ctx.beginPath(); ctx.moveTo(x, -60 - open * 0.8); ctx.lineTo(x + 3, -60 - open * 0.8 + 5); ctx.lineTo(x + 6, -60 - open * 0.8); ctx.fill(); }
  if (kit === 'yeti' && open > 6) { ctx.fillStyle = 'rgba(200,240,255,0.5)'; ctx.beginPath(); ctx.arc(46, -60, 9, 0, TAU); ctx.fill(); glowAt(ctx, 46, -60, 26, 'cold', 0.8); }
  ctx.restore();
  // うで
  const px = st === 'punch' ? 72 : st === 'punchWind' ? 10 : 44, py = st === 'punch' ? -62 : st === 'throwWind' ? -130 : -52;
  limb(ctx, [28, -78, (px + 28) / 2, py + 6, px, py], 13, fl(P.skin));
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(px, py, 15, 0, TAU); ctx.fill(); ctx.fillStyle = fl(P.dark); ctx.beginPath(); ctx.arc(px, py, 13, 0, TAU); ctx.fill();
  ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.beginPath(); for (let i = -1; i <= 1; i++) { ctx.moveTo(px + 10, py + i * 6); ctx.lineTo(px + 20, py + i * 8); } ctx.stroke();
  if (st === 'throwWind') { ctx.fillStyle = kit === 'yeti' ? '#bfe8ff' : '#4a4440'; ctx.beginPath(); ctx.arc(px, py - 16, 14, 0, TAU); ctx.fill(); if (kit === 'yeti') glowAt(ctx, px, py - 16, 30, 'cold', 0.7); }
  limb(ctx, [-28, -78, -44, -56, -38, -36], 12, fl(P.dark));
  ctx.restore();
  bossFx(ctx, b, g, b.y - 160);
}
// ぼうそう せんしゃ（マークなし）
function drawTank(ctx, b, g) {
  const flash = b.flashT > 0.06, t = g.time, st = b.state, dazed = st === 'dazed' || st === 'down';
  const fl = (c) => (flash ? '#fff' : c);
  ctx.save(); ctx.translate(b.x, b.y);
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.ellipse(0, GROUND - b.y, 100, 9, 0, 0, TAU); ctx.fill();
  if (b.dead) { ctx.globalAlpha = Math.max(0, 1 - b.t / 2); ctx.translate(0, b.t * 10); }
  ctx.scale(b.face, 1);
  const bump = Math.abs(b.vx) > 20 ? Math.sin(t * 30) * 1.2 : 0;
  // キャタピラ
  ctx.fillStyle = OUT; roundRect(ctx, -90, -34, 180, 36, 16); ctx.fill();
  ctx.fillStyle = fl('#26282a'); roundRect(ctx, -87, -31, 174, 30, 14); ctx.fill();
  const off = (b.x * 0.5) % 12;
  ctx.fillStyle = '#3a3c40'; for (let x = -84; x < 84; x += 12) ctx.fillRect(x + ((off + 12) % 12) * 0, -31, 5, 4);
  for (let i = 0; i < 6; i++) { const wx = -70 + i * 28; ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(wx, -15, 11, 0, TAU); ctx.fill(); ctx.fillStyle = fl('#4a4e46'); ctx.beginPath(); ctx.arc(wx, -15, 9, 0, TAU); ctx.fill(); ctx.strokeStyle = '#2a2c28'; ctx.lineWidth = 2; const ra = b.x * 0.05; ctx.beginPath(); ctx.moveTo(wx + Math.cos(ra) * 8, -15 + Math.sin(ra) * 8); ctx.lineTo(wx - Math.cos(ra) * 8, -15 - Math.sin(ra) * 8); ctx.stroke(); }
  ctx.translate(0, bump);
  // しゃたい
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(-92, -32); ctx.lineTo(96, -32); ctx.lineTo(84, -66); ctx.lineTo(-84, -66); ctx.fill();
  const hg = ctx.createLinearGradient(0, -66, 0, -32); hg.addColorStop(0, fl('#5a6448')); hg.addColorStop(1, fl('#343a2a')); ctx.fillStyle = hg;
  ctx.beginPath(); ctx.moveTo(-89, -34); ctx.lineTo(93, -34); ctx.lineTo(82, -63); ctx.lineTo(-82, -63); ctx.fill();
  if (!flash) { ctx.fillStyle = 'rgba(90,50,30,0.5)'; for (const [x, y, w] of [[-60, -50, 18], [20, -44, 24], [60, -56, 12]]) ctx.fillRect(x, y, w, 5); ctx.fillStyle = '#1e2218'; for (let x = -76; x < 80; x += 16) { ctx.beginPath(); ctx.arc(x, -38, 1.4, 0, TAU); ctx.fill(); } ctx.fillStyle = 'rgba(70,140,50,0.55)'; ctx.beginPath(); ctx.ellipse(-30, -60, 12, 3, 0, 0, TAU); ctx.fill(); }
  // ほうとう
  const aim = st === 'shellWind' ? -0.18 : st === 'burst' || st === 'burstWind' ? 0.02 : -0.06 + Math.sin(t) * 0.03;
  ctx.save(); ctx.translate(10, -78); ctx.rotate(aim);
  ctx.fillStyle = OUT; ctx.fillRect(20, -6, 72, 12); ctx.fillStyle = fl('#3e4632'); ctx.fillRect(22, -4, 68, 8); ctx.fillStyle = OUT; ctx.fillRect(84, -7, 10, 14);
  ctx.restore();
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(6, -76, 44, 18, 0, Math.PI, TAU); ctx.lineTo(50, -62); ctx.lineTo(-38, -62); ctx.fill();
  ctx.fillStyle = fl('#4e5a3c'); ctx.beginPath(); ctx.ellipse(6, -76, 41, 15.5, 0, Math.PI, TAU); ctx.lineTo(47, -64); ctx.lineTo(-35, -64); ctx.fill();
  // きじゅう と ゾンビ の のりて
  ctx.fillStyle = OUT; ctx.fillRect(-16, -100, 12, 10); ctx.fillStyle = fl('#7b8771'); ctx.beginPath(); ctx.arc(-10, -104, 7, 0, TAU); ctx.fill();
  ctx.fillStyle = fl('#3e3d2c'); ctx.beginPath(); ctx.arc(-10, -106, 7.5, Math.PI, TAU); ctx.fill();
  eyesGlow(ctx, [[-6.5, -104]], dazed ? '#555' : '#d9e48a', 1.4, dazed ? null : 'green');
  ctx.fillStyle = OUT; ctx.fillRect(-4, -99, 26, 5); ctx.fillStyle = '#2a2c30'; ctx.fillRect(-3, -98, 24, 3);
  // まえの ライト
  ctx.fillStyle = dazed ? '#444' : '#fff2c0'; ctx.beginPath(); ctx.arc(86, -50, 4, 0, TAU); ctx.fill();
  if (!dazed) glowAt(ctx, 86, -50, 26, 'warm', 0.9);
  if (st === 'burst' && Math.sin(t * 60) > 0) { ctx.fillStyle = '#ffe9a0'; ctx.beginPath(); ctx.arc(80, -62, 6, 0, TAU); ctx.fill(); glowAt(ctx, 80, -62, 30, 'warm', 1); }
  if (dazed || b.hp < b.maxHp * 0.35) for (let i = 0; i < 3; i++) { const p = (t * 0.8 + i / 3) % 1; ctx.fillStyle = `rgba(60,58,56,${0.6 * (1 - p)})`; ctx.beginPath(); ctx.arc(-50 + i * 6 + p * 10, -70 - p * 60, 6 + p * 12, 0, TAU); ctx.fill(); }
  ctx.restore();
  if (!dazed && !b.dead) LIGHTS.push(b.x + b.face * 90 - (g.vx ?? g.camX), b.y - 50, 140, 0.6);
  bossFx(ctx, b, g, b.y - 130);
}
// ゾンビ ヘリ（マークなし）
function drawHeli(ctx, b, g) {
  const flash = b.flashT > 0.06, t = g.time, st = b.state, dazed = st === 'dazed' || st === 'down';
  const fl = (c) => (flash ? '#fff' : c);
  const cam = g.vx ?? g.camX;
  // サーチライト
  if (!dazed && !b.dead) {
    const lx = b.x + b.face * 40, ly = b.y - 6, tx = clamp(g.player.x, lx - 160, lx + 160);
    ctx.fillStyle = 'rgba(255,246,200,0.09)'; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(tx - 50, GROUND); ctx.lineTo(tx + 50, GROUND); ctx.closePath(); ctx.fill();
    LIGHTS.push(tx - cam, GROUND - 20, 120, 0.8); LIGHTS.push(lx - cam, ly, 60, 0.8); glowAt(ctx, lx, ly, 18, 'warm', 1);
  }
  ctx.save(); ctx.translate(b.x, b.y);
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(0, GROUND - b.y, 70, 6, 0, 0, TAU); ctx.fill();
  if (b.dead) { ctx.globalAlpha = Math.max(0, 1 - b.t / 2); ctx.rotate(b.t * 0.6); }
  ctx.scale(b.face, 1);
  const tilt = clamp(b.vx / 600, -0.18, 0.18) * b.face + (dazed ? -0.12 : 0); ctx.rotate(tilt);
  // しっぽ
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(-40, -40); ctx.lineTo(-120, -46); ctx.lineTo(-120, -34); ctx.lineTo(-40, -22); ctx.fill();
  ctx.fillStyle = fl('#3e4636'); ctx.beginPath(); ctx.moveTo(-40, -38); ctx.lineTo(-118, -44); ctx.lineTo(-118, -36); ctx.lineTo(-40, -25); ctx.fill();
  const tr = (b.rotor || 0) * 1.4; ctx.strokeStyle = 'rgba(40,42,40,0.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-120 + Math.cos(tr) * 14, -40 + Math.sin(tr) * 14); ctx.lineTo(-120 - Math.cos(tr) * 14, -40 - Math.sin(tr) * 14); ctx.stroke();
  // からだ
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(6, -32, 58, 30, 0, 0, TAU); ctx.fill();
  const bg = ctx.createLinearGradient(0, -62, 0, -4); bg.addColorStop(0, fl('#5a6448')); bg.addColorStop(1, fl('#2c3224')); ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(6, -32, 55, 27, 0, 0, TAU); ctx.fill();
  // まど と ゾンビの パイロット
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(36, -38, 22, 16, 0.2, -Math.PI * 0.9, Math.PI * 0.4); ctx.fill();
  ctx.fillStyle = fl('#1c2a30'); ctx.beginPath(); ctx.ellipse(36, -38, 19, 13.5, 0.2, -Math.PI * 0.9, Math.PI * 0.4); ctx.fill();
  ctx.fillStyle = fl('#7b8771'); ctx.beginPath(); ctx.arc(30, -40, 6, 0, TAU); ctx.fill();
  eyesGlow(ctx, [[33, -41]], dazed ? '#555' : '#d9e48a', 1.3, dazed ? null : 'green');
  ctx.fillStyle = 'rgba(200,230,255,0.18)'; ctx.beginPath(); ctx.ellipse(42, -44, 8, 3, 0.4, 0, TAU); ctx.fill();
  if (!flash) { ctx.fillStyle = 'rgba(90,50,30,0.45)'; ctx.fillRect(-30, -24, 20, 5); ctx.fillStyle = '#1e2218'; ctx.fillRect(-10, -50, 3, 30); }
  // スキッド
  ctx.strokeStyle = OUT; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-34, -2); ctx.lineTo(44, -2); ctx.moveTo(-20, -8); ctx.lineTo(-22, -2); ctx.moveTo(26, -8); ctx.lineTo(28, -2); ctx.stroke();
  // きじゅう ポッド
  ctx.fillStyle = OUT; ctx.fillRect(28, -14, 30, 9); ctx.fillStyle = '#2a2c30'; ctx.fillRect(30, -12.5, 28, 6);
  if (st === 'burst' && Math.sin(t * 60) > 0) { ctx.fillStyle = '#ffe9a0'; ctx.beginPath(); ctx.arc(62, -9, 5, 0, TAU); ctx.fill(); glowAt(ctx, 62, -9, 26, 'warm', 1); }
  // ローター
  ctx.fillStyle = OUT; ctx.fillRect(0, -66, 8, 8);
  const rs = Math.sin(b.rotor || 0); ctx.fillStyle = 'rgba(30,32,30,0.85)'; ctx.fillRect(4 - 90 * Math.abs(rs), -68, 180 * Math.abs(rs), 3);
  ctx.fillStyle = 'rgba(120,120,120,0.12)'; ctx.beginPath(); ctx.ellipse(4, -67, 92, 5, 0, 0, TAU); ctx.fill();
  // あかりの ランプ（みどり）
  if (Math.sin(t * 6) > 0.4) { ctx.fillStyle = '#7aff6a'; ctx.beginPath(); ctx.arc(-118, -46, 2.2, 0, TAU); ctx.fill(); glowAt(ctx, -118, -46, 12, 'green', 1); }
  if (dazed || b.hp < b.maxHp * 0.35) for (let i = 0; i < 3; i++) { const p = (t * 0.9 + i / 3) % 1; ctx.fillStyle = `rgba(60,58,56,${0.6 * (1 - p)})`; ctx.beginPath(); ctx.arc(-20 - p * 30, -50 - p * 50, 5 + p * 12, 0, TAU); ctx.fill(); }
  ctx.restore();
  bossFx(ctx, b, g, b.y - 90);
}

// v0.6.0 ステージ 6〜15 の くうき（ゆき・ほうし・しずく・ひばな・ひのこ・あめ・ちり）
function drawAtmos2(ctx, g, AT, cam, vw) {
  const t = g.time, wrap = (v, m) => ((v % m) + m) % m;
  if (AT === 'snow') {
    const gx = (g.gust || 0), n = gx ? 150 : 80, sp = 40 + Math.abs(gx) * 260;
    ctx.fillStyle = 'rgba(235,245,255,0.75)';
    for (let i = 0; i < n; i++) { const x = wrap(hash(i) * 900 - cam * 1.05 + Math.sin(t + i) * 12 + t * sp * (gx || 0.15), 900) - 100, y = wrap(hash(i + 40) * 400 + t * (50 + hash(i + 7) * 40), 400) - 20, r = 1 + hash(i + 9) * 1.6; ctx.fillRect(x, y, r, r); }
    if (gx) { ctx.strokeStyle = 'rgba(230,240,255,0.25)'; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i < 30; i++) { const x = wrap(hash(i + 500) * 900 + t * 600 * gx, 900) - 100, y = hash(i + 600) * 360; ctx.moveTo(x, y); ctx.lineTo(x - gx * 40, y + 3); } ctx.stroke(); ctx.fillStyle = 'rgba(220,235,250,0.12)'; ctx.fillRect(0, 0, vw, H); }
  } else if (AT === 'spores') {
    for (let i = 0; i < 36; i++) { const x = wrap(hash(i + 90) * 800 - cam * 0.85 + Math.sin(t * 0.6 + i) * 26, 800) - 60, y = wrap(hash(i + 70) * 400 - t * (8 + (i % 5) * 4), 400); const a = 0.25 + 0.3 * Math.sin(t * 2 + i); ctx.fillStyle = i % 3 ? `rgba(160,230,120,${a})` : `rgba(200,140,255,${a})`; ctx.beginPath(); ctx.arc(x, y, 1.4 + (i % 3) * 0.5, 0, TAU); ctx.fill(); }
  } else if (AT === 'drip') {
    ctx.fillStyle = 'rgba(150,190,200,0.5)';
    for (let i = 0; i < 26; i++) { const x = wrap(hash(i + 20) * 800 - cam, 800) - 60, y = wrap(hash(i + 60) * 420 + t * 300, 420) - 20; ctx.fillRect(x, y, 1.4, 5); }
    ctx.strokeStyle = 'rgba(150,190,200,0.3)'; ctx.beginPath(); for (let i = 0; i < 10; i++) { const x = wrap(hash(i + 400) * 800 - cam, 800) - 60, p = (t * 1.5 + hash(i + 9)) % 1; ctx.ellipse(x, GROUND + 4, 2 + p * 8, 0.6 + p * 1.6, 0, 0, TAU); } ctx.stroke();
  } else if (AT === 'sparks') {
    for (let i = 0; i < 28; i++) { const k = (t * (0.6 + hash(i) * 0.6) + hash(i + 5)) % 1, x = wrap(hash(i + 90) * 800 - cam * 0.9, 800) - 60 + (hash(i + 3) - 0.5) * 80 * k, y = 40 + k * 260 + k * k * 60; ctx.fillStyle = i % 2 ? `rgba(140,220,255,${1 - k})` : `rgba(255,230,140,${1 - k})`; ctx.fillRect(x, y, 2, 2); }
  } else if (AT === 'embers') {
    for (let i = 0; i < 34; i++) { const x = wrap(hash(i + 90) * 800 - cam * 0.9 + Math.sin(t + i) * 30, 800) - 60, y = wrap(hash(i + 70) * 400 - t * (40 + (i % 7) * 9), 400); const a = 0.35 + 0.45 * Math.sin(t * 5 + i); ctx.fillStyle = `rgba(255,${80 + (i % 5) * 22},40,${a})`; ctx.fillRect(x, y, 2, 2); }
  } else if (AT === 'rain') {
    ctx.strokeStyle = 'rgba(170,185,210,0.3)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 0; i < 110; i++) { const x = wrap(hash(i) * 900 - cam * 1.1 - t * 180, 900) - 100, y = wrap(hash(i + 50) * 400 + t * 780, 400) - 20; ctx.moveTo(x, y); ctx.lineTo(x - 7, y + 18); }
    ctx.stroke();
  } else {
    ctx.fillStyle = 'rgba(170,160,150,0.4)';
    for (let i = 0; i < 34; i++) { const x = wrap(hash(i) * 800 - cam * 0.9 + Math.sin(t * 0.7 + i) * 20 - t * 14, 800) - 60, y = wrap(hash(i + 30) * 400 + t * (18 + hash(i + 3) * 26), 400) - 20; ctx.fillRect(x, y, 2, 1.4); }
  }
}

const THEMES = {
  lab:    { far: labFar, mid: labMid, floor: labFloor, fore: labFore, lights: labLights, wstep: 640, wx0: 450, wy: 150, dark: 0.66 },
  manor:  { far: manorFar, mid: manorMid, floor: manorFloor, fore: manorFore, lights: manorLights, wstep: 320, wx0: 160, wy: 170, dark: 0.62 },
  city:   { far: cityFar, mid: cityMid, floor: cityFloor, fore: cityFore, lights: cityLights, wstep: 0, dark: 0.6 },
  subway: { far: subwayFar, mid: subwayMid, floor: subwayFloor, fore: subwayFore, lights: subwayLights, wstep: 0, dark: 0.7 },
  tower:  { far: towerFar, mid: towerMid, floor: towerFloor, fore: towerFore, lights: towerLights, wstep: 320, wx0: 160, wy: 150, wkey: 'ember', dark: 0.6 },
  ...THEMES2,
  dawn: DAWN_THEME,
};
export { WEAPONS, drawGun };
