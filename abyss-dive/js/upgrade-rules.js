/**
 * ABYSS DIVE — 艇の整備・改造の純粋ルール（DOM 非依存 / テスト可能）
 *
 * v1.11.0: 船のそばの整備端末で、資源を使って艇を整備・改造する。
 *   - 船体修理（欠損ぶんを資源で戻す。買い切りではなく現在の船体に連動）
 *   - 改造は 7 項目。装甲／運動性／最高速／加速／魚雷火力／ミサイル威力／ミサイル爆風範囲。
 *     「ミサイル威力」だけは通常＋改造 3 段（計 4 ランク）で、ランクが上がるほど発射する
 *     ミサイル本体の見た目も大きくなる。他 6 項目は初回 1 段ずつ（有限）。
 *   - 購入は所持資源と連動（不足時・購入済み/上限は消費なし）。効果の適用は一度きり。
 *   - 強化は永続（独自キー UPGRADE_KEY）。以前の保存資源（resources.js）はそのまま使う。
 *   - 未購入の基礎性能は現行同等（BASE_STATS は game.js の実数と一致）。
 *
 * ここは数値・判定・状態機械だけ。描画（base.js）と艇への適用（game.js）は呼び出し側。
 * 保存の実体（localStorage）は io { load, save } で渡す。
 */

export const UPGRADE_KEY = 'abyss_upgrades';   // localStorage: game_studio_abyss_upgrades

/** 未改造の基礎性能（現行の game.js 実数と一致させる）。 */
export const BASE_STATS = Object.freeze({
  maxHp: 100,          // 船体（最大 HP）
  accel: 1050,         // 加速（px/s^2）
  maxSpeed: 360,       // 最高速（px/s）
  drag: 3.1,           // 横滑り・逆方向・入力なしの減衰（大きいほど早く止まる）
  torpedoDmg: 1.5,     // 魚雷火力
  missileDmg: 11,      // ミサイル威力
  missileBlast: 110,   // ミサイル爆風範囲（半径 px）
});

/** 修理の単価（欠損 1 HP あたりの資源）。 */
export const REPAIR_PER_HP = 5;

/**
 * 改造項目。values は「段ごとの値」（values[level]）。prices[level] は level→level+1 の価格。
 * stat は BASE_STATS のどの項目に効くか。visual は見た目スケール（ミサイル威力のみ）。
 * 項目の並びは端末での表示順。
 */
export const UPGRADE_ITEMS = Object.freeze([
  { id:'armor',        label:'装甲',             stat:'maxHp',        unit:'最大船体', maxLevel:1,
    values:[100, 150],   prices:[600] },
  { id:'mobility',     label:'運動性',           stat:'drag',         unit:'応答',     maxLevel:1,
    values:[3.1, 4.8],   prices:[500] },
  { id:'maxSpeed',     label:'最高速',           stat:'maxSpeed',     unit:'速度',     maxLevel:1,
    values:[360, 430],   prices:[550] },
  { id:'accel',        label:'加速',             stat:'accel',        unit:'加速',     maxLevel:1,
    values:[1050, 1500], prices:[500] },
  { id:'torpedoDmg',   label:'魚雷火力',         stat:'torpedoDmg',   unit:'威力',     maxLevel:1,
    values:[1.5, 2.4],   prices:[450] },
  { id:'missilePower', label:'ミサイル威力',     stat:'missileDmg',   unit:'威力',     maxLevel:3,
    values:[11, 18, 28, 44], prices:[350, 700, 1200],
    /* 弾体の見た目スケール（通常比）。ランク上限は艇の全長に迫る。 */
    visual:[1, 1.5, 2.3, 4] },
  { id:'missileBlast', label:'ミサイル爆風範囲', stat:'missileBlast', unit:'半径',     maxLevel:1,
    values:[110, 150],   prices:[550] },
]);

export const ITEM_BY_ID = Object.freeze(Object.fromEntries(UPGRADE_ITEMS.map(it => [it.id, it])));

const item = id => ITEM_BY_ID[id];
const clampLevel = (id, lvl) => {
  const it = item(id); if (!it) return 0;
  const n = Math.floor(Number(lvl) || 0);
  return n < 0 ? 0 : (n > it.maxLevel ? it.maxLevel : n);
};

