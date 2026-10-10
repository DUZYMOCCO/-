/**
 * 動作ログ（止まった記録）。フレーム間隔が 1000ms 以上空いたときだけ記録を作る。
 * 毎フレームの処理は数値の比較と代入のみ（配列・オブジェクトを作らない）。
 * 画面が隠れていた間・ゲームが停止していた間の間隔は記録しない。
 */
import { storage } from '../../storage.js';

export const GAME_VERSION = '4.2.22';
export const STALL_MS = 1000;
export const HITCH_MS = 300;
export const MAX_RECORDS = 30;
export const STORAGE_KEY = 'iron_squad_stall_log';
const ACTION_SLOTS = 5;
const ACTIVITY_WINDOW_MS = 1500;

const cut = (value, lines = 3) => String(value ?? '').split('\n').slice(0, lines).join(' | ').slice(0, 300);

export function createStallRecorder(options = {}) {
  const now = options.now || (() => performance.now());
  const store = options.storage === undefined ? storage : options.storage;
  const getContext = options.getContext || (() => ({}));
  const limit = options.limit || MAX_RECORDS;
  const clock = options.clock || (() => new Date().toISOString());

  let prev = 0;            // previous rAF timestamp (0 = none yet)
  let epoch = 0;           // bumped whenever the page is hidden/shown or the loop restarts
  let prevEpoch = -1;
  let hitches = 0;
  let genMarkT = 0, genMark = 0;
  let activity = '', activityAt = -1e9;
  const actionType = new Array(ACTION_SLOTS).fill(''), actionAt = new Array(ACTION_SLOTS).fill(0);
  let actionHead = 0, actionCount = 0;
  let records = [];
  const listeners = new Set();

  try {
    const saved = store?.get?.(STORAGE_KEY, []);
    if (Array.isArray(saved)) records = saved.slice(-limit);
  } catch (_) { records = []; }

  const persist = () => {
    try { store?.set?.(STORAGE_KEY, records); } catch (_) { /* storage must never break the game */ }
  };
  const push = (record) => {
    records.push(record);
    if (records.length > limit) records.splice(0, records.length - limit);
    persist();
    for (const fn of listeners) { try { fn(record); } catch (_) { /* ignore */ } }
  };
  const lastActions = (t) => {
    const out = [];
    for (let i = 0; i < actionCount; i++) {
      const slot = (actionHead - 1 - i + ACTION_SLOTS * 2) % ACTION_SLOTS;
      out.push({ type: actionType[slot], msBefore: Math.round(t - actionAt[slot]) });
    }
    return out;
  };

  const api = {
    /** Page hidden/shown, loop started/stopped, game paused: forget the previous frame. */
    reset() { epoch++; prev = 0; },
    /** User input (type string). Ring of 5; no allocation. */
    action(type, t = now()) {
      actionType[actionHead] = type; actionAt[actionHead] = t;
      actionHead = (actionHead + 1) % ACTION_SLOTS;
      if (actionCount < ACTION_SLOTS) actionCount++;
    },
    /** What the game just started doing (save, merchant open...). */
    mark(label, t = now()) { activity = label; activityAt = t; },
    /** Call once per animation frame with the rAF timestamp. Returns a record when a stall is detected. */
    frame(t, generated = 0) {
      if (t - genMarkT >= 1000) { genMarkT = t; genMark = generated; }
      const had = prev, same = prevEpoch === epoch;
      prev = t; prevEpoch = epoch;
      if (!had || !same) return null;
      const gap = t - had;
      if (gap < HITCH_MS) return null;
      if (gap < STALL_MS) { hitches++; return null; }
      let ctx = {};
      try { ctx = getContext() || {}; } catch (_) { ctx = {}; }
      const record = {
        type: 'stall',
        time: clock(),
        gapMs: Math.round(gap),
        version: GAME_VERSION,
        ...ctx,
        terrain: { ...(ctx.terrain || {}), generatedLastSecond: generated - genMark },
        activity: t - activityAt <= gap + ACTIVITY_WINDOW_MS ? activity : '',
        lastActions: lastActions(had),
        hitches300to1000: hitches,
      };
      try { const m = globalThis.performance?.memory; if (m) record.memory = { usedMB: Math.round(m.usedJSHeapSize / 1048576), totalMB: Math.round(m.totalJSHeapSize / 1048576) }; } catch (_) { /* optional */ }
      push(record);
      return record;
    },
    /** Uncaught error / unhandled rejection. */
    error(kind, error) {
      const record = {
        type: 'error',
        time: clock(),
        kind,
        message: cut(error?.message ?? error, 1),
        stack: cut(error?.stack, 4),
        version: GAME_VERSION,
        activity,
      };
      push(record);
      return record;
    },
    records() { return records.slice(); },
    clear() { records = []; hitches = 0; persist(); for (const fn of listeners) { try { fn(null); } catch (_) { /* ignore */ } } },
    json() { return JSON.stringify(records, null, 1); },
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    get hitches() { return hitches; },
    /** Attach page listeners. Returns a detach function. */
    attach(win = globalThis.window, doc = globalThis.document) {
      if (!win || !doc) return () => {};
      const hide = () => api.reset();
      const onVis = () => api.reset();
      const onErr = (e) => api.error('error', e?.error || { message: e?.message });
      const onRej = (e) => api.error('unhandledrejection', e?.reason);
      doc.addEventListener('visibilitychange', onVis);
      win.addEventListener('pagehide', hide);
      win.addEventListener('pageshow', hide);
      win.addEventListener('error', onErr);
      win.addEventListener('unhandledrejection', onRej);
      return () => {
        doc.removeEventListener('visibilitychange', onVis);
        win.removeEventListener('pagehide', hide);
        win.removeEventListener('pageshow', hide);
        win.removeEventListener('error', onErr);
        win.removeEventListener('unhandledrejection', onRej);
      };
    },
  };
  return api;
}

