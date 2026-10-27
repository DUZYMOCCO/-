// チュートリアルの「進み方」の決まり（画面を使わない・sim も読まない。Node のテストあり）。
//   ・始めるかの判断（URL・メニュー・はじめて起動した時の自動）
//   ・段の進み方（操作が起きたら次へ／「つぎへ」／とばす）と、終わった印
//   ・操作が起きたかの見張り（選んだ・命令した・カメラを動かした…を、前の様子との違いから見つける）

/** はじめて起動した時に自動で始めるか。今は止めたまま（true にすると、終わった印がない時だけ始まる） */
export const TUTORIAL_AUTOSTART = false;
/** 古い印の場所（v0.4.x。工房の storage）。v1.0.0 から印はセーブ bc-save-v1 の tutorial に入る（save.js が 1 回だけ移して、このキーを消す） */
export const TUTORIAL_MARK_KEY = 'botcommander_tutorial';
/** ほかのお試しの画面（ここでは自動で始めない） */
const OTHER_DEMOS = ['altdemo', 'chardemo', 'armory', 'dialogdemo'];

/** 印の中身。state は 'done'（さいごまで）か 'skipped'（やめた） */
export const makeMark = state => ({ v: 1, state });
export const isMarked = mark => !!mark && (mark.state === 'done' || mark.state === 'skipped');
/** 印を読む。store がセーブの入れ物（getTutorialMark がある。save.js の tutorialMarkStore）ならそれを、そうでなければ get/set の入れ物の古いキーを使う */
export function loadMark(store) {
  try { return typeof store?.getTutorialMark === 'function' ? store.getTutorialMark() : store.get(TUTORIAL_MARK_KEY, null); } catch { return null; }
}
export function saveMark(store, state) {
  try { return typeof store?.setTutorialMark === 'function' ? store.setTutorialMark(state) : store.set(TUTORIAL_MARK_KEY, makeMark(state)); } catch { return false; }
}

/**
 * チュートリアルで始めるか。
 *   on        ☰ メニューのボタンで「始める」と決まっている（v1.0.0 から ?tutorial=1 はなし）
 *   search    location.search（ほかのお試しの画面のときは自動で始めない）
 *   mark      印（loadMark の結果）
 *   autostart 自動で始めるフラグ（テスト用に差し替えられる。ふだんは TUTORIAL_AUTOSTART）
 */
export function wantsTutorial({ on = false, search = '', mark = null, autostart = TUTORIAL_AUTOSTART } = {}) {
  if (on) return true;
  const q = new URLSearchParams(search);
  if (OTHER_DEMOS.some(k => q.has(k))) return false;
  return !!autostart && !isMarked(mark);
}

/**
 * 操作をしめす（v1.0.0 の決定: その操作を教える段まで、その操作はできない）。
 * 段の id → その段で使えるようになる操作。ここにない操作（組①②③・ほかの下のボタンなど 'other'）は最後の段で使えるようになる。
 * 操作: select（ロボをタップ）・group（種類をまとめて選ぶ・囲む）・order（地面をタップして動かす）・mode（戦闘移動／急行）・attack（敵をタップ）
 *       pan（ドラッグ）・zoom（2本指・ホイール）・pause（⏸）・menu（☰）・speed（速さ）・other（そのほか）
 */
