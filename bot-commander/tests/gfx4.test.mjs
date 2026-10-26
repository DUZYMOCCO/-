// v1.0.1 Codex gfx4 の取り込み: 飛ぶ機体の明るい絵と影・巣の絵・燃料をためる姿・潜る／浮かぶ・魚雷・結果のカードの絵・ツギハギ号の背中・新しい敵の見本（?enemydemo=1）
// どれも見た目だけ（sim は変えない。ハッシュは sim.test などで見ている）
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { rasterArtSources, rideArtSources, nestArtSources, altMotionArtSources, enemyArtSources, ENEMY_ART, RIDER_IDS, RIDER_FRAMES, RIDE_HOSTS, TORPEDO_ART, RESULT_BANNER, shadowWorldSize, ALT_BODY_RECT, ALT_SHADOW_RECT } from '../js/render/raster-art.js?v=14';
import { altMotion, DIVE_FPS, DIVE_FRAMES, torpedoDuration, UNDERWATER_BODY_ALPHA } from '../js/render/alt-motion-view.js?v=1';
import { galleryLayout, GALLERY_IDS } from '../js/render/enemy-gallery.js?v=3';
import { riderArtKey } from '../js/render/ride-view.js?v=7';
import { spawnFxEvents, TORPEDO_WEAPON } from '../js/render/fx-events.js?v=15';
import { ALT_SUBMERGED_WEAPON } from '../js/sim/alt-units.js?v=3';
import { RIDE_MODE } from '../js/sim/ride.js?v=3';
import { MISSION_1 } from '../js/sim/mission.js?v=10';

const path = rel => fileURLToPath(new URL(rel, import.meta.url));
const fileOf = url => fileURLToPath(url.split('?')[0]);
const SW = readFileSync(path('../sw-assets.js'), 'utf8');
const swHas = url => SW.includes(`'assets/${url.split('/assets/')[1]}'`);
const allCached = (src, label) => { for (const [k, s] of Object.entries(src)) { assert.ok(existsSync(fileOf(s.url)), `${label} ${k} の絵がある`); assert.ok(swHas(s.url), `${label} ${k} 先読み`); } };

test('gfx4 SKY_VIS: 飛ぶ機体は明るい版の絵（切り抜きは前と同じ）・足元の影の絵', () => {
  const s = rasterArtSources().flyer_ally;
  assert.match(s.url, /alt-flyer-bright\.webp/);
  assert.deepEqual(s.rect, [25, 230, 1229, 1236]);
  allCached({ flyer: s }, 'SKY_VIS');
  const [w, h] = shadowWorldSize(ALT_BODY_RECT.flyer, ALT_SHADOW_RECT.flyer_shadow, 42);
  assert.ok(w > 30 && w < 42 && h > 5 && h < 10, `影は体の幅くらい（${w.toFixed(1)}×${h.toFixed(1)}）`);
  assert.deepEqual(altMotion({}, { kind: 'flyer', z: 40 }, 0), { shadow: 'flyer_shadow' });
  assert.equal(altMotion({}, { kind: 'flyer', z: 0 }, 0), null, '地面では影の絵は出さない（いつもの見た目）');
});

