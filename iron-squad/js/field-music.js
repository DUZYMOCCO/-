// Quiet field music. One loop stays until the land, the danger band, or an
// interior has remained changed long enough, then the shared music bus
// crossfades. The home defense ring keeps a single cue so the nearby biome
// border does not retune the camp.
import { sound } from '../../common/js/audio.js?v=151';
import { biomeAt, WORLD_SIZE } from './world.js?v=289';
import { zoneRingLabelJa } from './equipment-rules.js?v=306';

const CENTER = WORLD_SIZE / 2;
const ASSET_VERSION = 192;
const LOOP_SECONDS = 24;
export const CUE_HOLD_SECONDS = 8;
export const SCENE_HOLD_SECONDS = 2.5;
export const FIRST_HOLD_SECONDS = 2;
export const FIELD_CROSSFADE_SECONDS = 3.8;
export const TRACK_FILES = Object.freeze({
  piano: 'piano.m4a',
  celtic: 'celtic.m4a',
  highland: 'highland.m4a',
  salt: 'salt.m4a',
  vesper: 'vesper.m4a',
  organ: 'organ.m4a'
});
const BIOME_TRACK = Object.freeze({
  '東の街道平原': 'piano',
  '西の湿地': 'celtic',
  '北の山地': 'highland',
  '南の塩原': 'salt'
});

export function fieldMusicCue({ interior = null, biome = '', ring = 0 } = {}) {
  if (interior === 'town') return 'piano';
  if (interior === 'mines') return 'celtic';
  if (interior === 'dragon') return 'vesper';
  if (interior) return 'organ';
  const band = Number(ring) || 0;
  if (band <= 0) return 'meadow';
  if (band === 1) return BIOME_TRACK[biome] || 'piano';
  if (band === 2) return 'vesper';
  return 'organ';
}

export function fieldMusicSituation(game, out = {}) {
  const dungeon = game?.currentDungeon;
  if (dungeon) {
    out.interior = dungeon.theme || dungeon.kind || 'dungeon';
    out.biome = '';
    out.ring = 0;
    out.cue = fieldMusicCue({ interior: out.interior });
    out.place = `in:${dungeon.id || out.interior}`;
    return out;
  }
  out.interior = null;
  const x = game?.player?.x;
  const y = game?.player?.y;
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    out.biome = '';
    out.ring = 0;
    out.cue = 'meadow';
    out.place = 'out:home:0';
    return out;
  }
  out.biome = biomeAt(x, y)?.name || '';
  out.ring = zoneRingLabelJa(Math.hypot(x - CENTER, y - CENTER)).ring;
  out.cue = fieldMusicCue({ biome: out.biome, ring: out.ring });
  out.place = out.ring <= 0 ? 'out:home:0' : `out:${out.biome}:${out.ring}`;
  return out;
}

export function createMusicMemory() {
  return {
    current: null,
    place: null,
    placed: false,
    pending: null,
    pendingPlace: null,
    pendingFor: 0,
    sinceSwitch: 0,
    switched: false
  };
}

function sceneChange(prev, next) {
  if (!prev || !next) return false;
  const insidePrev = prev.startsWith('in:');
  const insideNext = next.startsWith('in:');
  return insidePrev !== insideNext || (insidePrev && prev !== next);
}

/** Mutates memory. A border must stay put for the hold; stepping back cancels it. */
export function advanceMusicMemory(memory, cue, place, dt) {
  const step = Math.min(1, Math.max(0, Number(dt) || 0));
  memory.switched = false;
  if (!cue) return memory;
  memory.sinceSwitch += step;
  if (memory.current == null) {
    memory.current = cue;
    memory.place = place;
    memory.placed = true;
    memory.pending = null;
    memory.pendingPlace = null;
    memory.pendingFor = 0;
    memory.sinceSwitch = 0;
    memory.switched = true;
    return memory;
  }
  if (cue === memory.current) {
    memory.place = place;
    memory.placed = true;
    memory.pending = null;
    memory.pendingPlace = null;
    memory.pendingFor = 0;
    return memory;
  }
  if (memory.pending !== cue || memory.pendingPlace !== place) memory.pendingFor = 0;
  memory.pending = cue;
  memory.pendingPlace = place;
  memory.pendingFor += step;
  const hold = !memory.placed ? FIRST_HOLD_SECONDS : sceneChange(memory.place, place) ? SCENE_HOLD_SECONDS : CUE_HOLD_SECONDS;
  if (memory.pendingFor >= hold) {
    memory.current = cue;
    memory.place = place;
    memory.placed = true;
    memory.pending = null;
    memory.pendingPlace = null;
    memory.pendingFor = 0;
    memory.sinceSwitch = 0;
    memory.switched = true;
  }
  return memory;
}

