// 物語の最初のミッション（試作）の流れ: 出撃前の会話 → ミッション → 勝った／負けた時の会話 → 結果の画面。
// 画面を使わない部分だけをここに置く（テストから呼べる）。会話を出すのは index.js の playDialog、台本は assets/story/story1_*.json。
// ミッションの中身は js/story/story-mission.js の STORY_1。URL に ?story=1 を付けた時と、☰ メニューの「物語（試作）」から始まる。

/** 台本の場所（index.js から見て js/story/ の 2 つ上の assets/story/） */
export const STORY1_SCRIPT_FILES = Object.freeze({
  intro: 'story1_intro.json',
  found: 'story1_found.json', // v1.0.2: ミサイルを掘り出した時（ミッションの途中）
  after: 'story1_after.json', // v1.0.2: ミサイルが落ちた時（ミッションの途中）
  win: 'story1_win.json',
  lose: 'story1_lose.json',
});

/** 台本の JSON の URL（kind は 'intro' | 'found' | 'after' | 'win' | 'lose'） */
export function storyScriptUrl(kind) {
  const f = STORY1_SCRIPT_FILES[kind];
  if (!f) throw new Error(`物語の台本がありません: ${kind}`);
  return new URL(`../../assets/story/${f}`, import.meta.url).href;
}

/** 物語の流れの始まりの状態。intro: 出撃前の会話をまだ出していない／ending: 出撃後の会話を出している途中（二度出さない） */
export const newStoryState = () => ({ intro: true, ending: false, mid: {} });

/** v1.0.2: ミッションの途中の会話。シムの fx（見た目の合図）の種類 → 台本。1 回のミッションで 1 度だけ出す */
export const STORY1_MID_SCENES = Object.freeze({ missileFound: 'found', strikeHit: 'after' });

/** 途中の会話を出すか（出すなら台本の種類、出さないなら null）。seen は newStoryState().mid（出した物を覚える） */
export function midScene(fxType, seen) {
  const kind = STORY1_MID_SCENES[fxType];
  if (!kind || seen?.[kind]) return null;
  if (seen) seen[kind] = true;
  return kind;
}

/** ミッションの結果（sim.result）に合う出撃後の台本。まだ終わっていなければ null */
export function endingKind(result) {
  return result === 'win' ? 'win' : result === 'lose' ? 'lose' : null;
}
