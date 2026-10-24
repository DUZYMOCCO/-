// ドットえの テクスチャ（16x16・canvas で その場で つくる。がぞう ファイル なし）
import * as THREE from '../vendor/three.module.min.js';

function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function hex(c) { return '#' + c.toString(16).padStart(6, '0'); }
function shade(c, f) {
  const r = Math.min(255, Math.max(0, ((c >> 16) & 255) * f)) | 0, g = Math.min(255, Math.max(0, ((c >> 8) & 255) * f)) | 0, b = Math.min(255, Math.max(0, (c & 255) * f)) | 0;
  return (r << 16) | (g << 8) | b;
}

export function makeCanvas(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h); return c;
}

function tex(canvas, repeat = true) {
  const t = new THREE.CanvasTexture(canvas);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapLinearFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 2;
  return t;
}

function noiseFill(base, amt, seed, size = 16) {
  return makeCanvas(size, size, (g) => {
    const r = rng(seed);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      g.fillStyle = hex(shade(base, 1 + (r() - 0.5) * amt)); g.fillRect(x, y, 1, 1);
    }
  });
}

export function buildTextures() {
  const T = {};
  // くさ
  T.grass = tex(makeCanvas(16, 16, (g) => {
    const r = rng(11);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const v = r(); const c = v < 0.08 ? 0x6fae3e : v < 0.16 ? 0x4b7f28 : shade(0x5c9a33, 0.9 + r() * 0.2);
      g.fillStyle = hex(c); g.fillRect(x, y, 1, 1);
    }
  }));
  T.road = tex(noiseFill(0x4a4d52, 0.25, 21));
  T.roadLine = tex(makeCanvas(16, 16, (g) => {
    g.drawImage(noiseFill(0x4a4d52, 0.25, 22), 0, 0);
    g.fillStyle = '#e8d36a'; g.fillRect(7, 2, 2, 12);
  }));
  T.cobble = tex(makeCanvas(16, 16, (g) => {
    const r = rng(31); g.fillStyle = '#5d5d5d'; g.fillRect(0, 0, 16, 16);
    const stones = [[0, 0, 6, 5], [6, 0, 5, 4], [11, 0, 5, 6], [0, 5, 4, 6], [4, 4, 7, 5], [11, 6, 5, 5], [0, 11, 7, 5], [7, 9, 4, 7], [11, 11, 5, 5]];
    for (const [x, y, w, h] of stones) {
      const c = shade(0x8a8a8a, 0.85 + r() * 0.3);
      g.fillStyle = hex(c); g.fillRect(x + 1, y + 1, w - 1, h - 1);
      g.fillStyle = hex(shade(c, 1.15)); g.fillRect(x + 1, y + 1, w - 2, 1);
    }
  }));
  T.brick = tex(makeCanvas(16, 16, (g) => {
    const r = rng(41); g.fillStyle = '#b9ab95'; g.fillRect(0, 0, 16, 16);
    for (let row = 0; row < 4; row++) {
      const off = row % 2 ? 4 : 0;
      for (let col = -1; col < 2; col++) {
        const x = col * 8 + off, y = row * 4;
        const c = shade(0x9c4b36, 0.85 + r() * 0.3);
        g.fillStyle = hex(c); g.fillRect(x + 1, y + 1, 7, 3);
        g.fillStyle = hex(shade(c, 0.8)); g.fillRect(x + 1, y + 3, 7, 1);
      }
    }
  }));
  T.plank = tex(makeCanvas(16, 16, (g) => {
    const r = rng(51);
    for (let row = 0; row < 4; row++) {
      const c = shade(0xa8814f, 0.9 + r() * 0.2);
      for (let y = 0; y < 4; y++) for (let x = 0; x < 16; x++) { g.fillStyle = hex(shade(c, 0.94 + r() * 0.12)); g.fillRect(x, row * 4 + y, 1, 1); }
      g.fillStyle = hex(shade(c, 0.6)); g.fillRect(0, row * 4 + 3, 16, 1);
      g.fillRect(((row * 7) % 12) + 2, row * 4, 1, 3);
    }
  }));
  T.crate = tex(makeCanvas(16, 16, (g) => {
    const r = rng(61);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { g.fillStyle = hex(shade(0xb58a4f, 0.9 + r() * 0.18)); g.fillRect(x, y, 1, 1); }
    g.fillStyle = '#6e4f28'; g.fillRect(0, 0, 16, 2); g.fillRect(0, 14, 16, 2); g.fillRect(0, 0, 2, 16); g.fillRect(14, 0, 2, 16);
    for (let i = 2; i < 14; i++) { g.fillRect(i, i, 2, 1); }
    g.fillStyle = '#d9b26f'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 0, 1, 16);
  }), false);
  T.concrete = tex(noiseFill(0xa6a49c, 0.14, 71));
  T.metal = tex(makeCanvas(16, 16, (g) => {
    g.drawImage(noiseFill(0xe8e8e8, 0.06, 81), 0, 0);
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, 7, 16, 1);
  }));
  T.log = tex(makeCanvas(16, 16, (g) => {
    const r = rng(91);
    for (let x = 0; x < 16; x++) { const c = shade(0x6b4a2b, 0.8 + r() * 0.4); for (let y = 0; y < 16; y++) { g.fillStyle = hex(shade(c, 0.95 + r() * 0.1)); g.fillRect(x, y, 1, 1); } }
  }));
  T.leaves = tex(makeCanvas(16, 16, (g) => {
    const r = rng(101);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const v = r(); g.fillStyle = hex(v < 0.15 ? 0x2f6b22 : v < 0.3 ? 0x5aa83a : shade(0x438f2c, 0.9 + r() * 0.2)); g.fillRect(x, y, 1, 1); }
  }));
  T.glass = tex(makeCanvas(16, 16, (g) => {
    g.fillStyle = '#2b4a63'; g.fillRect(0, 0, 16, 16);
    g.fillStyle = '#5f8fb0'; for (let i = 0; i < 6; i++) g.fillRect(3 + i, 9 - i, 1, 1);
  }));
  T.dark = tex(noiseFill(0x222326, 0.2, 111));
  T.sandbag = tex(makeCanvas(16, 16, (g) => {
    const r = rng(121); g.fillStyle = '#7a6a48'; g.fillRect(0, 0, 16, 16);
    for (let row = 0; row < 2; row++) for (let col = -1; col < 3; col++) {
      const x = col * 7 + (row ? 3 : 0), y = row * 8;
      g.fillStyle = hex(shade(0xc2ad7c, 0.9 + r() * 0.2)); g.fillRect(x + 1, y + 1, 6, 6);
      g.fillStyle = hex(0xd8c591); g.fillRect(x + 1, y + 1, 6, 1);
    }
  }));
  T.barrel = tex(makeCanvas(16, 16, (g) => {
    g.drawImage(noiseFill(0xffffff, 0.08, 131), 0, 0);
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, 2, 16, 1); g.fillRect(0, 13, 16, 1);
  }));
  return T;
}

