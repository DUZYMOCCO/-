// まちの マップ（データだけ。three.js なし → テストで つかえる）
// box: { mat, minX,minY,minZ,maxX,maxY,maxZ, collide, barrier?, tint? }
export const HALF = 32;

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

export function buildMap() {
  const boxes = [];
  const r = rng(2026);
  const add = (mat, cx, y0, cz, sx, sy, sz, opt = {}) => {
    const b = { mat, minX: cx - sx / 2, maxX: cx + sx / 2, minY: y0, maxY: y0 + sy, minZ: cz - sz / 2, maxZ: cz + sz / 2, collide: true, ...opt };
    boxes.push(b); return b;
  };
  const deco = (mat, cx, y0, cz, sx, sy, sz, opt = {}) => add(mat, cx, y0, cz, sx, sy, sz, { collide: false, ...opt });

  // みち（じゅうじ）と ほどう
  deco('road', 0, 0, 0, 7, 0.02, HALF * 2);
  deco('road', 0, 0, 0, HALF * 2, 0.02, 7);
  for (let z = -HALF + 2; z < HALF; z += 4) if (Math.abs(z) > 4) deco('roadLine', 0, 0.021, z, 0.25, 0.005, 2);
  for (let x = -HALF + 2; x < HALF; x += 4) if (Math.abs(x) > 4) deco('roadLine', x, 0.021, 0, 2, 0.005, 0.25, { rot: true });
  for (const s of [-1, 1]) {
    deco('cobble', s * 4.25, 0, 0, 1.5, 0.12, HALF * 2);
    deco('cobble', 0, 0, s * 4.25, HALF * 2, 0.12, 1.5);
  }

  // まわりの へい（ゲートの すきまから ゾンビが くる）
  const gateW = 4;
  const wallH = (i) => 2.6 + ((i * 37) % 5) * 0.35;
  for (const side of [-1, 1]) {
    let i = 0;
    for (let a = -HALF; a < HALF; a += 2) {
      const c = a + 1;
      if (Math.abs(c) < gateW / 2 + 0.5) continue;
      const h = wallH(i++ + (side > 0 ? 3 : 0));
      add('brick', c, 0, side * (HALF + 0.5), 2, h, 1);
      add('brick', side * (HALF + 0.5), 0, c, 1, h, 2);
    }
    // ゲート: プレイヤーだけ とおれない みえない かべ（ゾンビは とおる）
    add('none', 0, 0, side * (HALF - 0.2), gateW + 1, 4, 0.4, { barrier: true });
    add('none', side * (HALF - 0.2), 0, 0, 0.4, 4, gateW + 1, { barrier: true });
    // ゲートの はしら
    for (const g of [-1, 1]) {
      add('concrete', g * (gateW / 2 + 0.6), 0, side * (HALF + 0.5), 1.2, 4, 1.2);
      add('concrete', side * (HALF + 0.5), 0, g * (gateW / 2 + 0.6), 1.2, 4, 1.2);
    }
  }

  // こわれた たてもの（4つの ブロック）
  const ruin = (cx, cz, w, d, mat, seed) => {
    const rr = rng(seed), t = 0.6;
    const seg = (x0, z0, x1, z1, doorAt) => {
      const len = Math.hypot(x1 - x0, z1 - z0), n = Math.round(len);
      for (let k = 0; k < n; k++) {
        if (doorAt != null && Math.abs(k + 0.5 - doorAt) < 1.1) continue;
        const f = (k + 0.5) / n, x = x0 + (x1 - x0) * f, z = z0 + (z1 - z0) * f;
        const broken = rr() < 0.35;
        const h = broken ? 0.8 + rr() * 1.6 : 3 + rr() * 1.2;
        const horiz = Math.abs(x1 - x0) > Math.abs(z1 - z0);
        add(mat, x, 0, z, horiz ? len / n : t, h, horiz ? t : len / n);
      }
    };
    const x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2, z1 = cz + d / 2;
    seg(x0, z0, x1, z0, Math.floor(w / 2));
    seg(x0, z1, x1, z1, rr() < 0.5 ? 2 : w - 2);
    seg(x0, z0 + t, x0, z1 - t, Math.floor(d / 2));
    seg(x1, z0 + t, x1, z1 - t, rr() < 0.5 ? 2 : null);
    // ゆかと がれき
    deco('concrete', cx, 0, cz, w - 0.2, 0.06, d - 0.2);
    for (let k = 0; k < 3; k++) add(mat, cx + (rr() - 0.5) * (w - 3), 0, cz + (rr() - 0.5) * (d - 3), 0.8 + rr(), 0.4 + rr() * 0.4, 0.8 + rr());
  };
  ruin(-17, -17, 12, 10, 'brick', 5);
  ruin(17, -16, 10, 12, 'cobble', 8);
  ruin(-16, 18, 10, 11, 'cobble', 13);
  ruin(18, 17, 11, 10, 'brick', 21);

  // くるま（かくう・ロゴなし）
  const car = (cx, cz, along, tint) => {
    const L = 4, W = 1.9;
    const sx = along === 'x' ? L : W, sz = along === 'x' ? W : L;
    add('metal', cx, 0.35, cz, sx, 0.75, sz, { tint });
    const cs = along === 'x' ? [2.2, 1.7] : [1.7, 2.2];
    const off = along === 'x' ? [-0.2, 0] : [0, -0.2];
    add('glass', cx + off[0], 1.1, cz + off[1], cs[0], 0.62, cs[1]);
    add('metal', cx + off[0], 1.72, cz + off[1], cs[0] + 0.05, 0.08, cs[1] + 0.05, { tint, collide: false });
    for (const a of [-1, 1]) for (const b of [-1, 1]) {
      const wx = along === 'x' ? a * 1.3 : b * 0.95, wz = along === 'x' ? b * 0.95 : a * 1.3;
      deco('dark', cx + wx, 0, cz + wz, along === 'x' ? 0.7 : 0.3, 0.7, along === 'x' ? 0.3 : 0.7);
    }
    const fz = along === 'x' ? [L / 2 + 0.01, 0] : [0, L / 2 + 0.01];
    for (const s of [-0.6, 0.6]) {
      const lx = along === 'x' ? cx + fz[0] : cx + s, lz = along === 'x' ? cz + s : cz + fz[1];
      deco('light', lx, 0.75, lz, along === 'x' ? 0.05 : 0.35, 0.18, along === 'x' ? 0.35 : 0.05);
    }
  };
  car(-2, 9, 'z', 0xd84a3a);
  car(9.5, 1.8, 'x', 0x3a7bd8);
  car(-11, -2.2, 'x', 0xe0b43a);
  car(2.2, -14, 'z', 0x8fd0c8);
  car(24, -2, 'x', 0xeeeeee);

  // はこ・つみかさね
  const crates = [[6, 6], [7, 6], [6.5, 7.1], [-6, -7], [-7.1, -7], [-6, -8.1], [12, 10], [-12, 9], [-9, 13], [14, -8], [-24, 2], [3, 22], [-3, -24], [25, 9], [-25, -10]];
  for (const [x, z] of crates) add('crate', x, 0, z, 1, 1, 1);
  add('crate', 6, 1, 6, 1, 1, 1);
  add('crate', -6, 1, -7, 1, 1, 1);
  add('crate', 14, 1, -8, 1, 1, 1);

  // どのう（ひくい カバー）
  const bags = [[-5, 5, 'x'], [5, -5, 'z'], [10, -10, 'x'], [-10, 10, 'z'], [0, 16, 'x'], [16, 0, 'z'], [-16, 0, 'z'], [0, -18, 'x']];
  for (const [x, z, a] of bags) add('sandbag', x, 0, z, a === 'x' ? 3 : 0.9, 0.95, a === 'x' ? 0.9 : 3);

  // ドラムかん
  const barrels = [[8, -3.5, 0xc0392b], [8.9, -3.6, 0x2e86c1], [-8, 4.2, 0x27ae60], [21, 6, 0xc0392b], [-21, -6, 0x2e86c1], [4.5, 12, 0xe67e22]];
  for (const [x, z, tint] of barrels) add('barrel', x, 0, z, 0.75, 1.0, 0.75, { tint });

  // き（ブロックの き）
  const trees = [[-26, 26], [26, -26], [-27, -25], [27, 26], [-8, 26], [10, -26], [26, 12], [-26, -14], [-10, -26], [9, 25]];
  for (const [x, z] of trees) {
    const h = 3 + r() * 1.5;
    add('log', x, 0, z, 0.7, h, 0.7);
    deco('leaves', x, h - 0.6, z, 3.2, 1.6, 3.2);
    deco('leaves', x, h + 1.0, z, 2.0, 1.0, 2.0);
  }

  // がいとう
  for (const [x, z] of [[-5.5, -12], [5.5, 12], [12, -5.5], [-12, 5.5], [5.5, -24], [-5.5, 24]]) {
    add('dark', x, 0, z, 0.25, 4.2, 0.25);
    deco('dark', x, 4.1, z, 0.9, 0.15, 0.3);
    deco('light', x, 3.98, z, 0.5, 0.12, 0.22);
  }

  const spawns = [
    { x: 0, z: -HALF - 2 }, { x: 0, z: HALF + 2 }, { x: -HALF - 2, z: 0 }, { x: HALF + 2, z: 0 },
  ];
  return { boxes, spawns, playerStart: { x: 0, z: 4, yaw: 0 }, half: HALF };
}

export function colliders(map) { return map.boxes.filter((b) => b.collide); }
export function playerColliders(map) { return map.boxes.filter((b) => b.collide); }
export function zombieColliders(map) { return map.boxes.filter((b) => b.collide && !b.barrier); }
export function shotColliders(map) { return map.boxes.filter((b) => b.collide && !b.barrier); }
