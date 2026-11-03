import { playerOrderKind, waitingAfterOrder, holdBeforeFollow, updateOrderHold, autoEngageBlocked } from './orders.js';
import { clampWorldX, clampWorldZ } from './world_bounds.js';
import { encumbranceFromLoad, loadRatio } from './inventory.js';
import { prostheticFor, prostheticLegFactor } from './prosthetics.js';
import { turretSeat } from './turret.js';
import { getSquadOfMember, DEFAULT_SQUAD_AI } from './squads.js';
import { startTask, abductGoal } from './abduct.js';
import { gripOf, reconcileGrip, pickupDroppedWeapon, fastestMeleeWeapon } from './grip.js';
// 荷重と担ぎのうち強い方の速度低下を適用する。荷重は上限なく増え、速度は下限まで落ちる。
export const MIN_LOAD_SPEED = 0.1;
export function movementLoadMultiplier(ratio, carrying) {
  const slowed = Math.max(MIN_LOAD_SPEED, 1 - 0.85 * encumbranceFromLoad(ratio));
  return Math.min(carrying ? 0.6 : 1, slowed);
}
// 部隊の巡回・うろつき、索敵、加勢、目標選び、出現の補充。
import {
  beastRules,
  canHarmDowned,
  downedHarmKind,
  FACTIONS,
  WEAPONS,
  RESPAWN_TICKS,
  CORPSE_LIMIT,
  ACTOR_LIMIT,
  RAID_COOLDOWN_TICKS,
  TICK_SEC,
  isHostile as factionHostile,
  distBetween,
  indexActors,
  setAnim,
  makeEvent,
} from './data.js';
import { rand, randInt, randRange, chance } from './rng.js';
import { spawnSquadMembers, CAMP, NEST } from './world.js';
import { resolveCircle, blockedAt, blockingNormal, blockedBySettlementDecorAt, actorRadius } from './collide.js';
import { nearestClearPoint } from './move_recovery.js';
import { updateCompanionCarry, syncCarried } from './carry.js';
import { updateLootGoals, lootBodyTarget } from './loot.js';
import { canSee, effectiveStealth } from './stealth.js';
import { avoidKnownTrapStep } from './traps.js';
import { rangedMode, CROSSBOW, crossbowRange, thrownMode, thrownRange, canThrow } from './crossbow.js';
import { restPlace, stopRest } from './rest.js';
import { houseAt, navPoint, townHold, townMove } from './town.js';
import { actorFloor, actorWorldY, floorHeightOffset, houseRoofFloor } from './floors.js';
import { floorRouteForActors } from './roof_path.js';
import { heightAt } from './terrain.js';
import { lawHostile } from './law.js';
import { buildMove } from './build.js';
import { raceOf, factionRaceAttitude, raceBase } from './races.js';
import { actorOwner } from './faction_relations.js';
import { walkableAt, slopeAt, cachedWalkableAt } from './walkable.js';
import { createPathSearch, PATHFIND } from './pathfind.js';
import {
  attackSlotsFor,
  assignedWaitAngle,
  compareActorIds,
  clearJoinForTarget,
  clearWaitAssignment,
  isRecentCounter,
  joinDelayTicks,
  joinForTarget,
  meleeSlotHolders,
  rangedForTarget,
  rangedRoom,
  setJoinForTarget,
  SURROUND,
  waitRingRadius,
} from './surround.js';
import { investigationTarget } from './sneakshot.js';
import { isShopNeutralPair } from './shops.js';

function aiHostile(state, actor, other) {
  if (other?.shopCrime && (actor?.faction === 'player' || actor?.jobs?.primary === 'guard' || actor?.jobs?.secondary === 'guard')) return true;
  if (actor?.shopCrime && (other?.faction === 'player' || other?.jobs?.primary === 'guard' || other?.jobs?.secondary === 'guard')) return true;
  if (isShopNeutralPair(state, actor, other)) return false;
  if (actor?.shopBrawlHouse && actor.shopBrawlHouse === other?.shopBrawlHouse && (actor.shopBrawlId === other.id || other.shopBrawlId === actor.id)) return true;
  return factionHostile(state, actor, other);
}

const TAU = Math.PI * 2;
const actorPaths = new WeakMap();
let pathBudgetState = null;
let pathBudgetTick = -1;
let pathBudgetRemaining = PATHFIND.tickTotalNodeBudget;
let pathActorContext = null;

function resetPathBudget(state) {
  if (pathBudgetState === state && pathBudgetTick === state.tick) return;
  pathBudgetState = state;
  pathBudgetTick = state.tick;
  pathBudgetRemaining = PATHFIND.tickTotalNodeBudget;
  pathActorContext = null;
}

export function resetActorPath(actor) {
  if (actor && typeof actor === 'object') actorPaths.delete(actor);
}

// UI callers may display the current route without owning or mutating pathfinding state.
export function actorRoute(actor) {
  const path = actor && typeof actor === 'object' ? actorPaths.get(actor) : null;
  if (!path || !Array.isArray(path.points)) return null;
  return { points: path.points.slice(path.index || 0).map((point) => ({ x: point.x, z: point.z })), reachedGoal: !!path.reachedGoal };
}

function lineWalkable(ax, az, bx, bz, step = 2) {
  const length = Math.hypot(bx - ax, bz - az);
  const count = Math.max(1, Math.ceil(length / step));
  for (let i = 0; i <= count; i += 1) {
    const t = i / count;
    if (!walkableAt(ax + (bx - ax) * t, az + (bz - az) * t)) return false;
  }
  return true;
}

// The straight line toward the target is only checked over a short horizon and
// the answer is reused for a few ticks, so long walks over open ground stay cheap.
const STRAIGHT_HORIZON = 160;
const STRAIGHT_RECHECK_TICKS = 20;
const straightChecks = new WeakMap();

function straightAhead(state, actor, tx, tz, d) {
  const last = straightChecks.get(actor);
  if (
    last &&
    state.tick - last.tick < STRAIGHT_RECHECK_TICKS &&
    state.tick >= last.tick &&
    Math.hypot(tx - last.tx, tz - last.tz) < 8
  ) {
    return last.ok;
  }
  const reach = Math.min(d, STRAIGHT_HORIZON);
  const ex = actor.x + ((tx - actor.x) / d) * reach;
  const ez = actor.z + ((tz - actor.z) / d) * reach;
  let ok = lineWalkable(actor.x, actor.z, ex, ez);
  if (ok) {
    // Check only the next 24m against the nearby 8m collision grid. Farther
    // obstacles are checked as the actor approaches, keeping open-world paths cheap.
    const obstacleReach = Math.min(reach, 24);
    const count = Math.max(1, Math.ceil(obstacleReach));
    const radius = actorRadius(actor);
    // Town patrols check house walls too; other actors keep the cheaper decor-only check.
    const patrol = !!state.town && !!actor.squadId && state.squads?.some((squad) => squad.id === actor.squadId && squad.mode === 'patrol');
    const blocked = patrol ? blockedAt : blockedBySettlementDecorAt;
    for (let i = 1; i <= count; i += 1) {
      const t = Math.min(1, i / obstacleReach);
      if (blocked(state, actor.x + ((tx - actor.x) / d) * obstacleReach * t, actor.z + ((tz - actor.z) / d) * obstacleReach * t, radius, actor)) {
        ok = false;
        break;
      }
    }
  }
  straightChecks.set(actor, { tick: state.tick, tx, tz, ok });
  return ok;
}

// Grid sizes for route searches, fine to coarse. A search that keeps ending
// short of the goal is tried again on a coarser grid, which looks farther.
const PATH_CELLS = [4, 8, 12, 16, 24, 32];

function beginActorPath(state, actor, gx, gz, d, previous = null) {
  const first = d > 2500 ? 2 : d > 800 ? 1 : 0;
  const level = Math.max(first, previous ? previous.level : 0);
  // Long orders start on a coarse but still slope-checked grid so a 4,000 node
  // search can see around broad terrain features instead of exhausting itself
  // in a narrow patch beside the actor.
  const cell = Math.max(d > 250 ? 32 : 16, PATH_CELLS[Math.min(level, PATH_CELLS.length - 1)]);
  return {
    gx,
    gz,
    level,
    bestGoalDistance: previous ? previous.bestGoalDistance : Infinity,
    stalls: previous ? previous.stalls : 0,
    searchStart: { x: actor.x, z: actor.z },
    search: createPathSearch((x, z) =>
      cachedWalkableAt(x, z) && !blockedAt(state, x, z, actorRadius(actor), actor),
    actor.x, actor.z, gx, gz, {
      cell,
      lineSampleStep: 0.5,
      searchSampleStep: 2,
      maxNodes: PATHFIND.maxNodes,
    }),
    points: null,
    index: 0,
    reachedGoal: false,
    lastAdvanceTick: -1,
    lastProgressTick: state.tick,
    lastWaypointDistance: null,
    lastActorX: actor.x,
    lastActorZ: actor.z,
    retryAt: 0,
    done: false,
  };
}

function failActorPathSearch(state, actor, path) {
  path.search = null;
  path.previewActive = false;
  path.retryAt = state.tick + 1;
  if (path.level < PATH_CELLS.length - 1) path.level += 1;
  else path.stalls += 1;
  if (path.stalls < 2) return false;
  path.done = true;
  if (actor.moveTo && Math.hypot(actor.moveTo.x - path.gx, actor.moveTo.z - path.gz) < 8) actor.moveTo = null;
  actor.state = 'idle';
  setAnim(actor, 'Idle', state.tick);
  return true;
}

function advanceActorPath(state, actor, path) {
  if (!path.search) return;
  const previewEnded = !!path.previewActive && !!path.points &&
    (path.index >= path.points.length || Math.hypot(
      path.points.at(-1).x - actor.x,
      path.points.at(-1).z - actor.z
    ) <= 1.5);
  if (path.search.done && path.previewActive && !previewEnded) return;
  if (!path.search.done && path.lastAdvanceTick !== state.tick) {
    resetPathBudget(state);
    const context = pathActorContext && pathActorContext.actor === actor ? pathActorContext : null;
    const slots = context ? context.slots : 1;
    const fairShare = Math.floor(pathBudgetRemaining / Math.max(1, slots));
    const quota = Math.min(PATHFIND.tickNodeBudget, fairShare);
    if (quota <= 0) return;
    const used = path.search.advance(quota);
    pathBudgetRemaining = Math.max(0, pathBudgetRemaining - used);
    path.lastAdvanceTick = state.tick;
  }
  const result = path.search.result();
  if (!result.ok || result.points.length < 2) {
    if (path.search.done) failActorPathSearch(state, actor, path);
    return;
  }
  const endpoint = result.points.at(-1);
  const searchStart = path.searchStart;
  const progress = Math.hypot(endpoint.x - searchStart.x, endpoint.z - searchStart.z);
  const startGoalDistance = Math.hypot(path.gx - searchStart.x, path.gz - searchStart.z);
  const endGoalDistance = Math.hypot(path.gx - endpoint.x, path.gz - endpoint.z);
  const useful = progress >= 8 && endGoalDistance < startGoalDistance - 4;
  if (!useful && !result.reachedGoal) {
    if (path.search.done) failActorPathSearch(state, actor, path);
    return;
  }

  if (path.previewActive && !previewEnded) return;
  // A continuing search can reveal a longer preview after the actor reaches
  // its current endpoint. Keep the route cursor moving forward within that
  // same search instead of snapping to an earlier, nearby leg.
  let nextIndex = path.previewActive && path.points ? Math.min(path.index, result.points.length - 1) : 0;
  let nearest = Infinity;
  for (let i = nextIndex; i < result.points.length; i += 1) {
    const point = result.points[i];
    const distance = Math.hypot(point.x - actor.x, point.z - actor.z);
    if (distance < nearest - 0.001 || (Math.abs(distance - nearest) <= 0.001 && i > nextIndex)) {
      nearest = distance;
      nextIndex = i;
    }
  }
  while (nextIndex < result.points.length - 1 && !lineWalkable(actor.x, actor.z,
    result.points[nextIndex].x, result.points[nextIndex].z)) nextIndex += 1;
  if (nextIndex >= result.points.length - 1 || !lineWalkable(actor.x, actor.z,
    result.points[nextIndex].x, result.points[nextIndex].z)) {
    if (path.search.done) failActorPathSearch(state, actor, path);
    return;
  }
  path.points = result.points;
  path.index = nextIndex;
  path.reachedGoal = !!result.reachedGoal;
  path.lastProgressTick = state.tick;
  path.lastWaypointDistance = null;
  path.previewActive = !path.search.done && !result.reachedGoal;
  if (path.search.done || result.reachedGoal) path.search = null;
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
    return { x: clampWorldX(goal.x), z: clampWorldZ(goal.z) };
  }

  const far = chance(state, 0.25);
  const ang = randRange(state, 0, TAU);
  const rad = far ? randRange(state, 100, 150) : randRange(state, 8, 60);
  return {
    x: clampWorldX(NEST.x + Math.cos(ang) * rad),
    z: clampWorldZ(NEST.z + Math.sin(ang) * rad),
  };
}

