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

function isSquadActor(state, actor) {
  if (!actor) return false;
  if (Array.isArray(state?.squadIds)) return state.squadIds.includes(actor.id);
  return actor.faction === 'player';
}

// 暗殺ボタンを出してよい相手か。DOMもThree.jsも使わない。
export function canAssassinate(state, id, actorId) {
  const target = findActor(state, id);
  if (!target) return false;
  let sneakingActor = null;
  if (actorId !== undefined && actorId !== null) {
    sneakingActor = findActor(state, actorId);
  } else {
    sneakingActor = findActor(state, state ? state.playerId : null);
    if (!sneakingActor || !sneakingActor.sneaking) {
      // プレイヤーが隠密中でなければ、選択中・部隊の他の隠密者をチェック
      sneakingActor = (state?.actors || []).find((a) => isSquadActor(state, a) && a.sneaking);
    }
  }
  if (!sneakingActor || !sneakingActor.sneaking) return false;
  if (target.id === sneakingActor.id) return false;
  if (target.faction === sneakingActor.faction) return false;
  if (target.faction === 'beast') return false;
  if (target.state === 'dead' || target.state === 'down' || target.state === 'getup') return false;
  return true;
}

export function createSelection(initialSquadIds) {
  let selectedTargetId = null;
  let revision = 0;
  let selectedSquadIds = Array.isArray(initialSquadIds) && initialSquadIds.length > 0
    ? initialSquadIds.map(Number).filter(Number.isFinite)
    : [];

  function get() {
    return selectedTargetId !== null
      ? selectedTargetId
      : (selectedSquadIds.length === 1 ? selectedSquadIds[0] : (selectedSquadIds.length > 0 ? selectedSquadIds[0] : null));
  }

  function getTargetId() {
    return selectedTargetId;
  }

  function getSelectedSquadIds() {
    return [...selectedSquadIds];
  }

  function isSelectedSquad(id) {
    return selectedSquadIds.includes(Number(id));
  }

  function select(id) {
    revision++;
    selectedTargetId = id === undefined ? null : id;
    if (selectedTargetId !== null && selectedSquadIds.length === 0) {
      selectedSquadIds = [selectedTargetId];
    }
    return selectedTargetId;
  }

  function selectSquad(ids) {
    revision++;
    if (Array.isArray(ids)) {
      selectedSquadIds = ids.map(Number).filter(Number.isFinite);
    } else if (Number.isFinite(Number(ids))) {
      selectedSquadIds = [Number(ids)];
    } else {
      selectedSquadIds = [];
    }
    selectedTargetId = selectedSquadIds[0] ?? null;
    return [...selectedSquadIds];
  }

  function toggleSquadMember(id) {
    revision++;
    const numId = Number(id);
    if (!Number.isFinite(numId)) return [...selectedSquadIds];
    const idx = selectedSquadIds.indexOf(numId);
    if (idx >= 0) {
      if (selectedSquadIds.length > 1) {
        selectedSquadIds.splice(idx, 1);
        if (selectedTargetId === numId) {
          selectedTargetId = selectedSquadIds[0] || null;
        }
      }
    } else {
      selectedSquadIds.push(numId);
      selectedTargetId = numId;
    }
    return [...selectedSquadIds];
  }

  function selectAllSquad(state) {
    revision++;
    if (!state || !Array.isArray(state.actors)) return [];
    const living = state.actors.filter(
      (a) => isSquadActor(state, a) && a.state !== 'dead'
    );
    selectedSquadIds = living.map((a) => a.id);
    if (selectedSquadIds.length > 0) {
      selectedTargetId = selectedSquadIds[0];
    }
    return [...selectedSquadIds];
  }

  function clear() {
    const had = selectedTargetId !== null || selectedSquadIds.length > 0;
    selectedTargetId = null;
    return had;
  }

  function clearSquad() {
    selectedSquadIds = [];
    selectedTargetId = null;
  }

  function onTapActor(state, id, opts = {}) {
    const actor = findActor(state, id);
    if (!actor) return { action: 'none' };

    revision++;
    const inSquad = isSquadActor(state, actor);

    // 部隊員をタップした場合
    if (inSquad) {
      if (opts.multi || opts.shiftKey) {
        toggleSquadMember(actor.id);
        selectedTargetId = actor.id;
        return { action: 'select', id: actor.id, squad: true, multi: true };
      }
      selectedSquadIds = [actor.id];
      selectedTargetId = actor.id;
      return { action: 'select', id: actor.id, squad: true };
    }

    // 部隊外の相手（敵・NPC）をタップした場合
    if (selectedTargetId !== actor.id) {
      selectedTargetId = actor.id;
      return { action: 'select', id: actor.id };
    }

    if ((actor.state === 'down' || actor.state === 'getup') && actor.faction !== 'player') {
      return { action: 'none', id: actor.id };
    }
    if (actor.state !== 'dead' && isHostile(state, playerFaction(state), actor)) {
      return { action: 'attack', id: actor.id };
    }
    return { action: 'select', id: actor.id };
  }

  function onTapGround() {
    const had = selectedTargetId !== null;
    selectedTargetId = null;
    return had;
  }

  function validate(state) {
    if (selectedSquadIds.length > 0) {
      selectedSquadIds = selectedSquadIds.filter((id) => {
        const a = findActor(state, id);
        return a && a.state !== 'dead' && isSquadActor(state, a);
      });
    }
    if (selectedTargetId === null) return false;
    if (findActor(state, selectedTargetId)) return false;
    selectedTargetId = null;
    return true;
  }

  return {
    get,
    getTargetId,
    getRevision: () => revision,
    getSelectedSquad: getSelectedSquadIds,
    getSelectedSquadIds,
    isSelectedSquad,
    select,
    selectSquad,
    toggleSquadMember,
    selectAllSquad,
    clear,
    clearSquad,
    onTapActor,
    onTapGround,
    validate,
  };
}

export {
  pickNearestActorScreen,
  pickNearestProjected,
  pickScreenActor,
  pickNearestScreenPoint,
} from './screen_picker.js';

