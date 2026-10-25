// 高さ（v0.4.7-dev）の確認: ?altdemo=1 の池（浅瀬・深い水）・空テスト機・水中テスト機。コンソールのエラーがないか ＋ スクショ（390x844, DPR2）
// 使い方（ゲームフォルダの1つ上で）: python3 -m http.server 8766 --bind 127.0.0.1 を起動してから
//   node bot-commander/tools/altitude-shots.mjs [出力フォルダ（既定 /workspace/new-game-rts/cover-proto）]
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || '/workspace/new-game-rts/tools/node_modules/playwright-core');
const BASE = process.env.URL || 'http://127.0.0.1:8766/';
const OUT = (process.argv[2] || '/workspace/new-game-rts/cover-proto').replace(/\/?$/, '/');
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
const page = await ctx.newPage();
const logs = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));
page.on('response', s => { if (s.status() >= 400) logs.push(`[http ${s.status()}] ${s.url()}`); });
await page.goto(BASE + '?altdemo=1');
await page.waitForFunction(() => window.__studio_loaded && document.querySelector('[data-game-id="bot-commander"]'));
await page.locator('[data-game-id="bot-commander"]').click();
await page.waitForFunction(() => window.__botCommander?.ready, null, { timeout: 30000 });
const info = await page.evaluate(async () => {
  const { sim, r, setPaused } = window.__botCommander;
  setPaused(true);
  const S = await import('/bot-commander/js/sim/sim.js?v=18');
  for (let i = 0; i < 30 * 4; i++) S.stepSim(sim); // 少し撃ち合わせる
  for (const u of sim.units) if (u.side === 'ally') u.sight = 9; // スクショ用: 池と敵がみな見えるように（お試しの場だけ）
  r.cam.zoom = 1.0; r.cam.x = 20 * 32; r.cam.y = 41.5 * 32; r.clampCam();
  return sim.units.filter(u => u.z || u.name).map(u => ({ id: u.id, name: u.label || u.name, z: u.z, moves: u.moves, hp: u.hp, x: Math.round(u.x), y: Math.round(u.y) }));
});
await page.evaluate(() => window.__botCommander.setPaused(false));
await page.waitForTimeout(400);
await page.evaluate(() => window.__botCommander.setPaused(true));
await page.waitForTimeout(200);
await page.screenshot({ path: OUT + 'altitude_demo.png' });
const where = await page.evaluate(() => { const { sim, r } = window.__botCommander; return sim.units.filter(u => u.z).map(u => ({ id: u.id, z: u.z, feet: r.worldToScreen(u.x, u.y) })); });
console.log('screen', JSON.stringify(where));
console.log(JSON.stringify({ info, logs }, null, 1));
await browser.close();
