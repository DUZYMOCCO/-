// プレイヤーの命令。積むだけ。実際の適用は次の step の最初。

import { WORLD_HALF, makeEvent, canHarmDowned } from './data.js';
import { drop } from './carry.js';
import { assassinationTargetExists } from './stealth.js';
import { answerDemand } from './spawning.js';
import { startTask } from './abduct.js';
import { buyKit, repOf, GUARD_ATTACKED_REP } from './medkit.js';
import { placeBedroll, packBedroll, startRest, stopRest } from './rest.js';
import { boxById, houseById } from './town.js';
import { answerArrest } from './law.js';

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
  } else if (cmd.type === 'pickup') {
    const id = Number(cmd.targetId);
    if (!Number.isFinite(id)) return false;
    next.targetId = id;
  } else if (cmd.type === 'sneak') {
    next.on = !!cmd.on;
  } else if (cmd.type === 'lantern') {
    // id を指定すればその仲間だけ、なければ一行全員の灯りを点ける／消す。
    next.on = !!cmd.on;
    if (cmd.id !== undefined && cmd.id !== null) {
      const id = Number(cmd.id);
      if (!Number.isFinite(id)) return false;
      next.id = id;
    }
  } else if (cmd.type === 'assassinate') {
    const id = Number(cmd.targetId);
    if (!Number.isFinite(id)) return false;
    const player = findPlayer(state);
    if (!player || player.state === 'dead' || !player.sneaking) return false;
    if (id === player.id || !assassinationTargetExists(state, id)) return false;
    next.targetId = id;
  } else if (cmd.type === 'demand') {
    // 野盗の通行料に答える（pay: true で払う、false で断る）
    if (!state.spawn || !state.spawn.demand) return false;
    next.pay = !!cmd.pay;
  } else if (cmd.type === 'treat' || cmd.type === 'free' || cmd.type === 'buyMedkit') {
    // 手当て（血を止めるだけ）／縄をほどく（abduct.js）
    const id = Number(cmd.targetId);
    if (!Number.isFinite(id)) return false;
    next.targetId = id;
  } else if (cmd.type === 'buyKit') {
    const id = Number(cmd.targetId);
    if (!Number.isFinite(id)) return false;
    next.targetId = id;
    next.tier = cmd.tier === 'standard' ? 'standard' : 'basic';
  } else if (cmd.type === 'door') {
    // 町（bldg1）: 扉を開け閉めする（want: true 開ける / false 閉める / 無し 切り替え）
    if (!state.town || !houseById(state, String(cmd.houseId))) return false;
    next.houseId = String(cmd.houseId);
    if (cmd.want !== undefined && cmd.want !== null) next.want = !!cmd.want;
  } else if (cmd.type === 'pick') {
    if (!state.town) return false;
    if (cmd.kind !== 'door' && cmd.kind !== 'box') return false;
    const id = String(cmd.id);
    if (cmd.kind === 'door' ? !houseById(state, id) : !boxById(state, id)) return false;
    next.kind = cmd.kind;
    next.id = id;
  } else if (cmd.type === 'steal') {
    if (!state.town || !boxById(state, String(cmd.boxId))) return false;
    next.boxId = String(cmd.boxId);
    if (typeof cmd.good === 'string' && cmd.good) next.good = cmd.good;
    next.all = !!cmd.all;
  } else if (cmd.type === 'pickpocket') {
    if (!state.town) return false;
    const id = Number(cmd.targetId);
    if (!Number.isFinite(id)) return false;
    next.targetId = id;
  } else if (cmd.type === 'arrest') {
    if (!state.law || !state.law.arrest || state.law.arrest.stage !== 'ask') return false;
    if (cmd.choice !== 'pay' && cmd.choice !== 'jail' && cmd.choice !== 'resist') return false;
    next.choice = cmd.choice;
  } else if (cmd.type !== 'stop' && cmd.type !== 'drop' && cmd.type !== 'placeBedroll' && cmd.type !== 'packBedroll' && cmd.type !== 'rest') {
    return false;
  }
  // actorId: 選んでいる・追っている仲間に命令する（無ければ操作中の者）
  if (ROUTED.has(cmd.type) && cmd.actorId !== undefined && cmd.actorId !== null) {
    const aid = Number(cmd.actorId);
    if (!Number.isFinite(aid)) return false;
    next.actorId = aid;
  }
  state.commandQueue.push(next);
  return true;
}

