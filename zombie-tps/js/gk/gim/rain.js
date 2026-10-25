// v0.17.0: ギミック「あめ」（ステージ3 あめの はいきょとし・あとから よむ）
// カメラの まわりだけ ほそい せんの あめを ふらせる（LineSegments 1こ・SE2 でも かるい）
import * as THREE from '../../../vendor/three.module.min.js';

export function create(game) {
  const N = game.quality === 0 ? 300 : 600, W = 24, H = 14, SPEED = 17, LEN = 0.55, SLANT = 0.12;
  const seed = new Float32Array(N * 3), pos = new Float32Array(N * 6);
  for (let i = 0; i < N; i++) { seed[i * 3] = (Math.random() - 0.5) * W; seed[i * 3 + 1] = Math.random() * H; seed[i * 3 + 2] = (Math.random() - 0.5) * W; }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.LineBasicMaterial({ color: 0xa8bed4, transparent: true, opacity: 0.42, depthWrite: false });
  const lines = new THREE.LineSegments(geo, mat); lines.frustumCulled = false; lines.renderOrder = 3;
  game.scene.add(lines);
  let t = 0;
  function tick(dt) {
    t += dt;
    const c = game.camera.position, y0 = Math.max(0, c.y - 5);
    for (let i = 0; i < N; i++) {
      const y = y0 + H - ((seed[i * 3 + 1] + t * SPEED) % H), x = c.x + seed[i * 3], z = c.z + seed[i * 3 + 2], j = i * 6;
      pos[j] = x; pos[j + 1] = y; pos[j + 2] = z;
      pos[j + 3] = x + SLANT; pos[j + 4] = y + LEN; pos[j + 5] = z;
    }
    geo.attributes.position.needsUpdate = true;
  }
  function dispose() { game.scene.remove(lines); geo.dispose(); mat.dispose(); }
  tick(0);
  return { tick, remap() {}, dispose };
}