/** 全項目の現在レベル（未指定は 0）。正規化して返す。 */
export function normalizeLevels(levels){
  const out = {};
  for (const it of UPGRADE_ITEMS) out[it.id] = clampLevel(it.id, levels ? levels[it.id] : 0);
  return out;
}

/** 現在レベルでの実性能（未購入の項目は基礎性能のまま）。 */
export function effectiveStats(levels){
  const lv = normalizeLevels(levels);
  const s = Object.assign({}, BASE_STATS);
  for (const it of UPGRADE_ITEMS) s[it.stat] = it.values[lv[it.id]];
  return s;
}

/** 見た目スケール（ミサイル威力のみ）。未定義の項目は 1。 */
export function visualScale(id, level){
  const it = item(id);
  if (!it || !it.visual) return 1;
  return it.visual[clampLevel(id, level)];
}

/** 次の 1 段の価格（上限なら null）。 */
export function nextPrice(id, level){
  const it = item(id);
  if (!it) return null;
  const lv = clampLevel(id, level);
  if (lv >= it.maxLevel) return null;
  return it.prices[lv];
}

/** その項目が上限か。 */
export function isMax(id, level){
  const it = item(id);
  if (!it) return true;
  return clampLevel(id, level) >= it.maxLevel;
}

/** 一般化: 任意の「段ごとの効果」から 1 段進めたときの前後値を返す（表示用）。 */
export function itemEffect(id, level){
  const it = item(id);
  if (!it) return null;
  const lv = clampLevel(id, level);
  const next = Math.min(it.maxLevel, lv + 1);
  return {
    id, label: it.label, unit: it.unit,
    level: lv, maxLevel: it.maxLevel,
    from: it.values[lv], to: it.values[next],
    displayFrom: displayValue(it, lv),
    displayTo: displayValue(it, next),
    price: (lv >= it.maxLevel ? null : it.prices[lv]),
    maxed: lv >= it.maxLevel,
  };
}

function displayValue(it, lv){
  const v = it.values[lv];
  if (it.id === 'mobility') return '応答 ' + v.toFixed(1);
  if (it.stat === 'torpedoDmg') return v.toFixed(1);
  return String(Math.round(v));
}

/** 船体修理の費用（欠損ぶんに比例）。満タンなら 0。 */
export function repairCost(hp, maxHp){
  const h = Math.max(0, Number(hp) || 0);
  const m = Math.max(0, Number(maxHp) || 0);
  const missing = Math.max(0, m - h);
  if (missing <= 0) return 0;
  return Math.max(REPAIR_PER_HP, Math.ceil(missing * REPAIR_PER_HP));
}

/**
 * 改造・修理の状態を保持する（永続は io { load, save }）。
 * 資源の増減は呼び出し側（resources.js の ledger）に任せる。ここは残高に触らない。
 */
export function createUpgradeStore(io){
  const loadFn = (io && io.load) || (() => null);
  const saveFn = (io && io.save) || (() => {});
  let levels;
  try { levels = normalizeLevels(loadFn()); } catch (e) { levels = normalizeLevels(null); }

  function persist(){ try { saveFn({ ...levels }); } catch (e) { /* 保存失敗でも進行は続ける */ } }

  return {
    levels(){ return { ...levels }; },
    level(id){ return levels[id] || 0; },
    owns(id){ return (levels[id] || 0) >= 1; },
    isMax(id){ return isMax(id, levels[id] || 0); },
    /** 1 段進める（上限を超えない）。実際に進めたら true。 */
    setLevel(id, lvl){
      const want = clampLevel(id, lvl);
      if (want === (levels[id] || 0)) return false;
      levels[id] = want; persist(); return true;
    },
    /** 1 段だけ進める（購入の成功時に呼ぶ）。 */
    advance(id){ return this.setLevel(id, (levels[id] || 0) + 1); },
  };
}

/* --------------------------------------------------------------------------
 * 整備端末のパネル（選択・確認・閉じる）— 純粋な状態機械。
 *   描画は base.js、資源の減算と効果の適用はここから呼び出す。
 *   deps:
 *     items   : UPGRADE_ITEMS 相当（既定は UPGRADE_ITEMS）
 *     store   : createUpgradeStore の戻り
 *     ledger  : { total(), spend(n)->bool }
 *     getHp   : () => { hp, maxHp }
 *     onApply : ({ type, id, amount }) => void   … 効果の適用（任意）
 * ------------------------------------------------------------------------ */
