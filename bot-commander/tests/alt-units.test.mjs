// 飛ぶ機体と水陸両用機（js/sim/alt-units.js, ?altunits=1 のお試し）: 種類・動ける所・帯・撃てる撃てない・毎回同じ結果・本編に出ないこと。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { BAND, unitBand, canHit, canMoveOn, MOVE, ALT, DEFAULT_MOVES } from '../js/sim/altitude.js?v=1';
import { ALT_KINDS, ALT_KIND_WEAPON, ALT_UNIT_LOOK, ALT_SUBMERGED_WEAPON, ALT_IN_MISSIONS, ALT_MISSION_ROWS, withAltUnits } from '../js/sim/alt-units.js?v=3';
import { ALT_UNITS_SETUP, ALT_DEMO_POND, altUnitsMapEdit } from '../js/sim/alt-units-demo.js?v=3';
import * as S from '../js/sim/sim.js?v=27';
import * as M from '../js/sim/mission.js?v=10';
import { generateMap, passable, tileAt, toTile, T } from '../js/sim/map.js?v=6';
import { weaponById, KIND_WEAPON } from '../js/sim/weapons.js?v=7';

const fresh = () => S.createSim({ seed: 1, mapSeed: 7, setup: ALT_UNITS_SETUP, mapEdit: altUnitsMapEdit });
const by = (sim, kind) => sim.units.find(u => u.kind === kind);

test('2つの機体: KINDS に入り、今の種類の数値は変わらない', () => {
  assert.equal(S.KINDS.flyer.name, 'スカイポンコ（仮）');
  assert.equal(S.KINDS.amph.name, 'アビスポンコ（仮）');
  assert.deepEqual(S.KINDS.ponco, { name: 'PONCO02', short: 'PONCO', hp: 120, atk: 10, range: 112, cooldown: 0.9, speed: 20, sight: 4.5, gather: 0.1 });
  assert.equal(S.KINDS.alien.hp, 360);
  assert.ok(Object.isFrozen(S.KINDS));
  for (const k of Object.keys(ALT_KINDS)) {
    assert.equal(KIND_WEAPON[k], ALT_KIND_WEAPON[k]);
    assert.ok(weaponById(KIND_WEAPON[k]), `${k} の武器がある`);
    assert.ok(ALT_UNIT_LOOK[k].art && ALT_UNIT_LOOK[k].tint, `${k} の絵（gfx3）`);
  }
});

test('2つの機体: 帯と動き方（飛ぶ機体は空・水陸両用機は地上で深い水に潜る）', () => {
  const sim = fresh(), f = by(sim, 'flyer'), a = by(sim, 'amph');
  assert.ok(f && a);
  assert.equal(unitBand(f), BAND.AIR); assert.equal(f.z, ALT.demoAirZ); assert.deepEqual([...f.moves], [MOVE.AIR]);
  assert.deepEqual([...a.moves], [MOVE.GROUND, MOVE.UNDERWATER]);
  assert.equal(tileAt(sim.map, toTile(a.x), toTile(a.y)), T.WATER, '深い水に置かれている');
  assert.equal(unitBand(a), BAND.UNDERWATER); assert.equal(a.z, ALT.diveZ);
  for (const u of sim.units) if (u !== f && u !== a) { assert.equal(u.z, 0); assert.equal(u.moves, DEFAULT_MOVES); }
});

test('2つの機体: 深い水は飛ぶ機体と水陸両用機だけ。浅瀬はみんな通れる', () => {
  const map = generateMap(7); altUnitsMapEdit(map);
  const { tx, ty } = ALT_DEMO_POND, shTx = tx + 5;
  assert.equal(tileAt(map, tx, ty), T.WATER); assert.equal(tileAt(map, shTx, ty), T.SHALLOW);
  const f = ALT_KINDS.flyer.moves, a = ALT_KINDS.amph.moves;
  assert.equal(passable(map, tx, ty), false, 'ふつうの機体は深い水に入れない');
  assert.equal(passable(map, tx, ty, f), true); assert.equal(passable(map, tx, ty, a), true);
  for (const m of [undefined, f, a]) assert.equal(passable(map, shTx, ty, m), true, '浅瀬はみんな');
  assert.equal(canMoveOn('mountain', f), true); assert.equal(canMoveOn('forest', f), true);
  assert.equal(canMoveOn('mountain', a), true, '水陸両用機の地上の動き方は今のまま（山は重いが通れる）');
});

