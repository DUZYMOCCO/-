/**
 * ABYSS DIVE — 追加兵装（通常/反射レーザー・反射魚雷・全自動近接）と、
 *   回収品からの「指定開発（型ごとの特性の恒久解放）」をまとめる純粋ルール。
 *
 *   純粋ロジック / DOM 非依存 / 保存は io { load, save } 注入 / 乱数は rng 注入。
 *
 * 設計の前提（曖昧な点の明記）:
 *   - 『撃つ』枠は 1 つ。既存の魚雷（weapon-rules の個体）と、ここで扱う
 *     通常レーザー / 反射レーザー / 反射魚雷 を同じ枠で換装する。
 *   - ミサイルは既存どおり別ボタンのまま（この モジュールは触らない）。
 *   - 近接は全種オート・基地で 1 種だけ選択。専用ボタンは無い。潜航中のみ作動し、
 *     岩越し・射程外・基地/徒歩中は作動しない（melee-rules のゲートに従う）。
 *   - 反射・近接の当たりは本編の trench solids（矩形）と G.rocks（円）を
 *     そのまま geometry として渡す。見た目（経路 points）と実当たり（hits）は
 *     reflect-rules の同じ 1 回の計算で出す。
 *   - 特性（count/pattern/弾の形/発射音/着弾音）は「型の互換性ごと」に恒久解放する。
 *     項目ごとに独立して選べ、費用を見て指定開発する。選んだ項目はそのまま、
 *     品質・数値はランダムに維持する。資源不足・未解放・非互換は無消費で拒否。
 *   - 解放は保存され、廃棄・再読み込み後も残る。両基地で同じ 1 つの保存を共有する。
 */

import { fireLaser, advanceProjectile, reflectDir, MAX_REFLECT, traceReflect } from './reflect-rules.js';
import { createMelee, meleeParams, MELEE_TYPES, MELEE_ORDER, MELEE_STATS, defaultIsFixed, MELEE_MODE } from './melee-rules.js';

export const ADV_KEY = 'abyss_advanced_weapons';   // localStorage: game_studio_abyss_advanced_weapons
export const ADV_CAP = 8;                           // 追加兵装の倉庫上限（満杯は無消費で拒否）

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const round3 = v => Math.round(v * 1000) / 1000;

/* ==========================================================================
 * 1. 『撃つ』枠の武器カタログ（魚雷は既存 armory への委譲、他はここで扱う）
 * ======================================================================== */

export const SHOT_ORDER = Object.freeze(['torpedo', 'laser', 'reflaser', 'reftorp']);

/**
 * kind:
 *   'torpedo'       … 既存 armory の魚雷へ委譲（このモジュールは個体を持たない）
 *   'beam'          … 即着のレーザー（reflect-rules の fireLaser。maxReflect で反射回数）
 *   'refProjectile' … 反射する魚雷（advanceProjectile。壁で 1 回跳ねる）
 */
export const SHOT_WEAPONS = Object.freeze({
  torpedo:  Object.freeze({ id:'torpedo',  name:'魚雷',         short:'魚雷',         kind:'torpedo', maxReflect:0 }),
  laser:    Object.freeze({ id:'laser',    name:'通常レーザー', short:'通常レーザー', kind:'beam', maxReflect:0,
    base:Object.freeze({ dmg:11, fireCd:0.20, heat:0.030, range:1000, r:3,  color:'#8ff0ff' }) }),
  reflaser: Object.freeze({ id:'reflaser', name:'反射レーザー', short:'反射レーザー', kind:'beam', maxReflect:1,
    base:Object.freeze({ dmg:13, fireCd:0.32, heat:0.048, range:1100, r:3.5, color:'#c9a0ff' }) }),
  reftorp:  Object.freeze({ id:'reftorp',  name:'反射魚雷',     short:'反射魚雷',     kind:'refProjectile', maxReflect:1,
    base:Object.freeze({ dmg:30, fireCd:0.60, heat:0.075, speed:820, life:1.7, r:6, aoe:38, color:'#ffd27a' }) }),
});
export function shotDef(typeId){ return SHOT_WEAPONS[typeId] || null; }
export function isAdvancedShot(typeId){ const d = SHOT_WEAPONS[typeId]; return !!(d && d.kind !== 'torpedo'); }

/* 撃つ枠に載らない既存兵装（魚雷＝撃つ枠の既定・armory が保持／ミサイル＝別ボタン）。
   特性ライブラリはこの 2 型も扱う＝回収で解放し、基地の指定開発で組み合わせられる。
   ただし作られる個体は armory（weapon-rules）のもの（旧ロール・旧セーブは不変）。 */
export const ARMORY_TYPES = Object.freeze(['torpedo', 'missile']);
export const TRAIT_TYPES = Object.freeze(['torpedo', 'missile', 'laser', 'reflaser', 'reftorp']);
export function isArmoryType(typeId){ return ARMORY_TYPES.indexOf(typeId) >= 0; }
export function traitTypeName(typeId){
  if (SHOT_WEAPONS[typeId]) return SHOT_WEAPONS[typeId].name;
  return (typeId === 'missile') ? 'ミサイル' : String(typeId);
}
/** 指定開発で選ぶ特性カテゴリ。魚雷/ミサイル（armory）は形状/発射音/着弾音まで独立に選べる。
 *  レーザー（beam）は弾体の形も着弾音の実処理も無いため、意味のある同時発射/方向/発射音だけを見せる。 */
const TRAIT_ORDER_RAW = Object.freeze(['count', 'pattern', 'projectile', 'launchSound', 'impactSound']);
const BEAM_CATS = Object.freeze(['count', 'pattern', 'launchSound']);
export const DESIGN_CATS = Object.freeze({
  torpedo:  TRAIT_ORDER_RAW, missile:  TRAIT_ORDER_RAW,
  laser:    BEAM_CATS, reflaser: BEAM_CATS, reftorp: TRAIT_ORDER_RAW,
});
export function designCats(typeId){ return DESIGN_CATS[typeId] || TRAIT_ORDER_RAW; }

/* 追加兵装の個体値（倍率。1 が標準）。魚雷・ミサイル（weapon-rules）と同流儀。 */
export const SHOT_STATS = Object.freeze([
  Object.freeze({ id:'power',    name:'威力', base:1, lo:0.70, hi:1.50, better:'high' }),
  Object.freeze({ id:'speed',    name:'弾速', base:1, lo:0.75, hi:1.35, better:'high' }),
  Object.freeze({ id:'interval', name:'間隔', base:1, lo:0.60, hi:1.45, better:'low' }),
  Object.freeze({ id:'heat',     name:'発熱', base:1, lo:0.60, hi:1.50, better:'low' }),
]);
export const SHOT_STAT_IDS = Object.freeze(SHOT_STATS.map(s => s.id));

