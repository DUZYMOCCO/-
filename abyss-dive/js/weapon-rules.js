/**
 * ABYSS DIVE — 武器（魚雷・ミサイル）の個体の純粋ルール（DOM 非依存 / テスト可能）
 *
 * v1.15.0: 潜水艇の武器にローグライトな「個体」を持たせる。
 *   - 初期品（標準装備）は固定で現行同等（倍率 1）。劣っても強制装備しない（装備は明示のみ）。
 *   - 敵の確率ドロップは資源/補給とは別の「回収品」。拾うと倉庫に入る。
 *   - 基地で種類を選んで既存資源を使いランダム製造する。品質（粗悪〜特上）と、同じ品質でも配分が違う個体値。
 *   - 倉庫は上限つき。満杯は消費なしで拒否（安全）。個体は ID・数値・発射数・方向・外観を保存し、再読み込みで再抽選しない。
 *   - 実性能は「既存の改造・艇差」に個体の倍率を重ねる（買い直させない）。
 *
 * v1.15.0+（未公開・同一版内）: 同時発射数と射出方向を個体の要素に加える（弾速ロールは維持）。
 *   - count（発射数。魚雷 1〜3 / ミサイル 1〜2）と pattern（単発/並列/扇状）を離散でロール・保存する。
 *     横スクロールなので照準軸を基準に上下対称、背後へは撃たない。
 *   - 多連で無条件の上位にしない: 1発あたり威力を count で割り引いて総火力を線形未満に留め（SALVO_PER_SHELL）、
 *     発熱は斉射ぶん（base × count）で熱効率を悪化させ、ミサイルは斉射ぶんの残数を消費する（残数超過・空撃ち・無料複製なし）。
 *   - 強化では count/pattern/style を再抽選しない。旧保存・初期品は単発（count 1）。
 *   - style（外観・音色の演出プロファイル。標準を含む）は気分のみで、威力・弾速・誘導・衝突・爆風に一切影響しない。
 *
 * ここは数値・状態機械だけ。試作のための乱数は注入する（rng）。描画（base.js / game.js）は呼び出し側。
 */

export const WEAPON_KEY = 'abyss_arsenal';     // localStorage: game_studio_abyss_arsenal（独自キー）
export const ARSENAL_CAP = 10;                 // 倉庫の上限（満杯は安全に拒否）

/* 現行の武器ベース値（game.js の実数と一致）。個体の倍率はこの値に掛ける。 */
export const TORPEDO_BASE = Object.freeze({ speed: 900, fireCd: 0.075, heat: 0.058 });
export const MISSILE_BASE = Object.freeze({ launchSpeed: 300, cruiseSpeed: 330, accel: 520, turn: 4.2 });

/**
 * 品質の段。label は表示、mul は個体値の中心（高いほど良い）、spread は配分の振れ幅、weight は出現の重み。
 * 出現は粗悪・並が多めで、良品・特上は稀。
 */
export const QUALITIES = Object.freeze([
  Object.freeze({ id:'poor',   label:'粗悪', mul:0.86, spread:0.18, weight:0.30, color:'#c9a978' }),
  Object.freeze({ id:'common', label:'並',   mul:1.00, spread:0.13, weight:0.42, color:'#d8e6ef' }),
  Object.freeze({ id:'fine',   label:'良品', mul:1.15, spread:0.11, weight:0.20, color:'#9fe8ff' }),
  Object.freeze({ id:'prime',  label:'特上', mul:1.30, spread:0.08, weight:0.08, color:'#ffd98a' }),
]);
export const QUALITY_BY_ID = Object.freeze(Object.fromEntries(QUALITIES.map(q => [q.id, q])));

/**
 * 発射方向のパターン（離散・強化で再抽選しない・保存する）。
 *   横スクロールなので照準軸を基準に上下対称。背後（照準軸から 90° 以上）へは撃たない。
 *   single   … 1発（従来）。count が 1 のとき。
 *   parallel … 照準軸に平行のまま、発射位置を横へ振り分ける（並列）。
 *   fan      … 発射位置は同じで、角度を上下へ扇状に開く。
 */
export const PATTERNS = Object.freeze({
  single:   Object.freeze({ id:'single',   label:'単発' }),
  parallel: Object.freeze({ id:'parallel', label:'並列' }),
  fan:      Object.freeze({ id:'fan',      label:'扇状' }),
});
export const PATTERN_BY_ID = Object.freeze(Object.fromEntries(Object.values(PATTERNS).map(p => [p.id, p])));

/**
 * 弾体の外観・音色の小さな演出プロファイル（気分のみ。性能には一切影響しない）。
 * 標準（stock）は現行の見た目・音。強化や再読込で変わらない（個体に保存）。
 */
export const STYLES = Object.freeze({
  stock:   Object.freeze({ id:'stock',   label:'標準' }),
  slender: Object.freeze({ id:'slender', label:'細身' }),
  stout:   Object.freeze({ id:'stout',   label:'ずんぐり' }),
  finned:  Object.freeze({ id:'finned',  label:'尾翼' }),
});
export const STYLE_BY_ID = Object.freeze(Object.fromEntries(Object.values(STYLES).map(s => [s.id, s])));

/**
 * 武器の種類。stats は個体値の項目。better:'high' は高いほど良く、'low' は低いほど良い（発射間隔・発熱）。
 * lo/hi は倍率の上下限。real/dp は表示の実値（倍率 × real を dp 桁で見せる。威力は改造で基準が動くので倍率表示）。
 * shots は発射数の許容（max）と出現の重み（1〜max、単発が基準で多連は稀）。styles は外観・音色の候補（重み付き）。
 */
