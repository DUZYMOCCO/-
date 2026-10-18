import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

// Read-only deployment check. Chrome uses a disposable profile and never opens a real save.
const base = new URL(process.env.COLOR_ANTS_PUBLIC_URL || 'https://duzymocco.github.io/-/');
if (!base.pathname.endsWith('/')) base.pathname += '/';
const catalog = { GAME_ASSETS: {} };
new Function('self', await readFile('color-ants/sw-assets.js', 'utf8'))(catalog);
const release = catalog.GAME_ASSETS['color-ants'];
const out = `color-ants/docs/validation/v${release.gameVersion}`;
await mkdir(out, { recursive: true });
const report = { url: base.href, version: release.gameVersion, checkedAt: new Date().toISOString(), errors: [], assets: [] };
const normalize = value => value.replaceAll('\r\n', '\n');
const hash = value => createHash('sha256').update(normalize(value)).digest('hex');
let browser;
try {
  // Check every shipped game asset, including files whose import query did not change.
  for (const name of ['sw-assets.js', ...release.files]) {
    const relative = `color-ants/${name}`, url = new URL(relative, base);
    url.searchParams.set('release-check', Date.now());
    const response = await fetch(url, { cache: 'no-store' });
    assert.equal(response.status, 200, relative);
    const actual = hash(await response.text()), expected = hash(await readFile(relative, 'utf8'));
    report.assets.push({ file: relative, sha256: actual, matches: actual === expected });
    assert.equal(actual, expected, `Published content differs: ${relative}`);
  }
  let playwright;
  try { playwright = createRequire(import.meta.url)('playwright'); }
  catch {
    playwright = createRequire(path.join(process.env.USERPROFILE,
      '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs'))('playwright');
  }
  browser = await playwright.chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) report.errors.push(`${response.status()} ${response.url()}`); });
  await page.goto(base.href);
  await page.locator('[data-game-id="color-ants"]').click();
  await page.locator('#ca-canvas').waitFor();
  report.headerVersion = await page.locator('.ca-version').textContent();
  assert.equal(report.headerVersion, release.gameVersion);
  const targetColumn = await page.evaluate(async base => {
    const g = (await import(new URL('color-ants/js/index.js', base))).default;
    const { sound } = await import(new URL('common/js/audio.js?v=151', base));
    await sound.unlock();
    window.publicQA = { g, sound, calls: [], originalPlay: sound.play };
    sound.play = function(name, options) {
      const played = publicQA.originalPlay.call(this, name, options);
      if (played) publicQA.calls.push({ name, at: this.ctx.currentTime });
      return played;
    };
    g.level = 9; g.startLevel(); g.colony.ensurePerimeter();
    const eyes = g.picture.pixels.filter(p => p.paintKey === 'eye');
    if (!eyes.length || eyes.some(p => p.key !== 'outline')) throw new Error('Navy eyes use an obsolete food key');
    return g.columns.findIndex(col => col[0] && !col[0].locked && g.colony.exposedColors.get(col[0].key)?.free > 0);
  }, base.href);
  assert(targetColumn >= 0, 'No exposed food at stage 9');
  await page.locator(`.ca-col:nth-child(${targetColumn + 1}) .ca-tile.front`).click();
  await page.waitForFunction(() => publicQA.calls.some(call => call.name === 'color-ants-chopi-v1'), undefined, { timeout: 25000 });
  report.runtime = await page.evaluate(() => ({
    level: publicQA.g.level,
    picture: publicQA.g.picture.id,
    navyEyesGrouped: publicQA.g.picture.pixels.filter(p => p.paintKey === 'eye').every(p => p.key === 'outline'),
    sample: publicQA.calls.find(call => call.name === 'color-ants-chopi-v1').name,
    sampleDuration: publicQA.sound.buffers.get('color-ants-chopi-v1').duration,
    headerFits: document.querySelector('.ca-header').getBoundingClientRect().right <= innerWidth,
    serviceWorkers: 'blocked; fresh network runtime, cache upgrade tested separately'
  }));
  assert.equal(report.runtime.sampleDuration, .185);
  assert(report.runtime.headerFits);
  await page.screenshot({ path: `${out}/public.png` });
  await page.locator('#ca-back').click();
  assert.equal(await page.locator('#ca-canvas').count(), 0);
  assert.deepEqual(report.errors, []);
} catch (error) {
  report.failure = error.message;
  throw error;
} finally {
  await browser?.close();
  await writeFile(`${out}/public-report.json`, JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify(report, null, 2));
