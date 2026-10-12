/**
 * DOMステージ（canvas不使用）
 * - 1体 = <div>。絵は art() の data URI を background-image で貼る（SVGは起動時に1回だけ解釈）
 * - 毎フレーム書き換えるのは transform だけ（レイアウト・ペイントを起こさない）
 * - 要素はプールで使い回し、生成/破棄でGCやレイアウトを揺らさない
 * - 一時エフェクトは Web Animations API（コンポジタで再生）
 * - がめんの そとの ものは display:none（スタイル計算・アニメ・ペイントを しない）
 * - おもい ときは「かるい モード」（ds-lite）：ぴょこぴょこ／ほうせきの ゆれを とめ、エフェクトと すうじを へらす
 * - ここでは Math.random を つかわない（みための ばらつきは カウンタで。ゲームの らんすうと まざらない）
 */
import { art, groundTile } from './art.js?v=203';

class Pool {
  constructor(layer, make) { this.layer = layer; this.make = make; this.free = []; this.active = new Set(); this.key = Symbol('node'); }
  get() {
    let n = this.free.pop();
    if (!n) { n = this.make(); this.layer.appendChild(n); }
    else n.style.display = '';
    n._hid = false;
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
let spriteSeq = 0;
function makeSprite(extra = '') {
  const n = el('ds-ent');
  n._flip = el('ds-flip', n);
  n._img = el(`ds-img ${extra}`, n._flip);
  n._img.style.animationDelay = `${-((spriteSeq++ * 0.618) % 1).toFixed(3)}s`;
  return n;
}

// エフェクトの うごき（まいかい つくらない）
const FX_FRAMES = {
  pop:  [{ transform: 'scale(.5)', opacity: 1 }, { transform: 'scale(1.5)', opacity: 0 }],
  boom: [{ transform: 'scale(.3)', opacity: 1 }, { transform: 'scale(1.1)', opacity: .9, offset: .4 }, { transform: 'scale(1.25)', opacity: 0 }],
  bboom: null,
  shatter: [{ transform: 'scale(.4) rotate(0deg)', opacity: 1 }, { transform: 'scale(1.1) rotate(25deg)', opacity: .9, offset: .5 }, { transform: 'scale(1.35) rotate(40deg)', opacity: 0 }],
  heal: [{ transform: 'translateY(0) scale(.6)', opacity: 1 }, { transform: 'translateY(-26px) scale(1)', opacity: 1, offset: .5 }, { transform: 'translateY(-46px) scale(.9)', opacity: 0 }],
  bolt: [{ transform: 'scaleY(.2)', opacity: 1, transformOrigin: '50% 100%' }, { transform: 'scaleY(1)', opacity: 1, offset: .25, transformOrigin: '50% 100%' }, { transform: 'scaleY(1)', opacity: 0, transformOrigin: '50% 100%' }],
};
FX_FRAMES.bboom = FX_FRAMES.boom;
const FX_OPTS = { bboom: { duration: 420, easing: 'ease-out' }, heal: { duration: 700, easing: 'ease-out' }, shatter: { duration: 520, easing: 'ease-out' }, pop: { duration: 300, easing: 'ease-out' }, boom: { duration: 420, easing: 'ease-out' }, bolt: { duration: 320, easing: 'ease-out' } };
const TEXT_FRAMES = [
  { transform: 'translate(-50%,0) scale(.6)', opacity: 1 },
  { transform: 'translate(-50%,-14px) scale(1.15)', opacity: 1, offset: .25 },
  { transform: 'translate(-50%,-34px) scale(1)', opacity: 0 },
];
const TEXT_OPTS = { duration: 650, easing: 'ease-out' };

// ゆかの ひ：THROW.fireLife（4.5びょう）と おなじ ながさ。rules の fireRadius と だいたい おなじ かたち
const FIRE_MS = 4500;
const FIRE_FRAMES = [
  { transform: 'scale(.44)', opacity: .9 },
  { transform: 'scale(.95)', opacity: 1, offset: .27 },
  { transform: 'scale(1)', opacity: 1, offset: .86 },
  { transform: 'scale(.6)', opacity: 0 },
];

// エフェクト・すうじの じょうげん（ふつう／かるい モード）
export const FX_CAP = { fx: 40, fxLite: 16, boom: 12, boomLite: 6, text: 30, textLite: 10 };

export class Stage {
  constructor(root) {
    this.root = root;
    this.view = el('ds-view', root);
    // カメラ（ズームは ここに scale を 1かい かけるだけ。じめんと せかいは なかで「ズームご の はば」で うごく）
    this.cam = el('ds-cam', this.view);
    this.ground = el('ds-ground', this.cam);
    this.setGround('lab');
    this.world = el('ds-world', this.cam);
    const deco = el('ds-layer', this.world), haz = el('ds-layer', this.world);
    const floor = el('ds-layer', this.world), units = el('ds-layer', this.world);
    const top = el('ds-layer', this.world), fx = el('ds-layer', this.world);

    // ゆかの かざり（けんきゅうじょの ボトル）。いちばん したに かく
    this.decor = new Pool(deco, () => {
      const n = el('ds-ent');
      n._img = el('ds-img ds-decor', n);
      n._alien = el('ds-img ds-alien', n._img);
      n._alien.style.backgroundImage = art('alienFloat');
      n._alien.style.animationDelay = `${-((spriteSeq++ * 0.618) % 1 * 2.4).toFixed(2)}s`;
      return n;
    });
    this.decorField = null;
    this.decorKind = null;
    // けんきゅうじょの ひ（ゆか）と、ばくだんの おちる しるし
    this.fires = new Pool(haz, () => makeSprite('ds-fire'));
    this.marks = new Pool(haz, () => { const n = el('ds-ent'); n._img = el('ds-mark', n); return n; });
    this.aura = el('ds-aura', floor);
    this.aura.style.display = 'none';
    this.gems = new Pool(floor, () => makeSprite('ds-gem'));
    this.items = new Pool(floor, () => makeSprite('ds-item'));
    this.enemies = new Pool(units, () => makeSprite('ds-walk'));

    this.player = makeSprite('ds-walk ds-hero');
    this.playerHp = el('ds-hp', this.player);
    this.playerHpFill = el('ds-hp-fill', this.playerHp);
    units.appendChild(this.player);
    // けんきゅうしゃ（1にんだけ。あたまの うえに ！ マーク）
    this.npc = makeSprite('ds-walk ds-keep');
    this.npcMark = el('ds-npc-mark', this.npc);
    this.npcMark.textContent = '！';
    this.npc.style.display = 'none';
    units.appendChild(this.npc);
    // コンテナ（1こ。ゆかの かざりと おなじ そう）と、たすけた けんきゅうしゃ・なかま（さいだい 4にん）
    this.crate = makeSprite('ds-crate');
    this.crateMark = el('ds-npc-mark ds-crate-mark', this.crate);
    this.crateMark.textContent = '！';
    this.crate.style.display = 'none';
    deco.appendChild(this.crate);
    this.helper = makeSprite('ds-walk ds-keep');
    this.helper.style.display = 'none';
    units.appendChild(this.helper);
    this.allies = new Pool(units, () => makeSprite('ds-walk ds-keep ds-ally'));
    // たてもの・こや・とびら・ちかの かべ・ろうや（おおきさが いろいろ。いちばん したの そう）
    this.props = new Pool(deco, () => { const n = el('ds-ent'); n._img = el('ds-img ds-prop', n); return n; });
    this.propVis = [];

    this.kunai = new Pool(top, () => makeSprite('ds-kunai'));
    this.bullets = new Pool(top, () => makeSprite('ds-bullet'));
    this.rockets = new Pool(top, () => makeSprite('ds-rocket'));
    this.bombs = new Pool(top, () => makeSprite('ds-bomb'));
    this.ebombs = new Pool(top, () => makeSprite('ds-ebomb'));
    this.stars = new Pool(top, () => makeSprite('ds-star'));
    this.beams = new Pool(top, () => { const n = el('ds-ent'); n._img = el('ds-beam', n); return n; });
    this.fxPool = new Pool(fx, () => { const n = el('ds-ent'); n._img = el('ds-fx', n); return n; });
    this.textPool = new Pool(fx, () => { const n = el('ds-ent'); n._img = el('ds-num', n); return n; });

    this.flashEl = el('ds-flash', root);
    this.hurtEl = el('ds-hurt', root);
    this.joy = el('ds-joy', root);
    this.joyKnob = el('ds-joy-knob', this.joy);
    this.joy.style.display = 'none';
    this.arrow(null); // やじるしも HUD より したに つくっておく
    this.frame = 0;
    this.texts = 0;
    this.booms = 0;
    this.textSeq = 0;
    this.gen = 0;
    this.lite = false;
    this.cull = { x0: -1e9, y0: -1e9, x1: 1e9, y1: 1e9 };
    // shots を しゅるいごとに わける はこ（まいフレーム つかいまわす）
    this.bk = { kunai: [], bullet: [], rocket: [], bomb: [], beam: [] };
    this.resize(1, 1);
  }

  setGround(kind) {
    if (this.groundKind === kind) return;
    this.groundKind = kind;
    this.tile = groundTile(kind);
    this.ground.style.backgroundImage = art(`ground-${kind}`);
    this.ground.style.backgroundSize = `${this.tile}px ${this.tile}px`;
    this.ground.style.setProperty('--ds-tile', `${this.tile}px`);
    this.root.dataset.ground = kind;
    if (this.w) this.resize(this.w, this.h, this.zoom || 1);
  }

  // w, h は ズームご の せかいの はば（がめん ÷ zoom）
  resize(w, h, zoom = 1) {
    this.w = w; this.h = h;
    if (this.zoom !== zoom) { this.zoom = zoom; this.cam.style.transform = zoom === 1 ? '' : `scale(${zoom})`; }
    this.cam.style.width = `${w}px`; this.cam.style.height = `${h}px`;
    const T = this.tile || 160;
    this.ground.style.width = `${w + T * 2}px`;
    this.ground.style.height = `${h + T * 2}px`;
  }

  // ゆかの かざり（kind = 'lab' で ボトル。null で なし）。field（DecorField）は ゲームがわが もつ（ボトルは こわせる）
  setDecor(kind, field = null) {
    this.decorKind = kind && field ? kind : null;
    this.decorField = field;
    if (!this.decorKind) this.decor.clear();
  }

  setLite(on) {
    if (this.lite === on) return;
    this.lite = on;
    this.root.classList.toggle('ds-lite', on);
  }

  reset() {
    this.gen = (this.gen || 0) + 1;
    for (const p of [this.props, this.beams, this.allies, this.decor, this.fires, this.marks, this.ebombs, this.gems, this.items, this.enemies, this.kunai, this.bullets, this.rockets, this.bombs, this.stars, this.fxPool, this.textPool]) {
      for (const n of p.active) n._img.getAnimations?.().forEach(a => a.cancel());
      p.clear();
    }
    this.texts = 0;
    this.booms = 0;
    this.aura.style.display = 'none';
    this.npc.style.display = 'none';
    this.crate.style.display = 'none';
    this.helper.style.display = 'none';
    this.arrow(null);
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

  // cull=true：がめんの そとの ものは かくして、apply も しない
  sync(pool, items, apply, cull = true) {
    const f = ++this.frame, c = this.cull;
    // おなじ もの（てきの ばくだん）を 2つの プールで かく ことが あるので、プールごとの かぎで ノードを おぼえる
    const K = pool.key;
    for (const it of items) {
      let n = it[K];
      if (!n || n._owner !== it) { n = it[K] = pool.get(); n._owner = it; }
      n._seen = f;
      if (cull && (it.x < c.x0 || it.x > c.x1 || it.y < c.y0 || it.y > c.y1)) {
        if (!n._hid) { n._hid = true; n.style.display = 'none'; }
        continue;
      }
      if (n._hid) { n._hid = false; n.style.display = ''; }
      apply(it, n);
    }
    for (const n of pool.active) if (n._seen !== f) { n._owner = null; pool.put(n); }
  }

  /* ---------- まいフレーム ---------- */
  draw(r, look) {
    const p = r.player, W = this.w, H = this.h, T = this.tile || 160;
    const mx = ((p.x % T) + T) % T, my = ((p.y % T) + T) % T;
    this.ground.style.transform = `translate3d(${-T - mx}px,${-T - my}px,0)`;
    this.world.style.transform = `translate3d(${Math.round(W / 2 - p.x)}px,${Math.round(H / 2 - p.y)}px,0)`;
    // みえる はんい（いちばん おおきい ボスの はんぶん くらいの よゆう）
    const M = 130, c = this.cull;
    c.x0 = p.x - W / 2 - M; c.x1 = p.x + W / 2 + M; c.y0 = p.y - H / 2 - M; c.y1 = p.y + H / 2 + M;

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

    // けんきゅうしゃ
    const npc = r.npc;
    if (npc) {
      if (this.npc.style.display === 'none') this.npc.style.display = '';
      Stage.look(this.npc, 'researcher', 50);
      Stage.face(this.npc, npc.x > p.x);
      Stage.place(this.npc, npc.x, npc.y);
    } else if (this.npc.style.display !== 'none') this.npc.style.display = 'none';

    // たてもの・かべ など（おおきいので じぶんで みえる ものだけ えらぶ）
    if (r.props) {
      const vis = this.propVis; vis.length = 0;
      const vx0 = p.x - W / 2, vx1 = p.x + W / 2, vy0 = p.y - H / 2, vy1 = p.y + H / 2;
      for (const pr of r.props) {
        if (pr.hidden || pr.x + pr.w / 2 < vx0 || pr.x - pr.w / 2 > vx1 || pr.y + pr.h / 2 < vy0 || pr.y - pr.h / 2 > vy1) continue;
        vis.push(pr);
      }
      this.sync(this.props, vis, (pr, n) => {
        if (n._a !== pr.kind) { n._a = pr.kind; n._img.style.backgroundImage = art(pr.kind); }
        if (n._w !== pr.w || n._h !== pr.h) {
          n._w = pr.w; n._h = pr.h;
          const st = n._img.style;
          st.width = `${pr.w}px`; st.height = `${pr.h}px`; st.marginLeft = `${-pr.w / 2}px`; st.marginTop = `${-pr.h / 2}px`;
        }
        const mark = !!pr.mark;
        if (n._m !== mark) {
          n._m = mark;
          if (mark && !n._mark) { n._mark = el('ds-npc-mark ds-prop-mark', n); n._mark.textContent = '！'; }
          if (n._mark) n._mark.style.display = mark ? '' : 'none';
        }
        Stage.place(n, pr.x, pr.y);
      }, false);
    }
    // コンテナ・なかま
    const box = r.container;
    if (box) {
      if (this.crate.style.display === 'none') this.crate.style.display = '';
      Stage.look(this.crate, box.open ? 'containerOpen' : 'container', 124);
      if (this.crateMark._open !== box.open) { this.crateMark._open = box.open; this.crateMark.style.display = box.open ? 'none' : ''; }
      Stage.place(this.crate, box.x, box.y);
      if (box.open) {
        if (this.helper.style.display === 'none') this.helper.style.display = '';
        Stage.look(this.helper, 'researcher', 46);
        Stage.face(this.helper, box.x + 52 > p.x);
        Stage.place(this.helper, box.x + 52, box.y + 34);
      }
    } else if (this.crate.style.display !== 'none') { this.crate.style.display = 'none'; this.helper.style.display = 'none'; }
    if (r.allies?.length) this.sync(this.allies, r.allies, (a, n) => {
      Stage.look(n, a.medic ? 'medic' : 'ally', a.medic ? 46 : 48);
      Stage.face(n, a.face < 0);
      Stage.place(n, a.x, a.y);
    }, false);

    // バリア
    const aura = look.auraRadius;
    if (aura) {
      if (this.aura.style.display === 'none') this.aura.style.display = '';
      const magic = !!look.auraMagic;
      if (this.aura._m !== magic) {
        this.aura._m = magic;
        this.aura.classList.toggle('magic', magic);
        if (magic && !this.aura._mc) { this.aura._mc = true; this.aura.style.setProperty('--ds-magic', art('magicCircle')); }
      }
      if (this.aura._r !== aura) { this.aura._r = aura; this.aura.style.width = this.aura.style.height = `${aura * 2}px`; this.aura.style.marginLeft = this.aura.style.marginTop = `${-aura}px`; }
      Stage.place(this.aura, p.x, p.y);
    }

    if (this.decorKind) {
      const list = this.decorField.visible(c.x0, c.y0, c.x1, c.y1);
      const states = look.bottles;
      this.sync(this.decor, list, (d, n) => {
        // こわされた ボトルは われた え（うちゅうじんも いない）
        const kind = d.kind !== 'flag' && states?.get(d.id)?.broken ? 'broken' : d.kind;
        if (n._a !== kind) {
          n._a = kind;
          n._img.style.backgroundImage = art(kind === 'flag' ? 'labFlag' : kind === 'broken' ? 'capsuleBroken' : 'capsule');
          n._img.classList.toggle('ds-decor-flag', kind === 'flag');
          n._alien.style.display = kind === 'alien' ? '' : 'none';
        }
        Stage.place(n, d.x, d.y);
      });
    }
    // ゆかの ひ：できた ときに 1かいだけ アニメ（ひろがって きえる）を つける。あとは いちを おくだけ
    if (r.fires) this.sync(this.fires, r.fires, (f, n) => {
      if (n._fid !== f.id) {
        n._fid = f.id;
        Stage.look(n, 'fire', 116);
        const a = n._flip.animate(FIRE_FRAMES, { duration: FIRE_MS, fill: 'forwards' });
        a.currentTime = f.age * 1000;
      }
      Stage.place(n, f.x, f.y);
    });
    if (r.ebombs) {
      this.sync(this.marks, r.ebombs, (b, n) => {
        const size = 96;
        if (n._s !== size) { n._s = size; const st = n._img.style; st.width = st.height = `${size}px`; st.marginLeft = st.marginTop = `${-size / 2}px`; }
        Stage.place(n, b.tx, b.ty);
      });
      this.sync(this.ebombs, r.ebombs, (b, n) => {
        const k = Math.min(1, b.t / b.dur);
        Stage.look(n, 'ebomb', 30);
        Stage.place(n, b.sx + (b.tx - b.sx) * k, b.sy + (b.ty - b.sy) * k - Math.sin(k * Math.PI) * 110);
      }, false);
    }
    this.sync(this.gems, r.gems, (g, n) => { Stage.look(n, g.v >= 4 ? 'gem3' : g.v >= 2 ? 'gem2' : 'gem1', g.v >= 4 ? 22 : 16); Stage.place(n, g.x, g.y); });
    this.sync(this.items, r.items, (it, n) => { Stage.look(n, it.kind, 30); Stage.place(n, it.x, it.y); });
    this.sync(this.enemies, r.enemies, (e, n) => {
      Stage.look(n, e.type, e.T.size * 1.15, e.flash > 0);
      Stage.face(n, e.x > p.x);
      Stage.place(n, e.x, e.y);
    });
    const bk = this.bk;
    bk.kunai.length = bk.bullet.length = bk.rocket.length = bk.bomb.length = bk.beam.length = 0;
    for (const s of r.shots) bk[s.kind]?.push(s);
    this.sync(this.kunai, bk.kunai, (s, n) => { Stage.look(n, 'kunai', 30); Stage.place(n, s.x, s.y, Math.round(s.ang * 20) / 20); });
    this.sync(this.bullets, bk.bullet, (s, n) => {
      Stage.look(n, s.art || 'bullet', s.size || 22);
      Stage.place(n, s.x, s.y, Math.round(s.ang * 20) / 20);
    });
    this.sync(this.rockets, bk.rocket, (s, n) => {
      Stage.look(n, s.art || 'rocket', s.size || 36);
      Stage.place(n, s.x, s.y, Math.round(s.ang * 20) / 20);
    });
    this.sync(this.bombs, bk.bomb, (s, n) => {
      const k = s.t / s.dur;
      Stage.look(n, 'bomb', 30);
      Stage.place(n, s.sx + (s.tx - s.sx) * k, s.sy + (s.ty - s.sy) * k - Math.sin(k * Math.PI) * 70);
    }, false);
    if (bk.beam.length || this.beams.active.size) this.sync(this.beams, bk.beam, (s, n) => {
      const st = n._img.style, len = Math.round(s.len), w = s.w;
      if (n._len !== len) { n._len = len; st.width = `${len}px`; }
      if (n._w !== w) { n._w = w; st.height = `${w}px`; st.marginTop = `${-w / 2}px`; }
      const o = Math.round(Math.max(0, s.life / s.max) * 10) / 10;
      if (n._o !== o) { n._o = o; st.opacity = o; }
      Stage.place(n, s.x, s.y, s.ang);
    }, false);
    this.sync(this.stars, look.orbit, (o, n) => { Stage.look(n, 'star', 34); Stage.place(n, o.x, o.y); }, false);
  }

  /* ---------- いっしゅんの エフェクト（WAAPI） ---------- */
  fx(kind, x, y, size = 40) {
    const C = FX_CAP, lite = this.lite, active = this.fxPool.active.size;
    if (active > (lite ? C.fxLite : C.fx)) return;
    // がめんの そとの エフェクトは つくらない
    const c = this.cull, m = size / 2;
    if (x + m < c.x0 || x - m > c.x1 || y + m < c.y0 || y - (kind === 'bolt' ? 0 : m) > c.y1) return;
    const boom = kind === 'boom' || kind === 'bboom';
    if (boom) { if (this.booms >= (lite ? C.boomLite : C.boom)) return; this.booms++; }
    else if (kind === 'pop' && lite && active > 8) return; // かるい モードでは こまかい ポンを まびく
    const n = this.fxPool.get(), img = n._img;
    // おなじ しゅるい・おおきさ なら スタイルを かきかえない（レイアウトを おこさない）
    const key = `${kind}${size}`;
    if (n._k !== key) {
      n._k = key;
      img.className = `ds-fx ds-fx-${kind}`;
      const st = img.style;
      st.height = `${size}px`;
      st.marginTop = kind === 'bolt' ? `${-size}px` : `${-size / 2}px`;
      if (kind === 'bolt') { st.backgroundImage = art('bolt'); st.width = `${size * 0.54}px`; st.marginLeft = `${-size * 0.27}px`; }
      else { st.backgroundImage = kind === 'heal' ? art('healPlus') : ''; st.width = `${size}px`; st.marginLeft = `${-size / 2}px`; }
    }
    Stage.place(n, x, y);
    const a = img.animate(FX_FRAMES[kind], FX_OPTS[kind]);
    const gen = this.gen;
    a.onfinish = a.oncancel = () => { if (gen !== this.gen) return; if (boom) this.booms--; this.fxPool.put(n); };
  }

  text(x, y, value, crit = false) {
    if (this.texts >= (this.lite ? FX_CAP.textLite : FX_CAP.text)) return;
    const c = this.cull;
    if (x < c.x0 || x > c.x1 || y < c.y0 || y > c.y1) return;
    this.texts++;
    const n = this.textPool.get(), img = n._img;
    img.textContent = value;
    if (n._crit !== crit) { n._crit = crit; img.classList.toggle('crit', crit); }
    Stage.place(n, x + ((this.textSeq++ * 5) % 15) - 7, y);
    const a = img.animate(TEXT_FRAMES, TEXT_OPTS), gen = this.gen;
    // reset() の あとに とどいた おわりの しらせは むし（プールに 2かい もどさない）
    a.onfinish = a.oncancel = () => { if (gen !== this.gen) return; this.texts--; this.textPool.put(n); };
  }

  shake(px) {
    if (!this.view.animate) return;
    // つづけて なんども ゆらさない（つよい ゆれは うわがき OK）
    const now = performance.now();
    if (this._shake && now - this._shakeAt < 120 && px <= this._shakePx) return;
    this._shake?.cancel();
    this._shakeAt = now; this._shakePx = px;
    const anim = this.view.animate([
      { transform: 'translate(0,0)' },
      { transform: `translate(${px}px, ${px * -0.5}px)`, offset: .25 },
      { transform: `translate(${-px * 0.6}px, ${px * 0.35}px)`, offset: .6 },
      { transform: 'translate(0,0)' },
    ], { duration: 200, easing: 'ease-out' });
    this._shake = anim;
    anim.onfinish = () => { if (this._shake === anim) this._shake = null; };
  }

  flash() { this.flashEl.animate([{ opacity: .85 }, { opacity: 0 }], { duration: 500, easing: 'ease-out' }); }
  hurt() { this.hurtEl.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, easing: 'ease-out' }); }

  /* ---------- ジョイスティック ---------- */
  /** がめんの そとの コンテナを さす やじるし（がめん ざひょう sx,sy と むき ang。null で かくす） */
  arrow(at) {
    if (!this.arrowEl) {
      this.arrowEl = el('ds-goal', this.root);
      el('ds-goal-tip', this.arrowEl).textContent = '➤';
      this.arrowLabel = el('ds-goal-label', this.arrowEl);
      this.arrowLabel.textContent = 'コンテナ';
      this.arrowEl.style.display = 'none';
    }
    const n = this.arrowEl;
    if (!at) { if (n.style.display !== 'none') n.style.display = 'none'; return; }
    if (n.style.display === 'none') n.style.display = '';
    const label = at.label || 'コンテナ';
    if (this.arrowLabel.textContent !== label) this.arrowLabel.textContent = label;
    const x = Math.round(at.x), y = Math.round(at.y), a = Math.round(at.ang * 20) / 20;
    if (n._x !== x || n._y !== y) { n._x = x; n._y = y; n.style.transform = `translate3d(${x}px,${y}px,0)`; }
    if (n._a !== a) { n._a = a; n.firstChild.style.transform = `rotate(${a}rad)`; }
  }

  joystick(stick, rect) {
    if (!stick) { if (this.joy.style.display !== 'none') this.joy.style.display = 'none'; return; }
    if (this.joy.style.display === 'none') this.joy.style.display = '';
    const dx = stick.x - stick.ox, dy = stick.y - stick.oy, d = Math.hypot(dx, dy), k = d > 50 ? 50 / d : 1;
    this.joy.style.transform = `translate3d(${stick.ox - rect.left}px,${stick.oy - rect.top}px,0)`;
    this.joyKnob.style.transform = `translate3d(${dx * k}px,${dy * k}px,0)`;
  }
}