export const SHOT_QUALITIES = Object.freeze([
  Object.freeze({ id:'poor',   label:'粗悪', mul:0.86, spread:0.18, weight:0.30, color:'#c9a978' }),
  Object.freeze({ id:'common', label:'並',   mul:1.00, spread:0.13, weight:0.42, color:'#d8e6ef' }),
  Object.freeze({ id:'fine',   label:'良品', mul:1.15, spread:0.11, weight:0.20, color:'#9fe8ff' }),
  Object.freeze({ id:'prime',  label:'特上', mul:1.30, spread:0.08, weight:0.08, color:'#ffd98a' }),
]);
export const SHOT_QUALITY_BY_ID = Object.freeze(Object.fromEntries(SHOT_QUALITIES.map(q => [q.id, q])));
export function shotQualityLabel(item){
  if (!item) return '';
  if (item.initial || item.quality === 'standard') return '標準装備';
  const q = SHOT_QUALITY_BY_ID[item.quality];
  return q ? q.label : '並';
}
export function shotQualityColor(item){
  if (item && !item.initial && SHOT_QUALITY_BY_ID[item.quality]) return SHOT_QUALITY_BY_ID[item.quality].color;
  return '#d8e6ef';
}

/* 標準装備（初期品）。倍率はすべて 1（現行同等）。撃つ枠の既定は魚雷。 */
const INITIAL_SHOTS = Object.freeze({
  laser:    Object.freeze({ id:'initial:laser',    type:'laser',    quality:'standard', initial:true,
    stats:Object.freeze({ power:1, speed:1, interval:1, heat:1 }), count:1, pattern:'single',
    projectile:'stock', launchSound:'stock', impactSound:'stock' }),
  reflaser: Object.freeze({ id:'initial:reflaser', type:'reflaser', quality:'standard', initial:true,
    stats:Object.freeze({ power:1, speed:1, interval:1, heat:1 }), count:1, pattern:'single',
    projectile:'stock', launchSound:'stock', impactSound:'stock' }),
  reftorp:  Object.freeze({ id:'initial:reftorp',  type:'reftorp',  quality:'standard', initial:true,
    stats:Object.freeze({ power:1, speed:1, interval:1, heat:1 }), count:1, pattern:'single',
    projectile:'stock', launchSound:'stock', impactSound:'stock' }),
});
export function initialShot(typeId){ return INITIAL_SHOTS[typeId] || null; }

/* ==========================================================================
 * 2. 特性（型ごとの互換性・恒久解放・指定開発）
 * ======================================================================== */

/** 弾の形（外観のみ・当たり/威力は不変）。 */
export const PROJECTILES = Object.freeze({
  stock:   Object.freeze({ id:'stock',   label:'標準' }),
  slender: Object.freeze({ id:'slender', label:'細身' }),
  stout:   Object.freeze({ id:'stout',   label:'ずんぐり' }),
  finned:  Object.freeze({ id:'finned',  label:'尾翼' }),
  sleek:   Object.freeze({ id:'sleek',   label:'流線' }),   // v1.16.0+: 潜水艇 09 と馴染む新シルエット
});
/** 発射音（SE。性能には影響しない）。 */
export const LAUNCH_SOUNDS = Object.freeze({
  stock:   Object.freeze({ id:'stock',   label:'標準' }),
  slender: Object.freeze({ id:'slender', label:'高音' }),
  stout:   Object.freeze({ id:'stout',   label:'重低音' }),
  finned:  Object.freeze({ id:'finned',  label:'鋭い' }),
});
/** 着弾音（SE。ダメージには影響しない）。 */
export const IMPACT_SOUNDS = Object.freeze({
  stock: Object.freeze({ id:'stock', label:'標準' }),
  heavy: Object.freeze({ id:'heavy', label:'重い' }),
  light: Object.freeze({ id:'light', label:'軽い' }),
});
export function optionLabel(cat, value){
  switch (cat){
    case 'count':      return (Number(value) < 2) ? '単発' : ('×' + Number(value));
    case 'pattern':    return (value === 'fan') ? '扇状' : (value === 'parallel' ? '並列' : '単発');
    case 'projectile': return (PROJECTILES[value] || PROJECTILES.stock).label;
    case 'launchSound':return (LAUNCH_SOUNDS[value] || LAUNCH_SOUNDS.stock).label;
    case 'impactSound':return (IMPACT_SOUNDS[value] || IMPACT_SOUNDS.stock).label;
    default:           return String(value);
  }
}

/** 特性の並び（UI と同じ順）。 */
export const TRAIT_ORDER = Object.freeze(['count', 'pattern', 'projectile', 'launchSound', 'impactSound']);
export const TRAIT_NAMES = Object.freeze({ count:'同時発射', pattern:'発射方向', projectile:'弾の形', launchSound:'発射音', impactSound:'着弾音' });

/** 型ごとの互換（それ以外の値は非互換＝無消費で拒否）。armory（魚雷/ミサイル）は style の集合に合わせる。 */
export const TRAIT_COMPAT = Object.freeze({
  torpedo:  Object.freeze({ count:[1,2,3], pattern:['single','parallel','fan'], projectile:['stock','slender','stout','sleek'], launchSound:['stock','slender','stout'], impactSound:['stock','slender','stout'] }),
  missile:  Object.freeze({ count:[1,2],   pattern:['single','parallel','fan'], projectile:['stock','finned','stout','sleek'],  launchSound:['stock','finned','stout'],  impactSound:['stock','finned','stout'] }),
  laser:    Object.freeze({ count:[1,2],   pattern:['single','parallel'],       projectile:['stock','slender'],        launchSound:['stock','slender'],        impactSound:['stock','light'] }),
  reflaser: Object.freeze({ count:[1,2],   pattern:['single','fan'],            projectile:['stock','slender'],        launchSound:['stock','slender'],        impactSound:['stock','light'] }),
  reftorp:  Object.freeze({ count:[1,2,3], pattern:['single','parallel','fan'], projectile:['stock','stout'],          launchSound:['stock','stout'],          impactSound:['stock','heavy'] }),
});
export function traitOptions(typeId, cat){
  const c = TRAIT_COMPAT[typeId];
  if (!c || !c[cat]) return [];
  return c[cat].slice();
}
export function traitCompatible(typeId, cat, value){
  return traitOptions(typeId, cat).some(v => String(v) === String(value));
}

/** 特性ごとの費用（指定開発でその項目を選ぶと加算される）。 */
export const TRAIT_COST = Object.freeze({
  count:        Object.freeze({ 1:0, 2:180, 3:420 }),
  pattern:      Object.freeze({ single:0, parallel:120, fan:200 }),
  projectile:   Object.freeze({ stock:0, slender:80, stout:80, finned:120, sleek:140 }),
  launchSound:  Object.freeze({ stock:0, slender:90, stout:90, finned:130 }),
  impactSound:  Object.freeze({ stock:0, heavy:100, light:70, slender:90, stout:90, finned:130 }),
});
export function traitCost(cat, value){ const t = TRAIT_COST[cat]; return t ? (t[value] || 0) : 0; }
export const DESIGN_BASE_COST = 140;                 // 型を選んで開発する基本費用

