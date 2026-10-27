// 人間がロボの背中・中に乗る（js/sim/ride.js, js/sim/ride-demo.js）: 乗れる・乗れない、一緒に動く、降りる、
// ロボが壊れたら降ろされる、背中と中の撃たれ方、捕まり方、だれも乗らない時は何も変わらないこと。画面は使わない。
import test from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../js/sim/sim.js?v=29';
import * as M from '../js/sim/mission.js?v=10';
import * as R from '../js/sim/ride.js?v=3';
import { createRideDemoSim, addDemoWolf } from '../js/sim/ride-demo.js?v=9';
import { ALT, ALT_TEST_UNITS } from '../js/sim/altitude.js?v=1';
import { selectKind, pruneSelection, allyAt } from '../js/sim/select.js?v=12';
import { toTile, passable, T } from '../js/sim/map.js?v=6';

const demo = () => createRideDemoSim({ seed: 1 });
const by = (sim, label) => sim.units.find(u => u.label === label);
const near = (sim, h, host) => { h.x = host.x + 14; h.y = host.y + 6; }; // 乗れる距離に置く
const run = (sim, n) => S.runSim(sim, n);
const mkSim = () => { const sim = demo(); sim.units = sim.units.filter(u => u.side === 'ally'); sim.groups = []; return sim; }; // 敵なしの静かな場面

test('表: 乗れるのは巨大機・PONCO02・ツギハギ号だけ。PONCO・ツギハギ号は背中に1人、巨大機は中に2人（v1.0.0）', () => {
  assert.deepEqual(Object.keys(R.RIDE_TABLE).sort(), ['giant', 'ponco', 'scav']);
  assert.equal(R.RIDE_TABLE.giant.back, 0); assert.equal(R.RIDE_TABLE.giant.inside, 2);
  assert.equal(R.RIDE_TABLE.ponco.back, 1); assert.equal(R.RIDE_TABLE.ponco.inside, 0);
  assert.equal(R.RIDE_TABLE.scav.back, 1); assert.equal(R.RIDE_TABLE.scav.inside, 0);
  for (const k of Object.keys(R.RIDE_TABLE)) assert.ok(S.KINDS[k], `${k} は KINDS にある`);
  assert.equal(S.KINDS.wolf, undefined, '狼は KINDS に足していない（お試しの中だけ）');
  assert.equal(R.RIDE.backHitChance, 0.10); assert.equal(R.RIDE.backHitMult, 0.5);
  assert.deepEqual({ ...R.RIDE.fallDmg }, { back: 8, inside: 3 }); assert.deepEqual({ ...R.RIDE.daze, washed: undefined }, { back: 2, inside: 1, washed: undefined });
});

test('乗れる・乗れない: 遠い・満員・乗れないロボ・席のないロボ・もう乗っている', () => {
  const sim = mkSim(), boy = by(sim, '少年'), girl = by(sim, 'ミント'), p1 = by(sim, 'PONCO02 1'), sc = by(sim, 'ツギハギ1'), g = by(sim, '巨大機1');
  assert.equal(R.canBoard(sim, boy, p1, 'back').reason, 'far', '離れている');
  near(sim, boy, p1); near(sim, girl, p1);
  assert.deepEqual(R.canBoard(sim, boy, p1, 'back'), { ok: true, reason: null });
  assert.equal(R.canBoard(sim, boy, p1, 'inside').reason, 'cannot', 'PONCO に中はない');
  near(sim, boy, sc);
  assert.equal(R.canBoard(sim, boy, sc, 'inside').reason, 'cannot', 'ツギハギ号に中はない');
  assert.equal(R.canBoard(sim, boy, sc, 'back').ok, true);
  near(sim, boy, g);
  assert.equal(R.canBoard(sim, boy, g, 'back').reason, 'cannot', '巨大機に背中はない');
  assert.equal(R.canBoard(sim, boy, g, 'inside').ok, true);
  assert.equal(R.canBoard(sim, boy, p1, 'ほか').reason, 'cannot', 'わからない乗り方');
  // 乗れないロボ（異星生物・人間・敵）
  const full = createRideDemoSim({ seed: 1 }), al = full.units.find(u => u.kind === 'alien'), b2 = by(full, '少年');
  b2.x = al.x; b2.y = al.y;
  assert.equal(R.canBoard(full, b2, al, 'back').reason, 'noHost');
  assert.equal(R.canBoard(sim, boy, girl, 'back').reason, 'noHost');
  // 満員: PONCO の背中は1人
  near(sim, boy, p1);
  assert.equal(R.issueBoard(sim, boy.id, p1.id, 'back').ok, true);
  run(sim, 1);
  near(sim, girl, p1);
  assert.equal(R.canBoard(sim, girl, p1, 'back').reason, 'full');
  near(sim, girl, g);
  assert.equal(R.canBoard(sim, girl, g, 'inside').ok, true, '巨大機の中は空いている');
  assert.equal(R.canBoard(sim, boy, g, 'inside').reason, 'busy', 'もう乗っている人は乗れない');
});

