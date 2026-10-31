// 設定（いまは「仲間の名前を表示」だけ）。localStorage に覚える。初期値は表示する。

import { panels } from './panels.js';
import { OPTION_NAMES_KEY } from './labels.js';

export function readShowNames(storage) {
  try {
    const raw = storage ? storage.getItem(OPTION_NAMES_KEY) : null;
    return raw !== '0';
  } catch (err) {
    return true;
  }
}

export const OPTION_XBOW_KEY = 'sunahate_opt_xbow';

export function readStartCrossbow(storage) {
  try {
    const raw = storage ? storage.getItem(OPTION_XBOW_KEY) : null;
    return raw !== '0';
  } catch (err) {
    return true;
  }
}

export function createOptions(callbacks) {
  const hooks = callbacks || {};
  let storage = null;
  try { storage = typeof window !== 'undefined' ? window.localStorage : null; } catch (err) { /* 使用不可 */ }
  let showNames = readShowNames(storage);

  const root = document.createElement('div');
  root.className = 'opt-root';
  const panel = document.createElement('div');
  panel.className = 'opt-panel hidden';
  const row = document.createElement('label');
  row.className = 'opt-row';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = showNames;
  row.appendChild(box);
  row.appendChild(document.createTextNode('仲間の名前を表示'));
  panel.appendChild(row);
  let startXbow = readStartCrossbow(storage);
  const row2 = document.createElement('label');
  row2.className = 'opt-row';
  const box2 = document.createElement('input');
  box2.type = 'checkbox';
  box2.checked = startXbow;
  row2.appendChild(box2);
  row2.appendChild(document.createTextNode('仲間がクロスボウを持って始める（新しく始めた時）'));
  panel.appendChild(row2);
  box2.addEventListener('change', () => {
    startXbow = !!box2.checked;
    try {
      if (storage) storage.setItem(OPTION_XBOW_KEY, startXbow ? '1' : '0');
    } catch (err) {
      // 保存できなくても続行
    }
  });
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'opt-toggle';
  toggle.textContent = '設定';
  root.appendChild(panel);
  root.appendChild(toggle);
  document.body.appendChild(root);

  panels.register('options', { parent: 'menu', contains: target => panel.contains(target) || toggle.contains(target) || !!target.closest?.('.hud-menu-toggle'), close: () => panel.classList.add('hidden') });
  const close = document.createElement('button'); close.type = 'button'; close.className = 'sheet-close'; close.textContent = '×'; close.setAttribute('aria-label', '閉じる'); close.onclick = () => panels.close('options'); panel.prepend(close);
  toggle.addEventListener('click', () => {
    if (!panel.classList.contains('hidden')) panels.close('options');
    else { panels.open('options'); panel.classList.remove('hidden'); }
  });
  box.addEventListener('change', () => {
    showNames = !!box.checked;
    try {
      if (storage) storage.setItem(OPTION_NAMES_KEY, showNames ? '1' : '0');
    } catch (err) {
      // 保存できなくても続行
    }
    if (hooks.onShowNames) hooks.onShowNames(showNames);
  });

  // 記録ボタンの左隣に置く（縦: 右下のログの上 / 横: ログの左）。
  const media = window.matchMedia('(orientation: portrait)');
  function place() {
    if (media.matches) {
      root.style.right = 'calc(env(safe-area-inset-right, 0px) + 72px)';
      root.style.bottom = 'calc(env(safe-area-inset-bottom, 0px) + 140px)';
    } else {
      root.style.right = 'calc(env(safe-area-inset-right, 0px) + min(46vw, 420px) + 88px)';
      root.style.bottom = 'calc(env(safe-area-inset-bottom, 0px) + 32px)';
    }
  }
  if (media.addEventListener) media.addEventListener('change', place);
  else if (media.addListener) media.addListener(place);
  place();

  function setShowNames(on) {
    showNames = !!on;
    box.checked = showNames;
    if (hooks.onShowNames) hooks.onShowNames(showNames);
  }

  return {
    getShowNames: () => showNames,
    getStartCrossbow: () => startXbow,
    setShowNames,
    toggle,
  };
}
