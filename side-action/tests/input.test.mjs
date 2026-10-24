import test from 'node:test';
import assert from 'node:assert/strict';
import { Input } from '../js/input.js';

// ちいさな にせ DOM
function el(attrs = {}) {
  const cls = new Set();
  return { dataset: attrs, style: {}, classList: { add: (c) => cls.add(c), remove: (c) => cls.delete(c), contains: (c) => cls.has(c) }, closest(sel) { return sel === '[data-btn]' && this.dataset.btn ? this : null; } };
}
function target() {
  const L = {};
  return { L, addEventListener: (n, f) => { (L[n] ||= []).push(f); }, removeEventListener: () => {}, fire(n, e) { for (const f of L[n] || []) f(e); } };
}
function setup() {
  let t = 0;
  const win = target(), doc = { ...target(), hidden: false, elementFromPoint: () => null };
  const pad = el(), knob = el(), btns = { jump: el({ btn: 'jump' }), kick: el({ btn: 'kick' }), shoot: el({ btn: 'shoot' }) };
  const layer = { ...target(), querySelector: (s) => (s === '.sa-pad' ? pad : knob), querySelectorAll: () => [], getBoundingClientRect: () => ({ left: 0, top: 0, width: 667, height: 375 }), setPointerCapture() {} };
  const inp = new Input(layer, { window: win, document: doc, now: () => t });
  inp.enabled = true;
  const P = (o) => ({ preventDefault() {}, pointerType: 'touch', buttons: 1, target: layer, ...o });
  const T = (list, changed) => ({ touches: list, changedTouches: changed });
  return { inp, win, doc, layer, btns, P, T, tick: (s) => { t += s; } };
}

test('パッド：ふつうに はなすと まんなかに もどる', () => {
  const { inp, win, layer, P } = setup();
  layer.fire('pointerdown', P({ pointerId: 5, clientX: 100, clientY: 250 }));
  win.fire('pointermove', P({ pointerId: 5, clientX: 160, clientY: 250 }));
  assert.equal(inp.frame().right, true);
  win.fire('pointerup', P({ pointerId: 5, clientX: 160, clientY: 250 }));
  const f = inp.frame(); assert.equal(f.right, false); assert.equal(inp.stick.x, 0);
});

test('マルチタッチ：ボタンを はなしても パッドは そのまま、pointercancel で もどる', () => {
  const { inp, win, layer, btns, P, T } = setup();
  layer.fire('pointerdown', P({ pointerId: 1, clientX: 100, clientY: 250 }));
  win.fire('touchstart', T([{ identifier: 0, clientX: 100, clientY: 250 }], [{ identifier: 0, clientX: 100, clientY: 250 }]));
  win.fire('pointermove', P({ pointerId: 1, clientX: 40, clientY: 250 }));
  layer.fire('pointerdown', P({ pointerId: 2, clientX: 600, clientY: 330, target: btns.jump }));
  win.fire('touchstart', T([{ identifier: 0, clientX: 40, clientY: 250 }, { identifier: 1, clientX: 600, clientY: 330 }], [{ identifier: 1, clientX: 600, clientY: 330 }]));
  let f = inp.frame(); assert.equal(f.left, true); assert.equal(f.jump, true);
  win.fire('pointerup', P({ pointerId: 2 }));
  win.fire('touchend', T([{ identifier: 0, clientX: 40, clientY: 250 }], [{ identifier: 1 }]));
  f = inp.frame(); assert.equal(f.left, true, 'パッドの ゆびは まだ ある'); assert.equal(f.jumpHeld, false);
  win.fire('pointercancel', P({ pointerId: 1 }));
  f = inp.frame(); assert.equal(f.left, false); assert.equal(inp.stick.id, null);
});

