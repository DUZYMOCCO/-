import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WEAPONS, WEAPON_ORDER, DEFAULT_WEAPON, fireInterval, damageAt, createGun, updateGun, tryFire, startReload,
  ZOMBIES, waveSpec, waveQueue, killScore, HEADSHOT_BONUS, rayAABB, castShot, collideCircle, groundHeight,
  buildGrid, updateFlow, flowDir, cellOf, normalizeSave,
  blastFalloff, blastDamage, launchVelocity, knockAt, FLY_KNOCK, MAX_AIR, stickCurve, approach, refillReserve, VERSION,
  rollRocketDrop, addRocketAmmo, pickupVisible, DROP_CHANCE, ROCKET_RESERVE_MAX, PICKUP_LIFE,
  timeOfDay, mixTod, blendTod, todLook, TOD, isBossWave, bossHp, BOSS,
  OUTFITS, OUTFIT_IDS, outfitName, nextOutfit, unlockOutfit, OJISAN, shouldSpawnOjisan, ojisanAttackers, pickOjisanSpot, openCells, edgeArrow,
  canClimb, CLIMBERS, PERCH, perchRunnerNeeded,
  GEAR_SLOT_IDS, RARITIES, RARITY_IDS, GEAR_STATS, GEAR_STAT_IDS, SLOT_STATS, statItemMax, GEAR_COLOR_IDS, GEAR_DROP, GEAR_FLOOR, INV_CAP,
  rollGearDrop, rollRarity, rollGear, gearName, gearScore, gearTotals, gearEffects, normalizeGear, gearAction, equippedItems,
  MAX_CLIMB, JUMP_H, climbTime, climbTarget, climbLanding, supportBox, playerReachableTops, boxGap,
  spinGun, weaponMoveMul, makeBoxIndex, MAP_IDS, MAP_CHOICES, pickMapId, pickSpawnPoint, HURRY, hurryMul,
  GEAR_WEIGHT, RARITY_BONUS, gearPower, loadoutValue, bestLoadout, autoEquipBest, equipGain, shouldAutoEquip, autoPickup,
  SPECIAL_UNLOCK, SPECIAL_IDS, unlockedSpecials, damageMul, frontHit, heavyOf,
  ROBOT, robotFollowPoint, blindness, robotTargetScore, pickRobotTarget, pickRobotSpot, robotTouched, shouldTeleportRobot,
  zombieTargetsRobot, damageRobot, WEAPON_BAR, ojisanSurvivalTime, ATTACK_RANGE,
  ROBOT_LV, ROBOT_MAX_LV, robotLevel, robotStats, robotAddKill,
  VEHICLE, BLAST_FX, vehicleMaxHp, makeVehicleState, damageVehicle, vehicleStage, vehicleGap, chainTargets, blastReachesVehicle, blastHits,
  COP, copShouldCome, damageAlly,
} from '../js/rules.js';
import { makeNav } from '../js/nav.js';
import { buildMap, playerColliders, zombieColliders, shotColliders, MAPS, MAP_IDS as MAP_IDS_MAP, mapInfo } from '../js/map.js';
const FLAT_IDS = MAP_IDS_MAP.filter((id) => !buildMap(id).vertical); // たいらな マップ（たてに ひろい マップは nav.js で しらべる）

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
    assert.equal(s.walkers + s.runners + s.brutes + s.boss + s.specialCount, s.total);
    assert.ok(s.total >= prev); prev = s.total;
    const q = waveQueue(s, () => 0.3);
    assert.equal(q.length, s.total);
    assert.deepEqual(q.slice(0, 3), ['walker', 'walker', 'walker']);
  }
  assert.equal(waveSpec(1).runners, 1); // のぼれる こが かならず いる
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

for (const MID of FLAT_IDS) test(`[${MID}] マップ: スタートは あいていて、ぜんぶの ゲートから プレイヤーに たどりつける`, () => {
  const map = buildMap(MID); const HALF = map.half;
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
  assert.deepEqual(normalizeSave(null), { bestWave: 0, bestScore: 0, autoFire: false, sens: 'mid', quality: 'auto', stage: 'day', flashlight: true,
    outfit: 'normal', outfits: ['normal'], gear: { inv: [], eq: { head: null, body: null, feet: null, arm: null } },
    autoEquip: true, map: 'rotate', mapNext: 0, bank: 0, wlv: { rifle: 1, pistol: 1, shotgun: 1, rocket: 1, minigun: 1, sniper: 1, magnum: 1 },
    slv: { head: 1, body: 1, feet: 1, arm: 1 }, hlv: 1 });
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
  // ロケットは ウェーブで ほじゅう しない（ドロップで ひろう）
  g.reserve = 0; refillReserve(g); assert.equal(g.reserve, 0);
  const rf = createGun('rifle'); rf.reserve = 0; refillReserve(rf); assert.equal(rf.reserve, WEAPONS.rifle.reserve);
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
  assert.equal(VERSION, '0.10.0');
  assert.equal(normalizeSave(null).stage, 'day');
  assert.equal(normalizeSave({ stage: 'night' }).stage, 'night');
  assert.equal(normalizeSave({ stage: 'mars' }).stage, 'day');
  assert.equal(normalizeSave(null).flashlight, true);
  assert.equal(normalizeSave({ flashlight: false }).flashlight, false);
});

for (const MID of MAP_IDS_MAP) test(`[${MID}] マップ: よるの がいとうは みちの うえで、かべに うまって いない`, () => {
  const map = buildMap(MID); const HALF = map.half;
  assert.ok(map.lamps.length >= 6);
  const cols = playerColliders(map);
  for (const l of map.lamps) {
    assert.ok(Math.abs(l.x) < HALF && Math.abs(l.z) < HALF);
    assert.ok(l.h > 3);
  }
  assert.ok(cols.length > 0);
});

test('じかん: ウェーブごとに ひる → ゆうがた → よる', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map((n) => timeOfDay(n)), ['day', 'sunset', 'night', 'day', 'sunset', 'night', 'day']);
  // よるから はじめる
  assert.deepEqual([1, 2, 3].map((n) => timeOfDay(n, 'night')), ['night', 'day', 'sunset']);
  assert.equal(timeOfDay(0), 'day');
  // まざりかた: はし は そのまま、まんなかは あいだ
  assert.deepEqual(mixTod('day', 'night', 0).sky, TOD.day.sky);
  assert.deepEqual(mixTod('day', 'night', 1).sky, TOD.night.sky);
  const mid = mixTod('sunset', 'night', 0.5);
  assert.ok(mid.lamps > TOD.sunset.lamps && mid.lamps < TOD.night.lamps);
  assert.ok(TOD.day.lamps < TOD.sunset.lamps && TOD.sunset.lamps < TOD.night.lamps && TOD.night.night === 1);
});

test('ロケットだん: ゾンビが ときどき おとす・ボスは かならず・いっぱいなら ひろえない', () => {
  assert.equal(rollRocketDrop('boss', 0.99), 2);
  assert.equal(rollRocketDrop('walker', 0.99), 0);
  assert.equal(rollRocketDrop('walker', 0.01), 1);
  assert.ok(DROP_CHANCE.walker < 0.1 && DROP_CHANCE.brute > DROP_CHANCE.runner);
  // 1ウェーブ あたり すこしだけ（ゾンビ 10たいに 1こ いか ＋ ボスの 2こ）
  for (let n = 1; n <= 12; n++) {
    const s = waveSpec(n);
    const e = s.walkers * DROP_CHANCE.walker + s.runners * DROP_CHANCE.runner + s.brutes * DROP_CHANCE.brute + s.boss * 2;
    assert.ok(e > 0.3 && e <= s.total * 0.1 + 2, `wave ${n}: ${e}`);
  }
  const g = createGun('rocket'); g.reserve = ROCKET_RESERVE_MAX - 1;
  assert.equal(addRocketAmmo(g, 2), 1); assert.equal(g.reserve, ROCKET_RESERVE_MAX);
  assert.equal(addRocketAmmo(g, 1), 0);
  assert.equal(pickupVisible(1), true);
  assert.equal(pickupVisible(PICKUP_LIFE + 0.1), false);
  const blink = new Set(); for (let t = PICKUP_LIFE - 4; t < PICKUP_LIFE; t += 0.05) blink.add(pickupVisible(t));
  assert.equal(blink.size, 2);
});

test('ボス: 3ウェーブごとに 1たい、でかくて かたい', () => {
  for (let n = 1; n <= 12; n++) {
    const s = waveSpec(n), q = waveQueue(s, () => 0.3);
    assert.equal(s.boss, n % 3 === 0 ? 1 : 0);
    assert.equal(isBossWave(n), n % 3 === 0);
    assert.equal(q.filter((k) => k === 'boss').length, s.boss);
    assert.equal(q.length, s.total);
    assert.notEqual(q[0], 'boss');
  }
  assert.ok(ZOMBIES.boss.scale > ZOMBIES.brute.scale && ZOMBIES.boss.scale < 2.2);
  assert.ok(ZOMBIES.boss.hp > ZOMBIES.brute.hp * 4);
  assert.ok(bossHp(6) > bossHp(3));
  assert.ok(BOSS.slamWind >= 0.6, 'ためが みえる');
  assert.ok(/^[ぁ-んァ-ヶー]+$/.test(ZOMBIES.boss.name));
});

test('よじのぼり: くるまは 1〜1.5びょう、のぼる はこを えらぶ', () => {
  const car = { minX: -1, maxX: 1, minZ: -2, maxZ: 2, minY: 0.35, maxY: 1.1 };
  const glass = { minX: -0.9, maxX: 0.9, minZ: -1.2, maxZ: 1, minY: 1.1, maxY: 1.72 };
  const t = climbTime(1.1);
  assert.ok(t >= 1 && t <= 1.5, `car climb ${t}`);
  assert.ok(climbTime(1.1, 'boss') > t);
  // じめんの ゾンビが くるまの まえに いて、プレイヤーは やねの うえ → まず ボンネット
  assert.equal(climbTarget(0, 2.35, 0.3, 0, 1.72, [car, glass]), car);
  // くるまの よこは せまい（やねで ふさがる）→ そのまま やねへ のぼる
  assert.equal(climbTarget(1.35, 0, 0.3, 0, 1.72, [car, glass]), glass);
  // プレイヤーが ボンネットに いる ときは ボンネットまで
  assert.equal(climbTarget(1.35, 0, 0.3, 0, 1.1, [car, glass]), car);
  // ボディの うえ → ガラスの やねへ
  assert.equal(climbTarget(0.8, 0, 0.3, 1.1, 1.72, [car, glass]), glass);
  // とおい／プレイヤーより たかい はこは えらばない
  assert.equal(climbTarget(3, 0, 0.3, 0, 1.72, [car]), null);
  assert.equal(climbTarget(1.35, 0, 0.3, 0, 0.5, [car]), null);
  const land = climbLanding(1.35, 0, car);
  assert.ok(land.x <= car.maxX && land.x >= car.minX && land.y === car.maxY);
  assert.equal(supportBox(0, 0, 0.35, 1.72, [car, glass]), glass);
});

for (const MID of FLAT_IDS) test(`[${MID}] あんぜんちたい なし: プレイヤーが のれる ところは ぜんぶ ゾンビも のぼって こられる`, () => {
  const map = buildMap(MID); const HALF = map.half;
  const pc = playerColliders(map), zc = zombieColliders(map);
  const tops = playerReachableTops(pc);
  assert.ok(tops.length > 20);
  const grid = buildGrid(zc, HALF + 4, 1, 0.4);
  updateFlow(grid, map.spawns[0].x, map.spawns[0].z); // ゾンビが あるける マス
  const open = [];
  for (let i = 0; i < grid.n * grid.n; i++) if (grid.dist[i] >= 0) {
    const gx = i % grid.n, gz = (i / grid.n) | 0;
    open.push([-grid.half + (gx + 0.5) * grid.cell, -grid.half + (gz + 0.5) * grid.cell]);
  }
  // じめんから のぼれる はこ → となりの はこへ（だんだんに）
  const climbable = new Set();
  for (const b of zc) {
    if (b.maxY > MAX_CLIMB) continue;
    if (open.some(([x, z]) => boxGap(x, z, b) < 1.25)) climbable.add(b);
  }
  let grow = true;
  while (grow) {
    grow = false;
    for (const b of zc) {
      if (climbable.has(b)) continue;
      for (const a of climbable) {
        const dx = Math.max(b.minX - a.maxX, 0, a.minX - b.maxX), dz = Math.max(b.minZ - a.maxZ, 0, a.minZ - b.maxZ);
        if (Math.hypot(dx, dz) < 0.45 && b.maxY - a.maxY <= MAX_CLIMB) { climbable.add(b); grow = true; break; }
      }
    }
  }
  for (const b of tops) {
    assert.ok(zc.includes(b), `player-only top ${b.minX},${b.minZ}`);
    assert.ok(b.maxY <= MAX_CLIMB, `too high ${b.maxY}`);
    assert.ok(climbable.has(b), `safe spot at ${b.minX.toFixed(1)},${b.minZ.toFixed(1)} h${b.maxY.toFixed(2)}`);
  }
  // のぼれる のは はやい ゾンビ だけ → まいウェーブ かならず いる＋いすわると おいかけて くる
  for (let n = 1; n <= 30; n++) assert.ok(waveSpec(n).runners >= 1, `wave ${n} has a climber`);
  assert.ok(perchRunnerNeeded(PERCH.time, 0, 0));
  assert.ok(!perchRunnerNeeded(PERCH.time, 1, 0), 'のぼれる こが もう いる');
  assert.ok(!perchRunnerNeeded(PERCH.time - 0.1, 0, 0));
  assert.ok(PERCH.time <= 6 && PERCH.cooldown <= 10);
  // プレイヤーは ジャンプで たかい ところへ: じめんから 1.3m ちょっと まで
  assert.ok(JUMP_H > 1.2 && JUMP_H < 1.4);
});

