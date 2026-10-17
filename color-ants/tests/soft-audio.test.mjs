import test from 'node:test';
import assert from 'node:assert/strict';
import { createNibbleSamples, playNibble, stopNibbles, NIBBLE_DURATION, NIBBLE_GAP, NIBBLE_GROUP } from '../js/soft-audio.js';

test('nibble PCM has quiet rounded edges and very little high-frequency energy', () => {
  for (const rate of [44100, 48000]) {
    const samples = createNibbleSamples(rate);
    assert.equal(samples.length, Math.ceil(rate * NIBBLE_DURATION));
    assert.equal(samples[0], 0); assert(Math.abs(samples.at(-1)) < 1e-7);
    const peak = Math.max(...samples.map(Math.abs));
    assert(peak > .03 && peak < .15, `peak ${peak}`);
    assert(samples.every(Number.isFinite));
    let largestJump = 0;
    for (let i = 1; i < samples.length; i++) largestJump = Math.max(largestJump, Math.abs(samples[i] - samples[i - 1]));
    assert(largestJump < .01, `click-like jump ${largestJump}`);
    let low = 0, high = 0;
    for (let hz = 50; hz <= 6000; hz += 50) {
      let re = 0, im = 0;
      for (let i = 0; i < samples.length; i++) {
        const phase = 2 * Math.PI * hz * i / rate;
        re += samples[i] * Math.cos(phase); im += samples[i] * Math.sin(phase);
      }
      const energy = re * re + im * im;
      if (hz <= 1000) low += energy;
      if (hz >= 2000) high += energy;
    }
    assert(high / low < .001, `high-frequency ratio ${high / low}`);
  }
});

test('nibbles reuse one sample and honor mute, hidden state and shared effects volume', () => {
  let allocations = 0;
  const calls = [];
  const sound = {
    ctx: { state: 'running', sampleRate: 48000, createBuffer: (_channels, n, sampleRate) => {
      allocations++; const data = new Float32Array(n); return { sampleRate, getChannelData: () => data };
    } },
    buffers: new Map(), isMuted: false, pageHidden: false, effectVolume: .65,
    play: (name, options) => { calls.push({ name, ...options }); return true; },
  };
  playNibble(sound); playNibble(sound);
  assert.equal(allocations, 1);
  assert.equal(calls[0].gap, NIBBLE_GAP);
  assert(NIBBLE_GAP > NIBBLE_DURATION, 'continuous chewing must not stack samples');
  assert(calls.every(c => c.volume < 1 && c.group === NIBBLE_GROUP));
  for (const key of ['isMuted', 'pageHidden']) {
    sound[key] = true; assert.equal(playNibble(sound), false); sound[key] = false;
  }
  sound.effectVolume = 0; assert.equal(playNibble(sound), false);
  assert.equal(calls.length, 2);
});

test('leaving Color Ants only stops its own short nibble voices', () => {
  const ours = { group: NIBBLE_GROUP }, other = { group: 'ui' }, stopped = [];
  stopNibbles({ voices: new Set([ours, other]), retire: v => stopped.push(v) });
  assert.deepEqual(stopped, [ours]);
});
