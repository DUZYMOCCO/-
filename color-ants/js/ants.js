/**
 * カラー・アント アリ軍団シミュレーション
 * アリの自律AI、咀嚼処理、パーティクル、コインポップアップ
 */

import { COLOR_GROUPS } from './stages.js?v=1';
import { UPGRADE_DEFS } from './upgrades.js?v=1';

export class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  addCrumb(x, y, color) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 20 + Math.random() * 40;
    this.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      size: 2 + Math.random() * 2,
      life: 0.35 + Math.random() * 0.25,
      maxLife: 0.6,
    });
  }

  addCoinText(x, y, amount) {
    this.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 15,
      vy: -50 - Math.random() * 20,
      text: `+${amount}`,
      color: '#fbbf24',
      size: 14,
      isText: true,
      life: 0.7,
      maxLife: 0.7,
    });
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }
}

export class AntSimulation {
  constructor(canvasWidth, canvasHeight) {
    this.width = canvasWidth;
    this.height = canvasHeight;
    this.ants = [];
    this.particles = new ParticleSystem();
    this.frenzyTimer = 0; // ブーストタイマー
    this.nestPos = { x: canvasWidth / 2, y: canvasHeight - 30 }; // 画面下の巣穴
  }

  resize(w, h) {
    this.width = w;
    this.height = h;
    this.nestPos = { x: w / 2, y: h - 30 };
  }

  triggerTapBoost() {
    // タップでブーストをチャージ（最大2秒までストック）
    this.frenzyTimer = Math.min(2.0, this.frenzyTimer + 0.5);
  }

  get isFrenzy() {
    return this.frenzyTimer > 0;
  }

  syncAntCount(saveData) {
    const targetCount = UPGRADE_DEFS.count.calcValue(saveData.upgrades.count);
    const unlocked = saveData.unlockedColors;
    const giantProb = UPGRADE_DEFS.giant.calcValue(saveData.upgrades.giant);

    // 不足分を追加
    while (this.ants.length < targetCount) {
      const colorGroup = unlocked[Math.floor(Math.random() * unlocked.length)];
      const isGiant = Math.random() < giantProb;
      this.ants.push(this.createAnt(colorGroup, isGiant));
    }
    // 余剰分を削減
    if (this.ants.length > targetCount) {
      this.ants.length = targetCount;
    }
  }

  createAnt(colorGroup, isGiant = false) {
    return {
      x: this.nestPos.x + (Math.random() - 0.5) * 40,
      y: this.nestPos.y + (Math.random() - 0.5) * 10,
      targetPixel: null,
      colorGroup,
      isGiant,
      size: isGiant ? 9 : 4.5,
      angle: -Math.PI / 2,
      legPhase: Math.random() * Math.PI * 2,
      eatTimer: 0,
      state: 'SEEKING', // 'SEEKING' | 'EATING'
    };
  }

