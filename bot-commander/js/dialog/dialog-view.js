// 会話（立ち絵＋セリフ）の画面。DOM＋CSS（文字がきれいに出るように Pixi は使わない）。
// 呼び出し口: playDialog(host, script, opts) → Promise<{ skipped }>。host は .bc-root（この中に重ねて出す）。
//   script は台本のオブジェクトか、台本 JSON の URL。台本の書き方は assets/dialog/README.md。
//   opts.onHub: あればメニューに「工房へ戻る」を出し、押されたら呼ぶ（お試し用）。opts.onOpen(ctl): 最初のセリフが出たら呼ぶ。
// 出ている間は、下の地図にタップ・ドラッグを通さない。終わったら自分で消える。
// どこに何を出すか・台本をどう進めるかの計算は、DOM のない portrait-layout.js と dialog-script.js。
import { loadCss } from '../../../common/js/load-css.js';
import { startDialog, nextLine, skipToEnd, shownCount, typeDuration, tapAction, facesUsed, chars, bgsUsed, upcomingBg } from './dialog-script.js?v=3';
import { bgUrl } from './dialog-bg.js?v=2';
import { portraitRect, eyesRect, boxRect, eyeColor } from './portrait-layout.js?v=1';

const PORTRAITS_URL = new URL('../../assets/portraits/portraits.json', import.meta.url).href;
const PORTRAIT_DIR = new URL('../../assets/portraits/', import.meta.url).href;
const FACE_FADE_MS = 160;   // 表情の入れ替え（重ねて消す）
const MOVE_MS = 320;        // 登場・退場
const BG_FADE_MS = 400;     // 背景のクロスフェード（css/dialog.css の .dlg-bg-img と同じ長さ）
const BG_FIRST_WAIT_MS = 2000; // 最初の背景は、これだけ待っても読めなければ背景なしで始める
const TAP_SLOP = 12;        // これより指が動いたらタップではない（なぞっても進まない）
const BLOCK = ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'touchstart', 'touchmove', 'touchend', 'wheel', 'contextmenu'];

let portraitsP = null;
/** portraits.json を1回だけ読む */
export function loadPortraits() {
  if (!portraitsP) {
    portraitsP = fetch(PORTRAITS_URL).then(r => { if (!r.ok) throw new Error(`portraits.json を読めない（${r.status}）`); return r.json(); })
      .then(j => { for (const p of Object.values(j.chars)) p.canvasH = j.canvas[1]; return j.chars; })
      .catch(e => { portraitsP = null; throw e; });
  }
  return portraitsP;
}

/** 絵を先に読んでおく（読めなくても止めない） */
function preload(urls) {
  return Promise.all(urls.map(u => new Promise(res => {
    const im = new Image(); im.onload = im.onerror = () => res(); im.src = u;
    if (im.decode) im.decode().then(res, res);
  })));
}

