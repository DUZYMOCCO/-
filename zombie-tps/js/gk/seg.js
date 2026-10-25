// v0.17.0: いっぽんみちの ステージを「セグメント（くぎり）」の くさりに する（three.js なし → テスト できる）
// 1つの セグメント = js/gk/seg/<mod>.js の build(builder) → B.done(theme, { seg: { rooms, doors, entry, exit }, playerStart })
//   ざひょうは セグメントごとの ローカル。entry（いりぐちの ドア）を まえの セグメントの exit（でぐちの ドア）に かさねて ずらす。
//   はこの door: 0,1,…（なかの ドア）／ 'out'（でぐち）／ 'in'（いりぐち）→ おいた ときに ステージ ぜんたいの ばんごうに する。
//   edge:'in' の はこ（いりぐちの かべ）は まえの セグメントが ある あいだ つかわない（おなじ ばしょに まえの でぐちの かべが ある）。
// ゲームは いまの セグメントと つぎの セグメントだけ もつ（すすむと よむ・ドアを とおると まえを すてる）。
export const SEG = {
  ahead: 12,     // でぐちの ドアに この きょりまで ちかづいたら つぎを よむ
  pass: 2.5,     // ドアを この きょり すぎたら うしろの ドアを しめる（→ まえの セグメントを すてる）
  pad: 6,        // ナビ・ぶつかりの はんいの よゆう
  far: 4096,     // はしの せいげん（セグメントは どこまでも つながる → かべに まかせる）
};

// segs: [{ mod, rooms }] → それぞれの さいしょの へやの ばんごう
export function segStarts(segs) {
  const out = []; let r = 0;
  for (const s of segs) { out.push(r); r += s.rooms; }
  return out;
}
export const segTotalRooms = (segs) => segs.reduce((a, s) => a + s.rooms, 0);
// ステージの へや ばんごう → どの セグメントの なんばんめ
export function segOfRoom(segs, room) {
  let r0 = 0;
  for (let i = 0; i < segs.length; i++) {
    if (room < r0 + segs[i].rooms) return { seg: i, local: Math.max(0, room - r0), r0 };
    r0 += segs[i].rooms;
  }
  const i = segs.length - 1;
  return { seg: i, local: segs[i].rooms - 1, r0: r0 - segs[i].rooms };
}
// チェックポイント（へや）から さいかい: その セグメントから よむ
export const segResume = (segs, room) => segOfRoom(segs, room).seg;
// ローカルの ドア → ステージの ドア ばんごう（ドア g は へや g と g+1 の あいだ）
export const segDoorIndex = (r0, n, d) => (d === 'in' ? r0 - 1 : d === 'out' ? r0 + n - 1 : r0 + d);
// つぎの セグメントを おく ずれ（まえの でぐち＝つぎの いりぐち）
export const segOffset = (prevExit, entry) => ({ x: prevExit.x - entry.x, z: prevExit.z - entry.z });
// でぐちの ドアに ちかい → つぎを よむ
export const segNear = (p, x, z, ahead = SEG.ahead) => !!(p && p.exit) && Math.hypot(x - p.exit.x, z - p.exit.z) <= ahead;
// つぎの セグメントを つくり はじめるか（でぐちに ちかい・へやが きれい で、まだ なく・つくって いなく・まえが のこって いない → かさならない）
export function segShouldLoad({ cur, total, live, busy = false, want = false }) {
  const nx = cur + 1;
  if (!want || nx >= total || live.has(nx) || busy || live.has(cur - 1)) return false;
  return true;
}
// むこうの へやが ない ドア（よんで いない・すてた セグメントへ）の みえない かべ → ゾンビ・ナビにも かべ
export function segSeals(map) {
  const rm = map.gk.rooms;
  return map.boxes.filter((b) => b.door !== undefined && !(rm[b.door] && rm[b.door + 1]));
}
// チェックポイント（へや from の ドアの すぐ さき 3m・へやの まんなかを むく）
export function segCpSpot(doors, rooms, from, step = 3) {
  const d = doors[from - 1], [x0, z0, x1, z1] = rooms[from].b;
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const ax = d.axis === 'x';
  const x = ax ? d.x : d.x + Math.sign(cx - d.x) * step, z = ax ? d.z + Math.sign(cz - d.z) * step : d.z;
  return { x, z, yaw: Math.atan2(-(cx - x), -(cz - z)) };
}
// ドアを pass m いじょう すぎた（ドアの すじに たいして へやの がわ）
export function segPassed(door, room, x, z, pass = SEG.pass) {
  if (!door || !room) return false;
  const [x0, z0, x1, z1] = room.b;
  if (door.axis === 'x') { const s = Math.sign((z0 + z1) / 2 - door.z); return (z - door.z) * s >= pass; }
  const s = Math.sign((x0 + x1) / 2 - door.x); return (x - door.x) * s >= pass;
}

