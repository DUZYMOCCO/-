// kenshi-next quiet ambient piano BGM player.
// Provides peaceful, unobtrusive piano music that dynamically adapts to
// desert wasteland atmosphere, day/night cycles, and settlements without disturbing gameplay.

export const BGM_STORAGE_KEYS = {
  VOLUME: 'sunahate_bgm_vol',
  MUTED: 'sunahate_bgm_mute',
  MODE: 'sunahate_bgm_mode', // 'ambient' (with tranquil pauses) or 'continuous'
};

export const TRACKS = [
  { id: 'track01_solitude', title: '砂海の孤独', titleEn: 'Solitude in the Sands', file: 'track01_solitude.m4a', mood: 'wasteland', time: 'day', duration: 28 },
  { id: 'track02_dusk', title: '黄昏の旅路', titleEn: 'Twilight Journey', file: 'track02_dusk.m4a', mood: 'dusk', time: 'dusk', duration: 28 },
  { id: 'track03_nightfall', title: '砂海の夜空', titleEn: 'Nightfall Oasis', file: 'track03_nightfall.m4a', mood: 'night', time: 'night', duration: 30 },
  { id: 'track04_oasis', title: '木陰と湧水', titleEn: 'Silent Spring', file: 'track04_oasis.m4a', mood: 'oasis', time: 'any', duration: 28 },
  { id: 'track05_ruins', title: '忘却の遺構', titleEn: 'Forgotten Relics', file: 'track05_ruins.m4a', mood: 'ruins', time: 'any', duration: 28 },
  { id: 'track06_settlement', title: '集落の灯火', titleEn: 'Settlement Hearth', file: 'track06_settlement.m4a', mood: 'town', time: 'any', duration: 28 },
  { id: 'track07_wind_wanderer', title: '風の巡礼', titleEn: 'Wind Wanderer', file: 'track07_wind_wanderer.m4a', mood: 'wasteland', time: 'day', duration: 26 },
  { id: 'track08_dawn', title: '夜明けの地平線', titleEn: 'Horizon Dawn', file: 'track08_dawn.m4a', mood: 'dawn', time: 'dawn', duration: 28 },
  { id: 'track09_vast_expanse', title: '果てなき砂丘', titleEn: 'Vast Expanse', file: 'track09_vast_expanse.m4a', mood: 'wasteland', time: 'day', duration: 30 },
  { id: 'track10_camp_fire', title: '焚き火の温もり', titleEn: 'Campfire Glow', file: 'track10_camp_fire.m4a', mood: 'camp', time: 'night', duration: 28 },
  { id: 'track11_haze', title: '陽炎の彼方', titleEn: 'Shimmering Haze', file: 'track11_haze.m4a', mood: 'wasteland', time: 'day', duration: 28 },
  { id: 'track12_moonlight', title: '月影の静寂', titleEn: 'Moonlight Sentry', file: 'track12_moonlight.m4a', mood: 'night', time: 'night', duration: 28 },
];

export class BgmPlayer {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.buffers = new Map();
    this.loading = new Set();
    this.unlocked = false;

    // Settings
    this.volume = this.readSavedNumber(BGM_STORAGE_KEYS.VOLUME, 0.35);
    this.muted = this.readSavedBoolean(BGM_STORAGE_KEYS.MUTED, false);
    this.mode = this.readSavedString(BGM_STORAGE_KEYS.MODE, 'ambient'); // 'ambient' or 'continuous'

    // Playback state
    this.currentTrack = null;
    this.currentVoice = null;
    this.fadingOutVoices = [];
    this.pauseTimer = 0; // seconds of ambient silence remaining between tracks
    this.listeners = new Set();
    this.recentHistory = [];
    this.situation = { nightK: 0, inTown: false };

