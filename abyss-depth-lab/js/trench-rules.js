/**
 * ABYSS DIVE — 海溝（固定地形）・第2前哨基地「深棚」・深棚下の2分岐と合流広間のルール（純粋ロジック / DOM 非依存）
 *
 * 世界の縦構造（『海底4万マイル』・下に広がるピラミッド構造の第1拡張フェーズ）:
 *   1. 海溝と第2前哨基地「深棚」（y = 2600..4100）
 *   2. 深棚の下で 2 ルートに分岐:
 *      - 左ルート「狭洞窟・直下降」（y = 4100..5650）: 暗く閉じた岩窟と互い違い岩棚
 *      - 右ルート「熱水・火山帯 横回り」（y = 3540..5650）: 深棚右壁の横穴から玄武岩回廊・噴出口を経て下降
 *   3. 下層「合流広間 — クラゲ帯／海草林」（y = 5650..6900）:
 *      2 ルートが合流する明るく澄んだ大空間。どちらのルートからも深棚へ自力帰還可能。
 *
 * 座標は潜航・探索と同じ論理解像度 1280x720。
 * 描画（trench.js）・衝突（このファイル）・透過マップ（dive-map.js）・WebGL2（depth-bridge.js）が
 * すべて同一のレイアウトと solids を共有する。
 */

/** 海面から海底までの許容深度（game.js と同じ値）。trench はこの下へ潜る。 */
export const FLOOR_Y = 2600;

