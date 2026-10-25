// ステージ5 ボス「あかい め の おう」: ぶんしん 2たい（ほんものだけ め が ひかる）・あかい たまの おうぎ・とっしん
const COMMON = [
  ['head', 0xe8c040, 0.54, 0.1, 0.54, 0, 0.55, 0],
  ['head', 0xe8c040, 0.1, 0.16, 0.1, -0.2, 0.67, -0.2], ['head', 0xe8c040, 0.1, 0.16, 0.1, 0.2, 0.67, -0.2],
  ['head', 0xe8c040, 0.1, 0.16, 0.1, 0, 0.67, -0.22],
  ['body', 0x6a1020, 0.6, 1.0, 0.06, 0, 0.1, 0.2, { r: [0.12, 0, 0] }],
  ['body', 0x6a1020, 0.72, 0.1, 0.4, 0, 0.78, 0],
  ['body', 0xe8c040, 0.54, 0.07, 0.32, 0, 0.08, 0],
];
export const BOSS = {
  id: 'king', color: 0xff3a3a, shotColor: 0xff5050, shotSize: 0.34, fxColor: 0xc060ff, scale: 1.75,
  look: { id: 'king', colors: { skin: 0xb09a8a, shirt: 0x2a1a30, pants: 0x1a1220, emissive: 0x200808 },
    parts: [...COMMON, ['head', 0xff2020, 0.34, 0.07, 0.02, 0, 0.28, -0.27, { glow: true }]] },
  extraLooks: { kingc: { colors: { skin: 0xb09a8a, shirt: 0x2a1a30, pants: 0x1a1220, emissive: 0x100404 }, parts: COMMON } },
  moves: [
    { id: 'clones', kind: 'clones', tele: 1.2, n: 2, cap: 2, minion: 'brute@kingc', hpMul: 0.2, range: [0, 30], cd: 9 },
    { id: 'fan', kind: 'shots', tele: 1.0, n: 5, gap: 0, spread: 70, speed: 8, dmg: 12, range: [3, 20], cd: 5 },
    { id: 'charge', kind: 'line', tele: 1.0, dash: true, len: 10, w: 2.4, speed: 13, dmg: 18, range: [3, 12], cd: 6 },
  ],
};
