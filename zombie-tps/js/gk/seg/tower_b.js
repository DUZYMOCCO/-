// ステージ5 セグメント B（3かい → 4かい）。いりぐち（z=12 の かべ）は A の でぐちと おなじ ばしょ
// 3かい ゆか 6m、4かい ゆか 9m。でぐち（z=-36 の かべ）で C（おくじょう）に つながる
import { segWall, segOuter, segDoor, roomSpawns } from './kit.js?v=40';
import { WALL, STEEL, H, DW, THEME, SLAB, wallOpt, windowAt, banner, pillar, crates, torch } from './tower_a.js?v=40';

export function build(builder) {
  const B = builder(36, 5102), { half } = B;
  const o = { h: 4.2, tint: WALL, mat: 'brick' };
  segOuter(B, [-half, -12, half, 12], ['w', 'e'], { ...o, y0: 6 });
  segOuter(B, [-half, -half, half, -12], ['w', 'e'], { ...o, y0: 9 });
  const rooms = [
    { name: '3かい', b: [-half, -12, half, 12], y: 6 },
    { name: '4かい', b: [-half, -half, half, -12], y: 9 },
  ];
  const entry = { x: 24, z: 12, axis: 'x', y: 3 }, doors = [{ x: -24, z: -12, axis: 'x', y: 6 }], exit = { x: 24, z: -36, axis: 'x', y: 9 };
  segWall(B, 'x', 12, -half, half, [24], { ...wallOpt, y0: 6, gapY: 3, edge: 'in' });
  segWall(B, 'x', -12, -half, half, [-24], { ...wallOpt, y0: 9, gapY: 6 });
  segWall(B, 'x', -36, -half, half, [24], { ...wallOpt, y0: 12, gapY: 9 }); // でぐち（C の いりぐちと おなじ）
  segDoor(B, entry, 'in', { h: H, dw: DW, steel: STEEL, edge: 'in' });
  segDoor(B, doors[0], 0, { h: H, dw: DW, steel: STEEL });
  segDoor(B, exit, 'out', { h: H, dw: DW, steel: STEEL });
  B.slab(-half, -12, half, 12, 6, [[21, 3, 27, 12]], SLAB);
  B.slab(-half, -half, half, -12, 9, [[-27, -21, -21, -12]], SLAB);
  B.ramp({ along: 'z', from: 12, to: 3, lat: [21, 27], y0: 3, y1: 6, mat: 'concrete', tint: 0x6a5a70, walk: true, rail: 'metal' });
  B.ramp({ along: 'z', from: -12, to: -21, lat: [-27, -21], y0: 6, y1: 9, mat: 'concrete', tint: 0x6a5a70, walk: true, rail: 'metal' });
  // ---- 3かい: はしらの ならぶ ろうか ----
  for (const x of [-4, 8, 18]) pillar(B, x, 4, 6);
  for (const x of [-16, 2]) pillar(B, x, -4, 6);
  for (const [x, z, n] of [[12, -2, 2], [-28, 4, 2], [-10, 6, 1], [30, -4, 1]]) crates(B, x, z, 6, n);
  for (const [x, z] of [[-32, 9], [33, -8]]) B.barrel(x, z, 0x6a3a4a);
  for (const [x, z] of [[-34, 10], [34, -10], [0, 10.6]]) torch(B, x, z, 6);
  for (const x of [-26, -6, 14]) windowAt(B, x, 11.6, 's', 6);
  for (const z of [-4, 4]) windowAt(B, -36, z, 'w', 6);
  for (const x of [-16, 4]) banner(B, x, 11.6, 's', 6);
  B.lamp(-18, 0, 'dark', 6); B.lamp(10, 0, 'dark', 6);
  // ---- 4かい ----
  for (const x of [-10, 4, 18]) pillar(B, x, -28, 9);
  for (const x of [-16, 10]) pillar(B, x, -20, 9);
  for (const [x, z, n] of [[0, -24, 1], [26, -26, 2], [-32, -30, 2], [14, -32, 1], [34, -16, 1]]) crates(B, x, z, 9, n);
  for (const [x, z] of [[32, -22], [-30, -16]]) B.barrel(x, z, 0x6a3a4a);
  for (const [x, z] of [[-34, -14], [34, -34], [-34, -34]]) torch(B, x, z, 9);
  for (const x of [-28, -8, 12]) windowAt(B, x, -12.4, 'n', 9);
  for (const z of [-30, -22]) windowAt(B, 36, z, 'e', 9);
  for (const x of [-18, 2]) banner(B, x, -12.4, 'n', 9);
  B.lamp(-4, -22, 'dark', 9); B.lamp(24, -22, 'dark', 9);
  roomSpawns(B, rooms);
  return B.done(THEME, { vertical: true, backdrop: 'rooftop', playerStart: null, seg: { rooms, doors, entry, exit, doorW: DW, doorH: H } });
}
