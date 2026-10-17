// Weapon sounds for this game only (the shared engine's clips stay untouched).
// Each melee sound is synthesized once into a cached AudioBuffer and routed through the shared
// effects bus, so mute, effect volume, page hiding and the limiter all still apply.
//   sword: light "spa-spa"  spear: soft round "fu" (v7.0.16)  axe: heavy "zuba"  hammer: "dogoo"
// v7.0.16: the commander's hits keep the original loudness / spacing / 850 hearing range. Allied soldiers' hits are
// quieter, sparse (one shared gap per style, nearer soldiers win), audible only close to the listener, and use their
// own small voice pool so they never steal a voice from the commander or from strong hits.
// v7.0.17: the same treatment for ranged shots (bow / crossbow / cannon), magic casts and the hit sounds of ranged and
// magic attacks. The commander keeps the shared engine's sounds (sound.playWeapon / playMagic / playImpact) untouched.
// Allied soldiers use their own small voice pools (never the commander's voices and never the engine's 8 shared combat
// slots): quieter, one shared gap per sound kind, nearby only, and thinned further when many allied sounds are already
// playing (volume down, then dropped by priority). Only the sound is thinned: damage, animation and effects are unchanged.
//   Priority when sounds compete (highest first): commander strong hit > commander normal > magic > allied ranged >
//   allied melee > allied hit / impact sounds. The commander's sounds never wait for the allied budget.
import {sound} from '../../common/js/audio.js?v=151';

export const MELEE_SOUND_STYLES = ['sword', 'spear', 'axe', 'hammer'];
const SPEC = {
  sword: {duration: .11, gap: .05, volume: .5},
  spear: {duration: .11, gap: .06, volume: .5},
  axe: {duration: .26, gap: .08, volume: .8},
  hammer: {duration: .55, gap: .1, volume: .95}
};
const MAX_VOICES = 6, HEARING = 850;
/** Allied soldier hits (anyone but the commander, not a strong hit). The hearing range, falloff and near-bias are shared by every allied sound. */
export const ALLY_SOUND = Object.freeze({
  volume: .45,      // multiplies the style volume
  gap: .25,         // seconds between two allied hits of the same style (all allies together)
  hearing: 450,     // px from the listener; farther sounds are silent
  falloff: 1.4,     // distance attenuation exponent (the commander's sounds use .7)
  maxVoices: 2,     // separate pool: never competes with the commander's voices
  nearBias: .5      // a sound closer than half the last allied sound's distance may cut the gap short (after gap / 2)
});

