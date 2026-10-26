// 高さ（js/sim/altitude.js, v0.4.7-dev）: 帯（空・地上・水中）、帯×帯で攻撃が届くかの表、遮蔽物と地形の守りの効き方、
// 浅瀬と深い水の通り方、水陸両用機が潜ること、今のミッションの結果が1つも変わらないこと。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { BAND, ALT, bandOf, unitBand, canHit, weaponTags, REACH, coverApplies, terrainDefApplies, altDistance, rangeVs,
  MOVE, MOVE_COST, DEFAULT_MOVES, moveCost, canMoveOn, settleZ, ALT_TEST_UNITS, carveDemoPond } from '../js/sim/altitude.js?v=1';
import { ALT_DEMO_SETUP, ALT_DEMO_POND, altDemoMapEdit } from '../js/sim/altitude-demo.js?v=2';
import * as S from '../js/sim/sim.js?v=27';
import * as M from '../js/sim/mission.js?v=10';
import { generateMap, passable, costAt, nearestPassable, TERRAIN, T, tileAt, toTile, tileCenter } from '../js/sim/map.js?v=6';
import { findPath } from '../js/sim/path.js?v=6';
import { weaponById } from '../js/sim/weapons.js?v=7';
import { runScenarios } from './fixtures/altitude-scenarios.mjs';

const at = (z, extra = {}) => ({ z, x: 0, y: 0, ...extra });
const SHOOT = { id: 'x-shoot', type: 'shoot' }, MELEE = { id: 'x-melee', type: 'melee' };
const TORPEDO = { id: 'x-t', type: 'shoot', tags: ['torpedo'] }, SHOCK = { id: 'x-s', type: 'melee', tags: ['shockwave'] };
const FIRE_TORP = { id: 'x-ft', type: 'shoot', tags: ['torpedo', 'fire'] };

test('高さ: 帯は z の数で決まる（0 より下は水中、ALT.airFrom 以上は空、ほかは地上・水面）', () => {
  assert.equal(bandOf(0), BAND.SURFACE);
  assert.equal(bandOf(-0.1), BAND.UNDERWATER);
  assert.equal(bandOf(ALT.airFrom - 0.1), BAND.SURFACE);
  assert.equal(bandOf(ALT.airFrom), BAND.AIR);
  assert.equal(unitBand({}), BAND.SURFACE, 'z を持たない物は地上');
  assert.equal(bandOf(ALT_TEST_UNITS.air.z), BAND.AIR);
  assert.equal(bandOf(ALT.diveZ), BAND.UNDERWATER);
  assert.equal(ALT.zDistanceK, 0, '今は z の差を距離に足さない');
  assert.equal(ALT.highGroundRangeK, 0, '高台の射程の上乗せはまだ 0');
});

test('高さ: 攻撃が届くかの表（仮）', () => {
  const G = at(0), A = at(40), U = at(-14);
  // 同じ地上どうしは今までどおり（どの武器でも、武器なしでも）
  for (const w of [SHOOT, MELEE, null]) assert.equal(canHit(G, G, w), true);
  // 地上 → 空: 遠距離だけ。近接は届かない
  assert.equal(canHit(G, A, SHOOT), true);
  assert.equal(canHit(G, A, { type: 'cannon' }), true);
  assert.equal(canHit(G, A, MELEE), false);
  // 空 → 地上: 届く（近接も）
  assert.equal(canHit(A, G, SHOOT), true);
  assert.equal(canHit(A, G, MELEE), true);
  assert.equal(canHit(A, A, MELEE), true);
  // 水中の相手には魚雷か衝撃波だけ
  assert.equal(canHit(G, U, SHOOT), false);
  assert.equal(canHit(G, U, TORPEDO), true);
  assert.equal(canHit(G, U, SHOCK), true);
  assert.equal(canHit(A, U, SHOOT), false);
  assert.equal(canHit(A, U, TORPEDO), true);
  // 水中 → 地上・水面: 魚雷だけ。衝撃波・銃は届かない。水中 → 空は届かない（仮）
  assert.equal(canHit(U, G, TORPEDO), true);
  assert.equal(canHit(U, G, SHOCK), false);
  assert.equal(canHit(U, G, SHOOT), false);
  assert.equal(canHit(U, A, TORPEDO), false);
  // 水中どうし: 届く。ただし火は水中では使えない
  assert.equal(canHit(U, U, SHOOT), true);
  assert.equal(canHit(U, U, FIRE_TORP), false);
  // 表は 3×3 そろっている
  for (const a of Object.values(BAND)) for (const b of Object.values(BAND)) assert.ok(REACH[a][b] !== undefined, `${a}→${b}`);
});

