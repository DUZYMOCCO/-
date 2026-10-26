// 物語（試作）の章の表。「章の番号 → 章の中身」を引くだけの小さな表（1 章 1 行）。URL に ?storych=<番号> を付けた時だけ使う（付けなければ ☰ も画面も今のまま）。
// 1 章（?story=1・☰ の「物語（試作）」）はこの表を通らない（今の作りのまま）。2 章を足す時は、story-2.js を読み込んで下の表に `2: STORY_CH2,` を 1 行足すだけ。
// 番号が表に無い章は、選べないだけ（エラーにしない）。章の形: { id, title, order: [ステージ名...], stages: { ステージ名: { mission, label, hint, scriptUrl(kind), midScene(fx, seen) } }, markClear(stage) }
import { STORY_CH3 } from './story-3.js?v=1';

export const CHAPTERS = Object.freeze({
  3: STORY_CH3,
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
