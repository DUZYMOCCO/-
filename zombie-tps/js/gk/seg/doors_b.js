// ステージ18 セグメント B（へや2 にもつの へや → へや3 きかいの へや）。いりぐち（z=30）は A の でぐちと おなじ ばしょ（edge:'in'）
import { segWall, segDoor, roomSpawns } from './kit.js?v=26';
import { WALL, STEEL, H, DW, THEME, ring, sdoors, shelf, forklift } from './doors_a.js?v=26';

export function build(builder) {
  const B = builder(36, 1802), { add, deco } = B;
  const R2 = [-30, 2, 30, 30], R3 = [-30, -34, 30, 2];
  const sd2 = [['w', 7], ['w', 15], ['w', 23], ['e', 7], ['e', 15], ['e', 23]];
  const sd3 = [['w', -27], ['w', -17], ['w', -7], ['e', -27], ['e', -17], ['e', -7]];
  const rooms = [{ name: 'にもつの へや', b: R2 }, { name: 'きかいの へや', b: R3 }];
  const entry = { x: -24, z: 30, axis: 'x' }, doors = [{ x: 24, z: 2, axis: 'x' }], exit = { x: -12, z: -34, axis: 'x' };
  ring(B, R2, ['w', 'e'], sd2); ring(B, R3, ['w', 'e'], sd3);
  segWall(B, 'x', 30, -30, 30, [-24], { h: H, dw: DW, tint: WALL, edge: 'in' });
  segWall(B, 'x', 2, -30, 30, [24], { h: H, dw: DW, tint: WALL });
  segWall(B, 'x', -34, -30, 30, [-12], { h: H, dw: DW, tint: WALL });
  segDoor(B, entry, 'in', { h: H, dw: DW, steel: STEEL, edge: 'in' });
  segDoor(B, doors[0], 0, { h: H, dw: DW, steel: STEEL });
  segDoor(B, exit, 'out', { h: H, dw: DW, steel: STEEL });
  const spawnDoors = [...sdoors(B, R2, sd2, 0), ...sdoors(B, R3, sd3, 1)];
  // ---- へや2: にもつの へや（たなの ならび・はこの やま・フォークリフト）----
  deco('stripe', -24, 0.01, 26, 2, 0.02, 7);
  for (const [x, z] of [[-14, 14], [-2, 20], [10, 12], [18, 22]]) shelf(B, x, z, 'z', 8);
  for (const [x, z, n] of [[-22, 12, 2], [-21, 13, 1], [4, 26, 3], [22, 14, 2], [0, 8, 2], [-8, 27, 1]]) B.crate(x, z, n, 0x9a7a4a);
  forklift(B, -6, 24, 'x'); forklift(B, 16, 7, 'z');
  for (const [x, z] of [[24, 27], [-24, 4]]) B.barrel(x, z, 0x6a7a8a);
  for (const [x, z] of [[-20, 20], [0, 14], [20, 26]]) B.lamp(x, z);
  // ---- へや3: きかいの へや（おおきな きかい・パイプ）----
  const mach = (x, z, w = 4, d = 3) => {
    add('metal', x, 0, z, w, 2.4, d, { tint: 0x56606e });
    deco('dark', x, 2.4, z, w - 1, 0.5, d - 1);
    deco('light', x, 1.4, z + d / 2 + 0.01, w - 1.4, 0.3, 0.03);
    add('metal', x + w / 2 - 0.6, 2.9, z, 0.5, 1.1, 0.5, { tint: STEEL });
  };
  for (const [x, z, w, d] of [[14, -12, 4, 3], [-6, -8, 4, 3], [-20, -18, 4, 3], [6, -24, 5, 3], [-22, -28, 4, 3], [22, -26, 3, 4]]) mach(x, z, w, d);
  deco('stripe', 0, 0.01, -16, 0.5, 0.02, 32);
  deco('dark', 0, 0.02, -10, 48, 0.1, 1.2);
  for (const z of [-6, -20]) deco('metal', 0, 3.4, z, 56, 0.3, 0.3, { tint: STEEL });
  for (const [x, z] of [[-26, -2], [26, -30]]) B.barrel(x, z, 0x5a6a7a);
  for (const [x, z] of [[-12, -2], [10, -4], [-8, -22], [18, -18]]) B.lamp(x, z);
  roomSpawns(B, rooms);
  return B.done(THEME, { backdrop: 'office', playerStart: null, seg: { rooms, doors, entry, exit, doorW: DW, doorH: H, spawnDoors } });
}
