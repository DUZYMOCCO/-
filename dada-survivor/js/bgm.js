/**
 * ダダサバイバー せんようの ポップな BGM（Web Audio で その場で つくる。音声ファイルなし）
 * - 工房きょうつうの sound（common/js/audio.js）の AudioContext と リミッターに つなぐ
 *   → ミュート（master）・ページを かくした とき・BGM の おおきさ（sound.bgmVolume）を そのまま まもる
 * - さきよみ スケジューラ：50ms ごとに 0.3びょう さきまで ノートを よやく（iPhone SE2 でも かるい）
 * - ふつう：132 BPM・C の ドミソ（I–V–vi–IV）。ボス：140 BPM・vi–IV–I–V で 16ぶの ハイハットと アルペジオ
 * ノートの データ（songEvents）は DOM なしで テストできる。
 */

const C = 60; // ド（MIDI）
const triad = (r, q = 'maj') => [r, r + (q === 'min' ? 3 : 4), r + 7];

export const SONGS = {
  main: {
    bpm: 132,
    // 1しょうせつ 1コード：C – G – Am – F
    chords: [
      { root: C, notes: triad(C + 12) },            // C
      { root: C - 5, notes: [71, 74, 79] },         // G（ばん かえ）
      { root: C - 3, notes: triad(57 + 12, 'min') },// Am
      { root: C - 7, notes: [69, 72, 77] },         // F
    ],
    // メロディ：[8ぶの いち, MIDI, ながさ(8ぶ)]。8しょうせつで 1しゅう（まえ4＝A、うしろ4＝さびの B）
    lead: [
      [[0, 76, 1], [1, 79, 1], [2, 76, 1], [3, 72, 1], [4, 74, 2], [6, 76, 2]],
      [[0, 74, 1], [1, 79, 1], [2, 74, 1], [3, 71, 1], [4, 74, 3]],
      [[0, 72, 1], [1, 76, 1], [2, 81, 2], [4, 79, 1], [5, 76, 1], [6, 72, 2]],
      [[0, 69, 1], [1, 72, 1], [2, 77, 2], [4, 76, 1], [5, 74, 1], [6, 72, 2]],
      [[0, 79, 1], [1, 79, 1], [2, 81, 1], [3, 79, 1], [4, 76, 1], [5, 79, 1], [6, 84, 2]],
      [[0, 83, 2], [2, 81, 1], [3, 79, 1], [4, 74, 2], [6, 79, 2]],
      [[0, 81, 1], [1, 79, 1], [2, 76, 1], [3, 72, 1], [4, 76, 2], [6, 81, 2]],
      [[0, 77, 1], [1, 76, 1], [2, 74, 1], [3, 72, 1], [4, 74, 2], [6, 76, 2]],
    ],
    hats16: false, arpFrom: 4, // うしろ4しょうせつは キラキラ アルペジオも
  },
  boss: {
    bpm: 140,
    // Am – F – C – G（はげしいけど ポップ）
    chords: [
      { root: 57, notes: triad(69, 'min') },
      { root: 53, notes: [69, 72, 77] },
      { root: C, notes: [67, 72, 76] },
      { root: 55, notes: [67, 71, 74] },
    ],
    lead: [
      [[0, 81, 1], [1, 81, 1], [2, 84, 1], [3, 81, 1], [4, 83, 1], [5, 81, 1], [6, 79, 1], [7, 76, 1]],
      [[0, 77, 1], [1, 81, 1], [2, 84, 1], [3, 81, 1], [4, 79, 2], [6, 77, 1], [7, 76, 1]],
      [[0, 76, 1], [1, 79, 1], [2, 84, 1], [3, 79, 1], [4, 86, 2], [6, 84, 2]],
      [[0, 83, 1], [1, 86, 1], [2, 83, 1], [3, 79, 1], [4, 81, 2], [6, 83, 2]],
    ],
    hats16: true, arpFrom: 0,
  },
};

/**
 * 1しょうせつぶんの ノート（じかんは しょうせつの はじめから びょう）。
 * kind: kick / snare / hat / bass / chord / lead / arp
 */
