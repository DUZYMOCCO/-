// ステージ18 セグメント C（へや4 ボスの へや）。いりぐち（z=18）は B の でぐちと おなじ ばしょ（edge:'in'）
import { segWall, segDoor, roomSpawns } from './kit.js?v=30';
import { WALL, STEEL, H, DW, THEME, ring, sdoors } from './doors_a.js?v=30';

export function build(builder) {
  const B = builder(36, 1803), { deco } = B;
  const R4 = [-18, -18, 18, 18];
  const sd = [['n', -9], ['n', 9], ['w', -9], ['w', 9], ['e', -9], ['e', 9]];
  const rooms = [{ name: 'ボスの へや', b: R4 }];
  const entry = { x: -12, z: 18, axis: 'x' };
  ring(B, R4, ['n', 'w', 'e'], sd);
  segWall(B, 'x', 18, -30, 30, [-12], { h: H, dw: DW, tint: WALL, edge: 'in' });
  segDoor(B, entry, 'in', { h: H, dw: DW, steel: STEEL, edge: 'in' });
  const spawnDoors = sdoors(B, R4, sd, 0);
  deco('stripe', 0, 0.01, 0, 12, 0.02, 12);
  for (const [x, z, n] of [[-14, -14, 2], [14, -14, 2], [-14, 13, 1], [14, 13, 2]]) B.crate(x, z, n, 0x9a7a4a);
  for (const [x, z] of [[-6, -1], [6, 1]]) B.barrel(x, z, 0x5a6a7a);
  for (const [x, z] of [[-14, 0], [14, 0], [0, -14]]) B.lamp(x, z);
  roomSpawns(B, rooms);
  return B.done(THEME, { backdrop: 'office', playerStart: null, seg: { rooms, doors: [], entry, exit: null, doorW: DW, doorH: H, spawnDoors } });
}
