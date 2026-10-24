// ゲームの中身（固定ステップ・決まった乱数）。DOM と Pixi は import しない。描画側は state を読むだけ。
// v0.2.0: ミッション（資材集め・巡回・脱出）を追加。createSim({ mission }) で有効になる。mission なしは従来の撃ち合い。
// v0.4.0-dev: 部隊をやめた。味方は1機ずつ命令する。人間（少年・少女）は別枠で出せる。
//   上限はロボット12機＋人間3人。敵の異星生物は「群れ」（AI の単位）のまま。
// v0.4.0-dev（10/23）: 着弾の演出と被弾の反応。撃つたびに武器の重さで相手がのけぞる・押される・よろける（js/fx/react.js）。
// v0.4.0-dev（10/23 09:2x〜09:37 の決定）: 巨大機も1枠。隊長の仕組みはぜんぶなし（決定2）。
//   AI で動く味方（5-5）はどの枠にも数えない。人間を捕まえた異星生物は、その場に残らず巣へ運んでいく。
// v0.4.0-dev（10/23 23:29 の決定）: 遮蔽物（js/sim/cover.js）。弾を止める・撃たれて壊れる・壊れたら物を落とす。見通しと通行は変えない。
// v0.4.0-dev（10/24 0:07 の決定）: 落とし物の武器パーツをやめて「武器が手に入る」。拾った機体は、持てて強ければそのミッションの間その武器に持ちかえる（u.weapon / u.wmul）。
import { createRng } from './rng.js?v=5';
import { generateMap, TILE, TERRAIN, T, tileAt, toTile, tileCenter, passable, nearestPassable } from './map.js?v=5';
import { createSearch, stepSearch } from './path.js?v=5';
import { FogGrid } from './fog.js?v=5';
import { ALERT, GATHER_RADIUS, EXTRACT_RADIUS, FIND, CAPTURE, LEASH } from './mission.js?v=9';
import { weaponById, KIND_WEAPON } from './weapons.js?v=2';
import { classify, hitReact, reactStep } from '../fx/react.js?v=2';
import { COVER, COVER_LAYOUT, DROPS, ITEMS, PICKUP, createCover, findCover, damageCover, rollDrop, canPickUp, applyItem, atkOf, gearTier, rollWeapon } from './cover.js?v=2';

export const TICK = 1 / 30;          // 1ステップ＝1/30秒
export const SEARCH_BUDGET = 250;    // 1機1ステップで広げる A* ノード数

/** 一度に出せる数。ロボット12機（決定）と人間3人（決定 09:25）は別枠。AI の味方（aiAlly）はどちらにも数えない */
export const FIELD_CAP = Object.freeze({ robots: 12, humans: 3 });

// 兵種（仮）。range/speed はワールド座標（1タイル=32）。gather＝1機が毎秒集める資材
export const KINDS = Object.freeze({
  gunner: { name: '射撃型', short: '射撃', hp: 100, atk: 8, range: 112, cooldown: 0.9, speed: 22, sight: 4.5, gather: 0.1 },
  heavy: { name: '重装型', short: '重装', hp: 160, atk: 13, range: 88, cooldown: 1.3, speed: 17, sight: 4, gather: 0.1 },
  // v0.2.0 ミッション用
  scav: { name: 'ツギハギ号', short: 'ツギハギ', hp: 60, atk: 1, range: 40, cooldown: 1.2, speed: 22, sight: 4.5, gather: 0.5, noFight: true },
  ponco: { name: 'PONCO02', short: 'PONCO', hp: 120, atk: 10, range: 112, cooldown: 0.9, speed: 20, sight: 4.5, gather: 0.1 },
  alien: { name: '異星生物', short: '異星', hp: 360, atk: 14, range: 44, cooldown: 1.2, speed: 16, sight: 4, gather: 0, regen: true },
  // v0.4.0-dev 人間（5-4: 足は速い・戦う力はゼロ・触られると捕まる）。数値は仮
  boy: { name: '少年', short: '少年', hp: 30, atk: 0, range: 0, cooldown: 1, speed: 30, sight: 4, gather: 0.2, noFight: true, human: true },
  girl: { name: '少女', short: '少女', hp: 30, atk: 0, range: 0, cooldown: 1, speed: 30, sight: 4.5, gather: 0.2, noFight: true, human: true },
  // v0.4.0-dev 巨大機（ラストタイタン・ZA-25 などの代わりの仮の数値。絵はまだない。ミッションには出していない）
  giant: { name: '巨大機（仮）', short: '巨大機', hp: 900, atk: 40, range: 128, cooldown: 1.6, speed: 12, sight: 5, gather: 0, giant: true },
});
export const isHuman = kind => !!KINDS[kind]?.human;
export const isGiant = kind => !!KINDS[kind]?.giant;
/** その機体がロボットの枠をいくつ使うか。巨大機も1枠（決定 09:23）。人間は別枠なので 0 */
export const slotCost = kind => (isHuman(kind) ? 0 : 1);

// 従来の撃ち合い（ミッションなし）の配置。count 機を1マスずつ散らして置く
export const UNIT_SETUP = Object.freeze({
  ally: [
    { kind: 'gunner', tx: 13, ty: 52, count: 4 },
    { kind: 'heavy', tx: 20, ty: 50, count: 4 },
    { kind: 'gunner', tx: 27, ty: 52, count: 4 },
  ],
  enemy: [
    { name: '赤1', kind: 'heavy', tx: 20, ty: 9, role: 'guard', count: 4 },
    { name: '赤2', kind: 'gunner', tx: 11, ty: 14, role: 'raid', count: 4 },
    { name: '赤3', kind: 'gunner', tx: 29, ty: 14, role: 'raid', count: 4 },
  ],
});

// cover: 遮蔽物の置き場所（COVER_LAYOUT の形）。省くと、ミッションありなら COVER_LAYOUT、なしなら置かない
export function createSim({ seed = 1, mapSeed = 7, setup = UNIT_SETUP, mission = null, cover } = {}) {
  const map = generateMap(mapSeed);
  const sim = {
    seed, tick: 0, time: 0, rng: createRng(seed), map,
    fog: new FogGrid(map.w, map.h),
    units: [], groups: [], commands: [], fx: [], result: null, resultReason: null, nextId: 1,
    mission: null, benched: [],
    cover: createCover(cover ?? (mission ? COVER_LAYOUT : [])), items: [], nextItemId: 1, loot: [], // loot: このミッションで拾った武器の id（拾った順）
  };
  if (mission) {
    sim.mission = createMissionState(map, mission);
    setup = {
      ally: mission.ally,
      enemy: mission.aliens.map(a => ({ ...a, role: 'patrol', tx: a.route[0].tx, ty: a.route[0].ty })),
    };
  }
  for (const def of setup.ally) {
    const n = Math.max(1, def.count ?? 1);
    const spots = spreadTiles(map, def.tx, def.ty, n);
    for (let j = 0; j < n; j++) {
      const u = deployUnit(sim, def.kind, spots[j], { label: n === 1 ? def.name : null, cd: j * 0.2, aiAlly: !!def.ai });
      if (!u) sim.benched.push(def.kind); // 上限を超えた分は出さない（控え）
    }
  }
  setup.enemy.forEach((def, i) => spawnGroup(sim, def, i));
  updateFog(sim);
  return sim;
}

