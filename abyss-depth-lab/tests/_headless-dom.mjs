/**
 * 最小の DOM/Audio/Image スタブ。Node から game.js を起動して「実ゲーム経路」を検証するため。
 * 画面は描かないが、更新ループ・当たり・報酬・破片の配線はすべて本物が走る。
 */
const ctx = new Proxy({}, { get: (t, k) => {
  if (k === 'canvas') return { width: 1280, height: 720 };
  if (k === 'createRadialGradient' || k === 'createLinearGradient') return () => ({ addColorStop() {} });
  if (k === 'measureText') return () => ({ width: 10 });
  if (k === 'getImageData') return () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 });
  if (k === 'createImageData') return (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) });
  return () => {};
}, set: () => true });

const el = () => ({ getContext: () => ctx, style: {}, width: 1280, height: 720, complete: true,
  addEventListener() {}, removeEventListener() {}, appendChild() {}, setAttribute() {}, remove() {},
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720 }), querySelector: () => null,
  querySelectorAll: () => [], classList: { add() {}, remove() {}, toggle() {} } });

globalThis.document = { createElement: () => el(), getElementById: () => null, querySelector: () => null,
  querySelectorAll: () => [], addEventListener() {}, removeEventListener() {},
  body: { appendChild() {}, classList: { add() {}, remove() {} } }, documentElement: { style: {} }, head: { appendChild() {} } };
globalThis.window = globalThis.window || globalThis;
globalThis.addEventListener = globalThis.addEventListener || function () {};
globalThis.removeEventListener = globalThis.removeEventListener || function () {};
globalThis.dispatchEvent = globalThis.dispatchEvent || function () { return true; };
try { Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'node', maxTouchPoints: 0 }, configurable: true }); } catch {}
globalThis.requestAnimationFrame = (f) => setTimeout(() => f(Date.now()), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = String(v); }, removeItem(k) { delete this._d[k]; } };
const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {} });
const gnode = () => ({ connect() {}, disconnect() {}, gain: param(), frequency: param(), Q: param(), detune: param(), playbackRate: param(), threshold: param(), knee: param(), ratio: param(), attack: param(), release: param(), type: 'sine', start() {}, stop() {}, buffer: null, loop: false, onended: null });
globalThis.AudioContext = class {
  constructor() { this.destination = {}; this.currentTime = 0; this.sampleRate = 44100; }
  createGain() { return gnode(); } createBuffer() { return { getChannelData: () => new Float32Array(8) }; }
  createBufferSource() { return gnode(); } createBiquadFilter() { return gnode(); } createOscillator() { return gnode(); }
  createDynamicsCompressor() { return gnode(); }
};
globalThis.Image = class { constructor() { this.width = 8; this.height = 8; this.dataset = {}; this.src = '';
  Object.defineProperty(this, 'naturalWidth', { get: () => (imageState.ready ? 8 : 0), configurable: true });
  Object.defineProperty(this, 'naturalHeight', { get: () => (imageState.ready ? 8 : 0), configurable: true });
  Object.defineProperty(this, 'complete', { get: () => imageState.ready, configurable: true }); }
  addEventListener() {} };

/** テスト用: 画像の読み込み成否を切り替える（フォールバック経路の検証）。 */
export const imageState = { ready: true };

/** 実ゲームを起動して返す（start で更新ループも回る）。 */
export async function bootGame() {
  const { createAbyssDive } = await import('../js/game.js');
  const g = createAbyssDive({ canvas: el(), onGameOver() {} });
  g.start();
  g.startGame();
  return g;
}

/** n フレームぶんループを進める（rAF スタブは setTimeout(0) なので 1 tick = 1 frame 相当）。 */
export async function tick(g, n = 3) {
  for (let i = 0; i < n; i++) await new Promise(r => setTimeout(r, 12));
  return g;
}

/** 実際の弾レーンを通して 1 発ぶつける（当たり・撃破・報酬は本物のコードが走る）。 */
export function shootAt(g, e, dmg = 9999) {
  g.G.bullets.push({ kind: 'shot', prevX: e.x - 3, prevY: e.y, x: e.x + 3, y: e.y, vx: 0, vy: 0, r: 40, a: 0, dmg, life: 0.2, aoe: 8, style: 'shot' });
}

/** 更新ループを止める（ヘッドレスのテストがハングしないように）。 */
export function stopGame(g) {
  try { g.stop && g.stop(); } catch {}
  try { g.destroy && g.destroy(); } catch {}
}
