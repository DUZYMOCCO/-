// 演出（fx）と当たった時の反応（よろけ・押し）のテスト
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { create } from '../js/fx/fx.js?v=2';
import { classify, hitReact, reactStep } from '../js/fx/react.js?v=2';
import { WEAPONS, KIND_WEAPON } from '../js/sim/weapons.js?v=7';
import { spawnFxEvents, FX_SHAKE_MAX, FX_STOP_W } from '../js/render/fx-events.js?v=16';
import { createSim, stepSim, runSim, issueOrder, pushUnit, isStunned, weaponInfo, massOf, TICK } from '../js/sim/sim.js?v=29';
import { T, setTile, tileCenter, toTile, TILE } from '../js/sim/map.js?v=6';

const run = (fx, sec, dt = 1 / 60) => { let stopped = 0, maxShake = 0; for (let t = 0; t < sec; t += dt) { if (fx.update(dt) === 0) stopped++; maxShake = Math.max(maxShake, Math.hypot(...fx.shake)); } return { stopped, maxShake }; };
const view = (on = 1) => ({ onScreen: () => on, visible: () => true, px: () => 40 });
const EMPTY = { ally: [], enemy: [] };

test('武器表: 68行・どの系統も演出が出る', () => {
  assert.equal(WEAPONS.length, 68);
  const fams = new Map();
  for (const r of WEAPONS) { const k = classify(r).kind; if (!fams.has(k)) fams.set(k, r); }
  assert.ok(fams.size >= 10, `系統 ${[...fams.keys()]}`);
  for (const [k, r] of fams) {
    const fx = create({ max: 1200, shakeMax: FX_SHAKE_MAX });
    fx.fromWeapon(r, 0, 0, 160, 0, { surface: 'armor', medium: 'land', gy: 10 });
    run(fx, 1.5);
    const s = fx.stats();
    assert.ok(s.spawned > 0 || s.peak > 0, `${k}（${r.id} ${r.name}）で粒が出ない`);
  }
});

test('ゲームの全機種: 撃つと演出が出る・倒れると撃破の演出', () => {
  for (const kind of Object.keys(KIND_WEAPON)) {
    const fx = create({ max: 1200, shakeMax: FX_SHAKE_MAX });
    const sim = { fx: [
      { type: 'shot', side: 'ally', kind, x1: 0, y1: 0, x2: 150, y2: 0, toKind: kind === 'alien' ? 'gunner' : 'alien', toSide: 'enemy' },
      { type: 'boom', side: 'enemy', kind, x: 150, y: 0 },
    ] };
    spawnFxEvents(fx, sim, new WeakSet(), view());
    run(fx, 1);
    assert.ok(fx.stats().spawned > 20, kind);
  }
  const fx = create();
  spawnFxEvents(fx, { fx: [{ type: 'shot', side: 'enemy', kind: 'alien', x1: 0, y1: 0, x2: 40, y2: 0, toKind: 'boy', toSide: 'ally' }] }, new WeakSet(), view());
  run(fx, 0.5);
  assert.ok(fx.stats().spawned > 0, '人が撃たれた演出');
});

test('同じ出来事は1回だけ・霧の中の敵どうしと画面の外は出さない', () => {
  const fx = create(), seen = new WeakSet(), e = { type: 'shot', side: 'enemy', kind: 'alien', x1: 0, y1: 0, x2: 40, y2: 0, toKind: 'alien', toSide: 'enemy' };
  spawnFxEvents(fx, { fx: [e] }, seen, { ...view(), visible: () => false });
  spawnFxEvents(fx, { fx: [{ ...e, side: 'ally' }] }, seen, view(0));
  assert.equal(fx.stats().spawned, 0);
  spawnFxEvents(fx, { fx: [e] }, seen, view()); // seen に入っているので出ない
  assert.equal(fx.stats().spawned, 0);
});

