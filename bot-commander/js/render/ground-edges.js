// v0.4.8-dev（10/24）地面の境界の絵の選び方。Pixi を使わない（node のテストから読む）。
// 絵は assets/ground-edges/<上>_on_<下>/<名前>.png（128px = 1マス、Claude 作 edges2。tools/make-ground-edges.py で取り込み）。
// 上下の順は 平地 < 浅瀬 < 深い水 < 岩場 < 森。違う地形どうしの境では、下の地形のマスに上の地形の縁を重ねる。
// 名前は「下のマスから見て、上の地形がどちらにあるか」。辺を先、角を後。内角（隣り合う2辺が同じ上の地形）はその2辺の辺の絵を出さない。
// 3種類が会う角（平地のマスの隣り合う2辺が、決まった組の2種類）は、その2辺の辺の絵の代わりに mix3 の1枚を置く（1辺を2つの mix3 が共有してもよい）。
export const EDGE_ORDER = ['plain', 'shallow', 'water', 'mountain', 'forest']; // 右ほど上
export const EDGE_KINDS = EDGE_ORDER.slice(1); // 縁になって重なる側
export const EDGE_NAMES = ['edge_top', 'edge_bottom', 'edge_left', 'edge_right', 'corner_out_tl', 'corner_out_tr', 'corner_out_bl', 'corner_out_br', 'corner_in_tl', 'corner_in_tr', 'corner_in_bl', 'corner_in_br'];
/** 絵のある [上, 下] の組（全10組） */
export const EDGE_PAIRS = EDGE_ORDER.flatMap((lo, i) => EDGE_ORDER.slice(i + 1).map(hi => [hi, lo]));
export const pairDir = (upper, lower) => `${upper}_on_${lower}`;
/** mix3 の組（上, 下）。平地のマスにだけ置く */
export const MIX3_PAIRS = [['forest', 'mountain'], ['mountain', 'water'], ['forest', 'water']];
const CORNERS = [['tl', 'top', 'left'], ['tr', 'top', 'right'], ['bl', 'bottom', 'left'], ['br', 'bottom', 'right']];
const rank = k => EDGE_ORDER.indexOf(k);
const mix3Of = (a, b) => MIX3_PAIRS.find(([o, u]) => (a === o && b === u) || (a === u && b === o));
/** mix3 のファイル名（assets/ground-edges/mix3/<上>-<下>/<名前>.png）。例: tl__forest-top__mountain-left */
export const mix3Name = (corner, s1, k1, s2, k2) => `${corner}__${k1}-${s1}__${k2}-${s2}`;
export const MIX3_FILES = MIX3_PAIRS.flatMap(([o, u]) => CORNERS.flatMap(([c, s1, s2]) => [[o, u], [u, o]].map(([k1, k2]) => `${o}-${u}/${mix3Name(c, s1, k1, s2, k2)}`)));

/**
 * マス (tx,ty) に重ねる境界の絵の一覧（重ねる順）。
 * 1つは { name, kind, dir }（dir = '<上>_on_<下>'）か、mix3 の { mix3: '<上>-<下>/<名前>', upper, lower, kind: upper }。
 * keyAt(x,y) は地形のキー（地図の外は null）。
 */
export function edgePieces(keyAt, tx, ty) {
  const base = keyAt(tx, ty), r0 = rank(base);
  if (r0 < 0) return [];
  const side = { top: keyAt(tx, ty - 1), bottom: keyAt(tx, ty + 1), left: keyAt(tx - 1, ty), right: keyAt(tx + 1, ty) };
  const diag = { tl: keyAt(tx - 1, ty - 1), tr: keyAt(tx + 1, ty - 1), bl: keyAt(tx - 1, ty + 1), br: keyAt(tx + 1, ty + 1) };
  const used = new Set(); // 内角・mix3 で使った辺（辺の絵を出さない）
  const inner = new Set(), innerSides = new Set();
  for (const [c, s1, s2] of CORNERS) if (side[s1] === side[s2] && rank(side[s1]) > r0) { inner.add(c); innerSides.add(s1); innerSides.add(s2); used.add(s1); used.add(s2); }
  const mix = new Map(); // 上の地形 → [mix3 の1枚…]
  // 1辺を両端の2つの mix3 が共有してもよい（例: 上が水・左が森・右が岩場の1マス幅の平地。片方だけだと反対の角が四角く欠ける）
  if (base === 'plain') for (const [c, s1, s2] of CORNERS) {
    const k1 = side[s1], k2 = side[s2], m = k1 !== k2 && mix3Of(k1, k2);
    if (!m || innerSides.has(s1) || innerSides.has(s2)) continue;
    used.add(s1); used.add(s2);
    const [upper, lower] = m;
    if (!mix.has(upper)) mix.set(upper, []);
    mix.get(upper).push({ mix3: `${upper}-${lower}/${mix3Name(c, s1, k1, s2, k2)}`, upper, lower, kind: upper });
  }
  const out = [];
  for (const k of EDGE_ORDER.slice(r0 + 1)) {
    const dir = pairDir(k, base), piece = name => ({ name, kind: k, dir });
    for (const s of ['top', 'bottom', 'left', 'right']) if (side[s] === k && !used.has(s)) out.push(piece(`edge_${s}`));
    if (mix.has(k)) out.push(...mix.get(k));
    for (const [c, s1, s2] of CORNERS) if (inner.has(c) && side[s1] === k) out.push(piece(`corner_in_${c}`));
    for (const [c, s1, s2] of CORNERS) if (diag[c] === k && side[s1] !== k && side[s2] !== k) out.push(piece(`corner_out_${c}`));
  }
  return out;
}
