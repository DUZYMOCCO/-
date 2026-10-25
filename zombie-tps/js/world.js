// マップの みため（はこを まとめて すくない ドローコールに する）
import * as THREE from '../vendor/three.module.min.js';

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
    if (b.veh != null) b._vr = [base, p.count]; // v0.9.0: のりもの の ちょうてん（こげる・こわれる）
    tmpC.set(b.tint ?? 0xffffff);
    const uvScale = b.mat === 'crate' ? null : 1;
    for (let i = 0; i < p.count; i++) {
      let py = p.getY(i) + cy;
      if (b.slope) { // ななめ（スロープ・てすり）: うえの めんを かたむける（all なら ぜんぶ ずらす）
        const sl = b.slope, ax = sl.axis === 'x' ? p.getX(i) + cx : p.getZ(i) + cz;
        const a0 = sl.axis === 'x' ? b.minX : b.minZ, a1 = sl.axis === 'x' ? b.maxX : b.maxZ;
        let t = (ax - a0) / (a1 - a0 || 1); if (sl.rise < 0) t = 1 - t;
        const surf = sl.lo + (sl.hi - sl.lo) * t, top = py > cy;
        if (sl.all) py += surf - b.maxY; else if (top) py = surf;
      }
      pos.push(p.getX(i) + cx, py, p.getZ(i) + cz);
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
      const yy = py;
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
  for (const b of list) if (b._vr) b._geo = geo;
  return geo;
}

// v0.9.0: ばくはつ した のりもの を くろこげに（on=false で もとどおり）。ライトは きえる
export function wreckVehicleBoxes(boxes, id, on = true) {
  const touched = new Set();
  for (const b of boxes) {
    if (b.veh !== id || !b._geo || !b._vr) continue;
    const g = b._geo, [s0, n] = b._vr;
    const P = g.attributes.position, C = g.attributes.color;
    if (!b._orig) b._orig = { p: P.array.slice(s0 * 3, (s0 + n) * 3), c: C.array.slice(s0 * 3, (s0 + n) * 3) };
    if (!on) { P.array.set(b._orig.p, s0 * 3); C.array.set(b._orig.c, s0 * 3); }
    else if (b.mat === 'light') { for (let i = 0; i < n; i++) P.array[(s0 + i) * 3 + 1] = -60; }
    else {
      const k = b.mat === 'glass' ? 0.12 : 0.22;
      for (let i = 0; i < n; i++) {
        const j = (s0 + i) * 3, o = b._orig.c;
        C.array[j] = o[i * 3] * k + 0.04; C.array[j + 1] = o[i * 3 + 1] * k + 0.035; C.array[j + 2] = o[i * 3 + 2] * k + 0.03;
      }
    }
    P.needsUpdate = true; C.needsUpdate = true; touched.add(g);
  }
  for (const g of touched) g.computeBoundingSphere();
  return touched.size;
}

const LAM_KEYS = ['road', 'roadLine', 'cobble', 'brick', 'crate', 'concrete', 'metal', 'glass', 'dark', 'log', 'leaves', 'sandbag', 'barrel', 'plank',
  'asphalt', 'paint', 'wall', 'tile', 'container', 'tent', 'hesco', 'dirt', 'water', 'stripe', 'roof'];

// とおくの けしき（マップごと）
function farBoxes(map) {
  const half = map.half, kind = map.theme?.far || 'forest', tint = map.theme?.farTint ?? 0xbfd8b0;
  const rr = (() => { let s = 99; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); })();
  const out = [];
  const push = (mat, x, z, w, d, h, t = tint, y0 = 0) => out.push({ mat, minX: x - w / 2, maxX: x + w / 2, minY: y0, maxY: y0 + h, minZ: z - d / 2, maxZ: z + d / 2, tint: t });
  const n = 44;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, d = half + 10 + rr() * 14;
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (kind === 'harbor' && z < -half) { // うみの ふね
      if (i % 3) continue;
      const L = 10 + rr() * 10; push('metal', x, z - 10, L, 4, 2.2, [0x8a3a2a, 0x3a5a8a, 0x5a6a5a][i % 3]); push('container', x - 1, z - 10, L * 0.5, 3, 2.0, 0xa0a0a0, 2.2);
      continue;
    }
    if (kind === 'rooftop' || kind === 'office') { // くらい ビルの まち（まどの あかりは すこし）
      const w = 6 + rr() * 7, h = 8 + rr() * (kind === 'office' ? 22 : 14);
      push('concrete', x, z, w, w, h, [0x6a6a78, 0x5a5e6a, 0x7a7470][i % 3]);
      if (i % 3 === 0) push('light', x, z, w * 0.3, w + 0.1, 0.8, 0xffffff, h * (0.3 + rr() * 0.5));
      continue;
    }
    if (kind === 'city' || kind === 'hospital' || kind === 'harbor') { const w = 5 + rr() * 6; push(kind === 'hospital' ? 'wall' : 'concrete', x, z, w, w, 5 + rr() * (kind === 'city' ? 16 : 9)); }
    else if (kind === 'mall') { const w = 8 + rr() * 8; push('concrete', x, z, w, w, 3 + rr() * 6); }
    else if (kind === 'base') { const w = 6 + rr() * 8; push(rr() < 0.4 ? 'hesco' : 'leaves', x, z, w, w, 2 + rr() * 5); }
    else { const w = 4 + rr() * 5; push('leaves', x, z, w, w, 4 + rr() * 8); }
  }
  return out;
}