export const TRENCH = Object.freeze({
  ANCHOR_GAP: 1900,   // 第1基地マーカーからさらに先（右）へ。海溝の左端
  W: 2800,            // 海溝の区間の幅（背景の岩盤も含む）
  LIP: 260,           // 下り口の手前の平らな棚（海底の縁）
  MOUTH: 1800,        // 落ち込みの開口の幅（海溝の内側）
  WALL: 120,          // 落ち込みの左右の壁の厚み
  DEPTH: 1500,        // FLOOR_Y から深棚床までの深さ（y = 4100）
  DEEP_DEPTH: 4300,   // FLOOR_Y から合流広間の底までの総深さ（y = 6900）
  LEDGE: 72,          // 岩棚（張り出し）の厚み
  BASE_R: 96,         // 第2基地のドック半径（第1基地と同寸）
  BASE_PAD: 60,       // 第2基地の入港受理の余白
  OPEN_BOSSES: 0,     // v3.10.0: オープンワールド方針により最初の出港から開放
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
 * 海溝＋深棚下 2 分岐＋合流広間の固定レイアウト（世界座標）。同じ基準点では同じ結果を返す。
 * solids は描画と衝突で共有する矩形。
 */
export function createTrench(baseMarker){
  const a = trenchAnchor(baseMarker);
  if (!a) return null;
  if (_cache && _cache.ax === a.x) return _cache;

  const ax = a.x;
  const lipX0 = ax, lipX1 = ax + TRENCH.LIP;
  const gorgeX0 = lipX1, gorgeX1 = gorgeX0 + TRENCH.MOUTH;
  const rightX1 = gorgeX1 + TRENCH.WALL;
  const floorY = FLOOR_Y + TRENCH.DEPTH;          // 4100: 深棚の床
  const hallTopY = 5650;                          // 合流広間の天井ライン
  const deepFloorY = FLOOR_Y + TRENCH.DEEP_DEPTH; // 6900: 合流広間の底
  const mantleTopY = 8500;                        // マントル上層・発光深淵の天井ライン
  const mantleFloorY = 9900;                      // マントル上層の底

  /* --- 深棚下の座標（下に広がるピラミッド構造） --- */
  // 左ルート: 狭洞窟・直下降
  const caveX0 = gorgeX0 + 80;
  const caveX1 = gorgeX0 + 700;                   // 幅 620px（最小通過幅 >= 340px で自力帰還容易）

  // 右ルート: 熱水・火山帯 横回り〜下降竪穴
  const ventGateTopY = 3540;                      // 深棚右壁の横穴上端（高さ 560px の広い開口）
  const ventX0 = gorgeX1;
  const ventShaftX0 = ventX0 + 1360;              // 横回り回廊の奥、ここから下へ降りる
  const ventX1 = ventX0 + 2200;                   // 火山竪穴の右端（幅 840px）

  // 下層: 合流広間（海草林／クラゲ帯）
  const hallX0 = caveX0 - 320;
  const hallX1 = ventX1 + 320;

  // v3.11.0: 大深度・海流回廊（左＝高速下降／右＝帰還上昇）＆ マントル上層・発光深淵
  const corridorDown = {
    id: 'corridor_down', dir: 1,
    x0: hallX0 + 140, x1: hallX0 + 580,
    y0: deepFloorY, y1: mantleTopY,
    speed: 1080,
  };
  const corridorUp = {
    id: 'corridor_up', dir: -1,
    x0: hallX1 - 580, x1: hallX1 - 140,
    y0: deepFloorY, y1: mantleTopY,
    speed: 1080,
  };
  const corridors = [corridorDown, corridorUp];
  const mantleX0 = hallX0 - 240;
  const mantleX1 = hallX1 + 240;

  /* --- 描画＝衝突の矩形（岩盤・壁・岩棚）。biome で質感・色を出し分ける --- */
  const solids = [];

  // 1) 海溝の左右壁（右壁は y=3540 で止め、下部に熱水帯への横穴を開ける）
  solids.push({ id:'leftWall',  kind:'wall', biome:'trench', x: gorgeX0 - TRENCH.WALL, y: FLOOR_Y, w: TRENCH.WALL, h: floorY - FLOOR_Y });
  solids.push({ id:'rightWall', kind:'wall', biome:'trench', x: gorgeX1,               y: FLOOR_Y, w: TRENCH.WALL, h: ventGateTopY - FLOOR_Y });

  // 海溝の互い違い岩棚（既存そのまま）
  const ledges = [
    { id:'shelf0',  side:'L', biome:'trench', x: gorgeX0,        y: FLOOR_Y + 30,   w: 380, h: TRENCH.LEDGE },
    { id:'ledgeR1', side:'R', biome:'trench', x: gorgeX1 - 620,  y: FLOOR_Y + 430,  w: 620, h: TRENCH.LEDGE },
    { id:'ledgeL2', side:'L', biome:'trench', x: gorgeX0,        y: FLOOR_Y + 820,  w: 560, h: TRENCH.LEDGE },
    { id:'ledgeR3', side:'R', biome:'trench', x: gorgeX1 - 520,  y: FLOOR_Y + 1180, w: 520, h: TRENCH.LEDGE },
  ];
  for (const l of ledges) solids.push({ id:l.id, kind:'ledge', biome:l.biome, x:l.x, y:l.y, w:l.w, h:l.h });

  // 2) 深棚の床と狭洞窟・熱水帯の仕切り岩盤
  // 左端の岩盤キャップ（gorgeX0..caveX0 の隙間を閉じ、そのまま合流広間左天井まで岩盤で覆う）
  solids.push({
    id:'caveLeftMass', kind:'wall', biome:'cave',
    x: hallX0 - 160, y: floorY, w: caveX0 - (hallX0 - 160), h: hallTopY - floorY,
  });
  // 中央大岩盤（深棚基地 base2 の下の床兼、狭洞窟と熱水帯を隔てる壁）
  solids.push({
    id:'dividerWall', kind:'wall', biome:'cave',
    x: caveX1, y: floorY, w: gorgeX1 - caveX1, h: hallTopY - floorY,
  });

  // 狭洞窟内の互い違い岩棚（狭い岩窟の緊張感と、最小通過幅 340px 以上の自力帰還性を両立）
  const caveLedges = [
    { id:'caveLedgeL1', kind:'ledge', biome:'cave', x: caveX0,        y: floorY + 290,  w: 260, h: 64 },
    { id:'caveLedgeR1', kind:'ledge', biome:'cave', x: caveX1 - 270,  y: floorY + 700,  w: 270, h: 64 },
    { id:'caveLedgeL2', kind:'ledge', biome:'cave', x: caveX0,        y: floorY + 1110, w: 250, h: 64 },
  ];
  for (const l of caveLedges) solids.push(l);

  // 3) 熱水・火山帯（横回り回廊＋火山竪穴）
  // 浅場海底〜熱水回廊天井の厚い岩盤（浅場から天井をすり抜ける事故を物理的に防ぐ）
  solids.push({
    id:'ventRoofBedrock', kind:'wall', biome:'volcanic',
    x: ventX0 + TRENCH.WALL, y: FLOOR_Y, w: (ventX1 + 160) - (ventX0 + TRENCH.WALL), h: ventGateTopY - FLOOR_Y,
  });
  // 熱水回廊の床＋火山竪穴の左岩盤
  solids.push({
    id:'ventFloorMass', kind:'wall', biome:'volcanic',
    x: ventX0, y: floorY, w: ventShaftX0 - ventX0, h: hallTopY - floorY,
  });
  // 熱水・火山帯の右外壁
  solids.push({
    id:'ventRightWall', kind:'wall', biome:'volcanic',
    x: ventX1, y: ventGateTopY, w: 160, h: hallTopY - ventGateTopY,
  });
  // 火山竪穴の玄武岩張り出し（通過幅 >= 480px）
  const ventLedges = [
    { id:'ventLedgeR1', kind:'ledge', biome:'volcanic', x: ventX1 - 350, y: floorY + 460, w: 350, h: 72 },
    { id:'ventLedgeL1', kind:'ledge', biome:'volcanic', x: ventShaftX0,  y: floorY + 960, w: 350, h: 72 },
  ];
  for (const l of ventLedges) solids.push(l);

  // 4) 合流広間（海草林／クラゲ帯）の外壁・右天井縁・観賞用岩棚
  solids.push({
    id:'hallCeilR', kind:'wall', biome:'hall',
    x: ventX1, y: hallTopY - 120, w: (hallX1 + 160) - ventX1, h: 120,
  });
  solids.push({
    id:'hallLeftWall', kind:'wall', biome:'hall',
    x: hallX0 - 160, y: hallTopY, w: 160, h: deepFloorY - hallTopY,
  });
  solids.push({
    id:'hallRightWall', kind:'wall', biome:'hall',
    x: hallX1, y: hallTopY, w: 160, h: deepFloorY - hallTopY,
  });
  // 広間のランドマーク岩段差（大きく開けた空間を保ちつつ海草・発光植物を乗せる）
  solids.push({ id:'hallShelf1', kind:'ledge', biome:'hall', x: caveX1 + 260, y: deepFloorY - 340, w: 680, h: 72 });
  solids.push({ id:'hallShelf2', kind:'ledge', biome:'hall', x: ventX0 + 520, y: deepFloorY - 460, w: 560, h: 72 });

  // 5) 合流広間とマントル上層を隔てる大深度地殻岩盤（左右の海流回廊だけ開通）
  solids.push({
    id:'corridorLeftWall', kind:'wall', biome:'volcanic',
    x: mantleX0 - 160, y: deepFloorY, w: corridorDown.x0 - (mantleX0 - 160), h: mantleTopY - deepFloorY,
  });
  solids.push({
    id:'corridorCenterMass', kind:'wall', biome:'volcanic',
    x: corridorDown.x1, y: deepFloorY, w: corridorUp.x0 - corridorDown.x1, h: mantleTopY - deepFloorY,
  });
  solids.push({
    id:'corridorRightWall', kind:'wall', biome:'volcanic',
    x: corridorUp.x1, y: deepFloorY, w: (mantleX1 + 160) - corridorUp.x1, h: mantleTopY - deepFloorY,
  });
  // マントル上層の左右外壁
  solids.push({
    id:'mantleLeftWall', kind:'wall', biome:'volcanic',
    x: mantleX0 - 160, y: mantleTopY, w: 160, h: mantleFloorY - mantleTopY,
  });
  solids.push({
    id:'mantleRightWall', kind:'wall', biome:'volcanic',
    x: mantleX1, y: mantleTopY, w: 160, h: mantleFloorY - mantleTopY,
  });

  /* --- 下向きの誘導灯（ビーコン列）。海溝中央＋両ルート入口 --- */
  const guides = [];
  const gx = gorgeX0 + TRENCH.MOUTH * 0.5;
  for (let i = 0; i < 8; i++){
    guides.push({ x: gx + Math.sin(i * 1.7) * 90, y: FLOOR_Y - 120 + i * 200, r: 96, dir: 1, i });
  }
  const beacon = { x: gx, y: FLOOR_Y - 40 };

  /* --- 第2基地「深棚」: 最奥の棚の中央（dividerWall の真上で安定） --- */
  const base2 = { x: gorgeX0 + 900, y: floorY - 200 };

  /* --- 発光植物（青白い）。深棚と岩棚、さらに合流広間の床にも配置 --- */
  const plants = [];
  const kinds = ['bulb', 'frond', 'bulb', 'bloom', 'frond', 'bulb'];
  for (let i = 0; i < 20; i++){
    const u = i / 19;
    const px = caveX1 + 60 + u * (gorgeX1 - caveX1 - 120);
    plants.push({
      x: px, y: floorY, kind: kinds[i % kinds.length],
      s: 0.8 + ((i * 37) % 11) / 22,
      seed: (i * 97) % 360,
      biome: 'trench',
    });
  }
  for (let i = 0; i < 6; i++){
    const l = ledges[(i + 1) % ledges.length];
    plants.push({ x: l.x + 60 + i * 24, y: l.y, kind: i % 2 ? 'bulb' : 'frond', s: 0.7 + (i % 4) / 12, seed: i * 61, biome: 'trench' });
  }
  // 合流広間の大型発光海草＆青紫ブルーム群
  for (let i = 0; i < 34; i++){
    const u = i / 33;
    const px = hallX0 + 120 + u * (hallX1 - hallX0 - 240);
    if ((px > corridorDown.x0 - 40 && px < corridorDown.x1 + 40) ||
        (px > corridorUp.x0 - 40 && px < corridorUp.x1 + 40)) continue;
    plants.push({
      x: px, y: deepFloorY,
      kind: i % 3 === 0 ? 'bloom' : (i % 2 === 0 ? 'frond' : 'bulb'),
      s: 1.15 + ((i * 29) % 11) / 18,
      seed: (i * 131 + 17) % 360,
      biome: 'hall',
    });
  }
  // マントル上層の青白＆黄金発光深淵植物群
  for (let i = 0; i < 38; i++){
    const u = i / 37;
    const px = mantleX0 + 140 + u * (mantleX1 - mantleX0 - 280);
    plants.push({
      x: px, y: mantleFloorY,
      kind: i % 2 === 0 ? 'bloom' : 'frond',
      s: 1.35 + ((i * 41) % 11) / 16,
      seed: (i * 173 + 29) % 360,
      biome: 'mantle',
    });
  }

  /* --- 熱水・火山帯の噴出口（vents）: 琥珀・赤錆の局所光と上昇プルーム --- */
  const vents = [
    { x: ventX0 + 260, y: floorY,       power: 0.95, seed: 11 },
    { x: ventX0 + 640, y: floorY,       power: 1.15, seed: 29 },
    { x: ventX0 + 1060, y: floorY,      power: 1.05, seed: 47 },
    { x: ventX1 - 210, y: floorY + 460, power: 0.90, seed: 73 },
    { x: ventShaftX0 + 170, y: floorY + 960, power: 1.10, seed: 97 },
    { x: ventShaftX0 + 460, y: deepFloorY,   power: 0.85, seed: 123 },
  ];

  /* --- バイオーム領域（world-biomes.js の sampleBiomeAt が参照する同一座標系） --- */
  const biomes = {
    trench_shelf:    { x0: gorgeX0 - 120, y0: FLOOR_Y + 60,     x1: gorgeX1 + 120, y1: floorY + 120 },
    narrow_cave:     { x0: caveX0 - 160,  y0: floorY - 40,      x1: caveX1 + 160,  y1: hallTopY + 80 },
    hydrothermal:    { x0: ventX0 - 120,  y0: ventGateTopY - 60, x1: ventX1 + 160,  y1: hallTopY + 80 },
    confluence_hall: { x0: hallX0 - 120,  y0: hallTopY - 80,    x1: hallX1 + 120,  y1: deepFloorY + 60 },
    abyss_corridor:  { x0: mantleX0 - 80, y0: deepFloorY + 40,  x1: mantleX1 + 80, y1: mantleTopY - 40 },
    mantle_upper:    { x0: mantleX0 - 120, y0: mantleTopY - 40, x1: mantleX1 + 120, y1: mantleFloorY + 260 },
  };

  /* --- 父のスティングレー号＆ponco Mark I の物理的痕跡（描画・発見・マップで共有） --- */
  const traces = [
    {
      id: 'stingray-hull',
      kind: 'hull_plate',
      label: 'スティングレー号 パージ外装',
      radioId: 'trace_stingray_hull',
      x: gorgeX0 + 480,
      y: floorY - 46,
      r: 360,
      biome: 'trench',
    },
    {
      id: 'mark1-weld',
      kind: 'weld_dock',
      label: 'Mark I 仮設ドック溶接痕',
      radioId: 'trace_mark1_weld',
      x: (mantleX0 + mantleX1) * 0.5 - 320,
      y: mantleFloorY - 44,
      r: 420,
      biome: 'mantle',
    },
  ];

  /* --- 発見ポイント座標（map-rules.js / game.js が共有） --- */
  const sites = {
    caveRoute:      { x: (caveX0 + caveX1) * 0.5,        y: floorY + 420 },
    volcanicVent:   { x: ventX0 + 680,                   y: floorY - 220 },
    confluenceHall: { x: (hallX0 + hallX1) * 0.5,        y: (hallTopY + deepFloorY) * 0.5 },
    mantleUpper:    { x: (mantleX0 + mantleX1) * 0.5,    y: (mantleTopY + mantleFloorY) * 0.5 },
    stingrayHull:   { x: traces[0].x,                    y: traces[0].y },
    mark1Weld:      { x: traces[1].x,                    y: traces[1].y },
  };

  const regionX0 = Math.min(ax, mantleX0 - 160);
  const regionX1 = mantleX1 + 160;

  const layout = {
    ax, lipX0, lipX1, gorgeX0, gorgeX1, rightX1,
    floorY, deepFloorY, hallTopY, mantleTopY, mantleFloorY,
    wallTop: FLOOR_Y, wallBottom: mantleFloorY, wallH: mantleFloorY - FLOOR_Y,
    caveX0, caveX1,
    ventGateTopY, ventX0, ventShaftX0, ventX1,
    hallX0, hallX1, mantleX0, mantleX1,
    corridorDown, corridorUp, corridors,
    regionX0, regionX1,
    solids, ledges, caveLedges, ventLedges, guides, beacon, plants, vents, traces, base2,
    biomes, sites,
  };
  _cache = layout;
  return layout;
}

/** テスト用にキャッシュを捨てる。 */
export function _resetTrenchCache(){ _cache = null; }

/**
 * x（および任意の現在深度 y）における「これ以上下へ行けない」床の y。
 * 海溝・狭洞窟・熱水帯・合流広間の開口内だけ深く潜れる。
 */
export function trenchFloorYAt(x, layout, y){
  if (!layout) return FLOOR_Y;
  // 浅場（海底 FLOOR_Y 付近）で海溝開口の外側にいる場合は通常の海底で止める
  if (y !== undefined && y < layout.wallTop + 140) {
    if (x > layout.gorgeX0 && x < layout.gorgeX1) return layout.deepFloorY;
    return FLOOR_Y;
  }
  // 大深度・海流回廊またはマントル上層にいる場合はマントル底まで潜れる
  if (layout.mantleFloorY) {
    if (y !== undefined && y >= layout.mantleTopY - 120 && x > layout.mantleX0 && x < layout.mantleX1) {
      return layout.mantleFloorY;
    }
    if (layout.corridors) {
      for (const c of layout.corridors) {
        if (x > c.x0 && x < c.x1 && (y === undefined || y >= layout.deepFloorY - 220)) {
          return layout.mantleFloorY;
        }
      }
    }
  }
  if (x > layout.hallX0 && x < layout.hallX1) return layout.deepFloorY;
  if (x > layout.gorgeX0 && x < layout.gorgeX1) return layout.deepFloorY;
  return FLOOR_Y;
}

/** 座標 (x, y) が大深度・海流回廊（下降／上昇）の中にあるか。該当回廊オブジェクトか null を返す。 */
export function corridorAt(x, y, layout){
  if (!layout || !layout.corridors) return null;
  for (const c of layout.corridors){
    if (x >= c.x0 && x <= c.x1 && y >= c.y0 - 40 && y <= c.y1 + 40) return c;
  }
  return null;
}

/** x が海溝〜合流広間の区間（背景の岩盤も含む）に入っているか。 */
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
 * 潜水艇（円）を海溝・狭洞窟・熱水帯・合流広間の地形から押し出す。
 * 床は margin 上で止める（既存の海底クランプと同義）。戻り値 { x, y, hit }。
 */
export function resolveSub(layout, x, y, r, margin){
  if (!layout) return { x, y, hit: false };
  let hit = false;
  const m = (margin === undefined) ? 60 : margin;
  let fy = trenchFloorYAt(x, layout, y) - m;
  if (y > fy){ y = fy; hit = true; }
  // コーナーでの二重接触も確実に解決するため最大 2 パス押し出し
  for (let pass = 0; pass < 2; pass++) {
    let any = false;
    for (const s of layout.solids){
      const res = circleRectResolve(x, y, r, s);
      if (res){ x = res.x; y = res.y; hit = true; any = true; }
    }
    if (!any) break;
  }
  fy = trenchFloorYAt(x, layout, y) - m;
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

/** 弾（線分）が海溝・深層地形へ最初に当たる点。無ければ null。 */
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
  if (px > layout.hallX0 && px < layout.hallX1 && py > layout.wallTop - 60) return 'inside';
  if (px > layout.gorgeX0 && px < layout.gorgeX1 && py > layout.wallTop - 60) return 'inside';
  const d = Math.hypot(px - layout.beacon.x, py - layout.beacon.y);
  if (d <= 900) return 'mouth';
  if (d <= 2200) return 'beacon';
  return 'none';
}
