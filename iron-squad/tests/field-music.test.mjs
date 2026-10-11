import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {WORLD_SIZE} from '../js/world.js?v=182';

const memory = new Map();
globalThis.localStorage = {
  getItem: key => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, value),
  removeItem: key => memory.delete(key)
};

const {
  CUE_HOLD_SECONDS, SCENE_HOLD_SECONDS, FIRST_HOLD_SECONDS, FIELD_CROSSFADE_SECONDS, TRACK_FILES,
  fieldMusicCue, fieldMusicSituation, createMusicMemory, advanceMusicMemory,
  bindFieldMusic, unbindFieldMusic
} = await import('../js/field-music.js');

const CENTER = WORLD_SIZE / 2;
const at = (x, y, dungeon = null) => fieldMusicSituation({
  player: { x: CENTER + x, y: CENTER + y },
  currentDungeon: dungeon
});

const home = at(0, 0);
assert.equal(home.cue, 'meadow');
assert.equal(home.place, 'out:home:0');
assert.equal(at(5000, 0).cue, 'meadow', 'the east plain inside the safe ring keeps the camp cue');
assert.equal(at(5000, 0).place, 'out:home:0');
assert.equal(at(8000, 0).cue, 'piano');
assert.equal(at(21999, 0).cue, 'piano');
assert.equal(at(22000, 0).cue, 'vesper');
assert.equal(at(48000, 0).cue, 'organ');
assert.equal(at(-12000, 0).cue, 'celtic');
assert.equal(at(0, -12000).cue, 'highland');
assert.equal(at(0, 12000).cue, 'salt');
assert.equal(at(10, 10, { id: 'dungeon_goblin_mines', theme: 'mines' }).cue, 'celtic');
assert.equal(at(10, 10, { id: 'dungeon_goblin_mines', theme: 'mines' }).place, 'in:dungeon_goblin_mines');
assert.equal(fieldMusicCue({ interior: 'town' }), 'piano');
assert.equal(fieldMusicCue({ interior: 'dragon' }), 'vesper');
assert.equal(fieldMusicCue({ interior: 'catacombs' }), 'organ');
assert.equal(fieldMusicCue({ interior: 'demon' }), 'organ');
assert.equal(fieldMusicCue({ interior: 'ruin' }), 'organ');
assert.equal(at(0, 0, { id: 'royal_castle_town', theme: 'town', kind: 'town' }).cue, 'piano');

function stay(state, cue, place, seconds) {
  let left = seconds;
  while (left > 0) {
    const step = Math.min(1, left);
    advanceMusicMemory(state, cue, place, step);
    left -= step;
  }
}

const memoryCue = createMusicMemory();
advanceMusicMemory(memoryCue, 'vesper', 'out:北の山地:2', 0.01);
assert.equal(memoryCue.current, 'vesper');
assert.equal(memoryCue.switched, true);

const eastPlace = 'out:東の街道平原:1';
const westPlace = 'out:西の湿地:1';
const border = createMusicMemory();
border.current = 'piano';
border.place = eastPlace;
border.placed = true;
stay(border, 'celtic', westPlace, CUE_HOLD_SECONDS - 0.4);
assert.equal(border.current, 'piano', 'a border crossing has to stay');
advanceMusicMemory(border, 'piano', eastPlace, 0.2);
assert.equal(border.pending, null, 'stepping back cancels the pending cue');
stay(border, 'celtic', westPlace, CUE_HOLD_SECONDS - 0.2);
assert.equal(border.current, 'piano');
advanceMusicMemory(border, 'celtic', westPlace, 0.3);
assert.equal(border.current, 'celtic');
assert.equal(border.switched, true);

const sameCue = createMusicMemory();
sameCue.current = 'piano';
sameCue.place = eastPlace;
sameCue.placed = true;
advanceMusicMemory(sameCue, 'piano', 'in:royal_castle_town', 1);
assert.equal(sameCue.current, 'piano');
assert.equal(sameCue.pending, null, 'town and the east plain share the piano and do not restart it');
assert.equal(sameCue.place, 'in:royal_castle_town');

const first = createMusicMemory();
first.current = 'meadow';
first.place = 'out:home:0';
first.placed = false;
stay(first, 'organ', 'out:東の街道平原:3', FIRST_HOLD_SECONDS - 0.1);
assert.equal(first.current, 'meadow');
advanceMusicMemory(first, 'organ', 'out:東の街道平原:3', 0.2);
assert.equal(first.current, 'organ', 'a loaded expedition corrects sooner than a later walk');

const scene = createMusicMemory();
scene.current = 'piano';
scene.place = eastPlace;
scene.placed = true;
stay(scene, 'organ', 'in:dungeon_catacombs', SCENE_HOLD_SECONDS - 0.1);
assert.equal(scene.current, 'piano');
advanceMusicMemory(scene, 'organ', 'in:dungeon_catacombs', 0.2);
assert.equal(scene.current, 'organ', 'entering an interior does not wait out a field hold');
stay(scene, 'piano', eastPlace, SCENE_HOLD_SECONDS);
assert.equal(scene.current, 'piano');

