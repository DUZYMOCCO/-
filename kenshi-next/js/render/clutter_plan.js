// 小物（木箱・樽・椅子など、tex_props_cx1 の色付き glb）の置き場所の計算。THREE を使わない純粋な関数。
// 見た目だけ（当たり判定は無い）。sim の乱数は使わず、建物の位置から hashInt で決める。
import { hashInt, doorSideToward } from './asset_plan.js';

// 役目 → glb（assets/models/props/ に置く）
export const PROP_DIR = 'assets/models/props/';
export const PROP_MODELS = {
  crate: 'wooden_crate_tex',
  open_crate: 'open_crate_tex',
  table: 'table_tex',
  bench: 'bench_tex',
  stool: 'stool_v2_tex',
  bucket: 'bucket_tex',
  barrel: 'barrel_v3_tex',
  barrel_stack: 'barrel_stack_v2_tex',
  cart_wheel: 'broken_cart_wheel_tex',
  fence: 'wooden_fence_tex',
  rubble: 'rubble_pile_v3_tex',
  rock: 'rock_c_v2_tex',
};
export const PROP_NAMES = Object.values(PROP_MODELS);
// 人食い・グールの棍棒（box で作った仮の形。sim の武器 'club'）
export const CLUB_MODEL = 'club_bone';
// 柵の glb 1枚の長さ（m）
export const FENCE_LEN = 1.96;

// 町の小屋の壁ぎわに置く組（1つの壁に横並び）。★仮の組み合わせ
const TOWN_SETS = [
  ['barrel', 'crate', 'bucket'],
  ['bench', 'stool'],
  ['table', 'stool', 'stool'],
  ['barrel_stack', 'crate'],
  ['open_crate', 'crate', 'barrel'],
  ['cart_wheel', 'bucket'],
];
// 小物のおおよその幅（m、並べる間隔用）
const WIDTH = {
  crate: 0.75, open_crate: 0.8, table: 1.4, bench: 1.3, stool: 0.45, bucket: 0.45,
  barrel: 0.7, barrel_stack: 1.45, cart_wheel: 0.9, rubble: 1.5, rock: 2.0,
};
const DEPTH = {
  crate: 0.75, open_crate: 0.6, table: 0.8, bench: 0.35, stool: 0.4, bucket: 0.4,
  barrel: 0.7, barrel_stack: 1.3, cart_wheel: 0.4, rubble: 1.4, rock: 1.5,
};
export function propWidth(role) {
  return WIDTH[role] || 0.8;
}

function rnd(seed, k) {
  return (hashInt(seed, 0x51ed + k * 977) % 10000) / 10000;
}

function insideAny(boxes, x, z, pad) {
  for (const b of boxes) {
    if (Math.abs(x - b.x) < b.w / 2 + pad && Math.abs(z - b.z) < b.d / 2 + pad) return true;
  }
  return false;
}

// 壁ぎわ（side 0:+z 1:+x 2:-z 3:-x）に roles を横並びにする。
function alongWall(b, side, roles, seed, out, boxes) {
  const alongX = side === 0 || side === 2;
  const len = alongX ? b.w : b.d;
  const total = roles.reduce((s, r) => s + propWidth(r) + 0.15, 0);
  if (total > len - 0.6) roles = roles.slice(0, 1);
  let t = -len / 2 + 0.4 + rnd(seed, 1) * Math.max(0, len - 0.8 - total);
  const sign = side === 0 || side === 1 ? 1 : -1;
  const faceRot = [0, Math.PI / 2, Math.PI, -Math.PI / 2][side];
  for (const role of roles) {
    const w = propWidth(role);
    const off = (alongX ? b.d : b.w) / 2 + (DEPTH[role] || 0.6) / 2 + 0.12;
    const u = t + w / 2;
    const x = alongX ? b.x + u : b.x + sign * off;
    const z = alongX ? b.z + sign * off : b.z + u;
    t += w + 0.15;
    if (insideAny(boxes, x, z, 0.2)) continue;
    // 長い物（長椅子・机・荷車の輪）は壁に沿わせる。丸い物は少し回す。
    const jitter = (rnd(seed, out.length + 7) - 0.5) * 0.5;
    const rot = role === 'bench' || role === 'table' || role === 'cart_wheel' ? faceRot : faceRot + jitter * 3;
    out.push({ role, x: round(x), z: round(z), rot: round(rot), scale: 1, tilt: role === 'cart_wheel' ? 1 : 0 });
  }
}

