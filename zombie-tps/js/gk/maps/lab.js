// v0.16.0: ガンキック ステージ1「ほろびた けんきゅうじょ」の 3D マップ（あとから よむ・かくうの しせつ）
// 2D の 「ひだり → みぎ」を 3D の 「へや → ドア → へや」に した いっぽんみち（S じ）。
//   へや0 いりぐち → へや1 サーバーしつ → へや2 タンクの ホール → へや3 ちかの じっけんしつ（ボス）
// build(builder) … map.js の builder を うけとって はこを ならべる（three.js も map.js も import しない）
export function build(builder) {
  const B = builder(36, 1601), { add, deco, r, half } = B;
  const WALL = 0xb8c2cc, WHITE = 0xe4e8ec, STEEL = 0x8e98a4, GOO = 0x4cff6a, H = 3.8, DW = 4.4;
  B.perimeter({ mat: 'wall', gates: {}, h: () => 4.2, tint: WALL, pillar: 'metal' });
  // なかの かべ（ドアの ところだけ あける）。axis 'x' = x に そって のびる かべ
  const wall = (axis, at, from, to, gaps) => {
    for (let a = from; a < to - 0.01; a += 2) {
      const c = a + 1;
      if (gaps.some((g) => Math.abs(c - g) < DW / 2 + 0.6)) continue;
      if (axis === 'x') add('wall', c, 0, at, 2, H, 0.8, { tint: WALL }); else add('wall', at, 0, c, 0.8, H, 2, { tint: WALL });
    }
    if (axis === 'x') deco('metal', (from + to) / 2, H - 0.05, at, to - from, 0.2, 0.9, { tint: 0x3ab84a });
    else deco('metal', at, H - 0.05, (from + to) / 2, 0.9, 0.2, to - from, { tint: 0x3ab84a });
  };
  // へや（x0,z0,x1,z1）
  const rooms = [
    { name: 'いりぐち', b: [-half, 12, 0, half] },
    { name: 'サーバーしつ', b: [0, 12, half, half] },
    { name: 'タンクの ホール', b: [-half, -12, half, 12] },
    { name: 'ちかの じっけんしつ', b: [-half, -half, half, -12] },
  ];
  // ドア: i ばんめ の へやを きれいに すると ひらく（へや i → i+1）
  const doors = [
    { x: 0, z: 24, axis: 'z' },
    { x: 30, z: 12, axis: 'x' },
    { x: -30, z: -12, axis: 'x' },
  ];
  wall('z', 0, 12, half, [24]);
  wall('x', 12, -half, half, [30]);
  wall('x', -12, -half, half, [-30]);
  for (const [i, d] of doors.entries()) {
    const ax = d.axis === 'x';
    // ドアの わく（てつ）と きけんの しま。ドアの いたは ゲームが うごかす（ここは みえない かべ だけ）
    for (const s of [-1, 1]) add('metal', d.x + (ax ? s * (DW / 2 + 0.3) : 0), 0, d.z + (ax ? 0 : s * (DW / 2 + 0.3)), ax ? 0.6 : 1.1, H, ax ? 1.1 : 0.6, { tint: STEEL });
    deco('stripe', d.x, H - 0.7, d.z, ax ? DW + 1.2 : 1.0, 0.6, ax ? 1.0 : DW + 1.2);
    add('none', d.x, 0, d.z, ax ? DW + 0.4 : 0.5, 9, ax ? 0.5 : DW + 0.4, { barrier: true, door: i });
    B.reserve(d.x - 4, d.z - 4, d.x + 4, d.z + 4);
  }
  B.reserve(-34, 26, -24, 34); // スタート
  // ---- へや0: いりぐち（うけつけ・つくえ・はこ）----
  deco('tile', -18, 0.004, 24, 34, 0.02, 22, { tint: 0xc8d0d4 });
  add('metal', -18, 0, 18, 7, 1.1, 1.4, { tint: WHITE }); deco('light', -18, 1.1, 17.25, 5, 0.12, 0.05);
  const bench = (x, z, along) => {
    const ax = along === 'x';
    add('metal', x, 0, z, ax ? 4 : 1.2, 0.95, ax ? 1.2 : 4, { tint: WHITE });
    deco('dark', x - (ax ? 1 : 0), 0.95, z - (ax ? 0 : 1), 0.7, 0.55, 0.5);
    deco('light', x - (ax ? 1 : 0), 1.05, z - (ax ? 0.26 : 1.26), 0.5, 0.3, 0.02);
    deco('glass', x + (ax ? 1 : 0), 0.95, z + (ax ? 0 : 1), 0.3, 0.35, 0.3, { tint: GOO });
  };
  for (const [x, z, a] of [[-26, 22, 'x'], [-10, 30, 'x'], [-8, 20, 'z'], [-30, 16, 'x']]) bench(x, z, a);
  for (const [x, z, n] of [[-20, 30, 2], [-4, 15, 1], [-33, 20, 1]]) B.crate(x, z, n, 0xd8dde2);
  // ---- へや1: サーバーしつ（くらい たな・バリケード）----
  for (const x of [8, 14, 20, 26]) for (const z of [18, 30]) {
    add('dark', x, 0, z, 1.4, 2.6, 3.2);
    for (let y = 0.5; y < 2.4; y += 0.5) deco('light', x - 0.71, y, z - 1 + r() * 2, 0.02, 0.06, 0.12);
  }
  for (const [x, z, a, l] of [[11, 24, 'x', 3], [23, 25, 'x', 3]]) add('metal', x, 0, z, a === 'x' ? l : 0.3, 1.1, a === 'x' ? 0.3 : l, { tint: 0x6a7480 });
  for (const [x, z] of [[32, 30], [4, 32], [33, 17]]) B.barrel(x, z, 0x3aa84a);
  // ---- へや2: タンクの ホール（みどりの えきの タンクが ならぶ）----
  deco('tile', 0, 0.004, 0, 70, 0.02, 22, { tint: 0xb8c4c8 });
  const tank = (x, z, s = 1.6, h = 2.6) => {
    add('metal', x, 0, z, s + 0.3, 0.4, s + 0.3, { tint: STEEL });
    add('glass', x, 0.4, z, s, h, s);
    deco('water', x, 0.45, z, s - 0.3, h * 0.72, s - 0.3, { tint: GOO });
    add('metal', x, 0.4 + h, z, s + 0.3, 0.35, s + 0.3, { tint: STEEL });
    deco('metal', x, 0.75 + h, z, 0.3, H - 1.1 - h, 0.3, { tint: STEEL });
  };
  for (const x of [-22, -14, -6, 2, 10, 18]) for (const z of [-5, 5]) tank(x + (z > 0 ? 3 : 0), z);
  deco('metal', 0, H - 0.6, -5, 64, 0.3, 0.3, { tint: STEEL }); deco('metal', 0, H - 0.6, 5, 64, 0.3, 0.3, { tint: STEEL });
  for (const [x, z, s] of [[-10, 0, 3], [14, -1, 2.4], [26, 6, 2]]) deco('water', x, 0.02, z, s, 0.04, s * 0.8, { tint: GOO });
  // ---- へや3: ちかの じっけんしつ（ボス）----
  tank(0, -24, 3, 3.2);
  for (const a of [0, 1, 2, 3, 4, 5]) { const t = a / 6 * Math.PI * 2; tank(Math.cos(t) * 11, -24 + Math.sin(t) * 7.5, 1.4, 2.2); }
  for (const [x, z, s] of [[-20, -20, 3], [20, -28, 2.6]]) deco('water', x, 0.02, z, s, 0.04, s * 0.8, { tint: GOO });
  for (const [x, z, n] of [[-28, -30, 2], [28, -18, 1], [24, -32, 2], [-24, -16, 1]]) B.crate(x, z, n, 0xd8dde2);
  for (const [x, z] of [[-31, -24], [31, -26]]) B.barrel(x, z, 0x3aa84a);
  // あかり（よるでも みえる。おおすぎると おもい → 8こ）
  for (const [x, z] of [[-18, 28], [-4, 22], [16, 24], [-26, 0], [6, 0], [28, -2], [-14, -28], [14, -20]]) B.lamp(x, z);
  B.perch([[-28, 28], [30, 28], [-30, 6], [30, -6], [-30, -30], [30, -30]], 2);
  // へやごとの ゾンビの でぐち（かべぎわ・プレイヤーから はなれた ところを えらぶ）
  for (const rm of rooms) {
    const [x0, z0, x1, z1] = rm.b, sp = [];
    for (let k = 0; k < 8; k++) {
      const t = (k + 0.5) / 8, side = k % 4;
      const x = side === 0 ? x0 + 2 : side === 1 ? x1 - 2 : x0 + 2 + t * (x1 - x0 - 4);
      const z = side === 2 ? z0 + 2 : side === 3 ? z1 - 2 : z0 + 2 + t * (z1 - z0 - 4);
      if (!B.hit(x, z, 0.5)) sp.push({ x, z });
    }
    rm.spawns = sp;
  }
  const spawns = rooms.flatMap((rm) => rm.spawns);
  return B.done({ ground: 'concrete', tint: 0x6a8a7a, k: 0.32, far: 'hospital', farTint: 0x8a9a94 }, {
    backdrop: 'hospital', spawns, playerStart: { x: -30, z: 30, yaw: -Math.PI / 2 },
    gk: { rooms, doors, doorW: DW, doorH: H },
  });
}
