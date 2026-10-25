// v0.4.8-dev 地面の境界（edges2）の確認: 前にカクカクだった所を寄りで撮る（390x844, DPR2、キャラは隠す、霧は晴らす）。
// 使い方（ゲームフォルダの1つ上で python3 -m http.server <port> --bind 127.0.0.1 を起動してから）:
//   PW=<playwright-core の場所> URL=http://127.0.0.1:<port>/ node bot-commander/tools/edges2-shots.mjs <名前の頭> [出力フォルダ（既定 /workspace/new-game-rts/cover-proto）]
//   → <頭>_main_fm.png ほか。コンソールのエラーを最後に出す
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW);
const BASE = process.env.URL || 'http://127.0.0.1:8766/';
const PREFIX = process.argv[2] || 'edges2';
const OUT = (process.argv[3] || '/workspace/new-game-rts/cover-proto').replace(/\/?$/, '/');
await mkdir(OUT, { recursive: true });
export const SHOTS = {
  '': [['main_fm', 12.5, 6.5, 2.4], ['main_fm2', 37, 8.5, 2.0], ['main_mw', 17, 30, 2.0], ['main_fw', 11, 29.5, 2.6], ['main_overview', 20, 20, 1.0]],
  '?altdemo=1': [['alt_pond', 20.5, 42, 2.2], ['alt_pond_nw', 17, 41, 3.0], ['alt_pond_e', 25.5, 44.5, 3.0]],
};
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const logs = [];
for (const [query, shots] of Object.entries(SHOTS)) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/sw-assets|Service Worker|Failed to load resource/.test(m.text())) logs.push(`[${query}][${m.type()}] ${m.text()}`); });
  page.on('pageerror', e => logs.push(`[${query}][pageerror] ${e.message}`));
  page.on('response', s => { if (s.status() >= 400 && !/\/(color-ants|iron-squad|dada-survivor|math-runner)\//.test(s.url())) logs.push(`[${query}][http ${s.status()}] ${s.url()}`); });
  await page.goto(BASE + query);
  await page.waitForFunction(() => window.__studio_loaded && document.querySelector('[data-game-id="bot-commander"]'));
  await page.locator('[data-game-id="bot-commander"]').click();
  await page.waitForFunction(() => window.__botCommander?.ready, null, { timeout: 60000 });
  await page.evaluate(() => { const { sim, setPaused, r } = window.__botCommander; setPaused(true); sim.fog.seen.fill(255); sim.fog.visible.fill(255); sim.fog.revision++;
    const walk = c => { for (const k of c.children || []) { if (k.sortableChildren) k.visible = false; walk(k); } }; walk(r.app.stage); });
  for (const [name, x, y, zoom] of shots) {
    await page.evaluate(([x, y, zoom]) => { const { r } = window.__botCommander; r.cam.zoom = zoom; r.cam.x = x * 32; r.cam.y = y * 32; r.clampCam(); }, [x, y, zoom]);
    await page.waitForTimeout(600);
    await page.screenshot({ path: OUT + `${PREFIX}_${name}.png` });
  }
  await ctx.close();
}
console.log(JSON.stringify({ out: OUT, prefix: PREFIX, logs }, null, 1));
await browser.close();
