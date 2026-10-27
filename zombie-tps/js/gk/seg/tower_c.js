// ステージ5 セグメント C（おくじょう・ボス）。いりぐち（z=24 の かべ）は B の でぐちと おなじ ばしょ
// ゆか 12m。まわりは ひくい てすり。あかい そらの した
import { segWall, segOuter, segDoor, roomSpawns } from './kit.js?v=26';
import { WALL, STEEL, H, DW, THEME, SLAB, wallOpt, banner, pillar, crates, torch } from './tower_a.js?v=26';

export function build(builder) {
  const B = builder(26, 5103), { add, deco } = B, X = 24;
  segOuter(B, [-X, -X, X, X], ['n', 'w', 'e'], { h: 1.2, tint: WALL, mat: 'brick', y0: 12 });
  const rooms = [{ name: 'おくじょう', b: [-X, -X, X, X], y: 12 }];
  const entry = { x: 8, z: 24, axis: 'x', y: 9 };
  segWall(B, 'x', 24, -X, X, [8], { ...wallOpt, y0: 12, gapY: 9, edge: 'in' });
  segDoor(B, entry, 'in', { h: H, dw: DW, steel: STEEL, edge: 'in' });
  B.slab(-X, -X, X, X, 12, [[5, 15, 11, 24]], SLAB);
  B.ramp({ along: 'z', from: 24, to: 15, lat: [5, 11], y0: 9, y1: 12, mat: 'concrete', tint: 0x6a5a70, walk: true, rail: 'metal' });
  deco('concrete', 0, 12.004, 0, 47, 0.02, 47, { tint: 0x3e3448 });
  // たかい はしら（てすりの わき）とたいまつ
  for (const [x, z] of [[-23, 0], [23, 0], [0, -23], [-23, -12], [23, -12], [-12, -23], [12, -23]]) { pillar(B, x, z, 12, 4.4); deco('ember', x, 16.4, z, 0.5, 0.4, 0.5); }
  // えんとつ・はこ（かくれる ところ）
  for (const [x, z] of [[-12, 8], [14, -10], [-14, -8]]) { add('brick', x, 12, z, 2.2, 2.4, 2.2, { tint: 0x5a4a50 }); deco('dark', x, 14.4, z, 2.6, 0.3, 2.6); }
  for (const [x, z, n] of [[-6, 16, 2], [16, 6, 1], [-20, 2, 2], [20, -18, 2], [0, -4, 1], [-4, -16, 1]]) crates(B, x, z, 12, n);
  for (const [x, z] of [[-20, 18], [20, 20], [3, 2]]) B.barrel(x, z, 0x6a3a4a);
  // おうの だい（おくの かべぎわ）
  add('concrete', 0, 12, -20, 8, 0.6, 4, { tint: 0x4a2a38 }); deco('light', 0, 12.62, -20, 5, 0.04, 0.4);
  for (const x of [-16, 0, 16]) banner(B, x, 23.6, 's', 12);
  for (const [x, z] of [[-23, 20], [23, 20]]) torch(B, x, z, 12);
  B.lamp(-10, 0, 'dark', 12); B.lamp(10, -12, 'dark', 12);
  roomSpawns(B, rooms);
  return B.done(THEME, { vertical: true, backdrop: 'rooftop', playerStart: null, seg: { rooms, doors: [], entry, exit: null, doorW: DW, doorH: H } });
}
