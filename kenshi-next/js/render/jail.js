// 鉄格子を少数のインスタンスにまとめた牢（当たり判定は持たない）。
import * as THREE from 'three';
import { JAIL_DOOR_HALF, JAIL_HALF, jailCellLocal, jailDoorLocal } from '../sim/jail.js';
import { heightAt } from '../sim/terrain.js';
import { localToWorld } from '../sim/town.js';

const box = new THREE.BoxGeometry(1, 1, 1);
const iron = new THREE.MeshStandardMaterial({ color: 0x454d50, roughness: 0.7, metalness: 0.65 });

function makeBars(name, pieces) {
  const mesh = new THREE.InstancedMesh(box, iron, pieces.length);
  mesh.name = name;
  const dummy = new THREE.Object3D();
  pieces.forEach(([x, y, z, sx, sy, sz], i) => {
    dummy.position.set(x, y, z);
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

export function createJailCage(house, y) {
  const group = new THREE.Group();
  group.name = 'jail_' + house.id;
  const cell = jailCellLocal(house);
  const center = localToWorld(house, cell.x, cell.z);
  group.position.set(center.x, y, center.z);
  group.rotation.y = Math.atan2(-house.uz, house.ux);
  // 反対側の戸口でもローカルの奥向きを合わせる。
  group.scale.z = (Math.sin(group.rotation.y) * -house.nx + Math.cos(group.rotation.y) * -house.nz) < 0 ? -1 : 1;
  const half = JAIL_HALF, gap = JAIL_DOOR_HALF;
  const parts = [];
  for (let i = 0; i <= 8; i += 1) {
    const t = -half + i * half / 4;
    parts.push([t, 1.05, half, 0.07, 2.1, 0.07]);
    parts.push([-half, 1.05, t, 0.07, 2.1, 0.07]);
    parts.push([half, 1.05, t, 0.07, 2.1, 0.07]);
    if (Math.abs(t) > gap) parts.push([t, 1.05, -half, 0.07, 2.1, 0.07]);
  }
  for (const height of [0.12, 2.05]) {
    parts.push([0, height, half, half * 2, 0.1, 0.1]);
    parts.push([-half, height, 0, 0.1, 0.1, half * 2]);
    parts.push([half, height, 0, 0.1, 0.1, half * 2]);
    parts.push([-(half + gap) / 2, height, -half, half - gap, 0.1, 0.1]);
    parts.push([(half + gap) / 2, height, -half, half - gap, 0.1, 0.1]);
  }
  group.add(makeBars('jail_bars_' + house.id, parts));
  const pivot = new THREE.Group();
  pivot.name = 'jail_door_' + house.id;
  pivot.position.set(-gap, 0, -half);
  const leaf = [];
  for (let i = 0; i <= 5; i += 1) leaf.push([i * gap * 0.4, 1.05, 0, 0.07, 2.1, 0.07]);
  leaf.push([gap, 0.12, 0, gap * 2, 0.1, 0.1], [gap, 2.05, 0, gap * 2, 0.1, 0.1]);
  pivot.add(makeBars('jail_leaf_' + house.id, leaf));
  group.add(pivot);
  updateJailCage(group, house);
  return group;
}

// PC右クリック・タッチ長押しの共通ターゲット。
export function findJailDoorTarget(state, ray) {
  let best = null, distance = 0.8;
  for (const h of state.town?.houses || []) {
    if (h.type !== 'post' || !state.actors.some(a => a.jail?.house === h.id)) continue;
    const local = jailDoorLocal(h);
    const point = localToWorld(h, local.x, local.z);
    const d = ray.distanceToPoint(new THREE.Vector3(point.x, heightAt(point.x, point.z) + 1.1, point.z));
    if (d < distance) { best = h; distance = d; }
  }
  return best ? { type: 'jailDoor', houseId: best.id } : null;
}

export function updateJailCage(cage, house) {
  const door = cage.getObjectByName('jail_door_' + house.id);
  if (door) door.rotation.y = house.jailDoor?.open ? Math.PI / 2 : 0;
}
