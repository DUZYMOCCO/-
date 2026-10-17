import { mkdirSync, writeFileSync } from 'node:fs';
import { createNibbleSamples } from '../js/soft-audio.js';

const rate = 44100, sample = createNibbleSamples(rate);
const pcm = new Float32Array(rate * 3);
for (let start = .15; start < 2.8; start += .3) {
  const offset = Math.round(start * rate);
  for (let i = 0; i < sample.length; i++) pcm[offset + i] = sample[i] * .65;
}
const wav = Buffer.alloc(44 + pcm.length * 2);
wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28); wav.writeUInt16LE(2, 32);
wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(pcm.length * 2, 40);
for (let i = 0; i < pcm.length; i++) wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, pcm[i])) * 32767), 44 + i * 2);
const out = 'color-ants/docs/validation/v2.7.0'; mkdirSync(out, { recursive: true });
writeFileSync(`${out}/soft-nibble-preview.wav`, wav);
console.log(`${out}/soft-nibble-preview.wav`);
