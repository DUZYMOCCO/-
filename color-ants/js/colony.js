/**
 * カラー・アント アリ軍団シミュレーション（DOM 非依存）
 * タイルをタップ → 巣穴からアリが1匹ずつ出発 → 同じ色のピクセルを1つかじって
 * くわえ → 巣穴へ帰る（帰ったら「運んだ数」が1増える）
 */

const TAU = Math.PI * 2;
const SPAWN_GAP = 0.03; // 1匹ずつ出てくる間隔（秒）
const CHEW = 0.18;      // ピクセルをかじる時間（秒）

export function shade(hex, f) {
  const c = (i) => Math.max(0, Math.min(255, Math.round(parseInt(hex.slice(i, i + 2), 16) * f)));
  return `rgb(${c(1)},${c(3)},${c(5)})`;
}

export class Colony {
  constructor() { this.version = 0; this.reset(null); }

  reset(picture, rng = Math.random) {
    this.version++;
    this.pixels = picture ? picture.pixels : [];
    this.ants = [];
    this.spawners = [];
    this.crumbs = [];
    this.fresh = [];        // 描画側がまだ消していない（かじられた）ピクセル
    this.remaining = this.pixels.length; // まだ絵に残っているピクセル
    this.delivered = 0;     // 巣穴に届いたピクセル
    this.total = this.pixels.length;
    this.pulse = 0;
    this.time = 0;
    this.layout = { cell: 5, boardX: 0, boardY: 0, nest: { x: 0, y: 0 }, ant: 7, speed: 100 };
    // 各色のピクセルを「巣穴に近い順（ゆらぎつき）」に並べる → 絵が手前から自然に食べられていく
    const byKey = {};
    for (const p of this.pixels) {
      (byKey[p.key] = byKey[p.key] || []).push({ p, k: Math.hypot(p.gx - 31.5, p.gy - 72) + rng() * 7 });
    }
    this.queues = {};
    this.qi = {};
    for (const key of Object.keys(byKey)) {
      this.queues[key] = byKey[key].sort((a, b) => a.k - b.k).map(o => o.p);
      this.qi[key] = 0;
    }
  }

  setLayout(layout) { this.layout = layout; }

  pixelPos(p) {
    const { cell, boardX, boardY } = this.layout;
    return { x: boardX + (p.gx + 0.5) * cell, y: boardY + (p.gy + 0.5) * cell };
  }

  /** n 匹のアリを送り出す。戻り値の spawner.left が「まだ出発していない数」（UIの数字） */
  deploy(key, hex, n) {
    const s = { key, hex, left: n, n, t: 0 };
    this.spawners.push(s);
    return s;
  }

  claim(key) {
    const q = this.queues[key];
    if (!q) return null;
    while (this.qi[key] < q.length) {
      const p = q[this.qi[key]++];
      if (!p.eaten) return p;
    }
    return null;
  }

  get busy() { return this.ants.length > 0 || this.spawners.length > 0; }

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

  /** 1フレーム進める。このフレームにかじられたピクセル数を返す */
  update(dt, speedMul = 1) {
    const L = this.layout;
    const step = dt * speedMul;
    this.time += step;
    this.pulse = Math.max(0, this.pulse - dt * 4);
    let eaten = 0;

    for (const s of this.spawners) {
      s.t -= step;
      while (s.t <= 0 && s.left > 0) {
        s.t += SPAWN_GAP;
        s.left--;
        const p = this.claim(s.key);
        if (!p) { s.left = 0; break; }
        this.ants.push({
          x: L.nest.x + (Math.random() - 0.5) * L.ant * 0.8, y: L.nest.y,
          px: p, hex: s.hex, dark: shade(s.hex, 0.55),
          state: 'out', chew: 0, ph: Math.random() * TAU, ang: -Math.PI / 2, carry: false,
        });
      }
    }
    this.spawners = this.spawners.filter(s => s.left > 0);

    const move = L.speed * step;
    for (const a of this.ants) {
      a.ph += step * 14;
      if (a.state === 'out') {
        const t = this.pixelPos(a.px);
        if (this.moveToward(a, t.x, t.y, move, L.cell * 0.6)) {
          // ついたらかじる：ピクセルは絵からすぐ消えて、アリがくわえる
          a.px.eaten = true;
          this.remaining--;
          this.fresh.push(a.px);
          eaten++;
          a.carry = true;
          a.state = 'chew';
          a.chew = CHEW;
          if (this.crumbs.length < 150) {
            for (let i = 0; i < 2; i++) {
              this.crumbs.push({ x: t.x, y: t.y, vx: (Math.random() - 0.5) * 50, vy: (Math.random() - 0.8) * 50, life: 0.3, hex: a.hex });
            }
          }
        }
      } else if (a.state === 'chew') {
        a.chew -= step;
        if (a.chew <= 0) a.state = 'back';
      } else if (a.state === 'back') {
        if (this.moveToward(a, L.nest.x, L.nest.y, move, L.ant * 0.6)) {
          a.state = 'done';
          this.delivered++;
          this.pulse = 1;
        }
      }
    }
    this.ants = this.ants.filter(a => a.state !== 'done');

    for (const c of this.crumbs) {
      c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 140 * dt; c.life -= dt;
    }
    this.crumbs = this.crumbs.filter(c => c.life > 0);
    return eaten;
  }
}
