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
  for (let cx = -15; cx < 15; cx++) for (let cy = -15; cy < 15; cy++) for (const d of cityCell(cx, cy, 5)) { n++; assert.ok(d.kind === 'car' || d.kind === 'ruin'); assert.ok(!d.id, 'こわせない'); }
  assert.ok(n > 200 && n < 450, String(n));
  assert.ok(new DecorField(5, 'city').visible(-800, -800, 800, 800).every(d => d.kind === 'car' || d.kind === 'ruin'));
  assert.equal(city.bgm, 'city');
  assert.ok(SONGS.city.bpm >= 128 && SONGS.city.bpm <= 140);
  assert.ok(songEvents(SONGS.city, 0).some(e => e.kind === 'arp'));
});
