/**
 * ゲーム2: CYBER SLASH (サイバー・スラッシュ)
 * 指先で画面を一閃！飛び出すネオンコアを切り刻む爽快スライサーアクション
 */
import { sound } from '../../audio.js';
import { storage } from '../../storage.js';

export const CyberSlashGame = {
  id: 'cyber-slash',
  title: 'CYBER SLASH',
  subtitle: '光速スライサー',
  icon: '⚔️',
  color: '#ff007f',
  description: '指先でスワイプしてネオンコアを一刀両断！爆弾を避けてコンボを繋げ。',

  init(container, onBackToHub) {
    this.container = container;
    this.onBackToHub = onBackToHub;
    this.highScore = storage.getHighScore(this.id);
    this.setupUI();
    this.setupGame();
  },

  setupUI() {
    this.container.innerHTML = `
      <div class="game-wrapper">
        <header class="game-header">
          <button id="btn-back" class="icon-btn" title="工房へ戻る">🏠</button>
          <div class="game-stats">
            <div class="stat-box">
              <span class="stat-label">SCORE</span>
              <span id="current-score" class="stat-value">0</span>
            </div>
            <div class="stat-box">
              <span class="stat-label">BEST</span>
              <span id="high-score" class="stat-value">${this.highScore}</span>
            </div>
            <div class="stat-box">
              <span class="stat-label">LIFE</span>
              <span id="life-icons" class="stat-value">❤️❤️❤️</span>
            </div>
          </div>
          <button id="btn-retry" class="icon-btn" title="リトライ">🔄</button>
        </header>

        <div class="canvas-container" id="canvas-container">
          <canvas id="game-canvas"></canvas>
          <div id="combo-display" class="combo-banner hidden">COMBO x<span id="combo-count">2</span>!</div>
          <div id="game-overlay" class="game-overlay hidden">
            <div class="overlay-content">
              <h2 id="overlay-title" class="overlay-title">GAME OVER</h2>
              <p class="overlay-score">スコア: <span id="final-score">0</span></p>
              <p id="new-record-badge" class="new-record hidden">✨ NEW RECORD! ✨</p>
              <button id="btn-restart" class="action-btn">もう一度遊ぶ</button>
              <button id="btn-overlay-back" class="action-btn secondary">工房へ戻る</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-back').addEventListener('click', () => {
      sound.playTap();
      this.destroy();
      this.onBackToHub();
    });

    document.getElementById('btn-retry').addEventListener('click', () => {
      sound.playTap();
      this.resetGame();
    });

    document.getElementById('btn-restart').addEventListener('click', () => {
      sound.playTap();
      document.getElementById('game-overlay').classList.add('hidden');
      this.resetGame();
    });

    document.getElementById('btn-overlay-back').addEventListener('click', () => {
      sound.playTap();
      this.destroy();
      this.onBackToHub();
    });
  },

  setupGame() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvasContainer = document.getElementById('canvas-container');

    this.resizeCanvas = () => {
      const rect = this.canvasContainer.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      this.width = rect.width;
      this.height = rect.height;
      this.canvas.width = this.width * dpr;
      this.canvas.height = this.height * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    this.resizeCanvas();
    window.addEventListener('resize', this.resizeCanvas);

    this.setupInput();
    this.resetGame();

    this.lastTime = performance.now();
    this.running = true;
    this.loop = (t) => {
      if (!this.running) return;
      const dt = Math.min((t - this.lastTime) / 1000, 0.1);
      this.lastTime = t;
      this.update(dt);
      this.render();
      requestAnimationFrame(this.loop);
    };
    requestAnimationFrame(this.loop);
  },

  resetGame() {
    this.score = 0;
    this.lives = 3;
    this.targets = [];
    this.halves = [];
    this.particles = [];
    this.bladePoints = [];
    this.spawnTimer = 0;
    this.spawnInterval = 1.2;
    this.gravity = 650;
    this.comboCount = 0;
    this.comboTimer = 0;

    this.updateStatsUI();
  },

  updateStatsUI() {
    document.getElementById('current-score').textContent = this.score;
    document.getElementById('high-score').textContent = this.highScore;
    const hearts = '❤️'.repeat(Math.max(0, this.lives)) + '🖤'.repeat(Math.max(0, 3 - this.lives));
    document.getElementById('life-icons').textContent = hearts;
  },

  setupInput() {
    let isDown = false;

    const onDown = (e) => {
      isDown = true;
      sound.unlock();
      const pos = this.getEventPos(e);
      this.bladePoints = [{ x: pos.x, y: pos.y, time: performance.now() }];
    };

    const onMove = (e) => {
      if (!isDown) return;
      const pos = this.getEventPos(e);
      const now = performance.now();
      this.bladePoints.push({ x: pos.x, y: pos.y, time: now });

      // スライスカット判定 (前回の点と現在の点の線分で判定)
      if (this.bladePoints.length >= 2) {
        const p1 = this.bladePoints[this.bladePoints.length - 2];
        const p2 = this.bladePoints[this.bladePoints.length - 1];
        this.checkSlice(p1, p2);
      }
    };

    const onUp = () => {
      isDown = false;
    };

    this.boundDown = onDown;
    this.boundMove = onMove;
    this.boundUp = onUp;

    this.canvas.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);

    this.canvas.addEventListener('touchstart', onDown, { passive: false });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
    window.addEventListener('touchcancel', onUp);
  },

  getEventPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  },

  spawnTargetGroup() {
    // 難易度に応じて1〜3個同時射出
    const count = Math.min(3, Math.floor(Math.random() * 2) + 1 + Math.floor(this.score / 25));
    for (let i = 0; i < count; i++) {
      const isBomb = Math.random() < 0.18; // 18%で爆弾
      const x = Math.random() * (this.width - 120) + 60;
      const vx = (Math.random() - 0.5) * 120;
      const vy = -(Math.random() * 120 + 580); // 上向き初速
      const radius = isBomb ? 22 : 24;

      const colors = ['#00f0ff', '#ff007f', '#ffe600', '#39ff14', '#b026ff'];
      const color = isBomb ? '#ff2a2a' : colors[Math.floor(Math.random() * colors.length)];

      this.targets.push({
        x: x,
        y: this.height + 30,
        vx: vx,
        vy: vy,
        radius: radius,
        color: color,
        isBomb: isBomb,
        rotation: 0,
        rotSpeed: (Math.random() - 0.5) * 6,
        sliced: false
      });
    }
  },

  checkSlice(p1, p2) {
    let slicedThisStroke = 0;

    for (const target of this.targets) {
      if (target.sliced) continue;

      // 線分 (p1, p2) と 円 (target.x, target.y, radius) の距離判定
      if (this.lineIntersectsCircle(p1, p2, target)) {
        target.sliced = true;

        if (target.isBomb) {
          // 爆弾を斬ってしまった！
          sound.playBomb();
          this.lives--;
          this.updateStatsUI();
          this.spawnBombExplosion(target.x, target.y);
          if (this.lives <= 0) {
            this.gameOver();
          }
          return;
        } else {
          // ターゲット切断成功！
          slicedThisStroke++;
          this.score += 1;
          this.sliceTarget(target, p1, p2);
        }
      }
    }

    if (slicedThisStroke > 0) {
      sound.playSlash();
      if (slicedThisStroke > 1) {
        // コンボボーナス！
        this.score += (slicedThisStroke - 1) * 2;
        this.showCombo(slicedThisStroke);
      }
      this.updateStatsUI();
    }
  },

  lineIntersectsCircle(p1, p2, circle) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(p1.x - circle.x, p1.y - circle.y) <= circle.radius;

    const t = Math.max(0, Math.min(1, ((circle.x - p1.x) * dx + (circle.y - p1.y) * dy) / lenSq));
    const projX = p1.x + t * dx;
    const projY = p1.y + t * dy;
    return Math.hypot(circle.x - projX, circle.y - projY) <= circle.radius;
  },

  sliceTarget(target, p1, p2) {
    // 斬撃角度
    const sliceAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    const normalAngle = sliceAngle + Math.PI / 2;
    const pushSpeed = 160;

    // まっぷたつに割れた2つの破片
    [-1, 1].forEach((dir) => {
      this.halves.push({
        x: target.x,
        y: target.y,
        vx: target.vx + Math.cos(normalAngle) * pushSpeed * dir,
        vy: target.vy * 0.5 + Math.sin(normalAngle) * pushSpeed * dir,
        radius: target.radius,
        color: target.color,
        angle: sliceAngle,
        dir: dir,
        rotation: target.rotation,
        rotSpeed: target.rotSpeed + dir * 4
      });
    });

    // スパークパーティクル
    for (let i = 0; i < 16; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = Math.random() * 260 + 80;
      this.particles.push({
        x: target.x,
        y: target.y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        color: target.color,
        size: Math.random() * 3 + 2,
        life: 0.4
      });
    }
  },

  spawnBombExplosion(x, y) {
    for (let i = 0; i < 30; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = Math.random() * 350 + 100;
      this.particles.push({
        x, y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        color: Math.random() < 0.5 ? '#ff2a2a' : '#ffe600',
        size: Math.random() * 5 + 3,
        life: 0.6
      });
    }
  },

  showCombo(count) {
    const el = document.getElementById('combo-display');
    const cntEl = document.getElementById('combo-count');
    if (el && cntEl) {
      cntEl.textContent = count;
      el.classList.remove('hidden');
      el.classList.add('pop');
      clearTimeout(this.comboTimeout);
      this.comboTimeout = setTimeout(() => {
        el.classList.add('hidden');
        el.classList.remove('pop');
      }, 700);
    }
  },

  update(dt) {
    // ターゲット生成
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnInterval = Math.max(0.6, 1.2 - (this.score / 60) * 0.4);
      this.spawnTargetGroup();
    }

    // ターゲット移動
    for (let i = this.targets.length - 1; i >= 0; i--) {
      const t = this.targets[i];
      t.x += t.vx * dt;
      t.y += t.vy * dt;
      t.vy += this.gravity * dt;
      t.rotation += t.rotSpeed * dt;

      // 画面下への落下チェック
      if (t.y > this.height + 60 && t.vy > 0) {
        if (!t.sliced && !t.isBomb) {
          // 通常コアを落としたらライフ減少
          this.lives--;
          this.updateStatsUI();
          if (this.lives <= 0) {
            this.gameOver();
          }
        }
        this.targets.splice(i, 1);
      } else if (t.sliced) {
        this.targets.splice(i, 1);
      }
    }

    // まっぷたつ破片の移動
    for (let i = this.halves.length - 1; i >= 0; i--) {
      const h = this.halves[i];
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      h.vy += this.gravity * dt;
      h.rotation += h.rotSpeed * dt;

      if (h.y > this.height + 80) {
        this.halves.splice(i, 1);
      }
    }

    // ブレード軌跡のフェードアウト (150ms以内の点のみ残す)
    const now = performance.now();
    this.bladePoints = this.bladePoints.filter(p => now - p.time < 120);

    // パーティクル
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  },

  render() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // ターゲット描画
    for (const t of this.targets) {
      this.ctx.save();
      this.ctx.translate(t.x, t.y);
      this.ctx.rotate(t.rotation);

      if (t.isBomb) {
        // 爆弾コア (ダークメタリック＋ドクロ/警告スパーク)
        this.ctx.fillStyle = '#222';
        this.ctx.shadowColor = '#ff2a2a';
        this.ctx.shadowBlur = 15;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, t.radius, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.strokeStyle = '#ff2a2a';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();

        this.ctx.fillStyle = '#ff2a2a';
        this.ctx.font = 'bold 16px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('💣', 0, 0);
      } else {
        // ネオンコア
        this.ctx.fillStyle = t.color;
        this.ctx.shadowColor = t.color;
        this.ctx.shadowBlur = 14;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, t.radius, 0, Math.PI * 2);
        this.ctx.fill();

        // コア内部の発光球
        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, t.radius * 0.45, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.restore();
    }

    // 割れた半球の描画
    for (const h of this.halves) {
      this.ctx.save();
      this.ctx.translate(h.x, h.y);
      this.ctx.rotate(h.rotation);
      this.ctx.fillStyle = h.color;
      this.ctx.shadowColor = h.color;
      this.ctx.shadowBlur = 10;

      // 半円を描画
      this.ctx.beginPath();
      this.ctx.arc(0, 0, h.radius, 0, Math.PI);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.restore();
    }
    this.ctx.shadowBlur = 0;

    // パーティクル
    for (const p of this.particles) {
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.life * 2;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1.0;

    // ネオンブレードの軌跡描画
    if (this.bladePoints.length >= 2) {
      this.renderBladeTrail();
    }
  },

  renderBladeTrail() {
    this.ctx.save();
    for (let i = 1; i < this.bladePoints.length; i++) {
      const p1 = this.bladePoints[i - 1];
      const p2 = this.bladePoints[i];
      const progress = i / this.bladePoints.length; // 新しい点ほど太い

      this.ctx.beginPath();
      this.ctx.moveTo(p1.x, p1.y);
      this.ctx.lineTo(p2.x, p2.y);

      // 外側グロー
      this.ctx.strokeStyle = '#00f0ff';
      this.ctx.lineWidth = progress * 9;
      this.ctx.lineCap = 'round';
      this.ctx.shadowColor = '#00f0ff';
      this.ctx.shadowBlur = 12;
      this.ctx.stroke();

      // 内側コア（ホワイト）
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = progress * 4;
      this.ctx.shadowBlur = 0;
      this.ctx.stroke();
    }
    this.ctx.restore();
  },

  gameOver() {
    this.running = false;
    sound.playGameOver();

    const isNew = storage.setHighScore(this.id, this.score);
    if (isNew) {
      this.highScore = this.score;
      setTimeout(() => sound.playHighScore(), 300);
    }

    const overlay = document.getElementById('game-overlay');
    document.getElementById('final-score').textContent = this.score;
    const badge = document.getElementById('new-record-badge');
    if (isNew) {
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
    overlay.classList.remove('hidden');
  },

  destroy() {
    this.running = false;
    window.removeEventListener('resize', this.resizeCanvas);
    if (this.canvas) {
      this.canvas.removeEventListener('mousedown', this.boundDown);
      window.removeEventListener('mousemove', this.boundMove);
      window.removeEventListener('mouseup', this.boundUp);
      this.canvas.removeEventListener('touchstart', this.boundDown);
      window.removeEventListener('touchmove', this.boundMove);
      window.removeEventListener('touchend', this.boundUp);
      window.removeEventListener('touchcancel', this.boundUp);
    }
  }
};
