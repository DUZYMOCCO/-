// 武器庫の装備を戦闘で効かせる計算（js/sim/loadout-effects.js）: 2つ目以降の武器・背中・IT-01・修理・バリア・射程のマス・特殊効果の名前。
// 装備を選ばない時にシムが変わらないことは tests/armory.test.mjs と hash300.mjs が確かめる。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  RANGE_PX, roundHalf, rangeTiles, traitsOf, traitIds, SPECIAL_EFFECT, FX, buildLoadoutFx, pickShot, healByLoadout, withLoadoutShield,
} from '../js/sim/loadout-effects.js?v=3';
import { sanitizeLoadout, buildRoster, slotCounts, simEffect } from '../js/armory/loadout.js?v=4';
import { weaponById, weaponPower } from '../js/sim/weapons.js?v=5';
import { weaponMul } from '../js/sim/cover.js?v=6';
import { ALT_TEST_UNITS } from '../js/sim/altitude.js?v=1';
import { MISSION_1 } from '../js/sim/mission.js?v=10';
import { createSim, stepSim, runSim, shieldStats, KINDS, SHIELD_BLOCK_CHANCE } from '../js/sim/sim.js?v=23';

const HERE = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(HERE, '../assets/weapons/armory-data.json'), 'utf8'));
const row = id => data.weapons.find(r => r.id === id);
const AIR = ALT_TEST_UNITS.air;
const E = (over = {}) => ({ weapon: [null, null], back: [], support: [null], it01: 0, ...over });

/**
 * 小さな場面: 味方の PONCO「P」（と、あれば「Q」）と、動かない・撃たない・壊れない敵 1 体「赤」。
 * 敵は P から d px 上（北）に置く。P は動かない。loadout は { P: entry, Q: entry }
 */
function scene({ d = 130, loadout, q = false, enemy = {} } = {}) {
  const ally = [{ kind: 'ponco', tx: 12, ty: 33, name: 'P' }];
  if (q) ally.push({ kind: 'ponco', tx: 13, ty: 33, name: 'Q' });
  const sim = createSim({ seed: 1, setup: { ally, enemy: [{ name: '赤', kind: 'alien', tx: 12, ty: 20, role: 'guard', count: 1, ...enemy }] }, loadout });
  const p = sim.units.find(u => u.label === 'P');
  for (const u of sim.units) { u.speed = 0; if (u.side === 'enemy') { u.atk = 0; u.hp = u.maxHp = 1e6; u.x = p.x; u.y = p.y - d; } }
  return sim;
}
const by = (sim, label) => sim.units.find(u => u.label === label);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
/** n ステップ進めて、味方が撃った武器の id を数える */
function weaponsFired(sim, n) {
  const seen = {};
  for (let i = 0; i < n; i++) { stepSim(sim); for (const f of sim.fx) if (f.type === 'shot' && f.side === 'ally' && !f._c) { f._c = 1; seen[f.weapon] = (seen[f.weapon] || 0) + 1; } }
  return seen;
}

test('射程のマス: 分けの表（PONCO02 の 112px＝3.5マス＝「中」）・表にない物は range÷32 を 0.5 マスきざみ・距離のない物は null', () => {
  assert.equal(RANGE_PX.mid, KINDS.ponco.range, 'PONCO02 の今の射程は「中」');
  assert.equal(RANGE_PX.mid / 32, 3.5);
  assert.deepEqual(Object.fromEntries(Object.entries(RANGE_PX).map(([k, v]) => [k, v / 32])), { melee: 1.25, short: 2.5, mid: 3.5, long: 5, xlong: 7 });
  assert.equal(rangeTiles(row('W2-01')), 3.5);
  assert.equal(rangeTiles(row('W1-07')), 1.25);
  assert.equal(rangeTiles(row('W2-06')), 7);
  assert.equal(rangeTiles(row('WB1-01')), null, '自分だけ');
  assert.equal(rangeTiles(row('W1-10')), null, '置く場所');
  assert.equal(rangeTiles(null), null);
  // 表にない range_key で range（px）だけある物は 0.5 マスきざみ
  for (const [px, tiles] of [[112, 3.5], [150, 4.5], [280, 9], [450, 14], [700, 22], [40, 1.5], [16, 0.5], [47, 1.5], [48, 1.5], [49, 1.5], [60, 2]]) {
    assert.equal(rangeTiles({ range_key: 'unknown', range: px }), tiles, `${px}px`);
  }
  assert.equal(roundHalf(4.6875), 4.5);
  assert.equal(roundHalf(8.75), 9);
  assert.equal(roundHalf(0.2), 0);
});

