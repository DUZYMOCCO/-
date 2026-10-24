/**
 * ゾンビストライク（Zombie TPS）— かたごし カメラの シューティング
 * ハブが prepare()（CSS）→ init(container, onBackToHub) の じゅんに よぶ。
 */
import { loadCss } from '../../common/js/load-css.js';
import { storage } from '../../common/js/storage.js';
import { WEAPONS, WEAPON_ORDER, normalizeSave, SENS, VERSION } from './rules.js?v=2';
import { Game } from './game.js?v=2';
import { Input } from './input.js?v=2';
import { Sfx } from './sfx.js?v=2';

const SAVE_KEY = 'zombie_tps_save';
const OPT_LABEL = {
  autoFire: { true: 'オン', false: 'オフ' },
  sens: { low: 'ひくい', mid: 'ふつう', high: 'たかい' },
  quality: { auto: 'じどう', low: 'かるい', high: 'きれい' },
  flashlight: { true: 'オン', false: 'オフ' },
};
const OPT_CYCLE = { autoFire: [false, true], sens: ['low', 'mid', 'high'], quality: ['auto', 'low', 'high'], flashlight: [true, false] };

export default {
  prepare() {
    return loadCss(new URL('../css/zombie-tps.css?v=2', import.meta.url).href);
  },

  init(container, onBackToHub) {
    this.container = container; this.onBackToHub = onBackToHub;
    this.save = normalizeSave(storage.get(SAVE_KEY, null));
    this.alive = true;
    this.buildDOM();
    this.sfx = new Sfx(storage.getSoundMuted());
    this.startGame3D();
    this.bind();
    this.last = performance.now();
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  },

  startGame3D() {
    const hud = this.makeHud();
    try {
      this.game = new Game(this.canvas, hud, this.sfx, this.save);
    } catch (err) {
      console.error(err);
      this.el('.zt-title-err').textContent = 'この きかいでは 3Dが うごかないみたい…';
      return;
    }
    this.input = new Input(this.touch, this.canvas);
    this.applySens();
    this.onResize();
    window.__ztps = { game: this.game, input: this.input, app: this };
  },

  el(sel) { return this.container.querySelector(sel); },

  buildDOM() {
    const slots = WEAPON_ORDER.map((id) => `<button class="zt-slot" data-act="w:${id}" data-w="${id}"><b>${WEAPONS[id].slot}</b><span>${WEAPONS[id].short}</span><i></i></button>`).join('');
    this.container.innerHTML = `
    <div class="zt-root">
      <canvas class="zt-canvas"></canvas>
      <div class="zt-hurt"></div>
      <div class="zt-boom"></div>
      <div class="zt-touch">
        <div class="zt-stick"><div class="zt-knob"></div></div>
        <div class="zt-hud">
          <div class="zt-top">
            <button class="zt-pause" data-act="pause">Ⅱ</button>
            <div class="zt-hp"><span>HP</span><div class="zt-hpbar"><div></div></div><em>100</em></div>
            <div class="zt-wave"><b>ウェーブ 1</b><span>のこり 0</span></div>
            <div class="zt-score">スコア <b>0</b></div>
          </div>
          <div class="zt-slots">${slots}</div>
          <div class="zt-cross"><i class="t"></i><i class="b"></i><i class="l"></i><i class="r"></i><em></em></div>
          <div class="zt-hitm"></div>
          <div class="zt-reload"><div></div><span>リロード</span></div>
          <div class="zt-feed"></div>
          <div class="zt-banner"><b></b><span></span></div>
          <div class="zt-ammo"><div class="zt-wname"></div><div><b>30</b><span>/ 210</span></div></div>
          <button class="zt-btn zt-fire" data-act="fire"><span>うつ</span></button>
          <button class="zt-btn zt-aim" data-act="aim"><span>ねらう</span></button>
          <button class="zt-btn zt-rl" data-act="reload"><span>リロード</span></button>
          <button class="zt-btn zt-jump" data-act="jump"><span>ジャンプ</span></button>
          <div class="zt-keyhint">WASD いどう ・ マウス ねらう ・ ひだりクリック うつ ・ みぎクリック ねらう ・ R リロード ・ スペース ジャンプ ・ 1〜4 ぶき ・ ESC ポーズ</div>
        </div>
      </div>

      <div class="zt-screen zt-title">
        <div class="zt-title-box">
          <h1>ゾンビ<br>ストライク</h1>
          <p class="zt-sub">アサルトライフルと ロケットで まちを まもれ！</p>
          <div class="zt-stages">
            <button data-stage="day">☀ ひるの まち</button>
            <button data-stage="night">🌙 よるの まち</button>
          </div>
          <button class="zt-big" data-ui="start">スタート</button>
          <div class="zt-opts">
            <button data-opt="autoFire">オートうち <b></b></button>
            <button data-opt="sens">かんど <b></b></button>
            <button data-opt="quality">がしつ <b></b></button>
            <button data-opt="flashlight">ライト <b></b></button>
          </div>
          <div class="zt-best"></div>
          <button class="zt-small" data-ui="hub">← こうぼうへ もどる</button>
          <div class="zt-title-err"></div>
        </div>
        <div class="zt-help">
          <div><b>ひだり</b> ゆびで いどう</div>
          <div><b>みぎ</b> ドラッグで ねらう</div>
          <div><b>うつ</b> おしたまま れんしゃ（ドラッグも できる）</div>
          <div><b>あたま</b>を うつと ヘッドショット！</div>
          <div><b>4</b> ロケットで まとめて ふっとばせ！</div>
          <div class="zt-ver">v${VERSION}</div>
        </div>
      </div>

      <div class="zt-screen zt-pausescr hidden">
        <div class="zt-panel">
          <h2>ポーズ</h2>
          <button class="zt-big" data-ui="resume">つづける</button>
          <button class="zt-small" data-ui="title">タイトルへ</button>
        </div>
      </div>

      <div class="zt-screen zt-over hidden">
        <div class="zt-panel">
          <h2>やられた…</h2>
          <div class="zt-res"></div>
          <button class="zt-big" data-ui="retry">もういちど</button>
          <button class="zt-small" data-ui="title">タイトルへ</button>
        </div>
      </div>

      <div class="zt-rotate"><div>📱↻<br>よこむきに してね</div></div>
    </div>`;
    this.root = this.el('.zt-root');
    this.canvas = this.el('.zt-canvas');
    this.touch = this.el('.zt-touch');
    this.updateTitle();
  },

  updateTitle() {
    for (const b of this.container.querySelectorAll('[data-opt]')) {
      const k = b.dataset.opt; b.querySelector('b').textContent = OPT_LABEL[k][String(this.save[k])];
    }
    for (const b of this.container.querySelectorAll('[data-stage]')) b.classList.toggle('sel', b.dataset.stage === this.save.stage);
    const fl = this.el('[data-opt="flashlight"]'); if (fl) fl.style.display = this.save.stage === 'night' ? '' : 'none';
    this.el('.zt-best').textContent = this.save.bestWave ? `さいこう ウェーブ ${this.save.bestWave} ・ スコア ${this.save.bestScore}` : '';
  },

  applySens() {
    if (!this.input) return;
    const s = SENS[this.save.sens];
    this.input.lookScaleTouch = 0.0062 * s; this.input.lookScaleMouse = 0.0024 * s;
  },

  persist() { storage.set(SAVE_KEY, this.save); },

  bind() {
    this.onClick = (e) => {
      const b = e.target.closest('[data-ui],[data-opt],[data-stage]'); if (!b) return;
      this.sfx.unlock();
      if (b.dataset.stage) {
        this.save.stage = b.dataset.stage; this.persist(); this.updateTitle();
        if (this.game) { this.game.settings = this.save; this.game.applyStage(this.save.stage); }
        this.sfx.swap();
        return;
      }
      const opt = b.dataset.opt;
      if (opt) {
        const cyc = OPT_CYCLE[opt];
        this.save[opt] = cyc[(cyc.indexOf(this.save[opt]) + 1) % cyc.length];
        this.persist(); this.updateTitle(); this.applySens();
        if (this.game) this.game.settings = this.save;
        if (opt === 'quality') this.rebuild3D();
        if (opt === 'flashlight' && this.game) this.game.applyStage(this.save.stage);
        return;
      }
      const ui = b.dataset.ui;
      if (ui === 'start' || ui === 'retry') this.play();
      else if (ui === 'resume') this.resume();
      else if (ui === 'title') this.toTitle();
      else if (ui === 'hub') this.back();
    };
    this.container.addEventListener('click', this.onClick);
    this.onResize = this.onResize.bind(this);
    window.addEventListener('resize', this.onResize);
    window.addEventListener('orientationchange', this.onResize);
    this.onVis = () => { if (document.hidden && this.game && this.game.state === 'play') this.pause(); };
    document.addEventListener('visibilitychange', this.onVis);
    this.onLock = () => {
      if (!document.pointerLockElement && this.game && this.game.state === 'play' && !this.input.usingTouch) this.pause();
    };
    document.addEventListener('pointerlockchange', this.onLock);
  },

  rebuild3D() {
    if (this.game) { this.game.dispose(); this.input.destroy(); }
    const c = this.canvas.cloneNode(); this.canvas.replaceWith(c); this.canvas = c;
    this.startGame3D();
  },

  show(which) {
    this.el('.zt-title').classList.toggle('hidden', which !== 'title');
    this.el('.zt-pausescr').classList.toggle('hidden', which !== 'pause');
    this.el('.zt-over').classList.toggle('hidden', which !== 'over');
    this.root.classList.toggle('zt-playing', which === 'play' || which === 'pause' || which === 'over');
    this.input && (this.input.enabled = which === 'play');
  },

  play() {
    if (!this.game) return;
    this.input.reset();
    this.game.startGame();
    this.show('play');
    if (!matchMedia('(pointer: coarse)').matches) this.canvas.requestPointerLock?.();
  },
  pause() {
    if (!this.game || this.game.state !== 'play') return;
    this.game.state = 'pause'; this.input.reset(); this.show('pause');
    if (document.pointerLockElement) document.exitPointerLock();
  },
  resume() {
    if (!this.game) return;
    this.game.state = 'play'; this.show('play'); this.last = performance.now();
    if (!this.input.usingTouch && !matchMedia('(pointer: coarse)').matches) this.canvas.requestPointerLock?.();
  },
  toTitle() {
    if (!this.game) return;
    if (document.pointerLockElement) document.exitPointerLock();
    this.game.setupTitle(); this.show('title'); this.updateTitle();
  },

  makeHud() {
    const q = (s) => this.el(s);
    const E = {
      hpBar: q('.zt-hpbar div'), hpNum: q('.zt-hp em'), wave: q('.zt-wave b'), left: q('.zt-wave span'), score: q('.zt-score b'),
      ammo: q('.zt-ammo b'), res: q('.zt-ammo span'), wname: q('.zt-wname'), cross: q('.zt-cross'), hitm: q('.zt-hitm'),
      boom: q('.zt-boom'), feed: q('.zt-feed'), banner: q('.zt-banner'), reload: q('.zt-reload'), reloadBar: q('.zt-reload div'), hurt: q('.zt-hurt'),
      slots: [...this.container.querySelectorAll('.zt-slot')],
    };
    const last = {};
    const setText = (k, el, v) => { if (last[k] !== v) { last[k] = v; el.textContent = v; } };
    let feedN = 0;
    const app = this;
    return {
      show: (w) => app.show(w),
      set: (s) => {
        const hpp = Math.max(0, s.hp / s.maxHp);
        if (last.hp !== s.hp) { last.hp = s.hp; E.hpBar.style.width = (hpp * 100).toFixed(1) + '%'; E.hpBar.classList.toggle('low', hpp < 0.35); E.hpNum.textContent = s.hp; }
        setText('wave', E.wave, s.wave ? `ウェーブ ${s.wave}` : 'じゅんび');
        setText('left', E.left, `のこり ${s.left}`);
        setText('score', E.score, String(s.score));
        setText('ammo', E.ammo, String(s.ammo));
        setText('res', E.res, '/ ' + (s.reserve === Infinity ? '∞' : s.reserve));
        setText('wname', E.wname, WEAPONS[s.weapon].name);
        E.ammo.classList.toggle('low', s.ammo <= Math.ceil(s.mag * 0.25));
        if (last.weapon !== s.weapon) { last.weapon = s.weapon; for (const b of E.slots) b.classList.toggle('sel', b.dataset.w === s.weapon); }
        for (const b of E.slots) { const g = s.guns[b.dataset.w]; const t = `${g.ammo}`; const i = b.querySelector('i'); if (i.textContent !== t) i.textContent = t; }
        // クロスヘア（ばらつきに あわせて ひらく）
        const h = app.canvas.clientHeight || 375;
        const gap = Math.round(5 + (s.spread / Math.tan((s.fov * Math.PI / 180) / 2)) * (h / 2));
        if (last.gap !== gap) { last.gap = gap; E.cross.style.setProperty('--gap', gap + 'px'); }
        const rl = s.reloading >= 0;
        if (last.rl !== rl) { last.rl = rl; E.reload.classList.toggle('on', rl); }
        if (rl) E.reloadBar.style.width = (s.reloading * 100).toFixed(0) + '%';
      },
      crossTarget: (on) => { if (last.ct !== on) { last.ct = on; E.cross.classList.toggle('target', on); } },
      hitmarker: (head) => {
        E.hitm.classList.remove('on', 'head'); void E.hitm.offsetWidth; E.hitm.classList.add('on'); if (head) E.hitm.classList.add('head');
      },
      kill: (text, head) => {
        const d = document.createElement('div'); d.textContent = text; if (head) d.className = 'head';
        E.feed.prepend(d); feedN++;
        while (E.feed.children.length > 3) E.feed.lastChild.remove();
        setTimeout(() => d.remove(), 1600);
      },
      banner: (a, b) => {
        E.banner.querySelector('b').textContent = a; E.banner.querySelector('span').textContent = b || '';
        E.banner.classList.remove('on'); void E.banner.offsetWidth; E.banner.classList.add('on');
      },
      boom: (k) => {
        E.boom.style.setProperty('--k', k.toFixed(2));
        E.boom.classList.remove('on'); void E.boom.offsetWidth; E.boom.classList.add('on');
      },
      hurt: (ang) => { E.hurt.classList.remove('on'); void E.hurt.offsetWidth; E.hurt.classList.add('on'); },
      pause: () => app.pause(),
      over: (r) => {
        const best = r.wave > app.save.bestWave || r.score > app.save.bestScore;
        app.save.bestWave = Math.max(app.save.bestWave, r.wave); app.save.bestScore = Math.max(app.save.bestScore, r.score); app.persist();
        app.el('.zt-res').innerHTML = `<div>ウェーブ <b>${r.wave}</b></div><div>スコア <b>${r.score}</b></div><div>たおした ゾンビ <b>${r.kills}</b>（ヘッドショット ${r.heads}）</div>${best ? '<div class="zt-new">しんきろく！</div>' : ''}`;
        if (document.pointerLockElement) document.exitPointerLock();
        setTimeout(() => app.alive && app.game && app.game.state === 'over' && app.show('over'), 900);
        app.input.reset(); app.input.enabled = false;
      },
    };
  },

  onResize() {
    if (!this.game) return;
    const w = this.root.clientWidth || window.innerWidth, h = this.root.clientHeight || window.innerHeight;
    this.game.resize(w, h);
  },

  loop(now) {
    if (!this.alive) return;
    this.raf = requestAnimationFrame(this.loop);
    const frameMs = now - this.last;
    const dt = Math.min(1 / 30, Math.max(0, frameMs / 1000));
    this.last = now;
    if (!this.game) return;
    const t0 = performance.now();
    const inp = this.input.read();
    this.game.update(dt, inp);
    this.game.render();
    const cpu = performance.now() - t0;
    const st = this.game.stats;
    st.frames++; st.cpu += cpu; st.frameSum = (st.frameSum || 0) + frameMs;
    if (this.game.state === 'play') this.game.adaptQuality(frameMs);
  },

  destroy() {
    this.alive = false;
    cancelAnimationFrame(this.raf);
    this.container.removeEventListener('click', this.onClick);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('orientationchange', this.onResize);
    document.removeEventListener('visibilitychange', this.onVis);
    document.removeEventListener('pointerlockchange', this.onLock);
    if (this.input) this.input.destroy();
    if (this.game) this.game.dispose();
    this.sfx.close();
    this.game = null; window.__ztps = null;
  },

  back() {
    this.destroy();
    this.onBackToHub?.();
  },
};
