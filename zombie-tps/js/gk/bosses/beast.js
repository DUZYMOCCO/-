// ステージ8 ボス「もりの ぬし」: きりに かくれて（かげが おいかける）とびかかる・つめの おうぎ
export const BOSS = {
  id: 'beast', color: 0xff7a30, shotColor: 0xc88aff, fxColor: 0xb8b0a0, scale: 2.0,
  look: { id: 'beast', colors: { skin: 0x4a3626, shirt: 0x3a2a1c, pants: 0x2a1e14, emissive: 0x100a04 },
    parts: [
      ['body', 0x2e2218, 0.9, 0.5, 0.56, 0, 0.62, 0.05],
      ['body', 0x4a3626, 0.7, 0.3, 0.5, 0, 0.35, 0.18],
      ['body', 0x2e2218, 0.12, 0.3, 0.12, -0.3, 0.98, 0, { r: [0, 0, 0.3] }],
      ['body', 0x2e2218, 0.12, 0.34, 0.12, 0, 1.0, 0.04],
      ['body', 0x2e2218, 0.12, 0.3, 0.12, 0.3, 0.98, 0, { r: [0, 0, -0.3] }],
      ['head', 0x2a1e14, 0.62, 0.4, 0.62, 0, 0.2, 0.02],
      ['head', 0xe8e0c8, 0.1, 0.4, 0.1, -0.26, 0.62, -0.02, { r: [0, 0, 0.35] }],
      ['head', 0xe8e0c8, 0.1, 0.4, 0.1, 0.26, 0.62, -0.02, { r: [0, 0, -0.35] }],
      ['head', 0xffd040, 0.12, 0.08, 0.02, -0.12, 0.28, -0.33, { glow: true }],
      ['head', 0xffd040, 0.12, 0.08, 0.02, 0.12, 0.28, -0.33, { glow: true }],
      ['head', 0xe8e0c8, 0.05, 0.12, 0.04, -0.1, 0.0, -0.33],
      ['head', 0xe8e0c8, 0.05, 0.12, 0.04, 0.1, 0.0, -0.33],
    ] },
  moves: [
    { id: 'pounce', kind: 'pounce', hide: 1.5, tele: 1.0, r: 2.8, dmg: 22, fxColor: 0xb8b0a0, range: [4, 20], cd: 7 },
    { id: 'claw', kind: 'cone', tele: 0.9, len: 4.5, range: [0, 5], angle: 90, dmg: 10, dur: 1.0, tick: 0.5, fxColor: 0xc88aff, cd: 4 },
  ],
};
