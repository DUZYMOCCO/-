// Procedural combat impacts live here so synthesized sounds can later be
// replaced by recorded samples without changing combat event handling.
export function hitSoundKind(fx) {
  if (['blunt', 'slash', 'clack', 'body'].includes(fx?.soundKind)) return fx.soundKind;
  if (['block', 'parry', 'reflect'].includes(fx?.type)) return 'clack';
  if (['break', 'daze'].includes(fx?.type)) return 'body';
  return 'blunt';
}

function burstNoise(audio, output, t, duration, { frequency, q = 0.7, gain = 0.12, delay = 0 } = {}) {
  const length = Math.max(1, Math.floor(audio.sampleRate * duration));
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;

  const source = audio.createBufferSource();
  const filter = audio.createBiquadFilter();
  const envelope = audio.createGain();
  source.buffer = buffer;
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(frequency, t + delay);
  filter.Q.setValueAtTime(q, t + delay);
  envelope.gain.setValueAtTime(0.0001, t + delay);
  envelope.gain.linearRampToValueAtTime(gain, t + delay + 0.006);
  envelope.gain.exponentialRampToValueAtTime(0.0001, t + delay + duration);
  source.connect(filter);
  filter.connect(envelope);
  envelope.connect(output);
  source.start(t + delay);
  source.stop(t + delay + duration + 0.005);
}

function thump(audio, output, t, amount, pitch) {
  const osc = audio.createOscillator();
  const envelope = audio.createGain();
  const startHz = (amount === 'body' ? 78 : 98) * pitch;
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(startHz, t);
  osc.frequency.exponentialRampToValueAtTime(startHz * 0.52, t + 0.095);
  envelope.gain.setValueAtTime(0.0001, t);
  envelope.gain.linearRampToValueAtTime(amount === 'body' ? 0.22 : 0.19, t + 0.004);
  envelope.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  osc.connect(envelope);
  envelope.connect(output);
  osc.start(t);
  osc.stop(t + 0.17);
}

export function playImpactSound(audio, kind, t, output, random = Math.random) {
  if (!audio || !output) return;
  const pitch = 0.92 + random() * 0.16;
  const volume = 0.88 + random() * 0.22;
  const level = audio.createGain();
  level.gain.setValueAtTime(volume, t);
  level.connect(output);

  if (kind === 'clack') {
    burstNoise(audio, level, t, 0.075, { frequency: 1250 * pitch, q: 1.25, gain: 0.19 });
    burstNoise(audio, level, t, 0.045, { frequency: 620 * pitch, q: 1.1, gain: 0.11, delay: 0.012 });
    return;
  }

  thump(audio, level, t, kind === 'body' ? 'body' : 'blunt', pitch);
  if (kind === 'slash') {
    burstNoise(audio, level, t, 0.085, { frequency: 2100 * pitch, q: 0.55, gain: 0.09, delay: 0.004 });
  } else {
    burstNoise(audio, level, t, 0.065, { frequency: 210 * pitch, q: 0.55, gain: 0.09, delay: 0.002 });
  }
}
