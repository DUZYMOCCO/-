// そうさ：ひだりの パッドで いどう、みぎの ボタンで ジャンプ・うつ・キック・パンチ・ぶきかえ／キーボード
// v0.3: パッドが はりついて うごきっぱなし に ならないように、ゆび（タッチ）ごとに しっかり おいかける
const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'jump', ArrowDown: 'down', KeyS: 'down',
  Space: 'jump', KeyZ: 'jump', KeyJ: 'shoot', KeyX: 'shoot', KeyK: 'kick', KeyC: 'kick', KeyL: 'punch', KeyV: 'punch', KeyQ: 'swap', KeyE: 'swap', KeyI: 'swap',
};
export const STICK_R = 38;
const NEAR = 6, LOST = 90, STALE = 0.6;
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;

export class Input {
  constructor(layer, env = {}) {
    const win = this.win = env.window || globalThis.window, doc = this.doc = env.document || globalThis.document;
    this.clock = env.now || now;
    this.layer = layer;
    this.pad = layer.querySelector('.sa-pad'); this.knob = layer.querySelector('.sa-knob');
    this.keys = new Set(); this.btn = new Set(); this.edges = new Set();
    this.stick = { id: null, ox: 0, oy: 0, x: 0, y: 0, type: '', lx: 0, ly: 0, touchId: null, seen: 0 };
    this.btnPtr = new Map();
    this.touchCount = 0; this.touchSeen = 0;
    this.enabled = false; this.onPause = null;
    this.h = {
      down: (e) => this.down(e), move: (e) => this.move(e), up: (e) => this.up(e),
      kd: (e) => this.key(e, true), ku: (e) => this.key(e, false),
      blur: () => this.reset(), vis: () => { if (doc && doc.hidden) this.reset(); }, ctx: (e) => e.preventDefault(),
      tstart: (e) => this.touchEv(e, 'start'), tmove: (e) => this.touchEv(e, 'move'), tend: (e) => this.touchEv(e, 'end'),
    };
    layer.addEventListener('pointerdown', this.h.down);
    layer.addEventListener('lostpointercapture', this.h.up);
    layer.addEventListener('contextmenu', this.h.ctx);
    win.addEventListener('pointermove', this.h.move, { passive: false });
    win.addEventListener('pointerup', this.h.up); win.addEventListener('pointercancel', this.h.up);
    win.addEventListener('keydown', this.h.kd); win.addEventListener('keyup', this.h.ku);
    win.addEventListener('blur', this.h.blur); win.addEventListener('pagehide', this.h.blur);
    win.addEventListener('touchstart', this.h.tstart, { capture: true, passive: true });
    win.addEventListener('touchmove', this.h.tmove, { capture: true, passive: true });
    win.addEventListener('touchend', this.h.tend, { capture: true, passive: true });
    win.addEventListener('touchcancel', this.h.tend, { capture: true, passive: true });
    if (doc) doc.addEventListener('visibilitychange', this.h.vis);
  }
  destroy() {
    const L = this.layer, W = this.win;
    L.removeEventListener('pointerdown', this.h.down); L.removeEventListener('lostpointercapture', this.h.up); L.removeEventListener('contextmenu', this.h.ctx);
    W.removeEventListener('pointermove', this.h.move); W.removeEventListener('pointerup', this.h.up); W.removeEventListener('pointercancel', this.h.up);
    W.removeEventListener('keydown', this.h.kd); W.removeEventListener('keyup', this.h.ku);
    W.removeEventListener('blur', this.h.blur); W.removeEventListener('pagehide', this.h.blur);
    W.removeEventListener('touchstart', this.h.tstart, { capture: true }); W.removeEventListener('touchmove', this.h.tmove, { capture: true });
    W.removeEventListener('touchend', this.h.tend, { capture: true }); W.removeEventListener('touchcancel', this.h.tend, { capture: true });
    if (this.doc) this.doc.removeEventListener('visibilitychange', this.h.vis);
  }
  reset() {
    this.keys.clear(); this.btn.clear(); this.edges.clear();
    for (const b of this.btnPtr.values()) b.el.classList.remove('on');
    this.btnPtr.clear(); this.releaseStick();
    this.layer.querySelectorAll('.sa-btn.on').forEach((b) => b.classList.remove('on'));
  }
  releaseStick() {
    const s = this.stick; s.id = null; s.touchId = null; s.type = ''; s.x = s.y = 0;
    this.pad && this.pad.classList.remove('on'); this.drawStick();
  }
  releaseBtn(pid) {
    const b = this.btnPtr.get(pid); if (!b) return;
    this.btnPtr.delete(pid);
    if (![...this.btnPtr.values()].some((v) => v.name === b.name)) { this.btn.delete(b.name); b.el.classList.remove('on'); }
  }
  press(name) { if (!this.btn.has(name) && !this.keys.has(name)) this.edges.add(name); }
  down(e) {
    if (!this.enabled) return;
    const b = e.target && e.target.closest && e.target.closest('[data-btn]');
    if (b) {
      e.preventDefault();
      const name = b.dataset.btn;
      if (name === 'pause') { this.onPause && this.onPause(); return; }
      this.releaseBtn(e.pointerId);
      this.press(name); this.btn.add(name);
      this.btnPtr.set(e.pointerId, { name, el: b, type: e.pointerType || 'touch', lx: e.clientX, ly: e.clientY, touchId: null, seen: this.clock() });
      b.classList.add('on');
      return;
    }
    const r = this.layer.getBoundingClientRect();
    if (e.clientX - r.left < r.width * 0.5) {
      // まえの ゆびが のこってたら（はりつき）すてて、あたらしい ゆびで やりなおす
      if (this.stick.id !== null && this.stick.id !== e.pointerId) this.releaseStick();
      e.preventDefault();
      const s = this.stick;
      s.id = e.pointerId; s.type = e.pointerType || 'touch'; s.ox = s.lx = e.clientX; s.oy = s.ly = e.clientY; s.x = 0; s.y = 0; s.touchId = null; s.seen = this.clock();
      try { this.layer.setPointerCapture && this.layer.setPointerCapture(e.pointerId); } catch { /* なくても いい */ }
      this.pad.style.left = `${e.clientX - r.left}px`; this.pad.style.top = `${e.clientY - r.top}px`; this.pad.classList.add('on');
      this.drawStick();
    }
  }
  move(e) {
    const s = this.stick;
    if (s.id !== null && e.pointerId === s.id) {
      if (s.type === 'mouse' && e.buttons === 0) { this.releaseStick(); return; }
      e.preventDefault && e.preventDefault();
      s.lx = e.clientX; s.ly = e.clientY; s.seen = this.clock();
      const R = STICK_R; let dx = e.clientX - s.ox, dy = e.clientY - s.oy;
      const d = Math.hypot(dx, dy); if (d > R) { s.ox += dx * (1 - R / d) * 0.6; s.oy += dy * (1 - R / d) * 0.6; dx *= R / d; dy *= R / d; }
      const wasUp = s.y < -0.6;
      s.x = dx / R; s.y = dy / R;
      if (!wasUp && s.y < -0.6) this.edges.add('stickUp');
      this.drawStick();
    } else if (this.btnPtr.has(e.pointerId)) {
      const cur = this.btnPtr.get(e.pointerId);
      if (cur.type === 'mouse' && e.buttons === 0) { this.releaseBtn(e.pointerId); return; }
      cur.lx = e.clientX; cur.ly = e.clientY; cur.seen = this.clock();
      // ボタンの うえで ゆびを すべらせても いい
      const el = this.doc && this.doc.elementFromPoint ? this.doc.elementFromPoint(e.clientX, e.clientY)?.closest?.('[data-btn]') : null;
      if (el && el !== cur.el && el.dataset.btn !== 'pause') {
        const name = el.dataset.btn; this.releaseBtn(e.pointerId);
        this.press(name); this.btn.add(name); el.classList.add('on');
        this.btnPtr.set(e.pointerId, { ...cur, name, el });
      }
    }
  }
  up(e) {
    if (this.stick.id !== null && e.pointerId === this.stick.id) this.releaseStick();
    this.releaseBtn(e.pointerId);
  }
  // タッチ イベントで「その ゆびは まだ ある？」を たしかめる（pointerup が こない ばあいの ほけん）
  touchEv(e, kind) {
    const touches = e.touches ? Array.from(e.touches) : [];
    const changed = e.changedTouches ? Array.from(e.changedTouches) : [];
    this.touchCount = touches.length; this.touchSeen = this.clock();
    const owners = [];
    if (this.stick.id !== null && this.stick.type === 'touch') owners.push(this.stick);
    for (const b of this.btnPtr.values()) if (b.type === 'touch') owners.push(b);
    if (kind === 'start') {
      // あたらしい ゆびと pointerdown を ばしょで むすびつける
      for (const t of changed) for (const o of owners) if (o.touchId === null && Math.hypot(t.clientX - o.lx, t.clientY - o.ly) < NEAR) o.touchId = t.identifier;
    }
    for (const o of owners) {
      let alive;
      if (o.touchId !== null && o.touchId !== undefined) {
        const t = touches.find((q) => q.identifier === o.touchId);
        alive = !!t; if (t) { o.lx = t.clientX; o.ly = t.clientY; }
      } else alive = touches.some((q) => Math.hypot(q.clientX - o.lx, q.clientY - o.ly) < LOST);
      if (!alive) {
        if (o === this.stick) this.releaseStick();
        else for (const [pid, b] of this.btnPtr) if (b === o) this.releaseBtn(pid);
      }
    }
  }
  // まいフレーム：のこりっぱなし チェック
  validate() {
    const t = this.clock();
    if (!this.enabled) { if (this.stick.id !== null || this.btnPtr.size) this.reset(); return; }
    const s = this.stick;
    // タッチが ひとつも ないのに パッドが うごいてる → もどす
    if (s.id !== null && s.type === 'touch' && this.touchSeen > 0 && this.touchCount === 0 && t - s.seen > STALE) this.releaseStick();
    for (const [pid, b] of this.btnPtr) if (b.type === 'touch' && this.touchSeen > 0 && this.touchCount === 0 && t - b.seen > STALE) this.releaseBtn(pid);
  }
  drawStick() { if (this.knob) this.knob.style.transform = `translate(${this.stick.x * 25}px, ${this.stick.y * 25}px)`; }
  key(e, on) {
    const name = KEYMAP[e.code];
    if (e.code === 'Escape' || e.code === 'KeyP') { if (on && this.enabled && this.onPause) this.onPause(); return; }
    if (!name) return;
    if (this.enabled) e.preventDefault();
    if (on) { if (!this.keys.has(name) && !this.btn.has(name)) this.edges.add(name); this.keys.add(name); }
    else this.keys.delete(name);
  }
  has(n) { return this.keys.has(n) || this.btn.has(n); }
  frame() {
    this.validate();
    const sx = this.stick.x, sy = this.stick.y;
    const out = {
      left: this.has('left') || sx < -0.35, right: this.has('right') || sx > 0.35,
      up: this.has('up') || sy < -0.6, down: this.has('down') || sy > 0.55,
      jump: this.edges.has('jump') || this.edges.has('up'), jumpHeld: this.has('jump') || this.has('up'),
      shoot: this.has('shoot'), kick: this.edges.has('kick'), punch: this.edges.has('punch'), swap: this.edges.has('swap'),
    };
    this.edges.clear();
    return out;
  }
}
