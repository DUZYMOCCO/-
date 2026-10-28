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
  // v0.5.0: あたらしい マップの ざいしつ
  T.asphalt = tex(noiseFill(0x55585e, 0.22, 141));
  T.paint = tex(noiseFill(0xf2f2ea, 0.05, 142));
  T.wall = tex(makeCanvas(16, 16, (g) => {
    g.drawImage(noiseFill(0xeeeae2, 0.06, 143), 0, 0);
    g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(0, 15, 16, 1); g.fillRect(0, 7, 16, 1);
  }));
  T.tile = tex(makeCanvas(16, 16, (g) => {
    g.drawImage(noiseFill(0xf4f4f0, 0.05, 144), 0, 0);
    g.fillStyle = 'rgba(0,0,0,0.14)'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 0, 1, 16); g.fillRect(0, 8, 16, 1); g.fillRect(8, 0, 1, 16);
  }));
  T.container = tex(makeCanvas(16, 16, (g) => {
    g.drawImage(noiseFill(0xe8e8e8, 0.06, 145), 0, 0);
    for (let x = 0; x < 16; x += 2) { g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x, 0, 1, 16); }
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 0, 16, 1);
  }));
  T.tent = tex(makeCanvas(16, 16, (g) => {
    g.drawImage(noiseFill(0xf0f0f0, 0.08, 146), 0, 0);
    g.fillStyle = 'rgba(0,0,0,0.1)'; g.fillRect(0, 5, 16, 1); g.fillRect(0, 11, 16, 1);
  }));
  T.hesco = tex(makeCanvas(16, 16, (g) => {
    const r = rng(147); g.fillStyle = '#8c7a55'; g.fillRect(0, 0, 16, 16);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (r() < 0.4) { g.fillStyle = hex(shade(0xa89468, 0.85 + r() * 0.3)); g.fillRect(x, y, 1, 1); }
    g.fillStyle = '#4a4a44'; for (let i = 0; i < 16; i += 4) { g.fillRect(i, 0, 1, 16); g.fillRect(0, i, 16, 1); }
  }));
  T.dirt = tex(makeCanvas(16, 16, (g) => {
    const r = rng(148);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const v = r(); g.fillStyle = hex(v < 0.1 ? 0x6a5638 : v < 0.18 ? 0x9a8458 : shade(0x86704a, 0.9 + r() * 0.2)); g.fillRect(x, y, 1, 1); }
  }));
  T.water = tex(makeCanvas(16, 16, (g) => {
    const r = rng(149); g.fillStyle = '#2a5a78'; g.fillRect(0, 0, 16, 16);
    g.fillStyle = '#4a86a8'; for (let i = 0; i < 7; i++) g.fillRect((r() * 14) | 0, (r() * 16) | 0, 3, 1);
  }));
  T.stripe = tex(makeCanvas(16, 16, (g) => {
    g.fillStyle = '#e8b830'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#2a2a2a';
    for (let i = -16; i < 16; i += 8) for (let k = 0; k < 4; k++) for (let y = 0; y < 16; y++) g.fillRect(i + y + k, y, 1, 1);
  }));
  T.roof = tex(makeCanvas(16, 16, (g) => {
    g.drawImage(noiseFill(0xe0e0e0, 0.08, 150), 0, 0);
    g.fillStyle = 'rgba(0,0,0,0.22)'; for (let y = 3; y < 16; y += 4) g.fillRect(0, y, 16, 1);
  }));
  return T;
}

