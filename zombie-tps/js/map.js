// マップ（データだけ。three.js なし → テストで つかえる）
// box: { mat, minX,minY,minZ,maxX,maxY,maxZ, collide, barrier?, tint?, rot? }
// v0.5.0: 6しゅるいの ひろい マップ（まち・ショッピングモール・きち・びょういん・もりの キャンプじょう・みなと）
// ぜんぶ かくう（はた・マーク・ロゴ・あかい じゅうじ なし）
export const HALF = 32; // むかしの まちの ひろさ（テストの くらべ よう）

export const MAPS = [
  { id: 'city', name: 'まち', icon: '🏙', half: 44, desc: 'こわれた ビルと ひろい みち' },
  { id: 'mall', name: 'ショッピングモール', icon: '🛒', half: 42, desc: 'くるまが いっぱいの ちゅうしゃじょう' },
  { id: 'base', name: 'ぐんの きち', icon: '⛺', half: 46, desc: 'テント・みはりだい・コンテナ' },
  { id: 'hospital', name: 'びょういん', icon: '🌷', half: 42, desc: 'しろい たてものと にわ' },
  { id: 'camp', name: 'もりの キャンプじょう', icon: '🌲', half: 46, desc: 'き・テント・こや・いけ' },
  { id: 'harbor', name: 'みなと', icon: '⚓', half: 44, desc: 'コンテナの まよいみち と うみ' },
];
export const MAP_IDS = MAPS.map((m) => m.id);
export const mapInfo = (id) => MAPS.find((m) => m.id === id) || MAPS[0];

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// ---- きょうつうの くみたて ----
function builder(half, seed) {
  const boxes = [], lamps = [], spawns = [], keep = [];
  const r = rng(seed);
  const add = (mat, cx, y0, cz, sx, sy, sz, opt = {}) => {
    const b = { mat, minX: cx - sx / 2, maxX: cx + sx / 2, minY: y0, maxY: y0 + sy, minZ: cz - sz / 2, maxZ: cz + sz / 2, collide: true, ...opt };
    boxes.push(b); return b;
  };
  const deco = (mat, cx, y0, cz, sx, sy, sz, opt = {}) => add(mat, cx, y0, cz, sx, sy, sz, { collide: false, ...opt });
  // あけておく ばしょ（スタート・ゲートの まえ）
  const reserve = (x0, z0, x1, z1) => keep.push([Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)]);
  const free = (x, z, rad = 1) => {
    if (Math.abs(x) > half - 3 - rad || Math.abs(z) > half - 3 - rad) return false;
    for (const [a, b, c, d] of keep) if (x + rad > a && x - rad < c && z + rad > b && z - rad < d) return false;
    return true;
  };
  const B = { half, boxes, lamps, spawns, r, add, deco, reserve, free };

  // まわりの かべ と ゲート（gates: { n:[x...], s:[x...], w:[z...], e:[z...] }）
  B.perimeter = ({ mat = 'brick', gates, h = (i) => 2.6 + ((i * 37) % 5) * 0.35, tint = null, gateW = 4, pillar = 'concrete', lowNorth = null }) => {
    const sides = [['n', 0, -1], ['s', 0, 1], ['w', 1, -1], ['e', 1, 1]];
    for (const [key, axis, sg] of sides) {
      const gl = gates[key] || [];
      let i = 0;
      const low = key === 'n' && lowNorth;
      for (let a = -half; a < half; a += 2) {
        const c = a + 1;
        if (gl.some((g) => Math.abs(c - g) < gateW / 2 + 0.5)) continue;
        const hh = low ? lowNorth.h : h(i + (sg > 0 ? 3 : 0) + axis * 7);
        const t = typeof tint === 'function' ? tint(c, key) : tint;
        const m = low ? lowNorth.mat : mat;
        if (axis === 0) add(m, c, 0, sg * (half + 0.5), 2, hh, 1, t != null ? { tint: t } : {});
        else add(m, sg * (half + 0.5), 0, c, 1, hh, 2, t != null ? { tint: t } : {});
        i++;
      }
      for (const g of gl) {
        // ゲート: プレイヤーだけ とおれない みえない かべ（ゾンビは とおる）
        if (axis === 0) add('none', g, 0, sg * (half - 0.2), gateW + 1, 9, 0.4, { barrier: true });
        else add('none', sg * (half - 0.2), 0, g, 0.4, 9, gateW + 1, { barrier: true });
        for (const p of [-1, 1]) {
          if (axis === 0) add(pillar, g + p * (gateW / 2 + 0.6), 0, sg * (half + 0.5), 1.2, 4, 1.2);
          else add(pillar, sg * (half + 0.5), 0, g + p * (gateW / 2 + 0.6), 1.2, 4, 1.2);
        }
        const sx = axis === 0 ? g : sg * (half + 2), sz = axis === 0 ? sg * (half + 2) : g;
        spawns.push({ x: sx, z: sz });
        // ゲートの まえは あけておく
        if (axis === 0) reserve(g - 3.5, sg * half, g + 3.5, sg * (half - 8));
        else reserve(sg * half, g - 3.5, sg * (half - 8), g + 3.5);
      }
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(pillar, sx * (half + 0.5), 0, sz * (half + 0.5), 1.2, 4, 1.2);
  };
  // くるま（かくう・ロゴなし）
  B.car = (cx, cz, along, tint) => {
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
  // バン（きゅうきゅうしゃ ふう。しろ＋オレンジの せん・じゅうじ なし）
  B.van = (cx, cz, along, tint, stripe) => {
    const L = 5, W = 2.1, ax = along === 'x';
    add('metal', cx, 0.35, cz, ax ? L : W, 1.85, ax ? W : L, { tint });
    add('glass', cx + (ax ? L / 2 - 0.2 : 0), 1.25, cz + (ax ? 0 : L / 2 - 0.2), ax ? 0.45 : W + 0.04, 0.6, ax ? W + 0.04 : 0.45, { collide: false });
    if (stripe != null) deco('metal', cx, 1.0, cz, ax ? L + 0.04 : W + 0.04, 0.25, ax ? W + 0.04 : L + 0.04, { tint: stripe });
    deco('light', cx, 2.2, cz + (ax ? 0 : L / 2 - 0.8), ax ? 0.4 : 1.2, 0.18, ax ? 1.2 : 0.4);
    for (const a of [-1, 1]) for (const b of [-1, 1]) deco('dark', cx + (ax ? a * 1.6 : b * 1.0), 0, cz + (ax ? b * 1.0 : a * 1.6), ax ? 0.75 : 0.3, 0.75, ax ? 0.3 : 0.75);
  };
  // トラック（にだいに ほろ）
  B.truck = (cx, cz, along, tint, cover = 0x6b7046) => {
    const ax = along === 'x', s = (a, b) => (ax ? a : b);
    add('metal', cx + s(2.6, 0), 0.5, cz + s(0, 2.6), s(1.8, 2.3), 1.6, s(2.3, 1.8), { tint });
    add('glass', cx + s(3.52, 0), 1.3, cz + s(0, 3.52), s(0.06, 1.9), 0.6, s(1.9, 0.06), { collide: false });
    add('metal', cx - s(0.9, 0), 0.5, cz - s(0, 0.9), s(5, 2.4), 0.5, s(2.4, 5), { tint });
    add('tent', cx - s(0.9, 0), 1.0, cz - s(0, 0.9), s(5, 2.4), 1.6, s(2.4, 5), { tint: cover });
    for (const p of [-2.6, -0.6, 2.6]) for (const q of [-1, 1]) deco('dark', cx + s(p, q * 1.1), 0, cz + s(q * 1.1, p), s(0.9, 0.3), 0.9, s(0.3, 0.9));
  };
  B.crate = (x, z, n = 1, tint) => { for (let k = 0; k < n; k++) add('crate', x, k, z, 1, 1, 1, tint != null ? { tint } : {}); };
  B.bags = (x, z, along, len = 3) => add('sandbag', x, 0, z, along === 'x' ? len : 0.9, 0.95, along === 'x' ? 0.9 : len);
  B.barrel = (x, z, tint) => add('barrel', x, 0, z, 0.75, 1.0, 0.75, { tint });
  B.tree = (x, z, h = 3 + r() * 1.5, leafTint, wide = 1) => {
    add('log', x, 0, z, 0.7, h, 0.7);
    deco('leaves', x, h - 0.6, z, 3.2 * wide, 1.6, 3.2 * wide, leafTint != null ? { tint: leafTint } : {});
    deco('leaves', x, h + 1.0, z, 2.0 * wide, 1.0, 2.0 * wide, leafTint != null ? { tint: leafTint } : {});
  };
  // とがった き（もり）
  B.pine = (x, z, h = 3.4 + r() * 1.0, leafTint = 0x9cc890) => {
    add('log', x, 0, z, 0.6, h, 0.6);
    deco('leaves', x, 1.4, z, 3.0, 1.4, 3.0, { tint: leafTint });
    deco('leaves', x, 2.8, z, 2.2, 1.3, 2.2, { tint: leafTint });
    deco('leaves', x, 4.1, z, 1.3, 1.2, 1.3, { tint: leafTint });
  };
  B.hedge = (x, z, along, len, h = 1.0) => add('leaves', x, 0, z, along === 'x' ? len : 0.9, h, along === 'x' ? 0.9 : len, { tint: 0x9fc890 });
  B.lamp = (x, z, pole = 'dark') => {
    add(pole, x, 0, z, 0.25, 4.2, 0.25);
    deco('dark', x, 4.1, z, 0.9, 0.15, 0.3);
    deco('light', x, 3.98, z, 0.5, 0.12, 0.22);
    lamps.push({ x, z, h: 3.98 });
  };
  B.container = (x, z, along, tint, y0 = 0) => {
    const b = add('container', x, y0, z, along === 'x' ? 6 : 2.4, 2.6, along === 'x' ? 2.4 : 6, { tint });
    // とびらの せん
    deco('dark', x + (along === 'x' ? 3.01 : 0), y0 + 0.1, z + (along === 'x' ? 0 : 3.01), along === 'x' ? 0.02 : 0.08, 2.4, along === 'x' ? 0.08 : 0.02);
    return b;
  };
  B.tent = (x, z, along, tint = 0x8a8f5a, big = false) => {
    const L = big ? 6 : 4, W = big ? 4 : 3, ax = along === 'x';
    add('tent', x, 0, z, ax ? L : W, 1.4, ax ? W : L, { tint });
    add('tent', x, 1.4, z, ax ? L - 0.2 : W * 0.55, 0.7, ax ? W * 0.55 : L - 0.2, { tint });
    deco('dark', x + (ax ? L / 2 + 0.01 : 0), 0, z + (ax ? 0 : L / 2 + 0.01), ax ? 0.02 : 1.0, 1.3, ax ? 1.0 : 0.02);
  };
  // こわれた たてもの
  B.ruin = (cx, cz, w, d, mat, seed) => {
    const rr = rng(seed), t = 0.6;
    const seg = (x0, z0, x1, z1, doorAt) => {
      const len = Math.hypot(x1 - x0, z1 - z0), n = Math.round(len / 1.5);
      for (let k = 0; k < n; k++) {
        if (doorAt != null && Math.abs((k + 0.5) * (len / n) - doorAt) < 1.3) continue;
        const f = (k + 0.5) / n, x = x0 + (x1 - x0) * f, z = z0 + (z1 - z0) * f;
        const broken = rr() < 0.35;
        const h = broken ? 0.8 + rr() * 1.6 : 3 + rr() * 1.2;
        const horiz = Math.abs(x1 - x0) > Math.abs(z1 - z0);
        add(mat, x, 0, z, horiz ? len / n : t, h, horiz ? t : len / n);
      }
    };
    const x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2, z1 = cz + d / 2;
    seg(x0, z0, x1, z0, w / 2);
    seg(x0, z1, x1, z1, rr() < 0.5 ? 2.5 : w - 2.5);
    seg(x0, z0 + t, x0, z1 - t, d / 2);
    seg(x1, z0 + t, x1, z1 - t, rr() < 0.5 ? 2.5 : null);
    deco('concrete', cx, 0, cz, w - 0.2, 0.06, d - 0.2);
    for (let k = 0; k < 3; k++) add(mat, cx + (rr() - 0.5) * (w - 3), 0, cz + (rr() - 0.5) * (d - 3), 0.8 + rr(), 0.4 + rr() * 0.4, 0.8 + rr());
  };
  // はいれない たてもの（まどは かざり）
  B.building = (cx, cz, w, d, h, mat, tint, win = 'glass') => {
    add(mat, cx, 0, cz, w, h, d, tint != null ? { tint } : {});
    for (let y = 1.3; y + 1.1 < h; y += 2.4) {
      for (let x = cx - w / 2 + 1.5; x < cx + w / 2 - 1; x += 2.5) {
        deco(win, x, y, cz - d / 2 - 0.03, 1.3, 1.0, 0.06); deco(win, x, y, cz + d / 2 + 0.03, 1.3, 1.0, 0.06);
      }
      for (let z = cz - d / 2 + 1.5; z < cz + d / 2 - 1; z += 2.5) {
        deco(win, cx - w / 2 - 0.03, y, z, 0.06, 1.0, 1.3); deco(win, cx + w / 2 + 0.03, y, z, 0.06, 1.0, 1.3);
      }
    }
    deco('dark', cx, h, cz, w + 0.3, 0.25, d + 0.3);
  };
  // ばらまき（free な ばしょ だけ）
  B.scatter = (n, rad, fn, tries = 8) => {
    for (let i = 0; i < n; i++) for (let k = 0; k < tries; k++) {
      const x = (r() * 2 - 1) * (half - 4), z = (r() * 2 - 1) * (half - 4);
      if (!B.free(x, z, rad)) continue;
      if (B.hit(x, z, rad)) continue;
      fn(x, z, i); break;
    }
  };
  // その ばしょに もう ぶつかる ものが あるか
  B.hit = (x, z, rad) => boxes.some((b) => b.collide && x + rad > b.minX && x - rad < b.maxX && z + rad > b.minZ && z - rad < b.maxZ);
  B.done = (theme, extra = {}) => ({ boxes, spawns, lamps, playerStart: { x: 0, z: 4, yaw: 0 }, half, theme, ...extra });
  // スタートと タイトルの けしき（プレイヤーの まわり）は あけておく
  reserve(-4, -1, 4, 8);
  return B;
}

const GATES3 = (g) => ({ n: [-g, 0, g], s: [-g, 0, g], w: [-g, 0, g], e: [-g, 0, g] });
const CAR_TINTS = [0xd84a3a, 0x3a7bd8, 0xe0b43a, 0x8fd0c8, 0xeeeeee, 0x5a5f66, 0x2f8a4a, 0x9a4ad8, 0x2a2a30];

// ================= まち =================
function city() {
  const B = builder(44, 2026), { half, deco, r } = B;
  const roads = [-24, 0, 24];
  for (const c of roads) {
    deco('road', c, 0, 0, 7, 0.02, half * 2); deco('road', 0, 0.001, c, half * 2, 0.02, 7);
    for (let z = -half + 2; z < half; z += 4) if (roads.every((q) => Math.abs(z - q) > 4)) deco('roadLine', c, 0.021, z, 0.25, 0.005, 2);
    for (let x = -half + 2; x < half; x += 4) if (roads.every((q) => Math.abs(x - q) > 4)) deco('roadLine', x, 0.021, c, 2, 0.005, 0.25, { rot: true });
    for (const s of [-1, 1]) { deco('cobble', c + s * 4.25, 0, 0, 1.5, 0.12, half * 2); deco('cobble', 0, 0, c + s * 4.25, half * 2, 0.12, 1.5); }
  }
  B.perimeter({ mat: 'brick', gates: GATES3(24) });
  // ブロック（たてもの・こうえん・ちゅうしゃじょう）
  const centers = [-34, -12, 12, 34];
  let k = 0;
  for (const bx of centers) for (const bz of centers) {
    const kind = (k++ * 7 + 3) % 5;
    if (Math.abs(bx) === 12 && bz === 12) { // スタートの まえ: こうえん（タイトルの けしき）
      for (const [x, z] of [[8, 9], [16, 10], [9, 16], [16, 17], [12, 13.5]]) B.tree(x + (bx < 0 ? -20 : 0), z, undefined);
      continue;
    }
    if (kind <= 1) B.ruin(bx, bz, 11 + r() * 2, 10 + r() * 2, kind ? 'brick' : 'cobble', 5 + k * 11);
    else if (kind === 2) { // こうえん
      for (let i = 0; i < 4; i++) B.tree(bx + (r() - 0.5) * 9, bz + (r() - 0.5) * 9);
      B.add('plank', bx, 0, bz + 3.5, 2.4, 0.45, 0.6);
    } else if (kind === 3) { // ちゅうしゃじょう
      for (let i = 0; i < 3; i++) if (r() < 0.8) B.car(bx - 4 + i * 4, bz + (r() - 0.5) * 2, 'z', CAR_TINTS[(k + i) % CAR_TINTS.length]);
      B.crate(bx + 5, bz - 5, 2); B.crate(bx + 6, bz - 5);
    } else { // どのうの じんち
      B.bags(bx - 2, bz, 'z'); B.bags(bx + 2, bz, 'z'); B.bags(bx, bz - 2.5, 'x');
      B.barrel(bx + 4, bz + 4, 0xc0392b); B.barrel(bx + 4.9, bz + 4.1, 0x2e86c1); B.crate(bx - 4, bz + 4, 2);
    }
  }
  // みちの くるま（のりすて）
  const cars = [[-2, 9, 'z'], [9.5, 1.8, 'x'], [-11, -2.2, 'x'], [2.2, -14, 'z'], [24 + 2, -10, 'z'], [-24 - 2, 12, 'z'], [30, 24 + 2, 'x'], [-14, -24 + 2, 'x'], [2, 30, 'z'], [-30, -24 - 1.8, 'x']];
  cars.forEach(([x, z, a], i) => B.car(x, z, a, CAR_TINTS[i % CAR_TINTS.length]));
  // どのう・はこ（みちの カバー）
  for (const [x, z, a] of [[-5, 5, 'x'], [5, -5, 'z'], [0, 16, 'x'], [16, 0, 'z'], [-16, 0, 'z'], [0, -18, 'x'], [24, 16, 'x'], [-24, -16, 'x'], [16, -24, 'z'], [-16, 24, 'z']]) B.bags(x, z, a);
  for (const [x, z, n] of [[6, 6, 2], [7, 6, 1], [-6, -7, 2], [-7.1, -7, 1], [14, -8, 2], [-20, 2, 1], [20, 28, 1], [-28, 20, 2], [28, -20, 1]]) B.crate(x, z, n);
  for (const [x, z, t] of [[8, -3.5, 0xc0392b], [8.9, -3.6, 0x2e86c1], [-8, 4.2, 0x27ae60], [21, 6, 0xc0392b], [-21, -6, 0x2e86c1]]) B.barrel(x, z, t);
  for (const c of roads) for (const a of [-30, -18, -6, 6, 18, 30]) { if (B.free(c + 5.5, a, 0.3)) B.lamp(c + 5.5, a); }
  return B.done({ ground: 'grass', tint: 0x8a8070, k: 0.15, far: 'city', farTint: 0x9a9aa8 });
}

// ================= ショッピングモール =================
function mall() {
  const B = builder(42, 77), { half, deco, add, r } = B;
  B.perimeter({ mat: 'concrete', gates: { n: [0], s: [-24, 0, 24], w: [-12, 14], e: [-12, 14] }, h: () => 2.8, tint: 0xd8d4cc });
  // モールの たてもの（きた）。まんなかは いりぐちの とおりみち
  for (const s of [-1, 1]) {
    const cx = s * 21, w = 30;
    add('wall', cx, 0, -33, w, 6.5, 14, { tint: 0xe6dccb });
    deco('dark', cx, 6.5, -33, w + 0.3, 0.3, 14.3);
    // おみせの まど と ひさし（いろいろ）
    for (let x = cx - w / 2 + 2.5, i = 0; x < cx + w / 2 - 2; x += 5, i++) {
      deco('glass', x, 0.2, -25.97, 4, 2.4, 0.06);
      deco('plank', x, 2.7, -25.4, 4.4, 0.18, 1.2, { tint: [0xe04a3a, 0x3a6fe0, 0xf0c830, 0x3ab84a, 0xff7ab8][i % 5] });
    }
  }
  deco('concrete', 0, 4.2, -30, 10, 0.3, 8); // いりぐちの やね
  for (const x of [-4.6, 4.6]) add('concrete', x, 0, -27, 0.5, 4.2, 0.5);
  B.reserve(-5, -half, 5, -24);
  // ちゅうしゃじょう: しろい せん と くるまの れつ
  const rows = [-17, -9, 14, 22];
  for (const z of rows) {
    for (let x = -36; x <= 36; x += 3) {
      deco('paint', x - 1.5, 0.012, z, 0.12, 0.005, 5);
      if (Math.abs(x) < 5) continue;
      if (z > 10 && x > 12 && x < 34) continue; // たてものの ちゅうしゃじょう
      if (r() < 0.62) B.car(x, z, 'z', CAR_TINTS[Math.floor(r() * CAR_TINTS.length)]);
    }
    // れつの はしの うえこみ
    for (const s of [-1, 1]) { add('concrete', s * 38, 0, z, 2, 0.4, 5, { tint: 0xc8c4bc }); deco('leaves', s * 38, 0.4, z, 1.6, 0.6, 4, { tint: 0x9fc890 }); }
  }
  // たちょうの ちゅうしゃじょう（やねの したに くるま）
  for (let x = 14; x <= 32; x += 6) for (let z = 13; z <= 33; z += 6.5) add('concrete', x, 0, z, 0.6, 4.2, 0.6, { tint: 0xbab6ae });
  deco('concrete', 23, 4.2, 23, 20, 0.35, 22, { tint: 0xbab6ae });
  deco('stripe', 23, 0.012, 12, 20, 0.006, 0.4);
  for (const [x, z] of [[17, 17], [20, 23], [26, 17], [29, 29], [17, 30]]) B.car(x, z, 'z', CAR_TINTS[Math.floor(r() * CAR_TINTS.length)]);
  // カート と カートおきば
  for (const [x, z] of [[-8, 4], [8, -2], [-20, 4], [20, 2], [-30, 0]]) { add('metal', x, 0, z, 3.4, 1.0, 0.12, { tint: 0x9aa0a8 }); add('metal', x, 0, z + 1.6, 3.4, 1.0, 0.12, { tint: 0x9aa0a8 }); }
  B.scatter(14, 0.6, (x, z) => add('metal', x, 0, z, 0.6, 1.0, 0.9, { tint: 0xb0b6bc }));
  // バスてい・ベンチ
  add('plank', -14, 0, 32, 3, 0.45, 0.6); deco('glass', -14, 0.5, 33, 3.6, 2.2, 0.06); deco('metal', -14, 2.7, 32.4, 3.8, 0.12, 1.6, { tint: 0x5a8fd0 });
  for (const [x, z] of [[-6, 14 + 4], [6, -9 + 4], [-28, -2], [28, 8]]) B.crate(x, z, 2);
  for (const [x, z, t] of [[-12, 8, 0x3a6fe0], [12, 8, 0x3ab84a], [-3, -21, 0xe04a3a]]) B.barrel(x, z, t);
  for (const [x, z] of [[-30, -13], [-10, -13], [10, -13], [30, -13], [-30, 18], [-10, 18], [10, 18], [-36, 6], [36, 6], [0, 10]]) B.lamp(x, z);
  return B.done({ ground: 'asphalt', tint: 0x6a7a8a, k: 0.25, far: 'mall', farTint: 0x8a8f9a });
}

// ================= ぐんの きち =================
function base() {
  const B = builder(46, 4242), { half, deco, add, r } = B;
  B.perimeter({ mat: 'hesco', gates: GATES3(26), h: (i) => 2.8 + (i % 2) * 0.3, pillar: 'concrete' });
  // ほんぶ（きた）
  B.building(0, -24, 18, 8, 4.0, 'concrete', 0x9a9a80);
  // テントの れつ（にし）
  for (let z = -12; z <= 16; z += 7) for (const x of [-32, -24, -16]) if (B.free(x, z, 2.5)) B.tent(x, z, 'z', [0x7a8050, 0x8a7a58, 0x6a7448][Math.floor(r() * 3)], r() < 0.3);
  // コンテナの へや（ひがし）
  for (let z = -20; z <= 12; z += 5) for (const x of [20, 30]) if (B.free(x, z, 3)) { B.container(x, z, 'x', [0x6b7046, 0x8a7a58, 0x5a6a50][Math.floor(r() * 3)]); if (r() < 0.25) B.container(x, z, 'x', 0x7a7a60, 2.6); }
  // みはりだい（よすみ）
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * 38, z = sz * 38;
    for (const a of [-1, 1]) for (const b of [-1, 1]) add('log', x + a * 1.2, 0, z + b * 1.2, 0.3, 4.3, 0.3);
    deco('plank', x, 4.3, z, 3.2, 0.25, 3.2);
    deco('sandbag', x, 4.55, z, 3.2, 0.6, 0.3); deco('sandbag', x, 4.55, z + sz * 1.45, 3.2, 0.6, 0.3);
    deco('tent', x, 6.2, z, 3.6, 0.25, 3.6, { tint: 0x6b7046 });
    for (const a of [-1, 1]) deco('log', x + a * 1.4, 4.8, z, 0.2, 1.4, 0.2);
  }
  // ヘリポート（まるい せん だけ）
  deco('concrete', 24, 0, 28, 11, 0.04, 11, { tint: 0x8a8a84 });
  for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; deco('paint', 24 + Math.cos(a) * 4, 0.045, 28 + Math.sin(a) * 4, 1.0, 0.01, 1.0, { tint: 0xf0d040 }); }
  B.reserve(18.5, 22.5, 29.5, 33.5);
  // トラック
  for (const [x, z, a] of [[-6, 12, 'x'], [-28, 30, 'x'], [10, -12, 'z'], [36, 22, 'z']]) B.truck(x, z, a, 0x5f6640);
  // どのうの じんち・ジャージーかべ
  for (const [x, z] of [[-10, -4], [10, 2], [0, 22], [-14, 30], [14, -32]]) { B.bags(x - 1.8, z, 'z'); B.bags(x + 1.8, z, 'z'); B.bags(x, z - 1.8, 'x'); }
  for (let x = -20; x <= 20; x += 2.6) if (Math.abs(x) > 6 && B.free(x, -14, 0.8)) add('concrete', x, 0, -14, 2.2, 0.85, 0.7, { tint: 0xb8b4a8 });
  // くんれんじょう（ひくい かべ）
  for (let i = 0; i < 5; i++) add('plank', -30 + i * 3.5, 0, 25.5 + (i % 2) * 3.5, 2.4, 1.0, 0.6, { tint: 0xb89a6a });
  B.scatter(14, 0.8, (x, z, i) => (i % 3 === 0 ? B.barrel(x, z, [0x5f6640, 0x8a3a2a, 0x3a5a7a][i % 3]) : B.crate(x, z, 1 + (i % 2), 0xc8b890)));
  for (const [x, z] of [[-10, -10], [10, -10], [-10, 8], [10, 8], [-26, -26], [26, -26], [-26, 20], [26, 16], [0, 34], [0, -34]]) if (B.free(x, z, 0.3)) B.lamp(x, z);
  return B.done({ ground: 'dirt', tint: 0x8a7a50, k: 0.3, far: 'base', farTint: 0x8a8470 });
}

