// v0.4.4 シールドの確認: コンソールのエラーがないか ＋ スクショ（390x844, DPR2）。
//   shield_block.png: 盾が一撃を受けた瞬間（青いバリアの光・水色のバー）  shield_broken.png: 壊れた瞬間（かけら・知らせ・バーなし）
//   shield_guard.png: 撤退中に盾を構えている（泡と弧・撃たない）  class_icons_ingame.png: ミッション開始そのままの画面（兵種のアイコン）
// 使い方（ゲームフォルダの1つ上で）: python3 -m http.server 8766 --bind 127.0.0.1 を起動してから
//   node bot-commander/tools/shield-shots.mjs [出力フォルダ（既定 /workspace/new-game-rts/cover-proto）]
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
await page.waitForTimeout(1500);
const info = {};
// 撃たれる側のまわりを切り出す（拡大はしない。確認用）
const meClip = async () => { const p = await page.evaluate(() => { const { sim, r } = window.__botCommander; const me = sim.units.find(u => u.id === window.__botCommander.selected()[0]); return r.worldToScreen(me.x, me.y); }); return { x: Math.max(0, p.x - 110), y: Math.max(0, p.y - 120), width: 220, height: 170 }; };
const hint = () => page.locator('.bc-hint, [class*=hint]').first().textContent().catch(() => null);

// 0) ミッション開始そのまま（兵種のアイコン）
await page.evaluate(() => { const B = window.__botCommander; B.setPaused(true); B.select([]); });
await page.waitForTimeout(400);
info.start = await page.evaluate(() => window.__botCommander.sim.units.filter(u => u.side === 'ally').map(u => `${u.label || u.kind}:${u.cls}`));
await page.screenshot({ path: OUT + 'class_icons_ingame.png' });

// 共通の場: 平地（10,52 あたり）に PONCO を集め、ほかの機体と敵は遠くへ
const SETUP = `(() => {
  const { sim, r } = window.__botCommander; window.__botCommander.setPaused(true);
  const far = sim.units.filter(u => u.side === 'enemy');
  far.forEach((u, i) => { u.x = (22 + i % 3) * 32; u.y = (6 + (i / 3 | 0)) * 32; u.speed = 0; u.atk = 0; });
  const ally = sim.units.filter(u => u.side === 'ally');
  ally.forEach((u, i) => { u.order = null; u.x = (16 + i % 4) * 32; u.y = (56 + (i / 4 | 0)) * 32; });
  sim.fog.seen.fill(0); sim.fog.revision++;
  r.cam.zoom = 1.6; r.cam.x = 10 * 32; r.cam.y = 51.4 * 32; r.clampCam();
})()`;
// 撃たれる側（me）・並べて見せる味方（盾の残りいろいろ）・撃つ敵 e
const SCENE = `(() => {
  const { sim } = window.__botCommander;
  const p = sim.units.filter(u => u.kind === 'ponco');
  const me = p.find(u => u.cls === 'gunner'), others = p.filter(u => u !== me && u.cls === 'gunner').slice(0, 3);
  me.x = 9 * 32; me.y = 52 * 32; me.atk = 0;
  [[11.6, 52.6, 1], [7.2, 53.6, 0.5], [11.2, 54.6, 0]].forEach(([x, y, s], i) => { const u = others[i]; u.x = x * 32; u.y = y * 32; u.atk = 0; u.shieldHp = u.shieldMax * s; });
  const e = sim.units.find(u => u.side === 'enemy'); e.atk = 6; e.cd = 0; e.hp = e.maxHp = 5000; e.groupId = null; e.order = null;
  const near = () => { e.x = me.x + 30; e.y = me.y - 16; e.order = null; }; near(); // 押し戻されても届くように毎回となりへ
  window.__near = near;
  return { me, e };
})()`;

