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
 * 配列の先頭（index 0）がその列の「いまタップできるタイル」。
 */
export function buildTiles(counts, rng, { cols = 5, maxTiles = 25 } = {}) {
  const entries = Object.entries(counts).filter(([, c]) => c > 0);
  let target = 32;
  let plan;
  for (;;) {
    plan = entries.map(([key, count]) => [key, Math.max(1, Math.min(count, Math.round(count / target)))]);
    const total = plan.reduce((s, [, n]) => s + n, 0);
    if (total <= maxTiles || target > 600) break;
    target += 4;
  }
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

/** タイルの背景色に対して読みやすい文字色 */
export function textColorFor(hex) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) > 170 ? '#3b2a1a' : '#ffffff';
}