test('乗る: 時間がかかり、乗り終わるまで外にいる。乗ったら一緒に動く（位置・向き）', () => {
  const sim = mkSim(), boy = by(sim, '少年'), p1 = by(sim, 'PONCO02 1');
  near(sim, boy, p1);
  const r = R.issueBoard(sim, boy.id, p1.id, 'back'); assert.equal(r.ok, true);
  assert.equal(boy.ride, undefined, '命令だけでは変わらない（次のステップで反映）');
  run(sim, 1);
  assert.equal(boy.ride.phase, 'boarding');
  assert.equal(R.isSealed(boy), false);
  run(sim, Math.ceil(R.RIDE.boardSec * 30) + 1);
  assert.equal(boy.ride.phase, 'on');
  // ロボを動かすと一緒に動く
  S.issueOrder(sim, p1.id, [{ tx: toTile(p1.x) + 4, ty: toTile(p1.y) - 4 }]);
  const x0 = p1.x, y0 = p1.y;
  run(sim, 120);
  assert.ok(Math.hypot(p1.x - x0, p1.y - y0) > 20, 'ロボは動いた');
  assert.ok(Math.hypot(boy.x - p1.x, boy.y - p1.y) < 12, '背中の人はロボのそば');
  assert.equal(boy.facing, p1.facing);
  assert.equal(boy.moving, false);
  assert.equal(boy.order, null, '乗っている人に命令は残らない');
});

test('乗っている間の速さはロボの速さ。人間の足の速さで離れていかない', () => {
  const sim = mkSim(), boy = by(sim, '少年'), g = by(sim, '巨大機1');
  near(sim, boy, g); R.issueBoard(sim, boy.id, g.id, 'inside'); run(sim, 40);
  const y0 = g.y;
  S.issueOrder(sim, [g.id, boy.id], [{ tx: toTile(g.x), ty: toTile(g.y) - 6 }]); // 人間にも命令が来ても動かない
  run(sim, 90);
  const d = Math.hypot(g.x - boy.x, g.y - boy.y);
  assert.ok(d < 1, `中の人はロボと同じ場所（${d}）`);
  assert.ok(g.y < y0 - 8, 'ロボは進んだ');
});

test('乗り終わった人は捕まらない（背中も中も。v1.0.0）。中は外から見えない（選べない）。乗る途中は捕まる', () => {
  const sim = mkSim(), boy = by(sim, '少年'), girl = by(sim, 'ミント'), p1 = by(sim, 'PONCO02 1'), g = by(sim, '巨大機1');
  near(sim, boy, g); near(sim, girl, p1);
  R.issueBoard(sim, boy.id, g.id, 'inside'); R.issueBoard(sim, girl.id, p1.id, 'back'); run(sim, 40);
  assert.equal(R.isSealed(boy), true); assert.equal(R.isSealed(girl), false);
  assert.equal(R.cannotBeCaptured(boy), true); assert.equal(R.cannotBeCaptured(girl), true);
  // 選べない
  assert.ok(!selectKind(sim.units, 'human').includes(boy.id) && !selectKind(sim.units, 'human').includes(girl.id));
  assert.deepEqual(pruneSelection(sim.units, [boy.id, g.id]), [g.id]);
  // 異星生物が触れても、乗っている人はだれも捕まらない
  sim.units.push(mkAlien(sim, p1.x + 3, p1.y), mkAlien(sim, g.x + 3, g.y));
  run(sim, 30);
  assert.equal(boy.captured, null, '中の人は捕まらない');
  assert.equal(girl.captured, null, '背中の人も捕まらない');
  assert.equal(girl.ride.phase, 'on'); assert.equal(boy.ride.phase, 'on');
  // 乗る途中（まだ外）は捕まることがある
  const s2 = mkSim(), b2 = by(s2, '少年'), q = by(s2, 'PONCO02 2');
  near(s2, b2, q); R.issueBoard(s2, b2.id, q.id, 'back'); run(s2, 1);
  assert.equal(b2.ride.phase, 'boarding'); assert.equal(R.cannotBeCaptured(b2), false);
  s2.units.push(mkAlien(s2, b2.x + 2, b2.y)); run(s2, 6); // ロボに撃たれてよろける間は捕まえないので少し待つ
  assert.notEqual(b2.captured, null, '乗る途中の人は捕まる');
  assert.equal(b2.ride, undefined, '捕まったら乗るのをやめる');
});