// 1) 盾が受けた瞬間
info.block = await page.evaluate(async ([setup, scene]) => {
  const B = window.__botCommander, { sim } = B; eval(setup); const { me, e } = eval(scene);
  const S = await import('/bot-commander/js/sim/sim.js?v=17');
  for (let k = 0; k < 4; k++) S.stepSim(sim);
  me.shieldHp = me.shieldMax * 0.75;
  let hit = null;
  for (let k = 0; k < 30 * 20 && !hit; k++) { window.__near(); const n0 = sim.fx.length; S.stepSim(sim); hit = sim.fx.slice(n0).find(f => f.type === 'shot' && f.to === me.id && f.shield); }
  e.atk = 0;
  B.select([me.id]);
  return { hit: !!hit, shield: Math.round(me.shieldHp), max: me.shieldMax, hp: Math.round(me.hp) };
}, [SETUP, SCENE]);
await page.waitForTimeout(Number(process.env.BLOCK_MS || 220));
await page.screenshot({ path: OUT + 'shield_block.png' });
await page.screenshot({ path: OUT + 'shield_block_zoom.png', clip: await meClip() });
info.blockHint = await hint();

// 2) 壊れた瞬間
await page.evaluate(() => window.__botCommander.restart());
await page.waitForFunction(() => window.__botCommander?.ready, null, { timeout: 30000 });
await page.waitForTimeout(800);
info.broken = await page.evaluate(async ([setup, scene]) => {
  const B = window.__botCommander, { sim } = B; eval(setup); const { me, e } = eval(scene);
  const S = await import('/bot-commander/js/sim/sim.js?v=17');
  for (let k = 0; k < 4; k++) S.stepSim(sim);
  me.shieldHp = 2; // 次に受けたら壊れる
  let br = null;
  for (let k = 0; k < 30 * 30 && !br; k++) { window.__near(); const n0 = sim.fx.length; S.stepSim(sim); br = sim.fx.slice(n0).find(f => f.type === 'shieldBreak'); }
  e.atk = 0;
  for (let k = 0; k < 4; k++) S.stepSim(sim); // かけらが散り始める（知らせは次の描画で出る）
  B.select([me.id]);
  return { broke: !!br, shield: me.shieldHp, hp: Math.round(me.hp), max: me.maxHp };
}, [SETUP, SCENE]);
await page.waitForTimeout(260);
info.brokenToast = await page.evaluate(() => document.querySelector('.bc-toast')?.textContent);
info.brokenHint = await hint();
await page.screenshot({ path: OUT + 'shield_broken.png' });
await page.screenshot({ path: OUT + 'shield_broken_zoom.png', clip: await meClip() });

// 3) 撤退中に盾を構える（撃たない）
await page.evaluate(() => window.__botCommander.restart());
await page.waitForFunction(() => window.__botCommander?.ready, null, { timeout: 30000 });
await page.waitForTimeout(800);
info.guard = await page.evaluate(async ([setup, scene]) => {
  const B = window.__botCommander, { sim } = B; eval(setup); const { me, e } = eval(scene);
  const S = await import('/bot-commander/js/sim/sim.js?v=17');
  for (let k = 0; k < 4; k++) S.stepSim(sim);
  me.atk = 12; // 本当なら撃てる
  S.issueRetreat(sim, [me.id]); S.applyCommandsNow(sim);
  let shots = 0, got = 0;
  for (let k = 0; k < 30 * 2.5; k++) { window.__near(); const n0 = sim.fx.length; S.stepSim(sim); for (const f of sim.fx.slice(n0)) if (f.type === 'shot') { if (f.from === me.id) shots++; if (f.to === me.id) got++; } }
  me.facing = 1; e.atk = 0;
  B.select([me.id]);
  return { mode: me.order?.mode, shotsByMe: shots, hitsTaken: got, shield: Math.round(me.shieldHp), max: me.shieldMax, hp: Math.round(me.hp) };
}, [SETUP, SCENE]);
await page.waitForTimeout(300);
info.guardHint = await hint();
await page.screenshot({ path: OUT + 'shield_guard.png' });
await page.screenshot({ path: OUT + 'shield_guard_zoom.png', clip: await meClip() });

info.logs = logs.filter(l => !l.includes('sw-assets.js') && !l.includes('Failed to load resource') && !l.includes('Service Worker'));
await writeFile(OUT + 'shield_shots.json', JSON.stringify(info, null, 2));
console.log(JSON.stringify(info, null, 2));
await browser.close();
