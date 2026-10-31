import { equipFactionArmor } from './faction_armor.js';
// 町の入れる小屋（bldg1）: 壁と戸口・扉・家具・寝台・住人の居場所・扉を通る道。
// 見た目の板の並び（render/asset_plan.js の shackPieces）と同じ寸法で、当たり判定と戸口を作る。
// 町は opts.town の時だけ（既定の世界は前と同じ）。乱数は使わず、建物の位置からのハッシュだけで決める。

import { DAY_SEC, makeEvent, setAnim } from './data.js';
import { WALL_HALF, WALL_LEN, doorSideToward } from '../render/asset_plan.js';
import { makeActor } from './world.js';
import { startRest, stopRest } from './rest.js';

export const DOOR_REACH = 1.6; // m（扉に手が届く距離）
export const DOOR_CLOSE_TICKS = 30; // NPC が開けた扉は、戸口が空いて 3秒（30tick）で閉まる
const WALL_T = WALL_HALF * 2; // 壁の厚み 0.26m
const GAP_PAD = 0.15; // 戸口の当たりは、見た目の開口より片側 0.15m 広く（狭い戸口で詰まらないように）
// ★ 錠の強さ（ここで決めた値。Kenshi の値ではない）
export const LOCK_LEVEL = { home: 15, shop: 25, post: 40 };
export const BOX_LOCK = { home: [10, 25], shop: [20, 35], post: [45, 45] };
const GOOD_POOL = ['grain', 'water', 'dried_meat', 'salt', 'cotton', 'cloth', 'scrap', 'iron', 'parts', 'cactus_rum', 'herbs', 'luxury'];

