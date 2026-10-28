import test from 'node:test';
import assert from 'node:assert/strict';
import {
  POLICE_LINES, ARMY_LINES, pickBotLine, formatBotLine,
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
  LOADOUT_SIZE, DEFAULT_LOADOUT, normalizeLoadout, toggleLoadout, loadoutReady, loadoutSlot, cycleLoadout, unlockedWeapons, crateReward, applyCrate, CRATE_SCORE,
  isGauge, GAUGE_LABEL, SMOKE, inSmoke, smokeAffects, addSmokeCloud, throwArc, useGauge, gaugeLasts, upgradeRows, digitEvent,
} from '../js/rules.js';
import { makeNav } from '../js/nav.js';
import { buildMap, playerColliders, zombieColliders, shotColliders, MAPS, MAP_IDS as MAP_IDS_MAP, mapInfo } from '../js/map.js';
const SPECIAL_STAGE_IDS = ['minecart', 'trainride', 'roadride', 'airride'];
const LEGACY_MAP_IDS = MAP_IDS_MAP.filter((id) => !SPECIAL_STAGE_IDS.includes(id));
const FLAT_IDS = LEGACY_MAP_IDS.filter((id) => !buildMap(id).vertical); // たいらな マップ（たてに ひろい マップは nav.js で しらべる）

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
    autoEquip: true, map: 'rotate', mapNext: 0, bank: 0, wlv: { rifle: 1, pistol: 1, shotgun: 1, rocket: 1, minigun: 1, sniper: 1, magnum: 1, mlauncher: 1, laser: 1, flamer: 1, beam: 1, smoke: 1 }, loadout: ['rifle', 'shotgun', 'rocket'],
    slv: { head: 1, body: 1, feet: 1, arm: 1 }, hlv: 1, mlv: { bat: 1, hammer: 1, katana: 1 }, melee: 'bat', gk: { clear: [], best: {} }, tab: 'zs' });
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
  assert.equal(VERSION, '0.31.1');
  assert.equal(normalizeSave(null).stage, 'day');
  assert.equal(normalizeSave({ stage: 'night' }).stage, 'night');
  assert.equal(normalizeSave({ stage: 'mars' }).stage, 'day');
  assert.equal(normalizeSave(null).flashlight, true);
  assert.equal(normalizeSave({ flashlight: false }).flashlight, false);
});

