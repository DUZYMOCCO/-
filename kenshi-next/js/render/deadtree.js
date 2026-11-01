// 翠緑の盆地の枯れ木: 葉の無い幹と枝だけの木を手続きで作る（深い緑の異世界の木）。
// 形は種（seed）で決まり毎回同じ。頂点色つきの非インデックス BufferGeometry を返す。
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// 幹の根元（暗い深緑）→ 枝先（少し明るい深緑）。地面 #2F5A36 に埋もれないよう明暗差をつける
export const DEADTREE_COLORS = { base: '#30573A', mid: '#42704A', tip: '#679A64' };
export const DEADTREE_VARIANTS = 6;
const SIDES = 5;

function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

const _up = new THREE.Vector3(0, 1, 0);
const cBase = new THREE.Color(), cMid = new THREE.Color(), cTip = new THREE.Color();
function shade(t, out) {
  // t: 0=根元 1=枝先
  if (t < 0.5) return out.copy(cBase).lerp(cMid, t / 0.5);
  return out.copy(cMid).lerp(cTip, (t - 0.5) / 0.5);
}

// a→b の先細りの筒（側面だけ。r0 根元, r1 先, t0/t1 色の位置）
function limb(parts, a, b, r0, r1, t0, t1) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  if (len < 1e-4) return;
  const g = new THREE.CylinderGeometry(r1, r0, len, SIDES, 1, true);
  g.translate(0, len / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(_up, dir.normalize()));
  g.translate(a.x, a.y, a.z);
  g.deleteAttribute('uv');
  const ng = g.toNonIndexed();
  g.dispose();
  const pos = ng.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i += 1) {
    // 筒の上下どちらの輪か（a からの距離で判定）
    const dx = pos.getX(i) - a.x, dy = pos.getY(i) - a.y, dz = pos.getZ(i) - a.z;
    const k = Math.min(1, Math.max(0, (dx * dir.x + dy * dir.y + dz * dir.z) / len));
    shade(t0 + (t1 - t0) * k, c);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  ng.setAttribute('color', new THREE.BufferAttribute(col, 3));
  parts.push(ng);
}

function bend(v, r, amt) {
  v.x += (r() - 0.5) * amt; v.z += (r() - 0.5) * amt;
  return v.normalize();
}

// 枝（再帰）。depth 0 で止める
function branch(parts, r, from, dir, len, rad, t0, depth) {
  const steps = len > 1.2 ? 2 : 1;
  let p = from.clone();
  let d = dir.clone();
  let rr = rad;
  const seg = len / steps;
  for (let i = 0; i < steps; i += 1) {
    const q = p.clone().addScaledVector(d, seg);
    const r1 = Math.max(0.018, rr * 0.62);
    const ta = t0 + (1 - t0) * (i / steps), tb = t0 + (1 - t0) * ((i + 1) / steps);
    limb(parts, p, q, rr, r1, ta, tb);
    p = q; rr = r1;
    d = bend(d, r, 0.45);
    d.y = Math.max(d.y, 0.15); d.normalize();
  }
  if (depth <= 0) return;
  const n = r() < 0.55 ? 2 : 1;
  for (let k = 0; k < n; k += 1) {
    const side = new THREE.Vector3(r() - 0.5, 0.2 + r() * 0.5, r() - 0.5);
    const nd = d.clone().multiplyScalar(0.6).add(side).normalize();
    branch(parts, r, p, nd, len * (0.45 + r() * 0.2), rr * 0.95, Math.min(0.95, t0 + 0.3), depth - 1);
  }
}

// 1本の枯れ木（高さ約 3.6〜5.6m）
export function makeDeadTree(seed) {
  cBase.set(DEADTREE_COLORS.base); cMid.set(DEADTREE_COLORS.mid); cTip.set(DEADTREE_COLORS.tip);
  const r = rng(seed + 1);
  const parts = [];
  const H = 3.6 + r() * 2.0;
  const baseR = 0.17 + r() * 0.08;
  // 傾き（種ごとに違う向き・量）
  const leanA = r() * Math.PI * 2, lean = 0.04 + r() * 0.16;
  let d = new THREE.Vector3(Math.cos(leanA) * lean, 1, Math.sin(leanA) * lean).normalize();
  // 幹: 3節、少しずつ曲がる。根元は地面に少し埋める
  let p = new THREE.Vector3(0, -0.25, 0);
  let rr = baseR * 1.25;
  const trunkSegs = 3;
  const forks = [];
  for (let i = 0; i < trunkSegs; i += 1) {
    const segLen = (H * (i === 0 ? 0.42 : 0.29)) + (i === 0 ? 0.25 : 0);
    const q = p.clone().addScaledVector(d, segLen);
    const r1 = rr * (i === 0 ? 0.72 : 0.68);
    limb(parts, p, q, rr, r1, i / trunkSegs * 0.5, (i + 1) / trunkSegs * 0.5);
    forks.push({ p: q.clone(), d: d.clone(), rr: r1 });
    p = q; rr = r1;
    d = bend(d, r, 0.35);
  }
  // 幹の先端から上へ1本
  branch(parts, r, p, bend(d.clone(), r, 0.3), H * 0.22, rr, 0.55, 1);
  // 主枝 3〜5本（幹の上2節から）
  const nb = 3 + Math.floor(r() * 3);
  for (let k = 0; k < nb; k += 1) {
    const f = forks[1 + (k % 2)];
    const a = leanA + k * (Math.PI * 2 / nb) + (r() - 0.5) * 0.9;
    const up = 0.45 + r() * 0.75;
    const nd = new THREE.Vector3(Math.cos(a), up, Math.sin(a)).normalize();
    const start = f.p.clone().addScaledVector(f.d, -r() * H * 0.12);
    branch(parts, r, start, nd, H * (0.26 + r() * 0.16), f.rr * 0.8, 0.5, r() < 0.7 ? 1 : 0);
  }
  // 根元の張り出し（短い根 3本）
  for (let k = 0; k < 3; k += 1) {
    const a = k * 2.09 + r();
    const a0 = new THREE.Vector3(0, 0.35, 0);
    const b0 = new THREE.Vector3(Math.cos(a) * 0.55, -0.12, Math.sin(a) * 0.55);
    limb(parts, a0, b0, baseR * 0.7, baseR * 0.25, 0.02, 0.1);
  }
  const m = mergeGeometries(parts, false);
  for (const g of parts) g.dispose();
  m.computeVertexNormals();
  m.computeBoundingSphere();
  return m;
}

export function makeDeadTrees(n) {
  const out = [];
  for (let i = 0; i < (n || DEADTREE_VARIANTS); i += 1) out.push(makeDeadTree(101 + i * 37));
  return out;
}
