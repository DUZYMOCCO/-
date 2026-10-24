// ガンキック ヒーローズ BGM エンジン（WebAudio で その場で ごうせい）
// せかいかんに あわせた ダーク・スタイリッシュ・サイバーパンクな 5きょく を ランダム さいせい

export function midiToFreq(m) {
  return 440 * Math.pow(2, (m - 69) / 12);
}

// ---- 5きょくの ていぎ ----
// （かんじ なし・ひらがな と カタカナ だけ）
export const TRACKS = [
  {
    id: 'night_chaser',
    name: 'ナイト・チェイサー',
    sub: 'よるの ハイウェイを かけぬけろ',
    bpm: 136,
    bars: 16,
    // ドラムパターン（16ステップ x 4小節）
    drums: [
      // bar 1-4
      'k...s...k...s...', 'k...s...k.k.s...', 'k...s...k...s...', 'k...s...k.k.s.o.',
      // bar 5-8
      'k.h.s.h.k.h.s.h.', 'k.h.s.h.k.k.s.o.', 'k.h.s.h.k.h.s.h.', 'k.h.s.h.k.k.s.c.',
      // bar 9-12
      'k.h.s.h.k.h.s.h.', 'k.k.s.h.k.h.s.o.', 'k.h.s.h.k.h.s.h.', 'k.k.s.k.k.k.s.o.',
      // bar 13-16
      'k.h.s.h.k.h.s.h.', 'k.h.s.h.k.k.s.o.', 'k.h.s.h.k.h.s.h.', 'k.k.k.k.s.s.s.c.',
    ],
    // ベース（ステップごとの MIDI ノート。0 は やすみ）
    // Dm (38) -> Bb (34) -> C (36) -> Am (33)
    bass: [
      // bar 1-4 (Dm)
      38, 0, 38, 26, 38, 0, 38, 26, 38, 0, 38, 26, 38, 0, 41, 43,
      38, 0, 38, 26, 38, 0, 38, 26, 38, 0, 38, 26, 45, 0, 43, 0,
      38, 0, 38, 26, 38, 0, 38, 26, 38, 0, 38, 26, 38, 0, 41, 43,
      38, 0, 38, 26, 38, 0, 38, 26, 45, 43, 41, 38, 36, 0, 37, 0,
      // bar 5-8 (Dm -> Bb -> C -> Am)
      38, 0, 38, 26, 38, 0, 38, 26, 38, 0, 38, 26, 38, 0, 41, 0,
      34, 0, 34, 22, 34, 0, 34, 22, 34, 0, 34, 22, 34, 0, 36, 0,
      36, 0, 36, 24, 36, 0, 36, 24, 36, 0, 36, 24, 36, 0, 38, 0,
      33, 0, 33, 21, 33, 0, 33, 21, 33, 0, 33, 21, 36, 0, 37, 0,
      // bar 9-12 (Dm -> Bb -> C -> Am)
      38, 0, 38, 26, 38, 0, 38, 26, 38, 0, 38, 26, 41, 0, 43, 0,
      34, 0, 34, 22, 34, 0, 34, 22, 34, 0, 34, 22, 36, 0, 38, 0,
      36, 0, 36, 24, 36, 0, 36, 24, 36, 0, 36, 24, 40, 0, 41, 0,
      33, 0, 33, 21, 33, 0, 33, 21, 33, 33, 34, 34, 36, 36, 37, 37,
      // bar 13-16 (サビ)
      38, 38, 26, 38, 38, 26, 38, 26, 38, 38, 26, 38, 41, 41, 43, 43,
      34, 34, 22, 34, 34, 22, 34, 22, 34, 34, 22, 34, 36, 36, 38, 38,
      36, 36, 24, 36, 36, 24, 36, 24, 36, 36, 24, 36, 40, 40, 41, 41,
      45, 0, 43, 0, 41, 0, 38, 0, 36, 0, 34, 0, 33, 0, 31, 0,
    ],
    // シンセ アルペジオ (D minor)
    synth: [
      // bar 1-4
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      62, 65, 69, 72, 69, 65, 62, 65, 69, 72, 69, 65, 62, 65, 69, 72,
      62, 65, 69, 72, 69, 65, 62, 65, 69, 72, 74, 72, 69, 67, 65, 64,
      // bar 5-8
      62, 65, 69, 72, 69, 65, 62, 65, 69, 72, 69, 65, 62, 65, 69, 72,
      58, 62, 65, 70, 65, 62, 58, 62, 65, 70, 65, 62, 58, 62, 65, 70,
      60, 64, 67, 72, 67, 64, 60, 64, 67, 72, 67, 64, 60, 64, 67, 72,
      57, 60, 64, 69, 64, 60, 57, 60, 64, 69, 64, 60, 57, 60, 64, 67,
      // bar 9-12
      62, 65, 69, 72, 69, 65, 62, 65, 69, 72, 69, 65, 62, 65, 69, 72,
      58, 62, 65, 70, 65, 62, 58, 62, 65, 70, 65, 62, 58, 62, 65, 70,
      60, 64, 67, 72, 67, 64, 60, 64, 67, 72, 67, 64, 60, 64, 67, 72,
      57, 60, 64, 69, 64, 60, 57, 60, 64, 69, 67, 65, 64, 62, 60, 58,
      // bar 13-16
      62, 69, 65, 69, 62, 69, 65, 69, 62, 69, 65, 69, 72, 69, 65, 62,
      58, 65, 62, 65, 58, 65, 62, 65, 58, 65, 62, 65, 70, 65, 62, 58,
      60, 67, 64, 67, 60, 67, 64, 67, 60, 67, 64, 67, 72, 67, 64, 60,
      57, 64, 60, 64, 57, 64, 60, 64, 69, 67, 65, 64, 62, 60, 58, 57,
    ],
    // リードメロディ
    lead: [
      // bar 1-4 (やすみ)
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 72, 74,
      // bar 5-8
      74, 0, 0, 0, 72, 0, 0, 0, 69, 0, 0, 0, 65, 0, 67, 69,
      70, 0, 0, 0, 69, 0, 0, 0, 65, 0, 0, 0, 62, 0, 65, 67,
      67, 0, 0, 0, 65, 0, 0, 0, 64, 0, 0, 0, 60, 0, 64, 65,
      64, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 72, 74,
      // bar 9-12
      74, 0, 0, 0, 76, 0, 0, 0, 77, 0, 0, 0, 76, 0, 74, 72,
      70, 0, 0, 0, 72, 0, 0, 0, 74, 0, 0, 0, 72, 0, 70, 69,
      67, 0, 0, 0, 69, 0, 0, 0, 70, 0, 0, 0, 72, 0, 74, 76,
      77, 0, 76, 0, 74, 0, 72, 0, 69, 0, 0, 0, 0, 0, 0, 0,
      // bar 13-16 (サビ)
      74, 0, 74, 0, 72, 0, 69, 0, 74, 0, 74, 0, 76, 0, 77, 0,
      70, 0, 70, 0, 69, 0, 65, 0, 70, 0, 70, 0, 72, 0, 74, 0,
      72, 0, 72, 0, 70, 0, 67, 0, 72, 0, 72, 0, 74, 0, 76, 0,
      77, 0, 76, 0, 74, 0, 72, 0, 69, 0, 65, 0, 62, 0, 0, 0,
    ],
  },

  {
    id: 'crazy_kick',
    name: 'クレイジー・キック',
    sub: 'いかりの てっけん と とびげり',
    bpm: 152,
    bars: 16,
    drums: [
      // ブレイクビーツ（変則キック＋スネア連打＋高速ハット）
      'k..x.s..k..x.s.h', 'k..x.s..k.k.s.o.', 'k..x.s..k..x.s.h', 'k.s.k.s.k.k.s.c.',
      'k.h.s.h.k.h.s.h.', 'k..k.s.h.k.k.s.o.', 'k.h.s.h.k.h.s.h.', 'k.s.s.s.k.s.s.c.',
      'k..x.s..k..x.s.h', 'k..x.s..k.k.s.o.', 'k..x.s..k..x.s.h', 'k.s.k.s.k.k.s.c.',
      'k.h.s.h.k.h.s.h.', 'k..k.s.h.k.k.s.o.', 'k.k.s.k.k.s.k.s.', 'k.k.k.k.s.s.s.s.',
    ],
    // F# minor / Blues リフ (42)
    bass: [
      // bar 1-4
      42, 42, 0, 45, 0, 44, 0, 42, 0, 48, 0, 47, 0, 45, 0, 44,
      42, 42, 0, 45, 0, 44, 0, 42, 0, 39, 0, 40, 0, 41, 0, 42,
      42, 42, 0, 45, 0, 44, 0, 42, 0, 48, 0, 47, 0, 45, 0, 44,
      42, 0, 45, 0, 47, 0, 48, 0, 47, 0, 45, 0, 44, 0, 42, 0,
      // bar 5-8
      42, 30, 42, 30, 42, 30, 45, 44, 42, 30, 42, 30, 48, 47, 45, 44,
      42, 30, 42, 30, 42, 30, 45, 44, 42, 30, 42, 30, 39, 40, 41, 42,
      42, 30, 42, 30, 42, 30, 45, 44, 42, 30, 42, 30, 48, 47, 45, 44,
      47, 47, 45, 45, 44, 44, 42, 42, 48, 48, 47, 47, 45, 45, 44, 44,
      // bar 9-12 (展開)
      38, 0, 38, 26, 38, 0, 38, 0, 40, 0, 40, 28, 40, 0, 40, 0,
      42, 0, 42, 30, 42, 0, 42, 0, 45, 0, 44, 0, 42, 0, 40, 0,
      38, 0, 38, 26, 38, 0, 38, 0, 40, 0, 40, 28, 40, 0, 40, 0,
      42, 42, 44, 44, 45, 45, 47, 47, 48, 48, 47, 47, 45, 45, 44, 44,
      // bar 13-16 (ラッシュ)
      42, 42, 30, 42, 45, 44, 42, 30, 42, 42, 30, 42, 48, 47, 45, 44,
      42, 42, 30, 42, 45, 44, 42, 30, 42, 42, 30, 42, 39, 40, 41, 42,
      42, 42, 30, 42, 45, 44, 42, 30, 42, 42, 30, 42, 48, 47, 45, 44,
      50, 49, 48, 47, 46, 45, 44, 43, 42, 0, 0, 0, 0, 0, 0, 0,
    ],
    // スタブ・サイレン
    synth: [
      // bar 1-4
      66, 0, 0, 66, 0, 0, 66, 0, 72, 0, 0, 71, 0, 0, 69, 0,
      66, 0, 0, 66, 0, 0, 66, 0, 63, 0, 0, 64, 0, 0, 65, 0,
      66, 0, 0, 66, 0, 0, 66, 0, 72, 0, 0, 71, 0, 0, 69, 0,
      66, 0, 69, 0, 71, 0, 72, 0, 71, 0, 69, 0, 68, 0, 66, 0,
      // bar 5-8
      66, 66, 0, 66, 66, 0, 69, 68, 66, 66, 0, 66, 72, 71, 69, 68,
      66, 66, 0, 66, 66, 0, 69, 68, 66, 66, 0, 66, 63, 64, 65, 66,
      66, 66, 0, 66, 66, 0, 69, 68, 66, 66, 0, 66, 72, 71, 69, 68,
      71, 71, 69, 69, 68, 68, 66, 66, 72, 72, 71, 71, 69, 69, 68, 68,
      // bar 9-12
      62, 0, 62, 0, 66, 0, 69, 0, 64, 0, 64, 0, 68, 0, 71, 0,
      66, 0, 66, 0, 69, 0, 73, 0, 69, 0, 68, 0, 66, 0, 64, 0,
      62, 0, 62, 0, 66, 0, 69, 0, 64, 0, 64, 0, 68, 0, 71, 0,
      66, 66, 68, 68, 69, 69, 71, 71, 72, 72, 71, 71, 69, 69, 68, 68,
      // bar 13-16
      78, 0, 78, 0, 72, 0, 71, 0, 78, 0, 78, 0, 74, 0, 72, 0,
      78, 0, 78, 0, 72, 0, 71, 0, 78, 0, 78, 0, 69, 0, 71, 0,
      78, 0, 78, 0, 72, 0, 71, 0, 78, 0, 78, 0, 74, 0, 72, 0,
      74, 73, 72, 71, 70, 69, 68, 67, 66, 0, 0, 0, 0, 0, 0, 0,
    ],
    lead: [
      // bar 1-4
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 76, 78,
      // bar 5-8
      78, 0, 0, 0, 76, 0, 0, 0, 74, 0, 0, 0, 72, 0, 74, 76,
      78, 0, 0, 0, 76, 0, 0, 0, 81, 0, 0, 0, 78, 0, 0, 0,
      78, 0, 0, 0, 76, 0, 0, 0, 74, 0, 0, 0, 72, 0, 74, 76,
      71, 0, 0, 0, 72, 0, 0, 0, 74, 0, 0, 0, 76, 0, 77, 78,
      // bar 9-12
      74, 0, 74, 0, 76, 0, 77, 0, 76, 0, 76, 0, 77, 0, 79, 0,
      78, 0, 78, 0, 81, 0, 83, 0, 81, 0, 78, 0, 76, 0, 74, 0,
      74, 0, 74, 0, 76, 0, 77, 0, 76, 0, 76, 0, 77, 0, 79, 0,
      81, 81, 79, 79, 78, 78, 76, 76, 74, 74, 72, 72, 71, 71, 69, 69,
      // bar 13-16
      78, 0, 78, 0, 81, 0, 78, 0, 84, 0, 83, 0, 81, 0, 78, 0,
      78, 0, 78, 0, 81, 0, 78, 0, 76, 0, 74, 0, 72, 0, 71, 0,
      78, 0, 78, 0, 81, 0, 78, 0, 84, 0, 83, 0, 81, 0, 78, 0,
      86, 85, 84, 83, 82, 81, 80, 79, 78, 0, 0, 0, 0, 0, 0, 0,
    ],
  },

  {
    id: 'shadow_crawl',
    name: 'シャドウ・クロール',
    sub: 'やみから はいでる かげ',
    bpm: 126,
    bars: 16,
    drums: [
      // 重いハーフタイム感＋金属パーカッション
      'k.......s.......', 'k...k...s...o...', 'k.......s.......', 'k...k...s.s.c...',
      'k.h.h.h.s.h.h.h.', 'k.h.k.h.s.h.o.h.', 'k.h.h.h.s.h.h.h.', 'k.h.k.h.s.s.c.o.',
      'k.h.h.h.s.h.h.h.', 'k.h.k.h.s.h.o.h.', 'k.h.h.h.s.h.h.h.', 'k.h.k.h.s.s.c.o.',
      'k.h.h.h.s.h.h.h.', 'k.h.k.h.s.h.o.h.', 'k.k.h.k.s.h.k.h.', 'k.k.k.k.s.s.s.c.',
    ],
    // A Phrygian: A (33), Bb (34), C (36), D (38)
    bass: [
      // bar 1-4
      33, 0, 0, 0, 33, 0, 0, 0, 34, 0, 0, 0, 34, 0, 33, 0,
      33, 0, 0, 0, 33, 0, 0, 0, 36, 0, 0, 0, 34, 0, 33, 0,
      33, 0, 0, 0, 33, 0, 0, 0, 34, 0, 0, 0, 34, 0, 33, 0,
      31, 0, 0, 0, 31, 0, 0, 0, 34, 0, 33, 0, 31, 0, 29, 0,
      // bar 5-8
      33, 33, 21, 33, 33, 21, 33, 21, 34, 34, 22, 34, 34, 22, 33, 21,
      33, 33, 21, 33, 33, 21, 33, 21, 36, 36, 24, 36, 34, 34, 33, 21,
      33, 33, 21, 33, 33, 21, 33, 21, 34, 34, 22, 34, 34, 22, 33, 21,
      31, 31, 19, 31, 31, 19, 31, 19, 34, 34, 33, 33, 31, 31, 29, 29,
      // bar 9-12 (Dm -> Bb -> C -> Am)
      38, 0, 38, 26, 38, 0, 38, 0, 34, 0, 34, 22, 34, 0, 34, 0,
      36, 0, 36, 24, 36, 0, 36, 0, 33, 0, 33, 21, 33, 0, 33, 0,
      38, 0, 38, 26, 38, 0, 38, 0, 34, 0, 34, 22, 34, 0, 34, 0,
      36, 36, 36, 36, 37, 37, 37, 37, 38, 38, 38, 38, 40, 40, 41, 41,
      // bar 13-16
      33, 33, 21, 33, 34, 34, 22, 34, 36, 36, 24, 36, 34, 34, 22, 34,
      33, 33, 21, 33, 34, 34, 22, 34, 31, 31, 19, 31, 30, 30, 18, 30,
      33, 33, 21, 33, 34, 34, 22, 34, 36, 36, 24, 36, 38, 38, 26, 38,
      40, 39, 38, 37, 36, 35, 34, 33, 33, 0, 0, 0, 0, 0, 0, 0,
    ],
    // 不気味なフリジアン・アルペジオ
    synth: [
      // bar 1-4
      57, 58, 62, 64, 65, 64, 62, 58, 57, 58, 62, 64, 65, 64, 62, 58,
      57, 58, 62, 64, 65, 64, 62, 58, 57, 58, 62, 64, 67, 65, 64, 58,
      57, 58, 62, 64, 65, 64, 62, 58, 57, 58, 62, 64, 65, 64, 62, 58,
      55, 57, 60, 62, 64, 62, 60, 57, 58, 57, 55, 53, 52, 50, 48, 47,
      // bar 5-8
      57, 60, 64, 69, 64, 60, 58, 62, 65, 70, 65, 62, 57, 60, 64, 69,
      57, 60, 64, 69, 64, 60, 60, 64, 67, 72, 67, 64, 58, 62, 65, 70,
      57, 60, 64, 69, 64, 60, 58, 62, 65, 70, 65, 62, 57, 60, 64, 69,
      55, 59, 62, 67, 62, 59, 58, 57, 55, 53, 52, 50, 48, 47, 45, 43,
      // bar 9-12
      62, 65, 69, 74, 69, 65, 58, 62, 65, 70, 65, 62, 60, 64, 67, 72,
      67, 64, 60, 57, 60, 64, 69, 64, 60, 57, 58, 60, 62, 64, 65, 67,
      62, 65, 69, 74, 69, 65, 58, 62, 65, 70, 65, 62, 60, 64, 67, 72,
      67, 64, 60, 57, 58, 60, 62, 64, 65, 67, 69, 70, 72, 74, 76, 77,
      // bar 13-16
      69, 70, 74, 76, 77, 76, 74, 70, 69, 70, 74, 76, 77, 76, 74, 70,
      69, 70, 74, 76, 77, 76, 74, 70, 67, 65, 64, 62, 60, 58, 57, 55,
      69, 70, 74, 76, 77, 76, 74, 70, 69, 70, 74, 76, 79, 77, 76, 74,
      76, 74, 72, 70, 69, 67, 65, 64, 57, 0, 0, 0, 0, 0, 0, 0,
    ],
    lead: [
      // bar 1-4
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 69, 70,
      // bar 5-8
      69, 0, 0, 0, 70, 0, 0, 0, 69, 0, 0, 0, 65, 0, 67, 69,
      69, 0, 0, 0, 72, 0, 0, 0, 70, 0, 0, 0, 69, 0, 67, 65,
      69, 0, 0, 0, 70, 0, 0, 0, 69, 0, 0, 0, 65, 0, 67, 69,
      67, 0, 0, 0, 65, 0, 0, 0, 64, 0, 0, 0, 0, 0, 72, 74,
      // bar 9-12
      74, 0, 0, 0, 76, 0, 0, 0, 77, 0, 0, 0, 76, 0, 74, 72,
      70, 0, 0, 0, 72, 0, 0, 0, 69, 0, 0, 0, 67, 0, 69, 70,
      74, 0, 0, 0, 76, 0, 0, 0, 77, 0, 0, 0, 79, 0, 77, 76,
      81, 0, 79, 0, 77, 0, 76, 0, 74, 0, 72, 0, 70, 0, 69, 0,
      // bar 13-16
      69, 0, 70, 0, 72, 0, 74, 0, 76, 0, 74, 0, 72, 0, 70, 0,
      69, 0, 70, 0, 72, 0, 74, 0, 67, 0, 65, 0, 64, 0, 62, 0,
      69, 0, 70, 0, 72, 0, 74, 0, 76, 0, 77, 0, 79, 0, 81, 0,
      82, 81, 79, 77, 76, 74, 72, 70, 69, 0, 0, 0, 0, 0, 0, 0,
    ],
  },

  {
    id: 'iron_kick',
    name: 'アイアン・キック',
    sub: 'さいこうそくの コンボ・ラッシュ',
    bpm: 160,
    bars: 16,
    drums: [
      // 160BPM 高速連打ビート
      'k.k.s.h.k.k.s.h.', 'k.k.s.h.k.k.s.o.', 'k.k.s.h.k.k.s.h.', 'k.k.s.k.k.k.s.c.',
      'k.h.s.h.k.h.s.h.', 'k.k.s.h.k.k.s.o.', 'k.h.s.h.k.h.s.h.', 'k.s.k.s.k.k.s.c.',
      'k.k.s.h.k.k.s.h.', 'k.k.s.h.k.k.s.o.', 'k.k.s.h.k.k.s.h.', 'k.k.s.k.k.k.s.c.',
      'k.k.s.k.k.k.s.k.', 'k.k.s.k.k.k.s.o.', 'k.k.k.k.s.k.k.k.', 's.s.s.s.k.k.s.c.',
    ],
    // E minor (40)
    bass: [
      // bar 1-4
      40, 40, 28, 40, 43, 40, 45, 46, 47, 40, 28, 40, 45, 43, 40, 38,
      40, 40, 28, 40, 43, 40, 45, 46, 47, 40, 28, 40, 50, 49, 47, 45,
      40, 40, 28, 40, 43, 40, 45, 46, 47, 40, 28, 40, 45, 43, 40, 38,
      40, 28, 43, 28, 45, 28, 47, 28, 50, 49, 47, 45, 43, 42, 40, 38,
      // bar 5-8 (C -> D -> Em)
      36, 36, 24, 36, 36, 24, 36, 24, 38, 38, 26, 38, 38, 26, 38, 26,
      40, 40, 28, 40, 40, 28, 40, 28, 40, 40, 28, 40, 43, 43, 45, 45,
      36, 36, 24, 36, 36, 24, 36, 24, 38, 38, 26, 38, 38, 26, 38, 26,
      40, 40, 43, 43, 45, 45, 47, 47, 50, 50, 49, 49, 47, 47, 45, 45,
      // bar 9-12 (G -> D -> Em -> Bm)
      43, 43, 31, 43, 43, 31, 43, 31, 38, 38, 26, 38, 38, 26, 38, 26,
      40, 40, 28, 40, 40, 28, 40, 28, 35, 35, 23, 35, 35, 23, 35, 23,
      43, 43, 31, 43, 43, 31, 43, 31, 38, 38, 26, 38, 38, 26, 38, 26,
      36, 36, 38, 38, 40, 40, 42, 42, 43, 43, 45, 45, 47, 47, 48, 48,
      // bar 13-16 (スプリント)
      40, 28, 40, 28, 43, 28, 45, 28, 47, 28, 45, 28, 43, 28, 40, 28,
      40, 28, 40, 28, 43, 28, 45, 28, 50, 28, 49, 28, 47, 28, 45, 28,
      40, 28, 40, 28, 43, 28, 45, 28, 47, 28, 45, 28, 43, 28, 40, 28,
      52, 51, 50, 49, 48, 47, 46, 45, 44, 43, 42, 41, 40, 0, 0, 0,
    ],
    synth: [
      // bar 1-4
      64, 0, 67, 0, 71, 0, 74, 0, 71, 0, 67, 0, 64, 0, 67, 0,
      64, 0, 67, 0, 71, 0, 74, 0, 76, 0, 74, 0, 71, 0, 67, 0,
      64, 0, 67, 0, 71, 0, 74, 0, 71, 0, 67, 0, 64, 0, 67, 0,
      64, 67, 71, 74, 76, 74, 71, 67, 71, 67, 64, 62, 60, 59, 57, 55,
      // bar 5-8
      60, 64, 67, 72, 67, 64, 60, 64, 62, 66, 69, 74, 69, 66, 62, 66,
      64, 67, 71, 76, 71, 67, 64, 67, 64, 67, 71, 76, 74, 71, 67, 64,
      60, 64, 67, 72, 67, 64, 60, 64, 62, 66, 69, 74, 69, 66, 62, 66,
      64, 67, 71, 74, 76, 74, 71, 67, 74, 71, 67, 64, 71, 67, 64, 62,
      // bar 9-12
      67, 71, 74, 79, 74, 71, 67, 71, 62, 66, 69, 74, 69, 66, 62, 66,
      64, 67, 71, 76, 71, 67, 64, 67, 59, 62, 66, 71, 66, 62, 59, 62,
      67, 71, 74, 79, 74, 71, 67, 71, 62, 66, 69, 74, 69, 66, 62, 66,
      60, 64, 67, 72, 62, 66, 69, 74, 64, 67, 71, 76, 66, 69, 73, 78,
      // bar 13-16
      76, 0, 74, 0, 71, 0, 67, 0, 76, 0, 74, 0, 71, 0, 67, 0,
      76, 0, 74, 0, 71, 0, 67, 0, 79, 0, 78, 0, 76, 0, 74, 0,
      76, 0, 74, 0, 71, 0, 67, 0, 76, 0, 74, 0, 71, 0, 67, 0,
      81, 80, 79, 78, 77, 76, 75, 74, 73, 72, 71, 70, 64, 0, 0, 0,
    ],
    lead: [
      // bar 1-4
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 74, 76,
      // bar 5-8
      76, 0, 0, 0, 74, 0, 0, 0, 72, 0, 0, 0, 74, 0, 76, 0,
      79, 0, 0, 0, 76, 0, 0, 0, 74, 0, 0, 0, 71, 0, 74, 76,
      76, 0, 0, 0, 74, 0, 0, 0, 72, 0, 0, 0, 74, 0, 76, 0,
      79, 0, 81, 0, 83, 0, 81, 0, 79, 0, 76, 0, 74, 0, 71, 0,
      // bar 9-12
      79, 0, 0, 0, 78, 0, 0, 0, 74, 0, 0, 0, 76, 0, 78, 0,
      76, 0, 0, 0, 74, 0, 0, 0, 71, 0, 0, 0, 74, 0, 76, 0,
      79, 0, 0, 0, 78, 0, 0, 0, 74, 0, 0, 0, 76, 0, 78, 0,
      81, 0, 81, 0, 83, 0, 83, 0, 84, 0, 84, 0, 86, 0, 86, 0,
      // bar 13-16
      88, 0, 86, 0, 83, 0, 79, 0, 88, 0, 86, 0, 83, 0, 79, 0,
      88, 0, 86, 0, 83, 0, 79, 0, 91, 0, 88, 0, 86, 0, 83, 0,
      88, 0, 86, 0, 83, 0, 79, 0, 88, 0, 86, 0, 83, 0, 79, 0,
      93, 92, 91, 90, 89, 88, 87, 86, 85, 84, 83, 82, 76, 0, 0, 0,
    ],
  },

  {
    id: 'last_stand',
    name: 'ラスト・スタンド',
    sub: 'さいごの けっせん',
    bpm: 142,
    bars: 16,
    drums: [
      // 重厚なドラマチック・ビート
      'k...s...k..x.s..', 'k...s...k.k.s.o.', 'k...s...k..x.s..', 'k...s...k.k.s.c.',
      'k.h.s.h.k.h.s.h.', 'k.h.s.h.k.k.s.o.', 'k.h.s.h.k.h.s.h.', 'k.s.s.s.k.k.s.c.',
      'k.h.s.h.k.h.s.h.', 'k.k.s.h.k.h.s.o.', 'k.h.s.h.k.h.s.h.', 'k.k.s.k.k.k.s.o.',
      'k.h.s.h.k.h.s.h.', 'k.h.s.h.k.k.s.o.', 'k.k.s.k.k.s.k.s.', 'k.k.k.k.s.s.s.s.',
    ],
    // Cm (36) -> Ab (32) -> Bb (34) -> Gm (31)
    bass: [
      // bar 1-4
      36, 0, 36, 24, 36, 0, 36, 24, 36, 0, 36, 24, 36, 0, 39, 41,
      32, 0, 32, 20, 32, 0, 32, 20, 32, 0, 32, 20, 32, 0, 34, 36,
      34, 0, 34, 22, 34, 0, 34, 22, 34, 0, 34, 22, 34, 0, 36, 38,
      31, 0, 31, 19, 31, 0, 31, 19, 31, 0, 31, 19, 34, 0, 35, 0,
      // bar 5-8
      36, 36, 24, 36, 36, 24, 36, 24, 36, 36, 24, 36, 39, 39, 41, 41,
      32, 32, 20, 32, 32, 20, 32, 20, 32, 32, 20, 32, 34, 34, 36, 36,
      34, 34, 22, 34, 34, 22, 34, 22, 34, 34, 22, 34, 36, 36, 38, 38,
      31, 31, 19, 31, 31, 19, 31, 19, 35, 35, 34, 34, 32, 32, 31, 31,
      // bar 9-12 (Cm -> Eb -> Fm -> G)
      36, 0, 36, 24, 36, 0, 36, 0, 39, 0, 39, 27, 39, 0, 39, 0,
      41, 0, 41, 29, 41, 0, 41, 0, 43, 0, 43, 31, 43, 0, 43, 0,
      36, 0, 36, 24, 36, 0, 36, 0, 39, 0, 39, 27, 39, 0, 39, 0,
      41, 41, 41, 41, 43, 43, 43, 43, 45, 45, 45, 45, 47, 47, 47, 47,
      // bar 13-16 (サビ)
      36, 36, 24, 36, 39, 36, 24, 36, 32, 32, 20, 32, 36, 32, 20, 32,
      34, 34, 22, 34, 38, 34, 22, 34, 31, 31, 19, 31, 35, 31, 19, 31,
      36, 36, 24, 36, 39, 36, 24, 36, 32, 32, 20, 32, 36, 32, 20, 32,
      34, 34, 36, 36, 38, 38, 41, 41, 43, 0, 0, 0, 0, 0, 0, 0,
    ],
    // クワイヤ / ブラス シンセ
    synth: [
      // bar 1-4
      60, 63, 67, 72, 67, 63, 60, 63, 67, 72, 67, 63, 60, 63, 67, 72,
      56, 60, 63, 68, 63, 60, 56, 60, 63, 68, 63, 60, 56, 60, 63, 68,
      58, 62, 65, 70, 65, 62, 58, 62, 65, 70, 65, 62, 58, 62, 65, 70,
      55, 58, 62, 67, 62, 58, 55, 58, 62, 67, 65, 63, 62, 60, 58, 56,
      // bar 5-8
      60, 63, 67, 72, 67, 63, 60, 63, 67, 72, 67, 63, 60, 63, 67, 72,
      56, 60, 63, 68, 63, 60, 56, 60, 63, 68, 63, 60, 56, 60, 63, 68,
      58, 62, 65, 70, 65, 62, 58, 62, 65, 70, 65, 62, 58, 62, 65, 70,
      55, 58, 62, 67, 62, 58, 55, 58, 67, 65, 63, 62, 60, 58, 56, 55,
      // bar 9-12
      60, 63, 67, 72, 67, 63, 63, 67, 70, 75, 70, 67, 65, 68, 72, 77,
      72, 68, 67, 71, 74, 79, 74, 71, 60, 63, 67, 72, 63, 67, 70, 75,
      65, 68, 72, 77, 72, 68, 67, 71, 74, 79, 74, 71, 68, 72, 75, 80,
      67, 71, 74, 79, 65, 68, 72, 77, 63, 67, 70, 75, 62, 65, 68, 74,
      // bar 13-16
      72, 0, 72, 0, 75, 0, 72, 0, 68, 0, 68, 0, 72, 0, 68, 0,
      70, 0, 70, 0, 74, 0, 70, 0, 67, 0, 67, 0, 71, 0, 67, 0,
      72, 0, 72, 0, 75, 0, 72, 0, 68, 0, 68, 0, 72, 0, 68, 0,
      70, 70, 72, 72, 74, 74, 77, 77, 79, 0, 0, 0, 0, 0, 0, 0,
    ],
    lead: [
      // bar 1-4
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 70, 72,
      // bar 5-8
      72, 0, 0, 0, 75, 0, 0, 0, 74, 0, 0, 0, 72, 0, 70, 0,
      68, 0, 0, 0, 70, 0, 0, 0, 72, 0, 0, 0, 70, 0, 68, 0,
      70, 0, 0, 0, 72, 0, 0, 0, 74, 0, 0, 0, 72, 0, 70, 0,
      67, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 70, 72,
      // bar 9-12
      72, 0, 0, 0, 75, 0, 0, 0, 77, 0, 0, 0, 75, 0, 74, 0,
      72, 0, 0, 0, 74, 0, 0, 0, 75, 0, 0, 0, 74, 0, 72, 0,
      72, 0, 0, 0, 75, 0, 0, 0, 77, 0, 0, 0, 79, 0, 77, 0,
      80, 0, 79, 0, 77, 0, 75, 0, 74, 0, 72, 0, 71, 0, 70, 0,
      // bar 13-16 (サビ・アンセム)
      72, 0, 72, 0, 75, 0, 74, 0, 72, 0, 70, 0, 68, 0, 70, 0,
      72, 0, 74, 0, 75, 0, 77, 0, 74, 0, 72, 0, 70, 0, 67, 0,
      72, 0, 72, 0, 75, 0, 74, 0, 72, 0, 70, 0, 68, 0, 70, 0,
      74, 0, 75, 0, 77, 0, 79, 0, 84, 0, 0, 0, 0, 0, 0, 0,
    ],
  },
];