test('のぼれる のは はやい ゾンビ だけ（ふつう・でかい・ボスは まわりに あつまる）', () => {
  assert.deepEqual(CLIMBERS, ['runner']);
  assert.ok(canClimb('runner'));
  for (const k of ['walker', 'brute', 'boss']) assert.ok(!canClimb(k), k);
  // でかい ゾンビと ボスは ドスン！で くるまから おとせる（ボスの わは くるまの はばより ひろい）
  assert.ok(BOSS.slamRadius >= 3);
});

test('ふく: 7しゅるい・かなの なまえ・セーブ ごかん', () => {
  assert.equal(OUTFITS.length, 7);
  assert.equal(OUTFIT_IDS[0], 'normal');
  for (const o of OUTFITS) assert.match(o.name, /^[ぁ-んァ-ンー]+$/u, o.name);
  assert.equal(outfitName('ninja'), 'にんじゃ');
  // ふるい セーブ（v0.3）は ふつう だけ
  const old = normalizeSave({ bestWave: 5, stage: 'night' });
  assert.deepEqual(old.outfits, ['normal']); assert.equal(old.outfit, 'normal'); assert.equal(old.bestWave, 5);
  // へんな あたいは けす・ならびは そろえる・もっていない ふくは きれない
  const s = normalizeSave({ outfits: ['robot', 'zzz', 'ninja', 'ninja', 3], outfit: 'gold' });
  assert.deepEqual(s.outfits, ['normal', 'ninja', 'robot']); assert.equal(s.outfit, 'normal');
  assert.equal(normalizeSave({ outfits: ['camo'], outfit: 'camo' }).outfit, 'camo');
  assert.equal(normalizeSave({ outfits: 'camo' }).outfits.length, 1);
  // JSON で もどしても おなじ
  const j = normalizeSave(JSON.parse(JSON.stringify(s))); assert.deepEqual(j, s);
});

test('ふくを もらう: まだ ない ふくから 1つ、ぜんぶ あれば null', () => {
  const save = normalizeSave(null);
  const got = new Set();
  for (let i = 0; i < 6; i++) {
    const id = nextOutfit(save.outfits, (i * 0.37) % 1);
    assert.ok(id && id !== 'normal' && !save.outfits.includes(id));
    assert.equal(unlockOutfit(save, id), true);
    assert.equal(save.outfit, id, 'すぐ きがえる');
    got.add(id);
  }
  assert.equal(got.size, 6);
  assert.equal(nextOutfit(save.outfits, 0.5), null);
  assert.deepEqual(save.outfits, OUTFIT_IDS);
  assert.equal(unlockOutfit(save, 'camo'), false);
  assert.equal(unlockOutfit(save, 'zzz'), false);
  assert.equal(nextOutfit(['normal'], 0.9999), OUTFIT_IDS[6]);
});

test('おじさん: 2〜3ウェーブに 1かい・ボスの ウェーブは でない', () => {
  let r = 1; const rnd = () => ((r = (r * 1664525 + 1013904223) >>> 0) / 4294967296);
  const gaps = [];
  for (let run = 0; run < 400; run++) {
    let last = 0, prev = 0;
    for (let w = 1; w <= 30; w++) {
      if (shouldSpawnOjisan(w, last, rnd())) {
        assert.ok(!isBossWave(w), `boss wave ${w}`);
        assert.ok(w >= 2);
        if (prev) gaps.push(w - prev);
        prev = last = w;
      }
    }
  }
  for (const g of gaps) assert.ok(g >= 2 && g <= 4, `gap ${g}`);
  const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  assert.ok(avg >= 2.2 && avg <= 3.2, `avg gap ${avg}`);
  assert.equal(shouldSpawnOjisan(3, 0, 0), false);       // ボス
  assert.equal(shouldSpawnOjisan(2, 0, 0.9), false);      // 50%
  assert.equal(shouldSpawnOjisan(2, 0, 0.1), true);
  assert.equal(shouldSpawnOjisan(4, 2, 0.9), false);
  assert.equal(shouldSpawnOjisan(5, 2, 0.99), true);      // 3ウェーブ あいたら かならず
  assert.equal(shouldSpawnOjisan(1, 0, 0), false);
  // おそう ゾンビは すこしだけ
  assert.equal(ojisanAttackers(2), 3);
  for (let w = 1; w <= 40; w++) assert.ok(ojisanAttackers(w) >= 3 && ojisanAttackers(w) <= 5);
  assert.ok(OJISAN.dmgMul < 1 && OJISAN.hp >= 80);
});

for (const MID of MAP_IDS_MAP) test(`[${MID}] おじさんの ばしょ: あるいて いける ひろい ところ・ちょうど いい きょり`, () => {
  const map = buildMap(MID); const HALF = map.half;
  const grid = buildGrid(zombieColliders(map), HALF + 4, 1, 0.4);
  const ps = map.playerStart;
  updateFlow(grid, ps.x, ps.z);
  const cells = openCells(grid, HALF - 3);
  assert.ok(cells.length > 200, `cells ${cells.length}`);
  for (let i = 0; i < 50; i++) {
    const [x, z] = pickOjisanSpot(cells, ps.x, ps.z, i / 50);
    const d = Math.hypot(x - ps.x, z - ps.z);
    assert.ok(d >= OJISAN.dist[0] && d <= OJISAN.dist[1], `dist ${d}`);
    assert.ok(Math.abs(x) <= HALF - 3 && Math.abs(z) <= HALF - 3);
    assert.ok(grid.dist[cellOf(grid, x, z)] >= 0, 'とどく');
  }
  // ちかい ところが なければ いちばん とおい ところ
  assert.deepEqual(pickOjisanSpot([[0, 0], [3, 0]], 0, 0, 0.5), [3, 0]);
});

test('やじるし: がめんの そとなら ふちに・うしろなら はんたいがわ', () => {
  const a = edgeArrow(0.2, 0.3, false); assert.ok(a.onScreen); assert.equal(a.x, 0.2);
  const b = edgeArrow(3, 0, false); assert.ok(!b.onScreen); assert.ok(Math.abs(b.x - 0.86) < 1e-9); assert.ok(Math.abs(b.ang) < 1e-9);
  const c = edgeArrow(0.5, 0.1, true); assert.ok(!c.onScreen); assert.ok(c.x < 0, 'うしろの みぎは ひだりに');
  const d = edgeArrow(0, 4, false); assert.ok(Math.abs(d.ang + Math.PI / 2) < 1e-9, 'うえ');
});

// ---- そうび ----
function seeded(seed) { let x = seed >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }

test('そうび: ぶいは 4つ、レアは 4だん、なまえは かなだけ', () => {
  assert.deepEqual(GEAR_SLOT_IDS, ['head', 'body', 'feet', 'arm']);
  assert.deepEqual(RARITIES.map((r) => r.name), ['ふつう', 'レア', 'すごいレア', 'でんせつ']);
  const r = seeded(7);
  for (let i = 0; i < 200; i++) {
    const g = rollGear(r);
    assert.match(gearName(g), /^[\u3040-\u30ffー ]+$/);
    for (const k of Object.keys(g.stats)) assert.ok(SLOT_STATS[g.slot].includes(k));
  }
  for (const k of GEAR_STAT_IDS) assert.match(GEAR_STATS[k].name, /^[\u3040-\u30ffーHP]+$/);
});

test('そうび: のうりょくは うえげん いない（1こ も ごうけい も）', () => {
  const r = seeded(42);
  const all = [];
  for (let i = 0; i < 3000; i++) {
    const g = rollGear(r);
    const rar = RARITIES.find((x) => x.id === g.rarity);
    assert.equal(Object.keys(g.stats).length, rar.stats);
    for (const [k, v] of Object.entries(g.stats)) { assert.ok(Number.isInteger(v) && v >= 1 && v <= statItemMax(k), `${k}=${v}`); }
    all.push(g);
  }
  // いちばん つよい そうびを 4つ つけても キャップで とまる
  const best = GEAR_SLOT_IDS.map((s) => ({ slot: s, stats: Object.fromEntries(GEAR_STAT_IDS.map((k) => [k, statItemMax(k)])) }));
  const t = gearTotals(best);
  for (const k of GEAR_STAT_IDS) assert.ok(t[k] <= GEAR_STATS[k].cap);
  assert.ok(GEAR_STATS.def.cap <= 30, 'ぼうぎょは 30%まで（むてきに ならない）');
  assert.ok(GEAR_STATS.spd.cap <= 15 && GEAR_STATS.rel.cap <= 25 && GEAR_STATS.hp.cap <= 50);
  const fx = gearEffects({ inv: best.map((b, i) => ({ ...b, id: 'x' + i })), eq: Object.fromEntries(GEAR_SLOT_IDS.map((s, i) => [s, 'x' + i])) });
  assert.ok(fx.dmgMul >= 0.7 && fx.maxHp <= 150 && fx.speedMul <= 1.15 && fx.reloadMul <= 1 / 0.75 + 1e-9);
  // なにも つけて いなければ かわらない
  const none = gearEffects(normalizeGear(null));
  assert.deepEqual([none.maxHp, none.dmgMul, none.speedMul, none.reloadMul], [100, 1, 1, 1]);
});

test('そうび: おちる かくりつ（ふつうは すこし、つよいのは おおめ、ボスは かならず）', () => {
  assert.ok(GEAR_DROP.walker <= 0.05 && GEAR_DROP.runner <= 0.06);
  assert.ok(GEAR_DROP.brute > GEAR_DROP.runner * 3);
  assert.equal(rollGearDrop('boss', 0.999), true);
  const r = seeded(3); let n = 0; const N = 20000;
  for (let i = 0; i < N; i++) if (rollGearDrop('walker', r())) n++;
  assert.ok(Math.abs(n / N - GEAR_DROP.walker) < 0.006);
  // レアの わりあい
  const cnt = { n: 0, r: 0, sr: 0, l: 0 };
  for (let i = 0; i < N; i++) cnt[rollRarity(r())]++;
  assert.ok(cnt.n > cnt.r && cnt.r > cnt.sr && cnt.sr > cnt.l && cnt.l > 0);
  assert.ok(cnt.l / N < 0.04);
  // ボスは すごいレア いじょう、おじさんは レア いじょう
  for (let i = 0; i < 500; i++) {
    assert.ok(RARITY_IDS.indexOf(rollGear(r, { floor: GEAR_FLOOR.boss }).rarity) >= 2);
    assert.ok(RARITY_IDS.indexOf(rollGear(r, { floor: GEAR_FLOOR.ojisan }).rarity) >= 1);
  }
});

test('そうび: セーブ（ふるい セーブ OK・へんな あたいは なおす・20こまで）', () => {
  assert.deepEqual(normalizeSave({ bestWave: 3 }).gear, { inv: [], eq: { head: null, body: null, feet: null, arm: null } });
  const r = seeded(9);
  const inv = Array.from({ length: 30 }, () => rollGear(r));
  inv.push({ id: 'bad', slot: 'tail', stats: {} }, { id: 'big', slot: 'head', rarity: 'l', color: 'red', stats: { def: 999, hp: -5, zz: 3 } }, null, 5);
  const g = normalizeGear({ inv: [inv[30], ...inv], eq: { head: 'nope', body: inv[0].slot === 'body' ? inv[0].id : 'x' } });
  assert.equal(g.inv.length, INV_CAP);
  const big = normalizeGear({ inv: [inv[31]], eq: { head: 'big', feet: 'big' } });
  assert.deepEqual(big.inv[0].stats, { def: statItemMax('def') });
  assert.equal(big.eq.head, 'big'); assert.equal(big.eq.feet, null, 'ぶいが ちがうと つけられない');
  assert.equal(g.eq.head, null);
  const s = normalizeSave({ gear: big });
  assert.deepEqual(normalizeSave(JSON.parse(JSON.stringify(s))), s);
  for (const it of g.inv) assert.ok(GEAR_COLOR_IDS.includes(it.color));
});

test('そうび: つける・しまう・すてる・いっぱいの とき', () => {
  const r = seeded(11);
  const gear = normalizeGear(null);
  const a = rollGear(r, { slot: 'head' }), b = rollGear(r, { slot: 'head' });
  assert.ok(gearAction(gear, a, 'equip').ok);
  assert.equal(gear.eq.head, a.id);
  assert.ok(gearAction(gear, b, 'equip').ok);
  assert.equal(gear.eq.head, b.id); assert.equal(gear.inv.length, 2, 'まえの は かばんに のこる');
  assert.deepEqual(equippedItems(gear).map((x) => x && x.id), [b.id, null, null, null]);
  gearAction(gear, b, 'unequip'); assert.equal(gear.eq.head, null);
  gearAction(gear, b, 'equip'); gearAction(gear, b, 'drop');
  assert.equal(gear.eq.head, null); assert.equal(gear.inv.length, 1);
  while (gear.inv.length < INV_CAP) gearAction(gear, rollGear(r, { slot: 'body' }), 'keep');
  const c = rollGear(r, { slot: 'feet' });
  assert.deepEqual(gearAction(gear, c, 'keep'), { ok: false, full: true });
  assert.equal(gearAction(gear, c, 'equip').ok, false, 'くつを つけてないので いれかえられない');
  gearAction(gear, gear.inv.find((x) => x.slot === 'body'), 'equip');
  const d = rollGear(r, { slot: 'body' });
  const res = gearAction(gear, d, 'equip');
  assert.ok(res.ok && res.replaced); assert.equal(gear.inv.length, INV_CAP);
  assert.ok(gearScore(d) > 0);
});

