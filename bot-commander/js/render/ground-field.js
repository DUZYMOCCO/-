// 試作（proto_smooth_ground）: 地面を「マスの四角」ではなく、なめらかな地形の場で焼く。Pixi を使わない（node のテストから読む）。
// v0.4.12: 場の作りを「B スプラインでならした 0/1」から「マスの四角の形から直接つくる境」に変えた（式は下の geo）。
// 1) 境は、本当のマスの境そのもの。ただし、外へ出っぱった角（まわりの 2 辺が同じ別の地形）だけ、半径 CORNER_R の円でまるめる。
//    へこんだ角は、隣の地形の出っぱった角がまるまるので同じ半径でまるまる。1マスの島は直径 2*CORNER_R の丸、1マスの穴も同じ。
//    3 つ以上の地形が会う所は、どの地形も「いちばん近い境」で比べるので、すき間・とがり・色の混ざりが出ない。
// 2) 長い周期のノイズで座標をゆがめ（最大 WARP_MAX マス）、長い直線をゆるく波打たせる。マスの中心から離れるほど強く効く（中心の芯は動かさない）。
// 3) 各ピクセルは勝った地形の地面。境には「上の地形が下へ落とす影」（水際の湿った土・森の影）と細いふちを描く。
// シムは変えない（通れるかはマスのまま）。同じ地図なら同じ絵（乱数は地図から作った種の整数ハッシュ）。
export const FIELD_ORDER = ['plain', 'shallow', 'water', 'mountain', 'forest']; // 右ほど上（影を落とす側）
export const WARP = [[4.2, 0.36], [1.7, 0.12]]; // ゆがめ [周期(マス), 振れ幅(マス)] の 2 段
export const WARP_MAX = 0.35; // ゆがめの上限（マス）
export const RAGGED = [[0.55, 0.12], [0.2, 0.09], [0.08, 0.06]]; // 境のギザギザ（差に足すノイズ）[周期, 振れ幅]。差は境までの距離の 2 倍なので、境の動きは半分
export const RAGGED_MAX = RAGGED.reduce((a, [, A]) => a + A, 0);
export const CORE = [0.25, 0.1, 0.7]; // マスの中心の芯 [必ずそのマスの地形になる半径, ゆがめを効かせ始める半径, ゆがめが全部効く半径]（マス）: 中心まわりは必ずそのマスの地形（水に立って見えないように）
export const CORNER_R = 0.5; // 出っぱった角をまるめる円の半径（マス）。0.5 で 1マスの島が直径 1マスの丸
export const BORDER_MAX = 0.5; // 境が本当のマスの境から動いてよい最大（マス）。これを超える勝ちは、そのマス自身の地形に戻す
const NK = FIELD_ORDER.length;
export const GRID_STEP = 8; // ゆがめ・勝ちを計算する格子の間隔（焼いたpx）

const hash2 = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + s * 2246822519) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
function noise(x, y, s) { // 値ノイズ 0..1（なめらかな補間）
  const x0 = Math.floor(x), y0 = Math.floor(y); let fx = x - x0, fy = y - y0;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  const a = hash2(x0, y0, s), b = hash2(x0 + 1, y0, s), c = hash2(x0, y0 + 1, s), d = hash2(x0 + 1, y0 + 1, s);
  return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
}
const spread = n => Math.max(-1, Math.min(1, (2 * n - 1) * 1.9)); // 値ノイズは 0.5 付近に寄るので広げる

/** 地図 → 種（同じ地図なら同じ） */
export function mapSeed(keys) { let h = 2166136261; for (const k of keys) { h ^= FIELD_ORDER.indexOf(k) + 1; h = Math.imul(h, 16777619); } return h >>> 0; }

/**
 * 場を作る。keys[ty*w+tx] は地形のキー。返り値 sample(u, v) → { k1, k2, m }（u,v はマス単位の座標。m は「境までの距離の 2 倍＋ギザギザ」）。
 * 地図の外は一番近いマスと同じとみなす。
 */
