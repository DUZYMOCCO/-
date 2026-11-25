/**
 * ABYSS DIVE — 船内インターミッション用の目的別統合パネル（純粋ロジック / DOM 非依存）
 *
 * 既存の weaponPanel（魚雷・ミサイル）・forgePanel（追加兵装・近接・指定開発）・upgradePanel（船体整備）を
 * そのまま内部エンジンとして使い、UI 上の責務を 3 つへ明確に分離する:
 *   1. 倉庫・換装（createWarehousePanel）: 所持武器の一覧確認・装備（換装）・売却だけ。製作/開発を混ぜない。
 *   2. 強化・整備（createEnhanceHubPanel）: 「船体・修理」と「武器強化」の 2 タブで強化に特化。
 *   3. 開発・製作（createDevelopPanel）  : 新規武器のランダム製作と特性指定開発だけ。倉庫一覧を混ぜない。
 */

function clampIdx(i, len) {
  if (len <= 0) return 0;
  return Math.max(0, Math.min(len - 1, Math.floor(Number(i) || 0)));
}

/** forgePanel の武器一覧を安全に読む（設計画面中なら戻さず空扱い）。 */
function safeForgeWeaponRows(forgePanel) {
  if (!forgePanel) return [];
  if (forgePanel.screen && forgePanel.screen() === 'design') return [];
  return forgePanel.rows ? forgePanel.rows() : [];
}

/**
 * 1. 倉庫・換装パネル（所持武器の確認・装備・売却専用）
 */
export function createWarehousePanel({ weaponPanel, forgePanel }) {
  const TABS = Object.freeze([
    { id: 'all',   label: 'すべて' },
    { id: 'basic', label: '魚雷・ミサイル' },
    { id: 'adv',   label: 'レーザー・反射' },
    { id: 'melee', label: '近接' },
  ]);

  let open = false;
  let tab = 'all';
  let cursor = 0;
  let msg = '';
  let lastResult = null;

  function collectRows() {
    const out = [];
    if (weaponPanel && (tab === 'all' || tab === 'basic')) {
      const wRows = weaponPanel.rows();
      for (let i = 0; i < wRows.length; i++) {
        const r = wRows[i];
        if (r.kind !== 'item') continue;
        out.push({
          ...r,
          source: 'weapon',
          rawIndex: i,
          category: 'basic',
        });
      }
    }
    if (forgePanel && (tab === 'all' || tab === 'adv' || tab === 'melee')) {
      const fRows = safeForgeWeaponRows(forgePanel);
      for (let i = 0; i < fRows.length; i++) {
        const r = fRows[i];
        const isAdv = ((r.kind === 'shot' && r.typeId !== 'torpedo') || r.kind === 'item');
        const isMelee = (r.kind === 'melee');
        if (!isAdv && !isMelee) continue;
        if (tab === 'adv' && !isAdv) continue;
        if (tab === 'melee' && !isMelee) continue;
        out.push({
          ...r,
          source: 'forge',
          rawIndex: i,
          category: isMelee ? 'melee' : 'adv',
        });
      }
    }
    return out;
  }

  function currentRow() {
    const list = collectRows();
    if (!list.length) return null;
    cursor = clampIdx(cursor, list.length);
    return list[cursor];
  }

  function syncUnderlying(r) {
    if (!r) return null;
    if (r.source === 'weapon' && weaponPanel) {
      if (!weaponPanel.isOpen()) weaponPanel.open();
      if (weaponPanel.cursor() !== r.rawIndex) weaponPanel.setCursor(r.rawIndex);
      return weaponPanel;
    }
    if (r.source === 'forge' && forgePanel) {
      if (!forgePanel.isOpen()) forgePanel.open();
      if (forgePanel.cursor() !== r.rawIndex) forgePanel.setCursor(r.rawIndex);
      return forgePanel;
    }
    return null;
  }

  return {
    TABS,
    isOpen: () => open,
    open() {
      open = true;
      cursor = 0;
      msg = '';
      lastResult = null;
      if (weaponPanel && !weaponPanel.isOpen()) weaponPanel.open();
      if (forgePanel) {
        if (forgePanel.screen && forgePanel.screen() === 'design' && forgePanel.back) forgePanel.back();
        if (!forgePanel.isOpen()) forgePanel.open();
      }
    },
    close() {
      open = false;
      if (weaponPanel) weaponPanel.close();
      if (forgePanel) forgePanel.close();
    },
    tab: () => tab,
    setTab(id) {
      if (!TABS.some(t => t.id === id)) return;
      tab = id;
      cursor = 0;
      msg = '';
    },
    rows: collectRows,
    rowCount: () => collectRows().length,
    cursor: () => clampIdx(cursor, collectRows().length),
    currentRow,
    move(delta) {
      const n = collectRows().length;
      if (n <= 0) return;
      cursor = clampIdx(cursor + (delta < 0 ? -1 : 1), n);
    },
    setCursor(i) {
      cursor = clampIdx(i, collectRows().length);
    },
    activate() {
      const r = currentRow();
      const p = syncUnderlying(r);
      if (!p || !p.activate) return { ok: false };
      lastResult = p.activate();
      // 魚雷を装備したとき、追加兵装（レーザー等）が主兵装になっていれば魚雷枠へ戻す
      if (r.source === 'weapon' && r.type === 'torpedo' && forgePanel) {
        const fRows = safeForgeWeaponRows(forgePanel);
        const torpIdx = fRows.findIndex(fr => fr.kind === 'shot' && fr.typeId === 'torpedo' && !fr.equipped);
        if (torpIdx >= 0) {
          if (!forgePanel.isOpen()) forgePanel.open();
          forgePanel.setCursor(torpIdx);
          forgePanel.activate();
        }
      }
      msg = p.message ? p.message() : '';
      return lastResult;
    },
    sell() {
      const r = currentRow();
      const p = syncUnderlying(r);
      if (!p || !p.sell) return { ok: false };
      lastResult = p.sell();
      msg = p.message ? p.message() : '';
      cursor = clampIdx(cursor, collectRows().length);
      return lastResult;
    },
    sellPreview() {
      const r = currentRow();
      const p = syncUnderlying(r);
      return (p && p.sellPreview) ? p.sellPreview() : null;
    },
    compare() {
      const r = currentRow();
      if (!r || r.source !== 'weapon' || !weaponPanel || !weaponPanel.compare) return null;
      syncUnderlying(r);
      return weaponPanel.compare();
    },
    message: () => msg,
    lastResult: () => lastResult,
  };
}

