// ステージ5「あかい そらの とう」 セグメント A（とうの 1かい → 2かい）。かくうの とう
// 1かいは じめん、2かいは ゆか 3m。2かいの いりぐちの うしろに スロープ。でぐち（z=12 の かべ）で B に つながる
import { segWall, segOuter, segDoor, roomSpawns } from './kit.js?v=32';

export const WALL = 0x5a4a60, STONE = 0x6e5e72, RED = 0x7a1a2a, STEEL = 0x4a4252, H = 3.8, DW = 4.4;
export const THEME = { ground: 'concrete', tint: 0x8a2a2a, k: 0.45, far: 'rooftop', farTint: 0x6a3040 };
export const SLAB = { minY: 0, walk: true, mat: 'concrete', tint: 0x4e4458 };
// ぜんぶの セグメントで つかう かべの もよう（face = かべの むき）・はしら・はこ・たいまつ
export function onWall(B, mat, x, z, face, y, w, h, tint) {
  const ns = face === 'n' || face === 's', d = { n: 0.05, s: -0.05, w: 0.05, e: -0.05 }[face];
  B.deco(mat, x + (ns ? 0 : d), y, z + (ns ? d : 0), ns ? w : 0.1, h, ns ? 0.1 : w, { tint });
}
export const windowAt = (B, x, z, face, y) => onWall(B, 'glass', x, z, face, y + 1.3, 1.2, 1.9, 0xff6a50);
export const banner = (B, x, z, face, y) => onWall(B, 'tent', x, z, face, y + 0.7, 1.3, 2.7, RED);
export const pillar = (B, x, z, y, h = H) => { B.add('concrete', x, y, z, 1.6, h, 1.6, { tint: STONE }); };
export const crates = (B, x, z, y, n) => { for (let k = 0; k < n; k++) B.add('crate', x, y + k, z, 1, 1, 1, { tint: 0x8a5a4a }); };
export const torch = (B, x, z, y) => { B.add('dark', x, y, z, 0.3, 1.3, 0.3); B.deco('ember', x, y + 1.3, z, 0.4, 0.35, 0.4); };
export const wallOpt = { h: H, dw: DW, tint: WALL, mat: 'brick', trim: 0x6a1a24 };

export function build(builder) {
  const B = builder(36, 5101), { half } = B;
  const o = { h: 4.2, tint: WALL, mat: 'brick' };
  segOuter(B, [-half, 12, 0, half], ['s', 'w'], { ...o, y0: 0 });
  segOuter(B, [0, 12, half, half], ['s', 'e'], { ...o, y0: 3 });
  const rooms = [
    { name: 'とうの 1かい', b: [-half, 12, 0, half], y: 0 },
    { name: '2かい', b: [0, 12, half, half], y: 3 },
  ];
  const doors = [{ x: 0, z: 30, axis: 'z', y: 0 }], exit = { x: 24, z: 12, axis: 'x', y: 3 };
  segWall(B, 'z', 0, 12, half, [30], { ...wallOpt, y0: 3, gapY: 0 });
  segWall(B, 'x', 12, -half, half, [24], { ...wallOpt, y0: 6, gapY: 3 }); // でぐち（B の いりぐちと おなじ）
  segDoor(B, doors[0], 0, { h: H, dw: DW, steel: STEEL });
  segDoor(B, exit, 'out', { h: H, dw: DW, steel: STEEL });
  B.reserve(-34, 26, -24, 34);
  B.slab(0, 12, half, half, 3, [[0, 27, 9, 33]], SLAB);
  B.ramp({ along: 'x', from: 0, to: 9, lat: [27, 33], y0: 0, y1: 3, mat: 'concrete', tint: 0x6a5a70, walk: true, rail: 'metal' });
  // ---- 1かい: ひろい ホール ----
  B.deco('concrete', -18, 0.004, 24, 35, 0.02, 23, { tint: 0x3e3448 });
  for (const [x, z] of [[-10, 20], [-22, 18], [-14, 32], [-26, 26]]) pillar(B, x, z, 0);
  for (const [x, z, n] of [[-30, 20, 2], [-6, 26, 1], [-20, 24, 1]]) crates(B, x, z, 0, n);
  for (const [x, z] of [[-33, 14], [-4, 34]]) B.barrel(x, z, 0x6a3a4a);
  for (const [x, z] of [[-34, 13], [-2, 14], [-34, 35]]) torch(B, x, z, 0);
  for (const z of [18, 26]) windowAt(B, -36, z, 'w', 0);
  for (const x of [-26, -10]) windowAt(B, x, 36, 's', 0);
  for (const x of [-18, -4]) banner(B, x, 36, 's', 0);
  B.lamp(-20, 20, 'dark', 0); B.lamp(-8, 30, 'dark', 0);
  // ---- 2かい ----
  for (const [x, z] of [[16, 22], [28, 26], [17, 33]]) pillar(B, x, z, 3);
  for (const [x, z, n] of [[13, 17, 2], [31, 19, 1], [22, 31, 2], [4, 20, 1]]) crates(B, x, z, 3, n);
  B.barrel(34, 33, 0x6a3a4a); B.barrel(3, 34, 0x6a3a4a);
  for (const [x, z] of [[34, 14], [2, 14]]) torch(B, x, z, 3);
  for (const z of [20, 28]) windowAt(B, 36, z, 'e', 3);
  for (const x of [14, 28]) windowAt(B, x, 36, 's', 3);
  for (const x of [20, 32]) banner(B, x, 36, 's', 3);
  banner(B, 8, 12.4, 'n', 3);
  B.lamp(20, 24, 'dark', 3); B.lamp(30, 16, 'dark', 3);
  roomSpawns(B, rooms);
  return B.done(THEME, {
    vertical: true, backdrop: 'rooftop', playerStart: { x: -30, z: 30, yaw: -Math.PI / 2 },
    seg: { rooms, doors, entry: null, exit, doorW: DW, doorH: H },
  });
}
