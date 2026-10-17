/**
 * カラー・アント（Color Ants）
 * 外郭の色と限られた出撃枠をやりくりするパズル。お助けは面ごとの回数制。
 */
import { sound } from '../../common/js/audio.js?v=151';
import { loadCss } from '../../common/js/load-css.js';
import { storage } from '../../common/js/storage.js';
import { PICTURE_DEFS, buildPicture, countByKey, paintPicture, SIZE } from './pictures.js?v=10';
import { mulberry32, buildTiles, textColorFor, difficultyFor } from './puzzle.js?v=10';
import { Colony, shade } from './colony.js?v=10';
import { ColonyRenderer } from './renderer.js?v=10';
import { playNibble, stopNibbles, NIBBLE_GAP } from './soft-audio.js?v=10';

const SAVE_KEY = 'color_ants_v2';
const COLS = 5;
const VISIBLE_DEPTH = 4; // 画面上に表示するタイルの深さ（手前4段）

export default {
  prepare() {
    return loadCss(new URL('../css/color-ants.css?v=10', import.meta.url).href);
  },

  init(container, onBackToHub) {
    this.container = container;
    this.onBackToHub = onBackToHub;
    const sv = storage.get(SAVE_KEY);
    this.level = Math.max(1, Math.floor((sv && sv.level) || 1));
    this.speedMul = 1;
    this.running = true;
    this.cleared = false;
    this.stuck = false;
    this.audioCd = 0;
    this.lastDelivered = -1;
    this.lw = 0;
    this.lh = 0;
    this.lastSlotCounts = [];

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
          <button class="ca-btn ca-back" id="ca-back" aria-label="工房にもどる">‹</button>
          <div class="ca-title">
            <span class="ca-brand">COLOR ANTS</span>
            <span class="ca-level" id="ca-level">Level 1</span>
            <span class="ca-pct" id="ca-pct">運んだ 0 / 0</span>
          </div>
          <div class="ca-hdr-right">
            <button class="ca-btn ca-restart-btn" id="ca-restart" title="やり直す" aria-label="やり直す">↻</button>
            <button class="ca-btn ca-speed" id="ca-speed">▶▶ ×1</button>
          </div>
        </header>

        <div class="ca-progress">
          <div class="ca-progress-label"><span id="ca-picture-name"></span><span id="ca-progress-text">0%</span></div>
          <div class="ca-progress-track" role="progressbar" aria-label="絵の回収率" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="ca-progress"><div id="ca-progress-fill"></div></div>
        </div>

        <div class="ca-canvas-wrap" id="ca-wrap">
          <canvas class="ca-canvas" id="ca-canvas"></canvas>
        </div>

        <div class="ca-panel">
          <!-- お助けアイテム（ブースターバー） -->
          <div class="ca-boosters">
            <button class="ca-boost-btn" id="ca-boost-undo" title="1手もどす">
              <span class="ca-boost-icon">↺</span>
              <span class="ca-boost-lbl">もどす</span>
            </button>
            <button class="ca-boost-btn" id="ca-boost-slot" title="スロット枠を+1ふやす">
              <span class="ca-boost-icon">＋</span>
              <span class="ca-boost-lbl">枠+1</span>
            </button>
            <button class="ca-boost-btn" id="ca-boost-shuffle" title="タイルを並び替える">
              <span class="ca-boost-icon">⇄</span>
              <span class="ca-boost-lbl">シャッフル</span>
            </button>
            <button class="ca-boost-btn" id="ca-boost-magnet" title="外側の色を一気におそうじ！">
              <span class="ca-boost-icon">🧲</span>
              <span class="ca-boost-lbl">そうじ</span>
            </button>
          </div>

          <!-- 出撃スロット（トレイ） -->
          <div class="ca-tray-wrap">
            <div class="ca-tray-head">
              <span class="ca-tray-title">アリの出撃トレイ</span>
              <span class="ca-tray-hint" id="ca-tray-hint">0 / 5</span>
            </div>
            <div class="ca-slots" id="ca-slots"></div>
          </div>

          <!-- タイル列（手前4段） -->
          <div class="ca-tiles" id="ca-tiles"></div>
          <div class="ca-guide">外郭から食べよう · 待機タップも「もどす」消費</div>
        </div>

        <!-- トースト通知 -->
        <div class="ca-toast" id="ca-toast" role="status" aria-live="polite"></div>

        <!-- クリアモーダル -->
        <div class="ca-modal" id="ca-modal" style="display:none;">
          <div class="ca-card">
            <div class="ca-card-stars">⭐⭐⭐</div>
            <div class="ca-card-title" id="ca-card-title">クリア！</div>
            <canvas class="ca-thumb" id="ca-thumb" width="128" height="128"></canvas>
            <div class="ca-card-name" id="ca-card-name"></div>
            <button class="ca-next" id="ca-next">つぎの絵へ ➔</button>
          </div>
        </div>

        <!-- 手詰まり（STUCK）モーダル -->
        <div class="ca-modal" id="ca-stuck-modal" style="display:none;">
          <div class="ca-card ca-stuck-card">
            <div class="ca-card-title ca-stuck-title">手詰まり！（STUCK）</div>
            <div class="ca-stuck-desc">動ける色がなくなっちゃった！<br>お助けを使うか、工房へ戻ろう。</div>
            <div class="ca-stuck-actions">
              <button class="ca-stuck-btn ca-stuck-magnet" id="ca-stuck-magnet">🧲 そうじアイテムで脱出！</button>
              <button class="ca-stuck-btn ca-undo" id="ca-stuck-undo">↺ 1手もどす</button>
              <button class="ca-stuck-btn ca-undo" id="ca-stuck-slot">＋ 枠を追加</button>
              <button class="ca-stuck-btn ca-retry" id="ca-stuck-retry">🔄 やり直す</button>
              <button class="ca-stuck-btn ca-giveup" id="ca-stuck-giveup">あきらめる（工房へ）</button>
            </div>
          </div>
        </div>
      </div>
    `;

    const q = (id) => this.container.querySelector(id);
    this.canvas = q('#ca-canvas');
    this.canvasWrap = q('#ca-wrap');
    this.slotsEl = q('#ca-slots');
    this.tilesEl = q('#ca-tiles');
    this.levelEl = q('#ca-level');
    this.pctEl = q('#ca-pct');
    this.progressEl = q('#ca-progress');
    this.progressFill = q('#ca-progress-fill');
    this.progressText = q('#ca-progress-text');
    this.pictureNameEl = q('#ca-picture-name');
    this.trayHint = q('#ca-tray-hint');
    this.speedBtn = q('#ca-speed');
    this.restartBtn = q('#ca-restart');
    this.modal = q('#ca-modal');
    this.stuckModal = q('#ca-stuck-modal');
    this.toastEl = q('#ca-toast');

    // ブースターボタン
    this.boostSlotBtn = q('#ca-boost-slot');
    q('#ca-boost-undo').addEventListener('click', () => this.undoLastSlot());
    this.boostSlotBtn.addEventListener('click', () => this.expandSlots());
    q('#ca-boost-shuffle').addEventListener('click', () => this.shuffleColumns());
    q('#ca-boost-magnet').addEventListener('click', () => this.triggerMagnet());

    q('#ca-back').addEventListener('click', () => { this.destroy(); this.onBackToHub(); });
    this.speedBtn.addEventListener('click', () => {
      this.speedMul = this.speedMul === 1 ? 2 : 1;
      this.speedBtn.textContent = `▶▶ ×${this.speedMul}`;
      this.speedBtn.classList.toggle('on', this.speedMul === 2);
    });
    this.restartBtn.addEventListener('click', () => {
      this.startLevel();
    });
    q('#ca-next').addEventListener('click', () => {
      this.level++;
      this.startLevel();
    });
    q('#ca-stuck-retry').addEventListener('click', () => {
      this.stuck = false;
      this.stuckModal.style.display = 'none';
      this.startLevel();
    });
    q('#ca-stuck-undo').addEventListener('click', () => {
      this.undoLastSlot();
    });
    q('#ca-stuck-magnet').addEventListener('click', () => {
      this.triggerMagnet();
    });
    q('#ca-stuck-slot').addEventListener('click', () => this.expandSlots());
    q('#ca-stuck-giveup').addEventListener('click', () => { this.destroy(); this.onBackToHub(); });
  },

  handleResize() {
    const rect = this.canvasWrap.getBoundingClientRect();
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const w = Math.floor(rect.width), h = Math.floor(rect.height);
    if (w <= 0 || h <= 0) return;
    this.lw = w;
    this.lh = h;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
  },

  applyLayout() {
    const w = this.lw, h = this.lh;
    if (w <= 0 || h <= 0) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const walkingSpace = h < 320 ? 50 : 68;
    const avail = Math.min(w - 44, h - 22 - walkingSpace);
    const cd = Math.max(1, Math.floor((avail * dpr) / SIZE));
    const cell = cd / dpr;
    const bp = cell * SIZE;
    const boardX = Math.round(((w - bp) / 2) * dpr) / dpr;
    const boardY = 22;
    const below = h - (boardY + bp);

    // 3つの巣穴を均等に配置
    const nestY = Math.min(h - 22, boardY + bp + below * 0.62);
    const nests = [
      { x: w * 0.28, y: nestY },
      { x: w * 0.50, y: nestY },
      { x: w * 0.72, y: nestY },
    ];

    this.colony.setLayout({
      cell, boardX, boardY,
      nests,
      nest: nests[1],
      ant: Math.max(5, bp / 52),
      speed: bp * 0.32,
    });
  },

  startLevel() {
    stopNibbles(sound);
    this.audioCd = 0;
    const def = PICTURE_DEFS[(this.level - 1) % PICTURE_DEFS.length];
    const picture = buildPicture(def);
    const rng = mulberry32(this.level * 7919 + 13);
    this.picture = picture;
    this.difficulty = difficultyFor(this.level);
    this.boosts = { undo: this.difficulty.undo, slot: 1, shuffle: 1, magnet: 1 };
    this.moveSequence = 0;
    this.colony.reset(picture, rng, { slotCount: this.difficulty.slots, maxSlots: this.difficulty.slots + 1 });
    this.applyLayout();
    this.columns = buildTiles(countByKey(picture.pixels), rng, {
      cols: COLS,
      target: 22,
      pixels: picture.pixels,
      level: this.level,
    });
    this.cleared = false;
    this.stuck = false;
    this.lastDelivered = -1;
    this.lastSlotCounts = [];
    this.modal.style.display = 'none';
    this.stuckModal.style.display = 'none';
    this.toastEl.classList.remove('show');
    this.levelEl.textContent = `Level ${this.level}`;
    this.pictureNameEl.textContent = `${picture.icon} ${picture.name} · ${this.difficulty.name}`;
    this.syncBoosters();

    this.applyLayout();
    this.renderSlots();
    this.renderTiles();
    this.updateCounter();
  },

  syncBoosters() {
    const labels = { undo: 'もどす', slot: '枠+1', shuffle: 'シャッフル', magnet: 'そうじ' };
    for (const [key, label] of Object.entries(labels)) {
      const button = this.container.querySelector(`#ca-boost-${key}`);
      button.disabled = this.boosts[key] === 0;
      button.querySelector('.ca-boost-lbl').textContent = label;
      button.querySelector('.ca-boost-icon').dataset.count = this.boosts[key];
      button.setAttribute('aria-label', `${label} 残り${this.boosts[key]}回`);
    }
    for (const [key, label] of [['undo', '↺ 1手もどす'], ['magnet', '🧲 そうじ'], ['slot', '＋ 枠を追加']]) {
      const button = this.container.querySelector(`#ca-stuck-${key}`);
      button.disabled = this.boosts[key] === 0;
      button.textContent = `${label}（残り${this.boosts[key]}回）`;
    }
  },

  refreshStuck() {
    if (this.stuck && !this.colony.isStuck()) {
      this.stuck = false;
      this.stuckModal.style.display = 'none';
    }
  },

  showToast(msg) {
    if (!this.toastEl) return;
    this.toastEl.textContent = msg;
    this.toastEl.classList.remove('show');
    void this.toastEl.offsetWidth;
    this.toastEl.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastEl?.classList.remove('show'), 2800);
  },

  /** スロット枠+1の拡張 */
  expandSlots() {
    if (this.cleared || this.boosts.slot === 0) {
      this.showToast('枠を増やせるのは1面に1回だよ');
      return;
    }
    const ok = this.colony.expandSlots();
    if (ok) {
      sound.play('coin');
      this.boosts.slot--;
      this.syncBoosters();
      this.refreshStuck();
      this.showToast(`スロットが ${this.colony.slots.length}枠 に増えたよ！`);
      this.renderSlots();
    }
  },

  /** タイル列のシャッフル */
  shuffleColumns() {
    if (this.cleared || this.boosts.shuffle === 0) return;
    // 全列の未タップタイルをすべて集めてシャッフル
    const all = [];
    for (const col of this.columns) {
      while (col.length > 0) all.push(col.shift());
    }
    if (all.length === 0) return;

    // Keep the outside-in solution order; vary which column each tile uses.
    const rng = mulberry32(Date.now());
    all.sort((a, b) => a.order - b.order);
    all.forEach(t => this.columns[Math.floor(rng() * COLS)].push(t));
    this.boosts.shuffle--;
    this.syncBoosters();
    sound.play('hit');
    this.showToast('タイルをシャッフルしたよ！🔀');
    this.renderTiles();
  },

  /** マグネット（そうじ）ブースター */
  triggerMagnet() {
    if (this.cleared || this.boosts.magnet === 0) return;
    const res = this.colony.useMagnet();
    if (res) {
      this.boosts.magnet--;
      // Magnet-picked pixels must also disappear from queued tile numbers.
      let credit = res.unassigned;
      for (const col of this.columns) {
        for (let i = 0; i < col.length && credit > 0;) {
          const tile = col[i];
          if (tile.key !== res.key) { i++; continue; }
          const take = Math.min(tile.n, credit);
          tile.n -= take; credit -= take;
          if (tile.n === 0) {
            if (tile.hasKey) this.unlockTile(tile);
            col.splice(i, 1);
          } else i++;
        }
      }
      sound.play('reward');
      this.syncBoosters();
      this.refreshStuck();
      this.showToast(`🧲 おそうじ！ ${res.count}マスを回収！✨`);
      this.renderSlots();
      this.renderTiles();
      this.updateCounter();
    } else {
      this.showToast('回収できる外側のマスがありません');
    }
  },

  unlockTile(tile) {
    for (const col of this.columns) for (const other of col) {
      if (other.locked && other.lockId === tile.keyId) {
        other.locked = false;
        return true;
      }
    }
    return false;
  },

  /** 出撃枠を描画（難度別の基本枠＋お助け1枠） */
  renderSlots() {
    this.slotsEl.innerHTML = '';
    const totalSlots = this.colony.slots.length;
    this.trayHint.textContent = `${this.colony.slots.filter(Boolean).length} / ${totalSlots}`;
    this.slotsEl.style.gridTemplateColumns = `repeat(${totalSlots}, 1fr)`;

    for (let si = 0; si < totalSlots; si++) {
      const slot = this.colony.slots[si];
      const slotEl = document.createElement('button');
      slotEl.type = 'button';
      slotEl.dataset.slot = String(si);

      if (!slot) {
        slotEl.className = 'ca-slot empty';
        slotEl.disabled = true;
        slotEl.setAttribute('aria-label', `空き出撃枠 ${si + 1}`);
      } else {
        const hex = slot.hex;
        const isWaiting = slot.left === slot.initial && slot.activeAnts === 0;
        slotEl.className = 'ca-slot active' + (isWaiting ? ' waiting' : ' running');
        slotEl.style.setProperty('--c', hex);
        slotEl.style.setProperty('--d', shade(hex, 0.62));
        slotEl.style.setProperty('--t', textColorFor(hex));
        const pct = Math.round((slot.left / slot.initial) * 100);
        slotEl.style.setProperty('--p', String(pct));
        slotEl.setAttribute('aria-label', `${slot.left}匹 ${isWaiting ? '待機中・もどすを1回使って戻す' : '出撃中'}`);

        slotEl.innerHTML = `
          <div class="ca-slot-bar"></div>
          <span class="ca-slot-num">${slot.left}</span>
          ${isWaiting ? '<span class="ca-slot-badge">待機</span>' : ''}
        `;

        if (isWaiting && slot.colIndex >= 0) {
          slotEl.title = 'もどすを1回使って戻す';
          slotEl.addEventListener('click', () => this.cancelSlot(si));
        }
      }
      this.slotsEl.appendChild(slotEl);
    }
  },

  /** アリの出撃・帰還に応じてスロットの数値を更新 */
  updateSlots() {
    const totalSlots = this.colony.slots.length;
    let structureChanged = false;

    for (let si = 0; si < totalSlots; si++) {
      const slot = this.colony.slots[si];
      const curLeft = slot ? slot.left : -1;
      if (curLeft !== this.lastSlotCounts[si]) {
        if ((curLeft === -1 && this.lastSlotCounts[si] !== -1) ||
            (curLeft !== -1 && this.lastSlotCounts[si] === -1)) {
          structureChanged = true;
        }
        this.lastSlotCounts[si] = curLeft;
      }
    }

    if (structureChanged) {
      this.renderSlots();
      return;
    }

    // 数値とゲージのみ更新
    const slotEls = this.slotsEl.children;
    for (let si = 0; si < totalSlots; si++) {
      const slot = this.colony.slots[si];
      const el = slotEls[si];
      if (!slot || !el || !el.classList.contains('active')) continue;

      const numEl = el.querySelector('.ca-slot-num');
      if (numEl && numEl.textContent !== String(slot.left)) {
        numEl.textContent = String(slot.left);
        const pct = Math.round((slot.left / slot.initial) * 100);
        el.style.setProperty('--p', String(pct));
      }

      const isWaiting = slot.left === slot.initial && slot.activeAnts === 0;
      const label = `${slot.left}匹 ${isWaiting ? '待機中・もどすを1回使って戻す' : '出撃中'}`;
      if (el.getAttribute('aria-label') !== label) el.setAttribute('aria-label', label);
      if (isWaiting !== el.classList.contains('waiting')) {
        el.classList.toggle('waiting', isWaiting);
        el.classList.toggle('running', !isWaiting);
        const badge = el.querySelector('.ca-slot-badge');
        if (isWaiting && !badge) {
          const b = document.createElement('span');
          b.className = 'ca-slot-badge';
          b.textContent = '待機';
          el.appendChild(b);
        } else if (!isWaiting && badge) {
          badge.remove();
        }
      }
    }
  },

  /** 手前4段のタイルを5列描画 */
  renderTiles() {
    this.tilesEl.innerHTML = '';
    this.columns.forEach((col, ci) => {
      const colEl = document.createElement('div');
      colEl.className = 'ca-col';

      // 手前4段を表示
      const visibleTiles = col.slice(0, VISIBLE_DEPTH);

      visibleTiles.forEach((t, depth) => {
        const b = document.createElement('button');
        const hex = this.picture.palette[t.key];
        b.className = 'ca-tile ' + (depth === 0 ? 'front' : 'back');

        if (t.locked) b.classList.add('locked');
        if (t.hasKey) b.classList.add('has-key');

        if (depth >= this.difficulty.hiddenDepth && !t.locked) {
          b.classList.add('mystery');
          b.textContent = '？';
        } else {
          let label = String(t.n);
          if (t.locked) label = `🔒${t.n}`;
          else if (t.hasKey) label = `🗝️${t.n}`;
          b.textContent = label;

          b.style.setProperty('--c', hex);
          b.style.setProperty('--d', shade(hex, 0.62));
          b.style.setProperty('--t', textColorFor(hex));
        }

        if (depth === 0) {
          b.addEventListener('click', () => this.tapTile(ci));
          b.setAttribute('aria-label', `${ci + 1}列目 ${t.n}匹を出撃${t.locked ? '・カギが必要' : ''}`);
        } else {
          b.disabled = true;
        }
        colEl.appendChild(b);
      });

      // 4段を超える残数バッジ
      if (col.length > VISIBLE_DEPTH) {
        const badge = document.createElement('div');
        badge.className = 'ca-col-badge';
        badge.textContent = `+${col.length - VISIBLE_DEPTH}`;
        colEl.appendChild(badge);
      } else if (col.length === 0) {
        const emptyHolder = document.createElement('div');
        emptyHolder.className = 'ca-tile-empty';
        colEl.appendChild(emptyHolder);
      }

      this.tilesEl.appendChild(colEl);
    });
  },

  tapTile(ci) {
    if (this.cleared || this.stuck) return;
    const col = this.columns[ci];
    if (!col || col.length === 0) return;

    const tile = col[0];

    // 南京錠（🔒）がついている場合
    if (tile.locked) {
      sound.play('metal');
      this.showToast('カギ 🗝️ をタップしてロックを解除しよう！');
      const firstBtn = this.tilesEl.children[ci]?.querySelector('.ca-tile.front');
      if (firstBtn) {
        firstBtn.classList.remove('locked-shake');
        void firstBtn.offsetWidth;
        firstBtn.classList.add('locked-shake');
      }
      return;
    }

    const hex = this.picture.palette[tile.key];
    const slotIdx = this.colony.addTileToSlot(tile, hex, ci);
    if (slotIdx === -1) {
      sound.play('hit');
      this.shakeTray();
      return;
    }
    this.colony.slots[slotIdx].placedAt = this.moveSequence++;

    // 鍵タイル（🗝️）をタップした場合は、盤面にあるロックを解除！
    if (tile.hasKey) {
      this.unlockTile(tile);
      sound.play('coin');
      this.showToast('カギで 🔒 ロックが解除された！✨');
    } else {
      sound.play('tap');
    }

    col.shift();
    this.renderSlots();
    this.renderTiles();
  },

  /** 待機中のスロットをタップして元の列に戻す */
  cancelSlot(si) {
    if (this.cleared) return false;
    if (this.boosts.undo === 0) {
      this.showToast('もどすの残りがないよ。空き枠を大切に！');
      return false;
    }
    const cancelled = this.colony.cancelSlot(si);
    if (cancelled && cancelled.colIndex >= 0) {
      this.columns[cancelled.colIndex].unshift(cancelled.tile);
      this.boosts.undo--;
      this.syncBoosters();
      this.refreshStuck();
      sound.play('tap');
      this.renderSlots();
      this.renderTiles();
      return true;
    }
    return false;
  },

  shakeTray() {
    this.slotsEl.classList.remove('shake');
    void this.slotsEl.offsetWidth; // reflow
    this.slotsEl.classList.add('shake');
  },

  updateCounter() {
    const c = this.colony;
    if (c.delivered !== this.lastDelivered) {
      this.lastDelivered = c.delivered;
      this.pctEl.textContent = `運んだ ${c.delivered} / ${c.total}`;
      const pct = c.total ? Math.round(c.delivered / c.total * 100) : 0;
      this.progressFill.style.width = `${pct}%`;
      this.progressText.textContent = `${pct}%`;
      this.progressEl.setAttribute('aria-valuenow', String(pct));
    }
  },

  loop(time) {
    if (!this.running) return;
    const dt = Math.min(0.05, (time - this.lastTime) / 1000);
    this.lastTime = time;
    this.audioCd = Math.max(0, this.audioCd - dt);

    const eaten = this.colony.update(dt, this.speedMul);
    if (eaten > 0 && this.audioCd <= 0) {
      playNibble(sound);
      this.audioCd = NIBBLE_GAP;
    }

    this.updateSlots();
    this.updateCounter();
    this.renderer.render(this.colony, this.lw, this.lh);

    if (!this.cleared && this.colony.delivered >= this.colony.total) {
      this.showClear();
    } else if (!this.cleared && !this.stuck && this.colony.isStuck()) {
      this.showStuck();
    }

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
    paintPicture(ctx, this.picture, 0, 0, 128 / SIZE);
    this.modal.style.display = 'flex';
  },

  showStuck() {
    this.stuck = true;
    sound.play('hit');
    this.syncBoosters();
    this.stuckModal.style.display = 'flex';
  },

  undoLastSlot() {
    const undoable = this.colony.slots.filter(s => s && s.left === s.initial && s.activeAnts === 0 && s.colIndex >= 0)
      .sort((a, b) => (b.placedAt ?? -1) - (a.placedAt ?? -1))[0];
    if (undoable) {
      const si = this.colony.slots.indexOf(undoable);
      if (this.cancelSlot(si)) this.showToast(`1手もどしたよ！ 残り${this.boosts.undo}回`);
    } else {
      this.showToast('もどせる待機中のタイルがありません');
    }
  },

  destroy() {
    this.running = false;
    stopNibbles(sound);
    clearTimeout(this.toastTimer);
    if (this.animId) { cancelAnimationFrame(this.animId); this.animId = null; }
    if (this.resizeObserver) this.resizeObserver.disconnect();
  },
};
