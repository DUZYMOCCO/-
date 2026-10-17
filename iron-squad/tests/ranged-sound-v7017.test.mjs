// v7.0.17: allied ranged shots, magic casts and ranged / magic hit sounds are quiet, sparse and nearby-only; the commander's stay as before.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sound} from '../../common/js/audio.js?v=151';
import {
  synthesizeAllyRangedSound, playRangedSound, playMagicSound, playImpactSound, playMeleeSound, resetWeaponSoundState,
  allyCrowdScale, allySoundsInLastSecond, RANGED_ALLY_SOUND, MAGIC_ALLY_SOUND, IMPACT_ALLY_SOUND, ALLY_BUDGET, ALLY_SOUND
} from '../js/weapon-sounds.js';

function fakeContext() {
  const started = [];
  const c = {
    currentTime: 100, state: 'running', sampleRate: 44100, started,
    createBuffer: (ch, n) => ({duration: n / 44100, getChannelData: () => new Float32Array(n)}),
    createGain: () => ({connect() {}, disconnect() {}, gain: {value: 1}}),
    createStereoPanner: () => ({connect() {}, disconnect() {}, pan: {value: 0}}),
    createBufferSource() {
      const s = {buffer: null, playbackRate: {value: 1}, out: null, connect(n) { s.out = n; }, disconnect() {}, stop() { s.onended?.(); },
        start(...args) { s.startArgs = args; s.time = c.currentTime; started.push(s); }};
      return s;
    }
  };
  return c;
}
const clip = duration => ({duration});
function setup() {
  resetWeaponSoundState();
  const c = fakeContext(), calls = {weapon: [], magic: [], impact: []};
  Object.assign(sound, {
    ctx: c, effects: {}, isMuted: false, pageHidden: false, effectVolume: .65, spatialListener: () => ({x: 0, y: 0}),
    buffers: new Map([['cannon', clip(.95)], ['stone', clip(.09)], ['fire', clip(.65)], ['ice', clip(.65)], ['blast', clip(1.15)], ['lightning', clip(.68)], ['heal', clip(.85)],
      ['metal', clip(.38)], ['hit', clip(.24)], ['hammer', clip(.45)]]),
    voices: new Set(),
    playWeapon: (...a) => { calls.weapon.push(a); return true; },
    playMagic: (...a) => { calls.magic.push(a); return true; },
    playImpact: (...a) => { calls.impact.push(a); return true; }
  });
  return {c, calls};
}
const advance = (c, s) => { c.currentTime += s; };
const ally = {fromPlayer: false};
const gainOf = s => s.out.gain.value;
const inLastSecond = (starts, now) => starts.filter(t => t <= now + 1e-9 && now - t < 1 - 1e-9).length;
function maxPerSecond(times) { let best = 0; for (const t of times) best = Math.max(best, times.filter(u => u <= t + 1e-9 && t - u < 1 - 1e-9).length); return best; }

test('the commander (and the default) go to the shared engine exactly as before, and use no allied budget', () => {
  const {c, calls} = setup();
  assert.equal(playRangedSound('bow', 700, 0), true); assert.equal(playRangedSound('cannon', 20, 0, {fromPlayer: true}), true);
  assert.deepEqual(calls.weapon, [['bow', 700, 0], ['cannon', 20, 0]]);
  assert.equal(playMagicSound('fire', 600, 0), true); assert.deepEqual(calls.magic, [['fire', 600, 0]]);
  assert.equal(playImpactSound('magic', 500, 0), true); assert.deepEqual(calls.impact, [['magic', 500, 0]]);
  for (let i = 0; i < 40; i++) { playRangedSound('bow', 10, 0); playMagicSound('ice', 10, 0); playImpactSound('hit', 10, 0); }
  assert.equal(calls.weapon.length, 42, 'every commander request still reaches the engine (its own 0.08 s gap / voice limit apply there)');
  assert.equal(c.started.length, 0, 'the commander never starts a private allied voice');
  assert.equal(allySoundsInLastSecond(), 0);
});

