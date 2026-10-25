// ステージ14 ゾンビ ヘリ: そらを まわる。サーチライトの まるに たま・ロケットが よく きく
export const BOSS = {
  id: 'heli', color: 0xffe080, shotColor: 0xffe070, shotSize: 0.3, fxColor: 0xc0c0c0, scale: 1.4,
  fly: { y: 6, r: 11, speed: 5 },
  hitMul: (z, dir, opt) => (opt && opt.blast ? 2 : 1),
  look: { id: 'heli', colors: { skin: 0x6a8a58, shirt: 0x3a4a40, pants: 0x2a3430, emissive: 0x08100a }, parts: [
    ['inner', 0x4a5a50, 1.1, 1.0, 1.4, 0, 1.15, 0],
    ['inner', 0x7a9aa8, 0.9, 0.5, 0.06, 0, 1.4, -0.72, { glow: true }],
    ['inner', 0x3a4a40, 0.5, 0.45, 1.6, 0, 1.2, 1.4],
    ['inner', 0x3a4a40, 0.1, 0.7, 0.4, 0, 1.55, 2.1],
    ['inner', 0x2a3430, 0.7, 0.05, 0.2, 0, 1.2, 2.1, { r: [0, 0, 0.9] }],
    ['inner', 0x2a3430, 0.16, 0.5, 0.16, 0, 1.8, 0],
    ['inner', 0x2a3430, 3.4, 0.05, 0.16, 0, 2.1, 0],
    ['inner', 0x2a3430, 0.16, 0.05, 3.4, 0, 2.12, 0],
    ['inner', 0x2a3430, 0.07, 0.07, 1.6, -0.6, 0.35, 0],
    ['inner', 0x2a3430, 0.07, 0.07, 1.6, 0.6, 0.35, 0],
    ['inner', 0x2a3430, 0.06, 0.4, 0.06, -0.6, 0.55, -0.4],
    ['inner', 0x2a3430, 0.06, 0.4, 0.06, 0.6, 0.55, -0.4],
    ['inner', 0x2a3430, 0.06, 0.4, 0.06, -0.6, 0.55, 0.4],
    ['inner', 0x2a3430, 0.06, 0.4, 0.06, 0.6, 0.55, 0.4],
    ['inner', 0xfff0a0, 0.3, 0.2, 0.3, 0, 0.55, -0.5, { glow: true }],
    ['inner', 0x6a8a58, 0.14, 0.14, 0.14, -0.6, 1.3, -0.3],
    ['inner', 0x6a8a58, 0.14, 0.14, 0.14, 0.6, 1.3, -0.3],
  ] },
  moves: [
    { id: 'light', kind: 'circles', tele: 1.3, at: 'player', n: 3, seq: 0.6, spread: 2.5, r: 1.8, dmg: 14, after: 'boom', color: 0xfff0a0, fxColor: 0xfff0a0, range: [0, 30], cd: 5 },
    { id: 'gun', kind: 'shots', tele: 1.0, n: 3, gap: 0.4, spread: 30, speed: 8, dmg: 8, range: [0, 30], cd: 4 },
  ],
};
