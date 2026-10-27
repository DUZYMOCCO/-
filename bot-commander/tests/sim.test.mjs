import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMap, T, setTile, createMap, passable, reachable } from '../js/sim/map.js?v=6';
import { findPath, createSearch, stepSearch, pathCost } from '../js/sim/path.js?v=6';
import { FogGrid } from '../js/sim/fog.js?v=5';
import { strokeToWaypoints } from '../js/sim/stroke.js?v=1';
import { createSim, runSim, issueOrder, issueAttack, issueStance, issueStop, issueRetreat, hashSim, TICK, applyCommandsNow, deployUnit, canDeploy, fieldCount, FIELD_CAP, unitById, slotCost, isGiant, KINDS } from '../js/sim/sim.js?v=30';

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

const allies = sim => sim.units.filter(u => u.side === 'ally');
const near = (u, tx, ty, r) => Math.hypot(u.x - (tx * 32 + 16), u.y - (ty * 32 + 16)) < r;

function scripted(seed) {
  const sim = createSim({ seed });
  runSim(sim, 30);
  const a = allies(sim);
  issueOrder(sim, a.slice(0, 4).map(u => u.id), [{ tx: 10, ty: 35 }, { tx: 12, ty: 20 }]);
  issueOrder(sim, a[4].id, [{ tx: 20, ty: 25 }]);
  runSim(sim, 600);
  issueOrder(sim, a.slice(8).map(u => u.id), [{ tx: 28, ty: 30 }, { tx: 25, ty: 15 }, { tx: 20, ty: 8 }], { mode: 'rush' });
  runSim(sim, 1800);
  return sim;
}

test('再現性: 同じseed・同じ命令なら同じ結果、seedが違えば違う', () => {
  const a = scripted(123), b = scripted(123), c = scripted(124);
  assert.equal(hashSim(a), hashSim(b));
  assert.notEqual(hashSim(a), hashSim(c));
  assert.ok(a.time > 80 && Math.abs(a.time - a.tick * TICK) < 1e-9);
});

const ONE = { ally: [{ kind: 'gunner', tx: 20, ty: 52 }], enemy: [{ name: 'E', kind: 'gunner', tx: 2, ty: 2, role: 'guard', count: 1 }] };

test('1機に命令: 経由点を通って目的地に着く（ほかの機体は動かない）', () => {
  const sim = createSim({ seed: 5, setup: { ...ONE, ally: [{ kind: 'gunner', tx: 20, ty: 52, count: 3 }] } });
  const [u, v, w] = allies(sim), v0 = { x: v.x, y: v.y };
  issueOrder(sim, u.id, [{ tx: 14, ty: 44 }, { tx: 26, ty: 40 }]);
  let passedFirst = false;
  for (let i = 0; i < 30 * 120 && (u.order || i < 2); i++) { runSim(sim, 1); if (near(u, 14, 44, 20)) passedFirst = true; }
  assert.ok(passedFirst, '1つ目の経由点を通る');
  assert.ok(near(u, 26, 40, 4), '目的地に着く');
  assert.equal(u.order, null);
  assert.ok(Math.hypot(v.x - v0.x, v.y - v0.y) < 16 && !w.order, '選んでいない機体はその場');
});

test('何機かに同じ場所: 1マスずつ散って着く（固まらない）', () => {
  const sim = createSim({ seed: 6, setup: { ...ONE, ally: [{ kind: 'gunner', tx: 20, ty: 52, count: 5 }] } });
  const us = allies(sim);
  issueOrder(sim, us.map(u => u.id), [{ tx: 20, ty: 40 }]);
  runSim(sim, 30 * 60);
  assert.ok(us.every(u => !u.order), '全員着いた');
  const tiles = new Set(us.map(u => `${Math.floor(u.x / 32)},${Math.floor(u.y / 32)}`));
  assert.equal(tiles.size, 5, '別々のマス');
  assert.ok(us.every(u => near(u, 20, 40, 32 * 2.5)), '目的地のまわり');
});

