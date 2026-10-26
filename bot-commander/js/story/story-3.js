// 第 3 章「最初のひとり」（物語の試作・URL に ?storych=3 を付けた時だけ）: ミッション 3-1・3-2 のデータと、流れ（会話の台本の場所・途中の会話・章の保存）。
// 画面を使わない部分だけ（テストから呼べる）。会話を出すのは index.js の playDialog、台本は assets/story/story3_*.json。数値は全部【仮】。
// 1 章（story-1.js・story-mission.js）と同じ形: ミッションのデータは STORY_3_1・STORY_3_2、仕掛けの計算は js/sim/story3-sim.js、HUD の文字は story3-ops.js。
// 章の表（js/story/chapters.js）に 1 行足すと、?storych=3 で選べる。2 章など別の章も同じ形（stages・order・title）で足す。
// スーツ（js/sim/powersuit.js）は mission.suit が true のミッションの中だけ、?powersuit=1 なしで使える。

/** 敵の HP の倍率（名前 → 倍率）。異星生物の HP 360 のままでは、ロボ 1 台とスーツの少年では勝てない（実測は CHANGES.md）ので、第 3 章の中だけ下げる。G09 は重いので他より大きい。【仮】 */
const HP_MUL = Object.freeze({ 'ガトリングガエル': 0.20, 'ホノオミジンコ': 0.20, 'ハサミアリ': 0.20, 'ハサミアリ（とおく）': 0.20, 'センシャヤドカリ': 0.50 });

/** 3-1「スーツの はつじん」: 川の北の道を通って隣町の門へ。途中の見張りを倒して、門の張り紙を調べる。
 *  敵は今ある 'alien' で代用（G01 ガトリングガエル・G02 ホノオミジンコ・G08 ハサミアリ。新しい敵を使うなら CHANGES.md の案） */
export const STORY_3_1 = Object.freeze({
  id: 'story3-1',
  title: 'スーツの はつじん（仮）',
  win: 'gate',
  target: 1,             // 使わない（張り紙を調べ終えたら勝ち）。MISSION_1 と同じ形にするため
  salvage: [],
  extraction: { tx: 20, ty: 56 }, // 拠点（はじめの場所）。スーツはここで直る（powersuit.js の repairRate）
  nest: { tx: 4, ty: 22 },
  suit: true,             // この中ではスーツを使える（?powersuit=1 は要らない）
  story3: { stage: '3-1', gate: { tx: 26, ty: 38, amount: 8, name: '門の はりがみ' }, hpMul: HP_MUL },
  ally: [
    { kind: 'scav', tx: 20, ty: 55, count: 1, cls: 'scavenger', name: 'ネジ' },
    { kind: 'ponco', tx: 18, ty: 55, count: 1, cls: 'gunner', name: 'PONCO02' },
    { kind: 'boy', tx: 21, ty: 57 },
  ],
  aliens: [
    { name: 'ガトリングガエル', kind: 'alien', count: 2, route: [{ tx: 15, ty: 49 }, { tx: 26, ty: 47 }] },   // 道の途中を行き来する（G01）
    { name: 'ホノオミジンコ', kind: 'alien', count: 1, route: [{ tx: 29, ty: 39 }, { tx: 30, ty: 38 }] },     // 門のそば（G02）
    { name: 'ハサミアリ', kind: 'alien', count: 1, route: [{ tx: 25, ty: 36 }, { tx: 28, ty: 37 }] },        // 門の見張り（G08）
  ],
});

/** 3-2「最初のひとり」: 隣町の門から入り、倒れたビルのミントを助けて、門まで送る。
 *  人間の枠（3）: 少年・ミント（途中で加わる）。ロウは姿を出さず声だけ（遠ぼえで G08 の 1 体を引き離した）。 */
