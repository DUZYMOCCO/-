// v0.4.12 Codex gfx2 の取り込み確認: ?chardemo=1（斜め・横）の獣人、本編で少年の見た目を獣人（斜め）に差し替え、?dialogdemo=all の痛がる顔。390x844 DPR2
// 使い方: game-single-units で python3 -m http.server <port> --bind 127.0.0.1 → PW=<playwright-core> URL=http://127.0.0.1:<port>/ node bot-commander/tools/gfx2-shots.mjs [出力]
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW);
const BASE = process.env.URL || 'http://127.0.0.1:8774/';
const OUT = (process.argv[2] || '/workspace/new-game-rts/cover-proto/gfx2').replace(/\/?$/, '/');
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const logs = [], info = {};
async function open(query) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/sw-assets|Service Worker|Failed to load resource/.test(m.text())) logs.push(`[${query}][${m.type()}] ${m.text()}`); });
  page.on('pageerror', e => logs.push(`[${query}][pageerror] ${e.message}`));
  page.on('response', s => { if (s.status() >= 400 && !/\/(color-ants|iron-squad|dada-survivor|math-runner)\//.test(s.url())) logs.push(`[${query}][http ${s.status()}] ${s.url()}`); });
  await page.goto(BASE + query);
  await page.waitForFunction(() => window.__studio_loaded && document.querySelector('[data-game-id="bot-commander"]'));
  await page.locator('[data-game-id="bot-commander"]').click();
  return { ctx, page };
}
const shot = (page, n) => page.screenshot({ path: OUT + n + '.png' });
const wait = (p, ms = 500) => p.waitForTimeout(ms);
// ?chardemo=1: 斜め（&human=oblique）と横
for (const [q, tag] of [['?chardemo=1&human=oblique', 'obl'], ['?chardemo=1', 'side']]) {
  const { ctx, page } = await open(q);
  await page.waitForSelector('.cd-panel [data-st="idle"]', { timeout: 60000 }); await wait(page, 1500);
  await shot(page, `chardemo_${tag}_idle`);
  info[`chardemo_${tag}`] = await page.evaluate(() => document.querySelector('.cd-info')?.textContent);
  await page.click('.cd-panel [data-st="run"]'); await wait(page, 700); await shot(page, `chardemo_${tag}_run`);
  await page.click('.cd-panel [data-st="idle"]'); await wait(page, 400);
  await page.click('.cd-panel [data-st="hurt"]'); await wait(page, 200); await shot(page, `chardemo_${tag}_hurt`);
  await ctx.close();
}
// 本編（斜め）: 獣人は地図に出ないので、少年の見た目だけ獣人の絵に差し替え、少女の横に置いて寄る（sim は少年のまま）
{ const { ctx, page } = await open('?human=oblique');
  await page.waitForFunction(() => window.__botCommander?.ready, null, { timeout: 60000 }); await wait(page, 1500);
  info.main = await page.evaluate(() => {
    const { sim, r } = window.__botCommander;
    const g = sim.units.find(x => x.kind === 'girl'), b = sim.units.find(x => x.kind === 'boy');
    b.order = null; g.order = null; b.x = g.x + 26; b.y = g.y; b.moving = false;
    const v = r.views.get(b.id); v.sheet = r.chars.wolf; v.anim.motion = 'idle'; v.anim.t = 0; v.shadow?.scale.set(30 / 24, 1);
    r.cam.zoom = 4; r.cam.x = g.x + 13; r.cam.y = g.y - 10; r.clampCam();
    return { wolfDef: v.sheet?.def?.character || v.sheet?.def?.dir || null, chars: Object.keys(r.chars) };
  });
  await wait(page, 1200); await shot(page, 'main_obl_wolf_girl');
  await ctx.close(); }
// ?dialogdemo=all&from=BOY: 少年 hurt、少女 hurt、獣人 pain・hurt
{ const { ctx, page } = await open('?dialogdemo=all&from=BOY');
  await page.waitForFunction(() => window.__dialog, null, { timeout: 60000 }); await wait(page, 1500);
  const want = new Set(['BOY:hurt', 'BOY:pain', 'GIRL:hurt', 'WOLF:pain', 'WOLF:hurt']); info.dialog = [];
  for (let i = 0; i < 120 && want.size; i++) {
    const face = await page.evaluate(() => { const st = window.__dialog?.state(); if (!st?.line) return null; const sd = st.stage.left?.id === st.line.who ? 'left' : 'right'; return `${st.line.who}:${st.stage[sd]?.face}`; });
    if (face && want.has(face)) { await wait(page, 2500); await shot(page, 'dialog_' + face.replace(':', '_')); want.delete(face); info.dialog.push(face); await page.evaluate(() => window.__dialog.tap()); await wait(page, 120); continue; }
    await page.evaluate(() => window.__dialog?.tap()); await wait(page, 120);
  }
  info.dialogMissing = [...want];
  await ctx.close(); }
await writeFile(OUT + 'info.json', JSON.stringify({ info, logs }, null, 1));
console.log(JSON.stringify({ out: OUT, info, logs }, null, 1));
await browser.close();