export const WEAPON_TYPES = Object.freeze({
  torpedo: Object.freeze({
    id:'torpedo', name:'魚雷', short:'魚雷',
    stats: Object.freeze([
      Object.freeze({ id:'power',    name:'威力', base:1, lo:0.70, hi:1.50, better:'high' }),
      Object.freeze({ id:'speed',    name:'弾速', base:1, lo:0.75, hi:1.35, better:'high', real:900,   dp:0 }),
      Object.freeze({ id:'interval', name:'間隔', base:1, lo:0.60, hi:1.45, better:'low',  real:0.075, dp:3 }),
      Object.freeze({ id:'heat',     name:'発熱', base:1, lo:0.60, hi:1.50, better:'low',  real:0.058, dp:3 }),
    ]),
    shots: Object.freeze({ max:3, weights:Object.freeze([0.54, 0.29, 0.17]) }),
    styles: Object.freeze([
      Object.freeze({ id:'stock',   weight:0.52 }),
      Object.freeze({ id:'slender', weight:0.26 }),
      Object.freeze({ id:'stout',   weight:0.22 }),
    ]),
    /* v1.16.0+: 形状/発射音/着弾音を独立に選べる。形状は既存（stock/slender/stout）に
       「流線（sleek。潜水艇 09 と馴染む新シルエット）」を追加（既存は置換・削除しない）。 */
    traits: Object.freeze({
      projectile:  Object.freeze([
        Object.freeze({ id:'stock',   weight:0.36 }),
        Object.freeze({ id:'slender', weight:0.18 }),
        Object.freeze({ id:'stout',   weight:0.16 }),
        Object.freeze({ id:'sleek',   weight:0.30 }),
      ]),
      launchSound: Object.freeze([
        Object.freeze({ id:'stock',   weight:0.52 }),
        Object.freeze({ id:'slender', weight:0.26 }),
        Object.freeze({ id:'stout',   weight:0.22 }),
      ]),
      impactSound: Object.freeze([
        Object.freeze({ id:'stock',   weight:0.52 }),
        Object.freeze({ id:'slender', weight:0.26 }),
        Object.freeze({ id:'stout',   weight:0.22 }),
      ]),
    }),
  }),
  missile: Object.freeze({
    id:'missile', name:'ミサイル', short:'ミサイル',
    stats: Object.freeze([
      Object.freeze({ id:'power', name:'威力', base:1, lo:0.70, hi:1.45, better:'high' }),
      Object.freeze({ id:'turn',  name:'誘導', base:1, lo:0.55, hi:1.60, better:'high', real:4.2, dp:1 }),
      Object.freeze({ id:'speed', name:'弾速', base:1, lo:0.80, hi:1.30, better:'high', real:330, dp:0 }),
    ]),
    shots: Object.freeze({ max:2, weights:Object.freeze([0.64, 0.36]) }),
    styles: Object.freeze([
      Object.freeze({ id:'stock',  weight:0.50 }),
      Object.freeze({ id:'finned', weight:0.30 }),
      Object.freeze({ id:'stout',  weight:0.20 }),
    ]),
    /* 形状は既存（stock/finned/stout）に「流線（sleek）」を追加。発射音/着弾音は既存のまま。 */
    traits: Object.freeze({
      projectile:  Object.freeze([
        Object.freeze({ id:'stock',  weight:0.34 }),
        Object.freeze({ id:'finned', weight:0.20 }),
        Object.freeze({ id:'stout',  weight:0.14 }),
        Object.freeze({ id:'sleek',  weight:0.32 }),
      ]),
      launchSound: Object.freeze([
        Object.freeze({ id:'stock',  weight:0.50 }),
        Object.freeze({ id:'finned', weight:0.30 }),
        Object.freeze({ id:'stout',  weight:0.20 }),
      ]),
      impactSound: Object.freeze([
        Object.freeze({ id:'stock',  weight:0.50 }),
        Object.freeze({ id:'finned', weight:0.30 }),
        Object.freeze({ id:'stout',  weight:0.20 }),
      ]),
    }),
  }),
});
export const TYPE_ORDER = Object.freeze(Object.keys(WEAPON_TYPES));

/* 斉射の幾何（照準軸基準・対称）。fan は角度を、parallel は発射位置の横間隔を振る。
   背後へは撃たない（半角は十分小さく、clamp でも 90° 未満に制限する）。 */
export const SALVO_GEOMETRY = Object.freeze({ parallelSpacing: 26, fanHalfAngle: 0.16 });
/* 斉射の 1 発あたり威力係数（多連で無条件の上位にしないため、総火力は線形未満に留める）。
   実効 1 斉射火力 = count × salvoPerShell(count)。 */
export const SALVO_PER_SHELL = Object.freeze({ 1:1.00, 2:0.80, 3:0.66 });
export function salvoPerShell(count){
  const c = Math.max(1, Math.min(3, Math.floor(Number(count) || 1)));
  return SALVO_PER_SHELL[c];
}
/** 斉射の各弾の「角度差 dAng」と「発射位置の横ズレ lat」を返す（対称・背後へ撃たない）。 */
export function salvoSpread(count, pattern){
  const n = Math.max(1, Math.floor(Number(count) || 1));
  const p = (n < 2) ? 'single' : (pattern === 'fan' ? 'fan' : 'parallel');
  const out = [];
  for (let i = 0; i < n; i++){
    const t = i - (n - 1) / 2;                    // 対称な -a..+a（n 奇数の中央は 0）
    if (n < 2 || p === 'single') out.push({ dAng:0, lat:0 });
    else if (p === 'fan') out.push({ dAng:Math.max(-0.49, Math.min(0.49, t * SALVO_GEOMETRY.fanHalfAngle)), lat:0 });
    else out.push({ dAng:0, lat:t * SALVO_GEOMETRY.parallelSpacing });
  }
  return out;
}

