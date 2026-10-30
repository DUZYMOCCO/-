import { ensureTurret } from './turret.js';
import { initInventory } from './inventory.js';
// 世界の生成。createWorld(seed) はプレーンJSONの state を返す。

import { giveCrossbow, CROSSBOW_SKILL, START_BOLTS } from './crossbow.js';
import { rand, randInt, randRange, pick } from './rng.js';
import {
  FACTIONS,
  GUARD_NAMES,
  BANDIT_NAMES,
  COMPANION_NAMES,
  GUARD_NAMES_F,
  BANDIT_NAMES_F,
  sexFor,
  PART_KEYS,
  PART_MAX,
  START_TIME_SEC,
  WEAPON_BY_FACTION,
  TICK_SEC,
} from './data.js';
import { heightAt } from './terrain.js';
import { resolveCircle } from './collide.js';
import { makeKit } from './medkit.js';
import { initSpawn } from './spawning.js';
import { initTown } from './town.js';
import { greenK, GREEN } from '../render/green_plan.js';

function moveOutOfGreen(o) {
  if (greenK(o.x, o.z) < 0.2) return;
  const a0 = Math.atan2(o.z - GREEN.z, o.x - GREEN.x);
  for (let k = 0; k < 8; k += 1) {
  const a = a0 + k * 0.8; // 外が世界の端なら向きを変える
  for (let r = Math.hypot(o.x - GREEN.x, o.z - GREEN.z); r < 140; r += 2) {
    const x = GREEN.x + Math.cos(a) * r, z = GREEN.z + Math.sin(a) * r;
    if (greenK(x, z) < 0.2 && Math.abs(x) < 195 && Math.abs(z) < 195) {
      o.x = Math.round(x * 100) / 100;
      o.z = Math.round(z * 100) / 100;
      return;
    }
  }
  }
}

export const TOWN1 = { id: 'town1', name: '灯守の町', x: -110, z: 60, r: 30 };
export const TOWN2 = { id: 'town2', name: '錆の宿場', x: 120, z: 110, r: 22 };
export const CAMP = { id: 'camp', name: '盗賊の根城', x: 100, z: -90, r: 18 };
export const NEST = { id: 'nest', name: '獣の巣', x: -60, z: -120, r: 14 };

function makeSkills(state, faction) {
  if (faction === 'player') {
    return {
      attack: 1,
      defense: 1,
      toughness: 1,
      strength: 1,
      dexterity: 1,
      athletics: 1,
      stealth: 1,
      assassination: 1,
      medic: 1, // 手当て（Kenshi の Field Medic。medkit.js）
      lockpicking: 1, // 錠前破り（bldg1。locks.js）
      thievery: 1, // 盗み（bldg1。law.js）
    };
  }
  if (faction === 'guard') {
    return {
      attack: randInt(state, 30, 40),
      defense: randInt(state, 30, 40),
      toughness: 30,
      strength: 20,
      dexterity: 20,
      athletics: 20,
      stealth: 10,
      assassination: 3,
    };
  }
  if (faction === 'bandit') {
    return {
      attack: randInt(state, 8, 15),
      defense: randInt(state, 8, 15),
      toughness: 8,
      strength: 22, // ★仮: 大包丁(必要筋力32)を持つので 10 では Kenshi の式で -47% の遅さになる。22 で約 -26%
      dexterity: 10,
      athletics: 10,
      stealth: 8,
      assassination: 5,
    };
  }
  return {
    attack: randInt(state, 20, 25),
    defense: 10,
    toughness: 15,
    strength: 15,
    dexterity: 15,
    athletics: 30,
    stealth: 0,
    assassination: 0,
  };
}

function uniqueName(state, base) {
  const used = new Set((state.actors || []).map((a) => a.name));
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(base + n)) n += 1;
  return base + n;
}

function makeName(state, faction, sex) {
  const f = sex === 'f';
  if (faction === 'guard') return uniqueName(state, '衛兵' + pick(state, f ? GUARD_NAMES_F : GUARD_NAMES));
  if (faction === 'bandit') return uniqueName(state, '盗賊' + pick(state, f ? BANDIT_NAMES_F : BANDIT_NAMES));
  if (faction === 'beast') {
    state.counters.beast += 1;
    return '灰狼' + state.counters.beast;
  }
  return '流れ者';
}