function createMissionState(map, m) {
  const ex = nearestPassable(map, m.extraction.tx, m.extraction.ty);
  return {
    id: m.id, target: m.target, delivered: 0, lost: 0, finds: [], humansLost: 0,
    salvage: m.salvage.map((p, i) => { const q = nearestPassable(map, p.tx, p.ty); return { id: i, tx: q.tx, ty: q.ty, amount: p.amount, max: p.amount, gathered: 0, nextFind: 0 }; }),
    extraction: { tx: ex.tx, ty: ex.ty },
    // 異星生物の巣（捕まえた人間を運んでいく先）。ない地図では null（その時は運ぶ個体の出てきた場所へ）
    nest: m.nest ? nearestPassable(map, m.nest.tx, m.nest.ty) : null,
  };
}

/** (tx,ty) の近くの、歩いてつながっているマスを近い順に n 個（足りなければ最後を繰り返す） */
export function spreadTiles(map, tx, ty, n, radius = 4) {
  const c = nearestPassable(map, tx, ty);
  if (!c) return Array(n).fill({ tx, ty });
  const seen = new Set([c.ty * map.w + c.tx]), q = [c], out = [];
  for (let i = 0; i < q.length; i++) {
    const p = q[i];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = p.tx + dx, y = p.ty + dy, k = y * map.w + x;
      if (seen.has(k) || Math.abs(x - c.tx) > radius || Math.abs(y - c.ty) > radius || !passable(map, x, y)) continue;
      seen.add(k); q.push({ tx: x, ty: y });
    }
  }
  for (const p of q) out.push({ ...p, d: (p.tx - c.tx) ** 2 + (p.ty - c.ty) ** 2, a: Math.atan2(p.ty - c.ty, p.tx - c.tx) });
  out.sort((a, b) => a.d - b.d || a.a - b.a);
  const res = out.slice(0, n).map(p => ({ tx: p.tx, ty: p.ty }));
  while (res.length < n) res.push(res[res.length - 1]);
  return res;
}

function makeUnit(sim, side, kind, tile, extra = {}) {
  const k = KINDS[kind];
  return {
    id: sim.nextId++, side, kind, label: extra.label || null, human: !!k.human, groupId: extra.groupId ?? null,
    x: tileCenter(tile.tx), y: tileCenter(tile.ty), hp: k.hp, maxHp: k.hp, atk: k.atk, range: k.range,
    cooldown: k.cooldown, cd: (extra.cd || 0) % k.cooldown, speed: k.speed, sight: k.sight,
    facing: side === 'ally' ? 1 : -1, moving: false, targetId: null, lastHit: -99,
    order: null, engaged: false, stance: extra.stance || 'hold', anchor: null, cargo: 0, gathering: null, speedMul: 1,
    captured: null, carrying: null, aiAlly: !!extra.aiAlly, home: { tx: tile.tx, ty: tile.ty },
  };
}

/** 出撃している数（ロボットの枠と人間の枠は別に数える。AI で動く味方は数えない） */
export function fieldCount(sim) {
  let robots = 0, humans = 0, ai = 0;
  for (const u of sim.units) {
    if (u.side !== 'ally') continue;
    if (u.aiAlly) { ai++; continue; }
    if (u.human) humans++; else robots += slotCost(u.kind);
  }
  return { robots, humans, ai, capRobots: FIELD_CAP.robots, capHumans: FIELD_CAP.humans };
}
export function canDeploy(sim, kind, { aiAlly = false } = {}) {
  if (aiAlly) return true; // 旅の仲間など AI の味方は枠の外（5-5。決定 09:25）
  const c = fieldCount(sim);
  return isHuman(kind) ? c.humans < FIELD_CAP.humans : c.robots + slotCost(kind) <= FIELD_CAP.robots;
}

/** 味方を1機出す。上限を超えるなら null（出さない）。aiAlly: true は AI で動く味方（枠に数えない・プレイヤーは選べない） */
export function deployUnit(sim, kind, tile, { label = null, cd = 0, aiAlly = false } = {}) {
  if (!KINDS[kind] || !canDeploy(sim, kind, { aiAlly })) return null;
  const t = nearestPassable(sim.map, tile.tx, tile.ty) || tile;
  const u = makeUnit(sim, 'ally', kind, t, { cd, stance: sim.mission && !aiAlly ? 'hold' : 'free', aiAlly });
  const same = sim.units.filter(v => v.side === 'ally' && v.kind === kind).length;
  u.label = label || (KINDS[kind].human ? KINDS[kind].short : `${KINDS[kind].short}${same + 1}`);
  if (aiAlly && !label) u.label = `仲間の${u.label}`;
  sim.units.push(u);
  return u;
}

function spawnGroup(sim, def, index) {
  const g = {
    id: `e${index + 1}`, side: 'enemy', name: def.name, kind: def.kind, role: def.role || null, unitIds: [],
    aiTimer: index * 1.3, speedMul: 1,
  };
  if (g.role === 'patrol') {
    g.route = def.route.map(w => nearestPassable(sim.map, w.tx, w.ty));
    Object.assign(g, { routeIdx: 0, ai: 'patrol', alert: 0, lostTimer: 0, targetId: null, lastSeen: null, provokedBy: null });
  }
  const n = Math.max(1, def.count ?? 4);
  const spots = spreadTiles(sim.map, def.tx, def.ty, n);
  for (let j = 0; j < n; j++) {
    const u = makeUnit(sim, 'enemy', def.kind, spots[j], { groupId: g.id, cd: j * 0.2, stance: g.role === 'patrol' ? 'hold' : 'free' });
    u.label = def.name;
    sim.units.push(u); g.unitIds.push(u.id);
  }
  sim.groups.push(g);
}

