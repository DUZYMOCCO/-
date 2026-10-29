// 起動、ループ、URL引数、window.__game。ルール層と描画層をつなぐ。

import * as THREE from 'three';
import { createWorld, step, applyCommand, heightAt } from './sim/index.js';
import { createScene } from './render/scene.js';
import { createTerrain } from './render/terrain.js';
import { createCameraRig } from './render/camera.js';
import { loadDollTemplate, createDollManager } from './render/dolls.js';
import { createInput } from './ui/input.js';
import { createHud } from './ui/hud.js';

const canvas = document.getElementById('game');
const params = new URLSearchParams(window.location.search);

function numberParam(name, fallback) {
  const raw = params.get(name);
  if (raw === null || raw === '') return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

const seed = Math.floor(numberParam('seed', 12345));
let speed = numberParam('speed', 1);
if (![0, 1, 2, 3, 5].includes(speed)) speed = 1;
const skipTicks = Math.max(0, Math.floor(numberParam('skip', 0)));
const followParam = params.get('follow') !== '0';
const camRaw = (params.get('cam') || '').split(',').map((value) => Number(value));
const camValid = camRaw.length >= 2 && Number.isFinite(camRaw[0]) && Number.isFinite(camRaw[1]);
const camDistance = camRaw.length >= 3 && Number.isFinite(camRaw[2]) ? camRaw[2] : 30;

let state = createWorld(seed);
for (let i = 0; i < skipTicks; i += 1) step(state);

const sceneCtx = createScene(canvas);
const terrain = createTerrain(sceneCtx.scene, state);

let template = null;
try {
  template = await loadDollTemplate('assets/doll.glb');
} catch (err) {
  console.warn('人形の読み込みに失敗しました。予備の人形で表示します。', err);
}

const dolls = createDollManager(sceneCtx.scene, template);
dolls.sync(state);

function findPlayer() {
  for (const actor of state.actors) {
    if (actor.id === state.playerId) return actor;
  }
  return null;
}

const startPlayer = findPlayer();
const initX = camValid ? camRaw[0] : startPlayer ? startPlayer.x : 0;
const initZ = camValid ? camRaw[1] : startPlayer ? startPlayer.z : 0;

const rig = createCameraRig(sceneCtx.camera, {
  x: initX,
  z: initZ,
  distance: camValid ? camDistance : 30,
  follow: followParam,
});
rig.apply();

const markerGeo = new THREE.RingGeometry(0.4, 0.66, 24);
markerGeo.rotateX(-Math.PI / 2);
const marker = new THREE.Mesh(
  markerGeo,
  new THREE.MeshBasicMaterial({
    color: 0xffe28a,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
);
marker.visible = false;
marker.renderOrder = 2;
sceneCtx.scene.add(marker);
let markerUntil = 0;

let accumulator = 0;
let hud = null;

function setSpeed(n) {
  if (![0, 1, 2, 3, 5].includes(n)) return;
  speed = n;
  if (hud) hud.setSpeed(n);
}

function command(cmd) {
  return applyCommand(state, cmd);
}

function restart() {
  state = createWorld(seed);
  dolls.reset(state);
  const player = findPlayer();
  if (player) rig.setTarget(player.x, player.z);
  rig.setFollow(followParam);
  rig.apply();
  marker.visible = false;
  accumulator = 0;
  if (hud) hud.setFollow(rig.getFollow());
  window.__game.state = state;
}

hud = createHud({
  onSpeed(n) {
    setSpeed(n);
  },
  onFollow() {
    rig.setFollow(!rig.getFollow());
    hud.setFollow(rig.getFollow());
  },
  onRestart() {
    restart();
  },
});

const input = createInput({
  canvas,
  camera: sceneCtx.camera,
  rig,
  getPickables: () => dolls.getPickables(),
  groundMesh: terrain.ground,
  onAttack(id) {
    applyCommand(state, { type: 'attack', targetId: id });
  },
  onMove(x, z) {
    applyCommand(state, { type: 'move', x, z });
    marker.position.set(x, heightAt(x, z) + 0.07, z);
    marker.visible = true;
    markerUntil = performance.now() + 1000;
  },
});

const gameApi = {
  state,
  setSpeed,
  command,
  fps: 0,
};
window.__game = gameApi;

window.addEventListener('resize', () => {
  sceneCtx.resize();
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    last = performance.now();
    accumulator = 0;
  }
});

let last = performance.now();
let fpsFrames = 0;
let fpsElapsed = 0;
let fpsValue = 0;
let firstFrame = true;

function frame(now) {
  const raw = (now - last) / 1000;
  last = now;
  const dt = Math.min(0.25, Math.max(0, raw));
  const player = findPlayer();

  if (!document.hidden && speed > 0 && !state.gameOver) {
    accumulator += (dt * speed) / 0.1;
    let count = 0;
    while (accumulator >= 1 && count < 30 && !state.gameOver) {
      step(state);
      accumulator -= 1;
      count += 1;
    }
  }

  if (rig.getFollow() && player) rig.setTarget(player.x, player.z);
  rig.apply();

  dolls.sync(state);
  dolls.update(dt, speed, state);
  sceneCtx.updateDayNight(state.timeSec, rig.getTarget());

  if (marker.visible && performance.now() > markerUntil) marker.visible = false;

  sceneCtx.renderer.render(sceneCtx.scene, sceneCtx.camera);

  fpsFrames += 1;
  fpsElapsed += Math.max(0, raw);
  if (fpsElapsed >= 1) {
    fpsValue = fpsFrames / fpsElapsed;
    fpsFrames = 0;
    fpsElapsed = 0;
    gameApi.fps = fpsValue;
  }

  hud.update(state, { speed, follow: rig.getFollow(), fps: fpsValue });

  if (firstFrame) {
    firstFrame = false;
    window.__ready = true;
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

export { input };
