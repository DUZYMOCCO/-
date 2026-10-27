// v0.16.0: ガンキック ワールド の ルール（データ だけ・three.js なし → テスト できる）
// ステージの なかみ（てきの ならび）は stages/sNN.js、3D マップは maps/<mod>.js に わけて あとから よむ
// → ステージが ふえても さいしょに よむ ぶんは ふえない（めくじ catalog.js だけ）
import { GK_CATALOG } from './catalog.js?v=23';

export { GK_CATALOG };
export const GK_COUNT = GK_CATALOG.length;
export const gkMeta = (no) => GK_CATALOG.find((s) => s.no === no) || null;
export const gkStageFile = (no) => `./stages/s${String(no).padStart(2, '0')}.js`;
export const gkLoadStage = (no) => import(`${gkStageFile(no)}?v=23`).then((m) => m.STAGE);
// v0.17.0: セグメント（js/gk/seg/<mod>.js）。すすむと 1つずつ よむ
export const gkLoadSeg = (mod) => import(`./seg/${mod}.js?v=23`);
// idxs の セグメントを よむ → { idx: モジュール }
export function gkLoadSegs(info, idxs) {
  const list = idxs.filter((i) => info.segs && info.segs[i]);
  return Promise.all(list.map((i) => gkLoadSeg(info.segs[i].mod))).then((ms) => Object.fromEntries(list.map((i, k) => [i, ms[k]])));
}
// ステージ ぜんぶを 1まいの マップに（テスト・ふるい よみかた）。mod が なければ セグメントを つなぐ
export function gkLoadMap(no) {
  const info = GK_READY[no];
  if (!info) return Promise.reject(new Error('not ready'));
  if (info.mod) return import(`./maps/${info.mod}.js?v=23`);
  return Promise.all([gkLoadSegs(info, info.segs.map((_, i) => i)), import('./seg.js?v=23')])
    .then(([ms, S]) => ({ build: (builder) => S.joinSegs(S.chainSegs(info.segs.map((_, i) => ms[i].build(builder)))) }));
}
// ワールド（ステージ せんたく の カードの まとまり）
export const GK_WORLDS = [
  { id: 'w1', tab: 'ワールド1', name: 'ワールド1　はじまりの たたかい', stages: [1, 2, 3, 4, 5] },
  { id: 'w2', tab: 'ワールド2', name: 'ワールド2　ひろがる せかい', stages: [6, 7, 8, 9, 10] },
  { id: 'w3', tab: 'ワールド3', name: 'ワールド3　さいごの たたかい', stages: [11, 12, 13, 14, 15] },
  { id: 'w4', tab: 'とくべつ', name: 'とくべつ ステージ', stages: [16, 17, 18] },
];
// あそべる ステージ（3D マップが できた もの）。map: マップ id、mod: js/gk/maps/<mod>.js を あとから よむ
// v0.17.0: segs = セグメントの くさり（mod: js/gk/seg/<mod>.js、rooms: へやの かず）→ すすむと よむ・とおると すてる
export const GK_READY = {
  1: { map: 'gk_lab', mod: 'lab', tod: 'night', segs: [{ mod: 'lab_a', rooms: 2 }, { mod: 'lab_b', rooms: 2 }] },
  2: { map: 'gk_manor', tod: 'sunset', segs: [{ mod: 'manor_a', rooms: 2 }, { mod: 'manor_b', rooms: 2 }, { mod: 'manor_c', rooms: 1 }] },
  3: { map: 'gk_city', tod: 'night', gim: ['rain'], segs: [{ mod: 'city_a', rooms: 2 }, { mod: 'city_b', rooms: 2 }] },
  4: { map: 'gk_subway', tod: 'night', gim: ['train'], segs: [{ mod: 'subway_a', rooms: 2 }, { mod: 'subway_b', rooms: 2 }] },
  5: { map: 'gk_tower', tod: 'sunset', segs: [{ mod: 'tower_a', rooms: 2 }, { mod: 'tower_b', rooms: 2 }, { mod: 'tower_c', rooms: 1 }] },
  15: { map: 'gk_core', tod: 'night', gim: ['vents'], segs: [{ mod: 'core_a', rooms: 2 }, { mod: 'core_b', rooms: 2 }, { mod: 'core_c', rooms: 1 }] },
  17: { map: 'gk_dawn', tod: 'night', gim: ['dawn'], segs: [{ mod: 'dawn_a', rooms: 2 }, { mod: 'dawn_b', rooms: 2 }] },
  18: { map: 'gk_doors', tod: 'night', gim: ['doors'], segs: [{ mod: 'doors_a', rooms: 2 }, { mod: 'doors_b', rooms: 2 }, { mod: 'doors_c', rooms: 1 }] },
};
export const isGkReady = (no) => !!GK_READY[no];
// つぎの あそべる ステージ（なければ null）
export function gkNext(no) {
  for (let n = no + 1; n <= GK_COUNT; n++) if (isGkReady(n)) return n;
  return null;
}

