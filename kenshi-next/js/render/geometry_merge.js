// 頂点カラーの静的ジオメトリを、安全に非インデックス結合する。
import { Float32BufferAttribute } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const ATTRIBUTE_SIZES = { position: 3, normal: 3, color: 3, aWind: 1 };

function defaultAttribute(name, count) {
  const size = ATTRIBUTE_SIZES[name];
  if (!size) return null;
  const values = new Float32Array(count * size);
  // 色が無い部品も頂点色マテリアルで元の色のまま表示する。
  if (name === 'color') values.fill(1);
  return new Float32BufferAttribute(values, size);
}

// geometries は呼び出し側が所有する作業用配列。各ジオメトリを正規化するが、
// 結合失敗時にも元のジオメトリを個別描画へ使えるよう破棄しない。
export function mergeVertexGeometries(geometries, requestedAttributes) {
  if (!Array.isArray(geometries) || geometries.length === 0) return null;
  const names = [...new Set(['position', ...(requestedAttributes || [])])];
  if (names.some((name) => !ATTRIBUTE_SIZES[name])) return null;

  for (let i = 0; i < geometries.length; i += 1) {
    let geometry = geometries[i];
    const position = geometry && geometry.getAttribute('position');
    if (!position || position.itemSize !== ATTRIBUTE_SIZES.position) return null;

    for (const name of Object.keys(geometry.attributes)) {
      if (!names.includes(name)) geometry.deleteAttribute(name);
    }
    // 形状に由来する法線・色・風属性の有無を全パーツで統一する。
    for (const name of names) {
      let attribute = geometry.getAttribute(name);
      if (name === 'normal' && (!attribute || attribute.itemSize !== 3 || attribute.count !== position.count)) {
        geometry.deleteAttribute(name);
        geometry.computeVertexNormals();
        attribute = geometry.getAttribute(name);
      }
      if (!attribute || attribute.itemSize !== ATTRIBUTE_SIZES[name] || attribute.count !== position.count) {
        const replacement = defaultAttribute(name, position.count);
        if (!replacement) return null;
        geometry.setAttribute(name, replacement);
      }
    }

    // mergeGeometries は index の有無も一致を要求する。全件を非インデックス化する。
    if (geometry.index) {
      const unindexed = geometry.toNonIndexed();
      geometry.dispose();
      geometry = unindexed;
      geometries[i] = geometry;
    }
    // これらの見た目専用メッシュでは変形ターゲットを使わない。
    geometry.morphAttributes = {};
    geometry.morphTargetsRelative = false;
  }

  try {
    return mergeGeometries(geometries, false) || null;
  } catch {
    return null;
  }
}

