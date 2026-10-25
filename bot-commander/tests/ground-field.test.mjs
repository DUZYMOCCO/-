// 地面の「なめらかな場」（js/render/ground-field.js）: 境が本当のマスの境から 0.5 マス以内・中心の芯・同じ地図なら同じ・1マスの島と穴の大きさ・3 つの地形が会う角
import test from 'node:test';
import assert from 'node:assert/strict';
import { FIELD_ORDER, CORE, CORNER_R, BORDER_MAX, createField, bakeChunk } from '../js/render/ground-field.js?v=2';

const KEY = { '.': 'plain', s: 'shallow', w: 'water', m: 'mountain', f: 'forest' };
const KEYS = '.swmf';
/** rows の文字の地図を、まわりを平地でふちどって返す（pad マス） */
function mapOf(rows, pad = 3) {
  const w = rows[0].length + 2 * pad, h = rows.length + 2 * pad, keys = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const r = rows[y - pad]?.[x - pad]; keys.push(KEY[r ?? '.']); }
  return { w, h, keys, kind: (x, y) => keys[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))] };
}
/** 地図から作る乱数（Math.random は使わない） */
function rng(seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
function randomMap(seed, kind) {
  const r = rng(seed), W = 14, H = 12, rows = [];
  const blk = [], cell = kind === 'block' ? 2 : 1;
  for (let i = 0; i < 80; i++) blk.push(KEYS[Math.floor(r() * 5)]);
  const pick = () => KEYS[Math.floor(r() * 5 * 1.4) % 5];
  for (let y = 0; y < H; y++) { let row = ''; for (let x = 0; x < W; x++) row += kind === 'blob' ? blobAt(seed, x, y) : blk[((y / cell | 0) * 7 + (x / cell | 0)) % 80] === '.' || r() < 0.55 ? blk[((y / cell | 0) * 7 + (x / cell | 0)) % 80] : pick(); rows.push(row); }
  return mapOf(rows, 2);
}
function blobAt(seed, x, y) { // ゆるやかなかたまり
  const h = (a, b) => { let v = (Math.imul(a, 374761393) + Math.imul(b, 668265263) + seed) | 0; v = Math.imul(v ^ (v >>> 13), 1274126177); return ((v ^ (v >>> 16)) >>> 0) / 4294967296; };
  const sm = (px, py) => { const x0 = Math.floor(px), y0 = Math.floor(py), fx = px - x0, fy = py - y0; return (h(x0, y0) * (1 - fx) + h(x0 + 1, y0) * fx) * (1 - fy) + (h(x0, y0 + 1) * (1 - fx) + h(x0 + 1, y0 + 1) * fx) * fy; };
  const a = sm(x / 3, y / 3), b = sm(x / 2.5 + 9, y / 2.5 + 4);
  return a < 0.4 ? 'f' : a < 0.55 ? (b < 0.5 ? 'm' : '.') : b < 0.3 ? 'w' : b < 0.4 ? 's' : '.';
}
/** 地形ごとに別の色の、全部不透明な地面（ppt*4 px 四方） */
const flatTex = ppt => FIELD_ORDER.map((_, k) => { const size = ppt * 4, data = new Uint8ClampedArray(size * size * 4); for (let i = 0; i < size * size; i++) data.set([30 + k * 45, 60 + k * 30, 90 + k * 10, 255], i * 4); return { size, data }; });
const SHAPES = {
  四角3x3: ['fff', 'fff', 'fff'], 四角4x4: ['ffff', 'ffff', 'ffff', 'ffff'], 長方形2x5: ['fffff', 'fffff'], L字: ['ffff', 'ffff', 'ff..', 'ff..'],
  斜めの階段: ['f...', 'ff..', 'fff.', 'ffff'], 山4x4: ['mmmm', 'mmmm', 'mmmm', 'mmmm'], 水4x4: ['wwww', 'wwww', 'wwww', 'wwww'],
  森浅瀬水: ['ffssww', 'ffssww', 'ffssww', '..ss..'], 山森水: ['mmmff', 'mmmff', 'wwwff', 'wwwff'], 点で3つ: ['ff..', 'ffss', '..ss', 'wwss', 'ww..'], 角で3つ: ['ffw', 'fsw', 'mmm'],
  森の島: ['f'], 山の島: ['m'], 水の島: ['w'], 浅瀬の島: ['s'], 森の穴: ['fff', 'f.f', 'fff'], 山の穴: ['mmm', 'mwm', 'mmm'], 斜めの島: ['f.f', '.f.', 'f.f'], 細い川: ['wwwwww'], 細い道: ['f', 'f', 'f', 'f'],
};
const ALL_MAPS = [
  ...Object.entries(SHAPES).map(([name, rows]) => [name, mapOf(rows)]),
  ...[1, 2, 3, 4, 5, 6].map(i => [`ランダム(1マス)${i}`, randomMap(i, 'cell')]),
  ...[1, 2, 3, 4].map(i => [`ランダム(2x2)${i}`, randomMap(100 + i, 'block')]),
  ...[1, 2, 3, 4, 5, 6].map(i => [`かたまり${i}`, randomMap(200 + i, 'blob')]),
];
/** 点 (u,v) から、条件に合うマスの四角までの最短の近さ */
function distTo(map, u, v, ok) {
  let best = Infinity; const tx = Math.floor(u), ty = Math.floor(v);
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const x0 = tx + dx, y0 = ty + dy; if (!ok(map.kind(x0, y0))) continue;
    const ex = Math.max(x0 - u, 0, u - x0 - 1), ey = Math.max(y0 - v, 0, v - y0 - 1); best = Math.min(best, Math.hypot(ex, ey));
  }
  return best;
}