const ROUTED = new Set(['move', 'attack', 'pickup', 'stop', 'drop', 'treat', 'free', 'buyMedkit', 'buyKit', 'placeBedroll', 'packBedroll', 'rest', 'door', 'pick', 'steal', 'pickpocket']);
const TOWN_CMDS = new Set(['door', 'pick', 'steal', 'pickpocket']);

// 命令を受ける者: actorId が生きている自分の部隊の者ならその者、でなければ操作中の者
export function commandActor(state, cmd, player) {
  if (cmd.actorId === undefined || cmd.actorId === null || !ROUTED.has(cmd.type)) return player;
  const ids = Array.isArray(state.squadIds) && state.squadIds.length ? state.squadIds : [state.playerId];
  if (!ids.includes(cmd.actorId)) return player;
  const a = findActor(state, cmd.actorId);
  if (!a || a.state === 'dead' || a.faction !== 'player') return player;
  return a;
}

function findPlayer(state) {
  for (const actor of state.actors) {
    if (actor.id === state.playerId) return actor;
  }
  return null;
}

function findActor(state, id) {
  for (const actor of state.actors) {
    if (actor.id === id) return actor;
  }
  return null;
}

function clearAssassination(actor) {
  actor.assassinTargetId = null;
  actor.assassinTicks = 0;
}

