// おと（WebAudio で その場で つくる。おとの ファイルは つかわない）
export class Sfx {
  constructor(muted = false) { this.muted = muted; this.ctx = null; }
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ctx = this.ctx = new AC();
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -14; this.comp.ratio.value = 6; this.comp.attack.value = 0.002; this.comp.release.value = 0.12;
    this.master = ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.8;
    this.comp.connect(this.master).connect(ctx.destination);
    const len = ctx.sampleRate; const buf = ctx.createBuffer(1, len, ctx.sampleRate); const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
  }
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 0.8; }
  close() { try { this.ctx && this.ctx.close(); } catch (e) { /* なし */ } this.ctx = null; }

  _noise(t, dur, { type = 'lowpass', freq = 1000, q = 0.7, gain = 0.5, attack = 0.001, rate = 1, out = this.comp } = {}) {
    const ctx = this.ctx, s = ctx.createBufferSource(); s.buffer = this.noise; s.playbackRate.value = rate;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f).connect(g).connect(out); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
    return f;
  }
  _tone(t, dur, { type = 'sine', f0 = 200, f1 = 60, gain = 0.5, out = this.comp } = {}) {
    const ctx = this.ctx, o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g).connect(out); o.start(t); o.stop(t + dur + 0.02);
  }

  shot(kind) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime, p = 0.94 + Math.random() * 0.12;
    if (kind === 'rifle') {
      this._noise(t, 0.07, { type: 'highpass', freq: 1800 * p, gain: 0.55 });             // パシッ
      this._noise(t, 0.16, { type: 'lowpass', freq: 2400 * p, gain: 0.9 });               // バン
      this._tone(t, 0.13, { f0: 160 * p, f1: 42, gain: 0.95 });                           // ドン（おなかに くる）
      this._tone(t, 0.015, { type: 'square', f0: 2600, f1: 1800, gain: 0.08 });           // メカの おと
      this._noise(t + 0.02, 0.38, { type: 'lowpass', freq: 520, gain: 0.22, attack: 0.03 }); // こだま
    } else if (kind === 'pistol') {
      this._noise(t, 0.06, { type: 'highpass', freq: 2400 * p, gain: 0.5 });
      this._noise(t, 0.11, { type: 'bandpass', freq: 1500 * p, q: 0.8, gain: 0.8 });
      this._tone(t, 0.09, { f0: 220 * p, f1: 70, gain: 0.6 });
      this._noise(t + 0.02, 0.25, { type: 'lowpass', freq: 600, gain: 0.15, attack: 0.02 });
    } else if (kind === 'magnum') {
      // ドォン（ふかい おと・ながめの こだま）
      this._noise(t, 0.07, { type: 'highpass', freq: 1300 * p, gain: 0.65 });
      this._noise(t, 0.2, { type: 'lowpass', freq: 1900 * p, gain: 1.0 });
      this._tone(t, 0.24, { f0: 95 * p, f1: 30, gain: 1.05 });
      this._tone(t, 0.12, { f0: 180 * p, f1: 60, gain: 0.5 });
      this._noise(t + 0.03, 0.7, { type: 'lowpass', freq: 340, gain: 0.32, attack: 0.04 });
    } else if (kind === 'sniper') {
      // ズドン（ながい こだま）＋ あとで ガチャッ（ボルト）
      this._noise(t, 0.08, { type: 'highpass', freq: 1500 * p, gain: 0.7 });
      this._noise(t, 0.22, { type: 'lowpass', freq: 2600 * p, gain: 1.0 });
      this._tone(t, 0.2, { f0: 120 * p, f1: 34, gain: 1.0 });
      this._noise(t + 0.04, 0.9, { type: 'lowpass', freq: 380, gain: 0.32, attack: 0.05 });
      this._noise(t + 0.42, 0.05, { type: 'bandpass', freq: 2600, q: 3, gain: 0.25 });
      this._noise(t + 0.62, 0.06, { type: 'bandpass', freq: 3200, q: 3, gain: 0.28 });
    } else if (kind === 'minigun') {
      // ブロロロ（みじかい おとを はやく かさねる）
      this._noise(t, 0.045, { type: 'highpass', freq: 2000 * p, gain: 0.32 });
      this._noise(t, 0.08, { type: 'lowpass', freq: 1900 * p, gain: 0.5 });
      this._tone(t, 0.07, { f0: 140 * p, f1: 50, gain: 0.45 });
    } else {
      this._noise(t, 0.1, { type: 'highpass', freq: 1200 * p, gain: 0.6 });
      this._noise(t, 0.3, { type: 'lowpass', freq: 1500 * p, gain: 1.0 });
      this._tone(t, 0.22, { f0: 110 * p, f1: 32, gain: 1.0 });
      this._noise(t + 0.03, 0.6, { type: 'lowpass', freq: 420, gain: 0.3, attack: 0.04 });
      // ガシャッ（ポンプ）
      this._noise(t + 0.32, 0.05, { type: 'bandpass', freq: 3000, q: 3, gain: 0.25 });
      this._noise(t + 0.45, 0.06, { type: 'bandpass', freq: 2400, q: 3, gain: 0.3 });
    }
  }
  // ロケット はっしゃ（シュボッ＋シューッ）
  rocket() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    this._noise(t, 0.12, { type: 'lowpass', freq: 1800, gain: 0.9 });
    this._tone(t, 0.16, { f0: 120, f1: 40, gain: 0.8 });
    const f = this._noise(t + 0.02, 0.8, { type: 'bandpass', freq: 900, q: 1.2, gain: 0.45, attack: 0.05 });
    f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(2600, t + 0.7);
  }
  // ドッカーン！（ちかいほど おおきい）
  boom(vol = 1) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime, v = Math.max(0.25, Math.min(1, vol));
    this._noise(t, 0.08, { type: 'highpass', freq: 900, gain: 0.7 * v });
    this._noise(t, 1.3, { type: 'lowpass', freq: 700, gain: 1.2 * v, attack: 0.004 });
    this._noise(t, 0.5, { type: 'lowpass', freq: 2200, gain: 0.6 * v });
    this._tone(t, 0.7, { f0: 95, f1: 24, gain: 1.2 * v });
    this._tone(t, 0.35, { type: 'triangle', f0: 60, f1: 30, gain: 0.8 * v });
    for (let i = 0; i < 6; i++) this._noise(t + 0.15 + Math.random() * 0.6, 0.05, { type: 'bandpass', freq: 1500 + Math.random() * 2000, q: 2, gain: 0.18 * v }); // パチパチ
    this._noise(t + 0.1, 1.6, { type: 'lowpass', freq: 300, gain: 0.35 * v, attack: 0.1 }); // ゴロゴロ
  }
  // あしおと（ちいさく）
  step() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    this._noise(t, 0.05, { type: 'lowpass', freq: 500 + Math.random() * 200, gain: 0.09 });
  }
  // ゾンビが じめんで バウンド
  thud() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    this._tone(t, 0.1, { f0: 140, f1: 50, gain: 0.35 });
    this._noise(t, 0.08, { type: 'lowpass', freq: 600, gain: 0.25 });
  }
  click(freq = 3200, gain = 0.25, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + delay;
    this._noise(t, 0.035, { type: 'bandpass', freq, q: 4, gain });
    this._tone(t, 0.02, { type: 'square', f0: freq * 0.6, f1: freq * 0.4, gain: gain * 0.25 });
  }
  empty() { this.click(4200, 0.18); }
  reload(kind, dur) {
    if (kind === 'rocket') { this.click(1600, 0.3, dur * 0.45); this.click(1200, 0.35, dur * 0.78); this.click(2600, 0.3, dur * 0.9); return; }
    if (kind === 'shotgun') { for (let i = 0; i < 4; i++) this.click(2600, 0.22, 0.25 + i * (dur - 0.6) / 4); this.click(2000, 0.3, dur - 0.25); this.click(2600, 0.3, dur - 0.12); return; }
    this.click(2200, 0.25, 0.12);            // マガジン ぬく
    this.click(1800, 0.3, dur * 0.62);       // さす
    this.click(3000, 0.3, dur * 0.82);       // ガチャ
    this.click(2400, 0.28, dur * 0.9);
  }
  // ミニガンが まわる おと（ウィーン。よびすぎない）
  spin(k = 1) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    if (this._spinT && t - this._spinT < 0.09) return;
    this._spinT = t;
    this._tone(t, 0.1, { type: 'triangle', f0: 220 + 380 * k, f1: 200 + 360 * k, gain: 0.05 + 0.05 * k });
  }
  swap() { this.click(2000, 0.2); this.click(2800, 0.18, 0.08); }
  hit(head) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    this._tone(t, 0.08, { f0: 260, f1: 90, gain: 0.35 });
    this._noise(t, 0.06, { type: 'lowpass', freq: 900, gain: 0.3 });
    if (head) { this._tone(t, 0.12, { f0: 1500, f1: 1400, gain: 0.18 }); this._tone(t + 0.04, 0.14, { f0: 2100, f1: 2000, gain: 0.12 }); }
  }
  poof() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const f = this._noise(t, 0.35, { type: 'bandpass', freq: 600, q: 1.5, gain: 0.35, attack: 0.02 });
    f.frequency.exponentialRampToValueAtTime(2400, t + 0.3);
    this._tone(t, 0.18, { f0: 500, f1: 900, gain: 0.08, type: 'triangle' });
  }
  groan(vol = 0.2) {
    if (!this.ctx || this.muted || vol < 0.02) return;
    const ctx = this.ctx, t = ctx.currentTime, dur = 0.7 + Math.random() * 0.5;
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    const base = 85 + Math.random() * 50;
    o.frequency.setValueAtTime(base, t); o.frequency.linearRampToValueAtTime(base * 1.15, t + dur * 0.3); o.frequency.linearRampToValueAtTime(base * 0.8, t + dur);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 6 + Math.random() * 3; const lg = ctx.createGain(); lg.gain.value = 6; lfo.connect(lg).connect(o.frequency);
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 520; f.Q.value = 2.2;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.12); g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(f).connect(g).connect(this.comp); o.start(t); lfo.start(t); o.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
  }
  hurt() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    this._tone(t, 0.18, { f0: 120, f1: 50, gain: 0.6 });
    this._noise(t, 0.12, { type: 'lowpass', freq: 500, gain: 0.4 });
  }
  wave() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    this._tone(t, 0.35, { type: 'square', f0: 392, f1: 390, gain: 0.08 });
    this._tone(t + 0.3, 0.6, { type: 'square', f0: 523, f1: 520, gain: 0.09 });
  }
  clear() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    [523, 659, 784, 1047].forEach((f, i) => this._tone(t + i * 0.1, 0.3, { type: 'triangle', f0: f, f1: f, gain: 0.12 }));
  }
  // ロケットだんを ひろった（キラーン）
  pickup() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    [784, 1047, 1319].forEach((f, i) => this._tone(t + i * 0.07, 0.22, { type: 'triangle', f0: f, f1: f, gain: 0.16 }));
    this._noise(t, 0.04, { type: 'highpass', freq: 3000, gain: 0.15 });
  }
  // ブロックに くだける（ガラガラ）
  crumble() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 7; i++) this._noise(t + 0.05 + Math.random() * 0.5, 0.06, { type: 'bandpass', freq: 500 + Math.random() * 900, q: 2.5, gain: 0.22 });
    this._tone(t, 0.12, { type: 'square', f0: 300, f1: 120, gain: 0.08 });
  }
  // ボスの さけび
  roar(vol = 0.5) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime, dur = 1.3;
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(70, t); o.frequency.linearRampToValueAtTime(110, t + 0.4); o.frequency.linearRampToValueAtTime(55, t + dur);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.15); g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(f).connect(g).connect(this.comp); o.start(t); o.stop(t + dur + 0.05);
    this._noise(t, dur, { type: 'bandpass', freq: 400, q: 1, gain: vol * 0.4, attack: 0.15 });
  }
  // ためる（ウィーン…）
  warn() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    this._tone(t, 0.7, { type: 'square', f0: 180, f1: 420, gain: 0.06 });
  }
  // ドスン！
  slam(vol = 1) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime, v = Math.max(0.3, Math.min(1, vol));
    this._tone(t, 0.5, { f0: 80, f1: 28, gain: 1.1 * v });
    this._noise(t, 0.6, { type: 'lowpass', freq: 500, gain: 0.8 * v });
  }
  // のぼる（よいしょ）
  climb() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    this._noise(t, 0.08, { type: 'lowpass', freq: 700, gain: 0.18 });
    this._noise(t + 0.25, 0.08, { type: 'lowpass', freq: 600, gain: 0.16 });
  }
  // おじさん「たすけて〜」（ふわっと 2おん）
  help(vol = 0.5) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    this._tone(t, 0.22, { type: 'triangle', f0: 620, f1: 560, gain: 0.22 * vol });
    this._tone(t + 0.24, 0.34, { type: 'triangle', f0: 760, f1: 520, gain: 0.22 * vol });
  }
  // ふくを もらった（キラキラ ファンファーレ）
  // v0.7.0: けいさつロボ
  robotOn() { // ピポパ♪
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    [659, 880, 1175, 1568].forEach((f, i) => this._tone(t + i * 0.08, 0.14, { type: 'square', f0: f, f1: f, gain: 0.07 }));
    this._tone(t + 0.34, 0.4, { type: 'triangle', f0: 1760, f1: 1700, gain: 0.1 });
  }
  robotShot(vol = 0.5) { // パスッ（プレイヤーより かるい）
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime, p = 0.95 + Math.random() * 0.1;
    this._noise(t, 0.05, { type: 'highpass', freq: 2600 * p, gain: 0.35 * vol });
    this._noise(t, 0.1, { type: 'lowpass', freq: 2000 * p, gain: 0.45 * vol });
    this._tone(t, 0.08, { f0: 240 * p, f1: 70, gain: 0.4 * vol });
  }
  // v0.14.0: アーミーロボの レーザー（ビーッ）
  laser(vol = 0.5) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime, p = 0.95 + Math.random() * 0.1;
    this._tone(t, 0.18, { type: 'sawtooth', f0: 1400 * p, f1: 380 * p, gain: 0.08 * vol });
    this._tone(t, 0.12, { type: 'square', f0: 2100 * p, f1: 900 * p, gain: 0.035 * vol });
  }
  // v0.14.0: よっぱらいおじさん「ひっく」（ぴょこっ と 1おん）
  hic(vol = 0.5) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime, p = 0.9 + Math.random() * 0.2;
    this._tone(t, 0.09, { type: 'triangle', f0: 380 * p, f1: 900 * p, gain: 0.25 * vol });
  }

  // v0.18.0: ロボットが しゃべった（ピポッ／ピピッ）
  robotSay(kind = 'police') {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    if (kind === 'police') {
      this._tone(t, 0.04, { type: 'square', f0: 1320, f1: 1320, gain: 0.035 });
      this._tone(t + 0.045, 0.06, { type: 'square', f0: 1760, f1: 1760, gain: 0.035 });
    } else {
      this._tone(t, 0.04, { type: 'square', f0: 880, f1: 880, gain: 0.04 });
      this._tone(t + 0.045, 0.05, { type: 'square', f0: 1100, f1: 1100, gain: 0.04 });
    }
  }
  robotBreak() { // ガシャーン（こわれる）
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    this._noise(t, 0.5, { type: 'bandpass', freq: 1800, gain: 0.5 });
    this._tone(t, 0.6, { type: 'square', f0: 700, f1: 90, gain: 0.08 });
    [0.08, 0.17, 0.27].forEach((d, i) => this._tone(t + d, 0.07, { type: 'triangle', f0: 2400 - i * 500, f1: 1800 - i * 400, gain: 0.08 }));
  }
  gift() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    [523, 659, 784, 1047, 1319].forEach((f, i) => this._tone(t + i * 0.09, 0.35, { type: 'square', f0: f, f1: f * 0.99, gain: 0.08 }));
    this._tone(t + 0.5, 0.6, { type: 'triangle', f0: 1568, f1: 1560, gain: 0.12 });
  }
  // おじさん にげる「ひえ〜っ」
  flee() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    this._tone(t, 0.5, { type: 'triangle', f0: 900, f1: 380, gain: 0.2 });
  }
  // v0.6.0: あたらしい ゾンビの おと（こわすぎない）
  spit(vol = 0.5) { // ペッ
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    this._noise(t, 0.12, { type: 'bandpass', freq: 1400, q: 2, gain: 0.35 * vol });
    this._tone(t, 0.1, { type: 'triangle', f0: 420, f1: 180, gain: 0.12 * vol });
  }
  splash(vol = 0.5) { // ベチャ
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    this._noise(t, 0.2, { type: 'lowpass', freq: 900, gain: 0.35 * vol });
  }
  scream(vol = 0.5) { // キャーー（たかく ふるえる）
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime, dur = 0.9;
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(520, t); o.frequency.linearRampToValueAtTime(760, t + 0.25); o.frequency.linearRampToValueAtTime(480, t + dur);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 11; const lg = ctx.createGain(); lg.gain.value = 30; lfo.connect(lg).connect(o.frequency);
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 1.5;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.25 * vol, t + 0.08); g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(f).connect(g).connect(this.comp); o.start(t); lfo.start(t); o.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
  }
  zap(vol = 0.5) { // ビリッ
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 4; i++) this._tone(t + i * 0.03, 0.03, { type: 'square', f0: 900 + Math.random() * 900, f1: 300, gain: 0.08 * vol });
    this._noise(t, 0.14, { type: 'highpass', freq: 3000, gain: 0.25 * vol });
  }
  gas(vol = 0.5) { // プシューッ
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    this._noise(t, 0.9, { type: 'bandpass', freq: 1800, q: 0.8, gain: 0.3 * vol, attack: 0.05 });
    this._tone(t, 0.2, { f0: 160, f1: 60, gain: 0.3 * vol });
  }
  clink(vol = 0.4) { // カン（たて・ヘルメット）
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    if (this._clinkT && t - this._clinkT < 0.06) return; this._clinkT = t;
    this._tone(t, 0.12, { type: 'triangle', f0: 2300, f1: 2100, gain: 0.12 * vol });
    this._tone(t, 0.08, { type: 'square', f0: 3400, f1: 3000, gain: 0.04 * vol });
  }
  fire(vol = 0.4) { // ボッ
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    this._noise(t, 0.45, { type: 'lowpass', freq: 800, gain: 0.5 * vol, attack: 0.01 });
    this._tone(t, 0.2, { f0: 120, f1: 50, gain: 0.3 * vol });
  }
  // v0.15.0: ビームじゅう — ためる（キュイーン）・でている（ブーン）
  charge(k = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    this._tone(t, 0.12, { type: 'sine', f0: 500 + k * 900, f1: 600 + k * 1000, gain: 0.06 });
  }
  beam(vol = 0.5) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    this._tone(t, 0.14, { type: 'sawtooth', f0: 110, f1: 95, gain: 0.07 * vol });
    this._noise(t, 0.12, { type: 'bandpass', freq: 900, q: 1.2, gain: 0.12 * vol });
  }
  overheat() { // プシュー（ねつ／ねんりょう／エネルギー が なくなった）
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    this._noise(t, 0.5, { type: 'highpass', freq: 2500, gain: 0.22, attack: 0.02 });
    this._tone(t, 0.15, { type: 'square', f0: 700, f1: 300, gain: 0.05 });
  }
  toss() { // ヒュッ
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    this._noise(t, 0.16, { type: 'bandpass', freq: 1400, q: 1, gain: 0.2, attack: 0.03 });
  }
  smoke() { // ポン・シューッ
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    this._tone(t, 0.08, { f0: 300, f1: 120, gain: 0.25 });
    this._noise(t + 0.03, 1.4, { type: 'lowpass', freq: 1500, gain: 0.3, attack: 0.08 });
  }
  // v0.13.0: なぐる — ブンッ（ふる おと）
  swish(kind = 'bat') {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime, k = kind === 'hammer' ? 0.6 : kind === 'katana' ? 1.8 : 1;
    const f = this._noise(t, 0.16 / Math.sqrt(k), { type: 'bandpass', freq: 500 * k, q: 1.4, gain: 0.22, attack: 0.03 });
    f.frequency.exponentialRampToValueAtTime(1800 * k, t + 0.12 / Math.sqrt(k));
  }
  // ボコッ / ドゴッ / ザシュッ（あたった おと）
  smack(kind = 'bat', vol = 1) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    if (this._smackT && t - this._smackT < 0.04) return; this._smackT = t;
    if (kind === 'katana') {
      this._noise(t, 0.12, { type: 'highpass', freq: 2600, gain: 0.3 * vol });
      this._tone(t, 0.07, { f0: 260, f1: 90, gain: 0.25 * vol });
    } else if (kind === 'hammer') {
      this._tone(t, 0.28, { f0: 120, f1: 35, gain: 0.9 * vol });
      this._noise(t, 0.22, { type: 'lowpass', freq: 700, gain: 0.55 * vol });
    } else {
      this._tone(t, 0.14, { f0: 190, f1: 60, gain: 0.6 * vol });
      this._noise(t, 0.1, { type: 'lowpass', freq: 1100, gain: 0.4 * vol });
    }
  }
}
