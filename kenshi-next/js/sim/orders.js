// プレイヤー命令と自立行動の優先順位（loot2）
// - 命令は、終わるか・新しい命令が来るか・自分が殴られる（反撃）まで、自動の行動に上書きされない。
// - 命令が終わってから AUTO_RESUME_TICKS の間は、見つけた敵・救援・自動の仕事・自動の担ぎ・自動の手当て・付いて戻るを始めない（殴られたら反撃はする）。
// - 移動命令だけは、殴られても反撃せず目的地へ向かう（ddf2a7fc の決まりのまま）。

export const AUTO_RESUME_TICKS = 300; // 1倍速で 30 秒（倍速ではゲーム内の時間で数える）
export const RECENT_HIT_TICKS = 20; // 2 秒以内に自分が殴られた・撃たれた＝反撃してよい

export function inPlayerSquad(state, a) {
  return !!a && a.faction === 'player' && Array.isArray(state.squadIds) && state.squadIds.includes(a.id);
}

// いま実行中のプレイヤー命令の種類: 'move' / 'task' / null
export function playerOrderKind(state, a) {
  if (!inPlayerSquad(state, a)) return null;
  if (a.moveTo) return 'move';
  if (a.task && !a.task.auto) return 'task';
  if (a.townTask || a.pick) return 'task';
  if (a.buildTask?.kind === 'upkeep') return 'task'; // 命じた修理・解体
  if (a.carryTargetId != null && (a.carryOrdered || a.isPlayer)) return 'task'; // 担げ（自動の担ぎ直しは命令ではない）
  if (a.lootBodyId != null) return 'task'; // あさる（loot.js）
  if (a.assassinTargetId != null) return 'task';
  if (a.orderedTargetId != null && a.targetId === a.orderedTargetId) return 'task';
  return null;
}

export function attackedRecently(state, a) {
  return a.lastAttackedTick != null && state.tick - a.lastAttackedTick <= RECENT_HIT_TICKS;
}

// 自動で狙いを付けてはいけないか（救援・視界の敵・護衛など）。命令中と、命令の直後の待ち時間は不可（反撃は別）。
export function autoEngageBlocked(state, a) {
  return playerOrderKind(state, a) !== null || (inPlayerSquad(state, a) && waitingAfterOrder(a));
}

// 命令の後の待ち時間中か（自動の仕事などを始めない）
export function waitingAfterOrder(a) {
  return (a?.autoWait || 0) > 0;
}

// 命令の直後、付いて戻るのを待つか（止まれ・付いてこいの直後は待たない）
export function holdBeforeFollow(a) {
  return waitingAfterOrder(a) && !a.followNow;
}

// 毎 tick: 命令中は待ち時間を満タンに保ち、命令が無くなったら減らす
export function updateOrderHold(state) {
  if (!Array.isArray(state.squadIds)) return;
  for (const id of state.squadIds) {
    const a = state.actors.find((x) => x.id === id);
    if (!a || a.state === 'dead') continue;
    if (a.orderedTargetId != null && a.targetId !== a.orderedTargetId) a.orderedTargetId = null;
    if (playerOrderKind(state, a) !== null) a.autoWait = AUTO_RESUME_TICKS;
    else if (a.autoWait > 0) a.autoWait -= 1;
  }
}

// 新しい命令を受けた時: 待ち時間を始める
export function noteOrder(state, a) {
  if (!a) return;
  a.orderedTargetId = null;
  a.followNow = false;
  a.autoWait = AUTO_RESUME_TICKS;
}