// ゾンビの かお（かわいい・こわくない）
export function zombieFaceTexture(skin, kind) {
  return tex(makeCanvas(16, 16, (g) => {
    const r = rng(kind === 'brute' ? 7 : kind === 'runner' ? 5 : 3);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { g.fillStyle = hex(shade(skin, 0.92 + r() * 0.16)); g.fillRect(x, y, 1, 1); }
    // かみのけ
    g.fillStyle = hex(shade(skin, 0.55)); g.fillRect(0, 0, 16, 3); g.fillRect(0, 3, 2, 2); g.fillRect(13, 3, 3, 1);
    // め（しろめ＋くろめ・ちょっと ちぐはぐ）
    g.fillStyle = '#f4f4e8'; g.fillRect(3, 6, 4, 4); g.fillRect(10, 6, 3, 3);
    g.fillStyle = '#1b1b1b'; g.fillRect(4, 7, 2, 2); g.fillRect(11, 7, 1, 1);
    if (kind === 'brute') { g.fillStyle = hex(shade(skin, 0.45)); g.fillRect(2, 5, 6, 1); g.fillRect(9, 5, 5, 1); }
    // くち（ぬいめ）
    g.fillStyle = hex(shade(skin, 0.4)); g.fillRect(4, 12, 8, 1);
    g.fillStyle = hex(shade(skin, 0.6)); for (let x = 5; x < 12; x += 2) g.fillRect(x, 11, 1, 3);
    // ほっぺの きず（ばんそうこう）
    g.fillStyle = '#e9d7a8'; g.fillRect(12, 10, 3, 2);
  }), false);
}

