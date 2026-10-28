// v0.18.0: ステージ15 セグメント C（へや4 はじまりの ホール・ボス）。12かくけいの まるい ホール（はんけい 20）
// いりぐちは にしがわ（x=-20）の たいらな かべの ドア（B の でぐちと おなじ ばしょ）
import { segWall, segDoor } from './kit.js?v=32';
import { WALL, STEEL, H, DW, THEME, tank, vent } from './core_a.js?v=32';

export function build(builder) {
  const B = builder(32, 1703), { add, deco } = B;
  const R = 20 / Math.cos(Math.PI / 12), N = 12, WH = 4.6;
  const rooms = [{ name: 'はじまりの ホール', b: [-20, -20, 20, 20] }];
  const entry = { x: -20, z: 0, axis: 'z' };
  // たいらな かべ（にし）= いりぐち。ほかの 11こは 2m くらいの はこを ならべる
  segWall(B, 'z', -20, -6, 6, [0], { h: H, dw: DW, tint: WALL, edge: 'in' });
  segDoor(B, entry, 'in', { h: H, dw: DW, steel: STEEL, edge: 'in' });
  for (let k = 0; k < N; k++) {
    if (k === 5) continue;
    const a0 = Math.PI / 12 + k * Math.PI / 6, a1 = a0 + Math.PI / 6;
    const x0 = Math.cos(a0) * R, z0 = Math.sin(a0) * R, x1 = Math.cos(a1) * R, z1 = Math.sin(a1) * R;
    const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 1.8);
    for (let t = k === 6 ? 1 : 0; t <= (k === 4 ? n - 1 : n); t++) add('wall', x0 + (x1 - x0) * t / n, 0, z0 + (z1 - z0) * t / n, 2.4, WH, 2.4, { tint: WALL });
  }
  // ゆか: まるい ホール・まんなかは あける
  deco('tile', 0, 0.004, 0, 40, 0.02, 28, { tint: 0x9fb8ac }); deco('tile', 0, 0.004, 0, 28, 0.02, 40, { tint: 0x9fb8ac });
  deco('water', 0, 0.03, 0, 8, 0.03, 8, { tint: 0x4cff6a });
  for (const [x, z, w, d] of [[0, -11, 0.4, 6], [0, 11, 0.4, 6], [-11, 0, 6, 0.4], [11, 0, 6, 0.4]]) deco('light', x, 0.03, z, w, 0.03, d);
  // ボスの てしたを だす おおきな タンク（かべぎわ 5こ）
  for (const a of [0, 60, 120, 240, 300]) { const t = a * Math.PI / 180; tank(B, Math.cos(t) * 15.5, Math.sin(t) * 15.5, 3.2, 3.4); }
  for (const a of [30, 90, 150, 210, 270, 330]) { const t = a * Math.PI / 180; deco('light', Math.cos(t) * 18.7, 2.8, Math.sin(t) * 18.7, 0.6, 0.15, 0.6); }
  for (const a of [45, 135, 225, 315]) B.lamp(Math.cos(a * Math.PI / 180) * 13, Math.sin(a * Math.PI / 180) * 13);
  const V = 6.7, vents = [[V, V], [-V, V], [V, -V], [-V, -V]];
  for (const [x, z] of vents) vent(B, x, z);
  // ゾンビの でぐち（まるく ならべる）
  rooms[0].spawns = [];
  for (let k = 0; k < 8; k++) {
    const t = (22.5 + k * 45) * Math.PI / 180, x = Math.cos(t) * 14, z = Math.sin(t) * 14;
    if (!B.hit(x, z, 0.5)) rooms[0].spawns.push({ x, z });
  }
  return B.done(THEME, {
    backdrop: 'hospital', playerStart: null,
    seg: { rooms, doors: [], entry, exit: null, doorW: DW, doorH: H, vents: vents.map(([x, z]) => ({ x, z, r: 1.6, room: 0 })) },
  });
}