/**
 * 2. 強化・整備パネル（タブで「船体・修理」と「武器強化」を分離）
 */
export function createEnhanceHubPanel({ upgradePanel, weaponPanel, forgePanel }) {
  const TABS = Object.freeze([
    { id: 'ship',   label: '船体・修理' },
    { id: 'weapon', label: '武器強化' },
  ]);

  let open = false;
  let tab = 'ship';
  let cursor = 0;
  let msg = '';
  let lastResult = null;

  function collectWeaponEnhanceRows() {
    const out = [];
    if (weaponPanel) {
      const wRows = weaponPanel.rows();
      for (let i = 0; i < wRows.length; i++) {
        const r = wRows[i];
        if (r.kind !== 'item' || r.initial) continue;
        out.push({
          ...r,
          source: 'weapon',
          rawIndex: i,
        });
      }
    }
    if (forgePanel) {
      const fRows = safeForgeWeaponRows(forgePanel);
      for (let i = 0; i < fRows.length; i++) {
        const r = fRows[i];
        const eligibleItem = (r.kind === 'item');
        const eligibleMelee = (r.kind === 'melee' && r.unlocked);
        if (!eligibleItem && !eligibleMelee) continue;
        out.push({
          ...r,
          source: 'forge',
          rawIndex: i,
        });
      }
    }
    return out;
  }

  function rows() {
    if (tab === 'ship') return upgradePanel ? upgradePanel.rows() : [];
    return collectWeaponEnhanceRows();
  }

  function currentRow() {
    const list = rows();
    if (!list.length) return null;
    cursor = clampIdx(cursor, list.length);
    return list[cursor];
  }

  function syncWeaponSource(r) {
    if (!r) return null;
    if (r.source === 'weapon' && weaponPanel) {
      if (!weaponPanel.isOpen()) weaponPanel.open();
      weaponPanel.setCursor(r.rawIndex);
      return weaponPanel;
    }
    if (r.source === 'forge' && forgePanel) {
      if (!forgePanel.isOpen()) forgePanel.open();
      forgePanel.setCursor(r.rawIndex);
      return forgePanel;
    }
    return null;
  }

  return {
    TABS,
    isOpen: () => open,
    open() {
      open = true;
      cursor = 0;
      msg = '';
      lastResult = null;
      if (upgradePanel) upgradePanel.open();
      if (weaponPanel && !weaponPanel.isOpen()) weaponPanel.open();
      if (forgePanel) {
        if (forgePanel.screen && forgePanel.screen() === 'design' && forgePanel.back) forgePanel.back();
        if (!forgePanel.isOpen()) forgePanel.open();
      }
    },
    close() {
      open = false;
      if (upgradePanel) upgradePanel.close();
      if (weaponPanel) weaponPanel.close();
      if (forgePanel) forgePanel.close();
    },
    tab: () => tab,
    setTab(id) {
      if (!TABS.some(t => t.id === id)) return;
      tab = id;
      cursor = 0;
      msg = '';
    },
    rows,
    rowCount: () => rows().length,
    cursor: () => (tab === 'ship' && upgradePanel) ? upgradePanel.cursor() : clampIdx(cursor, rows().length),
    currentRow,
    move(delta) {
      if (tab === 'ship' && upgradePanel) { upgradePanel.move(delta); return; }
      const n = rows().length;
      if (n <= 0) return;
      cursor = clampIdx(cursor + (delta < 0 ? -1 : 1), n);
    },
    setCursor(i) {
      if (tab === 'ship' && upgradePanel) { upgradePanel.setCursor(i); return; }
      cursor = clampIdx(i, rows().length);
    },
    activate() {
      if (tab === 'ship' && upgradePanel) {
        lastResult = upgradePanel.activate();
        msg = upgradePanel.message ? upgradePanel.message() : '';
        return lastResult;
      }
      const r = currentRow();
      const p = syncWeaponSource(r);
      if (!p || !p.enhance) return { ok: false };
      lastResult = p.enhance();
      msg = p.message ? p.message() : '';
      return lastResult;
    },
    message: () => (tab === 'ship' && upgradePanel && upgradePanel.message) ? upgradePanel.message() : msg,
    lastResult: () => lastResult,
  };
}

