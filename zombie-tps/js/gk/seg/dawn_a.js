// ステージ17「よあけの こうや」 セグメント A（へや0 いわの たにま → へや1 サボテンの みち）。ぜんぶ -z（きた）へ すすむ
// でぐち（z=-34 の かべの ドア x=-6）で セグメント B に つながる。たにの かべは すないろの いわ
import { segWall, segOuter, segDoor, roomSpawns } from './kit.js?v=18';

export const ROCK = 0xb07a4a, ROCK2 = 0x9a6a40, SAND = 0xc4a26a, GREEN = 0x4a7a3a, H = 3.8, DW = 4.4, WH = 4.6, DOOR = 0x6a4a30;
export const THEME = { ground: 'dirt', tint: 0xa0703a, k: 0.25, far: 'base' };
export const W = { h: WH, dw: DW, tint: ROCK, mat: 'dirt', trim: null };
// いわ（かくれる ばしょ）
export function rock(B, x, z, w, h, d, t = ROCK2) {
  B.add('dirt', x, 0, z, w, h, d, { tint: t });
  B.add('dirt', x + w * 0.1, h, z - d * 0.05, w * 0.6, h * 0.45, d * 0.6, { tint: ROCK });
}
// サボテン（みどりの はこ: みき ＋ うで2ほん）
export function cactus(B, x, z, s = 1) {
  B.add('leaves', x, 0, z, 0.8 * s, 2.8 * s, 0.8 * s, { tint: GREEN });
  B.deco('leaves', x - 0.8 * s, 1.2 * s, z, 0.9 * s, 0.5 * s, 0.5 * s, { tint: GREEN });
  B.deco('leaves', x - 1.1 * s, 1.2 * s, z, 0.5 * s, 1.1 * s, 0.5 * s, { tint: GREEN });
  B.deco('leaves', x + 0.8 * s, 1.7 * s, z, 0.9 * s, 0.5 * s, 0.5 * s, { tint: GREEN });
  B.deco('leaves', x + 1.1 * s, 1.7 * s, z, 0.5 * s, 0.9 * s, 0.5 * s, { tint: GREEN });
}
// かれくさ
export function bush(B, x, z) {
  for (const [a, b, h] of [[0, 0, 0.7], [0.3, 0.2, 0.5], [-0.3, 0.1, 0.6]]) B.deco('log', x + a, 0, z + b, 0.1, h, 0.1, { tint: 0x6a5030 });
}
// たにの そとがわの いわ（たかさ 4〜7m・でこぼこ）
export function canyon(B, z0, z1) {
  const { r } = B;
  for (let z = z0 + 2; z < z1; z += 3.5) for (const s of [-1, 1]) {
    const w = 3 + r() * 2.5, h = 4 + r() * 3;
    B.deco('dirt', s * (16.8 + w / 2 + r() * 0.6), 0, z + r(), w, h, 3.6, { tint: r() < 0.5 ? ROCK : ROCK2 });
  }
}

export function build(builder) {
  const B = builder(36, 1701), { add, deco, r } = B;
  segOuter(B, [-16, -34, 16, 34], ['s', 'w', 'e'], { h: WH, tint: ROCK, mat: 'dirt' });
  const rooms = [
    { name: 'いわの たにま', b: [-16, 2, 16, 34] },
    { name: 'サボテンの みち', b: [-16, -34, 16, 2] },
  ];
  const doors = [{ x: 6, z: 2, axis: 'x' }], exit = { x: -6, z: -34, axis: 'x' };
  segWall(B, 'x', 2, -16, 16, [6], W);
  segWall(B, 'x', -34, -16, 16, [-6], W);
  segDoor(B, doors[0], 0, { h: H, dw: DW, steel: DOOR });
  segDoor(B, exit, 'out', { h: H, dw: DW, steel: DOOR });
  B.reserve(-5, 27, 5, 34); // スタート
  canyon(B, -34, 34);
  deco('dirt', 0, 0.004, 18, 12, 0.02, 30, { tint: SAND });
  deco('dirt', -2, 0.004, -16, 12, 0.02, 34, { tint: SAND });
  // ---- へや0: いわの たにま（おおきな いわ）----
  rock(B, -10, 24, 4, 2.2, 3); rock(B, 9, 21, 3.4, 1.8, 3.6); rock(B, -6, 12, 3, 1.6, 2.6);
  rock(B, 12, 8, 3.6, 2.4, 3); rock(B, -12, 6, 2.6, 1.4, 3.4); rock(B, 2, 15, 2, 1.2, 2);
  for (const [x, z] of [[-13, 30], [13, 29], [-13, 17], [4, 9]]) bush(B, x, z);
  cactus(B, 14, 14, 1); cactus(B, -14, 12, 0.9);
  // ---- へや1: サボテンの みち（サボテン・こわれた にぐるま）----
  B.truck(-9, -8, 'x', 0x8a6a4a, 0x8a7a5a);
  for (const [x, z, s] of [[9, -6, 1.1], [-3, -14, 1], [10, -18, 1.2], [-11, -22, 1], [3, -26, 1.1], [13, -28, 0.9], [-2, -4, 0.9]]) cactus(B, x, z, s);
  rock(B, -10, -18, 3, 1.6, 2.6); rock(B, 8, -12, 2.6, 1.4, 3); rock(B, 6, -30, 3.4, 2, 2.6); rock(B, -12, -30, 2.4, 1.5, 3);
  for (const [x, z] of [[2, -10], [-6, -26], [12, -24], [-13, -12], [0, -32]]) bush(B, x, z);
  roomSpawns(B, rooms);
  return B.done(THEME, {
    backdrop: 'camp', playerStart: { x: 0, z: 30, yaw: 0 },
    seg: { rooms, doors, entry: null, exit, doorW: DW, doorH: H },
  });
}