export function songEvents(song, bar) {
  const beat = 60 / song.bpm, e8 = beat / 2, e16 = beat / 4;
  const ch = song.chords[bar % song.chords.length];
  const ev = [];
  for (let b = 0; b < 4; b++) {
    ev.push({ kind: 'kick', t: b * beat });                                    // 4つうち
    if (b === 1 || b === 3) ev.push({ kind: 'snare', t: b * beat });           // 2・4拍に クラップ
    ev.push({ kind: 'hat', t: b * beat + e8, open: true });                   // うらの ハイハット
    if (song.hats16) { ev.push({ kind: 'hat', t: b * beat + e16 }); ev.push({ kind: 'hat', t: b * beat + 3 * e16 }); }
  }
  if (song.hats16 && bar % 4 === 3) for (let i = 0; i < 4; i++) ev.push({ kind: 'snare', t: 3 * beat + i * e16, soft: true }); // フィル
  // ベース：8ぶで ルート ↔ オクターブ（ぴょんぴょん）
  for (let i = 0; i < 8; i++) ev.push({ kind: 'bass', t: i * e8, note: ch.root - 12 + (i % 2 ? 12 : 0), len: e8 * 0.8 });
  // コード：うらはくに みじかい スタブ
  for (let b = 0; b < 4; b++) for (const n of ch.notes) ev.push({ kind: 'chord', t: b * beat + e8, note: n, len: e8 * 0.7 });
  // メロディ
  for (const [s, n, l] of song.lead[bar % song.lead.length]) ev.push({ kind: 'lead', t: s * e8, note: n, len: l * e8 * 0.92 });
  // アルペジオ（16ぶ）
  if (bar % song.lead.length >= song.arpFrom) {
    const arp = [...ch.notes, ch.notes[0] + 12];
    for (let i = 0; i < 16; i++) ev.push({ kind: 'arp', t: i * e16, note: arp[i % 4] + 12, len: e16 * 0.8 });
  }
  return ev.sort((a, b) => a.t - b.t);
}

// BGM の おおきさ（sound.bgmVolume に かける）。むかしの きょうつう BGM より すこし ノリよく、こうかおんは うもれない くらい
export const BGM_LEVEL = 0.36;

export const barSeconds = song => (60 / song.bpm) * 4;
const freq = n => 440 * 2 ** ((n - 69) / 12);