test('境は本当のマスの境から 0.5 マス以内（はみ出さない・へこまない）: 四角・L字・階段・3つの地形の角・島と穴・ランダム', () => {
  const EPS = 1e-9, STEP = 1 / 10;
  for (const [name, map] of ALL_MAPS) {
    const f = createField(map.keys, map.w, map.h);
    for (let v = 0.05; v < map.h; v += STEP) for (let u = 0.05; u < map.w; u += STEP) {
      const k1 = FIELD_ORDER[f.sample(u, v).k1], T0 = map.kind(Math.floor(u), Math.floor(v));
      const dOwn = distTo(map, u, v, k => k === k1);
      assert.ok(dOwn <= BORDER_MAX + EPS, `${name} (${u.toFixed(2)},${v.toFixed(2)}): ${k1} が ${dOwn.toFixed(3)} マス先まではみ出した`);
      const dOther = distTo(map, u, v, k => k !== T0);
      if (dOther > BORDER_MAX + EPS) assert.equal(k1, T0, `${name} (${u.toFixed(2)},${v.toFixed(2)}): 境から ${dOther.toFixed(3)} マス離れているのに ${T0} が ${k1} になった（へこみ）`);
    }
  }
});

test('マスの中心の芯: 中心から CORE[0] 以内は必ずそのマスの地形（ランダムな地図・島・穴）', () => {
  for (const [name, map] of ALL_MAPS) {
    const f = createField(map.keys, map.w, map.h), R = CORE[0];
    for (let ty = 0; ty < map.h; ty++) for (let tx = 0; tx < map.w; tx++) {
      const T = map.kind(tx, ty);
      for (let a = 0; a < 9; a++) {
        const r = a === 0 ? 0 : R * 0.999, ang = a * Math.PI / 4;
        const got = FIELD_ORDER[f.sample(tx + 0.5 + r * Math.cos(ang), ty + 0.5 + r * Math.sin(ang)).k1];
        assert.equal(got, T, `${name} マス (${tx},${ty}) の芯（角度 ${a}）が ${got}`);
      }
    }
  }
});

test('同じ地図なら同じ絵（場も焼いた画素も）', () => {
  const map = mapOf(SHAPES.森浅瀬水), PPT = 16;
  const run = () => {
    const f = createField(map.keys, map.w, map.h), tex = flatTex(PPT);
    const samples = []; for (let i = 0; i < 400; i++) { const r = f.sample(1 + (i % 20) * 0.4, 1 + Math.floor(i / 20) * 0.37); samples.push(r.k1, r.k2, r.m); }
    const img = new Uint8ClampedArray(8 * PPT * 8 * PPT * 4); bakeChunk(f, tex, 0, 0, 8, 8, PPT, img);
    return { samples, img };
  };
  const a = run(), b = run();
  assert.deepEqual(a.samples, b.samples);
  assert.ok(Buffer.from(a.img.buffer).equals(Buffer.from(b.img.buffer)));
  // 別の地図の種なら絵が変わる（種が効いている）
  const f1 = createField(map.keys, map.w, map.h, 1), f2 = createField(map.keys, map.w, map.h, 99999);
  let diff = 0; for (let i = 0; i < 400; i++) { const u = 1 + (i % 20) * 0.4, v = 1 + Math.floor(i / 20) * 0.37; if (f1.sample(u, v).m !== f2.sample(u, v).m) diff++; }
  assert.ok(diff > 20);
});

