// 地面・道・岩・建物。地面は heightAt で起伏させ、頂点カラーで砂色に塗る。

import * as THREE from 'three';
import { heightAt } from '../sim/index.js';

const SAND_LIGHT = new THREE.Color('#cdb07a');
const SAND_DARK = new THREE.Color('#9b6547');
const ROAD_COLOR = new THREE.Color('#dcc49a');
const TOWN_FLOOR = new THREE.Color('#c3ae86');

function distanceToSegment(px, pz, a, b) {
  const vx = b.x - a.x;
  const vz = b.z - a.z;
  const wx = px - a.x;
  const wz = pz - a.z;
  const len2 = vx * vx + vz * vz;
  let t = len2 > 0 ? (wx * vx + wz * vz) / len2 : 0;
  if (t < 0) t = 0;
  if (t > 1) t = 1;
  const dx = px - (a.x + vx * t);
  const dz = pz - (a.z + vz * t);
  return Math.sqrt(dx * dx + dz * dz);
}

function distanceToRoad(px, pz, road) {
  if (!road || road.length < 2) return Infinity;
  let best = Infinity;
  for (let i = 0; i < road.length - 1; i += 1) {
    const d = distanceToSegment(px, pz, road[i], road[i + 1]);
    if (d < best) best = d;
  }
  return best;
}

function placeList(state) {
  const out = [];
  if (state && state.places) {
    for (const key of Object.keys(state.places)) out.push(state.places[key]);
  }
  return out;
}

export function createTerrain(scene, state) {
  const group = new THREE.Group();
  group.name = 'terrain';

  const geometry = new THREE.PlaneGeometry(400, 400, 100, 100);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position;
  const colors = new Float32Array(position.count * 3);
  const tmp = new THREE.Color();
  const roads = (state && state.roads) || [];
  const places = placeList(state);

  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const z = position.getZ(i);
    position.setY(i, heightAt(x, z));

    const patch =
      Math.sin(x * 0.083 + z * 0.047) * 0.5 +
      Math.sin(x * 0.021 - z * 0.067 + 1.7) * 0.3 +
      Math.cos((x + z) * 0.014 - 0.8) * 0.2;
    const t = Math.min(1, Math.max(0, patch * 0.5 + 0.5));
    tmp.copy(SAND_LIGHT).lerp(SAND_DARK, t * 0.85);

    const rd = distanceToRoad(x, z, roads);
    if (rd < 4) {
      const k = Math.max(0, 1 - rd / 4) * 0.6;
      tmp.lerp(ROAD_COLOR, k);
    }

    for (const p of places) {
      const dx = x - p.x;
      const dz = z - p.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < p.r) {
        const k = Math.max(0, 1 - d / p.r) * 0.3;
        tmp.lerp(TOWN_FLOOR, k);
      }
    }

    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const groundMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.96,
    metalness: 0,
  });
  const ground = new THREE.Mesh(geometry, groundMaterial);
  ground.name = 'ground';
  ground.receiveShadow = true;
  group.add(ground);

  // 岩（インスタンス）
  const rocks = (state && state.rocks) || [];
  const rockGeo = new THREE.IcosahedronGeometry(1, 0);
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1,
    metalness: 0,
    flatShading: true,
  });
  const rockMesh = new THREE.InstancedMesh(rockGeo, rockMat, Math.max(1, rocks.length));
  rockMesh.count = rocks.length;
  rockMesh.castShadow = true;
  rockMesh.receiveShadow = true;
  rockMesh.name = 'rocks';
  const dummy = new THREE.Object3D();
  const rockColor = new THREE.Color();
  for (let i = 0; i < rocks.length; i += 1) {
    const r = rocks[i];
    const y = heightAt(r.x, r.z);
    dummy.position.set(r.x, y + r.r * 0.32, r.z);
    dummy.rotation.set(r.r * 2.1 + i * 0.37, r.r * 4.7, r.r * 1.3);
    dummy.scale.set(r.r, r.r * 0.82, r.r * 0.95);
    dummy.updateMatrix();
    rockMesh.setMatrixAt(i, dummy.matrix);
    const shade = 0.68 + ((i * 37) % 25) / 100;
    rockColor.setRGB(0.55 * shade, 0.52 * shade, 0.48 * shade);
    rockMesh.setColorAt(i, rockColor);
  }
  rockMesh.instanceMatrix.needsUpdate = true;
  if (rockMesh.instanceColor) rockMesh.instanceColor.needsUpdate = true;
  group.add(rockMesh);

  // 建物の箱
  const buildings = (state && state.buildings) || [];
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const town1 = state && state.places ? state.places.town1 : null;
  const town2 = state && state.places ? state.places.town2 : null;
  const buildingMeshes = [];
  for (let i = 0; i < buildings.length; i += 1) {
    const b = buildings[i];
    let color;
    if (b.kind === 'camp') {
      color = new THREE.Color('#453c35');
    } else if (b.kind === 'fence') {
      color = new THREE.Color('#5a4a3b');
    } else {
      const d1 = town1 ? Math.hypot(b.x - town1.x, b.z - town1.z) : Infinity;
      const d2 = town2 ? Math.hypot(b.x - town2.x, b.z - town2.z) : Infinity;
      const base = d2 < d1 ? new THREE.Color('#a88d68') : new THREE.Color('#b9a382');
      const shade = 0.9 + ((i * 13) % 18) / 100;
      color = base.multiplyScalar(shade);
    }
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.92,
      metalness: 0,
    });
    const mesh = new THREE.Mesh(boxGeo, material);
    mesh.position.set(b.x, heightAt(b.x, b.z) + b.h / 2, b.z);
    mesh.scale.set(b.w, b.h, b.d);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = 'building';
    group.add(mesh);
    buildingMeshes.push(mesh);
  }

  scene.add(group);

  return {
    group,
    ground,
    rocks: rockMesh,
    buildings: buildingMeshes,
  };
}
