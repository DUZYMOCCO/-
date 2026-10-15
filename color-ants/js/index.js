/**
 * カラー・アント（Color Ants）
 * 色をたべつくす、わらわら蟻軍団！
 */

import { sound } from '../../common/js/audio.js?v=1';
import { loadCss } from '../../common/js/load-css.js';
import { storage } from '../../common/js/storage.js';
import { STAGES, buildPixelGrid, COLOR_GROUPS } from './stages.js?v=1';
import {
  UPGRADE_DEFS,
  COLOR_UNLOCK_ORDER,
  getUpgradeCost,
  normalizeSave,
} from './upgrades.js?v=1';
import { AntSimulation } from './ants.js?v=1';
import { AntRenderer } from './renderer.js?v=1';

const SAVE_KEY = 'color_ants_save';

export default {
  prepare() {
    return loadCss(new URL('../css/color-ants.css?v=1', import.meta.url).href);
  },

  init(container, onBackToHub) {
    this.container = container;
    this.onBackToHub = onBackToHub;
    this.saveData = normalizeSave(storage.get(SAVE_KEY));
    this.running = true;
    this.animId = null;
    this.lastTime = performance.now();
    this.audioCooldown = 0;

    this.currentStage = STAGES[this.saveData.stageIndex % STAGES.length];
    this.pixels = buildPixelGrid(this.currentStage);
    this.cleared = false;

    this.buildDOM();
    this.setupEvents();

    this.sim = new AntSimulation(this.canvas.width, this.canvas.height);
    this.renderer = new AntRenderer(this.canvas);

    this.handleResize();
    this.updateUI();

    // ゲームループ開始
    this.loop = this.loop.bind(this);
    this.animId = requestAnimationFrame(this.loop);
  },

  buildDOM() {
    this.container.innerHTML = `
      <div class="color-ants-container">
        <!-- ヘッダー -->
        <header class="ants-header">
          <button class="ants-back-btn" id="ants-back-btn">← もどる</button>
          <div class="ants-stage-info">
            <span class="ants-stage-title" id="ants-stage-name">${this.currentStage.icon} ${this.currentStage.name}</span>
            <span class="ants-stage-progress" id="ants-stage-prog">0% 完食</span>
          </div>
          <div class="ants-coins">
            <span>💰</span>
            <span id="ants-coin-count">${this.saveData.coins}</span>
          </div>
        </header>

        <!-- メインキャンバス -->
        <div class="ants-canvas-wrap" id="ants-canvas-wrap">
          <canvas class="ants-canvas" id="ants-canvas"></canvas>
          <div class="ants-boost-hint" id="ants-boost-hint">👆 タップで超加速！</div>
        </div>

        <!-- アップグレードパネル -->
        <footer class="ants-upgrade-panel">
          <div class="ants-upgrade-grid" id="ants-up-grid"></div>
          <div class="ants-unlock-row" id="ants-unlock-row"></div>
        </footer>

        <!-- クリアモーダル（初期非表示） -->
        <div class="ants-clear-modal" id="ants-clear-modal" style="display: none;">
          <div class="ants-clear-card">
            <div class="ants-clear-icon">🎉</div>
            <div class="ants-clear-title">かんしょく！</div>
            <div class="ants-clear-desc">ぜんぶキレイに食べつくした！</div>
            <div class="ants-clear-reward" id="ants-clear-reward">+0 コイン</div>
            <button class="ants-next-btn" id="ants-next-btn">つぎの絵へすすむ ➔</button>
          </div>
        </div>
      </div>
    `;

    this.canvas = this.container.querySelector('#ants-canvas');
    this.canvasWrap = this.container.querySelector('#ants-canvas-wrap');
    this.boostHint = this.container.querySelector('#ants-boost-hint');
    this.coinText = this.container.querySelector('#ants-coin-count');
    this.stageNameText = this.container.querySelector('#ants-stage-name');
    this.stageProgText = this.container.querySelector('#ants-stage-prog');
    this.upGrid = this.container.querySelector('#ants-up-grid');
    this.unlockRow = this.container.querySelector('#ants-unlock-row');
    this.clearModal = this.container.querySelector('#ants-clear-modal');
    this.clearRewardText = this.container.querySelector('#ants-clear-reward');
  },

  setupEvents() {
    // 戻るボタン
    this.container.querySelector('#ants-back-btn').addEventListener('click', () => {
      this.destroy();
      this.onBackToHub();
    });

    // 次のステージボタン
    this.container.querySelector('#ants-next-btn').addEventListener('click', () => {
      this.nextStage();
    });

    // タップブースト
    const onTouch = (e) => {
      if (e.target.closest('button')) return;
      this.sim.triggerTapBoost();
      sound.play('tap');
      this.boostHint.classList.add('active');
      this.boostHint.textContent = '🔥 FRENZY BOOST中!!';
    };

    this.canvasWrap.addEventListener('pointerdown', onTouch);

    // リサイズ監視
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.canvasWrap);
  },

  handleResize() {
    const rect = this.canvasWrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.floor(rect.width);
    const h = Math.floor(rect.height);

    if (w <= 0 || h <= 0) return;

    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    const ctx = this.canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    if (this.sim) {
      this.sim.resize(w, h);
    }

    // グリッド位置の計算
    const boardPadding = 20;
    const maxBoardWidth = Math.min(w - boardPadding * 2, 340);
    const cellSize = Math.floor(maxBoardWidth / this.currentStage.size);
    const totalBoardSize = cellSize * this.currentStage.size;
    const startX = Math.floor((w - totalBoardSize) / 2);
    const startY = Math.max(20, Math.floor((h - totalBoardSize) / 2) - 40);

    this.gridInfo = {
      startX,
      startY,
      cellSize,
    };
  },

  loop(time) {
    if (!this.running) return;

    const dt = Math.min(0.1, (time - this.lastTime) / 1000);
    this.lastTime = time;
    this.audioCooldown = Math.max(0, this.audioCooldown - dt);

    // シミュレーション更新
    if (!this.cleared) {
      this.sim.update(dt, this.pixels, this.gridInfo, this.saveData, (pixel, coins) => {
        this.saveData.coins += coins;
        this.coinText.textContent = this.saveData.coins;
        if (this.audioCooldown <= 0) {
          sound.play('hit');
          this.audioCooldown = 0.08;
        }
        this.checkStageClear();
        this.updateProgress();
      });
    }

    // ブーストヒント表示リセット
    if (!this.sim.isFrenzy && this.boostHint.classList.contains('active')) {
      this.boostHint.classList.remove('active');
      this.boostHint.textContent = '👆 タップで超加速！';
    }

    // 描画
    this.renderer.render(this.sim, this.pixels, this.gridInfo, this.saveData);

    this.animId = requestAnimationFrame(this.loop);
  },

  checkStageClear() {
    if (this.cleared) return;
    const allEaten = this.pixels.every(p => p.eaten);
    if (allEaten) {
      this.cleared = true;
      const bonus = this.currentStage.rewardCoins;
      this.saveData.coins += bonus;
      this.save();
      sound.play('reward');

      this.clearRewardText.textContent = `+${bonus} コインGET!`;
      this.clearModal.style.display = 'flex';
    }
  },

  updateProgress() {
    const total = this.pixels.length;
    const eatenCount = this.pixels.filter(p => p.eaten).length;
    const pct = total === 0 ? 0 : Math.floor((eatenCount / total) * 100);
    this.stageProgText.textContent = `${pct}% 完食`;
  },

  nextStage() {
    this.saveData.stageIndex++;
    this.save();
    this.currentStage = STAGES[this.saveData.stageIndex % STAGES.length];
    this.pixels = buildPixelGrid(this.currentStage);
    this.cleared = false;
    this.clearModal.style.display = 'none';

    this.stageNameText.textContent = `${this.currentStage.icon} ${this.currentStage.name}`;
    this.handleResize();
    this.updateProgress();
    this.updateUI();
  },

  updateUI() {
    this.coinText.textContent = this.saveData.coins;

    // アップグレードボタン一覧の描画
    const keys = ['count', 'speed', 'power', 'giant'];
    this.upGrid.innerHTML = keys.map(key => {
      const def = UPGRADE_DEFS[key];
      const lvl = this.saveData.upgrades[key];
      const cost = getUpgradeCost(key, lvl);
      const isMax = lvl >= def.maxLevel;
      const canAfford = this.saveData.coins >= cost && !isMax;

      return `
        <button class="ants-up-btn ${canAfford ? '' : 'disabled'}" data-up="${key}">
          <div class="ants-up-info">
            <span class="ants-up-name">${def.icon} ${def.name}</span>
            <span class="ants-up-lvl">${isMax ? 'MAX' : `Lv.${lvl}`}</span>
          </div>
          <div class="ants-up-cost">${isMax ? 'MAX' : `💰 ${cost}`}</div>
        </button>
      `;
    }).join('');

    // アップグレードクリック設定
    this.upGrid.querySelectorAll('.ants-up-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const key = btn.dataset.up;
        this.buyUpgrade(key);
      });
    });

    // 次のカラーアンロック枠
    const nextColor = COLOR_UNLOCK_ORDER.find(c => !this.saveData.unlockedColors.includes(c.group));
    if (nextColor) {
      const canAfford = this.saveData.coins >= nextColor.cost;
      this.unlockRow.innerHTML = `
        <button class="ants-unlock-btn ${canAfford ? '' : 'disabled'}" id="ants-unlock-btn">
          <span>新種解放: ${nextColor.icon} ${nextColor.name}</span>
          <span>💰 ${nextColor.cost}</span>
        </button>
      `;
      this.unlockRow.querySelector('#ants-unlock-btn').addEventListener('click', () => {
        this.unlockColor(nextColor);
      });
    } else {
      this.unlockRow.innerHTML = `
        <div style="font-size:11px; text-align:center; color:#15803d; font-weight:700; padding:4px;">
          ✨ 全てのアリ種をアンロック完了！
        </div>
      `;
    }
  },

  buyUpgrade(key) {
    const lvl = this.saveData.upgrades[key];
    const cost = getUpgradeCost(key, lvl);
    if (this.saveData.coins >= cost && lvl < UPGRADE_DEFS[key].maxLevel) {
      this.saveData.coins -= cost;
      this.saveData.upgrades[key]++;
      sound.play('coin');
      this.save();
      this.updateUI();
    }
  },

  unlockColor(colorObj) {
    if (this.saveData.coins >= colorObj.cost && !this.saveData.unlockedColors.includes(colorObj.group)) {
      this.saveData.coins -= colorObj.cost;
      this.saveData.unlockedColors.push(colorObj.group);
      sound.play('reward');
      this.save();
      this.updateUI();
    }
  },

  save() {
    storage.set(SAVE_KEY, this.saveData);
  },

  destroy() {
    this.running = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    this.save();
  },
};
