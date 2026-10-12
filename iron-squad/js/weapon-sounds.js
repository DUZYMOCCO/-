// Melee weapon sounds for this game only (the shared engine's clips stay untouched).
// Each sound is synthesized once into a cached AudioBuffer and routed through the shared
// effects bus, so mute, effect volume, page hiding and the limiter all still apply.
//   sword: light "spa-spa"  spear: "pusu"  axe: heavy "zuba"  hammer: "dogoo"
import {sound} from '../../common/js/audio.js?v=151';

export const MELEE_SOUND_STYLES = ['sword', 'spear', 'axe', 'hammer'];
const SPEC = {
  sword: {duration: .11, gap: .05, volume: .5},
  spear: {duration: .09, gap: .06, volume: .6},
  axe: {duration: .26, gap: .08, volume: .8},
  hammer: {duration: .55, gap: .1, volume: .95}
};
const MAX_VOICES = 6, HEARING = 850;

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 2147483648 - 1; };
}
/** PCM samples for one weapon sound (pure; also used by tests). */
export function synthesizeMeleeSound(style, rate = 44100) {
  const spec = SPEC[style]; if (!spec) return null;
  const n = Math.round(spec.duration * rate), out = new Float32Array(n), noise = rng(style.length * 7919 + 17);
  let lp = 0, lp2 = 0, prev = 0, phase = 0, phase2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / rate, w = noise();
    let v = 0;
    if (style === 'sword') {
      // Bright, short swish (high-passed noise) with a faint ringing edge.
      const hp = w - prev; prev = w;
      const env = Math.min(1, t / .003) * Math.exp(-t * 45);
      phase += 2 * Math.PI * (2400 - 800 * Math.min(1, t / .1)) / rate;
      v = hp * .55 * env + Math.sin(phase) * .14 * Math.exp(-t * 60);
    } else if (style === 'spear') {
      // A soft "pf" puff and a small dull thump that stops abruptly.
      lp += (w - lp) * .25;
      const env = Math.min(1, t / .002) * Math.exp(-t * 55);
      phase += 2 * Math.PI * (220 - 80 * Math.min(1, t / .06)) / rate;
      v = lp * 1.1 * env + Math.sin(phase) * .5 * Math.exp(-t * 70);
      if (t > .07) v *= Math.max(0, 1 - (t - .07) / .02);
    } else if (style === 'axe') {
      // Heavy cleave: thick filtered noise body plus a low weight, softly saturated.
      lp += (w - lp) * .12; const hp = w - prev; prev = w;
      const env = Math.min(1, t / .01) * Math.exp(-t * 16);
      phase += 2 * Math.PI * (110 - 50 * Math.min(1, t / .2)) / rate;
      v = Math.tanh(1.8 * (lp * 1.6 * env + hp * .12 * env + Math.sin(phase) * .6 * Math.exp(-t * 22)));
    } else {
      // Deep impact: falling sine boom, a crunch, and a rumbling tail.
      lp += (w - lp) * .08; lp2 += (w - lp2) * .02;
      phase += 2 * Math.PI * (38 + 47 * Math.exp(-t * 9)) / rate;
      phase2 += 2 * Math.PI * 140 / rate;
      v = Math.tanh(2.2 * (Math.sin(phase) * Math.min(1, t / .004) * Math.exp(-t * 7)
        + lp * 1.4 * Math.exp(-t * 30) + lp2 * 1.2 * Math.exp(-t * 6) + Math.sin(phase2) * .2 * Math.exp(-t * 40)));
    }
    out[i] = v;
  }
  // Normalize and fade the last 4 ms to avoid clicks.
  let peak = 0; for (const v of out) peak = Math.max(peak, Math.abs(v));
  const fade = Math.min(n, Math.round(rate * .004)), scale = peak > 0 ? .9 / peak : 0;
  for (let i = 0; i < n; i++) out[i] *= scale * (i >= n - fade ? (n - i) / fade : 1);
  return out;
}

const buffers = new Map(), lastPlayed = new Map(), voices = new Set();
let bufferContext = null;
function bufferFor(c, style) {
  if (bufferContext !== c) { buffers.clear(); bufferContext = c; }
  if (!buffers.has(style)) {
    const pcm = synthesizeMeleeSound(style, c.sampleRate), buffer = c.createBuffer(1, pcm.length, c.sampleRate);
    buffer.getChannelData(0).set(pcm); buffers.set(style, buffer);
  }
  return buffers.get(style);
}

/** Plays the hit sound of a melee weapon style. Returns false when silent or throttled. */
export function playMeleeSound(style, x = null, y = null, {strong = false} = {}) {
  const spec = SPEC[style], c = sound.ctx;
  if (!spec || !c || c.state !== 'running' || !sound.effects || sound.isMuted || sound.pageHidden || !sound.effectVolume) return false;
  const now = c.currentTime;
  if (!strong && now - (lastPlayed.get(style) ?? -Infinity) < spec.gap) return false;
  if (voices.size >= MAX_VOICES) { if (!strong) return false; const old = voices.values().next().value; try { old.source.stop(); } catch { /* ended */ } old.release(); }
  let volume = spec.volume * (strong ? 1.15 : 1), pan = 0;
  const listener = Number.isFinite(x) && Number.isFinite(y) ? sound.spatialListener?.() : null;
  if (listener) {
    const distance = Math.hypot(x - listener.x, y - listener.y); if (distance >= HEARING) return false;
    volume *= Math.pow(1 - distance / HEARING, .7); pan = Math.max(-.7, Math.min(.7, (x - listener.x) / 550));
  }
  try {
    const source = c.createBufferSource(), gain = c.createGain(), panner = c.createStereoPanner?.();
    source.buffer = bufferFor(c, style); source.playbackRate.value = (strong ? .9 : .94) + Math.random() * .12;
    gain.gain.value = Math.min(1, volume); source.connect(gain);
    if (panner) { panner.pan.value = pan; gain.connect(panner); panner.connect(sound.effects); } else gain.connect(sound.effects);
    const voice = {source, release: () => { if (!voices.delete(voice)) return; source.disconnect(); gain.disconnect(); panner?.disconnect(); }};
    voices.add(voice); lastPlayed.set(style, now); source.onended = voice.release; source.start();
    return true;
  } catch { return false; }
}
