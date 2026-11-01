import { ATTACK_SLOT_LIMIT, WEAPONS, beastRules, distBetween } from './data.js';
import { actorRadius } from './collide.js';
import { rangedMode, thrownMode } from './crossbow.js';
import { weaponOf } from './melee.js';
import { mixHash } from './hitreact.js';
import { raceOf } from './races.js';

export const SURROUND = Object.freeze({
  engageExtra: 1.0,
  holdExtra: 1.5,
  ringGap: 3.0,
  cleaveMargin: 1.2,
  ringMax: 7.0,
  waitStopExtra: 0.5,
  rangedRingExtra: 2.0,
  joinDelayMin: 5,
  joinDelayMax: 15,
  maxAngleStep: 0.12,
  waitWobble: 0.08,
});

const TAU = Math.PI * 2;

function numericId(value) {
  if (Number.isFinite(Number(value))) return Number(value) | 0;
  let hash = 2166136261;
  const text = String(value ?? '');
  for (let i = 0; i < text.length; i += 1) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return hash | 0;
}

function normalizedAngle(angle) {
  let a = angle % TAU;
  if (a < 0) a += TAU;
  return a;
}

export function compareActorIds(a, b) {
  const an = Number(a);
  const bn = Number(b);
  if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
  return String(a).localeCompare(String(b));
}

function angleBetween(a, b) {
  const d = normalizedAngle(a - b);
  return Math.min(d, TAU - d);
}

export function attackSlotsFor(state, target) {
  if (!target) return ATTACK_SLOT_LIMIT;
  let extra = beastRules(target) && actorRadius(target) >= 0.6 ? 1 : 0;
  const raceExtra = Number(raceOf(target)?.extraAttackSlots) || 0;
  const instanceExtra = Number(target.extraAttackSlots) || 0;
  const speciesExtra = Number(target.species?.extraAttackSlots) || 0;
  extra += Math.max(0, Math.floor(raceExtra));
  extra += Math.max(0, Math.floor(instanceExtra));
  extra += Math.max(0, Math.floor(speciesExtra));
  return Math.min(5, ATTACK_SLOT_LIMIT + extra);
}

export function rangedForTarget(actor, target) {
  if (!actor || !target) return false;
  const d = distBetween(actor, target);
  return rangedMode(actor, d) || thrownMode(actor, d);
}

export function waitRingRadius(state, actor, target) {
  if (!actor || !target) return SURROUND.ringGap;
  const ownRange = weaponOf(actor)?.range || WEAPONS.fists.range;
  const targetSwingReach = (weaponOf(target)?.range || WEAPONS.fists.range) * 1.25 + actorRadius(target);
  return Math.min(
    SURROUND.ringMax,
    Math.max(ownRange + SURROUND.ringGap, targetSwingReach + SURROUND.cleaveMargin)
  );
}

// 反撃扱い（枠の外でも狙いを持てる）: 直近20tick以内に殴られた相手か、
// その相手がこちらを狙って待ちの輪の内側まで来ている時（待ち手が追われて逃げ回らないように）。
export function isRecentCounter(state, actor, targetId) {
  if (!actor) return false;
  if (actor.lastAttackerId === targetId && actor.lastAttackedTick != null &&
    state.tick - actor.lastAttackedTick <= 20) return true;
  const target = state.actors.find((other) => other.id === targetId);
  if (!target || target.targetId !== actor.id || target.state === 'dead' || target.state === 'down' || target.state === 'getup') return false;
  // 待ちの輪の内側まで詰め寄られたら受けて立つ
  return distBetween(actor, target) <= waitRingRadius(state, actor, target) - 0.3;
}

// 1人を同時に狙える数（近接枠 + 射手）。射手は近接枠を使わないが、ここで頭打ちにする。
export function engageCap(state, target) {
  return Math.max(ATTACK_SLOT_LIMIT + 1, attackSlotsFor(state, target));
}

