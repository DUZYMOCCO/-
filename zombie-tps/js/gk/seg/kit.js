// v0.17.0: セグメントを つくる どうぐ（js/gk/seg/*.js の build から つかう・あとから よむ）
// かべ・そとの かべ・ドア・へやの でぐち。y0 / d.y / rm.y で たかい ゆか（とう など）にも つかえる
// まっすぐな かべ（ドアの ところは あける）。axis 'x' = x に そって のびる。opt は はこに つく（edge:'in' など）
// y0 = かべの した（たかい ゆか）。gapY = ドアの ところの ゆかの たかさ（ドアの うえは まぐさで ふさぐ）
export function segWall(B, axis, at, from, to, gaps, { h = 3.8, dw = 4.4, tint, mat = 'wall', trim = 0x3ab84a, y0 = 0, gapY = null, ...opt } = {}) {
  const o = { ...opt }; if (tint != null) o.tint = tint;
  const top = y0 + h;
  for (let a = from; a < to - 0.01; a += 2) {
    const c = a + 1;
    if (gaps.some((g) => Math.abs(c - g) < dw / 2 + 0.6)) {
      const gy = gapY ?? y0; // ドアの うえ（ドアの たかさ より うえ）
      if (top > gy + h + 0.01) { if (axis === 'x') B.add(mat, c, gy + h, at, 2, top - gy - h, 0.8, o); else B.add(mat, at, gy + h, c, 0.8, top - gy - h, 2, o); }
      if (gy > 0.01) { if (axis === 'x') B.add(mat, c, 0, at, 2, gy, 0.8, o); else B.add(mat, at, 0, c, 0.8, gy, 2, o); } // ドアの した（しきい）
      continue;
    }
    if (axis === 'x') B.add(mat, c, 0, at, 2, top, 0.8, o); else B.add(mat, at, 0, c, 0.8, top, 2, o);
  }
  if (trim == null) return;
  if (axis === 'x') B.deco('metal', (from + to) / 2, top - 0.05, at, to - from, 0.2, 0.9, { tint: trim, ...opt });
  else B.deco('metal', at, top - 0.05, (from + to) / 2, 0.9, 0.2, to - from, { tint: trim, ...opt });
}
// そとの かべ（まわり）。sides: どの がわを つくるか（'n' = z ちいさい がわ, 's', 'w' = x ちいさい がわ, 'e'）
// y0 = ゆかの たかさ（かべは じめんから y0 + h まで）
export function segOuter(B, [x0, z0, x1, z1], sides, { h = 4.2, tint, mat = 'wall', pillar = 'metal', y0 = 0 } = {}) {
  const o = tint != null ? { tint } : {}, H = y0 + h;
  if (sides.includes('n')) for (let a = x0; a < x1 - 0.01; a += 2) B.add(mat, a + 1, 0, z0 - 0.5, 2, H, 1, o);
  if (sides.includes('s')) for (let a = x0; a < x1 - 0.01; a += 2) B.add(mat, a + 1, 0, z1 + 0.5, 2, H, 1, o);
  if (sides.includes('w')) for (let a = z0; a < z1 - 0.01; a += 2) B.add(mat, x0 - 0.5, 0, a + 1, 1, H, 2, o);
  if (sides.includes('e')) for (let a = z0; a < z1 - 0.01; a += 2) B.add(mat, x1 + 0.5, 0, a + 1, 1, H, 2, o);
  const cn = { nw: [x0, z0], ne: [x1, z0], sw: [x0, z1], se: [x1, z1] };
  for (const [k, [x, z]] of Object.entries(cn)) if (sides.includes(k[0]) && sides.includes(k[1])) B.add(pillar, x + Math.sign(x - (x0 + x1) / 2) * 0.5, 0, z + Math.sign(z - (z0 + z1) / 2) * 0.5, 1.2, H - 0.2, 1.2);
}
// ドアの わく・しま・みえない かべ（door = 0,1,… / 'in' / 'out'）。いりぐちは edge:'in'。d.y = ドアの ゆかの たかさ
export function segDoor(B, d, door, { h = 3.8, dw = 4.4, steel = 0x8e98a4, ...opt } = {}) {
  const ax = d.axis === 'x', y = d.y || 0;
  for (const s of [-1, 1]) B.add('metal', d.x + (ax ? s * (dw / 2 + 0.3) : 0), y, d.z + (ax ? 0 : s * (dw / 2 + 0.3)), ax ? 0.6 : 1.1, h, ax ? 1.1 : 0.6, { tint: steel, ...opt });
  B.deco('stripe', d.x, y + h - 0.7, d.z, ax ? dw + 1.2 : 1.0, 0.6, ax ? 1.0 : dw + 1.2, opt);
  B.add('none', d.x, y, d.z, ax ? dw + 0.4 : 0.5, 9, ax ? 0.5 : dw + 0.4, { barrier: true, door, ...opt });
  B.reserve(d.x - 4, d.z - 4, d.x + 4, d.z + 4);
}
// その たかさ（y の ゆかの うえ）で ぶつかる ものが あるか
export const segHit = (B, x, z, r, y) => B.boxes.some((b) => b.collide && b.maxY > y + 0.3 && b.minY < y + 1.8 && x + r > b.minX && x - r < b.maxX && z + r > b.minZ && z - r < b.maxZ);
// へやごとの ゾンビの でぐち（かべぎわ 8こ・ふさがって いない ところ）。rm.y = へやの ゆかの たかさ
export function roomSpawns(B, rooms, n = 8, inset = 2) {
  for (const rm of rooms) {
    const [x0, z0, x1, z1] = rm.b, sp = [];
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n, side = k % 4;
      const x = side === 0 ? x0 + inset : side === 1 ? x1 - inset : x0 + inset + t * (x1 - x0 - inset * 2);
      const z = side === 2 ? z0 + inset : side === 3 ? z1 - inset : z0 + inset + t * (z1 - z0 - inset * 2);
      if (!(rm.y ? segHit(B, x, z, 0.5, rm.y) : B.hit(x, z, 0.5))) sp.push(rm.y ? { x, z, y: rm.y } : { x, z });
    }
    rm.spawns = sp;
  }
  return rooms.flatMap((rm) => rm.spawns);
}
