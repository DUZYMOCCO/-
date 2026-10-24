// ロボットコマンダー（仮）— スマホゲーム工房の入口モジュール。
// ハブが動的 import し、prepare()（CSS読み込み）→ init(container, onBackToHub) の順に呼ぶ。
// シミュレーション（js/sim）は DOM・Pixi に依存しない。描画（js/render）は sim の状態を読むだけ。
// v0.2.0: ミッション「資材集め・巡回・脱出」。上に資材のバーと残り時間、終わると結果画面（もう一度）。
// v0.4.0-dev（10/23）: 着弾・爆発の演出と被弾の反応（js/fx）。?fx=low で演出の粒を減らす（設定画面はまだない）。
// v0.4.0-dev: 部隊をやめて1機ずつ。上に種類ボタン（全員・ツギハギ・PONCO・人）、下に選んだ機体への命令バーと組①②③。
// v0.4.0-dev（10/24）: 遮蔽物から落ちた武器を拾うと、短い知らせ（.bc-toast）を出して、持っている武器の一覧に足して保存する（OWNED_KEY）。
import { loadCss } from '../../common/js/load-css.js';
import { storage } from '../../common/js/storage.js';
import { createSim, stepSim, TICK, applyCommandsNow, missionStatus, unitById, issueStop, issueRetreat, issueStance } from './sim/sim.js?v=13';
import { MISSION_1 } from './sim/mission.js?v=9';
import { selectKind, pruneSelection, createGroups } from './sim/select.js?v=9';
import { createRenderer } from './render/renderer.js?v=19';
import { attachInput } from './render/input.js?v=11';
import { addOwned } from './sim/cover.js?v=2';
import { createBackConfirm, requestBack, cancelBack } from './ui/back-confirm.js?v=1';

// 持っている武器の一覧（武器の id → 拾った数。かぶっても数える）。ハブと同じ localStorage（game_studio_ が前につく）
export const OWNED_KEY = 'botcommander_owned_weapons';
const TOAST_MS = 2200;

