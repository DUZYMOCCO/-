// ステージ2「あかい そらの おやしき」 セグメント A（へや0 げんかん ホール → へや1 ながい ろうか）。かくうの やしき
// でぐち（z=-24 の かべの ドア）で セグメント B に つながる
import { segWall, segOuter, segDoor, roomSpawns } from './kit.js?v=37';

export const WALL = 0x6a4a52, WOOD = 0x5a3a2a, GOLD = 0xb08a3a, RUG = 0x7a1a24, H = 3.8, DW = 4.4;
export const THEME = { ground: 'plank', tint: 0x8a2a2a, k: 0.4, far: 'city', farTint: 0x6a3a3a };
export const COURT = { ground: 'cobble', tint: 0x8a2a2a, k: 0.4, far: 'forest', farTint: 0x5a3a3a };
// ろうそくだて（くらい ぼうと あかい ほのお）
export function candle(B, x, z) {
  B.add('dark', x, 0, z, 0.2, 1.5, 0.2);
  B.deco('ember', x, 1.5, z, 0.16, 0.3, 0.16);
}
// がくぶち（かべの うちがわ。side: 'w' = x が ちいさい かべ）
export function frame(B, x, z, side, tint) {
  const s = side === 'w' ? 1 : -1;
  B.deco('plank', x, 1.5, z, 0.1, 1.4, 1.1, { tint: GOLD });
  B.deco('paint', x + s * 0.06, 1.7, z, 0.06, 1.0, 0.8, { tint });
}
// ドアの うえの しましまを おおう（きの かざり）
export function doorCap(B, d, opt = {}) {
  const ax = d.axis === 'x';
  B.deco('plank', d.x, H - 0.75, d.z, ax ? DW + 1.3 : 1.15, 0.7, ax ? 1.15 : DW + 1.3, { tint: 0x4a2a1e, ...opt });
}
// ほんだな（ほんの せなかは いろいろ）
export function shelf(B, x, z, along, tint = 0x6a4a34) {
  const ax = along === 'x';
  B.add('plank', x, 0, z, ax ? 3.2 : 0.9, 2.6, ax ? 0.9 : 3.2, { tint });
  for (const [dy, c] of [[0.3, 0x8a3a3a], [1.1, 0x3a5a7a], [1.9, 0x6a8a4a]]) B.deco('paint', x, dy, z, ax ? 3.0 : 0.96, 0.6, ax ? 0.96 : 3.0, { tint: c });
}
// シャンデリア（ひかる わっか）
export function chandelier(B, x, z, s = 2) {
  B.deco('dark', x, 3.1, z, s + 0.6, 0.12, s + 0.6);
  B.deco('light', x, 2.85, z, s, 0.2, s);
  B.deco('dark', x, 3.2, z, 0.08, 0.6, 0.08);
  B.lamps.push({ x, z, h: 2.85, y0: 0 });
}

export function build(builder) {
  const B = builder(36, 2201), { add, deco } = B;
  segOuter(B, [-18, -24, 18, 36], ['s'], { h: 4.2, tint: WALL });
  segOuter(B, [-18, 12, 18, 36], ['w', 'e'], { h: 4.2, tint: WALL });
  segOuter(B, [-8, -24, 8, 12], ['w', 'e'], { h: 4.2, tint: WALL });
  const rooms = [
    { name: 'げんかん ホール', b: [-18, 12, 18, 36] },
    { name: 'ながい ろうか', b: [-8, -24, 8, 12] },
  ];
  const doors = [{ x: 0, z: 12, axis: 'x' }], exit = { x: 0, z: -24, axis: 'x' };
  const T = { h: H, dw: DW, tint: WALL, trim: GOLD };
  segWall(B, 'x', 12, -18, 18, [0], T);
  segWall(B, 'x', -24, -18, 18, [0], T); // でぐちの かべ（B の いりぐちと おなじ ところ）
  segDoor(B, doors[0], 0, { h: H, dw: DW, steel: WOOD }); doorCap(B, doors[0]);
  segDoor(B, exit, 'out', { h: H, dw: DW, steel: WOOD }); doorCap(B, exit);
  B.reserve(-5, 27, 5, 35); // スタート
  // ---- へや0: げんかん ホール（だいかいだんの かざり・シャンデリア）----
  deco('plank', 0, 0.004, 24, 36, 0.02, 24, { tint: 0x4a3028 });
  deco('paint', 0, 0.03, 24, 5, 0.02, 24, { tint: RUG });
  for (let k = 0; k < 6; k++) for (const s of [-1, 1]) add('plank', s * 16.3, 0, 36 - 0.6 * (6 - k), 3.4, 0.45 * (k + 1), 1.2 * (6 - k), { tint: 0x6a4a3a });
  for (const [x, z] of [[-9, 18], [9, 18], [-9, 29], [9, 29]]) { add('wall', x, 0, z, 1.2, H, 1.2, { tint: 0x5a3e48 }); deco('plank', x, 1.0, z, 1.5, 0.2, 1.5, { tint: GOLD }); }
  chandelier(B, 0, 20); chandelier(B, 0, 30, 2.4);
  for (const z of [16, 24, 32]) for (const s of [-1, 1]) deco('ember', s * 17.95, 1.8, z, 0.06, 1.6, 0.9);
  for (const [x, z] of [[-13, 21], [13, 24]]) add('plank', x, 0, z, 1.2, 1.1, 3.4, { tint: 0x6a4a34 });
  B.crate(-6, 15, 2, 0x6a4a3a); B.crate(7, 33, 1, 0x6a4a3a);
  for (const [x, z] of [[-3, 14], [3, 14]]) candle(B, x, z);
  // ---- へや1: ながい ろうか（がくぶち・ろうそく・よろい）----
  deco('plank', 0, 0.004, -6, 16, 0.02, 36, { tint: 0x4a3028 });
  deco('paint', 0, 0.03, -6, 4.4, 0.02, 36, { tint: RUG });
  const pic = [0x3a5a7a, 0x8a5a3a, 0x4a6a4a, 0x7a4a7a];
  for (let k = 0; k < 4; k++) { const z = 8 - 8 * k; frame(B, -7.55, z, 'w', pic[k]); frame(B, 7.55, z - 4, 'e', pic[(k + 2) % 4]); }
  for (const z of [4, -4, -12, -20]) for (const s of [-1, 1]) candle(B, s * 7.1, z);
  for (const [x, z] of [[-7.1, -8], [7.1, 0], [-7.1, 8], [7.1, -16]]) { add('metal', x, 0, z, 0.8, 2.2, 0.8, { tint: 0x4a4a58 }); deco('metal', x, 2.2, z, 0.5, 0.4, 0.5, { tint: 0x6a6a78 }); }
  add('plank', 4.8, 0, -5, 3, 0.9, 1.4, { tint: 0x6a4a34 }); add('plank', -4.8, 0, -13, 1.4, 0.9, 3, { tint: 0x6a4a34 });
  B.crate(5, -20, 2, 0x6a4a3a); B.crate(-5, 5, 1, 0x6a4a3a);
  for (const z of [10, -10]) B.lamps.push({ x: 0, z, h: 3.2, y0: 0 });
  roomSpawns(B, rooms);
  return B.done(THEME, {
    backdrop: 'city', playerStart: { x: 0, z: 32, yaw: 0 },
    seg: { rooms, doors, entry: null, exit, doorW: DW, doorH: H },
  });
}
