// 遮蔽物（js/sim/cover.js）: 弾を止める位置関係・HP と壊れ方・落とし物と拾う決まり。見通しと通行は変えない。
import test from 'node:test';
import assert from 'node:assert/strict';
import { COVER, COVER_LAYOUT, DROPS, ITEMS, PICKUP, WEAPON_DROP, createCover, insideCover, segmentEnters, coverBlocks, findCover, damageCover, rollDrop, atkOf,
  gearTier, weaponPool, rollWeapon, canEquip, weaponMul, addOwned, applyItem } from '../js/sim/cover.js?v=8';
import { WEAPONS, weaponById, weaponPower } from '../js/sim/weapons.js?v=7';
import { createSim, stepSim, runSim, issueOrder, hashSim, TICK } from '../js/sim/sim.js?v=28';
import { MISSION_1 } from '../js/sim/mission.js?v=10';
import { generateMap, passable, toTile } from '../js/sim/map.js?v=6';

const one = (kind, x, y) => createCover([{ kind, x, y }])[0];

test('遮蔽物: 数値は1か所（種類ごとの確率・HP、落とし物の表）', () => {
  assert.equal(COVER.kinds.tree.block, 0.25);
  assert.equal(COVER.kinds.ruins.block, 0.5);
  assert.equal(COVER.kinds.housing.block, 0.5);
  assert.equal(COVER.kinds.highrise.block, 0.7);
  assert.ok(COVER.kinds.tree.hp < COVER.kinds.ruins.hp && COVER.kinds.ruins.hp < COVER.kinds.highrise.hp);
  for (const k of Object.values(COVER.kinds)) assert.ok(DROPS[k.drop], `表がない: ${k.drop}`);
  for (const t of Object.values(DROPS)) for (const [item] of t) assert.ok(item === 'none' || ITEMS[item], `ない品: ${item}`);
});

test('遮蔽物: 相手が中にいて、間にあれば止められる', () => {
  const c = one('ruins', 500, 500); // 足場の中心は (500, 460)
  assert.ok(insideCover(c, 500, 460));
  const t = coverBlocks(c, 500, 300, 500, 460); // 北から、中にいる相手を撃つ
  assert.ok(t > 0 && t < 1, `t=${t}`);
  assert.ok(Math.abs(300 + 160 * t - (460 - c.ry)) < 0.5, '足場の縁で当たる');
  // すぐ横（margin 以内）の奥側にいる相手も守られる
  assert.ok(coverBlocks(c, 500, 300, 500, 460 + c.ry + COVER.margin - 2) > 0);
});

test('遮蔽物: 間にない・離れている・撃つ側も中、なら止めない', () => {
  const c = one('ruins', 500, 500);
  // 相手は足場の手前（撃つ側と同じ側）の外 → 弾の線は足場を通らない
  assert.equal(coverBlocks(c, 500, 300, 500, 460 - c.ry - 6), -1);
  // 相手は遠い（すぐ横より外）
  assert.equal(coverBlocks(c, 500, 300, 500, 460 + c.ry + COVER.margin + 10), -1);
  // 撃つ側も同じ遮蔽物の中
  assert.equal(coverBlocks(c, 460, 460, 540, 460), -1);
  // 横から撃つが、線は足場をかすめない（相手はすぐ横の上側の外れ）
  assert.equal(coverBlocks(c, 300, 460 - c.ry - 10, 380, 460 - c.ry - 10), -1);
  // 壊れた遮蔽物は止めない
  c.state = 'rubble'; c.hp = 0;
  assert.equal(coverBlocks(c, 500, 300, 500, 460), -1);
});

