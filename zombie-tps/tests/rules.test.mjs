import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WEAPONS, WEAPON_ORDER, DEFAULT_WEAPON, fireInterval, damageAt, createGun, updateGun, tryFire, startReload,
  ZOMBIES, waveSpec, waveQueue, killScore, HEADSHOT_BONUS, rayAABB, castShot, collideCircle, groundHeight,
  buildGrid, updateFlow, flowDir, cellOf, normalizeSave,
  blastFalloff, blastDamage, launchVelocity, knockAt, FLY_KNOCK, MAX_AIR, stickCurve, approach, refillReserve, VERSION,
} from '../js/rules.js';
import { buildMap, playerColliders, zombieColliders, HALF } from '../js/map.js';

test('さいしょの ぶきは アサルトライフル（30はつ フルオート）', () => {
  assert.equal(DEFAULT_WEAPON, 'rifle');
  assert.equal(WEAPON_ORDER[0], 'rifle');
  assert.equal(WEAPONS.rifle.mag, 30);
  assert.equal(WEAPONS.rifle.auto, true);
  assert.equal(WEAPONS.pistol.auto, false);
});

test('フルオート: おしっぱなしで fireInterval ごとに うてる', () => {
  const g = createGun('rifle');
  let shots = 0;
  for (let t = 0; t < 1; t += 1 / 120) { updateGun(g, 1 / 120); if (tryFire(g, true) === 'fire') shots++; }
  const expect = Math.floor(1 / fireInterval(WEAPONS.rifle)) + 1;
  assert.ok(Math.abs(shots - expect) <= 1, `${shots} vs ${expect}`);
  assert.equal(g.ammo, 30 - shots);
});

test('セミオート: おしなおしが いる、れんだでも はやすぎない', () => {
  const g = createGun('pistol');
  assert.equal(tryFire(g, true), 'fire');
  updateGun(g, 1);
  assert.equal(tryFire(g, true), 'none'); // はなしてない
  tryFire(g, false);
  assert.equal(tryFire(g, true), 'fire');
  // 1フレームごとに れんだ
  const g2 = createGun('pistol'); let n = 0;
  for (let i = 0; i < 120; i++) { updateGun(g2, 1 / 60); if (tryFire(g2, i % 2 === 0) === 'fire') n++; }
  assert.ok(n <= Math.ceil(2 / fireInterval(WEAPONS.pistol)) + 1, `pistol mash ${n}`);
});

test('からっぽで ひくと リロード、おわると たまが もどる', () => {
  const g = createGun('rifle');
  g.ammo = 0;
  assert.equal(tryFire(g, true), 'reload');
  assert.ok(g.reloading > 0);
  assert.equal(tryFire(g, true), 'none');
  let ev = null;
  for (let i = 0; i < 300 && !ev; i++) ev = updateGun(g, 1 / 60);
  assert.equal(ev, 'reloaded');
  assert.equal(g.ammo, 30);
  assert.equal(g.reserve, WEAPONS.rifle.reserve - 30);
  assert.equal(startReload(g), false); // まんたん
});

test('ハンドガンは よびだん むげん', () => {
  const g = createGun('pistol'); g.ammo = 0; startReload(g);
  updateGun(g, 5);
  assert.equal(g.ammo, 12); assert.equal(g.reserve, Infinity);
});

test('ダメージ: ヘッドショットは おおきい、とおいと へる', () => {
  const w = WEAPONS.rifle;
  assert.ok(damageAt(w, 5, true) > damageAt(w, 5, false) * 2);
  assert.ok(damageAt(w, 80, false) < damageAt(w, 5, false));
  assert.ok(damageAt(w, 80, false) > 0);
  // ライフル ヘッドショット 2はつで あるく ゾンビ
  assert.ok(damageAt(w, 10, true) * 2 >= ZOMBIES.walker.hp);
  assert.equal(killScore('walker', true), ZOMBIES.walker.score + HEADSHOT_BONUS);
});

test('ウェーブは だんだん むずかしく、さいしょは あるく ゾンビ', () => {
  let prev = 0;
  for (let n = 1; n <= 15; n++) {
    const s = waveSpec(n);
    assert.equal(s.walkers + s.runners + s.brutes, s.total);
    assert.ok(s.total >= prev); prev = s.total;
    const q = waveQueue(s, () => 0.3);
    assert.equal(q.length, s.total);
    assert.deepEqual(q.slice(0, 3), ['walker', 'walker', 'walker']);
  }
  assert.equal(waveSpec(1).runners, 0);
  assert.equal(waveSpec(1).brutes, 0);
  assert.ok(waveSpec(6).brutes >= 1);
});

