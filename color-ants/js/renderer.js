/**
 * カラー・アント Canvas レンダラー
 * 額縁と絵は別キャンバスに用意しておき、かじられたマスだけ消す（64×64 でも軽い）。
 * アリはマスより大きく描いて、行列がはっきり見えるようにする。
 */
import { SIZE } from './pictures.js?v=12';
import { shade } from './colony.js?v=13';

const FRAME_PAD = 9;
const MARGIN = 18;
const LITE_ANTS = 420; // これより多いときはアリを簡易描画

export class ColonyRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.board = document.createElement('canvas');
    this.frame = document.createElement('canvas');
    this.ground = document.createElement('canvas');
    this.waitOverlay = document.createElement('canvas');
    this.waitKey = '';
    this.waitBarrierMarks = new Uint8Array(SIZE * SIZE);
    this.groundKey = '';
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
        // The tiny highlights are baked once, never redrawn for every live frame.
        if (cd >= 3) {
          const edge = Math.max(1, Math.round(cd * .13));
          b.fillStyle = 'rgba(255,255,255,.20)';
          b.fillRect(p.gx * cd, p.gy * cd, cd, edge);
          b.fillRect(p.gx * cd, p.gy * cd, edge, cd);
          b.fillStyle = 'rgba(35,40,49,.12)';
          b.fillRect(p.gx * cd, (p.gy + 1) * cd - edge, cd, edge);
          b.fillRect((p.gx + 1) * cd - edge, p.gy * cd, edge, cd);
        }
      }

      const bp = bpd / dpr;
      const fw = Math.ceil((bp + (FRAME_PAD + MARGIN) * 2) * dpr);
      this.frame.width = fw;
      this.frame.height = fw;
      const f = this.frame.getContext('2d');
      f.clearRect(0, 0, fw, fw);
      f.save();
      f.scale(dpr, dpr);
      f.shadowColor = 'rgba(111,78,36,0.23)';
      f.shadowBlur = 8;
      f.shadowOffsetY = 5;
      f.fillStyle = '#bd925e';
      f.beginPath();
      f.roundRect(MARGIN - 2, MARGIN - 2, bp + FRAME_PAD * 2 + 4, bp + FRAME_PAD * 2 + 7, 16);
      f.fill();
      f.shadowColor = 'transparent';
      const wood = f.createLinearGradient(0, MARGIN, 0, bp + FRAME_PAD * 2);
      wood.addColorStop(0, '#fff4d8'); wood.addColorStop(.4, '#f9e6bd'); wood.addColorStop(1, '#e4c08a');
      f.fillStyle = wood;
      f.beginPath();
      f.roundRect(MARGIN, MARGIN, bp + FRAME_PAD * 2, bp + FRAME_PAD * 2, 14);
      f.fill();
      const bgColor = (colony.picture && colony.picture.palette && colony.picture.palette.bg) || '#f6ecda';
      f.fillStyle = '#b79667';
      f.fillRect(MARGIN + FRAME_PAD - 2, MARGIN + FRAME_PAD - 2, bp + 4, bp + 4);
      f.fillStyle = bgColor;
      f.fillRect(MARGIN + FRAME_PAD, MARGIN + FRAME_PAD, bp, bp);
      const unit = cd / dpr;
      for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
        f.fillStyle = (x + y) % 2 ? 'rgba(255,255,255,.075)' : 'rgba(37,78,69,.025)';
        f.fillRect(MARGIN + FRAME_PAD + x * unit, MARGIN + FRAME_PAD + y * unit, unit, unit);
      }
      // Four inset brass pins reinforce the toy frame without covering the puzzle.
      for (const x of [MARGIN + 4, MARGIN + bp + FRAME_PAD * 2 - 4]) {
        for (const y of [MARGIN + 4, MARGIN + bp + FRAME_PAD * 2 - 4]) {
          f.fillStyle = '#c6a06a'; f.beginPath(); f.arc(x, y, 1.5, 0, Math.PI * 2); f.fill();
          f.fillStyle = '#fff8dd'; f.fillRect(x - .5, y - 1, 1, 1);
        }
      }
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
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const L = colony.layout;
    this.prepare(colony, L, dpr);

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    this.drawGround(ctx, colony, w, h, dpr);
    const off = FRAME_PAD + MARGIN;
    ctx.drawImage(this.frame, L.boardX - off, L.boardY - off, this.frame.width / dpr, this.frame.height / dpr);
    ctx.shadowColor = 'rgba(39,67,57,.2)';
    ctx.shadowBlur = 2;
    ctx.shadowOffsetY = 2;
    ctx.drawImage(this.board, L.boardX, L.boardY, this.board.width / dpr, this.board.height / dpr);
    ctx.shadowColor = 'transparent';
    ctx.shadowOffsetY = 0;

    this.drawWaitCues(ctx, colony, L, dpr);

    const nests = L.nests && L.nests.length > 0 ? L.nests : [L.nest || { x: w / 2, y: h * 0.8 }];
    for (let ni = 0; ni < nests.length; ni++) {
      const p = (colony.pulses && colony.pulses[ni]) || colony.pulse || 0;
      this.drawSingleNest(ctx, nests[ni], L, p);
    }

    const lite = colony.ants.length > LITE_ANTS;
    for (const a of colony.ants) this.drawAnt(ctx, a, L, lite);
    for (const c of colony.crumbs) {
      ctx.globalAlpha = Math.min(1, c.life / 0.2);
      ctx.fillStyle = c.hex;
      if (c.isStar) {
        const r = L.cell * 1.4;
        ctx.beginPath();
        ctx.moveTo(c.x, c.y - r);
        ctx.quadraticCurveTo(c.x, c.y, c.x + r, c.y);
        ctx.quadraticCurveTo(c.x, c.y, c.x, c.y + r);
        ctx.quadraticCurveTo(c.x, c.y, c.x - r, c.y);
        ctx.quadraticCurveTo(c.x, c.y, c.x, c.y - r);
        ctx.fill();
      } else {
        ctx.fillRect(c.x, c.y, L.cell * 0.9, L.cell * 0.9);
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /** Cached, static cues: numbered dotted food borders and diagonal marks on enclosing colors. */
  drawWaitCues(ctx, colony, L, dpr) {
    const groups = [];
    for (let i = 0; i < colony.slots.length; i++) {
      const slot = colony.slots[i];
      if (!slot || colony.slotState(slot) !== 'blocked' || groups.some(g => g.key === slot.key)) continue;
      groups.push({ key: slot.key, id: i + 1 });
    }
    if (!groups.length) { this.waitKey = ''; return; }
    const key = `${colony.version}|${colony.frontierVersion}|${L.cell}|${dpr}|${groups.map(g => `${g.id}:${g.key}`).join(',')}`;
    if (key !== this.waitKey) {
      this.waitKey = key;
      const bp = L.cell * SIZE, c = L.cell;
      this.waitOverlay.width = this.waitOverlay.height = Math.round(bp * dpr);
      const w = this.waitOverlay.getContext('2d'); w.scale(dpr, dpr);
      this.waitBarrierMarks.fill(0);
      let markers = 0;
      for (const group of groups) {
        const cue = colony.blockedCue(group.key);
        if (!cue) continue;
        for (const p of cue.barriers) {
          const i = p.gy * SIZE + p.gx;
          if (this.waitBarrierMarks[i]) continue;
          this.waitBarrierMarks[i] = 1;
          const x = p.gx * c, y = p.gy * c;
          w.fillStyle = '#e5a43c28'; w.fillRect(x, y, c, c);
          w.strokeStyle = '#a36c2999'; w.lineWidth = .8; w.setLineDash([]);
          w.beginPath(); w.moveTo(x + .2, y + c - .2); w.lineTo(x + c - .2, y + .2); w.stroke();
        }
        w.beginPath();
        const same = (x, y) => { const p = colony.grid[y * SIZE + x]; return x >= 0 && x < SIZE && y >= 0 && y < SIZE && p && !p.eaten && p.key === group.key; };
        for (const p of cue.targets) {
          const x = p.gx * c, y = p.gy * c;
          if (!same(p.gx, p.gy - 1)) { w.moveTo(x, y); w.lineTo(x + c, y); }
          if (!same(p.gx + 1, p.gy)) { w.moveTo(x + c, y); w.lineTo(x + c, y + c); }
          if (!same(p.gx, p.gy + 1)) { w.moveTo(x + c, y + c); w.lineTo(x, y + c); }
          if (!same(p.gx - 1, p.gy)) { w.moveTo(x, y + c); w.lineTo(x, y); }
        }
        w.setLineDash([]); w.strokeStyle = '#fffdf0'; w.lineWidth = 2.8; w.stroke();
        w.setLineDash([3, 2]); w.strokeStyle = '#237d76'; w.lineWidth = 1.3; w.stroke();
        w.setLineDash([]);
        for (const part of cue.components.slice(0, 2)) {
          if (markers++ >= 6) break;
          const x = Math.max(8, Math.min(bp - 8, (part.gx + .5) * c));
          const y = Math.max(8, Math.min(bp - 8, part.gy * c - 10));
          w.strokeStyle = '#237d76'; w.lineWidth = 1;
          w.beginPath(); w.moveTo(x, y + 6); w.lineTo(x, Math.min(bp, (part.gy + .5) * c)); w.stroke();
          w.fillStyle = '#fffbed'; w.lineWidth = 1.4;
          w.beginPath(); w.arc(x, y, 6.5, 0, Math.PI * 2); w.fill(); w.stroke();
          w.fillStyle = '#236f69'; w.font = 'bold 10px sans-serif'; w.textAlign = 'center'; w.textBaseline = 'middle';
          w.fillText(String(group.id), x, y + .3);
        }
      }
    }
    ctx.drawImage(this.waitOverlay, L.boardX, L.boardY, this.waitOverlay.width / dpr, this.waitOverlay.height / dpr);
  }

  drawGround(ctx, colony, w, h, dpr) {
    const L = colony.layout;
    const key = `${w}|${h}|${dpr}|${L.cell}|${L.boardY}`;
    if (key !== this.groundKey) {
      this.groundKey = key;
      this.ground.width = Math.ceil(w * dpr);
      this.ground.height = Math.ceil(h * dpr);
      const g = this.ground.getContext('2d');
      g.scale(dpr, dpr);
      const bottom = L.boardY + L.cell * SIZE;
      const nests = L.nests || [L.nest];
      // Quiet dotted trails and paper leaves keep the walking area legible.
      g.setLineDash([1, 6]);
      g.lineWidth = 2; g.lineCap = 'round'; g.strokeStyle = 'rgba(159,116,63,.18)';
      for (const nest of nests) {
        g.beginPath(); g.moveTo(nest.x, nest.y - 12);
        g.quadraticCurveTo(nest.x - 12, bottom + 30, nest.x, bottom + 13); g.stroke();
      }
      g.setLineDash([]);
      for (const [x, y, flip] of [[w * .09, bottom + 35, 1], [w * .9, h - 28, -1]]) {
        g.save(); g.translate(x, y); g.rotate(flip * -.5);
        g.fillStyle = '#b8c180'; g.beginPath(); g.ellipse(0, 0, 9, 4.5, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#899b62'; g.lineWidth = 1; g.beginPath(); g.moveTo(-7, 0); g.lineTo(7, 0); g.stroke(); g.restore();
      }
      for (let i = 0; i < 13; i++) {
        const x = (i * 83 + 29) % Math.max(1, w - 12) + 6;
        const y = bottom + 20 + ((i * 19) % Math.max(1, Math.floor(h - bottom - 28)));
        g.fillStyle = i % 3 ? '#cda57066' : '#fff0ca99';
        g.beginPath(); g.ellipse(x, y, 1.7, 1, -.5, 0, Math.PI * 2); g.fill();
      }
    }
    ctx.drawImage(this.ground, 0, 0, w, h);
  }

  drawSingleNest(ctx, nest, L, pulse) {
    const { x, y } = nest;
    const r = L.ant * 1.25;
    ctx.fillStyle = 'rgba(70, 35, 10, 0.18)';
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.5, r * 2.7, r * 1.2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#bb8c54';
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.25, r * 2.3, r * 0.95, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#e9bb7c';
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.08, r * 2.0, r * 0.78, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#513725';
    const k = 1 + pulse * 0.25;
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.15, r * 1.15 * k, r * 0.48 * k, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#35271e';
    ctx.beginPath(); ctx.ellipse(x, y + r * .24, r * .86, r * .29, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff0bc'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.ellipse(x - 1, y - r * .05, r * 1.7, r * .59, 0, Math.PI * 1.08, Math.PI * 1.85); ctx.stroke();
  }

  drawAnt(ctx, a, L, lite) {
    const onBoard = a.x >= L.boardX && a.x < L.boardX + L.cell * SIZE && a.y >= L.boardY && a.y < L.boardY + L.cell * SIZE;
    const s = onBoard ? Math.min(L.ant, L.cell * .85) : L.ant;
    const dx = Math.cos(a.ang), dy = Math.sin(a.ang);
    const nx = -dy, ny = dx;
    // 行きと帰りで進行方向が逆 → 同じ向きにずらすと自然に2車線の行列になる
    const lane = onBoard ? L.cell * .06 : s * 0.5 + Math.sin(a.ph * 0.6) * s * 0.06;
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

      // Antennae point along the heading; the body has a small lit abdomen.
      ctx.beginPath();
      for (const side of [-1, 1]) {
        ctx.moveTo(x + dx * s * .5 + nx * side * s * .12, y + dy * s * .5 + ny * side * s * .12);
        ctx.lineTo(x + dx * s * .85 + nx * side * s * .32, y + dy * s * .85 + ny * side * s * .32);
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
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.beginPath(); ctx.arc(x - dx * s * .53 - nx * s * .08, y - dy * s * .53 - ny * s * .08, s * .11, 0, Math.PI * 2); ctx.fill();
    }

    if (a.carry) {
      const c = Math.max(3, s * 0.5);
      ctx.fillStyle = a.hex;
      ctx.fillRect(x - c / 2, y - s * 0.55 - c, c, c);
      ctx.strokeStyle = shade(a.hex, 0.55);
      ctx.lineWidth = 0.8;
      ctx.strokeRect(x - c / 2, y - s * 0.55 - c, c, c);
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.fillRect(x - c / 2 + .5, y - s * .55 - c + .5, c - 1, 1);
    }
  }
}
