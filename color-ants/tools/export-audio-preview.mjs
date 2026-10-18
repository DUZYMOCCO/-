import { mkdirSync, writeFileSync } from 'node:fs';
import { playNibble } from '../js/soft-audio.js';

const rate = 44100, pcm = new Float32Array(rate * 6);
const sound = {
  ctx: { state: 'running', sampleRate: rate, currentTime: 0, createBuffer: (_channels, n, sampleRate) => {
    const data = new Float32Array(n); return { sampleRate, getChannelData: () => data };
  } },
  buffers: new Map(), effectVolume: .65,
  play(name, { volume }) {
    const sample = this.buffers.get(name).getChannelData(0), offset = Math.round(this.ctx.currentTime * rate);
    // Match the game's default shared effects/master gain; no normalization.
    for (let i = 0; i < sample.length && offset + i < pcm.length; i++) pcm[offset + i] += sample[i] * volume * .65 * .85;
    return true;
  },
};
for (let frame = 15; frame < 570; frame++) {
  sound.ctx.currentTime = frame / 100;
  playNibble(sound);
}
const wav = Buffer.alloc(44 + pcm.length * 2);
wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28); wav.writeUInt16LE(2, 32);
wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(pcm.length * 2, 40);
for (let i = 0; i < pcm.length; i++) wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, pcm[i])) * 32767), 44 + i * 2);
const out = 'color-ants/docs/validation/v2.7.1'; mkdirSync(out, { recursive: true });
writeFileSync(`${out}/chopi-preview.wav`, wav);
console.log(`${out}/chopi-preview.wav`);
