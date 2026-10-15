import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

// Use a normal project installation, or the bundled desktop browser runtime.
let playwright;
try { playwright = createRequire(import.meta.url)('playwright'); }
catch {
  playwright = createRequire(path.join(process.env.USERPROFILE,
    '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs'))('playwright');
}
const origin = process.env.COLOR_ANTS_ORIGIN || 'http://127.0.0.1:8000';
const out = 'color-ants/docs/validation/v2.4.0';
mkdirSync(out, { recursive: true });
const browser = await playwright.chromium.launch({ channel: 'chrome', headless: true });
const report = { version: '2.4.0', errors: [], layouts: [], pictures: [], checks: [] };
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
const page = await context.newPage();
page.on('pageerror', e => report.errors.push(e.message));
page.on('response', r => { if (r.status() >= 400) report.errors.push(`${r.status()} ${r.url()}`); });
try {
  await page.goto(origin);
  await page.locator('[data-game-id="color-ants"]').click();
  await page.locator('#ca-canvas').waitFor();
  await page.evaluate(async () => {
    window.qaGame = (await import('/color-ants/js/index.js')).default;
    cancelAnimationFrame(qaGame.animId);
    window.qaStep = (seconds, speed = 1) => {
      for (let t = 0; t < seconds; t += 1 / 60) qaGame.colony.update(1 / 60, speed);
      qaGame.updateSlots(); qaGame.updateCounter();
      qaGame.renderer.render(qaGame.colony, qaGame.lw, qaGame.lh);
    };
  });

  for (const [name, width, height] of [['mobile', 390, 844], ['small', 320, 568], ['compact', 375, 667], ['desktop', 1280, 900], ['landscape', 844, 390]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const layout = await page.evaluate(() => {
      const g = qaGame, L = g.colony.layout;
      g.renderer.render(g.colony, g.lw, g.lh);
      const rect = s => { const b = document.querySelector(s).getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
      return { canvas: rect('#ca-wrap'), panel: rect('.ca-panel'), board: { x: L.boardX, y: L.boardY, size: L.cell * 64 },
        mysteryVisible: [...document.querySelectorAll('.ca-tile.mystery')].every(e => e.getBoundingClientRect().height > 0),
        controlsFit: [...document.querySelectorAll('.ca-boost-btn, .ca-tile.front, .ca-slot')].every(e => { const r = e.getBoundingClientRect(); return r.x >= 0 && r.y >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1; }) };
    });
    assert(layout.controlsFit, `${name}: controls overflow`);
    assert(layout.mysteryVisible, `${name}: mystery tiles hidden by shared CSS`);
    assert(layout.board.x >= 10 && layout.board.y + layout.board.size <= layout.canvas.h - 25, `${name}: board clipped`);
    assert(layout.board.size >= 160, `${name}: puzzle too small to read`);
    report.layouts.push({ name, width, height, ...layout });
    await page.screenshot({ path: `${out}/${name}.png` });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  // Capture every art family with the same treatment, including lock/key stages.
  for (let level = 1; level <= 6; level++) {
    const state = await page.evaluate(level => {
      qaGame.level = level; qaGame.startLevel(); qaStep(0);
      return { level, id: qaGame.picture.id, total: qaGame.colony.total, locks: qaGame.columns.flat().filter(t => t.locked).length };
    }, level);
    report.pictures.push(state);
    await page.screenshot({ path: `${out}/art-${state.id}.png` });
  }
  await page.evaluate(() => { qaGame.level = 1; qaGame.startLevel(); });
  await page.locator('#ca-speed').click();
  assert.equal(await page.locator('#ca-speed').innerText(), '▶▶ ×2');
  await page.locator('#ca-boost-slot').click();
  assert.equal(await page.locator('.ca-slot').count(), 6);
  assert(await page.locator('#ca-boost-slot').isDisabled());
  for (let i = 0; i < 5; i++) await page.locator(`.ca-col:nth-child(${i + 1}) .ca-tile.front`).click();
  const moving = await page.evaluate(() => { qaStep(1.6); return { ants: qaGame.colony.ants.length, slots: qaGame.colony.slots.filter(Boolean).length }; });
  assert(moving.ants > 10, 'dispatch should create a visible ant trail');
  await page.evaluate(() => qaGame.toastEl.classList.remove('show'));
  await page.screenshot({ path: `${out}/playing.png` });
  await page.evaluate(() => qaStep(12, 2));
  const delivered = await page.evaluate(() => qaGame.colony.delivered);
  assert(delivered > 0, 'ants must return pixels to nests');
  assert(Number(await page.locator('#ca-progress').getAttribute('aria-valuenow')) > 0);
  await page.locator('#ca-boost-magnet').click();
  assert(await page.evaluate(n => qaGame.colony.delivered > n, delivered));
  await page.locator('#ca-boost-shuffle').click();
  await page.locator('#ca-restart').click();
  assert.equal(await page.locator('.ca-slot').count(), 5);
  assert.equal(await page.locator('#ca-progress-text').innerText(), '0%');
  // Put a real, unexposed seed tile at the front to exercise return/undo.
  await page.evaluate(() => {
    const cols = qaGame.columns, ci = cols.findIndex(c => c.some(t => t.key === 'seed'));
    const i = cols[ci].findIndex(t => t.key === 'seed');
    const [tile] = cols[ci].splice(i, 1); cols[0].unshift(tile); qaGame.renderTiles();
  });
  await page.locator('.ca-col:first-child .ca-tile.front').click();
  assert.equal(await page.locator('.ca-slot.waiting').count(), 1);
  await page.locator('.ca-slot.waiting').click();
  assert.equal(await page.locator('.ca-slot.waiting').count(), 0);
  await page.locator('.ca-col:first-child .ca-tile.front').click();
  await page.locator('#ca-boost-undo').click();
  assert.equal(await page.locator('.ca-slot.waiting').count(), 0);
  await page.evaluate(() => {
    for (let i = 0; i < 5; i++) qaGame.colony.addTileToSlot({ key: 'seed', n: 10 }, qaGame.picture.palette.seed, 0);
    if (!qaGame.colony.isStuck()) throw new Error('fixture must be stuck');
    qaGame.renderSlots(); qaGame.showStuck();
  });
  await page.screenshot({ path: `${out}/stuck.png` });
  await page.locator('#ca-stuck-undo').click();
  assert.equal(await page.locator('#ca-stuck-modal').evaluate(e => e.style.display), 'none');
  await page.evaluate(() => { qaGame.startLevel(); qaGame.colony.delivered = qaGame.colony.total; qaGame.updateCounter(); qaGame.showClear(); });
  await page.screenshot({ path: `${out}/clear.png` });
  await page.locator('#ca-next').click();
  assert.equal(await page.locator('#ca-level').innerText(), 'Level 2');
  assert.equal(await page.locator('#ca-modal').evaluate(e => e.style.display), 'none');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.locator('#ca-progress-fill').evaluate(e => getComputedStyle(e).transitionDuration), '0s');
  await page.locator('#ca-boost-shuffle').click();
  await page.waitForFunction(() => !document.querySelector('#ca-toast').classList.contains('show'));
  await page.locator('#ca-back').click();
  assert.equal(await page.locator('#ca-canvas').count(), 0);
  report.checks = ['hub launch', 'five responsive layouts', 'six pictures', 'four visible tile rows', '2x speed', 'sixth slot', 'ant dispatch and return', 'progress', 'magnet', 'shuffle', 'restart', 'waiting tile return', 'undo', 'stuck dialog and rescue (fixture)', 'clear dialog and next level (fixture)', 'reduced motion', 'back to hub'];
  assert.deepEqual(report.errors, []);
} finally {
  writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2) + '\n');
  await browser.close();
}
console.log(JSON.stringify(report, null, 2));