/** 製造の価格（資源）。 */
export const MANUFACTURE_COST = Object.freeze({ torpedo: 120, missile: 150 });
export function manufactureCost(typeId){ return MANUFACTURE_COST[typeId] || 0; }

/* --------------------------------------------------------------------------
 * 個体の「強化」（資源を払って段階的に伸ばす）。既存のランダムロール・品質ラベル・発射数・方向・ID は維持し、
 * 伸びは威力中心で予測可能（再抽選しない）。回収/製造した個体だけが対象。標準の固定初期品は保護。
 * ------------------------------------------------------------------------ */
export const ENHANCE_MAX = 3;                                 // 各個体 3 段
export const ENHANCE_COST = Object.freeze([150, 300, 600]);   // level→level+1 の費用（逓増）
export const ENHANCE_POWER_STEP = 0.12;                       // 威力は 1 段ごと +12%
export const ENHANCE_OTHER_STEP = 0.06;                       // 他項目は 1 段ごと +6%（low 系は有利側へ）

export function enhanceCost(level){
  const l = Math.floor(Number(level) || 0);
  if (l < 0 || l >= ENHANCE_MAX) return null;
  return ENHANCE_COST[l];
}

/** 強化段の倍率（power は PowerStep、他は OtherStep。low 系は有利＝小さくなる）。 */
export function enhanceMul(statId, level){
  const l = Math.max(0, Math.min(ENHANCE_MAX, Math.floor(Number(level) || 0)));
  const step = (statId === 'power') ? ENHANCE_POWER_STEP : ENHANCE_OTHER_STEP;
  return 1 + step * l;
}

/** 強化情報（表示・判定用）。初期品は保護（eligible:false）。 */
export function enhanceInfo(item){
  const l = Math.max(0, Math.min(ENHANCE_MAX, Math.floor(Number(item && item.enh) || 0)));
  const initial = !!(item && item.initial);
  const maxed = l >= ENHANCE_MAX;
  return {
    level: l, max: ENHANCE_MAX, maxed, initial,
    eligible: !initial,
    price: (initial || maxed) ? null : ENHANCE_COST[l],
  };
}

/**
 * 強化を反映した実効の個体値（威力中心）。weaponParams はこちらを使う。
 * low 系（発射間隔・発熱）は強化で小さくなる（＝有利）。
 */
export function effectiveItemStats(item){
  const def = typeDef(item && item.type);
  if (!def) return {};
  const l = Math.max(0, Math.min(ENHANCE_MAX, Math.floor(Number(item.enh) || 0)));
  const out = {};
  for (const st of def.stats){
    const base = (item.stats && typeof item.stats[st.id] === 'number') ? item.stats[st.id] : 1;
    const m = enhanceMul(st.id, l);
    out[st.id] = Math.round((st.better === 'low' ? base / m : base * m) * 10000) / 10000;
  }
  return out;
}

/* --------------------------------------------------------------------------
 * 初期品（標準装備）。倍率はすべて 1 ＝現行挙動と同一（単発・標準の外観）。
 * 常に装備候補として選べる。
 * ------------------------------------------------------------------------ */
const INITIAL_ITEMS = Object.freeze({
  torpedo: Object.freeze({ id:'initial:torpedo', type:'torpedo', quality:'standard', initial:true,
    stats: Object.freeze({ power:1, speed:1, interval:1, heat:1 }), count:1, pattern:'single', style:'stock' }),
  missile: Object.freeze({ id:'initial:missile', type:'missile', quality:'standard', initial:true,
    stats: Object.freeze({ power:1, turn:1, speed:1 }), count:1, pattern:'single', style:'stock' }),
});
export function initialItem(typeId){ return INITIAL_ITEMS[typeId] || null; }
export function isInitialId(id){ return typeof id === 'string' && id.indexOf('initial:') === 0; }

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const round3 = v => Math.round(v * 1000) / 1000;
const typeDef = t => WEAPON_TYPES[t] || null;

/** 品質ラベル（初期品は「標準装備」）。 */
export function qualityLabel(item){
  if (!item) return '';
  if (item.initial || item.quality === 'standard') return '標準装備';
  const q = QUALITY_BY_ID[item.quality];
  return q ? q.label : '並';
}
export function qualityColor(item){
  if (item && !item.initial && QUALITY_BY_ID[item.quality]) return QUALITY_BY_ID[item.quality].color;
  return '#d8e6ef';
}

/** 個体の短い表示（例: 魚雷・良品）。 */
export function itemShort(item){
  const def = item && typeDef(item.type);
  if (!def) return '—';
  return def.short + '・' + qualityLabel(item);
}

/* 発射数・方向・外観（離散。強化では再抽選しない）。 */
export function itemShotCount(item, typeId){
  const def = typeDef((item && item.type) || typeId);
  const max = (def && def.shots) ? def.shots.max : 1;
  const c = Math.floor(Number(item && item.count) || 1);
  return Math.max(1, Math.min(max, c));
}
export function itemPattern(item, typeId){
  if (itemShotCount(item, typeId) < 2) return 'single';
  return (item && item.pattern === 'fan') ? 'fan' : 'parallel';
}
export function itemStyle(item, typeId){
  const def = typeDef((item && item.type) || typeId);
  const id = item && item.style;
  if (def && def.styles && def.styles.some(s => s.id === id)) return id;
  return 'stock';
}
/** 形状・発射音・着弾音の値集合（型ごと・カテゴリ別）。traits が無ければ旧 style 集合を使う
 *  （advanced の TRAIT_COMPAT と一致する。形状のみ「流線=sleek」を追加できる）。 */
