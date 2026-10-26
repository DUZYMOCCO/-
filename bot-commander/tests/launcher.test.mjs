// 発射台（?launcher=1 の試作。js/sim/launcher.js）のテスト。使わない時はシムの結果が1つも変わらないこと、
// 建造・引く・構え・飛ぶ・ダメージの下がり方・味方に当たらない・撃つ前に壊されると消える・1台1発・同じ結果になること。
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, stepSim, runSim, hashSim, hashSimDeep, unitById, fieldCount, KINDS, TICK, issueOrder } from '../js/sim/sim.js?v=28';
import { MISSION_1 } from '../js/sim/mission.js?v=10';
import { TILE, TERRAIN, tileAt, toTile } from '../js/sim/map.js?v=6';
import { createRecorder, makeStart, openReplay, stringifyReplay, parseReplay } from '../js/sim/replay.js?v=11';
import { selectKind } from '../js/sim/select.js?v=12';
import {
  LAUNCHER, TOW_KINDS, LAUNCHER_KINDS, launcherBlastDamage, blast, issueLauncherBuild, issueLauncherHitch, issueLauncherUnhitch, issueLauncherFire,
  launchersOf, canBuild, canFire, heldCount, provokeNear,
} from '../js/sim/launcher.js?v=4';

const SEC = Math.round(1 / TICK); // 1 秒＝30 step
const secs = (sim, s) => runSim(sim, Math.round(s * SEC));
const mk = (o = {}) => createSim({ seed: 1, mission: MISSION_1, launcher: true, ...o });
const BASE = { 1: '6cc93eb6', 2: '2a60b985', 3: '24994a28', 4: '5558d677', 5: '6e46d4aa' }; // 主局面 300 tick（v1.0.1 の値。tools / refs/hash300.mjs と同じ）

/** 発射台を 1 台作って（資材 50 を足してから）できあがるまで進める */
function withLauncher(sim) {
  sim.mission.delivered = 50;
  assert.ok(issueLauncherBuild(sim).ok);
  secs(sim, LAUNCHER.buildSec + 1);
  const l = launchersOf(sim)[0];
  assert.ok(l, '発射台ができている');
  return l;
}
/** 敵を地図の上のどこかへ置く（検査用。群れの AI の動きを止めるため、巡回の群れを 1 体だけ残す前提で使う） */
const moveTo = (u, x, y) => { u.x = x; u.y = y; };
/** 森でも山でもない（地形の守りが 1）の場所を探す */
function plainSpot(sim, near) {
  for (let r = 0; r < 20; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const tx = near.tx + dx, ty = near.ty + dy;
    if (TERRAIN[tileAt(sim.map, tx, ty)]?.key === 'plain') return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
  }
  throw new Error('平らな場所がない');
}
/** 敵を全部消す（巡回の AI が動き回らない・撃ってこないようにする） */
function clearEnemies(sim) { sim.units = sim.units.filter(u => u.side !== 'enemy'); sim.groups = []; }

test('有効にしない時は、シムの結果が1つも変わらない（seed 1〜5 の 300 tick のハッシュ・乱数の位置）', () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const a = runSim(createSim({ seed, mission: MISSION_1 }), 300);
    assert.equal(hashSim(a), BASE[seed], `seed ${seed}`);
    assert.equal(a.launcher, undefined, 'sim.launcher を作らない');
    const b = runSim(createSim({ seed, mission: MISSION_1, launcher: true }), 300); // 有効でも使わなければ同じ（ハッシュに何も混ぜない・乱数を引かない）
    assert.equal(hashSim(b), BASE[seed], `seed ${seed}（有効・未使用）`);
    assert.equal(hashSimDeep(b), hashSimDeep(a));
    assert.equal(b.rng.state(), a.rng.state(), '乱数を 1 回も多く引かない');
  }
});

test('有効にしていない sim に命令を出しても何も起きない・ミッションなし（撃ち合い）では作らない', () => {
  const sim = createSim({ seed: 1, mission: MISSION_1 });
  sim.mission.delivered = 50;
  assert.equal(issueLauncherBuild(sim).ok, false);
  sim.commands.push({ type: 'launcherBuild' }); // 無理に入れても、applyCommands が捨てる
  const before = hashSim(sim);
  secs(sim, 70);
  assert.equal(sim.units.filter(u => u.kind === 'launcher').length, 0);
  const ctl = createSim({ seed: 1, mission: MISSION_1 }); ctl.mission.delivered = 50; secs(ctl, 70);
  assert.equal(sim.mission.delivered, ctl.mission.delivered, '資材は引かれない（命令を出さなかった sim と同じ）');
  assert.equal(sim.launcher, undefined);
  assert.notEqual(before, undefined);
  assert.equal(createSim({ seed: 1, launcher: true }).launcher, undefined, 'ミッションなしでは作らない');
});

