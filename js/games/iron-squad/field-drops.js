/** Uncollected ground loot expires after one minute of active game time. */
export const FIELD_DROP_LIFETIME = 60;

export function addFieldDrop(game, drop) {
  drop.remainingLife = FIELD_DROP_LIFETIME;
  (game.dropsOnField ||= []).push(drop);
  return drop;
}

function ageDropList(drops, dt) {
  if (!drops?.length) return;
  let kept = 0;
  for (const drop of drops) {
    // Also age drops created by an older caller without lifetime metadata.
    drop.remainingLife = (Number.isFinite(drop.remainingLife) ? drop.remainingLife : FIELD_DROP_LIFETIME) - dt;
    if (drop.remainingLife > 0) drops[kept++] = drop;
  }
  // Compact in place: no replacement array and no repeated splice shifts.
  drops.length = kept;
}

export function ageFieldDrops(game, dt) {
  if (!Number.isFinite(dt) || dt <= 0) return;
  ageDropList(game.dropsOnField, dt);
  // The outdoor field keeps aging while the commander visits an instance.
  if (game.savedFieldDrops !== game.dropsOnField) ageDropList(game.savedFieldDrops, dt);
}
