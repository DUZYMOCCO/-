// glb の小物・武器を読み、材質ごとに1つのジオメトリへまとめる（InstancedMesh で配るため）。
// 読めない glb は null。呼び出し側は従来の手続きの形で描く。

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MODEL_DIR, MODEL_NAMES, loadEach, worldUV } from './asset_plan.js';

function underNode(o, name, root) {
  for (let p = o; p && p !== root; p = p.parent) if (p.name === name) return true;
  return false;
}

// 戻り値: { parts: [{ geometry, material }], nodes: { name: Vector3 }, box: Box3, noDoor? }
// 'door' という節があるモデル（戸口つきの壁）は、扉の板を除いた形も noDoor に入れる（開く扉を別に描く家のため）。
export function bakeModel(root, skipNode) {
  root.updateMatrixWorld(true);
  const byMat = new Map();
  const nodes = {};
  let hasDoor = false;
  root.traverse((o) => {
    if (o !== root && o.name === 'door') hasDoor = true;
    if (o.isMesh) {
      if (skipNode && underNode(o, skipNode, root)) return;
      const mat = Array.isArray(o.material) ? o.material[0] : o.material;
      const key = mat ? mat.name || mat.uuid : 'none';
      const g = o.geometry.clone();
      g.applyMatrix4(o.matrixWorld);
      // 結合できるよう、属性を位置・法線・UV（あれば頂点色）にそろえる
      for (const name of Object.keys(g.attributes)) {
        if (name !== 'position' && name !== 'normal' && name !== 'color' && name !== 'uv') g.deleteAttribute(name);
      }
      // 模様の無い材質の UV は要らない（結合の時にそろわなくなるので消す）
      if (!(mat && mat.map)) g.deleteAttribute('uv');
      if (!g.attributes.normal) g.computeVertexNormals();
      if (!byMat.has(key)) byMat.set(key, { material: mat, geos: [] });
      byMat.get(key).geos.push(g.index ? g.toNonIndexed() : g);
    } else if (o.name && o !== root) {
      nodes[o.name] = new THREE.Vector3().setFromMatrixPosition(o.matrixWorld);
    }
  });
  const parts = [];
  for (const { material, geos } of byMat.values()) {
    const hasColor = geos.every((g) => g.attributes.color);
    if (!hasColor) for (const g of geos) if (g.attributes.color) g.deleteAttribute('color');
    const hasUv = geos.every((g) => g.attributes.uv);
    if (!hasUv) for (const g of geos) if (g.attributes.uv) g.deleteAttribute('uv');
    const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
    if (!merged) continue;
    merged.computeBoundingSphere();
    const m = material ? material.clone() : new THREE.MeshStandardMaterial();
    if (hasColor) m.vertexColors = true;
    if (!hasUv && m.map) m.map = null;
    if (m.map) m.map.anisotropy = Math.max(m.map.anisotropy || 1, 4);
    parts.push({ geometry: merged, material: m });
  }
  const box = new THREE.Box3().setFromObject(root);
  const out = { parts, nodes, box };
  if (!skipNode && hasDoor) out.noDoor = bakeModel(root, 'door');
  return out;
}

export async function loadModels(names, dir) {
  const loader = new GLTFLoader();
  const base = dir || MODEL_DIR;
  const list = names || MODEL_NAMES;
  const map = await loadEach(list, (n) =>
    loader.loadAsync(base + n + '.glb').then((gltf) => bakeModel(gltf.scene))
  );
  const missing = list.filter((n) => !map[n]);
  if (missing.length) console.warn('読めなかった glb（従来の形で描きます）:', missing.join(', '));
  return map;
}

// 1つのモデルを count 個並べる InstancedMesh の組（材質ごとに1 draw call）。
export function instancedModel(baked, count, opts) {
  const o = opts || {};
  const meshes = baked.parts.map((p) => {
    const mesh = new THREE.InstancedMesh(p.geometry, o.material ? o.material(p.material) : p.material, Math.max(1, count));
    mesh.count = 0;
    mesh.castShadow = o.castShadow !== false;
    mesh.receiveShadow = o.receiveShadow !== false;
    if (o.name) mesh.name = o.name + ':' + (p.material.name || 'm');
    return mesh;
  });
  let n = 0;
  return {
    meshes,
    get count() {
      return n;
    },
    set(i, matrix) {
      for (const m of meshes) m.setMatrixAt(i, matrix);
    },
    setCount(c) {
      n = c;
      for (const m of meshes) m.count = c;
    },
    finish(bounds) {
      for (const m of meshes) {
        m.instanceMatrix.needsUpdate = true;
        if (bounds !== false) m.computeBoundingSphere();
      }
    },
    addTo(parent) {
      for (const m of meshes) parent.add(m);
    },
    dispose(parent) {
      for (const m of meshes) {
        if (parent) parent.remove(m);
        m.dispose();
      }
    },
  };
}

// 人形が手に持つ1本ぶんのメッシュ（材質ごとの Mesh を1つのグループへ）。ジオメトリと材質は共有。
export function modelGroup(baked) {
  const g = new THREE.Group();
  for (const p of baked.parts) {
    const m = new THREE.Mesh(p.geometry, p.material);
    m.castShadow = true;
    m.userData.shared = true;
    g.add(m);
  }
  g.userData.shared = true;
  return g;
}

// 金属の材質は環境マップが無いと黒くつぶれるので、武器などは金属っぽさを抑えて読みやすくする。
export function softenMetal(baked, maxMetal, minRough) {
  if (!baked) return baked;
  for (const p of baked.parts) {
    const m = p.material;
    if (!m || m.metalness === undefined) continue;
    m.metalness = Math.min(m.metalness, maxMetal);
    m.roughness = Math.max(m.roughness, minRough);
  }
  return baked;
}

// 同じモデルを matrices の数だけ置いて、材質ごとに1つの固定ジオメトリへ焼く（動かない物用）。
// worldUv=true なら模様の座標を世界の座標から付け直す（伸ばしても模様が伸びない）。
export function bakeStatic(baked, matrices, opts) {
  const o = opts || {};
  const meshes = [];
  for (const p of baked.parts) {
    const geos = [];
    for (const mat of matrices) {
      const g = p.geometry.clone();
      g.applyMatrix4(mat);
      if (o.worldUv && g.attributes.uv) {
        const pos = g.attributes.position;
        const nor = g.attributes.normal;
        const uv = g.attributes.uv;
        // 三角形ごとに同じ投影軸を使う（面の途中で模様が折れないように）
        for (let i = 0; i < pos.count; i += 3) {
          let ax = 0;
          let ay = 0;
          let az = 0;
          for (let k = 0; k < 3 && i + k < pos.count; k += 1) {
            ax += nor.getX(i + k);
            ay += nor.getY(i + k);
            az += nor.getZ(i + k);
          }
          for (let k = 0; k < 3 && i + k < pos.count; k += 1) {
            const t = worldUV(ax, ay, az, pos.getX(i + k), pos.getY(i + k), pos.getZ(i + k), o.repeat);
            uv.setXY(i + k, t[0], t[1]);
          }
        }
        uv.needsUpdate = true;
      }
      geos.push(g);
    }
    if (!geos.length) continue;
    const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
    if (!merged) continue;
    merged.computeBoundingSphere();
    const mesh = new THREE.Mesh(merged, o.material ? o.material(p.material) : p.material);
    mesh.castShadow = o.castShadow !== false;
    mesh.receiveShadow = o.receiveShadow !== false;
    if (o.name) mesh.name = o.name + ':' + (p.material.name || 'm');
    meshes.push(mesh);
  }
  return meshes;
}
