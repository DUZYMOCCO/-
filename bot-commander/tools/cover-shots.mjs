// 遮蔽物の確認: コンソールのエラーがないか ＋ スクショ（390x844, DPR2）。
//   01: 無傷の木・傷んだ町の残骸（撃ち合いの最中）  02: 壊れた瓦礫・土けむり・落とし物
//   03: 地面に落ちた武器（絵＋名前）  04: PONCO が拾った直後の知らせ（.bc-toast）と頭の上の文字
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
  r.cam.zoom = 0.9; r.cam.x = 10.6 * 32; r.cam.y = 45.2 * 32; r.clampCam();
  let i = 0; for (; i < 30 * 60 && ruins.state === 'intact'; i++) S.stepSim(sim);
  for (let k = 0; k < 20; k++) S.stepSim(sim);
  return { steps: i, ruinsHp: ruins.hp, state: ruins.state };
});
await page.evaluate(() => window.__botCommander.setPaused(false));
await page.waitForTimeout(700);
await page.evaluate(() => window.__botCommander.setPaused(true));
await page.screenshot({ path: OUT + 'cover_01_intact_damaged.png' });
if (process.env.DEBUG) console.log(await page.evaluate(() => { const { sim, r } = window.__botCommander; const v = r.coverView.views[2]; return JSON.stringify({ zoom: r.cam.zoom, cam: [r.cam.x, r.cam.y], alpha: v.body.alpha, h: v.h, w: v.w, c: [v.c.x, v.c.y, v.c.cy], al: sim.units.filter(u => u.side === 'enemy').slice(0, 2).map(u => [u.x, u.y, u.hp]) }); }));

// 02: 壊れるまで進めて、壊れた直後から少し流す（土けむり）。落とし物が出るまで、別の木も壊す
info.broke = await page.evaluate(async () => {
  const B = window.__botCommander, { sim } = B;
  const S = await import('/bot-commander/js/sim/sim.js?v=26');
  const ruins = sim.cover.find(c => c.art === 'town-ruins_v1');
  let i = 0; for (; i < 30 * 90 && ruins.state !== 'rubble'; i++) S.stepSim(sim);
  return { steps: i, state: ruins.state, items: sim.items.map(it => it.type) };
});
await page.evaluate(() => window.__botCommander.setPaused(false));
await page.waitForTimeout(450);
await page.evaluate(() => window.__botCommander.setPaused(true));
await page.screenshot({ path: OUT + 'cover_02_destroyed_drop.png' });
info.final = await page.evaluate(() => { const { sim } = window.__botCommander; return { cover: sim.cover.map(c => `${c.art}:${c.state}:${Math.round(c.hp)}`), items: sim.items.map(i => `${i.type}@${Math.round(i.x)},${Math.round(i.y)}`) }; });

// 03: 落ちた武器。抽選が修理キット・なしだったときは、スクショのために落とし物を武器に置きかえる（中身は rollWeapon で、PONCO が持てる物）
info.weapon = await page.evaluate(async () => {
  const B = window.__botCommander, { sim, r } = B;
  const C = await import('/bot-commander/js/sim/cover.js?v=7');
  const W = await import('/bot-commander/js/sim/weapons.js?v=7');
  localStorage.removeItem('game_studio_botcommander_owned_weapons');
  const ruins = sim.cover.find(c => c.art === 'town-ruins_v1');
  let it = sim.items.find(i => i.type === 'weapon'), forced = false;
  const ponco = sim.units.find(u => u.kind === 'ponco' && u.hp > 0);
  if (!it || !C.canEquip(ponco, W.weaponById(it.weapon))) {
    sim.items.length = 0; forced = true;
    let id = null; for (let k = 0; k < 100 && !id; k++) { const c = C.rollWeapon(C.gearTier(sim.units), (k + 0.5) / 100); if (C.canEquip(ponco, W.weaponById(c))) id = c; }
    it = { id: sim.nextItemId++, type: 'weapon', weapon: id, x: ruins.x + 30, y: ruins.y + 4, t: sim.time, from: ruins.id };
    sim.items.push(it);
  }
  for (const u of sim.units) if (u.side === 'ally' && Math.hypot(u.x - it.x, u.y - it.y) < 60) { u.y = it.y + 70; } // 拾われないように少し離す
  r.cam.zoom = 1.5; r.cam.x = it.x; r.cam.y = it.y - 20; r.clampCam();
  return { forced, item: it.weapon, name: W.weaponById(it.weapon).name, gear: C.gearTier(sim.units), ponco: ponco.id };
});
await page.evaluate(() => window.__botCommander.setPaused(false));
await page.waitForTimeout(500);
await page.evaluate(() => window.__botCommander.setPaused(true));
await page.screenshot({ path: OUT + 'cover_03_weapon_drop.png' });

// 04: PONCO を武器の上へ。拾った直後の知らせ
await page.evaluate(() => {
  const { sim } = window.__botCommander, it = sim.items.find(i => i.type === 'weapon');
  const p = sim.units.find(u => u.kind === 'ponco' && u.hp > 0); p.x = it.x - 4; p.y = it.y; p.order = null;
});
await page.evaluate(() => window.__botCommander.setPaused(false));
await page.waitForTimeout(600);
await page.evaluate(() => window.__botCommander.setPaused(true));
await page.screenshot({ path: OUT + 'cover_04_weapon_pickup_toast.png' });
info.pickup = await page.evaluate(() => {
  const { sim } = window.__botCommander, f = sim.fx.find(f => f.type === 'pickup' && f.weapon);
  const u = f && sim.units.find(u => u.id === f.unit);
  return { fx: f && { name: f.name, weapon: f.weapon, equipped: f.equipped, label: f.label }, unit: u && { weapon: u.weapon, wmul: u.wmul }, toast: document.querySelector('.bc-toast')?.textContent, toastShown: !document.querySelector('.bc-toast')?.hidden, owned: window.__botCommander.owned(), loot: sim.loot };
});
info.logs = logs;
await writeFile(OUT + 'cover-shots.log.json', JSON.stringify(info, null, 1));
console.log(JSON.stringify(info, null, 1));
await browser.close();
