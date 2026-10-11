import test from 'node:test';
import assert from 'node:assert/strict';
import { DIFFICULTIES, STAGES, TUNE, rampMul, enemyDmgMul, spawnPlan, xpToNext, SQUAD, WEAPONS } from '../js/rules.js';

test('difficulty order: easy < normal < hard on hp, damage and spawn', () => {
  const { easy, normal, hard } = DIFFICULTIES;
  for (const k of ['enemyHp', 'enemyDmg', 'spawn']) assert.ok(easy[k] < normal[k] && normal[k] < hard[k], k);
  assert.ok(normal.enemyHp > 1 && normal.enemyDmg > 1, 'ふつうも すこし つよく');
});

test('harder multipliers ramp in over time (no instant deaths at the start)', () => {
  assert.equal(rampMul(0.6, 0), 0.6);
  assert.ok(rampMul(2, 0) < 1.5 && rampMul(2, 0) > 1);
  assert.equal(rampMul(2, TUNE.rampTime), 2);
  const st = STAGES[0], hard = DIFFICULTIES.hard;
  assert.ok(enemyDmgMul(0, hard, st) < enemyDmgMul(200, hard, st));
  assert.equal(enemyDmgMul(999, hard, st), hard.enemyDmg * st.dmgMul);
  assert.ok(spawnPlan(0, hard, st).interval > spawnPlan(0, hard, st).interval / hard.spawn);
  assert.ok(spawnPlan(300, hard, st).hpScale > spawnPlan(300, DIFFICULTIES.normal, st).hpScale);
});

test('xp needs are whole numbers and grow', () => {
  for (let lv = 1; lv < 60; lv++) { assert.ok(Number.isInteger(xpToNext(lv))); assert.ok(xpToNext(lv + 1) >= xpToNext(lv)); }
});

test('toned helpers: medic 30% / 35s, missile and laser below old values', () => {
  assert.equal(SQUAD.healPct, 0.3); assert.equal(SQUAD.whistleCd, 35);
  assert.ok(WEAPONS.supermissile.damage[0] < 380);
  assert.ok(WEAPONS.laserMg.damage[0] < 17 && WEAPONS.laserBeam.damage[0] < 78 && WEAPONS.laserRk.damage[0] < 165);
});