test('pointerup が こない（iOS の じゃま）→ touchend / touchcancel で もどる', () => {
  for (const kind of ['touchend', 'touchcancel']) {
    const { inp, win, layer, btns, P, T } = setup();
    layer.fire('pointerdown', P({ pointerId: 7, clientX: 120, clientY: 260 }));
    win.fire('touchstart', T([{ identifier: 3, clientX: 120, clientY: 260 }], [{ identifier: 3, clientX: 120, clientY: 260 }]));
    win.fire('pointermove', P({ pointerId: 7, clientX: 190, clientY: 260 }));
    layer.fire('pointerdown', P({ pointerId: 8, clientX: 610, clientY: 320, target: btns.kick }));
    win.fire('touchstart', T([{ identifier: 3, clientX: 190, clientY: 260 }, { identifier: 4, clientX: 610, clientY: 320 }], [{ identifier: 4, clientX: 610, clientY: 320 }]));
    assert.equal(inp.frame().right, true);
    // パッドの ゆびだけ きえる（pointerup なし）
    win.fire(kind, T([{ identifier: 4, clientX: 610, clientY: 320 }], [{ identifier: 3 }]));
    const f = inp.frame(); assert.equal(f.right, false, kind); assert.equal(inp.stick.id, null);
    assert.ok(inp.btn.has('kick'), 'のこりの ゆび（キック）は そのまま');
  }
});

test('イベントが ぜんぶ きえても まいフレームの チェックで もどる', () => {
  const { inp, win, layer, P, T, tick } = setup();
  layer.fire('pointerdown', P({ pointerId: 9, clientX: 100, clientY: 250 }));
  win.fire('pointermove', P({ pointerId: 9, clientX: 30, clientY: 250 }));
  // ゆびは はなれたが pointer イベントも ID の むすびつきも ない。タッチは 0
  win.fire('touchmove', T([], []));
  tick(1);
  const f = inp.frame(); assert.equal(f.left, false); assert.equal(inp.stick.x, 0);
});

test('lostpointercapture・blur・visibilitychange・あたらしい ゆび で もどる', () => {
  const s1 = setup();
  s1.layer.fire('pointerdown', s1.P({ pointerId: 4, clientX: 100, clientY: 250 }));
  s1.win.fire('pointermove', s1.P({ pointerId: 4, clientX: 160, clientY: 250 }));
  s1.layer.fire('lostpointercapture', s1.P({ pointerId: 4 }));
  assert.equal(s1.inp.frame().right, false);

  const s2 = setup();
  s2.layer.fire('pointerdown', s2.P({ pointerId: 4, clientX: 100, clientY: 250 }));
  s2.win.fire('pointermove', s2.P({ pointerId: 4, clientX: 160, clientY: 250 }));
  s2.win.fire('blur', {});
  assert.equal(s2.inp.frame().right, false);

  const s3 = setup();
  s3.layer.fire('pointerdown', s3.P({ pointerId: 4, clientX: 100, clientY: 250 }));
  s3.win.fire('pointermove', s3.P({ pointerId: 4, clientX: 160, clientY: 250 }));
  s3.doc.hidden = true; s3.doc.fire('visibilitychange', {});
  assert.equal(s3.inp.frame().right, false);

  const s4 = setup(); // はりついた パッドに あたらしい ゆび → あたらしい ゆびが かつ
  s4.layer.fire('pointerdown', s4.P({ pointerId: 4, clientX: 100, clientY: 250 }));
  s4.win.fire('pointermove', s4.P({ pointerId: 4, clientX: 160, clientY: 250 }));
  s4.layer.fire('pointerdown', s4.P({ pointerId: 11, clientX: 90, clientY: 240 }));
  assert.equal(s4.inp.frame().right, false); assert.equal(s4.inp.stick.id, 11);

  const s5 = setup(); // ポーズ（enabled=false）でも もどる
  s5.layer.fire('pointerdown', s5.P({ pointerId: 4, clientX: 100, clientY: 250 }));
  s5.win.fire('pointermove', s5.P({ pointerId: 4, clientX: 160, clientY: 250 }));
  s5.inp.enabled = false; s5.inp.frame();
  assert.equal(s5.inp.stick.x, 0);
});

test('キーボード：B／F／シフト で ためる、J で うつ', () => {
  const { inp, win } = setup();
  for (const code of ['KeyB', 'KeyF', 'ShiftLeft']) {
    win.fire('keydown', { code, preventDefault() {}, repeat: false });
    assert.equal(inp.frame().charge, true, code);
    win.fire('keyup', { code, preventDefault() {} });
    assert.equal(inp.frame().charge, false, code);
  }
  win.fire('keydown', { code: 'KeyJ', preventDefault() {}, repeat: false });
  const f = inp.frame(); assert.equal(f.shoot, true); assert.equal(f.charge, false);
});
