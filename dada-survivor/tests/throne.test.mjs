// v1.22.0 まおうじょう：かざり・ぎょくざのま・まるのこ・スケルトン
import test from 'node:test';
import assert from 'node:assert/strict';
import { STAGES, THRONE, ENEMY_TYPES, sawPaths, floorName, normalizeSave, stageUnlocked } from '../js/rules.js';
import { castleCell, DecorField } from '../js/decor.js';
import { art } from '../js/art.js';

const svgOf = u => decodeURIComponent(u.slice(u.indexOf(',') + 1, -2));

test('stage 5 is a demon castle: decor, throne room quest, boss unchanged, saves ok', () => {
  const s5 = STAGES.find(s => s.id === 5);
  assert.ok(s5.throne && s5.decor === 'castle' && s5.boss.type === 'maou');
  assert.equal(floorName(1, THRONE), 'ぎょくざのま');
  assert.ok(stageUnlocked(normalizeSave({ stageClears: { 1: 1, 2: 1, 3: 1, 4: 1 } }), 5));
  const f = new DecorField(7, 'castle'), list = f.visible(-3000, -3000, 3000, 3000);
  const kinds = new Set(list.map(d => d.kind.replace(/\d$/, '')));
  for (const k of ['ctower', 'cbanner', 'blaze', 'brazier']) assert.ok(kinds.has(k), k);
  assert.ok(list.filter(d => d.kind.startsWith('blaze')).length >= 40, 'ほのおが いっぱい');
  assert.ok(castleCell(0, 0, 7).every(d => Math.hypot(d.x, d.y) > 200), 'スタートは あける');
});

test('saw trap: telegraphed, fair damage, saws come from around the player toward them', () => {
  const S = THRONE.saw;
  assert.ok(S.warn >= 0.7 && S.dmg <= 16 && S.cd >= 4);
  const ps = sawPaths(100, 50, () => 0.3);
  assert.equal(ps.length, S.n);
  for (const s of ps) {
    assert.ok(Math.abs(Math.hypot(s.sx - 100, s.sy - 50) - S.dist) < 1);
    const toward = Math.atan2(50 - s.sy, 100 - s.sx), d = Math.abs(Math.atan2(Math.sin(toward - s.ang), Math.cos(toward - s.ang)));
    assert.ok(d < 0.01, 'プレイヤーに むかって とぶ');
  }
});

test('skeletons near the throne room: small villain with the emblem; arts present', () => {
  assert.ok(ENEMY_TYPES.skeleton && !ENEMY_TYPES.skeleton.name);
  assert.ok(THRONE.skeletons.max <= 16);
  for (const k of ['skeleton', 'cbanner', 'throneKeep', 'throne']) assert.ok(svgOf(art(k)).includes('data-emblem="warumono"'), k);
  for (const k of ['ctower1', 'ctower2', 'brazier', 'throneDoor', 'throneDoorOpen', 'saw']) assert.ok(art(k), k);
});
