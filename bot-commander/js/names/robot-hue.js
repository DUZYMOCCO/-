import { splitRobotName } from './robot-names.js?v=1';

// 既存の色番号は固定し、新しい色は末尾にだけ足す。
export const ROBOT_HUES = Object.freeze([
  Object.freeze({ dh: 0, dl: 0 }), Object.freeze({ dh: 18, dl: 0 }),
  Object.freeze({ dh: -18, dl: 0 }), Object.freeze({ dh: 10, dl: 0.05 }),
  Object.freeze({ dh: -10, dl: -0.05 }), Object.freeze({ dh: 0, dl: 0.06 }),
]);
export function robotHue(name) {
  if (!splitRobotName(name)) return null;
  let h = 2166136261;
  for (const c of `robot-hue-v1:${name}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const index = (h >>> 0) % ROBOT_HUES.length;
  return { index, ...ROBOT_HUES[index] };
}
export function robotHueCss(hue) {
  return !hue || (!hue.dh && !hue.dl) ? '' : `hue-rotate(${hue.dh}deg) brightness(${1 + hue.dl})`;
}
