/**
 * ABYSS DIVE — 海溝（固定地形）と第2前哨基地のルール（純粋ロジック / DOM 非依存）
 *
 * v1.12.0: 最初の基地（ボス1撃破で開く前哨基地）のさらに先に、海溝への「下り口」を 1 か所だけ
 *   固定地形で置く。だだっ広い横移動に、下方へ潜る分岐を足すのが狙い。
 *   - 入口（下り口）: 海底に開いた口。見える岩棚（リップ）と、通れる開口。
 *   - 海溝の中: 左右の壁に互い違いの岩棚（張り出し）を数枚。段差で小さな進路選択ができ、
 *     棚と棚の間は広く空ける（狭い道を連続させず、戦闘の広場を残す）。
 *   - 誘導: 下向きの灯り（ビーコン列）と、ゆっくり沈む水流。上から順に暗くしない。
 *   - 最奥の棚: 黒い岩の海溝の先に、青白い発光植物が生える落ち着いた棚（第2バイオーム）。
 *     暗い水全体を青く塗らず、局所の淡い青緑で読ませる。
 *   - その棚に固定の第2前哨基地。もう一体ボスを倒さなくても接岸できる。
 *
 * 座標は潜航・探索と同じ論理解像度 1280x720。海溝は y（深さ）方向へ FLOOR_Y より下へ潜る。
 * 描画（trench.js）と衝突（このファイル）は同じ矩形（solids）を共有する＝見た目と当たりが一致する。
 */

/** 海面から海底までの許容深度（game.js と同じ値）。trench はこの下へ潜る。 */
export const FLOOR_Y = 2600;

export const TRENCH = Object.freeze({
  ANCHOR_GAP: 1900,   // 第1基地マーカーからさらに先（右）へ。海溝の左端
  W: 2800,            // 海溝の区間の幅（背景の岩盤も含む）
  LIP: 260,           // 下り口の手前の平らな棚（海底の縁）
  MOUTH: 1800,        // 落ち込みの開口の幅（海溝の内側）
  WALL: 120,          // 落ち込みの左右の壁の厚み
  DEPTH: 1500,        // FLOOR_Y からさらに潜る深さ（海溝の底）
  LEDGE: 72,          // 岩棚（張り出し）の厚み
  BASE_R: 96,         // 第2基地のドック半径（第1基地と同寸）
  BASE_PAD: 60,       // 第2基地の入港受理の余白
  OPEN_BOSSES: 1,     // この数のボス撃破で第2基地が開く（＝ボスの追加撃破は要らない）
});

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/**
 * 海溝の基準点。第1基地マーカーの先（右）に固定で置く。
 * マーカーが無い（＝最初のボス未撃破）なら null＝海溝も現れない。
 */
export function trenchAnchor(baseMarker){
  if (!baseMarker || !Number.isFinite(baseMarker.x)) return null;
  return { x: baseMarker.x + TRENCH.ANCHOR_GAP };
}

let _cache = null;

/**
 * 海溝の固定レイアウト（世界座標）。同じ基準点では同じ結果を返す。
 * solids は描画と衝突で共有する矩形。guides は下向きの灯り、plants は発光植物。
 */
