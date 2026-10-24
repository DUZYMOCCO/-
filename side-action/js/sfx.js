// おと（WebAudio で その場で つくる）
export class Sfx {
  constructor(muted = false) { this.muted = muted; this.ctx = null; this.last = {}; }
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ctx = this.ctx = new AC();
    this.comp = ctx.createDynamicsCompressor(); this.comp.threshold.value = -14; this.comp.ratio.value = 6;
    this.master = ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.7;
    this.comp.connect(this.master).connect(ctx.destination);
    const len = ctx.sampleRate; const buf = ctx.createBuffer(1, len, ctx.sampleRate); const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
  }
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 0.7; }
  close() { try { this.ctx && this.ctx.close(); } catch (e) { /* なし */ } this.ctx = null; }
  _noise(t, dur, { type = 'lowpass', freq = 1000, q = 0.7, gain = 0.5, attack = 0.001, rate = 1 } = {}) {
    const ctx = this.ctx, s = ctx.createBufferSource(); s.buffer = this.noise; s.playbackRate.value = rate;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f).connect(g).connect(this.comp); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  _tone(t, dur, { type = 'sine', f0 = 200, f1 = 60, gain = 0.5 } = {}) {
    const ctx = this.ctx, o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g).connect(this.comp); o.start(t); o.stop(t + dur + 0.02);
  }
  // おなじ おとが かさなりすぎない ように
  gate(k, gap) { const t = this.ctx.currentTime; if (this.last[k] && t - this.last[k] < gap) return false; this.last[k] = t; return true; }
  play(ev) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime, p = 0.92 + Math.random() * 0.16;
    switch (ev.type) {
      case 'shoot': {
        if (!this.gate('shoot' + ev.owner, ev.owner === 'a' ? 0.09 : 0.03)) return;
        const v = ev.owner === 'a' ? 0.45 : 1;
        if (ev.w === 'shotgun') { this._noise(t, 0.28, { freq: 1600, gain: 0.9 * v }); this._tone(t, 0.2, { f0: 120 * p, f1: 35, gain: 0.9 * v }); }
        else if (ev.w === 'bazooka') { this._noise(t, 0.5, { type: 'bandpass', freq: 700, gain: 0.7 }); this._tone(t, 0.3, { f0: 90, f1: 40, gain: 0.8 }); }
        else if (ev.w === 'rifle') { this._noise(t, 0.12, { freq: 2600 * p, gain: 0.6 * v }); this._tone(t, 0.1, { f0: 170 * p, f1: 45, gain: 0.6 * v }); }
        else if (ev.w === 'smg') { this._noise(t, 0.07, { type: 'bandpass', freq: 2000 * p, gain: 0.5 * v }); this._tone(t, 0.06, { f0: 200 * p, f1: 70, gain: 0.35 * v }); }
        else { this._noise(t, 0.09, { type: 'bandpass', freq: 1700 * p, gain: 0.6 * v }); this._tone(t, 0.08, { f0: 230 * p, f1: 70, gain: 0.45 * v }); }
        break;
      }
      case 'eshoot': this._tone(t, 0.25, { type: 'sawtooth', f0: 600, f1: 150, gain: 0.18 }); this._noise(t, 0.15, { type: 'bandpass', freq: 900, gain: 0.25 }); break;
      case 'whoosh': if (this.gate('wh', 0.05)) this._noise(t, 0.16, { type: 'bandpass', freq: 900 * p, q: 1.4, gain: ev.ally ? 0.15 : 0.35, attack: 0.05 }); break;
      case 'whoosh2': this._noise(t, 0.1, { type: 'bandpass', freq: 1400 * p, q: 1.4, gain: 0.25, attack: 0.03 }); break;
      case 'hit': if (!this.gate('hit', 0.03)) return; this._tone(t, ev.big ? 0.22 : 0.12, { f0: ev.big ? 140 : 190 * p, f1: 40, gain: ev.big ? 1 : 0.75 }); this._noise(t, ev.big ? 0.18 : 0.08, { freq: 2500, gain: ev.big ? 0.8 : 0.55 }); this._noise(t, 0.1, { type: 'bandpass', freq: 500, q: 2, gain: 0.35 }); break;
      case 'bhit': if (this.gate('bh', 0.05)) this._noise(t, 0.06, { type: 'bandpass', freq: 1100 * p, q: 2, gain: 0.3 }); break;
      case 'kill': this._noise(t, 0.25, { type: 'bandpass', freq: 500, q: 1.5, gain: 0.35 }); this._tone(t, 0.18, { type: 'square', f0: 300, f1: 90, gain: 0.08 }); break;
      case 'poof': if (this.gate('poof', 0.06)) { this._noise(t, 0.35, { freq: 700, gain: 0.4, attack: 0.02 }); this._tone(t + 0.02, 0.2, { type: 'triangle', f0: 880, f1: 1760, gain: 0.08 }); } break;
      case 'hurt': this._tone(t, 0.25, { type: 'square', f0: 330, f1: 110, gain: 0.18 }); this._noise(t, 0.1, { freq: 1500, gain: 0.4 }); break;
      case 'jump': this._tone(t, 0.12, { type: 'triangle', f0: 260, f1: 520, gain: 0.18 }); break;
      case 'jump2': this._tone(t, 0.14, { type: 'triangle', f0: 400, f1: 900, gain: 0.18 }); break;
      case 'pickup': this._tone(t, 0.08, { type: 'square', f0: 880, f1: 880, gain: 0.1 }); this._tone(t + 0.08, 0.14, { type: 'square', f0: 1320, f1: 1320, gain: 0.1 }); break;
      case 'swap': this._noise(t, 0.05, { type: 'bandpass', freq: 3000, q: 3, gain: 0.3 }); this._noise(t + 0.08, 0.05, { type: 'bandpass', freq: 2200, q: 3, gain: 0.3 }); break;
      case 'boom': case 'slam': this._noise(t, 0.7, { freq: 500, gain: 1 }); this._tone(t, 0.5, { f0: 90, f1: 28, gain: 1 }); break;
      case 'wall': case 'thud': if (this.gate('thud', 0.06)) this._tone(t, 0.18, { f0: 110, f1: 40, gain: 0.6 }); break;
      case 'clang': this._tone(t, 0.25, { type: 'square', f0: 1200, f1: 1100, gain: 0.08 }); this._noise(t, 0.1, { type: 'highpass', freq: 3000, gain: 0.35 }); break;
      case 'ting': if (this.gate('ting', 0.06)) this._tone(t, 0.12, { type: 'triangle', f0: 2200, f1: 2000, gain: 0.1 }); break;
      case 'break': case 'wood': if (this.gate('wood', 0.05)) this._noise(t, ev.type === 'break' ? 0.3 : 0.08, { type: 'bandpass', freq: 700, q: 1, gain: 0.5 }); break;
      case 'creep': case 'hiss': this._noise(t, 0.6, { type: 'bandpass', freq: 3000, q: 4, gain: 0.18, attack: 0.15 }); this._tone(t, 0.6, { type: 'sawtooth', f0: 70, f1: 55, gain: 0.08 }); break;
      case 'roar': this._tone(t, 1.1, { type: 'sawtooth', f0: 110, f1: 45, gain: 0.35 }); this._noise(t, 1.0, { freq: 400, gain: 0.5, attack: 0.1 }); break;
      case 'spit': case 'spike': this._noise(t, 0.3, { type: 'bandpass', freq: 400, q: 3, gain: 0.5 }); this._tone(t, 0.2, { f0: 200, f1: 60, gain: 0.4 }); break;
      case 'aim': this._tone(t, 0.12, { type: 'square', f0: 1400, f1: 1400, gain: 0.05 }); break;
      case 'charge': this._tone(t, 0.6, { type: 'sawtooth', f0: 80, f1: 200, gain: 0.25 }); break;
      case 'lock': this._tone(t, 0.15, { type: 'square', f0: 220, f1: 220, gain: 0.08 }); this._tone(t + 0.18, 0.2, { type: 'square', f0: 165, f1: 165, gain: 0.08 }); break;
      case 'go': [523, 659, 784].forEach((f, i) => this._tone(t + i * 0.09, 0.12, { type: 'square', f0: f, f1: f, gain: 0.08 })); break;
      case 'clear': [523, 659, 784, 1047].forEach((f, i) => this._tone(t + i * 0.12, 0.25, { type: 'square', f0: f, f1: f, gain: 0.1 })); break;
      case 'bossDie': this._noise(t, 1.5, { freq: 600, gain: 1 }); this._tone(t, 1.4, { type: 'sawtooth', f0: 160, f1: 30, gain: 0.4 }); break;
      case 'down': case 'over': this._tone(t, 0.6, { type: 'triangle', f0: 440, f1: 110, gain: 0.2 }); break;
      case 'revive': this._tone(t, 0.3, { type: 'triangle', f0: 440, f1: 880, gain: 0.2 }); break;
      case 'warp': this._tone(t, 0.15, { type: 'sine', f0: 600, f1: 1200, gain: 0.1 }); break;
    }
  }
}