export const unitById = (sim, id) => sim.units.find(u => u.id === id) || null;
export const groupById = (sim, id) => sim.groups.find(g => g.id === id) || null;
export const groupUnits = (sim, g) => g.unitIds.map(id => unitById(sim, id)).filter(Boolean);
export const allyUnits = sim => sim.units.filter(u => u.side === 'ally');
const ids = x => (Array.isArray(x) ? x : [x]);
const wpList = waypoints => waypoints.map(w => ({ tx: w.tx, ty: w.ty }));

// ---- 命令（次のステップの頭で反映。入力のタイミングに左右されない＝再現できる） ----
/** 移動。mode: 'fight'＝戦闘移動（敵がいたら止まって撃つ） / 'rush'＝急行（撃たずに走り抜ける） */
export function issueOrder(sim, unitIds, waypoints, { mode = 'fight' } = {}) {
  sim.commands.push({ type: 'move', unitIds: ids(unitIds), waypoints: wpList(waypoints), mode });
}
/** この敵を狙う（届くところまで寄って撃つ） */
export function issueAttack(sim, unitIds, targetId) { sim.commands.push({ type: 'attack', unitIds: ids(unitIds), targetId }); }
/** 構え: 'hold'＝その場を守る（自分から寄らない） / 'free'＝迎撃（見えた敵に自分から寄る） */
export function issueStance(sim, unitIds, stance) { sim.commands.push({ type: 'stance', unitIds: ids(unitIds), stance }); }
/** 止まる（いまの命令を取り消す） */
export function issueStop(sim, unitIds) { sim.commands.push({ type: 'stop', unitIds: ids(unitIds) }); }
/** 撤退: 撃たずに味方の基地へ走る */
export function issueRetreat(sim, unitIds) { sim.commands.push({ type: 'retreat', unitIds: ids(unitIds) }); }

function applyOrder(sim, u, waypoints, mode = 'fight', attackId = null) {
  const wps = waypoints.slice(0, 4).map(w => nearestPassable(sim.map, w.tx, w.ty)).filter(Boolean);
  if (!wps.length) { u.order = null; return; }
  // 新しい経路ができるまでは、前の経路のまま進む（命令を続けて出しても止まらないように）
  const old = u.order, prev = old && (old.planned.length ? old : old.prev) || null;
  u.order = {
    waypoints: wps, wpIndex: 0, from: { tx: toTile(u.x), ty: toTile(u.y) }, search: null, path: [], pathIdx: 0, planned: [],
    prev: prev ? { planned: prev.planned, pathIdx: prev.pathIdx } : null, mode, attackId, repath: 1,
  };
}

/** 何機かに同じ場所を命令したとき: 目的地のまわりに1マスずつ散らす（固まって範囲攻撃を受けないように） */
function applyGroupMove(sim, units, waypoints, mode) {
  if (!units.length || !waypoints.length) return;
  const last = nearestPassable(sim.map, waypoints[waypoints.length - 1].tx, waypoints[waypoints.length - 1].ty);
  if (!last) return;
  if (units.length === 1) { applyOrder(sim, units[0], waypoints, mode); return; }
  const free = spreadTiles(sim.map, last.tx, last.ty, units.length);
  const lx = tileCenter(last.tx), ly = tileCenter(last.ty);
  const order = units.slice().sort((a, b) => Math.hypot(a.x - lx, a.y - ly) - Math.hypot(b.x - lx, b.y - ly) || a.id - b.id);
  for (const u of order) {
    let bi = 0, bd = Infinity;
    free.forEach((s, i) => { const d = Math.hypot(tileCenter(s.tx) - u.x, tileCenter(s.ty) - u.y); if (d < bd) { bd = d; bi = i; } });
    const s = free.splice(bi, 1)[0] || last;
    applyOrder(sim, u, [...waypoints.slice(0, -1), s], mode);
  }
}

/** 経路は経由点ごとに区切って差分 A* で作る。全区間がつながると order.planned に全体が入る（表示用） */
function advancePlanning(sim, u) {
  const o = u.order; if (!o) return;
  let budget = SEARCH_BUDGET;
  while (budget > 0 && o.planIndex !== o.waypoints.length) {
    o.planIndex ??= 0; o.segments ??= [];
    if (o.planIndex >= o.waypoints.length) break;
    const from = o.planIndex === 0 ? o.from : o.waypoints[o.planIndex - 1], to = o.waypoints[o.planIndex];
    o.search ??= createSearch(sim.map, from.tx, from.ty, to.tx, to.ty);
    const before = o.search.expanded, st = stepSearch(o.search, budget);
    budget -= Math.max(1, o.search.expanded - before);
    if (st === 'running') return;
    const seg = st === 'found' ? o.search.path : [from, to];
    o.segments.push(o.planIndex === 0 ? seg : seg.slice(1));
    o.search = null; o.planIndex++;
    o.planned = o.segments.flat();
  }
}

// v0.4.0-dev 被弾の反応（js/fx/react.js）: のけぞり・押し戻し・よろけ。よろけている間（stun）は撃たない・動かない・捕まえない
const MASS = { alien: 1.5, giant: 3 };
export const massOf = kind => MASS[kind] || 1;
export const isStunned = u => (u._hr?.stun || 0) > 0; // 当たったその場から（reactStep を待たない）
const WCLASS = new Map();
/** その種類の武器の行と、演出の分類（kind/proj/w）。武器のない種類（人間）は null */
export function weaponInfo(kind) { return weaponInfoById(KIND_WEAPON[kind]); }
/** 武器の id → 行と演出の分類（拾った武器を持っている機体用） */
export function weaponInfoById(id) {
  if (!id) return null;
  if (!WCLASS.has(id)) { const row = weaponById(id); WCLASS.set(id, row ? { row, ...classify(row) } : null); }
  return WCLASS.get(id);
}
/** その機体がいま撃つ武器（拾った武器があればそれ） */
export const unitWeaponInfo = u => (u.weapon && weaponInfoById(u.weapon)) || weaponInfo(u.kind);
const inMap = (sim, x, y) => x >= 0 && y >= 0 && x < sim.map.w * TILE && y < sim.map.h * TILE;
const canStand = (sim, x, y) => inMap(sim, x, y) && passable(sim.map, toTile(x), toTile(y));
/** 押し戻し: 水・マップの外へは押されない。まっすぐ行けなければ横か縦だけ動く（壁ぞいに滑る） */
export function pushUnit(sim, u, mx, my) {
  if (!mx && !my) return;
  if (canStand(sim, u.x + mx, u.y + my)) { u.x += mx; u.y += my; }
  else if (mx && canStand(sim, u.x + mx, u.y)) u.x += mx;
  else if (my && canStand(sim, u.x, u.y + my)) u.y += my;
}
function updateReactions(sim, dt) {
  for (const u of sim.units) {
    if (!u._hr) continue;
    const q = reactStep(u, dt);
    if (u.captured == null) pushUnit(sim, u, q.moveX, q.moveY);
    if (q.stun) u.moving = false;
  }
}

