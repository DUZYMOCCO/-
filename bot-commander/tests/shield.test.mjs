// v0.4.4: シールド（受ける確率・耐久・壊れた知らせ・撤退中の守り・ガンナーの得意・サポーターが作る・リペアラーが直す）
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, stepSim, runSim, issueRetreat, applyCommandsNow, isDefensive, shieldStats, TICK, UNIT_CLASS_CAPS, DEFENSIVE_ORDERS,
  SHIELD_HP_FRAC, SHIELD_BLOCK_CHANCE, DEFENSIVE_BLOCK_CHANCE, GUNNER_SHIELD_BLOCK_CHANCE, GUNNER_SHIELD_WEAR_MULT,
  SUPPORTER_SHIELD_BUILD_SEC, SUPPORTER_SHIELD_COST, SUPPORTER_GIVE_RANGE, REPAIRER_SHIELD_RANGE, REPAIRER_SHIELD_REPAIR_FRAC, CRAFT_SPEND_CAP } from '../js/sim/sim.js?v=30';
import { MISSION_1 } from '../js/sim/mission.js?v=10';
import { SHIELD_TABLE } from '../js/sim/shield-table.js?v=2';

/** 本物の撤退命令（order.mode 'retreat'） */
const retreat = (sim, u) => { issueRetreat(sim, [u.id]); applyCommandsNow(sim); };
const robots = sim => sim.units.filter(u => u.side === 'ally' && !u.human);
const FAR = { x: 1250, y: 1900 };
const fxOf = (sim, type) => sim.fx.filter(f => f.type === type);
/** 兵種なしの場（兵種はテストで付ける）。敵は遠くで動かない */
function field(seed = 3) {
  const sim = createSim({ seed, mission: MISSION_1 });
  for (const u of sim.units) { u.cls = null; if (u.side === 'enemy') { u.x = FAR.x; u.y = FAR.y; u.atk = 0; u.speed = 0; u.hp = 1e9; } }
  sim.units.filter(u => u.side === 'ally').forEach((u, i) => { u.x = 60 + (i % 4) * 300; u.y = 200 + (i / 4 | 0) * 400; }); // 互いに離す（射程より遠く）
  return sim;
}
/** 敵1体に u を撃たせ続ける（動かない・ずっと撃つ）。n 発ぶん回して、盾に当たった数と体に当たった数を返す */
function shootAt(sim, u, shots, atk = 3) {
  const e = sim.units.find(v => v.side === 'enemy');
  e.atk = atk; e.cd = 0; e.speed = 0; u.atk = 0;
  let blocked = 0, body = 0;
  for (let i = 0; i < shots * 60 && blocked + body < shots; i++) {
    e.x = u.x + 40; e.y = u.y; const n0 = sim.fx.length; stepSim(sim);
    for (const f of sim.fx.slice(n0)) if (f.type === 'shot' && f.to === u.id) f.shield ? blocked++ : body++;
    if (u.shieldHp <= 0 && u.shieldMax > 0) u.shieldHp = 1e6; // 確率を測る間は壊さない
  }
  e.atk = 0; e.x = FAR.x; e.y = FAR.y;
  return { blocked, body };
}

test('シールド: 味方ロボットは開始時に1枚（耐久＝最大HP×機体の表の割合。表にない機体は 0.4）。人間・敵は持たない', () => {
  const sim = createSim({ seed: 1, mission: MISSION_1 });
  assert.equal(SHIELD_HP_FRAC, 0.4); assert.equal(SHIELD_BLOCK_CHANCE, 0.35);
  for (const u of sim.units) {
    if (u.side === 'ally' && !u.human) { assert.equal(u.shieldMax, Math.round(u.maxHp * (SHIELD_TABLE[u.kind]?.shieldFrac ?? 0.4))); assert.equal(u.shieldHp, u.shieldMax); }
    else assert.equal(u.shieldMax, 0);
  }
});

test('シールド: 受ける確率はおよそ 35%（決まった乱数・同じ seed なら同じ結果）。受けた一撃は体が無傷でよろけない', () => {
  const run = () => { const sim = field(5); const u = robots(sim).find(v => v.kind === 'ponco'); u.maxHp = u.hp = 1e7; const r = shootAt(sim, u, 400); return { ...r, hp: u.hp, stun: u._hr?.stunCount }; };
  const a = run(), b = run();
  assert.deepEqual(a, b, '決まった乱数');
  const p = a.blocked / (a.blocked + a.body);
  assert.ok(p > 0.28 && p < 0.42, `${p}`);
});

