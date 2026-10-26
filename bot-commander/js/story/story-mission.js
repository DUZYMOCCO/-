// 物語の最初のミッション（v1.0.2 で置きかえ。数値は全部「仮」）。データだけ（DOM・Pixi・乱数なし）。形は js/sim/mission.js の MISSION_1 に
// survey（調べる場所）・strike（ミサイルの山）・startRide（少年は背中に乗って始まる）を足したもの。仕掛けは js/sim/strike.js。
// 流れ: 隠れ家のそばで、ネジ（ツギハギ号）と少年だけ → 埋まったミサイルを掘り出す → 発射台をひっぱって運ぶ → 見張り（3体）の所へ撃つ
//   → 見張りのいた所で「設計図のありか」を調べる（敵が5マス以内にいると進まない）→ 調べ終えたら勝ち。
// 負け: ネジが壊れる・少年が捕まる・少年が倒れる。発射台を撃つ前に壊されても、その場では負けにしない（2発目はない。決定 10/26）。
// 出さない: ミント（少女）・ロウ（狼）。PONCO02 も出さない（ネジひとり）。STORY.md 第0章の「ネジが体を失う」話は後の章へ移した。
// 物語の台本は assets/story/story1_*.json、流れは js/story/story-1.js。

export const STORY_1 = Object.freeze({
  id: 'story1',
  title: '埋まったミサイル（仮）',
  win: 'survey',
  target: 1,             // 使わない（調べ終えたら勝ち）。MISSION_1 と同じ形にするため
  salvage: [
    { tx: 9, ty: 50, amount: 10, missile: true },  // 埋まったミサイル（掘り終えると発射台が出る）
    { tx: 14, ty: 53, amount: 8 },                 // 小さながらくたの山（おまけ）
  ],
  strike: { pile: 0 },
  survey: { tx: 31, ty: 43, amount: 10, name: '設計図のありか' },
  extraction: { tx: 20, ty: 56 }, // 隠れ家（資材を置く所。勝ち負けには使わない）
  nest: { tx: 4, ty: 22 },        // 捕まった人を運ぶ先（MISSION_1 と同じ場所）
  startRide: true,
  ally: [
    { kind: 'scav', tx: 20, ty: 55, count: 1, cls: 'scavenger', name: 'ネジ' },
    { kind: 'boy', tx: 21, ty: 57 },
  ],
  aliens: [
    { name: 'はぐれ', kind: 'alien', count: 1, route: [{ tx: 5, ty: 41 }, { tx: 11, ty: 39 }, { tx: 17, ty: 45 }, { tx: 12, ty: 45 }] }, // 北の残骸のあたりを回る。ひっぱる道のそばを通ることがある
    { name: '見張り', kind: 'alien', count: 3, route: [{ tx: 30, ty: 42 }, { tx: 32, ty: 42 }] }, // 設計図のありかの番。ほとんど動かない（ミサイルで狙える）
  ],
});