// ================= v0.5.0 =================
function lcg(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

test('v0.5.0 マップ: 6しゅるい・ひろい・おまかせ じゅんばん', () => {
  assert.deepEqual(MAP_IDS, ['city', 'mall', 'base', 'hospital', 'camp', 'harbor', 'rooftop', 'office']);
  assert.deepEqual(MAP_IDS_MAP, MAP_IDS, 'rules と map の いちらんが おなじ');
  assert.deepEqual(MAP_CHOICES, ['rotate', ...MAP_IDS]);
  for (const m of MAPS) {
    assert.ok(m.half >= (buildMap(m.id).vertical ? 32 : 40) && m.half <= 48, `${m.id} half ${m.half}`); // まえは 32（ビルの なかは たてに ひろい）
    assert.ok(m.name && m.icon && m.desc);
    assert.ok(!/[✚✙✛✜➕✝†☩]|\u271A/.test(m.icon + m.name + m.desc), 'じゅうじ マーク なし');
  }
  assert.equal(pickMapId('mall', 3), 'mall');
  assert.equal(pickMapId('rotate', 0), 'city');
  assert.equal(pickMapId('rotate', 9), 'mall');
  assert.equal(pickMapId('zzz', -1), 'office');
  assert.equal(mapInfo('nope').id, 'city');
  const s = normalizeSave({ map: 'camp', mapNext: 11, autoEquip: false });
  assert.equal(s.map, 'camp'); assert.equal(s.mapNext, 3); assert.equal(s.autoEquip, false);
  assert.equal(normalizeSave({ map: 'moon' }).map, 'rotate');
});

for (const MID of MAP_IDS_MAP) test(`[${MID}] v0.5.0 マップ: ちがう みため・すくない ざいしつ・ゲート・がいとう`, () => {
  const map = buildMap(MID);
  assert.equal(map.id, MID);
  assert.ok(map.theme && map.theme.ground && map.theme.far, 'theme');
  assert.ok(map.spawns.length >= 8, 'ゲートが たくさん');
  assert.ok(map.lamps.length >= 8, 'よるの がいとう');
  const mats = new Set(map.boxes.filter((b) => b.mat !== 'none').map((b) => b.mat));
  assert.ok(mats.size >= 6 && mats.size <= 22, `materials ${mats.size}`); // ざいしつ ごとに 1ドローコール
  assert.ok(map.boxes.length < (map.vertical ? 1600 : 1000), `boxes ${map.boxes.length}`);
  for (const b of map.boxes) assert.ok(b.maxX > b.minX && b.maxY > b.minY && b.maxZ > b.minZ, 'box size');
  // そとに でられない（ゲートの みえない かべは たかい）
  for (const b of map.boxes.filter((q) => q.barrier)) assert.ok(b.maxY >= 8);
  const edge = map.spawns.filter((sp) => Math.max(Math.abs(sp.x), Math.abs(sp.z)) > map.half - 1);
  assert.ok(edge.length >= 8, 'ゲートは はしっこ');
  if (!map.vertical) assert.equal(edge.length, map.spawns.length, 'たいらな マップは ぜんぶ はしっこ');
});

test('v0.5.0 マップ: ぜんぶ ちがう', () => {
  const sig = MAP_IDS.map((id) => { const m = buildMap(id); return m.boxes.length + ':' + m.theme.ground + ':' + m.theme.far; });
  assert.equal(new Set(sig).size, MAP_IDS.length);
});

test('v0.5.0 はこの さくいん: ちかくの はこ だけ しらべても けっかが おなじ', () => {
  for (const id of MAP_IDS) {
    const map = buildMap(id), pc = playerColliders(map), idx = makeBoxIndex(pc, map.half);
    const r = lcg(id.length * 99);
    for (let i = 0; i < 300; i++) {
      const x = (r() * 2 - 1) * map.half, z = (r() * 2 - 1) * map.half, y = r() < 0.5 ? 0 : r() * 3;
      const a = collideCircle(x, z, 0.35, y, pc), b = collideCircle(x, z, 0.35, y, idx);
      if (Math.hypot(a.x - x, a.z - z) > 1.5) continue; // おおきな ビルの なかに うまった てん（ゲームでは おきない）
      assert.ok(Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.z - b.z) < 1e-9, `collide ${id} ${x},${z}`);
      assert.equal(groundHeight(x, z, 0.35, y + 0.001, pc), groundHeight(x, z, 0.35, y + 0.001, idx));
      assert.equal(supportBox(x, z, 0.35, 1, pc), supportBox(x, z, 0.35, 1, idx));
    }
  }
});

test('v0.5.0 ゾンビの でぐち: ちかすぎず とおすぎない・とおい ゾンビは いそぐ', () => {
  for (const id of MAP_IDS) {
    const map = buildMap(id);
    for (const [px, pz] of [[0, 4], [20, 20], [-25, 10], [10, -30]]) {
      for (let i = 0; i < 20; i++) {
        const s = pickSpawnPoint(map.spawns, px, pz, i / 20);
        const d = Math.hypot(s.x - px, s.z - pz, (s.y || 0) * 1.5);
        assert.ok(d > 14, `${id} too close ${d}`);
      }
    }
    // まんなかに いる ときは いちばん ちかい ゲート 3つの どれか（とおい ゲートを えらばない）
    const ps = map.playerStart, ds = map.spawns.map((q) => Math.hypot(q.x - ps.x, q.z - ps.z, (q.y || 0) * 1.5)).filter((d) => d > 14).sort((a, b) => a - b);
    for (let i = 0; i < 10; i++) {
      const s0 = pickSpawnPoint(map.spawns, ps.x, ps.z, i / 10);
      assert.ok(Math.hypot(s0.x - ps.x, s0.z - ps.z, (s0.y || 0) * 1.5) <= Math.max(ds[2], 34) + 1e-9, `${id} start spawn far`);
    }
  }
  assert.equal(hurryMul(5), 1); assert.equal(hurryMul(HURRY.from), 1);
  assert.ok(hurryMul(32) > 1 && hurryMul(32) < HURRY.max);
  assert.equal(hurryMul(200), HURRY.max);
});

test('v0.5.0 シムボット: ひろい マップでも ゾンビが とどく じかんは まえと おなじ くらい', () => {
  // まえの マップ（はば 64m）の けっか: へいきん 23.7びょう
  const BASE = 23.74;
  const walk = (map, newWay) => {
    const grid = buildGrid(zombieColliders(map), map.half + 4, 1, 0.4), ps = map.playerStart, r = lcg(7);
    updateFlow(grid, ps.x, ps.z);
    let tot = 0;
    for (let k = 0; k < 24; k++) {
      let o;
      if (newWay) o = pickSpawnPoint(map.spawns, ps.x, ps.z, r());
      else { const l = map.spawns.map((s) => ({ s, d: Math.hypot(s.x - ps.x, s.z - ps.z) })).filter((q) => q.d > 14).sort((a, b) => b.d - a.d).slice(0, 3); o = l[Math.floor(r() * l.length)].s; }
      let x = o.x, z = o.z, t = 0;
      while (t < 120) {
        const d = Math.hypot(x - ps.x, z - ps.z); if (d < 2) break;
        const f = flowDir(grid, x, z) || { x: (ps.x - x) / d, z: (ps.z - z) / d };
        const v = ZOMBIES.walker.speed * (newWay ? hurryMul(d) : 1) * 0.1; x += f.x * v; z += f.z * v; t += 0.1;
      }
      assert.ok(t < 120, 'とどかない ゾンビ');
      tot += t;
    }
    return tot / 24;
  };
  for (const id of FLAT_IDS) {
    const map = buildMap(id), raw = walk(map, false), now = walk(map, true);
    assert.ok(now < raw, `${id}: よくなっている ${now} < ${raw}`);
    assert.ok(now <= BASE * 1.25, `${id}: ${now.toFixed(1)}s (まえ ${BASE}s)`);
  }
});

test('v0.5.0 ミニガン: スロット5・まわってから うつ・はやい・おもい', () => {
  const w = WEAPONS.minigun;
  assert.equal(WEAPON_ORDER[4], 'minigun'); assert.equal(w.slot, 5);
  assert.ok(w.rpm >= 900 && w.auto && w.mag >= 100);
  assert.equal(w.spinUp, 0.5);
  const g = createGun('minigun'), dt = 1 / 120;
  let t = 0, first = -1, shots = 0;
  for (; t < 1.5; t += dt) {
    spinGun(g, true, dt); updateGun(g, dt);
    const r = tryFire(g, true);
    if (r === 'fire') { shots++; if (first < 0) first = t; } else if (t < 0.49) assert.equal(r, 'spin');
  }
  assert.ok(first >= 0.49 && first <= 0.52, `first ${first}`);
  assert.ok(shots > (1.5 - 0.5) * w.rpm / 60 * 0.9, `shots ${shots}`);
  // はなすと とまる、すぐ もういちど おせば すこし まわっている
  spinGun(g, false, 0.3); assert.ok(g.spin > 0 && g.spin < 1);
  spinGun(g, false, 2); assert.equal(g.spin, 0);
  // おそく なる
  assert.equal(weaponMoveMul(createGun('rifle')), 1);
  assert.equal(weaponMoveMul(createGun('rocket')), 0.92);
  const m = createGun('minigun');
  assert.ok(Math.abs(weaponMoveMul(m) - 0.9) < 1e-9);
  m.spin = 1; assert.ok(Math.abs(weaponMoveMul(m) - 0.495) < 1e-9);
  // リロード ちゅうは まわらない
  m.spin = 0; m.ammo = 0; startReload(m); spinGun(m, true, 0.3); assert.equal(m.spin, 0);
  assert.ok(!/[A-Z]{2,}/.test(w.name + w.short), 'ブランド めい なし');
});

const G = (slot, rarity, stats, id) => ({ id: id || slot + rarity + JSON.stringify(stats), slot, rarity, color: 'olive', stats });
test('v0.5.0 じどう そうび: スコア（うえげん つき）・いちばん つよい くみあわせ', () => {
  // うえげんを こえた ぶんは かぞえない
  const capDef = loadoutValue([G('head', 'n', { def: 20 }), G('body', 'n', { def: 20 }), null, null]);
  assert.equal(capDef, 30 * GEAR_WEIGHT.def);
  assert.equal(loadoutValue([null, null, null, null]), 0);
  assert.equal(loadoutValue([G('arm', 'l', {}), null, null, null]), RARITY_BONUS.l);
  assert.ok(gearPower(G('head', 'sr', { def: 8, hp: 10 })) > gearPower(G('head', 'r', { def: 8 })));
  // ぼうぎょが MAX なら、ぼうぎょ だけの ヘルメットより HP の ヘルメットを えらぶ
  const gear = { inv: [
    G('body', 'l', { def: 26, hp: 14 }, 'b1'), G('head', 'sr', { def: 12 }, 'h1'), G('head', 'r', { hp: 16 }, 'h2'),
    G('feet', 'n', { spd: 3 }, 'f1'), G('feet', 'sr', { spd: 8, def: 2 }, 'f2'), G('arm', 'r', { rel: 6 }, 'a1'),
  ], eq: { head: 'h1', body: null, feet: 'f1', arm: null } };
  const best = bestLoadout(gear);
  assert.equal(best.eq.body, 'b1'); assert.equal(best.eq.feet, 'f2'); assert.equal(best.eq.arm, 'a1');
  assert.equal(best.eq.head, 'h2', 'うえげんを みて えらぶ');
  const ch = autoEquipBest(gear);
  assert.deepEqual(ch.sort(), ['arm', 'body', 'feet', 'head']);
  assert.deepEqual(autoEquipBest(gear), [], 'もう いちばん つよい');
  // おなじ つよさ なら いまの まま
  const g2 = { inv: [G('arm', 'r', { rel: 6 }, 'x1'), G('arm', 'r', { rel: 6 }, 'x2')], eq: { head: null, body: null, feet: null, arm: 'x2' } };
  assert.deepEqual(autoEquipBest(g2), []); assert.equal(g2.eq.arm, 'x2');
});

test('v0.5.0 じどう そうび: ひろった とき つよければ つける・よわければ カード', () => {
  const gear = { inv: [G('head', 'r', { def: 8 }, 'h1')], eq: { head: 'h1', body: null, feet: null, arm: null } };
  const weak = G('head', 'n', { def: 4 }, 'h2'), strong = G('head', 'sr', { def: 12, hp: 8 }, 'h3');
  assert.ok(equipGain(gear, weak) < 0); assert.ok(!shouldAutoEquip(gear, weak));
  assert.equal(autoPickup(gear, weak).ok, false); assert.equal(gear.inv.length, 1);
  assert.ok(equipGain(gear, strong) > 0);
  const r = autoPickup(gear, strong);
  assert.ok(r.ok); assert.equal(gear.eq.head, 'h3'); assert.equal(r.replaced.id, 'h1');
  assert.ok(gear.inv.some((g) => g.id === 'h1'), 'まえの そうびは かばんへ');
  // あいている ぶいは なんでも つける
  assert.ok(autoPickup(gear, G('arm', 'n', { rel: 2 }, 'a1')).ok);
  // かばんが いっぱい: いちばん よわい（つけていない）ものを すてる
  const full = { inv: [], eq: { head: null, body: null, feet: 'f0', arm: null } };
  full.inv.push(G('feet', 'n', { spd: 2 }, 'f0'));
  for (let i = 0; i < INV_CAP - 1; i++) full.inv.push(G('arm', i === 3 ? 'n' : 'r', { rel: i === 3 ? 1 : 5 }, 'z' + i));
  const r2 = autoPickup(full, G('feet', 'l', { spd: 12 }, 'fL'));
  assert.ok(r2.ok); assert.equal(full.eq.feet, 'fL'); assert.ok(full.inv.length <= INV_CAP);
  assert.ok(!full.inv.some((g) => g.id === 'z3'), 'よわい ものを すてた');
  // うえげん MAX の とき、ぼうぎょ だけ ふえる ものは つけない
  const capped = { inv: [G('body', 'l', { def: 30 }, 'b1'), G('head', 'r', { hp: 10 }, 'h1')], eq: { head: 'h1', body: 'b1', feet: null, arm: null } };
  assert.ok(!shouldAutoEquip(capped, G('head', 'r', { def: 9 }, 'h9')));
});

