// 物語（試作）の章の表。「章の番号 → 章の中身」を引くだけの小さな表（1 章 1 行）。URL に ?storych=<番号> を付けた時だけ使う（付けなければ ☰ も画面も今のまま）。
// 1 章（?story=1・☰ の「物語（試作）」）はこの表を通らない（今の作りのまま）。2 章を足す時は、story-2.js を読み込んで下の表に `2: STORY_CH2,` を 1 行足すだけ。
// 番号が表に無い章は、選べないだけ（エラーにしない）。章の形: { id, title, order: [ステージ名...], stages: { ステージ名: { mission, label, hint, scriptUrl(kind), midScene(fx, seen) } }, markClear(stage) }
import { STORY_CH3 } from './story-3.js?v=2';
import { STORY_1 } from './story-mission.js?v=3';
import { storyScriptUrl, midScene } from './story-1.js?v=3';
import { STORY_2 } from './story-2.js?v=2';
import { STORY2_MISSIONS } from './story2-missions.js?v=2';
import { storyHud, storyResultText } from './story-ops.js?v=4';
import { story2Hud, story2ResultText } from './story-2.js?v=2';
import { story3Hud, story3ResultText } from './story3-ops.js?v=2';

// 元の章データを変更せず、全章を同じ形に変換する。
const story1 = Object.freeze({ id: 1, title: '第1章 はじまり', order: ['1-1'],
  stages: { '1-1': { mission: STORY_1, label: '1-1 はじまり', scriptUrl: storyScriptUrl, midScene: (f, seen) => midScene(f.type, seen) } }, hud: storyHud, resultText: storyResultText });
const story2 = Object.freeze({ id: 2, title: '第2章 町はずれの声', order: ['2-1', '2-2'],
  stages: Object.fromEntries(STORY2_MISSIONS.map((mission, i) => { const state = { step: i + 1 }; return [`2-${i + 1}`, { mission, label: `2-${i + 1} ${mission.title}`, scriptUrl: kind => STORY_2.scriptUrl(kind, state), midScene: (f, seen) => seen[f.type] ? null : (seen[f.type] = true, f.type) }]; })), hud: story2Hud, resultText: story2ResultText });
const story3 = Object.freeze({ ...STORY_CH3, hud: story3Hud, resultText: story3ResultText });


export const CHAPTERS = Object.freeze({
  1: story1,
  2: story2,
  3: story3,
});

/** URL の ?storych=N から章の番号を取り出す。表に無い・書いていないなら null */
export function chapterFlag(search) {
  let n = NaN;
  try { n = Number(new URLSearchParams(search || '').get('storych')); } catch { return null; }
  return Number.isInteger(n) && CHAPTERS[n] ? n : null;
}

/** 章のステージ。無ければ null */
export const stageOf = (ch, stage) => CHAPTERS[ch]?.stages[stage] || null;

/** 章の物語の始まりの状態（1 章の newStoryState に ch・stage を足した形）。stage を省くと章の最初 */
export function newChapterStory(ch, stage) {
  const c = CHAPTERS[ch];
  return { intro: true, ending: false, mid: {}, ch, stage: c?.stages[stage] ? stage : c?.order[0] };
}

/** 次のステージの名前（最後なら null） */
export function nextStage(ch, stage) {
  const o = CHAPTERS[ch]?.order || [], i = o.indexOf(stage);
  return i >= 0 && i + 1 < o.length ? o[i + 1] : null;
}

/** 開放は章を最後までクリアした時だけ。壊れた値は第1章に戻す。 */
export const CHAPTER_SAVE_KEY = 'bot-commander.chapters.v1';
export function loadUnlocked(store = globalThis.localStorage) {
  try { const data = JSON.parse(store.getItem(CHAPTER_SAVE_KEY)); return Number.isInteger(data?.unlocked) && data.unlocked >= 1 && data.unlocked <= 3 ? data.unlocked : 1; } catch { return 1; }
}
export function unlockAfter(ch, store = globalThis.localStorage) {
  const unlocked = Math.max(loadUnlocked(store), Math.min(3, ch + 1));
  try { store.setItem(CHAPTER_SAVE_KEY, JSON.stringify({ unlocked })); } catch { /* 保存できなくてもゲームは続く */ }
  return unlocked;
}
export function chaptersRequested(search) {
  const p = new URLSearchParams(search || '');
  return p.get('story') === '1' || p.get('chapters') === '1' || chapterFlag(search) !== null;
}

/** 旧式の状態も共通の章表へ変換する。 */
export function stageForStory(state) {
  if (!state) return null;
  const ch = state.ch || state.chapter || 1;
  const stage = state.stage || (ch === 2 ? `2-${state.step}` : CHAPTERS[ch]?.order[0]);
  return stageOf(ch, stage);
}
