// 素材（地面テクスチャ・武器・小物の glb・人形の服）の読み込み計画と、置き方の計算。
// THREE を使わない純粋な関数だけを置く（node のテストで確かめられるように）。

export const GROUND_DIR = 'assets/ground/';
export const MODEL_DIR = 'assets/models/';
// 地面の素材。albedo は sRGB、normal は線形（OpenGL +Y）。
export const GROUND_SETS = ['sand', 'rocky', 'dirt_path', 'rock'];
export function groundFiles(dir) {
  const d = dir || GROUND_DIR;
  const out = {};
  for (const n of GROUND_SETS) {
    out[n + '_albedo'] = d + n + '_albedo.jpg';
    out[n + '_normal'] = d + n + '_normal.png';
  }
  return out;
}
// 1回目の glb（残してある。?models=1 でこれだけを使う）
export const MODEL_NAMES_R1 = [
  'crossbow_junk',
  'sword_guard',
  'cleaver_bandit',
  'bolt',
  'campfire',
  'lantern_hand',
  'street_lamp',
  'wall_adobe',
  'wall_door',
  'roof_flat',
];
// 2回目（*_r2）と3回目（katana_curved など）。種類を増やすため、古いものは消さずに並べて置く。
export const MODEL_NAMES_NEW = [
  'crossbow_junk_r2',
  'sword_guard_r2',
  'cleaver_bandit_r2',
  'bolt_r2',
  'campfire_r2',
  'lantern_hand_r2',
  'street_lamp_r2',
  'wall_adobe_r2',
  'wall_door_r2',
  'roof_flat_r2',
  'katana_curved',
  'cleaver_rust',
  'street_lamp_big',
  'wall_adobe_sand',
  'wall_door_sand',
  'wall_adobe_grey',
  'wall_door_grey',
];
// assets/models/ にあるはずの全部
export const MODEL_NAMES = [...MODEL_NAMES_R1, ...MODEL_NAMES_NEW];

// 役目 → 使う glb の候補（前から順に、読めたものを使う。最後は1回目の版）。
export const MODEL_ROLES = {
  crossbow: ['crossbow_junk_r2', 'crossbow_junk'],
  bolt: ['bolt_r2', 'bolt'],
  katana: ['katana_curved', 'sword_guard_r2', 'sword_guard'],
  cleaver_a: ['cleaver_rust', 'cleaver_bandit_r2', 'cleaver_bandit'],
  cleaver_b: ['cleaver_bandit_r2', 'cleaver_rust', 'cleaver_bandit'],
  campfire: ['campfire_r2', 'campfire'],
  lantern: ['lantern_hand_r2', 'lantern_hand'],
  lamp_a: ['street_lamp_big', 'street_lamp_r2', 'street_lamp'],
  lamp_b: ['street_lamp_r2', 'street_lamp'],
  wall_orange: ['wall_adobe_r2', 'wall_adobe'],
  door_orange: ['wall_door_r2', 'wall_door'],
  wall_sand: ['wall_adobe_sand', 'wall_adobe_r2', 'wall_adobe'],
  door_sand: ['wall_door_sand', 'wall_door_r2', 'wall_door'],
  wall_grey: ['wall_adobe_grey', 'wall_adobe_r2', 'wall_adobe'],
  door_grey: ['wall_door_grey', 'wall_door_r2', 'wall_door'],
  roof: ['roof_flat_r2', 'roof_flat'],
};
// 1回目だけの組（?models=1）
export const MODEL_ROLES_R1 = {
  crossbow: ['crossbow_junk'],
  bolt: ['bolt'],
  katana: ['sword_guard'],
  cleaver_a: ['cleaver_bandit'],
  cleaver_b: ['cleaver_bandit'],
  campfire: ['campfire'],
  lantern: ['lantern_hand'],
  lamp_a: ['street_lamp'],
  lamp_b: ['street_lamp'],
  wall_orange: ['wall_adobe'],
  door_orange: ['wall_door'],
  wall_sand: ['wall_adobe'],
  door_sand: ['wall_door'],
  wall_grey: ['wall_adobe'],
  door_grey: ['wall_door'],
  roof: ['roof_flat'],
};
export function modelRoles(param) {
  return param === '1' ? MODEL_ROLES_R1 : MODEL_ROLES;
}
// まず読む glb（各役目の1つ目）。
export function firstChoices(roles) {
  return [...new Set(Object.values(roles).map((c) => c[0]))];
}
// 1つ目が読めなかった役目のために、次に読む候補。
export function fallbackChoices(roles, loaded) {
  const out = new Set();
  for (const c of Object.values(roles)) {
    if (loaded[c[0]]) continue;
    for (const n of c.slice(1)) if (!(n in loaded)) out.add(n);
  }
  return [...out];
}
// 役目ごとに、読めた最初の候補を割り当てる（無ければ null → 従来の形）。
export function resolveRoles(roles, loaded) {
  const out = {};
  const names = {};
  for (const [role, cands] of Object.entries(roles)) {
    const n = cands.find((c) => loaded && loaded[c]);
    out[role] = n ? loaded[n] : null;
    names[role] = n || null;
  }
  return { models: out, names };
}

