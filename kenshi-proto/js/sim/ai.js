// 部隊の巡回・うろつき、索敵、加勢、目標選び、出現の補充。

import {
  FACTIONS,
  VISION,
  WEAPONS,
  ATTACK_SLOT_LIMIT,
  RESPAWN_TICKS,
  CORPSE_LIMIT,
  ACTOR_LIMIT,
  RAID_COOLDOWN_TICKS,
  TICK_SEC,
  WORLD_HALF,
  isHostile,
  distBetween,
  indexActors,
  countTargeters,
  setAnim,
  makeEvent,
} from './data.js';
import { rand, randInt, randRange, chance } from './rng.js';
import { spawnSquadMembers, CAMP, NEST } from './world.js';

const TAU = Math.PI * 2;

function clampWorld(v) {
  if (v < -WORLD_HALF + 1) return -WORLD_HALF + 1;
  if (v > WORLD_HALF - 1) return WORLD_HALF - 1;
  return v;
}

function leaderOf(squad, byId) {
  for (const id of squad.memberIds) {
    const actor = byId.get(id);
    if (actor && actor.state !== 'dead') return actor;
  }
  return null;
}

function pickWanderGoal(state, squad) {
  if (squad.faction === 'bandit') {
    const r = rand(state);
    let goal;
    if (r < 0.35) {
      goal = { x: CAMP.x + randRange(state, -35, 35), z: CAMP.z + randRange(state, -35, 35) };
    } else if (r < 0.56) {
      goal = { x: 70 + randRange(state, -15, 15), z: -45 + randRange(state, -20, 20) };
    } else if (r < 0.7) {
      goal = { x: 110 + randRange(state, -15, 15), z: 72 + randRange(state, -25, 25) };
    } else if (r < 0.82) {
      goal = { x: 5 + randRange(state, -30, 30), z: 85 + randRange(state, -25, 25) };
    } else if (r < 0.92) {
      goal = { x: -70 + randRange(state, -20, 20), z: 55 + randRange(state, -20, 20) };
    } else {
      goal = { x: 118 + randRange(state, -15, 15), z: 100 + randRange(state, -12, 12) };
    }
    return { x: clampWorld(goal.x), z: clampWorld(goal.z) };
  }

  const far = chance(state, 0.25);
  const ang = randRange(state, 0, TAU);
  const rad = far ? randRange(state, 100, 150) : randRange(state, 8, 60);
  return {
    x: clampWorld(NEST.x + Math.cos(ang) * rad),
    z: clampWorld(NEST.z + Math.sin(ang) * rad),
  };
}

export function updateSquadGoals(state) {
  const byId = indexActors(state);
  for (const squad of state.squads) {
    const leader = leaderOf(squad, byId);
    if (!leader) continue;
    if (squad.mode === 'patrol' && squad.waypoints.length > 0) {
      const wp = squad.waypoints[squad.wpIndex % squad.waypoints.length];
      const d = Math.hypot(wp.x - leader.x, wp.z - leader.z);
      if (d < 6) {
        squad.wpIndex = (squad.wpIndex + 1) % squad.waypoints.length;
      }
      const next = squad.waypoints[squad.wpIndex % squad.waypoints.length];
      squad.goal = { x: next.x, z: next.z };
    } else {
      const d = Math.hypot(squad.goal.x - leader.x, squad.goal.z - leader.z);
      if (d < 6 && state.tick >= squad.restUntil) {
        squad.goal = pickWanderGoal(state, squad);
        squad.restUntil = state.tick + randInt(state, 200, 600);
      }
    }
  }
}

function maybeRaid(state, a, b, events) {
  if (!a.squadId || !b.squadId) return;
  if (a.squadId === b.squadId) return;
  if (a.isPlayer || b.isPlayer) return;
  const key =
    a.squadId < b.squadId ? a.squadId + '|' + b.squadId : b.squadId + '|' + a.squadId;
  const last = state.raidCooldowns[key];
  if (typeof last === 'number' && state.tick - last < RAID_COOLDOWN_TICKS) return;
  state.raidCooldowns[key] = state.tick;
  events.push(
    makeEvent(
      state,
      'raid',
      FACTIONS[a.faction].name + 'が' + FACTIONS[b.faction].name + 'を襲った'
    )
  );
}