/* ---------- 表示 ---------- */
const fmtTime = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso || '');
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};
const ACTION_NAMES = { joystick: '移動パッド', menu: 'メニュー', tap: 'ボタン' };

/** One readable Japanese line (array of strings) for a record. */
export function describeRecord(r) {
  if (r.type === 'error') return [`${fmtTime(r.time)} エラー（${r.kind || ''}）`, r.message || '', r.stack || ''].filter(Boolean);
  const where = [r.biome, r.route, r.nearPlace].filter(Boolean).join(' / ') || '場所不明';
  const lines = [`${fmtTime(r.time)} ${(r.gapMs / 1000).toFixed(1)}秒 止まった`];
  lines.push(`場所：${where}${r.player ? `（${r.player.x},${r.player.y}）` : ''}`);
  const doing = [];
  if (r.activity) doing.push(r.activity);
  if (r.modal) doing.push(`画面：${r.modal}`);
  if (r.terrain?.generatedLastSecond) doing.push(`地形生成 ${r.terrain.generatedLastSecond}/秒`);
  if (r.kanaGrade) doing.push(`ひらがな${r.kanaGrade}`);
  lines.push(`状況：${doing.join('、') || '特になし'}｜敵${r.enemies ?? '?'} 味方${r.allies ?? '?'}`);
  if (r.lastActions?.length) lines.push('操作：' + r.lastActions.map((a) => `${ACTION_NAMES[a.type] || a.type}(${a.msBefore}ms前)`).join(' '));
  if (r.hitches300to1000) lines.push(`ひっかかり(0.3〜1秒)：${r.hitches300to1000}回`);
  return lines;
}

/** Collapsible section for the 戦況 window. */
export function mountStallLog(host, recorder, doc = globalThis.document) {
  if (!host || !recorder || !doc || host.querySelector?.('#stall-log-fold')) return null;
  const fold = doc.createElement('details'); fold.id = 'stall-log-fold'; fold.className = 'command-fold';
  const summary = doc.createElement('summary'); summary.textContent = '動作ログ（止まった記録）';
  const body = doc.createElement('div'); body.className = 'fold-content stall-log-body';
  const note = doc.createElement('p'); note.className = 'reinforcement-summary';
  note.textContent = 'ゲームが1秒以上止まったときの記録です。止まったら「コピー」を押して、開発者に送ってください。';
  const actions = doc.createElement('div'); actions.className = 'stall-log-actions';
  const copy = doc.createElement('button'); copy.type = 'button'; copy.id = 'btn-stall-copy'; copy.textContent = 'コピー';
  const clear = doc.createElement('button'); clear.type = 'button'; clear.id = 'btn-stall-clear'; clear.textContent = '消す';
  const status = doc.createElement('span'); status.className = 'stall-log-status'; status.setAttribute('aria-live', 'polite');
  actions.append(copy, clear, status);
  const list = doc.createElement('ol'); list.className = 'stall-log-list';
  const area = doc.createElement('textarea'); area.className = 'stall-log-json hidden'; area.readOnly = true; area.rows = 6;
  body.append(note, actions, list, area); fold.append(summary, body); host.append(fold);

  const render = () => {
    list.textContent = '';
    const rows = recorder.records().reverse();
    if (!rows.length) { const li = doc.createElement('li'); li.textContent = 'まだ止まった記録はありません。'; list.append(li); return; }
    for (const r of rows) {
      const li = doc.createElement('li'); li.className = 'stall-log-item';
      describeRecord(r).forEach((text, i) => { const el = doc.createElement(i === 0 ? 'strong' : 'div'); el.textContent = text; li.append(el); });
      list.append(li);
    }
  };
  copy.addEventListener('click', async () => {
    const text = recorder.json();
    try {
      await globalThis.navigator.clipboard.writeText(text);
      status.textContent = 'コピーしました';
    } catch (_) {
      area.value = text; area.classList.remove('hidden'); area.focus(); area.select();
      try { doc.execCommand?.('copy'); } catch (__) { /* manual copy */ }
      status.textContent = '下の枠を長押ししてコピーしてください';
    }
  });
  clear.addEventListener('click', () => { recorder.clear(); area.classList.add('hidden'); status.textContent = '消しました'; render(); });
  fold.addEventListener('toggle', () => { if (fold.open) render(); });
  recorder.onChange(() => { if (fold.open) render(); });
  render();
  return fold;
}