test('v0.5.0 くらい ふんいき: よるは まっくら・ひるも すこし くらい（テストの きまり は そのまま）', () => {
  const lum = (c) => ((c >> 16) & 255) * 0.3 + ((c >> 8) & 255) * 0.59 + (c & 255) * 0.11;
  assert.ok(lum(TOD.day.fog) < 170, 'ひるの きり くらめ');
  assert.ok(lum(TOD.night.fog) < 40);
  assert.ok(TOD.day.sunI <= 2 && TOD.night.hemiI >= 0.9, 'ゾンビは みえる');
  assert.ok(lum(TOD.night.sky[0]) < 20);
});

test('v0.5.0 じゅうじ マークの えもじを つかわない', async () => {
  const fs = await import('node:fs'), path = await import('node:path'), url = await import('node:url');
  const root = path.dirname(path.dirname(url.fileURLToPath(import.meta.url)));
  const bad = /[⛑🏥🚑✚✙✛✜➕✝☩]|\p{Regional_Indicator}/u;
  for (const f of ['js/rules.js', 'js/index.js', 'js/map.js', 'js/game.js', 'js/models.js', 'js/backdrop.js', 'css/zombie-tps.css']) {
    const t = fs.readFileSync(path.join(root, f), 'utf8');
    assert.ok(!bad.test(t), f);
  }
});

// ================= v0.6.0 =================
test('v0.6.0 ゾンビの しゅるい: 12しゅるい・すこしずつ ふえる・のぼるのは はやい ゾンビ だけ', () => {
  assert.deepEqual(SPECIAL_IDS, ['guard', 'crawler', 'soldier', 'spitter', 'burning', 'riot', 'bloater', 'screamer', 'firefighter', 'electric', 'mutant', 'charger']);
  for (const k of SPECIAL_IDS) {
    const z = ZOMBIES[k];
    assert.ok(z && z.hp > 0 && z.speed > 0 && z.dmg > 0, k);
    assert.ok(DROP_CHANCE[k] !== undefined && GEAR_DROP[k] !== undefined, `${k} drops`);
    assert.ok(killScore(k, false) > 0);
    assert.ok(!canClimb(k), `${k} は のぼれない`);
  }
  assert.deepEqual(CLIMBERS, ['runner']);
  assert.deepEqual(unlockedSpecials(1), []);
  assert.equal(waveSpec(1).specialCount, 0);
  const seen = new Set();
  for (let n = 1; n <= 14; n++) {
    const s = waveSpec(n), un = unlockedSpecials(n);
    for (const k of Object.keys(s.specials)) assert.ok(un.includes(k), `${k} は まだ でない (wave ${n})`);
    // はじめて でる しゅるいは かならず でる・すこしだけ
    for (const [k, w] of SPECIAL_UNLOCK) if (w === n) { assert.ok(s.specials[k] >= 1 && s.specials[k] <= 2, `${k} wave ${n}`); }
    Object.keys(s.specials).forEach((k) => seen.add(k));
    assert.ok(s.walkers >= 3, 'ふつうの ゾンビも のこる');
    assert.ok(s.specialCount <= Math.ceil((s.total - s.boss) * 0.62), `wave ${n} specials ${s.specialCount}`);
    const q = waveQueue(s, lcg(n));
    assert.equal(q.length, s.total);
    for (const [k, c] of Object.entries(s.specials)) assert.equal(q.filter((x) => x === k).length, c);
  }
  assert.equal(seen.size, SPECIAL_IDS.length, 'ぜんぶ でてくる');
});

test('v0.6.0 たて・ベスト・ばくはつに つよい ふく・おもさ', () => {
  // ゾンビ yaw=0 → まえは -Z。+Z むきに とぶ たまは まえから
  assert.equal(frontHit(0, 0, 1), true);
  assert.equal(frontHit(0, 0, -1), false);
  assert.equal(frontHit(Math.PI / 2, 1, 0), true);
  assert.ok(damageMul('riot', { front: true }) <= 0.15);
  assert.equal(damageMul('riot', { front: false }), 1);
  assert.equal(damageMul('riot', { front: true, head: true }), 1, 'あたまは たてで まもれない');
  assert.ok(damageMul('soldier', {}) < 1 && damageMul('soldier', {}) > 0.4);
  assert.equal(damageMul('firefighter', { blast: true }), 0.5);
  assert.equal(damageMul('walker', { blast: true }), 1);
  assert.equal(damageMul('walker', { front: true }), 1);
  assert.ok(heavyOf('boss') < heavyOf('charger') && heavyOf('charger') < heavyOf('riot') && heavyOf('riot') < heavyOf('walker'));
  assert.equal(heavyOf('runner'), 1);
  assert.ok(ZOMBIES.charger.hp > ZOMBIES.brute.hp * 0.8 && ZOMBIES.charger.scale > 1);
  assert.ok(ZOMBIES.crawler.hp < ZOMBIES.walker.hp);
  assert.ok(ZOMBIES.spitter.spit.min > 2 && ZOMBIES.spitter.spit.max > ZOMBIES.spitter.spit.min);
  assert.ok(ZOMBIES.bloater.gas.r > 2 && ZOMBIES.bloater.gas.fuse > 0.8, 'にげる じかんが ある');
  assert.ok(ZOMBIES.screamer.scream.summon <= 2);
});

// たてに ひろい マップの シム（ゲームと おなじ: nav の むき・かべ・かいだんを のぼる・おりる）
function simWalk(map, nav, zc, [px, pz, py], n, seed) {
  nav.update(px, py, pz);
  const r = lcg(seed), times = [];
  for (let k = 0; k < n; k++) {
    const o = pickSpawnPoint(map.spawns, px, pz, r(), [16, 34], py);
    let x = o.x, z = o.z, y = o.y || 0, t = 0;
    while (t < 120) {
      const d = Math.hypot(x - px, z - pz); if (d < 2 && Math.abs(y - py) < 0.5) break;
      let f = nav.dir(x, y, z);
      if (!f || (Math.abs(py - y) < 0.4 && d < 3 && nav.lineClear(x, y, z, px, py, pz))) f = { x: (px - x) / d, z: (pz - z) / d };
      const v = ZOMBIES.walker.speed * hurryMul(d) * 0.05;
      const c = collideCircle(x + f.x * v, z + f.z * v, 0.3, y, zc, 0.36); x = c.x; z = c.z;
      const g = groundHeight(x, z, 0.3, y + 0.36, zc, 0.36);
      y = g > y ? g : Math.max(g, y - 0.6); t += 0.05;
    }
    times.push(t);
  }
  return times;
}
const VERT = { rooftop: [[0, 4, 0], [-2, -17, 5.5], [-25, 12, 5.5], [16, -18, 8]], office: [[0, 4, 0], [-12, 0, 4.2], [12, 0, 8.4], [0, 8, 12.6]] };
for (const MID of Object.keys(VERT)) test(`[${MID}] v0.6.0 たてに ひろい マップ: かいだんで どこへでも・ゾンビが ちゃんと くる`, () => {
  const map = buildMap(MID), zc = zombieColliders(map), pc = playerColliders(map);
  assert.equal(map.vertical, true);
  const nav = makeNav(zc, map);
  assert.ok(nav.layered && nav.N > 5000 && nav.N < 60000, `nodes ${nav.N}`);
  const s = map.playerStart;
  const r0 = collideCircle(s.x, s.z, 0.35, 0, pc);
  assert.ok(Math.hypot(r0.x - s.x, r0.z - s.z) < 1e-9, 'start inside a collider');
  // たかさの ちがう ゆかが ある
  const levels = new Set(); for (let k = 0; k < nav.N; k++) if (nav.h[k] > 2) levels.add(Math.round(nav.h[k]));
  assert.ok(levels.size >= 3, 'たかい ゆか');
  for (const tg of VERT[MID]) {
    const [px, pz, py] = tg;
    assert.ok(Math.abs(groundHeight(px, pz, 0.35, py + 0.2, pc) - py) < 0.05, `${tg} は ゆかの うえ`);
    nav.update(px, py, pz);
    for (const sp of map.spawns) {
      const d = nav.distAt(sp.x - Math.sign(sp.x) * (Math.abs(sp.x) > map.half ? 3 : 0), sp.y || 0, sp.z - Math.sign(sp.z) * (Math.abs(sp.z) > map.half ? 3 : 0));
      assert.ok(d >= 0 && d < nav.o.far, `${MID} ${tg}: gate ${sp.x},${sp.z} から とどかない`);
    }
    const t = simWalk(map, nav, zc, tg, 12, 7), mean = t.reduce((a, b) => a + b, 0) / t.length;
    assert.ok(Math.max(...t) < 90, `${MID} ${tg}: とどかない ゾンビ ${Math.max(...t).toFixed(1)}s`);
    assert.ok(mean < (py > 6 ? 55 : 38), `${MID} ${tg}: へいきん ${mean.toFixed(1)}s`);
  }
});

test('v0.6.0 やねの まち: はしご・さか・かいだん、やねは「たかい」', () => {
  const map = buildMap('rooftop'), pc = playerColliders(map);
  assert.ok(map.ladders.length >= 2, 'はしご');
  for (const L of map.ladders) { assert.ok(L.top - L.base > 2 && L.maxX > L.minX && L.maxZ > L.minZ); }
  assert.ok(map.boxes.some((b) => b.slope), 'さか');
  // やねの うえは walk じゃない（ずっと いると はやい ゾンビが くる）
  const top = supportBox(-2, -17, 0.35, groundHeight(-2, -17, 0.35, 5.7, pc), pc);
  assert.ok(top && !top.walk && top.maxY > 0.45);
});

test('v0.6.0 はいきょの ビル: 4かい・ゆかは ふつうの ゆか・やねは たかい・みえる かいだけ かく', () => {
  const map = buildMap('office'), pc = playerColliders(map);
  const I = map.interior;
  assert.ok(I && I.levels === 4 && I.H > 3.5);
  for (const [x, z, y] of [[-12, 0, 4.2], [12, 0, 8.4]]) { const b = supportBox(x, z, 0.35, groundHeight(x, z, 0.35, y + 0.1, pc), pc); assert.ok(b && b.walk, `${y}m の ゆかは walk`); }
  const roof = supportBox(0, 8, 0.35, groundHeight(0, 8, 0.35, 12.7, pc), pc); assert.ok(roof && !roof.walk, 'やねは たかい');
  const lv = new Set(map.boxes.filter((b) => b.lvl != null).map((b) => b.lvl));
  assert.ok(lv.size >= 3, 'かいごとに わける（みえない かいは かかない）');
  // エレベーターの あな: ゆかが ない
  assert.ok(groundHeight(0, -3.6, 0.2, 8.5, pc) < 2.5, 'エレベーターの あなは かごの うえまで おちる');
});

test('v0.6.1 いつも くらい: ゆうやけ・よるは くらい そら・こい きり・つき・かみなり・マップごとの はいけい（v0.7.1: ひるは べつ）', async () => {
  const lum = (c) => 0.299 * ((c >> 16) & 255) + 0.587 * ((c >> 8) & 255) + 0.114 * (c & 255);
  for (const k of ['sunset', 'night']) {
    const t = TOD[k];
    assert.ok(lum(t.fog) < 60, `${k} きり くらい`);
    assert.ok(lum(t.sky[0]) < 25 && lum(t.sky[1]) < 50, `${k} そら くらい`);
    assert.ok(t.far <= 54 && t.near <= 12, `${k} きり こい`);
    assert.ok(t.moon >= 0.7, `${k} つきが みえる`);
    assert.ok(Math.min(1, t.night + t.lamps * 0.35) > 0.5, `${k} かみなり・まどの あかり`);
    assert.ok(t.hemiI >= 0.9 && t.hemiI <= 1.1, `${k} ゾンビは みえる`);
    assert.equal(t.sky[3], t.fog, `${k} ちへいせんと きりが おなじ いろ`);
  }
  const { BACKDROPS } = await import('../js/backdrop.js');
  for (const id of MAP_IDS_MAP) { const b = BACKDROPS[id]; assert.ok(b && b.fires >= 1 && b.smoke >= 1 && b.bolt > 0 && b.moon != null, id); }
});

// ---- v0.7.0 けいさつロボ ----
test('v0.7.0 けいさつロボ: さわると なかま・プレイヤーの ひだり うしろに つく', () => {
  assert.equal(robotTouched(0.8, 0.6, 0), true);
  assert.equal(robotTouched(2, 0, 0), false);
  assert.equal(robotTouched(0.5, 0, 2.5), false, 'ちがう かいでは さわれない');
  for (const yaw of [0, 1, -2, 3]) {
    const fp = robotFollowPoint(5, 5, yaw);
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = -fz, rz = fx;
    const along = (fp.x - 5) * fx + (fp.z - 5) * fz, side = (fp.x - 5) * rx + (fp.z - 5) * rz;
    assert.ok(along < 0, 'うしろ'); assert.ok(side < -1, 'ひだり（カメラは みぎかた）');
    assert.ok(Math.hypot(fp.x - 5, fp.z - 5) < 2.5, 'そばに いる');
  }
});

