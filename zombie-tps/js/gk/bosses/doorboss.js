// v0.17.0: ステージ18 ボス「サングラスの ボス」（かくう）。ドアを あけて ぶかを よぶ・ドアから ドアへ ワープ（ドアの ランプで よこく）・たいあたり
export const BOSS = {
  id: 'doorboss', color: 0xff3b30, scale: 1.9, fxColor: 0x9a9aa0,
  look: {
    id: 'doorboss', colors: { skin: 0x6a8a5a, shirt: 0x14161a, pants: 0x101114, emissive: 0x0a120a },
    parts: [
      ['head', 0x08080a, 0.5, 0.11, 0.05, 0, 0.3, -0.27], ['head', 0x3a3a44, 0.12, 0.05, 0.06, 0, 0.31, -0.29, { glow: true }],
      ['head', 0x1a1a1e, 0.54, 0.12, 0.54, 0, 0.52, 0.02], ['head', 0x1a1a1e, 0.54, 0.2, 0.1, 0, 0.42, 0.24],
      ['body', 0xeeeeee, 0.18, 0.56, 0.02, 0, 0.42, -0.155], ['body', 0x7a1c2a, 0.08, 0.46, 0.03, 0, 0.4, -0.17],
      ['body', 0x23262e, 0.6, 0.12, 0.36, 0, 0.7, 0], ['body', 0xd8c060, 0.06, 0.06, 0.03, 0.16, 0.6, -0.16, { glow: true }],
    ],
  },
  moves: [
    { id: 'call', kind: 'summon', via: 'doors', tele: 1.0, n: 2, cap: 4, minion: 'walker@suit', hpMul: 0.9, range: [0, 40], cd: 7 },
    { id: 'warp', kind: 'pounce', via: 'doors', hide: 0.5, tele: 1.0, r: 2.0, dmg: 14, range: [0, 40], cd: 6 },
    { id: 'tackle', kind: 'line', dash: true, tele: 1.0, len: 9, w: 2.2, speed: 13, dmg: 16, range: [3, 10], cd: 5 },
  ],
};
