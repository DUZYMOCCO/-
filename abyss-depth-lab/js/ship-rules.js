/**
 * ABYSS DIVE — 潜水艇のバリエーション（4 艇）の純粋ルール（DOM 非依存）
 *
 * v1.13.0: 09 万能型を基準に、機動型／火力型／バリア型を追加する。基地で乗り換えて
 *   同じ海域で比較できるようにする。
 *   - 共有の改造（upgrade-rules）と資源はそのまま引き継ぐ（艇ごとに買い直させない）。
 *     艇の差は「改造後の実性能に掛かる倍率」として重ねる（例: 火力型なら魚雷 ×1.35）。
 *   - 得意・不得意を付けるが、特定の艇を必須にしない（どの艇でもジャストは同じ受付・同じ報酬）。
 *   - 換装で船体を無償全回復・弾を増やさない（game.js 側でクランプのみ）。
 *   - 選択は永続（独自キー SHIP_KEY）。
 *
 * ここは数値・状態機械だけ。描画（ship-rig.js / base.js）と適用（game.js）は呼び出し側。
 */

export const SHIP_KEY = 'abyss_ship';   // localStorage: game_studio_abyss_ship

/** 表示・選択の並び順（09 が先頭＝基準）。 */
export const SHIP_ORDER = Object.freeze(['09', 'mobility', 'firepower', 'barrier']);

/**
 * 各艇。mods は「改造後の実性能に掛ける倍率」（未指定=1）。barrier は瞬間バリアの差分
 * （ジャスト受付 JUST は全艇共通。耐久／持続／再使用だけを変える）。
 */
export const SHIPS = Object.freeze({
  '09': Object.freeze({
    id: '09', name: '09 万能型', role: '万能',
    note: '基準。すべて平均。',
    mods: Object.freeze({}),
    barrier: Object.freeze({}),
  }),
  mobility: Object.freeze({
    id: 'mobility', name: '機動型', role: '機動',
    note: '加速・制動・切り返し◎ ／ 耐久・火力は控えめ',
    mods: Object.freeze({ accel: 1.25, maxSpeed: 1.15, drag: 1.40, maxHp: 0.80, torpedoDmg: 0.85, missileDmg: 0.85, missileBlast: 0.85 }),
    barrier: Object.freeze({}),
  }),
  firepower: Object.freeze({
    id: 'firepower', name: '火力型', role: '火力',
    note: '魚雷・ミサイル◎ ／ 切り返しは鈍い',
    mods: Object.freeze({ accel: 0.85, maxSpeed: 0.90, drag: 0.60, torpedoDmg: 1.35, missileDmg: 1.30, missileBlast: 1.20 }),
    barrier: Object.freeze({}),
  }),
  barrier: Object.freeze({
    id: 'barrier', name: 'バリア型', role: '防御',
    note: '通常ガードの耐久・持続・再使用◎ ／ 兵装と機動は控えめ',
    mods: Object.freeze({ maxHp: 1.05, accel: 0.90, maxSpeed: 0.95, drag: 0.85, torpedoDmg: 0.85, missileDmg: 0.90 }),
    /* 通常ガードの利点。ジャストの受付・報酬（0.12s・完全防御・即再使用）は全艇共通。 */
    barrier: Object.freeze({ DURABILITY: 16, DURATION: 0.56, COOLDOWN: 1.4 }),
  }),
});

/** 艇定義（未知は 09）。 */
export function shipDef(id) { return SHIPS[id] || SHIPS['09']; }

/** 艇 id を正規化（未知・未設定は 09）。 */
export function normalizeShip(id) { return SHIPS[id] ? id : '09'; }

/** 改造後の実性能に艇差の倍率を重ねる（新しいオブジェクトを返す）。 */
export function applyShipStats(base, id) {
  const def = shipDef(id);
  const out = Object.assign({}, base);
  for (const k of Object.keys(def.mods)) out[k] = out[k] * def.mods[k];
  return out;
}

/** その艇のバリア構成（JUST は含めない＝全艇共通）。 */
export function shipBarrierConfig(id) { return Object.assign({}, shipDef(id).barrier || {}); }

/** 見分け用の形（色だけに依存しない）。テストと描画の両方で使う。 */
export function shipRig(id) {
  const s = normalizeShip(id);
  return {
    id: s,
    thrusters: s === 'mobility' ? 2 : 1,     // 追加推進器の本数
    twinFins: s === 'mobility',              // 上下の増加フィン
    weaponPod: s === 'firepower',            // 大型の兵装ポッド
    barrierEmitter: s === 'barrier',         // バリア発生器（リング）
  };
}

/** 保存（永続は io { load, save }）。 */
export function createShipStore(io) {
  const loadFn = (io && io.load) || (() => null);
  const saveFn = (io && io.save) || (() => {});
  let id;
  try { id = normalizeShip(loadFn()); } catch (e) { id = '09'; }
  function persist() { try { saveFn(id); } catch (e) { /* 保存失敗でも進行は続ける */ } }
  return {
    selected: () => id,
    isSelected: (nid) => normalizeShip(nid) === id,
    /** 乗り換え。同じ艇なら false（消費なし）。 */
    select(nid) {
      const n = normalizeShip(nid);
      if (n === id) return false;
      id = n; persist(); return true;
    },
  };
}

/**
 * 艇選択パネル（選択と決定を分ける）。基地の端末と同じ操作系：
 *   ↑↓ で選択（選択）、E／決定 で確定（決定）、Esc／× で閉じる。
 * deps: store=createShipStore の戻り / onSelect=(id, changed)=>{}
 */
export function createShipPanel(deps) {
  const store = deps.store;
  const onSelect = deps.onSelect || (() => {});
  let open = false;
  let cursor = 0;
  let lastResult = null;

  const clampCursor = () => { cursor = Math.max(0, Math.min(SHIP_ORDER.length - 1, cursor)); };
  const indexOf = id => Math.max(0, SHIP_ORDER.indexOf(normalizeShip(id)));

  function rows() {
    return SHIP_ORDER.map((id, index) => {
      const s = SHIPS[id];
      return { id, index, name: s.name, role: s.role, note: s.note, current: store.isSelected(id) };
    });
  }
  function currentRow() { return rows()[cursor]; }

  /** 決定。乗り換え（変更が無ければ changed=false、消費なし）。 */
  function activate() {
    const r = currentRow();
    if (!r) { lastResult = { ok: false, type: 'ship' }; return lastResult; }
    const changed = store.select(r.id);
    onSelect(r.id, changed);
    lastResult = { ok: true, type: 'ship', id: r.id, changed };
    return lastResult;
  }

  return {
    isOpen: () => open,
    open() { open = true; cursor = indexOf(store.selected()); lastResult = null; },
    close() { open = false; },
    cursor: () => cursor,
    rows,
    currentRow,
    move(delta) { if (!open) return; cursor += (delta < 0 ? -1 : 1); clampCursor(); },
    setCursor(i) { cursor = Math.max(0, Math.min(SHIP_ORDER.length - 1, Math.floor(Number(i) || 0))); },
    activate,
    lastResult: () => lastResult,
  };
}
