/**
 * ひらがなモード（小2レベル）: 小学2年までに習わない漢字を含む語をひらがなで表示する。
 * 表示だけを書き換える。保存データ・ログの分類・判定用の文字列には触れない。
 * OFF のときは Canvas もDOMも一切フックしない（ゼロオーバーヘッド）。
 */
import { storage } from './storage.js';
import { toKana } from './kana-text.js';

export const KANA_STORAGE_KEY = 'kana_grade';
export const KANA_MODE_GRADE = 2;
const ATTRS = ['title', 'aria-label', 'placeholder', 'alt'];
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'NOSCRIPT']);

let grade = 0;
const listeners = new Set();
const textOriginals = new WeakMap(); // Text -> {orig, conv}
const attrOriginals = new WeakMap(); // Element -> Map(attr -> {orig, conv})
const patchedProtos = []; // [{proto, name, orig}]
let observer = null;
let nativeDialogs = null;

export const kanaGrade = () => grade;
export const isKanaMode = () => grade > 0;
/** 現在のモードで表示用に変換（OFFなら素通し）。二重適用しても結果は同じ。 */
export const displayKana = (text) => (grade ? toKana(text, grade) : text);

/* ---------- Canvas ---------- */
function patchCanvas() {
  if (patchedProtos.length) return;
  for (const ctor of [globalThis.CanvasRenderingContext2D, globalThis.OffscreenCanvasRenderingContext2D]) {
    const proto = ctor && ctor.prototype;
    if (!proto) continue;
    for (const name of ['fillText', 'strokeText', 'measureText']) {
      const orig = Object.getOwnPropertyDescriptor(proto, name)?.value;
      if (typeof orig !== 'function') continue;
      const wrapped = function (text, ...rest) {
        return orig.call(this, typeof text === 'string' ? toKana(text, grade) : text, ...rest);
      };
      proto[name] = wrapped;
      patchedProtos.push({ proto, name, orig });
    }
  }
}
function unpatchCanvas() {
  for (const { proto, name, orig } of patchedProtos) proto[name] = orig;
  patchedProtos.length = 0;
}

/* ---------- DOM ---------- */
function convertText(node) {
  const v = node.nodeValue;
  const rec = textOriginals.get(node);
  if (rec && rec.conv === v) return;
  const conv = toKana(v, grade);
  if (conv !== v) { textOriginals.set(node, { orig: v, conv }); node.nodeValue = conv; }
  else if (rec) textOriginals.delete(node);
}
function convertAttrs(el) {
  let map = attrOriginals.get(el);
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    if (!v) continue;
    const rec = map && map.get(a);
    if (rec && rec.conv === v) continue;
    const conv = toKana(v, grade);
    if (conv !== v) {
      if (!map) attrOriginals.set(el, (map = new Map()));
      map.set(a, { orig: v, conv });
      el.setAttribute(a, conv);
    } else if (rec) map.delete(a);
  }
}
function convertTree(root) {
  if (!root) return;
  if (root.nodeType === 3) { if (!SKIP_TAGS.has(root.parentNode?.nodeName)) convertText(root); return; }
  if (root.nodeType !== 1 || SKIP_TAGS.has(root.nodeName)) return;
  convertAttrs(root);
  const walker = document.createTreeWalker(root, 1 | 4, {
    acceptNode: (n) => (n.nodeType === 1 && SKIP_TAGS.has(n.nodeName) ? 2 : 1), // 2=REJECT 1=ACCEPT
  });
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n.nodeType === 3) convertText(n); else convertAttrs(n);
  }
}
function restoreTree(root) {
  const walker = document.createTreeWalker(root, 1 | 4);
  for (let n = walker.currentNode; n; n = walker.nextNode()) {
    if (n.nodeType === 3) {
      const rec = textOriginals.get(n);
      if (rec && rec.conv === n.nodeValue) n.nodeValue = rec.orig;
      textOriginals.delete(n);
    } else if (n.nodeType === 1) {
      const map = attrOriginals.get(n);
      if (map) {
        for (const [a, rec] of map) if (n.getAttribute(a) === rec.conv) n.setAttribute(a, rec.orig);
        attrOriginals.delete(n);
      }
    }
  }
}
function onMutations(records) {
  for (const r of records) {
    if (r.type === 'childList') for (const n of r.addedNodes) convertTree(n);
    else if (r.type === 'characterData') { if (!SKIP_TAGS.has(r.target.parentNode?.nodeName)) convertText(r.target); }
    else if (r.type === 'attributes') convertAttrs(r.target);
  }
}
function startDom() {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
  const root = document.documentElement;
  convertTree(root);
  observer = new MutationObserver(onMutations);
  observer.observe(root, { childList: true, characterData: true, attributes: true, attributeFilter: ATTRS, subtree: true });
  if (typeof window !== 'undefined' && !nativeDialogs) {
    nativeDialogs = { alert: window.alert, confirm: window.confirm, prompt: window.prompt };
    for (const k of ['alert', 'confirm', 'prompt']) {
      const native = nativeDialogs[k];
      if (typeof native === 'function') window[k] = (msg, ...r) => native.call(window, displayKana(String(msg ?? '')), ...r);
    }
  }
}
function stopDom() {
  if (observer) { observer.disconnect(); observer = null; }
  if (nativeDialogs) { Object.assign(window, nativeDialogs); nativeDialogs = null; }
  if (typeof document !== 'undefined' && document.documentElement) restoreTree(document.documentElement);
}