export function createTrench(baseMarker){
  const a = trenchAnchor(baseMarker);
  if (!a) return null;
  if (_cache && _cache.ax === a.x) return _cache;

  const ax = a.x;
  const lipX0 = ax, lipX1 = ax + TRENCH.LIP;
  const gorgeX0 = lipX1, gorgeX1 = gorgeX0 + TRENCH.MOUTH;
  const rightX1 = gorgeX1 + TRENCH.WALL;
  const floorY = FLOOR_Y + TRENCH.DEPTH;

  /* --- 描画＝衝突の矩形（岩盤・壁・岩棚）。材質は kind で描き分ける --- */
  const solids = [];
  /* 落ち込みの左右の壁（リップ/岩盤の下。上端は海底 FLOOR_Y） */
  solids.push({ id:'leftWall',  kind:'wall',  x: gorgeX0 - TRENCH.WALL, y: FLOOR_Y, w: TRENCH.WALL, h: floorY - FLOOR_Y });
  solids.push({ id:'rightWall', kind:'wall',  x: gorgeX1,               y: FLOOR_Y, w: TRENCH.WALL, h: floorY - FLOOR_Y });

  /* 互い違いの岩棚（張り出し）。幅は控えめ・間隔は広く＝狭い道を連続させない。 */
  const ledges = [
    { id:'shelf0', side:'L', x: gorgeX0,                y: FLOOR_Y + 30,   w: 380, h: TRENCH.LEDGE },  // 下り口すぐの見える棚
    { id:'ledgeR1', side:'R', x: gorgeX1 - 620,         y: FLOOR_Y + 430,  w: 620, h: TRENCH.LEDGE },
    { id:'ledgeL2', side:'L', x: gorgeX0,               y: FLOOR_Y + 820,  w: 560, h: TRENCH.LEDGE },
    { id:'ledgeR3', side:'R', x: gorgeX1 - 520,         y: FLOOR_Y + 1180, w: 520, h: TRENCH.LEDGE },
  ];
  for (const l of ledges) solids.push({ id:l.id, kind:'ledge', x:l.x, y:l.y, w:l.w, h:l.h });

  /* --- 下向きの誘導灯（ビーコン列）。海溝の中央を上から下へ --- */
  const guides = [];
  const gx = gorgeX0 + TRENCH.MOUTH * 0.5;
  for (let i = 0; i < 8; i++){
    guides.push({ x: gx + Math.sin(i * 1.7) * 90, y: FLOOR_Y - 120 + i * 200, r: 96, dir: 1, i });
  }
  /* 入口のビーコン（遠くから見える）。上へ伸びる光。 */
  const beacon = { x: gx, y: FLOOR_Y - 40 };

  /* --- 第2基地: 最奥の棚（床）の左寄り中央。床に半分埋もれないよう少し上げる。 --- */
  const base2 = { x: gorgeX0 + 900, y: floorY - 200 };

  /* --- 発光植物（青白い）。最奥の棚と下側の壁沿いに、決定的に並べる。 --- */
  const plants = [];
  const kinds = ['bulb', 'frond', 'bulb', 'bloom', 'frond', 'bulb'];
  for (let i = 0; i < 26; i++){
    const u = i / 25;
    const px = gorgeX0 + 90 + u * (TRENCH.MOUTH - 220);
    const py = floorY;
    plants.push({
      x: px, y: py, kind: kinds[i % kinds.length],
      s: 0.8 + ((i * 37) % 11) / 22,          // 0.8..1.3
      seed: (i * 97) % 360,
    });
  }
  /* 最奥の棚の上側（各岩棚の縁）にも少し */
  for (let i = 0; i < 6; i++){
    const l = ledges[(i + 1) % ledges.length];
    plants.push({ x: l.x + 60 + i * 24, y: l.y, kind: i % 2 ? 'bulb' : 'frond', s: 0.7 + (i % 4) / 12, seed: i * 61 });
  }

  const layout = {
    ax, lipX0, lipX1, gorgeX0, gorgeX1, rightX1,
    floorY, wallTop: FLOOR_Y, wallBottom: floorY, wallH: floorY - FLOOR_Y,
    regionX0: ax, regionX1: rightX1,
    solids, ledges, guides, beacon, plants, base2,
  };
  _cache = layout;
  return layout;
}

/** テスト用にキャッシュを捨てる。 */
export function _resetTrenchCache(){ _cache = null; }

/** x における「これ以上下へ行けない」床の y。海溝の開口の内側だけ深い。 */
export function trenchFloorYAt(x, layout){
  if (!layout) return FLOOR_Y;
  if (x > layout.gorgeX0 && x < layout.gorgeX1) return layout.floorY;
  return FLOOR_Y;
}

/** x が海溝の区間（背景の岩盤も含む）に入っているか。 */
export function inTrenchRegion(x, layout){
  return !!layout && x >= layout.regionX0 - 200 && x <= layout.regionX1 + 200;
}

/* --- 衝突（描画と共有する矩形に対して） -------------------------------- */

/** 円 vs 矩形の押し出し。重なっていなければ null。 */
export function circleRectResolve(cx, cy, r, rect){
  const nx = clamp(cx, rect.x, rect.x + rect.w);
  const ny = clamp(cy, rect.y, rect.y + rect.h);
  let dx = cx - nx, dy = cy - ny;
  const d = Math.hypot(dx, dy);
  if (d >= r) return null;
  if (d > 1e-6){
    dx /= d; dy /= d;
    return { x: nx + dx * r, y: ny + dy * r, nx: dx, ny: dy, depth: r - d };
  }
  /* 中心が矩形の内側: 最も浅い軸へ押し出す */
  const left = cx - rect.x, right = rect.x + rect.w - cx;
  const top = cy - rect.y, bottom = rect.y + rect.h - cy;
  const m = Math.min(left, right, top, bottom);
  if (m === left)  return { x: rect.x - r, y: cy, nx: -1, ny: 0, depth: r + left };
  if (m === right) return { x: rect.x + rect.w + r, y: cy, nx: 1, ny: 0, depth: r + right };
  if (m === top)   return { x: cx, y: rect.y - r, nx: 0, ny: -1, depth: r + top };
  return { x: cx, y: rect.y + rect.h + r, nx: 0, ny: 1, depth: r + bottom };
}

