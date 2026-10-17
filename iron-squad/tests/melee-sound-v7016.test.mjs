// v7.0.16: allied soldiers' melee hit sounds are quieter, sparser and nearby-only; the commander's stay as before; the spear is soft.
import test from 'node:test';
import assert from 'node:assert/strict';
import {sound} from '../../common/js/audio.js?v=151';
import {synthesizeMeleeSound, playMeleeSound, resetMeleeSoundState, ALLY_SOUND, MELEE_SOUND_STYLES} from '../js/weapon-sounds.js';

function fakeContext() {
  const started = [];
  const node = () => ({connect() {}, disconnect() {}, gain: {value: 1}, pan: {value: 0}});
  const c = {
    currentTime: 100, state: 'running', sampleRate: 22050,
    createBuffer: (ch, n) => ({getChannelData: () => new Float32Array(n)}),
    createGain: node, createStereoPanner: node,
    createBufferSource() { const s = {buffer: null, playbackRate: {value: 1}, connect() {}, disconnect() {}, stop() { s.stopped = true; s.onended?.(); }, start() { started.push(s); }}; s.gainNode = null; return s; }
  };
  c.started = started; return c;
}
function setup() {
  resetMeleeSoundState();
  const c = fakeContext(); let gains = [];
  const origGain = c.createGain; c.createGain = () => { const g = origGain(); gains.push(g); return g; };
  Object.assign(sound, {ctx: c, effects: {}, isMuted: false, pageHidden: false, effectVolume: .65, spatialListener: () => ({x: 0, y: 0})});
  return {c, gains: () => gains};
}
const advance = (c, s) => { c.currentTime += s; };
const hit = (style, x, y, opt) => playMeleeSound(style, x, y, opt);

test('commander hits keep the original spacing, loudness and 850 range', () => {
  const {c, gains} = setup();
  assert.equal(hit('spear', 100, 0), true);
  assert.equal(hit('spear', 100, 0), false, 'same-style gap (.06s) still applies');
  advance(c, .061); assert.equal(hit('spear', 100, 0), true);
  advance(c, .061); assert.equal(hit('spear', 800, 0), true, 'the commander can still hit things 800px away');
  assert.equal(hit('sword', 860, 0), false, 'beyond 850 is silent');
  assert.equal(c.started.length, 3);
  const g = gains()[0].gain.value, expected = .5 * Math.pow(1 - 100 / 850, .7);
  assert.ok(Math.abs(g - expected) < 1e-9, `commander volume unchanged (${g} vs ${expected})`);
  advance(c, 1); const before = c.started.length;
  assert.equal(hit('spear', 100, 0, {fromPlayer: true}), true); assert.equal(c.started.length, before + 1);
});

test('allied soldier hits: quieter, one shared gap per style, nearby only', () => {
  const {c, gains} = setup();
  assert.equal(ALLY_SOUND.gap >= .25 && ALLY_SOUND.hearing <= 450 && ALLY_SOUND.volume <= .5, true);
  assert.equal(hit('spear', 200, 0, {fromPlayer: false}), true);
  const g = gains()[0].gain.value, loud = .5 * Math.pow(1 - 200 / 850, .7);
  assert.ok(g < loud * .4, `ally volume ${g} is far below the commander's ${loud}`);
  assert.ok(Math.abs(g - .5 * ALLY_SOUND.volume * Math.pow(1 - 200 / 450, 1.4)) < 1e-9, 'ally volume formula');
  assert.equal(hit('spear', 210, 0, {fromPlayer: false}), false, 'a second ally hit right away is dropped (shared gap)');
  advance(c, .2); assert.equal(hit('spear', 220, 0, {fromPlayer: false}), false, 'still inside .25s');
  advance(c, .06); assert.equal(hit('spear', 220, 0, {fromPlayer: false}), true, 'after .25s it plays again');
  for (const v of c.started) v.onended?.();
  assert.equal(hit('sword', 300, 0, {fromPlayer: false}), true, 'the gap is per style (a different style still plays)');
});

test('allied soldiers far from the listener are silent; unknown position is silent', () => {
  const {c} = setup();
  assert.equal(hit('axe', 460, 0, {fromPlayer: false}), false, 'beyond the 450px ally range');
  assert.equal(hit('axe', 300, 400, {fromPlayer: false}), false, 'distance uses both axes (500px)');
  assert.equal(hit('axe', null, null, {fromPlayer: false}), false, 'no position: cannot prove it is near, so silent');
  assert.equal(hit('axe', 440, 0, {fromPlayer: false}), true, 'just inside the range plays (very quiet)');
  sound.spatialListener = null; advance(c, 1);
  assert.equal(hit('axe', 10, 10, {fromPlayer: false}), false, 'no listener: silent');
  assert.equal(hit('axe', 10, 10), true, 'the commander never needs a listener');
});

