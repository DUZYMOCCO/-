// v0.2.0 ミッションのスクショ（390x844）: 開始・回収中・追跡・結果。工房ハブから起動する。
// 使い方（リポジトリのルートで）: python3 -m http.server 8766 --bind 127.0.0.1 を起動してから
//   node bot-commander/tools/mission-shots.mjs [出力フォルダ]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || '/workspace/new-game-rts/tools/node_modules/playwright-core');
const BASE = process.env.URL || 'http://127.0.0.1:8766/';
const OUT = (process.argv[2] || '/workspace/new-game-rts/shots_v021').replace(/\/?$/, '/');

const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const logs = [];
page.on('console', m => { if (m.type() !== 'log') logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));
const result = {};
await page.goto(BASE);
await page.waitForFunction(() => window.__studio_loaded && document.querySelector('[data-game-id="bot-commander"]'));
const card = page.locator('[data-game-id="bot-commander"]');
await card.scrollIntoViewIfNeeded();
result.cardVersion = await page.locator('[data-version-for="bot-commander"]').textContent();
await card.click();
await page.waitForFunction(() => window.__botCommander?.ready, null, { timeout: 30000 });
await page.waitForTimeout(1000);
await page.screenshot({ path: OUT + 'v021_01_start.png' });

// 本物のタップで命令: 選ばれているツギハギ隊 → 1つ目のガラクタの山
await page.evaluate(() => window.__botCommander.setPaused(true));
const tgt = await page.evaluate(() => { const { sim, r } = window.__botCommander; const p = sim.mission.salvage[0]; r.cam.x = p.tx * 32 + 16; r.cam.y = p.ty * 32 - 120; r.clampCam(); r.sync(0); return r.worldToScreen(p.tx * 32 + 16, p.ty * 32 + 16); });
await page.touchscreen.tap(tgt.x, tgt.y);
await page.waitForTimeout(300);
result.orderByTap = await page.evaluate(() => !!window.__botCommander.sim.squads.find(s => s.kind === 'scav').order);
// 時間を進めて回収が始まるまで（ゲーム内の時間を直接進める）
result.gathering = await page.evaluate(() => {
  const { sim, stepSim } = window.__botCommander; const s = sim.squads.find(q => q.kind === 'scav');
  for (let i = 0; i < 30 * 120 && !(s.gathering != null && s.cargo > 8); i++) stepSim(sim);
  return { t: Math.round(sim.time), cargo: +s.cargo.toFixed(1), gathering: s.gathering };
});
await page.evaluate(() => { const { sim, r } = window.__botCommander; const s = sim.squads.find(q => q.kind === 'scav'); const c = sim.units.find(u => u.id === s.unitIds[0]); r.cam.x = c.x; r.cam.y = c.y - 60; r.cam.zoom = 1.4; window.__botCommander.setPaused(false); });
await page.waitForTimeout(1200);
await page.screenshot({ path: OUT + 'v021_02_gathering.png' });

// 掘り出し物（見つかるまで進める。見つからない seed なら撮らない）
result.find = await page.evaluate(() => {
  const { sim, stepSim } = window.__botCommander; window.__botCommander.setPaused(true);
  for (let i = 0; i < 30 * 60 && !sim.fx.some(f => f.type === 'find'); i++) stepSim(sim);
  window.__botCommander.setPaused(false);
  return sim.mission.finds.map(f => f.name);
});
if (result.find.length) { await page.waitForTimeout(350); await page.screenshot({ path: OUT + 'v021_02b_find.png' }); }

// 巡回の異星生物に近づけて、追跡させる
result.chase = await page.evaluate(() => {
  const { sim, stepSim } = window.__botCommander; window.__botCommander.setPaused(true);
  const s = sim.squads.find(q => q.kind === 'scav');
  const e = sim.squads.filter(q => q.role === 'patrol').sort((a, b) => { const c = sim.units.find(u => u.id === s.unitIds[0]); const d = q => { const u = sim.units.find(x => x.id === q.unitIds[0]); return Math.hypot(u.x - c.x, u.y - c.y); }; return d(a) - d(b); })[0];
  let n = 0;
  for (; n < 30 * 120 && e.ai !== 'chase'; n++) {
    if (n % 30 === 0) { const a = sim.units.find(u => u.id === e.unitIds[0]); sim.commands.push({ type: 'move', squadId: s.id, waypoints: [{ tx: Math.floor(a.x / 32), ty: Math.floor(a.y / 32) + 1 }] }); }
    stepSim(sim);
  }
  for (let i = 0; i < 45; i++) stepSim(sim);
  const a = sim.units.find(u => u.id === e.unitIds[0]);
  return { group: e.name, ai: e.ai, alert: +e.alert.toFixed(2), t: Math.round(sim.time), ax: a.x, ay: a.y };
});
await page.evaluate(({ ax, ay }) => { const { r } = window.__botCommander; r.cam.x = ax; r.cam.y = ay + 40; r.cam.zoom = 1.3; window.__botCommander.setPaused(false); }, result.chase);
await page.waitForTimeout(700);
await page.evaluate(() => window.__botCommander.setPaused(true));
await page.screenshot({ path: OUT + 'v021_03_chase.png' });

// 結果画面: スクショ用に、届けた資材を目標まで入れて1ステップ進める（勝ちの表示の確認）
await page.evaluate(() => { const { sim, stepSim } = window.__botCommander; sim.mission.delivered = sim.mission.target; stepSim(sim); window.__botCommander.setPaused(false); });
await page.waitForSelector('.bc-result:not([hidden])');
await page.waitForTimeout(400);
await page.screenshot({ path: OUT + 'v021_04_result.png' });
result.resultText = await page.locator('.bc-result-box').innerText();
// もう一度
await page.locator('.bc-retry').click();
await page.waitForFunction(() => window.__botCommander?.ready && window.__botCommander.sim.time < 2, null, { timeout: 30000 });
result.retry = await page.evaluate(() => ({ time: window.__botCommander.sim.time, result: window.__botCommander.sim.result, hidden: document.querySelector('.bc-result').hidden }));
// 時間切れ（負け）も確認
result.lose = await page.evaluate(() => { const { sim, stepSim } = window.__botCommander; window.__botCommander.setPaused(true); for (const u of sim.units) if (u.side === 'ally') u.hp = 0; stepSim(sim); window.__botCommander.setPaused(false); return [sim.result, sim.resultReason]; });
await page.waitForSelector('.bc-result:not([hidden])');
await page.waitForTimeout(300);
await page.screenshot({ path: OUT + 'v021_05_result_lose.png' });
result.fps = await page.evaluate(() => window.__botCommander.r.app.ticker.FPS);
console.log(JSON.stringify(result, null, 1));
console.log(logs.join('\n'));
await browser.close();
