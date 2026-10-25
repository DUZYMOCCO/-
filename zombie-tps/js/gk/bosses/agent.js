// v0.17.0: ステージ1 ボス「くろよろい エージェント」（かくう）。むらさきの バイザー → 3れんしゃ（おそい たま）・たての とっしん
// みためは models.js の agent（v0.16.0）を そのまま つかう
export const BOSS = {
  id: 'agent', color: 0xb46bff, shotColor: 0xc88aff,
  look: { id: 'agent', colors: { skin: 0x58606e, shirt: 0x1c1f26, pants: 0x14161a, emissive: 0x140a24 } },
  moves: [
    { id: 'burst', kind: 'shots', tele: 1.0, n: 3, gap: 0.35, speed: 8, dmg: 10, range: [3, 22], cd: 3.5 },
    { id: 'dash', kind: 'line', tele: 1.0, dash: true, len: 12, w: 2.6, speed: 14, dmg: 18, range: [4, 13], cd: 5.5 },
  ],
};
