/**
 * Fog of war / exploration (bit grid).
 * WORLD_SIZE 158720 / FOG_CELL 512 → 310×310 cells → ~12KB Uint8Array.
 * Reveal is circle-stamped on move; draw uses run-length fillRect batches (v1.24.3).
 * v1.25.8: never full-black wipe — empty/invalid/viewport-unseeded skips overlay;
 * camp+player always stampable; deserialize clears+validates.
 * v1.25.11: player-cell fail-safe + viewport reseed before paint; forceRevealAt
 * ignores move-eps so camp→player stamp cannot early-out; never bury hero in #000.
 * iPhone-safe: no getImageData, no full-screen canvas rebuild every frame.
 */
import { WORLD_SIZE } from './world.js';

export const FOG_CELL = 512;
export const FOG_REVEAL_RADIUS = 980;
export const FOG_CAMP_REVEAL = 1600;
/** Skip re-stamp until player moved this far (world px). */
const REVEAL_MOVE_EPS = FOG_CELL * 0.28;

export class FogGrid {
  constructor(worldSize = WORLD_SIZE, cell = FOG_CELL) {
    const size = Number.isFinite(worldSize) && worldSize > 0 ? worldSize : WORLD_SIZE;
    const c = Number.isFinite(cell) && cell > 0 ? cell : FOG_CELL;
    this.cell = c;
    this.worldSize = size;
    this.cols = Math.max(1, Math.ceil(size / c));
    this.rows = Math.max(1, Math.ceil(size / c));
    this.bytes = new Uint8Array(Math.ceil((this.cols * this.rows) / 8));
    this.dirty = true;
    this.revision = 0;
    this._lastX = NaN;
    this._lastY = NaN;
    this._campSeeded = false;
    this._exploredHint = false; // lazy cache for hasExploration
  }

  _expectedByteLength() {
    return Math.ceil((this.cols * this.rows) / 8);
  }

  /** Grid usable for overlay (finite dims + matching buffer). */
  isValid() {
    if (!Number.isFinite(this.cols) || !Number.isFinite(this.rows)) return false;
    if (this.cols <= 0 || this.rows <= 0) return false;
    if (!Number.isFinite(this.cell) || this.cell <= 0) return false;
    if (!this.bytes || !(this.bytes instanceof Uint8Array)) return false;
    if (this.bytes.length !== this._expectedByteLength()) return false;
    return true;
  }

  _bitIndex(gx, gy) {
    return gy * this.cols + gx;
  }

  isExplored(gx, gy) {
    if (gx < 0 || gy < 0 || gx >= this.cols || gy >= this.rows) return false;
    const i = this._bitIndex(gx, gy);
    return (this.bytes[i >> 3] & (1 << (i & 7))) !== 0;
  }

