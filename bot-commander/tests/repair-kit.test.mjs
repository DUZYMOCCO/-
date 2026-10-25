// v0.4.2: リペアキット（開始時に持つ・勝手に使う・拾う時の決まり・使い切りの知らせ）と、兵種リペアラー（repairer）の能力
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, stepSim, runSim, autoRepair, capsOf, maxKits, KINDS, TICK, UNIT_CLASS_CAPS,
  START_REPAIR_KITS, AUTO_REPAIR_HP_FRAC, REPAIR_KIT_HEAL_FRAC, MAX_CARRIED_KITS,
  REPAIRER_MAX_KITS, REPAIRER_KIT_HEAL_FRAC, REPAIRER_HEAL_RANGE, REPAIRER_KIT_BUILD_SEC, REPAIRER_KIT_COST } from '../js/sim/sim.js?v=23';
import { MISSION_1 } from '../js/sim/mission.js?v=10';
import { ITEMS } from '../js/sim/cover.js?v=6';

// ミッションの機体の兵種（v0.4.4）とシールドは外して、キットだけを見る（兵種はテストの中で付ける）
const mission = () => { const sim = createSim({ seed: 2, mission: MISSION_1 }); for (const u of sim.units) { u.cls = null; u.shieldHp = 0; } return sim; };
const robots = sim => sim.units.filter(u => u.side === 'ally' && !u.human);
const kitFx = (sim, type) => sim.fx.filter(f => f.type === type);
// 敵を遠くへ（撃ち合いを起こさない）
const calm = sim => { for (const u of sim.units) if (u.side === 'enemy') { u.x = 5; u.y = 5; u.hp = 1e9; u.atk = 0; } };

test('リペアキット: 開始時、味方ロボットは START_REPAIR_KITS 個・人間と敵は0。回復量は落とし物のキットと同じ', () => {
  const sim = mission();
  assert.equal(START_REPAIR_KITS, 1); assert.equal(MAX_CARRIED_KITS, 2); assert.equal(AUTO_REPAIR_HP_FRAC, 0.4);
  assert.equal(REPAIR_KIT_HEAL_FRAC, ITEMS.repair.heal);
  const kinds = new Set();
  for (const u of sim.units) {
    if (u.side === 'ally' && !u.human) { assert.equal(u.kits, START_REPAIR_KITS, u.kind); kinds.add(u.kind); }
    else assert.equal(u.kits, 0, u.kind);
  }
  assert.ok(kinds.has('ponco') && kinds.has('scav'));
  assert.ok(Object.values(KINDS).every(k => k.cls == null), '兵種は体の種類ではなく機体ごと（MISSION_1.ally の cls）');
});

test('リペアキット: HP が閾値を切ると勝手に1つ使う・閾値ちょうどでは使わない', () => {
  const sim = mission(); calm(sim);
  const u = robots(sim).find(v => v.kind === 'ponco');
  u.hp = u.maxHp * AUTO_REPAIR_HP_FRAC;
  assert.equal(autoRepair(sim, u), false, 'ちょうどは使わない');
  u.hp = u.maxHp * AUTO_REPAIR_HP_FRAC - 1;
  const hp0 = u.hp;
  assert.equal(autoRepair(sim, u), true);
  assert.equal(u.kits, 0); assert.ok(Math.abs(u.hp - (hp0 + u.maxHp * REPAIR_KIT_HEAL_FRAC)) < 1e-9);
  const use = kitFx(sim, 'kitUse'); assert.equal(use.length, 1); assert.equal(use[0].unit, u.id);
  u.hp = 10;
  assert.equal(autoRepair(sim, u), false, 'キットがなければ使わない');
});

test('リペアキット: 撃たれて閾値を切ると、その場で使う（撃ち合いの中で）', () => {
  const sim = mission();
  const u = robots(sim).find(v => v.kind === 'ponco');
  const e = sim.units.find(v => v.side === 'enemy');
  e.x = u.x + 30; e.y = u.y; e.atk = 1; u.hp = u.maxHp * AUTO_REPAIR_HP_FRAC + 0.5; u.atk = 0;
  for (let i = 0; i < 30 * 5 && u.kits > 0; i++) stepSim(sim);
  assert.equal(u.kits, 0); assert.ok(u.hp > u.maxHp * 0.8, `${u.hp}`);
});

test('落とし物のキット: HP が減っていればその場で使う・満タンなら持ち物に足す（2つまで）・上限なら拾わない', () => {
  const sim = mission(); calm(sim);
  const u = robots(sim).find(v => v.kind === 'ponco');
  for (const v of robots(sim)) if (v !== u) { v.x = 40; v.y = 40; }
  const drop = id => sim.items.push({ id, type: 'repair', x: u.x, y: u.y, t: sim.time });
  u.hp = u.maxHp - 10; drop(1); stepSim(sim);
  assert.equal(u.hp, u.maxHp, '減っていれば使う'); assert.equal(u.kits, 1, '持ち物は増えない');
  drop(2); stepSim(sim);
  assert.equal(u.kits, 2, '満タンなら持ち物へ');
  const p = sim.fx.find(f => f.type === 'pickup' && f.stored); assert.ok(p && p.kits === 2);
  drop(3); stepSim(sim);
  assert.equal(u.kits, 2); assert.ok(sim.items.some(i => i.id === 3), '上限なら地面に残る');
  u.hp -= 1; stepSim(sim);
  assert.ok(!sim.items.some(i => i.id === 3), '減ったら拾って使う'); assert.equal(u.kits, 2);
});

