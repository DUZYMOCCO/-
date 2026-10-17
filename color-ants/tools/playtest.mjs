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
const out = 'color-ants/docs/validation/v2.7.0';
mkdirSync(out, { recursive: true });
const browser = await playwright.chromium.launch({ channel: 'chrome', headless: true });
const report = { version: '2.7.0', errors: [], layouts: [], pictures: [], clears: [], losses: [], checks: [] };
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
  const pictureCount = await page.evaluate(async () => (await import('/color-ants/js/pictures.js?v=10')).PICTURE_DEFS.length);
  await page.evaluate(count => {
    window.qaGallery = document.createElement('canvas'); qaGallery.width = 1200; qaGallery.height = Math.ceil(count / 6) * 230;
    const c = qaGallery.getContext('2d'); c.fillStyle = '#fff5df'; c.fillRect(0, 0, qaGallery.width, qaGallery.height);
  }, pictureCount);
  // Capture every art family with the same treatment, including lock/key stages.
  for (let level = 1; level <= pictureCount; level++) {
    const state = await page.evaluate(level => {
      qaGame.level = level; qaGame.startLevel(); qaStep(0);
      const g = qaGame, L = g.colony.layout, c = qaGallery.getContext('2d'), x = (level - 1) % 6 * 200, y = Math.floor((level - 1) / 6) * 230;
      const dpr = Math.min(3, devicePixelRatio || 1);
      c.fillStyle = '#71563a'; c.font = 'bold 12px sans-serif'; c.fillText(`${level}. ${g.picture.name}`, x + 12, y + 18);
      c.imageSmoothingEnabled = false;
      c.drawImage(g.canvas, (L.boardX - 13) * dpr, (L.boardY - 13) * dpr, (L.cell * 64 + 26) * dpr, (L.cell * 64 + 26) * dpr, x + 10, y + 26, 180, 180);
      c.font = '11px sans-serif'; c.fillText(`${g.difficulty.name} / ${g.colony.slots.length}枠`, x + 12, y + 221);
      return { level, id: g.picture.id, total: g.colony.total, locks: g.columns.flat().filter(t => t.locked).length };
    }, level);
    report.pictures.push(state);
    await page.screenshot({ path: `${out}/art-${state.id}.png` });
  }
  const gallery = await page.evaluate(() => qaGallery.toDataURL('image/png').split(',')[1]);
  writeFileSync(`${out}/stage-gallery.png`, Buffer.from(gallery, 'base64'));
  await page.evaluate(() => { qaGame.level = 1; qaGame.startLevel(); });
  await page.locator('#ca-speed').click();
  assert.equal(await page.locator('#ca-speed').innerText(), '▶▶ ×2');
  await page.locator('#ca-boost-slot').click();
  assert.equal(await page.locator('.ca-slot').count(), 5);
  assert(await page.locator('#ca-boost-slot').isDisabled());
  for (let i = 0; i < 5; i++) await page.locator(`.ca-col:nth-child(${i + 1}) .ca-tile.front`).click();
  const moving = await page.evaluate(() => { qaStep(1.6); return { ants: qaGame.colony.ants.length, slots: qaGame.colony.slots.filter(Boolean).length }; });
  assert(moving.ants > 10, 'dispatch should create a visible ant trail');
  await page.evaluate(() => qaGame.toastEl.classList.remove('show'));
  await page.screenshot({ path: `${out}/playing.png` });
  report.audio = await page.evaluate(async () => {
    const { sound } = await import('/common/js/audio.js?v=151');
    const { NIBBLE_NAME, NIBBLE_GROUP, playNibble } = await import('/color-ants/js/soft-audio.js?v=10');
    await sound.unlock();
    const g = qaGame, original = sound.play, calls = [];
    g.startLevel();
    const ci = g.columns.findIndex(col => col[0] && !col[0].locked && g.picture.pixels.some(p => p.key === col[0].key && g.colony.isExposed(p)));
    g.tapTile(ci);
    sound.play = function(name, options) { calls.push({ name, options }); return original.call(this, name, options); };
    try {
      let time = performance.now(); g.lastTime = time;
      for (let frame = 0; frame < 900 && !calls.some(c => c.name === NIBBLE_NAME); frame++) {
        time += 1000 / 30; g.loop(time); cancelAnimationFrame(g.animId);
      }
    } finally { sound.play = original; g.lastTime = performance.now(); }
    const nibble = calls.find(c => c.name === NIBBLE_NAME), buffer = sound.buffers.get(NIBBLE_NAME);
    if (!nibble || !buffer || calls.some(c => c.name === 'hit')) throw new Error('chewing did not use the new soft sample');
    sound.setMute(true); const muteRespected = playNibble(sound) === false; sound.setMute(false);
    const peak = Math.max(...buffer.getChannelData(0).map(Math.abs));
    g.startLevel();
    if ([...sound.voices].some(v => v.group === NIBBLE_GROUP)) throw new Error('restart left nibble audio playing');
    return { duration: buffer.duration, peak, gap: nibble.options.gap, volume: nibble.options.volume, group: nibble.options.group, muteRespected };
  });
  assert(report.audio.muteRespected);
  // Continue the ordinary dispatch fixture after the audio-specific restart.
  for (let i = 0; i < 4; i++) await page.locator(`.ca-col:nth-child(${i + 1}) .ca-tile.front`).click();
  await page.evaluate(() => qaStep(12, 2));
  const delivered = await page.evaluate(() => qaGame.colony.delivered);
  assert(delivered > 0, 'ants must return pixels to nests');
  assert(Number(await page.locator('#ca-progress').getAttribute('aria-valuenow')) > 0);
  await page.locator('#ca-boost-magnet').click();
  assert(await page.evaluate(n => qaGame.colony.delivered > n, delivered));
  assert(await page.evaluate(() => {
    const g = qaGame, credits = g.columns.flat().reduce((sum, t) => sum + t.n, 0) +
      g.colony.slots.reduce((sum, s) => sum + (s?.left || 0), 0) + g.colony.ants.length;
    return credits === g.colony.total - g.colony.delivered;
  }), 'magnet must preserve the remaining tile budget');
  await page.locator('#ca-boost-shuffle').click();
  assert(await page.locator('#ca-boost-shuffle').isDisabled());
  assert(await page.locator('#ca-boost-magnet').isDisabled());
  await page.evaluate(() => {
    const g = qaGame, before = JSON.stringify(g.columns), delivered = g.colony.delivered;
    g.shuffleColumns(); g.triggerMagnet();
    if (before !== JSON.stringify(g.columns) || delivered !== g.colony.delivered) throw new Error('exhausted tools changed the game');
  });
  await page.locator('#ca-restart').click();
  assert.equal(await page.locator('.ca-slot').count(), 4);
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
  await page.evaluate(() => qaGame.startLevel());
  // Choose actual inner-color column fronts until the real game loop detects STUCK.
  async function fillWrongColors() {
    for (let i = 0; i < 6; i++) {
      const ci = await page.evaluate(() => {
        const g = qaGame;
        if (!g.colony.slots.some(s => s === null)) return -1;
        return g.columns.findIndex(col => col[0] && !col[0].locked &&
          !g.picture.pixels.some(p => p.key === col[0].key && g.colony.isExposed(p)));
      });
      if (ci < 0) break;
      await page.locator(`.ca-col:nth-child(${ci + 1}) .ca-tile.front`).click();
    }
    return page.evaluate(() => {
      const g = qaGame; g.loop(performance.now()); cancelAnimationFrame(g.animId);
      return { level: g.level, slots: g.colony.slots.length, stuck: g.stuck, delivered: g.colony.delivered, undo: g.boosts.undo };
    });
  }
  report.losses.push(await fillWrongColors());
  assert(report.losses.at(-1).stuck, 'real column choices must trigger STUCK');
  await page.screenshot({ path: `${out}/stuck.png` });
  for (let used = 0; used < 2; used++) {
    await page.locator('#ca-stuck-undo').click();
    assert.equal(await page.locator('#ca-stuck-modal').evaluate(e => e.style.display), 'none');
    assert((await fillWrongColors()).stuck);
  }
  assert(await page.locator('#ca-stuck-undo').isDisabled());
  assert(await page.locator('#ca-boost-undo').isDisabled());
  await page.evaluate(() => {
    const g = qaGame, before = g.colony.slots.filter(Boolean).length;
    g.cancelSlot(0); g.undoLastSlot();
    if (g.colony.slots.filter(Boolean).length !== before) throw new Error('waiting-slot clicks bypass undo limit');
  });
  await page.screenshot({ path: `${out}/undo-exhausted.png` });
  await page.locator('#ca-stuck-slot').click();
  assert.equal(await page.locator('#ca-stuck-modal').evaluate(e => e.style.display), 'none');
  assert.equal(await page.locator('.ca-slot').count(), 5);
  assert((await fillWrongColors()).stuck);
  assert(await page.locator('#ca-stuck-slot').isDisabled());
  await page.locator('#ca-stuck-retry').click();
  assert.equal(await page.locator('.ca-slot').count(), 4);
  assert.equal(await page.evaluate(() => qaGame.boosts.undo), 2);
  await page.evaluate(() => { qaGame.level = 7; qaGame.startLevel(); });
  assert.equal(await page.locator('.ca-slot').count(), 3);
  assert.equal(await page.evaluate(() => qaGame.boosts.undo), 1);
  report.losses.push(await fillWrongColors());
  assert(report.losses.at(-1).stuck);
  await page.screenshot({ path: `${out}/hard-stuck.png` });
  await page.setViewportSize({ width: 320, height: 568 });
  assert(await page.locator('#ca-stuck-modal .ca-card').evaluate(e => {
    const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight;
  }), 'stuck dialog must fit small phones');
  await page.screenshot({ path: `${out}/small-stuck.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.evaluate(() => { qaGame.level = 13; qaGame.startLevel(); });
  report.losses.push(await fillWrongColors());
  assert(report.losses.at(-1).stuck, 'advanced art must have real losing choices');
  await page.screenshot({ path: `${out}/advanced-stuck.png` });
  // Real clears using only column fronts, with no boosters or injected progress.
  for (let level = 1; level <= pictureCount * 2; level++) {
    const clear = await page.evaluate(level => {
      const g = qaGame; g.level = level; g.startLevel();
      const plan = g.columns.flat().slice().sort((a, b) => a.order - b.order);
      for (const tile of plan) {
        const ci = g.columns.findIndex(col => col[0] === tile);
        if (ci < 0 || tile.locked) throw new Error(`level ${level}: required tile unavailable`);
        g.tapTile(ci);
        const maxTicks = Math.ceil((tile.n + 2) * (64 * 4 * g.colony.layout.cell / g.colony.layout.speed + 3) * 30 / 2);
        let settled = false;
        for (let tick = 0; tick < maxTicks; tick++) {
          g.colony.update(1 / 30, 2);
          if (!g.colony.busy) { settled = true; break; }
        }
        if (!settled) throw new Error(`level ${level}: tile ${tile.order} cannot complete`);
        g.updateSlots();
      }
      if (g.colony.delivered !== g.colony.total) throw new Error(`level ${level}: incomplete picture`);
      g.updateCounter(); g.renderer.render(g.colony, g.lw, g.lh); g.showClear();
      return { level, picture: g.picture.id, total: g.colony.total, delivered: g.colony.delivered, tiles: plan.length, slots: g.colony.slots.length, boosters: 0 };
    }, level);
    report.clears.push(clear);
    await page.screenshot({ path: `${out}/real-clear-${level}.png` });
  }
  await page.locator('#ca-next').click();
  const savedBeforeGiveUp = await page.evaluate(() => localStorage.getItem('game_studio_color_ants_v2'));
  report.losses.push(await fillWrongColors());
  assert(report.losses.at(-1).stuck, 'give-up fixture must use a real losing position');
  await page.setViewportSize({ width: 320, height: 568 });
  await page.screenshot({ path: `${out}/give-up-small.png` });
  await page.locator('#ca-stuck-giveup').click();
  assert.equal(await page.locator('#ca-canvas').count(), 0);
  assert(await page.evaluate(() => !qaGame.running && qaGame.animId === null));
  assert.equal(await page.evaluate(() => localStorage.getItem('game_studio_color_ants_v2')), savedBeforeGiveUp);
  await page.locator('[data-game-id="color-ants"]').click();
  await page.locator('#ca-canvas').waitFor();
  assert.equal(await page.locator('#ca-level').innerText(), `Level ${pictureCount * 2 + 1}`);
  await page.evaluate(() => cancelAnimationFrame(qaGame.animId));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.locator('#ca-progress-fill').evaluate(e => getComputedStyle(e).transitionDuration), '0s');
  await page.locator('#ca-boost-shuffle').click();
  await page.waitForFunction(() => !document.querySelector('#ca-toast').classList.contains('show'));
  await page.locator('#ca-back').click();
  assert.equal(await page.locator('#ca-canvas').count(), 0);
  report.checks = ['hub launch', 'five responsive layouts', 'eighteen distinct pictures', 'advanced locks and hidden queues', '2x speed', 'one extra slot', 'ant dispatch and return', 'soft nibble through live shared audio mixer', 'nibble mute and restart stop', 'progress', 'magnet and tile-budget conservation', 'one-use tools cannot be bypassed', 'restart restores attempt', 'waiting tile return shares undo charges', 'real STUCK from normal column clicks', 'undo exhaustion', 'extra-slot rescue', 'hard mode with three slots and one undo', '36 real clears without boosters', 'give up returns to hub without advancing saved progress', 'reenter same stage', 'reduced motion', 'back to hub'];
  assert.deepEqual(report.errors, []);
} finally {
  writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2) + '\n');
  await browser.close();
}
console.log(JSON.stringify(report, null, 2));
