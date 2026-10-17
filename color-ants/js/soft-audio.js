// Rounded, low-pitched nibble. One cached sample; no per-ant synthesis.
export const NIBBLE_GAP = .18;
export const NIBBLE_DURATION = .14;
export const NIBBLE_NAME = 'color-ants-soft-nibble';
export const NIBBLE_GROUP = 'color-ants-nibble';

export function createNibbleSamples(sampleRate) {
  const samples = new Float32Array(Math.ceil(sampleRate * NIBBLE_DURATION));
  for (let i = 0; i < samples.length; i++) {
    const t = i / sampleRate, u = i / (samples.length - 1);
    const phase = Math.PI * 2 * (360 * t - 140 * t * t / (2 * NIBBLE_DURATION));
    const attack = 1 - Math.exp(-t / .010);
    const release = Math.exp(-t / .040) * (.5 + .5 * Math.cos(Math.PI * u));
    samples[i] = .26 * attack * release * (.88 * Math.sin(phase) + .12 * Math.sin(phase * 1.5));
  }
  return samples;
}

export function playNibble(sound) {
  const ctx = sound.ctx;
  if (!ctx || ctx.state !== 'running' || sound.isMuted || sound.pageHidden || !sound.effectVolume) return false;
  let buffer = sound.buffers.get(NIBBLE_NAME);
  if (!buffer || buffer.sampleRate !== ctx.sampleRate) {
    const samples = createNibbleSamples(ctx.sampleRate);
    buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
    buffer.getChannelData(0).set(samples);
    sound.buffers.set(NIBBLE_NAME, buffer);
  }
  return sound.play(NIBBLE_NAME, { group: NIBBLE_GROUP, gap: NIBBLE_GAP, volume: .65 });
}

export function stopNibbles(sound) {
  for (const voice of [...sound.voices]) if (voice.group === NIBBLE_GROUP) sound.retire(voice);
}
