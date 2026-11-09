// 筋肉探偵の試合モード（?match=1）で使う、直接操作の基盤。
// Kenshi の「目標へ自動で歩く」経路探索・自動交戦を使わない。
// プレイヤーは入力で直接動いて、技カテゴリを自分のタイミングで出る。
// 相手（AI）は近接のまま寄ってくる。
import { WEAPONS, distBetween, setAnim } from './data.js';
import { clampWorldX, clampWorldZ } from './world_bounds.js';
import { availableMoves, effectiveMartial, moveCategory } from './martial.js';

export const MUSCLE_ACTION_KINDS = ['grapple', 'powerbomb', 'strike', 'submission'];

// 筋肉探偵の試合用コントロール状態を初期化する。
// 通常の Kenshi 世界では controls=false のため、既存の自動行動はそのまま残る。
export function initMuscleControls(state, playerId, enemyId) {
  state.muscle = {
    controls: true,
    playerId: Number.isFinite(playerId) ? playerId : state.playerId,
    enemyId: Number.isFinite(enemyId) ? enemyId : null,
    input: { x: 0, z: 0, run: false },
    pendingAction: null,
    lastAction: null,
  };
  return state.muscle;
}

function ensureMuscle(state) {
  if (!state || typeof state !== 'object') return null;
  if (!state.muscle || typeof state.muscle !== 'object') {
    state.muscle = {
      controls: false,
      playerId: state.playerId ?? null,
      enemyId: null,
      input: { x: 0, z: 0, run: false },
      pendingAction: null,
      lastAction: null,
    };
  }
  if (!state.muscle.input || typeof state.muscle.input !== 'object') {
    state.muscle.input = { x: 0, z: 0, run: false };
  }
  return state.muscle;
}

export function setMuscleInput(state, input = {}) {
  const controls = ensureMuscle(state);
  if (!controls) return false;
  let x = Number(input.x ?? 0);
  let z = Number(input.z ?? 0);
  if (!Number.isFinite(x)) x = 0;
  if (!Number.isFinite(z)) z = 0;
  const len = Math.hypot(x, z);
  if (len > 1) {
    x /= len;
    z /= len;
  }
  controls.input = { x, z, run: Boolean(input.run) };
  return true;
}

export function queueMuscleAction(state, kind) {
  const controls = ensureMuscle(state);
  if (!controls?.controls || !MUSCLE_ACTION_KINDS.includes(kind)) return false;
  controls.pendingAction = kind;
  controls.pendingSince = state.tick;
  return true;
}

function findActor(state, id) {
  return state?.actors?.find((a) => a.id === id) || null;
}

function busyForDirectControl(state, actor) {
  return Boolean(
    actor.martialPair ||
    actor.swing ||
    actor.state === 'down' ||
    actor.state === 'getup' ||
    actor.state === 'dead' ||
    (actor.flinchUntil || 0) > state.tick ||
    (actor.staggerUntil || 0) > state.tick ||
    (actor.blockUntil || 0) > state.tick ||
    (actor.dazeUntil || 0) > state.tick,
  );
}

function pickMove(kind, moves) {
  if (kind === 'powerbomb') {
    return moves.find((m) => m.id === 'powerbomb') || moves[0];
  }
  if (kind === 'grapple') {
    return moves.find((m) => m.id === 'pile_driver') || [...moves].sort((a, b) => Math.max(...b.powers) - Math.max(...a.powers))[0];
  }
  if (kind === 'submission') {
    return moves.find((m) => m.id === 'armbar') || moves.find((m) => m.id === 'kimura') || moves[0];
  }
  return moves.find((m) => m.id === 'palm') || moves.find((m) => m.id === 'bad_punch') || moves[0];
}

