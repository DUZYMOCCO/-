export const BATTLE_LOG_LIMIT = 100;

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
  if (/倒れた|ダウン|搬送|救助|蘇生|治療|回復|救援|強襲|危険|🚨|重傷/.test(text)) return 'rescue';
  return 'other';
}

export function resetBattleLog(game) {
  clearTimeout(game._battleLogTimer); game._battleLogTimer = null;
  game.battleLogHistory = []; game._battleLogSequence = 0;
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

export function recordBattleLog(game, message) {
  if (!message) return;
  const text = String(message);
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

  const stream = document.getElementById('battle-log-stream');
  if (stream) {
    const line = document.createElement('div');
    line.className = 'battle-log-msg';
    line.textContent = text;
    if (/🚨|危険|倒れた/.test(text)) line.classList.add('boss-alert');
    else if (/獲得|ドロップ|秘宝|横取り/.test(text)) line.classList.add('item-alert');
    else if (/レベルアップ|昇進|覚醒/.test(text)) line.classList.add('levelup-alert');
    stream.replaceChildren(line);
    clearTimeout(game._battleLogTimer);
    game._battleLogTimer = setTimeout(() => {
      if (line.parentNode === stream) {
        line.style.opacity = '0';
        line.style.transform = 'translateY(6px)';
      }
    }, 3000);
  }

  if (typeof document?.querySelector === 'function') {
    const ticker = document.querySelector('#strat-log-ticker .strat-ticker-msg');
    if (ticker) ticker.textContent = text;
  }
  const banner = document.getElementById('drop-banner');
  if (banner) banner.textContent = text;
}
