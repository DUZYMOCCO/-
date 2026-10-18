/**
 * さんすうシューター ランナー物理＆判定エンジン
 */

import { applyGate, isGoodGate, UPGRADES, SPEEDS, DEFAULT_SPEED, START_DELAY, STREAM, gateAfterHits, WALL_GRACE } from './rules.js?v=6';

export class RunnerEngine {
  constructor(course, saveData) {
    this.course = course;
    this.saveData = saveData;

    // プレイヤー状態
    this.playerX = 0; // -0.85 〜 +0.85
    this.targetX = 0;
    this.dist = 0; // 前進距離
    this.speed = (SPEEDS[saveData.speed] || SPEEDS[DEFAULT_SPEED]).speed; // px/sec（おみせの「はやさ」で かわる）
    this.delay = START_DELAY; // はじまって すこしは とまって いる
    this.time = 0;
    this.stuck = 0; // かべの まえで うちつづけて いる じかん（びょう）

    this.bulletCount = UPGRADES.startCount.calcValue(saveData.upgrades.startCount);
    this.fireInterval = UPGRADES.fireRate.calcValue(saveData.upgrades.fireRate);
    this.bulletPower = UPGRADES.power.calcValue(saveData.upgrades.power);

    this.shootTimer = 0;
    this.bullets = [];
    this.particles = [];
    this.gateEffects = [];

    this.isFinished = false;
    this.isWallPhase = false;
    this.stopped = false;
    this.finalMult = 1.0;
    this.earnedCoins = 0;
  }

  setTargetX(normX) {
    this.targetX = Math.max(-0.85, Math.min(0.85, normX));
  }

  update(dt, onEvent) {
    if (this.stopped) return;

    // 左右移動のスムーズ補間
    this.playerX += (this.targetX - this.playerX) * Math.min(1.0, dt * 15);

    // 前進
    this.time += dt;
    if (this.delay > 0) this.delay -= dt;
    else this.dist += this.speed * dt;

    // 射撃処理
    this.shootTimer -= dt;
    if (this.shootTimer <= 0) {
      this.shootTimer = this.fireInterval;
      this.spawnBullets();
      if (onEvent) onEvent('shoot');
    }

    // 弾の更新
    const bulletSpeed = 750;
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.py = b.y;
      b.y += bulletSpeed * dt;
      // 画面外または一定距離で消滅
      if (b.y > this.dist + 650) {
        this.bullets.splice(i, 1);
      }
    }

    // ゲートを うつと かずが かわる（たまは ゲートを とおりぬける）。きりかわる おとと ぱっと ひかる
    for (const el of this.course.elements) {
      if (el.type === 'GATE_PAIR' && !el.passed) {
        for (const b of this.bullets) {
          if (!(b.py < el.y && b.y >= el.y)) continue;
          const g = b.laneNorm < 0 ? el.left : el.right;
          g.base = g.base || { type: g.type, val: g.val };
          g.hits = (g.hits || 0) + (b.w || 1);
          const n = gateAfterHits(g.base, g.hits);
          if (n.type !== g.type || n.val !== g.val) {
            g.type = n.type; g.val = n.val; g.pulse = 0.3;
            if (onEvent) onEvent('gate-grow', { gate: g });
          }
          if (this.particles.length < 140) this.addSparks(b.laneNorm, el.y);
        }
      }
      if (el.type === 'GATE_PAIR') {
        if (el.left.pulse > 0) el.left.pulse -= dt;
        if (el.right.pulse > 0) el.right.pulse -= dt;
      } else if (el.flash > 0) el.flash -= dt;
    }

    // ゲート通過判定
    for (const el of this.course.elements) {
      if (el.type === 'GATE_PAIR' && !el.passed && this.dist >= el.y) {
        el.passed = true;
        const chosenGate = this.playerX < 0 ? el.left : el.right;
        const prevCount = this.bulletCount;
        this.bulletCount = applyGate(this.bulletCount, chosenGate);
        const isGood = isGoodGate(chosenGate);

        this.gateEffects.push({
          y: el.y,
          isGood,
          text: (this.bulletCount >= prevCount ? `+${this.bulletCount - prevCount}` : `-${prevCount - this.bulletCount}`),
          life: 0.6,
        });

        if (onEvent) onEvent('gate', { gate: chosenGate, isGood });
      }
    }