test('rayAABB と castShot: あたまを ねらうと ヘッドショット、かべは さえぎる', () => {
  const b = { minX: -1, maxX: 1, minY: 0, maxY: 2, minZ: 4, maxZ: 6 };
  assert.ok(Math.abs(rayAABB(0, 1, 0, 0, 0, 1, b) - 4) < 1e-9);
  assert.equal(rayAABB(0, 3, 0, 0, 0, 1, b), -1);
  const zs = [{ x: 0, z: -10, scale: 1, alive: true }];
  const head = castShot(0, 1.7, 0, 0, 0, -1, zs, [], 50);
  assert.equal(head.kind, 'zombie'); assert.equal(head.head, true);
  const body = castShot(0, 1.0, 0, 0, 0, -1, zs, [], 50);
  assert.equal(body.kind, 'zombie'); assert.equal(body.head, false);
  const wall = { minX: -2, maxX: 2, minY: 0, maxY: 3, minZ: -6, maxZ: -5 };
  assert.equal(castShot(0, 1.7, 0, 0, 0, -1, zs, [wall], 50).kind, 'wall');
  zs[0].alive = false;
  assert.equal(castShot(0, 1.7, 0, 0, 0, -1, zs, [], 50).kind, 'none');
  const g = castShot(0, 1.6, 0, 0, -0.5, -1, [], [], 50);
  assert.equal(g.kind, 'ground'); assert.ok(Math.abs(g.y) < 1e-9);
});

test('collideCircle: かべを すりぬけない、ひくい はこには のれる', () => {
  const box = { minX: 0, maxX: 1, minY: 0, maxY: 1, minZ: -5, maxZ: 5 };
  const r = collideCircle(0.1, 0, 0.35, 0, [box]);
  assert.ok(r.x <= -0.35 + 1e-9 || r.x >= 1.35 - 1e-9);
  const on = collideCircle(0.5, 0, 0.35, 1, [box]);
  assert.equal(on.x, 0.5);
  assert.equal(groundHeight(0.5, 0, 0.35, 1.0, [box]), 1);
  assert.equal(groundHeight(3, 0, 0.35, 1.0, [box]), 0);
});

test('マップ: スタートは あいていて、ぜんぶの ゲートから プレイヤーに たどりつける', () => {
  const map = buildMap();
  const pc = playerColliders(map);
  const s = map.playerStart;
  const r = collideCircle(s.x, s.z, 0.35, 0, pc);
  assert.ok(Math.hypot(r.x - s.x, r.z - s.z) < 1e-9, 'start inside a collider');
  const grid = buildGrid(zombieColliders(map), HALF + 4, 1, 0.4);
  updateFlow(grid, s.x, s.z);
  for (const sp of map.spawns) {
    assert.ok(grid.dist[cellOf(grid, sp.x, sp.z)] >= 0, `spawn ${sp.x},${sp.z} unreachable`);
    // フローに そって あるけば つく
    let x = sp.x, z = sp.z, ok = false;
    for (let i = 0; i < 400; i++) {
      if (Math.hypot(x - s.x, z - s.z) < 1.5) { ok = true; break; }
      const d = flowDir(grid, x, z); if (!d) break;
      x += d.x * 0.5; z += d.z * 0.5;
    }
    assert.ok(ok, `walk from ${sp.x},${sp.z}`);
  }
});

test('セーブの よみこみ', () => {
  assert.deepEqual(normalizeSave(null), { bestWave: 0, bestScore: 0, autoFire: false, sens: 'mid', quality: 'auto', stage: 'day', flashlight: true });
  assert.equal(normalizeSave({ bestWave: 7, sens: 'zzz' }).sens, 'mid');
  assert.equal(normalizeSave({ bestWave: 7 }).bestWave, 7);
});

test('ロケットランチャー: スロット4、1はつずつ、よびだん すこし、ゆっくり リロード', () => {
  const w = WEAPONS.rocket;
  assert.equal(WEAPON_ORDER[3], 'rocket');
  assert.equal(w.slot, 4);
  assert.equal(DEFAULT_WEAPON, 'rifle');
  assert.equal(w.mag, 1);
  assert.ok(w.reserve >= 2 && w.reserve <= 5 && w.reserve !== Infinity);
  assert.ok(w.reload >= 2, 'リロードは ゆっくり');
  assert.ok(w.projectile && w.speed > 20 && w.blast > 3);
  const g = createGun('rocket');
  assert.equal(tryFire(g, true), 'fire');
  assert.equal(g.ammo, 0);
  updateGun(g, 2);
  assert.equal(tryFire(g, false), 'none');
  assert.equal(tryFire(g, true), 'reload');
  updateGun(g, w.reload + 0.01);
  assert.equal(g.ammo, 1);
  assert.equal(g.reserve, w.reserve - 1);
  // ウェーブで ほじゅう
  g.reserve = 0; refillReserve(g); assert.equal(g.reserve, w.reserve);
  const p = createGun('pistol'); refillReserve(p); assert.equal(p.reserve, Infinity);
});

