import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { localTestServer } from './local-test-server.mjs';

let playwright;
try { playwright = createRequire(import.meta.url)('playwright'); }
catch {
  playwright = createRequire(path.join(process.env.USERPROFILE,
    '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs'))('playwright');
}
const local = process.env.COLOR_ANTS_ORIGIN ? null : await localTestServer();
const out = 'color-ants/docs/validation/v2.8.1', origin = process.env.COLOR_ANTS_ORIGIN || local.origin;
mkdirSync(out, { recursive: true });
const report = { version: '2.8.1', fixture: 'penguin photo-like residual art, prepared in disposable storage; not the exact photographed save', errors: [], layouts: [] };
const browser = await playwright.chromium.launch({ channel: 'chrome', headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
  const page = await context.newPage();
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400) report.errors.push(`${r.status()} ${r.url()}`); });
  await page.goto(origin);
  await page.locator('[data-game-id="color-ants"]').click();
  await page.locator('#ca-canvas').waitFor();
  await page.evaluate(async () => {
    const g = (await import('/color-ants/js/index.js')).default;
    cancelAnimationFrame(g.animId);
    const art = await import('/color-ants/js/pictures.js?v=12');
    const puzzle = await import('/color-ants/js/puzzle.js?v=13');
    window.visibilityQA = { g, art, puzzle };
    window.preparePenguin = ({ legacy = false, wingsGone = false } = {}) => {
      const { g, art, puzzle } = visibilityQA;
      g.level = 9; g.startLevel();
      const pic = art.buildPicture(art.PICTURE_DEFS.find(d => d.id === 'penguin'));
      for (const p of pic.pixels) {
        if (legacy) p.key = p.paintKey;
        if (['coat', 'ice'].includes(p.paintKey) || p.paintKey === 'beak' && p.gy > 50 || wingsGone && p.paintKey === 'outline') p.eaten = true;
      }
      g.picture = pic; g.colony.reset(pic, Math.random, { slotCount: 3, maxSlots: 4 }); g.applyLayout();
      g.colony.remaining = g.colony.targetPixels.filter(p => !p.eaten).length;
      g.colony.delivered = g.colony.total - g.colony.remaining;
      g.columns = puzzle.buildTiles(art.countByKey(pic.pixels.filter(p => !p.eaten)), puzzle.mulberry32(9), { cols: 5, pixels: pic.pixels, level: 1, target: 24 });
      const put = (key, n, ci) => {
        // Reserve the same credit from the actual remaining columns, keeping per-color totals consistent.
        let left = n;
        for (const col of g.columns) for (let i = 0; i < col.length && left;) {
          if (col[i].key !== key) { i++; continue; }
          const take = Math.min(left, col[i].n); left -= take; col[i].n -= take;
          if (!col[i].n) col.splice(i, 1); else i++;
        }
        if (left) throw new Error(`not enough ${key} credit in fixture`);
        g.colony.addTileToSlot({ key, n }, pic.palette[key], ci);
      };
      put(legacy ? 'eye' : 'outline', 21, 0); put('beak', 17, 4);
      g.colony.slots[2] = g.colony.slots[1]; g.colony.slots[1] = null;
      g.renderSlots(); g.renderTiles(); g.updateCounter(); g.renderer.render(g.colony, g.lw, g.lh);
      const summary = () => ({ states: g.colony.slots.map(s => g.colony.slotState(s)), markers: [...g.slotsEl.querySelectorAll('.ca-slot-cue')].filter(e => !e.hidden).map(e => e.textContent), guide: g.guideEl.textContent });
      return summary();
    };
  });

  report.legacy = await page.evaluate(() => {
    const summary = preparePenguin({ legacy: true }), g = visibilityQA.g;
    const cue = g.colony.blockedCue('eye');
    return { ...summary, exposedWingCells: g.colony.targetPixels.filter(p => p.paintKey === 'outline' && g.colony.isExposed(p)).length,
      eyeCells: cue.targets.length, wallColors: [...new Set(cue.barriers.map(p => p.key))] };
  });
  assert.equal(report.legacy.states[0], 'blocked');
  assert(report.legacy.exposedWingCells > 0 && report.legacy.eyeCells > 0);
  assert.deepEqual(report.legacy.markers, ['1', '3']);
  await page.screenshot({ path: `${out}/penguin-legacy-explained.png` });

  report.current = await page.evaluate(() => {
    const summary = preparePenguin(), g = visibilityQA.g;
    for (let i = 0; i < 36; i++) g.colony.update(1 / 60, 2);
    g.updateSlots(); g.updateCounter(); g.renderer.render(g.colony, g.lw, g.lh);
    return { ...summary, ants: g.colony.ants.length, navyTargets: [...new Set(g.colony.ants.filter(a => a.slotIndex === 0).map(a => a.px.paintKey))], after: g.colony.slotState(g.colony.slots[0]) };
  });
  assert.equal(report.current.states[0], 'ready');
  assert(report.current.ants > 0 && report.current.navyTargets.includes('outline'));
  assert.notEqual(report.current.after, 'blocked');
  await page.screenshot({ path: `${out}/penguin-navy-dispatch.png` });

  report.enclosed = await page.evaluate(() => {
    const summary = preparePenguin({ wingsGone: true }), g = visibilityQA.g;
    const before = JSON.stringify({ pixels: g.picture.pixels, slots: g.colony.slots, boosts: g.boosts, storage: { ...localStorage } });
    const cacheKey = g.renderer.waitKey;
    for (let i = 0; i < 10; i++) g.renderer.render(g.colony, g.lw, g.lh);
    const cue = g.colony.blockedCue('outline'), bitmap = g.renderer.waitOverlay.getContext('2d').getImageData(0, 0, g.renderer.waitOverlay.width, g.renderer.waitOverlay.height).data;
    const after = JSON.stringify({ pixels: g.picture.pixels, slots: g.colony.slots, boosts: g.boosts, storage: { ...localStorage } });
    return { ...summary, eyeParts: cue.components.length, wallColors: [...new Set(cue.barriers.map(p => p.key))], unchanged: before === after, cacheReused: cacheKey === g.renderer.waitKey,
      drawn: bitmap.some((v, i) => i % 4 === 3 && v > 0), version: g.container.querySelector('.ca-version').textContent };
  });
  assert.equal(report.enclosed.states[0], 'blocked');
  assert.equal(report.enclosed.eyeParts, 2);
  assert.deepEqual(report.enclosed.wallColors, ['belly']);
  assert(report.enclosed.unchanged && report.enclosed.cacheReused && report.enclosed.drawn);
  assert.equal(report.enclosed.version, '2.8.1');
  await page.screenshot({ path: `${out}/penguin-eyes-explained.png` });
  for (const [name, width, height] of [['small', 320, 568], ['landscape', 844, 390]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const layout = await page.evaluate(() => {
      const g = visibilityQA.g; g.renderer.render(g.colony, g.lw, g.lh);
      const guide = g.guideEl.getBoundingClientRect();
      return { guideFits: g.guideEl.scrollWidth <= g.guideEl.clientWidth + 1, guideVisible: guide.bottom <= innerHeight && guide.top >= 0,
        markers: [...g.slotsEl.querySelectorAll('.ca-slot-cue')].filter(e => !e.hidden).map(e => e.textContent),
        countsClear: [...g.slotsEl.querySelectorAll('.has-status')].every(el => el.querySelector('.ca-slot-num').getBoundingClientRect().bottom <= el.querySelector('.ca-slot-badge').getBoundingClientRect().top + .5) };
    });
    report.layouts.push({ name, width, height, ...layout });
    assert(layout.guideFits && layout.guideVisible && layout.countsClear, `${name}: cue layout overflow`);
    assert.deepEqual(layout.markers, ['1', '3']);
    await page.screenshot({ path: `${out}/penguin-eyes-${name}.png` });
  }
  assert.deepEqual(report.errors, []);
} finally {
  writeFileSync(`${out}/visibility-report.json`, JSON.stringify(report, null, 2) + '\n');
  await browser.close();
  await local?.close();
}
console.log(JSON.stringify(report, null, 2));
