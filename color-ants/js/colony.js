/**
 * カラー・アント アリ軍団＆パズルシミュレーション
 *
 * 【重要ルール】
 * 1. 外側（露出ピクセル）からしか食べられない
 *    - 外部と4方向につながる空間に面したピクセルのみが標的。閉じた空洞は含めない。
 *    - 外側が削られることで、内側のピクセルが順次露出していく。
 * 2. 5つの出撃スロット
 *    - タップしたタイルはスロット（最大5枠）に入る。
 *    - スロット内のタイルから、現在露出しているピクセルに向かってアリが出撃。
 *    - タイルの残数が0になり、アリが全員帰還するとスロットが空く。
 *    - スロットが満杯で、かつどのアリも出撃できず止まったら「手詰まり（STUCK）」！
 */

import { SIZE } from './pictures.js?v=7';
import { Perimeter } from './perimeter.js?v=8';

const TAU = Math.PI * 2;
const SPAWN_GAP = 0.04; // アリの出撃間隔（秒）
const CHEW = 0.14;      // かじる時間（秒）

export function shade(hex, f) {
  const c = (i) => Math.max(0, Math.min(255, Math.round(parseInt(hex.slice(i, i + 2), 16) * f)));
  return `rgb(${c(1)},${c(3)},${c(5)})`;
}

export class Colony {
  constructor() {
    this.version = 0;
    this.reset(null);
  }

  reset(picture, rng = Math.random) {
    this.version++;
    this.picture = picture;
    this.pixels = picture ? picture.pixels : [];
    this.grid = new Array(SIZE * SIZE);
    for (const p of this.pixels) {
      this.grid[p.gy * SIZE + p.gx] = p;
      p.targeted = false;
    }

    this.ants = [];
    this.crumbs = [];
    this.fresh = []; // 描画側で消す必要のあるピクセル一覧

    // 食べるべき対象ピクセル数（背景を除く）
    this.targetPixels = this.pixels.filter(p => !p.isBg);
    this.total = this.targetPixels.length;
    this.remaining = this.total;
    this.delivered = 0;

    // 出撃スロット（最大5枠）
    this.slots = [null, null, null, null, null];

    this.pulse = 0;
    this.pulses = [0, 0, 0];
    this.time = 0;
    this.perimeter = new Perimeter(SIZE);
    this.perimeterDirty = true;
    this.layout = { cell: 5, boardX: 0, boardY: 0, nest: { x: 0, y: 0 }, nests: [{ x: 0, y: 0 }], ant: 7, speed: 100 };
  }

  setLayout(layout) {
    const previous = this.layout;
    if (previous && previous.cell > 0) for (const a of this.ants) {
      a.x = layout.boardX + (a.x - previous.boardX) * layout.cell / previous.cell;
      a.y = layout.boardY + (a.y - previous.boardY) * layout.cell / previous.cell;
    }
    this.layout = layout;
    if (!this.layout.nests) {
      this.layout.nests = this.layout.nest ? [this.layout.nest] : [{ x: 0, y: 0 }];
    }
    this.pulses = new Array(this.layout.nests.length).fill(0);
  }

  /** スロット枠を1つ拡張（最大6枠） */
  expandSlots() {
    if (this.slots.length < 6) {
      this.slots.push(null);
      return true;
    }
    return false;
  }

  pixelPos(p) {
    const { cell, boardX, boardY } = this.layout;
    return { x: boardX + (p.gx + 0.5) * cell, y: boardY + (p.gy + 0.5) * cell };
  }

  /**
   * ピクセルが「露出」しているか判定（外側ルール）
   * 外部からつながる空きマスに接していること。閉じた空洞は外郭ではない。
   */
  isExposed(p) {
    this.ensurePerimeter();
    return this.perimeter.isExposed(p);
  }

  ensurePerimeter() {
    if (!this.perimeterDirty) return;
    this.perimeter.rebuild(this.pixels);
    this.perimeterDirty = false;
  }

  /**
   * タイルを空きスロットに追加
   * @returns {number} 追加されたスロットのインデックス（満杯なら -1）
   */
  addTileToSlot(tile, hex, colIndex = -1) {
    const emptyIdx = this.slots.findIndex(s => s === null);
    if (emptyIdx === -1) return -1;

    this.slots[emptyIdx] = {
      tile,
      key: tile.key,
      hex,
      colIndex,
      left: tile.n,
      initial: tile.n,
      activeAnts: 0,
      spawnTimer: 0,
    };
    return emptyIdx;
  }

