// v0.4.2 リペアキットの確認: コンソールのエラーがないか ＋ スクショ（390x844, DPR2）。
//   kit_autouse.png: 撃たれて HP が 40% を切った PONCO が自分でキットを使った直後（緑の輪・十字・「リペアキット +N」、選択中の持ち数）
//   kit_empty_warning.png: キットを使い切った知らせ（赤い .bc-toast.warn）と HP バー横の赤い点
//   repairer_heal.png: リペアラーが近くの味方にキットを使う・キットを作る輪。リペアラーの機体はまだないので、
//     このスクリプトの中だけで PONCO に cls='repairer' を付ける（ゲームのデータは変えない）
// 使い方（ゲームフォルダの1つ上で）: python3 -m http.server 8766 --bind 127.0.0.1 を起動してから
//   node bot-commander/tools/kit-shots.mjs [出力フォルダ（既定 /workspace/new-game-rts/cover-proto）]
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

// 共通の場: 平地（10,52 あたり）に PONCO を集め、ほかの機体と敵は遠くへ
const SETUP = `(() => {
  const { sim, r } = window.__botCommander; window.__botCommander.setPaused(true);
  const far = sim.units.filter(u => u.side === 'enemy');
  far.forEach((u, i) => { u.x = (22 + i % 3) * 32; u.y = (6 + (i / 3 | 0)) * 32; u.speed = 0; u.atk = 0; });
  const ally = sim.units.filter(u => u.side === 'ally');
  ally.forEach((u, i) => { u.order = null; u.x = (16 + i % 4) * 32; u.y = (56 + (i / 4 | 0)) * 32; });
  sim.fog.seen.fill(0); sim.fog.revision++;
  r.cam.zoom = 1.6; r.cam.x = 10 * 32; r.cam.y = 51.4 * 32; r.clampCam();
  return { enemies: far.length, allies: ally.length };
})()`;

// 1) 自分で使う
info.auto = await page.evaluate(async setup => {
  const B = window.__botCommander, { sim } = B; eval(setup);
  const S = await import('/bot-commander/js/sim/sim.js?v=17');
  const p = sim.units.filter(u => u.kind === 'ponco');
  const me = p[0], buddy = p[1];
  me.x = 9 * 32; me.y = 52 * 32; buddy.x = 11 * 32; buddy.y = 52.3 * 32; me.atk = 0; buddy.atk = 0;
  const e = sim.units.find(u => u.side === 'enemy'); e.x = 10 * 32; e.y = 49.3 * 32; e.atk = 6; e.hp = e.maxHp = 5000; e.targetId = me.id;
  me.hp = me.maxHp * 0.48; me.kits = 2; // 1つ残る（知らせは次の場面） buddy.hp = buddy.maxHp * 0.7;
  B.select([me.id]);
  // 撃たれて 40% を切った所（被弾の後に呼ばれるのと同じ autoRepair）。敵は画面の外へ
  e.atk = 0; e.x = 22 * 32; e.y = 6 * 32; me.hp = me.maxHp * 0.32;
  const i = 0; S.autoRepair(sim, me);
  for (let k = 0; k < 8; k++) S.stepSim(sim);
  return { steps: i, kits: me.kits, hp: Math.round(me.hp), max: me.maxHp, use: sim.fx.filter(f => f.type === 'kitUse').length };
}, SETUP);
await page.waitForTimeout(500);
info.autoHint = await page.locator('.bc-hint, [class*=hint]').first().textContent().catch(() => null);
await page.screenshot({ path: OUT + 'kit_autouse.png' });

// 2) 使い切りの知らせ（上の PONCO が 0 個。赤い点がつく）。少し流して輪が消えてから
info.empty = await page.evaluate(async () => {
  const { sim } = window.__botCommander;
  const S = await import('/bot-commander/js/sim/sim.js?v=17');
  for (let k = 0; k < 40; k++) S.stepSim(sim);
  const me = sim.units.find(u => u.kind === 'ponco'); me.hp = me.maxHp * 0.3; S.autoRepair(sim, me); // 最後の1つ
  for (let k = 0; k < 6; k++) S.stepSim(sim); // 知らせは次の描画で出る（fx が消える前に）
  const em = sim.fx.filter(f => f.type === 'kitEmpty');
  return { kitEmpty: em.length, toast: document.querySelector('.bc-toast')?.textContent, hidden: document.querySelector('.bc-toast')?.hidden };
});
await page.waitForTimeout(250);
await page.screenshot({ path: OUT + 'kit_empty_warning.png' });

// 3) リペアラー（スクリプトの中だけで PONCO に付ける）
await page.evaluate(() => window.__botCommander.restart());
await page.waitForFunction(() => window.__botCommander?.ready, null, { timeout: 30000 });
await page.waitForTimeout(800);
info.repairer = await page.evaluate(async setup => {
  const B = window.__botCommander, { sim } = B; eval(setup);
  const S = await import('/bot-commander/js/sim/sim.js?v=17');
  const p = sim.units.filter(u => u.kind === 'ponco');
  const rep = p[0], hurt = p[1], maker = p[2];
  rep.cls = 'repairer'; rep.label = 'リペアラー'; rep.kits = 3; rep.x = 9 * 32; rep.y = 52 * 32;
  hurt.x = 10.8 * 32; hurt.y = 51.2 * 32; hurt.kits = 0; hurt.hp = hurt.maxHp * 0.25;
  maker.cls = 'repairer'; maker.label = 'リペアラー2'; maker.kits = 1; maker.x = 8.4 * 32; maker.y = 53.6 * 32; maker.hp = maker.maxHp;
  sim.mission.delivered = 30;
  const d0 = sim.mission.delivered;
  S.stepSim(sim); // ここで使う・作り始める
  for (let k = 0; k < 30 * 4; k++) S.stepSim(sim); // 作るのが 4 割ほど進む（使った輪はまだ薄く残る…ように 0.4 秒前に）
  // 使った瞬間を見せるため、もう一度ケガさせてもう1回
  hurt.hp = hurt.maxHp * 0.3; rep.healCd = 0; S.stepSim(sim);
  for (let k = 0; k < 7; k++) S.stepSim(sim);
  B.select([rep.id, hurt.id, maker.id]);
  return { repKits: rep.kits, hurtHp: Math.round(hurt.hp), makerKits: maker.kits, build: maker.kitBuild, repBuild: rep.kitBuild, delivered: sim.mission.delivered, d0, uses: sim.fx.filter(f => f.type === 'kitUse' && f.by !== f.unit).length };
}, SETUP);
await page.waitForTimeout(500);
info.repHint = await page.locator('.bc-hint, [class*=hint]').first().textContent().catch(() => null);
await page.screenshot({ path: OUT + 'repairer_heal.png' });
info.logs = logs;
await writeFile(OUT + 'kit_shots.json', JSON.stringify(info, null, 2));
console.log(JSON.stringify(info, null, 2));
await browser.close();