function bestTarget(state, actor) {
  const vision = VISION[actor.faction] || 14;
  let best = null;
  let bestScore = Infinity;
  for (const other of state.actors) {
    if (other.id === actor.id) continue;
    if (!isHostile(state, actor.faction, other.faction)) continue;
    if (other.state === 'dead') continue;
    if ((other.state === 'down' || other.state === 'getup') && actor.faction !== 'beast') {
      continue;
    }
    const d = distBetween(actor, other);
    if (d > vision) continue;
    if (countTargeters(state, other.id, actor.id) >= ATTACK_SLOT_LIMIT) continue;
    let score = d;
    if (other.id === actor.lastAttackerId) score -= 1000;
    if (score < bestScore || (score === bestScore && best && other.id < best.id)) {
      best = other;
      bestScore = score;
    }
  }
  return best;
}

function detectEnemies(state, events) {
  for (const actor of state.actors) {
    if (actor.isPlayer) continue;
    if (actor.state === 'dead' || actor.state === 'down' || actor.state === 'getup') continue;
    if (actor.targetId !== null) continue;
    const target = bestTarget(state, actor);
    if (!target) continue;
    actor.targetId = target.id;
    actor.state = 'fight';
    maybeRaid(state, actor, target, events);
  }
}

function chooseTargets(state, events) {
  for (const actor of state.actors) {
    if (actor.isPlayer) continue;
    if (actor.state !== 'fight') continue;
    if (actor.targetId !== null) continue;
    const target = bestTarget(state, actor);
    if (target) {
      actor.targetId = target.id;
      maybeRaid(state, actor, target, events);
    } else {
      actor.state = 'idle';
    }
  }
}

export function updateAI(state, events) {
  updateSquadGoals(state);
  if (state.tick % 5 === 0) detectEnemies(state, events);
  chooseTargets(state, events);
}

function legFactor(actor) {
  let bad = 0;
  if (actor.parts.lLeg.hp <= 0) bad += 1;
  if (actor.parts.rLeg.hp <= 0) bad += 1;
  if (bad >= 2) return 0.3;
  if (bad === 1) return 0.6;
  return 1;
}

function runSpeed(actor) {
  if (actor.faction === 'beast') return 5;
  return 3.5 + actor.skills.athletics * 0.02;
}

function squadDest(state, actor, squad, leader, byId) {
  if (squad.memberIds[0] === actor.id) return squad.goal;
  if (leader && leader.state !== 'dead') {
    const idx = squad.memberIds.indexOf(actor.id);
    const off = squad.followOffsets[idx] || { x: 0, z: 0 };
    return { x: leader.x + off.x, z: leader.z + off.z };
  }
  return squad.goal;
}

function arriveRadius(actor) {
  if (actor.targetId !== null) return 0;
  if (actor.moveTo) return 0.3;
  return 0.8;
}

function moveActor(state, actor, byId, squadsById) {
  const target = actor.targetId !== null ? byId.get(actor.targetId) : null;
  const weaponRange = WEAPONS[actor.weapon].range;
  if (target && target.state !== 'dead') {
    const d = distBetween(actor, target);
    const downTarget = target.state === 'down' || target.state === 'getup';
    if (downTarget && actor.faction !== 'beast' && !actor.isPlayer) {
      actor.targetId = null;
      actor.state = 'idle';
    } else if (d > 30 && !actor.isPlayer) {
      actor.targetId = null;
      actor.state = 'idle';
    } else if (d > weaponRange * 0.9) {
      stepToward(state, actor, target.x, target.z, true);
    } else {
      faceTarget(actor, target);
      actor.state = 'fight';
      setAnim(actor, 'Idle', state.tick);
    }
    return;
  }
  if (actor.targetId !== null) {
    actor.targetId = null;
  }

  let dest = null;
  if (actor.moveTo) {
    dest = actor.moveTo;
  } else if (actor.squadId) {
    const squad = squadsById.get(actor.squadId);
    if (squad) {
      const leader = leaderOf(squad, byId);
      dest = squadDest(state, actor, squad, leader, byId);
    }
  }
  if (!dest) {
    if (actor.state !== 'down' && actor.state !== 'getup') {
      actor.state = 'idle';
      setAnim(actor, 'Idle', state.tick);
    }
    return;
  }
  const radius = arriveRadius(actor);
  const d = Math.hypot(dest.x - actor.x, dest.z - actor.z);
  if (d <= radius) {
    if (actor.moveTo) actor.moveTo = null;
    if (actor.targetId === null && actor.state !== 'down' && actor.state !== 'getup') {
      actor.state = 'idle';
      setAnim(actor, 'Idle', state.tick);
    }
    return;
  }
  stepToward(state, actor, dest.x, dest.z, d >= 15);
  if (actor.moveTo && d <= 0.5) actor.moveTo = null;
}

