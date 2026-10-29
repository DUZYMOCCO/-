// プレイヤーの命令。積むだけ。実際の適用は次の step の最初。

import { WORLD_HALF, makeEvent } from './data.js';

function clampWorld(v) {
  if (v < -WORLD_HALF + 1) return -WORLD_HALF + 1;
  if (v > WORLD_HALF - 1) return WORLD_HALF - 1;
  return v;
}

export function applyCommand(state, cmd) {
  if (!state || !cmd || typeof cmd.type !== 'string') return false;
  const next = { type: cmd.type };
  if (cmd.type === 'move') {
    const x = Number(cmd.x);
    const z = Number(cmd.z);
    if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
    next.x = Math.round(x * 100) / 100;
    next.z = Math.round(z * 100) / 100;
  } else if (cmd.type === 'attack') {
    const id = Number(cmd.targetId);
    if (!Number.isFinite(id)) return false;
    next.targetId = id;
  } else if (cmd.type !== 'stop') {
    return false;
  }
  state.commandQueue.push(next);
  return true;
}

function findPlayer(state) {
  for (const actor of state.actors) {
    if (actor.id === state.playerId) return actor;
  }
  return null;
}

function applyOne(state, player, cmd, events) {
  if (!player || player.state === 'dead') return;
  if (cmd.type === 'move') {
    player.moveTo = { x: clampWorld(cmd.x), z: clampWorld(cmd.z) };
    player.targetId = null;
    if (player.state !== 'down' && player.state !== 'getup') player.state = 'move';
    return;
  }
  if (cmd.type === 'attack') {
    if (cmd.targetId === player.id) return;
    let target = null;
    for (const actor of state.actors) {
      if (actor.id === cmd.targetId) target = actor;
    }
    if (!target || target.state === 'dead') return;
    player.targetId = target.id;
    player.moveTo = null;
    if (player.state !== 'down' && player.state !== 'getup') player.state = 'fight';
    if (target.faction === 'guard' && state.relations.guard_player !== 'hostile') {
      state.relations.guard_player = 'hostile';
      events.push(makeEvent(state, 'hostile', '衛兵が流れ者を敵とみなした'));
    }
    return;
  }
  if (cmd.type === 'stop') {
    player.moveTo = null;
    player.targetId = null;
    if (player.state !== 'down' && player.state !== 'getup') player.state = 'idle';
  }
}

export function applyQueuedCommands(state, events) {
  if (!state.commandQueue || state.commandQueue.length === 0) return;
  const queue = state.commandQueue;
  state.commandQueue = [];
  const player = findPlayer(state);
  for (const cmd of queue) {
    if (!player) break;
    applyOne(state, player, cmd, events);
  }
}
