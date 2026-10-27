// ブロックの キャラクターと ぶき（かくうの デザイン・ロゴなし）
import * as THREE from '../vendor/three.module.min.js';
import { zombieFaceTexture, playerFaceTexture, solidTexture, shirtTexture, camoTexture, ojisanTextures, drunkTextures } from './textures.js?v=23';

const boxGeoCache = new Map();
export function boxGeo(w, h, d) {
  const k = w + ',' + h + ',' + d;
  if (!boxGeoCache.has(k)) boxGeoCache.set(k, new THREE.BoxGeometry(w, h, d));
  return boxGeoCache.get(k);
}
function part(parent, mat, w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(boxGeo(w, h, d), mat);
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
  parent.add(m); return m;
}
const L = (c, extra) => new THREE.MeshLambertMaterial({ color: c, ...extra });

// v0.12.0: いくつかの はこを 1つの かたちに まとめる（ドローコールを へらす）
// items: [{ geo, matrix, color? }]  color が あれば ちょうてんの いろも つける
export function mergeGeos(items, withColor = false) {
  let nv = 0; const parts = [];
  for (const it of items) { const g = it.geo.index ? it.geo.toNonIndexed() : it.geo; parts.push([g, it]); nv += g.attributes.position.count; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), col = withColor ? new Float32Array(nv * 3) : null;
  const nm = new THREE.Matrix3(), v = new THREE.Vector3(), c = new THREE.Color();
  let o = 0;
  for (const [g, it] of parts) {
    const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv; nm.getNormalMatrix(it.matrix);
    for (let i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i).applyMatrix4(it.matrix); pos.set([v.x, v.y, v.z], (o + i) * 3);
      v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor.set([v.x, v.y, v.z], (o + i) * 3);
      if (U) uv.set([U.getX(i), U.getY(i)], (o + i) * 2);
      if (col) { const cc = typeof it.color === 'function' ? it.color(i) : it.color; c.set(cc ?? 0xffffff); col.set([c.r, c.g, c.b], (o + i) * 3); }
    }
    o += P.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  if (col) out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.computeBoundingSphere();
  return out;
}
// あたま: 6めん → 3グループ（はだ 4めん・かみ・かお）で 3かい だけ かく
const headGeoCache = new Map();
function headGeo(w, h, d) {
  const k = w + ',' + h + ',' + d;
  if (headGeoCache.has(k)) return headGeoCache.get(k);
  const g = new THREE.BoxGeometry(w, h, d), I = g.index.array;
  const face = (f) => Array.from(I.slice(f * 6, f * 6 + 6));
  g.setIndex([0, 1, 3, 4, 2, 5].flatMap(face));
  g.clearGroups(); g.addGroup(0, 24, 0); g.addGroup(24, 6, 1); g.addGroup(30, 6, 2);
  headGeoCache.set(k, g); return g;
}
let eyeGeo = null;

// ---- ぶき ----
const GM = {
  metal: L(0x3a3f47), poly: L(0x1d2024), tan: L(0xb29566), orange: L(0xff8a1f), steel: L(0x6d737c),
  wood: L(0x8a5a32), lens: new THREE.MeshBasicMaterial({ color: 0x9fe8ff }), dot: new THREE.MeshBasicMaterial({ color: 0xff3b2f }),
  rubber: L(0x121315), red: L(0xc0392b),
  olive: L(0x5b6b3a), oliveD: L(0x434f2b), khaki: L(0xa89a6a), warhead: L(0x7d8a52), tip: L(0xff8a1f),
  glow: new THREE.MeshBasicMaterial({ color: 0xfff6d8 }),
};

function makeRifle() {
  const g = new THREE.Group(); g.name = 'rifle';
  const M = GM;
  part(g, M.metal, 0.07, 0.11, 0.30, 0, 0, 0);                     // アッパー
  part(g, M.poly, 0.066, 0.06, 0.22, 0, -0.08, -0.01);              // ロワー
  part(g, M.poly, 0.072, 0.03, 0.09, 0, -0.105, -0.07);             // マガジンウェル
  part(g, M.tan, 0.05, 0.13, 0.06, 0, -0.14, 0.09, -0.35);          // グリップ
  part(g, M.poly, 0.012, 0.012, 0.075, 0, -0.135, 0.025);           // トリガーガード
  part(g, M.steel, 0.01, 0.035, 0.012, 0, -0.12, 0.035, 0.3);       // ひきがね
  part(g, M.metal, 0.04, 0.05, 0.14, 0, -0.01, 0.22);               // ストックの つつ
  part(g, M.tan, 0.06, 0.10, 0.17, 0, -0.035, 0.35);                // ストック
  part(g, M.tan, 0.05, 0.022, 0.12, 0, 0.03, 0.33);                 // ほお あて
  part(g, M.rubber, 0.066, 0.135, 0.03, 0, -0.04, 0.445);           // パッド
  part(g, M.orange, 0.067, 0.02, 0.031, 0, 0.0, 0.446);             // アクセント
  part(g, M.tan, 0.078, 0.088, 0.31, 0, -0.005, -0.30);             // ハンドガード
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) part(g, M.poly, 0.004, 0.018, 0.04, s * 0.04, -0.005, -0.21 - i * 0.065); // あな
  part(g, M.orange, 0.08, 0.012, 0.07, 0, 0.022, -0.40);            // オレンジの ライン
  part(g, M.poly, 0.035, 0.08, 0.04, 0, -0.085, -0.34);             // フォアグリップ
  part(g, M.poly, 0.032, 0.016, 0.6, 0, 0.064, -0.15);              // レール
  for (let i = 0; i < 12; i++) part(g, M.metal, 0.036, 0.008, 0.012, 0, 0.074, 0.12 - i * 0.045);
  part(g, M.metal, 0.028, 0.028, 0.22, 0, 0.0, -0.56);              // バレル
  part(g, M.metal, 0.038, 0.042, 0.03, 0, 0.012, -0.47);            // ガスブロック
  part(g, M.metal, 0.012, 0.05, 0.015, 0, 0.055, -0.47);            // フロントサイト
  part(g, M.steel, 0.046, 0.046, 0.085, 0, 0, -0.70);               // マズル
  for (const s of [-1, 1]) for (let i = 0; i < 2; i++) part(g, M.poly, 0.004, 0.03, 0.014, s * 0.024, 0, -0.68 - i * 0.03);
  part(g, M.poly, 0.05, 0.02, 0.06, 0, 0.082, -0.05);               // ドットサイト だい
  part(g, M.metal, 0.052, 0.055, 0.09, 0, 0.12, -0.05);             // ドットサイト
  part(g, M.lens, 0.04, 0.04, 0.004, 0, 0.122, -0.096);
  part(g, M.dot, 0.006, 0.006, 0.004, 0, 0.122, -0.002);
  part(g, M.metal, 0.042, 0.012, 0.02, 0, 0.05, 0.14);              // チャージングハンドル
  part(g, M.poly, 0.004, 0.03, 0.065, 0.037, 0.012, -0.02);         // はいきょう こう
  part(g, M.poly, 0.034, 0.034, 0.08, 0.058, 0.0, -0.36);           // ライト
  part(g, M.glow, 0.028, 0.028, 0.004, 0.058, 0.0, -0.401);
  // マガジン（リロードで うごく）
  const mag = new THREE.Group(); mag.position.set(0, -0.12, -0.07); g.add(mag);
  part(mag, M.poly, 0.05, 0.12, 0.075, 0, -0.06, 0, 0.12);
  part(mag, M.poly, 0.05, 0.1, 0.075, 0, -0.16, -0.025, 0.38);
  part(mag, M.orange, 0.054, 0.018, 0.08, 0, -0.215, -0.05, 0.38);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0, -0.76); g.add(muzzle);
  const eject = new THREE.Object3D(); eject.position.set(0.045, 0.015, -0.02); g.add(eject);
  return { group: g, mag, muzzle, eject, gripLeft: new THREE.Vector3(0, -0.07, -0.34), magRest: mag.position.clone() };
}

function makePistol() {
  const g = new THREE.Group(); g.name = 'pistol';
  const M = GM;
  part(g, M.metal, 0.036, 0.045, 0.2, 0, 0.02, -0.04);
  part(g, M.poly, 0.034, 0.03, 0.16, 0, -0.015, -0.03);
  part(g, M.poly, 0.034, 0.12, 0.055, 0, -0.08, 0.04, -0.25);
  part(g, M.orange, 0.036, 0.012, 0.03, 0, 0.044, -0.13);
  part(g, M.steel, 0.006, 0.012, 0.01, 0, 0.05, -0.13);
  part(g, M.steel, 0.02, 0.012, 0.01, 0, 0.05, 0.05);
  const mag = new THREE.Group(); mag.position.set(0, -0.09, 0.045); g.add(mag);
  part(mag, M.poly, 0.026, 0.1, 0.045, 0, -0.03, 0, -0.25);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.02, -0.16); g.add(muzzle);
  const eject = new THREE.Object3D(); eject.position.set(0.025, 0.03, -0.02); g.add(eject);
  return { group: g, mag, muzzle, eject, magRest: mag.position.clone() };
}

// v0.9.0: マグナム（かくうの リボルバー。ぎんいろの わく・ながい つつ・きの グリップ。マーク・もじ なし）
function makeMagnum() {
  const g = new THREE.Group(); g.name = 'magnum';
  const M = GM;
  part(g, M.steel, 0.04, 0.07, 0.12, 0, 0.0, 0.0);                  // わく
  part(g, M.steel, 0.034, 0.04, 0.24, 0, 0.022, -0.17);             // ながい つつ
  part(g, M.metal, 0.02, 0.012, 0.24, 0, 0.047, -0.17);             // うえの リブ
  part(g, M.metal, 0.03, 0.02, 0.2, 0, -0.01, -0.15);               // したの おもり
  part(g, M.orange, 0.012, 0.02, 0.02, 0, 0.06, -0.28);             // まえの しょうじゅん（オレンジ）
  part(g, M.metal, 0.02, 0.025, 0.02, 0, 0.048, 0.06);              // ハンマー
  part(g, M.wood, 0.038, 0.12, 0.05, 0, -0.08, 0.06, -0.3);         // きの グリップ
  part(g, M.metal, 0.008, 0.04, 0.04, 0, -0.045, -0.005);           // トリガーガード
  const mag = new THREE.Group(); mag.position.set(0, 0.005, -0.02); g.add(mag); // シリンダー（リロードで よこに でる）
  part(mag, M.metal, 0.06, 0.06, 0.07, 0, 0, 0);
  for (let i = 0; i < 3; i++) part(mag, M.poly, 0.062, 0.008, 0.072, 0, -0.02 + i * 0.02, 0);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.022, -0.3); g.add(muzzle);
  const eject = new THREE.Object3D(); eject.position.set(0.04, 0.0, -0.02); g.add(eject);
  return { group: g, mag, muzzle, eject, magRest: mag.position.clone() };
}

function makeShotgun() {
  const g = new THREE.Group(); g.name = 'shotgun';
  const M = GM;
  part(g, M.metal, 0.065, 0.09, 0.26, 0, 0, 0);
  part(g, M.metal, 0.034, 0.034, 0.56, 0, 0.02, -0.4);
  part(g, M.poly, 0.03, 0.03, 0.46, 0, -0.025, -0.36);
  const pump = new THREE.Group(); pump.position.set(0, -0.03, -0.36); g.add(pump);
  part(pump, M.wood, 0.062, 0.06, 0.18, 0, 0, 0);
  for (let i = 0; i < 4; i++) part(pump, M.poly, 0.064, 0.008, 0.012, 0, 0, -0.06 + i * 0.04);
  part(g, M.wood, 0.05, 0.12, 0.06, 0, -0.1, 0.12, -0.4);
  part(g, M.wood, 0.06, 0.11, 0.26, 0, -0.04, 0.27);
  part(g, M.rubber, 0.064, 0.13, 0.03, 0, -0.05, 0.41);
  part(g, M.orange, 0.036, 0.012, 0.02, 0, 0.042, -0.66);
  part(g, M.red, 0.004, 0.02, 0.05, 0.034, 0.0, 0.0);
  const mag = new THREE.Group(); g.add(mag); // ショットガンは マガジンなし（たまを こめる）
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.02, -0.7); g.add(muzzle);
  const eject = new THREE.Object3D(); eject.position.set(0.04, 0.01, -0.02); g.add(eject);
  return { group: g, mag, muzzle, eject, pump, magRest: mag.position.clone() };
}