// つくった セグメントを ステージの ばしょに おく（はこは つくりたて なので そのまま うごかす）
// info: { idx, r0, ox, oz }
export function placeSeg(built, { idx, r0, ox = 0, oz = 0 }) {
  const sg = built.seg, n = sg.rooms.length;
  const mx = (o) => { o.x += ox; o.z += oz; return o; };
  for (const b of built.boxes) {
    b.minX += ox; b.maxX += ox; b.minZ += oz; b.maxZ += oz; b.seg = idx;
    if (b.door !== undefined) b.door = segDoorIndex(r0, n, b.door);
    delete b.veh; // のりものの ばくはつは セグメントでは つかわない（ばんごうが かさなる）
  }
  for (const l of built.lamps) mx(l);
  for (const p of built.perches || []) mx(p);
  for (const L of built.ladders || []) { L.minX += ox; L.maxX += ox; L.minZ += oz; L.maxZ += oz; }
  const rooms = sg.rooms.map((rm) => ({
    name: rm.name, seg: idx,
    b: [rm.b[0] + ox, rm.b[1] + oz, rm.b[2] + ox, rm.b[3] + oz],
    spawns: (rm.spawns || []).map((s) => ({ ...s, x: s.x + ox, z: s.z + oz })),
  }));
  const door = (d, k) => (d ? { ...d, x: d.x + ox, z: d.z + oz, g: segDoorIndex(r0, n, k) } : null);
  const ps = built.playerStart;
  return {
    idx, r0, n, ox, oz, boxes: built.boxes, lamps: built.lamps, perches: built.perches || [], ladders: built.ladders || [],
    rooms, doors: sg.doors.map((d, k) => door(d, k)), entry: door(sg.entry, 'in'), exit: door(sg.exit, 'out'),
    bounds: segBounds(built.boxes, rooms), theme: built.theme, backdrop: built.backdrop,
    playerStart: ps ? { ...ps, x: ps.x + ox, z: ps.z + oz } : null, doorW: sg.doorW, doorH: sg.doorH, vertical: !!built.vertical,
  };
}
// セグメントの おおきさ（へや＋ぶつかる はこ）
export function segBounds(boxes, rooms) {
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (const r of rooms) { x0 = Math.min(x0, r.b[0]); z0 = Math.min(z0, r.b[1]); x1 = Math.max(x1, r.b[2]); z1 = Math.max(z1, r.b[3]); }
  for (const b of boxes) if (b.collide && b.minY < 50) { x0 = Math.min(x0, b.minX); z0 = Math.min(z0, b.minZ); x1 = Math.max(x1, b.maxX); z1 = Math.max(z1, b.maxZ); }
  return [x0, z0, x1, z1];
}
export const inBounds = (bd, x, z, pad = 0) => x > bd[0] - pad && x < bd[2] + pad && z > bd[1] - pad && z < bd[3] + pad;
// 2つの セグメントが かさならない（となりどうしは かべ 1まい ぶん だけ）
export function segOverlap(a, b, slack = 1.2) {
  const w = Math.min(a[2], b[2]) - Math.max(a[0], b[0]), d = Math.min(a[3], b[3]) - Math.max(a[1], b[1]);
  return w > slack && d > slack;
}
// いくつかの セグメントを かこむ ましかく（ナビ・ぶつかりの ます目）
export function segRegion(list, pad = SEG.pad) {
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (const p of list) { x0 = Math.min(x0, p.bounds[0]); z0 = Math.min(z0, p.bounds[1]); x1 = Math.max(x1, p.bounds[2]); z1 = Math.max(z1, p.bounds[3]); }
  const cx = Math.round((x0 + x1) / 2), cz = Math.round((z0 + z1) / 2);
  const half = Math.ceil(Math.max(x1 - cx, cx - x0, z1 - cz, cz - z0) + pad);
  return { cx, cz, half };
}

// いま ある セグメント（idx じゅん）→ ゲームが つかう 1つの マップ
// まえの セグメントが ある ときは いりぐちの かべ（edge:'in'）を はずす
export function joinSegs(list) {
  list = [...list].sort((a, b) => a.idx - b.idx);
  const has = new Set(list.map((p) => p.idx));
  const boxes = [], lamps = [], perches = [], ladders = [], spawns = [], rooms = [], doors = [];
  for (const p of list) {
    const prev = has.has(p.idx - 1);
    for (const b of p.boxes) if (!(prev && b.edge === 'in')) boxes.push(b);
    lamps.push(...p.lamps); perches.push(...p.perches); ladders.push(...p.ladders);
    p.rooms.forEach((r, k) => { rooms[p.r0 + k] = r; spawns.push(...r.spawns); });
    for (const d of p.doors) doors[d.g] = d;
    if (p.exit) doors[p.exit.g] = p.exit;
    if (p.entry && !doors[p.entry.g]) doors[p.entry.g] = p.entry;
  }
  const f = list[0];
  let m = 0;
  for (const p of list) m = Math.max(m, ...p.bounds.map(Math.abs));
  return {
    boxes, spawns, lamps, perches, ladders, vehicles: [], half: Math.ceil(m), theme: f.theme, backdrop: f.backdrop,
    playerStart: f.playerStart || { x: 0, z: 0, yaw: 0 }, vertical: list.some((p) => p.vertical),
    gk: { rooms, doors, doorW: f.doorW, doorH: f.doorH, segs: list.map((p) => p.idx) },
  };
}
// ぜんぶの セグメントを いっぺんに おく（テスト・ふるい よみかた よう）。builts[i] = build(builder) の けっか
export function chainSegs(builts) {
  const out = []; let r0 = 0, prev = null;
  builts.forEach((b, idx) => {
    const off = prev && prev.exit && b.seg.entry ? segOffset(prev.exit, b.seg.entry) : { x: 0, z: 0 };
    const p = placeSeg(b, { idx, r0, ox: off.x, oz: off.z });
    out.push(p); r0 += p.n; prev = p;
  });
  return out;
}