function applyOne(state, player, cmd, events) {
  if (cmd.type === 'lantern') {
    const squad =
      Array.isArray(state.squadIds) && state.squadIds.length > 0
        ? state.squadIds
        : player
          ? [player.id]
          : [];
    const ids = cmd.id !== undefined ? squad.filter((id) => id === cmd.id) : squad;
    let changed = false;
    for (const id of ids) {
      const member = findActor(state, id);
      if (!member || member.state === 'dead') continue;
      if (member.lantern !== cmd.on) changed = true;
      member.lantern = cmd.on;
    }
    if (changed) {
      const who = ids.length === 1 ? (findActor(state, ids[0]) || {}).name + 'が' : '';
      events.push(makeEvent(state, 'stealth', who + (cmd.on ? '灯りを点けた' : '灯りを消した')));
    }
    return;
  }
  if (cmd.type === 'arrest') {
    answerArrest(state, cmd.choice, events);
    return;
  }
  if (!player || player.state === 'dead') return;
  // 牢の中では何もできない（隠密の切り替えだけ）
  if (player.jail && cmd.type !== 'sneak') return;
  // 町の作業（扉・錠前・盗み・スリ）は、ほかの命令で取りやめ
  if (cmd.type !== 'sneak' && (player.townTask || player.pick)) {
    player.townTask = null;
    player.pick = null;
  }
  if (TOWN_CMDS.has(cmd.type)) {
    if (player.state === 'down' || player.state === 'getup') return;
    if (player.resting) stopRest(player);
    clearAssassination(player);
    player.task = null;
    player.moveTo = null;
    player.targetId = null;
    player.carryTargetId = null;
    player.holdAt = null;
    if (cmd.type === 'door') player.townTask = { kind: 'door', house: cmd.houseId, want: cmd.want, stage: 'walk' };
    else if (cmd.type === 'pick') {
      const box = cmd.kind === 'box' ? boxById(state, cmd.id) : null;
      player.townTask = cmd.kind === 'door' ? { kind: 'pick', door: true, house: cmd.id, stage: 'walk' } : { kind: 'pick', box: cmd.id, house: box ? box.house : null, stage: 'walk' };
    } else if (cmd.type === 'steal') player.townTask = { kind: 'steal', box: cmd.boxId, good: cmd.good || null, all: !!cmd.all, stage: 'walk' };
    else if (cmd.type === 'pickpocket') {
      if (cmd.targetId === player.id) return;
      player.townTask = { kind: 'pickpocket', targetId: cmd.targetId, stage: 'walk' };
    }
    player.state = 'move';
    return;
  }
  // 休んでいる者は、休め以外の命令で起きる（隠密・灯りはそのまま）
  if (player.resting && cmd.type !== 'rest' && cmd.type !== 'sneak') stopRest(player);
  if (cmd.type === 'placeBedroll') {
    placeBedroll(state, player, events);
    return;
  }
  if (cmd.type === 'packBedroll') {
    packBedroll(state, player, events);
    return;
  }
  if (cmd.type === 'rest') {
    if (player.carryingId !== null) return;
    clearAssassination(player);
    startRest(state, player, events);
    return;
  }
  if (cmd.type === 'buyKit') {
    buyKit(state, player, findActor(state, cmd.targetId), events, cmd.tier);
    return;
  }
  if (cmd.type === 'sneak') {
    const on = !!cmd.on;
    const ids =
      Array.isArray(state.squadIds) && state.squadIds.length > 0
        ? state.squadIds
        : [player.id];
    let changed = false;
    for (const id of ids) {
      const member = findActor(state, id);
      if (!member || member.state === 'dead') continue;
      member.sneaking = on;
      changed = true;
    }
    if (changed) {
      events.push(makeEvent(state, 'stealth', on ? '隠密を始めた' : '隠密をやめた'));
    }
    return;
  }
  if (cmd.type === 'assassinate') {
    if (!player.sneaking) return;
    if (cmd.targetId === player.id) return;
    if (!assassinationTargetExists(state, cmd.targetId)) return;
    const target = findActor(state, cmd.targetId);
    if (!target) return;
    player.assassinTargetId = target.id;
    player.assassinTicks = 0;
    player.targetId = null;
    player.moveTo = null;
    player.carryTargetId = null;
    return;
  }
  if (cmd.type === 'buyMedkit') {
    // 商人から手当ての道具を1箱買う（近くにいる時だけ。代金は部隊の所持金から）
    buyKit(state, player, findActor(state, cmd.targetId), events);
    return;
  }
  if (cmd.type === 'treat' || cmd.type === 'free') {
    if (player.state === 'down' || player.state === 'getup') return;
    if (player.carryingId !== null) return;
    const target = findActor(state, cmd.targetId);
    if (!target) return;
    clearAssassination(player);
    player.carryTargetId = null;
    startTask(state, player, cmd.type, target);
    return;
  }
  if (cmd.type === 'move') {
    clearAssassination(player);
    player.task = null;
    // 操作中でない仲間は、行った先で待つ（止まれ＝stop でまた付いてくる）
    player.holdAt = player.id !== state.playerId ? { x: clampWorld(cmd.x), z: clampWorld(cmd.z) } : null;
    player.moveTo = { x: clampWorld(cmd.x), z: clampWorld(cmd.z) };
    player.targetId = null;
    player.carryTargetId = null;
    if (player.state !== 'down' && player.state !== 'getup') player.state = 'move';
    return;
  }
  if (cmd.type === 'attack') {
    if (cmd.targetId === player.id) return;
    clearAssassination(player);
    let target = null;
    for (const actor of state.actors) {
      if (actor.id === cmd.targetId) target = actor;
    }
    if (!target || target.state === 'dead') return;
    // 気絶して倒れている者は斬らない（担ぐ・食べるは別の仕組み）
    if ((target.state === 'down' || target.state === 'getup') && !canHarmDowned('attack')) {
      events.push(makeEvent(state, 'combat', target.name + 'は倒れている。斬らない'));
      return;
    }
    player.carryTargetId = null;
    if (player.carryingId !== null) drop(state, player, events);
    player.targetId = target.id;
    player.moveTo = null;
    if (player.state !== 'down' && player.state !== 'getup') player.state = 'fight';
    const lawFight = !!(state.law && state.law.fight && state.law.fight[player.id]);
    if (target.faction === 'guard' && !lawFight && state.relations.guard_player !== 'hostile') {
      state.relations.guard_player = 'hostile';
      if (!state.rep) state.rep = {};
      state.rep.guard = Math.min(repOf(state, 'guard'), GUARD_ATTACKED_REP);
      events.push(makeEvent(state, 'hostile', '衛兵が流れ者を敵とみなした'));
    }
    return;
  }
  if (cmd.type === 'pickup') {
    if (player.state === 'down' || player.state === 'getup') return;
    if (player.carryingId !== null) return;
    if (cmd.targetId === player.id) return;
    let target = null;
    for (const actor of state.actors) {
      if (actor.id === cmd.targetId) target = actor;
    }
    if (!target) return;
    if (target.state !== 'down' && target.state !== 'dead') return;
    if (target.carriedBy !== null) return;
    if (target.bound) return; // 先に縄を解く
    player.carryTargetId = target.id;
    player.targetId = null;
    player.moveTo = null;
    player.state = 'move';
    return;
  }
  if (cmd.type === 'demand') {
    answerDemand(state, cmd.pay, events);
    return;
  }
  if (cmd.type === 'drop') {
    if (player.carryingId !== null) drop(state, player, events);
    return;
  }
  if (cmd.type === 'stop') {
    clearAssassination(player);
    player.task = null;
    player.holdAt = null;
    player.moveTo = null;
    player.targetId = null;
    player.carryTargetId = null;
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
    applyOne(state, commandActor(state, cmd, player), cmd, events);
  }
}