// ロケットランチャー（かくうの デザイン: オリーブいろの つつ＋オレンジの ライン）
function makeRocket() {
  const g = new THREE.Group(); g.name = 'rocket';
  const M = GM;
  part(g, M.olive, 0.15, 0.15, 1.05, 0, 0.06, -0.08);                // つつ
  part(g, M.oliveD, 0.19, 0.19, 0.12, 0, 0.06, -0.62);               // まえの ふち
  part(g, M.oliveD, 0.2, 0.2, 0.16, 0, 0.06, 0.48);                  // うしろの ふち（ベル）
  part(g, M.rubber, 0.13, 0.13, 0.01, 0, 0.06, 0.565);
  for (const z of [-0.4, 0.05, 0.3]) part(g, M.oliveD, 0.158, 0.158, 0.03, 0, 0.06, z); // バンド
  part(g, M.orange, 0.156, 0.03, 0.1, 0, 0.12, -0.25);               // オレンジの ライン
  part(g, M.khaki, 0.09, 0.05, 0.3, 0, -0.04, 0.12);                 // かたあて
  part(g, M.poly, 0.05, 0.13, 0.06, 0, -0.07, -0.02, -0.3);          // グリップ
  part(g, M.poly, 0.012, 0.012, 0.07, 0, -0.06, -0.08);              // トリガーガード
  part(g, M.poly, 0.045, 0.1, 0.05, 0, -0.04, -0.34, -0.2);          // まえの グリップ
  part(g, M.metal, 0.05, 0.06, 0.13, -0.1, 0.12, -0.12);             // スコープ
  part(g, M.metal, 0.025, 0.04, 0.03, -0.085, 0.09, -0.12);
  part(g, M.lens, 0.04, 0.04, 0.004, -0.1, 0.12, -0.186);
  part(g, M.dot, 0.012, 0.012, 0.004, -0.1, 0.12, -0.054);
  part(g, M.steel, 0.02, 0.05, 0.02, 0, 0.16, -0.5);                 // まえの サイト
  // たま（リロードで まえから いれる）
  const mag = new THREE.Group(); mag.position.set(0, 0.06, -0.68); g.add(mag);
  part(mag, M.warhead, 0.11, 0.11, 0.16, 0, 0, -0.03);
  part(mag, M.warhead, 0.07, 0.07, 0.08, 0, 0, -0.14);
  part(mag, M.tip, 0.04, 0.04, 0.05, 0, 0, -0.2);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.06, -0.72); g.add(muzzle);
  const back = new THREE.Object3D(); back.position.set(0, 0.06, 0.6); g.add(back);
  const eject = new THREE.Object3D(); eject.position.set(0, 0.06, 0.6); g.add(eject);
  g.position.set(-0.02, 0.07, 0.1);
  return { group: g, mag, muzzle, eject, back, magRest: mag.position.clone() };
}

// ミニガン（かくうの デザイン: 6ぽんの つつが まわる・おもい）
function makeMinigun() {
  const g = new THREE.Group(); g.name = 'minigun';
  const M = GM;
  part(g, M.metal, 0.16, 0.16, 0.36, 0, 0.02, 0.04);                 // ほんたい
  part(g, M.poly, 0.17, 0.05, 0.3, 0, 0.12, 0.04);                   // うえの カバー
  part(g, M.orange, 0.172, 0.025, 0.08, 0, 0.06, -0.08);             // オレンジの ライン
  part(g, M.poly, 0.05, 0.13, 0.06, 0, -0.1, 0.12, -0.3);            // グリップ
  part(g, M.steel, 0.03, 0.03, 0.22, 0, 0.2, 0.02);                  // うえの とって
  part(g, M.steel, 0.03, 0.06, 0.03, 0, 0.165, -0.08); part(g, M.steel, 0.03, 0.06, 0.03, 0, 0.165, 0.12);
  part(g, M.poly, 0.05, 0.1, 0.05, 0, -0.07, -0.22, -0.2);           // まえの グリップ
  // まわる つつ（6ぽん）
  const barrels = new THREE.Group(); barrels.position.set(0, 0.02, -0.14); g.add(barrels);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    part(barrels, i === 0 ? M.steel : M.metal, 0.032, 0.032, 0.62, Math.cos(a) * 0.05, Math.sin(a) * 0.05, -0.31);
  }
  part(barrels, M.poly, 0.15, 0.15, 0.04, 0, 0, -0.08);              // つつを まとめる わ
  part(barrels, M.poly, 0.14, 0.14, 0.04, 0, 0, -0.46);
  part(barrels, M.steel, 0.15, 0.15, 0.04, 0, 0, -0.6);
  // たまの はこ（よこ）と ベルト
  const mag = new THREE.Group(); mag.position.set(-0.14, -0.06, 0.06); g.add(mag);
  part(mag, M.olive, 0.12, 0.16, 0.2, 0, 0, 0);
  part(mag, M.oliveD, 0.125, 0.03, 0.205, 0, 0.07, 0);
  part(mag, M.tan, 0.06, 0.03, 0.12, 0.08, 0.08, -0.02, 0, 0, -0.5);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.02, -0.78); g.add(muzzle);
  const eject = new THREE.Object3D(); eject.position.set(0.09, 0.0, 0.02); g.add(eject);
  g.position.set(0, -0.02, 0.06);
  return { group: g, mag, muzzle, eject, barrels, magRest: mag.position.clone() };
}

// とんでいく ロケット
export function makeRocketProjectile() {
  const g = new THREE.Group();
  part(g, GM.warhead, 0.1, 0.1, 0.34, 0, 0, 0);
  part(g, GM.tip, 0.06, 0.06, 0.08, 0, 0, -0.2);
  for (const r of [0, Math.PI / 2]) part(g, GM.oliveD, 0.24, 0.02, 0.08, 0, 0, 0.16, 0, 0, r);
  const flame = part(g, new THREE.MeshBasicMaterial({ color: 0xffc04a }), 0.07, 0.07, 0.12, 0, 0, 0.24);
  return { group: g, flame };
}

// v0.8.0: スナイパーライフル（かくうの デザイン・マークなし）。ながい つつ・スコープ・ボルト・2きゃく
function makeSniper() {
  const g = new THREE.Group(); g.name = 'sniper';
  const M = GM, wood = M.oliveD;
  part(g, M.metal, 0.066, 0.09, 0.34, 0, 0, 0);                     // レシーバー
  part(g, wood, 0.07, 0.07, 0.5, 0, -0.07, -0.08);                  // ストック まえ
  part(g, wood, 0.06, 0.12, 0.08, 0, -0.14, 0.12, -0.3);            // グリップ
  part(g, M.poly, 0.012, 0.012, 0.07, 0, -0.13, 0.05);              // トリガーガード
  part(g, wood, 0.07, 0.12, 0.26, 0, -0.06, 0.32);                  // ストック
  part(g, wood, 0.05, 0.03, 0.16, 0, 0.02, 0.3);                    // ほお あて
  part(g, M.rubber, 0.072, 0.15, 0.03, 0, -0.06, 0.46);             // パッド
  part(g, M.metal, 0.026, 0.026, 0.62, 0, 0.01, -0.62);             // ながい バレル
  part(g, M.steel, 0.042, 0.042, 0.1, 0, 0.01, -0.96);              // マズル
  for (const s of [-1, 1]) part(g, M.poly, 0.004, 0.026, 0.05, s * 0.022, 0.01, -0.96);
  // スコープ
  part(g, M.poly, 0.03, 0.03, 0.03, 0, 0.065, -0.12); part(g, M.poly, 0.03, 0.03, 0.03, 0, 0.065, 0.06);
  part(g, M.poly, 0.05, 0.05, 0.32, 0, 0.1, -0.03);
  part(g, M.poly, 0.066, 0.066, 0.06, 0, 0.1, -0.2); part(g, M.poly, 0.06, 0.06, 0.05, 0, 0.1, 0.13);
  part(g, M.lens, 0.05, 0.05, 0.004, 0, 0.1, -0.232);
  part(g, M.metal, 0.02, 0.02, 0.02, 0, 0.135, -0.03); part(g, M.metal, 0.02, 0.02, 0.02, 0.033, 0.1, -0.03);
  // 2きゃく（たたんだ）
  for (const s of [-1, 1]) part(g, M.metal, 0.012, 0.012, 0.22, s * 0.025, -0.06, -0.42, 0, s * 0.1);
  // ボルト（うつと うごく）
  const bolt = new THREE.Group(); bolt.position.set(0.04, 0.02, 0.06); g.add(bolt);
  part(bolt, M.steel, 0.02, 0.02, 0.07, 0, 0, 0);
  part(bolt, M.steel, 0.05, 0.014, 0.014, 0.025, 0, 0.02);
  part(bolt, M.metal, 0.026, 0.026, 0.026, 0.05, 0, 0.02);
  // マガジン（ちいさい）
  const mag = new THREE.Group(); mag.position.set(0, -0.09, -0.04); g.add(mag);
  part(mag, M.poly, 0.05, 0.07, 0.08, 0, -0.035, 0);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.01, -1.02); g.add(muzzle);
  const eject = new THREE.Object3D(); eject.position.set(0.045, 0.02, 0.0); g.add(eject);
  return { group: g, mag, muzzle, eject, bolt, boltRest: bolt.position.z, gripLeft: new THREE.Vector3(0, -0.08, -0.36), magRest: mag.position.clone() };
}

// v0.11.0: ミサイルランチャー（かくうの デザイン・マークなし）。はこがたで まえに 3つの つつ。かたに のせる
function makeMLauncher() {
  const g = new THREE.Group(); g.name = 'mlauncher';
  const M = GM;
  part(g, M.steel, 0.24, 0.17, 0.78, 0, 0.07, -0.06);                // はこ
  part(g, M.metal, 0.25, 0.04, 0.8, 0, 0.165, -0.06);                // うえの カバー
  part(g, M.orange, 0.245, 0.03, 0.1, 0, 0.1, 0.2);                  // オレンジの ライン
  part(g, M.metal, 0.26, 0.19, 0.06, 0, 0.07, 0.34);                 // うしろの ふち
  part(g, M.khaki, 0.09, 0.05, 0.3, 0, -0.05, 0.12);                 // かたあて
  part(g, M.poly, 0.05, 0.13, 0.06, 0, -0.08, 0.0, -0.3);            // グリップ
  part(g, M.poly, 0.012, 0.012, 0.07, 0, -0.06, -0.06);              // トリガーガード
  part(g, M.poly, 0.045, 0.1, 0.05, 0, -0.05, -0.3, -0.2);           // まえの グリップ
  part(g, M.metal, 0.05, 0.06, 0.13, -0.15, 0.13, -0.1);             // ねらう めがね
  part(g, M.lens, 0.04, 0.04, 0.004, -0.15, 0.13, -0.166);
  // まえの 3つの つつ（ミサイルの あたまが みえる）
  const mag = new THREE.Group(); mag.position.set(0, 0.07, -0.46); g.add(mag);
  for (const [x, y] of [[-0.065, 0.035], [0.065, 0.035], [0, -0.04]]) {
    part(g, M.rubber, 0.08, 0.08, 0.02, x, 0.07 + y, -0.455);
    part(mag, M.tip, 0.05, 0.05, 0.04, x, y, -0.005);
  }
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.07, -0.5); g.add(muzzle);
  const back = new THREE.Object3D(); back.position.set(0, 0.07, 0.4); g.add(back);
  const eject = new THREE.Object3D(); eject.position.set(0, 0.07, 0.4); g.add(eject);
  g.position.set(-0.02, 0.07, 0.1);
  return { group: g, mag, muzzle, eject, back, magRest: mag.position.clone() };
}
// v0.11.0: ちいさな ミサイル（しろっぽい からだ・オレンジの あたま・はね）。big: スーツの ミサイル
export function makeMissile(big = false) {
  const g = new THREE.Group();
  part(g, L(0xe6e9e3), 0.12, 0.12, 0.46, 0, 0, 0);
  part(g, GM.tip, 0.09, 0.09, 0.1, 0, 0, -0.28);
  part(g, GM.orange, 0.125, 0.125, 0.05, 0, 0, -0.12);
  for (const r of [0, Math.PI / 2]) part(g, GM.metal, 0.28, 0.02, 0.1, 0, 0, 0.19, 0, 0, r);
  const flame = part(g, new THREE.MeshBasicMaterial({ color: 0xffd060 }), 0.1, 0.1, 0.26, 0, 0, 0.36);
  if (big) g.scale.setScalar(1.5);
  return { group: g, flame };
}