export function itemTraitValues(typeId, cat){
  const def = typeDef(typeId);
  const c = cat || 'projectile';
  if (def && def.traits && def.traits[c]) return def.traits[c].map(t => t.id);
  return def && def.styles ? def.styles.map(s => s.id) : ['stock'];
}
function traitWeights(def, cat){
  if (def && def.traits && def.traits[cat]) return def.traits[cat].map(t => t.weight);
  return def && def.styles ? def.styles.map(s => s.weight) : [1];
}
/* v1.16.0+: 形状・発射音・着弾音は独立に選べる（気分のみ。性能・当たり・爆風には影響しない）。
   未指定は旧 style へフォールバックする＝旧個体（style 1 つ）は三者が同じ値になる（互換）。 */
export function itemProjectile(item, typeId){
  const allowed = itemTraitValues((item && item.type) || typeId, 'projectile');
  const v = (item && item.projectile != null) ? item.projectile : (item && item.style);
  return allowed.indexOf(v) >= 0 ? v : 'stock';
}
export function itemLaunchSound(item, typeId){
  const allowed = itemTraitValues((item && item.type) || typeId, 'launchSound');
  const v = (item && item.launchSound != null) ? item.launchSound : (item && item.style);
  return allowed.indexOf(v) >= 0 ? v : 'stock';
}
export function itemImpactSound(item, typeId){
  const allowed = itemTraitValues((item && item.type) || typeId, 'impactSound');
  const v = (item && item.impactSound != null) ? item.impactSound : (item && item.style);
  return allowed.indexOf(v) >= 0 ? v : 'stock';
}
export function patternLabel(id){ const p = PATTERN_BY_ID[id]; return p ? p.label : '単発'; }
export function styleLabel(id){ const s = STYLE_BY_ID[id]; return s ? s.label : '標準'; }

/** 発射数の表示（単発 or 例 ×3 扇状）。 */
export function itemShots(item){
  const typeId = item && item.type;
  const n = itemShotCount(item, typeId);
  if (n < 2) return '単発';
  return '×' + n + ' ' + patternLabel(itemPattern(item, typeId));
}
/** 発射数の短い表示（単発は空、多連は 例 ×3扇）。 */
export function itemShotTag(item){
  const typeId = item && item.type;
  const n = itemShotCount(item, typeId);
  if (n < 2) return '';
  return '×' + n + (itemPattern(item, typeId) === 'fan' ? '扇' : '並');
}

/** 個体の短い表示（発射数・強化段つき。例: 魚雷・良品 ×3扇 強化+2）。 */
export function itemBadge(item){
  const s = itemShort(item);
  const tag = itemShotTag(item);
  const e = Math.max(0, Math.min(ENHANCE_MAX, Math.floor(Number(item && item.enh) || 0)));
  return s + (tag ? ' ' + tag : '') + (e > 0 ? ' 強化+' + e : '');
}

/** その項目の「出来」grade（高いほど良い）。low 系は逆数。 */
export function statGrade(stat, value){
  return stat.better === 'low' ? 1 / value : value;
}

/** 最も突出した項目（用途が読める）。 */
export function itemPrimary(item){
  const def = item && typeDef(item.type);
  if (!def) return null;
  let best = null;
  for (const st of def.stats){
    const v = item.stats && typeof item.stats[st.id] === 'number' ? item.stats[st.id] : 1;
    const g = statGrade(st, v);
    if (!best || g > best.grade) best = { id:st.id, name:st.name, value:v, grade:g };
  }
  if (!best) return null;
  const pct = Math.round((best.grade - 1) * 100);
  best.display = best.name + ' ×' + best.value.toFixed(2) + '（' + (pct >= 0 ? '+' : '') + pct + '%）';
  return best;
}

/** 1 つの項目の表示（例: 威力 ×1.12）。 */
export function statDisplay(stat, value){
  return stat.name + ' ×' + Number(value).toFixed(2);
}

/** 1 つの項目の実値表示（real がある項目のみ。例: 弾速 990）。無ければ null。 */
export function statReal(stat, value){
  if (!stat || typeof stat.real !== 'number') return null;
  const dp = (stat.dp == null) ? 2 : stat.dp;
  return (stat.real * Number(value)).toFixed(dp);
}

/* --------------------------------------------------------------------------
 * ロール（乱数注入）。pickQuality/pickCount/pickStyle は rng() を1回、各項目も rng() を1回使う。
 * ------------------------------------------------------------------------ */
function pickQuality(rng){
  const r = clamp(Number(rng()), 0, 0.9999999);
  let acc = 0;
  for (const q of QUALITIES){ acc += q.weight; if (r < acc) return q; }
  return QUALITIES[QUALITIES.length - 1];
}
function pickWeighted(rng, weights){
  const r = clamp(Number(rng()), 0, 0.9999999);
  let acc = 0;
  for (let i = 0; i < weights.length; i++){ acc += weights[i]; if (r < acc) return i; }
  return weights.length - 1;
}

/**
 * 個体を1つロールする。同じ品質でも、項目ごとの tilt（配分）で用途が分かれる。
 * 発射数・方向・外観もここで決まり、個体に保存される（強化では変わらない）。
 * @returns {{ type, quality, stats:{}, count:number, pattern:string, style:string, initial:false }}（ID は倉庫が付ける）
 */
