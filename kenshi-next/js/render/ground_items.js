import * as THREE from '../vendor/three/build/three.module.min.js';
import { proceduralWeapon } from './procedural_weapon.js';
import { weaponModel, weaponGeneration } from './weapons_v3.js';
import { groundWeaponPose } from './ground_weapon_pose.js';
import { heightAt } from '../sim/terrain.js';
import { WEAPONS } from '../sim/data.js';
import { buildCrossbowGeometry, EXTRA_CROSSBOW_IDS } from './crossbow_geometry.js';

const UP = new THREE.Vector3(0, 1, 0);
// 追加の弩（wa_ / wb_）を地面に置いた時だけ使う材質（既存の弩の地面表示は変えない）。
const WB_GROUND_MATS = {
  wood: new THREE.MeshStandardMaterial({ color: 0x5a4029, roughness: .9 }),
  metal: new THREE.MeshStandardMaterial({ color: 0x8d999e, metalness: .55, roughness: .5 }),
};

export function createGroundItems(scene) {
  const root = new THREE.Group(); root.name = 'ground-items'; scene.add(root);
  const meshes = new Map();
  return {
    update(state, focus) {
      const live = new Set();
      for (const item of state.groundItems || []) {
        const weaponId = Object.keys(item.contents || {}).find(id => (item.contents[id] || 0) > 0 && (WEAPONS[id] || EXTRA_CROSSBOW_IDS.includes(id)));
        if (!weaponId) continue;
        live.add(item.id);
        let entry = meshes.get(item.id);
        const generation = weaponGeneration();
        if (!entry || entry.weaponId !== weaponId || entry.generation !== generation) {
          if (entry) root.remove(entry.group);
          const group = new THREE.Group();
          const variant = item.weaponVariants?.[weaponId] || 0;
          const model = EXTRA_CROSSBOW_IDS.includes(weaponId)
            ? buildCrossbowGeometry(THREE, weaponId, variant, WB_GROUND_MATS)
            : weaponModel(weaponId, variant) || proceduralWeapon(weaponId, variant);
          if (model) { model.scale.setScalar(.62); group.add(model); }
          const marker = new THREE.Mesh(new THREE.CircleGeometry(.28, 12), new THREE.MeshBasicMaterial({ color:0x9a8d63, transparent:true, opacity:.45, side:THREE.DoubleSide }));
          marker.rotation.x = -Math.PI/2; marker.position.y = .015; group.add(marker);
          root.add(group); entry = {group,weaponId,generation}; meshes.set(item.id,entry);
        }
        const step = .35;
        const slopeX = (heightAt(item.x + step, item.z) - heightAt(item.x - step, item.z)) / (2 * step);
        const slopeZ = (heightAt(item.x, item.z + step) - heightAt(item.x, item.z - step)) / (2 * step);
        const pose = groundWeaponPose(item.id, item.x, item.z, heightAt(item.x,item.z), slopeX, slopeZ);
        entry.group.position.set(pose.x, pose.y, pose.z);
        entry.group.quaternion.setFromUnitVectors(UP, new THREE.Vector3(...pose.normal));
        entry.group.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(UP, pose.yaw));
        entry.group.visible = !focus || Math.hypot(item.x-focus.x,item.z-focus.z) < 80;
      }
      for (const [id,entry] of meshes) if (!live.has(id)) { root.remove(entry.group); meshes.delete(id); }
    },
  };
}