  /**
   * まだ1匹も出撃していないスロットをキャンセルして戻す
   */
  cancelSlot(si) {
    const slot = this.slots[si];
    if (!slot) return null;
    if (slot.left === slot.initial && slot.activeAnts === 0) {
      this.slots[si] = null;
      return slot;
    }
    return null;
  }

  /**
   * 簡易出撃（テストや単体呼び出し用）
   */
  deploy(key, hex, count) {
    const tile = { key, n: count };
    const idx = this.addTileToSlot(tile, hex);
    return idx !== -1 ? this.slots[idx] : null;
  }

  /**
   * 現在露出している、自分と同じ色のピクセルを探して確保
   */
  claimExposedPixel(key) {
    this.ensurePerimeter();
    // 巣穴に近い順、あるいは手前（下側）に近い順に探すと自然
    let best = null;
    let minDist = Infinity;
    const nestX = 31.5;
    const nestY = 68; // 巣穴の仮想方向

    for (const p of this.targetPixels) {
      if (p.key !== key || p.eaten || p.targeted) continue;
      if (this.perimeter.isExposed(p)) {
        const d = (p.gx - nestX) ** 2 + (p.gy - nestY) ** 2;
        if (d < minDist) {
          minDist = d;
          best = p;
        }
      }
    }

    if (best) {
      best.targeted = true;
      return best;
    }
    return null;
  }

  get busy() {
    return this.ants.length > 0 || this.slots.some(s => s !== null);
  }

  /**
   * 手詰まり（詰み）チェック
   * 5つのスロットが埋まり、活動中のアリもおらず、どのスロットの色も露出ピクセルが無い
   */
  isStuck() {
    if (this.slots.some(s => s === null)) return false; // 空きスロットがあるなら詰みではない
    if (this.ants.length > 0) return false; // アリが活動中なら削られて露出する可能性がある

    // 全スロットの色について、現在露出しているピクセルがあるか？
    for (const s of this.slots) {
      if (s && s.left > 0) {
        const hasExposed = this.targetPixels.some(p => p.key === s.key && !p.eaten && !p.targeted && this.isExposed(p));
        if (hasExposed) return false;
      }
    }
    return true; // どのスロットも出撃できず完全に止まった
  }

  moveToward(a, tx, ty, dist, eps) {
    const dx = tx - a.x, dy = ty - a.y;
    const d = Math.hypot(dx, dy);
    if (d <= eps) return true;
    a.ang = Math.atan2(dy, dx);
    const m = Math.min(dist, d);
    a.x += (dx / d) * m;
    a.y += (dy / d) * m;
    return d - m <= eps;
  }

  /** Follow the reserved route through exterior air; only its last node is food. */
  followRoute(a, distance) {
    while (a.routeIndex >= 0 && a.routeIndex < a.route.length) {
      const t = this.pixelPos(a.route[a.routeIndex]);
      const dx = t.x - a.x, dy = t.y - a.y, d = Math.hypot(dx, dy);
      if (d > 0) {
        a.ang = Math.atan2(dy, dx);
        const move = Math.min(distance, d);
        a.x += dx / d * move; a.y += dy / d * move;
        distance -= move;
        if (move < d) return false;
      }
      a.routeIndex += a.routeDirection;
      if (distance <= 0) return a.routeIndex < 0 || a.routeIndex >= a.route.length;
    }
    return true;
  }