test('遮蔽物: 線分と楕円の交わり', () => {
  const c = one('tree', 0, COVER.kinds.tree.ry); // 足場の中心 (0,0)、半径 rx×ry
  const rx = c.rx;
  assert.ok(Math.abs(segmentEnters(c, -2 * rx, 0, 2 * rx, 0) - 0.25) < 1e-9);
  assert.equal(segmentEnters(c, -2 * rx, c.ry * 1.5, 2 * rx, c.ry * 1.5), -1);
  assert.equal(segmentEnters(c, -3 * rx, 0, -2 * rx, 0), -1);   // 届かない
  assert.equal(segmentEnters(c, 0, 0, 3 * rx, 0), 0);           // 始まりが中
});

test('遮蔽物: いちばん相手に近いものが止める', () => {
  const covers = createCover([{ kind: 'tree', x: 500, y: 516 }, { kind: 'highrise', x: 500, y: 400 + 54 }]);
  const r = findCover(covers, 500, 200, 500, 500);
  assert.equal(r.cover.kind, 'tree');
});

test('遮蔽物: HP が減ると傷み、0 で瓦礫になる', () => {
  const c = one('housing', 300, 300), hp = c.maxHp;
  assert.equal(c.state, 'intact');
  assert.equal(damageCover(c, hp * 0.4), null);
  assert.equal(c.state, 'intact');
  assert.equal(damageCover(c, hp * 0.2), 'damaged');
  assert.equal(c.state, 'damaged');
  assert.equal(damageCover(c, hp), 'broke');
  assert.equal(c.state, 'rubble'); assert.equal(c.hp, 0);
  assert.equal(damageCover(c, 10), null, '瓦礫はもう傷まない');
});

test('落とし物の抽選: 表の重みどおり', () => {
  const t = [['none', 25], ['repair', 45], ['weapon', 30]];
  assert.equal(rollDrop(t, 0), null);
  assert.equal(rollDrop(t, 0.2499), null);
  assert.equal(rollDrop(t, 0.25), 'repair');
  assert.equal(rollDrop(t, 0.6999), 'repair');
  assert.equal(rollDrop(t, 0.7), 'weapon');
  assert.equal(rollDrop(t, 0.99999), 'weapon');
  for (let i = 0; i < 100; i++) assert.notEqual(rollDrop(DROPS.heavy, i / 100), null, 'ビル残骸は必ず何か出る');
});

test('置き場所: ミッション1の遮蔽物は陸の上', () => {
  const map = generateMap(7);
  assert.ok(COVER_LAYOUT.length >= 5);
  for (const c of createCover(COVER_LAYOUT)) assert.ok(passable(map, toTile(c.x), toTile(c.y)), `${c.kind} @${c.x},${c.y}`);
  const sim = createSim({ seed: 1, mission: MISSION_1 });
  assert.equal(sim.cover.length, COVER_LAYOUT.length);
  assert.equal(createSim({ seed: 1 }).cover.length, 0, 'ミッションなしは置かない');
});

// 撃ち合いの小さな場: PONCO が、ビル残骸の中にいる（動かない・撃たない）異星生物を撃つ
function duel(kind = 'highrise', seed = 3) {
  const setup = { ally: [{ kind: 'ponco', tx: 12, ty: 25 }], enemy: [{ kind: 'alien', tx: 12, ty: 22, role: 'guard', count: 1 }] };
  const sim = createSim({ seed, setup, cover: [] });
  const a = sim.units.find(u => u.side === 'ally'), e = sim.units.find(u => u.side === 'enemy');
  e.speed = 0; e.atk = 0; e.hp = e.maxHp = 5000;
  sim.cover = createCover([{ kind, x: e.x, y: e.y + COVER.kinds[kind].ry }]); // 足場の中心＝敵の足元
  return { sim, a, e, c: sim.cover[0] };
}

