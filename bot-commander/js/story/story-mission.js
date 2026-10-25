// 物語の最初のミッション（試作・数値は全部「仮」）。データだけ（DOM・Pixi・乱数なし）。形は js/sim/mission.js の MISSION_1 と同じ。
// 今ある地図（seed 7）と仕組みだけで作る。新しい決まりはない: 資材を脱出口へ届けたら勝ち・ロボが全滅したら負け・少年が捕まったままでも負け。
// 物語の台本は assets/story/story1_*.json、流れは js/story/story-1.js。
// ねらい: 敵は、離れた2つの巡回（1体と2体）と、脱出口の見張り（3体）。見張りにいっぺんに見つかると苦しい。
//   v1.0.0: 敵を強くした（巡回2 を 2体・見張りを 3体に）。資材を集めるだけでは勝てない。PONCO02 をまとめて巡回を1体ずつ倒してから集める。
//   しらべた結果（数値は仮・同じ seed なら毎回同じ・seed 1〜5）: 資材を順に取って届けるだけ → ジェミニがやられて勝てない。
//   巡回を先に1体ずつ倒してから集める → 全部勝てた（tests/story1.test.mjs）。

export const STORY_1 = Object.freeze({
  id: 'story1',
  title: '隠れ家のそばの資材集め（仮）',
  target: 40,          // 脱出口へ届ける資材の目標（仮）
  salvage: [
    { tx: 8, ty: 47, amount: 25 },
    { tx: 33, ty: 46, amount: 25 },
  ],
  extraction: { tx: 30, ty: 38 },
  nest: { tx: 4, ty: 22 }, // 捕まった人を運ぶ先（MISSION_1 と同じ場所）
  ally: [
    { kind: 'scav', tx: 20, ty: 54, count: 1, cls: 'scavenger', name: 'ジェミニ' },
    { kind: 'ponco', tx: 17, ty: 55, count: 3, cls: ['gunner', 'gunner', 'gunner'] },
    { kind: 'boy', tx: 21, ty: 57 },
  ],
  aliens: [
    { name: '巡回1', kind: 'alien', count: 1, route: [{ tx: 12, ty: 50 }, { tx: 12, ty: 44 }, { tx: 20, ty: 46 }] },
    { name: '巡回2', kind: 'alien', count: 2, route: [{ tx: 30, ty: 50 }, { tx: 34, ty: 44 }, { tx: 26, ty: 47 }] },
    { name: '見張り', kind: 'alien', count: 3, route: [{ tx: 28, ty: 35 }, { tx: 33, ty: 36 }] },
  ],
});
