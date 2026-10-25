// v0.7.0：ステージ 16「いせきの どうくつ」（カタナ と グール）
import test from 'node:test';
import assert from 'node:assert/strict';
import { STAGES, ENEMIES, BOSSES, WEAPONS, WEAPON_ORDER, MOVES, pickMove, createArsenal } from '../js/rules.js';

const S = STAGES[15];
test('ステージ16：いせき・すぐ あそべる・カタナ スタート', () => {
  assert.ok(STAGES.length >= 16);
  assert.equal(S.id, 16); assert.equal(S.theme, 'ruins'); assert.equal(S.free, true);
  assert.equal(S.boss.id, 'ghoulking'); assert.ok(S.start.includes('katana')); assert.equal(S.heroLook, 'plain');
});
test('ボス グール：みどりの ち・いちばん タフ', () => {
  const B = BOSSES.ghoulking;
  assert.ok(B); assert.equal(B.blood, 'green'); assert.equal(B.kit, 'ghoul');
  for (const [id, e] of Object.entries(ENEMIES)) assert.ok(B.hp > e.hp, id);
});
test('グール 3しゅるい', () => {
  for (const id of ['ghoul', 'ghoulet', 'bigghoul']) { assert.equal(ENEMIES[id].blood, 'green', id); assert.equal(ENEMIES[id].look, 'ghoul', id); }
  assert.equal(ENEMIES.bigghoul.mini, true);
  assert.ok(ENEMIES.bigghoul.hp > ENEMIES.ghoul.hp && ENEMIES.ghoul.hp > ENEMIES.ghoulet.hp);
});
test('ウェーブの てきは ぜんぶ ある', () => {
  assert.ok(S.arenas.length >= 4);
  for (const a of S.arenas) for (const w of a.waves) for (const id of w) assert.ok(ENEMIES[id], id);
});
test('カタナ：きんせつ・むげん', () => {
  assert.equal(WEAPONS.katana.melee, true); assert.equal(WEAPONS.katana.ammo, Infinity);
  assert.ok(WEAPON_ORDER.includes('katana')); assert.equal(createArsenal(['katana', 'pistol']).cur, 'katana');
});
test('きりの れんぞくわざ', () => {
  assert.equal(pickMove('slash', { step: 0 }), 'slash1'); assert.equal(pickMove('slash', { step: 1 }), 'slash2');
  assert.equal(pickMove('slash', { step: 2 }), 'slash3'); assert.equal(pickMove('slash', { air: true }), 'airslash');
  for (const id of ['slash1', 'slash2', 'slash3', 'airslash']) {
    const M = MOVES[id]; assert.ok(M, id); assert.ok(M.dmg > 0); assert.ok(0 <= M.t0 && M.t0 < M.t1 && M.t1 <= M.dur, id); assert.ok(M.blade, id);
  }
});
test('なまえは かな だけ', () => {
  for (const n of [S.sub, BOSSES.ghoulking.name, ENEMIES.ghoul.name, ENEMIES.ghoulet.name, ENEMIES.bigghoul.name]) {
    assert.doesNotMatch(n, /[\u4e00-\u9fff]/); assert.match(n, /[\u3040-\u30ff]/);
  }
});
test('ちは みどり か むらさき（あかは なし）', () => {
  for (const [id, e] of [...Object.entries(ENEMIES), ...Object.entries(BOSSES)]) assert.ok(e.blood === 'green' || e.blood === 'purple', `${id}:${e.blood}`);
});
