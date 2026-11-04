// 設定（仲間の名前表示、BGM音量、初期装備など）。localStorage に覚える。

import { panels } from './panels.js';
import { OPTION_NAMES_KEY } from './labels.js';
import { bgm } from '../audio/bgm_player.js';

export function readShowNames(storage) {
  try {
    const raw = storage ? storage.getItem(OPTION_NAMES_KEY) : null;
    return raw !== '0';
  } catch (err) {
    return true;
  }
}

export const OPTION_XBOW_KEY = 'sunahate_opt_xbow';
export const OPTION_WIND_KEY = 'sunahate_opt_wind';

export function readFoliageWind(storage) {
  try {
    const raw = storage ? storage.getItem(OPTION_WIND_KEY) : null;
    return raw !== '0';
  } catch (err) {
    return true;
  }
}

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

  // ピアノBGMコントロール
  const audioSec = document.createElement('div');
  audioSec.className = 'opt-audio-section';

  const audioTitleRow = document.createElement('div');
  audioTitleRow.className = 'opt-audio-title-row';
  const audioLabel = document.createElement('span');
  audioLabel.textContent = 'ピアノ音楽';
  const trackLabel = document.createElement('span');
  trackLabel.className = 'opt-track-name';
  trackLabel.textContent = bgm.currentTrack ? bgm.currentTrack.title : '静寂';
  audioTitleRow.append(audioLabel, trackLabel);

  const audioControls = document.createElement('div');
  audioControls.className = 'opt-audio-controls';

  const muteBtn = document.createElement('button');
  muteBtn.type = 'button';
  muteBtn.className = 'opt-audio-btn' + (bgm.muted ? ' muted' : '');
  muteBtn.textContent = bgm.muted ? '消音中' : '音量';

  const volSlider = document.createElement('input');
  volSlider.type = 'range';
  volSlider.min = '0';
  volSlider.max = '100';
  volSlider.value = String(Math.round(bgm.volume * 100));
  volSlider.className = 'opt-vol-slider';
  volSlider.setAttribute('aria-label', '音楽の音量');

  const skipBtn = document.createElement('button');
  skipBtn.type = 'button';
  skipBtn.className = 'opt-audio-btn';
  skipBtn.textContent = '次の曲';

  audioControls.append(muteBtn, volSlider, skipBtn);

  const ambientRow = document.createElement('label');
  ambientRow.className = 'opt-row';
  ambientRow.style.minHeight = '24px';
  ambientRow.style.fontSize = '11px';
  const ambientBox = document.createElement('input');
  ambientBox.type = 'checkbox';
  ambientBox.checked = bgm.mode === 'ambient';
  ambientBox.style.width = '16px';
  ambientBox.style.height = '16px';
  ambientRow.append(ambientBox, document.createTextNode('曲間に静寂の間合いを入れる'));

  audioSec.append(audioTitleRow, audioControls, ambientRow);
  panel.appendChild(audioSec);

  // イベント設定
  muteBtn.addEventListener('click', () => {
    bgm.toggleMute();
    if (!bgm.unlocked) bgm.unlock();
  });

  volSlider.addEventListener('input', () => {
    const v = parseInt(volSlider.value, 10) / 100;
    bgm.setVolume(v);
    if (!bgm.unlocked) bgm.unlock();
  });

  skipBtn.addEventListener('click', () => {
    if (!bgm.unlocked) {
      bgm.unlock();
    } else {
      bgm.nextTrack({ force: true, fadeSec: 1.5 });
    }
  });

  ambientBox.addEventListener('change', () => {
    bgm.setMode(ambientBox.checked ? 'ambient' : 'continuous');
  });

  bgm.onChange(state => {
    volSlider.value = String(Math.round(state.volume * 100));
    muteBtn.textContent = state.muted ? '消音中' : '音量';
    if (state.muted) muteBtn.classList.add('muted');
    else muteBtn.classList.remove('muted');

    if (state.currentTrack) {
      trackLabel.textContent = state.isPausedInAmbientGap ? `${state.currentTrack.title}（余韻）` : state.currentTrack.title;
    } else {
      trackLabel.textContent = '静寂';
    }
    ambientBox.checked = state.mode === 'ambient';
  });
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
  let foliageWind = readFoliageWind(storage);
  const row3 = document.createElement('label');
  row3.className = 'opt-row';
  const box3 = document.createElement('input');
  box3.type = 'checkbox';
  box3.checked = foliageWind;
  row3.appendChild(box3);
  row3.appendChild(document.createTextNode('草木を風で揺らす'));
  panel.appendChild(row3);
  box3.addEventListener('change', () => setFoliageWind(box3.checked));
  // テスト用キャラ（testchars1）: 全スキル50/100/150の仲間3人を部隊に加える。
  const testRow = document.createElement('div');
  testRow.className = 'opt-row opt-test-row';
  const testBtn = document.createElement('button');
  testBtn.type = 'button';
  testBtn.className = 'opt-test-chars';
  testBtn.textContent = 'テスト用キャラを加える';
  const testNote = document.createElement('span');
  testNote.className = 'opt-test-note';
  testNote.textContent = '全スキル50・100・150の3人';
  testRow.append(testBtn, testNote);
  panel.appendChild(testRow);
  testBtn.addEventListener('click', () => {
    const result = hooks.onAddTestChars ? hooks.onAddTestChars(startXbow) : null;
    if (result) testNote.textContent = result;
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

  function setFoliageWind(on) {
    foliageWind = !!on;
    box3.checked = foliageWind;
    try {
      if (storage) storage.setItem(OPTION_WIND_KEY, foliageWind ? '1' : '0');
    } catch (err) {
      // 保存できなくても続行
    }
    if (hooks.onFoliageWind) hooks.onFoliageWind(foliageWind);
    return foliageWind;
  }
  if (hooks.onFoliageWind) hooks.onFoliageWind(foliageWind);

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
    getFoliageWind: () => foliageWind,
    setShowNames,
    setFoliageWind,
    toggle,
  };
}