const fmtTime = s => { const t = Math.ceil(s); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
const HINT_IDLE = 'ロボをタップで選ぶ。長押しで同じ種類、地面を長押しして囲むとまとめて選ぶ';
const GROUP_HOLD_MS = 500; // 組ボタンの長押し＝いまの選択を覚える
const PICKS = [
  { key: 'all', label: '全員' },
  { key: 'scav', label: 'ツギハギ' },
  { key: 'ponco', label: 'PONCO' },
  { key: 'human', label: '人' },
];

const BotCommanderGame = {
  id: 'bot-commander',
  title: 'ロボットコマンダー（仮）',

  prepare() {
    return loadCss(new URL('../css/bot-commander.css?v=12', import.meta.url).href);
  },

  init(container, onBackToHub) {
    this.container = container;
    this.onBackToHub = onBackToHub;
    this.alive = true;
    container.innerHTML = `
      <div class="bc-root">
        <div class="bc-stage"></div>
        <header class="bc-top">
          <div class="bc-picks"></div>
          <div class="bc-ctrl">
            <button class="bc-pause" aria-label="一時停止">⏸</button>
            <button class="bc-menu-btn" aria-label="メニューを開く"><span aria-hidden="true">☰</span><small>メニュー</small></button>
          </div>
        </header>
        <div class="bc-mission">
          <div class="bc-mat"><i class="bc-mat-del"></i><i class="bc-mat-car"></i><span class="bc-mat-txt"></span></div>
          <div class="bc-count"></div>
          <div class="bc-clock" title="経過時間（制限時間はありません）"></div>
        </div>
        <div class="bc-alert" hidden></div>
        <div class="bc-act" hidden>
          <span class="bc-act-n"></span>
          <button data-act="mode"></button>
          <button data-act="stop">止まる</button>
          <button data-act="stance"></button>
          <button data-act="retreat">撤退</button>
          <button data-act="clear" aria-label="選択を外す">✕</button>
        </div>
        <footer class="bc-bottom">
          <div class="bc-groups">${[0, 1, 2].map(i => `<button data-group="${i}">${'①②③'[i]}</button>`).join('')}</div>
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
        <div class="bc-menu" hidden>
          <div class="bc-menu-box" role="dialog" aria-modal="true" aria-label="メニュー">
            <h2 class="bc-menu-title">メニュー（一時停止中）</h2>
            <div class="bc-menu-row"><span>速さ</span><button data-speed="1">1x</button><button data-speed="2">2x</button></div>
            <button class="bc-menu-close">ゲームにもどる</button>
            <button class="bc-menu-hub">工房へ戻る</button>
          </div>
        </div>
        <div class="bc-confirm" hidden>
          <div class="bc-confirm-box" role="dialog" aria-modal="true" aria-labelledby="bc-confirm-title">
            <h2 id="bc-confirm-title" class="bc-confirm-title">工房へ戻りますか？</h2>
            <p class="bc-confirm-text">このミッションの進み具合は消えます。</p>
            <div class="bc-confirm-btns"><button class="bc-confirm-leave">戻る</button><button class="bc-confirm-stay">続ける</button></div>
          </div>
        </div>
        <div class="bc-paused-tag">一時停止中 ― 命令はできます</div>
        <div class="bc-toast" hidden></div>
        <div class="bc-loading">読み込み中…</div>
      </div>`;
    const $ = s => container.querySelector(s);
    this.el = {
      root: $('.bc-root'), stage: $('.bc-stage'), picks: $('.bc-picks'), pause: $('.bc-pause'), hint: $('.bc-hint'), fps: $('.bc-fps'), loading: $('.bc-loading'),
      toast: $('.bc-toast'), matDel: $('.bc-mat-del'), matCar: $('.bc-mat-car'), matTxt: $('.bc-mat-txt'), clock: $('.bc-clock'), count: $('.bc-count'), alert: $('.bc-alert'),
      act: $('.bc-act'), actN: $('.bc-act-n'), mode: $('[data-act="mode"]'), stance: $('[data-act="stance"]'), groups: $('.bc-groups'),
      result: $('.bc-result'), resultTitle: $('.bc-result-title'), resultText: $('.bc-result-text'),
    };
    this.groups = createGroups(3);
    // 「◀ 工房」はミッション中なら確認してから戻る（誤タップ対策）
    this.backConfirm = createBackConfirm();
    this.el.confirm = $('.bc-confirm');
    // 画面のボタンは減らす（Iron Squad と同じく ☰ メニュー にまとめる）。開くと一時停止
    this.el.menu = $('.bc-menu');
    $('.bc-menu-btn').addEventListener('click', () => this.openMenu());
    $('.bc-menu-close').addEventListener('click', () => this.closeMenu());
    $('.bc-menu-hub').addEventListener('click', () => this.requestBack());
    for (const ev of ['pointerdown', 'pointermove', 'pointerup', 'touchstart', 'touchmove', 'touchend', 'wheel']) this.el.menu.addEventListener(ev, e => e.stopPropagation());
    this.el.menu.addEventListener('click', e => { e.stopPropagation(); if (e.target === this.el.menu) this.closeMenu(); });
    $('.bc-confirm-stay').addEventListener('click', () => this.cancelBack());
    $('.bc-confirm-leave').addEventListener('click', () => this.exit());
    // ダイアログの外をタップ → 続ける。地図にはタップを通さない
    for (const ev of ['pointerdown', 'pointermove', 'pointerup', 'touchstart', 'touchmove', 'touchend', 'wheel']) this.el.confirm.addEventListener(ev, e => e.stopPropagation());
    this.el.confirm.addEventListener('click', e => { e.stopPropagation(); if (e.target === this.el.confirm) this.cancelBack(); });
    // ブラウザの「戻る」（ジェスチャー）も同じ確認を通す
    try { history.pushState({ botCommander: true }, ''); this.pushedHistory = true; } catch { this.pushedHistory = false; }
    this.onPopState = () => {
      if (!this.alive) return;
      if (!this.inMission()) { this.pushedHistory = false; this.exit(); return; }
      try { history.pushState({ botCommander: true }, ''); } catch {}
      this.requestBack();
    };
    window.addEventListener('popstate', this.onPopState);
    $('.bc-result-back').addEventListener('click', () => this.exit());
    $('.bc-retry').addEventListener('click', () => this.restart());
    // 種類ボタン: その種類を全部選んで、カメラを寄せる
    this.el.picks.addEventListener('click', e => {
      const b = e.target.closest('[data-pick]'); if (!b || !this.sim) return;
      this.select(selectKind(this.sim.units, b.dataset.pick), true);
    });
    this.el.act.addEventListener('click', e => this.onAction(e.target.closest('[data-act]')?.dataset.act));
    this.bindGroups();
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

  // 組①②③: タップで呼び出し（空なら今の選択を覚える）、長押しで上書き保存
  bindGroups() {
    let timer = 0, saved = false;
    const el = this.el.groups;
    el.addEventListener('pointerdown', e => {
      const b = e.target.closest('[data-group]'); if (!b) return;
      saved = false; clearTimeout(timer);
      timer = setTimeout(() => { saved = true; this.saveGroup(Number(b.dataset.group)); }, GROUP_HOLD_MS);
    });
    const cancel = () => clearTimeout(timer);
    el.addEventListener('pointerup', cancel); el.addEventListener('pointercancel', cancel); el.addEventListener('pointerleave', cancel);
    el.addEventListener('contextmenu', e => e.preventDefault());
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-group]'); if (!b || !this.sim) return;
      if (saved) { saved = false; return; }
      const i = Number(b.dataset.group), ids = this.groups.recall(i, this.sim.units);
      if (ids.length) this.select(ids, true);
      else if (this.r.ui.selected.length) this.saveGroup(i);
      else this.el.hint.textContent = `${'①②③'[i]} は空。機体を選んでからタップ（長押しで上書き）`;
    });
  },
  saveGroup(i) {
    const ids = this.groups.save(i, this.r?.ui.selected || []);
    this.el.hint.textContent = ids.length ? `${'①②③'[i]} に ${ids.length}機を覚えた` : `${'①②③'[i]} を空にした`;
    this.renderGroups();
  },

  async start() {
    const params = new URLSearchParams(location.search);
    const sim = createSim({ seed: Number(params.get('seed')) || 1, mapSeed: Number(params.get('map')) || 7, mission: MISSION_1 });
    const r = await createRenderer(this.el.stage, sim, { fxQuality: params.get('fx') === 'low' ? 'low' : 'normal', ground: params.get('ground') === 'oblique' ? 'oblique' : undefined, human: params.get('human') === 'oblique' ? 'oblique' : undefined });
    if (!this.alive) { r.destroy(); return; }
    this.sim = sim; this.r = r;
    this.groups = createGroups(3);
    this.state.acc = 0;
    this.el.loading?.remove(); this.el.loading = null;
    this.el.result.hidden = true;
    // 最初はツギハギ号4機を選んだ状態にして、そこへカメラを合わせる
    this.select(selectKind(sim.units, 'scav'), true, -120);
    attachInput(r.app.canvas, sim, r, {
      onSelect: () => this.refreshSel(),
      onLong: kind => { if (kind === 'box') this.el.hint.textContent = 'なぞって囲む → 指をはなすと選ぶ'; },
      onNothing: () => { this.el.hint.textContent = HINT_IDLE; },
      onOrder: (ids, wps, enemy) => {
        if (this.state.paused) applyCommandsNow(sim);
        this.el.hint.textContent = enemy ? `${ids.length}機: ${enemy.label || '敵'}を狙う` : `${ids.length}機: ${r.ui.mode === 'rush' ? '急行（撃たずに走る）' : '戦闘移動（敵がいたら撃つ）'}`;
      },
    });
    let uiTimer = 0;
    this.seenFx = new WeakSet();
    this.tick = t => {
      const t0 = performance.now(), dt = Math.min(t.deltaMS / 1000, 0.25), st = this.state;
      // 演出を進める。止め（hit-stop）の間は 0 が返り、シミュレーションも止まる
      const ts = r.fx.update(st.paused ? 0 : dt * st.speed);
      if (!st.paused && !sim.result) {
        st.acc += dt * st.speed * ts;
        let n = 0; while (st.acc >= TICK && n < 10) { stepSim(sim); st.acc -= TICK; n++; }
        if (n === 10) st.acc = 0;
      }
      this.scanPickups(sim);
      r.sync(performance.now() / 1000);
      st.workMs = performance.now() - t0; // 1フレームの仕事（シミュ＋演出＋描画の準備。GPU は入らない）。計測用
      uiTimer -= dt;
      if (uiTimer <= 0) {
        uiTimer = 0.2;
        const kept = pruneSelection(sim.units, r.ui.selected);
        if (kept.length !== r.ui.selected.length) { r.ui.selected = kept; this.updateHint(); }
        this.renderPicks(); this.renderAct(); this.renderMission(); this.renderGroups();
      }
      if (sim.result && this.el.result.hidden) this.showResult();
      this.el.fps.textContent = `${r.app.ticker.FPS.toFixed(0)}fps`;
    };
    r.app.ticker.add(this.tick);
    this.setSpeed(this.state.speed); this.setPaused(false); this.refreshSel(); this.renderMission();
    // 自動テスト・スクショ用の入口
    window.__botCommander = {
      sim, r, state: this.state, setPaused: v => this.setPaused(v), setSpeed: v => this.setSpeed(v), stepSim, restart: () => this.restart(),
      select: ids => this.select(ids, false), selected: () => [...r.ui.selected], groups: this.groups, owned: () => storage.get(OWNED_KEY, {}), ready: true,
    };
  },

  /** 武器を拾った知らせ: 一覧に足して保存し、短い知らせを出す（修理キットは頭の上の文字だけ） */
  scanPickups(sim) {
    for (const f of sim.fx) {
      if (f.type !== 'pickup' || !f.weapon || this.seenFx.has(f)) continue;
      this.seenFx.add(f);
      storage.set(OWNED_KEY, addOwned(storage.get(OWNED_KEY, {}), f.weapon));
      this.toast(f.equipped ? `${f.label || '味方'} が ${f.name} を装備！` : `${f.name} を入手（保管）`);
    }
  },
  toast(text) {
    const el = this.el.toast; if (!el) return;
    el.textContent = text; el.hidden = false;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { el.hidden = true; el.classList.remove('show'); }, TOAST_MS);
  },

  /** 結果画面の「もう一度」: 描画を作り直して最初から */
  async restart() {
    if (window.__botCommander) window.__botCommander.ready = false;
    if (this.r) { this.r.app.ticker.remove(this.tick); this.r.destroy(); }
    this.r = null; this.sim = null;
    this.el.result.hidden = true;
    await this.start();
  },

  /** 選択を入れ替える。focus なら選んだ機体の真ん中へカメラを寄せる */
  select(ids, focus = false, dy = 0) {
    const { sim, r } = this; if (!sim) return;
    r.ui.selected = pruneSelection(sim.units, ids);
    if (focus && r.ui.selected.length) {
      const us = r.ui.selected.map(id => unitById(sim, id));
      r.cam.x = us.reduce((a, u) => a + u.x, 0) / us.length; r.cam.y = us.reduce((a, u) => a + u.y, 0) / us.length + dy;
    }
    this.refreshSel();
  },
  refreshSel() { this.renderPicks(); this.renderAct(); this.renderGroups(); this.updateHint(); },

  onAction(act) {
    const { sim, r } = this; if (!sim || !act) return;
    const ids = r.ui.selected;
    if (act === 'mode') { r.ui.mode = r.ui.mode === 'fight' ? 'rush' : 'fight'; this.el.hint.textContent = r.ui.mode === 'rush' ? '急行: 撃たずに走る（逃げる・回り込む用）' : '戦闘移動: 敵がいたら止まって撃つ'; }
    else if (act === 'clear') { r.ui.selected = []; this.refreshSel(); return; }
    else if (!ids.length) return;
    else if (act === 'stop') { issueStop(sim, ids); this.el.hint.textContent = `${ids.length}機: その場で止まる`; }
    else if (act === 'retreat') { issueRetreat(sim, ids); this.el.hint.textContent = `${ids.length}機: 本陣へ撤退（撃たずに走る）`; }
    else if (act === 'stance') {
      const next = this.selStance() === 'hold' ? 'free' : 'hold';
      issueStance(sim, ids, next);
      this.el.hint.textContent = next === 'free' ? '迎撃: 見えた敵へ少し寄って撃つ（遠くまでは追わない）' : 'その場: 持ち場から動かず、届く敵だけ撃つ';
    }
    if (this.state.paused) applyCommandsNow(sim);
    this.renderAct();
  },
  /** 選んだ機体の構え。混ざっていれば 'mix' */
  selStance() {
    const us = this.r.ui.selected.map(id => unitById(this.sim, id)).filter(Boolean);
    if (!us.length) return 'hold';
    return us.every(u => u.stance === us[0].stance) ? us[0].stance : 'mix';
  },

  updateHint() {
    const { sim, r } = this; if (!sim) return;
    const us = r.ui.selected.map(id => unitById(sim, id)).filter(Boolean);
    if (!us.length) { this.el.hint.textContent = HINT_IDLE; return; }
    if (us.length === 1) {
      const u = us[0];
      this.el.hint.textContent = u.human ? `${u.label}: 行き先をタップ。戦えない・異星生物に近づくと捕まる` : u.kind === 'scav' ? `${u.label}: 行き先をタップ。山で止まると資材を集める` : `${u.label}: 地面で移動、見えている敵で狙う`;
      return;
    }
    this.el.hint.textContent = `${us.length}機を選択中: 地面をタップで移動（ばらけて並ぶ）`;
  },

  renderPicks() {
    const { sim, r } = this; if (!sim) return;
    const sel = new Set(r.ui.selected);
    const html = PICKS.map(p => {
      const ids = selectKind(sim.units, p.key);
      const on = ids.length > 0 && ids.length === sel.size && ids.every(id => sel.has(id));
      const hot = ids.some(id => unitById(sim, id)?.engaged);
      return `<button class="bc-pick ${on ? 'on' : ''} ${hot ? 'hot' : ''} ${p.key}" data-pick="${p.key}" ${ids.length ? '' : 'disabled'}><b>${p.label}</b><span>${ids.length}</span></button>`;
    }).join('');
    if (html !== this.lastPicks) { this.el.picks.innerHTML = html; this.lastPicks = html; }
  },
  renderAct() {
    const { sim, r } = this; if (!sim) return;
    const n = r.ui.selected.length;
    this.el.act.hidden = n === 0;
    this.el.root.classList.toggle('has-sel', n > 0);
    this.el.actN.textContent = `${n}機`;
    this.el.mode.textContent = r.ui.mode === 'rush' ? '急行' : '戦闘移動';
    this.el.mode.classList.toggle('rush', r.ui.mode === 'rush');
    const st = this.selStance();
    this.el.stance.textContent = st === 'free' ? '迎撃' : st === 'hold' ? 'その場' : '構え…';
  },
  renderGroups() {
    if (!this.sim) return;
    this.el.groups.querySelectorAll('[data-group]').forEach(b => {
      const ids = pruneSelection(this.sim.units, this.groups.slots[Number(b.dataset.group)]);
      b.classList.toggle('full', ids.length > 0);
      b.dataset.n = ids.length || '';
    });
  },

  renderMission() {
    const st = missionStatus(this.sim); if (!st) return;
    const pd = Math.min(100, st.delivered / st.target * 100), pc = Math.min(100 - pd, st.carrying / st.target * 100);
    this.el.matDel.style.width = `${pd}%`;
    this.el.matCar.style.left = `${pd}%`; this.el.matCar.style.width = `${pc}%`;
    this.el.matTxt.textContent = `資材 ${Math.floor(st.delivered)}／${st.target}（運搬中 ${Math.floor(st.carrying)}）`;
    this.el.count.textContent = `ロボ${st.robots}/${st.capRobots}・人${st.humans}/${st.capHumans}`;
    this.el.clock.textContent = `${fmtTime(st.elapsed)}${st.finds ? `　★${st.finds}` : ''}`;
    // v0.4.0-dev: 捕まった人間は巣へ運ばれる。運ばれている途中か、もう巣にいるかで言い方を変える
    const caught = this.sim.units.filter(u => u.side === 'ally' && u.captured != null);
    const carried = caught.filter(u => u.captured !== 'nest').map(u => u.label), nested = caught.filter(u => u.captured === 'nest').map(u => u.label);
    this.el.alert.hidden = !caught.length; this.el.root.classList.toggle('alerting', caught.length > 0);
    if (caught.length) {
      const parts = [];
      if (carried.length) parts.push(`${carried.join('・')}が運ばれている！ 運んでいる異星生物を倒すと助けられる`);
      if (nested.length) parts.push(`${nested.join('・')}が巣に連れていかれた！ 巣の敵を倒してロボを近づけると助けられる`);
      this.el.alert.textContent = parts.join('　') + (st.boyCaptured ? '（少年を助けないと脱出できない）' : '');
    }
  },

  showResult() {
    const sim = this.sim, st = missionStatus(sim);
    const win = sim.result === 'win';
    const left = sim.units.filter(u => u.side === 'ally' && !u.human).length;
    const humans = sim.units.filter(u => u.side === 'ally' && u.human && u.captured == null).length;
    this.el.resultTitle.textContent = win ? '脱出成功' : '作戦失敗';
    this.el.resultTitle.classList.toggle('win', win);
    const why = win ? '資材を脱出口へ届けた！' : sim.resultReason === 'boyCaptured' ? 'ロボが全滅し、少年が連れていかれた…' : 'ロボも人間も、もう動けない…';
    this.el.resultText.innerHTML = `${why}<br>届けた資材 ${Math.floor(st.delivered)}／${st.target}<br>残ったロボ ${left}機・人 ${humans}人　かかった時間 ${fmtTime(sim.time)}${st.finds ? `<br>掘り出し物 ★${st.finds}（${[...new Set(sim.mission.finds.map(f => f.name))].join('・')}）` : ''}`;
    this.el.result.hidden = false;
  },

  setSpeed(v) { if (!this.state) return; this.state.speed = v; this.container.querySelectorAll('[data-speed]').forEach(b => b.classList.toggle('on', Number(b.dataset.speed) === v)); },
  setPaused(v) { if (!this.state) return; this.state.paused = v; this.el.pause.textContent = v ? '▶' : '⏸'; this.el.pause.classList.toggle('on', v); this.el.root.classList.toggle('paused', v); },

  inMission() { return !!(this.sim && !this.sim.result && this.el.result.hidden); },
  openMenu() {
    if (!this.inMission() || this.menuOpen) return;
    this.menuOpen = true; this.menuPrevPaused = !!this.state?.paused;
    this.setPaused(true); this.el.menu.hidden = false;
  },
  closeMenu() {
    if (!this.menuOpen) return;
    this.menuOpen = false; this.el.menu.hidden = true; this.setPaused(this.menuPrevPaused);
  },
  requestBack() {
    // メニューから来たときは、メニューを開く前の一時停止状態を覚える
    const fromMenu = this.menuOpen;
    if (fromMenu) { this.menuOpen = false; this.el.menu.hidden = true; }
    const r = requestBack(this.backConfirm, { inMission: this.inMission(), paused: fromMenu ? this.menuPrevPaused : !!this.state?.paused });
    if (r === 'exit') return this.exit();
    if (r === 'open') { this.setPaused(true); this.el.confirm.hidden = false; this.el.confirm.querySelector('.bc-confirm-stay').focus({ preventScroll: true }); }
  },
  cancelBack() {
    const prev = cancelBack(this.backConfirm);
    if (prev === null) return;
    this.el.confirm.hidden = true;
    this.setPaused(prev);
  },

  destroy() {
    this.alive = false;
    if (this.onPopState) window.removeEventListener('popstate', this.onPopState);
    if (this.pushedHistory && history.state?.botCommander) { this.pushedHistory = false; try { history.back(); } catch {} }
    clearTimeout(this.toastTimer);
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
