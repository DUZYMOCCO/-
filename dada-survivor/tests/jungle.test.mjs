import test from 'node:test';
import assert from 'node:assert/strict';
import { art } from '../js/art.js';
import { ENEMY_TYPES, STAGES, normalizeSave, stageUnlocked } from '../js/rules.js';
import { SONGS, songEvents, PopBGM } from '../js/bgm.js';

const svgOf = url => decodeURIComponent(url.slice(url.indexOf(',') + 1, -2));
const kana = /^[\u3041-\u309f\u30a0-\u30ff ]+$/;
const jungle = STAGES.find(s => s.ground === 'jungle');

test('ジャングル は まおうじょうの あとの ステージ6（ステージ5 クリアで ひらく）', () => {
  assert.equal(STAGES.length, 6);
  assert.deepEqual(STAGES.map(s => s.id), [1, 2, 3, 4, 5, 6]);
  assert.equal(jungle.id, 6);
  assert.equal(jungle.name, 'ジャングル');
  assert.match(jungle.name, kana);
  assert.equal(stageUnlocked(normalizeSave({ stageClears: { 1: 1, 2: 1, 3: 1, 4: 1 } }), 6), false);
  assert.equal(stageUnlocked(normalizeSave({ stageClears: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 2 } }), 6), true);
});

test('5ステージ じだいの セーブは そのまま（クリアも えらんだ ステージも きえない）', () => {
  const old = { coins: 120, character: 'bear', stage: 5, difficulty: 'hard', stageClears: { 1: 3, 2: 2, 3: 1, 4: 1, 5: 1 } };
  const s = normalizeSave(JSON.parse(JSON.stringify(old)));
  assert.deepEqual(s.stageClears, old.stageClears);
  assert.equal(s.stage, 5);
  assert.equal(s.coins, 120);
  assert.equal(normalizeSave({ ...old, stage: 6 }).stage, 6);
  // まだ ひらいて いない ステージ6 を えらんだ セーブは 1 に もどる
  assert.equal(normalizeSave({ stage: 6, stageClears: { 1: 1 } }).stage, 1);
});

test('ジャングルの てき・ボスは わるものぐんだん（ワッペン つき）で え が ある', () => {
  const types = [...jungle.enemies.map(e => e[0]), jungle.mini.type, jungle.boss.type];
  for (const t of types) {
    assert.ok(ENEMY_TYPES[t], t);
    assert.ok(svgOf(art(t)).includes('data-emblem="warumono"'), `${t} ワッペン`);
    assert.ok(art(t, true), `${t} ひかる え`);
  }
  assert.equal(jungle.enemies[0][0], 'jungler');
  assert.equal(ENEMY_TYPES.walker.name, 'ジャングルたいちょう');
  assert.match(jungle.mini.name, kana);
  assert.ok(jungle.boss.hp > STAGES[4].boss.hp, 'さいごの ボスより すこし つよい');
  assert.ok(jungle.hpMul >= STAGES[4].hpMul);
  assert.ok(svgOf(art('ground-jungle')).length > 500);
});

test('ジャングルの BGM：C の ドレミで ポコポコ たいこ、ボスの あとは ジャングルに もどる', () => {
  assert.equal(jungle.bgm, 'jungle');
  const ev = songEvents(SONGS.jungle, 0);
  assert.ok(ev.filter(e => e.kind === 'snare' && e.soft).length >= 5);
  const b = new PopBGM({});
  b.wanted = true; b.bus = {}; // ながれている ふり（タイマーを うごかさない）
  b.start('jungle'); assert.equal(b.mode, 'jungle');
  b.setBoss(true); assert.equal(b.mode, 'boss');
  b.setBoss(false); assert.equal(b.mode, 'jungle');
  b.start(); assert.equal(b.mode, 'main');
  b.start('nope'); assert.equal(b.mode, 'main');
});