/** 選択した特性の合計費用（表示・判定用）。 */
export function designCost(typeId, selection){
  const sel = selection || {};
  let cost = DESIGN_BASE_COST;
  for (const cat of TRAIT_ORDER){
    if (sel[cat] === undefined || sel[cat] === null) continue;
    cost += traitCost(cat, sel[cat]);
  }
  return cost;
}

/* ==========================================================================
 * 3. ロール（乱数注入）
 * ======================================================================== */
function pickWeighted(rng, weights){
  const r = clamp(Number(rng()), 0, 0.9999999);
  let acc = 0;
  for (let i = 0; i < weights.length; i++){ acc += weights[i]; if (r < acc) return i; }
  return weights.length - 1;
}
function pickQuality(rng){
  return SHOT_QUALITIES[pickWeighted(rng, SHOT_QUALITIES.map(q => q.weight))];
}
function pickTrait(typeId, cat, rng){
  const opts = traitOptions(typeId, cat);
  if (!opts.length) return null;
  return opts[Math.min(opts.length - 1, Math.floor(clamp(Number(rng()), 0, 0.9999999) * opts.length))];
}

/**
 * 追加兵装の個体を 1 つロールする（特性は型互換の中から）。
 * @param {string} typeId 'laser' | 'reflaser' | 'reftorp'
 */
export function rollAdvanced(typeId, rng){
  const def = SHOT_WEAPONS[typeId];
  if (!def || def.kind === 'torpedo') return null;
  const rand = (typeof rng === 'function') ? rng : Math.random;
  const q = pickQuality(rand);
  const stats = {};
  for (const st of SHOT_STATS){
    const tilt = (clamp(Number(rand()), 0, 1) * 2 - 1) * q.spread;
    let m = (st.better === 'low') ? (1 / q.mul) * (1 + tilt) : q.mul * (1 + tilt);
    stats[st.id] = round3(clamp(m, st.lo, st.hi));
  }
  return {
    type:typeId, quality:q.id, stats, initial:false, enh:0,
    count:pickTrait(typeId, 'count', rand),
    pattern:pickTrait(typeId, 'pattern', rand),
    projectile:pickTrait(typeId, 'projectile', rand),
    launchSound:pickTrait(typeId, 'launchSound', rand),
    impactSound:pickTrait(typeId, 'impactSound', rand),
  };
}

/**
 * 指定開発: 選んだ特性はそのまま、品質・数値はランダムに維持して 1 つ作る。
 * 互換性の無い選択は null（＝呼び出し側は無消費で拒否する）。
 */
export function designRoll(typeId, selection, rng){
  const def = SHOT_WEAPONS[typeId];
  if (!def || def.kind === 'torpedo') return null;
  const sel = selection || {};
  for (const cat of TRAIT_ORDER){
    if (sel[cat] === undefined || sel[cat] === null) continue;
    if (!traitCompatible(typeId, cat, sel[cat])) return null;   // 非互換
  }
  const rand = (typeof rng === 'function') ? rng : Math.random;
  const q = pickQuality(rand);
  const stats = {};
  for (const st of SHOT_STATS){
    const tilt = (clamp(Number(rand()), 0, 1) * 2 - 1) * q.spread;
    let m = (st.better === 'low') ? (1 / q.mul) * (1 + tilt) : q.mul * (1 + tilt);
    stats[st.id] = round3(clamp(m, st.lo, st.hi));
  }
  return {
    type:typeId, quality:q.id, stats, initial:false, enh:0,
    count:       (sel.count        != null) ? sel.count        : pickTrait(typeId, 'count', rand),
    pattern:     (sel.pattern      != null) ? sel.pattern      : pickTrait(typeId, 'pattern', rand),
    projectile:  (sel.projectile   != null) ? sel.projectile   : pickTrait(typeId, 'projectile', rand),
    launchSound: (sel.launchSound  != null) ? sel.launchSound  : pickTrait(typeId, 'launchSound', rand),
    impactSound: (sel.impactSound  != null) ? sel.impactSound  : pickTrait(typeId, 'impactSound', rand),
  };
}

/** リロール個体（未解放の特性も含む「回収品」）。解放判定は unlockFromItem 側。 */
export function rollSalvageItem(rng, weights){
  const w = weights || { torpedo:0.34, laser:0.24, reflaser:0.26, reftorp:0.16 };
  const ids = SHOT_ORDER.filter(id => id !== 'torpedo' || true);
  const ws = ids.map(id => w[id] || 0);
  const typeId = ids[pickWeighted(rng, ws)];
  if (typeId === 'torpedo') return null;   // 魚雷は既存 armory が扱う
  return rollAdvanced(typeId, rng);
}

/* ==========================================================================
 * 4. 個体から実パラメータ（威力・弾速・間隔・発熱・反射・発射数/方向/外観）
 * ======================================================================== */

/** 個体の実値（強化段も反映。weapon-rules と同じ流儀）。 */
export function effectiveShotStats(item){
  const out = {};
  const lvl = Math.max(0, Math.floor((item && item.enh) || 0));
  for (const st of SHOT_STATS){
    const base = (item && item.stats && typeof item.stats[st.id] === 'number') ? item.stats[st.id] : 1;
    const step = (st.id === 'power') ? 0.12 : 0.06;
    const m = 1 + step * lvl;
    out[st.id] = round3(st.better === 'low' ? base / m : base * m);
  }
  return out;
}

/* -------------------------------------------------------------------------
 * 指定開発した個体の段階強化（資源を払って伸ばす。weapon-rules と同じ流儀）。
 * ランダムロール・品質・発射数/方向・外観・解放は維持し、威力中心に予測可能。
 * 回収/開発した個体だけが対象。標準装備（initial）は保護。保存に反映され、実射にも出る。
 * ----------------------------------------------------------------------- */
export const ADV_ENHANCE_MAX = 3;
export const ADV_ENHANCE_COST = Object.freeze([150, 300, 600]);   // level→level+1（逓増）
export function advEnhanceCost(level){
  const l = Math.floor(Number(level) || 0);
  return (l < 0 || l >= ADV_ENHANCE_MAX) ? null : ADV_ENHANCE_COST[l];
}
export function advEnhanceInfo(item){
  const l = Math.max(0, Math.min(ADV_ENHANCE_MAX, Math.floor(Number(item && item.enh) || 0)));
  const initial = !!(item && item.initial);
  const maxed = l >= ADV_ENHANCE_MAX;
  return { level:l, max:ADV_ENHANCE_MAX, maxed, initial, eligible:!initial,
    price:(initial || maxed) ? null : ADV_ENHANCE_COST[l] };
}
/** 強化段つきの短い表示（例: 通常レーザー・良品 強化+2）。 */
export function advItemLabel(item){
  if (!item) return '—';
  const s = (SHOT_WEAPONS[item.type] ? SHOT_WEAPONS[item.type].short : traitTypeName(item.type)) + '・' + shotQualityLabel(item);
  const e = Math.max(0, Math.min(ADV_ENHANCE_MAX, Math.floor(Number(item.enh) || 0)));
  return s + (e > 0 ? ' 強化+' + e : '');
}

