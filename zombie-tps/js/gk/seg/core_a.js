// v0.18.0: ステージ15「さいごの けんきゅうじょ」 セグメント A（へや0 さいごの いりぐち → へや1 びょうとうの ろうか）
// よこに ならぶ 2へや。でぐちは x=36 の かべの ドア（z=0）。ガスの あな（vents）は ゆかの こうし
import { segWall, segOuter, segDoor, roomSpawns } from './kit.js?v=26';
import { bench, WALL, WHITE, STEEL, GOO, H, DW } from './lab_a.js?v=26';
export { WALL, STEEL, H, DW };
export const THEME = { ground: 'concrete', tint: 0x4a6a5a, k: 0.35, far: 'hospital', farTint: 0x6a8a7a };
// みどりの えきの タンク（c = えきの いろ）
export const tank = (B, x, z, s = 1.6, h = 2.6, c = GOO) => {
  B.add('metal', x, 0, z, s + 0.3, 0.4, s + 0.3, { tint: STEEL });
  B.add('glass', x, 0.4, z, s, h, s);
  B.deco('water', x, 0.45, z, s - 0.3, h * 0.72, s - 0.3, { tint: c });
  B.add('metal', x, 0.4 + h, z, s + 0.3, 0.35, s + 0.3, { tint: STEEL });
  B.deco('metal', x, 0.75 + h, z, 0.3, H - 1.1 - h, 0.3, { tint: STEEL });
};
// ガスの あな（ゆかの こうし）
export const vent = (B, x, z) => {
  B.deco('dark', x, 0.01, z, 2.4, 0.05, 2.4);
  for (let k = -1.5; k <= 1.5; k++) B.deco('metal', x, 0.06, z + k * 0.5, 2.0, 0.04, 0.12, { tint: 0x5a6a62 });
};
const bed = (B, x, z) => {
  B.add('metal', x, 0, z, 2.2, 0.6, 1, { tint: WHITE });
  B.deco('tile', x - 0.8, 0.6, z, 0.5, 0.15, 0.7, { tint: 0xe8f0ea });
};
const curtain = (B, x, z) => B.add('tent', x, 0, z, 0.15, 2.2, 3, { tint: 0xa8d0b8 });

export function build(builder) {
  const B = builder(36, 1701), { add, deco } = B;
  segOuter(B, [-36, -18, 36, 18], ['n', 's', 'w'], { h: 4.2, tint: WALL });
  const rooms = [
    { name: 'さいごの いりぐち', b: [-36, -18, 0, 18] },
    { name: 'びょうとうの ろうか', b: [0, -18, 36, 18] },
  ];
  const doors = [{ x: 0, z: 8, axis: 'z' }], exit = { x: 36, z: 0, axis: 'z' };
  segWall(B, 'z', 0, -18, 18, [8], { h: H, dw: DW, tint: WALL });
  segWall(B, 'z', 36, -18, 18, [0], { h: H, dw: DW, tint: WALL }); // でぐちの かべ（B の いりぐちと おなじ）
  segDoor(B, doors[0], 0, { h: H, dw: DW, steel: STEEL });
  segDoor(B, exit, 'out', { h: H, dw: DW, steel: STEEL });
  B.reserve(-34, -4, -26, 4);
  // ---- へや0: さいごの いりぐち（けんきゅうしつ）----
  deco('tile', -18, 0.004, 0, 34, 0.02, 34, { tint: 0xc0cccc });
  add('metal', -18, 0, -14, 7, 1.1, 1.4, { tint: WHITE }); deco('light', -18, 1.1, -13.25, 5, 0.12, 0.05);
  for (const [x, z, a] of [[-26, -9, 'x'], [-11, -10, 'x'], [-26, 10, 'x'], [-12, 13, 'x']]) bench(B, x, z, a);
  tank(B, -17, -2); tank(B, -17, 3.5);
  for (const [x, z, n] of [[-33, -14, 2], [-4, -14, 1], [-33, 15, 1]]) B.crate(x, z, n, 0xd8dde2);
  for (const [x, z] of [[-24, 0], [-8, 0], [-30, -9]]) B.lamp(x, z);
  deco('water', -6, 0.02, 3, 2.4, 0.04, 1.8, { tint: GOO });
  // ---- へや1: びょうとうの ろうか ----
  deco('tile', 18, 0.004, 0, 34, 0.02, 34, { tint: 0xb8d4c4 });
  for (const x of [6, 14, 22, 30]) bed(B, x, -12);
  for (const x of [10, 18, 26]) curtain(B, x, -12);
  for (const x of [14, 22, 29]) bed(B, x, 13);
  for (const x of [18, 25.5]) curtain(B, x, 13);
  B.crate(33, -15, 2, 0xcfe0d6); B.crate(4, 15, 1, 0xcfe0d6);
  add('metal', 12, 0, 1, 1.2, 0.9, 2.4, { tint: WHITE }); // ワゴン
  for (const [x, z] of [[8, 3], [26, 0], [32, 10]]) B.lamp(x, z);
  for (const [x, z] of [[10, -9], [18, 8], [27, -7]]) vent(B, x, z);
  roomSpawns(B, rooms);
  return B.done(THEME, {
    backdrop: 'hospital', playerStart: { x: -31, z: 0, yaw: -Math.PI / 2 },
    seg: { rooms, doors, entry: null, exit, doorW: DW, doorH: H, vents: [{ x: 10, z: -9, r: 1.6, room: 1 }, { x: 18, z: 8, r: 1.6, room: 1 }, { x: 27, z: -7, r: 1.6, room: 1 }] },
  });
}
