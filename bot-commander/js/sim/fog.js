// 霧（ビット格子）。
// 元: Iron Squad js/fog.js の FogGrid（rep v7.2.25）。「ビット配列に円でスタンプする」「revision で描画側に変化を知らせる」
//   「保存・復元時に長さを検査する」考え方を流用。
// 変更: 1層（探索済み）→ 2層（seen=一度見た / visible=今見えている）。visible は毎回作り直し、
//       変化があったときだけ revision を上げる。マスはタイル単位、半径ごとの円の形をキャッシュ。
export class FogGrid {
  constructor(w, h) {
    this.w = w; this.h = h;
    const bytes = Math.ceil((w * h) / 8);
    this.seen = new Uint8Array(bytes);
    this.visible = new Uint8Array(bytes);
    this._next = new Uint8Array(bytes);
    this.revision = 0;
    this._disks = new Map();
  }
  _disk(r) {
    const key = Math.round(r * 4) / 4;
    let d = this._disks.get(key);
    if (!d) {
      d = []; const R = Math.ceil(key);
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) if (dx * dx + dy * dy <= key * key) d.push(dx, dy);
      this._disks.set(key, d);
    }
    return d;
  }
  _set(arr, tx, ty) { if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return; const i = ty * this.w + tx; arr[i >> 3] |= 1 << (i & 7); }
  _get(arr, tx, ty) { if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return false; const i = ty * this.w + tx; return (arr[i >> 3] & (1 << (i & 7))) !== 0; }
  /** 今フレームの視界づくりを始める */
  begin() { this._next.fill(0); }
  /** タイル (cx,cy) を中心に半径 r タイルを見えている状態にする */
  stamp(cx, cy, r) {
    const d = this._disk(r);
    for (let k = 0; k < d.length; k += 2) this._set(this._next, cx + d[k], cy + d[k + 1]);
  }
  /** 視界を確定。見えた所は seen にも足す。変化があれば revision++ */
  commit() {
    let changed = false;
    for (let k = 0; k < this._next.length; k++) {
      const v = this._next[k];
      if (v !== this.visible[k]) { changed = true; this.visible[k] = v; }
      const s = this.seen[k] | v; if (s !== this.seen[k]) { changed = true; this.seen[k] = s; }
    }
    if (changed) this.revision++;
    return changed;
  }
  isVisible(tx, ty) { return this._get(this.visible, tx, ty); }
  isSeen(tx, ty) { return this._get(this.seen, tx, ty); }
  /** 0=未探索 1=見たことがある 2=今見えている */
  stateAt(tx, ty) { return this.isVisible(tx, ty) ? 2 : this.isSeen(tx, ty) ? 1 : 0; }
  serialize() { return { w: this.w, h: this.h, seen: Array.from(this.seen) }; }
  static deserialize(data) {
    const f = new FogGrid(data?.w || 1, data?.h || 1);
    if (Array.isArray(data?.seen) && data.seen.length === f.seen.length) f.seen.set(data.seen);
    return f;
  }
}
