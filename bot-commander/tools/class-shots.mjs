// v0.4.3 兵種のアイコンの確認: コンソールのエラーがないか ＋ スクショ（390x844, DPR2）。
//   class_icons.png: いつもの zoom で、兵種のある機体を並べた画面。class_icons_zoom.png: その一部を切り出し（拡大しない）
//   いまの試作の機体には兵種がないので、このスクリプトの中だけで PONCO・ツギハギ号に cls を付ける（ゲームのデータは変えない）
// 使い方（ゲームフォルダの1つ上で）: python3 -m http.server 8766 --bind 127.0.0.1 を起動してから
//   node bot-commander/tools/class-shots.mjs [出力フォルダ（既定 /workspace/new-game-rts/cover-proto）]
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
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
await page.goto(BASE);
await page.waitForFunction(() => window.__studio_loaded && document.querySelector('[data-game-id="bot-commander"]'));
await page.locator('[data-game-id="bot-commander"]').click();
await page.waitForFunction(() => window.__botCommander?.ready, null, { timeout: 30000 });
const info = {};
info.zoom0 = await page.evaluate(() => window.__botCommander.r.cam.zoom);
info.set = await page.evaluate(async () => {
  const B = window.__botCommander, { sim, r } = B; B.setPaused(true);
  sim.units.filter(u => u.side === 'enemy').forEach((u, i) => { u.x = (22 + i % 3) * 32; u.y = (6 + (i / 3 | 0)) * 32; u.speed = 0; u.atk = 0; });
  const ally = sim.units.filter(u => u.side === 'ally');
  ally.forEach((u, i) => { u.order = null; u.x = (17 + i % 4) * 32; u.y = (58 + (i / 4 | 0)) * 32; });
  const CL = ['gunner', 'repairer', 'supporter', 'scout', 'stealth', 'rookie'];
  const p = sim.units.filter(u => u.kind === 'ponco'), scav = sim.units.filter(u => u.kind === 'scav');
  const row = [...p.slice(0, 6).map((u, i) => [u, CL[i]]), [scav[0], 'scavenger'], [p[6], null]];
  row.forEach(([u, c], i) => { u.cls = c; u.x = (6.6 + (i % 4) * 2.1) * 32; u.y = (50.5 + (i / 4 | 0) * 2.2) * 32; });
  p[1].kits = 0; p[2].hp = p[2].maxHp * 0.45; // キット切れの赤い点（右端）と並ぶ所も見る
  const boy = sim.units.find(u => u.human); if (boy) { boy.x = 10.6 * 32; boy.y = 54.2 * 32; }
  sim.fog.seen.fill(0); sim.fog.revision++;
  const S = await import('/bot-commander/js/sim/sim.js?v=26'); for (let k = 0; k < 3; k++) S.stepSim(sim); // 見える所を作り直す
  r.cam.x = 9.8 * 32; r.cam.y = 52 * 32; r.clampCam();
  return { zoom: r.cam.zoom, row: row.map(([u, c]) => `${u.label || u.kind}:${c}`) };
});
await page.evaluate(() => window.__botCommander.select([]));
await page.waitForTimeout(600);
await page.screenshot({ path: OUT + 'class_icons.png' });
const box = await page.evaluate(() => { const { sim, r } = window.__botCommander; const us = sim.units.filter(u => u.cls !== undefined && u.side === 'ally' && !u.human && Math.abs(u.y - 50.5 * 32) < 4); const a = us.map(u => r.worldToScreen ? r.worldToScreen(u.x, u.y) : null); return a; });
info.box = box;
const xs = box.filter(Boolean).map(b => b.x), ys = box.filter(Boolean).map(b => b.y);
const clip = xs.length ? { x: Math.max(0, Math.min(...xs) - 40), y: Math.max(0, Math.min(...ys) - 60), width: Math.min(390, Math.max(...xs) - Math.min(...xs) + 80), height: 175 } : { x: 60, y: 330, width: 280, height: 220 };
info.clip = clip;
await page.screenshot({ path: OUT + 'class_icons_zoom.png', clip });
info.logs = logs.filter(l => !l.includes('sw-assets.js') && !l.includes('Failed to load resource') && !l.includes('Service Worker'));
await writeFile(OUT + 'class_shots.json', JSON.stringify(info, null, 2));
console.log(JSON.stringify(info, null, 2));
await browser.close();