test('撃ち合い: 遮蔽物がおよそ決まった割合の弾を止め、代わりに傷む', () => {
  const { sim, e, c } = duel('highrise');
  let shots = 0, blocked = 0;
  const seen = new Set();
  for (let i = 0; i < 30 * 30 && c.state !== 'rubble'; i++) {
    stepSim(sim);
    for (const f of sim.fx) if (f.type === 'shot' && !seen.has(f)) { seen.add(f); shots++; if (f.cover != null) blocked++; }
  }
  assert.ok(shots > 10, `shots=${shots}`);
  assert.ok(blocked > 0 && c.hp < c.maxHp);
  assert.equal(c.maxHp - c.hp >= 0, true);
  const rate = blocked / shots;
  assert.ok(rate > 0.45 && rate < 0.9, `止めた割合 ${rate.toFixed(2)}（ビルは 0.7）`);
  assert.ok(e.hp < e.maxHp, '止まらなかった弾は相手に当たる');
});

test('撃ち合い: 壊れると止めなくなり、落とし物が出る。味方が踏むと拾う', () => {
  const { sim, a, e, c } = duel('highrise', 5);
  let broke = null, drop = null;
  for (let i = 0; i < 30 * 120 && !broke; i++) {
    stepSim(sim);
    broke = sim.fx.find(f => f.type === 'coverBreak') || null;
    drop = sim.fx.find(f => f.type === 'drop') || drop;
  }
  assert.ok(broke, '壊れた');
  assert.equal(c.state, 'rubble');
  assert.ok(drop && sim.items.length === 1, 'ビル残骸は必ず落とす');
  // 壊れた後は、もう止めない
  const before = e.hp; let coverShots = 0;
  for (let i = 0; i < 30 * 5; i++) { stepSim(sim); for (const f of sim.fx) if (f.type === 'shot' && f.cover != null && f.t > broke.t) coverShots++; }
  assert.equal(coverShots, 0); assert.ok(e.hp < before);
  // 拾う
  const it = sim.items[0];
  a.hp = 20; a.x = it.x + PICKUP.radius - 2; a.y = it.y;
  const hp0 = a.hp, atk0 = atkOf(a);
  stepSim(sim);
  assert.equal(sim.items.length, 0, '拾った');
  const got = sim.fx.find(f => f.type === 'pickup');
  assert.ok(got && got.unit === a.id);
  if (it.type === 'repair') assert.ok(a.hp > hp0 + a.maxHp * ITEMS.repair.heal - 1);
  else {
    assert.ok(weaponById(it.weapon), '落ちた武器は表の1つ');
    assert.equal(got.weapon, it.weapon); assert.deepEqual(sim.loot, [it.weapon]);
    if (got.equipped) assert.ok(atkOf(a) > atk0 && a.weapon === it.weapon); else assert.equal(atkOf(a), atk0);
  }
});

test('落とし物: リペアキットは満タンで持ち物も上限（2つ）の機体は拾わない・時間で消える・異星生物は拾わない', () => {
  const { sim, a, e } = duel('tree');
  a.kits = 2; // v0.4.2: 満タンでも持ち物が上限未満なら持ち物に足す（tests/repair-kit.test.mjs）
  sim.items.push({ id: 99, type: 'repair', x: a.x, y: a.y, t: sim.time });
  stepSim(sim);
  assert.equal(sim.items.length, 1, '満タン・持ち物が上限なら拾わない');
  sim.items.push({ id: 100, type: 'weapon', weapon: 'W2-03', x: e.x, y: e.y, t: sim.time });
  stepSim(sim);
  assert.ok(sim.items.some(i => i.id === 100), '異星生物は拾わない');
  runSim(sim, Math.ceil(PICKUP.life / TICK) + 2);
  assert.equal(sim.items.length, 0, '時間で消える');
});

const unit = (kind, extra = {}) => ({ side: 'ally', kind, hp: 50, maxHp: 50, atk: 10, captured: null, ...extra });

