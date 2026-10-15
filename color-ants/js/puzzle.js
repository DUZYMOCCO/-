/**
 * カラー・アント パズル側のロジック（タイル生成）
 * 絵の「色ごとのピクセル数」を、数字つきタイルに分割して5列に並べる。
 * 各色のタイルの数字の合計 ＝ その色のピクセル数 なので、必ず全部食べきれる。
 */

export function mulberry32(seed) {
  let a = seed | 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** total を parts 個の正の整数に、ばらつきをつけて分ける（合計は必ず total） */
export function splitCount(total, parts, rng) {
  if (parts <= 1) return [total];
  const w = Array.from({ length: parts }, () => 0.55 + rng());
  const sum = w.reduce((a, b) => a + b, 0);
  const out = w.map(v => Math.max(1, Math.floor((v / sum) * total)));
  let diff = total - out.reduce((a, b) => a + b, 0);
  for (let i = 0; diff !== 0 && i < 100000; i++) {
    const k = i % parts;
    if (diff > 0) { out[k]++; diff--; } else if (out[k] > 1) { out[k]--; diff++; }
  }
  return out;
}

/**
 * counts: { 色キー: ピクセル数 } → 列ごとのタイル配列 [[{key,n},...], ...]
 * 外側のピクセルに対応するタイルほど列の手前に、内側の色ほど列の奥に配置される（外側ルール）。
 * タイルの数字は小口（12〜35前後）に分割し、1ブロックの総量が多すぎないようにする。
 */
export function buildTiles(counts, rng, { cols = 5, target = 22, pixels = null, level = 1 } = {}) {
  const entries = Object.entries(counts).filter(([, c]) => c > 0);

  if (!pixels) {
    const plan = entries.map(([key, count]) => [key, Math.max(1, Math.min(count, Math.round(count / target)))]);
    const tiles = [];
    for (const [key, parts] of plan) {
      for (const n of splitCount(counts[key], parts, rng)) tiles.push({ key, n });
    }
    for (let i = tiles.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }
    const columns = Array.from({ length: cols }, () => []);
    tiles.forEach((t, i) => columns[i % cols].push(t));
    return columns;
  }

  const size = Math.round(Math.sqrt(pixels.length));
  const dist = new Int32Array(size * size).fill(-1);
  const q = [];
  for (const p of pixels) {
    if (p.isBg || p.gx === 0 || p.gx === size - 1 || p.gy === 0 || p.gy === size - 1) {
      dist[p.gy * size + p.gx] = 0;
      q.push(p);
    }
  }
  let head = 0;
  while (head < q.length) {
    const cur = q[head++];
    const d = dist[cur.gy * size + cur.gx];
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nx = cur.gx + dx, ny = cur.gy + dy;
      if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
        const nidx = ny * size + nx;
        if (dist[nidx] === -1) {
          dist[nidx] = d + 1;
          q.push(pixels[nidx]);
        }
      }
    }
  }

  const byKey = {};
  for (const p of pixels) {
    if (p.isBg) continue;
    if (!byKey[p.key]) byKey[p.key] = [];
    byKey[p.key].push(p);
  }

  const allTiles = [];
  for (const [key, pList] of Object.entries(byKey)) {
    pList.sort((a, b) => dist[a.gy * size + a.gx] - dist[b.gy * size + b.gx]);
    const parts = Math.max(1, Math.round(pList.length / target));
    const sizes = splitCount(pList.length, parts, rng);
    let offset = 0;
    for (const sz of sizes) {
      const slice = pList.slice(offset, offset + sz);
      offset += sz;
      const avgDist = slice.reduce((s, p) => s + dist[p.gy * size + p.gx], 0) / sz;
      // 少しの揺らぎを加えて同層の色が交互に手前に来るようにする
      allTiles.push({ key, n: sz, avgDist: avgDist + (rng() - 0.5) * 4 });
    }
  }

  // 外側層（avgDist 小）が手前に、内側層（avgDist 大）が奥に来るようソート
  allTiles.sort((a, b) => a.avgDist - b.avgDist);

  const columns = Array.from({ length: cols }, () => []);
  allTiles.forEach((t, i) => columns[i % cols].push(t));

  // レベル2以上なら「鍵と南京錠（🔒・🗝️）」ギミックを配置
  if (level >= 2) {
    const lockPairs = level >= 4 ? 2 : 1;
    for (let p = 0; p < lockPairs; p++) {
      const lockCol = (p * 2 + 1) % cols;
      const keyCol = (lockCol + 2) % cols;
      const lockDepth = Math.min(2, Math.max(1, columns[lockCol].length - 1));
      const keyDepth = Math.min(1, Math.max(0, columns[keyCol].length - 1));

      const lockTile = columns[lockCol][lockDepth];
      const keyTile = columns[keyCol][keyDepth];

      if (lockTile && keyTile && lockTile !== keyTile && !lockTile.locked && !keyTile.hasKey) {
        lockTile.locked = true;
        keyTile.hasKey = true;
      }
    }
  }

  return columns;
}

/** タイルの背景色に対して読みやすい文字色 */
export function textColorFor(hex) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) > 170 ? '#3b2a1a' : '#ffffff';
}
