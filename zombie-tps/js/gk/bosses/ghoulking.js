// ステージ16 いせきの グール: ほねっぽい おう。てしたを よぶ・じめんたたき
export const BOSS = {
  id: 'ghoulking', color: 0xc0a050, shotColor: 0xb0a0c0, fxColor: 0x9a8ac0, scale: 1.85,
  look: { id: 'ghoulking', colors: { skin: 0xb8b4a8, shirt: 0x5a5448, pants: 0x3a362e, emissive: 0x0c0a08 }, parts: [
    ['body', 0xd0ccc0, 0.54, 0.06, 0.32, 0, 0.62, -0.01],
    ['body', 0xd0ccc0, 0.5, 0.06, 0.32, 0, 0.46, -0.01],
    ['body', 0xd0ccc0, 0.46, 0.06, 0.32, 0, 0.3, -0.01],
    ['body', 0x3a3a50, 0.7, 0.9, 0.06, 0, 0.1, 0.2, { r: [0.05, 0, 0] }],
    ['body', 0x4a3a60, 0.36, 0.16, 0.34, -0.4, 0.74, 0],
    ['body', 0x4a3a60, 0.36, 0.16, 0.34, 0.4, 0.74, 0],
    ['head', 0xc8c4b8, 0.58, 0.1, 0.1, 0, 0.12, -0.24],
    ['head', 0x40e0c0, 0.12, 0.1, 0.05, -0.12, 0.28, -0.26, { glow: true }],
    ['head', 0x40e0c0, 0.12, 0.1, 0.05, 0.12, 0.28, -0.26, { glow: true }],
    ['head', 0xd8b040, 0.54, 0.1, 0.54, 0, 0.55, 0],
    ['head', 0xd8b040, 0.1, 0.2, 0.1, -0.2, 0.68, -0.2],
    ['head', 0xd8b040, 0.1, 0.26, 0.1, 0, 0.7, -0.22],
    ['head', 0xd8b040, 0.1, 0.2, 0.1, 0.2, 0.68, -0.2],
    ['inner', 0x6a5a40, 0.08, 1.9, 0.08, -0.62, 0.9, -0.5],
    ['inner', 0x40e0c0, 0.22, 0.22, 0.22, -0.62, 1.9, -0.5, { glow: true, r: [0.6, 0.6, 0] }],
    ['inner', 0x4a3a60, 0.62, 0.3, 0.4, 0, 0.45, 0],
  ] },
  moves: [
    { id: 'call', kind: 'summon', tele: 1.2, n: 2, cap: 4, minion: 'walker', hpMul: 0.7, range: [0, 20], cd: 7 },
    { id: 'slam', kind: 'circles', tele: 1.1, at: 'self', n: 1, r: 4, dmg: 18, knock: 5, fxColor: 0x9a8ac0, range: [0, 5], cd: 4.5 },
  ],
};
