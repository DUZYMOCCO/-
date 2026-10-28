// ステージ2 セグメント C（へや4 なかにわ・ボス）。いりぐち（z=12 の かべの ドア）は B の でぐちと おなじ ばしょ（edge:'in'）
import { segWall, segOuter, segDoor, roomSpawns } from './kit.js?v=29';
import { WOOD, GOLD, H, DW, COURT, candle, doorCap } from './manor_a.js?v=29';

export function build(builder) {
  const B = builder(36, 2203), { add, deco } = B;
  const W = 0x5a4a5a, S = 0x7a7478;
  segOuter(B, [-18, -24, 18, 12], ['n', 'w', 'e'], { h: 4.2, tint: W, mat: 'brick' });
  const rooms = [{ name: 'なかにわ', b: [-18, -24, 18, 12] }];
  const entry = { x: 10, z: 12, axis: 'x' };
  segWall(B, 'x', 12, -18, 18, [10], { h: H, dw: DW, tint: W, mat: 'brick', trim: GOLD, edge: 'in' });
  segDoor(B, entry, 'in', { h: H, dw: DW, steel: WOOD, edge: 'in' }); doorCap(B, entry, { edge: 'in' });
  // いしだたみ・こわれた ふんすい
  deco('dirt', -12, 0.01, 2, 6, 0.02, 5, { tint: 0x5a3a3a }); deco('dirt', 12, 0.01, -14, 5, 0.02, 7, { tint: 0x5a3a3a });
  add('concrete', 0, 0, -6, 7, 0.7, 7, { tint: S });
  deco('water', 0, 0.7, -6, 5.6, 0.06, 5.6, { tint: 0x6a2a4a });
  add('concrete', 0, 0.7, -6, 1.2, 2.2, 1.2, { tint: S }); deco('concrete', 0.3, 2.9, -6, 0.7, 0.5, 0.7, { tint: S });
  for (const [x, z] of [[-2.5, -3.2], [3.4, -9.2], [-3.6, -9.6]]) add('concrete', x, 0, z, 1, 0.4 + (x > 0 ? 0.3 : 0), 0.8, { tint: 0x6a6468 });
  // いけがき・き・いし ベンチ・おれた はしら
  for (const [x, z, a, l] of [[-11, 4, 'x', 8], [-12, -12, 'x', 7], [12, -9, 'x', 7], [11, 3, 'z', 5], [-13, -4, 'z', 5], [0, -19, 'x', 8]]) B.hedge(x, z, a, l);
  for (const [x, z] of [[-15, 9], [15, -21], [-15, -21], [16, -3], [-6, 8]]) B.tree(x, z, 3.6, 0x6a5a3a);
  for (const [x, z] of [[-6, -14], [7, 1]]) { add('concrete', x, 0, z, 2.4, 0.5, 0.8, { tint: 0x6a6468 }); deco('plank', x, 0.5, z, 2.4, 0.1, 0.8, { tint: 0x5a3a2a }); }
  add('concrete', 14, 0, 8, 1.1, 2.4, 1.1, { tint: S }); add('concrete', -14, 0, -16, 1.1, 1.4, 1.1, { tint: S });
  for (const [x, z] of [[-16, 0], [16, -14]]) B.lamp(x, z);
  for (const [x, z] of [[-7, 10], [3, -22], [-3, 6]]) candle(B, x, z);
  for (const [x, z] of [[-17.2, 8], [-17.2, -12], [17.2, -4]]) deco('ember', x, 1.8, z, 0.06, 1.6, 0.9);
  B.crate(8, -22, 2, 0x6a4a3a); B.crate(-16, -22, 1, 0x6a4a3a);
  roomSpawns(B, rooms);
  return B.done(COURT, { backdrop: 'city', playerStart: null, seg: { rooms, doors: [], entry, exit: null, doorW: DW, doorH: H } });
}
