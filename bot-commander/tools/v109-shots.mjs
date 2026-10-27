// v1.0.9 の確認: ロボの名前（トースト「○○：敵を発見！」・選択のヒント・☰ の今の成績・結果のランキング）と ☰ の「音楽」入/切、BGM の曲の切り替え。
// 使い方（game-single-units で）: python3 -m http.server 18932 --bind 127.0.0.1 を起動してから
//   URL=http://127.0.0.1:18932/ node bot-commander/tools/v109-shots.mjs <出力フォルダ>
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || '/workspace/new-game-rts/tools/node_modules/playwright-core');
const BASE = process.env.URL || 'http://127.0.0.1:18932/';
const OUT = (process.argv[2] || '/workspace/new-game-rts/cover-proto/v109_shots').replace(/\/?$/, '/');
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
const page = await ctx.newPage();
const logs = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));
page.on('response', s => { if (s.status() >= 400) logs.push(`[http ${s.status()}] ${s.url()}`); });
await page.goto(BASE + '?tutorial=0');
await page.waitForFunction(() => window.__studio_loaded && document.querySelector('[data-game-id="bot-commander"]'));
await page.locator('[data-game-id="bot-commander"]').click();
await page.waitForFunction(() => window.__botCommander?.ready, null, { timeout: 30000 });
const shot = async n => { await page.waitForTimeout(250); await page.screenshot({ path: OUT + n }); console.log('shot', n); };
const bgmId = () => page.evaluate(() => window.__botCommander.bgm?.()?.cur?.id || null);
const report = { bgm: [] };
report.bgm.push(['start', await bgmId()]);
// 発見のトーストが出るまで進める（発見で止める＝入）
await page.evaluate(() => window.__botCommander.setSpeed(3));
// スクショ用: いちばん近い敵を味方の近くへ寄せる（確認用の操作。ゲームの中身は変えない）
await page.waitForTimeout(1500);
await page.evaluate(() => { const { sim } = window.__botCommander; const a = sim.units.find(u => u.side === 'ally' && !u.human && u.hp > 0); const es = sim.units.filter(u => u.side === 'enemy' && u.hp > 0 && !u.object); es.sort((p, q) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(q.x - a.x, q.y - a.y)); for (const e of es.slice(0, 2)) { e.x = a.x + 150; e.y = a.y + 20; } });
await page.waitForFunction(() => !!document.querySelector('.bc-toast:not([hidden])') && /敵を発見/.test(document.querySelector('.bc-toast').textContent), null, { timeout: 90000 }).catch(() => logs.push('no spot toast'));
report.toast = await page.evaluate(() => document.querySelector('.bc-toast')?.textContent);
await shot('01_spot_toast.png');
// 1 機えらぶ → ヒントに名前
await page.evaluate(() => { const b = window.__botCommander; const u = b.sim.units.find(u => u.side === 'ally' && !u.human && u.hp > 0); b.select([u.id]); });
report.hint = await page.evaluate(() => document.querySelector('.bc-hint')?.textContent);
await shot('02_select_hint.png');
// ☰（音楽の入/切）
await page.evaluate(() => window.__botCommander.openMenu());
await shot('03_menu_music.png');
await page.locator('[data-bgm="0"]').click(); report.bgm.push(['toggle off', await page.evaluate(() => window.__botCommander.bgm().ok())]);
await page.locator('[data-bgm="1"]').click(); report.bgm.push(['toggle on', await page.evaluate(() => window.__botCommander.bgm().ok())]);
// 今の成績
await page.locator('.bc-menu-stats').click();
await shot('04_stats_now.png');
await page.keyboard.press('Escape').catch(() => {});
await page.evaluate(() => { const sv = document.querySelector('.bc-stats'); if (sv) sv.hidden = true; window.__botCommander.closeMenu(); window.__botCommander.setPaused(false); });
// しばらく戦わせて曲の変化を見る
for (let i = 0; i < 6; i++) { await page.waitForTimeout(2000); await page.evaluate(() => { const b = window.__botCommander; if (b.state.paused) b.setPaused(false); }); report.bgm.push([`t+${(i + 1) * 2}s`, await bgmId(), await page.evaluate(() => window.__botCommander.sim.units.some(u => u.side === 'ally' && u.engaged))]); }
// 結果の画面（ランキングに名前）。スクショ用に結果を付ける
await page.evaluate(() => { window.__botCommander.sim.result = 'win'; });
await page.waitForFunction(() => !document.querySelector('.bc-result')?.hidden, null, { timeout: 20000 }).catch(() => logs.push('no result'));
await page.waitForTimeout(600);
report.bgm.push(['result', await bgmId()]);
await shot('05_result_ranking.png');
await page.evaluate(() => { const s = document.querySelector('.bc-result-stats'); s?.scrollIntoView(); });
await shot('06_result_ranking_scrolled.png');
report.ranking = await page.evaluate(() => document.querySelector('.bc-result-stats')?.innerText.slice(0, 600));
console.log(JSON.stringify({ report, logs }, null, 1));
await browser.close();
