// 飛ぶ機体の燃料（js/sim/fuel.js, v1.0.0）: 空で減る・重いほど早い・0 で降りてためる・また飛ぶ・深い水では浮いて動けない。
// 本編のミッションの機体には何も足さないこと。届かない印（targeting.js の unreachableTarget）と、本編に出すスイッチ（alt-units.js）も。
import test from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../js/sim/sim.js?v=27';
import * as M from '../js/sim/mission.js?v=10';
import * as F from '../js/sim/fuel.js?v=1';
import { ALT, BAND, unitBand } from '../js/sim/altitude.js?v=1';
import { ALT_UNITS_SETUP, altUnitsMapEdit } from '../js/sim/alt-units-demo.js?v=3';
import { ALT_IN_MISSIONS, ALT_MISSION_ROWS, withAltUnits } from '../js/sim/alt-units.js?v=3';
import { unreachableTarget } from '../js/sim/targeting.js?v=2';
import { tileAt, toTile, T, tileCenter } from '../js/sim/map.js?v=6';

const fresh = () => {
  const sim = S.createSim({ seed: 1, mapSeed: 7, setup: ALT_UNITS_SETUP, mapEdit: altUnitsMapEdit });
  sim.units = sim.units.filter(u => u.side === 'ally'); sim.groups = []; // 敵なしの静かな場面
  return sim;
};
const flyerOf = sim => sim.units.find(u => u.kind === 'flyer');
const steps = sec => Math.round(sec * 30);

test('表: 飛ぶ機体だけが燃料を持つ。本編のミッションの機体には燃料のプロパティを足さない', () => {
  assert.ok(F.FUEL_TABLE.flyer); assert.equal(F.FUEL_TABLE.amph, undefined);
  const sim = S.createSim({ seed: 1, mission: M.MISSION_1 }); S.runSim(sim, 200);
  for (const u of sim.units) { assert.equal('fuel' in u, false); assert.equal(F.fuelRatio(u), null); }
});

test('空にいる間に減る。重いほど（武器・乗っている人）早く減る', () => {
  const sim = fresh(), f = flyerOf(sim);
  S.runSim(sim, 1);
  assert.equal(f.fuel <= f.fuelMax, true); assert.equal(unitBand(f), BAND.AIR);
  const w0 = F.fuelWeight(sim, f);
  assert.equal(w0, 1, 'ライフル1つ');
  const d0 = F.fuelDrain(sim, f);
  assert.equal(F.fuelWeight(sim, { ...f, loadoutFx: { guns: [{}, {}] } }), 3, '武器を2つ足すと重さ 3');
  assert.ok(F.fuelDrain(sim, { ...f, loadoutFx: { guns: [{}, {}] } }) > d0, '重いほど早く減る');
  const rideSim = { ...sim, ride: {}, units: [...sim.units, { id: -1, human: true, ride: { host: f.id, mode: 'back', phase: 'on' } }] };
  assert.equal(F.fuelWeight(rideSim, f), 2, '乗っている人も重さ');
  // 実際に 5 秒で減る量: 軽い・重い
  const light = fresh(), lf = flyerOf(light); S.runSim(light, 1); const a0 = lf.fuel; for (let i = 0; i < steps(5); i++) F.stepFuel(light, 1 / 30, () => false);
  const heavy = fresh(), hf = flyerOf(heavy); S.runSim(heavy, 1); hf.loadoutFx = { guns: [{}, {}] }; const b0 = hf.fuel; for (let i = 0; i < steps(5); i++) F.stepFuel(heavy, 1 / 30, () => false); // 燃料の計算だけを回す
  assert.ok((b0 - hf.fuel) > (a0 - lf.fuel) * 1.2, `重いほうが減る（軽い ${(a0 - lf.fuel).toFixed(2)} / 重い ${(b0 - hf.fuel).toFixed(2)}）`);
});

test('0 になると降りて（地上の帯）動けずにためる。いっぱいになるとまた飛ぶ', () => {
  const sim = fresh(), f = flyerOf(sim);
  S.runSim(sim, 1); f.fuel = 0.01;
  const tx = toTile(f.x) - 3, ty = toTile(f.y);
  S.runSim(sim, 2);
  assert.equal(F.isRefueling(f), true); assert.equal(f.z, 0); assert.equal(unitBand(f), BAND.SURFACE);
  assert.ok(sim.fx.some(e => e.type === 'fuelOut' && e.id === f.id));
  S.issueOrder(sim, f.id, [{ tx, ty }]);
  const x0 = f.x, y0 = f.y;
  S.runSim(sim, steps(F.FUEL_TABLE.flyer.rechargeSec * 0.5));
  assert.ok(Math.hypot(f.x - x0, f.y - y0) < 1, 'ためている間は動けない');
  assert.ok(f.fuel > 0 && f.fuel < f.fuelMax);
  S.runSim(sim, steps(F.FUEL_TABLE.flyer.rechargeSec * 0.6));
  assert.equal(F.isRefueling(f), false, 'ためおわった');
  assert.equal(f.z, ALT.demoAirZ, 'また飛ぶ'); assert.equal(unitBand(f), BAND.AIR);
  S.runSim(sim, 60);
  assert.ok(Math.hypot(f.x - x0, f.y - y0) > 4, 'また動ける');
});

