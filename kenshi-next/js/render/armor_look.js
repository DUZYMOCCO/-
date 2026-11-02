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
    shape: ITEMS[id].shape || ({ rag_top: 'coat', rag_pants: 'wrap', cloth_shirt: 'robe', cloth_pants: 'wrap', chain_shirt: 'lamellar', sandals: 'leather', iron_helmet: 'iron_helmet', leather_cap: 'leather_cap', plate_body: 'plate', chain_coat: 'lamellar', leather_vest: 'coat', plate_legs: 'plate', leather_leggings: 'leather', iron_boots: 'plate', leather_shoes: 'leather' })[id], variant: Math.abs(Math.trunc(Number(obj.variant) || 0)) % (ITEMS[id].variants || 1),
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
  const key = dollKind + '|' + pieces.map((p) => [p.slot, p.id, p.shape || '', p.origin, hex2(p.rgb), p.fade, p.dirt, p.sleeve, p.full ? 1 : 0, p.variant].join(':')).join('|');
  return { key, pieces, kind: dollKind };
}

// 手続き形状を持つ頭装備は統合フォールバックへ。それ以外の v4 割り当ては維持する。
export function armorV4Plan(plan, before = false) {
  if (before) return plan;
  return {
    ...plan,
    pieces: plan.pieces.filter(p =>
      (p.kind === 'armor' || p.slot === 'head' || p.slot === 'feet') &&
      !(p.slot === 'head' && p.shape) &&
      !String(p.shape || '').startsWith('hb_')
    ),
  };
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
export const R = { NONE: 0, HEAD: 1, TORSO: 2, UARM: 3, LARM: 4, HIP: 5, THIGH: 6, CALF: 7, FOOT: 8, NECK: 9 };
const REGION_COUNT = Object.keys(R).length;
export function regionOfBone(name) {
  const n = String(name || '');
  if (n === 'Head') return R.HEAD;
  if (n === 'neck_01') return R.NECK;
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
  const lo = new Float32Array(REGION_COUNT).fill(Infinity);
  const hi = new Float32Array(REGION_COUNT).fill(-Infinity);
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
      // Cloth/leather headgear is a rigid silhouette; do not paint a tight cap
      // directly onto the skin. Metal helmets keep their existing shell path.
      return p.kind === 'armor' && rg === R.HEAD && y >= info.lo[R.HEAD] + p.frac * (info.hi[R.HEAD] - info.lo[R.HEAD]);
    case 'upperIn':
    case 'upperOut':
      if (rg === R.TORSO) return true;
      if (rg === R.UARM) return p.sleeve >= 1;
      // Leave a visible strip of forearm before the wrist for cloth sleeves.
      return rg === R.LARM && p.sleeve >= 2 && (p.kind === 'armor' || y >= info.lo[R.LARM] + 0.42 * (info.hi[R.LARM] - info.lo[R.LARM]));
    case 'lowerIn':
    case 'lowerOut':
      if (rg === R.HIP || rg === R.THIGH) return true;
      // Cloth and leather trousers stop above the ankle; metal greaves retain
      // their full calf coverage.
      return rg === R.CALF && p.full && (p.kind === 'armor' || y >= info.lo[R.CALF] + 0.16 * (info.hi[R.CALF] - info.lo[R.CALF]));
    case 'feet':
      return rg === R.FOOT || (rg === R.CALF && p.frac > 0 && y <= info.lo[R.CALF] + p.frac * (info.hi[R.CALF] - info.lo[R.CALF]));
    default:
      return false;
  }
}

