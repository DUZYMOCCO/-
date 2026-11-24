/**
 * Depth Stacking — 統一ワールド座標・連続奥行き投影・5〜30層構成・5ライティンググループ補間
 * 純粋関数モジュール（DOM / WebGL 非依存、node --test で直接検証可能）
 */

export const CAMERA_DIST = 2.6;
export const LOGICAL_W = 1748;
export const LOGICAL_H = 804;

export const RESOLUTION_PRESETS = Object.freeze([
  { id: 'low',  label: '874×402 (Low / 0.5x)',   w: 874,  h: 402 },
  { id: 'std',  label: '1748×804 (Std / 1.0x)',  w: 1748, h: 804 },
  { id: 'high', label: '2622×1206 (High / 1.5x)', w: 2622, h: 1206 },
]);

export const LIGHT_RES_PRESETS = Object.freeze([
  { id: 'quarter', label: '437×201 (Quarter)', w: 437,  h: 201 },
  { id: 'half',    label: '874×402 (Half / Std)', w: 874, h: 402 },
  { id: 'full',    label: '1311×603 (High)',   w: 1311, h: 603 },
]);

/**
 * 5 ライティンググループ（描画レイヤー数 5〜30 から独立して管理）
 * z 降順（最遠景 → 最前景）に並べる
 */
export const LIGHT_GROUPS = Object.freeze([
  { id: 0, name: 'Far Abyss',  z: 7.5  },
  { id: 1, name: 'Distant',    z: 3.0  },
  { id: 2, name: 'Midground',  z: 1.1  },
  { id: 3, name: 'Play Plane', z: 0.0  },
  { id: 4, name: 'Foreground', z: -0.35 },
]);