test('武器ごとの射程の分けと特殊効果の写しが、armory-data.json と同じ（武器の枠・修理/バリアの枠の 62 件）', () => {
  const rows = data.weapons.filter(r => r.slot === 'weapon' || r.slot === 'support');
  assert.equal(rows.length, 62);
  assert.equal(traitIds().length, 62);
  for (const r of rows) {
    const t = traitsOf(r.id);
    assert.ok(t, r.id);
    assert.equal(t.rangeKey, r.range_key, `${r.id} の射程の分け`);
    assert.deepEqual([...t.special], r.special, `${r.id} の特殊効果`);
  }
  assert.equal(traitsOf('W1-10'), null, '罠(carry)は入らない');
  assert.equal(traitsOf('nope'), null);
  // 資料の使う射程の分けは、表にあるか、距離のない物(self・place)だけ
  for (const r of data.weapons) assert.ok(RANGE_PX[r.range_key] || ['self', 'place'].includes(r.range_key), r.id);
});

test('特殊効果の日本語の名前: 資料に出てくる全部にある（資料にない 7 つは足した名前）・効くか名前だけかの表が全部そろっている', () => {
  const keys = new Set(data.weapons.flatMap(r => r.special));
  for (const k of keys) {
    assert.ok(data.SPECIAL_NAMES[k], `${k} の日本語の名前`);
    assert.notEqual(data.SPECIAL_NAMES[k], k);
    assert.ok(SPECIAL_EFFECT[k], `${k} が効くか名前だけかの表にある`);
  }
  const seven = { hold_target: 'つきっきり', front_only: '前だけ', jam: '妨害', debuff: '弱体化', reach_air: '空にも届く', heal_in_combat: '戦闘中も修理', self_only: '自分だけ' };
  for (const [k, v] of Object.entries(seven)) assert.equal(data.SPECIAL_NAMES[k], v);
  assert.equal(Object.keys(data.SPECIAL_NAMES).length, 21);
  assert.deepEqual(Object.keys(SPECIAL_EFFECT).filter(k => SPECIAL_EFFECT[k] === 'active').sort(), ['antiair', 'heal_in_combat', 'indirect', 'self_only', 'vs_large']);
});

test('装備の効き目の作り方: 持てる type の 2つ目以降・背中だけ guns に入る・1つ目の枠は入らない・何も効かなければ null', () => {
  const u = { kind: 'ponco', maxHp: 120 };
  assert.equal(buildLoadoutFx(u, E()), null);
  assert.equal(buildLoadoutFx(u, E({ weapon: ['W1-04', null] })), null, '1つ目だけでは u.weapon が効く（効き目は付かない）');
  const fx = buildLoadoutFx(u, E({ weapon: ['W2-01', 'W1-04'], back: ['W3-04'] }));
  assert.deepEqual(fx.guns.map(g => g.id), ['W1-04', 'W3-04']);
  assert.equal(fx.guns[0].range, RANGE_PX.long);
  assert.equal(fx.guns[1].range, RANGE_PX.xlong);
  assert.equal(fx.guns[0].mul, weaponMul('ponco', weaponById('W1-04')));
  assert.equal(fx.guns[0].power, weaponPower(weaponById('W1-04')));
  assert.equal(buildLoadoutFx(u, E({ weapon: [null, 'W1-07'] })), null, '近接は PONCO が持てない');
  assert.equal(buildLoadoutFx({ kind: 'scav', maxHp: 60 }, E({ weapon: [null, 'W1-04'] })), null, 'ツギハギ号は武器を持てない');
  assert.equal(buildLoadoutFx(u, E({ weapon: [null, 'WB1-01'] })), null, '修理/バリアの道具は武器の枠では効かない');
  assert.equal(buildLoadoutFx(u, E({ support: ['W1-04'] })), null, '武器は修理/バリアの枠では効かない');
});