test('v0.7.0 けいさつロボ: うしろ・よこの ゾンビを さきに ねらう', () => {
  // yaw 0: まえは -z
  assert.ok(blindness(0, 0, 0, 0, -5) < 0.05 && blindness(0, 0, 0, 0, 5) > 0.95 && Math.abs(blindness(0, 0, 0, 5, 0) - 0.5) < 0.05);
  assert.ok(robotTargetScore(6, 1) < robotTargetScore(4, 0), 'うしろの 6m は まえの 4m より さき');
  const z = (x, zz, o = {}) => ({ alive: true, x, z: zz, ...o });
  const zs = [z(0, -4), z(0, 7), z(-6, 0), z(0, 3, { alive: false }), z(1, 2, { demo: true })];
  assert.equal(pickRobotTarget(zs, 0, 0, 0, -1.5, 0.3, null), 1, 'うしろの ゾンビ');
  assert.equal(pickRobotTarget(zs, 0, 0, 0, -1.5, 0.3, (q) => q !== zs[1]), 2, 'みえない ときは よこ');
  assert.equal(pickRobotTarget([z(40, 40)], 0, 0, 0, 0, 0, null), -1, 'とおすぎ');
  assert.equal(pickRobotTarget([], 0, 0, 0, 0, 0, null), -1);
});

test('v0.7.0 けいさつロボ: HP・こわれる・ワープ・ゾンビに ねらわれる', () => {
  const r = { hp: ROBOT.hp, state: 'on' };
  assert.ok(ROBOT.hp >= 150 && ROBOT.dmgMul < 1);
  assert.equal(damageRobot(r, 10), false); assert.equal(r.hp, ROBOT.hp - 10 * ROBOT.dmgMul);
  let n = 0; while (!damageRobot(r, 22)) n++;
  assert.equal(r.state, 'broken'); assert.equal(r.hp, 0);
  assert.ok(n > 15, `でかい ゾンビ ${n}かいで こわれる（すぐには こわれない）`);
  assert.equal(damageRobot(r, 10), false, 'こわれたら おわり（かいふく しない）');
  assert.equal(damageRobot({ hp: 100, state: 'idle' }, 50), false, 'なかまに なる まえは きずつかない');
  assert.equal(shouldTeleportRobot(30, 0, true, 0), false, 'みえて いる ときは ワープ しない');
  assert.equal(shouldTeleportRobot(30, 0, false, 0), true);
  assert.equal(shouldTeleportRobot(3, 4, false, 0), true, 'べつの かい');
  assert.equal(shouldTeleportRobot(3, 0, false, 3), true, 'うごけない');
  assert.equal(shouldTeleportRobot(3, 0, false, 0), false);
  assert.equal(zombieTargetsRobot(6, 1.5, 0), true);
  assert.equal(zombieTargetsRobot(1.2, 1.5, 0), false, 'プレイヤーが ちかい');
  assert.equal(zombieTargetsRobot(6, 1.5, 3), false, 'べつの かい');
  assert.equal(zombieTargetsRobot(9, 5, 0), false);
});

for (const MID of MAP_IDS_MAP) test(`[${MID}] v0.7.0 けいさつロボの ばしょ: スタートの そばでは ない・あるいて いける`, () => {
  const map = buildMap(MID), zc = zombieColliders(map);
  const nav = makeNav(zc, map), ps = map.playerStart;
  nav.update(ps.x, 0, ps.z);
  const cells = nav.openCells(map.half - 3).filter((c) => Math.abs(c[2] || 0) < 0.5);
  for (let i = 0; i < 20; i++) {
    const [x, z] = pickRobotSpot(cells, ps.x, ps.z, i / 20);
    const d = Math.hypot(x - ps.x, z - ps.z);
    assert.ok(d >= ROBOT.spot[0] && d <= ROBOT.spot[1], `dist ${d}`);
    assert.ok(nav.free(x, 0, z), 'あるける');
  }
});

// ロボの うごき（ゲームと おなじ: おなじ かいで みとおしが よければ まっすぐ・ほかは nav）
function simRobot(map, nav, pc, [px, pz, py], from) {
  nav.update(px, py, pz);
  let [x, z, y] = from, t = 0;
  while (t < 60) {
    const fp = robotFollowPoint(px, pz, 0); const dF = Math.hypot(fp.x - x, fp.z - z);
    if (Math.hypot(px - x, pz - z) < 3 && Math.abs(py - y) < 0.4) return { t, y };
    let f;
    if (Math.abs(py - y) < 0.4 && nav.lineClear(x, y, z, fp.x, py, fp.z)) f = { x: (fp.x - x) / dF, z: (fp.z - z) / dF };
    else f = nav.dir(x, y, z) || { x: (fp.x - x) / dF, z: (fp.z - z) / dF };
    for (let i = 0; i < 3; i++) { const c = collideCircle(x + f.x * ROBOT.runSpeed * 0.05 / 3, z + f.z * ROBOT.runSpeed * 0.05 / 3, 0.32, y, pc); x = c.x; z = c.z; }
    const g = groundHeight(x, z, 0.15, y + 0.001, pc);
    y = g >= y - 0.001 ? g : Math.max(g, y - 0.5); t += 0.05;
  }
  return { t, y };
}
for (const MID of Object.keys(VERT)) test(`[${MID}] v0.7.0 けいさつロボ: かいだんで うえの かいへ ついていく`, () => {
  const map = buildMap(MID), zc = zombieColliders(map), pc = playerColliders(map);
  const nav = makeNav(zc, map), s = map.playerStart;
  for (const tg of VERT[MID].slice(1)) {
    const r = simRobot(map, nav, pc, tg, [s.x - 1.5, s.z + 0.5, 0]);
    // あるいて とどくか、とどかない ときは ワープの ルールで そばへ くる
    const walked = r.t < 60;
    assert.ok(walked || shouldTeleportRobot(20, tg[2] - r.y, false, 0), `${MID} ${tg}: t=${r.t.toFixed(1)} y=${r.y.toFixed(2)}`);
    if (tg[2] <= 8.5) assert.ok(walked, `${MID} ${tg}: かいだんで のぼれない t=${r.t.toFixed(1)} y=${r.y.toFixed(2)}`);
  }
});

// バランス: ロボが いると たすかる けど、かんたんに なりすぎない
test('v0.7.0 けいさつロボ: バランス シム（うしろの ダメージが へる・クリアは はやく なりすぎない）', () => {
  const run = (bot, seed) => {
    const rnd = lcg(seed); const zs = []; let hurt = 0, t = 0, spawnT = 0, left = 40, pf = 0, bf = 0, yaw = 0, tg = null;
    const robot = bot ? { hp: ROBOT.hp, state: 'on', x: 0, z: 0 } : null;
    const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
    while ((left > 0 || zs.some((q) => q.alive)) && t < 600) {
      t += 0.05; spawnT -= 0.05;
      if (left > 0 && spawnT <= 0) { const a = rnd() * Math.PI * 2; zs.push({ alive: true, x: Math.sin(a) * 18, z: Math.cos(a) * 18, hp: ZOMBIES.walker.hp, atk: 0 }); left--; spawnT = 0.55; }
      // プレイヤー: いちばん ちかい ゾンビへ ふりむいて（6 rad/s）ライフルで うつ（こどもの うで: あたり 45%）
      if (!tg || !tg.alive) tg = zs.filter((q) => q.alive && Math.hypot(q.x, q.z) < 25).sort((p, q) => Math.hypot(p.x, p.z) - Math.hypot(q.x, q.z))[0] || null;
      pf -= 0.05;
      if (tg) {
        const want = Math.atan2(-tg.x, -tg.z), dy = wrap(want - yaw); yaw = wrap(yaw + Math.sign(dy) * Math.min(Math.abs(dy), 6 * 0.05));
        if (Math.abs(dy) < 0.15 && pf <= 0) { pf = WEAPONS.rifle ? fireInterval(WEAPONS.rifle) : 0.1; if (rnd() < 0.45) { tg.hp -= 21; if (tg.hp <= 0) tg.alive = false; } }
      }
      if (robot && robot.state === 'on') {
        const fp = robotFollowPoint(0, 0, yaw); robot.x = fp.x; robot.z = fp.z;
        bf -= 0.05;
        if (bf <= 0) { const i = pickRobotTarget(zs, 0, 0, yaw, robot.x, robot.z, null); if (i >= 0) { const q = zs[i]; bf = ROBOT.fireRate; if (rnd() < 0.85) { q.hp -= ROBOT.dmg; if (q.hp <= 0) q.alive = false; } } }
      }
      for (const q of zs) {
        if (!q.alive) continue;
        const dp = Math.hypot(q.x, q.z), dr = robot && robot.state === 'on' ? Math.hypot(q.x - robot.x, q.z - robot.z) : Infinity;
        const goR = robot && robot.state === 'on' && zombieTargetsRobot(dp, dr, 0);
        const tx = goR ? robot.x : 0, tz = goR ? robot.z : 0, d = goR ? dr : dp;
        if (d > ATTACK_RANGE * 0.95) { q.x += (tx - q.x) / d * ZOMBIES.walker.speed * 0.05; q.z += (tz - q.z) / d * ZOMBIES.walker.speed * 0.05; }
        else { q.atk -= 0.05; if (q.atk <= 0) { q.atk = ZOMBIES.walker.atkRate; if (goR) damageRobot(robot, ZOMBIES.walker.dmg); else hurt += ZOMBIES.walker.dmg; } }
      }
    }
    return { hurt, t, robot };
  };
  let h0 = 0, h1 = 0, t0 = 0, t1 = 0;
  for (let s = 1; s <= 6; s++) { const a = run(false, s), b = run(true, s); if (process.env.SIMLOG) console.log("run", s, a.hurt, b.hurt, b.robot.state, b.robot.hp.toFixed(0)); h0 += a.hurt; h1 += b.hurt; t0 += a.t; t1 += b.t; }
  if (process.env.SIMLOG) console.log("balance", h0, h1, t0 / 6, t1 / 6);
  assert.ok(h1 < h0 * 0.75, `ロボで うしろの ダメージが へる ${h0} → ${h1}`);
  assert.ok(h1 > 0, 'ロボが いても ダメージは うける（かんたんすぎない）');
  assert.ok(t1 > t0 * 0.6, `クリア じかん ${(t0 / 6).toFixed(0)}s → ${(t1 / 6).toFixed(0)}s`);
});

test('v0.7.0 ぶき ボタン: ちいさく・でも ゆびで おせる', () => {
  assert.ok(WEAPON_BAR.slotW >= 40 && WEAPON_BAR.slotH >= 40, 'タッチ 40px いじょう');
  assert.ok(WEAPON_BAR.chipW * WEAPON_BAR.chipH <= 47 * 44 * 0.5, 'みえる ボタンは まえの はんぶん いか');
  assert.ok(WEAPON_BAR.slotW * 5 + WEAPON_BAR.gap * 4 <= 210, '5つ ならべても みぎうえ だけ');
  assert.ok(WEAPON_BAR.slotW * WEAPON_ORDER.length + WEAPON_BAR.gap * (WEAPON_ORDER.length - 1) <= 300, '7つ でも iPhone SE の はばに はいる');
});

test('v0.7.0 おじさん: すぐには たおれない（どの ウェーブでも 45びょう いじょう）', () => {
  assert.ok(OJISAN.maxBiters <= 2);
  assert.ok(OJISAN.dist[0] >= 8 && OJISAN.dist[1] <= 20, 'プレイヤーの ちかく（でも となりでは ない）');
  for (let w = OJISAN.firstWave; w <= 30; w++) {
    const n = ojisanAttackers(w);
    const kinds = Array.from({ length: n }, (_, i) => (w >= 4 && i === n - 1 ? 'runner' : 'walker'));
    const t = ojisanSurvivalTime(kinds);
    assert.ok(t >= Math.max(45, OJISAN.minSurvive), `wave ${w}: ${t.toFixed(1)}s`);
  }
  // さいあくでも（はやい ゾンビ ばかり・すぐ そばから）
  assert.ok(ojisanSurvivalTime(['runner', 'runner', 'runner', 'runner', 'runner'], ZOMBIES, ATTACK_RANGE) >= 45);
  // プレイヤーが ふつうに はしって いける（いちばん とおくても ~4m/s で 5びょう）
  assert.ok(OJISAN.dist[1] / 4 < 10);
});

