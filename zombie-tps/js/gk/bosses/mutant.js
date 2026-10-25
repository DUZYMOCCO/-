// ステージ4 ボス「どろどろ ミュータント」: みどりの さんの みずたまり・さんの たま
export const BOSS = {
  id: 'mutant', color: 0x7ae03a, shotColor: 0x80ff40, shotSize: 0.36, eggColor: 0x90d050, fxColor: 0x70e030, scale: 1.75,
  look: { id: 'mutant', colors: { skin: 0x5ab02a, shirt: 0x3a7a22, pants: 0x2a5a1c, emissive: 0x0a2a04 },
    parts: [
      ['body', 0x6ac03a, 0.34, 0.34, 0.34, -0.3, 0.74, -0.02],
      ['body', 0x4a9a2a, 0.26, 0.26, 0.26, 0.28, 0.5, 0.18],
      ['body', 0x8ae04a, 0.2, 0.2, 0.2, 0.1, 0.9, 0.12],
      ['body', 0x3a7a22, 0.16, 0.44, 0.16, -0.2, -0.1, -0.15],
      ['body', 0x3a7a22, 0.14, 0.3, 0.14, 0.15, -0.04, -0.16],
      ['body', 0x4a9a2a, 0.12, 0.5, 0.12, 0.3, -0.12, 0.1],
      ['body', 0xb0ff60, 0.1, 0.1, 0.1, -0.2, -0.38, -0.15, { glow: true }],
      ['head', 0x6ac03a, 0.3, 0.3, 0.3, 0.22, 0.46, 0.04],
      ['head', 0x3a7a22, 0.12, 0.34, 0.1, -0.12, -0.05, -0.27],
      ['head', 0xd0ff40, 0.3, 0.06, 0.02, 0, 0.27, -0.27, { glow: true }],
      ['inner', 0x4a9a2a, 0.8, 0.14, 0.7, 0, 0.07, 0],
    ] },
  moves: [
    { id: 'puddle', kind: 'circles', tele: 1.0, n: 3, at: 'around', seq: 0.4, spread: 3.2, r: 1.8, dmg: 8, after: 'puddle', dps: 6, life: 6, fxColor: 0x70e030, range: [0, 16], cd: 6 },
    { id: 'spit', kind: 'shots', tele: 1.0, n: 3, gap: 0.4, speed: 7, dmg: 10, range: [3, 20], cd: 4 },
  ],
};