test('gfx4 NEST: 巣の絵（ふだん・捕まっている間）があり先読み。壊れた巣はしまっただけ', () => {
  const src = nestArtSources();
  assert.deepEqual(Object.keys(src).sort(), ['nest_captive', 'nest_idle']);
  allCached(src, 'NEST');
  assert.ok(existsSync(path('../assets/art-v2/nest-broken.webp')));
  assert.doesNotMatch(SW, /'assets\/art-v2\/nest-broken/);
  assert.ok(MISSION_1.nest, '本編のミッションに巣がある');
  const R = readFileSync(path('../js/render/renderer.js'), 'utf8');
  assert.match(R, /held \? tex\.nest_captive : tex\.nest_idle/);
});

test('gfx4 ALT_MOTION: 燃料をためる姿（地面・水面）', () => {
  assert.deepEqual(altMotion({}, { kind: 'flyer', z: 0, fuelDown: true, fuelFloat: false }, 0), { body: 'flyer_charge_ground' });
  assert.deepEqual(altMotion({}, { kind: 'flyer', z: 0, fuelDown: true, fuelFloat: true }, 0), { body: 'flyer_charge_water' });
  allCached(altMotionArtSources(), 'ALT_MOTION');
  const src = altMotionArtSources(), base = rasterArtSources();
  for (let i = 0; i < 4; i++) assert.deepEqual(src[`amph_dive_${i}`].rect, base.amph_ally.rect, '潜るコマは体と同じ切り抜き');
  assert.deepEqual(src.flyer_charge_ground.rect, base.flyer_ally.rect);
});

test('gfx4 ALT_MOTION: 水陸両用機が潜る 4 コマ → 水中の影 → 浮かぶ時は逆のコマと水しぶき', () => {
  const st = {}, a = { kind: 'amph', z: 0 };
  assert.equal(altMotion(st, a, 0), null);
  a.z = -14;
  const seen = [];
  for (let t = 0; t < DIVE_FRAMES / DIVE_FPS; t += 1 / 60) seen.push(altMotion(st, a, 1 + t + 1e-6)?.body);
  assert.deepEqual([...new Set(seen)], ['amph_dive_0', 'amph_dive_1', 'amph_dive_2', 'amph_dive_3']);
  assert.deepEqual(altMotion(st, a, 3), { faint: UNDERWATER_BODY_ALPHA, shadow: 'amph_underwater' });
  a.z = 0;
  const up = altMotion(st, a, 4);
  assert.equal(up.body, 'amph_dive_3'); assert.equal(up.overlay, 'amph_splash');
  assert.equal(altMotion(st, a, 4 + 1 / DIVE_FPS + 1e-6).body, 'amph_dive_2');
  assert.equal(altMotion(st, a, 6), null, '浮かび終わったらいつもの絵');
  assert.deepEqual(altMotion({}, { kind: 'amph', z: -14 }, 0), { faint: UNDERWATER_BODY_ALPHA, shadow: 'amph_underwater' }, '初めて見た時に潜っていれば、潜る動きは出さない');
  assert.equal(altMotion({}, { kind: 'ponco', z: 0 }, 0), null);
});

test('gfx4 ALT_MOTION: 魚雷（W3-12）は view.torpedo があれば進む絵 → 着いたら水の爆発。無ければ今までどおり', () => {
  assert.equal(TORPEDO_WEAPON, ALT_SUBMERGED_WEAPON.amph);
  for (const a of Object.values(TORPEDO_ART)) { assert.ok(existsSync(fileOf(a.url))); assert.ok(swHas(a.url)); }
  const ev = () => ({ type: 'shot', side: 'ally', kind: 'amph', toKind: 'alien', toSide: 'enemy', weapon: 'W3-12', x1: 0, y1: 0, x2: 120, y2: 0 });
  const calls = [], fake = () => ({ after: (t, f) => calls.push(['after', t, f]), hit: (k, x, y, o) => calls.push(['hit', k, o]), fromWeapon: () => calls.push(['fromWeapon']) });
  const base = { onScreen: () => 1, visible: () => true, px: () => 40 };
  let asked = null;
  spawnFxEvents(fake(), { fx: [ev()] }, new WeakSet(), { ...base, torpedo: (...a) => { asked = a; return torpedoDuration(...a); } });
  assert.ok(asked && asked[2] === 120);
  assert.equal(calls[0][0], 'after'); assert.ok(calls[0][1] >= 0.25 && calls[0][1] <= 1.6);
  calls[0][2]();
  assert.equal(calls[1][0], 'hit'); assert.equal(calls[1][2].medium, 'water');
  calls.length = 0;
  spawnFxEvents(fake(), { fx: [ev()] }, new WeakSet(), base);
  assert.deepEqual(calls.map(c => c[0]), ['fromWeapon'], 'view.torpedo が無い時は今までどおり');
  calls.length = 0;
  spawnFxEvents(fake(), { fx: [ev()] }, new WeakSet(), { ...base, torpedo: () => 0 });
  assert.deepEqual(calls.map(c => c[0]), ['fromWeapon'], '魚雷の絵がまだ読めていない時も今までどおり');
});

test('gfx4 RESULT: 結果のカードの上の絵（成功・失敗）があり、先読みにある。ボタンはそのまま', () => {
  for (const u of Object.values(RESULT_BANNER)) { assert.ok(existsSync(fileOf(u))); assert.ok(swHas(u)); }
  const I = readFileSync(path('../js/index.js'), 'utf8');
  assert.match(I, /<img class="bc-result-banner"/);
  assert.match(I, /<button class="bc-retry">もう一度<\/button><button class="bc-result-back">工房へ<\/button>/);
  assert.match(I, /assets\/result\/result-success\.webp/); assert.match(I, /assets\/result\/result-fail\.webp/);
});

test('gfx4 新しい敵（G01〜G04・A01・A08）: 絵があり先読み。?enemydemo=1 の見本だけで、本編には出さない', () => {
  assert.deepEqual(GALLERY_IDS, ['G01', 'G02', 'G03', 'G04', 'A01', 'A08']);
  const src = enemyArtSources();
  assert.equal(Object.keys(src).length, 4 * 2 + 2 * 3);
  allCached(src, 'ENEMY');
  for (const id of GALLERY_IDS) assert.ok(!JSON.stringify(MISSION_1).includes(id), `${id} は本編に出ない`);
  const I = readFileSync(path('../js/index.js'), 'utf8');
  assert.match(I, /enemyDemo: params\.get\('enemydemo'\) === '1'/);
  const map = { w: 40, h: 60, hq: { ally: { tx: 20, ty: 56 } } }, lay = galleryLayout(map);
  assert.equal(lay.length, 6);
  for (const p of lay) { assert.ok(p.x > 0 && p.x < 40 * 32 && p.y > 0 && p.yAlt < 60 * 32); }
  for (const a of Object.values(ENEMY_ART)) assert.ok(a.altDisplay < a.display);
});

test('gfx4 SCAV_RIDE: ツギハギ号の背中に 3 人 × 4 こまの絵（scav と同じ枠）。中の席・乗る途中は出さない', () => {
  const src = rideArtSources('scav'), scav = rasterArtSources().scav_ally;
  assert.equal(Object.keys(src).length, Object.keys(RIDER_IDS).length * RIDER_FRAMES);
  for (const [k, s] of Object.entries(src)) { assert.match(k, /^ride_scav_(boy|girl|wolf)_[0-3]$/); assert.deepEqual(s.rect, scav.rect, k); }
  allCached(src, 'SCAV_RIDE');
  assert.equal(Object.keys(rideArtSources()).length, 12, 'ふつうはポンコの 12 枚のまま');
  assert.ok(RIDE_HOSTS.scav && !RIDE_HOSTS.giant, '巨大機（中の席）には絵を出さない');
  const on = (kind, mode = RIDE_MODE.BACK, phase = 'on') => ({ kind, ride: { mode, phase } });
  assert.equal(riderArtKey(on('wolf'), { kind: 'scav' }, 0.5), 'ride_scav_wolf_3');
  assert.equal(riderArtKey(on('girl', RIDE_MODE.BACK, 'boarding'), { kind: 'scav' }, 0), null);
  assert.equal(riderArtKey(on('boy', RIDE_MODE.INSIDE), { kind: 'scav' }, 0), null);
  assert.ok(existsSync(path('../assets/ride/scav-ride.codex.json')));
});

test('gfx4 操縦席・ガラス越しの人・乗り込む場面の絵は入れない', () => {
  const R = readFileSync(path('../assets/ride/README.md'), 'utf8');
  assert.match(R, /SCAV_/);
  assert.doesNotMatch(SW, /cockpit|occupied|boarding/i);
});