  isExploredWorld(x, y) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
    return this.isExplored(Math.floor(x / this.cell), Math.floor(y / this.cell));
  }

  mark(gx, gy) {
    if (gx < 0 || gy < 0 || gx >= this.cols || gy >= this.rows) return false;
    const i = this._bitIndex(gx, gy);
    const mask = 1 << (i & 7);
    const bi = i >> 3;
    if ((this.bytes[bi] & mask) === 0) {
      this.bytes[bi] |= mask;
      this.revision++;
      this.dirty = true;
      this._exploredHint = true;
      return true;
    }
    return false;
  }

  /**
   * Stamp a circle of explored cells around (wx, wy).
   * Returns true if any new cell was revealed.
   */
  revealAt(wx, wy, radius = FOG_REVEAL_RADIUS) {
    if (!Number.isFinite(wx) || !Number.isFinite(wy)) return false;
    if (!this.isValid()) return false;
    if (Number.isFinite(this._lastX)) {
      const mdx = wx - this._lastX;
      const mdy = wy - this._lastY;
      if (mdx * mdx + mdy * mdy < REVEAL_MOVE_EPS * REVEAL_MOVE_EPS) return false;
    }
    this._lastX = wx;
    this._lastY = wy;
    const cell = this.cell;
    const r = Math.max(cell, radius);
    const rSq = r * r;
    const gx0 = Math.max(0, Math.floor((wx - r) / cell));
    const gy0 = Math.max(0, Math.floor((wy - r) / cell));
    const gx1 = Math.min(this.cols - 1, Math.floor((wx + r) / cell));
    const gy1 = Math.min(this.rows - 1, Math.floor((wy + r) / cell));
    let changed = false;
    for (let gy = gy0; gy <= gy1; gy++) {
      const cy = (gy + 0.5) * cell;
      const dy = cy - wy;
      for (let gx = gx0; gx <= gx1; gx++) {
        const cx = (gx + 0.5) * cell;
        const dx = cx - wx;
        if (dx * dx + dy * dy <= rSq) {
          if (this.mark(gx, gy)) changed = true;
        }
      }
    }
    return changed;
  }

  /** Stamp ignoring move-eps (camp/FT/draw fail-safe). */
  forceRevealAt(wx, wy, radius = FOG_REVEAL_RADIUS) {
    this._lastX = NaN;
    this._lastY = NaN;
    return this.revealAt(wx, wy, radius);
  }

  revealCamp(cx, cy) {
    this._lastX = NaN;
    this._lastY = NaN;
    const ok = this.revealAt(cx, cy, FOG_CAMP_REVEAL);
    this._campSeeded = true;
    return ok;
  }

  /** Persist as base64 bitfield (~16KB text). */
  serialize() {
    if (!this.isValid()) return '';
    const bytes = this.bytes;
    const chunk = 0x8000;
    let bin = '';
    for (let i = 0; i < bytes.length; i += chunk) {
      const end = Math.min(i + chunk, bytes.length);
      bin += String.fromCharCode.apply(null, bytes.subarray(i, end));
    }
    return btoa(bin);
  }

  deserialize(b64) {
    if (!b64 || typeof b64 !== 'string') return false;
    if (!this.isValid()) return false;
    try {
      const bin = atob(b64);
      // Reject wildly wrong payloads (wrong world / corrupt) — leave grid empty for reseed.
      if (bin.length === 0) return false;
      if (bin.length > this.bytes.length * 2) return false;
      // Always clear first so short/stale saves cannot leave ghost bits.
      this.bytes.fill(0);
      const n = Math.min(bin.length, this.bytes.length);
      let any = false;
      for (let i = 0; i < n; i++) {
        const v = bin.charCodeAt(i) & 255;
        this.bytes[i] = v;
        if (v) any = true;
      }
      this.dirty = true;
      this._lastX = NaN;
      this.revision++;
      this._lastY = NaN;
      this._exploredHint = any;
      this._campSeeded = false;
      return true;
    } catch (_) {
      return false;
    }
  }

  /** True if any cell has been revealed (grid ready). */
  hasExploration() {
    if (!this.isValid()) return false;
    if (this._exploredHint) return true;
    const bytes = this.bytes;
    for (let i = 0; i < bytes.length; i++) {
      if (bytes[i]) {
        this._exploredHint = true;
        return true;
      }
    }
    return false;
  }

  /** Count explored cells inside inclusive gx/gy window (cheap early-out). */
  _countExploredInView(gx0, gy0, gx1, gy1) {
    let n = 0;
    for (let gy = gy0; gy <= gy1; gy++) {
      for (let gx = gx0; gx <= gx1; gx++) {
        if (this.isExplored(gx, gy)) {
          n++;
          if (n >= 1) return n; // only need "any"
        }
      }
    }
    return n;
  }

  /**
   * Field overlay in world space (camera transform already applied).
   * O(visible fog cells) fillRect — typically a few dozen on iPhone.
   * Safety (v1.25.11):
   *  - auto-reveal around player if their cell is dark
   *  - if viewport has zero explored → force-seed camera/player then skip if still zero
   *  - hard-skip overlay if player cell remains unexplored (never bury hero in #000)
   */
  drawFieldOverlay(ctx, camera, width, height, zoom, playerX, playerY) {
    if (!ctx || !camera) return;
    if (!this.isValid()) return;
    if (!Number.isFinite(camera.x) || !Number.isFinite(camera.y)) return;
    const z = (Number.isFinite(zoom) && zoom > 0) ? zoom : 1;
    const w = Number.isFinite(width) ? width : 0;
    const h = Number.isFinite(height) ? height : 0;
    if (w < 8 || h < 8) return;

    const hasPlayer = Number.isFinite(playerX) && Number.isFinite(playerY);
    const cell = this.cell;

    // Player-cell fail-safe: stamp before any paint decision
    if (hasPlayer && !this.isExploredWorld(playerX, playerY)) {
      this.forceRevealAt(playerX, playerY, FOG_REVEAL_RADIUS);
      this.mark(Math.floor(playerX / cell), Math.floor(playerY / cell));
    }

    if (!this.hasExploration()) return; // unseeded → leave world visible

    const hw = w / (2 * z);
    const hh = h / (2 * z);
    const gx0 = Math.max(0, Math.floor((camera.x - hw) / cell));
    const gy0 = Math.max(0, Math.floor((camera.y - hh) / cell));
    const gx1 = Math.min(this.cols - 1, Math.floor((camera.x + hw) / cell));
    const gy1 = Math.min(this.rows - 1, Math.floor((camera.y + hh) / cell));
    if (gx1 < gx0 || gy1 < gy0) return;

    let inView = this._countExploredInView(gx0, gy0, gx1, gy1);
    if (inView < 1) {
      // Global bits exist elsewhere, but nothing in this camera window — seed then fail-open
      const sx = hasPlayer ? playerX : camera.x;
      const sy = hasPlayer ? playerY : camera.y;
      this.forceRevealAt(sx, sy, FOG_REVEAL_RADIUS);
      if (hasPlayer) this.mark(Math.floor(playerX / cell), Math.floor(playerY / cell));
      inView = this._countExploredInView(gx0, gy0, gx1, gy1);
      if (inView < 1) return; // still nothing — skip overlay (world stays visible)
    }

    // Hard guard: never paint fog while the hero cell is still dark
    if (hasPlayer && !this.isExploredWorld(playerX, playerY)) return;

    // Perf v1.24.2: horizontal run-length batching — far fewer fillRect calls than per-cell.
    // Hide unexplored cells again; the reveal guards above keep the hero visible.
    ctx.fillStyle = '#000000';
    for (let gy = gy0; gy <= gy1; gy++) {
      let runStart = -1;
      for (let gx = gx0; gx <= gx1; gx++) {
        const dark = !this.isExplored(gx, gy);
        if (dark) {
          if (runStart < 0) runStart = gx;
        } else if (runStart >= 0) {
          ctx.fillRect(runStart * cell, gy * cell, (gx - runStart) * cell + 0.5, cell + 0.5);
          runStart = -1;
        }
      }
      if (runStart >= 0) {
        ctx.fillRect(runStart * cell, gy * cell, (gx1 - runStart + 1) * cell + 0.5, cell + 0.5);
      }
    }
  }

  /**
   * World-map / overview overlay in screen pixels.
   * Coarse step when cells are sub-pixel to keep iPhone map open snappy.
   */
  drawMapOverlay(ctx, size, worldSize = this.worldSize) {
    if (!ctx || !size) return;
    if (!this.isValid() || !this.hasExploration()) return;
    const ws = Number.isFinite(worldSize) && worldSize > 0 ? worldSize : this.worldSize;
    const scale = size / ws;
    const cellPx = this.cell * scale;
    const step = Math.max(1, Math.ceil(2.5 / Math.max(0.01, cellPx)));
    ctx.fillStyle = '#000000';
    for (let gy = 0; gy < this.rows; gy += step) {
      for (let gx = 0; gx < this.cols; gx += step) {
        let any = false;
        const yMax = Math.min(step, this.rows - gy);
        const xMax = Math.min(step, this.cols - gx);
        outer: for (let dy = 0; dy < yMax; dy++) {
          for (let dx = 0; dx < xMax; dx++) {
            if (this.isExplored(gx + dx, gy + dy)) {
              any = true;
              break outer;
            }
          }
        }
        if (!any) {
          ctx.fillRect(gx * cellPx, gy * cellPx, cellPx * xMax + 0.5, cellPx * yMax + 0.5);
        }
      }
    }
  }

  /** Minimap: darken a screen rect if its world center is unexplored. */
  shadeMinimapCell(ctx, worldX, worldY, sx, sy, sw, sh) {
    if (!this.isValid() || !this.hasExploration()) return false;
    if (!this.isExploredWorld(worldX, worldY)) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(sx, sy, sw + 0.5, sh + 0.5);
      return true;
    }
    return false;
  }
}