test('2つ目の武器: 1つ目(射程 112px)が届かない相手に、届く 2つ目が使われる（装備なしでは撃たない）', () => {
  const none = scene({ d: 130 }), P0 = by(none, 'P'), E0 = by(none, '赤');
  const d = dist(P0, E0);
  assert.ok(d > RANGE_PX.mid && d < RANGE_PX.long, `敵は 112px の外・160px の中（${d.toFixed(0)}px）`);
  assert.deepEqual(weaponsFired(none, 90), {}, '装備なしは撃たない');
  assert.equal(E0.hp, E0.maxHp);
  const sim = scene({ d: 130, loadout: { P: E({ weapon: [null, 'W1-04'] }) } });
  const P = by(sim, 'P'), en = by(sim, '赤');
  assert.equal(P.weapon, undefined, '1つ目の武器は変わらない');
  const fired = weaponsFired(sim, 90);
  assert.deepEqual(Object.keys(fired), ['W1-04'], '2つ目の狙撃銃で撃つ');
  assert.ok(en.hp < en.maxHp);
  assert.equal(P.engaged, true);
  assert.equal(P.targetId, en.id);
});

test('2つ目の武器: 両方届く時は一番強い物（weaponPower）。2つ目が弱ければ今までどおり 1つ目で撃つ', () => {
  assert.ok(weaponPower(weaponById('W1-06')) > weaponPower(weaponById('W2-01')));
  assert.ok(weaponPower(weaponById('W1-01')) < weaponPower(weaponById('W2-01')));
  const strong = scene({ d: 64, loadout: { P: E({ weapon: [null, 'W1-06'] }) } });
  assert.deepEqual(Object.keys(weaponsFired(strong, 60)), ['W1-06'], 'ロケット砲のほうが強い');
  const weak = scene({ d: 64, loadout: { P: E({ weapon: [null, 'W1-01'] }) } });
  assert.deepEqual(Object.keys(weaponsFired(weak, 60)), ['W2-01'], '拳銃は 1つ目より弱いので使わない');
  // 1つ目の武器を入れ替えても、その武器と比べる
  const swapped = scene({ d: 64, loadout: { P: E({ weapon: ['W1-06', 'W2-01'] }) } });
  assert.deepEqual(Object.keys(weaponsFired(swapped, 60)), ['W1-06'], '1つ目のロケット砲が一番強い');
});

test('IT-01 で増えた枠・背中の枠・同じ武器を 2 つの枠に付けることが、それぞれ効く', () => {
  // mid の体は武器 2 枠。IT-01 を付けると 3 枠目ができ、そこが効く
  const roster = buildRoster(MISSION_1, KINDS);
  const ponco1 = roster.find(r => r.label === 'PONCO1');
  assert.equal(slotCounts(data, ponco1.body, 1).weapon, 3);
  const lo = sanitizeLoadout(data, roster, { PONCO1: { weapon: [null, null, 'W1-04'], back: [], support: [null], it01: 1 } });
  assert.deepEqual(lo.PONCO1.weapon, [null, null, 'W1-04']);
  const it = scene({ d: 130, loadout: { P: lo.PONCO1 } });
  assert.deepEqual(Object.keys(weaponsFired(it, 90)), ['W1-04'], 'IT-01 の 3 枠目の武器で撃つ');
  // 背中（L・XL の大物）: 触手長砲（超長・曲射）
  const back = scene({ d: 130, loadout: { P: E({ back: ['W3-04'] }) } });
  assert.deepEqual(Object.keys(weaponsFired(back, 90)), ['W3-04'], '背中の砲で撃つ');
  // 同じ武器を 2 つの枠・2 機に付ける
  const twice = scene({ d: 130, q: true, loadout: { P: E({ weapon: ['W1-04', 'W1-04'] }), Q: E({ weapon: [null, 'W1-04'] }) } });
  assert.equal(by(twice, 'P').loadoutFx.guns.length, 1, '1つ目は u.weapon・2つ目が guns');
  assert.equal(by(twice, 'P').weapon, 'W1-04');
  assert.equal(by(twice, 'Q').loadoutFx.guns[0].id, 'W1-04');
  const three = buildLoadoutFx({ kind: 'ponco', maxHp: 120 }, E({ weapon: [null, 'W1-04', 'W1-04'] }));
  assert.equal(three.guns.length, 2, '同じ武器が 2 つの枠にあれば 2 つ入る');
});

