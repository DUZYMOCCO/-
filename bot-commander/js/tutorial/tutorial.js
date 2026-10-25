// チュートリアルの画面側（js/index.js から、始める時だけ読み込まれる）。
//   画面を少し暗くして、教える所だけ光らせ（穴＋枠）、近くに短い文の吹き出しを出す。重ねは pointer-events なし（ふつうの操作を止めない）。
//   段が進むのは、操作が起きたのを見張り（tutorial-flow.js の createWatcher）が見つけた時か、「つぎへ」を押した時。「やめる」でいつでも抜けられる。
//   v1.0.0: その操作を教える段まで、その操作はできない（地図の操作は game.tutorial.allows を input.js が見る・画面のボタンはここで止める）。
//   sim の値は書きかえない（選ぶ・戦闘移動にもどす・速さ 1x は、ふだんの操作の入口 game.select / r.ui.mode / game.setSpeed を使う）。
import { loadCss } from '../../../common/js/load-css.js';
import { tutorialMarkStore } from '../save/save.js?v=3';
import { toTile } from '../sim/map.js?v=6';
import { createFlow, createWatcher, saveMark, allowedOps, opOfElement } from './tutorial-flow.js?v=2';
import { STEPS, aheadPoint, ponco, startView } from './tutorial-steps.js?v=3';

await loadCss(new URL('../../css/tutorial.css?v=2', import.meta.url).href); // 読み込み終わってから使えるように（import した側が待つ）

export { createTutorialSim } from './tutorial-steps.js?v=3';

const PAD = 6;          // 光らせる枠を、対象より外へ広げる量 px
const GAP = 10;         // 吹き出しと光らせる所のすき間 px
const EDGE = 8;         // 吹き出しと画面の端のすき間 px
const UNIT_HALF = 22;   // 機体の光らせる大きさ（ワールド座標の半分の幅。ズームに合わせる）

/** ☰ メニューの「チュートリアル」ボタン: 1回目は確かめの文字、もう一度押すと go() */
export function pressMenuButton(btn, go) {
  const label = btn.dataset.label || (btn.dataset.label = btn.textContent);
  if (btn.dataset.armed) { delete btn.dataset.armed; btn.textContent = label; go(); return; }
  btn.dataset.armed = '1'; btn.textContent = '押すと始まる（進み具合は消える）';
  clearTimeout(btn._armTimer);
  btn._armTimer = setTimeout(() => { delete btn.dataset.armed; btn.textContent = label; }, 4000);
}

