// ステージ17 セグメント B（へや2 すてられた キャンプ → へや3 すなの ひろば・ボス）
// いりぐち（z=34 の かべの ドア x=-6）は A の でぐちと おなじ ばしょ（edge:'in'）
import { segWall, segOuter, segDoor, roomSpawns } from './kit.js?v=20';
import { ROCK, ROCK2, SAND, H, DW, WH, DOOR, THEME, W, rock, cactus, bush, canyon } from './dawn_a.js?v=20';

export function build(builder) {
  const B = builder(36, 1702), { add, deco } = B;
  segOuter(B, [-16, -34, 16, 34], ['n', 'w', 'e'], { h: WH, tint: ROCK, mat: 'dirt' });
  const rooms = [
    { name: 'すてられた キャンプ', b: [-16, -2, 16, 34] },
    { name: 'すなの ひろば', b: [-16, -34, 16, -2] },
  ];
  const entry = { x: -6, z: 34, axis: 'x' }, doors = [{ x: 6, z: -2, axis: 'x' }];
  segWall(B, 'x', 34, -16, 16, [-6], { ...W, edge: 'in' });
  segWall(B, 'x', -2, -16, 16, [6], W);
  segDoor(B, entry, 'in', { h: H, dw: DW, steel: DOOR, edge: 'in' });
  segDoor(B, doors[0], 0, { h: H, dw: DW, steel: DOOR });
  canyon(B, -34, 34);
  deco('dirt', 0, 0.004, 14, 28, 0.02, 34, { tint: SAND });
  deco('dirt', 0, 0.004, -18, 30, 0.02, 30, { tint: 0xd0b078 });
  // ---- へや2: すてられた キャンプ（テント・たきびの あと・こわれた こや）----
  B.tent(-10, 24, 'x', 0xb8a070); B.tent(11, 26, 'z', 0x9a8a5a); B.tent(-11, 10, 'z', 0xa89060, true);
  // たきびの あと（くろい まるたと おきび）
  for (const [x, z, sx, sz] of [[0, 17, 2.2, 0.4], [0, 17, 0.4, 2.2], [0.8, 17.8, 1.6, 0.3]]) deco('dark', x, 0, z, sx, 0.35, sz);
  deco('ember', 0, 0.1, 17, 0.6, 0.12, 0.6);
  for (const [x, z] of [[-3, 14], [3, 20]]) add('log', x, 0, z, 1.6, 0.5, 0.6, { tint: 0x7a5a38 });
  B.ruin(8, 8, 9, 7, 'plank', 1703);
  B.crate(-6, 28, 2, 0x9a7a4a); B.crate(6, 30, 1, 0x9a7a4a); B.barrel(-11, 18, 0x7a6a4a); B.barrel(11, 18, 0x7a6a4a);
  rock(B, 3, 26, 2.4, 1.4, 2); rock(B, -11, 3, 2.6, 1.6, 2.6);
  cactus(B, 11, 32, 1); cactus(B, -12, 32, 0.9);
  for (const [x, z] of [[-4, 8], [4, 4], [13, 22], [-8, 18]]) bush(B, x, z);
  // ---- へや3: すなの ひろば（ボス・ひらけた すなじ・いわが すこし）----
  rock(B, -11, -12, 3.2, 1.8, 3); rock(B, 11, -16, 3.6, 2, 3); rock(B, -9, -27, 3, 1.6, 2.6); rock(B, 10, -29, 2.6, 1.4, 2.6); rock(B, 0, -21, 2.2, 1.2, 2.2);
  cactus(B, -14, -20, 1); cactus(B, 14, -7, 0.9);
  for (const [x, z] of [[4, -10], [-5, -17], [6, -24]]) bush(B, x, z);
  roomSpawns(B, rooms);
  return B.done(THEME, { backdrop: 'camp', playerStart: null, seg: { rooms, doors, entry, exit: null, doorW: DW, doorH: H } });
}
