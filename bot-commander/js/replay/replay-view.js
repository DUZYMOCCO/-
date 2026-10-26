// 記録と再生の画面まわり（書き出し・読み込み・再生中の進み具合・再生の結果）。シムは触らない（js/sim/replay.js が本体）。
// 全部 .bc-root の中の 1 つの枠（.bcr-sheet）か、細い帯（.bcr-bar）。閉じたら DOM から外す（物を増やし続けない）。
import { stringifyReplay, deviceRecord, parseReplay, MAX_REPLAY_BYTES } from '../sim/replay.js?v=10';

const TICKS_PER_SEC = 30; // sim.js の TICK = 1/30

export const fmtTicks = t => { const s = Math.floor(t / TICKS_PER_SEC); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const kb = n => (n < 1024 ? `${n}B` : `${(n / 1024).toFixed(1)}KB`);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** この端末の名前（記録の meta に書く。端末をまたいだ比べで「どの端末の値か」が分かるように） */
export function deviceName() {
  try { return `${navigator.platform || ''} ${navigator.userAgent || ''}`.trim().slice(0, 200); } catch { return ''; }
}

/** ?replay= の値 → 記録の文字。名前（英数字とハイフン）は assets/replays/<名前>.json、それ以外は URL として取りに行く。失敗したら例外（message が理由） */
export async function fetchReplayText(value, baseUrl) {
  const url = /^[\w-]+$/.test(value) ? new URL(`../assets/replays/${value}.json`, baseUrl) : new URL(value, location.href);
  let res; try { res = await fetch(url.href, { cache: 'no-store' }); } catch (e) { throw new Error('リプレイを取りに行けませんでした'); }
  if (!res.ok) throw new Error(`リプレイが見つかりません（${res.status}）`);
  const len = Number(res.headers.get('content-length') || 0);
  if (len > MAX_REPLAY_BYTES) throw new Error('リプレイが大きすぎます');
  return res.text();
}

const STOP_EVENTS = ['pointerdown', 'pointermove', 'pointerup', 'touchstart', 'touchmove', 'touchend', 'wheel'];

function makeSheet(root, html) {
  const el = document.createElement('div');
  el.className = 'bcr-sheet';
  el.innerHTML = `<div class="bcr-box" role="dialog" aria-modal="true">${html}</div>`;
  for (const ev of STOP_EVENTS) el.addEventListener(ev, e => e.stopPropagation());
  root.appendChild(el);
  return el;
}

// ---- 書き出し ----
/**
 * 文字（JSON）を、ファイルに保存／共有／コピーできる枠を出す。
 * opts: { title, summary, text, filename }。返り値の close() で閉じる（onClose があれば呼ぶ）
 */
export function openExportSheet(root, { title, summary, text, filename, onClose }) {
  const bytes = new Blob([text]).size;
  const el = makeSheet(root, `
    <h2 class="bcr-title">${esc(title)}</h2>
    <p class="bcr-text">${esc(summary)}（${kb(bytes)}）</p>
    <textarea class="bcr-area" readonly aria-label="リプレイの文字"></textarea>
    <p class="bcr-note" hidden></p>
    <div class="bcr-btns"><button class="main bcr-save"></button><button class="bcr-copy">文字をコピー</button><button class="bcr-close wide">とじる</button></div>`);
  const q = s => el.querySelector(s);
  const area = q('.bcr-area'); area.value = text;
  const note = q('.bcr-note'), say = t => { note.hidden = !t; note.textContent = t; };
  let file = null;
  try { file = new File([text], filename, { type: 'application/json' }); } catch { file = null; }
  const canShare = !!(file && navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share);
  q('.bcr-save').textContent = canShare ? '共有・ほぞん' : 'ファイルにほぞん';
  let urlToFree = null;
  q('.bcr-save').addEventListener('click', async () => {
    if (canShare) { try { await navigator.share({ files: [file], title: filename }); say(''); } catch (e) { if (e && e.name !== 'AbortError') say('共有できませんでした。「文字をコピー」を使ってください'); } return; }
    try {
      if (urlToFree) URL.revokeObjectURL(urlToFree);
      urlToFree = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      const a = document.createElement('a'); a.href = urlToFree; a.download = filename; a.style.display = 'none';
      el.appendChild(a); a.click(); a.remove();
      say(`${filename} をほぞんしました`);
    } catch { say('ほぞんできませんでした。「文字をコピー」を使ってください'); }
  });
  q('.bcr-copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(text); say('コピーしました'); return; } catch { /* 下の方法へ */ }
    try { area.focus(); area.select(); area.setSelectionRange(0, text.length); say(document.execCommand('copy') ? 'コピーしました' : '文字を選びました。長押しでコピーしてください'); }
    catch { say('文字を選びました。長押しでコピーしてください'); }
  });
  let closed = false;
  const close = () => { if (closed) return; closed = true; if (urlToFree) URL.revokeObjectURL(urlToFree); el.remove(); onClose?.(); };
  q('.bcr-close').addEventListener('click', close);
  el.addEventListener('click', e => { if (e.target === el) close(); });
  return { close, el };
}

