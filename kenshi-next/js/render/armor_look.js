// 防具・服の見た目（見た目だけ。sim のダメージ・防御には触れない）。
// 方式: 着ている装備ごとに「体の皮膚メッシュのうち、その部位を覆う三角形」を法線方向に少し膨らませて複製し、
// 1人分を1つの SkinnedMesh（頂点色・共有材質・骨は本体と共有）にまとめる。
// 種類（布/革/鎧）で膨らみ・色の陰影（布: 平ら / 革: まだら / 鎧: 板の段）・つや(頂点色)を変える。
// 計画（armorPlan）は THREE に依存せず node でテストできる。メッシュ作りは THREE を引数で受け取る。

import { clearMergedWeapon } from './weapon_merge.js';
import { loadArmour, createV4 } from './armour_v4.js';
import { ITEMS } from '../sim/items.js';
import { factionPaletteFor } from './faction_colors.js';
import { paletteIdFor } from '../data/faction_map.js';

export const ARMOR_SLOTS = ['head', 'upperIn', 'upperOut', 'lowerIn', 'lowerOut', 'feet'];
// 層ごとの基本の膨らみ(m)。内側の服より外側が厚い。
const SLOT_THICK = { upperIn: 0.004, lowerIn: 0.004, upperOut: 0.010, lowerOut: 0.010, head: 0.010, feet: 0.010 };
// 種類による膨らみの追加。
const KIND_THICK = { cloth: 0, leather: 0.004, armor: 0.012 };
const STEEL = [0.62, 0.64, 0.68];
const BROWN = [0.35, 0.24, 0.15];
const DIRT = [0.24, 0.19, 0.14];
// 量子化の段（同じ見た目の部品のジオメトリを人どうしで共有するため）
const WEAR_STEPS = [0, 0.15, 0.3, 0.45];

// 整数の決定的ハッシュ（sim の乱数の流れは使わない）。
export function hash32(id, salt) {
  let h = (Number(id) | 0) ^ (salt | 0);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  return (h ^ (h >>> 16)) >>> 0;
}

// 装備の種類（布/革/鎧）。
export function kindOf(id) {
  const d = ITEMS[id];
  if (!d) return null;
  if (d.metal) return 'armor';
  if (/leather/.test(id)) return 'leather';
  return 'cloth';
}

const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const hex2 = (c) => c.map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join('');

// 部位ごとにパレットのどの色を使うか（個体ごとに回す）。
function paletteColor(pal, slot, r) {
  const p = pal.rgb;
  switch (slot) {
    case 'upperOut': return p[0];
    case 'upperIn': return p[(1 + r) % 3 === 0 ? 1 : (1 + r) % 3];
    case 'lowerOut': return p[(r + 1) % 3];
    case 'lowerIn': return p[(r + 2) % 3];
    case 'head': return p[(r + 2) % 3];
    default: return mix(p[2], [0, 0, 0], 0.25); // 靴は暗く
  }
}