/* ---------- 切り替え ---------- */
export function setKanaGrade(next, { persist = true } = {}) {
  const g = +next >= 1 && +next < 7 ? +next : 0;
  if (g === grade) return grade;
  const wasOn = grade > 0;
  grade = g;
  if (persist) { if (g) storage.set(KANA_STORAGE_KEY, g); else storage.remove(KANA_STORAGE_KEY); }
  globalThis.document?.documentElement?.classList.toggle('kana-mode', !!g);
  if (g) { patchCanvas(); if (wasOn) stopDom(); startDom(); }
  else { unpatchCanvas(); stopDom(); }
  for (const fn of listeners) { try { fn(grade); } catch (e) { console.warn(e); } }
  return grade;
}
export const setKanaMode = (on) => setKanaGrade(on ? KANA_MODE_GRADE : 0);
export const toggleKanaMode = () => setKanaMode(!grade);
export function subscribeKana(fn) { listeners.add(fn); return () => listeners.delete(fn); }

/** 保存済みの設定を反映（アプリ起動時に1回）。 */
export function initKanaMode() {
  const saved = +storage.get(KANA_STORAGE_KEY, 0);
  if (saved >= 1 && saved < 7) setKanaGrade(saved, { persist: false });
  return grade;
}

/* ---------- 設定UI ---------- */
const LABEL = 'ひらがなモード';
/** ハブ上部の丸ボタンを配線。 */
export function bindKanaButton(btn) {
  if (!btn) return;
  const sync = () => {
    const next = grade ? 'ひらがなモードをOFFにする' : 'ひらがなモードをONにする';
    btn.setAttribute('aria-pressed', String(!!grade));
    btn.setAttribute('title', next);
    btn.setAttribute('aria-label', next);
    btn.classList.toggle('is-on', !!grade);
  };
  sync();
  btn.addEventListener('click', toggleKanaMode);
  subscribeKana(sync);
}
/** ゲーム内の設定（折りたたみ）を作って parent に追加。戻り値は後片付け関数。 */
export function mountKanaPanel(parent) {
  const panel = document.createElement('details');
  panel.className = 'command-fold audio-settings kana-settings';
  panel.id = 'kana-settings';
  panel.innerHTML = `<summary>${LABEL}</summary><div class="fold-content"><div class="audio-actions"><button type="button" data-kana="toggle"></button></div><p class="audio-hint">むずかしいかんじを、ひらがなでひょうじします。小学2年生までにならうかんじは、そのままです。</p></div>`;
  const btn = panel.querySelector('[data-kana="toggle"]');
  const sync = () => { btn.textContent = grade ? `${LABEL}：ON` : `${LABEL}：OFF`; btn.setAttribute('aria-pressed', String(!!grade)); };
  sync();
  btn.onclick = toggleKanaMode;
  const off = subscribeKana(sync);
  parent.append(panel);
  return () => { off(); panel.remove(); };
}
