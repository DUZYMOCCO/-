// 風の変形は頂点シェーダーで行う。CPU側はuniformだけを更新する。
import * as THREE from 'three';

export function addWindAttribute(geometry, amount = 1, exponent = 1.65) {
  const position = geometry && geometry.attributes && geometry.attributes.position;
  if (!position) return geometry;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < position.count; i += 1) {
    const y = position.getY(i);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  const range = Math.max(1e-4, maxY - minY);
  const weights = new Float32Array(position.count);
  const strength = Math.max(0, Number(amount) || 0);
  for (let i = 0; i < position.count; i += 1) {
    const t = Math.max(0, Math.min(1, (position.getY(i) - minY) / range));
    const rooted = Math.max(0, Math.min(1, (t - 0.04) / 0.84));
    const smooth = rooted * rooted * (3 - 2 * rooted);
    weights[i] = strength * smooth ** exponent;
  }
  geometry.setAttribute('aWind', new THREE.BufferAttribute(weights, 1));
  return geometry;
}

export function attachWind(material, key, amplitude = 0.14) {
  const uniforms = {
    uWindTime: { value: 0 },
    uWindStrength: { value: 1 },
    uWindAmplitude: { value: amplitude },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nattribute float aWind;\nuniform float uWindTime;\nuniform float uWindStrength;\nuniform float uWindAmplitude;'
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
vec3 windWorldPosition;
#ifdef USE_INSTANCING
windWorldPosition = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
#else
windWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
#endif
float windPhase = windWorldPosition.x * 0.13 + windWorldPosition.z * 0.09 + uWindTime * 0.72;
float windWave = sin(windPhase) + 0.28 * sin(windPhase * 1.71 - uWindTime * 0.31);
transformed.x += windWave * aWind * uWindStrength * uWindAmplitude;
transformed.z += cos(windPhase * 0.77 + 0.8) * aWind * uWindStrength * uWindAmplitude * 0.42;`
      );
  };
  material.customProgramCacheKey = () => `wind-v1-${key}`;
  return {
    setTime(value) {
      uniforms.uWindTime.value = Number.isFinite(value) ? value : 0;
    },
    setEnabled(enabled) {
      uniforms.uWindStrength.value = enabled ? 1 : 0;
    },
  };
}
