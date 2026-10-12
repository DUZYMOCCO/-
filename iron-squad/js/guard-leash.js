// Personal-squad leash: allies fight near the commander and come back instead of chasing forever.
export const GUARD_LEASH = Object.freeze({ engage: 260, breakAway: 300, rejoin: 90, dash: 1.9 });

const leashed = (game, u) => !!(u?.isPersonalGuard && game.player && !game.player.isDown && !game.player.dead);

/** True while the ally is running back to the commander (hysteresis: leave at breakAway, done at rejoin). */
export function guardRegrouping(game, u) {
  if (!leashed(game, u)) { if (u) u.regrouping = false; return false; }
  const d = Math.hypot(u.x - game.player.x, u.y - game.player.y);
  if (u.regrouping) { if (d <= GUARD_LEASH.rejoin) u.regrouping = false; }
  else if (d > GUARD_LEASH.breakAway) u.regrouping = true;
  return !!u.regrouping;
}

/** The enemy this ally may fight now: null while regrouping or when the enemy is far from the commander. */
export function guardTarget(game, u, enemy) {
  if (!enemy || !leashed(game, u)) return enemy;
  if (guardRegrouping(game, u)) return null;
  return Math.hypot(enemy.x - game.player.x, enemy.y - game.player.y) <= GUARD_LEASH.engage ? enemy : null;
}

/** Movement speed multiplier: dash only while regrouping. */
export const guardSpeedMult = u => u?.regrouping ? GUARD_LEASH.dash : 1;