    // Auto-setup unlock listeners
    this.setupUnlockHooks();
    this.setupVisibilityHooks();
  }

  readSavedNumber(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      if (v != null && !isNaN(parseFloat(v))) return Math.max(0, Math.min(1, parseFloat(v)));
    } catch (_) {}
    return fallback;
  }

  readSavedBoolean(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      if (v != null) return v === '1' || v === 'true';
    } catch (_) {}
    return fallback;
  }

  readSavedString(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      if (v) return v;
    } catch (_) {}
    return fallback;
  }

  setupUnlockHooks() {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      this.unlock();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });
  }

  setupVisibilityHooks() {
    if (typeof document === 'undefined') return;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (this.ctx && this.ctx.state === 'running') {
          this.ctx.suspend().catch(() => {});
        }
      } else {
        if (this.ctx && this.unlocked && this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
      }
    });
  }

  initAudioContext() {
    if (this.ctx) return this.ctx;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    try {
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.applyVolume();
      this.masterGain.connect(this.ctx.destination);
    } catch (e) {
      console.warn('BGM AudioContext init failed:', e);
      this.ctx = null;
    }
    return this.ctx;
  }

  unlock() {
    if (this.unlocked && this.ctx && this.ctx.state === 'running') return Promise.resolve(true);
    const ctx = this.initAudioContext();
    if (!ctx) return Promise.resolve(false);

    let p = Promise.resolve();
    if (ctx.state === 'suspended') {
      p = ctx.resume();
    }
    return p.then(() => {
      this.unlocked = ctx.state === 'running';
      if (this.unlocked && !this.currentVoice && !this.currentTrack) {
        // Start first peaceful track
        this.nextTrack({ fadeSec: 3.5 });
      }
      this.notify();
      return this.unlocked;
    }).catch(err => {
      console.warn('BGM unlock error:', err);
      return false;
    });
  }

  applyVolume() {
    if (!this.masterGain || !this.ctx) return;
    const now = this.ctx.currentTime;
    const target = this.muted ? 0.0 : this.volume;
    this.masterGain.gain.setTargetAtTime(target, now, 0.06);
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, Number(vol) || 0));
    try { localStorage.setItem(BGM_STORAGE_KEYS.VOLUME, this.volume.toFixed(2)); } catch (_) {}
    this.applyVolume();
    this.notify();
  }

  setMuted(muted) {
    this.muted = !!muted;
    try { localStorage.setItem(BGM_STORAGE_KEYS.MUTED, this.muted ? '1' : '0'); } catch (_) {}
    this.applyVolume();
    this.notify();
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  setMode(mode) {
    this.mode = mode === 'continuous' ? 'continuous' : 'ambient';
    try { localStorage.setItem(BGM_STORAGE_KEYS.MODE, this.mode); } catch (_) {}
    this.notify();
  }

  async loadBuffer(track) {
    if (this.buffers.has(track.id)) return this.buffers.get(track.id);
    if (!this.initAudioContext()) return null;

    const url = new URL(`../../assets/music/${track.file}`, import.meta.url).href;
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const arrayBuf = await resp.arrayBuffer();
      const audioBuf = await this.ctx.decodeAudioData(arrayBuf);
      this.buffers.set(track.id, audioBuf);
      return audioBuf;
    } catch (err) {
      console.warn(`Failed to load track ${track.id}:`, err);
      return null;
    }
  }

  chooseNextTrack() {
    const { nightK, inTown } = this.situation;
    // Filter candidates based on situation
    let candidates = TRACKS.filter(t => !this.recentHistory.includes(t.id));
    if (candidates.length === 0) {
      this.recentHistory = [];
      candidates = [...TRACKS];
    }

    let scored = candidates.map(t => {
      let score = 1.0;
      if (inTown) {
        if (t.mood === 'town' || t.mood === 'oasis') score += 6.0;
        else score *= 0.2;
      } else if (nightK > 0.55) {
        if (t.time === 'night' || t.mood === 'camp') score += 5.0;
        if (t.time === 'day') score *= 0.15;
      } else if (nightK < 0.2) {
        if (t.time === 'day' || t.mood === 'wasteland') score += 3.0;
        if (t.time === 'dawn') score += 2.0;
        if (t.time === 'night') score *= 0.15;
      } else {
        // Twilight / dusk
        if (t.time === 'dusk') score += 5.0;
      }
      return { track: t, score };
    });

    // Weighted random selection
    const totalScore = scored.reduce((sum, item) => sum + item.score, 0);
    let r = Math.random() * totalScore;
    for (const item of scored) {
      r -= item.score;
      if (r <= 0) return item.track;
    }
    return scored[0]?.track || TRACKS[0];
  }

  async playTrack(track, { fadeSec = 3.0 } = {}) {
    if (!track) return;
    const ctx = this.initAudioContext();
    if (!ctx) return;

    const buf = await this.loadBuffer(track);
    if (!buf || !this.ctx) return;

    // Crossfade old voice out
    if (this.currentVoice) {
      this.fadeOutVoice(this.currentVoice, fadeSec);
      this.currentVoice = null;
    }

    const source = ctx.createBufferSource();
    source.buffer = buf;

    const voiceGain = ctx.createGain();
    const now = ctx.currentTime;
    voiceGain.gain.setValueAtTime(0.0001, now);
    voiceGain.gain.linearRampToValueAtTime(1.0, now + fadeSec);

    source.connect(voiceGain);
    voiceGain.connect(this.masterGain);

    const voice = {
      source,
      gain: voiceGain,
      track,
      duration: buf.duration,
      startTime: now,
      ended: false,
    };

    source.onended = () => {
      voice.ended = true;
      if (this.currentVoice === voice) {
        this.currentVoice = null;
        // Natural ambient pause between tracks (e.g. 8-12 seconds of quiet wind)
        // or zero in continuous mode.
        const gap = this.mode === 'ambient' ? 8.0 + Math.random() * 6.0 : 0.5;
        this.pauseTimer = gap;
        this.notify();
      }
      try {
        source.disconnect();
        voiceGain.disconnect();
      } catch (_) {}
    };

    source.start(now);
    this.currentVoice = voice;
    this.currentTrack = track;
    this.pauseTimer = 0;

    // Maintain recent history (last 5 tracks)
    this.recentHistory.push(track.id);
    if (this.recentHistory.length > 5) this.recentHistory.shift();

    this.notify();
  }

  fadeOutVoice(voice, fadeSec = 2.5) {
    if (!voice || voice.ended) return;
    try {
      const now = this.ctx.currentTime;
      voice.gain.gain.cancelScheduledValues(now);
      voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
      voice.gain.gain.linearRampToValueAtTime(0.0001, now + fadeSec);
      setTimeout(() => {
        try {
          voice.source.stop();
          voice.source.disconnect();
          voice.gain.disconnect();
        } catch (_) {}
      }, (fadeSec + 0.1) * 1000);
    } catch (_) {}
  }

  nextTrack({ force = false, fadeSec = 2.5 } = {}) {
    if (!this.unlocked) {
      this.unlock();
      return;
    }
    const next = this.chooseNextTrack();
    this.playTrack(next, { fadeSec });
  }

  updateSituation(situation) {
    if (situation) {
      if (typeof situation.nightK === 'number') this.situation.nightK = situation.nightK;
      if (typeof situation.inTown === 'boolean') this.situation.inTown = situation.inTown;
    }
  }

  update(dt = 0.016) {
    if (this.pauseTimer > 0) {
      this.pauseTimer -= dt;
      if (this.pauseTimer <= 0) {
        this.pauseTimer = 0;
        this.nextTrack({ fadeSec: 3.5 });
      }
    }
  }

  onChange(listener) {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  notify() {
    const s = this.getState();
    for (const l of this.listeners) {
      try { l(s); } catch (e) { console.warn(e); }
    }
  }

  getState() {
    return {
      unlocked: this.unlocked,
      volume: this.volume,
      muted: this.muted,
      mode: this.mode,
      currentTrack: this.currentTrack,
      isPlaying: !!this.currentVoice,
      isPausedInAmbientGap: this.pauseTimer > 0,
    };
  }
}

// Global singleton instance for easy import across kenshi-next modules
export const bgm = new BgmPlayer();
