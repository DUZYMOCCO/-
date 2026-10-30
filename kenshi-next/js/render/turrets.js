import * as THREE from 'three';
import { heightAt } from '../sim/index.js';
export function createTurrets(scene) {
  const groups = new Map();
  const wood = new THREE.MeshStandardMaterial({color:0x76502f});
  const metal = new THREE.MeshStandardMaterial({color:0x393c3c});
  function box(group, w,h,d,x,y,z, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), material);
    mesh.position.set(x,y,z); group.add(mesh);
  }
  return {
    update(state) {
      const alive = new Set();
      for (const t of state.turrets || []) {
        alive.add(t.id);
        let g = groups.get(t.id);
        if (!g) {
          g = new THREE.Group();
          box(g,1.5,.2,1.2,0,.12,0,wood);
          box(g,.3,1,.3,0,.68,0,wood);
          const bow = new THREE.Group(); bow.position.y = 1.23; g.add(bow); g.userData.bow = bow;
          box(bow,.22,.18,1.5,0,0,0,wood);
          box(bow,1.7,.16,.16,0,.04,.45,wood);
          box(bow,.06,.06,1.4,0,.14,0,metal);
          scene.add(g); groups.set(t.id,g);
        }
        g.position.set(t.x,heightAt(t.x,t.z),t.z); g.userData.bow.rotation.y = t.rot || 0;
      }
      for (const [id,g] of groups) if (!alive.has(id)) { scene.remove(g); groups.delete(id); }
    }
  };
}
