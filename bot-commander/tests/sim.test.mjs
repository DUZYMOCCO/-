import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMap, T, setTile, createMap, passable, reachable } from '../js/sim/map.js?v=1';
import { findPath, createSearch, stepSearch, pathCost } from '../js/sim/path.js?v=1';
import { FogGrid } from '../js/sim/fog.js?v=1';
import { strokeToWaypoints } from '../js/sim/stroke.js?v=1';
import { createSim, runSim, issueOrder, hashSim, squadCommander, TICK, applyCommandsNow } from '../js/sim/sim.js?v=1';

test('マップ: 40x60・同じseedで同じ・本陣どうしがつながる', () => {
  const a = generateMap(7), b = generateMap(7), c = generateMap(8);
  assert.equal(a.w, 40); assert.equal(a.h, 60);
  assert.deepEqual(a.tiles, b.tiles);
  assert.notDeepEqual(a.tiles, c.tiles);
  for (const k of [T.PLAIN, T.FOREST, T.MOUNTAIN, T.WATER]) assert.ok(a.tiles.includes(k), `地形${k}がある`);
  for (const seed of [1, 2, 3, 7, 42, 99]) {
    const m = generateMap(seed), seen = reachable(m, m.hq.ally.tx, m.hq.ally.ty);
    assert.equal(seen[m.hq.enemy.ty * m.w + m.hq.enemy.tx], 1, `seed ${seed}`);
  }
});

test('A*: 水は通らない・角の水を斜めに抜けない', () => {
  const m = createMap(10, 10);
  for (let y = 0; y < 9; y++) setTile(m, 5, y, T.WATER); // 下に1マスだけすき間
  const p = findPath(m, 1, 1, 8, 1);
  assert.ok(p); assert.deepEqual(p[0], { tx: 1, ty: 1 }); assert.deepEqual(p.at(-1), { tx: 8, ty: 1 });
  assert.ok(p.every(q => passable(m, q.tx, q.ty)));
  assert.ok(p.some(q => q.tx === 5 && q.ty === 9), 'すき間を通る');
  for (let k = 1; k < p.length; k++) {
    const dx = p[k].tx - p[k - 1].tx, dy = p[k].ty - p[k - 1].ty;
    if (dx && dy) assert.ok(passable(m, p[k - 1].tx + dx, p[k - 1].ty) && passable(m, p[k - 1].tx, p[k - 1].ty + dy));
  }
  setTile(m, 5, 9, T.WATER);
  assert.equal(findPath(m, 1, 1, 8, 1), null, '完全に分断なら見つからない');
});

test('A*: 地形コストで山を避ける', () => {
  const m = createMap(12, 7);
  for (let y = 0; y < 6; y++) for (let x = 5; x <= 7; x++) setTile(m, x, y, T.MOUNTAIN); // 厚さ3の山、一番下だけ平地
  const p = findPath(m, 1, 2, 11, 2);
  assert.ok(!p.some(q => m.tiles[q.ty * m.w + q.tx] === T.MOUNTAIN), '山を越えず、下の平地を回る');
  // 回り道の方が安いので、山を通るまっすぐの道よりコストが小さい
  const straight = Array.from({ length: 11 }, (_, i) => ({ tx: 1 + i, ty: 2 }));
  assert.ok(pathCost(m, p) < pathCost(m, straight));
});

test('A*: 予算つきで分けて進めても、一度に探したのと同じ結果', () => {
  const m = generateMap(7);
  const full = findPath(m, m.hq.ally.tx, m.hq.ally.ty, m.hq.enemy.tx, m.hq.enemy.ty);
  const s = createSearch(m, m.hq.ally.tx, m.hq.ally.ty, m.hq.enemy.tx, m.hq.enemy.ty);
  let calls = 0; while (stepSearch(s, 50) === 'running') calls++;
  assert.ok(calls > 3, '何回かに分かれる');
  assert.deepEqual(s.path, full);
});

test('霧: 今見えている／見たことがある／未探索', () => {
  const f = new FogGrid(20, 20);
  f.begin(); f.stamp(5, 5, 2); assert.ok(f.commit());
  assert.equal(f.stateAt(5, 5), 2); assert.equal(f.stateAt(7, 5), 2); assert.equal(f.stateAt(8, 5), 0);
  const rev = f.revision;
  f.begin(); f.stamp(5, 5, 2); assert.equal(f.commit(), false, '同じなら変化なし'); assert.equal(f.revision, rev);
  f.begin(); f.stamp(15, 15, 2); f.commit();
  assert.equal(f.stateAt(5, 5), 1, '離れたら「見たことがある」'); assert.equal(f.stateAt(15, 15), 2);
  const g = FogGrid.deserialize(f.serialize());
  assert.equal(g.isSeen(5, 5), true); assert.equal(g.isVisible(15, 15), false, '復元直後は今の視界は空');
  assert.doesNotThrow(() => f.stamp(-3, 99, 3), '端の外は無視');
});