  update(dt, pixels, gridInfo, saveData, onPixelEaten) {
    if (this.frenzyTimer > 0) {
      this.frenzyTimer = Math.max(0, this.frenzyTimer - dt);
    }
    const frenzyMult = this.isFrenzy ? 2.5 : 1.0;
    const speed = UPGRADE_DEFS.speed.calcValue(saveData.upgrades.speed) * frenzyMult;
    const bitePower = UPGRADE_DEFS.power.calcValue(saveData.upgrades.power) * (this.isFrenzy ? 1.5 : 1.0);

    // アリの補充・整合
    this.syncAntCount(saveData);

    // アリの行動更新
    for (const ant of this.ants) {
      // 巨大アリのステータス倍率
      const antPower = ant.isGiant ? bitePower * 3 : bitePower;
      const antSpeed = ant.isGiant ? speed * 0.8 : speed;

      // ターゲットの有効性チェック
      if (ant.targetPixel && ant.targetPixel.eaten) {
        ant.targetPixel = null;
        ant.state = 'SEEKING';
      }

      // ターゲット探索
      if (!ant.targetPixel) {
        ant.targetPixel = this.findBestTarget(ant, pixels, gridInfo);
      }

      if (ant.targetPixel) {
        const dest = this.getPixelWorldPos(ant.targetPixel, gridInfo);
        const dx = dest.x - ant.x;
        const dy = dest.y - ant.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 8) {
          // 移動
          ant.state = 'SEEKING';
          const moveDist = Math.min(dist, antSpeed * dt);
          ant.angle = Math.atan2(dy, dx);
          ant.x += Math.cos(ant.angle) * moveDist;
          ant.y += Math.sin(ant.angle) * moveDist;
          ant.legPhase += dt * 25 * frenzyMult;
        } else {
          // 到着・咀嚼
          ant.state = 'EATING';
          ant.legPhase += dt * 10 * frenzyMult;
          ant.eatTimer += dt * frenzyMult;

          if (ant.eatTimer >= 0.25) {
            ant.eatTimer = 0;
            // 咀嚼実行
            this.particles.addCrumb(dest.x, dest.y, ant.targetPixel.hex);
            ant.targetPixel.hp -= antPower;

            // 周囲のピクセルも削る（ジャイアント）
            if (ant.isGiant) {
              this.splashDamage(ant.targetPixel, pixels, gridInfo, antPower * 0.5);
            }

            if (ant.targetPixel.hp <= 0 && !ant.targetPixel.eaten) {
              ant.targetPixel.eaten = true;
              const coinVal = ant.colorGroup === 'rainbow' ? 4 : 2;
              this.particles.addCoinText(dest.x, dest.y - 10, coinVal);
              onPixelEaten(ant.targetPixel, coinVal);
              ant.targetPixel = null;
              ant.state = 'SEEKING';
            }
          }
        }
      } else {
        // 対象ピクセルがない場合、巣の周りをうろうろ
        const dx = this.nestPos.x - ant.x;
        const dy = this.nestPos.y - ant.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 30) {
          ant.angle = Math.atan2(dy, dx);
          ant.x += Math.cos(ant.angle) * antSpeed * 0.5 * dt;
          ant.y += Math.sin(ant.angle) * antSpeed * 0.5 * dt;
          ant.legPhase += dt * 10;
        }
      }
    }

    // パーティクル更新
    this.particles.update(dt);
  }

  getPixelWorldPos(pixel, gridInfo) {
    const { startX, startY, cellSize } = gridInfo;
    return {
      x: startX + (pixel.gx + 0.5) * cellSize,
      y: startY + (pixel.gy + 0.5) * cellSize,
    };
  }

  findBestTarget(ant, pixels, gridInfo) {
    let nearest = null;
    let minDist = Infinity;

    for (const p of pixels) {
      if (p.eaten) continue;
      // 担当色チェック（にじいろアリなら全色OK）
      if (ant.colorGroup !== 'rainbow' && p.group !== ant.colorGroup) continue;

      const pos = this.getPixelWorldPos(p, gridInfo);
      const dist = Math.hypot(pos.x - ant.x, pos.y - ant.y);
      if (dist < minDist) {
        minDist = dist;
        nearest = p;
      }
    }
    return nearest;
  }

  splashDamage(centerPixel, pixels, gridInfo, power) {
    for (const p of pixels) {
      if (p.eaten || p === centerPixel) continue;
      if (Math.abs(p.gx - centerPixel.gx) <= 1 && Math.abs(p.gy - centerPixel.gy) <= 1) {
        p.hp -= power;
        const pos = this.getPixelWorldPos(p, gridInfo);
        this.particles.addCrumb(pos.x, pos.y, p.hex);
        if (p.hp <= 0) {
          p.eaten = true;
          this.particles.addCoinText(pos.x, pos.y - 10, 1);
        }
      }
    }
  }
}
