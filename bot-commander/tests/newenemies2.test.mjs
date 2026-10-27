// 新しい敵の続き（?newenemies=1）: G12 の地中・範囲ダメージの輪・人間／ツギハギ号を優先して追う動き・強さの調整・資源集めだけでは勝てない。
import test from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../js/sim/sim.js?v=29';
import * as M from '../js/sim/mission.js?v=10';
import { NEW_ENEMY_KINDS } from '../js/sim/new-enemies.js?v=2';
import { ALT, BAND, unitBand, canHit } from '../js/sim/altitude.js?v=1';
import { reaches } from '../js/sim/targeting.js?v=2';

const mk = (seed = 1) => S.createSim({ seed, mission: M.MISSION_1, newEnemies: true });
const enemy = (sim, kind) => sim.units.find(u => u.side === 'enemy' && u.kind === kind);
const ally = (sim, kind) => sim.units.find(u => u.side === 'ally' && u.kind === kind);
function only(sim, ...kinds) {
  sim.units = sim.units.filter(u => u.side === 'ally' || kinds.includes(u.kind));
  sim.groups = sim.groups.filter(g => g.unitIds.some(id => sim.units.some(u => u.id === id)));
  for (const g of sim.groups) g.unitIds = g.unitIds.filter(id => sim.units.some(u => u.id === id));
  return sim;
}
const put = (u, x, y) => { u.x = x; u.y = y; u.order = null; return u; };
const run = (sim, sec) => { for (let i = 0; i < Math.round(sec * 30); i++) S.stepSim(sim); };
const w = u => S.unitWeaponInfo(u)?.row ?? null;
/** G12 だけを残し、巡回をやめて固定する。味方は遠くへ */
function g12Scene(seed = 1) {
  const sim = only(mk(seed), 'G12'); const g = enemy(sim, 'G12');
  for (const u of sim.units) if (u.side === 'ally') put(u, 40, 40);
  sim.groups = []; g.groupId = null; put(g, 600, 600); g.stance = 'hold';
  return { sim, g };
}

test('G12 地中: 地中の帯（水中の帯を借りる）から始まる。弾も近接も届かない・こちらも撃てない', () => {
  const { sim, g } = g12Scene();
  assert.equal(g.neBur, 'under'); assert.ok(g.z < 0); assert.equal(unitBand(g), BAND.UNDERWATER);
  const p = ally(sim, 'ponco'), scav = ally(sim, 'scav');
  assert.equal(canHit(p, g, w(p)), false, 'PONCO の射撃は届かない'); assert.equal(canHit(scav, g, w(scav)), false, '近接も届かない');
  assert.equal(canHit(g, p, w(g)), false, '地中からは撃てない');
  assert.equal(reaches(g, p, w), false);
  // 地中の間は撃たれない・撃たない（trigger の外に置く）
  put(p, 600, 600 + 112); p.stance = 'free'; p.anchor = { x: p.x, y: p.y };
  run(sim, 6);
  assert.equal(g.hp, g.maxHp); assert.equal(p.hp, p.maxHp); assert.equal(g.neBur, 'under', 'trigger の外では出てこない');
});

test('G12 地中: ロボが近づいたら飛び出して一撃（地上の帯に戻る）・人間では出てこない・しばらくするともぐる', () => {
  const B = NEW_ENEMY_KINDS.G12.ne.burrow;
  const { sim, g } = g12Scene();
  const boy = ally(sim, 'boy'); put(boy, 600 + 40, 600); boy.hp = boy.maxHp = 9999;
  run(sim, B.under + 2);
  assert.equal(g.neBur, 'under', '人間が近くにいても出てこない');
  const p = ally(sim, 'ponco'), q = ally(sim, 'scav');
  put(boy, 40, 40);
  put(p, 600 + B.ambush.r - 8, 600); put(q, 600 + B.ambush.r + 30, 600); p.atk = 0; p.stance = 'hold';
  const hp = p.hp, hq = q.hp;
  run(sim, 0.1); // under を過ぎていれば、すぐ出る
  assert.equal(g.neBur, 'up'); assert.equal(g.z, 0); assert.equal(unitBand(g), BAND.SURFACE);
  assert.equal(sim.ne.emerged, 1);
  assert.ok(p.hp <= hp - B.ambush.dmg, `出る時の一撃 ${hp}→${p.hp}`);
  assert.equal(q.hp, hq, '一撃の外は無傷（まだ撃ち始めていない）');
  assert.ok(sim.fx.some(f => f.type === 'neBlast' && f.kind === 'G12'));
  assert.equal(canHit(p, g, w(p)), true, '出てきたら撃てる');
  put(p, 40, 40); put(q, 40, 40);
  run(sim, B.up + 0.5);
  assert.equal(g.neBur, 'under', 'up 秒たつともぐる'); assert.ok(g.z < 0); assert.equal(sim.ne.burrowed, 1);
});

