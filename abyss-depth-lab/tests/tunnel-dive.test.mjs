import test from 'node:test';
import assert from 'node:assert/strict';

import { createTunnelDive, TUNNEL_THEMES } from '../js/tunnel-rules.js';

test('背後視点・連続3Dパイプ: パイプ中心に沿って操縦すれば壁擦りゼロ＆加速リングでブーストする', () => {
  const dive = createTunnelDive({ theme: 'corridor_down', exitX: 5000, exitY: 8710 });
  assert.equal(dive.isActive(), true);
  assert.equal(dive.isDone(), false);

  // 右＋上へ入力すると機体が右へ移動し正のロール角がつく
  for (let i = 0; i < 10; i++) dive.step(0.03, 1, -0.5, false);
  const st1 = dive.state();
  assert.ok(st1.roll > 0.12, 'roll should bank right');

  let gotBoost = false;
  let completed = false;
  for (let i = 0; i < 800 && !completed; i++) {
    const s = dive.state();
    // 次の加速リングがあればそこへ、無ければ現在パイプ中心へステアリング
    const nextRing = s.course.find(c => c.kind === 'ring' && !c.resolved);
    const pipe = dive.pipeAt(s.progress);
    const tx = (nextRing && nextRing.at - s.progress < 0.08) ? nextRing.x : pipe.cx;
    const ty = (nextRing && nextRing.at - s.progress < 0.08) ? nextRing.y : pipe.cy;
    const ix = Math.max(-1, Math.min(1, (tx - s.px) * 5));
    const iy = Math.max(-1, Math.min(1, (ty - s.py) * 5));
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

test('背後視点・連続3Dパイプ: 壁へ押し当てても内側へ押し戻されて詰まずに出口へ到達し、バリア時はガード扱いになる', () => {
  const dive = createTunnelDive({ theme: 'corridor_up', exitX: 6000, exitY: 6690 });
  let hits = 0;
  let guards = 0;
  let done = false;
  for (let i = 0; i < 600 && !done; i++) {
    const shieldOn = i > 180;
    const res = dive.step(0.03, 1, 1, shieldOn);
    for (const ev of res.events) {
      if (ev.type === 'gate_hit') hits++;
      if (ev.type === 'gate_guard') guards++;
      if (ev.type === 'complete') done = true;
    }
  }
  assert.equal(done, true, 'must always finish even if player scrapes walls');
  assert.ok(hits > 0 && guards > 0, 'should record wall hits and shield guards');
  assert.ok(TUNNEL_THEMES.blackhole && TUNNEL_THEMES.blackhole.id === 'blackhole');

  const bh = createTunnelDive({ theme: 'blackhole' });
  bh.setProgress(0.5);
  assert.equal(bh.state().progress, 0.5);
  assert.equal(bh.isActive(), true);
  assert.ok(bh.state().course.some(c => !c.resolved));
});