// 2D の てき → 3D の ゾンビ（うごき）＋ みため。'walker@lab' = ふつうの うごき・しろい はくい
export const GK_ENEMY = {
  zombie: 'walker', labz: 'walker@lab', patient: 'walker@lab', grunt: 'walker', sailor: 'walker', frozen: 'walker',
  ghoul: 'walker', nomad: 'walker', suit: 'walker@suit',
  guard: 'guard', worker: 'guard',
  crawler: 'crawler', ghoulet: 'crawler', scorp: 'crawler',
  gunner: 'spitter', sniper: 'spitter', spitter: 'spitter', suitp: 'spitter@suit',
  hulk: 'brute', brute: 'brute', bigghoul: 'brute', rockz: 'brute', heavy: 'brute',
  bloatz: 'bloater', bloater: 'bloater',
  shield: 'riot', knight: 'riot',
  raider: 'runner', swarm: 'runner', hound: 'runner', suitk: 'runner@suit', wraith: 'runner',
  soldierz: 'soldier', outlaw: 'soldier', suitsg: 'soldier@suit',
  leaper: 'mutant',
  sergeant: 'charger', patch: 'charger',
};
export const gkKind = (id) => GK_ENEMY[id] || 'walker';
export const baseKind = (k) => k.split('@')[0];
// ボスの みため（できた もの だけ。ほかは いつもの ボス）
// v0.17.0: ボスごとの わざ（js/gk/bosses/<id>.js）が ある ボス。みためは BOSS.look を とうろく
export const GK_BOSS_AI = ['agent', 'hydra', 'giant', 'mutant', 'king', 'surgeon', 'tank', 'beast', 'welder', 'wreck', 'kraken', 'yeti', 'queen', 'heli', 'final', 'ghoulking', 'sunscorp', 'doorboss'];
export const GK_BOSS_LOOK = Object.fromEntries(GK_BOSS_AI.map((id) => [id, id]));
export const gkLoadBoss = (id) => (GK_BOSS_AI.includes(id)
  ? Promise.all([import(`./bosses/${id}.js?v=23`), import('./bosses/rt.js?v=23')]).then(([m, rt]) => ({ def: m.BOSS, rt })).catch((e) => { console.warn(e); return null; })
  : Promise.resolve(null));
const HEAVY = new Set(['brute', 'bloater', 'riot', 'charger', 'mutant']);

// 1つの アリーナ（2D の ちいさい なみ いくつか）→ 3D の 1ウェーブ
// おもい てき（brute など）は そのままの かず・ほかは くりかえして target たいに ふやす
export function gkArenaList(arena, target) {
  const all = arena.flat().map(gkKind);
  const heavy = all.filter((k) => HEAVY.has(baseKind(k)));
  const light = all.filter((k) => !HEAVY.has(baseKind(k)));
  const out = [];
  const nLight = Math.max(light.length, target - heavy.length);
  for (let i = 0; i < nLight && light.length; i++) out.push(light[i % light.length]);
  // おもい てきは うしろ はんぶんに ちらす（さいしょは よわい てき）
  heavy.forEach((k, i) => { const at = Math.min(out.length, Math.floor(out.length * (0.45 + 0.5 * (i + 1) / (heavy.length + 1)))); out.splice(at, 0, k); });
  return out;
}

// ステージ → ウェーブの リスト（さいごの ウェーブに ボス）
export function gkWaves(st) {
  const n = st.arenas.length, hm = st.hpMul || 1;
  return st.arenas.map((arena, i) => {
    const target = Math.round((12 + i * 5) * Math.min(1.3, hm));
    const list = gkArenaList(arena, target);
    const last = i === n - 1;
    if (last) list.splice(Math.floor(list.length * 0.55), 0, 'boss');
    const maxAlive = Math.min(8 + i * 3, 18);
    return {
      n: i + 1, total: list.length, list, boss: last ? 1 : 0,
      bossName: last ? st.boss.name : null, bossLook: last ? GK_BOSS_LOOK[st.boss.id] || null : null,
      bossHpMul: last ? Math.max(0.8, Math.min(2, st.boss.hp / 1400)) : 1,
      maxAlive, spawnGap: Math.max(0.5, 1.3 - i * 0.15), hpMul: hm * (1 + i * 0.05), dmgMul: 1,
    };
  });
}

