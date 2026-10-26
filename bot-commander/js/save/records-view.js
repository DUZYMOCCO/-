// 記録の画面（☰ メニューの「記録」）。.bc-root の上に重ねる小さな画面。ミッションごとのクリア・回数・一番よい記録、解放した数、拾った武器の数。
// 「記録を消す」は 2 回押す確かめ（1 回目で文字が変わり、4 秒以内にもう一度押すと消える）。消すのは bc-save-v1 と、武器庫の選び（bc-armory-v1）・拾った武器（v1.0.0 の決定）。
import { loadCss } from '../../../common/js/load-css.js';
import { loadSave, unlockedLists, readOwnedWeapons, resetSave, ownedSummary, START_UNLOCKED } from './save.js?v=5';

const CSS_URL = new URL('../../css/save.css?v=2', import.meta.url).href;
const ARM_MS = 4000;
const LABEL_RESET = '記録を消す';
const LABEL_ARMED = 'もう一度押すと消える';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmtClock = s => { const t = Math.max(0, Math.round(s)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };

/** 画面の中身（HTML の文字）。titles = { ミッションの id: 名前 }。ここは DOM を使わない（形のテストができる） */
export function recordsHtml(save, titles, owned, lists) {
  const ids = [...new Set([...Object.keys(titles), ...Object.keys(save.missions)])];
  const rows = ids.map(id => {
    const m = save.missions[id];
    const name = esc(titles[id] || id);
    if (!m || m.plays === 0) return `<li class="bcs-m"><b>${name}</b><span class="bcs-st">まだ</span></li>`;
    const best = m.best ? `<span class="bcs-best">一番よい　${m.best.survivors != null ? `残った ${m.best.survivors}　` : ''}${fmtClock(m.best.time)}　資材 ${m.best.delivered}　失った ${m.best.lost}機</span>` : '';
    return `<li class="bcs-m"><b>${name}</b><span class="bcs-st${m.cleared ? ' clear' : ''}">${m.cleared ? 'クリア' : 'まだ'}</span><span class="bcs-n">${m.plays}回あそんだ・${m.wins}回かった</span>${best}</li>`;
  }).join('');
  const own = ownedSummary(owned);
  const unitMax = Math.max(lists.units.length, START_UNLOCKED.units.length), weaponMax = Math.max(lists.weapons.length, START_UNLOCKED.weapons.length);
  return `<ul class="bcs-list">${rows}</ul>
    <dl class="bcs-sum">
      <div><dt>つかえる機体</dt><dd>${lists.units.length}／${unitMax}</dd></div>
      <div><dt>つかえる武器</dt><dd>${lists.weapons.length}／${weaponMax}</dd></div>
      <div><dt>ひろった武器</dt><dd>${own.kinds}種・${own.total}個</dd></div>
    </dl>`;
}

/**
 * 記録の画面を開く。root は .bc-root。返り値は { close }。閉じる／destroy で、画面・タイマーを外す。
 * opts = { titles, onClose, onReset }（onReset: 「記録を消す」で消した後に呼ぶ）
 */
export async function openRecords(root, opts = {}) {
  await loadCss(CSS_URL);
  const el = document.createElement('div');
  el.className = 'bcs';
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', '記録');
  el.innerHTML = `<div class="bcs-box"><h2 class="bcs-title">記録</h2><div class="bcs-body"></div>
    <div class="bcs-btns"><button class="bcs-close">とじる</button><button class="bcs-reset">${LABEL_RESET}</button></div></div>`;
  const body = el.querySelector('.bcs-body'), reset = el.querySelector('.bcs-reset');
  let timer = 0, closed = false;
  const draw = () => { body.innerHTML = recordsHtml(loadSave(), opts.titles || {}, readOwnedWeapons(), unlockedLists()); };
  const disarm = () => { clearTimeout(timer); delete reset.dataset.armed; reset.textContent = LABEL_RESET; };
  const close = () => {
    if (closed) return; closed = true; disarm();
    el.remove(); opts.onClose?.();
  };
  el.querySelector('.bcs-close').addEventListener('click', close);
  reset.addEventListener('click', () => {
    if (reset.dataset.armed) { disarm(); resetSave(); opts.onReset?.(); draw(); return; }
    reset.dataset.armed = '1'; reset.textContent = LABEL_ARMED;
    timer = setTimeout(disarm, ARM_MS);
  });
  for (const ev of ['pointerdown', 'pointermove', 'pointerup', 'touchstart', 'touchmove', 'touchend', 'wheel']) el.addEventListener(ev, e => e.stopPropagation());
  el.addEventListener('click', e => { e.stopPropagation(); if (e.target === el) close(); });
  draw();
  root.appendChild(el);
  return { close, el };
}
