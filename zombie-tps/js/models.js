// ブロックの キャラクターと ぶき（かくうの デザイン・ロゴなし）
import * as THREE from '../vendor/three.module.min.js';
import { zombieFaceTexture, playerFaceTexture, solidTexture, shirtTexture } from './textures.js?v=1';

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

// ---- ぶき ----
const GM = {
  metal: L(0x3a3f47), poly: L(0x1d2024), tan: L(0xb29566), orange: L(0xff8a1f), steel: L(0x6d737c),
  wood: L(0x8a5a32), lens: new THREE.MeshBasicMaterial({ color: 0x9fe8ff }), dot: new THREE.MeshBasicMaterial({ color: 0xff3b2f }),
  rubber: L(0x121315), red: L(0xc0392b),
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

export function makeWeapons() {
  const rifle = makeRifle(); rifle.group.scale.setScalar(1.15);
  return { rifle, pistol: makePistol(), shotgun: makeShotgun() };
}
export function makeMagMesh() {
  const g = new THREE.Group();
  part(g, GM.poly, 0.05, 0.12, 0.075, 0, -0.06, 0, 0.12);
  part(g, GM.poly, 0.05, 0.1, 0.075, 0, -0.16, -0.025, 0.38);
  part(g, GM.orange, 0.054, 0.018, 0.08, 0, -0.215, -0.05, 0.38);
  return g;
}

// ---- プレイヤー（かくうの へいたい・ブロック） ----
export function makePlayer() {
  const root = new THREE.Group();
  const uniform = new THREE.MeshLambertMaterial({ map: solidTexture(0x6b7a4a, 0.18, 3) });
  const vest = new THREE.MeshLambertMaterial({ map: solidTexture(0x3e4632, 0.2, 4) });
  const pants = new THREE.MeshLambertMaterial({ map: solidTexture(0x55603d, 0.18, 5) });
  const boots = L(0x2a2420), skin = L(0xd9a982), helmet = new THREE.MeshLambertMaterial({ map: solidTexture(0x4f5b3a, 0.2, 6) });
  const glove = L(0x2b2b2b), orange = GM.orange;
  const face = new THREE.MeshLambertMaterial({ map: playerFaceTexture() });

  const legs = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(s * 0.13, 0.74, 0); root.add(pivot);
    part(pivot, pants, 0.25, 0.6, 0.27, 0, -0.3, 0);
    part(pivot, boots, 0.26, 0.15, 0.3, 0, -0.66, -0.02);
    legs.push(pivot);
  }
  const torso = new THREE.Group(); torso.position.y = 0.74; root.add(torso);
  part(torso, uniform, 0.52, 0.7, 0.28, 0, 0.35, 0);
  part(torso, vest, 0.56, 0.46, 0.33, 0, 0.42, 0);
  for (const s of [-1, 1]) part(torso, vest, 0.1, 0.12, 0.06, s * 0.15, 0.32, -0.19); // ポーチ
  part(torso, orange, 0.12, 0.04, 0.02, -0.16, 0.6, -0.17);  // かたの マーク（かくう）
  part(torso, vest, 0.4, 0.42, 0.18, 0, 0.42, 0.24);         // リュック
  part(torso, uniform, 0.3, 0.12, 0.16, 0, 0.66, 0.26);
  const headPivot = new THREE.Group(); headPivot.position.y = 0.72; torso.add(headPivot);
  part(headPivot, [skin, skin, skin, skin, skin, face], 0.46, 0.46, 0.46, 0, 0.25, 0);
  part(headPivot, helmet, 0.54, 0.16, 0.54, 0, 0.5, 0.0);
  part(headPivot, helmet, 0.56, 0.06, 0.6, 0, 0.42, -0.02);
  part(headPivot, glove, 0.5, 0.06, 0.06, 0, 0.36, -0.25);

  const aim = new THREE.Group(); aim.position.set(0, 0.62, 0); torso.add(aim);
  const armR = new THREE.Group(); armR.position.set(0.33, 0, 0); aim.add(armR);
  part(armR, uniform, 0.2, 0.2, 0.5, 0, -0.04, -0.2);
  part(armR, glove, 0.21, 0.21, 0.14, 0, -0.04, -0.5);
  const armL = new THREE.Group(); armL.position.set(-0.33, 0, 0); aim.add(armL);
  part(armL, uniform, 0.2, 0.2, 0.62, 0, -0.04, -0.26);
  part(armL, glove, 0.21, 0.21, 0.14, 0, -0.04, -0.62);
  const holder = new THREE.Group(); holder.position.set(0.16, -0.06, -0.42); aim.add(holder);
  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { root, legs, torso, headPivot, aim, armR, armL, holder };
}

// ---- ゾンビ（かわいい・みどり・ブロック） ----
const ZLOOK = {
  walker: { skin: 0x6abf4b, shirt: 0x2a9d8f, pants: 0x3d4f8f },
  runner: { skin: 0x7ccf55, shirt: 0xe07a2f, pants: 0x5a4a3a },
  brute: { skin: 0x5aa83f, shirt: 0x7b4fb0, pants: 0x3a3a46 },
};
const zMats = {};
function zombieMats(kind) {
  if (zMats[kind]) return zMats[kind];
  const c = ZLOOK[kind];
  const skin = new THREE.MeshLambertMaterial({ map: solidTexture(c.skin, 0.16, 9) });
  const face = new THREE.MeshLambertMaterial({ map: zombieFaceTexture(c.skin, kind) });
  const shirt = new THREE.MeshLambertMaterial({ map: shirtTexture(c.shirt, kind.length) });
  const pants = new THREE.MeshLambertMaterial({ map: solidTexture(c.pants, 0.18, 12) });
  const hair = L(0x3f6b2c), helm = L(0x6d737c);
  return (zMats[kind] = { skin, face, shirt, pants, hair, helm });
}
export const FLASH_MAT = new THREE.MeshBasicMaterial({ color: 0xe6ffd0 });

export function makeZombie(kind) {
  const m = zombieMats(kind);
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
  part(head, [m.skin, m.skin, m.hair, m.skin, m.skin, m.face], 0.5, 0.5, 0.5, 0, 0.25, 0);
  if (kind === 'brute') part(head, m.helm, 0.56, 0.14, 0.56, 0, 0.52, 0);
  const arms = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(s * 0.38, 0.64, 0); body.add(pivot);
    part(pivot, m.shirt, 0.23, 0.23, 0.22, 0, 0, -0.06);
    part(pivot, m.skin, 0.2, 0.2, 0.5, 0, 0, -0.38);
    arms.push(pivot);
  }
  const meshes = [];
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.userData.mat = o.material; meshes.push(o); } });
  return { root, inner, legs, body, head, arms, meshes, kind };
}
