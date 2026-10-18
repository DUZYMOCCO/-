// Two tiny liquid chirps: "chopi-chopi", with room to breathe between phrases.
// Three cached variations; timing uses the audio clock, never the ant count or game speed.
export const NIBBLE_GAP = .52;
export const NIBBLE_REST = .98;
export const NIBBLE_DURATION = .185;
export const NIBBLE_NAME = 'color-ants-chopi-v1';
export const NIBBLE_NAMES = [NIBBLE_NAME, `${NIBBLE_NAME}-1`, `${NIBBLE_NAME}-2`];
export const NIBBLE_GROUP = 'color-ants-nibble';
const phrases = new WeakMap();
const pitches = [1, .965, 1.025];

export function createNibbleSamples(sampleRate, variation = 0) {
  const samples = new Float32Array(Math.ceil(sampleRate * NIBBLE_DURATION));
  const pitch = pitches[variation % pitches.length];
  for (const [start, duration, base, bend, gain] of [
    [.005, .058, 490, 420, .115],
    [.098, .061, 540, 350, .097],
  ]) {
    const first = Math.ceil(start * sampleRate), last = Math.floor((start + duration) * sampleRate);
    for (let i = first; i <= last; i++) {
      const t = i / sampleRate - start, u = t / duration;
      const phase = 2 * Math.PI * pitch * (base * t + bend * duration / Math.PI * (1 - Math.cos(Math.PI * u)));
      const envelope = Math.sin(Math.PI * u) ** 2;
      samples[i] = gain * envelope * (.96 * Math.sin(phase) + .04 * Math.sin(2 * phase));
    }
  }
  return samples;
}

export function playNibble(sound) {
  const ctx = sound.ctx;
  if (!ctx || ctx.state !== 'running' || sound.isMuted || sound.pageHidden || !sound.effectVolume) return false;
  const now = ctx.currentTime;
  let phrase = phrases.get(sound);
  if (!phrase || phrase.ctx !== ctx) phrase = { ctx, nextAt: -Infinity, lastAt: -Infinity, count: 0, variation: 0 };
  if (now < phrase.nextAt) return false;
  if (now - phrase.lastAt > NIBBLE_REST + .25) phrase.count = 0;
  const name = NIBBLE_NAMES[phrase.variation];
  let buffer = sound.buffers.get(name);
  if (!buffer || buffer.sampleRate !== ctx.sampleRate) {
    const samples = createNibbleSamples(ctx.sampleRate, phrase.variation);
    buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
    buffer.getChannelData(0).set(samples);
    sound.buffers.set(name, buffer);
  }
  const played = sound.play(name, { group: NIBBLE_GROUP, gap: NIBBLE_GAP, volume: phrase.count ? .43 : .55 });
  if (played) {
    phrase.count = (phrase.count + 1) % 3;
    // Sample creation can take an audio quantum; measure the gap after playback actually starts.
    phrase.lastAt = ctx.currentTime;
    phrase.nextAt = phrase.lastAt + (phrase.count ? NIBBLE_GAP : NIBBLE_REST);
    phrase.variation = (phrase.variation + 1) % NIBBLE_NAMES.length;
    phrases.set(sound, phrase);
  }
  return played;
}

export function stopNibbles(sound) {
  for (const voice of [...sound.voices]) if (voice.group === NIBBLE_GROUP) sound.retire(voice);
  phrases.delete(sound);
  for (const name of NIBBLE_NAMES) sound.lastPlayed.delete(`${NIBBLE_GROUP}:${name}`);
}
