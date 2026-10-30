// 翠緑の盆地の見た目: 草と花（升目ごとに1メッシュ、遠い升は描かない）、木・茂み・苔岩・葦、小川、橋、牧場の柵。
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { heightAt } from '../sim/index.js';
import { planGreen, groupByChunk, chunkVisible, streamLine, STREAM_W, GREEN_GRASS, GREEN_BIG, PALETTE, CULL_DIST } from './green_plan.js';

// baked（材質ごとの parts）を、材質の色を頂点色に焼いた1つのジオメトリにする。
function toColored(baked) {
  const geos = [];
  for (const p of baked.parts) {
    const g = p.geometry.clone();
    for (const n of Object.keys(g.attributes)) if (n !== 'position' && n !== 'normal') g.deleteAttribute(n);
    const c = p.material && p.material.color ? p.material.color : new THREE.Color(1, 1, 1);
    const e = p.material && p.material.emissive ? p.material.emissive : null;
    const cnt = g.attributes.position.count;
    const col = new Float32Array(cnt * 3);
    for (let i = 0; i < cnt; i += 1) {
      col[i * 3] = c.r + (e ? e.r * 0.3 : 0);
      col[i * 3 + 1] = c.g + (e ? e.g * 0.3 : 0);
      col[i * 3 + 2] = c.b + (e ? e.b * 0.3 : 0);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geos.push(g.index ? g.toNonIndexed() : g);
  }
  return geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
}

function bakeList(templates, list, dummy, sink) {
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
    g.applyMatrix4(dummy.matrix);
    geos.push(g);
  }
  if (!geos.length) return null;
  const m = mergeGeometries(geos, false);
  for (const g of geos) g.dispose();
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
  const dummy = new THREE.Object3D();
  const stats = { tris: 0, chunks: 0, big: 0 };

  const grassT = GREEN_GRASS.map((n) => (models[n] ? toColored(models[n]) : null));
  const bigT = GREEN_BIG.map((n) => (models[n] ? toColored(models[n]) : null));

  // 草と花: 升目ごと
  const chunks = [];
  for (const [key, list] of groupByChunk(plan.grass)) {
    const g = bakeList(grassT, list, dummy, stats);
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

  // 木・茂み・岩・葦（升目ごと。影は木だけ落とす）
  const bigChunks = [];
  for (const [key, list] of groupByChunk(plan.big)) {
    const g = bakeList(bigT, list, dummy, stats);
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
    update(tx, tz, dist) {
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