// ================= びょういん =================
function hospital() {
  const B = builder(42, 909), { half, deco, add, r } = B;
  B.perimeter({ mat: 'wall', gates: { n: [-34, 34], s: [-22, 0, 22], w: [-20, 6, 28], e: [-20, 6, 28] }, h: () => 2.7, tint: 0xd8dcd4, pillar: 'wall' });
  // ほんかん（しろい たてもの）
  B.building(0, -33, 52, 14, 6.5, 'wall', 0xf0f0ea);
  deco('metal', 0, 5.0, -25.9, 52, 0.4, 0.06, { tint: 0x3ab84a }); // みどりの おび
  deco('concrete', 0, 3.6, -22, 12, 0.3, 6, { tint: 0xe0e0d8 }); // いりぐちの やね
  for (const x of [-5.5, 5.5]) add('wall', x, 0, -19.5, 0.4, 3.6, 0.4, { tint: 0xe0e0d8 });
  // まえの みち（ぐるっと）
  deco('asphalt', 0, 0.005, -16, 60, 0.02, 6);
  deco('tile', 0, 0.004, 14, 26, 0.02, 26, { tint: 0xe8e4dc });
  // きゅうきゅうしゃ ふうの バン（しろ＋オレンジ）
  for (const [x, z, a] of [[-12, -16, 'x'], [12, -16, 'x'], [-24, -8, 'z']]) B.van(x, z, a, 0xf2f2f2, 0xff8a1f);
  // ちゅうしゃじょう（にし）
  for (let z = -6; z <= 30; z += 6) for (const x of [-34, -28]) if (r() < 0.7 && B.free(x, z, 2)) B.car(x, z, 'z', CAR_TINTS[Math.floor(r() * CAR_TINTS.length)]);
  // ふんすい（タイトルの けしき）
  // みなみがわは あいている（ゾンビも はいれる）
  for (const [x, z, sx, sz] of [[0, 12, 6, 0.5], [-2.0, 18, 2, 0.5], [2.0, 18, 2, 0.5], [-2.75, 15, 0.5, 5.5], [2.75, 15, 0.5, 5.5]]) add('concrete', x, 0, z, sx, 0.6, sz, { tint: 0xd0d0c8 });
  deco('water', 0, 0.05, 15, 5, 0.4, 5.5);
  add('concrete', 0, 0, 15, 0.8, 1.6, 0.8, { tint: 0xd0d0c8 });
  // にわ（いけがき・はなだん・き・ベンチ）
  for (const [x, z, a, l] of [[14, -4, 'x', 8], [24, -4, 'x', 6], [14, 6, 'z', 6], [30, 8, 'z', 8], [18, 20, 'x', 10], [-14, 28, 'x', 8], [10, 32, 'x', 8]]) B.hedge(x, z, a, l);
  for (const [x, z, t] of [[-10, 2, 0xff7ab8], [10, 2, 0xf0c830], [-10, 26, 0xf0f0f0], [22, 12, 0xff7ab8], [28, 28, 0xf0c830]]) { add('brick', x, 0, z, 3, 0.5, 1.4); deco('leaves', x, 0.5, z, 2.6, 0.4, 1.0, { tint: t }); }
  for (const [x, z] of [[18, 0], [26, 2], [34, -10], [22, 28], [34, 30], [-18, 18], [-6, 34], [30, 18]]) if (B.free(x, z, 0.5)) B.tree(x, z);
  for (const [x, z] of [[-6, 8], [6, 8], [-6, 22], [6, 22], [24, 22]]) add('plank', x, 0, z, 2.2, 0.45, 0.6);
  // しろい テント（じゅうじ なし）
  for (const [x, z] of [[16, 36], [-24, 36]]) B.tent(x, z, 'x', 0xf0f0ea, true);
  B.scatter(10, 0.6, (x, z, i) => (i % 2 ? B.crate(x, z, 1, 0xe8e8e8) : add('metal', x, 0, z, 0.7, 1.1, 1.8, { tint: 0xc8d0d8 })));
  for (const [x, z] of [[-20, -12], [0, -12], [20, -12], [-12, 10], [12, 10], [-12, 20], [12, 20], [-18, 30], [30, 0], [-30, -12]]) if (B.free(x, z, 0.3)) B.lamp(x, z);
  return B.done({ ground: 'grass', tint: 0x7a9a8a, k: 0.3, far: 'hospital', farTint: 0x9aa8a0 });
}

