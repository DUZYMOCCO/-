// 着弾・爆発の演出のスクショ（390x844）と短い動画（mp4）、いちばん混んだ時のフレーム時間。ミッション1の本当の戦闘を撮る。
// 使い方（リポジトリのルートで）: python3 -m http.server 8766 --bind 127.0.0.1 を起動してから
//   PW=<playwright-core のフォルダ> node bot-commander/tools/fx-shots.mjs [出力フォルダ]
// 動画は ffmpeg で webm → mp4。計測はヘッドレスの Chrome（swiftshader）なので、スマホの数字ではない。
import { createRequire } from 'node:module';
import { mkdir, writeFile, rm, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || '/workspace/new-game-rts/tools/node_modules/playwright-core');
const BASE = process.env.URL || 'http://127.0.0.1:8766/';
const OUT = (process.argv[2] || '/workspace/new-game-rts/shots_v040dev').replace(/\/?$/, '/');
const VID = '/tmp/bc-fx-video/';
const NOVIDEO = !!process.env.NOVIDEO; // 1 にすると動画なし（録画の負荷なしでフレーム時間だけ測る）
await mkdir(OUT, { recursive: true }); await rm(VID, { recursive: true, force: true });

const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, ...(NOVIDEO ? {} : { recordVideo: { dir: VID, size: { width: 390, height: 844 } } }) });
const page = await ctx.newPage();
const t0 = Date.now();
const logs = [];
page.on('console', m => { if (m.type() !== 'log') logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));
await page.goto(BASE);
await page.waitForFunction(() => window.__studio_loaded && document.querySelector('[data-game-id="bot-commander"]'));
await page.locator('[data-game-id="bot-commander"]').click();
await page.waitForFunction(() => window.__botCommander?.ready, null, { timeout: 30000 });
await page.waitForTimeout(500);

// 戦闘の用意: PONCO 8機とツギハギ4機で、いちばん近い異星生物の群れへ戦闘移動。最初の一発の少し前まで早送り
const setup = await page.evaluate(async () => {
  const B = window.__botCommander, { sim, r } = B;
  const S = await import('/bot-commander/js/sim/sim.js?v=26');
  B.setPaused(true);
  const allies = sim.units.filter(u => u.side === 'ally' && !u.human);
  const cx = allies.reduce((a, u) => a + u.x, 0) / allies.length, cy = allies.reduce((a, u) => a + u.y, 0) / allies.length;
  const al = sim.units.filter(u => u.side === 'enemy').sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy))[0];
  S.issueOrder(sim, allies.map(u => u.id), [{ tx: Math.floor(al.x / 32), ty: Math.floor(al.y / 32) }], { mode: 'fight' });
  let i = 0; for (; i < 30 * 90 && !sim.fx.some(f => f.type === 'shot'); i++) S.stepSim(sim);
  // 計測: Pixi の描画時間も測る
  const rend = r.app.renderer, orig = rend.render.bind(rend); window.__perf = { frames: [] };
  rend.render = (...a) => { const t = performance.now(); const x = orig(...a); window.__perf.renderMs = performance.now() - t; return x; };
  let last = performance.now();
  r.app.ticker.add(() => { const now = performance.now(), st = r.fx.stats();
    window.__perf.frames.push({ t: sim.time, frame: now - last, work: B.state.workMs || 0, render: window.__perf.renderMs || 0, upd: st.updMs, draw: st.drawMs, alive: st.alive, units: sim.units.length, hs: r.fx.hitstop });
    last = now; });
  // カメラは戦っている所の真ん中を追う
  const follow = () => { const fs = sim.fx.filter(f => f.type === 'shot' && sim.time - f.t < 0.6);
    if (fs.length) { const x = fs.reduce((a, f) => a + f.x2, 0) / fs.length, y = fs.reduce((a, f) => a + f.y2, 0) / fs.length; r.cam.x += (x - r.cam.x) * 0.08; r.cam.y += (y - 20 - r.cam.y) * 0.08; } };
  r.app.ticker.add(follow);
  const f = sim.fx.find(f => f.type === 'shot'); r.cam.x = f.x2; r.cam.y = f.y2 - 20; r.cam.zoom = 1.5; r.clampCam();
  return { steps: i, t: sim.time };
});
const fightStart = (Date.now() - t0) / 1000;
await page.evaluate(() => window.__botCommander.setPaused(false));

