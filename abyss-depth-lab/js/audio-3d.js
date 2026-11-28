/**
 * ABYSS DIVE — Three.js 3D 空間音響マネージャー（Lumina SFX v1.5 生成アセット連携）
 *
 * - THREE.AudioListener を 3D カメラへ装着し、深海環境音・船体低音ドローン・
 *   魚雷・照明弾・ソナー・3D 立体音源（PositionalAudio）を一括管理する。
 * - iOS Safari / Brave の自動再生制限に対応し、初回タップ/キー入力で自動アンロック。
 * - すべての音声は Lumina SFX（CC0 / ローカルオフライン生成 WAV）のみを使用。
 */

import * as THREE from '../vendor/three.module.min.js';

const SFX_FILES = {
  underwater: 'abyss-underwater-loop.wav',
  drone: 'abyss-drone-loop.wav',
  sonar: 'abyss-sonar-ping.wav',
  torpedoFire: 'abyss-torpedo-fire.wav',
  torpedoHit: 'abyss-torpedo-hit.wav',
  flare: 'abyss-flare-ignite.wav',
};

export function createAudio3D(camera, scene) {
  const listener = new THREE.AudioListener();
  camera.add(listener);

  const loader = new THREE.AudioLoader();
  const buffers = Object.create(null);
  let unlocked = false;
  let muted = false;
  let destroyed = false;

  const bedWater = new THREE.Audio(listener);
  const bedDrone = new THREE.Audio(listener);
  const positionalLoops = [];

  function setMuted(next) {
    muted = !!next;
    listener.setMasterVolume(muted ? 0 : 1);
  }

  function startBedsIfReady() {
    if (!unlocked || destroyed) return;
    if (buffers.underwater && !bedWater.isPlaying) {
      bedWater.setBuffer(buffers.underwater);
      bedWater.setLoop(true);
      bedWater.setVolume(0.28);
      bedWater.play();
    }
    if (buffers.drone && !bedDrone.isPlaying) {
      bedDrone.setBuffer(buffers.drone);
      bedDrone.setLoop(true);
      bedDrone.setVolume(0.16);
      bedDrone.play();
    }
    for (const pl of positionalLoops) {
      if (buffers[pl.key] && !pl.audio.isPlaying) {
        pl.audio.setBuffer(buffers[pl.key]);
        pl.audio.setLoop(true);
        pl.audio.setRefDistance(pl.refDist);
        pl.audio.setMaxDistance(pl.maxDist);
        pl.audio.setRolloffFactor(1.4);
        pl.audio.setVolume(pl.volume);
        pl.audio.play();
      }
    }
  }

  // 全 WAV を非同期プリロード
  for (const [key, file] of Object.entries(SFX_FILES)) {
    const url = new URL('../assets/sfx/' + file, import.meta.url).href;
    loader.load(url, (buf) => {
      if (destroyed) return;
      buffers[key] = buf;
      startBedsIfReady();
    }, undefined, () => { /* ロード失敗時は無音で継続 */ });
  }

  function unlock() {
    if (destroyed) return;
    const ctx = listener.context;
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().then(() => {
        unlocked = true;
        startBedsIfReady();
      }).catch(() => {});
    } else {
      unlocked = true;
      startBedsIfReady();
    }
  }

  /** 3D 空間内のオブジェクト（熱水噴出孔・BH ポータル等）へ立体音源を装着する。 */
  function attachSpatialLoop(targetObj, key, opts = {}) {
    const audio = new THREE.PositionalAudio(listener);
    targetObj.add(audio);
    const entry = {
      audio,
      key,
      refDist: opts.refDist ?? 7,
      maxDist: opts.maxDist ?? 42,
      volume: opts.volume ?? 0.55,
    };
    positionalLoops.push(entry);
    startBedsIfReady();
    return audio;
  }

  function playOneShot(key, volume = 0.55, detuneRange = 120) {
    if (!unlocked || muted || destroyed) return;
    const buf = buffers[key];
    if (!buf) return;
    const snd = new THREE.Audio(listener);
    snd.setBuffer(buf);
    snd.setVolume(volume);
    if (detuneRange > 0 && snd.setDetune) {
      snd.setDetune((Math.random() * 2 - 1) * detuneRange);
    }
    snd.play();
  }

  function playSpatialOneShot(key, worldPos, volume = 0.72, refDist = 10) {
    if (!unlocked || muted || destroyed) return;
    const buf = buffers[key];
    if (!buf) return;
    const anchor = new THREE.Object3D();
    anchor.position.copy(worldPos);
    scene.add(anchor);
    const snd = new THREE.PositionalAudio(listener);
    snd.setBuffer(buf);
    snd.setRefDistance(refDist);
    snd.setMaxDistance(65);
    snd.setVolume(volume);
    anchor.add(snd);
    snd.onEnded = () => {
      try { snd.disconnect(); } catch (_) {}
      scene.remove(anchor);
    };
    snd.play();
  }

  /** 毎フレームの速度・ブースト・深度に応じて水中音と船体低音をリアルタイム変調する。 */
  function updateMotion(boostAmt, depthFrac) {
    if (!unlocked || destroyed) return;
    if (bedWater.isPlaying) {
      bedWater.setPlaybackRate(0.92 + boostAmt * 0.34);
      bedWater.setVolume(0.24 + boostAmt * 0.16);
    }
    if (bedDrone.isPlaying) {
      bedDrone.setPlaybackRate(0.84 + boostAmt * 0.28 + depthFrac * 0.12);
      bedDrone.setVolume(0.13 + depthFrac * 0.14 + boostAmt * 0.10);
    }
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    for (const a of [bedWater, bedDrone, ...positionalLoops.map((p) => p.audio)]) {
      try { if (a.isPlaying) a.stop(); a.disconnect(); } catch (_) {}
    }
    camera.remove(listener);
  }

  return {
    unlock,
    setMuted,
    isMuted: () => muted,
    attachSpatialLoop,
    playTorpedoFire: () => playOneShot('torpedoFire', 0.50, 140),
    playTorpedoHit: (pos) => playSpatialOneShot('torpedoHit', pos, 0.78, 12),
    playFlareIgnite: () => playOneShot('flare', 0.48, 100),
    playSonarPing: () => playOneShot('sonar', 0.34, 60),
    updateMotion,
    destroy,
  };
}