// 整数の簡単なハッシュ（決定的。sim の乱数は使わない）
export function hashInt(id, salt) {
  let h = (Number(id) | 0) ^ (salt | 0);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  return (h ^ (h >>> 16)) >>> 0;
}
// 0..n-1 のどれか（id ごとに決まる）
export function pickVariant(id, n, salt) {
  return n > 0 ? hashInt(id, salt || 0x2b1d) % n : 0;
}

// 武器の種類（sim の weapon 名）→ 手に持つ glb の役目。無いものは描かない（素手・噛みつき）。
// 盗賊の鉈は人ごとに2種類（錆びた鉈 / 2回目の鉈）。
// 21:xx サーベル・槌はまだ模型が無いので、刀・鉈の模型を代わりに持たせる（★仮。受けの型の確認用）
export const MELEE_ROLE = { sword: ['katana'], machete: ['cleaver_a', 'cleaver_b'], sabre: ['katana'], hammer: ['cleaver_a'], club: ['club'] };
export function meleeModelFor(weapon, id) {
  const list = MELEE_ROLE[weapon];
  if (!list) return null;
  return list[pickVariant(id, list.length, 0x6c1e)];
}
// 街灯の種類（灯りの id ごと）
export const LAMP_ROLES = ['lamp_a', 'lamp_b'];
export function lampRoleFor(id) {
  return LAMP_ROLES[pickVariant(id, LAMP_ROLES.length, 0x1a3b)];
}
// 小屋の壁の色（建物ごと）。橙（2回目）・砂色・灰色（3回目）。
export const WALL_COLORS = ['orange', 'sand', 'grey'];
export function wallColorFor(key) {
  return WALL_COLORS[pickVariant(key, WALL_COLORS.length, 0x7e57)];
}

// 人形の服テクスチャの置き場。
// 既定 → 5回目の顔（tex5 の肌）＋4回目の服（tex4）を assets/tex5/ に置いたもの。
// ?tex=4 → 4回目そのまま、?tex=3 → 3回目、?tex=2 → 2回目、?tex=0 → なし（勢力色）。
export function dollTexDir(param) {
  if (param === '0') return null;
  if (param === '2') return 'assets/tex/';
  if (param === '3') return 'assets/tex3/';
  if (param === '4') return 'assets/tex4/';
  return 'assets/tex5/';
}

// 名前→読み込み関数 の結果をまとめる。失敗したものは null（呼び出し側が予備の形で描く）。
// load(name) は Promise を返す。1つ失敗しても他は使う。
export async function loadEach(names, load) {
  const out = {};
  const results = await Promise.allSettled(names.map((n) => Promise.resolve().then(() => load(n))));
  names.forEach((n, i) => {
    const r = results[i];
    out[n] = r.status === 'fulfilled' && r.value ? r.value : null;
  });
  return out;
}

// 全部そろった時だけ使う組（例: 地面の8枚）。1枚でも欠けたら null。
export function allOrNull(map, names) {
  if (!map) return null;
  for (const n of names) if (!map[n]) return null;
  return map;
}

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
function smoothstep(a, b, v) {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
}

// 地面の素材の混ぜ具合。h: 高さ、slope: 1-法線Y、road: 道までの距離(m)、town: 町の中心へ 0..1、
// noise: 0..1 の大きなまだら。戻り値 [砂, 岩場, 踏み固めた土]（合計1）。
export function groundMix(h, slope, road, town, noise) {
  const n = Number.isFinite(noise) ? noise : 0.5;
  // 岩場: 急な斜面・高い所。まだらで境目を崩し、平地にも少し岩場の島を作る。
  let rocky = Math.max(smoothstep(0.1, 0.34, slope + (n - 0.5) * 0.12), smoothstep(3, 9, h + (n - 0.5) * 3));
  rocky = Math.max(rocky, smoothstep(0.68, 0.86, n) * 0.75);
  // 道（幅4m前後）と町の中
  const roadK = Number.isFinite(road) ? 1 - smoothstep(1.6, 4.2, road + (n - 0.5) * 1.2) : 0;
  const townK = clamp01(town || 0) * 0.85;
  let dirt = Math.max(roadK, townK);
  dirt *= 1 - rocky * 0.7;
  rocky *= 1 - dirt;
  let sand = Math.max(0, 1 - rocky - dirt);
  const sum = sand + rocky + dirt || 1;
  return [sand / sum, rocky / sum, dirt / sum];
}

