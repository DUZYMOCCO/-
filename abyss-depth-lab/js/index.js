/**
 * ABYSS DIVE — Three.js 完全 3D 本編エントリーポイント（v5.0.0）
 *
 * Phase 2（完全 3D 背後視点・深海探査 `dive-3d.js`）＋ Phase 1（3D 回廊＆重力レンズ BH `tunnel-runner.js`）を
 * 正規の本編として起動する。
 * 旧 2D 版（`game.js` + `depth-bridge.js`）は `archive-2d.js` へ隔離アーカイブ化されており、
 * 通常起動時は一切ロードされない（メニューから明示的に開いた場合のみ動的 import）。
 */
import { loadCss } from '../../common/js/load-css.js';
import { createDive3D } from './dive-3d.js?v=13';
import { createTunnelRunner } from './tunnel-runner.js?v=1';

export default {
  async prepare() {
    await Promise.all([
      loadCss(new URL('../css/abyss-dive.css?v=2', import.meta.url).href),
      loadCss(new URL('../css/lab.css?v=12', import.meta.url).href),
    ]);
  },

  init(container, onBackToHub) {
    this.container = container;
    this.onBackToHub = onBackToHub;
    this.dive3d = null;
    this.tunnel = null;
    this.archive2d = null;
    this.lastWorldY = 160;

    container.innerHTML = `
      <div class="abyss-root adl-3d-main-root">
        <div class="adl-stage-host" id="adl-stage-host"></div>
        <div class="adl-menu-backdrop hidden" id="abyss-menu-backdrop"></div>
        <nav class="adl-menu-drawer hidden" id="abyss-menu-drawer" aria-label="ゲームメニュー">
          <div class="adl-menu-status" id="adl-menu-status">
            <div class="st-row"><span id="adl-st-depth">深度 30 m</span><span class="st-val" id="adl-st-res">資源 0</span></div>
            <div class="st-sub" id="adl-st-equip">◇ 父の信号 ・ 3,960 マイル最深部へ</div>
          </div>
          <button class="adl-menu-item accent" id="adl-act-cabin" type="button">
            <span>🔧 船内（整備・強化）</span><span class="badge">ドック</span>
          </button>
          <div class="adl-menu-test-wrap">
            <div class="adl-menu-test-label">🌊 回廊・ブラックホールへ出撃</div>
            <div class="adl-menu-test-row">
              <button class="adl-menu-test-btn" id="adl-run-down" type="button">▼ 下降回廊</button>
              <button class="adl-menu-test-btn" id="adl-run-up" type="button">▲ 上昇リフト</button>
              <button class="adl-menu-test-btn bh" id="adl-run-bh" type="button">◉ BH突入</button>
            </div>
          </div>
          <div class="adl-menu-sep"></div>
          <button class="adl-menu-item" id="adl-act-archive-2d" type="button">
            <span>📦 旧 2D 版アーカイブ</span><span class="badge">v3.x</span>
          </button>
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

    const stageHost = container.querySelector('#adl-stage-host');
    const backdrop = container.querySelector('#abyss-menu-backdrop');
    const drawer = container.querySelector('#abyss-menu-drawer');
    const stDepth = container.querySelector('#adl-st-depth');
    const stRes = container.querySelector('#adl-st-res');
    const stEquip = container.querySelector('#adl-st-equip');

    let menuOpen = false;
    const syncStatus = () => {
      if (this.dive3d && this.dive3d.getStatus) {
        const st = this.dive3d.getStatus();
        stDepth.textContent = `深度 ${st.depthStr} / ${st.zone}`;
        stRes.textContent = `資源 ${st.resources.toLocaleString()}`;
        stEquip.textContent = `船体 HP ${st.hp}/${st.maxHp}  ・  ◇ 父の信号 はるか下`;
      }
    };

    const setMenuOpen = (next) => {
      menuOpen = Boolean(next);
      drawer.classList.toggle('hidden', !menuOpen);
      backdrop.classList.toggle('hidden', !menuOpen);
      if (menuOpen) syncStatus();
    };

    const stopProp = (e) => e.stopPropagation();
    for (const el of [backdrop, drawer]) {
      el.addEventListener('pointerdown', stopProp);
      el.addEventListener('touchstart', stopProp, { passive: true });
    }
    backdrop.addEventListener('click', (e) => { e.stopPropagation(); setMenuOpen(false); });

    const clearActiveSessions = () => {
      if (this.dive3d) { this.dive3d.destroy(); this.dive3d = null; }
      if (this.tunnel) { this.tunnel.destroy(); this.tunnel = null; }
      if (this.archive2d) { this.archive2d.destroy(); this.archive2d = null; }
    };

    const startDive3D = (initialWorldY = this.lastWorldY) => {
      clearActiveSessions();
      this.lastWorldY = initialWorldY;
      this.dive3d = createDive3D({
        container: stageHost,
        initialWorldY,
        embeddedMain: true,
        onOpenMenu: () => setMenuOpen(!menuOpen),
        onExit: () => setMenuOpen(true),
        onLaunchTunnel: (theme, meta) => {
          if (meta && Number.isFinite(meta.fromWorldY)) this.lastWorldY = meta.fromWorldY;
          this.dive3d = null;
          startTunnel(theme);
        },
      });
    };

    const startTunnel = (theme) => {
      setMenuOpen(false);
      clearActiveSessions();
      this.tunnel = createTunnelRunner({
        container: stageHost,
        theme,
        onComplete: ({ targetWorldY }) => {
          this.tunnel = null;
          startDive3D(Number.isFinite(targetWorldY) ? targetWorldY : this.lastWorldY);
        },
        onAbort: () => {
          this.tunnel = null;
          startDive3D(this.lastWorldY);
        },
      });
    };

    const startArchive2D = async () => {
      setMenuOpen(false);
      clearActiveSessions();
      const mod = await import('./archive-2d.js?v=1');
      this.archive2d = mod.createArchive2D({
        container: stageHost,
        onBackTo3D: () => {
          this.archive2d = null;
          startDive3D(this.lastWorldY);
        },
        onBackToHub: () => {
          this.destroy();
          if (onBackToHub) onBackToHub();
        },
      });
    };

    container.querySelector('#adl-act-cabin').addEventListener('click', (e) => {
      e.stopPropagation();
      setMenuOpen(false);
      if (this.dive3d && this.dive3d.openDock) this.dive3d.openDock();
    });

    container.querySelector('#adl-run-down').addEventListener('click', (e) => {
      e.stopPropagation();
      startTunnel('corridor_down');
    });
    container.querySelector('#adl-run-up').addEventListener('click', (e) => {
      e.stopPropagation();
      startTunnel('corridor_up');
    });
    container.querySelector('#adl-run-bh').addEventListener('click', (e) => {
      e.stopPropagation();
      startTunnel('blackhole');
    });

    container.querySelector('#adl-act-archive-2d').addEventListener('click', (e) => {
      e.stopPropagation();
      startArchive2D();
    });

    container.querySelector('#adl-act-back').addEventListener('click', (e) => {
      e.stopPropagation();
      setMenuOpen(false);
      this.destroy();
      if (onBackToHub) onBackToHub();
    });

    // 本編（完全 3D 深海探査）を即時起動
    startDive3D(160);
  },

  destroy() {
    if (this.dive3d) { this.dive3d.destroy(); this.dive3d = null; }
    if (this.tunnel) { this.tunnel.destroy(); this.tunnel = null; }
    if (this.archive2d) { this.archive2d.destroy(); this.archive2d = null; }
  },
};
