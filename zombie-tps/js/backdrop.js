// v0.5.0: とおくの うごく はいけい（2Dの えを カメラの まわりの つつに はる）
// ドローコールは 1つだけ。キャンバスは ときどき（1びょうに 6かい くらい）かきなおす
import * as THREE from '../vendor/three.module.min.js';

const TAU = Math.PI * 2;
function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

const W = 1024, H = 192, BASE = 168; // BASE: ちへいせん（これより したは じめんの かげ）

// マップごとの はいけい（かくう の けしき・マークなし）
export const BACKDROPS = {
  city: { sil: '#141720', sil2: '#1d2230', glow: '#ff7a2a', fires: 5, smoke: 4, search: 2, heli: true, bolt: 0.5, cloud: '#2a2630', moon: 0xc8a8ff },
  mall: { sil: '#16161e', sil2: '#21212c', glow: '#ff8a3a', fires: 2, smoke: 2, search: 1, heli: true, bolt: 0.4, cloud: '#26262e', neon: true, moon: 0xd0a8ff },
  base: { sil: '#121510', sil2: '#1b2018', glow: '#ffa040', fires: 3, smoke: 3, search: 3, heli: true, bolt: 0.3, cloud: '#22261e', flares: true, moon: 0xa8ffb0 },
  hospital: { sil: '#121816', sil2: '#1a2420', glow: '#9aff9a', fires: 1, smoke: 2, search: 1, heli: false, bolt: 1, cloud: '#202a26', moon: 0xb0ffc0 },
  camp: { sil: '#0c140e', sil2: '#142018', glow: '#ff9a40', fires: 1, smoke: 1, search: 0, heli: true, bolt: 0.8, cloud: '#1c241e', flies: true, moon: 0x9aff9a },
  flood: { sil: '#10191a', sil2: '#1b2b29', glow: '#87a66a', fires: 1, smoke: 2, search: 0, heli: false, bolt: 0.3, cloud: '#172622', beacon: true, moon: 0x9ac7a9 },
  harbor: { sil: '#10141c', sil2: '#18202c', glow: '#ff7a30', fires: 2, smoke: 3, search: 1, heli: true, bolt: 0.6, cloud: '#20242e', beacon: true, moon: 0xc0a8ff },
  rooftop: { sil: '#12141c', sil2: '#1a1e2a', glow: '#ff6a2a', fires: 6, smoke: 5, search: 3, heli: true, bolt: 0.45, cloud: '#26222c', moon: 0xd0a0ff },
  office: { sil: '#101318', sil2: '#191d24', glow: '#ff5a20', fires: 4, smoke: 6, search: 1, heli: false, bolt: 0.7, cloud: '#241e22', moon: 0xffa890 },
};

