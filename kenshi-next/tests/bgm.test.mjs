import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const MUSIC_DIR = join(ROOT, 'assets', 'music');

// Mock localStorage for node environment
const storageData = new Map();
globalThis.localStorage = {
  getItem: key => storageData.get(key) ?? null,
  setItem: (key, value) => storageData.set(key, String(value)),
  removeItem: key => storageData.delete(key),
  clear: () => storageData.clear(),
};

// Mock browser objects
globalThis.window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  AudioContext: class MockAudioContext {
    constructor() {
      this.state = 'running';
      this.currentTime = 0;
      this.destination = {};
    }
    createGain() {
      return {
        gain: {
          value: 1,
          setTargetAtTime: () => {},
          setValueAtTime: () => {},
          linearRampToValueAtTime: () => {},
          cancelScheduledValues: () => {},
        },
        connect: () => {},
        disconnect: () => {},
      };
    }
    createBufferSource() {
      return {
        buffer: null,
        connect: () => {},
        disconnect: () => {},
        start: () => {},
        stop: () => {},
      };
    }
    resume() { return Promise.resolve(); }
    suspend() { return Promise.resolve(); }
  }
};
globalThis.document = {
  addEventListener: () => {},
  hidden: false,
};

const { BgmPlayer, TRACKS, BGM_STORAGE_KEYS } = await import('../js/audio/bgm_player.js');

test('BGM assets verification: all 12 tracks exist and match manifest hash', () => {
  const manifestPath = join(MUSIC_DIR, 'manifest.json');
  assert.ok(existsSync(manifestPath), 'manifest.json exists');
  
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  const trackKeys = Object.keys(manifest.tracks);
  assert.equal(trackKeys.length, 12, '12 tracks are recorded in manifest');

  for (const trackId of trackKeys) {
    const meta = manifest.tracks[trackId];
    assert.ok(meta.file, `File specified for ${trackId}`);
    const filePath = join(MUSIC_DIR, meta.file);
    assert.ok(existsSync(filePath), `File exists: ${meta.file}`);

    const buffer = readFileSync(filePath);
    assert.ok(buffer.length > 50000, `File size is reasonable (>50KB): ${meta.file}`);

    const actualHash = createHash('sha256').update(buffer).digest('hex');
    assert.equal(actualHash, meta.sha256, `SHA256 matches for ${meta.file}`);
  }
});

test('TRACKS configuration covers all 12 tracks with metadata', () => {
  assert.equal(TRACKS.length, 12, '12 tracks configured in TRACKS array');
  const ids = new Set(TRACKS.map(t => t.id));
  assert.equal(ids.size, 12, 'All track IDs are unique');

  for (const t of TRACKS) {
    assert.ok(t.title, `Track has title: ${t.id}`);
    assert.ok(t.file, `Track has filename: ${t.id}`);
    assert.ok(t.mood, `Track has mood: ${t.id}`);
    assert.ok(t.duration >= 24, `Duration is at least 24s: ${t.id}`);
  }
});

test('BgmPlayer volume and mute operations with persistence', () => {
  storageData.clear();
  const player = new BgmPlayer();

  // Initial defaults
  assert.equal(player.volume, 0.35);
  assert.equal(player.muted, false);
  assert.equal(player.mode, 'ambient');

  // Change volume
  player.setVolume(0.5);
  assert.equal(player.volume, 0.5);
  assert.equal(storageData.get(BGM_STORAGE_KEYS.VOLUME), '0.50');

  // Clamp volume
  player.setVolume(1.5);
  assert.equal(player.volume, 1.0);
  player.setVolume(-0.2);
  assert.equal(player.volume, 0.0);

  // Toggle mute
  assert.equal(player.toggleMute(), true);
  assert.equal(player.muted, true);
  assert.equal(storageData.get(BGM_STORAGE_KEYS.MUTED), '1');

  assert.equal(player.toggleMute(), false);
  assert.equal(player.muted, false);
  assert.equal(storageData.get(BGM_STORAGE_KEYS.MUTED), '0');

  // Mode change
  player.setMode('continuous');
  assert.equal(player.mode, 'continuous');
  assert.equal(storageData.get(BGM_STORAGE_KEYS.MODE), 'continuous');
});

test('BgmPlayer contextual track selection', () => {
  const player = new BgmPlayer();

  // Test night selection
  player.updateSituation({ nightK: 0.9, inTown: false });
  let nightCount = 0;
  for (let i = 0; i < 30; i++) {
    const t = player.chooseNextTrack();
    if (t.time === 'night' || t.mood === 'camp') nightCount++;
  }
  assert.ok(nightCount > 15, 'Night tracks selected preferentially when nightK is high');

  // Test town selection
  player.updateSituation({ nightK: 0.1, inTown: true });
  let townCount = 0;
  for (let i = 0; i < 30; i++) {
    const t = player.chooseNextTrack();
    if (t.mood === 'town' || t.mood === 'oasis') townCount++;
  }
  assert.ok(townCount > 15, 'Town/peaceful tracks selected preferentially when in town');
});

test('BgmPlayer ambient gap update and notification', () => {
  const player = new BgmPlayer();
  let stateReceived = null;
  const unsub = player.onChange(s => { stateReceived = s; });

  assert.ok(stateReceived, 'Listener received initial state');
  assert.equal(stateReceived.volume, player.volume);

  // Trigger pause timer
  player.pauseTimer = 5.0;
  assert.equal(player.getState().isPausedInAmbientGap, true);

  // Advance time
  player.update(2.0);
  assert.ok(Math.abs(player.pauseTimer - 3.0) < 0.001);

  unsub();
});