test('使い切りの知らせ: 最後の1つを使った時に kitEmpty が1回だけ', () => {
  const sim = mission(); calm(sim);
  const u = robots(sim).find(v => v.kind === 'ponco'); u.kits = 2;
  u.hp = 1; autoRepair(sim, u);
  assert.equal(kitFx(sim, 'kitEmpty').length, 0, 'まだ1つある');
  u.hp = 1; autoRepair(sim, u);
  u.hp = 1; autoRepair(sim, u);
  const em = kitFx(sim, 'kitEmpty'); assert.equal(em.length, 1); assert.equal(em[0].unit, u.id); assert.equal(em[0].label, u.label || KINDS[u.kind].name);
});

// ---- リペアラー（テスト用に PONCO を repairer にする。ゲームのデータは変えない） ----
const asRepairer = u => { u.cls = 'repairer'; return u; };

test('リペアラー: 能力はデータ（UNIT_CLASS_CAPS.repairer）。持てる数は REPAIRER_MAX_KITS', () => {
  assert.deepEqual({ ...UNIT_CLASS_CAPS.repairer }, { repairOthers: true, kitCraft: true, maxKits: REPAIRER_MAX_KITS, shieldRepair: true });
  const sim = mission(); const [a, b] = robots(sim).filter(v => v.kind === 'ponco');
  asRepairer(a);
  assert.equal(maxKits(a), REPAIRER_MAX_KITS); assert.equal(maxKits(b), MAX_CARRIED_KITS); assert.deepEqual(capsOf(b), {});
});

test('リペアラー: 近くの、閾値を切ってキットのない味方に使う（回復が多い）。遠い味方には使わない・歩いて行かない', () => {
  const sim = mission(); calm(sim); sim.mission.delivered = 0;
  const [r, near, far] = robots(sim).filter(v => v.kind === 'ponco');
  asRepairer(r);
  near.x = r.x + REPAIRER_HEAL_RANGE - 5; near.y = r.y; near.kits = 0; near.hp = 10;
  far.x = r.x; far.y = r.y + REPAIRER_HEAL_RANGE + 20; far.kits = 0; far.hp = 10;
  const rx = r.x, ry = r.y;
  stepSim(sim);
  assert.equal(r.kits, 0); assert.ok(Math.abs(near.hp - (10 + near.maxHp * REPAIRER_KIT_HEAL_FRAC)) < 1e-9);
  assert.equal(far.hp, 10);
  const use = kitFx(sim, 'kitUse')[0]; assert.equal(use.by, r.id); assert.equal(use.unit, near.id);
  assert.equal(kitFx(sim, 'kitEmpty').length, 1, 'リペアラーが使い切った');
  runSim(sim, 30); assert.ok(Math.hypot(r.x - rx, r.y - ry) < 1, '歩いて行かない');
});

test('リペアラー: 届けた資材からキットを作る（REPAIRER_KIT_BUILD_SEC 秒・REPAIRER_KIT_COST）。上限まで・資材が足りなければ作らない', () => {
  const sim = mission(); calm(sim);
  const r = asRepairer(robots(sim).find(v => v.kind === 'ponco')); r.kits = 1;
  sim.mission.delivered = REPAIRER_KIT_COST * 2 + 1;
  stepSim(sim);
  assert.equal(r.kitBuild != null, true); assert.ok(Math.abs(sim.mission.delivered - (REPAIRER_KIT_COST + 1)) < 1e-9, '作り始めに払う');
  runSim(sim, Math.ceil(REPAIRER_KIT_BUILD_SEC / TICK) - 3); assert.equal(r.kits, 1, 'まだできない');
  runSim(sim, 3); assert.equal(r.kits, 2, `${REPAIRER_KIT_BUILD_SEC}秒でできる`);
  runSim(sim, Math.ceil(REPAIRER_KIT_BUILD_SEC / TICK) + 2); assert.equal(r.kits, 3);
  assert.ok(sim.mission.delivered < REPAIRER_KIT_COST && r.kitBuild == null, '上限で止まる');
  r.kits = 0; runSim(sim, 10); assert.equal(r.kitBuild ?? null, null, '資材が足りなければ作らない');
  const other = robots(sim).find(v => v.kind === 'ponco' && v !== r); sim.mission.delivered = 50; other.kits = 0; runSim(sim, 5);
  assert.equal(other.kitBuild ?? null, null, 'リペアラー以外は作らない');
});