// ---- v0.15.0: あたらしい ぶき（かくうの デザイン・マークなし）----
const GM2 = {
  white: L(0xdfe5ea), cyan: new THREE.MeshBasicMaterial({ color: 0x5ff2ff }), red: new THREE.MeshBasicMaterial({ color: 0xff4a3a }),
  tank: L(0xc8452e), brass: L(0xb8913a), purple: L(0x6a4fb0), violet: new THREE.MeshBasicMaterial({ color: 0xd88cff }),
  can: L(0x8a9298), canTop: L(0x4c5257), smokeBand: L(0xd8dde2),
};
// レーザーじゅう: しろくて ほそながい・あおく ひかる ライン
function makeLaserGun() {
  const g = new THREE.Group(); g.name = 'laser';
  const M = GM, N = GM2;
  part(g, N.white, 0.07, 0.1, 0.42, 0, 0, -0.04);                   // からだ
  part(g, M.poly, 0.05, 0.05, 0.26, 0, 0.01, -0.36);                // つつ
  part(g, N.cyan, 0.072, 0.014, 0.34, 0, 0.035, -0.04);             // ひかる ライン
  part(g, N.red, 0.03, 0.03, 0.012, 0, 0.01, -0.495);               // さきの レンズ
  part(g, M.poly, 0.05, 0.12, 0.06, 0, -0.11, 0.08, -0.3);          // グリップ
  part(g, M.poly, 0.012, 0.012, 0.07, 0, -0.08, 0.02);              // トリガーガード
  part(g, N.white, 0.045, 0.06, 0.16, 0, -0.01, 0.24);              // ストック
  const mag = new THREE.Group(); mag.position.set(0, -0.07, -0.08); g.add(mag);
  part(mag, M.poly, 0.06, 0.04, 0.1, 0, 0, 0);                      // バッテリー
  part(mag, N.cyan, 0.062, 0.01, 0.06, 0, -0.02, 0);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.01, -0.51); g.add(muzzle);
  const eject = new THREE.Object3D(); eject.position.set(0.04, 0.02, 0); g.add(eject);
  return { group: g, mag, muzzle, eject, magRest: mag.position.clone() };
}
// かえんほうしゃき: したに あかい タンク・まえに ノズル
function makeFlamerGun() {
  const g = new THREE.Group(); g.name = 'flamer';
  const M = GM, N = GM2;
  part(g, M.metal, 0.08, 0.09, 0.4, 0, 0, -0.05);                   // からだ
  part(g, M.steel, 0.06, 0.06, 0.26, 0, 0.0, -0.37);                // ノズル
  part(g, N.brass, 0.075, 0.075, 0.04, 0, 0.0, -0.5);               // ノズルの さき
  part(g, M.orange, 0.02, 0.02, 0.02, 0, -0.045, -0.5);             // くちびの ひ
  part(g, M.poly, 0.05, 0.12, 0.06, 0, -0.11, 0.1, -0.3);           // グリップ
  part(g, M.poly, 0.045, 0.1, 0.05, 0, -0.08, -0.26, -0.15);        // まえの グリップ
  const mag = new THREE.Group(); mag.position.set(0, -0.1, -0.06); g.add(mag);
  part(mag, N.tank, 0.1, 0.1, 0.26, 0, 0, 0);                       // タンク
  part(mag, M.steel, 0.104, 0.02, 0.03, 0, 0, -0.08);
  part(mag, M.steel, 0.104, 0.02, 0.03, 0, 0, 0.08);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.0, -0.53); g.add(muzzle);
  const eject = new THREE.Object3D(); eject.position.set(0.04, 0.02, 0); g.add(eject);
  return { group: g, mag, muzzle, eject, magRest: mag.position.clone() };
}
// ビームじゅう: ふとくて むらさき・まえに ひかる わ
function makeBeamGun() {
  const g = new THREE.Group(); g.name = 'beam';
  const M = GM, N = GM2;
  part(g, N.purple, 0.12, 0.13, 0.46, 0, 0.01, -0.06);              // からだ
  part(g, M.metal, 0.13, 0.03, 0.4, 0, 0.09, -0.06);                // うえ
  part(g, N.violet, 0.124, 0.02, 0.3, 0, 0.03, -0.06);              // ひかる ライン
  for (const z of [-0.33, -0.4, -0.47]) part(g, M.steel, 0.15, 0.15, 0.025, 0, 0.01, z); // まえの わ
  part(g, N.violet, 0.07, 0.07, 0.01, 0, 0.01, -0.49);              // ひかる さき
  part(g, M.poly, 0.05, 0.12, 0.06, 0, -0.12, 0.1, -0.3);           // グリップ
  part(g, M.poly, 0.05, 0.1, 0.05, 0, -0.09, -0.24, -0.15);         // まえの グリップ
  const mag = new THREE.Group(); mag.position.set(0, 0.01, 0.22); g.add(mag);
  part(mag, M.poly, 0.1, 0.1, 0.1, 0, 0, 0);                        // エネルギーの はこ
  part(mag, N.violet, 0.102, 0.03, 0.06, 0, 0.0, 0);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.01, -0.5); g.add(muzzle);
  const eject = new THREE.Object3D(); eject.position.set(0.05, 0.02, 0); g.add(eject);
  return { group: g, mag, muzzle, eject, magRest: mag.position.clone() };
}
// スモークグレネード（てに もつ かん）
export function makeSmokeCan() {
  const g = new THREE.Group();
  part(g, GM2.can, 0.075, 0.13, 0.075, 0, 0, 0);
  part(g, GM2.smokeBand, 0.078, 0.025, 0.078, 0, 0.02, 0);
  part(g, GM2.canTop, 0.05, 0.03, 0.05, 0, 0.08, 0);
  part(g, GM.steel, 0.012, 0.05, 0.03, 0.03, 0.06, 0);              // レバー
  return g;
}
function makeSmokeHand() {
  const g = new THREE.Group(); g.name = 'smoke';
  const mag = new THREE.Group(); mag.position.set(0, -0.02, -0.05); g.add(mag);
  mag.add(makeSmokeCan());
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.05, -0.1); g.add(muzzle);
  const eject = new THREE.Object3D(); eject.position.set(0, 0, 0); g.add(eject);
  return { group: g, mag, muzzle, eject, magRest: mag.position.clone() };
}

export function makeWeapons() {
  const rifle = makeRifle(); rifle.group.scale.setScalar(1.15);
  return { rifle, pistol: makePistol(), shotgun: makeShotgun(), rocket: makeRocket(), minigun: makeMinigun(), sniper: makeSniper(), magnum: makeMagnum(), mlauncher: makeMLauncher(),
    laser: makeLaserGun(), flamer: makeFlamerGun(), beam: makeBeamGun(), smoke: makeSmokeHand() };
}
export function makeMagMesh() {
  const g = new THREE.Group();
  part(g, GM.poly, 0.05, 0.12, 0.075, 0, -0.06, 0, 0.12);
  part(g, GM.poly, 0.05, 0.1, 0.075, 0, -0.16, -0.025, 0.38);
  part(g, GM.orange, 0.054, 0.018, 0.08, 0, -0.215, -0.05, 0.38);
  return g;
}

// ---- プレイヤー（かくうの へいたい・ブロック） ----
// ふく（みためだけ）: やくわり → いろ。[いろ, ざらつき] は ドットの テクスチャ、camo は めいさい
const OUTFIT_LOOK = {
  normal: { uniform: [0x6b7a4a, 0.18], vest: [0x3e4632, 0.2], pants: [0x55603d, 0.18], boots: 0x2a2420, helmet: [0x4f5b3a, 0.2],
    glove: 0x2b2b2b, mark: 0xff8a1f, skin: 0xd9a982, face: {} },
  camo: { uniform: { camo: [0x8f9a5c, 0x5f6e38, 0x3e4a26, 0xa08a5a] }, vest: [0x6e6340, 0.2], pants: { camo: [0x7d8a4e, 0x4f5e2e, 0x34401f, 0x8f7a4e] },
    boots: 0x3a2e22, helmet: { camo: [0x8f9a5c, 0x3e4a26, 0x5f6e38, 0xa08a5a] }, glove: 0x4a3f2a, mark: 0xffd84a, skin: 0xd9a982,
    face: { top: '#5f6e38', band: '#2e3a1c', eye: '#b6f36a' } },
  ninja: { uniform: [0x2a3148, 0.14], vest: [0x1d2234, 0.14], pants: [0x2a3148, 0.14], boots: 0x14161c, helmet: [0x2a3148, 0.1],
    glove: 0x14161c, mark: 0xd63a3a, skin: 0x2a3148, face: { top: '#2a3148', band: null, eye: '#2b2522', mask: '#2a3148', skin: '#d9a982' },
    noHelmet: true, extra: 'ninja' },
  kaito: { uniform: [0xf2f2f2, 0.06], vest: [0x2d3a6b, 0.12], pants: [0xf2f2f2, 0.06], boots: 0x30303a, helmet: [0xf2f2f2, 0.05],
    glove: 0xffffff, mark: 0xd63a3a, skin: 0xd9a982, face: { top: '#30303a', band: null, domino: '#ffffff', eye: '#2b2522' },
    noHelmet: true, extra: 'kaito' },
  space: { uniform: [0xf0f2f5, 0.06], vest: [0xd5dbe3, 0.08], pants: [0xf0f2f5, 0.06], boots: 0x8e99a6, helmet: [0xf8f8f8, 0.05],
    glove: 0x8e99a6, mark: 0xff8a1f, skin: 0xd9a982, face: { top: '#f8f8f8', band: null, eye: '#2b2522', mouth: '#b06a50' }, extra: 'space' },
  gold: { uniform: [0xe8b923, 0.12], vest: [0xc9961a, 0.12], pants: [0xd9a81f, 0.12], boots: 0x8a6a12, helmet: [0xf5cd30, 0.1],
    glove: 0xfff0a0, mark: 0xffffff, skin: 0xd9a982, face: { top: '#f5cd30', band: '#7a5a10', eye: '#fff6c8' }, glow: 0x3a2800, extra: 'gold' },
  robot: { uniform: [0xa3acb6, 0.1], vest: [0x5f6873, 0.12], pants: [0x808a95, 0.1], boots: 0x3a3f47, helmet: [0xc0c8d0, 0.08],
    glove: 0x3a3f47, mark: 0x2fd4ff, skin: 0xb0b8c0, face: { skin: '#b0b8c0', top: '#c0c8d0', band: '#1c2530', eye: '#2fd4ff', grill: '#4a535e' },
    glow: 0x0a0c10, extra: 'robot' },
};
const outfitMatCache = new Map();
function outfitMats(id) {
  if (outfitMatCache.has(id)) return outfitMatCache.get(id);
  const o = OUTFIT_LOOK[id] || OUTFIT_LOOK.normal, glow = o.glow ? { emissive: o.glow } : {};
  let seed = 3;
  const mk = (v) => {
    seed++;
    if (typeof v === 'number') return L(v, glow);
    if (v.camo) return new THREE.MeshLambertMaterial({ map: camoTexture(v.camo, seed * 7), ...glow });
    return new THREE.MeshLambertMaterial({ map: solidTexture(v[0], v[1], seed), ...glow });
  };
  const m = { uniform: mk(o.uniform), vest: mk(o.vest), pants: mk(o.pants), boots: mk(o.boots), helmet: mk(o.helmet),
    glove: mk(o.glove), mark: id === 'normal' ? GM.orange : mk(o.mark), skin: L(o.skin, glow) };
  m.face = new THREE.MeshLambertMaterial({ map: playerFaceTexture(o.face), ...glow });
  m.head = [m.skin, m.skin, m.skin, m.skin, m.skin, m.face];
  outfitMatCache.set(id, m);
  return m;
}
function makeOutfitExtras(headPivot, torso) {
  const ex = {};
  const add = (k) => { const g = new THREE.Group(); g.visible = false; ex[k] = g; return g; };
  { // にんじゃ: あかい はちまき
    const h = add('ninja'); headPivot.add(h); const red = L(0xd63a3a);
    part(h, red, 0.5, 0.07, 0.5, 0, 0.4, 0);
    part(h, red, 0.07, 0.06, 0.26, 0.07, 0.36, 0.34, 0.4, 0.25); part(h, red, 0.07, 0.06, 0.22, -0.05, 0.34, 0.33, 0.6, -0.2);
  }
  { // かいとう: シルクハットと マント
    const h = add('kaito'); headPivot.add(h); const w = L(0xf6f6f6), bl = L(0x2d3a6b), rd = L(0xb8323a);
    part(h, w, 0.62, 0.04, 0.62, 0, 0.5, 0);
    part(h, w, 0.4, 0.36, 0.4, 0, 0.7, 0);
    part(h, bl, 0.41, 0.06, 0.41, 0, 0.56, 0);
    const c = add('kaitoCape'); torso.add(c);
    part(c, bl, 0.62, 0.86, 0.04, 0, 0.3, 0.36, -0.08);
    part(c, rd, 0.56, 0.8, 0.02, 0, 0.31, 0.335, -0.08);
    part(c, bl, 0.66, 0.08, 0.2, 0, 0.7, 0.26);
  }
  { // うちゅうふく: ヘルメットの ガラス
    const h = add('space'); headPivot.add(h);
    const glass = new THREE.MeshLambertMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.35, emissive: 0x0a2430 });
    part(h, glass, 0.52, 0.34, 0.04, 0, 0.24, -0.26);
    part(h, L(0xf8f8f8), 0.56, 0.05, 0.06, 0, 0.43, -0.26);
    part(h, L(0xff8a1f), 0.04, 0.16, 0.04, 0.2, 0.66, 0.1);
  }
  { // ゴールド: あたまの ほし
    const h = add('gold'); headPivot.add(h);
    const st = new THREE.MeshBasicMaterial({ color: 0xfff3a0 });
    part(h, st, 0.12, 0.12, 0.04, 0, 0.47, -0.29, 0, 0, Math.PI / 4);
  }
  { // ロボット: アンテナと むねの ランプ
    const h = add('robot'); headPivot.add(h); const lamp = new THREE.MeshBasicMaterial({ color: 0x2fd4ff });
    part(h, L(0x5f6873), 0.04, 0.24, 0.04, 0, 0.68, 0);
    part(h, lamp, 0.1, 0.1, 0.1, 0, 0.82, 0);
    part(h, L(0x5f6873), 0.08, 0.14, 0.14, 0.27, 0.27, 0); part(h, L(0x5f6873), 0.08, 0.14, 0.14, -0.27, 0.27, 0);
    const c = add('robotChest'); torso.add(c);
    part(c, lamp, 0.14, 0.08, 0.02, 0.1, 0.5, -0.175); part(c, new THREE.MeshBasicMaterial({ color: 0xffd84a }), 0.06, 0.06, 0.02, -0.06, 0.5, -0.175);
  }
  return ex;
}
// ふくを きがえる（いろを かえる・かざりを だす）
export function applyOutfit(P, id) {
  if (!OUTFIT_LOOK[id]) id = 'normal';
  const m = outfitMats(id), o = OUTFIT_LOOK[id];
  for (const mesh of P.roleMeshes) mesh.material = m[mesh.userData.role];
  P.helmet.visible = !o.noHelmet;
  for (const [k, g] of Object.entries(P.extras)) g.visible = !!o.extra && k.startsWith(o.extra);
  P.outfit = id;
  applyGear(P, P.gearItems);
}