function canHear(engine) {
  return !!(engine.bgmWanted && !engine.isMuted && !engine.pageHidden && engine.bgmVolume && engine.ctx?.state === 'running' && engine.music);
}

class FieldMusic {
  constructor(engine) {
    this.sound = engine;
    this.buffers = new Map();
    this.failed = new Set();
    this.loading = null;
    this.memory = createMusicMemory();
    this.scratch = {};
    this.voice = null;
    this.tails = [];
    this.offsets = {};
    this.accum = 0;
    this.active = true;
  }
  bufferFor(id) {
    if (id === 'meadow') return this.sound.buffers?.get?.('music') || null;
    return this.buffers.get(id) || null;
  }
  readyToOwn() {
    return !!(this.voice || this.bufferFor(this.memory.current || 'meadow'));
  }
  preload() {
    const engine = this.sound;
    if (!engine.ctx) return Promise.resolve();
    if (this.loading) return this.loading;
    const missing = Object.keys(TRACK_FILES).filter(id => !this.buffers.has(id) && !this.failed.has(id));
    if (!missing.length) return Promise.resolve();
    this.loading = Promise.allSettled(missing.map(async id => {
      try {
        const response = await fetch(new URL(`../assets/music/${TRACK_FILES[id]}?v=${ASSET_VERSION}`, import.meta.url));
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const buffer = await engine.decode(await response.arrayBuffer());
        this.buffers.set(id, buffer);
        this.failed.delete(id);
      } catch (error) {
        this.failed.add(id);
        console.warn(`Field music unavailable: ${id}`, error);
      }
    })).then(() => {
      this.loading = null;
      if (this.active && engine.bgmWanted) engine.syncMusic();
    });
    return this.loading;
  }
  offsetOf(voice) {
    const duration = voice.buffer?.duration || voice.source?.buffer?.duration || 0;
    if (!(duration > 0)) return 0;
    const elapsed = Math.max(0, this.sound.ctx.currentTime - voice.startedAt);
    return (voice.offset + elapsed) % duration;
  }
  stopVoice(voice) {
    if (!voice || voice.dropped) return;
    voice.dropped = true;
    voice.source.onended = null;
    try { voice.source.stop(); } catch { /* Already stopped. */ }
    try { voice.source.disconnect(); } catch { /* Already disconnected. */ }
    try { voice.gain.disconnect(); } catch { /* Already disconnected. */ }
    this.tails = this.tails.filter(item => item !== voice);
    if (this.voice === voice) this.voice = null;
  }
  spawn(id, buffer, offset, now, fade) {
    const ctx = this.sound.ctx;
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    const duration = buffer.duration || 0;
    const startAt = duration > 0 ? Math.min(((offset % duration) + duration) % duration, Math.max(0, duration - 0.02)) : 0;
    source.buffer = buffer;
    source.loop = true;
    // Trim any AAC end padding so the 24 s loop stays seamless.
    if (duration > LOOP_SECONDS) { source.loopStart = 0; source.loopEnd = LOOP_SECONDS; }
    source.connect(gain);
    gain.connect(this.sound.music);
    const param = gain.gain;
    param.cancelScheduledValues?.(now);
    param.setValueAtTime(0, now);
    param.linearRampToValueAtTime(1, now + fade);
    const voice = { id, source, gain, buffer, offset: startAt, startedAt: now, dropped: false };
    source.onended = () => {
      if (voice.dropped) return;
      voice.dropped = true;
      try { source.disconnect(); } catch { /* Already disconnected. */ }
      try { gain.disconnect(); } catch { /* Already disconnected. */ }
      this.tails = this.tails.filter(item => item !== voice);
      if (this.voice === voice) {
        this.voice = null;
        this.sound.bgmPlaying = false;
      }
    };
    source.start(now, startAt);
    return voice;
  }
  crossfade(id, buffer) {
    const now = this.sound.ctx.currentTime;
    const fade = this.voice ? FIELD_CROSSFADE_SECONDS : 1.3;
    for (const old of [...this.tails]) this.stopVoice(old);
    if (this.voice && this.voice.id !== id) {
      const old = this.voice;
      this.offsets[old.id] = this.offsetOf(old);
      const param = old.gain.gain;
      const from = typeof param.value === 'number' ? Math.max(0.0001, param.value) : 1;
      param.cancelScheduledValues?.(now);
      param.setValueAtTime(from, now);
      param.linearRampToValueAtTime(0, now + fade);
      this.tails.push(old);
      this.voice = null;
      const token = old;
      try { old.source.stop(now + fade + 0.05); } catch { this.stopVoice(token); }
    } else if (this.voice?.id === id) {
      this.sound.bgmPlaying = true;
      return;
    }
    const voice = this.spawn(id, buffer, this.offsets[id] || 0, now, fade);
    this.voice = voice;
    this.sound.bgmPlaying = true;
  }
  sync() {
    if (!this.active || !canHear(this.sound)) return;
    if (this.sound.musicSource) this.origPause.call(this.sound);
    if (!this.memory.current) {
      this.memory.current = 'meadow';
      this.memory.place = this.memory.place || 'out:home:0';
      this.memory.placed = false;
    }
    const wanted = this.memory.current;
    const exact = this.bufferFor(wanted);
    const buffer = exact || this.bufferFor('meadow');
    const playing = exact ? wanted : buffer ? 'meadow' : null;
    if (!playing) return;
    if (this.voice?.id === playing) {
      this.sound.bgmPlaying = true;
      return;
    }
    this.crossfade(playing, buffer);
  }
  pause() {
    if (this.voice) this.offsets[this.voice.id] = this.offsetOf(this.voice);
    if (this.voice) this.stopVoice(this.voice);
    for (const tail of [...this.tails]) this.stopVoice(tail);
    this.sound.bgmPlaying = false;
  }
  follow(game, dt) {
    if (!this.active) return;
    const incoming = Number(dt);
    if (!Number.isFinite(incoming) || incoming <= 0) return;
    this.accum += Math.min(1, incoming);
    if (this.accum < 0.25) return;
    const step = Math.min(1, this.accum);
    this.accum = 0;
    const before = this.memory.current;
    fieldMusicSituation(game, this.scratch);
    advanceMusicMemory(this.memory, this.scratch.cue, this.scratch.place, step);
    const wanted = this.memory.current;
    const loaded = !!(wanted && this.bufferFor(wanted));
    const playingWanted = this.voice?.id === wanted;
    if (this.memory.switched || before !== wanted || (!playingWanted && (loaded || !this.voice))) {
      if (this.sound.bgmWanted) this.sound.syncMusic();
    }
  }
}

