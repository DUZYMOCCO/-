// ステージ4「くらやみの ちかてつ」セグメント A（へや0 ホーム → へや1 せんろの トンネル）。かくうの えき
// でぐち（x=32 の かべの ドア）で B に つながる。へや0・1 には でんしゃが よこぎる せんろ（trains）
import { segWall, segOuter, segDoor, roomSpawns } from './kit.js?v=35';

export const WALL = 0x4a525a, STEEL = 0x5a646e, RAIL = 0x9aa4ae, H = 3.8, DW = 4.4;
export const THEME = { ground: 'concrete', tint: 0x2a3036, k: 0.35, far: 'office', farTint: 0x20262c };
// せんろ（z に そって・at = x）。まくらぎ・レール・きいろの せん
export function track(B, at, z0, z1) {
  const len = z1 - z0, mid = (z0 + z1) / 2;
  B.deco('dark', at, 0.004, mid, 3.6, 0.02, len);
  for (let z = z0 + 1; z < z1; z += 1.6) B.deco('plank', at, 0.02, z, 2.3, 0.08, 0.4, { tint: 0x5a4a3a });
  for (const s of [-0.75, 0.75]) B.deco('metal', at + s, 0.1, mid, 0.14, 0.12, len, { tint: RAIL });
  for (const s of [-1.9, 1.9]) B.deco('stripe', at + s, 0.006, mid, 0.25, 0.02, len);
}
// トンネルの くち（きた・みなみの かべ）。みえない かべで ふさぐ → でんしゃだけ とおる
export function mouth(B, at, z) {
  const s = Math.sign(z);
  for (const p of [-1, 1]) B.add('metal', at + p * 2.3, 0, z, 0.6, 4.2, 1.1, { tint: STEEL });
  B.deco('stripe', at, 3.7, z, 4.6, 0.5, 1.0);
  B.add('none', at, 0, z, 4.0, 9, 0.8, {});
  B.deco('dark', at, 0, z + s * 3.4, 6, 4.6, 6);
}

export function build(builder) {
  const B = builder(36, 4001), { add, deco } = B;
  const rooms = [
    { name: 'ホーム', b: [-36, -16, -4, 16] },
    { name: 'せんろの トンネル', b: [-4, -16, 32, 16] },
  ];
  const doors = [{ x: -4, z: -8, axis: 'z' }], exit = { x: 32, z: 8, axis: 'z' };
  const trains = [{ room: 0, axis: 'z', at: -20, from: -26, to: 26, w: 3.2 }, { room: 1, axis: 'z', at: 14, from: -26, to: 26, w: 3.2 }];
  segOuter(B, [-36, -16, 32, 16], ['w'], { h: 4.2, tint: WALL });
  for (const z of [-16, 16]) segWall(B, 'x', z, -36, 32, [-20, 14], { h: 4.2, dw: 3.4, tint: WALL });
  for (const z of [-16.5, 16.5]) add('metal', -36.5, 0, z, 1.2, 4.0, 1.2);
  segWall(B, 'z', -4, -16, 16, [-8], { h: H, dw: DW, tint: WALL });
  segWall(B, 'z', 32, -16, 16, [8], { h: H, dw: DW, tint: WALL });
  segDoor(B, doors[0], 0, { h: H, dw: DW, steel: STEEL });
  segDoor(B, exit, 'out', { h: H, dw: DW, steel: STEEL });
  B.reserve(-35, -4, -29, 4); // スタート
  // ---- へや0: ホーム（かいさつ・ベンチ・はしら）----
  for (const t of trains) { track(B, t.at, -16, 16); for (const z of [-16, 16]) mouth(B, t.at, z); }
  for (const z of [-11, -7, 7, 11]) {
    add('metal', -26, 0, z, 0.6, 1.1, 1.4, { tint: STEEL });
    deco('light', -25.69, 1.0, z, 0.02, 0.12, 0.5);
  }
  for (const z of [-12, 12]) add('plank', -33, 0, z, 0.6, 0.55, 2.4, { tint: 0x6a5a48 });
  for (const z of [-12, 0, 12]) add('concrete', -11, 0, z, 1, 3.8, 1, { tint: 0x5a636c });
  for (const z of [-3, 11]) add('plank', -7, 0, z, 0.6, 0.55, 2.4, { tint: 0x6a5a48 });
  B.crate(-14, -13, 2, 0x5a6a78); B.crate(-30, 13, 1, 0x5a6a78); B.crate(-8, 13, 2, 0x5a6a78);
  deco('ember', -35.8, 3.0, 0, 0.1, 0.25, 8); deco('ember', -4.4, 3.0, 8, 0.1, 0.25, 6);
  deco('light', -5, 3.6, -14, 0.1, 0.5, 3);
  B.lamp(-31, -12); B.lamp(-9, 6);
  // ---- へや1: せんろの トンネル（さぎょうつうろ・ケーブル）----
  for (const z of [-15.55, 15.55]) {
    deco('dark', 14, 3.0, z, 33, 0.18, 0.18); deco('dark', 14, 2.6, z, 33, 0.12, 0.12);
    for (const x of [2, 8, 21, 27]) deco('ember', x, 3.4, z, 0.6, 0.3, 0.06);
  }
  for (const [x, z] of [[2, 6], [8, -12], [21, 8], [27, -9]]) add('concrete', x, 0, z, 0.8, 4, 0.8, { tint: 0x4e565e });
  add('metal', 25, 0, -5, 2.6, 1.0, 1.2, { tint: 0x6a7480 });
  add('metal', 4, 0, 12, 1.2, 1.3, 1.0, { tint: 0x7a7a5a }); deco('stripe', 4, 1.0, 11.49, 1.2, 0.25, 0.02);
  for (const [x, z] of [[8, 2], [28, 4], [20, -13]]) B.barrel(x, z, 0x6a7a4a);
  B.crate(2, -3, 1, 0x5a6a78); B.crate(30, 13, 2, 0x5a6a78); B.crate(18, 13, 1, 0x5a6a78);
  for (const [x, z] of [[22, 12], [8, -6]]) B.lamp(x, z);
  roomSpawns(B, rooms, 14);
  for (const t of trains) { const rm = rooms[t.room]; rm.spawns = rm.spawns.filter((s) => Math.abs(s.x - t.at) > t.w / 2 + 0.8); }
  return B.done(THEME, {
    backdrop: 'office', playerStart: { x: -32, z: 0, yaw: -Math.PI / 2 },
    seg: { rooms, doors, entry: null, exit, doorW: DW, doorH: H, trains },
  });
}