/** 記録（書き出し用）の枠。end は途中でもよい */
export function openRecordExport(root, rec, opts = {}) {
  const t = rec.end.tick;
  return openExportSheet(root, {
    title: opts.title || 'リプレイを書き出す',
    summary: `${fmtTicks(t)}・命令 ${rec.cmds.reduce((a, c) => a + c[2].length, 0)} 件・${rec.end.result ? (rec.end.result === 'win' ? '脱出成功' : '作戦失敗') : '途中'}`,
    text: stringifyReplay(rec),
    filename: `bc-replay-seed${rec.start.seed}-t${t}.json`,
    onClose: opts.onClose,
  });
}

/** 再生の結果の「この端末のハッシュ」の枠 */
export function openHashExport(root, rec, report, opts = {}) {
  const dev = deviceRecord(rec, report, deviceName());
  return openExportSheet(root, {
    title: 'ハッシュを書き出す',
    summary: `この端末で再生して出たハッシュ（途中 ${report.marks.length} 個と終わり）`,
    text: stringifyReplay(dev),
    filename: `bc-hashes-seed${rec.start.seed}-t${rec.end.tick}.json`,
    onClose: opts.onClose,
  });
}

// ---- 読み込み ----
/**
 * 記録を読み込む枠: 文字を貼る／ファイルをえらぶ。読めたら onLoad(rec, notes)、だめなら理由をこの枠に出す（止まらない）。
 */
export function openLoadSheet(root, { onLoad, onClose }) {
  const el = makeSheet(root, `
    <h2 class="bcr-title">リプレイを読み込む</h2>
    <textarea class="bcr-area" placeholder="ここにリプレイ（JSON）を貼る" aria-label="リプレイの文字"></textarea>
    <p class="bcr-text err" hidden></p>
    <div class="bcr-btns"><button class="bcr-pick">ファイルをえらぶ</button><button class="main bcr-go">再生する</button><button class="bcr-close wide">とじる</button></div>
    <input class="bcr-file" type="file" accept=".json,application/json,text/plain">`);
  const q = s => el.querySelector(s);
  const area = q('.bcr-area'), err = q('.bcr-text'), file = q('.bcr-file');
  const fail = t => { err.hidden = false; err.textContent = t; };
  const tryText = text => {
    const p = parseReplay(text);
    if (!p.ok) { fail(p.reason); return; }
    err.hidden = true; close(true); onLoad(p.rec, p.notes);
  };
  q('.bcr-go').addEventListener('click', () => tryText(area.value));
  q('.bcr-pick').addEventListener('click', () => file.click());
  file.addEventListener('change', async () => {
    const f = file.files && file.files[0]; file.value = '';
    if (!f) return;
    if (f.size > MAX_REPLAY_BYTES) { fail('リプレイが大きすぎます'); return; }
    let text; try { text = await f.text(); } catch { fail('ファイルを読めませんでした'); return; }
    tryText(text);
  });
  let closed = false;
  function close(loaded) { if (closed) return; closed = true; el.remove(); if (!loaded) onClose?.(); }
  q('.bcr-close').addEventListener('click', () => close(false));
  el.addEventListener('click', e => { if (e.target === el) close(false); });
  return { close: () => close(false), el };
}

