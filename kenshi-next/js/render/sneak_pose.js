export const SNEAK = Object.freeze({ duration: 0.25, exitFast: 0.07, drop: 0.27, thigh: -Math.PI / 3, calf: Math.PI / 2, foot: -Math.PI / 6, spine: Math.PI / 9, neck: -Math.PI / 9, arm: -0.18, elbow: 0.3, walkRate: 0.6, runRate: 0.55 });

// progress は遷移の時間的な進み。smoothstep で両端の動きを滑らかにする。
export function sneakPose(progress) {
  const p = Math.max(0, Math.min(1, progress));
  const w = p * p * (3 - 2 * p);
  return { weight: w, drop: SNEAK.drop * w, thigh: SNEAK.thigh * w, calf: SNEAK.calf * w, foot: SNEAK.foot * w, spine: SNEAK.spine * w, neck: SNEAK.neck * w, arm: SNEAK.arm * w, elbow: SNEAK.elbow * w };
}
export function sneakProgress(progress, active, interrupted, dt) {
  const step = Math.max(0, dt) / (interrupted ? SNEAK.exitFast : SNEAK.duration);
  return Math.max(0, Math.min(1, progress + (active ? step : -step)));
}
export function sneakAllowed(actor, reacting = false) {
  return !!actor.sneaking && !reacting && !actor.resting && !['dead', 'down', 'getup'].includes(actor.state) && ['Idle', 'Walk', 'Run'].includes(actor.anim);
}