test('シールド: 耐久ぶん受けたら壊れる。あまりは捨てる（体には通らない）。壊れた知らせ shieldBreak は1回だけ', () => {
  const sim = field(); const u = robots(sim).find(v => v.kind === 'ponco');
  retreat(sim, u); // 撤退中＝盾があれば全部受ける
  const hp0 = u.hp, e = sim.units.find(v => v.side === 'enemy');
  e.atk = 7; e.cd = 0;
  let hits = 0; const breaks = [];
  const step = () => { e.x = u.x + 40; e.y = u.y; const n0 = sim.fx.length; stepSim(sim); const nw = sim.fx.slice(n0); hits += nw.filter(f => f.type === 'shot' && f.to === u.id).length; breaks.push(...nw.filter(f => f.type === 'shieldBreak')); };
  for (let i = 0; i < 30 * 60 && u.shieldHp > 0; i++) { step(); assert.ok(isDefensive(u)); }
  assert.equal(u.shieldHp, 0); assert.equal(u.hp, hp0, '壊れる一撃のあまりは体に通らない');
  for (let i = 0; i < 30 * 4; i++) step();
  assert.ok(u.hp < hp0, '壊れた後は体に当たる'); assert.equal(breaks.length, 1, '壊れた知らせは1回'); assert.equal(breaks[0].unit, u.id);
  assert.ok(hits > 3);
});

test('撤退（DEFENSIVE_ORDERS）: 撃たずに盾で守る。盾があれば全部受ける', () => {
  assert.deepEqual([...DEFENSIVE_ORDERS], ['retreat']); assert.equal(DEFENSIVE_BLOCK_CHANCE, 1);
  const sim = field(); const u = robots(sim).find(v => v.kind === 'ponco');
  const e = sim.units.find(v => v.side === 'enemy'); e.x = u.x + 40; e.y = u.y; e.atk = 2; e.cd = 0; e.hp = 1e9;
  issueRetreat(sim, [u.id]); applyCommandsNow(sim);
  assert.equal(isDefensive(u), true); assert.equal(shieldStats(u).blockChance, 1);
  const hp0 = u.hp, ehp = e.hp; let shots = 0;
  for (let i = 0; i < 30 * 4; i++) { e.x = u.x + 40; e.y = u.y; const n0 = sim.fx.length; stepSim(sim); for (const f of sim.fx.slice(n0)) if (f.type === 'shot') { if (f.from === u.id) shots++; if (f.to === u.id) assert.equal(f.shield, true); } }
  assert.equal(shots, 0, '撃たない'); assert.equal(u.hp, hp0); assert.equal(e.hp, ehp); assert.ok(u.shieldHp < u.shieldMax);
});

test('ガンナー: 盾が得意（受ける確率 0.5・すり減り 0.7 倍）。撤退中は全員 100%、すり減り 0.7 倍はそのまま', () => {
  assert.deepEqual({ ...UNIT_CLASS_CAPS.gunner.shield }, { blockChance: GUNNER_SHIELD_BLOCK_CHANCE, wearMult: GUNNER_SHIELD_WEAR_MULT });
  assert.equal(GUNNER_SHIELD_BLOCK_CHANCE, 0.5); assert.equal(GUNNER_SHIELD_WEAR_MULT, 0.7);
  const sim = field(7); const [g, n] = robots(sim).filter(v => v.kind === 'ponco'); g.cls = 'gunner';
  assert.deepEqual(shieldStats(g), { blockChance: 0.5, wearMult: 0.7 }); assert.deepEqual(shieldStats(n), { blockChance: 0.35, wearMult: 1 });
  g.maxHp = g.hp = 1e7; const r = shootAt(sim, g, 400); const p = r.blocked / (r.blocked + r.body);
  assert.ok(p > 0.43 && p < 0.57, `${p}`);
  // すり減り: 同じ一撃を撤退中に受ける
  const s2 = field(8); const [g2, n2] = robots(s2).filter(v => v.kind === 'ponco'); g2.cls = 'gunner';
  for (const u of [g2, n2]) {
    retreat(s2, u); assert.equal(shieldStats(u).blockChance, 1);
    const e = s2.units.find(v => v.side === 'enemy'); e.atk = 5; e.cd = 0;
    const before = u.shieldHp, n0 = s2.fx.length; let dmg = 0;
    for (let i = 0; i < 30 * 3 && dmg === 0; i++) { e.x = u.x + 40; e.y = u.y; stepSim(s2); dmg = s2.fx.slice(n0).filter(f => f.type === 'shot' && f.to === u.id).reduce((a, f) => a + f.dmg, 0); }
    e.atk = 0; e.x = FAR.x; e.y = FAR.y;
    const wear = (before - u.shieldHp) / dmg;
    assert.ok(Math.abs(wear - (u === g2 ? 0.7 : 1)) < 1e-9, `${u.cls} ${wear}`);
  }
});