test('爆発のダメージ: 1.5 タイル以内は 600・3 タイルで 200 まで直線・その外は 0（乱数なしの純粋な関数）', () => {
  assert.equal(LAUNCHER.radius, 96); assert.equal(LAUNCHER.coreRadius, 48);
  assert.equal(launcherBlastDamage(0), 600);
  assert.equal(launcherBlastDamage(24), 600);
  assert.equal(launcherBlastDamage(48), 600);
  assert.equal(launcherBlastDamage(72), 400, '真ん中は (600+200)/2 ではなく直線: 1.5〜3 タイルの中間で 400');
  assert.equal(launcherBlastDamage(96), 200);
  assert.equal(launcherBlastDamage(96.01), 0);
  assert.equal(launcherBlastDamage(500), 0);
  assert.equal(launcherBlastDamage(NaN), 0); assert.equal(launcherBlastDamage(-1), 0);
  let prev = Infinity; for (let d = 48; d <= 96; d += 4) { const v = launcherBlastDamage(d); assert.ok(v <= prev, '遠いほど弱い'); prev = v; }
  assert.equal(launcherBlastDamage(60), launcherBlastDamage(60), '同じ入力は同じ値');
});

test('建造: 資材から費用が引かれ、時間がかかる。足りない・もう持っている時は作れない（ロボの数に数えない）', () => {
  const sim = mk();
  assert.deepEqual(canBuild(sim), { ok: false, reason: 'cost' }, '資材 0 では作れない');
  assert.equal(issueLauncherBuild(sim).ok, false);
  sim.mission.delivered = 50;
  const robots0 = fieldCount(sim).robots;
  const ctl = mk(); ctl.mission.delivered = 50; stepSim(ctl); // 比べる相手: 作らない sim（リペアラー・サポーターが払う分は同じ）
  assert.ok(issueLauncherBuild(sim).ok);
  stepSim(sim);
  assert.equal(ctl.mission.delivered - sim.mission.delivered, LAUNCHER.cost, '費用は作り始めに払う（資材 20）');
  assert.equal(sim.launcher.builds.length, 1);
  assert.equal(heldCount(sim), 1);
  assert.equal(canBuild(sim).reason, 'limit', '建造中でも同時に持てる数に入る（1 台）');
  secs(sim, LAUNCHER.buildSec - 2);
  assert.equal(launchersOf(sim).length, 0, '時間がかかる（まだできていない）');
  secs(sim, 3);
  const l = launchersOf(sim)[0];
  assert.ok(l && l.kind === 'launcher' && l.side === 'ally');
  assert.equal(l.maxHp, 150); assert.equal(l.shieldMax, 0); assert.equal(l.armor, 0); assert.equal(l.kits, 0);
  assert.equal(l.speed, 0, '自分では動けない');
  const ex = sim.mission.extraction;
  assert.ok(Math.abs(toTile(l.x) - ex.tx) <= 2 && Math.abs(toTile(l.y) - ex.ty) <= 2, '資材の届け先（仮の拠点）に出る');
  assert.equal(fieldCount(sim).robots, robots0, 'ロボの数（FIELD_CAP）に数えない');
  assert.equal(canBuild(sim).reason, 'limit', 'できた発射台も 1 台の枠');
  assert.equal(sim.launcher.spent, LAUNCHER.cost);
});

test('建造は敵・資材の乱数を使わない・味方の選択に出ない・全滅の判定に数えない', () => {
  const sim = mk(); const robots = sim.units.filter(u => u.side === 'ally' && !u.human).length;
  const l = withLauncher(sim);
  assert.equal(l.aiAlly, true);
  assert.ok(!selectKind(sim.units, 'all').includes(l.id), 'プレイヤーは選べない');
  assert.equal(sim.units.filter(u => u.side === 'ally' && !u.human && !u.aiAlly).length, robots);
  for (const u of sim.units.filter(v => v.side === 'ally' && !v.human && !v.aiAlly)) u.hp = 0; // ロボが全部やられて少年が自由なら続く（発射台だけ残っても続けられない）
  stepSim(sim);
  assert.equal(sim.result !== 'lose' || sim.resultReason === 'wiped', true);
});