// 町の建物（当たり判定の箱 w×d）を、2m の壁板と屋根板で組んだ小屋にする置き方。
// 壁の外面が箱の縁に来るよう、板の中心を厚みの半分 (WALL_HALF) だけ内側へ寄せる。
// 戻り値の座標は建物の中心からのずれ（回転なし。rot は板の向き）。
export const WALL_LEN = 2;
export const WALL_HALF = 0.13;
export const WALL_H = 2.6;
export function shackPieces(b, doorSide) {
  const out = [];
  const w = Math.max(2, b.w);
  const d = Math.max(2, b.d);
  const nx = Math.max(1, Math.round(w / WALL_LEN));
  const nz = Math.max(1, Math.round(d / WALL_LEN));
  const sx = w / (nx * WALL_LEN);
  const sz = d / (nz * WALL_LEN);
  const side = Number.isFinite(doorSide) ? ((doorSide % 4) + 4) % 4 : 0;
  // 0: +z 面、1: +x 面、2: -z 面、3: -x 面。板の正面（+z）を外へ向ける。
  const sides = [
    { n: nx, s: sx, len: w, ox: 0, oz: d / 2 - WALL_HALF, rot: 0, along: 'x' },
    { n: nz, s: sz, len: d, ox: w / 2 - WALL_HALF, oz: 0, rot: Math.PI / 2, along: 'z' },
    { n: nx, s: sx, len: w, ox: 0, oz: -(d / 2 - WALL_HALF), rot: Math.PI, along: 'x' },
    { n: nz, s: sz, len: d, ox: -(w / 2 - WALL_HALF), oz: 0, rot: -Math.PI / 2, along: 'z' },
  ];
  sides.forEach((sd, si) => {
    // 角で板が重なりすぎないよう、壁の長さは厚みぶん縮める
    const inner = (sd.len - WALL_HALF * 2) / sd.n;
    const doorAt = Math.floor(sd.n / 2);
    for (let i = 0; i < sd.n; i += 1) {
      const t = -sd.len / 2 + WALL_HALF + inner * (i + 0.5);
      const x = sd.along === 'x' ? t : sd.ox;
      const z = sd.along === 'x' ? sd.oz : t;
      out.push({
        type: si === side && i === doorAt ? 'door' : 'wall',
        x,
        z,
        rot: sd.rot,
        scaleX: inner / WALL_LEN,
      });
    }
  });
  // 屋根: 2m の板を1枚だけ、箱いっぱいに伸ばす（板の継ぎ目の格子を出さない）。
  // 模様（UV）は描画側で世界の座標から付け直すので、伸ばしても模様は伸びない。
  out.push({ type: 'roof', x: 0, z: 0, rot: 0, scaleX: w / WALL_LEN, scaleZ: d / WALL_LEN, edge: true });
  return out;
}

// 小屋の戸口を町の中心へ向ける面（0:+z 1:+x 2:-z 3:-x）。
export function doorSideToward(b, cx, cz) {
  const dx = cx - b.x;
  const dz = cz - b.z;
  if (Math.abs(dx) * b.d > Math.abs(dz) * b.w) return dx > 0 ? 1 : 3;
  return dz > 0 ? 0 : 2;
}

// テクスチャのおおよその GPU メモリ（RGBA8、ミップマップ込み ×4/3）。
export function textureBytes(w, h, mip) {
  return Math.round(w * h * 4 * (mip === false ? 1 : 4 / 3));
}

// 世界の座標から模様の座標（UV）を付け直す（屋根を伸ばしても模様が伸びないように）。
// 法線のいちばん大きい軸で投影する。rep: 1m あたりの繰り返し（素材は 0.67）。
export const WORLD_UV_REPEAT = 0.67;
export function worldUV(nx, ny, nz, x, y, z, rep) {
  const r = Number.isFinite(rep) ? rep : WORLD_UV_REPEAT;
  const ax = Math.abs(nx);
  const ay = Math.abs(ny);
  const az = Math.abs(nz);
  if (ay >= ax && ay >= az) return [x * r, z * r];
  if (ax >= az) return [z * r, y * r];
  return [x * r, y * r];
}