function terrainSpeed(sim, x, y) { return 1 / TERRAIN[tileAt(sim.map, toTile(x), toTile(y))].cost; }

function moveToward(sim, u, tx, ty, speedMul, dt) {
  const dx = tx - u.x, dy = ty - u.y, d = Math.hypot(dx, dy);
  if (d < 0.5) { u.moving = false; return true; }
  const step = Math.min(d, u.speed * speedMul * terrainSpeed(sim, u.x, u.y) * dt);
  const nx = u.x + dx / d * step, ny = u.y + dy / d * step;
  if (passable(sim.map, toTile(nx), toTile(ny))) { u.x = nx; u.y = ny; }
  if (Math.abs(dx) > 1) u.facing = dx > 0 ? 1 : -1;
  u.moving = true;
  return d - step < 0.5;
}

/** 走っている間は撃たない・止まらない機体（急行・撤退中、戦わない機体の移動中） */
export const isPassive = u => !!u.order && (u.order.mode !== 'fight' || !!KINDS[u.kind]?.noFight);

function updateUnitMovement(sim, u, dt) {
  if (u.captured != null || isStunned(u)) { u.moving = false; return; }
  const o = u.order, mul = (u.speedMul || 1) * (u.carrying != null ? CAPTURE.carryMul : 1);
  let stopped = u.engaged && !isPassive(u);
  if (o && o.attackId != null) {
    const t = unitById(sim, o.attackId);
    if (!t) { u.order = null; u.anchor = { x: u.x, y: u.y }; u.moving = false; return; }
    if (Math.hypot(t.x - u.x, t.y - u.y) <= u.range) stopped = true;
    // 相手が動いたら、1秒ごとに経路を作り直す（見えている間だけ）
    o.repath -= dt;
    if (o.repath <= 0) {
      o.repath = 1;
      const last = o.waypoints[o.waypoints.length - 1];
      if (sim.fog.isVisible(toTile(t.x), toTile(t.y)) && (last.tx !== toTile(t.x) || last.ty !== toTile(t.y))) applyOrder(sim, u, [{ tx: toTile(t.x), ty: toTile(t.y) }], 'fight', t.id);
    }
  }
  const ord = u.order;
  if (ord) advancePlanning(sim, u);
  if (ord && ord.planned.length) ord.prev = null;
  const pp = ord && !ord.planned.length && ord.prev && ord.prev.pathIdx < ord.prev.planned.length ? ord.prev : null;
  if (pp && !stopped) {
    const p = pp.planned[pp.pathIdx];
    if (moveToward(sim, u, tileCenter(p.tx), tileCenter(p.ty), mul, dt)) pp.pathIdx++;
  } else if (ord && !stopped && ord.planned.length) {
    // 経路の最初は自分のいるマスの中心。次のマスのほうへもう進んでいたら、戻らずに次へ
    if (ord.pathIdx === 0 && ord.planned.length > 1) {
      const q0 = ord.planned[0], q1 = ord.planned[1], x1 = tileCenter(q1.tx), y1 = tileCenter(q1.ty);
      if (Math.hypot(x1 - u.x, y1 - u.y) <= Math.hypot(x1 - tileCenter(q0.tx), y1 - tileCenter(q0.ty))) ord.pathIdx = 1;
    }
    const p = ord.planned[Math.min(ord.pathIdx, ord.planned.length - 1)];
    if (moveToward(sim, u, tileCenter(p.tx), tileCenter(p.ty), mul, dt)) {
      ord.pathIdx++;
      const wp = ord.waypoints[ord.wpIndex];
      if (wp && p.tx === wp.tx && p.ty === wp.ty) ord.wpIndex++;
      if (ord.pathIdx >= ord.planned.length && ord.planIndex >= ord.waypoints.length) { u.order = null; u.anchor = { x: u.x, y: u.y }; }
    }
  } else if (!ord && !u.engaged && u.stance === 'free' && !KINDS[u.kind]?.noFight && u.atk > 0) {
    // 迎撃: 視界に入った敵へ自分から近づく。ミッションでは最後に止まった場所から LEASH マスまで
    const a = u.anchor || (u.anchor = { x: u.x, y: u.y });
    const leash = sim.mission ? LEASH * TILE : Infinity;
    let near = null, nd = u.sight * TILE;
    for (const e of sim.units) {
      if (e.side === u.side || (u.side === 'enemy' && e.human)) continue;
      const d = Math.hypot(e.x - u.x, e.y - u.y);
      if (d < nd && Math.hypot(e.x - a.x, e.y - a.y) <= leash + u.range) { nd = d; near = e; }
    }
    if (near && Math.hypot(u.x - a.x, u.y - a.y) < leash) moveToward(sim, u, near.x, near.y, 1, dt);
    else if (!near && Math.hypot(u.x - a.x, u.y - a.y) > 4) moveToward(sim, u, a.x, a.y, 1, dt);
    else u.moving = false;
  } else u.moving = false;
}

// 止まっている機体どうしが重ならないように、少しだけ押し合う（見た目と範囲攻撃のため）
const SEP = { robot: 14, alien: 24, human: 10 };
function separate(sim) {
  const us = sim.units;
  for (let i = 0; i < us.length; i++) {
    const a = us[i]; if (a.captured != null) continue;
    for (let j = i + 1; j < us.length; j++) {
      const b = us[j]; if (b.captured != null || a.side !== b.side) continue;
      if (a.moving && b.moving) continue;
      const r = Math.max(a.kind === 'alien' ? SEP.alien : a.human ? SEP.human : SEP.robot, b.kind === 'alien' ? SEP.alien : b.human ? SEP.human : SEP.robot);
      let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      if (d >= r) continue;
      if (d < 0.01) { const ang = (a.id * 7 + b.id * 13) % 628 / 100; dx = Math.cos(ang); dy = Math.sin(ang); d = 1; }
      const push = (r - d) * 0.15, px = dx / d * push, py = dy / d * push;
      if (!a.moving && passable(sim.map, toTile(a.x - px), toTile(a.y - py))) { a.x -= px; a.y -= py; }
      if (!b.moving && passable(sim.map, toTile(b.x + px), toTile(b.y + py))) { b.x += px; b.y += py; }
    }
  }
}

