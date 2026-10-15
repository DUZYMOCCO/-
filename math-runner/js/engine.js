/**
 * さんすうシューター ランナー物理＆判定エンジン
 */

import { applyGate, isGoodGate, UPGRADES } from './rules.js?v=1';

export class RunnerEngine {
  constructor(course, saveData) {
    this.course = course;
    this.saveData = saveData;

    // プレイヤー状態
    this.playerX = 0; // -0.85 〜 +0.85
    this.targetX = 0;
    this.dist = 0; // 前進距離
    this.speed = 260; // px/sec

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
    this.dist += this.speed * dt;

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
      b.y += bulletSpeed * dt;
      // 画面外または一定距離で消滅
      if (b.y > this.dist + 650) {
        this.bullets.splice(i, 1);
      }
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
          if (Math.abs(b.y - el.y) < 25 && Math.abs(b.laneNorm - el.laneNorm) < 0.3) {
            this.bullets.splice(i, 1);
            el.hp -= b.power;
            this.addSparks(el.laneNorm, el.y);
            if (el.hp <= 0) {
              el.destroyed = true;
              const coins = 3 + Math.floor(el.maxHp / 5);
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
                this.finalMult = wall.mult;
                this.addExplosion(0, wall.y, '#fbbf24', 20);
                if (onEvent) onEvent('destroy-wall', { mult: wall.mult });
                break;
              }
            }
          }

          // プレイヤー本体が未破壊の壁に激突したらストップ
          if (this.dist >= wall.y - 15) {
            this.stopped = true;
            this.isFinished = true;
            if (onEvent) onEvent('clear', { finalMult: this.finalMult, earnedCoins: this.earnedCoins });
            break;
          }
        }
      }

      // 全ての壁を撃破してコース最奥に到達
      if (!this.stopped && this.dist >= this.course.length) {
        this.stopped = true;
        this.isFinished = true;
        this.finalMult = this.course.walls[this.course.walls.length - 1].mult;
        if (onEvent) onEvent('clear', { finalMult: this.finalMult, earnedCoins: this.earnedCoins });
      }
    }

    // パーティクル更新
    this.updateParticles(dt);
  }

  spawnBullets() {
    // 弾数に応じた並列発射
    const count = this.bulletCount;
    // 幅を分配
    const span = Math.min(0.7, 0.08 * (count - 1));
    for (let i = 0; i < count; i++) {
      const offset = count === 1 ? 0 : -span / 2 + (span / (count - 1)) * i;
      this.bullets.push({
        laneNorm: this.playerX + offset,
        y: this.dist + 15,
        power: this.bulletPower,
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
