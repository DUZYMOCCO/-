// そうさ：ひだりの パッドで いどう、みぎの ボタンで ジャンプ・うつ・キック・パンチ・ぶきかえ／キーボード
const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'jump', ArrowDown: 'down', KeyS: 'down',
  Space: 'jump', KeyZ: 'jump', KeyJ: 'shoot', KeyX: 'shoot', KeyK: 'kick', KeyC: 'kick', KeyL: 'punch', KeyV: 'punch', KeyQ: 'swap', KeyE: 'swap', KeyI: 'swap',
};
export class Input {
  constructor(layer) {
    this.layer = layer;
    this.pad = layer.querySelector('.sa-pad'); this.knob = layer.querySelector('.sa-knob');
    this.keys = new Set(); this.btn = new Set(); this.edges = new Set();
    this.stick = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
    this.btnPtr = new Map();
    this.enabled = false; this.onPause = null;
    this.h = {
      down: (e) => this.down(e), move: (e) => this.move(e), up: (e) => this.up(e),
      kd: (e) => this.key(e, true), ku: (e) => this.key(e, false),
      blur: () => this.reset(), ctx: (e) => e.preventDefault(),
    };
    layer.addEventListener('pointerdown', this.h.down);
    window.addEventListener('pointermove', this.h.move, { passive: false });
    window.addEventListener('pointerup', this.h.up); window.addEventListener('pointercancel', this.h.up);
    window.addEventListener('keydown', this.h.kd); window.addEventListener('keyup', this.h.ku);
    window.addEventListener('blur', this.h.blur); layer.addEventListener('contextmenu', this.h.ctx);
  }
  destroy() {
    const L = this.layer;
    L.removeEventListener('pointerdown', this.h.down);
    window.removeEventListener('pointermove', this.h.move); window.removeEventListener('pointerup', this.h.up); window.removeEventListener('pointercancel', this.h.up);
    window.removeEventListener('keydown', this.h.kd); window.removeEventListener('keyup', this.h.ku);
    window.removeEventListener('blur', this.h.blur); L.removeEventListener('contextmenu', this.h.ctx);
  }
  reset() { this.keys.clear(); this.btn.clear(); this.edges.clear(); this.btnPtr.clear(); this.stick.id = null; this.stick.x = this.stick.y = 0; this.drawStick(); this.layer.querySelectorAll('.sa-btn.on').forEach((b) => b.classList.remove('on')); }
  press(name) { if (!this.btn.has(name) && !this.keys.has(name)) this.edges.add(name); }
  down(e) {
    if (!this.enabled) return;
    const b = e.target.closest('[data-btn]');
    if (b) {
      e.preventDefault();
      const name = b.dataset.btn;
      if (name === 'pause') { this.onPause && this.onPause(); return; }
      this.press(name); this.btn.add(name); this.btnPtr.set(e.pointerId, { name, el: b }); b.classList.add('on');
      return;
    }
    const r = this.layer.getBoundingClientRect();
    if (e.clientX - r.left < r.width * 0.5 && this.stick.id === null) {
      e.preventDefault();
      this.stick.id = e.pointerId; this.stick.ox = e.clientX; this.stick.oy = e.clientY; this.stick.x = 0; this.stick.y = 0;
      this.pad.style.left = `${e.clientX - r.left}px`; this.pad.style.top = `${e.clientY - r.top}px`; this.pad.classList.add('on');
      this.drawStick();
    }
  }
  move(e) {
    if (e.pointerId === this.stick.id) {
      e.preventDefault();
      const R = 46; let dx = e.clientX - this.stick.ox, dy = e.clientY - this.stick.oy;
      const d = Math.hypot(dx, dy); if (d > R) { this.stick.ox += dx * (1 - R / d) * 0.6; this.stick.oy += dy * (1 - R / d) * 0.6; dx *= R / d; dy *= R / d; }
      const wasUp = this.stick.y < -0.6;
      this.stick.x = dx / R; this.stick.y = dy / R;
      if (!wasUp && this.stick.y < -0.6) this.edges.add('stickUp');
      this.drawStick();
    } else if (this.btnPtr.has(e.pointerId)) {
      // ボタンの うえで ゆびを すべらせても いい
      const el = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('[data-btn]');
      const cur = this.btnPtr.get(e.pointerId);
      if (el && el !== cur.el && el.dataset.btn !== 'pause') {
        this.btn.delete(cur.name); cur.el.classList.remove('on');
        const name = el.dataset.btn; this.press(name); this.btn.add(name); el.classList.add('on'); this.btnPtr.set(e.pointerId, { name, el });
      }
    }
  }
  up(e) {
    if (e.pointerId === this.stick.id) { this.stick.id = null; this.stick.x = this.stick.y = 0; this.pad.classList.remove('on'); this.drawStick(); }
    const b = this.btnPtr.get(e.pointerId);
    if (b) { this.btnPtr.delete(e.pointerId); if (![...this.btnPtr.values()].some((v) => v.name === b.name)) { this.btn.delete(b.name); b.el.classList.remove('on'); } }
  }
  drawStick() { this.knob.style.transform = `translate(${this.stick.x * 40}px, ${this.stick.y * 40}px)`; }
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
