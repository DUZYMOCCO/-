import test from 'node:test';
import assert from 'node:assert/strict';
import { TRACKS, trackEvents, barSeconds, scheduleBar, makeBgmBus, BgmPlayer, BGM_VOLUME } from '../js/bgm.js';

const TRACK_KEYS = ['day', 'sunset', 'night', 'boss', 'title'];

test('トラック定義: 各ステージ（ひる・ゆうがた・よる・ボス・タイトル）のトラックが存在する', () => {
  for (const key of TRACK_KEYS) {
    const tr = TRACKS[key];
    assert.ok(tr, `${key} トラックが存在すること`);
    assert.equal(tr.id, key);
    assert.ok(tr.name && typeof tr.name === 'string');
    assert.ok(tr.bpm >= 110 && tr.bpm <= 150, `BPM 範囲内: ${tr.bpm}`);
    assert.ok(tr.chords.length >= 4, 'コード進行があること');
    assert.ok(tr.lead.length >= 4, 'メロディがあること');
  }
});

test('テンポ・小節長: ボスが最も速く、タイトルが落ち着いている', () => {
  assert.ok(TRACKS.boss.bpm > TRACKS.sunset.bpm);
  assert.ok(TRACKS.sunset.bpm > TRACKS.day.bpm);
  assert.ok(TRACKS.day.bpm > TRACKS.title.bpm);

  for (const tr of Object.values(TRACKS)) {
    const sec = barSeconds(tr);
    assert.ok(sec > 1.5 && sec < 2.5, `1小節の秒数: ${sec}`);
  }
});

test('trackEvents: 各トラックの全小節でドラム・ベース・コード・メロディが正しく生成される', () => {
  for (const tr of Object.values(TRACKS)) {
    const sec = barSeconds(tr);
    for (let bar = 0; bar < tr.bars; bar++) {
      const ev = trackEvents(tr, bar);
      assert.ok(ev.length >= 10, `${tr.id} bar ${bar} イベント数: ${ev.length}`);

      const kicks = ev.filter(e => e.kind === 'kick');
      assert.ok(kicks.length >= 2, `${tr.id} bar ${bar} にキックが存在`);

      const snares = ev.filter(e => e.kind === 'snare');
      assert.ok(snares.length >= 2, `${tr.id} bar ${bar} にスネアが存在`);

      const bass = ev.filter(e => e.kind === 'bass');
      assert.ok(bass.length >= 4, `${tr.id} bar ${bar} にベースが存在`);

      const chords = ev.filter(e => e.kind === 'chord');
      assert.ok(chords.length >= 2, `${tr.id} bar ${bar} に和音が存在`);

      const lead = ev.filter(e => e.kind === 'lead');
      assert.ok(lead.length >= 2, `${tr.id} bar ${bar} にメロディが存在`);

      // イベントの発生時刻が小節内（0〜sec）に収まっていること
      for (const e of ev) {
        assert.ok(e.t >= 0, `イベント時刻 >= 0: ${e.t}`);
        assert.ok(e.t < sec + 0.05, `イベント時刻が小節内: ${e.t} < ${sec}`);
        if (e.note !== undefined) {
          assert.ok(Number.isFinite(e.note) && e.note >= 30 && e.note <= 100, `MIDIノート範囲内: ${e.note}`);
        }
      }
    }
  }
});

// オーディオモック
function createMockCtx() {
  const param = (initial = 0) => ({
    value: initial,
    setValueAtTime() {},
    exponentialRampToValueAtTime() {},
    linearRampToValueAtTime() {},
    setTargetAtTime() {}
  });
  let nodeCount = 0;
  const node = (extra = {}) => {
    nodeCount++;
    return {
      connect(n) { return n; },
      disconnect() {},
      start() {},
      stop() {},
      gain: param(1),
      frequency: param(440),
      detune: param(0),
      Q: param(1),
      ...extra
    };
  };
  return {
    sampleRate: 44100,
    currentTime: 0,
    state: 'running',
    get nodeCount() { return nodeCount; },
    createOscillator: () => node({ type: 'sine' }),
    createGain: () => node(),
    createBiquadFilter: () => node({ type: 'lowpass' }),
    createBufferSource: () => node({ buffer: null }),
    createBuffer: (ch, len) => ({
      getChannelData: () => new Float32Array(len)
    }),
  };
}

test('scheduleBar: 軽量性テスト（1秒あたりの生成ノード数が適切に制限されている）', () => {
  for (const tr of Object.values(TRACKS)) {
    const ctx = createMockCtx();
    const { bus, noise } = makeBgmBus(ctx, ctx.createGain());
    const before = ctx.nodeCount;
    for (let bar = 0; bar < 4; bar++) {
      scheduleBar(ctx, bus, noise, tr, bar, bar * barSeconds(tr));
    }
    const totalSec = 4 * barSeconds(tr);
    const perSec = (ctx.nodeCount - before) / totalSec;
    assert.ok(perSec < 350, `${tr.id}: ${perSec.toFixed(1)} nodes/sec`);
  }
});

test('BgmPlayer: ライフサイクル・トラック切り替え・ポーズ・ミュート連動', () => {
  const ctx = createMockCtx();
  const sfx = {
    ctx,
    muted: false,
    comp: ctx.createGain(),
    master: ctx.createGain(),
  };

  const player = new BgmPlayer(sfx);
  assert.equal(player.targetTrackId, 'title');

  // 開始
  player.start('title');
  assert.equal(player.wanted, true);

  player.tick();
  assert.ok(player.bus !== null, 'バスが初期化されること');
  assert.equal(player.playingTrackId, 'title');

  // ステージ切り替え（dayへ）
  player.setTrack('day');
  assert.equal(player.targetTrackId, 'day');

  // 4小節経過させて切り替えテスト
  for (let i = 0; i < 4; i++) {
    ctx.currentTime += barSeconds(TRACKS.title);
    player.tick();
  }
  assert.equal(player.playingTrackId, 'day');

  // ポーズテスト
  player.pause();
  assert.equal(player.paused, true);
  player.resume();
  assert.equal(player.paused, false);

  // ミュート連動テスト
  sfx.muted = true;
  assert.equal(player.calcGain(), 0);
  sfx.muted = false;
  assert.equal(player.calcGain(), BGM_VOLUME);

  // 設定無効テスト
  player.setEnabled(false);
  assert.equal(player.calcGain(), 0);
  player.setEnabled(true);
  assert.equal(player.calcGain(), BGM_VOLUME);

  // 停止テスト
  player.stop();
  assert.equal(player.wanted, false);
  assert.equal(player.bus, null);
});