function round(v) {
  return Math.round(v * 1000) / 1000;
}

// state から小物の一覧 [{ role, x, z, rot, scale, tilt }] を作る。
export function planClutter(state) {
  const out = [];
  const buildings = (state && state.buildings) || [];
  const boxes = buildings.map((b) => ({ x: b.x, z: b.z, w: b.w, d: b.d }));
  const places = (state && state.places) || {};
  const towns = [places.town1, places.town2].filter(Boolean);
  // 町の小屋: 戸口の横の壁と、裏の壁に1組ずつ（建物ごとに決まる）
  buildings.forEach((b) => {
    if (b.kind !== 'town') return;
    const seed = Math.round(b.x * 7) * 131 + Math.round(b.z * 7);
    const town = towns.slice().sort((a, c) => Math.hypot(b.x - a.x, b.z - a.z) - Math.hypot(b.x - c.x, b.z - c.z))[0];
    const door = town ? doorSideToward(b, town.x, town.z) : 0;
    const sides = [(door + 1) % 4, (door + 3) % 4, (door + 2) % 4];
    const nSets = 1 + (hashInt(seed, 0x77) % 2);
    for (let k = 0; k < nSets; k += 1) {
      const set = TOWN_SETS[hashInt(seed, 0x91 + k) % TOWN_SETS.length];
      alongWall(b, sides[(hashInt(seed, 0x33) + k) % 3], set.slice(), seed + k * 17, out, boxes);
    }
  });
  // 根城の小屋: 樽・木箱を多めに
  buildings.forEach((b) => {
    if (b.kind !== 'camp') return;
    const seed = Math.round(b.x * 7) * 131 + Math.round(b.z * 7) + 5;
    alongWall(b, 0, ['barrel_stack', 'crate', 'open_crate'], seed, out, boxes);
    alongWall(b, 2, ['barrel', 'bucket', 'cart_wheel'], seed + 3, out, boxes);
    alongWall(b, 1, ['table', 'stool', 'stool'], seed + 9, out, boxes);
  });
  // 廃墟: 横に瓦礫の山、ときどき岩
  const props = (state && state.props) || [];
  props.forEach((p, i) => {
    if (!p || p.kind !== 'ruin') return;
    const seed = Math.round(p.x * 7) * 131 + Math.round(p.z * 7) + 11;
    const ang = rnd(seed, 2) * Math.PI * 2;
    const r = Math.hypot(p.w, p.d) / 2 + 0.6;
    out.push({ role: 'rubble', x: round(p.x + Math.cos(ang) * r), z: round(p.z + Math.sin(ang) * r), rot: round(rnd(seed, 3) * 6.28), scale: round(0.9 + rnd(seed, 4) * 0.6), tilt: 0 });
    if (i % 3 === 0) {
      const a2 = ang + 2 + rnd(seed, 5);
      out.push({ role: 'rock', x: round(p.x + Math.cos(a2) * (r + 0.4)), z: round(p.z + Math.sin(a2) * (r + 0.4)), rot: round(rnd(seed, 6) * 6.28), scale: round(0.7 + rnd(seed, 7) * 0.5), tilt: 0 });
    }
  });
  return out;
}

// 柵の箱（sim の 'fence'、x 向き w=4）を glb の板で埋める置き方。
export function planFences(state) {
  const out = [];
  for (const b of (state && state.buildings) || []) {
    if (b.kind !== 'fence') continue;
    const n = Math.max(1, Math.round(b.w / FENCE_LEN));
    const sx = b.w / (n * FENCE_LEN);
    for (let i = 0; i < n; i += 1) {
      const x = b.x - b.w / 2 + (i + 0.5) * (b.w / n);
      out.push({ role: 'fence', x: round(x), z: b.z, rot: 0, scale: 1, scaleX: round(sx), tilt: 0 });
    }
  }
  return out;
}