export function rollItem(typeId, rng){
  const def = typeDef(typeId);
  if (!def) return null;
  const rand = (typeof rng === 'function') ? rng : Math.random;
  const q = pickQuality(rand);
  const stats = {};
  for (const st of def.stats){
    const tilt = (clamp(Number(rand()), 0, 1) * 2 - 1) * q.spread;   // -spread..+spread
    let m = (st.better === 'low') ? (1 / q.mul) * (1 + tilt) : q.mul * (1 + tilt);
    stats[st.id] = round3(clamp(m, st.lo, st.hi));
  }
  const shotsDef = def.shots || { max:1, weights:[1] };
  const count = pickWeighted(rand, shotsDef.weights) + 1;            // 1..max（単発が基準）
  const pattern = (count < 2) ? 'single' : (clamp(Number(rand()), 0, 0.9999999) < 0.5 ? 'parallel' : 'fan');
  const weights = def.styles.map(s => s.weight);
  const styleIdx = pickWeighted(rand, weights);
  const style = def.styles[styleIdx] ? def.styles[styleIdx].id : 'stock';
  /* 形状/発射音/着弾音は型互換の集合から独立にロールする（回収で別々の値を解放できる）。 */
  const projectile  = def.traits ? def.traits.projectile[pickWeighted(rand, traitWeights(def, 'projectile'))].id : style;
  const launchSound = def.traits ? def.traits.launchSound[pickWeighted(rand, traitWeights(def, 'launchSound'))].id : style;
  const impactSound = def.traits ? def.traits.impactSound[pickWeighted(rand, traitWeights(def, 'impactSound'))].id : style;
  return { type:typeId, quality:q.id, stats, initial:false, count, pattern, style, projectile, launchSound, impactSound };
}

function typeShotsMax(typeId){
  const def = typeDef(typeId);
  return (def && def.shots) ? def.shots.max : 1;
}

/**
 * 指定開発（armory 版・v1.16.0）: 選んだ count/pattern/形状/発射音/着弾音を固定し、品質・数値は乱数で維持して 1 個つくる。
 *   非互換の選択は null（＝呼び出し側は無消費で拒否する）。既存 rollItem と同じ流儀・同じ保存形（旧セーブ不変）。
 *   selection: { count?, pattern?, projectile?, launchSound?, impactSound? }
 *     projectile/launchSound/impactSound は独立（未指定はロールで埋まる）。
 *     style は shape と同じ値にする（旧 consumer・旧style互換）。
 */
export function designItem(typeId, selection, rng){
  const def = typeDef(typeId);
  if (!def) return null;
  const sel = selection || {};
  const rand = (typeof rng === 'function') ? rng : Math.random;
  const shotsDef = def.shots || { max:1, weights:[1] };
  const maxShots = shotsDef.max;
  let count;
  if (sel.count != null){
    const c = Math.floor(Number(sel.count));
    if (!(c >= 1 && c <= maxShots)) return null;
    count = c;
  } else count = pickWeighted(rand, shotsDef.weights) + 1;
  let pattern;
  if (count < 2) pattern = 'single';
  else if (sel.pattern != null){ if (sel.pattern !== 'parallel' && sel.pattern !== 'fan') return null; pattern = sel.pattern; }
  else pattern = (clamp(Number(rand()), 0, 0.9999999) < 0.5 ? 'parallel' : 'fan');
  const pickTrait = (cat, v) => (v != null) ? v : itemTraitValues(typeId, cat)[pickWeighted(rand, traitWeights(def, cat))];
  const projectile  = pickTrait('projectile', (sel.projectile != null) ? sel.projectile : (sel.style != null ? sel.style : null));
  const launchSound = pickTrait('launchSound', sel.launchSound);
  const impactSound = pickTrait('impactSound', sel.impactSound);
  if (itemTraitValues(typeId, 'projectile').indexOf(projectile) < 0
    || itemTraitValues(typeId, 'launchSound').indexOf(launchSound) < 0
    || itemTraitValues(typeId, 'impactSound').indexOf(impactSound) < 0) return null;  // 非互換
  const q = pickQuality(rand);
  const stats = {};
  for (const st of def.stats){
    const tilt = (clamp(Number(rand()), 0, 1) * 2 - 1) * q.spread;
    let m = (st.better === 'low') ? (1 / q.mul) * (1 + tilt) : q.mul * (1 + tilt);
    stats[st.id] = round3(clamp(m, st.lo, st.hi));
  }
  return { type:typeId, quality:q.id, stats, initial:false, count, pattern, style:projectile, projectile, launchSound, impactSound };
}

/** 個体から実パラメータを導く（初期品・未指定は現行値。発射数/方向/外観も含む）。 */
export function weaponParams(typeId, item){
  const s = (item && item.type) ? effectiveItemStats(item) : {};
  const g = id => (typeof s[id] === 'number' && s[id] > 0) ? s[id] : 1;
  const count = itemShotCount(item, typeId);
  const pattern = itemPattern(item, typeId);
  const style = itemStyle(item, typeId);
  const projectile = itemProjectile(item, typeId);       // v1.16.0+: 形状（未指定は style へフォールバック）
  const launchSound = itemLaunchSound(item, typeId);     // v1.16.0+: 発射音（独立・気分のみ）
  const impactSound = itemImpactSound(item, typeId);     // v1.16.0+: 着弾音（独立・気分のみ）
  const perShell = salvoPerShell(count);
  const salvoMul = count * perShell;                                 // 実効 1 斉射火力（倍率）
  if (typeId === 'torpedo'){
    return {
      dmgMul: g('power') * perShell,                                 // 1 発あたり威力（多連は総火力を線形未満に）
      speed: TORPEDO_BASE.speed * g('speed'),
      fireCd: TORPEDO_BASE.fireCd * g('interval'),
      heat: TORPEDO_BASE.heat * count,                               // 斉射ぶんの熱（多連は熱効率が悪化）
      count, pattern, style, projectile, launchSound, impactSound, salvoMul,
    };
  }
  return {
    dmgMul: g('power') * perShell,
    turn: MISSILE_BASE.turn * g('turn'),
    launchSpeed: MISSILE_BASE.launchSpeed * g('speed'),
    cruiseSpeed: MISSILE_BASE.cruiseSpeed * g('speed'),
    accel: MISSILE_BASE.accel * g('speed'),
    count, pattern, style, projectile, launchSound, impactSound, salvoMul,
  };
}