test('a nearer ally may cut the gap short; a farther one may not', () => {
  const {c} = setup();
  assert.equal(hit('sword', 400, 0, {fromPlayer: false}), true);
  advance(c, .13); assert.equal(hit('sword', 380, 0, {fromPlayer: false}), false, 'similar distance: wait for the full gap');
  assert.equal(hit('sword', 150, 0, {fromPlayer: false}), true, 'much nearer after half the gap: allowed');
  advance(c, .13); assert.equal(hit('sword', 400, 0, {fromPlayer: false}), false);
});

test('allied voices are a small separate pool: capped, never stealing the commander\'s voices', () => {
  const {c} = setup();
  const ally = ['sword', 'spear', 'axe', 'hammer'].map(s => hit(s, 100, 0, {fromPlayer: false}));
  assert.equal(ally.filter(Boolean).length, ALLY_SOUND.maxVoices, `at most ${ALLY_SOUND.maxVoices} ally voices at once`);
  assert.ok(ALLY_SOUND.maxVoices <= 3);
  // The commander still gets its full 6 voices (hammer is long, so voices pile up) and strong hits are never dropped.
  let player = 0; for (let i = 0; i < 6; i++) { if (hit('hammer', 50, 0)) player++; advance(c, .11); }
  assert.equal(player, 6, 'six commander voices alongside the ally voices');
  assert.equal(hit('hammer', 50, 0), false, 'the commander pool is full for normal hits');
  assert.equal(hit('hammer', 50, 0, {strong: true}), true, 'strong hits still cut in');
  assert.equal(hit('spear', 50, 0, {strong: true, fromPlayer: false}), true, 'strong hits keep the commander treatment even from a soldier');
  advance(c, 1);
  for (const s of c.started) s.onended?.();
  assert.equal(hit('spear', 100, 0, {fromPlayer: false}), true, 'ally voices are released when they end');
});

test('mute / page hidden / zero volume / no context stay silent for everyone', () => {
  const {c} = setup();
  sound.isMuted = true; assert.equal(hit('sword', 10, 0), false); assert.equal(hit('sword', 10, 0, {fromPlayer: false}), false);
  sound.isMuted = false; sound.pageHidden = true; assert.equal(hit('sword', 10, 0), false); assert.equal(hit('sword', 10, 0, {fromPlayer: false}), false);
  sound.pageHidden = false; sound.effectVolume = 0; assert.equal(hit('sword', 10, 0), false);
  sound.effectVolume = .65; c.state = 'suspended'; assert.equal(hit('sword', 10, 0), false);
  c.state = 'running'; assert.equal(hit('sword', 10, 0), true);
});

test('spear sound is soft: longer, rounder, far less high-frequency energy, no click', () => {
  const rate = 44100, spear = synthesizeMeleeSound('spear', rate), sword = synthesizeMeleeSound('sword', rate);
  const diffRatio = d => { let a = 0, b = 0; for (let i = 1; i < d.length; i++) { a += (d[i] - d[i - 1]) ** 2; b += d[i] ** 2; } return a / b; };
  // v7.0.15 measured 0.157 (44.1 kHz, about 14% of the energy above 2 kHz); the soft spear is about 0.017.
  assert.ok(diffRatio(spear) < .03, `spear first-difference ratio ${diffRatio(spear)} (old ~0.157)`);
  assert.ok(diffRatio(spear) * 20 < diffRatio(sword), 'far duller than the bright sword');
  assert.ok(Math.abs(spear.length / rate - .11) < .002, 'length about .11s');
  assert.ok(Math.abs(spear[0]) < .02 && Math.abs(spear.at(-1)) < 1e-3, 'soft start and end (no click)');
  let rise = 0; while (Math.abs(spear[rise]) < .5 * .9 && rise < spear.length) rise++;
  assert.ok(rise / rate > .003, 'gentle rise: about 3 ms or more to half peak');
  const peak = Math.max(...spear.map(Math.abs)); assert.ok(peak > .85 && peak <= .9001);
  // The other styles are untouched (same lengths as before).
  assert.deepEqual(MELEE_SOUND_STYLES.map(s => synthesizeMeleeSound(s, 44100).length), [Math.round(.11 * 44100), Math.round(.11 * 44100), Math.round(.26 * 44100), Math.round(.55 * 44100)]);
});