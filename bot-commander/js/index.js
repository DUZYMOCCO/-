// ロボットコマンダー（仮）— スマホゲーム工房の入口モジュール。
// ハブが動的 import し、prepare()（CSS読み込み）→ init(container, onBackToHub) の順に呼ぶ。
// シミュレーション（js/sim）は DOM・Pixi に依存しない。描画（js/render）は sim の状態を読むだけ。
// v0.2.0: ミッション「資材集め・巡回・脱出」。上に資材のバーと残り時間、終わると結果画面（もう一度）。
import { loadCss } from '../../common/js/load-css.js';
import { createSim, stepSim, TICK, squadUnits, squadCommander, applyCommandsNow, missionStatus } from './sim/sim.js?v=4';
import { MISSION_1 } from './sim/mission.js?v=4';
import { createRenderer } from './render/renderer.js?v=4';
import { attachInput } from './render/input.js?v=4';

const fmtTime = s => { const t = Math.ceil(s); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
const HINT_IDLE = '部隊をタップして選ぶ。ツギハギ隊をガラクタの山で止めると資材を集める';

const BotCommanderGame = {
  id: 'bot-commander',
  title: 'ロボットコマンダー（仮）',

  prepare() {
    return loadCss(new URL('../css/bot-commander.css?v=4', import.meta.url).href);
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
        <div class="bc-mission">
          <div class="bc-mat"><i class="bc-mat-del"></i><i class="bc-mat-car"></i><span class="bc-mat-txt"></span></div>
          <div class="bc-timer"></div>
        </div>
        <footer class="bc-bottom">
          <button class="bc-back" aria-label="工房へもどる">◀ 工房</button>
          <span class="bc-hint">${HINT_IDLE}</span>
          <span class="bc-fps"></span>
        </footer>
        <div class="bc-result" hidden>
          <div class="bc-result-box">
            <h2 class="bc-result-title"></h2>
            <p class="bc-result-text"></p>
            <div class="bc-result-btns"><button class="bc-retry">もう一度</button><button class="bc-result-back">工房へ</button></div>
          </div>
        </div>
        <div class="bc-paused-tag">一時停止中 ― 命令はできます</div>
        <div class="bc-loading">読み込み中…</div>
      </div>`;
    const $ = s => container.querySelector(s);
    this.el = {
      root: $('.bc-root'), stage: $('.bc-stage'), squads: $('.bc-squads'), pause: $('.bc-pause'), hint: $('.bc-hint'), fps: $('.bc-fps'), loading: $('.bc-loading'),
      matDel: $('.bc-mat-del'), matCar: $('.bc-mat-car'), matTxt: $('.bc-mat-txt'), timer: $('.bc-timer'),
      result: $('.bc-result'), resultTitle: $('.bc-result-title'), resultText: $('.bc-result-text'),
    };
    $('.bc-back').addEventListener('click', () => this.exit());
    $('.bc-result-back').addEventListener('click', () => this.exit());
    $('.bc-retry').addEventListener('click', () => this.restart());
    this.el.squads.addEventListener('click', e => {
      const { sim, r } = this; if (!sim) return;
      const b = e.target.closest('.bc-chip'); if (!b) return;
      const s = sim.squads.find(q => q.id === b.dataset.id); if (!s) return;
      r.ui.selected = s.id;
      const c = squadCommander(sim, s); if (c) { r.cam.x = c.x; r.cam.y = c.y; }
      this.renderChips(); this.updateHint();
    });
    this.el.pause.addEventListener('click', () => this.setPaused(!this.state?.paused));
    container.querySelectorAll('[data-speed]').forEach(b => b.addEventListener('click', () => this.setSpeed(Number(b.dataset.speed))));
    // iOS の2本指ジェスチャー（ページ拡大）をゲーム内では止める
    this.stopGesture = e => e.preventDefault();
    for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) this.el.root.addEventListener(ev, this.stopGesture, { passive: false });
    // 画面が隠れたら自動で一時停止（復帰時に早送りしない）
    this.onVisibility = () => { if (document.hidden) this.setPaused(true); };
    document.addEventListener('visibilitychange', this.onVisibility);
    this.state = { paused: false, speed: 1, acc: 0 };
    this.start().catch(err => {
      console.error('bot-commander start failed', err);
      if (this.el.loading) this.el.loading.textContent = '起動できませんでした: ' + err.message;
    });
  },

  async start() {
    const params = new URLSearchParams(location.search);
    const sim = createSim({ seed: Number(params.get('seed')) || 1, mapSeed: Number(params.get('map')) || 7, mission: MISSION_1 });
    const r = await createRenderer(this.el.stage, sim);
    if (!this.alive) { r.destroy(); return; }
    this.sim = sim; this.r = r;
    this.state.acc = 0;
    this.el.loading?.remove(); this.el.loading = null;
    this.el.result.hidden = true;
    // 最初はツギハギ隊を選んだ状態にして、そこへカメラを合わせる
    const scav = sim.squads.find(s => s.side === 'ally' && s.kind === 'scav');
    if (scav) { r.ui.selected = scav.id; const c = squadCommander(sim, scav); if (c) { r.cam.x = c.x; r.cam.y = c.y - 120; } }
    attachInput(r.app.canvas, sim, r, {
      onSelect: () => { this.renderChips(); this.updateHint(); },
      onOrder: (id, wps) => { if (this.state.paused) applyCommandsNow(sim); this.el.hint.textContent = '移動中。止まった所で資材を集める'; },
    });
    let uiTimer = 0;
    this.tick = t => {
      const dt = Math.min(t.deltaMS / 1000, 0.25), st = this.state;
      if (!st.paused && !sim.result) {
        st.acc += dt * st.speed;
        let n = 0; while (st.acc >= TICK && n < 10) { stepSim(sim); st.acc -= TICK; n++; }
        if (n === 10) st.acc = 0;
      }
      r.sync(performance.now() / 1000);
      uiTimer -= dt; if (uiTimer <= 0) { uiTimer = 0.2; this.renderChips(); this.renderMission(); }
      if (sim.result && this.el.result.hidden) this.showResult();
      this.el.fps.textContent = `${r.app.ticker.FPS.toFixed(0)}fps`;
    };
    r.app.ticker.add(this.tick);
    this.setSpeed(this.state.speed); this.setPaused(false); this.renderChips(); this.renderMission(); this.updateHint();
    // 自動テスト・スクショ用の入口
    window.__botCommander = { sim, r, state: this.state, setPaused: v => this.setPaused(v), setSpeed: v => this.setSpeed(v), stepSim, restart: () => this.restart(), ready: true };
  },

  /** 結果画面の「もう一度」: 描画を作り直して最初から */
  async restart() {
    if (window.__botCommander) window.__botCommander.ready = false;
    if (this.r) { this.r.app.ticker.remove(this.tick); this.r.destroy(); }
    this.r = null; this.sim = null;
    this.el.result.hidden = true;
    await this.start();
  },

  updateHint() {
    const { sim, r } = this; if (!sim) return;
    const s = sim.squads.find(q => q.id === r.ui.selected);
    this.el.hint.textContent = !s ? HINT_IDLE : s.kind === 'scav' ? 'ツギハギ隊: 行き先をタップ。戦えないので異星生物に見つからないように' : `${s.name}: 行き先をタップで移動（もう一度タップで解除）`;
  },

  renderMission() {
    const st = missionStatus(this.sim); if (!st) return;
    const pd = Math.min(100, st.delivered / st.target * 100), pc = Math.min(100 - pd, st.carrying / st.target * 100);
    this.el.matDel.style.width = `${pd}%`;
    this.el.matCar.style.left = `${pd}%`; this.el.matCar.style.width = `${pc}%`;
    this.el.matTxt.textContent = `資材 ${Math.floor(st.delivered)}／${st.target}（運搬中 ${Math.floor(st.carrying)}）`;
    this.el.timer.textContent = `のこり ${fmtTime(st.remaining)}`;
    this.el.timer.classList.toggle('warn', st.remaining < 60);
  },

  showResult() {
    const sim = this.sim, st = missionStatus(sim);
    const win = sim.result === 'win';
    const left = sim.units.filter(u => u.side === 'ally').length;
    this.el.resultTitle.textContent = win ? '脱出成功' : '作戦失敗';
    this.el.resultTitle.classList.toggle('win', win);
    const why = win ? '資材を脱出口へ届けた！' : sim.resultReason === 'time' ? '時間切れ…' : '全部隊が大破した…';
    this.el.resultText.innerHTML = `${why}<br>届けた資材 ${Math.floor(st.delivered)}／${st.target}<br>残った機体 ${left}機　かかった時間 ${fmtTime(sim.time)}`;
    this.el.result.hidden = false;
  },

  renderChips() {
    const { sim, r } = this; if (!sim) return;
    this.el.squads.innerHTML = sim.squads.filter(s => s.side === 'ally').map(s => {
      const us = squadUnits(sim, s), hp = us.reduce((a, u) => a + u.hp, 0), max = us.reduce((a, u) => a + u.maxHp, 0) || 1;
      const st = s.gathering != null ? '回収中' : s.engaged ? '交戦' : s.order ? '移動' : '待機';
      const cargo = s.cargo >= 1 ? ` 📦${Math.floor(s.cargo)}` : '';
      return `<button class="bc-chip ${r.ui.selected === s.id ? 'on' : ''} ${s.engaged ? 'hot' : ''} ${s.kind === 'scav' ? 'scav' : ''}" data-id="${s.id}"><b>${s.name}</b><span>${us.length}機 ${st}${cargo}</span><i style="width:${Math.round(hp / max * 100)}%"></i></button>`;
    }).join('');
  },
  setSpeed(v) { if (!this.state) return; this.state.speed = v; this.container.querySelectorAll('[data-speed]').forEach(b => b.classList.toggle('on', Number(b.dataset.speed) === v)); },
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
