/**
 * ABYSS DIVE — Depth Lab ハブ入口モジュール
 * スマホゲーム工房の共通契約: export default { prepare(), init(container, onBackToHub), destroy() }
 */
import { loadCss } from '../../common/js/load-css.js';
import { createDepthLabApp } from './app.js?v=1';

export default {
  prepare() {
    return loadCss(new URL('../css/lab.css?v=1', import.meta.url).href);
  },

  init(container, onBackToHub) {
    this.container = container;
    this.onBackToHub = onBackToHub;
    this.app = createDepthLabApp({
      container,
      onBackToHub: () => {
        this.destroy();
        if (onBackToHub) onBackToHub();
      },
    });
  },

  destroy() {
    if (this.app) {
      this.app.destroy();
      this.app = null;
    }
  },
};