test('allied ranged shots: quiet, nearby only (450 px), position and listener required', () => {
  const {c, calls} = setup();
  assert.equal(playRangedSound('bow', 451, 0, ally), false, '451 px is silent');
  assert.equal(playRangedSound('bow', 300, 400, ally), false, 'distance uses both axes (500 px)');
  assert.equal(playRangedSound('bow', null, null, ally), false);
  assert.equal(playRangedSound('bow', NaN, 0, ally), false);
  assert.equal(playRangedSound('bow', 449, 0, ally), true, 'just inside the range plays');
  advance(c, 1); assert.equal(playRangedSound('bow', 200, 0, ally), true);
  const g = gainOf(c.started.at(-1));
  assert.ok(Math.abs(g - .75 * .4 * Math.pow(1 - 200 / 450, 1.4)) < 1e-9, `allied bow volume formula (${g}; the commander's is .75 x ${Math.pow(1 - 200 / 850, .7).toFixed(2)})`);
  assert.ok(g < .75 * Math.pow(1 - 200 / 850, .7) * .35, 'far below the commander\'s volume');
  advance(c, 1); assert.equal(playRangedSound('cannon', 200, 0, ally), true);
  assert.ok(Math.abs(gainOf(c.started.at(-1)) - .7 * .45 * Math.pow(1 - 200 / 450, 1.4)) < 1e-9, 'allied cannon volume x0.45');
  sound.spatialListener = null; advance(c, 1);
  assert.equal(playRangedSound('bow', 10, 10, ally), false, 'no listener: silent');
  assert.equal(calls.weapon.length, 0, 'allied shots never use the engine');
  assert.equal(sound.voices.size, 0, 'and never take one of the engine\'s shared combat slots');
});

test('allied shots: one shared gap per style (bow / crossbow .30 s, cannon .45 s), nearer ally may cut in, 2 bow voices + 1 cannon voice', () => {
  const {c} = setup();
  assert.deepEqual([RANGED_ALLY_SOUND.gap.bow, RANGED_ALLY_SOUND.gap.crossbow, RANGED_ALLY_SOUND.gap.cannon], [.3, .3, .45]);
  assert.equal(playRangedSound('bow', 400, 0, ally), true);
  assert.equal(playRangedSound('bow', 390, 0, ally), false, 'second bow right away is dropped');
  advance(c, .2); assert.equal(playRangedSound('bow', 380, 0, ally), false, 'still inside .30 s');
  assert.equal(playRangedSound('bow', 100, 0, ally), true, 'much nearer after half the gap: allowed');
  advance(c, .31); assert.equal(playRangedSound('bow', 400, 0, ally), false, 'both bow voices are busy (pool of 2)');
  for (const s of c.started) s.onended?.();
  assert.equal(playRangedSound('bow', 400, 0, ally), true, 'voices are released when they end');
  assert.equal(playRangedSound('crossbow', 100, 0, ally), true, 'crossbow has its own gap but shares the pool of 2');
  assert.equal(playRangedSound('stone', 100, 0, ally), false, 'pool of 2 is full (bow + crossbow)');
  assert.equal(playRangedSound('cannon', 100, 0, ally), true, 'the cannon has its own voice');
  advance(c, .4); assert.equal(playRangedSound('cannon', 100, 0, ally), false, 'cannon gap .45 s (and its one voice is still busy)');
  const cannon = c.started.find(s => s.buffer?.duration === .95); assert.deepEqual(cannon.startArgs, [0, 0, .5], 'the long cannon clip is cut at .5 s');
});

test('100 simultaneous allied shot requests stay inside the gap / voice limits and never touch the commander', () => {
  const {c, calls} = setup();
  let played = 0;
  for (let i = 0; i < 100; i++) if (playRangedSound(['bow', 'crossbow', 'cannon', 'stone'][i % 4], 50 + (i % 20), 0, ally)) played++;
  assert.ok(played <= RANGED_ALLY_SOUND.voices.bow + RANGED_ALLY_SOUND.voices.cannon, `${played} voices started at once`);
  assert.equal(c.started.length, played);
  assert.equal(calls.weapon.length, 0);
  assert.equal(playRangedSound('bow', 10, 0), true, 'the commander still shoots at the same instant');
  assert.equal(calls.weapon.length, 1);
});