// ---- v0.7.1 よるの あと ひるに もどる ----
test('v0.7.1 よる → ひる: ラベルが「ひる」なら みためも ひるに もどる（そら・きり・ひかり・ほし・ライト）', () => {
  const Ld = todLook(TOD.day), Ls = todLook(TOD.sunset), Ln = todLook(TOD.night);
  // ひるは よる・ゆうやけ より はっきり あかるい（でも まっしろ では ない）
  assert.ok(Ld.sky > Ln.sky + 40 && Ld.sky > Ls.sky + 25, 'ひるの そらは あかるい');
  assert.ok(Ld.fog > Ln.fog + 50 && Ld.fog > Ls.fog + 40 && Ld.fog < 130, 'ひるの きりは あかるい はいいろ');
  assert.ok(Ld.light > Ln.light * 1.4, 'ひるの ひかりは つよい');
  assert.ok(Ld.far > Ln.far + 20, 'ひるは とおくまで みえる');
  assert.equal(Ld.stars, 0); assert.equal(Ld.moon, 0); assert.equal(Ld.flashlight, false);
  assert.equal(Ln.flashlight, true);
  // ゲームと おなじ ながれ: よるから はじめて 3ウェーブ → ひる。いまの いろ（よる）から まぜて k=1 で ひるに なる
  for (const start of ['day', 'night']) {
    let cur = { ...TOD[timeOfDay(1, start)] }, seen = [];
    for (let w = 2; w <= 9; w++) {
      const to = timeOfDay(w, start);
      for (const k of [0.25, 0.5, 0.75]) blendTod(cur, TOD[to], k); // とちゅう
      cur = blendTod(cur, TOD[to], 1);
      assert.deepEqual(todLook(cur), todLook(TOD[to]), `${start} ウェーブ${w} ${to}`);
      seen.push(to);
    }
    assert.ok(seen.filter((t) => t === 'day').length >= 2, 'ひるが なんども くる');
  }
  // とちゅうの いろも ちゃんと まざる（よる→ひる の まんなかは あいだの あかるさ）
  const mid = todLook(blendTod(TOD.night, TOD.day, 0.5));
  assert.ok(mid.fog > Ln.fog && mid.fog < Ld.fog && mid.light > Ln.light && mid.light < Ld.light);
  // TOD の キーは ぜんぶ おなじ（まぜる ときに のこりが でない）
  for (const k of ['sunset', 'night']) assert.deepEqual(Object.keys(TOD[k]).sort(), Object.keys(TOD.day).sort());
});

// ---- v0.8.0: ぶきを つよく・すてると スコア・スナイパー・みはりだい ----
import * as R8 from '../js/rules.js';
{
  const { UPGRADE, upgradeCost, upgradedWeapon, buyUpgrade, earnBank, weaponLevel, setGunLevel, gearRefund, discardGear, REFUND, isWorn,
    needsDropConfirm, weakestLoose, castPierce, aimFov, aimSensMul, scopeSway, isScoped, hasScope, SCOPE, AIM_FOV, BANK_START_MAX, gunStats } = R8;

  const gen = (r, slot, rar) => { for (;;) { const g = rollGear(r, { slot, floor: rar }); if (g.rarity === rar) return g; } };
  test('v0.8.0 つよく する: ねだんは だんだん たかく・さいこう レベルで おしまい', () => {
    for (const id of WEAPON_ORDER) {
      let prev = 0;
      for (let lv = 1; lv < UPGRADE.max; lv++) { const c = upgradeCost(id, lv); assert.ok(Number.isFinite(c) && c > prev, `${id} Lv${lv}`); prev = c; }
      assert.equal(upgradeCost(id, UPGRADE.max), Infinity);
      assert.equal(upgradedWeapon(id, 99).lv, UPGRADE.max);
    }
    assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map((l) => upgradeCost('rifle', l)), [400, 600, 900, 1350, 2030, 3040, 4560]);
  });

  test('v0.8.0 つよく する: いりょく・はやさ・たまが ふえる（へらない）', () => {
    for (const id of WEAPON_ORDER) {
      const a = upgradedWeapon(id, 1), b = upgradedWeapon(id, 2), z = upgradedWeapon(id, UPGRADE.max);
      assert.equal(a.dmg, WEAPONS[id].dmg); assert.equal(a.rpm, WEAPONS[id].rpm); assert.equal(a.mag, WEAPONS[id].mag);
      assert.ok(b.dmg > a.dmg && b.rpm >= a.rpm && b.mag >= a.mag, id);
      assert.ok(z.dmg >= a.dmg * 1.6 && z.rpm > a.rpm && (WEAPONS[id].revolver ? z.mag === 6 : z.mag > a.mag), id);
    }
    assert.equal(upgradedWeapon('rocket', 5).mag, 1); assert.equal(upgradedWeapon('rocket', 6).mag, 2);
    // じゅうは レベルの つよさで うつ
    const g = createGun('rifle', 3);
    assert.equal(g.lv, 3); assert.equal(g.ammo, upgradedWeapon('rifle', 3).mag); assert.equal(gunStats(g).dmg, upgradedWeapon('rifle', 3).dmg);
    const g2 = createGun('rifle'); g2.ammo = 10; setGunLevel(g2, 8);
    assert.equal(g2.w.lv, 8); assert.ok(g2.ammo > 10 && g2.ammo <= g2.w.mag, 'たまは へらない');
  });

  test('v0.8.0 つよく する: スコアが たりないと かえない・さいこう スコアは へらない', () => {
    const s = normalizeSave({ bestScore: 50000, bestWave: 9, bank: 500 });
    assert.equal(weaponLevel(s, 'rifle'), 1);
    let r = buyUpgrade(s, 'rifle'); assert.ok(r.ok); assert.equal(s.bank, 100); assert.equal(weaponLevel(s, 'rifle'), 2);
    r = buyUpgrade(s, 'rifle'); assert.ok(!r.ok); assert.equal(r.short, 500); assert.equal(s.bank, 100); assert.equal(weaponLevel(s, 'rifle'), 2);
    assert.equal(s.bestScore, 50000); assert.equal(s.bestWave, 9);
    s.bank = 9e6; for (let i = 0; i < 20; i++) buyUpgrade(s, 'pistol');
    assert.equal(weaponLevel(s, 'pistol'), UPGRADE.max); assert.ok(buyUpgrade(s, 'pistol').max);
    assert.equal(s.bestScore, 50000);
    earnBank(s, -5); earnBank(s, NaN); const b = s.bank; earnBank(s, 120); assert.equal(s.bank, b + 120);
  });

  test('v0.8.0 セーブ: bank と wlv（ふるい セーブは さいこう スコアから すこし おまけ）', () => {
    assert.equal(normalizeSave({ bestScore: 999999 }).bank, BANK_START_MAX);
    assert.equal(normalizeSave({ bestScore: 700 }).bank, 700);
    assert.equal(normalizeSave({ bestScore: 700, bank: 0 }).bank, 0);
    assert.equal(normalizeSave({ bank: -5 }).bank, 0);
    assert.equal(normalizeSave({ bank: 12.7 }).bank, 12);
    const w = normalizeSave({ wlv: { rifle: 4, sniper: 99, shotgun: 'x', zzz: 3 } }).wlv;
    assert.deepEqual(w, { rifle: 4, pistol: 1, shotgun: 1, rocket: 1, minigun: 1, sniper: UPGRADE.max, magnum: 1 });
  });

  test('v0.8.0 すてると スコア: レアほど おおい（n<r<sr<l）・つけている ものは すてない', () => {
    assert.ok(REFUND.n < REFUND.r && REFUND.r < REFUND.sr && REFUND.sr < REFUND.l);
    const r = lcg(3);
    const avg = (rar) => { let t = 0; for (let i = 0; i < 40; i++) t += gearRefund(gen(r, 'head', rar)); return t / 40; };
    const v = ['n', 'r', 'sr', 'l'].map(avg);
    assert.ok(v[0] < v[1] && v[1] < v[2] && v[2] < v[3], v.join(','));
    for (let i = 0; i < 30; i++) for (const rar of ['n', 'r', 'sr', 'l']) {
      const g = gen(r, GEAR_SLOT_IDS[i % 4], rar), f = gearRefund(g);
      assert.ok(f >= REFUND[rar] && f % 10 === 0);
    }
    const s = normalizeSave({ bank: 0 });
    const a = gen(r, 'head', 'l'), b = gen(r, 'head', 'n');
    gearAction(s.gear, a, 'equip'); gearAction(s.gear, b, 'keep');
    assert.ok(isWorn(s.gear, a) && !isWorn(s.gear, b));
    assert.deepEqual(discardGear(s, a), { ok: false, worn: true }); assert.equal(s.bank, 0);
    assert.ok(s.gear.inv.includes(a));
    const d = discardGear(s, b); assert.ok(d.ok); assert.equal(s.bank, gearRefund(b)); assert.ok(!s.gear.inv.includes(b));
    assert.ok(needsDropConfirm(a)); assert.ok(!needsDropConfirm(b));
    assert.equal(weakestLoose(s.gear), null, 'つけている ものは えらばない');
  });

  test('v0.8.0 じどう そうび: かばんが いっぱいでも つけている ものは すてない', () => {
    const r = lcg(11);
    for (let trial = 0; trial < 30; trial++) {
      const gear = normalizeGear(null);
      for (const sl of GEAR_SLOT_IDS) gearAction(gear, gen(r, sl, 'r'), 'equip');
      while (gear.inv.length < INV_CAP) gearAction(gear, rollGear(r, GEAR_SLOT_IDS[gear.inv.length % 4], ['n', 'r', 'sr'][gear.inv.length % 3], 3), 'keep');
      const worn = GEAR_SLOT_IDS.map((sl) => gear.eq[sl]).filter(Boolean);
      const res = autoPickup(gear, gen(r, GEAR_SLOT_IDS[trial % 4], 'l'));
      if (res.dropped) assert.ok(!worn.includes(res.dropped.id) || gear.eq[res.dropped.slot] !== res.dropped.id, 'つけていた ものを すてた');
      for (const sl of GEAR_SLOT_IDS) if (gear.eq[sl]) assert.ok(gear.inv.some((g) => g.id === gear.eq[sl]), 'つけている ものが かばんに ある');
      assert.ok(gear.inv.length <= INV_CAP);
    }
    // ぜんぶ つけていて かばんが いっぱい → なにも すてない
    const g2 = normalizeGear(null);
    for (let i = 0; i < INV_CAP; i++) { const it = gen(r, GEAR_SLOT_IDS[i % 4], 'n'); g2.inv.push(it); }
    for (const sl of GEAR_SLOT_IDS) g2.eq[sl] = g2.inv.find((g) => g.slot === sl).id;
    const nb = g2.inv.filter((g) => !isWorn(g2, g)); for (const g of nb) gearAction(g2, g, 'drop');
    while (g2.inv.length < INV_CAP) g2.inv.push(gen(r, 'head', 'n'));
    // かばんの ものを ぜんぶ つける ことは できないので、ここでは「すてるのは かばんの もの だけ」を みる
    const before = GEAR_SLOT_IDS.map((sl) => g2.eq[sl]);
    const res2 = autoPickup(g2, gen(r, 'head', 'l'));
    if (res2.dropped) assert.ok(!before.includes(res2.dropped.id) || res2.dropped.slot === 'head');
  });

  test('v0.8.0 ぶいの レベル（あたま Lv3 など）: そうびを かえても すてても のこる・じどう そうびは もとの つよさで くらべる', () => {
    const { SLOT_UP, slotLevel, slotUpCost, slotBonus, buySlotUpgrade, gearEffects: GE, bestLoadout: BL } = R8;
    for (const sl of GEAR_SLOT_IDS) {
      let prev = 0; for (let l = 1; l < SLOT_UP.max; l++) { const c = slotUpCost(sl, l); assert.ok(c > prev); prev = c; }
      assert.equal(slotUpCost(sl, SLOT_UP.max), Infinity);
    }
    assert.deepEqual([1, 2, 3, 4].map((l) => slotUpCost('head', l)), [200, 300, 450, 680]);
    const r = lcg(5), s = normalizeSave({ bank: 5000 });
    const h1 = gen(r, 'head', 'n'), h2 = gen(r, 'head', 'sr'), b1 = gen(r, 'body', 'r');
    gearAction(s.gear, h1, 'equip'); gearAction(s.gear, h2, 'keep'); gearAction(s.gear, b1, 'equip');
    const e0 = GE(s.gear, s);
    assert.ok(buySlotUpgrade(s, 'head').ok && buySlotUpgrade(s, 'head').ok); assert.equal(slotLevel(s, 'head'), 3);
    assert.equal(s.bank, 5000 - 200 - 300); assert.equal(s.bestScore, 0);
    const e1 = GE(s.gear, s);
    assert.equal(e1.totals.def, e0.totals.def + slotBonus('head', 3).def); assert.equal(e1.totals.rel, e0.totals.rel + 2);
    // つけかえても レベルは のこる
    const best = BL(s.gear); assert.equal(best.eq.head, BL({ inv: s.gear.inv, eq: s.gear.eq }).eq.head, 'ボーナスで えらびかたは かわらない');
    gearAction(s.gear, h2, 'equip'); assert.equal(slotLevel(s, 'head'), 3);
    assert.equal(GE(s.gear, s).bonus.def, slotBonus('head', 3).def + slotBonus('body', 1).def);
    // すてても へらない・もどる スコアは レアと もとの つよさ だけ
    const ref = gearRefund(h1), d = discardGear(s, h1);
    assert.ok(d.ok); assert.equal(d.refund, ref); assert.equal(slotLevel(s, 'head'), 3);
    assert.equal(normalizeSave(JSON.parse(JSON.stringify(s))).slv.head, 3, 'セーブに のこる');
    // なにも つけて いない ぶいには きかない
    assert.equal(GE({ inv: [], eq: {} }, s).bonus.def, 0);
    // ぶいが MAX
    s.bank = 1e6; for (let i = 0; i < 10; i++) buySlotUpgrade(s, 'feet');
    assert.equal(slotLevel(s, 'feet'), SLOT_UP.max); assert.ok(buySlotUpgrade(s, 'feet').max);
    assert.equal(normalizeSave({ slv: { head: 99, body: -1, feet: 'x' } }).slv.head, SLOT_UP.max);
  });

  test('v0.8.0 たいりょく Lv: きほんの HP だけ +12%・そうびの HP は そのまま たす・やりすぎない', () => {
    const { HP_UP, hpLevel, hpUpCost, baseHpAt, buyHpUpgrade, gearEffects: GE } = R8;
    assert.deepEqual([1, 2, 3, 4, 5].map(hpUpCost), [300, 480, 770, 1230, 1970]);
    assert.equal(hpUpCost(HP_UP.max), Infinity);
    assert.deepEqual([1, 2, 3, 4, 5, 6].map(baseHpAt), [100, 112, 124, 136, 148, 160]);
    const s = normalizeSave({ bank: 400, bestScore: 900 });
    assert.equal(GE(s.gear, s).maxHp, 100);
    assert.ok(buyHpUpgrade(s).ok); assert.equal(hpLevel(s), 2); assert.equal(s.bank, 100); assert.equal(s.bestScore, 900);
    assert.ok(!buyHpUpgrade(s).ok); assert.equal(hpLevel(s), 2);
    const hp = gen(lcg(9), 'body', 'r'); hp.stats = { hp: 20 }; gearAction(s.gear, hp, 'equip');
    assert.equal(GE(s.gear, s).maxHp, 112 + 20, 'そうびの HP には かけない');
    s.bank = 1e6; while (buyHpUpgrade(s).ok);
    assert.equal(hpLevel(s), HP_UP.max);
    // いちばん つよくても HP は 160 + そうび 50 = 210 まで（2ばい ちょっと）
    assert.ok(baseHpAt(HP_UP.max) + GEAR_STATS.hp.cap <= 210);
    assert.equal(normalizeSave({ hlv: 42 }).hlv, HP_UP.max);
  });

  test('v0.8.0 スナイパー: ふつうの ゾンビは 1ぱつ・おそい ボルト・ちいさい マガジン・キー6', () => {
    const w = WEAPONS.sniper;
    assert.equal(WEAPON_ORDER[5], 'sniper'); assert.equal(w.slot, 6); assert.equal(WEAPON_ORDER.length, 7);
    assert.ok(!w.auto && w.rpm <= 60 && w.mag <= 6 && w.pierce >= 1 && w.pierce <= 2);
    for (const d of [5, 40, 80, 130]) assert.ok(damageAt(w, d, false) >= ZOMBIES.walker.hp, `walker @${d}`);
    for (const d of [5, 40]) assert.ok(damageAt(w, d, false) * 0.64 >= ZOMBIES.walker.hp, `3たいめ @${d}`);
    for (const d of [5, 60]) { assert.ok(damageAt(w, d, false) >= ZOMBIES.runner.hp); }
    assert.ok(damageAt(w, 20, true) >= ZOMBIES.brute.hp, 'でかいのも あたまなら 1ぱつ');
    assert.ok(!Object.values(WEAPONS).some((x) => /[A-Z]{2,}|®|™/.test(x.name)), 'じつざいの なまえ なし');
  });

  test('v0.8.0 スナイパー: ならんだ ゾンビを つらぬく（かべで とまる）', () => {
    const mk = (z) => ({ alive: true, x: 0, z, y: 0, scale: 1, kind: 'walker', crawl: 0, lean: 0, yaw: 0, fly: null });
    const zs = [mk(-10), mk(-14), mk(-18), mk(-22)];
    const p = castPierce(0, 1.2, 0, 0, 0, -1, zs, [], 100, 2, 0.8);
    assert.deepEqual(p.hits.map((h) => h.index), [0, 1, 2]);
    assert.deepEqual(p.hits.map((h) => +h.mul.toFixed(2)), [1, 0.8, 0.64]);
    const wall = [{ minX: -2, maxX: 2, minY: 0, maxY: 3, minZ: -16, maxZ: -15.5 }];
    const q = castPierce(0, 1.2, 0, 0, 0, -1, zs, wall, 100, 2, 0.8);
    assert.deepEqual(q.hits.map((h) => h.index), [0, 1]); assert.equal(q.end.kind, 'wall');
    const one = castPierce(0, 1.2, 0, 0, 0, -1, zs, [], 100, 0);
    assert.equal(one.hits.length, 1);
    // 3たいめでも ふつうの ゾンビを たおせる
  });

  test('v0.8.0 スコープは スナイパー だけ（ほかの ぶきは いつもの ねらい）', () => {
    for (const id of WEAPON_ORDER) {
      if (id === 'sniper') continue;
      assert.equal(hasScope(id), false); assert.equal(isScoped(id, 1), false);
      assert.equal(aimFov(id, 1), AIM_FOV.aim); assert.equal(aimFov(id, 0), AIM_FOV.hip); assert.equal(aimSensMul(id, 1), 1);
    }
    assert.ok(hasScope('sniper')); assert.ok(isScoped('sniper', 1)); assert.ok(!isScoped('sniper', 0.3));
    assert.ok(SCOPE.fov >= 20 && SCOPE.fov <= 25); assert.equal(aimFov('sniper', 1), SCOPE.fov);
    assert.ok(aimSensMul('sniper', 1) < 0.5 && aimSensMul('sniper', 0) === 1);
    // ゆれは ちいさい（0.5ど いか）・ねらって いない ときは なし
    let mx = 0; for (let t = 0; t < 10; t += 0.05) { const s = scopeSway(t, 1, true); mx = Math.max(mx, Math.hypot(s.x, s.y)); }
    assert.ok(mx > 0 && mx < 0.5 * Math.PI / 180, String(mx));
    assert.deepEqual(scopeSway(1, 0), { x: 0, y: 0 });
  });

  test('v0.8.0 みはりだい: ほとんどの マップに ある・はしごの まえは あるいて いける・たかい', () => {
    let n = 0;
    for (const id of MAP_IDS_MAP) {
      const map = buildMap(id);
      if (!map.perches.length) { assert.equal(id, 'office', `${id} に みはりだいが ない`); continue; }
      n++;
      const pc = playerColliders(map), zc = zombieColliders(map), s = map.playerStart;
      for (const p of map.perches) {
        assert.ok(p.top >= 3.5 && (p.roof || p.top <= MAX_CLIMB), `${id} たかさ`);
        const lx = p.lx ?? p.x + ({ w: -1, e: 1 }[p.face] || 0) * (p.w / 2 + 0.4), lz = p.lz ?? p.z + ({ n: -1, s: 1 }[p.face] || 0) * (p.w / 2 + 0.4);
        const L = map.ladders.find((l) => Math.abs((l.minX + l.maxX) / 2 - lx) < 0.7 && Math.abs((l.minZ + l.maxZ) / 2 - lz) < 0.7);
        assert.ok(L, `${id} はしご`); assert.ok(L.top >= p.top - 0.05);
        const fv = { n: [0, -1], s: [0, 1], w: [-1, 0], e: [1, 0] }[p.face];
        const fx = lx + fv[0] * 0.8, fz = lz + fv[1] * 0.8;
        const r = collideCircle(fx, fz, 0.35, 0, pc);
        assert.ok(Math.hypot(r.x - fx, r.z - fz) < 1e-6, `${id} はしごの まえが かべ`);
        if (map.vertical) continue;
        const grid = buildGrid(zc, map.half + 4, 1, 0.4); updateFlow(grid, s.x, s.z);
        assert.ok(grid.dist[cellOf(grid, fx, fz)] >= 0, `${id} はしごの まえに いけない`);
        // ゾンビ（のぼれる こ）は みはりだいに のぼれる（あんぜんちたい なし）
        const ztop = climbTarget(p.x + fv[0] * (p.w / 2 + 0.3), p.z + fv[1] * (p.w / 2 + 0.3), 0.3, 0, p.top, pc, 0.15);
        assert.ok(ztop && Math.abs(ztop.maxY - p.top) < 0.01, `${id} ゾンビが のぼれない`);
        // スポーン（ゲート）が すこし とおくに ある
        assert.ok(map.spawns.some((sp) => Math.hypot(sp.x - p.x, sp.z - p.z) > 20));
      }
    }
    assert.ok(n >= 7, `みはりだいの ある マップ ${n}`);
    assert.ok(canClimb('runner'));
  });
}

