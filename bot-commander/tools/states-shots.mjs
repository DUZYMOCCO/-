// 遮蔽物の状態別の絵（Codex）と落とし物アイコンの確認（390x844, DPR2）。cover-shots.mjs の 01 と同じ場面から。
//   states_01: 無傷の木・傷んだ町の残骸   states_02: 壊れた町の残骸＋落とし物（修理キット・銃・筒・刃・爆弾）
//   states_03: 02 の壊れた建物のまわりを切り抜いて拡大（ゲームの zoom のまま、絵の読みやすさを見る）
// 使い方（ゲームフォルダの1つ上で）: python3 -m http.server 8766 --bind 127.0.0.1 を起動してから
//   node bot-commander/tools/cover-shots.mjs [出力フォルダ（既定 /workspace/new-game-rts/cover-proto）]
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || '/workspace/new-game-rts/tools/node_modules/playwright-core');
const BASE = process.env.URL || 'http://127.0.0.1:8766/';
const OUT = (process.argv[2] || '/workspace/new-game-rts/cover-proto').replace(/\/?$/, '/');
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, serviceWorkers: 'block' }); // 古いキャッシュを使わない
const page = await ctx.newPage();
const logs = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));
page.on('requestfailed', q => logs.push(`[requestfailed] ${q.url()}`));
page.on('response', s => { if (s.status() >= 400) logs.push(`[http ${s.status()}] ${s.url()}`); });
await page.goto(BASE);
await page.waitForFunction(() => window.__studio_loaded && document.querySelector('[data-game-id="bot-commander"]'));
await page.locator('[data-game-id="bot-commander"]').click();
await page.waitForFunction(() => window.__botCommander?.ready, null, { timeout: 30000 });

// ふつうに 6 秒遊ばせる（エラーが出ないか）
await page.waitForTimeout(6000);
const info = { normal: await page.evaluate(() => ({ t: window.__botCommander.sim.time, cover: window.__botCommander.sim.cover.length, sprites: window.__botCommander.r.coverView.views.length })) };

// 撃ち合いの場: 町の残骸（8,45）に異星生物2体（その場から動かない）、南から PONCO 4機が撃つ。木（16,47）は無傷のまま
info.stage = await page.evaluate(async () => {
  const B = window.__botCommander, { sim, r } = B;
  const S = await import('/bot-commander/js/sim/sim.js?v=26');
  const ruins = sim.cover.find(c => c.art === 'town-ruins_v1');
  const aliens = sim.units.filter(u => u.side === 'enemy').slice(0, 2);
  aliens.forEach((a, i) => { a.x = ruins.cx - 40 + i * 80; a.y = ruins.cy + 4; a.speed = 0; a.atk = 0; a.hp = a.maxHp = 2000; });
  for (const u of sim.units.filter(u => u.side === 'enemy').slice(2)) { u.x = 20 * 32; u.y = 8 * 32; u.speed = 0; } // ほかは遠くへ
  const ponco = sim.units.filter(u => u.kind === 'ponco').slice(0, 4);
  ponco.forEach((u, i) => { u.x = (6 + i * 1.6) * 32; u.y = 47.4 * 32; u.order = null; });
  const rest = sim.units.filter(u => u.side === 'ally' && !ponco.includes(u));
  rest.forEach((u, i) => { u.order = null; if (i === 0) { u.x = 15.2 * 32; u.y = 49.5 * 32; } else { u.x = (19 + (i % 4)) * 32; u.y = 55 * 32; } }); // 1機は木のそば（木が見えるように）
  sim.fog.seen.fill(0); sim.fog.revision++;
  r.cam.zoom = 0.9; r.cam.x = 11.3 * 32; r.cam.y = 45.2 * 32; r.clampCam();
  let i = 0; for (; i < 30 * 60 && ruins.state === 'intact'; i++) S.stepSim(sim);
  for (let k = 0; k < 20; k++) S.stepSim(sim);
  return { steps: i, ruinsHp: ruins.hp, state: ruins.state };
});
await page.evaluate(() => window.__botCommander.setPaused(false));
await page.waitForTimeout(700);
await page.evaluate(() => window.__botCommander.setPaused(true));
await page.screenshot({ path: OUT + 'states_01_intact_damaged.png' });
if (process.env.DEBUG) console.log(await page.evaluate(() => { const { sim, r } = window.__botCommander; const v = r.coverView.views[2]; return JSON.stringify({ zoom: r.cam.zoom, cam: [r.cam.x, r.cam.y], alpha: v.body.alpha, h: v.h, w: v.w, c: [v.c.x, v.c.y, v.c.cy], al: sim.units.filter(u => u.side === 'enemy').slice(0, 2).map(u => [u.x, u.y, u.hp]) }); }));


