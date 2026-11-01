// Render posture derived from simulation state, including legacy saved actors.
export function renderPoseState(actor) {
  const sleeping = actor?.resting != null && actor.resting !== '';
  const lying = sleeping || actor?.state === 'down' || actor?.state === 'dead' || actor?.carriedBy != null;
  return {
    sleeping,
    lying,
    x: actor?.x ?? 0,
    z: actor?.z ?? 0,
    rot: actor?.rot ?? 0,
  };
}
