// ゾンビの みちさがし（v0.6.0）
// - FlatNav: いままでの ひらたい グリッド（むかしの マップは まったく おなじ うごき）
// - LayerNav: なんかいも ある たてもの・やね（かいだん・スロープを のぼる）
//   マスごとに「たてる たかさ」（じめん＋はこの うえ）を もち、となりへ のぼれるか（だんさ ≤ step）／おりられるか で つなぐ。
//   プレイヤーの いる ところから ぎゃくむきに BFS → ゾンビは きょりが へる ほうへ すすむ。
import { buildGrid, updateFlow, flowDir, gridLineClear, cellOf, openCells } from './rules.js?v=16';

export const NAV = { cell: 0.5, step: 0.33, drop: 4.6, head: 1.55, inflate: 0.3, far: 100000, near: 3.2 };

export class FlatNav {
  constructor(boxes, half) {
    this.grid = buildGrid(boxes, half + 4, 1, 0.4);
    this.layered = false;
  }
  update(px, py, pz) { updateFlow(this.grid, px, pz); }
  dir(x, y, z) { return flowDir(this.grid, x, z); }
  lineClear(x0, y0, z0, x1, y1, z1) { return gridLineClear(this.grid, x0, z0, x1, z1); }
  reachable() { return false; }
  free(x, y, z) { const i = cellOf(this.grid, x, z); return !this.grid.blocked[i] && this.grid.dist[i] >= 0; }
  openCells(limit) { return openCells(this.grid, limit).map(([x, z]) => [x, z, 0]); }
}

