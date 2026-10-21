// Local-only visual QA: real hub boot, unchanged texture contract, frame/bake samples.
// PW / CHROME / URL follow mission-shots.mjs. Run: node bot-commander/tools/art-review.mjs <output>
// ART_GPU=native uses Chrome's default GPU; PERF_ONLY=1 skips screenshots.
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || 'playwright-core');
const out = resolve(process.argv[2] || 'bot-commander/docs/art-review/after');
await mkdir(out, { recursive: true });
const software = process.env.ART_GPU !== 'native';
const browser = await chromium.launch({ executablePath: process.env.CHROME, args: software ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] : [] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
const page = await ctx.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const base = process.env.URL || 'http://127.0.0.1:8766/';
await page.goto(base);
await page.waitForFunction(() => window.__studio_loaded && document.querySelector('[data-game-id="bot-commander"]'));
await page.locator('[data-game-id="bot-commander"]').click();
await page.waitForFunction(() => window.__botCommander?.ready);
const result = await page.evaluate(async () => {
  const { artSources } = await import('/bot-commander/js/render/art.js');
  const { buildTextures, buildArtCanvases } = await import('/bot-commander/js/render/textures.js');
  const sources = artSources(), checks = [], tileEdges = {};
  const canvases = await buildArtCanvases(sources);
  for (const [key, source] of Object.entries(sources)) {
    const doc = typeof source === 'string' ? new DOMParser().parseFromString(source, 'image/svg+xml') : null;
    const ids = doc ? [...doc.querySelectorAll('[id]')].map(e => e.id) : [];
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'); g.drawImage(canvases[key], 0, 0, 64, 64);
    const data = g.getImageData(0, 0, 64, 64).data;
    if (key.startsWith('tile_')) tileEdges[key] = Array.from({ length: 64 }, (_, i) => [i, i * 64, i * 64 + 63, 63 * 64 + i]).flat().flatMap(p => [...data.slice(p * 4, p * 4 + 4)]);
    const foot = /^(scav|ponco|alien)_/.test(key) ? Math.max(...Array.from({ length: 60 }, (_, y) => y).filter(y => {
      for (let x = 2; x < 62; x++) if (data[(y * 64 + x) * 4 + 3] > 220) return true;
      return false;
    })) : null;
    checks.push({ key, type: doc ? 'svg' : 'raster', valid: doc ? !doc.querySelector('parsererror') : canvases[key].width > 0, uniqueIds: ids.length === new Set(ids).size, portable: doc ? !doc.querySelector('text, image, filter, foreignObject, script') : source.url.startsWith(location.origin), foot });
  }
  const seams = ['plain', 'forest', 'mountain', 'water'].map(kind => ({ kind, matchingVariantEdges: JSON.stringify(tileEdges[`tile_${kind}_0`]) === JSON.stringify(tileEdges[`tile_${kind}_1`]) }));
  const bakeMs = [], sizes = {};
  for (let n = 0; n < 7; n++) {
    const t = performance.now(), textures = await buildTextures(sources);
    bakeMs.push(performance.now() - t);
    for (const [key, tex] of Object.entries(textures)) sizes[key] = [tex.width, tex.height];
    for (const tex of new Set(Object.values(textures))) tex.destroy(true);
  }
  bakeMs.sort((a, b) => a - b);
  const { r } = window.__botCommander;
  const gl = r.app.renderer.gl, ext = gl.getExtension('WEBGL_debug_renderer_info');
  const frameMs = [];
  await new Promise(done => {
    let last, n = 0;
    const frame = now => { if (last && n > 20) frameMs.push(now - last); last = now; if (++n < 201) requestAnimationFrame(frame); else done(); };
    requestAnimationFrame(frame);
  });
  const sorted = [...frameMs].sort((a, b) => a - b);
  return { viewport: [innerWidth, innerHeight], dpr: devicePixelRatio, renderer: r.app.renderer.name, gpu: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unavailable', textureCount: checks.length, checks, seams, sizes, bakeMs, medianBakeMs: bakeMs[3], fps: 1000 / (frameMs.reduce((a, b) => a + b, 0) / frameMs.length), p95FrameMs: sorted[Math.floor(sorted.length * .95)] };
});
async function finish() {
  result.errors = errors;
  result.gpuMode = software ? 'SwiftShader software' : 'Chrome default';
  await writeFile(resolve(out, 'art-checks.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ textureCount: result.textureCount, medianBakeMs: result.medianBakeMs, fps: result.fps, p95FrameMs: result.p95FrameMs, gpu: result.gpu, seams: result.seams, errors }, null, 2));
  await browser.close();
  if (errors.length || result.checks.some(c => !c.valid || !c.uniqueIds || !c.portable) || result.seams.some(c => !c.matchingVariantEdges) || Object.values(result.sizes).some(([w, h]) => Math.max(w, h) > 1024)) process.exitCode = 1;
}
if (process.env.PERF_ONLY === '1') { await finish(); process.exit(process.exitCode || 0); }
await page.evaluate(() => window.__botCommander.setPaused(true));
// Matched actual-size and magnified art sheet, rendered by browser SVG Image decode.
await page.evaluate(async () => {
  const { artSources } = await import('/bot-commander/js/render/art.js');
  const { buildArtCanvases } = await import('/bot-commander/js/render/textures.js');
  const src = await buildArtCanvases(artSources());
  const keys = ['scav_ally', 'scav_ally_cmd', 'ponco_ally', 'ponco_ally_cmd', 'alien_enemy', 'alien_enemy_cmd', 'salvage_0', 'salvage_1', 'salvage_empty', 'hatch', 'hq_ally', 'hq_enemy'];
  const sheet = document.createElement('div'); sheet.id = 'art-sheet';
  sheet.style = 'position:absolute;left:0;top:0;width:900px;background:#222b2a;color:#e6dbc3;padding:24px;box-sizing:border-box;font:14px system-ui;z-index:10000;display:grid;grid-template-columns:repeat(6,1fr);gap:18px';
  const add = async (key, size) => {
    const cell = document.createElement('div'); cell.style = 'display:flex;min-height:162px;align-items:center;justify-content:space-between;flex-direction:column';
    const label = document.createElement('span'); label.textContent = key; cell.appendChild(label);
    const img = new Image(); img.src = src[key].toDataURL(); await img.decode();
    img.style = `width:${size}px;height:${size}px`; cell.appendChild(img);
    const small = img.cloneNode(); small.style = `width:${key.startsWith('alien') ? 64 : key.startsWith('scav') ? 40 : key.startsWith('ponco') ? 42 : 48}px`; cell.appendChild(small); sheet.appendChild(cell);
  };
  for (const key of keys) await add(key, 112);
  for (const kind of ['plain', 'forest', 'mountain', 'water']) {
    const cell = document.createElement('div'); cell.style = 'grid-column:span 3';
    const label = document.createElement('div'); label.textContent = kind + ' / 32px tiles'; cell.appendChild(label);
    const grid = document.createElement('div'); grid.style = 'display:grid;grid-template-columns:repeat(12,32px)';
    for (let n = 0; n < 48; n++) {
      const source = src[`tile_${kind}_0`], side = source.width / 4;
      const region = document.createElement('canvas'); region.width = region.height = 64;
      region.getContext('2d').drawImage(source, n % 12 % 4 * side, Math.floor(n / 12) % 4 * side, side, side, 0, 0, 64, 64);
      const im = new Image(); im.src = region.toDataURL(); im.style = 'display:block;width:32px;height:32px'; grid.appendChild(im);
    }
    cell.appendChild(grid); sheet.appendChild(cell);
  }
  document.body.appendChild(sheet);
});
await page.locator('#art-sheet').screenshot({ path: resolve(out, 'art-sheet.png') });
await page.evaluate(() => document.getElementById('art-sheet').remove());
const startCam = await page.evaluate(() => ({ ...window.__botCommander.r.cam }));
for (const zoom of [1, 1.4, .4, 4]) {
  await page.evaluate(({ z, cam }) => {
    const { r, sim } = window.__botCommander; Object.assign(r.cam, cam); r.cam.zoom = z;
    if (z >= 3) { const c = sim.units.find(u => u.kind === 'scav' && u.commander); r.cam.x = c.x; r.cam.y = c.y + 20; }
    r.sync(0); r.app.render();
  }, { z: zoom, cam: startCam });
  await page.screenshot({ path: resolve(out, `start-zoom-${zoom}.png`) });
}
await page.evaluate(() => {
  const { r, sim } = window.__botCommander;
  const c = sim.units.find(u => u.kind === 'ponco' && u.commander);
  r.cam.x = c.x; r.cam.y = c.y + 20; r.cam.zoom = 4; r.sync(0); r.app.render();
});
await page.screenshot({ path: resolve(out, 'ponco-zoom-4.png') });
await page.evaluate(() => {
  const { r, sim } = window.__botCommander, ex = sim.mission.extraction;
  r.cam.x = ex.tx * 32 + 16; r.cam.y = ex.ty * 32 + 16; r.cam.zoom = 3; r.sync(0); r.app.render();
});
await page.screenshot({ path: resolve(out, 'hatch-zoom-3.png') });
// Wide mobile viewport is supplemental; 390x844 is the brief's acceptance size.
await page.setViewportSize({ width: 402, height: 874 });
await page.evaluate(cam => { const { r } = window.__botCommander; Object.assign(r.cam, cam); r.cam.zoom = 1; r.sync(0); }, startCam);
await page.waitForTimeout(300);
await page.screenshot({ path: resolve(out, 'mobile-402.png') });
await finish();
