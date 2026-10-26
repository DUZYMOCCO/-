import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SPEEDS, DEFAULT_SPEED, normalizeSpeed, hudSpeedText, advance } from '../js/ui/speed.js?v=1';
import { createSim, stepSim, TICK } from '../js/sim/sim.js?v=27';
import { MISSION_1 } from '../js/sim/mission.js?v=10';
const read = rel => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

test('速さは 0.5/1/2 の3択・始まりは 1x・HUD は 1x 以外だけ', () => {
  assert.deepEqual(SPEEDS, [0.5, 1, 2]);
  assert.equal(DEFAULT_SPEED, 1);
  assert.equal(normalizeSpeed('0.5'), 0.5);
  assert.equal(normalizeSpeed(3), 1);
  assert.equal(hudSpeedText(1), '');
  assert.equal(hudSpeedText(0.5), '0.5x');
  assert.equal(hudSpeedText(2), '2x');
});

test('メニューに3つのボタンがあり、ゲーム画面にボタンは増えていない', () => {
  const src = read('../js/index.js');
  for (const v of ['0.5', '1', '2']) assert.ok(src.includes(`data-speed="${v}"`), v);
  const menu = src.slice(src.indexOf('class="bc-menu"'), src.indexOf('class="bc-confirm"'));
  assert.equal((menu.match(/data-speed=/g) || []).length, 3);
  assert.equal((src.match(/data-speed=/g) || []).length, 3);
  assert.ok(read('../sw-assets.js').includes("'js/ui/speed.js'"));
});

test('0.5x は同じ実時間で刻みがちょうど半分・結果は 1x で半分の時間を進めたのと同じ', () => {
  const run = speed => {
    const sim = createSim({ seed: 5, mission: MISSION_1 });
    let acc = 0, steps = 0;
    for (let f = 0; f < 60 * 20; f++) { const r = advance(acc, 1 / 60, speed, TICK); acc = r.acc; steps += r.steps; for (let i = 0; i < r.steps; i++) stepSim(sim); }
    return { steps, sim };
  };
  const half = run(0.5), one = run(1), two = run(2);
  assert.ok(Math.abs(half.steps * 2 - one.steps) <= 1, `${half.steps} vs ${one.steps}`);
  assert.ok(Math.abs(two.steps - one.steps * 2) <= 2, `${two.steps} vs ${one.steps}`);
  // 0.5x で20秒 ＝ 1x で10秒：同じ刻み数なら同じ状態（固定刻みなのでタイマー・クールダウン・作成・修理もそろう）
  const ref = createSim({ seed: 5, mission: MISSION_1 });
  for (let i = 0; i < half.steps; i++) stepSim(ref);
  const sig = s => JSON.stringify(s.units.map(u => [u.id, Math.round(u.x * 100), Math.round(u.hp * 100), Math.round((u.cd || 0) * 1000)]));
  assert.equal(sig(half.sim), sig(ref));
});

test('知らせ（toast）は実時間（setTimeout）のまま', () => {
  assert.match(read('../js/index.js'), /toastTimer = setTimeout\(/);
});
