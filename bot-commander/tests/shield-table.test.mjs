// v0.4.12-dev: 機体ごとの盾と体の表（js/sim/shield-table.js）。表の中身・makeUnit への入り方・兵種の倍率・装甲・
// 「前の表（SHIELD_TABLE_V0411）を渡すと v0.4.11 のハッシュにぴったり戻る」ことを確かめる。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createSim, runSim, stepSim, hashSim, deployUnit, shieldStats, issueRetreat, applyCommandsNow, KINDS, SHIELD_HP_FRAC, SHIELD_BLOCK_CHANCE } from '../js/sim/sim.js?v=27';
import { MISSION_1 } from '../js/sim/mission.js?v=10';
import { SHIELD_TABLE, SHIELD_TABLE_V0411, SHIELD_TABLE_IDEAS } from '../js/sim/shield-table.js?v=2';
import { statusBadgeOf, shieldBarFrac, STATUS_BADGES } from '../js/render/class-icons.js?v=5';
import { runScenarios } from './fixtures/altitude-scenarios.mjs';
import * as S from '../js/sim/sim.js?v=27';
import * as M from '../js/sim/mission.js?v=10';

const ROBOT_KINDS = Object.keys(KINDS).filter(k => !KINDS[k].human && !KINDS[k].object && k !== 'alien'); // v1.0.2: 物（物語の発射台・object）は機体の表に載せない（盾なし）
const EMPTY = { ally: [], enemy: [] };
const empty = (seed = 1, extra = {}) => createSim({ seed, setup: EMPTY, ...extra });
const deploy = (sim, kind, cls = null) => deployUnit(sim, kind, { tx: 20, ty: 52 }, { cls });
const hashes = table => [1, 2, 3, 4, 5].map(seed => { const sim = createSim({ seed, mission: MISSION_1, ...(table ? { shieldTable: table } : {}) }); runSim(sim, 300); return hashSim(sim); });

test('表: シムにある味方ロボットが全部載っていて、理由（日本語・（仮））と数値が正しい', () => {
  assert.deepEqual(ROBOT_KINDS.sort(), ['amph', 'flyer', 'giant', 'gunner', 'heavy', 'ponco', 'scav']); // amph・flyer は ?altunits=1 の 2 機（既定のままの行）
  for (const k of ROBOT_KINDS) {
    const r = SHIELD_TABLE[k];
    assert.ok(r, k);
    assert.ok(typeof r.why === 'string' && r.why.length > 8 && r.why.includes('（仮）') && /[ぁ-んァ-ヶ一-龠]/.test(r.why), `${k} の理由`);
    assert.ok(r.shieldFrac > 0 && r.shieldFrac <= 1 && r.blockChance > 0 && r.blockChance < 1 && r.wearMult > 0 && r.armor >= 0, k);
    assert.ok(r.hp > 0 && Number.isInteger(r.hp), `${k} の最大 HP`);
  }
  for (const [k, r] of Object.entries(SHIELD_TABLE_IDEAS)) assert.ok(r.why.includes('（仮）') && !(k in KINDS), `案 ${k}（シムには足さない）`);
});

test('表: 性格がはっきり違う（1 つの式に倍率を掛けただけではない）', () => {
  const t = SHIELD_TABLE;
  // 重装型: 厚く固い盾（耐久・受ける確率が最大、割れにくい）
  for (const k of ['gunner', 'ponco', 'scav', 'giant']) assert.ok(t.heavy.shieldFrac > t[k].shieldFrac && t.heavy.blockChance > t[k].blockChance && t.heavy.wearMult < t[k].wearMult, k);
  // ツギハギ号: 盾は薄く割れやすいが、体はしぶとい（最大 HP も装甲も上がる）
  assert.ok(t.scav.shieldFrac < t.ponco.shieldFrac && t.scav.blockChance < t.ponco.blockChance && t.scav.wearMult > t.ponco.wearMult);
  assert.ok(t.scav.hp > KINDS.scav.hp && t.scav.armor > 0);
  // 巨大機: 盾は小さめ、体がとても丈夫
  assert.ok(t.giant.shieldFrac < t.ponco.shieldFrac && t.giant.hp > KINDS.giant.hp && t.giant.armor > t.heavy.armor);
  // PONCO02 は物差し（v0.4.11 までと同じ）、射撃型は薄めの盾
  assert.deepEqual({ ...t.ponco, why: 0 }, { shieldFrac: SHIELD_HP_FRAC, blockChance: SHIELD_BLOCK_CHANCE, wearMult: 1, armor: 0, hp: KINDS.ponco.hp, why: 0 });
  assert.ok(t.gunner.shieldFrac < t.ponco.shieldFrac && t.gunner.blockChance < t.ponco.blockChance);
  // 盾の割合と体の丈夫さが同じ向きに並んでいない（倍率 1 つでは作れない）
  const order = key => ROBOT_KINDS.slice().sort((a, b) => t[a][key] - t[b][key] || (a < b ? -1 : 1)).join();
  assert.notEqual(order('shieldFrac'), order('hp'), '盾の割合の順と体の最大 HP の順が違う');
  // 今の機体の盾の枚数（実数）
  assert.deepEqual(ROBOT_KINDS.map(k => [k, Math.round(t[k].hp * t[k].shieldFrac)]).sort(), [['amph', 56], ['flyer', 36], ['giant', 144], ['gunner', 30], ['heavy', 96], ['ponco', 48], ['scav', 14]]);
});

