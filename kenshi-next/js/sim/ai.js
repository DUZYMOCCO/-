import { encumbranceFromLoad, loadRatio } from './inventory.js';
import { turretSeat } from './turret.js';

// 荷重と担ぎのうち強い方の速度低下を適用する。
export function movementLoadMultiplier(ratio, carrying) {
  return Math.min(carrying ? 0.6 : 1, 1 - 0.85 * encumbranceFromLoad(ratio));
}
// 部隊の巡回・うろつき、索敵、加勢、目標選び、出現の補充。

import { abductGoal } from './abduct.js';
import {
  beastRules,
  canHarmDowned,
  downedHarmKind,
  FACTIONS,
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
import { resolveCircle, blockedAt, actorRadius } from './collide.js';
import { updateCompanionCarry, syncCarried } from './carry.js';
import { updateLootGoals } from './loot.js';
import { canSee, effectiveStealth } from './stealth.js';
import { rangedMode, CROSSBOW, crossbowRange } from './crossbow.js';
import { restPlace, stopRest } from './rest.js';
import { navPoint, townHold, townMove } from './town.js';
import { lawHostile } from './law.js';

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

function bestTarget(state, actor) {
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
    if (!isHostile(state, actor.faction, other.faction) && !(state.law && lawHostile(state, actor, other))) continue;
    if (other.state === 'dead') continue;
    if ((actor.holdFire || other.holdFire) && holdsPeace(actor, other)) continue;
    if (actor.leash && Math.hypot(other.x - actor.leash.x, other.z - actor.leash.z) > actor.leash.r) continue;
    if (other.state === 'down' || other.state === 'getup') {
      if (!canHarmDowned(downedHarmKind(actor, other))) continue;
    }
    if ((other.recoverUntil || 0) > state.tick && other.id !== actor.lastAttackerId) {
      continue;
    }
    if (!canSee(state, actor, other)) continue;
    const d = distBetween(actor, other);
    if (countTargeters(state, other.id, actor.id) >= ATTACK_SLOT_LIMIT) {
      if (!full || d < fullD) {
        full = other;
        fullD = d;
      }
      continue;
    }
    let score = d;
    if (other.id === actor.lastAttackerId) score -= 1000;
    if (score < bestScore || (score === bestScore && best && other.id < best.id)) {
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
    if (actor.isPlayer) continue;
    if (actor.carryingId !== null) continue;
    if (actor.state === 'dead' || actor.state === 'down' || actor.state === 'getup') continue;
    if ((actor.fleeUntil || 0) > state.tick) continue;
    if (actor.targetId !== null) continue;
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
    if (actor.isPlayer) continue;
    if (actor.carryingId !== null) {
      actor.targetId = null;
      if (actor.state === 'fight') actor.state = 'idle';
      continue;
    }
    if (actor.state !== 'fight') continue;
    if (actor.targetId !== null) continue;
    const target = bestTarget(state, actor);
    if (target) {
      actor.targetId = target.id;
      maybeRaid(state, actor, target, events);
    } else if (actor.waitTargetId === null) {
      actor.state = 'idle';
    }
  }
}

export function updateAI(state, events) {
  updateSquadGoals(state);
  updateLootGoals(state);
  updateCompanionCarry(state);
  if (state.tick % 5 === 0) detectEnemies(state, events);
  claimWaitSlots(state);
  chooseTargets(state, events);
}

function legFactor(actor) {
  // 失った脚は戻らない: 片脚で 0.35、両脚で這うだけ（0.12）
  const m = actor.missing;
  if (m && m.length) {
    const lost = (m.includes('lLeg') ? 1 : 0) + (m.includes('rLeg') ? 1 : 0);
    if (lost >= 2) return 0.12;
    if (lost === 1) return 0.35;
  }
  let bad = 0;
  if (actor.parts.lLeg.hp <= 0) bad += 1;
  if (actor.parts.rLeg.hp <= 0) bad += 1;
  if (bad >= 2) return 0.3;
  if (bad === 1) return 0.6;
  return 1;
}

function runSpeed(actor) {
  const weak = typeof actor.hunger === 'number' && actor.hunger < 25 ? 0.85 : 1;
  if (beastRules(actor)) return 5 * weak;
  return (3.5 + actor.skills.athletics * 0.02) * weak;
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
    if (!isHostile(state, actor.faction, other.faction)) continue;
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
  stepToward(state, actor, actor.x + dirX * 30, actor.z + dirZ * 30, true);
}

function inSquad(state, actor) {
  return actor.faction === 'player' && !!state.squadIds && state.squadIds.includes(actor.id);
}

function isCompanion(state, actor) {
  return !!state.squadIds && state.squadIds.length > 1 && state.squadIds[1] === actor.id;
}

function companionDest(state, actor, byId) {
  if (!isCompanion(state, actor)) return null;
  if (actor.holdAt) {
    if (actor.id === state.playerId) actor.holdAt = null;
    else return actor.holdAt; // 個別に動かした仲間はそこで待つ
  }
  const player = byId.get(state.playerId);
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
const WAIT_RING_EXTRA = 1.2; // 待つ者は 間合い + 1.2m の輪の上

function combatStunned(state, actor) {
  return (actor.flinchUntil || 0) > state.tick || (actor.staggerUntil || 0) > state.tick;
}

function combatBusy(state, actor) {
  return !!actor.swing || (actor.blockUntil || 0) > state.tick || combatStunned(state, actor);
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

function waitTargetValid(state, actor, wt) {
  if (!wt || wt.state === 'dead') return false;
  if (wt.state === 'down' || wt.state === 'getup') return false;
  if (!isHostile(state, actor.faction, wt.faction) && !(state.law && lawHostile(state, actor, wt))) return false;
  if (actor.carryingId !== null) return false;
  return distBetween(actor, wt) <= 30;
}

// 待っている者は、枠が空いたらすぐ入る
function claimWaitSlots(state) {
  const byId = new Map(state.actors.map((a) => [a.id, a]));
  for (const actor of state.actors) {
    if (actor.waitTargetId === null || actor.waitTargetId === undefined) continue;
    if (actor.targetId !== null) {
      actor.waitTargetId = null;
      continue;
    }
    const wt = byId.get(actor.waitTargetId);
    if (!waitTargetValid(state, actor, wt) || actor.state === 'down' || actor.state === 'dead') {
      actor.waitTargetId = null;
      continue;
    }
    if (countTargeters(state, wt.id, actor.id) < ATTACK_SLOT_LIMIT) {
      actor.targetId = wt.id;
      actor.waitTargetId = null;
      actor.state = 'fight';
    }
  }
}

function moveActor(state, actor, byId, squadsById) {
  // 町（bldg1）: 牢・錠前破り・作業中は動かない
  if (state.town && townHold(state, actor)) return;
  // 寝袋で休んでいる者は動かない（命令・戦い・寝袋から離れると rest.js がやめさせる）
  if (actor.resting) {
    if (actor.targetId === null && actor.state === 'idle' && restPlace(state, actor) !== 'ground') {
      actor.moveTo = null;
      setAnim(actor, 'Fall', state.tick);
      return;
    }
    stopRest(actor);
  }
  if ((actor.fleeUntil || 0) > state.tick) {
    fleeMove(state, actor, byId);
    return;
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
    const enemies = state.actors.filter(o => o.id !== actor.id && o.state !== 'dead' && o.state !== 'down' && o.state !== 'getup' && o.carriedBy == null && isHostile(state, actor.faction, o.faction));
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
  const target = actor.targetId !== null ? byId.get(actor.targetId) : null;
  const weaponRange = WEAPONS[actor.weapon].range;
  if (target && target.state !== 'dead') {
    const d = distBetween(actor, target);
    const downTarget = target.state === 'down' || target.state === 'getup';
    const dropDown =
      downTarget && !canHarmDowned(downedHarmKind(actor, target));
    if (dropDown) {
      actor.targetId = null;
      actor.state = 'idle';
    } else if (d > (actor.crossbow ? crossbowRange(actor) : 30) && !actor.isPlayer) {
      actor.targetId = null;
      actor.state = 'idle';
    } else if (rangedMode(actor, d)) {
      // 射手: 射程まで寄り、近すぎれば歩いて下がる。間合いでは止まって構える。
      if (d > crossbowRange(actor) * 0.85) {
        stepToward(state, actor, target.x, target.z, true);
      } else if (d < CROSSBOW.keepDist && !(actor.isPlayer && actor.holdGround)) {
        const ax = actor.x + (actor.x - target.x);
        const az = actor.z + (actor.z - target.z);
        const bx = actor.x;
        const bz = actor.z;
        stepToward(state, actor, ax, az, false);
        if (Math.hypot(actor.x - bx, actor.z - bz) < 0.01) setAnim(actor, 'Idle', state.tick);
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
    } else if (d > weaponRange * 0.9) {
      stepToward(state, actor, target.x, target.z, true);
    } else {
      // 間合いの中: 向き合って、手が空いている時だけ少し横へ回り込む（近すぎれば下がる）
      if (!combatBusy(state, actor) && !actor.isPlayer) {
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
      const d = distBetween(actor, wt);
      const ring = WAIT_RING_EXTRA + weaponRange;
      if (d > ring + 3) stepToward(state, actor, wt.x, wt.z, true);
      else strafe(state, actor, wt, ring, (sideStepPhase(state, actor) || 1) * 0.025);
      faceTarget(actor, wt);
      actor.state = 'fight';
      if (!actor.movedThisTick) setAnim(actor, 'Idle', state.tick);
      return;
    }
    actor.waitTargetId = null;
  }

  // 町（bldg1）: 仲間の作業・衛兵の逮捕・住人の居場所
  if (state.town && townMove(state, actor, byId, stepToward)) return;

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
  const runAt = inSquad(state, actor) ? 0 : 15;
  stepToward(state, actor, dest.x, dest.z, d >= runAt);
  if (actor.moveTo && d <= 0.5) actor.moveTo = null;
}

function faceTarget(actor, target) {
  const dx = target.x - actor.x;
  const dz = target.z - actor.z;
  if (dx * dx + dz * dz > 0.0001) actor.rot = Math.atan2(dx, dz);
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

function stepToward(state, actor, tx, tz, running) {
  // 町（bldg1）: 小屋の出入りは戸口を通る。鍵のかかった扉の前では止まる
  if (state.town) {
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
  const dx = tx - actor.x;
  const dz = tz - actor.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.0001) return;
  const carrying = actor.carryingId !== null;
  const sneaking = !!actor.sneaking;
  const sneakRun = sneaking && running && !carrying && effectiveStealth(state, actor) >= 30;
  let base;
  if (sneaking) {
    base = sneakRun ? runSpeed(actor) * 0.8 : 1.6 * 0.7;
  } else {
    base = carrying || !running ? 1.6 : runSpeed(actor);
  }
  const speed = base * legFactor(actor) * movementLoadMultiplier(loadRatio(actor), carrying);
  const runAnim = sneaking ? sneakRun : running && !carrying;
  const stepLen = Math.min(d, speed * TICK_SEC);
  const baseAngle = Math.atan2(dx, dz);
  const radius = actorRadius(actor);
  const side = actor.avoidSide === -1 ? -1 : 1;
  const offsets = [0];
  for (const deg of DETOUR_DEGREES) {
    const rad = (deg * Math.PI) / 180;
    offsets.push(side * rad);
    offsets.push(-side * rad);
  }
  for (const offset of offsets) {
    const angle = baseAngle + offset;
    const nx = clampWorld(actor.x + Math.sin(angle) * stepLen);
    const nz = clampWorld(actor.z + Math.cos(angle) * stepLen);
    if (blockedAt(state, nx, nz, radius)) continue;
    const moved = Math.hypot(nx - actor.x, nz - actor.z);
    actor.x = nx;
    actor.z = nz;
    actor.rot = angle;
    actor.state = 'move';
    actor.movedRun = runAnim;
    actor.movedCarry = carrying;
    actor.movedThisTick = true;
    actor.movedRunThisTick = runAnim;
    // 振りの途中で踏み込んでも、見た目は振りのまま（走りの絵で振りが消えないように）
    if (!(actor.swing && actor.swing.impactTick >= state.tick)) setAnim(actor, runAnim ? 'Run' : 'Walk', state.tick);
    if (moved < stepLen * 0.5) {
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
    if (actor.carriedBy !== null) continue;
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
  syncCarried(state);
  for (const actor of state.actors) {
    if (actor.carriedBy !== null) continue;
    if (actor.state === 'dead') continue;
    const fixed = resolveCircle(state, actor.x, actor.z, actorRadius(actor));
    actor.x = clampWorld(fixed.x);
    actor.z = clampWorld(fixed.z);
    if (actor.state === 'down' || actor.state === 'getup') continue;
    moveActor(state, actor, byId, squadsById);
  }
  separate(state);
  for (const actor of state.actors) {
    if (actor.carriedBy !== null) continue;
    if (actor.state === 'dead') continue;
    const fixed = resolveCircle(state, actor.x, actor.z, actorRadius(actor));
    actor.x = clampWorld(fixed.x);
    actor.z = clampWorld(fixed.z);
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