/* -------------------------------------------------------------------------
 * 全自動近接の段階強化（資源を払って伸ばす。weapon-rules / 追加兵装と同じ流儀）。
 * 解放時に 1 回ロールした個体差（倍率）は保持し、段で予測可能に伸ばす（威力中心）。
 * 解放済みの近接だけが対象。保存に反映され、実ダメージ（meleeParams 経由）へ出る。
 * ----------------------------------------------------------------------- */
export const MELEE_ENHANCE_MAX = 3;
export const MELEE_ENHANCE_COST = Object.freeze([150, 300, 600]);   // level→level+1（逓増）
export function meleeEnhanceCost(level){
  const l = Math.floor(Number(level) || 0);
  return (l < 0 || l >= MELEE_ENHANCE_MAX) ? null : MELEE_ENHANCE_COST[l];
}
/** 表示・判定用（price は解放済みかつ上限でないときだけ）。 */
export function meleeEnhanceInfo(level, unlocked){
  const l = Math.max(0, Math.min(MELEE_ENHANCE_MAX, Math.floor(Number(level) || 0)));
  const maxed = l >= MELEE_ENHANCE_MAX;
  const eligible = (unlocked !== false) && !maxed;
  return { level:l, max:MELEE_ENHANCE_MAX, maxed, eligible, price: eligible ? MELEE_ENHANCE_COST[l] : null };
}
/** 強化段を反映した近接の個体差（倍率）。power は +12%/段、他は有利側へ +6%/段（low 系は小さく）。 */
export function effectiveMeleeStats(baseStats, level){
  const l = Math.max(0, Math.min(MELEE_ENHANCE_MAX, Math.floor(Number(level) || 0)));
  const out = {};
  for (const st of Object.values(MELEE_STATS)){
    const base = (baseStats && typeof baseStats[st.id] === 'number' && baseStats[st.id] > 0) ? baseStats[st.id] : 1;
    const step = (st.id === 'power') ? 0.12 : 0.06;
    const m = 1 + step * l;
    out[st.id] = round3(st.better === 'low' ? base / m : base * m);
  }
  return out;
}

/** 発射数の許容・方向の実値（型互換の範囲に丸める）。 */
export function itemCount(item, typeId){
  const max = (traitOptions(typeId, 'count').slice(-1)[0]) || 1;
  return clamp(Math.floor(Number(item && item.count) || 1), 1, max);
}
export function itemPattern(item, typeId){
  if (itemCount(item, typeId) < 2) return 'single';
  const opts = traitOptions(typeId, 'pattern');
  const p = item && item.pattern;
  return (opts.indexOf(p) >= 0 && p !== 'single') ? p : (opts.indexOf('parallel') >= 0 ? 'parallel' : 'fan');
}
export function itemProjectile(item, typeId){ return traitCompatible(typeId, 'projectile', item && item.projectile) ? item.projectile : 'stock'; }
export function itemLaunchSound(item, typeId){ return traitCompatible(typeId, 'launchSound', item && item.launchSound) ? item.launchSound : 'stock'; }
export function itemImpactSound(item, typeId){ return traitCompatible(typeId, 'impactSound', item && item.impactSound) ? item.impactSound : 'stock'; }

/**
 * 『撃つ』枠の武器の実パラメータ。weaponParams と同じ「個体の倍率を基準値へ」流儀。
 * 多連は 1 発威力を割り引いて総火力を線形未満に留め、熱は斉射ぶん（既存方針と同じ）。
 */
export const SHOT_PER_SHELL = Object.freeze({ 1:1.00, 2:0.82, 3:0.68 });
export function shotPerShell(count){ const c = clamp(Math.floor(Number(count) || 1), 1, 3); return SHOT_PER_SHELL[c]; }

export function shotParams(typeId, item){
  const def = SHOT_WEAPONS[typeId];
  if (!def || def.kind === 'torpedo') return null;
  const b = def.base;
  const s = effectiveShotStats(item);
  const g = id => (typeof s[id] === 'number' && s[id] > 0) ? s[id] : 1;
  const count = itemCount(item, typeId);
  const pattern = itemPattern(item, typeId);
  const perShell = shotPerShell(count);
  const params = {
    typeId, kind:def.kind, name:def.name, maxReflect:def.maxReflect,
    dmg: b.dmg * g('power') * perShell,          // 1 発あたり威力
    fireCd: b.fireCd * g('interval'),
    heat: (b.heat || 0) * count,                 // 斉射ぶんの熱
    range: b.range || 0,
    speed: (b.speed || 0) * g('speed'),
    life: b.life || 0,
    r: b.r || 3,
    aoe: b.aoe || 0,
    color: b.color || '#8ff0ff',
    count, pattern,
    projectile: itemProjectile(item, typeId),
    launchSound: itemLaunchSound(item, typeId),
    impactSound: itemImpactSound(item, typeId),
    salvoMul: count * perShell,
  };
  return params;
}

/* ==========================================================================
 * 5. 倉庫（追加兵装の個体・解放・装備）。永続の実体は io { load, save }。
 * ======================================================================== */
function normalizeAdv(raw){
  if (!raw || typeof raw !== 'object') return null;
  const def = SHOT_WEAPONS[raw.type];
  if (!def || def.kind === 'torpedo') return null;
  const quality = SHOT_QUALITY_BY_ID[raw.quality] ? raw.quality : 'common';
  const stats = {};
  for (const st of SHOT_STATS){
    const v = raw.stats && typeof raw.stats[st.id] === 'number' ? raw.stats[st.id] : 1;
    stats[st.id] = clamp(v > 0 ? v : 1, st.lo, st.hi);
  }
  return {
    id: (typeof raw.id === 'string' && raw.id) ? raw.id : null,
    type: raw.type, quality, stats, initial:false,
    enh: clamp(Math.floor(Number(raw.enh) || 0), 0, 3),
    count: itemCount(raw, raw.type),
    pattern: itemPattern(raw, raw.type),
    projectile: itemProjectile(raw, raw.type),
    launchSound: itemLaunchSound(raw, raw.type),
    impactSound: itemImpactSound(raw, raw.type),
  };
}

/**
 * 追加兵装の保存。個体・恒久解放・装備（撃つ枠・近接）を 1 つに持つ。
 * deps: { load(), save(v), cap }。解放は廃棄・再読み込みでも消えない。
 */