function makeMoney(state, faction) {
  if (faction === 'player') return 500;
  if (faction === 'guard') return 50;
  if (faction === 'bandit') return randInt(state, 20, 60);
  return 0;
}

export function makeActor(state, faction, x, z, squadId, isPlayer) {
  const id = state.nextId;
  state.nextId += 1;
  const scale = faction === 'beast' ? 0.9 : 1;
  const parts = {};
  for (const key of PART_KEYS) {
    const max = Math.round(PART_MAX[key] * scale * 100) / 100;
    parts[key] = { hp: max, max };
  }
  const safe = resolveCircle(state, x, z, faction === 'beast' ? 0.6 : 0.4);
  const sex = sexFor(faction, id, { isPlayer, female: state.femaleNpc !== false });
  const actor = {
    id,
    sex,
    name: makeName(state, faction, sex),
    faction,
    squadId,
    isPlayer: !!isPlayer,
    money: makeMoney(state, faction),
    carryingId: null,
    carriedBy: null,
    carryTargetId: null,
    carryHome: false,
    lootTargetId: null,
    lootTicks: 0,
    lootedBy: [],
    x: Math.round(safe.x * 100) / 100,
    z: Math.round(safe.z * 100) / 100,
    rot: 0,
    parts,
    state: 'idle',
    anim: 'Idle',
    animTick: 0,
    targetId: null,
    moveTo: null,
    attackCd: 0,
    downTicks: 0,
    getupTicks: 0,
    bleed: 0,
    hunger: 80,
    food: faction === 'player' ? 3 : 0,
    kits: faction === 'player' ? [makeKit('basic'), makeKit('basic')] : [], // 救急箱（耐久で減る。medkit.js）
    bedrollItem: faction === 'player' ? 1 : 0, // 持っている寝袋（rest.js）
    movedRun: false,
    movedCarry: false,
    movedThisTick: false,
    movedRunThisTick: false,
    sneaking: false,
    detect: {},
    eye: 'none',
    eyeFrom: null,
    eyeLevel: 0,
    knownTargets: {},
    watchers: [],
    light: 1,
    lantern: false,
    crossbow: null,
    aiming: false,
    lastShotTick: -1000,
    assassinTargetId: null,
    assassinTicks: 0,
    hungerLogTick: -1200,
    assistDepth: null,
    lastAttackerId: null,
    avoidSide: 1,
    stuckTicks: 0,
    fleeUntil: 0,
    fleeLogged: false,
    recoverUntil: 0,
    skills: { ...makeSkills(state, faction), crossbow: CROSSBOW_SKILL[faction] || 0, perception: CROSSBOW_SKILL[faction] || 0, precision: CROSSBOW_SKILL[faction] || 0, turret: ({ guard: 20, bandit: 5, player: 1, beast: 0 })[faction] || 0 },
    weapon: WEAPON_BY_FACTION[faction],
    renderScale: faction === 'beast' ? 0.8 : 1,
  };
  actor.skills.martial = isPlayer ? 1 : actor.skills.attack;
  actor.skills.dodge = isPlayer ? 1 : Math.round((actor.skills.dexterity || 0) * 0.5 + (actor.skills.martial ?? actor.skills.attack ?? 0) * 0.3);
  initInventory(actor);
  state.actors.push(actor);
  return actor;
}

function makeSquad(state, id, faction, home, mode, size, waypoints) {
  const squad = {
    id,
    faction,
    home: { x: home.x, z: home.z },
    mode,
    size,
    waypoints: waypoints.map((p) => ({ x: p.x, z: p.z })),
    wpIndex: 0,
    goal: { x: home.x, z: home.z },
    restUntil: 0,
    memberIds: [],
    followOffsets: [],
    assistNotified: false,
    spawnAt: null,
    index: state.squads.length,
  };
  state.squads.push(squad);
  return squad;
}