test('引く: 速さは引くロボの 0.6 倍・外すと戻る・遠ければロボが寄っていってからつなぐ・引けない種類がある', () => {
  assert.ok(TOW_KINDS.includes('scav') && !TOW_KINDS.includes('boy') && !TOW_KINDS.includes('flyer') && !TOW_KINDS.includes('amph'));
  const run = hitch => {
    const sim = mk(); clearEnemies(sim);
    const l = withLauncher(sim);
    const t = sim.units.find(u => u.kind === 'scav');
    moveTo(t, l.x + 14, l.y + 6); t.order = null;
    if (hitch) { assert.ok(issueLauncherHitch(sim, t.id).ok); stepSim(sim); assert.equal(t.tow, l.id); assert.equal(l.launch.towId, t.id); assert.equal(t.speedMul, LAUNCHER.towMul); }
    const tx = toTile(t.x), ty = toTile(t.y) + 8;
    const x0 = t.x, y0 = t.y;
    issueOrder(sim, [t.id], [{ tx, ty }], { mode: 'rush' });
    secs(sim, 6);
    return { d: Math.hypot(t.x - x0, t.y - y0), sim, t, l };
  };
  const free = run(false), tow = run(true);
  assert.ok(free.d > 40, `引かない時は進む（${free.d.toFixed(1)}）`);
  assert.ok(Math.abs(tow.d / free.d - LAUNCHER.towMul) < 0.08, `引くと 0.6 倍（${(tow.d / free.d).toFixed(3)}）`);
  assert.ok(Math.hypot(tow.l.x - tow.t.x, tow.l.y - tow.t.y) < 40, '発射台はロボについてくる');
  assert.ok(Math.hypot(free.l.x - free.t.x, free.l.y - free.t.y) > 80, '引かないと置いていかれる');
  // 外す → 速さが戻る
  assert.ok(issueLauncherUnhitch(tow.sim, tow.t.id).ok); stepSim(tow.sim);
  assert.equal(tow.t.speedMul, 1); assert.equal(tow.t.tow, null); assert.equal(tow.l.launch.towId, null);
  assert.equal(issueLauncherUnhitch(tow.sim, tow.t.id).reason, 'notTowed');
  // 人間は引けない・発射台がなければ引けない
  const sim = mk(); const boy = sim.units.find(u => u.kind === 'boy');
  assert.equal(issueLauncherHitch(sim, boy.id).ok, false);
  assert.equal(issueLauncherHitch(sim, sim.units.find(u => u.kind === 'scav').id).reason, 'none');
});

test('遠い発射台へは、ロボが寄っていって、着いたらつなぐ', () => {
  const sim = mk(); clearEnemies(sim);
  const l = withLauncher(sim);
  const t = sim.units.find(u => u.kind === 'ponco');
  moveTo(t, l.x + 6 * TILE, l.y + 2 * TILE); t.order = null;
  assert.ok(issueLauncherHitch(sim, t.id).ok);
  stepSim(sim);
  assert.ok(!t.tow, 'まだ遠い');
  assert.equal(sim.launcher.pending.length, 1);
  secs(sim, 12);
  assert.equal(t.tow, l.id, '着いたらつなぐ');
  assert.equal(sim.launcher.pending.length, 0);
});

test('撃てる距離: 発射台から 12 タイル（384 px）まで。それより遠いと撃てない・地図の外も撃てない', () => {
  assert.equal(LAUNCHER.range, 384);
  const sim = mk(); clearEnemies(sim);
  const l = withLauncher(sim);
  assert.equal(canFire(sim, l, l.x, l.y + 384).ok, true);
  const far = canFire(sim, l, l.x, l.y + 385);
  assert.deepEqual([far.ok, far.reason], [false, 'far']);
  assert.equal(issueLauncherFire(sim, l.id, l.x, l.y + 400).ok, false);
  assert.equal(sim.commands.length, 0, '撃てない時は命令を出さない');
  assert.equal(canFire(sim, l, -5, 10).reason, 'out');
  assert.equal(canFire(sim, null, 10, 10).reason, 'none');
  assert.ok(issueLauncherFire(sim, l.id, l.x + 200, l.y + 100).ok);
});

/** 敵 1 体だけの場面で発射台を作り、(dx,dy) の地点を撃てる位置にそろえる */
function arena() {
  const sim = mk();
  const spot = plainSpot(sim, { tx: 20, ty: 40 });
  const l = withLauncher(sim);
  const ally = sim.units.filter(u => u.side === 'ally' && u.id !== l.id);
  const enemies = sim.units.filter(u => u.side === 'enemy');
  const keep = enemies[0]; sim.units = sim.units.filter(u => u.side !== 'enemy' || u === keep); sim.groups = []; keep.groupId = null; keep.atk = 0; // 検査用: 1 体だけ・撃たない・動かない
  keep.order = null; keep.stance = 'hold';
  moveTo(l, spot.x, spot.y - 200); l.moving = false;
  for (const a of ally) { moveTo(a, spot.x - 5000, spot.y - 5000); a.x = 20; a.y = 20; } // 味方は爆発から遠く（あとで必要な物だけ近くへ）
  return { sim, l, keep, spot, ally };
}

