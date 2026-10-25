// ステージ7 ボス「ぼうそう せんしゃ」: おそい・ほうげき（まる 3こ → ばくはつ）・おおきな たま。うしろが よわい（×2・まえは ×0.6）
export const BOSS = {
  id: 'tank', color: 0xff7a30, shotColor: 0xffc060, shotSize: 0.4, fxColor: 0x9a9a8a, scale: 2.0, speed: 0.6,
  hitMul: (z, dir, opt) => {
    if ((opt && opt.blast) || !dir) return 1;
    return (dir.x * -Math.sin(z.yaw) + dir.z * -Math.cos(z.yaw)) > 0 ? 2 : 0.6;
  },
  look: { id: 'tank', colors: { skin: 0x7a7a6a, shirt: 0x5a6040, pants: 0x3a3e30, emissive: 0x101208 },
    parts: [
      ['inner', 0x4a5036, 1.0, 0.36, 1.1, 0, 0.5, 0.05],
      ['inner', 0x2a2c28, 0.28, 0.6, 1.3, -0.62, 0.3, 0.05],
      ['inner', 0x2a2c28, 0.28, 0.6, 1.3, 0.62, 0.3, 0.05],
      ['inner', 0x5a5e58, 0.22, 0.22, 0.22, -0.62, 0.3, -0.5],
      ['inner', 0x5a5e58, 0.22, 0.22, 0.22, 0.62, 0.3, -0.5],
      ['body', 0x5a6040, 0.84, 0.4, 0.8, 0, 0.4, 0],
      ['body', 0x3a3e30, 0.16, 0.16, 1.0, 0, 0.45, -0.85],
      ['body', 0x2a2c28, 0.22, 0.22, 0.14, 0, 0.45, -1.4],
      ['body', 0x6a7050, 0.3, 0.12, 0.3, 0.2, 0.68, 0.1],
      ['body', 0xff8020, 0.4, 0.2, 0.04, 0, 0.35, 0.42, { glow: true }],
      ['body', 0x3a3e30, 0.5, 0.3, 0.06, 0, 0.35, 0.46],
    ] },
  moves: [
    { id: 'shell', kind: 'circles', tele: 1.2, n: 3, at: 'around', seq: 0.5, spread: 4, r: 2.2, dmg: 18, after: 'boom', range: [3, 25], cd: 5.5 },
    { id: 'cannon', kind: 'shots', tele: 1.0, n: 3, gap: 0.8, speed: 8, dmg: 12, range: [3, 22], cd: 4.5 },
  ],
};