// そうびの いろ（レアほど ひかる）
const RARE_GLOW = { n: 0, r: 0.14, sr: 0.28, l: 0.45 };
const gearMatCache = new Map();
function gearMat(color, rarity) {
  const k = color + ':' + rarity;
  if (!gearMatCache.has(k)) {
    const c = new THREE.Color(color), e = c.clone().multiplyScalar(RARE_GLOW[rarity] || 0);
    gearMatCache.set(k, new THREE.MeshLambertMaterial({ map: solidTexture(color, 0.12, 77), emissive: e }));
  }
  return gearMatCache.get(k);
}
// items: [{slot, colorHex, rarity}]（slot ごとに 1つ）
export function applyGear(P, items) {
  P.gearItems = items || [];
  const by = {}; for (const it of P.gearItems) if (it) by[it.slot] = it;
  const noHelmet = !!(OUTFIT_LOOK[P.outfit] || {}).noHelmet;
  const feetGroups = P.gear.feet.userData.parts;
  for (const slot of ['head', 'body', 'feet', 'arm']) {
    const it = by[slot], on = !!it;
    const meshes = slot === 'head' ? P.gearMeshes.head.concat(P.gearMeshes.headCrest) : P.gearMeshes[slot];
    if (on) { const m = gearMat(it.colorHex, it.rarity); for (const me of meshes) me.material = m; }
    if (slot === 'head') { P.gear.head.visible = on; P.gear.headCrest.visible = on && !noHelmet; }
    else if (slot === 'feet') { for (const t of feetGroups) t.visible = on; }
    else if (slot === 'arm') { for (const me of P.gearMeshes.arm) me.visible = on; }
    else P.gear[slot].visible = on;
  }
}

// ---- そうびの はこ（レアの いろで ひかる）----
export function makeGearDrop(glowTex) {
  const g = new THREE.Group();
  const spin = new THREE.Group(); g.add(spin);
  const box = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const band = new THREE.MeshBasicMaterial({ color: 0xffffff });
  part(spin, box, 0.42, 0.36, 0.42, 0, 0.18, 0);
  part(spin, band, 0.44, 0.06, 0.44, 0, 0.26, 0);
  part(spin, band, 0.08, 0.38, 0.44, 0, 0.18, 0);
  part(spin, L(0xfff6c8), 0.1, 0.1, 0.03, 0, 0.18, -0.225, 0, 0, Math.PI / 4);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffffff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.scale.set(1.7, 1.7, 1); glow.position.y = 0.3; g.add(glow);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.56, 20).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
  ring.position.y = 0.03; g.add(ring);
  // でんせつは ひかりの はしら
  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.16, 4, 0.16), new THREE.MeshBasicMaterial({ color: 0xffe27a, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
  beam.position.y = 2; g.add(beam);
  return { group: g, spin, glow, ring, beam, box, band,
    set(colorHex, rarityHex, legend) { box.color.setHex(colorHex); band.color.setHex(rarityHex); glow.material.color.setHex(rarityHex); ring.material.color.setHex(rarityHex); beam.visible = legend; } };
}

export function makePlayer() {
  const root = new THREE.Group();
  const roleMeshes = [];
  const m0 = outfitMats('normal');
  const R = (parent, role, ...a) => { const me = part(parent, m0[role], ...a); me.userData.role = role; roleMeshes.push(me); return me; };

  const legs = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(s * 0.13, 0.74, 0); root.add(pivot);
    R(pivot, 'pants', 0.25, 0.6, 0.27, 0, -0.3, 0);
    R(pivot, 'boots', 0.26, 0.15, 0.3, 0, -0.66, -0.02);
    legs.push(pivot);
  }
  const torso = new THREE.Group(); torso.position.y = 0.74; root.add(torso);
  R(torso, 'uniform', 0.52, 0.7, 0.28, 0, 0.35, 0);
  R(torso, 'vest', 0.56, 0.46, 0.33, 0, 0.42, 0);
  for (const s of [-1, 1]) R(torso, 'vest', 0.1, 0.12, 0.06, s * 0.15, 0.32, -0.19); // ポーチ
  R(torso, 'mark', 0.12, 0.04, 0.02, -0.16, 0.6, -0.17);  // かたの マーク（かくう）
  R(torso, 'vest', 0.4, 0.42, 0.18, 0, 0.42, 0.24);         // リュック
  R(torso, 'uniform', 0.3, 0.12, 0.16, 0, 0.66, 0.26);
  const headPivot = new THREE.Group(); headPivot.position.y = 0.72; torso.add(headPivot);
  R(headPivot, 'head', 0.46, 0.46, 0.46, 0, 0.25, 0);
  const helmet = new THREE.Group(); headPivot.add(helmet);
  R(helmet, 'helmet', 0.54, 0.16, 0.54, 0, 0.5, 0.0);
  R(helmet, 'helmet', 0.56, 0.06, 0.6, 0, 0.42, -0.02);
  R(helmet, 'glove', 0.5, 0.06, 0.06, 0, 0.36, -0.25);

  const aim = new THREE.Group(); aim.position.set(0, 0.62, 0); torso.add(aim);
  const armR = new THREE.Group(); armR.position.set(0.33, 0, 0); aim.add(armR);
  R(armR, 'uniform', 0.2, 0.2, 0.5, 0, -0.04, -0.2);
  R(armR, 'glove', 0.21, 0.21, 0.14, 0, -0.04, -0.5);
  const armL = new THREE.Group(); armL.position.set(-0.33, 0, 0); aim.add(armL);
  R(armL, 'uniform', 0.2, 0.2, 0.62, 0, -0.04, -0.26);
  R(armL, 'glove', 0.21, 0.21, 0.14, 0, -0.04, -0.62);
  const holder = new THREE.Group(); holder.position.set(0.16, -0.06, -0.42); aim.add(holder);
  const extras = makeOutfitExtras(headPivot, torso);
  // そうびの かざり（いろは そうびごと。ふくの うえに つく）
  const gm = L(0xffffff), gear = {}, mk = (k) => { const g = new THREE.Group(); g.visible = false; gear[k] = g; return g; };
  { const h = mk('head'); headPivot.add(h);
    for (const s of [-1, 1]) part(h, gm, 0.06, 0.17, 0.17, s * 0.25, 0.25, 0.02);   // みみあて
    const c = mk('headCrest'); headPivot.add(c); part(c, gm, 0.1, 0.1, 0.34, 0, 0.6, 0.02); }
  { const b = mk('body'); torso.add(b);
    for (const s of [-1, 1]) part(b, gm, 0.22, 0.09, 0.32, s * 0.33, 0.69, 0);      // かたあて
    part(b, gm, 0.42, 0.06, 0.02, 0, 0.53, -0.175); }
  { const f = mk('feet'); root.add(f);
    for (const lg of legs) { const t = new THREE.Group(); t.visible = true; lg.add(t); part(t, gm, 0.27, 0.08, 0.1, 0, -0.62, -0.17); part(t, gm, 0.27, 0.05, 0.31, 0, -0.56, -0.02); f.userData.parts = (f.userData.parts || []).concat(t); } }
  { const a = mk('arm'); aim.add(a);
    part(armR, gm, 0.23, 0.23, 0.07, 0, -0.04, -0.4).userData.gearArm = true;
    part(armL, gm, 0.23, 0.23, 0.07, 0, -0.04, -0.52).userData.gearArm = true; }
  const gearArm = []; for (const arm of [armR, armL]) for (const c of arm.children) if (c.userData.gearArm) { c.visible = false; gearArm.push(c); }
  const gearMeshes = {};
  for (const k of Object.keys(gear)) { gearMeshes[k] = []; gear[k].traverse((o) => { if (o.isMesh) gearMeshes[k].push(o); }); }
  gearMeshes.feet = []; for (const t of gear.feet.userData.parts) t.traverse((o) => { if (o.isMesh) gearMeshes.feet.push(o); });
  gearMeshes.arm = gearArm;
  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { root, legs, torso, headPivot, aim, armR, armL, holder, roleMeshes, helmet, extras, outfit: 'normal', gear, gearMeshes, gearItems: [] };
}

// ---- おじさん（はげ・めがね・くちひげ。よわいけど やさしい） ----
export function makeOjisan() {
  const T = ojisanTextures();
  const root = new THREE.Group(), inner = new THREE.Group(); root.add(inner);
  const skin = L(T.skin);
  const shirt = new THREE.MeshLambertMaterial({ map: solidTexture(0x8cc6e8, 0.12, 41) });
  const pants = new THREE.MeshLambertMaterial({ map: solidTexture(0x7a5a3c, 0.15, 42) });
  const belt = L(0x3a2a20), shoe = L(0x4a3a30);
  const head = [new THREE.MeshLambertMaterial({ map: T.side }), new THREE.MeshLambertMaterial({ map: T.side }),
    new THREE.MeshLambertMaterial({ map: T.top }), skin, new THREE.MeshLambertMaterial({ map: T.back }), new THREE.MeshLambertMaterial({ map: T.face })];
  const legs = [];
  for (const s of [-1, 1]) {
    const pv = new THREE.Group(); pv.position.set(s * 0.13, 0.66, 0); inner.add(pv);
    part(pv, pants, 0.24, 0.54, 0.26, 0, -0.27, 0);
    part(pv, shoe, 0.25, 0.12, 0.32, 0, -0.6, -0.03);
    legs.push(pv);
  }
  const body = new THREE.Group(); body.position.y = 0.66; inner.add(body);
  part(body, shirt, 0.56, 0.62, 0.36, 0, 0.31, 0);
  part(body, shirt, 0.5, 0.3, 0.06, 0, 0.22, -0.2);          // おなか ぽっこり
  part(body, belt, 0.57, 0.06, 0.37, 0, 0.04, 0);
  part(body, L(0xffffff), 0.16, 0.08, 0.02, 0, 0.58, -0.185); // えり
  part(body, L(0xe8c050), 0.05, 0.05, 0.02, 0.15, 0.45, -0.185); // むねポケットの ペン
  const headPivot = new THREE.Group(); headPivot.position.y = 0.64; body.add(headPivot);
  part(headPivot, head, 0.44, 0.44, 0.44, 0, 0.22, 0);
  const arms = [];
  for (const s of [-1, 1]) {
    const pv = new THREE.Group(); pv.position.set(s * 0.36, 0.56, 0); body.add(pv);
    part(pv, shirt, 0.18, 0.2, 0.2, 0, -0.06, 0);               // はんそで
    part(pv, skin, 0.15, 0.36, 0.16, 0, -0.32, 0);
    arms.push(pv);
  }
  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { root, inner, legs, body, headPivot, arms };
}

