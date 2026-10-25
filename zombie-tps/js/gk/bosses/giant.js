// ステージ3 ボス「てっかめん の きょじん」: でかい・まっすぐ とっしん（かべで きぜつ）・ふみつけ
export const BOSS = {
  id: 'giant', color: 0xff8a30, shotColor: 0xc88aff, fxColor: 0xb0a090, scale: 2.1, speed: 0.85,
  look: { id: 'giant', colors: { skin: 0x7a6a5a, shirt: 0x4a3c30, pants: 0x2e2a26, emissive: 0x120a04 },
    parts: [
      ['head', 0x8a8e94, 0.6, 0.62, 0.6, 0, 0.27, 0],
      ['head', 0x5a5e64, 0.64, 0.08, 0.64, 0, 0.6, 0],
      ['head', 0xffb060, 0.4, 0.05, 0.02, 0, 0.3, -0.31, { glow: true }],
      ['head', 0x4a4e54, 0.08, 0.3, 0.02, 0, 0.1, -0.31],
      ['body', 0x5a5248, 0.7, 0.18, 0.4, 0, 0.7, 0],
      ['body', 0x3a3028, 0.5, 0.5, 0.06, 0, 0.0, -0.18],
      ['body', 0x3a3028, 0.18, 0.4, 0.06, -0.2, -0.28, -0.18],
      ['body', 0x3a3028, 0.2, 0.34, 0.06, 0.18, -0.24, -0.18],
      ['body', 0x6a6a70, 0.54, 0.07, 0.34, 0, 0.1, 0],
    ] },
  moves: [
    { id: 'rush', kind: 'line', tele: 1.2, dash: true, len: 14, w: 3, speed: 13, dmg: 20, stun: 2, range: [5, 16], cd: 7 },
    { id: 'stomp', kind: 'circles', tele: 1.1, n: 1, at: 'self', r: 3.5, dmg: 16, range: [0, 5], cd: 5 },
  ],
};
