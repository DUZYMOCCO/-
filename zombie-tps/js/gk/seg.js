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
// セグメントが もつ てんの リスト（ずらして ステージの へや ばんごうに する）: でてくる ドア（ステージ18）・ガスの あな（ステージ15）
export const SEG_POINTS = ['spawnDoors', 'vents'];
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
  return { x, z, y: d.y || 0, yaw: Math.atan2(-(cx - x), -(cz - z)) };
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
    name: rm.name, seg: idx, y: rm.y || 0,
    b: [rm.b[0] + ox, rm.b[1] + oz, rm.b[2] + ox, rm.b[3] + oz],
    spawns: (rm.spawns || []).map((s) => ({ ...s, x: s.x + ox, z: s.z + oz })),
  }));
  const door = (d, k) => (d ? { ...d, x: d.x + ox, z: d.z + oz, g: segDoorIndex(r0, n, k) } : null);
  // でんしゃの せんろ（axis 'x' = x に そって はしる・at = せんろの まんなかの z・from→to）
  const trains = (sg.trains || []).map((t) => {
    const ax = t.axis === 'x', a = ax ? ox : oz, c = ax ? oz : ox;
    return { ...t, room: r0 + t.room, at: t.at + c, from: t.from + a, to: t.to + a };
  });
  // てんの リスト（でてくる ドア・ガスの あな）: { x, z, room, … }
  const pts = {};
  for (const k of SEG_POINTS) if (sg[k]) pts[k] = sg[k].map((o) => ({ ...o, x: o.x + ox, z: o.z + oz, room: r0 + o.room }));
  const ps = built.playerStart;
  return {
    idx, r0, n, ox, oz, boxes: built.boxes, lamps: built.lamps, perches: built.perches || [], ladders: built.ladders || [],
    rooms, doors: sg.doors.map((d, k) => door(d, k)), entry: door(sg.entry, 'in'), exit: door(sg.exit, 'out'), trains, pts,
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
  const boxes = [], lamps = [], perches = [], ladders = [], spawns = [], rooms = [], doors = [], trains = [], pts = {};
  for (const p of list) {
    const prev = has.has(p.idx - 1);
    for (const b of p.boxes) if (!(prev && b.edge === 'in')) boxes.push(b);
    lamps.push(...p.lamps); perches.push(...p.perches); ladders.push(...p.ladders); trains.push(...(p.trains || []));
    for (const k in p.pts || {}) (pts[k] || (pts[k] = [])).push(...p.pts[k]);
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
    gk: { rooms, doors, trains, ...pts, doorW: f.doorW, doorH: f.doorH, segs: list.map((p) => p.idx) },
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
