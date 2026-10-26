// v0.4.0-dev 1機ずつ選ぶ・まとめて選ぶ・組の保存（入力の決まりだけ）
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, runSim, issueOrder, TICK } from '../js/sim/sim.js?v=28';
import { allyAt, enemyAt, unitsInRect, selectKind, pruneSelection, tapSelect, createGroups } from '../js/sim/select.js?v=12';
import { MISSION_1 } from '../js/sim/mission.js?v=10';

const sim0 = () => createSim({ seed: 1, mission: MISSION_1 });

test('タップ: 一番近い味方を1機だけ選ぶ・もう一度で外す・遠ければ選ばない', () => {
  const sim = sim0(), u = sim.units.find(v => v.kind === 'ponco');
  assert.equal(allyAt(sim.units, u.x + 3, u.y - 12, 24), u);
  assert.equal(allyAt(sim.units, u.x + 150, u.y, 24), null);
  let sel = tapSelect([], u.id);
  assert.deepEqual(sel, [u.id]);
  const v = sim.units.find(w => w.kind === 'scav');
  sel = tapSelect(sel, v.id); assert.deepEqual(sel, [v.id], '別の機体をタップ→その機体だけ');
  sel = tapSelect(sel, u.id, true); assert.deepEqual(sel, [v.id, u.id], '足す');
  sel = tapSelect([u.id], u.id); assert.deepEqual(sel, [], 'もう一度で外す');
});

test('タップで選んだ1機だけが命令で動く', () => {
  const sim = sim0(), us = sim.units.filter(u => u.side === 'ally');
  const before = us.map(u => ({ x: u.x, y: u.y }));
  const t = us[5];
  const sel = tapSelect([], allyAt(sim.units, t.x, t.y - 12, 24).id);
  issueOrder(sim, sel, [{ tx: 20, ty: 45 }]);
  runSim(sim, Math.round(3 / TICK));
  us.forEach((u, i) => {
    const moved = Math.hypot(u.x - before[i].x, u.y - before[i].y);
    if (u === t) assert.ok(moved > 40, '選んだ機体は動く');
    else assert.ok(moved < 16, `${u.label} は動かない (${moved.toFixed(1)})`);
  });
});

test('枠で囲む・同じ種類・人間だけ・ロボット全員', () => {
  const sim = sim0();
  const scav = sim.units.filter(u => u.kind === 'scav');
  const xs = scav.map(u => u.x), ys = scav.map(u => u.y);
  const inRect = unitsInRect(sim.units, { x: Math.min(...xs) - 1, y: Math.min(...ys) - 1 }, { x: Math.max(...xs) + 1, y: Math.max(...ys) + 1 });
  for (const u of scav) assert.ok(inRect.includes(u.id));
  assert.equal(selectKind(sim.units, 'ponco').length, 8);
  assert.equal(selectKind(sim.units, 'all').length, 12, 'ロボット全員（人間は入らない）');
  assert.equal(selectKind(sim.units, 'human').length, 2);
  assert.ok(sim.units.filter(u => u.side === 'enemy').every(e => !inRect.includes(e.id) && !selectKind(sim.units, 'all').includes(e.id)), '敵は選べない');
});

test('狙う相手: 見えている敵だけ', () => {
  const sim = sim0(), e = sim.units.find(u => u.side === 'enemy');
  assert.equal(enemyAt(sim.units, e.x, e.y - 14, 30), e);
  assert.equal(enemyAt(sim.units, e.x, e.y - 14, 30, () => false), null);
});

test('組①②③: 保存して呼び出す。倒れた・捕まった機体は外れる', () => {
  const sim = sim0(), g = createGroups();
  const ids = selectKind(sim.units, 'scav');
  g.save(0, ids);
  assert.deepEqual(g.recall(0, sim.units), ids);
  assert.deepEqual(g.recall(1, sim.units), []);
  const u = sim.units.find(v => v.id === ids[0]); u.hp = 0; runSim(sim, 1);
  const boy = sim.units.find(v => v.kind === 'boy'); boy.captured = 999;
  assert.deepEqual(g.recall(0, sim.units), ids.slice(1));
  assert.deepEqual(pruneSelection(sim.units, [boy.id, ids[1]]), [ids[1]]);
});
