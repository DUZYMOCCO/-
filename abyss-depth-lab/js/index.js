/**
 * ABYSS DIVE · DEPTH LAB — 本編統合（WebGL2 多層2D深海レンダリング + 統合メニュー UI）
 */
import { loadCss } from '../../common/js/load-css.js';
import { createAbyssDive } from './game.js?v=75';
import { createDepthBridge } from './depth-bridge.js?v=9';

export default {
  async prepare() {
    await Promise.all([
      loadCss(new URL('../css/abyss-dive.css?v=2', import.meta.url).href),
      loadCss(new URL('../css/lab.css?v=4', import.meta.url).href),
    ]);
  },

  init(container, onBackToHub) {
    this.container = container;
    this.onBackToHub = onBackToHub;

    container.innerHTML = `
      <div class="abyss-root adl-hybrid-root">
        <canvas id="abyss-gl-canvas" class="adl-gl-canvas"></canvas>
        <canvas id="abyss-canvas" class="abyss-canvas adl-game-canvas"></canvas>
        <button class="adl-menu-btn" id="abyss-menu-btn" type="button" aria-expanded="false">☰ メニュー</button>
        <div class="adl-menu-backdrop hidden" id="abyss-menu-backdrop"></div>
        <nav class="adl-menu-drawer hidden" id="abyss-menu-drawer" aria-label="ゲームメニュー">
          <div class="adl-menu-status" id="adl-menu-status">
            <div class="st-row"><span id="adl-st-depth">深度 0 m</span><span class="st-val" id="adl-st-res">資源 0</span></div>
            <div class="st-sub" id="adl-st-equip">◇ 父の信号 ・ はるか下 から</div>
          </div>
          <button class="adl-menu-item" id="adl-act-map" type="button">
            <span>🗺 マップ</span><span class="badge" id="adl-badge-map">開く</span>
          </button>
          <button class="adl-menu-item" id="adl-act-zoom" type="button">
            <span>🔍 縮尺切替</span><span class="badge" id="adl-badge-zoom">1.00×</span>
          </button>
          <button class="adl-menu-item accent" id="adl-act-cabin" type="button">
            <span>🔧 船内（整備・開発）</span><span class="badge" id="adl-badge-cabin">移動</span>
          </button>
          <button class="adl-menu-item" id="adl-act-depth" type="button">
            <span>⚙ Depth 設定</span><span class="badge">描画</span>
          </button>
          <div class="adl-menu-test-wrap">
            <div class="adl-menu-test-label">🧪 回廊・BH 即時テスト</div>
            <div class="adl-menu-test-row">
              <button class="adl-menu-test-btn" id="adl-test-down" type="button">▼ 下降</button>
              <button class="adl-menu-test-btn" id="adl-test-up" type="button">▲ 上昇</button>
              <button class="adl-menu-test-btn bh" id="adl-test-bh" type="button">◉ BH</button>
            </div>
          </div>
          <div class="adl-menu-sep"></div>
          <button class="adl-menu-item danger" id="adl-act-back" type="button">
            <span>← ハブへもどる</span>
          </button>
        </nav>
        <div class="abyss-rotate">
          <div class="abyss-rotate-icon">↻</div>
          <div>スマホを横向きにしてください</div>
        </div>
      </div>
    `;

    const rootEl = container.querySelector('.abyss-root');
    const glCanvas = container.querySelector('#abyss-gl-canvas');
    this.canvas = container.querySelector('#abyss-canvas');

    this.depthBridge = createDepthBridge({ glCanvas, rootEl });
    this.game = createAbyssDive({
      canvas: this.canvas,
      depthBridge: this.depthBridge,
      onGameOver: () => {},
    });
    this.game.start();

    // --- 統合「☰ メニュー」の開閉と各アクション ---
    const menuBtn = container.querySelector('#abyss-menu-btn');
    const backdrop = container.querySelector('#abyss-menu-backdrop');
    const drawer = container.querySelector('#abyss-menu-drawer');
    const badgeMap = container.querySelector('#adl-badge-map');
    const badgeZoom = container.querySelector('#adl-badge-zoom');
    const badgeCabin = container.querySelector('#adl-badge-cabin');
    const stDepth = container.querySelector('#adl-st-depth');
    const stRes = container.querySelector('#adl-st-res');
    const stEquip = container.querySelector('#adl-st-equip');

    let menuOpen = false;
    const syncBadges = () => {
      if (!this.game) return;
      const st = this.game.state ? this.game.state() : {};
      badgeMap.textContent = st.mapOn ? '閉じる' : '開く';
      const z = Number.isFinite(st.diveZoomTarget) ? st.diveZoomTarget : 1;
      badgeZoom.textContent = z.toFixed(2) + '×';
      badgeCabin.textContent = st.mode === 'base' ? '潜航へ' : '開く';
      const depthStr = (this.game.formatDepth ? this.game.formatDepth() : `${Math.round((st.py || 0) / 2.6)} m`);
      const zone = (this.game.zoneNameAtPlayer ? this.game.zoneNameAtPlayer() : '');
      stDepth.textContent = `深度 ${depthStr}${zone ? ' / ' + zone : ''}`;
      stRes.textContent = `資源 ${(st.resource || 0).toLocaleString()}`;
      stEquip.textContent = `撃破 ${st.kills || 0}  ・  ◇ 父の信号 はるか下`;
    };

    const setMenuOpen = (next) => {
      menuOpen = Boolean(next);
      drawer.classList.toggle('hidden', !menuOpen);
      backdrop.classList.toggle('hidden', !menuOpen);
      menuBtn.setAttribute('aria-expanded', menuOpen ? 'true' : 'false');
      menuBtn.textContent = menuOpen ? '× 閉じる' : '☰ メニュー';
      if (menuOpen) syncBadges();
    };

    const stopProp = (e) => e.stopPropagation();
    for (const el of [menuBtn, backdrop, drawer]) {
      el.addEventListener('pointerdown', stopProp);
      el.addEventListener('touchstart', stopProp, { passive: true });
    }

    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.depthBridge && this.depthBridge.isPanelOpen()) {
        this.depthBridge.closePanel();
      }
      setMenuOpen(!menuOpen);
    });
    backdrop.addEventListener('click', (e) => {
      e.stopPropagation();
      setMenuOpen(false);
    });

    container.querySelector('#adl-act-map').addEventListener('click', (e) => {
      e.stopPropagation();
      setMenuOpen(false);
      if (!this.game) return;
      const st = this.game.state ? this.game.state() : {};
      if (st.mapOn) this.game.closeMap();
      else {
        if (st.mode === 'base') this.game.exitBase();
        this.game.openMap();
      }
    });

    container.querySelector('#adl-act-zoom').addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.game && this.game.cycleDiveZoom) this.game.cycleDiveZoom();
      syncBadges();
    });

    container.querySelector('#adl-act-cabin').addEventListener('click', (e) => {
      e.stopPropagation();
      setMenuOpen(false);
      if (!this.game) return;
      const st = this.game.state ? this.game.state() : {};
      if (st.mapOn) this.game.closeMap();
      if (st.mode === 'base') this.game.exitBase();
      else if (st.state === 'play' && st.mode === 'dive') this.game.enterBase(0);
    });

    container.querySelector('#adl-act-depth').addEventListener('click', (e) => {
      e.stopPropagation();
      setMenuOpen(false);
      if (this.depthBridge) this.depthBridge.togglePanel();
    });

    const launchTunnelTest = (theme) => (e) => {
      e.stopPropagation();
      setMenuOpen(false);
      if (this.game && this.game.startTunnel) this.game.startTunnel(theme);
    };
    container.querySelector('#adl-test-down').addEventListener('click', launchTunnelTest('corridor_down'));
    container.querySelector('#adl-test-up').addEventListener('click', launchTunnelTest('corridor_up'));
    container.querySelector('#adl-test-bh').addEventListener('click', launchTunnelTest('blackhole'));

    container.querySelector('#adl-act-back').addEventListener('click', (e) => {
      e.stopPropagation();
      setMenuOpen(false);
      this.destroy();
      if (onBackToHub) onBackToHub();
    });

    this.resizeObserver = new ResizeObserver(() => this.game && this.game.resize && this.game.resize());
    this.resizeObserver.observe(container);

    // 船内インターミッション中およびマップ表示中は右上の「×」ボタン等と重ならないよう「☰ メニュー」を自動退避
    this._hudSyncTimer = window.setInterval(() => {
      if (!this.game || !this.game.state) return;
      const st = this.game.state();
      const hideMenu = st.mode === 'base' || !!st.mapOn;
      menuBtn.classList.toggle('hidden', hideMenu);
      if (hideMenu && menuOpen) setMenuOpen(false);
    }, 120);

    window.__abyss = this.game;
  },

  destroy() {
    if (this._hudSyncTimer) { window.clearInterval(this._hudSyncTimer); this._hudSyncTimer = null; }
    if (this.resizeObserver) { this.resizeObserver.disconnect(); this.resizeObserver = null; }
    if (this.game) { this.game.destroy(); this.game = null; }
    this.depthBridge = null;
    window.__abyss = null;
  },
};
