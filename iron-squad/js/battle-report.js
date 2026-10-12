// 戦闘報告書: only the events worth reading later (boss kills, growth, rare finds, deaths, rescues).
// Most entries are picked from the battle log by strict patterns; boss kills and level-ups are
// added directly. Saved with the game (newest REPORT_LIMIT entries).
export const REPORT_LIMIT = 300;
export const REPORT_KINDS = Object.freeze({
  boss: {label: 'ボス撃破', icon: '👑'},
  growth: {label: '成長', icon: '🌱'},
  rare: {label: 'レア取得', icon: '💎'},
  death: {label: '死亡', icon: '🕯️'},
  rescue: {label: '救出', icon: '🤝'}
});
const FILTERS = [['all', 'すべて'], ...Object.entries(REPORT_KINDS).map(([id, k]) => [id, `${k.icon} ${k.label}`])];

// Boss kills are recorded at the kill itself, so their toasts are not matched again here.
const LOG_RULES = [
  ['growth', /【昇進】|天命覚醒|覚醒昇格|死線生還/],
  ['rare', /ボス戦利品獲得|神鍛|（異質）|神話秘宝|ボス秘宝獲得|覚醒宝珠 \+|神話宝玉 \+/],
  ['death', /は力尽きました/],
  ['rescue', /送り届けた|捕虜.*救助|救出成功|のお礼 ·/]
];

/** Report kind for a battle-log line, or null when it is not worth keeping. */
export function reportKindOf(text, options = null) {
  const line = String(text || '');
  for (const [kind, rule] of LOG_RULES) {
    if (!rule.test(line)) continue;
    // Merchant and gate-guard casualties are logged off the field; they are not our dead.
    if (kind === 'death' && options?.field === false) return null;
    return kind;
  }
  return null;
}

export const normalizeBattleReport = saved => Array.isArray(saved)
  ? saved.filter(e => e && REPORT_KINDS[e.kind] && e.text).slice(-REPORT_LIMIT).map(e => ({
    id: Number(e.id) || 0, kind: e.kind, phase: Number(e.phase) || 1, seconds: Math.max(0, Number(e.seconds) || 0), text: String(e.text)
  }))
  : [];

export function addBattleReport(game, kind, text) {
  if (!game || !REPORT_KINDS[kind] || !text) return null;
  const list = game.battleReport ||= [];
  const entry = {
    id: (list.at(-1)?.id || 0) + 1, kind,
    phase: game.phase || game.wave || 1, seconds: Math.max(0, Math.floor(game.totalBattleTime || 0)), text: String(text)
  };
  list.push(entry);
  if (list.length > REPORT_LIMIT) list.splice(0, list.length - REPORT_LIMIT);
  if (game.container?.querySelector?.('#view-strat-report:not(.hidden)')) renderBattleReport(game);
  return entry;
}

/** Called for every battle-log line. */
export function noteBattleReport(game, text, options) {
  const kind = reportKindOf(text, options);
  return kind ? addBattleReport(game, kind, String(text).replace(/^[\s\p{Extended_Pictographic}️]+/u, '')) : null;
}

export function renderBattleReport(game) {
  const host = game?.container?.querySelector?.('#view-strat-report');
  if (!host || typeof document?.createElement !== 'function') return;
  const active = REPORT_KINDS[game._battleReportFilter] ? game._battleReportFilter : 'all';
  const all = game.battleReport || [];
  const filters = document.createElement('div'); filters.className = 'report-filters'; filters.setAttribute('role', 'tablist');
  for (const [id, label] of FILTERS) {
    const count = id === 'all' ? all.length : all.filter(e => e.kind === id).length;
    const b = document.createElement('button'); b.type = 'button'; b.dataset.kind = id;
    b.className = `report-filter${id === active ? ' active' : ''}`; b.textContent = `${label} ${count}`;
    b.setAttribute('aria-pressed', String(id === active));
    b.onclick = () => { game._battleReportFilter = id; renderBattleReport(game); };
    filters.append(b);
  }
  const oldFilters = host.querySelector('.report-filters'), scroll = oldFilters?.scrollLeft || 0;
  const list = document.createElement('ol'); list.className = 'report-list';
  const shown = (active === 'all' ? all : all.filter(e => e.kind === active)).slice().reverse();
  for (const e of shown) {
    const k = REPORT_KINDS[e.kind], row = document.createElement('li'); row.className = `report-entry report-${e.kind}`;
    const head = document.createElement('div'); head.className = 'report-head';
    const badge = document.createElement('span'); badge.className = 'report-badge'; badge.textContent = `${k.icon} ${k.label}`;
    const when = document.createElement('small'); when.textContent = `第${e.phase}期 · ${Math.floor(e.seconds / 60)}:${String(e.seconds % 60).padStart(2, '0')}`;
    const text = document.createElement('p'); text.textContent = e.text;
    head.append(badge, when); row.append(head, text); list.append(row);
  }
  if (!shown.length) {
    const empty = document.createElement('li'); empty.className = 'report-empty';
    empty.textContent = active === 'all' ? 'まだ報告はありません。ボスの撃破や成長、レアアイテムの取得、死亡、救出がここに記録されます。' : `まだ「${REPORT_KINDS[active].label}」の報告はありません。`;
    list.append(empty);
  }
  const intro = document.createElement('p'); intro.className = 'report-intro';
  intro.textContent = `重要な出来事だけを新しい順に記録します（最新${REPORT_LIMIT}件）。`;
  host.replaceChildren(intro, filters, list);
  filters.scrollLeft = scroll;
}
