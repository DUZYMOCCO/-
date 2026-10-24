// ミッションのスクショ（390x844）: 開始・1機選択・種類選択・枠選択・命令・回収中・追跡・捕獲・結果。v0.4.0-dev で1機ずつの操作に。工房ハブから起動する。
// 使い方（リポジトリのルートで）: python3 -m http.server 8766 --bind 127.0.0.1 を起動してから
//   node bot-commander/tools/mission-shots.mjs [出力フォルダ]
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || '/workspace/new-game-rts/tools/node_modules/playwright-core');
const BASE = process.env.URL || 'http://127.0.0.1:8766/';
const OUT = (process.argv[2] || '/workspace/new-game-rts/shots_v040dev').replace(/\/?$/, '/');
await mkdir(OUT, { recursive: true });
const cacheName = 'game-bot-commander-' + /version: '([^']+)'/.exec(await readFile(new URL('../sw-assets.js', import.meta.url), 'utf8'))[1];

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
const prefix = result.cardVersion.replaceAll('.', '').trim();
const shot = name => page.screenshot({ path: OUT + prefix + '_' + name + '.png' });
await card.click();
await page.waitForFunction(() => window.__botCommander?.ready, null, { timeout: 30000 });
await page.waitForTimeout(1000);
await shot('01_start');

const T = 32, tl = v => Math.floor(v / T);
// 1機だけタップで選ぶ（PONCO の1機）→ その1機だけに輪
await page.evaluate(() => window.__botCommander.setPaused(true));
const one = await page.evaluate(() => { const { sim, r } = window.__botCommander; const u = sim.units.find(x => x.kind === 'ponco'); r.cam.x = u.x; r.cam.y = u.y - 40; r.cam.zoom = 1.3; r.clampCam(); r.sync(0); return { id: u.id, ...r.worldToScreen(u.x, u.y - 12) }; });
await page.touchscreen.tap(one.x, one.y);
await page.waitForTimeout(250);
result.tapOne = await page.evaluate(id => { const s = window.__botCommander.selected(); return { ok: s.length === 1 && s[0] === id, sel: s }; }, one.id);
await shot('01b_select_one');
// 長押し（マウスの押しっぱなし）で同じ種類を全部
await page.mouse.move(one.x, one.y); await page.mouse.down(); await page.waitForTimeout(600); await page.mouse.up();
await page.waitForTimeout(250);
result.longKind = await page.evaluate(() => { const { sim } = window.__botCommander; const s = window.__botCommander.selected(); return { n: s.length, allPonco: s.every(id => sim.units.find(u => u.id === id).kind === 'ponco') }; });
await shot('01c_select_kind');
// 地面を長押し → なぞって枠選択（ツギハギと人のあたり）
const box = await page.evaluate(() => { const { sim, r } = window.__botCommander; const us = sim.units.filter(u => u.kind === 'scav' || u.human); const xs = us.map(u => u.x), ys = us.map(u => u.y); const a = r.worldToScreen(Math.min(...xs) - 20, Math.min(...ys) - 30), b = r.worldToScreen(Math.max(...xs) + 20, Math.max(...ys) + 12); return { a, b }; });
await page.mouse.move(box.a.x, box.a.y); await page.mouse.down(); await page.waitForTimeout(550);
await page.mouse.move((box.a.x + box.b.x) / 2, (box.a.y + box.b.y) / 2, { steps: 4 });
await page.mouse.move(box.b.x, box.b.y, { steps: 4 });
await shot('01d_box_drag');
await page.mouse.up(); await page.waitForTimeout(250);
result.box = await page.evaluate(() => { const { sim } = window.__botCommander; return window.__botCommander.selected().map(id => sim.units.find(u => u.id === id).kind); });
await shot('01e_box_selected');