test('G12 地中: もぐっている間は PONCO が近くで構えていても HP は減らない。出てきたら撃たれる', () => {
  const { sim, g } = g12Scene();
  const pons = sim.units.filter(u => u.kind === 'ponco').slice(0, 8);
  pons.forEach((u, i) => { put(u, 600 + 90 + (i % 4) * 8, 600 - 30 + (i >> 2) * 20); u.stance = 'free'; u.anchor = { x: u.x, y: u.y }; });
  run(sim, 0.5);
  assert.equal(g.hp, g.maxHp, 'もぐっている間は当たらない');
  run(sim, 40);
  assert.ok(!sim.units.includes(g) || g.hp < g.maxHp, '出てきたら撃たれる');
});

test('G12 地中: 同じ seed なら同じ結果・フラグなしのハッシュは変わらない', () => {
  const a = mk(2), b = mk(2); S.runSim(a, 900); S.runSim(b, 900);
  assert.equal(S.hashSim(a), S.hashSim(b)); assert.equal(S.hashSimDeep(a), S.hashSimDeep(b));
  const HASH300 = { 1: '6cc93eb6', 2: '2a60b985', 3: '24994a28', 4: '5558d677', 5: '6e46d4aa' };
  for (const seed of [1, 2, 3, 4, 5]) { const s = S.createSim({ seed, mission: M.MISSION_1 }); S.runSim(s, 300); assert.equal(S.hashSim(s), HASH300[seed]); assert.equal(s.ne, undefined); }
});

test('範囲ダメージ（G04・G07・A01）: 当たった相手の近くの味方に半分前後。輪の出来事（neSplash）が出る。空の味方は地上の範囲を受けない', () => {
  const sim = only(mk(1), 'G04');
  const g4 = enemy(sim, 'G04'), [a, b, far, air] = sim.units.filter(u => u.kind === 'ponco');
  for (const u of sim.units) if (u.side === 'ally') put(u, 40, 40);
  put(a, 600, 600); put(b, 600 + 20, 600); put(far, 600 + 120, 600); put(air, 600 + 10, 600); air.z = ALT.demoAirZ; air.moves = Object.freeze(['air']);
  for (const u of [a, b, far, air]) { u.stance = 'hold'; u.atk = 0; }
  sim.groups = []; g4.groupId = null; put(g4, 600, 600 + 140); g4.cd = 0;
  run(sim, 6);
  assert.ok(sim.ne.splashed >= 1, '範囲ダメージが入った');
  assert.equal(far.hp, far.maxHp, '範囲の外は無傷'); assert.equal(air.hp, air.maxHp, '空は地上の範囲を受けない');
  assert.ok(a.hp < a.maxHp || b.hp < b.maxHp, '直撃と近くの味方');
  let ring = false; const s2 = only(mk(1), 'G04'); const e = enemy(s2, 'G04'); const t = ally(s2, 'ponco');
  for (const u of s2.units) if (u.side === 'ally') put(u, 40, 40);
  s2.groups = []; e.groupId = null; put(t, 600, 600); put(e, 600, 740); e.cd = 0; t.atk = 0;
  const other = s2.units.filter(u => u.kind === 'ponco')[1]; put(other, 620, 600); other.atk = 0;
  for (let i = 0; i < 30 * 5 && !ring; i++) { S.stepSim(s2); ring = s2.fx.some(f => f.type === 'neSplash' && f.r === NEW_ENEMY_KINDS.G04.ne.splash.r); }
  assert.ok(ring, '輪の出来事');
});

test('人間を優先して追う（G08）: 追っている間は速く、獲物の id が覚えられる。見失うとやめる。ロボより人間を先に追う', () => {
  const sim = only(mk(1), 'G08');
  const g8 = enemy(sim, 'G08'), boy = ally(sim, 'boy'), girl = ally(sim, 'girl'), p = ally(sim, 'ponco');
  for (const u of sim.units) if (u.side === 'ally') put(u, 40, 40);
  sim.groups = []; g8.groupId = null; put(g8, 800, 800);
  put(p, 800 + 20, 800); p.atk = 0; put(girl, 800 + 200, 800); girl.hp = girl.maxHp = 9999; put(boy, 800 - 120, 800); boy.hp = boy.maxHp = 9999;
  run(sim, 0.6);
  assert.equal(g8.neHunt, boy.id, '近いロボや遠い少女ではなく、近い人間（少年）を追う');
  assert.equal(g8.speedMul, 1.3, '追っている間は速い');
  put(boy, 40, 40); put(girl, 40, 40);
  run(sim, 1.5);
  assert.equal(g8.neHunt, null, '見失ったらやめる'); assert.equal(g8.speedMul, 1);
});

