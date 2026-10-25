// v0.4.10 Codex の絵の取り込み確認: 本編の兵種・キット切れのアイコン（寄り）、?chardemo=1 の少女の斜め・ひるみ。390x844 DPR2
// 使い方: game-single-units で python3 -m http.server <port> --bind 127.0.0.1 → PW=<playwright-core> URL=http://127.0.0.1:<port>/ node bot-commander/tools/codexgfx-shots.mjs [出力]
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW);
const BASE = process.env.URL || 'http://127.0.0.1:8774/';
const OUT = (process.argv[2] || '/workspace/new-game-rts/cover-proto/codexgfx').replace(/\/?$/, '/');
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const logs = [], info = {};
async function open(query) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/sw-assets|Service Worker|Failed to load resource/.test(m.text())) logs.push(`[${query}][${m.type()}] ${m.text()}`); });
  page.on('pageerror', e => logs.push(`[${query}][pageerror] ${e.message}`));
  page.on('response', s => { if (s.status() >= 400 && !/\/(color-ants|iron-squad|dada-survivor|math-runner)\//.test(s.url())) logs.push(`[${query}][http ${s.status()}] ${s.url()}`); });
  await page.goto(BASE + query);
  await page.waitForFunction(() => window.__studio_loaded && document.querySelector('[data-game-id="bot-commander"]'));
  await page.locator('[data-game-id="bot-commander"]').click();
  return { ctx, page };
}
const shot = (page, n, clip) => page.screenshot({ path: OUT + n + '.png', ...(clip ? { clip } : {}) });
const wait = (p, ms = 500) => p.waitForTimeout(ms);
// 本編: 兵種のある機体を並べ、盾・キット切れ・HP 減りも混ぜる（このスクリプトの中だけ）
for (const zoom of [1, 1.6, 2.4]) {
  const { ctx, page } = await open('');
  await page.waitForFunction(() => window.__botCommander?.ready, null, { timeout: 60000 }); await wait(page, 1500);
  info['main_' + zoom] = await page.evaluate(async zoom => {
    const B = window.__botCommander, { sim, r } = B; B.setPaused(true);
    sim.units.filter(u => u.side === 'enemy').forEach((u, i) => { u.x = (22 + i % 3) * 32; u.y = (6 + (i / 3 | 0)) * 32; u.speed = 0; u.atk = 0; });
    const ally = sim.units.filter(u => u.side === 'ally');
    ally.forEach((u, i) => { u.order = null; u.x = (17 + i % 4) * 32; u.y = (58 + (i / 4 | 0)) * 32; });
    const CL = ['gunner', 'repairer', 'supporter', 'scout', 'stealth', 'rookie'];
    const p = sim.units.filter(u => u.kind === 'ponco'), scav = sim.units.filter(u => u.kind === 'scav');
    const row = [...p.slice(0, 6).map((u, i) => [u, CL[i]]), [scav[0], 'scavenger'], [p[6], 'gunner']];
    row.forEach(([u, c], i) => { u.cls = c; u.x = (6.6 + (i % 4) * 2.1) * 32; u.y = (50.5 + (i / 4 | 0) * 2.2) * 32; });
    p[1].kits = 0; p[4].kits = 0; p[2].hp = p[2].maxHp * 0.45; scav[0].kits = 0;
    p[0].shieldMax = 10; p[0].shieldHp = 10; p[3].shieldMax = 10; p[3].shieldHp = 4; p[4].shieldMax = 10; p[4].shieldHp = 7;
    const boy = sim.units.find(u => u.human); if (boy) { boy.x = 10.6 * 32; boy.y = 54.2 * 32; }
    sim.fog.seen.fill(0); sim.fog.revision++;
    const S = await import('/bot-commander/js/sim/sim.js?v=19'); for (let k = 0; k < 3; k++) S.stepSim(sim);
    r.cam.zoom = zoom; r.cam.x = 9.8 * 32; r.cam.y = 51.6 * 32; r.clampCam();
    return { zoom: r.cam.zoom, row: row.map(([u, c]) => `${u.label || u.kind}:${c}:kits${u.kits}:sh${u.shieldHp || 0}`) };
  }, zoom);
  await page.evaluate(() => window.__botCommander.select([])); await wait(page, 700);
  await shot(page, `main_z${zoom}`);
  await ctx.close();
}
// ?chardemo=1（横）と &human=oblique（斜め）: 待機・走る・のけぞる（のけぞりは何コマか撮る）
for (const [q, tag] of [['?chardemo=1&human=oblique', 'obl'], ['?chardemo=1', 'side']]) {
  const { ctx, page } = await open(q);
  await page.waitForSelector('.cd-panel [data-st="idle"]', { timeout: 60000 }); await wait(page, 1500);
  await shot(page, `chardemo_${tag}_idle`);
  await page.click('.cd-panel [data-st="run"]'); await wait(page, 700); await shot(page, `chardemo_${tag}_run`);
  await page.click('.cd-panel [data-st="idle"]'); await wait(page, 400);
  await page.click('.cd-panel [data-st="hurt"]');
  for (const ms of [60, 190, 320, 450, 580]) { await wait(page, ms === 60 ? 60 : 130); await shot(page, `chardemo_${tag}_hurt_${ms}`); info[`${tag}_hurt_${ms}`] = await page.evaluate(() => document.querySelector('.cd-info')?.textContent); }
  await ctx.close();
}
await writeFile(OUT + 'info.json', JSON.stringify({ info, logs }, null, 1));
console.log(JSON.stringify({ out: OUT, info, logs }, null, 1));
await browser.close();
