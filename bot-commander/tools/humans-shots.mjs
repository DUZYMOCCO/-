// 少年と少女（紙芝居式の絵 v2: コマを増やした版）をミッション1で4倍に寄って撮る: 動画（mp4）とスクショ数枚
// 使い方: game-single-units で python3 -m http.server 8766 --bind 127.0.0.1 を起動してから
//   PW=<playwright-core のフォルダ> node bot-commander/tools/humans-shots.mjs [出力フォルダ]
// 台本で起こしていること: 被弾（ミッション1では人は撃たれない）、脱出口へ置き直して座らせる、
// 少女を元の場所へ戻して異星生物を横へ置き直し運ばせる。手を振るのは選んだ時の1回分。
import { createRequire } from 'node:module';
import { mkdir, writeFile, rm, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || '/workspace/new-game-rts/tools/node_modules/playwright-core');
const BASE = process.env.URL || 'http://127.0.0.1:8766/';
const OUT = (process.argv[2] || '/workspace/new-game-rts/shots_v040dev').replace(/\/?$/, '/');
const VID = '/tmp/bc-hum-video/';
await mkdir(OUT, { recursive: true }); await rm(VID, { recursive: true, force: true });

const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, recordVideo: { dir: VID, size: { width: 390, height: 844 } } });
const page = await ctx.newPage();
const t0 = Date.now(), logs = [], marks = [];
page.on('console', m => { if (m.type() !== 'log') logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));
page.on('response', r => { if (r.status() >= 400) logs.push(`[${r.status()}] ${r.url()}`); });
await page.goto(BASE);
await page.waitForFunction(() => window.__studio_loaded && document.querySelector('[data-game-id="bot-commander"]'));
await page.locator('[data-game-id="bot-commander"]').click();
await page.waitForFunction(() => window.__botCommander?.ready, null, { timeout: 30000 });
await page.waitForTimeout(500);

const info = await page.evaluate(async () => {
  const B = window.__botCommander, { sim, r } = B;
  window.__S = await import('/bot-commander/js/sim/sim.js?v=26');
  window.__R = await import('/bot-commander/js/fx/react.js?v=2');
  const g = sim.units.find(x => x.kind === 'girl'), b = sim.units.find(x => x.kind === 'boy');
  window.__who = g.id; window.__girl = g.id; window.__boy = b.id;
  r.cam.zoom = 4; r.cam.x = g.x; r.cam.y = g.y - 8; r.clampCam();
  r.app.ticker.add(() => { const u = sim.units.find(x => x.id === window.__who); if (u) { r.cam.x += (u.x - r.cam.x) * 0.15; r.cam.y += (u.y - 8 - r.cam.y) * 0.15; } });
  return { girl: g.id, boy: b.id, chars: Object.keys(r.chars) };
});
const mark = name => marks.push([name, (Date.now() - t0) / 1000]);
const state = () => page.evaluate(() => { const { sim, r } = window.__botCommander, v = r.views.get(window.__who), u = sim.units.find(x => x.id === window.__who);
  return { who: v?.sheet?.def.character, motion: v?.anim?.motion, captured: u?.captured ?? null }; });
const shots = [];
const shot = async name => { await page.screenshot({ path: OUT + name + '.png' }); shots.push({ file: name + '.png', ...(await state()) }); };
const order = (dtx, mode) => page.evaluate(([dtx, mode]) => { const { sim } = window.__botCommander, u = sim.units.find(x => x.id === window.__who);
  window.__S.issueOrder(sim, [u.id], [{ tx: Math.floor(u.x / 32) + dtx, ty: Math.floor(u.y / 32) }], { mode }); }, [dtx, mode]);
const untilStill = async (max = 8000) => { const end = Date.now() + max;
  while (Date.now() < end && await page.evaluate(() => window.__botCommander.sim.units.find(x => x.id === window.__who)?.moving)) await page.waitForTimeout(100); };
const hit = (w, dir, kind) => page.evaluate(([w, dir, kind]) => { const u = window.__botCommander.sim.units.find(x => x.id === window.__who);
  window.__R.hitReact(u, { w, dir, human: true, kind }); }, [w, dir, kind]);


const sel = ids => page.evaluate(ids => window.__botCommander.select(ids.map(k => window[k])), ids);
const follow = who => page.evaluate(who => { window.__who = window[who]; }, who);
const toExit = (who, dx) => page.evaluate(([who, dx]) => { const { sim } = window.__botCommander, u = sim.units.find(x => x.id === window[who]), ex = sim.mission.extraction;
  u.x = ex.tx * 32 + 16 + dx; u.y = ex.ty * 32 + 16; u.order = null; u.moving = false; u.anchor = { x: u.x, y: u.y }; }, [who, dx]);