// ---- v7.0.17: allied ranged / magic / impact sounds ----
/** The shared engine's own volumes (sound.playWeapon / playMagic / playImpact); the allied volumes below are multiples of these. */
const ENGINE_VOLUME = Object.freeze({bow: .75, crossbow: .75, stone: .75, cannon: .7, magic: .72, impact: .55});
/** Allied soldiers' ranged shots. Bow and crossbow (and the empty-quiver stone) share one pool of 2 voices; the cannon has its own single voice. */
export const RANGED_ALLY_SOUND = Object.freeze({
  volume: Object.freeze({bow: .4, crossbow: .4, stone: .4, cannon: .45}),   // multiplies the engine volume
  gap: Object.freeze({bow: .3, crossbow: .3, stone: .3, cannon: .45}),      // seconds, shared by all allies of that style
  voices: Object.freeze({bow: 2, cannon: 1}),                               // bow / crossbow / stone share 'bow'
  pool: Object.freeze({bow: 'bow', crossbow: 'bow', stone: 'bow', cannon: 'cannon'}),
  maxDuration: Object.freeze({cannon: .5})                                  // the cannon clip is long (~1 s): cut it so its single voice frees up
});
/** Allied magic casts (any caster except the commander, medic SMITE): one shared gap, shortened clips. */
export const MAGIC_ALLY_SOUND = Object.freeze({volume: .5, gap: .35, maxVoices: 2, maxDuration: .4});
/** Hit sounds of allied ranged / magic attacks (the commander's stay on sound.playImpact). */
export const IMPACT_ALLY_SOUND = Object.freeze({volume: .5, gap: .2, maxVoices: 1, maxDuration: .25});
/** Budget over every allied sound: crowding lowers the volume, a per-second cap and role limits drop the least important first. */
export const ALLY_BUDGET = Object.freeze({
  crowdWindow: .5,     // seconds looked back to count allied sounds
  crowdFull: 6,        // this many allied sounds inside the window = full crowding
  crowdMinScale: .6,   // allied volume goes from x1.0 (quiet) down to x0.6 (full crowding)
  perSecond: 8,        // hard cap on allied sounds started in any 1 s
  roleLimit: Object.freeze({magic: 8, ranged: 7, melee: 6, impact: 4})  // a role is dropped once this many allied sounds started in the last 1 s
});
const MAGIC_CLIPS = {fire: 'fire', ice: 'ice', lightning: 'lightning', explosion: 'blast'};
/** Rounded, short synthesized shots for allied bow / crossbow (no lasting pitch, nothing above ~2 kHz to speak of). */
export const ALLY_RANGED_SYNTH = Object.freeze({
  bow: Object.freeze({duration: .16, cut: 1100, body: [230, 150], bodyDecay: 48, decay: 30, noise: 5.2, thump: .5, seed: 3}),
  crossbow: Object.freeze({duration: .15, cut: 1250, body: [170, 100], bodyDecay: 44, decay: 34, noise: 5.2, thump: .7, seed: 5})
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

/** v7.0.17: PCM for one allied bow / crossbow shot: a short round "pon" (two-pole low-passed noise plus a quickly falling
 *  soft thump, fast decay, no sustained pitch). The commander keeps the shared engine's bow / crossbow clips. */
export function synthesizeAllyRangedSound(style, rate = 44100) {
  const spec = ALLY_RANGED_SYNTH[style]; if (!spec) return null;
  const n = Math.round(spec.duration * rate), out = new Float32Array(n), noise = rng(spec.seed * 7919 + 31);
  const a = 1 - Math.exp(-2 * Math.PI * spec.cut / rate);   // two identical one-pole stages (12 dB / octave)
  let lp = 0, lp2 = 0, phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / rate, w = noise();
    lp += (w - lp) * a; lp2 += (lp - lp2) * a;
    const rise = Math.min(1, t / .004);
    phase += 2 * Math.PI * (spec.body[1] + (spec.body[0] - spec.body[1]) * Math.exp(-t * 60)) / rate;
    out[i] = rise * (lp2 * spec.noise * Math.exp(-t * spec.decay) + Math.sin(phase) * spec.thump * Math.exp(-t * spec.bodyDecay));
  }
  let peak = 0; for (const v of out) peak = Math.max(peak, Math.abs(v));
  const fade = Math.min(n, Math.round(rate * .012)), scale = peak > 0 ? .9 / peak : 0;
  for (let i = 0; i < n; i++) out[i] *= scale * (i >= n - fade ? (n - i) / fade : 1);
  return out;
}

const buffers = new Map(), lastPlayed = new Map(), voices = new Set();
const lastAlly = new Map(), allyVoices = new Set();
const allyPools = {melee: allyVoices, bow: new Set(), cannon: new Set(), magic: new Set(), impact: new Set()};
let allyLog = [];
let bufferContext = null;
function bufferFor(c, style) {
  if (bufferContext !== c) { buffers.clear(); bufferContext = c; }
  if (!buffers.has(style)) {
    const pcm = SPEC[style] ? synthesizeMeleeSound(style, c.sampleRate) : synthesizeAllyRangedSound(style, c.sampleRate);
    const buffer = c.createBuffer(1, pcm.length, c.sampleRate);
    buffer.getChannelData(0).set(pcm); buffers.set(style, buffer);
  }
  return buffers.get(style);
}
/** Clears throttle / voice bookkeeping (tests, audio context changes). */
export function resetMeleeSoundState() {
  for (const pool of [voices, ...Object.values(allyPools)]) for (const v of [...pool]) v.release();
  voices.clear(); lastPlayed.clear(); lastAlly.clear(); buffers.clear(); bufferContext = null; allyLog = [];
}
export const resetWeaponSoundState = resetMeleeSoundState;

function startVoice(c, buffer, volume, pan, rateBase, pool, maxDuration = 0) {
  try {
    const source = c.createBufferSource(), gain = c.createGain(), panner = c.createStereoPanner?.();
    source.buffer = buffer; source.playbackRate.value = rateBase + Math.random() * .12;
    gain.gain.value = Math.min(1, volume); source.connect(gain);
    if (panner) { panner.pan.value = pan; gain.connect(panner); panner.connect(sound.effects); } else gain.connect(sound.effects);
    const voice = {source, release: () => { if (!pool.delete(voice)) return; source.disconnect(); gain.disconnect(); panner?.disconnect(); }};
    pool.add(voice); source.onended = voice.release;
    if (maxDuration > 0 && buffer.duration > maxDuration) {
      // Shortened version of a long clip: cut it after maxDuration with a quick fade so there is no click.
      const t0 = c.currentTime, v = Math.min(1, volume);
      gain.gain.setValueAtTime?.(v, t0 + Math.max(0, maxDuration - .06)); gain.gain.linearRampToValueAtTime?.(0, t0 + maxDuration);
      source.start(0, 0, maxDuration);
    } else source.start();
    return voice;
  } catch { return null; }
}

function soundEnabled(c) {
  return !!c && c.state === 'running' && !!sound.effects && !sound.isMuted && !sound.pageHidden && !!sound.effectVolume;
}
function pruneAllyLog(now) { allyLog = allyLog.filter(t => t <= now && now - t < 1); }
/** Volume factor for allied sounds: x1.0 when quiet, down to ALLY_BUDGET.crowdMinScale when many allied sounds just played. */
export function allyCrowdScale(now) {
  pruneAllyLog(now);
  const n = allyLog.filter(t => now - t < ALLY_BUDGET.crowdWindow).length;
  return 1 - (1 - ALLY_BUDGET.crowdMinScale) * Math.min(1, n / ALLY_BUDGET.crowdFull);
}
function allyBudgetAllows(role, now) {
  pruneAllyLog(now);
  return allyLog.length < ALLY_BUDGET.perSecond && allyLog.length < ALLY_BUDGET.roleLimit[role];
}
/** Number of allied sounds started in the last second (tests, diagnostics). */
export function allySoundsInLastSecond() { const c = sound.ctx; if (!c) return 0; pruneAllyLog(c.currentTime); return allyLog.length; }

/** One allied sound: needs a known position within ALLY_SOUND.hearing of the listener, one shared gap per `key` (a nearer ally may
 *  cut it short), a free slot in its own small pool, and room in the allied budget. Returns true when a voice started. */
function playAlly({role, key, pool, maxVoices, gap, volume, buffer, x, y, rate, maxDuration = 0}) {
  const c = sound.ctx;
  if (!soundEnabled(c) || !buffer || !Number.isFinite(x) || !Number.isFinite(y)) return false;
  const listener = sound.spatialListener?.(); if (!listener) return false;
  const distance = Math.hypot(x - listener.x, y - listener.y); if (!(distance < ALLY_SOUND.hearing)) return false;
  const now = c.currentTime, last = lastAlly.get(key), since = last ? now - last.time : Infinity;
  if (since < gap && !(since >= gap / 2 && distance < last.distance * ALLY_SOUND.nearBias)) return false;
  if (allyPools[pool].size >= maxVoices) return false;
  if (!allyBudgetAllows(role, now)) return false;
  const level = volume * Math.pow(1 - distance / ALLY_SOUND.hearing, ALLY_SOUND.falloff) * allyCrowdScale(now);
  const pan = Math.max(-.6, Math.min(.6, (x - listener.x) / 400));
  if (!startVoice(c, buffer, level, pan, rate, allyPools[pool], maxDuration)) return false;
  lastAlly.set(key, {time: now, distance}); allyLog.push(now);
  return true;
}

/** Plays the hit sound of a melee weapon style. Returns false when silent or throttled.
 *  `fromPlayer: false` marks an allied soldier's hit (quieter, sparser, nearby only); strong hits always count as the commander's. */
export function playMeleeSound(style, x = null, y = null, {strong = false, fromPlayer = true} = {}) {
  const spec = SPEC[style], c = sound.ctx;
  if (!spec || !soundEnabled(c)) return false;
  const now = c.currentTime, listener = Number.isFinite(x) && Number.isFinite(y) ? sound.spatialListener?.() : null;
  if (!fromPlayer && !strong) {
    return playAlly({role: 'melee', key: style, pool: 'melee', maxVoices: ALLY_SOUND.maxVoices, gap: ALLY_SOUND.gap,
      volume: spec.volume * ALLY_SOUND.volume, buffer: bufferFor(c, style), x, y, rate: .94});
  }
  if (!strong && now - (lastPlayed.get(style) ?? -Infinity) < spec.gap) return false;
  if (voices.size >= MAX_VOICES) { if (!strong) return false; const old = voices.values().next().value; try { old.source.stop(); } catch { /* ended */ } old.release(); }
  let volume = spec.volume * (strong ? 1.15 : 1), pan = 0;
  if (listener) {
    const distance = Math.hypot(x - listener.x, y - listener.y); if (distance >= HEARING) return false;
    volume *= Math.pow(1 - distance / HEARING, .7); pan = Math.max(-.7, Math.min(.7, (x - listener.x) / 550));
  }
  if (!startVoice(c, bufferFor(c, style), volume, pan, strong ? .9 : .94, voices)) return false;
  lastPlayed.set(style, now);
  return true;
}

/** Plays a ranged shot (bow / crossbow / cannon / stone). The commander (`fromPlayer`, the default) goes to the shared engine exactly as
 *  before. An allied soldier's shot is quiet, spaced per style, nearby only and uses its own voices. */
export function playRangedSound(style, x, y, {fromPlayer = true} = {}) {
  if (fromPlayer) return sound.playWeapon(style, x, y);
  const key = RANGED_ALLY_SOUND.pool[style] ? style : 'bow', c = sound.ctx;
  if (!soundEnabled(c)) return false;
  const pool = RANGED_ALLY_SOUND.pool[key];
  const buffer = key === 'bow' || key === 'crossbow' ? bufferFor(c, key) : sound.buffers?.get(key);
  return playAlly({role: 'ranged', key, pool, maxVoices: RANGED_ALLY_SOUND.voices[pool], gap: RANGED_ALLY_SOUND.gap[key],
    volume: ENGINE_VOLUME[key] * RANGED_ALLY_SOUND.volume[key], buffer, x, y, rate: .96, maxDuration: RANGED_ALLY_SOUND.maxDuration[key] || 0});
}

/** Plays a spell cast. The commander goes to sound.playMagic as before; allied casters (including the medic's smite) are quiet,
 *  one shared gap, nearby only, and the long clips are cut to MAGIC_ALLY_SOUND.maxDuration. */
export function playMagicSound(affinity, x, y, {fromPlayer = true} = {}) {
  if (fromPlayer) return sound.playMagic(affinity, x, y);
  return playAlly({role: 'magic', key: 'magic', pool: 'magic', maxVoices: MAGIC_ALLY_SOUND.maxVoices, gap: MAGIC_ALLY_SOUND.gap,
    volume: ENGINE_VOLUME.magic * MAGIC_ALLY_SOUND.volume, buffer: sound.buffers?.get(MAGIC_CLIPS[affinity] || 'heal'), x, y, rate: .96,
    maxDuration: MAGIC_ALLY_SOUND.maxDuration});
}

/** Plays the hit sound of a ranged / magic attack. The commander goes to sound.playImpact as before; allied hits are quiet,
 *  at most one every IMPACT_ALLY_SOUND.gap seconds, one voice, nearby only. */
export function playImpactSound(style, x, y, {fromPlayer = true} = {}) {
  if (fromPlayer) return sound.playImpact(style, x, y);
  const clip = ['sword', 'spear', 'axe'].includes(style) ? 'metal' : style === 'hammer' ? 'hammer' : 'hit';
  return playAlly({role: 'impact', key: 'impact', pool: 'impact', maxVoices: IMPACT_ALLY_SOUND.maxVoices, gap: IMPACT_ALLY_SOUND.gap,
    volume: ENGINE_VOLUME.impact * IMPACT_ALLY_SOUND.volume, buffer: sound.buffers?.get(clip), x, y, rate: .96,
    maxDuration: IMPACT_ALLY_SOUND.maxDuration});
}
