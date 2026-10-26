// v1.0.0 Codex gfx3 の取り込み: 背中の乗り姿・飛ぶ機体と水陸両用機の絵・ボタンのアイコン・しまっただけの絵（タイトル・水の中）・使わない操縦席の絵
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { rasterArtSources, rideArtSources, RIDER_IDS, RIDER_FRAMES } from '../js/render/raster-art.js?v=14';
import { riderArtKey } from '../js/render/ride-view.js?v=7';
import { ALT_UNIT_LOOK } from '../js/sim/alt-units.js?v=3';
import { RIDE_TABLE, RIDE_MODE } from '../js/sim/ride.js?v=3';

const path = rel => fileURLToPath(new URL(rel, import.meta.url));
const fileOf = url => fileURLToPath(url.split('?')[0]);
const SW = readFileSync(path('../sw-assets.js'), 'utf8');

test('gfx3 背中の乗り姿: 3 人 × 4 こまの絵があり、ポンコと同じ切り抜き・先読みに入っている', () => {
  const src = rideArtSources(), ponco = rasterArtSources().ponco_ally;
  assert.equal(Object.keys(src).length, Object.keys(RIDER_IDS).length * RIDER_FRAMES);
  for (const [key, s] of Object.entries(src)) {
    assert.ok(existsSync(fileOf(s.url)), key);
    assert.deepEqual(s.rect, ponco.rect, `${key} はポンコの体に重なる`);
    assert.ok(SW.includes(`'assets/ride/${s.url.split('/assets/ride/')[1]}'`), `${key} 先読み`);
  }
});

test('gfx3 背中の乗り姿: 出すのは「ポンコ（v1.0.1 からツギハギ号も）の背中・乗り終わり・絵のある人」だけ（中の席は人を見せない）', () => {
  const on = (mode, phase = 'on') => ({ kind: 'boy', ride: { mode, phase } });
  assert.equal(riderArtKey(on(RIDE_MODE.BACK), { kind: 'ponco' }, 0), 'ride_boy_0');
  assert.equal(riderArtKey(on(RIDE_MODE.BACK), { kind: 'ponco' }, 0.5), 'ride_boy_3');
  assert.equal(riderArtKey(on(RIDE_MODE.BACK), { kind: 'scav' }, 0), 'ride_scav_boy_0'); // v1.0.1 gfx4 でツギハギ号の背中の絵が入った
  assert.equal(riderArtKey(on(RIDE_MODE.BACK, 'boarding'), { kind: 'ponco' }, 0), null);
  assert.equal(riderArtKey(on(RIDE_MODE.INSIDE), { kind: 'giant' }, 0), null);
  assert.equal(riderArtKey({ kind: 'gunner', ride: { mode: RIDE_MODE.BACK, phase: 'on' } }, { kind: 'ponco' }, 0), null);
  // 席の数（佳之さんの決まり）: ポンコ背中 1・巨大ロボ中 2・ツギハギ背中 1
  assert.equal(RIDE_TABLE.ponco.back, 1);
  assert.equal(RIDE_TABLE.giant.inside, 2);
  assert.equal(RIDE_TABLE.scav.back, 1);
});

test('gfx3 飛ぶ機体・水陸両用機: 専用の絵があり（ポンコの色違いではない）、先読みに入っている', () => {
  const src = rasterArtSources();
  for (const k of ['flyer', 'amph']) {
    const look = ALT_UNIT_LOOK[k], s = src[`${look.art}_ally`];
    assert.ok(s && look.art !== 'ponco', k);
    assert.ok(existsSync(fileOf(s.url)), k);
    assert.ok(SW.includes(`'assets/art-v2/${s.url.split('/art-v2/')[1]}'`), `${k} 先読み`);
  }
});

test('gfx3 操縦席の絵（人が見える物）はゲームの assets に入れない', () => {
  const walk = d => readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(`${d}/${e.name}`) : [e.name]);
  const names = walk(path('../assets')).join('\n');
  assert.doesNotMatch(names, /occupied|ALT_AMPHI_open|cockpit_BOY|bg_cockpit_interior|preview_cockpit/);
});

test('gfx3 ボタンのアイコン: CSS が指す絵が全部ある（@24・@48・@72）・先読みにある', () => {
  for (const f of readdirSync(path('../css')).filter(f => f.endsWith('.css'))) {
    const css = readFileSync(path(`../css/${f}`), 'utf8');
    for (const m of css.matchAll(/url\('\.\.\/(assets\/icons\/ui\/[^']+)'\)/g)) {
      assert.ok(existsSync(path(`../${m[1]}`)), m[1]);
      assert.ok(SW.includes(`'${m[1]}'`), `${m[1]} 先読み`);
    }
  }
});

test('gfx3 タイトル・水の中の絵はしまっただけ（先読みに入れない・メモがある）', () => {
  for (const d of ['title', 'underwater', 'ride']) assert.ok(existsSync(path(`../assets/${d}/README.md`)), d);
  assert.doesNotMatch(SW, /assets\/title\/|assets\/underwater\//);
});