// 02: 壊れるまで進める。そのあと落とし物を5種類並べる（拾われないよう味方は離す）
info.broke = await page.evaluate(async () => {
  const B = window.__botCommander, { sim, r } = B;
  const S = await import('/bot-commander/js/sim/sim.js?v=26');
  const W = await import('/bot-commander/js/sim/weapons.js?v=7');
  const ruins = sim.cover.find(c => c.art === 'town-ruins_v1');
  let i = 0; for (; i < 30 * 90 && ruins.state !== 'rubble'; i++) S.stepSim(sim);
  for (let k = 0; k < 30 * 2; k++) S.stepSim(sim); // 土けむりが落ち着くまで
  const pick = t => W.WEAPONS.find(w => w.type === t && w.slot === 'weapon').id;
  sim.items.length = 0;
  const drops = [{ type: 'repair' }, { type: 'weapon', weapon: pick('shoot') }, { type: 'weapon', weapon: pick('cannon') }, { type: 'weapon', weapon: pick('melee') }, { type: 'weapon', weapon: pick('throw') }];
  drops.forEach((d, k) => sim.items.push({ id: sim.nextItemId++, ...d, x: ruins.x - 130 + k * 65, y: ruins.y + 16 + (k % 2) * 30, t: sim.time - 1, from: ruins.id }));
  sim.units.filter(u => u.side === 'ally').forEach((u, k) => { if (k < 3) { u.x = ruins.x - 110 + k * 110; u.y = ruins.y - 150; } else { u.x = ruins.x - 150 + ((k - 3) % 5) * 75; u.y = ruins.y + 95 + Math.floor((k - 3) / 5) * 34; } u.order = null; u.speed = 0; });
  for (const u of sim.units.filter(u => u.side === 'enemy')) { u.x = 20 * 32; u.y = 8 * 32; u.speed = 0; }
  r.cam.zoom = 1; r.cam.x = ruins.x; r.cam.y = ruins.y - 30; r.clampCam();
  return { steps: i, state: ruins.state, ruinsScreen: r.worldToScreen(ruins.x, ruins.y), items: sim.items.map(it => `${it.type}:${it.weapon || ''}`) };
});
await page.evaluate(() => window.__botCommander.setPaused(false));
await page.waitForTimeout(1200);
await page.evaluate(() => window.__botCommander.setPaused(true));
await page.waitForTimeout(2500); // 土けむりが消えるまで
await page.screenshot({ path: OUT + 'states_02_destroyed_drops.png' });
// 03: 壊れた建物のまわりを切り抜き（DPR2 のまま）
const sc = info.broke.ruinsScreen;
await page.screenshot({ path: OUT + 'states_03_zoom.png', clip: { x: Math.max(0, sc.x - 190), y: Math.max(0, sc.y - 120), width: 380, height: 200 } });
info.final = await page.evaluate(() => { const { sim, r } = window.__botCommander; return { zoom: r.cam.zoom, cover: sim.cover.map(c => `${c.art}:${c.state}:${Math.round(c.hp)}`), items: sim.items.map(i => `${i.type}@${Math.round(i.x)},${Math.round(i.y)}`), views: r.coverView.views.map(v => ({ art: v.c.art, state: v.state, cur: v.cur === v.body ? 'intact/proc' : v.cur === v.alt.damaged ? 'damaged-img' : 'destroyed-img', alt: !!v.alt.damaged + '/' + !!v.alt.destroyed })) }; });
info.logs = logs;
await writeFile(OUT + 'states-shots.log.json', JSON.stringify(info, null, 1));
console.log(JSON.stringify(info, null, 1));
await browser.close();
