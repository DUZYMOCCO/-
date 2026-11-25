/**
 * ABYSS DIVE — ストーリー準拠ワールド＆バイオーム定義（純粋ロジック / DOM 非依存）
 *
 * 描画（depth-bridge.js / shaders.js / trench.js）・実地形衝突（trench-rules.js / game.js）・
 * 透過マップ（map-rules.js / dive-map.js）・将来の敵生態配置が同一の座標系とバイオーム規則を
 * 参照するための単一情報源（Single Source of Truth）。
 *
 * 設計原則（docs/DEEP_FIELD_PLAN.md / docs/STORY.md 準拠）:
 *   - 深度と明るさを直結させない。水色・見通し（濁り）・環境光・散乱光・暗幕倍率を
 *     バイオームごとに独立設定し、境界では滑らかに連続補間してスパイクを起こさない。
 *   - 序盤〜第1拡張フェーズ（深棚の下 2 分岐＋合流広間）では、物語後半のネタバレ語句を一切含めない。
 */

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smoothstep = (e0, e1, x) => {
  const t = clamp((x - e0) / Math.max(1e-6, e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

/** バイオーム ID 一覧（順序固定） */
export const BIOME_IDS = Object.freeze([
  'sunken_city',
  'trench_shelf',
  'narrow_cave',
  'hydrothermal',
  'confluence_hall',
]);

/**
 * 各バイオームの環境パラメータ定義
 * - fogColor: 水中霧・背景クリア色 [r, g, b] (0..1)
 * - shallowAmb / deepAmb: Tier4 環境光 [r, g, b]
 * - scatterTint: 水中インスキャタリング色 [r, g, b]
 * - ambientBoost: 環境光強度倍率
 * - turbidity: 水の濁り（低いほど澄んで奥まで見渡せる）
 * - caustics: 海面コースティクス強度 (0..1)
 * - darkMaskMul: Canvas2D 暗幕のバイオーム補正（狭洞窟は暗く、合流広間は明るく抜ける）
 * - mapTint: 透過マップ上の海域トーン (CSS rgba)
 */
export const BIOMES = Object.freeze({
  sunken_city: Object.freeze({
    id: 'sunken_city',
    label: '沈没都市の外縁',
    fogColor: Object.freeze([0.018, 0.068, 0.095]),
    shallowAmb: Object.freeze([0.068, 0.185, 0.235]),
    deepAmb: Object.freeze([0.016, 0.052, 0.088]),
    scatterTint: Object.freeze([0.10, 0.28, 0.36]),
    ambientBoost: 1.00,
    turbidity: 1.00,
    caustics: 1.00,
    darkMaskMul: 1.00,
    mapTint: 'rgba(22, 86, 114, 0.24)',
  }),
  trench_shelf: Object.freeze({
    id: 'trench_shelf',
    label: '海溝・深棚',
    fogColor: Object.freeze([0.014, 0.052, 0.078]),
    shallowAmb: Object.freeze([0.032, 0.102, 0.144]),
    deepAmb: Object.freeze([0.014, 0.048, 0.078]),
    scatterTint: Object.freeze([0.08, 0.25, 0.34]),
    ambientBoost: 0.78,
    turbidity: 1.04,
    caustics: 0.10,
    darkMaskMul: 0.94,
    mapTint: 'rgba(14, 58, 82, 0.28)',
  }),
  narrow_cave: Object.freeze({
    id: 'narrow_cave',
    label: '狭洞窟',
    fogColor: Object.freeze([0.007, 0.015, 0.026]),
    shallowAmb: Object.freeze([0.012, 0.022, 0.036]),
    deepAmb: Object.freeze([0.006, 0.012, 0.022]),
    scatterTint: Object.freeze([0.06, 0.15, 0.24]),
    ambientBoost: 0.36,
    turbidity: 1.24,
    caustics: 0.00,
    darkMaskMul: 1.24,
    mapTint: 'rgba(10, 18, 30, 0.42)',
  }),
  hydrothermal: Object.freeze({
    id: 'hydrothermal',
    label: '熱水・火山帯',
    fogColor: Object.freeze([0.058, 0.024, 0.014]),
    shallowAmb: Object.freeze([0.110, 0.048, 0.024]),
    deepAmb: Object.freeze([0.072, 0.028, 0.014]),
    scatterTint: Object.freeze([0.42, 0.19, 0.08]),
    ambientBoost: 0.74,
    turbidity: 1.12,
    caustics: 0.00,
    darkMaskMul: 0.84,
    mapTint: 'rgba(130, 52, 24, 0.26)',
  }),
  confluence_hall: Object.freeze({
    id: 'confluence_hall',
    label: '合流広間・海草林',
    fogColor: Object.freeze([0.026, 0.092, 0.132]),
    shallowAmb: Object.freeze([0.078, 0.178, 0.236]),
    deepAmb: Object.freeze([0.058, 0.128, 0.210]),
    scatterTint: Object.freeze([0.20, 0.36, 0.52]),
    ambientBoost: 1.08,
    turbidity: 0.58,
    caustics: 0.00,
    darkMaskMul: 0.54,
    mapTint: 'rgba(46, 138, 168, 0.28)',
  }),
});

/** 矩形領域への符号付き距離（内側で負、境界で 0、外側で正）。 */
function rectSdf(x, y, r) {
  const dx = Math.max(r.x0 - x, 0, x - r.x1);
  const dy = Math.max(r.y0 - y, 0, y - r.y1);
  if (dx > 0 || dy > 0) return Math.hypot(dx, dy);
  const ix = Math.min(x - r.x0, r.x1 - x);
  const iy = Math.min(y - r.y0, r.y1 - y);
  return -Math.min(ix, iy);
}

/**
 * 座標 (x, y) におけるバイオーム状態と環境パラメータを滑らかに補間して返す。
 *
 * @param {number} x - ワールド X
 * @param {number} y - ワールド Y
 * @param {object|null} layout - createTrench() が返すワールド地形レイアウト（未開放なら null）
 * @returns {{
 *   primaryId: string,
 *   label: string,
 *   weights: Record<string, number>,
 *   fogColor: [number, number, number],
 *   shallowAmb: [number, number, number],
 *   deepAmb: [number, number, number],
 *   scatterTint: [number, number, number],
 *   ambientBoost: number,
 *   turbidity: number,
 *   caustics: number,
 *   darkMaskMul: number,
 * }}
 */
export function sampleBiomeAt(x, y, layout) {
  const wx = Number.isFinite(x) ? x : 0;
  const wy = Number.isFinite(y) ? y : 0;

  // 海溝未開放時は沈没都市の外縁 100%
  if (!layout || !layout.biomes) {
    const b = BIOMES.sunken_city;
    return {
      primaryId: b.id,
      label: b.label,
      weights: {
        sunken_city: 1,
        trench_shelf: 0,
        narrow_cave: 0,
        hydrothermal: 0,
        confluence_hall: 0,
      },
      fogColor: [...b.fogColor],
      shallowAmb: [...b.shallowAmb],
      deepAmb: [...b.deepAmb],
      scatterTint: [...b.scatterTint],
      ambientBoost: b.ambientBoost,
      turbidity: b.turbidity,
      caustics: b.caustics,
      darkMaskMul: b.darkMaskMul,
    };
  }

  const blendDist = 320;
  const regions = layout.biomes;
  const raw = {
    sunken_city: 0,
    trench_shelf: 0,
    narrow_cave: 0,
    hydrothermal: 0,
    confluence_hall: 0,
  };

  // 各深層バイオーム領域の SDF から滑らかな所属度 (0..1) を算出
  for (const id of ['trench_shelf', 'narrow_cave', 'hydrothermal', 'confluence_hall']) {
    const r = regions[id];
    if (!r) continue;
    const d = rectSdf(wx, wy, r);
    raw[id] = 1 - smoothstep(-blendDist * 0.45, blendDist * 0.55, d);
  }

  // 沈没都市外縁は浅場（y < wallTop + 260）および海溝外側のベース
  const deepSum = raw.trench_shelf + raw.narrow_cave + raw.hydrothermal + raw.confluence_hall;
  raw.sunken_city = clamp(1 - deepSum, 0, 1);

  // 総和正規化（ゼロ除算防止）
  let total = 0;
  for (const id of BIOME_IDS) total += raw[id];
  if (total <= 1e-6) {
    raw.sunken_city = 1;
    total = 1;
  }

  const weights = {};
  let primaryId = 'sunken_city';
  let bestW = -1;
  for (const id of BIOME_IDS) {
    const w = raw[id] / total;
    weights[id] = w;
    if (w > bestW) {
      bestW = w;
      primaryId = id;
    }
  }

  // 環境パラメータを加重平均で滑らかに補間
  const fogColor = [0, 0, 0];
  const shallowAmb = [0, 0, 0];
  const deepAmb = [0, 0, 0];
  const scatterTint = [0, 0, 0];
  let ambientBoost = 0;
  let turbidity = 0;
  let caustics = 0;
  let darkMaskMul = 0;

  for (const id of BIOME_IDS) {
    const w = weights[id];
    if (w <= 0) continue;
    const b = BIOMES[id];
    for (let c = 0; c < 3; c++) {
      fogColor[c] += b.fogColor[c] * w;
      shallowAmb[c] += b.shallowAmb[c] * w;
      deepAmb[c] += b.deepAmb[c] * w;
      scatterTint[c] += b.scatterTint[c] * w;
    }
    ambientBoost += b.ambientBoost * w;
    turbidity += b.turbidity * w;
    caustics += b.caustics * w;
    darkMaskMul += b.darkMaskMul * w;
  }

  return {
    primaryId,
    label: BIOMES[primaryId].label,
    weights,
    fogColor,
    shallowAmb,
    deepAmb,
    scatterTint,
    ambientBoost,
    turbidity,
    caustics,
    darkMaskMul,
  };
}

/**
 * 座標 (x, y) の表示用海域ラベルを返す（HUD・透過マップ共用）。
 * 浅場は従来の深度帯ラベルを維持し、海溝・深棚以下はバイオーム名を返す。
 */
export function zoneNameAt(x, y, layout) {
  const wy = Number.isFinite(y) ? y : 0;
  if (layout && layout.biomes && wy >= layout.wallTop - 40) {
    const bio = sampleBiomeAt(x, wy, layout);
    if (bio.primaryId !== 'sunken_city') return bio.label;
  }
  if (wy < 300) return '表層';
  if (wy < 900) return '中深層';
  if (wy < 1700) return '漸深層';
  if (wy < 2300) return '深海層';
  return '超深海';
}
