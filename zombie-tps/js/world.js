// マップの みため（はこを まとめて すくない ドローコールに する）
import * as THREE from '../vendor/three.module.min.js';
import { HALF } from './map.js?v=1';

// はこを ざいしつごとに 1つの ジオメトリに まとめる（UV は 1m = テクスチャ 1まい）
function mergeBoxes(list) {
  const pos = [], nor = [], uv = [], col = [], idx = [];
  const tmpC = new THREE.Color();
  for (const b of list) {
    const sx = b.maxX - b.minX, sy = b.maxY - b.minY, sz = b.maxZ - b.minZ;
    const cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2, cz = (b.minZ + b.maxZ) / 2;
    const g = new THREE.BoxGeometry(sx, sy, sz);
    const p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv;
    const base = pos.length / 3;
    tmpC.set(b.tint ?? 0xffffff);
    const uvScale = b.mat === 'crate' ? null : 1;
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i) + cx, p.getY(i) + cy, p.getZ(i) + cz);
      const nx = n.getX(i), ny = n.getY(i), nz = n.getZ(i);
      nor.push(nx, ny, nz);
      let uu = u.getX(i), vv = u.getY(i);
      if (uvScale) {
        if (Math.abs(nx) > 0.5) { uu *= sz; vv *= sy; }
        else if (Math.abs(ny) > 0.5) { uu *= sx; vv *= sz; if (b.rot) { const t = uu; uu = vv; vv = t; } }
        else { uu *= sx; vv *= sy; }
      }
      uv.push(uu, vv);
      // かんたんな AO: したの ほうを すこし くらく
      const yy = p.getY(i) + cy;
      const ao = ny < -0.5 ? 0.55 : (yy < 0.05 && Math.abs(ny) < 0.5 ? 0.78 : 1);
      col.push(tmpC.r * ao, tmpC.g * ao, tmpC.b * ao);
    }
    const ix = g.index.array;
    for (let i = 0; i < ix.length; i++) idx.push(ix[i] + base);
    g.dispose();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeBoundingSphere();
  return geo;
}

export function buildWorld(scene, map, T, { shadows }) {
  const mats = {};
  const lam = (map, extra = {}) => new THREE.MeshLambertMaterial({ map, vertexColors: true, ...extra });
  mats.road = lam(T.road); mats.roadLine = lam(T.roadLine); mats.cobble = lam(T.cobble); mats.brick = lam(T.brick);
  mats.crate = lam(T.crate); mats.concrete = lam(T.concrete); mats.metal = lam(T.metal); mats.glass = lam(T.glass);
  mats.dark = lam(T.dark); mats.log = lam(T.log); mats.leaves = lam(T.leaves); mats.sandbag = lam(T.sandbag);
  mats.barrel = lam(T.barrel); mats.plank = lam(T.plank);
  mats.light = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });

  const byMat = new Map();
  for (const b of map.boxes) {
    if (b.mat === 'none') continue;
    if (!byMat.has(b.mat)) byMat.set(b.mat, []);
    byMat.get(b.mat).push(b);
  }
  const meshes = [];
  for (const [key, list] of byMat) {
    const mesh = new THREE.Mesh(mergeBoxes(list), mats[key] || mats.concrete);
    const flat = key === 'road' || key === 'roadLine' || key === 'cobble' && list.every((b) => b.maxY < 0.2);
    mesh.castShadow = shadows && !flat && key !== 'light';
    mesh.receiveShadow = shadows;
    mesh.matrixAutoUpdate = false; mesh.updateMatrix();
    scene.add(mesh); meshes.push(mesh);
  }

  // じめん（くさ）
  const gsize = HALF * 2 + 40;
  const gg = new THREE.PlaneGeometry(gsize, gsize);
  gg.rotateX(-Math.PI / 2);
  const uvA = gg.attributes.uv; for (let i = 0; i < uvA.count; i++) uvA.setXY(i, uvA.getX(i) * gsize, uvA.getY(i) * gsize);
  const ground = new THREE.Mesh(gg, new THREE.MeshLambertMaterial({ map: T.grass }));
  ground.receiveShadow = shadows; ground.matrixAutoUpdate = false; ground.updateMatrix();
  scene.add(ground); meshes.push(ground);

  // とおくの けしき（ブロックの おか・き）
  const far = [];
  const rr = (() => { let s = 99; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); })();
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2, d = HALF + 10 + rr() * 12;
    const x = Math.cos(a) * d, z = Math.sin(a) * d, h = 2 + rr() * 6, w = 4 + rr() * 6;
    far.push({ mat: 'leaves', minX: x - w / 2, maxX: x + w / 2, minY: 0, maxY: h, minZ: z - w / 2, maxZ: z + w / 2, tint: 0xbfd8b0 });
  }
  const farMesh = new THREE.Mesh(mergeBoxes(far), mats.leaves);
  farMesh.matrixAutoUpdate = false; farMesh.updateMatrix();
  scene.add(farMesh); meshes.push(farMesh);

  return { meshes, mats };
}