export function createAdvancedStore(io){
  const loadFn = (io && io.load) || (() => null);
  const saveFn = (io && io.save) || (() => {});
  const cap = (io && io.cap) || ADV_CAP;

  let items = [];
  let nextId = 1;
  /* 解放: { type: { cat: [values...] } }。標準値（stock/単発/single）は常に許可。 */
  let unlocked = {};
  let equippedShot = 'torpedo';      // 'torpedo' | 'laser' | 'reflaser' | 'reftorp'
  let equippedMelee = null;          // 近接 1 種（未選択は null）
  let meleeUnlocked = {};            // { typeId:true }
  let rawMeleeStats = {};            // 近接の個体差（倍率。解放時に 1 回ロールし保存）
  let meleeEnh = {};                 // 近接の強化段 { typeId:level }

  function ensureUnlock(typeId){
    if (!unlocked[typeId]) unlocked[typeId] = {};
    for (const cat of TRAIT_ORDER) if (!unlocked[typeId][cat]) unlocked[typeId][cat] = [];
    return unlocked[typeId];
  }
  function defaultTrait(cat){
    if (cat === 'count') return 1;
    if (cat === 'pattern') return 'single';
    return 'stock';
  }
  /* 標準値・初期は常に解放（型互換なら）。armory（魚雷/ミサイル）も同じ。 */
  function seedDefaults(){
    for (const typeId of TRAIT_TYPES){
      const u = ensureUnlock(typeId);
      for (const cat of TRAIT_ORDER){
        const opts = traitOptions(typeId, cat);
        const std = defaultTrait(cat);
        if (opts.some(v => String(v) === String(std)) && !u[cat].some(v => String(v) === String(std))) u[cat].push(std);
      }
    }
  }

  (function load(){
    let data = null;
    try { data = loadFn(); } catch (e) { data = null; }
    if (data && typeof data === 'object'){
      if (Array.isArray(data.items)){
        for (const raw of data.items){
          if (items.length >= cap) break;
          const it = normalizeAdv(raw);
          if (it) items.push(it);
        }
      }
      if (data.unlocked && typeof data.unlocked === 'object'){
        for (const typeId of Object.keys(data.unlocked)){
          if (TRAIT_TYPES.indexOf(typeId) < 0) continue;
          const u = ensureUnlock(typeId);
          const src = data.unlocked[typeId] || {};
          for (const cat of TRAIT_ORDER){
            const list = Array.isArray(src[cat]) ? src[cat] : [];
            for (const v of list){ if (traitCompatible(typeId, cat, v) && !u[cat].some(x => String(x) === String(v))) u[cat].push(v); }
          }
        }
      }
      if (Array.isArray(data.meleeUnlocked)) for (const id of data.meleeUnlocked) if (MELEE_TYPES[id]) meleeUnlocked[id] = true;
      if (data.meleeStats && typeof data.meleeStats === 'object'){
        for (const id of Object.keys(data.meleeStats)){
          const s = data.meleeStats[id]; if (!MELEE_TYPES[id] || !s || typeof s !== 'object') continue;
          const out = {}; for (const st of Object.values(MELEE_STATS)){ const v = Number(s[st.id]); out[st.id] = (v > 0) ? clamp(v, st.lo, st.hi) : 1; }
          rawMeleeStats[id] = out;
        }
      }
      if (data.meleeEnh && typeof data.meleeEnh === 'object'){
        for (const id of Object.keys(data.meleeEnh)){ if (MELEE_TYPES[id]) meleeEnh[id] = clamp(Math.floor(Number(data.meleeEnh[id]) || 0), 0, MELEE_ENHANCE_MAX); }
      }
      if (typeof data.equippedShot === 'string'){
        const ok = data.equippedShot === 'torpedo'
          || (data.equippedShot.indexOf('initial:') === 0 && SHOT_WEAPONS[data.equippedShot.slice('initial:'.length)])
          || items.some(it => it.id === data.equippedShot);
        if (ok) equippedShot = data.equippedShot;
      }
      if (typeof data.equippedMelee === 'string' && MELEE_TYPES[data.equippedMelee] && meleeUnlocked[data.equippedMelee]) equippedMelee = data.equippedMelee;
      nextId = (Number.isFinite(data.nextId) && data.nextId > 0) ? Math.floor(data.nextId) : 1;
    }
    for (const it of items){ const m = /^a(\d+)$/.exec(it.id || ''); if (m) nextId = Math.max(nextId, Number(m[1]) + 1); }
    for (const it of items) it.id = it.id || ('a' + (nextId++));
    seedDefaults();
  })();

  function persist(){
    try {
      saveFn({
        v:1, nextId, equippedShot, equippedMelee,
        meleeUnlocked: Object.keys(meleeUnlocked),
        meleeStats: JSON.parse(JSON.stringify(rawMeleeStats)),
        meleeEnh: JSON.parse(JSON.stringify(meleeEnh)),
        items: items.map(it => ({ ...it, stats:{ ...it.stats } })),
        unlocked: JSON.parse(JSON.stringify(unlocked)),
      });
    } catch (e){ /* 保存失敗でも進行は続ける */ }
  }

  const find = id => items.find(it => it.id === id) || null;

  return {
    cap: () => cap,
    count: () => items.length,
    items: () => items.slice(),
    itemById: id => find(id),

    /* --- 解放 --- */
    isUnlocked(typeId, cat, value){
      const u = unlocked[typeId];
      if (!u || !u[cat]) return false;
      return u[cat].some(v => String(v) === String(value));
    },
    unlockedList(typeId, cat){
      const u = unlocked[typeId];
      const vals = (u && u[cat]) ? u[cat].slice() : [];
      return vals;
    },
    /** 1 項目を恒久解放する（既に有れば false）。armory（魚雷/ミサイル）も対象。 */
    unlock(typeId, cat, value){
      if (TRAIT_TYPES.indexOf(typeId) < 0) return false;
      if (!traitCompatible(typeId, cat, value)) return false;
      const u = ensureUnlock(typeId);
      if (u[cat].some(v => String(v) === String(value))) return false;
      u[cat].push(value);
      persist();
      return true;
    },
    /** 個体（回収品）の特性を型互換ごとに解放する。解放した項目数を返す。
        armory（魚雷/ミサイル）の個体は style 1 つ＝形状・発射音・着弾音を同じ値で解放する（旧style互換）。 */
    unlockFromItem(item){
      if (!item || TRAIT_TYPES.indexOf(item.type) < 0) return 0;
      const cosmetic = (item.style != null) ? item.style : null;
      const project = (item.projectile != null) ? item.projectile : cosmetic;
      const launch  = (item.launchSound != null) ? item.launchSound : cosmetic;
      const impact  = (item.impactSound != null) ? item.impactSound : cosmetic;
      let n = 0;
      const pairs = [
        ['count', item.count], ['pattern', item.pattern], ['projectile', project],
        ['launchSound', launch], ['impactSound', impact],
      ];
      for (const [cat, v] of pairs){
        if (v === undefined || v === null) continue;
        if (this.unlock(item.type, cat, v)) n++;
      }
      return n;
    },
    meleeUnlockedList: () => MELEE_ORDER.filter(id => meleeUnlocked[id]),
    isMeleeUnlocked: id => !!meleeUnlocked[id],
    /** 近接の個体差（倍率）。解放時に 1 回ロールし保存し、強化段を掛けた実効値を返す。 */
    meleeStats(id){ return rawMeleeStats[id] ? effectiveMeleeStats(rawMeleeStats[id], meleeEnh[id] || 0) : null; },
    /** 素の個体差（強化前。表示・検証用）。 */
    meleeBaseStats(id){ return rawMeleeStats[id] ? { ...rawMeleeStats[id] } : null; },
    meleeEnhanceLevel: id => clamp(Math.floor(Number(meleeEnh[id]) || 0), 0, MELEE_ENHANCE_MAX),
    meleeEnhanceInfo(id){ return meleeEnhanceInfo(meleeEnh[id] || 0, !!meleeUnlocked[id]); },
    /** 段を 1 つ進める（資源は呼び出し側）。未解放・上限は進めない。 */
    enhanceMelee(id){
      if (!MELEE_TYPES[id] || !meleeUnlocked[id]) return { ok:false, reason:'locked' };
      const l = clamp(Math.floor(Number(meleeEnh[id]) || 0), 0, MELEE_ENHANCE_MAX);
      if (l >= MELEE_ENHANCE_MAX) return { ok:false, reason:'max' };
      meleeEnh[id] = l + 1;
      persist();
      return { ok:true, id, level: meleeEnh[id] };
    },
    unlockMelee(id, rng){
      if (!MELEE_TYPES[id]) return false;
      if (meleeUnlocked[id]) return false;
      meleeUnlocked[id] = true;
      const rand = (typeof rng === 'function') ? rng : Math.random;
      const out = {};
      for (const st of Object.values(MELEE_STATS)){ const r = clamp(Number(rand()), 0, 0.9999999); out[st.id] = round3(st.lo + r * (st.hi - st.lo)); }
      rawMeleeStats[id] = out;
      persist();
      return true;
    },

    /* --- 個体 --- */
    add(raw){
      const it = normalizeAdv(raw);
      if (!it) return { ok:false, reason:'invalid' };
      if (items.length >= cap) return { ok:false, reason:'full' };
      it.id = 'a' + (nextId++);
      items.push(it);
      persist();
      return { ok:true, item:it };
    },
    remove(id){
      if (!id) return false;
      if (equippedShot === id) return false;                 // 装備中は捨てられない
      const i = items.findIndex(it => it.id === id);
      if (i < 0) return false;
      items.splice(i, 1);
      persist();
      return true;
    },
    /** 段階強化（段を 1 つ進めるだけ。資源は呼び出し側・パネル側）。初期品・上限は進めない。 */
    enhance(id){
      const it = find(id);
      if (!it) return { ok:false, reason:'notfound' };
      const l = Math.max(0, Math.min(ADV_ENHANCE_MAX, Math.floor(it.enh || 0)));
      if (l >= ADV_ENHANCE_MAX) return { ok:false, reason:'max' };
      it.enh = l + 1;
      persist();
      return { ok:true, id, level: it.enh };
    },

    /* --- 装備（撃つ枠・近接）---
       撃つ枠は 'torpedo' | 'initial:<type>' | <個体ID>。個体は 1 つを指す。 */
    equippedShot: () => equippedShot,
    /** 撃つ枠の実体（'torpedo' は null＝呼び出し側が armory を使う）。 */
    shotItem(){
      if (equippedShot === 'torpedo') return null;
      if (equippedShot.indexOf('initial:') === 0){
        const t = equippedShot.slice('initial:'.length);
        return SHOT_WEAPONS[t] ? initialShot(t) : null;
      }
      return find(equippedShot);
    },
    equippedShotType(){
      if (equippedShot === 'torpedo') return 'torpedo';
      const it = this.shotItem();
      return it ? it.type : 'torpedo';
    },
    equipShot(id){
      if (!id) return { ok:false, reason:'invalid' };
      if (id !== 'torpedo'){
        const isInit = id.indexOf('initial:') === 0 && !!SHOT_WEAPONS[id.slice('initial:'.length)] && SHOT_WEAPONS[id.slice('initial:'.length)].kind !== 'torpedo';
        const isItem = !!find(id);
        if (!isInit && !isItem) return { ok:false, reason:'notfound' };
      }
      const changed = equippedShot !== id;
      equippedShot = id;
      persist();
      return { ok:true, id, type:this.equippedShotType(), changed };
    },
    equippedMelee: () => equippedMelee,
    equipMelee(id){
      if (id != null && (!MELEE_TYPES[id] || !meleeUnlocked[id])) return { ok:false, reason:'locked' };
      const changed = equippedMelee !== id;
      equippedMelee = id || null;
      persist();
      return { ok:true, id:equippedMelee, changed };
    },

    /** 装備中の撃つ枠の実パラメータ（魚雷は null＝呼び出し側が armory を使う）。 */
    shotParams(){
      if (equippedShot === 'torpedo') return null;
      const it = this.shotItem();
      if (!it) return null;
      return shotParams(it.type, it);
    },

    /** デバッグ・保存用に全解放を返す。 */
    unlockedAll: () => JSON.parse(JSON.stringify(unlocked)),
  };
}

