// 物語 第 2 章「町はずれの声」（試作）の 2 本のミッション。数値は全部「仮」。データだけ（DOM・Pixi・乱数なし）。
// 形は js/story/story-mission.js の STORY_1 と同じ（js/sim/mission.js の MISSION_1 の形）。仕掛けは js/sim/story2-rules.js（mission.story2 がある時だけ動く）。
// 敵は新しい敵（js/sim/new-enemies.js の G01 ガトリングガエル・G08 ハサミアリ）。ownAliens: true で、?newenemies=1 の入れ替えはしない（2 章は自分で決める）。
// 2 章の中だけの強さの調整は story2.tune（hpMul・atkMul）。new-enemies.js の数値そのものは変えない。
//
// 2-1 ポンコ02を つくる: 隠れ家のそばで、ネジ（ツギハギ号）と背中の少年だけ。町はずれの 3 か所の資材の山（各 20）を掘って、隠れ家へ 60 届けたら勝ち。
//     見回りは G01 が 1 体。ネジは戦えないので、森に隠れてやり過ごす。壊れた機体の山を半分掘るとコアが見つかる（会話）。
// 2-2 むせんとうの あと: ネジ・PONCO02・少年（背中）で、川の北の無線塔の跡へ。道の見張りは G01 ×2、塔のまわりを G08 ×2 が回る。
//     少年がネジから降りて塔の跡を約 15 秒調べたら勝ち（敵が 5 マス以内にいると進まない）。調べの途中で、塔の中から狼のロウが飛び出し、G08 を引きつけて走り去る。
// 負け: ネジが壊れる（2-2 でポンコ02も壊れたら「ロボが全滅」）・少年が捕まる・少年が倒れる。

const NEJI_TILE = { tx: 20, ty: 54 };

export const STORY_2_1 = Object.freeze({
  id: 'story2_1',
  title: 'ポンコ02を つくる',
  target: 60,
  salvage: [
    { tx: 14, ty: 52, amount: 20 },  // 西のがれきの山
    { tx: 29, ty: 52, amount: 20 },  // 壊れた機体の山（半分掘るとコアが見つかる）
    { tx: 23, ty: 49, amount: 20 },  // 森の中の山（森に隠れて掘れる）
  ],
  extraction: { tx: 20, ty: 55 },    // 隠れ家（資材を置く所）
  nest: { tx: 4, ty: 22 },           // 捕まった人を運ぶ先（MISSION_1 と同じ場所）
  startRide: true,
  ownAliens: true,
  story2: Object.freeze({ step: 1, corePile: 1, tune: Object.freeze({}) }),
  ally: [
    { kind: 'scav', ...NEJI_TILE, count: 1, cls: 'scavenger', name: 'ネジ' },
    { kind: 'boy', tx: 21, ty: 56 },
  ],
  aliens: [
    { name: '見回り', kinds: ['G01'], route: [{ tx: 12, ty: 43 }, { tx: 25, ty: 43 }, { tx: 28, ty: 45 }, { tx: 16, ty: 45 }] },
  ],
});

export const STORY_2_2 = Object.freeze({
  id: 'story2_2',
  title: 'むせんとうの あと',
  win: 'survey',
  target: 1,                          // 使わない（塔の跡を調べ終えたら勝ち）。MISSION_1 と同じ形にするため
  salvage: [],
  extraction: { tx: 26, ty: 38 },     // 使わない（出発の場所。脱出口の絵は出さない）
  nest: { tx: 4, ty: 22 },
  startRide: true,
  noHatch: true,
  ownAliens: true,
  story2: Object.freeze({
    step: 2,
    survey: Object.freeze({ tx: 24, ty: 23, amount: 3, name: 'むせんとうの あと' }), // 少年が 0.2/秒で調べて約 15 秒（mission.survey ではなく story2.survey＝1 章のミサイルの仕掛けを動かさない）
    wolfRoute: Object.freeze([{ tx: 30, ty: 19 }, { tx: 37, ty: 14 }]), // ロウが塔から走って行く道（東の山のほうへ。川のむこうへ消える）
    tune: Object.freeze({ G01: Object.freeze({ hpMul: 0.5, atkMul: 0.4 }), G08: Object.freeze({ hpMul: 0.7, atkMul: 0.4 }) }),
  }),
  ally: [
    { kind: 'scav', tx: 26, ty: 38, count: 1, cls: 'scavenger', name: 'ネジ' },
    { kind: 'ponco', tx: 27, ty: 39, count: 1, cls: 'gunner', name: 'PONCO02' },
    { kind: 'boy', tx: 25, ty: 39 },
  ],
  aliens: [
    { name: 'ガエルの見張り', kinds: ['G01', 'G01'], route: [{ tx: 28, ty: 29 }, { tx: 31, ty: 27 }] },
    { name: 'アリの列', kinds: ['G08', 'G08'], route: [{ tx: 14, ty: 23 }, { tx: 24, ty: 19 }, { tx: 34, ty: 23 }, { tx: 24, ty: 27 }] },
  ],
});

/** 2 章のミッション（1 つ目が 2-1・2 つ目が 2-2） */
export const STORY2_MISSIONS = Object.freeze([STORY_2_1, STORY_2_2]);
