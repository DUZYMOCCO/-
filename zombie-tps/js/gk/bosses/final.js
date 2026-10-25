// v0.17.0: ステージ15 さいごの ボス「はじまりの ミュータント」（かくう・2だんかい）
// 1: うでの たたきつけ（まるい よこく）・さんの たま → HP 50% で 2: からだが むらさきに ひかる・ちいさい ミュータントを よぶ（4たいまで）・ジャンプの ちゃくちで わ（ジャンプで よける）
export const BOSS = {
  id: 'final', scale: 2.4, color: 0x7ad030, shotColor: 0x8ae040, eggColor: 0x6ac040, fxColor: 0x7ad030,
  look: {
    id: 'final', colors: { skin: 0x5a9a3a, shirt: 0x3a6a2a, pants: 0x2a4a22, emissive: 0x0a2a08 },
    parts: [
      ['body', 0x4a8a30, 0.4, 0.34, 0.4, -0.36, 0.78, 0], ['body', 0x4a8a30, 0.46, 0.4, 0.46, 0.36, 0.8, 0.02],
      ['body', 0x3a7a28, 0.36, 0.3, 0.2, 0, 0.5, 0.2], ['body', 0x8ae040, 0.04, 0.5, 0.02, -0.12, 0.4, -0.16, { glow: true }],
      ['body', 0x8ae040, 0.04, 0.4, 0.02, 0.14, 0.45, -0.16, { glow: true }], ['head', 0x4a8a30, 0.3, 0.16, 0.3, 0.14, 0.56, 0.05],
      ['head', 0xd8ff6a, 0.1, 0.06, 0.04, -0.12, 0.3, -0.26, { glow: true }], ['head', 0xd8ff6a, 0.1, 0.06, 0.04, 0.12, 0.3, -0.26, { glow: true }],
      ['inner', 0x7ad030, 0.9, 0.04, 0.9, 0, 0.02, 0, { glow: true }],
    ],
  },
  phases: [
    { at: 1, color: 0x7ad030, bar: 0x5ad02a, moves: [
      { id: 'slam', kind: 'circles', tele: 1.1, n: 1, at: 'player', r: 2.6, dmg: 20, knock: 6, fxColor: 0x7ad030, range: [0, 9], cd: 3.5 },
      { id: 'acid', kind: 'shots', tele: 1.0, n: 3, gap: 0, spread: 30, speed: 7, dmg: 10, range: [4, 26], cd: 4 },
    ] },
    { at: 0.5, color: 0xb46bff, glow: 0x3a1050, bar: 0xb46bff, msg: 'ほんきを だした！', sub: 'わは ジャンプで よけよう', moves: [
      { id: 'minis', kind: 'summon', tele: 1.2, n: 2, cap: 4, minion: 'mutant', hpMul: 0.5, range: [0, 40], cd: 8 },
      { id: 'quake', kind: 'wave', tele: 1.2, speed: 8, R: 15, dmg: 16, range: [0, 14], cd: 5.5 },
      { id: 'acid2', kind: 'shots', tele: 1.0, n: 5, gap: 0, spread: 50, speed: 7, dmg: 10, range: [4, 26], cd: 4.5 },
    ] },
  ],
};
