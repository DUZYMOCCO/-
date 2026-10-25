// 人間がロボに乗るお試し（?ridedemo=1 とテストだけ。本編のミッション MISSION_1 には入れない）
// 今のマップ（seed 7）に、少年・少女（ミント）・獣人（ロウ）と、乗れるロボ（PONCO02・空を飛ぶ PONCO02・ツギハギ号・巨大機）、少し離れた所に異星生物を置く。ミッションなし。
// v1.0.0: PONCO とツギハギ号は背中に1人、巨大機は中（操縦席）に2人（ride.js の RIDE_TABLE）。中に乗る様子を見せるため巨大機を1体足した
import { createSim, deployUnit } from './sim.js?v=23';
import { ALT_TEST_UNITS } from './altitude.js?v=1';

export const RIDE_DEMO_SETUP = Object.freeze({
  ally: [
    { kind: 'ponco', tx: 18, ty: 47, count: 1, cls: 'gunner', name: 'PONCO02 1' },
    { kind: 'ponco', tx: 22, ty: 47, count: 1, cls: 'gunner', name: 'PONCO02 2' },
    { kind: 'ponco', tx: 26, ty: 45, count: 1, cls: 'gunner', ...ALT_TEST_UNITS.air, name: '空の PONCO' },
    { kind: 'scav', tx: 14, ty: 48, count: 1, cls: 'scavenger', name: 'ツギハギ1' },
    { kind: 'giant', tx: 24, ty: 49, count: 1, name: '巨大機1' },
    { kind: 'boy', tx: 19, ty: 50, count: 1 },
    { kind: 'girl', tx: 21, ty: 50, count: 1, name: 'ミント' }, // v1.0.0: 少女の名前はミント
  ],
  // 異星生物は少し離れた所に。ロボを前へ出すと気づいて寄ってくる（背中の人が撃たれる様子を見る）
  enemy: [
    { name: '赤1', kind: 'alien', tx: 19, ty: 37, role: 'guard', count: 1 },
    { name: '赤2', kind: 'alien', tx: 27, ty: 38, role: 'guard', count: 1 },
    { name: '守り', kind: 'alien', tx: 20, ty: 8, role: 'guard', count: 1 }, // 遠くの敵陣にいる倒せない1体（敵が全部いなくなってお試しが「勝ち」で終わらないように）
  ],
});

/**
 * 狼の獣人ロウ（お試しの中だけ）: KINDS（本編の種類の表）には狼がないので、少年を出してから種類を 'wolf' に書きかえる
 * （絵は assets/chars/WOLF）。人間の枠（3人）の1人。KINDS は書きかえない。
 * v1.0.0: ふつうの人間と同じ扱い（HP も少年と同じ。乗る・捕まる・集めるも同じ決まり）
 */
export function addDemoWolf(sim, tile = { tx: 23, ty: 50 }) {
  const u = deployUnit(sim, 'boy', tile, { label: 'ロウ' });
  if (!u) return null;
  u.kind = 'wolf';
  return u;
}

/** お試しの sim（?ridedemo=1）。seed・mapSeed は URL から */
export function createRideDemoSim({ seed = 1, mapSeed = 7 } = {}) {
  const sim = createSim({ seed, mapSeed, setup: RIDE_DEMO_SETUP });
  addDemoWolf(sim);
  for (const u of sim.units) if (u.label === '守り') u.hp = u.maxHp = 1e9;
  return sim;
}