// ---- v0.9.0: けいさつおじさん（かくうの せいふく: こんの うわぎ・みずいろの シャツ・ぼうし。マーク・もじ・バッジ なし）----
export const COP_CHUNKS = [[0x23345e, 0], [0x8cc6e8, 1], [0x1a1f2a, 2]];
export function makePoliceOfficer() {
  const T = ojisanTextures();
  const root = new THREE.Group(), inner = new THREE.Group(); root.add(inner);
  const skin = L(T.skin);
  const coat = new THREE.MeshLambertMaterial({ map: solidTexture(0x23345e, 0.12, 51) });
  const shirt = new THREE.MeshLambertMaterial({ map: solidTexture(0x8cc6e8, 0.1, 52) });
  const pants = new THREE.MeshLambertMaterial({ map: solidTexture(0x1f2a44, 0.12, 53) });
  const belt = L(0x1a1a1a), shoe = L(0x1a1f2a), cap = L(0x1f2c52), brim = L(0x111418), band = L(0x5a6e9a);
  const head = [new THREE.MeshLambertMaterial({ map: T.side }), new THREE.MeshLambertMaterial({ map: T.side }),
    new THREE.MeshLambertMaterial({ map: T.top }), skin, new THREE.MeshLambertMaterial({ map: T.back }), new THREE.MeshLambertMaterial({ map: T.face })];
  const legs = [];
  for (const s of [-1, 1]) {
    const pv = new THREE.Group(); pv.position.set(s * 0.13, 0.66, 0); inner.add(pv);
    part(pv, pants, 0.24, 0.54, 0.26, 0, -0.27, 0);
    part(pv, shoe, 0.25, 0.12, 0.32, 0, -0.6, -0.03);
    legs.push(pv);
  }
  const body = new THREE.Group(); body.position.y = 0.66; inner.add(body);
  part(body, coat, 0.56, 0.62, 0.36, 0, 0.31, 0);
  part(body, shirt, 0.16, 0.2, 0.02, 0, 0.5, -0.185);        // えりもと の シャツ
  part(body, coat, 0.06, 0.2, 0.02, 0, 0.47, -0.19);          // ネクタイ みたいな せん（こん）
  part(body, belt, 0.57, 0.07, 0.37, 0, 0.04, 0);
  part(body, L(0x2a2a2a), 0.12, 0.14, 0.08, 0.22, 0.06, 0.12); // こしの ポーチ（むじ）
  const headPivot = new THREE.Group(); headPivot.position.y = 0.64; body.add(headPivot);
  part(headPivot, head, 0.44, 0.44, 0.44, 0, 0.22, 0);
  part(headPivot, cap, 0.47, 0.13, 0.47, 0, 0.47, 0);          // ぼうし（むじ）
  part(headPivot, band, 0.48, 0.04, 0.48, 0, 0.42, 0);
  part(headPivot, brim, 0.4, 0.03, 0.16, 0, 0.42, -0.28);      // つば
  const aim = new THREE.Group(); aim.position.set(0, 0.52, 0); body.add(aim);
  const arms = [];
  for (const s of [-1, 1]) {
    const pv = new THREE.Group(); pv.position.set(s * 0.36, 0.04, 0); aim.add(pv);
    part(pv, coat, 0.18, 0.18, 0.2, 0, 0, 0);
    part(pv, coat, 0.15, 0.15, 0.42, 0, -0.03, -0.2);
    part(pv, skin, 0.13, 0.13, 0.1, 0, -0.03, -0.45);
    pv.rotation.y = -s * 0.32;                                   // りょうてで ハンドガン
    arms.push(pv);
  }
  const holder = new THREE.Group(); holder.position.set(0, -0.02, -0.52); aim.add(holder);
  const gun = makePistol(); gun.group.scale.setScalar(1.6); holder.add(gun.group);
  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { root, inner, legs, body, headPivot, aim, arms, holder, gun, muzzle: gun.muzzle };
}

// ---- v0.7.0: けいさつロボ（かくうの デザイン: しろ と こん・あおい ライト・ほしの たて。ほんものの マーク・もじは なし）----
export const ROBOT_CHUNKS = [[0xf2f4f8, 0], [0x1f2f5c, 0], [0xf2f4f8, 1], [0x1f2f5c, 1], [0xf2f4f8, 2], [0x3aa0ff, 2], [0x1f2f5c, 3], [0xf2c94c, 1]];
function starShape(r0, r1) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? r1 : r0;
    if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r); else s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return s;
}
export function makePoliceRobot(glowTex) {
  const root = new THREE.Group(), inner = new THREE.Group(); root.add(inner);
  const white = L(0xf2f4f8), navy = L(0x1f2f5c), dark = L(0x2a2f38), gold = L(0xf2c94c, { emissive: 0x3a2a00 });
  const visor = new THREE.MeshBasicMaterial({ color: 0x6fe3ff });
  const lamp = new THREE.MeshBasicMaterial({ color: 0x3aa0ff });
  const legs = [];
  for (const s of [-1, 1]) {
    const pv = new THREE.Group(); pv.position.set(s * 0.15, 0.64, 0); inner.add(pv);
    part(pv, navy, 0.24, 0.5, 0.26, 0, -0.25, 0);
    part(pv, white, 0.27, 0.1, 0.27, 0, -0.26, 0);          // ひざの わ
    part(pv, white, 0.29, 0.16, 0.34, 0, -0.58, -0.03);     // あし
    legs.push(pv);
  }
  const body = new THREE.Group(); body.position.y = 0.64; inner.add(body);
  part(body, white, 0.62, 0.64, 0.4, 0, 0.34, 0);
  part(body, navy, 0.64, 0.12, 0.42, 0, 0.06, 0);             // こしの ベルト
  part(body, navy, 0.5, 0.08, 0.42, 0, 0.6, 0);               // むねの ライン
  part(body, navy, 0.26, 0.28, 0.03, 0, 0.34, -0.21);         // たて（むね）
  const star = new THREE.Mesh(new THREE.ShapeGeometry(starShape(0.085, 0.036)), gold);
  star.position.set(0, 0.34, -0.226); star.rotation.y = Math.PI; body.add(star);
  part(body, dark, 0.3, 0.3, 0.12, 0, 0.36, 0.25);            // せなかの バッテリー
  part(body, lamp, 0.06, 0.06, 0.02, 0.08, 0.44, 0.315);
  const headPivot = new THREE.Group(); headPivot.position.y = 0.66; body.add(headPivot);
  part(headPivot, white, 0.44, 0.36, 0.42, 0, 0.2, 0);
  part(headPivot, navy, 0.48, 0.1, 0.46, 0, 0.4, 0);          // ぼうしの つば みたいな ふち
  part(headPivot, navy, 0.36, 0.14, 0.04, 0, 0.21, -0.215);
  part(headPivot, visor, 0.3, 0.06, 0.02, 0, 0.21, -0.24);    // め（バイザー）
  for (const s of [-1, 1]) part(headPivot, dark, 0.04, 0.14, 0.14, s * 0.24, 0.2, 0); // みみ
  const light = part(headPivot, lamp, 0.16, 0.11, 0.16, 0, 0.5, 0); // あたまの あおい ライト
  part(headPivot, dark, 0.2, 0.03, 0.2, 0, 0.45, 0);
  const aim = new THREE.Group(); aim.position.set(0, 0.52, 0); body.add(aim);
  const arms = [];
  for (const s of [-1, 1]) {
    const pv = new THREE.Group(); pv.position.set(s * 0.38, 0, 0); aim.add(pv);
    part(pv, navy, 0.22, 0.22, 0.22, 0, 0.02, 0);             // かた
    part(pv, white, 0.17, 0.17, s > 0 ? 0.46 : 0.58, 0, -0.04, s > 0 ? -0.2 : -0.26);
    part(pv, dark, 0.19, 0.19, 0.12, 0, -0.04, s > 0 ? -0.46 : -0.58);
    arms.push(pv);
  }
  const holder = new THREE.Group(); holder.position.set(0.18, -0.06, -0.44); aim.add(holder);
  const gun = makeRifle(); holder.add(gun.group);
  // まだ なかまに なっていない ときの めじるし（あおい ひかりの わ と はしら）
  const marker = new THREE.Group(); root.add(marker);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.82, 28).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x5ab8ff, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }));
  ring.position.y = 0.04; marker.add(ring);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.22, 5, 0.22), new THREE.MeshBasicMaterial({ color: 0x6fc4ff, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false }));
  beam.position.y = 2.5; marker.add(beam);
  let glow = null;
  if (glowTex) {
    glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x5ab8ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.scale.set(1.3, 1.3, 1); glow.position.y = 2.05; root.add(glow);
  }
  root.traverse((o) => { if (o.isMesh && o.material !== ring.material && o.material !== beam.material) o.castShadow = true; });
  return { root, inner, legs, body, headPivot, aim, arms, holder, gun, muzzle: gun.muzzle, light, lamp, marker, ring, beam, glow };
}

// ---- ゾンビ（かわいい・みどり・ブロック） ----
const ZLOOK = {
  fish: { skin: 0x709b83, shirt: 0x365f59, pants: 0x263e3d, emissive: 0x0b211b },
  walker: { skin: 0x6abf4b, shirt: 0x2a9d8f, pants: 0x3d4f8f },
  runner: { skin: 0x7ccf55, shirt: 0xe07a2f, pants: 0x5a4a3a },
  brute: { skin: 0x5aa83f, shirt: 0x7b4fb0, pants: 0x3a3a46 },
  boss: { skin: 0x4e9a3a, shirt: 0x2f3e6b, pants: 0x2b2b33 },
  // v0.6.0（ぜんぶ かくうの ふく・マークなし）
  guard: { skin: 0x6fbf55, shirt: 0x3a4a6a, pants: 0x262a36 },
  crawler: { skin: 0x8acb5a, shirt: 0x8a7a6a, pants: 0x4a4038 },
  soldier: { skin: 0x62b048, shirt: 0x5a6a3a, pants: 0x4a5230 },
  spitter: { skin: 0x9ad84a, shirt: 0x6a5a8a, pants: 0x3a3a4a },
  burning: { skin: 0x4a6a30, shirt: 0x3a2a22, pants: 0x2a2220, emissive: 0x3a1400 },
  riot: { skin: 0x64b04c, shirt: 0x2a2e38, pants: 0x22252e },
  bloater: { skin: 0x8ab84a, shirt: 0x8a8a5a, pants: 0x4a4a3a },
  screamer: { skin: 0x9ac85e, shirt: 0xa04a6a, pants: 0x3a2a3a },
  firefighter: { skin: 0x62b04a, shirt: 0xa8862a, pants: 0x6a5a2a },
  electric: { skin: 0x5aa8a0, shirt: 0x2a3a5a, pants: 0x23283a, emissive: 0x0a2a3a },
  mutant: { skin: 0x7aa83a, shirt: 0x5a3a3a, pants: 0x3a2a2a },
  charger: { skin: 0x5a9e3c, shirt: 0x6a4a3a, pants: 0x33302e },
};
// つけもの（ぼうし・たて など）の いろ
const ZX = {};
const zx = (k, c, e) => ZX[k] || (ZX[k] = L(c, e ? { emissive: e } : undefined));
// ブロックに くだける ときの いろ（[いろ, ぶい] ぶい: 0=あし 1=からだ 2=あたま 3=うで）
export function zombieChunkColors(kind) {
  const c = ZLOOK[kind] || ZLOOK.walker;
  const extra = kind === 'boss' ? 0xf1c40f : kind === 'brute' || kind === 'soldier' || kind === 'riot' ? 0x6d737c : kind === 'firefighter' ? 0xd8b030 : 0x3f6b2c;
  return [[c.pants, 0], [c.pants, 0], [c.shirt, 1], [c.shirt, 1], [c.shirt, 1], [c.skin, 2], [c.skin, 2], [extra, 2], [c.skin, 3], [c.skin, 3]];
}
const BOSS_GOLD = L(0xf1c40f, { emissive: 0x3a2c00 }), BOSS_SPIKE = L(0x9aa3ad);
const AGENT_ARMOR = L(0x23262e, { emissive: 0x08080c }), AGENT_VISOR = new THREE.MeshBasicMaterial({ color: 0xb46bff });
const zMats = {};
// v0.16.0: ガンキック ステージの みため（おなじ うごきの ゾンビに べつの ふく）。key = 'walker@lab' など
export const GK_LOOKS = {
  lab: { shirt: 0xe6eaee, pants: 0x8a96a2 },                  // しろい はくい（けんきゅうじょ）
  agent: { skin: 0x58606e, shirt: 0x1c1f26, pants: 0x14161a, emissive: 0x140a24 }, // くろよろい エージェント（かくう）
  suit: { shirt: 0x1a1c22, pants: 0x16181c }, // v0.17.0: くろい スーツの わるもの（かくう・ぶきなし）
};
// v0.17.0: あとから よむ みため（ガンキックの ボス など）。parts: [[where('head'|'body'|'inner'), いろ, sx, sy, sz, x, y, z, { glow, r: [rx, ry, rz] }], …]
const LOOK_PARTS = {
  // v0.17.0: スーツ: サングラス・しろい シャツ・ネクタイ
  suit: [['head', 0x0a0a0e, 0.44, 0.1, 0.04, 0, 0.3, -0.26], ['body', 0xe8e8e8, 0.16, 0.5, 0.02, 0, 0.45, -0.155], ['body', 0x7a1c2a, 0.06, 0.42, 0.02, 0, 0.42, -0.17]],
}, lookMats = {};
export function registerLook(id, look) { if (look.colors) GK_LOOKS[id] = look.colors; if (look.parts) LOOK_PARTS[id] = look.parts; }
export const hasLook = (id) => !!GK_LOOKS[id];
const lookMat = (c, o) => { const k = c + (o && o.glow ? 'g' : ''); return lookMats[k] || (lookMats[k] = o && o.glow ? new THREE.MeshBasicMaterial({ color: c }) : L(c)); };
export function splitLook(key) { const i = key.indexOf('@'); return i < 0 ? [key, null] : [key.slice(0, i), key.slice(i + 1)]; }
function zombieMats(kind, look = null) {
  const key = look ? kind + '@' + look : kind;
  if (zMats[key]) return zMats[key];
  const c = look && GK_LOOKS[look] ? { ...ZLOOK[kind], ...GK_LOOKS[look] } : ZLOOK[kind];
  const em = c.emissive ?? 0x0c2208;
  const skin = new THREE.MeshLambertMaterial({ map: solidTexture(c.skin, 0.16, 9), emissive: em }); // くらくても みえる
  const face = new THREE.MeshLambertMaterial({ map: zombieFaceTexture(c.skin, kind), emissive: em });
  const shirt = new THREE.MeshLambertMaterial({ map: shirtTexture(c.shirt, kind.length) });
  const pants = new THREE.MeshLambertMaterial({ map: solidTexture(c.pants, 0.18, 12) });
  const hair = L(0x3f6b2c), helm = L(0x6d737c);
  skin.userData.lod = c.skin; face.userData.lod = c.skin; shirt.userData.lod = c.shirt; pants.userData.lod = c.pants; // v0.12.0: とおくの かんたんモデルの いろ
  return (zMats[key] = { skin, face, shirt, pants, hair, helm });
}
export const FLASH_MAT = new THREE.MeshBasicMaterial({ color: 0xe6ffd0 });
export const EYE_MAT = new THREE.MeshBasicMaterial({ color: 0xc8ff5a, fog: false });

