export const SNEAK = Object.freeze({ duration: 0.25, exitFast: 0.07, drop: 0.27, thigh: -Math.PI / 3, calf: Math.PI / 2, foot: -Math.PI / 6, spine: Math.PI / 9, neck: -2 * Math.PI / 9, head: -Math.PI / 9, arm: -0.18, elbow: 0.3, walkRate: 0.6, runRate: 0.55 });

// progress は遷移の時間的な進み。smoothstep で両端の動きを滑らかにする。
export function sneakPose(progress) {
  const p = Math.max(0, Math.min(1, progress));
  const w = p * p * (3 - 2 * p);
  return { weight: w, drop: SNEAK.drop * w, thigh: SNEAK.thigh * w, calf: SNEAK.calf * w, foot: SNEAK.foot * w, spine: SNEAK.spine * w, neck: SNEAK.neck * w, head: SNEAK.head * w, arm: SNEAK.arm * w, elbow: SNEAK.elbow * w };
}
// One alternating reach per half cycle; idle rests the left hand near the knee.
export function sneakHands(anim, phase, weight) {
  const w = Math.max(0, Math.min(1, weight));
  const moving = anim === 'Walk' || anim === 'Run';
  const wave = moving && Number.isFinite(phase) ? Math.sin(phase * 2 * Math.PI) : 0;
  const left = moving ? Math.max(0, wave) : 0.55;
  const right = moving ? Math.max(0, -wave) : 0;
  const angles = reach => reach && w ? { upper: 1.25 * reach * w, lower: 0.15 * reach * w, hand: -0.25 * reach * w } : { upper: 0, lower: 0, hand: 0 };
  return { l: angles(left), r: angles(right) };
}
export function sneakProgress(progress, active, interrupted, dt) {
  const step = Math.max(0, dt) / (interrupted ? SNEAK.exitFast : SNEAK.duration);
  return Math.max(0, Math.min(1, progress + (active ? step : -step)));
}
export function sneakAllowed(actor, reacting = false) {
  return !!actor.sneaking && !reacting && !actor.resting && !['dead', 'down', 'getup'].includes(actor.state) && ['Idle', 'Walk', 'Run'].includes(actor.anim);
}
