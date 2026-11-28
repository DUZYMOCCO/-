/**
 * ABYSS DIVE — 旧 2D 版アーカイブ起動ラッパー（遅延ロード専用）
 *
 * v5.0.0 で Phase 2（完全 3D 深海探査）＋ Phase 1（3D 回廊・BH）を本編へ昇格したため、
 * 過去の 2D 版（game.js + WebGL2 多層 2D depth-bridge.js）はここへアーカイブ隔離する。
 * 通常起動時は一切ロードされず、メニューから明示的に開いた場合のみ起動する。
 */

import { createAbyssDive } from './game.js?v=86';
import { createDepthBridge } from './depth-bridge.js?v=9';

/**
 * 旧 2D 版セッションを container 内に起動する。
 * @param {object} opts { container, onBackTo3D, onBackToHub }
 */
export function createArchive2D(opts) {
  const container = opts.container;
  const onBackTo3D = opts.onBackTo3D || (() => {});
  const onBackToHub = opts.onBackToHub || null;

  const rootEl = document.createElement('div');
  rootEl.className = 'abyss-root adl-hybrid-root';
  rootEl.innerHTML = `
    <canvas id="abyss-gl-canvas" class="adl-gl-canvas"></canvas>
    <canvas id="abyss-canvas" class="abyss-canvas adl-game-canvas"></canvas>
    <button class="adl-menu-btn" id="abyss-menu-btn" type="button" aria-expanded="false">☰ 2Dアーカイブ</button>
    <div class="adl-menu-backdrop hidden" id="abyss-menu-backdrop"></div>
    <nav class="adl-menu-drawer hidden" id="abyss-menu-drawer" aria-label="旧2Dアーカイブメニュー">
      <div class="adl-menu-status" id="adl-menu-status">
        <div class="st-row"><span id="adl-st-depth">深度 0 m</span><span class="st-val" id="adl-st-res">資源 0</span></div>
        <div class="st-sub" id="adl-st-equip">📦 旧 2D アーカイブ（v3.x 資産保存版）</div>
      </div>
      <button class="adl-menu-item accent" id="adl-act-return-3d" type="button">
        <span>🌊 3D 本編へ戻る</span><span class="badge">v5.0</span>
      </button>
      <div class="adl-menu-sep"></div>
      <button class="adl-menu-item" id="adl-act-map" type="button">
        <span>🗺 マップ</span><span class="badge" id="adl-badge-map">開く</span>
      </button>
      <button class="adl-menu-item" id="adl-act-zoom" type="button">
        <span>🔍 縮尺切替</span><span class="badge" id="adl-badge-zoom">1.00×</span>
      </button>
      <button class="adl-menu-item" id="adl-act-cabin" type="button">
        <span>🔧 船内（整備・開発）</span><span class="badge" id="adl-badge-cabin">移動</span>
      </button>
      <button class="adl-menu-item" id="adl-act-depth" type="button">
        <span>⚙ Depth 設定</span><span class="badge">描画</span>
      </button>
      ${onBackToHub ? `
        <div class="adl-menu-sep"></div>
        <button class="adl-menu-item danger" id="adl-act-back" type="button">
          <span>← ハブへもどる</span>
        </button>
      ` : ''}
    </nav>
    <div class="abyss-rotate">
      <div class="abyss-rotate-icon">↻</div>
      <div>スマホを横向きにしてください</div>
    </div>
  `;
  container.appendChild(rootEl);

  const glCanvas = rootEl.querySelector('#abyss-gl-canvas');
  const canvas = rootEl.querySelector('#abyss-canvas');
  const depthBridge = createDepthBridge({ glCanvas, rootEl });
  const game = createAbyssDive({
    canvas,
    depthBridge,
    onGameOver: () => {},
  });
  game.start();

  const menuBtn = rootEl.querySelector('#abyss-menu-btn');
  const backdrop = rootEl.querySelector('#abyss-menu-backdrop');
  const drawer = rootEl.querySelector('#abyss-menu-drawer');
  const badgeMap = rootEl.querySelector('#adl-badge-map');
  const badgeZoom = rootEl.querySelector('#adl-badge-zoom');
  const badgeCabin = rootEl.querySelector('#adl-badge-cabin');
  const stDepth = rootEl.querySelector('#adl-st-depth');
  const stRes = rootEl.querySelector('#adl-st-res');

  let menuOpen = false;
  const syncBadges = () => {
    const st = game.state ? game.state() : {};
    badgeMap.textContent = st.mapOn ? '閉じる' : '開く';
    const z = Number.isFinite(st.diveZoomTarget) ? st.diveZoomTarget : 1;
    badgeZoom.textContent = z.toFixed(2) + '×';
    badgeCabin.textContent = st.mode === 'base' ? '潜航へ' : '開く';
    const depthStr = game.formatDepth ? game.formatDepth() : `${Math.round((st.py || 0) / 2.6)} m`;
    const zone = game.zoneNameAtPlayer ? game.zoneNameAtPlayer() : '';
    stDepth.textContent = `深度 ${depthStr}${zone ? ' / ' + zone : ''}`;
    stRes.textContent = `資源 ${(st.resource || 0).toLocaleString()}`;
  };

  const setMenuOpen = (next) => {
    menuOpen = Boolean(next);
    drawer.classList.toggle('hidden', !menuOpen);
    backdrop.classList.toggle('hidden', !menuOpen);
    menuBtn.setAttribute('aria-expanded', menuOpen ? 'true' : 'false');
    menuBtn.textContent = menuOpen ? '× 閉じる' : '☰ 2Dアーカイブ';
    if (menuOpen) syncBadges();
  };

  const stopProp = (e) => e.stopPropagation();
  for (const el of [menuBtn, backdrop, drawer]) {
    el.addEventListener('pointerdown', stopProp);
    el.addEventListener('touchstart', stopProp, { passive: true });
  }

  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (depthBridge && depthBridge.isPanelOpen()) depthBridge.closePanel();
    setMenuOpen(!menuOpen);
  });
  backdrop.addEventListener('click', (e) => { e.stopPropagation(); setMenuOpen(false); });

  rootEl.querySelector('#adl-act-return-3d').addEventListener('click', (e) => {
    e.stopPropagation();
    setMenuOpen(false);
    destroy();
    onBackTo3D();
  });
  rootEl.querySelector('#adl-act-map').addEventListener('click', (e) => {
    e.stopPropagation();
    setMenuOpen(false);
    const st = game.state ? game.state() : {};
    if (st.mapOn) game.closeMap();
    else {
      if (st.mode === 'base') game.exitBase();
      game.openMap();
    }
  });
  rootEl.querySelector('#adl-act-zoom').addEventListener('click', (e) => {
    e.stopPropagation();
    if (game.cycleDiveZoom) game.cycleDiveZoom();
    syncBadges();
  });
  rootEl.querySelector('#adl-act-cabin').addEventListener('click', (e) => {
    e.stopPropagation();
    setMenuOpen(false);
    const st = game.state ? game.state() : {};
    if (st.mapOn) game.closeMap();
    if (st.mode === 'base') game.exitBase();
    else if (st.state === 'play' && st.mode === 'dive') game.enterBase(0);
  });
  rootEl.querySelector('#adl-act-depth').addEventListener('click', (e) => {
    e.stopPropagation();
    setMenuOpen(false);
    if (depthBridge) depthBridge.togglePanel();
  });
  const backBtn = rootEl.querySelector('#adl-act-back');
  if (backBtn && onBackToHub) {
    backBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      setMenuOpen(false);
      destroy();
      onBackToHub();
    });
  }

  const resizeObserver = new ResizeObserver(() => game && game.resize && game.resize());
  resizeObserver.observe(container);

  const hudSyncTimer = window.setInterval(() => {
    if (!game || !game.state) return;
    const st = game.state();
    const hideMenu = st.mode === 'base' || !!st.mapOn;
    menuBtn.classList.toggle('hidden', hideMenu);
    if (hideMenu && menuOpen) setMenuOpen(false);
  }, 120);

  let destroyed = false;
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    window.clearInterval(hudSyncTimer);
    resizeObserver.disconnect();
    game.destroy();
    if (rootEl.parentNode) rootEl.parentNode.removeChild(rootEl);
  }

  return { destroy };
}
