// ステージ18「とびらの そうこ」 セグメント A（へや0 そうこの いりぐち → へや1 ながい つうろ）。かくうの くらい そうこ
// でてくる ドア: へやの そとの かべに あけた あな（ふさいで ある）。ゲームが とびらと ランプを かく
import { segWall, segDoor, roomSpawns } from './kit.js?v=32';

export const WALL = 0x6e6e78, STEEL = 0x8e98a4, YEL = 0xe0b020, H = 3.8, DW = 4.4, OH = 4.2;
export const THEME = { ground: 'concrete', tint: 0x5a5a62, k: 0.3, far: 'office', farTint: 0x6a6a74 };
const YAW = { n: Math.PI, s: 0, w: -Math.PI / 2, e: Math.PI / 2 };
const pos = (s, [x0, z0, x1, z1], t) => (s === 'n' ? [t, z0 - 0.5] : s === 's' ? [t, z1 + 0.5] : s === 'w' ? [x0 - 0.5, t] : [x1 + 0.5, t]);
// そとの かべ（sd = [[がわ, かべぞいの いち]] の ところは あけておく）
export function ring(B, rc, sides, sd) {
  const [x0, z0, x1, z1] = rc, o = { tint: WALL };
  const skip = (s, c) => sd.some((d) => d[0] === s && Math.abs(d[1] - c) < 0.01);
  for (const s of sides) {
    const h = s === 'n' || s === 's', a0 = h ? x0 : z0, a1 = h ? x1 : z1;
    for (let a = a0; a < a1 - 0.01; a += 2) {
      if (skip(s, a + 1)) continue;
      const [x, z] = pos(s, rc, a + 1);
      B.add('wall', x, 0, z, h ? 2 : 1, OH, h ? 1 : 2, o);
    }
  }
  for (const [k, [x, z]] of Object.entries({ nw: [x0, z0], ne: [x1, z0], sw: [x0, z1], se: [x1, z1] })) {
    if (sides.includes(k[0]) && sides.includes(k[1])) B.add('metal', x + (x > (x0 + x1) / 2 ? 0.5 : -0.5), 0, z + (z > (z0 + z1) / 2 ? 0.5 : -0.5), 1.2, OH - 0.2, 1.2);
  }
}
// でてくる ドア（わく・まぐさ・くらい あな・みえない ふた）→ spawnDoors の リスト
export function sdoors(B, rc, sd, room) {
  return sd.map(([s, t]) => {
    const [x, z] = pos(s, rc, t), h = s === 'n' || s === 's', yaw = YAW[s];
    const ox = Math.sin(yaw) * 1.1, oz = Math.cos(yaw) * 1.1; // そと むき
    for (const q of [-1, 1]) B.add('metal', h ? x + q : x, 0, h ? z : z + q, h ? 0.4 : 1, 2.6, h ? 1 : 0.4, { tint: STEEL });
    B.add('wall', x, 2.6, z, h ? 2 : 1, OH - 2.6, h ? 1 : 2, { tint: WALL });
    B.deco('dark', x + ox, 0, z + oz, h ? 1.6 : 1.2, 2.6, h ? 1.2 : 1.6);
    B.add('none', x, 0, z, h ? 1.6 : 0.4, 2.6, h ? 0.4 : 1.6, {});
    return { x, z, yaw, room };
  });
}
export function shelf(B, x, z, along, len) {
  const ax = along === 'x', w = ax ? len : 0.9, d = ax ? 0.9 : len;
  B.add('metal', x, 0, z, w, 2.4, d, { tint: 0x66707c });
  B.deco('stripe', x, 0, z, w + 0.04, 0.3, d + 0.04);
  B.deco('crate', x, 2.4, z, ax ? len * 0.6 : 0.7, 0.5, ax ? 0.7 : len * 0.6);
}
export function forklift(B, x, z, along) {
  const ax = along === 'x';
  B.add('metal', x, 0, z, ax ? 2.2 : 1.2, 0.9, ax ? 1.2 : 2.2, { tint: YEL });
  B.deco('dark', x, 0.9, z, 1, 1.1, 1);
  B.deco('dark', x + (ax ? 1.2 : 0), 0, z + (ax ? 0 : 1.2), ax ? 0.2 : 1.0, 2, ax ? 1 : 0.2);
  B.deco('metal', x + (ax ? 1.8 : 0), 0.1, z + (ax ? 0 : 1.8), ax ? 1.2 : 0.9, 0.1, ax ? 0.9 : 1.2, { tint: STEEL });
}

export function build(builder) {
  const B = builder(36, 1801), { deco } = B;
  const R0 = [-30, 12, 30, 36], R1 = [-30, -6, 30, 12];
  const sd0 = [['s', -17], ['s', 17], ['w', 19], ['w', 29], ['e', 19], ['e', 29]];
  const sd1 = [['w', -1], ['w', 7], ['e', -1], ['e', 7]];
  const rooms = [{ name: 'そうこの いりぐち', b: R0 }, { name: 'ながい つうろ', b: R1 }];
  const doors = [{ x: 24, z: 12, axis: 'x' }], exit = { x: -24, z: -6, axis: 'x' };
  ring(B, R0, ['s', 'w', 'e'], sd0); ring(B, R1, ['w', 'e'], sd1);
  segWall(B, 'x', 12, -30, 30, [24], { h: H, dw: DW, tint: WALL });
  segWall(B, 'x', -6, -30, 30, [-24], { h: H, dw: DW, tint: WALL });
  segDoor(B, doors[0], 0, { h: H, dw: DW, steel: STEEL });
  segDoor(B, exit, 'out', { h: H, dw: DW, steel: STEEL });
  const spawnDoors = [...sdoors(B, R0, sd0, 0), ...sdoors(B, R1, sd1, 1)];
  B.reserve(-30, 18, -18, 30);
  // ---- へや0: いりぐち（たな・はこ・フォークリフト）----
  deco('stripe', 24, 0.01, 15, 7, 0.02, 2);
  for (const [x, z] of [[-10, 31], [8, 31]]) shelf(B, x, z, 'x', 6);
  shelf(B, -4, 17, 'x', 5);
  for (const [x, z, n] of [[-2, 25, 2], [-14, 16, 1], [14, 27, 2], [20, 18, 1]]) B.crate(x, z, n, 0x9a7a4a);
  forklift(B, 18, 32, 'x');
  for (const [x, z] of [[-4, 34], [26, 33]]) B.barrel(x, z, 0x6a7a8a);
  for (const [x, z] of [[-12, 24], [10, 22], [0, 34]]) B.lamp(x, z);
  // ---- へや1: ながい つうろ（はこ・カート・ちゅうい せん）----
  deco('stripe', 0, 0.01, 3, 52, 0.02, 0.5);
  for (const [x, z, n] of [[-12, 4, 2], [14, 0, 2], [-2, 10, 1], [6, -3, 1], [-18, -2, 1]]) B.crate(x, z, n, 0x8a6a3a);
  forklift(B, 2, 7, 'x');
  for (const [x, z] of [[-4, -3], [20, 8]]) B.barrel(x, z, 0x5a6a7a);
  for (const [x, z] of [[-14, 10.5], [4, -4.5], [18, 4]]) B.lamp(x, z);
  roomSpawns(B, rooms);
  return B.done(THEME, {
    backdrop: 'office', playerStart: { x: -22, z: 24, yaw: -Math.PI / 2 },
    seg: { rooms, doors, entry: null, exit, doorW: DW, doorH: H, spawnDoors },
  });
}
