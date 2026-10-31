import { factionPaletteFor } from './faction_colors.js';

// Corresponding pieces are selected per equipped slot; absent footwear and fabric legs
// deliberately use the old mesh builder.
export function armourParts(p) {
  const pair = n => [n + '_L', n + '_R'];
  if (p.slot === 'head') return ['helmet_' + ['a','b','c'][p.variant % 3]];
  if (p.slot.startsWith('upper')) {
    const heavy = p.id === 'box_plate';
    const body = heavy ? 'heavy_cuirass_chunky' : p.kind === 'armor' ? 'plate_cuirass' : p.shape === 'padded' || p.kind === 'leather' ? 'padded_jacket' : 'cloth_tunic';
    const tabard = ['lantern_council', 'caravan_guild'].includes(factionPaletteFor(p.origin).id) ? ['tabard'] : [];
    return p.kind === 'armor' ? [body, ...pair('pauldron'), ...pair('rerebrace'), ...pair('vambrace'), 'gorget_cover', ...pair('cuff'), ...tabard] : [body, 'gorget_cover', ...pair('cuff'), ...tabard];
  }
  if (p.slot.startsWith('lower') && p.kind === 'armor') return ['greaves', ...pair('cuisses'), 'skirt'];
  if (p.slot.startsWith('lower')) return pair('knee_wrap');
  if (p.slot === 'feet') return pair('ankle_wrap');
  return [];
}
let promise, mergeGeometries;
export function loadArmour() {
  if (!promise) promise = Promise.all([import('three/addons/loaders/GLTFLoader.js'), import('three/addons/utils/BufferGeometryUtils.js')]).then(([{GLTFLoader}, utils]) => { mergeGeometries = utils.mergeGeometries; return new Promise((resolve, reject) => {
    new GLTFLoader().load('assets/armour_v6.glb', gltf => {
      const pieces = new Map(); gltf.scene.traverse(o => { if (o.isSkinnedMesh && !o.parent?.isGroup) pieces.set(o.name, [o]); else if (o.isGroup) { const meshes = o.children.filter(c => c.isSkinnedMesh); if (meshes.length) pieces.set(o.name, meshes); } });
      resolve(pieces);
    }, undefined, reject);
  }); });
  return promise;
}
export function createV4(THREE, pieces) {
  const materials = new Map(), geometries = new Map();
  const unmerged = new URLSearchParams(location.search).get('r11armor') === '1';
  function material(source, origin, dead) {
    const key = origin + '|' + source.name + '|' + !!dead;
    if (!materials.has(key)) {
      const m = source.clone(), color = new THREE.Color(factionPaletteFor(origin).hex[0]);
      if (source.name === 'cloth') m.color.copy(color);
      else if (source.name === 'metal') m.color.set('#a2a8af');
      else if (source.name === 'trim' || source.name === 'paint') m.color.copy(color);
      if (dead) m.color.multiplyScalar(.34);
      m.userData.shared = true; materials.set(key, m);
    }
    return materials.get(key);
  }
  function attach(doll, plan, dead, wearer) {
    const body = doll.armorSrc.mesh, byName = new Map(body.skeleton.bones.map(b => [b.name,b]));
    const missing = [], added = [], seen = new Set();
    let skeleton = null;
    const batches = new Map();
    for (const p of plan.pieces) {
      if ((p.slot === 'upperIn' && plan.pieces.some(q => q.slot === 'upperOut')) || (p.slot === 'lowerIn' && plan.pieces.some(q => q.slot === 'lowerOut'))) continue;
      const origin = p.factionSpecific ? p.origin : factionPaletteFor(wearer).id;
      const names = armourParts({...p, origin});
      if (p.slot.startsWith('lower') && p.kind !== 'armor') missing.push(p);
      if (!names.length) { missing.push(p); continue; }
      if (names.some(name => { const src = pieces.get(name); return !src || src.some(mesh => mesh.skeleton.bones.some(b => !byName.has(b.name))); })) { missing.push(p); continue; }
      for (const name of names) {
        if (seen.has(name)) continue;
        for (const src of pieces.get(name)) {
        if (!skeleton) skeleton = new THREE.Skeleton(src.skeleton.bones.map(b => byName.get(b.name)), src.skeleton.boneInverses);
        const mats = Array.isArray(src.material) ? src.material.map(m => material(m,origin,dead)) : material(src.material,origin,dead);
        if (!unmerged) {
          const materialsList = Array.isArray(src.material) ? src.material : [src.material];
          const groups = src.geometry.groups.length ? src.geometry.groups : [{start:0,count:src.geometry.index ? src.geometry.index.count : src.geometry.attributes.position.count,materialIndex:0}];
          for (const group of groups) {
            const sourceMat = materialsList[group.materialIndex];
            const banded = false;
            for (const band of banded ? [false, true] : [false]) {
              const mat = band ? sourceMat.clone() : sourceMat;
              if (band) mat.name = 'trim';
              const key = mat.name;
              if (!batches.has(key)) batches.set(key, []);
              batches.get(key).push({src, group, sourceMat:mat, origin, name, band:banded ? band : null});
            }
          }
          continue;
        }
        const mesh = new THREE.SkinnedMesh(src.geometry, mats);
        mesh.bind(skeleton, src.bindMatrix); mesh.frustumCulled = false; mesh.receiveShadow = true;
        mesh.userData.armor = true; mesh.userData.shared = true; mesh.userData.v4Origin = p.origin; mesh.raycast = () => {};
        body.parent.add(mesh); added.push(mesh);
        }
        seen.add(name);
      }
    }
    for (const entries of batches.values()) {
      const key = entries.map(e => e.name + ':' + e.src.name + ':' + e.group.start + ':' + e.group.count + ':' + e.band).join(',') + '|' + entries.map(e => e.origin).join(',') + '|' + entries[0].sourceMat.name;
      let geo = geometries.get(key);
      if (!geo) {
        const slices = entries.map(({src,group,band,origin,sourceMat}) => {
          const g = src.geometry.index ? src.geometry.toNonIndexed() : src.geometry.clone();
          const part = new THREE.BufferGeometry();
          const pos = g.attributes.position;
          let lo = Infinity, hi = -Infinity;
          for (let i=group.start; i<group.start+group.count; i++) { lo=Math.min(lo,pos.getY(i)); hi=Math.max(hi,pos.getY(i)); }
          const selected = [];
          for (let i=group.start; i<group.start+group.count; i+=3) {
            const y=(pos.getY(i)+pos.getY(i+1)+pos.getY(i+2))/3;
            const inBand = y > lo + (hi-lo)*.72 && y < lo + (hi-lo)*.84;
            if (band === null || band === inBand) selected.push(i,i+1,i+2);
          }
          for (const [name, attr] of Object.entries(g.attributes)) {
            const array = new attr.array.constructor(selected.length * attr.itemSize);
            selected.forEach((index, i) => { for (let k=0; k<attr.itemSize; k++) array[i*attr.itemSize+k]=attr.array[index*attr.itemSize+k]; });
            part.setAttribute(name, new THREE.BufferAttribute(array, attr.itemSize, attr.normalized));
          }
          const color = new THREE.Color(sourceMat.name === 'metal' ? '#a2a8af' : (sourceMat.name === 'cloth' || sourceMat.name === 'paint' || sourceMat.name === 'trim') ? factionPaletteFor(origin).hex[0] : (sourceMat.color || '#ffffff'));
          const colors = new Float32Array(selected.length * 3); for (let i=0;i<selected.length;i++) { colors[i*3]=color.r; colors[i*3+1]=color.g; colors[i*3+2]=color.b; }
          part.setAttribute('color', new THREE.BufferAttribute(colors, 3));
          g.dispose(); return part;
        });
        geo = mergeGeometries(slices); slices.forEach(g => g.dispose());
        if (!geo) throw new Error('Unable to merge armour geometry');
        geometries.set(key, geo);
      }
      const first = entries[0];
      const matKey = 'vertex|' + first.sourceMat.name + '|' + !!dead;
      if (!materials.has(matKey)) { const m=first.sourceMat.clone(); m.color.set(dead ? '#575757' : '#ffffff'); m.vertexColors=true; m.userData.shared=true; materials.set(matKey,m); }
      const mesh = new THREE.SkinnedMesh(geo, materials.get(matKey));
      mesh.bind(skeleton, first.src.bindMatrix); mesh.frustumCulled = false; mesh.receiveShadow = true;
      mesh.userData.armor = true; mesh.userData.shared = true; mesh.userData.v4Origin = first.origin; mesh.userData.vertexMaterial = true; mesh.raycast = () => {};
      body.parent.add(mesh); added.push(mesh);
    }
    doll.v4Meshes = added;
    return missing;
  }
  function darken(doll) { for (const mesh of doll.v4Meshes || []) { const convert = m => { if (!mesh.userData.vertexMaterial) return material(m, mesh.userData.v4Origin, true); const key='vertex|'+m.name+'|true'; if (!materials.has(key)) { const d=m.clone(); d.color.set('#575757'); d.userData.shared=true; materials.set(key,d); } return materials.get(key); }; mesh.material = Array.isArray(mesh.material) ? mesh.material.map(convert) : convert(mesh.material); } }
  return { attach, darken, dispose() { materials.forEach(m => m.dispose()); materials.clear(); geometries.forEach(g => g.dispose()); geometries.clear(); } };
}

