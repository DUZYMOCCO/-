/**
 * ABYSS DIVE · DEPTH LAB — 本編統合試作（v2.2.0 ベース × WebGL2 多層2D深海レンダリング）
 */
import { loadCss } from '../../common/js/load-css.js';
import { createAbyssDive } from './game.js?v=48';
import { createDepthBridge } from './depth-bridge.js?v=4';

export default {
  async prepare() {
    await Promise.all([
      loadCss(new URL('../css/abyss-dive.css?v=2', import.meta.url).href),
      loadCss(new URL('../css/lab.css?v=2', import.meta.url).href),
    ]);
  },

  init(container, onBackToHub) {
    this.container = container;
    this.onBackToHub = onBackToHub;

    container.innerHTML = `
      <div class="abyss-root adl-hybrid-root">
        <canvas id="abyss-gl-canvas" class="adl-gl-canvas"></canvas>
        <canvas id="abyss-canvas" class="abyss-canvas adl-game-canvas"></canvas>
        <button class="abyss-back" id="abyss-back" type="button">← もどる</button>
        <div class="abyss-rotate">
          <div class="abyss-rotate-icon">↻</div>
          <div>スマホを横向きにしてください</div>
        </div>
      </div>
    `;

    const rootEl = container.querySelector('.abyss-root');
    const glCanvas = container.querySelector('#abyss-gl-canvas');
    this.canvas = container.querySelector('#abyss-canvas');

    container.querySelector('#abyss-back').addEventListener('click', () => {
      this.destroy();
      if (onBackToHub) onBackToHub();
    });

    this.depthBridge = createDepthBridge({ glCanvas, rootEl });
    this.game = createAbyssDive({
      canvas: this.canvas,
      depthBridge: this.depthBridge,
      onGameOver: () => {},
    });
    this.game.start();

    this.resizeObserver = new ResizeObserver(() => this.game && this.game.resize && this.game.resize());
    this.resizeObserver.observe(container);

    window.__abyss = this.game;
  },

  destroy() {
    if (this.resizeObserver) { this.resizeObserver.disconnect(); this.resizeObserver = null; }
    if (this.game) { this.game.destroy(); this.game = null; }
    this.depthBridge = null;
    window.__abyss = null;
  },
};