// 着ているもの1つ分の見た目の決まり。
function piece(actor, slot, obj, holderPalId) {
  const id = obj.id;
  const kind = kindOf(id);
  const originId = paletteIdFor(obj.originFaction || holderPalId);
  const pal = factionPaletteFor(originId);
  const seed = actor.id | 0;
  const r = hash32(seed, 0x5eed) % 3;
  const slotSalt = ARMOR_SLOTS.indexOf(slot) + 1;
  let rgb = paletteColor(pal, slot, r);
  if (kind === 'armor') rgb = mix(rgb, STEEL, 0.55);
  else if (kind === 'leather') rgb = mix(rgb, BROWN, 0.45);
  // 色あせ・汚れ。ランクが低いほど傷んでいる。
  const lowRank = Math.max(0, 5 - (Number(obj.rank) || 3)) * 0.04;
  const fadeRaw = ((hash32(seed, 0xfade + slotSalt) % 1000) / 1000) * 0.4 + lowRank;
  const dirtRaw = ((hash32(seed, 0xd127 + slotSalt) % 1000) / 1000) * 0.45 + lowRank;
  const quant = (v) => WEAR_STEPS.reduce((best, s) => (Math.abs(s - v) < Math.abs(best - v) ? s : best), 0);
  const fade = quant(fadeRaw);
  const dirt = quant(dirtRaw);
  const lum = rgb[0] * 0.3 + rgb[1] * 0.59 + rgb[2] * 0.11;
  rgb = mix(rgb, [lum * 1.1 + 0.08, lum * 1.1 + 0.08, lum * 1.1 + 0.08], fade);
  // 個体差: 袖の長さ・裾の長さ（布と革）。鎧は決まった形。
  const vs = hash32(seed, 0x51ee + slotSalt) % 3;
  let sleeve = vs;
  let full = hash32(seed, 0x1e65 + slotSalt) % 2 === 0;
  if (kind === 'armor') {
    sleeve = id === 'chain_coat' ? 2 : 1;
    full = true;
  } else if (id === 'cloth_shirt') sleeve = Math.max(1, vs);
  else if (id === 'cloth_pants' || id === 'leather_leggings') full = true;
  const frac = id === 'sandals' ? 0 : id === 'leather_shoes' ? 0.15 : id === 'iron_boots' ? 0.35 : id === 'iron_helmet' ? 0.25 : slot === 'head' ? 0.45 : 0;
  return {
    slot, id, kind, origin: originId, factionSpecific: ITEMS[id].factionSpecific === true, rgb, fade, dirt, sleeve, full, frac,
    shape: ITEMS[id].shape || ({ rag_top: 'coat', rag_pants: 'wrap', cloth_shirt: 'robe', cloth_pants: 'wrap', chain_shirt: 'lamellar', sandals: 'leather', iron_helmet: 'bucket', leather_cap: 'hood', plate_body: 'plate', chain_coat: 'lamellar', leather_vest: 'coat', plate_legs: 'plate', leather_leggings: 'leather', iron_boots: 'plate', leather_shoes: 'leather' })[id], variant: Math.abs(Math.trunc(Number(obj.variant) || 0)) % (ITEMS[id].variants || 1),
    thick: SLOT_THICK[slot] + KIND_THICK[kind],
  };
}

// 人（actor）の装備から見た目の計画を作る。同じ装備・同じ id なら必ず同じ結果。
export function armorPlan(actor, dollKind = 'm') {
  const equip = actor && actor.equip;
  const holderPalId = paletteIdFor(actor);
  const pieces = [];
  if (equip) {
    for (const slot of ARMOR_SLOTS) {
      const obj = equip[slot];
      if (!obj || !ITEMS[obj.id] || ITEMS[obj.id].slot !== slot) continue;
      pieces.push(piece(actor, slot, obj, holderPalId));
    }
  }
  const key = dollKind + '|' + pieces.map((p) => [p.slot, p.id, p.origin, hex2(p.rgb), p.fade, p.dirt, p.sleeve, p.full ? 1 : 0, p.variant].join(':')).join('|');
  return { key, pieces, kind: dollKind };
}

// 装備の入れ替わりを安く見つけるための指紋（物の参照と元の勢力）。毎フレーム比べる用。
export function armorSignature(actor) {
  const e = actor && actor.equip;
  if (!e) return '';
  let s = '';
  for (const slot of ARMOR_SLOTS) {
    const o = e[slot];
    s += o ? o.id + '@' + (o.originFaction || '') + '#' + (o.rank | 0) + ':' + (o.variant | 0) + ';' : ';';
  }
  return s;
}

// ---- 骨の名前 → 部位 ----
export const R = { NONE: 0, HEAD: 1, TORSO: 2, UARM: 3, LARM: 4, HIP: 5, THIGH: 6, CALF: 7, FOOT: 8 };
export function regionOfBone(name) {
  const n = String(name || '');
  if (n === 'Head') return R.HEAD;
  if (/^(spine_|clavicle_)/.test(n)) return R.TORSO;
  if (/^upperarm_/.test(n)) return R.UARM;
  if (/^lowerarm_/.test(n)) return R.LARM;
  if (n === 'pelvis') return R.HIP;
  if (/^thigh_/.test(n)) return R.THIGH;
  if (/^calf_/.test(n)) return R.CALF;
  if (/^(foot_|ball_)/.test(n)) return R.FOOT;
  return R.NONE;
}

const srgbToLinear = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));

