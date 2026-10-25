// おと（WebAudio で その場で つくる）
import { MusicPlayer } from './music.js?v=9';

export class Sfx {
  constructor(muted = false) {
    this.muted = muted;
    this.ctx = null;
    this.last = {};
    this.music = new MusicPlayer(muted);
  }
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      this.music.init(this.ctx);
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ctx = this.ctx = new AC();
    this.comp = ctx.createDynamicsCompressor(); this.comp.threshold.value = -14; this.comp.ratio.value = 6;
    this.master = ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.7;
    this.comp.connect(this.master).connect(ctx.destination);
    const len = ctx.sampleRate; const buf = ctx.createBuffer(1, len, ctx.sampleRate); const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
    this.music.init(ctx);
  }
  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.7;
    this.music.setMuted(m);
  }
  // ---- ふんいき：ひくい うなり と しんぞうの おと ----
  ambient(dt, { on = false, level = 1, danger = 0 } = {}) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const ctx = this.ctx, t = ctx.currentTime;
    if (!this.amb) {
      const out = ctx.createGain(); out.gain.value = 0; out.connect(this.master);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 150; lp.Q.value = 3; lp.connect(out);
      const oscs = [41, 41.7, 61.5].map((f, i) => { const o = ctx.createOscillator(); o.type = i === 2 ? 'triangle' : 'sawtooth'; o.frequency.value = f; const g = ctx.createGain(); g.gain.value = i === 2 ? 0.25 : 0.5; o.connect(g).connect(lp); o.start(); return o; });
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.09; const lg = ctx.createGain(); lg.gain.value = 70; lfo.connect(lg).connect(lp.frequency); lfo.start();
      const n = ctx.createBufferSource(); n.buffer = this.noise; n.loop = true; const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 260; nf.Q.value = 0.6; const ng = ctx.createGain(); ng.gain.value = 0.16; n.connect(nf).connect(ng).connect(out); n.start();
      this.amb = { out, nodes: [...oscs, lfo, n], beat: 0.5 };
    }
    const hasBgm = this.music && this.music.started && this.music.source;
    const want = on ? (hasBgm ? 0.035 : 0.13) * level : 0;
    const A = this.amb;
    if (Math.abs((A.cur || 0) - want) > 0.002) { A.cur = want; A.out.gain.setTargetAtTime(want, t, 0.6); }
    if (!on || this.muted) return;
    A.beat -= dt;
    if (A.beat <= 0) {
      const gap = 1.25 - 0.6 * Math.min(1, danger), v = 0.25 + 0.45 * Math.min(1, danger);
      A.beat = gap;
      this._tone(t, 0.16, { f0: 62, f1: 34, gain: v }); this._tone(t + 0.2, 0.14, { f0: 52, f1: 30, gain: v * 0.7 });
    }
  }
  close() {
    this.music && this.music.stop();
    if (this.amb) { this.amb.nodes.forEach((n) => { try { n.stop(); } catch (e) { /* なし */ } }); this.amb = null; }
    try { this.ctx && this.ctx.close(); } catch (e) { /* なし */ } this.ctx = null;
  }
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
        if (ev.w === 'minigun') { if (!this.gate('mg', 0.05)) return; this._noise(t, 0.05, { type: 'bandpass', freq: 2300 * p, gain: 0.42 * v }); this._tone(t, 0.05, { f0: 160 * p, f1: 60, gain: 0.3 * v }); }
        else if (ev.w === 'beam') { this._tone(t, 0.09, { type: 'square', f0: 1500 * p, f1: 500, gain: 0.07 * v }); this._tone(t, 0.07, { type: 'sine', f0: 2400, f1: 900, gain: 0.1 * v }); }
        else if (ev.w === 'shotgun') { this._noise(t, 0.28, { freq: 1600, gain: 0.9 * v }); this._tone(t, 0.2, { f0: 120 * p, f1: 35, gain: 0.9 * v }); }
        else if (ev.w === 'bazooka') { this._noise(t, 0.5, { type: 'bandpass', freq: 700, gain: 0.7 }); this._tone(t, 0.3, { f0: 90, f1: 40, gain: 0.8 }); }
        else if (ev.w === 'rifle') { this._noise(t, 0.12, { freq: 2600 * p, gain: 0.6 * v }); this._tone(t, 0.1, { f0: 170 * p, f1: 45, gain: 0.6 * v }); }
        else if (ev.w === 'smg') { this._noise(t, 0.07, { type: 'bandpass', freq: 2000 * p, gain: 0.5 * v }); this._tone(t, 0.06, { f0: 200 * p, f1: 70, gain: 0.35 * v }); }
        else { this._noise(t, 0.09, { type: 'bandpass', freq: 1700 * p, gain: 0.6 * v }); this._tone(t, 0.08, { f0: 230 * p, f1: 70, gain: 0.45 * v }); }
        break;
      }
      case 'eshoot': this._tone(t, 0.25, { type: 'sawtooth', f0: 600, f1: 150, gain: 0.18 }); this._noise(t, 0.15, { type: 'bandpass', freq: 900, gain: 0.25 }); break;
      case 'whoosh': if (this.gate('wh', 0.05)) this._noise(t, 0.16, { type: 'bandpass', freq: 900 * p, q: 1.4, gain: ev.ally ? 0.15 : 0.35, attack: 0.05 }); break;
      case 'slash': if (this.gate('sl', 0.05)) { this._noise(t, 0.14, { type: 'bandpass', freq: 2600 * p, q: 1.2, gain: 0.4, attack: 0.02 }); this._noise(t + 0.03, 0.1, { type: 'highpass', freq: 5000, gain: 0.18 }); } break;
      case 'slashHit': if (this.gate('slh', 0.04)) { this._noise(t, 0.16, { type: 'bandpass', freq: 650, q: 1.6, gain: 0.55 }); this._tone(t, 0.12, { f0: 240 * p, f1: 70, gain: 0.45 }); this._noise(t + 0.02, 0.12, { type: 'lowpass', freq: 900, gain: 0.35 }); } break;
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
      case 'creep': this._noise(t, 0.9, { type: 'bandpass', freq: 600, q: 6, gain: 0.3, attack: 0.3, rate: 0.5 }); this._tone(t, 0.9, { type: 'sawtooth', f0: 55, f1: 38, gain: 0.12 }); break;
      case 'hiss': this._noise(t, 0.6, { type: 'bandpass', freq: 3000, q: 4, gain: 0.18, attack: 0.15 }); this._tone(t, 0.6, { type: 'sawtooth', f0: 70, f1: 55, gain: 0.08 }); break;
      case 'roar': this._tone(t, 1.1, { type: 'sawtooth', f0: 110, f1: 45, gain: 0.35 }); this._noise(t, 1.0, { freq: 400, gain: 0.5, attack: 0.1 }); break;
      case 'spit': case 'spike': this._noise(t, 0.3, { type: 'bandpass', freq: 400, q: 3, gain: 0.5 }); this._tone(t, 0.2, { f0: 200, f1: 60, gain: 0.4 }); break;
      // v0.9：ドア・シャッター
      case 'knock': if (this.gate('knock', 0.08)) { [0, 0.12].forEach((d) => this._tone(t + d, 0.08, { f0: 160, f1: 90, gain: 0.45 })); } break;
      case 'door': if (this.gate('door', 0.06)) { this._noise(t, 0.22, { type: 'bandpass', freq: 380, q: 1.2, gain: 0.7 }); this._tone(t, 0.2, { f0: 120, f1: 50, gain: 0.55 }); } break;
      case 'kickdoor': this._noise(t, 0.35, { freq: 520, gain: 0.9 }); this._tone(t, 0.3, { f0: 100, f1: 36, gain: 0.8 }); break;
      case 'shutter': if (this.gate('shut', 0.1)) { this._noise(t, 0.7, { type: 'bandpass', freq: 1500, q: 0.9, gain: 0.32, attack: 0.04, rate: 2 }); this._tone(t + 0.6, 0.18, { f0: 140, f1: 60, gain: 0.4 }); } break;
      case 'doorShut': if (this.gate('dsh', 0.1)) this._tone(t, 0.14, { f0: 150, f1: 70, gain: 0.3 }); break;
      case 'snap': this._noise(t, 0.05, { type: 'bandpass', freq: 3200, q: 2, gain: 0.7 }); break;
      case 'eshotgun': if (this.gate('esg', 0.05)) { this._noise(t, 0.3, { freq: 800, gain: 0.6 }); this._tone(t, 0.2, { f0: 160, f1: 50, gain: 0.35 }); } break;
      case 'aim': this._tone(t, 0.12, { type: 'square', f0: 1400, f1: 1400, gain: 0.05 }); break;
      case 'spin': this._tone(t, 0.5, { type: 'sawtooth', f0: 60, f1: 340, gain: 0.12 }); this._noise(t, 0.5, { type: 'bandpass', freq: 1200, q: 3, gain: 0.18, attack: 0.3 }); break;
      case 'hum': this._tone(t, 0.6, { type: 'sine', f0: 140, f1: 520, gain: 0.16 }); this._tone(t, 0.6, { type: 'triangle', f0: 280, f1: 1040, gain: 0.05 }); break;
      case 'beam': this._noise(t, 0.5, { type: 'bandpass', freq: 1800, q: 0.8, gain: 0.6 }); this._tone(t, 0.55, { type: 'sawtooth', f0: 900, f1: 120, gain: 0.25 }); this._tone(t, 0.4, { f0: 70, f1: 30, gain: 0.7 }); break;
      case 'charge': this._tone(t, 0.6, { type: 'sawtooth', f0: 80, f1: 200, gain: 0.25 }); break;
      case 'lock': this._tone(t, 0.15, { type: 'square', f0: 220, f1: 220, gain: 0.08 }); this._tone(t + 0.18, 0.2, { type: 'square', f0: 165, f1: 165, gain: 0.08 }); break;
      case 'go': [196, 233, 294].forEach((f, i) => this._tone(t + i * 0.1, 0.22, { type: 'sawtooth', f0: f, f1: f, gain: 0.07 })); break;
      case 'clear': [262, 311, 392, 523].forEach((f, i) => this._tone(t + i * 0.16, 0.4, { type: 'sawtooth', f0: f, f1: f, gain: 0.08 })); this._tone(t, 1.2, { f0: 65, f1: 60, gain: 0.4 }); break;
      case 'bossDie': this._noise(t, 1.5, { freq: 600, gain: 1 }); this._tone(t, 1.4, { type: 'sawtooth', f0: 160, f1: 30, gain: 0.4 }); break;
      case 'down': case 'over': this._tone(t, 0.6, { type: 'triangle', f0: 440, f1: 110, gain: 0.2 }); break;
      case 'revive': this._tone(t, 0.3, { type: 'triangle', f0: 440, f1: 880, gain: 0.2 }); break;
      case 'warp': this._tone(t, 0.15, { type: 'sine', f0: 600, f1: 1200, gain: 0.1 }); break;
    }
  }
}
