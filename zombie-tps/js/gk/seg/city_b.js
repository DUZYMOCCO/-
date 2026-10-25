// ステージ3 セグメント B（へや2 ちゅうしゃじょう → へや3 ひろば・ボス）
// いりぐち（z=12 の かべの ドア）は A の でぐちと おなじ ばしょ → edge:'in'
import { segWall, segOuter, segDoor, roomSpawns } from './kit.js?v=20';
import { WALL, STEEL, H, DW, THEME, puddle } from './city_a.js?v=20';

export function build(builder) {
  const B = builder(36, 3302), { add, deco, half } = B;
  segOuter(B, [-half, -half, half, 12], ['n', 'w', 'e'], { h: 4.2, tint: WALL, mat: 'brick' });
  const rooms = [
    { name: 'ちゅうしゃじょう', b: [-half, -12, half, 12] },
    { name: 'ひろば', b: [-half, -half, half, -12] },
  ];
  const entry = { x: 30, z: 12, axis: 'x' }, doors = [{ x: -30, z: -12, axis: 'x' }];
  segWall(B, 'x', 12, -half, half, [30], { h: H, dw: DW, tint: WALL, mat: 'brick', edge: 'in' });
  segWall(B, 'x', -12, -half, half, [-30], { h: H, dw: DW, tint: WALL, mat: 'brick' });
  segDoor(B, entry, 'in', { h: H, dw: DW, steel: STEEL, edge: 'in' });
  segDoor(B, doors[0], 0, { h: H, dw: DW, steel: STEEL });
  // ---- へや2: ちゅうしゃじょう（コンクリートの はしら・とまった くるま）----
  deco('concrete', 0, 0.004, 0, 70, 0.02, 22, { tint: 0x56606a });
  for (let x = -28; x <= 28; x += 8) for (const z of [-6, 6]) add('concrete', x, 0, z, 1.2, 3.8, 1.2, { tint: 0x7a8088 });
  for (let x = -32; x <= 32; x += 8) { deco('paint', x, 0.03, 9.5, 0.12, 0.02, 4); deco('paint', x, 0.03, -9.5, 0.12, 0.02, 4); }
  const cols = [0x5a4a50, 0x4a5a6a, 0x6a6a52, 0x58606a];
  [-22, -14, -6, 2, 10, 18].forEach((x, i) => { B.car(x, 9.5, 'z', cols[i % 4]); });
  [-14, -6, 2, 10, 18, 26].forEach((x, i) => { B.car(x, -9.5, 'z', cols[(i + 1) % 4]); });
  B.van(-12, 0.6, 'x', 0x7a8088, 0x5a6a8a);
  for (const [x, z] of [[8, 0.5], [22, -1]]) add('concrete', x, 0, z, 2.4, 0.8, 0.6, { tint: 0x8a8a84 });
  for (const [x, z, s] of [[-24, 1, 4], [0, -2, 3], [20, 3, 3]]) puddle(B, x, z, s);
  deco('stripe', 0, 3.4, -11.7, 70, 0.4, 0.1);
  for (const [x, z] of [[-30, 0], [-16, 3], [-2, -3], [14, 2], [28, -2]]) B.lamp(x, z);
  // ---- へや3: ひろば（ふんすいの あと・ベンチ・がいとう・みずたまり）ボス ----
  deco('cobble', 0, 0.004, -24, 70, 0.02, 22, { tint: 0x56606a });
  add('concrete', 0, 0, -24, 6, 0.9, 6, { tint: 0x7a8088 });
  deco('water', 0, 0.92, -24, 4.8, 0.03, 4.8, { tint: 0x4a6078 });
  add('concrete', 0, 0.9, -24, 1.0, 1.8, 1.0, { tint: 0x7a8088 });
  for (const [x, z] of [[-18, -18], [18, -18], [-18, -30], [18, -30]]) add('concrete', x, 0, z, 2, 3.8, 2, { tint: 0x7a8088 });
  for (const [x, z, a] of [[-27, -17, 'x'], [27, -17, 'x'], [-9, -32, 'x'], [9, -32, 'x']]) {
    add('plank', x, 0, z, a === 'x' ? 2 : 0.6, 0.5, a === 'x' ? 0.6 : 2, { tint: 0x4a3a30 });
  }
  for (const [x, z] of [[-32, -26], [32, -28]]) B.barrel(x, z, 0x5a6a7a);
  for (const [x, z, s] of [[-10, -20, 4], [11, -28, 4], [-26, -30, 3], [26, -22, 3]]) puddle(B, x, z, s);
  for (const [x, z] of [[-30, -16], [30, -16], [-30, -33], [30, -33], [0, -15]]) B.lamp(x, z);
  roomSpawns(B, rooms);
  return B.done(THEME, { backdrop: 'city', playerStart: null, seg: { rooms, doors, entry, exit: null, doorW: DW, doorH: H } });
}
