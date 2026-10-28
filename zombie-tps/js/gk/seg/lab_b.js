// v0.17.0: ステージ1 セグメント B（へや2 タンクの ホール → へや3 ちかの じっけんしつ・ボス）
// いりぐち（z=12 の かべの ドア）は セグメント A の でぐちと おなじ ばしょ → A が ある あいだは A の かべを つかう（edge:'in'）
import { segWall, segOuter, segDoor, roomSpawns } from './kit.js?v=28';
import { WALL, STEEL, GOO, H, DW, THEME } from './lab_a.js?v=28';

export function build(builder) {
  const B = builder(36, 1602), { add, deco, half } = B;
  segOuter(B, [-half, -half, half, 12], ['n', 'w', 'e'], { h: 4.2, tint: WALL });
  const rooms = [
    { name: 'タンクの ホール', b: [-half, -12, half, 12] },
    { name: 'ちかの じっけんしつ', b: [-half, -half, half, -12] },
  ];
  const entry = { x: 30, z: 12, axis: 'x' }, doors = [{ x: -30, z: -12, axis: 'x' }];
  segWall(B, 'x', 12, -half, half, [30], { h: H, dw: DW, tint: WALL, edge: 'in' });
  segWall(B, 'x', -12, -half, half, [-30], { h: H, dw: DW, tint: WALL });
  segDoor(B, entry, 'in', { h: H, dw: DW, steel: STEEL, edge: 'in' });
  segDoor(B, doors[0], 0, { h: H, dw: DW, steel: STEEL });
  // みどりの えきの タンク
  const tank = (x, z, s = 1.6, h = 2.6) => {
    add('metal', x, 0, z, s + 0.3, 0.4, s + 0.3, { tint: STEEL });
    add('glass', x, 0.4, z, s, h, s);
    deco('water', x, 0.45, z, s - 0.3, h * 0.72, s - 0.3, { tint: GOO });
    add('metal', x, 0.4 + h, z, s + 0.3, 0.35, s + 0.3, { tint: STEEL });
    deco('metal', x, 0.75 + h, z, 0.3, H - 1.1 - h, 0.3, { tint: STEEL });
  };
  // ---- へや2: タンクの ホール ----
  deco('tile', 0, 0.004, 0, 70, 0.02, 22, { tint: 0xb8c4c8 });
  for (const x of [-22, -14, -6, 2, 10, 18]) for (const z of [-5, 5]) tank(x + (z > 0 ? 3 : 0), z);
  deco('metal', 0, H - 0.6, -5, 64, 0.3, 0.3, { tint: STEEL }); deco('metal', 0, H - 0.6, 5, 64, 0.3, 0.3, { tint: STEEL });
  for (const [x, z, s] of [[-10, 0, 3], [14, -1, 2.4], [26, 6, 2]]) deco('water', x, 0.02, z, s, 0.04, s * 0.8, { tint: GOO });
  // ---- へや3: ちかの じっけんしつ（ボス）----
  tank(0, -24, 3, 3.2);
  for (const a of [0, 1, 2, 3, 4, 5]) { const t = a / 6 * Math.PI * 2; tank(Math.cos(t) * 11, -24 + Math.sin(t) * 7.5, 1.4, 2.2); }
  for (const [x, z, s] of [[-20, -20, 3], [20, -28, 2.6]]) deco('water', x, 0.02, z, s, 0.04, s * 0.8, { tint: GOO });
  for (const [x, z, n] of [[-28, -30, 2], [28, -18, 1], [24, -32, 2], [-24, -16, 1]]) B.crate(x, z, n, 0xd8dde2);
  for (const [x, z] of [[-31, -24], [31, -26]]) B.barrel(x, z, 0x3aa84a);
  for (const [x, z] of [[-26, 0], [6, 0], [28, -2], [-14, -28], [14, -20]]) B.lamp(x, z);
  B.perch([[-30, 6], [30, -6], [-30, -30], [30, -30]], 2);
  roomSpawns(B, rooms);
  return B.done(THEME, { backdrop: 'hospital', playerStart: null, seg: { rooms, doors, entry, exit: null, doorW: DW, doorH: H } });
}
