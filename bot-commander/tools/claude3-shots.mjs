// v0.4.9 取り込み確認: 本編・?armory=1・?altdemo=1・?dialogdemo=1 を 390x844 DPR2 で撮る
// 使い方: game-single-units で python3 -m http.server <port> --bind 127.0.0.1 → PW=<playwright-core> URL=http://127.0.0.1:<port>/ node bot-commander/tools/claude3-shots.mjs [出力]
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW);
const BASE = process.env.URL || 'http://127.0.0.1:8770/';
const OUT = (process.argv[2] || '/workspace/new-game-rts/cover-proto/claude3').replace(/\/?$/, '/');
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const logs = [];
async function open(query) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error' && !/sw-assets|Service Worker|Failed to load resource/.test(m.text())) logs.push(`[${query}][console] ${m.text()}`); });
  page.on('pageerror', e => logs.push(`[${query}][pageerror] ${e.message}`));
  page.on('response', s => { if (s.status() >= 400 && !/\/(color-ants|iron-squad|dada-survivor|math-runner)\//.test(s.url())) logs.push(`[${query}][http ${s.status()}] ${s.url()}`); });
  await page.goto(BASE + query);
  await page.waitForFunction(() => window.__studio_loaded && document.querySelector('[data-game-id="bot-commander"]'));
  await page.locator('[data-game-id="bot-commander"]').click();
  return { ctx, page };
}
const shot = (page, n) => page.screenshot({ path: OUT + n + '.png' });
const wait = (p, ms = 500) => p.waitForTimeout(ms);
// 本編
{ const { ctx, page } = await open('');
  await page.waitForFunction(() => window.__botCommander?.ready, null, { timeout: 60000 }); await wait(page, 3000); await shot(page, '01_main'); await ctx.close(); }
// 武器庫
{ const { ctx, page } = await open('?armory=1');
  await page.waitForSelector('.bca-row', { timeout: 60000 }); await wait(page, 800); await shot(page, '02_armory_list');
  await page.click('.bca-row[data-label="PONCO1"]'); await wait(page); await shot(page, '03_armory_unit');
  await page.click('.bca-slot[data-kind="weapon"][data-i="0"]'); await wait(page, 800); await shot(page, '04_armory_cards');
  await page.click('.bca-card[data-id="W1-06"]'); await wait(page); await page.click('.bca-back'); await wait(page);
  await page.click('.bca-slot[data-kind="weapon"][data-i="1"]'); await wait(page); await page.click('.bca-card[data-id="W1-03"]'); await wait(page); await page.click('.bca-back'); await wait(page);
  await shot(page, '05_armory_unit_equipped');
  await page.click('.bca-back'); await wait(page); await shot(page, '06_armory_list_equipped');
  await page.click('.bca-go'); await page.waitForFunction(() => window.__botCommander?.ready && window.__botCommander.sim, null, { timeout: 60000 }); await wait(page, 2500);
  const u = await page.evaluate(() => window.__botCommander.sim.units.filter(u => u.label === 'PONCO1').map(u => ({ weapon: u.weapon, wmul: u.wmul, loadout: u.loadout })));
  logs.push('[armory] PONCO1 after deploy ' + JSON.stringify(u));
  await shot(page, '07_armory_deployed'); await ctx.close(); }
// 高さのお試し
{ const { ctx, page } = await open('?altdemo=1');
  await page.waitForFunction(() => window.__botCommander?.ready, null, { timeout: 60000 });
  await page.evaluate(() => { const { r } = window.__botCommander; r.cam.zoom = 1.6; r.cam.x = 20.5 * 32; r.cam.y = 42 * 32; r.clampCam(); });
  await wait(page, 6000); await shot(page, '08_altdemo'); await ctx.close(); }
// 会話
{ const { ctx, page } = await open('?dialogdemo=1');
  await wait(page, 6000); await shot(page, '09_dialog'); await ctx.close(); }
console.log(JSON.stringify({ out: OUT, logs }, null, 1));
await browser.close();