export function createField(keys, w, h, seed = mapSeed(keys)) {
  const idx = new Int8Array(w * h);
  for (let i = 0; i < w * h; i++) idx[i] = Math.max(0, FIELD_ORDER.indexOf(keys[i]));
  const at = (x, y) => idx[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
  const s = [seed % 100003, (seed >>> 7) % 100019 + 11, (seed >>> 13) % 100043 + 23];
  const out = { k1: 0, k2: 0, m: 1 };
  const R = CORNER_R, dT = new Float64Array(NK), wp = { du: 0, dv: 0 };
  /** マス (tx,ty) のまわり 5x5 が全部同じ地形なら、その地形（場を計算しなくてよい）。違えば -1 */
  const uniform = (tx, ty) => { const k = at(tx, ty); for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (at(tx + dx, ty + dy) !== k) return -1; return k; };
  /** (u,v) のゆがめ（芯の弱めを掛ける前）を wp に入れる */
  function warpRaw(u, v) {
    let du = 0, dv = 0;
    for (const [L, A] of WARP) { du += A * spread(noise(u / L, v / L, s[0])); dv += A * spread(noise(u / L + 31.7, v / L + 17.3, s[1])); }
    const dl = Math.sqrt(du * du + dv * dv); if (dl > WARP_MAX) { du *= WARP_MAX / dl; dv *= WARP_MAX / dl; }
    wp.du = du; wp.dv = dv;
  }
  /** ゆがめを効かせる強さ。マスの中心から CORE[1] までは 0（動かさない）、CORE[2] で 1。この傾きなら点の動きが折り返さない */
  function coreK(u, v) { const x = u - Math.floor(u) - 0.5, y = v - Math.floor(v) - 0.5, t = (Math.sqrt(x * x + y * y) - CORE[1]) / (CORE[2] - CORE[1]); return t <= 0 ? 0 : t >= 1 ? 1 : t; }
  // マスごとの境の部品（マスの中の座標 0..1）。辺（隣が別の地形のとき。まるめる角の端は R だけ縮める）と、まるめる角の円（4 分の 1）
  const eN = new Int8Array(4), eC = new Uint8Array(8), arc = { n: 0, cx: new Float64Array(16), cy: new Float64Array(16), fx: new Int8Array(16), fy: new Int8Array(16), keep: new Int8Array(16), claim: new Int8Array(16) };
  const own = { A: -1, tx: 0, ty: 0, free: false, z: new Int8Array(4) }; // z[角の番号]: 自分の角をまるめるときの、削れた所をもらう地形（まるめない角は -1）
  const VX = [0, 1, 0, 1], VY = [0, 0, 1, 1]; // 角の番号 0 左上 1 右上 2 左下 3 右下
  function tile(tx, ty) {
    if (own.tx === tx && own.ty === ty && own.A >= 0) return;
    own.tx = tx; own.ty = ty; own.z.fill(-1); arc.n = 0; eC.fill(0);
    const A = at(tx, ty); own.A = A;
    eN[0] = at(tx - 1, ty) !== A ? at(tx - 1, ty) : -1; eN[1] = at(tx + 1, ty) !== A ? at(tx + 1, ty) : -1; // 左 右
    eN[2] = at(tx, ty - 1) !== A ? at(tx, ty - 1) : -1; eN[3] = at(tx, ty + 1) !== A ? at(tx, ty + 1) : -1; // 上 下
    for (let vi = 0; vi < 4; vi++) {
      const vx = VX[vi], vy = VY[vi], sx = 1 - 2 * vx, sy = 1 - 2 * vy;
      const H = at(tx + (vx ? 1 : -1), ty), V = at(tx, ty + (vy ? 1 : -1)), Dg = at(tx + (vx ? 1 : -1), ty + (vy ? 1 : -1));
      const cutT = H === V && H !== A, cutH = A === Dg && A !== H, cutV = A === Dg && A !== V, cutD = H === V && Dg !== H;
      if (cutT || cutH) eC[vx ? 2 + vy : vy] = 1; // 縦の辺（左 0,1 / 右 2,3）の、この角の端
      if (cutT || cutV) eC[4 + (vy ? 2 : 0) + vx] = 1; // 横の辺（上 4,5 / 下 6,7）の、この角の端
      if (cutT) own.z[vi] = H;
      const add = (cx, cy, fx, fy, keep, claim) => { const n = arc.n++; arc.cx[n] = cx; arc.cy[n] = cy; arc.fx[n] = fx; arc.fy[n] = fy; arc.keep[n] = keep; arc.claim[n] = claim; };
      if (cutT) add(vx + sx * R, vy + sy * R, -sx, -sy, A, H);
      if (cutH) add(vx - sx * R, vy + sy * R, sx, -sy, H, A);
      if (cutV) add(vx + sx * R, vy - sy * R, -sx, sy, V, A);
      if (cutD) add(vx - sx * R, vy - sy * R, sx, sy, Dg, H);
    }
    own.free = arc.n === 0 && eN[0] < 0 && eN[1] < 0 && eN[2] < 0 && eN[3] < 0;
  }
  const e = (n, d) => { if (d < dT[n]) dT[n] = d; };
  const segD = (px, py, x0, y0, x1, y1) => { const dx = Math.max(x0 - px, 0, px - x1), dy = Math.max(y0 - py, 0, py - y1); return Math.sqrt(dx * dx + dy * dy); };
  /**
   * 場の中の点 (qu,qv) の勝ち: res.k1（勝った地形）, res.k2（いちばん近い境の向こうの地形）, res.m（境までの距離の 2 倍）, res.m3（3 つ目の地形までの距離の 2 倍）
   * マスの中なら、そのマスの地形。外へ出っぱった角（隣の 2 辺が同じ別の地形 N）は半径 R の円でまるめ、削れた所は N のもの。
   */
  function geo(qu, qv, res) {
    const tx = Math.floor(qu), ty = Math.floor(qv), fx = qu - tx, fy = qv - ty;
    tile(tx, ty); const A = own.A;
    let k1 = A;
    for (let vi = 0; vi < 4; vi++) if (own.z[vi] >= 0) { // 自分のまるめる角の、円の外の削れた所は N のもの
      const vx = VX[vi], vy = VY[vi], ax = fx - (vx + (1 - 2 * vx) * R), ay = fy - (vy + (1 - 2 * vy) * R);
      if ((vx ? fx > 1 - R : fx < R) && (vy ? fy > 1 - R : fy < R) && ax * ax + ay * ay > R * R) { k1 = own.z[vi]; break; }
    }
    if (own.free) { res.k1 = k1; res.k2 = A; res.m = 9; res.m3 = 99; return res; } // まわりに境がないマス
    dT[0] = dT[1] = dT[2] = dT[3] = dT[4] = 9;
    // 辺（まるめる角の端は R 縮める）
    if (eN[0] >= 0) e(eN[0], segD(fx, fy, 0, eC[0] ? R : 0, 0, eC[1] ? 1 - R : 1));
    if (eN[1] >= 0) e(eN[1], segD(fx, fy, 1, eC[2] ? R : 0, 1, eC[3] ? 1 - R : 1));
    if (eN[2] >= 0) e(eN[2], segD(fx, fy, eC[4] ? R : 0, 0, eC[5] ? 1 - R : 1, 0));
    if (eN[3] >= 0) e(eN[3], segD(fx, fy, eC[6] ? R : 0, 1, eC[7] ? 1 - R : 1, 1));
    // まるめる角の円（4 分の 1）。点から円の弧までの距離（弧の向きの外なら、弧の端まで）
    for (let i = 0; i < arc.n; i++) {
      const cx = arc.cx[i], cy = arc.cy[i], gx = arc.fx[i], gy = arc.fy[i], ax = fx - cx, ay = fy - cy;
      let d;
      if (ax * gx >= 0 && ay * gy >= 0) d = Math.abs(Math.sqrt(ax * ax + ay * ay) - R);
      else { const x1 = ax - R * gx, y2 = ay - R * gy; d = Math.sqrt(Math.min(x1 * x1 + ay * ay, ax * ax + y2 * y2)); }
      const n = k1 === arc.keep[i] ? arc.claim[i] : arc.keep[i];
      e(n, d);
    }
    let d1 = 9, n1 = k1, d3 = 9;
    for (let k = 0; k < NK; k++) if (k !== k1 && dT[k] < d1) { d1 = dT[k]; n1 = k; }
    for (let k = 0; k < NK; k++) if (k !== k1 && k !== n1 && dT[k] < d3) d3 = dT[k];
    res.k1 = k1; res.k2 = n1; res.m = d1 >= 9 ? 9 : 2 * d1; res.m3 = d3 >= 9 ? 99 : 2 * d3;
    return res;
  }
  /** 境のギザギザ（差に足す）。隣のピクセルは同じ格子のマスなので、4 つの格子値は覚えておく（値は noise と同じ） */
  const RC = RAGGED.map(() => ({ x0: NaN, y0: NaN, a: 0, b: 0, c: 0, d: 0 }));
  function ragged(u, v) {
    let r = 0;
    for (let i = 0; i < RAGGED.length; i++) {
      const L = RAGGED[i][0], c = RC[i], px = u / L, py = v / L, x0 = Math.floor(px), y0 = Math.floor(py);
      if (c.x0 !== x0 || c.y0 !== y0) { c.x0 = x0; c.y0 = y0; c.a = hash2(x0, y0, s[2]); c.b = hash2(x0 + 1, y0, s[2]); c.c = hash2(x0, y0 + 1, s[2]); c.d = hash2(x0 + 1, y0 + 1, s[2]); }
      let fx = px - x0, fy = py - y0; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
      r += RAGGED[i][1] * (2 * ((c.a + (c.b - c.a) * fx) * (1 - fy) + (c.c + (c.d - c.c) * fx) * fy) - 1);
    }
    return r;
  }
  /** 点 p=(u,v)（ゆがめる前）から、地形 k のマス（k < 0 なら T0 以外のマス）までの近さが d 以内か（p のまわり 3x3 のマスで見る） */
  function nearTile(u, v, k, T0, d) {
    const tx = Math.floor(u), ty = Math.floor(v);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x0 = tx + dx, y0 = ty + dy, t = at(x0, y0); if (k < 0 ? t === T0 : t !== k) continue;
      const ex = Math.max(x0 - u, 0, u - x0 - 1), ey = Math.max(y0 - v, 0, v - y0 - 1);
      if (ex * ex + ey * ey <= d * d) return true;
    }
    return false;
  }
  /** ゆがめた点 (qu,qv) の勝ちに、境のギザギザ（noisy のとき）と BORDER_MAX の決まりを足して res に入れる。u,v は元の点 */
  function pick(qu, qv, u, v, noisy, res) {
    geo(qu, qv, res);
    let k1 = res.k1, k2 = res.k2, m = res.m;
    if (noisy && m < 0.6) {
      const r = ragged(u, v);
      let f = (res.m3 - m) / 0.6; f = f >= 1 ? 1 : f * f * (3 - 2 * f); // 3 つ目の地形が近い所（3 つが会う角）は、ギザギザを弱める
      m += r * f * (1 - m / 0.6);
      if (m < 0) { const t = k1; k1 = k2; k2 = t; m = -m; }
    }
    if (noisy) { // 境が本当のマスの境から BORDER_MAX より動いたら、そのマス自身の地形に戻す（はみ出し: k1 のマスから遠すぎる / へこみ: ほかの地形から BORDER_MAX 以上離れているのに別の地形）
      const T0 = at(Math.floor(u), Math.floor(v));
      if (k1 !== T0 && (!nearTile(u, v, k1, T0, BORDER_MAX) || !nearTile(u, v, -1, T0, BORDER_MAX))) { k2 = k1; k1 = T0; m = Math.min(m, 0.05); }
    }
    res.k1 = k1; res.k2 = k2; res.m = m;
    return res;
  }
  function sample(u, v) {
    warpRaw(u, v); const c = coreK(u, v);
    return pick(u + wp.du * c, v + wp.dv * c, u, v, true, out);
  }
  return { sample, warpRaw, warp: wp, coreK, pick, geo, uniform, at, idx };
}

