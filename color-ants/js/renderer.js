/**
 * カラー・アント Canvas レンダラー
 * 額縁つきのドット絵・巣穴・行列するアリ・くわえたピクセル・かけらを描く
 */
import { SIZE } from './pictures.js?v=3';
import { shade } from './colony.js?v=3';

export class ColonyRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  render(colony, w, h) {
    const ctx = this.ctx;
    const dpr = window.devicePixelRatio || 1;
    const L = colony.layout;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    this.drawBoard(ctx, colony, L);
    this.drawNest(ctx, L);
    for (const a of colony.ants) this.drawAnt(ctx, a, L.cell);
    for (const c of colony.crumbs) {
      ctx.globalAlpha = Math.min(1, c.life / 0.25);
      ctx.fillStyle = c.hex;
      ctx.fillRect(c.x, c.y, L.cell * 0.28, L.cell * 0.28);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  drawBoard(ctx, colony, L) {
    const { cell, boardX, boardY } = L;
    const bp = cell * SIZE;
    const pad = 7;
    ctx.save();
    ctx.shadowColor = 'rgba(90,50,10,0.28)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#fff8ec';
    ctx.strokeStyle = '#d9b98a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(boardX - pad, boardY - pad, bp + pad * 2, bp + pad * 2, 12);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 食べ終わったあとの台紙
    ctx.fillStyle = '#f6ecda';
    ctx.fillRect(boardX, boardY, bp, bp);

    for (const p of colony.pixels) {
      if (p.eaten) continue;
      ctx.fillStyle = p.hex;
      ctx.fillRect(boardX + p.gx * cell, boardY + p.gy * cell, cell, cell);
    }
  }

  drawNest(ctx, L) {
    const { x, y } = L.nest;
    const r = L.cell;
    ctx.fillStyle = '#b9743a';
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.35, r * 2.6, r * 1.15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d99a5c';
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.1, r * 2.3, r * 0.95, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a2312';
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.2, r * 1.35, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  drawAnt(ctx, a, cell) {
    const s = cell * 0.62;
    const dx = Math.cos(a.ang), dy = Math.sin(a.ang);
    const nx = -dy, ny = dx;
    const wob = Math.sin(a.ph * 0.6) * cell * 0.1;
    const x = a.x + nx * wob, y = a.y + ny * wob;

    // あし（3対・歩くたびに交互に動く）
    ctx.strokeStyle = 'rgba(40,25,12,0.85)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    for (let i = -1; i <= 1; i++) {
      const sw = Math.sin(a.ph + i * 2.1) * s * 0.25;
      const bx = x + dx * s * 0.12 * i, by = y + dy * s * 0.12 * i;
      for (const side of [-1, 1]) {
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + nx * side * s * 0.62 + dx * (i * s * 0.25 + sw), by + ny * side * s * 0.62 + dy * (i * s * 0.25 + sw));
      }
    }
    ctx.stroke();

    ctx.lineWidth = 0.8;
    ctx.strokeStyle = a.dark;
    ctx.fillStyle = a.hex;
    const parts = [[-0.62, 0.34], [0, 0.26], [0.58, 0.28]]; // おしり・むね・あたま
    parts.forEach(([off, r], i) => {
      ctx.beginPath();
      ctx.arc(x + dx * s * off, y + dy * s * off, s * r, 0, Math.PI * 2);
      if (i === 2) { ctx.save(); ctx.fillStyle = a.dark; ctx.fill(); ctx.restore(); } else ctx.fill();
      ctx.stroke();
    });

    if (a.carry) {
      const c = cell * 0.62;
      ctx.fillStyle = a.hex;
      ctx.strokeStyle = shade(a.hex, 0.55);
      ctx.lineWidth = 1;
      ctx.fillRect(x - c / 2, y - s * 0.55 - c, c, c);
      ctx.strokeRect(x - c / 2, y - s * 0.55 - c, c, c);
    }
  }
}