export function solidTexture(base, amt, seed) { return tex(noiseFill(base, amt, seed)); }

export function shirtTexture(base, seed) {
  return tex(makeCanvas(16, 16, (g) => {
    const r = rng(seed);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { g.fillStyle = hex(shade(base, 0.9 + r() * 0.2)); g.fillRect(x, y, 1, 1); }
    // やぶれ（はだが みえる）
    g.fillStyle = '#5fa04a'; g.fillRect(3, 13, 2, 3); g.fillRect(10, 14, 3, 2); g.fillRect(12, 5, 2, 2);
    g.fillStyle = hex(shade(base, 0.7)); g.fillRect(0, 0, 16, 1);
  }), false);
}

// プレイヤーの かお（ヘルメット＋ゴーグル）
export function playerFaceTexture() {
  return tex(makeCanvas(16, 16, (g) => {
    g.fillStyle = '#d9a982'; g.fillRect(0, 0, 16, 16);
    g.fillStyle = '#4f5b3a'; g.fillRect(0, 0, 16, 5); g.fillRect(0, 5, 1, 4); g.fillRect(15, 5, 1, 4);
    g.fillStyle = '#2b2f2a'; g.fillRect(2, 6, 12, 3);
    g.fillStyle = '#7fd4ff'; g.fillRect(3, 7, 4, 1); g.fillRect(9, 7, 4, 1);
    g.fillStyle = '#8c5a3c'; g.fillRect(6, 12, 4, 1);
  }), false);
}

// こうかの テクスチャ（マズルフラッシュ・みどりの しみ・だんこん）
export function fxTextures() {
  const flash = new THREE.CanvasTexture(makeCanvas(64, 64, (g) => {
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,230,1)'); grd.addColorStop(0.25, 'rgba(255,220,120,0.95)');
    grd.addColorStop(0.6, 'rgba(255,140,30,0.45)'); grd.addColorStop(1, 'rgba(255,100,0,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
    g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,240,180,0.9)';
    for (let i = 0; i < 5; i++) {
      g.save(); g.translate(32, 32); g.rotate(i * Math.PI * 2 / 5 + 0.3);
      g.beginPath(); g.moveTo(-3, 0); g.lineTo(0, -31); g.lineTo(3, 0); g.fill(); g.restore();
    }
  }));
  flash.colorSpace = THREE.SRGBColorSpace;
  const splats = [1, 2, 3].map((seed) => {
    const t = new THREE.CanvasTexture(makeCanvas(32, 32, (g) => {
      const r = rng(seed * 97);
      const blob = (x, y, rad, c) => { g.fillStyle = c; for (let yy = -rad; yy <= rad; yy++) for (let xx = -rad; xx <= rad; xx++) if (xx * xx + yy * yy <= rad * rad) g.fillRect(x + xx, y + yy, 1, 1); };
      blob(16, 16, 7, '#3fbf2f');
      for (let i = 0; i < 9; i++) { const a = r() * 6.28, d = 6 + r() * 8; blob(16 + Math.cos(a) * d | 0, 16 + Math.sin(a) * d | 0, 1 + (r() * 3 | 0), '#3fbf2f'); }
      blob(14, 14, 3, '#7ee35a');
    }));
    t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; return t;
  });
  const hole = new THREE.CanvasTexture(makeCanvas(16, 16, (g) => {
    const grd = g.createRadialGradient(8, 8, 0, 8, 8, 8);
    grd.addColorStop(0, 'rgba(10,10,10,1)'); grd.addColorStop(0.35, 'rgba(30,30,30,0.9)'); grd.addColorStop(1, 'rgba(60,60,60,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 16, 16);
  }));
  const sky = new THREE.CanvasTexture(makeCanvas(4, 256, (g) => {
    const grd = g.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0, '#5d8fd6'); grd.addColorStop(0.55, '#a9c7e6'); grd.addColorStop(0.75, '#f2d9b0'); grd.addColorStop(1, '#e8c79a');
    g.fillStyle = grd; g.fillRect(0, 0, 4, 256);
  }));
  sky.colorSpace = THREE.SRGBColorSpace;
  return { flash, splats, hole, sky };
}
