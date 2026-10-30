// 敷いた寝袋（state.bedrolls）を描く。glb は assets/props_gm3/bedroll.glb。
// 読めない時・?models=0 の時は平たい箱で描く。
import * as THREE from 'three';
import { heightAt } from '../sim/index.js';
import { loadModels, modelGroup } from './models.js';

export const BEDROLL_DIR = 'assets/props_gm3/';

export function createBedrolls(scene, opts) {
  const o = opts || {};
  const root = new THREE.Group();
  root.name = 'bedrolls';
  scene.add(root);
  const shown = new Map(); // id -> Object3D
  let baked = null;
  let fallbackMat = null;

  if (!o.noModels) {
    loadModels(['bedroll'], BEDROLL_DIR)
      .then((m) => {
        if (!m.bedroll) return;
        baked = m.bedroll;
        // 先に箱で出していたものは作り直す
        for (const [id, obj] of shown) {
          root.remove(obj);
          shown.delete(id);
        }
      })
      .catch(() => {});
  }

  function makeOne() {
    if (baked) return modelGroup(baked);
    if (!fallbackMat) fallbackMat = new THREE.MeshStandardMaterial({ color: 0x6b5a3e, roughness: 0.95 });
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 1.7), fallbackMat);
    m.position.y = 0.06;
    m.castShadow = true;
    m.receiveShadow = true;
    const g = new THREE.Group();
    g.add(m);
    return g;
  }

  function update(state) {
    const list = Array.isArray(state.bedrolls) ? state.bedrolls : [];
    const live = new Set();
    for (const b of list) {
      live.add(b.id);
      let obj = shown.get(b.id);
      if (!obj) {
        obj = makeOne();
        obj.name = b.id;
        root.add(obj);
        shown.set(b.id, obj);
      }
      obj.position.set(b.x, heightAt(b.x, b.z) + 0.01, b.z);
      obj.rotation.y = b.rot || 0;
    }
    for (const [id, obj] of shown) {
      if (!live.has(id)) {
        root.remove(obj);
        shown.delete(id);
      }
    }
  }

  function reset() {
    for (const obj of shown.values()) root.remove(obj);
    shown.clear();
  }

  return { update, reset, count: () => shown.size };
}
