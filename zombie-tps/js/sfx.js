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
  click(freq = 3200, gain = 0.25, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + delay;
    this._noise(t, 0.035, { type: 'bandpass', freq, q: 4, gain });
    this._tone(t, 0.02, { type: 'square', f0: freq * 0.6, f1: freq * 0.4, gain: gain * 0.25 });
  }
  empty() { this.click(4200, 0.18); }
  reload(kind, dur) {
    if (kind === 'shotgun') { for (let i = 0; i < 4; i++) this.click(2600, 0.22, 0.25 + i * (dur - 0.6) / 4); this.click(2000, 0.3, dur - 0.25); this.click(2600, 0.3, dur - 0.12); return; }
    this.click(2200, 0.25, 0.12);            // マガジン ぬく
    this.click(1800, 0.3, dur * 0.62);       // さす
    this.click(3000, 0.3, dur * 0.82);       // ガチャ
    this.click(2400, 0.28, dur * 0.9);
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
}