export async function playDialog(host, script, opts = {}) {
  await loadCss(new URL('../../css/dialog.css?v=2', import.meta.url).href);
  if (typeof script === 'string') {
    const r = await fetch(script);
    if (!r.ok) throw new Error(`台本を読めない: ${script}`);
    script = await r.json();
  }
  const portraits = await loadPortraits();
  let st = startDialog(script, portraits); // 台本に誤りがあればここで止まる
  const urls = [];
  for (const { id, face } of facesUsed(script)) {
    const f = portraits[id].faces[face];
    urls.push(PORTRAIT_DIR + f.src); if (f.eyes) urls.push(PORTRAIT_DIR + f.eyes);
  }
  await preload(urls);
  const firstBg = bgUrl(bgsUsed(script)[0]); // 最初に出る背景だけは先に読む（遅くても少し待つだけ）
  if (firstBg) await Promise.race([preload([firstBg]), new Promise(res => setTimeout(res, BG_FIRST_WAIT_MS))]);

  const el = document.createElement('div');
  el.className = 'dlg';
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', '会話');
  el.innerHTML = `
    <div class="dlg-bg" aria-hidden="true"></div>
    <div class="dlg-stage"></div>
    <div class="dlg-box">
      <div class="dlg-name" hidden></div>
      <p class="dlg-text" aria-live="polite"><span class="dlg-shown"></span><span class="dlg-rest"></span></p>
      <span class="dlg-next" aria-hidden="true">▼</span>
    </div>
    <button class="dlg-menu-btn" aria-label="会話のメニューを開く"><span aria-hidden="true">☰</span><small>メニュー</small></button>
    <div class="dlg-menu" hidden>
      <div class="dlg-menu-box" role="dialog" aria-label="会話のメニュー">
        <h2 class="dlg-menu-title">メニュー</h2>
        <button class="dlg-skip">会話をとばす</button>
        ${opts.onHub ? '<button class="dlg-hub">工房へ戻る</button>' : ''}
        <button class="dlg-close">会話にもどる</button>
      </div>
    </div>`;
  host.appendChild(el);
  host.classList.add('bc-dialog-open'); // ゲームの上下のバー・知らせは隠す（css/dialog.css）
  const $ = s => el.querySelector(s);
  const bgEl = $('.dlg-bg'), stageEl = $('.dlg-stage'), box = $('.dlg-box'), nameEl = $('.dlg-name'), shownEl = $('.dlg-shown'), restEl = $('.dlg-rest'), menu = $('.dlg-menu');
  for (const ev of BLOCK) el.addEventListener(ev, e => e.stopPropagation()); // 地図に通さない
  el.addEventListener('contextmenu', e => e.preventDefault());

  const view = () => ({ w: el.clientWidth || host.clientWidth, h: el.clientHeight || host.clientHeight });
  const shown = { left: null, right: null }; // 出ている立ち絵 { id, face, node, body, eyes }
  let lineT0 = 0, lineText = '', nShown = -1, raf = 0, finished = false, skipped = false;
  let resolveDone;
  const done = new Promise(res => { resolveDone = res; });

  // ---- 背景 ----
  // 読み終わってから重ねて出す（古い絵は新しい絵が出きってから消す＝クロスフェード）。読めなければ背景なしで進む
  let bgName, bgSeq = 0;
  const bgWait = new Set(); // 先読み中の Image（閉じる時にやめる）
  function dropBg(imgs, fadeOut) { // fadeOut: 背景なしへ消えていく時だけ。替わる時は、新しい絵が出きるまで古い絵はそのまま（間が暗くならない）
    for (const im of imgs) { if (fadeOut) im.classList.add('dlg-bg-out'); setTimeout(() => im.remove(), BG_FADE_MS + 60); }
  }
  function setBg(name) {
    name = name ?? null;
    if (name === bgName) return;
    bgName = name;
    const seq = ++bgSeq, url = bgUrl(name);
    const olds = Array.from(bgEl.children);
    if (!url) { dropBg(olds, true); return; }
    const im = new Image();
    im.className = 'dlg-bg-img dlg-bg-in'; im.alt = ''; im.draggable = false;
    const show = () => {
      if (seq !== bgSeq || finished) return; // その間に別の背景へ替わった・閉じた
      bgEl.appendChild(im);
      void im.offsetWidth;
      im.classList.remove('dlg-bg-in');
      dropBg(olds.filter(o => o.isConnected));
    };
    im.onload = () => { (im.decode ? im.decode().catch(() => {}) : Promise.resolve()).then(show); };
    im.onerror = () => { if (seq === bgSeq && !finished) dropBg(Array.from(bgEl.children), true); }; // 読めない: 背景なしの見た目へ
    im.src = url;
  }
  function prefetchBg() { // 次に出る背景を先に読み始める（ブラウザのキャッシュに入れるだけ）
    const url = bgUrl(upcomingBg(st));
    if (!url || finished) return;
    const im = new Image();
    const end = () => { im.onload = im.onerror = null; bgWait.delete(im); };
    im.onload = im.onerror = end;
    bgWait.add(im); im.src = url;
  }

  // ---- 立ち絵 ----
  function placeEyes(s, p, r) {
    const f = p.faces[s.face];
    s.eyes?.remove(); s.eyes = null;
    if (!f.eyes) return; // off など目の光がない表情＝目が消えている
    const e = eyesRect(p, f.eyes_rect, r.k);
    const n = document.createElement('div');
    const fx = p.eye_fx_by_face?.[s.face];
    n.className = `dlg-eyes${fx ? ` fx-${fx}` : ''}`;
    n.style.cssText = `left:${e.x}px;top:${e.y}px;width:${e.w}px;height:${e.h}px;--eye:${eyeColor(p, s.face)};--mask:url("${PORTRAIT_DIR + f.eyes}");--blink-delay:${s.side === 'left' ? -1.3 : -3.1}s`;
    n.innerHTML = '<i class="dlg-eye-tint"></i><i class="dlg-eye-glow"><i></i></i><i class="dlg-eye-shut"></i>';
    s.node.appendChild(n); s.eyes = n;
  }
  function layoutOne(s) {
    const p = portraits[s.id], r = portraitRect(p, s.side, view());
    Object.assign(s.node.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
    const mask = r.fade > 0 ? `linear-gradient(to bottom, #000 ${r.fadeTo - r.fade}px, transparent ${r.fadeTo}px)` : '';
    s.node.style.webkitMaskImage = mask; s.node.style.maskImage = mask;
    if (s.eyes) {
      const f = p.faces[s.face], e = eyesRect(p, f.eyes_rect, r.k);
      Object.assign(s.eyes.style, { left: `${e.x}px`, top: `${e.y}px`, width: `${e.w}px`, height: `${e.h}px` });
    }
    return r;
  }
  function makePortrait(side, id, face) {
    const p = portraits[id];
    const node = document.createElement('div');
    node.className = `dlg-por ${side}`;
    node.dataset.id = id;
    const body = new Image(); body.className = 'dlg-body'; body.alt = p.name; body.draggable = false;
    body.src = PORTRAIT_DIR + p.faces[face].src;
    node.appendChild(body);
    const s = { side, id, face, node, body, eyes: null };
    stageEl.appendChild(node);
    const r = layoutOne(s);
    placeEyes(s, p, r);
    return s;
  }
  function setFace(s, face) {
    const p = portraits[s.id];
    s.face = face;
    const old = s.body, body = new Image();
    body.className = 'dlg-body dlg-face-in'; body.alt = p.name; body.draggable = false;
    body.src = PORTRAIT_DIR + p.faces[face].src;
    old.after(body);
    requestAnimationFrame(() => body.classList.remove('dlg-face-in'));
    setTimeout(() => old.remove(), FACE_FADE_MS + 40);
    s.body = body;
    placeEyes(s, p, portraitRect(p, s.side, view()));
  }
  function enter(side, id, face) {
    const s = makePortrait(side, id, face);
    s.node.classList.add('dlg-out');
    void s.node.offsetWidth;
    requestAnimationFrame(() => s.node.classList.remove('dlg-out'));
    shown[side] = s;
  }
  function leave(side) {
    const s = shown[side]; if (!s) return;
    shown[side] = null;
    s.node.classList.add('dlg-out', 'dlg-leaving');
    setTimeout(() => s.node.remove(), MOVE_MS + 40);
  }
  function applyStage(state, events) {
    for (const ev of events) {
      if (ev.type === 'exit') leave(ev.side);
      else if (ev.type === 'enter') enter(ev.side, ev.id, ev.face);
      else if (ev.type === 'face' && shown[ev.side]) setFace(shown[ev.side], ev.face);
      else if (ev.type === 'bg') setBg(ev.bg);
    }
    for (const side of ['left', 'right']) {
      const s = shown[side]; if (!s) continue;
      // 話していない人は暗く・少し下げる（だれも話していないときは、どちらも明るい）
      const talking = state.speaker === side || !state.speaker;
      s.node.classList.toggle('dlg-dim', !talking);
      s.node.classList.toggle('dlg-front', state.speaker === side);
    }
  }

  // ---- 文字 ----
  function showLine(line) {
    lineText = line ? line.text : '';
    lineT0 = performance.now(); nShown = -1;
    nameEl.hidden = !line?.name;
    nameEl.textContent = line?.name || '';
    nameEl.classList.toggle('right', line?.side === 'right');
    box.classList.remove('dlg-ready');
    tickText();
  }
  function tickText() {
    raf = 0;
    const all = chars(lineText);
    const n = Math.min(all.length, shownCount(lineText, performance.now() - lineT0));
    if (n !== nShown) {
      nShown = n;
      shownEl.textContent = all.slice(0, n).join('');
      restEl.textContent = all.slice(n).join(''); // 残りは透明で置いておく（改行の位置が途中で変わらないように）
    }
    if (n >= all.length) box.classList.add('dlg-ready');
    else raf = requestAnimationFrame(tickText);
  }
  function reveal() {
    lineT0 = performance.now() - typeDuration(lineText) - 1;
    cancelAnimationFrame(raf); tickText();
  }

  // ---- 進める ----
  function advance() {
    st = nextLine(st);
    applyStage(st, st.events);
    if (st.done) return finish(false);
    showLine(st.line);
    prefetchBg();
  }
  function onTap() {
    if (finished || !menu.hidden) return;
    const a = tapAction(st, nShown);
    if (a === 'reveal') reveal();
    else if (a === 'next') advance();
  }
  function finish(skip) {
    if (finished) return;
    finished = true; skipped = skip;
    cancelAnimationFrame(raf);
    bgSeq++;
    for (const im of bgWait) { im.onload = im.onerror = null; im.src = ''; }
    bgWait.clear();
    window.removeEventListener('keydown', onKey);
    resizeObs?.disconnect(); window.removeEventListener('resize', relayout);
    if (window.__dialog === ctl) delete window.__dialog;
    el.classList.add('dlg-closing');
    setTimeout(() => {
      el.remove();
      if (!host.querySelector('.dlg')) host.classList.remove('bc-dialog-open');
      resolveDone({ skipped });
    }, 220);
  }
  function openMenu() { menu.hidden = false; $('.dlg-close').focus({ preventScroll: true }); }
  function closeMenu() { menu.hidden = true; }

  let down = null;
  el.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
  el.addEventListener('click', e => {
    if (e.target.closest('.dlg-menu-btn')) { openMenu(); return; }
    if (e.target.closest('.dlg-menu')) {
      if (e.target.closest('.dlg-skip')) { closeMenu(); st = skipToEnd(st); finish(true); }
      else if (e.target.closest('.dlg-hub')) { closeMenu(); finish(true); opts.onHub(); }
      else if (e.target.closest('.dlg-close') || e.target === menu) closeMenu();
      return;
    }
    const moved = down && e.detail > 0 && Math.hypot(e.clientX - down.x, e.clientY - down.y) > TAP_SLOP;
    down = null;
    if (!moved) onTap();
  });
  // PC: Enter・スペース・→ で進む、Esc でメニュー
  function onKey(e) {
    if (!el.isConnected) { finish(true); return; } // ゲームごと閉じられた
    if (finished) return;
    if (e.key === 'Escape') { e.preventDefault(); menu.hidden ? openMenu() : closeMenu(); return; }
    if (!menu.hidden) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') { e.preventDefault(); onTap(); }
  }
  window.addEventListener('keydown', onKey);

  function relayout() {
    const b = boxRect(view());
    Object.assign(box.style, { left: `${b.x}px`, width: `${b.w}px`, height: `${b.h}px` });
    for (const side of ['left', 'right']) if (shown[side]) layoutOne(shown[side]);
  }
  const resizeObs = typeof ResizeObserver === 'function' ? new ResizeObserver(relayout) : null;
  resizeObs ? resizeObs.observe(el) : window.addEventListener('resize', relayout);

  // 自動テスト・スクショ用（出ている間だけ）
  const ctl = { tap: onTap, skip: () => { st = skipToEnd(st); finish(true); }, state: () => st, shown: () => nShown, done };
  window.__dialog = ctl;

  // 始まり: cast の人を出して、最初のセリフへ
  for (const side of ['left', 'right']) if (st.stage[side]) shown[side] = makePortrait(side, st.stage[side].id, st.stage[side].face);
  setBg(st.bg); // 台本の一番上の bg（始まりの背景）
  relayout();
  requestAnimationFrame(() => el.classList.add('dlg-open'));
  advance();
  opts.onOpen?.(ctl);
  return done;
}
