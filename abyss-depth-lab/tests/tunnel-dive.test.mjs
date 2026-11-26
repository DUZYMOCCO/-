import test from 'node:test';
import assert from 'node:assert/strict';

import { createTunnelDive, TUNNEL_THEMES } from '../js/tunnel-rules.js';

test('背後視点コースター: 左右上下の操縦で機体がバンクし、隙間抜け＆加速リングでブーストする', () => {
  const dive = createTunnelDive({ theme: 'corridor_down', exitX: 5000, exitY: 8710 });
  assert.equal(dive.isActive(), true);
  assert.equal(dive.isDone(), false);

  // 右＋上へ入力すると機体が右へ移動し正のロール角がつく
  for (let i = 0; i < 12; i++) dive.step(0.03, 1, -0.5, false);
  const st1 = dive.state();
  assert.ok(st1.px > 0.15, 'px should move right');
  assert.ok(st1.roll > 0.15, 'roll should bank right');

  // 最初の加速リングを狙って通過させる
  const firstRing = st1.course.find(c => c.kind === 'ring');
  assert.ok(firstRing);
  let gotBoost = false;
  let completed = false;
  for (let i = 0; i < 600 && !completed; i++) {
    const s = dive.state();
    // 次に迫るアイテムの中心へステアリングを合わせる
    const next = s.course.find(c => !c.resolved);
    const tx = next ? (next.kind === 'ring' ? next.x : next.gapX) : 0;
    const ty = next ? (next.kind === 'ring' ? next.y : next.gapY) : 0;
    const ix = Math.max(-1, Math.min(1, (tx - s.px) * 4));
    const iy = Math.max(-1, Math.min(1, (ty - s.py) * 4));
    const res = dive.step(0.03, ix, iy, false);
    for (const ev of res.events) {
      if (ev.type === 'ring_boost') gotBoost = true;
      if (ev.type === 'complete') {
        completed = true;
        assert.equal(ev.exitX, 5000);
        assert.equal(ev.exitY, 8710);
      }
    }
  }
  assert.equal(gotBoost, true, 'should trigger ring_boost');
  assert.equal(completed, true, 'should complete and return exit coordinates');
  assert.equal(dive.isActive(), false);
  assert.ok(dive.state().bonusResource > 0);
  assert.ok(dive.state().gatesCleared > 0);
});

test('背後視点コースター: 障害物に当たっても詰まずに出口へ到達し、バリア時はガード扱いになる', () => {
  const dive = createTunnelDive({ theme: 'corridor_up', exitX: 6000, exitY: 6690 });
  let hits = 0;
  let guards = 0;
  let done = false;
  for (let i = 0; i < 500 && !done; i++) {
    // わざと端へ寄せ続けて障害物にぶつける（後半はバリアON）
    const shieldOn = i > 120;
    const res = dive.step(0.03, 1, 1, shieldOn);
    for (const ev of res.events) {
      if (ev.type === 'gate_hit') hits++;
      if (ev.type === 'gate_guard') guards++;
      if (ev.type === 'complete') done = true;
    }
  }
  assert.equal(done, true, 'must always finish even if player hits gates');
  assert.ok(hits > 0 || guards > 0);
  assert.ok(TUNNEL_THEMES.blackhole && TUNNEL_THEMES.blackhole.id === 'blackhole');
});