function updateCombat(sim, dt) {
  for (const u of sim.units) u.engaged = false;
  for (const u of sim.units) {
    u.cd = Math.max(0, u.cd - dt);
    if (u.captured != null || u.atk <= 0 || u.range <= 0) { u.targetId = null; continue; }
    if (isStunned(u)) { u.engaged = u.targetId != null; continue; } // よろけ中は撃たない（狙いはそのまま）
    const want = u.order?.attackId != null ? unitById(sim, u.order.attackId) : null;
    let best = null, bd = Infinity;
    if (want && Math.hypot(want.x - u.x, want.y - u.y) <= u.range) best = want;
    else for (const e of sim.units) {
      if (e.side === u.side || e.hp <= 0) continue;
      if (u.side === 'enemy' && e.human) continue; // 人間は撃たない（捕まえる）
      const d = Math.hypot(e.x - u.x, e.y - u.y);
      if (d <= u.range && d < bd) { bd = d; best = e; }
    }
    u.targetId = best ? best.id : null;
    if (!best) continue;
    if (isPassive(u)) continue; // 走っている間は撃たない
    u.engaged = true;
    if (Math.abs(best.x - u.x) > 1) u.facing = best.x > u.x ? 1 : -1;
    if (u.cd > 0) continue;
    u.cd = u.cooldown;
    const def = TERRAIN[tileAt(sim.map, toTile(best.x), toTile(best.y))].def;
    const dmg = Math.max(1, Math.round(atkOf(u) * def * (0.85 + 0.3 * sim.rng())));
    // 撃たれた異星生物の群れは、撃ってきた相手にすぐ気づく（遮蔽物に止められても）
    const g = best.groupId ? groupById(sim, best.groupId) : null;
    if (g && g.role === 'patrol') g.provokedBy = u.id;
    // 遮蔽物: 相手が遮蔽物の中かすぐ横にいて、間にあれば、確率で弾を止める（乱数はそのときだけ引く）
    const cv = sim.cover.length ? findCover(sim.cover, u.x, u.y, best.x, best.y) : null;
    if (cv && sim.rng() < COVER.kinds[cv.cover.kind].block) { hitCover(sim, u, best, cv, dmg); continue; }
    best.hp -= dmg; best.lastHit = sim.time;
    const wi = unitWeaponInfo(u);
    const react = wi ? hitReact(best, { w: wi.w, dir: Math.atan2(best.y - u.y, best.x - u.x), human: best.human, mass: massOf(best.kind), kind: wi.kind, dead: best.hp <= 0 }) : null;
    sim.fx.push({ type: 'shot', side: u.side, kind: u.kind, x1: u.x, y1: u.y - 10, x2: best.x, y2: best.y - 8, t: sim.time, dmg,
      weapon: wi?.row.id ?? null, from: u.id, to: best.id, toKind: best.kind, toSide: best.side, tier: react ? react.tier : -1, kill: best.hp <= 0 });
  }
  removeDead(sim);
}

// 弾が遮蔽物に止められた: 遮蔽物が代わりに傷む。壊れたら落とし物の抽選
function hitCover(sim, u, best, { cover: c, t }, dmg) {
  const wi = unitWeaponInfo(u);
  // 当たる位置: 弾の線が足場に入る所（足元の高さ）
  const hx = u.x + (best.x - u.x) * t, hy = u.y + (best.y - u.y) * t;
  const res = damageCover(c, dmg);
  sim.fx.push({ type: 'shot', side: u.side, kind: u.kind, x1: u.x, y1: u.y - 10, x2: hx, y2: hy - 8, t: sim.time, dmg,
    weapon: wi?.row.id ?? null, from: u.id, to: null, toKind: null, toSide: null, cover: c.id, coverKind: c.kind, tier: -1, kill: false });
  sim.fx.push({ type: 'coverHit', id: c.id, kind: c.kind, x: hx, y: hy, t: sim.time, dmg, state: c.state });
  if (res !== 'broke') return;
  sim.fx.push({ type: 'coverBreak', id: c.id, kind: c.kind, x: c.x, y: c.y, cx: c.cx, cy: c.cy, rx: c.rx, ry: c.ry, t: sim.time });
  const type = rollDrop(DROPS[COVER.kinds[c.kind].drop], sim.rng());
  if (!type) return;
  const it = { id: sim.nextItemId++, type, x: c.x, y: c.y + 4, t: sim.time, from: c.id };
  if (type === 'weapon') { // 中身はここで決める（いまの装備の格の少し上が出やすい）。候補がなければ何も落とさない
    it.weapon = rollWeapon(gearTier(sim.units), sim.rng());
    if (!it.weapon) return;
  }
  sim.items.push(it);
  sim.fx.push({ type: 'drop', item: type, weapon: it.weapon ?? null, itemId: it.id, x: it.x, y: it.y, t: sim.time });
}

// 落とし物: 味方が足元を通ると拾う。時間がたつと消える
function updatePickups(sim) {
  if (!sim.items.length) return;
  sim.items = sim.items.filter(it => sim.time - it.t < PICKUP.life);
  for (const it of sim.items) {
    const u = sim.units.find(v => canPickUp(v, it));
    if (!u) continue;
    const { equipped } = applyItem(u, it); it.taken = true;
    const w = it.weapon ? weaponById(it.weapon) : null;
    if (w) sim.loot.push(w.id);
    sim.fx.push({ type: 'pickup', item: it.type, name: w ? w.name : ITEMS[it.type].name, weapon: w?.id ?? null, equipped, unit: u.id, unitKind: u.kind, label: u.label, x: u.x, y: u.y, t: sim.time });
  }
  sim.items = sim.items.filter(it => !it.taken);
}

// 倒れた機体を消す。運んでいた資材はその機体の分だけ失う。捕まえていた敵が倒れたら人間は助かる。
function removeDead(sim) {
  const dead = sim.units.filter(u => u.hp <= 0);
  if (!dead.length) return;
  for (const d of dead) {
    sim.fx.push({ type: 'boom', x: d.x, y: d.y, t: sim.time, side: d.side, kind: d.kind, human: d.human });
    if (sim.mission && d.side === 'ally') { sim.mission.lost += d.cargo; if (d.human) sim.mission.humansLost++; }
  }
  sim.units = sim.units.filter(u => u.hp > 0);
  for (const u of sim.units) {
    // 運ばれている途中で、運んでいた個体が倒れた → その場に落ちて、すぐ動ける（＝救出）
    if (typeof u.captured === 'number' && !unitById(sim, u.captured)) freeHuman(sim, u);
  }
  for (const g of sim.groups) g.unitIds = g.unitIds.filter(id => unitById(sim, id));
  sim.groups = sim.groups.filter(g => g.unitIds.length);
}

