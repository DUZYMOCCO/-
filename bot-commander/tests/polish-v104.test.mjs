// v1.0.4 磨き（polish_v104）の直しの見張り。シムは変えない（hash300 は別に確かめる）。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initialArtSources, ALT_BODY_KEYS } from '../js/render/art-lazy.js?v=1';
import { WRECK_ART } from '../js/render/raster-art.js?v=14';
import { preloadImages } from '../js/armory/armory-view.js?v=10';
import { popMinY } from '../js/render/pop-bounds.js?v=1';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = f => readFileSync(join(ROOT, f), 'utf8');

test('P-01 上の帯の安全域と文字の高さは、0.5〜3倍の拡大でも文字の上端を隠さない', () => {
  for (const zoom of [0.5, 1, 2, 3]) {
    for (const top of [92, 139]) {
      const y = popMinY(500, 844, zoom, top, 30);
      const screenTop = (y - 30 / 2 - 500) * zoom + 844 / 2;
      assert.ok(Math.abs(screenTop - top) < 1e-9);
    }
  }
});

test('P-01 長い知らせ（toast）は、横にはみ出さず折り返す（390px の画面でも切れない）', () => {
  const rule = read('css/bot-commander.css').split('\n').find(l => l.startsWith('.bc-toast {'));
  assert.ok(rule, '.bc-toast の規則がある');
  assert.ok(!/white-space:\s*nowrap/.test(rule), 'nowrap のままだと長い文字が両端で切れる');
  assert.match(rule, /width:\s*max-content/);
  assert.match(rule, /max-width:\s*calc\(100% - \d+px\)/);
});

test('P-01 画面の文字（+1・シールド修理中 など）は、上の帯の下へも寄せる', () => {
  const src = read('js/render/renderer.js');
  assert.match(src, /function clampPopY\(t\)/);
  assert.match(src, /clampPopY\(t\); clampPopX\(t\);/);
});

test('P-02 武器庫: 最初の一覧の絵を先に読み込む（読み込み前の空の枠をなくす）。遅い・失敗しても待ちすぎない', async () => {
  const made = [];
  globalThis.Image = class { constructor() { made.push(this); } set src(v) { this._src = v; setTimeout(() => (v.includes('bad') ? this.onerror : this.onload)?.(), 5); } };
  const t0 = Date.now();
  await preloadImages(['a.webp', 'a.webp', 'b.webp', 'bad.webp'], 1000);
  assert.equal(made.length, 3, '同じ URL は 1 回だけ');
  assert.ok(Date.now() - t0 < 500, '全部終わったらすぐ返る');
  globalThis.Image = class { set src(v) { /* 返事が来ない */ } };
  const t1 = Date.now();
  await preloadImages(['never.webp'], 60);
  assert.ok(Date.now() - t1 < 400, '返事が来なくても maxMs で待つのをやめる');
  delete globalThis.Image;
  const view = read('js/armory/armory-view.js');
  assert.ok(view.indexOf('await preloadImages(') < view.lastIndexOf('  render();\n  return {'), '最初の render の前に待つ');
});

test('P-03 深い水の上の飛ぶ機体の影: 水面に明るい輪をしく（水の上だけ）', () => {
  const src = read('js/render/renderer.js');
  assert.match(src, /tileAt\(map, toTile\(u\.x\), toTile\(u\.y\)\) === TILE_T\.WATER/);
  assert.match(src, /v\.waterGlow\.visible = wet/);
  assert.match(src, /v\.waterGlow, v\.motionOver\]\) if \(o\) o\.visible = false/, '残骸になる時は輪も隠す');
});

test('P-04 飛ぶ機体の残骸は、体の絵（明るい版）と色をそろえた絵を使う', () => {
  assert.equal(WRECK_ART.wreck_flyer.file, 'alt-flyer_wreck-bright');
  assert.ok(existsSync(join(ROOT, 'assets/art-v2/alt-flyer_wreck-bright.webp')));
  const sw = read('sw-assets.js');
  assert.ok(sw.includes("'assets/art-v2/alt-flyer_wreck-bright.webp'"));
  assert.ok(!sw.includes("'assets/art-v2/alt-flyer_wreck.webp'"), '使わない絵は先読みしない');
});

test('P-05 最初に読む絵: 飛ぶ機体・水陸両用機がいない時は体の絵を読まない（いれば読む。元の一覧は変えない）', () => {
  assert.ok(read('sw-assets.js').includes("'js/render/art-lazy.js'"));
  const all = { ponco_ally: 1, flyer_ally: 2, amph_ally: 3, alien_enemy: 4 };
  const none = initialArtSources(all, { units: [{ kind: 'ponco', side: 'ally' }, { kind: 'alien', side: 'enemy' }] });
  assert.deepEqual(Object.keys(none), ['ponco_ally', 'alien_enemy']);
  assert.deepEqual(Object.keys(all), ['ponco_ally', 'flyer_ally', 'amph_ally', 'alien_enemy'], '元は変えない');
  const fl = initialArtSources(all, { units: [{ kind: 'flyer', side: 'ally' }] });
  assert.ok(fl.flyer_ally && !fl.amph_ally);
  const both = initialArtSources(all, { units: [{ kind: 'flyer', side: 'ally' }, { kind: 'amph', side: 'ally' }] });
  assert.ok(both.flyer_ally && both.amph_ally);
  assert.deepEqual([...ALT_BODY_KEYS], ['flyer_ally', 'amph_ally']);
  const src = read('js/render/renderer.js');
  assert.match(src, /initialArtSources\(artSources\(\{ ground \}\), sim\)/);
  assert.match(src, /loadAltBody\(key\)/, '途中で出てきた時は読む');
});
