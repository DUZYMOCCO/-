import * as THREE from 'three';
import { visionRange } from '../sim/stealth.js';
import { lightAtActor } from '../sim/light.js';
import { actorWorldY } from '../sim/floors.js';
import { advanceLookoutOpacity, lookoutConeTargetOpacity, lookoutDisplayHalfAngle } from './lookout_cone_logic.js';

const SEGMENTS = 1;
const HALF_ANGLE = (100 * Math.PI) / 180;
const DISPLAY_RANGE = 0.28;

export function createLookoutCone(scene) {
  const positions = new Float32Array((SEGMENTS + 2) * 3);
  const colors = new Float32Array((SEGMENTS + 2) * 4);
  colors.set([1, 1, 1, 0.2], 0);
  const indices = [];
  for (let i = 0; i < SEGMENTS; i += 1) indices.push(0, i + 1, i + 2);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4));
  geometry.setIndex(indices);
  const material = new THREE.MeshBasicMaterial({
    color: 0x45d9c0,
    vertexColors: true,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    depthTest: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'lookout-vision-cone';
  mesh.frustumCulled = false;
  mesh.renderOrder = 4;
  scene.add(mesh);
  let opacity = 0;
  function update(state, dt = 1 / 60) {
    const guard = state?.lookoutDemoGuardId == null ? null : state.actors.find((actor) => actor.id === state.lookoutDemoGuardId);
    const liveGuard = !!guard && guard.state !== 'dead';
    const targetOpacity = lookoutConeTargetOpacity(state, liveGuard);
    opacity = advanceLookoutOpacity(opacity, targetOpacity, dt);
    mesh.material.opacity = opacity;
    mesh.visible = opacity > 0 || targetOpacity > 0;
    if (!liveGuard) return;
    const range = visionRange(guard, lightAtActor(state, guard), state) * DISPLAY_RANGE;
    const house = (state.town?.houses || []).find((entry) => entry.id === guard.home);
    const floorY = house
      ? actorWorldY(house, Number.isInteger(guard.floor) ? guard.floor : 0, guard.x, guard.z) + 0.08
      : (Number.isFinite(guard.y) ? guard.y + 0.08 : 0.08);
    positions[0] = guard.x;
    positions[1] = floorY;
    positions[2] = guard.z;
    const halfAngle = lookoutDisplayHalfAngle(HALF_ANGLE);
    for (let i = 0; i <= SEGMENTS; i += 1) {
      const angle = guard.rot - halfAngle + (halfAngle * 2 * i) / SEGMENTS;
      const offset = (i + 1) * 3;
      positions[offset] = guard.x + Math.sin(angle) * range;
      positions[offset + 1] = floorY;
      positions[offset + 2] = guard.z + Math.cos(angle) * range;
      colors.set([1, 1, 1, 0], (i + 1) * 4);
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
    geometry.computeBoundingSphere();
  }

  function dispose() {
    scene.remove(mesh);
    geometry.dispose();
    material.dispose();
  }

  return { mesh, update, dispose };
}