// 頂点ごとの部位と、部位ごとの高さの範囲（ジオメトリごとに1回だけ）。
const regionCache = new WeakMap();
function regionsOf(geometry, boneNames) {
  let info = regionCache.get(geometry);
  if (info) return info;
  const pos = geometry.attributes.position;
  const si = geometry.attributes.skinIndex;
  const sw = geometry.attributes.skinWeight;
  const n = pos.count;
  const region = new Uint8Array(n);
  const lo = new Float32Array(9).fill(Infinity);
  const hi = new Float32Array(9).fill(-Infinity);
  let yMin = Infinity;
  let yMax = -Infinity;
  for (let i = 0; i < n; i++) {
    let best = 0;
    let bw = -1;
    for (let k = 0; k < 4; k++) {
      const w = sw.getComponent(i, k);
      if (w > bw) {
        bw = w;
        best = si.getComponent(i, k);
      }
    }
    const rg = regionOfBone(boneNames[best]);
    region[i] = rg;
    const y = pos.getY(i);
    if (y < lo[rg]) lo[rg] = y;
    if (y > hi[rg]) hi[rg] = y;
    if (y < yMin) yMin = y;
    if (y > yMax) yMax = y;
  }
  info = { region, lo, hi, yMin, yMax };
  regionCache.set(geometry, info);
  return info;
}

// この部品がその頂点を覆うか。
function covers(p, rg, y, info) {
  switch (p.slot) {
    case 'head':
      return rg === R.HEAD && y >= info.lo[R.HEAD] + p.frac * (info.hi[R.HEAD] - info.lo[R.HEAD]);
    case 'upperIn':
    case 'upperOut':
      return rg === R.TORSO || (rg === R.UARM && p.sleeve >= 1) || (rg === R.LARM && p.sleeve >= 2);
    case 'lowerIn':
    case 'lowerOut':
      return rg === R.HIP || rg === R.THIGH || (rg === R.CALF && p.full);
    case 'feet':
      return rg === R.FOOT || (rg === R.CALF && p.frac > 0 && y <= info.lo[R.CALF] + p.frac * (info.hi[R.CALF] - info.lo[R.CALF]));
    default:
      return false;
  }
}

// 位置から 0〜1 の決定的な雑音。
function noise3(x, y, z) {
  const h = hash32(Math.round(x * 90) * 73856093 ^ Math.round(y * 90) * 19349663 ^ Math.round(z * 90) * 83492791, 0x9e37);
  return (h % 1024) / 1023;
}

// 材質ごとの陰影。
function shade(kind, y, n) {
  if (kind === 'armor') return 0.78 + 0.22 * (0.5 + 0.5 * Math.sin(y * 34 + 1.7)) + (n - 0.5) * 0.08;
  if (kind === 'leather') return 0.8 + 0.2 * n;
  return 0.93 + 0.07 * n + 0.03 * Math.sin(y * 60);
}

