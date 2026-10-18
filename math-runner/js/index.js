/**
 * さんすうシューター（Math Runner）
 * けいさんして たまを ふやせ！
 */

import { sound } from '../../common/js/audio.js?v=1';
import { loadCss } from '../../common/js/load-css.js';
import { storage } from '../../common/js/storage.js';
import {
  UPGRADES,
  SPEEDS,
  getUpgradeCost,
  normalizeSave,
  loadSaveOnce,
  generateStageCourse,
} from './rules.js?v=7';
import { RunnerEngine } from './engine.js?v=7';
import { RunnerRenderer } from './renderer.js?v=7';

const SAVE_KEY = 'math_runner_save';

export default {
  prepare() {
    return loadCss(new URL('../css/math-runner.css?v=7', import.meta.url).href);
  },

  init(container, onBackToHub) {
    this.container = container;
    this.onBackToHub = onBackToHub;
    // v1.3.1 いちどだけ リセット（marker は セーブとは べつの キー。くわしくは rules.js の RESET_EPOCH）
    this.saveData = loadSaveOnce(storage, SAVE_KEY);
    this.running = true;
    this.inRun = false;
    this.animId = null;
    this.lastTime = performance.now();
    this.audioCooldown = 0;

    this.buildDOM();
    this.setupEvents();

    this.renderer = new RunnerRenderer(this.canvas);
    this.handleResize();
    this.updateLobbyUI();

    this.loop = this.loop.bind(this);
    this.animId = requestAnimationFrame(this.loop);
  },

  buildDOM() {
    this.container.innerHTML = `
      <div class="math-runner-container">
        <!-- ヘッダー -->
        <header class="runner-header">
          <button class="runner-back-btn" id="runner-back-btn">← もどる</button>
          <div class="runner-stage-info" id="runner-stage-title">ステージ 1</div>
          <div class="runner-coins">
            <span>💰</span>
            <span id="runner-coin-count">${this.saveData.coins}</span>
          </div>
        </header>

        <!-- メインキャンバス -->
        <div class="runner-canvas-wrap" id="runner-canvas-wrap">
          <canvas class="runner-canvas" id="runner-canvas"></canvas>
          <div class="runner-guide-hint" id="runner-guide-hint" style="display: none;">
            ↔ ゆびで うごいて ブロックと ゲートを うとう！
          </div>
        </div>

        <!-- ロビー・アップグレード画面 -->
        <div class="runner-lobby-overlay" id="runner-lobby">
          <div class="runner-lobby-title">
            <h1>🎯 さんすうシューター</h1>
            <p>ブロックを うって たおそう！ ゲートも うつと かずが かわるよ</p>
          </div>

          <div class="runner-speed" id="runner-speed"></div>
          <div class="runner-lobby-upgrades" id="runner-up-list"></div>

          <button class="runner-start-btn" id="runner-start-btn">
            🚀 出撃する！
          </button>
        </div>

        <!-- リザルト画面 -->
        <div class="runner-result-overlay" id="runner-result" style="display: none;">
          <div class="runner-result-card">
            <div class="runner-result-icon" id="runner-result-icon">🏆</div>
            <div class="runner-result-title" id="runner-result-title">ステージクリア！</div>
            <div class="runner-result-mult" id="runner-result-mult">ボーナス ×1.0</div>
            <div class="runner-result-coins" id="runner-result-coins">獲得: +0 コイン</div>
            <button class="runner-next-btn" id="runner-next-btn">つぎのステージへ ➔</button>
          </div>
        </div>
      </div>
    `;

    this.canvas = this.container.querySelector('#runner-canvas');
    this.canvasWrap = this.container.querySelector('#runner-canvas-wrap');
    this.guideHint = this.container.querySelector('#runner-guide-hint');
    this.coinText = this.container.querySelector('#runner-coin-count');
    this.stageTitle = this.container.querySelector('#runner-stage-title');
    this.lobby = this.container.querySelector('#runner-lobby');
    this.upList = this.container.querySelector('#runner-up-list');
    this.speedBox = this.container.querySelector('#runner-speed');
    this.resultOverlay = this.container.querySelector('#runner-result');
    this.resultIcon = this.container.querySelector('#runner-result-icon');
    this.resultTitle = this.container.querySelector('#runner-result-title');
    this.nextBtn = this.container.querySelector('#runner-next-btn');
    this.resultMultText = this.container.querySelector('#runner-result-mult');
    this.resultCoinsText = this.container.querySelector('#runner-result-coins');
  },

  setupEvents() {
    this.container.querySelector('#runner-back-btn').addEventListener('click', () => {
      this.destroy();
      this.onBackToHub();
    });

    this.container.querySelector('#runner-start-btn').addEventListener('click', () => {
      this.startRun();
    });

    this.container.querySelector('#runner-next-btn').addEventListener('click', () => {
      if (this.lastCleared !== false) this.saveData.stage++; // かべを こわせなかった ときは おなじ ステージ
      this.save();
      this.resultOverlay.style.display = 'none';
      this.updateLobbyUI();
      this.lobby.style.display = 'flex';
    });

    // タッチ・ドラッグ操作
    let isDragging = false;
    const updatePointer = (clientX) => {
      if (!this.engine || !this.inRun) return;
      const rect = this.canvasWrap.getBoundingClientRect();
      const normX = ((clientX - rect.left) / rect.width - 0.5) * 2; // -1.0 〜 +1.0
      this.engine.setTargetX(normX);
    };

    this.canvasWrap.addEventListener('pointerdown', (e) => {
      isDragging = true;
      updatePointer(e.clientX);
    });

    window.addEventListener('pointermove', (e) => {
      if (isDragging) {
        updatePointer(e.clientX);
      }
    });

    window.addEventListener('pointerup', () => {
      isDragging = false;
    });

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.canvasWrap);
  },

  handleResize() {
    const rect = this.canvasWrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.floor(rect.width);
    const h = Math.floor(rect.height);

    if (w <= 0 || h <= 0) return;

    this.logicalWidth = w;
    this.logicalHeight = h;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
  },

  startRun() {
    this.inRun = true;
    this.lobby.style.display = 'none';
    this.guideHint.textContent = '↔ ゆびで うごいて ブロックと ゲートを うとう！';
    this.guideHint.style.display = 'block';

    const course = generateStageCourse(this.saveData.stage, this.saveData.speed);
    this.engine = new RunnerEngine(course, this.saveData);
    sound.play('reward');
  },

  loop(time) {
    if (!this.running) return;

    const dt = Math.min(0.08, (time - this.lastTime) / 1000);
    this.lastTime = time;
    this.audioCooldown = Math.max(0, this.audioCooldown - dt);

    if (this.inRun && this.engine) {
      this.engine.update(dt, (eventName, data) => {
        this.handleGameEvent(eventName, data);
      });

      if (this.engine.stuck > 0) { // かべの まえ：うちつづけよう
        this.guideHint.textContent = '💥 かべを こわせ！ うちつづけよう！';
        this.guideHint.style.display = 'block';
      } else if (this.engine.time > 5 && this.guideHint.style.display !== 'none') this.guideHint.style.display = 'none';
      this.renderer.render(this.engine, this.logicalWidth, this.logicalHeight);
    }

    this.animId = requestAnimationFrame(this.loop);
  },

  handleGameEvent(eventName, data) {
    switch (eventName) {
      case 'shoot':
        if (this.audioCooldown <= 0) {
          sound.play('tap');
          this.audioCooldown = 0.09;
        }
        break;
      case 'gate-grow':
        if (this.audioCooldown <= 0) { sound.play('coin'); this.audioCooldown = 0.07; }
        break;
      case 'gate':
        if (data.isGood) {
          sound.play('reward');
        } else {
          sound.play('down');
        }
        break;
      case 'destroy-block':
        sound.play('blast');
        this.saveData.coins += data.coins;
        this.coinText.textContent = this.saveData.coins;
        break;
      case 'hit-block':
        sound.play('hit');
        break;
      case 'destroy-wall':
        sound.play('coin');
        break;
      case 'clear':
        this.inRun = false;
        this.guideHint.style.display = 'none';
        sound.play('reward');

        this.lastCleared = data.cleared !== false;
        // かべを 1まいも こわせなかった ときは ボーナス なし。ステージは おなじ（もういちど ちょうせん）
        const finalBonus = this.lastCleared ? Math.floor(data.earnedCoins * data.finalMult) : 0;
        this.resultIcon.textContent = this.lastCleared ? '🏆' : '💪';
        this.resultTitle.textContent = this.lastCleared ? 'ステージクリア！' : 'もうすこし！ ちからが たりなかったよ';
        this.nextBtn.textContent = this.lastCleared ? 'つぎのステージへ ➔' : 'もういちど ちょうせん ➔';
        this.saveData.coins += finalBonus;
        this.save();

        this.resultMultText.textContent = this.lastCleared ? `ボーナス倍率 ×${data.finalMult}` : 'ゲートを うって たまを ふやして ブロックを たおそう！';
        this.resultCoinsText.textContent = `ステージ獲得: +${data.earnedCoins}  ➔  合計 +${data.earnedCoins + finalBonus} コイン！`;
        this.resultOverlay.style.display = 'flex';
        break;
    }
  },

  updateLobbyUI() {
    this.stageTitle.textContent = `ステージ ${this.saveData.stage}`;
    this.coinText.textContent = this.saveData.coins;

    // すすむ はやさ（ゆっくり／ふつう／はやい）
    this.speedBox.innerHTML = `<div class="runner-speed-title">すすむ はやさ</div><div class="runner-speed-row">${
      Object.entries(SPEEDS).map(([k, s]) => `<button class="runner-speed-btn ${this.saveData.speed === k ? 'on' : ''}" data-speed="${k}">${s.icon}<span>${s.label}</span></button>`).join('')
    }</div>`;
    this.speedBox.querySelectorAll('.runner-speed-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.saveData.speed = btn.dataset.speed;
        sound.play('tap');
        this.save();
        this.updateLobbyUI();
      });
    });

    const keys = ['startCount', 'fireRate', 'power'];
    this.upList.innerHTML = keys.map(key => {
      const def = UPGRADES[key];
      const lvl = this.saveData.upgrades[key];
      const cost = getUpgradeCost(key, lvl);
      const isMax = lvl >= def.maxLevel;
      const canAfford = this.saveData.coins >= cost && !isMax;

      return `
        <button class="runner-up-btn ${canAfford ? '' : 'disabled'}" data-up="${key}">
          <div class="runner-up-info">
            <span class="runner-up-name">${def.icon} ${def.name}</span>
            <span class="runner-up-lvl">${isMax ? 'MAX' : `Lv.${lvl}/${def.maxLevel}`}</span>
          </div>
          <div class="runner-up-cost">${isMax ? 'MAX' : `💰 ${cost}`}</div>
        </button>
      `;
    }).join('');

    this.upList.querySelectorAll('.runner-up-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.up;
        this.buyUpgrade(key);
      });
    });
  },

  buyUpgrade(key) {
    const lvl = this.saveData.upgrades[key];
    const cost = getUpgradeCost(key, lvl);
    if (this.saveData.coins >= cost && lvl < UPGRADES[key].maxLevel) {
      this.saveData.coins -= cost;
      this.saveData.upgrades[key]++;
      sound.play('coin');
      this.save();
      this.updateLobbyUI();
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
