/**
 * DOMステージ（canvas不使用）
 * - 1体 = <div>。絵は art() の data URI を background-image で貼る（SVGは起動時に1回だけ解釈）
 * - 毎フレーム書き換えるのは transform だけ（レイアウト・ペイントを起こさない）
 * - 要素はプールで使い回し、生成/破棄でGCやレイアウトを揺らさない
 * - 一時エフェクトは Web Animations API（コンポジタで再生）
 */
import { art } from './art.js?v=176';

class Pool {
  constructor(layer, make) { this.layer = layer; this.make = make; this.free = []; this.active = new Set(); }
  get() {
    let n = this.free.pop();
    if (!n) { n = this.make(); this.layer.appendChild(n); }
    else n.style.display = '';
    this.active.add(n);
    return n;
  }
  put(n) { n.style.display = 'none'; n._x = n._y = n._a = undefined; this.active.delete(n); this.free.push(n); }
  clear() { for (const n of [...this.active]) this.put(n); }
}

function el(cls, parent) {
  const d = document.createElement('div');
  d.className = cls;
  if (parent) parent.appendChild(d);
  return d;
}

// 位置(外) > 向き(中) > 絵(内) の3段。内側は CSS アニメ（ぴょこぴょこ）専用
function makeSprite(extra = '') {
  const n = el('ds-ent');
  n._flip = el('ds-flip', n);
  n._img = el(`ds-img ${extra}`, n._flip);
  n._img.style.animationDelay = `${-Math.random()}s`;
  return n;
}

export class Stage {
  constructor(root) {
    this.root = root;
    this.view = el('ds-view', root);
    this.ground = el('ds-ground', this.view);
    this.ground.style.backgroundImage = art('ground');
    this.world = el('ds-world', this.view);
    const floor = el('ds-layer', this.world), units = el('ds-layer', this.world);
    const top = el('ds-layer', this.world), fx = el('ds-layer', this.world);

    this.aura = el('ds-aura', floor);
    this.aura.style.display = 'none';
    this.gems = new Pool(floor, () => makeSprite('ds-gem'));
    this.items = new Pool(floor, () => makeSprite('ds-item'));
    this.enemies = new Pool(units, () => makeSprite('ds-walk'));

    this.player = makeSprite('ds-walk ds-hero');
    this.playerHp = el('ds-hp', this.player);
    this.playerHpFill = el('ds-hp-fill', this.playerHp);
    units.appendChild(this.player);

    this.kunai = new Pool(top, () => makeSprite('ds-kunai'));
    this.bombs = new Pool(top, () => makeSprite('ds-bomb'));
    this.stars = new Pool(top, () => makeSprite('ds-star'));
    this.fxPool = new Pool(fx, () => { const n = el('ds-ent'); n._img = el('ds-fx', n); return n; });
    this.textPool = new Pool(fx, () => { const n = el('ds-ent'); n._img = el('ds-num', n); return n; });

    this.flashEl = el('ds-flash', root);
    this.hurtEl = el('ds-hurt', root);
    this.joy = el('ds-joy', root);
    this.joyKnob = el('ds-joy-knob', this.joy);
    this.joy.style.display = 'none';
    this.frame = 0;
    this.texts = 0;
    this.resize(1, 1);
  }

  resize(w, h) {
    this.w = w; this.h = h;
    this.ground.style.width = `${w + 320}px`;
    this.ground.style.height = `${h + 320}px`;
  }

  reset() {
    for (const p of [this.gems, this.items, this.enemies, this.kunai, this.bombs, this.stars, this.fxPool, this.textPool]) {
      for (const n of p.active) n._img.getAnimations?.().forEach(a => a.cancel());
      p.clear();
    }
    this.texts = 0;
    this.aura.style.display = 'none';
  }

  /* ---------- 小さな差分更新ヘルパ ---------- */
  static place(n, x, y, rot) {
    x = Math.round(x); y = Math.round(y);
    if (n._x === x && n._y === y && n._r === rot) return;
    n._x = x; n._y = y; n._r = rot;
    n.style.transform = rot ? `translate3d(${x}px,${y}px,0) rotate(${rot}rad)` : `translate3d(${x}px,${y}px,0)`;
  }
  static look(n, name, size, flash = false) {
    const key = flash ? `${name}!` : name;
    if (n._a !== key) { n._a = key; n._img.style.backgroundImage = art(name, flash); }
    if (n._s !== size) {
      n._s = size;
      const st = n._img.style;
      st.width = st.height = `${size}px`;
      st.marginLeft = st.marginTop = `${-size / 2}px`;
    }
  }
  static face(n, left) {
    if (n._f === left) return;
    n._f = left;
    n._flip.classList.toggle('left', left);
  }

  sync(pool, items, apply) {
    const f = ++this.frame;
    for (const it of items) {
      let n = it.node;
      if (!n || n._owner !== it) { n = it.node = pool.get(); n._owner = it; }
      n._seen = f;
      apply(it, n);
    }
    for (const n of pool.active) if (n._seen !== f) { n._owner = null; pool.put(n); }
  }