export function engagedCount(state, targetId, excludeId = null) {
  let n = 0;
  for (const actor of state.actors) {
    if (actor.id === excludeId || actor.state === 'dead') continue;
    if (actor.targetId === targetId) n += 1;
  }
  return n;
}

// 射手がこの相手を狙う余地があるか
export function rangedRoom(state, actor, target) {
  return engagedCount(state, target.id, actor.id) < engageCap(state, target);
}

export function meleeSlotHolders(state, targetId, excludeId = null) {
  const target = state.actors.find((actor) => actor.id === targetId);
  if (!target) return [];
  return state.actors.filter((actor) => {
    if (actor.id === excludeId || actor.targetId !== targetId) return false;
    if (actor.state === 'dead' || actor.state === 'down' || actor.state === 'getup') return false;
    if (actor.carryingId != null || actor.martialPair) return false;
    if (rangedForTarget(actor, target)) return false;
    const range = weaponOf(actor)?.range || WEAPONS.fists.range;
    const extra = actor.surroundSlotTargetId === targetId ? SURROUND.holdExtra : SURROUND.engageExtra;
    return distBetween(actor, target) <= range + extra;
  });
}

export function surroundJoinTable(state) {
  if (!state.surroundJoins || typeof state.surroundJoins !== 'object' || Array.isArray(state.surroundJoins)) {
    state.surroundJoins = {};
  }
  return state.surroundJoins;
}

export function joinForTarget(state, targetId) {
  return surroundJoinTable(state)[targetId] || null;
}

export function clearJoinForTarget(state, targetId) {
  delete surroundJoinTable(state)[targetId];
}

export function setJoinForTarget(state, targetId, join) {
  surroundJoinTable(state)[targetId] = join;
}

export function joinDelayTicks(state, targetId, actorId, openedTick) {
  const span = SURROUND.joinDelayMax - SURROUND.joinDelayMin + 1;
  return SURROUND.joinDelayMin + (mixHash(numericId(targetId), numericId(actorId), openedTick | 0) % span);
}

function gridAngles(targetId, signature, count) {
  if (count <= 0) return [];
  let signatureHash = 2166136261;
  for (let i = 0; i < signature.length; i += 1) {
    signatureHash = Math.imul(signatureHash ^ signature.charCodeAt(i), 16777619);
  }
  const offset = (mixHash(numericId(targetId), signatureHash | 0, count) / 4294967296) * TAU;
  const step = TAU / count;
  return Array.from({ length: count }, (_, i) => normalizedAngle(offset + i * step));
}

function chooseHolderGridIndices(holderAngles, grid) {
  const holders = holderAngles.length;
  const total = grid.length;
  if (holders === 0) return new Set();
  if (holders >= total) return new Set(grid.map((_, index) => index));

  let best = null;
  let bestScore = Infinity;
  const chosen = [];
  const evaluate = () => {
    const remaining = grid.map((_, index) => index).filter((index) => !chosen.includes(index));
    let waitX = 0;
    let waitZ = 0;
    for (const index of remaining) {
      waitX += Math.sin(grid[index]);
      waitZ += Math.cos(grid[index]);
    }
    const spread = remaining.length > 1 ? Math.hypot(waitX, waitZ) / remaining.length : 0;
    let matchCost = Infinity;
    const used = new Set();
    const match = (holderIndex, cost) => {
      if (holderIndex >= holders) {
        if (cost < matchCost) matchCost = cost;
        return;
      }
      for (const index of chosen) {
        if (used.has(index)) continue;
        used.add(index);
        match(holderIndex + 1, cost + angleBetween(holderAngles[holderIndex], grid[index]));
        used.delete(index);
      }
    };
    match(0, 0);
    const score = (remaining.length > 1 ? spread * 4 : 0) + matchCost / (holders * Math.PI);
    const key = chosen.join(',');
    if (score < bestScore || (score === bestScore && (!best || key < best.join(',')))) {
      bestScore = score;
      best = [...chosen];
    }
  };

  const choose = (start) => {
    if (chosen.length === holders) { evaluate(); return; }
    for (let index = start; index <= total - (holders - chosen.length); index += 1) {
      chosen.push(index);
      choose(index + 1);
      chosen.pop();
    }
  };

  if (total <= 20) {
    choose(0);
    return new Set(best || []);
  }

  // 大人数の時は近い枠から決める。小さな通常戦では上の全探索で待機側を均等にする。
  const remaining = new Set(grid.map((_, index) => index));
  const ordered = [...holderAngles].sort((a, b) => a - b);
  for (const angle of ordered) {
    let chosenIndex = null;
    let bestDistance = Infinity;
    for (const index of remaining) {
      const distance = angleBetween(angle, grid[index]);
      if (distance < bestDistance || (distance === bestDistance && index < chosenIndex)) {
        chosenIndex = index;
        bestDistance = distance;
      }
    }
    if (chosenIndex !== null) remaining.delete(chosenIndex);
  }
  return new Set(grid.map((_, index) => index).filter((index) => !remaining.has(index)));
}