test('止め（hit-stop）: 重い一撃で update が 0 を返す・許されていない時は止まらない', () => {
  const giant = weaponInfo('giant');
  assert.ok(giant.w >= FX_STOP_W);
  const a = create({ shakeMax: FX_SHAKE_MAX });
  a.fromWeapon(giant.row, 0, 0, 100, 0, { surface: 'armor', gy: 10, gate: { shake: 1, stop: true } });
  const ra = run(a, 2);
  assert.ok(ra.stopped > 0, '止まる');
  assert.ok(ra.maxShake > 0 && ra.maxShake <= FX_SHAKE_MAX + 1e-9, `ゆれ ${ra.maxShake}`);
  const b = create({ shakeMax: FX_SHAKE_MAX });
  b.fromWeapon(giant.row, 0, 0, 100, 0, { surface: 'armor', gy: 10, gate: { shake: 0, stop: false } });
  const rb = run(b, 2);
  assert.equal(rb.stopped, 0); assert.equal(rb.maxShake, 0);
  // ゲーム側の判断: 味方がからむ重い一撃だけ止める。軽い弾・敵どうしは止めない
  const stops = ev => { const fx = create({ shakeMax: FX_SHAKE_MAX }); spawnFxEvents(fx, { fx: [ev] }, new WeakSet(), view()); return run(fx, 2).stopped; };
  const shot = (kind, side, toSide) => ({ type: 'shot', side, kind, x1: 0, y1: 0, x2: 120, y2: 0, toKind: 'gunner', toSide });
  assert.ok(stops(shot('giant', 'ally', 'enemy')) > 0);
  assert.equal(stops(shot('ponco', 'ally', 'enemy')), 0);
  assert.equal(stops(shot('giant', 'enemy', 'enemy')), 0);
});

test('ゆれ: 一度にたくさん当たっても、いちばん強い1つ分まで・上限 px を超えない', () => {
  const one = create({ shakeMax: 99 }), many = create({ shakeMax: 99 }), capped = create({ shakeMax: FX_SHAKE_MAX });
  const row = weaponInfo('heavy').row;
  one.fromWeapon(row, 0, 0, 100, 0, { gy: 10 });
  for (let i = 0; i < 12; i++) { many.fromWeapon(row, 0, 0, 100 + i, 0, { gy: 10 }); capped.fromWeapon(row, 0, 0, 100 + i, 0, { gy: 10 }); }
  const r1 = run(one, 2), rn = run(many, 2), rc = run(capped, 2);
  assert.ok(rn.maxShake <= r1.maxShake * 1.05 + 0.01, `${rn.maxShake} vs ${r1.maxShake}`);
  assert.ok(rc.maxShake <= FX_SHAKE_MAX + 1e-9);
  // 画面の端の出来事は弱く
  const far = create({ shakeMax: 99 }); far.fromWeapon(row, 0, 0, 100, 0, { gy: 10, gate: { shake: 0.3, stop: false } });
  assert.ok(run(far, 2).maxShake < r1.maxShake);
});

test('粒の上限: 1200（low は 600）を超えない', () => {
  for (const max of [1200, 600]) {
    const fx = create({ max });
    for (let i = 0; i < 80; i++) fx.hit('robotDeath', i * 5, 0, { gy: 10, big: 2 });
    run(fx, 1);
    assert.ok(fx.stats().peak <= max, `${fx.stats().peak} > ${max}`);
  }
});

function duel() {
  const sim = createSim({ setup: { ally: [{ kind: 'ponco', tx: 20, ty: 50, count: 1 }], enemy: [{ kind: 'gunner', tx: 21, ty: 50, count: 1 }] } });
  const a = sim.units.find(u => u.side === 'ally'), e = sim.units.find(u => u.side === 'enemy');
  for (let x = 17; x <= 24; x++) for (let y = 47; y <= 53; y++) setTile(sim.map, x, y, T.PLAIN);
  a.x = tileCenter(20); a.y = tileCenter(50); e.x = tileCenter(21); e.y = tileCenter(50);
  e.hp = e.maxHp = 1e6; a.hp = a.maxHp = 1e6;
  return { sim, a, e };
}

