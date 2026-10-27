// ステージ2 セグメント B（へや2 しょくどう → へや3 しょさい）
// いりぐち（z=12 の かべの ドア）は セグメント A の でぐちと おなじ ばしょ（edge:'in'）。でぐちは z=-34
import { segWall, segOuter, segDoor, roomSpawns } from './kit.js?v=21';
import { WALL, WOOD, GOLD, RUG, H, DW, THEME, candle, frame, doorCap, shelf, chandelier } from './manor_a.js?v=21';

export function build(builder) {
  const B = builder(36, 2202), { add, deco } = B;
  segOuter(B, [-18, -34, 18, 12], ['w', 'e'], { h: 4.2, tint: WALL });
  const rooms = [
    { name: 'しょくどう', b: [-18, -12, 18, 12] },
    { name: 'しょさい', b: [-18, -34, 18, -12] },
  ];
  const entry = { x: 0, z: 12, axis: 'x' }, doors = [{ x: -10, z: -12, axis: 'x' }], exit = { x: 10, z: -34, axis: 'x' };
  const T = { h: H, dw: DW, tint: WALL, trim: GOLD };
  segWall(B, 'x', 12, -18, 18, [0], { ...T, edge: 'in' });
  segWall(B, 'x', -12, -18, 18, [-10], T);
  segWall(B, 'x', -34, -18, 18, [10], T);
  segDoor(B, entry, 'in', { h: H, dw: DW, steel: WOOD, edge: 'in' }); doorCap(B, entry, { edge: 'in' });
  segDoor(B, doors[0], 0, { h: H, dw: DW, steel: WOOD }); doorCap(B, doors[0]);
  segDoor(B, exit, 'out', { h: H, dw: DW, steel: WOOD }); doorCap(B, exit);
  // ---- へや2: しょくどう（ながい テーブル・いす・だんろ）----
  deco('plank', 0, 0.004, 0, 36, 0.02, 24, { tint: 0x4a3028 });
  deco('paint', 5, 0.03, 0, 7, 0.02, 15, { tint: RUG });
  add('plank', 5, 0.7, 0, 2.8, 0.2, 13, { tint: 0x7a5a3a });
  for (const z of [-5.5, 5.5]) add('dark', 5, 0, z, 2.0, 0.7, 0.4);
  for (let k = 0; k < 5; k++) for (const s of [-1, 1]) { const z = -5 + k * 2.5; deco('plank', 5 + s * 2.1, 0, z, 0.6, 0.55, 0.6, { tint: 0x5a3a2a }); deco('plank', 5 + s * 2.4, 0.55, z, 0.1, 0.7, 0.6, { tint: 0x5a3a2a }); }
  for (const z of [-3, 0, 3]) { deco('light', 5, 0.9, z, 0.2, 0.3, 0.2); candle(B, 5, z + 1.5); }
  add('brick', 16.8, 0, 0, 2.4, 3.2, 6, { tint: 0x6a4a4a }); deco('ember', 15.55, 0.3, 0, 0.06, 1.1, 2.2);
  deco('plank', 15.5, 1.5, 0, 0.3, 0.2, 6.6, { tint: GOLD });
  add('brick', 16.8, 3.2, 0, 1.2, 0.6, 2.4, { tint: 0x6a4a4a }); B.lamps.push({ x: 15, z: 0, h: 0.9, y0: 0 });
  chandelier(B, 5, 0, 2.4); chandelier(B, -9, -2, 1.6);
  for (const z of [-7, 0, 7]) deco('ember', -17.95, 1.8, z, 0.06, 1.6, 0.9);
  for (const [x, z, a] of [[-16.8, 5, 'z'], [-16.8, -6, 'z'], [-5, 10.6, 'x']]) add('plank', x, 0, z, a === 'z' ? 1.2 : 4, 1.2, a === 'z' ? 4 : 1.2, { tint: 0x6a4a34 });
  for (const [x, z] of [[-13, 4], [-13, -5], [12, 9], [12, -9]]) add('wall', x, 0, z, 1.0, H, 1.0, { tint: 0x5a3e48 });
  B.crate(-9, 8, 2, 0x6a4a3a); B.crate(10, -3, 1, 0x6a4a3a);
  frame(B, 17.55, 8, 'e', 0x4a6a4a); frame(B, 17.55, -8, 'e', 0x7a4a7a);
  // ---- へや3: しょさい（ほんだなの れつ・つくえ・ちきゅうぎ）----
  deco('plank', 0, 0.004, -23, 36, 0.02, 22, { tint: 0x42301f });
  deco('paint', -2, 0.03, -23, 8, 0.02, 18, { tint: RUG });
  for (const x of [-14, -10.8]) shelf(B, x, -19, 'x');
  for (const x of [14, 10.8, 7.6]) shelf(B, x, -26, 'x');
  for (const x of [-14.4, -11.2, -8, -4.8, -1.6, 1.6]) shelf(B, x, -33.2, 'x');
  for (const z of [-30, -26.8, -23.6]) shelf(B, -17.2, z, 'z');
  for (const z of [-17, -20.2]) shelf(B, 17.2, z, 'z');
  add('plank', -8, 0, -29, 3.6, 0.95, 1.6, { tint: 0x6a4a34 }); deco('light', -8.8, 0.95, -29, 0.4, 0.4, 0.4); deco('paint', -7.2, 0.95, -29, 1.0, 0.04, 0.7, { tint: 0xc8b890 });
  deco('plank', -8, 0, -27.6, 0.7, 0.5, 0.7, { tint: 0x5a3a2a });
  add('dark', 4, 0, -16, 0.6, 1.0, 0.6); deco('glass', 4, 1.0, -16, 0.9, 0.9, 0.9, { tint: 0x3a6a9a }); deco('metal', 4, 1.45, -16, 1.2, 0.06, 0.06, { tint: GOLD });
  for (const [x, z] of [[-4, -22], [12, -31]]) candle(B, x, z);
  chandelier(B, 0, -22, 2); chandelier(B, 8, -16, 1.4);
  for (const [x, z] of [[-17.95, -17], [17.95, -24], [17.95, -30]]) deco('ember', x, 1.8, z, 0.06, 1.6, 0.9);
  B.crate(2, -29, 1, 0x6a4a3a);
  roomSpawns(B, rooms);
  return B.done(THEME, { backdrop: 'city', playerStart: null, seg: { rooms, doors, entry, exit, doorW: DW, doorH: H } });
}
