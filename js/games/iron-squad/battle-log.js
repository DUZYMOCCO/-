import { AMMO_CAPACITY, isRangedUnit } from './supply-rules.js?v=146';

export const BATTLE_LOG_LIMIT = 100;
const FIELD_HALF = 0.5;

export const LOG_CATEGORIES = [
  { id: 'growth', label: '🌱 成長・覚醒', icon: '🌱' },
  { id: 'combat', label: '⚔️ 討伐・武勲', icon: '⚔️' },
  { id: 'loot',   label: '💎 獲得・物資', icon: '💎' },
  { id: 'rescue', label: '🩹 救護・戦況', icon: '🩹' },
  { id: 'all',    label: '📜 すべて',     icon: '📜' }
];

export function categorizeLogMessage(text) {
  if (!text) return 'other';
  if (/レベルアップ|Lv\.|昇進|昇格|覚醒|死線|マスター|習得|才能|成長|開花/.test(text)) return 'growth';
  if (/撃破|討伐|ボス|制圧|撃退|会心|大物|勝利|討ち取/.test(text)) return 'combat';
  if (/獲得|ドロップ|秘宝|宝珠|宝玉|入手|購入|支給|配備|鍛錬/.test(text)) return 'loot';
  if (/倒れた|ダウン|搬送|救助|加入|蘇生|治療|回復|救援|強襲|危険|🚨|重傷/.test(text)) return 'rescue';
  return 'other';
}

export function resetBattleLog(game) {
  clearTimeout(game._battleLogTimer); game._battleLogTimer = null;
  game.battleLogHistory = []; game._battleLogSequence = 0;
  game._fieldNotesPrimed = false;
  if (typeof document?.getElementById === 'function') {
    const stream = document.getElementById('battle-log-stream');
    if (stream) {
      if (typeof stream.replaceChildren === 'function') stream.replaceChildren(); else stream.textContent = '';
      stream.closest?.('.battle-log-window')?.classList?.remove?.('has-field-note');
    }
  }
  if (typeof document?.querySelector === 'function') {
    const ticker = document.querySelector('#strat-log-ticker .strat-ticker-msg');
    if (ticker) ticker.textContent = 'まだ記録はありません。';
  }
}

export function renderBattleLog(game, requestedCategory = null) {
  const container = game?.container || document;
  const list = container.querySelector?.('#battle-log-history');
  if (!list) return;

  if (requestedCategory) {
    game._battleLogCategory = requestedCategory;
  } else if (!game._battleLogCategory) {
    // 初期表示は全件（100件）。タブタップで「成長・覚醒」や「討伐」などに瞬時に絞り込み！
    game._battleLogCategory = 'all';
  }

  const activeCategory = game._battleLogCategory;

  // フィルタータブの描画 / 更新
  let filterBar = list.parentElement?.querySelector?.('.battle-log-categories');
  if (!filterBar && list.parentElement && typeof document?.createElement === 'function') {
    filterBar = document.createElement('div');
    filterBar.className = 'battle-log-categories';
    list.before(filterBar);
  }

  if (filterBar) {
    filterBar.replaceChildren();
    for (const cat of LOG_CATEGORIES) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `log-cat-btn${cat.id === activeCategory ? ' active' : ''}`;
      btn.dataset.category = cat.id;
      btn.textContent = cat.label;
      btn.onclick = () => renderBattleLog(game, cat.id);
      filterBar.append(btn);
    }
  }

  const bottom = list.scrollHeight - list.scrollTop - list.clientHeight < 24;
  list.replaceChildren();

  const history = game.battleLogHistory || [];
  const filtered = activeCategory === 'all'
    ? history
    : history.filter(e => e.category === activeCategory);

  for (const entry of filtered) {
    const row = document.createElement('li');
    row.className = `log-entry log-entry-${entry.category || 'other'}`;
    const stamp = document.createElement('small');
    stamp.textContent = `第${entry.phase}期 · ${Math.floor(entry.seconds / 60)}:${String(entry.seconds % 60).padStart(2, '0')}`;
    
    const catBadge = document.createElement('span');
    catBadge.className = `log-badge log-badge-${entry.category}`;
    catBadge.textContent = entry.category === 'growth' ? '🌱成長'
      : entry.category === 'combat' ? '⚔️討伐'
      : entry.category === 'loot' ? '💎獲得'
      : entry.category === 'rescue' ? '🩹戦況' : '📜';

    const text = document.createElement('span');
    text.className = 'log-text';
    text.textContent = entry.text;

    row.append(stamp, catBadge, text);
    list.append(row);
  }

  if (!list.children.length) {
    const row = document.createElement('li');
    row.className = 'log-empty';
    row.textContent = activeCategory === 'growth'
      ? 'まだ兵士の成長・覚醒の記録はありません。戦闘で経験を積み、レベルアップや死線覚醒を遂げるとここに刻まれます！'
      : 'まだこのカテゴリの記録はありません。';
    list.append(row);
  }

  if (bottom) list.scrollTop = list.scrollHeight;
}

