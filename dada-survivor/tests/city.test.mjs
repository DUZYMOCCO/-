import test from 'node:test';
import assert from 'node:assert/strict';
import { art } from '../js/art.js';
import { ENEMY_TYPES, STAGES, TOWER, QUEST, SQUAD, normalizeSave, stageUnlocked, towerSpot, rollHeli, heliDamage, allyDamage, floorName, clampUnder } from '../js/rules.js';
import { cityCell, decorCell, DecorField } from '../js/decor.js';
import { SONGS, songEvents } from '../js/bgm.js';

const svgOf = url => decodeURIComponent(url.slice(url.indexOf(',') + 1, -2));
const kana = /^[\u3041-\u309f\u30a0-\u30ff ]+$/;
const city = STAGES.find(s => s.ground === 'city');

test('こわれた まち は ジャングルの あとの ステージ7（ステージ6 クリアで ひらく）', () => {
  assert.deepEqual(STAGES.map(s => s.id), [1, 2, 3, 4, 5, 6, 7]);
  assert.equal(city.id, 7);
  assert.match(city.name, kana);
  assert.equal(stageUnlocked(normalizeSave({ stageClears: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 } }), 7), false);
  assert.equal(stageUnlocked(normalizeSave({ stageClears: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 } }), 7), true);
  // 6ステージ じだいの セーブは そのまま
  const old = { coins: 9, stage: 6, character: 'dino', stageClears: { 1: 2, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 } };
  const s = normalizeSave(JSON.parse(JSON.stringify(old)));
  assert.deepEqual(s.stageClears, old.stageClears); assert.equal(s.stage, 6); assert.equal(s.character, 'dino');
  assert.equal(normalizeSave({ stage: 7, stageClears: { 1: 1 } }).stage, 1);
  assert.ok(city.hpMul >= STAGES[5].hpMul && city.boss.hp > STAGES[5].boss.hp, 'ジャングルより すこし つよい');
  assert.ok(city.tower && !city.quest && !city.camp);
});

test('まちの てき・ボスは わるものぐんだん（ワッペン）。みかたの ヘリは ワッペン なしで いろも ちがう', () => {
  for (const t of [...city.enemies.map(e => e[0]), city.mini.type, city.boss.type]) {
    assert.ok(ENEMY_TYPES[t], t);
    assert.ok(svgOf(art(t)).includes('data-emblem="warumono"'), `${t} ワッペン`);
    assert.ok(art(t, true), `${t} ひかる え`);
  }
  assert.equal(ENEMY_TYPES.truck.name, 'そうこうトラック');
  assert.equal(ENEMY_TYPES.gunship.name, 'こうげきヘリ');
  const friend = svgOf(art('heliFriend')), fly = svgOf(art('heliFly')), foe = svgOf(art('gunship'));
  for (const s of [friend, fly]) { assert.ok(!s.includes('data-emblem="warumono"')); assert.ok(s.includes('#2563eb') && s.includes('#f8fafc'), 'しろ×あお'); }
  assert.ok(foe.includes('#292524') && foe.includes('#b91c1c') && !foe.includes('#2563eb'), 'てきの ヘリは くろ×あか');
  for (const k of ['ground-city', 'ground-office', 'ground-roof', 'tower', 'towerDoor', 'towerDoorOpen', 'stairsUp', 'helipad', 'roofExit', 'wreckCar', 'ruinPile', 'bwallL', 'bwallT']) assert.ok(svgOf(art(k)).length > 200, k);
});

test('ビル：1〜4かいと おくじょう。4かいに へいたい 3にんと ちりょうたい。なかでは タイマー はんぶん', () => {
  assert.equal(TOWER.floors, 4);
  assert.equal(TOWER.foes.length, TOWER.floors);
  for (let i = 1; i < TOWER.foes.length; i++) assert.ok(TOWER.foes[i] >= TOWER.foes[i - 1], 'うえほど すこし おおい');
  const who = TOWER.cells.flatMap(c => c.who);
  assert.equal(who.filter(w => w === 'soldier').length, SQUAD.soldiers);
  assert.equal(who.filter(w => w === 'medic').length, 1);
  assert.ok(who.includes('researcher'));
  assert.equal(QUEST.underTime, 0.5);
  assert.deepEqual([1, 2, 3, 4, 5].map(f => floorName(f)), ['1かい', '2かい', '3かい', '4かい', 'おくじょう']);
  // かいだん・ろうや・ヘリポート・はしごは へやの なか。はしごは スタートちてんから はなれて いる（すぐ でない）
  const U = TOWER.room, inRoom = o => { const c = clampUnder({ ...o }, 20, U); return c.x === o.x && c.y === o.y; };
  for (const o of [TOWER.stairs, TOWER.pad, TOWER.roofExit, ...TOWER.cells]) assert.ok(inRoom(o), JSON.stringify(o));
  assert.ok(Math.hypot(TOWER.roofExit.x - 0, TOWER.roofExit.y - (U.bottom - 70)) > TOWER.doorR + 60);
  assert.ok(Math.hypot(TOWER.stairs.x, TOWER.stairs.y - (U.bottom - 70)) > 400);
});