test('よろけ中は撃たない・動かない、終われば戻る', () => {
  const { sim, a, e } = duel();
  a.cd = 0;
  hitReact(a, { w: 1, dir: 0, mass: 1, kind: 'explosion' });
  assert.ok(isStunned(a), '当たったその場から');
  issueOrder(sim, [a.id], [{ x: tileCenter(18), y: tileCenter(50) }]);
  const shotsBy = () => sim.fx.filter(f => f.type === 'shot' && f.side === 'ally').length;
  let stunnedSteps = 0, moved = 0;
  while (isStunned(a) || stunnedSteps === 0) {
    const x = a.x, y = a.y; stepSim(sim); stunnedSteps++;
    if (isStunned(a)) { assert.equal(shotsBy(), 0, '撃たない'); moved = Math.max(moved, Math.hypot(a.x - x, a.y - y) - Math.hypot(a._hr.out.moveX, a._hr.out.moveY)); }
    assert.ok(stunnedSteps < 90, 'よろけが終わらない');
  }
  assert.ok(moved < 0.01, `自分で歩いた ${moved}`);
  assert.ok(stunnedSteps > 10);
  runSim(sim, 30);
  assert.ok(shotsBy() > 0, 'よろけが終わると撃つ');
});

test('押し: 水・マップの端には押し込まれない（壁に沿って滑る）', () => {
  const { sim, a } = duel();
  for (let y = 45; y <= 55; y++) setTile(sim.map, 21, y, T.WATER);
  a.x = tileCenter(20) + 10; a.y = tileCenter(50);
  for (let i = 0; i < 20; i++) pushUnit(sim, a, 8, 3);
  assert.equal(toTile(a.x), 20, '水に入らない'); assert.ok(a.y > tileCenter(50) + 20, '縦にはすべる');
  a.x = 4; a.y = tileCenter(50);
  for (let i = 0; i < 20; i++) pushUnit(sim, a, -8, 0);
  assert.ok(a.x >= 0, 'マップの外へ出ない');
  // 実際の当たりでも: 水の手前に立つ機体を水の方へ強く押す
  a.x = tileCenter(20) + 12; a.y = tileCenter(50);
  for (let k = 0; k < 6; k++) { hitReact(a, { w: 1, dir: 0, kind: 'explosion' }); runSim(sim, 15); }
  assert.notEqual(sim.map.tiles[toTile(a.y) * sim.map.w + toTile(a.x)], T.WATER);
});

test('はめ殺しにならない: 重い攻撃を受け続けても半分以上は動ける', () => {
  for (const kind of ['alien', 'giant', 'heavy']) {
    const wi = weaponInfo(kind), u = { kind: 'gunner' };
    const cd = 1.2; let stunned = 0, total = 0, run = 0, longest = 0;
    for (let t = 0; t < 30; t += TICK) {
      if ((t % cd) < TICK) hitReact(u, { w: wi.w, dir: 0, mass: massOf('gunner'), kind: wi.kind });
      const o = reactStep(u, TICK); total++;
      if (o.stun) { stunned++; run += TICK; longest = Math.max(longest, run); } else run = 0;
    }
    assert.ok(stunned / total < 0.5, `${kind}: ${(stunned / total * 100).toFixed(0)}% 動けない`);
    assert.ok(longest < 1.0, `${kind}: 続けて ${longest.toFixed(2)} 秒`);
  }
});

test('人: 倒れて、起き上がる（絵が無いので回転で代用）', () => {
  const h = { kind: 'boy', human: true };
  hitReact(h, { w: 0.9, dir: 0, human: true, kind: 'explosion' });
  let maxTilt = 0, down = false, t = 0;
  for (; t < 5; t += TICK) { const o = reactStep(h, TICK); maxTilt = Math.max(maxTilt, Math.abs(o.fallTilt)); down ||= o.down; if (down && !o.down && !o.stun) break; }
  assert.ok(down, '倒れる'); assert.ok(maxTilt > 60, `倒れる角度 ${maxTilt}`);
  assert.ok(t < 5, '起き上がる');
});

test('react.js と weapons.js は DOM を使わない（sim から使う）', () => {
  for (const f of ['../js/fx/react.js', '../js/sim/weapons.js', '../js/render/fx-events.js']) {
    const src = readFileSync(new URL(f, import.meta.url), 'utf8');
    assert.ok(!/\b(document|window|Math\.random)\b/.test(src.replace(/\/\/.*$/gm, '')), f);
  }
});
