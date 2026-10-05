/**
 * スマホゲーム工房 メインアプリケーション
 */
import { games, getGameById } from './games-registry.js';
import { sound } from './audio.js';
import { storage } from './storage.js';

class GameStudioApp {
  constructor() {
    this.currentView = 'hub'; // 'hub' or 'game'
    this.activeGame = null;
    this.init();
  }

  init() {
    this.hubEl = document.getElementById('studio-hub');
    this.gameContainerEl = document.getElementById('game-container');
    this.gamesGridEl = document.getElementById('games-grid');
    this.soundToggleBtn = document.getElementById('btn-sound-toggle');

    // サウンドミュート初期状態
    const isMuted = storage.getSoundMuted();
    sound.setMute(isMuted);
    this.updateSoundButtonUI();

    if (this.soundToggleBtn) {
      this.soundToggleBtn.addEventListener('click', () => {
        const muted = sound.toggleMute();
        storage.setSoundMuted(muted);
        this.updateSoundButtonUI();
        if (!muted) sound.playTap();
      });
    }

    // 最新版強制リフレッシュボタン
    const refreshBtn = document.getElementById('btn-force-refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then((registrations) => {
            registrations.forEach((r) => r.unregister());
            if ('caches' in window) {
              caches.keys().then((keys) => {
                keys.forEach((key) => caches.delete(key));
                location.reload(true);
              });
            } else {
              location.reload(true);
            }
          });
        } else {
          location.reload(true);
        }
      });
    }

    // iPhone用オーディオアンロック (画面全体での初タップ検知)
    window.addEventListener('touchstart', () => sound.unlock(), { once: true, passive: true });
    window.addEventListener('click', () => sound.unlock(), { once: true, passive: true });

    // PWA ホーム画面追加ガイド
    this.setupPwaGuide();

    // ゲーム一覧描画
    this.renderHub();

    // サービスワーカー登録
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch((err) => {
        console.log('SW registration failed:', err);
      });
    }
  }

  updateSoundButtonUI() {
    if (!this.soundToggleBtn) return;
    this.soundToggleBtn.textContent = sound.isMuted ? '🔇' : '🔊';
    this.soundToggleBtn.setAttribute('title', sound.isMuted ? 'サウンドON' : 'サウンドOFF');
  }

  renderHub() {
    if (!this.gamesGridEl) return;
    this.gamesGridEl.innerHTML = '';

    games.forEach((game) => {
      const highScore = storage.getHighScore(game.id);

      const card = document.createElement('div');
      card.className = 'game-card';
      card.setAttribute('data-game-id', game.id);
      card.style.setProperty('--card-accent', game.color || '#3b82f6');

      card.innerHTML = `
        <div class="game-card-icon">${game.icon}</div>
        <div class="game-card-content">
          <div class="game-card-title">${game.title}</div>
          <div class="game-card-subtitle">${game.subtitle}</div>
          <div class="game-card-desc">${game.description}</div>
          <div class="game-card-score">
            <span class="score-label">BEST SCORE</span>
            <span class="score-value">${highScore}</span>
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        sound.playTap();
        this.launchGame(game.id);
      });

      this.gamesGridEl.appendChild(card);
    });
  }

  launchGame(gameId) {
    const game = getGameById(gameId);
    if (!game) return;

    this.currentView = 'game';
    this.hubEl.classList.add('hidden');
    this.gameContainerEl.classList.remove('hidden');

    this.activeGame = game;
    try {
      game.init(this.gameContainerEl, () => {
        this.backToHub();
      });
    } catch (err) {
      console.error('Game launch error:', err);
      alert('ゲーム起動エラー: ' + err.message);
      this.backToHub();
    }
  }

  backToHub() {
    this.currentView = 'hub';
    this.gameContainerEl.classList.add('hidden');
    this.gameContainerEl.innerHTML = '';
    this.hubEl.classList.remove('hidden');
    this.activeGame = null;
    // スコアの最新状態を反映して再描画
    this.renderHub();
  }

  setupPwaGuide() {
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;

    // iPhoneかつブラウザで開いている場合、ホーム画面追加バナーを案内可能に
    const pwaBanner = document.getElementById('pwa-install-banner');
    if (isIos && !isStandalone && pwaBanner) {
      pwaBanner.classList.remove('hidden');
      const closeBtn = document.getElementById('btn-close-pwa');
      if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          pwaBanner.classList.add('hidden');
        });
      }
    }
  }
}

// アプリ安全起動
function startApp() {
  if (!window.app) {
    try {
      window.app = new GameStudioApp();
    } catch (err) {
      console.error('App init error:', err);
      const rescue = document.getElementById('rescue-banner');
      if (rescue) rescue.style.display = 'block';
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}