export function clamp(v, min, max) {
  return v < min ? min : (v > max ? max : v);
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function smoothstep(edge0, edge1, x) {
  if (edge0 === edge1) return x < edge0 ? 0 : 1;
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * 奥行き z に対する透視視差・スケール係数 p(z)
 * z = 0（操作層）で常に 1.0、z > 0 で < 1（遠景）、z < 0 で > 1（前景）
 */
export function parallaxFactor(z, parallaxStrength = 1.0, cameraDist = CAMERA_DIST) {
  const denom = Math.max(0.28, cameraDist + z * parallaxStrength);
  return cameraDist / denom;
}

/**
 * 統一ワールド座標 (wx, wy, wz) → ビュー論理座標 (sx, sy, scale)
 * カメラ移動・ズーム変更時も全深度・光源・遮蔽体で光学中心が完全一致する
 */
export function projectWorldToView(wx, wy, wz, cam, viewW = LOGICAL_W, viewH = LOGICAL_H, opts = {}) {
  const pStrength = opts.parallaxStrength ?? 1.0;
  const depthScaleStrength = opts.depthScaleStrength ?? 1.0;
  const p = parallaxFactor(wz, pStrength, opts.cameraDist ?? CAMERA_DIST);
  const px = opts.parallaxX ?? p;
  const py = opts.parallaxY ?? p;
  const zoom = Math.max(0.25, cam.zoom ?? 1.0);
  const depthScale = lerp(1.0, p, depthScaleStrength);
  const sx = (wx - cam.x) * px * zoom + viewW * 0.5;
  const sy = (wy - cam.y) * py * zoom + viewH * 0.5;
  const scale = depthScale * zoom;
  return { sx, sy, scale, p };
}

/**
 * ビュー論理座標 (sx, sy) と奥行き wz からワールド座標 (wx, wy) へ逆投影
 */
export function viewToWorldAtZ(sx, sy, wz, cam, viewW = LOGICAL_W, viewH = LOGICAL_H, opts = {}) {
  const pStrength = opts.parallaxStrength ?? 1.0;
  const p = parallaxFactor(wz, pStrength, opts.cameraDist ?? CAMERA_DIST);
  const zoom = Math.max(0.25, cam.zoom ?? 1.0);
  const inv = 1.0 / (p * zoom);
  return {
    wx: (sx - viewW * 0.5) * inv + cam.x,
    wy: (sy - viewH * 0.5) * inv + cam.y,
    wz,
    p,
  };
}

/**
 * 任意の連続深度 z を挟む隣接 2 ライティンググループ (g0, g1) と連続補間係数 weight を返す
 * これにより描画レイヤー数によらずグループ境界で明暗の段差が発生しない
 */
export function computeLightingGroupBlend(z, groups = LIGHT_GROUPS) {
  const n = groups.length;
  if (n === 0) return { g0: 0, g1: 0, weight: 0 };
  if (z >= groups[0].z) return { g0: 0, g1: 0, weight: 0 };
  if (z <= groups[n - 1].z) return { g0: n - 1, g1: n - 1, weight: 0 };

  for (let i = 0; i < n - 1; i++) {
    const zHigh = groups[i].z;
    const zLow = groups[i + 1].z;
    if (z <= zHigh && z >= zLow) {
      const weight = smoothstep(zHigh, zLow, z);
      return { g0: i, g1: i + 1, weight };
    }
  }
  return { g0: n - 1, g1: n - 1, weight: 0 };
}

/**
 * 標準 15 層のベース定義（最遠景1 / 遠景3 / 中景3 / 近景3 / 操作層1 / 前景3 / 最前景1）
 * 要件 3.1・3.2 の全描画属性を保持
 */
const BASE_15_LAYERS = Object.freeze([
  // 最遠景 (1)
  { key: 'abyss_0',   category: '最遠景', z: 9.2,   scaleMul: 1.0,  opacity: 1.0,  brightness: 0.92, saturation: 0.85, turbidity: 0.58, blur: 0.35, swayStrength: 0.0,  emissiveBoost: 0.65, animSpeed: 0.35, lightInfluence: 0.42, resScale: 0.65, priority: 1 },
  // 遠景 (3)
  { key: 'far_0',     category: '遠景',   z: 6.2,   scaleMul: 1.0,  opacity: 0.92, brightness: 0.84, saturation: 0.72, turbidity: 0.68, blur: 0.25, swayStrength: 0.05, emissiveBoost: 0.75, animSpeed: 0.50, lightInfluence: 0.55, resScale: 0.70, priority: 2 },
  { key: 'far_1',     category: '遠景',   z: 4.4,   scaleMul: 1.0,  opacity: 0.96, brightness: 0.88, saturation: 0.78, turbidity: 0.56, blur: 0.16, swayStrength: 0.08, emissiveBoost: 0.85, animSpeed: 0.65, lightInfluence: 0.68, resScale: 0.78, priority: 1 },
  { key: 'far_2',     category: '遠景',   z: 3.1,   scaleMul: 1.0,  opacity: 0.98, brightness: 0.92, saturation: 0.84, turbidity: 0.44, blur: 0.08, swayStrength: 0.12, emissiveBoost: 0.92, animSpeed: 0.75, lightInfluence: 0.78, resScale: 0.84, priority: 3 },
  // 中景 (3)
  { key: 'mid_0',     category: '中景',   z: 2.2,   scaleMul: 1.0,  opacity: 1.0,  brightness: 0.96, saturation: 0.90, turbidity: 0.34, blur: 0.03, swayStrength: 0.18, emissiveBoost: 1.00, animSpeed: 0.85, lightInfluence: 0.88, resScale: 0.90, priority: 2 },
  { key: 'mid_1',     category: '中景',   z: 1.5,   scaleMul: 1.0,  opacity: 1.0,  brightness: 0.98, saturation: 0.94, turbidity: 0.25, blur: 0.0,  swayStrength: 0.28, emissiveBoost: 1.05, animSpeed: 0.92, lightInfluence: 0.96, resScale: 0.95, priority: 1 },
  { key: 'mid_2',     category: '中景',   z: 0.95,  scaleMul: 1.0,  opacity: 1.0,  brightness: 1.0,  saturation: 0.98, turbidity: 0.18, blur: 0.0,  swayStrength: 0.40, emissiveBoost: 1.10, animSpeed: 1.00, lightInfluence: 1.02, resScale: 1.00, priority: 2 },
  // 近景 (3)
  { key: 'near_0',    category: '近景',   z: 0.62,  scaleMul: 1.0,  opacity: 1.0,  brightness: 1.02, saturation: 1.02, turbidity: 0.12, blur: 0.0,  swayStrength: 0.58, emissiveBoost: 1.12, animSpeed: 1.05, lightInfluence: 1.08, resScale: 1.00, priority: 3 },
  { key: 'near_1',    category: '近景',   z: 0.36,  scaleMul: 1.0,  opacity: 1.0,  brightness: 1.04, saturation: 1.04, turbidity: 0.07, blur: 0.0,  swayStrength: 0.78, emissiveBoost: 1.15, animSpeed: 1.08, lightInfluence: 1.12, resScale: 1.00, priority: 1 },
  { key: 'near_2',    category: '近景',   z: 0.16,  scaleMul: 1.0,  opacity: 1.0,  brightness: 1.04, saturation: 1.05, turbidity: 0.03, blur: 0.0,  swayStrength: 0.95, emissiveBoost: 1.18, animSpeed: 1.12, lightInfluence: 1.15, resScale: 1.00, priority: 2 },
  // 操作層 (1)
  { key: 'play_0',    category: '操作層', z: 0.0,   scaleMul: 1.0,  opacity: 1.0,  brightness: 1.05, saturation: 1.05, turbidity: 0.0,  blur: 0.0,  swayStrength: 0.15, emissiveBoost: 1.25, animSpeed: 1.00, lightInfluence: 1.20, resScale: 1.00, priority: 1 },
  // 前景 (3)
  { key: 'fg_0',      category: '前景',   z: -0.14, scaleMul: 1.0,  opacity: 0.96, brightness: 0.82, saturation: 0.92, turbidity: 0.04, blur: 0.10, swayStrength: 1.05, emissiveBoost: 1.05, animSpeed: 1.15, lightInfluence: 0.95, resScale: 1.00, priority: 2 },
  { key: 'fg_1',      category: '前景',   z: -0.26, scaleMul: 1.0,  opacity: 0.92, brightness: 0.74, saturation: 0.88, turbidity: 0.07, blur: 0.24, swayStrength: 1.18, emissiveBoost: 0.95, animSpeed: 1.20, lightInfluence: 0.88, resScale: 0.95, priority: 1 },
  { key: 'fg_2',      category: '前景',   z: -0.38, scaleMul: 1.0,  opacity: 0.86, brightness: 0.66, saturation: 0.82, turbidity: 0.10, blur: 0.42, swayStrength: 1.30, emissiveBoost: 0.85, animSpeed: 1.28, lightInfluence: 0.76, resScale: 0.88, priority: 3 },
  // 最前景 (1)
  { key: 'front_0',   category: '最前景', z: -0.48, scaleMul: 1.0,  opacity: 0.78, brightness: 0.62, saturation: 0.78, turbidity: 0.14, blur: 0.68, swayStrength: 1.45, emissiveBoost: 0.80, animSpeed: 1.35, lightInfluence: 0.68, resScale: 0.75, priority: 2 },
]);

/**
 * 5〜30 層の任意レイヤー構成を生成（常に奥→手前 z 降順、操作層 z=0 を必ず含む）
 */
export function buildLayerDefinitions(requestedCount = 15) {
  const count = clamp(Math.round(requestedCount), 5, 30);

  if (count === 15) {
    return BASE_15_LAYERS.map((l, idx) => ({
      ...l,
      index: idx,
      tint: depthTint(l.z),
      lightBlend: computeLightingGroupBlend(l.z),
    }));
  }

  if (count < 15) {
    // 優先度順に必須層（priority=1: 6層, priority=2: 6層, priority=3: 3層）を残し、5層のときは操作層＋主要4層を選択
    const mustKeys = new Set(['abyss_0', 'far_1', 'mid_1', 'play_0', 'fg_1']);
    const ranked = [...BASE_15_LAYERS].sort((a, b) => {
      const am = mustKeys.has(a.key) ? 0 : 1;
      const bm = mustKeys.has(b.key) ? 0 : 1;
      if (am !== bm) return am - bm;
      if (a.priority !== b.priority) return a.priority - b.priority;
      return Math.abs(a.z) - Math.abs(b.z);
    });
    const chosen = ranked.slice(0, count).sort((a, b) => b.z - a.z);
    return chosen.map((l, idx) => ({
      ...l,
      index: idx,
      tint: depthTint(l.z),
      lightBlend: computeLightingGroupBlend(l.z),
    }));
  }

  // count > 15: ベース15層に中間深度の補間サブレイヤーを滑らかに追加（最大30層）
  const extraCount = count - 15;
  const result = BASE_15_LAYERS.map(l => ({ ...l, isExtra: false }));
  // 挿入候補の区間（最遠景〜最前景の連続性を高める順）
  const spans = [
    [1, 2], [2, 3], [3, 4], [4, 5], [5, 6],
    [6, 7], [7, 8], [8, 9], [11, 12], [12, 13],
    [0, 1], [13, 14], [4, 6], [2, 4], [7, 9],
  ];
  for (let e = 0; e < extraCount; e++) {
    const [ia, ib] = spans[e % spans.length];
    const a = BASE_15_LAYERS[ia];
    const b = BASE_15_LAYERS[ib];
    const t = e >= spans.length ? 0.35 : 0.5;
    const z = lerp(a.z, b.z, t);
    result.push({
      key: `sub_${e}_${a.key}`,
      category: b.category,
      z,
      scaleMul: 1.0,
      opacity: lerp(a.opacity, b.opacity, t),
      brightness: lerp(a.brightness, b.brightness, t),
      saturation: lerp(a.saturation, b.saturation, t),
      turbidity: lerp(a.turbidity, b.turbidity, t),
      blur: lerp(a.blur, b.blur, t),
      swayStrength: lerp(a.swayStrength, b.swayStrength, t),
      emissiveBoost: lerp(a.emissiveBoost, b.emissiveBoost, t),
      animSpeed: lerp(a.animSpeed, b.animSpeed, t),
      lightInfluence: lerp(a.lightInfluence, b.lightInfluence, t),
      resScale: lerp(a.resScale, b.resScale, t),
      priority: 4,
      isExtra: true,
    });
  }
  result.sort((a, b) => b.z - a.z);
  return result.map((l, idx) => ({
    ...l,
    index: idx,
    tint: depthTint(l.z),
    lightBlend: computeLightingGroupBlend(l.z),
  }));
}

/**
 * 深海の水柱による色調（赤が最速で減衰し、青緑〜深藍へシフト）
 */
export function depthTint(z) {
  if (z >= 0) {
    const d = clamp(z / 9.5, 0, 1);
    return [
      lerp(1.0, 0.54, d),
      lerp(1.0, 0.86, d),
      lerp(1.0, 1.06, d),
    ];
  }
  // 前景は深海影の重みを持たせる
  const f = clamp(-z / 0.55, 0, 1);
  return [
    lerp(1.0, 0.72, f),
    lerp(1.0, 0.88, f),
    lerp(1.0, 0.96, f),
  ];
}

/**
 * フレームレート非依存の時間更新（dt クランプ付き・カメラ非依存）
 */
export function stepContinuousTime(currentWorldTime, rawDt, timeScale = 1.0) {
  const dt = clamp(Number.isFinite(rawDt) ? rawDt : 0, 0, 0.05);
  return {
    dt,
    worldTime: currentWorldTime + dt * timeScale,
  };
}

/**
 * バウンディングボックスが画面内にあるか判定（オーバードロー削減用フラスタムカリング）
 */
export function isRectVisible(cx, cy, halfW, halfH, viewW = LOGICAL_W, viewH = LOGICAL_H, margin = 64) {
  return !(
    cx + halfW < -margin ||
    cx - halfW > viewW + margin ||
    cy + halfH < -margin ||
    cy - halfH > viewH + margin
  );
}