export function buildWorld(scene, map, T, { shadows }) {
  const mats = {};
  const lam = (tx, extra = {}) => new THREE.MeshLambertMaterial({ map: tx, vertexColors: true, ...extra });
  const mat = (key) => {
    if (mats[key]) return mats[key];
    if (key === 'light') mats.light = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
    else if (key === 'ember') mats.ember = new THREE.MeshBasicMaterial({ color: 0xff8a2a });
    else mats[key] = lam(T[LAM_KEYS.includes(key) ? key : 'concrete']);
    return mats[key];
  };

  // v0.6.0: たてものの なかは かい（lvl）ごとに わける → みえない かいは けす
  const byMat = new Map();
  for (const b of map.boxes) {
    if (b.mat === 'none') continue;
    const k = b.lvl != null ? `${b.mat}|${b.lvl}` : b.mat;
    if (!byMat.has(k)) byMat.set(k, []);
    byMat.get(k).push(b);
  }
  const meshes = [], levels = new Map();
  for (const [k, list] of byMat) {
    const key = k.split('|')[0];
    const mesh = new THREE.Mesh(mergeBoxes(list), mat(key));
    if (list[0].lvl != null) { const L = list[0].lvl; if (!levels.has(L)) levels.set(L, []); levels.get(L).push(mesh); }
    const flat = list.every((b) => b.maxY < 0.2);
    mesh.castShadow = shadows && !flat && key !== 'light' && key !== 'ember';
    mesh.receiveShadow = shadows;
    mesh.matrixAutoUpdate = false; mesh.updateMatrix();
    scene.add(mesh); meshes.push(mesh);
  }

  // じめん（マップごと）
  const half = map.half;
  const gsize = half * 2 + 60;
  const gg = new THREE.PlaneGeometry(gsize, gsize);
  gg.rotateX(-Math.PI / 2);
  const uvA = gg.attributes.uv; for (let i = 0; i < uvA.count; i++) uvA.setXY(i, uvA.getX(i) * gsize, uvA.getY(i) * gsize);
  const groundMat = new THREE.MeshLambertMaterial({ map: T[map.theme?.ground || 'grass'] || T.grass });
  mats.__ground = groundMat;
  const ground = new THREE.Mesh(gg, groundMat);
  ground.receiveShadow = shadows; ground.matrixAutoUpdate = false; ground.updateMatrix();
  scene.add(ground); meshes.push(ground);
  // みなと: きたの そとは うみ
  if (map.theme?.water === 'north') {
    const wg = new THREE.PlaneGeometry(gsize, 40); wg.rotateX(-Math.PI / 2);
    const wu = wg.attributes.uv; for (let i = 0; i < wu.count; i++) wu.setXY(i, wu.getX(i) * gsize / 2, wu.getY(i) * 20);
    const water = new THREE.Mesh(wg, mats.__water = new THREE.MeshLambertMaterial({ map: T.water }));
    water.position.set(0, 0.02, -half - 1 - 20); water.updateMatrix(); water.matrixAutoUpdate = false;
    scene.add(water); meshes.push(water);
  }

  // とおくの けしき
  const farList = farBoxes(map);
  const farKeys = [...new Set(farList.map((b) => b.mat))];
  for (const key of farKeys) {
    const farMesh = new THREE.Mesh(mergeBoxes(farList.filter((b) => b.mat === key)), mat(key));
    farMesh.matrixAutoUpdate = false; farMesh.updateMatrix();
    scene.add(farMesh); meshes.push(farMesh);
  }

  return { meshes, mats, levels };
}

// マップを かえるとき: ジオメトリと ざいしつを すてる（テクスチャは のこす）
export function disposeWorld(scene, world) {
  for (const m of world.meshes) { scene.remove(m); m.geometry.dispose(); }
  for (const k in world.mats) world.mats[k].dispose();
}
