// 工房ハブ込みのスクショ（390x844）とオフライン再読み込みの確認。
// 使い方（リポジトリのルートで）: python3 -m http.server 8766 --bind 127.0.0.1 を起動してから
//   node bot-commander/tools/studio-shots.mjs [出力フォルダ]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || '/workspace/new-game-rts/tools/node_modules/playwright-core');
const BASE = process.env.URL || 'http://127.0.0.1:8766/';
const OUT = (process.argv[2] || '/workspace/new-game-rts/proto/shots').replace(/\/?$/, '/');

const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const logs = [];
page.on('console', m => { if (m.type() !== 'log') logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));
const result = {};

await page.goto(BASE);
await page.waitForFunction(() => window.__studio_loaded && document.querySelector('[data-game-id="bot-commander"]'));
// SW が有効になり、このゲームのキャッシュができるまで待つ
// （waitForFunction は Promise を待たないので、ここでは自分で数回確かめる）
for (let i = 0; i < 60; i++) {
  const ok = await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())?.active && (await caches.keys()).includes('game-bot-commander-v1') && (await (await caches.open('game-bot-commander-v1')).keys()).length >= 14);
  if (ok) break; await page.waitForTimeout(500);
}
result.caches = await page.evaluate(async () => { const keys = await caches.keys(); const c = await caches.open('game-bot-commander-v1'); return { keys, botFiles: (await c.keys()).map(r => new URL(r.url).pathname) }; });
const card = page.locator('[data-game-id="bot-commander"]');
await card.scrollIntoViewIfNeeded();
await page.waitForTimeout(400);
result.cardVersion = await page.locator('[data-version-for="bot-commander"]').textContent();
await page.screenshot({ path: OUT + 'studio_01_hub_card.png' });

// ハブからゲームを起動
await card.click();
await page.waitForFunction(() => window.__botCommander?.ready, null, { timeout: 30000 });
await page.waitForTimeout(800);
await page.screenshot({ path: OUT + 'studio_02_game_in_hub.png' });
// 部隊を選んで経路をなぞる
const from = await page.evaluate(() => { const { sim, r } = window.__botCommander; const s = sim.squads.find(q => q.id === 'a2'); const c = sim.units.find(u => u.id === s.unitIds[0]); return r.worldToScreen(c.x, c.y - 12); });
await page.mouse.move(from.x, from.y); await page.mouse.down();
for (const [dx, dy] of [[-10, -110], [-110, -200], [-120, -320], [-30, -420], [90, -500]]) await page.mouse.move(from.x + dx, from.y + dy, { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(1200);
await page.screenshot({ path: OUT + 'studio_03_order_in_hub.png' });
result.order = await page.evaluate(() => window.__botCommander.sim.squads.find(q => q.id === 'a2').order?.waypoints.length ?? 0);

// 工房へ戻る
await page.locator('.bc-menu-btn').click(); await page.locator('.bc-menu-hub').click(); await page.locator('.bc-confirm-leave').click();
await page.waitForTimeout(300);
result.backToHub = await page.evaluate(() => !document.getElementById('studio-hub').classList.contains('hidden') && !window.__botCommander);

// オフラインで再読み込み → ハブとゲームが SW のキャッシュから起動するか
await ctx.setOffline(true);
await page.reload();
await page.waitForFunction(() => window.__studio_loaded && document.querySelector('[data-game-id="bot-commander"]'), null, { timeout: 30000 });
await page.locator('[data-game-id="bot-commander"]').click();
await page.waitForFunction(() => window.__botCommander?.ready, null, { timeout: 30000 });
await page.waitForTimeout(800);
result.offline = await page.evaluate(() => ({ online: navigator.onLine, units: window.__botCommander.sim.units.length, renderer: window.__botCommander.r.app.renderer.name }));
await page.screenshot({ path: OUT + 'studio_04_offline_reload.png' });
result.cacheAfter = await page.evaluate(async () => { const c = await caches.open('game-bot-commander-v1'); return { keys: await caches.keys(), botFiles: (await c.keys()).length, controlled: !!navigator.serviceWorker.controller }; });
await ctx.setOffline(false);

console.log(JSON.stringify(result, null, 1));
console.log(logs.join('\n'));
await browser.close();