// 本物のタップで命令: ツギハギ4機を選んで → 1つ目のガラクタの山
await page.evaluate(() => { const { sim } = window.__botCommander; window.__botCommander.select(sim.units.filter(u => u.kind === 'scav').map(u => u.id)); });
const tgt = await page.evaluate(() => { const { sim, r } = window.__botCommander; const p = sim.mission.salvage[0]; r.cam.x = p.tx * 32 + 16; r.cam.y = p.ty * 32 - 120; r.cam.zoom = 1; r.clampCam(); r.sync(0); return r.worldToScreen(p.tx * 32 + 16, p.ty * 32 + 16); });
await page.touchscreen.tap(tgt.x, tgt.y);
await page.waitForTimeout(300);
result.orderByTap = await page.evaluate(() => { const { sim } = window.__botCommander; const sc = sim.units.filter(u => u.kind === 'scav'), others = sim.units.filter(u => u.side === 'ally' && u.kind !== 'scav'); return sc.every(u => u.order) && others.every(u => !u.order); });
await page.evaluate(() => { const { sim, r } = window.__botCommander; for (let i = 0; i < 45; i++) window.__botCommander.stepSim(sim); const u = sim.units.find(x => x.kind === 'scav'); r.cam.x = u.x; r.cam.y = u.y - 100; r.sync(0); });
await shot('01f_order_paths');
// 時間を進めて回収が始まるまで（ゲーム内の時間を直接進める）
result.gathering = await page.evaluate(() => {
  const { sim, stepSim } = window.__botCommander; const sc = () => sim.units.filter(u => u.kind === 'scav');
  for (let i = 0; i < 30 * 120 && !(sc().some(u => u.gathering != null) && sc().reduce((a, u) => a + u.cargo, 0) > 8); i++) stepSim(sim);
  return { t: Math.round(sim.time), cargo: sc().map(u => +u.cargo.toFixed(1)), gathering: sc().map(u => u.gathering) };
});
await page.evaluate(() => { const { sim, r } = window.__botCommander; const c = sim.units.find(u => u.kind === 'scav'); r.cam.x = c.x; r.cam.y = c.y - 60; r.cam.zoom = 1.4; window.__botCommander.setPaused(false); });
await page.waitForTimeout(1200);
await shot('02_gathering');

// 掘り出し物（見つかるまで進める。見つからない seed なら撮らない）
result.find = await page.evaluate(() => {
  const { sim, stepSim } = window.__botCommander; window.__botCommander.setPaused(true);
  for (let i = 0; i < 30 * 60 && !sim.fx.some(f => f.type === 'find'); i++) stepSim(sim);
  window.__botCommander.setPaused(false);
  return sim.mission.finds.map(f => f.name);
});
if (result.find.length) { await page.waitForTimeout(350); await shot('02b_find'); }

// 巡回の異星生物にツギハギ1機を近づけて、追跡させる
result.chase = await page.evaluate(() => {
  const { sim, stepSim } = window.__botCommander; window.__botCommander.setPaused(true);
  const s = sim.units.find(u => u.kind === 'scav');
  const lead = g => sim.units.find(x => x.id === g.unitIds[0]);
  const e = sim.groups.filter(q => q.role === 'patrol' && lead(q)).sort((a, b) => Math.hypot(lead(a).x - s.x, lead(a).y - s.y) - Math.hypot(lead(b).x - s.x, lead(b).y - s.y))[0];
  let n = 0;
  for (; n < 30 * 120 && e.ai !== 'chase' && sim.units.includes(s); n++) {
    if (n % 30 === 0) { const a = lead(e); sim.commands.push({ type: 'move', unitIds: [s.id], waypoints: [{ tx: Math.floor(a.x / 32), ty: Math.floor(a.y / 32) + 1 }], mode: 'rush' }); }
    stepSim(sim);
  }
  for (let i = 0; i < 45; i++) stepSim(sim);
  const a = lead(e) || s;
  return { group: e.name, ai: e.ai, alert: +e.alert.toFixed(2), t: Math.round(sim.time), ax: a.x, ay: a.y };
});
await page.evaluate(({ ax, ay }) => { const { r } = window.__botCommander; r.cam.x = ax; r.cam.y = ay + 40; r.cam.zoom = 1.3; window.__botCommander.setPaused(false); }, result.chase);
await page.waitForTimeout(700);
await page.evaluate(() => window.__botCommander.setPaused(true));
await shot('03_chase');
await page.evaluate(() => { const { r } = window.__botCommander; r.cam.zoom = 3; r.sync(0); r.app.render(); });
await shot('03b_chase_close');
await page.evaluate(() => { window.__botCommander.r.cam.zoom = 1.3; });

