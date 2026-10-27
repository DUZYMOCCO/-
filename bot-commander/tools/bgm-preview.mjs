// BGM の試聴ファイルを作る（OfflineAudioContext を headless Chromium で回し、ゲームと同じ bgm-player.js で鳴らす）。
// 使い方（game-single-units で）: python3 -m http.server 8767 --bind 127.0.0.1 を起動してから
//   node bot-commander/tools/bgm-preview.mjs <出力フォルダ>
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || '/workspace/new-game-rts/tools/node_modules/playwright-core');
const BASE = process.env.URL || 'http://127.0.0.1:8767/';
const OUT = process.argv[2] || '/tmp/bgm_preview';
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
const page = await browser.newPage();
await page.goto(BASE + 'bot-commander/README.md');
const ids = await page.evaluate(async () => { const m = await import('/bot-commander/js/audio/bgm-songs.js'); return m.TRACK_IDS.filter(id => m.TRACKS[id]); });
const files = [];
for (const id of ids) {
  const b64 = await page.evaluate(async id => {
    const S = await import('/bot-commander/js/audio/bgm-songs.js'), P = await import('/bot-commander/js/audio/bgm-player.js');
    const tr = S.TRACKS[id], sr = 44100;
    const loops = tr.loop ? Math.max(1, Math.ceil(40 / S.trackSeconds(tr))) : 1; // ループ曲は 40 秒くらいまで繰り返す
    const dur = S.trackSeconds(tr) * loops + (tr.loop ? 2.5 : 4);
    const ctx = new OfflineAudioContext(2, Math.ceil(sr * dur), sr);
    const lim = ctx.createDynamicsCompressor(); // ハブの limiter と同じ設定
    for (const [k, v] of Object.entries({ threshold: -14, knee: 16, ratio: 6, attack: 0.003, release: 0.2 })) lim[k].value = v;
    const master = ctx.createGain(); master.gain.value = 0.85; lim.connect(master).connect(ctx.destination);
    const out = P.makeBus(ctx, lim, tr); out.bus.gain.value = 0.35 * P.BGM_LEVEL * 2.2; // 試聴用に少し大きめ（既定の BGM 音量 0.35 基準）
    let t = 0.05; for (let bar = 0; bar < tr.bars * loops; bar++) { P.scheduleBar(ctx, out.bus, tr, bar, t); t += S.barSeconds(tr); }
    if (tr.loop) { out.bus.gain.setValueAtTime(out.bus.gain.value, dur - 2.5); out.bus.gain.linearRampToValueAtTime(0, dur - 0.1); }
    const buf = await ctx.startRendering();
    const n = buf.length, L = buf.getChannelData(0), R = buf.getChannelData(1);
    let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
    const gain = peak > 0 ? 0.89 / peak : 1; // 試聴しやすいよう -1dB にそろえる
    const ab = new ArrayBuffer(44 + n * 4), dv = new DataView(ab);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); dv.setUint32(4, 36 + n * 4, true); w(8, 'WAVEfmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 2, true);
    dv.setUint32(24, sr, true); dv.setUint32(28, sr * 4, true); dv.setUint16(32, 4, true); dv.setUint16(34, 16, true); w(36, 'data'); dv.setUint32(40, n * 4, true);
    for (let i = 0; i < n; i++) { dv.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i] * gain)) * 32767, true); dv.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i] * gain)) * 32767, true); }
    let s = ''; const u8 = new Uint8Array(ab); for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
    return btoa(s);
  }, id);
  const f = `${OUT}/${ids.indexOf(id) + 1}_${id}.wav`;
  await writeFile(f, Buffer.from(b64, 'base64')); files.push(f); console.log('wrote', f);
}
await browser.close();
// 全部をつないだ 1 本（間に 1.5 秒の無音）
const list = files.map(f => `file '${f}'\nfile '${OUT}/_gap.wav'`).join('\n');
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-t', '1.5', `${OUT}/_gap.wav`]);
await writeFile(`${OUT}/_list.txt`, list);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', `${OUT}/_list.txt`, '-c:a', 'aac', '-b:a', '160k', `${OUT}/bgm_all.m4a`]);
console.log('wrote', `${OUT}/bgm_all.m4a`);
