// ゲームの中身（固定ステップ・決まった乱数）。DOM と Pixi は import しない。描画側は state を読むだけ。
// v0.2.0: ミッション（資材集め・巡回・脱出）を追加。createSim({ mission }) で有効になる。mission なしは従来の撃ち合い。
import { createRng } from './rng.js?v=4';
import { generateMap, TILE, TERRAIN, T, tileAt, toTile, tileCenter, passable, nearestPassable } from './map.js?v=4';
import { createSearch, stepSearch } from './path.js?v=4';
import { FogGrid } from './fog.js?v=4';
import { ALERT, GATHER_RADIUS, EXTRACT_RADIUS } from './mission.js?v=4';

export const TICK = 1 / 30;          // 1ステップ＝1/30秒
export const SEARCH_BUDGET = 250;    // 1部隊1ステップで広げる A* ノード数

// 兵種（仮）。range/speed はワールド座標（1タイル=32）。gather＝1機が毎秒集める資材
export const KINDS = Object.freeze({
  gunner: { name: '射撃型', hp: 100, atk: 8, range: 112, cooldown: 0.9, speed: 22, sight: 4.5, gather: 0.1 },
  heavy: { name: '重装型', hp: 160, atk: 13, range: 88, cooldown: 1.3, speed: 17, sight: 4, gather: 0.1 },
  // v0.2.0 ミッション用
  scav: { name: 'ツギハギ号', hp: 60, atk: 1, range: 40, cooldown: 1.2, speed: 22, sight: 4.5, gather: 0.5, noFight: true },
  ponco: { name: 'PONCO02', hp: 120, atk: 10, range: 112, cooldown: 0.9, speed: 20, sight: 4.5, gather: 0.1 },
  alien: { name: '異星生物', hp: 360, atk: 14, range: 44, cooldown: 1.2, speed: 16, sight: 4, gather: 0, regen: true },
});
const COMMANDER = { hpMul: 1.3, atkMul: 1.2, sight: 6 };
// 部隊の並び（隊長を原点、前方が -y）。大きい異星生物は間隔を広げる
const SLOTS = [{ x: -17, y: 15 }, { x: 17, y: 15 }, { x: 0, y: 30 }];
const slotScale = kind => (kind === 'alien' ? 1.6 : 1);

export const SQUAD_SETUP = Object.freeze({
  ally: [
    { name: 'A隊', kind: 'gunner', tx: 13, ty: 52 },
    { name: 'B隊', kind: 'heavy', tx: 20, ty: 50 },
    { name: 'C隊', kind: 'gunner', tx: 27, ty: 52 },
  ],
  enemy: [
    { name: '赤1', kind: 'heavy', tx: 20, ty: 9, role: 'guard' },
    { name: '赤2', kind: 'gunner', tx: 11, ty: 14, role: 'raid' },
    { name: '赤3', kind: 'gunner', tx: 29, ty: 14, role: 'raid' },
  ],
});

export function createSim({ seed = 1, mapSeed = 7, setup = SQUAD_SETUP, mission = null } = {}) {
  const map = generateMap(mapSeed);
  const sim = {
    seed, tick: 0, time: 0, rng: createRng(seed), map,
    fog: new FogGrid(map.w, map.h),
    units: [], squads: [], commands: [], fx: [], result: null, resultReason: null, nextId: 1,
    mission: null,
  };
  if (mission) {
    sim.mission = createMissionState(map, mission);
    setup = {
      ally: mission.ally,
      enemy: mission.aliens.map(a => ({ ...a, role: 'patrol', tx: a.route[0].tx, ty: a.route[0].ty })),
    };
  }
  for (const side of ['ally', 'enemy']) setup[side].forEach((def, i) => spawnSquad(sim, side, def, i));
  updateFog(sim);
  return sim;
}

function createMissionState(map, m) {
  const ex = nearestPassable(map, m.extraction.tx, m.extraction.ty);
  return {
    id: m.id, timeLimit: m.timeLimit, target: m.target, delivered: 0, lost: 0,
    salvage: m.salvage.map((p, i) => { const q = nearestPassable(map, p.tx, p.ty); return { id: i, tx: q.tx, ty: q.ty, amount: p.amount, max: p.amount }; }),
    extraction: { tx: ex.tx, ty: ex.ty },
  };
}