  update(dt, speedMul = 1) {
    const L = this.layout;
    const step = dt * speedMul;
    this.time += step;
    this.pulse = Math.max(0, this.pulse - dt * 4);
    let eatenCount = 0;

    // スロットからのアリ出撃処理
    const nests = L.nests && L.nests.length > 0 ? L.nests : [L.nest || { x: 0, y: 0 }];
    if (this.pulses) {
      for (let i = 0; i < this.pulses.length; i++) this.pulses[i] = Math.max(0, this.pulses[i] - dt * 4);
    }

    for (let si = 0; si < this.slots.length; si++) {
      const slot = this.slots[si];
      if (!slot) continue;

      if (slot.left > 0) {
        slot.spawnTimer = Math.max(-0.05, slot.spawnTimer - step);
        if (slot.spawnTimer <= 0) {
          // 露出しているピクセルを探す
          const pixel = this.claimExposedPixel(slot.key);
          if (pixel) {
            slot.left--;
            slot.activeAnts++;
            slot.spawnTimer = SPAWN_GAP;

            const nestIdx = si % nests.length;
            const nest = nests[nestIdx];

            this.ants.push({
              slotIndex: si,
              nestIndex: nestIdx,
              x: nest.x,
              y: nest.y,
              px: pixel,
              hex: slot.hex,
              dark: shade(slot.hex, 0.55),
              state: 'out',
              chew: 0,
              ph: Math.random() * TAU,
              ang: -Math.PI / 2,
              carry: false,
              route: this.perimeter.routeTo(pixel),
              routeIndex: 0,
              routeDirection: 1,
            });
          }
        }
      }

      // 出撃完了＆アリが全員帰還したらスロット枠を空ける
      if (slot.left === 0 && slot.activeAnts === 0) {
        this.slots[si] = null;
      }
    }

    // アリの移動＆咀嚼更新
    const move = L.speed * step;
    for (const a of this.ants) {
      a.ph += step * 14;

      if (a.state === 'out') {
        const t = this.pixelPos(a.px);
        if (this.followRoute(a, move)) {
          // 到着・かじる（絵から消える）
          a.px.eaten = true;
          a.px.targeted = false;
          this.perimeterDirty = true;
          this.remaining--;
          this.fresh.push(a.px);
          eatenCount++;
          a.carry = true;
          a.state = 'chew';
          a.chew = CHEW;

          if (this.crumbs.length < 150) {
            for (let i = 0; i < 2; i++) {
              this.crumbs.push({
                x: t.x,
                y: t.y,
                vx: (Math.random() - 0.5) * 50,
                vy: (Math.random() - 0.8) * 50,
                life: 0.3,
                hex: a.hex,
              });
            }
          }
        }
      } else if (a.state === 'chew') {
        a.chew -= step;
        if (a.chew <= 0) {
          a.state = 'back';
          a.routeDirection = -1;
          a.routeIndex = a.route.length - 2;
        }
      } else if (a.state === 'back') {
        const nest = nests[a.nestIndex % nests.length] || nests[0];
        if (this.followRoute(a, move) && this.moveToward(a, nest.x, nest.y, move, L.ant * 0.3)) {
          a.state = 'done';
          this.delivered++;
          this.pulse = 1;
          if (this.pulses && this.pulses[a.nestIndex] !== undefined) {
            this.pulses[a.nestIndex] = 1;
          }
          // スロットの帰還カウント
          const slot = this.slots[a.slotIndex];
          if (slot) {
            slot.activeAnts--;
          }
        }
      }
    }

    this.ants = this.ants.filter(a => a.state !== 'done');

    // かけらパーティクル
    for (const c of this.crumbs) {
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.vy += 140 * dt;
      c.life -= dt;
    }
    this.crumbs = this.crumbs.filter(c => c.life > 0);

    return eatenCount;
  }

  /**
   * お助けアイテム：マグネット（一発そうじ）
   * 現在外側に露出しているピクセルを最大25個、一気に回収して消去する
   */
  useMagnet() {
    const exposedCounts = {};
    for (const p of this.targetPixels) {
      if (!p.eaten && !p.targeted && this.isExposed(p)) {
        exposedCounts[p.key] = (exposedCounts[p.key] || 0) + 1;
      }
    }
    const entries = Object.entries(exposedCounts);
    if (entries.length === 0) return null;
    entries.sort((a, b) => b[1] - a[1]);
    const targetKey = entries[0][0];

    const harvested = [];
    for (const p of this.targetPixels) {
      if (p.key === targetKey && !p.eaten && !p.targeted && this.isExposed(p)) {
        p.eaten = true;
        this.perimeterDirty = true;
        this.remaining--;
        this.delivered++;
        this.fresh.push(p);
        harvested.push(p);
        if (harvested.length >= 25) break;
      }
    }

    // Consume exactly this much unspawned credit, across all matching slots.
    let unassigned = harvested.length;
    for (let si = 0; si < this.slots.length; si++) {
      const s = this.slots[si];
      if (s && s.key === targetKey && s.left > 0) {
        const take = Math.min(s.left, unassigned);
        s.left -= take;
        unassigned -= take;
        if (s.left === 0 && s.activeAnts === 0) {
          this.slots[si] = null;
        }
        if (unassigned === 0) break;
      }
    }

    // 金色の星パーティクルを発生
    for (const p of harvested) {
      const pos = this.pixelPos(p);
      for (let i = 0; i < 2; i++) {
        this.crumbs.push({
          x: pos.x,
          y: pos.y,
          vx: (Math.random() - 0.5) * 80,
          vy: -20 - Math.random() * 60,
          life: 0.6,
          hex: '#ffd700',
          isStar: true,
        });
      }
    }

    return { key: targetKey, count: harvested.length, unassigned };
  }
}
