import * as THREE from 'three';

// 天候はゲーム内の日付とシードから決める。セーブや再読込でも同じ日には同じ空になる。
const TYPES = ['clear', 'clear', 'clear', 'rain', 'storm', 'sandstorm', 'fog', 'red'];
const STYLES = {
  clear: { color: 0xffffff, mix: 0, near: 900, far: 5000, light: 1 },
  rain: { color: 0x768998, mix: .62, near: 180, far: 1600, light: .8 },
  storm: { color: 0x46535e, mix: .8, near: 100, far: 850, light: .58 },
  sandstorm: { color: 0xb98a58, mix: .83, near: 55, far: 430, light: .72 },
  fog: { color: 0xaab5b0, mix: .82, near: 35, far: 330, light: .82 },
  red: { color: 0xa52d2a, mix: .78, near: 250, far: 2200, light: .85 },
};
const keys = Object.keys(STYLES);

export function weatherForDay(seed, day) {
  let n = (Math.imul((Number(seed) || 1) ^ 0x5eeda11, 0x9e3779b1) + Math.imul(day | 0, 0x85ebca6b)) | 0;
  n = Math.imul(n ^ (n >>> 16), 0x7feb352d);
  n = Math.imul(n ^ (n >>> 15), 0x846ca68b);
  return TYPES[((n ^ (n >>> 16)) >>> 0) % TYPES.length];
}

export function createWeather(scene, camera, override = '') {
  const count = 420;
  const positions = new Float32Array(count * 6);
  const seeds = Array.from({ length: count }, (_, i) => ({
    x: ((i * 73 % 421) / 421 - .5) * 100,
    y: (i * 137 % 419) / 419 * 60,
    z: ((i * 197 % 409) / 409 - .5) * 100,
  }));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  const material = new THREE.LineBasicMaterial({ color: 0xc4d5dd, transparent: true, opacity: 0, depthWrite: false });
  const particles = new THREE.LineSegments(geometry, material);
  particles.frustumCulled = false;
  particles.renderOrder = 2;
  scene.add(particles);
  const tint = new THREE.Color();
  const fromColor = new THREE.Color();
  const toColor = new THREE.Color();
  let elapsed = 0;
  let current = 'clear';
  const forced = keys.includes(override) ? override : null;

  function update(timeSec, seed, dt, hemi, sun) {
    const time = Math.max(0, Number(timeSec) || 0);
    const day = Math.floor(time / 86400);
    const blend = forced ? 1 : Math.min(1, (time % 86400) / 3600);
    const previous = STYLES[forced || weatherForDay(seed, day - 1)];
    current = forced || weatherForDay(seed, day);
    const next = STYLES[current];
    const mix = (key) => THREE.MathUtils.lerp(previous[key], next[key], blend);
    tint.copy(fromColor.setHex(previous.color)).lerp(toColor.setHex(next.color), blend);
    const strength = mix('mix');
    scene.background.lerp(tint, strength);
    scene.fog.color.copy(scene.background);
    scene.fog.near = mix('near');
    scene.fog.far = mix('far');
    hemi.color.lerp(tint, strength * .3);
    hemi.intensity *= mix('light');
    sun.color.lerp(tint, strength * .25);
    sun.intensity *= mix('light');

    elapsed += Math.min(.1, Math.max(0, Number(dt) || 0));
    const rain = current === 'rain' || current === 'storm';
    const sand = current === 'sandstorm';
    particles.visible = rain || sand;
    if (particles.visible) {
      material.color.setHex(sand ? 0xdab27d : 0xc4d5dd);
      material.opacity = (sand ? .28 : current === 'storm' ? .5 : .35) * blend;
      particles.position.copy(camera.position);
      const speed = sand ? 16 : current === 'storm' ? 32 : 23;
      for (let i = 0; i < count; i++) {
        const s = seeds[i], at = i * 6;
        const x = ((s.x + elapsed * (sand ? 13 : 3) + 50) % 100 + 100) % 100 - 50;
        const y = ((s.y - elapsed * speed) % 60 + 60) % 60 - 30;
        positions[at] = x; positions[at + 1] = y; positions[at + 2] = s.z;
        positions[at + 3] = x + (sand ? 1.5 : .2);
        positions[at + 4] = y + (sand ? .12 : 1.3); positions[at + 5] = s.z;
      }
      geometry.attributes.position.needsUpdate = true;
    }
    // 稲光は控えめな短い明滅に留める。
    if (current === 'storm' && elapsed % 13 < .12) hemi.intensity += .3 * blend;
  }
  return { update, current: () => current };
}