  /* ---------- まいフレーム ---------- */
  draw(r, look) {
    const p = r.player, W = this.w, H = this.h, T = 160;
    const mx = ((p.x % T) + T) % T, my = ((p.y % T) + T) % T;
    this.ground.style.transform = `translate3d(${-T - mx}px,${-T - my}px,0)`;
    this.world.style.transform = `translate3d(${Math.round(W / 2 - p.x)}px,${Math.round(H / 2 - p.y)}px,0)`;

    // じぶん
    Stage.place(this.player, p.x, p.y);
    Stage.look(this.player, r.char.id, 52);
    Stage.face(this.player, p.face < 0);
    const blink = p.hurt > 0;
    if (this.player._blink !== blink) { this.player._blink = blink; this.player.classList.toggle('ds-blink', blink); }
    const hp = Math.max(0, Math.min(1, p.hp / r.stats.maxHp)), hpKey = Math.round(hp * 100);
    if (this.player._hp !== hpKey) {
      this.player._hp = hpKey;
      this.playerHpFill.style.transform = `scaleX(${hp})`;
      this.playerHpFill.style.background = hp > 0.5 ? '#22c55e' : hp > 0.25 ? '#facc15' : '#ef4444';
    }

    // バリア
    const aura = look.auraRadius;
    if (aura) {
      if (this.aura.style.display === 'none') this.aura.style.display = '';
      if (this.aura._r !== aura) { this.aura._r = aura; this.aura.style.width = this.aura.style.height = `${aura * 2}px`; this.aura.style.marginLeft = this.aura.style.marginTop = `${-aura}px`; }
      Stage.place(this.aura, p.x, p.y);
    }

    this.sync(this.gems, r.gems, (g, n) => { Stage.look(n, g.v >= 4 ? 'gem3' : g.v >= 2 ? 'gem2' : 'gem1', g.v >= 4 ? 22 : 16); Stage.place(n, g.x, g.y); });
    this.sync(this.items, r.items, (it, n) => { Stage.look(n, it.kind, 30); Stage.place(n, it.x, it.y); });
    this.sync(this.enemies, r.enemies, (e, n) => {
      Stage.look(n, e.type, e.T.size * 1.15, e.flash > 0);
      Stage.face(n, e.x > p.x);
      Stage.place(n, e.x, e.y);
    });
    this.sync(this.kunai, r.shots.filter(s => s.kind === 'kunai'), (s, n) => { Stage.look(n, 'kunai', 30); Stage.place(n, s.x, s.y, Math.round(s.ang * 20) / 20); });
    this.sync(this.bombs, r.shots.filter(s => s.kind === 'bomb'), (s, n) => {
      const k = s.t / s.dur;
      Stage.look(n, 'bomb', 30);
      Stage.place(n, s.sx + (s.tx - s.sx) * k, s.sy + (s.ty - s.sy) * k - Math.sin(k * Math.PI) * 70);
    });
    this.sync(this.stars, look.orbit, (o, n) => { Stage.look(n, 'star', 34); Stage.place(n, o.x, o.y); });
  }

  /* ---------- いっしゅんの エフェクト（WAAPI） ---------- */
  fx(kind, x, y, size = 40) {
    if (this.fxPool.active.size > 40) return;
    const n = this.fxPool.get(), img = n._img;
    img.className = `ds-fx ds-fx-${kind}`;
    img.style.width = img.style.height = `${size}px`;
    img.style.marginLeft = `${-size / 2}px`;
    img.style.marginTop = kind === 'bolt' ? `${-size}px` : `${-size / 2}px`;
    if (kind === 'bolt') { img.style.backgroundImage = art('bolt'); img.style.width = `${size * 0.54}px`; img.style.marginLeft = `${-size * 0.27}px`; }
    else img.style.backgroundImage = '';
    Stage.place(n, x, y);
    const frames = {
      pop:  [{ transform: 'scale(.5)', opacity: 1 }, { transform: 'scale(1.5)', opacity: 0 }],
      boom: [{ transform: 'scale(.3)', opacity: 1 }, { transform: 'scale(1.1)', opacity: .9, offset: .4 }, { transform: 'scale(1.25)', opacity: 0 }],
      bolt: [{ transform: 'scaleY(.2)', opacity: 1, transformOrigin: '50% 100%' }, { transform: 'scaleY(1)', opacity: 1, offset: .25, transformOrigin: '50% 100%' }, { transform: 'scaleY(1)', opacity: 0, transformOrigin: '50% 100%' }],
    }[kind];
    const a = img.animate(frames, { duration: kind === 'boom' ? 420 : kind === 'bolt' ? 320 : 300, easing: 'ease-out' });
    a.onfinish = a.oncancel = () => this.fxPool.put(n);
  }

  text(x, y, value, crit = false) {
    if (this.texts >= 30) return;
    this.texts++;
    const n = this.textPool.get(), img = n._img;
    img.textContent = value;
    img.classList.toggle('crit', crit);
    Stage.place(n, x + (Math.random() - 0.5) * 14, y);
    const a = img.animate([
      { transform: 'translate(-50%,0) scale(.6)', opacity: 1 },
      { transform: 'translate(-50%,-14px) scale(1.15)', opacity: 1, offset: .25 },
      { transform: 'translate(-50%,-34px) scale(1)', opacity: 0 },
    ], { duration: 650, easing: 'ease-out' });
    a.onfinish = a.oncancel = () => { this.texts--; this.textPool.put(n); };
  }

  flash() { this.flashEl.animate([{ opacity: .85 }, { opacity: 0 }], { duration: 500, easing: 'ease-out' }); }
  hurt() { this.hurtEl.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, easing: 'ease-out' }); }

  /* ---------- ジョイスティック ---------- */
  joystick(stick, rect) {
    if (!stick) { if (this.joy.style.display !== 'none') this.joy.style.display = 'none'; return; }
    if (this.joy.style.display === 'none') this.joy.style.display = '';
    const dx = stick.x - stick.ox, dy = stick.y - stick.oy, d = Math.hypot(dx, dy), k = d > 50 ? 50 / d : 1;
    this.joy.style.transform = `translate3d(${stick.ox - rect.left}px,${stick.oy - rect.top}px,0)`;
    this.joyKnob.style.transform = `translate3d(${dx * k}px,${dy * k}px,0)`;
  }
}