/**
 * 潜水艇（円）を海溝の地形から押し出す。床は margin 上で止める（既存の海底クランプと同義）。
 * 戻り値 { x, y, hit }。
 */
export function resolveSub(layout, x, y, r, margin){
  if (!layout) return { x, y, hit: false };
  let hit = false;
  const m = (margin === undefined) ? 60 : margin;
  let fy = trenchFloorYAt(x, layout) - m;
  if (y > fy){ y = fy; hit = true; }
  for (const s of layout.solids){
    const res = circleRectResolve(x, y, r, s);
    if (res){ x = res.x; y = res.y; hit = true; }
  }
  fy = trenchFloorYAt(x, layout) - m;
  if (y > fy){ y = fy; hit = true; }
  return { x, y, hit };
}

/** 線分 vs 矩形（Liang–Barsky）。最初に触れる点 { x, y, t } か null。 */
export function segRectHit(x0, y0, x1, y1, rect){
  const dx = x1 - x0, dy = y1 - y0;
  const minX = rect.x, maxX = rect.x + rect.w;
  const minY = rect.y, maxY = rect.y + rect.h;
  let t0 = 0, t1 = 1;
  const clip = (p, q) => {
    if (p === 0) return q >= 0;
    const t = q / p;
    if (p < 0){ if (t > t1) return false; if (t > t0) t0 = t; }
    else { if (t < t0) return false; if (t < t1) t1 = t; }
    return true;
  };
  if (!(clip(-dx, x0 - minX) && clip(dx, maxX - x0) && clip(-dy, y0 - minY) && clip(dy, maxY - y0))) return null;
  return { x: x0 + dx * t0, y: y0 + dy * t0, t: t0 };
}

/** 弾（線分）が海溝の地形へ最初に当たる点。無ければ null。 */
export function trenchSegHit(layout, x0, y0, x1, y1, pad){
  if (!layout) return null;
  const p = pad || 0;
  let best = null, bt = Infinity;
  for (const s of layout.solids){
    const rect = p ? { x: s.x - p, y: s.y - p, w: s.w + p * 2, h: s.h + p * 2 } : s;
    const h = segRectHit(x0, y0, x1, y1, rect);
    if (h && h.t < bt){ bt = h.t; best = h; }
  }
  return best;
}

/* --- 第2前哨基地（入港ゲート・段階表示） -------------------------------- */

/** 第2基地が開いているか（ボス1撃破で開く＝追加のボス撃破は要らない）。 */
export function base2Open(bossKills){
  return (Math.floor(Number(bossKills) || 0)) >= TRENCH.OPEN_BOSSES;
}

/** 第2基地の入港マーカー（未開放・海溝が無いなら null）。 */
export function base2Marker(baseMarker, bossKills){
  if (!base2Open(bossKills)) return null;
  const t = createTrench(baseMarker);
  if (!t) return null;
  return { x: t.base2.x, y: t.base2.y };
}

/** 第2基地の明示入港の受理範囲。 */
export function base2DockNear(px, py, marker){
  if (!marker) return false;
  return Math.hypot(px - marker.x, py - marker.y) <= TRENCH.BASE_R + TRENCH.BASE_PAD;
}

/** 第2基地の段階表示（引き継ぎ用。0=遠い 1=近い）。 */
export function base2Stage(px, py, marker){
  if (!marker) return 'none';
  const d = Math.hypot(px - marker.x, py - marker.y);
  if (d <= TRENCH.BASE_R + TRENCH.BASE_PAD) return 'dock';
  if (d <= 700) return 'wall';
  if (d <= 1600) return 'approach';
  return 'none';
}

/**
 * 海溝の段階（ラベル・誘導用）。
 *   'none' … 対象外 / 'beacon' … 遠くに灯り / 'mouth' … 下り口の近く / 'inside' … 海溝の中。
 */
export function trenchStage(px, py, layout){
  if (!layout) return 'none';
  if (px > layout.gorgeX0 && px < layout.gorgeX1 && py > layout.wallTop - 60) return 'inside';
  const d = Math.hypot(px - layout.beacon.x, py - layout.beacon.y);
  if (d <= 900) return 'mouth';
  if (d <= 2200) return 'beacon';
  return 'none';
}
