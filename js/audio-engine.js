import {storage} from './storage.js';

export const AUDIO_CLIPS=['music','tap','hit','metal','slash','hammer','bow','crossbow','cannon','stone','heal','coin','fire','ice','lightning','blast','down','reward','defeat'];
export const MAX_EFFECT_VOICES=14;
const COMBAT_LIMIT=8;
const clamp=(value,fallback)=>Number.isFinite(Number(value))?Math.max(0,Math.min(1,Number(value))):fallback;

/** Cached PCM samples, one music loop, and a bounded mixer. No per-hit synthesis. */
export class SoundEngine {
  constructor() {
    this.ctx=null;this.unlocked=false;this.isMuted=typeof localStorage!=='undefined'?storage.getSoundMuted():false;
    const mix=typeof localStorage!=='undefined'?storage.get('sound_mix_v2',{}):{};
    this.bgmVolume=clamp(mix?.bgm,.35);this.effectVolume=clamp(mix?.effects,.65);
    this.buffers=new Map();this.failed=new Set();this.voices=new Set();this.lastPlayed=new Map();this.listeners=new Set();
    this.bgmWanted=false;this.bgmPlaying=false;this.bgmMode='field';this.bgmOffset=0;this.pageHidden=false;this.loading=null;this.spatialListener=null;
  }
  get state() {
    const available=!!(this.ctx||globalThis.window?.AudioContext||globalThis.window?.webkitAudioContext);
    return {available,muted:this.isMuted,context:this.ctx?.state||'locked',unlocked:this.unlocked,loading:!!this.loading,ready:this.buffers.has('music'),failed:this.failed.size,bgmPlaying:this.bgmPlaying,bgm:this.bgmVolume,effects:this.effectVolume};
  }
  subscribe(listener) {this.listeners.add(listener);listener(this.state);return ()=>this.listeners.delete(listener);}
  publish() {const state=this.state;for(const listener of this.listeners)listener(state);}
  initAudioContext() {
    if(this.ctx&&this.ctx.state!=='closed')return this.ctx;
    const Constructor=globalThis.window?.AudioContext||globalThis.window?.webkitAudioContext;
    if(!Constructor)return null;
    if(this.ctx){this.pauseMusic();for(const v of [...this.voices])this.retire(v);this.ctx.onstatechange=null;this.unlocked=false;}
    try {
      try{this.ctx=new Constructor({latencyHint:'interactive'});}catch{this.ctx=new Constructor();}
      const c=this.ctx;this.master=c.createGain();this.effects=c.createGain();this.music=c.createGain();
      this.musicFilter=c.createBiquadFilter();this.musicFilter.type='lowpass';
      this.limiter=c.createDynamicsCompressor();
      for(const [key,value] of Object.entries({threshold:-14,knee:16,ratio:6,attack:.003,release:.2}))this.limiter[key].value=value;
      this.effects.connect(this.limiter);this.music.connect(this.musicFilter);this.musicFilter.connect(this.limiter);this.limiter.connect(this.master);this.master.connect(c.destination);
      c.onstatechange=()=>{if(c!==this.ctx)return;this.unlocked=c.state==='running';if(this.unlocked)this.syncMusic();else this.pauseMusic();this.publish();};
      this.applyVolumes();return c;
    } catch(error){console.warn('Audio initialization failed',error);this.ctx=null;return null;}
  }
  session(type) {try{if(globalThis.navigator?.audioSession)navigator.audioSession.type=type;}catch{/* Unsupported audio-session behavior falls back to ordinary audio. */}}
  // Call on a real touch / click / key gesture; do not mark a failed resume as unlocked.
  unlock() {
    const c=this.initAudioContext();if(!c){this.publish();return Promise.resolve(false);}
    if(this.bgmWanted&&!this.isMuted&&this.bgmVolume)this.session('playback');
    if(this.pageHidden)return Promise.resolve(false);
    if(!this.unlocked){const s=c.createBufferSource();s.buffer=c.createBuffer(1,1,c.sampleRate);s.connect(this.master);s.onended=()=>s.disconnect();s.start();}
    let resumed;
    try{resumed=c.state==='running'?Promise.resolve():c.resume();}catch(error){resumed=Promise.reject(error);}
    this.preload();
    return Promise.resolve(resumed).then(()=>{if(c!==this.ctx)return false;this.unlocked=c.state==='running';this.syncMusic();this.publish();return this.unlocked;}).catch(()=>{if(c!==this.ctx)return false;this.unlocked=c.state==='running';this.publish();return this.unlocked;});
  }
  decode(data) {
    return new Promise((resolve,reject)=>{const promise=this.ctx.decodeAudioData(data,resolve,reject);promise?.then?.(resolve,reject);});
  }
  preload() {
    if(!this.ctx)return Promise.resolve();if(this.loading)return this.loading;
    const missing=AUDIO_CLIPS.filter(name=>!this.buffers.has(name));if(!missing.length)return Promise.resolve();
    this.loading=Promise.allSettled(missing.map(async name=>{
      try{const response=await fetch(new URL(`../assets/audio/${name}.wav?v=132`,import.meta.url));if(!response.ok)throw new Error(`HTTP ${response.status}`);const buffer=await this.decode(await response.arrayBuffer());this.buffers.set(name,buffer);this.failed.delete(name);if(name==='music')this.syncMusic();}
      catch(error){this.failed.add(name);console.warn(`Audio asset unavailable: ${name}`,error);}
    })).then(()=>{this.loading=null;this.syncMusic();this.publish();});
    this.publish();return this.loading;
  }
  applyVolumes() {
    if(!this.ctx||!this.master)return;const now=this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.isMuted||this.pageHidden?0:.85,now,.025);
    this.effects.gain.setTargetAtTime(this.effectVolume,now,.03);
    this.music.gain.setTargetAtTime(this.bgmVolume*(this.bgmMode==='quiet'?.55:this.bgmMode==='night'?.82:1),now,.2);
    this.musicFilter.frequency.setTargetAtTime(this.bgmMode==='night'?1800:5200,now,.3);
  }
  setMute(muted) {
    this.isMuted=!!muted;storage.setSoundMuted(this.isMuted);this.applyVolumes();
    if(this.isMuted){this.session('auto');this.pauseMusic();for(const v of [...this.voices])this.retire(v);}else this.syncMusic();this.publish();
  }
  toggleMute() {this.setMute(!this.isMuted);return this.isMuted;}
  setVolumes({bgm=this.bgmVolume,effects=this.effectVolume}={}) {
    this.bgmVolume=clamp(bgm,.35);this.effectVolume=clamp(effects,.65);storage.set('sound_mix_v2',{bgm:this.bgmVolume,effects:this.effectVolume});this.applyVolumes();
    if(!this.bgmVolume)this.pauseMusic();else this.syncMusic();this.publish();
  }
  setBGMMode(mode='field') {if(mode===this.bgmMode)return;this.bgmMode=mode;this.applyVolumes();}
  setListener(listener) {this.spatialListener=listener;}
  startBGM() {this.bgmWanted=true;if(this.ctx&&this.unlocked){if(!this.isMuted&&this.bgmVolume)this.session('playback');this.preload();this.syncMusic();}}
  syncMusic() {
    const buffer=this.buffers.get('music');
    if(this.bgmPlaying||!this.bgmWanted||this.isMuted||this.pageHidden||!this.bgmVolume||!buffer||this.ctx?.state!=='running')return;
    this.session('playback');const source=this.ctx.createBufferSource(),fade=this.ctx.createGain();source.buffer=buffer;source.loop=true;source.connect(fade);fade.connect(this.music);fade.gain.setValueAtTime(0,this.ctx.currentTime);fade.gain.linearRampToValueAtTime(1,this.ctx.currentTime+.25);
    this.musicSource=source;this.bgmStartTime=this.ctx.currentTime;this.bgmOffset%=buffer.duration;this.bgmPlaying=true;
    source.onended=()=>{source.disconnect();fade.disconnect();if(this.musicSource===source){this.musicSource=null;this.bgmPlaying=false;}};
    source.start(0,this.bgmOffset);
  }
  pauseMusic() {
    if(!this.musicSource)return;const source=this.musicSource;this.musicSource=null;
    this.bgmOffset=(this.bgmOffset+Math.max(0,this.ctx.currentTime-this.bgmStartTime))%source.buffer.duration;this.bgmPlaying=false;
    try{source.stop();}catch{/* Already-ended source. */}source.disconnect();
  }
  stopBGM() {this.bgmWanted=false;this.pauseMusic();for(const v of [...this.voices])if(v.group!=='ui')this.retire(v);this.bgmOffset=0;this.session('auto');this.publish();}
  setPageHidden(hidden) {
    if(this.pageHidden===!!hidden)return;this.pageHidden=!!hidden;
    if(hidden){this.session('auto');this.pauseMusic();for(const v of [...this.voices])this.retire(v);try{this.ctx?.suspend?.().catch(()=>{});}catch{}}
    else if(this.ctx){try{Promise.resolve(this.ctx.resume()).then(()=>{this.unlocked=this.ctx.state==='running';this.syncMusic();this.publish();}).catch(()=>{this.unlocked=false;this.publish();});}catch{this.unlocked=false;this.publish();}}
    this.applyVolumes();this.publish();
  }
  retire(voice) {try{voice.source.stop();}catch{/* Already-ended source. */}voice.release();}
  play(name,{group='combat',gap=.06,volume=1,x=null,y=null,priority=false}={}) {
    if(this.isMuted||this.pageHidden||!this.effectVolume||this.ctx?.state!=='running')return false;
    const buffer=this.buffers.get(name);if(!buffer)return false;
    let pan=0;
    if(Number.isFinite(x)&&Number.isFinite(y)&&this.spatialListener){const listener=this.spatialListener();if(listener){const distance=Math.hypot(x-listener.x,y-listener.y);if(distance>=850)return false;volume*=Math.pow(1-distance/850,.7);pan=Math.max(-.7,Math.min(.7,(x-listener.x)/550));}}
    const now=this.ctx.currentTime,key=`${group}:${name}`;if(now-(this.lastPlayed.get(key)??-Infinity)<gap)return false;
    const combatCount=[...this.voices].filter(v=>v.group==='combat').length;
    if(!priority&&(this.voices.size>=MAX_EFFECT_VOICES||group==='combat'&&combatCount>=COMBAT_LIMIT))return false;
    if(this.voices.size>=MAX_EFFECT_VOICES){const old=[...this.voices].find(v=>v.group==='combat')||this.voices.values().next().value;this.retire(old);}
    const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=buffer;source.playbackRate.value=group==='combat'?.96+Math.random()*.08:1;gain.gain.value=Math.max(0,Math.min(1,volume));source.connect(gain);
    const panner=this.ctx.createStereoPanner?.();if(panner){panner.pan.value=pan;gain.connect(panner);panner.connect(this.effects);}else gain.connect(this.effects);
    const voice={source,group,release:()=>{if(!this.voices.delete(voice))return;source.disconnect();gain.disconnect();panner?.disconnect();}};
    this.voices.add(voice);this.lastPlayed.set(key,now);source.onended=voice.release;source.start();return true;
  }
  playWeapon(style,x,y) {return this.play(({sword:'slash',spear:'slash',hammer:'hammer',axe:'slash',bow:'bow',crossbow:'crossbow',cannon:'cannon',stone:'stone'})[style]||'slash',{x,y,volume:style==='cannon'?.7:.75,gap:.08});}
  playImpact(style,x,y) {return this.play(['sword','spear','axe'].includes(style)?'metal':style==='hammer'?'hammer':'hit',{x,y,volume:.55,gap:.08});}
  playMagic(affinity,x,y) {return this.play(MAGIC_NAMES[affinity]||'heal',{x,y,volume:.72,gap:.14});}
  playHurt(x,y) {return this.play('hit',{x,y,volume:.48,gap:.12});}
  playDown(x,y) {return this.play('down',{x,y,volume:.7,gap:.16});}
  playHeal(x,y) {return this.play('heal',{x,y,volume:.55,gap:.45});}
  playTap() {return this.play('tap',{group:'ui',priority:true,gap:.04,volume:.65});}
  playHit() {return this.play('hit',{volume:.5,gap:.08});}
  playBreak() {return this.play('metal',{volume:.7,gap:.1});}
  playLaunch() {return this.play('bow',{group:'ui',volume:.55,gap:.2});}
  playItem() {return this.play('coin',{group:'item',volume:.6,gap:.25});}
  playLaser() {return this.play('lightning',{volume:.6,gap:.2});}
  playBomb() {return this.play('blast',{volume:.6,gap:.22});}
  playNoise() {return this.playBomb();}
  playSlash() {return this.play('slash',{volume:.65,gap:.08});}
  playHighScore() {return this.play('reward',{group:'progress',priority:true,volume:.58,gap:1.2});}
  playGameOver() {this.stopBGM();return this.play('defeat',{group:'progress',priority:true,volume:.7,gap:1.5});}
}
const MAGIC_NAMES={fire:'fire',ice:'ice',lightning:'lightning',explosion:'blast'};
