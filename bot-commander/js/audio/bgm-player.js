// ロボットコマンダー BGM プレイヤー（v1.0.9）。ダダサバイバーの bgm.js と同じ「先読みの予約」方式。
// 工房共通の sound（common/js/audio.js）の ctx と limiter に音をつなぐだけ。音のファイルは使わない。
// - ハブの消音（sound.isMuted）・BGM の音量（sound.bgmVolume）・画面が隠れた時（sound.pageHidden）を守る。
// - AudioContext を開けるのはハブ（タップの時に sound.unlock()）。ここでは作らない（iOS はタップの後だけ鳴る）。
// - 曲の切り替えは古い曲をゆっくり消し、新しい曲をゆっくり出す（クロスフェード）。
// - sim には一切さわらない（ゲームの速さを変えても曲の速さは変えない）。
import { TRACKS, trackEvents, barSeconds } from './bgm-songs.js?v=1';

export const BGM_LEVEL = 0.55;      // sound.bgmVolume にかける
export const FADE_SEC = 2.4;        // クロスフェードの長さ
const AHEAD = 0.35;                 // 何秒先まで予約するか
const freq = n => 440 * 2 ** ((n - 69) / 12);

function makeImpulse(ctx, sec = 2.8) {
  const len = Math.floor(ctx.sampleRate * sec), buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.6; }
  return buf;
}
function makeNoise(ctx) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = buf.getChannelData(0);
  let last = 0; for (let i = 0; i < d.length; i++) { last = last * 0.97 + (Math.random() * 2 - 1) * 0.03; d[i] = last * 6; } // 茶色っぽい雑音（風）
  return buf;
}

/** 1 曲ぶんの出口: dry ＋ 残響 ＋ 風。gain を下げれば曲ごと消せる。 */
export function makeBus(ctx, dest, track, { impulse, noise } = {}) {
  const bus = ctx.createGain(), dry = ctx.createGain(), wet = ctx.createGain(), verb = ctx.createConvolver();
  verb.buffer = impulse || makeImpulse(ctx);
  dry.gain.value = 1; wet.gain.value = 0.15 + 0.6 * (track.reverb ?? 0.4);
  bus.connect(dry).connect(dest); bus.connect(verb).connect(wet).connect(dest);
  const out = { bus, dry, wet, verb, nodes: [bus, dry, wet, verb], windSrc: null };
  if (track.wind > 0) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    s.buffer = noise || makeNoise(ctx); s.loop = true;
    f.type = 'bandpass'; f.frequency.value = 420; f.Q.value = 0.7;
    lfo.frequency.value = 0.07; lg.gain.value = 260; lfo.connect(lg).connect(f.frequency); // 風が強まったり弱まったり
    g.gain.value = 0.05 * track.wind;
    s.connect(f).connect(g).connect(bus); s.start(); lfo.start();
    out.windSrc = [s, lfo]; out.nodes.push(f, g, lg);
  }
  return out;
}

/** 1 小節を予約する（OfflineAudioContext でも使える: 試聴用の書き出し）。 */
export function scheduleBar(ctx, out, track, bar, t0) {
  for (const e of trackEvents(track, bar)) {
    const t = t0 + e.t, v = e.vel;
    if (e.kind === 'pulse') {
      if (e.note === 0) { // やわらかい低いドン
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32 * v, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
        o.connect(g).connect(out); o.start(t); o.stop(t + 0.45);
      } else { // 小さなカチ
        const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        o.type = 'square'; o.frequency.value = 2400; f.type = 'highpass'; f.frequency.value = 3000;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.03 * v, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
        o.connect(f).connect(g).connect(out); o.start(t); o.stop(t + 0.06);
      }
    } else if (e.kind === 'pad') {
      const g = ctx.createGain(), f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 900; f.Q.value = 0.4;
      const peak = 0.028 * v, att = Math.min(1.4, e.len * 0.4), rel = 1.6;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + att);
      g.gain.setValueAtTime(peak, t + Math.max(att, e.len)); g.gain.exponentialRampToValueAtTime(0.0001, t + e.len + rel);
      f.connect(g).connect(out);
      for (const n of e.note) for (const det of [-7, 7]) {
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = freq(n); o.detune.value = det;
        o.connect(f); o.start(t); o.stop(t + e.len + rel + 0.05);
      }
    } else if (e.kind === 'piano') {
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g2 = ctx.createGain(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      o1.type = 'triangle'; o1.frequency.value = freq(e.note); o2.type = 'sine'; o2.frequency.value = freq(e.note) * 2; g2.gain.value = 0.25;
      f.type = 'lowpass'; f.frequency.setValueAtTime(3200, t); f.frequency.exponentialRampToValueAtTime(900, t + 1.2);
      const dec = Math.min(3.2, e.len + 1.0), peak = 0.11 * v;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.006);
      g.gain.exponentialRampToValueAtTime(peak * 0.35, t + 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
      o1.connect(f); o2.connect(g2).connect(f); f.connect(g).connect(out);
      o1.start(t); o2.start(t); o1.stop(t + dec + 0.02); o2.stop(t + dec + 0.02);
    } else if (e.kind === 'bell') {
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g2 = ctx.createGain(), g = ctx.createGain();
      o1.frequency.value = freq(e.note); o2.frequency.value = freq(e.note) * 2.76; g2.gain.value = 0.3;
      const dec = 3.0, peak = 0.05 * v;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
      o1.connect(g); o2.connect(g2).connect(g); g.connect(out);
      o1.start(t); o2.start(t); o1.stop(t + dec + 0.02); o2.stop(t + dec + 0.02);
    } else if (e.kind === 'bass') {
      const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g2 = ctx.createGain(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = freq(e.note); o2.type = 'triangle'; o2.frequency.value = freq(e.note); g2.gain.value = 0.2;
      const peak = 0.16 * v, end = t + e.len;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.04);
      g.gain.setValueAtTime(peak * 0.8, Math.max(t + 0.05, end - 0.15)); g.gain.exponentialRampToValueAtTime(0.0001, end + 0.4);
      o.connect(g); o2.connect(g2).connect(g); g.connect(out);
      o.start(t); o2.start(t); o.stop(end + 0.45); o2.stop(end + 0.45);
    }
  }
}