test('makeUnit: 機体ごとの最大 HP・盾・装甲が表から入る。敵・人間・表にない機体は既定のまま', () => {
  const sim = empty();
  for (const k of ROBOT_KINDS) {
    const u = deploy(sim, k), r = SHIELD_TABLE[k];
    assert.equal(u.maxHp, r.hp); assert.equal(u.hp, r.hp);
    assert.equal(u.shieldMax, Math.round(r.hp * r.shieldFrac)); assert.equal(u.shieldHp, u.shieldMax);
    assert.equal(u.armor, r.armor); assert.deepEqual(shieldStats(u), { blockChance: r.blockChance, wearMult: r.wearMult });
  }
  // 体の前 → 後
  assert.deepEqual([KINDS.scav.hp, SHIELD_TABLE.scav.hp, KINDS.giant.hp, SHIELD_TABLE.giant.hp], [60, 72, 900, 1200]);
  for (const k of ['gunner', 'heavy', 'ponco']) assert.equal(SHIELD_TABLE[k].hp, KINDS[k].hp, `${k} の最大 HP は今のまま`);
  // 敵（同じ kind の heavy・gunner）は表を使わない
  const sim2 = createSim({ seed: 1 });
  for (const u of sim2.units.filter(v => v.side === 'enemy')) { assert.equal(u.maxHp, KINDS[u.kind].hp); assert.equal(u.shieldMax, 0); assert.equal(u.armor, 0); }
  // 人間
  const boy = deployUnit(empty(), 'boy', { tx: 20, ty: 52 }); assert.equal(boy.shieldMax, 0); assert.equal(boy.armor, 0);
  // 表にない機体は既定
  const bare = empty(1, { shieldTable: {} }), p = deploy(bare, 'scav');
  assert.equal(p.maxHp, KINDS.scav.hp); assert.equal(p.shieldMax, Math.round(60 * SHIELD_HP_FRAC)); assert.deepEqual(shieldStats(p), { blockChance: SHIELD_BLOCK_CHANCE, wearMult: 1 }); assert.equal(p.armor, 0);
});

test('兵種の倍率は表の上に掛かる（ガンナー: 受ける確率 +0.15・すり減り ×0.7）。守る命令の間は 1.0', () => {
  const sim = empty(); const ponco = deploy(sim, 'ponco', 'gunner'), heavy = deploy(sim, 'heavy', 'gunner'), scav = deploy(sim, 'scav', 'gunner'), plain = deploy(sim, 'heavy');
  assert.deepEqual(shieldStats(ponco), { blockChance: 0.5, wearMult: 0.7 }, '表が既定の機体はガンナーの値そのもの');
  assert.ok(Math.abs(shieldStats(heavy).blockChance - (0.45 + 0.15)) < 1e-12); assert.ok(Math.abs(shieldStats(heavy).wearMult - 0.8 * 0.7) < 1e-12);
  assert.ok(Math.abs(shieldStats(scav).blockChance - (0.25 + 0.15)) < 1e-12); assert.ok(Math.abs(shieldStats(scav).wearMult - 1.3 * 0.7) < 1e-12);
  assert.deepEqual(shieldStats(plain), { blockChance: 0.45, wearMult: 0.8 }, '兵種なしは表のまま');
  for (const u of [ponco, heavy, scav, plain]) { issueRetreat(sim, [u.id]); applyCommandsNow(sim); assert.equal(shieldStats(u).blockChance, 1, u.kind); }
  assert.equal(shieldStats(heavy).wearMult, 0.8 * 0.7, '守る間もすり減りは機体と兵種のまま');
  const hi = deploy(empty(), 'heavy', 'gunner'); hi.shieldBlock = 0.95; assert.equal(shieldStats(hi).blockChance, 1, '上限 1');
});