function tryAction(state, player, enemy, kind) {
  const controls = state.muscle;
  const reject = (reason) => {
    controls.lastAction = { kind, accepted: false, reason, tick: state.tick };
    return false;
  };

  if (!player || !enemy) return reject('actor');
  const targetDown = enemy.state === 'down' || enemy.state === 'getup';
  const canHitDowned = targetDown && kind === 'strike' && enemy.knocked;
  if (enemy.state === 'dead' || enemy.martialPair || (targetDown && !canHitDowned)) {
    return reject('target');
  }
  if (busyForDirectControl(state, player) || (player.attackCd || 0) > 0 || player.carryingId !== null) {
    return reject('cooldown');
  }

  const level = effectiveMartial(state, player);
  const allMoves = availableMoves(player, level);
  const pool = kind === 'powerbomb'
    ? allMoves.filter((m) => m.id === 'powerbomb')
    : allMoves.filter((m) => moveCategory(m) === kind);
  if (!pool.length) return reject('move');

  const move = pickMove(kind, pool);
  const range = Number.isFinite(move?.range) ? move.range : (WEAPONS.fists?.range || 1.8);
  const distance = distBetween(player, enemy);
  if (distance > range + 0.001) return reject('range');

  player.rot = Math.atan2(enemy.x - player.x, enemy.z - player.z);
  player.martialDemoMoveId = move.id;
  player.targetId = enemy.id;
  player.orderedTargetId = enemy.id;
  player.waitTargetId = null;
  player.engageId = enemy.id;
  player.moveTo = null;
  player.attackCd = 0;
  player.state = 'fight';
  player.muscleAttacking = true;
  player.muscleAttackTick = state.tick;
  controls.lastAction = { kind, accepted: true, moveId: move.id, tick: state.tick };
  return true;
}

function clearAttackIntent(player) {
  player.targetId = null;
  player.orderedTargetId = null;
  player.waitTargetId = null;
  player.muscleAttacking = false;
  player.muscleAttackTick = -1;
}

export function updateMuscleControls(state) {
  const controls = ensureMuscle(state);
  if (!controls || controls.controls !== true) return false;

  const player = findActor(state, controls.playerId);
  const enemy = findActor(state, controls.enemyId);
  if (!player || !enemy) return false;

  // 1) 発動した技が始まったら、プレイヤーに自動で狙いを戻さない。
  if (player.muscleAttacking) {
    const started = Boolean(player.swing || player.martialPair);
    if (started) {
      clearAttackIntent(player);
      return true;
    }
    if ((state.tick - (player.muscleAttackTick || state.tick)) > 15) {
      clearAttackIntent(player);
      player.moveTo = null;
      player.state = 'idle';
      setAnim(player, 'Idle', state.tick);
      return true;
    }
    // 攻撃リクエスト待ちの間は勝手に寄らない（直接操作の原則）。
    player.moveTo = null;
    return true;
  }

  if (busyForDirectControl(state, player)) {
    player.moveTo = null;
    return false;
  }

  // 2) 入力がある間だけ近くの点へ進む。入力が無い間は目的地を保持しない。
  if (controls.pendingAction) {
    const kind = controls.pendingAction;
    const queuedAt = controls.pendingSince ?? state.tick;
    controls.pendingAction = null;
    controls.pendingSince = null;
    if (tryAction(state, player, enemy, kind)) return true;
    // 倒れ／クールダウン中は入力を捨てず、立ち上がったらすぐ出るようにする。
    if ((controls.lastAction?.reason === 'target' || controls.lastAction?.reason === 'cooldown') &&
        state.tick - queuedAt <= 60) {
      controls.pendingAction = kind;
      controls.pendingSince = queuedAt;
    }
    // range/move 等で発動できない場合は、入力による移動に移る。
  }

  const input = controls.input || { x: 0, z: 0, run: false };
  const len = Math.hypot(input.x || 0, input.z || 0);
  if (len <= 0.05) {
    player.moveTo = null;
    player.targetId = null;
    player.orderedTargetId = null;
    player.waitTargetId = null;
    if (player.state === 'fight' || player.state === 'move') player.state = 'idle';
    setAnim(player, 'Idle', state.tick);
    return false;
  }

  const ux = (input.x || 0) / len;
  const uz = (input.z || 0) / len;
  player.targetId = null;
  player.orderedTargetId = null;
  player.waitTargetId = null;
  player.muscleDirect = true;
  player.muscleRun = Boolean(input.run);
  player.moveTo = {
    x: clampWorldX(player.x + ux * 2.5),
    z: clampWorldZ(player.z + uz * 2.5),
  };
  player.state = 'move';
  return true;
}
