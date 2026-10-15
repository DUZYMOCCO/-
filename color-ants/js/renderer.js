/**
 * カラー・アント Canvas レンダラー
 * 額縁と絵は別キャンバスに用意しておき、かじられたマスだけ消す（64×64 でも軽い）。
 * アリはマスより大きく描いて、行列がはっきり見えるようにする。
 */
import { SIZE } from './pictures.js?v=5';
import { shade } from './colony.js?v=5';

const FRAME_PAD = 7;
const MARGIN = 18;
const LITE_ANTS = 420; // これより多いときはアリを簡易描画

export class ColonyRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.board = document.createElement('canvas');
    this.frame = document.createElement('canvas');
    this.key = '';
    this.cd = 1;
  }

  /** レイアウトや絵が変わったときだけ、額縁と絵を作り直す。かじられたマスは毎フレーム消す */
  prepare(colony, L, dpr) {
    const cd = Math.max(1, Math.round(L.cell * dpr));
    const key = `${colony.version}|${cd}|${dpr}`;
    const bpd = cd * SIZE;
    if (key !== this.key) {
      this.key = key;
      this.cd = cd;
      this.board.width = bpd;
      this.board.height = bpd;
      const b = this.board.getContext('2d');
      b.clearRect(0, 0, bpd, bpd);
      for (const p of colony.pixels) {
        if (p.eaten) continue;
        b.fillStyle = p.hex;
        b.fillRect(p.gx * cd, p.gy * cd, cd, cd);
      }

      const bp = bpd / dpr;
      const fw = Math.ceil((bp + (FRAME_PAD + MARGIN) * 2) * dpr);
      this.frame.width = fw;
      this.frame.height = fw;
      const f = this.frame.getContext('2d');
      f.clearRect(0, 0, fw, fw);
      f.save();
      f.scale(dpr, dpr);
      f.shadowColor = 'rgba(90,50,10,0.28)';
      f.shadowBlur = 12;
      f.shadowOffsetY = 4;
      f.fillStyle = '#fff8ec';
      f.strokeStyle = '#d9b98a';
      f.lineWidth = 3;
      f.beginPath();
      f.roundRect(MARGIN, MARGIN, bp + FRAME_PAD * 2, bp + FRAME_PAD * 2, 12);
      f.fill();
      f.stroke();
      f.shadowColor = 'transparent';
      const bgColor = (colony.picture && colony.picture.palette && colony.picture.palette.bg) || '#f6ecda';
      f.fillStyle = bgColor; // 絵の背景色（食べ終わった部分は透過してこれが見える）
      f.fillRect(MARGIN + FRAME_PAD, MARGIN + FRAME_PAD, bp, bp);
      f.restore();
    }
    if (colony.fresh.length) {
      const b = this.board.getContext('2d');
      for (const p of colony.fresh) b.clearRect(p.gx * this.cd, p.gy * this.cd, this.cd, this.cd);
      colony.fresh.length = 0;
    }
  }

  render(colony, w, h) {
    const ctx = this.ctx;
    const dpr = window.devicePixelRatio || 1;
    const L = colony.layout;
    this.prepare(colony, L, dpr);

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const off = FRAME_PAD + MARGIN;
    ctx.drawImage(this.frame, L.boardX - off, L.boardY - off, this.frame.width / dpr, this.frame.height / dpr);
    ctx.drawImage(this.board, L.boardX, L.boardY, this.board.width / dpr, this.board.height / dpr);

    this.drawNest(ctx, L, colony.pulse);
    const lite = colony.ants.length > LITE_ANTS;
    for (const a of colony.ants) this.drawAnt(ctx, a, L, lite);
    for (const c of colony.crumbs) {
      ctx.globalAlpha = Math.min(1, c.life / 0.2);
      ctx.fillStyle = c.hex;
      ctx.fillRect(c.x, c.y, L.cell * 0.9, L.cell * 0.9);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  drawNest(ctx, L, pulse) {
    const { x, y } = L.nest;
    const r = L.ant * 1.5;
    ctx.fillStyle = '#b9743a';
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.3, r * 2.4, r * 1.05, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d99a5c';
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.1, r * 2.1, r * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a2312';
    const k = 1 + pulse * 0.18; // 巣穴に届くたびにぷくっと
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.18, r * 1.2 * k, r * 0.52 * k, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  drawAnt(ctx, a, L, lite) {
    const s = L.ant;
    const dx = Math.cos(a.ang), dy = Math.sin(a.ang);
    const nx = -dy, ny = dx;
    // 行きと帰りで進行方向が逆 → 同じ向きにずらすと自然に2車線の行列になる
    const lane = s * 0.5 + Math.sin(a.ph * 0.6) * s * 0.06;
    const x = a.x + nx * lane, y = a.y + ny * lane;

    if (lite) {
      ctx.fillStyle = a.hex;
      ctx.beginPath();
      ctx.arc(x, y, s * 0.32, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(40,25,12,0.8)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (let i = -1; i <= 1; i++) {
        const sw = Math.sin(a.ph + i * 2.1) * s * 0.18;
        const bx = x + dx * s * 0.1 * i, by = y + dy * s * 0.1 * i;
        for (const side of [-1, 1]) {
          ctx.moveTo(bx, by);
          ctx.lineTo(bx + nx * side * s * 0.5 + dx * (i * s * 0.2 + sw), by + ny * side * s * 0.5 + dy * (i * s * 0.2 + sw));
        }
      }
      ctx.stroke();

      ctx.fillStyle = a.hex;
      ctx.beginPath();
      ctx.arc(x - dx * s * 0.5, y - dy * s * 0.5, s * 0.3, 0, Math.PI * 2);
      ctx.arc(x, y, s * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = a.dark;
      ctx.beginPath();
      ctx.arc(x + dx * s * 0.46, y + dy * s * 0.46, s * 0.23, 0, Math.PI * 2);
      ctx.fill();
    }

    if (a.carry) {
      const c = Math.max(3, s * 0.5);
      ctx.fillStyle = a.hex;
      ctx.fillRect(x - c / 2, y - s * 0.55 - c, c, c);
      ctx.strokeStyle = shade(a.hex, 0.55);
      ctx.lineWidth = 0.8;
      ctx.strokeRect(x - c / 2, y - s * 0.55 - c, c, c);
    }
  }
}
