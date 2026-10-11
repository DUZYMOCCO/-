/** Uncollected ground loot expires after one minute of active game time. */
export const FIELD_DROP_LIFETIME = 60;
// World coordinates are centimetres: attract from 1.8m, collect at 0.44m.
export const FIELD_DROP_ATTRACT_RADIUS = 180;
export const FIELD_DROP_PICKUP_RADIUS = 44;

/** Pull only the current scene's loot toward a conscious commander. */
export function attractFieldDrops(game, dt) {
  if (!Number.isFinite(dt) || dt <= 0) return;
  const player = game.player;
  const active = player && !player.dead && !player.isDown && player.hp > 0;
  const radiusSq = FIELD_DROP_ATTRACT_RADIUS ** 2;
  for (const drop of game.dropsOnField || []) {
    // Ordinary squad collection remains available away from the commander.
    drop._towardCommander = false;
    if (!active) continue;
    const dx = player.x - drop.x, dy = player.y - drop.y;
    const distanceSq = dx * dx + dy * dy;
    if (!Number.isFinite(distanceSq) || distanceSq > radiusSq) continue;
    drop._towardCommander = true;
    if (distanceSq === 0) continue;
    const distance = Math.sqrt(distanceSq);
    const step = Math.min(distance, (320 + distance * 5) * dt);
    drop.x += dx / distance * step;
    drop.y += dy / distance * step;
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
