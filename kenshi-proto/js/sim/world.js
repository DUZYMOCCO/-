// 世界の生成。createWorld(seed) はプレーンJSONの state を返す。

import { rand, randInt, randRange, pick } from './rng.js';
import {
  FACTIONS,
  GUARD_NAMES,
  BANDIT_NAMES,
  PART_KEYS,
  PART_MAX,
  START_TIME_SEC,
  WEAPON_BY_FACTION,
  TICK_SEC,
} from './data.js';
import { heightAt } from './terrain.js';

export const TOWN1 = { id: 'town1', name: '灯守の町', x: -110, z: 60, r: 30 };
export const TOWN2 = { id: 'town2', name: '錆の宿場', x: 120, z: 110, r: 22 };
export const CAMP = { id: 'camp', name: '盗賊の根城', x: 100, z: -90, r: 18 };
export const NEST = { id: 'nest', name: '獣の巣', x: -60, z: -120, r: 14 };

function makeSkills(state, faction) {
  if (faction === 'player') {
    return { attack: 1, defense: 1, toughness: 1, strength: 1, dexterity: 1, athletics: 1 };
  }
  if (faction === 'guard') {
    return {
      attack: randInt(state, 30, 40),
      defense: randInt(state, 30, 40),
      toughness: 30,
      strength: 20,
      dexterity: 20,
      athletics: 20,
    };
  }
  if (faction === 'bandit') {
    return {
      attack: randInt(state, 8, 15),
      defense: randInt(state, 8, 15),
      toughness: 8,
      strength: 10,
      dexterity: 10,
      athletics: 10,
    };
  }
  return {
    attack: randInt(state, 20, 25),
    defense: 10,
    toughness: 15,
    strength: 15,
    dexterity: 15,
    athletics: 30,
  };
}

function uniqueName(state, base) {
  const used = new Set((state.actors || []).map((a) => a.name));
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(base + n)) n += 1;
  return base + n;
}

function makeName(state, faction) {
  if (faction === 'guard') return uniqueName(state, '衛兵' + pick(state, GUARD_NAMES));
  if (faction === 'bandit') return uniqueName(state, '盗賊' + pick(state, BANDIT_NAMES));
  if (faction === 'beast') {
    state.counters.beast += 1;
    return '灰狼' + state.counters.beast;
  }
  return '流れ者';
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
  const actor = {
    id,
    name: makeName(state, faction),
    faction,
    squadId,
    isPlayer: !!isPlayer,
    x: Math.round(x * 100) / 100,
    z: Math.round(z * 100) / 100,
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
    assistDepth: null,
    lastAttackerId: null,
    skills: makeSkills(state, faction),
    weapon: WEAPON_BY_FACTION[faction],
    renderScale: faction === 'beast' ? 0.8 : 1,
  };
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
  while (rocks.length < 60 && guard < 4000) {
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

export function createWorld(seed) {
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
    counters: { guard: 0, bandit: 0, beast: 0 },
    places: {
      town1: { ...TOWN1 },
      town2: { ...TOWN2 },
      camp: { ...CAMP },
      nest: { ...NEST },
    },
    buildings: [],
    rocks: [],
    roads: [],
    actors: [],
    squads: [],
    relations: { guard_player: 'neutral' },
    commandQueue: [],
    log: [],
    raidCooldowns: {},
    spawnQueue: [],
    gameOver: false,
  };

  // 乱数の初期撹拌
  rand(state);
  rand(state);
  rand(state);

  const road = buildRoad();
  state.roads = road;
  state.buildings = buildBuildings(state);
  state.rocks = buildRocks(state, road);

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

  return state;
}

export function groundHeight(x, z) {
  return heightAt(x, z);
}

export { TICK_SEC, FACTIONS };