/** テスト用の異星生物（敵）を1体 */
function mkAlien(sim, x, y) {
  const src = createRideDemoSim({ seed: 1 }).units.find(u => u.kind === 'alien');
  return { ...src, id: sim.nextId++, x, y, groupId: null, hp: 360, maxHp: 360, order: null, carrying: null, _hr: undefined };
}

test('降りる: 近くの歩ける場所に降りる。時間がかかる。空の上・水中では降りられない', () => {
  const sim = mkSim(), boy = by(sim, '少年'), p1 = by(sim, 'PONCO02 1'), air = by(sim, '空の PONCO');
  near(sim, boy, p1); R.issueBoard(sim, boy.id, p1.id, 'back'); run(sim, 40);
  assert.equal(R.issueAlight(sim, [boy.id]), 1);
  run(sim, 1); assert.equal(boy.ride.phase, 'alighting');
  run(sim, Math.ceil(R.RIDE.alightSec * 30) + 1);
  assert.equal(boy.ride, undefined);
  assert.equal(boy.z, 0);
  assert.ok(passable(sim.map, toTile(boy.x), toTile(boy.y)), '歩ける場所');
  assert.ok(Math.hypot(boy.x - p1.x, boy.y - p1.y) > 8, 'ロボの上ではない');
  // 空を飛んでいる間は降りられない
  const girl = by(sim, 'ミント'); near(sim, girl, air);
  assert.equal(R.issueBoard(sim, girl.id, air.id, 'back').ok, true); run(sim, 40);
  assert.equal(girl.z, air.z); assert.ok(air.z >= ALT.airFrom, '空の帯');
  assert.equal(R.canAlight(sim, girl).reason, 'air');
  assert.equal(R.issueAlight(sim, [girl.id]), 0);
  // 乗っていない人は降りられない
  assert.equal(R.canAlight(sim, by(sim, '少年')).reason, 'notRiding');
});

test('高さ: 空を飛ぶロボに乗ると z が同じ（帯は空）。壊れると落ちてダメージが倍', () => {
  const sim = mkSim(), girl = by(sim, 'ミント'), air = by(sim, '空の PONCO');
  near(sim, girl, air); R.issueBoard(sim, girl.id, air.id, 'back'); run(sim, 40);
  assert.equal(girl.z, ALT_TEST_UNITS.air.z);
  const hp0 = girl.hp; air.hp = 0; run(sim, 1);
  assert.equal(girl.ride, undefined); assert.equal(girl.z, 0);
  assert.equal(girl.hp, hp0 - R.RIDE.fallDmg.back * R.RIDE.airFallMult, '空から落ちると倍');
  assert.ok(girl.dazed > 0);
});