test('高さ: 武器のタグ（種類から遠距離・近接、名簿の id から魚雷・衝撃波）', () => {
  assert.ok(weaponTags(weaponById('W1-02')).includes('ranged'));
  assert.ok(weaponTags(weaponById('W3-03')).includes('melee'));
  const t = weaponById('W3-12'), s = weaponById('W3-13');
  if (t) assert.ok(weaponTags(t).includes('torpedo'));
  if (s) assert.ok(weaponTags(s).includes('shockwave'));
  assert.deepEqual(weaponTags(null), []);
});

test('高さ: 遮蔽物と森・山の守りは空の相手には効かない', () => {
  const G = at(0), A = at(40), U = at(-14);
  assert.equal(coverApplies(G, G), true);
  assert.equal(coverApplies(A, G), true, '空から地上を撃っても、地上の相手の遮蔽物は効く（仮）');
  assert.equal(coverApplies(G, A), false);
  assert.equal(coverApplies(A, A), false);
  assert.equal(coverApplies(G, U), false);
  assert.equal(terrainDefApplies(G), true);
  assert.equal(terrainDefApplies(A), false);
  // 距離・射程: 係数 0 の今は平面の距離・元の射程のまま
  assert.equal(altDistance(at(0, { x: 3, y: 4 }), at(40)), 5);
  assert.equal(rangeVs(A, G, 112), 112);
});

test('高さ: 戦闘でも遮蔽物は空の相手に効かない（同じ位置・同じ種で、空の相手だけ遮蔽物で止まらない）', () => {
  const run = z => {
    const sim = S.createSim({ seed: 3, setup: { ally: [{ kind: 'gunner', tx: 10, ty: 30 }], enemy: [{ kind: 'gunner', tx: 10, ty: 27, role: 'guard', count: 1 }] }, cover: [{ kind: 'ruins', x: 10 * 32 + 16, y: 28.5 * 32 }] });
    const a = sim.units.find(u => u.side === 'ally'), e = sim.units.find(u => u.side === 'enemy');
    a.speed = e.speed = 0; e.atk = 0; e.hp = e.maxHp = 1e6; e.z = z;
    a.x = tileCenter(10); a.y = tileCenter(30); e.x = tileCenter(10); e.y = tileCenter(27);
    S.runSim(sim, 30 * 40);
    return { dmg: 1e6 - e.hp, coverHp: sim.cover[0]?.hp };
  };
  const ground = run(0), air = run(40);
  assert.ok(air.dmg > 0, '空の相手に弾が届く');
  assert.ok(air.dmg > ground.dmg, `空の相手は遮蔽物で止まらない（地上 ${ground.dmg} / 空 ${air.dmg}）`);
});

test('高さ: 近接の機体は空の相手を狙わない・撃たれない側から一方的に撃てる', () => {
  const sim = S.createSim({ seed: 1, setup: { ally: [{ kind: 'gunner', tx: 12, ty: 30, ...ALT_TEST_UNITS.air }], enemy: [{ kind: 'alien', tx: 12, ty: 31, role: 'guard', count: 1 }] } });
  const a = sim.units.find(u => u.side === 'ally'), e = sim.units.find(u => u.side === 'enemy');
  a.speed = 0; e.speed = 0; const hp0 = a.hp, ehp0 = e.hp;
  S.runSim(sim, 30 * 10);
  assert.equal(a.hp, hp0, '異星生物の近接は空に届かない');
  assert.ok(e.hp < ehp0, '空から地上へは撃てる');
});

