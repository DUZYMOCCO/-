import * as THREE from '../vendor/three/build/three.module.min.js';

function mergeGeometries(parts) {
  const result = new THREE.BufferGeometry();
  for (const [name, first] of Object.entries(parts[0].attributes)) {
    if (parts.some(p => !p.attributes[name] || p.attributes[name].itemSize !== first.itemSize)) return null;
    const length = parts.reduce((n, p) => n + p.attributes[name].array.length, 0);
    const array = new first.array.constructor(length);
    let offset = 0;
    for (const p of parts) { array.set(p.attributes[name].array, offset); offset += p.attributes[name].array.length; }
    result.setAttribute(name, new THREE.BufferAttribute(array, first.itemSize, first.normalized));
  }
  return result;
}

export function weaponMergeFallback(type) {
  return type === 'polearm' || type === 'crossbow' ? `weapon merge fallback: ${type} world-oriented` : null;
}

// The v4 armour geometries are shared between dolls. Only the combined copies
// belong to a doll; never dispose the shared source geometry here.
export function clearMergedWeapon(doll) {
  const state = doll.weaponMerge;
  if (!state) return;
  for (const { mesh, original, combined } of state.parts) {
    if (mesh.geometry === combined) mesh.geometry = original;
    combined.dispose();
  }
  doll.weaponMerge = null;
}

export function mergeWeapon(doll, weapon, hand, key) {
  const armour = doll.v4Meshes || [];
  const targets = new Map(armour.map(m => [m.material?.name, m]));
  if (!targets.has('cloth') || !targets.has('metal')) return false;
  const batches = new Map([['cloth', []], ['metal', []]]);
  weapon.updateMatrixWorld(true);
  let unsupported = false;
  weapon.traverse(obj => {
    if (!obj.isMesh || !obj.geometry?.attributes.position) return;
    const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
    const geometry = obj.geometry.index ? obj.geometry.toNonIndexed() : obj.geometry.clone();
    const groups = geometry.groups.length ? geometry.groups : [{ start: 0, count: geometry.attributes.position.count, materialIndex: 0 }];
    for (const group of groups) {
      const source = materials.length === 1 ? materials[0] : materials[group.materialIndex];
      const name = source?.name?.toLowerCase() || '';
      const category = name.includes('metal') || (!name && source?.metalness > .2) ? 'metal' : name.includes('wood') || name.includes('wrap') || !name ? 'cloth' : null;
      if (!category) { unsupported = true; break; }
      const target = targets.get(category), boneIndex = target.skeleton.bones.indexOf(hand);
      if (boneIndex < 0) { unsupported = true; break; }
      const inverseBind = target.bindMatrix.clone().invert();
      const transform = inverseBind.multiply(target.skeleton.boneInverses[boneIndex].clone().invert()).multiply(hand.matrixWorld.clone().invert()).multiply(obj.matrixWorld);
      const normal = new THREE.Matrix3().getNormalMatrix(transform);
      const part = new THREE.BufferGeometry();
      const count = group.count;
      for (const [attrName, template] of Object.entries(target.geometry.attributes)) {
        const data = new template.array.constructor(count * template.itemSize);
        const attr = new THREE.BufferAttribute(data, template.itemSize, template.normalized);
        const src = geometry.attributes[attrName];
        for (let i = 0; i < count; i++) {
          const j = group.start + i;
          if (attrName === 'position' || attrName === 'normal') {
            const v = new THREE.Vector3().fromBufferAttribute(geometry.attributes[attrName], j);
            if (attrName === 'position') v.applyMatrix4(transform); else v.applyMatrix3(normal).normalize();
            attr.setXYZ(i, v.x, v.y, v.z);
          } else if (attrName === 'skinIndex') attr.setXYZW(i, boneIndex, 0, 0, 0);
          else if (attrName === 'skinWeight') attr.setXYZW(i, 1, 0, 0, 0);
          else if (attrName === 'color') { const c = source.color || new THREE.Color('white'); attr.setXYZ(i, c.r, c.g, c.b); }
          else if (src) for (let k = 0; k < template.itemSize; k++) attr.setComponent(i, k, src.getComponent(j, k));
        }
        part.setAttribute(attrName, attr);
      }
      batches.get(category).push(part);
    }
    geometry.dispose();
  });
  if (unsupported || ![...batches.values()].some(a => a.length)) { for (const parts of batches.values()) parts.forEach(p => p.dispose()); return false; }
  const built = [];
  for (const [category, parts] of batches) {
    if (!parts.length) continue;
    const mesh = targets.get(category), original = mesh.geometry;
    const base = original.index ? original.toNonIndexed() : original.clone();
    const combined = mergeGeometries([base, ...parts]);
    base.dispose(); parts.forEach(p => p.dispose());
    if (!combined) { built.forEach(p => p.combined.dispose()); return false; }
    built.push({ mesh, original, combined });
  }
  clearMergedWeapon(doll);
  for (const {mesh, combined} of built) mesh.geometry = combined;
  doll.weaponMerge = {key, parts: built};
  return true;
}

