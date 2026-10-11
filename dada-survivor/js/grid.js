/**
 * あたり はんていの ための こまかい どうぐ（DOM なし・テストできる）
 * - EnemyGrid：てきを 64px の マスに わけて、ちかくの てき だけを しらべる
 *   query() は「もとの はいれつの じゅんばん」で かえすので、ぜんぶ しらべた ときと けっかが おなじ
 * - nearestN：いちばん ちかい n たい（はいれつも ならびかえも つくらない）
 */
export class EnemyGrid {
  constructor(cell = 64) {
    this.cell = cell;
    this.map = new Map();
    this.spare = [];
    this.maxR = 0;
  }

  // マスの かぎ（となりあう マスが ぶつからない 32bit）
  static key(cx, cy) { return ((cx & 0xffff) << 16) | (cy & 0xffff); }

  build(list) {
    for (const l of this.map.values()) { l.length = 0; this.spare.push(l); }
    this.map.clear();
    const c = this.cell;
    let maxR = 0;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      e._gi = i;
      if (e.T.r > maxR) maxR = e.T.r;
      const k = EnemyGrid.key(Math.floor(e.x / c), Math.floor(e.y / c));
      let l = this.map.get(k);
      if (!l) { l = this.spare.pop() || []; this.map.set(k, l); }
      l.push(e);
    }
    this.maxR = maxR;
  }

  // (x, y) から rad + (てきの はんけい) に とどくかも しれない てきを out に いれる（もとの じゅんばん）
  query(x, y, rad, out) {
    out.length = 0;
    const c = this.cell, R = rad + this.maxR;
    const x0 = Math.floor((x - R) / c), x1 = Math.floor((x + R) / c);
    const y0 = Math.floor((y - R) / c), y1 = Math.floor((y + R) / c);
    let cells = 0;
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
      const l = this.map.get(EnemyGrid.key(cx, cy));
      if (l) { cells++; for (let i = 0; i < l.length; i++) out.push(l[i]); }
    }
    if (cells > 1) out.sort(byIndex);
    return out;
  }
}
const byIndex = (a, b) => a._gi - b._gi;

// list の なかで p に ちかい じゅんに n こ（きょり² < lim2）。おなじ きょりなら まえに いる ほうが さき
export function nearestN(list, p, n, lim2) {
  const out = [], ds = [];
  if (n <= 0) return out;
  for (let i = 0; i < list.length; i++) {
    const e = list[i], dx = e.x - p.x, dy = e.y - p.y, d = dx * dx + dy * dy;
    if (!(d < lim2)) continue;
    if (out.length >= n && d >= ds[out.length - 1]) continue;
    let j = out.length;
    while (j > 0 && ds[j - 1] > d) j--;
    out.splice(j, 0, e); ds.splice(j, 0, d);
    if (out.length > n) { out.pop(); ds.pop(); }
  }
  return out;
}
