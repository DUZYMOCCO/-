import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

// Disposable origin/profile: exercise the old sound -> current release upgrade without touching a real save.
const root = process.cwd(), catalog = { GAME_ASSETS: {} };
new Function('self', await readFile(path.join(root, 'color-ants/sw-assets.js'), 'utf8'))(catalog);
const release = catalog.GAME_ASSETS['color-ants'];
const currentCache = `game-color-ants-${release.version}`, out = `color-ants/docs/validation/v${release.gameVersion}`;
const baseline = process.env.COLOR_ANTS_AUDIO_BASE || 'b5df42d';
const oldFiles = new Map(['sw-assets.js', 'js/index.js', 'js/soft-audio.js'].map(file => {
  const name = `color-ants/${file}`;
  return [name, execFileSync('git', ['show', `${baseline}:${name}`], { cwd: root })];
}));
let latest = false;
const updates = [];
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.wav': 'audio/wav', '.webmanifest': 'application/manifest+json' };
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let file = path.resolve(root, `.${pathname}`);
    if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    const relative = path.relative(root, file).replaceAll('\\', '/');
    if (relative === 'sw.js' || relative === 'color-ants/sw-assets.js') updates.push({ file: relative, latest });
    const body = !latest && oldFiles.has(relative) ? oldFiles.get(relative) : await readFile(file);
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(body);
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let playwright;
try { playwright = createRequire(import.meta.url)('playwright'); }
catch {
  playwright = createRequire(path.join(process.env.USERPROFILE,
    '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs'))('playwright');
}
mkdirSync(out, { recursive: true });
const report = { version: release.gameVersion, errors: [], denseEating: [] };
let browser;
let context;
try {
  browser = await playwright.chromium.launch({ channel: 'chrome', headless: true });
  context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller && caches.has('game-color-ants-v10'));
  await page.locator('[data-game-id="color-ants"]').click();
  report.before = await page.evaluate(async () => {
    const { sound } = await import('/common/js/audio.js?v=151');
    const old = await import('/color-ants/js/soft-audio.js?v=10');
    await sound.unlock();
    return { sample: old.NIBBLE_NAME, gap: old.NIBBLE_GAP, controlled: !!navigator.serviceWorker.controller, caches: await caches.keys() };
  });
  assert.equal(report.before.sample, 'color-ants-soft-nibble');
  assert.equal(report.before.gap, .18);
  assert(report.before.caches.includes('game-color-ants-v10'));
  await page.locator('#ca-back').click();

  latest = true;
  await page.reload();
  // Complete the hub's refresh handshake on the active worker. A newly installed worker may
  // still be waiting; manifest refresh is the supported path for updating each game's cache.
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('SW refresh timed out')), 20000);
      const listener = event => {
        if (event.data?.type !== 'games-refreshed') return;
        clearTimeout(timer); navigator.serviceWorker.removeEventListener('message', listener); resolve();
      };
      navigator.serviceWorker.addEventListener('message', listener);
      registration.active.postMessage({ type: 'refresh-games' });
    });
  });
  await page.waitForFunction(async name => (await caches.has(name)) && !(await caches.has('game-color-ants-v10')), currentCache, { timeout: 30000 });
  await page.locator('[data-game-id="color-ants"]').click();
  await page.locator('#ca-canvas').waitFor();
  report.after = await page.evaluate(async () => {
    const g = (await import('/color-ants/js/index.js')).default;
    const { sound } = await import('/common/js/audio.js?v=151');
    const audio = await import('/color-ants/js/soft-audio.js?v=11');
    await sound.unlock();
    window.audioQA = { g, sound, audio, calls: [], eaten: 0, originalPlay: sound.play, originalUpdate: g.colony.update };
    sound.play = function(name, options) {
      const played = audioQA.originalPlay.call(this, name, options);
      if (played) audioQA.calls.push({ name, at: this.ctx.currentTime, ...options, voices: [...this.voices].filter(v => v.group === audio.NIBBLE_GROUP).length });
      return played;
    };
    g.colony.update = function(...args) { const eaten = audioQA.originalUpdate.apply(this, args); audioQA.eaten += eaten; return eaten; };
    g.level = 1; g.startLevel();
    const ci = g.columns.findIndex(col => col[0] && !col[0].locked && g.picture.pixels.some(p => p.key === col[0].key && g.colony.isExposed(p)));
    return { sample: audio.NIBBLE_NAME, gap: audio.NIBBLE_GAP, caches: await caches.keys(), ci };
  });
  assert.equal(report.after.sample, 'color-ants-chopi-v1');
  assert.equal(report.after.gap, .52);
  assert(report.after.caches.includes(currentCache));
  assert(!report.after.caches.includes('game-color-ants-v10'));
  await page.locator(`.ca-col:nth-child(${report.after.ci + 1}) .ca-tile.front`).click();
  await page.waitForFunction(() => audioQA.eaten > 0 && audioQA.calls.some(c => c.name.startsWith('color-ants-chopi-v1')), undefined, { timeout: 20000 });
  report.realChewing = await page.evaluate(() => {
    const q = audioQA, buffer = q.sound.buffers.get(q.audio.NIBBLE_NAME);
    return { eaten: q.eaten, calls: q.calls, duration: buffer.duration, peak: Math.max(...buffer.getChannelData(0).map(Math.abs)), oldBufferUsed: q.sound.buffers.has('color-ants-soft-nibble') };
  });
  assert(!report.realChewing.oldBufferUsed);
  assert(!report.realChewing.calls.some(c => c.name === 'hit'));
  await page.screenshot({ path: `${out}/chopi-playing.png` });

  // Stress the actual game loop/shared mixer with a bite on EVERY frame (a deliberately dense fixture).
  // This checks cadence at both speeds; it does not claim to be a naturally occurring ant workload.
  for (const speed of [1, 2]) {
    const trace = await page.evaluate(async speed => {
      const q = audioQA, g = q.g;
      g.colony.update = q.originalUpdate; g.startLevel(); g.speedMul = speed;
      const originalStuck = g.colony.isStuck;
      g.colony.update = () => 20; g.colony.isStuck = () => false; q.calls = [];
      await new Promise(resolve => setTimeout(resolve, 5100));
      const calls = q.calls.filter(c => c.group === q.audio.NIBBLE_GROUP);
      g.colony.update = q.originalUpdate; g.colony.isStuck = originalStuck;
      q.audio.stopNibbles(q.sound);
      return { speed, seconds: 5.1, calls };
    }, speed);
    const gaps = trace.calls.slice(1).map((c, i) => c.at - trace.calls[i].at);
    report.denseEating.push({ ...trace, gaps });
    assert(trace.calls.length >= 6 && trace.calls.length <= 9, `dense x${speed}: ${trace.calls.length} pairs`);
    assert(gaps.every(gap => gap >= .519), `dense audio must leave space between pairs: ${gaps}`);
    assert(gaps.filter(gap => gap >= .979).length >= 2, 'dense audio must include longer rests');
    assert(trace.calls.every(c => c.voices === 1), 'chewing must never overlap itself');
  }
  assert(Math.abs(report.denseEating[0].calls.length - report.denseEating[1].calls.length) <= 1, '2x speed doubled audio density');
  report.controls = await page.evaluate(() => {
    const q = audioQA;
    q.sound.setMute(true); const mute = q.audio.playNibble(q.sound) === false; q.sound.setMute(false);
    q.sound.setPageHidden(true); const hidden = q.audio.playNibble(q.sound) === false; q.sound.setPageHidden(false);
    q.sound.play = q.originalPlay;
    return { mute, hidden };
  });
  assert(report.controls.mute && report.controls.hidden);
  await page.locator('#ca-back').click();
  assert.equal(await page.locator('#ca-canvas').count(), 0);
  report.exitStopped = await page.evaluate(() => ![...audioQA.sound.voices].some(v => v.group === audioQA.audio.NIBBLE_GROUP));
  assert(report.exitStopped);
  // A fresh module URL must resolve from the updated game cache when networking is unavailable.
  // Testing the audio asset directly keeps this check separate from the shared hub's boot lifecycle.
  await context.setOffline(true);
  report.offline = await page.evaluate(async () => {
    const audio = await import('/color-ants/js/soft-audio.js?v=11-offline-check');
    return { sample: audio.NIBBLE_NAME, caches: await caches.keys() };
  });
  assert.equal(report.offline.sample, 'color-ants-chopi-v1');
  assert(report.offline.caches.includes(currentCache));
  assert(!report.offline.caches.includes('game-color-ants-v10'));
  assert.deepEqual(report.errors, []);
} catch (error) {
  report.failure = error.message;
  report.updates = updates;
  report.workers = await Promise.all((context?.serviceWorkers() || []).map(async worker => {
    try { return await worker.evaluate(async () => ({ url: self.location.href, version: self.GAME_ASSETS?.['color-ants']?.version, caches: await caches.keys() })); }
    catch (failure) { return { error: failure.message }; }
  }));
  throw error;
} finally {
  writeFileSync(`${out}/audio-report.json`, JSON.stringify(report, null, 2) + '\n');
  await browser?.close();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
console.log(JSON.stringify(report, null, 2));