// ---- WebAudio オフラインレンダラー ----
export async function renderTrackBuffer(track, sampleRate = 22050) {
  if (typeof window === 'undefined') return null;
  const AC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!AC) return null;

  const bpm = track.bpm;
  const beatSec = 60 / bpm;
  const stepSec = beatSec / 4; // 16分音符
  const totalSteps = track.bars * 16;
  const totalDuration = totalSteps * stepSec;
  const lengthSamples = Math.ceil((totalDuration + 0.3) * sampleRate);

  const actx = new AC(2, lengthSamples, sampleRate);

  // ホワイトノイズ バッファ（ドラム・パーカッション用）
  const noiseLen = Math.floor(sampleRate * 2);
  const noiseBuf = actx.createBuffer(1, noiseLen, sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < noiseLen; i++) nd[i] = Math.random() * 2 - 1;

  // マスター コンプレッサー
  const comp = actx.createDynamicsCompressor();
  comp.threshold.value = -12;
  comp.ratio.value = 5;
  comp.connect(actx.destination);

  // マスター ゲイン
  const master = actx.createGain();
  master.gain.value = 0.85;
  master.connect(comp);

  // ステレオ ディレイ バス
  const delayL = actx.createDelay();
  delayL.delayTime.value = stepSec * 3; // 付点8分
  const delayR = actx.createDelay();
  delayR.delayTime.value = stepSec * 4; // 4分

  const delayFilter = actx.createBiquadFilter();
  delayFilter.type = 'lowpass';
  delayFilter.frequency.value = 2400;

  const delayFeedback = actx.createGain();
  delayFeedback.gain.value = 0.28;

  const merger = actx.createChannelMerger(2);
  delayL.connect(merger, 0, 0);
  delayR.connect(merger, 0, 1);
  merger.connect(delayFilter);
  delayFilter.connect(delayFeedback);
  delayFeedback.connect(delayL);
  delayFeedback.connect(delayR);
  delayFilter.connect(master);

  // --- ドラムの スケジュール ---
  const drumStr = track.drums.join('');
  for (let i = 0; i < totalSteps; i++) {
    const ch = drumStr[i] || '.';
    const t = i * stepSec;
    if (ch === 'k') {
      // キック: サイン波ピッチ急降下 + クリック
      const o = actx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(140, t);
      o.frequency.exponentialRampToValueAtTime(36, t + 0.14);
      const g = actx.createGain();
      g.gain.setValueAtTime(0.9, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      o.connect(g).connect(master);
      o.start(t); o.stop(t + 0.23);

      // アタック クリック
      const s = actx.createBufferSource();
      s.buffer = noiseBuf;
      const f = actx.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = 2200;
      const ng = actx.createGain();
      ng.gain.setValueAtTime(0.4, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.01);
      s.connect(f).connect(ng).connect(master);
      s.start(t); s.stop(t + 0.015);
    } else if (ch === 's') {
      // スネア: トーン + ノイズ
      const o = actx.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(200, t);
      o.frequency.exponentialRampToValueAtTime(70, t + 0.08);
      const g = actx.createGain();
      g.gain.setValueAtTime(0.4, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      o.connect(g).connect(master);
      o.start(t); o.stop(t + 0.11);

      const s = actx.createBufferSource();
      s.buffer = noiseBuf;
      const f = actx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 2000;
      f.Q.value = 1.2;
      const ng = actx.createGain();
      ng.gain.setValueAtTime(0.55, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      s.connect(f).connect(ng).connect(master);
      s.start(t); s.stop(t + 0.18);
    } else if (ch === 'h') {
      // クローズド ハイハット
      const s = actx.createBufferSource();
      s.buffer = noiseBuf;
      const f = actx.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = 7500;
      const ng = actx.createGain();
      ng.gain.setValueAtTime(0.22, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      s.connect(f).connect(ng).connect(master);
      s.start(t); s.stop(t + 0.05);
    } else if (ch === 'o') {
      // オープン ハイハット
      const s = actx.createBufferSource();
      s.buffer = noiseBuf;
      const f = actx.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = 6500;
      const ng = actx.createGain();
      ng.gain.setValueAtTime(0.3, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      s.connect(f).connect(ng).connect(master);
      s.start(t); s.stop(t + 0.2);
    } else if (ch === 'c') {
      // クラップ
      for (const off of [0, 0.012, 0.024]) {
        const s = actx.createBufferSource();
        s.buffer = noiseBuf;
        const f = actx.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.value = 1600;
        f.Q.value = 1.5;
        const ng = actx.createGain();
        ng.gain.setValueAtTime(0.35, t + off);
        ng.gain.exponentialRampToValueAtTime(0.001, t + off + 0.12);
        s.connect(f).connect(ng).connect(master);
        s.start(t + off); s.stop(t + off + 0.14);
      }
    }
  }

  // --- ベースの スケジュール ---
  // Sawtooth + レゾナンス フィルター + エンベロープ
  for (let i = 0; i < totalSteps; i++) {
    const note = track.bass[i];
    if (!note) continue;
    const t = i * stepSec;
    const dur = stepSec * 1.6;
    const freq = midiToFreq(note);

    const o = actx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = freq;

    const filter = actx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 5.5;
    filter.frequency.setValueAtTime(1800, t);
    filter.frequency.exponentialRampToValueAtTime(220, t + 0.13);

    const g = actx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.48, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);

    o.connect(filter).connect(g).connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  // --- シンセ アルペジオ／コードの スケジュール ---
  // デチューン Sawtooth + ディレイ
  for (let i = 0; i < totalSteps; i++) {
    const note = track.synth[i];
    if (!note) continue;
    const t = i * stepSec;
    const dur = stepSec * 1.8;
    const freq = midiToFreq(note);

    for (const det of [-8, 8]) {
      const o = actx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = freq;
      o.detune.value = det;

      const filter = actx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 2600;

      const g = actx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.16, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);

      o.connect(filter).connect(g);
      g.connect(master);
      g.connect(delayL);
      g.connect(delayR);
      o.start(t); o.stop(t + dur + 0.02);
    }
  }

  // --- リード メロディの スケジュール ---
  // スクエア波＋ディレイ
  for (let i = 0; i < totalSteps; i++) {
    const note = track.lead[i];
    if (!note) continue;
    const t = i * stepSec;
    const dur = stepSec * 2.8;
    const freq = midiToFreq(note);

    const o = actx.createOscillator();
    o.type = 'square';
    o.frequency.value = freq;

    const filter = actx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2400;

    const g = actx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.22, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);

    o.connect(filter).connect(g);
    g.connect(master);
    g.connect(delayL);
    g.connect(delayR);
    o.start(t); o.stop(t + dur + 0.02);
  }

  try {
    return await actx.startRendering();
  } catch (e) {
    return null;
  }
}

// ---- BGM 管理・ランダム さいせい クラス ----
export class MusicPlayer {
  constructor(muted = false) {
    this.muted = muted;
    this.ctx = null;
    this.gain = null;
    this.buffers = new Map();
    this.rendering = new Map();
    this.currentTrack = null;
    this.source = null;
    this.history = [];
    this.volume = 0.32; // 効果音を邪魔しない適正音量
    this.fadeSec = 0.8;
    this.timer = null;
    this.onTrackToast = null; // (track) => void
    this.started = false;
  }

  init(audioCtx) {
    if (!audioCtx) return;
    this.ctx = audioCtx;
    if (!this.gain) {
      this.gain = audioCtx.createGain();
      this.gain.gain.value = this.muted ? 0 : this.volume;
      this.gain.connect(audioCtx.destination);
    }
  }

  setMuted(m) {
    this.muted = m;
    if (this.gain && this.ctx) {
      const t = this.ctx.currentTime;
      this.gain.gain.setTargetAtTime(m ? 0 : this.volume, t, 0.08);
    }
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.gain && this.ctx && !this.muted) {
      this.gain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.08);
    }
  }

  // 直前と被らないランダム選曲
  pickRandomTrack() {
    const list = TRACKS.filter((t) => t.id !== (this.currentTrack && this.currentTrack.id));
    if (!list.length) return TRACKS[0];
    const idx = Math.floor(Math.random() * list.length);
    return list[idx];
  }

  async getBuffer(track) {
    if (this.buffers.has(track.id)) return this.buffers.get(track.id);
    if (this.rendering.has(track.id)) return this.rendering.get(track.id);

    const sr = (this.ctx && this.ctx.sampleRate) ? Math.min(44100, this.ctx.sampleRate) : 22050;
    const promise = renderTrackBuffer(track, sr).then((buf) => {
      if (buf) this.buffers.set(track.id, buf);
      this.rendering.delete(track.id);
      return buf;
    });
    this.rendering.set(track.id, promise);
    return promise;
  }

  // さいしょの 曲、または つぎの 曲を ランダム さいせい
  async startRandom() {
    this.started = true;
    const next = this.pickRandomTrack();
    await this.playTrack(next);
  }

  // つぎの きょく へ スキップ
  async next() {
    await this.startRandom();
  }

  async playTrack(track) {
    if (!this.ctx || !this.started) return;
    const buf = await this.getBuffer(track);
    if (!buf || !this.started) return;

    const t = this.ctx.currentTime;

    // 前のソースがあればクロスフェード
    if (this.source) {
      const oldSrc = this.source;
      const oldGain = this.sourceGain;
      if (oldGain) {
        oldGain.gain.setValueAtTime(oldGain.gain.value, t);
        oldGain.gain.linearRampToValueAtTime(0, t + this.fadeSec);
      }
      setTimeout(() => {
        try { oldSrc.stop(); oldSrc.disconnect(); } catch (e) { /* なし */ }
      }, this.fadeSec * 1000 + 100);
      this.source = null;
    }

    if (this.timer) { clearTimeout(this.timer); this.timer = null; }

    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true; // ループ再生

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(1, t + this.fadeSec);

    src.connect(g).connect(this.gain);
    src.start(t);

    this.source = src;
    this.sourceGain = g;
    this.currentTrack = track;

    // トースト通知（コールバック）
    if (this.onTrackToast) {
      try { this.onTrackToast(track); } catch (e) { /* なし */ }
    }

    // 2ループ分（約50〜65秒）流れたら自然に次のランダム曲へクロスフェード
    const loopDuration = buf.duration * 2;
    this.timer = setTimeout(() => {
      if (this.started && this.source === src) {
        this.startRandom();
      }
    }, Math.max(25000, loopDuration * 1000));

    // 他の曲をバックグラウンドで事前キャッシュ（アイドル時）
    this.preloadOtherTracks();
  }

  preloadOtherTracks() {
    setTimeout(async () => {
      for (const t of TRACKS) {
        if (!this.buffers.has(t.id) && !this.rendering.has(t.id)) {
          await this.getBuffer(t);
        }
      }
    }, 1500);
  }

  stop() {
    this.started = false;
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    if (this.source) {
      try { this.source.stop(); this.source.disconnect(); } catch (e) { /* なし */ }
      this.source = null;
    }
    this.currentTrack = null;
  }
}