test('1マスの島と穴: その地形の面積がだいたい 1 マス分（0.6〜1.3）', () => {
  const STEP = 1 / 32;
  const area = (map, tx, ty, key) => { // (tx,ty) のまわり 3 マスぶんを細かく見て、key になる面積（マス）
    const f = createField(map.keys, map.w, map.h); let n = 0;
    for (let v = ty - 2 + STEP / 2; v < ty + 3; v += STEP) for (let u = tx - 2 + STEP / 2; u < tx + 3; u += STEP) if (FIELD_ORDER[f.sample(u, v).k1] === key) n++;
    return n * STEP * STEP;
  };
  for (const [key, ch] of [['forest', 'f'], ['mountain', 'm'], ['water', 'w'], ['shallow', 's']]) {
    const a = area(mapOf([ch]), 3, 3, key);
    assert.ok(a >= 0.6 && a <= 1.3, `${key} の島の面積 ${a.toFixed(3)}`);
  }
  for (const [outer, inner, okey] of [['f', '.', 'plain'], ['m', 'w', 'water'], ['w', 's', 'shallow'], ['f', 's', 'shallow']]) {
    const row = outer.repeat(7), map = mapOf([row, row, outer.repeat(3) + inner + outer.repeat(3), row, row], 3); // 7x5 の中ほどに 1 マスの穴
    const a = area(map, 3 + 3, 3 + 2, okey);
    assert.ok(a >= 0.6 && a <= 1.3, `${outer} の中の ${inner}（${okey}）の穴の面積 ${a.toFixed(3)}`);
  }
});

test('出っぱった角はまるめる（八角形にならない）: 4x4 の森の角は、半径 CORNER_R の円', () => {
  const map = mapOf(SHAPES.四角4x4), f = createField(map.keys, map.w, map.h), o = { k1: 0, k2: 0, m: 0, m3: 0 };
  const x0 = 3, y0 = 3, R = CORNER_R; // 森の左上の角 (3,3)。円の中心は (3+R, 3+R)
  const win = (u, v) => FIELD_ORDER[f.geo(u, v, o).k1];
  for (let i = 0; i < 24; i++) {
    const a = Math.PI + (Math.PI / 2) * (i + 0.5) / 24; // 角の外側の向き（左上）
    assert.equal(win(x0 + R + (R - 0.03) * Math.cos(a), y0 + R + (R - 0.03) * Math.sin(a)), 'forest', `円の内側 ${i}`);
    assert.equal(win(x0 + R + (R + 0.03) * Math.cos(a), y0 + R + (R + 0.03) * Math.sin(a)), 'plain', `円の外側 ${i}`);
  }
  assert.equal(win(x0 + 0.05, y0 + 0.05), 'plain'); // 角のすぐ内側は削れている（四角のまま・斜めの切り落としではない）
  assert.equal(win(x0 + 0.5, y0 + 0.05), 'forest'); // 辺の中ほどは削れない
  assert.equal(win(x0 + 1.5, y0 + 1.5), 'forest');
});

test('3つの地形が会う角: すき間・別の地形のはみ出しがない（まわり 3x3 マスにある地形だけが勝つ）／画素が全部塗られる', () => {
  for (const name of ['森浅瀬水', '山森水', '点で3つ', '角で3つ']) {
    const map = mapOf(SHAPES[name]), f = createField(map.keys, map.w, map.h);
    for (let v = 0.03; v < map.h; v += 0.07) for (let u = 0.03; u < map.w; u += 0.07) {
      const r = f.sample(u, v), tx = Math.floor(u), ty = Math.floor(v), near = new Set();
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) near.add(map.kind(tx + dx, ty + dy));
      assert.ok(near.has(FIELD_ORDER[r.k1]), `${name} (${u.toFixed(2)},${v.toFixed(2)}) に ${FIELD_ORDER[r.k1]}`);
      assert.ok(Number.isFinite(r.m) && r.m >= 0, `${name} 差が ${r.m}`);
      if (r.m < 1.5) assert.notEqual(r.k1, r.k2, `${name} 境の近くで 2 番目が同じ`);
    }
    const PPT = 16, tex = flatTex(PPT);
    const img = new Uint8ClampedArray(8 * PPT * 8 * PPT * 4); bakeChunk(f, tex, 1, 1, 8, 8, PPT, img);
    for (let i = 3; i < img.length; i += 4) assert.equal(img[i], 255);
    assert.ok(img.every(x => Number.isFinite(x)));
  }
});
