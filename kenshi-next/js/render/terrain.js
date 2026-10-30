// 地面・道・岩・建物・枯れ木・廃墟・小物。地面は heightAt で起伏させ、頂点カラーで塗る。

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { heightAt } from '../sim/index.js';
import { groundMix, shackPieces, doorSideToward, WALL_H, wallColorFor } from './asset_plan.js';

// 夜の屋根に足す月明かりの色（模様の色にかける）
const ROOF_MOON = '#7f8fb0';
const ROOF_NIGHT_GLOW = 0.32;
import { instancedModel, bakeStatic } from './models.js';
import { greenK, pathDist, streamDist, PALETTE } from './green_plan.js';

// 翠緑の盆地の地面の色
const GREEN_LUSH = new THREE.Color(PALETTE.lush);
const GREEN_DRY = new THREE.Color(PALETTE.dry);
const GREEN_PATH_C = new THREE.Color(PALETTE.path);
const GREEN_MUD = new THREE.Color('#4a5a34');

const SAND_BRIGHT = new THREE.Color('#e2c891');
const SAND_LIGHT = new THREE.Color('#cdb07a');
const SAND_DARK = new THREE.Color('#9b6547');
const ROCK_RED = new THREE.Color('#8c5a45');
const ROCK_BROWN = new THREE.Color('#6b5340');
const SLOPE_RED = new THREE.Color('#7a4a33');
const ROAD_COLOR = new THREE.Color('#dcc49a');
const TOWN_FLOOR = new THREE.Color('#c3ae86');
const TREE_COLOR = new THREE.Color('#6b5a48');
const RUIN_COLOR = new THREE.Color('#96795a');
const STONE_COLOR = new THREE.Color('#9a9086');
const GRASS_COLOR = new THREE.Color('#b09a62');

// 砂漠の岩の3色。岩ごとに決定的に選ぶ。
const ROCK_TINTS = [
  new THREE.Color('#8a6a4a'),
  new THREE.Color('#a0784e'),
  new THREE.Color('#5e4a3a'),
];

// 岩肌の絵を貼る時の色むら（白に近い倍率）
const ROCK_TINTS_TEX = [
  new THREE.Color('#f2e2d2'),
  new THREE.Color('#ffe6cc'),
  new THREE.Color('#c9b9a9'),
];

// 丘が最大 ±12m 程度まで高くなる予定なので、4m 間隔（100分割）から 2.5m 間隔へ上げる。
// 161 × 161 = 25,921 頂点で、6万頂点の上限に収まる。
const GROUND_SEGMENTS = 160;
const WORLD_HALF = 200;