test('高さ: 地形の通り方（深い水は既定の機体は入れない・浅瀬はだれでも入れる・空は全部の上を同じ速さで）', () => {
  const W = 'water', SH = 'shallow';
  assert.equal(canMoveOn(W, DEFAULT_MOVES), false, '今の機体は深い水に入れない');
  assert.equal(canMoveOn(SH, DEFAULT_MOVES), true, '浅瀬はだれでも入れる');
  assert.ok(moveCost(SH, DEFAULT_MOVES) > moveCost('plain', DEFAULT_MOVES), '浅瀬は少し重い');
  assert.equal(canMoveOn(W, [MOVE.GROUND, MOVE.UNDERWATER]), true, '水陸両用機は深い水に入れる');
  assert.equal(moveCost('mountain', [MOVE.AIR]), 1);
  // 地上の動き方の値は map.js の TERRAIN の cost と同じ（既定の機体の速さが変わらない）
  for (const t of TERRAIN) {
    const g = MOVE_COST[t.key]?.[MOVE.GROUND];
    assert.equal(g ?? Infinity, t.cost, t.key);
  }
  // map.js: moves を渡さなければ今までどおり
  const map = generateMap(7);
  carveDemoPond(map, T, ALT_DEMO_POND.tx, ALT_DEMO_POND.ty);
  const { tx, ty } = ALT_DEMO_POND;
  assert.equal(tileAt(map, tx, ty), T.WATER);
  assert.equal(passable(map, tx, ty), false);
  assert.equal(passable(map, tx, ty, [MOVE.GROUND, MOVE.UNDERWATER]), true);
  assert.equal(passable(map, tx, ty, [MOVE.AIR]), true);
  const shTx = tx + 5;
  assert.equal(tileAt(map, shTx, ty), T.SHALLOW);
  assert.equal(passable(map, shTx, ty), true);
  assert.equal(costAt(map, shTx, ty), 1.8);
});

test('高さ: 道を探す（既定の機体は深い水をよけ、水陸両用機は突っ切る）', () => {
  const map = generateMap(7); altDemoMapEdit(map);
  const { tx, ty } = ALT_DEMO_POND;
  const g = findPath(map, tx - 7, ty, tx + 7, ty), w = findPath(map, tx - 7, ty, tx + 7, ty, [MOVE.GROUND, MOVE.UNDERWATER]);
  assert.ok(g && w);
  assert.ok(!g.some(p => tileAt(map, p.tx, p.ty) === T.WATER), '既定の機体の道に深い水はない');
  assert.ok(w.some(p => tileAt(map, p.tx, p.ty) === T.WATER), '水陸両用機は深い水を通る');
});

test('高さ: 水陸両用機は深い水に入ると潜り（z<0）、陸・浅瀬に上がると z=0 に戻る', () => {
  assert.equal(settleZ({ z: 0, moves: [MOVE.GROUND, MOVE.UNDERWATER] }, 'water'), ALT.diveZ);
  assert.equal(settleZ({ z: ALT.diveZ, moves: [MOVE.GROUND, MOVE.UNDERWATER] }, 'shallow'), 0);
  assert.equal(settleZ({ z: 40, moves: [MOVE.AIR] }, 'water'), 40, '空の機体はそのまま');
  const sim = S.createSim({ seed: 1, setup: ALT_DEMO_SETUP, mapEdit: altDemoMapEdit });
  const amph = sim.units.find(u => u.label === '水中テスト機'), air = sim.units.find(u => u.label === '空テスト機');
  assert.ok(amph && air);
  assert.ok(amph.z < 0 && tileAt(sim.map, toTile(amph.x), toTile(amph.y)) === T.WATER, '深い水の上に置かれて潜っている');
  assert.equal(unitBand(air), BAND.AIR);
  S.issueOrder(sim, [amph.id], [{ tx: ALT_DEMO_POND.tx - 9, ty: ALT_DEMO_POND.ty }]);
  S.runSim(sim, 30 * 25);
  assert.equal(tileAt(sim.map, toTile(amph.x), toTile(amph.y)) === T.WATER, false, '陸へ上がった');
  assert.equal(amph.z, 0);
  // 既定の機体は z=0・地上だけのまま
  for (const u of sim.units) if (u !== amph && u !== air) { assert.equal(u.z, 0); assert.equal(u.moves, DEFAULT_MOVES); }
});

test('高さ: 本編のマップ生成に浅瀬は置かない・本編のミッションにお試しの機体はいない', () => {
  for (const seed of [1, 2, 3, 7, 11, 42]) assert.ok(!generateMap(seed).tiles.includes(T.SHALLOW), `map ${seed}`);
  const sim = S.createSim({ seed: 1, mission: M.MISSION_1 });
  for (const u of sim.units) { assert.equal(u.z, 0); assert.equal(u.moves, DEFAULT_MOVES); }
  assert.ok(!JSON.stringify(M.MISSION_1).includes('テスト機'));
});

test('高さ: 入れる前と結果が1つも変わらない（seed 固定のシナリオのハッシュ・勝敗・残り機体）', () => {
  const base = JSON.parse(readFileSync(fileURLToPath(new URL('./fixtures/altitude-baseline.json', import.meta.url)), 'utf8')).scenarios;
  const now = runScenarios(S, M);
  assert.deepEqual(Object.keys(now).sort(), Object.keys(base).sort());
  for (const k of Object.keys(base)) assert.deepEqual(now[k], base[k], k);
});