function freeHuman(sim, h) {
  h.captured = null; h.heldAt = null; h.anchor = { x: h.x, y: h.y };
  sim.fx.push({ type: 'rescue', id: h.id, x: h.x, y: h.y, t: sim.time, side: 'ally' });
}

/** 捕まえた人間を運んでいく先: 巣（ミッションの nest）。巣がない地図では、その個体が出てきた場所。それもなければ地図の上の端 */
export function carryTarget(sim, e) {
  const n = sim.mission?.nest;
  if (n) return { tx: n.tx, ty: n.ty, nest: true };
  const h = e?.home && nearestPassable(sim.map, e.home.tx, e.home.ty);
  if (h) return { ...h, nest: false };
  return { ...(nearestPassable(sim.map, toTile(e?.x ?? 0), 0) || { tx: 0, ty: 0 }), nest: false };
}

// 人間は、異星生物（敵）に触られると捕まる（5-4）。捕まえた個体は群れを離れ、人間を抱えて巣へ運ぶ（決定 09:37）。
// 運んでいる間は遅い・撃たない（CAPTURE.carryMul）。途中で倒されると人間はその場に落ちて助かる。
// 巣に着くと人間は巣に置かれ、運んだ個体は巣に残る（仮）。ロボが巣に入り、巣のまわりに敵がいなくなると助かる（仮）。
function updateCaptures(sim) {
  for (const h of sim.units) {
    if (h.side !== 'ally' || !h.human || h.captured != null) continue;
    for (const e of sim.units) {
      if (e.side !== 'enemy' || e.carrying != null || isStunned(e)) continue; // 1体で運べるのは1人。よろけ中は捕まえない
      if (Math.hypot(e.x - h.x, e.y - h.y) > CAPTURE.radius) continue;
      h.captured = e.id; h.heldAt = null; h.order = null; h.gathering = null; h.moving = false;
      if (sim.mission && h.cargo > 0) { sim.mission.lost += h.cargo; h.cargo = 0; }
      e.carrying = h.id; e.stance = 'hold'; e.speedMul = 1; e.targetId = null;
      const g = e.groupId ? groupById(sim, e.groupId) : null;
      if (g) { g.unitIds = g.unitIds.filter(id => id !== e.id); e.groupId = null; }
      sim.groups = sim.groups.filter(q => q.unitIds.length);
      const dest = carryTarget(sim, e);
      applyOrder(sim, e, [dest], 'carry');
      sim.fx.push({ type: 'captured', x: h.x, y: h.y, t: sim.time, side: 'ally', label: h.label });
      break;
    }
  }
}

/** 運ばれている人間は、運んでいる個体にくっついて動く。巣に着いたら巣に置く。巣の人間は、ロボが来て敵がいなくなると助かる */
function updateCarry(sim) {
  for (const e of sim.units) {
    if (e.carrying == null) continue;
    const h = unitById(sim, e.carrying);
    if (!h || h.captured !== e.id) { e.carrying = null; continue; }
    h.x = e.x + CAPTURE.holdOffset.x * (e.facing || 1); h.y = e.y + CAPTURE.holdOffset.y; h.facing = e.facing;
    const dest = carryTarget(sim, e), dx = tileCenter(dest.tx), dy = tileCenter(dest.ty);
    if (Math.hypot(e.x - dx, e.y - dy) <= CAPTURE.arriveRadius * TILE) {
      // 着いた: 人間を巣に置く。運んだ個体はその場に残り、巣の番をする（仮）
      const k = sim.units.filter(u => u.heldAt).length;
      h.captured = 'nest'; h.heldAt = { tx: dest.tx, ty: dest.ty, nest: dest.nest };
      h.x = dx + (k % 3 - 1) * 12; h.y = dy + 6;
      e.carrying = null; e.order = null; e.moving = false; e.stance = 'free'; e.anchor = { x: e.x, y: e.y };
      sim.fx.push({ type: 'nested', x: h.x, y: h.y, t: sim.time, side: 'ally', label: h.label });
    } else if (!e.order) applyOrder(sim, e, [dest], 'carry'); // 押し合いなどで止まったら、もう一度向かう
  }
  // 巣（または運ばれた先）に置かれた人間: そばにロボがいて、そばに敵がいなければ助かる
  for (const h of sim.units) {
    if (h.captured !== 'nest') continue;
    const r = CAPTURE.nestRescueRadius * TILE;
    const robot = sim.units.some(u => u.side === 'ally' && !u.human && Math.hypot(u.x - h.x, u.y - h.y) <= r);
    const guard = sim.units.some(u => u.side === 'enemy' && Math.hypot(u.x - h.x, u.y - h.y) <= r);
    if (robot && !guard) freeHuman(sim, h);
  }
}

function groupMove(sim, g, wp) { applyGroupMove(sim, groupUnits(sim, g), [wp], 'fight'); }
const groupHasOrder = (sim, g) => groupUnits(sim, g).some(u => u.order);

// 敵のとても簡単な思考（従来の撃ち合い用）: 近くに味方が見えたら向かう。いなければ巡回。
function updateEnemyAI(sim, dt) {
  for (const g of sim.groups) {
    if (g.role === 'patrol') continue;
    g.aiTimer -= dt; if (g.aiTimer > 0) continue;
    g.aiTimer = 3 + sim.rng() * 2;
    const c = groupUnits(sim, g)[0]; if (!c) continue;
    let near = null, nd = 7 * TILE;
    for (const u of sim.units) if (u.side === 'ally') { const d = Math.hypot(u.x - c.x, u.y - c.y); if (d < nd) { nd = d; near = u; } }
    if (near) { groupMove(sim, g, { tx: toTile(near.x), ty: toTile(near.y) }); continue; }
    if (groupHasOrder(sim, g)) continue;
    const m = sim.map, hq = m.hq.enemy;
    const t = g.role === 'guard'
      ? { tx: hq.tx - 6 + Math.floor(sim.rng() * 13), ty: hq.ty + 3 + Math.floor(sim.rng() * 7) }
      : { tx: 3 + Math.floor(sim.rng() * (m.w - 6)), ty: 8 + Math.floor(sim.rng() * 22) };
    groupMove(sim, g, t);
  }
}

