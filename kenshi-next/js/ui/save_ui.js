// セーブ枠の画面。localStorage の3枠と自動保存を扱う。

import {
  MAX_SAVE_BYTES,
  serialize,
  deserialize,
  formatClock,
} from '../sim/index.js';

export const SAVE_KEYS = ['sunahate_save_1', 'sunahate_save_2', 'sunahate_save_3'];
export const AUTO_KEY = 'sunahate_auto';

const AUTO_INTERVAL_MS = 5 * 60 * 1000;

function make(tag, text) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
}

function styleButton(button, primary) {
  button.type = 'button';
  button.style.minWidth = '46px';
  button.style.height = '30px';
  button.style.padding = '0 8px';
  button.style.border = '1px solid rgba(255, 255, 255, 0.26)';
  button.style.borderRadius = '8px';
  button.style.background = primary ? 'rgba(224, 184, 74, 0.32)' : 'rgba(18, 24, 32, 0.72)';
  button.style.color = '#f4efe6';
  button.style.font = '12px/1 system-ui, -apple-system, "Hiragino Sans", "Noto Sans JP", "Yu Gothic", sans-serif';
  button.style.cursor = 'pointer';
  button.style.pointerEvents = 'auto';
  return button;
}

function byteLength(text) {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(text).length;
  return text.length * 2;
}

function formatSavedAt(value) {
  const ms = Number(value);
  if (!Number.isFinite(ms) || ms <= 0) return '日時なし';
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return '日時なし';
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return mm + '/' + dd + ' ' + hh + ':' + mi;
}

export function createSaveUi(options) {
  const opts = options || {};
  const getState = typeof opts.getState === 'function' ? opts.getState : () => null;
  const setState = typeof opts.setState === 'function' ? opts.setState : () => {};

  const root = make('div');
  root.style.position = 'fixed';
  root.style.zIndex = '12';
  root.style.display = 'flex';
  root.style.flexDirection = 'column';
  root.style.alignItems = 'flex-end';
  root.style.gap = '6px';
  root.style.pointerEvents = 'none';
  root.style.font = '12px/1.35 system-ui, -apple-system, "Hiragino Sans", "Noto Sans JP", "Yu Gothic", sans-serif';
  root.style.color = '#f4efe6';
  root.style.textShadow = '0 1px 2px rgba(0, 0, 0, 0.85)';

  const toggle = styleButton(make('button', '記録'), false);
  toggle.style.minWidth = '54px';
  toggle.style.height = '34px';

  const panel = make('div');
  panel.style.display = 'none';
  panel.style.pointerEvents = 'auto';
  panel.style.background = 'rgba(10, 14, 20, 0.86)';
  panel.style.border = '1px solid rgba(255, 255, 255, 0.22)';
  panel.style.borderRadius = '10px';
  panel.style.padding = '8px';
  panel.style.minWidth = '244px';

  const hint = make('div', '');
  hint.style.pointerEvents = 'none';
  hint.style.fontSize = '11px';
  hint.style.opacity = '0.92';
  hint.style.whiteSpace = 'nowrap';
  hint.style.minHeight = '14px';

  root.appendChild(panel);
  root.appendChild(toggle);
  root.appendChild(hint);
  document.body.appendChild(root);

  let hintTimer = 0;

  function showHint(text, keep) {
    hint.textContent = text;
    if (hintTimer) window.clearTimeout(hintTimer);
    hintTimer = 0;
    if (!keep && text) {
      hintTimer = window.setTimeout(() => {
        hint.textContent = '';
        hintTimer = 0;
      }, 3600);
    }
  }

  function readSlot(key) {
    let raw = null;
    try {
      raw = window.localStorage.getItem(key);
    } catch (err) {
      return null;
    }
    if (!raw) return null;
    const state = deserialize(raw);
    if (!state) return { broken: true };
    let savedAt = 0;
    try {
      const parsed = JSON.parse(raw);
      if (Number.isFinite(parsed.savedAt)) savedAt = parsed.savedAt;
    } catch (err) {
      savedAt = 0;
    }
    return { state, savedAt };
  }

  function writeSlot(key, quiet) {
    const state = getState();
    const text = serialize(state, Date.now());
    if (!text) {
      showHint('保存できませんでした');
      return false;
    }
    if (byteLength(text) > MAX_SAVE_BYTES) {
      showHint('保存サイズが大きすぎます（2MB超）');
      return false;
    }
    try {
      window.localStorage.setItem(key, text);
    } catch (err) {
      showHint('保存できませんでした');
      return false;
    }
    if (!quiet) showHint('保存しました');
    return true;
  }

  function describe(entry) {
    if (!entry) return '空';
    if (entry.broken) return '読めません';
    return formatSavedAt(entry.savedAt) + '  ' + formatClock(entry.state.timeSec);
  }

  function buildRow(key, label) {
    const entry = readSlot(key);

    const row = make('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.gap = '6px';
    row.style.marginTop = '6px';

    const name = make('div', label);
    name.style.width = '30px';
    name.style.fontWeight = '700';
    name.style.flexShrink = '0';

    const when = make('div', describe(entry));
    when.style.flex = '1';
    when.style.fontSize = '11px';
    when.style.opacity = '0.9';
    when.style.whiteSpace = 'nowrap';

    const write = styleButton(make('button', '書く'), false);
    write.addEventListener('click', () => {
      if (writeSlot(key, false)) refresh();
    });

    const load = styleButton(make('button', '読む'), true);
    load.addEventListener('click', () => {
      const latest = readSlot(key);
      if (!latest || latest.broken) {
        showHint('読める記録がありません');
        return;
      }
      const ok = window.confirm('この記録を読み込みますか？\n' + describe(latest));
      if (!ok) return;
      setState(latest.state);
      panel.style.display = 'none';
      showHint('読み込みました');
    });

    row.appendChild(name);
    row.appendChild(when);
    row.appendChild(write);
    row.appendChild(load);
    return row;
  }

  function refresh() {
    panel.innerHTML = '';
    const title = make('div', '記録');
    title.style.fontWeight = '700';
    title.style.fontSize = '12px';
    title.style.marginBottom = '2px';
    panel.appendChild(title);
    panel.appendChild(buildRow(SAVE_KEYS[0], '1'));
    panel.appendChild(buildRow(SAVE_KEYS[1], '2'));
    panel.appendChild(buildRow(SAVE_KEYS[2], '3'));
    panel.appendChild(buildRow(AUTO_KEY, '自動'));
  }

  toggle.addEventListener('click', () => {
    if (panel.style.display === 'none') {
      refresh();
      panel.style.display = 'block';
    } else {
      panel.style.display = 'none';
    }
  });

  const media = window.matchMedia('(orientation: portrait)');
  function layout() {
    if (media.matches) {
      root.style.right = 'calc(env(safe-area-inset-right, 0px) + 12px)';
      root.style.bottom = 'calc(env(safe-area-inset-bottom, 0px) + 120px)';
    } else {
      root.style.right = 'calc(env(safe-area-inset-right, 0px) + min(46vw, 420px) + 28px)';
      root.style.bottom = 'calc(env(safe-area-inset-bottom, 0px) + 12px)';
    }
    root.style.left = 'auto';
    root.style.top = 'auto';
  }
  if (media.addEventListener) media.addEventListener('change', layout);
  else if (media.addListener) media.addListener(layout);
  layout();

  function saveAuto() {
    return writeSlot(AUTO_KEY, true);
  }

  window.setInterval(saveAuto, AUTO_INTERVAL_MS);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) saveAuto();
  });

  return {
    toggle,
    saveAuto,
    writeSlot,
    refresh,
  };
}
