// v0.16.0: ガンキック ワールド の ルール（データ だけ・three.js なし → テスト できる）
// ステージの なかみ（てきの ならび）は stages/sNN.js、3D マップは maps/<mod>.js に わけて あとから よむ
// → ステージが ふえても さいしょに よむ ぶんは ふえない（めくじ catalog.js だけ）
import { GK_CATALOG } from './catalog.js?v=19';

export { GK_CATALOG };
export const GK_COUNT = GK_CATALOG.length;
export const gkMeta = (no) => GK_CATALOG.find((s) => s.no === no) || null;
export const gkStageFile = (no) => `./stages/s${String(no).padStart(2, '0')}.js`;
export const gkLoadStage = (no) => import(`${gkStageFile(no)}?v=19`).then((m) => m.STAGE);
export const gkLoadMap = (no) => (GK_READY[no] ? import(`./maps/${GK_READY[no].mod}.js?v=19`) : Promise.reject(new Error('not ready')));
// ワールド（ステージ せんたく の カードの まとまり）
export const GK_WORLDS = [
  { id: 'w1', tab: 'ワールド1', name: 'ワールド1　はじまりの たたかい', stages: [1, 2, 3, 4, 5] },
  { id: 'w2', tab: 'ワールド2', name: 'ワールド2　ひろがる せかい', stages: [6, 7, 8, 9, 10] },
  { id: 'w3', tab: 'ワールド3', name: 'ワールド3　さいごの たたかい', stages: [11, 12, 13, 14, 15] },
  { id: 'w4', tab: 'とくべつ', name: 'とくべつ ステージ', stages: [16, 17, 18] },
];
// あそべる ステージ（3D マップが できた もの）。map: マップ id、mod: js/gk/maps/<mod>.js を あとから よむ
export const GK_READY = {
  1: { map: 'gk_lab', mod: 'lab', tod: 'night' },
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
  ghoul: 'walker', nomad: 'walker', suit: 'walker',
  guard: 'guard', worker: 'guard',
  crawler: 'crawler', ghoulet: 'crawler', scorp: 'crawler',
  gunner: 'spitter', sniper: 'spitter', spitter: 'spitter', suitp: 'spitter',
  hulk: 'brute', brute: 'brute', bigghoul: 'brute', rockz: 'brute', heavy: 'brute',
  bloatz: 'bloater', bloater: 'bloater',
  shield: 'riot', knight: 'riot',
  raider: 'runner', swarm: 'runner', hound: 'runner', suitk: 'runner', wraith: 'runner',
  soldierz: 'soldier', outlaw: 'soldier', suitsg: 'soldier',
  leaper: 'mutant',
  sergeant: 'charger', patch: 'charger',
};
export const gkKind = (id) => GK_ENEMY[id] || 'walker';
export const baseKind = (k) => k.split('@')[0];
// ボスの みため（できた もの だけ。ほかは いつもの ボス）
export const GK_BOSS_LOOK = { agent: 'agent' };
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
export function gkRoomAt(rooms, x, z) {
  for (let i = 0; i < rooms.length; i++) { const [x0, z0, x1, z1] = rooms[i].b; if (x > x0 && x < x1 && z > z0 && z < z1) return i; }
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
  const inside = (c, i) => { const [x0, z0, x1, z1] = gm.rooms[i].b; return c[0] > x0 + margin && c[0] < x1 - margin && c[1] > z0 + margin && c[1] < z1 - margin; };
  const clearOfDoors = (c) => gm.doors.every((d) => Math.hypot(c[0] - d.x, c[1] - d.z) >= doorClear);
  const here = cells.filter((c) => inside(c, room) && clearOfDoors(c));
  if (here.length) return here;
  const back = cells.filter((c) => { const i = gkRoomAt(gm.rooms, c[0], c[1]); return i >= 0 && i <= room && clearOfDoors(c); });
  return back.length ? back : cells.filter((c) => { const i = gkRoomAt(gm.rooms, c[0], c[1]); return i >= 0 && i <= room; });
}
// ひらいた ドアの みえない かべは ちかの したへ（ぶつからない）
export const gkDoorOpenBox = () => [-60, -50];