// クリアの ほうび（スコア）
export const gkClearBonus = (no) => 1500 + no * 250;

// ---- へやの すすみ（v0.16.0: いっぽんみち）----
// rooms[i].b = [x0, z0, x1, z1]。どの へやに いるか（-1 = どこでも ない）
// v0.17.0: よんで いない セグメントの へやは ない（rooms[i] が からっぽ）
export function gkRoomAt(rooms, x, z) {
  for (let i = 0; i < rooms.length; i++) { if (!rooms[i] || !rooms[i].b) continue; const [x0, z0, x1, z1] = rooms[i].b; if (x > x0 && x < x1 && z > z0 && z < z1) return i; }
  return -1;
}
// へやの でぐちから 1つ（ちかすぎない ところ・ランダム）
export function gkPickRoomSpawn(spawns, px, pz, r = Math.random(), near = 9) {
  const far = spawns.filter((s) => Math.hypot(s.x - px, s.z - pz) >= near);
  const list = far.length ? far : spawns;
  return list[Math.min(list.length - 1, Math.floor(r * list.length))];
}
// v0.16.1: へやに はいった？（ゆるめ）。へやの なか か、ひらいた ドアの まわり 3m に いれば はいった ことに する
export const GK_ENTER_R = 3;
export function gkEntered(gm, room, x, z) {
  if (!gm) return true;
  if (gkRoomAt(gm.rooms, x, z) >= room) return true;
  const d = room > 0 && gm.doors[room - 1];
  return !!d && Math.hypot(x - d.x, z - d.z) <= GK_ENTER_R;
}
// v0.16.1: スーツ・なかまロボを おく ばしょは 「いまの へや」だけ（まだ しまっている へやには おかない・ドアの まえも さける）
export function gkSpotCells(gm, room, cells, margin = 1.5, doorClear = 3.5) {
  if (!gm) return cells;
  const inside = (c, i) => { if (!gm.rooms[i] || !gm.rooms[i].b) return false; const [x0, z0, x1, z1] = gm.rooms[i].b; return c[0] > x0 + margin && c[0] < x1 - margin && c[1] > z0 + margin && c[1] < z1 - margin; };
  const clearOfDoors = (c) => gm.doors.every((d) => !d || Math.hypot(c[0] - d.x, c[1] - d.z) >= doorClear);
  const here = cells.filter((c) => inside(c, room) && clearOfDoors(c));
  if (here.length) return here;
  const back = cells.filter((c) => { const i = gkRoomAt(gm.rooms, c[0], c[1]); return i >= 0 && i <= room && clearOfDoors(c); });
  return back.length ? back : cells.filter((c) => { const i = gkRoomAt(gm.rooms, c[0], c[1]); return i >= 0 && i <= room; });
}
// ひらいた ドアの みえない かべは ちかの したへ（ぶつからない）
export const gkDoorOpenBox = () => [-60, -50];

// ---- v0.17.0: ギミック（ステージごと・js/gk/gim/<id>.js を あとから よむ）----
export const gkLoadGims = (info) => Promise.all((info.gim || []).map((id) => import(`./gim/${id}.js?v=23`)));
// でんしゃ（ステージ4）: まつ → よこく（せんろの ライトが ちかちか・おと）→ とおる。とおる あいだ せんろに いると おされる（すこし いたい）
// lane = { room, axis:'x'|'z'（はしる むき）, at（せんろの まんなか）, from, to, w }
export const TRAIN = { wait: [7, 12], warn: 1.8, speed: 24, len: 18, dmg: 8, push: 10, zDmg: 60 };
export const trainNew = (r = Math.random) => ({ phase: 'wait', t: 3 + r() * 3, head: 0, dir: 1 });
const laneLo = (L) => Math.min(L.from, L.to), laneHi = (L) => Math.max(L.from, L.to);
// よこくから とおりおわる までの じかん
export const trainTimes = (L) => ({ warn: TRAIN.warn, pass: (laneHi(L) - laneLo(L) + 2 + TRAIN.len) / TRAIN.speed });
// 1こま すすめる。かわった ときは あたらしい phase を かえす
export function trainStep(st, L, dt, r = Math.random) {
  if (st.phase === 'wait') { if ((st.t -= dt) <= 0) { st.phase = 'warn'; st.t = TRAIN.warn; st.dir = r() < 0.5 ? 1 : -1; return 'warn'; } return null; }
  if (st.phase === 'warn') { if ((st.t -= dt) <= 0) { st.phase = 'pass'; st.head = st.dir > 0 ? laneLo(L) - 1 : laneHi(L) + 1; return 'pass'; } return null; }
  st.head += st.dir * TRAIN.speed * dt;
  const tail = st.head - st.dir * TRAIN.len;
  if ((st.dir > 0 && tail > laneHi(L) + 1) || (st.dir < 0 && tail < laneLo(L) - 1)) { st.phase = 'wait'; st.t = TRAIN.wait[0] + r() * (TRAIN.wait[1] - TRAIN.wait[0]); return 'wait'; }
  return null;
}
// でんしゃの はんい（はしる むきの [a0, a1]）
export const trainSpan = (st) => (st.dir > 0 ? [st.head - TRAIN.len, st.head] : [st.head, st.head + TRAIN.len]);
// あたった か（とおって いる ときだけ）
export function trainHit(st, L, x, z, r = 0.35) {
  if (st.phase !== 'pass') return false;
  const ax = L.axis === 'x', along = ax ? x : z, cross = ax ? z : x, [a0, a1] = trainSpan(st);
  return Math.abs(cross - L.at) < L.w / 2 + r && along > a0 - r && along < a1 + r;
}
// おされる むき（せんろの よこ・ちかい がわへ）
export const trainSide = (L, x, z) => (((L.axis === 'x' ? z : x) - L.at) >= 0 ? 1 : -1);