function faceTarget(actor, target) {
  const dx = target.x - actor.x;
  const dz = target.z - actor.z;
  if (dx * dx + dz * dz > 0.0001) actor.rot = Math.atan2(dx, dz);
}

function stepToward(state, actor, tx, tz, running) {
  const dx = tx - actor.x;
  const dz = tz - actor.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.0001) return;
  const speed = (running ? runSpeed(actor) : 1.6) * legFactor(actor);
  const stepLen = Math.min(d, speed * TICK_SEC);
  actor.x = clampWorld(actor.x + (dx / d) * stepLen);
  actor.z = clampWorld(actor.z + (dz / d) * stepLen);
  actor.rot = Math.atan2(dx, dz);
  actor.state = 'move';
  setAnim(actor, running ? 'Run' : 'Walk', state.tick);
}

function separate(state) {
  const cell = 1.5;
  const grid = new Map();
  const list = [];
  for (const actor of state.actors) {
    if (actor.state === 'dead') continue;
    list.push(actor);
    const key = Math.floor(actor.x / cell) + ',' + Math.floor(actor.z / cell);
    let bucket = grid.get(key);
    if (!bucket) {
      bucket = [];
      grid.set(key, bucket);
    }
    bucket.push(actor);
  }
  for (const a of list) {
    const cx = Math.floor(a.x / cell);
    const cz = Math.floor(a.z / cell);
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dz = -1; dz <= 1; dz += 1) {
        const bucket = grid.get(cx + dx + ',' + (cz + dz));
        if (!bucket) continue;
        for (const b of bucket) {
          if (b.id <= a.id) continue;
          const ddx = b.x - a.x;
          const ddz = b.z - a.z;
          const d2 = ddx * ddx + ddz * ddz;
          if (d2 >= 0.64 || d2 <= 0.000001) continue;
          const d = Math.sqrt(d2);
          const push = (0.8 - d) * 0.5;
          const nx = ddx / d;
          const nz = ddz / d;
          a.x = clampWorld(a.x - nx * push);
          a.z = clampWorld(a.z - nz * push);
          b.x = clampWorld(b.x + nx * push);
          b.z = clampWorld(b.z + nz * push);
        }
      }
    }
  }
}

export function moveActors(state) {
  const byId = indexActors(state);
  const squadsById = new Map();
  for (const squad of state.squads) squadsById.set(squad.id, squad);
  for (const actor of state.actors) {
    if (actor.state === 'dead' || actor.state === 'down' || actor.state === 'getup') continue;
    moveActor(state, actor, byId, squadsById);
  }
  separate(state);
}

export function updateSpawns(state, events) {
  const byId = indexActors(state);
  for (const squad of state.squads) {
    if (squad.spawnAt !== null) continue;
    if (squad.memberIds.length === 0) continue;
    let allDead = true;
    for (const id of squad.memberIds) {
      const actor = byId.get(id);
      if (actor && actor.state !== 'dead') {
        allDead = false;
        break;
      }
    }
    if (allDead) squad.spawnAt = state.tick + RESPAWN_TICKS;
  }
  for (const squad of state.squads) {
    if (squad.spawnAt === null) continue;
    if (state.tick < squad.spawnAt) continue;
    if (state.actors.length + squad.size > ACTOR_LIMIT) {
      squad.spawnAt = state.tick + 200;
      continue;
    }
    spawnSquadMembers(state, squad);
    events.push(
      makeEvent(state, 'spawn', '新しい' + FACTIONS[squad.faction].name + 'の一団が現れた')
    );
  }

  const deadIds = [];
  for (const actor of state.actors) {
    if (actor.state === 'dead' && !actor.isPlayer) deadIds.push(actor.id);
  }
  if (deadIds.length > CORPSE_LIMIT) {
    const remove = new Set();
    const extra = deadIds.length - CORPSE_LIMIT;
    for (let i = 0; i < extra; i += 1) remove.add(deadIds[i]);
    state.actors = state.actors.filter((actor) => !remove.has(actor.id));
  }
}
