// 少年（紙芝居式の絵）をミッション1で寄って撮る: スクショ（390x844）と短い動画（mp4）
// 使い方: game-single-units で python3 -m http.server 8766 --bind 127.0.0.1 を起動してから
//   PW=<playwright-core のフォルダ> node bot-commander/tools/boy-shots.mjs [出力フォルダ]
// ミッション1では人間は撃たれないので、被弾（驚く・倒れる）と脱出口で座る所は、この台本の中で起こしている。
import { createRequire } from 'node:module';
import { mkdir, writeFile, rm, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || '/workspace/new-game-rts/tools/node_modules/playwright-core');
const BASE = process.env.URL || 'http://127.0.0.1:8766/';
const OUT = (process.argv[2] || '/workspace/new-game-rts/shots_v040dev').replace(/\/?$/, '/');
const VID = '/tmp/bc-boy-video/';
await mkdir(OUT, { recursive: true }); await rm(VID, { recursive: true, force: true });

const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, recordVideo: { dir: VID, size: { width: 390, height: 844 } } });
const page = await ctx.newPage();
const t0 = Date.now(), logs = [], marks = [];
page.on('console', m => { if (m.type() !== 'log') logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));
await page.goto(BASE);
await page.waitForFunction(() => window.__studio_loaded && document.querySelector('[data-game-id="bot-commander"]'));
await page.locator('[data-game-id="bot-commander"]').click();
await page.waitForFunction(() => window.__botCommander?.ready, null, { timeout: 30000 });
await page.waitForTimeout(500);

const info = await page.evaluate(async () => {
  const B = window.__botCommander, { sim, r } = B;
  window.__S = await import('/bot-commander/js/sim/sim.js?v=26');
  window.__R = await import('/bot-commander/js/fx/react.js?v=2');
  const u = sim.units.find(x => x.kind === 'boy'); window.__boy = u.id;
  r.cam.zoom = 4; r.cam.x = u.x; r.cam.y = u.y - 8; r.clampCam();
  r.app.ticker.add(() => { const b = sim.units.find(x => x.id === window.__boy); if (b) { r.cam.x += (b.x - r.cam.x) * 0.15; r.cam.y += (b.y - 8 - r.cam.y) * 0.15; } });
  return { boy: u.id, at: [u.x, u.y], chars: Object.keys(r.chars), size: r.app.renderer.resolution };
});
const mark = name => marks.push([name, (Date.now() - t0) / 1000]);
const state = () => page.evaluate(() => { const { sim, r } = window.__botCommander, v = r.views.get(window.__boy), b = sim.units.find(x => x.id === window.__boy);
  return { motion: v?.anim?.motion, x: b?.x, y: b?.y, moving: b?.moving }; });
const shots = [];
const shot = async name => { await page.screenshot({ path: OUT + 'boy_' + name + '.png' }); shots.push({ file: 'boy_' + name + '.png', ...(await state()) }); };
const order = (dtx, mode) => page.evaluate(([dtx, mode]) => { const { sim } = window.__botCommander, b = sim.units.find(x => x.id === window.__boy);
  window.__S.issueOrder(sim, [b.id], [{ tx: Math.floor(b.x / 32) + dtx, ty: Math.floor(b.y / 32) }], { mode }); }, [dtx, mode]);
const untilStill = async (max = 8000) => { const end = Date.now() + max; while (Date.now() < end && (await state()).moving) await page.waitForTimeout(100); };
const hit = (w, dir, kind) => page.evaluate(([w, dir, kind]) => { const b = window.__botCommander.sim.units.find(x => x.id === window.__boy);
  window.__R.hitReact(b, { w, dir, human: true, kind }); }, [w, dir, kind]);

mark('start');
await page.waitForTimeout(1200); await shot('01_idle');
mark('walk'); await order(4, 'fight'); await page.waitForTimeout(1300); await shot('02_walk'); await untilStill();
await page.waitForTimeout(400);
mark('run'); await order(-5, 'rush'); await page.waitForTimeout(1300); await shot('03_run_left'); await untilStill();
await page.waitForTimeout(500);
mark('hurt'); await hit(0.45, Math.PI); await page.waitForTimeout(120); await shot('04_hurt'); await page.waitForTimeout(1100);
mark('knockdown'); await hit(1, 0, 'explosion'); await page.waitForTimeout(650); await shot('05_knockdown');
await page.waitForTimeout(2400);
mark('wave'); await page.evaluate(() => window.__botCommander.select([window.__boy])); await page.waitForTimeout(450); await shot('07_wave_selected');
await page.waitForTimeout(1300); await page.evaluate(() => window.__botCommander.select([]));
mark('end');
// 起き上がり（0.45 秒しかないので、動画の後でもう一度倒し、起き上がりの途中で一時停止して撮る）
await page.waitForTimeout(600); await hit(1, Math.PI, 'explosion');
await page.evaluate(() => new Promise(res => { const B = window.__botCommander, f = () => { const o = B.sim.units.find(x => x.id === window.__boy)?._hr?.out;
  if (o?.anim === 'getup' && o.animT > 0.3) { B.setPaused(true); B.r.app.ticker.remove(f); res(); } }; B.r.app.ticker.add(f); }));
await page.waitForTimeout(300); await shot('06_getup'); await page.evaluate(() => window.__botCommander.setPaused(false)); await page.waitForTimeout(1200);
// 座る: 脱出口の輪の中で止まっている時（ここだけ少年を脱出口へ置き直す。動画には入れない）
await page.evaluate(() => { const { sim } = window.__botCommander, b = sim.units.find(x => x.id === window.__boy), ex = sim.mission.extraction;
  b.x = ex.tx * 32 + 16 + 64; b.y = ex.ty * 32 + 16; b.order = null; b.moving = false; b.anchor = { x: b.x, y: b.y }; });
await page.waitForTimeout(4200); await shot('08_sit_extraction');
await ctx.close(); await browser.close();
const webm = (await readdir(VID)).find(f => f.endsWith('.webm'));
const ss = marks.find(m => m[0] === 'start')[1] + 0.6, dur = marks.find(m => m[0] === 'end')[1] - ss;
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(ss), '-i', VID + webm, '-t', String(dur), '-vf', 'scale=390:844,fps=30', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT + 'boy_ingame.mp4']);
const result = { info, shots, video: OUT + 'boy_ingame.mp4', clip: { start: +ss.toFixed(1), dur: +dur.toFixed(1) }, marks: marks.map(([n, t]) => [n, +(t - ss).toFixed(1)]), logs };
await writeFile(OUT + 'boy_result.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
