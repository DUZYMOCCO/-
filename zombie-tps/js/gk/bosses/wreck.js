// ステージ10 がれきの きょじん: コンクリと てっきんの かたまり。がれきなげ・ふみつけ
export const BOSS = {
  id: 'wreck', color: 0xff8a2a, shotColor: 0x9a9a98, fxColor: 0xa0a09a, scale: 2.1, speed: 0.85,
  look: { id: 'wreck', colors: { skin: 0x8a8a84, shirt: 0x6a6a66, pants: 0x4a4a48, emissive: 0x100c08 }, parts: [
    ['body', 0x7a7a76, 0.7, 0.5, 0.42, 0, 0.5, 0.02],
    ['body', 0x5c5c5a, 0.34, 0.3, 0.3, -0.34, 0.9, 0.02, { r: [0, 0, 0.4] }],
    ['body', 0x8a8a84, 0.36, 0.34, 0.3, 0.36, 0.86, 0],
    ['body', 0x4a4a48, 0.16, 0.16, 0.14, 0.12, 0.3, -0.24],
    ['body', 0x9a6a3a, 0.05, 0.7, 0.05, -0.3, 1.2, 0.05, { r: [0.3, 0, 0.2] }],
    ['body', 0x9a6a3a, 0.05, 0.6, 0.05, 0.4, 1.15, 0, { r: [-0.2, 0, -0.3] }],
    ['body', 0x9a6a3a, 0.04, 0.5, 0.04, 0.1, 1.2, 0.1, { r: [0.4, 0, 0.1] }],
    ['head', 0x8a8a84, 0.34, 0.3, 0.3, -0.12, 0.62, 0.02, { r: [0, 0.5, 0] }],
    ['head', 0x6a6a66, 0.5, 0.12, 0.5, 0, 0.1, 0],
    ['head', 0xffa040, 0.14, 0.06, 0.04, -0.12, 0.28, -0.26, { glow: true }],
    ['head', 0xffa040, 0.14, 0.06, 0.04, 0.12, 0.28, -0.26, { glow: true }],
    ['inner', 0x7a7a76, 0.34, 0.2, 0.34, -0.2, 0.1, 0],
    ['inner', 0x7a7a76, 0.34, 0.2, 0.34, 0.2, 0.1, 0],
  ] },
  moves: [
    { id: 'throw', kind: 'circles', tele: 1.2, at: 'player', n: 3, seq: 0.5, spread: 3, r: 1.6, dmg: 14, after: 'boom', fxColor: 0xa0a09a, range: [4, 22], cd: 5 },
    { id: 'stomp', kind: 'circles', tele: 1.1, at: 'self', n: 1, r: 4.2, dmg: 18, knock: 5, fxColor: 0xa0a09a, range: [0, 6], cd: 5.5 },
  ],
};