// 皮膚メッシュの geometry から、計画どおりの防具のジオメトリを作る。
// src: { geometry, boneNames }（SkinnedMesh の geometry と skeleton.bones の名前）。
export function buildArmorGeometry(THREE, src, plan) {
  const g = src.geometry;
  const info = regionsOf(g, src.boneNames);
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const si = g.attributes.skinIndex;
  const sw = g.attributes.skinWeight;
  const index = g.index ? g.index.array : null;
  const triCount = index ? index.length / 3 : pos.count / 3;
  const outPos = [];
  const outNor = [];
  const outCol = [];
  const outSi = [];
  const outSw = [];
  const outIdx = [];
  const span = Math.max(1e-6, info.yMax - info.yMin);
  for (const p of plan.pieces) {
    const remap = new Map();
    const lin = p.rgb.map(srgbToLinear);
    const dirtLin = DIRT.map(srgbToLinear);
    const vertex = (vi) => {
      let o = remap.get(vi);
      if (o !== undefined) return o;
      o = outPos.length / 3;
      remap.set(vi, o);
      const x = pos.getX(vi);
      const y = pos.getY(vi);
      const z = pos.getZ(vi);
      const nx = nor.getX(vi);
      const ny = nor.getY(vi);
      const nz = nor.getZ(vi);
      outPos.push(x + nx * p.thick, y + ny * p.thick, z + nz * p.thick);
      outNor.push(nx, ny, nz);
      const n = noise3(x, y, z);
      const s = shade(p.kind, y, n);
      const ty = (y - info.yMin) / span;
      const d = Math.min(1, p.dirt * (0.35 + 0.65 * (1 - ty)) * (0.6 + 0.4 * n));
      for (let c = 0; c < 3; c++) outCol.push(lin[c] * s * (1 - d) + dirtLin[c] * d);
      for (let k = 0; k < 4; k++) {
        outSi.push(si.getComponent(vi, k));
        outSw.push(sw.getComponent(vi, k));
      }
      return o;
    };
    for (let t = 0; t < triCount; t++) {
      const a = index ? index[t * 3] : t * 3;
      const b = index ? index[t * 3 + 1] : t * 3 + 1;
      const c = index ? index[t * 3 + 2] : t * 3 + 2;
      if (!covers(p, info.region[a], pos.getY(a), info) || !covers(p, info.region[b], pos.getY(b), info) || !covers(p, info.region[c], pos.getY(c), info)) continue;
      outIdx.push(vertex(a), vertex(b), vertex(c));
    }
    // Extra rigid pieces share the same skinned geometry and material as the clothing.
    // Each piece is weighted to a single bone, so it follows the animation.
    if (p.shape) {
      const addPiece = (boneName, shape, sx, sy, sz, ox = 0, oy = 0, oz = 0) => {
        const bone = src.boneNames.indexOf(boneName);
        if (bone < 0) return;
        let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
        for (let i = 0; i < pos.count; i++) {
          let best = 0;
          for (let k = 1; k < 4; k++) if (sw.getComponent(i, k) > sw.getComponent(i, best)) best = k;
          if (si.getComponent(i, best) !== bone) continue;
          for (let k = 0; k < 3; k++) { const v = pos.getComponent(i, k); lo[k] = Math.min(lo[k], v); hi[k] = Math.max(hi[k], v); }
        }
        if (!Number.isFinite(lo[0])) return;
        const size = lo.map((v, k) => Math.max(.04, hi[k] - v));
        const center = lo.map((v, k) => (v + hi[k]) / 2);
        let part = shape === 'cone' ? new THREE.ConeGeometry(.5, 1, 8) : shape === 'cylinder' ? new THREE.CylinderGeometry(.5, .5, 1, 8, 1, true) : shape === 'shell' ? new THREE.SphereGeometry(.5, 8, 4, 0, Math.PI * 2, 0, Math.PI * .53) : new THREE.SphereGeometry(.5, 8, 5);
        part.scale(size[0] * sx, size[1] * sy, size[2] * sz);
        part.translate(center[0] + size[0] * ox, center[1] + size[1] * oy, center[2] + size[2] * oz);
        const pp = part.attributes.position, nn = part.attributes.normal;
        const base = outPos.length / 3;
        for (let i = 0; i < pp.count; i++) {
          outPos.push(pp.getX(i), pp.getY(i), pp.getZ(i));
          outNor.push(nn.getX(i), nn.getY(i), nn.getZ(i));
          outCol.push(...lin); outSi.push(bone, 0, 0, 0); outSw.push(1, 0, 0, 0);
        }
        if (part.index) for (const i of part.index.array) outIdx.push(base + i);
        else for (let i = 0; i < pp.count; i++) outIdx.push(base + i);
        part.dispose();
      };
      const v = p.variant;
      if (p.slot === 'head') {
        const hat = p.shape === 'hat' || p.shape === 'cone';
        if (p.shape === 'mask') addPiece('Head', 'box', .9 + v * .1, .4, .18, 0, -.12, .5);
        else addPiece('Head', p.shape === 'cone' ? 'cone' : 'cylinder', hat ? 1.7 + v * .15 : 1.12, hat ? .35 + v * .1 : p.shape === 'bandana' ? .22 : .65, hat ? 1.7 + v * .15 : 1.12, 0, hat ? .52 : .3);
        if (p.shape === 'kabuto') addPiece('Head', 'box', 1.5, .12, 1.35, 0, .2);
      } else if (p.slot.startsWith('upper')) {
        if (p.slot === 'upperOut') {
          addPiece('pelvis', 'cylinder', p.kind === 'armor' ? 1.16 : 1.04, .09, p.kind === 'armor' ? 1.16 : 1.04); // open thin waist ring
          
          if (p.kind === 'armor') addPiece('spine_02', 'cylinder', .8, .16 + v * .035, .8, 0, .62); // gorget
        }
        const bulky = p.shape === 'box' || p.shape === 'padded' || p.shape === 'plate';
        addPiece('spine_02', 'box', bulky ? 1.15 : 1.05, .9, bulky ? 1.18 : 1.05);
        if (p.shape === 'cape' || p.shape === 'poncho' || p.shape === 'robe' || p.shape === 'coat')
          addPiece('spine_02', 'box', 1.0, 1.4, .10, 0, -.35, -.1);
        if (p.slot === 'upperOut') {
          for (const side of ['l', 'r']) {
            addPiece('upperarm_' + side, 'shell', bulky ? 1.12 : 1.04, .32, 1.08, 0, .25);
            if (p.kind === 'armor') addPiece('lowerarm_' + side, 'cylinder', 1.15, .55, 1.15);
          }
        }
      } else if (p.slot.startsWith('lower') || p.slot === 'feet') {
        for (const side of ['l', 'r']) addPiece((p.slot === 'feet' ? 'foot_' : 'calf_') + side, p.kind === 'armor' && p.slot !== 'feet' ? 'cylinder' : 'box', 1.06, .7, 1.06);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(outPos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(outNor, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(outCol, 3));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(outSi, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(outSw, 4));
  geo.setIndex(outIdx);
  return geo;
}

// 防具の材質（全員で共有。頂点色。倒れた人用の暗い版も共有）と、ジオメトリの置き場。
export function createArmorLooks(THREE) {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0 });
  const dark = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, color: 0x575757 });
  mat.userData.shared = true;
  dark.userData.shared = true;
  const geos = new Map(); // key → { geo, refs }
  let v4 = null, generation = 0;
  if (typeof window !== 'undefined' && new URLSearchParams(location.search).get('oldarmor') !== '1') {
    loadArmour().then(pieces => { v4 = createV4(THREE, pieces); generation++; }).catch(err => console.warn('armour_v4 load failed', err));
  }

  function acquire(src, plan) {
    const key = src.geometry.uuid + '|' + plan.key;
    let e = geos.get(key);
    if (!e) {
      e = { geo: buildArmorGeometry(THREE, src, plan), refs: 0, key };
      geos.set(key, e);
    }
    e.refs++;
    return e;
  }
  function release(entry) {
    if (!entry) return;
    entry.refs--;
    if (entry.refs <= 0) {
      entry.geo.dispose();
      geos.delete(entry.key);
    }
  }

  // 人形に防具メッシュを付け直す（装備が変わった時だけ）。
  function apply(doll, actor) {
    if (!doll || doll.fallback || !doll.root) return;
    const sig = armorSignature(actor) + '|' + paletteIdFor(actor) + '|' + generation;
    if (doll.armorSig === sig) return;
    doll.armorSig = sig;
    detach(doll);
    const plan = armorPlan(actor, doll.kind || 'm');
    if (!plan.pieces.length) return;
    if (!doll.armorSrc) {
      let best = null;
      doll.root.traverse((o) => {
        if (o.isSkinnedMesh && !o.userData.armor && (!best || o.geometry.attributes.position.count > best.geometry.attributes.position.count)) best = o;
      });
      if (!best) return;
      doll.armorSrc = { mesh: best, geometry: best.geometry, boneNames: best.skeleton.bones.map((b) => b.name) };
    }
    const missing = v4 ? v4.attach(doll, plan, actor.state === 'dead', actor) : plan.pieces;
    if (!missing.length) return;
    const fallbackPlan = { ...plan, pieces: missing, key: plan.key + '|missing:' + missing.map(p => p.slot).join(',') };
    const entry = acquire(doll.armorSrc, fallbackPlan);
    if (!entry.geo.index || entry.geo.index.count === 0) {
      release(entry);
      return;
    }
    const mesh = new THREE.SkinnedMesh(entry.geo, actor.state === 'dead' ? dark : mat);
    mesh.bind(doll.armorSrc.mesh.skeleton, doll.armorSrc.mesh.bindMatrix);
    mesh.frustumCulled = false;
    mesh.castShadow = false; // 影の描画呼び出しを増やさない
    mesh.receiveShadow = true;
    mesh.userData.armor = true;
    mesh.userData.shared = true;
    mesh.raycast = () => {}; // 選択の当たり判定に使わない（本体で足りる。蒙皮計算を増やさない）
    doll.armorMesh = mesh;
    doll.armorEntry = entry;
    doll.armorSrc.mesh.parent.add(mesh);
  }
  function detach(doll) {
    clearMergedWeapon(doll);
    const skeletons = new Set();
    for (const mesh of doll.v4Meshes || []) { mesh.parent?.remove(mesh); skeletons.add(mesh.skeleton); }
    for (const skeleton of skeletons) skeleton.dispose();
    doll.v4Meshes = null;
    if (doll.armorMesh) {
      doll.armorMesh.parent?.remove(doll.armorMesh);
      doll.armorMesh = null;
    }
    release(doll.armorEntry);
    doll.armorEntry = null;
  }
  function darken(doll) {
    if (v4) v4.darken(doll);
    if (doll.armorMesh) doll.armorMesh.material = dark;
  }
  function dispose() {
    if (v4) v4.dispose();
    for (const e of geos.values()) e.geo.dispose();
    geos.clear();
    mat.dispose();
    dark.dispose();
  }
  return {
    apply, detach, darken, dispose, material: mat, darkMaterial: dark,
    get geometryCount() { return geos.size; },
  };
}