test('落とし物の武器: 候補は武器の枠だけ（修理・バリア・罠・妨害は出ない）', () => {
  for (let g = 0; g <= 50; g += 2) for (const [w] of weaponPool(g)) {
    assert.equal(w.slot, 'weapon', w.id);
    assert.ok(WEAPON_DROP.types.includes(w.type), `${w.id} ${w.type}`);
    assert.ok(w.type !== 'repair' && w.type !== 'barrier', w.id);
  }
  for (let i = 0; i < 200; i++) { const id = rollWeapon(8, i / 200); assert.ok(id); assert.equal(weaponById(id).slot, 'weapon'); }
});

test('落とし物の武器: いまの装備の格＋2 のあたりがいちばん出やすい・同じ乱数なら同じ', () => {
  const peak = 8 + WEAPON_DROP.above, pool = weaponPool(8);
  for (const [w, wt] of pool) assert.ok(Math.abs(w.tier - peak) < WEAPON_DROP.spread && wt > 0 && wt <= 1, w.id);
  const best = pool.reduce((a, b) => (b[1] > a[1] ? b : a));
  assert.equal(best[0].tier, peak, '山は 格＋2');
  // 1000 回引くと、格＋2±2 が半分以上
  let near = 0; const N = 1000;
  for (let i = 0; i < N; i++) if (Math.abs(weaponById(rollWeapon(8, (i + 0.5) / N)).tier - peak) <= 2) near++;
  assert.ok(near / N > 0.5, `近い格 ${near}/${N}`);
  assert.equal(rollWeapon(8, 0.37), rollWeapon(8, 0.37));
  // 格は生きている味方の武器の最大（PONCO は T8、ツギハギ T2）
  assert.equal(gearTier([unit('scav'), unit('ponco')]), 8);
  assert.equal(gearTier([unit('scav'), unit('ponco', { hp: 0 })]), 2);
  assert.equal(gearTier([unit('ponco', { side: 'enemy' })]), 0);
});

test('武器を拾う: 持てる種類で強ければ持ちかえ、攻撃力が上がる（上限あり）。弱い・持てない機体は保管だけ', () => {
  const p = unit('ponco');
  // PONCO（W2-01 T8）: 大砲（W2-03）は持てて強い → 持ちかえ、倍率は上限まで
  assert.ok(canEquip(p, weaponById('W2-03')));
  assert.deepEqual(applyItem(p, { type: 'weapon', weapon: 'W2-03' }), { equipped: true });
  assert.equal(p.weapon, 'W2-03');
  const m = weaponMul('ponco', weaponById('W2-03'));
  assert.ok(m > 1 && m <= WEAPON_DROP.maxMul); assert.equal(atkOf(p), 10 * m);
  // その後、より弱い武器は持ちかえない
  assert.deepEqual(applyItem(p, { type: 'weapon', weapon: 'W2-05' }), { equipped: false });
  assert.equal(p.weapon, 'W2-03');
  // 同じ強さ（元の武器）・弱い武器・持てない種類（近接）は持ちかえない
  const q = unit('ponco');
  assert.ok(!canEquip(q, weaponById('W2-01')), '同じ武器');
  assert.ok(!canEquip(q, weaponById('W1-05')), '弱い');
  assert.ok(!canEquip(q, weaponById('W2-02')), 'PONCO は近接を持たない');
  assert.ok(canEquip(q, weaponById('W2-05')), '少し強い銃');
  assert.ok(weaponMul('ponco', weaponById('W2-05')) < WEAPON_DROP.maxMul, '差が小さければ倍率も小さい');
  // ツギハギ・人は持たない（保管だけ）
  for (const k of ['scav', 'boy']) { const u = unit(k); assert.deepEqual(applyItem(u, { type: 'weapon', weapon: 'W2-03' }), { equipped: false }); assert.equal(u.weapon, undefined); assert.equal(atkOf(u), 10); }
});