// 出現の野営地の周りに置く小物（site.id と位置から決まる）。中心からの相対座標。
export function planSiteClutter(site) {
  if (!site || site.kind !== 'camp') return [];
  let seed = Math.round(site.x * 7) * 131 + Math.round(site.z * 7);
  for (const ch of String(site.id)) seed = (seed * 31 + ch.charCodeAt(0)) | 0;
  const roles = site.type === 'thief_camp' ? ['crate', 'barrel', 'stool'] : site.type === 'cannibal_camp' ? ['barrel', 'bucket', 'open_crate', 'cart_wheel'] : ['crate', 'open_crate', 'barrel', 'barrel_stack', 'stool'];
  return roles.map((role, k) => {
    const ang = rnd(seed, 20 + k) * Math.PI * 2;
    const d = 9.2 + rnd(seed, 40 + k) * 1.2; // 天幕（6〜8.5m）の外、見張りの杭（11m）の内
    return { role, x: round(Math.cos(ang) * d), z: round(Math.sin(ang) * d), rot: round(rnd(seed, 60 + k) * 6.28), scale: 1, tilt: role === 'cart_wheel' ? 1 : 0 };
  });
}

// 人食いの集落の小物（assets/nest/、Gemini の平らな色の低ポリ glb。Y が上、底が原点、m 単位）。
export const NEST_DIR = 'assets/nest/';
export const NEST_NAMES = [
  'prisoner_pole',
  'iron_cage',
  'wooden_cage',
  'bone_pile',
  'cooking_pit',
  'skull_totem',
  'drying_rack',
  'butcher_table',
  'hide_tent',
];

// 人食いの集落の置き場所（野営地の中心からの相対）。杭は sim の site.poles（abduct.js）に合わせる。
// 焚き火の場所に調理の穴、杭の外側に骨の山・檻・干し台、入口の頭骨の柱。
export function planNestProps(site) {
  if (!site || site.type !== 'cannibal_camp') return [];
  let seed = Math.round(site.x * 7) * 131 + Math.round(site.z * 7);
  for (const ch of String(site.id)) seed = (seed * 31 + ch.charCodeAt(0)) | 0;
  const out = [];
  for (const p of site.poles || []) {
    const x = round(p.x - site.x);
    const z = round(p.z - site.z);
    out.push({ role: 'prisoner_pole', x, z, rot: round(Math.atan2(-x, -z)) }); // 中心を向く
  }
  out.push({ role: 'cooking_pit', x: 0, z: 0, rot: 0 });
  const ring = ['bone_pile', 'iron_cage', 'wooden_cage', 'drying_rack', 'butcher_table', 'bone_pile'];
  const base = rnd(seed, 90) * Math.PI * 2;
  ring.forEach((role, k) => {
    const ang = base + (k / ring.length) * Math.PI * 2 + rnd(seed, 91 + k) * 0.3;
    const d = role === 'butcher_table' ? 2.6 : 9.6 + rnd(seed, 100 + k) * 0.8;
    out.push({ role, x: round(Math.cos(ang) * d), z: round(Math.sin(ang) * d), rot: round(rnd(seed, 110 + k) * 6.28) });
  });
  for (const side of [-1, 1]) {
    out.push({ role: 'skull_totem', x: round(12.2), z: round(side * 1.6), rot: Math.PI / 2 });
  }
  return out;
}

// nest の glb は書き出しで色が抜けている（全部 0.8 の灰色）ので、材質の名前で色を付け直す。
// 値は作った時の Blender の Base Color（線形）。金属感は環境マップが無いと黒くなるので弱める。
export const NEST_COLORS = {
  M_WoodDark: [0.16, 0.11, 0.07],
  M_WoodLight: [0.32, 0.24, 0.16],
  M_WoodWorn: [0.24, 0.2, 0.16],
  M_Iron: [0.12, 0.12, 0.13],
  M_IronRust: [0.22, 0.13, 0.09],
  M_Rope: [0.46, 0.38, 0.24],
  M_Bone: [0.74, 0.7, 0.6],
  M_BoneDark: [0.5, 0.45, 0.36],
  M_Blood: [0.22, 0.02, 0.02],
  M_BloodFresh: [0.45, 0.03, 0.03],
  M_Meat: [0.32, 0.09, 0.07],
  M_Stone: [0.32, 0.28, 0.24],
  M_StoneDark: [0.18, 0.16, 0.15],
  M_Ash: [0.07, 0.07, 0.07],
  M_HideTan: [0.45, 0.34, 0.22],
  M_HidePale: [0.58, 0.5, 0.4],
  M_HideDark: [0.24, 0.16, 0.11],
  M_Cloth: [0.38, 0.32, 0.25],
};
