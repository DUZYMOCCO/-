import test from 'node:test';
import assert from 'node:assert/strict';
import { SONGS, songEvents, barSeconds, scheduleBar, makeBus, PopBGM } from '../js/bgm.js';

const pc = n => ((n % 12) + 12) % 12;
const C_MAJOR = new Set([0, 2, 4, 5, 7, 9, 11]);

test('pop tempo and simple loop progressions', () => {
  assert.ok(SONGS.main.bpm >= 128 && SONGS.main.bpm <= 140);
  assert.ok(SONGS.boss.bpm > SONGS.main.bpm && SONGS.boss.bpm <= 140);
  // ふつう I–V–vi–IV（C G Am F）、ボス vi–IV–I–V（Am F C G）
  assert.deepEqual(SONGS.main.chords.map(c => pc(c.root)), [0, 7, 9, 5]);
  assert.deepEqual(SONGS.boss.chords.map(c => pc(c.root)), [9, 5, 0, 7]);
});

for (const [name, song] of Object.entries(SONGS)) {
  test(`${name}: four-on-the-floor, backbeat, offbeat hats, root bass, major-key melody`, () => {
    const beat = 60 / song.bpm, len = barSeconds(song);
    for (let bar = 0; bar < song.lead.length; bar++) {
      const ev = songEvents(song, bar), of = k => ev.filter(e => e.kind === k);
      assert.deepEqual(of('kick').map(e => +(e.t / beat).toFixed(3)), [0, 1, 2, 3]);
      const snares = of('snare').filter(e => !e.soft).map(e => +(e.t / beat).toFixed(3));
      assert.deepEqual(snares, [1, 3]);
      for (const t of [0.5, 1.5, 2.5, 3.5]) assert.ok(of('hat').some(e => Math.abs(e.t / beat - t) < 1e-6), `hat @${t}`);
      if (song.hats16) assert.ok(of('hat').length >= 12);
      const root = pc(song.chords[bar % 4].root);
      assert.equal(of('bass').length, 8);
      for (const b of of('bass')) assert.equal(pc(b.note), root);
      assert.ok(new Set(of('bass').map(b => b.note)).size === 2, 'オクターブで はねる');
      assert.ok(of('lead').length >= 5);
      for (const e of ev) {
        assert.ok(e.t >= 0 && e.t + (e.len || 0) <= len + 1e-6, `${e.kind} in bar`);
        if (e.note !== undefined) assert.ok(C_MAJOR.has(pc(e.note)), `${e.kind} ${e.note} は C の ドレミ`);
      }
    }
  });
}

// オーディオの ふりを する かんたんな AudioContext（ノードの かずを かぞえる）
function fakeCtx() {
  const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {}, setTargetAtTime() {} });
  let nodes = 0;
  const node = extra => { nodes++; return { connect(n) { return n; }, disconnect() {}, start() {}, stop() {}, gain: param(), frequency: param(), detune: param(), Q: param(), ...extra }; };
  return {
    sampleRate: 8000, currentTime: 0, state: 'running', get nodes() { return nodes; },
    createOscillator: () => node({ type: '' }), createGain: () => node(), createBiquadFilter: () => node({ type: '' }),
    createBufferSource: () => node({ buffer: null }),
    createDynamicsCompressor: () => node({ threshold: param(), knee: param(), ratio: param(), attack: param(), release: param() }),
    createBuffer: (c, n) => ({ getChannelData: () => new Float32Array(n) }),
  };
}

test('lightweight: bounded audio nodes per second', () => {
  for (const song of Object.values(SONGS)) {
    const ctx = fakeCtx(), { bus, noise } = makeBus(ctx, ctx.createGain());
    const before = ctx.nodes;
    for (let bar = 0; bar < 8; bar++) scheduleBar(ctx, bus, noise, song, bar, bar * barSeconds(song));
    const perSec = (ctx.nodes - before) / (8 * barSeconds(song));
    assert.ok(perSec < 220, `${perSec.toFixed(0)} nodes/s`);
  }
});

test('player respects mute / hidden / volume 0 and switches to boss on a 4-bar line', () => {
  const ctx = fakeCtx();
  const sound = { ctx, isMuted: true, pageHidden: false, bgmVolume: 0.35, limiter: ctx.createGain(), session() {} };
  const bgm = new PopBGM(sound);
  bgm.start();
  const n0 = ctx.nodes; bgm.tick();
  assert.equal(ctx.nodes, n0, 'ミュート中は なにも よやく しない');
  sound.isMuted = false; sound.bgmVolume = 0; bgm.tick();
  assert.equal(ctx.nodes, n0, 'BGM 0 でも しない');
  sound.bgmVolume = 0.35; bgm.tick();
  assert.ok(ctx.nodes > n0);
  assert.equal(bgm.playing, 'main');
  bgm.setBoss(true);
  for (let i = 0; i < 6; i++) { ctx.currentTime += barSeconds(SONGS.main); bgm.tick(); }
  assert.equal(bgm.playing, 'boss');
  bgm.stop();
  assert.equal(bgm.bus, null);
  clearInterval(bgm.timer);
});