test('なぞり線: 最大4経由点・水の上は近くの陸へ', () => {
  const m = generateMap(7);
  const pts = []; for (let i = 0; i <= 200; i++) { const t = i / 200; pts.push({ x: 640 + Math.sin(t * Math.PI * 6) * 300, y: 1800 - t * 1500 }); }
  const w = strokeToWaypoints(m, pts);
  assert.ok(w.length >= 1 && w.length <= 4);
  for (const p of w) assert.ok(passable(m, p.tx, p.ty));
  const last = pts.at(-1); assert.ok(Math.hypot(w.at(-1).tx * 32 - last.x, w.at(-1).ty * 32 - last.y) < 200, '終点は指を離した所の近く');
  const straight = strokeToWaypoints(m, [{ x: 100, y: 100 }, { x: 200, y: 100 }, { x: 300, y: 100 }]);
  assert.equal(straight.length, 1, 'まっすぐなら終点だけ');
});

function scripted(seed) {
  const sim = createSim({ seed });
  runSim(sim, 30);
  issueOrder(sim, 'a1', [{ tx: 10, ty: 35 }, { tx: 12, ty: 20 }]);
  issueOrder(sim, 'a2', [{ tx: 20, ty: 25 }]);
  runSim(sim, 600);
  issueOrder(sim, 'a3', [{ tx: 28, ty: 30 }, { tx: 25, ty: 15 }, { tx: 20, ty: 8 }]);
  runSim(sim, 1800);
  return sim;
}

test('再現性: 同じseed・同じ命令なら同じ結果、seedが違えば違う', () => {
  const a = scripted(123), b = scripted(123), c = scripted(124);
  assert.equal(hashSim(a), hashSim(b));
  assert.notEqual(hashSim(a), hashSim(c));
  assert.ok(a.time > 80 && Math.abs(a.time - a.tick * TICK) < 1e-9);
});

test('命令: 部隊が経由点を通って目的地に着く', () => {
  const sim = createSim({ seed: 5, setup: { ally: [{ name: 'A', kind: 'gunner', tx: 20, ty: 52 }], enemy: [{ name: 'E', kind: 'gunner', tx: 2, ty: 2, role: 'guard' }] } });
  const s = sim.squads.find(q => q.side === 'ally');
  issueOrder(sim, s.id, [{ tx: 14, ty: 44 }, { tx: 26, ty: 40 }]);
  let passedFirst = false;
  for (let i = 0; i < 30 * 120 && (s.order || i < 2); i++) {
    runSim(sim, 1); const c = squadCommander(sim, s);
    if (Math.hypot(c.x - (14 * 32 + 16), c.y - (44 * 32 + 16)) < 20) passedFirst = true;
  }
  const c = squadCommander(sim, s);
  assert.ok(passedFirst, '1つ目の経由点を通る');
  assert.ok(Math.hypot(c.x - (26 * 32 + 16), c.y - (40 * 32 + 16)) < 4, '目的地に着く');
  assert.equal(s.order, null);
});

test('戦闘: 近づくと撃ち合い、HP0で消え、隊長は繰り上がる', () => {
  const sim = createSim({ seed: 9, setup: { ally: [{ name: 'A', kind: 'heavy', tx: 20, ty: 40 }, { name: 'B', kind: 'heavy', tx: 22, ty: 40 }], enemy: [{ name: 'E', kind: 'gunner', tx: 20, ty: 36, role: 'raid' }] } });
  let shots = 0, promoted = false;
  for (let i = 0; i < 30 * 90 && !sim.result; i++) {
    runSim(sim, 1); shots += sim.fx.filter(f => f.type === 'shot' && f.t === sim.time - 1 / 30).length;
    for (const s of sim.squads) { const us = s.unitIds.length; if (us < 4 && squadCommander(sim, s)) promoted ||= true; }
  }
  assert.equal(sim.result, 'win');
  assert.ok(sim.units.every(u => u.hp > 0));
  for (const s of sim.squads) assert.equal(s.unitIds.filter(id => sim.units.find(u => u.id === id)?.commander).length, 1, '各部隊に隊長は1人');
});

test('一時停止中の命令: 時間を進めずに経路ができる', () => {
  const sim = createSim({ seed: 3 });
  const t = sim.tick;
  issueOrder(sim, 'a2', [{ tx: 20, ty: 30 }, { tx: 10, ty: 20 }]);
  applyCommandsNow(sim);
  const s = sim.squads.find(q => q.id === 'a2');
  assert.equal(sim.tick, t);
  assert.ok(s.order.planned.length > 10);
  assert.deepEqual(s.order.planned.at(-1), { tx: 10, ty: 20 });
});
