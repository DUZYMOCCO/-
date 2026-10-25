// 会話（立ち絵＋セリフ）の台本を読んで、「今どの行か・だれが話しているか・左右にだれがいて、どの表情か」を決める。
// DOM なし（テストから呼ぶ）。画面に出すのは dialog-view.js。台本の書き方は assets/dialog/README.md。
// 台本の1行（step）は次のどれか:
//   { who, face?, text }   セリフ。who はいま出ている人。face を書くとその表情に替えてから話す
//   { who, face }          話さずに表情だけ替える（すぐ次へ進む。話さない少年など）
//   { enter, face? }       登場。立つ側は portraits.json の side で決まる（同じ側にいた人は下がる）
//   { exit }               退場
//   { bg }                 背景だけ替える（すぐ次へ進む）。どの行にも bg を足せて、その行から背景が替わる（null で背景なし）
// 台本の一番上の bg は始まりの背景。名前は dialog-bg.js の 13 こ。

import { isBgName, BG_NAMES } from './dialog-bg.js?v=2';

export const DEFAULT_FACE = 'neutral';
export const SIDES = Object.freeze(['left', 'right']);

/** 台本の誤りを全部さがす。返り値は日本語の文の配列（空なら正しい）。portraits は portraits.json の chars */
export function checkScript(script, portraits) {
  const errs = [];
  if (!script || typeof script !== 'object') return ['台本が空です'];
  const bgOk = (bg, where) => {
    if (bg === null || isBgName(bg)) return;
    errs.push(`${where}: 知らない背景「${bg}」（${BG_NAMES.join('・')} か null）`);
  };
  if ('bg' in script) bgOk(script.bg, '台本の bg');
  if (!Array.isArray(script.lines) || !script.lines.length) errs.push('lines（セリフの並び）がありません');
  const known = id => {
    if (portraits[id]) return true;
    errs.push(`いない人: ${id}`); return false;
  };
  const faceOk = (id, face, where) => {
    if (face == null || !portraits[id]) return;
    if (!portraits[id].faces?.[face]) errs.push(`${where}: ${id} に「${face}」の表情はありません`);
  };
  // 出ている人を順に追いかけて、いない人が話す・同じ人が2回出る、などを見つける
  const on = { left: null, right: null };
  const cast = script.cast || {};
  if (typeof cast !== 'object' || Array.isArray(cast)) errs.push('cast は { "ID": "表情" } の形で書きます');
  else for (const [id, face] of Object.entries(cast)) {
    if (!known(id)) continue;
    faceOk(id, face || DEFAULT_FACE, 'cast');
    const side = portraits[id].side;
    if (on[side]) errs.push(`cast: ${on[side]} と ${id} はどちらも${side === 'left' ? '左' : '右'}に立つ人です`);
    else on[side] = id;
  }
  (script.lines || []).forEach((s, i) => {
    const at = `${i + 1}行目`;
    if (!s || typeof s !== 'object') { errs.push(`${at}: 形がちがいます`); return; }
    if ('bg' in s) bgOk(s.bg, at);
    if (s.enter != null) {
      if (!known(s.enter)) return;
      faceOk(s.enter, s.face || DEFAULT_FACE, at);
      if (on.left === s.enter || on.right === s.enter) errs.push(`${at}: ${s.enter} はもう出ています`);
      on[portraits[s.enter].side] = s.enter;
    } else if (s.exit != null) {
      if (!known(s.exit)) return;
      const side = SIDES.find(k => on[k] === s.exit);
      if (!side) errs.push(`${at}: ${s.exit} は出ていないので下がれません`);
      else on[side] = null;
    } else if (s.who != null) {
      if (!known(s.who)) return;
      faceOk(s.who, s.face, at);
      if (on.left !== s.who && on.right !== s.who) errs.push(`${at}: ${s.who} は出ていないので話せません（先に enter で出す）`);
      if (s.text == null && s.face == null) errs.push(`${at}: text も face もありません`);
      if (s.text != null && typeof s.text !== 'string') errs.push(`${at}: text は文字で書きます`);
    } else if (!('bg' in s)) errs.push(`${at}: who・enter・exit のどれもありません`);
  });
  return errs;
}

/** 始まりの状態。誤りのある台本は投げる（作る人がすぐ気づけるように） */
export function startDialog(script, portraits) {
  const errs = checkScript(script, portraits);
  if (errs.length) throw new Error('台本の誤り: ' + errs.join(' / '));
  const stage = { left: null, right: null };
  for (const [id, face] of Object.entries(script.cast || {})) stage[portraits[id].side] = { id, face: face || DEFAULT_FACE };
  return { script, portraits, i: -1, stage, speaker: null, line: null, done: false, events: [], bg: script.bg ?? null };
}