test('ビルの ばしょ・ヘリの かくりつ・ヘリの ダメージ', () => {
  let s = 1; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 200; i++) { const p = towerSpot(rnd), d = Math.hypot(p.x, p.y); assert.ok(d >= TOWER.dist0 - 1e-6 && d <= TOWER.dist1 + 1e-6); }
  assert.equal(rollHeli(() => 0.49), true); assert.equal(rollHeli(() => 0.51), false);
  let n = 0; for (let i = 0; i < 2000; i++) if (rollHeli(rnd)) n++;
  assert.ok(n > 850 && n < 1150, `ヘリは だいたい はんぶん ${n}`);
  assert.equal(heliDamage(120, 1.5), allyDamage(120, 1.5) * TOWER.heli.dmgMul);
  assert.ok(TOWER.heli.time > 0 && TOWER.heli.time <= 60, 'ずっとは いない');
});

test('まちの かざり（くるま・がれき）は きまった ばしょ、スタートの マスは なし。BGM は まちばん', () => {
  assert.deepEqual(cityCell(0, 0, 3), []);
  assert.deepEqual(decorCell(4, -2, 7, 'city'), cityCell(4, -2, 7));
  let n = 0;
  for (let cx = -15; cx < 15; cx++) for (let cy = -15; cy < 15; cy++) for (const d of cityCell(cx, cy, 5)) { if (d.kind.startsWith('bldg')) continue; n++; assert.ok(d.kind === 'car' || d.kind === 'ruin'); assert.ok(!d.id, 'こわせない'); }
  assert.ok(n > 100 && n < 450, String(n));
  assert.ok(new DecorField(5, 'city').visible(-600, -600, 600, 600).every(d => d.kind === 'car' || d.kind === 'ruin'), 'スタートの ちかくに ビルは ない');
  assert.equal(city.bgm, 'city');
  assert.ok(SONGS.city.bpm >= 128 && SONGS.city.bpm <= 140);
  assert.ok(songEvents(SONGS.city, 0).some(e => e.kind === 'arp'));
});

test('v1.15.1：こわれた ビルが たくさん（20こ いじょう・5しゅるい）。スタートと はいれる ビルの ちかくには ない', () => {
  const all = [];
  for (const seed of [1, 7, 42]) {
    const b = [];
    for (let cx = -8; cx < 8; cx++) for (let cy = -8; cy < 8; cy++) for (const d of cityCell(cx, cy, seed)) if (d.kind.startsWith('bldg')) b.push(d);
    assert.ok(b.length >= 20, `seed ${seed}: ${b.length}`);
    for (const d of b) assert.ok(Math.hypot(d.x, d.y) > TOWER.dist1 + 100, `${d.x},${d.y}`);
    all.push(...b);
  }
  const kinds = new Set(all.map(d => d.kind));
  assert.equal(kinds.size, 7);
  for (const k of kinds) { assert.ok(svgOf(art(k)).length > 1000, k); assert.notEqual(art(k), art('tower')); }
  assert.equal(new Set([...kinds].map(k => art(k))).size, 7, 'ぜんぶ ちがう え');
  const broken = [...kinds].filter(k => svgOf(art(k)).includes('#1f2937" stroke="#4b5563"'));
  assert.ok(broken.length >= 4, `こわれた（あなの ある）ビルが おおい ${broken.length}`);
});

test('v1.15.1：もえて いる ところ は スタートと はいれる ビルから はなれて ちらばる', async () => {
  const { burnSites, CITY_FIRE } = await import('../js/rules.js');
  let s = 3; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let k = 0; k < 30; k++) {
    const tower = towerSpot(rnd), sites = burnSites(tower, rnd);
    assert.equal(sites.length, CITY_FIRE.sites);
    for (const b of sites) {
      assert.ok(Math.hypot(b.x, b.y) >= CITY_FIRE.dist0 - 1, 'スタートの ちかくは もえない');
      assert.ok(Math.hypot(b.x - tower.x, b.y - tower.y) >= CITY_FIRE.avoidTower, 'ビルの いりぐちは ふさがない');
      assert.equal(b.seen, false);
    }
    for (let i = 0; i < sites.length; i++) for (let j = i + 1; j < sites.length; j++) assert.ok(Math.hypot(sites[i].x - sites[j].x, sites[i].y - sites[j].y) >= 360);
  }
  assert.ok(CITY_FIRE.maxFires >= CITY_FIRE.flames && CITY_FIRE.group <= 9);
  assert.equal(STAGES.find(x => x.id === 7).burning, true);
  assert.ok(!STAGES.filter(x => x.id !== 7).some(x => x.burning));
});