function fakeSound() {
  const param = () => ({
    value: 0,
    cancelScheduledValues() {},
    setValueAtTime(value) { this.value = value; },
    linearRampToValueAtTime(value) { this.value = value; }
  });
  const ctx = {
    state: 'running',
    currentTime: 0,
    sources: [],
    createGain() { return { gain: param(), connect() {}, disconnect() {} }; },
    createBufferSource() {
      const source = {
        buffer: null,
        loop: false,
        started: false,
        stopped: false,
        offset: 0,
        stopAt: null,
        connect() {},
        disconnect() {},
        start(_when, offset = 0) { source.started = true; source.offset = offset; },
        stop(when) { source.stopped = true; source.stopAt = when; }
      };
      ctx.sources.push(source);
      return source;
    }
  };
  let engineStarts = 0;
  const engine = {
    ctx,
    bgmWanted: true,
    isMuted: false,
    pageHidden: false,
    bgmVolume: 0.35,
    bgmPlaying: false,
    music: { connect() {} },
    buffers: new Map([['music', { duration: 24 }]]),
    musicSource: null,
    preload() {},
    decode: async () => ({ duration: 24 }),
    unlock() { return Promise.resolve(true); },
    syncMusic() { engineStarts += 1; this.musicSource = { loop: true, engine: true }; this.bgmPlaying = true; },
    pauseMusic() { this.musicSource = null; this.bgmPlaying = false; },
    stopBGM() { this.bgmWanted = false; this.pauseMusic(); }
  };
  engine.engineStarts = () => engineStarts;
  return engine;
}

const engine = fakeSound();
const player = bindFieldMusic(engine);
assert.equal(bindFieldMusic(engine), player);
for (const id of Object.keys(TRACK_FILES)) player.buffers.set(id, { duration: 24 });
engine.syncMusic();
assert.equal(engine.engineStarts(), 0, 'the camp loop uses the field player, not a second engine loop');
assert.equal(engine.ctx.sources.length, 1);
assert.equal(engine.ctx.sources[0].loop, true);
assert.equal(engine.bgmPlaying, true);
assert.equal(player.voice.id, 'meadow');

const started = engine.ctx.sources[0];
player.memory.placed = false;
const east = { player: { x: CENTER + 12000, y: CENTER }, currentDungeon: null };
player.follow(east, FIRST_HOLD_SECONDS - 0.5);
assert.equal(player.voice.id, 'meadow');
let heard = FIRST_HOLD_SECONDS - 0.5;
while (player.voice.id === 'meadow' && heard < FIRST_HOLD_SECONDS + 1) {
  player.follow(east, 0.5);
  heard += 0.5;
}
assert.equal(player.voice.id, 'piano');
assert.ok(heard >= FIRST_HOLD_SECONDS && heard < FIRST_HOLD_SECONDS + 1);
assert.equal(engine.ctx.sources.length, 2, 'the old loop fades out instead of cutting');
assert.equal(engine.ctx.sources[0], started);
assert.equal(typeof started.stopAt, 'number');
assert.ok(started.stopAt >= engine.ctx.currentTime + FIELD_CROSSFADE_SECONDS - 0.1);

engine.ctx.currentTime = 5;
engine.setPageHidden = null;
engine.isMuted = true;
engine.pauseMusic();
assert.equal(engine.bgmPlaying, false);
assert.equal(player.voice, null);
engine.isMuted = false;
engine.syncMusic();
assert.equal(player.voice.id, 'piano');
assert.equal(engine.bgmPlaying, true);

engine.stopBGM();
assert.equal(engine.bgmWanted, false);
assert.equal(player.memory.current, null);
unbindFieldMusic(engine);
engine.bgmWanted = true;
engine.syncMusic();
assert.equal(engine.engineStarts(), 1, 'leaving the game restores the shared music loop');
assert.equal(engine._fieldMusic, undefined);

const manifest = JSON.parse(readFileSync(new URL('../assets/music/manifest.json', import.meta.url), 'utf8'));
const hashes = new Set();
for (const [id, file] of Object.entries(TRACK_FILES)) {
  const bytes = readFileSync(new URL(`../assets/music/${file}`, import.meta.url));
  const clip = manifest.clips[id];
  assert.match(file, /\.m4a$/, `${id} ships as AAC`);
  assert.equal(bytes.toString('ascii', 4, 8), 'ftyp', file);
  assert.ok(bytes.length < 300 * 1024, `${id} stays small (${bytes.length} bytes)`);
  assert.equal(clip.file, file);
  assert.equal(clip.channels, 1, `${id} stays mono`);
  assert.equal(clip.sampleRate, 22050);
  assert.ok(clip.rms > 0.04 && clip.rms < 0.16, `${id} rms ${clip.rms}`);
  assert.ok(clip.peak < 0.7, `${id} peak ${clip.peak}`);
  assert.ok(clip.seconds > 20 && clip.seconds < 28, id);
  const hash = createHash('sha256').update(bytes).digest('hex');
  assert.equal(hash, manifest.clips[id].sha256, id);
  hashes.add(hash);
}
assert.equal(hashes.size, Object.keys(TRACK_FILES).length, 'the six loops are not copies');
console.log('PASS: field cues, hold, crossfade, shared-engine restore, six quiet loops');