function spawnSquad(sim, side, def, index) {
  const k = KINDS[def.kind];
  const squad = {
    id: `${side[0]}${index + 1}`, side, name: def.name, kind: def.kind, role: def.role || null, unitIds: [], order: null, engaged: false,
    heading: side === 'ally' ? -Math.PI / 2 : Math.PI / 2, aiTimer: index * 1.3, alive: true,
    cargo: 0, gathering: null, speedMul: 1, trail: [],
  };
  if (squad.role === 'patrol') {
    squad.route = def.route.map(w => nearestPassable(sim.map, w.tx, w.ty));
    Object.assign(squad, { routeIdx: 0, ai: 'patrol', alert: 0, lostTimer: 0, targetId: null, lastSeen: null, provokedBy: null });
  }
  const start = nearestPassable(sim.map, def.tx, def.ty);
  const cx = tileCenter(start.tx), cy = tileCenter(start.ty);
  const count = Math.max(1, Math.min(4, def.count ?? 4));
  for (let j = 0; j < count; j++) {
    const commander = j === 0;
    const off = commander ? { x: 0, y: 0 } : rotate(SLOTS[j - 1], squad.heading, slotScale(def.kind));
    const hp = Math.round(k.hp * (commander ? COMMANDER.hpMul : 1));
    const u = { id: sim.nextId++, side, squadId: squad.id, kind: def.kind, commander, x: cx + off.x, y: cy + off.y, hp, maxHp: hp, atk: k.atk * (commander ? COMMANDER.atkMul : 1), range: k.range, cooldown: k.cooldown, cd: (j * 0.2) % k.cooldown, speed: k.speed, sight: commander && side === 'ally' ? COMMANDER.sight : k.sight, facing: side === 'ally' ? 1 : -1, moving: false, targetId: null, lastHit: -99 };
    sim.units.push(u); squad.unitIds.push(u.id);
  }
  sim.squads.push(squad);
}

// 前方 -y を heading 方向へ回す
function rotate(p, heading, scale = 1) {
  const a = heading + Math.PI / 2, c = Math.cos(a), s = Math.sin(a);
  return { x: (p.x * c - p.y * s) * scale, y: (p.x * s + p.y * c) * scale };
}

export const unitById = (sim, id) => sim.units.find(u => u.id === id) || null;
export const squadById = (sim, id) => sim.squads.find(s => s.id === id) || null;
export const squadUnits = (sim, squad) => squad.unitIds.map(id => unitById(sim, id)).filter(Boolean);
export const squadCommander = (sim, squad) => squadUnits(sim, squad).find(u => u.commander) || null;

/** 命令は次のステップの頭で反映（入力のタイミングに左右されない＝再現できる） */
export function issueOrder(sim, squadId, waypoints) {
  sim.commands.push({ type: 'move', squadId, waypoints: waypoints.map(w => ({ tx: w.tx, ty: w.ty })) });
}

function applyOrder(sim, squad, waypoints) {
  const wps = waypoints.slice(0, 4).map(w => nearestPassable(sim.map, w.tx, w.ty)).filter(Boolean);
  if (!wps.length) { squad.order = null; return; }
  const c = squadCommander(sim, squad); if (!c) return;
  // 新しい経路ができるまでは、前の経路のまま進む（命令を続けて出しても止まらないように）
  const old = squad.order, prev = old && (old.planned.length ? old : old.prev) || null;
  squad.order = { waypoints: wps, wpIndex: 0, from: { tx: toTile(c.x), ty: toTile(c.y) }, search: null, path: [], pathIdx: 0, planned: [], prev: prev ? { planned: prev.planned, pathIdx: prev.pathIdx } : null };
}