// ---- v0.9.0 ----
test('けいさつロボの レベル: 10/25/50/90 たいで Lv2〜5', () => {
  assert.equal(robotLevel(0), 1); assert.equal(robotLevel(9), 1); assert.equal(robotLevel(10), 2);
  assert.equal(robotLevel(24), 2); assert.equal(robotLevel(25), 3); assert.equal(robotLevel(49), 3);
  assert.equal(robotLevel(50), 4); assert.equal(robotLevel(89), 4); assert.equal(robotLevel(90), 5); assert.equal(robotLevel(999), 5);
  assert.equal(ROBOT_MAX_LV, 5);
  const s1 = robotStats(1), s5 = robotStats(5);
  assert.equal(s1.dmg, ROBOT.dmg); assert.equal(s1.maxHp, ROBOT.hp); assert.equal(s1.fireRate, ROBOT.fireRate);
  for (let lv = 2; lv <= 5; lv++) { // すこしずつ つよく
    const a = robotStats(lv - 1), b = robotStats(lv);
    assert.ok(b.dmg > a.dmg && b.fireRate < a.fireRate && b.maxHp > a.maxHp);
  }
  const dps = (s) => s.dmg / s.fireRate;
  assert.ok(dps(s5) / dps(s1) < 1.6, 'Lv5 でも つよすぎない'); // バランス
  assert.equal(robotStats(1).next, 10); assert.equal(robotStats(5).next, null);
});
test('ロボ: レベルアップで HP ぜんかい', () => {
  const r = { kills: 9, lv: 1, hp: 30, maxHp: ROBOT.hp };
  assert.equal(robotAddKill(r), true);
  assert.equal(r.lv, 2); assert.equal(r.hp, robotStats(2).maxHp); assert.equal(r.maxHp, robotStats(2).maxHp);
  r.hp = 10; assert.equal(robotAddKill(r), false); assert.equal(r.hp, 10);
  r.kills = 89; r.lv = 4; assert.equal(robotAddKill(r), true); assert.equal(r.lv, 5);
});
test('のりもの: ライフルで 8〜12はつ・ロケットは 1ぱつ', () => {
  const rifle = WEAPONS.rifle.dmg;
  for (const k of ['car', 'van', 'truck']) {
    const n = Math.ceil(vehicleMaxHp(k) / rifle);
    assert.ok(n >= 8 && n <= 12, `${k}: ${n}はつ`);
    const [v] = makeVehicleState([{ id: 0, kind: k, minX: 0, maxX: 4, minZ: 0, maxZ: 2, minY: 0, maxY: 1.6 }]);
    let shots = 0, boom = false;
    while (!boom && shots < 50) { shots++; boom = damageVehicle(v, rifle); }
    assert.equal(shots, n); assert.equal(v.dead, true);
    assert.equal(damageVehicle(v, rifle), false, '2かいは ばくはつ しない');
    const [w] = makeVehicleState([{ id: 1, kind: k, minX: 0, maxX: 4, minZ: 0, maxZ: 2, minY: 0, maxY: 1.6 }]);
    assert.equal(damageVehicle(w, 0, { rocket: true }), true, 'ロケット 1ぱつ');
  }
});
test('のりもの: けむり → ひ → こげ', () => {
  const [v] = makeVehicleState([{ id: 0, kind: 'car', minX: 0, maxX: 4, minZ: 0, maxZ: 2, minY: 0, maxY: 1.6 }]);
  assert.equal(vehicleStage(v), 0);
  damageVehicle(v, v.maxHp * 0.45); assert.equal(vehicleStage(v), 1);
  damageVehicle(v, v.maxHp * 0.3); assert.equal(vehicleStage(v), 2);
  damageVehicle(v, 999); assert.equal(vehicleStage(v), 3);
});
test('のりもの: ちかくの くるまは ゆうばく（とおい・ちがう かいは しない）', () => {
  const box = (id, x, y = 0) => ({ id, kind: 'car', minX: x, maxX: x + 4, minZ: 0, maxZ: 2, minY: y, maxY: y + 1.6, x: x + 2, z: 1 });
  const vs = makeVehicleState([box(0, 0), box(1, 5), box(2, 30), box(3, 6, 8)]);
  const c = chainTargets(vs, vs[0]);
  assert.deepEqual(c.map((v) => v.id), [1]);
  vs[1].fuse = 0.3; assert.equal(chainTargets(vs, vs[0]).length, 0, 'もう ひが ついた くるまは 1かい だけ');
  assert.ok(vehicleGap(vs[0], vs[1]) <= VEHICLE.chainR);
  assert.ok(blastReachesVehicle({ x: 2, y: 1, z: -0.5 }, 1.5, vs[0]));
  assert.ok(!blastReachesVehicle({ x: 2, y: 1, z: -5 }, 1.5, vs[0]));
});
test('ばくはつは ゾンビ だけ（じばく なし・なかま・おじさんも だいじょうぶ）', () => {
  const p = { x: 0, y: 1, z: 0 };
  const T = [
    { team: 'zombie', x: 1, y: 0, z: 0, scale: 1, id: 'z' },
    { team: 'zombie', x: 30, y: 0, z: 0, scale: 1, id: 'far' },
    { team: 'zombie', x: 0.5, y: 0, z: 0, scale: 1, alive: false, id: 'dead' },
    { team: 'player', x: 0, y: 0, z: 0 }, { team: 'ally', x: 0.3, y: 0, z: 0 }, { team: 'ally', x: -0.3, y: 0, z: 0 }, { team: 'npc', x: 0, y: 0, z: 0.4 },
  ];
  for (const r of [WEAPONS.rocket.blast, VEHICLE.blast]) {
    const h = blastHits(p, r, T);
    assert.deepEqual(h.map((x) => x.t.id), ['z']);
    assert.ok(h.every((x) => x.t.team === 'zombie'));
  }
  assert.ok(VEHICLE.blast > WEAPONS.rocket.blast, 'くるまの ばくはつは おおきい');
  assert.ok(VEHICLE.shake <= 0.6 && VEHICLE.flash <= 0.6 && BLAST_FX.shake <= 0.6 && BLAST_FX.flash <= 0.6, 'ゆれ・ひかりは ひかえめ');
});
test('けいさつおじさん: ウェーブ3から・30%・つづけて こない', () => {
  assert.equal(copShouldCome(1, 0, 0), false); assert.equal(copShouldCome(2, 0, 0), false);
  assert.equal(copShouldCome(3, 0, 0.1), true); assert.equal(copShouldCome(3, 0, 0.5), false);
  assert.equal(copShouldCome(4, 3, 0), false, 'つづけて こない');
  assert.equal(copShouldCome(5, 3, 0.29), true);
  let n = 0; for (let i = 0; i < 1000; i++) if (copShouldCome(10, 0, i / 1000)) n++;
  assert.equal(n, 300);
  assert.ok(COP.dmg < ROBOT.dmg && COP.hp < ROBOT.hp, 'ロボより すこし よわい');
  const c = { state: 'on', hp: COP.hp };
  assert.equal(damageAlly(c, 10, COP), false); assert.ok(c.hp < COP.hp);
  assert.equal(damageAlly(c, 9999, COP), true); assert.equal(c.state, 'down');
  assert.equal(damageAlly(c, 10, COP), false);
});
test('マップ: のりものが ある（すくない マップにも たした）', () => {
  for (const id of MAP_IDS_MAP) {
    const m = buildMap(id);
    assert.ok(Array.isArray(m.vehicles), id);
    if (['camp', 'harbor', 'base', 'city'].includes(id)) assert.ok(m.vehicles.length >= 3, `${id}: ${m.vehicles.length}`);
    for (const v of m.vehicles) assert.ok(['car', 'van', 'truck'].includes(v.kind) && v.maxX > v.minX && v.maxZ > v.minZ, id);
  }
});