test('ばくはつ: まんなかは フルダメージ、とおいほど よわく、そとは 0', () => {
  const w = WEAPONS.rocket;
  assert.equal(blastFalloff(0, w.blast), 1);
  assert.equal(blastFalloff(w.blast * 0.3, w.blast), 1);
  assert.ok(blastFalloff(w.blast * 0.7, w.blast) < 1 && blastFalloff(w.blast * 0.7, w.blast) > 0.25);
  assert.ok(blastFalloff(w.blast - 0.001, w.blast) >= 0.25);
  assert.equal(blastFalloff(w.blast, w.blast), 0);
  assert.equal(blastFalloff(w.blast + 3, w.blast), 0);
  assert.ok(blastDamage(w, 0) >= ZOMBIES.brute.hp, 'ちょくげきなら ブルートも いっぱつ');
  assert.ok(blastDamage(w, w.blast * 0.9) > 0 && blastDamage(w, w.blast * 0.9) < ZOMBIES.walker.hp * 2);
});

test('ふっとび: たかく とび、ばくしんから はなれる むき', () => {
  const v = launchVelocity(2, 0, 2, 4.5, WEAPONS.rocket.power, 0.5);
  assert.ok(v.vy > 8, 'たかく まいあがる');
  assert.ok(v.vx > 0 && Math.abs(v.vz) < 1e-9);
  const near = launchVelocity(0.5, 0.5, 0.7, 4.5, 13, 0.5), far = launchVelocity(3, 3, 4.2, 4.5, 13, 0.5);
  assert.ok(near.vy > far.vy);
  const c = launchVelocity(0, 0, 0, 4.5, 13, 0.5);
  assert.ok(Number.isFinite(c.vx) && c.vy > 0);
  assert.ok(MAX_AIR >= 3 && MAX_AIR <= 10);
});

test('ノックバック: ショットガンの ちかくは つよく ふっとぶ、ライフルは すこし', () => {
  const sg = WEAPONS.shotgun, rf = WEAPONS.rifle;
  assert.ok(knockAt(sg, 3) * sg.pellets >= FLY_KNOCK, 'ちかくの ショットガンは ふっとばす');
  assert.ok(knockAt(sg, 30) * sg.pellets < knockAt(sg, 3) * sg.pellets);
  assert.ok(knockAt(rf, 5) < FLY_KNOCK && knockAt(rf, 5) > 0);
  assert.ok(knockAt(rf, 5) < knockAt(sg, 5) * sg.pellets);
});

test('スティック: あそびの なかは 0、カーブで なめらか、さいだい 1', () => {
  assert.deepEqual(stickCurve(0.05, 0.05), { x: 0, y: 0 });
  const half = stickCurve(0.5, 0), full = stickCurve(1, 0), over = stickCurve(2, 0);
  assert.ok(half.x > 0 && half.x < 0.5);
  assert.ok(Math.abs(full.x - 1) < 1e-9);
  assert.ok(Math.abs(over.x - 1) < 1e-9);
  const d = stickCurve(0.6, 0.6); assert.ok(Math.abs(Math.atan2(d.y, d.x) - Math.PI / 4) < 1e-9, 'むきは かわらない');
  let prev = 0;
  for (let i = 13; i <= 100; i++) { const m = stickCurve(i / 100, 0).x; assert.ok(m >= prev); prev = m; }
});

test('なめらか いどう: approach は フレームレートに よらない', () => {
  let a = 0; for (let i = 0; i < 60; i++) a = approach(a, 5, 12, 1 / 60);
  let b = 0; for (let i = 0; i < 30; i++) b = approach(b, 5, 12, 1 / 30);
  assert.ok(Math.abs(a - b) < 1e-9);
  assert.ok(a > 4.9 && a < 5);
  assert.equal(approach(3, 3, 12, 0.016), 3);
});

test('バージョン と セーブの ステージ', () => {
  assert.equal(VERSION, '0.2.0');
  assert.equal(normalizeSave(null).stage, 'day');
  assert.equal(normalizeSave({ stage: 'night' }).stage, 'night');
  assert.equal(normalizeSave({ stage: 'mars' }).stage, 'day');
  assert.equal(normalizeSave(null).flashlight, true);
  assert.equal(normalizeSave({ flashlight: false }).flashlight, false);
});

test('マップ: よるの がいとうは みちの うえで、かべに うまって いない', () => {
  const map = buildMap();
  assert.ok(map.lamps.length >= 6);
  const cols = playerColliders(map);
  for (const l of map.lamps) {
    assert.ok(Math.abs(l.x) < HALF && Math.abs(l.z) < HALF);
    assert.ok(l.h > 3);
  }
  assert.ok(cols.length > 0);
});
