// 投げペアの位置は固定データとtickから計算し、描画fpsや乱数に依存させない。
import { MARTIAL_CLIP_META } from '../data/martial_moves.js';
import { actorRadius, resolveCircle } from './collide.js';
import { clampWorldX, clampWorldZ } from './world_bounds.js';
import { martialRecoveryLevel, martialRecoveryTicks } from './martial_recovery.js';

const TICK_SEC = 0.1;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

function pathAt(path, duration, time) {
  if (!Array.isArray(path) || path.length === 0) return [0, 0];
  if (path.length === 1 || !(duration > 0)) return path[0];
  const p = clamp(time / duration, 0, 1) * (path.length - 1);
  const i = Math.min(path.length - 2, Math.floor(p));
  const f = p - i;
  return [
    path[i][0] + (path[i + 1][0] - path[i][0]) * f,
    path[i][1] + (path[i + 1][1] - path[i][1]) * f,
  ];
}

function rotate([x, z], yaw) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return [x * c + z * s, -x * s + z * c];
}

function safePosition(state, actor, x, z) {
  const fixed = resolveCircle(state, x, z, actorRadius(actor), actor);
  actor.x = clampWorldX(fixed.x);
  actor.z = clampWorldZ(fixed.z);
}

function applyPose(state, pair, attacker, victim, time) {
  const attackerClip = MARTIAL_CLIP_META[pair.clip];
  const victimClip = MARTIAL_CLIP_META[pair.victimClip];
  const rootA = rotate(pathAt(attackerClip.rootPath, attackerClip.duration, time), pair.rot);
  const rootV = rotate(pathAt(victimClip.rootPath, victimClip.duration, time), pair.rot + pair.yaw);
  const offset = rotate(pair.offset, pair.rot);
  const x = pair.baseX + rootA[0];
  const z = pair.baseZ + rootA[1];
  safePosition(state, attacker, x, z);
  // 受け側は攻め側の「根元の位置」(base)から置く。攻め側自身の移動量(rootA)は足さない。
  safePosition(state, victim, pair.baseX + offset[0] + rootV[0], pair.baseZ + offset[1] + rootV[1]);
  attacker.rot = pair.rot;
  victim.rot = pair.rot + pair.yaw;
}

function endPair(state, attacker, victim, pair) {
  attacker.martialPair = null;
  attacker.maClip = null;
  attacker.maPlayFrom = 0;
  attacker.anim = 'Idle';
  attacker.animTick = state.tick;
  attacker.maInterruptAnimTick = state.tick;
  if (!victim) return;
  victim.martialPair = null;
  victim.targetId = null;
  victim.moveTo = null;
  victim.swing = null;
  victim.maPairClip = null;
  // 投げの途中でKOした相手は、通常の気絶・長い起床時間をそのまま使う。
  if (victim.state === 'dead' || victim.maDownClip === 'Knocked Out') return;
  victim.state = 'down';
  const recoveryLevel = martialRecoveryLevel(victim);
  victim.martialRecovery = true;
  victim.downTicks = martialRecoveryTicks(20, recoveryLevel);
  victim.downPose = pair.endPose || 'supine';
  victim.maDownClip = pair.victimClip;
  victim.maDownPlayFrom = pair.playFrom;
  victim.maDownRate = pair.rate;
  victim.maGetUpRate = 1;
  victim.maGetUpPlayFrom = 0;
  victim.anim = 'Fall';
  victim.animTick = state.tick;
}

export function beginMartialPair(state, attacker, victim, move, clip, rate, level) {
  const attackerClip = MARTIAL_CLIP_META[clip];
  const victimClipName = move.victimClip;
  const victimClip = MARTIAL_CLIP_META[victimClipName];
  if (!attackerClip?.rootPath || !victimClip?.rootPath || victim.state === 'dead' || victim.state === 'down' || victim.state === 'getup') return null;
  const distance = Math.hypot(victim.x - attacker.x, victim.z - attacker.z);
  if (distance > move.range) return null;
  const playFrom = Number(move.playFrom ?? attackerClip.playFrom) || 0;
  const yaw = (Number(attackerClip.pairYawDeg) || 0) * Math.PI / 180;
  const initialRoot = rotate(pathAt(attackerClip.rootPath, attackerClip.duration, playFrom), attacker.rot || 0);
  const pair = {
    id: `${attacker.id}:${state.tick}:${move.id}`,
    moveId: move.id,
    targetId: victim.id,
    clip,
    victimClip: victimClipName,
    startTick: state.tick,
    baseX: attacker.x - initialRoot[0],
    baseZ: attacker.z - initialRoot[1],
    rot: attacker.rot || 0,
    yaw,
    offset: attackerClip.pairOffset,
    playFrom,
    duration: attackerClip.duration,
    grabTime: Number(attackerClip.grabTime) || 0,
    endPose: victimClip.endPose || 'supine',
    rate,
    range: move.range,
    grabbed: false,
    level,
    endTick: state.tick + Math.ceil(Math.max(0, attackerClip.duration - playFrom) / (TICK_SEC * rate)),
    grabTick: state.tick + Math.ceil(Math.max(0, (Number(attackerClip.grabTime) || 0) - playFrom) / (TICK_SEC * rate)),
  };
  attacker.martialPair = { ...pair, role: 'attacker' };
  victim.martialPair = { ...pair, role: 'victim' };
  attacker.martialThrowShieldLevel = level;
  attacker.martialThrowShieldUntil = level >= 50 ? pair.endTick : 0;
  victim.targetId = null;
  victim.moveTo = null;
  victim.swing = null;
  victim.maClip = victimClipName;
  victim.maPairClip = victimClipName;
  victim.maPlayFrom = playFrom;
  victim.maRate = rate;
  victim.anim = 'MA';
  victim.animTick = state.tick;
  applyPose(state, pair, attacker, victim, playFrom);
  return pair;
}

export function advanceMartialPairs(state) {
  for (const actor of state.actors) {
    if (!actor.martialPair && (actor.martialThrowShieldUntil || 0) < state.tick) {
      actor.martialThrowShieldUntil = 0;
      actor.martialThrowShieldLevel = 0;
    }
  }
  const byId = new Map(state.actors.map((actor) => [actor.id, actor]));
  for (const attacker of state.actors) {
    const pair = attacker.martialPair;
    if (!pair || pair.role !== 'attacker') continue;
    const victim = byId.get(pair.targetId);
    if (attacker.state === 'dead' || !victim || victim.state === 'dead') {
      attacker.martialPair = null;
      if (victim?.martialPair?.id === pair.id) victim.martialPair = null;
      attacker.martialThrowShieldUntil = 0;
      attacker.martialThrowShieldLevel = 0;
      continue;
    }
    const time = Math.min(pair.duration, pair.playFrom + Math.max(0, state.tick - pair.startTick) * TICK_SEC * pair.rate);
    applyPose(state, pair, attacker, victim, time);
    if (state.tick >= pair.grabTick) {
      pair.grabbed = true;
      if (victim.martialPair?.id === pair.id) victim.martialPair.grabbed = true;
    }
    if (state.tick >= pair.endTick) endPair(state, attacker, victim, pair);
  }
}