export function spawnSquadMembers(state, squad) {
  squad.memberIds = [];
  squad.followOffsets = [];
  for (let i = 0; i < squad.size; i += 1) {
    const ang = 0.9 * i + squad.index * 0.7;
    const ox = Math.round(Math.cos(ang) * 2.4 * 100) / 100;
    const oz = Math.round(Math.sin(ang) * 2.4 * 100) / 100;
    squad.followOffsets.push({ x: ox, z: oz });
    const px = squad.home.x + ox;
    const pz = squad.home.z + oz;
    const actor = makeActor(state, squad.faction, px, pz, squad.id, false);
    // 衛兵は各隊の2人目、盗賊は各隊の3人目がクロスボウを持つ（乱数を使わず決める）。
    if ((squad.faction === 'guard' && i === 1) || (squad.faction === 'bandit' && i === 2)) {
      giveCrossbow(actor, START_BOLTS[squad.faction]);
    }
    squad.memberIds.push(actor.id);
  }
  squad.wpIndex = 0;
  squad.goal = { x: squad.home.x, z: squad.home.z };
  squad.restUntil = 0;
  squad.assistNotified = false;
  squad.spawnAt = null;
}

function buildRoad() {
  const points = [];
  const ax = TOWN1.x;
  const az = TOWN1.z;
  const bx = TOWN2.x;
  const bz = TOWN2.z;
  const steps = 24;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    points.push({
      x: Math.round((ax + (bx - ax) * t) * 100) / 100,
      z: Math.round((az + (bz - az) * t) * 100) / 100,
    });
  }
  return points;
}

function distanceToSegment(px, pz, a, b) {
  const vx = b.x - a.x;
  const vz = b.z - a.z;
  const wx = px - a.x;
  const wz = pz - a.z;
  const len2 = vx * vx + vz * vz;
  let t = len2 > 0 ? (wx * vx + wz * vz) / len2 : 0;
  if (t < 0) t = 0;
  if (t > 1) t = 1;
  const dx = px - (a.x + vx * t);
  const dz = pz - (a.z + vz * t);
  return Math.sqrt(dx * dx + dz * dz);
}

function distanceToRoad(px, pz, road) {
  let best = Infinity;
  for (let i = 0; i < road.length - 1; i += 1) {
    const d = distanceToSegment(px, pz, road[i], road[i + 1]);
    if (d < best) best = d;
  }
  return best;
}

function buildBuildings(state) {
  const out = [];
  const towns = [
    { place: TOWN1, count: randInt(state, 6, 8) },
    { place: TOWN2, count: randInt(state, 4, 5) },
  ];
  for (const entry of towns) {
    const p = entry.place;
    for (let i = 0; i < entry.count; i += 1) {
      const ang = randRange(state, 0, Math.PI * 2);
      const rad = randRange(state, 5, p.r - 8);
      const w = Math.round(randRange(state, 5, 10) * 10) / 10;
      const d = Math.round(randRange(state, 5, 10) * 10) / 10;
      const h = Math.round(randRange(state, 3, 7) * 10) / 10;
      out.push({
        x: Math.round((p.x + Math.cos(ang) * rad) * 100) / 100,
        z: Math.round((p.z + Math.sin(ang) * rad) * 100) / 100,
        w,
        d,
        h,
        kind: 'town',
      });
    }
  }
  out.push({
    x: CAMP.x - 3,
    z: CAMP.z - 2,
    w: 8,
    d: 7,
    h: 3.4,
    kind: 'camp',
  });
  out.push({
    x: CAMP.x + 5,
    z: CAMP.z + 4,
    w: 6,
    d: 6,
    h: 2.8,
    kind: 'camp',
  });
  for (let i = 0; i < 8; i += 1) {
    const ang = (i / 8) * Math.PI * 2;
    out.push({
      x: Math.round((CAMP.x + Math.cos(ang) * 13) * 100) / 100,
      z: Math.round((CAMP.z + Math.sin(ang) * 13) * 100) / 100,
      w: 4,
      d: 0.5,
      h: 0.9,
      kind: 'fence',
    });
  }
  return out;
}

