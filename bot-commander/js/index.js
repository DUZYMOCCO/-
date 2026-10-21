// ロボットコマンダー（仮）— スマホゲーム工房の入口モジュール。
// ハブが動的 import し、prepare()（CSS読み込み）→ init(container, onBackToHub) の順に呼ぶ。
// シミュレーション（js/sim）は DOM・Pixi に依存しない。描画（js/render）は sim の状態を読むだけ。
import { loadCss } from '../../common/js/load-css.js';
import { createSim, stepSim, TICK, squadUnits, squadCommander, applyCommandsNow } from './sim/sim.js?v=1';
import { createRenderer } from './render/renderer.js?v=1';
import { attachInput } from './render/input.js?v=1';

const BotCommanderGame = {
  id: 'bot-commander',
  title: 'ロボットコマンダー（仮）',

  prepare() {
    return loadCss(new URL('../css/bot-commander.css?v=1', import.meta.url).href);
  },

  init(container, onBackToHub) {
    this.container = container;
    this.onBackToHub = onBackToHub;
    this.alive = true;
    container.innerHTML = `
      <div class="bc-root">
        <div class="bc-stage"></div>
        <header class="bc-top">
          <div class="bc-squads"></div>
          <div class="bc-ctrl">
            <button class="bc-pause" aria-label="一時停止">⏸</button>
            <button data-speed="1">1x</button>
            <button data-speed="2">2x</button>
          </div>
        </header>
        <footer class="bc-bottom">
          <button class="bc-back" aria-label="工房へもどる">◀ 工房</button>
          <span class="bc-hint">自軍の部隊をタップ</span>
          <span class="bc-fps"></span>
        </footer>
        <div class="bc-banner" hidden></div>
        <div class="bc-paused-tag">一時停止中 ― 命令はできます</div>
        <div class="bc-loading">読み込み中…</div>
      </div>`;
    const $ = s => container.querySelector(s);
    this.el = { root: $('.bc-root'), stage: $('.bc-stage'), squads: $('.bc-squads'), pause: $('.bc-pause'), hint: $('.bc-hint'), fps: $('.bc-fps'), banner: $('.bc-banner'), loading: $('.bc-loading') };
    $('.bc-back').addEventListener('click', () => this.exit());
    // iOS の2本指ジェスチャー（ページ拡大）をゲーム内では止める
    this.stopGesture = e => e.preventDefault();
    for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) this.el.root.addEventListener(ev, this.stopGesture, { passive: false });
    this.start().catch(err => {
      console.error('bot-commander start failed', err);
      this.el.loading.textContent = '起動できませんでした: ' + err.message;
    });
  },

  async start() {
    const params = new URLSearchParams(location.search);
    const sim = createSim({ seed: Number(params.get('seed')) || 1, mapSeed: Number(params.get('map')) || 7 });
    const r = await createRenderer(this.el.stage, sim);
    if (!this.alive) { r.destroy(); return; }
    this.sim = sim; this.r = r;
    this.state = { paused: false, speed: 1, acc: 0 };
    this.el.loading.remove();
    this.el.squads.addEventListener('click', e => {
      const b = e.target.closest('.bc-chip'); if (!b) return;
      const s = sim.squads.find(q => q.id === b.dataset.id); if (!s) return;
      r.ui.selected = s.id;
      const c = squadCommander(sim, s); if (c) { r.cam.x = c.x; r.cam.y = c.y; }
      this.renderChips();
    });
    this.el.pause.addEventListener('click', () => this.setPaused(!this.state.paused));
    this.container.querySelectorAll('[data-speed]').forEach(b => b.addEventListener('click', () => this.setSpeed(Number(b.dataset.speed))));
    attachInput(r.app.canvas, sim, r, {
      onSelect: () => { this.renderChips(); this.el.hint.textContent = r.ui.selected ? '部隊から指でなぞって経路（経由点は最大4）' : '自軍の部隊をタップ'; },
      onOrder: (id, wps) => { if (this.state.paused) applyCommandsNow(sim); this.el.hint.textContent = `命令: 経由点 ${wps.length}つ`; },
    });
    let chipTimer = 0;
    this.tick = t => {
      const dt = Math.min(t.deltaMS / 1000, 0.25), st = this.state;
      if (!st.paused && !sim.result) {
        st.acc += dt * st.speed;
        let n = 0; while (st.acc >= TICK && n < 10) { stepSim(sim); st.acc -= TICK; n++; }
        if (n === 10) st.acc = 0;
      }
      r.sync(performance.now() / 1000);
      chipTimer -= dt; if (chipTimer <= 0) { chipTimer = 0.25; this.renderChips(); }
      if (sim.result && this.el.banner.hidden) { this.el.banner.textContent = sim.result === 'win' ? '勝利' : '敗北'; this.el.banner.hidden = false; }
      this.el.fps.textContent = `${r.app.ticker.FPS.toFixed(0)}fps`;
    };
    r.app.ticker.add(this.tick);
    // 画面が隠れたら自動で一時停止（復帰時に早送りしない）
    this.onVisibility = () => { if (document.hidden) this.setPaused(true); };
    document.addEventListener('visibilitychange', this.onVisibility);
    this.setSpeed(1); this.renderChips();
    // 自動テスト・スクショ用の入口
    window.__botCommander = { sim, r, state: this.state, setPaused: v => this.setPaused(v), setSpeed: v => this.setSpeed(v), stepSim, ready: true };
  },

  renderChips() {
    const { sim, r } = this; if (!sim) return;
    this.el.squads.innerHTML = sim.squads.filter(s => s.side === 'ally').map(s => {
      const us = squadUnits(sim, s), hp = us.reduce((a, u) => a + u.hp, 0), max = us.reduce((a, u) => a + u.maxHp, 0) || 1;
      const st = s.engaged ? '交戦' : s.order ? '移動' : '待機';
      return `<button class="bc-chip ${r.ui.selected === s.id ? 'on' : ''} ${s.engaged ? 'hot' : ''}" data-id="${s.id}"><b>${s.name}</b><span>${us.length}機 ${st}</span><i style="width:${Math.round(hp / max * 100)}%"></i></button>`;
    }).join('');
  },
  setSpeed(v) { this.state.speed = v; this.container.querySelectorAll('[data-speed]').forEach(b => b.classList.toggle('on', Number(b.dataset.speed) === v)); },
  setPaused(v) { if (!this.state) return; this.state.paused = v; this.el.pause.textContent = v ? '▶' : '⏸'; this.el.pause.classList.toggle('on', v); this.el.root.classList.toggle('paused', v); },

  destroy() {
    this.alive = false;
    if (this.onVisibility) document.removeEventListener('visibilitychange', this.onVisibility);
    if (this.r) { this.r.app.ticker.remove(this.tick); this.r.destroy(); }
    this.r = null; this.sim = null;
    delete window.__botCommander;
  },

  exit() {
    this.destroy();
    this.onBackToHub?.();
  },
};

export default BotCommanderGame;
