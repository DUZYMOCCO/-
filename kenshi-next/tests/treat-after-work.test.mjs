// 手当て・縄ほどきの命令が終わったら、前の命令の待ち場所（holdAt）へ戻らない
import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, applyCommand, forceSquad, checkCondition, startTask } from '../js/sim/index.js';
import { makeKit } from '../js/sim/medkit.js';
import { AUTO_RESUME_TICKS } from '../js/sim/orders.js';

const d = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
function run(s, n) { for (let i = 0; i < n; i += 1) step(s); }
function runUntilIdle(s, a, limit = 6000) {
  for (let i = 0; i < limit; i += 1) { step(s); if (!a.task) return true; }
  return false;
}
function knock(s, a) { a.parts.chest.hp = 0; checkCondition(s, a, []); }
function place(a, x, z) { a.x = x; a.z = z; a.moveTo = null; }

// プレイヤー部隊の2人（操作キャラと仲間）と、倒れている野盗（手当ての相手）
function setup() {
  const s = createWorld(5, { spawn: true, spawnRate: 0 });
  s.spawn.on = false;
  const [p, c] = s.squadIds.map((id) => s.actors.find((a) => a.id === id));
  const sq = forceSquad(s, 'raiders', p.x + 60, p.z);
  const foes = s.actors.filter((a) => a.squadId === sq.id);
  const patient = foes[0];
  for (const f of foes.slice(1)) f.state = 'dead';
  knock(s, patient);
  patient.downTicks = 1e9; // 手当ての間は起きない
  place(patient, c.x, c.z + 9);
  s.actors = [p, c, patient];
  s.squadIds = [p.id, c.id];
  p.stance = c.stance = 'passive';
  place(p, c.x - 15, c.z);
  c.kits = [makeKit('advanced')];
  c.skills.medic = 100;
  return { s, p, c, patient };
}

test('命令の手当てが終わったら、前の移動の着地点（待ち場所）へは戻らない', () => {
  const { s, p, c, patient } = setup();
  // 仲間へ移動命令 → そこで待つ（holdAt が付く）
  assert.ok(applyCommand(s, { type: 'move', x: c.x + 4, z: c.z, actorId: c.id }));
  run(s, 200);
  assert.equal(c.moveTo, null);
  const oldPost = { ...c.holdAt };
  assert.ok(oldPost && d(oldPost, c) < 1);
  // 手当ての命令
  assert.ok(applyCommand(s, { type: 'treat', targetId: patient.id, actorId: c.id }));
  assert.ok(runUntilIdle(s, c), '手当てが終わる');
  const at = { x: c.x, z: c.z };
  assert.ok(d(at, oldPost) > 3, '手当ての場所は前の着地点から離れている');
  // 待ち時間の間はその場にいる（前の着地点へ歩き出さない）
  run(s, AUTO_RESUME_TICKS - 40);
  assert.ok(d(c, at) < 0.6, `前の着地点へ歩き出さない（${d(c, at).toFixed(2)}m 動いた）`);
  assert.equal(c.holdAt ?? null, null, '前の命令の待ち場所は捨てる');
  // 待ち時間のあとは、いつもどおり操作キャラへ付いて戻る（あさると同じ）
  run(s, 1200);
  assert.ok(d(c, p) < 6, `付いて戻る（操作キャラまで ${d(c, p).toFixed(1)}m）`);
});

test('命令でない自動の手当ては今までどおり、持ち場へ戻る', () => {
  const { s, c, patient } = setup();
  assert.ok(applyCommand(s, { type: 'move', x: c.x + 4, z: c.z, actorId: c.id }));
  run(s, 200);
  const post = { ...c.holdAt };
  assert.ok(post);
  assert.ok(startTask(s, c, 'treat', patient), '自動の手当てを始める');
  assert.equal(c.task.ordered, undefined);
  assert.ok(runUntilIdle(s, c), '手当てが終わる');
  assert.deepEqual(c.holdAt, post, '持ち場はそのまま');
  run(s, 1200);
  assert.ok(d(c, post) < 1.5, `持ち場へ戻る（${d(c, post).toFixed(2)}m）`);
});

test('倒れている者を担ぐ命令（pickup）は今までどおり', () => {
  const { s, c, patient } = setup();
  assert.ok(applyCommand(s, { type: 'pickup', targetId: patient.id, actorId: c.id }));
  run(s, 400);
  assert.equal(c.carryingId, patient.id);
});