// ---- セグメントを つくる ときの どうぐ（maps / seg の build から つかう）----
// まっすぐな かべ（ドアの ところは あける）。axis 'x' = x に そって のびる。opt は はこに つく（edge:'in' など）
export function segWall(B, axis, at, from, to, gaps, { h = 3.8, dw = 4.4, tint, mat = 'wall', trim = 0x3ab84a, ...opt } = {}) {
  for (let a = from; a < to - 0.01; a += 2) {
    const c = a + 1;
    if (gaps.some((g) => Math.abs(c - g) < dw / 2 + 0.6)) continue;
    const o = { ...opt }; if (tint != null) o.tint = tint;
    if (axis === 'x') B.add(mat, c, 0, at, 2, h, 0.8, o); else B.add(mat, at, 0, c, 0.8, h, 2, o);
  }
  if (trim == null) return;
  if (axis === 'x') B.deco('metal', (from + to) / 2, h - 0.05, at, to - from, 0.2, 0.9, { tint: trim, ...opt });
  else B.deco('metal', at, h - 0.05, (from + to) / 2, 0.9, 0.2, to - from, { tint: trim, ...opt });
}
// そとの かべ（まわり）。sides: どの がわを つくるか（'n' = z ちいさい がわ, 's', 'w' = x ちいさい がわ, 'e'）
export function segOuter(B, [x0, z0, x1, z1], sides, { h = 4.2, tint, mat = 'wall', pillar = 'metal' } = {}) {
  const o = tint != null ? { tint } : {};
  if (sides.includes('n')) for (let a = x0; a < x1 - 0.01; a += 2) B.add(mat, a + 1, 0, z0 - 0.5, 2, h, 1, o);
  if (sides.includes('s')) for (let a = x0; a < x1 - 0.01; a += 2) B.add(mat, a + 1, 0, z1 + 0.5, 2, h, 1, o);
  if (sides.includes('w')) for (let a = z0; a < z1 - 0.01; a += 2) B.add(mat, x0 - 0.5, 0, a + 1, 1, h, 2, o);
  if (sides.includes('e')) for (let a = z0; a < z1 - 0.01; a += 2) B.add(mat, x1 + 0.5, 0, a + 1, 1, h, 2, o);
  const cn = { nw: [x0, z0], ne: [x1, z0], sw: [x0, z1], se: [x1, z1] };
  for (const [k, [x, z]] of Object.entries(cn)) if (sides.includes(k[0]) && sides.includes(k[1])) B.add(pillar, x + Math.sign(x - (x0 + x1) / 2) * 0.5, 0, z + Math.sign(z - (z0 + z1) / 2) * 0.5, 1.2, 4, 1.2);
}
// ドアの わく・しま・みえない かべ（door = 0,1,… / 'in' / 'out'）。いりぐちは edge:'in'
export function segDoor(B, d, door, { h = 3.8, dw = 4.4, steel = 0x8e98a4, ...opt } = {}) {
  const ax = d.axis === 'x';
  for (const s of [-1, 1]) B.add('metal', d.x + (ax ? s * (dw / 2 + 0.3) : 0), 0, d.z + (ax ? 0 : s * (dw / 2 + 0.3)), ax ? 0.6 : 1.1, h, ax ? 1.1 : 0.6, { tint: steel, ...opt });
  B.deco('stripe', d.x, h - 0.7, d.z, ax ? dw + 1.2 : 1.0, 0.6, ax ? 1.0 : dw + 1.2, opt);
  B.add('none', d.x, 0, d.z, ax ? dw + 0.4 : 0.5, 9, ax ? 0.5 : dw + 0.4, { barrier: true, door, ...opt });
  B.reserve(d.x - 4, d.z - 4, d.x + 4, d.z + 4);
}
// へやごとの ゾンビの でぐち（かべぎわ 8こ・ふさがって いない ところ）
export function roomSpawns(B, rooms, n = 8, inset = 2) {
  for (const rm of rooms) {
    const [x0, z0, x1, z1] = rm.b, sp = [];
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n, side = k % 4;
      const x = side === 0 ? x0 + inset : side === 1 ? x1 - inset : x0 + inset + t * (x1 - x0 - inset * 2);
      const z = side === 2 ? z0 + inset : side === 3 ? z1 - inset : z0 + inset + t * (z1 - z0 - inset * 2);
      if (!B.hit(x, z, 0.5)) sp.push({ x, z });
    }
    rm.spawns = sp;
  }
  return rooms.flatMap((rm) => rm.spawns);
}