test('サポーター: 資材から盾を作り（15秒・8資材）、近くの盾が壊れた機体に渡す。遠い機体には渡さない・歩かない', () => {
  assert.equal(SUPPORTER_SHIELD_BUILD_SEC, 15); assert.equal(SUPPORTER_SHIELD_COST, 8);
  const sim = field(); const [s, near, far] = robots(sim).filter(v => v.kind === 'ponco');
  s.cls = 'supporter'; sim.mission.delivered = 20;
  near.x = s.x + SUPPORTER_GIVE_RANGE - 5; near.y = s.y; near.shieldHp = 0;
  far.x = s.x; far.y = s.y + SUPPORTER_GIVE_RANGE + 30; far.shieldHp = 0;
  const sx = s.x, sy = s.y;
  stepSim(sim);
  assert.equal(sim.mission.delivered, 12, '作り始めに払う'); assert.ok(s.shieldBuild != null);
  runSim(sim, Math.ceil(SUPPORTER_SHIELD_BUILD_SEC / TICK) - 3); assert.equal(near.shieldHp, 0, 'まだできない');
  runSim(sim, 3);
  assert.equal(near.shieldHp, near.shieldMax, 'できたらすぐ渡す'); assert.equal(far.shieldHp, 0);
  const give = fxOf(sim, 'shieldGive'); assert.equal(give.length, 1); assert.equal(give[0].by, s.id);
  assert.ok(Math.hypot(s.x - sx, s.y - sy) < 1, '歩かない');
  // 次の予備（1枚まで）。資材が 8 未満になったら作らない
  runSim(sim, Math.ceil(SUPPORTER_SHIELD_BUILD_SEC / TICK) + 2);
  assert.equal(s.spareShields, 1); assert.equal(sim.mission.delivered, 4); assert.equal(s.shieldBuild ?? null, null);
  // 渡す相手が来たら渡す
  far.x = s.x + 30; far.y = s.y; runSim(sim, 1); assert.equal(far.shieldHp, far.shieldMax); assert.equal(s.spareShields, 0);
  runSim(sim, 10); assert.equal(s.shieldBuild ?? null, null, '資材が足りない');
});

test('作る物の資材は出撃ごとに CRAFT_SPEND_CAP まで（キットと盾の合計）', () => {
  const sim = field(); const [s, r] = robots(sim).filter(v => v.kind === 'ponco');
  s.cls = 'supporter'; r.cls = 'repairer'; r.kits = 0;
  // 資材はいつも 60 ある（勝ちにならないよう目標の手前）。作った物はすぐ消して、作り続けさせる
  for (let i = 0; i < 30 * 400; i++) { sim.mission.delivered = 60; stepSim(sim); s.spareShields = 0; r.kits = 0; }
  assert.equal(sim.result, null);
  const spent = sim.mission.spentOnCraft;
  assert.ok(spent <= CRAFT_SPEND_CAP && spent > CRAFT_SPEND_CAP - SUPPORTER_SHIELD_COST, `${spent}`);
  sim.mission.delivered = 60; runSim(sim, 30 * 30); assert.equal(sim.mission.delivered, 60, '上限のあとは払わない');
});

test('リペアラー: 近くの傷んだ盾（壊れた盾も）を資材なしで少しずつ直す。遠い盾は直さない', () => {
  const sim = field(); const [r, a, far] = robots(sim).filter(v => v.kind === 'ponco');
  r.cls = 'repairer'; sim.mission.delivered = 0; r.kits = 3;
  a.x = r.x + REPAIRER_SHIELD_RANGE - 5; a.y = r.y; a.shieldHp = 0;
  far.x = r.x; far.y = r.y + REPAIRER_SHIELD_RANGE + 30; far.shieldHp = 0;
  const n0 = sim.fx.length; runSim(sim, 30); // 1秒
  assert.equal(sim.fx.slice(n0).filter(f => f.type === 'shieldRestored').length, 1, '壊れた盾が戻った知らせ');
  assert.ok(Math.abs(a.shieldHp - a.shieldMax * REPAIRER_SHIELD_REPAIR_FRAC) < 0.5, `${a.shieldHp}`);
  assert.equal(far.shieldHp, 0); assert.equal(r.shieldFix, a.id);
  runSim(sim, Math.ceil(30 / REPAIRER_SHIELD_REPAIR_FRAC));
  assert.equal(a.shieldHp, a.shieldMax); assert.equal(sim.mission.delivered, 0, '資材を使わない');
});
