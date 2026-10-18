import test from 'node:test';
import assert from 'node:assert/strict';
import { createNibbleSamples, playNibble, stopNibbles, NIBBLE_DURATION, NIBBLE_GAP, NIBBLE_REST, NIBBLE_NAMES, NIBBLE_GROUP } from '../js/soft-audio.js';

function mixer() {
  const calls = [], voices = new Set();
  let allocations = 0;
  const sound = {
    ctx: { state: 'running', sampleRate: 48000, currentTime: 0, createBuffer: (_channels, n, sampleRate) => {
      allocations++; const data = new Float32Array(n); return { sampleRate, getChannelData: () => data };
    } },
    buffers: new Map(), voices, lastPlayed: new Map(), isMuted: false, pageHidden: false, effectVolume: .65,
    play(name, options) { calls.push({ at: sound.ctx.currentTime, name, ...options }); return true; },
    retire(voice) { voices.delete(voice); },
  };
  return { sound, calls, allocations: () => allocations };
}

test('chopi PCM has two separated, smooth, quiet liquid chirps without a harsh high end', () => {
  for (const rate of [44100, 48000]) for (let variant = 0; variant < NIBBLE_NAMES.length; variant++) {
    const samples = createNibbleSamples(rate, variant);
    assert.equal(samples.length, Math.ceil(rate * NIBBLE_DURATION));
    assert.equal(samples[0], 0); assert.equal(samples.at(-1), 0);
    const peak = Math.max(...samples.map(Math.abs));
    assert(peak > .03 && peak < .12, `peak ${peak}`);
    assert(samples.every(Number.isFinite));
    let largestJump = 0, pulses = 0, active = false;
    const window = Math.round(rate * .005);
    for (let i = 0; i < samples.length; i++) {
      if (i) largestJump = Math.max(largestJump, Math.abs(samples[i] - samples[i - 1]));
      if (i % window === 0) {
        const rms = Math.sqrt(samples.slice(i, i + window).reduce((sum, v) => sum + v * v, 0) / window);
        const next = rms > .008;
        if (next && !active) pulses++;
        active = next;
      }
    }
    assert.equal(pulses, 2, 'chopi-chopi must have a silent gap inside');
    assert(largestJump < .02, `click-like jump ${largestJump}`);
    let low = 0, high = 0;
    for (let hz = 50; hz <= 6000; hz += 50) {
      let re = 0, im = 0;
      for (let i = 0; i < samples.length; i++) {
        const phase = 2 * Math.PI * hz * i / rate;
        re += samples[i] * Math.cos(phase); im += samples[i] * Math.sin(phase);
      }
      const energy = re * re + im * im;
      if (hz <= 1200) low += energy;
      if (hz >= 2000) high += energy;
    }
    assert(high / low < .003, `high-frequency ratio ${high / low}`);
  }
});

test('continuous eating cannot stack sounds and includes a longer rest after three pairs', () => {
  const { sound, calls, allocations } = mixer();
  for (let frame = 0; frame < 500; frame++) {
    sound.ctx.currentTime = frame / 100;
    // Many ants and 2x game speed must not increase the audio rate.
    for (let ant = 0; ant < 20; ant++) playNibble(sound);
  }
  assert(calls.length >= 6 && calls.length <= 9, `${calls.length} pairs in 5 seconds`);
  assert.equal(allocations(), 3, 'subsequent nibbles reuse the three cached variations');
  let rests = 0;
  for (let i = 1; i < calls.length; i++) {
    const gap = calls[i].at - calls[i - 1].at;
    assert(gap + 1e-9 >= NIBBLE_GAP && gap > NIBBLE_DURATION, `overlapping/dense pair: ${gap}`);
    if (gap + 1e-9 >= NIBBLE_REST) rests++;
  }
  assert(rests >= 2, 'continuous chewing must leave breathing room');
  assert(calls.every(c => c.volume <= .55 && c.group === NIBBLE_GROUP));
  assert(calls[1].volume < calls[0].volume, 'sustained eating should be quieter');
  assert.equal(new Set(calls.map(c => c.name)).size, 3);
});

test('nibbles honor mute, hidden state and shared effects volume without queuing missed audio', () => {
  const { sound, calls, allocations } = mixer();
  for (const key of ['isMuted', 'pageHidden']) {
    sound[key] = true; assert.equal(playNibble(sound), false); sound[key] = false;
  }
  sound.effectVolume = 0; assert.equal(playNibble(sound), false);
  sound.effectVolume = .65;
  sound.ctx.state = 'suspended'; assert.equal(playNibble(sound), false);
  assert.equal(allocations(), 0);
  sound.ctx.state = 'running'; assert.equal(playNibble(sound), true);
  assert.equal(calls.length, 1, 'unmuting must not replay all the missed bites');
});

test('first-use sample creation time cannot shorten the audible gap', () => {
  const { sound } = mixer();
  const allocate = sound.ctx.createBuffer;
  sound.ctx.createBuffer = (...args) => { sound.ctx.currentTime += .03; return allocate(...args); };
  assert.equal(playNibble(sound), true);
  sound.ctx.currentTime = NIBBLE_GAP;
  assert.equal(playNibble(sound), false, 'cooldown must start at playback, after sample creation');
  sound.ctx.currentTime = NIBBLE_GAP + .031;
  assert.equal(playNibble(sound), true);
});

test('retry or exit only stops Color Ants voices and immediately resets its phrase', () => {
  const { sound, calls } = mixer();
  const ours = { group: NIBBLE_GROUP }, other = { group: 'ui' };
  sound.voices.add(ours); sound.voices.add(other);
  playNibble(sound);
  sound.lastPlayed.set(`${NIBBLE_GROUP}:${NIBBLE_NAMES[0]}`, 0);
  sound.lastPlayed.set('ui:tap', 0);
  stopNibbles(sound);
  assert.deepEqual([...sound.voices], [other]);
  assert.deepEqual([...sound.lastPlayed.keys()], ['ui:tap']);
  assert.equal(playNibble(sound), true, 'a new stage need not wait for the old cooldown');
  assert.equal(calls[1].name, NIBBLE_NAMES[0]);
});

test('a replacement AudioContext starts a fresh phrase and rebuilds buffers at its sample rate', () => {
  const { sound, allocations } = mixer();
  playNibble(sound);
  sound.ctx = { ...sound.ctx, currentTime: 0, sampleRate: 44100 };
  assert.equal(playNibble(sound), true);
  assert.equal(allocations(), 2);
  assert.equal(sound.buffers.get(NIBBLE_NAMES[0]).sampleRate, 44100);
});