test('構えに入ったら取り消せない（10/26 の決定）: 撃ち直し・つなぐ・はずす・動かす命令は効かず、4 秒で同じ場所へ撃つ。「構えをやめる」の命令も ☰ の項目もない', async () => {
  const { sim, l, spot, ally } = arena();
  assert.ok(issueLauncherFire(sim, l.id, spot.x, spot.y).ok);
  stepSim(sim);
  assert.equal(l.launch.phase, 'aim');
  const tower = ally.find(u => TOW_KINDS.includes(u.kind)); moveTo(tower, l.x + 20, l.y);
  assert.equal(issueLauncherFire(sim, l.id, spot.x + 64, spot.y).ok, false, '撃ち直しはできない');
  issueLauncherHitch(sim, tower.id); sim.commands.push({ type: 'launcherFire', launcherId: l.id, x: spot.x + 64, y: spot.y }); // 直接入れても効かない
  issueOrder(sim, [l.id], [{ tx: 5, ty: 5 }]);
  secs(sim, 4 + TICK * 2);
  assert.equal(sim.launcher.shots.length, 1, '4 秒で撃った');
  assert.equal(sim.launcher.shots[0].x, Math.round(spot.x)); assert.equal(sim.launcher.shots[0].y, Math.round(spot.y));
  assert.equal(tower.tow ?? null, null, 'つながっていない');
  const { readFileSync } = await import('node:fs');
  const src = ['../js/sim/launcher.js', '../js/ui/launcher-menu.js'].map(f => readFileSync(new URL(f, import.meta.url), 'utf8')).join('\n');
  assert.ok(!/launcherCancel|cancelAim|構えをやめる/.test(src));
});

test('構えと飛ぶ時間: 構え 4 秒 → 発射台は消えてミサイルが飛ぶ 3 秒 → 着弾。着弾の印は撃つ命令から着弾まで出る', () => {
  assert.equal(LAUNCHER.aimSec, 4); assert.equal(LAUNCHER.flightSec, 3);
  const { sim, l, keep, spot } = arena();
  moveTo(keep, spot.x, spot.y); keep.hp = keep.maxHp;
  assert.ok(issueLauncherFire(sim, l.id, spot.x, spot.y).ok);
  stepSim(sim);
  assert.equal(l.launch.phase, 'aim');
  secs(sim, 3.5 - TICK);
  assert.equal(l.launch.phase, 'aim', '構え 4 秒の間');
  assert.equal(sim.launcher.shots.length, 0);
  assert.equal(launchersOf(sim).length, 1, 'まだ発射台がある');
  secs(sim, 0.5 + TICK * 2);
  assert.equal(launchersOf(sim).length, 0, '撃つと発射台ごとなくなる');
  assert.equal(sim.launcher.shots.length, 1, 'ミサイルが飛んでいる');
  assert.equal(sim.launcher.fired, 1);
  assert.equal(keep.hp, keep.maxHp, 'まだ当たっていない');
  secs(sim, 2.8);
  assert.equal(sim.launcher.shots.length, 1, '飛ぶのは 3 秒');
  assert.equal(unitById(sim, keep.id) != null, true);
  secs(sim, 0.3);
  assert.equal(sim.launcher.shots.length, 0);
  assert.ok(sim.fx.some(f => f.type === 'launcherBlast') || !unitById(sim, keep.id), '着弾した');
  stepSim(sim);
  assert.equal(unitById(sim, keep.id), null, '中心の敵は 600 で倒れる（HP 360）');
});