/** 異星生物の群れが見ている味方の中で、一番近いもの（森の中の機体は近づかないと見えない）。捕まった人間は数えない */
export function groupSees(sim, g) {
  let best = null, bd = Infinity, closeness = 0;
  for (const a of groupUnits(sim, g)) {
    for (const u of sim.units) {
      if (u.side !== 'ally' || u.captured != null) continue;
      const inForest = tileAt(sim.map, toTile(u.x), toTile(u.y)) === T.FOREST;
      const range = a.sight * TILE * (inForest ? ALERT.forestSight : 1);
      const d = Math.hypot(u.x - a.x, u.y - a.y);
      if (d <= range && d < bd) { bd = d; best = u; closeness = 1 - d / range; }
    }
  }
  return best ? { unit: best, closeness } : null;
}

// 巡回する異星生物: 巡回 → 気づき（ゲージ）→ 追跡 → 見失ってあきらめる → 巡回路へ戻る
function updatePatrols(sim, dt) {
  for (const g of sim.groups) {
    if (g.role !== 'patrol') continue;
    const members = groupUnits(sim, g), c = members[0]; if (!c) continue;
    const seen = groupSees(sim, g);
    if (g.provokedBy != null) {
      const p = unitById(sim, g.provokedBy);
      g.provokedBy = null;
      if (p) { g.alert = 1; g.lastSeen = { tx: toTile(p.x), ty: toTile(p.y) }; if (g.ai !== 'chase') { g.ai = 'chase'; g.targetId = p.id; g.aiTimer = 0; } }
    }
    if (seen) {
      g.lostTimer = 0;
      g.alert = Math.min(1, g.alert + ALERT.rise * (1 + seen.closeness) * dt);
      if (g.ai === 'chase') g.targetId = seen.unit.id;
      g.lastSeen = { tx: toTile(seen.unit.x), ty: toTile(seen.unit.y) };
    } else {
      g.alert = Math.max(0, g.alert - ALERT.decay * dt);
    }
    if (g.ai !== 'chase' && g.alert >= 1 && seen) { g.ai = 'chase'; g.targetId = seen.unit.id; g.aiTimer = 0; }
    if (g.ai === 'chase') {
      g.speedMul = ALERT.chaseMul;
      if (!seen) g.lostTimer += dt;
      if (g.lostTimer >= ALERT.giveUp) {
        g.ai = 'return'; g.targetId = null; g.lastSeen = null; g.speedMul = 1; g.alert = Math.min(g.alert, 0.5);
        let bi = 0, bd = Infinity;
        g.route.forEach((w, i) => { const d = Math.hypot(tileCenter(w.tx) - c.x, tileCenter(w.ty) - c.y); if (d < bd) { bd = d; bi = i; } });
        g.routeIdx = bi; groupMove(sim, g, g.route[bi]);
      } else {
        g.aiTimer -= dt;
        if (g.aiTimer <= 0) {
          g.aiTimer = ALERT.repath;
          if (g.lastSeen && (seen || !groupHasOrder(sim, g))) groupMove(sim, g, g.lastSeen);
        }
      }
    } else {
      g.speedMul = 1;
      if (!groupHasOrder(sim, g)) {
        if (g.ai === 'return') g.ai = 'patrol';
        else g.routeIdx = (g.routeIdx + 1) % g.route.length;
        groupMove(sim, g, g.route[g.routeIdx]);
      }
    }
    for (const u of members) u.speedMul = g.speedMul;
  }
}

function updateRegen(sim, dt) {
  for (const u of sim.units) {
    if (!KINDS[u.kind]?.regen || u.hp >= u.maxHp) continue;
    if (sim.time - u.lastHit < ALERT.regenDelay) continue;
    u.hp = Math.min(u.maxHp, u.hp + u.maxHp * ALERT.regenRate * dt);
  }
}

// 回収と脱出: 止まっている機体は回収ポイントの近くで資材を集める（1機ずつ自分で運ぶ）。脱出口に入った機体が届ける。
function updateMission(sim, dt) {
  const m = sim.mission; if (!m) return;
  const allies = sim.units.filter(u => u.side === 'ally');
  for (const u of allies) u.gathering = null;
  const free = new Set(allies.filter(u => !u.order && !u.engaged && u.captured == null && !isStunned(u) && (KINDS[u.kind]?.gather || 0) > 0));
  for (const p of m.salvage) {
    if (p.amount <= 0 || !free.size) continue;
    const px = tileCenter(p.tx), py = tileCenter(p.ty), r = GATHER_RADIUS * TILE;
    const near = [...free].filter(u => Math.hypot(u.x - px, u.y - py) <= r);
    if (!near.length) continue;
    const rate = near.reduce((a, u) => a + KINDS[u.kind].gather, 0);
    const take = Math.min(p.amount, rate * dt);
    if (take <= 0) continue;
    p.amount = Math.max(0, p.amount - take); if (p.amount < 1e-6) p.amount = 0;
    const before = p.gathered; p.gathered += take;
    for (const u of near) { u.cargo += take * KINDS[u.kind].gather / rate; u.gathering = p.id; free.delete(u); }
    if (Math.floor(p.gathered) > Math.floor(before)) {
      const u = near[Math.floor(p.gathered) % near.length];
      sim.fx.push({ type: 'gain', x: u.x, y: u.y, t: sim.time, side: 'ally', n: 1, pile: p.id });
    }
    // 掘り出し物（小さなおまけ。乱数は seed 付き）。見つけた機体が持つ
    while (p.nextFind < FIND.at.length && p.gathered >= FIND.at[p.nextFind]) {
      p.nextFind++;
      if (sim.rng() < FIND.chance) {
        const name = FIND.names[Math.floor(sim.rng() * FIND.names.length)];
        const u = near[0];
        u.cargo += FIND.bonus;
        m.finds.push({ name, t: sim.time, unitId: u.id, pile: p.id });
        sim.fx.push({ type: 'find', x: u.x, y: u.y, t: sim.time, side: 'ally', name, n: FIND.bonus });
      }
    }
  }
  const ex = tileCenter(m.extraction.tx), ey = tileCenter(m.extraction.ty);
  for (const u of allies) {
    if (u.cargo > 0 && u.captured == null && Math.hypot(u.x - ex, u.y - ey) <= EXTRACT_RADIUS * TILE) {
      m.delivered += u.cargo; u.cargo = 0;
      sim.fx.push({ type: 'deliver', x: u.x, y: u.y, t: sim.time, side: 'ally' });
    }
  }
}

