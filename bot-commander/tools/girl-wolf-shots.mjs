// 少女と狼の獣人（紙芝居式の絵）をミッション1で寄って撮る: スクショ（390x844）と短い動画（mp4）
// 使い方: game-single-units で python3 -m http.server 8766 --bind 127.0.0.1 を起動してから
//   PW=<playwright-core のフォルダ> node bot-commander/tools/girl-wolf-shots.mjs [出力フォルダ]
// 台本で起こしていること: 被弾（ミッション1では人は撃たれない）、異星生物を少女の横へ置き直して運ばせる、
// 狼の獣人は地図に出ないので、少年の見た目だけを狼の絵に差し替えて動かす（sim は少年のまま）。
import { createRequire } from 'node:module';
import { mkdir, writeFile, rm, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || '/workspace/new-game-rts/tools/node_modules/playwright-core');
const BASE = process.env.URL || 'http://127.0.0.1:8766/';
const OUT = (process.argv[2] || '/workspace/new-game-rts/shots_v040dev').replace(/\/?$/, '/');
const VID = '/tmp/bc-gw-video/';
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
  window.__S = await import('/bot-commander/js/sim/sim.js?v=13');
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

// 少女
mark('start');
await page.waitForTimeout(900);
mark('walk'); await order(4, 'fight'); await page.waitForTimeout(1200); await shot('girl_01_walk'); await untilStill();
mark('run'); await order(5, 'rush'); await page.waitForTimeout(1200); await shot('girl_02_run'); await untilStill();
await page.waitForTimeout(300);
mark('hurt'); await hit(0.45, 0); await page.waitForTimeout(120); await shot('girl_03_hurt'); await page.waitForTimeout(1000);
mark('knockdown'); await hit(1, Math.PI, 'explosion'); await page.waitForTimeout(2300);
mark('carried');
const carrier = await page.evaluate(() => { const { sim } = window.__botCommander, g = sim.units.find(x => x.id === window.__girl);
  const e = sim.units.filter(u => u.side === 'enemy').sort((a, b) => Math.hypot(a.x - g.x, a.y - g.y) - Math.hypot(b.x - g.x, b.y - g.y))[0];
  e.x = g.x + 14; e.y = g.y; e.order = null; e.moving = false; return e.id; });
await page.waitForFunction(() => window.__botCommander.sim.units.find(x => x.id === window.__girl)?.captured != null, null, { timeout: 5000 }).catch(() => {});
await page.waitForTimeout(1500); await shot('girl_04_carried'); await page.waitForTimeout(1800);
// 狼の獣人（少年の見た目だけ差し替え）
mark('wolf');
await page.evaluate(() => { const { r } = window.__botCommander, v = r.views.get(window.__boy); v.sheet = r.chars.wolf; v.anim.motion = 'idle'; v.anim.t = 0;
  v.shadow.scale.set(34 / 24, 1); window.__who = window.__boy; });
await page.waitForTimeout(900); await shot('wolf_01_idle');
await order(4, 'fight'); await page.waitForTimeout(1300); await shot('wolf_02_walk'); await untilStill();
await order(-5, 'rush'); await page.waitForTimeout(1100); await shot('wolf_03_run'); await untilStill();
await page.waitForTimeout(300);
await hit(1, Math.PI, 'explosion'); await page.waitForTimeout(2300);
mark('end');
// 起き上がり（0.45 秒しかないので、動画の後でもう一度倒し、途中で一時停止して撮る）
await page.evaluate(() => { const u = window.__botCommander.sim.units.find(x => x.id === window.__who); if (u._hr) u._hr.res = 0; }); // 倒れにくさ（res）を戻してから
await hit(1, 0, 'explosion');
const gdbg = await page.evaluate(() => new Promise(res => { const seen = []; const B = window.__botCommander, v = B.r.views.get(window.__who), f = () => { const o = B.sim.units.find(x => x.id === window.__who)?._hr?.out;
  seen.push((o?.anim || '-') + ':' + (v?.anim?.motion || '?')); if (v?.anim?.motion === 'getup' && o?.animT > 0.3) { B.setPaused(true); B.r.app.ticker.remove(f); res('ok'); } }; B.r.app.ticker.add(f); setTimeout(() => { B.r.app.ticker.remove(f); res([...new Set(seen)].join(' ')); }, 6000); }));
console.error('getup wait:', gdbg);
await page.waitForTimeout(300); await shot('wolf_04_getup'); await page.evaluate(() => window.__botCommander.setPaused(false));
await ctx.close(); await browser.close();
const webm = (await readdir(VID)).find(f => f.endsWith('.webm'));
const ss = marks.find(m => m[0] === 'start')[1] + 1.0, dur = marks.find(m => m[0] === 'end')[1] - ss;
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(ss), '-i', VID + webm, '-t', String(dur), '-vf', 'scale=390:844,fps=30', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT + 'girl_wolf_ingame.mp4']);
const result = { info, carrier, shots, video: OUT + 'girl_wolf_ingame.mp4', clip: { start: +ss.toFixed(1), dur: +dur.toFixed(1) }, marks: marks.map(([n, t]) => [n, +(t - ss).toFixed(1)]), logs };
await writeFile(OUT + 'girl_wolf_result.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
