// 画面側の選択状態。DOM・Three.js に依存しない（state は読むだけ）。

import { isHostile } from '../sim/data.js';

function findActor(state, id) {
  if (!state || !Array.isArray(state.actors) || id === null || id === undefined) return null;
  for (const actor of state.actors) {
    if (actor.id === id) return actor;
  }
  return null;
}

function playerFaction(state) {
  const player = findActor(state, state ? state.playerId : null);
  return player ? player.faction : 'player';
}

// 暗殺ボタンを出してよい相手か。DOMもThree.jsも使わない。
export function canAssassinate(state, id) {
  const target = findActor(state, id);
  if (!target) return false;
  const player = findActor(state, state ? state.playerId : null);
  if (!player || !player.sneaking) return false;
  if (target.id === player.id) return false;
  if (target.faction === player.faction) return false;
  if (target.faction === 'beast') return false;
  if (target.state === 'dead' || target.state === 'down' || target.state === 'getup') return false;
  return true;
}

export function createSelection() {
  let selectedId = null;

  function get() {
    return selectedId;
  }

  function select(id) {
    selectedId = id === undefined ? null : id;
    return selectedId;
  }

  function clear() {
    const had = selectedId !== null;
    selectedId = null;
    return had;
  }

  function onTapActor(state, id) {
    const actor = findActor(state, id);
    if (!actor) return { action: 'none' };

    if (selectedId !== actor.id) {
      selectedId = actor.id;
      return { action: 'select', id: actor.id };
    }

    if ((actor.state === 'down' || actor.state === 'getup') && actor.faction !== 'player') {
      return { action: 'none', id: actor.id };
    }
    if (actor.state !== 'dead' && isHostile(state, playerFaction(state), actor.faction)) {
      return { action: 'attack', id: actor.id };
    }
    return { action: 'select', id: actor.id };
  }

  function onTapGround() {
    return clear();
  }

  function validate(state) {
    if (selectedId === null) return false;
    if (findActor(state, selectedId)) return false;
    selectedId = null;
    return true;
  }

  return {
    get,
    select,
    clear,
    onTapActor,
    onTapGround,
    validate,
  };
}
