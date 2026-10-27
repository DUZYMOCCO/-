// ステージ3「あめの はいきょとし」 セグメント A（へや0 あめの ろじ → へや1 しょうてんがい）。かくうの まち・よる・あめ
// でぐち（z=12 の かべの ドア x=30）で セグメント B に つながる
import { segWall, segOuter, segDoor, roomSpawns } from './kit.js?v=24';

export const WALL = 0x5a6270, BRICK = 0x6a5a58, STEEL = 0x6a7684, H = 3.8, DW = 4.4, WET = 0x4a6078;
export const THEME = { ground: 'asphalt', tint: 0x3a4656, k: 0.3, far: 'city', farTint: 0x56647a, rain: true };
export const puddle = (B, x, z, s) => B.deco('water', x, 0.02, z, s, 0.03, s * 0.7, { tint: WET });

export function build(builder) {
  const B = builder(36, 3301), { add, deco, half } = B;
  segOuter(B, [-half, 12, half, half], ['s', 'w', 'e'], { h: 4.2, tint: WALL, mat: 'brick' });
  const rooms = [
    { name: 'あめの ろじ', b: [-half, 12, 0, half] },
    { name: 'しょうてんがい', b: [0, 12, half, half] },
  ];
  const doors = [{ x: 0, z: 24, axis: 'z' }], exit = { x: 30, z: 12, axis: 'x' };
  segWall(B, 'z', 0, 12, half, [24], { h: H, dw: DW, tint: WALL, mat: 'brick' });
  segWall(B, 'x', 12, -half, half, [30], { h: H, dw: DW, tint: WALL, mat: 'brick' });
  segDoor(B, doors[0], 0, { h: H, dw: DW, steel: STEEL });
  segDoor(B, exit, 'out', { h: H, dw: DW, steel: STEEL });
  B.reserve(-34, 26, -24, 34); // スタート
  // ---- へや0: あめの ろじ（せまい みち・ゴミばこ・だんボール・ひじょうかいだん）----
  B.building(-20, 16.5, 26, 2.5, 7, 'brick', BRICK);
  for (let x = -30; x < -8; x += 5) { // ひじょうかいだん（かざり）
    deco('metal', x, 2.6, 18.0, 3.2, 0.1, 0.8, { tint: STEEL }); deco('metal', x + 1.5, 1.3, 18.1, 0.1, 2.6, 0.1, { tint: STEEL });
  }
  deco('metal', -14, 4.8, 18.0, 12, 0.1, 0.8, { tint: STEEL });
  for (const [x, z] of [[-30, 20], [-12, 19], [-3, 31], [-26, 34]]) add('metal', x, 0, z, 1.8, 1.1, 1.0, { tint: 0x3a5a48 });
  for (const [x, z, n] of [[-17, 20, 2], [-6, 20, 1], [-24, 27, 1], [-9, 34, 2]]) B.crate(x, z, n, 0xa88a68);
  for (const [x, z] of [[-33, 31], [-2, 28]]) B.barrel(x, z, 0x5a6a7a);
  add('metal', -16, 0, 29, 3, 1.1, 1.4, { tint: 0x4a5a6a }); // ふるい ソファ
  for (const [x, z, s] of [[-22, 24, 4], [-10, 30, 3], [-4, 22, 2.4], [-30, 29, 3]]) puddle(B, x, z, s);
  for (const [x, z] of [[-30, 24], [-18, 27], [-6, 30], [-12, 21], [-2, 15]]) B.lamp(x, z);
  // ---- へや1: しょうてんがい（みせの しょうめん・ひよけ・こわれた くるま）----
  B.building(14, 16.5, 20, 2.5, 6, 'brick', 0x6a6460);
  B.building(23, 33.5, 22, 4, 6.5, 'brick', 0x5a6066);
  B.building(7, 33.5, 11, 4, 6, 'brick', 0x665a5c);
  for (const [x, z, w] of [[14, 18.4, 6], [6, 18.4, 4], [22, 31.0, 6], [10, 31.0, 5]]) {
    deco('tent', x, 2.7, z, w, 0.25, 1.6, { tint: x > 12 ? 0x7a3a46 : 0x3a5a7a });
    deco('light', x, 2.2, z + (z > 24 ? -0.8 : 0.8), w - 1, 0.25, 0.05); // かんばんの あかり
  }
  B.car(10, 26, 'x', 0x6a4a44); B.van(25, 22, 'x', 0x7a8088, 0x5a6a8a); B.car(31, 28, 'z', 0x4a5a6e);
  for (const [x, z] of [[17, 26], [4, 21]]) add('concrete', x, 0, z, 2.4, 0.8, 0.6, { tint: 0x7a7a7a });
  for (const [x, z, n] of [[33, 18, 2], [3, 30, 1]]) B.crate(x, z, n, 0xa88a68);
  for (const [x, z, s] of [[16, 22, 4], [28, 25, 3], [6, 26, 2.6]]) puddle(B, x, z, s);
  for (const [x, z] of [[4, 18], [18, 20], [34, 20], [14, 30], [30, 33]]) B.lamp(x, z);
  roomSpawns(B, rooms);
  return B.done(THEME, {
    backdrop: 'city', playerStart: { x: -30, z: 30, yaw: -Math.PI / 2 },
    seg: { rooms, doors, entry: null, exit, doorW: DW, doorH: H },
  });
}