test('ダメージの下がり方（実際の爆発）: 中心 600・1.5 タイルまで 600・3 タイルで 200・その外は 0。森・山の守りが効く', () => {
  const { sim, keep, spot } = arena();
  const def = d => { const t = TERRAIN[tileAt(sim.map, toTile(keep.x), toTile(keep.y))]; return t.def; };
  const cases = [[0, 600], [48, 600], [72, 400], [96, 200], [97, 0], [200, 0]];
  keep.maxHp = keep.hp = 100000;
  for (const [d, raw] of cases) {
    moveTo(keep, spot.x + d, spot.y); keep.hp = 100000; keep.lastHit = -99;
    const rng0 = sim.rng.state();
    blast(sim, spot.x, spot.y);
    assert.equal(sim.rng.state(), rng0, '爆発は乱数を引かない');
    assert.equal(100000 - keep.hp, Math.round(raw * def()), `距離 ${d}px: ${raw}（地形の守り ${def()}）`);
  }
  // 地形の守り: 森（0.8）の敵には 0.8 倍
  let forest = null;
  for (let ty = 0; ty < sim.map.h && !forest; ty++) for (let tx = 0; tx < sim.map.w; tx++) if (TERRAIN[tileAt(sim.map, tx, ty)].key === 'forest') { forest = { x: tx * TILE + 16, y: ty * TILE + 16 }; break; }
  if (forest) {
    moveTo(keep, forest.x, forest.y); keep.hp = 100000;
    blast(sim, forest.x, forest.y);
    assert.equal(100000 - keep.hp, Math.round(600 * TERRAIN[tileAt(sim.map, toTile(forest.x), toTile(forest.y))].def));
    assert.ok(100000 - keep.hp < 600, '森の中は少し軽くなる');
  }
});

test('味方に当たらない: ロボ・人間・発射台どれも、中心に重なっていても無傷（敵は倒れる）', () => {
  const { sim, keep, spot } = arena();
  moveTo(keep, spot.x + 10, spot.y);
  const robot = sim.units.find(u => u.kind === 'ponco'), boy = sim.units.find(u => u.kind === 'boy'), scav = sim.units.find(u => u.kind === 'scav');
  for (const u of [robot, boy, scav]) { moveTo(u, spot.x + 5, spot.y + 5); u.order = null; u.captured = null; }
  const hp = [robot, boy, scav].map(u => [u.hp, u.shieldHp]);
  const l = launchersOf(sim)[0]; moveTo(l, spot.x, spot.y); // 味方の発射台も爆心地へ
  const hl = l.hp;
  const hits = blast(sim, spot.x, spot.y);
  assert.ok(hits.some(h => h.id === keep.id), '敵には当たる');
  assert.deepEqual([robot, boy, scav].map(u => [u.hp, u.shieldHp]), hp, 'ロボ・人間の HP と盾は変わらない');
  assert.equal(l.hp, hl, '発射台も当たらない');
  assert.ok(!hits.some(h => [robot.id, boy.id, scav.id, l.id].includes(h.id)));
});

test('遮蔽物は壊れる。壊れきらなければ落とし物も乱数もなし', () => {
  const { sim, spot } = arena();
  const c = sim.cover[0]; assert.ok(c);
  c.hp = c.maxHp = 100000; // 壊れきらない
  const hp0 = c.hp, items0 = sim.items.length, rs = sim.rng.state();
  blast(sim, c.cx, c.cy);
  assert.ok(c.hp < hp0, '遮蔽物が傷む');
  assert.equal(sim.items.length, items0, '壊れていなければ落とし物は出ない');
  assert.equal(sim.rng.state(), rs, '壊れていなければ乱数を引かない');
  assert.ok(spot);
});

test('爆発で壊れた遮蔽物は、弾で壊れた時と同じ抽選で落とし物を出す（10/26 の決定）', () => {
  let dropped = 0, broke = 0;
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const sim = mk({ seed });
    for (const c of sim.cover) {
      if (c.state === 'rubble') continue;
      c.hp = 1; // 爆発で必ず壊れる
      const items0 = sim.items.length, rs = sim.rng.state();
      blast(sim, c.cx, c.cy);
      assert.equal(c.state, 'rubble'); broke++;
      assert.notEqual(sim.rng.state(), rs, '壊れた時は抽選の乱数を引く');
      for (const it of sim.items.slice(items0)) {
        dropped++;
        assert.ok(['repair', 'weapon'].includes(it.type), it.type);
        if (it.type === 'weapon') assert.ok(it.weapon);
        assert.ok(sim.fx.some(f => f.type === 'drop' && f.itemId === it.id), '落とし物の fx も出る');
      }
    }
  }
  assert.ok(broke > 10 && dropped > 0, `${broke} 個壊して ${dropped} 個落ちた`);
});