/** チュートリアルを始める。game は index.js の入口オブジェクト（r・sim・state・el・menuOpen・select・setSpeed・renderAct・restart を使う） */
export function runTutorial(game) {
  const root = game.el.root;
  const flow = createFlow(STEPS);
  const el = document.createElement('div');
  el.className = 'bc-tut';
  el.innerHTML = '<div class="bc-tut-hole" hidden></div>'
    + '<div class="bc-tut-bubble"><p class="bc-tut-text"></p><div class="bc-tut-row"><span class="bc-tut-n"></span><button class="bc-tut-skip">やめる</button><button class="bc-tut-cont" hidden>れんしゅうをつづける</button><button class="bc-tut-next">つぎへ</button></div></div>'
    + '<div class="bc-tut-probe"></div>';
  root.appendChild(el);
  const hole = el.querySelector('.bc-tut-hole'), bubble = el.querySelector('.bc-tut-bubble'), textEl = el.querySelector('.bc-tut-text'), nEl = el.querySelector('.bc-tut-n');
  const skipBtn = el.querySelector('.bc-tut-skip'), nextBtn = el.querySelector('.bc-tut-next'), contBtn = el.querySelector('.bc-tut-cont'), probe = el.querySelector('.bc-tut-probe');
  let raf = 0, alive = true, shownIndex = -1, holeKey = null, bubbleKey = '', bubbleW = 0, fixedPoint = null, safe = null;

  const snap = () => {
    const r = game.r, st = game.state;
    return { selected: r ? r.ui.selected : [], mark: r ? r.ui.mark : null, mode: r ? r.ui.mode : 'fight', cam: r ? { x: r.cam.x, y: r.cam.y, zoom: r.cam.zoom } : { x: 0, y: 0, zoom: 1 }, paused: !!st?.paused, menuOpen: !!game.menuOpen, speed: st?.speed };
  };
  const watcher = createWatcher(snap);
  const ctx = () => ({ sim: game.sim, state: game.state, menuOpen: !!game.menuOpen });

  const setView = () => { const v = startView(game.sim); game.r.cam.x = v.x; game.r.cam.y = v.y; game.r.clampCam(); }; // 味方と練習の敵が両方入るカメラ
  const PREP = {
    view: () => setView(),
    clearSel: () => game.select([], false),
    selectPonco: () => { if (!game.r.ui.selected.length) game.select(ponco(game.sim).map(u => u.id), false); },
    selectOne: () => { if (game.r.ui.selected.length !== 1) { const u = ponco(game.sim)[0]; if (u) game.select([u.id], false); } },
    fight: () => { game.r.ui.mode = 'fight'; game.renderAct(); },
    speed1: () => game.setSpeed(1),
  };

  /** 段に入った時: とばす段か見て、やることをやって、文を出す */
  function enter() {
    while (flow.step?.skipIf && game.sim && flow.step.skipIf(ctx())) flow.next(); // とばす段が続いても進む
    const s = flow.step; if (!s) return finish(true);
    if (game.r && game.sim) for (const p of s.prep || []) PREP[p]?.();
    fixedPoint = s.target?.point === 'ahead' && game.sim ? aheadPoint(game.sim) : null;
    watcher.reset();
    textEl.textContent = s.text; nEl.textContent = `${flow.index + 1}/${flow.count}`;
    nextBtn.textContent = s.last ? 'ほんばんへ' : 'つぎへ';
    contBtn.hidden = !s.last; skipBtn.hidden = !!s.last;
    shownIndex = flow.index; holeKey = null; bubbleKey = '';
  }

  /** 終わり（さいごまで／やめた）。印を残して重ねを外す。toMain なら、ふつうのミッションをはじめから */
  function finish(toMain) {
    if (!alive) return;
    saveMark(tutorialMarkStore, flow.result || 'done');
    game.tutorialOn = false;
    destroy();
    if (toMain) game.restart();
  }

  skipBtn.addEventListener('click', () => { flow.skip(); finish(true); });
  nextBtn.addEventListener('click', () => { flow.next(); if (flow.finished) finish(true); else enter(); });
  contBtn.addEventListener('click', () => { flow.next(); finish(false); });

  // ---- 光らせる所（root の左上を 0,0 にした画面の座標） ----
  const rootRect = () => root.getBoundingClientRect();
  function boundsOf(pts) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of pts) { x0 = Math.min(x0, p.x - p.hw); x1 = Math.max(x1, p.x + p.hw); y0 = Math.min(y0, p.y - p.hh); y1 = Math.max(y1, p.y + p.hh); }
    return pts.length ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null;
  }
  function targetRect(t) {
    const r = game.r, sim = game.sim;
    if (!t) return null;
    if (t.css) {
      const node = root.querySelector(t.css); if (!node || node.closest('[hidden]')) return null;
      const b = node.getBoundingClientRect(), o = rootRect(); if (!b.width || !b.height) return null;
      return { x: b.left - o.left, y: b.top - o.top, w: b.width, h: b.height };
    }
    if (!r || !sim) return null;
    const a = game.el.stage.getBoundingClientRect(), o = rootRect(), ox = a.left - o.left, oy = a.top - o.top, half = Math.max(16, UNIT_HALF * r.cam.zoom);
    const at = (x, y, hw, hh) => { const p = r.worldToScreen(x, y); return { x: p.x + ox, y: p.y + oy, hw, hh }; };
    if (t.units === 'ponco') return boundsOf(ponco(sim).map(u => at(u.x, u.y - 6, half, half)));
    if (t.units === 'enemy') return boundsOf(sim.units.filter(u => u.side === 'enemy' && u.hp > 0 && sim.fog.isVisible(toTile(u.x), toTile(u.y))).map(u => at(u.x, u.y - 6, half * 1.2, half * 1.2)));
    if (t.point && fixedPoint) { const h = Math.max(28, 30 * r.cam.zoom), p = at(fixedPoint.x, fixedPoint.y, h, h); return { x: p.x - h, y: p.y - h, w: h * 2, h: h * 2 }; }
    return null;
  }
  const onScreen = (b, W, H) => b && b.x + b.w > 0 && b.y + b.h > 0 && b.x < W && b.y < H;

  function layout() {
    const o = rootRect(), W = o.width, H = o.height;
    if (!safe) { const cs = getComputedStyle(probe); safe = { top: parseFloat(cs.paddingTop) || 0, bottom: parseFloat(cs.paddingBottom) || 0 }; }
    const s = flow.step; if (!s) return;
    let b = targetRect(s.target); if (!onScreen(b, W, H)) b = null;
    if (b) b = { x: Math.round(b.x - PAD), y: Math.round(b.y - PAD), w: Math.round(b.w + PAD * 2), h: Math.round(b.h + PAD * 2) };
    const hk = b ? `${b.x},${b.y},${b.w},${b.h}` : '';
    if (hk !== holeKey) {
      holeKey = hk; hole.hidden = !b;
      if (b) { hole.style.left = `${b.x}px`; hole.style.top = `${b.y}px`; hole.style.width = `${b.w}px`; hole.style.height = `${b.h}px`; }
    }
    // 吹き出し: 光らせる所の上か下のあいている方（上半分にあるものは下へ）。横は画面の中へ収める
    const bw = Math.min(W - EDGE * 2, 340);
    if (bw !== bubbleW) { bubbleW = bw; bubble.style.width = `${bw}px`; }
    const bh = bubble.offsetHeight, minY = safe.top + EDGE, maxY = H - safe.bottom - EDGE - bh;
    let y = safe.top + 128, cx = W / 2;
    if (b) {
      cx = b.x + b.w / 2;
      const below = b.y + b.h + GAP, above = b.y - GAP - bh, fitBelow = below <= maxY, fitAbove = above >= minY;
      y = b.y + b.h / 2 < H / 2 ? (fitBelow ? below : fitAbove ? above : maxY) : (fitAbove ? above : fitBelow ? below : minY);
    }
    y = Math.round(Math.max(minY, Math.min(maxY, y)));
    const x = Math.round(Math.max(EDGE, Math.min(W - bw - EDGE, cx - bw / 2)));
    const bk = `${x},${y},${shownIndex}`;
    if (bk !== bubbleKey) { bubbleKey = bk; bubble.style.left = `${x}px`; bubble.style.top = `${y}px`; }
  }

  function frame() {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    if (!game.r || !game.sim) { hole.hidden = true; holeKey = null; return; }
    for (const ev of watcher.poll()) { if (flow.feed(ev)) { if (flow.finished) return finish(true); enter(); break; } }
    const s = flow.step;
    if (s?.skipIf && s.skipIf(ctx())) { flow.next(); if (flow.finished) return finish(true); enter(); }
    layout();
  }

  /** いまの段で、その操作ができるか（終わった後・外した後は全部できる） */
  const allows = op => !alive || flow.finished || allowedOps(STEPS, flow.index).has(op);
  // 画面のボタン: まだ教えていない物は押しても何もしない（地図より先に、とらえる段階で止める）
  const blockUi = e => {
    const op = opOfElement(e.target); if (!op || allows(op)) return;
    e.stopPropagation(); e.preventDefault();
    if (e.type === 'click' && game.el.hint) game.el.hint.textContent = 'いまは光っている所をさわろう（チュートリアル）';
  };
  const UI_EVENTS = ['click', 'pointerdown', 'pointerup'];
  for (const t of UI_EVENTS) root.addEventListener(t, blockUi, true);

  function destroy() {
    if (!alive) return; alive = false;
    for (const t of UI_EVENTS) root.removeEventListener(t, blockUi, true);
    cancelAnimationFrame(raf); el.remove();
    if (game.tutorial === api) game.tutorial = null;
  }
  const api = { destroy, flow, allows, get alive() { return alive; } };
  if (game.r && game.sim) setView(); // 始めのカメラ
  enter();
  raf = requestAnimationFrame(frame);
  return api;
}
