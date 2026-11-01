const MAX_DISPLAY_HALF_ANGLE = (35 * Math.PI) / 180;
const DISPLAY_ANGLE_SCALE = 0.6;
const FADE_SECONDS = 0.3;
const DISPLAY_HALF_ANGLE = (22.5 * Math.PI) / 180;

export function partyHasSneakingActor(state) {
  return !!state?.actors?.some((actor) => actor.faction === 'player'
    && !['dead', 'down', 'getup'].includes(actor.state)
    && (actor.sneaking === true || actor.sneak === true));
}

export function lookoutConeTargetOpacity(state, hasGuard = true) {
  return hasGuard && partyHasSneakingActor(state) ? 1 : 0;
}

export function lookoutDisplayHalfAngle(visionHalfAngle) {
  const source = Number.isFinite(visionHalfAngle) ? Math.max(0, visionHalfAngle) : 0;
  return Math.min(source * DISPLAY_ANGLE_SCALE, MAX_DISPLAY_HALF_ANGLE, DISPLAY_HALF_ANGLE);
}

export function advanceLookoutOpacity(opacity, targetOpacity, dt) {
  const current = Math.max(0, Math.min(1, Number.isFinite(opacity) ? opacity : 0));
  const target = Math.max(0, Math.min(1, Number.isFinite(targetOpacity) ? targetOpacity : 0));
  const step = Math.max(0, Number.isFinite(dt) ? dt : 0) / FADE_SECONDS;
  if (current < target) return Math.min(target, current + step);
  return Math.max(target, current - step);
}
