/**
 * ABYSS DIVE — 追加兵装（反射レーザー/反射魚雷・全自動近接）用の共有ジオメトリ
 *   純粋ロジック / DOM 非依存 / 乱数・保存なし。
 *
 * 本編（D:/スマホゲーム工房/abyss-dive/js/game.js, trench-rules.js）は先行作業中のため
 * 一切書き換えない。ここは独立した最小の純粋 ESM モジュール（scratch 限定）。
 *
 * 目的:
 *   - 反射で使う「幾何ヒット」{ t, x, y, nx, ny } を1か所にまとめる。
 *     t は線分上の 0..1 の割合、x,y は当たり点、nx,ny は外向きの面法線（単位ベクトル）。
 *   - 入力接触（AABB＝矩形 / 円）の連続判定（掃引）を同じ関数群に置き、
 *     反射レーザーの可視経路と実当たり、魚雷の反射、近接の遮蔽判定で共有できるようにする。
 *
 * 図形の与え方（本編データとそのまま共有できる）:
 *   - 矩形（壁・岩棚）: { x, y, w, h }     … trench-rules の solids と同じ
 *   - 円   （岩・弾）  : { x, y, r }       … game.js の rocks と同じ
 *   どちらかは w,h / r の有無で判別する。曖昧さを避けたい場合は kind:'rect'|'circle' を明示する。
 *
 * 座標系は本編と同じ論理解像度 1280x720、単位はゲーム内ピクセル。y は下向き正。
 */

export const GEOM_EPS = 1e-9;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/** 図形の種類を判別する（明示 kind/type 優先、無ければ w,h / r で推定）。 */
export function shapeKind(s){
  if (!s || typeof s !== 'object') return null;
  if (s.kind === 'rect' || s.type === 'rect') return 'rect';
  if (s.kind === 'circle' || s.type === 'circle') return 'circle';
  if (typeof s.w === 'number' && typeof s.h === 'number') return 'rect';
  if (typeof s.r === 'number') return 'circle';
  return null;
}

const asRect   = (s, pad) => ({ x: s.x - pad, y: s.y - pad, w: s.w + pad * 2, h: s.h + pad * 2 });
const asCircle = (s, pad) => ({ x: s.x, y: s.y, r: s.r + pad });

/* --------------------------------------------------------------------------
 * 線分 vs 図形（最初に当たる点と面法線）: 反射の「幾何ヒット」の基本形。
 * ------------------------------------------------------------------------ */

/**
 * 線分 vs 矩形（AABB）。最初に当たる点を { t, x, y, nx, ny } で返す。当たらなければ null。
 * 面法線 nx,ny は外向き（例: 左面へ +x で進入 → (-1,0)）。
 * 角（2面に同時に当たる）では、進入方向へ最も逆らう面を選ぶ＝角で固着しない・反射が安定する。
 * 始点が矩形の内側なら t=0 で最も浅い面へ押し出す法線を返す。
 */
export function segRectHitNormal(x0, y0, x1, y1, rect){
  const dx = x1 - x0, dy = y1 - y0;
  const minX = rect.x, maxX = rect.x + rect.w, minY = rect.y, maxY = rect.y + rect.h;

  if (x0 > minX && x0 < maxX && y0 > minY && y0 < maxY){
    const left = x0 - minX, right = maxX - x0, top = y0 - minY, bottom = maxY - y0;
    const m = Math.min(left, right, top, bottom);
    if (m === left)  return { t:0, x:minX, y:y0, nx:-1, ny:0, shape:'rect' };
    if (m === right) return { t:0, x:maxX, y:y0, nx: 1, ny:0, shape:'rect' };
    if (m === top)   return { t:0, x:x0, y:minY, nx:0, ny:-1, shape:'rect' };
    return                 { t:0, x:x0, y:maxY, nx:0, ny: 1, shape:'rect' };
  }

  let t0 = 0, t1 = 1;
  const clip = (p, q) => {
    if (p === 0) return q >= 0;
    const t = q / p;
    if (p < 0){ if (t > t1) return false; if (t > t0) t0 = t; }
    else      { if (t < t0) return false; if (t < t1) t1 = t; }
    return true;
  };
  if (!(clip(-dx, x0 - minX) && clip(dx, maxX - x0) && clip(-dy, y0 - minY) && clip(dy, maxY - y0))) return null;
  if (t0 > 1 || t1 < 0) return null;

  const hx = x0 + dx * t0, hy = y0 + dy * t0;
  const eps = 1e-6 * (1 + Math.abs(hx) + Math.abs(hy));
  let best = null;
  const consider = (nx, ny) => {
    const dot = dx * nx + dy * ny;               // 進入方向との内積（小さい＝正面から突っ込む面）
    if (!best || dot < best.dot) best = { nx, ny, dot };
  };
  if (Math.abs(hx - minX) <= eps) consider(-1, 0);
  if (Math.abs(hx - maxX) <= eps) consider( 1, 0);
  if (Math.abs(hy - minY) <= eps) consider(0, -1);
  if (Math.abs(hy - maxY) <= eps) consider(0,  1);
  if (!best){ const L = Math.hypot(dx, dy) || 1; best = { nx:-dx / L, ny:-dy / L }; }
  return { t:t0, x:hx, y:hy, nx:best.nx, ny:best.ny, shape:'rect' };
}

