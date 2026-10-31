import { panels } from './panels.js';
import { isHostile } from '../sim/data.js';

export function keepEvent(e) { return !(e?.type === 'stealth' && /に気づいた$/.test(e.text || '')); }

// gear2b のイベント種別による選別と、既読イベントの WeakSet を使用する。
export function importantEvent(e, state) {
  if (!e || !keepEvent(e)) return false;
  const text = e.text || '';
  const allies = (state.actors || []).filter(a => a.faction === 'player' || (state.squadIds || []).includes(a.id));
  if (e.type === 'dead') return true;
  if (e.type === 'down') return allies.some(a => text.startsWith(a.name));
  if (['wipe', 'transfer', 'join', 'hostile', 'relation'].includes(e.type)) return true;
  if (e.type === 'law') return /見られた|気づかれた|泥棒|賞金|を盗んだ/.test(text);
  if (e.type === 'loot') return allies.some(a => text.startsWith(a.name)) && /盗んだ|奪った|手に入れ|拾った/.test(text);
  return false;
}

export function createEventLog(doc, now = () => Date.now()) {
  const make = (tag, cls, text) => { const e = doc.createElement(tag); e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const button = make('button', 'history-button', '履歴');
  button.type = 'button';
  const toastBox = make('div', 'event-toasts');
  toastBox.setAttribute('aria-live', 'polite');
  const sheet = make('div', 'event-history');
  sheet.hidden = true;
  const title = make('div', 'event-history-title', '履歴');
  const close = make('button', 'sheet-close', '×'); close.setAttribute('aria-label', '閉じる');
  close.type = 'button';
  title.appendChild(close);
  const lines = make('div', 'event-history-lines');
  sheet.appendChild(title); sheet.appendChild(lines);
  doc.body.appendChild(toastBox); doc.body.appendChild(sheet);
  panels.register('history', { parent: 'menu', contains: target => sheet.contains(target) || button.contains(target) || !!target.closest?.('.hud-menu-toggle'), close: () => { sheet.hidden = true; } });
  button.addEventListener('click', () => { panels.open('history'); sheet.hidden = false; });
  close.addEventListener('click', () => panels.close('history'));
  let seen = new WeakSet(), initialized = false, stateRef = null, active = [], signature = '', historySignature = '', fighting = false;
  function update(state) {
    if (state !== stateRef) { stateRef = state; seen = new WeakSet(); initialized = false; active = []; fighting = false; }
    const log = state.log || [];
    for (const e of log) {
      if (!e || typeof e !== 'object' || seen.has(e)) continue;
      seen.add(e);
      if (initialized && importantEvent(e, state)) active.push({ text: e.text, until: now() + 3000 });
    }
    const actors = state.actors || [];
    const squad = actors.filter(a => a.faction === 'player' || (state.squadIds || []).includes(a.id));
    const inCombat = squad.some(a => a.state === 'fight' && actors.some(b => b.id === a.targetId && isHostile(state, a.faction, b.faction))) || actors.some(a => a.state === 'fight' && squad.some(b => b.id === a.targetId && isHostile(state, a.faction, b.faction)));
    if (initialized && inCombat && !fighting) active.push({ text: '部隊の戦闘が始まった', until: now() + 3000 });
    fighting = inCombat;
    initialized = true;
    active = active.filter(e => e.until > now()).slice(-2);
    const next = active.map(e => e.text + ':' + e.until).join('|');
    if (next !== signature) { signature = next; toastBox.replaceChildren(...active.map(e => make('div', 'event-toast', e.text))); }
    const nextHistory = log.map(e => (e?.tick ?? '') + ':' + (e?.text ?? '')).join('|');
    if (nextHistory !== historySignature) {
      historySignature = nextHistory;
      lines.replaceChildren(...log.slice().reverse().map(e => make('div', 'event-history-line', e.text)));
    }
  }
  return { button, update, toasts: () => active.filter(e => e.until > now()).map(e => e.text), history: () => (stateRef?.log || []).slice().reverse().map(e => e.text) };
}
