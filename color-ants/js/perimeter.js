/** Outside-connected air, shared by movement, eating and puzzle generation. */
export class Perimeter {
  constructor(size) {
    this.size = size;
    this.stride = size + 2;
    const n = this.stride ** 2;
    this.open = new Uint8Array(n);
    this.parent = new Int32Array(n);
    this.distance = new Int32Array(n);
    this.queue = new Int32Array(n);
    this.frontier = new Uint8Array(size * size);
    this.steps = [-this.stride, this.stride, -1, 1];
  }

  rebuild(pixels) {
    const s = this.stride, n = this.size;
    this.open.fill(0);
    this.parent.fill(-2);
    this.distance.fill(-1);
    this.frontier.fill(0);
    for (let i = 0; i < s; i++) {
      this.open[i] = this.open[(s - 1) * s + i] = 1;
      this.open[i * s] = this.open[i * s + s - 1] = 1;
    }
    for (const p of pixels) if (p.eaten) this.open[(p.gy + 1) * s + p.gx + 1] = 1;
    // The padded ring lets ants walk around any side without crossing the art.
    this.root = (n + 1) * s + Math.floor(n / 2) + 1;
    let head = 0, tail = 1;
    this.queue[0] = this.root;
    this.parent[this.root] = -1;
    this.distance[this.root] = 0;
    while (head < tail) {
      const i = this.queue[head++], x = i % s;
      for (const step of this.steps) {
        if ((step === -1 && x === 0) || (step === 1 && x === s - 1)) continue;
        const next = i + step;
        if (next < 0 || next >= this.open.length || !this.open[next] || this.parent[next] !== -2) continue;
        this.parent[next] = i;
        this.distance[next] = this.distance[i] + 1;
        this.queue[tail++] = next;
      }
    }
    for (const p of pixels) {
      if (p.eaten) continue;
      const i = (p.gy + 1) * s + p.gx + 1;
      if (this.distance[i - s] >= 0 || this.distance[i + s] >= 0 || this.distance[i - 1] >= 0 || this.distance[i + 1] >= 0) {
        this.frontier[p.gy * n + p.gx] = 1;
      }
    }
  }

  entry(p) {
    if (p.eaten) return -1;
    const s = this.stride, i = (p.gy + 1) * s + p.gx + 1;
    let best = -1, distance = Infinity;
    for (const next of [i + s, i - 1, i + 1, i - s]) {
      if (this.distance[next] >= 0 && this.distance[next] < distance) {
        best = next; distance = this.distance[next];
      }
    }
    return best;
  }

  isExposed(p) { return !p.eaten && this.frontier[p.gy * this.size + p.gx] === 1; }

  routeTo(p) {
    let i = this.entry(p);
    if (i === -1) return null;
    const route = [];
    while (i !== -1) {
      route.push({ gx: i % this.stride - 1, gy: Math.floor(i / this.stride) - 1 });
      i = this.parent[i];
    }
    route.reverse();
    route.push({ gx: p.gx, gy: p.gy });
    return route;
  }
}
