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

test('ステージは 15こ、それぞれ ちがう ボスつき', () => {
  assert.equal(R.STAGES.length, 15);
  for (const s of R.STAGES) { assert.ok(R.BOSSES[s.boss.id]); assert.ok(s.boss.x < s.length); }
  assert.equal(new Set(R.STAGES.map((s) => s.boss.id)).size, 15);
  assert.equal(new Set(R.STAGES.map((s) => s.id)).size, 15);
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

test('ビームブラスター：うつ＝れんしゃ、ためて はなすと ふとい ビーム', () => {
  const a = R.createArsenal(); R.giveWeapon(a, 'beam'); const W = R.WEAPONS.beam, c0 = a.guns.beam.ammo;
  assert.equal(R.tickBeam(a, 1 / 60, true, false), 'bolt');
  let bolts = 1; for (let i = 0; i < 60; i++) if (R.tickBeam(a, 1 / 60, true, false) === 'bolt') bolts++;
  assert.ok(bolts >= 5, 'れんしゃ ' + bolts);
  a.cool = 0; for (let i = 0; i < 20; i++) assert.equal(R.tickBeam(a, 1 / 60, false, true), null);
  assert.equal(R.tickBeam(a, 1 / 60, false, false), null, 'ためが たりないと でない');
  for (let i = 0; i < 40; i++) R.tickBeam(a, 1 / 60, false, true);
  const before = a.guns.beam.ammo;
  assert.equal(R.tickBeam(a, 1 / 60, false, false), 'beam');
  assert.equal(a.guns.beam.ammo, before - W.beamCost); assert.ok(c0 > before);
});

test('ミニガン：まわりきるまで うてない、そのあと はやい', () => {
  const a = R.createArsenal(); R.giveWeapon(a, 'minigun'); a.cur = 'minigun';
  let shots = 0, first = -1;
  for (let i = 0; i < 120; i++) if (R.tickGun(a, 1 / 60, true)) { shots++; if (first < 0) first = i; }
  assert.ok(first >= 25, 'まわる じかん ' + first);
  assert.ok(shots >= 20, 'はやい ' + shots);
});
