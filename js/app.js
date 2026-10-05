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

    this.soundToggleBtn.addEventListener('click', () => {
      const muted = sound.toggleMute();
      storage.setSoundMuted(muted);
      this.updateSoundButtonUI();
      if (!muted) sound.playTap();
    });

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
    this.soundToggleBtn.textContent = sound.isMuted ? '🔇' : '🔊';
    this.soundToggleBtn.setAttribute('title', sound.isMuted ? 'サウンドON' : 'サウンドOFF');
  }

  renderHub() {
    this.gamesGridEl.innerHTML = '';

    games.forEach((game) => {
      const highScore = storage.getHighScore(game.id);
      const card = document.createElement('div');
      card.className = 'game-card';
      card.style.setProperty('--accent-color', game.color || '#00f0ff');

      card.innerHTML = `
        <div class="game-card-icon">${game.icon}</div>
        <div class="game-card-info">
          <div class="game-card-header">
            <h3 class="game-card-title">${game.title}</h3>
            <span class="game-card-subtitle">${game.subtitle}</span>
          </div>
          <p class="game-card-desc">${game.description}</p>
          <div class="game-card-footer">
            <span class="badge-score">BEST: <strong>${highScore}</strong></span>
            <button class="play-btn">PLAY ▶</button>
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        sound.playTap();
        this.launchGame(game.id);
      });

      this.gamesGridEl.appendChild(card);
    });

    // 「+ 新しいゲームを作る」枠
    const addCard = document.createElement('div');
    addCard.className = 'game-card create-card';
    addCard.innerHTML = `
      <div class="game-card-icon">🛠️</div>
      <div class="game-card-info">
        <div class="game-card-header">
          <h3 class="game-card-title">＋ 次のゲームを追加</h3>
          <span class="game-card-subtitle">あなた専用の工房</span>
        </div>
        <p class="game-card-desc">AIに「こんなゲームを作って！」とリクエストするだけで、この工房に3作目、4作目がどんどん増えます。</p>
        <div class="game-card-footer">
          <span class="badge-score">工房で受付中</span>
        </div>
      </div>
    `;
    addCard.addEventListener('click', () => {
      sound.playTap();
      alert('「こんなゲームを作りたい！」とチャットで伝えてください。工房ですぐに開発して追加します！');
    });
    this.gamesGridEl.appendChild(addCard);
  }

  launchGame(gameId) {
    const game = getGameById(gameId);
    if (!game) return;

    this.currentView = 'game';
    this.hubEl.classList.add('hidden');
    this.gameContainerEl.classList.remove('hidden');

    // ゲームの初期化
    this.activeGame = game;
    game.init(this.gameContainerEl, () => {
      this.backToHub();
    });
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
      document.getElementById('btn-close-pwa').addEventListener('click', (e) => {
        e.stopPropagation();
        pwaBanner.classList.add('hidden');
      });
    }
  }
}

// アプリ起動
window.addEventListener('DOMContentLoaded', () => {
  window.app = new GameStudioApp();
});