test('SNIPER 3-arrow volley sounds once: only the centre arrow of an allied volley asks for a sound (source check)', () => {
  const src = readFileSync(new URL('../js/index.js', import.meta.url), 'utf8');
  assert.match(src, /if\(isPlayer\|\|profile\?\.starOffset==null\|\|profile\.starOffset===0\)playRangedSound\(/);
  assert.ok(!/sound\.playWeapon\(shot\.loaded/.test(src), 'the old direct engine call is gone');
  assert.match(src, /for \(const off of \[-0\.18, 0, 0\.18\]\)/, 'the volley is still 3 arrows');
  // The same rule as the guard in index.js, applied to a 3-arrow volley.
  const asks = [-.18, 0, .18].filter(off => { const profile = {starOffset: off}; return profile.starOffset == null || profile.starOffset === 0; });
  assert.equal(asks.length, 1);
  const {c} = setup(); let played = 0;
  for (const off of [-.18, 0, .18]) if (off === 0 && playRangedSound('bow', 100, 0, ally)) played++;
  assert.equal(played, 1); assert.equal(c.started.length, 1);
});

test('allied magic: x0.5, one shared .35 s gap, 450 px, clips cut to .4 s; the commander and the engine volume are untouched', () => {
  const {c, calls} = setup();
  assert.deepEqual([MAGIC_ALLY_SOUND.volume, MAGIC_ALLY_SOUND.gap, MAGIC_ALLY_SOUND.maxDuration], [.5, .35, .4]);
  assert.equal(playMagicSound('explosion', 460, 0, ally), false);
  assert.equal(playMagicSound('explosion', 200, 0, ally), true);
  const blast = c.started.at(-1); assert.equal(blast.buffer.duration, 1.15); assert.deepEqual(blast.startArgs, [0, 0, .4], 'blast is cut to .4 s');
  assert.ok(Math.abs(gainOf(blast) - .72 * .5 * Math.pow(1 - 200 / 450, 1.4)) < 1e-9);
  assert.equal(playMagicSound('fire', 100, 0, ally), false, 'one gap for every affinity');
  advance(c, .36); assert.equal(playMagicSound('fire', 200, 0, ally), true); assert.deepEqual(c.started.at(-1).startArgs, [0, 0, .4]);
  assert.equal(playMagicSound('fire', 200, 0), true); assert.equal(calls.magic.length, 1, 'the commander\'s cast reaches sound.playMagic unchanged');
});

test('allied ranged / magic hit sounds: x0.5, one every .2 s, one voice, 450 px, short clips', () => {
  const {c, calls} = setup();
  assert.deepEqual([IMPACT_ALLY_SOUND.volume, IMPACT_ALLY_SOUND.gap, IMPACT_ALLY_SOUND.maxVoices], [.5, .2, 1]);
  assert.equal(playImpactSound('magic', 500, 0, ally), false);
  assert.equal(playImpactSound('magic', 200, 0, ally), true);
  assert.ok(Math.abs(gainOf(c.started.at(-1)) - .55 * .5 * Math.pow(1 - 200 / 450, 1.4)) < 1e-9);
  assert.equal(playImpactSound('hammer', 190, 0, ally), false, 'inside the .2 s gap and one voice only');
  advance(c, .21); assert.equal(playImpactSound('hammer', 200, 0, ally), false, 'the single voice is still playing');
  c.started[0].onended(); assert.equal(playImpactSound('sword', 200, 0, ally), true);
  const metal = c.started.at(-1); assert.equal(metal.buffer.duration, .38); assert.deepEqual(metal.startArgs, [0, 0, .25], 'metal is cut to .25 s');
  assert.equal(playImpactSound('flesh', 200, 0), true); assert.deepEqual(calls.impact, [['flesh', 200, 0]], 'the commander\'s hit is unchanged');
});

test('high attack speed: shorter attack intervals never raise the number of allied sounds per second above the caps', () => {
  const results = {};
  for (const interval of [.6, .3, .15, .08, .04]) {
    const {c} = setup(); const times = [], byRole = {bow: [], magic: [], impact: [], melee: []};
    let seed = 7; const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    for (let step = 0; step < 6 / interval * 3; step++) {
      advance(c, interval / 3);
      for (let k = 0; k < 12; k++) {   // 12 allied archers / mages / fighters, each wanting a sound once per `interval` on average
        if (rand() > 1 / 3) continue;
        const x = (rand() - .5) * 700, y = (rand() - .5) * 700, before = c.started.length, kind = k % 4;
        if (kind === 0) playRangedSound(['bow', 'crossbow', 'cannon'][step % 3], x, y, ally);
        else if (kind === 1) playMagicSound(['fire', 'ice', 'lightning', 'explosion'][step % 4], x, y, ally);
        else if (kind === 2) playImpactSound('magic', x, y, ally);
        else playMeleeSound(['sword', 'spear', 'axe', 'hammer'][step % 4], x, y, ally);
        if (c.started.length > before) { times.push(c.currentTime); byRole[['bow', 'magic', 'impact', 'melee'][kind]].push(c.currentTime); }
        for (const s of c.started) if (c.currentTime - s.time > .3) s.onended?.();   // voices end after ~.3 s
      }
    }
    results[interval] = {perSecond: maxPerSecond(times), impact: maxPerSecond(byRole.impact), melee: maxPerSecond(byRole.melee)};
    assert.ok(results[interval].perSecond <= ALLY_BUDGET.perSecond, `interval ${interval}: ${results[interval].perSecond} allied sounds in one second (cap ${ALLY_BUDGET.perSecond})`);
    assert.ok(results[interval].impact <= ALLY_BUDGET.roleLimit.impact, `impact sounds per second ${results[interval].impact}`);
    assert.ok(allySoundsInLastSecond() <= ALLY_BUDGET.perSecond);
  }
  assert.ok(results[.04].perSecond <= results[.6].perSecond + 4, 'a 15x faster attack rate does not give a proportionally busier mix');
});

test('priority: when the allied budget is crowded, impact sounds are dropped first, then melee; magic and ranged keep playing', () => {
  const {c} = setup();
  assert.deepEqual(ALLY_BUDGET.roleLimit, {magic: 8, ranged: 7, melee: 6, impact: 4});
  // 3 ranged + 1 magic = 4 allied sounds in the last second.
  assert.equal(playRangedSound('bow', 100, 0, ally), true); assert.equal(playRangedSound('crossbow', 100, 0, ally), true);
  assert.equal(playRangedSound('cannon', 100, 0, ally), true); assert.equal(playMagicSound('fire', 100, 0, ally), true);
  assert.equal(allySoundsInLastSecond(), 4);
  assert.equal(playImpactSound('magic', 100, 0, ally), false, 'impact is the first to go (limit 4)');
  assert.equal(playMeleeSound('sword', 100, 0, ally), true, 'melee still plays (limit 6)');
  advance(c, .1); assert.equal(playMeleeSound('spear', 100, 0, ally), true);
  assert.equal(allySoundsInLastSecond(), 6);
  advance(c, .1); assert.equal(playMeleeSound('axe', 100, 0, ally), false, 'melee is next (limit 6)');
  assert.equal(playMagicSound('ice', 100, 0, ally), false, 'magic is blocked only by its own .35 s gap / voices here');
  advance(c, .3); for (const s of c.started) s.onended?.();
  assert.equal(playMagicSound('ice', 100, 0, ally), true, 'magic still gets in while melee / impact are dropped');
  assert.equal(allySoundsInLastSecond(), 7);
  assert.equal(playRangedSound('stone', 100, 0, ally), false, 'ranged is dropped once 7 allied sounds started in the last second');
  advance(c, .36); for (const s of c.started) s.onended?.();
  assert.equal(playMagicSound('lightning', 100, 0, ally), true, 'magic (limit 8) is the last to go');
  assert.equal(allySoundsInLastSecond(), 8);
  assert.equal(playRangedSound('bow', 100, 0, ally), false, 'the hard cap is 8 allied sounds per second');
  assert.equal(playMagicSound('lightning', 100, 0), true, 'the commander is never affected (goes to the engine)');
  advance(c, 1.2); assert.equal(allySoundsInLastSecond(), 0, 'the budget recovers after a second');
});

test('crowding lowers allied volume from x1.0 to x0.6', () => {
  const {c} = setup();
  assert.equal(allyCrowdScale(c.currentTime), 1);
  const gains = [];
  for (const [style, x] of [['bow', 100], ['crossbow', 100], ['cannon', 100]]) { playRangedSound(style, x, 0, ally); gains.push(gainOf(c.started.at(-1)) / ({bow: .3, crossbow: .3, cannon: .315})[style] / Math.pow(1 - 100 / 450, 1.4)); }
  assert.ok(gains[0] > gains[1] && gains[1] > gains[2], `each later sound is a little quieter: ${gains.map(g => g.toFixed(3))}`);
  assert.ok(Math.abs(allyCrowdScale(c.currentTime) - (1 - .4 * 3 / 6)) < 1e-9);
  advance(c, .1); playMagicSound('fire', 100, 0, ally); playMeleeSound('sword', 100, 0, ally); playMeleeSound('axe', 100, 0, ally);
  assert.ok(Math.abs(allyCrowdScale(c.currentTime) - .6) < 1e-9, 'six sounds inside .5 s = full crowding');
  advance(c, .6); assert.ok(allyCrowdScale(c.currentTime) > .95, 'and it relaxes once they are older than .5 s');
  assert.equal(ALLY_SOUND.hearing, 450);
});

test('mute / page hidden / zero volume / no context stay silent for allies too', () => {
  const {c} = setup();
  sound.isMuted = true; assert.equal(playRangedSound('bow', 10, 0, ally), false); assert.equal(playMagicSound('fire', 10, 0, ally), false); assert.equal(playImpactSound('hit', 10, 0, ally), false);
  sound.isMuted = false; sound.pageHidden = true; assert.equal(playRangedSound('bow', 10, 0, ally), false);
  sound.pageHidden = false; sound.effectVolume = 0; assert.equal(playRangedSound('bow', 10, 0, ally), false);
  sound.effectVolume = .65; c.state = 'suspended'; assert.equal(playRangedSound('bow', 10, 0, ally), false);
  c.state = 'running'; assert.equal(playRangedSound('bow', 10, 0, ally), true);
  sound.buffers = new Map(); advance(c, 1);
  assert.equal(playMagicSound('fire', 10, 0, ally), false, 'clip not decoded yet: silent, no error');
  assert.equal(playRangedSound('cannon', 10, 0, ally), false);
});

test('allied bow / crossbow synthesis: short, round, soft, quiet in the highs, no click, no lasting pitch', () => {
  const rate = 44100, bow = synthesizeAllyRangedSound('bow', rate), crossbow = synthesizeAllyRangedSound('crossbow', rate);
  const fft = x => {
    let N = 1; while (N < x.length) N <<= 1; const re = new Float64Array(N), im = new Float64Array(N); re.set(x);
    for (let i = 1, j = 0; i < N; i++) { let b = N >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) [re[i], re[j]] = [re[j], re[i]]; }
    for (let len = 2; len <= N; len <<= 1) { const a = -2 * Math.PI / len; for (let i = 0; i < N; i += len) for (let k = 0; k < len / 2; k++) {
      const wr = Math.cos(a * k), wi = Math.sin(a * k), h = i + k + len / 2, vr = re[h] * wr - im[h] * wi, vi = re[h] * wi + im[h] * wr;
      re[h] = re[i + k] - vr; im[h] = im[i + k] - vi; re[i + k] += vr; im[i + k] += vi; } }
    return {re, im, N};
  };
  const share = (x, r, cut = 2000) => { const {re, im, N} = fft(x); let tot = 0, hi = 0; for (let k = 0; k < N / 2; k++) { const e = re[k] ** 2 + im[k] ** 2; tot += e; if (k * r / N >= cut) hi += e; } return hi / tot; };
  const rms = x => Math.sqrt(x.reduce((a, v) => a + v * v, 0) / x.length);
  for (const [name, pcm, seconds] of [['bow', bow, .16], ['crossbow', crossbow, .15]]) {
    assert.ok(Math.abs(pcm.length / rate - seconds) < .002, `${name} length ${pcm.length / rate}`);
    const peak = Math.max(...pcm.map(Math.abs)); assert.ok(peak > .85 && peak <= .9001, `${name} peak ${peak} (no clipping)`);
    assert.ok(rms(pcm) > .05 && rms(pcm) < .2, `${name} rms ${rms(pcm)}`);
    assert.ok(share(pcm, rate) < .07, `${name}: ${(share(pcm, rate) * 100).toFixed(1)}% of the energy above 2 kHz (target about 4%)`);
    assert.ok(Math.abs(pcm[0]) < .02 && Math.abs(pcm.at(-1)) < 1e-3, `${name} soft start and end`);
    const a = rms(pcm.slice(0, pcm.length / 2)), b = rms(pcm.slice(pcm.length / 2)); assert.ok(b < a * .25, `${name}: the second half is far quieter (${b.toFixed(3)} vs ${a.toFixed(3)}): no lasting tone`);
  }
  // The shared engine's bow clip (the commander's sound) is a long Karplus-Strong pluck: far brighter and nearly three times longer.
  const wav = readFileSync(new URL('../../common/assets/audio/bow.wav', import.meta.url)), old = Float32Array.from(new Int16Array(wav.buffer.slice(wav.byteOffset + 44, wav.byteOffset + wav.length - (wav.length - 44) % 2)), v => v / 32768);
  assert.ok(share(old, 22050) > .15 && share(old, 22050) > share(bow, rate) * 3, 'the allied bow is much duller than the commander\'s clip');
  assert.ok(old.length / 22050 > .3 && old.length / 22050 > bow.length / rate * 1.2);
  assert.equal(synthesizeAllyRangedSound('cannon'), null);
});
