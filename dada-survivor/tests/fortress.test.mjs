// v1.19.0 ステージ8 わるものの ようさい
import test from 'node:test';
import assert from 'node:assert/strict';
import { ENEMY_TYPES, STAGES, FORTRESS, normalizeSave, stageUnlocked, floorName, bossType, DIFFICULTIES, missileTargets } from '../js/rules.js';
import { art } from '../js/art.js';

const kana = /^[ぁ-んァ-ンー\s・！]+$/;
const svgOf = u => decodeURIComponent(u.slice(u.indexOf(',') + 1, -2));

test('stage 8 わるものの ようさい: after stage 7, hardest, fortress quest, save compat', () => {
  const s8 = STAGES.find(s => s.id === 8), s7 = STAGES.find(s => s.id === 7);
  assert.match(s8.name, kana); assert.ok(s8.fortress && s8.burning && s8.ground === 'city');
  assert.ok(s8.hpMul > s7.hpMul && s8.dmgMul > s7.dmgMul && s8.boss.hp > s7.boss.hp, 'いちばん むずかしい');
  assert.ok(!stageUnlocked(normalizeSave({ stageClears: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 } }), 8));
  assert.ok(stageUnlocked(normalizeSave({ stageClears: { 7: 1 } }), 8));
  assert.equal(normalizeSave({ stage: 8, stageClears: { 6: 1 } }).stage, 1);
  assert.equal(normalizeSave({ stage: 8, stageClears: { 7: 1 } }).stage, 8);
});

test('fortress rooms: ろうか → ぶきこ(20) → ブラックロボ 20 (waves) → きんこ 100+230 → めいれいしつ', () => {
  assert.equal(FORTRESS.floors, 6);
  assert.deepEqual(FORTRESS.names.map((_, i) => floorName(i + 1, FORTRESS)), ['ろうか', 'ぶきこ', 'きんこの まえ', 'きんこ', 'めいれいしつ', 'きょだいきんこ']);
  for (const n of FORTRESS.names) assert.match(n, kana);
  assert.equal(FORTRESS.foes[1], 20);
  assert.equal(FORTRESS.robo.total, 20); assert.ok(FORTRESS.robo.wave <= 5, 'いちどに でるのは すこし');
  assert.deepEqual(FORTRESS.boxes.map(b => b.coins).sort((a, b) => a - b), [100, 230]);
  assert.equal(ENEMY_TYPES.coinbox.speed, 0); assert.equal(ENEMY_TYPES.coinbox.dmg, 0);
  const boss = bossType(FORTRESS.boss, DIFFICULTIES.normal, STAGES.find(s => s.id === 8));
  const others = STAGES.filter(s => s.id !== 8).map(s => bossType(s.boss, DIFFICULTIES.normal, s).hp);
  assert.ok(boss.hp > Math.max(...others) * 0.9, 'いちばん つよい ボス');
  assert.ok(ENEMY_TYPES.supreme.missiles && ENEMY_TYPES.supreme.size > ENEMY_TYPES.blackrobo.size);
  assert.equal(missileTargets(0, 0, Math.random, FORTRESS.bossMissile).length, FORTRESS.bossMissile.n);
  assert.equal(floorName(4), '4かい'); // まちの ビルは そのまま
});

test('fortress art: building, coin box, supreme boss with villain emblem', () => {
  for (const k of ['fortress', 'coinbox', 'supreme']) {
    const s = svgOf(art(k));
    assert.ok(s.includes('data-emblem="warumono"'), k);
    if (k === 'supreme') assert.ok(art(k, true));
  }
  assert.notEqual(svgOf(art('supreme')), svgOf(art('blackrobo')));
});

test('v1.19.1: fortress door opens at 1:15; boss HP eases a bit for low-level early entry but stays hard', async () => {
  const { fortressBossScale } = await import('../js/rules.js');
  assert.equal(FORTRESS.at, 75);
  assert.equal(fortressBossScale(40), 1);
  assert.equal(fortressBossScale(FORTRESS.boss.levelRef), 1);
  assert.equal(fortressBossScale(1), FORTRESS.boss.minHp);
  assert.ok(FORTRESS.boss.minHp >= 0.7, 'ボスは つよい まま');
});

test('v1.20.0: wider rooms + きょだいきんこ above the command room (rockets only, 20 hits, 1500 coins)', async () => {
  const { WEAPONS } = await import('../js/rules.js');
  assert.ok(FORTRESS.room.halfW >= 500 && FORTRESS.room.bottom - FORTRESS.room.top >= 1000, 'ひろい へや');
  for (const b of FORTRESS.boxes) assert.ok(Math.abs(b.x) < FORTRESS.room.halfW - 60 && b.y > FORTRESS.room.top);
  assert.ok(FORTRESS.stairs.y > FORTRESS.room.top && FORTRESS.boss.at.y > FORTRESS.room.top);
  assert.deepEqual({ hits: FORTRESS.mega.hits, coins: FORTRESS.mega.coins }, { hits: 20, coins: 1500 });
  assert.equal(ENEMY_TYPES.megavault.rocketOnly, true); assert.equal(ENEMY_TYPES.megavault.dmg, 0); assert.equal(ENEMY_TYPES.megavault.speed, 0);
  assert.equal(floorName(6, FORTRESS), 'きょだいきんこ');
  const rockets = Object.entries(WEAPONS).filter(([, w]) => w.fire === 'rocket').map(([id]) => id);
  for (const id of ['bazooka', 'supermissile']) assert.ok(rockets.includes(id), id);
  assert.ok(svgOf(art('megavault')).includes('data-emblem="warumono"'));
});

test('v1.20.1: 90 enemies in the giant vault room, max 15 at once; death after the boss still counts as clear', async () => {
  const { readFileSync } = await import('node:fs');
  assert.equal(FORTRESS.horde.total, 90);
  assert.ok(FORTRESS.horde.cap <= 15 && FORTRESS.horde.batch <= FORTRESS.horde.cap);
  const src = readFileSync(new URL('../js/index.js', import.meta.url), 'utf8');
  assert.ok(src.includes('this.endRun(!!r.won)'), 'クリアの あとに たおれても クリア');
});
