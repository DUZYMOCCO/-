/**
 * さんすうシューター レンダラー
 * 爽快なレーン、ゲート、ブロック、弾幕、マズルフラッシュの描画
 */

import { getGateText, isGoodGate } from './rules.js?v=2';

export class RunnerRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  render(engine, logicalWidth, logicalHeight) {
    const ctx = this.ctx;
    const dpr = window.devicePixelRatio || 1;
    const w = logicalWidth || (this.canvas.width / dpr);
    const h = logicalHeight || (this.canvas.height / dpr);

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // コース背景（未来感のあるクリーンなストライプレーザー）
    this.drawTrack(w, h, engine.dist);

    // コース要素（奥から手前へ描画）
    this.drawCourseElements(w, h, engine);

    // 弾丸の描画
    this.drawBullets(w, h, engine);

    // プレイヤー（銃）の描画
    this.drawPlayer(w, h, engine);

    // パーティクルの描画
    this.drawParticles(w, h, engine);

    // ゲート通過エフェクト
    this.drawGateEffects(w, h, engine);

    ctx.restore();
  }

  drawTrack(w, h, dist) {
    const ctx = this.ctx;
    // 背景グラデーション
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#0f172a');
    bgGrad.addColorStop(1, '#1e293b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // レーン境界線
    const laneWidth = w * 0.82;
    const leftX = (w - laneWidth) / 2;
    const rightX = leftX + laneWidth;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(leftX, 0);
    ctx.lineTo(leftX, h);
    ctx.moveTo(rightX, 0);
    ctx.lineTo(rightX, h);
    ctx.stroke();

    // 中央仕切り線（点線）
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 2;
    ctx.setLineDash([16, 16]);
    ctx.lineDashOffset = -dist % 32;
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  worldToScreen(w, h, normX, worldY, playerDist) {
    const laneWidth = w * 0.82;
    const screenX = w / 2 + normX * (laneWidth / 2);
    // プレイヤーの位置を画面下部 (h * 0.82) に配置
    const playerScreenY = h * 0.82;
    const screenY = playerScreenY - (worldY - playerDist);
    return { x: screenX, y: screenY };
  }

  drawCourseElements(w, h, engine) {
    const ctx = this.ctx;
    const laneWidth = w * 0.82;

    // ゲートとブロック
    for (const el of engine.course.elements) {
      if (el.type === 'GATE_PAIR') {
        const p = this.worldToScreen(w, h, 0, el.y, engine.dist);
        if (p.y > -80 && p.y < h + 80) {
          this.drawGatePair(ctx, w, p.y, el, laneWidth);
        }
      } else if (el.type === 'BLOCK' && !el.destroyed) {
        const p = this.worldToScreen(w, h, el.laneNorm, el.y, engine.dist);
        if (p.y > -60 && p.y < h + 60) {
          this.drawBlock(ctx, p.x, p.y, el);
        }
      }
    }

    // ゴールライン
    const finishPos = this.worldToScreen(w, h, 0, engine.course.finishY, engine.dist);
    if (finishPos.y > -50 && finishPos.y < h + 50) {
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect((w - laneWidth) / 2, finishPos.y - 8, laneWidth, 16);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🏁 GOAL 🏁', w / 2, finishPos.y + 4);
    }

    // 倍率ウォール
    for (const wall of engine.course.walls) {
      if (!wall.destroyed) {
        const p = this.worldToScreen(w, h, 0, wall.y, engine.dist);
        if (p.y > -80 && p.y < h + 80) {
          this.drawWall(ctx, w / 2, p.y, wall, laneWidth);
        }
      }
    }
  }

  drawGatePair(ctx, w, y, gatePair, laneWidth) {
    const half = laneWidth / 2;
    const gateW = half - 6;
    const gateH = 46;

    // 左ゲート
    const lx = w / 2 - half + 3;
    this.drawSingleGate(ctx, lx, y - gateH / 2, gateW, gateH, gatePair.left);

    // 右ゲート
    const rx = w / 2 + 3;
    this.drawSingleGate(ctx, rx, y - gateH / 2, gateW, gateH, gatePair.right);
  }

  drawSingleGate(ctx, x, y, w, h, gate) {
    const isGood = isGoodGate(gate);
    const mainColor = isGood ? '#3b82f6' : '#ef4444';
    const bgGrad = ctx.createLinearGradient(x, y, x, y + h);
    bgGrad.addColorStop(0, isGood ? 'rgba(59, 130, 246, 0.85)' : 'rgba(239, 68, 68, 0.85)');
    bgGrad.addColorStop(1, isGood ? 'rgba(29, 78, 216, 0.95)' : 'rgba(185, 28, 28, 0.95)');

    ctx.save();
    ctx.shadowColor = mainColor;
    ctx.shadowBlur = 10;
    ctx.fillStyle = bgGrad;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // ゲート文字
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(getGateText(gate), x + w / 2, y + h / 2);
  }

  drawBlock(ctx, x, y, block) {
    const bw = 54;
    const bh = 34;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;

    // HPに応じたカラー（赤〜紫〜黄色）
    ctx.fillStyle = '#e11d48';
    ctx.strokeStyle = '#fecdd3';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x - bw / 2, y - bh / 2, bw, bh, 8);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // HP表示
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(block.hp, x, y);
  }

  drawWall(ctx, cx, y, wall, laneWidth) {
    const ww = laneWidth - 20;
    const wh = 42;

    const colors = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
    const color = colors[Math.floor(wall.mult) % colors.length];

    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(cx - ww / 2, y - wh / 2, ww, wh, 10);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 倍率文字とHP
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 18px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`×${wall.mult}  [${wall.hp}]`, cx, y);
  }

  drawBullets(w, h, engine) {
    const ctx = this.ctx;
    ctx.save();
    for (const b of engine.bullets) {
      const p = this.worldToScreen(w, h, b.laneNorm, b.y, engine.dist);
      if (p.y > -20 && p.y < h) {
        ctx.fillStyle = '#fbbf24';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 4, 9, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  drawPlayer(w, h, engine) {
    const ctx = this.ctx;
    const p = this.worldToScreen(w, h, engine.playerX, engine.dist, engine.dist);

    ctx.save();
    ctx.translate(p.x, p.y);

    // 銃の描画（コミカルなブラスターキャノン）
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;

    // 銃身
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-8, -26, 16, 20);
    // マズル
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(-10, -32, 20, 8);
    // 本体
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(-16, -10, 32, 24, 6);
    ctx.fill();

    // 弾数バッジ（頭上に大きく表示）
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 4;
    ctx.font = '900 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`x${engine.bulletCount}`, 0, -42);

    ctx.restore();
  }

  drawParticles(w, h, engine) {
    const ctx = this.ctx;
    for (const p of engine.particles) {
      const sp = this.worldToScreen(w, h, p.x, p.y, engine.dist);
      ctx.save();
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawGateEffects(w, h, engine) {
    const ctx = this.ctx;
    for (const g of engine.gateEffects) {
      const sp = this.worldToScreen(w, h, 0, g.y, engine.dist);
      ctx.save();
      ctx.font = '900 24px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = g.isGood ? '#60a5fa' : '#f87171';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 6;
      ctx.globalAlpha = g.life / 0.6;
      ctx.fillText(g.text, w / 2, sp.y - 30);
      ctx.restore();
    }
  }
}