export const STORY_3_2 = Object.freeze({
  id: 'story3-2',
  title: '最初のひとり（仮）',
  win: 'mintHome',
  target: 1,
  salvage: [],
  extraction: { tx: 26, ty: 37 }, // 隣町の門（脱出口。拠点としてスーツも直る）
  nest: { tx: 4, ty: 22 },
  suit: true,
  story3: { stage: '3-2', mint: { tower: { tx: 24, ty: 25 }, guard: 'センシャヤドカリ', carrier: 'ハサミアリ' }, rubble: 4, hpMul: HP_MUL }, // rubble＝COVER_LAYOUT の 4 番（ビル）を倒れた状態に
  ally: [
    { kind: 'scav', tx: 26, ty: 38, count: 1, cls: 'scavenger', name: 'ネジ' },
    { kind: 'ponco', tx: 24, ty: 38, count: 1, cls: 'gunner', name: 'PONCO02' },
    { kind: 'boy', tx: 27, ty: 39 },
  ],
  aliens: [
    { name: 'センシャヤドカリ', kind: 'alien', count: 1, route: [{ tx: 24, ty: 28 }, { tx: 25, ty: 28 }] },  // ビルの入口（G09。ほかの代用敵よりHPが2.5倍）
    { name: 'ハサミアリ', kind: 'alien', count: 1, route: [{ tx: 12, ty: 27 }, { tx: 14, ty: 26 }] },       // ミントを運ぶ（G08）
    { name: 'ハサミアリ（とおく）', kind: 'alien', count: 1, route: [{ tx: 36, ty: 20 }, { tx: 36, ty: 25 }] }, // ロウが引き離した 1 体（G08）
    { name: 'ガトリングガエル', kind: 'alien', count: 1, route: [{ tx: 30, ty: 31 }, { tx: 33, ty: 29 }] },  // 帰り道のじゃま（G01）
  ],
});

/** 台本の場所（assets/story/ の中）。kind: intro（出撃前）・win・lose・broken（スーツが壊れて脱げた時）・found（ミントが見つかった）・taken（ミントが捕まった） */
export const STORY3_SCRIPT_FILES = Object.freeze({
  '3-1': Object.freeze({ intro: 'story3_1_intro.json', win: 'story3_1_win.json', lose: 'story3_1_lose.json', broken: 'story3_broken.json' }),
  '3-2': Object.freeze({ intro: 'story3_2_intro.json', found: 'story3_2_found.json', taken: 'story3_2_taken.json', win: 'story3_2_win.json', lose: 'story3_2_lose.json', broken: 'story3_broken.json' }),
});

/** 台本の JSON の URL（index.js から見て js/story/ の 2 つ上の assets/story/） */
export function story3ScriptUrl(stage, kind) {
  const f = STORY3_SCRIPT_FILES[stage]?.[kind];
  if (!f) throw new Error(`第3章の台本がありません: ${stage} ${kind}`);
  return new URL(`../../assets/story/${f}`, import.meta.url).href;
}

/** ミッションの途中の会話。シムの fx（見た目の合図）→ 台本の種類。1 回のミッションで 1 度だけ。出さないなら null */
export function story3MidScene(f, seen, stage) {
  let kind = null;
  if (f.type === 'suitBreak') kind = 'broken';
  else if (stage === '3-2' && f.type === 'mintFound') kind = 'found';
  else if (stage === '3-2' && f.type === 'captured' && f.label === 'ミント') kind = 'taken';
  if (!kind || seen?.[kind]) return null;
  if (seen) seen[kind] = true;
  return kind;
}

/** 章の記録（フラグ付きの時だけ書く。今の保存の形には触れず、別のキー）。どこにも書けなくても遊びは止めない */
export const STORY3_SAVE_KEY = 'bot-commander.storych.v1';
export function loadChapterMarks(store = globalThis.localStorage) {
  try { const v = JSON.parse(store.getItem(STORY3_SAVE_KEY) || '{}'); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; } catch { return {}; }
}
export function markStageClear(stage, store = globalThis.localStorage) {
  try { const v = loadChapterMarks(store); v[stage] = true; store.setItem(STORY3_SAVE_KEY, JSON.stringify(v)); return true; } catch { return false; }
}

/** 章の中身（js/story/chapters.js の表に入れる）。stages: ステージ名 → { mission, label, hint }。order: 進む順 */
export const STORY_CH3 = Object.freeze({
  id: 3,
  title: '第3章 最初のひとり',
  order: ['3-1', '3-2'],
  stages: Object.freeze({
    '3-1': Object.freeze({ mission: STORY_3_1, label: '3-1 スーツの はつじん', hint: '☰ の中で スーツを きる・ぬぐ。敵を タップで ねらう', scriptUrl: kind => story3ScriptUrl('3-1', kind), midScene: (f, seen) => story3MidScene(f, seen, '3-1') }),
    '3-2': Object.freeze({ mission: STORY_3_2, label: '3-2 最初のひとり', hint: 'ビルの入口の敵を倒して、ミントを助けよう', scriptUrl: kind => story3ScriptUrl('3-2', kind), midScene: (f, seen) => story3MidScene(f, seen, '3-2') }),
  }),
  markClear: stage => markStageClear(stage),
});
