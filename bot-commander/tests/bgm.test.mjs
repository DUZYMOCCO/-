// v1.0.9 BGM（js/audio）。曲データの形・曲ごとの性格・曲の選び方（揺れ止め）・sim にさわらないこと
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TRACKS, TRACK_IDS, LAYERS, validateTrack, trackEvents, barSeconds, trackSeconds } from '../js/audio/bgm-songs.js';
import { ModeGate, pickBgmMode, isGiantFoe, UP_HOLD, DOWN_HOLD } from '../js/audio/bgm-mode.js';
import { WastelandBGM } from '../js/audio/bgm-player.js';

test('7 曲がそろい、書き間違いがない', () => {
  assert.deepEqual(Object.keys(TRACKS).sort(), [...TRACK_IDS].sort());
  for (const id of TRACK_IDS) assert.deepEqual(validateTrack(TRACKS[id], id), []);
});
test('ループ曲と短い一節', () => {
  for (const id of ['base', 'explore', 'combat', 'giant', 'dialogue']) { assert.equal(TRACKS[id].loop, true, id); assert.ok(trackSeconds(TRACKS[id]) >= 20, `${id} が短すぎる`); }
  for (const id of ['win', 'lose']) { assert.equal(TRACKS[id].loop, false, id); assert.ok(TRACKS[id].bars <= 4 && trackSeconds(TRACKS[id]) <= 18, id); }
});
test('静かな荒野: どの曲もピアノとパッドがあり、音は少なめ', () => {
  for (const id of TRACK_IDS) {
    const t = TRACKS[id];
    assert.ok(t.piano.length > 0 && t.pad.length > 0, `${id} にピアノかパッドがない`);
    const perBar = t.piano.length / t.bars;
    assert.ok(perBar <= 8, `${id} のピアノが 1 小節に ${perBar.toFixed(1)} 音（多すぎる）`);
  }
});
test('戦闘は少しだけ脈がある（他より速く、pulse がある）が控えめ', () => {
  const c = TRACKS.combat;
  assert.ok(c.pulse.length > 0);
  assert.ok(c.bpm > TRACKS.base.bpm && c.bpm > TRACKS.explore.bpm);
  const thumps = c.pulse.filter(p => p[2] === 0).length / c.bars;
  assert.ok(thumps <= 4, `低いドンが 1 小節に ${thumps}`);
  assert.equal(TRACKS.base.pulse.filter(p => p[2] === 0).length, 0, '拠点にドンはない');
});
test('trackEvents: 純粋（同じ入力で同じ）、小節の中に収まり、ループで巡る', () => {
  for (const id of TRACK_IDS) {
    const t = TRACKS[id];
    for (let b = 0; b < t.bars; b++) {
      const ev = trackEvents(t, b);
      assert.deepEqual(ev, trackEvents(t, b));
      assert.deepEqual(ev, trackEvents(t, b + t.bars));
      for (const e of ev) { assert.ok(e.t >= 0 && e.t < barSeconds(t) + 1e-9); assert.ok(LAYERS.includes(e.kind)); }
    }
  }
});
test('揺れ止め: 戦いへはすぐ（0.6 秒）、静かな曲へは 6 秒続いてから。会話はすぐ', () => {
  const g = new ModeGate('explore');
  assert.equal(g.update('combat', UP_HOLD / 2), 'explore');
  assert.equal(g.update('combat', UP_HOLD / 2 + 0.01), 'combat');
  assert.equal(g.update('explore', 1), 'combat');
  assert.equal(g.update('combat', 0.1), 'combat'); // 途中で戦いに戻ったら数え直し
  for (let i = 0; i < Math.ceil(DOWN_HOLD) + 1; i++) g.update('explore', 1);
  assert.equal(g.mode, 'explore');
  assert.equal(g.update('dialogue', 0.01), 'dialogue');
  assert.equal(g.update('giant', 0.01), 'giant');
});
test('pickBgmMode: 会話 > 巨大な敵 > 交戦 > 探索。sim は読むだけ', () => {
  const ally = (o = {}) => ({ side: 'ally', hp: 100, maxHp: 100, x: 0, y: 0, engaged: false, ...o });
  const foe = (o = {}) => ({ side: 'enemy', kind: 'alien', hp: 300, maxHp: 360, x: 1000, y: 0, ...o });
  const sim = { units: [ally(), foe()] };
  const before = JSON.stringify(sim);
  assert.equal(pickBgmMode(sim), 'explore');
  sim.units[0].engaged = true; assert.equal(pickBgmMode(sim), 'combat');
  sim.units.push(foe({ kind: 'giant', maxHp: 900, hp: 900, x: 3000 }));
  assert.equal(pickBgmMode(sim), 'combat', '遠くて見えない巨大な敵は数えない');
  assert.equal(pickBgmMode(sim, { visible: u => u.kind === 'giant' }), 'giant');
  sim.units[2].x = 100; assert.equal(pickBgmMode(sim), 'giant', '近い');
  sim.units[2].hp = 0; assert.equal(pickBgmMode(sim), 'combat', '倒れた巨大な敵は数えない');
  assert.equal(pickBgmMode(sim, { dialog: true }), 'dialogue');
  assert.equal(pickBgmMode(null), 'base');
  assert.ok(isGiantFoe(foe({ maxHp: 1200 })) && !isGiantFoe(foe()) && !isGiantFoe({ side: 'ally', kind: 'giant', hp: 1, maxHp: 900 }));
  sim.units.pop(); sim.units[0].engaged = false;
  assert.equal(JSON.stringify(sim), before);
});
test('プレイヤー: 音の準備ができていない（タップ前・消音・BGM 0・画面が隠れた）時は何もしない', () => {
  for (const sound of [{ ctx: null }, { ctx: { state: 'suspended' }, limiter: {} }, { ctx: { state: 'running' }, limiter: {}, isMuted: true, bgmVolume: 0.5 },
    { ctx: { state: 'running' }, limiter: {}, bgmVolume: 0 }, { ctx: { state: 'running' }, limiter: {}, bgmVolume: 0.5, pageHidden: true }]) {
    const b = new WastelandBGM(sound); b.wanted = true; b.mode = 'explore';
    assert.equal(b.ok(), false); b.tick(); assert.equal(b.cur, null);
  }
  const off = new WastelandBGM({ ctx: { state: 'running' }, limiter: {}, bgmVolume: 0.5 }, { enabled: () => false }); off.wanted = true;
  assert.equal(off.ok(), false, '☰ で切');
});
test('BGM のモジュールは sim を import しない（ゲームの結果を変えない）', () => {
  for (const f of ['bgm-songs.js', 'bgm-player.js', 'bgm-mode.js']) {
    const src = readFileSync(new URL(`../js/audio/${f}`, import.meta.url), 'utf8');
    assert.doesNotMatch(src, /from '\.\.\/sim\//, f);
    assert.doesNotMatch(src, /Math\.random\(\)[^\n]*sim|sim\.rng/, f);
  }
});
test('BGM はハブと同じ音の仕組み（common/js/audio.js の ?v= が app.js と同じ）を使う', () => {
  const app = readFileSync(new URL('../../common/js/app.js', import.meta.url), 'utf8');
  const idx = readFileSync(new URL('../js/index.js', import.meta.url), 'utf8');
  const v = /from '\.\/audio\.js\?v=(\d+)'/.exec(app)?.[1];
  assert.ok(v, 'app.js の audio.js の版');
  assert.ok(idx.includes(`from '../../common/js/audio.js?v=${v}'`), `index.js も audio.js?v=${v} を import する（違うと別の音の仕組みになり、BGM が鳴らない）`);
  assert.ok(!/sound\.startBGM\(/.test(idx), '共通の BGM（startBGM）は鳴らさない');
});
test('☰ の「音楽」入/切がある（ボタンは ☰ の中だけ）', () => {
  const idx = readFileSync(new URL('../js/index.js', import.meta.url), 'utf8');
  const menu = idx.slice(idx.indexOf('<div class="bc-menu"'), idx.indexOf('bc-menu-close'));
  assert.ok(menu.includes('data-bgm="1"') && menu.includes('data-bgm="0"'));
  assert.ok(idx.includes("storage.get('bc-bgm', true)"));
});