/** ミッションの集計（HUD 用）: 届けた量・運んでいる量・経過時間・掘り出し物・人間（制限時間はない） */
export function missionStatus(sim) {
  const m = sim.mission; if (!m) return null;
  const allies = sim.units.filter(u => u.side === 'ally');
  const carrying = allies.reduce((a, u) => a + u.cargo, 0);
  const left = m.salvage.reduce((a, p) => a + p.amount, 0);
  const humans = allies.filter(u => u.human);
  return {
    delivered: m.delivered, carrying, target: m.target, elapsed: sim.time, salvageLeft: left, finds: m.finds.length,
    ...fieldCount(sim), captured: humans.filter(h => h.captured != null).length,
    boyCaptured: humans.some(h => h.kind === 'boy' && h.captured != null),
    carried: humans.filter(h => typeof h.captured === 'number').length, atNest: humans.filter(h => h.captured === 'nest').length,
  };
}

function updateFog(sim) {
  const f = sim.fog; f.begin();
  const hq = sim.map.hq.ally; f.stamp(hq.tx, hq.ty, 6);
  if (sim.mission) f.stamp(sim.mission.extraction.tx, sim.mission.extraction.ty, 2);
  for (const u of sim.units) if (u.side === 'ally') f.stamp(toTile(u.x), toTile(u.y), u.captured != null ? 1.5 : u.sight);
  f.commit();
}

function applyCommands(sim) {
  for (const cmd of sim.commands.splice(0)) {
    const us = (cmd.unitIds || []).map(id => unitById(sim, id)).filter(u => u && u.side === 'ally' && u.captured == null);
    if (!us.length) continue;
    if (cmd.type === 'move') applyGroupMove(sim, us, cmd.waypoints, cmd.mode === 'rush' ? 'rush' : 'fight');
    else if (cmd.type === 'attack') {
      const t = unitById(sim, cmd.targetId);
      if (!t || t.side === 'ally') continue;
      for (const u of us) if (u.atk > 0 && !KINDS[u.kind]?.noFight) applyOrder(sim, u, [{ tx: toTile(t.x), ty: toTile(t.y) }], 'fight', t.id);
    } else if (cmd.type === 'stance') {
      for (const u of us) { u.stance = cmd.stance === 'free' ? 'free' : 'hold'; u.anchor = { x: u.x, y: u.y }; }
    } else if (cmd.type === 'stop') {
      for (const u of us) { u.order = null; u.moving = false; u.anchor = { x: u.x, y: u.y }; }
    } else if (cmd.type === 'retreat') {
      const hq = sim.map.hq.ally;
      applyGroupMove(sim, us, [{ tx: hq.tx, ty: hq.ty - 2 }], 'retreat');
    }
  }
}

/** 一時停止中に命令を出したとき用: 時間を進めずに命令を反映し、経路を最後まで作る（経路の表示のため） */
export function applyCommandsNow(sim) {
  applyCommands(sim);
  for (const u of sim.units) for (let k = 0; k < 200 && u.order && u.order.planIndex !== u.order.waypoints.length; k++) advancePlanning(sim, u);
}

function checkResult(sim) {
  if (sim.result) return;
  const allies = sim.units.filter(u => u.side === 'ally');
  if (sim.mission) {
    const m = sim.mission;
    const robots = allies.filter(u => !u.human && !u.aiAlly).length; // AI の味方だけ残っても続けられない
    const freeHumans = allies.filter(u => u.human && !u.aiAlly && u.captured == null).length;
    const boyCaptured = allies.some(u => u.kind === 'boy' && u.captured != null);
    // 少年が捕まったままでは、脱出（勝ち）にならない（5-4。仮）
    if (m.delivered >= m.target - 1e-6 && !boyCaptured) { sim.result = 'win'; sim.resultReason = 'extracted'; }
    else if (!robots && boyCaptured) { sim.result = 'lose'; sim.resultReason = 'boyCaptured'; }
    else if (!robots && !freeHumans) { sim.result = 'lose'; sim.resultReason = 'wiped'; }
    // 制限時間はない（決定）。時間がたつだけでは負けない
    return;
  }
  const e = sim.units.some(u => u.side === 'enemy');
  if (!e) sim.result = 'win'; else if (!allies.length) sim.result = 'lose';
}

/** 1ステップ進める */
export function stepSim(sim) {
  const dt = TICK;
  applyCommands(sim);
  updateEnemyAI(sim, dt);
  updatePatrols(sim, dt);
  updateCombat(sim, dt);
  updateRegen(sim, dt);
  updateReactions(sim, dt);
  for (const u of sim.units) updateUnitMovement(sim, u, dt);
  separate(sim);
  updateCaptures(sim);
  updateCarry(sim);
  updatePickups(sim);
  updateMission(sim, dt);
  updateFog(sim);
  sim.fx = sim.fx.filter(f => sim.time - f.t < (f.type === 'find' || f.type === 'captured' || f.type === 'rescue' || f.type === 'nested' || f.type === 'pickup' || f.type === 'coverBreak' ? 2.2 : f.type === 'gain' ? 1 : 0.8));
  sim.tick++; sim.time = sim.tick * TICK;
  checkResult(sim);
}

export function runSim(sim, steps) { for (let i = 0; i < steps; i++) stepSim(sim); return sim; }

/** 状態の要約ハッシュ（同じ seed・同じ命令なら同じ値になることをテストで確かめる） */
export function hashSim(sim) {
  let h = 2166136261 >>> 0;
  const mix = v => { h ^= v & 0xffffffff; h = Math.imul(h, 16777619) >>> 0; };
  mix(sim.tick); mix(sim.rng.state());
  for (const u of sim.units) { mix(u.id); mix(Math.round(u.x * 100)); mix(Math.round(u.y * 100)); mix(Math.round(u.hp * 100)); mix(Math.round(u.cargo * 1000)); mix(u.captured === 'nest' ? -2 : u.captured ?? -1); }
  for (const b of sim.fog.seen) mix(b);
  if (sim.mission) {
    mix(Math.round(sim.mission.delivered * 1000));
    for (const p of sim.mission.salvage) mix(Math.round(p.amount * 1000));
    mix(sim.mission.finds.length);
  }
  for (const g of sim.groups) mix(Math.round((g.alert || 0) * 1000));
  for (const c of sim.cover) mix(Math.round(c.hp * 100));
  for (const it of sim.items) { mix(it.id); mix(Math.round(it.x)); mix(Math.round(it.y)); }
  for (const u of sim.units) if (u.weapon) mix(Math.round((u.wmul || 1) * 1000));
  return h.toString(16);
}