test('v0.9.0 マグナム: ハンドガンの やく 3ばい・1たい つらぬく・1びょう 2はつ・6はつ・キー7', async () => {
  const R = await import('../js/rules.js');
  const w = WEAPONS.magnum, p = WEAPONS.pistol;
  assert.equal(WEAPON_ORDER[6], 'magnum'); assert.equal(w.slot, 7);
  assert.ok(w.dmg / p.dmg >= 2.7 && w.dmg / p.dmg <= 3.3, 'やく 3ばい');
  assert.equal(w.pierce, 1); assert.equal(w.mag, 6); assert.ok(!w.auto && !w.scope && !w.projectile);
  assert.ok(Math.abs(60 / w.rpm - 0.5) < 0.01, '1びょうに 2はつ');
  assert.ok(w.reload > p.reload && w.reload >= 2 && w.reload <= 2.8, 'リロードは すこし ながい');
  assert.ok(w.recoilPitch > p.recoilPitch * 2 && w.shake > p.shake, 'はんどうが つよい');
  assert.equal(R.hasScope('magnum'), false); assert.equal(R.aimFov('magnum', 1), R.AIM_FOV.aim);
  assert.ok(damageAt(w, 10, false) >= ZOMBIES.walker.hp && damageAt(w, 10, false) * w.pierceMul >= ZOMBIES.walker.hp * 0.9, 'うしろの 1たいも ほぼ たおせる');
  // つらぬく: 2たい まで（3たいめは あたらない）
  const zs = [0, 1, 2].map((i) => ({ x: 0, y: 0, z: -5 - i * 1.5, alive: true, scale: 1, kind: 'walker', yaw: 0 }));
  const r = R.castPierce(0, 1.2, 0, 0, 0, -1, zs, [], 60, w.pierce, w.pierceMul);
  assert.ok(r.hits.length <= 2);
  // つよく する: Lv1〜8・ねだんは ハンドガンと ライフルの あいだ
  for (let lv = 1; lv < R.UPGRADE.max; lv++) {
    const c = R.upgradeCost('magnum', lv);
    assert.ok(c > R.upgradeCost('pistol', lv) && c < R.upgradeCost('rifle', lv), `Lv${lv}: ${c}`);
  }
  assert.equal(R.upgradedWeapon('magnum', 8).mag, 6); assert.ok(R.upgradedWeapon('magnum', 8).dmg > w.dmg);
  assert.equal(R.normalizeSave({}).wlv.magnum, 1);
  const g = createGun('magnum'); assert.equal(g.ammo, 6);
  let n = 0; for (let i = 0; i < 6; i++) { if (tryFire(g, true) === 'fire') n++; tryFire(g, false); updateGun(g, 0.51); }
  assert.equal(n, 6); assert.equal(g.ammo, 0);
});

// ---- v0.10.0: パワードスーツ ----
import { SUIT, SUIT_ORDER, SUIT_WEAPONS, suitWeaponAt, wearSuit, tickSuit, suitLabel, routeSuitDamage, suitNextWave,
  pickSuitSpot, suitTouched, flameHits, punchTargets, punchLaunch, flightAt, dropSpot, burnTick } from '../js/rules.js';

test('v0.10.0 パワードスーツ: 45びょう で ぬげる・タイマーの もじ', () => {
  const s = wearSuit();
  assert.equal(s.t, 45); assert.equal(SUIT.time, 45);
  assert.equal(suitLabel(s.t), 'パワードスーツ のこり 45');
  let t = 0, r = null;
  while (!r && t < 60) { r = tickSuit(s, 1 / 60); t += 1 / 60; }
  assert.equal(r, 'eject');
  assert.ok(Math.abs(t - 45) < 0.05, `t ${t}`);
  assert.equal(suitLabel(9.2), 'パワードスーツ のこり 10');
  assert.equal(suitLabel(0), 'パワードスーツ のこり 0');
  assert.equal(tickSuit(null, 1), null);
  assert.ok(SUIT.grace > 0, 'ぬいだ あと むてき');
  assert.equal(suitNextWave(4), 4 + SUIT.every);
  assert.ok(SUIT.every >= 2 && SUIT.every <= 4, 'すうウェーブ ごと');
});

test('v0.10.0 パワードスーツ: きている あいだ と ぬいだ すぐあと は プレイヤーが へらない', () => {
  const s = wearSuit();
  for (let i = 0; i < 50; i++) assert.equal(routeSuitDamage(s, 0, 30).player, 0);
  assert.ok(s.armor > 0 && s.armor < SUIT.armor, 'よろいが すこし へる');
  assert.equal(routeSuitDamage(null, 1.2, 50).player, 0, 'ぬいだ あとの むてき');
  assert.equal(routeSuitDamage(null, 0, 50).player, 50, 'ふつう');
  // ボスの いちげき（60）でも 45びょう もつ くらい つよい
  assert.ok(SUIT.armor / (60 * SUIT.armorMul) > 150);
});

test('v0.10.0 パワードスーツ: ぶきは 4つ（マシンキャノン・かえんほうしゃ・キャノン・パンチ）', () => {
  assert.deepEqual(SUIT_ORDER, ['mcannon', 'flamer', 'cannon', 'punch']);
  assert.equal(SUIT_WEAPONS.mcannon.name, 'マシンキャノン');
  assert.equal(SUIT_WEAPONS.flamer.name, 'かえんほうしゃ');
  assert.equal(SUIT_WEAPONS.cannon.name, 'キャノン');
  assert.equal(SUIT_WEAPONS.punch.name, 'パンチ');
  assert.equal(suitWeaponAt(0), 'mcannon'); assert.equal(suitWeaponAt(5), 'flamer'); assert.equal(suitWeaponAt(-1), 'punch');
  // ふつうの ぶきより ずっと つよい
  assert.ok(SUIT_WEAPONS.mcannon.dmg / SUIT_WEAPONS.mcannon.interval > 3 * WEAPONS.minigun.dmg * WEAPONS.minigun.rpm / 60, 'ミニガンの 3ばい いじょう');
  assert.ok(SUIT_WEAPONS.mcannon.dmg >= 60);
  assert.ok(SUIT_WEAPONS.cannon.dmg > WEAPONS.rocket.dmg && SUIT_WEAPONS.cannon.blast > 5);
  assert.ok(SUIT_WEAPONS.punch.dmg >= 1000);
  assert.ok(SUIT.maxFlames <= 64 && SUIT.maxFly <= 10, 'iPhone SE の じょうげん');
});

test('v0.10.0 かえんほうしゃ: まえの コーンだけ・もえる ダメージ', () => {
  const T = [{ x: 0, z: -5 }, { x: 0, z: 5 }, { x: 4, z: -1 }, { x: 0, z: -15 }, { x: 1, z: -8 }, { x: 0, z: -3, alive: false }];
  const hit = flameHits(0, 0, 0, -1, T).map((h) => h.i).sort();
  assert.deepEqual(hit, [0, 4]);
  const z = { burnT: 3 };
  let dmg = 0; for (let i = 0; i < 300; i++) dmg += burnTick(z, 1 / 60);
  assert.ok(Math.abs(dmg - 3 * SUIT_WEAPONS.flamer.burnDps) < 1e-6);
  assert.equal(z.burnT, 0); assert.equal(burnTick(z, 1), 0);
});

test('v0.10.0 パンチ: ちかい じゅんに さいだい4たい・がめんの そとへ ふっとぶ', () => {
  const T = [];
  for (let i = 0; i < 8; i++) T.push({ x: (i - 3.5) * 0.4, z: -1.5 - i * 0.1 });
  T.push({ x: 0, z: 3 }); // うしろ
  T.push({ x: 0, z: -9 }); // とおい
  const p = punchTargets(0, 0, 0, -1, T);
  assert.equal(p.length, SUIT_WEAPONS.punch.max);
  for (let i = 1; i < p.length; i++) assert.ok(p[i].d >= p[i - 1].d);
  assert.ok(!p.some((h) => h.i >= 8));
  for (const r of [0, 0.5, 1]) {
    const v = punchLaunch(0, -1, r);
    assert.ok(v.vz < 0 && Math.abs(v.vx) < 1e-9, 'まえへ');
    assert.ok(Math.abs(v.spin) > 8, 'くるくる');
    // カメラ（うしろ 6.4m・たかさ 3.2m・たて 70° の はんぶん 35°）から みて がめんの うえへ でる
    const f = flightAt(v, SUIT.flyTime);
    const camD = f.d + SUIT.cam.dist, camY = f.y - SUIT.cam.height;
    assert.ok(Math.atan2(camY, camD) > 35 * Math.PI / 180, `elev ${(Math.atan2(camY, camD) * 180 / Math.PI).toFixed(1)}`);
    assert.ok(f.d > 30, 'とおくへ');
  }
});

test('v0.10.0 アイテムは あたった ばしょに おちる（とんでいった さき では ない）', () => {
  const hitAt = { x: 3, y: 0, z: -2 };
  const z = { x: 3, y: 0, z: -2 };
  const at = { ...hitAt };
  // ふっとぶ
  const v = punchLaunch(0, -1, 0.5);
  z.x += v.vx * 1.2; z.y += 20; z.z += v.vz * 1.2;
  const d = dropSpot(z, at);
  assert.deepEqual(d, { x: 3, y: 0, z: -2 });
  assert.ok(Math.hypot(z.x - d.x, z.z - d.z) > 20);
  assert.deepEqual(dropSpot({ x: 1, y: -0.3, z: 2 }), { x: 1, y: 0, z: 2 }, 'じめんの うえ');
});

test('v0.10.0 キャノンの ばくはつ: プレイヤー・なかま・おじさんに きかない', () => {
  const p = { x: 0, y: 0.5, z: 0 }, R = SUIT_WEAPONS.cannon.blast;
  const T = [{ team: 'player', x: 0, y: 0, z: 0 }, { team: 'ally', x: 1, y: 0, z: 0 }, { team: 'npc', x: 0, y: 0, z: 1 },
    { team: 'zombie', x: 2, y: 0, z: 0 }, { team: 'zombie', x: 30, y: 0, z: 0 }];
  const h = blastHits(p, R, T);
  assert.equal(h.length, 1); assert.equal(h[0].t, T[3]);
});

for (const MID of MAP_IDS_MAP) test(`[${MID}] v0.10.0 パワードスーツの ばしょ: あるいて いける・ロボと かさならない`, () => {
  const map = buildMap(MID), zc = zombieColliders(map);
  const nav = makeNav(zc, map), ps = map.playerStart;
  nav.update(ps.x, 0, ps.z);
  const cells = nav.openCells(map.half - 3).filter((c) => Math.abs(c[2] || 0) < 0.5);
  const robot = { x: cells[0][0], z: cells[0][1] };
  const seen = new Set();
  for (let i = 0; i < 20; i++) {
    const [x, z] = pickSuitSpot(cells, ps.x, ps.z, i / 20, robot);
    const d = Math.hypot(x - ps.x, z - ps.z);
    assert.ok(d >= SUIT.spot[0] - 0.01 && d <= SUIT.spot[1] + 0.01 || cells.length < 30, `dist ${d}`);
    assert.ok(nav.free(x, 0, z), 'あるける');
    assert.ok(Math.hypot(x - robot.x, z - robot.z) > 6, 'ロボから はなれる');
    seen.add(`${x},${z}`);
  }
  assert.ok(seen.size >= 5, 'ランダムな ばしょ');
  assert.ok(suitTouched(0.5, 0.5, 0) && !suitTouched(3, 0, 0));
});