export function makeZombie(kind, look = null) {
  if (!look && kind.includes('@')) [kind, look] = splitLook(kind);
  const m = zombieMats(kind, look);
  const root = new THREE.Group();
  const inner = new THREE.Group(); root.add(inner); // しぬときに たおれる ため
  const legs = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(s * 0.13, 0.72, 0); inner.add(pivot);
    part(pivot, m.pants, 0.25, 0.72, 0.26, 0, -0.36, 0);
    legs.push(pivot);
  }
  const body = new THREE.Group(); body.position.y = 0.72; inner.add(body);
  part(body, m.shirt, kind === 'runner' ? 0.48 : 0.52, 0.74, 0.3, 0, 0.37, 0);
  const head = new THREE.Group(); head.position.y = 0.74; body.add(head);
  { const hm = new THREE.Mesh(headGeo(0.5, 0.5, 0.5), [m.skin, m.hair, m.face]); hm.position.set(0, 0.25, 0); head.add(hm); } // v0.12.0: 3グループ
  if (kind === 'brute') part(head, m.helm, 0.56, 0.14, 0.56, 0, 0.52, 0);
  const extra = {};
  dressZombie(kind, { inner, body, head, legs }, extra);
  if (kind === 'boss' && look === 'agent') {
    // v0.16.0: くろよろい エージェント（くろい ヘルメット・むらさきの バイザー・かたの いた。かくうの デザイン）
    part(head, AGENT_ARMOR, 0.56, 0.2, 0.56, 0, 0.5, 0);
    part(head, AGENT_VISOR, 0.46, 0.09, 0.04, 0, 0.3, -0.27);
    for (const s of [-1, 1]) part(body, AGENT_ARMOR, 0.3, 0.12, 0.36, s * 0.34, 0.76, 0);
    part(body, AGENT_VISOR, 0.5, 0.05, 0.31, 0, 0.06, 0);
    part(body, AGENT_ARMOR, 0.4, 0.3, 0.06, 0, 0.42, -0.17);
  } else if (look && LOOK_PARTS[look]) {
    for (const [w, c, sx, sy, sz, x, y, z, o] of LOOK_PARTS[look]) part(w === 'head' ? head : w === 'body' ? body : inner, lookMat(c, o), sx, sy, sz, x, y, z, ...((o && o.r) || []));
  } else if (kind === 'boss') {
    // おうかん・かたの トゲ・ベルト（ボスだと すぐ わかる）
    part(head, BOSS_GOLD, 0.54, 0.1, 0.54, 0, 0.55, 0);
    for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2], [0, -0.22]]) part(head, BOSS_GOLD, 0.1, 0.14, 0.1, x, 0.67, z);
    for (const s of [-1, 1]) {
      part(body, BOSS_SPIKE, 0.26, 0.12, 0.3, s * 0.34, 0.76, 0);
      part(body, BOSS_SPIKE, 0.07, 0.14, 0.07, s * 0.34, 0.88, 0);
    }
    part(body, BOSS_GOLD, 0.54, 0.08, 0.32, 0, 0.06, 0);
  }
  const arms = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(s * 0.38, 0.64, 0); body.add(pivot);
    part(pivot, m.shirt, 0.23, 0.23, 0.22, 0, 0, -0.06);
    if (kind === 'charger' && s > 0) { // とっしん: みぎうでが でっかい
      part(pivot, m.skin, 0.36, 0.36, 0.62, 0, -0.02, -0.42);
      part(pivot, m.skin, 0.42, 0.4, 0.22, 0, -0.02, -0.78);
    } else part(pivot, m.skin, 0.2, 0.2, 0.5, 0, 0, -0.38);
    if (kind === 'firefighter') part(pivot, zx('ffGlove', 0x3a3a34), 0.22, 0.22, 0.14, 0, 0, -0.66);
    if (kind === 'riot' && s < 0) { // ひだりうでに たて（とうめいの いた・マークなし）
      const sh = new THREE.Group(); sh.position.set(0.1, 0, -0.62); pivot.add(sh); extra.shield = sh;
      part(sh, zx('riotShield', 0x8a9aaa, 0x101820), 0.72, 1.05, 0.06, 0.18, -0.12, 0);
      part(sh, zx('riotRim', 0x3a3e46), 0.76, 0.06, 0.08, 0.18, 0.42, 0);
      part(sh, zx('riotRim', 0x3a3e46), 0.76, 0.06, 0.08, 0.18, -0.66, 0);
    }
    arms.push(pivot);
  }
  if (kind === 'crawler') { // はいはい: からだを まえに たおす・あしは うしろ
    body.position.set(0, 0.36, 0.1); body.rotation.x = -1.25;
    for (const l of legs) { l.position.y = 0.32; l.position.z = 0.35; l.rotation.x = 1.35; l.userData.base = 1.35; }
    for (const a of arms) a.userData.base = 0.9;
  }
  if (kind === 'fish') {
    // A ragged fish head, dorsal fin and tail remain above the flood water.
    const fin = zx('fishFin', 0x315d54), flesh = zx('fishFlesh', 0x6d9581);
    part(head, flesh, 0.62, 0.46, 0.7, 0, 0.22, -0.16);
    part(head, fin, 0.12, 0.35, 0.55, 0, 0.58, 0.05);
    part(body, fin, 0.13, 0.48, 0.55, 0, 0.6, 0.3);
    part(body, fin, 0.65, 0.35, 0.12, 0, 0.28, 0.55);
  }
  const meshes = [];
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.userData.mat = o.material; meshes.push(o); } });
  // よるに ひかる め（ヒットの いろかえ・かげの たいしょうがい）
  const eyes = new THREE.Group(); eyes.visible = false; head.add(eyes);
  // v0.12.0: ふたつの め を 1つの かたちに（1かいで かく）
  eyeGeo = eyeGeo || mergeGeos([
    { geo: boxGeo(0.13, 0.13, 0.02), matrix: new THREE.Matrix4().makeTranslation(0.094, 0.25, -0.255) },
    { geo: boxGeo(0.1, 0.1, 0.02), matrix: new THREE.Matrix4().makeTranslation(-0.11, 0.266, -0.255) }]);
  eyes.add(new THREE.Mesh(eyeGeo, EYE_MAT));
  return { root, inner, legs, body, head, arms, meshes, eyes, kind, ...extra };
}

// v0.12.0: とおくの ゾンビ用の かんたんモデル（ぜんぶの はこを 1つに・いろは ちょうてんカラー）
// → InstancedMesh で しゅるいごとに 1かい だけ かく。め は べつ（よるに ひかる）
const lodCache = {};
export function zombieLod(kind) { // kind は 'walker@lab' でも よい（v0.16.0）
  if (lodCache[kind]) return lodCache[kind];
  const z = makeZombie(kind);
  z.root.updateMatrixWorld(true);
  const items = []; let eyeM = null;
  const colOf = (mt) => (mt.userData && mt.userData.lod != null ? mt.userData.lod : mt.color ? mt.color.getHex() : 0x888888);
  z.root.traverse((o) => {
    if (!o.isMesh) return;
    for (let q = o; q; q = q.parent) if (!q.visible && q !== z.eyes) return;
    if (o.parent === z.eyes) { eyeM = o.matrixWorld.clone(); return; }
    if (Array.isArray(o.material)) {
      const g = o.geometry.toNonIndexed(), cols = new Array(g.attributes.position.count).fill(0x888888);
      for (const gr of g.groups) for (let i = gr.start; i < gr.start + gr.count; i++) cols[i] = colOf(o.material[gr.materialIndex]);
      // かお の めんは すこし くらく（め・くち の かわり）
      items.push({ geo: g, matrix: o.matrixWorld.clone(), color: (i) => cols[i] });
    } else items.push({ geo: o.geometry, matrix: o.matrixWorld.clone(), color: colOf(o.material) });
  });
  return (lodCache[kind] = { geo: mergeGeos(items, true), eyeM: eyeM || new THREE.Matrix4(), parts: items.length });
}
export function zombieEyeGeo() { if (!eyeGeo) makeZombie('walker'); return eyeGeo; }

// v0.6.0: しゅるいごとの つけもの（かくうの デザイン・マーク／もじ なし）
function dressZombie(kind, { inner, body, head }, extra) {
  if (kind === 'guard') { // けいびいんの ぼうし＋ベルト
    part(head, zx('cap', 0x22283a), 0.54, 0.12, 0.54, 0, 0.53, 0);
    part(head, zx('cap', 0x22283a), 0.54, 0.04, 0.2, 0, 0.48, -0.34);
    part(body, zx('belt', 0x1a1a1a), 0.54, 0.07, 0.32, 0, 0.05, 0);
    part(body, zx('radio', 0x2a2a2a), 0.1, 0.14, 0.06, 0.16, 0.6, -0.17);
  } else if (kind === 'soldier') { // ヘルメット＋ベスト（むじ）
    part(head, zx('helmG', 0x4a5530), 0.58, 0.16, 0.58, 0, 0.54, 0);
    part(head, zx('helmG', 0x4a5530), 0.6, 0.05, 0.62, 0, 0.46, 0);
    part(body, zx('vest', 0x3a4228), 0.56, 0.46, 0.36, 0, 0.42, 0);
    for (const x of [-0.14, 0.14]) part(body, zx('pouch', 0x2e3420), 0.14, 0.12, 0.06, x, 0.28, -0.2);
  } else if (kind === 'riot') { // ヘルメット＋かお まもり
    part(head, zx('helmR', 0x23262e), 0.58, 0.2, 0.58, 0, 0.52, 0);
    part(head, zx('visor', 0x6a8aa0, 0x0a1a28), 0.52, 0.2, 0.03, 0, 0.32, -0.27);
    part(body, zx('pad', 0x2a2e38), 0.58, 0.3, 0.36, 0, 0.55, 0);
  } else if (kind === 'firefighter') { // しょうぼうの ヘルメット＋はんしゃテープ（むじ）
    part(head, zx('ffHelm', 0x2a2a28), 0.58, 0.14, 0.58, 0, 0.53, 0);
    part(head, zx('ffHelm', 0x2a2a28), 0.66, 0.04, 0.7, 0, 0.46, 0.04);
    part(body, zx('tape', 0xd8e0c0, 0x2a2a1a), 0.54, 0.06, 0.32, 0, 0.18, 0);
    part(body, zx('tape', 0xd8e0c0, 0x2a2a1a), 0.54, 0.06, 0.32, 0, 0.5, 0);
    part(body, zx('tank', 0x8a8a80), 0.28, 0.5, 0.16, 0, 0.42, 0.24);
  } else if (kind === 'bloater') { // おなかが ぷっくり
    part(body, zx('belly', 0x9aca5a, 0x14280a), 0.7, 0.6, 0.56, 0, 0.32, -0.06);
    for (const [x, y, z] of [[-0.24, 0.5, -0.32], [0.2, 0.2, -0.34], [0.3, 0.55, 0.1]]) part(body, zx('blister', 0xc8e06a, 0x283a0a), 0.14, 0.14, 0.14, x, y, z);
  } else if (kind === 'mutant') { // こぶ（にく いろでは なく みどりの かたまり）
    for (const [x, y, z, s] of [[0.28, 0.72, 0.05, 0.26], [-0.22, 0.55, 0.14, 0.2], [0.1, 0.3, 0.18, 0.18]]) part(body, zx('lump', 0x5a8a2a), s, s, s, x, y, z);
    part(head, zx('lump', 0x5a8a2a), 0.22, 0.22, 0.22, 0.18, 0.5, 0.1);
  } else if (kind === 'spitter') { // ふくらんだ のど
    part(head, zx('throat', 0xb8e85a, 0x2a3a0a), 0.34, 0.16, 0.2, 0, -0.04, -0.22);
  } else if (kind === 'screamer') { // ながい かみ
    part(head, zx('hairS', 0x2a2a22), 0.54, 0.4, 0.14, 0, 0.18, 0.24);
    part(head, zx('hairS', 0x2a2a22), 0.56, 0.1, 0.56, 0, 0.52, 0);
  } else if (kind === 'burning') { // ひの こ（ひかる ブロック）
    const fl = new THREE.Group(); body.add(fl); extra.flames = fl;
    const mat = new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.85 });
    const mat2 = new THREE.MeshBasicMaterial({ color: 0xffc23a, transparent: true, opacity: 0.85 });
    for (const [x, y, z, s, m] of [[0.2, 0.8, 0, 0.16, mat], [-0.18, 0.9, 0.06, 0.13, mat2], [0, 1.4, 0.1, 0.18, mat], [0.26, 0.3, -0.1, 0.12, mat2], [-0.24, 0.4, 0.12, 0.14, mat]]) part(fl, m, s, s, s, x, y, z);
    for (const o of fl.children) o.castShadow = false, o.userData.noFlash = true;
  } else if (kind === 'electric') { // あたまの アンテナ＋あおい いなずま
    const ar = new THREE.Group(); body.add(ar); extra.arcs = ar;
    const mat = new THREE.MeshBasicMaterial({ color: 0x8ae8ff, transparent: true, opacity: 0.9 });
    for (const [x, y, z, w, h, rz] of [[0.3, 0.6, -0.17, 0.04, 0.3, 0.6], [-0.28, 0.3, -0.17, 0.04, 0.26, -0.5], [0.1, 0.2, -0.17, 0.04, 0.22, 1.0]]) part(ar, mat, w, h, 0.02, x, y, z, 0, 0, rz);
    for (const o of ar.children) o.castShadow = false, o.userData.noFlash = true;
    part(head, zx('coil', 0x6a7a8a), 0.06, 0.24, 0.06, 0.12, 0.6, 0);
  }
}