// ================= もりの キャンプじょう =================
function camp() {
  const B = builder(46, 5150), { half, deco, add, r } = B;
  B.perimeter({ mat: 'log', gates: GATES3(26), h: (i) => 2.9 + (i % 3) * 0.25, pillar: 'log' });
  // つちの みち
  for (const c of [0]) { deco('dirt', c, 0.005, 0, 4, 0.02, half * 2); deco('dirt', 0, 0.006, c, half * 2, 0.02, 4); }
  for (const c of [-26, 26]) { deco('dirt', c, 0.005, 0, 3, 0.02, half * 2); deco('dirt', 0, 0.006, c, half * 2, 0.02, 3); }
  // たきび（タイトルの けしき）
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; deco('log', Math.cos(a) * 0.6, 0, 14 + Math.sin(a) * 0.6, 0.25, 0.3, 0.8, { tint: 0x8a6a4a }); }
  deco('ember', 0, 0.1, 14, 0.6, 0.35, 0.6);
  for (const [x, z, a] of [[-2.4, 14, 'z'], [2.4, 14, 'z'], [0, 16.6, 'x']]) add('log', x, 0, z, a === 'x' ? 2.6 : 0.5, 0.45, a === 'x' ? 0.5 : 2.6);
  // こや
  for (const [x, z, t] of [[-16, -16, 0x9a4a3a], [16, -16, 0x4a6a3a], [-16, 18, 0x3a4a6a], [30, -32, 0x9a4a3a], [-32, 6, 0x6a4a3a]]) {
    add('plank', x, 0, z, 6, 3.0, 5);
    deco('roof', x, 3.0, z, 7, 0.5, 6, { tint: t }); deco('roof', x, 3.5, z, 4.6, 0.45, 6, { tint: t }); deco('roof', x, 3.95, z, 2.2, 0.4, 6, { tint: t });
    deco('dark', x, 0, z + 2.51, 1.1, 2.0, 0.04); deco('glass', x + 1.8, 1.3, z + 2.51, 1.0, 0.8, 0.04);
  }
  // いろいろな テント
  for (const [x, z] of [[-8, 22], [8, 24], [14, 10], [-14, 6], [22, 30], [-28, 30], [34, 8], [-6, -30], [6, -24]]) if (B.free(x, z, 2)) B.tent(x, z, r() < 0.5 ? 'x' : 'z', [0xe04a3a, 0x3a6fe0, 0xf0c830, 0x3ab84a, 0xff8a1f, 0x9a4ad8][Math.floor(r() * 6)]);
  // いけ と いわ
  deco('water', 24, 0.02, 14, 9, 0.03, 7);
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; if (i % 3 === 0) continue; add('concrete', 24 + Math.cos(a) * 5.4, 0, 14 + Math.sin(a) * 4.4, 0.9 + r() * 0.5, 0.45 + r() * 0.3, 0.9 + r() * 0.5, { tint: 0x8a8a84 }); }
  add('plank', 21, 0, 18.8, 2.6, 0.35, 0.9, { tint: 0xd85a3a });
  // ピクニックテーブル・まきの やま
  for (const [x, z] of [[-6, 6], [8, -6], [-22, -4], [20, -4], [-30, -20]]) { add('plank', x, 0, z, 1.8, 0.75, 0.9); add('plank', x, 0, z - 0.9, 1.8, 0.42, 0.35); add('plank', x, 0, z + 0.9, 1.8, 0.42, 0.35); }
  for (const [x, z] of [[-20, 24], [10, -34], [36, -18]]) { add('log', x, 0, z, 2.6, 0.5, 1.2); add('log', x, 0.5, z, 2.6, 0.45, 0.8); }
  // もり（き が たくさん）
  B.scatter(70, 1.6, (x, z) => (r() < 0.65 ? B.pine(x, z) : B.tree(x, z, undefined, 0xa8d098)), 10);
  for (const [x, z] of [[-4, -8], [4, 8], [-4, 26], [26, 4], [-26, -4], [26, -26], [-26, 26], [-26, -26], [26, 26], [4, -26], [-12, -26]]) if (B.free(x, z, 0.3)) B.lamp(x, z, 'log');
  return B.done({ ground: 'grass', tint: 0x4a7a4a, k: 0.35, far: 'forest', farTint: 0x6a8a6a });
}