/** 経路は経由点ごとに区切って差分 A* で作る。全区間がつながると order.planned に全体が入る（表示用） */
function advancePlanning(sim, squad) {
  const o = squad.order; if (!o) return;
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

// 戦わない機体（ツギハギ号）の部隊は、移動命令があれば交戦で止まらない（逃げられるように）
const keepsMoving = squad => KINDS[squad.kind]?.noFight && squad.order;

function updateSquadMovement(sim, squad, dt) {
  const units = squadUnits(sim, squad), c = units.find(u => u.commander);
  if (!c) return;
  const o = squad.order, mul = squad.speedMul || 1;
  const stopped = squad.engaged && !keepsMoving(squad);
  if (o) advancePlanning(sim, squad);
  if (o && o.planned.length) o.prev = null;
  const pp = o && !o.planned.length && o.prev && o.prev.pathIdx < o.prev.planned.length ? o.prev : null;
  // 戦闘移動: 交戦中は止まって撃つ
  if (pp && !stopped) {
    const p = pp.planned[pp.pathIdx], px = tileCenter(p.tx), py = tileCenter(p.ty);
    if (Math.hypot(px - c.x, py - c.y) > 2) squad.heading = Math.atan2(py - c.y, px - c.x);
    if (moveToward(sim, c, px, py, mul, dt)) pp.pathIdx++;
  } else if (o && !stopped && o.planned.length) {
    // 経路の最初は自分のいるマスの中心。次のマスのほうへもう進んでいたら、戻らずに次へ（命令を出し直しても後戻りしない）
    if (o.pathIdx === 0 && o.planned.length > 1) {
      const q0 = o.planned[0], q1 = o.planned[1], x1 = tileCenter(q1.tx), y1 = tileCenter(q1.ty);
      if (Math.hypot(x1 - c.x, y1 - c.y) <= Math.hypot(x1 - tileCenter(q0.tx), y1 - tileCenter(q0.ty))) o.pathIdx = 1;
    }
    const p = o.planned[Math.min(o.pathIdx, o.planned.length - 1)];
    const px = tileCenter(p.tx), py = tileCenter(p.ty);
    const dx = px - c.x, dy = py - c.y;
    if (Math.hypot(dx, dy) > 2) squad.heading = Math.atan2(dy, dx);
    if (moveToward(sim, c, px, py, mul, dt)) {
      o.pathIdx++;
      const wp = o.waypoints[o.wpIndex];
      if (wp && p.tx === wp.tx && p.ty === wp.ty) o.wpIndex++;
      if (o.pathIdx >= o.planned.length && o.planIndex >= o.waypoints.length) squad.order = null;
    }
  } else if (!o && !squad.engaged && !sim.mission && squad.role !== 'patrol') {
    // 待機中の部隊は、視界に入った敵へ自分から近づく（従来の撃ち合いだけ。ミッションでは勝手に動かない）
    let near = null, nd = c.sight * TILE;
    for (const e of sim.units) if (e.side !== squad.side) { const d = Math.hypot(e.x - c.x, e.y - c.y); if (d < nd) { nd = d; near = e; } }
    if (near) { squad.heading = Math.atan2(near.y - c.y, near.x - c.x); moveToward(sim, c, near.x, near.y, 1, dt); } else c.moving = false;
  } else c.moving = false;
  // 隊長の通った跡（兵士がはぐれたときに、水を回り込んで追いつくため）
  const tr = squad.trail, last = tr[tr.length - 1];
  if (!last || Math.hypot(last.x - c.x, last.y - c.y) > 12) { tr.push({ x: c.x, y: c.y }); if (tr.length > 80) tr.shift(); }
  // 兵士は隊列の位置へ（少し速く追いつく）。位置が水なら隊長の位置へ。
  const sc = slotScale(squad.kind);
  units.filter(u => !u.commander).forEach((u, i) => {
    const off = rotate(SLOTS[i % SLOTS.length], squad.heading, sc);
    let gx = c.x + off.x, gy = c.y + off.y;
    if (!passable(sim.map, toTile(gx), toTile(gy))) { gx = c.x; gy = c.y; }
    if (Math.hypot(c.x - u.x, c.y - u.y) > 80 * sc && tr.length > 1) {
      // はぐれた兵士: 一番近い跡の、1つ先へ向かう（跡をたどれば水を越えずに追いつける）
      let bi = 0, bd = Infinity;
      tr.forEach((q, k) => { const d = Math.hypot(q.x - u.x, q.y - u.y); if (d < bd) { bd = d; bi = k; } });
      const q = tr[Math.min(bi + 1, tr.length - 1)]; gx = q.x; gy = q.y;
    }
    if (stopped && Math.hypot(gx - u.x, gy - u.y) < 40 * sc) { u.moving = false; return; }
    moveToward(sim, u, gx, gy, 1.2 * mul, dt);
  });
}

function updateCombat(sim, dt) {
  for (const s of sim.squads) s.engaged = false;
  for (const u of sim.units) {
    u.cd = Math.max(0, u.cd - dt);
    let best = null, bd = Infinity;
    for (const e of sim.units) {
      if (e.side === u.side || e.hp <= 0) continue;
      const d = Math.hypot(e.x - u.x, e.y - u.y);
      if (d <= u.range && d < bd) { bd = d; best = e; }
    }
    u.targetId = best ? best.id : null;
    if (!best) continue;
    const sq = squadById(sim, u.squadId);
    if (sq && keepsMoving(sq)) continue; // 逃げている間は撃たない
    if (sq) sq.engaged = true;
    if (Math.abs(best.x - u.x) > 1) u.facing = best.x > u.x ? 1 : -1;
    if (u.cd > 0) continue;
    u.cd = u.cooldown;
    const def = TERRAIN[tileAt(sim.map, toTile(best.x), toTile(best.y))].def;
    const dmg = Math.max(1, Math.round(u.atk * def * (0.85 + 0.3 * sim.rng())));
    best.hp -= dmg; best.lastHit = sim.time;
    // 撃たれた異星生物の群れは、撃ってきた相手にすぐ気づく
    const tsq = squadById(sim, best.squadId);
    if (tsq && tsq.role === 'patrol') tsq.provokedBy = u.id;
    sim.fx.push({ type: 'shot', side: u.side, kind: u.kind, x1: u.x, y1: u.y - 10, x2: best.x, y2: best.y - 8, t: sim.time, dmg });
  }
  // 倒れた機体を消す。隊長が倒れたら兵士が繰り上がる。運んでいた資材は、減った機体の割合だけ失う。
  const dead = sim.units.filter(u => u.hp <= 0);
  if (dead.length) {
    for (const d of dead) sim.fx.push({ type: 'boom', x: d.x, y: d.y, t: sim.time, side: d.side });
    sim.units = sim.units.filter(u => u.hp > 0);
    for (const s of sim.squads) {
      const before = s.unitIds.length;
      s.unitIds = s.unitIds.filter(id => unitById(sim, id));
      if (s.cargo > 0 && s.unitIds.length < before) {
        const keep = s.cargo * s.unitIds.length / before;
        if (sim.mission) sim.mission.lost += s.cargo - keep;
        s.cargo = keep;
      }
      if (!s.unitIds.length) { s.alive = false; s.order = null; continue; }
      const us = squadUnits(sim, s);
      if (!us.some(u => u.commander)) {
        // 隊長に一番近い兵士が繰り上がる。移動命令は新しい隊長の位置から作り直す
        const old = dead.find(x => x.squadId === s.id && x.commander) || us[0];
        us.sort((a, b) => Math.hypot(a.x - old.x, a.y - old.y) - Math.hypot(b.x - old.x, b.y - old.y));
        us[0].commander = true; if (s.side === 'ally') us[0].sight = COMMANDER.sight;
        s.unitIds = us.map(u => u.id);
        if (s.order) applyOrder(sim, s, s.order.waypoints.slice(s.order.wpIndex));
      }
    }
    sim.squads = sim.squads.filter(s => s.alive);
  }
}

// 敵のとても簡単な思考（従来の撃ち合い用）: 近くに味方が見えたら向かう。いなければ巡回。
function updateEnemyAI(sim, dt) {
  for (const s of sim.squads) {
    if (s.side !== 'enemy' || s.role === 'patrol') continue;
    s.aiTimer -= dt; if (s.aiTimer > 0) continue;
    s.aiTimer = 3 + sim.rng() * 2;
    const c = squadCommander(sim, s); if (!c) continue;
    let near = null, nd = 7 * TILE;
    for (const u of sim.units) if (u.side === 'ally') { const d = Math.hypot(u.x - c.x, u.y - c.y); if (d < nd) { nd = d; near = u; } }
    if (near) { applyOrder(sim, s, [{ tx: toTile(near.x), ty: toTile(near.y) }]); continue; }
    if (s.order) continue;
    const m = sim.map, hq = m.hq.enemy;
    const t = s.role === 'guard'
      ? { tx: hq.tx - 6 + Math.floor(sim.rng() * 13), ty: hq.ty + 3 + Math.floor(sim.rng() * 7) }
      : { tx: 3 + Math.floor(sim.rng() * (m.w - 6)), ty: 8 + Math.floor(sim.rng() * 22) };
    applyOrder(sim, s, [t]);
  }
}

/** 異星生物の群れが見ている味方の中で、一番近いもの（森の中の機体は近づかないと見えない） */
export function groupSees(sim, squad) {
  let best = null, bd = Infinity, closeness = 0;
  for (const a of squadUnits(sim, squad)) {
    for (const u of sim.units) {
      if (u.side !== 'ally') continue;
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
  for (const s of sim.squads) {
    if (s.role !== 'patrol') continue;
    const c = squadCommander(sim, s); if (!c) continue;
    const seen = groupSees(sim, s);
    if (s.provokedBy != null) {
      const p = unitById(sim, s.provokedBy);
      s.provokedBy = null;
      if (p) { s.alert = 1; s.lastSeen = { tx: toTile(p.x), ty: toTile(p.y) }; if (s.ai !== 'chase') { s.ai = 'chase'; s.targetId = p.id; s.aiTimer = 0; } }
    }
    if (seen) {
      s.lostTimer = 0;
      s.alert = Math.min(1, s.alert + ALERT.rise * (1 + seen.closeness) * dt);
      if (s.ai === 'chase') s.targetId = seen.unit.id;
      s.lastSeen = { tx: toTile(seen.unit.x), ty: toTile(seen.unit.y) };
    } else {
      s.alert = Math.max(0, s.alert - ALERT.decay * dt);
    }
    if (s.ai !== 'chase' && s.alert >= 1 && seen) { s.ai = 'chase'; s.targetId = seen.unit.id; s.aiTimer = 0; }
    if (s.ai === 'chase') {
      s.speedMul = ALERT.chaseMul;
      if (!seen) s.lostTimer += dt;
      if (s.lostTimer >= ALERT.giveUp) {
        // あきらめて、一番近い巡回点へ戻る
        s.ai = 'return'; s.targetId = null; s.lastSeen = null; s.speedMul = 1; s.alert = Math.min(s.alert, 0.5);
        let bi = 0, bd = Infinity;
        s.route.forEach((w, i) => { const d = Math.hypot(tileCenter(w.tx) - c.x, tileCenter(w.ty) - c.y); if (d < bd) { bd = d; bi = i; } });
        s.routeIdx = bi; applyOrder(sim, s, [s.route[bi]]);
        continue;
      }
      s.aiTimer -= dt;
      if (s.aiTimer <= 0) {
        s.aiTimer = ALERT.repath;
        // 見えている間は相手の場所へ。見失ったら最後に見た場所へ向かって、そこで探す
        if (s.lastSeen && (seen || !s.order)) applyOrder(sim, s, [s.lastSeen]);
      }
      continue;
    }
    s.speedMul = 1;
    if (!s.order) {
      if (s.ai === 'return') s.ai = 'patrol';
      else s.routeIdx = (s.routeIdx + 1) % s.route.length;
      applyOrder(sim, s, [s.route[s.routeIdx]]);
    }
  }
}

function updateRegen(sim, dt) {
  for (const u of sim.units) {
    if (!KINDS[u.kind]?.regen || u.hp >= u.maxHp) continue;
    if (sim.time - u.lastHit < ALERT.regenDelay) continue;
    u.hp = Math.min(u.maxHp, u.hp + u.maxHp * ALERT.regenRate * dt);
  }
}

// 回収と脱出: 止まっている部隊は回収ポイントの近くで資材を集める。脱出口に隊長が入ると届ける。
function updateMission(sim, dt) {
  const m = sim.mission; if (!m) return;
  for (const s of sim.squads) {
    if (s.side !== 'ally') continue;
    s.gathering = null;
    if (!s.order && !s.engaged) {
      for (const p of m.salvage) {
        if (p.amount <= 0) continue;
        const px = tileCenter(p.tx), py = tileCenter(p.ty), r = GATHER_RADIUS * TILE;
        const near = squadUnits(sim, s).filter(u => Math.hypot(u.x - px, u.y - py) <= r);
        if (!near.length) continue;
        const take = Math.min(p.amount, near.reduce((a, u) => a + (KINDS[u.kind]?.gather || 0), 0) * dt);
        if (take <= 0) continue;
        p.amount = Math.max(0, p.amount - take); if (p.amount < 1e-6) p.amount = 0;
        s.cargo += take; s.gathering = p.id;
        break;
      }
    }
    const c = squadCommander(sim, s);
    if (c && s.cargo > 0 && Math.hypot(c.x - tileCenter(m.extraction.tx), c.y - tileCenter(m.extraction.ty)) <= EXTRACT_RADIUS * TILE) {
      m.delivered += s.cargo; s.cargo = 0;
      sim.fx.push({ type: 'deliver', x: c.x, y: c.y, t: sim.time, side: 'ally' });
    }
  }
}

/** ミッションの集計（HUD 用）: 届けた量・運んでいる量・残り時間 */
export function missionStatus(sim) {
  const m = sim.mission; if (!m) return null;
  const carrying = sim.squads.filter(s => s.side === 'ally').reduce((a, s) => a + s.cargo, 0);
  const left = m.salvage.reduce((a, p) => a + p.amount, 0);
  return { delivered: m.delivered, carrying, target: m.target, remaining: Math.max(0, m.timeLimit - sim.time), salvageLeft: left };
}

function updateFog(sim) {
  const f = sim.fog; f.begin();
  const hq = sim.map.hq.ally; f.stamp(hq.tx, hq.ty, 6);
  if (sim.mission) f.stamp(sim.mission.extraction.tx, sim.mission.extraction.ty, 2);
  for (const u of sim.units) if (u.side === 'ally') f.stamp(toTile(u.x), toTile(u.y), u.sight);
  f.commit();
}

function applyCommands(sim) {
  for (const cmd of sim.commands.splice(0)) {
    const s = squadById(sim, cmd.squadId);
    if (s && s.side === 'ally' && cmd.type === 'move') applyOrder(sim, s, cmd.waypoints);
  }
}

/** 一時停止中に命令を出したとき用: 時間を進めずに命令を反映し、経路を最後まで作る（経路の表示のため） */
export function applyCommandsNow(sim) {
  applyCommands(sim);
  for (const s of sim.squads) for (let k = 0; k < 200 && s.order && s.order.planIndex !== s.order.waypoints.length; k++) advancePlanning(sim, s);
}

function checkResult(sim) {
  if (sim.result) return;
  const a = sim.units.some(u => u.side === 'ally');
  if (sim.mission) {
    const m = sim.mission;
    if (m.delivered >= m.target - 1e-6) { sim.result = 'win'; sim.resultReason = 'extracted'; }
    else if (!a) { sim.result = 'lose'; sim.resultReason = 'wiped'; }
    else if (sim.time >= m.timeLimit) { sim.result = 'lose'; sim.resultReason = 'time'; }
    return;
  }
  const e = sim.units.some(u => u.side === 'enemy');
  if (!e) sim.result = 'win'; else if (!a) sim.result = 'lose';
}

/** 1ステップ進める */
export function stepSim(sim) {
  const dt = TICK;
  applyCommands(sim);
  updateEnemyAI(sim, dt);
  updatePatrols(sim, dt);
  updateCombat(sim, dt);
  updateRegen(sim, dt);
  for (const s of sim.squads) updateSquadMovement(sim, s, dt);
  updateMission(sim, dt);
  updateFog(sim);
  sim.fx = sim.fx.filter(f => sim.time - f.t < 0.8);
  sim.tick++; sim.time = sim.tick * TICK;
  checkResult(sim);
}

export function runSim(sim, steps) { for (let i = 0; i < steps; i++) stepSim(sim); return sim; }

/** 状態の要約ハッシュ（同じ seed・同じ命令なら同じ値になることをテストで確かめる） */
export function hashSim(sim) {
  let h = 2166136261 >>> 0;
  const mix = v => { h ^= v & 0xffffffff; h = Math.imul(h, 16777619) >>> 0; };
  mix(sim.tick); mix(sim.rng.state());
  for (const u of sim.units) { mix(u.id); mix(Math.round(u.x * 100)); mix(Math.round(u.y * 100)); mix(Math.round(u.hp * 100)); }
  for (const b of sim.fog.seen) mix(b);
  if (sim.mission) {
    mix(Math.round(sim.mission.delivered * 1000));
    for (const p of sim.mission.salvage) mix(Math.round(p.amount * 1000));
    for (const s of sim.squads) { mix(Math.round(s.cargo * 1000)); mix(Math.round((s.alert || 0) * 1000)); }
  }
  return h.toString(16);
}