function paintBase(id, cfg) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), R = rng(id.length * 977 + id.charCodeAt(0));
  const wrapRect = (x, y, w, h) => { g.fillRect(x, y, w, h); if (x + w > W) g.fillRect(x - W, y, w, h); };
  const windows = [];
  const tower = (x, w, h, col, lit = 0.12) => {
    g.fillStyle = col; wrapRect(x, BASE - h, w, h + (H - BASE));
    for (let yy = BASE - h + 4; yy < BASE - 3; yy += 6) for (let xx = x + 2; xx < x + w - 2; xx += 5) if (R() < lit) windows.push([xx % W, yy]);
  };
  // とおくの やま（すべての マップ）
  g.fillStyle = cfg.sil2; g.beginPath(); g.moveTo(0, H);
  for (let x = 0; x <= W; x += 16) g.lineTo(x, BASE - 22 - Math.sin(x / W * TAU * 3) * 10 - Math.sin(x / W * TAU * 7 + 1) * 6);
  g.lineTo(W, H); g.fill();
  if (id === 'city' || id === 'hospital' || id === 'mall') {
    for (let x = 0; x < W;) { const w = 18 + R() * 34, h = id === 'mall' ? 14 + R() * 30 : 30 + R() * (id === 'city' ? 90 : 60); tower(x, w, h * 0.7, cfg.sil2, 0.05); x += w + R() * 12; }
    for (let x = 0; x < W;) {
      const w = 22 + R() * 40, h = id === 'mall' ? 10 + R() * 26 : 20 + R() * (id === 'city' ? 70 : 46);
      tower(x, w, h, cfg.sil, id === 'hospital' ? 0.22 : 0.14);
      if (id === 'city' && R() < 0.3) { g.fillStyle = cfg.sil; wrapRect(x + w / 2, BASE - h - 14, 2, 14); } // アンテナ
      x += w + R() * 18;
    }
    if (id === 'mall') { // こうそくどうろ と かんばん（もじは かくう）
      g.fillStyle = '#0c0c12'; g.fillRect(0, BASE - 26, W, 5); for (let x = 20; x < W; x += 90) g.fillRect(x, BASE - 21, 6, 24);
      for (const sx of [140, 620]) { g.fillStyle = '#0c0c12'; g.fillRect(sx, BASE - 70, 4, 50); g.fillRect(sx - 30, BASE - 92, 64, 24); }
    }
  } else if (id === 'rooftop') { // たかい ビルの まち: タンク・アンテナ
    for (let x = 0; x < W;) { const w = 16 + R() * 30; tower(x, w, 50 + R() * 90, cfg.sil2, 0.05); x += w + R() * 8; }
    for (let x = 0; x < W;) {
      const w = 20 + R() * 36, h = 40 + R() * 80;
      tower(x, w, h, cfg.sil, 0.16); g.fillStyle = cfg.sil;
      if (R() < 0.35) { wrapRect(x + w * 0.3, BASE - h - 12, 10, 8); wrapRect(x + w * 0.3 + 1, BASE - h - 4, 2, 4); wrapRect(x + w * 0.3 + 7, BASE - h - 4, 2, 4); } // みずの タンク
      else if (R() < 0.4) wrapRect(x + w / 2, BASE - h - 18, 2, 18);
      x += w + R() * 14;
    }
  } else if (id === 'office') { // こわれた ビル: ぎざぎざの やね
    for (let x = 0; x < W;) { const w = 18 + R() * 30; tower(x, w, 34 + R() * 70, cfg.sil2, 0.03); x += w + R() * 10; }
    for (let x = 0; x < W;) {
      const w = 24 + R() * 40, h = 30 + R() * 70;
      tower(x, w, h, cfg.sil, 0.06); g.fillStyle = cfg.sil;
      g.beginPath(); g.moveTo(x, BASE - h); for (let k = 0; k <= 6; k++) g.lineTo(x + w * k / 6, BASE - h - (k % 2 ? 4 + R() * 14 : R() * 4)); g.lineTo(x + w, BASE - h); g.fill();
      if (R() < 0.3) { g.strokeStyle = cfg.sil; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x + w * 0.7, BASE - h); g.lineTo(x + w * 0.9, BASE - h - 20); g.lineTo(x + w * 1.05, BASE - h - 26); g.stroke(); } // クレーンの のこり
      x += w + R() * 20;
    }
  } else if (id === 'base') {
    for (const tx of [120, 380, 700, 900]) { g.fillStyle = cfg.sil; g.fillRect(tx, BASE - 46, 3, 46); g.fillRect(tx + 20, BASE - 46, 3, 46); g.fillRect(tx - 4, BASE - 56, 32, 12); g.strokeStyle = cfg.sil; g.lineWidth = 1.5; g.beginPath(); for (let y = BASE - 44; y < BASE; y += 14) { g.moveTo(tx, y); g.lineTo(tx + 22, y + 14); g.moveTo(tx + 22, y); g.lineTo(tx, y + 14); } g.stroke(); }
    g.fillStyle = cfg.sil; g.fillRect(0, BASE - 12, W, 12 + H - BASE); for (let x = 0; x < W; x += 12) g.fillRect(x, BASE - 20, 1.5, 8);
    for (let x = 30; x < W; x += 140 + R() * 80) { g.beginPath(); g.moveTo(x, BASE - 12); g.lineTo(x + 30, BASE - 34); g.lineTo(x + 60, BASE - 12); g.fill(); }
  } else if (id === 'camp') {
    const pines = (col, y0, n, s) => { g.fillStyle = col; for (let i = 0; i < n; i++) { const x = R() * W, h = (30 + R() * 40) * s; for (const dx of [0, -W, W]) { g.beginPath(); g.moveTo(x + dx - h * 0.28, y0); g.lineTo(x + dx, y0 - h); g.lineTo(x + dx + h * 0.28, y0); g.fill(); } } g.fillRect(0, y0 - 2, W, H - y0 + 2); };
    pines(cfg.sil2, BASE - 8, 70, 0.8); pines(cfg.sil, BASE + 4, 60, 1.1);
  } else if (id === 'harbor') {
    g.fillStyle = '#0a1018'; g.fillRect(0, BASE - 4, W, H - BASE + 4);
    for (const [x, L] of [[60, 160], [420, 120], [760, 200]]) { g.fillStyle = cfg.sil; g.fillRect(x, BASE - 16, L, 12); g.fillRect(x + L * 0.65, BASE - 34, L * 0.18, 18); g.fillRect(x + L * 0.1, BASE - 24, L * 0.4, 8); }
    for (const x of [260, 600, 940]) { g.fillStyle = cfg.sil; g.fillRect(x, BASE - 70, 4, 66); g.fillRect(x + 30, BASE - 70, 4, 66); g.fillRect(x - 20, BASE - 74, 90, 5); g.fillRect(x + 50, BASE - 80, 5, 10); }
    g.fillStyle = cfg.sil; g.fillRect(990, BASE - 60, 8, 56); g.fillRect(986, BASE - 66, 16, 8); // とうだい
  }
  return { canvas: c, windows };
}

