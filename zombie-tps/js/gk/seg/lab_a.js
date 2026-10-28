// v0.17.0: ステージ1「ほろびた けんきゅうじょ」 セグメント A（へや0 いりぐち → へや1 サーバーしつ）。かくうの しせつ
// v0.16.0 の maps/lab.js の きたがわ はんぶん。でぐち（z=12 の かべの ドア）で セグメント B に つながる
import { segWall, segOuter, segDoor, roomSpawns } from './kit.js?v=28';

export const WALL = 0xb8c2cc, WHITE = 0xe4e8ec, STEEL = 0x8e98a4, GOO = 0x4cff6a, H = 3.8, DW = 4.4;
export const THEME = { ground: 'concrete', tint: 0x6a8a7a, k: 0.32, far: 'hospital', farTint: 0x8a9a94 };
// つくえ・パソコン・みどりの びん
export function bench(B, x, z, along) {
  const ax = along === 'x';
  B.add('metal', x, 0, z, ax ? 4 : 1.2, 0.95, ax ? 1.2 : 4, { tint: WHITE });
  B.deco('dark', x - (ax ? 1 : 0), 0.95, z - (ax ? 0 : 1), 0.7, 0.55, 0.5);
  B.deco('light', x - (ax ? 1 : 0), 1.05, z - (ax ? 0.26 : 1.26), 0.5, 0.3, 0.02);
  B.deco('glass', x + (ax ? 1 : 0), 0.95, z + (ax ? 0 : 1), 0.3, 0.35, 0.3, { tint: GOO });
}

export function build(builder) {
  const B = builder(36, 1601), { add, deco, r, half } = B;
  segOuter(B, [-half, 12, half, half], ['s', 'w', 'e'], { h: 4.2, tint: WALL });
  const rooms = [
    { name: 'いりぐち', b: [-half, 12, 0, half] },
    { name: 'サーバーしつ', b: [0, 12, half, half] },
  ];
  const doors = [{ x: 0, z: 24, axis: 'z' }], exit = { x: 30, z: 12, axis: 'x' };
  segWall(B, 'z', 0, 12, half, [24], { h: H, dw: DW, tint: WALL });
  segWall(B, 'x', 12, -half, half, [30], { h: H, dw: DW, tint: WALL }); // でぐちの かべ（B の いりぐちと おなじ ところ）
  segDoor(B, doors[0], 0, { h: H, dw: DW, steel: STEEL });
  segDoor(B, exit, 'out', { h: H, dw: DW, steel: STEEL });
  B.reserve(-34, 26, -24, 34); // スタート
  // ---- へや0: いりぐち（うけつけ・つくえ・はこ）----
  deco('tile', -18, 0.004, 24, 34, 0.02, 22, { tint: 0xc8d0d4 });
  add('metal', -18, 0, 18, 7, 1.1, 1.4, { tint: WHITE }); deco('light', -18, 1.1, 17.25, 5, 0.12, 0.05);
  for (const [x, z, a] of [[-26, 22, 'x'], [-10, 30, 'x'], [-8, 20, 'z'], [-30, 16, 'x']]) bench(B, x, z, a);
  for (const [x, z, n] of [[-20, 30, 2], [-4, 15, 1], [-33, 20, 1]]) B.crate(x, z, n, 0xd8dde2);
  // ---- へや1: サーバーしつ（くらい たな・バリケード）----
  for (const x of [8, 14, 20, 26]) for (const z of [18, 30]) {
    add('dark', x, 0, z, 1.4, 2.6, 3.2);
    for (let y = 0.5; y < 2.4; y += 0.5) deco('light', x - 0.71, y, z - 1 + r() * 2, 0.02, 0.06, 0.12);
  }
  for (const [x, z, a, l] of [[11, 24, 'x', 3], [23, 25, 'x', 3]]) add('metal', x, 0, z, a === 'x' ? l : 0.3, 1.1, a === 'x' ? 0.3 : l, { tint: 0x6a7480 });
  for (const [x, z] of [[32, 30], [4, 32], [33, 17]]) B.barrel(x, z, 0x3aa84a);
  for (const [x, z] of [[-18, 28], [-4, 22], [16, 24]]) B.lamp(x, z);
  roomSpawns(B, rooms);
  return B.done(THEME, {
    backdrop: 'hospital', playerStart: { x: -30, z: 30, yaw: -Math.PI / 2 },
    seg: { rooms, doors, entry: null, exit, doorW: DW, doorH: H },
  });
}
