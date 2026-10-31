import { heightAt } from '../sim/terrain.js';
import { GIANTS_FAR } from './giants_plan.js';
// レンダラ、シーン、昼夜の光。iPhone でも軽くなる設定にする。

import * as THREE from 'three';

const DAY_SKY = new THREE.Color('#b9c9d6');
const NIGHT_SKY = new THREE.Color('#0b1420');
const DUSK_SKY = new THREE.Color('#c98a63');
const DAY_HEMI = new THREE.Color('#cfe3ff');
const NIGHT_HEMI = new THREE.Color('#26344f');
const DUSK_HEMI = new THREE.Color('#f0b48a');
const DAY_SUN = new THREE.Color('#fff3dc');
const DUSK_SUN = new THREE.Color('#ffb070');

// 影の範囲は注視点の周り ±28m。1テクセルの大きさは 範囲*2/mapSize。
const SHADOW_EXTENT = 28;
const SHADOW_MAP_SIZE = 1024;
const SHADOW_TEXEL = (SHADOW_EXTENT * 2) / SHADOW_MAP_SIZE;
const SUN_MOVE_MIN = 0.5;
const SUN_UPDATE_SEC = 1;
const DEFAULT_FOCUS = { x: 0, z: 0 };

function clamp01(v) {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = DAY_SKY.clone();
  scene.fog = new THREE.Fog(DAY_SKY.clone(), 900, 5000);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, Math.max(GIANTS_FAR, 5500));

  const hemi = new THREE.HemisphereLight(DAY_HEMI.clone(), 0x6b4f36, 0.9);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(DAY_SUN.clone(), 2.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
  sun.shadow.camera.left = -SHADOW_EXTENT;
  sun.shadow.camera.right = SHADOW_EXTENT;
  sun.shadow.camera.top = SHADOW_EXTENT;
  sun.shadow.camera.bottom = -SHADOW_EXTENT;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 320;
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);
  scene.add(sun.target);

  const sky = new THREE.Color();
  const hemiSky = new THREE.Color();
  const sunColor = new THREE.Color();
  const dusk = new THREE.Color();

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  }
  resize();

  // 画素比を変えた時だけ呼ぶ（毎フレームの setSize を避ける）。
  function setPixelRatio(value) {
    const next = Math.max(0.5, Math.min(2, Number(value) || 1));
    if (Math.abs(renderer.getPixelRatio() - next) < 0.001) return;
    renderer.setPixelRatio(next);
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  }

  let sunReady = false;
  let sunElapsed = 0;
  let sunFx = 0;
  let sunFz = 0;

  function updateDayNight(timeSec, focus, dt) {
    const daySec = ((Number(timeSec) || 0) % 86400 + 86400) % 86400;
    const hour = daySec / 3600;
    const a = ((hour - 6) / 12) * Math.PI;
    const sy = Math.sin(a);
    const dayAmount = clamp01((sy + 0.12) / 0.42);
    const duskAmount = clamp01(1 - Math.abs(sy) / 0.35) * (sy > -0.25 ? 1 : 0);

    sky.copy(NIGHT_SKY).lerp(DAY_SKY, dayAmount);
    dusk.copy(DUSK_SKY);
    sky.lerp(dusk, duskAmount * 0.45);
    scene.background.copy(sky);
    scene.fog.color.copy(sky);

    hemiSky.copy(NIGHT_HEMI).lerp(DAY_HEMI, dayAmount);
    hemiSky.lerp(DUSK_HEMI, duskAmount * 0.5);
    hemi.color.copy(hemiSky);
    hemi.intensity = 0.28 + dayAmount * 0.8;

    sunColor.copy(DAY_SUN).lerp(DUSK_SUN, duskAmount);
    sun.color.copy(sunColor);
    sun.intensity = 0.12 + dayAmount * 2.1;

    const f = focus || DEFAULT_FOCUS;
    const fx = Number(f.x) || 0;
    const fz = Number(f.z) || 0;
    const step = Number(dt) || 0;
    sunElapsed += step;
    const moved = Math.abs(fx - sunFx) + Math.abs(fz - sunFz);
    if (!sunReady || moved >= SUN_MOVE_MIN || sunElapsed >= SUN_UPDATE_SEC) {
      sunReady = true;
      sunElapsed = 0;
      sunFx = fx;
      sunFz = fz;
      const lx = Math.round(fx / SHADOW_TEXEL) * SHADOW_TEXEL;
      const lz = Math.round(fz / SHADOW_TEXEL) * SHADOW_TEXEL;
      const dirX = Math.cos(a) * 0.8 + 0.35;
      const dirY = Math.max(0.12, sy);
      const dirZ = 0.55;
      const fy = heightAt(lx, lz);
      sun.position.set(lx + dirX * 130, fy + dirY * 140 + 8, lz + dirZ * 130);
      sun.target.position.set(lx, fy, lz);
      sun.target.updateMatrixWorld();
    }
  }

  return {
    renderer,
    scene,
    camera,
    hemi,
    sun,
    resize,
    setPixelRatio,
    updateDayNight,
  };
}