// よあけ（ステージ17）: すすんだ ぶん t（0〜1）で よる → あさやけ → あさ。0.25びょう ごと・1% いじょう かわった ときだけ ぬりなおす
export const DAWN = { every: 0.25, min: 0.01 };
export const dawnTod = (t) => (t < 0.5 ? { a: 'night', b: 'sunset', k: Math.max(0, t) * 2 } : { a: 'sunset', b: 'day', k: Math.min(1, (t - 0.5) * 2) });
export const dawnNeed = (last, t) => last == null || Math.abs(t - last) >= DAWN.min;
// すすみぐあい: へや i の いりぐち → でぐち の あいだの どこか（ドアの まんなかを むすぶ せん）。いりぐちが ない へやは start から
export function gkProgress(gm, x, z, start, n) {
  const i = gkRoomAt(gm.rooms, x, z); if (i < 0) return null;
  const r = gm.rooms[i], c = [(r.b[0] + r.b[2]) / 2, (r.b[1] + r.b[3]) / 2];
  const a = i > 0 && gm.doors[i - 1] ? [gm.doors[i - 1].x, gm.doors[i - 1].z] : start ? [start.x, start.z] : c;
  const b = gm.doors[i] ? [gm.doors[i].x, gm.doors[i].z] : c;
  const vx = b[0] - a[0], vz = b[1] - a[1], L = vx * vx + vz * vz;
  const f = L < 1e-6 ? 1 : Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / L));
  return Math.min(1, (i + f) / n);
}
// ガスの あな（ステージ15）: まつ → ひかる（よこく）→ ふきだす（なかに いると すこし いたい・ゾンビにも）
export const VENT = { period: 7, warn: 1.2, puff: 2.2, dps: 6, zDps: 25, r: 1.8 };
export function ventPhase(t, off = 0) {
  const u = (((t + off) % VENT.period) + VENT.period) % VENT.period, w0 = VENT.period - VENT.warn - VENT.puff;
  return u < w0 ? 'idle' : u < w0 + VENT.warn ? 'warn' : 'puff';
}
// でてくる ドア（ステージ18）: ランプが あかく ちかちか（よこく）→ ドアが あく → 1〜2たい でる → しまる。いちどに あくのは 3つ まで
export const DOORS = { warn: 0.9, open: 0.35, hold: 0.7, close: 0.4, maxOpen: 3, per: 2, near: 6 };
export const doorFront = (d, k = 1.2) => ({ x: d.x - Math.sin(d.yaw) * k, z: d.z - Math.cos(d.yaw) * k });
export const doorsBusy = (list) => list.filter((o) => o.st !== 'idle').length;
// あいて いる ドアから 1つ（プレイヤーから はなれた ところ）。いっぱい なら null
export function doorPick(list, room, px, pz, r = Math.random) {
  if (doorsBusy(list) >= DOORS.maxOpen) return null;
  const free = list.filter((o) => o.st === 'idle' && o.d.room === room);
  if (!free.length) return null;
  const far = free.filter((o) => { const f = doorFront(o.d); return Math.hypot(f.x - px, f.z - pz) >= DOORS.near; });
  const L = far.length ? far : free;
  return L[Math.min(L.length - 1, Math.floor(r() * L.length))];
}
