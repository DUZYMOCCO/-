// v0.18.0: ステージ15 セグメント B（へや2 こうじょうの ライン → へや3 こおりの じっけんしつ）
// いりぐち（x=-36 の かべの ドア）は A の でぐちと おなじ ばしょ（edge:'in'）
import { segWall, segOuter, segDoor, roomSpawns } from './kit.js?v=29';
import { WALL, STEEL, H, DW, THEME, tank, vent } from './core_a.js?v=29';

const YEL = 0xe0b020;
export function build(builder) {
  const B = builder(36, 1702), { add, deco } = B;
  segOuter(B, [-36, -18, 36, 18], ['n', 's'], { h: 4.2, tint: WALL });
  const rooms = [
    { name: 'こうじょうの ライン', b: [-36, -18, 0, 18] },
    { name: 'こおりの じっけんしつ', b: [0, -18, 36, 18] },
  ];
  const entry = { x: -36, z: 0, axis: 'z' }, doors = [{ x: 0, z: -8, axis: 'z' }], exit = { x: 36, z: 0, axis: 'z' };
  segWall(B, 'z', -36, -18, 18, [0], { h: H, dw: DW, tint: WALL, edge: 'in' });
  segWall(B, 'z', 0, -18, 18, [-8], { h: H, dw: DW, tint: WALL });
  segWall(B, 'z', 36, -18, 18, [0], { h: H, dw: DW, tint: WALL });
  segDoor(B, entry, 'in', { h: H, dw: DW, steel: STEEL, edge: 'in' });
  segDoor(B, doors[0], 0, { h: H, dw: DW, steel: STEEL });
  segDoor(B, exit, 'out', { h: H, dw: DW, steel: STEEL });
  // ---- へや2: こうじょうの ライン（ベルトコンベア・パイプ）----
  deco('metal', -18, 0.004, 0, 34, 0.02, 34, { tint: 0x707a74 });
  for (const z of [-3.5, 3.5]) deco('stripe', -18, 0.03, z, 32, 0.02, 0.5);
  for (const [x, z] of [[-20, -10], [-16, 10]]) {
    add('dark', x, 0.5, z, 20, 0.5, 1.6); add('metal', x, 0, z, 19, 0.5, 1.2, { tint: YEL });
    deco('stripe', x, 1.01, z, 20, 0.02, 1.2);
    for (let k = -9; k <= 9; k += 3) { deco('metal', x + k, 1.0, z, 0.15, 0.03, 1.5, { tint: 0x3a3e3c }); add('crate', x + k + 0.6, 1.0, z, 0.8, 0.8, 0.8, { tint: 0xb0b8b0 }); }
  }
  for (const [x, z] of [[-32, -6], [-8, 14], [-6, 2], [-32, 14]]) add('metal', x, 0, z, 0.8, H, 0.8, { tint: YEL });
  deco('metal', -18, 3.2, -6, 34, 0.35, 0.35, { tint: YEL }); deco('metal', -18, 3.2, 6, 34, 0.35, 0.35, { tint: YEL });
  add('metal', -30, 0, 14, 4, 2.4, 3, { tint: YEL }); deco('stripe', -30, 2.4, 14, 4.1, 0.2, 3.1);
  for (const [x, z] of [[-5, -3.5], [-31, 6]]) B.barrel(x, z, 0x3aa84a);
  B.crate(-33, -14, 2, 0xc8b060);
  for (const [x, z] of [[-26, 0], [-12, -2], [-26, 17]]) B.lamp(x, z);
  for (const [x, z] of [[-24, 1], [-11, -1], [-18, 13]]) vent(B, x, z);
  // ---- へや3: こおりの じっけんしつ ----
  deco('glass', 18, 0.004, 0, 34, 0.02, 34, { tint: 0x9fd4f0 });
  for (const [x, z, w, h, d] of [[8, -14, 3, 2.4, 2.6], [14, -2, 2.4, 1.6, 2.4], [23, -3, 2.6, 2.2, 2.2], [6, 14, 3, 1.8, 2.4], [24, 14, 2.6, 2.6, 2.4], [31, -9, 2.4, 1.8, 2.4]]) {
    add('glass', x, 0, z, w, h, d, { tint: 0xbfe8ff }); deco('glass', x, h, z, w * 0.6, 0.5, d * 0.6, { tint: 0xe4f6ff });
  }
  for (const [x, z] of [[4, 9], [18, -15], [28, 5]]) add('concrete', x, 0, z, 1.6, 0.5, 1.4, { tint: 0xf0f6ff });
  for (const [x, z] of [[33, -14], [33, 14], [17, 15]]) tank(B, x, z, 1.6, 2.4, 0x8ad8ff);
  for (const [x, z] of [[2, 0], [18, 5], [30, -2]]) B.lamp(x, z);
  for (const [x, z] of [[10, 10], [20, -9], [26, 8]]) vent(B, x, z);
  roomSpawns(B, rooms);
  return B.done(THEME, {
    backdrop: 'hospital', playerStart: null,
    seg: { rooms, doors, entry, exit, doorW: DW, doorH: H, vents: [[-24, 1, 0], [-11, -1, 0], [-18, 13, 0], [10, 10, 1], [20, -9, 1], [26, 8, 1]].map(([x, z, room]) => ({ x, z, r: 1.6, room })) },
  });
}
