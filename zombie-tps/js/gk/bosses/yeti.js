// ステージ12 こおりの きょじん: しろい けの きょじん。こおりの つぶて・じめんを こおらせる
export const BOSS = {
  id: 'yeti', color: 0x6ac8ff, shotColor: 0x9ae0ff, shotSize: 0.38, fxColor: 0xc8f0ff, scale: 2.0,
  look: { id: 'yeti', colors: { skin: 0x7ab4e0, shirt: 0xe8f0f4, pants: 0xdce8ee, emissive: 0x0a1a28 }, parts: [
    ['body', 0xf0f6fa, 0.74, 0.8, 0.5, 0, 0.38, 0.03],
    ['body', 0xe4eef4, 0.4, 0.4, 0.4, -0.45, 0.72, 0],
    ['body', 0xe4eef4, 0.4, 0.4, 0.4, 0.45, 0.72, 0],
    ['body', 0xdcecf4, 0.5, 0.3, 0.1, 0, 0.1, -0.28],
    ['body', 0xe8f4ff, 0.08, 0.3, 0.08, -0.45, 0.98, -0.06, { r: [0, 0, 0.2] }],
    ['body', 0xe8f4ff, 0.08, 0.36, 0.08, 0.45, 1.0, -0.06, { r: [0, 0, -0.2] }],
    ['body', 0xe8f4ff, 0.08, 0.3, 0.08, -0.15, 0.95, 0.2],
    ['head', 0xf0f6fa, 0.6, 0.2, 0.56, 0, 0.5, 0.02],
    ['head', 0xf0f6fa, 0.14, 0.3, 0.5, -0.32, 0.25, 0.02],
    ['head', 0xf0f6fa, 0.14, 0.3, 0.5, 0.32, 0.25, 0.02],
    ['head', 0xc8ecff, 0.08, 0.3, 0.08, -0.18, 0.05, -0.28, { glow: true }],
    ['head', 0xc8ecff, 0.08, 0.3, 0.08, 0.18, 0.05, -0.28, { glow: true }],
    ['head', 0x3a5a7a, 0.3, 0.07, 0.04, 0, 0.1, -0.27],
    ['inner', 0xe4eef4, 0.3, 0.16, 0.34, -0.14, 0.06, -0.04],
    ['inner', 0xe4eef4, 0.3, 0.16, 0.34, 0.14, 0.06, -0.04],
  ] },
  moves: [
    { id: 'hail', kind: 'shots', tele: 1.0, n: 3, gap: 0.3, spread: 30, speed: 8, dmg: 9, range: [4, 22], cd: 3.8 },
    { id: 'freeze', kind: 'circles', tele: 1.2, at: 'player', n: 2, seq: 0.6, spread: 2.5, r: 3.2, dmg: 8, after: 'ice', life: 7, fxColor: 0xc8f0ff, range: [3, 20], cd: 6 },
  ],
};