test('2つの機体: 動かすと、飛ぶ機体は深い水の上を越え、水陸両用機は陸へ上がると z=0、ふつうの機体は水をよける', () => {
  const sim = fresh(), f = by(sim, 'flyer'), a = by(sim, 'amph'), p = by(sim, 'ponco');
  const { tx, ty } = ALT_DEMO_POND;
  S.issueOrder(sim, [f.id], [{ tx: tx - 8, ty }, { tx: tx + 8, ty }], { mode: 'rush' });
  S.issueOrder(sim, [p.id], [{ tx: tx + 8, ty: ty + 4 }], { mode: 'rush' });
  S.issueOrder(sim, [a.id], [{ tx: tx - 9, ty }]);
  let overWater = false, pWater = false;
  for (let i = 0; i < 30 * 40; i++) {
    S.stepSim(sim);
    if (tileAt(sim.map, toTile(f.x), toTile(f.y)) === T.WATER) overWater = true;
    if (tileAt(sim.map, toTile(p.x), toTile(p.y)) === T.WATER) pWater = true;
  }
  assert.equal(overWater, true, '飛ぶ機体は深い水の上を通った');
  assert.equal(f.z, ALT.demoAirZ, '空のまま');
  assert.equal(pWater, false, 'ふつうの機体は深い水に入らない');
  assert.equal(tileAt(sim.map, toTile(a.x), toTile(a.y)) === T.WATER, false, '水陸両用機は陸へ上がった');
  assert.equal(a.z, 0);
});

test('2つの機体: だれがだれを撃てるか（canHit の表のまま）', () => {
  const sim = fresh(), f = by(sim, 'flyer'), a = by(sim, 'amph'), p = by(sim, 'ponco'), al = by(sim, 'alien');
  const w = u => S.unitWeaponInfo(u)?.row;
  assert.equal(canHit(f, p, w(f)), true, '飛ぶ機体 → 地上の味方');
  assert.equal(canHit(f, al, w(f)), true, '飛ぶ機体 → 異星生物');
  assert.equal(canHit(al, f, w(al)), false, '異星生物（近接）→ 飛ぶ機体は届かない');
  assert.equal(canHit(p, f, w(p)), true, '地上の射撃 → 飛ぶ機体');
  assert.equal(S.unitWeaponInfo(a).row.id, ALT_SUBMERGED_WEAPON.amph, 'v1.0.0: 潜っている間は魚雷（W3-12）');
  assert.equal(canHit(a, p, w(a)), true, '潜った水陸両用機 → 地上（水面）は魚雷で届く');
  assert.equal(canHit(a, f, w(a)), false, '潜った水陸両用機 → 空は届かない');
  assert.equal(canHit(p, a, w(p)), false, '地上の射撃 → 潜った水陸両用機は届かない');
  assert.equal(canHit(f, a, w(f)), false, '飛ぶ機体 → 潜った水陸両用機');
  assert.equal(canHit(al, a, w(al)), false, '異星生物 → 潜った水陸両用機');
  assert.equal(canHit(f, f, w(f)), true);
  // v1.0.0: 潜った水陸両用機どうし（水中の相手）は魚雷で撃てる
  const a2 = { ...a, id: 999 };
  assert.equal(canHit(a, a2, w(a)), true, '潜った水陸両用機 → 水中の相手');
  a.z = 0; // 陸に上がれば、ふつうの地上の機体と同じ
  assert.equal(S.unitWeaponInfo(a).row.id, 'W2-01', '陸ではいつものライフル');
  assert.equal(canHit(a, p, w(a)), true); assert.equal(canHit(a, al, w(a)), true); assert.equal(canHit(al, a, w(al)), true);
  assert.equal(canHit(a, f, w(a)), true, '地上の射撃 → 空は届く');
});

test('お試しの作りは毎回同じ結果（同じ seed・同じ命令で同じハッシュ）', () => {
  const run = () => {
    const sim = fresh(), f = by(sim, 'flyer'), a = by(sim, 'amph'), { tx, ty } = ALT_DEMO_POND;
    S.issueOrder(sim, [f.id], [{ tx: tx - 8, ty }, { tx: tx + 8, ty }]);
    S.issueOrder(sim, [a.id], [{ tx: tx + 9, ty }]);
    S.runSim(sim, 30 * 40);
    return S.hashSim(sim);
  };
  assert.equal(run(), run());
});

test('本編のミッションには2つの機体は出ない・普通の始まりは変わらない', () => {
  const sim = S.createSim({ seed: 1, mission: M.MISSION_1 });
  assert.ok(!sim.units.some(u => u.kind === 'flyer' || u.kind === 'amph'));
  assert.ok(!JSON.stringify(M.MISSION_1).includes('flyer') && !JSON.stringify(M.MISSION_1).includes('amph'));
  const html = readFileSync(fileURLToPath(new URL('../js/index.js?v=1', import.meta.url)), 'utf8');
  assert.ok(html.includes("params.get('altunits') === '1'") && html.includes("params.get('altdemo') === '1'"), '両方のお試しの入口がある');
});