test('深い水の上で切れると、水面に浮いて動けない（ためおわれば飛ぶ）', () => {
  const sim = fresh(), f = flyerOf(sim);
  S.runSim(sim, 1);
  // 深い水のマスへ置く
  let spot = null;
  for (let ty = 0; ty < sim.map.h && !spot; ty++) for (let tx = 0; tx < sim.map.w && !spot; tx++) if (tileAt(sim.map, tx, ty) === T.WATER) spot = { tx, ty };
  assert.ok(spot, '池に深い水がある');
  f.x = tileCenter(spot.tx); f.y = tileCenter(spot.ty); f.order = null; f.fuel = 0.01;
  S.runSim(sim, 2);
  assert.equal(f.fuelDown, true); assert.equal(f.fuelFloat, true, '浮いている'); assert.equal(f.z, 0);
  const x0 = f.x, y0 = f.y; S.issueOrder(sim, f.id, [{ tx: spot.tx + 3, ty: spot.ty }]);
  S.runSim(sim, 60);
  assert.ok(Math.hypot(f.x - x0, f.y - y0) < 1, '浮いている間は動けない');
  S.runSim(sim, steps(F.FUEL_TABLE.flyer.rechargeSec + 1));
  assert.equal(f.fuelFloat, false); assert.equal(unitBand(f), BAND.AIR);
});

test('毎回同じ結果（燃料が切れる長い時間を回しても同じハッシュ）', () => {
  const run = () => { const sim = S.createSim({ seed: 2, mapSeed: 7, setup: ALT_UNITS_SETUP, mapEdit: altUnitsMapEdit }); S.runSim(sim, steps(45)); return S.hashSimDeep(sim); };
  assert.equal(run(), run());
});

test('届かない印: 敵の見える範囲に、届かない帯（空）の味方しかいない時だけ出る。地上の味方がいれば出ない', () => {
  const sim = S.createSim({ seed: 1, mapSeed: 7, setup: ALT_UNITS_SETUP, mapEdit: altUnitsMapEdit });
  const row = u => S.unitWeaponInfo(u)?.row ?? null;
  const e = sim.units.find(u => u.kind === 'alien'), f = flyerOf(sim);
  sim.units = sim.units.filter(u => u === e || u === f);
  f.x = e.x + 40; f.y = e.y; e.targetId = null;
  assert.equal(unreachableTarget(sim, e, row), f, '近接の異星生物は空に届かない');
  const p = S.createSim({ seed: 1, mapSeed: 7, setup: ALT_UNITS_SETUP, mapEdit: altUnitsMapEdit }).units.find(u => u.kind === 'ponco');
  p.x = e.x - 30; p.y = e.y; sim.units.push(p);
  assert.equal(unreachableTarget(sim, e, row), null, '届く相手がいれば出ない');
  // 本編のミッション（全員地上）では出ない
  const m = S.createSim({ seed: 1, mission: M.MISSION_1 }); S.runSim(m, 300);
  for (const u of m.units) assert.equal(unreachableTarget(m, u, row), null);
});

test('本編に出すスイッチ: 今は全部 false で MISSION_1 はそのまま。true にすると味方に足される', () => {
  assert.deepEqual({ ...ALT_IN_MISSIONS }, { flyer: false, amph: false });
  assert.equal(withAltUnits(M.MISSION_1, ALT_MISSION_ROWS), M.MISSION_1, '今は元のまま（同じもの）');
  const on = withAltUnits(M.MISSION_1, ALT_MISSION_ROWS, { flyer: true });
  assert.equal(on.ally.length, M.MISSION_1.ally.length + 1); assert.equal(on.ally[0].kind, 'flyer', '先頭に足す（枠を超えた分はうしろが控え）');
  const sim = S.createSim({ seed: 1, mission: on });
  const f = sim.units.find(u => u.kind === 'flyer');
  assert.ok(f, '飛ぶ機体が出る'); assert.equal(unitBand(f), BAND.AIR);
  S.runSim(sim, 300);
  for (const u of sim.units) assert.ok(Number.isFinite(u.x) && Number.isFinite(u.hp));
});