export class LayerNav {
  constructor(boxes, half, opt = {}) {
    const o = { ...NAV, ...opt };
    this.o = o; this.layered = true;
    const cell = o.cell, n = Math.ceil((half * 2) / cell);
    this.n = n; this.half = half; this.cell = cell;
    // マスごとに かかる はこ
    const per = Array.from({ length: n * n }, () => null);
    const add = (i, b) => { (per[i] || (per[i] = [])).push(b); };
    const inf = o.inflate;
    for (const b of boxes) {
      const x0 = Math.max(0, Math.floor((b.minX - inf + half) / cell)), x1 = Math.min(n - 1, Math.floor((b.maxX + inf + half) / cell));
      const z0 = Math.max(0, Math.floor((b.minZ - inf + half) / cell)), z1 = Math.min(n - 1, Math.floor((b.maxZ + inf + half) / cell));
      for (let gz = z0; gz <= z1; gz++) for (let gx = x0; gx <= x1; gx++) add(gz * n + gx, b);
    }
    const start = new Int32Array(n * n + 1), hs = [], solid = [];
    for (let i = 0; i < n * n; i++) {
      start[i] = hs.length;
      const list = per[i];
      const cx = -half + ((i % n) + 0.5) * cell, cz = -half + (((i / n) | 0) + 0.5) * cell;
      const cand = [0];
      if (list) for (const b of list) if (cx > b.minX && cx < b.maxX && cz > b.minZ && cz < b.maxZ && b.maxY > 0.05 && !b.noTop) { cand.push(b.maxY); (solid[i] || (solid[i] = [])).push(b); }
      cand.sort((a, c) => a - c);
      let last = -1;
      for (const h of cand) {
        if (h - last < 0.05) continue;
        let ok = true;
        if (list) for (const b of list) {
          if (cx > b.minX - inf && cx < b.maxX + inf && cz > b.minZ - inf && cz < b.maxZ + inf && b.maxY > h + 0.3 && b.minY < h + o.head) { ok = false; break; }
        }
        if (ok) { hs.push(h); last = h; }
      }
    }
    start[n * n] = hs.length;
    this.start = start; this.h = Float32Array.from(hs);
    const N = hs.length; this.N = N;
    this.cellOfNode = new Int32Array(N);
    for (let i = 0; i < n * n; i++) for (let k = start[i]; k < start[i + 1]; k++) this.cellOfNode[k] = i;
    // となり への いどう（いちばん たかい ≤ h+step の ゆかに のる）
    const succ = new Int32Array(N * 8).fill(-1);
    const land = (c, h) => { let r = -1; for (let k = start[c]; k < start[c + 1]; k++) if (this.h[k] <= h + o.step) r = k; return r; };
    // おりる とき: あいだに ゆか（はこ）が あれば おりられない（ゆかを すりぬけない）
    const through = (c, h, hb) => { const L = solid[c]; if (L) for (const b of L) if (b.minY < h - 0.05 && b.maxY > hb + 0.3) return true; return false; };
    // おりる さきの まんなかが ほかの はこの ふちに ちかすぎる（あしが のこって おりられない）
    const ledge = (c, h, hb) => {
      const L = per[c]; if (!L) return false;
      const cx = -half + ((c % n) + 0.5) * cell, cz = -half + (((c / n) | 0) + 0.5) * cell;
      for (const b of L) if (b.maxY > hb + 0.3 && b.maxY <= h + o.step && !b.noTop) {
        const dx = Math.max(b.minX - cx, 0, cx - b.maxX), dz = Math.max(b.minZ - cz, 0, cz - b.maxZ);
        if (Math.hypot(dx, dz) < 0.22) return true;
      }
      return false;
    };
    const near = (c, h) => { for (let k = start[c]; k < start[c + 1]; k++) if (Math.abs(this.h[k] - h) <= o.step) return true; return false; };
    let e = 0;
    for (let a = 0; a < N; a++) {
      const c = this.cellOfNode[a], gx = c % n, gz = (c / n) | 0, h = this.h[a];
      let d = 0;
      for (let oz = -1; oz <= 1; oz++) for (let ox = -1; ox <= 1; ox++) {
        if (!ox && !oz) continue;
        const nx = gx + ox, nz = gz + oz;
        if (nx < 0 || nz < 0 || nx >= n || nz >= n) { d++; continue; }
        const b = land(nz * n + nx, h);
        if (b >= 0 && h - this.h[b] <= o.drop && (h - this.h[b] < 0.4 || (!through(nz * n + nx, h, this.h[b]) && !ledge(nz * n + nx, h, this.h[b]))) && (!(ox && oz) || (near(gz * n + nx, h) && near(nz * n + gx, h)))) { succ[a * 8 + d] = b; e++; }
        d++;
      }
    }
    this.succ = succ;
    // ぎゃくむきの つながり（CSR）
    const pc = new Int32Array(N + 1);
    for (let i = 0; i < N * 8; i++) if (succ[i] >= 0) pc[succ[i] + 1]++;
    for (let i = 0; i < N; i++) pc[i + 1] += pc[i];
    const pred = new Int32Array(e), fill = pc.slice(0, N);
    for (let a = 0; a < N; a++) for (let d = 0; d < 8; d++) { const b = succ[a * 8 + d]; if (b >= 0) pred[fill[b]++] = a; }
    this.predStart = pc; this.pred = pred;
    this.dist = new Int32Array(N).fill(-1); this.queue = new Int32Array(N);
    this.target = -1;
  }
  cellIndex(x, z) {
    const n = this.n;
    const gx = Math.min(n - 1, Math.max(0, Math.floor((x + this.half) / this.cell)));
    const gz = Math.min(n - 1, Math.max(0, Math.floor((z + this.half) / this.cell)));
    return gz * n + gx;
  }
  nodeIn(c, y) { let r = -1; for (let k = this.start[c]; k < this.start[c + 1]; k++) if (this.h[k] <= y + 0.35) r = k; return r; }
  // いる ところの マス（かべの そば で マスが ない ときは となりを みる）
  nodeAt(x, y, z) {
    const c = this.cellIndex(x, z);
    let r = this.nodeIn(c, y);
    if (r >= 0 && y - this.h[r] < 1.2) return r;
    const n = this.n, gx = c % n, gz = (c / n) | 0;
    let best = r, bh = r >= 0 ? this.h[r] : -1;
    for (let oz = -1; oz <= 1; oz++) for (let ox = -1; ox <= 1; ox++) {
      const nx = gx + ox, nz = gz + oz;
      if ((!ox && !oz) || nx < 0 || nz < 0 || nx >= n || nz >= n) continue;
      const k = this.nodeIn(nz * n + nx, y);
      if (k < 0) continue;
      // たかい ほう。おなじ たかさ なら ゴールに ちかい ほう（いったり きたり しない）
      const kd = this.dist && this.dist[k] >= 0 ? this.dist[k] : 1e9, bd = best >= 0 && this.dist && this.dist[best] >= 0 ? this.dist[best] : 1e9;
      if (this.h[k] > bh + 0.01 || (Math.abs(this.h[k] - bh) <= 0.01 && kd < bd)) { best = k; bh = this.h[k]; }
    }
    return best;
  }
  nodeX(k) { return -this.half + ((this.cellOfNode[k] % this.n) + 0.5) * this.cell; }
  nodeZ(k) { return -this.half + (((this.cellOfNode[k] / this.n) | 0) + 0.5) * this.cell; }
  update(px, py, pz) {
    const t = this.nodeAt(px, py, pz);
    this.target = t;
    const { dist, queue, pred, predStart } = this;
    dist.fill(-1);
    if (t < 0) return;
    let head = 0, tail = 0;
    dist[t] = 0; queue[tail++] = t;
    const run = () => {
      while (head < tail) {
        const b = queue[head++], d = dist[b] + 1;
        for (let k = predStart[b]; k < predStart[b + 1]; k++) { const a = pred[k]; if (dist[a] < 0) { dist[a] = d; queue[tail++] = a; } }
      }
    };
    run();
    // とどかない ところ（はこの うえ など）に いる → ちかくの ゆかに あつまる
    const o = this.o, n = this.n, r = Math.ceil(o.near / this.cell), c0 = this.cellIndex(px, pz), gx0 = c0 % n, gz0 = (c0 / n) | 0, py0 = this.h[t];
    const seeds = [];
    for (let oz = -r; oz <= r; oz++) for (let ox = -r; ox <= r; ox++) {
      const nx = gx0 + ox, nz = gz0 + oz;
      if (nx < 0 || nz < 0 || nx >= n || nz >= n) continue;
      const c = nz * n + nx, dd = Math.hypot(ox, oz) * this.cell;
      if (dd > o.near) continue;
      for (let k = this.start[c]; k < this.start[c + 1]; k++) {
        if (dist[k] >= 0 || this.h[k] > py0 + 0.35 || this.h[k] < py0 - o.drop) continue;
        seeds.push([k, dd]);
      }
    }
    if (!seeds.length) return;
    seeds.sort((a, b) => a[1] - b[1]);
    for (const [k, dd] of seeds) if (dist[k] < 0) { dist[k] = o.far + Math.round(dd / this.cell); queue[tail++] = k; }
    run();
  }
  distAt(x, y, z) { const k = this.nodeAt(x, y, z); return k < 0 ? -1 : this.dist[k]; }
  reachable(x, y, z) { const d = this.distAt(x, y, z); return d >= 0 && d < this.o.far; }
  free(x, y, z) { const k = this.nodeAt(x, y, z); return k >= 0 && this.dist[k] >= 0; }
  // すすむ ほうこう（となりで いちばん ちかい マスの まんなかへ）
  dir(x, y, z) {
    let a = this.nodeAt(x, y, z);
    // ゆかの はしで、したの マスの ほうが ちかい → そのまま すすんで おりる（いったり きたり しない）
    if (a < 0 || this.dist[a] < 0) return null;
    const here = this.cellIndex(x, z);
    let best = this.dist[a], bk = -1;
    for (let d = 0; d < 8; d++) {
      const b = this.succ[a * 8 + d];
      // おなじ ちかさ なら いま いる マスの ほうへ（ゆかの はしで いったり きたり しない）
      if (b >= 0 && this.dist[b] >= 0 && (this.dist[b] < best || (bk >= 0 && this.dist[b] === best && this.cellOfNode[b] === here))) { best = this.dist[b]; bk = b; }
    }
    // つぎの マスに もう はいっている（ゆかの はしの うえ）→ その マスの まんなかへ すすんで おりる
    if (bk >= 0 && this.cellOfNode[bk] !== here) {
      for (let d = 0; d < 8; d++) { const b = this.succ[a * 8 + d]; if (b >= 0 && this.cellOfNode[b] === here && this.dist[b] >= 0 && this.dist[b] < this.dist[a]) { bk = b; break; } }
    }
    if (bk < 0) return null;
    const tx = this.nodeX(bk) - x, tz = this.nodeZ(bk) - z, l = Math.hypot(tx, tz) || 1;
    return { x: tx / l, z: tz / l, y: this.h[bk] };
  }
  // おなじ たかさで まっすぐ いけるか
  lineClear(x0, y0, z0, x1, y1, z1) {
    if (Math.abs(y1 - y0) > 0.4) return false;
    const steps = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / (this.cell * 0.5));
    for (let s = 1; s < steps; s++) {
      const t = s / steps, c = this.cellIndex(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t), y = y0 + (y1 - y0) * t;
      let ok = false;
      for (let k = this.start[c]; k < this.start[c + 1]; k++) if (Math.abs(this.h[k] - y) <= 0.3) { ok = true; break; }
      if (!ok) return false;
    }
    return true;
  }
  // おじさんを おく ひろい ばしょ（プレイヤーから いける・まわり 8マスも おなじ たかさ）
  openCells(limit = this.half - 3) {
    const out = [], n = this.n;
    for (let a = 0; a < this.N; a++) {
      const d = this.dist[a];
      if (d < 0 || d >= this.o.far) continue;
      const c = this.cellOfNode[a], gx = c % n, gz = (c / n) | 0;
      if (gx % 2 || gz % 2) continue; // まばらに（かず を へらす）
      let ok = true;
      for (let k = 0; k < 8 && ok; k++) { const b = this.succ[a * 8 + k]; if (b < 0 || Math.abs(this.h[b] - this.h[a]) > 0.05) ok = false; }
      if (!ok) continue;
      const x = this.nodeX(a), z = this.nodeZ(a);
      if (Math.abs(x) > limit || Math.abs(z) > limit) continue;
      out.push([x, z, this.h[a]]);
    }
    return out;
  }
}

export function makeNav(boxes, map) {
  return map.vertical ? new LayerNav(boxes, map.half + 2) : new FlatNav(boxes, map.half);
}