    // 弾とブロックの衝突判定
    for (const el of this.course.elements) {
      if (el.type === 'BLOCK' && !el.destroyed) {
        // プレイヤーとブロックの接触（ダメージ・減速）
        if (Math.abs(this.dist - el.y) < 30 && Math.abs(this.playerX - el.laneNorm) < 0.35) {
          el.destroyed = true;
          this.bulletCount = Math.max(1, Math.floor(this.bulletCount * 0.7));
          this.addExplosion(el.laneNorm, el.y, '#ef4444');
          if (onEvent) onEvent('hit-block');
        }

        // 弾との衝突
        for (let i = this.bullets.length - 1; i >= 0; i--) {
          const b = this.bullets[i];
          if (Math.abs(b.y - el.y) < 25 && Math.abs(b.laneNorm - el.laneNorm) < 0.27) {
            this.bullets.splice(i, 1);
            el.hp -= b.power;
            el.flash = 0.1;
            if (this.particles.length < 140) this.addSparks(b.laneNorm, el.y);
            if (el.hp <= 0) {
              el.destroyed = true;
              const coins = 3 + Math.floor(el.maxHp / (5 * (this.course.hpMul || 1)));
              this.earnedCoins += coins;
              this.addExplosion(el.laneNorm, el.y, '#3b82f6');
              if (onEvent) onEvent('destroy-block', { coins });
              break;
            }
          }
        }
      }
    }

    // ゴール・倍率ウォール判定
    if (this.dist >= this.course.finishY && !this.isWallPhase) {
      this.isWallPhase = true;
      if (onEvent) onEvent('finish-line');
    }

    if (this.isWallPhase) {
      // 倍率ウォールとの弾衝突
      for (const wall of this.course.walls) {
        if (!wall.destroyed) {
          for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            if (Math.abs(b.y - wall.y) < 25) {
              this.bullets.splice(i, 1);
              wall.hp -= b.power;
              this.addSparks(b.laneNorm, wall.y);
              if (wall.hp <= 0) {
                wall.destroyed = true;
                this.stuck = 0; // こわせたら また すすめる
                this.finalMult = wall.mult;
                this.addExplosion(0, wall.y, '#fbbf24', 20);
                if (onEvent) onEvent('destroy-wall', { mult: wall.mult });
                break;
              }
            }
          }

          // こわれて いない かべに ぶつかったら そこで とまって うちつづける（すぐには おわらない）。
          // WALL_GRACE びょう たっても こわせなければ そこで おしまい（ちからが たりなかった）
          if (this.dist >= wall.y - 15) {
            this.dist = wall.y - 15;
            this.stuck += dt;
            if (this.stuck >= WALL_GRACE) {
              this.stopped = true;
              this.isFinished = true;
              if (onEvent) onEvent('clear', { finalMult: this.finalMult, earnedCoins: this.earnedCoins, cleared: this.finalMult > 1 });
            }
            break;
          }
        }
      }

      // 全ての壁を撃破してコース最奥に到達
      if (!this.stopped && this.dist >= this.course.length) {
        this.stopped = true;
        this.isFinished = true;
        this.finalMult = this.course.walls[this.course.walls.length - 1].mult;
        if (onEvent) onEvent('clear', { finalMult: this.finalMult, earnedCoins: this.earnedCoins, cleared: true });
      }
    }

    // パーティクル更新
    this.updateParticles(dt);
  }

  spawnBullets() {
    // v1.2.0 ほそい ながれ：みえる たまは 5ほんまで。ふえた ぶんは 1ぽんの いりょくに たす（ごうけいは おなじ）
    const count = this.bulletCount;
    const n = Math.min(count, STREAM.maxVisible);
    const power = this.bulletPower * count / n;
    for (let i = 0; i < n; i++) {
      this.bullets.push({
        laneNorm: this.playerX + (i - (n - 1) / 2) * STREAM.gap,
        y: this.dist + 15,
        py: this.dist + 15,
        power,
        w: 1 / n, // ゲートに あたった ときの おもみ（1かいの はっしゃ = 1）
      });
    }
  }

  addSparks(x, y) {
    for (let i = 0; i < 3; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 0.1,
        y: y + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 50,
        color: '#fef08a',
        size: 3,
        life: 0.2,
        maxLife: 0.2,
      });
    }
  }

  addExplosion(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 0.2,
        y: y + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 120,
        color,
        size: 4 + Math.random() * 3,
        life: 0.45,
        maxLife: 0.45,
      });
    }
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
    for (let i = this.gateEffects.length - 1; i >= 0; i--) {
      const g = this.gateEffects[i];
      g.life -= dt;
      if (g.life <= 0) {
        this.gateEffects.splice(i, 1);
      }
    }
  }
}