test('ツギハギ号を優先して追う（G11）: 資材を運んでいる機体を先に。近くのロボには目をくれない', () => {
  const sim = only(mk(1), 'G11');
  const g11 = enemy(sim, 'G11'), [s1, s2] = sim.units.filter(u => u.kind === 'scav'), p = ally(sim, 'ponco');
  for (const u of sim.units) if (u.side === 'ally') put(u, 40, 40);
  sim.groups = []; g11.groupId = null; put(g11, 800, 800);
  put(p, 800 + 15, 800); p.atk = 0; put(s1, 800 - 90, 800); put(s2, 800 + 120, 800); s2.cargo = 12; s1.hp = s1.maxHp = 9999; s2.hp = s2.maxHp = 9999;
  run(sim, 0.6);
  assert.equal(g11.neHunt, s2.id, '遠くても資材を運んでいるほうを先に追う');
  assert.equal(g11.speedMul, 1.3);
  s2.cargo = 0; put(s2, 40, 40);
  run(sim, 1.2);
  assert.equal(g11.neHunt, s1.id);
});

// ---- 強さの調整（scratch/bal2.mjs と同じ測り方。out/BALANCE.md） ----
function lostHp(newE, gi, seed) {
  const sim = S.createSim({ seed, mission: M.MISSION_1, newEnemies: newE });
  const g = sim.groups[gi]; const keep = new Set(g.unitIds);
  sim.units = sim.units.filter(u => u.side === 'ally' || keep.has(u.id)); sim.groups = [g];
  const pons = sim.units.filter(u => u.kind === 'ponco').slice(0, 8);
  sim.units = sim.units.filter(u => u.side === 'enemy' || pons.includes(u));
  const dist = (newE && gi === 4) ? 2.2 : 9;
  sim.units.filter(u => u.side === 'enemy').forEach((u, i) => { u.x = 640 + (i - 1) * 30; u.y = 800 - dist * 32; u.order = null; });
  pons.forEach((u, i) => { u.x = 640 + (i % 4) * 24 - 36; u.y = 800 + Math.floor(i / 4) * 24; u.stance = 'free'; u.anchor = { x: u.x, y: u.y }; });
  const focus = () => { const e = sim.units.find(u => u.side === 'enemy' && (u.z || 0) >= 0); if (e) S.issueAttack(sim, pons.filter(u => u.hp > 0).map(u => u.id), e.id); };
  focus();
  for (let i = 0; i < 60 * 30; i++) { if (i % 60 === 0) focus(); S.stepSim(sim); if (!sim.units.some(u => u.side === 'enemy')) break; }
  return pons.reduce((a, u) => a + Math.max(0, u.maxHp - Math.max(0, u.hp)), 0);
}
test('強さの調整: PONCO 8 機で失う HP が、今の異星生物の約 1.3 倍（1.15〜1.5 倍の範囲）', () => {
  const seeds = [1, 2, 3, 4, 5], sum = (newE, gis) => gis.reduce((t, gi) => t + seeds.reduce((a, sd) => a + lostHp(newE, gi, sd), 0) / seeds.length, 0);
  const alien = sum(false, [0, 1, 2]), neu = sum(true, [0, 1, 2, 3, 4, 5, 6]);
  const ratio = neu / alien;
  assert.ok(ratio >= 1.15 && ratio <= 1.5, `倍率 ${ratio.toFixed(2)}（異星生物 ${alien.toFixed(0)}・新しい敵 ${neu.toFixed(0)}）`);
});

// ---- 資源集めだけでは勝てない ----
function gatherOnly(seed, secs) {
  const sim = S.createSim({ seed, mission: M.MISSION_1, newEnemies: true });
  const scavs = sim.units.filter(u => u.kind === 'scav'), ex = sim.mission.extraction;
  for (let i = 0; i < secs * 30 && !sim.result; i++) {
    if (i % 30 === 0) for (const u of scavs) {
      if (u.hp <= 0 || u.captured != null || u.order) continue;
      const alive = sim.mission.salvage.filter(p => p.amount > 0);
      if (u.cargo >= 15 || (!alive.length && u.cargo > 0)) S.issueOrder(sim, [u.id], [{ tx: ex.tx, ty: ex.ty }], { mode: 'move' });
      else if (alive.length) { const p = alive.sort((a, b) => Math.hypot(a.tx * 32 - u.x, a.ty * 32 - u.y) - Math.hypot(b.tx * 32 - u.x, b.ty * 32 - u.y))[0]; if (u.gathering == null || Math.hypot(p.tx * 32 - u.x, p.ty * 32 - u.y) > 80) S.issueOrder(sim, [u.id], [{ tx: p.tx, ty: p.ty }], { mode: 'move' }); }
    }
    S.stepSim(sim);
  }
  return sim;
}
test('資源集めだけ（ツギハギ号が山と脱出口を行き来して、PONCO は戦わない）では勝てない（seed 1〜3・10 分）', () => {
  for (const seed of [1, 2, 3]) { const sim = gatherOnly(seed, 600); assert.notEqual(sim.result, 'win', `seed ${seed}`); assert.ok(sim.mission.delivered < sim.mission.target); }
});
