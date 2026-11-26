/**
 * ABYSS DIVE — 透過マップ（縦断面）と「発見済み地点」記録の純粋ルール。
 *
 * DOM 非依存・描画なし・乱数なし。描画と入力は dive-map.js が持つ。
 * ここは「何を地図に載せてよいか」と「見え方（中心・拡大率・投影）」の計算だけ。
 *
 * 設計の約束（未公開・v2.0.1 の隔離試作）:
 *   - 地図に出すのは **実在する地形**（海溝 solids・海底・岩）と、
 *     **実際に見つけた拠点・遺跡** だけ。隠れた敵・未実装の都市は載せない。
 *   - 深部（海溝・深棚）は **発見するまで伏せる**（未探索層の詳細・ネタバレを出さない）。
 *   - 発見記録は **専用キー**（資源・スコア・既存の探索記録とは別系統）で、
 *     載せてよい id を SITE_IDS に固定する＝記録は **有界**（増え続けない）。
 *   - 旧セーブ互換: キーが無い/壊れている場合は **空** から始める（既存セーブを壊さない）。
 */

import { FLOOR_Y, TRENCH } from './trench-rules.js';

/** 発見済み地点の専用セーブキー（資源・スコア・既存の探索記録とは別系統）。 */
export const MAP_KEY = 'game_studio_abyss_map_discovered';

/** マップに載せる拠点・遺跡・発見済み海域。ここに固定する（この外は保存もしない＝有界）。 */
export const SITE_IDS = Object.freeze([
  'ruin-entrance',
  'outpost-1',
  'deepshelf',
  'cave-route',
  'volcanic-vent',
  'confluence-hall',
  'mantle-upper',
  'stingray-hull',
  'mark1-weld',
]);

export const SITE_NAMES = Object.freeze({
  'ruin-entrance': '沈没都市 遺跡エアロック',
  'outpost-1': '前哨基地',
  'deepshelf': '第二前哨基地 深棚',
  'cave-route': '狭洞窟 ルート',
  'volcanic-vent': '熱水・火山帯',
  'confluence-hall': '合流広間（海草林）',
  'mantle-upper': 'マントル上層・発光深淵',
  'stingray-hull': 'スティングレー号 パージ外装',
  'mark1-weld': 'Mark I 仮設ドック溶接痕',
});

/** 世界下端（目盛り px）。海底 FLOOR_Y より下は海溝〜深棚下2分岐〜合流広間。 */
export const WORLD_BOTTOM = FLOOR_Y + TRENCH.DEEP_DEPTH;   // 2600 + 4300 = 6900

/** 深部を地図に出す条件を満たす地点 id（発見済みの印）。 */
export const DEEP_SITE = 'deepshelf';

export const MAP = Object.freeze({
  SCALE_MIN: 0.042,      // 一番引いたとき（合流広間まで世界を広く見る）
  SCALE_MAX: 0.60,       // 一番寄ったとき
  SCALE_DEFAULT: 0.105,  // 初期（海溝・深棚周辺の地形を把握しやすい）
  SCALE_STEP: 1.5,       // ＋/− 1 回の倍率
  DISCOVER_RANGE: 720,   // この距離以内で「発見」に記録する（px）
  GRID_STEP_PX: 520,     // 深度目盛りの間隔（px。= 約 200 m）
  HIT_PAD: 18,           // ボタン当たりの余白（論理 px）
});

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/* -------------------------------------------------------------------------- *
 * 発見済み地点の記録（有界・旧セーブ互換）
 * -------------------------------------------------------------------------- */

/**
 * 発見済み id の集合を保存する。載せてよい id は SITE_IDS に固定。
 * io.load() は保存値（{v,ids} か配列か null）を返す。io.save(obj) で保存。
 */
export function createDiscoveredStore(io){
  const load = (io && io.load) || (() => null);
  const save = (io && io.save) || (() => {});
  let ids = new Set();
  try {
    const raw = load();
    const arr = raw && Array.isArray(raw.ids) ? raw.ids : (Array.isArray(raw) ? raw : []);
    for (const id of arr) if (SITE_IDS.indexOf(id) >= 0) ids.add(id);   // 未知 id は捨てる＝有界
  } catch (e) { ids = new Set(); }

  function persist(){
    try { save({ v: 1, ids: SITE_IDS.filter(id => ids.has(id)) }); } catch (e) { /* 保存失敗は無視 */ }
  }
  function has(id){ return ids.has(id); }
  /** 既知 id だけ・重複なしで記録する。新しく記録したら true。 */
  function add(id){
    if (SITE_IDS.indexOf(id) < 0) return false;
    if (ids.has(id)) return false;
    ids.add(id); persist(); return true;
  }
  function list(){ return SITE_IDS.filter(id => ids.has(id)); }
  function reset(){ ids = new Set(); persist(); }
  return { has, add, list, reset, count: () => ids.size, SITE_IDS };
}

