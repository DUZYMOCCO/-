/**
 * ガンキック ヒーローズ（side-action）— よこスクロール アクション
 * ハブが prepare()（CSS）→ init(container, onBackToHub) の じゅんに よぶ。
 */
import { loadCss } from '../../common/js/load-css.js';
import { storage } from '../../common/js/storage.js';
import { VERSION, STAGES, WEAPONS, normalizeSave, rankOf } from './rules.js?v=1';
import { Game } from './game.js?v=1';
import { Renderer } from './render.js?v=1';
import { Input } from './input.js?v=1';
import { Sfx } from './sfx.js?v=1';

const SAVE_KEY = 'side_action_save';
const TITLE = 'ガンキック ヒーローズ';

export default {
  prepare() { return loadCss(new URL('../css/side-action.css?v=1', import.meta.url).href); },

  init(container, onBackToHub) {
    this.container = container; this.onBackToHub = onBackToHub;
    this.save = normalizeSave(storage.get(SAVE_KEY, null));
    this.alive = true; this.game = null; this.paused = false;
    this.buildDOM();
    this.sfx = new Sfx(storage.getSoundMuted());
    this.renderer = new Renderer(this.canvas);
    this.input = new Input(this.el('.sa-touch'));
    this.input.onPause = () => this.pause();
    this.bind();
    this.resize();
    this.show('title');
    this.fps = { n: 0, t: 0, v: 60 };
    this.last = performance.now();
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
    if (typeof window !== 'undefined') window.__sa = this;
  },
  el(s) { return this.root.querySelector(s); },
  buildDOM() {
    const root = this.root = document.createElement('div');
    root.className = 'sa-root';
    root.innerHTML = `
      <canvas class="sa-cv"></canvas>
      <div class="sa-hud">
        <div class="sa-me"><div class="sa-face"></div><div><div class="sa-hpbar"><i></i></div><div class="sa-lives"></div></div></div>
        <div class="sa-allies"></div>
        <div class="sa-score">0</div>
        <div class="sa-wpn"><b></b><span></span></div>
      </div>
      <div class="sa-touch">
        <div class="sa-pad"><div class="sa-knob"></div></div>
        <button class="sa-btn sa-pause" data-btn="pause" aria-label="ポーズ">Ⅱ</button>
        <button class="sa-btn sa-swap" data-btn="swap">ぶきかえ</button>
        <button class="sa-btn sa-shoot" data-btn="shoot">うつ</button>
        <button class="sa-btn sa-punch" data-btn="punch">パンチ</button>
        <button class="sa-btn sa-kick" data-btn="kick">キック</button>
        <button class="sa-btn sa-jump" data-btn="jump">ジャンプ</button>
      </div>
      <div class="sa-scr sa-title">
        <h1>${TITLE}</h1>
        <p class="sa-sub">キック！ パンチ！ うって すすめ！</p>
        <div class="sa-stages"></div>
        <div class="sa-row">
          <button class="sa-small" data-act="allies"></button>
          <button class="sa-small" data-act="howto">あそびかた</button>
          <button class="sa-small" data-act="hub">← もどる</button>
        </div>
        <div class="sa-ver">v${VERSION}</div>
      </div>
      <div class="sa-scr sa-howto">
        <h2>あそびかた</h2>
        <div class="sa-howgrid">
          <div><b>ひだりの パッド</b>：いどう（したで スライディング・あしばから おりる）</div>
          <div><b>ジャンプ</b>：2かい まで とべる</div>
          <div><b>うつ</b>：おしっぱなしで れんしゃ</div>
          <div><b>キック</b>：まえげり → かいてんげり → まわしげり！ くうちゅうで とびげり、はしりながら スライディング</div>
          <div><b>パンチ</b>：パンチ → パンチ → アッパー！</div>
          <div><b>ぶきかえ</b>：ひろった ぶきに かえる</div>
          <div>キックと パンチを まぜると コンボが つながるよ</div>
          <div>タテへいは キックで タテを こわそう</div>
          <div class="sa-keys">キーボード：A D いどう ／ スペース ジャンプ ／ J うつ ／ K キック ／ L パンチ ／ Q ぶきかえ ／ Esc ポーズ</div>
        </div>
        <button class="sa-big" data-act="title">わかった！</button>
      </div>
      <div class="sa-scr sa-pausescr">
        <h2>ポーズ</h2>
        <button class="sa-big" data-act="resume">つづける</button>
        <button class="sa-small" data-act="restart">さいしょから</button>
        <button class="sa-small" data-act="title">タイトルへ</button>
      </div>
      <div class="sa-scr sa-over">
        <h2>やられちゃった…</h2>
        <p>その ばしょから つづけられるよ</p>
        <button class="sa-big" data-act="continue">つづける！</button>
        <button class="sa-small" data-act="title">タイトルへ</button>
      </div>
      <div class="sa-scr sa-clear">
        <h2>ステージ クリア！</h2>
        <div class="sa-result"></div>
        <button class="sa-big" data-act="next">つぎの ステージ</button>
        <button class="sa-small" data-act="title">タイトルへ</button>
      </div>
      <div class="sa-rotate"><div>📱↻<br>よこむきに してね</div></div>`;
    this.container.appendChild(root);
    this.canvas = this.el('.sa-cv');
  },
  bind() {
    this.onClick = (e) => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      this.sfx.unlock();
      const a = b.dataset.act;
      if (a === 'stage') this.start(+b.dataset.i);
      else if (a === 'allies') { this.save.allies = !this.save.allies; this.persist(); this.renderTitle(); }
      else if (a === 'howto') this.show('howto');
      else if (a === 'hub') this.back();
      else if (a === 'title') { this.game = null; this.show('title'); }
      else if (a === 'resume') this.resume();
      else if (a === 'restart') this.start(this.game.stageIdx);
      else if (a === 'continue') { this.game.continueGame(); this.show(null); }
      else if (a === 'next') { const n = this.game.stageIdx + 1; if (n < STAGES.length) this.start(n); else { this.game = null; this.show('title'); } }
    };
    this.root.addEventListener('click', this.onClick);
    this.onResize = () => this.resize();
    window.addEventListener('resize', this.onResize); window.addEventListener('orientationchange', this.onResize);
    this.onVis = () => { if (document.hidden && this.game && this.screen === null) this.pause(); };
    document.addEventListener('visibilitychange', this.onVis);
    this.onKey = (e) => { if (e.code === 'Enter' && this.screen === 'title') { this.sfx.unlock(); this.start(0); } };
    window.addEventListener('keydown', this.onKey);
    this.root.addEventListener('pointerdown', () => this.sfx.unlock(), { passive: true });
  },
  persist() { storage.set(SAVE_KEY, this.save); },
  resize() {
    const r = this.root.getBoundingClientRect();
    const w = Math.max(320, r.width || window.innerWidth), h = Math.max(200, r.height || window.innerHeight);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.viewW = this.renderer.resize(w, h, dpr);
    if (this.game) { this.game.viewW = this.viewW; }
  },
  show(name) {
    this.screen = name;
    for (const s of ['title', 'howto', 'pausescr', 'over', 'clear']) this.el(`.sa-${s}`).classList.toggle('on', s === name || (name === 'pause' && s === 'pausescr'));
    const playing = !!this.game && name === null;
    this.root.classList.toggle('playing', playing);
    this.input.enabled = playing;
    if (!playing) this.input.reset();
    if (name === 'title') this.renderTitle();
  },
  renderTitle() {
    this.el('.sa-stages').innerHTML = STAGES.map((s, i) => {
      const locked = i > 0 && !this.save.cleared.includes(STAGES[i - 1].id) && !this.save.cleared.includes(s.id);
      const best = this.save.best[s.id];
      return `<button class="sa-stage ${locked ? 'locked' : ''}" data-act="${locked ? '' : 'stage'}" data-i="${i}" ${locked ? 'disabled' : ''}>
        <b>${s.name}</b><span>${s.sub}</span><em>${locked ? '🔒 まえの ステージを クリア' : best ? `ベスト ${best.score} ${best.rank}` : 'ボスが まってる…'}</em></button>`;
    }).join('');
    this.el('[data-act="allies"]').textContent = `なかま：${this.save.allies ? 'いっしょ' : 'ひとり'}`;
  },
  start(i) {
    this.game = new Game(i, { viewW: this.viewW, allies: this.save.allies, seed: (Math.random() * 1e9) | 0 });
    this.paused = false; this.show(null); this.overShown = false;
    this.renderHudStatic();
  },
  pause() { if (!this.game || this.screen !== null || this.game.state !== 'play') return; this.show('pause'); },
  resume() { this.show(null); this.last = performance.now(); },
  back() { this.destroy(); this.onBackToHub?.(); },

  renderHudStatic() {
    const g = this.game;
    this.el('.sa-allies').innerHTML = g.allies.map((a) => `<div class="sa-ally" style="--c:${a.def.color}"><span>${a.def.name}</span><div class="sa-hpbar"><i></i></div></div>`).join('');
    this.hudCache = {};
  },
  updateHud() {
    const g = this.game, p = g.player, c = this.hudCache;
    const set = (k, v, fn) => { if (c[k] !== v) { c[k] = v; fn(v); } };
    set('hp', Math.ceil(p.hp), (v) => { const i = this.el('.sa-me .sa-hpbar i'); i.style.width = `${(v / p.maxHp) * 100}%`; i.classList.toggle('low', v < 30); });
    set('lives', p.lives, (v) => { this.el('.sa-lives').textContent = '❤'.repeat(Math.max(0, v)); });
    set('score', g.score, (v) => { this.el('.sa-score').textContent = v.toLocaleString(); });
    const ammo = p.ars.guns[p.ars.cur].ammo;
    set('wpn', `${p.ars.cur}:${ammo}`, () => { this.el('.sa-wpn b').textContent = WEAPONS[p.ars.cur].name; this.el('.sa-wpn span').textContent = ammo === Infinity ? '∞' : ammo; });
    const bars = this.root.querySelectorAll('.sa-ally');
    g.allies.forEach((a, i) => set('a' + i, a.down > 0 ? -1 : Math.ceil(a.hp), (v) => { bars[i].classList.toggle('down', v < 0); bars[i].querySelector('i').style.width = `${Math.max(0, v / a.maxHp) * 100}%`; }));
  },
  onClear() {
    const g = this.game, r = g.result, st = g.stage;
    g.banner = null;
    const rank = rankOf(r);
    if (!this.save.cleared.includes(st.id)) this.save.cleared.push(st.id);
    const prev = this.save.best[st.id];
    if (!prev || r.score > prev.score) this.save.best[st.id] = { score: r.score, rank };
    this.persist();
    const m = Math.floor(r.time / 60), s = Math.floor(r.time % 60);
    this.el('.sa-result').innerHTML = `<div class="sa-rank">${rank}</div>
      <div>スコア <b>${r.score.toLocaleString()}</b></div><div>たおした かず <b>${r.kills}</b></div>
      <div>さいだい コンボ <b>${r.maxCombo}</b></div><div>タイム <b>${m}:${String(s).padStart(2, '0')}</b></div>`;
    const last = g.stageIdx + 1 >= STAGES.length;
    this.el('[data-act="next"]').textContent = last ? 'ぜんぶ クリア！ タイトルへ' : 'つぎの ステージ';
    this.show('clear');
  },

  loop(now) {
    if (!this.alive) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(1 / 30, Math.max(0, (now - this.last) / 1000)); this.last = now;
    this.fps.n++; this.fps.t += dt; if (this.fps.t >= 1) { this.fps.v = this.fps.n / this.fps.t; this.fps.n = 0; this.fps.t = 0; }
    const g = this.game;
    if (!g) { this.drawTitleBg(now / 1000); return; }
    if (this.screen === null) {
      g.update(dt, this.input.frame());
      for (const e of g.drainEvents()) this.sfx.play(e);
      if (g.state === 'over' && !this.overShown) { this.overShown = true; setTimeout(() => this.alive && this.game === g && g.state === 'over' && this.show('over'), 600); }
      if (g.state === 'play') this.overShown = false;
      if (g.state === 'clear' && this.screen === null) this.onClear();
    }
    this.renderer.draw(g, { shake: this.save.shake });
    this.updateHud();
  },
  drawTitleBg(t) {
    // タイトルの うしろは デモ（じどう で うごく）
    if (!this.demo) { this.demo = new Game(0, { viewW: this.viewW, seed: 99 }); this.demoMem = {}; this.demoBot = null; import('./game.js?v=1').then((m) => { this.demoBot = m.botInput; }); }
    const d = this.demo;
    if (this.demoBot) d.update(1 / 60, this.demoBot(d, this.demoMem)); d.drainEvents(); d.banner = null; d.texts && (d.texts.length = 0);
    if (d.state !== 'play' || d.time > 90) this.demo = null;
    else this.renderer.draw(d, { shake: false });
  },
  destroy() {
    this.alive = false;
    cancelAnimationFrame(this.raf);
    this.root.removeEventListener('click', this.onClick);
    window.removeEventListener('resize', this.onResize); window.removeEventListener('orientationchange', this.onResize);
    document.removeEventListener('visibilitychange', this.onVis);
    window.removeEventListener('keydown', this.onKey);
    this.input && this.input.destroy();
    this.sfx && this.sfx.close();
    this.root.remove();
    if (window.__sa === this) window.__sa = null;
  },
};