for (const MID of LEGACY_MAP_IDS) test(`[${MID}] マップ: よるの がいとうは みちの うえで、かべに うまって いない`, () => {
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
  assert.ok(tops.length > (MID === 'flood' ? 0 : 20));
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

for (const MID of LEGACY_MAP_IDS) test(`[${MID}] おじさんの ばしょ: あるいて いける ひろい ところ・ちょうど いい きょり`, () => {
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
  assert.deepEqual(MAP_IDS, ['city', 'mall', 'base', 'hospital', 'camp', 'harbor', 'rooftop', 'office', 'flood', ...SPECIAL_STAGE_IDS]);
  assert.deepEqual(MAP_IDS_MAP, MAP_IDS, 'rules と map の いちらんが おなじ');
  assert.deepEqual(MAP_CHOICES, ['rotate', ...MAP_IDS]);
  for (const m of MAPS) {
    assert.ok(m.half >= (buildMap(m.id).vertical ? 32 : 40) && m.half <= 48, `${m.id} half ${m.half}`); // まえは 32（ビルの なかは たてに ひろい）
    assert.ok(m.name && m.icon && m.desc);
    assert.ok(!/[✚✙✛✜➕✝†☩]|\u271A/.test(m.icon + m.name + m.desc), 'じゅうじ マーク なし');
  }
  assert.equal(pickMapId('mall', 3), 'mall');
  assert.equal(pickMapId('rotate', 0), 'city');
  assert.equal(pickMapId('rotate', 9), 'minecart');
  assert.equal(pickMapId('zzz', -1), 'airride');
  assert.equal(mapInfo('nope').id, 'city');
  const s = normalizeSave({ map: 'camp', mapNext: 11, autoEquip: false });
  assert.equal(s.map, 'camp'); assert.equal(s.mapNext, 11); assert.equal(s.autoEquip, false);
  assert.equal(normalizeSave({ map: 'moon' }).map, 'rotate');
});

for (const MID of LEGACY_MAP_IDS) test(`[${MID}] v0.5.0 マップ: ちがう みため・すくない ざいしつ・ゲート・がいとう`, () => {
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
  const sig = LEGACY_MAP_IDS.map((id) => { const m = buildMap(id); return m.boxes.length + ':' + m.theme.ground + ':' + m.theme.far; });
  assert.equal(new Set(sig).size, LEGACY_MAP_IDS.length);
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
  assert.deepEqual(SPECIAL_IDS, ['guard', 'crawler', 'soldier', 'spitter', 'burning', 'riot', 'bloater', 'screamer', 'firefighter', 'electric', 'mutant', 'charger', 'armored']);
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
  for (const id of LEGACY_MAP_IDS) { const b = BACKDROPS[id]; assert.ok(b && b.fires >= 1 && b.smoke >= 1 && b.bolt > 0 && b.moon != null, id); }
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

for (const MID of LEGACY_MAP_IDS) test(`[${MID}] v0.7.0 けいさつロボの ばしょ: スタートの そばでは ない・あるいて いける`, () => {
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
  assert.ok(WEAPON_BAR.slotW * LOADOUT_SIZE + WEAPON_BAR.gap * (LOADOUT_SIZE - 1) <= 130, 'v0.15.0: もっていく 3つ だけ（みぎうえ すこし）');
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
      const fixedMag = WEAPONS[id].revolver || WEAPONS[id].gauge || WEAPONS[id].throw; // v0.15.0: ゲージ・なげる ぶきは マガジン そのまま
      assert.ok((WEAPONS[id].throw ? b.time > a.time : b.dmg > a.dmg) && b.rpm >= a.rpm && b.mag >= a.mag, id);
      assert.ok((WEAPONS[id].throw || z.dmg >= a.dmg * 1.6) && z.rpm > a.rpm && (fixedMag ? z.mag === a.mag : z.mag > a.mag), id);
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
    assert.deepEqual(w, { rifle: 4, pistol: 1, shotgun: 1, rocket: 1, minigun: 1, sniper: UPGRADE.max, magnum: 1, mlauncher: 1, laser: 1, flamer: 1, beam: 1, smoke: 1 });
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
    assert.equal(WEAPON_ORDER[5], 'sniper'); assert.equal(w.slot, 6); assert.equal(WEAPON_ORDER.length, 12);
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
    for (const id of LEGACY_MAP_IDS) {
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
  assert.equal(VEHICLE.blast, 6, 'くるまの ばくはつ範囲はそのまま');
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

test('v0.10.0 パワードスーツ: ぶきは 4つ（v0.15.0: パンチは なぐる ボタンへ）', () => {
  assert.deepEqual(SUIT_ORDER, ['mcannon', 'flamer', 'cannon', 'missile']);
  assert.equal(SUIT_WEAPONS.mcannon.name, 'マシンキャノン');
  assert.equal(SUIT_WEAPONS.flamer.name, 'かえんほうしゃ');
  assert.equal(SUIT_WEAPONS.cannon.name, 'キャノン');
  assert.equal(SUIT_WEAPONS.punch.name, 'パンチ');
  assert.equal(suitWeaponAt(0), 'mcannon'); assert.equal(suitWeaponAt(5), 'flamer'); assert.equal(suitWeaponAt(-1), 'missile');
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

for (const MID of LEGACY_MAP_IDS) test(`[${MID}] v0.10.0 パワードスーツの ばしょ: あるいて いける・ロボと かさならない`, () => {
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

// ---- v0.11.0: ミサイル（スーツ）・ミサイルランチャー（プレイヤー）----
import { MISSILE, missileTargets, salvoDirs, steerMissile, salvoRoom, SUIT_BAR, upgradeCost as upC11, upgradedWeapon as upW11,
  normalizeSave as nS11, blastHits as bH11, damageVehicle as dV11 } from '../js/rules.js';

test('v0.11.0 スーツの ミサイル: キャノンは そのまま・ミサイルを ついか', () => {
  const M = SUIT_WEAPONS.missile;
  assert.equal(M.name, 'ミサイル'); assert.equal(SUIT_ORDER.indexOf('missile'), 3); assert.equal(SUIT_ORDER.indexOf('cannon'), 2);
  assert.equal(SUIT_WEAPONS.cannon.name, 'キャノン'); assert.equal(SUIT_WEAPONS.mcannon.name, 'マシンキャノン');
  assert.ok(M.salvo >= 4 && M.salvo <= 6, '1かいで 4〜6ぱつ');
  assert.ok(M.interval >= 1 && M.interval <= 2.5, 'つぎまで すこし まつ');
  assert.ok(M.homing && M.projectile && M.blast >= 3.5);
  assert.ok(M.dmg > WEAPONS.mlauncher.dmg * 1.5, 'スーツの ミサイルは ランチャーより つよい');
});

test('v0.11.0 ミサイルの ねらい: まえの ちかい ゾンビから じゅんに', () => {
  const z = (x, zz, o = {}) => ({ x, y: 0, z: zz, alive: true, scale: 1, ...o });
  const zs = [z(0, -10), z(0, -4), z(1, -7), z(0, 6), z(0, -3, { alive: false }), z(0, -2, { demo: true }), z(0, -90), z(30, -1), z(0, -5, { fly: {} })];
  assert.deepEqual(missileTargets(0, 0, 0, -1, zs, 3), [1, 2, 0], 'ちかい じゅん（うしろ・たおれた・とおい・よこは ねらわない）');
  assert.deepEqual(missileTargets(0, 0, 0, -1, zs, 5), [1, 2, 0, 1, 2], 'すくなければ くりかえし');
  assert.deepEqual(missileTargets(0, 0, 0, 1, [z(0, -5)], 4), [], 'まえに いない → まっすぐ');
});

test('v0.11.0 ミサイルの とびかた: やまなりに ひろがって でて・ちゃんと あたる', () => {
  const dirs = salvoDirs(0, 0, -1, 6);
  assert.equal(dirs.length, 6);
  for (const d of dirs) { assert.ok(d[1] > 0.15, 'うえむき（やまなり）'); assert.ok(Math.abs(Math.hypot(...d) - 1) < 1e-9); }
  assert.ok(dirs[0][0] < -0.1 && dirs[5][0] > 0.1, 'よこに ひろがる');
  // 1ぱつずつ うごかして みる（ゾンビは よこに あるく）
  for (const [tx, tz, vx] of [[0, -20, 0], [8, -15, 1.5], [-6, -8, -1], [0, -45, 2]]) {
    for (const d0 of dirs) {
      const p = { x: 0, y: 2, z: 0 }; let v = d0.map((c) => c * 30 * 0.55), hit = false; const t = { x: tx, z: tz };
      for (let i = 0, age = 0; i < 240 && !hit; i++, age += 1 / 60) {
        t.x += vx / 60;
        const sp = Math.hypot(...v); if (sp < 30) v = v.map((c) => c * Math.min(30, sp + MISSILE.accel / 60) / sp);
        const dx = t.x - p.x, dy = 0.9 - p.y, dz = t.z - p.z;
        if (Math.hypot(dx, dy, dz) < MISSILE.near) { hit = true; break; }
        if (age > MISSILE.arm) v = steerMissile(...v, dx, dy, dz, MISSILE.turn / 60 * (1 + age));
        p.x += v[0] / 60; p.y += v[1] / 60; p.z += v[2] / 60;
      }
      assert.ok(hit, `${tx},${tz} に あたる`);
    }
  }
  const r = steerMissile(10, 0, 0, 0, 0, 5, 0.1);
  assert.ok(Math.abs(Math.hypot(...r) - 10) < 1e-9, 'はやさは かわらない');
  assert.ok(Math.abs(Math.atan2(r[2], r[0]) - 0.1) < 1e-9, 'まがるのは maxAng まで');
});

test('v0.11.0 ミサイルの かず: iPhone SE の じょうげん', () => {
  assert.ok(MISSILE.max <= 18 && MISSILE.maxTrail <= 12 && MISSILE.trailDt >= 0.04);
  assert.equal(salvoRoom(0, 6), 6); assert.equal(salvoRoom(MISSILE.max - 2, 6), 2); assert.equal(salvoRoom(MISSILE.max + 3, 6), 0);
});

test('v0.11.0 ミサイルの ばくはつ: プレイヤー・ロボ・けいさつ・おじさんに きかない', () => {
  for (const W of [SUIT_WEAPONS.missile, WEAPONS.mlauncher]) {
    const p = { x: 0, y: 0.5, z: 0 };
    const T = [{ team: 'player', x: 0, y: 0, z: 0 }, { team: 'ally', x: 0.5, y: 0, z: 0 }, { team: 'ally', x: -0.5, y: 0, z: 0 }, { team: 'npc', x: 0, y: 0, z: 0.5 },
      { team: 'zombie', x: 1, y: 0, z: 0 }, { team: 'zombie', x: 0, y: 0, z: -1.5 }, { team: 'zombie', x: 40, y: 0, z: 0 }];
    const h = bH11(p, W.blast, T);
    assert.equal(h.length, 2); assert.ok(h.every((x) => x.t.team === 'zombie'));
  }
});

test('v0.11.0 ミサイルランチャー: 8ばんめの ぶき・ロケットと ちがう', () => {
  const w = WEAPONS.mlauncher, r = WEAPONS.rocket;
  assert.equal(WEAPON_ORDER[7], 'mlauncher'); assert.equal(w.slot, 8); assert.equal(w.name, 'ミサイルランチャー');
  assert.ok(w.projectile && w.homing && !r.homing, 'ホーミング（ロケットは まっすぐ）');
  assert.equal(w.salvo, 3);
  assert.ok(w.dmg < r.dmg && w.blast < r.blast, '1ぱつは ロケットより よわい');
  assert.ok(w.mag >= 2 && w.mag <= 4 && w.reserve >= 4 && w.reserve <= 12, 'たまは すこし');
  assert.ok(w.reload >= 2.5 && w.reload <= 4.5, 'リロード すうびょう');
  assert.ok(!w.noRefill, 'ウェーブで ほじゅう');
  // くるまは 1ぱつで ばくはつ（ロケットと おなじ みち: projectile → { rocket: true }）
  const v = { hp: 100, fuse: -1 }; dV11(v, 0, { rocket: true }); assert.equal(v.hp, 0);
});

test('v0.11.0 ミサイルランチャー: つよく する Lv1〜8（ねだんは ロケット・ミニガン くらい）', () => {
  const c = [1, 2, 3, 4, 5, 6, 7].map((l) => upC11('mlauncher', l));
  for (let i = 1; i < c.length; i++) assert.ok(c[i] > c[i - 1]);
  assert.equal(upC11('mlauncher', 8), Infinity);
  assert.ok(c[0] >= upC11('sniper', 1) && c[0] <= upC11('rocket', 1), String(c[0]));
  const a = upW11('mlauncher', 1), z = upW11('mlauncher', 8);
  assert.ok(z.dmg > a.dmg * 1.6 && z.mag > a.mag && z.salvo === 3);
  assert.ok(z.dmg < SUIT_WEAPONS.missile.dmg, 'Lv8 でも スーツより よわい');
  const s = nS11({ wlv: { mlauncher: 5 } }); assert.equal(s.wlv.mlauncher, 5); assert.equal(nS11({}).wlv.mlauncher, 1);
});

test('v0.11.0 ボタン: 8つの ぶき・5つの スーツぶき が iPhone SE（667×375）に はいる', () => {
  const W8 = WEAPON_BAR.slotW * 8 + WEAPON_BAR.gap * 7;
  assert.ok(WEAPON_BAR.slotW >= 40 && WEAPON_BAR.slotH >= 40);
  assert.ok(W8 + 5 <= 667 - 300, 'HP バーの みぎに はいる');
  assert.ok(SUIT_BAR.w >= 40 && SUIT_BAR.h >= 40);
  const SW = SUIT_BAR.w * SUIT_ORDER.length + SUIT_BAR.gap * (SUIT_ORDER.length - 1);
  assert.ok(SUIT_BAR.timerL + SUIT_BAR.timerW + 8 + SW + SUIT_BAR.right <= 667, `スーツ ボタン ${SW}px`);
});

// ===== v0.12.0: たくさんの ゾンビ・かるく する しくみ =====
import { SpatialGrid, Pool, thinkInterval, THINK, lodPlan, QualityGovernor, GOV_LEVELS, govPixelRatio, crowdDmgMul, CROWD } from '../js/rules.js';

test('v0.12.0 ます目: ちかくの さがしかたが ぜんぶ しらべた ときと おなじ', () => {
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const g = new SpatialGrid(1.2), pts = [];
  for (let round = 0; round < 3; round++) {
    g.clear(); pts.length = 0;
    for (let i = 0; i < 300; i++) { const p = { id: i, x: (rnd() - 0.5) * 60, z: (rnd() - 0.5) * 60 }; pts.push(p); g.insert(p, p.x, p.z); }
    assert.equal(g.count, 300);
    const out = [];
    for (let k = 0; k < 80; k++) {
      const qx = (rnd() - 0.5) * 64, qz = (rnd() - 0.5) * 64, r = 0.3 + rnd() * 2.5;
      g.query(qx, qz, r, out);
      const got = out.filter((p) => Math.hypot(p.x - qx, p.z - qz) <= r).map((p) => p.id).sort((a, b) => a - b);
      const want = pts.filter((p) => Math.hypot(p.x - qx, p.z - qz) <= r).map((p) => p.id).sort((a, b) => a - b);
      assert.deepEqual(got, want);
      assert.equal(new Set(out).size, out.length); // おなじ ものは 1かいだけ
    }
  }
  // マイナスの ざひょう・さかいめ
  g.clear(); g.insert('a', -0.01, -0.01); g.insert('b', 0, 0); g.insert('c', 1.2, 0);
  assert.deepEqual(g.query(0, 0, 0.05, []).sort(), ['a', 'b']);
  g.clear(); assert.equal(g.query(0, 0, 5, []).length, 0);
});

test('v0.12.0 ます目: clear しても はいれつを つかいまわす（ふえつづけない）', () => {
  const g = new SpatialGrid(1);
  for (let r = 0; r < 20; r++) { g.clear(); for (let i = 0; i < 50; i++) g.insert(i, i % 10, Math.floor(i / 10)); }
  assert.equal(g.used.length + g.free.length, 50);
});

test('v0.12.0 つかいまわし: get/put で もれない・ふえすぎない', () => {
  let made = 0; const p = new Pool(() => ({ n: made++ }));
  const live = [];
  for (let frame = 0; frame < 500; frame++) {
    for (let i = 0; i < 10; i++) live.push(p.get());
    while (live.length > 40) p.put(live.shift());
  }
  assert.equal(p.live, live.length);
  assert.ok(p.made <= 50, 'made ' + p.made);
  for (const o of live.splice(0)) p.put(o);
  assert.equal(p.live, 0);
  const a = p.get(); assert.ok(a.n < p.made); // ふるいのを つかう
});

test('v0.12.0 かんがえる 回数: ちかい ほど まいフレーム・とおいと 5かい/びょう', () => {
  assert.equal(thinkInterval(0), 0);
  assert.equal(thinkInterval(THINK.near - 0.01), 0);
  assert.equal(thinkInterval(THINK.near + 1), THINK.midDt);
  assert.equal(thinkInterval(60), THINK.farDt);
  let last = 0; for (let d = 0; d < 80; d += 0.5) { const v = thinkInterval(d); assert.ok(v >= last); last = v; }
  assert.ok(THINK.farDt <= 0.2 && THINK.midDt >= 0.1 - 1e-9); // 5〜10かい/びょう
});

test('v0.12.0 とおくの かんたんモデル: ちかい じゅんに nearMax たい・とくべつは いつも ちゃんと', () => {
  const items = [30, 2, 9, 4, 25, 6, 1, 17, 12].map((d) => ({ d, force: false }));
  items[0].force = true; // とおくても とくべつ（ボス など）
  const n = lodPlan(items, 3, 15);
  assert.equal(n, 4);
  assert.deepEqual(items.filter((i) => i.full).map((i) => i.d).sort((a, b) => a - b), [1, 2, 4, 30]);
  // lodDist より とおい ものは nearMax が あまっても かんたん
  for (const it of items) it.force = false;
  lodPlan(items, 50, 10);
  assert.ok(items.every((i) => i.full === i.d < 10));
  assert.equal(lodPlan([], 5, 10), 0);
});

test('v0.12.0 がしつ ちょうせい: おもいと だんだん さげる → いちどに でる かずも へる → かるく なると もどる', () => {
  const g = new QualityGovernor();
  const run = (ms, sec) => { let ch = 0; for (let t = 0; t < sec * 1000; t += ms) if (g.sample(ms)) ch++; return ch; };
  assert.equal(g.level, 0); assert.equal(g.capFor(40), 40);
  run(16, 10); assert.equal(g.level, 0); // かるい: そのまま
  run(40, 30); // 25fps: おもい
  assert.equal(g.level, GOV_LEVELS.length - 1);
  assert.ok(g.capFor(40) < 40 && g.capFor(40) >= 26, 'cap ' + g.capFor(40));
  assert.equal(g.capFor(8), 6); // さいていでも 6たい
  for (let i = 1; i < GOV_LEVELS.length; i++) {
    const a = GOV_LEVELS[i - 1], b = GOV_LEVELS[i];
    assert.ok(b.lod <= a.lod && b.near <= a.near && b.shadow <= a.shadow && b.cap <= a.cap, 'level ' + i);
  }
  // かいぞうどを さきに さげて、かずは さいごに さげる
  const firstCap = GOV_LEVELS.findIndex((l) => l.cap < 1);
  assert.ok(firstCap >= 3);
  assert.ok(govPixelRatio(firstCap - 1, 1.5) < 1.5);
  run(12, 60); assert.equal(g.level, 0); // かるく なったら もどる
  // 30fps に きまっている ばあい（33ms）: がしつは さげるが かずは へらさない
  const lp = new QualityGovernor(); for (let i = 0; i < 2000; i++) lp.sample(33.4);
  assert.equal(lp.capFor(40), 40); assert.ok(lp.level >= 3);
  // ながい フレーム 1つ（タブ きりかえ）では さがらない
  const h = new QualityGovernor(); h.sample(5000); for (let i = 0; i < 200; i++) h.sample(16); assert.equal(h.level, 0);
});

test('v0.12.0 かいぞうど: auto の だんかい', () => {
  assert.equal(govPixelRatio(0, 1.5), 1.5);
  assert.equal(govPixelRatio(1, 1.5), 1.25);
  assert.equal(govPixelRatio(1, 1), 1);
  assert.equal(govPixelRatio(2, 1.5), 1);
  assert.equal(govPixelRatio(3, 1.5), 0.85);
});

test('v0.12.0 ゾンビが ふえた: いちどに でる かず 2ばい いじょう・7さいでも だいじょうぶ', () => {
  assert.ok(CROWD.maxAlive >= 2 * CROWD.oldMaxAlive);
  assert.equal(waveSpec(1).maxAlive <= 12, true); // さいしょは すくなめ
  assert.ok(waveSpec(1).total <= 10);
  const late = waveSpec(12);
  assert.equal(late.maxAlive, CROWD.maxAlive);
  assert.ok(late.total >= 2 * 42); // まえの ウェーブ12 は 50
  for (let n = 1; n < 40; n++) {
    const s = waveSpec(n), t = waveSpec(n + 1);
    assert.ok(t.total - t.boss >= s.total - s.boss && t.maxAlive >= s.maxAlive && t.spawnGap <= s.spawnGap);
    assert.ok(s.spawnGap >= CROWD.gapMin);
    assert.ok(s.dmgMul > 0.7 && s.dmgMul <= 1);
    // いちどに でる かず × こうげき は まえ（16たい）の 2.25ばい まで
    assert.ok(s.maxAlive * s.dmgMul <= 16 * 2.25, 'n=' + n);
  }
  assert.equal(crowdDmgMul(16), 1); assert.equal(crowdDmgMul(8), 1);
  assert.ok(crowdDmgMul(40) >= 0.72);
});

// ---- v0.13.0: なぐる ----
import {
  MELEE, MELEE_ORDER, MELEE_UP, DEFAULT_MELEE, meleeStats, meleeLevel, meleeUpCost, buyMelee, normalizeMelee,
  meleeDamage, meleeKnock, meleeRawKnock, meleeDur, meleeDown, meleeTargets, meleeAim, meleeBlocked, bumpTransfer, BUMP,
  newMeleeState, meleePress, meleeTick, swingPose, UPGRADE as UPG13,
} from '../js/rules.js';

test('v0.13.0 なぐる: 3しゅるい（くぎバット・ハンマー・かたな）', () => {
  assert.deepEqual(MELEE_ORDER, ['bat', 'hammer', 'katana']);
  assert.equal(DEFAULT_MELEE, 'bat');
  const { bat, hammer, katana } = MELEE;
  assert.ok(hammer.dur > bat.dur && bat.dur > katana.dur, 'はやさ: かたな > バット > ハンマー');
  assert.ok(hammer.dmg > bat.dmg && hammer.dmg > katana.dmg, 'ハンマーが いちばん いたい');
  assert.ok(katana.arc > bat.arc && bat.arc > hammer.arc, 'かたなは ひろく きる');
  assert.equal(katana.combo, 3); assert.equal(bat.combo, 1); assert.equal(hammer.combo, 1);
  assert.ok(bat.bleed && bat.bleed.dps > 0 && bat.bleed.time > 0, 'くぎバットは すこし じわじわ');
  assert.ok(hammer.shock && hammer.shock.r >= 3, 'ハンマーは じめんを たたいて まわりも ころばせる');
  for (const id of MELEE_ORDER) {
    const W = MELEE[id];
    assert.ok(W.range >= 2 && W.range <= 2.8, id + ' みじかい きょりだけ');
    assert.ok(W.hitAt > W.wind * 0.9 && W.hitAt < W.strike, id + ' ふりおろしの とちゅうで あたる');
    assert.ok(W.shake <= 0.3, id + ' がめんの ゆれは ひかえめ');
  }
});

test('v0.13.0 なぐる: まえの おうぎがた と きょり', () => {
  const W = MELEE.bat; // range 2.3 arc 1.05
  const z = (x, zz, o = {}) => ({ x, z: zz, y: 0, scale: 1, alive: true, ...o });
  const cands = [z(0, -1.5), z(0, -2.5), z(0, -3.5), z(1.5, -1.0), z(3, 0.2), z(0, 1.5), z(0, -1, { alive: false }), z(0, -1, { y: 2.5 })];
  const hit = meleeTargets(0, 0, 0, 0, -1, cands, W).map((h) => cands.indexOf(h.z));
  assert.deepEqual(hit, [0, 3, 1]); // まえ 1.5・ななめ 1.8・まえ 2.5（2.3+0.35 いない）。うしろ・とおい・しんだ・うえの かいは だめ
  assert.ok(meleeTargets(0, 0, 0, 0, -1, cands, MELEE.katana).length >= 3);
  // せなかの すぐ うしろ（0.7 いない）は あたる（くっつかれた とき）
  assert.equal(meleeTargets(0, 0, 0, 0, -1, [z(0, 0.5)], W).length, 1);
  // ちかい じゅん・max まで
  const many = Array.from({ length: 8 }, (_, i) => z(0.1 * i, -0.8 - i * 0.15));
  const r = meleeTargets(0, 0, 0, 0, -1, many, W);
  assert.equal(r.length, W.max);
  assert.ok(r[0].d <= r[1].d && r[1].d <= r[2].d);
});

test('v0.13.0 なぐる: みかた（ロボ・おまわりさん・おじさん）には ぜったい あたらない', () => {
  const allies = [{ x: 0, z: -1, y: 0, ally: true, alive: true }, { x: 0.3, z: -1.2, y: 0, ally: true }, { x: -0.3, z: -0.9, y: 0, ally: true }];
  for (const id of MELEE_ORDER) {
    assert.equal(meleeTargets(0, 0, 0, 0, -1, allies, meleeStats(id, 5)).length, 0);
    assert.equal(meleeAim(0, 0, 0, 0, allies, MELEE[id]).target, null);
  }
});

test('v0.13.0 なぐる: すこしだけ じどうで ねらう', () => {
  const z1 = { x: 1.2, z: -1.6, y: 0, alive: true }, far = { x: 0, z: -6, y: 0, alive: true }, back = { x: 0, z: 2, y: 0, alive: true };
  const a = meleeAim(0, 0, 0, 0, [far, z1, back], MELEE.bat);
  assert.equal(a.target, z1);
  assert.ok(a.turn < 0 && a.turn > -1.0); // みぎへ すこし（yaw は ひだりまわりが +）
  const fx = -Math.sin(a.yaw), fz = -Math.cos(a.yaw);
  assert.ok(Math.abs(fx - 1.2 / 2) < 1e-6 && Math.abs(fz + 1.6 / 2) < 1e-6);
  assert.equal(meleeAim(0, 0, 0, 0, [far, back], MELEE.bat).turn, 0); // ちかくに いなければ むきは そのまま
});

test('v0.13.0 なぐる: ぶきごとの ふっとばし・おもい ゾンビは あまり うごかない', () => {
  const H = MELEE.hammer, B = MELEE.bat, K = MELEE.katana;
  // ハンマー > バット > かたな（1かいめ）
  assert.ok(meleeKnock(H, 'walker') > meleeKnock(B, 'walker'));
  assert.ok(meleeKnock(B, 'walker') > meleeKnock(K, 'walker', 0));
  assert.ok(meleeKnock(K, 'walker', 2) > meleeKnock(K, 'walker', 0) * 2, 'かたな 3かいめは つよく ふっとばす');
  for (const id of MELEE_ORDER) {
    const W = MELEE[id];
    const w = meleeKnock(W, 'walker');
    for (const heavy of ['brute', 'charger', 'riot', 'firefighter', 'mutant', 'bloater']) assert.ok(meleeKnock(W, heavy) < w, id + ' ' + heavy);
    assert.ok(meleeKnock(W, 'boss') < meleeKnock(W, 'brute'), 'ボスが いちばん うごかない');
    assert.ok(meleeKnock(W, 'boss') / meleeRawKnock(W) <= 0.15);
  }
  // すべる きょり（kv が exp(-7t) で へる → kv/7）: ハンマーで ふつうの ゾンビは 2m くらい・ボスは 0.3m くらい
  assert.ok(meleeKnock(H, 'walker') / 7 > 1.8 && meleeKnock(H, 'boss') / 7 < 0.35);
});

test('v0.13.0 なぐる: かるい ゾンビは ころぶ（ボス・おもい ゾンビは ころばない）', () => {
  for (const id of MELEE_ORDER) assert.equal(meleeDown(MELEE[id], 'boss', 2), 0);
  assert.ok(meleeDown(MELEE.bat, 'walker') > 0 && meleeDown(MELEE.bat, 'runner') > 0);
  assert.equal(meleeDown(MELEE.bat, 'brute'), 0);
  assert.equal(meleeDown(MELEE.bat, 'riot'), 0);
  assert.ok(meleeDown(MELEE.hammer, 'riot') > 0, 'ハンマーなら たても ころぶ');
  assert.equal(meleeDown(MELEE.hammer, 'brute'), 0);
  assert.equal(meleeDown(MELEE.katana, 'walker', 0), 0); // かたなは 3かいめ だけ
  assert.equal(meleeDown(MELEE.katana, 'walker', 1), 0);
  assert.ok(meleeDown(MELEE.katana, 'walker', 2) > 0);
});

test('v0.13.0 なぐる: かべごしには あたらない', () => {
  const wall = { minX: -2, maxX: 2, minY: 0, maxY: 3, minZ: -1.2, maxZ: -1.0 };
  assert.equal(meleeBlocked(0, 1.1, 0, 0, 0.9, -2, [wall]), true);
  assert.equal(meleeBlocked(0, 1.1, 0, 0, 0.9, -0.8, [wall]), false); // かべの てまえ
  assert.equal(meleeBlocked(0, 1.1, 0, 3, 0.9, -2, [wall]), true);
  assert.equal(meleeBlocked(0, 1.1, 0, 0, 0.9, -2, []), false);
  // ひくい はこ（とまりぎ）の うえから したの ゾンビの あたま は みえる
  const box = { minX: -1, maxX: 1, minY: 0, maxY: 1.2, minZ: -1, maxZ: 1 };
  assert.equal(meleeBlocked(0, 2.3, 0, 0, 1.7, -2, [box]), false);
});

test('v0.13.0 なぐる: かたなの 3れんぞく コンボ', () => {
  const W = meleeStats('katana', 1), st = newMeleeState(), dt = 1 / 60;
  assert.equal(meleePress(st, W), true); assert.equal(st.step, 0);
  assert.equal(meleePress(st, W), false); // ふりはじめに おしても よやく しない（あたる まえ）
  assert.equal(st.queued, false);
  const evs = [];
  const run = (sec, press = false) => { for (let t = 0; t < sec; t += dt) { if (press) meleePress(st, W); const e = meleeTick(st, W, dt); if (e) evs.push(e + st.step); } };
  run(meleeDur(W, 0) * 0.6); // あたった あと
  assert.deepEqual(evs, ['hit0']);
  meleePress(st, W); assert.equal(st.queued, true);
  run(meleeDur(W, 0) * 0.5);
  assert.equal(st.step, 1); assert.ok(evs.includes('chain1'));
  // おしっぱなし → 3かいめ → また 1かいめ
  run(meleeDur(W, 1) + meleeDur(W, 2) + 0.05, true);
  assert.ok(evs.includes('hit2'));
  assert.ok(meleeDamage(W, 2) > meleeDamage(W, 0) * 1.5, '3かいめは つよい');
  assert.ok(meleeDur(W, 2) > meleeDur(W, 0));
  // まが あくと 1かいめから
  const s2 = newMeleeState(); meleePress(s2, W); for (let i = 0; i < 40; i++) meleeTick(s2, W, dt);
  meleePress(s2, W); assert.equal(s2.step, 1); // すぐ なら 2かいめ
  for (let i = 0; i < 80; i++) meleeTick(s2, W, dt);
  meleePress(s2, W); assert.equal(s2.step, 0); // 0.4びょう いじょう あくと リセット
  // バット・ハンマーは いつも 1かいめ
  const s3 = newMeleeState(), B = MELEE.bat; meleePress(s3, B); for (let i = 0; i < 30; i++) meleeTick(s3, B, dt); meleePress(s3, B); assert.equal(s3.step, 0);
});

test('v0.13.0 なぐる: ふりの かたち（ふりかぶる → ふりきる → もどる）', () => {
  const B = MELEE.bat, H = MELEE.hammer;
  assert.ok(swingPose('h', B.wind, B).yaw < -1.2); // みぎに ふりかぶる
  assert.ok(swingPose('h', B.strike, B).yaw > 1.2); // ひだりへ ふりきる
  assert.ok(swingPose('hr', B.strike, B).yaw < -1.2);
  assert.ok(Math.abs(swingPose('h', 1, B).yaw) < 1e-6);
  assert.ok(swingPose('v', H.wind, H).pitch > 2); // あたまの うえ
  assert.ok(swingPose('v', H.strike, H).pitch < -0.5); // じめんへ
  assert.ok(Math.abs(swingPose('v', 1, H).pitch) < 1e-6 && Math.abs(swingPose('v', 0, H).pitch) < 1e-6);
});

test('v0.13.0 なぐる: ふっとんだ ゾンビが ほかの ゾンビに ぶつかる', () => {
  assert.equal(bumpTransfer(BUMP.min - 0.1, 'walker'), null);
  const w = bumpTransfer(12, 'walker'), b = bumpTransfer(12, 'brute'), boss = bumpTransfer(12, 'boss');
  assert.ok(w.knock > b.knock && b.knock > boss.knock);
  assert.ok(w.knock < 12, 'ぶつかると すこし よわく なる（どこまでも つづかない）');
  assert.ok(w.dmg > 0 && w.dmg <= BUMP.dmg * 2);
  // れんさ しても すぐ とまる
  let v = meleeKnock(MELEE.hammer, 'walker'), n = 0;
  while (true) { const t = bumpTransfer(v, 'walker'); if (!t) break; v = t.knock; n++; }
  assert.ok(n >= 1 && n <= 3);
});

test('v0.13.0 なぐる: スコアで つよく（じゅうより やすい・セーブ される）', () => {
  assert.equal(MELEE_UP.max, 5);
  for (const id of MELEE_ORDER) {
    assert.ok(MELEE_UP.base[id] < Math.min(...Object.values(UPG13.base)), id + ' じゅうより やすい');
    let prev = 0;
    for (let lv = 1; lv < MELEE_UP.max; lv++) { const c = meleeUpCost(id, lv); assert.ok(c > prev && c % 10 === 0); prev = c; }
    assert.equal(meleeUpCost(id, MELEE_UP.max), Infinity);
    const a = meleeStats(id, 1), b = meleeStats(id, 5);
    assert.ok(b.dmg > a.dmg * 1.5 && b.dur < a.dur && b.knock > a.knock);
    if (a.bleed) assert.ok(b.bleed.dps > a.bleed.dps);
    if (a.shock) assert.ok(b.shock.dmg > a.shock.dmg);
    assert.equal(a.range, b.range); // とどく きょりは かわらない
  }
  const save = normalizeSave({ bank: 400 });
  assert.deepEqual(save.mlv, { bat: 1, hammer: 1, katana: 1 });
  assert.equal(save.melee, 'bat');
  const r = buyMelee(save, 'bat');
  assert.deepEqual(r, { ok: true, lv: 2, cost: 150 });
  assert.equal(save.bank, 250); assert.equal(meleeLevel(save, 'bat'), 2);
  assert.equal(buyMelee(save, 'hammer').ok, true); assert.equal(save.bank, 50);
  const no = buyMelee(save, 'katana'); assert.equal(no.ok, false); assert.equal(no.short, 170);
  assert.equal(buyMelee(save, 'rifle').ok, false);
  // セーブして よみなおしても のこる・えらんだ ぶきも のこる
  save.melee = 'katana';
  const back = normalizeSave(JSON.parse(JSON.stringify(save)));
  assert.deepEqual(back.mlv, { bat: 2, hammer: 2, katana: 1 });
  assert.equal(back.melee, 'katana');
  assert.deepEqual(normalizeMelee({ mlv: { bat: 99, hammer: -3, katana: 'x' }, melee: 'chainsaw' }), { mlv: { bat: 5, hammer: 1, katana: 1 }, melee: 'bat' });
  assert.equal(back.wlv.rifle, 1); // じゅうの レベルとは べつ
});

// ---- v0.14.0 ----
import * as R14 from '../js/rules.js';
const zAt = (x, z, o = {}) => ({ x, y: 0, z, scale: 1, alive: true, demo: false, ...o });

test('v0.14 スーツ: ウェーブの あいだ（きゅうけい）は 45びょうの とけいが とまる', () => {
  assert.equal(R14.suitClockRuns(0), true);
  assert.equal(R14.suitClockRuns(-0.1), true);
  assert.equal(R14.suitClockRuns(4.5), false);
  assert.equal(R14.suitClockRuns(2.5), false);
  const s = R14.wearSuit(); s.cd = 0.5;
  for (let i = 0; i < 600; i++) assert.equal(R14.tickSuit(s, 1 / 60, true), null); // 10びょう きゅうけい
  assert.equal(s.t, R14.SUIT.time);
  assert.equal(s.cd, 0);                          // ぶきの クールダウンは すすむ（ずるく ならない・こまらない）
  R14.tickSuit(s, 10, false);
  assert.ok(Math.abs(s.t - (R14.SUIT.time - 10)) < 1e-9);
  assert.equal(R14.tickSuit(s, 100, true), null); // きゅうけい ちゅうは じかんぎれ しない
  assert.equal(R14.tickSuit(s, 100, false), 'eject');
  assert.equal(R14.tickSuit(null, 1, false), null);
});
test('v0.14 スーツ: ぬいだ あとの むてき も きゅうけいで とまる・ラベル', () => {
  assert.equal(R14.tickGrace(2, 1, true), 2);
  assert.equal(R14.tickGrace(2, 0.5, false), 1.5);
  assert.equal(R14.tickGrace(0.2, 1, false), 0);
  assert.equal(R14.tickGrace(0, 1, true), 0);
  assert.equal(R14.suitLabel(30.2), 'パワードスーツ のこり 31');
  assert.match(R14.suitLabel(30.2, true), /のこり 31 ⏸ きゅうけい$/);
  assert.equal(R14.suitLabel(-1), 'パワードスーツ のこり 0');
});
test('v0.14 アーミーロボ: レーザーは ちかい じゅんに 3たいまで つらぬく・かべで とまる', () => {
  const zs = [zAt(0, -9), zAt(0, -3), zAt(0.2, -6), zAt(0, -12), zAt(3, -5), zAt(0, -4.5, { alive: false }), zAt(0, -5, { demo: true }), zAt(0, 4)];
  const h = R14.laserHits(0, 1, 0, 0, 0, -1, zs, 50);
  assert.deepEqual(h.map((x) => x.i), [1, 2, 0]);           // 3たい・ちかい じゅん（しんだ／デモ／よこ／うしろ は なし）
  assert.equal(h.length, R14.ARMY.pierce);
  assert.ok(h[0].t < h[1].t && h[1].t < h[2].t);
  assert.deepEqual(R14.laserHits(0, 1, 0, 0, 0, -1, zs, 4).map((x) => x.i), [1]);  // かべ（4m）の むこうは あたらない
  assert.deepEqual(R14.laserHits(0, 1, 0, 0, 0, -1, zs, 50, 1).map((x) => x.i), [1]);
  assert.deepEqual(R14.laserHits(0, 5, 0, 0, 0, -1, zs, 50), []);   // たかすぎる
  assert.equal(R14.ARMY.pierce, 3);
  assert.ok(R14.ARMY.pierceFall > 0 && R14.ARMY.pierceFall < 1);
});
test('v0.14 アーミーロボ: けいさつロボの めあてを さけて わける', () => {
  const zs = [zAt(0, -5), zAt(1, -6)];
  assert.equal(R14.pickArmyTarget(zs, 0, 0, 0, 0, 0, null), 0);
  assert.equal(R14.pickArmyTarget(zs, 0, 0, 0, 0, 0, null, 0), 1);       // 0ばんは けいさつロボが ねらっている
  assert.equal(R14.pickArmyTarget([zAt(0, -5)], 0, 0, 0, 0, 0, null, 0), 0); // ほかに いなければ おなじでも うつ
  assert.equal(R14.pickArmyTarget([zAt(0, -40)], 0, 0, 0, 0, 0, null), -1); // とおすぎ
  assert.equal(R14.pickArmyTarget(zs, 0, 0, 0, 0, 0, () => false), -1);     // みえない
});
test('v0.14 アーミーロボ: レベル（けいさつロボと おなじ かず）・HP ぜんかい・こわれる', () => {
  const s1 = R14.robotStats(1, R14.ARMY), s5 = R14.robotStats(5, R14.ARMY);
  assert.equal(s1.dmg, 18); assert.equal(s1.maxHp, 280); assert.equal(s1.fireRate, 1.15);
  assert.equal(s5.dmg, 23.4); assert.equal(s5.maxHp, 378); assert.ok(s5.fireRate < s1.fireRate);
  assert.equal(R14.robotStats(9, R14.ARMY).lv, 5);
  const r = { kills: 9, lv: 1, hp: 40, maxHp: 280, state: 'on' };
  assert.equal(R14.robotAddKill(r, 1, R14.ARMY), true);
  assert.equal(r.lv, 2); assert.equal(r.hp, r.maxHp); assert.equal(r.maxHp, R14.robotStats(2, R14.ARMY).maxHp);
  assert.equal(R14.robotAddKill(r, 1, R14.ARMY), false);
  assert.equal(R14.robotAddKill(r, 500, R14.ARMY), true); assert.equal(r.lv, 5);
  // けいさつロボの もとの きまりは かわらない
  assert.equal(R14.robotStats(1).dmg, R14.ROBOT.dmg);
  const a = { state: 'on', hp: 10 };
  assert.equal(R14.damageArmy(a, 4), false); assert.equal(a.hp, 10 - 4 * R14.ARMY.dmgMul);
  assert.equal(R14.damageArmy(a, 1000), true); assert.equal(a.state, 'broken'); assert.equal(a.hp, 0);
  assert.equal(R14.damageArmy({ state: 'idle', hp: 10 }, 5), false);
  assert.ok(R14.armyTouched(0.5, 0.5, 0)); assert.ok(!R14.armyTouched(3, 0, 0));
});
test('v0.14 なかまの ばしょが かさならない（ロボ ふたり・おじさん ふたり）', () => {
  assert.ok(R14.allySlotsApart() > 2.5);
  assert.ok(Math.sign(R14.ROBOT.side) !== Math.sign(R14.ARMY.side));
  assert.ok(R14.allySlotsApart(R14.COP, R14.DRUNK) > 4);
  for (const [A, B] of [[R14.ROBOT, R14.COP], [R14.ROBOT, R14.DRUNK], [R14.ARMY, R14.COP], [R14.ARMY, R14.DRUNK]]) assert.ok(R14.allySlotsApart(A, B) > 1, `${A.side} ${B.side}`);
  assert.notEqual(R14.ARMY.hp, R14.ROBOT.hp);
});
test('v0.14 よっぱらいおじさん: ふらふら・ねらい・バット', () => {
  for (let t = 0; t < 30; t += 0.07) assert.ok(Math.abs(R14.drunkWobble(t, 1.3)) <= R14.DRUNK.wobble + 1e-9);
  assert.notEqual(R14.drunkWobble(1, 0), R14.drunkWobble(2, 0));
  const zs = [zAt(0, -10), zAt(3, 0), zAt(1, 1, { alive: false }), zAt(5, 0)];
  assert.equal(R14.drunkPickTarget(zs, 0, 0, 0, 0), 1);
  assert.equal(R14.drunkPickTarget([zAt(0, -10)], 0, 0, 0, 0), -1);          // とおい
  assert.equal(R14.drunkPickTarget([zAt(0, -14)], 0, -10, 0, 0), -1);        // プレイヤーから はなれすぎ（leash）
  const b = R14.DRUNK.bat;
  assert.equal(b.bleed, null);
  assert.ok(b.knock > 0 && b.max <= 2);
  assert.ok(b.dmg <= R14.MELEE.bat.dmg);
  assert.ok(R14.DRUNK_LINES.length >= 3 && R14.DRUNK_LINES.some((s) => s.includes('ひっく')));
  for (const s of R14.DRUNK_LINES) assert.ok(!/(さけ|酒|ビール|のむ)/.test(s));
});
test('v0.14 おじさん ふたり: それぞれ べつの かくりつ・つづけて こない・いっしょの ことも ある', () => {
  // よっぱらい: ウェーブ3〜・30%・つづけて こない
  assert.equal(R14.drunkShouldCome(2, 0, 0), false);
  assert.equal(R14.drunkShouldCome(3, 0, 0), true);
  assert.equal(R14.drunkShouldCome(3, 0, 0.29), true);
  assert.equal(R14.drunkShouldCome(3, 0, 0.31), false);
  assert.equal(R14.drunkShouldCome(6, 5, 0), false);
  assert.equal(R14.drunkShouldCome(7, 5, 0), true);
  assert.equal(R14.DRUNK.chance, 0.3); assert.equal(R14.DRUNK.firstWave, 3);
  // けいさつおじさんが きても よっぱらいは べつに きめる（ふたり いっしょ OK）
  assert.equal(R14.copShouldCome(5, 0, 0) && R14.drunkShouldCome(5, 0, 0), true);
  // シミュレーション: それぞれ つづけて こない・いっしょの ウェーブも ある
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  let cl = 0, dl = 0, both = 0, cops = 0, drunks = 0;
  for (let w = 1; w <= 3000; w++) {
    const c = R14.copShouldCome(w, cl, rnd()), d = R14.drunkShouldCome(w, dl, rnd());
    if (c) { assert.ok(!cl || w - cl > 1); cl = w; cops++; }
    if (d) { assert.ok(!dl || w - dl > 1); dl = w; drunks++; }
    if (c && d) both++;
  }
  assert.ok(both > 50, `both ${both}`);
  assert.ok(cops > 400 && drunks > 400);
  assert.ok(Math.abs(cops - drunks) < 200);
});
test('v0.14 ファイル: army.js・drunk.js が キャッシュに ある', async () => {
  const fs = await import('node:fs'), path = await import('node:path'), url = await import('node:url');
  const root = path.dirname(path.dirname(url.fileURLToPath(import.meta.url)));
  const sw = fs.readFileSync(path.join(root, 'sw-assets.js'), 'utf8');
  for (const f of ['js/army.js', 'js/drunk.js']) { assert.ok(sw.includes(f), f); assert.ok(fs.existsSync(path.join(root, f))); }
  assert.ok(sw.includes(`gameVersion: '${VERSION}'`)); assert.ok(sw.includes('js/beams.js') && fs.existsSync(path.join(root, 'js/beams.js')), 'v0.15.0: beams.js');
  const dr = fs.readFileSync(path.join(root, 'js/drunk.js'), 'utf8');
  assert.ok(dr.includes('drunkShouldCome') && dr.includes('planCop') && !dr.includes('uncleForWave'));
});

// ---- v0.15.0: レーザー・ほのお・ビーム・けむり ＋ もっていく ぶき 3つ ----
import { laserHits, upgradedWeapon, gunStats, UPGRADE as UPG15 } from '../js/rules.js';
test('v0.15.0 あたらしい ぶき 4つ: ある・ばんごう・なまえ', () => {
  for (const id of ['laser', 'flamer', 'beam', 'smoke']) {
    assert.ok(WEAPONS[id] && WEAPON_ORDER.includes(id), id);
    assert.ok(WEAPONS[id].short.length <= 6, 'カードに はいる なまえ ' + id);
  }
  assert.deepEqual(WEAPON_ORDER.slice(8), ['laser', 'flamer', 'beam', 'smoke']);
  assert.ok(isGauge('laser') && isGauge('flamer') && isGauge('beam') && !isGauge('smoke') && !isGauge('rifle'));
  assert.equal(WEAPONS.laser.gauge, 'heat'); assert.equal(WEAPONS.flamer.gauge, 'fuel'); assert.equal(WEAPONS.beam.gauge, 'energy');
  for (const k of ['heat', 'fuel', 'energy']) assert.ok(GAUGE_LABEL[k]);
  for (const id of WEAPON_ORDER) assert.ok(WEAPONS[id].short && WEAPONS[id].name, id);
});

test('v0.15.0 レーザー: いっしゅんで とどく・つらぬく・ねつで オーバーヒート → さめると また うてる', () => {
  const w = WEAPONS.laser;
  assert.ok(w.pierce >= 3 && w.auto && w.range >= 50);
  const g = createGun('laser');
  let shots = 0, res, t = 0;
  for (; t < 20 && !g.lock; t += 1 / 60) { res = useGauge(g, true, 1 / 60); if (res === 'fire') shots++; }
  assert.ok(g.lock && g.over, 'オーバーヒート');
  assert.equal(shots, gaugeLasts(w), 'ゲージ ぶん うてる');
  assert.ok(shots >= 8 && shots <= 16);
  assert.equal(useGauge(g, true, 1 / 60), 'locked', 'あついと うてない');
  let cool = 0; while (g.lock && cool < 10) { useGauge(g, false, 0.05); cool += 0.05; }
  assert.ok(!g.lock && cool > 0.5 && cool < 2.5, 'すこし まつと うてる ' + cool.toFixed(2));
  assert.equal(useGauge(g, true, 1 / 60), 'fire');
  // ならんだ ゾンビを つらぬく（4たいまで）
  const zs = Array.from({ length: 6 }, (_, i) => ({ x: 0, y: 0, z: -3 - i * 2, alive: true, scale: 1 }));
  const hits = laserHits(0, 1.0, 0, 0, 0, -1, zs, w.range, w.pierce, w.beamW);
  assert.equal(hits.length, w.pierce); assert.deepEqual(hits.map((h) => h.i), [0, 1, 2, 3]);
  // かべの まえで とまる
  assert.equal(laserHits(0, 1.0, 0, 0, 0, -1, zs, 6, w.pierce, w.beamW).length, 2);
});

test('v0.15.0 かえんほうしゃき: ちかい コーン・もえる・ねんりょうは とめると もどる', () => {
  const w = WEAPONS.flamer;
  assert.ok(w.range === 10 && w.cone === 0.48 && w.burn > 0 && w.burnDps > 0 && w.burnDps < 35, '10mまで届き、威力はスーツより低い');
  const tgt = [{ x: 0, z: -4, alive: true }, { x: 0, z: -9.5, alive: true }, { x: 4.47, z: -7.81, alive: true }, { x: 0, z: -11, alive: true }, { x: 4, z: 0, alive: true }];
  assert.deepEqual(flameHits(0, 0, 0, -1, tgt, w.range, w.cone).map((h) => h.i), [0, 1, 2]);
  assert.ok(!flameHits(0, 0, 0, -1, [tgt[2]], w.range, 0.38).length, '以前の角度より広い');
  const g = createGun('flamer');
  let t = 0; while (!g.lock && t < 30) { useGauge(g, true, 0.05); t += 0.05; }
  assert.ok(Math.abs(t - gaugeLasts(w)) < 0.2, 'ねんりょう ' + t.toFixed(2));
  let r = 0; while (g.en < 1 && r < 30) { useGauge(g, false, 0.05); r += 0.05; }
  assert.ok(r < 6, 'とめると もどる');
  const z = { hp: 100, burnT: w.burn, burnDps: w.burnDps };
  const d = burnTick(z, 0.5, z.burnDps);
  assert.ok(Math.abs(d - w.burnDps * 0.5) < 1e-6);
});

test('v0.15.0 ビーム: ためてから ふとい ビーム・レーザーと ちがう', () => {
  const w = WEAPONS.beam, L = WEAPONS.laser;
  assert.ok(w.charge >= 0.3 && w.beamW > L.beamW * 2 && w.pierce > L.pierce && w.stream && !L.stream);
  const g = createGun('beam');
  const seq = [];
  for (let i = 0; i < 20; i++) seq.push(useGauge(g, true, 0.05));
  assert.equal(seq[0], 'charge'); assert.ok(seq.includes('stream'));
  assert.ok(seq.indexOf('stream') * 0.05 >= w.charge - 0.06, 'ためる じかん');
  useGauge(g, false, 0.05); assert.equal(g.charge, 0, 'はなすと ためなおし');
  let t = 0; g.en = 1; while (!g.lock && t < 30) { useGauge(g, true, 0.05); t += 0.05; }
  assert.ok(t >= 2 && t <= 6, 'エネルギー ' + t.toFixed(2));
  assert.ok(w.dmg * 1 >= ZOMBIES.walker.hp, '1びょうで ふつうの ゾンビを たおせる');
});

test('v0.15.0 けむり: やまなり・2つ まで・ボスには きかない・ダメージ なし', () => {
  const w = WEAPONS.smoke;
  assert.equal(w.dmg, 0); assert.ok(w.throw && w.time >= 5 && w.time <= 7 && w.reserve >= 2);
  const p0 = throwArc(0, 1.5, 0, 0, -1, w, 0), p1 = throwArc(0, 1.5, 0, 0, -1, w, 0.3), p2 = throwArc(0, 1.5, 0, 0, -1, w, 1.0);
  assert.ok(p1.y > p0.y && p2.y < p1.y && p2.z < p1.z, 'やまなり');
  const cl = [];
  assert.equal(addSmokeCloud(cl, 0, 0), null);
  addSmokeCloud(cl, 10, 0);
  const old = addSmokeCloud(cl, 20, 0);
  assert.equal(cl.length, SMOKE.max); assert.equal(old.x, 0, 'ふるい ものが きえる');
  assert.ok(inSmoke(cl, 10.5, 1) && !inSmoke(cl, 0, 0) && !inSmoke(cl, 15, 0));
  assert.ok(smokeAffects('walker') && smokeAffects('brute') && !smokeAffects('boss'));
  assert.ok(SMOKE.slow > 0 && SMOKE.slow < 1 && SMOKE.r >= 3);
  const ups = upgradedWeapon('smoke', 8);
  assert.ok(ups.time > w.time && ups.reserve >= w.reserve && ups.mag === 1);
});

test('v0.15.0 つよく する: ゲージ ぶきは ながく うてる・ひょうの ことば', () => {
  for (const id of ['laser', 'flamer', 'beam']) {
    assert.ok(gaugeLasts(upgradedWeapon(id, UPG15.max)) > gaugeLasts(upgradedWeapon(id, 1)), id);
    assert.ok(UPG15.base[id] > 0);
  }
  assert.ok(UPG15.base.smoke > 0);
  for (const id of WEAPON_ORDER) {
    const rows = upgradeRows(upgradedWeapon(id, 3));
    assert.ok(rows.length >= 2 && rows.length <= 3 && rows.every((r) => r.name && typeof r.v === 'string'), id);
  }
  assert.deepEqual(upgradeRows(upgradedWeapon('rifle', 1)).map((r) => r.name), ['いりょく', 'はやさ', 'たまの かず']);
  const s = normalizeSave({ wlv: { laser: 5, smoke: 2 } });
  assert.equal(s.wlv.laser, 5); assert.equal(s.wlv.smoke, 2); assert.equal(s.wlv.beam, 1);
});

test('v0.15.0 ロードアウト: 3つ・はじめは ライフル ショットガン ロケット・セーブに のこる', () => {
  assert.equal(LOADOUT_SIZE, 3);
  assert.deepEqual(DEFAULT_LOADOUT, ['rifle', 'shotgun', 'rocket']);
  assert.deepEqual(normalizeSave({}).loadout, DEFAULT_LOADOUT);
  assert.deepEqual(normalizeSave(null).loadout, DEFAULT_LOADOUT);
  assert.deepEqual(normalizeSave({ loadout: ['laser', 'smoke', 'beam'] }).loadout, ['laser', 'smoke', 'beam']);
  // こわれた セーブ: へんな なまえ・おなじ もの・おおすぎ → なおす
  assert.deepEqual(normalizeLoadout(['zzz', 'laser', 'laser']), ['laser', 'rifle', 'shotgun']);
  assert.deepEqual(normalizeLoadout(['a', 'b', 'c', 'd', 'magnum', 'pistol', 'sniper', 'minigun']), ['magnum', 'pistol', 'sniper']);
  assert.deepEqual(normalizeLoadout('x'), DEFAULT_LOADOUT);
  assert.ok(loadoutReady(DEFAULT_LOADOUT) && !loadoutReady(['rifle', 'rifle', 'rocket']) && !loadoutReady(['rifle']));
  assert.deepEqual(unlockedWeapons(normalizeSave({})), WEAPON_ORDER);
});

test('v0.15.0 ロードアウト: カードを おす（はずす・いれる・いっぱいなら いちばん ふるいと いれかえ）', () => {
  let lo = ['rifle', 'shotgun', 'rocket'];
  lo = toggleLoadout(lo, 'shotgun'); assert.deepEqual(lo, ['rifle', 'rocket']);
  lo = toggleLoadout(lo, 'laser'); assert.deepEqual(lo, ['rifle', 'rocket', 'laser']);
  lo = toggleLoadout(lo, 'smoke'); assert.deepEqual(lo, ['rocket', 'laser', 'smoke']);
  assert.equal(lo.length, LOADOUT_SIZE);
  const before = ['rifle', 'shotgun', 'rocket']; toggleLoadout(before, 'beam');
  assert.deepEqual(before, ['rifle', 'shotgun', 'rocket'], 'もとの はいれつは かえない');
});

test('v0.15.0 ロードアウト: 1〜3 キー・つぎの ぶき', () => {
  const lo = ['laser', 'flamer', 'smoke'];
  assert.equal(digitEvent('Digit1'), 'ws:0'); assert.equal(digitEvent('Digit3'), 'ws:2'); assert.equal(digitEvent('Digit9'), 'ws:8');
  assert.equal(digitEvent('Digit0'), null); assert.equal(digitEvent('KeyQ'), null);
  assert.equal(loadoutSlot(lo, 0), 'laser'); assert.equal(loadoutSlot(lo, 2), 'smoke'); assert.equal(loadoutSlot(lo, 3), null, '4は なにも ない');
  assert.equal(cycleLoadout(lo, 'laser', 1), 'flamer'); assert.equal(cycleLoadout(lo, 'smoke', 1), 'laser'); assert.equal(cycleLoadout(lo, 'laser', -1), 'smoke');
  assert.equal(cycleLoadout(lo, 'rifle', 1), 'laser', 'もっていない ぶき なら 1ばん');
});

test('v0.15.0 はこ: もっている ぶきの たま → ないなら スコア', () => {
  const guns = Object.fromEntries(WEAPON_ORDER.map((id) => [id, createGun(id)]));
  // ロケットを もっている
  guns.rocket.reserve = 0;
  let r = applyCrate(['rifle', 'shotgun', 'rocket'], guns); assert.equal(r.kind, 'rocket'); assert.ok(guns.rocket.reserve > 0);
  // ロケット なし → ミサイル
  guns.mlauncher.reserve = 0;
  r = applyCrate(['mlauncher', 'laser', 'rifle'], guns); assert.equal(r.kind, 'ammo'); assert.equal(r.id, 'mlauncher'); assert.equal(guns.mlauncher.reserve, 1);
  // けむり
  guns.smoke.reserve = 0;
  r = applyCrate(['laser', 'smoke', 'beam'], guns); assert.equal(r.id, 'smoke'); assert.equal(guns.smoke.reserve, 1);
  // ふつうの たま（いっぱい なら こえない）
  guns.shotgun.reserve = gunStats(guns.shotgun).reserve - 1;
  r = applyCrate(['shotgun', 'laser', 'beam'], guns); assert.equal(r.id, 'shotgun'); assert.equal(r.n, 1); assert.equal(guns.shotgun.reserve, gunStats(guns.shotgun).reserve);
  // ぜんぶ ゲージ（たま なし）→ スコア
  r = applyCrate(['laser', 'flamer', 'beam'], guns); assert.equal(r.kind, 'score'); assert.equal(r.n, CRATE_SCORE);
  // ロケット いっぱい・ほかも いっぱい → スコア
  guns.rocket.reserve = ROCKET_RESERVE_MAX;
  r = applyCrate(['rocket', 'pistol', 'laser'], guns); assert.equal(r.kind, 'score');
});

test('v0.15.0 SE2: ロードアウトの カード・ボタンは 40×40 いじょうで 667×375 に はいる', () => {
  const W = 667, H = 375, cols = 6, gap = 6, boxW = Math.min(W * 0.94, 620);
  const cardW = (boxW - 12 - gap * (cols - 1)) / cols, cardH = 64;
  assert.ok(cardW >= 40 && cardH >= 40, 'カード ' + cardW.toFixed(0));
  const rows = Math.ceil(WEAPON_ORDER.length / cols);
  const total = 12 + 40 + 6 + rows * cardH + (rows - 1) * gap + 6 + 52;
  assert.ok(total <= H, 'たかさ ' + total);
});

test('v0.15.0 スーツの パンチ: なぐる ボタン・ぶきバーに ない・うちながら なぐれる', () => {
  assert.ok(!SUIT_ORDER.includes('punch'), 'ぶきバーに パンチは ない');
  assert.equal(SUIT_ORDER.length, 4);
  assert.equal(SUIT_WEAPONS.punch.dmg, 1200, 'つよさは そのまま');
  assert.equal(SUIT_WEAPONS.punch.interval, 0.45);
  // キー 1〜4 → スーツの ぶき・5 は なし
  const ids = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'].map((c) => SUIT_ORDER[+digitEvent(c).slice(3)]);
  assert.deepEqual(ids, ['mcannon', 'flamer', 'cannon', 'missile', undefined]);
  // パンチの クールダウンは ぶきと べつ（ミサイルを うった すぐ あとでも なぐれる）
  const st = wearSuit(); assert.equal(st.punchCd, 0);
  st.weapon = 'missile'; st.cd = SUIT_WEAPONS.missile.interval; st.punchCd = SUIT_WEAPONS.punch.interval;
  tickSuit(st, 0.45); assert.equal(st.punchCd, 0); assert.ok(st.cd > 0 || SUIT_WEAPONS.missile.interval <= 0.45);
  tickSuit(st, 1); assert.equal(st.punchCd, 0);
});

// ================= v0.16.0: ガンキック ヒーローズの せかい（ステージを ふやす）＋ ステージ せんたく =================
import { GK_CATALOG as GKC, GK_COUNT, GK_WORLDS, GK_READY, isGkReady, gkMeta, gkNext, GK_ENEMY, gkKind, baseKind, gkWaves, gkArenaList, gkClearBonus, gkRoomAt, gkPickRoomSpawn, gkDoorOpenBox, gkLoadStage, gkLoadMap, gkStageFile } from '../js/gk/core.js';
import { registerMap, hasMap } from '../js/map.js';
import { normalizeGkSave, recordGkClear } from '../js/rules.js';
const gkAllIds = (st) => st.arenas.flat(2);

test('v0.16.0 ガンキック: 18 ステージの めくじ・ワールドに ぜんぶ はいる', () => {
  assert.equal(GK_COUNT, 18);
  assert.deepEqual(GKC.map((s) => s.no), Array.from({ length: 18 }, (_, i) => i + 1));
  const inWorld = GK_WORLDS.flatMap((w) => w.stages).sort((a, b) => a - b);
  assert.deepEqual(inWorld, GKC.map((s) => s.no), 'どの ステージも 1つの ワールドに');
  for (const w of GK_WORLDS) { assert.ok(w.id && w.tab && w.name, w.id); assert.ok(w.tab.length <= 6, 'タブに はいる ' + w.tab); }
  for (const s of GKC) { assert.ok(s.sub && s.icon && s.desc && s.boss, s.no); assert.ok(s.sub.length <= 13, 'カードに はいる ' + s.sub); }
  assert.ok(isGkReady(1) && GK_READY[1].map === 'gk_lab');
  assert.equal(gkMeta(1).world, 'w1'); assert.equal(gkMeta(99), null);
  assert.equal(gkNext(18), null); assert.equal(gkClearBonus(2) > gkClearBonus(1), true);
});

test('v0.16.0 ガンキック: ステージは 1つずつ べつの ファイル（あとから よむ）・めくじと おなじ', async () => {
  const fs = await import('node:fs'), path = await import('node:path'), url = await import('node:url');
  const root = path.dirname(path.dirname(url.fileURLToPath(import.meta.url)));
  let total = 0;
  for (const m of GKC) {
    const f = path.join(root, 'js/gk', gkStageFile(m.no));
    assert.ok(fs.existsSync(f), f); total += fs.statSync(f).size;
    const st = await gkLoadStage(m.no);
    assert.equal(st.no, m.no); assert.equal(st.sub, m.sub); assert.equal(st.world, m.world); assert.equal(st.boss.name, m.boss);
    assert.ok(st.arenas.length >= 2 && st.boss.hp > 0, m.no);
    for (const id of gkAllIds(st)) assert.ok(GK_ENEMY[id], `てき ${id} → 3D (${m.no})`);
  }
  assert.ok(total < 40000, 'ステージ データ ぜんぶで 40KB より ちいさい ' + total);
  const cat = fs.statSync(path.join(root, 'js/gk/catalog.js')).size;
  assert.ok(cat < 6000, 'めくじは ちいさい ' + cat);
});

test('v0.16.0 ガンキック: てきは ゾンビストライクの ゾンビに おきかわる', () => {
  for (const [id, k] of Object.entries(GK_ENEMY)) assert.ok(ZOMBIES[baseKind(k)], `${id} → ${k}`);
  assert.equal(gkKind('labz'), 'walker@lab'); assert.equal(baseKind('walker@lab'), 'walker');
  assert.equal(gkKind('???'), 'walker');
});

test('v0.16.0 ガンキック: へや ごとの てき・さいごの へやに ボス・まいかい おなじ', async () => {
  const st = await gkLoadStage(1);
  const w = gkWaves(st);
  assert.equal(w.length, st.arenas.length);
  assert.deepEqual(w.map((x) => x.total), [12, 17, 22, 28]);
  assert.deepEqual(w.map((x) => x.boss), [0, 0, 0, 1]);
  assert.equal(w[3].list.filter((k) => k === 'boss').length, 1);
  assert.equal(w[3].bossName, st.boss.name); assert.equal(w[3].bossLook, 'agent');
  assert.deepEqual(gkWaves(st), w, 'おなじ ステージは おなじ ならび');
  for (const x of w) { assert.ok(x.maxAlive <= 18 && x.spawnGap >= 0.5, 'SE2 でも おもくない'); for (const k of x.list) assert.ok(k === 'boss' || ZOMBIES[baseKind(k)], k); }
  for (const m of GKC) { const s = await gkLoadStage(m.no); const ws = gkWaves(s); assert.equal(ws.at(-1).boss, 1); assert.ok(ws.every((x) => x.total <= 45), m.no); }
  const l = gkArenaList([['zombie', 'brute']], 10);
  assert.equal(l.length, 10); assert.equal(l.filter((k) => k === GK_ENEMY.brute).length, 1);
});

test('v0.16.0 ガンキック マップ: いっぽんみちの へや・ドア・へやの なかから でる', async () => {
  const mod = await gkLoadMap(1);
  if (!hasMap('gk_lab')) registerMap('gk_lab', mod.build);
  const m = buildMap('gk_lab');
  const { rooms, doors } = m.gk;
  assert.equal(rooms.length, 4); assert.equal(doors.length, rooms.length - 1, 'へやの あいだに ドア');
  assert.equal(gkRoomAt(rooms, m.playerStart.x, m.playerStart.z), 0, 'さいしょの へやから');
  for (const s of m.spawns) assert.ok(gkRoomAt(rooms, s.x, s.z) >= 0, 'でぐちは どこかの へや');
  for (let i = 0; i < rooms.length; i++) assert.ok(m.spawns.filter((s) => gkRoomAt(rooms, s.x, s.z) === i).length >= 4, 'へや ' + i);
  const db = m.boxes.filter((b) => b.door !== undefined);
  assert.equal(db.length, doors.length);
  for (const b of db) assert.ok(b.barrier, 'ドアは みえない かべ');
  assert.ok(playerColliders(m).some((b) => b.door !== undefined), 'しまった ドアは とおれない');
  assert.ok(!zombieColliders(m).some((b) => b.door !== undefined));
  assert.deepEqual(gkDoorOpenBox(), [-60, -50]);
  assert.ok(!MAP_IDS_MAP.includes('gk_lab'), 'いつもの マップ リストには はいらない');
});

test('v0.16.0 ガンキック: へやの でぐちは ちかすぎない ところ', () => {
  const sp = [{ x: 0, z: 0 }, { x: 20, z: 0 }, { x: 30, z: 0 }];
  for (let r = 0; r < 1; r += 0.1) assert.notEqual(gkPickRoomSpawn(sp, 0, 0, r), sp[0]);
  assert.equal(gkPickRoomSpawn([{ x: 1, z: 1 }], 0, 0, 0.5).x, 1, 'ちかくしか なければ そこ');
  assert.equal(gkRoomAt([{ b: [0, 0, 10, 10] }], 20, 5), -1);
});

test('v0.16.0 いつもの マップと モードは そのまま', () => {
  assert.deepEqual(MAP_IDS_MAP, MAP_IDS);
  assert.equal(MAP_IDS.length, 13);
  assert.ok(!MAP_IDS.some((id) => id.startsWith('gk')));
});

test('v0.16.0 セーブ: クリアと さいこう スコア・タブ', () => {
  assert.deepEqual(normalizeGkSave(null), { clear: [], best: {} });
  assert.deepEqual(normalizeGkSave({ clear: [3, 1, 1, 'x', 120, -2], best: { 1: 500, 3: 'a', 177: 4 } }), { clear: [1, 3], best: { 1: 500 } });
  const s = normalizeSave(null);
  assert.equal(s.tab, 'zs'); assert.equal(normalizeSave({ tab: 'w2' }).tab, 'w2'); assert.equal(normalizeSave({ tab: 'zzz' }).tab, 'zs');
  assert.equal(recordGkClear(s, 1, 1000), true); assert.deepEqual(s.gk.clear, [1]);
  assert.equal(recordGkClear(s, 1, 800), false); assert.equal(s.gk.best[1], 1000);
  assert.equal(recordGkClear(s, 1, 1200), true); assert.equal(s.gk.best[1], 1200); assert.deepEqual(s.gk.clear, [1]);
});

test('v0.16.0 ファイル: キャッシュ・えもじ・ステージ せんたく', async () => {
  const fs = await import('node:fs'), path = await import('node:path'), url = await import('node:url');
  const root = path.dirname(path.dirname(url.fileURLToPath(import.meta.url)));
  const sw = fs.readFileSync(path.join(root, 'sw-assets.js'), 'utf8');
  for (const f of ['js/gk/core.js', 'js/gk/catalog.js', 'js/gk/play.js']) assert.ok(sw.includes(f), f);
  assert.ok(!sw.includes('js/gk/stages/'), 'ステージは あとから よむ（さいしょの キャッシュに いれない）');
  const bad = /[⛑🏥🚑✚✙✛✜➕✝☩]|\p{Regional_Indicator}/u;
  const files = ['js/gk/core.js', 'js/gk/catalog.js', 'js/gk/play.js', 'js/gk/maps/lab.js', ...GKC.map((m) => 'js/gk' + gkStageFile(m.no).slice(1))];
  for (const f of files) assert.ok(!bad.test(fs.readFileSync(path.join(root, f), 'utf8')), f);
  const ix = fs.readFileSync(path.join(root, 'js/index.js'), 'utf8');
  assert.ok(ix.includes('zt-tabs') && ix.includes('zt-cards') && ix.includes('data-gk') && ix.includes('cpretry') && ix.includes('zt-clear'));
  for (const f of ['js/game.js', 'js/gk/play.js', 'js/index.js']) assert.ok(!/blood\s*:\s*0x[89a-f][0-9a-f]0000/i.test(fs.readFileSync(path.join(root, f), 'utf8')), 'あかい ちは なし ' + f);
});

test('v0.16.0 みため: けんきゅうじょの ゾンビ・くろよろい', async () => {
  const fs = await import('node:fs'), path = await import('node:path'), url = await import('node:url');
  const root = path.dirname(path.dirname(url.fileURLToPath(import.meta.url)));
  const md = fs.readFileSync(path.join(root, 'js/models.js'), 'utf8');
  assert.ok(md.includes('GK_LOOKS') && md.includes('lab') && md.includes('agent') && md.includes('splitLook'));
  for (const k of Object.values(GK_ENEMY)) { const lk = k.split('@')[1]; if (lk) assert.ok(md.includes(`${lk}:`), lk); }
});

// ================= v0.16.1: ドアを あるいて とおれる・スーツと なかまは いまの へや =================
import { gkEntered, gkSpotCells, GK_ENTER_R } from '../js/gk/core.js';
import { collideCircle as cc161 } from '../js/rules.js';
const lab161 = async () => { const mod = await gkLoadMap(1); if (!hasMap('gk_lab')) registerMap('gk_lab', mod.build); return buildMap('gk_lab'); };
// ゲームと おなじ うごき（0.35m の まる・4.7 m/s・0.15m ずつ・かべに そって すべる）
function walk161(boxes, sx, sz, pts, maxT = 12) {
  let x = sx, z = sz, k = 0; const dt = 1 / 60, sp = 4.7;
  for (let t = 0; t < maxT && k < pts.length; t += dt) {
    const [wx, wz] = pts[k], dx = wx - x, dz = wz - z, d = Math.hypot(dx, dz);
    if (d < 0.8) { k++; continue; }
    const vx = dx / d * sp, vz = dz / d * sp, n = Math.max(1, Math.ceil(sp * dt / 0.15));
    for (let i = 0; i < n; i++) { const r = cc161(x + vx * dt / n, z + vz * dt / n, 0.35, 0, boxes); x = r.x; z = r.z; }
  }
  return { x, z, done: k >= pts.length };
}
test('v0.16.1 ガンキック ドア: ひらいた ドアは どの むき・ずれ でも あるいて とおれて つぎの へやに はいる', async () => {
  const m = await lab161(), gm = m.gk;
  for (let i = 0; i < gm.doors.length; i++) {
    const d = gm.doors[i], ax = d.axis === 'x';
    const c = (r) => { const [x0, z0, x1, z1] = gm.rooms[r].b; return [(x0 + x1) / 2, (z0 + z1) / 2]; };
    const sgn = Math.sign(ax ? c(i + 1)[1] - d.z : c(i + 1)[0] - d.x); // つぎの へやの ほう
    const pt = (along, side) => (ax ? [d.x + side, d.z + sgn * along] : [d.x + sgn * along, d.z + side]);
    const boxes = (open) => playerColliders(m).map((b) => (b.door === undefined ? b : open.includes(b.door) ? { ...b, minY: -60, maxY: -50 } : b));
    const openB = boxes(Array.from({ length: i + 1 }, (_, k) => k)), shutB = boxes(Array.from({ length: i }, (_, k) => k));
    for (const off of [-1.6, -0.8, 0, 0.8, 1.6]) for (const aim of [-2.5, 0, 2.5]) {
      const [sx, sz] = pt(-4, off), goal = pt(4, aim);
      // まっすぐ ドアの ほうへ（ななめ・はしっこ でも すべって とおる）
      const r = walk161(openB, sx, sz, [goal]);
      assert.ok(gkRoomAt(gm.rooms, r.x, r.z) === i + 1 && gkEntered(gm, i + 1, r.x, r.z), `ドア${i} off ${off} aim ${aim} → ${r.x.toFixed(1)},${r.z.toFixed(1)}`);
      // しまって いる ときは とおれない
      const s = walk161(shutB, sx, sz, [goal], 4);
      assert.notEqual(gkRoomAt(gm.rooms, s.x, s.z), i + 1, `しまった ドア${i} は とおれない`);
    }
    // ゆるめ: ドアの まんなか・すこし てまえ でも はいった ことに
    assert.ok(gkEntered(gm, i + 1, d.x, d.z) && gkEntered(gm, i + 1, ...pt(-GK_ENTER_R + 0.2, 0)));
    assert.ok(!gkEntered(gm, i + 1, ...pt(-GK_ENTER_R - 2, 0)), 'まえの へやの おくでは まだ');
  }
  assert.ok(GK_ENTER_R >= 2.5);
});
test('v0.16.1 ガンキック ドア: スタートから ボスの へやまで あるいて いける（ドアを じゅんばんに あける）', async () => {
  const m = await lab161(), gm = m.gk;
  const route = [[[-6, 24], [6, 24], [9, 22]], [[17, 22], [30, 21], [30, 4], [26, 0]], [[20, -2], [-24, -2], [-30, -2], [-30, -18]]];
  let x = m.playerStart.x, z = m.playerStart.z;
  for (let i = 0; i < route.length; i++) {
    const open = Array.from({ length: i + 1 }, (_, k) => k);
    const boxes = playerColliders(m).map((b) => (b.door !== undefined && open.includes(b.door) ? { ...b, minY: -60, maxY: -50 } : b));
    const r = walk161(boxes, x, z, route[i], 30);
    assert.ok(r.done, `ルート ${i}`); x = r.x; z = r.z;
    assert.ok(gkEntered(gm, i + 1, x, z), `へや ${i + 1} に はいった`);
  }
  assert.equal(gkRoomAt(gm.rooms, x, z), 3, 'ボスの へや');
});
test('v0.16.1 ガンキック: スーツ・なかまロボは まだ しまっている へやに でない', async () => {
  const m = await lab161(), gm = m.gk;
  const nav = makeNav(zombieColliders(m), m); nav.update(m.playerStart.x, 0, m.playerStart.z);
  const cells = nav.openCells(m.half - 3);
  assert.ok(cells.some((c) => gkRoomAt(gm.rooms, c[0], c[1]) === 3), 'なにも しないと おくの へやも はいって しまう（なおす まえの バグ）');
  for (let r = 0; r < gm.rooms.length; r++) {
    const f = gkSpotCells(gm, r, cells);
    assert.ok(f.length > 20, 'へや ' + r);
    for (const c of f) {
      assert.equal(gkRoomAt(gm.rooms, c[0], c[1]), r, 'いまの へや だけ');
      for (const d of gm.doors) assert.ok(Math.hypot(c[0] - d.x, c[1] - d.z) >= 3.5, 'ドアの まえには おかない');
    }
  }
  assert.deepEqual(gkSpotCells(null, 0, [[1, 2, 0]]), [[1, 2, 0]], 'ふつうの マップは そのまま');
  const fs = await import('node:fs'), path = await import('node:path'), url = await import('node:url');
  const root = path.dirname(path.dirname(url.fileURLToPath(import.meta.url)));
  const src = ['js/suit.js', 'js/robot.js', 'js/army.js'].map((f) => fs.readFileSync(path.join(root, f), 'utf8'));
  for (const s of src) assert.ok(s.includes('gkSpotFilter(cells)') && s.includes('gkSpotFrom()'));
});

// ================= v0.17.0: セグメント（ステージを くぎって すすむと よむ・とおると すてる）=================
import { SEG, segStarts, segTotalRooms, segOfRoom, segResume, segDoorIndex, segOffset, segNear, segPassed, placeSeg, joinSegs, chainSegs, segRegion, segOverlap, segShouldLoad, segSeals, segCpSpot, inBounds } from '../js/gk/seg.js';
import { gkLoadSeg, gkLoadSegs } from '../js/gk/core.js';
import { mapBuilder } from '../js/map.js';
import { makeNavAt } from '../js/nav.js';
const segBuildAll = async (no) => { const info = GK_READY[no]; const ms = await gkLoadSegs(info, info.segs.map((_, i) => i)); return info.segs.map((_, i) => ms[i].build(mapBuilder)); };

test('v0.17.0 セグメント: へやの ばんごう ↔ セグメント・ドアの ばんごう', () => {
  const segs = [{ mod: 'a', rooms: 2 }, { mod: 'b', rooms: 3 }, { mod: 'c', rooms: 1 }];
  assert.deepEqual(segStarts(segs), [0, 2, 5]); assert.equal(segTotalRooms(segs), 6);
  assert.deepEqual(segOfRoom(segs, 0), { seg: 0, local: 0, r0: 0 });
  assert.deepEqual(segOfRoom(segs, 3), { seg: 1, local: 1, r0: 2 });
  assert.deepEqual(segOfRoom(segs, 5), { seg: 2, local: 0, r0: 5 });
  assert.equal(segOfRoom(segs, 99).seg, 2, 'はみだしても さいごの セグメント');
  assert.equal(segResume(segs, 2), 1, 'チェックポイント（へや2）は 2ばんめの セグメントから よむ');
  assert.equal(segDoorIndex(2, 3, 'in'), 1); assert.equal(segDoorIndex(2, 3, 'out'), 4); assert.equal(segDoorIndex(2, 3, 1), 3);
  assert.deepEqual(segOffset({ x: 30, z: 12 }, { x: 0, z: 36 }), { x: 30, z: -24 });
});

test('v0.17.0 セグメント: よむ・すてる の きまり（12m・ドアを すぎた）', () => {
  const p = { exit: { x: 0, z: 0, axis: 'x' } };
  assert.equal(SEG.ahead, 12);
  assert.ok(segNear(p, 0, 11.9)); assert.ok(!segNear(p, 0, 12.1)); assert.ok(!segNear({ exit: null }, 0, 0), 'さいごの セグメントは つぎが ない');
  const live = new Set([0]);
  assert.ok(segShouldLoad({ cur: 0, total: 2, live, want: true }));
  assert.ok(!segShouldLoad({ cur: 0, total: 2, live, want: false }), 'ちかく なければ まだ');
  assert.ok(!segShouldLoad({ cur: 1, total: 2, live: new Set([1]), want: true }), 'さいごの セグメント');
  assert.ok(!segShouldLoad({ cur: 0, total: 3, live: new Set([0, 1]), want: true }), 'もう ある');
  assert.ok(!segShouldLoad({ cur: 0, total: 3, live, busy: true, want: true }), 'つくって いる さいちゅう');
  assert.ok(!segShouldLoad({ cur: 1, total: 3, live: new Set([0, 1]), want: true }), 'まえを すてるまで まつ（3つ いじょう もたない）');
  // ドアを すぎた（z=12 の ドア・へやは z が ちいさい がわ）
  const door = { x: 30, z: 12, axis: 'x' }, room = { b: [-36, -12, 36, 12] };
  assert.ok(!segPassed(door, room, 30, 11)); assert.ok(segPassed(door, room, 30, 9.4));
  const dz = { x: 0, z: 24, axis: 'z' }, rz = { b: [0, 12, 36, 36] };
  assert.ok(!segPassed(dz, rz, 1, 24)); assert.ok(segPassed(dz, rz, 3, 24));
});

test('v0.17.0 ステージ1: 2つの セグメント（いりぐち+サーバーしつ / タンク+ちか）・つなぎめ', async () => {
  const info = GK_READY[1];
  assert.deepEqual(info.segs.map((s) => s.mod), ['lab_a', 'lab_b']);
  const st = await gkLoadStage(1);
  assert.equal(segTotalRooms(info.segs), st.arenas.length, 'へやの かず = アリーナの かず');
  const built = await segBuildAll(1);
  built.forEach((b, i) => {
    assert.equal(b.seg.rooms.length, info.segs[i].rooms, 'へやの かず ' + i);
    assert.equal(b.seg.doors.length, b.seg.rooms.length - 1, 'なかの ドア');
    assert.equal(!!b.seg.entry, i > 0, 'いりぐち'); assert.equal(!!b.seg.exit, i < built.length - 1, 'でぐち');
    const db = b.boxes.filter((x) => x.door !== undefined);
    assert.equal(db.length, b.seg.doors.length + (b.seg.entry ? 1 : 0) + (b.seg.exit ? 1 : 0), 'ドアの みえない かべ');
    for (const x of db) assert.ok(x.barrier);
    for (const x of b.boxes.filter((y) => y.edge === 'in')) assert.ok(b.seg.entry, 'いりぐちの かべは いりぐちが ある セグメントだけ');
    for (const rm of b.seg.rooms) assert.ok(rm.spawns.length >= 4, rm.name);
  });
  const placed = chainSegs(built);
  const [A, B] = placed;
  assert.deepEqual([A.exit.x, A.exit.z, A.exit.axis, A.exit.g], [B.entry.x, B.entry.z, B.entry.axis, B.entry.g], 'でぐち = つぎの いりぐち');
  assert.ok(!segOverlap(A.bounds, B.bounds), 'となりの セグメントは かさならない');
  // まえの セグメントが ある → いりぐちの かべは つかわない（ドアの かべは 1つ）
  const both = joinSegs(placed);
  assert.equal(both.boxes.filter((x) => x.door === 1).length, 1);
  assert.equal(both.boxes.length, A.boxes.length + B.boxes.filter((x) => x.edge !== 'in').length);
  assert.ok(both.boxes.length <= 700, 'SE2: はこ ' + both.boxes.length);
  // B だけ（まえを すてた あと）→ いりぐちの かべで ふさがる
  const onlyB = joinSegs([B]);
  assert.equal(onlyB.boxes.filter((x) => x.door === 1).length, 1, 'B の いりぐちの ドア');
  assert.ok(onlyB.boxes.some((x) => x.edge === 'in' && x.collide && x.mat === 'wall'), 'B の いりぐちの かべ');
  assert.ok(!onlyB.gk.rooms[0] && !onlyB.gk.rooms[1] && onlyB.gk.rooms[2] && onlyB.gk.rooms[3], 'へやの ばんごうは ステージ ぜんたいの まま');
  assert.equal(gkRoomAt(onlyB.gk.rooms, -20, 30), -1, 'すてた へやは ない');
  assert.equal(gkRoomAt(onlyB.gk.rooms, 0, 0), 2);
});

test('v0.17.0 セグメント: とおくに おいても ずれる（はこ・へや・ドア・あかり・ナビ・ぶつかり）', async () => {
  const mod = await gkLoadSeg('lab_b');
  const b0 = mod.build(mapBuilder), b1 = mod.build(mapBuilder);
  const p = placeSeg(b1, { idx: 1, r0: 2, ox: 500, oz: -300 });
  assert.equal(p.boxes.length, b0.boxes.length);
  assert.equal(p.boxes[5].minX, b0.boxes[5].minX + 500); assert.equal(p.boxes[5].minZ, b0.boxes[5].minZ - 300);
  assert.deepEqual(p.rooms[0].b, [b0.seg.rooms[0].b[0] + 500, b0.seg.rooms[0].b[1] - 300, b0.seg.rooms[0].b[2] + 500, b0.seg.rooms[0].b[3] - 300]);
  assert.equal(p.lamps[0].x, b0.lamps[0].x + 500);
  assert.equal(p.entry.g, 1); assert.equal(p.doors[0].g, 2);
  assert.ok(p.boxes.every((x) => x.seg === 1 && x.veh === undefined));
  for (const s of p.rooms.flatMap((r) => r.spawns)) assert.ok(inBounds(p.bounds, s.x, s.z));
  const m = joinSegs([p]), R = segRegion([p]);
  for (const [x, z] of [[p.bounds[0], p.bounds[1]], [p.bounds[2], p.bounds[3]]]) assert.ok(Math.abs(x - R.cx) <= R.half && Math.abs(z - R.cz) <= R.half);
  const idx = makeBoxIndex(playerColliders(m), R.half, 4, 2, R.cx, R.cz);
  const wall = m.boxes.find((x) => x.mat === 'wall' && x.collide);
  assert.ok(idx.near((wall.minX + wall.maxX) / 2, (wall.minZ + wall.maxZ) / 2).includes(wall), 'ずれた ます目で みつかる');
  const nav = makeNavAt(zombieColliders(m).concat(segSeals(m)), m, R);
  const start = segCpSpot(m.gk.doors, m.gk.rooms, 2);
  assert.equal(gkRoomAt(m.gk.rooms, start.x, start.z), 2, 'チェックポイントは へや2の なか');
  nav.update(start.x, 0, start.z);
  const boss = m.gk.rooms[3].spawns[0];
  assert.ok(nav.dir(boss.x, 0, boss.z), 'ボスの へやから プレイヤーへ みちが ある');
  const cells = nav.openCells(SEG.far);
  assert.ok(cells.length > 50);
  for (const [x, z] of cells) assert.ok(gkRoomAt(m.gk.rooms, x, z) >= 0 || Math.abs(z + 312) < 1.5, `ナビは セグメントの そとに でない ${x},${z}`);
});

test('v0.17.0 チェックポイント: ドアの 3m さき・へやの なか・まんなかを むく', async () => {
  const placed = chainSegs(await segBuildAll(1)), m = joinSegs(placed);
  for (let from = 1; from < 4; from++) {
    const c = segCpSpot(m.gk.doors, m.gk.rooms, from), d = m.gk.doors[from - 1];
    assert.equal(gkRoomAt(m.gk.rooms, c.x, c.z), from, 'へや ' + from);
    assert.ok(Math.abs(Math.hypot(c.x - d.x, c.z - d.z) - 3) < 1e-9);
    const [x0, z0, x1, z1] = m.gk.rooms[from].b, fx = -Math.sin(c.yaw), fz = -Math.cos(c.yaw);
    assert.ok(fx * ((x0 + x1) / 2 - c.x) + fz * ((z0 + z1) / 2 - c.z) > 0, 'へやの ほうを むく');
  }
  // さいかいは その セグメント だけ（ドアの むこうに へやが ない → しまった まま・ゾンビも とおれない）
  assert.deepEqual(segSeals(joinSegs([placed[1]])).map((b) => b.door), [1]);
  assert.deepEqual(segSeals(joinSegs([placed[0]])).map((b) => b.door), [1], 'でぐちの さきが まだ ない');
  assert.deepEqual(segSeals(joinSegs(placed)).map((b) => b.door), [], 'りょうがわ ある ときは ふさがない');
});

test('v0.17.0 ファイル: セグメントは あとから よむ・きどうの キャッシュは seg.js と stream.js だけ', async () => {
  const fs = await import('node:fs'), path = await import('node:path'), url = await import('node:url');
  const root = path.dirname(path.dirname(url.fileURLToPath(import.meta.url)));
  const sw = fs.readFileSync(path.join(root, 'sw-assets.js'), 'utf8');
  for (const f of ['js/gk/seg.js', 'js/gk/stream.js']) assert.ok(sw.includes(f), f);
  assert.ok(!sw.includes('js/gk/seg/') && !sw.includes('js/gk/maps/'), 'セグメント・マップは あとから');
  for (const info of Object.values(GK_READY)) for (const s of info.segs || []) {
    const f = path.join(root, 'js/gk/seg', s.mod + '.js');
    assert.ok(fs.existsSync(f), f);
    assert.ok(fs.statSync(f).size < 10240, 'セグメントは 10KB より ちいさい ' + s.mod);
    assert.ok(!/[⛑🏥🚑✚✙✛✜➕✝☩]|\p{Regional_Indicator}/u.test(fs.readFileSync(f, 'utf8')), s.mod);
  }
  for (const f of ['js/gk/seg.js', 'js/gk/stream.js']) assert.ok(fs.statSync(path.join(root, f)).size < 14000, f);
});

test('v0.17.0 makeBoxIndex: まんなかを ずらしても いままでと おなじ', () => {
  const boxes = [{ minX: -3, maxX: -1, minZ: 2, maxZ: 4 }, { minX: 10, maxX: 12, minZ: -8, maxZ: -6 }];
  const a = makeBoxIndex(boxes, 20), b = makeBoxIndex(boxes, 20, 4, 2, 0, 0);
  for (const [x, z] of [[-2, 3], [11, -7], [0, 0]]) assert.deepEqual(a.near(x, z), b.near(x, z));
  const moved = boxes.map((o) => ({ minX: o.minX + 300, maxX: o.maxX + 300, minZ: o.minZ - 900, maxZ: o.maxZ - 900 }));
  const c = makeBoxIndex(moved, 20, 4, 2, 300, -900);
  assert.ok(c.near(298, -897).includes(moved[0])); assert.ok(c.near(311, -907).includes(moved[1]));
});

// ================= v0.17.0: ワールド1 ステージ2〜5（おやしき・あめの まち・ちかてつ・とう）=================
import { TRAIN, trainNew, trainStep, trainSpan, trainHit, trainSide, trainTimes, gkLoadGims } from '../js/gk/core.js';

test('v0.17.0 ワールド1: ステージ1〜5 が あそべる（カードの 🔒 が はずれる）', () => {
  for (const no of [1, 2, 3, 4, 5]) assert.ok(isGkReady(no), 'ステージ ' + no);
  assert.equal(gkNext(1), 2); assert.equal(gkNext(4), 5);
  assert.deepEqual(Object.keys(GK_READY).map(Number).filter((n) => n <= 5), [1, 2, 3, 4, 5]);
  for (const [no, info] of Object.entries(GK_READY)) {
    assert.ok(['day', 'sunset', 'night'].includes(info.tod), 'tod ' + no);
    assert.ok(info.map.startsWith('gk_') && !MAP_IDS.includes(info.map), 'いつもの マップ リストに はいらない ' + no);
    assert.ok(info.segs && info.segs.length >= 2, 'セグメント ' + no);
  }
});

test('v0.17.0 GK マップ: へや・ドア・でぐち・ナビ（ドアを あけて さいごの へやまで）・はこ', async () => {
  for (const no of Object.keys(GK_READY).map(Number)) {
    const st = await gkLoadStage(no), info = GK_READY[no];
    const placed = chainSegs(await segBuildAll(no)), m = joinSegs(placed), gm = m.gk;
    const n = st.arenas.length, tag = `ステージ${no}`;
    assert.equal(gm.rooms.length, n, tag + ' へや = アリーナ'); assert.equal(segTotalRooms(info.segs), n);
    assert.equal(gm.doors.filter(Boolean).length, n - 1, tag + ' ドア = へや-1');
    assert.equal(gkRoomAt(gm.rooms, m.playerStart.x, m.playerStart.z), 0, tag + ' スタートは へや0');
    for (const [i, rm] of gm.rooms.entries()) {
      assert.ok(rm.spawns.length >= 4, `${tag} へや${i} の でぐち`);
      for (const s of rm.spawns) assert.equal(gkRoomAt(gm.rooms, s.x, s.z), i, `${tag} でぐちは その へやの なか`);
      assert.ok(!/\p{Script=Han}/u.test(rm.name) && rm.name.length <= 12, `${tag} へやの なまえ「${rm.name}」`);
    }
    // ドアの りょうがわは となりの へや
    gm.doors.forEach((d, g) => {
      const ax = d.axis === 'x', p = (s) => (ax ? [d.x, d.z + s * 2] : [d.x + s * 2, d.z]);
      assert.deepEqual([gkRoomAt(gm.rooms, ...p(-1)), gkRoomAt(gm.rooms, ...p(1))].sort((a, b) => a - b), [g, g + 1], `${tag} ドア${g}`);
    });
    const db = m.boxes.filter((b) => b.door !== undefined);
    assert.equal(db.length, n - 1, tag + ' ドアの みえない かべ'); for (const b of db) assert.ok(b.barrier);
    assert.ok(!zombieColliders(m).some((b) => b.door !== undefined), tag + ' ゾンビは ドアを とおれる');
    // となりあう 2つ（ゲームが いっしょに もつ ぶん）で SE2 の はこ 700 まで・かさならない
    for (let i = 1; i < placed.length; i++) {
      assert.ok(!segOverlap(placed[i - 1].bounds, placed[i].bounds), `${tag} セグメント${i - 1}と${i}`);
      const k = joinSegs([placed[i - 1], placed[i]]).boxes.length;
      assert.ok(k <= 700, `${tag} セグメント${i - 1}+${i} の はこ ${k}`);
    }
    // ドアを あけた じょうたいで スタートから さいごの へやの でぐちへ
    const nav = makeNavAt(zombieColliders(m), m, segRegion(placed));
    nav.update(m.playerStart.x, m.playerStart.y || 0, m.playerStart.z);
    const reach = (s) => (nav.layered ? nav.distAt(s.x, s.y || 0, s.z) >= 0 : nav.free(s.x, s.y || 0, s.z));
    for (const [i, rm] of gm.rooms.entries()) assert.ok(rm.spawns.filter(reach).length >= Math.min(4, rm.spawns.length), `${tag} へや${i} へ いける`);
  }
});

test('v0.17.0 とう（ステージ5）: いっかいずつ たかく・ドアは したの ゆか・さかで のぼる', async () => {
  const placed = chainSegs(await segBuildAll(5)), m = joinSegs(placed), gm = m.gk;
  assert.ok(m.vertical, 'たかさの ある みちさがし');
  assert.deepEqual(gm.rooms.map((r) => r.y), [0, 3, 6, 9, 12]);
  gm.doors.forEach((d, g) => assert.equal(d.y || 0, gm.rooms[g].y, 'ドア' + g + ' は したの へやの ゆか'));
  for (const rm of gm.rooms) for (const s of rm.spawns) assert.equal(s.y || 0, rm.y, 'でぐちは その へやの ゆか');
  // チェックポイントは ドアの さきの さかの うえ（ゆかに めりこまない）
  const pc = makeBoxIndex(playerColliders(m), 200);
  for (let from = 1; from < 5; from++) {
    const c = segCpSpot(gm.doors, gm.rooms, from), y = groundHeight(c.x, c.z, 0.35, c.y + 3.4, pc);
    assert.ok(y >= gm.rooms[from - 1].y && y <= gm.rooms[from].y, `へや${from} の さいかい たかさ ${y}`);
  }
});

test('v0.17.0 でんしゃ（ステージ4）: よこく 0.8びょう いじょう → とおる → まつ・あたりは とおる あいだ だけ', () => {
  const L = { room: 0, axis: 'z', at: -20, from: -26, to: 26, w: 3.2 };
  assert.ok(TRAIN.warn >= 0.8, 'よこくは 0.8びょう いじょう'); assert.ok(TRAIN.dmg <= 25, 'いたさは 25 まで');
  const tt = trainTimes(L); assert.equal(tt.warn, TRAIN.warn); assert.ok(tt.pass > 1 && tt.pass < 6, 'とおる じかん ' + tt.pass);
  const st = trainNew(() => 0);
  const seq = [];
  let tWarn = 0, tPass = 0;
  for (let i = 0; i < 2000 && seq.length < 4; i++) {
    const ch = trainStep(st, L, 0.02, () => 0.3);
    if (st.phase === 'warn') tWarn += 0.02; if (st.phase === 'pass') tPass += 0.02;
    assert.equal(trainHit(st, L, -20, 0), st.phase === 'pass' && trainSpan(st)[0] < 0.35 && trainSpan(st)[1] > -0.35, 'せんろの うえ');
    assert.ok(!trainHit(st, L, -20 + L.w / 2 + 1, 0), 'せんろの そとは あたらない');
    if (ch) seq.push(ch);
  }
  assert.deepEqual(seq.slice(0, 3), ['warn', 'pass', 'wait']);
  assert.ok(Math.abs(tWarn - TRAIN.warn) < 0.05, 'よこく じかん ' + tWarn);
  assert.ok(tPass > tt.pass - 0.1 && tPass < tt.pass + 0.1, 'とおる じかん ' + tPass);
  assert.equal(trainSide(L, -19, 0), 1); assert.equal(trainSide(L, -21, 0), -1);
});

test('v0.17.0 でんしゃ: せんろは へやを よこぎる・でぐちは せんろに ない・ギミックの ファイル', async () => {
  const placed = chainSegs(await segBuildAll(4)), m = joinSegs(placed), gm = m.gk;
  assert.deepEqual(GK_READY[4].gim, ['train']); assert.ok(gm.trains.length >= 2);
  for (const L of gm.trains) {
    const [x0, z0, x1, z1] = gm.rooms[L.room].b, ax = L.axis === 'x';
    const lo = Math.min(L.from, L.to), hi = Math.max(L.from, L.to);
    assert.ok(ax ? lo <= x0 && hi >= x1 : lo <= z0 && hi >= z1, 'へやの はしから はしまで');
    for (const s of gm.rooms[L.room].spawns) assert.ok(Math.abs((ax ? s.z : s.x) - L.at) > L.w / 2, 'でぐちは せんろの そと');
  }
  for (const no of Object.keys(GK_READY)) { const mods = await gkLoadGims(GK_READY[no]); for (const g of mods) assert.equal(typeof g.create, 'function'); }
  assert.deepEqual(GK_READY[3].gim, ['rain']);
});

// ================= v0.17.0: ボスごとの わざ（よこく → よけられる）=================
import { RULE as BR, KINDS as BKINDS, actTime, teleTime, brainNew, brainCool, brainStep, brainStart, pickMove, inCircle, inLine, inCone, circleSpots, fanDirs, checkBoss, allMoves, bossPhase, phaseMoves } from '../js/gk/bosses/brain.js';
import { GK_BOSS_AI, GK_BOSS_LOOK } from '../js/gk/core.js';
const loadBossDef = (id) => import(`../js/gk/bosses/${id}.js`).then((m) => m.BOSS);

test('v0.17.0 ボス: 18たい ぜんぶの わざ・よこく 0.8びょう いじょう・いたさ 25 まで・HP', async () => {
  const want = [];
  for (const m of GKC) { const st = await gkLoadStage(m.no); want.push([st.boss.id, st.boss.hp]); }
  assert.deepEqual([...GK_BOSS_AI].sort(), want.map(([id]) => id).sort(), 'ステージの ボス ぜんぶ');
  for (const [id, hp] of want) {
    const B = await loadBossDef(id);
    assert.ok(hp > 0, id + ' HP');
    assert.deepEqual(checkBoss(B), [], id);
    assert.equal(B.id, id); assert.equal(GK_BOSS_LOOK[id], B.look.id || id, id + ' みため');
    for (const mv of allMoves(B)) {
      assert.ok(BKINDS.includes(mv.kind), `${id}.${mv.id}`);
      assert.ok(mv.tele >= 0.8, `${id}.${mv.id} よこく ${mv.tele}`);
      assert.ok((mv.dmg || 0) <= 25, `${id}.${mv.id} いたさ ${mv.dmg}`);
      if (mv.fxColor != null) { const r = mv.fxColor >> 16, g = (mv.fxColor >> 8) & 255; assert.ok(!(r > 180 && g < 60), `${id}.${mv.id} あかい しぶき なし`); }
    }
    if (B.extraLooks) for (const lk of Object.values(B.extraLooks)) assert.ok(lk.colors, id + ' にせものの みため');
  }
  assert.ok(BR.fxMax <= 30, 'よこく・たまは 30 まで（SE2）');
});

test('v0.17.0 ボスの あたま: よこく → こうげき → やすみ → つぎ・クールダウンと きょり', async () => {
  const B = await loadBossDef('agent');
  const st = brainNew(B);
  assert.equal(pickMove(B, st, 8), null, 'さいしょは すこし まつ');
  for (let i = 0; i < 400; i++) brainCool(st, 0.05);
  const m = pickMove(B, st, 8, () => 0.99);
  assert.ok(m && m.range[0] <= 8 && m.range[1] >= 8);
  assert.equal(pickMove(B, st, 99), null, 'とおすぎ');
  brainStart(st, m);
  assert.equal(st.phase, 'tele'); assert.ok(st.cd[m.id] > 0, 'つかったら クールダウン');
  const seq = []; let tTele = 0;
  for (let i = 0; i < 1000 && st.phase !== 'idle'; i++) { if (st.phase === 'tele') tTele += 0.01; const c = brainStep(st, 0.01); if (c) seq.push(c); }
  assert.deepEqual(seq, ['act', 'rest', 'idle']);
  assert.ok(Math.abs(tTele - teleTime(m)) < 0.02 && tTele >= 0.8, 'よこくの じかん ' + tTele);
  assert.ok(st.gap > 0, 'つぎの わざまで すこし あける');
  assert.equal(pickMove(B, st, 8), null);
});

test('v0.17.0 ボスの あたり: まる・おび・おうぎ・たまの おうぎ', () => {
  assert.ok(inCircle(1, 1, 0, 0, 1.5)); assert.ok(!inCircle(2, 2, 0, 0, 1.5));
  assert.ok(inLine(0, 5, 0, 0, 0, 1, 10, 2)); assert.ok(!inLine(1.5, 5, 0, 0, 0, 1, 10, 2)); assert.ok(!inLine(0, -3, 0, 0, 0, 1, 10, 2)); assert.ok(!inLine(0, 11, 0, 0, 0, 1, 10, 2));
  assert.ok(inCone(5, 1, 0, 0, 1, 0, 6, 60)); assert.ok(!inCone(1, 5, 0, 0, 1, 0, 6, 60)); assert.ok(!inCone(7, 0, 0, 0, 1, 0, 6, 60));
  const d = fanDirs(1, 0, 5, 60);
  assert.equal(d.length, 5); assert.ok(Math.abs(d[2][0] - 1) < 1e-9 && Math.abs(d[0][1] + d[4][1]) < 1e-9, 'まんなか まっすぐ・りょうがわ おなじ');
  assert.equal(circleSpots({ n: 3, at: 'player' }, 0, 0, 10, 10).length, 3);
  assert.deepEqual(circleSpots({ n: 1, at: 'self' }, 2, 3, 10, 10), [[2, 3]]);
  for (const [x, z] of circleSpots({ n: 4, at: 'around', spread: 3 }, 0, 0, 10, 10)) assert.ok(Math.hypot(x - 10, z - 10) < 5);
  assert.ok(actTime({ kind: 'line', dash: true, len: 12, speed: 12 }) > 0.9);
});

test('v0.17.0 ボスの みため: とうろく できる・ファイルは あとから よむ', async () => {
  const fs = await import('node:fs'), path = await import('node:path'), url = await import('node:url');
  const root = path.dirname(path.dirname(url.fileURLToPath(import.meta.url)));
  const md = fs.readFileSync(path.join(root, 'js/models.js'), 'utf8');
  assert.ok(md.includes('export function registerLook') && md.includes('LOOK_PARTS[look]'));
  const sw = fs.readFileSync(path.join(root, 'sw-assets.js'), 'utf8');
  assert.ok(!sw.includes('js/gk/bosses/') && !sw.includes('js/gk/gim/'), 'ボス・ギミックは あとから');
  for (const id of GK_BOSS_AI) {
    const f = path.join(root, 'js/gk/bosses', id + '.js');
    assert.ok(fs.statSync(f).size < 6200, id + ' ちいさい');
    assert.ok(!/[⛑🏥🚑✚✙✛✜➕✝☩]|\p{Regional_Indicator}/u.test(fs.readFileSync(f, 'utf8')), id);
  }
});

// ================= v0.17.0: ステージ18 でてくる ドア・ステージ17 よあけ・ステージ15 さいごの ボスと ガス =================
import { DOORS, doorFront, doorsBusy, doorPick, DAWN, dawnTod, dawnNeed, gkProgress, VENT, ventPhase } from '../js/gk/core.js';

test('v0.17.0 ステージ18: でてくる ドアは へやの なか・かべに めんする・へやごとに 4〜6・スーツの みため', async () => {
  const placed = chainSegs(await segBuildAll(18)), m = joinSegs(placed), gm = m.gk;
  assert.deepEqual(GK_READY[18].gim, ['doors']);
  const inR = (r, x, z) => x > r.b[0] && x < r.b[2] && z > r.b[1] && z < r.b[3];
  const hit = (x, z, rad) => m.boxes.some((b) => b.collide && !b.barrier && b.maxY > 0.5 && x + rad > b.minX && x - rad < b.maxX && z + rad > b.minZ && z - rad < b.maxZ);
  const per = {};
  for (const d of gm.spawnDoors) {
    const r = gm.rooms[d.room], f = doorFront(d, 1.2), back = doorFront(d, -0.7);
    per[d.room] = (per[d.room] || 0) + 1;
    assert.ok(inR(r, f.x, f.z) && !hit(f.x, f.z, 0.4), `ドアの まえは へやの なかで あいている (${d.x},${d.z})`);
    assert.ok(!inR(r, back.x, back.z) || hit(back.x, back.z, 0.1), `ドアの うしろは かべ (${d.x},${d.z})`);
  }
  gm.rooms.forEach((r, i) => assert.ok(per[i] >= 4 && per[i] <= 6, `へや${i} の ドア ${per[i]}`));
  assert.ok(DOORS.warn >= 0.8, 'よこくは 0.8びょう いじょう'); assert.ok(DOORS.maxOpen <= 3, 'いちどに あくのは 3つ まで');
  assert.equal(GK_ENEMY.suit, 'walker@suit'); assert.equal(GK_ENEMY.suitk, 'runner@suit');
  const fs = await import('node:fs'), path = await import('node:path'), url = await import('node:url');
  const md = fs.readFileSync(path.join(path.dirname(path.dirname(url.fileURLToPath(import.meta.url))), 'js/models.js'), 'utf8');
  assert.ok(md.includes('suit:'), 'GK_LOOKS に @suit');
});

test('v0.17.0 でてくる ドア: えらびかた（はなれた ドア・3つ まで・ないと null）', () => {
  const mk = (x, room = 0, st = 'idle') => ({ d: { x, z: 0, yaw: Math.PI, room }, st });
  const list = [mk(1), mk(10), mk(20), mk(30), mk(40, 1)];
  for (let i = 0; i < 10; i++) { const o = doorPick(list, 0, 0, 0, () => i / 10); assert.ok(o && o.d.room === 0 && o.d.x >= 10, 'ちかすぎない ドア'); }
  list[1].st = list[2].st = list[3].st = 'warn';
  assert.equal(doorsBusy(list), 3); assert.equal(doorPick(list, 0, 0, 0), null, '3つ あいて いたら まつ');
  list[3].st = 'idle'; assert.equal(doorPick(list, 0, 0, 0, () => 0).d.x, 30);
  assert.equal(doorPick([mk(1, 1)], 0, 0, 0), null, 'ほかの へやの ドアは つかわない');
  const f = doorFront({ x: 0, z: 0, yaw: Math.PI }, 1.2); assert.ok(Math.abs(f.z - 1.2) < 1e-9 && Math.abs(f.x) < 1e-9, 'yaw の まえ');
});

test('v0.17.0 ステージ17 よあけ: t=0 よる・t=1 あさ・だんだん あかるく・0.25びょう ごと 1% いじょう', async () => {
  const look = (t) => { const { a, b, k } = dawnTod(t); return blendTod(TOD[a], TOD[b], k); };
  assert.deepEqual(look(0), blendTod(TOD.night, TOD.sunset, 0)); assert.equal(look(0).night, TOD.night.night);
  assert.equal(look(1).night, TOD.day.night); assert.equal(look(1).sunI, TOD.day.sunI);
  let prev = look(0);
  for (let t = 0.05; t <= 1.0001; t += 0.05) {
    const p = look(t);
    assert.ok(p.night <= prev.night + 1e-9 && p.sunI >= prev.sunI - 1e-9, 'よるが へって ひが つよく ' + t.toFixed(2));
    for (const c of [p.fog, p.hemiSky, p.sun, ...p.sky]) assert.ok(c >= 0 && c <= 0xffffff && Number.isInteger(c), 'いろ');
    prev = p;
  }
  assert.equal(DAWN.every, 0.25); assert.ok(dawnNeed(null, 0)); assert.ok(!dawnNeed(0.5, 0.505)); assert.ok(dawnNeed(0.5, 0.511));
  // すすみぐあい: ドアを とおる たびに ふえる・さいごの へやの まんなかで 1
  const placed = chainSegs(await segBuildAll(17)), m = joinSegs(placed), gm = m.gk, n = gm.rooms.length;
  assert.equal(gkProgress(gm, m.playerStart.x, m.playerStart.z, m.playerStart, n), 0);
  let last = -1;
  gm.doors.forEach((d, g) => { const p = gkProgress(gm, ...[d.axis === 'x' ? [d.x, d.z + (gm.rooms[g + 1].b[1] + gm.rooms[g + 1].b[3] > 2 * d.z ? 1 : -1)] : [d.x + (gm.rooms[g + 1].b[0] + gm.rooms[g + 1].b[2] > 2 * d.x ? 1 : -1), d.z]].flat(), m.playerStart, n); assert.ok(p > last, 'ドア' + g); last = p; });
  const rl = gm.rooms[n - 1]; assert.equal(gkProgress(gm, (rl.b[0] + rl.b[2]) / 2, (rl.b[1] + rl.b[3]) / 2, m.playerStart, n), 1);
  assert.deepEqual(GK_READY[17].gim, ['dawn']); assert.equal(GK_READY[17].tod, 'night');
});

test('v0.17.0 ステージ15: 5へや・ガスの あな・さいごの ボスの 2だんかい', async () => {
  const st = await gkLoadStage(15), placed = chainSegs(await segBuildAll(15)), m = joinSegs(placed), gm = m.gk;
  assert.equal(gm.rooms.length, 5); assert.equal(st.boss.id, 'final'); assert.equal(st.boss.hp, 3000);
  assert.deepEqual(GK_READY[15].gim, ['vents']); assert.ok(isGkReady(15));
  assert.ok(gm.vents.length >= 4);
  for (const v of gm.vents) assert.equal(gkRoomAt(gm.rooms, v.x, v.z), v.room, 'ガスの あなは その へやの なか');
  assert.ok(gm.vents.some((v) => v.room === 4), 'ボスの へやにも');
  // ガス: まつ → ひかる（よこく 0.8びょう いじょう）→ ふきだす → まつ
  assert.ok(VENT.warn >= 0.8 && VENT.dps <= 10);
  const seq = []; let prev = null;
  for (let t = 0; t < VENT.period * 2; t += 0.05) { const ph = ventPhase(t); if (ph !== prev) seq.push(ph); prev = ph; }
  assert.deepEqual(seq.slice(0, 4), ['idle', 'warn', 'puff', 'idle']);
  assert.notEqual(ventPhase(1, 0), ventPhase(1, 3.5), 'あなごとに ずれる');
  // ボス: HP 50% で 2だんかい（わざが かわる・てきを よぶのは 4たい まで・わは ジャンプで よける）
  const B = await loadBossDef('final');
  assert.deepEqual(checkBoss(B), []);
  assert.equal(bossPhase(B, 1), 0); assert.equal(bossPhase(B, 0.51), 0); assert.equal(bossPhase(B, 0.5), 1); assert.equal(bossPhase(B, 0.1), 1);
  assert.notDeepEqual(phaseMoves(B, 0).map((x) => x.id), phaseMoves(B, 1).map((x) => x.id));
  const sm = phaseMoves(B, 1).find((x) => x.kind === 'summon'); assert.ok(sm && sm.cap <= 4);
  assert.ok(phaseMoves(B, 1).some((x) => x.kind === 'wave'), 'ジャンプの わ');
  assert.ok(B.phases[1].color !== B.phases[0].color && B.phases[1].bar !== B.phases[0].bar, 'いろが かわる');
  const st2 = brainNew(B); st2.ph = 1; for (let i = 0; i < 400; i++) brainCool(st2, 0.05);
  const mv = pickMove(B, st2, 8, () => 0); assert.ok(phaseMoves(B, 1).includes(mv), '2だんかいの わざを えらぶ');
  // チェックポイントは ボスの へやの まえの ドア
  assert.ok(gm.doors[3], 'ボスの へやの まえの ドア');
});

test('v0.17.0 まよった ゾンビを よぶ: えらびかた・ばしょ・ゲームに つながっている', async () => {
  const R = await import('../js/rules.js');
  const { rescueSample, rescuePick, rescueSpot, RESCUE } = R; const fs = await import('node:fs');
  assert.ok(RESCUE.idle >= 15 && RESCUE.idle <= 30 && RESCUE.minD >= 3 && RESCUE.maxD <= 10);
  // うごかない＆はなれている → noProg が ふえる・うごいたら 0
  const z = { x: 10, z: 0, alive: true, kind: 'walker' };
  rescueSample(z, 0, 0, false); // はじめは うごいた ことに
  assert.equal(z.noProg, 0);
  for (let i = 0; i < RESCUE.stuck; i++) rescueSample(z, 0, 0, false);
  assert.equal(z.noProg, RESCUE.stuck);
  z.x = 9; rescueSample(z, 0, 0, false); assert.equal(z.noProg, 0, 'うごいたら リセット');
  // ちかくで こうげき している ゾンビは まよって いない
  const near = { x: 2, z: 0, alive: true, kind: 'walker' }; for (let i = 0; i < 20; i++) rescueSample(near, 0, 0, false); assert.equal(near.noProg, 0);
  // いけない ところ（lost）は はやく ふえる
  const lost = { x: 30, z: 0, alive: true, kind: 'walker' }; for (let i = 0; i < 5; i++) rescueSample(lost, 0, 0, true); assert.ok(lost.noProg >= RESCUE.stuck);
  // えらびかた
  const a = { alive: true, kind: 'walker', noProg: RESCUE.stuck }, b = { alive: true, kind: 'walker', noProg: 0 }, d = { alive: false, kind: 'walker', noProg: 99 };
  assert.deepEqual(rescuePick([a, b, d], 0, 0), [a], 'まよった ゾンビだけ・しんだのは よばない');
  assert.deepEqual(rescuePick([a, b], RESCUE.idle, 0), [a, b], '20びょう たおせない＆のこり すくない → ぜんぶ よぶ');
  assert.deepEqual(rescuePick([b], RESCUE.idle, 3), [], 'まだ キューが ある ときは idle で よばない');
  const many = Array.from({ length: RESCUE.few + 1 }, () => ({ alive: true, kind: 'walker', noProg: 0 }));
  assert.deepEqual(rescuePick(many, RESCUE.idle, 0), [], 'のこりが おおい ときは idle で よばない');
  const boss = { alive: true, kind: 'boss', noProg: 99, lostN: 0 };
  assert.deepEqual(rescuePick([boss], 99, 0), [], 'ボスは ふつうは よばない');
  boss.lostN = RESCUE.stuck / 2; assert.deepEqual(rescuePick([boss], 0, 0), [boss], 'いけない ところの ボスは よぶ');
  boss.y = 6; assert.deepEqual(rescuePick([boss], 0, 0), [], 'とんでいる ボスは よばない');
  // ばしょ: minD〜maxD・かべ（ok=false）を さける・たかさが ちがう ところは だめ
  const cells = []; for (let x = -12; x <= 12; x++) for (let zz = -12; zz <= 12; zz++) cells.push([x, zz, 0]);
  const s = rescueSpot(cells, 0, 0, 0, () => true);
  const ds = Math.hypot(s.x, s.z); assert.ok(ds >= RESCUE.minD && ds <= RESCUE.maxD, 'ちかすぎず とおすぎない ' + ds);
  const s2 = rescueSpot(cells, 0, 0, 0, (x) => x < 0); assert.ok(s2.x < 0, 'かべの なかは さける');
  assert.equal(rescueSpot(cells, 0, 0, 0, () => false), null);
  assert.equal(rescueSpot(cells.map((c) => [c[0], c[1], 5]), 0, 0, 0, () => true), null, 'ちがう かいは だめ');
  const sb = rescueSpot(cells, 0, 0, 0, () => true, true); assert.ok(Math.hypot(sb.x, sb.z) >= RESCUE.minD + 2, 'ボスは すこし とおく');
  // ゲームに つながっている: updateWaves の さいしょで rescueTick・ガンキックは へやの なか（gkSpotFilter）だけ
  const src = fs.readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  assert.match(src, /updateWaves\(dt\) \{\s+this\.rescueTick\(dt\);\s+if \(this\.gk\)/);
  const body = src.slice(src.indexOf('  rescueTick(dt) {'), src.indexOf('  updateWaves(dt) {'));
  assert.match(body, /gkSpotFilter\(cells\)/);
  assert.match(body, /openCells\(\)/);
  assert.match(body, /collideCircle\(/);
  assert.match(body, /phase !== 'fight'/);
});

test('v0.18.0 ロボットのセリフ: けいさつロボとアーミーロボのセリフと状況選択', () => {
  // セリフ辞書の網羅性
  assert.ok(POLICE_LINES.join.length >= 2);
  assert.ok(POLICE_LINES.kill.length >= 3);
  assert.ok(POLICE_LINES.bossWave.length >= 1);
  assert.ok(ARMY_LINES.join.length >= 2);
  assert.ok(ARMY_LINES.pierce.length >= 2);
  assert.ok(ARMY_LINES.partnerDown.length >= 1);

  // 単独 join vs 相方あり join
  const pJoinAlone = pickBotLine('police', 'join', { hasPartner: false }, () => 0);
  assert.ok(POLICE_LINES.join.includes(pJoinAlone));
  const pJoinPartner = pickBotLine('police', 'join', { hasPartner: true }, () => 0);
  assert.ok(POLICE_LINES.joinPartner.includes(pJoinPartner));

  // アーミーロボの貫通セリフ
  const aPierce = pickBotLine('army', 'kill', { pierce: true }, () => 0);
  assert.ok(ARMY_LINES.pierce.includes(aPierce));

  // ボスウェーブセリフ
  const pBoss = pickBotLine('police', 'waveStart', { isBoss: true }, () => 0);
  assert.ok(POLICE_LINES.bossWave.includes(pBoss));
  const aBoss = pickBotLine('army', 'waveStart', { isBoss: true }, () => 0);
  assert.ok(ARMY_LINES.bossWave.includes(aBoss));

  // 夜ウェーブセリフ
  const pNight = pickBotLine('police', 'waveStart', { isNight: true }, () => 0);
  assert.ok(POLICE_LINES.waveStartNight.includes(pNight));
  const aNight = pickBotLine('army', 'waveStart', { isNight: true }, () => 0);
  assert.ok(ARMY_LINES.waveStartNight.includes(aNight));

  // フォーマット（名前「セリフ」）
  assert.equal(formatBotLine('police', 'たいほ！'), 'けいさつロボ「たいほ！」');
  assert.equal(formatBotLine('army', 'クリア。'), 'アーミーロボ「クリア。」');
});

test('v0.18.1 全モジュールの構文チェック (node -c による網羅検証)', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { execFileSync } = await import('node:child_process');
  const { fileURLToPath } = await import('node:url');
  const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../js');

  function walk(dir) {
    const list = [];
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) list.push(...walk(full));
      else if (ent.name.endsWith('.js') && !ent.name.includes('three.module.min')) list.push(full);
    }
    return list;
  }

  const jsFiles = walk(base);
  assert.ok(jsFiles.length >= 40);
  for (const f of jsFiles) {
    assert.doesNotThrow(() => {
      execFileSync(process.execPath, ['-c', f], { stdio: 'pipe' });
    }, `構文エラー検出: ${f}`);
  }
});


test('moving stages: route height, start and train aisle', async () => {
  const { RIDE, ridePoint } = await import('../js/ride.js');
  for (const id of ['minecart','roadride','airride']) {
    const map = buildMap(id); assert.equal(map.ride,id); assert.ok(RIDE[id].speed > 0);
    const a = ridePoint(id, 0), b = ridePoint(id, Math.PI / 2);
    assert.equal(a.x,map.playerStart.x); assert.equal(a.z,map.playerStart.z);
    assert.ok(Math.hypot(a.x-b.x,a.z-b.z) > 15);
    for (let i=0;i<64;i++) {
      const p=ridePoint(id,i*Math.PI/32); assert.ok(Math.abs(p.x)<map.half-2 && Math.abs(p.z)<map.half-2);
      const c=collideCircle(p.x,p.z,0.5,0,zombieColliders(map)); assert.ok(Math.hypot(c.x-p.x,c.z-p.z)<0.01, `${id} route blocked`);
    }
  }
  assert.notEqual(ridePoint('minecart',0).y,ridePoint('minecart',Math.PI/4).y);
  assert.ok(ridePoint('airride',0).y > 3);
  const train=buildMap('trainride'); assert.equal(train.specialStage,'trainride');
  for (let z=-34;z<=34;z+=2) { const c=collideCircle(0,z,0.35,0,playerColliders(train)); assert.ok(Math.abs(c.x)<0.01 && Math.abs(c.z-z)<0.01, `train aisle ${z}`); }
});


test('アオとモモ: それぞれ 低確率で 登場し、元の武器と色を持つ', async () => {
  const { GUESTS, GUEST_CHANCE, guestAppears } = await import('../js/guests.js');
  assert.equal(GUEST_CHANCE, 0.08); assert.equal(guestAppears(0),true);
  assert.equal(guestAppears(0.079999),true); assert.equal(guestAppears(0.08),false); assert.equal(guestAppears(1),false);
  assert.equal(GUESTS.ao.name,'アオ'); assert.equal(GUESTS.momo.name,'モモ');
  assert.equal(GUESTS.ao.color,0x6fa8e8); assert.equal(GUESTS.momo.color,0xe88cb4);
  assert.ok(GUESTS.momo.fireRate < GUESTS.ao.fireRate);
  assert.ok(GUESTS.ao.side * GUESTS.momo.side < 0);
});


test('ヘリの よびだんは ぜんぶ むげん、リロードは ひつよう', () => {
  for (const id of WEAPON_ORDER) {
    const normal = createGun(id), g = createGun(id, 1, { unlimitedReserve: true });
    assert.equal(g.reserve, Infinity, id);
    assert.equal(normal.reserve, WEAPONS[id].reserve, `${id} normal reserve`);
    if (WEAPONS[id].gauge) continue;
    for (let i = 0; i < 3; i++) {
      g.ammo = 0; assert.equal(startReload(g), true, id);
      updateGun(g, g.w.reload + 0.01);
      assert.equal(g.ammo, g.w.mag, id); assert.equal(g.reserve, Infinity, id);
    }
    if (id === 'rocket' || id === 'smoke') assert.equal(crateReward([id], { [id]: g }).kind, 'score');
  }
});


test('せんしゃ: 通り道に いる敵だけ ひく・パワーアップは独立抽選', async () => {
  const { TANK, SUIT, powerupAppears, tankRamHit } = await import('../js/rules.js');
  assert.equal(SUIT.chance,0.7); assert.ok(powerupAppears(0.69)); assert.equal(powerupAppears(0.7),false);
  assert.equal(tankRamHit(0,0,0,-5,0,-2),true);
  assert.equal(tankRamHit(0,0,0,-5,TANK.ramRadius+0.1,-2),false);
  assert.equal(tankRamHit(0,0,0,-5,0,-7),false);
  assert.ok(TANK.weapons.mg.interval < TANK.weapons.cannon.interval);
});


test('パワーアップ: 独立抽選と3ウェーブ後の再抽選', async () => {
  const { SuitMixin } = await import('../js/suit.js');
  const { TankMixin } = await import('../js/tank.js');
  const g = { map: {}, wave: 4, suit: null, suitPick: null, tank: null, tankPick: null,
    placeSuit() { this.suitPick = { x: 1, z: 0 }; return this.suitPick; },
    placeTank() { this.tankPick = { x: 9, z: 0 }; return this.tankPick; } };
  assert.equal(SuitMixin.trySpawnSuit.call(g,0.1),true);
  assert.equal(TankMixin.trySpawnTank.call(g,0.1),true);
  assert.ok(g.suitPick && g.tankPick, '同時出現');
  g.suitPick=null; g.tankPick=null;
  assert.equal(SuitMixin.trySpawnSuit.call(g,0.9),false);
  assert.equal(TankMixin.trySpawnTank.call(g,0.9),false);
  assert.equal(g.suitNext,7); assert.equal(g.tankNext,7);
  g.map.ride='airride'; assert.equal(TankMixin.trySpawnTank.call(g,0),false);
});

test('せんしゃ: 移動中だけ当たり、同じ敵への連続接触を制限', async () => {
  const { TankMixin } = await import('../js/tank.js');
  const z={x:0,z:-2,y:0,scale:1,alive:true,kind:'walker'}, ally={x:0,z:-2,y:0};
  let hits=0;const g={tank:{},pos:{x:0,y:0,z:-4},zombies:[z],allyList:()=>[ally],
    hitZombie() { hits++; return false; }, punchFly() { return false; }, fx:{burst(){}},sfx:{hit(){}}};
  TankMixin.tankRam.call(g,0,0,1); assert.equal(hits,1); assert.ok(z.tankHitT>0);
  TankMixin.tankRam.call(g,0,0,1); assert.equal(hits,1);
  z.tankHitT=0; TankMixin.tankRam.call(g,0,-4,1); assert.equal(hits,1, '停止中は当たらない');
});


test('せんしゃ: ざこは 飛び、ドロップ位置は 衝突地点、ボスは 飛ばない', async () => {
  const { TankMixin } = await import('../js/tank.js');
  const dead={x:0,z:-1,y:0,scale:1,alive:true,kind:'walker',hp:10},
    live={x:0,z:-2,y:0,scale:1,alive:true,kind:'brute',hp:1000},
    boss={x:0,z:-3,y:0,scale:1,alive:true,kind:'boss',hp:1000,kvx:0,kvz:0,stagger:0};
  const hits=[];const g={tank:{},pos:{x:0,y:0,z:-4},zombies:[dead,live,boss],
    hitZombie(z,dmg,head,p,dir,opt){hits.push({kind:z.kind,opt}); if(z===dead)z.alive=false;},
    punchFly(z,v){z.fly={...v};return true;},fx:{burst(){}},sfx:{hit(){}}};
  TankMixin.tankRam.call(g,0,0,1);
  assert.ok(hits.find(h=>h.kind==='walker').opt.punch);
  assert.deepEqual(hits.find(h=>h.kind==='walker').opt.dropAt,{x:0,y:0,z:-1});
  assert.ok(live.fly.tankLive); assert.deepEqual(live.ramDropAt,{x:0,y:0,z:-2});
  assert.equal(hits.find(h=>h.kind==='boss').opt.punch,undefined); assert.equal(boss.fly,undefined);
});

test('せんしゃ: 生き残った敵は飛んだあと到達可能な場所に戻る', async () => {
  const THREE = await import('../vendor/three.module.min.js'); const { TankMixin } = await import('../js/tank.js');
  const m={inner:new THREE.Group(),root:new THREE.Group(),legs:[new THREE.Group(),new THREE.Group()],arms:[new THREE.Group(),new THREE.Group()]};
  const z={x:0,y:0,z:0,yaw:0,model:m,ramDropAt:{x:0,y:0,z:0},fly:{vx:28,vy:34,vz:0,t:0,sx:1,sy:1,sz:1,tankLive:true},alive:true};
  const g={half:42,map:{},nav:{openCells:()=>[[1,2,0],[30,1,0]]},zCol:[]};
  TankMixin.updateTankLiveFly.call(g,z,0.5); assert.ok(z.fly && z.x>10 && z.alive);
  TankMixin.updateTankLiveFly.call(g,z,1); assert.equal(z.fly,null); assert.equal(z.alive,true); assert.deepEqual([z.x,z.z],[30,1]);
  assert.equal(z.ramDropAt,null); assert.ok(z.y<=5);
});


test('着弾音: 連射時の音を制限し、ミュートを守る', async () => {
  const { Sfx } = await import('../js/sfx.js'); const s=new Sfx(), calls=[];
  s.ctx={currentTime:0}; s._tone=(...a)=>calls.push(['tone',...a]); s._noise=(...a)=>calls.push(['noise',...a]);
  s.bulletHit(false); assert.equal(calls.length,2);
  s.ctx.currentTime=0.03; s.bulletHit(false); assert.equal(calls.length,2);
  s.ctx.currentTime=0.07; s.bulletHit(true); assert.equal(calls.length,5);
  s.bulletSurface(); assert.equal(calls.length,7); s.ctx.currentTime=0.1; s.bulletSurface(); assert.equal(calls.length,7);
  s.muted=true; s.ctx.currentTime=1; s.bulletHit(true); s.bulletSurface(); assert.equal(calls.length,7);
});


test('ロケット: 爆発半径1.5倍、基礎威力は維持', () => {
  const w=WEAPONS.rocket; assert.equal(w.blast,4.5*1.5); assert.equal(w.dmg,260);
  assert.equal(blastDamage(w,0),260); assert.equal(blastDamage(w,w.blast),0);
  for (const d of [0,1.5,2.5,4,4.49]) assert.equal(blastDamage(w,d),Math.round(260*blastFalloff(d,4.5)), `従来範囲の威力 ${d}`);
  assert.ok(blastDamage(w,5)>0, '以前の範囲外にも当たる');
  assert.ok(blastDamage(w,5)>blastDamage(w,6), '広がった外側は距離で弱まる');
  assert.equal(WEAPONS.mlauncher.blast,3.2); assert.equal(WEAPONS.mlauncher.dmg,95);
});


test('ハンドガン近距離補助: 近くの見える敵を方向に関係なく選び、壁を越えない', async () => {
  const { handgunAutoAim, HANDGUN_ASSIST_RANGE, castShot } = await import('../js/rules.js');
  const z=(x,z,y=0,extra={})=>({x,y,z,kind:'walker',alive:true,scale:1,...extra});
  const near=z(0,3), far=z(0,-6), dead=z(0,1,0,{alive:false}), demo=z(0,2,0,{demo:true});
  let a=handgunAutoAim(0,0,0,[far,near,dead,demo],[]);
  assert.equal(HANDGUN_ASSIST_RANGE,7); assert.equal(a.index,1, '後方でも近い敵');
  const hit=castShot(0,1.05,0,a.dx,a.dy,a.dz,[far,near,dead],[],7);
  assert.equal(hit.kind,'zombie'); assert.equal(hit.index,1); assert.equal(hit.head,false);
  const wall={minX:-1,maxX:1,minY:0,maxY:3,minZ:1,maxZ:2};
  a=handgunAutoAim(0,0,0,[far,near],[wall]); assert.equal(a.index,0, '壁越しを避け別の敵');
  assert.equal(handgunAutoAim(0,0,0,[near],[wall]),null);
  assert.equal(handgunAutoAim(0,0,0,[z(0,8)],[]),null);
  assert.equal(handgunAutoAim(0,0,0,[z(0,1,8)],[]),null, '離れた階は対象外');
  a=handgunAutoAim(0,0,0,[z(0,4,0,{kind:'crawler'})],[]);
  assert.ok(a); assert.equal(castShot(0,1.05,0,a.dx,a.dy,a.dz,[z(0,4,0,{kind:'crawler'})],[],7).kind,'zombie');
});

test('ショットガンは近距離で高い一撃を持ち、距離で威力が減る', () => {
  const w = WEAPONS.shotgun;
  assert.equal(damageAt(w, 5, false) * w.pellets, 144);
  assert.ok(damageAt(w, 5, false) * w.pellets * 2 >= ZOMBIES.brute.hp);
  assert.ok(damageAt(w, 20, false) < damageAt(w, 5, false));
  assert.equal(w.knock, 1.1);
});


test('スナイパーはスコープ中のヘッドショットのみ10倍', () => {
  const w = WEAPONS.sniper;
  assert.equal(damageAt(w, 20, true, true), 1100);
  assert.equal(damageAt(w, 20, true, false), 275);
  assert.equal(damageAt(w, 20, false, true), 110);
  assert.equal(damageAt(WEAPONS.rifle, 20, true, true), 60);
  assert.equal(damageAt(w, 150, true, true), 935);
  const upgraded = upgradedWeapon('sniper', 3);
  assert.equal(damageAt(upgraded, 20, true, true), upgraded.dmg * 10);
  assert.equal(R8.isScoped('sniper', R8.SCOPE.on - 0.01), false);
  assert.equal(R8.isScoped('sniper', R8.SCOPE.on), true);
});


test('よろいゾンビは頭が弱点で、後半に少数出現する', () => {
  assert.equal(damageMul('armored', { head: true }), 1);
  assert.equal(damageMul('armored', {}), 0.25);
  assert.equal(damageMul('armored', { blast: true }), 0.5);
  assert.equal(waveSpec(7).specials.armored, undefined);
  assert.ok(waveSpec(8).specials.armored >= 1);
  for (let n = 8; n <= 100; n++) {
    const w = waveSpec(n);
    assert.ok((w.specials.armored || 0) <= 2);
    assert.equal(waveQueue(w, () => 0.3).length, w.total);
  }
  assert.ok(damageAt(WEAPONS.sniper, 20, true, true) >= ZOMBIES.armored.hp);
});


test('増援は序盤を維持し、同時48体・総数180体に収まり、重い端末は従来の上限へ戻す', () => {
  for (let n = 1; n <= 4; n++) assert.equal(waveSpec(n).total - waveSpec(n).boss, 10 + (n - 1) * 7);
  assert.equal(waveSpec(5).total, 41);
  assert.equal(waveSpec(12).maxAlive, 48);
  for (let n = 1; n <= 100; n++) {
    const s = waveSpec(n);
    assert.ok(s.total - s.boss <= 180 && s.maxAlive <= 48);
    assert.equal(waveQueue(s, () => 0.3).length, s.total);
  }
  const g = new QualityGovernor();
  assert.equal(g.capFor(48), 48);
  g.level = 4; assert.equal(g.capFor(48), 32);
  g.level = 5; assert.equal(g.capFor(48), 26);
});


import { collectGear, gearRefund as pickupRefund } from '../js/rules.js';
test('装備取得: 弱い物はすぐスコア化し、強い物は設定に従い、装備中の物を守る', () => {
  const worn = G('head', 'r', { def: 8 }, 'worn');
  const make = (autoEquip = true) => ({ autoEquip, bank: 0, gear: { inv: [worn], eq: { head: worn.id, body: null, feet: null, arm: null } } });
  const weak = G('head', 'n', { def: 2 }, 'weak');
  for (const auto of [true, false]) {
    const save = make(auto), r = collectGear(save, weak);
    assert.equal(r.action, 'recycled'); assert.equal(save.bank, pickupRefund(weak));
    assert.deepEqual(save.gear.inv, [worn]); assert.equal(save.gear.eq.head, worn.id);
  }
  const strong = G('head', 'sr', { def: 12 }, 'strong');
  const on = make(), r = collectGear(on, strong);
  assert.equal(r.action, 'equipped'); assert.equal(on.gear.eq.head, strong.id);
  assert.equal(on.bank, pickupRefund(worn)); assert.deepEqual(on.gear.inv, [strong]);
  const off = make(false); assert.equal(collectGear(off, strong).action, 'stored');
  assert.equal(off.gear.eq.head, worn.id); assert.equal(off.gear.inv.length, 2); assert.equal(off.bank, 0);
  const same = G('head', 'r', { def: 8 }, 'same');
  assert.equal(collectGear(off, same).action, 'stored');
  assert.equal(collectGear(off, worn).action, 'owned'); assert.equal(off.bank, 0);
  const full = make(false);
  for (let i = 0; i < INV_CAP - 1; i++) full.gear.inv.push(G('arm', 'n', { rel: i === 0 ? 1 : 5 }, 'loose' + i));
  const discarded = full.gear.inv[1], feet = G('feet', 'r', { spd: 4 }, 'newfeet');
  assert.equal(collectGear(full, feet).action, 'stored');
  assert.equal(full.gear.inv.length, INV_CAP); assert.equal(full.bank, pickupRefund(discarded));
  assert.ok(full.gear.inv.some(g => g.id === worn.id)); assert.ok(full.gear.inv.some(g => g.id === feet.id));
  assert.ok(!full.gear.inv.some(g => g.id === discarded.id));
  const fullOn = make(true);
  for (let i = 0; i < INV_CAP - 1; i++) fullOn.gear.inv.push(G('arm', 'r', { rel: 5 }, 'spare' + i));
  const upgrade = collectGear(fullOn, strong);
  assert.equal(upgrade.action, 'equipped'); assert.equal(fullOn.gear.inv.length, INV_CAP);
  assert.equal(fullOn.bank, pickupRefund(worn)); assert.ok(fullOn.gear.inv.some(g => g.id === 'spare0'));
  const after = full.bank; collectGear(full, weak);
  assert.equal(full.bank - after, pickupRefund(weak)); assert.equal(full.gear.inv.length, INV_CAP);
});