// ---- ハッシュ（乱数の列を変えない） ----
export function th(...parts) {
  let h = 2166136261 >>> 0;
  for (const p of parts) {
    const s = String(p);
    for (let i = 0; i < s.length; i += 1) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    h ^= 0x2f;
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

export function hourOf(state) {
  const t = (((state.timeSec || 0) % DAY_SEC) + DAY_SEC) % DAY_SEC;
  return t / 3600;
}
// 店は 20:00〜7:00 閉まる。家は 21:00〜6:00 に鍵。寝るのは 22:00〜6:00。
export function shopClosed(state) {
  const h = hourOf(state);
  return h >= 20 || h < 7;
}
export function homeNight(state) {
  const h = hourOf(state);
  return h >= 21 || h < 6;
}
function sleepTime(state) {
  const h = hourOf(state);
  return h >= 22 || h < 6;
}

// ---- 形 ----
const NORMALS = [
  { x: 0, z: 1 },
  { x: 1, z: 0 },
  { x: 0, z: -1 },
  { x: -1, z: 0 },
];

// 戸口の寸法（shackPieces と同じ式）。ローカルの u は戸口の壁に沿う向き、n は外向き。
export function doorGeometry(b, side) {
  const w = Math.max(2, b.w);
  const d = Math.max(2, b.d);
  const along = side === 0 || side === 2 ? 'x' : 'z';
  const len = along === 'x' ? w : d;
  const depth = along === 'x' ? d : w;
  const n = Math.max(1, Math.round(len / WALL_LEN));
  const inner = (len - WALL_HALF * 2) / n;
  const doorAt = Math.floor(n / 2);
  const t = -len / 2 + WALL_HALF + inner * (doorAt + 0.5);
  const nv = NORMALS[side];
  const u = along === 'x' ? { x: 1, z: 0 } : { x: 0, z: 1 };
  const off = depth / 2 - WALL_HALF;
  const cx = b.x + u.x * t + nv.x * off;
  const cz = b.z + u.z * t + nv.z * off;
  const opening = inner / WALL_LEN; // glb の開口は 2m の板のうち 1m
  return {
    x: r3(cx),
    z: r3(cz),
    ux: u.x,
    uz: u.z,
    nx: nv.x,
    nz: nv.z,
    a: r3(t), // 戸口の中心（壁に沿った位置）
    len,
    depth,
    opening: r3(opening),
    half: r3(opening / 2 + GAP_PAD),
    pieceScale: r3(inner / WALL_LEN),
  };
}

function r3(v) {
  return Math.round(v * 1000) / 1000;
}

// 壁4枚（戸口の面は2つに割る）と扉の箱（閉じている時だけ当たる）
function wallBoxes(b, side, door) {
  const out = [];
  const hw = b.w / 2;
  const hd = b.d / 2;
  for (let s = 0; s < 4; s += 1) {
    const nv = NORMALS[s];
    const alongX = s === 0 || s === 2;
    const cx = b.x + nv.x * (hw - WALL_HALF);
    const cz = b.z + nv.z * (hd - WALL_HALF);
    if (s !== side) {
      out.push(alongX ? { x: r3(b.x), z: r3(cz), hw: r3(hw), hd: WALL_HALF } : { x: r3(cx), z: r3(b.z), hw: WALL_HALF, hd: r3(hd) });
      continue;
    }
    const L = alongX ? b.w : b.d;
    const lo = -L / 2;
    const hi = L / 2;
    const g0 = door.a - door.half;
    const g1 = door.a + door.half;
    const segs = [
      [lo, g0],
      [g1, hi],
    ];
    for (const [p, q] of segs) {
      if (q - p < 0.05) continue;
      const mid = (p + q) / 2;
      const half = (q - p) / 2;
      if (alongX) out.push({ x: r3(b.x + mid), z: r3(cz), hw: r3(half), hd: WALL_HALF });
      else out.push({ x: r3(cx), z: r3(b.z + mid), hw: WALL_HALF, hd: r3(half) });
    }
  }
  return out;
}

function overlaps(a, b, pad) {
  return Math.abs(a.x - b.x) < (a.w + b.w) / 2 + pad && Math.abs(a.z - b.z) < (a.d + b.d) / 2 + pad;
}

// ローカル（a: 壁沿い, v: 戸口の壁の内面から奥へ）→ 世界
export function localToWorld(h, a, v) {
  const off = h.depth / 2 - WALL_T - v;
  return { x: r3(h.x + h.ux * a + h.nx * off), z: r3(h.z + h.uz * a + h.nz * off) };
}

// ---- 家具の並び ----
function layout(h, type, seed) {
  const hu = h.len / 2 - WALL_T;
  const dv = h.depth - WALL_T * 2;
  const s = th(seed, 'side') < 0.5 ? -1 : 1;
  const faceIn = Math.atan2(-h.nx, -h.nz);
  const faceOut = Math.atan2(h.nx, h.nz);
  const alongU = Math.atan2(h.ux, h.uz);
  const items = [];
  const add = (role, a, v, rot, extra) => items.push({ role, a, v, rot, ...(extra || {}) });
  if (type === 'home') {
    add('bed', s * (hu - 0.55), dv - 1.0, faceOut);
    add('chest', -s * (hu - 0.45), dv - 0.45, faceIn, { box: true });
    add('table', -s * (hu - 1.3), dv * 0.5, alongU);
    add('stool', -s * (hu - 0.5), dv * 0.5, alongU);
    add('barrel', s * (hu - 0.4), 0.45, 0);
  } else if (type === 'shop') {
    add('table', 0, dv * 0.42, alongU, { counter: true });
    add('chest', -(hu - 0.45), dv - 0.45, faceIn, { box: true });
    add('chest', hu - 0.45, dv - 0.45, faceIn, { box: true });
    add('display', h.a + (h.a > 0 ? -1.3 : 1.3), 0.6, faceIn, { box: true, display: true });
    add('barrel_stack', (h.a > 0 ? -1 : 1) * -(hu - 0.5), 0.55, 0);
    add('bed', 0, dv - 0.6, alongU);
  } else {
    add('bed', -(hu - 0.55), dv - 1.0, faceOut);
    add('bed', hu - 0.55, dv - 1.0, faceOut);
    add('chest', 0, dv - 0.45, faceIn, { box: true });
    add('bench', s * (hu - 0.45), dv * 0.4, alongU === 0 ? Math.PI / 2 : 0);
    add('table', -s * (hu - 1.1), dv * 0.35, alongU);
  }
  const kept = [];
  for (const it of items) {
    if (Math.abs(it.a) > hu - 0.25 || it.v < 0.3 || it.v > dv - 0.25) continue;
    // 戸口の前（幅 ±0.9m、奥行 1.5m）はあける
    if (it.v < 1.5 && Math.abs(it.a - h.a) < 0.9 && !it.display) continue;
    if (it.display && Math.abs(it.a - h.a) < 0.75) continue;
    if (kept.some((k) => Math.hypot(k.a - it.a, k.v - it.v) < 0.9)) continue;
    kept.push(it);
  }
  return kept;
}

function stockFor(type, seed) {
  const goods = {};
  const kinds = type === 'shop' ? 3 : type === 'post' ? 2 : 1 + Math.floor(th(seed, 'k') * 2);
  const pool = type === 'post' ? ['iron', 'parts', 'dried_meat', 'water'] : GOOD_POOL;
  for (let i = 0; i < kinds; i += 1) {
    const g = pool[Math.floor(th(seed, 'g', i) * pool.length)];
    goods[g] = (goods[g] || 0) + 1 + Math.floor(th(seed, 'n', i) * (type === 'shop' ? 4 : 2));
  }
  const cashRange = type === 'shop' ? [60, 220] : type === 'post' ? [100, 300] : [15, 80];
  const cash = Math.round(cashRange[0] + th(seed, 'c') * (cashRange[1] - cashRange[0]));
  return { goods, cash };
}

// ---- 町を作る ----
export function initTown(state) {
  if (!state || state.town) return state ? state.town : null;
  const places = state.places || {};
  const towns = [places.town1, places.town2].filter(Boolean);
  const town = { houses: [], boxes: [], banned: {}, v: 1 };
  state.town = town;
  const blds = state.buildings || [];
  const counts = {};
  blds.forEach((b, i) => {
    if (b.kind !== 'town') return;
    if (b.w < 4 || b.d < 4) return;
    // 他の建物と重なる小屋は入れない（前のまま塞がった箱）
    if (blds.some((o, j) => j !== i && o.kind !== 'fence' && overlaps(b, o, 0.6))) return;
    const near = towns.slice().sort((p, q) => Math.hypot(b.x - p.x, b.z - p.z) - Math.hypot(b.x - q.x, b.z - q.z))[0];
    if (!near) return;
    const side = doorSideToward(b, near.x, near.z);
    const g = doorGeometry(b, side);
    const id = 'h' + town.houses.length;
    counts[near.id] = (counts[near.id] || 0) + 1;
    town.houses.push({
      id,
      b: i,
      town: near.id,
      x: b.x,
      z: b.z,
      w: b.w,
      d: b.d,
      side,
      len: g.len,
      depth: g.depth,
      a: g.a,
      ux: g.ux,
      uz: g.uz,
      nx: g.nx,
      nz: g.nz,
      type: 'home',
      door: { x: g.x, z: g.z, ux: g.ux, uz: g.uz, nx: g.nx, nz: g.nz, half: g.half, opening: g.opening, open: false, locked: false, lock: 15, closeAt: 0, auto: false, policy: null },
      walls: wallBoxes(b, side, { a: g.a, half: g.half }),
      boxes: [],
      beds: [],
      furn: [],
    });
  });
  // 町ごとに 店1・番所1（宿場は入れる小屋が3つ以上の時だけ番所）。残りは家。
  for (const t of towns) {
    const list = town.houses.filter((h) => h.town === t.id).sort((p, q) => Math.hypot(p.x - t.x, p.z - t.z) - Math.hypot(q.x - t.x, q.z - t.z));
    if (list.length >= 1) list[0].type = 'shop';
    if (list.length >= (t.id === 'town1' ? 2 : 3)) list[list.length - 1].type = 'post';
  }
  for (const h of town.houses) {
    h.door.lock = LOCK_LEVEL[h.type];
    const seed = h.id + ':' + Math.round(h.x * 10) + ':' + Math.round(h.z * 10);
    const items = layout(h, h.type, seed);
    let bi = 0;
    let ki = 0;
    for (const it of items) {
      const p = localToWorld(h, it.a, it.v);
      if (it.role === 'bed') {
        const bed = { id: 'bed_' + h.id + '_' + bi, kind: 'bed', x: p.x, z: p.z, rot: r3(it.rot), house: h.id };
        bi += 1;
        state.bedrolls.push(bed);
        h.beds.push(bed.id);
        continue;
      }
      const f = { role: it.role === 'chest' ? 'crate' : it.role === 'display' ? 'open_crate' : it.role, x: p.x, z: p.z, rot: r3(it.rot) };
      if (it.counter) {
        f.counter = true;
        h.counter = localToWorld(h, it.a, it.v + 0.95);
      }
      if (it.role === 'table' && !it.counter) h.table = localToWorld(h, it.a, it.v - 0.8);
      h.furn.push(f);
      if (it.box) {
        const range = BOX_LOCK[h.type];
        const lock = it.display ? 0 : Math.round(range[0] + th(seed, 'lock', ki) * (range[1] - range[0]));
        const stock = stockFor(it.display ? 'home' : h.type, seed + ':' + ki);
        const box = {
          id: 'box_' + h.id + '_' + ki,
          house: h.id,
          x: p.x,
          z: p.z,
          kind: it.display ? 'display' : 'chest',
          lock,
          locked: lock > 0,
          goods: stock.goods,
          cash: it.display ? 0 : stock.cash,
        };
        ki += 1;
        town.boxes.push(box);
        h.boxes.push(box.id);
      }
    }
    if (!h.counter) h.counter = localToWorld(h, 0, 1.6);
    if (!h.table) h.table = localToWorld(h, 0, Math.max(1.4, (h.depth - WALL_T * 2) * 0.5));
    h.door.locked = doorPolicy(state, h);
    h.door.policy = h.door.locked;
  }
  // 住人: 店主1・家に1人・番所に衛兵2人。乱数の列は変えない（前後で rngState を戻す）
  const saved = state.rngState;
  for (const h of town.houses) {
    const jobs = h.type === 'shop' ? ['shopkeeper'] : h.type === 'post' ? ['post_guard', 'post_guard'] : ['resident'];
    jobs.forEach((job, k) => {
      const p = job === 'shopkeeper' ? h.counter : localToWorld(h, (k - 0.5) * 1.2, 1.4);
      const a = makeActor(state, 'guard', p.x, p.z, null, false);
      a.home = h.id;
      a.job = job;
      if (job === 'shopkeeper') a.gearStock = ['light_crossbow','guard_cuirass','field_katana','heavy_greaves'].map((id, i) => ({ id, rank: 3, n: 1, variant: Math.abs((a.id | 0) + i) % 3 }));
      a.townId = h.town;
      a.state = 'idle';
      a.civil = job !== 'post_guard';
      equipFactionArmor(a);
      a.title = job === 'shopkeeper' ? '店主' : job === 'resident' ? '住人' : '番所の衛兵';
      if (a.civil) {
        for (const key of Object.keys(a.skills || {})) {
          if (key === 'toughness' || typeof a.skills[key] !== 'number') continue;
          a.skills[key] = Math.round(a.skills[key] * 0.4 * 10) / 10;
        }
        a.money = Math.round(30 + th(h.id, k, 'money') * 120);
      }
    });
  }
  state.rngState = saved;
  return town;
}

// 買った区画用の標準住宅。既存の house/door/box 経路をそのまま使う。
export function createOwnedHouse(state, lot, id) {
  const town = ensureTown(state);
  if (!town || !lot || typeof id !== 'string') return null;
  const building = { kind: 'town', x: lot.x, z: lot.z, w: lot.w || 6, d: lot.d || lot.w || 6, h: 4 };
  const nearest = (state.places && Object.values(state.places).filter(p => p && Number.isFinite(p.x)).sort((a,b)=>Math.hypot(building.x-a.x,building.z-a.z)-Math.hypot(building.x-b.x,building.z-b.z))[0]) || { x: lot.x, z: lot.z + 1 };
  const side = doorSideToward(building, nearest.x, nearest.z);
  const g = doorGeometry(building, side);
  const bIndex = (state.buildings || []).length;
  state.buildings ||= [];
  state.buildings.push(building);
  const marketTown = lot.marketId || (lot.townId === 'koba_town' ? 'town1' : lot.townId);
  const h = {
    id, b: bIndex, town: marketTown, settlement: lot.townId, x: building.x, z: building.z,
    w: building.w, d: building.d, side, len: g.len, depth: g.depth, a: g.a,
    ux: g.ux, uz: g.uz, nx: g.nx, nz: g.nz, type: 'home', owner: 'player', lot: lot.id, public: false,
    door: { x:g.x,z:g.z,ux:g.ux,uz:g.uz,nx:g.nx,nz:g.nz,half:g.half,opening:g.opening,open:false,locked:false,lock:LOCK_LEVEL.home,closeAt:0,auto:false,policy:null },
    walls: wallBoxes(building, side, { a:g.a, half:g.half }), boxes:[], beds:[], furn:[],
  };
  h.counter = localToWorld(h, 0, 1.6);
  h.table = localToWorld(h, 0, Math.max(1.4, (h.depth - WALL_T * 2) * 0.5));
  const boxPos = localToWorld(h, -h.len * 0.25, h.depth * 0.65);
  const box = { id:`box_${id}_0`, house:id, x:boxPos.x, z:boxPos.z, kind:'chest', lock:0, locked:false, goods:{}, cash:0 };
  town.houses.push(h); town.boxes.push(box); h.boxes.push(box.id);
  h.furn.push({ role:'bed', x:localToWorld(h, h.len * 0.25, h.depth * 0.7).x, z:localToWorld(h, h.len * 0.25, h.depth * 0.7).z, rot:0 });
  h.furn.push({ role:'table', x:h.table.x, z:h.table.z, rot:0 });
  state.bedrolls ||= [];
  state.bedrollSeq = (state.bedrollSeq || 0) + 1;
  const bed = { id:`bed_${id}_0`, kind:'bed', x:h.furn[0].x, z:h.furn[0].z, rot:0, house:id };
  state.bedrolls.push(bed); h.beds.push(bed.id);
  town.v = (town.v || 0) + 1;
  return h;
}

// 古いセーブ・町なしの世界に後から町を足す
export function ensureTown(state) {
  if (!state) return null;
  if (!state.town) initTown(state);
  return state.town;
}

export function houseById(state, id) {
  const t = state && state.town;
  if (!t) return null;
  for (const h of t.houses) if (h.id === id) return h;
  return null;
}

export function boxById(state, id) {
  const t = state && state.town;
  if (!t) return null;
  for (const b of t.boxes) if (b.id === id) return b;
  return null;
}

// 中にいる小屋（内壁より内側）
export function houseAt(state, x, z, pad = 0) {
  const t = state && state.town;
  if (!t) return null;
  for (const h of t.houses) {
    if (Math.abs(x - h.x) < h.w / 2 - WALL_T + pad && Math.abs(z - h.z) < h.d / 2 - WALL_T + pad) return h;
  }
  return null;
}

// 戸口に対する位置（s: 壁沿い、q: 外向き。0 が壁の中心）
export function doorLocal(h, x, z) {
  const dx = x - h.door.x;
  const dz = z - h.door.z;
  return { s: dx * h.ux + dz * h.uz, q: dx * h.nx + dz * h.nz };
}

export function doorPoint(h, q) {
  return { x: h.door.x + h.nx * q, z: h.door.z + h.nz * q };
}

// 戸口の中（敷居の上）
function inDoorway(h, x, z) {
  const l = doorLocal(h, x, z);
  return Math.abs(l.s) < h.door.half + 0.1 && Math.abs(l.q) <= WALL_HALF + 0.35;
}

export function doorPolicy(state, h) {
  if (h.owner === 'player') return false;
  if (h.type === 'post') return true;
  if (h.type === 'shop') return shopClosed(state);
  return homeNight(state);
}

// 鍵を持つ者: その家の住人、町の衛兵（番所・見回り）
export function hasKey(actor, h) {
  if (!actor || !h) return false;
  if (h.owner === 'player' && actor.faction === 'player') return true;
  if (actor.home === h.id) return true;
  return actor.faction === 'guard' && !actor.civil;
}

export function isPublic(state, h) {
  if (h.owner === 'player') return h.public === true && !shopClosed(state);
  return h.type === 'shop' && !shopClosed(state);
}

function setDoor(state, h, open, by, auto) {
  const d = h.door;
  if (d.open === open) return;
  d.open = open;
  d.openedBy = by ? by.id : null;
  d.auto = !!auto;
  d.closeAt = state.tick + DOOR_CLOSE_TICKS;
  d.changedTick = state.tick;
}

// 扉を開け閉めする（命令・タップ・NPC）。戻り: 'opened' | 'closed' | 'locked' | 'busy' | null
export function toggleDoor(state, actor, h, events, want) {
  const d = h.door;
  const open = want === undefined ? !d.open : !!want;
  if (open === d.open) return null;
  if (!open) {
    if (doorwayBusy(state, h)) return 'busy';
    setDoor(state, h, false, actor, false);
    return 'closed';
  }
  const inside = actor ? !!houseAt(state, actor.x, actor.z, 0.2) : false;
  if (d.locked) {
    // 内側からは閂を外せる。外からは鍵が要る
    if (!inside && !hasKey(actor, h)) {
      if (events && actor && actor.faction === 'player') events.push(makeEvent(state, 'town', '扉に鍵がかかっている（錠の強さ ' + d.lock + '）'));
      return 'locked';
    }
    d.locked = false;
  }
  setDoor(state, h, true, actor, actor ? actor.faction !== 'player' : false);
  return 'opened';
}

function doorwayBusy(state, h) {
  for (const a of state.actors) {
    if (a.state === 'dead' || a.carriedBy !== null && a.carriedBy !== undefined) continue;
    const l = doorLocal(h, a.x, a.z);
    if (Math.abs(l.s) < h.door.half + 0.45 && Math.abs(l.q) < 0.75) return true;
  }
  return false;
}

// 毎tick: NPC が開けた扉は閉め、昼夜で鍵を掛け直す
export function updateTown(state, events) {
  const t = state.town;
  if (!t) return;
  for (const a of state.actors) {
    if (a.lockedSay) {
      if (events && a.lockedSay.tick === state.tick) events.push(makeEvent(state, 'town', a.name + ': 扉に鍵がかかっている（錠の強さ ' + a.lockedSay.lock + '）'));
      delete a.lockedSay;
    }
  }
  for (const h of t.houses) {
    const d = h.door;
    const pol = doorPolicy(state, h);
    if (d.open && d.auto) {
      if (doorwayBusy(state, h)) d.closeAt = state.tick + DOOR_CLOSE_TICKS;
      else if (state.tick >= d.closeAt) {
        setDoor(state, h, false, null, false);
        d.locked = pol;
      }
    }
    if (d.policy !== pol) {
      d.policy = pol;
      if (!d.open) d.locked = pol;
    }
  }
}

// ---- 道（戸口を通る） ----
// 戻り: null（まっすぐ）| { x, z }（先に向かう点）| { blocked: true }
export function navPoint(state, actor, tx, tz) {
  const t = state.town;
  if (!t || !t.houses.length) return null;
  const hb = houseAt(state, tx, tz, 0.1);
  let ha = houseAt(state, actor.x, actor.z, 0.1);
  let doorOf = null;
  if (!ha) {
    for (const h of t.houses) {
      if (inDoorway(h, actor.x, actor.z)) {
        doorOf = h;
        break;
      }
    }
  }
  if (doorOf) {
    // 敷居の上: 行き先の側へ抜ける
    ensureOpen(state, actor, doorOf);
    if (hb === doorOf) return doorPoint(doorOf, -0.9);
    return doorPoint(doorOf, 1.0);
  }
  if (ha && ha === hb) return null;
  if (ha) {
    const l = doorLocal(ha, actor.x, actor.z);
    const near = Math.hypot(l.s, l.q) < DOOR_REACH;
    if (near && !ensureOpen(state, actor, ha)) return { blocked: true, house: ha };
    // 戸口は一人ずつ: 先に戸口にいる者（id の小さい者）に譲り、脇で待つ
    if (l.q >= -1.6 && Math.abs(l.s) < ha.door.half + 0.6 && yieldAt(state, actor, ha)) return sidePoint(ha, l.s, -1.5);
    if (l.q >= -1.3 && Math.abs(l.s) < ha.door.half) return doorPoint(ha, 1.0);
    if (Math.abs(l.s) > 0.18 || l.q < -1.2) return doorPoint(ha, -0.85);
    return doorPoint(ha, 1.0);
  }
  if (!hb) return null;
  const l = doorLocal(hb, actor.x, actor.z);
  const dist = Math.hypot(l.s, l.q);
  if (l.q < 0.3) return aroundHouse(hb, actor);
  if (dist > DOOR_REACH + 0.3 || Math.abs(l.s) > 0.25) {
    if (dist < DOOR_REACH && !ensureOpen(state, actor, hb)) return { blocked: true, house: hb };
    if (dist < DOOR_REACH + 0.6 && yieldAt(state, actor, hb)) return sidePoint(hb, l.s, 1.5);
    return doorPoint(hb, 0.95);
  }
  if (!ensureOpen(state, actor, hb)) return { blocked: true, house: hb };
  if (yieldAt(state, actor, hb)) return sidePoint(hb, l.s, 1.5);
  return doorPoint(hb, -0.9);
}

// 戸口の喉（敷居の前後 1m）に、自分より先の者がいるか
function yieldAt(state, actor, h) {
  const me = doorLocal(h, actor.x, actor.z);
  for (const o of state.actors) {
    if (o === actor || o.state === 'dead' || o.state === 'down' || (o.carriedBy !== null && o.carriedBy !== undefined)) continue;
    const l = doorLocal(h, o.x, o.z);
    if (Math.abs(l.s) > h.door.half + 0.3 || Math.abs(l.q) > 1.0) continue;
    // 相手の方が戸口の中心に近い、または同じくらいで id が小さい
    const dm = Math.abs(me.s) + Math.abs(me.q) * 0.5;
    const dn = Math.abs(l.s) + Math.abs(l.q) * 0.5;
    if (dn < dm - 0.05 || (Math.abs(dn - dm) <= 0.05 && o.id < actor.id)) return true;
  }
  return false;
}

function sidePoint(h, s0, q) {
  const s = (s0 >= 0 ? 1 : -1) * (h.door.half + 0.7);
  return { x: h.door.x + h.ux * s + h.nx * q, z: h.door.z + h.uz * s + h.nz * q };
}

// 戸口の裏・横にいる時は、戸口の側の角へ回る
function aroundHouse(h, actor) {
  const dx = actor.x - h.x;
  const dz = actor.z - h.z;
  const a = dx * h.ux + dz * h.uz;
  const b = dx * h.nx + dz * h.nz;
  const hl = h.len / 2 + 1.0;
  const hd = h.depth / 2 + 1.0;
  const sa = a >= 0 ? 1 : -1;
  let ta;
  let tb;
  if (Math.abs(a) < h.len / 2 + 0.6) {
    // 裏: まず横の角へ
    ta = sa * hl;
    tb = -hd;
    if (Math.hypot(a - ta, b - tb) < 0.7) tb = hd;
  } else {
    ta = sa * hl;
    tb = hd;
  }
  return { x: h.x + h.ux * ta + h.nx * tb, z: h.z + h.uz * ta + h.nz * tb };
}

function ensureOpen(state, actor, h) {
  const d = h.door;
  if (d.open) return true;
  const inside = !!houseAt(state, actor.x, actor.z, 0.2);
  if (d.locked && !inside && !hasKey(actor, h)) {
    if (actor.faction === 'player' && (actor.lockedSaidTick || -999) < state.tick - 50) {
      actor.lockedSaidTick = state.tick;
      actor.lockedSay = { tick: state.tick, lock: d.lock };
    }
    return false;
  }
  d.locked = false;
  // NPC が開けた扉は自分で閉まる。仲間が開けた扉は開けたまま（Kenshi と同じく手で閉める）
  setDoor(state, h, true, actor, actor.faction !== 'player');
  return true;
}

// ---- 住人の居場所 ----
function residentDest(state, actor) {
  const h = houseById(state, actor.home);
  if (!h) return null;
  if (sleepTime(state) && !(actor.job === 'post_guard' && actor.id % 2 === 0)) {
    const bed = bedFor(state, actor, h);
    if (bed) return { x: bed.x, z: bed.z, bed };
  }
  if (actor.job === 'shopkeeper') return h.counter;
  if (actor.job === 'post_guard') {
    if (homeNight(state)) {
      // 夜は中で戸口の脇に立つ（戸口は塞がない）
      const p = sidePoint(h, -1, -1.4);
      return { x: p.x, z: p.z, face: Math.atan2(h.nx, h.nz) };
    }
    const k = actor.id % 2 === 0 ? 1 : -1;
    return { x: h.door.x + h.nx * 1.3 + h.ux * k * 1.4, z: h.door.z + h.nz * 1.3 + h.uz * k * 1.4, face: Math.atan2(h.nx, h.nz) };
  }
  // 家の者: 昼のうち何刻かは戸口の前に出る（時刻ごとのハッシュ）
  const hour = Math.floor(hourOf(state));
  if (!homeNight(state) && th(actor.id, Math.floor((state.timeSec || 0) / 3600), 'out') < 0.3) {
    return { x: h.door.x + h.nx * 1.6 + h.ux * 1.2, z: h.door.z + h.nz * 1.6 + h.uz * 1.2 };
  }
  void hour;
  return h.table;
}

function bedFor(state, actor, h) {
  const beds = state.bedrolls.filter((b) => b.house === h.id);
  if (!beds.length) return null;
  const free = beds.filter((b) => !state.actors.some((o) => o !== actor && o.resting === b.id && o.state !== 'dead'));
  const mine = free.find((b) => b.id === actor.bedId) || free[actor.id % Math.max(1, free.length)] || null;
  if (mine) actor.bedId = mine.id;
  return mine;
}

// moveActor の最初: 牢・錠前破り・作業中は動かない。朝になった住人は起きる。
export function townHold(state, actor) {
  if (actor.jail) {
    actor.moveTo = null;
    actor.targetId = null;
    if (actor.state !== 'down' && actor.state !== 'getup') {
      actor.state = 'idle';
      setAnim(actor, 'Idle', state.tick);
    }
    return true;
  }
  if (actor.home && actor.resting && !sleepTime(state)) stopRest(actor);
  if (actor.targetId !== null && actor.targetId !== undefined) {
    actor.pick = null;
    if (actor.townTask) actor.townTask = null;
    return false;
  }
  if (actor.pick || (actor.townTask && actor.townTask.stage === 'act')) {
    if (actor.state !== 'down' && actor.state !== 'getup') {
      actor.state = 'idle';
      setAnim(actor, 'Idle', state.tick);
    }
    const goal = actor.townTask && taskGoal(state, actor, actor.townTask);
    if (goal && goal.face !== undefined) actor.rot = goal.face;
    return true;
  }
  return false;
}

// 作業の行き先（扉・箱・相手）
export function taskGoal(state, actor, task) {
  if (task.kind === 'door' || (task.kind === 'pick' && task.door)) {
    const h = houseById(state, task.house);
    if (!h) return null;
    const inside = !!houseAt(state, actor.x, actor.z, 0.1);
    const p = doorPoint(h, inside ? -0.75 : 0.8);
    return { x: p.x, z: p.z, reach: 0.45, face: Math.atan2(h.door.x - p.x, h.door.z - p.z) };
  }
  if (task.box) {
    const b = boxById(state, task.box);
    const h = b && houseById(state, b.house);
    if (!b || !h) return null;
    const dx = h.x - b.x;
    const dz = h.z - b.z;
    const d = Math.hypot(dx, dz) || 1;
    const p = { x: b.x + (dx / d) * 0.75, z: b.z + (dz / d) * 0.75 };
    return { x: p.x, z: p.z, reach: 0.4, near: b, nearReach: 1.1, face: Math.atan2(b.x - p.x, b.z - p.z) };
  }
  if (task.kind === 'pickpocket') {
    const t = state.actors.find((a) => a.id === task.targetId);
    if (!t || t.state === 'dead') return null;
    return { x: t.x, z: t.z, reach: 1.0, face: Math.atan2(t.x - actor.x, t.z - actor.z), moving: true };
  }
  return null;
}

// moveActor の途中: 町の作業・逮捕・駆け付け・住人の居場所。動いたら true。
export function townMove(state, actor, byId, stepToward) {
  // 仲間の作業（扉・錠前・盗み・スリ）
  if (actor.townTask) {
    const task = actor.townTask;
    const goal = taskGoal(state, actor, task);
    if (!goal) {
      actor.townTask = null;
      return false;
    }
    const d = Math.hypot(goal.x - actor.x, goal.z - actor.z);
    const nearOk = goal.near && Math.hypot(goal.near.x - actor.x, goal.near.z - actor.z) <= goal.nearReach && houseAt(state, actor.x, actor.z, 0.1);
    if (d <= goal.reach || nearOk) {
      task.stage = 'act';
      actor.state = 'idle';
      actor.rot = goal.face;
      setAnim(actor, 'Idle', state.tick);
      return true;
    }
    task.walkTicks = (task.walkTicks || 0) + 1;
    if (task.walkTicks > 900) {
      actor.townTask = null;
      return false;
    }
    stepToward(state, actor, goal.x, goal.z, d > 8 && !actor.sneaking);
    return true;
  }
  // 買った店のカウンターへ来る客（house_buy.js が到着・時間切れを判定）
  if (actor.shopGoal && actor.faction !== 'player') {
    const g = actor.shopGoal;
    const d = Math.hypot(g.x - actor.x, g.z - actor.z);
    if (d <= 0.85) {
      actor.state = 'idle';
      setAnim(actor, 'Idle', state.tick);
    } else stepToward(state, actor, g.x, g.z, false);
    return true;
  }
  // 衛兵: 捕まえに行く・呼ばれて駆け付ける
  if (actor.faction === 'guard' && !actor.civil) {
    const law = state.law;
    if (law && law.arrest && law.arrest.guardId === actor.id) {
      const t = byId.get(law.arrest.targetId);
      if (t && t.state !== 'dead') {
        const d = Math.hypot(t.x - actor.x, t.z - actor.z);
        if (d > 1.8) stepToward(state, actor, t.x, t.z, d > 4);
        else {
          actor.state = 'idle';
          setAnim(actor, 'Idle', state.tick);
        }
        actor.rot = Math.atan2(t.x - actor.x, t.z - actor.z);
        return true;
      }
    }
    if (actor.investigate) {
      const iv = actor.investigate;
      const d = Math.hypot(iv.x - actor.x, iv.z - actor.z);
      if (state.tick > iv.untilTick || d < 1.2) actor.investigate = null;
      else {
        stepToward(state, actor, iv.x, iv.z, true);
        return true;
      }
    }
  }
  if (!actor.home || actor.moveTo) return false;
  const dest = residentDest(state, actor);
  if (!dest) return false;
  const d = Math.hypot(dest.x - actor.x, dest.z - actor.z);
  if (dest.bed) {
    if (actor.resting === dest.bed.id) return false; // rest.js が寝かせる
    if (d <= 1.0) {
      actor.state = 'idle';
      startRest(state, actor, null);
      return true;
    }
  }
  if (d <= 0.6) {
    if (actor.state !== 'down' && actor.state !== 'getup') {
      actor.state = 'idle';
      setAnim(actor, 'Idle', state.tick);
    }
    if (dest.face !== undefined) actor.rot = dest.face;
    return true;
  }
  stepToward(state, actor, dest.x, dest.z, d > 25);
  return true;
}

// ---- 視線: 壁と閉じた扉が遮る ----
function segHitsBox(ax, az, bx, bz, o) {
  let t0 = 0;
  let t1 = 1;
  const dx = bx - ax;
  const dz = bz - az;
  const axes = [
    [dx, ax, o.x - o.hw, o.x + o.hw],
    [dz, az, o.z - o.hd, o.z + o.hd],
  ];
  for (const [dd, p, lo, hi] of axes) {
    if (Math.abs(dd) < 1e-9) {
      if (p < lo || p > hi) return false;
      continue;
    }
    let ta = (lo - p) / dd;
    let tb = (hi - p) / dd;
    if (ta > tb) [ta, tb] = [tb, ta];
    if (ta > t0) t0 = ta;
    if (tb < t1) t1 = tb;
    if (t0 > t1) return false;
  }
  return true;
}

export function losClear(state, ax, az, bx, bz) {
  const t = state && state.town;
  if (!t) return true;
  const minX = Math.min(ax, bx);
  const maxX = Math.max(ax, bx);
  const minZ = Math.min(az, bz);
  const maxZ = Math.max(az, bz);
  for (const h of t.houses) {
    if (maxX < h.x - h.w / 2 || minX > h.x + h.w / 2 || maxZ < h.z - h.d / 2 || minZ > h.z + h.d / 2) continue;
    for (const o of h.walls) if (segHitsBox(ax, az, bx, bz, o)) return false;
    if (!h.door.open) {
      const o = doorBox(h);
      if (segHitsBox(ax, az, bx, bz, o)) return false;
    }
  }
  return true;
}

export function doorBox(h) {
  const d = h.door;
  const along = Math.abs(d.ux) > 0.5;
  return along ? { x: d.x, z: d.z, hw: d.half, hd: WALL_HALF } : { x: d.x, z: d.z, hw: WALL_HALF, hd: d.half };
}

// 当たり判定用（collide.js）: 入れる小屋の建物番号 → 壁と扉
export function townObstacles(state) {
  const t = state && state.town;
  if (!t) return null;
  const byB = new Map();
  for (const h of t.houses) {
    const list = h.walls.map((w) => ({ shape: 'box', x: w.x, z: w.z, hw: w.hw, hd: w.hd }));
    const db = doorBox(h);
    list.push({ shape: 'box', x: db.x, z: db.z, hw: db.hw, hd: db.hd, door: h.door });
    byB.set(h.b, list);
  }
  return byB;
}

// 扉に近いか（タップで開け閉め）
export function doorNear(state, x, z, reach = 1.3) {
  const t = state && state.town;
  if (!t) return null;
  let best = null;
  let bd = reach;
  for (const h of t.houses) {
    const d = Math.hypot(h.door.x - x, h.door.z - z);
    if (d < bd) {
      bd = d;
      best = h;
    }
  }
  return best;
}

export function townSummary(state) {
  const t = state && state.town;
  if (!t) return null;
  return {
    houses: t.houses.length,
    shops: t.houses.filter((h) => h.type === 'shop').length,
    posts: t.houses.filter((h) => h.type === 'post').length,
    boxes: t.boxes.length,
    beds: t.houses.reduce((n, h) => n + h.beds.length, 0),
    residents: state.actors.filter((a) => a.home).length,
  };
}