export function createUpgradePanel(deps){
  const items = deps.items || UPGRADE_ITEMS;
  const store = deps.store;
  const ledger = deps.ledger;
  const getHp = deps.getHp || (() => ({ hp: 0, maxHp: 0 }));
  const onApply = deps.onApply || (() => {});

  let open = false;
  let cursor = 0;                 // 0 = 修理行、1.. = items
  let lastResult = null;

  const rowCount = () => 1 + items.length;
  const clampCursor = () => { cursor = Math.max(0, Math.min(rowCount() - 1, cursor)); };

  function repairRow(){
    const { hp, maxHp } = getHp();
    const cost = repairCost(hp, maxHp);
    const missing = Math.max(0, maxHp - hp);
    let state;
    if (missing <= 0) state = 'full';
    else if (ledger.total() < cost) state = 'insufficient';
    else state = 'buy';
    return {
      kind:'repair', index:0, label:'船体修理', unit:'船体',
      from: Math.round(hp), to: Math.round(maxHp),
      displayFrom: Math.round(hp), displayTo: Math.round(maxHp),
      missing, price: cost, state,
    };
  }

  function itemRow(it, index){
    const lv = store.level(it.id);
    const ef = itemEffect(it.id, lv);
    let state;
    if (ef.maxed) state = 'max';
    else if (ledger.total() < ef.price) state = 'insufficient';
    else state = 'buy';
    return {
      kind:'upgrade', index, id: it.id, label: it.label, unit: it.unit,
      level: lv, maxLevel: it.maxLevel,
      displayFrom: ef.displayFrom, displayTo: ef.displayTo,
      price: ef.price, state, visual: it.visual ? it.visual[lv] : 1,
    };
  }

  /** 表示行（残高も含めて読める形）。 */
  function rows(){
    const out = [repairRow()];
    items.forEach((it, i) => out.push(itemRow(it, i + 1)));
    return out;
  }

  function currentRow(){ return rows()[cursor]; }

  /**
   * 確認（決定）。消費は「買えるときだけ一度」。不足・購入済み/上限は消費せず結果だけ返す。
   * 返り値: { ok, type, id?, amount?, reason? }
   */
  function activate(){
    const row = currentRow();
    if (!row){ lastResult = { ok:false, type:'none' }; return lastResult; }
    if (row.kind === 'repair'){
      if (row.state === 'full'){ lastResult = { ok:false, type:'repair', reason:'full' }; return lastResult; }
      if (row.state === 'insufficient'){ lastResult = { ok:false, type:'repair', reason:'insufficient' }; return lastResult; }
      if (!ledger.spend(row.price)){ lastResult = { ok:false, type:'repair', reason:'insufficient' }; return lastResult; }
      const amount = row.missing;
      onApply({ type:'repair', amount });
      lastResult = { ok:true, type:'repair', amount };
      return lastResult;
    }
    /* upgrade */
    if (row.state === 'max'){ lastResult = { ok:false, type:'upgrade', id:row.id, reason:'max' }; return lastResult; }
    if (row.state === 'insufficient'){ lastResult = { ok:false, type:'upgrade', id:row.id, reason:'insufficient' }; return lastResult; }
    if (!ledger.spend(row.price)){ lastResult = { ok:false, type:'upgrade', id:row.id, reason:'insufficient' }; return lastResult; }
    store.advance(row.id);
    onApply({ type:'upgrade', id:row.id, level: store.level(row.id) });
    lastResult = { ok:true, type:'upgrade', id:row.id, level: store.level(row.id) };
    return lastResult;
  }

  return {
    isOpen: () => open,
    open(){ open = true; cursor = 0; lastResult = null; },
    close(){ open = false; },
    cursor: () => cursor,
    rows,
    currentRow,
    move(delta){
      if (!open) return;
      cursor += (delta < 0 ? -1 : 1);
      clampCursor();
    },
    setCursor(i){ cursor = Math.max(0, Math.min(rowCount() - 1, Math.floor(Number(i) || 0))); },
    activate,
    lastResult: () => lastResult,
  };
}
