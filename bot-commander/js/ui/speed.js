// v0.4.6（10/24）: ゲームの速さ。メニューの3択（0.5x / 1x / 2x）。始まりは 1x。
// シミュは固定刻み（TICK）で進むので、速さは「1フレームで貯める時間」にだけ掛かる。
// 知らせ（toast）や UI の更新は実時間のまま。
export const SPEEDS = [0.5, 1, 2];
export const DEFAULT_SPEED = 1;
export const speedLabel = v => `${v}x`;
export const normalizeSpeed = v => (SPEEDS.includes(Number(v)) ? Number(v) : DEFAULT_SPEED);
// HUD に出す小さな表示。1x のときは何も出さない（画面をすっきり保つ）
export const hudSpeedText = v => (normalizeSpeed(v) === 1 ? '' : speedLabel(normalizeSpeed(v)));
// 固定刻みの進め方（index.js の tick と同じ計算）。何刻み進むかと残りを返す
export function advance(acc, dt, speed, tick, max = 10) {
  acc += dt * speed; let n = 0;
  while (acc >= tick && n < max) { acc -= tick; n++; }
  if (n === max) acc = 0;
  return { acc, steps: n };
}