test('ロボが壊れたら降ろされる: 背中は痛くて気絶、中は軽い。気絶の間は動けない', () => {
  const sim = mkSim(), boy = by(sim, '少年'), girl = by(sim, 'ミント'), p1 = by(sim, 'PONCO02 1'), g = by(sim, '巨大機1');
  near(sim, boy, p1); near(sim, girl, g);
  R.issueBoard(sim, boy.id, p1.id, 'back'); R.issueBoard(sim, girl.id, g.id, 'inside'); run(sim, 40);
  const hb = boy.hp, hg = girl.hp; p1.hp = 0; g.hp = 0;
  run(sim, 1);
  assert.equal(sim.units.includes(p1), false, 'ロボは消えた');
  assert.equal(hb - boy.hp, 8, '背中は 8'); assert.equal(hg - girl.hp, 3, '中は 3');
  assert.equal(boy.ride, undefined); assert.equal(girl.ride, undefined);
  assert.equal(boy.hp, hb - R.RIDE.fallDmg.back); assert.equal(girl.hp, hg - R.RIDE.fallDmg.inside);
  assert.ok(girl.hp > boy.hp, '中にいた人のほうが軽い');
  assert.ok(boy.dazed > girl.dazed, '背中のほうが長く気絶');
  assert.ok(passable(sim.map, toTile(boy.x), toTile(boy.y)));
  // 気絶中は動けない。命令しても進まない
  S.issueOrder(sim, boy.id, [{ tx: toTile(boy.x) + 5, ty: toTile(boy.y) }]);
  const x = boy.x; run(sim, 20); assert.ok(Math.abs(boy.x - x) < 6, '気絶中は動けない');
  run(sim, 120); assert.equal(boy.dazed, undefined, '気絶は治る');
  assert.equal(R.canBoard(sim, boy, by(sim, 'PONCO02 2'), 'back').reason, 'far');
});

test('乗る途中・降りる途中にロボが壊れても、ダメージは受けない', () => {
  const sim = mkSim(), boy = by(sim, '少年'), p1 = by(sim, 'PONCO02 1');
  near(sim, boy, p1); R.issueBoard(sim, boy.id, p1.id, 'back'); run(sim, 5);
  assert.equal(boy.ride.phase, 'boarding');
  const hp = boy.hp; p1.hp = 0; run(sim, 1);
  assert.equal(boy.hp, hp); assert.equal(boy.ride, undefined);
});

test('背中の撃たれ方: 確率で乗っている人にも当たる（中は当たらない）。誰もいなければ乱数を引かない', () => {
  const draws = []; const mk = (host, riders) => ({ units: [host, ...riders], time: 1, fx: [], rng: () => { draws.push(1); return 0.0; } });
  const host = { id: 1, kind: 'ponco' };
  const back = { id: 2, hp: 30, ride: { host: 1, mode: 'back', phase: 'on' } }, inner = { id: 3, hp: 30, ride: { host: 1, mode: 'inside', phase: 'on' } };
  // 誰も乗っていない / 中だけ: 乱数なし
  R.onHostHit(mk(host, []), host, 10); R.onHostHit(mk(host, [inner]), host, 10);
  assert.equal(draws.length, 0);
  // 背中に1人: 乱数 0 → 当たる。ダメージ＝受けた量の半分
  const sim = mk(host, [back, inner]);
  R.onHostHit(sim, host, 10);
  assert.equal(back.hp, 30 - Math.round(10 * R.RIDE.backHitMult)); assert.equal(inner.hp, 30, '中は当たらない');
  assert.equal(sim.fx[0].type, 'rideHit');
  assert.ok(draws.length >= 1);
  // 外れ（乱数が確率以上）
  let n = 0; const sim2 = { ...mk(host, [back]), rng: () => { n++; return 0.99; } }; const hp = back.hp;
  R.onHostHit(sim2, host, 10); assert.equal(back.hp, hp); assert.equal(n, 1);
  // 乗る途中の人（まだ外）には当たらない
  const boarding = { id: 4, hp: 30, ride: { host: 1, mode: 'back', phase: 'boarding' } };
  const sim3 = mk(host, [boarding]); draws.length = 0; R.onHostHit(sim3, host, 10);
  assert.equal(boarding.hp, 30); assert.equal(draws.length, 0);
});

test('戦闘の中でも背中の人が撃たれる: 異星生物に囲まれたロボの背中の人は、ときどき傷つく', () => {
  const sim = mkSim(), boy = by(sim, '少年'), p1 = by(sim, 'PONCO02 1');
  near(sim, boy, p1); R.issueBoard(sim, boy.id, p1.id, 'back'); run(sim, 40);
  p1.hp = p1.maxHp = 100000; p1.shieldHp = 0; p1.shieldMax = 0; // 倒れないロボ
  for (let i = 0; i < 3; i++) sim.units.push(mkAlien(sim, p1.x + 20 + i * 4, p1.y));
  const hp0 = boy.hp; let hit = false;
  for (let i = 0; i < 600 && !hit && boy.hp > 0; i++) { run(sim, 1); hit = boy.hp < hp0; }
  assert.ok(hit || boy.captured != null, '背中の人に当たるか、捕まった');
});