export function updateSquadGoals(state) {
  const byId = indexActors(state);
  for (const squad of state.squads) {
    if (squad.kind) continue; // ランダム出現の部隊は spawning.js が動かす
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

// 通行料を要求中・払った後の野盗と、こちらの一行は、先に手を出されない限り斬り合わない。
function holdsPeace(actor, other) {
  if (actor.holdFire && other.faction === 'player') return other.id !== actor.lastAttackerId;
  if (other.holdFire && actor.faction === 'player') return other.lastAttackerId !== actor.id;
  return false;
}

// 種族を理由に見つけ次第襲う相手か（盗賊・機械は「見つけ次第攻撃」「狩って売る」、衛兵は「見つけ次第攻撃」だけ）
export function raceHostileOnSight(state, actor, other) {
  if (!(state.squadIds || [state.playerId]).includes(other.id)) return false;
  let raceFaction = null;
  let kinds = RACE_RAID;
  if (actor.machine) raceFaction = 'ancient_automatons';
  else if (actor.faction === 'bandit') raceFaction = actor.ownerFaction || 'dust_bandits';
  else if (actor.faction === 'guard') { raceFaction = actor.ownerFaction || actorOwner(actor); kinds = RACE_GUARD; }
  if (!raceFaction) return false;
  return kinds.includes(factionRaceAttitude(raceFaction, raceBase(other.race || 'haimin').id).treatment);
}
const RACE_RAID = ['見つけ次第攻撃', '狩って売る'];
const RACE_GUARD = ['見つけ次第攻撃'];

function bestTarget(state, actor) {
  if (actor.abduct) {
    actor.waitTargetId = null;
    return null;
  }
  // 町人（店主・住人）は自分から戦わない
  if (actor.civil) return null;
  // 食べている者は周りを見ない（殴られたら abduct.js が食事を止めて相手を向かせる）
  if (actor.eatingId !== null && actor.eatingId !== undefined) {
    actor.waitTargetId = null;
    return null;
  }
  if (actor.returning) {
    actor.waitTargetId = null;
    return null;
  }
  let best = null;
  let bestScore = Infinity;
  let full = null; // 枠が埋まっていて斬れない相手（一番近い者）
  let fullD = Infinity;
  for (const other of state.actors) {
    if (other.id === actor.id) continue;
    const hostileRace = other.faction === 'player' && raceHostileOnSight(state, actor, other);
    if (!aiHostile(state, actor, other) && !(state.law && lawHostile(state, actor, other)) && !hostileRace) continue;
    if (other.state === 'dead') continue;
    if ((actor.holdFire || other.holdFire) && holdsPeace(actor, other)) continue;
    if (actor.leash && Math.hypot(other.x - actor.leash.x, other.z - actor.leash.z) > actor.leash.r) continue;
    if (other.state === 'down' || other.state === 'getup') {
      // 意識があるまま倒れている（投げられた）だけなら、そのまま狙い続ける
      if (!other.knocked && !canHarmDowned(downedHarmKind(actor, other))) continue;
    }
    if ((other.recoverUntil || 0) > state.tick && other.id !== actor.lastAttackerId) {
      continue;
    }
    if (!canSee(state, actor, other)) continue;
    const d = distBetween(actor, other);
    const ranged = rangedForTarget(actor, other);
    const surroundProtected = actor.isPlayer || actor.holdGround || actor.blockStance || actor.martialPair || actor.carryingId != null || actor.abduct || actor.eatingId != null || actor.task;
    if (!surroundProtected && ranged && !isRecentCounter(state, actor, other.id) && !rangedRoom(state, actor, other)) {
      // 射手: この相手を狙う数が上限なら、ほかの敵を探す（いなければ離れて待つ）
      if (!full || d < fullD || (d === fullD && other.id < full.id)) {
        full = other;
        fullD = d;
      }
      continue;
    }
    if (!surroundProtected && !ranged && !isRecentCounter(state, actor, other.id)) {
      const holders = meleeSlotHolders(state, other.id, actor.id);
      const join = joinForTarget(state, other.id);
      const joining = join && join.actorId !== actor.id && !holders.some((holder) => holder.id === join.actorId) ? 1 : 0;
      if (holders.length + joining >= attackSlotsFor(state, other)) {
        if (d <= waitRingRadius(state, actor, other) + SURROUND.waitStopExtra) {
          if (!full || d < fullD || (d === fullD && other.id < full.id)) {
            full = other;
            fullD = d;
          }
          continue;
        }
      }
    }
    let score = d;
    if (other.id === actor.lastAttackerId) score -= 1000;
    if (other.taunt) score -= 500;
    if (score < bestScore || (score === bestScore && best && compareActorIds(other.id, best.id) < 0)) {
      best = other;
      bestScore = score;
    }
  }
  // 斬れる相手がいなければ、埋まっている相手の周りで待つ
  actor.waitTargetId = best ? null : full ? full.id : null;
  return best;
}

function detectEnemies(state, events) {
  for (const actor of state.actors) {
    if (actor.martialPair || (actor.martialDemoPassiveUntil || 0) > state.tick) continue;
    if (actor.carryingId !== null) continue;
    if (actor.state === 'dead' || actor.state === 'down' || actor.state === 'getup') continue;
    if ((actor.fleeUntil || 0) > state.tick) continue;
    if (actor.abduct) {
      actor.waitTargetId = null;
      actor.targetId = null;
      actor.swing = null;
      if (actor.state === 'fight') actor.state = 'idle';
      continue;
    }
    if (actor.targetId !== null) continue;
    if (actor.waitTargetId !== null && actor.waitTargetId !== undefined) continue;
    if (underMoveOrder(state, actor)) continue;
    if (underPlayerTask(state, actor)) {
      const attacker = actor.stance === 'passive' ? null : ownAttacker(state, actor);
      if (attacker) { actor.targetId = attacker.id; actor.state = 'fight'; }
      continue;
    }

    if (inSquad(state, actor)) {
      if (actor.stance === 'passive') continue;

      // 護衛（bodyguard）: 護衛対象が攻撃されたら、その攻撃者を迎撃
      if (actor.order === 'bodyguard' || actor.guardTargetId != null) {
        const guardedId = actor.guardTargetId != null ? actor.guardTargetId : actor.followTargetId;
        const guarded = state.actors.find((a) => a.id === guardedId);
        if (guarded && guarded.lastAttackerId) {
          const attacker = state.actors.find((a) => a.id === guarded.lastAttackerId);
          if (
            attacker &&
            attacker.state !== 'dead' &&
            attacker.state !== 'down' &&
            attacker.state !== 'getup' &&
            aiHostile(state, actor, attacker)
          ) {
            actor.targetId = attacker.id;
            actor.state = 'fight';
            continue;
          }
        }
      }

      const sq = getSquadOfMember(state, actor.id);
      const sqAi = sq ? sq.ai : (state.squadAi || DEFAULT_SQUAD_AI);
      const isAggro = actor.stance === 'aggressive' || !!sqAi.attackOnSight;

      if (!isAggro && actor.stance === 'defensive') {
        let found = false;
        if (actor.lastAttackerId) {
          const attacker = state.actors.find((a) => a.id === actor.lastAttackerId);
          if (
            attacker &&
            attacker.state !== 'dead' &&
            attacker.state !== 'down' &&
            attacker.state !== 'getup' &&
            aiHostile(state, actor, attacker)
          ) {
            actor.targetId = attacker.id;
            actor.state = 'fight';
            found = true;
          }
        }
        // helpAllies: 部隊内の味方が攻撃されていれば救援
        if (!found && sqAi.helpAllies !== false) {
          const allies = sq && Array.isArray(sq.memberIds) && sq.memberIds.length > 0 ? sq.memberIds : (state.squadIds || []);
          for (const aid of allies) {
            if (aid === actor.id) continue;
            const ally = state.actors.find((a) => a.id === aid);
            if (ally && ally.lastAttackerId) {
              const attacker = state.actors.find((a) => a.id === ally.lastAttackerId);
              if (
                attacker &&
                attacker.state !== 'dead' &&
                attacker.state !== 'down' &&
                attacker.state !== 'getup' &&
                aiHostile(state, actor, attacker)
              ) {
                actor.targetId = attacker.id;
                actor.state = 'fight';
                found = true;
                break;
              }
            }
          }
        }
        if (!found) continue;
      }
    } else if (actor.isPlayer) {
      continue;
    }

    const target = bestTarget(state, actor);
    if (!target) {
      if (actor.waitTargetId !== null) actor.state = 'fight';
      continue;
    }
    actor.targetId = target.id;
    actor.state = 'fight';
    maybeRaid(state, actor, target, events);
  }
}

function chooseTargets(state, events) {
  for (const actor of state.actors) {
    if (actor.martialPair || (actor.martialDemoPassiveUntil || 0) > state.tick) continue;
    if (actor.carryingId !== null) {
      actor.targetId = null;
      if (actor.state === 'fight') actor.state = 'idle';
      continue;
    }
    if (actor.state !== 'fight') continue;
    if (actor.targetId !== null) continue;
    if (actor.waitTargetId !== null && actor.waitTargetId !== undefined) continue;
    if (underMoveOrder(state, actor)) continue;
    if (underPlayerTask(state, actor)) {
      const attacker = actor.stance === 'passive' ? null : ownAttacker(state, actor);
      if (attacker) actor.targetId = attacker.id;
      else actor.state = 'move';
      continue;
    }

    if (inSquad(state, actor)) {
      if (actor.stance === 'passive') {
        actor.state = 'idle';
        continue;
      }

      // 護衛（bodyguard）
      if (actor.order === 'bodyguard' || actor.guardTargetId != null) {
        const guardedId = actor.guardTargetId != null ? actor.guardTargetId : actor.followTargetId;
        const guarded = state.actors.find((a) => a.id === guardedId);
        if (guarded && guarded.lastAttackerId) {
          const attacker = state.actors.find((a) => a.id === guarded.lastAttackerId);
          if (
            attacker &&
            attacker.state !== 'dead' &&
            attacker.state !== 'down' &&
            attacker.state !== 'getup' &&
            aiHostile(state, actor, attacker)
          ) {
            actor.targetId = attacker.id;
            continue;
          }
        }
      }

      const sq = getSquadOfMember(state, actor.id);
      const sqAi = sq ? sq.ai : (state.squadAi || DEFAULT_SQUAD_AI);
      const isAggro = actor.stance === 'aggressive' || !!sqAi.attackOnSight;

      if (!isAggro && actor.stance === 'defensive') {
        let found = false;
        if (actor.lastAttackerId) {
          const attacker = state.actors.find((a) => a.id === actor.lastAttackerId);
          if (
            attacker &&
            attacker.state !== 'dead' &&
            attacker.state !== 'down' &&
            attacker.state !== 'getup' &&
            aiHostile(state, actor, attacker)
          ) {
            actor.targetId = attacker.id;
            found = true;
          }
        }
        if (!found && sqAi.helpAllies !== false) {
          const allies = sq && Array.isArray(sq.memberIds) && sq.memberIds.length > 0 ? sq.memberIds : (state.squadIds || []);
          for (const aid of allies) {
            if (aid === actor.id) continue;
            const ally = state.actors.find((a) => a.id === aid);
            if (ally && ally.lastAttackerId) {
              const attacker = state.actors.find((a) => a.id === ally.lastAttackerId);
              if (
                attacker &&
                attacker.state !== 'dead' &&
                attacker.state !== 'down' &&
                attacker.state !== 'getup' &&
                aiHostile(state, actor, attacker)
              ) {
                actor.targetId = attacker.id;
                found = true;
                break;
              }
            }
          }
        }
        if (!found) {
          actor.state = 'idle';
          continue;
        }
      }
    } else if (actor.isPlayer) {
      continue;
    }

    const target = bestTarget(state, actor);
    if (target) {
      actor.targetId = target.id;
      maybeRaid(state, actor, target, events);
    } else if (actor.waitTargetId === null) {
      actor.state = 'idle';
    }
  }
}

function updateSquadAutonomous(state) {
  if (!Array.isArray(state.squadIds) || state.squadIds.length === 0) return;
  for (const aid of state.squadIds) {
    const actor = state.actors.find((a) => a.id === aid);
    if (!actor || actor.martialPair || actor.state === 'dead' || actor.state === 'down' || actor.state === 'getup') continue;
    if (actor.targetId !== null || actor.task !== null || actor.moveTo !== null || actor.carryingId !== null) continue;
    if (actor.lootBodyId != null || (actor.carryTargetId != null && actor.carryOrdered) || actor.townTask) continue; // プレイヤーの命令の途中は自動の手当てで上書きしない
    if (playerOrderKind(state, actor) !== null || waitingAfterOrder(actor)) continue; // 命令中・命令の直後（待ち時間）も始めない（orders.js）

    const sq = getSquadOfMember(state, actor.id);
    const sqAi = sq ? sq.ai : (state.squadAi || DEFAULT_SQUAD_AI);

    // healAllies: 手当ての道具を持ち、部隊内の出血している味方を自動手当て
    if (sqAi && sqAi.healAllies !== false) {
      const hasKit = (Array.isArray(actor.kits) && actor.kits.length > 0) || (actor.medkit > 0);
      if (hasKit) {
        const memberIds = sq && sq.memberIds && sq.memberIds.length > 0 ? sq.memberIds : state.squadIds;
        for (const mid of memberIds) {
          if (mid === actor.id) continue;
          const ally = state.actors.find((a) => a.id === mid);
          if (ally && ally.state !== 'dead' && typeof ally.bleed === 'number' && ally.bleed > 0) {
            const d = distBetween(actor, ally);
            if (d <= 30) {
              if (startTask(state, actor, 'treat', ally)) actor.task.auto = true; // 自動の手当て（命令ではない）
              break;
            }
          }
        }
      }
    }
  }
}

export function updateAI(state, events) {
  updateOrderHold(state);
  for (const actor of state.actors) {
    if (actor.state === 'dead') continue;
    const now = gripOf(actor);
    const prior = actor.gripState ?? now;
    reconcileGrip(state, actor, events);
    if (prior !== now) {
      actor.gripState = now;
      if (now !== 'none' && actor.weapon !== 'bite') {
        const candidates = (actor.equip?.weapon || []).filter(x => x && WEAPONS[x.id] && !x.id.includes('crossbow'));
        candidates.push(...(actor.inv || []).filter(x => x && WEAPONS[x.id] && !x.id.includes('crossbow')));
        if (actor.weapon !== 'fists' && WEAPONS[actor.weapon]) candidates.push({id:actor.weapon});
        const best = fastestMeleeWeapon(actor,candidates.map(x=>x.id));
        if (best) {
          const slot = actor.equip?.weapon || (actor.equip ||= {}).weapon || ((actor.equip.weapon = [null,null]));
          if (!slot.some(x=>x?.id===best)) {
            const invIndex=(actor.inv||[]).findIndex(x=>x.id===best);
            if (invIndex>=0) {
              let at=slot.findIndex(x=>x?.id===actor.weapon); if(at<0)at=slot.findIndex(x=>!x); if(at<0)at=0;
              if(slot[at]) (actor.inv ||= []).push(slot[at]);
              slot[at]=actor.inv.splice(invIndex,1)[0];
            }
          }
          actor.weapon = best;
        }
      }
    }
    pickupDroppedWeapon(state, actor);
  }
  updateSquadGoals(state);
  updateLootGoals(state);
  updateCompanionCarry(state);
  updateSquadAutonomous(state);
  claimWaitSlots(state);
  if (state.tick % 5 === 0) detectEnemies(state, events);
  chooseTargets(state, events);
}

export function legFactor(actor) {
  // 義足は欠損分の這い補正を解消する。木製・鉄製の速度差は別に掛ける。
  const lost = ['lLeg', 'rLeg'].filter((key) => actor.missing?.includes(key) && !prostheticFor(actor, key)).length;
  if (lost >= 2) return 0.12 * prostheticLegFactor(actor);
  if (lost === 1) return 0.35 * prostheticLegFactor(actor);
  let factor = 1;
  let bad = 0;
  if (actor.parts.lLeg.hp <= 0 && !actor.missing?.includes('lLeg')) bad += 1;
  if (actor.parts.rLeg.hp <= 0 && !actor.missing?.includes('rLeg')) bad += 1;
  if (bad >= 2) factor = 0.3;
  else if (bad === 1) factor = 0.6;
  return factor * prostheticLegFactor(actor);
}

export function movementSpeedFactors(actor, carrying, tick) {
  return {
    leg: legFactor(actor),
    load: movementLoadMultiplier(loadRatio(actor), carrying),
    daze: (actor.dazeUntil || 0) > tick ? 0.5 : 1,
  };
}

export function runSpeed(actor) {
  const weak = typeof actor.hunger === 'number' && actor.hunger < 100 * 2 / 3
    ? 0.7 + 0.3 * Math.max(0, actor.hunger) / (100 * 2 / 3) : 1;
  const raceSpeed = raceOf(actor)?.runSpeed ?? 1;
  if (beastRules(actor)) return actor.crawling ? 0.45 : 5 * weak * raceSpeed;
  return actor.crawling ? 0.45 : (3.5 + actor.skills.athletics * 0.02) * weak * raceSpeed;
}

export function walkSpeed(actor, base = 1.6) {
  return actor.crawling ? Math.min(0.45, base * 0.28) : base * (raceOf(actor)?.runSpeed ?? 1);
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

function fleeMove(state, actor, byId) {
  actor.targetId = null;
  const home = actor.spawnHome || (actor.faction === 'beast' ? NEST : CAMP);
  let nearest = null;
  let nearestDist = Infinity;
  for (const other of state.actors) {
    if (other.id === actor.id || other.state === 'dead') continue;
    if (!aiHostile(state, actor, other)) continue;
    const d = distBetween(actor, other);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = other;
    }
  }
  let dirX = 0;
  let dirZ = 0;
  if (nearest) {
    const dx = actor.x - nearest.x;
    const dz = actor.z - nearest.z;
    const d = Math.hypot(dx, dz) || 1;
    dirX = dx / d;
    dirZ = dz / d;
  }
  const hx = home.x - actor.x;
  const hz = home.z - actor.z;
  const hd = Math.hypot(hx, hz) || 1;
  dirX = dirX * 0.85 + (hx / hd) * 0.15;
  dirZ = dirZ * 0.85 + (hz / hd) * 0.15;
  const len = Math.hypot(dirX, dirZ) || 1;
  dirX /= len;
  dirZ /= len;
  stepToward(state, actor, actor.x + dirX * 30, actor.z + dirZ * 30, true, false);
}

function inSquad(state, actor) {
  return actor.faction === 'player' && !!state.squadIds && state.squadIds.includes(actor.id);
}

// 戦闘中でも、プレイヤーの移動命令は自動の交戦より優先する（着くか攻撃命令が出るまで狙い直さない）
function underMoveOrder(state, actor) {
  return actor.moveTo != null && inSquad(state, actor);
}

// プレイヤーが出した作業の命令（あさる・担ぐ・手当て・縄ほどき・町の扉/錠前/盗み/スリ）の途中。
// 自動の交戦（見つけた敵・味方の救援・護衛）では上書きしない。自分が攻撃された時の反撃だけは今までどおり割り込む
// 命令の直後の待ち時間（orders.js AUTO_RESUME_TICKS）も同じ扱い: 見つけた敵へ自分から行かず、殴ってきた相手にだけ反撃する
function underPlayerTask(state, actor) {
  if (!inSquad(state, actor)) return false;
  if (playerOrderKind(state, actor) === 'task' || autoEngageBlocked(state, actor)) {
    actor.waitTargetId = null;
    return true;
  }
  return false;
}

// 作業の途中で自分を殴ってきた相手（倒れていない敵）
function ownAttacker(state, actor) {
  if (!actor.lastAttackerId) return null;
  const attacker = state.actors.find((a) => a.id === actor.lastAttackerId);
  if (!attacker || attacker.state === 'dead' || attacker.state === 'down' || attacker.state === 'getup') return null;
  return aiHostile(state, actor, attacker) ? attacker : null;
}

function isCompanion(state, actor) {
  return !!state.squadIds && state.squadIds.length > 1 && state.squadIds[1] === actor.id;
}

function companionDest(state, actor, byId) {
  if (!inSquad(state, actor)) return null;
  if (actor.order === 'hold') {
    if (actor.holdAt) return actor.holdAt;
    return null;
  }
  if (actor.holdAt) {
    if (actor.id === state.playerId && actor.followTargetId == null) actor.holdAt = null;
    else return actor.holdAt; // 個別に動かした仲間はそこで待つ
  }
  // 命令（移動・あさる・手当てなど）を終えた直後は、すぐ付いて戻らずその場で待つ（orders.js の AUTO_RESUME_TICKS）
  if (holdBeforeFollow(actor)) return null;
  let player = null;
  const targetIdToFollow = actor.guardTargetId != null ? actor.guardTargetId : actor.followTargetId;
  if (targetIdToFollow != null) {
    player = byId.get(targetIdToFollow);
  }
  if (!player || player.id === actor.id || player.state === 'dead') {
    if (actor.id !== state.playerId) {
      player = byId.get(state.playerId);
    } else {
      return null;
    }
  }
  if (!player || player.id === actor.id) return null;
  if (actor.carryingId === player.id) return null;
  if (player.state === 'dead') return null;
  if (player.state === 'down' || player.state === 'getup') {
    return {
      x: player.x + Math.cos(player.rot) * 1.5,
      z: player.z - Math.sin(player.rot) * 1.5,
    };
  }

  const dx = actor.x - player.x;
  const dz = actor.z - player.z;
  const dist = Math.hypot(dx, dz);
  const faceX = Math.sin(player.rot);
  const faceZ = Math.cos(player.rot);
  const ahead = dx * faceX + dz * faceZ;
  if (dist < 4.5 && ahead > 0.2) {
    const rightX = Math.cos(player.rot);
    const rightZ = -Math.sin(player.rot);
    const side = dx * rightX + dz * rightZ >= 0 ? 1 : -1;
    return {
      x: player.x + rightX * 2.5 * side,
      z: player.z + rightZ * 2.5 * side,
    };
  }

  return {
    x: player.x - faceX * 2.5,
    z: player.z - faceZ * 2.5,
  };
}

// ---- 近接の立ち回り ----

function combatStunned(state, actor) {
  return (actor.flinchUntil || 0) > state.tick || (actor.staggerUntil || 0) > state.tick;
}

function combatBusy(state, actor) {
  return !!actor.swing || (actor.blockUntil || 0) > state.tick || combatStunned(state, actor) || (actor.dazeUntil || 0) > state.tick;
}

function idHash(id) {
  const str = String(id);
  let h = 0;
  for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// 横歩きの向き: 約2.5秒ごとに 右 / 止まる / 左 / 止まる を繰り返す（人ごとにずらす）
function sideStepPhase(state, actor) {
  const p = (Math.floor(state.tick / 25) + idHash(actor.id)) % 4;
  return p === 0 ? 1 : p === 2 ? -1 : 0;
}

// 相手の周りの半径 radius の円の上を、角度 angStep だけ歩いて回る（0 なら半径だけ合わせる）
function strafe(state, actor, center, radius, angStep) {
  const ang = Math.atan2(actor.x - center.x, actor.z - center.z) + angStep;
  const tx = center.x + Math.sin(ang) * radius;
  const tz = center.z + Math.cos(ang) * radius;
  if (Math.hypot(tx - actor.x, tz - actor.z) < 0.02) return;
  stepToward(state, actor, tx, tz, false);
}

function signedAngleDelta(from, to) {
  let d = (to - from) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

// 攻撃枠の者どうしが同じ側に重ならないよう、近い角度にいる相手から回り離れる向きを返す（0 = そのまま）
const HOLDER_MIN_SEP = 1.1; // rad（約63°）
const HOLDER_MIN_GAP = 1.0; // 間合いの中では、これより近い仲間からだけ回り離れる
function holderSpreadSign(state, actor, target, minGap = 0, onlyOther = null) {
  const myAng = Math.atan2(actor.x - target.x, actor.z - target.z);
  let worst = null;
  for (const other of state.actors) {
    if (other === actor || other.targetId !== target.id || other.state === 'dead') continue;
    if (other.state === 'down' || other.state === 'getup' || rangedForTarget(other, target)) continue;
    const reach = (WEAPONS[other.weapon] || WEAPONS.fists).range + SURROUND.holdExtra;
    if (distBetween(other, target) > reach) continue;
    const delta = signedAngleDelta(Math.atan2(other.x - target.x, other.z - target.z), myAng);
    if (Math.abs(delta) >= HOLDER_MIN_SEP) continue;
    if (minGap > 0 && distBetween(actor, other) >= minGap) continue;
    if (onlyOther && !onlyOther(other)) continue;
    if (!worst || Math.abs(delta) < Math.abs(worst.delta)) worst = { delta, other };
  }
  if (!worst) return 0;
  if (Math.abs(worst.delta) > 1e-6) return worst.delta > 0 ? 1 : -1;
  return compareActorIds(actor.id, worst.other.id) > 0 ? 1 : -1;
}

function moveWaiterOnRing(state, actor, target) {
  const ring = waitRingRadius(state, actor, target);
  const d = distBetween(actor, target);
  const currentAngle = d > 0.001 ? Math.atan2(actor.x - target.x, actor.z - target.z) : (actor.surroundAssignedAngle || 0);
  const assigned = assignedWaitAngle(state, actor, target);
  const wobble = sideStepPhase(state, actor) * SURROUND.waitWobble;
  const desired = assigned == null ? currentAngle : assigned + wobble;
  const turn = Math.max(-SURROUND.maxAngleStep, Math.min(SURROUND.maxAngleStep, signedAngleDelta(currentAngle, desired)));
  const nextAngle = currentAngle + turn;
  const tx = target.x + Math.sin(nextAngle) * ring;
  const tz = target.z + Math.cos(nextAngle) * ring;
  if (Math.abs(d - ring) < 0.18 && Math.abs(turn) < 0.012) return;
  stepToward(state, actor, tx, tz, Math.abs(d - ring) > 1.0);
}

function waitTargetValid(state, actor, wt) {
  if (!wt || wt.state === 'dead') return false;
  if (wt.state === 'down' || wt.state === 'getup') return false;
  if (!aiHostile(state, actor, wt) && !(state.law && lawHostile(state, actor, wt))) return false;
  if (actor.carryingId !== null) return false;
  return distBetween(actor, wt) <= 30;
}

function clearWaitTarget(actor) {
  actor.waitTargetId = null;
  clearWaitAssignment(actor);
}

function canWaitForTarget(state, actor) {
  return !actor.isPlayer && !actor.holdGround && !actor.blockStance && !actor.martialPair &&
    actor.carryingId == null && !actor.abduct && actor.eatingId == null && !actor.task &&
    !underMoveOrder(state, actor) && !underPlayerTask(state, actor) &&
    playerOrderKind(state, actor) === null && !autoEngageBlocked(state, actor);
}

function validWaiter(state, actor, target) {
  return actor && target && actor.waitTargetId === target.id && actor.targetId == null &&
    actor.state !== 'dead' && actor.state !== 'down' && actor.state !== 'getup' &&
    !actor.martialPair && actor.carryingId == null && canWaitForTarget(state, actor) &&
    waitTargetValid(state, actor, target) && !rangedForTarget(actor, target);
}

// 空いた枠は近い待ち手から一人だけ選び、決定的な短い待ち時間を置く。
function claimWaitSlots(state) {
  const byId = new Map(state.actors.map((a) => [a.id, a]));
  for (const actor of state.actors) {
    if (actor.martialPair) continue;
    if (actor.waitTargetId === null || actor.waitTargetId === undefined) continue;
    if (actor.targetId !== null || underMoveOrder(state, actor) || underPlayerTask(state, actor)) {
      clearWaitTarget(actor);
      continue;
    }
    const wt = byId.get(actor.waitTargetId);
    if (!waitTargetValid(state, actor, wt) || actor.state === 'down' || actor.state === 'dead') {
      clearWaitTarget(actor);
      continue;
    }
    if (!canWaitForTarget(state, actor)) {
      clearWaitTarget(actor);
      continue;
    }
    if ((rangedForTarget(actor, wt) && rangedRoom(state, actor, wt)) || isRecentCounter(state, actor, wt.id)) {
      actor.targetId = wt.id;
      clearWaitTarget(actor);
      actor.state = 'fight';
    }
  }

  const targets = new Map();
  for (const actor of state.actors) {
    if (actor.waitTargetId == null) continue;
    const target = byId.get(actor.waitTargetId);
    if (!validWaiter(state, actor, target)) continue;
    if (!targets.has(target.id)) targets.set(target.id, target);
  }
  for (const [targetKey, join] of Object.entries(state.surroundJoins || {})) {
    const target = state.actors.find((actor) => String(actor.id) === targetKey);
    const actor = byId.get(join.actorId);
    const expectedState = join.joining
      ? actor?.targetId === target?.id && actor?.waitTargetId == null
      : actor?.targetId == null && actor?.waitTargetId === target?.id;
    if (!target || target.state === 'dead' || !actor || !expectedState ||
        actor.state === 'dead' || actor.state === 'down' || actor.state === 'getup' ||
        !canWaitForTarget(state, actor) || rangedForTarget(actor, target)) {
      clearJoinForTarget(state, targetKey);
    }
  }
  for (const target of targets.values()) {
    const holders = meleeSlotHolders(state, target.id);
    if (holders.length >= attackSlotsFor(state, target)) {
      const join = joinForTarget(state, target.id);
      if (join) {
        const actor = byId.get(join.actorId);
        if (actor && actor.targetId === target.id && !holders.some((holder) => holder.id === actor.id)) {
          actor.targetId = null;
          actor.waitTargetId = target.id;
          actor.swing = null;
          clearWaitAssignment(actor);
        }
        clearJoinForTarget(state, target.id);
      }
      continue;
    }

    let join = joinForTarget(state, target.id);
    if (join) {
      const actor = byId.get(join.actorId);
      const expectedState = join.joining
        ? actor?.targetId === target.id && actor?.waitTargetId == null
        : actor?.targetId == null && actor?.waitTargetId === target.id;
      if (!actor || !expectedState ||
          actor.state === 'dead' || actor.state === 'down' || actor.state === 'getup' ||
          !canWaitForTarget(state, actor) || rangedForTarget(actor, target)) {
        clearJoinForTarget(state, target.id);
        join = null;
      } else if (holders.some((holder) => holder.id === actor.id)) {
        clearJoinForTarget(state, target.id);
        continue;
      }
      if (join) continue;
    }

    const waiters = state.actors.filter((actor) => validWaiter(state, actor, target));
    waiters.sort((a, b) => distBetween(a, target) - distBetween(b, target) || compareActorIds(a.id, b.id));
    const candidate = waiters[0];
    if (!candidate) continue;
    // 枠はすぐ押さえる（狙いは付く）が、踏み込むのは dueTick まで待ってから。
    // 待つ間は輪の上の自分の位置に留まり、振らない（surroundHoldUntil）。
    const openedTick = state.tick;
    const dueTick = openedTick + joinDelayTicks(state, target.id, candidate.id, openedTick);
    setJoinForTarget(state, target.id, {
      actorId: candidate.id,
      openedTick,
      dueTick,
      joining: true,
    });
    candidate.targetId = target.id;
    candidate.waitTargetId = null;
    candidate.surroundHoldUntil = dueTick;
    candidate.state = 'fight';
  }
}

function moveActor(state, actor, byId, squadsById) {
  // 町（bldg1）: 牢・錠前破り・作業中は動かない
  if (state.town && townHold(state, actor)) return;
  if (actor.sneakshotInvestigation && actor.targetId != null) actor.sneakshotInvestigation = null;
  if (actor.sneakshotInvestigation) {
    const goal = investigationTarget(state, actor);
    const d = Math.hypot(goal.x - actor.x, goal.z - actor.z);
    if (d > 0.45) stepToward(state, actor, goal.x, goal.z, false);
    else {
      actor.state = 'idle';
      setAnim(actor, 'Idle', state.tick);
    }
    return;
  }
  // Active dialogue movement has priority over settlement patrol destinations.
  if (actor.dialogueIntent?.target && actor.targetId == null && !actor.task && !actor.resting) {
    const goal = actor.dialogueIntent.target;
    if (Math.hypot(goal.x - actor.x, goal.z - actor.z) > 1.1) {
      stepToward(state, actor, goal.x, goal.z, actor.dialogueIntent.mode === 'pursue' || actor.dialogueIntent.speed >= 3);
      return;
    }
    if (actor.dialogueIntent.mode !== 'return') return;
    actor.dialogueIntent = null;
  }
  // 寝袋で休んでいる者は動かない（命令・戦い・寝袋から離れると rest.js がやめさせる）
  if (actor.resting) {
    if (actor.targetId === null && actor.state === 'idle' && restPlace(state, actor) !== 'ground') {
      actor.moveTo = null;
      setAnim(actor, 'Sleep', state.tick);
      return;
    }
    stopRest(actor);
  }
  if ((actor.fleeUntil || 0) > state.tick) {
    fleeMove(state, actor, byId);
    return;
  }
  if (inSquad(state, actor) && actor.stance === 'passive') {
    const hasHostile = state.actors.some((o) => o.id !== actor.id && o.state !== 'dead' && o.state !== 'down' && aiHostile(state, actor, o) && distBetween(actor, o) <= 15);
    if (hasHostile || actor.targetId !== null) {
      actor.targetId = null;
      if (actor.state === 'fight') actor.state = 'idle';
      fleeMove(state, actor, byId);
      return;
    }
  }
  // 縄張りから出すぎた巣・野営地の住人は、走って戻る（spawning.js の updateLeash）
  if (actor.returning && actor.leash) {
    actor.targetId = null;
    if (actor.state === 'fight') actor.state = 'idle';
    stepToward(state, actor, actor.leash.x, actor.leash.z, true);
    return;
  }
  const turret = actor.turretId && (state.turrets || []).find(t => t.id === actor.turretId && t.operatorId === actor.id);
  if (turret) {
    const enemies = state.actors.filter(o => o.id !== actor.id && o.state !== 'dead' && o.state !== 'down' && o.state !== 'getup' && o.carriedBy == null && aiHostile(state, actor, o));
    const close = enemies.filter(o => distBetween(actor, o) <= CROSSBOW.meleeSwitch).sort((a,b) => distBetween(actor,a)-distBetween(actor,b))[0];
    if (close) { actor.targetId = close.id; }
    else {
      const target = enemies.filter(o => Math.hypot(o.x-turret.x,o.z-turret.z) <= 35).sort((a,b) => Math.hypot(a.x-turret.x,a.z-turret.z)-Math.hypot(b.x-turret.x,b.z-turret.z))[0];
      actor.targetId = target?.id ?? null;
      const seat = turretSeat(turret);
      if (Math.hypot(actor.x-seat.x, actor.z-seat.z) > 0.35) stepToward(state, actor, seat.x, seat.z, false);
      else { actor.rot = turret.rot; actor.state = target ? 'fight' : 'idle'; setAnim(actor, 'Idle', state.tick); }
      return;
    }
  }
  // 移動命令中は、反撃・救援などで自動に付いた狙いを外して目的地へ向かう
  if (underMoveOrder(state, actor) && (actor.targetId !== null || actor.waitTargetId != null)) {
    actor.targetId = null;
    actor.waitTargetId = null;
    if (actor.state === 'fight') actor.state = 'move';
  }
  const target = actor.targetId !== null ? byId.get(actor.targetId) : null;
  const weaponRange = (WEAPONS[actor.weapon] || WEAPONS.unarmed || { range: 1.8 }).range;
  if (target && target.state !== 'dead') {
    const d = distBetween(actor, target);
    const downTarget = target.state === 'down' || target.state === 'getup';
    // 投げで転んだだけの相手（意識あり）からは手を離さない。追撃してよい。
    const dropDown =
      downTarget && !target.knocked && !canHarmDowned(downedHarmKind(actor, target));
    if (dropDown) {
      actor.targetId = null;
      actor.state = 'idle';
    } else if (d > (actor.crossbow ? crossbowRange(actor) : 30) && !actor.isPlayer && (!inSquad(state, actor) || actor.stance === 'passive')) {
      actor.targetId = null;
      actor.state = 'idle';
    } else if (rangedMode(actor, d) || thrownMode(actor, d)) {
      // 弩・投擲: 射程まで寄り、射程内では立ち止まって射出する。
      const throwItemId = (actor.inv || []).find(x => x.id?.startsWith('shuriken_') || x.id?.startsWith('tknife_'))?.id;
      const bowMode = rangedMode(actor, d);
      const attackRange = bowMode ? crossbowRange(actor) : thrownRange(actor, throwItemId);
      const approachRange = attackRange * 0.85;
      const safeRange = Math.max(
        bowMode ? CROSSBOW.keepDist : 0,
        waitRingRadius(state, actor, target) + SURROUND.rangedRingExtra
      );
      if (actor.isPlayer && actor.holdGround) {
        if (d > approachRange) stepToward(state, actor, target.x, target.z, true);
        else setAnim(actor, 'Idle', state.tick);
        faceTarget(actor, target);
        actor.state = 'fight';
      } else if (d > approachRange + 0.2) {
        const dx = target.x - actor.x;
        const dz = target.z - actor.z;
        const len = Math.hypot(dx, dz) || 1;
        stepToward(state, actor, target.x - (dx / len) * approachRange, target.z - (dz / len) * approachRange, true);
      } else if (d < safeRange - 0.2) {
        const dx = actor.x - target.x;
        const dz = actor.z - target.z;
        const len = Math.hypot(dx, dz) || 1;
        stepToward(state, actor, target.x + (dx / len) * safeRange, target.z + (dz / len) * safeRange, false);
        faceTarget(actor, target);
        actor.state = 'fight';
      } else {
        faceTarget(actor, target);
        actor.state = 'fight';
        setAnim(actor, 'Idle', state.tick);
      }
    } else if (combatStunned(state, actor)) {
      // ひるみ・よろけ中は足が止まる
      actor.state = 'fight';
    } else if ((actor.surroundHoldUntil || 0) > state.tick && d > weaponRange + SURROUND.engageExtra) {
      // 空いた枠を押さえた直後: 少し間を置いてから踏み込む（それまでは輪の上）
      moveWaiterOnRing(state, actor, target);
      faceTarget(actor, target);
      actor.state = 'fight';
      if (!actor.movedThisTick) setAnim(actor, 'Idle', state.tick);
    } else if (d > weaponRange * 0.9) {
      const spread = !actor.isPlayer && d < weaponRange + 3 ? holderSpreadSign(state, actor, target) : 0;
      if (spread !== 0) {
        // 先に打ち合っている仲間と同じ側へ重ならず、横へ回り込んで踏み込む
        const ang = Math.atan2(actor.x - target.x, actor.z - target.z) + spread * 0.35;
        stepToward(state, actor, target.x + Math.sin(ang) * weaponRange * 0.85, target.z + Math.cos(ang) * weaponRange * 0.85, true);
      } else {
        stepToward(state, actor, target.x, target.z, true);
      }
    } else {
      // 間合いの中: 向き合って、手が空いている時だけ少し横へ回り込む（近すぎれば下がる）
      // 狙われている側は基本その場で受けるが、重なった相手が動けない者（操作中の仲間・持ち場固守・防御専念）なら自分が回る
      const spreadFree = !actor.isPlayer && actor.faction === 'player' && !actor.swing && !combatStunned(state, actor);
      const spread = !spreadFree ? 0 : target.targetId !== actor.id
        ? holderSpreadSign(state, actor, target, HOLDER_MIN_GAP)
        : holderSpreadSign(state, actor, target, HOLDER_MIN_GAP, (other) => other.isPlayer || other.holdGround || other.blockStance);
      if (spread !== 0) {
        // 打ち合う仲間と重なっていれば、相手に狙われていない方が周りを回って離れる（同じ振りに巻き込まれないように）
        strafe(state, actor, target, Math.max(weaponRange * 0.8, Math.min(d, weaponRange * 0.9)), spread * 0.1);
      } else if (!combatBusy(state, actor) && !actor.isPlayer) {
        const want = weaponRange * 0.8;
        if (d < weaponRange * 0.55) strafe(state, actor, target, want, 0);
        else if (sideStepPhase(state, actor) !== 0) {
          strafe(state, actor, target, want, sideStepPhase(state, actor) * 0.03);
        }
      }
      faceTarget(actor, target);
      actor.state = 'fight';
      if (!combatBusy(state, actor) && !actor.movedThisTick) setAnim(actor, 'Idle', state.tick);
    }
    return;
  }
  if (actor.targetId !== null) {
    actor.targetId = null;
  }

  // さらい・食事・手当て中は輪になって待たない（運ぶ・食べるほうを先に）
  if (actor.abduct || actor.eatingId != null || actor.task) actor.waitTargetId = null;
  // 攻撃枠（1人に2人まで）が埋まっている相手の周りで、輪になって待つ
  if (actor.waitTargetId !== null && actor.waitTargetId !== undefined) {
    const wt = byId.get(actor.waitTargetId);
    if (waitTargetValid(state, actor, wt)) {
      if (rangedForTarget(actor, wt)) {
        // 狙いの空きを待つ射手は、近接の待ち輪よりさらに外で止まる
        const safe = waitRingRadius(state, actor, wt) + SURROUND.rangedRingExtra;
        const d = distBetween(actor, wt);
        if (d < safe - 0.2) {
          const len = d || 1;
          stepToward(state, actor, wt.x + ((actor.x - wt.x) / len) * safe, wt.z + ((actor.z - wt.z) / len) * safe, false);
        }
      } else {
        moveWaiterOnRing(state, actor, wt);
      }
      faceTarget(actor, wt);
      actor.state = 'fight';
      if (!actor.movedThisTick) setAnim(actor, 'Idle', state.tick);
      return;
    }
    actor.waitTargetId = null;
  }

  // 仲間の「あさる」命令は接近だけ。到着や待機では持ち物を移さない。
  if (actor.lootBodyId != null) {
    const body = lootBodyTarget(state, actor, byId);
    if (body) {
      const d = distBetween(actor, body);
      if (d <= 1.3) {
        actor.state = 'idle';
        faceTarget(actor, body);
        setAnim(actor, 'Idle', state.tick);
        return;
      }
      stepToward(state, actor, body.x, body.z, true);
      return;
    }
  }

  // 町（bldg1）: 仲間の作業・衛兵の逮捕・住人の居場所
  if (state.town && townMove(state, actor, byId, stepToward)) return;

  // 拠点の係（大工）: 素材箱と現場の間を歩く（build.js が行き先を決める）
  if (actor.buildTask && buildMove(state, actor, stepToward, setAnim)) return;

  // さらい・食事・手当て・縄ほどきの行き先（abduct.js）
  if (!actor.moveTo || !actor.task) {
    const goal = abductGoal(state, actor, byId);
    if (goal) {
      const d = Math.hypot(goal.x - actor.x, goal.z - actor.z);
      if (d <= goal.reach) {
        if (actor.state !== 'down' && actor.state !== 'getup') actor.state = 'idle';
        if (actor.eatingId == null) setAnim(actor, 'Idle', state.tick);
        return;
      }
      // TODO: 歩き/走りの切り替えボタンは後で足す。今は自分の部隊はいつも走る
      stepToward(state, actor, goal.x, goal.z, inSquad(state, actor) || d > 6);
      return;
    }
  }

  if (actor.lootTargetId !== null && actor.carryingId === null) {
    const victim = byId.get(actor.lootTargetId);
    if (victim && victim.state === 'down' && victim.carriedBy === null) {
      const d = distBetween(actor, victim);
      if (d <= 1.4) {
        actor.state = 'idle';
        setAnim(actor, 'Idle', state.tick);
        return;
      }
      stepToward(state, actor, victim.x, victim.z, false);
      return;
    }
    actor.lootTargetId = null;
    actor.lootTicks = 0;
  }

  if (actor.carryingId !== null && actor.carryHome) {
    const home = actor.spawnHome || CAMP;
    const d = Math.hypot(home.x - actor.x, home.z - actor.z);
    if (d <= 4) {
      actor.state = 'idle';
      setAnim(actor, 'Idle', state.tick);
      return;
    }
    stepToward(state, actor, home.x, home.z, false);
    return;
  }

  let dest = null;
  if (actor.moveTo) {
    dest = actor.moveTo;
  } else if (actor.carryTargetId !== null) {
    const carryTarget = byId.get(actor.carryTargetId);
    if (
      carryTarget &&
      carryTarget.id !== actor.id &&
      carryTarget.carriedBy === null &&
      (carryTarget.state === 'down' || carryTarget.state === 'dead')
    ) {
      dest = carryTarget;
    } else {
      actor.carryTargetId = null;
    }
  }
  if (!dest && actor.squadId) {
    const squad = squadsById.get(actor.squadId);
    if (squad) {
      const leader = leaderOf(squad, byId);
      dest = squadDest(state, actor, squad, leader, byId);
    }
  }
  if (!dest) dest = companionDest(state, actor, byId);
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
  // TODO: 歩き/走りの切り替えボタンは後で足す。今は自分の部隊はいつも走る（担ぎ・忍び足は stepToward 側の決まりのまま）
  // 目的地に人が立っていて、もうその人のそばまで来たら着いたことにする（押し続けない）
  if (actor.moveTo && d <= 1.6 && goalTaken(state, actor, dest)) {
    actor.moveTo = null;
    if (actor.state !== 'down' && actor.state !== 'getup') {
      actor.state = 'idle';
      setAnim(actor, 'Idle', state.tick);
    }
    return;
  }
  const runAt = actor.settlementId ? Infinity : inSquad(state, actor) ? 0 : 15;
  stepToward(state, actor, dest.x, dest.z, d >= runAt);
  if (actor.moveTo && d <= 0.5) actor.moveTo = null;
}

function faceTarget(actor, target) {
  const dx = target.x - actor.x;
  const dz = target.z - actor.z;
  if (dx * dx + dz * dz > 0.0001) actor.rot = Math.atan2(dx, dz);
}

// ── 人どうしのぶつかり ──
// 仲間（プレイヤー側）どうしはすり抜ける。仲間以外にふさがれたら、速度を落として横へ回り込みつつ、
// 立ち止まっている相手をじわっと押しのける（相手は1tickに少しずつずれる）。
// 衛兵（町の衛兵・拠点の門番）・戦闘中・作業中・会話で寄ってくる人などは押しのけられない。
const CROWD_CELL = 2;
const PERSON_GAP = 0.8; // 人どうしの間隔（従来どおり）
const ALLY_GAP = 0.6; // 立ち止まった仲間どうしは、ここまでゆるく離れる
const ALLY_EASE = 0.15;
const SHOVE_MAX = 0.05; // 押された人が1tickでずれる上限（0.5m/秒）
const SHOVE_SPEED = 0.45; // 人を押している間の自分の速さ（倍率）
const STEER_SOFT = (35 * Math.PI) / 180;
const STEER_HARD = (65 * Math.PI) / 180;
const PRESS_IDLE_TICKS = 4; // 押しても全く進めない時、足踏みの絵をやめるまで
const PRESS_GIVE_UP_TICKS = 30; // 目的地のそばで3秒進めなければ、そこで止まる
const MAX_TURN_PER_TICK = 0.22; // 1tickで回せる向き（約13°）。向きが急に跳ねないように、ゆっくり回す
const GRIND_GIVE_UP_TICKS = 45; // 目的地へ近づけないまま4.5秒たったら、そこで諦めて止まる
const GRIND_GIVE_UP_MOVE = 1.2; // その間の移動がこれ未満（＝その場で震えている）なら諦める
let crowd = null;

function playerSide(actor) {
  return actor.faction === 'player';
}

function allyPair(a, b) {
  return playerSide(a) && playerSide(b);
}

function standingBody(actor) {
  return actor.state !== 'dead' && actor.state !== 'down' && actor.state !== 'getup' && actor.carriedBy == null && !actor.martialPair;
}

// 押しのけられない人（持ち場の衛兵・戦い・作業・会話中など）
function anchored(actor) {
  if (actor.faction === 'guard' && !actor.civil) return true;
  if (actor.settlementRole === 'guard') return true;
  if (actor.state === 'fight' || actor.targetId != null || actor.waitTargetId != null) return true;
  if (actor.task || actor.townTask || actor.pick || actor.resting || actor.jail || actor.turretId || actor.dialogueIntent || actor.buildTask) return true;
  return false;
}

// 移動の途中（戦いの寄せ・間合い取りではない）
function travelling(actor) {
  return actor.targetId == null && actor.waitTargetId == null && actor.state !== 'fight';
}

function buildCrowd(state) {
  const grid = new Map();
  for (const actor of state.actors) {
    if (!standingBody(actor)) continue;
    const key = Math.floor(actor.x / CROWD_CELL) + ',' + Math.floor(actor.z / CROWD_CELL);
    let bucket = grid.get(key);
    if (!bucket) {
      bucket = [];
      grid.set(key, bucket);
    }
    bucket.push(actor);
  }
  return grid;
}

// 進む向きの前をふさいでいる、いちばん近い仲間以外の人
function personAhead(actor, angle, reach) {
  if (!crowd) return null;
  const fx = Math.sin(angle);
  const fz = Math.cos(angle);
  const cx = Math.floor(actor.x / CROWD_CELL);
  const cz = Math.floor(actor.z / CROWD_CELL);
  let best = null;
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dz = -1; dz <= 1; dz += 1) {
      const bucket = crowd.get(cx + dx + ',' + (cz + dz));
      if (!bucket) continue;
      for (const b of bucket) {
        if (b === actor || allyPair(actor, b) || !standingBody(b)) continue;
        const vx = b.x - actor.x;
        const vz = b.z - actor.z;
        const along = vx * fx + vz * fz;
        if (along <= 0 || along > reach) continue;
        const lat = vx * fz - vz * fx;
        if (Math.abs(lat) >= PERSON_GAP) continue;
        if (!best || along < best.along || (along === best.along && b.id < best.b.id)) best = { b, along, lat };
      }
    }
  }
  return best;
}

// 目的地に（仲間以外の）人が立っていて、もうその人に触れている
function goalTaken(state, actor, dest) {
  for (const b of state.actors) {
    if (b === actor || allyPair(actor, b) || !standingBody(b)) continue;
    if (Math.hypot(b.x - dest.x, b.z - dest.z) < 0.6 && Math.hypot(b.x - actor.x, b.z - actor.z) < PERSON_GAP + 0.25) return true;
  }
  return false;
}

// 歩いている m が、立ち止まっている o を押す。o は少しずつ（壁や建物にはめり込まない範囲で）ずれ、残りは m が下がる
function shove(state, m, o, ux, uz, overlap) {
  let give = 0;
  if (!anchored(o)) {
    const want = Math.min(overlap * 0.75, SHOVE_MAX);
    const radius = actorRadius(o) - 0.02;
    const tries = [
      [ux, uz, 1],
      [-uz, ux, 0.7],
      [uz, -ux, 0.7],
    ];
    for (const [tx, tz, k] of tries) {
      const len = want * k;
      const nx = clampWorldX(o.x + tx * len);
      const nz = clampWorldZ(o.z + tz * len);
      if (blockedAt(state, nx, nz, radius, o)) continue;
      o.x = nx;
      o.z = nz;
      give = len * Math.max(0, tx * ux + tz * uz);
      break;
    }
  }
  const rest = Math.max(0, overlap - give);
  m.x = clampWorldX(m.x - ux * rest);
  m.z = clampWorldZ(m.z - uz * rest);
}

const DETOUR_DEGREES = [25, 50, 75, 100, 130];

function noteStuck(actor, side) {
  if (actor.stuckTicks >= 60) {
    actor.avoidSide = side === 1 ? -1 : 1;
    actor.stuckTicks = 0;
  }
}

function addStuck(actor) {
  actor.stuckTicks = (actor.stuckTicks || 0) + 1;
}

function floorRoutePoint(state, actor, tx, tz) {
  const target = actor.targetId != null ? state.actors.find((other) => other.id === actor.targetId) : null;
  const explicitFloor = Number.isInteger(actor.moveTo?.floor) ? actor.moveTo.floor : null;
  const wantedFloor = explicitFloor ?? (target ? actorFloor(target) : 0);
  const targetHouse = houseAt(state, tx, tz, 0.08);
  const targetFloor = targetHouse ? Math.min(wantedFloor, targetHouse.roofFloor || wantedFloor) : 0;
  const actorHouse = houseAt(state, actor.x, actor.z, 0.08) ||
    (actorFloor(actor) > 0 ? state.town.houses.find((house) => house.stairs && Math.hypot(actor.x - house.roofEntry.x, actor.z - house.roofEntry.z) < 1.1) : null);
  const roofTransfer = actorFloor(actor) >= (actorHouse ? houseRoofFloor(actorHouse) : Infinity) &&
    targetFloor >= (targetHouse ? houseRoofFloor(targetHouse) : Infinity) && actorHouse && targetHouse && actorHouse.id !== targetHouse.id;
  let currentFloor = actorFloor(actor);
  let route = actor.floorRoute;
  const routeMatches = route && route.targetFloor === targetFloor && route.targetHouseId === (targetHouse?.id || null) &&
    route.targetActorId === (target?.id ?? null) && Math.hypot(route.goalX - tx, route.goalZ - tz) < 2.5;
  if (!routeMatches) route = null;
  if (!route && currentFloor === targetFloor && !roofTransfer) {
    actor.floorRoute = null;
    return null;
  }
  if (!route) {
    const points = floorRouteForActors(state, actor, targetHouse, targetFloor, { x: tx, z: tz });
    if (!points || points.length === 0) return { blocked: true };
    route = {
      points,
      index: 0,
      targetFloor,
      targetHouseId: targetHouse?.id || null,
      targetActorId: target?.id ?? null,
      goalX: tx,
      goalZ: tz,
    };
    actor.floorRoute = route;
  }
  while (route.index < route.points.length) {
    const point = route.points[route.index];
    if (Math.hypot(point.x - actor.x, point.z - actor.z) > 0.62) break;
    actor.floor = point.floor;
    currentFloor = point.floor;
    actor.floorTransit = null;
    actor.floorRouteIndex = route.index;
    route.index += 1;
  }
  if (route.index >= route.points.length) {
    actor.floor = targetFloor;
    actor.floorRoute = null;
    const h = targetHouse || state.town.houses.find((house) => house.id === route.targetHouseId);
    actor.y = actorWorldY(h, actor.floor, actor.x, actor.z);
    return null;
  }
  const point = route.points[route.index];
  return point;
}

// 向きを少しずつ目的の角度へ回す（1tickで MAX_TURN_PER_TICK まで）
function wrapAngle(angle) {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function turnToward(rot, wanted, maxStep) {
  const current = Number.isFinite(rot) ? rot : wanted;
  const diff = wrapAngle(wanted - current);
  if (!Number.isFinite(diff)) return wanted;
  if (Math.abs(diff) <= maxStep) return wanted;
  return current + (diff > 0 ? maxStep : -maxStep);
}

// 前が障害物なら、当たっている面に沿う向きへ曲げる（壁ずり）。
// 向きは障害物の形から決まるので、毎tickで左右に振れない。
// 面と正面からぶつかっている（接線成分が無い）ときは null を返す＝進まず、その場で止まる。
function slideStep(state, actor, baseAngle, stepLen, radius) {
  const reach = Math.max(stepLen, radius + 0.12);
  const probeX = actor.x + Math.sin(baseAngle) * reach;
  const probeZ = actor.z + Math.cos(baseAngle) * reach;
  const hit = blockingNormal(state, probeX, probeZ, radius, actor);
  if (!hit) return null;
  const vx = Math.sin(baseAngle) * stepLen;
  const vz = Math.cos(baseAngle) * stepLen;
  const into = vx * hit.nx + vz * hit.nz; // 面へめり込む成分
  let sx = vx - hit.nx * into;
  let sz = vz - hit.nz * into;
  if (Math.hypot(sx, sz) < 1e-4) return null;
  // 面から離れすぎないよう、ほんの少しだけ外向きに寄せる
  const keep = Math.min(stepLen * 0.25, 0.05);
  sx += hit.nx * keep;
  sz += hit.nz * keep;
  const len = Math.hypot(sx, sz);
  return { angle: Math.atan2(sx, sz), len: Math.min(stepLen, len), slide: true };
}

function stepToward(state, actor, tx, tz, running, usePathfinding = true) {
  // A unit can be spawned or placed inside furniture. Collision checks otherwise
  // reject every step, so first eject it to the closest clear point on walkable ground.
  const recoveryRadius = actorRadius(actor);
  if (blockedAt(state, actor.x, actor.z, recoveryRadius, actor)) {
    const point = nearestClearPoint(
      actor.x,
      actor.z,
      walkableAt,
      (x, z) => blockedAt(state, x, z, recoveryRadius, actor),
      { goal: { x: tx, z: tz } }
    );
    if (point) {
      actor.x = point.x;
      actor.z = point.z;
      actor.stuckTicks = 0;
      actorPaths.delete(actor);
    }
  }
  const safe = avoidKnownTrapStep(state, actor, tx, tz);
  tx = safe.x; tz = safe.z;
  const targetHouse = state.town ? houseAt(state, tx, tz, 0.08) : null;
  const actorHouse = state.town ? houseAt(state, actor.x, actor.z, 0.08) : null;
  let floorPoint = null;
  if (state.town) {
    floorPoint = floorRoutePoint(state, actor, tx, tz);
    if (floorPoint?.blocked) {
      actor.floorRoute = null;
      if (actor.isPlayer && actor.moveTo?.floor !== undefined) actor.moveTo = null;
      if (actor.targetId != null && actorFloor(actor) !== actorFloor(state.actors.find((other) => other.id === actor.targetId))) actor.targetId = null;
      if (actor.state === 'move') actor.state = 'idle';
      setAnim(actor, 'Idle', state.tick);
      return;
    }
    if (floorPoint) { tx = floorPoint.x; tz = floorPoint.z; }
  }
  // 町（bldg1）: 小屋の出入りは戸口を通る。鍵のかかった扉の前では止まる
  if (state.town && !(floorPoint?.kind === 'roof-edge' && actorFloor(actor) > 0)) {
    const wp = navPoint(state, actor, tx, tz);
    if (wp) {
      if (wp.blocked) {
        if (actor.faction === 'player') actor.moveTo = null;
        if (actor.state === 'move') actor.state = 'idle';
        setAnim(actor, 'Idle', state.tick);
        return;
      }
      tx = wp.x;
      tz = wp.z;
    }
  }
  let dx = tx - actor.x;
  let dz = tz - actor.z;
  let d = Math.hypot(dx, dz);
  if (d < 0.0001) return;

  let path = actorPaths.get(actor);
  if (path && Math.hypot(tx - path.gx, tz - path.gz) >= 8) {
    actorPaths.delete(actor);
    path = null;
  }
  if (path && !walkableAt(actor.x, actor.z)) {
    actorPaths.delete(actor);
    path = null;
  }
  const townLocalNavigation = !!state.town && (actorFloor(actor) > 0 || !!floorPoint || !!actorHouse || !!targetHouse);
  if (!usePathfinding || townLocalNavigation) {
    if (path) actorPaths.delete(actor);
    path = null;
  } else if (path?.done) {
    actor.state = 'idle';
    setAnim(actor, 'Idle', state.tick);
    return;
  } else if (path && !path.points && !path.search) {
    if (state.tick < path.retryAt) {
      setAnim(actor, 'Idle', state.tick);
      return;
    }
    path = beginActorPath(state, actor, tx, tz, d, path);
    actorPaths.set(actor, path);
  } else if (!path && d >= 6 && walkableAt(actor.x, actor.z) && !straightAhead(state, actor, tx, tz, d)) {
    path = beginActorPath(state, actor, tx, tz, d);
    actorPaths.set(actor, path);
  }

  if (path) {
    if (path.search) advanceActorPath(state, actor, path);
    if (path.done) return;
    if (path.search && !path.points) {
      setAnim(actor, 'Idle', state.tick);
      return;
    }
    if (path?.points) {
      while (path.index < path.points.length) {
        const point = path.points[path.index];
        if (Math.hypot(point.x - actor.x, point.z - actor.z) > 1.25) break;
        path.index += 1;
        path.lastWaypointDistance = null;
        path.lastProgressTick = state.tick;
      }
      if (path.index >= path.points.length) {
        if (path.search) {
          setAnim(actor, 'Idle', state.tick);
          return;
        }
        if (path.reachedGoal) {
          if (Math.hypot(tx - actor.x, tz - actor.z) > 2.5) {
            path.done = true;
            if (actor.moveTo && Math.hypot(actor.moveTo.x - path.gx, actor.moveTo.z - path.gz) < 8) {
              actor.moveTo = null;
            }
            actor.state = 'idle';
            setAnim(actor, 'Idle', state.tick);
            return;
          }
          actorPaths.delete(actor);
          path = null;
        } else {
          // A partial route ended. Searching again from here only helps when the
          // last try got clearly closer; otherwise stop instead of looping.
          const goalDistance = Math.hypot(tx - actor.x, tz - actor.z);
          if (goalDistance < path.bestGoalDistance - 20) {
            path.bestGoalDistance = goalDistance;
            path.stalls = 0;
          } else if (path.level < PATH_CELLS.length - 1) {
            path.level += 1;
          } else {
            path.stalls += 1;
          }
          if (path.stalls >= 2) {
            path.done = true;
            if (actor.moveTo && Math.hypot(actor.moveTo.x - path.gx, actor.moveTo.z - path.gz) < 8) {
              actor.moveTo = null;
            }
            actor.state = 'idle';
            setAnim(actor, 'Idle', state.tick);
            return;
          }
          path.points = null;
          path.retryAt = state.tick + 1;
          setAnim(actor, 'Idle', state.tick);
          return;
        }
      } else {
        const point = path.points[path.index];
        const waypointDistance = Math.hypot(point.x - actor.x, point.z - actor.z);
        const actorMoved = Math.hypot(actor.x - path.lastActorX, actor.z - path.lastActorZ) >= 0.02;
        path.lastActorX = actor.x;
        path.lastActorZ = actor.z;
        if (
          actorMoved ||
          path.lastWaypointDistance === null ||
          waypointDistance < path.lastWaypointDistance - 0.02
        ) {
          path.lastWaypointDistance = waypointDistance;
          path.lastProgressTick = state.tick;
        } else if (state.tick - path.lastProgressTick >= 30) {
          actorPaths.delete(actor);
          path = null;
        }
      }
      if (path?.points && path.index < path.points.length) {
        const point = path.points[path.index];
        tx = point.x;
        tz = point.z;
        dx = tx - actor.x;
        dz = tz - actor.z;
        d = Math.hypot(dx, dz);
        if (d < 0.0001) return;
      }
    }
  }

  const carrying = actor.carryingId !== null;
  const sneaking = !!actor.sneaking;
  const sneakRun = sneaking && running && !carrying && effectiveStealth(state, actor) >= 30;
  let base;
  if (sneaking) {
    base = sneakRun ? runSpeed(actor) * 0.8 : walkSpeed(actor, 1.6 * 0.7);
  } else {
    base = carrying || !running ? walkSpeed(actor) : runSpeed(actor);
  }
  const speedFactors = movementSpeedFactors(actor, carrying, state.tick);
  const speed = base * speedFactors.leg * speedFactors.load * speedFactors.daze;
  const runAnim = actor.crawling ? false : sneaking ? sneakRun : running && !carrying;
  let stepLen = Math.min(d, speed * TICK_SEC);
  const baseAngle = Math.atan2(dx, dz);
  const radius = actorRadius(actor);
  const side = actor.avoidSide === -1 ? -1 : 1;
  const currentWalkable = walkableAt(actor.x, actor.z);
  const currentSlope = currentWalkable ? Infinity : slopeAt(actor.x, actor.z);
  // 前を人がふさいでいたら、横へ回り込みながら（止まっている相手なら速度を落として押しつつ）進む
  let steer = 0;
  if (crowd && travelling(actor)) {
    const hit = personAhead(actor, baseAngle, PERSON_GAP + stepLen + 0.25);
    if (hit) {
      if (actor.passId !== hit.b.id || !actor.passSide) {
        actor.passId = hit.b.id;
        actor.passSide = hit.lat > 0.05 ? -1 : 1;
      }
      const hard = anchored(hit.b);
      steer = actor.passSide * (hard ? STEER_HARD : STEER_SOFT);
      if (!hard && hit.along < PERSON_GAP + 0.15 && hit.b.state !== 'move') stepLen *= SHOVE_SPEED;
    } else if (actor.passId != null) {
      actor.passId = null;
      actor.passSide = 0;
    }
  }
  // 進む向きの候補: まっすぐ →（障害物に当たっていれば）面に沿って滑る → それでも駄目なら角度を振って回り込む。
  // 大きく曲がる候補ほど遅くして、棒立ちで回り込んだり左右に振れたりしないようにする。
  const candidates = [];
  if (steer !== 0) candidates.push({ angle: baseAngle + steer, len: stepLen, slide: false });
  candidates.push({ angle: baseAngle, len: stepLen, slide: false });
  const slide = slideStep(state, actor, baseAngle, stepLen, radius);
  if (slide) candidates.push(slide);
  for (const deg of DETOUR_DEGREES) {
    const rad = (deg * Math.PI) / 180;
    candidates.push({ angle: baseAngle + side * rad, len: stepLen, slide: false });
    candidates.push({ angle: baseAngle - side * rad, len: stepLen, slide: false });
  }
  for (const candidate of candidates) {
    const angle = candidate.angle;
    const nx = clampWorldX(actor.x + Math.sin(angle) * candidate.len);
    const nz = clampWorldZ(actor.z + Math.cos(angle) * candidate.len);
    if (blockedAt(state, nx, nz, radius, actor)) continue;
    if (!walkableAt(nx, nz) && (currentWalkable || slopeAt(nx, nz) >= currentSlope - 0.000001)) continue;
    const moved = Math.hypot(nx - actor.x, nz - actor.z);
    const previousX = actor.x;
    const previousZ = actor.z;
    actor.x = nx;
    actor.z = nz;
    if (state.town && (actorFloor(actor) > 0 || actor.floorRoute)) {
      const home = state.town.houses.find((house) => house.id === floorPoint?.houseId) || houseAt(state, nx, nz, 0.2);
      let offset = floorHeightOffset(home, actorFloor(actor));
      if (floorPoint && floorPoint.floor !== actorFloor(actor)) {
        const transit = actor.floorTransit;
        if (!transit || transit.toFloor !== floorPoint.floor || transit.houseId !== home?.id) {
          actor.floorTransit = {
            fromFloor: actorFloor(actor),
            toFloor: floorPoint.floor,
            x0: previousX,
            z0: previousZ,
            x1: floorPoint.x,
            z1: floorPoint.z,
            houseId: home?.id,
          };
        }
        const t = actor.floorTransit;
        const dx = t.x1 - t.x0;
        const dz = t.z1 - t.z0;
        const len2 = dx * dx + dz * dz;
        const progress = len2 > 0 ? Math.max(0, Math.min(1, ((nx - t.x0) * dx + (nz - t.z0) * dz) / len2)) : 1;
        const fromY = actorWorldY(home, t.fromFloor, t.x0, t.z0) - heightAt(t.x0, t.z0);
        const toY = actorWorldY(home, t.toFloor, t.x1, t.z1) - heightAt(t.x1, t.z1);
        offset = fromY + (toY - fromY) * progress;
      }
      actor.y = heightAt(nx, nz) + offset;
      if (Math.hypot(floorPoint?.x - nx, floorPoint?.z - nz) <= 0.62) {
        actor.floor = floorPoint.floor;
        actor.floorTransit = null;
        actor.y = actorWorldY(home, actorFloor(actor), nx, nz);
      }
    }
    actor.rot = turnToward(actor.rot, angle, MAX_TURN_PER_TICK);
    actor.state = 'move';
    actor.movedRun = runAnim;
    actor.movedCarry = carrying;
    actor.movedThisTick = true;
    actor.movedRunThisTick = runAnim;
    // 振りの途中で踏み込んでも、見た目は振りのまま（走りの絵で振りが消えないように）
    if (!(actor.swing && actor.swing.impactTick >= state.tick)) setAnim(actor, actor.crawling ? 'Crawl' : runAnim ? 'Run' : 'Walk', state.tick);
    // 壁ずりは「半分も進めない」のが普通なので、詰まり判定には入れない
    if (candidate.slide) {
      actor.stuckTicks = 0;
    } else if (moved < candidate.len * 0.5) {
      addStuck(actor);
    } else {
      actor.stuckTicks = 0;
    }
    noteStuck(actor, side);
    return;
  }
  addStuck(actor);
  noteStuck(actor, side);
}

function separate(state) {
  const cell = 1.5;
  const grid = new Map();
  const list = [];
  for (const actor of state.actors) {
    if (actor.carriedBy !== null || actor.martialPair) continue;
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
          if (actorFloor(a) !== actorFloor(b)) continue;
          let ddx = b.x - a.x;
          let ddz = b.z - a.z;
          const d2 = ddx * ddx + ddz * ddz;
          if (d2 >= PERSON_GAP * PERSON_GAP) continue;
          if (allyPair(a, b)) {
            // 仲間どうしはすり抜ける。2人とも立ち止まった時だけ、重なりっぱなしにならないようゆるく離れる
            if (a.movedThisTick || b.movedThisTick || d2 >= ALLY_GAP * ALLY_GAP) continue;
            let d = Math.sqrt(d2);
            if (d <= 0.000001) {
              ddx = 1;
              ddz = 0;
              d = 1;
            }
            const push = (ALLY_GAP - Math.min(d, ALLY_GAP)) * ALLY_EASE * 0.5;
            const nx = ddx / d;
            const nz = ddz / d;
            a.x = clampWorldX(a.x - nx * push);
            a.z = clampWorldZ(a.z - nz * push);
            b.x = clampWorldX(b.x + nx * push);
            b.z = clampWorldZ(b.z + nz * push);
            continue;
          }
          if (d2 <= 0.000001) continue;
          const d = Math.sqrt(d2);
          const nx = ddx / d;
          const nz = ddz / d;
          const overlap = PERSON_GAP - d;
          const both = standingBody(a) && standingBody(b);
          const aWalks = both && a.movedThisTick && travelling(a) && !b.movedThisTick;
          const bWalks = both && b.movedThisTick && travelling(b) && !a.movedThisTick;
          if (aWalks) {
            shove(state, a, b, nx, nz, overlap);
            continue;
          }
          if (bWalks) {
            shove(state, b, a, -nx, -nz, overlap);
            continue;
          }
          const push = overlap * 0.5;
          a.x = clampWorldX(a.x - nx * push);
          a.z = clampWorldZ(a.z - nz * push);
          b.x = clampWorldX(b.x + nx * push);
          b.z = clampWorldZ(b.z + nz * push);
        }
      }
    }
  }
}