test('装甲: 体に当たる一撃だけ減らす（最低 1）。装甲 0 なら今と同じ数。盾が受けた一撃は減らさない', () => {
  const dmgOf = (armor, atk, shield) => {
    const sim = createSim({ seed: 4, setup: { ally: [{ kind: 'ponco', tx: 20, ty: 40 }], enemy: [{ name: 'e', kind: 'heavy', tx: 20, ty: 40, role: 'raid', count: 1 }] } });
    const [a] = sim.units.filter(u => u.side === 'ally'), [e] = sim.units.filter(u => u.side === 'enemy');
    a.atk = 0; a.armor = armor; a.shieldHp = shield ? a.shieldMax : 0; e.atk = atk; e.cd = 0; e.speed = 0; a.x = e.x - 20; a.y = e.y; a.hp = a.maxHp = 1e6;
    for (let i = 0; i < 200; i++) {
      const n0 = sim.fx.length; e.x = a.x + 20; e.y = a.y; stepSim(sim);
      const f = sim.fx.slice(n0).find(v => v.type === 'shot' && v.to === a.id);
      if (f) return { dmg: f.dmg, lost: 1e6 - a.hp, shield: !!f.shield, wear: a.shieldMax - a.shieldHp };
    }
    throw new Error('撃たれなかった');
  };
  const base = dmgOf(0, 30, false), arm = dmgOf(4, 30, false);
  assert.equal(base.lost, base.dmg); assert.equal(arm.lost, arm.dmg); assert.equal(base.dmg - arm.dmg, 4, '同じ乱数で 4 だけ減る');
  assert.equal(dmgOf(5, 2, false).lost, 1, '最低 1');
  // 盾が受けた時は装甲を引かない（盾の減りは元のダメージ×すり減り）
  const sh = dmgOf(4, 30, true); if (sh.shield) assert.equal(sh.wear, sh.dmg);
});

test('前の表（SHIELD_TABLE_V0411）を渡すと、v0.4.11 のハッシュにぴったり戻る（主局面 seed 1〜5・300 tick）', () => {
  assert.deepEqual(hashes(SHIELD_TABLE_V0411), ['e1420fb6', '341a8685', '5e7449a8', '2e39e817', 'ff91b72a']);
});

test('今の表（引数を省く）のハッシュ（主局面 seed 1〜5・300 tick）。前の表とは違う', () => {
  assert.deepEqual(hashes(), ['6cc93eb6', '2a60b985', '24994a28', '5558d677', '6e46d4aa']);
  assert.deepEqual(hashes(SHIELD_TABLE), hashes(), '省いた時は SHIELD_TABLE');
  assert.notDeepEqual(hashes(), hashes(SHIELD_TABLE_V0411));
});

test('表の差しかえは sim ごと（グローバルを書きかえない）: 前の表で回したあとも、省けば今の表', () => {
  const a = createSim({ seed: 1, mission: MISSION_1, shieldTable: SHIELD_TABLE_V0411 }), b = createSim({ seed: 1, mission: MISSION_1 });
  assert.equal(a.units.find(u => u.kind === 'scav').maxHp, 60); assert.equal(b.units.find(u => u.kind === 'scav').maxHp, 72);
  assert.equal(SHIELD_TABLE.scav.hp, 72); assert.ok(Object.isFrozen(SHIELD_TABLE) && Object.isFrozen(SHIELD_TABLE_V0411));
});

test('前の表で、tests/altitude.test.mjs の 9 つの場面が前の値（altitude-baseline-v0411.json）に戻る', () => {
  const base = JSON.parse(readFileSync(fileURLToPath(new URL('./fixtures/altitude-baseline-v0411.json', import.meta.url)), 'utf8')).scenarios;
  const now = runScenarios(S, M, { shieldTable: SHIELD_TABLE_V0411 });
  assert.equal(Object.keys(base).length, 9);
  assert.deepEqual(Object.keys(now).sort(), Object.keys(base).sort());
  for (const k of Object.keys(base)) assert.deepEqual(now[k], base[k], k);
});

test('画面: 盾のバーは盾が厚い機体ほど長い。状態の印は変わった時・大事な時だけ（常には出さない）', () => {
  const len = ROBOT_KINDS.map(k => [k, shieldBarFrac(Math.round(SHIELD_TABLE[k].hp * SHIELD_TABLE[k].shieldFrac))]);
  const f = Object.fromEntries(len);
  assert.ok(f.scav < f.gunner && f.gunner < f.ponco && f.ponco < f.heavy && f.heavy === 1 && f.giant === 1 && f.scav >= 0.45);
  const sim = empty(); const u = deploy(sim, 'ponco', 'gunner');
  assert.equal(statusBadgeOf(u), null, 'ふつうの時は出さない');
  assert.equal(statusBadgeOf(u, { defensive: true }), 'shield', '盾で守っている間');
  assert.equal(statusBadgeOf(u, { fresh: 'shield' }), 'shield', '盾を渡された・直った直後');
  assert.equal(statusBadgeOf(u, { fresh: 'repair_kit' }), 'repair_kit'); u.kitBuild = 3; assert.equal(statusBadgeOf(u), 'repair_kit', 'キットを作っている間'); u.kitBuild = null;
  u.shieldHp = 0; assert.equal(statusBadgeOf(u, { defensive: true, fresh: 'shield' }), 'shield_broken', '壊れている間は壊れの印がいちばん上');
  assert.equal(statusBadgeOf(deployUnit(empty(), 'boy', { tx: 20, ty: 52 })), null); assert.equal(statusBadgeOf({ side: 'enemy', shieldMax: 5, shieldHp: 0 }), null);
  for (const n of ['shield', 'shield_broken', 'repair_kit']) assert.ok(STATUS_BADGES.includes(n));
});