test('見えていない遠い相手には、2つ目の武器でも撃たない（見えている相手だけ）', () => {
  const sim = scene({ d: 220, loadout: { P: E({ back: ['W2-06'] }) } }); // 超長 224px。敵は約 224px 先（視界 4.5 マス＝144px の外）
  const p = by(sim, 'P'), en = by(sim, '赤');
  assert.ok(dist(p, en) > p.sight * 32, '視界の外');
  assert.ok(dist(p, en) <= RANGE_PX.xlong + 1);
  assert.deepEqual(weaponsFired(sim, 60), {});
  assert.equal(en.hp, en.maxHp);
});

test('特殊効果: vs_large は巨大(最大HP300以上)な敵に ×1.5・antiair は空の敵に ×1.5・indirect は曲射(遮蔽物を越える)の印', () => {
  const big = scene({ d: 100, loadout: { P: E({ back: ['W3-16'] }) } });
  const small = scene({ d: 100, loadout: { P: E({ back: ['W3-16'] }) }, enemy: { kind: 'gunner' } });
  big.units.find(u => u.label === '赤').maxHp = 360; small.units.find(u => u.label === '赤').maxHp = 100;
  const sb = pickShot(big, by(big, 'P'), null, null), ss = pickShot(small, by(small, 'P'), null, null);
  assert.ok(sb && ss);
  assert.equal(sb.row.id, 'W3-16');
  assert.ok(Math.abs(sb.atk / ss.atk - FX.vsLargeMul) < 1e-9);
  assert.equal(sb.indirect, false);
  // antiair
  const air = scene({ d: 64, loadout: { P: E({ weapon: [null, 'W3-11'] }) }, enemy: { ...AIR, name: '赤', kind: 'gunner' } });
  const ground = scene({ d: 64, loadout: { P: E({ weapon: [null, 'W3-11'] }) }, enemy: { kind: 'gunner' } });
  const sa = pickShot(air, by(air, 'P'), null, null), sg = pickShot(ground, by(ground, 'P'), null, null);
  assert.ok(sa && sg, '射撃は空の敵にも届く');
  assert.ok(Math.abs(sa.atk / sg.atk - FX.antiairMul) < 1e-9);
  // indirect
  const ind = scene({ d: 100, loadout: { P: E({ back: ['W3-04'] }) } });
  assert.equal(pickShot(ind, by(ind, 'P'), null, null).indirect, true);
});

test('空の敵: 今の届く決まり(canHit)に従う。近接の 2つ目は PONCO が持てないので、射撃の 2つ目だけが空に届く', () => {
  const air = scene({ d: 130, loadout: { P: E({ weapon: [null, 'W1-04'] }) }, enemy: { ...AIR, name: '赤', kind: 'gunner' } });
  assert.deepEqual(Object.keys(weaponsFired(air, 90)), ['W1-04']);
  // 地上の敵を狙っている途中でも、届かない物は選ばない: pickShot は canHit を通る
  const fx = by(air, 'P').loadoutFx;
  fx.guns[0].row = { ...fx.guns[0].row, type: 'melee' }; // 近接に差し替えると空には届かない
  const en = by(air, '赤');
  assert.equal(pickShot(air, by(air, 'P'), null, null), null);
  assert.ok(en.z > 0);
});

