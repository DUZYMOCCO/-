// hashSimDeep（R-06）: hashSim が混ぜていない値（盾・キット・構え・撃つ間隔・群れ・作る資材の枠）の違いを見分ける。
// 今の hashSim の値は変わらない（主局面の 300 tick 後の値を固定）。
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, runSim, hashSim, hashSimDeep } from '../js/sim/sim.js?v=29';
import { MISSION_1 } from '../js/sim/mission.js?v=10';

const sample = (seed = 3) => { const sim = createSim({ seed, mission: MISSION_1 }); runSim(sim, 300); return sim; };

// v0.4.12-dev: 機体ごとの盾と体の表で値が変わった（前の表で前の値に戻ることは tests/shield-table.test.mjs）
test('hashSim の値は今の表のまま（主局面 300 tick 後・seed 1〜5）', () => {
  const want = ['6cc93eb6', '2a60b985', '24994a28', '5558d677', '6e46d4aa'];
  for (let seed = 1; seed <= 5; seed++) assert.equal(hashSim(sample(seed)), want[seed - 1], `seed ${seed}`);
});

test('同じ状態どうしは hashSimDeep も同じ・hashSimDeep は状態を変えない', () => {
  const a = sample(), b = sample();
  const before = hashSim(a);
  assert.equal(hashSimDeep(a), hashSimDeep(b));
  assert.equal(hashSimDeep(a), hashSimDeep(a));
  assert.equal(hashSim(a), before);
});

const allies = sim => sim.units.filter(u => u.side === 'ally' && !u.human);
for (const [name, mutate] of [
  ['盾', sim => { for (const u of allies(sim)) u.shieldHp = (u.shieldHp || 0) + 7; }],
  ['キット', sim => { for (const u of allies(sim)) u.kits = (u.kits || 0) + 1; }],
  ['構え', sim => { for (const u of allies(sim)) u.stance = u.stance === 'free' ? 'hold' : 'free'; }],
  ['撃つ間隔', sim => { for (const u of allies(sim)) u.cd = (u.cd || 0) + 0.5; }],
  ['群れの状態', sim => { for (const g of sim.groups) g.ai = g.ai === 'chase' ? 'idle' : 'chase'; }],
  ['作る資材の枠', sim => { sim.mission.spentOnCraft = (sim.mission.spentOnCraft || 0) + 5; }],
]) {
  test(`hashSimDeep は ${name} の違いを見分ける（hashSim は見分けない）`, () => {
    const a = sample(), b = sample();
    mutate(b);
    assert.equal(hashSim(a), hashSim(b));
    assert.notEqual(hashSimDeep(a), hashSimDeep(b));
  });
}
