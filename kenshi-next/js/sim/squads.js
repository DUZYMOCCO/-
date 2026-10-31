// 部隊（Squad）管理と部隊AI設定の純粋ロジック（DOM・Three.js 非依存）。

export const DEFAULT_SQUAD_AI = Object.freeze({
  helpAllies: true, // 戦闘中の味方を救援する
  attackOnSight: false, // 敵対者を視認したら先制攻撃する
  healAllies: true, // 負傷した味方を手当てする
  rescueDowned: true, // 気絶・倒れた味方を安全に担いで救出する
  formation: 'line', // 隊形: 'random' | 'line' | 'column' | 'wedge'
  // 以下の項目はUIおよび状態保存に対応し、後続拡張用のスタブ（未実装）
  storeItemsAuto: false, // 未実装: アイテムを自動収納する
  restInBed: false, // 未実装: 負傷時にベッドで休む
  sitWhenIdle: false, // 未実装: 待機時に座る
  shareFood: false, // 未実装: 食料を共有する
  feedAnimals: false, // 未実装: 動物に餌をやる
});

export const FORMATIONS = Object.freeze(['random', 'line', 'column', 'wedge']);

export function ensurePlayerSquads(state) {
  if (!state || typeof state !== 'object') return [];
  if (!Array.isArray(state.playerSquads) || state.playerSquads.length === 0) {
    const existingIds =
      Array.isArray(state.squadIds) && state.squadIds.length > 0
        ? [...state.squadIds]
        : Number.isFinite(state.playerId)
          ? [state.playerId]
          : [];

    state.playerSquads = [
      {
        id: 'squad_1',
        name: '部隊 1',
        memberIds: existingIds,
        ai: { ...DEFAULT_SQUAD_AI },
      },
    ];
    state.nextPlayerSquadSeq = 2;
  } else {
    // 既存部隊データの正規化（古いセーブ互換）
    for (let i = 0; i < state.playerSquads.length; i += 1) {
      const sq = state.playerSquads[i];
      if (!sq.id) sq.id = 'squad_' + (i + 1);
      if (!sq.name) sq.name = '部隊 ' + (i + 1);
      if (!Array.isArray(sq.memberIds)) sq.memberIds = [];
      if (!sq.ai || typeof sq.ai !== 'object') {
        sq.ai = { ...DEFAULT_SQUAD_AI };
      } else {
        sq.ai = { ...DEFAULT_SQUAD_AI, ...sq.ai };
      }
    }
  }

  syncSquadIds(state);
  return state.playerSquads;
}

export function syncSquadIds(state) {
  if (!state || !Array.isArray(state.playerSquads)) return;
  const set = new Set();
  for (const sq of state.playerSquads) {
    for (const id of sq.memberIds) {
      if (Number.isFinite(Number(id))) set.add(Number(id));
    }
  }
  state.squadIds = Array.from(set);
}

export function createPlayerSquad(state, name = null) {
  ensurePlayerSquads(state);
  const seq = state.nextPlayerSquadSeq || (state.playerSquads.length + 1);
  state.nextPlayerSquadSeq = seq + 1;

  const id = 'squad_' + seq;
  const squadName = typeof name === 'string' && name.trim().length > 0 ? name.trim() : '部隊 ' + seq;

  const squad = {
    id,
    name: squadName,
    memberIds: [],
    ai: { ...DEFAULT_SQUAD_AI },
  };
  state.playerSquads.push(squad);
  return squad;
}

export function renamePlayerSquad(state, squadId, newName) {
  ensurePlayerSquads(state);
  if (typeof newName !== 'string' || newName.trim().length === 0) return false;
  const squad = state.playerSquads.find((s) => s.id === squadId);
  if (!squad) return false;
  squad.name = newName.trim();
  return true;
}

export function moveMemberToSquad(state, actorId, targetSquadId) {
  ensurePlayerSquads(state);
  const aid = Number(actorId);
  if (!Number.isFinite(aid)) return false;

  const target = state.playerSquads.find((s) => s.id === targetSquadId);
  if (!target) return false;

  // 他の部隊から削除
  for (const sq of state.playerSquads) {
    const idx = sq.memberIds.indexOf(aid);
    if (idx !== -1) {
      sq.memberIds.splice(idx, 1);
    }
  }

  // 対象部隊に追加（重複防止）
  if (!target.memberIds.includes(aid)) {
    target.memberIds.push(aid);
  }

  syncSquadIds(state);
  return true;
}

export function deletePlayerSquad(state, squadId) {
  ensurePlayerSquads(state);
  // 部隊が1つだけの場合は削除不可
  if (state.playerSquads.length <= 1) return false;

  const idx = state.playerSquads.findIndex((s) => s.id === squadId);
  if (idx === -1) return false;

  const removed = state.playerSquads.splice(idx, 1)[0];
  const defaultSquad = state.playerSquads[0];

  // 削除された部隊のメンバーは既定部隊（先頭部隊）へ合流
  if (removed.memberIds && removed.memberIds.length > 0) {
    for (const mid of removed.memberIds) {
      if (!defaultSquad.memberIds.includes(mid)) {
        defaultSquad.memberIds.push(mid);
      }
    }
  }

  syncSquadIds(state);
  return true;
}

export function getSquadOfMember(state, actorId) {
  ensurePlayerSquads(state);
  const aid = Number(actorId);
  for (const sq of state.playerSquads) {
    if (sq.memberIds.includes(aid)) return sq;
  }
  return null;
}

export function getSquadAi(state, squadId) {
  ensurePlayerSquads(state);
  const squad = state.playerSquads.find((s) => s.id === squadId);
  return squad ? squad.ai : { ...DEFAULT_SQUAD_AI };
}

export function setSquadAi(state, squadId, key, value) {
  ensurePlayerSquads(state);
  const squad = state.playerSquads.find((s) => s.id === squadId);
  if (!squad) return false;
  if (!squad.ai) squad.ai = { ...DEFAULT_SQUAD_AI };
  squad.ai[key] = value;
  return true;
}

export function setSquadFormation(state, squadId, formation) {
  if (!FORMATIONS.includes(formation)) return false;
  return setSquadAi(state, squadId, 'formation', formation);
}