/** 線分 vs 円。最初に当たる点を { t, x, y, nx, ny } で返す（法線は中心から外向き）。無ければ null。 */
export function segCircleHitNormal(x0, y0, x1, y1, circle){
  const dx = x1 - x0, dy = y1 - y0;
  const mx = x0 - circle.x, my = y0 - circle.y;
  const a = dx * dx + dy * dy;
  if (a < GEOM_EPS) return null;
  const b = 2 * (mx * dx + my * dy);
  const c = mx * mx + my * my - circle.r * circle.r;
  let disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  disc = Math.sqrt(disc);
  let t = (-b - disc) / (2 * a);
  if (c <= 0){                                    // 始点が円の内側: t=0 で外向き法線
    const L = Math.hypot(mx, my) || 1;
    return { t:0, x:x0, y:y0, nx:mx / L, ny:my / L, shape:'circle' };
  }
  if (t < 0 || t > 1) return null;
  const hx = x0 + dx * t, hy = y0 + dy * t;
  let nx = hx - circle.x, ny = hy - circle.y;
  const L = Math.hypot(nx, ny) || 1;
  return { t, x:hx, y:hy, nx:nx / L, ny:ny / L, shape:'circle' };
}

/**
 * 線分 vs 図形の配列。最初（最小 t）に当たる1件を返す。無ければ null。
 * 「最初の hit」を1か所で決める＝可視経路と実当たりを一致させる土台。
 */
export function castSegment(x0, y0, x1, y1, shapes, pad = 0){
  if (!shapes || !shapes.length) return null;
  let best = null;
  for (const s of shapes){
    const k = shapeKind(s);
    if (!k) continue;
    const h = (k === 'rect')
      ? segRectHitNormal(x0, y0, x1, y1, asRect(s, pad))
      : segCircleHitNormal(x0, y0, x1, y1, asCircle(s, pad));
    if (h && (!best || h.t < best.t)) best = Object.assign({}, h, { ref:s });
  }
  return best;
}

/* --------------------------------------------------------------------------
 * 入力接触の連続判定（掃引）: 動く円 vs 静止図形。
 *   - 反射の入力（線分）と、フレームをまたぐ移動体（円）の接触を同じ式で扱う。
 *   - 返り値は { t, x, y, nx, ny }。t は移動ベクトルに対する 0..1 の割合。
 * ------------------------------------------------------------------------ */

/** 円（半径 ar）が rect へ最初に接する t。移動ベクトルは (dx,dy)。無ければ null。 */
export function sweptCircleRect(ax, ay, ar, rect, dx, dy){
  const exp = { x:rect.x - ar, y:rect.y - ar, w:rect.w + ar * 2, h:rect.h + ar * 2, shape:'rect' };
  const h = segRectHitNormal(ax, ay, ax + dx, ay + dy, exp);
  if (!h || h.t < 0 || h.t > 1) return null;
  return { t:h.t, x:h.x, y:h.y, nx:h.nx, ny:h.ny, shape:'rect' };
}

/** 円（半径 ar）が円（半径 br）へ最初に接する t（ミンコフスキー和で線分 vs 円）。無ければ null。 */
export function sweptCircleCircle(ax, ay, ar, bx, by, br, dx, dy){
  const h = segCircleHitNormal(ax, ay, ax + dx, ay + dy, { x:bx, y:by, r:ar + br });
  if (!h || h.t < 0 || h.t > 1) return null;
  return { t:h.t, x:h.x, y:h.y, nx:h.nx, ny:h.ny, shape:'circle' };
}

/**
 * 動く円 vs 図形配列の「最初の接触」。最初（最小 t）の1件か null。
 * 移動は (dx,dy)、maxT は受け付ける t の上限（既定 1＝1フレームぶん）。
 */
export function firstContact(ax, ay, ar, shapes, dx, dy, maxT = 1){
  if (!shapes || !shapes.length) return null;
  let best = null;
  for (const s of shapes){
    const k = shapeKind(s);
    if (!k) continue;
    const h = (k === 'rect')
      ? sweptCircleRect(ax, ay, ar, s, dx, dy)
      : sweptCircleCircle(ax, ay, ar, s.x, s.y, s.r, dx, dy);
    if (h && h.t <= maxT && (!best || h.t < best.t)) best = Object.assign({}, h, { ref:s });
  }
  return best;
}

/* --------------------------------------------------------------------------
 * 小さな点判定（近接の遮蔽・内包チェック用）
 * ------------------------------------------------------------------------ */
export function pointInRect(x, y, rect, pad = 0){
  return x >= rect.x - pad && x <= rect.x + rect.w + pad && y >= rect.y - pad && y <= rect.y + rect.h + pad;
}
export function pointInCircle(x, y, c, pad = 0){
  const dx = x - c.x, dy = y - c.y, r = c.r + pad;
  return dx * dx + dy * dy <= r * r;
}
export function pointInShapes(x, y, shapes, pad = 0){
  for (const s of shapes){
    const k = shapeKind(s);
    if (k === 'rect' && pointInRect(x, y, s, pad)) return true;
    if (k === 'circle' && pointInCircle(x, y, s, pad)) return true;
  }
  return false;
}

export { clamp };