test('修理の道具: 近くの傷んだ味方を毎秒 最大HP×(強さ×0.001) ずつ直す。戦闘中も直す(heal_in_combat)でない道具は、撃たれて 2 秒以内の相手は直さない', () => {
  const mk = tool => {
    const sim = scene({ d: 640, q: true, loadout: { P: E({ support: [tool] }) } });
    const q = by(sim, 'Q'); q.hp = q.maxHp * 0.5; q.lastHit = -99;
    return sim;
  };
  const rate = Math.min(FX.healCap, weaponPower(weaponById('W1-11')) * FX.healK);
  assert.ok(Math.abs(rate - 0.01) < 1e-9, '溶接トーチ(T1・1秒)は 1%/秒');
  const sim = mk('W1-11'), q = by(sim, 'Q'), p = by(sim, 'P');
  assert.ok(dist(p, q) <= 40, `Q は P のすぐ近く（${dist(p, q).toFixed(0)}px）`);
  const hp0 = q.hp;
  runSim(sim, 60);
  assert.ok(Math.abs((q.hp - hp0) - q.maxHp * rate * 2) < 0.5, `2 秒で約 ${q.maxHp * rate * 2} 直る（${q.hp - hp0}）`);
  // 道具なしでは直らない
  const none = scene({ d: 640, q: true }); by(none, 'Q').hp = 60; by(none, 'Q').lastHit = -99;
  runSim(none, 60);
  assert.equal(by(none, 'Q').hp, 60);
  // 撃たれた直後は、普通の道具は直さない・戦闘中も直す針は直す
  for (const [tool, heals] of [['W1-11', false], ['W3-08', true]]) {
    const s = mk(tool), qq = by(s, 'Q'); qq.lastHit = s.time;
    const h0 = qq.hp;
    for (let i = 0; i < 30; i++) { qq.lastHit = s.time; stepSim(s); } // 1 秒の間ずっと撃たれ続ける
    assert.equal(qq.hp > h0, heals, tool);
  }
  // 自己修復炉(self_only)は自分だけ
  const so = scene({ d: 640, q: true, loadout: { P: E({ support: ['WR4-01'] }) } });
  const sp = by(so, 'P'), sq = by(so, 'Q'); sp.hp = sp.maxHp * 0.5; sq.hp = sq.maxHp * 0.5; sp.lastHit = sq.lastHit = -99;
  runSim(so, 30);
  assert.ok(sp.hp > sp.maxHp * 0.5, '自分は直る');
  assert.equal(sq.hp, sq.maxHp * 0.5, '近くの味方は直らない');
  // 範囲(splash>0)の道具は一度に 3 体まで
  assert.equal(buildLoadoutFx({ kind: 'ponco', maxHp: 120 }, E({ support: ['WR2-03'] })).heal[0].targets, 3);
  assert.equal(buildLoadoutFx({ kind: 'ponco', maxHp: 120 }, E({ support: ['W1-11'] })).heal[0].targets, 1);
});

test('修理の道具: 満タンの味方・遠い味方・敵は直さない。1 秒の量は上限 healCap まで', () => {
  const sim = scene({ d: 640, q: true, loadout: { P: E({ support: ['W1-11'] }) }, enemy: { kind: 'gunner' } });
  const q = by(sim, 'Q'), en = by(sim, '赤');
  q.x += 200; q.hp = q.maxHp * 0.5; q.lastHit = -99; en.hp = 10;
  runSim(sim, 30);
  assert.equal(q.hp, q.maxHp * 0.5, '遠い');
  assert.equal(en.hp, 10, '敵は直さない');
  for (const r of data.weapons.filter(r => r.type === 'repair')) {
    const h = buildLoadoutFx({ kind: 'ponco', maxHp: 120 }, E({ support: [r.id] })).heal[0];
    assert.ok(h.rate > 0 && h.rate <= FX.healCap, r.id);
  }
});