function buildRocks(state, road) {
  const rocks = [];
  let guard = 0;
  while (rocks.length < 90 && guard < 6000) {
    guard += 1;
    const x = randRange(state, -195, 195);
    const z = randRange(state, -195, 195);
    let ok = true;
    for (const p of [TOWN1, TOWN2, CAMP, NEST]) {
      const dx = x - p.x;
      const dz = z - p.z;
      if (Math.sqrt(dx * dx + dz * dz) < p.r + 5) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    if (distanceToRoad(x, z, road) < 6) continue;
    rocks.push({
      x: Math.round(x * 100) / 100,
      z: Math.round(z * 100) / 100,
      r: Math.round(randRange(state, 0.6, 3) * 100) / 100,
    });
  }
  return rocks;
}

function buildProps(state, road, rocks, buildings) {
  const props = [];
  const occupied = [];
  for (const rock of rocks) {
    occupied.push({ x: rock.x, z: rock.z, rad: rock.r });
  }
  for (const item of buildings) {
    occupied.push({
      x: item.x,
      z: item.z,
      rad: Math.hypot(item.w / 2, item.d / 2),
    });
  }

  function nearPlace(x, z) {
    for (const p of [TOWN1, TOWN2, CAMP, NEST]) {
      const dx = x - p.x;
      const dz = z - p.z;
      if (Math.sqrt(dx * dx + dz * dz) < p.r + 5) return true;
    }
    return false;
  }

  function fits(x, z, rad) {
    if (x < -195 || x > 195 || z < -195 || z > 195) return false;
    if (nearPlace(x, z)) return false;
    if (distanceToRoad(x, z, road) < 6) return false;
    for (const o of occupied) {
      if (Math.hypot(x - o.x, z - o.z) < o.rad + rad + 1) return false;
    }
    return true;
  }

  function add(prop, rad) {
    props.push(prop);
    occupied.push({ x: prop.x, z: prop.z, rad });
  }

  let treeCount = 0;
  let guard = 0;
  while (treeCount < 40 && guard < 40000) {
    guard += 1;
    const x = randRange(state, -195, 195);
    const z = randRange(state, -195, 195);
    const h = Math.round(randRange(state, 3, 6) * 100) / 100;
    const rot = Math.round(randRange(state, 0, Math.PI * 2) * 1000) / 1000;
    if (!fits(x, z, 0.45)) continue;
    add(
      {
        kind: 'tree',
        x: Math.round(x * 100) / 100,
        z: Math.round(z * 100) / 100,
        r: 0.45,
        h,
        rot,
      },
      0.45
    );
    treeCount += 1;
  }

  let ruinCount = 0;
  let clusterGuard = 0;
  while (ruinCount < 12 && clusterGuard < 40) {
    clusterGuard += 1;
    let ax = 0;
    let az = 0;
    let anchorOk = false;
    for (let t = 0; t < 600; t += 1) {
      const x = randRange(state, -195, 195);
      const z = randRange(state, -195, 195);
      if (!fits(x, z, 8)) continue;
      ax = x;
      az = z;
      anchorOk = true;
      break;
    }
    if (!anchorOk) continue;
    let inCluster = 0;
    let attempts = 0;
    while (inCluster < 3 && ruinCount < 12 && attempts < 80) {
      attempts += 1;
      const ang = randRange(state, 0, Math.PI * 2);
      const rad = randRange(state, 0, 6);
      const x = ax + Math.cos(ang) * rad;
      const z = az + Math.sin(ang) * rad;
      const w = Math.round(randRange(state, 4, 9) * 10) / 10;
      const d = Math.round(randRange(state, 4, 9) * 10) / 10;
      const h = Math.round(randRange(state, 1, 3.5) * 10) / 10;
      const br = Math.hypot(w / 2, d / 2);
      if (!fits(x, z, br)) continue;
      add(
        {
          kind: 'ruin',
          x: Math.round(x * 100) / 100,
          z: Math.round(z * 100) / 100,
          w,
          d,
          h,
          rot: 0,
        },
        br
      );
      inCluster += 1;
      ruinCount += 1;
    }
  }

  return props;
}

export function createWorld(seed, opts) {
  const options = opts || {};
  let s = Math.floor(Number(seed));
  if (!Number.isFinite(s)) s = 12345;
  s = s | 0;
  if (s === 0) s = 1;

  const state = {
    version: 1,
    seed: s,
    rngState: (s ^ 0x9e3779b9) | 0,
    tick: 0,
    timeSec: START_TIME_SEC,
    nextId: 1,
    playerId: null,
    squadIds: [],
    counters: { guard: 0, bandit: 0, beast: 0 },
    places: {
      town1: { ...TOWN1 },
      town2: { ...TOWN2 },
      camp: { ...CAMP },
      nest: { ...NEST },
    },
    buildings: [],
    rocks: [],
    props: [],
    roads: [],
    actors: [],
    squads: [],
    relations: { guard_player: 'neutral' },
    rep: {}, // 勢力ごとの仲（-100〜100。medkit.js の healRep）
    bedrolls: [], // 敷いた寝袋（rest.js）
    bedrollSeq: 0,
    commandQueue: [],
    log: [],
    raidCooldowns: {},
    spawnQueue: [],
    gameOver: false,
    projectiles: [],
    nextBoltId: 1,
    femaleNpc: options.female !== false, // ?female=0 で女性の人形なし（全員男）
  };

  // 乱数の初期撹拌
  rand(state);
  rand(state);
  rand(state);

  const road = buildRoad();
  state.roads = road;
  state.buildings = buildBuildings(state);
  state.rocks = buildRocks(state, road);
  state.props = buildProps(state, road, state.rocks, state.buildings);
  // 翠緑の盆地の中の荒野の岩・枯れ木は、数を変えずに盆地の外側へ押し出す（乱数の順も変えない）
  for (const r of state.rocks) moveOutOfGreen(r);
  for (const p of state.props) if (p.kind === 'tree') moveOutOfGreen(p);

  const mid = { x: 5, z: 85 };
  const farRoad = { x: 105, z: 106 };

  const g1 = makeSquad(state, 'guard1', 'guard', TOWN1, 'patrol', 4, [
    { x: TOWN1.x, z: TOWN1.z },
    mid,
    farRoad,
    { x: 60, z: -40 },
  ]);
  const g2 = makeSquad(state, 'guard2', 'guard', TOWN1, 'patrol', 4, [
    { x: TOWN1.x, z: TOWN1.z },
    { x: -40, z: 72 },
    { x: 60, z: -40 },
    mid,
  ]);
  const b1 = makeSquad(state, 'bandit1', 'bandit', CAMP, 'wander', 5, []);
  const b2 = makeSquad(state, 'bandit2', 'bandit', CAMP, 'wander', 5, []);
  const e1 = makeSquad(state, 'beast1', 'beast', NEST, 'wander', 4, []);
  const e2 = makeSquad(state, 'beast2', 'beast', NEST, 'wander', 4, []);

  for (const sq of [g1, g2, b1, b2, e1, e2]) spawnSquadMembers(state, sq);

  const player = makeActor(state, 'player', -80, 55, null, true);
  player.state = 'idle';
  state.playerId = player.id;

  const companionPos = resolveCircle(state, player.x + 2, player.z, 0.4);
  const companion = makeActor(state, 'player', companionPos.x, companionPos.z, null, false);
  companion.name = uniqueName(state, pick(state, COMPANION_NAMES));
  companion.sex = sexFor('player', companion.id, { companion: true }); // 仲間の名前はみな女性名
  companion.money = 100;
  companion.state = 'idle';
  state.squadIds = [player.id, companion.id];
  // 開始の設定: 仲間がクロスボウを持って始める（初期は持つ）。
  if (options.companionCrossbow !== false) giveCrossbow(companion, START_BOLTS.player);
  // 入れる小屋・扉・錠・住人（bldg1）。opts.town が true の時だけ（既定は無し＝前と同じ世界）。乱数の列は変えない。
  if (options.town) initTown(state);
  // ランダム出現（隊商・盗賊・野盗・野営地・獣の巣）。opts.spawn が true の時だけ（既定は無し＝前と同じ世界）。
  if (options.spawn) initSpawn(state, { spawnRate: options.spawnRate });

  ensureTurret(state, true);
  return state;
}

export function groundHeight(x, z) {
  return heightAt(x, z);
}

export { TICK_SEC, FACTIONS };