export function moveActors(state) {
  resetPathBudget(state);
  const byId = indexActors(state);
  const squadsById = new Map();
  for (const squad of state.squads) squadsById.set(squad.id, squad);
  syncCarried(state);
  crowd = buildCrowd(state);
  const before = new Map();
  for (let i = 0; i < state.actors.length; i += 1) {
    const actor = state.actors[i];
    pathActorContext = { actor, slots: state.actors.length - i };
    if (actor.carriedBy !== null) continue;
    if (actor.state === 'dead') continue;
    if (actor.martialPair) continue;
    if ((actor.trapRootUntil || 0) > state.tick) { if (actor.anim === 'Run' || actor.anim === 'Walk') setAnim(actor, 'Idle', state.tick); continue; } // 罠で足止め中は走る姿勢のまま固まらない
    const fixed = resolveCircle(state, actor.x, actor.z, actorRadius(actor), actor);
    actor.x = clampWorldX(fixed.x);
    actor.z = clampWorldZ(fixed.z);
    if (actor.state === 'down' || actor.state === 'getup') continue;
    before.set(actor, { x: actor.x, z: actor.z, rot: actor.rot });
    moveActor(state, actor, byId, squadsById);
  }
  crowd = null;
  pathActorContext = null;
  const mid = new Map();
  for (const actor of state.actors) mid.set(actor, { x: actor.x, z: actor.z });
  separate(state);
  for (const actor of state.actors) {
    if (actor.carriedBy !== null) continue;
    if (actor.state === 'dead') continue;
    if (actor.martialPair) continue;
    const r = actorRadius(actor);
    const fixed = resolveCircle(state, actor.x, actor.z, r, actor);
    actor.x = clampWorldX(fixed.x);
    actor.z = clampWorldZ(fixed.z);
    // 世界の端で、押し出された先が端の外 → 端へ戻されて障害物の中、になった時は人押しの前の位置へ戻す
    const m = mid.get(actor);
    if (m && blockedAt(state, actor.x, actor.z, r - 0.05, actor) && !blockedAt(state, m.x, m.z, r - 0.05, actor)) {
      actor.x = m.x;
      actor.z = m.z;
    }
  }
  // 押しても全く進めない（人や壁に詰まった）時は、その場で足踏み・向きの往復をしない
  for (const [actor, b] of before) {
    const goal = actor.moveTo;
    if (!travelling(actor) || actor.state !== 'move' || !goal) {
      if (actor.pressTicks) actor.pressTicks = 0;
      actor.stallTicks = 0;
      actor.stallMove = 0;
      actor.aimKey = null;
      continue;
    }
    const moved = Math.hypot(actor.x - b.x, actor.z - b.z);
    // 経路を探している最中は止めない（見つかるまでその場に立っているだけなので、「進めない」ではない）
    const pathEntry = actorPaths.get(actor);
    if (pathEntry && (pathEntry.search || (pathEntry.retryAt || 0) > state.tick)) {
      actor.stallTicks = 0;
      actor.stallMove = 0;
      actor.pressTicks = 0;
      continue;
    }
    // 目的地へ近づけているか。近づけないまま、その場で震えている時だけ諦める（回り込んでいる最中は止めない）
    const aimKey = goal.x + ',' + goal.z;
    const aimDistance = Math.hypot(goal.x - actor.x, goal.z - actor.z);
    if (actor.aimKey !== aimKey || actor.aimBest == null || aimDistance < actor.aimBest - 0.15) {
      actor.aimKey = aimKey;
      actor.aimBest = aimDistance;
      actor.stallTicks = 0;
      actor.stallMove = 0;
    } else {
      actor.stallTicks = (actor.stallTicks || 0) + 1;
      actor.stallMove = (actor.stallMove || 0) + moved;
    }
    if (actor.stallTicks >= GRIND_GIVE_UP_TICKS && actor.stallMove < GRIND_GIVE_UP_MOVE) {
      // 進めないまま4.5秒たった。目的地の手前で震え続けず、その場で諦めて止まる
      actor.moveTo = null;
      actor.state = 'idle';
      actor.pressTicks = 0;
      actor.stallTicks = 0;
      actor.stallMove = 0;
      actor.aimKey = null;
      setAnim(actor, 'Idle', state.tick);
      continue;
    }
    if (moved >= 0.01) {
      if (actor.pressTicks) actor.pressTicks = 0;
      continue;
    }
    actor.pressTicks = (actor.pressTicks || 0) + 1;
    if (actor.pressTicks < PRESS_IDLE_TICKS) continue;
    actor.rot = b.rot;
    if (!(actor.swing && actor.swing.impactTick >= state.tick)) setAnim(actor, 'Idle', state.tick);
    if (actor.pressTicks >= PRESS_GIVE_UP_TICKS && aimDistance < 3) {
      actor.moveTo = null;
      actor.state = 'idle';
      actor.pressTicks = 0;
    }
  }
  syncCarried(state);
}

export function updateSpawns(state, events) {
  const byId = indexActors(state);
  for (const squad of state.squads) {
    if (squad.kind) continue; // ランダム出現の部隊は出直さない（spawning.js が別に出す）
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
    if (squad.kind) continue;
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
    if (actor.state === 'dead' && !actor.isPlayer && actor.carriedBy === null) {
      deadIds.push(actor.id);
    }
  }
  if (deadIds.length > CORPSE_LIMIT) {
    const remove = new Set();
    const extra = deadIds.length - CORPSE_LIMIT;
    for (let i = 0; i < extra; i += 1) remove.add(deadIds[i]);
    state.actors = state.actors.filter((actor) => !remove.has(actor.id));
  }
}