// ---- 再生中の進み具合 ----
export function createReplayBar(root, player) {
  const el = document.createElement('div');
  el.className = 'bcr-bar';
  el.innerHTML = `<b>再生</b><span></span><div class="bcr-track"><i></i></div>`;
  root.appendChild(el);
  const span = el.querySelector('span'), bar = el.querySelector('i');
  let last = -1;
  return {
    update() {
      const t = player.tick; if (t === last) return; last = t;
      span.textContent = `${fmtTicks(t)}／${fmtTicks(player.total)}`;
      bar.style.width = `${player.total ? Math.min(100, t / player.total * 100) : 100}%`;
    },
    destroy() { el.remove(); },
  };
}

// ---- 再生の結果 ----
/**
 * 再生が終わった時の結果の枠。同じなら「同じハッシュ」、ずれたら最初にずれた tick を出す。この端末のハッシュの一覧も見せる。
 * h: { report, rec, notes, onNormal（ふつうにもどる）, onHub, onClose }
 */
export function showReplayResult(root, { report, rec, notes = [], onNormal, onHub }) {
  const want = new Map(rec.marks.map(m => [m[0], m]));
  const rows = report.marks.map(m => {
    const w = want.get(m[0]); const ok = !w || (w[1] === m[1] && w[2] === m[2]);
    return `<li class="${w ? (ok ? 'ok' : 'ng') : 'dim'}"><b>${m[0]}</b><span>${m[1]} ${m[2]}</span><s>${w ? (ok ? '同じ' : 'ちがう') : ''}</s></li>`;
  });
  const e = report.end, w = rec.end;
  const endOk = e && e.tick === w.tick && e.hash === w.hash && e.deep === w.deep && (e.result ?? null) === (w.result ?? null);
  if (e) rows.push(`<li class="${endOk ? 'ok' : 'ng'}"><b>終</b><span>${e.hash} ${e.deep}</span><s>${endOk ? '同じ' : 'ちがう'}</s></li>`);
  const f = report.first;
  const title = report.match ? 'ハッシュが同じ' : 'ずれました';
  const text = report.match
    ? `最後まで再生できました（${fmtTicks(report.ticks)}）。途中のハッシュ ${report.marksChecked} 個と終わりが、リプレイと全部同じです。`
    : f.where === 'end' && f.field === 'tick' ? `終わりの tick が違います（リプレイ ${f.want}・ここ ${f.got}）。tick ${f.since} までは同じでした。`
      : `tick ${f.tick}（${fmtTicks(f.tick)}）の「${f.field === 'deep' ? '深いハッシュ' : f.field === 'hash' ? 'ハッシュ' : f.field === 'result' ? '結果' : f.field}」から違います。tick ${f.since} までは同じでした。`;
  const el = makeSheet(root, `
    <h2 class="bcr-title ${report.match ? 'ok' : 'ng'}">${title}</h2>
    <p class="bcr-text">${esc(text)}</p>
    ${notes.map(n => `<p class="bcr-note">${esc(n)}</p>`).join('')}
    <ul class="bcr-list" aria-label="この端末のハッシュ">${rows.join('')}</ul>
    <div class="bcr-btns"><button class="bcr-hash wide">ハッシュを書き出す</button><button class="main bcr-normal">ふつうにもどる</button><button class="bcr-hub">工房へ</button></div>`);
  const q = s => el.querySelector(s);
  let sub = null;
  q('.bcr-hash').addEventListener('click', () => { if (!sub) sub = openHashExport(root, rec, report, { onClose: () => { sub = null; } }); });
  q('.bcr-normal').addEventListener('click', () => onNormal?.());
  q('.bcr-hub').addEventListener('click', () => onHub?.());
  return { destroy() { sub?.close(); el.remove(); }, el };
}

/** 記録を読めなかった時の知らせ（理由つき。止まらず、閉じるとふつうの画面） */
export function showReplayError(root, reason, { onClose } = {}) {
  const el = makeSheet(root, `
    <h2 class="bcr-title ng">リプレイを再生できません</h2>
    <p class="bcr-text err">${esc(reason)}</p>
    <div class="bcr-btns"><button class="main bcr-close wide">とじる</button></div>`);
  const close = () => { el.remove(); onClose?.(); };
  el.querySelector('.bcr-close').addEventListener('click', close);
  return { destroy: () => el.remove(), el };
}