test('着弾すると、着弾点の近くの巡回の群れが気づいて撃った側へ向かってくる（遠い群れは気づかない。10/26 の決定）', () => {
  const sim = mk();
  const pats = sim.groups.filter(g => g.role === 'patrol');
  assert.ok(pats.length >= 2);
  const g = pats[0], m = sim.units.find(u => u.id === g.unitIds[0]);
  const far = pats.find(h => h !== g && h.unitIds.every(id => { const u = sim.units.find(v => v.id === id); return !u || Math.hypot(u.x - m.x, u.y - m.y) > LAUNCHER.provokeTiles * TILE + 10; }));
  const shooter = sim.units.find(u => u.kind === 'ponco');
  const rs = sim.rng.state();
  const n = provokeNear(sim, { x0: shooter.x, y0: shooter.y, x: m.x + 2 * TILE, y: m.y });
  assert.ok(n >= 1);
  assert.equal(g.provokedBy, shooter.id, '撃った場所にいちばん近い味方を追う');
  if (far) assert.equal(far.provokedBy ?? null, null, '遠い群れは気づかない');
  assert.equal(sim.rng.state(), rs, '乱数は引かない');
  assert.ok(sim.fx.some(f => f.type === 'launcherProvoke'));
  stepSim(sim);
  assert.ok(g.alert > 0.9); assert.equal(g.ai, 'chase'); assert.equal(g.targetId, shooter.id);
});

test('着弾の通しで、気づかせる処理が呼ばれる（stepLauncher → blast → provokeNear）', () => {
  const sim = mk();
  const g = sim.groups.find(g => g.role === 'patrol'), m = sim.units.find(u => u.id === g.unitIds[0]);
  const shooter = sim.units.find(u => u.kind === 'ponco');
  sim.launcher.shots.push({ x0: shooter.x, y0: shooter.y, x: m.x, y: m.y, left: TICK / 2, total: 3 });
  stepSim(sim);
  assert.ok(sim.fx.some(f => f.type === 'launcherBlast'));
  assert.ok(g.provokedBy === shooter.id || g.ai === 'chase' || !sim.units.some(u => g.unitIds.includes(u.id) && u.hp > 0), '気づいた（または全滅した）');
});

test('撃つ前に壊されると、発射台もミサイルも消える（まわりにダメージなし・負けにしない）', () => {
  const { sim, l, keep, spot } = arena();
  moveTo(keep, spot.x + 20, spot.y); // 敵が撃つ地点のそばにいる
  const robot = sim.units.find(u => u.kind === 'ponco'); moveTo(robot, spot.x + 40, spot.y + 10); robot.atk = 0; // 検査用: 撃たない
  const hp = [keep.hp, robot.hp, robot.shieldHp];
  assert.ok(issueLauncherFire(sim, l.id, spot.x, spot.y).ok);
  secs(sim, 2);
  assert.equal(l.launch.phase, 'aim');
  l.hp = 0; // 構えの途中で壊された
  stepSim(sim);
  assert.equal(launchersOf(sim).length, 0, '発射台は消える');
  secs(sim, 1);
  assert.equal(sim.launcher.lost, 1);
  assert.equal(sim.fx.filter(f => f.type === 'launcherLost').length, 1); assert.equal(sim.launcher.lost, 1);
  secs(sim, 10);
  assert.equal(sim.launcher.shots.length, 0, 'ミサイルも消える（飛ばない）');
  assert.equal(sim.launcher.fired, 0);
  assert.deepEqual([keep.hp, robot.hp, robot.shieldHp], hp, 'まわりにダメージなし');
  assert.ok(!sim.fx.some(f => f.type === 'launcherBlast'));
  assert.notEqual(sim.result, 'lose', '負けにはしない');
  // 引いている最中に壊されても、引いていたロボの速さは戻る
  const sim2 = mk(); clearEnemies(sim2); const l2 = withLauncher(sim2); const t = sim2.units.find(u => u.kind === 'scav');
  moveTo(t, l2.x + 10, l2.y); t.order = null; issueLauncherHitch(sim2, t.id); stepSim(sim2);
  assert.equal(t.speedMul, LAUNCHER.towMul);
  l2.hp = 0; secs(sim2, 1);
  assert.equal(t.speedMul, 1); assert.equal(t.tow, null);
});

test('1 台 1 発: 撃つと発射台がなくなり、同じ発射台で 2 発目は撃てない・構え中の再命令も受けない', () => {
  const { sim, l, spot } = arena();
  assert.ok(issueLauncherFire(sim, l.id, spot.x, spot.y).ok);
  stepSim(sim);
  assert.equal(issueLauncherFire(sim, l.id, spot.x + 30, spot.y).reason, 'busy', '構えている間は別の命令を受けない');
  secs(sim, 4.2);
  assert.equal(launchersOf(sim).length, 0);
  assert.equal(issueLauncherFire(sim, l.id, spot.x, spot.y).ok, false, '消えた発射台は撃てない');
  sim.commands.push({ type: 'launcherFire', launcherId: l.id, x: Math.round(spot.x), y: Math.round(spot.y) }); // 無理に入れても何も起きない
  secs(sim, 1);
  assert.equal(sim.launcher.fired, 1);
  assert.equal(sim.launcher.shots.length, 1);
  // 撃ったあとは、資材があれば新しく作れる（1 台の枠が空く）
  sim.mission.delivered = Math.max(sim.mission.delivered, 30);
  assert.equal(canBuild(sim).ok, true);
});