// 人間が捕まる: 少女を巡回の異星生物のそばへ置いて数ステップ
result.capture = await page.evaluate(() => {
  const { sim, stepSim, r } = window.__botCommander;
  const g = sim.units.find(u => u.kind === 'girl'), e = sim.units.find(u => u.side === 'enemy');
  g.x = e.x + 10; g.y = e.y + 8; g.order = null;
  for (let i = 0; i < 20 && g.captured == null; i++) stepSim(sim);
  for (let i = 0; i < 6; i++) stepSim(sim);
  r.cam.x = g.x; r.cam.y = g.y - 20; r.cam.zoom = 1.8;
  window.__botCommander.select([]);
  return { captured: g.captured != null, captor: g.captured };
});
await page.evaluate(() => window.__botCommander.setPaused(false));
await page.waitForTimeout(500);
await page.evaluate(() => window.__botCommander.setPaused(true));
await shot('03c_captured');
// v0.4.0-dev: 捕まえた異星生物は見張りで残らず、巣へ運ぶ（運ぶ途中 → 巣に着く）
result.carry = await page.evaluate(() => {
  const { sim, stepSim, r } = window.__botCommander; const unitById = (s, id) => s.units.find(u => u.id === id);
  const g = sim.units.find(u => u.kind === 'girl'), c = unitById(sim, g.captured), x0 = c.x, y0 = c.y;
  for (let i = 0; i < 30 * 4; i++) stepSim(sim);
  r.cam.x = c.x; r.cam.y = c.y - 20; r.cam.zoom = 2.2;
  return { mode: c.order?.mode, moved: Math.hypot(c.x - x0, c.y - y0), attached: Math.hypot(g.x - c.x, g.y - c.y) < 16 };
});
await page.evaluate(() => { const { r } = window.__botCommander; r.sync(0); r.app.render(); });
await shot('03d_carried');
result.nest = await page.evaluate(() => {
  const { sim, stepSim, r } = window.__botCommander; const unitById = (s, id) => s.units.find(u => u.id === id);
  const g = sim.units.find(u => u.kind === 'girl'), c = unitById(sim, g.captured), n = sim.mission.nest;
  // スクショ用: 運んでいる個体を巣の近くへ移して着かせる
  c.x = n.tx * 32 + 16 + 64; c.y = n.ty * 32 + 16 + 40; c.order = null; // 道順は運ぶ処理が引き直す
  for (let i = 0; i < 30 * 30 && g.captured !== 'nest'; i++) stepSim(sim);
  r.cam.x = n.tx * 32 + 16; r.cam.y = n.ty * 32 + 16 - 10; r.cam.zoom = 2;
  return { atNest: g.captured === 'nest', seen: sim.fog.isSeen(n.tx, n.ty) };
});
await page.evaluate(() => { const { r } = window.__botCommander; r.sync(0); r.app.render(); });
await shot('03e_at_nest');
await page.evaluate(() => { window.__botCommander.r.cam.zoom = 1.3; });

// 結果画面: スクショ用に、届けた資材を目標まで入れて1ステップ進める（勝ちの表示の確認）
await page.evaluate(() => { const { sim, stepSim } = window.__botCommander; sim.mission.delivered = sim.mission.target; stepSim(sim); window.__botCommander.setPaused(false); });
await page.waitForSelector('.bc-result:not([hidden])');
await page.waitForTimeout(400);
await shot('04_result');
result.resultText = await page.locator('.bc-result-box').innerText();
// もう一度
await page.locator('.bc-retry').click();
await page.waitForFunction(() => window.__botCommander?.ready && window.__botCommander.sim.time < 2, null, { timeout: 30000 });
result.retry = await page.evaluate(() => ({ time: window.__botCommander.sim.time, result: window.__botCommander.sim.result, hidden: document.querySelector('.bc-result').hidden }));
// 時間切れ（負け）も確認
result.lose = await page.evaluate(() => { const { sim, stepSim } = window.__botCommander; window.__botCommander.setPaused(true); for (const u of sim.units) if (u.side === 'ally') u.hp = 0; stepSim(sim); window.__botCommander.setPaused(false); return [sim.result, sim.resultReason]; });
await page.waitForSelector('.bc-result:not([hidden])');
await page.waitForTimeout(300);
await shot('05_result_lose');
result.fps = await page.evaluate(() => window.__botCommander.r.app.ticker.FPS);
// Current game cache, then actual offline hub -> game boot (fresh browser profile only).
await page.waitForFunction(async name => (await caches.keys()).includes(name), cacheName, { timeout: 30000 });
result.cache = await page.evaluate(async name => { const c = await caches.open(name); return { name, files: (await c.keys()).length }; }, cacheName);
await page.locator('.bc-result-back').click();
await page.waitForFunction(() => !window.__botCommander);
result.backToHub = true;
await ctx.setOffline(true);
await page.reload();
await page.waitForFunction(() => window.__studio_loaded && document.querySelector('[data-game-id="bot-commander"]'));
await page.locator('[data-game-id="bot-commander"]').click();
await page.waitForFunction(() => window.__botCommander?.ready);
result.offline = await page.evaluate(() => ({ online: navigator.onLine, units: window.__botCommander.sim.units.length }));
await shot('06_offline');
result.logs = logs;
await writeFile(OUT + 'mission-checks.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 1));
console.log(logs.join('\n'));
await browser.close();
if (!result.orderByTap || !result.tapOne.ok || result.longKind.n !== 8 || !result.longKind.allPonco || !result.capture.captured || result.carry.mode !== 'carry' || !result.carry.attached || !result.nest.atNest || result.chase.ai !== 'chase' || !result.retry.hidden || result.lose[0] !== 'lose' || result.offline.online || logs.some(l => l.startsWith('[pageerror]'))) process.exitCode = 1;