// ゾンビの かお（かわいい・こわくない）
export function zombieFaceTexture(skin, kind) {
  return tex(makeCanvas(16, 16, (g) => {
    const r = rng(kind === 'brute' ? 7 : kind === 'runner' ? 5 : kind === 'boss' ? 11 : 3);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { g.fillStyle = hex(shade(skin, 0.92 + r() * 0.16)); g.fillRect(x, y, 1, 1); }
    // かみのけ
    g.fillStyle = hex(shade(skin, 0.55)); g.fillRect(0, 0, 16, 3); g.fillRect(0, 3, 2, 2); g.fillRect(13, 3, 3, 1);
    // め（しろめ＋くろめ・ちょっと ちぐはぐ）
    g.fillStyle = '#f4f4e8'; g.fillRect(3, 6, 4, 4); g.fillRect(10, 6, 3, 3);
    g.fillStyle = '#1b1b1b'; g.fillRect(4, 7, 2, 2); g.fillRect(11, 7, 1, 1);
    if (kind === 'brute' || kind === 'boss') { g.fillStyle = hex(shade(skin, 0.45)); g.fillRect(2, 5, 6, 1); g.fillRect(9, 5, 5, 1); }
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
// かお（ふくごとに かえる: top=ぼうし band=ゴーグル eye=め mask=くちもと domino=めの まわり）
export function playerFaceTexture(o = {}) {
  const c = (v) => (typeof v === 'number' ? hex(v) : v);
  const skin = c(o.skin ?? '#d9a982');
  return tex(makeCanvas(16, 16, (g) => {
    g.fillStyle = skin; g.fillRect(0, 0, 16, 16);
    if (o.top !== null) { g.fillStyle = c(o.top ?? '#4f5b3a'); g.fillRect(0, 0, 16, 5); g.fillRect(0, 5, 1, 4); g.fillRect(15, 5, 1, 4); }
    if (o.domino) { g.fillStyle = c(o.domino); g.fillRect(1, 6, 14, 3); }
    if (o.band !== null) { g.fillStyle = c(o.band ?? '#2b2f2a'); g.fillRect(2, 6, 12, 3); }
    g.fillStyle = c(o.eye ?? '#7fd4ff'); g.fillRect(3, 7, 4, 1); g.fillRect(9, 7, 4, 1);
    if (o.mask) { g.fillStyle = c(o.mask); g.fillRect(0, 10, 16, 6); }
    else if (o.grill) { g.fillStyle = c(o.grill); for (let x = 4; x < 12; x += 2) g.fillRect(x, 11, 1, 3); }
    else { g.fillStyle = c(o.mouth ?? '#8c5a3c'); g.fillRect(6, 12, 4, 1); }
  }), false);
}

// めいさいの もよう
export function camoTexture(cols, seed) {
  return tex(makeCanvas(16, 16, (g) => {
    const r = rng(seed);
    g.fillStyle = hex(cols[0]); g.fillRect(0, 0, 16, 16);
    for (let i = 0; i < 14; i++) {
      g.fillStyle = hex(cols[1 + (i % (cols.length - 1))]);
      const x = (r() * 16) | 0, y = (r() * 16) | 0, w = 2 + ((r() * 4) | 0), h = 1 + ((r() * 3) | 0);
      g.fillRect(x, y, w, h); g.fillRect((x + w) % 16, y, 2, h + 1);
    }
  }));
}

// おじさんの あたま（はげ・よこの しらが・めがね・くちひげ。やさしい かお）
const OJI_SKIN = '#f0c39b', OJI_HAIR = '#b9b4ab';
export function ojisanTextures() {
  const face = tex(makeCanvas(16, 16, (g) => {
    g.fillStyle = OJI_SKIN; g.fillRect(0, 0, 16, 16);
    g.fillStyle = '#ffe2c6'; g.fillRect(5, 1, 4, 2);                       // おでこの ひかり
    g.fillStyle = OJI_HAIR; g.fillRect(0, 5, 1, 6); g.fillRect(15, 5, 1, 6);  // よこの かみ
    g.fillStyle = '#8a8378'; g.fillRect(3, 5, 3, 1); g.fillRect(10, 5, 3, 1); // まゆげ
    g.fillStyle = '#3a3330';                                                 // めがね
    g.fillRect(2, 6, 5, 1); g.fillRect(2, 9, 5, 1); g.fillRect(2, 6, 1, 4); g.fillRect(6, 6, 1, 4);
    g.fillRect(9, 6, 5, 1); g.fillRect(9, 9, 5, 1); g.fillRect(9, 6, 1, 4); g.fillRect(13, 6, 1, 4);
    g.fillRect(7, 7, 2, 1);
    g.fillStyle = '#e8f6ff'; g.fillRect(3, 7, 3, 2); g.fillRect(10, 7, 3, 2);
    g.fillStyle = '#2b2522'; g.fillRect(4, 8, 1, 1); g.fillRect(11, 8, 1, 1);  // め
    g.fillStyle = '#e0a985'; g.fillRect(7, 9, 2, 2);                          // はな
    g.fillStyle = '#7a6a5e'; g.fillRect(4, 11, 8, 1); g.fillRect(3, 12, 3, 1); g.fillRect(10, 12, 3, 1); // くちひげ
    g.fillStyle = '#b45a4a'; g.fillRect(6, 13, 4, 1);                         // くち
    g.fillStyle = '#f7a9a0'; g.fillRect(1, 11, 2, 1); g.fillRect(13, 11, 2, 1); // ほっぺ
  }), false);
  const side = tex(makeCanvas(16, 16, (g) => {
    g.fillStyle = OJI_SKIN; g.fillRect(0, 0, 16, 16);
    g.fillStyle = OJI_HAIR; g.fillRect(0, 5, 16, 6);
    g.fillStyle = OJI_SKIN; g.fillRect(6, 7, 3, 3);                           // みみ
    g.fillStyle = '#3a3330'; g.fillRect(0, 7, 6, 1);                          // めがねの つる
  }), false);
  const back = tex(makeCanvas(16, 16, (g) => {
    g.fillStyle = OJI_SKIN; g.fillRect(0, 0, 16, 16);
    g.fillStyle = OJI_HAIR; g.fillRect(0, 5, 16, 7);
  }), false);
  const top = tex(makeCanvas(16, 16, (g) => {
    g.fillStyle = OJI_SKIN; g.fillRect(0, 0, 16, 16);
    g.fillStyle = '#fff0de'; g.fillRect(4, 4, 5, 3); g.fillRect(5, 7, 2, 1);    // ぴかっ
  }), false);
  return { face, side, back, top, skin: 0xf0c39b };
}

// v0.14.0: よっぱらいおじさんの あたま（まっかな かお・とろんとした め・あかい はな・ぼさぼさ かみ。こわくない）
const YO_SKIN = '#f2a08c', YO_RED = '#ec6a5c', YO_HAIR = '#4a3f38';
export function drunkTextures() {
  const face = tex(makeCanvas(16, 16, (g) => {
    g.fillStyle = YO_SKIN; g.fillRect(0, 0, 16, 16);
    g.fillStyle = YO_HAIR; g.fillRect(0, 0, 16, 3); g.fillRect(0, 3, 2, 4); g.fillRect(14, 3, 2, 4); g.fillRect(5, 3, 2, 1);
    g.fillStyle = '#5a4a40'; g.fillRect(3, 5, 3, 1); g.fillRect(10, 5, 3, 1);            // まゆげ（はの じ）
    g.fillStyle = '#2b2522'; g.fillRect(3, 7, 3, 1); g.fillRect(10, 7, 3, 1);            // とろんとした め（ほそい せん）
    g.fillStyle = '#ffd0c4'; g.fillRect(3, 6, 3, 1); g.fillRect(10, 6, 3, 1);
    g.fillStyle = YO_RED; g.fillRect(1, 9, 4, 2); g.fillRect(11, 9, 4, 2);               // まっかな ほっぺ
    g.fillStyle = '#e24a44'; g.fillRect(7, 8, 2, 3);                                      // あかい はな
    g.fillStyle = '#ff9c90'; g.fillRect(7, 8, 1, 1);
    g.fillStyle = '#8a3a34'; g.fillRect(5, 12, 6, 1); g.fillRect(6, 13, 4, 1);           // にこにこ くち
  }), false);
  const side = tex(makeCanvas(16, 16, (g) => {
    g.fillStyle = YO_SKIN; g.fillRect(0, 0, 16, 16);
    g.fillStyle = YO_HAIR; g.fillRect(0, 0, 16, 6); g.fillRect(0, 6, 4, 3);
    g.fillStyle = YO_RED; g.fillRect(7, 7, 3, 3);                                         // あかい みみ
  }), false);
  const back = tex(makeCanvas(16, 16, (g) => {
    g.fillStyle = YO_SKIN; g.fillRect(0, 0, 16, 16);
    g.fillStyle = YO_HAIR; g.fillRect(0, 0, 16, 10);
  }), false);
  const top = tex(makeCanvas(16, 16, (g) => {
    g.fillStyle = YO_HAIR; g.fillRect(0, 0, 16, 16);
    g.fillStyle = '#6a5a4e'; g.fillRect(3, 3, 3, 2); g.fillRect(9, 8, 4, 2); g.fillRect(5, 11, 2, 2); // ぼさぼさ
  }), false);
  return { face, side, back, top, skin: 0xf2a08c };
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
  // よるの そら（こん → あおむらさき → ちへいせんは すこし あかるく）
  const nightSky = new THREE.CanvasTexture(makeCanvas(4, 256, (g) => {
    const grd = g.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0, '#0a1430'); grd.addColorStop(0.5, '#1b2d5c'); grd.addColorStop(0.75, '#34497e'); grd.addColorStop(1, '#2a3a63');
    g.fillStyle = grd; g.fillRect(0, 0, 4, 256);
  }));
  nightSky.colorSpace = THREE.SRGBColorSpace;
  // まるい ひかり（あかりの わ・ばくはつの ひかり）
  const glow = new THREE.CanvasTexture(makeCanvas(64, 64, (g) => {
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.45, 'rgba(255,255,255,0.55)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  }));
  // Cloud silhouette, shared by all rocket smoke puffs.
  const smokePuff = new THREE.CanvasTexture(makeCanvas(96, 96, (g) => {
    g.clearRect(0, 0, 96, 96);
    const blob = (x, y, rx, ry, color) => { g.fillStyle=color; g.beginPath(); g.ellipse(x,y,rx,ry,0,0,Math.PI*2); g.fill(); };
    const parts=[[23,55,18,17],[34,38,18,18],[53,33,21,19],[71,48,18,18],[50,60,32,22]];
    for (const [x,y,rx,ry] of parts) blob(x,y,rx+3,ry+3,'rgba(135,130,122,0.23)');
    for (const [x,y,rx,ry] of parts) blob(x,y,rx,ry,'rgba(215,208,194,0.75)');
    blob(34,40,13,11,'rgba(248,236,211,0.28)'); blob(60,34,14,10,'rgba(248,236,211,0.25)');
    blob(49,68,25,10,'rgba(105,99,92,0.20)');
  }));
  smokePuff.colorSpace = THREE.SRGBColorSpace;
  // つき（ブロックっぽい）
  const moon = new THREE.CanvasTexture(makeCanvas(16, 16, (g) => {
    const r = rng(77);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const dx = x - 7.5, dy = y - 7.5; if (dx * dx + dy * dy > 56) continue;
      const v = 220 + (r() * 30 | 0); g.fillStyle = `rgb(${v},${v},${v - 20})`; g.fillRect(x, y, 1, 1);
    }
    g.fillStyle = 'rgba(150,150,140,0.6)'; g.fillRect(4, 5, 3, 2); g.fillRect(9, 9, 2, 3); g.fillRect(6, 11, 2, 1);
  }));
  moon.magFilter = THREE.NearestFilter; moon.colorSpace = THREE.SRGBColorSpace;
  // じかんで かわる そら（4いろを まぜて かきなおす）
  const skyCanvas = makeCanvas(4, 128, () => {});
  const skyTex = new THREE.CanvasTexture(skyCanvas); skyTex.colorSpace = THREE.SRGBColorSpace;
  const drawSky = (cols) => {
    const g = skyCanvas.getContext('2d'), grd = g.createLinearGradient(0, 0, 0, 128);
    const h = (c) => '#' + c.toString(16).padStart(6, '0');
    grd.addColorStop(0, h(cols[0])); grd.addColorStop(0.55, h(cols[1])); grd.addColorStop(0.75, h(cols[2])); grd.addColorStop(1, h(cols[3]));
    g.fillStyle = grd; g.fillRect(0, 0, 4, 128); skyTex.needsUpdate = true;
  };
  return { flash, splats, hole, sky, nightSky, glow, smokePuff, moon, skyTex, drawSky };
}
