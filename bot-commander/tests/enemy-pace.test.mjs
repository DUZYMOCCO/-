// v0.4.1: 敵の攻撃ペース・よろけは強い一撃だけ。（ENEMY_ATTACK_INTERVAL_MULT）。敵だけ攻撃の間隔が長く、味方と移動は変わらない
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, stepSim, groupUnits, ENEMY_ATTACK_INTERVAL_MULT, KINDS, isStunned, isStrongHit, weaponInfo, STUN_MIN_HP_FRAC, STUN_IMMUNE_SEC, STUN_HEAVY_KINDS } from '../js/sim/sim.js?v=28';
import { MISSION_1 } from '../js/sim/mission.js?v=10';

test('敵の攻撃ペース: 倍率は 1〜2・敵は cooldown×倍率、味方は cooldown のまま・移動の速さは同じ', () => {
  assert.ok(ENEMY_ATTACK_INTERVAL_MULT >= 1 && ENEMY_ATTACK_INTERVAL_MULT <= 2, `${ENEMY_ATTACK_INTERVAL_MULT}`);
  const sim = createSim({ seed: 3, mission: MISSION_1 });
  const pon = sim.units.filter(u => u.side === 'ally' && u.kind === 'ponco').slice(0, 4);
  const cx = pon.reduce((a, u) => a + u.x, 0) / 4, cy = pon.reduce((a, u) => a + u.y, 0) / 4;
  const g = sim.groups[1];
  groupUnits(sim, g).forEach((e, i) => { e.x = cx + (i - 1) * 28; e.y = cy - 40; }); // 目の前に置いて撃ち合わせる
  for (const u of sim.units) assert.equal(u.speed, KINDS[u.kind].speed, `移動 ${u.kind}`);
  const prev = new Map(sim.units.map(u => [u.id, u.cd]));
  const resets = { enemy: [], ally: [] };
  for (let i = 0; i < 30 * 20; i++) {
    stepSim(sim);
    for (const u of sim.units) {
      if (u.cd > (prev.get(u.id) ?? 0) + 1e-9) resets[u.side].push(u.cd / u.cooldown);
      prev.set(u.id, u.cd);
    }
  }
  assert.ok(resets.enemy.length >= 3 && resets.ally.length >= 3, `敵 ${resets.enemy.length} 回・味方 ${resets.ally.length} 回 撃った`);
  for (const r of resets.enemy) assert.ok(Math.abs(r - ENEMY_ATTACK_INTERVAL_MULT) < 1e-9, `敵の間隔 ×${r}`);
  for (const r of resets.ally) assert.ok(Math.abs(r - 1) < 1e-9, `味方の間隔 ×${r}`);
});

const ambush = seed => {
  const sim = createSim({ seed, mission: MISSION_1 });
  const pon = sim.units.filter(u => u.side === 'ally' && u.kind === 'ponco').slice(0, 4);
  const cx = pon.reduce((a, u) => a + u.x, 0) / 4, cy = pon.reduce((a, u) => a + u.y, 0) / 4;
  groupUnits(sim, sim.groups[1]).forEach((e, i) => { e.x = cx + (i - 1) * 28; e.y = cy - 40; });
  return { sim, pon };
};

test('よろけ: 異星生物のふつうの一撃（PONCO の最大HPの25%未満）ではよろけない・撃ち続ける', () => {
  const w = weaponInfo('alien');
  assert.ok(!STUN_HEAVY_KINDS.includes(w.kind), `異星の武器 ${w.row.id} ${w.kind}`);
  assert.ok(KINDS.alien.atk * 1.15 < STUN_MIN_HP_FRAC * KINDS.ponco.hp, '最大ダメージでも閾値未満');
  const { sim, pon } = ambush(5);
  let hits = 0, stunned = 0, shots = 0;
  for (let i = 0; i < 30 * 15; i++) {
    const seen = new Set(sim.fx); stepSim(sim);
    for (const f of sim.fx) if (!seen.has(f) && f.type === 'shot') { if (f.side === 'enemy' && pon.some(u => u.id === f.to)) hits++; if (f.side === 'ally') shots++; }
    for (const u of pon) if (u.hp > 0 && isStunned(u)) stunned++;
  }
  assert.ok(hits >= 3, `当たった ${hits}`);
  assert.equal(stunned, 0, 'PONCO はよろけない');
  assert.ok(shots >= 3, `PONCO は撃ち返す ${shots}`);
});

test('よろけ: 最大HPの25%以上・重い/爆発はよろける。よろけの後 STUN_IMMUNE_SEC 秒はよろけない', () => {
  const t = { maxHp: 120 }, sim = { time: 10 };
  const blunt = { kind: 'blunt' }, boom = { kind: 'explosion' };
  assert.equal(isStrongHit(sim, t, blunt, 29), false);
  assert.equal(isStrongHit(sim, t, blunt, 30), true, '25% ちょうど');
  assert.equal(isStrongHit(sim, t, boom, 1), true, '爆発は小さくてもよろける');
  t.stunImmuneUntil = 10 + STUN_IMMUNE_SEC;
  assert.equal(isStrongHit(sim, t, boom, 999), false, 'よろけの後は効かない');
  sim.time = 10 + STUN_IMMUNE_SEC + 0.01;
  assert.equal(isStrongHit(sim, t, boom, 999), true, '時間が過ぎれば戻る');
});