/** ゲームで使う BGM。mode は TRACKS の名前（base / explore / combat / giant / dialogue）。 */
export class WastelandBGM {
  constructor(sound, { tracks = TRACKS, enabled = () => true } = {}) {
    this.sound = sound; this.tracks = tracks; this.enabled = enabled;
    this.wanted = false; this.mode = null; this.cur = null; this.timer = null; this.oneShot = null;
  }
  ok() {
    const s = this.sound, ctx = s?.ctx;
    return !!(this.wanted && ctx && ctx.state === 'running' && !s.isMuted && !s.pageHidden && s.bgmVolume > 0 && s.limiter && this.enabled());
  }
  level() { return (this.sound.bgmVolume ?? 0.35) * BGM_LEVEL; }
  start(mode = 'explore') {
    this.wanted = true; this.setMode(mode);
    if (!this.timer) this.timer = setInterval(() => this.tick(), 60);
    this.tick();
  }
  /** 曲を替える（同じなら何もしない）。実際の切り替えは tick でクロスフェード。 */
  setMode(mode) { if (this.tracks[mode]) { this.mode = mode; this.oneShot = null; } }
  /** 勝ち・負けの短い一節。今の曲を消して 1 回だけ鳴らし、そのあとは静かに。 */
  stinger(id) { if (!this.tracks[id]) return; this.mode = null; this.oneShot = id; this.tick(); }
  fadeOut(cur, sec = FADE_SEC) {
    if (!cur) return;
    const ctx = cur.ctx;
    try { cur.bus.gain.cancelScheduledValues(ctx.currentTime); cur.bus.gain.setTargetAtTime(0, ctx.currentTime, sec / 4); } catch { /* 閉じた */ }
    setTimeout(() => { try { cur.windSrc?.forEach(n => n.stop()); cur.nodes.forEach(n => n.disconnect()); } catch { /* もう切れている */ } }, (sec + 3.5) * 1000);
  }
  stop() {
    this.wanted = false; clearInterval(this.timer); this.timer = null;
    this.fadeOut(this.cur, 0.8); this.cur = null; this.mode = null; this.oneShot = null;
  }
  tick() {
    const s = this.sound, ctx = s?.ctx;
    if (!this.ok()) { if (this.cur) { this.fadeOut(this.cur, 0.3); this.cur = null; } return; }
    const want = this.oneShot || this.mode;
    if (!want) { if (this.cur) { this.fadeOut(this.cur); this.cur = null; } return; }
    if (this.cur && this.cur.ctx !== ctx) this.cur = null;
    if (!this.cur || this.cur.id !== want) {
      if (this.cur) this.fadeOut(this.cur);
      const track = this.tracks[want];
      const out = makeBus(ctx, s.limiter, track);
      const fadeIn = this.oneShot ? 0.05 : (this.cur ? FADE_SEC : 1.2);
      out.bus.gain.setValueAtTime(0.0001, ctx.currentTime); out.bus.gain.linearRampToValueAtTime(this.level(), ctx.currentTime + fadeIn);
      this.cur = { ...out, ctx, id: want, track, bar: 0, next: ctx.currentTime + 0.1, one: !!this.oneShot };
      s.session?.('playback');
    } else {
      this.cur.bus.gain.setTargetAtTime(this.level(), ctx.currentTime, 0.2);
    }
    const c = this.cur;
    if (c.next < ctx.currentTime) { c.next = ctx.currentTime + 0.05; } // 遅れたら今から（タブが止まっていた時など）
    while (c.next < ctx.currentTime + AHEAD) {
      if (c.one && c.bar >= c.track.bars) { // 一節が終わったら静かに
        if (ctx.currentTime > c.next + 4) { this.fadeOut(c, 0.5); this.cur = null; this.oneShot = null; }
        break;
      }
      scheduleBar(ctx, c.bus, c.track, c.bar, c.next);
      c.next += barSeconds(c.track); c.bar++;
    }
  }
}
