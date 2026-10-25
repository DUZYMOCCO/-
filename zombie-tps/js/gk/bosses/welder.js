// ステージ9 ボス「ようせつ ゾンビ」: ひばなの おうぎ（オレンジ）・ひばなが プレイヤーを おいかけて 4こ
export const BOSS = {
  id: 'welder', color: 0xffa030, shotColor: 0xffa030, fxColor: 0xffa030, scale: 1.75,
  look: { id: 'welder', colors: { skin: 0x8a7a6a, shirt: 0xc87a28, pants: 0x4a4038, emissive: 0x181008 },
    parts: [
      ['head', 0x3a3e46, 0.58, 0.58, 0.58, 0, 0.26, 0],
      ['head', 0x2a2e34, 0.62, 0.12, 0.62, 0, 0.54, 0],
      ['head', 0x40a0ff, 0.34, 0.14, 0.02, 0, 0.28, -0.3, { glow: true }],
      ['head', 0x2a2e34, 0.38, 0.18, 0.04, 0, 0.28, -0.29],
      ['body', 0x8a6a3a, 0.5, 0.6, 0.06, 0, 0.3, -0.18],
      ['body', 0x808890, 0.16, 0.56, 0.16, -0.14, 0.4, 0.28],
      ['body', 0x3a6a8a, 0.16, 0.5, 0.16, 0.14, 0.38, 0.28],
      ['body', 0x2a2a2a, 0.04, 0.04, 0.5, 0.0, 0.3, 0.1, { r: [0.4, 0, 0] }],
      ['body', 0x5a4a38, 0.56, 0.08, 0.34, 0, 0.1, 0],
      ['body', 0xffd070, 0.08, 0.08, 0.08, 0.5, -0.2, -0.5, { glow: true }],
    ] },
  moves: [
    { id: 'sparks', kind: 'cone', tele: 1.0, len: 6, range: [0, 8], angle: 70, dmg: 8, dur: 1.4, tick: 0.4, fxColor: 0xffa030, cd: 5 },
    { id: 'embers', kind: 'circles', tele: 1.0, n: 4, at: 'player', seq: 0.35, spread: 2.5, r: 1.4, dmg: 12, fxColor: 0xffa030, range: [2, 20], cd: 5.5 },
  ],
};