/**
 * 3. 開発・製作パネル（ランダム製作＋特性指定開発専用。倉庫一覧は混ぜない）
 */
export function createDevelopPanel({ weaponPanel, forgePanel }) {
  let open = false;
  let cursor = 0;
  let msg = '';
  let lastResult = null;

  function inDesign() {
    return !!(forgePanel && forgePanel.screen && forgePanel.screen() === 'design');
  }

  function collectListRows() {
    const out = [];
    if (weaponPanel) {
      const wRows = weaponPanel.rows();
      for (let i = 0; i < wRows.length; i++) {
        const r = wRows[i];
        if (r.kind !== 'make') continue;
        out.push({
          ...r,
          source: 'weapon',
          rawIndex: i,
        });
      }
    }
    if (forgePanel) {
      const fRows = safeForgeWeaponRows(forgePanel);
      for (let i = 0; i < fRows.length; i++) {
        const r = fRows[i];
        if (r.kind !== 'design') continue;
        out.push({
          ...r,
          source: 'forge',
          rawIndex: i,
        });
      }
    }
    return out;
  }

  function rows() {
    if (inDesign()) return forgePanel.rows();
    return collectListRows();
  }

  function currentRow() {
    if (inDesign()) return forgePanel.currentRow();
    const list = collectListRows();
    if (!list.length) return null;
    cursor = clampIdx(cursor, list.length);
    return list[cursor];
  }

  return {
    isOpen: () => open,
    screen: () => inDesign() ? 'design' : 'list',
    designType: () => (forgePanel && forgePanel.designType) ? forgePanel.designType() : null,
    open() {
      open = true;
      cursor = 0;
      msg = '';
      lastResult = null;
      if (weaponPanel && !weaponPanel.isOpen()) weaponPanel.open();
      if (forgePanel) {
        if (forgePanel.screen && forgePanel.screen() === 'design' && forgePanel.back) forgePanel.back();
        if (!forgePanel.isOpen()) forgePanel.open();
      }
    },
    close() {
      open = false;
      if (forgePanel && forgePanel.screen && forgePanel.screen() === 'design' && forgePanel.back) forgePanel.back();
      if (weaponPanel) weaponPanel.close();
      if (forgePanel) forgePanel.close();
    },
    back() {
      if (inDesign() && forgePanel.back) {
        forgePanel.back();
        msg = '';
      } else {
        this.close();
      }
    },
    rows,
    rowCount: () => rows().length,
    cursor: () => inDesign() ? forgePanel.cursor() : clampIdx(cursor, collectListRows().length),
    currentRow,
    move(delta) {
      if (inDesign()) { forgePanel.move(delta); return; }
      const n = collectListRows().length;
      if (n <= 0) return;
      cursor = clampIdx(cursor + (delta < 0 ? -1 : 1), n);
    },
    setCursor(i) {
      if (inDesign()) { forgePanel.setCursor(i); return; }
      cursor = clampIdx(i, collectListRows().length);
    },
    adjust(delta) {
      if (inDesign() && forgePanel.adjust) return forgePanel.adjust(delta);
      return false;
    },
    activate() {
      if (inDesign()) {
        lastResult = forgePanel.activate();
        msg = forgePanel.message ? forgePanel.message() : '';
        return lastResult;
      }
      const r = currentRow();
      if (!r) return { ok: false };
      if (r.source === 'weapon' && weaponPanel) {
        if (!weaponPanel.isOpen()) weaponPanel.open();
        weaponPanel.setCursor(r.rawIndex);
        lastResult = weaponPanel.activate();
        msg = weaponPanel.message ? weaponPanel.message() : '';
        return lastResult;
      }
      if (r.source === 'forge' && forgePanel) {
        if (!forgePanel.isOpen()) forgePanel.open();
        forgePanel.setCursor(r.rawIndex);
        lastResult = forgePanel.activate();
        msg = forgePanel.message ? forgePanel.message() : '';
        return lastResult;
      }
      return { ok: false };
    },
    message: () => (inDesign() && forgePanel.message) ? forgePanel.message() : msg,
    lastResult: () => lastResult,
  };
}
