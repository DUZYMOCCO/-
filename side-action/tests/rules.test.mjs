import test from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../js/rules.js';

test('ぶき：ハンドガンは むげん、ひろうと ふえる', () => {
  const a = R.createArsenal();
  assert.equal(a.guns.pistol.ammo, Infinity);
  R.giveWeapon(a, 'smg');
  assert.ok(a.guns.smg.ammo > 0);
  assert.equal(R.nextWeapon(a) !== undefined, true);
  for (const id of R.WEAPON_ORDER) assert.ok(R.WEAPONS[id].name, id);
});

test('わざ：パンチと キックの れんけい', () => {
  assert.ok(R.pickMove('punch', { step: 0 }));
  assert.ok(R.pickMove('kick', { air: true }));
  assert.equal(R.comboMult(1), 1);
  assert.ok(R.comboMult(30) > R.comboMult(6));
});

test('ステージは 5つ、それぞれ ちがう ボスつき', () => {
  assert.equal(R.STAGES.length, 5);
  for (const s of R.STAGES) { assert.ok(R.BOSSES[s.boss.id]); assert.ok(s.boss.x < s.length); }
  assert.equal(new Set(R.STAGES.map((s) => s.boss.id)).size, 5);
  assert.equal(new Set(R.STAGES.map((s) => s.id)).size, 5);
  for (const s of R.STAGES) for (const z of s.zones || []) for (const w of z.waves) for (const id of w) assert.ok(R.ENEMIES[id], id);
});

test('ぶきの かたち：すべての じゅうに じゅうこう と はんどう', () => {
  for (const id of R.WEAPON_ORDER) { const G = R.GUN_GEOM[id]; assert.ok(G, id); assert.ok(G.mx > 0 && Array.isArray(G.kick)); }
});

test('ズーム：3だんかい、きほんは ちかい', () => {
  assert.equal(R.ZOOMS.length, 3);
  assert.equal(R.ZOOMS[R.ZOOM_DEFAULT].z, 1.4);
  assert.equal(R.normalizeSave({ zoom: 2 }).zoom, 2);
  assert.equal(R.normalizeSave({ zoom: 9 }).zoom, R.ZOOM_DEFAULT);
  assert.equal(R.normalizeSave({ zoom: 'x' }).zoom, R.ZOOM_DEFAULT);
});

test('てき・ボスの ちは みどり か むらさき だけ（あかは なし）', () => {
  for (const d of [...Object.values(R.ENEMIES), ...Object.values(R.BOSSES)]) assert.ok(['green', 'purple'].includes(d.blood), d.name);
});

test('ひらがな・カタカナの なまえ（かんじ なし）', () => {
  const kanji = /[\u4e00-\u9fff]/;
  const names = [...Object.values(R.ENEMIES), ...Object.values(R.BOSSES), ...Object.values(R.WEAPONS), ...R.ALLIES].map((d) => d.name)
    .concat(R.STAGES.flatMap((s) => [s.name, s.sub]));
  for (const n of names) assert.ok(!kanji.test(n), n);
});

test('セーブデータの ほせい', () => {
  assert.deepEqual(R.normalizeSave(null), { cleared: [], best: {}, allies: true, shake: true, zoom: 1 });
  assert.deepEqual(R.normalizeSave({ cleared: [1, 'x'], allies: false }).cleared, [1]);
  assert.equal(R.normalizeSave({ allies: false }).allies, false);
  assert.ok(R.rankOf({ hpLeft: 1, time: 60, maxCombo: 20 }).length === 3);
});
