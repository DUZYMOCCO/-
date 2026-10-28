// ステージ4 セグメント B（へや2 しゃこ → へや3 へんでんしょ・ボス）
// いりぐち（x=-32 の かべの ドア）は A の でぐちと おなじ ばしょ → A が ある あいだは A の かべを つかう（edge:'in'）
import { segWall, segOuter, segDoor, roomSpawns } from './kit.js?v=29';
import { WALL, STEEL, H, DW, THEME } from './subway_a.js?v=29';

export function build(builder) {
  const B = builder(36, 4002), { add, deco } = B;
  segOuter(B, [-32, -20, 36, 20], ['n', 's', 'e'], { h: 4.2, tint: WALL });
  const rooms = [
    { name: 'しゃこ', b: [-32, -20, 4, 20] },
    { name: 'へんでんしょ', b: [4, -20, 36, 20] },
  ];
  const entry = { x: -32, z: 8, axis: 'z' }, doors = [{ x: 4, z: -8, axis: 'z' }];
  segWall(B, 'z', -32, -20, 20, [8], { h: H, dw: DW, tint: WALL, edge: 'in' });
  segWall(B, 'z', 4, -20, 20, [-8], { h: H, dw: DW, tint: WALL });
  segDoor(B, entry, 'in', { h: H, dw: DW, steel: STEEL, edge: 'in' });
  segDoor(B, doors[0], 0, { h: H, dw: DW, steel: STEEL });
  // ---- へや2: しゃこ（とまった でんしゃ・せいびだい）----
  const car = (cx, cz, len, tint) => {
    add('metal', cx, 0.4, cz, len, 2.8, 3.0, { tint });
    for (const s of [-1, 1]) {
      deco('glass', cx, 1.7, cz + s * 1.51, len - 2, 0.7, 0.04, { tint: 0x8a9a6a });
      deco('stripe', cx, 0.8, cz + s * 1.51, len, 0.3, 0.04);
    }
    deco('dark', cx, 0, cz, len - 1, 0.4, 2.4);
  };
  car(-24, 13, 14, 0x4a5a6a); car(-8, 13, 14, 0x5a5a6a); car(-16, -13, 14, 0x4a5a6a); car(-1, -13, 6, 0x5a5a6a);
  for (const [x, z] of [[-26, -3], [-8, 1]]) { add('metal', x, 0, z, 3, 0.9, 1.5, { tint: 0x7a7a5a }); deco('stripe', x, 0.9, z, 3, 0.05, 1.5); }
  for (const [x, z] of [[-14, 2], [-28, -9], [-2, 6]]) add('concrete', x, 0, z, 0.8, 3.8, 0.8, { tint: 0x4e565e });
  for (const [x, z] of [[-30, 16], [-2, -4]]) B.barrel(x, z, 0x6a7a4a);
  B.crate(-18, 4, 2, 0x5a6a78); B.crate(-30, -17, 1, 0x5a6a78);
  deco('ember', 3.6, 3.0, 8, 0.1, 0.25, 6); deco('ember', -10, 3.2, -19.55, 6, 0.25, 0.1);
  for (const [x, z] of [[-26, 2], [-6, -4]]) B.lamp(x, z);
  // ---- へや3: へんでんしょ（ボス・ひろい）----
  const trf = (x, z, s = 3.4) => {
    add('metal', x, 0, z, s, 3.0, s, { tint: 0x5a646e });
    deco('stripe', x, 0.5, z, s + 0.04, 0.6, s + 0.04);
    deco('light', x, 1.8, z + s / 2 + 0.01, s - 1, 0.8, 0.03);
    deco('dark', x, 3.0, z, s + 0.4, 0.3, s + 0.4);
  };
  for (const [x, z] of [[9, -16], [9, 16], [31, -16], [31, 16], [20, -17]]) trf(x, z);
  for (const z of [-8, 0, 8]) deco('light', 35.9, 1.6, z, 0.04, 1.2, 2);
  deco('stripe', 20, 0.006, 0, 0.3, 0.02, 36);
  for (const [x, z] of [[14, -5], [26, 5], [26, -8], [14, 9]]) B.crate(x, z, 1, 0x6a6a5a);
  for (const [x, z] of [[34, 0], [7, 0]]) B.barrel(x, z, 0x6a7a4a);
  deco('ember', 20, 3.5, 19.55, 8, 0.25, 0.1); deco('ember', 20, 3.5, -19.55, 8, 0.25, 0.1);
  for (const [x, z] of [[14, -12], [26, 12], [20, 0]]) B.lamp(x, z);
  roomSpawns(B, rooms);
  return B.done(THEME, { backdrop: 'office', playerStart: null, seg: { rooms, doors, entry, exit: null, doorW: DW, doorH: H } });
}