const resetRes = () => page.evaluate(() => { const u = window.__botCommander.sim.units.find(x => x.id === window.__who); if (u._hr) u._hr.res = 0; });
const stop = () => page.evaluate(() => { const u = window.__botCommander.sim.units.find(x => x.id === window.__who); u.order = null; u.moving = false; u.anchor = { x: u.x, y: u.y }; });
const knock = async (dir, name) => { await resetRes(); await hit(1, dir, 'explosion'); await page.waitForTimeout(450); if (name) await shot(name); await page.waitForTimeout(1700); };

mark('start');
// 少年
await follow('__boy'); await page.waitForTimeout(1200);
mark('boy_walk'); await order(4, 'fight'); await page.waitForTimeout(1300); await shot('humans_v2_01_boy_walk'); await untilStill();
mark('boy_run'); await order(-5, 'rush'); await page.waitForTimeout(1100); await shot('humans_v2_02_boy_run'); await untilStill();
await stop(); await page.waitForTimeout(400);
mark('boy_hurt'); await hit(0.45, Math.PI); await page.waitForTimeout(1300);
mark('boy_knockdown'); await knock(0, 'humans_v2_03_boy_knockdown');
mark('boy_wave'); await sel(['__boy']); await page.waitForTimeout(700); await shot('humans_v2_04_boy_wave'); await page.waitForTimeout(1300); await sel([]);
mark('boy_sit'); await toExit('__boy', 64); await page.waitForTimeout(4600); await shot('humans_v2_05_boy_sit');
// 少女
mark('girl'); await follow('__girl'); await page.waitForTimeout(1000);
mark('girl_walk'); await order(3, 'fight'); await page.waitForTimeout(1300); await shot('humans_v2_06_girl_walk'); await untilStill();
mark('girl_run'); await order(4, 'rush'); await page.waitForTimeout(1100); await shot('humans_v2_07_girl_run'); await untilStill();
await stop(); await page.waitForTimeout(400);
mark('girl_hurt'); await hit(0.45, 0); await page.waitForTimeout(1300);
mark('girl_knockdown'); await knock(Math.PI, 'humans_v2_08_girl_knockdown');
mark('girl_wave'); await sel(['__girl']); await page.waitForTimeout(700); await shot('humans_v2_09_girl_wave'); await page.waitForTimeout(1300); await sel([]);
const back = await page.evaluate(() => { const g = window.__botCommander.sim.units.find(x => x.id === window.__girl); return { x: g.x, y: g.y }; });
mark('girl_sit'); await toExit('__girl', 40); await page.waitForTimeout(4600); await shot('humans_v2_10_girl_boy_sit');
mark('girl_carried');
await page.evaluate(b => { const { sim } = window.__botCommander, g = sim.units.find(x => x.id === window.__girl); g.x = b.x; g.y = b.y; g.anchor = { x: g.x, y: g.y }; }, back);
await page.waitForTimeout(800);
const carrier = await page.evaluate(() => { const { sim } = window.__botCommander, g = sim.units.find(x => x.id === window.__girl);
  const e = sim.units.filter(u => u.side === 'enemy' && u.carrying == null).sort((a, b) => Math.hypot(a.x - g.x, a.y - g.y) - Math.hypot(b.x - g.x, b.y - g.y))[0];
  e.x = g.x + 14; e.y = g.y; e.order = null; e.moving = false; return e.id; });
await page.waitForFunction(() => window.__botCommander.sim.units.find(x => x.id === window.__girl)?.captured != null, null, { timeout: 5000 }).catch(() => {});
await page.waitForTimeout(1500); await shot('humans_v2_11_girl_carried'); await page.waitForTimeout(1800);
mark('end');
await ctx.close(); await browser.close();
const webm = (await readdir(VID)).find(f => f.endsWith('.webm'));
const ss = marks.find(m => m[0] === 'start')[1] + 1.0, dur = marks.find(m => m[0] === 'end')[1] - ss;
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(ss), '-i', VID + webm, '-t', String(dur), '-vf', 'scale=390:844,fps=30', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT + 'humans_ingame_v2.mp4']);
const result = { info, carrier, shots, video: OUT + 'humans_ingame_v2.mp4', clip: { start: +ss.toFixed(1), dur: +dur.toFixed(1) }, marks: marks.map(([n, t]) => [n, +(t - ss).toFixed(1)]), logs };
await writeFile(OUT + 'humans_v2_result.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