/** ノートを AudioContext に よやくする（オフラインでも つかえる：サンプル書き出し用） */
export function scheduleBar(ctx, out, noise, song, bar, t0) {
  for (const e of songEvents(song, bar)) {
    const t = t0 + e.t;
    if (e.kind === 'kick') {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
      g.gain.setValueAtTime(0.95, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
      o.connect(g).connect(out); o.start(t); o.stop(t + 0.34);
    } else if (e.kind === 'snare' || e.kind === 'hat') {
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = noise;
      if (e.kind === 'snare') { f.type = 'bandpass'; f.frequency.value = 1700; f.Q.value = 0.8; }
      else { f.type = 'highpass'; f.frequency.value = 7000; }
      const peak = e.kind === 'snare' ? (e.soft ? 0.22 : 0.5) : (e.open ? 0.16 : 0.08);
      const dec = e.kind === 'snare' ? 0.16 : e.open ? 0.09 : 0.035;
      g.gain.setValueAtTime(peak, t); g.gain.exponentialRampToValueAtTime(0.001, t + dec);
      s.connect(f).connect(g).connect(out); s.start(t, Math.random() * 0.5); s.stop(t + dec + 0.02);
      if (e.kind === 'snare' && !e.soft) { // クラップの「パン」の からだ
        const o = ctx.createOscillator(), og = ctx.createGain();
        o.type = 'triangle'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.06);
        og.gain.setValueAtTime(0.18, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        o.connect(og).connect(out); o.start(t); o.stop(t + 0.1);
      }
    } else {
      const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      const cfg = {
        bass:  { type: 'sawtooth', cut: 900,  gain: 0.2,   a: 0.005 },
        chord: { type: 'sawtooth', cut: 2600, gain: 0.045, a: 0.004 },
        lead:  { type: 'square',   cut: 4200, gain: 0.085, a: 0.008 },
        arp:   { type: 'triangle', cut: 6000, gain: 0.05,  a: 0.003 },
      }[e.kind];
      o.type = cfg.type; o.frequency.setValueAtTime(freq(e.note), t);
      if (e.kind === 'lead') o.detune.setValueAtTime(6, t);
      f.type = 'lowpass'; f.frequency.setValueAtTime(cfg.cut, t);
      if (e.kind === 'bass') f.frequency.exponentialRampToValueAtTime(260, t + e.len);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(cfg.gain, t + cfg.a);
      g.gain.setValueAtTime(cfg.gain, t + Math.max(cfg.a, e.len * 0.6));
      g.gain.exponentialRampToValueAtTime(0.0001, t + e.len);
      o.connect(f).connect(g).connect(out); o.start(t); o.stop(t + e.len + 0.02);
    }
  }
}

/** BGM の でぐち：コンプ（キックで ほかが すこし さがる ポンピング）＋ リードの ディレイ */
export function makeBus(ctx, dest) {
  const bus = ctx.createGain();
  const comp = ctx.createDynamicsCompressor();
  for (const [k, v] of Object.entries({ threshold: -18, knee: 8, ratio: 4, attack: 0.003, release: 0.15 })) comp[k].value = v;
  bus.connect(comp).connect(dest);
  const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return { bus, comp, noise };
}

/** ゲームで つかう BGM プレイヤー */
export class PopBGM {
  constructor(sound) { this.sound = sound; this.wanted = false; this.mode = 'main'; this.timer = null; this.bus = null; }
  start() {
    this.mode = 'main';
    if (this.wanted && this.bus) return; // もう ながれている（もういちど あそぶ ときは そのまま つづける）
    this.wanted = true; this.bar = 0; this.next = 0;
    if (!this.timer) this.timer = setInterval(() => this.tick(), 50);
    this.tick();
  }
  stop() {
    this.wanted = false;
    clearInterval(this.timer); this.timer = null;
    // よやくずみの ノートごと すてる（つぎの start は あたらしい でぐちで はじめる）
    const old = this.bus;
    this.bus = null; this.next = 0;
    if (old && old.ctx.state !== 'closed') {
      old.bus.gain.setTargetAtTime(0, old.ctx.currentTime, 0.04);
      setTimeout(() => { try { old.bus.disconnect(); old.comp.disconnect(); } catch { /* もう きれている */ } }, 400);
    }
  }
  /** ボスが いる あいだは はげしい ほうへ（つぎの しょうせつから） */
  setBoss(on) { this.mode = on ? 'boss' : 'main'; }
  tick() {
    const s = this.sound, ctx = s.ctx;
    const ok = this.wanted && ctx && ctx.state === 'running' && !s.isMuted && !s.pageHidden && s.bgmVolume > 0 && s.limiter;
    if (!ok) { this.next = 0; return; }
    if (!this.bus || this.bus.ctx !== ctx) { this.bus = { ...makeBus(ctx, s.limiter), ctx }; this.next = 0; s.session?.('playback'); }
    this.bus.bus.gain.setTargetAtTime(s.bgmVolume * BGM_LEVEL, ctx.currentTime, 0.1);
    if (this.next < ctx.currentTime) { this.next = ctx.currentTime + 0.08; this.bar = 0; this.playing = this.mode; }
    while (this.next < ctx.currentTime + 0.3) {
      if (this.bar % 4 === 0 && this.playing !== this.mode) { this.playing = this.mode; this.bar = 0; }
      const song = SONGS[this.playing || this.mode];
      scheduleBar(ctx, this.bus.bus, this.bus.noise, song, this.bar, this.next);
      this.next += barSeconds(song);
      this.bar++;
    }
  }
}

/** ふえの おと（ピッ・ピーッ）。こうかおんの おおきさ（sound.effectVolume）と ミュートを まもる */
export function playWhistle(s) {
  const ctx = s?.ctx;
  if (!ctx || ctx.state !== 'running' || s.isMuted || s.pageHidden || !s.limiter) return false;
  const vol = (s.effectVolume ?? 1) * 0.22;
  if (vol <= 0) return false;
  const t0 = ctx.currentTime + 0.01;
  const g = ctx.createGain(); g.gain.value = 0; g.connect(s.limiter);
  const o = ctx.createOscillator(); o.type = 'triangle';
  const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 38; lg.gain.value = 70; // ころころ（ふえの なかの たま）
  lfo.connect(lg).connect(o.frequency); o.connect(g);
  o.frequency.setValueAtTime(2300, t0); o.frequency.setValueAtTime(2300, t0 + 0.1);
  o.frequency.linearRampToValueAtTime(2750, t0 + 0.2);
  for (const [a, b] of [[t0, t0 + 0.09], [t0 + 0.15, t0 + 0.5]]) {
    g.gain.setValueAtTime(0, a); g.gain.linearRampToValueAtTime(vol, a + 0.015);
    g.gain.setValueAtTime(vol, b - 0.03); g.gain.linearRampToValueAtTime(0, b);
  }
  o.start(t0); lfo.start(t0); o.stop(t0 + 0.55); lfo.stop(t0 + 0.55);
  o.onended = () => { try { g.disconnect(); lg.disconnect(); } catch { /* もう きれている */ } };
  return true;
}