export class Backdrop {
  constructor(scene, quality = 1) {
    this.canvas = document.createElement('canvas'); this.canvas.width = W; this.canvas.height = H;
    this.ctx = this.canvas.getContext('2d');
    const t = this.tex = new THREE.CanvasTexture(this.canvas);
    t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.repeat.set(2, 1);
    t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
    // つつ（うちがわを みる）: はんけい 110・たかさ 46
    const geo = new THREE.CylinderGeometry(110, 110, 46, 40, 1, true);
    geo.translate(0, 46 / 2 - 6, 0);
    this.mat = new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, transparent: true, fog: false, depthWrite: false });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.renderOrder = -1; this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    this.rate = quality === 0 ? 1 / 4 : 1 / 7; this.acc = 1; this.t = 0;
    this.flash = 0; this.boltT = 3; this.bolt = null; this.dark = 0;
    this.heli = { x: -200, y: 40, v: 0, next: 4 };
  }

  setMap(id) {
    this.id = BACKDROPS[id] ? id : 'city';
    this.cfg = BACKDROPS[this.id];
    this.base = paintBase(this.id, this.cfg);
    const R = rng(31 + this.id.length);
    this.fires = Array.from({ length: this.cfg.fires }, () => ({ x: R() * W, s: 0.6 + R() * 0.9, ph: R() * 6 }));
    this.smokes = Array.from({ length: this.cfg.smoke }, (_, i) => ({ x: this.fires[i % Math.max(1, this.fires.length)]?.x ?? R() * W, ph: R() * 10 }));
    this.searches = Array.from({ length: this.cfg.search }, () => ({ x: R() * W, ph: R() * 6, sp: 0.25 + R() * 0.3 }));
    this.clouds = Array.from({ length: 7 }, () => ({ x: R() * W, y: 6 + R() * 50, w: 120 + R() * 200, h: 14 + R() * 22, v: 3 + R() * 5 }));
    this.acc = 1;
  }

  // dark: 0（ひる）〜 1（よる）
  // far: きりの おわり。つつを その すこし てまえに おく（きりで みえない とおくの はこに かくれない）
  update(dt, cam, dark, far = 60) {
    this.t += dt; this.dark = dark;
    const sc = Math.min(1, Math.max(0.3, (far - 2) / 110));
    this.mesh.scale.setScalar(sc);
    this.mesh.position.set(cam.x, Math.max(0, cam.y - 1.6) * 0.8, cam.z);
    // かみなり
    this.flash = Math.max(0, this.flash - dt * 5);
    this.boltT -= dt;
    if (this.boltT <= 0) {
      this.boltT = (4 + Math.random() * 8) / Math.max(0.25, this.cfg.bolt * (0.8 + dark));
      if (dark > 0.25) { this.flash = 1; this.bolt = { x: Math.random() * W, life: 0.25, seed: (Math.random() * 1e6) | 0 }; this.acc = this.rate; }
    }
    if (this.bolt) { this.bolt.life -= dt; if (this.bolt.life <= 0) this.bolt = null; }
    // ヘリコプター
    const h = this.heli;
    if (this.cfg.heli) {
      if (h.v === 0) { h.next -= dt; if (h.next <= 0) { h.v = (Math.random() < 0.5 ? -1 : 1) * (40 + Math.random() * 30); h.x = h.v > 0 ? -60 : W + 60; h.y = 30 + Math.random() * 50; } }
      else { h.x += h.v * dt; if (h.x < -80 || h.x > W + 80) { h.v = 0; h.next = 14 + Math.random() * 18; } }
    }
    this.acc += dt;
    if (this.acc < this.rate) return this.flash;
    this.acc = 0;
    this.draw();
    return this.flash;
  }

  draw() {
    const g = this.ctx, cfg = this.cfg, t = this.t, dark = this.dark;
    g.clearRect(0, 0, W, H);
    // くも（ゆっくり ながれる）
    g.fillStyle = cfg.cloud; g.globalAlpha = 0.55 + 0.25 * dark;
    for (const c of this.clouds) {
      const x = ((c.x + t * c.v) % (W + c.w)) - c.w;
      for (const dx of [0, W]) { g.beginPath(); g.ellipse(x + dx, c.y + 20, c.w / 2, c.h / 2, 0, 0, TAU); g.fill(); }
    }
    g.globalAlpha = 1;
    // サーチライト（そらを はく ひかり）
    for (const s of this.searches) {
      const a = Math.sin(t * s.sp + s.ph) * 0.7;
      const x0 = s.x, y0 = BASE - 10, len = 170;
      const grd = g.createLinearGradient(x0, y0, x0 + Math.sin(a) * len, y0 - Math.cos(a) * len);
      grd.addColorStop(0, `rgba(230,240,255,${0.28 + 0.2 * dark})`); grd.addColorStop(1, 'rgba(230,240,255,0)');
      g.fillStyle = grd; g.beginPath(); g.moveTo(x0 - 2, y0); g.lineTo(x0 + Math.sin(a - 0.09) * len, y0 - Math.cos(a - 0.09) * len); g.lineTo(x0 + Math.sin(a + 0.09) * len, y0 - Math.cos(a + 0.09) * len); g.lineTo(x0 + 2, y0); g.fill();
    }
    // とうだいの ひかり（みなと）
    if (cfg.beacon) { const a = t * 1.3; const k = Math.max(0, Math.cos(a)); g.fillStyle = `rgba(255,240,190,${0.15 + 0.5 * k})`; g.beginPath(); g.moveTo(994, BASE - 62); g.lineTo(994 - 260 * Math.sin(a) - 40, BASE - 80); g.lineTo(994 - 260 * Math.sin(a) - 40, BASE - 46); g.fill(); }
    // けむりの はしら
    for (const s of this.smokes) {
      for (let i = 0; i < 7; i++) {
        const k = ((t * 0.12 + s.ph + i / 7) % 1);
        const y = BASE - 10 - k * 140, r = 8 + k * 26, x = s.x + Math.sin(k * 3 + s.ph) * 10 + k * 40;
        g.fillStyle = `rgba(${70 - k * 40},${44 - k * 20},${40 - k * 10},${0.6 * (1 - k)})`;
        for (const dx of [0, -W]) { g.beginPath(); g.arc(x + dx, y, r, 0, TAU); g.fill(); }
      }
    }
    // シルエット
    g.drawImage(this.base.canvas, 0, 0);
    // まどの あかり（ちかちか）
    const win = cfg.id === 'hospital' ? '160,255,170' : '255,210,140';
    for (let i = 0; i < this.base.windows.length; i++) {
      const [x, y] = this.base.windows[i];
      const f = Math.sin(t * 2.3 + i * 12.9) > 0.92 ? 0.15 : 1;
      g.fillStyle = `rgba(${this.id === 'hospital' ? '160,255,170' : '255,210,140'},${(0.35 + 0.5 * dark) * f})`; g.fillRect(x, y, 2, 2);
    }
    // ほのお（もえている まち）
    for (const f of this.fires) {
      const fl = 0.7 + 0.3 * Math.sin(t * 11 + f.ph) * Math.sin(t * 4.3 + f.ph * 2);
      const r = 34 * f.s * fl;
      for (const dx of [0, -W, W]) {
        const x = f.x + dx; if (x < -60 || x > W + 60) continue;
        const grd = g.createRadialGradient(x, BASE - 4, 2, x, BASE - 4, r * 1.8);
        grd.addColorStop(0, `rgba(255,200,120,${0.9 * fl})`); grd.addColorStop(0.35, cfg.glow); grd.addColorStop(1, 'rgba(255,90,20,0)');
        g.globalAlpha = 0.85; g.fillStyle = grd; g.fillRect(x - r * 2, BASE - 4 - r * 2, r * 4, r * 2.2); g.globalAlpha = 1;
        g.fillStyle = `rgba(255,170,70,${fl})`;
        for (let k = 0; k < 4; k++) { const fx = x - 8 * f.s + k * 5 * f.s, fh = (6 + 10 * Math.abs(Math.sin(t * 9 + k + f.ph))) * f.s; g.beginPath(); g.moveTo(fx - 3, BASE); g.lineTo(fx, BASE - fh); g.lineTo(fx + 3, BASE); g.fill(); }
      }
    }
    // ネオン（モール・かくうの もじ）
    if (cfg.neon) for (const [sx, txt] of [[140, 'モール'], [620, 'セール']]) {
      const on = Math.sin(t * 7 + sx) > -0.6 ? 1 : 0.2;
      g.font = '900 16px system-ui, sans-serif'; g.fillStyle = `rgba(255,90,200,${0.85 * on})`; g.fillText(txt, sx - 22, BASE - 74);
    }
    // フレア（みどりの ひかりが ゆっくり おちる・きち）
    if (cfg.flares) for (let i = 0; i < 2; i++) {
      const k = (t * 0.07 + i * 0.5) % 1, x = 300 + i * 420 + Math.sin(t + i) * 10, y = 20 + k * 120;
      const grd = g.createRadialGradient(x, y, 0, x, y, 18); grd.addColorStop(0, `rgba(170,255,150,${1 - k})`); grd.addColorStop(1, 'rgba(170,255,150,0)'); g.fillStyle = grd; g.fillRect(x - 18, y - 18, 36, 36);
    }
    // ほたる（もり）
    if (cfg.flies && dark > 0.3) { g.fillStyle = 'rgba(200,255,140,0.8)'; for (let i = 0; i < 40; i++) { const x = (i * 97.3 + Math.sin(t * 0.7 + i) * 14) % W, y = BASE - 6 - ((i * 37) % 30) + Math.sin(t * 1.3 + i * 2) * 4; if (Math.sin(t * 3 + i * 5) > 0) g.fillRect(x, y, 2, 2); } }
    // ヘリコプター（シルエット・ライトが ちかちか）
    const h = this.heli;
    if (h.v !== 0) {
      const d = Math.sign(h.v), x = h.x, y = h.y;
      g.fillStyle = '#07080c';
      g.beginPath(); g.ellipse(x, y, 13, 6, 0, 0, TAU); g.fill();
      g.fillRect(x - d * 28, y - 2, d * 18, 3); g.fillRect(x - d * 30, y - 6, 3, 8);
      const rw = 22 * Math.abs(Math.sin(t * 40)); g.fillRect(x - rw, y - 8, rw * 2, 1.5);
      g.fillRect(x - 8, y + 6, 16, 1.5);
      if (Math.sin(t * 9) > 0.3) { g.fillStyle = '#ff5050'; g.fillRect(x - d * 29, y - 7, 2, 2); }
      const grd = g.createLinearGradient(x, y, x + d * 30, y + 60); grd.addColorStop(0, 'rgba(255,250,220,0.35)'); grd.addColorStop(1, 'rgba(255,250,220,0)');
      g.fillStyle = grd; g.beginPath(); g.moveTo(x + d * 6, y + 4); g.lineTo(x + d * 10 - 18, y + 70); g.lineTo(x + d * 10 + 18, y + 70); g.fill();
    }
    // かみなり
    if (this.bolt) {
      const R = rng(this.bolt.seed); let x = this.bolt.x, y = 0;
      g.strokeStyle = 'rgba(220,230,255,0.95)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y);
      while (y < BASE - 30) { x += (R() - 0.5) * 26; y += 8 + R() * 14; g.lineTo(x, y); }
      g.stroke();
      g.fillStyle = `rgba(200,210,255,${0.18 * this.flash})`; g.fillRect(0, 0, W, H);
    }
    this.tex.needsUpdate = true;
  }

  dispose() { this.mesh.geometry.dispose(); this.mat.dispose(); this.tex.dispose(); }
}