export function bindFieldMusic(engine = sound) {
  if (engine._fieldMusic) return engine._fieldMusic;
  const player = new FieldMusic(engine);
  player.origSync = engine.syncMusic;
  player.origPause = engine.pauseMusic;
  player.origStop = engine.stopBGM;
  player.origUnlock = engine.unlock;
  engine.syncMusic = function () {
    if (!player.active) return player.origSync.call(engine);
    if (!engine.bgmWanted || engine.isMuted || engine.pageHidden || !engine.bgmVolume || engine.ctx?.state !== 'running') return;
    player.preload();
    if (player.readyToOwn()) player.sync();
    else player.origSync.call(engine);
  };
  engine.pauseMusic = function () {
    if (player.active) player.pause();
    player.origPause.call(engine);
  };
  engine.stopBGM = function () {
    if (player.active) {
      player.pause();
      player.memory = createMusicMemory();
    }
    player.origStop.call(engine);
  };
  engine.unlock = function () {
    if (player.active) player.failed.clear();
    return player.origUnlock.call(engine);
  };
  engine._fieldMusic = player;
  return player;
}

export function unbindFieldMusic(engine = sound) {
  const player = engine._fieldMusic;
  if (!player) return;
  player.active = false;
  player.pause();
  player.memory = createMusicMemory();
  engine.syncMusic = player.origSync;
  engine.pauseMusic = player.origPause;
  engine.stopBGM = player.origStop;
  engine.unlock = player.origUnlock;
  delete engine._fieldMusic;
}

let musicFault = false;
export function followFieldMusic(game, dt, engine = sound) {
  if (musicFault) return;
  try { bindFieldMusic(engine).follow(game, dt); }
  catch (error) {
    musicFault = true;
    console.warn('Field music stopped', error);
  }
}