export const TEACHES = Object.freeze({ select: ['select'], group: ['group'], move: ['order'], mode: ['mode'], attack: ['attack'], pan: ['pan'], zoom: ['zoom'], pause: ['pause'], menu: ['menu'], speed: ['speed'] });
export const ALL_OPS = Object.freeze(['select', 'group', 'order', 'mode', 'attack', 'pan', 'zoom', 'pause', 'menu', 'speed', 'other']);
/** index 番目の段（0 から）で使える操作の集合。最後の段・終わった後は全部 */
export function allowedOps(steps, index) {
  if (index >= steps.length - 1 || steps[index]?.last) return new Set(ALL_OPS);
  const out = new Set();
  for (let i = 0; i <= index && i < steps.length; i++) for (const op of TEACHES[steps[i].id] || []) out.add(op);
  // とばした段（skipIf）の操作も、先の段に来たら使える（上の「i <= index」でふくまれる）
  return out;
}
/** 画面の部品（クリックされた要素）がどの操作か。わからない物（チュートリアルの吹き出し・メニューの中のほかのボタンなど）は null＝止めない */
export function opOfElement(el) {
  if (!el?.closest) return null;
  if (el.closest('.bc-tut')) return null;
  if (el.closest('[data-speed]')) return 'speed';
  if (el.closest('.bc-menu-btn')) return 'menu';
  if (el.closest('.bc-pause')) return 'pause';
  if (el.closest('.bc-picks') || el.closest('.bc-lasso')) return 'group';
  if (el.closest('.bc-act [data-act="mode"]')) return 'mode';
  if (el.closest('.bc-act') || el.closest('.bc-groups')) return 'other';
  return null;
}

/** 段の流れ。steps は tutorial-steps.js の STEPS（until: { type, test? } の段は、その操作が起きたら進む。until なしは「つぎへ」だけ） */
export function createFlow(steps) {
  let index = 0, result = null;
  const flow = {
    get index() { return index; },
    get step() { return result ? null : steps[index]; },
    get count() { return steps.length; },
    get finished() { return result !== null; },
    /** 'done'（さいごまで）か 'skipped'（やめた）。まだなら null */
    get result() { return result; },
    /** 操作の知らせ。いまの段が待っている操作なら進めて true */
    feed(ev) {
      const s = flow.step; if (!s || !s.until) return false;
      if (ev.type !== s.until.type) return false;
      if (s.until.test && !s.until.test(ev)) return false;
      return flow.next();
    },
    /** 「つぎへ」（または操作ができた）。最後の段のあとは done */
    next() {
      if (result) return false;
      if (index + 1 >= steps.length) { result = 'done'; return true; }
      index++; return true;
    },
    skip() { if (result) return false; result = 'skipped'; return true; },
  };
  return flow;
}

/**
 * 操作の見張り。snap() が返す「いまの様子」を前回と比べて、起きたことの知らせを返す。
 *   snap: { selected:[id], mark（命令の印。新しい物になったら命令）, mode, cam:{x,y,zoom}, paused, menuOpen, speed }
 * カメラは、段の始まり（reset）から動いた量で見る（ちょっと揺れたくらいでは進めない）。
 */
export function createWatcher(snap, { panPx = 24, zoomRatio = 0.08 } = {}) {
  let prev = null, base = null;
  const sig = s => s.selected.join(',');
  const watcher = {
    /** 段が変わった時などに呼ぶ。いまの様子を基準にする（これまでの変化は知らせない） */
    reset() { prev = snap(); base = { x: prev.cam.x, y: prev.cam.y, zoom: prev.cam.zoom }; },
    poll() {
      const now = snap(); if (!prev) { prev = now; base = { x: now.cam.x, y: now.cam.y, zoom: now.cam.zoom }; return []; }
      const ev = [];
      if (sig(now) !== sig(prev)) ev.push({ type: 'select', ids: [...now.selected] });
      if (now.mark && now.mark !== prev.mark) ev.push({ type: now.mark.attack ? 'attack' : 'order' });
      if (now.mode !== prev.mode) ev.push({ type: 'mode', mode: now.mode });
      if (now.paused !== prev.paused) ev.push({ type: 'pause', paused: now.paused });
      if (now.menuOpen !== prev.menuOpen) ev.push({ type: 'menu', open: now.menuOpen });
      if (now.speed !== prev.speed) ev.push({ type: 'speed', speed: now.speed });
      if (Math.hypot(now.cam.x - base.x, now.cam.y - base.y) * now.cam.zoom > panPx) { ev.push({ type: 'pan' }); base.x = now.cam.x; base.y = now.cam.y; }
      if (Math.abs(now.cam.zoom / base.zoom - 1) > zoomRatio) { ev.push({ type: 'zoom' }); base.zoom = now.cam.zoom; }
      prev = now; return ev;
    },
  };
  return watcher;
}
