// ステージ6 ボス「メスの せんせい」: なげメスの おうぎ（おそい）・みじかい とっしん
export const BOSS = {
  id: 'surgeon', color: 0xff6a3a, shotColor: 0xd8f0f0, shotSize: 0.26, fxColor: 0x70ff90, scale: 1.75,
  look: { id: 'surgeon', colors: { skin: 0xc8b8a8, shirt: 0xe8ecee, pants: 0x9aa8b0, emissive: 0x0a1210 },
    parts: [
      ['body', 0xdfe4e6, 0.58, 0.9, 0.34, 0, 0.0, 0],
      ['body', 0xdfe4e6, 0.5, 0.4, 0.06, 0, -0.45, -0.17],
      ['body', 0x7ac8b0, 0.12, 0.3, 0.04, 0, 0.5, -0.16],
      ['body', 0x3a6a5a, 0.56, 0.06, 0.34, 0, 0.12, 0],
      ['head', 0x9ad0c8, 0.52, 0.24, 0.52, 0, 0.1, -0.02],
      ['head', 0x20282a, 0.54, 0.16, 0.06, 0, 0.3, -0.26],
      ['head', 0x60ffb0, 0.16, 0.08, 0.02, -0.12, 0.3, -0.3, { glow: true }],
      ['head', 0x60ffb0, 0.16, 0.08, 0.02, 0.12, 0.3, -0.3, { glow: true }],
      ['head', 0x9ad0c8, 0.54, 0.12, 0.54, 0, 0.5, 0.02],
      ['body', 0xe8f4f4, 0.05, 0.4, 0.04, 0.42, -0.1, -0.5, { r: [0.2, 0, 0] }],
    ] },
  moves: [
    { id: 'knives', kind: 'shots', tele: 1.0, n: 5, gap: 0, spread: 50, speed: 7, dmg: 8, range: [3, 20], cd: 4.5 },
    { id: 'lunge', kind: 'line', tele: 0.9, dash: true, len: 7, w: 2.2, speed: 12, dmg: 15, range: [2, 8], cd: 5 },
  ],
};