// この部品がその関節の頂点を隠すか（防具の下に関節の部品がのぞかないようにするか）。
// 布・革は皮膚を覆う三角形と同じ範囲。金属の鎧は v4 の型紙部品（ヴァンブレース・ゴージェット）
// が覆う肘から手首・首も合わせて隠す。素手・指はどの装備でも覆わない。
function coversJoint(p, rg, y, info) {
  if (covers(p, rg, y, info)) return true;
  return p.kind === 'armor' && (p.slot === 'upperIn' || p.slot === 'upperOut') && (rg === R.LARM || rg === R.NECK);
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
      let ease = 0;
      if (p.kind !== 'armor') {
        if (p.slot === 'upperIn') ease = 0.012; // 16 mm total over the torso
        else if (p.slot === 'upperOut') ease = 0.006; // 16 mm cloth / 20 mm leather total over the torso
        else if (p.slot === 'lowerIn') ease = 0.008;
        else if (p.slot === 'lowerOut') ease = 0.004;
        // Keep the skin offset below metal armor; the tapered trouser silhouette adds visible flare.
        if ((p.slot === 'lowerIn' || p.slot === 'lowerOut') && info.region[vi] === R.CALF) ease += 0.008;
      }
      outPos.push(x + nx * (p.thick + ease), y + ny * (p.thick + ease), z + nz * (p.thick + ease));
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
    const hasUpperOut = plan.pieces.some(piece => piece.slot === 'upperOut');
    const hasLowerOut = plan.pieces.some(piece => piece.slot === 'lowerOut');
    const visibleTop = p.slot === (hasUpperOut ? 'upperOut' : 'upperIn');
    const visiblePants = p.slot === (hasLowerOut ? 'lowerOut' : 'lowerIn');
    if (p.shape && (p.kind === 'armor' || p.slot === 'head' || visibleTop || visiblePants || p.shape === 'ha_trail_boots')) {
      const addPiece = (boneName, shape, sx, sy, sz, ox = 0, oy = 0, oz = 0, colorScale = 1, rotZ = 0, rotX = 0) => {
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
        let part = shape === 'cone' ? new THREE.ConeGeometry(.5, 1, 8)
          : shape === 'flare' ? new THREE.CylinderGeometry(.48, .54, 1, 12, 1, true)
            : shape === 'hemFlare' ? new THREE.CylinderGeometry(.48, .53, 1, 12, 1, true)
              : shape === 'cuff' ? new THREE.CylinderGeometry(.50, .52, 1, 12, 1, true)
              : shape === 'cylinder' ? new THREE.CylinderGeometry(.5, .5, 1, 8, 1, true)
                : shape === 'panel' || shape === 'box' ? new THREE.BoxGeometry(1, 1, 1)
                  : shape === 'shell' ? new THREE.SphereGeometry(.5, 8, 4, 0, Math.PI * 2, 0, Math.PI * .53)
                    : new THREE.SphereGeometry(.5, 8, 5);
        if (rotZ) part.rotateZ(rotZ);
        if (rotX) part.rotateX(rotX);
        part.scale(size[0] * sx, size[1] * sy, size[2] * sz);
        part.translate(center[0] + size[0] * ox, center[1] + size[1] * oy, center[2] + size[2] * oz);
        const pp = part.attributes.position, nn = part.attributes.normal;
        const base = outPos.length / 3;
        for (let i = 0; i < pp.count; i++) {
          outPos.push(pp.getX(i), pp.getY(i), pp.getZ(i));
          outNor.push(nn.getX(i), nn.getY(i), nn.getZ(i));
          outCol.push(lin[0] * colorScale, lin[1] * colorScale, lin[2] * colorScale); outSi.push(bone, 0, 0, 0); outSw.push(1, 0, 0, 0);
        }
        if (part.index) for (const i of part.index.array) outIdx.push(base + i);
        else for (let i = 0; i < pp.count; i++) outIdx.push(base + i);
        part.dispose();
      };
      const v = p.variant;
      if (p.slot === 'head') {
        if (p.shape === 'hat') {
          // 麦わら帽子: 広く平たいつば ＋ 中央の丸いクラウン
          addPiece('Head', 'cylinder', 1.85 + v * 0.15, 0.06, 1.85 + v * 0.15, 0, 0.30);
          addPiece('Head', 'cylinder', 1.15 + v * 0.05, 0.28 + v * 0.04, 1.15 + v * 0.05, 0, 0.42);
        } else if (p.shape === 'cone') {
          // 笠（三角笠）: 円錐形の笠 ＋ 頂点の結び目
          addPiece('Head', 'cone', 1.95 + v * 0.15, 0.55 + v * 0.08, 1.95 + v * 0.15, 0, 0.40);
          addPiece('Head', 'cylinder', 0.25, 0.10, 0.25, 0, 0.68 + v * 0.04);
        } else if (p.shape === 'hood') {
          // 布頭巾（フード）: 頭を包む丸いシェル ＋ 首元への垂れ・ドレープ
          addPiece('Head', 'shell', 1.14 + v * 0.025, 1.08 + v * 0.025, 1.10 + v * 0.025, 0, 0.08);
          addPiece('Head', 'shell', 1.08 + v * 0.02, 0.85, 1.12, 0, -0.10, -0.12);
          addPiece('Head', 'cylinder', 1.16 + v * 0.03, 0.22, 1.16 + v * 0.03, 0, -0.22);
        } else if (p.shape === 'bandana') {
          // 頭布（バンダナ）: 額のバンド ＋ 後頭部の結び目と垂れ布
          addPiece('Head', 'cylinder', 1.09 + v * 0.02, 0.22, 1.09 + v * 0.02, 0, 0.16);
          addPiece('Head', 'box', 0.28, 0.18, 0.20, 0, 0.16, -0.56);
          addPiece('Head', 'panel', 0.32 + v * 0.05, 0.38 + v * 0.06, 0.04, 0, -0.08, -0.58, 0.85, 0, 0.15);
        } else if (p.shape === 'mask') {
          // 面当て: 鼻口を覆うマスクプレート ＋ 顎ガード ＋ 固定ストラップ
          addPiece('Head', 'box', 0.88 + v * 0.08, 0.36 + v * 0.04, 0.22, 0, -0.14, 0.48);
          addPiece('Head', 'box', 0.82 + v * 0.06, 0.14, 0.30, 0, -0.32, 0.38);
          addPiece('Head', 'cylinder', 1.06, 0.08, 1.06, 0, -0.12);
        } else if (p.shape === 'hb_veil') {
          // 砂避けの頭衣: 頭部シェル ＋ 前面の長いベール
          addPiece('Head', 'shell', 1.10 + v * 0.03, 1.06 + v * 0.02, 1.07 + v * 0.03, 0, 0.05);
          addPiece('Head', 'panel', 1.12 + v * 0.05, 0.30 + v * 0.04, 0.05, 0, -0.14, 0.5, 0.72);
        } else if (p.shape === 'leather_cap') {
          // 革の帽子: 丸いキャップ ＋ 前方に突き出す革のバイザー（つば） ＋ 帯
          addPiece('Head', 'shell', 1.12 + v * 0.02, 0.95 + v * 0.02, 1.10 + v * 0.02, 0, 0.15);
          addPiece('Head', 'box', 0.92 + v * 0.06, 0.06, 0.38 + v * 0.05, 0, 0.12, 0.58);
          addPiece('Head', 'cylinder', 1.10 + v * 0.02, 0.14, 1.10 + v * 0.02, 0, 0.14);
        } else if (p.shape === 'iron_helmet') {
          // 鉄の兜: 頑丈な半球ドーム ＋ 額のリベットバンド ＋ 短い鉄庇
          addPiece('Head', 'shell', 1.16 + v * 0.03, 1.05 + v * 0.03, 1.16 + v * 0.03, 0, 0.18);
          addPiece('Head', 'cylinder', 1.17 + v * 0.03, 0.14, 1.17 + v * 0.03, 0, 0.16);
          addPiece('Head', 'box', 0.98 + v * 0.06, 0.07, 0.25 + v * 0.04, 0, 0.16, 0.56);
        } else if (p.shape === 'bucket') {
          // 筒兜（バケツヘルム）: 直胴の無骨な円筒 ＋ 平らな天板 ＋ 視界十字スリット
          addPiece('Head', 'cylinder', 1.16 + v * 0.03, 0.72 + v * 0.04, 1.16 + v * 0.03, 0, 0.22);
          addPiece('Head', 'box', 1.14 + v * 0.03, 0.08, 1.14 + v * 0.03, 0, 0.58);
          addPiece('Head', 'box', 1.20 + v * 0.04, 0.12, 0.30, 0, 0.18, 0.52);
          addPiece('Head', 'box', 0.16, 0.55 + v * 0.04, 0.30, 0, 0.24, 0.52);
        } else if (p.shape === 'kabuto') {
          // 鍔付き兜: 鉄鉢 ＋ 幅広のしころ（首・肩覆い） ＋ 前立て立物
          addPiece('Head', 'shell', 1.15 + v * 0.03, 0.95, 1.15 + v * 0.03, 0, 0.22);
          addPiece('Head', 'cylinder', 1.60 + v * 0.10, 0.12, 1.50 + v * 0.10, 0, 0.15);
          addPiece('Head', 'box', 0.18, 0.38 + v * 0.08, 0.08, 0, 0.55, 0.54);
        } else if (p.shape === 'ha_crest_helm') {
          // 峰守の兜: 円筒鉢 ＋ バイザー ＋ 縦トサカクレスト
          addPiece('Head', 'cylinder', 1.14 + v * 0.03, 0.58 + v * 0.05, 1.14 + v * 0.03, 0, 0.30);
          addPiece('Head', 'box', 1.44 + v * 0.08, 0.10, 0.20 + v * 0.05, 0, 0.34);
          if (v >= 1) addPiece('Head', 'box', 0.14, 0.18, 1.28, 0, 0.36, 0, 0.82);
        } else {
          addPiece('Head', 'cylinder', 1.12, 0.65, 1.12, 0, 0.3);
        }
      } else if (p.slot.startsWith('upper')) {
        if (p.slot === 'upperOut') {
          addPiece('pelvis', 'cylinder', p.kind === 'armor' ? 1.16 : 1.04, .09, p.kind === 'armor' ? 1.16 : 1.04); // open thin waist ring
          if (p.shape === 'ha_sash_coat') {
            addPiece('pelvis', 'cylinder', 1.03 + v * .01, .10, 1.03 + v * .01, 0, .02);
            addPiece('spine_02', 'panel', .06 + v * .012, .46, .045, .12, .26, .42, .6, .35);
            addPiece('spine_02', 'cylinder', .78 + v * .02, .06, .78 + v * .02, 0, .58, 0, .58);
          }
          
          if (p.kind === 'armor') addPiece('spine_02', 'cylinder', .8, .16 + v * .035, .8, 0, .62); // gorget
        }
        if (visibleTop && p.kind !== 'armor') {
          // A short flared shirt tail and dark hem make the garment read beyond the skin silhouette.
          addPiece('spine_02', 'hemFlare', 1.08 + v * .025, .40, 1.08 + v * .025, 0, -.43);
          addPiece('spine_02', 'cuff', 1.10 + v * .025, .075, 1.10 + v * .025, 0, -.59, 0, .58);
          // Dark collar and overlapping front edges remain visible against the shirt.
          addPiece('spine_02', 'cylinder', .76, .07, .76, 0, .60, 0, .58);
          addPiece('spine_02', 'panel', .055, .45, .045, -.075, .30, .43, .52, -.30);
          addPiece('spine_02', 'panel', .055, .45, .045, .075, .30, .43, .52, .30);
        }
        if (p.kind === 'armor') {
          const bulky = p.shape === 'box' || p.shape === 'padded' || p.shape === 'plate';
          addPiece('spine_02', 'box', bulky ? 1.15 : 1.05, .9, bulky ? 1.18 : 1.05);
          if (p.shape === 'cape' || p.shape === 'poncho' || p.shape === 'robe' || p.shape === 'coat')
            addPiece('spine_02', 'box', 1.0, 1.4, .10, 0, -.35, -.1);
          if (p.shape === 'hb_ridged') {
            // 横に渡した鉄板の継ぎ目と、中央の補強板。
            addPiece('spine_02', 'panel', .92, .06 + v * .015, .06, 0, .30 + v * .03, .52, 1.06);
            addPiece('spine_02', 'panel', .92, .06 + v * .015, .06, 0, .10, .52, 1.06);
            addPiece('spine_02', 'panel', .07, .50 + v * .06, .05, 0, -.12, .52, .88);
          }
        }
        if (p.slot === 'upperOut' && p.kind === 'armor') {
          const bulky = p.shape === 'box' || p.shape === 'padded' || p.shape === 'plate';
          for (const side of ['l', 'r']) {
            addPiece('upperarm_' + side, 'shell', bulky ? 1.12 : 1.04, .32, 1.08, 0, .25);
            addPiece('lowerarm_' + side, 'cylinder', 1.15, .55, 1.15);
          }
        } else if (visibleTop && p.kind !== 'armor' && p.sleeve >= 1) {
          for (const side of ['l', 'r']) {
            if (p.sleeve >= 2) addPiece('lowerarm_' + side, 'cylinder', 1.08, .12, 1.08, 0, .10, 0, .58);
          }
        }
      } else if (p.slot.startsWith('lower') || p.slot === 'feet') {
        for (const side of ['l', 'r']) {
          const legBone = (p.slot === 'feet' ? 'foot_' : 'calf_') + side;
          if (visiblePants && p.kind !== 'armor' && p.slot !== 'feet') {
            // Tapered lower leg with a darker raised hem just above the ankle.
            addPiece(legBone, 'flare', 1.02, .72, 1.02, 0, -.18);
            addPiece(legBone, 'cuff', 1.08, .075, 1.08, 0, -.48, 0, .58);
            if (p.shape === 'hb_mudleg') {
              // 泥よけの重ね布: 裾に厚みを足し、variant で丈を変える。
              addPiece(legBone, 'cylinder', 1.07 + v * .01, .16 + v * .03, 1.07 + v * .01, 0, -.40, 0, .70);
            }
          } else if (p.slot === 'feet' && p.shape === 'ha_trail_boots') {
            addPiece(legBone, 'box', 1.04 + v * .02, .56 + v * .04, 1.24 + v * .04, 0, .02);
            addPiece(legBone, 'cylinder', 1.02 + v * .02, .09, 1.02 + v * .02, 0, .30, 0, .62);
          } else if (p.slot.startsWith('lower') && p.kind === 'armor' && p.shape === 'ha_lame_greaves') {
            addPiece(legBone, 'cylinder', 1.02 + v * .02, .62 + v * .05, 1.02 + v * .02);
            addPiece(legBone, 'cylinder', 1.08 + v * .02, .10, 1.08 + v * .02, 0, .30, 0, .6);
          } else addPiece(legBone, p.kind === 'armor' && p.slot !== 'feet' ? 'cylinder' : 'box', 1.06, .7, 1.06);
          if (p.shape === 'hb_sabaton') {
            // 鉄板を重ねた踏靴: 甲の板と足首の当て。
            addPiece(legBone, 'panel', 1.12 + v * .03, .20 + v * .03, .52, 0, -.28, .22, 1.02);
            addPiece(legBone, 'cylinder', 1.05, .12 + v * .02, 1.05, 0, .28, 0, .80);
          }
        }
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

  // 防具の源になっていない皮膚メッシュ（関節の部品）のうち、覆われた部位の頂点を
  // 骨の位置につぶして隠す。geometry は人形ごとの複製に差し替え、detach で元に戻す。
  function hideCoveredJoints(doll, plan) {
    restoreJoints(doll);
    const skip = doll.armorSrc ? doll.armorSrc.mesh : null;
    const targets = [];
    doll.root.traverse((o) => {
      if (!o.isSkinnedMesh || o === skip || o.userData.armor) return;
      if (!o.skeleton || !o.geometry || !o.geometry.attributes.skinIndex || !o.geometry.attributes.skinWeight) return;
      targets.push(o);
    });
    for (const mesh of targets) {
      const g = mesh.geometry;
      const info = regionsOf(g, mesh.skeleton.bones.map((b) => b.name));
      const pos = g.attributes.position;
      const si = g.attributes.skinIndex;
      const sw = g.attributes.skinWeight;
      const hide = new Uint8Array(pos.count);
      let any = false;
      for (let i = 0; i < pos.count; i++) {
        const rg = info.region[i];
        const y = pos.getY(i);
        for (const p of plan.pieces) {
          if (coversJoint(p, rg, y, info)) { hide[i] = 1; any = true; break; }
        }
      }
      if (!any) continue;
      const clone = g.clone();
      const cPos = clone.attributes.position;
      const cSi = clone.attributes.skinIndex;
      const cSw = clone.attributes.skinWeight;
      // 骨のバインド時の位置（スキンした先が骨のいまの位置に一致する点）。
      const origins = new Map();
      const inv = new THREE.Matrix4();
      const point = new THREE.Matrix4();
      for (let i = 0; i < pos.count; i++) {
        if (!hide[i]) continue;
        let best = 0;
        let bw = -1;
        for (let k = 0; k < 4; k++) {
          const w = sw.getComponent(i, k);
          if (w > bw) { bw = w; best = si.getComponent(i, k); }
        }
        let o = origins.get(best);
        if (!o) {
          inv.copy(mesh.skeleton.boneInverses[best]).invert();
          point.multiplyMatrices(mesh.bindMatrixInverse, inv);
          o = [point.elements[12], point.elements[13], point.elements[14]];
          origins.set(best, o);
        }
        cPos.setXYZ(i, o[0], o[1], o[2]);
        cSi.setXYZW(i, best, 0, 0, 0);
        cSw.setXYZW(i, 1, 0, 0, 0);
      }
      // Do not leave a face stretched between a collapsed joint vertex and
      // the still-visible vertices beside it. This is especially noticeable
      // when two armor layers cover different parts of the same joint mesh.
      const srcIndex = g.index;
      const faceIndices = srcIndex ? srcIndex.array : Array.from({ length: pos.count }, (_, i) => i);
      const keptFaces = [];
      for (let i = 0; i + 2 < faceIndices.length; i += 3) {
        const a = faceIndices[i], b = faceIndices[i + 1], c = faceIndices[i + 2];
        if (!hide[a] && !hide[b] && !hide[c]) keptFaces.push(a, b, c);
      }
      clone.setIndex(keptFaces);
      doll.jointHides = doll.jointHides || [];
      doll.jointHides.push({ mesh, orig: g, clone });
      mesh.geometry = clone;
    }
  }
  function restoreJoints(doll) {
    const hides = doll.jointHides;
    if (!hides) return;
    doll.jointHides = null;
    for (const h of hides) {
      h.mesh.geometry = h.orig;
      h.clone.dispose();
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
    // 覆われた部位の関節の部品は隠す（v4・フォールバックどちらの防具でものぞかないように）。
    hideCoveredJoints(doll, plan);
    // Cloth and leather use the close-fitting skin; fitbefore restores the earlier meshes.
    const before = typeof location !== 'undefined' && new URLSearchParams(location.search).get('fitbefore') === '1';
    const v4Plan = armorV4Plan(plan, before);
    const fitted = before ? [] : plan.pieces.filter(p => !v4Plan.pieces.includes(p));
    const missing = v4 ? [...fitted, ...v4.attach(doll, v4Plan, actor.state === 'dead', actor)] : plan.pieces;
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
    restoreJoints(doll);
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