test('持っている武器の一覧: かぶっても数を増やす（元の一覧は変えない）', () => {
  const a = addOwned({}, 'W2-03'), b = addOwned(a, 'W2-03'), c = addOwned(b, 'W1-06');
  assert.deepEqual(a, { 'W2-03': 1 }); assert.deepEqual(b, { 'W2-03': 2 }); assert.deepEqual(c, { 'W2-03': 2, 'W1-06': 1 });
  assert.deepEqual(addOwned(null, 'W1-04'), { 'W1-04': 1 });
});

test('撃ち合い: ビルを壊して武器が落ち、PONCO が拾って持ちかえ、その武器で撃つ', () => {
  // 武器が落ちる seed を探す（決まった結果なので、毎回同じ seed になる）
  let hit = null;
  for (let seed = 1; seed < 40 && !hit; seed++) {
    const d = duel('highrise', seed);
    for (let i = 0; i < 30 * 120 && !d.sim.items.length; i++) stepSim(d.sim);
    const it = d.sim.items[0];
    if (it?.type === 'weapon' && canEquip(d.a, weaponById(it.weapon))) hit = d;
  }
  assert.ok(hit, '武器が落ちる seed がある');
  const { sim, a } = hit, it = sim.items[0];
  const drop = sim.fx.find(f => f.type === 'drop');
  assert.equal(drop.weapon, it.weapon);
  const w = weaponById(it.weapon);
  assert.ok(Math.abs(w.tier - (8 + WEAPON_DROP.above)) < WEAPON_DROP.spread);
  a.x = it.x; a.y = it.y; const atk0 = atkOf(a);
  stepSim(sim);
  const got = sim.fx.find(f => f.type === 'pickup');
  assert.equal(got.weapon, it.weapon); assert.equal(got.name, w.name); assert.equal(got.unitKind, 'ponco');
  assert.equal(got.equipped, true); assert.equal(a.weapon, it.weapon);
  assert.ok(atkOf(a) > atk0);
  let shot = null;
  for (let i = 0; i < 30 * 3 && !shot; i++) { stepSim(sim); shot = sim.fx.find(f => f.type === 'shot' && f.t > got.t && f.from === a.id) || null; }
  assert.ok(shot, '撃った'); assert.equal(shot.weapon, it.weapon, '撃つ弾も拾った武器');
});

test('武器の強さの式: weapons.json の素の DPS と同じ', () => {
  assert.ok(Math.abs(weaponPower(weaponById('W2-01')) - 14.50) < 0.01);
  assert.ok(Math.abs(weaponPower(weaponById('W1-06')) - 49.13) < 0.01);
  assert.equal(WEAPONS.length, 68);
  assert.equal(WEAPONS.filter(w => !w.slot).length, 0, 'すべての行に slot');
});

test('遮蔽物は通り抜けられる（動きは遮蔽物のあるなしで同じ）', () => {
  const setup = { ally: [{ kind: 'scav', tx: 24, ty: 28 }], enemy: [] };
  const s1 = createSim({ seed: 2, setup, cover: [] }), s2 = createSim({ seed: 2, setup, cover: COVER_LAYOUT });
  for (const s of [s1, s2]) { issueOrder(s, [s.units[0].id], [{ tx: 24, ty: 20 }], { mode: 'rush' }); runSim(s, 30 * 15); }
  assert.ok(s2.units[0].y < 24 * 32, 'ビル残骸の足場を通って北へ');
  assert.equal(s1.units[0].x, s2.units[0].x); assert.equal(s1.units[0].y, s2.units[0].y);
});

test('遮蔽物ありのミッション: 同じ seed なら同じ結果', () => {
  const a = createSim({ seed: 9, mission: MISSION_1 }), b = createSim({ seed: 9, mission: MISSION_1 });
  for (const s of [a, b]) { issueOrder(s, s.units.filter(u => u.kind === 'ponco').map(u => u.id), [{ tx: 24, ty: 30 }]); runSim(s, 30 * 60); }
  assert.equal(hashSim(a), hashSim(b));
});
