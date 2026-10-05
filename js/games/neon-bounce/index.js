/**
 * ゲーム1: NEON BOUNCE (ネオン・バウンス)
 * 指で狙って放つ！ボールが乱反射してブロックを砕く爽快アクションパズル
 */
import { sound } from '../../audio.js';
import { storage } from '../../storage.js';

export const NeonBounceGame = {
  id: 'neon-bounce',
  title: 'NEON BOUNCE',
  subtitle: 'ブロック・バスター',
  icon: '⚡',
  color: '#00f0ff',
  description: 'スワイプで狙いを定めて発射！壁やブロックを乱反射させて一網打尽にせよ。',

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
              <span id="current-score" class="stat-value">1</span>
            </div>
            <div class="stat-box">
              <span class="stat-label">BEST</span>
              <span id="high-score" class="stat-value">${this.highScore}</span>
            </div>
            <div class="stat-box">
              <span class="stat-label">BALLS</span>
              <span id="ball-count" class="stat-value">1</span>
            </div>
          </div>
          <button id="btn-retry" class="icon-btn" title="リトライ">🔄</button>
        </header>

        <div class="canvas-container" id="canvas-container">
          <canvas id="game-canvas"></canvas>
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

    // リサイズハンドラ
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

    // タッチ＆マウス操作
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
    this.score = 1;
    this.maxBalls = 1;
    this.balls = [];
    this.launchQueue = 0;
    this.launchTimer = 0;
    this.launchInterval = 0.04; // ボール発射間隔
    this.isLaunching = false;
    this.aiming = false;
    this.aimAngle = -Math.PI / 2;
    this.basePos = { x: this.width / 2, y: this.height - 30 };
    this.nextBasePos = null;
    this.combo = 0;

    // グリッド定義 (横7列)
    this.cols = 7;
    this.gridYOffset = 40;
    this.cellMargin = 4;
    this.blocks = [];
    this.particles = [];
    this.items = [];

    this.updateStatsUI();
    // 最初の行を生成
    this.spawnRow();
  },

  updateStatsUI() {
    document.getElementById('current-score').textContent = this.score;
    document.getElementById('ball-count').textContent = this.maxBalls;
    document.getElementById('high-score').textContent = this.highScore;
  },

  spawnRow() {
    // 既存ブロックを1段下げる
    const cellW = (this.width - 20) / this.cols;
    const cellH = cellW * 0.85;

    let hitBottom = false;
    for (const b of this.blocks) {
      b.row += 1;
      b.targetY = this.gridYOffset + b.row * cellH;
      if (b.row >= 9) { // 下限到達
        hitBottom = true;
      }
    }

    for (const item of this.items) {
      item.row += 1;
      item.targetY = this.gridYOffset + item.row * cellH + cellH / 2;
    }

    if (hitBottom) {
      this.gameOver();
      return;
    }

    // 新しい行（row=0）の生成
    // 空白マスとブロック、アイテムをランダム配置
    const emptyCount = Math.floor(Math.random() * 3) + 1;
    const occupied = new Set();
    while (occupied.size < emptyCount) {
      occupied.add(Math.floor(Math.random() * this.cols));
    }

    let addedItem = false;
    for (let c = 0; c < this.cols; c++) {
      if (occupied.has(c)) {
        // アイテム配置チャンス
        if (!addedItem && Math.random() < 0.6) {
          const type = Math.random() < 0.6 ? 'ball' : (Math.random() < 0.5 ? 'laser' : 'bomb');
          this.items.push({
            col: c,
            row: 0,
            x: 10 + c * cellW + cellW / 2,
            y: this.gridYOffset - cellH / 2,
            targetY: this.gridYOffset + cellH / 2,
            type: type,
            pulse: 0
          });
          addedItem = true;
        }
        continue;
      }

      // ブロック生成 (現在のスコアに応じた耐久値)
      const hp = Math.random() < 0.25 ? this.score * 2 : this.score;
      this.blocks.push({
        col: c,
        row: 0,
        x: 10 + c * cellW + this.cellMargin,
        y: this.gridYOffset - cellH + this.cellMargin,
        targetY: this.gridYOffset + this.cellMargin,
        w: cellW - this.cellMargin * 2,
        h: cellH - this.cellMargin * 2,
        hp: hp,
        maxHp: hp,
        hitPulse: 0
      });
    }
  },

  setupInput() {
    let startX = 0;
    let startY = 0;
    let isDown = false;

    const onPointerDown = (e) => {
      if (this.isLaunching || this.launchQueue > 0 || this.balls.length > 0) return;
      isDown = true;
      sound.unlock();
      const pos = this.getEventPos(e);
      startX = pos.x;
      startY = pos.y;
      this.aiming = true;
      this.updateAim(pos.x, pos.y);
    };

    const onPointerMove = (e) => {
      if (!isDown || !this.aiming) return;
      const pos = this.getEventPos(e);
      this.updateAim(pos.x, pos.y);
    };

    const onPointerUp = (e) => {
      if (!isDown) return;
      isDown = false;
      if (this.aiming) {
        this.aiming = false;
        // 上向きの角度のみ発射許可 (-10度〜-170度)
        if (this.aimAngle < -0.15 && this.aimAngle > -Math.PI + 0.15) {
          this.startLaunch();
        }
      }
    };

    this.boundDown = onPointerDown;
    this.boundMove = onPointerMove;
    this.boundUp = onPointerUp;

    this.canvas.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    this.canvas.addEventListener('touchstart', onPointerDown, { passive: false });
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);
    window.addEventListener('touchcancel', onPointerUp);
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

  updateAim(tx, ty) {
    const dx = tx - this.basePos.x;
    const dy = ty - this.basePos.y;
    // スワイプ方向への逆引き（パチンコ風ではなく、指でスワイプした先または引っ張り方向）
    // 直感的な「指の方向に飛ぶ」操作
    let angle = Math.atan2(dy, dx);
    // 画面下を触っている場合、上に向かって引っ張るか、あるいは直接方向指定
    if (angle > 0) angle = -angle; // 下向きなら上向きに反転
    // 角度をクランプ (-165度 〜 -15度)
    angle = Math.max(-Math.PI + 0.2, Math.min(-0.2, angle));
    this.aimAngle = angle;
  },

  startLaunch() {
    this.isLaunching = true;
    this.launchQueue = this.maxBalls;
    this.launchTimer = 0;
    this.nextBasePos = null;
    this.combo = 0;
    sound.playLaunch();
  },

  update(dt) {
    // スムーズなY位置アニメーション
    for (const b of this.blocks) {
      if (b.y < b.targetY) {
        b.y += (b.targetY - b.y) * 0.2;
      }
      if (b.hitPulse > 0) b.hitPulse -= dt * 4;
    }
    for (const item of this.items) {
      if (item.y < item.targetY) {
        item.y += (item.targetY - item.y) * 0.2;
      }
      item.pulse = (item.pulse + dt * 4) % (Math.PI * 2);
    }

    // ボール発射キューの処理
    if (this.launchQueue > 0) {
      this.launchTimer += dt;
      if (this.launchTimer >= this.launchInterval) {
        this.launchTimer = 0;
        this.launchQueue--;

        const speed = 720; // 爽快な高速スピード
        this.balls.push({
          x: this.basePos.x,
          y: this.basePos.y,
          vx: Math.cos(this.aimAngle) * speed,
          vy: Math.sin(this.aimAngle) * speed,
          radius: 5,
          active: true
        });
      }
    }

    // ボール移動＆衝突判定
    const subSteps = 3; // 高速ボールのすり抜け防止
    const subDt = dt / subSteps;

    for (let step = 0; step < subSteps; step++) {
      for (let i = this.balls.length - 1; i >= 0; i--) {
        const ball = this.balls[i];
        if (!ball.active) continue;

        ball.x += ball.vx * subDt;
        ball.y += ball.vy * subDt;

        // 壁との衝突 (左右)
        if (ball.x - ball.radius <= 0) {
          ball.x = ball.radius;
          ball.vx = Math.abs(ball.vx);
          sound.playHit(0);
        } else if (ball.x + ball.radius >= this.width) {
          ball.x = this.width - ball.radius;
          ball.vx = -Math.abs(ball.vx);
          sound.playHit(0);
        }

        // 天井との衝突
        if (ball.y - ball.radius <= 0) {
          ball.y = ball.radius;
          ball.vy = Math.abs(ball.vy);
          sound.playHit(0);
        }

        // 底面（地面）への帰還
        if (ball.y + ball.radius >= this.height - 25) {
          ball.active = false;
          if (!this.nextBasePos) {
            this.nextBasePos = { x: Math.max(20, Math.min(this.width - 20, ball.x)), y: this.height - 30 };
          }
          continue;
        }

        // アイテムとの当たり判定
        for (let j = this.items.length - 1; j >= 0; j--) {
          const item = this.items[j];
          const dist = Math.hypot(ball.x - item.x, ball.y - item.y);
          if (dist < ball.radius + 14) {
            this.triggerItem(item);
            this.items.splice(j, 1);
          }
        }

        // ブロックとの当たり判定 (AABB)
        for (let bIndex = this.blocks.length - 1; bIndex >= 0; bIndex--) {
          const b = this.blocks[bIndex];
          if (this.checkBallBlockCollision(ball, b)) {
            b.hp--;
            b.hitPulse = 1;
            this.combo++;
            sound.playHit(this.combo);
            this.spawnSpark(ball.x, ball.y, '#00f0ff');

            if (b.hp <= 0) {
              sound.playBreak();
              this.spawnBlockDebris(b);
              this.blocks.splice(bIndex, 1);
            }
            break; // 1ステップ1ブロック
          }
        }
      }
    }

    // アクティブなボールの有無チェック
    const remainingBalls = this.balls.filter(b => b.active);
    if (this.isLaunching && this.launchQueue === 0 && remainingBalls.length === 0) {
      // ターン終了！
      this.isLaunching = false;
      this.balls = [];
      if (this.nextBasePos) {
        this.basePos = { ...this.nextBasePos };
      }
      this.score++;
      this.updateStatsUI();
      this.spawnRow();
    }

    // パーティクル更新
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

  checkBallBlockCollision(ball, b) {
    const closestX = Math.max(b.x, Math.min(ball.x, b.x + b.w));
    const closestY = Math.max(b.y, Math.min(ball.y, b.y + b.h));
    const distX = ball.x - closestX;
    const distY = ball.y - closestY;
    const distanceSq = distX * distX + distY * distY;

    if (distanceSq < ball.radius * ball.radius) {
      // 反射角度の計算
      const overlapLeft = (ball.x + ball.radius) - b.x;
      const overlapRight = (b.x + b.w) - (ball.x - ball.radius);
      const overlapTop = (ball.y + ball.radius) - b.y;
      const overlapBottom = (b.y + b.h) - (ball.y - ball.radius);

      const minOverlapX = Math.min(overlapLeft, overlapRight);
      const minOverlapY = Math.min(overlapTop, overlapBottom);

      if (minOverlapX < minOverlapY) {
        ball.vx = -ball.vx;
        ball.x += ball.vx > 0 ? minOverlapX : -minOverlapX;
      } else {
        ball.vy = -ball.vy;
        ball.y += ball.vy > 0 ? minOverlapY : -minOverlapY;
      }
      return true;
    }
    return false;
  },

  triggerItem(item) {
    if (item.type === 'ball') {
      sound.playItem();
      this.maxBalls++;
      this.updateStatsUI();
      this.spawnSpark(item.x, item.y, '#39ff14');
    } else if (item.type === 'laser') {
      sound.playLaser();
      this.spawnSpark(item.x, item.y, '#ff007f');
      // 同じ行のブロックを全破壊
      for (let i = this.blocks.length - 1; i >= 0; i--) {
        if (this.blocks[i].row === item.row) {
          this.spawnBlockDebris(this.blocks[i]);
          this.blocks.splice(i, 1);
        }
      }
    } else if (item.type === 'bomb') {
      sound.playBomb();
      this.spawnSpark(item.x, item.y, '#ffe600');
      // 周囲マスを破壊
      for (let i = this.blocks.length - 1; i >= 0; i--) {
        const b = this.blocks[i];
        if (Math.abs(b.col - item.col) <= 1 && Math.abs(b.row - item.row) <= 1) {
          this.spawnBlockDebris(b);
          this.blocks.splice(i, 1);
        }
      }
    }
  },

  spawnSpark(x, y, color) {
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 150 + 50;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: color,
        size: Math.random() * 3 + 2,
        life: 0.3
      });
    }
  },

  spawnBlockDebris(b) {
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 200 + 80;
      this.particles.push({
        x: b.x + b.w / 2,
        y: b.y + b.h / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: this.getBlockColor(b.hp, b.maxHp),
        size: Math.random() * 4 + 2,
        life: 0.5
      });
    }
  },

  getBlockColor(hp, maxHp) {
    // 耐久値に応じて鮮やかに変化 (シアン -> グリーン -> イエロー -> ピンク -> マゼンタ)
    const ratio = Math.min(hp / Math.max(this.score, 1), 2);
    if (ratio <= 0.6) return '#00f0ff'; // ネオンシアン
    if (ratio <= 1.0) return '#39ff14'; // ネオングリーン
    if (ratio <= 1.5) return '#ffe600'; // ネオンイエロー
    return '#ff007f';                   // ネオンピンク
  },

  render() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // 背景の微細グリッド
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    this.ctx.lineWidth = 1;
    const gridSpacing = 30;
    for (let x = 0; x < this.width; x += gridSpacing) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.height);
      this.ctx.stroke();
    }

    // デッドライン警告線（底面手前）
    const deadLineY = this.height - 80;
    this.ctx.setLineDash([6, 6]);
    this.ctx.strokeStyle = 'rgba(255, 0, 80, 0.4)';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.moveTo(0, deadLineY);
    this.ctx.lineTo(this.width, deadLineY);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // ブロック描画
    for (const b of this.blocks) {
      const col = this.getBlockColor(b.hp, b.maxHp);
      this.ctx.fillStyle = col;
      this.ctx.shadowColor = col;
      this.ctx.shadowBlur = b.hitPulse > 0 ? 15 : 6;

      const scale = 1 + (b.hitPulse > 0 ? b.hitPulse * 0.08 : 0);
      const cx = b.x + b.w / 2;
      const cy = b.y + b.h / 2;

      this.ctx.save();
      this.ctx.translate(cx, cy);
      this.ctx.scale(scale, scale);

      // 角丸長方形
      this.drawRoundedRect(-b.w / 2, -b.h / 2, b.w, b.h, 6);
      this.ctx.fill();

      // 数字描画
      this.ctx.shadowBlur = 0;
      this.ctx.fillStyle = '#0a0d14';
      this.ctx.font = 'bold 15px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(b.hp, 0, 1);
      this.ctx.restore();
    }
    this.ctx.shadowBlur = 0;

    // アイテム描画
    for (const item of this.items) {
      this.ctx.save();
      this.ctx.translate(item.x, item.y);
      const pulseScale = 1 + Math.sin(item.pulse) * 0.15;
      this.ctx.scale(pulseScale, pulseScale);

      if (item.type === 'ball') {
        this.ctx.fillStyle = '#39ff14';
        this.ctx.shadowColor = '#39ff14';
        this.ctx.shadowBlur = 10;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 10, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#000';
        this.ctx.font = 'bold 11px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('+1', 0, 0);
      } else if (item.type === 'laser') {
        this.ctx.fillStyle = '#ff007f';
        this.ctx.shadowColor = '#ff007f';
        this.ctx.shadowBlur = 10;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 11, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 10px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('⚡', 0, 0);
      } else if (item.type === 'bomb') {
        this.ctx.fillStyle = '#ffe600';
        this.ctx.shadowColor = '#ffe600';
        this.ctx.shadowBlur = 10;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 11, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#000';
        this.ctx.font = 'bold 10px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('💥', 0, 0);
      }
      this.ctx.restore();
    }

    // パーティクル描画
    for (const p of this.particles) {
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.life * 2;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1.0;

    // 発射予測レーザーライン (エイム時)
    if (this.aiming && !this.isLaunching) {
      this.renderAimLine();
    }

    // ボール本体の描画
    this.ctx.fillStyle = '#ffffff';
    this.ctx.shadowColor = '#00f0ff';
    this.ctx.shadowBlur = 8;
    for (const ball of this.balls) {
      if (!ball.active) continue;
      this.ctx.beginPath();
      this.ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // 発射台（ベースポインタ）
    this.ctx.fillStyle = '#00f0ff';
    this.ctx.shadowColor = '#00f0ff';
    this.ctx.shadowBlur = 12;
    this.ctx.beginPath();
    this.ctx.arc(this.basePos.x, this.basePos.y, 8, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.shadowBlur = 0;
  },

  renderAimLine() {
    this.ctx.save();
    this.ctx.setLineDash([4, 6]);
    this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.8)';
    this.ctx.lineWidth = 2;

    const maxLen = 350;
    const endX = this.basePos.x + Math.cos(this.aimAngle) * maxLen;
    const endY = this.basePos.y + Math.sin(this.aimAngle) * maxLen;

    this.ctx.beginPath();
    this.ctx.moveTo(this.basePos.x, this.basePos.y);
    this.ctx.lineTo(endX, endY);
    this.ctx.stroke();

    // 照準先のポインタサークル
    this.ctx.setLineDash([]);
    this.ctx.fillStyle = '#00f0ff';
    this.ctx.beginPath();
    this.ctx.arc(endX, endY, 4, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  },

  drawRoundedRect(x, y, w, h, r) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
    this.ctx.closePath();
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