/* ==========================================================================
 * 6. 指定開発パネル（武器選択 → 開発の選択と確定）。純粋な状態機械。
 *    deps: { store, ledger, rng, onEquip, onMelee }
 *      ledger : { total(), spend(n)->bool, add(n) }
 *      onEquip(typeId, id, changed) / onMelee(id, changed)
 *    項目ごとに独立して選び、費用を見て確定する。未解放・非互換は選べない。
 *    資源不足・満杯は無消費で拒否する。
 * ======================================================================== */
export function createForgePanel(deps){
  const store = deps.store;
  const ledger = deps.ledger;
  const rng = deps.rng || (() => Math.random());
  const onEquip = deps.onEquip || (() => {});
  const onMelee = deps.onMelee || (() => {});
  const onEnhance = deps.onEnhance || (() => {});
  const armory = deps.armory || null;                   // weapon-rules の魚雷/ミサイル（armory 型の開発先）
  const designWeapon = deps.designWeapon || null;       // weapon-rules.designItem（armory 型の指定開発）

  let open = false;
  let screen = 'weapons';           // 'weapons' | 'design'
  let designType = 'laser';         // 開発中の型
  let sel = {};                     // 開発中の選択
  let cursor = 0;
  let msg = '';
  let lastResult = null;

  const TRAIT_DEFAULT = { count:1, pattern:'single', projectile:'stock', launchSound:'stock', impactSound:'stock' };
  function resetSel(typeId){
    sel = {};
    for (const cat of TRAIT_ORDER) sel[cat] = TRAIT_DEFAULT[cat];
  }
  /* 選べる値 = 型互換かつ解放済み。並びは型互換の順。 */
  function choices(typeId, cat){
    const opts = traitOptions(typeId, cat);
    return opts.filter(v => store.isUnlocked(typeId, cat, v));
  }

  function weaponRows(){
    const rows = [];
    /* 『撃つ枠』（魚雷＋追加兵装）。魚雷は armory、追加兵装は advanced。 */
    for (const typeId of SHOT_ORDER){
      const def = SHOT_WEAPONS[typeId];
      const equipped = (store.equippedShotType && store.equippedShotType()) === typeId;
      const ownedN = store.items().filter(it => it.type === typeId).length;
      rows.push({ kind:'shot', typeId, label:def.name, equipped,
        note: (typeId === 'torpedo') ? '既存の魚雷' : ('所持 ' + ownedN) });
    }
    /* ミサイル（別ボタン・armory）。所持数と装備は armory 側で扱う。 */
    if (armory){
      rows.push({ kind:'missile', typeId:'missile', label:'ミサイル',
        equipped: armory.equippedId('missile') !== 'initial:missile',
        note:'所持 ' + armory.items().filter(it => it.type === 'missile').length });
    }
    /* 近接（全自動・基地で 1 種だけ）。解放後は武器と同じく段階強化できる。 */
    for (const id of MELEE_ORDER){
      const def = MELEE_TYPES[id];
      const unlocked = store.isMeleeUnlocked(id);
      const ei = store.meleeEnhanceInfo(id);
      const enhState = !unlocked ? 'locked' : (ei.maxed ? 'max' : ((ledger.total() < ei.price) ? 'insufficient' : 'buy'));
      rows.push({ kind:'melee', id, label:def.name, unlocked,
        equipped: store.equippedMelee() === id, note: unlocked ? '' : '未解放',
        enh: ei.level, enhMax: ei.max, enhPrice: ei.price, enhState });
    }
    /* 指定開発（撃つ枠＋魚雷/ミサイル。回収で解放した特性を組み合わせる）。 */
    for (const typeId of TRAIT_TYPES){
      rows.push({ kind:'design', typeId, label:traitTypeName(typeId) + ' を指定開発', note:'' });
    }
    /* 所持（追加兵装の個体）。決定で撃つ枠へ換装、強化で段階強化。 */
    for (const it of store.items()){
      const ei = advEnhanceInfo(it);
      rows.push({ kind:'item', id:it.id, typeId:it.type, label:advItemLabel(it),
        equipped: (store.equippedShot && store.equippedShot() === it.id),
        enh:ei.level, enhMax:ei.max, enhPrice:ei.price,
        enhState: ei.maxed ? 'max' : ((ledger.total() < ei.price) ? 'insufficient' : 'buy'),
        item:it });
    }
    return rows;
  }
  function designRows(){
    const rows = [];
    for (const cat of designCats(designType)){
      const opts = choices(designType, cat);
      const val = sel[cat];
      rows.push({ kind:'trait', cat, label:TRAIT_NAMES[cat],
        value:val, valueLabel:optionLabel(cat, val),
        options:opts, editable: opts.length > 1,
        cost: traitCost(cat, val) });
    }
    const cost = designCost(designType, sel);
    const full = isArmoryType(designType) ? (!armory || armory.count() >= armory.cap()) : (store.count() >= store.cap());
    rows.push({ kind:'confirm', label:'開発（' + traitTypeName(designType) + '）',
      cost, affordable: ledger.total() >= cost, full });
    return rows;
  }
  const rows = () => (screen === 'design') ? designRows() : weaponRows();
  const rowCount = () => rows().length;
  const clampCursor = () => { cursor = Math.max(0, Math.min(rowCount() - 1, cursor)); };
  const currentRow = () => rows()[cursor] || null;

  function openDesign(typeId){
    if (TRAIT_TYPES.indexOf(typeId) < 0) { msg = 'この型は開発できない'; return; }
    designType = typeId; resetSel(typeId); screen = 'design'; cursor = 0; msg = '';
  }
  function back(){ screen = 'weapons'; cursor = 0; msg = ''; }

  function activate(){
    const row = currentRow();
    if (!row){ lastResult = { ok:false, type:'none' }; return lastResult; }
    if (row.kind === 'shot'){
      const r = store.equipShot(row.typeId === 'torpedo' ? 'torpedo' : ('initial:' + row.typeId));
      // 追加兵装は所持個体があればその最新を使う
      if (row.typeId !== 'torpedo' && r.ok){
        const own = store.items().filter(it => it.type === row.typeId);
        if (own.length) store.equipShot(own[own.length - 1].id);
      }
      const changed = r.ok && r.changed;
      if (changed) onEquip(row.typeId, store.equippedShot(), true);
      msg = r.ok ? (changed ? (SHOT_WEAPONS[row.typeId].name + ' に換装') : 'すでに装備中') : '換装できない';
      lastResult = { ok:r.ok, type:'equipShot', typeId:row.typeId, changed };
      return lastResult;
    }
    if (row.kind === 'missile'){
      if (!armory){ msg = '換装できない'; lastResult = { ok:false, type:'equipMissile', reason:'unsupported' }; return lastResult; }
      const own = armory.items().filter(it => it.type === 'missile');
      const target = own.length ? own[own.length - 1].id : 'initial:missile';
      const r = armory.equip(target);
      if (r.ok && r.changed) onEquip('missile', r.id, true);
      msg = r.ok ? (r.changed ? 'ミサイルに換装' : 'すでに装備中') : '換装できない';
      lastResult = { ok:r.ok, type:'equipMissile', id:r.id, changed:!!r.changed };
      return lastResult;
    }
    if (row.kind === 'item'){
      const r = store.equipShot(row.id);
      if (r.ok && r.changed) onEquip(row.typeId, row.id, true);
      msg = r.ok ? (r.changed ? (row.label + ' に換装') : 'すでに装備中') : '換装できない';
      lastResult = { ok:r.ok, type:'equipShot', typeId:row.typeId, changed:!!r.changed };
      return lastResult;
    }
    if (row.kind === 'melee'){
      if (!row.unlocked){ msg = '未解放（回収で解放）'; lastResult = { ok:false, type:'equipMelee', reason:'locked' }; return lastResult; }
      const r = store.equipMelee(row.id);
      if (r.ok && r.changed) onMelee(row.id, true);
      msg = r.ok ? (r.changed ? (MELEE_TYPES[row.id].name + ' を装備') : 'すでに装備中') : '装備できない';
      lastResult = { ok:r.ok, type:'equipMelee', id:row.id, changed:!!r.changed };
      return lastResult;
    }
    if (row.kind === 'design'){ openDesign(row.typeId); lastResult = { ok:true, type:'openDesign', typeId:row.typeId }; return lastResult; }
    if (row.kind === 'confirm'){
      return confirmDesign();
    }
    lastResult = { ok:false, type:'none' };
    return lastResult;
  }

  function confirmDesign(){
    const cost = designCost(designType, sel);
    const armoryType = isArmoryType(designType);
    const full = armoryType ? (!armory || armory.count() >= armory.cap()) : (store.count() >= store.cap());
    if (full){ msg = '倉庫が満杯'; lastResult = { ok:false, type:'design', reason:'full' }; return lastResult; }
    if (ledger.total() < cost){ msg = '資源が足りない'; lastResult = { ok:false, type:'design', reason:'insufficient' }; return lastResult; }
    if (!ledger.spend(cost)){ msg = '資源が足りない'; lastResult = { ok:false, type:'design', reason:'insufficient' }; return lastResult; }
    /* armory（魚雷/ミサイル）は weapon-rules の設計で個体を作り、armory へ入れて装備する。
       追加兵装は designRoll で advanced へ入れる。どちらも非互換・満杯は無消費で拒否（返金）。 */
    const refund = () => { if (ledger.add) ledger.add(cost); };
    if (armoryType){
      if (!armory || !designWeapon){ refund(); msg = '開発できない'; lastResult = { ok:false, type:'design', reason:'unsupported' }; return lastResult; }
      const item = designWeapon(designType, sel, rng);
      if (!item){ refund(); msg = '非互換の選択'; lastResult = { ok:false, type:'design', reason:'incompatible' }; return lastResult; }
      const res = armory.add(item);
      if (!res.ok){ refund(); msg = '倉庫が満杯'; lastResult = { ok:false, type:'design', reason:res.reason }; return lastResult; }
      armory.equip(res.item.id);
      if (designType === 'torpedo') store.equipShot('torpedo');   // 撃つ枠＝既存の魚雷（armory）を維持
      onEquip(designType, res.item.id, true);
      msg = traitTypeName(designType) + '（' + shotQualityLabel(res.item) + '）を開発';
      lastResult = { ok:true, type:'design', typeId:designType, item:res.item, armory:true };
      return lastResult;
    }
    const item = designRoll(designType, sel, rng);
    if (!item){ refund(); msg = '非互換の選択'; lastResult = { ok:false, type:'design', reason:'incompatible' }; return lastResult; }
    const res = store.add(item);
    if (!res.ok){ refund(); msg = '倉庫が満杯'; lastResult = { ok:false, type:'design', reason:res.reason }; return lastResult; }
    msg = traitTypeName(designType) + '（' + shotQualityLabel(res.item) + '）を開発';
    lastResult = { ok:true, type:'design', typeId:designType, item:res.item };
    return lastResult;
  }

  /** 選択行が所持個体（追加兵装）／解放済みの近接のとき段階強化。資源は一度だけ。初期品・上限・不足は消費なし。 */
  function enhance(){
    const row = currentRow();
    /* 近接（全自動）も武器と同じく段階強化できる（解放済みのみ）。 */
    if (row && row.kind === 'melee'){
      if (!row.unlocked){ msg = '未解放（回収で解放）'; lastResult = { ok:false, type:'enhance', reason:'locked' }; return lastResult; }
      const ei = store.meleeEnhanceInfo(row.id);
      if (ei.maxed){ msg = '強化は上限'; lastResult = { ok:false, type:'enhance', reason:'max' }; return lastResult; }
      if (ledger.total() < ei.price){ msg = '資源が足りない'; lastResult = { ok:false, type:'enhance', reason:'insufficient' }; return lastResult; }
      if (!ledger.spend(ei.price)){ msg = '資源が足りない'; lastResult = { ok:false, type:'enhance', reason:'insufficient' }; return lastResult; }
      const r = store.enhanceMelee(row.id);
      if (!r.ok){ if (ledger.add) ledger.add(ei.price); msg = '強化できない'; lastResult = { ok:false, type:'enhance', reason:r.reason }; return lastResult; }
      onEnhance(row.id, r.level);
      msg = MELEE_TYPES[row.id].name + ' を強化 +' + r.level;
      lastResult = { ok:true, type:'enhance', melee:true, id:row.id, level:r.level, price:ei.price };
      return lastResult;
    }
    if (!row || row.kind !== 'item'){ msg = '強化は所持品で'; lastResult = { ok:false, type:'enhance', reason:'invalid' }; return lastResult; }
    const it = store.itemById(row.id);
    if (!it){ msg = '対象がない'; lastResult = { ok:false, type:'enhance', reason:'notfound' }; return lastResult; }
    const ei = advEnhanceInfo(it);
    if (ei.maxed){ msg = '強化は上限'; lastResult = { ok:false, type:'enhance', reason:'max' }; return lastResult; }
    if (ledger.total() < ei.price){ msg = '資源が足りない'; lastResult = { ok:false, type:'enhance', reason:'insufficient' }; return lastResult; }
    if (!ledger.spend(ei.price)){ msg = '資源が足りない'; lastResult = { ok:false, type:'enhance', reason:'insufficient' }; return lastResult; }
    const r = store.enhance(row.id);
    if (!r.ok){ if (ledger.add) ledger.add(ei.price); msg = '強化できない'; lastResult = { ok:false, type:'enhance', reason:r.reason }; return lastResult; }
    onEnhance(row.id, r.level);
    msg = advItemLabel(it) + ' を強化 +' + r.level;
    lastResult = { ok:true, type:'enhance', id:row.id, level:r.level, price:ei.price };
    return lastResult;
  }

  /** design 画面で trait 行の値を 1 つ進める／戻す（解放値の範囲だけ）。 */
  function adjust(delta){
    if (screen !== 'design') return false;
    const row = currentRow();
    if (!row || row.kind !== 'trait' || !row.editable) return false;
    const opts = row.options;
    const i = opts.findIndex(v => String(v) === String(sel[row.cat]));
    const ni = Math.max(0, Math.min(opts.length - 1, (i < 0 ? 0 : i) + (delta < 0 ? -1 : 1)));
    sel[row.cat] = opts[ni];
    return true;
  }

  return {
    isOpen: () => open,
    open(){ open = true; screen = 'weapons'; cursor = 0; msg = ''; lastResult = null; },
    close(){ open = false; },
    screen: () => screen,
    designType: () => designType,
    selection: () => ({ ...sel }),
    cursor: () => cursor,
    rows, rowCount, currentRow,
    move(delta){ cursor += (delta < 0 ? -1 : 1); clampCursor(); },
    setCursor(i){ cursor = Math.max(0, Math.min(rowCount() - 1, Math.floor(Number(i) || 0))); },
    activate, adjust, back, enhance,
    message: () => msg,
    lastResult: () => lastResult,
  };
}

/* ==========================================================================
 * 7. 射撃ヘルパ（game.js から呼ぶ。可視経路＝実当たり）
 * ======================================================================== */

/** 追加兵装の形状（矩形 solids / 円 rocks と targets=敵）を本編データから組む。 */
export function buildGeometry(solids, rocks){
  const out = [];
  if (solids) for (const s of solids) out.push({ kind:'rect', x:s.x, y:s.y, w:s.w, h:s.h, ref:s });
  if (rocks)  for (const r of rocks)  out.push({ kind:'circle', x:r.x, y:r.y, r:r.r, ref:r });
  return out;
}

/** レーザー 1 発。可視経路 points と実当たり hits を返す（そのまま描く・当てる）。 */
export function fireBeam(x0, y0, aim, targets, geometry, params){
  return fireLaser({
    x0, y0, dir:{ a:aim }, dist:params.range,
    solids:geometry, targets, maxReflect:params.maxReflect,
  });
}

export { createMelee, meleeParams, MELEE_TYPES, MELEE_ORDER, MELEE_STATS, defaultIsFixed, MELEE_MODE,
  fireLaser, advanceProjectile, reflectDir, traceReflect, MAX_REFLECT };