function clamp01(v) {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function smoothstep(edge0, edge1, v) {
  const t = clamp01((v - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function fract(v) {
  return v - Math.floor(v);
}

// 位置から決まる 0..1 の値。同じ場所なら毎回同じ見た目になる。
function hash2(x, z, salt) {
  return fract(Math.sin(x * 127.1 + z * 311.7 + salt * 74.7) * 43758.5453);
}

// 描画用の決定的な擬似乱数。ルール層の rngState には触れない。
function makeRng(seed) {
  let s = (Math.floor(Number(seed)) | 0) ^ 0x9e3779b9;
  if (s === 0) s = 1;
  return function next() {
    s = (s + 0x6d2b79f5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function distanceToSegment(px, pz, a, b) {
  const vx = b.x - a.x;
  const vz = b.z - a.z;
  const wx = px - a.x;
  const wz = pz - a.z;
  const len2 = vx * vx + vz * vz;
  let t = len2 > 0 ? (wx * vx + wz * vz) / len2 : 0;
  if (t < 0) t = 0;
  if (t > 1) t = 1;
  const dx = px - (a.x + vx * t);
  const dz = pz - (a.z + vz * t);
  return Math.sqrt(dx * dx + dz * dz);
}

function distanceToRoad(px, pz, road) {
  if (!road || road.length < 2) return Infinity;
  let best = Infinity;
  for (let i = 0; i < road.length - 1; i += 1) {
    const d = distanceToSegment(px, pz, road[i], road[i + 1]);
    if (d < best) best = d;
  }
  return best;
}

function placeList(state) {
  const out = [];
  if (state && state.places) {
    for (const key of Object.keys(state.places)) out.push(state.places[key]);
  }
  return out;
}

// IcosahedronGeometry(1,0) の頂点を、位置から決まる量だけゆがめる。
// 同じ座標の頂点は同じ量だけ動くので、面が裂けない。
function makeRockGeometry(variant) {
  const geo = new THREE.IcosahedronGeometry(1, 0);
  const position = geo.attributes.position;
  const sx = 0.9 + variant * 0.16;
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const n1 = hash2(x * 3.1 + variant, y * 2.7 - z * 1.3, 11 + variant);
    const n2 = hash2(y * 3.7 + variant, z * 2.3 + x * 0.7, 23 + variant);
    const n3 = hash2(z * 3.3 - variant, x * 2.9 - y * 1.1, 37 + variant);
    const k = 0.76 + n1 * 0.46;
    position.setXYZ(
      i,
      x * k * (0.9 + n2 * 0.3) * sx,
      y * k * (0.66 + n3 * 0.34),
      z * k * (0.9 + n3 * 0.3)
    );
  }
  position.needsUpdate = true;
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

// 枯れ木 1本（高さ1）を1ジオメトリにまとめる。
// 幹は根元0.22m・先端0.08m、枝は太さ0.06〜0.1m・長さ1〜1.8m相当（既定の高さ3mで）。
function makeTreeGeometry() {
  const parts = [];
  const trunk = new THREE.CylinderGeometry(0.08, 0.22, 1, 6);
  trunk.translate(0, 0.5, 0);
  parts.push(trunk);

  const branches = [
    { y: 0.45, len: 0.36, tilt: 0.62, rot: 0.4, rad: 0.085 },
    { y: 0.6, len: 0.44, tilt: -0.55, rot: 2.1, rad: 0.075 },
    { y: 0.75, len: 0.52, tilt: 0.75, rot: 4.0, rad: 0.065 },
    { y: 0.88, len: 0.6, tilt: -0.7, rot: 5.3, rad: 0.06 },
  ];
  for (const b of branches) {
    const geo = new THREE.CylinderGeometry(b.rad * 0.45, b.rad, b.len, 5);
    geo.translate(0, b.len / 2, 0);
    geo.rotateZ(b.tilt);
    geo.rotateY(b.rot);
    geo.translate(0, b.y, 0);
    parts.push(geo);
  }

  const merged = mergeGeometries(parts, false);
  if (!merged) return parts[0];
  for (const part of parts) part.dispose();
  merged.computeBoundingSphere();
  return merged;
}

// 廃墟 1つ（1×1の敷地、高さ1）を、高さの違う箱を集めて1ジオメトリにする。
function makeRuinGeometry() {
  const parts = [];

  function block(w, h, d, x, z) {
    const geo = new THREE.BoxGeometry(w, h, d);
    geo.translate(x, h / 2, z);
    parts.push(geo);
  }

  // 奥の壁（x 方向）: 上端をぎざぎざに
  const backHeights = [1.0, 0.55, 0.82, 0.42];
  for (let i = 0; i < backHeights.length; i += 1) {
    block(0.26, backHeights[i], 0.12, -0.375 + i * 0.25, -0.42);
  }
  // 左の壁（z 方向）: 途中で崩れている
  const sideHeights = [0.72, 0.95, 0.5, 0.3];
  for (let i = 0; i < sideHeights.length; i += 1) {
    block(0.12, sideHeights[i], 0.26, -0.42, -0.375 + i * 0.25);
  }
  // 崩れた瓦礫
  block(0.22, 0.2, 0.2, 0.22, 0.24);
  block(0.16, 0.12, 0.3, 0.05, 0.32);

  const merged = mergeGeometries(parts, false);
  if (!merged) return parts[0];
  for (const part of parts) part.dispose();
  merged.computeBoundingSphere();
  return merged;
}

// 枯れ草の束（高さ0.7程度）を1ジオメトリにまとめる。配置時に0.5〜0.9mへ拡大する。
function makeGrassGeometry() {
  const parts = [];
  for (let i = 0; i < 4; i += 1) {
    const geo = new THREE.ConeGeometry(0.05, 0.7, 3);
    geo.translate(0, 0.35, 0);
    geo.rotateZ((i - 1.5) * 0.22);
    geo.rotateY(i * 1.7);
    geo.translate((i - 1.5) * 0.05, 0, ((i % 2) - 0.5) * 0.06);
    parts.push(geo);
  }
  const merged = mergeGeometries(parts, false);
  if (!merged) return parts[0];
  for (const part of parts) part.dispose();
  merged.computeBoundingSphere();
  return merged;
}

// 町の中と道の上を避けて、小物を決定的に散らす。
function scatter(state, rng, count, minScale, maxScale) {
  const out = [];
  const places = placeList(state);
  const roads = (state && state.roads) || [];
  let guard = 0;
  while (out.length < count && guard < count * 60) {
    guard += 1;
    const x = (rng() * 2 - 1) * (WORLD_HALF - 6);
    const z = (rng() * 2 - 1) * (WORLD_HALF - 6);
    let blocked = false;
    for (const p of places) {
      const dx = x - p.x;
      const dz = z - p.z;
      if (Math.sqrt(dx * dx + dz * dz) < p.r + 3) {
        blocked = true;
        break;
      }
    }
    if (blocked) continue;
    if (distanceToRoad(x, z, roads) < 5) continue;
    if (greenK(x, z) > 0.2) continue; // 盆地の中に荒野の枯れ草・小石は置かない
    out.push({
      x,
      z,
      scale: minScale + rng() * (maxScale - minScale),
      rot: rng() * Math.PI * 2,
      shade: 0.72 + rng() * 0.36,
    });
  }
  return out;
}

// 地面の素材テクスチャの色合わせ（素材の平均色 → 従来の砂漠の色へ寄せる倍率、線形）。
const TINT_SAND = new THREE.Vector3(1.62, 1.48, 1.08);
const TINT_ROCKY = new THREE.Vector3(1.55, 1.3, 1.02);
const TINT_DIRT = new THREE.Vector3(1.72, 1.6, 1.38);
const TINT_ROCK = new THREE.Vector3(1.45, 1.25, 1.02);

function prepTexture(tex, isColor, renderer) {
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  // 見下ろしの斜め視点で遠くがぼやけすぎない程度。携帯向けに 4 まで。
  const maxAniso = renderer && renderer.capabilities ? renderer.capabilities.getMaxAnisotropy() : 4;
  tex.anisotropy = Math.min(4, maxAniso || 1);
  tex.needsUpdate = true;
  return tex;
}

// 地面: 砂・岩場・踏み固めた土の3素材を頂点ごとの重み (gmix) で混ぜる。
// UV は世界座標（XZ）。繰り返しを隠すため、6.3m と 17m（回転）の2つの大きさを
// 大きなまだら（同じ砂の絵を 160m で引き伸ばして読む）で混ぜ、明るさも少し揺らす。
function makeGroundMaterial(tex, renderer) {
  for (const n of ['sand', 'rocky', 'dirt_path']) {
    prepTexture(tex[n + '_albedo'], true, renderer);
    prepTexture(tex[n + '_normal'], false, renderer);
  }
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.95,
    metalness: 0,
    flatShading: false,
  });
  const uniforms = {
    tSandA: { value: tex.sand_albedo },
    tSandN: { value: tex.sand_normal },
    tRockyA: { value: tex.rocky_albedo },
    tRockyN: { value: tex.rocky_normal },
    tDirtA: { value: tex.dirt_path_albedo },
    tDirtN: { value: tex.dirt_path_normal },
    uTintS: { value: TINT_SAND },
    uTintR: { value: TINT_ROCKY },
    uTintD: { value: TINT_DIRT },
    uNormalK: { value: 0.85 },
    uGLush: { value: new THREE.Color(PALETTE.lush) },
    uGDry: { value: new THREE.Color(PALETTE.dry) },
    uGPath: { value: new THREE.Color(PALETTE.path) },
  };
  mat.userData.groundUniforms = uniforms;
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 gmix;\nattribute float ggreen;\nvarying float vGreen;\nvarying vec3 vGMix;\nvarying vec3 vGWorld;\nvarying vec3 vGNormalW;')
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvGMix = gmix;\nvGreen = ggreen;\nvGWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvGNormalW = normalize(mat3(modelMatrix) * objectNormal);'
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform sampler2D tSandA; uniform sampler2D tSandN;
uniform sampler2D tRockyA; uniform sampler2D tRockyN;
uniform sampler2D tDirtA; uniform sampler2D tDirtN;
uniform vec3 uTintS; uniform vec3 uTintR; uniform vec3 uTintD;
uniform float uNormalK;
uniform vec3 uGLush; uniform vec3 uGDry; uniform vec3 uGPath;
varying float vGreen;
varying vec3 vGMix; varying vec3 vGWorld; varying vec3 vGNormalW;
vec2 gUvA; vec2 gUvB; float gK;`
      )
      .replace(
        '#include <map_fragment>',
        `{
  vec2 gp = vGWorld.xz;
  gUvA = gp / 6.3;
  gUvB = mat2(0.8, -0.6, 0.6, 0.8) * gp / 17.0 + vec2(0.37, 0.71);
  // 大きなまだら（0..1）: 2つの大きさの混ぜ具合と明るさに使う
  float macro = dot(texture2D(tSandA, gp / 163.0 + 0.5).rgb, vec3(0.333)) * 1.0
              + dot(texture2D(tRockyA, gp / 97.0).rgb, vec3(0.333)) * 0.6;
  gK = smoothstep(0.28, 0.62, macro * 0.9);
  vec3 w = vGMix / max(0.001, vGMix.x + vGMix.y + vGMix.z);
  vec3 s = mix(texture2D(tSandA, gUvA).rgb, texture2D(tSandA, gUvB).rgb, 0.3 + 0.45 * gK) * uTintS;
  vec3 r = mix(texture2D(tRockyA, gUvA * 0.9).rgb, texture2D(tRockyA, gUvB).rgb, 0.35 + 0.4 * gK) * uTintR;
  vec3 d = mix(texture2D(tDirtA, gUvA * 1.2).rgb, texture2D(tDirtA, gUvB * 1.4).rgb, 0.4) * uTintD;
  vec3 albedo = s * w.x + r * w.y + d * w.z;
  albedo *= 0.9 + 0.2 * gK;
  if (vGreen > 0.001) {
    // 盆地: 砂の絵の明暗だけを借りて緑に塗る。道は土の色。
    float lum = dot(mix(texture2D(tSandA, gUvA).rgb, texture2D(tSandA, gUvB * 1.7).rgb, 0.5), vec3(0.333));
    vec3 grn = mix(uGLush, uGDry, smoothstep(0.3, 0.75, gK + w.y * 0.6)) * (0.62 + 0.75 * lum);
    vec3 pth = uGPath * (0.55 + 0.9 * dot(d, vec3(0.333)));
    vec3 gal = mix(grn, pth, w.z);
    albedo = mix(albedo, gal, vGreen);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), vGreen * 0.5);
  }
  diffuseColor.rgb *= albedo;
}`
      )
      .replace(
        '#include <normal_fragment_maps>',
        `{
  vec3 w = vGMix / max(0.001, vGMix.x + vGMix.y + vGMix.z);
  vec3 tn = (texture2D(tSandN, gUvA).xyz * 2.0 - 1.0) * w.x
          + (texture2D(tRockyN, gUvA * 0.9).xyz * 2.0 - 1.0) * w.y
          + (texture2D(tDirtN, gUvA * 1.2).xyz * 2.0 - 1.0) * w.z;
  tn.xy *= uNormalK;
  tn = normalize(tn);
  vec3 Nw = normalize(vGNormalW);
  vec3 T = normalize(vec3(1.0, 0.0, 0.0) - Nw * Nw.x);
  vec3 B = cross(T, Nw);
  vec3 nw = normalize(T * tn.x + B * tn.y + Nw * tn.z);
  normal = normalize((viewMatrix * vec4(nw, 0.0)).xyz);
}`
      );
  };
  mat.customProgramCacheKey = () => 'ground-tex-v2-green';
  return mat;
}

// 岩: 世界座標の3方向投影（triplanar）で岩肌の絵と法線を貼る。flatShading の角ばりは残す。
function makeRockMaterial(tex, renderer) {
  prepTexture(tex.rock_albedo, true, renderer);
  prepTexture(tex.rock_normal, false, renderer);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.93, metalness: 0, flatShading: true });
  const uniforms = {
    tRockA: { value: tex.rock_albedo },
    tRockN: { value: tex.rock_normal },
    uTint: { value: TINT_ROCK },
  };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vRWorld;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
{
  vec4 rp = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
  rp = instanceMatrix * rp;
  #endif
  vRWorld = (modelMatrix * rp).xyz;
}`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform sampler2D tRockA; uniform sampler2D tRockN; uniform vec3 uTint;
varying vec3 vRWorld;
vec3 rBw;`
      )
      .replace(
        '#include <map_fragment>',
        `{
  vec3 fn = normalize(cross(dFdx(vRWorld), dFdy(vRWorld)));
  rBw = pow(abs(fn), vec3(4.0));
  rBw /= (rBw.x + rBw.y + rBw.z);
  vec3 p = vRWorld / 3.2;
  vec3 a = texture2D(tRockA, p.zy).rgb * rBw.x + texture2D(tRockA, p.xz).rgb * rBw.y + texture2D(tRockA, p.xy).rgb * rBw.z;
  diffuseColor.rgb *= a * uTint;
}`
      )
      .replace(
        '#include <normal_fragment_maps>',
        `{
  vec3 p = vRWorld / 3.2;
  vec2 nx = texture2D(tRockN, p.zy).xy * 2.0 - 1.0;
  vec2 ny = texture2D(tRockN, p.xz).xy * 2.0 - 1.0;
  vec2 nz = texture2D(tRockN, p.xy).xy * 2.0 - 1.0;
  vec3 nW = normalize((vec4(normal, 0.0) * viewMatrix).xyz);
  nW = normalize(nW + 0.8 * (rBw.x * vec3(0.0, nx.y, nx.x) + rBw.y * vec3(ny.x, 0.0, ny.y) + rBw.z * vec3(nz.x, nz.y, 0.0)));
  normal = normalize((viewMatrix * vec4(nW, 0.0)).xyz);
}`
      );
  };
  mat.customProgramCacheKey = () => 'rock-tex-v1';
  return mat;
}

// opts: { ground: 地面テクスチャ8枚（無ければ従来の頂点カラー）, models: glb の焼き済み, renderer }
export function createTerrain(scene, state, opts) {
  const o = opts || {};
  const gtex = o.ground || null;
  const models = o.models || {};
  const group = new THREE.Group();
  group.name = 'terrain';

  const roads = (state && state.roads) || [];
  const places = placeList(state);

  // 地面
  const geometry = new THREE.PlaneGeometry(400, 400, GROUND_SEGMENTS, GROUND_SEGMENTS);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const z = position.getZ(i);
    position.setY(i, heightAt(x, z));
  }
  geometry.computeVertexNormals();
  const normal = geometry.attributes.normal;

  const colors = new Float32Array(position.count * 3);
  const gmix = new Float32Array(position.count * 3);
  const ggreen = new Float32Array(position.count);
  const dirtPlaces = places.filter((p) => p && p.kind !== 'nest' && p !== (state.places && state.places.nest));
  const tmp = new THREE.Color();
  const rockTmp = new THREE.Color();
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const h = position.getY(i);
    const ny = normal.getY(i);

    const patch =
      Math.sin(x * 0.083 + z * 0.047) * 0.5 +
      Math.sin(x * 0.021 - z * 0.067 + 1.7) * 0.3 +
      Math.cos((x + z) * 0.014 - 0.8) * 0.2;
    const t = clamp01(patch * 0.5 + 0.5);

    // 8m 程度のまだら（決定的な sin の和）で砂の色むらを足す。
    const mottle =
      Math.sin(x * 0.79 + z * 0.62) * 0.34 +
      Math.sin(x * 1.13 - z * 0.88 + 1.7) * 0.28 +
      Math.cos((x - z) * 0.53 + 0.6) * 0.22 +
      Math.sin(x * 0.27 + z * 0.31 + 3.1) * 0.16;
    const m = clamp01(mottle * 0.5 + 0.5);

    tmp.copy(SAND_LIGHT).lerp(SAND_DARK, t * 0.6 + m * 0.25);

    // 低い所は明るい砂
    const low = clamp01((0.6 - h) / 2.5);
    tmp.lerp(SAND_BRIGHT, low * 0.25);

    // 高い所は明るく、低い所は少し暗く（起伏を上から見ても分かるように）
    const hf = smoothstep(-5, 12, h);
    tmp.multiplyScalar(0.88 + hf * 0.16);

    // 急な斜面は2〜3割暗く赤茶へ寄せる
    const slope = 1 - clamp01(ny);
    const steep = smoothstep(0.12, 0.45, slope);
    if (steep > 0) {
      tmp.multiplyScalar(1 - steep * 0.28);
      tmp.lerp(SLOPE_RED, steep * 0.3);
    }

    // 高い所と急な斜面は赤茶〜暗い茶の岩肌
    const rockAmount = Math.max(smoothstep(2.5, 9, h), smoothstep(0.16, 0.5, slope));
    if (rockAmount > 0) {
      rockTmp.copy(ROCK_RED).lerp(ROCK_BROWN, clamp01(t * 1.2));
      tmp.lerp(rockTmp, rockAmount * 0.8);
    }

    // 翠緑の盆地: 緑の重み（砂漠から柔らかく移る）と、盆地への土の小道
    const gk = greenK(x, z);
    const gpd = pathDist(x, z);
    const gsd = streamDist(x, z);
    ggreen[i] = gk;
    // 道の色は残す
    const rd = Math.min(distanceToRoad(x, z, roads), gpd + 0.8);
    if (rd < 4) {
      const k = Math.max(0, 1 - rd / 4) * 0.6;
      tmp.lerp(ROAD_COLOR, k);
    }

    for (const p of places) {
      const dx = x - p.x;
      const dz = z - p.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < p.r) {
        const k = Math.max(0, 1 - d / p.r) * 0.3;
        tmp.lerp(TOWN_FLOOR, k);
      }
    }

    if (gk > 0) {
      rockTmp.copy(GREEN_LUSH).lerp(GREEN_DRY, clamp01(t * 0.9 + steep * 0.8));
      rockTmp.multiplyScalar(0.85 + m * 0.25);
      if (gsd < 5) rockTmp.lerp(GREEN_MUD, (1 - gsd / 5) * 0.7);
      const pk = gpd < 3.2 ? (1 - smoothstep(1.4, 3.2, gpd)) : 0;
      rockTmp.lerp(GREEN_PATH_C, pk);
      tmp.lerp(rockTmp, gk);
    }

    if (gtex) {
      // 素材を貼る時の頂点カラーは「従来の色 ÷ 標準の砂色」の明暗だけ（半分の強さ）。
      let town = 0;
      for (const p of dirtPlaces) {
        const dd = Math.hypot(x - p.x, z - p.z);
        town = Math.max(town, 1 - smoothstep(p.r * 0.55, p.r * 0.95, dd));
      }
      const mix = groundMix(h, slope, rd, town, t * 0.75 + m * 0.25);
      gmix[i * 3] = mix[0];
      gmix[i * 3 + 1] = mix[1];
      gmix[i * 3 + 2] = mix[2];
      const kr = 1 + (tmp.r / SAND_LIGHT.r - 1) * 0.45;
      const kg = 1 + (tmp.g / SAND_LIGHT.g - 1) * 0.45;
      const kb = 1 + (tmp.b / SAND_LIGHT.b - 1) * 0.45;
      tmp.setRGB(kr, kg, kb);
    }
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  if (gtex) geometry.setAttribute('gmix', new THREE.BufferAttribute(gmix, 3));
  if (gtex) geometry.setAttribute('ggreen', new THREE.BufferAttribute(ggreen, 1));

  const groundMaterial = gtex
    ? makeGroundMaterial(gtex, o.renderer)
    : new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.96,
        metalness: 0,
        flatShading: true,
      });
  const ground = new THREE.Mesh(geometry, groundMaterial);
  ground.name = 'ground';
  ground.receiveShadow = true;
  group.add(ground);

  const dummy = new THREE.Object3D();
  const instanceColor = new THREE.Color();

  // 岩（形の違う3種に分けたインスタンス）
  const rocks = (state && state.rocks) || [];
  const rockGeometries = [makeRockGeometry(0), makeRockGeometry(1), makeRockGeometry(2)];
  const rockMaterial = gtex
    ? makeRockMaterial(gtex, o.renderer)
    : new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 1,
        metalness: 0,
        flatShading: true,
      });
  const rockBuckets = [[], [], []];
  for (let i = 0; i < rocks.length; i += 1) {
    const r = rocks[i];
    const bucket = Math.min(2, Math.floor(hash2(r.x, r.z, 5) * 3));
    rockBuckets[bucket].push(r);
  }
  const rockMeshes = [];
  for (let v = 0; v < rockGeometries.length; v += 1) {
    const bucket = rockBuckets[v];
    const mesh = new THREE.InstancedMesh(
      rockGeometries[v],
      rockMaterial,
      Math.max(1, bucket.length)
    );
    mesh.count = bucket.length;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = 'rocks' + v;
    for (let i = 0; i < bucket.length; i += 1) {
      const r = bucket[i];
      const y = heightAt(r.x, r.z);
      const scale = r.r * (0.85 + hash2(r.x, r.z, 10) * 0.35);
      // 大きな岩は縦に最大1.3倍まで伸ばして岩柱っぽくする。
      const stretch = r.r > 2 ? 1 + hash2(r.x, r.z, 14) * 0.3 : 1;
      // 下側を地面に少し埋める。
      dummy.position.set(r.x, y - r.r * 0.3, r.z);
      dummy.rotation.set(
        hash2(r.x, r.z, 7) * 0.5,
        hash2(r.x, r.z, 8) * Math.PI * 2,
        hash2(r.x, r.z, 9) * 0.4
      );
      dummy.scale.set(
        scale,
        scale * (0.72 + hash2(r.x, r.z, 12) * 0.3) * stretch,
        scale * 0.95
      );
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      const tint = (gtex ? ROCK_TINTS_TEX : ROCK_TINTS)[Math.min(2, Math.floor(hash2(r.x, r.z, 6) * 3))];
      const shade = 0.88 + hash2(r.x, r.z, 11) * 0.18;
      instanceColor.copy(tint).multiplyScalar(shade);
      mesh.setColorAt(i, instanceColor);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    group.add(mesh);
    rockMeshes.push(mesh);
  }

  // 建物の箱（1つのインスタンスにまとめる）
  const allBuildings = (state && state.buildings) || [];
  // 町の建物は、壁板と屋根板の glb がそろっていれば小屋に組む（当たり判定の箱は sim のまま）。
  const shackOk = !!(models.wall_orange && models.door_orange && models.roof);
  // 入れる小屋（bldg1、interiors.js が描く）は除く
  const skipIdx = o.skipBuildings instanceof Set ? o.skipBuildings : null;
  const shackList = shackOk ? allBuildings.filter((b, i) => b.kind === 'town' && !(skipIdx && skipIdx.has(i))) : [];
  // 柵の glb（tex_props_cx1）が読めたら、柵の箱は描かず clutter.js が板を並べる
  const fenceGlb = !!o.fenceGlb;
  const buildings = allBuildings.filter((b) => !(shackOk && b.kind === 'town') && !(fenceGlb && b.kind === 'fence'));
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const town1 = state && state.places ? state.places.town1 : null;
  const town2 = state && state.places ? state.places.town2 : null;
  const buildingMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.92,
    metalness: 0,
  });
  const buildingMesh = new THREE.InstancedMesh(
    boxGeo,
    buildingMaterial,
    Math.max(1, buildings.length)
  );
  buildingMesh.count = buildings.length;
  buildingMesh.castShadow = true;
  buildingMesh.receiveShadow = true;
  buildingMesh.name = 'buildings';
  const buildingMeshes = [buildingMesh];
  for (let i = 0; i < buildings.length; i += 1) {
    const b = buildings[i];
    let color;
    if (b.kind === 'camp') {
      color = new THREE.Color('#453c35');
    } else if (b.kind === 'fence') {
      color = new THREE.Color('#5a4a3b');
    } else {
      const d1 = town1 ? Math.hypot(b.x - town1.x, b.z - town1.z) : Infinity;
      const d2 = town2 ? Math.hypot(b.x - town2.x, b.z - town2.z) : Infinity;
      const base = d2 < d1 ? new THREE.Color('#a88d68') : new THREE.Color('#b9a382');
      const shade = 0.9 + ((i * 13) % 18) / 100;
      color = base.multiplyScalar(shade);
    }
    dummy.position.set(b.x, heightAt(b.x, b.z) + b.h / 2, b.z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(b.w, b.h, b.d);
    dummy.updateMatrix();
    buildingMesh.setMatrixAt(i, dummy.matrix);
    buildingMesh.setColorAt(i, color);
  }
  buildingMesh.instanceMatrix.needsUpdate = true;
  if (buildingMesh.instanceColor) buildingMesh.instanceColor.needsUpdate = true;
  group.add(buildingMesh);

  const shacks = [];
  const shackRoofMats = [];
  if (shackList.length) {
    const plans = shackList.map((b) => {
      const town = [town1, town2].filter(Boolean).sort((a, c) => Math.hypot(b.x - a.x, b.z - a.z) - Math.hypot(b.x - c.x, b.z - c.z))[0];
      const side = town ? doorSideToward(b, town.x, town.z) : 0;
      return { b, pieces: shackPieces(b, side) };
    });
    // 壁の色は建物ごとに決める（橙・砂色・灰色）。読めない色は橙で代える。
    const colorOf = (b) => {
      const c = wallColorFor(Math.round(b.x * 7) * 131 + Math.round(b.z * 7));
      return models['wall_' + c] && models['door_' + c] ? c : 'orange';
    };
    const counts = {};
    for (const pl of plans) {
      pl.color = colorOf(pl.b);
      for (const pc of pl.pieces) {
        if (pc.type === 'roof') continue;
        const key = pc.type + '_' + pl.color;
        counts[key] = (counts[key] || 0) + 1;
      }
    }
    const sets = {};
    for (const key of Object.keys(counts)) {
      sets[key] = instancedModel(models[key], counts[key], { name: 'shack_' + key });
    }
    const idx = {};
    const roofMats = [];
    for (const pl of plans) {
      const b = pl.b;
      // 斜面でも浮かないよう、四隅のいちばん低い所から建てる（少し埋める）
      const y0 =
        Math.min(
          heightAt(b.x - b.w / 2, b.z - b.d / 2),
          heightAt(b.x + b.w / 2, b.z - b.d / 2),
          heightAt(b.x - b.w / 2, b.z + b.d / 2),
          heightAt(b.x + b.w / 2, b.z + b.d / 2),
          heightAt(b.x, b.z)
        ) - 0.08;
      const y1 = Math.max(
        heightAt(b.x - b.w / 2, b.z - b.d / 2),
        heightAt(b.x + b.w / 2, b.z - b.d / 2),
        heightAt(b.x - b.w / 2, b.z + b.d / 2),
        heightAt(b.x + b.w / 2, b.z + b.d / 2)
      );
      // 地面の傾きぶん壁を縦に伸ばして、高い側でも 2.6m 見えるように
      const wallSy = (WALL_H + (y1 - y0)) / WALL_H;
      for (const pc of pl.pieces) {
        dummy.rotation.set(0, pc.rot, 0);
        if (pc.type === 'roof') {
          // 屋根は1枚を箱いっぱいに伸ばし、あとで固定のジオメトリへ焼く（模様は世界の座標で付け直す）
          dummy.position.set(b.x + pc.x, y0 + WALL_H * wallSy - 0.02, b.z + pc.z);
          dummy.scale.set(pc.scaleX, 1, pc.scaleZ);
          dummy.updateMatrix();
          roofMats.push(dummy.matrix.clone());
          continue;
        }
        const key = pc.type + '_' + pl.color;
        dummy.position.set(b.x + pc.x, y0, b.z + pc.z);
        dummy.scale.set(pc.scaleX, wallSy, 1);
        dummy.updateMatrix();
        idx[key] = idx[key] || 0;
        sets[key].set(idx[key], dummy.matrix);
        idx[key] += 1;
      }
      shacks.push({ x: b.x, z: b.z, w: b.w, d: b.d, h: WALL_H * wallSy + 0.3, color: pl.color });
    }
    for (const k of Object.keys(sets)) {
      sets[k].setCount(idx[k] || 0);
      sets[k].finish();
      sets[k].addTo(group);
      buildingMeshes.push(...sets[k].meshes);
    }
    // 屋根: 夜も真っ黒にならないよう、月明かりぶんの弱い自己発光を足す（setNight で強さを変える）
    const roofMeshes = bakeStatic(models.roof, roofMats, {
      name: 'shack_roof',
      worldUv: true,
      material: (m) => {
        const c = m.clone();
        if (c.map) c.emissiveMap = c.map;
        c.emissive = new THREE.Color(ROOF_MOON);
        c.emissiveIntensity = 0;
        return c;
      },
    });
    for (const m of roofMeshes) {
      group.add(m);
      buildingMeshes.push(m);
      shackRoofMats.push(m.material);
    }
  }

  const props = Array.isArray(state && state.props) ? state.props : [];
  const trees = [];
  const ruins = [];
  for (const prop of props) {
    if (!prop) continue;
    if (prop.kind === 'tree') trees.push(prop);
    else if (prop.kind === 'ruin') ruins.push(prop);
  }

  // 枯れ木（1つのインスタンス）
  const treeMaterial = new THREE.MeshStandardMaterial({
    color: TREE_COLOR,
    roughness: 1,
    metalness: 0,
    flatShading: true,
  });
  const treeMesh = new THREE.InstancedMesh(
    makeTreeGeometry(),
    treeMaterial,
    Math.max(1, trees.length)
  );
  treeMesh.count = trees.length;
  treeMesh.castShadow = true;
  treeMesh.receiveShadow = true;
  treeMesh.name = 'trees';
  for (let i = 0; i < trees.length; i += 1) {
    const t = trees[i];
    const r = Number.isFinite(t.r) ? t.r : 0.45;
    const h = Number.isFinite(t.h) ? t.h : 3;
    const scaleXZ = Math.max(0.2, r / 0.45);
    dummy.position.set(t.x, heightAt(t.x, t.z), t.z);
    dummy.rotation.set(0, (Number.isFinite(t.rot) ? t.rot : 0) + hash2(t.x, t.z, 13) * 0.6, 0);
    dummy.scale.set(scaleXZ, h, scaleXZ);
    dummy.updateMatrix();
    treeMesh.setMatrixAt(i, dummy.matrix);
  }
  treeMesh.instanceMatrix.needsUpdate = true;
  group.add(treeMesh);

  // 廃墟（1つのインスタンス）
  const ruinMaterial = new THREE.MeshStandardMaterial({
    color: RUIN_COLOR,
    roughness: 1,
    metalness: 0,
    flatShading: true,
  });
  const ruinMesh = new THREE.InstancedMesh(
    makeRuinGeometry(),
    ruinMaterial,
    Math.max(1, ruins.length)
  );
  ruinMesh.count = ruins.length;
  ruinMesh.castShadow = true;
  ruinMesh.receiveShadow = true;
  ruinMesh.name = 'ruins';
  for (let i = 0; i < ruins.length; i += 1) {
    const u = ruins[i];
    const w = Number.isFinite(u.w) ? u.w : 4;
    const d = Number.isFinite(u.d) ? u.d : 3;
    const h = Number.isFinite(u.h) ? u.h : 2;
    dummy.position.set(u.x, heightAt(u.x, u.z) - 0.05, u.z);
    dummy.rotation.set(0, Number.isFinite(u.rot) ? u.rot : 0, 0);
    dummy.scale.set(w, h, d);
    dummy.updateMatrix();
    ruinMesh.setMatrixAt(i, dummy.matrix);
  }
  ruinMesh.instanceMatrix.needsUpdate = true;
  group.add(ruinMesh);

  // 小石と枯れ草（影は落とさない）
  const rng = makeRng(state && state.seed);
  const stoneMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1,
    metalness: 0,
    flatShading: true,
  });
  const stoneData = scatter(state, rng, 300, 0.08, 0.3);
  const stoneMesh = new THREE.InstancedMesh(
    rockGeometries[2],
    stoneMaterial,
    Math.max(1, stoneData.length)
  );
  stoneMesh.count = stoneData.length;
  stoneMesh.castShadow = false;
  stoneMesh.receiveShadow = false;
  stoneMesh.name = 'stones';
  for (let i = 0; i < stoneData.length; i += 1) {
    const s = stoneData[i];
    dummy.position.set(s.x, heightAt(s.x, s.z) + s.scale * 0.18, s.z);
    dummy.rotation.set(0, s.rot, 0);
    dummy.scale.set(s.scale, s.scale * 0.6, s.scale);
    dummy.updateMatrix();
    stoneMesh.setMatrixAt(i, dummy.matrix);
    instanceColor.copy(STONE_COLOR).multiplyScalar(s.shade);
    stoneMesh.setColorAt(i, instanceColor);
  }
  stoneMesh.instanceMatrix.needsUpdate = true;
  if (stoneMesh.instanceColor) stoneMesh.instanceColor.needsUpdate = true;
  group.add(stoneMesh);

  const grassMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1,
    metalness: 0,
    flatShading: true,
  });
  const grassData = scatter(state, rng, 900, 0.72, 1.28);
  const grassMesh = new THREE.InstancedMesh(
    makeGrassGeometry(),
    grassMaterial,
    Math.max(1, grassData.length)
  );
  grassMesh.count = grassData.length;
  grassMesh.castShadow = false;
  grassMesh.receiveShadow = false;
  grassMesh.name = 'grass';
  for (let i = 0; i < grassData.length; i += 1) {
    const g = grassData[i];
    dummy.position.set(g.x, heightAt(g.x, g.z), g.z);
    dummy.rotation.set(0, g.rot, 0);
    dummy.scale.set(g.scale, g.scale, g.scale);
    dummy.updateMatrix();
    grassMesh.setMatrixAt(i, dummy.matrix);
    instanceColor.copy(GRASS_COLOR).multiplyScalar(g.shade);
    grassMesh.setColorAt(i, instanceColor);
  }
  grassMesh.instanceMatrix.needsUpdate = true;
  if (grassMesh.instanceColor) grassMesh.instanceColor.needsUpdate = true;
  group.add(grassMesh);

  scene.add(group);

  // 夜の暗さ 0..1 で屋根の月明かりを変える
  function setNight(k) {
    for (const m of shackRoofMats) m.emissiveIntensity = ROOF_NIGHT_GLOW * Math.max(0, Math.min(1, k));
  }

  return {
    setNight,
    roofMeshes: shackRoofMats.length,
    group,
    ground,
    rocks: rockMeshes,
    buildings: buildingMeshes,
    shacks,
    textured: !!gtex,
    trees: treeMesh,
    ruins: ruinMesh,
    stones: stoneMesh,
    grass: grassMesh,
    propMeshes: {
      trees: treeMesh,
      ruins: ruinMesh,
      stones: stoneMesh,
      grass: grassMesh,
    },
  };
}
