// 地面の境界（縁取りの絵）の確認: 本編と ?altdemo=1 の同じ場所を撮る（390x844, DPR2）。コンソールのエラーも見る
// 使い方（ゲームフォルダの1つ上で）: python3 -m http.server 8766 --bind 127.0.0.1 を起動してから
//   PW=<playwright-core の場所> node bot-commander/tools/edges-shots.mjs [名前の頭（既定 edges）] [出力フォルダ（既定 /workspace/new-game-rts/cover-proto）]
//   → <頭>_main.png・<頭>_main_zoom.png・<頭>_altdemo.png
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || '/workspace/new-game-rts/tools/node_modules/playwright-core');
const BASE = process.env.URL || 'http://127.0.0.1:8766/';
const PREFIX = process.argv[2] || 'edges';
const OUT = (process.argv[3] || '/workspace/new-game-rts/cover-proto').replace(/\/?$/, '/');
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const logs = [], units = [];
async function shoot(query, shots) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/sw-assets|Service Worker|Failed to load resource/.test(m.text())) logs.push(`[${query}][${m.type()}] ${m.text()}`); });
  page.on('pageerror', e => logs.push(`[${query}][pageerror] ${e.message}`));
  page.on('response', s => { if (s.status() >= 400) logs.push(`[${query}][http ${s.status()}] ${s.url()}`); }); // 404 は全部出す（ハブが他のゲームの sw-assets.js を探す分も）
  await page.goto(BASE + query);
  await page.waitForFunction(() => window.__studio_loaded && document.querySelector('[data-game-id="bot-commander"]'));
  await page.locator('[data-game-id="bot-commander"]').click();
  await page.waitForFunction(() => window.__botCommander?.ready, null, { timeout: 30000 });
  await page.evaluate(() => { const { sim, setPaused } = window.__botCommander; setPaused(true); sim.fog.seen.fill(255); sim.fog.visible.fill(255); sim.fog.revision++; }); // スクショ用: 霧を晴らす（止めたまま）
  // 機体ごとの絵: 紙芝居（sheet）でないものは、今の絵（raster-art.js）のある種類か（古い SVG に落ちていないか）
  units.push(...(await page.evaluate(() => { const { sim, r } = window.__botCommander; return sim.units.map(u => { const v = r.views.get(u.id); return { kind: u.kind, side: u.side, label: u.label || null, z: u.z || 0, key: v?.sheet ? 'sheet' : v?.key, w: v?.body?.texture?.source?.resource?.width ?? null }; }); })).map(u => ({ query, ...u })));
  for (const [name, x, y, zoom] of shots) {
    await page.evaluate(([x, y, zoom]) => { const { r } = window.__botCommander; r.cam.zoom = zoom; r.cam.x = x * 32; r.cam.y = y * 32; r.clampCam(); }, [x, y, zoom]);
    await page.waitForTimeout(500);
    await page.screenshot({ path: OUT + `${PREFIX}_${name}.png` });
  }
  await ctx.close();
}
await shoot('', [['main', 25, 43, 1.0], ['main_zoom', 27.5, 44.5, 2.6]]);
await shoot('?altdemo=1', [['altdemo', 20, 42, 1.0], ['altdemo_air', 21.3, 42.6, 2.2], ['altdemo_air_b', 21.3, 42.6, 2.2]]);
const RASTER = new Set(['scav_ally', 'ponco_ally', 'alien_enemy', 'sheet']);
const summary = {}; for (const u of units) { const k = `${u.query || '本編'} ${u.kind}_${u.side} -> ${u.key}${RASTER.has(u.key) ? '' : '（古いSVG）'}`; summary[k] = (summary[k] || 0) + 1; }
console.log(JSON.stringify({ out: OUT, prefix: PREFIX, logs, units: summary }, null, 1));
await browser.close();
