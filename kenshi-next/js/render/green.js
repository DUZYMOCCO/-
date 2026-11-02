// 翠緑の盆地の見た目: 草と花（升目ごとに1メッシュ、遠い升は描かない）、枯れ木・茂み・苔岩・葦、小川、橋、牧場の柵。
import * as THREE from 'three';
import { mergeVertexGeometries } from './geometry_merge.js';
import { heightAt } from '../sim/index.js';
import { planGreen, groupByChunk, chunkVisible, streamLine, STREAM_W, GREEN_GRASS, GREEN_BIG, PALETTE, FOLIAGE, CULL_DIST, hash01 } from './green_plan.js';
import { makeDeadTrees, DEADTREE_VARIANTS } from './deadtree.js';
import { addWindAttribute, attachWind } from './wind.js';

// 計画の木（kind 0〜2）は、丸い木の glb の代わりに手続きの枯れ木（DEADTREE_VARIANTS 通り）を置く
const TREE_KINDS = 3;
export function deadTreeKind(it) {
  return GREEN_BIG.length + Math.floor(hash01(it.x, it.z, 31) * DEADTREE_VARIANTS) % DEADTREE_VARIANTS;
}

function makeNaturalBush(variant) {
  const shapes = [
    { x: 0.02, y: 0.47, z: 0.02, sx: 0.57, sy: 0.43, sz: 0.53 },
    { x: -0.42, y: 0.34, z: 0.18, sx: 0.42, sy: 0.34, sz: 0.4 },
    { x: 0.38, y: 0.39, z: -0.2, sx: 0.45, sy: 0.37, sz: 0.38 },
    { x: -0.12, y: 0.39, z: -0.43, sx: 0.38, sy: 0.32, sz: 0.4 },
    { x: 0.18, y: 0.69, z: 0.14, sx: 0.31, sy: 0.27, sz: 0.34 },
  ];
  const parts = [];
  const base = new THREE.Color(variant ? '#527742' : '#426d3c');
  for (let s = 0; s < shapes.length; s += 1) {
    const shape = shapes[(s + variant) % shapes.length];
    const g = new THREE.IcosahedronGeometry(1, 0);
    const position = g.attributes.position;
    for (let i = 0; i < position.count; i += 1) {
      const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
      const n = 0.9 + hash01(x * 7 + s, z * 9 + variant, 41 + i) * 0.22;
      position.setXYZ(i, x * n, y * (0.9 + hash01(z * 5, x * 3 + s, 43) * 0.2), z * n);
    }
    g.scale(shape.sx * (variant ? 0.95 : 1.04), shape.sy, shape.sz * (variant ? 1.08 : 0.94));
    g.translate(shape.x * (variant ? 1.08 : 1), shape.y, shape.z * (variant ? 0.92 : 1));
    position.needsUpdate = true;
    g.computeVertexNormals();
    const colors = new Float32Array(position.count * 3);
    const tint = base.clone().multiplyScalar(0.82 + s * 0.055);
    for (let i = 0; i < position.count; i += 1) {
      const shade = 0.86 + hash01(i, s, 47) * 0.24;
      colors[i * 3] = tint.r * shade;
      colors[i * 3 + 1] = tint.g * shade;
      colors[i * 3 + 2] = tint.b * shade;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    parts.push(g);
  }
  const merged = mergeVertexGeometries(parts, ['normal', 'color']);
  for (const g of parts) g.dispose();
  if (!merged) return null;
  merged.computeBoundingSphere();
  return merged;
}

const _hsl = { h: 0, s: 0, l: 0 };
// 緑っぽい色だけ、FOLIAGE の分だけ深い緑にする（花・木の幹・橋はそのまま）
function deepen(c) {
  if (!(c.g > c.r * 1.05 && c.g >= c.b)) return c;
  c.clone().getHSL(_hsl);
  return new THREE.Color().setHSL(_hsl.h + FOLIAGE.hue, _hsl.s * FOLIAGE.sat, _hsl.l * FOLIAGE.light);
}

// baked（材質ごとの parts）を、材質の色を頂点色に焼いた1つのジオメトリにする。
function toColored(baked) {
  const geos = [];
  for (const p of baked.parts) {
    const g = p.geometry.clone();
    for (const n of Object.keys(g.attributes)) if (n !== 'position' && n !== 'normal') g.deleteAttribute(n);
    const c = deepen(p.material && p.material.color ? p.material.color : new THREE.Color(1, 1, 1));
    const e = p.material && p.material.emissive ? p.material.emissive : null;
    const cnt = g.attributes.position.count;
    const col = new Float32Array(cnt * 3);
    for (let i = 0; i < cnt; i += 1) {
      col[i * 3] = c.r + (e ? e.r * 0.3 : 0);
      col[i * 3 + 1] = c.g + (e ? e.g * 0.3 : 0);
      col[i * 3 + 2] = c.b + (e ? e.b * 0.3 : 0);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geos.push(g);
  }
  const merged = mergeVertexGeometries(geos, ['normal', 'color']);
  for (const g of geos) g.dispose();
  return merged;
}

function bakeList(templates, list, dummy, sink, windable) {
  const geos = [];
  for (const it of list) {
    const t = templates[it.kind];
    if (!t) continue;
    const y = heightAt(it.x, it.z) - 0.04;
    dummy.position.set(it.x, y, it.z);
    dummy.rotation.set(0, it.rot, 0);
    dummy.scale.setScalar(it.s);
    dummy.updateMatrix();
    const g = t.clone();
    addWindAttribute(g, windable && windable(it) ? 1 : 0);
    g.applyMatrix4(dummy.matrix);
    geos.push(g);
  }
  if (!geos.length) return null;
  const m = mergeVertexGeometries(geos, ['normal', 'color', 'aWind']);
  for (const g of geos) g.dispose();
  if (!m || !m.attributes || !m.attributes.position) return null;
  if (sink) sink.tris += m.attributes.position.count / 3;
  m.computeBoundingSphere();
  return m;
}

function makeStream(mat) {
  const line = streamLine();
  const pos = [];
  const idx = [];
  for (let i = 0; i < line.length; i += 1) {
    const p = line[i];
    const q = line[Math.min(line.length - 1, i + 1)];
    const o = line[Math.max(0, i - 1)];
    let dx = q.x - o.x, dz = q.z - o.z;
    const l = Math.hypot(dx, dz) || 1;
    const nx = -dz / l, nz = dx / l;
    const w = STREAM_W * 0.5 * (0.85 + 0.3 * Math.sin(i * 0.7));
    for (const s of [-1, 1]) {
      const x = p.x + nx * w * s, z = p.z + nz * w * s;
      // 地面の格子（2.5m）の補間で水面が隠れないよう、まわりの一番高い所より少し上
      let hm = heightAt(p.x, p.z);
      for (const [ox, oz] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]]) hm = Math.max(hm, heightAt(x + ox, z + oz));
      const y = hm + 0.12;
      pos.push(x, y, z);
    }
    if (i < line.length - 1) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); // 上向きの面
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, mat);
  mesh.name = 'green_stream';
  mesh.receiveShadow = true;
  return mesh;
}