test('撃つと、引いているロボは自動で外れる（速さも戻る）', () => {
  const sim = mk(); clearEnemies(sim); const l = withLauncher(sim);
  const t = sim.units.find(u => u.kind === 'scav'); moveTo(t, l.x + 10, l.y); t.order = null;
  assert.ok(issueLauncherHitch(sim, t.id).ok); stepSim(sim);
  assert.equal(l.launch.towId, t.id);
  assert.ok(issueLauncherFire(sim, l.id, l.x + 100, l.y + 100).ok); stepSim(sim);
  assert.equal(l.launch.towId, null); assert.equal(t.tow, null); assert.equal(t.speedMul, 1);
  assert.equal(l.launch.phase, 'aim');
  const x = l.x, y = l.y; issueOrder(sim, [t.id], [{ tx: toTile(t.x) + 3, ty: toTile(t.y) }], { mode: 'rush' }); secs(sim, 2);
  assert.equal([l.x, l.y].join(), [x, y].join(), '構え中の発射台は動かない');
});

test('同じ seed・同じ命令なら同じ結果（ハッシュ・深いハッシュ）。記録と再生でも一致する', () => {
  const script = sim => {
    sim.mission.delivered = 50;
    issueLauncherBuild(sim);
    secs(sim, 62);
    const l = launchersOf(sim)[0], t = sim.units.find(u => u.kind === 'scav');
    t.x = l.x + 10; t.y = l.y;
    issueLauncherHitch(sim, t.id); stepSim(sim);
    issueOrder(sim, [t.id], [{ tx: toTile(t.x), ty: toTile(t.y) + 10 }], { mode: 'rush' });
    secs(sim, 10);
    issueLauncherFire(sim, l.id, l.x + 100, l.y + 50);
    secs(sim, 9);
  };
  const a = mk({ seed: 3 }), b = mk({ seed: 3 });
  script(a); script(b);
  assert.equal(hashSim(a), hashSim(b)); assert.equal(hashSimDeep(a), hashSimDeep(b));
  assert.ok(a.launcher.fired === 1 || a.launcher.lost === 1);
  assert.notEqual(hashSim(a), hashSim(mk({ seed: 3 })), '使うとハッシュに出る');
  // 記録（js/sim/replay.js）: 命令は '?' の形でそのまま写る。makeStart の launcher の印で、同じ条件の sim を作り直す
  const sim = mk({ seed: 2 });
  const rec = createRecorder(sim, makeStart({ seed: 2, launcher: true }));
  sim.mission.delivered = 50; // 検査の都合: 始まりの条件に入らない値は、再生の前にもそろえる
  rec.sim.commands.push({ type: 'launcherBuild' });
  for (let i = 0; i < 40; i++) rec.step();
  assert.equal(sim.launcher.builds.length, 1);
  const snap = rec.snapshot();
  assert.equal(snap.start.launcher, true);
  assert.ok(snap.cmds.some(c => c[2].some(p => p[0] === '?' && p[1].type === 'launcherBuild')), '発射台の命令も記録される');
  assert.ok(parseReplay(stringifyReplay(snap)).ok, '書き出して読み直せる');
  assert.equal(makeStart({ seed: 1 }).launcher, undefined, 'ふつうの記録の形は変わらない');
  const rp = openReplay(snap);
  assert.ok(rp.ok); assert.equal(rp.sim.launcher != null, true);
});

test('発射台の種類: KINDS.launcher（お話と共通・物）が先に使われる。LAUNCHER_KINDS は予備', () => {
  assert.equal(KINDS.launcher.object, true, '発射台の種類はお話ミッション（strike.js）と同じ KINDS.launcher を使う（物として扱う＝選べない・残ったロボに数えない）');
  assert.equal(LAUNCHER_KINDS.launcher.hp, 150); assert.equal(LAUNCHER_KINDS.launcher.speed, 0); assert.equal(LAUNCHER_KINDS.launcher.atk, 0);
  assert.ok(Object.isFrozen(LAUNCHER_KINDS.launcher));
});