// 境の見た目（上の地形 → 下の地形に落とす影の強さ・幅(焼いたpx)、上の側のふちの明るさ）
export const RIM = {
  shallow: { shadow: 0.32, width: 6, lip: 1.18, lipW: 2.5 },
  water: { shadow: 0.5, width: 8, lip: 1.28, lipW: 2.5 },
  mountain: { shadow: 0.42, width: 6, lip: 1.14, lipW: 3 },
  forest: { shadow: 0.55, width: 10, lip: 0.85, lipW: 4 },
};

/**
 * 1つの区画を ImageData（RGBA）に焼く。
 * field: createField の返り値。tex: 地形の番号 → { data: Uint8ClampedArray, size }（地形の地面を ppt*4 px 四方に縮めて tint 済み。4x4マスで1周）。
 * (cx,cy) 区画の左上のマス、(cw,ch) マス数、ppt = 1マスのpx。返り値 out(RGBA, cw*ppt x ch*ppt)
 */
export function bakeChunk(field, tex, cx, cy, cw, ch, ppt, out) {
  const W = cw * ppt, H = ch * ppt, P = W + 2;
  const uni = new Int8Array((cw + 2) * (ch + 2));
  for (let ty = -1; ty <= ch; ty++) for (let tx = -1; tx <= cw; tx++) uni[(ty + 1) * (cw + 2) + tx + 1] = field.uniform(cx + tx, cy + ty);
  const uniAt = (tx, ty) => uni[(ty + 1) * (cw + 2) + tx + 1];
  // 1) まわり 5x5 マスが同じ地形でないマスだけ、ゆがめと勝ちを GS px おきの格子で計算する（ゆがめは長い周期なので十分）。
  //    格子の 1 区画の 4 隅が同じ地形で差も大きければ区画ごと塗る。境の近くの区画だけ、ピクセルごとにゆがめを双一次で補間して勝ちを決める。
  //    M は勝ちの差（計算しない所は 9）。勾配用に1px広く
  const K1 = new Int8Array(P * (H + 2)), K2 = new Int8Array(P * (H + 2)), M = new Float32Array(P * (H + 2)).fill(9);
  const GS = GRID_STEP, GW = Math.ceil((W + 2) / GS) + 2, GH = Math.ceil((H + 2) / GS) + 2, NS = 5;
  const G = new Float32Array(GW * GH * NS), done = new Uint8Array(GW * GH); // [ゆがめ du, dv, 勝ち, 差, 2番目]
  const res = { k1: 0, k2: 0, m: 0, m3: 0 }, wp = field.warp;
  const gridAt = (gi, gj) => { // 格子点 (gi,gj) = ピクセル (gi*GS - GS, gj*GS - GS)
    const n = gj * GW + gi, o = n * NS;
    if (!done[n]) {
      done[n] = 1; const u = cx + (gi * GS - GS + 0.5) / ppt, v = cy + (gj * GS - GS + 0.5) / ppt;
      field.warpRaw(u, v); const c = field.coreK(u, v);
      G[o] = wp.du; G[o + 1] = wp.dv;
      field.pick(u + wp.du * c, v + wp.dv * c, u, v, false, res); G[o + 2] = res.k1; G[o + 3] = res.m; G[o + 4] = res.k2;
    }
    return o;
  };
  const SHADE_PX = 26; // 影・縁の効く最大距離(px)。RIM の width*2.5 程度
  const SAFE = RAGGED_MAX + 0.12; // 4 隅の差がこれより大きければ、区画の中に境はない
  for (let gj = 0; gj * GS - GS <= H; gj++) for (let gi = 0; gi * GS - GS <= W; gi++) {
    const px0 = gi * GS - GS, py0 = gj * GS - GS;
    if (px0 + GS - 1 < -1 || py0 + GS - 1 < -1) continue;
    if (uniAt(Math.floor(px0 / ppt), Math.floor(py0 / ppt)) >= 0) continue;
    const a = gridAt(gi, gj), b = gridAt(gi + 1, gj), c = gridAt(gi, gj + 1), d = gridAt(gi + 1, gj + 1);
    const xs = Math.max(-1, px0), xe = Math.min(W, px0 + GS - 1), ys = Math.max(-1, py0), ye = Math.min(H, py0 + GS - 1);
    const ka = G[a + 2];
    if (ka === G[b + 2] && ka === G[c + 2] && ka === G[d + 2] && Math.min(G[a + 3], G[b + 3], G[c + 3], G[d + 3]) > SAFE) {
      const k2 = G[a + 4], ma = G[a + 3], mb = G[b + 3], mc = G[c + 3], md = G[d + 3];
      // 影がまだ届く所（差 / 勾配 で見た境までの距離が SHADE_PX 以内）だけ差を補間
      const gr = Math.max(Math.abs(ma - mb), Math.abs(mc - md), Math.abs(ma - mc), Math.abs(mb - md)) / GS;
      const shade = k2 === G[b + 4] && k2 === G[c + 4] && k2 === G[d + 4] && Math.min(ma, mb, mc, md) < Math.min(1.2, gr * SHADE_PX);
      for (let y = ys; y <= ye; y++) {
        const i = (y + 1) * P + 1; K1.fill(ka, i + xs, i + xe + 1);
        if (shade) { K2.fill(k2, i + xs, i + xe + 1); const fy = (y - py0) / GS; for (let x = xs; x <= xe; x++) { const fx = (x - px0) / GS; M[i + x] = (ma * (1 - fx) + mb * fx) * (1 - fy) + (mc * (1 - fx) + md * fx) * fy; } }
      }
      continue;
    }
    for (let y = ys; y <= ye; y++) for (let x = xs; x <= xe; x++) {
      const i = (y + 1) * P + x + 1, fx = (x - px0) / GS, fy = (y - py0) / GS;
      const wa = (1 - fx) * (1 - fy), wb = fx * (1 - fy), wc = (1 - fx) * fy, wd = fx * fy;
      const u = cx + (x + 0.5) / ppt, v = cy + (y + 0.5) / ppt, k = field.coreK(u, v);
      const du = (G[a] * wa + G[b] * wb + G[c] * wc + G[d] * wd) * k, dv = (G[a + 1] * wa + G[b + 1] * wb + G[c + 1] * wc + G[d + 1] * wd) * k;
      field.pick(u + du, v + dv, u, v, true, res);
      K1[i] = res.k1; K2[i] = res.k2; M[i] = res.m;
    }
  }
  // 2) 色。同じ地形だけのマスは地面の行をそのまま写す
  for (let tty = 0; tty < ch; tty++) for (let ttx = 0; ttx < cw; ttx++) {
    const un = uniAt(ttx, tty), X0 = ttx * ppt, Y0 = tty * ppt;
    if (un >= 0) {
      const t = tex[un], gx = ((cx + ttx) * ppt) % t.size;
      for (let y = Y0; y < Y0 + ppt; y++) { const gy = (cy * ppt + y) % t.size, so = (gy * t.size + gx) * 4; out.set(t.data.subarray(so, so + ppt * 4), (y * W + X0) * 4); }
      continue;
    }
    for (let y = Y0; y < Y0 + ppt; y++) for (let x = X0; x < X0 + ppt; x++) {
      const i = (y + 1) * P + x + 1, o = (y * W + x) * 4, k1 = K1[i];
      if (M[i] >= 1.5) { // 境から遠い所: 同じ地形が続くかぎり、地面の行をまとめて写す（マスの中なので地面は折り返さない）
        let e = x + 1; while (e < X0 + ppt && M[i + e - x] >= 1.5 && K1[i + e - x] === k1) e++;
        const t = tex[k1], so = (((cy * ppt + y) % t.size) * t.size + (cx * ppt + x) % t.size) * 4;
        out.set(t.data.subarray(so, so + (e - x) * 4), o); x = e - 1; continue;
      }
      const gx = (cx * ppt + x), gy = (cy * ppt + y);
      const t1 = tex[k1], ti = ((gy % t1.size) * t1.size + gx % t1.size) * 4;
      let r = t1.data[ti], g = t1.data[ti + 1], b = t1.data[ti + 2];
      const m = M[i];
      if (m < 1.5) {
        // 境までの距離(px) ≈ 差 / 勾配
        const ddx = (M[i + 1] < 1.5 ? M[i + 1] : m) - (M[i - 1] < 1.5 ? M[i - 1] : m), ddy = (M[i + P] < 1.5 ? M[i + P] : m) - (M[i - P] < 1.5 ? M[i - P] : m);
        const grad = Math.max(Math.sqrt(ddx * ddx + ddy * ddy) / 2, 0.004), d = m / grad;
        const k2 = K2[i];
        if (d < 1.5) { // ぼかしすぎない線（境の上で半々、1.5px で元の地形）
          const t2 = tex[k2], tj = ((gy % t2.size) * t2.size + gx % t2.size) * 4, al = 0.5 + 0.5 * (d / 1.5);
          r = r * al + t2.data[tj] * (1 - al); g = g * al + t2.data[tj + 1] * (1 - al); b = b * al + t2.data[tj + 2] * (1 - al);
        }
        let f = 1;
        if (k2 > k1) { const R = RIM[FIELD_ORDER[k2]]; if (d < R.width * 2.6) f = 1 - R.shadow * Math.exp(-d / R.width * 1.6); } // 下の地形の側: 上の地形の影
        else if (k1 > k2) { const R = RIM[FIELD_ORDER[k1]]; if (d < R.lipW * 3) f = 1 + (R.lip - 1) * Math.exp(-((d - R.lipW * 0.6) ** 2) / (R.lipW * R.lipW)); }
        r *= f; g *= f; b *= f;
      }
      out[o] = r; out[o + 1] = g; out[o + 2] = b; out[o + 3] = 255;
    }
  }
  return out;
}