test('戦闘: 近づくと撃ち合い、HP0で消える（隊長はいない）', () => {
  const sim = createSim({ seed: 9, setup: { ally: [{ kind: 'heavy', tx: 20, ty: 40, count: 4 }, { kind: 'heavy', tx: 22, ty: 40, count: 4 }], enemy: [{ name: 'E', kind: 'gunner', tx: 20, ty: 36, role: 'raid', count: 4 }] } });
  let shots = 0;
  for (let i = 0; i < 30 * 90 && !sim.result; i++) { runSim(sim, 1); shots += sim.fx.filter(f => f.type === 'shot').length; }
  assert.equal(sim.result, 'win');
  assert.ok(shots > 0);
  assert.ok(sim.units.every(u => u.hp > 0 && !('commander' in u)));
});

test('狙う命令: 指定した敵へ寄って撃ち、倒すと命令が終わる', () => {
  const sim = createSim({ seed: 2, setup: { ally: [{ kind: 'gunner', tx: 20, ty: 50, count: 2 }], enemy: [{ name: 'E', kind: 'gunner', tx: 20, ty: 38, role: 'guard', count: 1 }] } });
  const e = sim.units.find(u => u.side === 'enemy'); e.atk = 0; e.speed = 0; // 反撃しない・動かない的
  const [a, b] = allies(sim);
  issueAttack(sim, a.id, e.id);
  runSim(sim, 2);
  assert.equal(a.order.attackId, e.id); assert.equal(b.order, null);
  for (let i = 0; i < 30 * 120 && unitById(sim, e.id); i++) runSim(sim, 1);
  assert.equal(unitById(sim, e.id), null, '倒した');
  assert.equal(a.order, null);
});

test('急行・止まる・撤退・構え', () => {
  const sim = createSim({ seed: 4, setup: { ally: [{ kind: 'gunner', tx: 20, ty: 50, count: 2 }], enemy: [{ name: 'E', kind: 'gunner', tx: 20, ty: 46, role: 'guard', count: 1 }] } });
  const e = sim.units.find(u => u.side === 'enemy'); e.atk = 0; e.speed = 0;
  const [a, b] = allies(sim);
  issueStance(sim, [a.id, b.id], 'hold');
  issueOrder(sim, a.id, [{ tx: 20, ty: 40 }], { mode: 'rush' });
  runSim(sim, 30 * 3);
  assert.equal(a.engaged, false, '急行中は撃たない');
  assert.ok(a.order && a.order.mode === 'rush');
  issueStop(sim, a.id); runSim(sim, 1);
  assert.equal(a.order, null, '止まる');
  const hq = sim.map.hq.ally;
  issueRetreat(sim, [a.id, b.id]); runSim(sim, 1);
  assert.equal(a.order.mode, 'retreat'); assert.equal(b.order.mode, 'retreat');
  runSim(sim, 30 * 60);
  assert.ok(Math.hypot(a.x - (hq.tx * 32 + 16), a.y - (hq.ty * 32 + 16)) < 32 * 4, '基地のそばへ戻る');
  assert.equal(a.stance, 'hold');
});

test('上限: ロボット12機・人間は別枠3人', () => {
  assert.deepEqual({ ...FIELD_CAP }, { robots: 12, humans: 3 });
  const sim = createSim({ seed: 1, setup: { ally: [{ kind: 'gunner', tx: 20, ty: 50, count: 14 }, { kind: 'boy', tx: 18, ty: 52 }], enemy: [{ name: 'E', kind: 'gunner', tx: 2, ty: 2, role: 'guard', count: 1 }] } });
  let c = fieldCount(sim);
  assert.equal(c.robots, 12, '14機頼んでも12機まで'); assert.equal(c.humans, 1);
  assert.deepEqual(sim.benched, ['gunner', 'gunner'], '出せなかった分は控え');
  assert.equal(canDeploy(sim, 'heavy'), false);
  assert.equal(deployUnit(sim, 'heavy', { tx: 20, ty: 48 }), null, '13機目は出せない');
  assert.ok(deployUnit(sim, 'girl', { tx: 21, ty: 52 }), 'ロボットが満員でも人間は出せる');
  assert.ok(deployUnit(sim, 'boy', { tx: 22, ty: 52 }));
  assert.equal(deployUnit(sim, 'girl', { tx: 23, ty: 52 }), null, '人間は3人まで');
  c = fieldCount(sim); assert.equal(c.robots, 12); assert.equal(c.humans, 3);
  // 1機倒れたら、また出せる
  sim.units.find(u => u.kind === 'gunner').hp = 0; runSim(sim, 1);
  assert.ok(deployUnit(sim, 'heavy', { tx: 20, ty: 48 }));
});

