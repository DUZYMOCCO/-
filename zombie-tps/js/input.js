import { stickCurve, digitEvent } from './rules.js?v=20';
// そうさ: タッチ（ひだり スティック・みぎ ドラッグ・ボタン）と キーボード／マウス
export class Input {
  constructor(touchLayer, canvas) {
    this.layer = touchLayer; this.canvas = canvas;
    this.move = { x: 0, y: 0 }; this.look = { x: 0, y: 0 };
    this.fireTouch = false; this.fireMouse = false; this.aimHold = false; this.aimToggle = false;
    this.meleeTouch = false; this.meleeTap = false; // v0.13.0: なぐる
    this.events = []; this.keys = new Set(); this.pointers = new Map();
    this.stickEl = touchLayer.querySelector('.zt-stick'); this.knobEl = touchLayer.querySelector('.zt-knob');
    this.usingTouch = false; this.enabled = false; this.lookScaleMouse = 0.0024; this.lookScaleTouch = 0.0062;
    this._bind();
  }
  get fire() { return this.fireTouch || this.fireMouse || this.keys.has('KeyF'); }
  get melee() { return this.meleeTouch || this.meleeTap || this.keys.has('KeyV'); }
  get aiming() { return this.aimHold || this.aimToggle; }
  _bind() {
    const L = this.layer;
    this.h = {
      down: (e) => this._down(e), move: (e) => this._moveP(e), up: (e) => this._up(e),
      key: (e) => this._key(e, true), keyup: (e) => this._key(e, false),
      mm: (e) => { if (document.pointerLockElement === this.canvas) { this.look.x += e.movementX * this.lookScaleMouse; this.look.y += e.movementY * this.lookScaleMouse; } },
      md: (e) => {
        if (e.pointerType === 'touch') return;
        if (!this.enabled) return;
        if (document.pointerLockElement !== this.canvas) { this.canvas.requestPointerLock?.(); return; }
        if (e.button === 0) this.fireMouse = true; if (e.button === 2) this.aimHold = true;
      },
      mu: (e) => { if (e.button === 0) this.fireMouse = false; if (e.button === 2) this.aimHold = false; },
      wheel: (e) => { if (this.enabled) this.events.push(e.deltaY > 0 ? 'next' : 'prev'); },
      ctx: (e) => e.preventDefault(),
      blur: () => { this.keys.clear(); this.fireMouse = false; this.fireTouch = false; this.meleeTouch = false; this.aimHold = false; this.pointers.clear(); this.move.x = this.move.y = 0; this._hideStick(); },
    };
    L.addEventListener('pointerdown', this.h.down); window.addEventListener('pointermove', this.h.move, { passive: false });
    window.addEventListener('pointerup', this.h.up); window.addEventListener('pointercancel', this.h.up);
    window.addEventListener('keydown', this.h.key); window.addEventListener('keyup', this.h.keyup);
    document.addEventListener('mousemove', this.h.mm); L.addEventListener('mousedown', this.h.md); window.addEventListener('mouseup', this.h.mu);
    L.addEventListener('wheel', this.h.wheel, { passive: true }); L.addEventListener('contextmenu', this.h.ctx);
    window.addEventListener('blur', this.h.blur);
  }
  destroy() {
    const L = this.layer;
    L.removeEventListener('pointerdown', this.h.down); window.removeEventListener('pointermove', this.h.move);
    window.removeEventListener('pointerup', this.h.up); window.removeEventListener('pointercancel', this.h.up);
    window.removeEventListener('keydown', this.h.key); window.removeEventListener('keyup', this.h.keyup);
    document.removeEventListener('mousemove', this.h.mm); L.removeEventListener('mousedown', this.h.md); window.removeEventListener('mouseup', this.h.mu);
    L.removeEventListener('wheel', this.h.wheel); L.removeEventListener('contextmenu', this.h.ctx);
    window.removeEventListener('blur', this.h.blur);
    if (document.pointerLockElement === this.canvas) document.exitPointerLock?.();
  }
  _down(e) {
    if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
    if (!this.enabled) return;
    this.usingTouch = true;
    e.preventDefault();
    const btn = e.target.closest('[data-act]');
    const act = btn ? btn.dataset.act : null;
    const rect = this.layer.getBoundingClientRect();
    if (act) {
      btn.classList.add('on');
      if (act === 'fire') { this.fireTouch = true; this.pointers.set(e.pointerId, { kind: 'fire', x: e.clientX, y: e.clientY, btn }); return; }
      if (act === 'melee') { this.meleeTouch = this.meleeTap = true; this.pointers.set(e.pointerId, { kind: 'melee', x: e.clientX, y: e.clientY, btn }); return; } // おしたまま ドラッグで むきも かえられる
      if (act === 'aim') { this.aimToggle = !this.aimToggle; this.pointers.set(e.pointerId, { kind: 'look', x: e.clientX, y: e.clientY, btn }); return; }
      this.events.push(act);
      this.pointers.set(e.pointerId, { kind: 'btn', btn });
      return;
    }
    if (e.clientX - rect.left < rect.width * 0.42) {
      this.pointers.set(e.pointerId, { kind: 'stick', ox: e.clientX, oy: e.clientY });
      this._showStick(e.clientX - rect.left, e.clientY - rect.top);
    } else {
      this.pointers.set(e.pointerId, { kind: 'look', x: e.clientX, y: e.clientY });
    }
  }
  _moveP(e) {
    const p = this.pointers.get(e.pointerId); if (!p) return;
    e.preventDefault();
    if (p.kind === 'stick') {
      const R = 52; let dx = e.clientX - p.ox, dy = e.clientY - p.oy; const l = Math.hypot(dx, dy);
      if (l > R) { // ゆびに ついていく スティック
        p.ox += dx * (1 - R / l); p.oy += dy * (1 - R / l); dx = e.clientX - p.ox; dy = e.clientY - p.oy;
        const rect = this.layer.getBoundingClientRect(); this._showStick(p.ox - rect.left, p.oy - rect.top);
      }
      this.move.x = dx / R; this.move.y = -dy / R;
      if (this.knobEl) this.knobEl.style.transform = `translate(${dx}px, ${dy}px)`;
    } else if (p.kind === 'look' || p.kind === 'fire' || p.kind === 'melee') {
      this.look.x += (e.clientX - p.x) * this.lookScaleTouch; this.look.y += (e.clientY - p.y) * this.lookScaleTouch;
      p.x = e.clientX; p.y = e.clientY;
    }
  }
  _up(e) {
    const p = this.pointers.get(e.pointerId); if (!p) return;
    this.pointers.delete(e.pointerId);
    if (p.btn) p.btn.classList.remove('on');
    if (p.kind === 'stick') { this.move.x = this.move.y = 0; this._hideStick(); }
    if (p.kind === 'fire') this.fireTouch = [...this.pointers.values()].some((q) => q.kind === 'fire');
    if (p.kind === 'melee') this.meleeTouch = [...this.pointers.values()].some((q) => q.kind === 'melee');
  }
  _showStick(x, y) { if (!this.stickEl) return; this.stickEl.style.display = 'block'; this.stickEl.style.left = x + 'px'; this.stickEl.style.top = y + 'px'; this.knobEl.style.transform = 'translate(0,0)'; }
  _hideStick() { if (this.stickEl) this.stickEl.style.display = 'none'; }
  _key(e, down) {
    if (!this.enabled) return;
    const c = e.code;
    if (down) {
      if (this.keys.has(c)) return;
      this.keys.add(c);
      if (c === 'KeyR') this.events.push('reload');
      if (c === 'KeyV') this.meleeTap = true;
      if (c === 'Space') { this.events.push('jump'); e.preventDefault(); }
      { const ev = digitEvent(c); if (ev) this.events.push(ev); } // v0.15.0: 1〜3 = もっていく ぶきの ばんごう（スーツの ときは スーツの ぶき）
      if (c === 'KeyQ') this.events.push('next');
      if (c === 'Escape' || c === 'KeyP') this.events.push('pause');
    } else this.keys.delete(c);
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(c)) {
      const k = this.keys;
      this.kx = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
      this.ky = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    }
  }
  // 1フレームぶんの にゅうりょく
  read() {
    // スティックは あそび＋カーブで こまかく うごける
    let { x: mx, y: my } = stickCurve(this.move.x, this.move.y, 0.12, 1.35);
    if (this.kx || this.ky) { mx = this.kx; my = this.ky; const l = Math.hypot(mx, my); mx /= l; my /= l; }
    const out = { mx, my, lx: this.look.x, ly: this.look.y, fire: this.fire, melee: this.melee, aim: this.aiming, touch: this.usingTouch, events: this.events.splice(0) };
    this.look.x = 0; this.look.y = 0; this.meleeTap = false; // みじかい タップも 1かいは とどく
    return out;
  }
  reset() { this.h.blur(); this.aimToggle = false; this.events.length = 0; this.look.x = this.look.y = 0; this.kx = this.ky = 0; }
}
