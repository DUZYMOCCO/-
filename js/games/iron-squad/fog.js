/**
 * Fog of war / exploration (bit grid).
 * WORLD_SIZE 158720 / FOG_CELL 512 → 310×310 cells → ~12KB Uint8Array.
 * Reveal is circle-stamped on move; draw uses run-length fillRect batches (v1.24.3).
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
    this._lastX = NaN;
    this._lastY = NaN;
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
    return this.isExplored(Math.floor(x / this.cell), Math.floor(y / this.cell));
  }

  mark(gx, gy) {
    if (gx < 0 || gy < 0 || gx >= this.cols || gy >= this.rows) return false;
    const i = this._bitIndex(gx, gy);
    const mask = 1 << (i & 7);
    const bi = i >> 3;
    if ((this.bytes[bi] & mask) === 0) {
      this.bytes[bi] |= mask;
      this.dirty = true;
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

  revealCamp(cx, cy) {
    this._lastX = NaN;
    this._lastY = NaN;
    return this.revealAt(cx, cy, FOG_CAMP_REVEAL);
  }

  /** Persist as base64 bitfield (~16KB text). */
  serialize() {
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
    try {
      const bin = atob(b64);
      const n = Math.min(bin.length, this.bytes.length);
      for (let i = 0; i < n; i++) this.bytes[i] = bin.charCodeAt(i) & 255;
      this.dirty = true;
      this._lastX = NaN;
      this._lastY = NaN;
      return true;
    } catch (_) {
      return false;
    }
  }

  /** True if any cell has been revealed (grid ready). */
  hasExploration() {
    const bytes = this.bytes;
    if (!bytes || !bytes.length) return false;
    for (let i = 0; i < bytes.length; i++) if (bytes[i]) return true;
    return false;
  }

  /**
   * Field overlay in world space (camera transform already applied).
   * O(visible fog cells) fillRect — typically a few dozen on iPhone.
   * Safety (v1.24.3): never paint full-black when grid missing/empty/uninitialized.
   */
  drawFieldOverlay(ctx, camera, width, height, zoom) {
    if (!ctx || !camera) return;
    if (!Number.isFinite(this.cols) || !Number.isFinite(this.rows) || this.cols <= 0 || this.rows <= 0) return;
    if (!this.bytes || !this.bytes.length) return;
    if (!this.hasExploration()) return; // unseeded → leave world visible
    if (!Number.isFinite(camera.x) || !Number.isFinite(camera.y)) return;
    const z = (Number.isFinite(zoom) && zoom > 0) ? zoom : 1;
    const w = Number.isFinite(width) ? width : 0;
    const h = Number.isFinite(height) ? height : 0;
    if (w < 8 || h < 8) return;
    const hw = w / (2 * z);
    const hh = h / (2 * z);
    const cell = this.cell;
    const gx0 = Math.max(0, Math.floor((camera.x - hw) / cell));
    const gy0 = Math.max(0, Math.floor((camera.y - hh) / cell));
    const gx1 = Math.min(this.cols - 1, Math.floor((camera.x + hw) / cell));
    const gy1 = Math.min(this.rows - 1, Math.floor((camera.y + hh) / cell));
    if (gx1 < gx0 || gy1 < gy0) return;
    // Perf v1.24.2: horizontal run-length batching — far fewer fillRect calls than per-cell.
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
    const scale = size / worldSize;
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
    if (!this.isExploredWorld(worldX, worldY)) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(sx, sy, sw + 0.5, sh + 0.5);
      return true;
    }
    return false;
  }
}