// 撮る: 撃ち合いが始まって 1.2 秒、乱戦、異星生物が倒れた瞬間、ロボが倒れた瞬間
const shots = [];
const shot = async name => { if (NOVIDEO) return; await page.screenshot({ path: OUT + 'fx_' + name + '.png' }); shots.push('fx_' + name + '.png'); };
await page.waitForTimeout(1200); await shot('01_first_hits');
const seen = new Set();
const deadline = Date.now() + 40000;
while (Date.now() < deadline && seen.size < 3) {
  const ev = await page.evaluate(() => { const { sim } = window.__botCommander; const b = sim.fx.filter(f => f.type === 'boom' && sim.time - f.t < 0.3); return { alien: b.some(f => f.kind === 'alien'), robot: b.some(f => f.side === 'ally' && !f.human), result: !!sim.result, enemies: sim.units.filter(u => u.side === 'enemy').length, hits: sim.fx.filter(f => f.type === 'shot').length }; });
  if (!seen.has('brawl') && ev.hits >= 6) { seen.add('brawl'); await shot('02_brawl'); }
  if (!seen.has('alien') && ev.alien) { seen.add('alien'); await page.waitForTimeout(250); await shot('03_alien_down'); }
  if (!seen.has('robot') && ev.robot) { seen.add('robot'); await page.waitForTimeout(450); await shot('04_robot_down'); }
  if (ev.result) break;
  await page.waitForTimeout(60);
}
await page.waitForTimeout(1500);
const fightEnd = (Date.now() - t0) / 1000;
const perf = await page.evaluate(() => {
  const F = window.__perf.frames.slice(5); if (!F.length) return null;
  const busiest = F.reduce((a, f) => (f.alive > a.alive ? f : a));
  const near = F.filter(f => Math.abs(f.t - busiest.t) < 0.5);
  const avg = k => +(near.reduce((a, f) => a + f[k], 0) / near.length).toFixed(2), max = k => +Math.max(...near.map(f => f[k])).toFixed(2);
  const all = k => { const s = F.map(f => f[k]).sort((a, b) => a - b); return { p50: +s[Math.floor(s.length * 0.5)].toFixed(2), p95: +s[Math.floor(s.length * 0.95)].toFixed(2), max: +s[s.length - 1].toFixed(2) }; };
  const st = window.__botCommander.r.fx.stats();
  return { frames: F.length, busiest: { simTime: +busiest.t.toFixed(1), particles: busiest.alive, units: busiest.units, frameAvg: avg('frame'), frameMax: max('frame'), workAvg: avg('work'), workMax: max('work'), renderAvg: avg('render'), fxUpdAvg: avg('upd'), fxDrawAvg: avg('draw'), fxDrawMax: max('draw') },
    whole: { frame: all('frame'), work: all('work'), render: all('render'), fxDraw: all('draw') }, peakParticles: st.peak, dropped: st.dropped, hitstopFrames: F.filter(f => f.hs > 0).length };
});
await ctx.close(); await browser.close();
const webm = NOVIDEO ? null : (await readdir(VID)).find(f => f.endsWith('.webm'));
const ss = Math.max(0, fightStart - 0.3), dur = Math.min(14, fightEnd - ss);
if (webm) execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(ss), '-i', VID + webm, '-t', String(dur), '-vf', 'scale=390:844,fps=30', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT + 'fx_fight.mp4']);
const result = { setup, shots, video: OUT + 'fx_fight.mp4', clip: { start: +ss.toFixed(1), dur: +dur.toFixed(1) }, perf, logs };
await writeFile(OUT + (NOVIDEO ? 'fx_perf_novideo.json' : 'fx_result.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
