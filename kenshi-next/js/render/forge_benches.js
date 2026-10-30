// 鍛冶台の3D描画（smith1）: 町や世界に配置された鍛冶台（作業台＋金床＋炉の炭火）
import * as THREE from 'three';
import { heightAt } from '../sim/index.js';

export function createForgeBenches(scene, state) {
  const group = new THREE.Group();
  group.name = 'forge_benches';

  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x4a321e,
    roughness: 0.85,
    metalness: 0.05,
  });
  const anvilMat = new THREE.MeshStandardMaterial({
    color: 0x33353a,
    roughness: 0.3,
    metalness: 0.85,
  });
  const forgeCoalMat = new THREE.MeshStandardMaterial({
    color: 0x221108,
    emissive: 0xff4411,
    emissiveIntensity: 0.8,
    roughness: 0.9,
  });

  const tableGeo = new THREE.BoxGeometry(1.5, 0.7, 0.75);
  tableGeo.translate(0, 0.35, 0);

  const anvilBaseGeo = new THREE.BoxGeometry(0.35, 0.25, 0.3);
  anvilBaseGeo.translate(0, 0.7 + 0.125, 0);

  const anvilTopGeo = new THREE.BoxGeometry(0.55, 0.12, 0.22);
  anvilTopGeo.translate(0.05, 0.7 + 0.25 + 0.06, 0);

  const coalGeo = new THREE.CylinderGeometry(0.2, 0.15, 0.15, 8);
  coalGeo.translate(0.45, 0.7 + 0.08, 0);

  function sync() {
    // 既存メッシュの破棄
    while (group.children.length > 0) {
      const c = group.children.pop();
      if (c.geometry) c.geometry.dispose();
    }

    const benches = state.forgeBenches || [];
    for (const b of benches) {
      const benchGroup = new THREE.Group();
      const y = heightAt(b.x, b.z);
      benchGroup.position.set(b.x, y, b.z);
      benchGroup.rotation.y = b.rot || 0;

      const tableMesh = new THREE.Mesh(tableGeo, woodMat);
      tableMesh.castShadow = true;
      tableMesh.receiveShadow = true;

      const anvilBase = new THREE.Mesh(anvilBaseGeo, anvilMat);
      anvilBase.castShadow = true;

      const anvilTop = new THREE.Mesh(anvilTopGeo, anvilMat);
      anvilTop.castShadow = true;

      const coal = new THREE.Mesh(coalGeo, forgeCoalMat);

      benchGroup.add(tableMesh, anvilBase, anvilTop, coal);
      group.add(benchGroup);
    }
  }

  sync();
  scene.add(group);

  return {
    group,
    sync,
    dispose() {
      scene.remove(group);
      tableGeo.dispose();
      anvilBaseGeo.dispose();
      anvilTopGeo.dispose();
      coalGeo.dispose();
      woodMat.dispose();
      anvilMat.dispose();
      forgeCoalMat.dispose();
    },
  };
}