/**
 * 次のセリフまで進める（登場・退場・表情だけの行はまとめて流す）。新しい状態を返す（前の状態は変えない）。
 * events: この1回で起きたこと（画面のアニメ用）。{ type: 'enter'|'exit'|'face', side, id, face } と { type: 'bg', bg }（背景が替わった時だけ）
 */
export function nextLine(st) {
  if (st.done) return st;
  const { script, portraits } = st;
  const stage = { left: st.stage.left && { ...st.stage.left }, right: st.stage.right && { ...st.stage.right } };
  const events = [];
  const sideOf = id => SIDES.find(k => stage[k]?.id === id);
  let bg = st.bg;
  for (let i = st.i + 1; i < script.lines.length; i++) {
    const s = script.lines[i];
    if ('bg' in s && (s.bg ?? null) !== bg) { bg = s.bg ?? null; events.push({ type: 'bg', bg }); }
    if (s.enter == null && s.exit == null && s.who == null) continue; // bg だけの行
    if (s.enter != null) {
      const side = portraits[s.enter].side;
      if (stage[side]) events.push({ type: 'exit', side, id: stage[side].id });
      stage[side] = { id: s.enter, face: s.face || DEFAULT_FACE };
      events.push({ type: 'enter', side, id: s.enter, face: stage[side].face });
      continue;
    }
    if (s.exit != null) {
      const side = sideOf(s.exit);
      stage[side] = null;
      events.push({ type: 'exit', side, id: s.exit });
      continue;
    }
    const side = sideOf(s.who);
    if (s.face != null && s.face !== stage[side].face) {
      stage[side].face = s.face;
      events.push({ type: 'face', side, id: s.who, face: s.face });
    }
    if (s.text == null) continue; // 表情だけ
    const p = portraits[s.who];
    return { ...st, i, stage, events, bg, speaker: side, line: { who: s.who, side, name: p.speaks === false ? '' : p.name, text: s.text, face: stage[side].face } };
  }
  return { ...st, i: script.lines.length, stage, events, bg, speaker: null, line: null, done: true };
}

/** 最後まで一気に進めた状態（スキップ用） */
export function skipToEnd(st) {
  let s = st;
  while (!s.done) s = nextLine(s);
  return s;
}

// 1文字ずつ出す速さ。句読点のあとは少し待つ（文字数に足す重さ）
export const TYPE_CPS = 32;
const PAUSE = { '。': 5, '！': 5, '？': 5, '!': 5, '?': 5, '、': 2.5, '…': 1.5, '\n': 3 };

/** 文字を1つずつに分ける（絵文字などの2つで1文字も1文字として数える） */
export const chars = text => Array.from(text || '');

/** 話し始めてから ms ミリ秒で、何文字まで出ているか */
export function shownCount(text, ms, cps = TYPE_CPS) {
  const cs = chars(text);
  let budget = Math.max(0, ms) * cps / 1000, n = 0;
  for (const c of cs) {
    if (budget < 1) break;
    budget -= 1; n++;
    budget -= PAUSE[c] || 0;
  }
  return n;
}

/** 全部出し終わるまでのミリ秒 */
export function typeDuration(text, cps = TYPE_CPS) {
  return chars(text).reduce((a, c) => a + 1 + (PAUSE[c] || 0), 0) * 1000 / cps;
}

/** タップしたときにすること: 文字が出ている途中なら 'reveal'（全部出す）、出し終わっていれば 'next'、終わっていれば 'end' */
export function tapAction(st, shown) {
  if (st.done) return 'end';
  if (st.line && shown < chars(st.line.text).length) return 'reveal';
  return 'next';
}

/** 台本に出てくる人と表情を全部あげる（先に絵を読んでおく用）。[{ id, face }] */
export function facesUsed(script) {
  const seen = new Set(), out = [];
  const add = (id, face) => { const k = `${id}/${face}`; if (!seen.has(k)) { seen.add(k); out.push({ id, face }); } };
  for (const [id, face] of Object.entries(script.cast || {})) add(id, face || DEFAULT_FACE);
  for (const s of script.lines || []) {
    if (s.enter != null) add(s.enter, s.face || DEFAULT_FACE);
    else if (s.who != null && s.face != null) add(s.who, s.face);
  }
  return out;
}

/** 台本に出てくる背景の名前を、出てくる順にあげる（null は入れない・重ねない）。先に絵を読む用 */
export function bgsUsed(script) {
  const out = [];
  const add = bg => { if (typeof bg === 'string' && !out.includes(bg)) out.push(bg); };
  if (script) add(script.bg);
  for (const s of script?.lines || []) if (s && typeof s === 'object') add(s.bg);
  return out;
}

/** いまの行より先で、次に出てくる背景の名前（なければ null）。次の絵を先に読み始める用 */
export function upcomingBg(st) {
  for (let i = st.i + 1; i < st.script.lines.length; i++) {
    const s = st.script.lines[i];
    if (s && typeof s === 'object' && typeof s.bg === 'string') return s.bg;
  }
  return null;
}