// ロケットだんの はこ（ひかる・ブロック）
export function makeRocketCrate(glowTex) {
  const g = new THREE.Group();
  const spin = new THREE.Group(); g.add(spin);
  const crate = L(0x6b7a3a, { emissive: 0x1c2408 }), stripe = L(0xffc21a, { emissive: 0x5a3c00 });
  part(spin, crate, 0.62, 0.34, 0.42, 0, 0.17, 0);
  part(spin, stripe, 0.64, 0.07, 0.44, 0, 0.2, 0);
  part(spin, GM.oliveD, 0.66, 0.04, 0.1, 0, 0.36, 0);
  // うえに ロケットの たま
  const r = new THREE.Group(); r.position.set(0, 0.46, 0); r.rotation.y = Math.PI / 2; spin.add(r);
  part(r, GM.warhead, 0.12, 0.12, 0.42, 0, 0, 0);
  part(r, new THREE.MeshBasicMaterial({ color: 0xff8a1f }), 0.08, 0.08, 0.1, 0, 0, -0.25);
  for (const rr of [0, Math.PI / 2]) part(r, GM.oliveD, 0.26, 0.02, 0.08, 0, 0, 0.18, 0, 0, rr);
  // ひかり（あしもとの わ＋ぼんやり）
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffb040, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.scale.set(1.9, 1.9, 1); glow.position.y = 0.35; g.add(glow);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.62, 20).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xffd060, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
  ring.position.y = 0.03; g.add(ring);
  return { group: g, spin, glow, ring };
}

// ---- v0.10.0: パワードスーツ（かくうの デザイン・マーク／はた なし）----
// みぎうで: マシンキャノン・ひだりうで: おおきな こぶし ＋ かえんほうしゃ・みぎかた: キャノン・ひだりかた: ミサイル（v0.11.0）
export function makePowerSuit(glowTex) {
  const root = new THREE.Group(), inner = new THREE.Group(); root.add(inner);
  const orange = L(0xf08a24), gray = L(0x5d6672), dark = L(0x2b3038), yellow = L(0xf2c94c, { emissive: 0x2a1c00 });
  const glass = new THREE.MeshLambertMaterial({ color: 0x7fd8ff, emissive: 0x1d5a78, transparent: true, opacity: 0.85 });
  const eye = new THREE.MeshBasicMaterial({ color: 0x7af0ff });
  const hot = new THREE.MeshBasicMaterial({ color: 0xffb040 });
  const legs = [];
  for (const s of [-1, 1]) {
    const pv = new THREE.Group(); pv.position.set(s * 0.4, 1.25, 0); inner.add(pv);
    part(pv, gray, 0.36, 0.6, 0.42, 0, -0.3, 0);               // ふともも
    part(pv, orange, 0.46, 0.62, 0.52, 0, -0.86, 0.02);        // すね
    part(pv, yellow, 0.48, 0.08, 0.54, 0, -0.62, 0.02);        // ひざの ライン
    part(pv, dark, 0.54, 0.18, 0.84, 0, -1.16, -0.1);          // あし
    legs.push(pv);
  }
  const body = new THREE.Group(); body.position.y = 1.28; inner.add(body);
  part(body, dark, 0.92, 0.34, 0.66, 0, 0.06, 0);              // こし
  part(body, orange, 1.34, 0.92, 0.92, 0, 0.62, 0);            // むね
  part(body, yellow, 1.36, 0.08, 0.94, 0, 0.26, 0);
  part(body, gray, 0.7, 0.5, 0.06, 0, 0.66, -0.47);            // コックピットの わく
  const cockpit = part(body, glass, 0.58, 0.38, 0.04, 0, 0.68, -0.5);
  part(body, dark, 1.0, 0.76, 0.42, 0, 0.66, 0.62);            // せなかの エンジン
  for (const s of [-1, 1]) part(body, hot, 0.16, 0.1, 0.06, s * 0.28, 0.42, 0.85); // ふんしゃこう
  const head = new THREE.Group(); head.position.y = 1.16; body.add(head);
  part(head, gray, 0.46, 0.28, 0.46, 0, 0.08, 0);
  part(head, eye, 0.34, 0.07, 0.04, 0, 0.1, -0.24);
  part(head, dark, 0.05, 0.3, 0.05, 0.18, 0.32, 0.1);         // アンテナ
  // みぎかた: キャノン
  const cannon = new THREE.Group(); cannon.position.set(0.56, 1.14, 0.05); body.add(cannon);
  part(cannon, dark, 0.34, 0.3, 0.5, 0, 0, 0.1);
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 1.15, 10).rotateX(Math.PI / 2), gray);
  tube.position.set(0, 0.02, -0.55); cannon.add(tube);
  part(cannon, yellow, 0.34, 0.06, 0.06, 0, 0.02, -1.06);
  const cannonMuzzle = new THREE.Object3D(); cannonMuzzle.position.set(0, 0.02, -1.2); cannon.add(cannonMuzzle);
  // v0.11.0: ひだりかた: ミサイルの はこ（6つの あな）
  const pod = new THREE.Group(); pod.position.set(-0.6, 1.12, 0.1); body.add(pod);
  part(pod, gray, 0.5, 0.38, 0.62, 0, 0, 0);
  part(pod, orange, 0.52, 0.06, 0.64, 0, 0.2, 0);
  for (let i = 0; i < 6; i++) part(pod, hot, 0.09, 0.09, 0.03, -0.14 + (i % 3) * 0.14, i < 3 ? 0.08 : -0.08, -0.315);
  const podMuzzle = new THREE.Object3D(); podMuzzle.position.set(0, 0.05, -0.4); pod.add(podMuzzle);
  const arms = [];
  let gatling = null, gunMuzzle = null, fist = null, flameMuzzle = null, pilot = null;
  for (const s of [-1, 1]) {
    const pv = new THREE.Group(); pv.position.set(s * 0.86, 0.86, 0); body.add(pv);
    part(pv, orange, 0.46, 0.46, 0.5, 0, 0.08, 0);             // かた
    part(pv, gray, 0.32, 0.32, 0.6, 0, -0.06, -0.3);           // うえうで（まえ むき）
    const fore = new THREE.Group(); fore.position.set(0, -0.06, -0.62); pv.add(fore);
    part(fore, orange, 0.42, 0.42, 0.62, 0, 0, -0.26);
    if (s > 0) { // マシンキャノン
      gatling = new THREE.Group(); gatling.position.set(0, 0, -0.62); fore.add(gatling);
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2;
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.72, 6).rotateX(Math.PI / 2), dark);
        b.position.set(Math.cos(a) * 0.12, Math.sin(a) * 0.12, -0.3); gatling.add(b);
      }
      part(gatling, gray, 0.36, 0.36, 0.08, 0, 0, -0.04);
      part(gatling, gray, 0.34, 0.34, 0.06, 0, 0, -0.6);
      gunMuzzle = new THREE.Object3D(); gunMuzzle.position.set(0, 0, -0.75); gatling.add(gunMuzzle);
    } else { // こぶし ＋ かえんほうしゃ
      fist = new THREE.Group(); fist.position.set(0, 0, -0.66); fore.add(fist);
      part(fist, gray, 0.56, 0.52, 0.5, 0, 0, -0.18);
      part(fist, dark, 0.58, 0.14, 0.12, 0, 0.12, -0.44);       // ゆびの ふし
      part(fist, dark, 0.58, 0.14, 0.12, 0, -0.08, -0.44);
      const noz = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.5, 8).rotateX(Math.PI / 2), dark);
      noz.position.set(0, -0.32, -0.1); fore.add(noz);
      pilot = part(fore, hot, 0.06, 0.06, 0.06, 0, -0.32, -0.38);
      flameMuzzle = new THREE.Object3D(); flameMuzzle.position.set(0, -0.32, -0.42); fore.add(flameMuzzle);
    }
    arms.push(pv);
  }
  // めじるし（オレンジの わ と はしら）
  const marker = new THREE.Group(); root.add(marker);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.5, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
  ring.position.y = 0.05; marker.add(ring);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.34, 9, 0.34), new THREE.MeshBasicMaterial({ color: 0xffb050, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false }));
  beam.position.y = 4.5; marker.add(beam);
  let glow = null;
  if (glowTex) {
    glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffa040, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.scale.set(2.4, 2.4, 1); glow.position.y = 3.4; root.add(glow);
  }
  root.traverse((o) => { if (o.isMesh && o.material !== ring.material && o.material !== beam.material && o.material !== glass) o.castShadow = true; });
  return { root, inner, legs, body, head, arms, cannon, cannonMuzzle, pod, podMuzzle, gatling, gunMuzzle, fist, flameMuzzle, pilot, cockpit, marker, ring, beam, glow };
}
// キャノンの たま
export function makeSuitShell() {
  const g = new THREE.Group();
  part(g, L(0x2b3038), 0.26, 0.26, 0.46, 0, 0, 0);
  part(g, L(0xf2c94c, { emissive: 0x3a2a00 }), 0.28, 0.06, 0.28, 0, 0, 0.06);
  const flame = part(g, new THREE.MeshBasicMaterial({ color: 0xffc04a }), 0.16, 0.16, 0.2, 0, 0, 0.3);
  return { group: g, flame };
}
export const SUIT_CHUNKS = [[0xf08a24, 0], [0x5d6672, 0], [0xf08a24, 1], [0x2b3038, 1], [0xf2c94c, 2], [0x7fd8ff, 2], [0x5d6672, 3], [0xf08a24, 3]];

// ---- v0.13.0: なぐる ぶき（かくうの デザイン・ロゴなし）。にぎる ところが 0、さきは -Z。1つの かたちに まとめて 1ドローコール ----
export function makeMeleeWeapons() {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), S = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3();
  const it = (w, h, d, x, y, z, color, rx = 0, ry = 0, rz = 0) => ({ geo: boxGeo(w, h, d), matrix: new THREE.Matrix4().compose(P.set(x, y, z), Q.setFromEuler(E.set(rx, ry, rz)), S), color });
  const mk = (items) => { const m = new THREE.Mesh(mergeGeos(items, true), mat); m.castShadow = true; const g = new THREE.Group(); g.add(m); return g; };
  // くぎバット: きの バット ＋ グリップの テープ ＋ くぎ（ぎんいろ）
  const WOOD = 0xb5814a, WOOD2 = 0x9a6a3a, TAPE = 0x2c2c30, NAIL = 0xb9c0c6;
  const bat = [
    it(0.06, 0.06, 0.05, 0, 0, 0.12, TAPE), it(0.045, 0.045, 0.32, 0, 0, -0.02, TAPE),
    it(0.06, 0.06, 0.2, 0, 0, -0.27, WOOD2), it(0.075, 0.075, 0.2, 0, 0, -0.46, WOOD), it(0.09, 0.09, 0.24, 0, 0, -0.67, WOOD), it(0.085, 0.085, 0.04, 0, 0, -0.8, WOOD2),
  ];
  for (const [a, z] of [[0, -0.55], [1.3, -0.6], [2.5, -0.66], [3.6, -0.72], [4.8, -0.58], [0.7, -0.75], [2, -0.78], [5.6, -0.7]]) {
    bat.push(it(0.016, 0.016, 0.14, Math.cos(a) * 0.05, Math.sin(a) * 0.05, z, NAIL, 0, 0, 0)); // まんなか
    const m = bat[bat.length - 1]; m.matrix.compose(P.set(Math.cos(a) * 0.06, Math.sin(a) * 0.06, z), Q.setFromEuler(E.set(0, 0, a)).multiply(new THREE.Quaternion().setFromEuler(E.set(0, Math.PI / 2, 0))), S);
  }
  // ハンマー: ながい え ＋ おもい てつの あたま（たたく めんは した）
  const STEEL = 0x6f777e, STEEL2 = 0xa3abb2, GRIP = 0x2f5d8a;
  const hammer = [
    it(0.05, 0.05, 1.0, 0, 0, -0.36, 0x8a6038), it(0.062, 0.062, 0.3, 0, 0, 0.0, GRIP),
    it(0.17, 0.3, 0.17, 0, -0.03, -0.9, STEEL), it(0.19, 0.05, 0.19, 0, -0.19, -0.9, STEEL2), it(0.19, 0.05, 0.19, 0, 0.13, -0.9, STEEL2),
  ];
  // かたな: つか（こい むらさき）＋ つば（きんいろの いた）＋ ぎんの は
  const kat = [
    it(0.05, 0.055, 0.3, 0, 0, 0.0, 0x3a2f58), it(0.055, 0.06, 0.04, 0, 0, 0.16, 0xb89a3a),
    it(0.14, 0.14, 0.02, 0, 0, -0.16, 0xc8a842), it(0.06, 0.065, 0.05, 0, 0, -0.19, 0xc8a842),
    it(0.014, 0.05, 0.78, 0, 0.005, -0.6, 0xc9d1d8), it(0.008, 0.016, 0.78, 0, -0.027, -0.6, 0xf4f8fb),
    it(0.013, 0.045, 0.08, 0, -0.005, -1.02, 0xe6ecf1, 0.5, 0, 0),
  ];
  return { bat: mk(bat), hammer: mk(hammer), katana: mk(kat) };
}