/* --------------------------------------------------------------------------
 * 個体の正規化（保存が壊れていても安全に読む）。旧保存には count/pattern/style が無い＝単発・標準へ。
 * ------------------------------------------------------------------------ */
function normalizeItem(raw){
  if (!raw || typeof raw !== 'object') return null;
  const def = typeDef(raw.type);
  if (!def) return null;
  const quality = QUALITY_BY_ID[raw.quality] ? raw.quality : 'common';
  const stats = {};
  for (const st of def.stats){
    const v = raw.stats && typeof raw.stats[st.id] === 'number' ? raw.stats[st.id] : 1;
    stats[st.id] = clamp(v > 0 ? v : 1, st.lo, st.hi);
  }
  const maxShots = (def.shots) ? def.shots.max : 1;
  const count = clamp(Math.floor(Number(raw.count) || 1), 1, maxShots);
  const pattern = (count < 2) ? 'single' : (raw.pattern === 'fan' ? 'fan' : 'parallel');
  const styleAllowed = def.styles ? def.styles.map(s => s.id) : ['stock'];
  const style = styleAllowed.indexOf(raw.style) >= 0 ? raw.style : 'stock';
  /* v1.16.0+: 形状・発射音・着弾音（旧保存は style を三者へ展開＝互換）。未知の値は style へ。
     形状は型ごとの集合（sleek を含む）で判定する。 */
  const projAllowed   = itemTraitValues(raw.type, 'projectile');
  const launchAllowed = itemTraitValues(raw.type, 'launchSound');
  const impactAllowed = itemTraitValues(raw.type, 'impactSound');
  const projectile  = projAllowed.indexOf(raw.projectile)   >= 0 ? raw.projectile   : style;
  const launchSound = launchAllowed.indexOf(raw.launchSound) >= 0 ? raw.launchSound : style;
  const impactSound = impactAllowed.indexOf(raw.impactSound) >= 0 ? raw.impactSound : style;
  return {
    id: (typeof raw.id === 'string' && raw.id) ? raw.id : null,
    type: raw.type, quality, stats, initial:false,
    enh: clamp(Math.floor(Number(raw.enh) || 0), 0, ENHANCE_MAX),
    count, pattern, style, projectile, launchSound, impactSound,
  };
}

/* --------------------------------------------------------------------------
 * 倉庫（保存・上限・装備）。永続の実体は io { load, save }。
 * ------------------------------------------------------------------------ */
export function createArsenalStore(io){
  const loadFn = (io && io.load) || (() => null);
  const saveFn = (io && io.save) || (() => {});

  let items = [];
  let equipped = { torpedo:null, missile:null };   // null = 初期品
  let nextId = 1;

  (function load(){
    let data = null;
    try { data = loadFn(); } catch (e) { data = null; }
    if (data && typeof data === 'object'){
      const list = Array.isArray(data.items) ? data.items : [];
      for (const raw of list){
        if (items.length >= ARSENAL_CAP) break;
        const it = normalizeItem(raw);
        if (it) items.push(it);
      }
      if (data.equipped && typeof data.equipped === 'object'){
        equipped.torpedo = data.equipped.torpedo || null;
        equipped.missile = data.equipped.missile || null;
      }
    }
    /* nextId: 保存値 or 既存 ID の最大 + 1 */
    nextId = (data && Number.isFinite(data.nextId) && data.nextId > 0) ? Math.floor(data.nextId) : 1;
    for (const it of items){
      const m = /^w(\d+)$/.exec(it.id || '');
      if (m) nextId = Math.max(nextId, Number(m[1]) + 1);
    }
    /* 不正な装備（存在しない個体・未知の型）は初期品へ戻す */
    for (const t of TYPE_ORDER){
      if (equipped[t] && !items.some(it => it.id === equipped[t])) equipped[t] = null;
    }
    for (const it of items){ it.id = it.id || ('w' + (nextId++)); }
  })();

  function persist(){
    try { saveFn({ v:1, nextId, equipped:{ ...equipped }, items: items.map(it => ({ ...it, stats:{ ...it.stats } })) }); }
    catch (e) { /* 保存失敗でも進行は続ける */ }
  }

  const find = id => items.find(it => it.id === id) || null;

  return {
    cap: () => ARSENAL_CAP,
    count: () => items.length,
    items: () => items.slice(),
    itemById: id => find(id),

    initialItem,

    /** 装備中の個体（未装備は初期品）。 */
    equipped(typeId){
      const id = equipped[typeId];
      return (id && find(id)) || initialItem(typeId);
    },
    equippedId(typeId){ return equipped[typeId] || ('initial:' + typeId); },
    isEquipped(id){ return id && (equipped.torpedo === id || equipped.missile === id); },

    /** 追加。満杯は { ok:false, reason:'full' }（装備はしない）。 */
    add(raw){
      const it = normalizeItem(raw);
      if (!it) return { ok:false, reason:'invalid' };
      if (items.length >= ARSENAL_CAP) return { ok:false, reason:'full' };
      it.id = 'w' + (nextId++);
      items.push(it);
      persist();
      return { ok:true, item:it };
    },

    /** 捨てる（整理）。装備中・初期品は消せない。 */
    remove(id){
      if (!id || isInitialId(id)) return false;
      if (equipped.torpedo === id || equipped.missile === id) return false;
      const i = items.findIndex(it => it.id === id);
      if (i < 0) return false;
      items.splice(i, 1);
      persist();
      return true;
    },

    /** 強化（資源は呼び出し側。ここは段を 1 つ進めるだけ）。初期品・上限は進めない。 */
    enhance(id){
      const it = find(id);
      if (!it) return { ok:false, reason:'notfound' };
      const l = Math.max(0, Math.min(ENHANCE_MAX, Math.floor(it.enh || 0)));
      if (l >= ENHANCE_MAX) return { ok:false, reason:'max' };
      it.enh = l + 1;
      persist();
      return { ok:true, id, level: it.enh };
    },

    /** 装備。id は所持個体か 'initial:<type>'。 */
    equip(id){
      if (!id) return { ok:false, reason:'invalid' };
      let typeId, newId;
      if (isInitialId(id)){
        typeId = id.slice('initial:'.length);
        if (!typeDef(typeId)) return { ok:false, reason:'invalid' };
        newId = null;
      } else {
        const it = find(id);
        if (!it) return { ok:false, reason:'notfound' };
        typeId = it.type; newId = it.id;
      }
      const prev = equipped[typeId] || ('initial:' + typeId);
      const next = newId || ('initial:' + typeId);
      const changed = prev !== next;
      equipped[typeId] = newId;
      persist();
      return { ok:true, type:typeId, id:next, changed };
    },
  };
}