test('背中のロボが水に潜ると流される（ダメージなし）。中は潜っても乗ったまま', () => {
  const sim = mkSim(), boy = by(sim, '少年'), girl = by(sim, 'ミント'), p1 = by(sim, 'PONCO02 1'), g = by(sim, '巨大機1');
  near(sim, boy, p1); near(sim, girl, g);
  R.issueBoard(sim, boy.id, p1.id, 'back'); R.issueBoard(sim, girl.id, g.id, 'inside'); run(sim, 40);
  // 深い水の上で水中の動き方を持つ水陸両用機は潜る（sim の updateAltitude）
  for (const h of [p1, g]) { h.moves = Object.freeze(['ground', 'underwater']); sim.map.tiles[toTile(h.y) * sim.map.w + toTile(h.x)] = T.WATER; }
  const hp = boy.hp; run(sim, 1);
  assert.equal(boy.ride, undefined, '背中の人は流された'); assert.equal(boy.hp, hp);
  assert.ok(girl.ride, '中の人は乗ったまま');
  assert.equal(R.canAlight(sim, girl).reason, 'sealedWater');
  const b2 = by(sim, '少年'); near(sim, b2, p1);
  assert.equal(R.canBoard(sim, b2, p1, 'back').reason, 'busy');
});

test('獣人ロウ（お試しの中だけ）: 狼として出る。ふつうの人間と同じ（HP・乗る）。KINDS は書きかえていない', () => {
  const sim = demo(), wolf = by(sim, 'ロウ');
  assert.equal(wolf.kind, 'wolf'); assert.equal(wolf.human, true);
  assert.equal(wolf.hp, S.KINDS.boy.hp, 'HP はふつうの人間と同じ');
  assert.equal(S.KINDS.wolf, undefined); assert.equal(Object.isFrozen(S.KINDS), true);
  assert.equal(S.fieldCount(sim).humans, 3);
  const p2 = by(sim, 'PONCO02 2'); near(sim, wolf, p2);
  assert.equal(R.canBoard(sim, wolf, p2, 'inside').reason, 'cannot');
  assert.equal(R.issueBoard(sim, wolf.id, p2.id, 'back').ok, true);
  run(sim, 600);
  assert.ok(Number.isFinite(wolf.x) && Number.isFinite(wolf.y));
  assert.equal(addDemoWolf(sim), null, '人間は3人まで');
});

test('だれも乗らない時は何も変わらない: sim.ride もプロパティも増えず、今のミッションの結果が同じ', () => {
  for (const seed of [1, 2, 3]) {
    const sim = S.createSim({ seed, mission: M.MISSION_1 }); S.runSim(sim, 300);
    assert.equal(sim.ride, undefined);
    for (const u of sim.units) { assert.equal('ride' in u, false); assert.equal('dazed' in u, false); }
  }
  // 乗る命令が1度もない sim は、命令を知らない sim と同じ乱数・同じ結果
  const a = S.createSim({ seed: 4, mission: M.MISSION_1 }), b = S.createSim({ seed: 4, mission: M.MISSION_1 });
  S.runSim(a, 400); S.runSim(b, 400);
  assert.equal(S.hashSimDeep(a), S.hashSimDeep(b));
  // 乗れない命令（遠い）を出しても sim は変わらない
  const c = S.createSim({ seed: 4, mission: M.MISSION_1 });
  const h = c.units.find(u => u.human), r = c.units.find(u => u.kind === 'ponco');
  assert.equal(R.issueBoard(c, h.id, r.id, 'back').ok, false);
  assert.equal(c.ride, undefined, '乗れない命令では sim.ride を作らない');
  S.runSim(c, 400); assert.equal(S.hashSimDeep(c), S.hashSimDeep(a));
});

