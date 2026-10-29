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
  scene.fog = new THREE.Fog(DAY_SKY.clone(), 90, 360);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1200);

  const hemi = new THREE.HemisphereLight(DAY_HEMI.clone(), 0x6b4f36, 0.9);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(DAY_SUN.clone(), 2.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -40;
  sun.shadow.camera.right = 40;
  sun.shadow.camera.top = 40;
  sun.shadow.camera.bottom = -40;
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

  function updateDayNight(timeSec, focus) {
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

    const f = focus || { x: 0, z: 0 };
    const fx = Number(f.x) || 0;
    const fz = Number(f.z) || 0;
    const dirX = Math.cos(a) * 0.8 + 0.35;
    const dirY = Math.max(0.12, sy);
    const dirZ = 0.55;
    sun.position.set(fx + dirX * 130, dirY * 140 + 8, fz + dirZ * 130);
    sun.target.position.set(fx, 0, fz);
    sun.target.updateMatrixWorld();
  }

  return {
    renderer,
    scene,
    camera,
    hemi,
    sun,
    resize,
    updateDayNight,
  };
}