// ---- v0.14.0: アーミーロボ（かくうの デザイン: オリーブいろの めいさい・あかい バイザー・レーザー。マーク・はた・もじは なし）----
export const ARMY_CHUNKS = [[0x5d6b35, 0], [0x3c4524, 0], [0x5d6b35, 1], [0xa89a62, 1], [0x5d6b35, 2], [0xff5a3a, 2], [0x3c4524, 3], [0x2a2f2a, 1]];
// v0.14.0: ちいさい パーツは かげを つくらない（かげの えがく かずを へらす・iPhone SE でも かるく）
function bigShadowsOnly(root, minSize = 0.2, skip = []) {
  const bb = new THREE.Box3(), sz = new THREE.Vector3();
  root.traverse((o) => {
    if (!o.isMesh || skip.includes(o.material)) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    bb.copy(o.geometry.boundingBox).getSize(sz);
    const k = o.scale; o.castShadow = Math.max(sz.x * k.x, sz.y * k.y, sz.z * k.z) >= minSize;
  });
}
export function makeArmyRobot(glowTex) {
  const root = new THREE.Group(), inner = new THREE.Group(); root.add(inner);
  const camo = new THREE.MeshLambertMaterial({ map: camoTexture([0x5d6b35, 0x3c4524, 0xa89a62, 0x6b5434], 4242) });
  const olive = L(0x5d6b35), dolive = L(0x3c4524), tan = L(0xa89a62), dark = L(0x2a2f2a), metal = L(0x6c726c);
  const visor = new THREE.MeshBasicMaterial({ color: 0xff5a3a });
  const lamp = new THREE.MeshBasicMaterial({ color: 0xff4630 });
  const legs = [];
  for (const s of [-1, 1]) {
    const pv = new THREE.Group(); pv.position.set(s * 0.18, 0.64, 0); inner.add(pv);
    part(pv, camo, 0.27, 0.5, 0.29, 0, -0.25, 0);
    part(pv, dolive, 0.3, 0.12, 0.3, 0, -0.2, -0.01);       // ひざの プレート
    part(pv, dark, 0.32, 0.18, 0.4, 0, -0.57, -0.04);       // ごつい ブーツ
    part(pv, tan, 0.33, 0.05, 0.41, 0, -0.47, -0.04);
    legs.push(pv);
  }
  const body = new THREE.Group(); body.position.y = 0.64; inner.add(body);
  part(body, camo, 0.72, 0.66, 0.46, 0, 0.35, 0);
  part(body, dolive, 0.74, 0.12, 0.48, 0, 0.06, 0);           // こしの ベルト
  for (const x of [-0.22, 0, 0.22]) part(body, tan, 0.13, 0.12, 0.06, x, 0.07, -0.25); // ポーチ
  part(body, dolive, 0.5, 0.3, 0.05, 0, 0.4, -0.245);         // むねの いた（マーク なし）
  part(body, tan, 0.4, 0.04, 0.02, 0, 0.47, -0.272);
  part(body, tan, 0.4, 0.04, 0.02, 0, 0.35, -0.272);
  part(body, dark, 0.46, 0.46, 0.2, 0, 0.36, 0.31);           // せなかの パック
  part(body, olive, 0.48, 0.1, 0.22, 0, 0.6, 0.31);
  part(body, dark, 0.03, 0.55, 0.03, 0.17, 0.85, 0.36);       // アンテナ
  part(body, lamp, 0.06, 0.06, 0.06, 0.17, 1.13, 0.36);
  const headPivot = new THREE.Group(); headPivot.position.y = 0.68; body.add(headPivot);
  part(headPivot, olive, 0.46, 0.32, 0.44, 0, 0.18, 0);
  part(headPivot, camo, 0.54, 0.16, 0.52, 0, 0.38, 0.01);     // ヘルメット
  part(headPivot, dolive, 0.58, 0.05, 0.56, 0, 0.3, -0.01);   // ヘルメットの ふち
  part(headPivot, dark, 0.38, 0.12, 0.04, 0, 0.17, -0.225);
  part(headPivot, visor, 0.32, 0.05, 0.02, 0, 0.17, -0.25);   // あかい バイザー（1ほんの め）
  for (const s of [-1, 1]) part(headPivot, dark, 0.05, 0.16, 0.18, s * 0.25, 0.16, 0); // みみ
  const light = part(headPivot, lamp, 0.05, 0.05, 0.05, -0.2, 0.5, 0.12);
  const aim = new THREE.Group(); aim.position.set(0, 0.52, 0); body.add(aim);
  const arms = [];
  for (const s of [-1, 1]) {
    const pv = new THREE.Group(); pv.position.set(s * 0.44, 0, 0); aim.add(pv);
    part(pv, dolive, 0.28, 0.2, 0.3, 0, 0.06, 0);             // かたの プレート
    part(pv, camo, 0.19, 0.19, s > 0 ? 0.42 : 0.5, 0, -0.04, s > 0 ? -0.18 : -0.22);
    part(pv, dark, 0.21, 0.21, 0.12, 0, -0.04, s > 0 ? -0.42 : -0.5);
    arms.push(pv);
  }
  // レーザー ほう（みぎうで）
  const holder = new THREE.Group(); holder.position.set(0.22, -0.04, -0.5); aim.add(holder);
  const gun = new THREE.Group(); holder.add(gun);
  part(gun, dark, 0.17, 0.17, 0.52, 0, 0, -0.06);
  part(gun, metal, 0.11, 0.11, 0.3, 0, 0, -0.44);
  for (const z of [-0.02, -0.14, -0.26]) part(gun, tan, 0.21, 0.21, 0.04, 0, 0, z); // ひやす フィン
  part(gun, olive, 0.08, 0.1, 0.22, 0, 0.12, 0.02);
  const emit = part(gun, lamp, 0.09, 0.09, 0.03, 0, 0, -0.6);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0, -0.62); gun.add(muzzle);
  // まだ なかまに なっていない ときの めじるし（オレンジの わ と はしら）
  const marker = new THREE.Group(); root.add(marker);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.82, 28).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }));
  ring.position.y = 0.04; marker.add(ring);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.22, 5, 0.22), new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false }));
  beam.position.y = 2.5; marker.add(beam);
  let glow = null;
  if (glowTex) {
    glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffa040, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.scale.set(1.3, 1.3, 1); glow.position.y = 2.1; root.add(glow);
  }
  bigShadowsOnly(root, 0.3, [ring.material, beam.material]);
  return { root, inner, legs, body, headPivot, aim, arms, holder, gun: { group: gun, muzzle }, muzzle, emit, light, lamp, marker, ring, beam, glow };
}

// ---- v0.14.0: よっぱらいおじさん（かくう: ゆるんだ ネクタイを あたまに まいた サラリーマンふう・まっかな かお。おさけの びん なし）----
export const DRUNK_CHUNKS = [[0x5f6670, 0], [0xf2f2ea, 1], [0xf2a08c, 2], [0xd04848, 1]];
export function makePlainBat() {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), S = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3();
  const it = (w, h, d, x, y, z, color) => ({ geo: boxGeo(w, h, d), matrix: new THREE.Matrix4().compose(P.set(x, y, z), Q.setFromEuler(E.set(0, 0, 0)), S), color });
  const WOOD = 0xc8955a, WOOD2 = 0xab7a44, TAPE = 0x3a6ab0; // くぎ なしの きの バット
  const items = [it(0.06, 0.06, 0.05, 0, 0, 0.12, WOOD2), it(0.045, 0.045, 0.32, 0, 0, -0.02, TAPE),
    it(0.06, 0.06, 0.2, 0, 0, -0.27, WOOD2), it(0.075, 0.075, 0.2, 0, 0, -0.46, WOOD), it(0.09, 0.09, 0.24, 0, 0, -0.67, WOOD), it(0.085, 0.085, 0.04, 0, 0, -0.8, WOOD2)];
  const m = new THREE.Mesh(mergeGeos(items, true), mat); m.castShadow = true; void M;
  const g = new THREE.Group(); g.add(m); return g;
}
export function makeDrunkUncle() {
  const T = drunkTextures();
  const root = new THREE.Group(), inner = new THREE.Group(); root.add(inner);
  const skin = L(T.skin);
  const suit = new THREE.MeshLambertMaterial({ map: solidTexture(0x5f6670, 0.12, 61) });
  const shirt = new THREE.MeshLambertMaterial({ map: solidTexture(0xf2f2ea, 0.06, 62) });
  const pants = new THREE.MeshLambertMaterial({ map: solidTexture(0x4a5058, 0.12, 63) });
  const tie = L(0xd04848), shoe = L(0x3a2a22), belt = L(0x2a2a2a);
  const head = [new THREE.MeshLambertMaterial({ map: T.side }), new THREE.MeshLambertMaterial({ map: T.side }),
    new THREE.MeshLambertMaterial({ map: T.top }), skin, new THREE.MeshLambertMaterial({ map: T.back }), new THREE.MeshLambertMaterial({ map: T.face })];
  const legs = [];
  for (const s of [-1, 1]) {
    const pv = new THREE.Group(); pv.position.set(s * 0.13, 0.66, 0); inner.add(pv);
    part(pv, pants, 0.24, 0.54, 0.26, 0, -0.27, 0);
    part(pv, shoe, 0.25, 0.12, 0.32, 0, -0.6, -0.03);
    legs.push(pv);
  }
  const body = new THREE.Group(); body.position.y = 0.66; inner.add(body);
  part(body, shirt, 0.56, 0.62, 0.36, 0, 0.31, 0);              // ワイシャツ（うわぎは ぬいで こしに まいた）
  part(body, belt, 0.57, 0.07, 0.37, 0, 0.04, 0);
  part(body, suit, 0.6, 0.12, 0.4, 0, 0.1, 0.02, 0, 0, 0.08);   // こしに まいた うわぎ
  part(body, suit, 0.22, 0.34, 0.06, -0.1, -0.08, 0.2, 0.15, 0, 0.1);
  part(body, shirt, 0.1, 0.06, 0.02, 0, 0.6, -0.19);
  const headPivot = new THREE.Group(); headPivot.position.y = 0.64; body.add(headPivot);
  part(headPivot, head, 0.44, 0.44, 0.44, 0, 0.22, 0);
  part(headPivot, tie, 0.47, 0.07, 0.47, 0, 0.36, 0);           // あたまに まいた あかい ネクタイ
  part(headPivot, tie, 0.06, 0.22, 0.04, 0.12, 0.28, 0.26, 0.4, 0, 0.5); // むすびめの はし（うしろで ぴょこん）
  part(headPivot, tie, 0.06, 0.2, 0.04, -0.06, 0.28, 0.27, 0.5, 0, -0.4);
  const aim = new THREE.Group(); aim.position.set(0, 0.52, 0); body.add(aim);
  const arms = [];
  for (const s of [-1, 1]) {
    const pv = new THREE.Group(); pv.position.set(s * 0.36, 0.04, 0); aim.add(pv);
    part(pv, shirt, 0.18, 0.18, 0.2, 0, 0, 0);
    part(pv, shirt, 0.15, 0.15, 0.42, 0, -0.03, -0.2);
    part(pv, skin, 0.13, 0.13, 0.1, 0, -0.03, -0.45);
    pv.rotation.y = -s * 0.25;
    arms.push(pv);
  }
  const holder = new THREE.Group(); holder.position.set(0.08, -0.03, -0.5); aim.add(holder);
  const bat = makePlainBat(); bat.rotation.x = 0.35; holder.add(bat);
  const muzzle = new THREE.Object3D(); holder.add(muzzle);
  bigShadowsOnly(root, 0.3);
  return { root, inner, legs, body, headPivot, aim, arms, holder, bat, muzzle };
}