// models: 名前 → baked（読めた物だけ）。opts.density: 草の濃さ（main.js は既定 0.5、?green=hi で 1）
export function createGreen(scene, models, opts) {
  const o = opts || {};
  const group = new THREE.Group();
  group.name = 'green';
  const plan = planGreen(o.density);
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const solid = new THREE.MeshLambertMaterial({ vertexColors: true });
  const grassWind = attachWind(mat, 'green-grass', 0.12);
  const plantWind = attachWind(solid, 'green-plants', 0.16);
  const dummy = new THREE.Object3D();
  const stats = { tris: 0, chunks: 0, big: 0 };

  const grassT = GREEN_GRASS.map((n) => (models[n] ? toColored(models[n]) : null));
  const bigT = GREEN_BIG.map((n, i) => {
    if (i === 3 || i === 4) return makeNaturalBush(i - 3);
    return models[n] ? toColored(models[n]) : null;
  });
  bigT.push(...makeDeadTrees(DEADTREE_VARIANTS));

  // 草と花: 升目ごと
  const chunks = [];
  for (const [key, list] of groupByChunk(plan.grass)) {
    const g = bakeList(grassT, list, dummy, stats, () => true);
    if (!g) continue;
    const mesh = new THREE.Mesh(g, mat);
    mesh.name = 'green_grass_' + key;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    const [cx, cz] = key.split(',').map(Number);
    chunks.push({ mesh, cx, cz });
    group.add(mesh);
  }
  stats.chunks = chunks.length;

  // 枯れ木・茂み・岩・葦（升目ごと）
  const bigChunks = [];
  for (const [key, list0] of groupByChunk(plan.big)) {
    const list = list0.map((it) => {
      if (it.kind >= TREE_KINDS) return it;
      const species = Math.floor(hash01(it.x, it.z, 33) * TREE_KINDS);
      return hash01(it.x, it.z, 34) < 0.55 && bigT[species] ? { ...it, kind: species } : { ...it, kind: deadTreeKind(it) };
    });
    const g = bakeList(bigT, list, dummy, stats, (it) => it.kind <= 4 || it.kind === 8 || it.kind >= GREEN_BIG.length);
    if (!g) continue;
    const mesh = new THREE.Mesh(g, solid);
    mesh.name = 'green_big_' + key;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const [cx, cz] = key.split(',').map(Number);
    bigChunks.push({ mesh, cx, cz });
    group.add(mesh);
    stats.big += list.length;
  }

  // 橋と柵
  const extra = [];
  if (models.footbridge) {
    const b = plan.bridge;
    extra.push(Object.assign(bakeList([toColored(models.footbridge)], [{ kind: 0, x: b.x, z: b.z, rot: b.rot + Math.PI / 2, s: 1.15 }], dummy, stats), {}));
  }
  if (models.pasture_fence) {
    const t = toColored(models.pasture_fence);
    const g = bakeList([t], plan.fences.map((f) => ({ kind: 0, x: f.x, z: f.z, rot: f.rot, s: 1 })), dummy, stats);
    if (g) extra.push(g);
  }
  for (const g of extra) {
    if (!g || !g.attributes) continue;
    const mesh = new THREE.Mesh(g, solid);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = 'green_build';
    group.add(mesh);
  }

  // 小川
  const water = new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.water), roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.88 });
  group.add(makeStream(water));

  scene.add(group);
  const cull = Number.isFinite(o.cullDist) ? o.cullDist : CULL_DIST;
  return {
    group,
    stats,
    plan,
    // 注視点 (tx,tz) と距離 dist（カメラの高さ）で、遠い升を隠す
    setWindEnabled(enabled) {
      grassWind.setEnabled(enabled);
      plantWind.setEnabled(enabled);
    },
    update(tx, tz, dist, timeSec) {
      grassWind.setTime(timeSec);
      plantWind.setTime(timeSec);
      const reach = cull + Math.max(0, (dist || 0) - 60) * 0.6;
      for (const c of chunks) c.mesh.visible = chunkVisible(c.cx, c.cz, tx, tz, reach);
      for (const c of bigChunks) c.mesh.visible = chunkVisible(c.cx, c.cz, tx, tz, reach + 60);
    },
    // いま見えている三角形の数（盆地ぶん）
    visibleTris() {
      let n = 0;
      group.traverse((m) => { if (m.isMesh && m.visible && m.parent.visible) n += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3; });
      return Math.round(n);
    },
    visibleChunks() {
      return chunks.filter((c) => c.mesh.visible).length;
    },
  };
}