// 画面上の一行だけを絞る。履歴と司令部のティッカーは従来どおり残す。
export function showsOnFieldLog(text, options) {
  if (options?.field === false) return false;
  if (options?.field === true) return true;
  const line = String(text || '');
  if (/横取り|戦利品|秘宝|宝珠|宝玉|国庫買取|ドロップ/.test(line)) return true;
  if (/半分以下/.test(line) && /HP|MP|残り弾薬/.test(line)) return true;
  if (/死亡まで残り/.test(line)) return true;
  if (/力尽きました/.test(line)) return true;
  return false;
}

function showFieldLine(game, text) {
  const stream = document.getElementById('battle-log-stream');
  if (!stream) return;
  const line = document.createElement('div');
  line.className = 'battle-log-msg';
  line.textContent = text;
  if (/死亡まで残り|力尽きました/.test(text)) line.classList.add('boss-alert');
  else if (/獲得|ドロップ|秘宝|宝珠|宝玉|国庫買取|横取り/.test(text)) line.classList.add('item-alert');
  if (typeof stream.replaceChildren === 'function') {
    stream.replaceChildren(line);
  } else {
    stream.textContent = '';
    stream.append?.(line);
  }
  const windowEl = stream.closest?.('.battle-log-window');
  if (windowEl) windowEl.classList.add('has-field-note');
  clearTimeout(game._battleLogTimer);
  game._battleLogTimer = setTimeout(() => {
    if (line.parentNode === stream) {
      line.style.opacity = '0';
      line.style.transform = 'translateY(6px)';
      windowEl?.classList.remove('has-field-note');
    }
  }, 3000);
}

export function recordBattleLog(game, message, options) {
  if (!message) return;
  const text = String(message);
  // 会心の一撃は頻発してログを埋め尽くすため記録しない
  if (/会心の一撃|会心！|クリティカル|会心ヒット/.test(text) && !/ボーナス|武勲|ボス/.test(text)) return;
  const history = game.battleLogHistory ||= [];
  const category = categorizeLogMessage(text);
  game._battleLogSequence = (game._battleLogSequence || 0) + 1;
  history.push({
    id: game._battleLogSequence,
    phase: game.phase || game.wave || 1,
    seconds: Math.max(0, Math.floor(game.totalBattleTime || 0)),
    text,
    category
  });
  if (history.length > BATTLE_LOG_LIMIT) history.splice(0, history.length - BATTLE_LOG_LIMIT);
  if (showsOnFieldLog(text, options)) showFieldLine(game, text);

  if (typeof document?.querySelector === 'function') {
    const ticker = document.querySelector('#strat-log-ticker .strat-ticker-msg');
    if (ticker) ticker.textContent = text;
  }
  const banner = document.getElementById('drop-banner');
  if (banner) banner.textContent = text;
}

function rememberHalf(game, unit, key, low, message) {
  const flag = `_fieldHalf_${key}`;
  if (low) {
    if (!unit[flag] && game._fieldNotesPrimed) game.showToast?.(message);
    unit[flag] = true;
  } else {
    unit[flag] = false;
  }
}

// 隊長と出撃中の味方だけ。半分を跨いだとき一度だけ。旗は _ 始まりなので保存しない。
export function refreshCombatFieldNotes(game) {
  if (!game?.player) return;
  const units = [game.player, ...(game.squad || [])];
  for (const unit of units) {
    if (!unit || unit.dead || unit.isDown || !(unit.hp > 0)) continue;
    const name = unit === game.player ? '隊長' : (unit.name || '兵士');
    const hp = Math.max(0, Math.floor(unit.hp));
    const maxHp = Math.max(1, Math.floor(unit.maxHp || 1));
    rememberHalf(game, unit, 'hp', hp <= maxHp * FIELD_HALF, `${name}のHPが半分以下 · 残り${hp}/${maxHp}`);
    const maxMana = Math.floor(unit.maxMana || 0);
    if (maxMana > 0) {
      const mana = Math.max(0, Math.floor(unit.mana || 0));
      rememberHalf(game, unit, 'mp', mana <= maxMana * FIELD_HALF, `${name}のMPが半分以下 · 残り${mana}/${maxMana}`);
    } else {
      unit._fieldHalf_mp = false;
    }
    if (isRangedUnit(game, unit)) {
      const ammo = unit.ammo == null || !Number.isFinite(Number(unit.ammo))
        ? AMMO_CAPACITY
        : Math.max(0, Math.min(AMMO_CAPACITY, Math.floor(Number(unit.ammo))));
      rememberHalf(game, unit, 'ammo', ammo <= AMMO_CAPACITY * FIELD_HALF, `${name}の残り弾薬が半分以下 · ${ammo}/${AMMO_CAPACITY}`);
    } else {
      unit._fieldHalf_ammo = false;
    }
  }
  game._fieldNotesPrimed = true;
}