test('バリアの道具: シールドの耐久を上から足し、速い小盾は「受ける確率」も足す。道具のない機体・shieldStats の形は変わらない', () => {
  const base = scene({ d: 640, q: true });
  const bP = by(base, 'P');
  const baseMax = bP.shieldMax, baseStats = shieldStats(bP);
  assert.equal(baseStats.blockChance, SHIELD_BLOCK_CHANCE);
  assert.deepEqual(Object.keys(baseStats).sort(), ['blockChance', 'wearMult']);
  const small = scene({ d: 640, q: true, loadout: { P: E({ support: ['WB1-01'] }) } });
  const sP = by(small, 'P');
  const add = Math.round(Math.min(sP.maxHp, 10 * Math.pow(0.5, 1.75)));
  assert.equal(sP.shieldMax, baseMax + add);
  assert.equal(sP.shieldHp, baseMax + add);
  const st = shieldStats(sP);
  assert.ok(Math.abs(st.blockChance - (SHIELD_BLOCK_CHANCE + FX.shieldBlockFast + FX.shieldBlockPerTier * 1)) < 1e-9);
  assert.equal(st.wearMult, baseStats.wearMult);
  assert.deepEqual(Object.keys(st).sort(), ['blockChance', 'wearMult']);
  // ドーム(遅い)は耐久だけ。機体の最大HPまで
  const dome = scene({ d: 640, loadout: { P: E({ support: ['WB1-03'] }) } });
  const dP = by(dome, 'P');
  assert.equal(dP.shieldMax, baseMax + dP.maxHp);
  assert.equal(shieldStats(dP).blockChance, SHIELD_BLOCK_CHANCE);
  // 道具のない機体は何も変わらない（loadoutFx もない）
  assert.equal(by(small, 'Q').loadoutFx, undefined);
  assert.equal(by(small, 'Q').shieldMax, baseMax);
  assert.deepEqual(shieldStats(by(small, 'Q')), baseStats);
  // 2 つ付けても「受ける確率」の足しは上限まで・1 を超えない
  const two = buildLoadoutFx({ kind: 'ponco', maxHp: 120 }, E({ support: ['WB3-01', 'WB3-02'] }));
  assert.ok(two.shield.block <= FX.shieldBlockCap);
  assert.equal(withLoadoutShield({ blockChance: 0.9, wearMult: 1 }, { loadoutFx: { shield: { hp: 1, block: 0.3 } } }).blockChance, 1);
  assert.deepEqual(withLoadoutShield({ blockChance: 0.5, wearMult: 0.7 }, {}), { blockChance: 0.5, wearMult: 0.7 });
  // 撤退中(1.0)はそのまま 1
  assert.equal(withLoadoutShield({ blockChance: 1, wearMult: 1 }, { loadoutFx: { shield: { hp: 1, block: 0.2 } } }).blockChance, 1);
});

test('バリアは戦闘で効く: 耐久の増えた盾が受けて、道具のない同じ場面より長く持つ', () => {
  const run = loadout => {
    const sim = createSim({ seed: 3, setup: { ally: [{ kind: 'ponco', tx: 12, ty: 33, name: 'P' }], enemy: [{ name: '赤', kind: 'gunner', tx: 12, ty: 31, role: 'guard', count: 1 }] }, loadout });
    const p = by(sim, 'P'); p.speed = 0; p.atk = 0; p.hp = p.maxHp = 1e6;
    let hits = 0;
    for (let i = 0; i < 300; i++) { stepSim(sim); for (const f of sim.fx) if (f.type === 'shieldHit' && !f._c) { f._c = 1; hits++; } }
    return { hits, left: p.shieldHp, max: p.shieldMax };
  };
  const a = run(undefined), b = run({ P: E({ support: ['WB1-03'] }) });
  assert.ok(b.max > a.max);
  assert.ok(b.hits >= a.hits && b.hits > 0, `盾が受けた回数 ${a.hits} → ${b.hits}`);
  assert.ok(b.left > a.left, `耐久の残り ${a.left.toFixed(0)} → ${b.left.toFixed(0)}`);
});

test('simEffect: 武器の枠・背中・修理/バリアの枠それぞれで、持てる物は効く・持てない物は効かない', () => {
  assert.equal(simEffect('ponco', row('W3-04'), 'weapon', 1), 'active');
  assert.equal(simEffect('ponco', row('W1-09'), 'weapon', 1), 'active', '投擲');
  assert.equal(simEffect('ponco', row('W1-12'), 'weapon', 1), 'noEffect', '妨害は持てない');
  assert.equal(simEffect('ponco', row('WR2-03'), 'support', 0), 'active');
  assert.equal(simEffect('heavy', row('W1-06'), 'back', 0), 'active');
  assert.equal(simEffect('ponco', null, 'support', 0), 'noEffect');
});
