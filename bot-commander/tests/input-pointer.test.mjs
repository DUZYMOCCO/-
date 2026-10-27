// input.js の指の数え方（R-07・R-08）。偽の canvas に pointer イベントを流す（ブラウザ不要）。
import test from 'node:test';
import assert from 'node:assert/strict';
import { attachInput } from '../js/render/input.js?v=23';

function setup(hooks = {}) {
  const canvas = new EventTarget();
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 390, height: 844 });
  canvas.setPointerCapture = () => {};
  const cam = { x: 640, y: 1500, zoom: 1.5 };
  const r = { cam, ui: { selected: [1], mode: 'fight', box: null, mark: null }, clampCam() {}, screenToWorld: (sx, sy) => ({ x: (sx - 195) / cam.zoom + cam.x, y: (sy - 422) / cam.zoom + cam.y }) };
  const sim = { units: [{ id: 1, side: 'ally', x: 9999, y: 9999, hp: 10, captured: null }], commands: [], fog: { isVisible: () => true } };
  const orders = [];
  const input = attachInput(canvas, sim, r, { onOrder: () => orders.push(1), ...hooks });
  const ev = (type, id, x, y, isPrimary) => { const e = new Event(type); Object.assign(e, { pointerId: id, clientX: x, clientY: y, isPrimary, preventDefault() {} }); canvas.dispatchEvent(e); };
  return { ev, cam, orders, input, r, sim };
}

test('2本→1本で離したあと、残った指で画面移動でき、離してもタップにならない', () => {
  const { ev, cam, orders, input } = setup();
  ev('pointerdown', 1, 120, 400, true); ev('pointerdown', 2, 270, 400, false); ev('pointermove', 2, 271, 400);
  ev('pointerup', 1, 120, 400); const y0 = cam.y; ev('pointermove', 2, 271, 440);
  assert.ok(Math.abs((y0 - cam.y) - 40 / 1.5) < 0.5);
  ev('pointerup', 2, 271, 440); assert.equal(orders.length, 0);
  input.destroy();
});

test('2本指で広げるとズームし、ふつうの2本目の指（isPrimary が偽）は捨てられない', () => {
  const { ev, cam, input } = setup();
  const z0 = cam.zoom;
  ev('pointerdown', 1, 150, 400, true); ev('pointerdown', 2, 250, 400, false);
  ev('pointermove', 2, 350, 400);
  assert.ok(cam.zoom > z0 * 1.5, 'ズームが効いていない: ' + cam.zoom);
  input.destroy();
});

test('3本のうち最初の指を離しても、残り2本の動きで画面が飛ばない', () => {
  const { ev, cam, input } = setup();
  ev('pointerdown', 1, 100, 400, true); ev('pointerdown', 2, 200, 400, false); ev('pointerdown', 3, 300, 400, false); ev('pointerup', 1, 100, 400);
  ev('pointermove', 2, 200, 410); const x1 = cam.x; ev('pointermove', 3, 300, 410);
  assert.ok(Math.abs(cam.x - x1) < 1, '指3を動かしただけで x が飛んだ: ' + (cam.x - x1));
  input.destroy();
});

test('3本から減ったあと、残り2本でそのままズームでき、さらに1本になれば画面移動になる', () => {
  const { ev, cam, input } = setup();
  ev('pointerdown', 1, 100, 400, true); ev('pointerdown', 2, 200, 400, false); ev('pointerdown', 3, 300, 400, false); ev('pointerup', 1, 100, 400);
  const z0 = cam.zoom; ev('pointermove', 3, 400, 400);
  assert.ok(cam.zoom > z0 * 1.5, 'ズームが効いていない: ' + cam.zoom);
  ev('pointerup', 2, 200, 400); const y0 = cam.y; ev('pointermove', 3, 400, 430);
  assert.ok(Math.abs((y0 - cam.y) - 30 / cam.zoom) < 0.5);
  input.destroy();
});

test('pointerup が届かなかった指（ゴースト）が残っても、次の1本指はふつうに動く', () => {
  const { ev, cam, input } = setup();
  ev('pointerdown', 1, 200, 300, true);               // pointerup は来ない
  ev('pointerdown', 2, 200, 300, true);               // 新しい指。isPrimary: true ＝ ほかに指がないはず
  const z0 = cam.zoom; ev('pointermove', 2, 200, 360);
  assert.equal(cam.zoom, z0);
  assert.ok(cam.y < 1500, '画面移動になっていない');
  input.destroy();
});

test('ゴーストを捨てたあと、ふつうのタップで命令が出る', () => {
  const { ev, orders, input } = setup();
  ev('pointerdown', 1, 200, 300, true);
  ev('pointerdown', 2, 100, 500, true); ev('pointerup', 2, 100, 500);
  assert.equal(orders.length, 1);
  input.destroy();
});


test('囲む: isPrimary が偽でも枠を作り選択、画面は移動しない', () => {
  const { ev, cam, input, r, sim } = setup();
  sim.units.push({ id: 2, side: 'ally', x: 640, y: 1500, hp: 10, captured: null });
  input.setLasso(true); ev('pointerdown', 2, 170, 390, false); ev('pointermove', 2, 220, 450, false);
  assert.ok(r.ui.box); assert.equal(cam.x, 640); assert.equal(cam.y, 1500);
  input.setLasso(false); ev('pointerup', 2, 220, 450, false); assert.deepEqual(r.ui.selected, [2]); input.destroy();
});

test('囲む: 小さな枠は選択も命令も解除もしない', () => {
  let nothing = 0; const { ev, orders, input, r } = setup({ onNothing: () => nothing++ });
  input.setLasso(true); ev('pointerdown', 2, 100, 400, false); ev('pointerup', 2, 103, 403, false);
  assert.equal(r.ui.box, null); assert.deepEqual(r.ui.selected, [1]); assert.equal(orders.length, 0); assert.equal(nothing, 0); input.destroy();
});

test('囲む: 地図上の2本指はピンチが優先される', () => {
  const { ev, cam, input, r } = setup(); input.setLasso(true);
  ev('pointerdown', 1, 150, 400, false); ev('pointerdown', 2, 250, 400, false);
  assert.equal(r.ui.box, null); const z = cam.zoom; ev('pointermove', 2, 350, 400, false);
  assert.ok(cam.zoom > z); input.destroy();
});

test('囲む: group が禁止なら通常の画面移動', () => {
  const { ev, cam, input, r } = setup({ allow: op => op !== 'group' }); input.setLasso(true);
  ev('pointerdown', 1, 150, 400, false); ev('pointermove', 1, 200, 400, false);
  assert.equal(r.ui.box, null); assert.ok(cam.x < 640); input.destroy();
});

test('囲む: 旗を下ろすと通常の画面移動', () => {
  const { ev, cam, input, r } = setup(); input.setLasso(true); input.setLasso(false);
  ev('pointerdown', 1, 150, 400, false); ev('pointermove', 1, 200, 400, false);
  assert.equal(r.ui.box, null); assert.ok(cam.x < 640); input.destroy();
});
