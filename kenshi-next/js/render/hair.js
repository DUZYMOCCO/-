// 21:xx 女性の人形の髪（tools/extract_hair.py で tex_f3_beauty の glb から抜いた髪だけの頂点）。
// 体と同じ骨・同じ材質なので、体の形に髪を足した形を髪型ごとに1つ作る（人形1人＝描画1回のまま）。
import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

export async function loadHairData(dir) {
  const base = dir || 'assets/hair_f/';
  const meta = await (await fetch(base + 'hair_f.json')).json();
  const out = {};
  for (const [style, m] of Object.entries(meta.styles)) {
    const res = await fetch(base + style + '.bin');
    if (!res.ok) throw new Error('髪を読めません: ' + style);
    const buf = await res.arrayBuffer();
    const n = m.vertices;
    let o = 0;
    const take = (Ctor, count) => {
      const a = new Ctor(buf, o, count);
      o += count * Ctor.BYTES_PER_ELEMENT;
      return a;
    };
    out[style] = {
      position: take(Float32Array, n * 3),
      normal: take(Float32Array, n * 3),
      uv: take(Float32Array, n * 2),
      skinIndex: take(Uint16Array, n * 4),
      skinWeight: take(Float32Array, n * 4),
      index: take(Uint16Array, m.indices),
      vertices: n,
      skin: m.skin,
    };
  }
  return out;
}

// 体の形（BufferGeometry）に髪を足す。体に有って髪に無い属性（uv2 など）は 0 で埋める。
export function mergeHair(body, hair) {
  const nb = body.attributes.position.count;
  const nh = hair.vertices;
  const total = nb + nh;
  const g = new THREE.BufferGeometry();
  for (const [name, attr] of Object.entries(body.attributes)) {
    const size = attr.itemSize;
    const Ctor = attr.array.constructor;
    const merged = new THREE.BufferAttribute(new Ctor(total * size), size, attr.normalized);
    for (let i = 0; i < nb; i++) {
      for (let c = 0; c < size; c++) merged.setComponent(i, c, attr.getComponent(i, c));
    }
    const src = hair[name];
    if (src) {
      for (let i = 0; i < nh; i++) {
        for (let c = 0; c < size; c++) merged.setComponent(nb + i, c, src[i * size + c] || 0);
      }
    }
    g.setAttribute(name, merged);
  }
  const bi = body.index ? body.index.array : null;
  const bodyCount = bi ? bi.length : nb;
  const IndexCtor = total > 65535 ? Uint32Array : Uint16Array;
  const idx = new IndexCtor(bodyCount + hair.index.length);
  if (bi) idx.set(bi);
  else for (let i = 0; i < nb; i++) idx[i] = i;
  for (let i = 0; i < hair.index.length; i++) idx[bodyCount + i] = hair.index[i] + nb;
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

// 髪型ごとの人形の型 { style: { scene, animations } }。動作は元の型と共有。
export function buildHairTemplates(template, hairData) {
  const out = {};
  for (const [style, hair] of Object.entries(hairData)) {
    const scene = SkeletonUtils.clone(template.scene);
    let done = false;
    scene.traverse((obj) => {
      if (done || !obj.isSkinnedMesh) return;
      obj.geometry = mergeHair(obj.geometry, hair);
      done = true;
    });
    if (done) out[style] = { scene, animations: template.animations };
  }
  return out;
}
