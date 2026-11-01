// Right-clicking an enemy corpse issues a loot order without opening a menu.
export function corpseLootCommands(target, actorIds) {
  if (!target || target.state !== 'dead' || target.faction === 'player' || !Array.isArray(actorIds)) return [];
  const targetId = target.id;
  return actorIds
    .filter((actorId) => Number.isFinite(actorId))
    .map((actorId) => ({ type: 'loot', targetId, actorId }));
}
