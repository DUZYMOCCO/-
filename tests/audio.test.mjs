import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};
class Parameter {value=0;setTargetAtTime(value){this.value=value;}setValueAtTime(value){this.value=value;}linearRampToValueAtTime(value){this.value=value;} }
class Node {constructor(){this.gain=new Parameter();this.frequency=new Parameter();this.playbackRate=new Parameter();this.pan=new Parameter();}connect(target){this.target=target;}disconnect(){this.disconnected=true;} }
class Source extends Node {start(when=0,offset=0){this.started=true;this.offset=offset;}stop(){this.stopped=true;this.onended?.();}}
class Context {
 constructor(){this.state='suspended';this.sampleRate=22050;this.currentTime=0;this.destination=new Node();this.sources=[];this.resumeCalls=0;}
 createGain(){return new Node();}createBiquadFilter(){return new Node();}createStereoPanner(){return new Node();}
 createDynamicsCompressor(){const n=new Node();for(const key of ['threshold','knee','ratio','attack','release'])n[key]=new Parameter();return n;}
 createBufferSource(){const n=new Source();this.sources.push(n);return n;}
 createBuffer(){return {duration:1/22050};}
 decodeAudioData(bytes,done){const v=new DataView(bytes);assert.equal(String.fromCharCode(...new Uint8Array(bytes,0,4)),'RIFF');const buffer={duration:v.getUint32(40,true)/v.getUint32(28,true)};done(buffer);return Promise.resolve(buffer);}
 resume(){this.resumeCalls++;if(this.rejectResume)return Promise.reject(new Error('gesture fixture'));this.state='running';this.onstatechange?.();return Promise.resolve();}
 suspend(){this.state='suspended';this.onstatechange?.();return Promise.resolve();}
}
globalThis.window={AudioContext:Context};Object.defineProperty(globalThis,'navigator',{configurable:true,value:{audioSession:{type:'auto'}}});
let fetches=0,failMusic=false;
globalThis.fetch=async url=>{fetches++;const path=fileURLToPath(url);if(failMusic&&path.endsWith('music.wav'))return {ok:false,status:503};const bytes=readFileSync(path);return {ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};};
const {SoundEngine,AUDIO_CLIPS,MAX_EFFECT_VOICES}=await import('../js/audio-engine.js');
const sound=new SoundEngine();assert.equal(sound.ctx,null,'loading code does not prematurely open a mobile audio context');sound.startBGM();assert.equal(sound.bgmPlaying,false);
await sound.unlock();await sound.loading;assert.equal(sound.unlocked,true);assert.equal(sound.buffers.size,AUDIO_CLIPS.length);assert.equal(sound.bgmPlaying,true);assert.equal(sound.musicSource.loop,true);assert.equal(navigator.audioSession.type,'playback');
const musicSource=sound.musicSource,initialFetches=fetches;sound.startBGM();assert.equal(sound.musicSource,musicSource,'only one loop exists');
sound.setListener(()=>({x:0,y:0}));assert.equal(sound.playWeapon('bow',4000,0),false,'far army combat is silent');assert.equal(sound.playWeapon('bow',20,0),true);assert.equal(sound.playWeapon('bow',20,0),false,'same-frame bursts are coalesced');
for(let i=0;i<100;i++){sound.ctx.currentTime+=.1;sound.playImpact(i%2?'sword':'hammer',40,0);sound.playMagic('fire',50,0);}
assert.ok(sound.voices.size<=8,'crowd combat is bounded');for(let i=0;i<30;i++){sound.ctx.currentTime+=2;sound.playHighScore();}assert.ok(sound.voices.size<=MAX_EFFECT_VOICES);assert.equal(fetches,initialFetches,'effects reuse decoded PCM');
const retiring=sound.voices.values().next().value;retiring.source.onended();assert.equal(retiring.source.disconnected,true);assert.ok(!sound.voices.has(retiring));
sound.setMute(true);assert.equal(sound.bgmPlaying,false);assert.equal(sound.master.gain.value,0);assert.equal(sound.voices.size,0);assert.equal(sound.playTap(),false);assert.equal(navigator.audioSession.type,'auto');sound.setMute(false);assert.equal(sound.bgmPlaying,true);
sound.ctx.currentTime+=3;const offset=sound.bgmOffset;sound.setPageHidden(true);assert.equal(sound.bgmPlaying,false);assert.equal(sound.ctx.state,'suspended');assert.ok(sound.bgmOffset>offset);const resumeAt=sound.bgmOffset;sound.setPageHidden(false);await Promise.resolve();assert.equal(sound.bgmPlaying,true);assert.equal(sound.musicSource.offset,resumeAt);
sound.ctx.state='interrupted';sound.ctx.onstatechange();assert.equal(sound.unlocked,false);assert.equal(sound.bgmPlaying,false);await sound.unlock();assert.equal(sound.bgmPlaying,true,'touch recovery handles interrupted, not just suspended, contexts');
const retiredContext=sound.ctx,retiredChange=retiredContext.onstatechange;retiredContext.state='closed';await sound.unlock();assert.notEqual(sound.ctx,retiredContext);assert.equal(sound.bgmPlaying,true);const recoveredLoop=sound.musicSource;retiredChange();assert.equal(sound.musicSource,recoveredLoop,'late events from a retired context cannot stop the new loop');
sound.setVolumes({bgm:.2,effects:.4});const remembered=new SoundEngine();assert.equal(remembered.bgmVolume,.2);assert.equal(remembered.effectVolume,.4);sound.setVolumes({bgm:0});assert.equal(sound.bgmPlaying,false);sound.setVolumes({bgm:.3});assert.equal(sound.bgmPlaying,true);
let updates=0;const unsubscribe=sound.subscribe(()=>updates++);sound.setMute(true);assert.ok(updates>=2);unsubscribe();const count=updates;sound.setMute(false);assert.equal(updates,count);
sound.stopBGM();assert.equal(sound.bgmPlaying,false);assert.equal(sound.bgmWanted,false);assert.equal(navigator.audioSession.type,'auto');
memory.clear();const failed=new SoundEngine();failed.initAudioContext();failed.ctx.rejectResume=true;assert.equal(await failed.unlock(),false);assert.equal(failed.unlocked,false,'failure is never reported as an unlocked context');await failed.loading;
const log=console.warn;console.warn=()=>{};failMusic=true;const retry=new SoundEngine();retry.startBGM();await retry.unlock();await retry.loading;assert.ok(retry.failed.has('music'));assert.equal(retry.bgmPlaying,false);failMusic=false;await retry.unlock();await retry.loading;assert.equal(retry.bgmPlaying,true);assert.equal(retry.failed.size,0);console.warn=log;
// Inspect the actual shipped PCM rather than only exercising an audio mock.
const manifest=JSON.parse(readFileSync(new URL('../assets/audio/manifest.json',import.meta.url),'utf8'));
for(const name of AUDIO_CLIPS){const bytes=readFileSync(new URL(`../assets/audio/${name}.wav`,import.meta.url));const pcm=new Int16Array(bytes.buffer,bytes.byteOffset+44,(bytes.length-44)/2);let energy=0,peak=0;for(const x of pcm){const s=x/32768;energy+=s*s;peak=Math.max(peak,Math.abs(s));}assert.ok(Math.sqrt(energy/pcm.length)>.02,`${name} is not a silent file`);assert.ok(peak<.85,`${name} is not clipped`);assert.equal(manifest.clips[name].channels,bytes.readUInt16LE(22));if(name==='music'){assert.equal(pcm[0],pcm.at(-2));assert.equal(pcm[1],pcm.at(-1));}}
// Actual game sound controls exercise the same shared engine used by combat.
const {JSDOM}=await import('../__pycache__/ui-tools/node_modules/jsdom/lib/api.js');
const dom=new JSDOM('<div id="game"></div>',{url:'http://localhost/'});dom.window.AudioContext=Context;Object.assign(globalThis,{window:dom.window,document:dom.window.document});
const noop=()=>{};window.HTMLCanvasElement.prototype.getContext=()=>new Proxy({measureText:()=>({width:40})},{get:(o,k)=>o[k]||noop});
const {IronSquadGame}=await import('../js/games/iron-squad/index.js');const {sound:shared}=await import('../js/audio.js?v=104');const game=Object.create(IronSquadGame);game.container=document.getElementById('game');game.setupUI();shared.startBGM();document.getElementById('btn-field-sound').click();await Promise.resolve();await shared.loading;assert.equal(shared.bgmPlaying,true);assert.equal(document.getElementById('btn-field-sound').textContent,'音 ON');
const musicSlider=document.querySelector('[data-audio-volume="bgm"]');musicSlider.value='47';musicSlider.dispatchEvent(new window.Event('input',{bubbles:true}));assert.equal(shared.bgmVolume,.47);assert.equal(musicSlider.nextElementSibling.textContent,'47%');
document.getElementById('btn-field-sound').click();assert.equal(shared.isMuted,true);assert.equal(shared.bgmPlaying,false);document.querySelector('[data-audio="resume"]').click();await Promise.resolve();assert.equal(shared.isMuted,false);assert.equal(shared.bgmPlaying,true);game.audioUIUnsubscribe();shared.stopBGM();dom.window.close();
console.log('PASS: real WAV decode/energy/peaks/loop joins, lazy gesture audio, failed/interrupted resume, one cached BGM, mute/unmute/background recovery, bounded/disconnected/spatial voices, no per-hit downloads, persisted independent volumes, subscription cleanup and failed asset retry');
