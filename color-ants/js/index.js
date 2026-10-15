/**
 * カラー・アント（Color Ants）
 * 数字タイルをタップ → その数のアリが出発 → 同じ色のピクセルを運んで絵を食べつくす！
 */
import { sound } from '../../common/js/audio.js?v=151';
import { loadCss } from '../../common/js/load-css.js';
import { storage } from '../../common/js/storage.js';
import { PICTURE_DEFS, buildPicture, countByKey, paintPicture, SIZE } from './pictures.js?v=3';
import { mulberry32, buildTiles, textColorFor } from './puzzle.js?v=3';
import { Colony, shade } from './colony.js?v=3';
import { ColonyRenderer } from './renderer.js?v=3';

const SAVE_KEY = 'color_ants_v2';
const COLS = 5;
const TILE_H = 42;
const TILE_GAP = 6;
const HIDDEN_DEPTH = 3; // これより奥のタイルは「？」

export default {
  prepare() {
    return loadCss(new URL('../css/color-ants.css?v=3', import.meta.url).href);
  },

  init(container, onBackToHub) {
    this.container = container;
    this.onBackToHub = onBackToHub;
    const sv = storage.get(SAVE_KEY);
    this.level = Math.max(1, Math.floor((sv && sv.level) || 1));
    this.speedMul = 1;
    this.running = true;
    this.cleared = false;
    this.audioCd = 0;
    this.lastPct = -1;
    this.lw = 0;
    this.lh = 0;

    this.buildDOM();
    this.colony = new Colony();
    this.renderer = new ColonyRenderer(this.canvas);
    this.handleResize();
    this.startLevel();

    this.resizeObserver = new ResizeObserver(() => { this.handleResize(); this.applyLayout(); });
    this.resizeObserver.observe(this.canvasWrap);

    this.lastTime = performance.now();
    this.loop = this.loop.bind(this);
    this.animId = requestAnimationFrame(this.loop);
  },

  buildDOM() {
    this.container.innerHTML = `
      <div class="color-ants-container">
        <header class="ca-header">
          <button class="ca-btn" id="ca-back">← もどる</button>
          <div class="ca-title">
            <span class="ca-level" id="ca-level">Level 1</span>
            <span class="ca-pct" id="ca-pct">0%</span>
          </div>
          <button class="ca-btn ca-speed" id="ca-speed">▶▶ ×1</button>
        </header>
        <div class="ca-canvas-wrap" id="ca-wrap"><canvas class="ca-canvas" id="ca-canvas"></canvas></div>
        <div class="ca-panel">
          <div class="ca-tiles" id="ca-tiles"></div>
        </div>
        <div class="ca-modal" id="ca-modal" style="display:none;">
          <div class="ca-card">
            <div class="ca-card-title" id="ca-card-title">クリア！</div>
            <canvas class="ca-thumb" id="ca-thumb" width="128" height="128"></canvas>
            <div class="ca-card-name" id="ca-card-name"></div>
            <button class="ca-next" id="ca-next">つぎのレベルへ ➔</button>
          </div>
        </div>
      </div>
    `;
    const q = (id) => this.container.querySelector(id);
    this.canvas = q('#ca-canvas');
    this.canvasWrap = q('#ca-wrap');
    this.tilesEl = q('#ca-tiles');
    this.levelEl = q('#ca-level');
    this.pctEl = q('#ca-pct');
    this.speedBtn = q('#ca-speed');
    this.modal = q('#ca-modal');

    q('#ca-back').addEventListener('click', () => { this.destroy(); this.onBackToHub(); });
    this.speedBtn.addEventListener('click', () => {
      this.speedMul = this.speedMul === 1 ? 2 : 1;
      this.speedBtn.textContent = `▶▶ ×${this.speedMul}`;
      this.speedBtn.classList.toggle('on', this.speedMul === 2);
    });
    q('#ca-next').addEventListener('click', () => {
      this.level++;
      this.startLevel();
    });
  },

  handleResize() {
    const rect = this.canvasWrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.floor(rect.width), h = Math.floor(rect.height);
    if (w <= 0 || h <= 0) return;
    this.lw = w;
    this.lh = h;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
  },

  /** 絵と巣穴の位置を決める（画面に合わせて 32×32 の1マスの大きさを計算） */
  applyLayout() {
    const w = this.lw, h = this.lh;
    if (w <= 0 || h <= 0) return;
    const avail = Math.min(w - 32, h - 14 - 66);
    const cell = Math.max(5, Math.floor(avail / SIZE));
    const bp = cell * SIZE;
    const boardX = Math.floor((w - bp) / 2);
    const boardY = 14;
    const below = h - (boardY + bp);
    this.colony.setLayout({
      cell, boardX, boardY,
      nest: { x: w / 2, y: Math.min(h - 14, boardY + bp + below * 0.55) },
    });
  },

  startLevel() {
    const def = PICTURE_DEFS[(this.level - 1) % PICTURE_DEFS.length];
    const picture = buildPicture(def);
    const rng = mulberry32(this.level * 7919 + 13);
    this.picture = picture;
    this.colony.reset(picture, rng);
    this.columns = buildTiles(countByKey(picture.pixels), rng, { cols: COLS });
    this.cleared = false;
    this.lastPct = -1;
    this.modal.style.display = 'none';
    this.levelEl.textContent = `Level ${this.level}`;

    // タイル欄の高さはレベル中ずっと固定（絵がガタつかないように）
    const rows = Math.max(...this.columns.map(c => c.length));
    this.tilesEl.style.height = `${rows * TILE_H + (rows - 1) * TILE_GAP}px`;

    this.applyLayout();
    this.renderTiles();
    this.updatePct();
  },

  renderTiles() {
    this.tilesEl.innerHTML = '';
    this.columns.forEach((col, ci) => {
      const colEl = document.createElement('div');
      colEl.className = 'ca-col';
      col.forEach((t, depth) => {
        const b = document.createElement('button');
        const hex = this.picture.palette[t.key];
        b.className = 'ca-tile ' + (depth === 0 ? 'front' : 'back');
        if (depth >= HIDDEN_DEPTH) {
          b.classList.add('hidden');
          b.textContent = '？';
        } else {
          b.textContent = String(t.n);
          b.style.setProperty('--c', hex);
          b.style.setProperty('--d', shade(hex, 0.62));
          b.style.setProperty('--t', textColorFor(hex));
        }
        if (depth === 0) b.addEventListener('click', () => this.tapTile(ci));
        colEl.appendChild(b);
      });
      this.tilesEl.appendChild(colEl);
    });
  },

  tapTile(ci) {
    if (this.cleared) return;
    const t = this.columns[ci].shift();
    if (!t) return;
    this.colony.deploy(t.key, this.picture.palette[t.key], t.n);
    sound.play('tap');
    this.renderTiles();
  },

  updatePct() {
    const c = this.colony;
    const pct = c.total === 0 ? 0 : Math.floor(((c.total - c.remaining) / c.total) * 100);
    if (pct !== this.lastPct) {
      this.lastPct = pct;
      this.pctEl.textContent = `${pct}%`;
    }
  },

  loop(time) {
    if (!this.running) return;
    const dt = Math.min(0.05, (time - this.lastTime) / 1000);
    this.lastTime = time;
    this.audioCd = Math.max(0, this.audioCd - dt);

    const eaten = this.colony.update(dt, this.speedMul);
    if (eaten > 0) {
      this.updatePct();
      if (this.audioCd <= 0) { sound.play('hit'); this.audioCd = 0.09; }
    }
    this.renderer.render(this.colony, this.lw, this.lh);

    if (!this.cleared && this.colony.remaining === 0 && !this.colony.busy) this.showClear();
    this.animId = requestAnimationFrame(this.loop);
  },

  showClear() {
    this.cleared = true;
    sound.play('reward');
    storage.set(SAVE_KEY, { level: this.level + 1 });
    const q = (id) => this.container.querySelector(id);
    q('#ca-card-title').textContent = `Level ${this.level} クリア！`;
    q('#ca-card-name').textContent = `${this.picture.icon} ${this.picture.name}`;
    const ctx = q('#ca-thumb').getContext('2d');
    ctx.clearRect(0, 0, 128, 128);
    paintPicture(ctx, this.picture, 0, 0, 4);
    this.modal.style.display = 'flex';
  },

  destroy() {
    this.running = false;
    if (this.animId) { cancelAnimationFrame(this.animId); this.animId = null; }
    if (this.resizeObserver) this.resizeObserver.disconnect();
  },
};
