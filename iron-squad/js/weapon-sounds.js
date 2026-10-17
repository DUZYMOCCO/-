// Melee weapon sounds for this game only (the shared engine's clips stay untouched).
// Each sound is synthesized once into a cached AudioBuffer and routed through the shared
// effects bus, so mute, effect volume, page hiding and the limiter all still apply.
//   sword: light "spa-spa"  spear: soft round "fu" (v7.0.16)  axe: heavy "zuba"  hammer: "dogoo"
// v7.0.16: the commander's hits keep the original loudness / spacing / 850 hearing range. Allied soldiers' hits are
// quieter, sparse (one shared gap per style, nearer soldiers win), audible only close to the listener, and use their
// own small voice pool so they never steal a voice from the commander or from strong hits.
import {sound} from '../../common/js/audio.js?v=151';

export const MELEE_SOUND_STYLES = ['sword', 'spear', 'axe', 'hammer'];
const SPEC = {
  sword: {duration: .11, gap: .05, volume: .5},
  spear: {duration: .11, gap: .06, volume: .5},
  axe: {duration: .26, gap: .08, volume: .8},
  hammer: {duration: .55, gap: .1, volume: .95}
};
const MAX_VOICES = 6, HEARING = 850;
/** Allied soldier hits (anyone but the commander, not a strong hit). */
export const ALLY_SOUND = Object.freeze({
  volume: .45,      // multiplies the style volume
  gap: .25,         // seconds between two allied hits of the same style (all allies together)
  hearing: 450,     // px from the listener; farther hits are silent
  falloff: 1.4,     // distance attenuation exponent (the commander's hits use .7)
  maxVoices: 2,     // separate pool: never competes with the commander's voices
  nearBias: .5      // a hit closer than half the last allied hit's distance may cut the gap short (after gap / 2)
});

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 2147483648 - 1; };
}
/** PCM samples for one weapon sound (pure; also used by tests). */
export function synthesizeMeleeSound(style, rate = 44100) {
  const spec = SPEC[style]; if (!spec) return null;
  const n = Math.round(spec.duration * rate), out = new Float32Array(n), noise = rng(style.length * 7919 + 17);
  let lp = 0, lp2 = 0, prev = 0, phase = 0, phase2 = 0;
  // Spear: one-pole low-pass coefficients for a fixed cut-off (independent of the sample rate).
  const spearA = 1 - Math.exp(-2 * Math.PI * 700 / rate), spearB = 1 - Math.exp(-2 * Math.PI * 1100 / rate);
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
      // v7.0.16: a round, soft "fu-tosu": two-pole low-passed noise (no high band, no high-pass), a gentle 7 ms rise
      // and a low, short thump. No hard click at the start and a smooth tail.
      lp += (w - lp) * spearA; lp2 += (lp - lp2) * spearB;
      const env = Math.min(1, t / .007) * Math.exp(-t * 32);
      phase += 2 * Math.PI * (150 - 50 * Math.min(1, t / .09)) / rate;
      v = lp2 * 9 * env + Math.sin(phase) * .55 * Math.min(1, t / .006) * Math.exp(-t * 42);
      if (t > .085) v *= Math.max(0, 1 - (t - .085) / .025);
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
const lastAlly = new Map(), allyVoices = new Set();
let bufferContext = null;
function bufferFor(c, style) {
  if (bufferContext !== c) { buffers.clear(); bufferContext = c; }
  if (!buffers.has(style)) {
    const pcm = synthesizeMeleeSound(style, c.sampleRate), buffer = c.createBuffer(1, pcm.length, c.sampleRate);
    buffer.getChannelData(0).set(pcm); buffers.set(style, buffer);
  }
  return buffers.get(style);
}
/** Clears throttle / voice bookkeeping (tests, audio context changes). */
export function resetMeleeSoundState() {
  for (const v of [...voices, ...allyVoices]) v.release();
  voices.clear(); allyVoices.clear(); lastPlayed.clear(); lastAlly.clear(); buffers.clear(); bufferContext = null;
}

function startVoice(c, style, volume, pan, rateBase, pool) {
  try {
    const source = c.createBufferSource(), gain = c.createGain(), panner = c.createStereoPanner?.();
    source.buffer = bufferFor(c, style); source.playbackRate.value = rateBase + Math.random() * .12;
    gain.gain.value = Math.min(1, volume); source.connect(gain);
    if (panner) { panner.pan.value = pan; gain.connect(panner); panner.connect(sound.effects); } else gain.connect(sound.effects);
    const voice = {source, release: () => { if (!pool.delete(voice)) return; source.disconnect(); gain.disconnect(); panner?.disconnect(); }};
    pool.add(voice); source.onended = voice.release; source.start();
    return voice;
  } catch { return null; }
}

/** Plays the hit sound of a melee weapon style. Returns false when silent or throttled.
 *  `fromPlayer: false` marks an allied soldier's hit (quieter, sparser, nearby only); strong hits always count as the commander's. */
export function playMeleeSound(style, x = null, y = null, {strong = false, fromPlayer = true} = {}) {
  const spec = SPEC[style], c = sound.ctx;
  if (!spec || !c || c.state !== 'running' || !sound.effects || sound.isMuted || sound.pageHidden || !sound.effectVolume) return false;
  const now = c.currentTime, listener = Number.isFinite(x) && Number.isFinite(y) ? sound.spatialListener?.() : null;
  if (!fromPlayer && !strong) {
    // Allied soldier: needs a known position near the listener, one shared gap per style, a small separate voice pool.
    if (!listener) return false;
    const distance = Math.hypot(x - listener.x, y - listener.y); if (distance >= ALLY_SOUND.hearing) return false;
    const last = lastAlly.get(style), since = last ? now - last.time : Infinity;
    if (since < ALLY_SOUND.gap && !(since >= ALLY_SOUND.gap / 2 && distance < last.distance * ALLY_SOUND.nearBias)) return false;
    if (allyVoices.size >= ALLY_SOUND.maxVoices) return false;
    const volume = spec.volume * ALLY_SOUND.volume * Math.pow(1 - distance / ALLY_SOUND.hearing, ALLY_SOUND.falloff);
    const pan = Math.max(-.6, Math.min(.6, (x - listener.x) / 400));
    if (!startVoice(c, style, volume, pan, .94, allyVoices)) return false;
    lastAlly.set(style, {time: now, distance});
    return true;
  }
  if (!strong && now - (lastPlayed.get(style) ?? -Infinity) < spec.gap) return false;
  if (voices.size >= MAX_VOICES) { if (!strong) return false; const old = voices.values().next().value; try { old.source.stop(); } catch { /* ended */ } old.release(); }
  let volume = spec.volume * (strong ? 1.15 : 1), pan = 0;
  if (listener) {
    const distance = Math.hypot(x - listener.x, y - listener.y); if (distance >= HEARING) return false;
    volume *= Math.pow(1 - distance / HEARING, .7); pan = Math.max(-.7, Math.min(.7, (x - listener.x) / 550));
  }
  if (!startVoice(c, style, volume, pan, strong ? .9 : .94, voices)) return false;
  lastPlayed.set(style, now);
  return true;
}