test('乗っている人を混ぜても本編のミッションが壊れない（乗る命令を出して 1200 ステップ）', () => {
  const sim = S.createSim({ seed: 1, mission: M.MISSION_1 });
  const h = sim.units.find(u => u.human), p = sim.units.find(u => u.kind === 'ponco');
  h.x = p.x + 10; h.y = p.y;
  assert.equal(R.issueBoard(sim, h.id, p.id, 'back').ok, true);
  S.runSim(sim, 1200);
  for (const u of sim.units) assert.ok(Number.isFinite(u.x) && Number.isFinite(u.y) && Number.isFinite(u.hp));
});

test('乗る数はデータの表で決まる（表を書きかえるだけで増減できる形）', () => {
  assert.equal(R.rideCapacity({ kind: 'giant' }, 'inside'), 2);
  assert.equal(R.rideCapacity({ kind: 'giant' }, 'back'), 0);
  assert.equal(R.rideCapacity({ kind: 'ponco' }, 'back'), 1);
  assert.equal(R.rideCapacity({ kind: 'ponco' }, 'inside'), 0);
  assert.equal(R.rideCapacity({ kind: 'alien' }, 'back'), 0);
  assert.equal(R.rideCapacity(null, 'back'), 0);
});

test('乗っている人は撃てない（v1.0.0）: 撃つ力を持たせても、乗っている間は狙わない。降りれば撃てる', () => {
  assert.equal(R.riderCannotShoot({ ride: { phase: 'boarding' } }), true);
  assert.equal(R.riderCannotShoot({}), false);
  const sim = mkSim(), boy = by(sim, '少年'), p1 = by(sim, 'PONCO02 1');
  Object.assign(boy, { atk: 5, range: 200, cooldown: 0.5 }); // 試しに撃てる人にする
  near(sim, boy, p1); R.issueBoard(sim, boy.id, p1.id, 'back'); run(sim, 40);
  const al = mkAlien(sim, p1.x + 60, p1.y); al.hp = al.maxHp = 1e6; sim.units.push(al);
  for (let i = 0; i < 60; i++) { run(sim, 1); assert.equal(boy.targetId ?? null, null, '乗っている人は狙わない'); }
  assert.equal(sim.fx.some(f => f.type === 'shot' && f.from === boy.id), false);
});

test('乗っている人も資材を集められる（v1.0.0）: 回収ポイントのそばに止まったロボの背中の人に cargo がたまる', () => {
  const sim = S.createSim({ seed: 1, mission: M.MISSION_1 });
  sim.units = sim.units.filter(u => u.side === 'ally'); sim.groups = [];
  const h = sim.units.find(u => u.human), p = sim.units.find(u => u.kind === 'ponco');
  const pile = sim.mission.salvage[0];
  p.x = pile.tx * 32 + 16; p.y = pile.ty * 32 + 16 + 20; p.order = null;
  h.x = p.x + 10; h.y = p.y;
  assert.equal(R.issueBoard(sim, h.id, p.id, 'back').ok, true);
  S.runSim(sim, 40); assert.equal(h.ride.phase, 'on');
  const c0 = h.cargo; S.runSim(sim, 90);
  assert.ok(h.cargo > c0, `背中の人も集めた（${c0} → ${h.cargo}）`);
});

test('背中の人に当たるのは 10%（v1.0.0）: 乱数 0.099 は当たり・0.10 は外れ。当たりはロボが受けた量の半分', () => {
  const host = { id: 1, kind: 'ponco' };
  const mk = (r, rider) => ({ units: [host, rider], time: 1, fx: [], rng: () => r });
  const a = { id: 2, hp: 30, ride: { host: 1, mode: 'back', phase: 'on' } };
  R.onHostHit(mk(0.099, a), host, 12); assert.equal(a.hp, 24, '当たり: 12 の半分');
  const b = { id: 3, hp: 30, ride: { host: 1, mode: 'back', phase: 'on' } };
  R.onHostHit(mk(0.10, b), host, 12); assert.equal(b.hp, 30, '外れ');
  // たくさん試すと、だいたい 10%
  let seed = 7, hits = 0; const rng = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let i = 0; i < 4000; i++) { const c = { id: 4, hp: 1e6, ride: { host: 1, mode: 'back', phase: 'on' } }; R.onHostHit({ units: [host, c], time: 1, fx: [], rng }, host, 10); if (c.hp < 1e6) hits++; }
  assert.ok(hits > 320 && hits < 480, `約10%（${hits}/4000）`);
});
