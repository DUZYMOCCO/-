/**
 * カラー・アント Canvas レンダラー
 * かわいいピクセルアート、ワラワラ動くアリ、咀嚼・コイン演出の描画
 */

import { COLOR_GROUPS } from './stages.js?v=2';

export class AntRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  render(sim, pixels, gridInfo, saveData, logicalWidth, logicalHeight) {
    const ctx = this.ctx;
    const dpr = window.devicePixelRatio || 1;
    const w = logicalWidth || (this.canvas.width / dpr);
    const h = logicalHeight || (this.canvas.height / dpr);

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // 背景：やさしい方眼ペーパー風
    this.drawBackground(w, h);

    // ピクセルアートの描画
    this.drawPixels(pixels, gridInfo);

    // アリの巣穴の描画
    this.drawNest(sim.nestPos.x, sim.nestPos.y);

    // アリたちの描画
    for (const ant of sim.ants) {
      this.drawAnt(ant);
    }

    // パーティクル＆コインテキスト描画
    this.drawParticles(sim.particles);

    // フレンジー（ブースト）時の画面演出
    if (sim.isFrenzy) {
      this.drawFrenzyVignette(w, h, sim.frenzyTimer);
    }

    ctx.restore();
  }

  drawBackground(w, h) {
    const ctx = this.ctx;
    ctx.fillStyle = '#fdfbf7';
    ctx.fillRect(0, 0, w, h);

    // 淡いドットグリッド
    ctx.fillStyle = '#e2e8f0';
    const step = 24;
    for (let x = step / 2; x < w; x += step) {
      for (let y = step / 2; y < h; y += step) {
        ctx.fillRect(x, y, 1.5, 1.5);
      }
    }
  }

  drawPixels(pixels, gridInfo) {
    const ctx = this.ctx;
    const { startX, startY, cellSize } = gridInfo;
    const pad = 1.5;

    // 台座（キャンバス風の影と枠）
    const totalSize = cellSize * 12;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.06)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(startX - 8, startY - 8, totalSize + 16, totalSize + 16, 12);
    ctx.fill();
    ctx.restore();

    for (const p of pixels) {
      const px = startX + p.gx * cellSize;
      const py = startY + p.gy * cellSize;

      if (p.eaten) {
        // 食べられた跡（薄い点線または空マス）
        ctx.fillStyle = 'rgba(0,0,0,0.03)';
        ctx.fillRect(px + pad, py + pad, cellSize - pad * 2, cellSize - pad * 2);
        continue;
      }

      ctx.fillStyle = p.hex;
      ctx.beginPath();
      ctx.roundRect(px + pad, py + pad, cellSize - pad * 2, cellSize - pad * 2, 3);
      ctx.fill();

      // ダメージ（削れ）表現
      if (p.hp < p.maxHp) {
        const damageRatio = 1 - (p.hp / p.maxHp);
        ctx.fillStyle = `rgba(255,255,255,${damageRatio * 0.5})`;
        ctx.fillRect(px + pad, py + pad, cellSize - pad * 2, cellSize - pad * 2);
      }
    }
  }

  drawNest(x, y) {
    const ctx = this.ctx;
    // 巣穴の土盛り
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.ellipse(x, y + 4, 32, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // 穴
    ctx.fillStyle = '#451a03';
    ctx.beginPath();
    ctx.ellipse(x, y + 2, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  drawAnt(ant) {
    const ctx = this.ctx;
    const group = COLOR_GROUPS[ant.colorGroup.toUpperCase()] || COLOR_GROUPS.RED;
    const bodyColor = group.antColor;
    const headColor = group.headColor;
    const r = ant.size;

    ctx.save();
    ctx.translate(ant.x, ant.y);
    ctx.rotate(ant.angle);

    // 足（6本）
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = ant.isGiant ? 2.5 : 1.2;
    const legSwing = Math.sin(ant.legPhase) * (r * 0.5);

    ctx.beginPath();
    // 前足
    ctx.moveTo(0, -r * 0.5);
    ctx.lineTo(r * 0.8 + legSwing, -r * 1.2);
    ctx.moveTo(0, r * 0.5);
    ctx.lineTo(r * 0.8 - legSwing, r * 1.2);
    // 中足
    ctx.moveTo(-r * 0.4, -r * 0.5);
    ctx.lineTo(-r * 0.4 - legSwing, -r * 1.3);
    ctx.moveTo(-r * 0.4, r * 0.5);
    ctx.lineTo(-r * 0.4 + legSwing, r * 1.3);
    // 後足
    ctx.moveTo(-r * 1.0, -r * 0.4);
    ctx.lineTo(-r * 1.5 + legSwing, -r * 1.2);
    ctx.moveTo(-r * 1.0, r * 0.4);
    ctx.lineTo(-r * 1.5 - legSwing, r * 1.2);
    ctx.stroke();

    // 腹部（Abdomen）
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(-r * 1.2, 0, r * 1.1, r * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();

    // 胸部（Thorax）
    ctx.fillStyle = headColor;
    ctx.beginPath();
    ctx.ellipse(-r * 0.3, 0, r * 0.6, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 頭部（Head）
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(r * 0.6, 0, r * 0.7, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // 触角（Antennae）
    ctx.strokeStyle = headColor;
    ctx.beginPath();
    ctx.moveTo(r * 1.0, -r * 0.3);
    ctx.lineTo(r * 1.6, -r * 0.7);
    ctx.moveTo(r * 1.0, r * 0.3);
    ctx.lineTo(r * 1.6, r * 0.7);
    ctx.stroke();

    // 目
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(r * 0.8, -r * 0.25, r * 0.15, 0, Math.PI * 2);
    ctx.arc(r * 0.8, r * 0.25, r * 0.15, 0, Math.PI * 2);
    ctx.fill();

    // 冠（ジャイアント）
    if (ant.isGiant) {
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(r * 0.2, -r * 0.6);
      ctx.lineTo(r * 0.6, -r * 1.1);
      ctx.lineTo(r * 0.8, -r * 0.5);
      ctx.lineTo(r * 1.0, -r * 1.1);
      ctx.lineTo(r * 1.2, -r * 0.5);
      ctx.fill();
    }

    ctx.restore();
  }

  drawParticles(particleSystem) {
    const ctx = this.ctx;
    for (const p of particleSystem.particles) {
      if (p.isText) {
        ctx.save();
        ctx.font = 'bold 16px system-ui, sans-serif';
        ctx.fillStyle = p.color;
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 4;
        ctx.globalAlpha = Math.min(1, p.life / (p.maxLife * 0.4));
        ctx.fillText(p.text, p.x, p.y);
        ctx.restore();
      } else {
        ctx.save();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.min(1, p.life / p.maxLife);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  drawFrenzyVignette(w, h, timer) {
    const ctx = this.ctx;
    ctx.save();
    const grad = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.7);
    grad.addColorStop(0, 'rgba(251, 191, 36, 0)');
    grad.addColorStop(1, 'rgba(245, 158, 11, 0.25)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}
