// ステージ2 ボス「ねじれ ばけもの」: くびが 3ぼん じゅんばんに かみつく・むらさきの たまを おうぎに
export const BOSS = {
  id: 'hydra', color: 0xb060ff, shotColor: 0xc070ff, shotSize: 0.3, fxColor: 0xb060ff, scale: 1.75,
  look: { id: 'hydra', colors: { skin: 0x4a3a6a, shirt: 0x3a2a58, pants: 0x1f4a34, emissive: 0x1a0a30 },
    parts: [
      ['body', 0x2e5a3c, 0.62, 0.3, 0.4, 0, 0.3, 0.08],
      ['body', 0x5a3a8a, 0.14, 0.2, 0.1, 0, 0.62, 0.3, { r: [0.5, 0, 0] }],
      ['body', 0x5a3a8a, 0.14, 0.16, 0.1, 0.18, 0.55, 0.28, { r: [0.5, 0, 0.3] }],
      ['body', 0x2e5a3c, 0.12, 0.55, 0.12, -0.34, 0.95, -0.08, { r: [-0.15, 0, 0.35] }],
      ['body', 0x5a3a8a, 0.22, 0.17, 0.3, -0.5, 1.28, -0.2],
      ['body', 0xffe040, 0.15, 0.04, 0.02, -0.5, 1.31, -0.36, { glow: true }],
      ['body', 0x2e5a3c, 0.13, 0.62, 0.13, 0, 1.0, -0.05, { r: [-0.2, 0, 0] }],
      ['body', 0x5a3a8a, 0.24, 0.19, 0.34, 0, 1.38, -0.2],
      ['body', 0xffe040, 0.17, 0.04, 0.02, 0, 1.41, -0.38, { glow: true }],
      ['body', 0x2e5a3c, 0.12, 0.55, 0.12, 0.34, 0.95, -0.08, { r: [-0.15, 0, -0.35] }],
      ['body', 0x5a3a8a, 0.22, 0.17, 0.3, 0.5, 1.28, -0.2],
      ['body', 0xffe040, 0.15, 0.04, 0.02, 0.5, 1.31, -0.36, { glow: true }],
      ['head', 0xff70ff, 0.3, 0.05, 0.02, 0, 0.27, -0.27, { glow: true }],
    ] },
  moves: [
    { id: 'bite', kind: 'circles', tele: 1.0, n: 3, at: 'player', seq: 0.6, spread: 2.2, r: 1.6, dmg: 14, range: [0, 14], cd: 5 },
    { id: 'spit', kind: 'shots', tele: 1.0, n: 5, gap: 0, spread: 60, speed: 7, dmg: 9, range: [3, 20], cd: 4.5 },
  ],
};
