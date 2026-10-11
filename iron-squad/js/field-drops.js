/** Uncollected ground loot expires after one minute of active game time. */
export const FIELD_DROP_LIFETIME = 60;
// World coordinates are centimetres: attract from 1.8m, collect at 0.44m.
export const FIELD_DROP_ATTRACT_RADIUS = 180;
export const FIELD_DROP_PICKUP_RADIUS = 44;

/** v5.0.0: seconds an item takes to fly the whole way in (ease-in, so it starts slow). */
export const FIELD_DROP_PULL_SECONDS = 0.6;

/** Eased progress 0..1 for the elapsed pull time. */
export const pullProgress = seconds => { const u = Math.min(1, Math.max(0, seconds / FIELD_DROP_PULL_SECONDS)); return u * u; };

/**
 * Pull only the current scene's loot toward a conscious commander.
 * The drop remembers where it entered the radius and eases from there to the
 * commander's CURRENT position, so travel time depends on elapsed time only
 * (frame-rate independent) and the item visibly flies in (~0.4-0.6 s).
 */
export function attractFieldDrops(game, dt) {
  if (!Number.isFinite(dt) || dt <= 0) return;
  const player = game.player;
  const active = player && !player.dead && !player.isDown && player.hp > 0;
  const radiusSq = FIELD_DROP_ATTRACT_RADIUS ** 2;
  const dropSq = (FIELD_DROP_ATTRACT_RADIUS * 1.6) ** 2;
  for (const drop of game.dropsOnField || []) {
    // Ordinary squad collection remains available away from the commander.
    drop._towardCommander = false;
    if (!active) { drop._pullT = 0; drop._pullStart = null; continue; }
    const dx = player.x - drop.x, dy = player.y - drop.y;
    const distanceSq = dx * dx + dy * dy;
    if (!Number.isFinite(distanceSq)) continue;
    if (!drop._pullStart) {
      if (distanceSq > radiusSq) continue;
      drop._pullStart = { x: drop.x, y: drop.y }; drop._pullT = 0;
    } else if (distanceSq > dropSq) { drop._pullStart = null; drop._pullT = 0; continue; }
    drop._towardCommander = true;
    drop._pullT += dt;
    const e = pullProgress(drop._pullT), start = drop._pullStart;
    drop.x = start.x + (player.x - start.x) * e;
    drop.y = start.y + (player.y - start.y) * e;
  }
}

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
