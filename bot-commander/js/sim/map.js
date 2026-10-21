// タイルマップ（平地・森・山・水）。DOM/Pixi に依存しない。
import { createRng } from './rng.js?v=5';

export const TILE = 32; // 1タイルのワールド座標の大きさ
export const T = Object.freeze({ PLAIN: 0, FOREST: 1, MOUNTAIN: 2, WATER: 3 });
// cost: 経路のコスト（＝移動の遅さ）。def: 受けるダメージの倍率（小さいほど固い）
export const TERRAIN = Object.freeze([
  { key: 'plain', name: '平地', cost: 1, def: 1 },
  { key: 'forest', name: '森', cost: 1.6, def: 0.8 },
  { key: 'mountain', name: '山', cost: 2.6, def: 0.65 },
  { key: 'water', name: '水', cost: Infinity, def: 1 },
]);

export function createMap(w, h, fill = T.PLAIN) {
  return { w, h, tiles: new Uint8Array(w * h).fill(fill), hq: { ally: null, enemy: null } };
}
export const inBounds = (map, tx, ty) => tx >= 0 && ty >= 0 && tx < map.w && ty < map.h;
export const tileAt = (map, tx, ty) => (inBounds(map, tx, ty) ? map.tiles[ty * map.w + tx] : T.WATER);
export const setTile = (map, tx, ty, t) => { if (inBounds(map, tx, ty)) map.tiles[ty * map.w + tx] = t; };
export const passable = (map, tx, ty) => inBounds(map, tx, ty) && map.tiles[ty * map.w + tx] !== T.WATER;
export const costAt = (map, tx, ty) => TERRAIN[tileAt(map, tx, ty)].cost;
export const toTile = v => Math.floor(v / TILE);
export const tileCenter = t => t * TILE + TILE / 2;

/** 粗い格子の乱数を双一次補間した「なめらかなノイズ」 */
function valueNoise(rng, w, h, step) {
  const gw = Math.ceil(w / step) + 2, gh = Math.ceil(h / step) + 2;
  const g = Array.from({ length: gw * gh }, () => rng());
  return (x, y) => {
    const fx = x / step, fy = y / step, x0 = Math.floor(fx), y0 = Math.floor(fy), sx = fx - x0, sy = fy - y0;
    const v = (i, j) => g[(j) * gw + (i)];
    const a = v(x0, y0) * (1 - sx) + v(x0 + 1, y0) * sx, b = v(x0, y0 + 1) * (1 - sx) + v(x0 + 1, y0 + 1) * sx;
    return a * (1 - sy) + b * sy;
  };
}

function clearDisk(map, cx, cy, r, t = T.PLAIN) {
  for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++)
    if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r + 1) setTile(map, x, y, t);
}

/** 水を通らずに行けるタイルを数える（つながり確認） */
export function reachable(map, sx, sy) {
  const seen = new Uint8Array(map.w * map.h), q = [sy * map.w + sx];
  if (!passable(map, sx, sy)) return seen;
  seen[q[0]] = 1;
  while (q.length) {
    const i = q.pop(), x = i % map.w, y = (i / map.w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, ni = ny * map.w + nx;
      if (passable(map, nx, ny) && !seen[ni]) { seen[ni] = 1; q.push(ni); }
    }
  }
  return seen;
}

/** 試作用の固定サイズマップ。同じ seed なら同じ地形。 */
export function generateMap(seed = 7, w = 40, h = 60) {
  const rng = createRng(seed ^ 0x9e3779b9);
  const map = createMap(w, h);
  const elev = valueNoise(rng, w, h, 7), moist = valueNoise(rng, w, h, 5), lake = valueNoise(rng, w, h, 9);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const e = elev(x, y), m = moist(x, y), l = lake(x, y);
    let t = T.PLAIN;
    if (e > 0.77) t = T.MOUNTAIN; else if (m > 0.6) t = T.FOREST; else if (l < 0.12) t = T.WATER;
    setTile(map, x, y, t);
  }
  // 中央を横切る川（幅2）と浅瀬3か所
  const phase = rng() * Math.PI * 2, mid = Math.floor(h / 2);
  const fords = [Math.floor(w * 0.18 + rng() * 3), Math.floor(w * 0.48 + rng() * 3), Math.floor(w * 0.78 + rng() * 3)];
  for (let x = 0; x < w; x++) {
    const ry = mid + Math.round(Math.sin(x / 6 + phase) * 2.2);
    const ford = fords.some(f => Math.abs(f - x) <= 1);
    for (let k = 0; k < 2; k++) setTile(map, x, ry + k, ford ? T.PLAIN : T.WATER);
  }
  map.hq.ally = { tx: Math.floor(w / 2), ty: h - 4 };
  map.hq.enemy = { tx: Math.floor(w / 2), ty: 3 };
  clearDisk(map, map.hq.ally.tx, map.hq.ally.ty, 4);
  clearDisk(map, map.hq.enemy.tx, map.hq.enemy.ty, 4);
  // 本陣どうしが水で分断されていたら、中央に道を通す
  const seen = reachable(map, map.hq.ally.tx, map.hq.ally.ty);
  if (!seen[map.hq.enemy.ty * w + map.hq.enemy.tx]) for (let y = 0; y < h; y++) if (tileAt(map, map.hq.ally.tx, y) === T.WATER) setTile(map, map.hq.ally.tx, y, T.PLAIN);
  map.seed = seed;
  return map;
}

/** (tx,ty) に一番近い通れるタイル */
export function nearestPassable(map, tx, ty) {
  tx = Math.max(0, Math.min(map.w - 1, tx)); ty = Math.max(0, Math.min(map.h - 1, ty));
  if (passable(map, tx, ty)) return { tx, ty };
  for (let r = 1; r < Math.max(map.w, map.h); r++)
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++)
      if (Math.max(Math.abs(dx), Math.abs(dy)) === r && passable(map, tx + dx, ty + dy)) return { tx: tx + dx, ty: ty + dy };
  return null;
}