/* --------------------------------------------------------------------------
 * 武器パネル（製造・換装・比較・捨てる）— 純粋な状態機械。
 *   deps:
 *     store  : createArsenalStore の戻り
 *     ledger : { total(), spend(n)->bool, add(n) }   … 資源の増減は呼び出し側
 *     rng    : ロール用の乱数（注入）
 *     onEquip: (id, changed) => void
 * ------------------------------------------------------------------------ */
export function createWeaponPanel(deps){
  const store = deps.store;
  const ledger = deps.ledger;
  const rng = deps.rng || (() => Math.random());
  const onEquip = deps.onEquip || (() => {});
  const onEnhance = deps.onEnhance || (() => {});

  let open = false;
  let cursor = 0;
  let lastResult = null;
  let msg = '';

  const makeRows = () => TYPE_ORDER.map(typeId => {
    const price = manufactureCost(typeId);
    let state;
    if (store.count() >= store.cap()) state = 'full';
    else if (ledger.total() < price) state = 'insufficient';
    else state = 'buy';
    return { kind:'make', type:typeId, index:TYPE_ORDER.indexOf(typeId),
      label:WEAPON_TYPES[typeId].name + 'を製造', price, state, unit:'製造' };
  });
  const initialRows = () => TYPE_ORDER.map(typeId => {
    const it = initialItem(typeId);
    return { kind:'item', id:it.id, type:typeId, initial:true, quality:'standard',
      label:itemShort(it), short:itemShort(it), primary:itemPrimary(it),
      shots:'単発', count:1, pattern:'single', style:'stock',
      enh:0, enhMax:ENHANCE_MAX, enhPrice:null, enhState:'initial',
      equipped: store.equippedId(typeId) === it.id, discardable:false };
  });
  const ownRows = () => store.items().map(it => {
    const ei = enhanceInfo(it);
    return {
      kind:'item', id:it.id, type:it.type, initial:false, quality:it.quality,
      label:itemBadge(it), short:itemShort(it), primary:itemPrimary(it),
      shots:itemShots(it), count:itemShotCount(it), pattern:itemPattern(it), style:itemStyle(it),
      enh: Math.max(0, Math.floor(it.enh || 0)), enhMax: ENHANCE_MAX,
      enhPrice: ei.price,
      enhState: ei.maxed ? 'max' : ((ledger.total() < ei.price) ? 'insufficient' : 'buy'),
      equipped: store.equippedId(it.type) === it.id, discardable:true, item:it,
    };
  });

  const rowCount = () => TYPE_ORDER.length * 2 + store.count();
  const rows = () => [...makeRows(), ...initialRows(), ...ownRows()];
  const clampCursor = () => { cursor = Math.max(0, Math.min(rowCount() - 1, cursor)); };
  const currentRow = () => rows()[cursor] || null;

  function makeActivate(row){
    if (row.state === 'full'){ msg = '倉庫が満杯'; lastResult = { ok:false, type:'make', reason:'full' }; return lastResult; }
    if (row.state === 'insufficient'){ msg = '資源が足りない'; lastResult = { ok:false, type:'make', reason:'insufficient' }; return lastResult; }
    if (!ledger.spend(row.price)){ msg = '資源が足りない'; lastResult = { ok:false, type:'make', reason:'insufficient' }; return lastResult; }
    const item = rollItem(row.type, rng);
    const res = store.add(item);
    if (!res.ok){ if (ledger.add) ledger.add(row.price); msg = '倉庫が満杯'; lastResult = { ok:false, type:'make', reason:res.reason }; return lastResult; }
    msg = itemShort(res.item) + ' ' + itemShots(res.item) + ' を製造';
    lastResult = { ok:true, type:'make', typeId:row.type, item:res.item, itemId:res.item.id, price:row.price };
    return lastResult;
  }

  function activate(){
    const row = currentRow();
    if (!row){ lastResult = { ok:false, type:'none' }; return lastResult; }
    if (row.kind === 'make') return makeActivate(row);
    const r = store.equip(row.id);
    if (r.ok && r.changed) onEquip(row.id, true);
    else if (r.ok) onEquip(row.id, false);
    msg = r.ok ? (r.changed ? (itemShort(store.equipped(r.type)) + ' に換装') : 'すでに装備中') : '装備できない';
    lastResult = { ok:r.ok, type:'equip', id:r.id, changed:!!r.changed };
    return lastResult;
  }

  /**
   * 装備中と候補の比較（選択行が所持品/初期品のとき）。強化段も反映する。
   * 弾速などの実値（real）と、斉射（発射数・方向・実効火力・発熱・消費弾）・外観も返す。
   */
  function compare(){
    const row = currentRow();
    if (!row || row.kind !== 'item') return null;
    const def = WEAPON_TYPES[row.type];
    const from = store.equipped(row.type);
    const to = row.initial ? initialItem(row.type) : (store.itemById(row.id) || initialItem(row.type));
    const fromEff = effectiveItemStats(from), toEff = effectiveItemStats(to);
    const lines = def.stats.map(st => {
      const fv = fromEff[st.id], tv = toEff[st.id];
      const dir = Math.sign(statGrade(st, tv) - statGrade(st, fv));
      return { id:st.id, name:st.name, better:st.better, from:fv, to:tv, dir,
        fromDisplay:statDisplay(st, fv), toDisplay:statDisplay(st, tv),
        fromReal:statReal(st, fv), toReal:statReal(st, tv) };
    });
    const fromWp = weaponParams(row.type, from), toWp = weaponParams(row.type, to);
    const salvo = {
      typeId:row.type,
      fromCount:fromWp.count, toCount:toWp.count,
      fromPattern:fromWp.pattern, toPattern:toWp.pattern,
      fromShots:itemShots(from), toShots:itemShots(to),
      fromStyle:styleLabel(fromWp.style), toStyle:styleLabel(toWp.style),
      fromPower:fromWp.salvoMul, toPower:toWp.salvoMul,
      fromHeat:(row.type === 'torpedo') ? fromWp.heat : null,
      toHeat:(row.type === 'torpedo') ? toWp.heat : null,
      fromAmmo:(row.type === 'missile') ? fromWp.count : null,
      toAmmo:(row.type === 'missile') ? toWp.count : null,
    };
    const ei = enhanceInfo(to);
    const enh = {
      eligible: ei.eligible, maxed: ei.maxed, level: ei.level, max: ei.max,
      next: (!ei.eligible || ei.maxed) ? null : ei.level + 1,
      price: ei.price,
      powerFrom: (fromWp.dmgMul != null) ? fromWp.dmgMul : null,
      powerTo: (!ei.eligible || ei.maxed) ? null : weaponParams(row.type, Object.assign({}, to, { enh: ei.level + 1 })).dmgMul,
    };
    return {
      typeId:row.type, candidateId:row.id,
      fromLabel:qualityLabel(from), toLabel:qualityLabel(to),
      from, to, lines, enh, salvo,
      anyUp: lines.some(l => l.dir > 0), anyDown: lines.some(l => l.dir < 0),
    };
  }

  /** 強化（選択行が所持品で、上限でないとき）。資源は一度だけ。初期品・上限・不足は消費なし。 */
  function enhance(){
    const row = currentRow();
    if (!row || row.kind !== 'item' || row.initial){ msg = '標準装備は強化できない'; lastResult = { ok:false, type:'enhance', reason:'initial' }; return lastResult; }
    const it = store.itemById(row.id);
    if (!it){ msg = '対象がない'; lastResult = { ok:false, type:'enhance', reason:'notfound' }; return lastResult; }
    const ei = enhanceInfo(it);
    if (ei.maxed){ msg = '強化は上限'; lastResult = { ok:false, type:'enhance', reason:'max' }; return lastResult; }
    if (ledger.total() < ei.price){ msg = '資源が足りない'; lastResult = { ok:false, type:'enhance', reason:'insufficient' }; return lastResult; }
    if (!ledger.spend(ei.price)){ msg = '資源が足りない'; lastResult = { ok:false, type:'enhance', reason:'insufficient' }; return lastResult; }
    const r = store.enhance(row.id);
    if (!r.ok){ if (ledger.add) ledger.add(ei.price); msg = '強化できない'; lastResult = { ok:false, type:'enhance', reason:r.reason }; return lastResult; }
    onEnhance(row.id, r.level);
    msg = itemShort(it) + ' を強化 +' + r.level;
    lastResult = { ok:true, type:'enhance', id:row.id, level:r.level, price:ei.price };
    return lastResult;
  }

  /** 捨てる（選択行が所持品で、装備中でないとき）。 */
  function discard(){
    const row = currentRow();
    if (!row || row.kind !== 'item' || row.initial) { msg = 'これは捨てられない'; lastResult = { ok:false, type:'discard', reason:'locked' }; return lastResult; }
    if (store.isEquipped(row.id)) { msg = '装備中は捨てられない'; lastResult = { ok:false, type:'discard', reason:'equipped' }; return lastResult; }
    const ok = store.remove(row.id);
    clampCursor();
    msg = ok ? '拠り分けを捨てた' : '捨てられない';
    lastResult = { ok, type:'discard', id:row.id };
    return lastResult;
  }

  return {
    isOpen: () => open,
    open(){ open = true; cursor = 0; lastResult = null; msg = ''; },
    close(){ open = false; },
    cursor: () => cursor,
    rows, rowCount, currentRow,
    move(delta){ if (!open) return; cursor += (delta < 0 ? -1 : 1); clampCursor(); },
    setCursor(i){ cursor = Math.max(0, Math.min(rowCount() - 1, Math.floor(Number(i) || 0))); },
    activate, compare, discard, enhance,
    lastResult: () => lastResult,
    message: () => msg,
  };
}
