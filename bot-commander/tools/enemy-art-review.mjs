// Browser QA / contact sheets for the art library (no real saves or gameplay state).
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || 'playwright-core');
const out = resolve('bot-commander/docs/enemy-art/previews'); await mkdir(out, { recursive: true });
const catalog = JSON.parse(await readFile('bot-commander/docs/enemy-art/catalog.json', 'utf8'));
const browser = await chromium.launch({ executablePath: process.env.CHROME });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, serviceWorkers: 'block' });
const page = await ctx.newPage(), errors = [], missing = [];
page.on('pageerror', e => errors.push(e.message));
page.on('response', r => { if (r.status() >= 400) missing.push({ url: r.url(), status: r.status() }); });
await page.goto((process.env.URL || 'http://127.0.0.1:8766/') + 'bot-commander/docs/enemy-art/');
await page.waitForFunction(() => window.__enemyArtGallery?.catalog);
const result = { expected: 59, ready: catalog.ready, filters: {} };
result.fullImages = await page.evaluate(async () => {
  const rows = [];
  for (const entry of window.__enemyArtGallery.catalog.entries) {
    if (entry.status !== 'ready') continue;
    const image = new Image(); image.src = new URL('../../' + entry.image, location.href).href; await image.decode();
    rows.push({ id: entry.id, width: image.naturalWidth, height: image.naturalHeight });
  }
  return rows;
});
if (result.fullImages.some(e => e.width !== 1024 || e.height !== 1024)) throw Error('full image dimensions');
for (const group of ['G','A','S','U','X','L','B']) {
  await page.locator(`[data-group="${group}"]`).click();
  const expected = catalog.entries.filter(e => e.id[0] === group).length;
  const count = await page.locator('.card').count();
  if (count !== expected) throw Error(`${group}: ${count} != ${expected}`);
  await page.evaluate(async () => { for (const image of document.querySelectorAll('.card img')) { image.loading = 'eager'; await image.decode(); } });
  result.filters[group] = count;
  await page.screenshot({ path: resolve(out, `roster-${group}.png`), fullPage: true });
}
await page.locator('[data-group="all"]').click();
await page.locator('#search').fill('G01'); result.searchCount = await page.locator('.card').count();
if (result.searchCount !== 1) throw Error('search');
await page.locator('[data-id="G01"]').click();
await page.locator('#hero').evaluate(image => image.decode());
await page.locator('#zoom').evaluate(input => { input.value = '600'; input.dispatchEvent(new Event('input')); });
await page.screenshot({ path: resolve(out, 'G01-close.png') });
await page.locator('#flip').check(); await page.locator('#trio').check();
result.flip = await page.locator('#hero').evaluate(e => getComputedStyle(e).transform);
result.trio = await page.locator('#stage').evaluate(e => e.classList.contains('trio'));
await page.screenshot({ path: resolve(out, 'G01-group.png') });
await page.locator('#close').click(); await page.locator('#search').fill('');
await page.setViewportSize({ width: 390, height: 844 });
await page.locator('[data-group="G"]').click();
await page.screenshot({ path: resolve(out, 'mobile-roster.png'), fullPage: true });
await page.locator('[data-id="G01"]').click();
await page.locator('#hero').evaluate(image => image.decode());
await page.screenshot({ path: resolve(out, 'mobile-detail.png') });
result.mobile = await page.evaluate(() => ({ viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, dialogWidth: document.querySelector('dialog').getBoundingClientRect().width }));
if (result.mobile.documentWidth > result.mobile.viewport + 1) throw Error('page overflow');
if (!result.trio || !result.flip.includes('-1')) throw Error('view controls');
result.errors = errors; result.missing = missing;
await writeFile(resolve(out, 'browser-checks.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
await browser.close();
if (errors.length || missing.length || process.env.REQUIRE_ALL === '1' && catalog.ready !== 59) process.exitCode = 1;