export function updateWaitAssignments(state, target) {
  if (!target) return [];
  if (!state.surroundAssignments || typeof state.surroundAssignments !== 'object' || Array.isArray(state.surroundAssignments)) {
    state.surroundAssignments = {};
  }
  const holders = meleeSlotHolders(state, target.id).slice().sort((a, b) => compareActorIds(a.id, b.id));
  const waiters = state.actors.filter((actor) => actor.waitTargetId === target.id && actor.targetId == null &&
    actor.state !== 'dead' && actor.state !== 'down' && actor.state !== 'getup' && !actor.martialPair &&
    actor.carryingId == null && !rangedForTarget(actor, target));
  waiters.sort((a, b) => compareActorIds(a.id, b.id));
  const holderIds = holders.map((actor) => actor.id);
  const waiterIds = waiters.map((actor) => actor.id);
  const signature = `h:${holderIds.join(',')}|w:${waiterIds.join(',')}`;
  const key = String(target.id);
  const previous = state.surroundAssignments[key];
  if (previous?.signature === signature && waiters.every((actor) => actor.surroundAssignedTargetId === target.id && Number.isFinite(actor.surroundAssignedAngle))) {
    return waiters;
  }

  const total = holders.length + waiters.length;
  const grid = gridAngles(target.id, signature, total);
  const holderAngles = holders.map((actor) => ({
    actor,
    angle: normalizedAngle(Math.atan2(actor.x - target.x, actor.z - target.z)),
  })).sort((a, b) => a.angle - b.angle || compareActorIds(a.actor.id, b.actor.id));
  const holderSlots = chooseHolderGridIndices(holderAngles.map((holder) => holder.angle), grid);
  const remaining = new Set(grid.map((_, index) => index).filter((index) => !holderSlots.has(index)));
  const available = Array.from(remaining).sort((a, b) => grid[a] - grid[b]);
  for (let i = 0; i < waiters.length; i += 1) {
    const actor = waiters[i];
    actor.surroundAssignedTargetId = target.id;
    actor.surroundAssignedAngle = grid[available[i]] ?? normalizedAngle((i / Math.max(1, waiters.length)) * TAU);
  }
  state.surroundAssignments[key] = { signature };
  return waiters;
}

export function assignedWaitAngle(state, actor, target) {
  updateWaitAssignments(state, target);
  return actor?.surroundAssignedTargetId === target?.id && Number.isFinite(actor.surroundAssignedAngle)
    ? actor.surroundAssignedAngle
    : null;
}

export function clearWaitAssignment(actor) {
  if (!actor) return;
  actor.surroundAssignedTargetId = null;
  actor.surroundAssignedAngle = null;
}