test('敵は発射台も狙う（ほかの味方と同じ）。壊されたら消えるだけで、負けにならない', () => {
  const sim = mk(); const l = withLauncher(sim);
  const e = sim.units.find(u => u.side === 'enemy' && u.kind === 'alien');
  moveTo(e, l.x + 20, l.y); // すぐそば
  const hp0 = l.hp;
  secs(sim, 20);
  assert.ok(l.hp < hp0 || launchersOf(sim).length === 0, '敵に撃たれて傷む');
  secs(sim, 60);
  assert.notEqual(sim.result, 'win');
});

test('入口: URL の ?launcher=1 の時だけ有効（index.js の呼び出しの形）。付けない時の記録の形・sw-assets の一覧', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../js/index.js', import.meta.url), 'utf8');
  assert.ok(src.includes("launcher: params.get('launcher') === '1' && !this.story"), 'createSim に渡すのは ?launcher=1 の時だけ（物語は対象外）');
  assert.ok(src.includes('if (sim.launcher) this.launcherUi'), '☰ の項目・描く部品は sim.launcher がある時だけ');
  assert.ok(!/import[^\n]*launcher-(menu|view)/.test(src.split('\n').filter(l => l.startsWith('import ')).join('\n')), '最初の import には入れない（付けない時は読み込まない）');
  const sw = readFileSync(new URL('../sw-assets.js', import.meta.url), 'utf8');
  for (const f of ['js/sim/launcher.js', 'js/render/launcher-view.js', 'js/ui/launcher-menu.js', 'css/launcher.css']) assert.ok(sw.includes(`'${f}'`), `sw-assets.js に ${f}`);
  assert.equal(/version: 'v47'/.test(sw) && /gameVersion: '1\.0\.8'/.test(sw), true, 'v1.0.8 / キャッシュ v47（v1.0.7 / v46 の次）');
  assert.ok(!('strike' in createSim({ seed: 1, mission: MISSION_1, launcher: true })), 'sim.strike は作らない');
});

test('ロボと人が全部いなくなったら、発射台が残っていても負け（発射台は「残ったロボ」に数えない）', () => {
  const sim = mk();
  withLauncher(sim);
  clearEnemies(sim);
  sim.units = sim.units.filter(u => u.side !== 'ally' || u.kind === 'launcher');
  assert.equal(sim.units.filter(u => u.side === 'ally').length, 1, '味方は発射台だけ');
  stepSim(sim);
  assert.equal(sim.result, 'lose');
  assert.equal(sim.resultReason, 'wiped');
});


test('通常発射台はタップで選べ、HPと発射ボタンが出るがロボ枠と残数に入らない', async () => {
  const { allyAt, pruneSelection } = await import('../js/sim/select.js?v=12');
  const { createHpNumbers } = await import('../js/render/hp-numbers.js?v=2');
  const { fireButtonState } = await import('../js/ui/fire-button.js?v=2');
  const sim = mk(); clearEnemies(sim); const l = withLauncher(sim);
  assert.equal(allyAt([l], l.x, l.y - 12, 20), l);
  assert.deepEqual(pruneSelection(sim.units, [l.id]), [l.id]);
  assert.equal(fireButtonState(sim, [l.id]).visible, true);
  assert.equal(createHpNumbers().update(sim, 0, {selected: new Set([l.id])}).labels.find(x => x.u === l).text, '150/150');
  assert.equal(l.object, true); assert.ok(!sim.units.filter(u => u.side === 'ally' && !u.human && !u.object).includes(l));
});

test('引いた機体にミサイルの与ダメージと撃破を計上し構えの命令は取り消せない', async () => {
  const { createUnitStats } = await import('../js/stats/unit-stats.js?v=2');
  const sim = mk(); const l = withLauncher(sim), t = sim.units.find(u => u.kind === 'scav');
  const stat = createUnitStats(); stat.observe(sim);
  t.x = l.x + 10; t.y = l.y; assert.ok(issueLauncherHitch(sim, t.id).ok); stepSim(sim);
  const target = sim.units.find(u => u.side === 'enemy'); target.x = l.x + 20; target.y = l.y; target.hp = 10000;
  assert.ok(issueLauncherFire(sim, l.id, target.x, target.y).ok); stepSim(sim);
  assert.equal(l.launch.phase, 'aim'); assert.equal(issueLauncherFire(sim, l.id, target.x, target.y).ok, false);
  target.hp = 1; const hits = blast(sim, target.x, target.y, l.launch.lastTowId); stat.observe(sim); stat.observe(sim);
  const row = stat.summary().rows.find(r => r.id === t.id);
  assert.ok(hits.some(h => h.id === target.id)); assert.ok(row.dealt > 0); assert.ok(row.kills >= 1);
});