test('枠: 巨大機もロボットの枠を1つだけ使う', () => {
  assert.ok(isGiant('giant')); assert.equal(slotCost('giant'), 1); assert.equal(slotCost('ponco'), 1); assert.equal(slotCost('boy'), 0);
  const enemy = [{ name: 'E', kind: 'gunner', tx: 2, ty: 2, role: 'guard', count: 1 }];
  let sim = createSim({ seed: 1, setup: { ally: [{ kind: 'gunner', tx: 20, ty: 50, count: 11 }], enemy } });
  assert.ok(canDeploy(sim, 'giant'), '11機なら巨大機を出せる');
  const g = deployUnit(sim, 'giant', { tx: 20, ty: 46 });
  assert.ok(g); assert.equal(fieldCount(sim).robots, 12, '巨大機は1と数える');
  assert.equal(deployUnit(sim, 'gunner', { tx: 21, ty: 46 }), null, '巨大機を入れて12で満員');
  // 巨大機ばかりでも12機まで
  sim = createSim({ seed: 1, setup: { ally: [{ kind: 'giant', tx: 20, ty: 50, count: 13 }], enemy } });
  assert.equal(fieldCount(sim).robots, 12); assert.deepEqual(sim.benched, ['giant']);
  // 満員なら巨大機も出せない
  assert.equal(canDeploy(sim, 'giant'), false);
});

test('枠: AI で動く味方（5-5）はどの枠にも数えない・プレイヤーは選べない', async () => {
  const { selectKind, allyAt } = await import('../js/sim/select.js?v=12');
  const enemy = [{ name: 'E', kind: 'gunner', tx: 2, ty: 2, role: 'guard', count: 1 }];
  const sim = createSim({ seed: 1, setup: { ally: [{ kind: 'gunner', tx: 20, ty: 50, count: 12 }, { kind: 'boy', tx: 17, ty: 52 }, { kind: 'girl', tx: 18, ty: 52 }, { kind: 'girl', tx: 19, ty: 52 }, { kind: 'heavy', tx: 26, ty: 46, count: 4, ai: true }], enemy } });
  let c = fieldCount(sim);
  assert.equal(c.robots, 12); assert.equal(c.humans, 3); assert.equal(c.ai, 4, '満員でも AI の味方は出る');
  assert.deepEqual(sim.benched, []);
  const ai = deployUnit(sim, 'boy', { tx: 24, ty: 46 }, { aiAlly: true });
  assert.ok(ai && ai.aiAlly, 'AI の人間も枠の外'); assert.match(ai.label, /仲間/);
  c = fieldCount(sim); assert.equal(c.humans, 3); assert.equal(c.ai, 5);
  const aiIds = sim.units.filter(u => u.aiAlly).map(u => u.id);
  assert.ok(selectKind(sim.units, 'all').every(id => !aiIds.includes(id)), '全員ボタンに入らない');
  const h = sim.units.find(u => u.aiAlly && !u.human);
  assert.equal(allyAt(sim.units, h.x, h.y - 12, 20)?.aiAlly ?? false, false, 'タップでも選べない');
});

test('隊長・統率・同社リンク・隊長代理はない（機体のデータにも、コードにも）', async () => {
  const sim = createSim({ seed: 1 });
  for (const u of sim.units) for (const k of ['commander', 'captain', 'leader', 'isLeader', 'deputy', 'link', 'command']) assert.ok(!(k in u), `${u.label}.${k}`);
  const { readFileSync, readdirSync, statSync } = await import('node:fs');
  const { join, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'js');
  const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
  for (const f of walk(root)) {
    const src = readFileSync(f, 'utf8');
    assert.doesNotMatch(src, /隊長代理|統率|同社リンク|commanderMarker|marker_|_cmd\b|\bcaptain\b/, f);
  }
});

test('一時停止中の命令: 時間を進めずに経路ができる', () => {
  const sim = createSim({ seed: 3 });
  const t = sim.tick, u = allies(sim)[5];
  issueOrder(sim, u.id, [{ tx: 20, ty: 30 }, { tx: 10, ty: 20 }]);
  applyCommandsNow(sim);
  assert.equal(sim.tick, t);
  assert.ok(u.order.planned.length > 10);
  assert.deepEqual(u.order.planned.at(-1), { tx: 10, ty: 20 });
});