/**
 * プレイヤー位置から、範囲内にある候補地点の id を返す（純粋）。
 * sites = [{ id, x, y, range? }]。まだ保存はしない（判定だけ）。
 */
export function sitesWithin(px, py, sites, range){
  const out = [];
  const def = Number.isFinite(range) ? range : MAP.DISCOVER_RANGE;
  for (const s of sites || []){
    if (!s || !Number.isFinite(s.x) || !Number.isFinite(s.y)) continue;
    if (SITE_IDS.indexOf(s.id) < 0) continue;
    if (Math.hypot(px - s.x, py - s.y) <= (Number.isFinite(s.range) ? s.range : def)) out.push(s.id);
  }
  return out;
}

/** 深部（海溝・深棚）を地図に出してよいか。発見済みのときだけ。 */
export function deepVisible(discovered){
  if (!discovered) return false;
  if (typeof discovered.has === 'function') return discovered.has(DEEP_SITE);
  if (Array.isArray(discovered)) return discovered.indexOf(DEEP_SITE) >= 0;
  return false;
}

/* -------------------------------------------------------------------------- *
 * マップの見え方（中心・拡大率・投影）
 * -------------------------------------------------------------------------- */

export function clampMapScale(s){
  const v = Number(s);
  return clamp(Number.isFinite(v) ? v : MAP.SCALE_DEFAULT, MAP.SCALE_MIN, MAP.SCALE_MAX);
}

/** ＋(dir>0) で寄る（拡大＝世界を大きく見る）、−で引く。 */
export function stepMapScale(s, dir){
  const base = clampMapScale(s);
  const n = dir > 0 ? base * MAP.SCALE_STEP : base / MAP.SCALE_STEP;
  return clampMapScale(n);
}

/** 世界座標 → パネル内座標。view = { cx, cy, scale, pw, ph }。 */
export function mapProject(wx, wy, view){
  return { x: (wx - view.cx) * view.scale + view.pw / 2, y: (wy - view.cy) * view.scale + view.ph / 2 };
}

/** パネル内座標 → 世界座標（mapProject の逆）。 */
export function mapUnproject(sx, sy, view){
  return { x: (sx - view.pw / 2) / view.scale + view.cx, y: (sy - view.ph / 2) / view.scale + view.cy };
}

/**
 * パネル内で世界の見える範囲（世界座標）を返す。
 * カリング（地形・岩をどこまで描くか）と、パンの制限に使う。
 */
export function mapViewRect(view){
  const hw = view.pw / (2 * view.scale), hh = view.ph / (2 * view.scale);
  return { x0: view.cx - hw, x1: view.cx + hw, y0: view.cy - hh, y1: view.cy + hh };
}

/**
 * パンの中心を世界の範囲内へ制限する。範囲が狭いときは中央へ寄せる。
 * bounds = { xMin, xMax, yMin, yMax }（世界座標）。
 */
export function clampMapCenter(cx, cy, scale, pw, ph, bounds){
  const s = clampMapScale(scale);
  const halfW = pw / (2 * s), halfH = ph / (2 * s);
  let x, y;
  if (bounds.xMax - bounds.xMin <= 2 * halfW) x = (bounds.xMin + bounds.xMax) / 2;
  else x = clamp(cx, bounds.xMin + halfW, bounds.xMax - halfW);
  if (bounds.yMax - bounds.yMin <= 2 * halfH) y = (bounds.yMin + bounds.yMax) / 2;
  else y = clamp(cy, bounds.yMin + halfH, bounds.yMax - halfH);
  return { cx: x, cy: y };
}

/** 現在地へ戻す中心（制限つき）。 */
export function recenterTo(px, py, scale, pw, ph, bounds){
  return clampMapCenter(px, py, scale, pw, ph, bounds);
}

/** ドラッグ量（パネル内 px）を世界の移動量へ直す（中心は逆方向へ動く）。 */
export function panByDrag(cx, cy, dxPanel, dyPanel, scale){
  return { cx: cx - dxPanel / scale, cy: cy - dyPanel / scale };
}

/* -------------------------------------------------------------------------- *
 * 表示用ラベル（地図内の凡例・目盛り）
 * -------------------------------------------------------------------------- */

/** 深度目盛り（px y → 表示）。ゲーム HUD と同じ換算（y/2.6 m）に合わせる。 */
export function depthLabel(y){
  const m = Math.round((Number(y) || 0) / 2.6);
  return m + ' m';
}

/** 海面〜海溝底までの目盛り線の y を返す（グラフの横罫）。末尾が直前と近すぎる場合は重ねない。 */
export function depthMarks(bottom){
  const bot = Number.isFinite(bottom) ? bottom : WORLD_BOTTOM;
  const out = [];
  for (let y = 0; y <= bot; y += MAP.GRID_STEP_PX) out.push(y);
  if (out.length === 0 || (bot - out[out.length - 1]) >= MAP.GRID_STEP_PX * 0.45) out.push(bot);
  return out;
}

/** 地点の id から表示名（未知は id）。 */
export function siteName(id){ return SITE_NAMES[id] || id; }
