/**
 * ABYSS DIVE — 深淵潜航
 * 深海を潜水艇で進む横スクロール・シューティング。
 * ゲーム本体はゲーム.js に置き、ここはハブとの受け渡し（DOM・起動・破棄）だけを持つ。
 */
import { loadCss } from '../../common/js/load-css.js';
import { storage } from '../../common/js/storage.js';
import { createAbyssDive } from './game.js?v=37';

const GAME_ID = 'abyss-dive';

export default {
  prepare() {
    return loadCss(new URL('../css/abyss-dive.css?v=2', import.meta.url).href);
  },

  init(container, onBackToHub) {
    this.container = container;
    this.onBackToHub = onBackToHub;

    container.innerHTML = `
      <div class="abyss-root">
        <canvas id="abyss-canvas" class="abyss-canvas"></canvas>
        <button class="abyss-back" id="abyss-back" type="button">← もどる</button>
        <div class="abyss-rotate">
          <div class="abyss-rotate-icon">↻</div>
          <div>スマホを横向きにしてください</div>
        </div>
      </div>
    `;

    this.canvas = container.querySelector('#abyss-canvas');
    container.querySelector('#abyss-back').addEventListener('click', () => {
      this.destroy();
      this.onBackToHub();
    });

    this.game = createAbyssDive({
      canvas: this.canvas,
      /* v1.10.0: スコアから資源（保存値）に移行。資源の残高はハブのカードの BEST SCORE には渡さない
         （別系統。ゲーム内の資源は abyss-dive 自身が localStorage の独自キーで保存する）。
         互換のデバッグ値（G.score）はここでは保存しない。 */
      onGameOver: () => {},
    });
    this.game.start();

    this.resizeObserver = new ResizeObserver(() => this.game.resize && this.game.resize());
    this.resizeObserver.observe(container);

    /* 検証・デバッグ用の入り口 */
    window.__abyss = this.game;
  },

  destroy() {
    if (this.resizeObserver) { this.resizeObserver.disconnect(); this.resizeObserver = null; }
    if (this.game) { this.game.destroy(); this.game = null; }
    window.__abyss = null;
  },
};