// ================= みなと =================
function harbor() {
  const B = builder(44, 8008), { half, deco, add, r } = B;
  // きたは うみ（ひくい てすり・ゲートは さんばし）
  B.perimeter({ mat: 'container', gates: { n: [-24, 0, 24], s: [-20, 8, 30], w: [-12, 14], e: [-16, 16] }, h: () => 2.6, pillar: 'concrete',
    tint: (c) => [0xc0392b, 0x2e86c1, 0x27ae60, 0xe67e22, 0x16a085, 0x7f8c8d][Math.floor((c + 50) / 6) % 6], lowNorth: { h: 1.2, mat: 'stripe' } });
  for (const g of [-24, 0, 24]) deco('plank', g, -0.05, -half - 6, 5, 0.1, 12, { tint: 0x9a7a5a });
  for (let x = -40; x <= 40; x += 6) if ([-24, 0, 24].every((g) => Math.abs(x - g) > 4)) add('dark', x, 0, -half + 1.2, 0.5, 0.6, 0.5);
  // ガントリークレーン
  for (const cx of [-22, 18]) {
    for (const a of [-1, 1]) for (const b of [-1, 1]) add('stripe', cx + a * 5, 0, -36 + b * 3, 0.9, 9.5, 0.9);
    deco('stripe', cx, 9.5, -36, 12, 1.0, 1.4); deco('stripe', cx, 9.5, -40, 1.4, 1.0, 16); deco('metal', cx + 2, 8.0, -36, 2, 1.5, 2, { tint: 0xf0c830 });
  }
  B.reserve(-28, -40, -16, -32); B.reserve(12, -40, 24, -32);
  // コンテナの まよいみち
  const tints = [0xc0392b, 0x2e86c1, 0x27ae60, 0xe67e22, 0x16a085, 0x7f8c8d, 0x8e44ad];
  for (const sx of [-1, 1]) for (let z = -26; z <= -8; z += 4.5) for (let i = 0; i < 3; i++) {
    const x = sx * (10 + i * 9);
    if (!B.free(x, z, 2.5) || r() < 0.15) continue;
    B.container(x, z, 'x', tints[Math.floor(r() * tints.length)]);
    if (r() < 0.35) B.container(x, z, 'x', tints[Math.floor(r() * tints.length)], 2.6);
  }
  // そうこ（みなみにし）
  B.building(-29, 24, 18, 14, 6, 'container', 0x8a9aaa, 'dark');
  deco('stripe', -29, 0, 31.03, 6, 4.2, 0.05);
  // トラックと トレーラー（みなみひがし）
  for (const [x, z] of [[18, 20], [30, 20], [18, 32]]) { B.container(x, z, 'z', tints[Math.floor(r() * tints.length)], 0.9); add('dark', x, 0, z, 2.2, 0.9, 6); }
  // フォークリフト
  for (const [x, z] of [[-6, -2], [8, 6], [-14, 10]]) { add('metal', x, 0.2, z, 1.2, 1.3, 2, { tint: 0xff8a1f }); add('dark', x, 0, z - 1.2, 1.0, 2.6, 0.2); deco('dark', x, 0.15, z - 1.8, 1.0, 0.08, 1.2); }
  // パレット・はこ・ロープ
  for (const [x, z] of [[-4, 12], [4, 14], [10, -2], [-10, 0], [2, 22], [-16, -2]]) { deco('plank', x, 0, z, 1.2, 0.15, 1.2); B.crate(x, z, 1 + Math.floor(r() * 2)); }
  B.scatter(12, 0.6, (x, z, i) => (i % 2 ? B.barrel(x, z, tints[i % tints.length]) : B.crate(x, z, 1, 0x8ab0d0)));
  for (const [x, z] of [[-34, -30], [-4, -30], [4, -30], [34, -30], [-10, 4], [10, 0], [0, 18], [-16, 16], [26, 10], [36, 30], [-10, 36]]) if (B.free(x, z, 0.3)) B.lamp(x, z);
  return B.done({ ground: 'concrete', tint: 0x4a6a8a, k: 0.35, far: 'harbor', farTint: 0x7a8a9a, water: 'north' });
}

const BUILD = { city, mall, base, hospital, camp, harbor };
export function buildMap(id = 'city') {
  const m = (BUILD[id] || city)();
  m.id = BUILD[id] ? id : 'city';
  return m;
}

export function colliders(map) { return map.boxes.filter((b) => b.collide); }
export function playerColliders(map) { return map.boxes.filter((b) => b.collide); }
export function zombieColliders(map) { return map.boxes.filter((b) => b.collide && !b.barrier); }
export function shotColliders(map) { return map.boxes.filter((b) => b.collide && !b.barrier); }
